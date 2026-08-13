// run_proto — Engine v3 原型实测批次执行引擎
// 与 run_batch 同构，但调研员是"原型验证员"：读真实数据 → 写脚本 → 跑 → 记录实测 → 写发现。
// 主对话读 args.tasks 派发，回收后更新 state.json。agent 自己落盘 findings/audit/原型脚本。

export const meta = {
  name: 'run_proto',
  description: 'Run one batch of prototype-verification tasks through prototyper -> auditor pipeline',
  phases: [
    { title: 'Prototype', detail: 'prototypers write+run scripts on real data, record measurements' },
    { title: 'Audit', detail: 'auditors verify reproducibility, no fabrication, workload bar' },
  ],
}

const RES_SCHEMA = {
  type: 'object',
  properties: {
    taskId: { type: 'string' },
    findingsPath: { type: 'string' },
    scripts: { type: 'array', items: { type: 'string' } },
    selfCheck: {
      type: 'object',
      properties: { pass: { type: 'boolean' }, notes: { type: 'string' } },
      required: ['pass'],
    },
    summary: { type: 'string' },
  },
  required: ['taskId', 'findingsPath', 'scripts', 'selfCheck'],
}

const AUD_SCHEMA = {
  type: 'object',
  properties: {
    taskId: { type: 'string' },
    verdict: { type: 'string', enum: ['accepted', 'rejected'] },
    reasons: { type: 'array', items: { type: 'string' } },
    auditPath: { type: 'string' },
    reproRan: { type: 'boolean' },
  },
  required: ['taskId', 'verdict', 'reasons', 'auditPath', 'reproRan'],
}

function prototyperPrompt(t) {
  return `你是深度调研引擎的**原型验证员**。执行任务卡，在真实数据上写脚本、运行、记录实测结果，产出带实测证据的发现。你不做纯文档调研——你要真正跑代码并如实记录输出。

## 任务定义
- 任务 ID：${t.id}，主题：${t.topic}
- 问题（逐条必须用实测回答）：${t.questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}
- 候选/工具：${(t.candidates || []).join('；')}
- 环境：${t.env}
- 数据：${t.data}
- 范围边界：${(t.bounds || []).join('\n')}

## 步骤
1. **读数据**：先读数据路径的 2-3 个文件样本（${t.data}），理解字段结构（id/type/anchors/quote/relations 等），再从简建模。
2. **写原型脚本**：写可复现的脚本（python 用 ${t.env} 里的解释器；node 用 node），把脚本存到 ${t.sourcesDir}/（含 README 或注释说明用法）。
3. **运行并记录**：跑脚本，把**真实 stdout 输出**保存到 ${t.sourcesDir}/run_output.txt。记录耗时（用 python time / node console.time）、通过率、违规数等实测数字。
4. **写发现报告**到 ${t.findingsPath}（UTF-8，必须含 8 节）：
# 原型 ${t.id} 实测发现
## 0. 一句话结论
## 1. 问题逐条回答（每问：实测结论 + 具体数字 + 证据）
## 2. 实测方法与脚本说明（脚本路径、怎么跑）
## 3. 实测数据（通过率/耗时/内存/违规数，全部来自真实 stdout）
## 4. 与规范声明的对照（规范说 X，实测 Y）
## 5. 未决与风险
## 6. 建议的下一步
## 7. 复现命令（一行可复制：解释器 + 脚本 + 参数）
## 8. 判死自查

## 红线（违反即判死）
- **不伪造实测数字**：一切数字必须来自你实际跑出的 stdout；跑不出来就写"未跑通"，绝不用估计值顶替。
- 环境装依赖失败 → 如实记录并写清需要的安装步骤；换可用工具。
- 结论须回答任务问题，不越界 ${t.bounds}。

完成落盘后，用 StructuredOutput 返回 JSON：{"taskId":"${t.id}","findingsPath":"${t.findingsPath}","scripts":[已存脚本的绝对路径],"selfCheck":{"pass":true/false,"notes":"自评"},"summary":"一句话结论"}`
}

function auditorPrompt(t, r) {
  return `你是深度调研引擎的**独立审计员**，审计一份原型实测发现。你的核心职责是**核验实测真实性与可复现性**。

## 被审计对象
- 任务 ID：${t.id}，主题：${t.topic}
- 发现文件：${r.findingsPath}
- 原型脚本目录：${t.sourcesDir}
- 原型员自评：${r.selfCheck && r.selfCheck.notes}

## 审计步骤
### 一、判死四条件（任一触发=REJECTED）
1. 关键结论无实测依据（纯推断当结论）；2. 实测数字非来自真实运行（伪造/估数顶替）；3. 越界或漏答；4. 未标注实测/推断。
### 二、可复现性核验
- 脚本存在：确认 ${t.sourcesDir} 下有脚本 + run_output.txt。
- 复跑：**亲自跑一遍复现命令**（用 ${t.env} 里的解释器），确认输出与报告中关键数字一致。复跑成功且关键数字吻合 → 通过；复跑失败/对不上 → REJECTED 并附差异。
- run_output.txt 与报告数字核对：报告中每个关键数字必须在 run_output.txt 里找得到对应。
### 三、工作量
- 问题逐条有实测回答；复现命令完整可复制；未决/风险如实。

## 产出（写入 ${t.auditPath}，UTF-8）
# 审计 ${t.id}
## 判定：PASS/FAIL
## 一、判死四条件
## 二、可复现性核验（脚本路径、复跑命令、复跑输出与报告差异）
## 三、工作量
## 四、整改意见

用 StructuredOutput 返回 JSON：{"taskId":"${t.id}","verdict":"accepted"/"rejected","reasons":[逐条],"auditPath":"${t.auditPath}","reproRan":true/false}`
}

phase('Prototype')
const results = await pipeline(
  args.tasks,
  (t) => agent(prototyperPrompt(t), { label: `proto:${t.id}`, phase: 'Prototype', schema: RES_SCHEMA }),
  (r, t) => {
    if (!r || !r.taskId) return null
    return agent(auditorPrompt(t, r), { label: `audit:${t.id}`, phase: 'Audit', schema: AUD_SCHEMA })
      .then((a) => ({
        taskId: t.id,
        findingsPath: r.findingsPath,
        scripts: r.scripts || [],
        selfCheck: r.selfCheck,
        summary: r.summary,
        audit: a || null,
      }))
  }
)

return {
  round: args.round,
  asOf: args.asOf,
  results: results.filter(Boolean),
}
