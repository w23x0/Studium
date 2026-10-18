# B · 界面外壳、核心接口与本地存储：选型调研

> 状态：调研草稿（外部线索，**不作产品结论**）。调研日 2026-10-07。
> 方法：能读源码的直接 `git clone` 读当日 HEAD（下文写“源码 HEAD 2026-10-07”）；GitHub API、streamdown.ai、vercel.com、sqlite.org 被本环境代理拦截，相关结论改读仓库内文档或本机实测，并注明。
> 标记：**[源码]** 读过仓库文件 · **[文档]** 读过官方文档正文 · **[实测]** 本机跑过 · **[二手]** 只看到搜索摘要或第三方文章 · **未核实** 没读到一手材料。

---

## 1. 同类项目都用什么栈

| 项目 | 外壳 | 前端 | 本地存储 | 公式渲染 | 来源 |
| --- | --- | --- | --- | --- | --- |
| opencode（sst） | **Electron 42**（`packages/desktop`），另有 `opencode web`（起服务 + 浏览器打开） | SolidJS + Vite | **SQLite（WAL）+ drizzle**，有 `event` 表（按 aggregate + seq 的事件流）；旧版是 JSON 文件，靠迁移搬过去 | 未看到 KaTeX 依赖（编程工具不需要） | [源码] HEAD 2026-10-07 |
| Codex CLI / 桌面（OpenAI） | 桌面端框架**未核实**；核心是 Rust 的 app-server，客户端经 JSON-RPC（stdio 为主，也有 WebSocket）接入 | — | **JSONL rollout 作正本 + SQLite state DB 作可查询元数据**；数据库坏了可移开、从 JSONL 重建 | — | [源码] `codex-rs/thread-store/README.md`、`cli/src/state_db_recovery.rs`；JSON-RPC 架构见 OpenAI 2026-02 博文 [二手摘要] |
| pi（badlogic/pi-mono） | 终端 | — | **JSONL 会话树**（每行 `id/parentId`，同一文件内分叉） | — | [源码] `packages/coding-agent/docs/session-format.md` |
| Claude Code | 终端 / 桌面 | — | JSONL，`~/.claude/projects/<路径>/<会话>.jsonl` | — | [文档/issue] 见 §3.2 |
| Claude 桌面版 | Electron | — | 未核实 | 未核实 | [二手] webpronews、mewayz 文章，无官方声明 |
| Cherry Studio | **Electron 44** + electron-vite | React 19 + Vite 8 | better-sqlite3 + drizzle（另有 dexie/IndexedDB 旧存储） | **streamdown ^2.5** + katex 0.16 | [源码] package.json v2.1.4，2026-10-07 |
| Chatbox | Electron 35 | React 18 | @libsql/client（SQLite 系） | react-markdown + remark-math + rehype-katex | [源码] package.json |
| LobeHub | Electron 44（`apps/desktop`），主体是 Next.js 16 Web | React 19 + antd 6 + @lobehub/ui | PGlite / Postgres + drizzle | 走 @lobehub/ui 的 Markdown，细节未核实 | [源码] package.json |
| Jan | **Tauri 2**（Rust） | React 19 + Vite | 未核实 | **自 fork 的 streamdown**（`npm:@janhq/streamdown`）+ katex；E2E 用 `tauri-plugin-wdio-webdriver` | [源码] `src-tauri/Cargo.toml`、`web-app/package.json` |
| Open WebUI | 纯 Web（Python 后端） | SvelteKit + Svelte 5 | 未细看 | katex + marked | [源码] package.json v0.11.4 |
| LibreChat | 纯 Web（Node + Mongo） | React | Mongo | 未细看 | [源码] package.json v0.8.8 |
| AnythingLLM | 有桌面版，框架未核实 | — | — | — | 未核实 |

**读出来的规律**（基于上表，属我的归纳）：
- 2026 年做“Claude 桌面式”产品的开源项目里，**Electron 是绝对主流**（opencode、Cherry Studio、Chatbox、LobeHub、Claude 桌面）；Tauri 代表是 Jan。
- opencode 2025 年曾是 Tauri 桌面，现 README 写“built with Electron”[源码]；迁移原因的说法（WebKit 在 macOS/Linux 渲染与 Chromium 不一致、服务端从 Bun 改到 Node 后可直接跑在 Electron 里）只见于二手文章摘要，**未核实**。
- “核心是独立进程，界面只是客户端”已是主流：opencode（HTTP + SSE）、Codex（JSON-RPC app-server）都这么做。

---

## 2. 界面外壳

### 2.1 对比表

| 维度 | Electron | Tauri 2 | Electrobun | 本地 Web（浏览器打开 localhost） |
| --- | --- | --- | --- | --- |
| 渲染引擎 | 自带 Chromium，三平台一致 | 系统 WebView：Win=WebView2(Chromium)，mac=WKWebView，**Linux=WebKitGTK** | 默认系统 WebView，可选 `bundleCEF` 打包 Chromium | 用户的浏览器 |
| KaTeX / PDF 截图显示一致性 | 最稳 | Linux 上有已知图形问题（NVIDIA 下白屏、闪烁、WebGL/canvas 静默走慢路径）[文档] Tauri “Linux Graphics Issues” 页 | 用 CEF 时同 Electron；默认同 Tauri 风险 | 取决于浏览器，Chrome/Firefox 均好 |
| 核心语言 | Node（TS）主进程，可直接跑核心 | Rust 主进程；TS 核心需作 sidecar 另起进程 | Bun/自研 JSC 运行时 “Cottontail” | 任意 |
| 体积 / 内存 | 大（百 MB 级） | 小 | 小 | 无额外 |
| UI 自动化测试 | Playwright `_electron`（官方标“experimental”，since v1.9）[源码] playwright docs | WebDriver：官方推荐 WebdriverIO + `tauri-plugin-wdio-webdriver`，三平台可用；原 tauri-driver 不支持 macOS [二手 Tauri 文档摘要] | 未核实 | **Playwright 原生、最成熟** |
| 成熟度 / 变动 | 稳定，Electron 44 已发布（Cherry、LobeHub 在用） | 稳定，2.10（2026-02）[二手] | **变动大**：README 现在要装 Hutch CLI、自研运行时，2026-10-07 仍在大改 [源码] | 最低门槛 |
| AI agent 熟悉度 | 高（语料最多） | 中（要写 Rust 胶水） | 低 | 最高 |

### 2.2 要点与坑
- **Linux 是你的主设备之一**（书库路径在 Linux 上），Tauri/Electrobun 默认 WebView 在 Linux 是 WebKitGTK，渲染问题官方文档自己列了一页；做公式 + PDF 局部截图 + 长对话滚动，Chromium 更省心。[文档] v2.tauri.app/develop/debug/linux-graphics（访问日 2026-10-07，经搜索摘要，原页未直接打开 → 半核实）
- Electron 的安全坑：渲染进程只能经 preload 暴露的 API 调主进程（opencode `packages/desktop/AGENTS.md` 明写此规矩）[源码]。
- 本地 Web 方案的坑：没有原生菜单/文件对话框/托盘；浏览器关掉后后台 agent 要靠核心进程自己活着（这其实正好符合“核心不绑界面”）。
- **opencode 的做法值得照抄**：同一个 `packages/app`（前端）既被 `opencode web` 在浏览器里用，也被 Electron 包起来用；Electron 主进程只是起一个 sidecar 服务（带端口 + 密码）再加载前端 [源码] `packages/desktop/src/main/sidecar.ts`、`cli/cmd/web.ts`。

### 2.3 聊天组件库

| 库 | 定位 | 对 Studium 的适配 | 来源 |
| --- | --- | --- | --- |
| **assistant-ui**（@assistant-ui/react 0.15.25） | React 原语库（Thread、ThreadList、BranchPicker、Composer、工具 UI、生成式 UI），可接自定义后端（`ExternalStoreRuntime`：消息存在你自己的 store 里） | 主对话 + 线程列表、选择卡（工具 UI）、分支都有现成原语；**能接自建核心**，不绑 AI SDK | [源码] 仓库 docs，HEAD 2026-10-07 |
| **AI Elements**（Vercel） | 基于 shadcn/ui 的组件，复制进项目；Message/Reasoning 用 streamdown 渲染 | 要求 Next.js + AI SDK + shadcn（README 原文 Prerequisites）；绑定较紧；最后提交 2026-08-21 | [源码] README |
| AI SDK UI（`ai` / `@ai-sdk/react` v6） | `useChat` 等 hook + 流协议 | Cherry、Chatbox、opencode 都依赖 `ai` 6.x；但 Studium 核心自己管会话，前端只需要“订阅事件流”，用 useChat 反而要适配它的消息模型 | [源码] 各 package.json |
| CopilotKit | 面向“在现有 App 里嵌 copilot” | 与 Claude 桌面式独立聊天产品方向不贴，**未深入核实** | 未核实 |

### 2.4 流式 Markdown + 公式渲染

| 方案 | 公式 | 流式下不完整语法 | 坑 | 来源 |
| --- | --- | --- | --- | --- |
| **streamdown 2.7**（Vercel）+ `@streamdown/math` 1.0.3 | remark-math + rehype-katex | 内置 `remend` 预处理：自动补 `$$` 收尾；行内 `$x` → `$x$` 补全需开 `inlineKatex`（默认关）| ① **默认不认单 `$`**，要 `createMathPlugin({singleDollarTextMath:true})`；② 不认 `\(...\)`/`\[...\]`；③ 补全 `$$E = mc^` 后 KaTeX 会把半截公式当错误渲染（errorColor 默认灰色）——流式中途会出现短暂“错误态”，文档没说怎么避免 | [源码] `apps/website/content/docs/plugins/math.mdx`、`packages/remend/README.md`、`packages/streamdown-math/index.ts` |
| react-markdown + remark-math + rehype-katex（Chatbox、Jan 旧路径） | 默认认 `$`、`$$` | 无补全；半截 `$$` 会先显示原文，收尾后跳成公式 | 每个 token 全量重解析，长消息性能差 | [源码] assistant-ui latex 指南 |
| assistant-ui 的 `normalizeMathDelimiters` / `escapeCurrencyDollars` | 把 `\(\)`、`\[\]` 改写成 `$`/`$$`；把“`$`+数字”转义防货币误判 | `useSmooth` 逐字揭示，只对已揭示前缀做预处理，**未闭合分隔符保持原文直到收尾**（不产生错误态） | 可配 react-markdown 或 streamdown | [源码] `apps/docs/content/docs/guides/latex.mdx` |
| markstream-react / markstream-vue | KaTeX，支持 worker 离线程渲染 | 宣称“未闭合代码块、半截公式不闪烁” | 只读到搜索摘要，**未核实** | [二手] markstream-vue-docs.simonhe.me |

**公式流式稳定性的判断**（我的推断，未实测）：
- 没有哪个库能保证“半截公式不闪”，只有两种策略：**补全后硬渲染**（streamdown，会闪错误态）或**未闭合就先显示原文 / 占位**（assistant-ui 预处理思路）。理科教材场景公式密集，后者体验更稳。
- 最稳的组合很可能是：**按块（段落）切分 + 已闭合块缓存不再重渲 + 未闭合公式块显示占位** —— Studium 可自己在 `preprocess` 层做。需要一个小实验用真实 Claude 输出回放验证（见 §6）。
- Claude 输出常见分隔符要实测：若出现 `\(\)` 而界面没做归一化，会直接漏渲染（assistant-ui 文档原话：“Many language models emit math in delimiters that remark-math does not recognize”）。也可以在系统提示里定输出格式，但界面仍应兜底。
- Jan 自己 fork 了 streamdown（`@janhq/streamdown`）——说明原版不完全满足需求，**fork 原因未核实**。

### 2.5 教材截图、引用跳转
- PDF 局部截图：建议**由核心预先裁图存成 PNG 文件**（如 PyMuPDF / pdfium），界面只显示图片。好处：界面无关、可缓存、可被模型读。前端渲染 PDF 用 pdf.js（Cherry、LobeHub、Chatbox 都依赖 `pdfjs-dist`）[源码]，但它走 canvas，在 WebKitGTK 上可能踩 §2.2 的坑（推断）。
- “第 N 行”跳转高亮：opencode 有 `message-id-from-hash.ts`（用 URL hash 定位消息）[源码 文件名]；长对话需要虚拟列表（Cherry 用 `@tanstack/react-virtual`/virtua，Chatbox 用 react-virtuoso）[源码]。**坑**：虚拟列表里目标行未挂载，跳转要先按索引滚到再高亮——选库时就要确认支持 `scrollToIndex`。

---

## 3. 核心 ↔ 界面接口

### 3.1 对比

| 方式 | 谁在用 | 优点 | 坑 |
| --- | --- | --- | --- |
| **本地 HTTP + SSE（服务端推事件）** | opencode：Effect HttpApi，`/event` 用 SSE，15 秒心跳，每订阅者 256 条有界缓冲 [源码 `packages/server/src/handlers/event.ts`] | 浏览器、Electron、CLI、测试脚本都能连；能用 curl/Playwright 直接测；多窗口天然支持 | 必须绑 127.0.0.1 + 随机端口 + 口令（opencode 传 `password`）；SSE 断线重连要能按事件序号补发 |
| WebSocket | Codex app-server 提供 WebSocket 传输 [源码 README] | 双向 | 比 SSE 多一层协议；断线补发同样要自己做 |
| JSON-RPC over stdio | Codex 本地桌面会话、VS Code 扩展 [源码 README；二手 OpenAI 博文] | 无端口暴露、启动即连 | 只能父子进程一对一；浏览器不能直连；多客户端要再加一层 |
| Electron IPC | opencode 只用于原生能力（文件选择、菜单）[源码 AGENTS.md] | 快、无网络面 | **绑死 Electron**，与“核心不绑界面”冲突 |

**取舍要点**：
- Studium 的“多 agent 后台跑 + 界面可关可开 + 以后可能换外壳”≈ opencode 的形态 → 核心作常驻本地服务，HTTP 发命令、SSE 推事件，最贴。
- 事件流最好**和存储的追加日志同构**：每个事件带单调序号，客户端断线后 `GET /events?after=<seq>` 补齐。opencode 的 `event` 表（aggregate_id + seq 唯一索引）就是这个思路 [源码]。

---

## 4. 本地存储

### 4.1 别人怎么存

| 产品 | 正本 | 派生 / 索引 | 改写原文件吗 | 来源 |
| --- | --- | --- | --- | --- |
| Codex | JSONL rollout | SQLite state DB（列表、元数据、日志、记忆） | **会**：`codex migrate-rollouts` 把旧 rollout 规范化成“分页历史”，先写暂存 JSONL → 投影进 SQLite → 校验 → 原子替换，靠 `.pending` 日志保证可恢复 | [源码] `thread-store/src/local/rollout_migration.rs` 头注释 |
| pi | JSONL 树（`id/parentId`） | 内存中重建 | **会**：版本迁移时整文件重写（`_rewriteFile`），v1→v2 给每行补 id | [源码] `session-manager.ts` L1092–1129 |
| Claude Code | JSONL | — | 默认 `cleanupPeriodDays: 30` 启动时**删除**旧会话文件；issue #62959（2026-05-28，v2.1.149，已关“not planned”）报告用户永久丢失 26/38 条 | [源码级 issue] github.com/anthropics/claude-code/issues/62959 |
| opencode | SQLite（WAL），含事件表 | 投影表（session_message 等） | **会**：迁移 `20260604…event_sourced_session_input` 直接 `DELETE FROM event / session_message`（重置 v2 会话状态）| [源码] `packages/core/src/database/migration/` |
| Cherry Studio | better-sqlite3 + drizzle（+ dexie 旧数据） | — | 未细看 | [源码] package.json |

**这张表最重要的信号**：没有一个产品真正做到“原文件永不改写”。行号稳定引用（`文件:行号`）要成立，必须**把“不改写原文件”写成硬规则**——格式升级只能产出新文件 / 派生层，不能就地迁移。

### 4.2 JSONL vs SQLite vs 组合

| 维度 | JSONL 追加 | SQLite（WAL） | JSONL 正本 + SQLite 派生（Codex 式） |
| --- | --- | --- | --- |
| `文件:行号` 稳定引用 | **天然**（前提：不重写、不压缩、不清理） | 没有“行号”，只能用行 id / seq | 正本用行号，SQLite 存 `(file, line) → 偏移` 索引 |
| 保留含思考块的原始消息 | 原样一行 JSON | 存 JSON 文本列也行 | 正本原样 |
| 全文检索（中文） | 只能 grep / 自建索引 | FTS5：默认 unicode61 **搜不到中文词**；`trigram` 能搜 ≥3 字，**2 字及以下 MATCH 返回 0**，只能退回 LIKE 全扫 [实测] Python sqlite 3.45.1 | 派生层建 FTS5，坏了重建 |
| 并发写 | 多进程同文件 `O_APPEND`：本机 ext4 上 8 进程×300 行、单行最大 1MB **未出现交错** [实测]；POSIX 对普通文件不保证，macOS / Windows / 网络盘 / 同步盘**未核实** | 单写者，WAL 下读不阻塞写；多进程写要 busy_timeout | 每个会话文件只由一个写者写（每个 agent 会话一个文件）即可绕开 |
| 崩溃安全 | 末行可能半截 → 读取时要容忍 / 截断尾部残行 | 事务保证 | 正本按 JSONL 规则，SQLite 可整个丢弃重建（Codex 已这么做 [源码 `state_db_recovery.rs`]） |
| 备份 / 跨设备同步 | 纯文本，git / rsync 友好；两台设备往同一文件追加会在 git 里冲突 | 复制时须带 `-wal`/`-shm` 或先 checkpoint；放同步盘有损坏风险（通用经验，**本次未核实** sqlite.org 原文，被代理拦截） | 只同步 JSONL，SQLite 各机重建 |
| 迁移 / 演进 | 只加字段不改旧行即可 | 迁移脚本会改数据（opencode 曾直接清表） | 派生层随便重建 |
| AI 写代码难度 | 最低 | 中（drizzle 等 ORM agent 很熟） | 中 |

### 4.3 坑清单
1. **行号稳定的敌人**：版本迁移重写（pi）、压缩/规范化（Codex）、自动清理（Claude Code）、编辑器“格式化”。→ 正本只追加；任何变换写到新文件；清理默认关闭。
2. **一个会话一个文件、一个写者**：多 agent 并行时最简单的并发方案；跨会话的汇总走派生层。
3. **哈希链审计**：每行带上一行哈希，能发现篡改/截断；但它让“修复半截尾行”变成显式操作。没找到同类产品先例，**价值待定**。
4. **大文件**：几百 MB 的 PDF 和 MinerU markdown 不进 JSONL，只存路径 + 内容哈希。
5. **中文检索**：FTS5 trigram 对 2 字词（“动量”“向量”）失效 [实测]；要么用分词（jieba 预分词后写入 unicode61 表，未实测），要么小数据量直接 grep / LIKE。个人本地规模下 grep 可能就够，**拿不准，需量一下数据规模**。

---

## 5. “代码全由 AI 写、人不看代码”这一维

| 维度 | TypeScript（Node）全栈 + React | Rust（Tauri）+ TS 前端 | Python 核心 + TS 前端 |
| --- | --- | --- | --- |
| 类型系统兜底 | 强（tsc 严格模式），前后端共用类型 | Rust 最强，但胶水层两套类型 | 弱（需 pyright 严格） |
| agent 熟悉度 / 生态 | 最高：assistant-ui、streamdown、AI SDK、Anthropic/OpenAI TS SDK 都一等公民 | 前端同左；Rust 侧 agent 写得慢、编译反馈慢 | 模型 SDK 好；**书库处理已是 Python** |
| UI 自动化测试 | Playwright（浏览器最成熟；Electron 为 experimental） | WebDriverIO + 插件 | 同 TS 前端 |
| 同类先例 | opencode、Cherry、Chatbox、LobeHub | Jan | Open WebUI |

推断：人不看代码时，最重要的是**“出错能被机器自动发现”**——强类型 + 能在无头浏览器里跑的 UI 测试 + 能用 curl 打的核心 API。TS 全栈 + 本地 HTTP 服务 + 浏览器可打开的前端，三样都满足。

---

## 6. 推荐

**第一选择：TypeScript 核心（Node，常驻本地服务，HTTP 命令 + SSE 事件，绑 127.0.0.1 + 口令）+ React/Vite 前端（assistant-ui 原语 + 自定义公式预处理）；第一版外壳 = 浏览器打开本地页面；需要原生体验时再用 Electron 包同一个前端（照 opencode 的 sidecar 做法）。存储 = 每会话一个 JSONL 正本（只追加、永不改写、清理默认关）+ 可丢弃重建的 SQLite 派生层（索引、列表、检索）。**

理由：
1. 核心与界面分离已是 opencode / Codex 的成熟形态，HTTP+SSE 让浏览器、Electron、测试脚本共用一套接口 [源码]。
2. 浏览器外壳迭代最快，Playwright 测试最成熟；后补 Electron 不改前端（opencode 已证明可行）[源码]。
3. Linux 是主设备，Chromium 系渲染避开 WebKitGTK 的已知问题 [文档摘要]。
4. JSONL 正本 + SQLite 派生正是 Codex 的结构，而且 Codex 已有“数据库坏了从 JSONL 重建”的现成做法 [源码]；Studium 只需比它多一条“正本永不改写”。

**备选**：
- **Electron 直接作第一版外壳**（同样架构，只是一开始就打包）：要原生菜单、托盘、开机后台时选它。代价是打包与 Playwright-Electron（experimental）。
- **Tauri 2**：只在体积/内存成为硬需求时考虑；TS 核心要做 sidecar，Linux 渲染风险要实测。
- **不推荐 Electrobun**：2026-10 仍在换 CLI 与运行时，变动太大 [源码 README]。
- 核心若想复用 `书库处理/` 的 Python：可让 Python 只做离线书库处理（裁图、切分），会话核心仍用 TS——**这是取舍点，拿不准，需要你定**。

**需要先跑的小实验**（都未做）：
1. 用真实 Claude Opus/Sonnet 5.5 的理科回答，录下流式分片，离线回放到 streamdown（默认 / 开 inlineKatex）与“未闭合先显示原文”两种预处理，看闪烁与漏渲染（含 `\(\)` 出现频率）。
2. 估算一年对话量（行数、MB），决定中文检索用 grep 还是 FTS5 + 预分词。
3. 在 macOS（若有）上重复 §4.2 的并发追加实测。

---

## 来源（访问日均为 2026-10-07）
- opencode 源码：github.com/sst/opencode（HEAD 2026-10-07 19:19 UTC）
- Codex 源码：github.com/openai/codex（HEAD 2026-10-07 23:19 UTC）；OpenAI “Unlocking the Codex harness”（2026-02，仅搜索摘要）
- pi 源码：github.com/badlogic/pi-mono（HEAD 2026-10-08 00:23 +0200）
- streamdown 源码与文档：github.com/vercel/streamdown（HEAD 2026-10-07，streamdown 2.7.0，@streamdown/math 1.0.3）
- assistant-ui 源码与文档：github.com/assistant-ui/assistant-ui（HEAD 2026-10-07，@assistant-ui/react 0.15.25）
- AI Elements：github.com/vercel/ai-elements（HEAD 2026-08-21）
- Electrobun：github.com/blackboardsh/electrobun（HEAD 2026-10-07）
- Playwright：github.com/microsoft/playwright `docs/src/electron-api/class-electron.md`
- 各项目 package.json：Cherry Studio 2.1.4、Chatbox、LobeHub 2.2.19、Jan、Open WebUI 0.11.4、LibreChat v0.8.8（raw.githubusercontent.com）
- Claude Code issue #62959（2026-05-28）
- Tauri Linux Graphics Issues、Tauri WebDriver 文档（v2.tauri.app，仅搜索摘要）
- markstream-vue/react 文档（仅搜索摘要）
- 实测：本机 Python 3 / SQLite 3.45.1 FTS5 trigram；ext4 上 8 进程 O_APPEND 并发追加
