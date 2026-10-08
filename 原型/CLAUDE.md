# 原型 · 写代码的地图

> 在 `原型/` 里写代码时读这页。产品结论与技术设计不在这里：功能以 `../docs/模块需求设计/` 为准，
> 怎么跑以 `../docs/Harness设计/03-运行设计.md` 为准，选型以 `../docs/Harness设计/04-实现选型.md` 为准。
> 进度看 `里程碑.md`，功能是否做完看 `功能清单.json`（`npm run features`）。

## 规矩（每次都适用）

- 改完跑 `npm run check`（类型 · lint · 格式 · 测试）；不过不算完。Stop hook 也会跑它。
- 程序测试一律用假模型（`src/core/model/fake.ts`），不调真模型。
- 模型 SDK 只能在 `src/core/model/` 的适配器里引用；界面与核心只经 `src/shared/` 相通（`tests/architecture.test.ts` 会查）。
- 正本 JSONL 只追加、永不改写：不写任何改旧行、删行、重排的代码；格式升级只产出新文件或派生层。
- `tests/验收/` 里已有的测试不许改（hook 会拦）；新功能先在 `功能清单.json` 加一条、新建验收测试，初始是失败的。
- 不写空 catch、不吞异常；确实要忽略的写明理由。
- 测试改动单独提交；CI 会列出删改了哪些断言。
- 不做：覆盖率门槛、模型原文快照测试、界面截图检查。

## 目录

| 路径                  | 内容                                                                                                            |
| --------------------- | --------------------------------------------------------------------------------------------------------------- |
| `src/shared/`         | 正本记录类型（`records.ts`）与核心↔界面协议（`protocol.ts`）                                                    |
| `src/core/log/`       | 正本读写（`session-log.ts`，一个写者、只追加、fsync）与数据目录锁                                               |
| `src/core/model/`     | 模型接口 `port.ts` + 适配器：`claude-agent-sdk.ts`（真模型）、`fake.ts`（假模型）                               |
| `src/core/hub.ts`     | 会话管理：一次一轮、事件推送、重启后按正本里的续接凭据接上                                                      |
| `src/core/studium.ts` | 事件串联：主对话、畅谈、M05 选择卡、闭环对话、守卫、写 M09、下一张卡、M15 / M10 后台；各会话的工具              |
| `src/core/knowledge/` | 读 M07 原文（`m07.ts`）、M08 点与子句（`m08.ts`）；M09 形成记录、M10 教法记录、M15 状态（各一个只追加的存放处） |
| `src/core/tape/`      | 真实运行录带（`recorder.ts`）与离线回放（`replay.ts`、`cli.ts`）；编号换成稳定记号（`ids.ts`）                  |
| `src/core/http/`      | 本地服务：只绑 127.0.0.1、口令、HTTP 命令 + SSE 事件、托管构建好的界面                                          |
| `src/core/prompts/`   | 系统提示：`main` `talk` `loop` `guard` `m09` `m05` `m15` `m10`（只写定义、边界、输出格式）                      |
| `样例/`               | 没有真书时用的小样例：一本自写力学入门（M07 格式）+ 10 个知识点 / 9 条条款（M08）                               |
| `src/ui/`             | 浏览器界面：React + Vite + assistant-ui；`thread-model.ts` 是可单测的纯转换                                     |
| `tests/`              | 依赖方向测试、`验收/`（只经 HTTP 验功能）、`helpers/`                                                           |
| `e2e/`                | Playwright 功能主路径（`npm run e2e`，假模型）                                                                  |
| `evals/`              | 行为评测目录：模拟学生多轮、每个失败模式一个判定、k 次全过（不进门禁；学生与判分经模型接口，现只接假模型）      |
| `scripts/`            | 检查命令、lint 一行格式、hooks、CI 用的测试改动报告、功能清单                                                   |

## 命令

| 命令                            | 做什么                                                                                                |
| ------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `npm start`                     | 构建界面并启动核心；终端打印带口令的地址，浏览器打开它                                                |
| `npm run dev`                   | 只起核心（改代码自动重启）；界面另开 `npx vite`                                                       |
| `npm run check`                 | 类型 · lint · 格式 · 测试，CI 跑同一条                                                                |
| `npm run e2e`                   | 浏览器主路径；浏览器版本对不上时加 `PW_CHROMIUM_PATH=<chromium>`（云端：`/opt/pw-browsers/chromium`） |
| `npm run features`              | 跑验收测试，刷新 `功能清单.json` 的状态                                                               |
| `npm run replay -- <录带>`      | 在临时空目录里只凭录带回放、不调模型，列出与录带不一致之处                                            |
| `npm run eval [-- --k 3]`       | 跑行为评测目录（假模型），k 次全过才算过                                                              |
| `npm run review [-- --dry-run]` | 独立审查：全新上下文、换模型（默认 Sonnet）、只读，只报正确性与需求缺口                               |

环境变量：`STUDIUM_MODEL=claude|fake`（默认 claude）· `STUDIUM_CLAUDE_MODEL` · `STUDIUM_DATA`（默认 `原型/var/`）· `STUDIUM_PORT`（默认 4317）· `STUDIUM_TOKEN` · `STUDIUM_LIBRARY`（书库根目录，默认 `样例/书库`）· `STUDIUM_M08`（M08 产出目录，默认复制 `样例/m08`）· `STUDIUM_TAPE`（录带文件；录的时候配一个新的空 `STUDIUM_DATA`）。

工具名和参数名只能用英文（中文会被接口拒绝）；给模型看的说明可以用中文。

## 真模型

走产品负责人本机的 Claude 订阅：本机先用 `claude` 登录一次，再 `npm start`。Agent SDK 的内置工具全关、
不读 CLAUDE.md 与设置（`settingSources: []`）、系统提示用我们自己的。它自己的会话文件存在 `~/.claude/projects/`
下以数据目录命名的文件夹里，只作续接用；我们的正本是 `var/sessions/*.jsonl`。

## 正本记录

每个会话一个 `var/sessions/<会话 id>.jsonl`，一行一条，行号 = 引用地址。类型见 `src/shared/records.ts`：
`session_opened` · `user_message` · `assistant_message` · `model_raw`（适配层吐出的原始消息，含思考块）·
`model_session`（续接凭据）· `turn_failed` · `program_fact` · `tool_call` · 闭环相关（`loop_note` `close_requested` `guard_verdict` `loop_ended` `after_loop_step`）· `project_goal` `project_title`（项目名随方向变，开头那行不改）· `task_opened` `talk_ended`（畅谈）· `conversation_pointer` · `choice_card` `choice_made`。加类型只能加，不改旧字段的意思。

## 本机试用

1. `cd 原型 && npm ci`；本机 `claude` 登录过一次。
2. `npm start`，打开终端打印的地址。
3. 主对话里说想学什么 → 点“单独谈谈你想学什么”进畅谈、谈定后项目改名 → 回项目点“下一步学什么” → 选一项开闭环 → 学（模型答到一半也能插话）→ “我觉得懂了”（守卫判）→ “学完了” → 自动写 M09、出下一张卡；M15 / M10 在后台。
4. 用真书：`STUDIUM_LIBRARY=<书库根> STUDIUM_M08=<M08 产出目录> npm start`。数据在 `var/`，删掉即重来。
