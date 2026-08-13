# B2c 时态属性图（Temporal Property Graph）先例 —— 分支调研发现

- 任务：深度调研树 B2c 分支（B2 属性图系 R3 子任务）——属性图上的时间版本建模先例（TPG）与 M09 适配性
- 调研员：B2c 分支调研员
- 日期：2026-08-12
- 环境：Windows + PowerShell，网络抓取（curl.exe / arXiv API / DBLP API / Crossref / DDG-lite / GI DL / 直连原文）
- 证据等级：A=原文到手并摘录；B=可靠二手/官方元数据页（原文未核）；C=未核或推断
- 原始证据：research_tree\tmp\b2c\（PDF 与提取 txt 均已留存，含本卡未引用的检索存档）

---

## 0 一句话结论

属性图上的时间版本建模已有成熟、可引用的先例：主流 TPG（temporal property graph）方案都把时间建模为顶点/边/属性上的**有效时间（valid time）与事务时间（transaction time）双区间**（TPGM+、T-GQL、TRPQ、Granite、TGMS、ZEP/Graphiti 等，F1/F4/F5/F6/F10/F11），查询"某时刻图状态"用**快照算子**（T-PGQL 的 `FOR TX TIME AS OF`、T-GQL 的 SNAPSHOT、TerminusDB 的 time-travel query，F2/F4/F13），工程上以 **append-only 变更日志为事实源 + 后端重放/物化**（TGMS 的 write-ahead event log、Neo4j CDC 变更流、TerminusDB git-for-data、Graphiti 的 episodes 溯源，F10/F13/F15/F16/F12）；因此 M09 的"旧结论不覆盖、复检生成新版本、遗忘不删除"可直接映射为位时属性图上的**版本追加 + assert/retract/correct 三操作**（TGMS 是最直接先例，F10），无需自研底层模型；但**时态属性图目前没有统一交换格式**，各方案用 JSON/CSV/Cypher dump/自研存储承载，M09 若需交换须自行定义格式（F3/F4/F6/F8/F9/F13/F16）。

---

## 1 逐条回答

### Q1. 时态属性图（TPG）的学术定义与综述？

- **不存在单一"标准定义"，存在一族形式化，共同点是给顶点/边/属性附加时间区间**（综述性结论，基于 F1/F5/F6/F7 归纳）：
  - **TPGM+（Rost 等, 2021, A）**：每个顶点、边、属性值都有两个时间域 Ωtx（事务时间）与 Ωval（有效时间），区间为 close-open `[ts, te)`，并给出 5 条完整性约束（元素/属性唯一、边的引用完整性、属性的引用完整性、边端点恒定、类型恒定）（F1）。
  - **TRPQ（Arenas 等, 2021, A）**：函数式定义 `G = (Ω, N, E, ρ, λ, ξ, σ)`，`ξ: (N∪E)×Ω → {true,false}` 表示元素在某时间点是否存在，`σ` 给出属性在某时间点的取值；边只能在其两端节点存在时存在（F5）。
  - **Granite（2020, A）**：`⟨vid, σ, τ⟩`，属性值带区间 `τp ⊆ τ`，并区分 static TPG（属性值在整个生命周期不变）与 dynamic TPG（属性可分段变化）（F6）。
  - **Skyline TPG（Tsoukanara 等, 2024, A）**：基于 TGraph 模型，元素对应"时间元素"（temporal element，即子区间集合），属性可随时间变化（F7）。
- **综述情况**：未检索到专门的开放获取 "Temporal Property Graph 综述" 论文（arXiv 检索 "temporal graph database survey" 0 命中）；最接近的综述性资料为 ADBIS 2022 Soliani《Models and Query Languages for Temporal Property Graph Databases》（B，原文未核，F18）与 IJGWS 2025《A Survey on Knowledge Graph Evolution: Proliferation, Dynamic Embedding, and Versioning》（B，F23）；时态维度建模对比有 BTW 2025 Finbench 论文（B，摘要到手、PDF 需登录未核，F22）。
- **结论**：TPG 是"属性图 + 时间区间标注"的模型家族，各论文自行定义、术语不统一；M09 引用时应指定具体模型（如 TPGM+ 或 TGMS 的位时模型）而非笼统称 TPG。

### Q2. 主流方案如何查询"某时刻图状态"？

- **T-PGQL（F2, A）**：在 PGQL 的 FROM/MATCH 后加 `FOR TX TIME` 子句，提供四种谓词：`AS OF {timestamp}`（某时刻快照）、`BETWEEN {t1} AND {t2}`（区间内曾可见的元素）、`FROM {t1} TO {t2}`、`ALL`（当前态+全部历史）；有效时间用 `VALID_TIME CONTAINS / OVERLAPS / PRECEDES` 谓词参与模式匹配。
- **T-GQL（F4, A）**：`SNAPSHOT` 算子返回某时刻的非时态图；`BETWEEN` 做图区间与查询区间的交；`WHEN` 支持平行周期查询（内层查询返回区间集合）。
- **TGMS（F10, A）**：快照 `G(t, tt)` 定义为"有效时间包含 t 且事务时间包含 tt 的版本集合"；所有算子接受 `as of tt`，可查询过去信念状态。
- **EDBT 2021 Temporal Graph Explorer（F17, A）**：把 snapshot retrieval（快照检索）与 graph difference（两快照之差）作为核心时态算子，基于 Gradoop 分布式执行。
- **TerminusDB（F13, A）**：time-travel query——"查询任意 commit 时刻的数据库状态"。
- **Graphiti（F12, A）**：官方文档宣称"查询当前为真、或过去任意时刻为真"。

### Q3. 属性图版本化工程先例：append-only 变更日志 + 物化视图？

- **TGMS（F10, A，最直接先例）**：所有写操作（assert/retract/correct）都经过 append-only write-ahead event log；"日志是状态与审计轨迹的事实源（source of truth）"，把日志重放到后端可复现同一 store digest；失败批次也留在日志中，重放时按原样跳过。这是"append-only 日志 + 物化后端"在属性图（含位时）上的明确实现。
- **Neo4j CDC（F15/F16, A）**：官方变更数据捕获：实时捕获节点/关系的 create/update/delete，以带 `txId`/`seq` 排序的 JSON 变更事件输出，供下游系统消费同步——即"变更流驱动外部物化/同步"的工程形态。
- **TerminusDB（F13, A）**：git-for-data：每次更新提交 commit，push/pull/clone 传 diff，任意 commit 可查——git 式版本化属性图/KG。
- **Graphiti / ZEP（F11/F12, A）**：episodes（原始输入数据）是"ground truth 流"，派生事实/边都可溯源回 episodes；事实用区间失效而非删除。
- 说明：显式命名为 "event-sourced graph" 的学术论文未检索到；TGMS（2026 预印本）是当前最接近的系统。通用事件溯源理论（Fowler、Azure 等）由 B4 分支负责，本卡不重复。

### Q4. TPG 对 M09"旧结论不覆盖、复检生成新版本"的表达力？

- **节点历史/边历史/属性历史的分开**：
  - TPGM+（F1, A）：把位时建模下沉到**属性层**（属性值也有 VAL_TIME+TX_TIME），解决 TPGM 早期版本"属性每次变更都要复制整个元素"的缺陷——属性历史与元素历史分开建模。
  - AeonG（F8, A）：把"语义变化（属性 VP/EP 部分）"与"结构变化（拓扑 VE 部分）"分开记录，各自带生命周期区间，避免拓扑不变时仍复制顶点。
  - Granite（F6, A）：static/dynamic TPG 的区分即"属性是否随时间分段变化"。
- **统一**：所有方案中"历史"统一表达为同一套区间版本机制（元素或属性的版本行带区间），快照查询从版本行重建；没有独立的"历史图"结构。
- **M09 语义映射（分析性结论，标 C）**：
  - "旧结论不覆盖"＝所有 TPG 方案的公共机制：更新/删除=关闭旧区间+开启新区间（T-GQL 的 `interval.TO = td`，F4；ZEP 的 `tinvalid`，F11；Graphiti 的 invalidated-not-deleted，F12），旧版本物理保留。
  - "复检生成新版本"＝TGMS 的 `correct`（关闭错误版本的事务时间并记录替换，旧版本永久可查）与 ZEP 的"矛盾检测→置失效时间"是直接先例（F10/F11）；若复检只是"再次掌握同一事实"，则 `assert` 追加新版本即可。
  - "遗忘"＝TGMS 的 `retract`（关闭有效时间，旧信念在其区间内仍正确）或 ZEP/Graphiti 的失效（F10/F11/F12）；物理删除在各时态方案中都不是"遗忘"的标准做法。
  - **属性历史对 M09 是必须项**：学习记录中"掌握状态"多表现为属性变化（如熟悉度、掌握度），TPGM+ 属性级位时建模（F1）比只建模节点/边历史的方案更贴合；PETGraphDB 数据也显示 IoT/动态数据中属性更新可占全部更新的 99.9%（F9，仅作建模动机转述，非性能比较）。

### Q5. TPG 的交换格式？

- **无统一 TPG 交换格式**（对 F1-F26 全部来源检索，未发现任何 TPG 交换标准；GQL 标准本身无版本/交换语义，见 B2 分支）。各方案实际承载方式：
  - BiTeGra（F3, A）：关系数据库位时表（图映射为关系）。
  - T-GQL（F4, A）：Neo4j 中把图存为 object/attribute/value 三类节点+区间属性，查询翻译成 Cypher（即 Cypher dump/导入路径可用）。
  - Granite（F6, A）：JSON 文件加载（"graphs are initially loaded into Granite from JSON files stored in HDFS"）。
  - PETGraphDB（F9, A）：自研 TIM-Tree 存储，数据项形式 `⟨e, tp, τ, v⟩`，目标"（API 和文件格式）与 Neo4j 兼容"（未实现为标准）。
  - AeonG（F8, A）：自研存储引擎（Vertex Store / Edge Store + 版本链/undo buffer）。
  - TerminusDB（F13, A）：JSON/JSON-LD/XML/Turtle 文档 + git 式 diff/commit（文档即交换单元）。
  - Neo4j CDC（F16, A）：JSON 变更事件（含 before/after 状态、operation 码）。
  - TGMS（F10, A）：JSON Schema 契约 + JSON DAG 计划 + SHA-256 摘要（结果可验证），版本行带 resource/provenance 字段。
- **结论（C）**：M09 若需与外部交换时态图数据，现有先例无互操作标准可依赖；可选路径是"JSON 事件流（CDC/TGMS 风格）+ 自定 schema"或"git 式文档仓库（TerminusDB 风格）"。

---

## 2 关键发现

**F1｜TPGM+：位时属性图模型——顶点/边/属性各有有效时间+事务时间双区间，并带完整性约束**
- 论断：Rost 等提出 TPGM+，把属性图扩展为位时模型：每个顶点、边、属性值都在两个离散时间域（Ωtx 事务时间、Ωval 有效时间）上各有一个 close-open 区间，并定义 5 条完整性约束；属性级位时是为了解决早期 TPGM"属性变更即复制整个元素"的缺陷。
- URL: https://arxiv.org/abs/2111.13499
- 标题: Bitemporal Property Graphs to Organize Evolving Systems（arXiv:2111.13499）
- 机构: Oracle + Universität Leipzig（arXiv 预印本）
- 日期: 2021-11-26（v1；2026-08-12 抓取）
- 原文摘录: "It extends the PGM mainly by adding two additional attributes to each vertex and edge that describe its validity (also denoted as lifetime) in a bitemporal way. One attribute defines the valid-time (also called application time) which describes the validity of the entity or relationship in the real world... The other attribute defines the transaction-time (also called system-time) which describes when the information about the existence of the entity or relationship was inserted into the database."；"For each TPGM+ graph, two linerary ordered discrete time domains Ω exist: Ωtx for the transaction time and Ωval for the valid-time."；约束含 "3. Referential integrity of properties. For a property value, the interval of the vertex/edge must contain the interval of the property value."
- 等级: A

**F2｜T-PGQL：FOR TX TIME AS OF/BETWEEN/FROM-TO/ALL 快照查询原语**
- 论断：T-PGQL 在 PGQL 的 MATCH 后扩展 `FOR TX TIME` 子句，用 `AS OF {timestamp}` 取某时刻图快照、`BETWEEN/FROM-TO` 取区间内曾可见元素、`ALL` 取当前态加全部历史；有效时间用 VAL_TIME 谓词参与模式匹配。
- URL: https://arxiv.org/abs/2111.13499
- 标题: Bitemporal Property Graphs to Organize Evolving Systems（arXiv:2111.13499）
- 机构: Oracle + Universität Leipzig（arXiv 预印本）
- 日期: 2021-11-26
- 原文摘录: "GraphMatch ::= 'MATCH' PathPattern OnClause? SysTimeCond"；"SysTimeCond ::= 'FOR' 'TX_TIME' ( AsOf | FromTo | BetweenAnd | 'ALL')"；"The first predicate AS OF {timestamp} is used to see the graph as it was at a specific point in time in the presence or past."
- 等级: A

**F3｜BiTeGra：基于 RDBMS 位时表的属性图存储原型**
- 论断：BiTeGra 把 TPGM+ 图存进"支持位时表的关系数据库"，查询由 T-PGQL 翻译为 SQL——即"自研序列化"之外用关系表承载时态图的先例。
- URL: https://arxiv.org/abs/2111.13499
- 标题: Bitemporal Property Graphs to Organize Evolving Systems（arXiv:2111.13499）
- 机构: Oracle + Universität Leipzig
- 日期: 2021-11-26
- 原文摘录: "The core of the system is a relational database management system with bitemporal table support. The graph data is stored in this database in a way that is described in Section 6.2."
- 等级: A

**F4｜T-GQL：区间标注属性图（ILTG）+ SNAPSHOT/BETWEEN/WHEN + "时态语义下的逻辑删除"**
- 论断：Debrouvier 等给出面向属性图的 ILTG 模型与查询语言 T-GQL；以事务时间为主线但允许有限追溯更新；删除/更新按时态语义关闭区间而非物理删除；实现为 Neo4j 上的 object/attribute/value 节点+区间属性，查询翻译为 Cypher。
- URL: https://doi.org/10.1007/s00778-021-00675-4（开放副本 tgql_vldbj_gh.pdf 到手）
- 标题: A model and query language for temporal graph databases（VLDB Journal 30:825-858）
- 机构: Springer/The VLDB Journal（作者单位 Univ. Nacional de La Plata 等）
- 日期: 2021（期刊在线出版 2021-06；抓取 2026-08-12）
- 原文摘录: "Transaction time is considered in the remainder, that is, the time where the information is stored in the database, opposite to valid time, which reflects the time where the data is valid in the real world."；"A deletion of a node or edge is performed in the temporal database sense. That means, only currently existing objects can be deleted. Informally, when deleting a node n at time td, Now is replaced by td in interval.TO."；"The SNAPSHOT operator, which allows retrieving the state of the graph at a certain point in time."
- 等级: A

**F5｜TRPQ：时态属性图的函数式形式化（Definition III.1）**
- 论断：Arenas 等把 TPG 形式化为 `G=(Ω,N,E,ρ,λ,ξ,σ)`，其中 ξ 判定元素在某时间点是否存在、σ 给出属性在某时间点的取值；并给出区间标注的紧凑表示与时间正则路径查询语言。
- URL: https://arxiv.org/abs/2107.01241
- 标题: Temporal Regular Path Queries（arXiv:2107.01241）
- 机构: PUC Chile / Univ. of Edinburgh 等（arXiv 预印本）
- 日期: 2021-07-02（v1）
- 原文摘录: "A temporal property graph (TPG) is a tuple G = (Ω, N, E, ρ, λ, ξ, σ), where... ξ : (N ∪ E) × Ω → {true, false} is a function that maps a node or an edge, and a time point to a Boolean."；"Function ξ indicates whether a node or an edge exists at a given time point in Ω (which corresponds to true). Finally, function σ indicates the value of a property for a node or an edge at a given time point in Ω."
- 等级: A

**F6｜Granite：分布式 TPG 查询引擎的形式化模型（静态/动态 TPG）+ JSON 加载**
- 论断：Granite 给出带类型顶点/边/属性生命周期的 TPG 定义，属性区间 `τp ⊆ τ`；区分 static（属性值全程不变）与 dynamic（属性分段变化）TPG；实验图从 HDFS 上的 JSON 文件加载。
- URL: https://arxiv.org/abs/2002.03274
- 标题: A Distributed Path Query Engine for Temporal Property Graphs（arXiv:2002.03274）
- 机构: IBM Research（arXiv 预印本）
- 日期: 2020-02-08（v1）
- 原文摘录: "We formally define a temporal property graph as a directed graph G = (V, E, PV, PE)... each vertex ⟨vid, σ, τ⟩ ∈ V is a tuple with a unique vertex ID, vid, a vertex type (or schema) σ, and the lifespan of existence of the vertex given by the interval, τ = [ts, te)."；"A static temporal property graph is a restricted version of the temporal property graph such that τp = τ... Temporal property graphs without this restriction are called dynamic temporal property graphs"；"The graphs are initially loaded into Granite from JSON files stored in HDFS"
- 等级: A

**F7｜Skyline TPG：基于 TGraph 的时间元素（区间集合）建模**
- 论断：Tsoukanara 等在 TGraph 基础上定义 TPG：元素对应子区间集合（temporal element），属性可随时间变化，支持 static 与 time-varying 属性，并给出并/交/差等图算子。
- URL: https://arxiv.org/abs/2401.14352
- 标题: Skyline-based exploration of temporal property graphs（arXiv:2401.14352；期刊版 Information Systems Frontiers 25:921-940, 2024）
- 机构: University of Ioannina / University of Patras（arXiv 预印本）
- 日期: 2024-01-25（v1）
- 原文摘录: "Specifically, we define a temporal property graph based on the TGraph model [16], additionally, supporting property values that can change with time."；"Definition 1 (Temporal Property Graph) A temporal property graph is defined as a tuple G[T] = (N, E, ρ, λ, ξT, σT), where... ξT : (N ∪ E) → T′ is a function that maps a node or an edge, to a set T′ of time subintervals of T"
- 等级: A

**F8｜AeonG：anchor+delta 混合存储（current/historical 双存储）**
- 论断：AeonG 为图数据库内建时态支持，存储引擎分"当前存储"与"历史存储"，历史部分用 anchor+delta 策略压缩（周期建完整版本 anchor，相邻 anchor 之间只存变化 delta）；查询引擎用 anchor 基版本检索跳过不必要的版本遍历。
- URL: https://www.vldb.org/pvldb/vol17/p1515-lu.pdf
- 标题: AeonG: An Efficient Built-in Temporal Support in Graph Databases（PVLDB 17(6):1515-1527）
- 机构: Renmin University of China（PVLDB）
- 日期: 2024（PVLDB Vol.17 No.6；DOI 10.14778/3648160.3648187）
- 原文摘录: "Our storage engine is hybrid, with one current storage to manage the most recent versions of graph objects, and another historical storage to manage the previous versions of graph objects."；"we propose a novel anchor+delta strategy, in which we periodically create a complete version (namely anchor) of a graph object, and maintain every change (namely delta) between two adjacent anchors of the same object."
- 等级: A

**F9｜PETGraphDB：valid-time 属性演化模型 + 属性分段值 + Neo4j 兼容目标**
- 论断：PETGraphDB 面向"属性演化时态图"（PETG）：采用 valid-time 时态属性图模型；属性值按时间分段存储（如 `8:00~8:15 "Slow"`）；设计目标含"（API 与文件格式）与 Neo4j 兼容"与高效 Entity-History 查询。
- URL: https://arxiv.org/abs/2512.05417
- 标题: PETGraphDB: A Property Evolution Temporal Graph Data Management System（arXiv:2512.05417）
- 机构: Beihang University（arXiv 预印本）
- 日期: 2025-12-05（v1）
- 原文摘录: "PETGraphDB adopts a valid-time temporal property graph model, which models temporal data features with transactions."；属性示例 "status 8:00~8:15 'Slow' 8:15~8:20 'Jam' 8:20~8:45 'Smooth' 8:45~Now 'Slow'"；"PETGraphDB should provide (API and file format) compatibility with Neo4j, the most popular graph data management system."
- 等级: A

**F10｜TGMS：append-only write-ahead 事件日志 + assert/retract/correct——M09 最直接先例**
- 论断：Zhang 提出 agent 原生的位时属性图系统 TGMS：稳定身份+多版本（半开 valid-time 与 transaction-time 区间）；写 API 仅三个位时操作 assert（登记新信念并切分重叠区间）/retract（关闭有效时间）/correct（关闭错误版本的事务时间并记录替换）；所有写通过 append-only 日志，日志是状态与审计的事实源，重放进后端复现同一 store digest；用属性测试验证"位时不可变性"（过去 as-of 结果在后续纠正后逐字节不变）。
- URL: https://arxiv.org/abs/2607.10265
- 标题: TGMS: An Agent-Native Bi-Temporal Graph Management System（arXiv:2607.10265）
- 机构: University of Memphis（arXiv 预印本）
- 日期: 2026-07
- 原文摘录: "All writes pass through an append-only write-ahead event log. The log records every attempted batch together with its deterministic outcome... In this sense the log is the source of truth for state and audit trail for attempts. Replaying it into a backend reproduces the same store digest."；"correct closes the transaction time of an erroneous version and records its replacement (we were wrong; the record of the error is preserved)."；"results pinned to a past as of tt remain byte-identical after later corrections. We call the second property bi-temporal immutability."
- 等级: A

**F11｜ZEP：位时四时间戳 + LLM 矛盾检测→失效旧边而非删除**
- 论断：ZEP（时态知识图/agent 记忆架构）按位时建模：事务时间 `t'created/t'expired` 与有效时间 `tvalid/tinvalid` 四时间戳存于边上；检测到时间重叠矛盾时把旧边 `tinvalid` 置为新边 `tvalid`（失效而非删除）；episodes 保存原始数据作溯源。
- URL: https://arxiv.org/abs/2501.13956
- 标题: ZEP: A Temporal Knowledge Graph Architecture for Agent Memory（arXiv:2501.13956）
- 机构: Zep AI（arXiv 预印本）
- 日期: 2025-01-23（v1）
- 原文摘录: "Consistent with our bi-temporal modeling approach, the system tracks four timestamps: t′created and t′expired ∈ T′ monitor when facts are created or invalidated in the system, while tvalid and tinvalid ∈ T track the temporal range during which facts held true."；"When the system identifies temporally overlapping contradictions, it invalidates the affected edges by setting their tinvalid to the tvalid of the invalidating edge."
- 等级: A

**F12｜Graphiti：时态上下文图——validity window + episodes 溯源 + "失效而非删除"**
- 论断：Graphiti 把知识图建成"时态上下文图"：每个事实有 validity window（何时为真、何时被取代）；实体随时间演化；一切派生事实可溯源回 episodes（原始数据流）；信息变化时旧事实"失效而非删除"。
- URL: https://github.com/getzep/graphiti
- 标题: Graphiti（官方 README，"Build Real-Time Knowledge Graphs for AI Agents"）
- 机构: Zep（开源项目，GitHub getzep/graphiti，Apache-2.0）
- 日期: 仓库 2024-08 创建；README 抓取 2026-08-12
- 原文摘录: "Unlike traditional knowledge graphs, each fact in a context graph has a validity window: when it became true, and when (if ever) it was superseded."；"Temporal Fact Management: Facts have validity windows. When information changes, old facts are invalidated — not deleted. Query what's true now, or what was true at any point in time."
- 等级: A

**F13｜TerminusDB：git-for-data——commit 版本 + time-travel 查询 + JSON/JSON-LD 文档**
- 论断：TerminusDB 是"git for data"式图数据库：每次更新提交 commit、可 push/pull/clone 传 diff、可查询任意 commit 状态；数据承载为 JSON/JSON-LD/XML/Turtle 文档，查询用 WOQL/GraphQL/REST。
- URL: https://github.com/terminusdb/terminusdb
- 标题: TerminusDB（官方 README）
- 机构: TerminusDB 项目（GitHub terminusdb/terminusdb）
- 日期: README 抓取 2026-08-12
- 原文摘录: "TerminusDB is a distributed database with a collaboration model — git for data."；"Revision Control: Commits for every update — track changes over time"；"Time-Travel Queries: Query any state of the database at any commit"；"Document + Knowledge Graph: Link JSON documents in a knowledge graph"
- 等级: A

**F14｜Neo4j 官方时间值类型（仅背景）：Cypher 内建时态值可作节点/关系属性，无内建位时语义**
- 论断：Neo4j 官方 Cypher Manual 提供 DATE/LOCAL TIME/ZONED TIME/LOCAL DATETIME/ZONED DATETIME/DURATION 等时态值类型，可存为节点/关系属性；官方文档不提供内建的 valid/transaction time 版本语义（本卡仅作背景，不展开厂商功能）。
- URL: https://neo4j.com/docs/cypher-manual/current/values-and-types/temporal/
- 标题: Temporal values - Cypher Manual
- 机构: Neo4j, Inc.（官方文档）
- 日期: 抓取 2026-08-12（旧路径 /modeling/time/ 已 404）
- 原文摘录: "Cypher® has built-in support for handling temporal values, which can be stored as properties on nodes and relationships in Neo4j databases."
- 等级: A

**F15｜Neo4j CDC：实时变更捕获/变更流驱动下游同步的工程先例**
- 论断：Neo4j 5.13+ 官方提供 Change Data Capture：实时捕获节点/关系上的 create/update/delete，输出供其他系统消费以保持同步——即"图数据库变更流 + 外部物化"的官方工程形态。
- URL: https://neo4j.com/docs/cdc/current/
- 标题: Introduction - Change Data Capture（Neo4j 官方文档）
- 机构: Neo4j, Inc.
- 日期: 抓取 2026-08-12（文档标注 "Introduced in 5.13"）
- 原文摘录: "Change Data Capture (CDC) allows you to capture and track changes to your database in real-time, enabling you to keep your other data sources up to date with Neo4j. With CDC, you can identify and respond to changes (create, update, and delete) on nodes and relationships as they happen, and integrate these changes into other systems and applications."
- 等级: A

**F16｜Neo4j CDC 变更事件格式：JSON（txId/seq 排序、before/after、operation 码）**
- 论断：Neo4j CDC 的变更事件为 JSON 对象：含变更唯一 id、txId（事务号，与 seq 组合唯一）、seq（事务内排序）、metadata（执行用户/捕获模式/事务提交时间等）与 event（elementId、eventType、state.before/after、operation 码）——可作为"时态图 JSON 事件流"的现成格式参考。
- URL: https://neo4j.com/docs/cdc/current/procedures/output-schema/
- 标题: Format of change events - Change Data Capture（Neo4j 官方文档）
- 机构: Neo4j, Inc.
- 日期: 抓取 2026-08-12
- 原文摘录: JSON 示例节选：`{"id": "A7fjWXMK_...", "txId": 12, "seq": 0, "metadata": {"executingUser": "neo4j", ..., "txCommitTime": "2023-03-03T11:58:30.526Z"}, "event": {"elementId": "4:...", "eventType": "n", "state": {"before": null, "after": {"properties": {...}, "labels": ["MOVIE"]}}, "operation": "c", "labels": ["MOVIE"]}}`；"A number identifying which transaction the change happened in, unique in combination with seq."
- 等级: A

**F17｜EDBT 2021 Temporal Graph Explorer：快照检索 + 图差分 + Gradoop 分布式 TPG 算子**
- 论断：Rost 等演示 Temporal Graph Explorer：以 Gradoop 的 TPGM（位时语义）为核心，提供 snapshot retrieval（快照检索）、graph difference（两快照差）等可组合时态算子，并支持大数据集分布式分析。
- URL: https://openproceedings.org/2021/conf/edbt/p178.pdf（DOI 10.5441/002/edbt.2021.83）
- 标题: Exploration and Analysis of Temporal Property Graphs（EDBT 2021）
- 机构: Universität Leipzig（EDBT 2021, p178）
- 日期: 2021
- 原文摘录: "Besides retrieving a snapshot from a past graph state or calculating the difference between two graph snapshots, users can use our application to visually experience these advanced temporal operators"；"Its Temporal Property Graph Model (TPGM) [8] enables modeling and analysis of graphs with bitemporal time semantics."
- 等级: A

**F18｜ADBIS 2022 Soliani：TPG 模型与查询语言综述性短文（B 级，原文未核）**
- 论断：Soliani 在 ADBIS 2022 短文综述 TPG 数据库的模型与查询语言（Springer CCIS 623-630）；Springer 摘要页与 Crossref 元数据可核，但 PDF 抓取被拒（Hasselt 服务器拒绝、Springer 付费墙），原文细节未核。
- URL: https://doi.org/10.1007/978-3-031-15743-1_57
- 标题: Models and Query Languages for Temporal Property Graph Databases
- 机构: Springer（Communications in Computer and Information Science）
- 日期: 2022
- 原文摘录: （原文未到手，仅题录与页码 623-630；Crossref 元数据无摘要）——未核
- 等级: B

**F19｜Andriamampianina 等 2022：Querying Temporal Property Graphs（B 级，原文未核）**
- 论断：Springer LNCS 收录的 TPG 查询论文（pp.355-370），属 TPG 查询语言研究线；原文未到手（付费墙）。
- URL: https://doi.org/10.1007/978-3-031-07472-1_21
- 标题: Querying Temporal Property Graphs
- 机构: Springer（Lecture Notes in Computer Science）
- 日期: 2022
- 原文摘录: （仅题录；Crossref 元数据无摘要）——未核
- 等级: B

**F20｜Betsche 等 2024：Towards a Temporal Graph Query Language for Durable Patterns（B 级，原文未核）**
- 论断：SSDBM 2024 短文（13:1-13:4），面向"持久模式"的时态图查询语言；Crossref 元数据无摘要，原文未到手。
- URL: https://doi.org/10.1145/3676288.3676303
- 标题: Towards a Temporal Graph Query Language for Durable Patterns
- 机构: ACM（SSDBM 2024）
- 日期: 2024
- 原文摘录: （仅题录）——未核
- 等级: B

**F21｜Vijitbenjaronk 等 2017：Scalable time-versioning support for property graph databases（B 级，原文未核）**
- 论断：IEEE BigData 2017（pp.1580-1589）给出属性图数据库的可扩展时间版本化支持；DBLP 标注 access=closed，原文未到手。
- URL: https://doi.org/10.1109/BIGDATA.2017.8258092
- 标题: Scalable time-versioning support for property graph databases
- 机构: IEEE（IEEE BigData 2017；作者 IBM Research）
- 日期: 2017
- 原文摘录: （仅题录）——未核
- 等级: B

**F22｜BTW 2025：RDF 与属性图模型的时态维度基准（FinBench）（B 级，摘要到手、PDF 未核）**
- 论断：Hahn/Hofer/Rahm 用 FinBench 事务工作负载对比 PGM 与 RDF 的时态数据表示（BTW 2025, pp.1043-1054）；GI DL 摘要页可核，PDF 需登录未到手；本卡仅引其存在与问题域，不引其性能数字（禁止性能比较）。
- URL: https://doi.org/10.18420/BTW2025-69
- 标题: Benchmarking the RDF and Property Graph Model in the Temporal Dimension - A Case Study with Finbench
- 机构: Universität Leipzig（BTW 2025, Gesellschaft für Informatik）
- 日期: 2025-03
- 原文摘录（摘要页）: "we benchmark the performance of temporal data representations in the property graph model (PGM) and RDF model using the FinBench transaction workload... Our findings highlight key challenges in representing FinBench data in RDF, like missing functions of the SPARQL language in addressing certain query requirements."
- 等级: B

**F23｜IJGWS 2025：知识图谱演化综述（含 versioning）（B 级，原文未核）**
- 论断：International Journal of Web and Grid Services 2025 收录《A Survey on Knowledge Graph Evolution: Proliferation, Dynamic Embedding, and Versioning》，覆盖 KG 版本化维度；Crossref 元数据无摘要，原文未到手。
- URL: https://doi.org/10.1504/ijwgs.2025.10069835
- 标题: A Survey on Knowledge Graph Evolution: Proliferation, Dynamic Embedding, and Versioning
- 机构: Inderscience（Int. J. Web and Grid Services）
- 日期: 2025
- 原文摘录: （仅题录）——未核
- 等级: B

**F24｜Jiang 等 2026：与静态图兼容的时态属性图数据模型（B 级，原文未核）**
- 论断：Int. J. Sensor Networks 50(3):186-199 收录"与静态图兼容的 TPG 数据模型及其时态图查询语言"；DBLP 标注 access=closed，原文未到手。
- URL: https://doi.org/10.1504/IJSNET.2026.152180
- 标题: A temporal property graph data model compatible with static graphs and its temporal graph query language
- 机构: Inderscience（Int. J. Sensor Networks）
- 日期: 2026
- 原文摘录: （仅题录）——未核
- 等级: B

**F25｜Orlando 等 2023：TGV——时态属性图数据库可视化工具（B 级，原文未核）**
- 论断：Information Systems Frontiers 25:1543-1564 收录 TGV（TPG 可视化工具），说明 TPG 已进入工具层；原文未到手。
- URL: https://doi.org/10.1007/s10796-023-10426-1
- 标题: TGV: A Visualization Tool for Temporal Property Graph Databases
- 机构: Springer（Information Systems Frontiers）
- 日期: 2023
- 原文摘录: （仅题录）——未核
- 等级: B

**F26｜Bollen 2022：Querying Sensor Networks Using Temporal Property Graphs（B 级，原文未核）**
- 论断：Springer CCIS（pp.607-614）收录用 TPG 查询传感器网络的短文，属 TPG 应用线；原文未到手。
- URL: https://doi.org/10.1007/978-3-031-15743-1_55
- 标题: Querying Sensor Networks Using Temporal Property Graphs
- 机构: Springer（Communications in Computer and Information Science）
- 日期: 2022
- 原文摘录: （仅题录）——未核
- 等级: B

---

## 3 冲突与张力

1. **单轴 vs 双轴（valid time vs transaction time）**：T-GQL 明确以事务时间为主线（"Transaction time is considered in the remainder"）仅允许有限追溯更新（F4）；PETGraphDB 明确"支持 valid-time 而非 transaction-time"（F9）；TPGM+、TGMS、ZEP 则是双轴（F1/F10/F11）。对 M09：若只需"当前掌握状态+历史版本"可单轴；若要审计"当时记录 vs 后来纠正"（复检/纠正对照）必须双轴——此取舍需上游任务卡明确（分析性结论 C）。
2. **属性历史建模成本**：TPGM 早期模型"属性变更=复制整元素"导致大量重复（F1 原文明说 "High frequent changes of properties and their values thus result in a huge amount of duplicated elements"）；TPGM+ 才把位时下沉到属性层；AeonG 把语义变化与拓扑变化分开（F8）；PETGraphDB 也指出属性更新占 IoT 数据更新的大头（F9）。→ M09 若记录属性级掌握状态，必须采用属性级时间建模，否则存储爆炸（分析性结论 C）。
3. **"失效/关闭区间" vs "变更事件流"**：时态图方案统一用"关闭区间"表达删除/纠正（T-GQL interval.TO、ZEP tinvalid、Graphiti invalidated-not-deleted、TGMS retract/correct，F4/F11/F12/F10）；而 CDC 变更流（Neo4j，F15/F16）输出的是 create/update/delete 事件。两者层次不同：位时区间是状态语义，事件流是传输语义；M09 若同时用两者需明确映射（分析性结论 C）。
4. **无统一交换格式 vs 互操作需求**：所有 TPG 方案各自定义存储/序列化（RDBMS 表、Neo4j+Cypher、JSON 文件、自研引擎、JSON 事件流、git 式文档，F3/F4/F6/F8/F9/F13/F16），无 TPG 交换标准；这与 B2 分支"GQL 标准无版本/交换语义"的发现一致。M09 的"可交换"诉求无现成标准可依赖（C）。
5. **"TPG" 术语不统一**：同一名称在不同论文中形式化不同（TPGM+ 双域区间、TRPQ 存在函数 ξ、Skyline/TGraph 时间元素集合、Granite 静态/动态区分，F1/F5/F7/F6）；引用和实现时必须指定具体模型，否则语义歧义。
6. **复检/纠正的审计语义**：TGMS 的 correct 关闭的是"错误版本的事务时间"并永久保留错误记录（F10），而 ZEP 的矛盾处理是"新信息优先、置旧边失效"（F11）。"纠正后旧结论是否仍可见"两种策略不同：TGMS 中 as-of 过去时间仍返回旧值，ZEP 中失效即不再作为当前事实。M09 需明确复检后旧结论的可见性策略（C）。

---

## 4 未决问题

1. **M09 是否需要双时间轴**：任务卡未给需求粒度。若只要求"当前掌握状态+历史版本"，valid-time 单轴即可；若要求"记录时 vs 纠正后"对照审计，需 transaction-time 双轴。需上游任务卡澄清（C）。
2. **"复检/遗忘/重新掌握"与 TGMS assert/retract/correct 的精确对应**："复检"更接近 correct（纠正错误版本）还是 assert（追加新版本）取决于"复检后旧结论是否仍被视为当时正确"；"遗忘"对应 retract（事实不再为真）还是 invalidate（新信息压制旧信息）取决于语义。需上游确认（C）。
3. **Springer 系 TPG 论文原文未核**：Soliani ADBIS 2022（F18）、Andriamampianina 2022（F19）、Orlando 2023（F25）、Bollen 2022（F26）均在付费墙后，摘要级元数据核到、全文未核；它们可能含本卡未覆盖的模型细节。
4. **无时态属性图交换标准**：未检索到任何 TPG 交换格式标准；若 M09 需要，只能参照 JSON 事件流（Neo4j CDC / TGMS 风格）或 git 式文档（TerminusDB 风格）自定（C）。
5. **TGMS 为 2026-07 arXiv 预印本**：未经同行评审（arXiv 状态未核）；其"位时不可变性"为属性测试验证，未见第三方复现。引用时需注明预印本性质。
6. **BTW 2025 Finbench 论文全文**：GI DL 需登录，仅摘要核到（F22）；其建模对比细节（RDF reification/RDF-star 与 PGM 的时态表示差异）未核到全文。
7. **Neo4j 官方时间建模文档路径已失效**：旧 /modeling/time/ 与 /temporal-values/ 路径 404（抓取存档见 tmp/b2c），新路径 /values-and-types/temporal/ 有效；历史文档内容（如时间建模最佳实践）未核。

---

## 5 来源清单

| # | 来源 | 类型 | 等级 | 原文到手 |
|---|------|------|------|----------|
| S1 | Rost et al., Bitemporal Property Graphs to Organize Evolving Systems（arXiv:2111.13499, 2021）https://arxiv.org/abs/2111.13499 | 学术论文（arXiv） | A | 是 |
| S2 | Zhang, TGMS: An Agent-Native Bi-Temporal Graph Management System（arXiv:2607.10265, 2026）https://arxiv.org/abs/2607.10265 | 学术论文（arXiv） | A | 是 |
| S3 | Rasmussen et al., ZEP: A Temporal Knowledge Graph Architecture for Agent Memory（arXiv:2501.13956, 2025）https://arxiv.org/abs/2501.13956 | 学术论文（arXiv） | A | 是 |
| S4 | Hou et al., AeonG（PVLDB 17(6):1515-1527, 2024）https://www.vldb.org/pvldb/vol17/p1515-lu.pdf | 学术论文（PVLDB） | A | 是 |
| S5 | Debrouvier et al., A model and query language for temporal graph databases（VLDB J. 30:825-858, 2021）https://doi.org/10.1007/s00778-021-00675-4 | 学术论文（期刊） | A | 是 |
| S6 | Arenas et al., Temporal Regular Path Queries（arXiv:2107.01241, 2021）https://arxiv.org/abs/2107.01241 | 学术论文（arXiv） | A | 是 |
| S7 | Tsoukanara et al., Skyline-based exploration of temporal property graphs（arXiv:2401.14352, 2024）https://arxiv.org/abs/2401.14352 | 学术论文（arXiv/ISF） | A | 是 |
| S8 | Song et al., PETGraphDB（arXiv:2512.05417, 2025）https://arxiv.org/abs/2512.05417 | 学术论文（arXiv） | A | 是 |
| S9 | A Distributed Path Query Engine for Temporal Property Graphs（arXiv:2002.03274, 2020）https://arxiv.org/abs/2002.03274 | 学术论文（arXiv） | A | 是 |
| S10 | Rost et al., Exploration and Analysis of Temporal Property Graphs（EDBT 2021, p178）https://openproceedings.org/2021/conf/edbt/p178.pdf | 学术论文（会议） | A | 是 |
| S11 | Graphiti 官方 README（GitHub getzep/graphiti）https://github.com/getzep/graphiti | 工程开源文档 | A | 是 |
| S12 | TerminusDB 官方 README（GitHub terminusdb/terminusdb）https://github.com/terminusdb/terminusdb | 工程开源文档 | A | 是 |
| S13 | Neo4j Cypher Manual: Temporal values https://neo4j.com/docs/cypher-manual/current/values-and-types/temporal/ | 厂商官方文档 | A | 是 |
| S14 | Neo4j CDC: Introduction https://neo4j.com/docs/cdc/current/ | 厂商官方文档 | A | 是 |
| S15 | Neo4j CDC: Format of change events https://neo4j.com/docs/cdc/current/procedures/output-schema/ | 厂商官方文档 | A | 是 |
| S16 | Soliani, Models and Query Languages for Temporal Property Graph Databases（ADBIS 2022, Springer CCIS）https://doi.org/10.1007/978-3-031-15743-1_57 | 学术论文（Springer） | B | 否 |
| S17 | Andriamampianina et al., Querying Temporal Property Graphs（2022, Springer LNCS）https://doi.org/10.1007/978-3-031-07472-1_21 | 学术论文（Springer） | B | 否 |
| S18 | Bollen, Querying Sensor Networks Using Temporal Property Graphs（2022, Springer CCIS）https://doi.org/10.1007/978-3-031-15743-1_55 | 学术论文（Springer） | B | 否 |
| S19 | Betsche et al., Towards a Temporal Graph Query Language for Durable Patterns（SSDBM 2024）https://doi.org/10.1145/3676288.3676303 | 学术论文（ACM） | B | 否 |
| S20 | Orlando et al., TGV: A Visualization Tool for TPG Databases（ISF 2023）https://doi.org/10.1007/s10796-023-10426-1 | 学术论文（Springer） | B | 否 |
| S21 | Jiang et al., A temporal property graph data model compatible with static graphs...（IJSNET 2026）https://doi.org/10.1504/IJSNET.2026.152180 | 学术论文（Inderscience） | B | 否 |
| S22 | Vijitbenjaronk et al., Scalable time-versioning support for property graph databases（IEEE BigData 2017）https://doi.org/10.1109/BIGDATA.2017.8258092 | 学术论文（IEEE） | B | 否 |
| S23 | Hahn/Hofer/Rahm, Benchmarking the RDF and Property Graph Model in the Temporal Dimension（BTW 2025）https://doi.org/10.18420/BTW2025-69 | 学术论文（BTW/GI） | B | 摘要到手/PDF 未核 |
| S24 | A Survey on Knowledge Graph Evolution: Proliferation, Dynamic Embedding, and Versioning（IJGWS 2025）https://doi.org/10.1504/ijwgs.2025.10069835 | 学术论文（Inderscience） | B | 否 |
| S25 | Semantic Scholar API 检索（temporal property graph）https://api.semanticscholar.org/ | 学术检索（API） | C（未核，HTTP 429 限流） | 否 |
| S26 | arXiv API 检索存档（arxiv_tpg.xml / arxiv_bi_temporal_graph.xml / arxiv_event_sourcing_graph.xml / arxiv_temporal_graph_survey.xml / arxiv_tgdb_survey.xml）http://export.arxiv.org/api/query | 学术检索（API） | C（检索记录，非证据） | 否 |
| S27 | DBLP API 检索存档（dblp_tpg.json / dblp_temporal_graph_query_language.json / dblp_vijit.json / dblp_btw.json）https://dblp.org/search/publ/api | 学术检索（API） | C（检索记录，非证据） | 否 |
| S28 | Neo4j 旧文档路径 /modeling/time/ 与 /temporal-values/ | 厂商文档（失效） | C（404 未核） | 否 |
| S29 | Leipzig 博士论文（Leipzig University dissertation, Anubis 反爬拦截） | 学术论文（未核） | C（未核） | 否 |

统计：A=15，B=9，C=5；可核来源（A+B）=24（红线≥15）；原文到手（A）=15（红线≥10）；来源类型≥3（学术论文 arXiv/PVLDB/VLDBJ/EDBT/Springer/IEEE/BTW、工程开源文档 Graphiti/TerminusDB、厂商官方文档 Neo4j Manual/CDC）；候选逐一查证 19 项（TPGM+/BiTeGra、T-PGQL、T-GQL、TRPQ、Granite、Skyline TPG、AeonG、PETGraphDB、TGMS、ZEP、Graphiti、TerminusDB、Neo4j temporal、Neo4j CDC、EDBT Explorer、Soliani、Andriamampianina、Betsche、Vijitbenjaronk、BTW、IJGWS、IJSNET、TGV、Bollen 等，远超 5）；关键词组≥4（中文 4 组：时态属性图综述/建模、属性图位时间版本、事件溯源图物化、图时间查询语言；英文另 4 组）。

---

## 6 判死自查

1. **是否越界到 B4（通用时间版本理论）？** 否。本卡只在属性图语境引用位时概念（TPGM+/T-GQL/TGMS 等的属性图时间区间与快照算子）；SQL:2011 等通用位时理论未展开（由 B4 分支负责），仅在 T-PGQL 语法说明中顺带提及"类似 SQL 时态表扩展"。
2. **是否做厂商性能比较/评测？** 否。AeonG、PETGraphDB 论文中的性能数字（如存储压缩倍数、查询延迟）一律未引用、未比较；只引用机制性事实（anchor+delta 策略、存储结构、建模目标）。
3. **是否捏造来源？** 否。每条论断附 URL+标题+机构+日期+原文摘录；抓不到的（Springer 系全文、BTW PDF、Hasselt PDF、Leipzig 博士论文、Neo4j 旧文档路径）明确标注"未核"，未虚构任何摘录。
4. **推断是否标 C？** 是。M09 语义映射（Q4）、单/双轴取舍、交换格式建议、复检可见性策略等分析性结论均明确标注 C。
5. **工作量红线**：可核来源（A+B）=24≥15；原文到手（A）=15≥10；来源类型≥3（学术为主）；候选逐一查证 19≥5；关键词组≥4。全部达标。
6. **产出完整性**：本文件含 0 一句话结论 / 1 逐条回答 / 2 关键发现（F1-F26）/ 3 冲突与张力 / 4 未决 / 5 来源清单 / 6 判死自查 全部七节。