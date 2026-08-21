// run_batch — Engine v3 每批任务的执行引擎
// 每张任务卡独立流水线：调研员(research) → 审计员(audit)，不设屏障。
// 主对话（总控）读 args.tasks，派发本 workflow，回收返回结果后更新 state.json。
// 脚本不能写文件系统——调研员/审计员 agent 自己落盘 findings/_sources/audit，这里只编排。

export const meta = {
  name: 'run_batch',
  description: 'Run one batch of research tasks through researcher -> auditor pipeline',
  phases: [
    { title: 'Research', detail: 'researchers fetch sources, snapshot evidence, write findings' },
    { title: 'Audit', detail: 'independent auditors judge death-conditions, verifiability, workload bar' },
  ],
}

const RES_SCHEMA = {
  type: 'object',
  properties: {
    taskId: { type: 'string' },
    findingsPath: { type: 'string' },
    sources: { type: 'array', items: { type: 'string' } },
    selfCheck: {
      type: 'object',
      properties: { pass: { type: 'boolean' }, notes: { type: 'string' } },
      required: ['pass'],
    },
    summary: { type: 'string' },
  },
  required: ['taskId', 'findingsPath', 'sources', 'selfCheck'],
}

const AUD_SCHEMA = {
  type: 'object',
  properties: {
    taskId: { type: 'string' },
    verdict: { type: 'string', enum: ['accepted', 'rejected'] },
    reasons: { type: 'array', items: { type: 'string' } },
    auditPath: { type: 'string' },
    urlSample: { type: 'number' },
    snapshotMatch: { type: 'number' },
  },
  required: ['taskId', 'verdict', 'reasons', 'auditPath'],
}

function researcherPrompt(t) {
  return `你是深度调研引擎的**调研员**。执行给定任务卡，产出带证据等级的调研发现。你真正上网检索、抓取原文、保存快照、如实标注证据等级。

## 任务定义
- 任务 ID：${t.id}
- 主题：${t.topic}
- 父会话问题（逐条必须回答）：${t.questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}
- 候选空间与线索：${(t.candidates || []).join('\n')}
- 搜索关键词（中英）：${(t.keywords || []).join('；')}
- 范围边界（禁止越界）：${(t.bounds || []).join('\n')}

## 调研步骤
1. **关键词检索**：先 WebSearch 中文关键词，再英文关键词；对每个候选方向专项搜索。记下标题+URL。
2. **抓取原文**：高价值来源用 WebFetch 抓正文；PDF/论文抓摘要或 HTML 版；抓不到标"未核"，绝不捏造来源。
3. **保存快照**：抓到的原文写入快照目录 ${t.sourcesDir}，文件名用来源名（如 w3c_shacl.html）。用 Write 工具，UTF-8。
4. **核对证据等级**：A=原文到手（你抓取核对过原文）/ B=二手转引 / C=推断。

## 产出契约（写入 ${t.findingsPath}，UTF-8，必须含 8 节）
# 叶子 ${t.topic} 调研发现
> 任务 ${t.id} / A=原文到手 B=二手转引 C=推断
## 0. 一句话结论
## 1. 父会话问题逐条回答（每问：结论+依据+等级）
## 2. 关键发现（每条：论断+URL+标题+机构+日期+原文摘录+等级）
## 3. 对决策点的输入
## 4. 与范围/红线的冲突张力（无则明说无）
## 5. 未决与风险
## 6. 建议的下一步
## 7. 来源清单（全部 URL，标 A/B/C）
## 8. 判死自查结果

## 工作量红线（不达标=判死）
来源≥15（A级≥10）、类型≥3、候选查证≥5、关键词组≥4（中英各半）。

## 禁止项
不越界 ${t.bounds};不捏造来源;抓不到写"未核";推断标C;不把二手当原文。

完成全部落盘后，用 StructuredOutput 返回 JSON：{"taskId":"${t.id}","findingsPath":"${t.findingsPath}","sources":[已保存快照的绝对路径],"selfCheck":{"pass":true/false,"notes":"自评"},"summary":"一句话结论"}`;
}

function auditorPrompt(t, r) {
  return `你是深度调研引擎的**独立审计员**。调研员提交了一份发现文件，你**不偏袒地挑错**，按三道检验给 PASS/FAIL。

## 被审计对象
- 任务 ID：${t.id}，主题：${t.topic}
- 发现文件：${r.findingsPath}
- 快照目录：${t.sourcesDir}
- 调研员自评：${r.selfCheck && r.selfCheck.notes}

## 审计步骤
### 一、判死四条件（任一触发=REJECTED）
1. 关键论断无来源；2. 二手当原文（该标B却标A）；3. 越界或漏答；4. 推断未标注写成结论。
### 二、来源可核性（抽检）
- URL 抽检 ≥20%（WebFetch 打开几个验证非 404）。
- 快照逐字比对 ≥10%：打开 ${t.sourcesDir} 对应快照，确认原文**包含**引用句子。无快照目录→整体降级 FAIL 并要求补快照。
### 三、工作量红线（不达标=REJECTED）
来源≥15（A≥10）、类型≥3、候选≥5、关键词组≥4。

## 产出契约（写入 ${t.auditPath}，UTF-8）
# 审计 ${t.id}
## 判定：PASS/FAIL
## 一、判死四条件逐条核对
## 二、来源抽检记录（抽了哪些URL、是否可达；快照比对几条、是否逐字命中）
## 三、工作量红线核对
## 四、整改意见（FAIL时列具体要补什么）

用 StructuredOutput 返回 JSON：{"taskId":"${t.id}","verdict":"accepted"/"rejected","reasons":[逐条理由],"auditPath":"${t.auditPath}","urlSample":抽检URL数,"snapshotMatch":快照命中数}`;
}

phase('Research')
const results = await pipeline(
  args.tasks,
  (t) => agent(researcherPrompt(t), { label: `research:${t.id}`, phase: 'Research', schema: RES_SCHEMA }),
  (r, t) => {
    if (!r || !r.taskId) return null
    return agent(auditorPrompt(t, r), { label: `audit:${t.id}`, phase: 'Audit', schema: AUD_SCHEMA })
      .then((a) => ({
        taskId: t.id,
        findingsPath: r.findingsPath,
        sources: r.sources || [],
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
