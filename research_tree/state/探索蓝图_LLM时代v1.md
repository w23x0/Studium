# 探索蓝图 · LLM / Agent-Harness 时代（v1 草案）

> 定位：这是**新开的一条调研主线**，与已有 research_tree 的「知识载体/存储选型」(V/S/P/B/G 系列，多为前 LLM 时代，已到叶归档) **并行但不混合**。
> 已有证据池被前 LLM 时代的工作主导（60 份 findings 里仅 V6/S2/B2c 命中 LLM/agent 关键词≥3），导致"无新载体可借"结论。本线显式锚定 **2024–2026 的 LLM/agent-harness 时代**。

## 0. 一句话根问题

> **在 LLM + agent harness 时代，Studium 的上下文工程、harness 内部机制、知识检索、长程状态这几块，该借 / 不借 哪些最新研究和技术？**

## 1. 方向树（用户已圈定 1–4，3 为主线）

```
LLM 时代根（R-LLM）
│
├─ 方向3 · 上下文工程  ★主线★
│   ├─ 上下文解构/重构（DSH 论文的 temporal 维：组件移除时上下文副作用怎么回滚）
│   ├─ 上下文预算/切分（λ: 上下文随输入平方增长、网关不做 prompt caching）
│   ├─ 上下文压缩/记忆窗口管理
│   └─ 上下文与工具调用的编排（有限上下文下的工具协商）
│
├─ 方向1 · Agent harness 内部机制（插件/动态组合）
│   └─ 自演化 harness、可逆副作用(revertible effects)、依赖解析(coeffects)
│
├─ 方向2 · LLM 时代的数学/知识检索
│   └─ 接 V6 未释放的尾巴：CS-RAG 文本回退/充分性检查、知识新颖度、GraphRAG 触发条件
│
└─ 方向4 · 长程状态 / 内存系统（上下文控制）
    ├─ harness memory 层、持久化会话
    └─ 向量库/知识库在 LLM 时代的组织（不是看 RDF/Datalog 老货，是看 2024+ 做法）
```

## 2. 种子锚点（T0 输入，来自已有）

- **DSH 论文**《A Programming Paradigm for Spatiotemporal Composability》(北大+DeepSeek-AI 2026) → 方向1 + 3 的 temporal/spatial 两条拆解基础
- **V6_发现.md** → 方向2（它已挖到 2506.05690、2606.25656、CS-RAG 反转、LightRAG 混合形态、知识新颖度判据，只是被"储存结构 F 族"框住）
- 既有 memory：网关不做 prompt caching、上下文预算切分代理 → 方向3 的工程锚点

## 3. 工具与抓取策略（关键修复）

**现状**：本次环境 WebSearch/WebFetch 返回 `invalid model`（后端模型名配置错），**不可用**。但网络与 curl 全通：
- arXiv API `https://export.arxiv.org/api/query` — 🟢 检索+摘要+元数据
- scholar.google.com — 🟢
- github.com / arxiv.org 摘要页 — 🟢
- Semantic Scholar API — 🟡 429 限流（重试即可）

**调研员抓取策略（写进任务卡，替代坏掉的 WebSearch）**：
1. 检索 → `curl export.arxiv.org/api/query?...&sortBy=submittedDate&sortOrder=descending`（强制时间锚定，只看最近）
2. 抓摘要 → arXiv API `<summary>` 字段（已验证可用）
3. 抓全文 → `curl arxiv.org/abs/<id>` 或 GitHub raw / HTML 版
4. 权威站点 → 直接 `curl` 官方文档页
5. 全失败 → 标「未核」，绝不捏造

**为何不用 WebSearch**：它现在 400。等它修好可复用，但本线 workflow 不依赖它。

## 4. 调研团队（角色编排）

| 角色 | 职责 | 产出 |
|---|---|---|
| **总控 Orchestrator**（主对话） | 读 state、组批、派发、回收、更新 state、续跑 | state.json + 调度日志 |
| **根方向员**（一次性） | 把 R-LLM 拆成 1/2/3/4 + 每方向的子问题 + 种子线索 | 蓝图 + 子任务卡 |
| **调研员 Researcher** | 按任务卡 curl 检索/抓取/快照 + 写发现 | `findings/L_{id}_发现.md` + `_sources/L_{id}/` |
| **审计员 Auditor** | 判死四条件 + URL 抽检 + 快照比对 + 工作量红线 | `audit/L_{id}_审计.md` → PASS/FAIL |
| **汇总员 Synthesizer** | 跨方向横向对照 + 合成结论（推断与实证分开） | `synthesis/上下文工程决策点_v1.md` |
| **仲裁 Arbiter** | 冲突裁决；推断 vs 实证分类，不把 unknown 当 PROVEN | 冲突台账 |

## 5. Workflow 原则

- **时间锚定是硬约束**：每个方向的关键词/检索项都带 `sortBy=submittedDate desc`，或显式 `2024+ / 2025+ / 2026` 过滤；凡是搜到前 LLM 老货(SQL/RDF/Datalog/本体旧文)一律打回或标记"时代不符，不取"。
- **每方向独立流水线**：调研员→审计员（pipeline，不设屏障）。
- **主线优先**：方向3(上下文工程)先跑，1/2/4 作为并入的子方向或第二批。
- **快照+逐字**：沿用 E-RES 契约，抓原文才标 A。
- **不断、可恢复**：state.json 唯一事实源，中断重跑跳过已完成。

## 6. 待你拍板 / 待办

- [ ] WebSearch/WebFetch 的 `invalid model` 是否是环境配置（可修）；若可修，优先修而不是全依赖 curl
- [ ] 方向3 子问题切多细（4 个子方向），还是先跑一个"上下文工程"根任务探路
- [ ] 每方向工作量红线（A≥10 来源）对 LLM 快速变化区是否过高
- [ ] 是否新增"harness 时代综述"一张任务卡，先摸清 2024–26 全景再拆