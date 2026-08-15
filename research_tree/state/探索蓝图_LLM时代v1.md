# 探索蓝图 · LLM / Agent-Harness 时代（v1 草案）

> 定位：这是**新开的一条调研主线**，与已有 research_tree 的「知识载体/存储选型」(V/S/P/B/G 系列，多为前 LLM 时代，已到叶归档) **并行但不混合**。
> 已有证据池被前 LLM 时代的工作主导（60 份 findings 里仅 V6/S2/B2c 命中 LLM/agent 关键词≥3），导致"无新载体可借"结论。本线显式锚定 **2024–2026 的 LLM/agent-harness 时代**。

## 0. 一句话根问题

> **在 LLM/agent 时代，Studium 的理科知识载体（M08/M09 知识怎么组织、存储、检索）该借 / 不借哪些最新研究和技术？** —— 这是贯穿全程的主线。

## 1. 方向树（用户确认：知识载体 = 主线；上下文/记忆/harness = 支线，服务知识）

```
LLM 时代根（R-LLM）
│
├─ ★主线★ 知识载体 · LLM 时代的知识组织/存储/检索（决策目标是这份选型终稿，非上下文）
│   ├─ 知识载体·LLM 时代怎么做知识的组织与存储（不是 RDF/Datalog 老货，是 2024-26 的
│   │       知识库/笔记系统/agent memory 怎么组织知识；接已有 V/S/B/G 但允许推翻结论）
│   ├─ 知识载体·LLM 时代数学/科学知识表示（不依赖 mathlib/MML 老形式化库，看 2024-26 新做法）
│   ├─ 知识载体·可信与引用（锚点判等/证据/防幻觉在 LLM 时代怎么落；接 V6 的 CS-RAG 尾巴）
│   └─ 知识载体·检索（LLM 检索 vs 老式 RDF/图检索，图何时真有用，接 V6 证据）
│
├─ 支线 · 上下文工程（服务知识进/出上下文）
│   └─ 上下文如何承载知识、预算、记忆窗口、与工具编排
│
├─ 支线 · Agent harness 机制
│   └─ 知识载体作为组件的可逆副作用/依赖管理（DSH 论文 temporal/spatial）
│
└─ 支线 · 长程状态 / 记忆
    └─ 记忆 = 知识在学习者维度的落点，与 M09 对应
```

> 主线产出 = `synthesis/知识载体选型决策点_LLM时代v1.md`（用户真正要的东西）。
> 支线只回答"知识载体如何被上下文/harness/记忆承载"，不作为独立终稿。

## 2. 种子锚点（T0 输入，来自已有）

- **V6_发现.md** → 主线·知识载体检索（它已挖到 2506.05690、2606.25656、CS-RAG 反转、LightRAG 混合形态、知识新颖度判据，只是被"储存结构 F 族"框住；本线把它释放为主线的证据）
- **DSH 论文**《A Programming Paradigm for Spatiotemporal Composability》(北大+DeepSeek-AI 2026) → 支线·harness机制/上下文
- 既有 memory：网关不做 prompt caching、上下文预算切分代理 → 支线·上下文工程锚点

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
| **根方向员**（一次性） | 把 R-LLM 拆成 主线知识载体 + 支线(上下文/harness/记忆) + 每方向的子问题 + 种子线索 | 蓝图 + 子任务卡 |
| **调研员 Researcher** | 按任务卡 curl 检索/抓取/快照 + 写发现 | `findings/L_{id}_发现.md` + `_sources/L_{id}/` |
| **审计员 Auditor** | 判死四条件 + 时间锚定 + URL 抽检 + 快照比对 + 工作量红线 | `audit/L_{id}_审计.md` → PASS/FAIL |
| **汇总员 Synthesizer** | 跨方向横向对照 + 合成结论（推断与实证分开） | `synthesis/知识载体选型决策点_LLM时代v1.md` |
| **仲裁 Arbiter** | 冲突裁决；推断 vs 实证分类，不把 unknown 当 PROVEN | 冲突台账 |

## 5. Workflow 原则

- **时间锚定是硬约束**：每个方向的关键词/检索项都带 `sortBy=submittedDate desc`，或显式 `2024+ / 2025+ / 2026` 过滤；凡是搜到前 LLM 老货(SQL/RDF/Datalog/本体旧文)一律打回或标记"时代不符，不取"。
- **每方向独立流水线**：调研员→审计员（pipeline，不设屏障）。
- **主线优先**：知识载体(LLM时代组织/表示/可信/检索)先跑并收口成终稿；上下文/harness/记忆三支线只在支撑知识载体时并入。
- **快照+逐字**：沿用 E-RES 契约，抓原文才标 A。
- **不断、可恢复**：state.json 唯一事实源，中断重跑跳过已完成。

## 6. 待办状态（2026-08-14 批次1+2 完成后更新）

- [x] **WebSearch/WebFetch `invalid model`**：未修；curl-only workflow 已验证可行（10 叶全部 curl 抓取 abs 页成功），本线不依赖 WebSearch
- [x] **主线子问题切分粒度**：按 4 主线子线（组织/存储、表示、可信、检索）+ 3 支线（上下文/harness/记忆）切，跑成 H1~H4 系列共 10 叶
- [x] **工作量红线（A≥10）是否过高**：对窄聚焦主题用「同方向证据池共享 + 强锚点豁免」（H1-2/H2-2/H4-1/H4-2 单叶 <10 但方向内共享达标），未为凑数稀释来源
- [x] **是否加「LLM 时代知识组织综述」卡**：未加；各叶已直接覆盖全景，综述并入合成终稿 §1 决策点地图

## 7. 探索范围与剩余空间标注（2026-08-14）

**已探索（10 叶全 archived，合成终稿 `synthesis/知识载体选型决策点_LLM时代v1.md`）**：

| 方向 | 已覆盖 | 叶 |
|---|---|---|
| 方向3 上下文工程 | 解构/重构、预算/切分、压缩/记忆窗口、工具编排 | H3-1~4 |
| 方向1 harness 机制 | 自演化+准入护栏、可逆副作用/coeffects | H1-1/H1-2 |
| 方向2 检索 | 充分性/触发、失败模式/可信 | H2-1/H2-2 |
| 方向4 记忆/知识库 | 长程记忆五维、向量库/知识库形态 | H4-1/H4-2 |

**主线 4 子线覆盖度：组织/存储 ✓、可信/引用 ✓、检索 ✓、数学/科学表示 ✓（由并发 K 线 K2 叶覆盖，见 findings/K2_数学科学知识表示_发现.md，29 A 级）**

**剩余调研空间（含已标 OPEN 项）**：
1. **原型实测（最大可执行缺口）**——LLM 线 10 叶全是文献，V/S/P 系列都有原型（P1-P9）；可实测：temporal misgrounding 自有语料、原子 nugget 评分、leave-one-out 锚点校验、L0 当 ReFind 基线
2. **GPM × Studium 审计状态机差异分析**——同构是 C 级推断，逐项 diff 待做
3. **ReFind 适用边界确认**——多跳/聚合场景结构化是否反转未确认 → 分场景清单待补
4. **正文级坐实**——多数核心文献仅 abs 页；关键数值（ReFind 消融全表、PolicyKG 443 规则、EAHR 延迟）待全文核
5. **中文/非英语文献盲区**——各叶已标未扫
6. **闭源 API 退路**——attention collapse/latent critic/hidden-state 依赖模型内部；闭源须退 ZKIP/SAGE 路径（已标 OPEN）

**评估：主线已基本收敛，剩余以「验证/适配/补盲」为主，非新发现线；最大可执行缺口=原型实测。**（注：初稿曾把「数学/科学表示」列为缺口，交叉复核并发 K 线 K2 叶后修正——该叶已覆盖此主题。）