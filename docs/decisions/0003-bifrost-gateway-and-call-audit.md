# ADR 0003：Bifrost 网关与模型调用审计边界

- 状态：Accepted
- 日期：2026-07-14
- 取代：ADR 0002

## 背景

ADR 0002 建立了浏览器、Studium 后端与自托管 LLM 网关之间的第一条可运行边界，但 LiteLLM 基线仍有三个结构性缺口：Proxy 依赖面相对 M1 的单模型需求偏大；安全行为较多依赖第三方默认值；Studium 只保留回答文本和 `requestId`，无法独立说明一次调用实际经过哪个供应商和模型、消耗多少 token、耗时多久或在哪个阶段失败。

后续网关调研表明，Bifrost HTTP Transport 能以独立 Go 数据面提供 OpenAI-compatible 接口和更完整的 resolved provider/model 元数据。Studium 仍不能把网关日志当作事实源，也不能让网关承担教学动作、理解证据或闭环守卫。

## 决策

### 运行依赖与供应链锁定

- 使用 Bifrost HTTP Transport `v1.6.3`（tag commit `df1644338ad98216cffa78231b6ca19e8e42e8f2`）作为唯一 LLM 网关，LiteLLM 不再作为活动运行依赖。
- Windows amd64 基线直接使用 Bifrost 官方发布流程提供的二进制，不 clone、fork、vendoring 或本地重编译第三方仓库，也不通过 `latest` 动态解析版本。
- 固定下载信息如下。URL 来自该版本官方 npx wrapper 使用的下载域；上游没有在 GitHub release 附加 asset、校验文件或 Authenticode 签名，因此 SHA-256 是 Studium 对完整下载文件独立计算并锁定的摘要。安装流程必须在执行文件前同时校验字节数和摘要，不匹配时立即失败：

  ```text
  URL: https://downloads.getmaxim.ai/bifrost/v1.6.3/windows/amd64/bifrost-http.exe
  Size: 113897984 bytes
  SHA-256: d1371e06757992c1cbad4a42b619c8763f1ec214b19bd2b6dcb46e9ab1ac2707
  ```

- 二进制只安装到被 Git 忽略的本地工具目录。版本、来源和摘要进入仓库；二进制本体不进入仓库。
- 升级 Bifrost 必须显式修改版本、URL 与摘要，复核配置兼容性，并重新执行安全和协议验收。

### 请求边界与固定路由

请求链路固定为：

```text
浏览器
  -> POST /api/chat
  -> Next.js Route Handler
  -> Studium LLM service
  -> Bifrost adapter
  -> Bifrost /openai/v1/chat/completions
  -> custom provider studium-openai/studium-m1
  -> 一个 OpenAI-compatible 实际模型
```

- 浏览器公共 API 保持不变：成功响应仍只包含 assistant 消息和 `requestId`；浏览器不能提交 system message，也不能指定 provider、model、网关地址或鉴权信息。
- Studium 在服务端拥有 system message、逻辑调用身份、超时、取消、错误语义和审计写入；Bifrost 只负责协议转换和明确的供应商调用。
- Next.js 的开发与生产启动命令都显式监听 `127.0.0.1:3000`；Bifrost 只监听 `127.0.0.1:4000`。Studium 只接受固定的 `http://127.0.0.1:4000/openai/v1`，不接受 `localhost`、远程地址、URL 内凭据、查询参数或 fragment。
- Studium 到 Bifrost 的每次推理请求必须使用高熵虚拟 key 鉴权；占位值、过短 key 或不符合约束的 key 在调用前作为配置错误拒绝。
- Web 进程所需的网关 URL、虚拟 key 和固定模型位于未跟踪的 `.env`；provider key、Bifrost admin 凭据和 encryption key 位于另一个未跟踪的 `.env.bifrost`。Next.js 不加载 `.env.bifrost`，launcher 还会拒绝把 Bifrost-only secret 放回 `.env`。
- launcher 可读取两份环境文件以生成运行配置，但启动 Bifrost child 时只传入操作系统运行所需变量和五个明确允许的 Bifrost/provider 配置变量，不把完整父进程环境传给第三方二进制。
- provider key 只从 `.env.bifrost` 注入 Bifrost；运行配置只保存 `env.` 引用，不把真实值写入仓库配置、命令行参数、日志或 Studium 浏览器响应。provider 名称与 alias 不能通过 Bifrost 的 `env.` 引用解析，因此由 Studium launcher 在本地生成不含密钥的运行配置。
- M1 只允许显式路由 `studium-openai/studium-m1`。它是 `base_provider_type=openai` 的 custom provider，只开放非流式 Chat Completions，`list_models=false`；浏览器和 Route Handler 均不能覆盖路由。v1.6.3 的标准 provider 无法关闭启动阶段的 `/models` 请求，实际启动时会产生两次不必要的外连，因此不采用标准 provider。
- 其他 base provider 尚未逐项完成配置、启动和协议验收；不能仅替换环境变量后宣称受支持。

### 收窄 Bifrost 数据面

M1 不使用 Bifrost 的控制面或治理平台能力。运行配置必须显式满足：

- provider `network_config.max_retries` 显式设为 `0`；Studium 请求不发送 `fallbacks`，governance routing rules 为空；一次 Studium 逻辑调用只产生一次上游 attempt。
- Studium 的 Chat Completions 请求显式发送 `store: false`；该字段表达不请求上游存储，但不能替代所选云 provider 自身的数据处理政策审查。
- `client.enable_logging=false`、`client.disable_content_logging=true`、`logs_store.enabled=false`；同时禁止逐请求重新开启正文或 raw envelope，不返回或存储 raw provider 请求和响应，也不把详细上游错误写入 console。
- telemetry 关闭；其他非必要 store、插件和功能不进入生成配置。`vector_store` 不能以只有 `enabled=false` 的不完整对象存在，因为 v1.6.3 仍会要求其 `type`，因此整个字段省略。
- 保留一个最小 SQLite config store，并把数据库放入被 Git 忽略的 `runtime/bifrost/app/`。provider key 仍只保存为环境变量引用；受支持的敏感配置列使用独立环境变量提供的 Bifrost encryption key 加密。
- 启用 Bifrost admin username/password 鉴权，凭据来自未跟踪的本地环境变量。v1.6.3 的 UI 和管理路由没有关闭开关，而关闭 config store 会使管理 AuthMiddleware 无法初始化，因此“关闭 config store”不是安全选项。
- Studium 浏览器代码不直接调用网关，也不把管理 UI、配置 API 或其他非推理端点作为产品入口。loopback 仍允许本机浏览器和其他本地进程连接，因此推理虚拟 key 与管理鉴权都不能省略。
- `allowed_origins` 设为空。v1.6.3 仍会硬编码允许 localhost Origin，因此 CORS 不是安全边界；推理虚拟 key 和管理鉴权必须始终启用。
- pricing 与 model-parameter catalog 是仓库内的空 JSON，并通过相对 `file://` URL 读取。MCP catalog 也是空 JSON，但 Bifrost v1.6.3 在 Windows 上不能正确读取其绝对 `file://` URL，因此 Node launcher 在 `127.0.0.1:4001` 提供只读的单文件 HTTP endpoint；Bifrost 本身继续监听 `127.0.0.1:4000`。两个监听都必须随 launcher 退出而清理。

若未来启用 retry 或 fallback，Studium 必须能获取并记录每次真实 attempt 及进入下一次尝试的原因；不得允许网关暗中重试或切换后只返回最终结果。

### Studium 调用层与事实源

Studium 使用网关无关的 `src/lib/llm/` 边界，将配置校验、服务编排、Bifrost HTTP 适配、响应解析、错误分类和审计写入分离。Route Handler 只依赖 LLM service，不直接依赖 Bifrost 响应结构。

身份层级固定为：

- `requestId`：一次 `POST /api/chat` 请求。
- `callId`：一次逻辑模型调用。
- `attemptId`：一次真实上游尝试。

Studium 的版本化调用 trace 至少记录：

- 调用状态、起止时间、总延迟、消息数量和总字符数；
- requested model；
- 每个 attempt 的序号、状态、延迟与安全错误分类；
- 可获得时的 gateway request ID、provider request ID、上游 response ID、实际 provider、resolved model、finish reason、gateway latency、fallback index、token usage 和成本。

第三方字段是可选元数据；缺失或格式无效的可选字段不能覆盖一份有效回答。parser 同时处理成功正文与失败 envelope 中的 metadata，按 Bifrost v1.6.3 的 `extra_fields.routing_info`、`extra_fields.latency` 和 `usage.cost.total_cost` 读取路由、延迟与成本。`x-request-id` 归类为 provider request ID；没有文档和实测依据的 gateway-request 或 cost header 不作为事实来源，`gatewayRequestId` 预留字段在出现可靠来源前保持缺失。成本尤其不能根据不完整信息推测：本地价格 catalog 为空或没有匹配项时保持缺失，等真实模型确定后再锁定最小价格快照。回答正文缺失、空白、无效 JSON、结构不兼容或响应体超过上限时，Studium 将其分类为无效模型响应。

### 无正文 JSONL 审计

- Studium 将一条逻辑调用的完整 trace 追加到 `var/audit/llm-calls/YYYY-MM-DD.jsonl`；`var/` 不进入 Git。
- 审计事件带 `schemaVersion`，一个 JSON 对象占一行，并把 attempts 保存在对应的逻辑调用内。
- 默认不记录 user/assistant/system 正文、完整请求或响应 envelope、Authorization header、API key、上游原始错误正文或异常 cause。
- 只记录消息数量、字符数和上述调用元数据；未来若引入内容 hash，必须另行评审其隐私和重识别风险。
- 审计写入失败不能把一次成功的模型回答改成失败，也不能遮蔽原始模型失败；服务端只输出带 `requestId`、`callId` 和错误类型的脱敏运维警告。

网关日志不是 Studium 的权威事实源。与未来学习 turn、理解证据和最终守卫结果的关联必须使用 Studium 自己的 ID 和数据模型完成。

### 错误语义

公共错误响应保持稳定结构，并在原有基线上区分网关不可用、网关鉴权、供应商鉴权、模型不存在、限流、上下文超限、内容拒绝、超时、上游不可用和无效响应。内部错误还记录失败阶段、是否可重试、上游状态码和安全原因，但不会把第三方原始错误正文返回浏览器或写入审计。

## 理由

- Bifrost 独立二进制比 LiteLLM Proxy 的 Python 依赖面更贴合单用户、单机、单模型的 M1 边界。
- 固定官方下载 URL 和摘要使第三方数据面可以复现、审计和移除，避免动态安装意外升级。
- loopback、虚拟 key、provider key 隔离、管理鉴权和收窄持久 store 明确了本地安全边界，而不是依赖版本默认值。
- Studium 自己持有结构化 trace，才能把模型调用可靠地关联到后续学习证据，并在更换网关后保持同一套事实和错误语义。
- 先建立单 attempt 模型，再决定是否引入显式 fallback，可以避免未来为审计补写破坏性迁移。

## 后果与限制

- 本地运行增加一个约 109 MiB 的二进制、Bifrost sidecar、Node loopback catalog server、一个小型 SQLite config store 和新的失败边界；统一启动流程必须负责安装校验、配置生成、两个监听的生命周期和清理。
- config store 是 Bifrost v1.6.3 管理鉴权所需的基础设施，不保存 Studium 权威调用审计。它不是完整数据库加密；只有 Bifrost 支持的敏感列通过 encryption key 加密，因此文件权限和数据根目录仍须受控。
- 当前安装基线只覆盖 Windows amd64；其他平台必须增加各自的官方资产、摘要和验证证据，不能复用本摘要。
- 关闭 retry 和 fallback 会把短暂上游失败直接暴露为一次失败，但 M1 的行为因此可预测且可审计。
- provider、resolved model、token 和成本取决于 Bifrost 与供应商是否返回相应字段；缺失值保留为空，不推测或伪造。真实模型确定前不承诺成本字段可用。
- 当前 custom-provider 配置只验证 OpenAI-compatible base provider；支持 Anthropic、Gemini 或其他协议需要各自的最小配置和真实兼容性测试。
- JSONL 只适用于当前单应用进程的本地追加审计。多进程写入、集中采集、保留期限、轮转、文件权限和加密若成为需求，必须另行设计。
- 无正文审计降低但没有消除隐私风险；时间、模型、token、成本和关联 ID 仍属于本地运行元数据。
- loopback 网关只移除了额外的第三方中间控制面。使用云 provider 时，提示词和回答仍会离开本机并由该 provider 处理。
- 在真实 provider key 和模型未配置、两轮浏览器调用未通过前，M1 仍不能标记完成。

## 未采用方案

- 保留 LiteLLM 作为并行活动网关：会产生两套运行配置和测试矩阵；Git 历史与 ADR 0002 已足以回溯旧方案。
- Inference Gateway：更轻量，但当前缺少 Bifrost 可提供的 resolved provider/model 与 attempt 元数据基础。
- Studium 直接调用 provider SDK：进程更少，但会把应用绑定到供应商协议、密钥注入方式和错误语义。
- 关闭 Bifrost config store：v1.6.3 会因此无法初始化管理鉴权，而 UI 和管理路由又不能关闭，安全性低于保留加密、受控的最小配置库。
- 使用 Bifrost 的 UI、日志数据库、缓存、治理或自动路由：超出 M1 范围，并扩大本地数据与运维边界；config store 仅因管理鉴权约束保留。
