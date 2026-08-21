# DSH 外部参考 — DeepSeek Harness 研究

> 定位：Studium 对 **LLM agent-harness 时代**的 T0 起点研究。
> 2026-08-15 由学习会话建立初版；本目录不是普通外部参考，是 harness 方向的主研究入口。

## 这是什么

**DSH = DeepSeek Harness**，[DeepSeek AI](https://deepseek.com) 开源的 agent harness（智能体运行时框架，MIT 协议）。目前处于**开发者预览**阶段，快速迭代、未来有破坏性变更。

一句话：**一切皆插件**。模型适配器、工具注册表、会话日志、甚至 agent 循环本身都是插件，全部可由配置替换、可动态装卸。

它由 [Cordis](https://github.com/cordiverse/cordis)（一个「时空可组合性」元框架）驱动，设计出处是论文

> **《A Programming Paradigm for Spatiotemporal Composability》**
> Yifan Shi（北京大学）· Wei Zhang（北京大学）· Tianyi Cui（DeepSeek-AI），2026
> 论文仓库：<https://github.com/cordiverse/paper>

## 材料地图（三层）

| 层 | 材料 | 位置 |
| --- | --- | --- |
| ① 理论基础（论文） | PDF 原件 | `docs/DSH/paper.pdf`（git 已收录） |
| | 解析文本 | `docs/DSH/paper/full.md`（中间产物，gitignored） |
| ② 工程实现（源码） | 外部克隆仓库 | `C:\Users\Wang\Desktop\deepseek-harness` |
| | 架构/子系统文档 | 仓库 `docs/`（`architecture.md`、`cordis-primer.md`、`glossary.md`、`subsystems/`…） |
| | 贡献者/开发约定 | 仓库 `AGENTS.md`（根目录，含完整包清单与命令） |
| ③ 官方资源（网络） | GitHub / npm | <https://github.com/deepseek-ai/deepseek-harness> · `npx @deepseek-ai/dsh web` |

> **学习笔记**：**主线** [`notes/阶段1_设计点总览.md`](notes/阶段1_设计点总览.md)（三个设计点：自进化目标 / 时空可组合性 / 无特权核心）· 支线（作为主线论据）[`notes/阶段0_概念热身.md`](notes/阶段0_概念热身.md) · [`notes/阶段2_插件树解剖.md`](notes/阶段2_插件树解剖.md) · [`notes/阶段3_agent-loop走读.md`](notes/阶段3_agent-loop走读.md) · [`notes/阶段3b_工具执行流水线.md`](notes/阶段3b_工具执行流水线.md)

## 核心概念速览（初学者向）

研究前先建立这几个概念，后面读论文和源码会顺很多：

- **agent**：LLM + 工具 + 循环 组成的自主执行体。
- **agent harness vs agent framework**：framework（如 LangChain）是**库**，提供 agent 循环的积木；harness 是 agent 的**运行宿主/运行时**，负责会话持久化、权限与沙箱、多 agent、工具注册、上下文管理等「框架之外」的资源。DSH 是后者。
- **一切皆插件 / 插件树**：一个跑起来的 DSH 是一棵由配置（profile → bundle → `cordis.yml`）按层组合出的插件树。没有特权核心，扩展 = 在旁边挂一个插件。
- **时间维组合性（temporal composability）**：组件被移除时，它对共享环境做的修改必须**完全、安全地回滚**。对应论文概念 **revertible effects**——每次上下文变换都携带一个逆变换，由运行时追踪并在移除时回收。
- **空间维组合性（spatial composability）**：组件之间能**声明、发现、响应**依赖，依赖增减/身份变化时自动协调生命周期。对应 **reactive coeffects**——上下文变化会按组件的 coeffect 规格通知它。
- **会话日志（session log）**：追加式事件日志，是模型所见上下文的**唯一来源**。铁律：**model-visible ⟺ logged**——凡是能到达模型请求的输入，都必须能从日志重建。
- **turn flow**：`step` = 一次模型请求 + 它调用的工具；`turn` = 0..n 个 step，直到无欠账才关闭。
- **capability seam**：可替换能力的完整接缝，永远三个角色齐全：**Service Definition**（声明接口）/ **Service Provider**（实现）/ **Consumer**（消费，通常是模型可调的工具）。

## 为什么 Studium 需要它

这不是「学了玩的」外部参考，它直指项目几个待办/暂缓方向：

- **执行图 / 上下文工程**（暂缓，等模块组合阶段）——DSH 的 session log「model-visible ⟺ logged」原则、按 log 投影模型历史的做法，是上下文工程的可移植样板。
- **自动化调研引擎**（`research_tree` 流水线本身就是个 harness 形态：任务卡、发现、审计、合成、状态机）——可对照 `agent-loop`、`session`、`subagent`、`workflow` 包的职责拆解，看现成 harness 怎么组织这些。
- **知识组织的可回滚 / 墓碑撤回**（B4c 等任务）——revertible effects 正是「删除组件时副作用必须彻底撤销」的形式化思路。
- **工具 / 能力分层**——capability seam 三角色模型可直接映射 Studium 的工具注册与权限策略。

## 学习路径（建议阅读顺序，零基础友好）

> 阶段 0 和阶段 2 可以在一天内串完；阶段 1 和 3 是主体。

1. **阶段 0 · 概念热身（网络调研）**：先分清 agent / agent framework / agent harness 三层；顺手看 DSH 在生态里的位置（对比 Claude Code、LangChain、CrewAI、AutoGPT 之类谁是 harness 谁是 framework）。
2. **阶段 1 · 设计点 + 论文精读（主线）**：先读[`notes/阶段1_设计点总览.md`](notes/阶段1_设计点总览.md)建立三个设计点；再精读论文（`paper.pdf`，解析文本已清，需重新解析或装 poppler）。必读 **§1.2.2 Self-Evolving Agent Harnesses**（总目标）+ **§3 revertible effects / reactive coeffects**（核心机制）；**§4 calculus** 略读只看结论；**§5 实现** 回代码验证设计点。
3. **阶段 2 · 跑起来**：`cd deepseek-harness && pnpm install && pnpm run build && pnpm dsh web`（默认 `http://127.0.0.1:3080`）；再跑 `pnpm dsh --profile headless "一个任务"` 和 `pnpm dsh --profile web --dump-config`——后者能直接看到你的机器实际启动的插件树，任何一行都能被 patch 替换。
4. **阶段 3 · 源码精读**：按依赖顺序读 `packages/core/`：`session` → `agent-loop` → `tools` → `system-prompt` → `skill` → `subagent`，对照 `docs/architecture.md` 的 turn flow 图。**每读完一个包回答三问**：① 它解决什么问题？② 它在 `ctx` 上注册了什么？③ 它的事件从哪来、到哪去？
5. **阶段 4 · 项目对照**：把 DSH 概念映射到上节四个 Studium 需求点，产出可进 `research_tree` 的调研卡与结论（遵循 LLM 时代调研线的落盘惯例）。

## 研究状态与待办

- [x] 阶段 0 概念热身（生态定位笔记 → [`notes/阶段0_概念热身.md`](notes/阶段0_概念热身.md)）
- [x] 阶段 1a 设计点总览（**主线** → [`notes/阶段1_设计点总览.md`](notes/阶段1_设计点总览.md)）
- [ ] 阶段 1b 论文 §3 细读（可回滚副作用 + 反应式 coeffect 原文；PDF 需重新解析或装 poppler）
- [x] 阶段 2 插件树解剖（支线 → [`notes/阶段2_插件树解剖.md`](notes/阶段2_插件树解剖.md)）
- [ ] 阶段 2b 实跑（**可选项，已评估非必需**：headless 真跑任务才值得烧 key；web UI / dump-config 对学习价值低。要做时复制副本到 `tmp\dsh-copy`）
- [x] 阶段 3a agent-loop 走读（支线 → [`notes/阶段3_agent-loop走读.md`](notes/阶段3_agent-loop走读.md)）
- [x] 阶段 3b 工具执行流水线（支线 → [`notes/阶段3b_工具执行流水线.md`](notes/阶段3b_工具执行流水线.md)）
- [ ] 阶段 4 项目映射 + 入 research_tree（把三个设计点映射到 Studium 需求）

相关记忆锚点：`docs/DSH` 论文是 LLM/harness 时代调研的 T0 起点（见 `dsh-spatiotemporal-composability`）。
