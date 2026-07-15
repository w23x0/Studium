# Studium

Studium 是 Learning Agent 的第三次实现，也是新的唯一活动开发仓库。

项目名称来自拉丁语 `studium`，含义包括学习、投入与求知。本项目的目标不是再造一个通用聊天工具，而是构建一个能够陪伴学习、判断学习状态并推动学习闭环的个人学习系统。

## 当前状态

- 建立日期：2026-07-14
- 当前阶段：M1 收尾，真实对话成功链路已通过
- 活动主线：本仓库的 `main` 分支
- 当前真相源：本 README
- 新对话与协作者接手入口：[项目上下文与启动交接](docs/PROJECT_CONTEXT.md)
- 当前实施记录：[2026-07-14 Bifrost 网关与调用审计重构](docs/worklogs/2026-07-14-bifrost-gateway-refactor.md)
- 历史基线记录：[2026-07-14 M0 收尾与 M1 基线](docs/worklogs/2026-07-14-m0-m1-baseline.md)
- 当前原则：先完成最小纵向闭环，再扩展资料处理、检索和可视化

在技术栈和第一个接口契约确定前，不创建大规模业务骨架。

## 与 Deep 的关系

前代项目位于 `C:\Users\Wang\Desktop\Deep`。

`Deep` 保存了前两代实现、实验代码、产品探索、理论资料和历史运行数据，现已冻结。归档总入口是 [Deep 项目归档](../Deep/docs/项目归档/README.md)（本机路径：`C:\Users\Wang\Desktop\Deep\docs\项目归档\README.md`）；需要回看前代成果、版本演进、可复用工程或冻结状态时，从该文档开始。Deep 是 Studium 的历史档案与参考实现，不是 Studium 的活动代码库或运行时依赖。

必须遵守以下边界：

1. Studium 不依赖 Deep 的目录结构、数据库或启动环境。
2. Studium 的程序不得直接读写 Deep 下的 `data/`、`src/data/` 或任何 `*.db`。
3. Deep 中的 README、CLAUDE.md 和 PRD 不自动成为 Studium 的需求。
4. 不整体复制 Deep 的 `src/`、`frontend/`、`app/` 或开源项目源码。
5. 只有经过重新评审、缩小边界并补齐测试的代码，才能从 Deep 迁入 Studium。
6. Deep 保持可追溯和只读；Studium 独立演进。

一句话定义：Deep 是前代实验史，Studium 是新的产品主线。

## 第一阶段产品目标

第一阶段只验证最关键的学习闭环：

> 用户提供一份 Markdown 学习资料，与 AI 进行多轮学习；系统记录会话、展示有证据的学习诊断，并判断当前学习闭环是否完成。

在这个闭环可持续运行前，以下能力不进入主线：

- PDF、MinerU 和多模态资料处理
- RAG、向量数据库和本地 embedding 模型
- 知识图谱与 2D/3D 可视化
- Tauri 或其他桌面端封装
- 多供应商网关管理后台
- 复习计划和大型动态画像工作台
- 多 agent 并行修改同一条业务链

这些能力是后续候选项，不是永久删除项。它们必须由已经验证的用户需求和前置里程碑触发。

书籍解析与层级检索的前置核查保存在 [2026-07-14 书籍解析与层级检索候选调研](docs/research/2026-07-14-book-ingestion-and-hierarchical-retrieval.md)。该文件仅作为 M4 稳定后的评估输入，不构成当前需求、技术选型或实施授权。

## 前代 vibecoding 复盘

Deep 的主要问题不是某个框架选错，而是开发方式缺少边界、验收和版本纪律。

| 失败方式 | 产生的结果 | Studium 的对应规则 |
| --- | --- | --- |
| 在第一个闭环尚未可用时同时建设 RAG、图谱、桌面端、网关和学习画像 | 系统范围持续膨胀，没有稳定产品 | 一次只推进一个可验收的纵向里程碑 |
| 每次方向变化都新写一份 PRD，却不废止旧口径 | 多份文档同时声称自己是当前方案 | README 是当前真相源，重大决策使用 ADR，旧文档明确归档 |
| 重构时保留多套活动实现 | `src/`、`frontend/`、`app/` 同时存在且职责冲突 | 只允许一套活动前端和一套活动后端 |
| 让 AI 按宽泛描述直接生成完整模块 | 代码看似丰富，但接口、数据和真实需求没有对齐 | 每个任务必须有输入、输出、边界和验收条件 |
| 用假数据先行，却没有真实后端契约作为约束 | 前后端字段、任务名和流程无法直接连接 | 契约先于实现，假数据必须通过同一份 schema 校验 |
| 在主入口尚未稳定时并行派发多个 agent | 独立模块完成了，整合入口却损坏 | 主线构建绿色前禁止并行修改共享链路 |
| 复制完整开源仓库作为“组件” | 数千个无关文件进入项目，依赖关系仍未建立 | 默认使用包管理器；vendoring 必须有书面理由 |
| 使用相对运行路径保存数据库和模型 | 从不同目录启动后生成多套数据 | 运行数据根目录必须唯一、显式、绝对化 |
| 在没有恢复点时执行清理 | 测试、桌面壳和依赖被删除，无法验证回归 | 删除前先快照；测试不能作为普通缓存清理 |
| 长期不提交，主线代码处于 untracked 状态 | 无法判断哪些变化属于哪次重构，也无法可靠回滚 | 小步提交，每个可运行状态建立 Git 检查点 |
| 把文档数量、页面截图或 agent 自述当作完成 | “已完成”与可构建、可运行、可使用脱节 | 完成必须由命令结果和用户可执行验收证明 |
| 架构讨论先于真实使用反馈 | 大量设计没有经过一次完整学习过程验证 | 先完成最小使用闭环，再从真实问题提炼架构 |

## 工程硬规则

### 1. 单一真相源

- 本 README 说明当前目标、边界、里程碑和工作规则。
- 重大且长期有效的技术决策写入 `docs/decisions/`，采用 ADR 格式。
- 决策被替代时必须标记 `Superseded`，不能留下两个“当前方案”。
- 代码行为与文档冲突时，先停止扩展并明确哪一方需要修正。

### 2. 单一活动实现

- 同一职责只能有一个活动实现。
- 新实现通过验收前，旧实现可以作为受控适配层存在，但必须标注删除条件。
- 禁止通过复制目录产生 `new/`、`new2/`、`final/`、`final-final/` 式版本管理。
- 历史版本由 Git 保存，不由重复目录保存。

### 3. 纵向切片优先

- 里程碑必须从用户操作贯穿到真实数据或真实模型响应。
- 不先建设“以后可能需要”的通用平台。
- 每个里程碑只解决一个主要不确定性。
- 新抽象至少需要两个真实使用点，不能为想象中的复用提前设计。

### 4. 接口与数据

- 前后端共享可校验的接口契约，字段命名和错误语义不得各自猜测。
- 数据库、上传文件和模型缓存必须使用唯一的数据根目录。
- 运行数据、测试数据和示例数据必须分开。
- 数据结构变更必须有迁移方案；禁止靠删除数据库解决升级问题。
- 密钥只进入环境变量或本地密钥存储，绝不提交 Git。

### 5. 依赖管理

- 优先使用成熟、受维护的库解决通用问题。
- 依赖必须通过正式包管理器安装并锁定版本。
- 不复制完整第三方仓库，除非确实需要修改其源码，并通过 ADR 记录原因和升级方式。
- 引入大型依赖前，必须说明它解决的当前问题、替代方案和移除成本。

### 6. 测试与验收

- 每个修复至少覆盖导致问题的路径。
- 共享契约、持久化和学习闭环需要自动化测试。
- UI 至少验证构建成功、关键交互和空状态、错误状态。
- 未运行验证时必须明确写“未验证”，不能写“已完成”。
- 测试代码属于产品资产，不能作为缓存删除。

### 7. Git 纪律

- `main` 必须保持可构建、可回滚。
- 每个提交只表达一个清晰意图。
- 提交前检查 `git diff` 和 `git status`，避免混入密钥、数据、日志和无关文件。
- 大规模移动、删除或依赖升级前先建立检查点。
- 未跟踪的业务代码不能长期充当主线。
- 推荐提交前缀：`feat:`、`fix:`、`refactor:`、`test:`、`docs:`、`chore:`。

### 8. 完成定义

一个任务只有同时满足以下条件才能标记完成：

1. 行为符合书面验收条件。
2. 相关构建、类型检查和测试通过。
3. 数据路径和失败状态已考虑。
4. 没有把无关重构混入任务。
5. 文档只更新真正发生变化的部分。
6. Git 工作区中不存在意外产物。

## 与 AI 协作的规则

AI 是受约束的工程协作者，不是项目方向的自动决定者。

每次开发任务开始前，agent 必须：

1. 阅读本 README、[项目上下文与启动交接](docs/PROJECT_CONTEXT.md)和相关 ADR。
2. 检查当前目录、Git 状态和现有实现。
3. 用一句话复述目标，并说明预计修改的边界。
4. 发现需求会扩大当前里程碑时停止并说明影响。

开发过程中，agent 不得：

- 未经要求改变产品范围或技术栈
- 为了“更干净”重写无关模块
- 未经确认删除数据、测试或历史资料
- 用模拟成功替代真实接口验收
- 同时创建第二套入口、状态模型或数据存储
- 在验证失败后仍宣称任务完成

任务结束时，agent 必须报告：

- 修改了哪些文件
- 用户可观察到什么变化
- 执行了哪些验证及其结果
- 哪些内容尚未验证或仍有风险

## 从 Deep 迁移代码的协议

任何从 Deep 搬入 Studium 的内容都必须经过以下步骤：

1. 写清楚当前里程碑为什么需要它。
2. 找到最小可复用单元，而不是复制整个目录。
3. 重新确认依赖、接口、数据路径和许可证。
4. 先为目标行为补测试或验收样例。
5. 迁入后按 Studium 的命名和边界适配。
6. 在提交信息中注明来源文件，但不建立运行时路径依赖。

优先复用经过验证的领域逻辑，不优先复用旧 UI、启动脚本和目录布局。

## 计划里程碑

| 里程碑 | 用户可验证结果 | 状态 |
| --- | --- | --- |
| M0 工程基线 | 仓库、规则、忽略项和首个提交建立 | 已完成（2026-07-14） |
| M1 真实对话 | 浏览器发送消息，经唯一后端调用一个真实模型并返回结果 | 收尾中（真实成功链路已通过） |
| M2 资料上下文 | 用户粘贴 Markdown，AI 的回答明确基于该资料 | 未开始 |
| M3 学习诊断 | 每轮生成结构化诊断，开发者视图能看到判断与证据 | 未开始 |
| M4 学习闭环 | 会话持久化，可触发闭环检查并保存结果 | 未开始 |

只有 M4 稳定后，才评估 PDF、RAG、引用检索和知识图谱。

### M1 技术边界

M1 使用 Node.js 24 LTS、npm、TypeScript、React 和 Next.js 建立唯一活动应用；浏览器通过同源 Route Handler 调用锁定的 Bifrost HTTP Transport sidecar。应用技术栈见 [ADR 0001](docs/decisions/0001-m1-application-stack.md)，当前网关、安全和审计边界见 [ADR 0003](docs/decisions/0003-bifrost-gateway-and-call-audit.md)；[ADR 0002](docs/decisions/0002-litellm-gateway-boundary.md)只保留为已被取代的 LiteLLM 历史决策。

M1 只实现非流式 `POST /api/chat`：

```json
{
  "messages": [
    { "role": "user", "content": "请解释这个概念" }
  ]
}
```

成功响应：

```json
{
  "message": { "role": "assistant", "content": "..." },
  "requestId": "..."
}
```

失败响应统一为：

```json
{
  "error": {
    "code": "MODEL_TIMEOUT",
    "message": "模型响应超时，请稍后重试。",
    "retryable": true,
    "requestId": "..."
  }
}
```

请求只接受 `user` 和 `assistant` 消息；至少一条、最多 20 条，每条正文为 1 至 8000 个字符，总正文不超过 32000 个字符，最后一条必须来自用户。浏览器不能提交 `system` 消息、模型名、网关地址或密钥。

M1 的退出条件是：

1. 浏览器能发送消息并显示由真实模型生成的回答，后续消息携带当前页面内的历史形成多轮对话。
2. 请求只经过唯一的 `POST /api/chat` 后端入口和 Bifrost 的固定 `studium-<provider>/studium-m1` 路由。
3. 空状态、请求中状态、无效输入、未配置、网关鉴权失败、限流、超时和上游不可用均有明确界面反馈。
4. 密钥只存在于未跟踪的本地环境变量；日志和浏览器响应不泄露密钥或上游原始错误正文。
5. 依赖已锁定，构建、类型检查、契约测试和关键 UI 交互测试通过。
6. 使用实际上游模型完成一次手工验收；自动化模拟不能替代这项证据。

### M0 退出记录

M0 于 2026-07-14 达到退出条件：

- `main` 是唯一活动分支，仓库已有可回滚的初始化提交。
- README 已记录产品范围、工程硬规则、Git 纪律和完成定义。
- `.gitignore` 已覆盖密钥、本地配置、运行数据、依赖、构建产物和工具状态；`.env.example` 保持可跟踪。
- `.gitattributes` 已统一文本文件行尾，并将常见图片和 PDF 标记为二进制。
- `docs/PROJECT_CONTEXT.md` 提供新对话与协作者的接手入口。
- `git diff --check` 与 `git fsck` 已通过，仓库未发现空白错误或对象损坏。

Remote、CI、许可证和应用运行时不属于 M0 的既定退出条件；它们应在实际发布或 M1 实现需要时分别决策，不能用占位配置伪装完成。

## 开发入口

### 环境要求

- Node.js 24 LTS 与 npm 11
- Windows x64；当前 Bifrost 制品锁只覆盖该本地运行基线

### 首次安装

```powershell
npm ci
npm run gateway:install
Copy-Item .env.example .env
Copy-Item .env.bifrost.example .env.bifrost
```

`gateway:install` 从 Bifrost 官方下载地址取得 transport `v1.6.3` 的 Windows x64 二进制，并在写入忽略目录 `runtime/bifrost/` 前核对锁定的文件大小和 Studium 实测 SHA-256。该 hash 是项目自己的观测锁，不是上游签名；Bifrost 当前没有为该文件提供官方 checksum 或 Authenticode 签名。

编辑未被 Git 跟踪的 `.env`，设置 Studium 到网关的 URL、固定模型和虚拟 key；当前经过真实 sidecar 验证的模型值为 `studium-openai/studium-m1`。编辑单独的 `.env.bifrost`，填写实际 `STUDIUM_UPSTREAM_BASE_URL`、`STUDIUM_UPSTREAM_MODEL`、供应商 key、管理密码和配置库加密 key。上游地址必须是 HTTPS origin，例如 `https://api.example.com`，不能包含 `/v1`、凭据、query 或 fragment；Bifrost 会自行追加 OpenAI-compatible API 路径。`studium-` custom-provider 前缀允许启动配置明确禁用 Bifrost 的 provider model-discovery 请求；当前 M1 生成器只接受已验证的 `STUDIUM_UPSTREAM_PROVIDER=openai`，扩展其他 base provider 必须补配置与协议验收。

虚拟 key 必须以 `sk-bf-` 开头并使用强随机值。`.env.bifrost` 只加载到网关启动进程；Next.js 不识别该文件名，Bifrost 子进程也只继承运行所需的最小环境变量集合，因此上游 key、管理密码和 encryption key 不进入 Web 应用环境。

可在启动前单独生成并检查不含秘密的运行配置：

```powershell
npm run gateway:configure
npm run gateway:verify
```

唯一开发入口：

```powershell
npm run dev
```

该命令启动显式绑定 `http://127.0.0.1:3000` 的 Next.js、只监听 `http://127.0.0.1:4000` 的 Bifrost，以及 launcher 在 `http://127.0.0.1:4101` 提供的只读空 MCP catalog。4101 只用于绕过 Bifrost v1.6.3 在 Windows 上读取 MCP `file://` catalog 的路径缺陷，不是 Studium 产品 API。Bifrost 固定使用 `studium-openai` custom provider、`studium-m1` alias、一次上游 attempt，关闭 model discovery、retry、fallback、调用日志、内容保存、缓存和外部 exporter；停止命令会清理三个监听端口。

模型调用的脱敏 trace 追加到 `var/audit/llm-calls/YYYY-MM-DD.jsonl`。它包含 Studium ID、provider/model、延迟、token、可选成本和安全错误分类，不包含 prompt、回答、system message、密钥或原始上游错误。当前 JSONL 串行器只保证单个 Node.js 进程内的并发安全。

### 验证命令

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
npm run gateway:verify
```

也可使用 `npm run verify` 顺序执行 lint、类型检查、测试和生产构建。当前自动化验证覆盖共享契约、API 成功与失败语义、Bifrost 请求及错误映射、响应体积、取消与超时、结构化 trace、脱敏审计并发安全，以及页面空状态、多轮请求、加载状态和错误恢复。

M1 的真实成功链路已于 2026-07-15 通过：未跟踪的本地配置把 `studium-openai/studium-m1` 映射到用户指定 OpenAI-compatible 上游的 `gpt-5.4-mini`，Chrome 实际完成两轮对话并正确使用首轮上下文。JSONL 记录了单 attempt、实际模型、token 与延迟，且不含消息正文或密钥。M1 仍处于收尾：尚未用该真实上游验证失败 envelope 的在线映射；本地 pricing catalog 仍为空，因此 `cost` 缺失是预期行为，不能视为可靠成本账本。
