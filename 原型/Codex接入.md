# Codex 接入（试验中）

Studium 可以经本机 Codex app-server 使用 GPT。当前按 `codex-cli 0.166.0` 的协议实现，仍由 Codex 管模型调用、工具循环与上下文压缩。

## 启用与界面

1. 安装 Codex CLI（本次按 `0.166.0` 接口实现），更新代码并重启 Studium 后，左下设置打开“内核与连接”。
2. 选择 Claude Agent SDK 或 Codex app-server。选择保存到数据目录的 `model-settings.json`，各对话从下一轮使用新内核，当前回复继续完成。
3. Codex 可在设置里发起设备码登录、取消登录或退出；登录文件使用本机 `CODEX_HOME`（默认 `~/.codex`）的文件存储，和执行会话一致。Claude 显示本机登录状态、退出入口和 `claude auth login` 的操作说明；登录仍需在运行核心的电脑终端完成。
4. 主对话和学习对话的输入区显示当前实际模型，提供模型与思考强度选择，查看当前登录账号的额度，以及最近一轮上下文用量 / 服务报告的上限。模型、强度按对话和内核分别保存；修改下一轮生效，恢复默认只清除当前对话、当前内核的覆盖。
5. 模型目录来自 SDK / app-server 的控制接口；查询账号、模型目录和额度不发送模型输入。没报告上下文上限时只显示用量，不填一个推测上限；额度显示获取时间，失败显示暂未获取。

`STUDIUM_MODEL_ADAPTER=claude|codex` 只决定没有保存设置时的初始内核；已有界面设置优先。`STUDIUM_CODEX_MODEL` 与 `STUDIUM_CLAUDE_MODEL` 是各内核的默认模型，`STUDIUM_CODEX_BIN` 可指定 Codex 可执行文件。`STUDIUM_PROFILES` 继续按会话类覆盖，但只作用于环境变量 `STUDIUM_MODEL_ADAPTER` 指定的那一内核（未指定则 Claude），避免重启或界面切换后把 Claude 别名带给 Codex。对话内手动选择优先于上述默认配置。

无新增 npm 依赖、无正本格式迁移。`model_used.selection` 与 `context_used.limit` 为可选字段，旧数据仍可读。每个模型对话使用一个 app-server 子进程，设置另外按需建立只做账号控制的进程；服务关闭时清理。版本升级涉及实验接口，先核对协议再升级。

## API URL + Key（试验中）

在设置的“内核与连接”中，为 Claude / Codex 分别选择“账号登录”或“API URL + Key”。API 方式填基础地址与 Key 后保存即可，不需要再登录订阅账号；下一轮生效。

- Claude：Anthropic Messages 兼容接口，官方基础地址为 `https://api.anthropic.com`。输入末尾的 `/v1` 会去掉，由 SDK 补 `/v1/messages`。
- Codex：OpenAI Responses 兼容接口，官方基础地址为 `https://api.openai.com/v1`。只有 Chat Completions 的接口不能直接用于 Codex app-server。
- 地址填写基础 URL，不包含 `/messages`、`/responses` 或 `/chat/completions`；可使用兼容网关自己的路径前缀。
- 模型仍在对话内选择：通过 API 的 models 接口读取目录，目录不可用时可以手填准确模型 ID。第一次选择也作为此内核、此地址下新对话的默认模型，让新开的学习与导入会话可继续工作；已有对话的单独选择仍保留。API 强度默认自动，实际支持由服务决定。
- 配置保存不代表远端鉴权已验证；模型目录与实际请求的失败会分别显示。API 余额没有通用查询接口，去服务商处查看。
- Key 单独存在数据目录的 `model-connections.json`，文件权限 `0600`；设置接口只返回“已保存”，不返回 Key。Key 留空保留原值，更换地址要重填对应 Key；“清除 API 配置”删除保存的 Key 并切回账号登录。
- Claude 通过子进程环境传入 `ANTHROPIC_BASE_URL` / `ANTHROPIC_API_KEY`；Codex 使用自定义 provider、`wire_api=responses` 和环境密钥。密钥不放命令行、会话配置或录带；Codex 的命令工具环境排除此密钥。
- 账号登录与 API 地址各自保留模型选择。换连接类型或 API 地址时，正本的可选 `connection` 标识阻止续接另一服务的线程，从原对话记录重新交接。正在执行的一轮继续使用原配置。

本次只运行 `npm run check`，未使用真实 Key 请求模型，兼容网关的实际工具、图像与强度支持待使用反馈。Codex 配置依据 [OpenAI Docs 配置参考](https://developers.openai.com/codex/config-reference/) 的 `model_providers`、`base_url`、`env_key`、`requires_openai_auth` 与 `wire_api`。

## 会话与记录

| 项目         | 实现                                                                                                                         |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| 工具         | 开线程时通过实验接口 `dynamicTools` 挂上现有 `ToolSpec`；调用前用原 Zod 定义校验，结果回给 Codex；重复的同一调用 ID 复用结果 |
| 同服务续接   | 正本 `model_session` 保存 thread ID 与累计用量；同一个对话重启后走 `thread/resume`                                           |
| 换服务       | 不复用另一家服务的凭据，也不回到切换前的旧凭据；从正本附上历史对话与开场附件，另起模型侧会话；正本行号不变                   |
| 询问别的项目 | `thread/fork` + `ephemeral`，继承上下文但回调只允许本次传入的读工具；不写回源线程                                            |
| 停止         | `turn/interrupt`；请求失败或迟迟没有结束通知就关闭该进程，下一轮按已存凭据重接                                               |
| 图片         | 上传的图片以 data URL 发送，不额外把 base64 写入 `model_raw`                                                                 |
| 文字         | 增量沿用现有 SSE；Codex 明确给出 commentary / partial_answer / final_answer 时据此区分中途说明与回答                         |
| 用量         | `context_used.parts` 保存本轮归一后的输入、缓存与输出；推理输出已含在输出中，不重复相加；旧 Claude 记录仍按原算法读          |
| 额度         | 从 `account/rateLimits/read` 与更新通知读取；拿不到时保留上次值，不阻断对话                                                  |
| 上下文导出   | `npm run context` 能展示 Codex 完整 item 与服务事件；这是 app-server 可见内容，不声称是完整底层 API 请求或隐藏推理           |

## 执行环境

- Codex 会话及配置使用 `<数据>/codex-runtime/`，只链接本机 `CODEX_HOME`（默认 `~/.codex`）中的 `auth.json`，不读取或复制凭据内容。令牌刷新仍由 Codex 自己管理。
- 模型执行会话不加载日常 Codex 的用户配置、项目指令、skills、插件、hooks、记忆或子代理。系统提示来自 Studium。账号控制进程用原登录目录，不创建线程、不发模型输入。
- 主对话关闭命令和本机看图能力，文件权限为不可读写；业务工具由 Studium 在宿主执行。
- 学习与导入会话按 `SandboxSpec` 开工作区写权限、资料只读权限与禁止读取的路径。命令不联网；学习会话单独开放 Codex 内置联网搜索与网页读取。
- 业务密钥及外层 agent 的会话环境变量不传入 app-server；命令只继承核心环境变量。

## 实现位置与验证边界

`src/core/model/api-connection.ts` 管 API 凭据与目录，`settings.ts` 管持久选择，`accounts.ts` 管账号控制，`http/model-routes.ts` 接界面接口；`src/core/model/codex-app-server.ts` 管会话；`codex-rpc.ts` 管 stdio 与子进程；`codex-config.ts` 管配置与登录链接；`codex-protocol.ts` 校验协议字段；`codex-events.ts` 转换动作。

开发检查为 `npm run check`。本次另用 CLI 的 `--print-startup-config` 校验主对话 / 学习对话的配置可解析，没有发模型请求。按项目规矩不写假模型测试、不另起服务、不跑真模型；真实会话与教学表现仍待日常使用反馈。

依据：[官方 app-server 文档](https://developers.openai.com/codex/app-server/)、[官方配置说明](https://developers.openai.com/codex/config-reference/)，以及本机 `codex app-server generate-json-schema --experimental` 生成的 0.166.0 协议。
