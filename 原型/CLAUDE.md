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

| 路径                | 内容                                                                              |
| ------------------- | --------------------------------------------------------------------------------- |
| `src/shared/`       | 正本记录类型（`records.ts`）与核心↔界面协议（`protocol.ts`）                      |
| `src/core/log/`     | 正本读写（`session-log.ts`，一个写者、只追加、fsync）与数据目录锁                 |
| `src/core/model/`   | 模型接口 `port.ts` + 适配器：`claude-agent-sdk.ts`（真模型）、`fake.ts`（假模型） |
| `src/core/hub.ts`   | 会话管理：一次一轮、事件推送、重启后按正本里的续接凭据接上                        |
| `src/core/http/`    | 本地服务：只绑 127.0.0.1、口令、HTTP 命令 + SSE 事件、托管构建好的界面            |
| `src/core/prompts/` | 系统提示（只写定义、边界、输出格式）                                              |
| `src/ui/`           | 浏览器界面：React + Vite + assistant-ui；`thread-model.ts` 是可单测的纯转换       |
| `tests/`            | 依赖方向测试、`验收/`（只经 HTTP 验功能）、`helpers/`                             |
| `e2e/`              | Playwright 功能主路径（`npm run e2e`，假模型）                                    |
| `scripts/`          | 检查命令、lint 一行格式、hooks、CI 用的测试改动报告、功能清单                     |

## 命令

| 命令               | 做什么                                                                  |
| ------------------ | ----------------------------------------------------------------------- |
| `npm start`        | 构建界面并启动核心；终端打印带口令的地址，浏览器打开它                  |
| `npm run dev`      | 只起核心（改代码自动重启）；界面另开 `npx vite`                         |
| `npm run check`    | 类型 · lint · 格式 · 测试，CI 跑同一条                                  |
| `npm run e2e`      | 浏览器主路径；云端容器里加 `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium` |
| `npm run features` | 跑验收测试，刷新 `功能清单.json` 的状态                                 |

环境变量：`STUDIUM_MODEL=claude|fake`（默认 claude）· `STUDIUM_CLAUDE_MODEL` · `STUDIUM_DATA`（默认 `原型/var/`）· `STUDIUM_PORT`（默认 4317）· `STUDIUM_TOKEN`。

## 真模型

走产品负责人本机的 Claude 订阅：本机先用 `claude` 登录一次，再 `npm start`。Agent SDK 的内置工具全关、
不读 CLAUDE.md 与设置（`settingSources: []`）、系统提示用我们自己的。它自己的会话文件存在 `~/.claude/projects/`
下以数据目录命名的文件夹里，只作续接用；我们的正本是 `var/sessions/*.jsonl`。

## 正本记录

每个会话一个 `var/sessions/<会话 id>.jsonl`，一行一条，行号 = 引用地址。类型见 `src/shared/records.ts`：
`session_opened` · `user_message` · `assistant_message` · `model_raw`（适配层吐出的原始消息，含思考块）·
`model_session`（续接凭据）· `turn_failed`。加类型只能加，不改旧字段的意思。
