// run_llm — Engine v3 · LLM/agent-harness 时代调研专用工作流
// 与 run_batch 的差别：调研员抓取不走 WebSearch/WebFetch（本环境返回 invalid model），
// 改为 curl + arXiv API + GitHub raw + 权威站点；强制时间锚定（只看 2024–2026，最新优先）；
// 审计员额外加"时代锚定检查"——抓到前 LLM 时代老货(SQL/RDF/Datalog/本体旧文)判 FAIL 回炉。
// 每个方向独立 调研员→审计员 流水线，pipeline 不设屏障。

export const meta = {
  name: 'run_llm',
  description: 'LLM/agent-harness 时代调研：curl 抓取 + 时间锚定 + 时代审计',
  phases: [
    { title: 'Research', detail: 'researchers curl-search arXiv/权威源(2024+), snapshot, write findings' },
    { title: 'Audit', detail: 'auditors judge death-conditions + 时代锚定 + workload bar' },
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
    eraOk: { type: 'boolean' },
    urlSample: { type: 'number' },
    snapshotMatch: { type: 'number' },
  },
  required: ['taskId', 'verdict', 'reasons', 'auditPath'],
}

const arXiv = (q, n = 15) =>
  `https://export.arxiv.org/api/query?search_query=${encodeURIComponent(q)}&start=0&max_results=${n}&sortBy=submittedDate&sortOrder=descending`

const CURL_PROBE = `用 Bash 里的 curl（不要用 WebSearch/WebFetch，它们在本环境报 invalid model）：
- 检索：curl "${arXiv('__Q__')}__"
  → 从返回的 Atom XML 提取 <title> <name>(作者) <published>(日期) <summary>(摘要)。
- 抓摘要：同上 API 的 <summary> 字段即摘要正文（已验证可用）。
- 抓全文/权威页：curl "https://arxiv.org/abs/<id>" 或 GitHub raw / 官方文档 HTML。
- 关键：curl -sL --max-time 25 "<URL>"，把返回文本存进快照目录（Write 工具，UTF-8）。
- 每次结果保存快照，文件名用来源名（如 arxiv_2506.05690.xml / github_readme.html）。
- 抓不到原文 → 标「未核」，绝不捏造 URL 或内容。`

function researcherPrompt(t) {
  const kw = (t.keywords || []).join(' OR ')
  const arxivQuery = kw ? `cat:(cs.* OR stat.*) AND (${kw.replace(/"/g, '')})` : t.topic
  return `你是深度调研引擎的**调研员**（LLM 时代专用）。执行任务卡，产出带证据等级的发现。你真正用 curl 检索原文、抓快照、标等级。

## 任务定义
- 任务 ID：${t.id}
- 主题：${t.topic}
- 父会话问题（逐条必须回答）：${(t.questions || []).map((q, i) => `${i + 1}. ${q}`).join('\n')}
- 候选空间与线索：${(t.candidates || []).join('\n')}
- 搜索关键词（限定 2024–2026）：${(t.keywords || []).join('；')}
- 范围边界（禁止越界）：${(t.bounds || []).join('\n')}

## 检索命令（直接用，替换 __Q__）
${CURL_PROBE.replace('__Q__', arxivQuery)}

## 时间锚定（硬约束）
只收 **2024-01 之后**的论文/资料。用 API 的 <published> 字段判断。2023 及更早的一律不收为关键发现（可作背景一句带过，不标 A）。检索排序已按 submittedDate 倒序，最新优先。

## 调研步骤
1. **curl arXiv API 检索**（命令上方），从 <title><name><published><summary> 提取候选。
2. **对每个高价值候选，用 <summary> 当摘要**，判断相关性后再 curl 抓 arxiv 全文/官方页。
3. **保存快照**到 ${t.sourcesDir}（Write，UTF-8），文件名用来源名。
4. **核对证据等级**：A=原文到手(你 curl 抓了并核对) / B=二手转引 / C=推断。

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
## 7. 来源清单（全部 URL，标 A/B/C + 年代）
## 8. 判死自查结果

## 工作量红线（不达标=判死）
来源≥15（A 级或 arXiv 摘要到手 ≥10）、年代≥2024 为主、候选查证≥5、关键词组≥4。

## 禁止项
- 不收 2023 前的当作关键发现（时间锚定）
- 不用 WebSearch/WebFetch（坏掉）；只用 curl
- 不越界 ${t.bounds};不捏造来源;抓不到写"未核";推断标C;不把二手当原文

完成后用 StructuredOutput 返回：{"taskId":"${t.id}","findingsPath":"${t.findingsPath}","sources":[快照绝对路径],"selfCheck":{"pass":true/false,"notes":"自评"},"summary":"一句话结论"}`;
}

function auditorPrompt(t, r) {
  return `你是深度调研引擎的**独立审计员**（LLM 时代专用）。调研员提交发现文件，你**不偏袒挑错**，按四道检验给 PASS/FAIL。

## 被审计对象
- 任务 ID：${t.id}，主题：${t.topic}
- 发现文件：${r.findingsPath}
- 快照目录：${t.sourcesDir}
- 调研员自评：${r.selfCheck && r.selfCheck.notes}

## 审计步骤
### 一、判死四条件（任一触发=REJECTED）
1. 关键论断无来源；2. 二手当原文(该标B却标A)；3. 越界或漏答；4. 推断未标注写成结论。
### 二、时代锚定检查（本线特有，不符=REJECTED）
用 Bash curl 抽查 ≥5 条来源的 <published> 日期，确认是 2024-01 之后。若关键发现大量是 2023 前老货(SQL/RDF/Datalog/本体旧文/mathlib/FSRS/BKT)，判"时代不符"并 REJECTED，理由写元代不符+缺少 LLM/agent 时代证据。
### 三、来源可核性（抽检）
- URL 抽检 ≥20%：curl -sIL 验证非 404。
- 快照逐字比对 ≥10%：打开 ${t.sourcesDir} 对应快照，确认原文**包含**引用句子。无快照→降级 FAIL。
### 四、工作量红线
来源≥15（A≥10）、年代≥2024 为主、候选≥5、关键词≥4。

## 产出契约（写入 ${t.auditPath}，UTF-8）
# 审计 ${t.id}
## 判定：PASS/FAIL
## 一、判死四条件逐条核对
## 二、时代锚定检查（抽查哪些URL、published 日期、是否 2024+）
## 三、来源抽检（URL 可达、快照逐字命中多少条）
## 四、工作量红线核对
## 五、整改意见（FAIL 时列要补什么）

StructuredOutput 返回：{"taskId":"${t.id}","verdict":"accepted"/"rejected","reasons":[逐条],"auditPath":"${t.auditPath}","eraOk":true/false,"urlSample":N,"snapshotMatch":N}`;
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