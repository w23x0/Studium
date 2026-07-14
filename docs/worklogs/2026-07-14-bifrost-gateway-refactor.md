# 2026-07-14：Bifrost 网关与调用审计重构记录

## 记录范围

本记录覆盖 Studium 在 M1 期间把活动 LLM 网关从 LiteLLM 重构为 Bifrost，并建立网关无关调用层和无正文审计的工作。它只记录本次实际完成的修改与验证；本地 sidecar、loopback、拒绝路径、自动化、生产构建与依赖审计已经通过，正确虚拟 key、真实供应商链路、真实 metadata 和两轮浏览器对话仍明确列为待完成。

旧的 `2026-07-14-m0-m1-baseline.md` 保持不变，因为其中 LiteLLM 基线是当时实际发生的历史事实。架构取代关系由 ADR 0002 和 ADR 0003 表达。

## 开始时的状态

- 浏览器通过同源 `POST /api/chat` 调用 Next.js Route Handler，公共响应是 assistant 消息和 `requestId`。
- 服务端通过单个 `src/lib/gateway.ts` 调用 LiteLLM 的 OpenAI-compatible Chat Completions 接口，成功结果只保留回答字符串。
- LiteLLM 1.92.0 由 uv 和 Python 3.13 管理，运行文件位于 `infra/litellm/`。
- 已有请求校验、固定 system message、超时、基础错误映射和 18 项自动化测试，但没有 `callId`、`attemptId`、resolved provider/model、token、成本或本地调用审计。
- 没有真实 provider key，也没有完成真实模型端到端验收。

## 已完成：网关复审与制品锁定

- 复核 Bifrost、Inference Gateway 和 LiteLLM 的运行边界后，选择 Bifrost HTTP Transport `v1.6.3` 作为新的唯一活动网关。
- 核对固定 tag 对应 commit `df1644338ad98216cffa78231b6ca19e8e42e8f2`。
- 确认该版本 GitHub release 没有附带二进制 asset 或 checksum；官方 npx wrapper 从 `downloads.getmaxim.ai` 下载按版本和平台区分的二进制。
- 实际完整下载 Windows amd64 文件并核对：

  ```text
  URL: https://downloads.getmaxim.ai/bifrost/v1.6.3/windows/amd64/bifrost-http.exe
  Size: 113897984 bytes
  SHA-256: d1371e06757992c1cbad4a42b619c8763f1ec214b19bd2b6dcb46e9ab1ac2707
  ```

- 确认该 EXE 没有上游 checksum 文件或 Authenticode 签名，因此仓库中的摘要是 Studium 自建的完整性锁，不表述为上游签名。
- 新增 `infra/bifrost/runtime-lock.json` 记录版本、release 来源、官方 URL、字节数和 SHA-256；二进制本体不进入 Git。

## 已完成：Studium LLM 调用层

删除原先聚合全部职责的 `src/lib/gateway.ts`，建立 `src/lib/llm/`：

- `contract.ts`：定义网关无关请求、响应、usage、cost、调用 trace 和 attempt trace。
- `config.ts`：校验固定 loopback URL、端口、OpenAI-compatible 路径、虚拟 key、`studium-openai/studium-m1` 路由、超时和审计目录；拒绝远程地址、`localhost`、URL 内凭据和示例占位值。
- `service.ts`：持有 system message，生成 `callId` 与 `attemptId`，编排一次网关调用并写入审计。
- `bifrost-client.ts`：只调用固定的 `/openai/v1/chat/completions`，传递关联 ID，显式发送 `store: false`，限制错误和成功响应体大小，并支持请求取消和模型超时。
- `response-parser.ts`：校验非空回答，从成功正文或失败 envelope 提取 metadata，并支持 Bifrost 的 `usage.cost.total_cost`、`extra_fields.routing_info` 与 `extra_fields.latency`。`x-request-id` 作为 provider request ID，不读取缺少依据的 gateway-request 或 cost header。
- `errors.ts`：区分配置、网关连接、网关鉴权、供应商请求和响应解析阶段，并把第三方失败转换成稳定公开错误。
- `audit.ts`：按日期追加版本化 JSONL 调用 trace。

身份边界已实现为：一次 HTTP 请求一个 `requestId`，一次逻辑模型调用一个 `callId`，一次真实上游尝试一个 `attemptId`。M1 禁用 retry 和 fallback，因此每条逻辑调用当前只有一个 attempt。

## 已完成：无正文审计

- 默认审计目录为 `var/audit/llm-calls/`，每天一个 JSONL 文件；`var/` 已被 Git 忽略。
- 每条记录包含调用状态、时间、延迟、消息数量和字符数、requested model，以及单次 attempt 的可用 provider/model、ID、token、cost 和安全错误元数据。
- 记录不包含 user/assistant/system 正文、完整 envelope、Authorization、API key、原始第三方错误正文或异常 cause。
- 同一进程内的并发写入通过队列串行化；单次写入失败后，后续写入仍可继续。
- 审计失败不会把成功回答改为失败，也不会遮蔽原始模型失败；只输出不含底层错误正文的运维警告。

## 已完成：公共契约与错误语义

- `/api/chat` 的成功响应保持 `{ message, requestId }`，内部 trace 不返回浏览器。
- 浏览器仍不能提交 system message、provider、model、网关地址或密钥。
- 在原有错误上新增并细分：
  - `GATEWAY_UNAVAILABLE`
  - `PROVIDER_AUTH_FAILED`
  - `MODEL_NOT_FOUND`
  - `MODEL_CONTEXT_EXCEEDED`
  - `MODEL_CONTENT_REJECTED`
- 上游状态、失败阶段和安全原因只进入服务端调用事实；原始错误正文不进入公共响应。

## 已完成：Bifrost 运行脚手架与收窄配置

- 新增 `scripts/bifrost.mjs`，实现固定平台制品选择、下载、字节数与 SHA-256 校验、运行配置生成、安装验证和 sidecar 启动。
- 本地运行目录固定为被忽略的 `runtime/bifrost/`；运行配置和 SQLite config store 都不会进入 Git。
- Web 配置保留在 `.env`；provider key、Bifrost admin 凭据和 encryption key 移入单独的 `.env.bifrost`。Next.js 不加载后者，launcher 也会拒绝在 `.env` 中发现 Bifrost-only secret。
- launcher 读取两份配置后只向 Bifrost child 传递最小操作系统环境、虚拟 key、provider key、admin username/password 和 encryption key，不把完整 Node/Next 环境传给第三方进程。
- 生成配置只保存 provider key、虚拟 key、管理凭据和 encryption key 的 `env.` 引用；provider 名称和实际模型 alias 由 launcher 写入本地运行配置。
- 固定监听 `127.0.0.1:4000`，推理鉴权使用 `sk-bf-` 虚拟 key，路由固定为 custom provider `studium-openai/studium-m1`。
- custom provider 的 `base_provider_type=openai`，只允许非流式 Chat Completions，`list_models=false`、流式 Chat 关闭。Bifrost v1.6.3 的标准 OpenAI provider 无法禁用启动阶段的 `/models` 请求，实际会产生两次不必要的外连，因此未采用；其他 provider 尚未逐项验收。
- 显式设置 provider `max_retries=0`，不配置 fallbacks，governance routing rules 为空。
- 关闭内容日志、raw 请求/响应存储、logs store、telemetry 和自动 MCP tool 注入；未启用其他非必要 store、插件或治理功能。
- 使用仓库内空的 pricing、model-parameter 和 MCP catalog，避免 Bifrost 为 catalog 访问无关外部服务。pricing 与 model-parameter 使用相对本地文件 URL；Node launcher 在 `127.0.0.1:4001` 只读提供唯一的 `/mcp-library.json`，因为 Bifrost v1.6.3 在 Windows 上无法正确读取该 MCP catalog 的绝对 `file://` URL。
- `.env.example` 只包含 Studium 到网关的变量；新增 `.env.bifrost.example` 保存 provider 与 Bifrost 控制面占位项。
- `package.json` 已把开发和正式组合启动切换到 Bifrost，并增加 `gateway:install`、`gateway:configure`、`gateway:verify` 与 `gateway:start`；`next dev` 和 `next start` 都显式绑定 `127.0.0.1`。
- LiteLLM 的配置、Python 版本、依赖清单和 uv 锁文件已从活动工作区删除。

## 过程中修正的安全假设

最初计划同时关闭 Bifrost 的 logs store 和 config store。源码核查确认这在 `v1.6.3` 中不安全：UI 与管理路由没有关闭开关，而禁用 config store 会使管理 AuthMiddleware 无法初始化。

最终实现因此改为：

- logs store 关闭，不建立调用日志数据库；
- 保留最小 SQLite config store，放入 `runtime/bifrost/app/`；
- 通过环境变量提供 encryption key，加密 Bifrost 支持的敏感配置列；
- 启用来自环境变量的 admin username/password；
- 管理面只绑定 loopback，但仍要求鉴权。

这一个 SQLite 文件是 Bifrost 管理鉴权所需的本地基础设施，不是 Studium 的调用审计或事实源，也不是整库加密。另一个已确认的限制是：即使 `allowed_origins` 为空，Bifrost 仍硬编码允许 localhost Origin，因此 CORS 不能替代虚拟 key 或管理鉴权。

## 启动过程中发现并修正的问题

### 禁用的 vector store 仍要求类型

最初生成配置包含只有 `enabled=false` 的 `vector_store`。Bifrost v1.6.3 启动校验仍要求该对象具有 `type`，导致 sidecar 无法启动。最终不再生成整个 `vector_store` 字段；M1 没有向量存储需求。

### Windows 绝对 file URL 不能覆盖全部 catalog

最初为三个空 catalog 生成 Windows 绝对 `file://` URL。v1.6.3 在该路径形式下启动失败，其中 MCP library 不能可靠改用相对文件 URL。最终 pricing 与 model-parameter 改为从仓库根目录解析的相对文件 URL，MCP library 改由 Node launcher 的 loopback-only HTTP endpoint 提供。该 helper 只接受 `GET /mcp-library.json`，其他路径返回 404，并与 Bifrost 一同清理。

## 已完成：测试覆盖

重构建立或更新了配置、Bifrost client、响应解析、service、审计、公共契约和 Route Handler 测试。专项验证实际得到：

- Vitest：69/69 通过。

测试覆盖固定 URL/模型、占位配置拒绝、关联 ID、成功元数据、公开错误映射、无自动重试、调用取消、模型超时、响应大小上限、空白回答、可选元数据容错、成功与失败 trace、无正文审计、50 路并发 JSONL 写入和写入失败恢复。

## 已完成：本地 sidecar 烟雾验收

使用不含真实供应商凭据的专用 smoke 配置实际完成：

- `gateway:install` 下载并安装固定 Windows amd64 二进制，字节数与 SHA-256 校验通过；`gateway:verify` 随后通过。
- `gateway:configure` 成功生成不含 secret 实值的 `config.json`。
- Bifrost 成功启动于 `127.0.0.1:4000`，空 MCP catalog helper 启动于 `127.0.0.1:4001`；检查时没有 `0.0.0.0`、`::` 或其他地址监听这两个端口。
- `GET /health` 返回 200，config database ping 为 `ok`。
- 管理 API 无凭据返回 401，正确 Basic admin 凭据返回 200。
- Chat Completions 无虚拟 key 和使用错误虚拟 key 均返回 401，没有进入 provider 调用。
- 清理后 4000 与 4001 端口均为零监听，没有残留 Bifrost 或 catalog server。
- 扫描运行配置、数据库和日志，没有发现 smoke dummy key 或 health ping 正文；数据库文件只有 `config.db`，没有生成 logs database。
- 最终生成配置只包含 `studium-openai` custom provider；启动日志没有出现 provider `/models` 访问。
- smoke 完成后已删除 dummy `config.json` 和 config database；固定二进制保留在被忽略的 runtime 目录，重新执行 `gateway:verify` 仍通过。

本次烟雾测试没有发送正确虚拟 key，因为这会继续进入尚未配置真实凭据的 provider 链路。因此它不证明正确虚拟 key、真实模型响应、真实 metadata 或真实上游 retry/fallback 行为。

## 已完成：全量自动化与运行入口验证

- ESLint：通过。
- TypeScript `tsc --noEmit`：通过。
- Vitest：69/69 通过。
- Next.js 干净生产构建：通过。
- `npm audit`：0 vulnerabilities。
- 删除旧构建产物后重新生产构建，并扫描 `.next/`；没有发现 `.env.bifrost` 中的 `STUDIUM_UPSTREAM_*`、`BIFROST_ADMIN_*`、`BIFROST_ENCRYPTION_KEY` 名称或对应 smoke 值，证明当前构建没有把 Bifrost-only 配置带入 Next 产物。
- 使用统一 `npm run dev` 重新启动整条本地开发入口：Next.js 只监听 `127.0.0.1:3000`，Bifrost 只监听 `127.0.0.1:4000`，只读空 MCP catalog 只监听 `127.0.0.1:4001`。
- 在生产构建后使用统一 `npm run start` 重复检查，三个服务仍分别只监听上述 loopback 端口。
- 终止统一开发命令后再次检查，3000、4000 与 4001 均为零监听，没有残留子进程占用端口。

## 待完成：真实模型验收

M1 仍为进行中。完成条件保持不变：

1. 明确一个受支持的真实 provider 和实际模型。
2. 在未跟踪的 `.env.bifrost` 中设置真实 provider key、管理密码和 encryption key，并在 `.env` 中生成随机虚拟 key。
3. 根据实际模型锁定最小 pricing 快照；若没有可信价格数据，明确保持 cost 缺失。
4. 从浏览器完成至少两轮真实对话，确认上下文连续、错误处理正常，并保存脱敏证据。
5. 用真实成功与失败响应核对 Studium parser 对 `x-request-id`、`extra_fields.routing_info`、`extra_fields.latency`、`usage.cost.total_cost` 和失败 metadata 的解释。
6. 核对 Studium JSONL 中的 provider、resolved model、token、延迟与可用成本，同时确认没有消息正文或密钥。
7. 通过真实上游行为确认没有隐式 retry 或 fallback；不能用静态配置和 mock 测试替代这项验收。

真实验收通过前不得把 M1 标记完成，也不开始 M2 的 Markdown 资料上下文。
