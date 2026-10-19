# 原型 · 写代码的地图

> 在 `原型/` 里写代码时读这页。产品结论与技术设计不在这里：设计以 `../docs/设计/` 为准（会话怎么跑看 `会话/`，
> 存什么看 `记录/`），选型以 `../docs/设计/实现选型.md` 为准。
> 进度看 `工单/README.md` 与 `工单/进度/`；功能是否做完看 `功能清单.json`（`npm run features`）。

## 规矩（每次都适用）

- 改完跑 `npm run check`（类型 · lint · 格式 · 测试）；不过不算完。Stop hook 也会跑它。
- 程序测试一律用假模型（`src/core/model/fake.ts`），不调真模型。
- 模型 SDK 只能在 `src/core/model/` 的适配器里引用；界面与核心只经 `src/shared/` 相通（`tests/architecture.test.ts` 会查）。
- 正本 JSONL 只追加、永不改写：不写任何改旧行、删行、重排的代码；格式升级只产出新文件或派生层。
- `tests/验收/` 里已有的测试不许改（hook 会拦）；新功能先在 `功能清单.json` 加一条、新建验收测试，初始是失败的。
- 不写空 catch、不吞异常；确实要忽略的写明理由。
- 测试改动单独提交；CI 会列出删改了哪些断言。
- 不做：覆盖率门槛、模型原文快照测试、界面截图检查。

## 会话种类

| 种类       | 日常叫法     | 提示词        | 何时开                             |
| ---------- | ------------ | ------------- | ---------------------------------- |
| `main`     | 主对话       | `main.md`     | 一个项目一条，学习者在这里说话     |
| `talk`     | 畅谈         | `talk.md`     | 谈方向，或阶段复盘（主对话里点开） |
| `loop`     | 学习对话     | `loop.md`     | 选卡后开；在沙盒里跑，只有两个命令 |
| `guard`    | 守卫         | `guard.md`    | 学习者申请收口时开，判这次学会没有 |
| `nav`      | 导航         | `nav.md`      | 要下一步 / 上次结束后出选择卡      |
| `state`    | 状态整理     | `state.md`    | 一段学习结束、隔很久回来时在后台跑 |
| `pedagogy` | 教法记录整理 | `pedagogy.md` | 一次学习结束后在后台跑             |
| `retrieve` | 检索子代理   | `retrieve.md` | 导航答不了细节时派出去找证据       |
| `output`   | 写产出       | `output.md`   | 主对话里开“写产出”对话             |

种类名单在 `src/shared/records.ts` 的 `CONVERSATION_KINDS`（提示词装载、`STUDIUM_PROFILES` 的可用键都从它取）。

## 目录

| 路径                                                                                    | 内容                                                                                                                                                                                                                                                 |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/shared/`                                                                           | 正本记录类型（`records.ts` `records-longterm.ts` `records-cross.ts`）、核心↔界面协议（`protocol.ts` `protocol-learned.ts` `protocol-longterm.ts` `protocol-cross.ts`）、出处标记（`citation.ts`）、知识产出类型（`output.ts`）、左栏（`sidebar.ts`） |
| `src/core/log/`                                                                         | 正本读写（`session-log.ts`，一个写者、只追加、fsync）与数据目录锁、数据版本（`data-dir.ts`）                                                                                                                                                         |
| `src/core/model/`                                                                       | 模型接口 `port.ts` + 适配器：`claude-agent-sdk.ts`（真模型）、`fake.ts`（假模型）；`profiles.ts`（按会话类配模型与强度）、`sandbox-paths.ts`（沙盒里的路径）                                                                                         |
| `src/core/main.ts` `app.ts`                                                             | `main.ts` 读环境变量起服务；`app.ts` 组装核心：数据目录锁 → 派生索引 → 知识层 → Studium + Hub → 本地服务（main 与验收测试都从这里起）                                                                                                                |
| `src/core/hub.ts`                                                                       | 会话管理：一次一轮、事件推送、重启后按正本里的续接凭据接上                                                                                                                                                                                           |
| `src/core/studium.ts`                                                                   | 事件串联：主对话、畅谈、导航、学习对话、守卫、状态整理、教法记录整理；各会话的工具                                                                                                                                                                   |
| `src/core/sandbox.ts`                                                                   | 学习对话与检索子代理的沙盒（工作区 + 只读区、每轮刷新只读的渲染文件）                                                                                                                                                                                |
| `src/core/learned.ts`                                                                   | 学过的记录（按层读每次学习）与外部导入存放处                                                                                                                                                                                                         |
| `src/core/evidence.ts`                                                                  | 依据可见的只读视图（守卫判定与原文、单子与出处、教法记录 / 状态记录、外发披露）                                                                                                                                                                      |
| `src/core/sources.ts`                                                                   | 原文与出处的视图与服务（资料浏览、全文检索、原件页面、教材出处核对、资料报错）                                                                                                                                                                       |
| `src/core/outputs.ts`                                                                   | 知识产出：产出物与版本链、引用核对、相关文献、方法比较、“写产出”对话的工具                                                                                                                                                                           |
| `src/core/longterm.ts`                                                                  | 长期功能：复习 / 复检、阶段复盘、提醒与今天该做的                                                                                                                                                                                                    |
| `src/core/ticket.ts` `transcript.ts` `locate.ts` `lookback.ts` `sidebar.ts` `inputs.ts` | 单子的现读（现在的这张、改过几次）、对话原文渲染（带行号）、依据的定位（`会话 id:行号` / `书:行号`）、状态回看时间轴、左栏操作存放处、输入（附图原样存进 `<数据>/inputs/`，经模型接口转写）                                                          |
| `src/core/loop-state.ts` `route-deviations.ts` `crosslinks.ts` `diff.ts` `goal.ts`      | 一次学习的状态、路线偏差现算、跨资料线索、逐行差异（产出物比较）、方向目标的读                                                                                                                                                                       |
| `src/core/index/`                                                                       | 派生索引（SQLite：会话列表、检索）；删掉可从正本重建                                                                                                                                                                                                 |
| `src/core/knowledge/`                                                                   | 存放处：`library.ts`（书库切分结果的读与检索）· `originals.ts`（原件页面）· `notes.ts`（个人笔记）· `source-reports.ts`（资料报错）· `source-notes.ts`（来源说明）· `state.ts` · `pedagogy.ts` · `output.ts` · `objections.ts` · `jsonl.ts`          |
| `src/core/http/`                                                                        | 本地服务：只绑 127.0.0.1、口令、HTTP 命令 + SSE 事件、托管构建好的界面                                                                                                                                                                               |
| `src/core/tape/`                                                                        | 真实运行录带（`recorder.ts`）与离线回放（`replay.ts`、`cli.ts`）；编号换成稳定记号（`ids.ts`）                                                                                                                                                       |
| `src/core/prompts/`                                                                     | 系统提示：`main` `talk` `loop` `guard` `nav` `state` `pedagogy` `retrieve` `output` `evidence`（接在守卫与学习对话后面）`transcribe`（图片转写）                                                                                                     |
| `src/ui/`                                                                               | 浏览器界面：React + Vite + assistant-ui；`thread-model.ts` 是可单测的纯转换                                                                                                                                                                          |
| `dist/`                                                                                 | 构建出来的界面（`npm start` 生成；不进 git）                                                                                                                                                                                                         |
| `教学工具/`                                                                             | 官方教学工具（教法记录里的通用策略知识层，agent 起草）：一份一个 Markdown，格式见其 README；核心 `src/core/teaching-tools.ts` 装载（学习者自己的在 `<数据>/teaching-tools/`）                                                                        |
| `样例/`                                                                                 | 没有真书时用的小样例：一本自写力学入门                                                                                                                                                                                                               |
| `tests/`                                                                                | 依赖方向测试、`验收/`（只经 HTTP 验功能）、`helpers/`                                                                                                                                                                                                |
| `e2e/`                                                                                  | Playwright 功能主路径（`npm run e2e`，假模型）                                                                                                                                                                                                       |
| `evals/`                                                                                | 行为评测（假模型，不进门禁）与 `chain/` 链路评测（真模型 `npm run eval:real`；录带在 `tapes/`、不进 git，报告在 `reports/`）                                                                                                                         |
| `scripts/`                                                                              | 检查命令、lint 一行格式、hooks、CI 用的测试改动报告、功能清单                                                                                                                                                                                        |
| `工单/`                                                                                 | 原型改造工单与施工进度（`README.md`、`W1`–`W7`、`进度/`）                                                                                                                                                                                            |

## 正本记录

每个会话一个 `var/sessions/<会话 id>.jsonl`，一行一条，行号 = 引用地址。类型见 `src/shared/records.ts`：
`session_opened`（含单子 `ticket`）· `user_message`（异议带 `objection`，附图带 `images`）· `assistant_message` ·
`model_raw`（适配层吐出的原始消息，含思考块）· `model_session`（续接凭据）· `model_used` · `turn_failed` ·
`program_fact` · `tool_call` · `sandbox_action`（沙盒里的读 / 写 / 跑命令；`tag` 由程序按路径打：`诊断`、`教学工具:<文件名>`）·
`close_requested` `guard_verdict`（含 `understanding` 与这一轮实际执行的 `model`）`loop_ended` `after_loop_step`
（搁置与恢复 `loop_shelved` `loop_resumed`）· `ticket_edited` ·
`project_goal` `project_title`（项目名随方向变，开头那行不改）· `turn_context`（主对话每轮从记录重建的开场，`forLine` 指那轮输入的行）·
`task_opened` `talk_ended`（畅谈）· `conversation_pointer` · `project_material` `project_deadline`（项目资料与期限）·
`choice_card` `choice_made` `route_decision`（路线决定，理由必标行号）·
长期功能（`reminder_added` `reminder_closed`；`session_opened.resumeOf` `review`、`Ticket.revisit` `returnTo` `resumeOf` `stageCheck`）。
加类型只能加，不改旧字段的意思。

## 存放处

| 路径（都在 `<数据>` = `STUDIUM_DATA`，默认 `原型/var/` 下）        | 内容                                                                            |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| `sessions/<会话 id>.jsonl`                                         | 正本                                                                            |
| `learned/imports.jsonl`                                            | 外部导入（畅谈、笔记两个渠道）                                                  |
| `knowledge/state/` `pedagogy/` `output/`                           | 状态记录、教法记录、产出物与版本链（各一个只追加的存放处）                      |
| `knowledge/notes/` `objections/` `source-reports/` `source-notes/` | 个人笔记的切分结果、学习者异议、资料报错、来源说明                              |
| `sandbox/<学习 id>/工作区` `sandbox/<学习 id>/只读`                | 学习对话与检索子代理的沙盒                                                      |
| `inputs/` `teaching-tools/` `ui/sidebar.jsonl` `cache/pages/`      | 附图原样、学习者自己的教学工具、左栏操作、原件页面渲染缓存                      |
| `index.sqlite`                                                     | 派生索引（删掉可从正本重建）                                                    |
| `data-version`                                                     | 数据目录版本，值是 `3`；旧目录（值 2 或没有这个文件）启动报错，删掉 `var/` 重来 |

## 命令

| 命令                                                             | 做什么                                                                                                |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `npm start`                                                      | 构建界面并启动核心；终端打印带口令的地址，浏览器打开它                                                |
| `npm run dev`                                                    | 只起核心（改代码自动重启）；界面另开 `npx vite`                                                       |
| `npm run check`                                                  | 类型 · lint · 格式 · 测试，CI 跑同一条                                                                |
| `npm run e2e`                                                    | 浏览器主路径；浏览器版本对不上时加 `PW_CHROMIUM_PATH=<chromium>`（云端：`/opt/pw-browsers/chromium`） |
| `npm run features`                                               | 跑被引用的测试，刷新 `功能清单.json` 的状态                                                           |
| `npm run features -- --check`                                    | 只核对功能清单（字段、id、验证指向的文件 / 命令），不跑测试                                           |
| `npm run replay -- <录带>`                                       | 在临时空目录里只凭录带回放、不调模型，列出与录带不一致之处                                            |
| `npm run eval [-- --k 3]`                                        | 跑行为评测目录（假模型），k 次全过才算过                                                              |
| `npm run eval:real [-- --k 1 --students 全懂,半懂 --parallel 2]` | 链路评测：真模型带模拟学生走完整链路，录带 + 报告（花订阅额度；不碰 4317 与 `var/`）                  |
| `npm run review [-- --dry-run]`                                  | 独立审查：全新上下文、换模型（默认 Sonnet）、只读，只报正确性与需求缺口                               |

环境变量：`STUDIUM_MODEL=claude|fake`（默认 claude）· `STUDIUM_CLAUDE_MODEL`（全局默认模型）·
`STUDIUM_PROFILES`（按会话类覆盖模型 / 强度的 JSON，可用键同会话种类，如 `{"loop":{"effort":"max"},"nav":{"effort":"high"}}`；
默认见 `src/core/model/profiles.ts`）· `STUDIUM_DATA`（默认 `原型/var/`）· `STUDIUM_PORT`（默认 4317）· `STUDIUM_TOKEN` ·
`STUDIUM_LIBRARY`（书库根目录，默认 `样例/书库`）· `STUDIUM_TAPE`（录带文件；录的时候配一个新的空 `STUDIUM_DATA`）。

工具名和参数名只能用英文（中文会被接口拒绝）；给模型看的说明可以用中文。

## 真模型

走产品负责人本机的 Claude 订阅：本机先用 `claude` 登录一次，再 `npm start`。Agent SDK 不读 CLAUDE.md 与设置
（`settingSources: []`）、系统提示用我们自己的。学习对话与检索子代理开六个内置工具（通用读写、搜索、命令）并套沙盒；
畅谈与导航放开 WebSearch / WebFetch（其余会话不开，也没有会话同时带沙盒与联网搜索）。它自己的会话文件存在
`~/.claude/projects/` 下以数据目录命名的文件夹里，只作续接用；我们的正本是 `var/sessions/*.jsonl`。

## 本机试用

1. `cd 原型 && npm ci`；本机 `claude` 登录过一次。
2. `npm start`，打开终端打印的地址。
3. 主对话里说想学什么 → 点“单独谈谈你想学什么”进畅谈、谈定后项目改名 → 回项目点“下一步学什么” →
   选一项开学习 → 学（模型的工作区在 `var/sandbox/<学习 id>/工作区/`，诊断写在 `诊断.md`）→ “我觉得懂了”（守卫判）→
   “学完了” → 导航出下一张卡；状态整理、教法记录整理在后台。
4. 用真书：`STUDIUM_LIBRARY=<书库根> npm start`。数据在 `var/`，删掉即重来。
