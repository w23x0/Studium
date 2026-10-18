# A · 闭环对话的 agent 框架选型调研

> 状态：外部调研（agent 写，**未定稿**，不作产品结论）。调研日 2026-10-07。
> 取证方式：npm / PyPI 注册表实时查询（版本、发版次数、许可证）；GitHub 仓库原始文件（README、文档、源码，经 raw.githubusercontent.com）；GitHub 仓库首页（star / issue 数，WebFetch 快照）；Anthropic 官方文档（code.claude.com）；Claude API 技能包内置文档（`claude-api` skill，缓存日 2026-10-06，以下记作「Claude API 文档（skill 版）」）。
> 访问受限：openai.github.io、ai-sdk.dev、pydantic.dev、api-docs.deepseek.com 被出口代理挡住，相关内容改读 GitHub 上的文档源文件；GitHub API 不可用，所以 **issue 平均响应时间没量到**，表里只有 open issue / PR 数。

---

## 0. 先讲一个 2026 年才有的硬约束（影响所有候选）

Claude 新模型（Opus 5.5 / Sonnet 5.5 / Fable 5.1）有「思考块绑定」（preserved thinking）：每个思考块的签名记住了产生它时的前缀——顶层 `system`、`tools` 集合、之前的每条消息。之后重放时前缀被改了，思考块就失效。

| 事实 | 来源 |
| --- | --- |
| 2026-08-31 及以后创建的账号默认强制：前缀被改后重放思考块 → 400 | Claude API 文档（skill 版）· Migrating to Claude Opus 5.5 → Breaking change 3 |
| 会改前缀的操作：改 / 删 / 重排早先的轮次（含客户端删旧工具结果）；每轮注入再删的提醒；**会话中途重建 `system` 或 `tools`**；从中间删思考块 | 同上（Fable 5.1 一节，Opus 5.5 原样适用） |
| 不破坏的操作：只追加；追加 `role:"system"` 中途系统消息；`clear_at` 一轮性系统消息留在原处；服务器端压缩（compaction）与上下文清理；只改 `max_tokens` / `effort` 等请求参数 | 同上 |
| 会破坏的客户端压缩形态：「保留尾巴」式（总结旧轮、保留最近几轮原样）和后台异步压缩；推荐要么服务器端压缩，要么「总结成一条、旧的全部不重放」 | 同上 |
| 中途改工具集的不破坏形态：开场把全集声明好（隐藏的标 `defer_loading:true`），之后用 `role:"system"` 里的 `tool_addition` / `tool_removal`（beta `mid-conversation-tool-changes-2026-07-01`） | 同上 |
| Opus 5.5 思考关不掉、`tool_choice` 强制（any/tool）一律 400；工具调用之间的说明文字改放在 thinking 块里，默认 `display:"omitted"` 时是空的 | Claude API 文档（skill 版）· Opus 5.5 段 |

**对 Studium 的含义**：Studium 已定「一个闭环一份上下文、只追加」——这与绑定规则天然一致。但很多框架的常用功能恰好违反它：动态系统提示（每轮重渲染）、历史处理器 / 裁剪、保留尾巴式总结中间件、按步骤增删工具。选型时这比「功能有没有」更关键。另外「程序中途追加事实」最合适的落点是**中途系统消息**（`role:"system"` 追加进 messages），要看框架能不能原生发出它。

---

## 1. 候选对比表

列说明：①开场交付＝能否完全控制系统提示与开场消息；②工具与 skill＝工具注册 + skill 按需加载；③钩子＝工具前后拦截、会话中途程序注入、收口时插手；④交回原文＝拿到含思考块与签名的原始消息并原样重放。活跃度＝最近版本日期 / 2026-07-07 至 10-07 发版次数 / GitHub star（10-07 快照）。

| 候选 | ①开场交付 | ②工具与 skill | ③钩子（拦截 / 注入 / 收口） | ④交回原文 | 多厂商（Claude 特性保真） | 编程绑定 | 语言 · 许可 | 活跃度 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Claude Agent SDK** | 可：`systemPrompt` 收字符串或 `custom`，默认是最小提示 [T] | 内置工具可去掉，自定义工具走 MCP（含进程内）；skill 只从文件系统 `.claude/skills` / 插件加载 [T][O] | 很全：PreToolUse 可拒绝 / 改参，PostToolUse 可追加上下文或替换输出，Stop、PreCompact 等 30+ 事件 [H]；中途注入用流式输入 `priority: next/later/now`、`shouldQuery:false` [T]；**中途系统消息未核实** | 能：消息带原始 `BetaMessage`；`SessionStore` 可把记录镜像到自己的库，但条目是 Claude Code 内部 JSONL 格式 [S] | **只 Claude**（含 Bedrock/Vertex/Foundry）；DeepSeek 等「兼容 Anthropic」端点靠改 `ANTHROPIC_BASE_URL`，非官方 | **强**：就是 Claude Code 二进制做子进程；cwd、settings、CLAUDE.md 概念都在 [O] | TS / Python · TS 包 `SEE LICENSE`（Anthropic 商业条款）[npm]，Python 包标 MIT 但文档说受商业条款约束 [O] | TS 0.3.293 @10-07 / 81 次；Python 0.2.164 @10-06 / 53 次；TS 仓库 1.8k star、216 open issue |
| **Anthropic API Tool Runner**（`@anthropic-ai/sdk` / `anthropic` 自带） | 完全控制（就是 Messages API） | 只有你定义的工具；skill 需自建；`tool_addition` / `defer_loading` 原生可用 | 每轮产出助手消息后可介入、改参数、拦截结果、限轮数；支持流式与自动压缩 [K] | 能：就是 API 原生消息，原样存原样发 | **只 Claude** | 无 | TS / Python 等 7 种 · MIT [npm/PyPI] · beta | TS SDK 0.132.0 @10-07 / 27 次；Python 1.12.0 @10-07 / 25 次 |
| **Claude Managed Agents** | agent 配置里定 `system`；会话只引用 agent [K] | 自定义工具 + skills + MCP；工具跑在 Anthropic 容器或自托管沙箱 [K] | 发 `user.message` 事件排队注入；权限策略 `always_ask` 走确认 [K]；无「工具前程序钩子」，只能通过自定义工具 / 确认流程 | **不能**：`agent.thinking` 事件不带思考内容 [K]；历史在服务器端，无法拿原始消息去别处重放 | **只 Claude**，且 Bedrock/Vertex/Foundry 不支持 [K] | 弱（有沙箱容器概念） | REST + 各 SDK · beta | 未量 |
| **OpenAI Agents SDK** | 可：`instructions` + `call_model_input_filter` 可在调用前改输入 [R] | 函数工具、MCP、托管容器 skills（OpenAI 托管）[Tt] | `RunHooks` / 守卫（guardrails）/ 工具输入守卫 / 审批中断 [R]；中途注入靠 `call_model_input_filter` | 内部是 Responses API 条目格式；Claude 思考块经 LiteLLM 转两层（Anthropic→Chat 格式→Responses 条目）带过去 [源码 litellm_model.py] | Claude 经 **LiteLLM / Any-LLM 适配层，官方自称 best-effort、beta** [M]；中途系统消息、tool_addition、压缩块等 Anthropic 新块**推断会丢**（未实测） | 无 | Python / TS · MIT | Py 0.23.1 @10-02 / 17 次；JS 0.19.0 @10-05 / 19 次；Py 仓库 29.9k star |
| **pi-ai + pi-agent-core**（现 `@earendil-works/*`） | 可：首条 system 消息即提示；后续 system 消息可按 `sections` 局部替换 [P] | `AgentTool`；`agent.state.tools` 变化会自动在下一请求前以 system 消息宣告（Anthropic 上发原生 `tool_addition`）[P][源码]；skill 在 coding-agent 包里，core 层需自建 | `beforeToolCall` 可阻止、`afterToolCall` 可改结果、`prepareRequest` 每次请求前装上下文、`finishTurn` 决定继续 / 结束、`steer` / `followUp` 中途注入 [P] | 存 pi 自己的消息格式（思考块带 `thinkingSignature`、redacted 也保留）[源码]；**会过滤空文本块、清洗代理字符**——是否影响绑定需实测 | 多厂商（Anthropic/OpenAI/Google/Bedrock/各种兼容端点）；Anthropic 适配器已支持中途系统消息、`tool_addition`、按消息改 effort [源码]；**未见服务器端 compaction**；对 Opus 5.5 类模型**写死** `drop_block`（出错时静默丢思考而非报错）[源码 1235–1239 行] | core 无；coding-agent 包有 | TS · MIT | 1.1.0 @10-07 / 31 次；1.0.0 于 10-01；5 月从 `@mariozechner/*` 改名；113k star（含整个 pi CLI）；新贡献者的 issue / PR 默认自动关闭 [README] |
| **Vercel AI SDK**（`ai` + `@ai-sdk/anthropic`） | 可：`instructions` / `system`；`allowSystemInMessages` 后可在 messages 中途放 system [V] | 工具 + `needsApproval` 审批；skill 只有「上传到厂商容器」一种（`uploadSkill`），本地按需 skill 需自建（二手资料，未读原文） | `prepareStep` 每步前可改模型 / 工具 / 消息；`onStepStart`、`onToolExecutionStart` 等回调；`stopWhen` 控制结束 [V-agents] | 存 AI SDK 的 `ModelMessage`；签名放在 `providerOptions` / `providerMetadata` 里往返 [V] | 厂商最多；Anthropic 适配器跟得很紧：中途系统消息（含 `clearAt`、按消息 effort）、`tool_addition`、思考绑定控制、按需与阈值压缩、上下文清理、缓存都有 [V] | 无（有可选沙箱工具） | TS · Apache-2.0 | `ai` 7.0.131 @10-07；大版本约半年一次（6.0 于 2025-12-22，7.0 于 2026-06-25）；27.2k star、473 open issue、889 open PR |
| **Pydantic AI** | 可：静态 `instructions`；**动态 instructions 每轮重渲染会破坏思考绑定**（官方文档明说）[Y] | 工具集；「按需能力」（`defer_loading=True` 的 Capability）= 可读 `SKILL.md` 的按需 skill [Y-cap] | 钩子很全（run / node / 模型请求 / 工具校验 / 工具执行 / 输出）[Y-hooks]；`RunContext.enqueue` / `AgentRun.enqueue` 中途注入，可注入 `SystemPromptPart` = 中途系统消息 [Y-msg] | 消息可序列化为 JSON 原样存取；思考块往返 | 多厂商一等支持；Anthropic：自动 / 显式缓存、中途系统消息、`AnthropicCompaction` 服务器端压缩、思考绑定（被拒时自动用 `drop_block` 重试一次并发警告）[Y] | 无 | Python · MIT | 2.54.0 @10-03 / 64 次；2.0 于 2026-06-23（1.0 于 2025-09-05）；20.5k star、约 1k open issue |
| **Mastra** | 可 | 工具、MCP、工作流；skill 未核实 | 处理器（processors）、挂起 / 恢复；细节未核实 | 底层模型调用走 AI SDK（README 自述「40+ 厂商」）；自带记忆系统会改写上下文（未核实细节） | 同 AI SDK（推断） | 无 | TS · Apache-2.0（`ee/` 目录另有许可）[L] | 1.75.0 @10-07 / 306 次；28.6k star |
| **LangGraph**（+ langchain-anthropic） | 可 | 工具 / 中间件；skill 未核实 | 图节点 + `create_agent` 中间件（before_model、wrap_tool_call 等）；自带 SummarizationMiddleware 属「保留尾巴」式，**与思考绑定冲突**（按 Anthropic 文档推断） | langchain-anthropic 源码已处理签名、redacted、压缩块、`tool_addition`、中途系统消息 [源码] | 多厂商 | 无 | Python / TS · MIT | Py 1.2.14 @10-06 / 6 次；42.8k star |
| OpenHands SDK | — | — | — | — | 经 LiteLLM | **强**（bash、文件编辑、工作区）；文档举了非编程例子 | Python · MIT | 1.53.0 @10-05 / 37 次 |
| goose / opencode | 应用级 agent，不是嵌入用的库 | — | — | — | — | goose 通用但是应用（Rust）；opencode 是编程 agent | goose Apache-2.0，opencode MIT | 未细查 |

来源代号：
- [O] https://code.claude.com/docs/en/agent-sdk/overview （10-07 读）
- [T] https://code.claude.com/docs/en/agent-sdk/typescript （10-07 读，前 10 万字）
- [H] https://code.claude.com/docs/en/agent-sdk/hooks （10-07 读）
- [S] https://code.claude.com/docs/en/agent-sdk/session-storage （10-07 读）
- [K] Claude API 文档（skill 版，2026-10-06 缓存）：`shared/tool-use-concepts.md`、`shared/managed-agents-*.md`
- [R] https://github.com/openai/openai-agents-python/blob/main/docs/running_agents.md ；[M] 同仓库 `docs/models/index.md`；[Tt] 同仓库 `docs/tools.md`；源码 `src/agents/extensions/models/litellm_model.py`
- [P] https://github.com/earendil-works/pi/blob/main/packages/agent/README.md ；源码 `packages/ai/src/api/anthropic-messages.ts`、`packages/ai/src/types.ts`
- [V] https://github.com/vercel/ai/blob/main/content/providers/01-ai-sdk-providers/05-anthropic.mdx ；[V-agents] 同仓库 `content/docs/03-agents/02-building-agents.mdx`、`04-loop-control.mdx`
- [Y] https://github.com/pydantic/pydantic-ai/blob/main/docs/models/anthropic.md ；[Y-msg] `docs/message-history.md`；[Y-hooks] `docs/hooks.md`；[Y-cap] `docs/capabilities/overview.md`
- [L] https://github.com/mastra-ai/mastra/blob/main/LICENSE.md
- langchain-anthropic 源码：`libs/partners/anthropic/langchain_anthropic/chat_models.py`
- 版本 / 发版次数 / 许可证：npm registry、PyPI JSON API，2026-10-07 查询

---

## 2. 逐个要点与坑

### 2.1 Claude Agent SDK

| 要点 | 来源 |
| --- | --- |
| 本质是「把 Claude Code 二进制当库用」：SDK 启动子进程跑 Claude Code | [O] 原文 "A library that runs the Claude Code binary" |
| 系统提示可完全自定义；不想要 Claude Code 预设就不用 `preset:'claude_code'` | [T] |
| `settingSources: []` 可关掉文件系统设置（CLAUDE.md、settings.json）；默认三者全开 | [T] |
| 中途注入：流式输入下用户消息带 `priority`；`shouldQuery:false` 只写进记录不触发模型 | [T] |
| 钩子比任何框架都全，PreToolUse 可 `deny` / `updatedInput` / `defer`；PostToolUse 可 `additionalContext` / `updatedToolOutput` | [H] |
| 会话持久化：默认写 `~/.claude/projects/` 下 JSONL；`SessionStore` 只是「镜像」，本地先写；`projectKey` 编码了工作目录，跨主机恢复要同目录 | [S] |
| `getSessionMessages` 返回的是压缩后的链，不是全量原始 | [S] |
| 许可：受 Anthropic 商业条款约束，不是普通开源 | [O]、npm `SEE LICENSE IN README.md` |

坑：
- 每个会话一个子进程，Studium 一个项目要同时跑主对话 + 若干任务对话 + 后台会话，进程数和内存开销要实测（**未实测**）。
- 记录格式是 Claude Code 内部条目，不是 Messages API 原文；「交回对话原文」要再转换一次。
- 只 Claude。之后加 OpenAI 就得换框架——与「闭环可整个替换」不冲突，但意味着第二套接入从零写。
- 中途系统消息（`role:"system"` 追加）能否从 SDK 发出：**未核实**。

### 2.2 Anthropic Tool Runner（官方客户端 SDK 自带的循环）

- 就是 Messages API 本身加一个循环助手，所以 2026 新特性（中途系统消息、`tool_addition`、`clear_at`、思考绑定控制、服务器端压缩）**当天可用**，不用等框架适配。[K]
- 每轮可介入（审批、改参数、改结果、限轮数），支持自动压缩；坑：`pause_turn` 不自动续（TS 可在循环里续，Python 要重开）。[K]
- 只 Claude。适合当「自写薄循环」的 Claude 端底座，而不是多厂商方案。

### 2.3 Claude Managed Agents

- Anthropic 托管循环 + 每会话容器；历史在服务器端，自动压缩。[K]
- **硬伤**：拿不到思考内容（`agent.thinking` 只是进度信号）[K]，记录不能原样导出去别的框架重放 → 不满足接口④；且只 Claude、云平台不支持。**不建议作闭环框架**。可以留作「后台无人值守任务」的参考。

### 2.4 OpenAI Agents SDK

- 设计围绕 OpenAI Responses API；非 OpenAI 模型走 LiteLLM / Any-LLM 适配器，文档自称「best-effort, beta」。[M]
- 适配层源码确有处理 Anthropic `thinking_blocks` 与签名的代码（`preserve_thinking_blocks`）[源码]，但要经过两次格式转换；Anthropic 的中途系统消息、`tool_addition`、压缩块、`clear_at` 在 Chat 格式里没有对应——**推断会丢或无法表达，未实测**。
- 对 Studium 现阶段（只做 Claude）是反方向：主力厂商反而走 beta 适配层。**不建议**。

### 2.5 pi-ai + pi-agent-core

| 要点 | 来源 |
| --- | --- |
| 包已迁到 `@earendil-works/pi-*`，仓库 `github.com/earendil-works/pi`；旧 `@mariozechner/*` 标注弃用 | npm 元数据（10-07） |
| 1.0.0 于 2026-10-01 发布；10-07 已到 1.1.0；agent-core 近期移除过 `shouldStopAfterTurn` 改成 `finishTurn` | npm、[P] |
| Earendil（Armin Ronacher 的公司）2026-04 收编 pi，核心保持 MIT；部分将来组件可能非开源 | 二手报道（implicator.ai、rywalker.com 等），**未读一手公告** |
| 接口形状和 Studium 的四个接口几乎一一对应：`prepareRequest`（装开场 / 规范上下文）、`beforeToolCall`/`afterToolCall`（工具钩子）、`steer`/`followUp`（中途追加）、`finishTurn`（收口插手）、transcript 自带 system 消息与工具变更 | [P] |
| Anthropic 适配器：中途系统消息、`tool_addition`、按消息 effort、redacted thinking、缓存标记都做了 | 源码 `anthropic-messages.ts` |
| 新增 `pi-durable`：持久化会话 / 任务运行时，标注 Experimental、API 随时变 | `packages/durable/README.md` |
| OpenClaw（非编程的个人助理 agent）早期建在 pi 之上；有二手资料说后来把 runtime 搬回自家代码 | 二手，**未核实** |

坑：
- 对「能调每轮 effort 的模型」（Opus 5.5 这类）**写死** `prefix_mismatch_behavior:"drop_block"`：前缀被改时静默丢思考，不报错。Studium 若想「出错就要看见」，需要改源码或包一层（能否配置：**未核实**）。
- 没看到服务器端 compaction（pi 的压缩在 coding-agent 层，是客户端做的）。
- 迭代极快、改名刚完成、1.0 刚出；维护方对新贡献者 issue 默认自动关闭——社区反馈渠道窄。
- 消息转换时会丢掉空白文本块、清洗代理字符；按「前缀须逐字节一致」的规则，这类规范化是否触发绑定失效**需实测**（用 `input_transformations` 日志）。

### 2.6 Vercel AI SDK

- Anthropic 适配器是本次所见跟进最快的：中途系统消息（`allowSystemInMessages`，含 `clearAt`、按消息 effort，自动加 beta 头）、`tool_addition`、思考绑定控制（`blockBinding`）、按需压缩（`compact-2026-09-04`）与阈值压缩、上下文清理、缓存、fallbacks 都有专节。[V]
- Agent 抽象 `ToolLoopAgent`：`prepareStep`（每步前改模型 / 工具 / 消息）、`stopWhen`、生命周期回调、工具审批、子 agent、`WorkflowAgent`（持久化，二手资料称 stream-first）。[V-agents]
- 坑：
  - 大版本约半年一次（5→6→7），每次有破坏性改动；`ai` 包三个月 253 次发布（含预发布）。
  - 统一的 `ModelMessage` 是 SDK 自己的格式，Claude 专有内容藏在 `providerOptions` 里；「原样重放」依赖它往返无损——文档声称支持，**未实测**。
  - `prepareStep` 改消息很方便，但正是会破坏思考绑定的那类操作；用时要守「只追加」。
  - 本地 skill 无内置机制（只有上传到厂商容器）。

### 2.7 Pydantic AI

- 文档是本次所见对「思考绑定」讲得最透的：明说动态 instructions、按步过滤工具集会破坏前缀；被拒时自动 `drop_block` 重试一次并发 `AnthropicStaleThinkingBlockWarning`；也可显式设 `error` 让它大声失败。[Y]
- 中途系统消息：首个请求之外的 `SystemPromptPart` 自动按中途系统消息发；不支持的模型 / 通道退化为带 `<system>` 标签的用户消息。[Y]
- `enqueue` 两种优先级（`asap` 打断式、`when_idle` 等空闲）——正好对应 Studium 的「程序中途追加事实」。[Y-msg]
- 服务器端压缩 `AnthropicCompaction`；缓存四种放置方式 + 缓存诊断。[Y]
- 按需 Capability = 本地 SKILL.md 按需加载。[Y-cap]
- 坑：Python（见 §4）；1.0→2.0 只隔 9 个月；open issue 约 1k。

### 2.8 Mastra / LangGraph

- 两者都是「重框架」：带记忆、工作流 / 图、总结中间件。它们的默认上下文管理（语义召回、保留尾巴式总结）与「一份上下文只追加」相冲突，要么关掉，要么就失去用它们的理由。
- langchain-anthropic 本身对 Anthropic 新块支持到位（源码可见），问题在上层抽象。
- Studium 闭环外的「事件 → 清单」流程是自己写的，不需要图编排引擎。**不建议**。

### 2.9 编程向的 agent（OpenHands SDK、goose、opencode）

- OpenHands SDK 文档举了非编程用例，但核心抽象是工作区 + bash + 文件编辑，模型层是 LiteLLM。[二手：docs.openhands.dev 摘要]
- goose（Block → Linux 基金会 AAIF，Rust，Apache-2.0）定位通用但是**应用**，不是可嵌入的库。[二手]
- opencode 是编程 agent 的客户端 / 服务端，非本项目所需。**都不建议**。

---

## 3. 别人怎么搭「多会话、非编程」的 agent 产品

能找到的一手 / 准一手证据很少，大多是厂商软文或 SEO 对比文，以下只列有落点的：

| 观察 | 来源 / 可信度 |
| --- | --- |
| OpenClaw（个人助理类、多渠道）在 pi 的 SDK 之上加网关、渠道、记忆、子 agent；有说法称后来把 agent runtime 搬回自家代码，只留 TUI 依赖 | chattergo.com、juejin 等二手；未读源码 |
| Earendil 用 pi 做 Slack / 聊天自动化（`earendil-works/pi-chat`）和云平台 Lefos | pi README（一手）+ 二手报道 |
| Pydantic 官方对比文的论点：Claude Agent SDK 是「捆绑 Claude Code 可执行文件、循环跑在子进程」，建议放沙箱；Pydantic AI 循环在自己进程内 | 搜索摘要（pydantic.dev 被挡，未读原文），且作者是竞争方 |
| 「多数生产 agent 用手写循环或薄包装」——常见说法，但所见文章都没给数据 | 多篇博客，无数据，**不当依据** |

结论：没有找到能直接借鉴的「多会话教学 agent」公开架构。可借的只有一个模式：**产品层自己管会话与记录，agent 循环用薄库**（OpenClaw on pi 就是这样）。

---

## 4. TS 还是 Python

| 因素 | 倾向 | 说明 |
| --- | --- | --- |
| 界面是 web / 桌面 | TS | 核心与界面同语言可共享类型（消息、事件）；桌面壳（Electron / Tauri 前端）天然 TS |
| 「核心与界面分开」 | 中性 | 核心可以是独立后端进程，界面经 HTTP / IPC 连；Python 核心 + TS 界面也成立，代价是两套类型定义 |
| 候选质量 | 两边都有好选择 | TS：Vercel AI SDK、pi、Anthropic SDK；Python：Pydantic AI、Anthropic SDK |
| 现有代码 | 弱 Python | `书库处理/` 是离线脚本（标准库），与在线核心无共享代码；可以继续保持 Python 不动 |
| 厂商新特性跟进 | 中性 | 官方 SDK 两种语言同步发；第三方框架里 AI SDK（TS）与 Pydantic AI（Python）都跟得很紧 |

判断（拿不准的地方已标出）：界面若确定是 web / 桌面，**在线核心用 TS** 更省事；书库处理继续 Python，两者通过文件 / 数据库交接即可。若产品负责人更熟 Python 或更看重 Pydantic AI 那套思考绑定处理，Python 核心也站得住——差别不大到能单独定案。

---

## 5. 推荐

### 5.1 「自己写薄循环 + 统一模型接口」vs「用现成框架」

| 维度 | 自写薄循环 | 现成框架 |
| --- | --- | --- |
| Claude 新特性（中途系统消息、tool_addition、压缩、绑定控制） | 官方 SDK 当天可用 | 要等适配；AI SDK / Pydantic AI 目前很快，pi 缺服务器端压缩 |
| 原样保存、原样重放 | 直接存厂商原生消息，无转换，最稳 | 存框架格式，依赖往返无损（多数声称支持，均需实测） |
| 「只追加」纪律 | 自己掌控 | 要逐个关掉框架的改写功能（动态提示、历史处理器、总结中间件、`prepareStep` 改消息） |
| 多厂商 | 要自己写适配；但 Studium 的五家只需两种协议：Anthropic Messages（Claude、DeepSeek / Kimi / 智谱都有兼容端点）与 OpenAI 协议 | 现成 |
| 工作量 | 循环本身不大（几百行级，估计）；skill 加载、工具钩子、收口都要自己写 | 少写循环，但要读懂框架、跟它的大版本 |
| 换框架成本 | Studium 的四个接口本来就是边界，薄循环就是第一个实现 | 同左 |

关键观察：**Studium 的一个闭环只用一个模型**，跨厂商发生在「会话之间」而不是「一条对话内部」。所以并不需要一种能在厂商之间互转的统一消息格式；需要的是「每个会话存它自己厂商的原生消息 + 一个给界面 / 守卫看的统一视图」。这削弱了统一框架的主要卖点。

### 5.2 第一选择

**TS 自写薄循环，Claude 端直接用官方 `@anthropic-ai/sdk`（Messages API；可用其 Tool Runner 或手写循环），记录存 Messages API 原生消息；以后加 OpenAI 时再写第二个协议适配。**

理由：
1. 四个接口全部可直接落到 API 原语上：开场＝冻结的 `system` + 首条消息；工具 / skill＝开场声明全集、`defer_loading` + `tool_addition` 按需放出（不破坏缓存与思考绑定）；中途追加事实＝中途系统消息；收口＝自定义「申请收口」工具在程序侧调守卫；原文＝原生消息。
2. 思考绑定、服务器端压缩、`clear_at`、按消息 effort 等 2026 新约束 / 新能力都不经过第三方转换层。
3. DeepSeek（官方文档列出 `https://api.deepseek.com/anthropic`，搜索摘要所见）、智谱（`open.bigmodel.cn/api/anthropic`，中文教程所见，**未读官方页**）、Kimi（有兼容端点，**未找到官方页**）都有 Anthropic 兼容端点，后续接入可能只需换 base URL——但它们对 thinking / redacted / 缓存的兼容程度**未核实**，接入时要单测。

不确定之处：薄循环的真实工作量没做原型，「几百行」是估计；「自己写」也意味着重试、流式、取消、并行工具等细节都要自己补。

### 5.3 备选

| 顺位 | 选项 | 什么情况下换成它 |
| --- | --- | --- |
| 备选 1 | **Vercel AI SDK**（只用 `streamText` 单步 + 自己的循环，或直接用 `ToolLoopAgent`） | 想尽早多厂商、不想自写重试 / 流式；接受半年一次大版本 |
| 备选 2 | **pi-agent-core + pi-ai** | 想要一个接口形状最贴合 Studium 的现成循环；需先确认能否关掉写死的 `drop_block`、自补服务器端压缩，并接受刚 1.0 的变动风险 |
| Python 线 | **Pydantic AI** | 若核心定为 Python；它对思考绑定、中途系统消息、按需 skill、服务器端压缩的处理是本次所见最完整的 |

不建议：Claude Agent SDK（编程 harness、子进程、只 Claude、商业条款、记录格式非原文）、Managed Agents（拿不到思考原文）、OpenAI Agents SDK（Claude 走 beta 适配层）、LangGraph / Mastra（重抽象与只追加冲突）、OpenHands / goose / opencode（编程向或应用级）。

### 5.4 选定前建议的小验证（只列需要确认的，不展开）

1. 思考绑定：按 Anthropic「三步检查」，用 `thinking-binding-controls-2026-08-01` + `drop_block` 跑一段多轮带工具会话，记录每轮 `input_transformations`；分别测自写循环与备选框架，看规范化是否触发丢块。
2. 跨天续接：隔一天用同一份原生记录重放，确认思考块仍有效（缓存过期不影响）。
3. 产品负责人账号的创建日期是否在 2026-08-31 之后（决定是否默认强制）——**未知**。

---

## 6. 未核实 / 拿不准清单

- 各仓库 issue 响应速度（GitHub API 不可用，只拿到 open 数）。
- Claude Agent SDK 能否发中途系统消息；多会话子进程开销。
- OpenAI Agents SDK 经 LiteLLM 时 Anthropic 新块（中途系统、tool_addition、压缩）是否保留——推断会丢。
- Vercel AI SDK `ModelMessage` 往返是否逐字节保住前缀；本地 skill 机制。
- pi 的 `drop_block` 能否配置；空文本块过滤是否影响绑定。
- Mastra 的 skill、处理器细节；LangGraph 的 skill。
- DeepSeek / Kimi / 智谱兼容端点对 thinking 签名、redacted、缓存的支持（只有二手测试文件说 DeepSeek 需回传思考块、不支持 redacted 与思考块缓存标记）。
- Pydantic 对比文、OpenClaw 架构说法均为二手。
