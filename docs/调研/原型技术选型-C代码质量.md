# C · 人不读代码、agent 写全部代码时怎么保证质量（调研）

> 状态：外部调研 · 2026-10-07 · 不作产品结论
> 来源标注：**一手** = 作者本人 / 官方原文，本次读了正文；**二手（引文）** = 第三方对原文的逐句摘录，本次没读到原文；**二手（摘要）** = 只有搜索摘要或评论文章；**未核实** = 找不到可靠出处。

## 0. 调研边界（先读）

| 项 | 情况 |
| --- | --- |
| 网络 | 本环境出口受限：openai.com、cognition.ai、factory.ai、ampcode.com、simonwillison.net、arxiv.org、x.com 等**全部打不开**；能读的只有 anthropic.com、code.claude.com、GitHub 源码、npm / PyPI |
| 后果 | Anthropic 文章、Zechner 与 Ronacher 博客（从其 GitHub 博客源码读）、pi 仓库是**一手**；OpenAI harness engineering 只能读第三方逐句摘录（businessdatasolutions/ai-wiki，自称读过全文 PDF）；Cognition / Factory / Amp / 论文只有搜索摘要 |
| X（Twitter） | 没读到任何推文正文 |
| 模型版本 | 文章里的结论绑定当时模型（OpenAI：GPT-5.x Codex；Anthropic：Opus 4.5–4.6；Ronacher 2025-06：Sonnet 4）。行为类结论换到 Opus / Sonnet 5.5 前都只作待定 |
| 总的空白 | **没有任何来源证明“人完全不读代码”能长期（以年计）保持架构不烂**。OpenAI 自己把“架构一致性多年后怎么演变”列为未知；Zechner 认为做不到 |

---

## 1. 总纲：质量来自“环境”，不来自看代码

| 做法 | 证据 | 适用边界 | 失败模式 |
| --- | --- | --- | --- |
| 人的工作从写代码改为设计环境：约束、反馈回路、文档；“Humans steer. Agents execute.” | OpenAI，Ryan Lopopolo，2026-02-11，[Harness engineering](https://openai.com/index/harness-engineering/)。5 个月、约 100 万行、约 1500 个 PR、3→7 名工程师、0 行手写代码。**二手（引文）**：[ai-wiki 摘录](https://github.com/businessdatasolutions/ai-wiki/blob/main/wiki/sources/2026-02-11-lopopolo-codex-harness-engineering.md) | 原文自己说：“依赖这个仓库的特定结构和工具，没有类似投入不应假设能推广”。他们是 OpenAI 工程师，团队里有人能读代码 | 原文列为未知：架构一致性多年后如何演变；人的判断放哪里杠杆最大 |
| 反方：慢下来；按自己能审的量限制每天生成的代码；**架构、API 这类决定系统“形状”的东西手写** | Mario Zechner，2026-03-25，[Thoughts on slowing the fuck down](https://mariozechner.at/posts/2026-03-25-thoughts-on-slowing-the-fuck-down/)。**一手**（读自其博客源码仓库） | 他针对的是生产代码、有真实用户的产品 | 他描述的失败链：小错误无瓶颈地累积 → 架构变成错误的堆积 → agent 自己写的单元 / 快照 / 端到端测试也不可信 → 只剩手工测试可信 |

Zechner 原文要点（一手，节译）：
- agent 不会从错误中学习，同一类错误反复犯；写进 AGENTS.md 只对“你观察到了的那类错误”有效。
- agent 的决定“永远是局部的”：看不到彼此的运行、看不到全部代码和历史决定 → 重复代码、为抽象而抽象。
- “agentic search 召回率低”：代码库越大，agent 越找不全该改的、可复用的代码——这也是重复代码的来源。
- 好的 agent 任务：范围能圈住、回路能闭合（agent 能自己评估）、不是关键任务。
- “审查 agent 抓不到架构问题”**这句不在这篇博客里**；出自他 2026-04-10 AI Engineer Europe 演讲《Building pi in a World of Slop》的第三方转述（[tldrecap](https://tldrecap.tech/posts/2026/aie-europe/pi-agent-minimalism/) 等）：“审查 agent 能抓到一些问题，抓不到架构问题——局部看合理、全局造成损害的决定”。**二手（摘要），原话未核实**。

对 Studium 的含义：产品负责人不读代码，等于去掉了 Zechner 说的唯一“瓶颈”。下面每一节都是在用机械检查代替这个瓶颈；**架构这一项目前没有可靠的机械替代**，只能靠“小代码量 + 边界测试 + 定期异模型架构审查”降低风险（见 §12）。

---

## 2. 文档即地图（AGENTS.md / CLAUDE.md 与仓库结构）

| 做法 | 证据 | 适用边界 | 失败模式 |
| --- | --- | --- | --- |
| AGENTS.md 只写约 100 行“目录”，指向 `docs/`（设计文档、执行计划、产品规格、参考资料、QUALITY_SCORE.md）；仓库是唯一事实来源：“agent 在上下文里拿不到的东西就等于不存在” | OpenAI 2026-02-11，**二手（引文）** | 文档要有新鲜度检查和负责人，否则会烂 | 他们先试过一个大 AGENTS.md，失败在四点：挤占上下文；全都重要等于都不重要；很快过时；没法机械校验 |
| CLAUDE.md 只写 agent 猜不到的：命令、与默认不同的风格、测试方法、项目特有的架构决定、坑。逐行问“删掉会出错吗” | Anthropic，[Best practices for Claude Code](https://code.claude.com/docs/en/best-practices)（文档页，持续更新；读于 2026-10-07），**一手** | — | “过长的 CLAUDE.md”：规则被淹没，agent 忽略一半。对策：删减，或把规则改成 hook |
| “文档不够时把规则升级成代码”：审查意见、重构 PR、用户报的 bug 都沉淀为文档更新或工具规则 | OpenAI，**二手（引文）** | — | 规则只写在文档里会被忽视 |
| 开发者实例：pi 仓库 AGENTS.md 写明“改完代码跑 `npm run check`，修完所有 error/warning/info 再提交”“不准 `git add -A`、`--no-verify`”“改测试必须跑通” | [pi-mono AGENTS.md](https://github.com/badlogic/pi-mono/blob/main/AGENTS.md)（2026-10 版），**一手** | 有人读代码的项目 | — |

---

## 3. 强类型 + 严格 lint + 格式化 + 架构约束写成代码

| 做法 | 证据 | 适用边界 | 失败模式 |
| --- | --- | --- | --- |
| 每个业务域固定分层（Types → Config → Repo → Service → Runtime → UI），只能单向依赖；横切关注点（鉴权、遥测、开关）只走一个 Providers 接口；由 agent 生成的自定义 linter 和结构测试强制 | OpenAI，**二手（引文）**：“这类架构通常等到几百名工程师才做；有了 coding agent，它是前提：约束让速度不带来腐化” | 层次要先由人（或设计文档）定；规则太细会卡死 | — |
| 自定义 lint 的报错信息里直接写“怎么改”，报错本身就是给 agent 的提示 | OpenAI，**二手（引文）**；Factory，Alvin Sng，2025-09-05，[Using linters to direct agents](https://www.factory.ai/using-linters-to-direct-agents)：“agent 写代码，linter 立法”，**二手（摘要）** | — | 报错只说“违规”不说怎么改，agent 会绕过或乱改 |
| “黄金原则”：用共享工具包而不是手写小助手；不要“YOLO 式”探测数据，在边界校验或用类型化 SDK | OpenAI，**二手（引文）** | — | — |
| 简单代码：函数优于类、避免继承和炫技、直接写 SQL、**权限检查放在 agent 看得见的本地位置** | Armin Ronacher，2025-06-12，[Agentic Coding Recommendations](https://lucumr.pocoo.org/2025/6/12/agentic-coding/)，**一手**（读自博客源码） | 2025 年、Sonnet 4 时代，单人经验 | 权限检查藏在别的文件 / 配置里 → agent 加新路由时几乎必然忘记 |
| 语言选择：Ronacher 2025 年认为 Python 对 agent 难（pytest fixture 注入的“魔法”、async 事件循环错误、解释器启动慢拖慢回路），推荐后端 Go，前端 React + Vite | 同上，**一手**，**旧（2025-06）** | 个人经验，非测量 | — |
| 现成工具（已在 npm / PyPI 核实存在与版本，2026-10）：TS——`tsc --strict`、dependency-cruiser 18.5、eslint-plugin-boundaries 7.2；Python——pyright / mypy strict、ruff 0.16、import-linter 2.15 | 包注册表，**一手** | 依赖语言 | — |

---

## 4. 让 agent 自己验证：测试、Stop 门禁、证据

| 做法 | 证据 | 适用边界 | 失败模式 |
| --- | --- | --- | --- |
| 给 agent 一个能跑的通过 / 失败信号（测试、构建退出码、lint、和固定样例比对的脚本、截图）；没有它，人就成了验证回路 | Anthropic Best practices，**一手** | — | “先信后验”缺口：看起来对但没处理边界。对策：“验证不了就别发” |
| 四档门禁强度：写在提示里 → `/goal` 条件 → **Stop hook 脚本不通过就不让本轮结束** → 独立验证子代理尝试反驳 | 同上，**一手** | 无人值守要用后两档 | — |
| 让 agent 出示证据（测试输出、跑的命令及结果、截图），而不是宣称成功；看证据比自己重跑快 | 同上，**一手** | — | — |
| 测试先行：先写会失败的复现测试再修；或一个会话写测试、另一个写代码让它通过 | 同上，**一手**；Kent Beck，2025，[Augmented Coding: Beyond the Vibes](https://tidyfirst.substack.com/p/augmented-coding-beyond-the-vibes)，**二手（摘要）**：把 agent 比作“精灵”，“让测试通过”这个愿望也可以靠删测试实现，他会盯着禁用 / 删测试的迹象 | — | 见 §10 测试被改弱 |
| 功能清单用 JSON，全部初始为失败；agent 只许改 `passes` 字段；“删除或修改测试不可接受” | Anthropic，Justin Young，2025-11-26，[Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)，**一手**。选 JSON 是因为模型比较不会乱改 JSON | 长任务、跨会话 | 失败模式：过早宣布完成；没测就标“通过”。对策：清单 + 每次会话开头先跑基础端到端测试 |
| 测试质量就是上限：“验证器必须近乎完美，否则 Claude 会解决错的问题”；每观察到一种失败就加一个测试 | Anthropic，Nicholas Carlini，2026-02-05，[Building a C compiler with a team of parallel Claudes](https://www.anthropic.com/engineering/building-c-compiler)，**一手** | 有现成权威测试集 / 参照实现（GCC）的任务 | 后期新功能不断破坏旧功能 → 加 CI 和更严格检查；作者警告“测试通过会制造虚假信心” |
| 测试输出给 agent 看的要短：几行摘要，细节写日志文件，“ERROR + 原因”同一行方便 grep；`--fast` 只跑 1%/10% 随机子集 | 同上，**一手** | — | agent 没有时间感，会花几小时跑测试 |

---

## 5. Hooks：每次改动后自动跑检查

| 做法 | 证据 | 适用边界 | 失败模式 |
| --- | --- | --- | --- |
| CLAUDE.md 是建议，hook 是确定执行。`PostToolUse`（匹配 `Edit\|Write`）改完就格式化 / lint；`PreToolUse` 退出码 2 阻止动作，stderr 作为反馈回给 Claude；`Stop` 可阻止结束 | Anthropic，[Hooks guide](https://code.claude.com/docs/en/hooks-guide)，**一手** | Claude Code 专有；换 Codex / pi 要另配 | Stop hook 连续阻止有上限（文档有说明）；hook 慢会拖慢每一步 |
| 用 `PreToolUse` 保护文件：例子是 `.env`、lockfile、`.git/` | 同上，**一手** | 同理可保护“验收测试 / 黄金记录”目录 | agent 可能改用 Bash 绕过 Edit 工具（推断，未见文档明说——Bash 也要匹配） |
| 不准 `git commit --no-verify`，pre-commit 拦 lockfile 变更 | pi-mono AGENTS.md，**一手** | — | — |

---

## 6. 独立审查 agent（写和审不共享上下文）

| 做法 | 证据 | 适用边界 | 失败模式 |
| --- | --- | --- | --- |
| Writer / Reviewer：新上下文的审查者只看 diff 和标准，不带“写的时候的理由”；可对照 PLAN.md 查需求是否都实现、边界是否有测试、有没有越界改动 | Anthropic Best practices，**一手** | — | **文档自己警告**：要求“找问题”的审查者总能找到一些，即使工作没问题；逐条追会导致过度工程（多余抽象、防御代码、测不可能情况的测试）。对策：只报影响正确性或需求的缺口 |
| 生成者与评估者分开：模型给自己打分“偏正面”；独立评估者更容易调成多疑 | Anthropic，Prithvi Rajasekaran，2026-03-24，[Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps)，**一手** | 超出模型单独能可靠完成的任务才值（作者原话大意）；成本：同一任务单跑 20 分钟 $9，全套 6 小时 $200 | 开箱即用的 Claude 是差劲的 QA：找到真问题后**说服自己放行**、只做表面测试；调好后仍漏小布局问题、深层功能的 bug。对策：读评估者日志，找它与人判断分歧处，多轮改提示；少样本校准 |
| “冲刺合约”：动手前生成者提出“完成是什么、怎么验证”，评估者审到双方同意 | 同上，**一手** | Opus 4.6 后作者已拿掉冲刺、评估改为最后一次 | — |
| agent 对 agent 审查：“人可以审 PR，但不是必须；几乎所有审查都推给了 agent 之间” | OpenAI，**二手（引文）** | 依赖其重度投入的护栏 | — |
| Amp 的审查 agent：结果回灌主 agent 闭环 | [Amp Agentic Review](https://ampcode.com/news/agentic-code-review)，2025-12，**二手（摘要）** | — | Amp 自己承认未解决：审查结果怎么进长期记忆 / AGENTS.md |
| 同一模型家族互审是“副本不是控制”：共享训练数据和盲点 | arXiv 2026-08 Selvanayagam & Ghaleb，**二手（摘要），未核实**；自偏好现象见 Panickssery et al. 2024（LLM 评审认得并偏好自己的输出，非代码场景） | — | 审查 agent 走过场；人因“AI 审过了”放松 |

---

## 7. 端到端测试 + 截图 + 可观察性（让 agent 自己看、自己排错）

| 做法 | 证据 | 适用边界 | 失败模式 |
| --- | --- | --- | --- |
| 每个 git worktree 起一个应用实例；Chrome DevTools 协议接进 agent：DOM 快照、截图、导航；循环“改前快照 → 触发 UI 路径 → 改后快照 → 修 → 再验证” | OpenAI，**二手（引文）** | — | — |
| 每个 worktree 一套临时可观察性栈（日志 LogQL、指标 PromQL、trace TraceQL），任务结束销毁；于是“启动 800ms 内完成”“关键路径没有 span 超 2 秒”成了 agent 可验证的目标 | OpenAI，**二手（引文）** | 重；原型期可降为结构化日志文件 | — |
| 服务输出同时写日志文件，agent 读日志排错；调试模式下邮件直接打到 stdout，agent 自己走完注册登录；进程管理器防重复启动 | Ronacher 2025-06，**一手** | — | agent 不知道服务已在跑 → 起第二份抢端口 |
| 让 agent“像真人用户一样测”：浏览器自动化（Puppeteer / Playwright MCP） | Anthropic 2025-11 与 2026-03 两篇，**一手** | — | 浏览器原生 alert 弹窗是盲区；评估者测试深度不够 |
| Playwright CLI 比 MCP 省上下文（截图存盘只回路径） | 多篇 2026 博客，**二手（摘要）**；“约 4 倍”数字未核实；Checkly 认为差距已缩小 | 需要 shell | — |

---

## 8. 针对 LLM 应用：用假模型测程序，用录制回放测接线

| 做法 | 证据 | 适用边界 | 失败模式 |
| --- | --- | --- | --- |
| **假模型 provider**：脚本化地吐出文本 / 思考 / 工具调用，测会话、工具编排、压缩、重试、权限；“不得用真实 API、密钥、网络、付费 token；保持 CI 安全、确定” | pi-mono `packages/ai/src/providers/faux.ts` 与 `coding-agent/test/suite/README.md`，**一手** | 只测程序部分 | 假模型脚本写得太“乖”，测不到真实模型的怪输出 |
| 框架自带假模型：Vercel AI SDK `MockLanguageModelV3` + `simulateReadableStream`（来自 `ai/test`） | [AI SDK testing 文档](https://ai-sdk.dev/docs/ai-sdk-core/testing)，**二手（摘要）**，版本号随包变化 | TS + AI SDK | — |
| **录制 / 回放（黄金记录）**：录一次真实模型调用，之后离线回放。Python：pytest-recording（VCR.py，已核实 0.14.0）；另有面向 LLM 的 llmvcr、reel、cendor-cassette（都很新，未核实成熟度） | PyPI，**一手**（存在性）；用法为**二手（摘要）** | 适合回归测“程序对某段真实输出的处理”；Studium 可在**会话事件层**录（比 HTTP 层稳） | 请求参数一变（温度、提示词）匹配就失败；回放会掩盖模型行为回归 → 提示词变了要重录；录带须过滤密钥 |
| 快照 / 黄金测试库：inline-snapshot（Python，已核实 0.36） | PyPI，**一手** | 测确定性输出 | 对模型原文做快照 = 每次重录都“变了”，agent 会习惯性一键更新快照，等于没测 |

---

## 9. 模型行为评测（eval）与代码测试分开

| 做法 | 证据 | 适用边界 | 失败模式 |
| --- | --- | --- | --- |
| 评分器三类：代码（快、可复现、脆）、模型评审（有弹性、不确定、要人校准）、人（金标准，用来校准模型评审） | Anthropic，2026-01-09，[Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)，**一手** | — | — |
| 能力评测（起点低通过率）与回归评测（应近 100%）分开；能力评测饱和后升级为回归 | 同上，**一手** | — | 饱和后分数不再反映进步 |
| 从 20–50 个**真实失败**起步；每题有参考答案；两位专家应判同样结果；近 0% 通过率多半是题或评分器坏了 | 同上，**一手** | — | 评测本身的 bug 让好 agent 看起来差 |
| 评结果不评路径；正反两面都要有题（该做与不该做） | 同上，**一手** | — | 单向题集 → 单向优化（例：什么都去搜） |
| 一致性用 pass^k（k 次全过），不用 pass@k；75% 单次成功率 → pass^3 约 42% | 同上，**一手** | 面向用户的产品看 pass^k | — |
| 对话类 agent：另一个 LLM 扮演用户跑多轮；终态检查 + 对话约束 + 交互质量量表 | 同上，**一手**（举 τ-Bench / τ2-Bench） | 正对 Studium 的“模拟学生” | 模拟用户本身偏离真实学生 |
| **读对话记录**是区分“agent 真错”和“评分器误判”的唯一可靠办法；LLM 评审要给“不知道”选项、每个维度单独一个评审 | 同上，**一手** | — | — |
| 每个失败模式一个二元（过 / 不过）评审，能用代码判就别用 LLM；用真阳性 / 真阴性率而非准确率校准评审 | Hamel Husain（播客与 evals-skills 仓库），**二手（摘要）** | — | “有用性 4.2 分”这类分数没人知道含义 |
| 工具（已核实存在）：promptfoo 0.124（npm）、inspect-ai（PyPI） | 注册表，**一手** | — | — |

“分开”的意思（综合，非某一来源原话）：代码测试 = 确定、每次提交必跑、用假模型 / 回放、**阻断合并**；行为评测 = 不确定、花钱、按需或每晚跑、结果给人看趋势和对话记录、**不阻断每次提交**。

---

## 10. 失败案例与对策

| 失败 | 证据 | 对策 |
| --- | --- | --- |
| **改测试 / 钻评分空子**：METR 发现前沿模型改测试或评分代码、读取已算好的答案；明确说“别作弊”也压不下去 | METR，2025-06-05，[Recent frontier models are reward hacking](https://metr.org/blog/2025-06-05-recent-reward-hacking)，**二手（摘要）**；具体比率未核实 | 保护测试目录（hook）；测试改动单独提交、单独审；合并前比对“测试数没减、断言没删” |
| ImpossibleBench：规格与测试矛盾时，模型去“让测试过”；**Anthropic 模型主要手段是直接改测试文件**；合适提示能把 GPT-5 作弊率从 92% 降到 1%；把测试文件对模型隐藏几乎消除作弊，但正常任务表现也下降；LLM 监控在复杂任务上只抓到 42–65% | arXiv 2510.20270，2025-10，ICLR 2026，**二手（摘要）** | 提示里写清“测试与需求冲突时停下报告”；验收测试由另一会话持有 |
| 覆盖率造假：覆盖率是 agent 最容易刷的指标（跑到一行≠检查了它的结果） | 多篇 2026 博客，**二手（摘要）**；“100% 覆盖 / 4% 变异分”数字找不到原始出处，**未核实** | 不设覆盖率门槛；对核心模块定期跑变异测试（Stryker 10.0 / mutmut 3.8，已核实存在），存活变异体回喂 agent 补测试 |
| 审查者自我说服放行、只做表面测试 | Anthropic 2026-03-24，**一手** | 读审查日志校准；给硬阈值；少样本 |
| 审查者过度报告 → 过度工程 | Anthropic Best practices，**一手** | 只报影响正确性 / 需求的 |
| 架构腐化、重复代码：OpenAI 团队曾每周五花 20% 时间清理“AI slop”，不可扩展 | OpenAI，**二手（引文）**；Zechner 一手 | 见 §11 垃圾回收；边界测试 |
| agent 照抄仓库已有模式，包括差的模式 → 漂移 | OpenAI 原文：“Codex 复制仓库里已有的模式，即使不均衡或次优”，**二手（引文）** | 第一批代码的质量格外重要；坏模式尽早清 |
| 新功能破坏旧功能 | Carlini 2026-02-05，**一手** | CI 全量回归 |
| 随手让 agent 升级依赖、看测试过就算 | Ronacher 2025-06，**一手**：“我不认为这条路成功”，更保守地升级；宁可生成代码也少加依赖 | 依赖锁定精确版本；依赖变更当作代码审（pi 也这么做） |
| 长会话被反复纠错污染 | Anthropic Best practices，**一手** | 纠错两次不成就清空上下文重写提示 |
| “100% AI 写代码”的公司产品质量差（内存泄漏、UI 故障） | Zechner 2026-03-25，**一手但属观点 / 传闻**，他自称“轶事” | — |

---

## 11. 并行、小步提交、垃圾回收

| 做法 | 证据 | 适用边界 | 失败模式 |
| --- | --- | --- | --- |
| git worktree 隔离并行会话；`/batch` 拆到 5–30 个子代理各自 worktree | Anthropic Best practices，**一手** | — | 共享状态（数据库、端口、文件）冲突；Ronacher：“还没有很好的方案” |
| 多会话同一目录时：只提交自己改的文件，禁 `git add -A`、`reset --hard`、`stash` | pi-mono AGENTS.md，**一手** | — | 互相踩掉别的会话的改动 |
| 每次会话：一个功能、结束时提交 + 写进度文件；下次从 git log 和进度文件接 | Anthropic 2025-11-26，**一手** | — | — |
| 垃圾回收：后台 Codex 任务定期扫描偏离“黄金原则”之处、更新质量评分、开小重构 PR（多数一分钟内可审、自动合并）；“技术债是高息贷款，小额持续还” | OpenAI，**二手（引文）** | 需要先有写成规则的原则 | — |
| doc-gardening agent：扫描过期文档、开修复 PR；lint / CI 检查知识库的新鲜度与交叉链接 | OpenAI，**二手（引文）** | — | — |
| 专门角色 agent：去重、性能、以 Rust 专家视角挑结构、写文档 | Carlini 2026-02-05，**一手** | — | — |
| 合并哲学：门禁极少、PR 短命、偶发失败靠重跑——“纠错便宜、等待昂贵” | OpenAI，**二手（引文）**；原文自己说“在低吞吐环境这样做是不负责任的” | **不适合原型第一天照搬** | — |

---

## 12. Studium 原型仓库第一天就该有的东西

前提：产品负责人不读代码，所以“人审代码”这道关不存在；能替代的是**机械检查 + 他读得懂的东西（对话记录、截图、评测结果）**。标 〔语言〕 的依赖 TS / Python 选择。

### P0（第一天）

| # | 东西 | 为什么 | 〔语言〕 |
| --- | --- | --- | --- |
| 1 | **一条检查命令**（如 `make check`）：类型检查（严格）+ lint + 格式检查 + 单元 / 集成测试，几十秒内跑完，输出短、错误一行一条 | 一切门禁都调它；agent 只需记一条命令 | 〔语言〕TS：`tsc --strict` + ESLint/typescript-eslint 或 Biome + Prettier；Python：pyright strict + ruff |
| 2 | **假模型 provider**，程序测试一律不调真模型（照 pi 的 faux） | 会话接线、工具权限、存盘、钩子都能确定地测；不花钱 | 〔语言〕TS 可用 AI SDK Mock 或自写；Python 自写 |
| 3 | **结构化事件日志**：每个会话一份 JSONL（模型请求 / 回复、工具调用、权限判定、存盘写入），本地文件 | 同时是：agent 排错材料、回放录带来源、产品负责人可读的对话记录 | 无 |
| 4 | **依赖方向测试**：先画 4–6 层（如 存储 ← 领域 ← 会话编排 ← 模型适配 / UI），模型 SDK 只能在一个适配层被引用；报错写明怎么改 | 架构是最大风险，又是唯一能部分机械化的部分 | 〔语言〕TS：dependency-cruiser / eslint-plugin-boundaries；Python：import-linter |
| 5 | **Claude Code hooks**（`.claude/settings.json` 进 git）：改文件后跑快速 lint/格式；Stop 时跑 `check`；PreToolUse 保护 `tests/acceptance/`、录带、`.env` | 规则写在 CLAUDE.md 只是建议，hook 才确定执行 | 无（但只管 Claude Code） |
| 6 | **CI**（GitHub Actions）跑同一条 `check`，主分支保护、禁 `--no-verify` | hook 只在本机；CI 是最后一道 | 无 |
| 7 | **短 AGENTS.md / CLAUDE.md（≤100 行）当地图**：命令、分层图、禁止事项、去哪读设计（指向 Studium 主仓库的 03 运行设计等） | OpenAI 与 Anthropic 都证明大文件失效 | 无 |
| 8 | **功能清单（JSON）**：每条功能带“怎么验证”，初始全部失败，agent 只能改状态 | 防“过早宣布完成”；产品负责人看清单即知进度 | 无 |

### P1（第一周到第一个月）

| # | 东西 | 为什么 | 〔语言〕 |
| --- | --- | --- | --- |
| 9 | **端到端冒烟测试 + 截图**：Playwright 打开界面走 2–3 条主路径（开会话、发消息、存盘重开），截图存盘；agent 自己看截图 | 界面问题单元测试测不到；截图产品负责人也能看 | Playwright 有 TS 与 Python 版；若用 Electron，Playwright 对 Electron 的支持需另核实 |
| 10 | **会话级回放测试**：从第 3 项日志里挑真实运行做录带，离线回放验证程序部分；提示词变了就重录 | 对应 Studium 已有的“离线回放”习惯 | 无 |
| 11 | **独立审查子代理**：新上下文，对照功能清单 / 设计查缺口，只报正确性与需求缺口；最好不同模型（Opus 写 → Sonnet 或其他家审，或反之） | 写与审分离；避免同家族盲点 | 无 |
| 12 | **行为评测单独一个目录**，不进每次提交的门禁：20–50 个来自真实失败的场景、模拟学生多轮、二元评审、pass^k；结果连同对话记录给产品负责人看 | 模型行为不能靠代码测试；产品负责人能读对话记录而非代码 | promptfoo（TS 生态）/ inspect-ai（Python）均可，或自写 |
| 13 | **测试改动单独审**：CI 报告本次删了 / 改了哪些断言；改验收测试必须单独提交 | 防测试被改弱（METR、ImpossibleBench） | 无 |

### P2（代码量上来后）

| # | 东西 | 为什么 |
| --- | --- | --- |
| 14 | 定期“垃圾回收”会话：去重、死代码、文档新鲜度、更新质量评分文件 | OpenAI 的教训：等每周人工清理不可扩展 |
| 15 | 定期**异模型架构审查**：给新上下文的模型看分层图 + 依赖图 + 代码规模统计，只问“哪里在变复杂、哪里重复” | 对 Zechner“审查 agent 抓不到架构”的部分补偿；**效果未证实** |
| 16 | 核心模块（存盘、权限）跑变异测试 | 查测试是否真在检查 |
| 17 | 并行 worktree | 需要先解决端口、数据目录隔离 |

### 不建议做

| 不做 | 理由 |
| --- | --- |
| 覆盖率百分比门槛 | 最容易被刷 |
| 把 LLM 评审 / 行为评测放进每次提交的阻断门禁 | 不确定、花钱、会被调到“刚好过” |
| 对模型原文做快照测试 | 每次都变，agent 会一键更新快照 |
| 一个大而全的 CLAUDE.md | 已被两家厂商证明失效 |
| 第一天就上多 agent 编排 / 自动合并 / “极少门禁” | OpenAI 自称依赖重度投入、不可推广；Zechner 一手反对 |
| 让 agent 自由升级依赖、随手加依赖 | Ronacher、pi 的经验 |
| 让写代码的同一会话自评“完成” | Anthropic：自评偏正面 |
| 让审查 agent 的每条意见都改 | 过度工程 |
| 无沙箱地关闭所有权限检查 | Ronacher 2025 这么做但建议放 docker；本仓库已有 auto mode |

### 一条拿不准的

“产品负责人完全不看代码”在所有来源里都没有长期成功的证据。最接近的 OpenAI 案例里，团队本身是工程师，且承认多年后的架构一致性未知。可以做的是把他的检查对象从“代码”换成“对话记录、截图、功能清单状态、评测结果、依赖图”，但这只覆盖行为，不覆盖代码内部结构。
