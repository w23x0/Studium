# B3 Datalog/逻辑编程范式作为图谱存储语言 —— 分支调研发现

- 任务：深度调研树 B3 分支（任务卡 `research_tree\tasks\B3_Datalog.md`）
- 调研员：B3 分支调研员
- 日期：2026-08-12
- 环境：Windows + PowerShell，网络抓取（curl.exe / IA Scholar / 直连原文 / Crossref）
- 证据等级：A=原文到手并摘录；B=可靠二手/官方元数据（Crossref/DBLP/索引页可核，未抓原文）；C=明确标注的分析性归纳（推断）

---

## 0 一句话结论

把 M08 的"表示层事实 + 审计门控 + 不变量层"与 M09 的"规模单调增长、新版本不覆盖旧结论"映射到 Datalog 是**语义上成立且已有先例**的建模：表示层/审计裁决作 EDB（事实集）、派生与校验谓词作 IDB（规则集），"候选池晋升门控、封闭词表、校验即查询"都可用**分层否定 + 聚合**（必要时加 choice/时序列）表达，增量求值（DDlog/差分数据流/DBSP/RDFox/LogicBlox）对"复检出新版本后自动更新派生结论"有成熟适配；但"当前视图=最新版本"是非单调查询，与 Datalog 的单调事实层必须分开建模，且"纯文本事实可 grep"与 JSONL 的取舍是**语法层面**（转义/解析）而非优劣预设——Datalog 化不自动增强校验强度，"稳定性仍来自验证程序本身"。

---

## 1 逐条回答

### Q1. M08 建模为 EDB（事实集）+ IDB（推导规则）：候选池到审计晋升的门控、封闭边词表、不变量层/表示层区分，能否用纯 Datalog 规则表达？哪些需要聚合/否定/半正 Datalog 等扩展？

- **EDB/IDB 是 Datalog 的标准分层**（A 级）：CGT89 原文定义"a set of ground facts, called the Extensional Database (EDB), physically stored in a relational database, and a Datalog program P called the Intensional Database (IDB)"；"IDB relations are not stored explicitly, and correspond to relational views"。LogicBlox（SIGMOD 2015）工程化同一概念："Each predicate may be declared as being either a base predicate (a.k.a. extensional or EDB predicate or relation), or a derived predicate (a.k.a. intensional or IDB predicate)… Base predicates contain input data and derived predicates are views over the base data."
- **M08 映射建议（分析性归纳 C1，非唯一方案）**：
  - EDB（表示层事实 + 审计裁决 + 词表事实）：每份资料各自的节点/边/锚点事实（`apostol:`/`strang:` 命名空间，节点身份=锚点集合）、`alias-of` 别名边事实、审计裁决事实（`auditA_pass(X)`/`auditB_pass(X)`，由人工审计落盘）、封闭关系词表事实 `valid_rel(9+1)`、节点类型事实 `valid_type(4)`、教材源文本事实（若要把锚点校验也查询化）。
  - IDB（推导层）：`accepted(X) :- candidate(X), auditA_pass(X), auditB_pass(X).`（晋升门控）；`same_object(A,B) :- ...`（锚点集合判等）；不变量层（`x:` 跨教材对齐）派生谓词；`violation(...)` 校验谓词；`ceiling(L)` 天花板判定。
- **哪些纯 Datalog（无否定）可表达**：
  - 晋升门控的正向部分：`accepted(X) :- candidate(X), auditA_pass(X), auditB_pass(X).` 是纯 Datalog 规则（安全、单调）。
  - 不变量层/表示层区分：与 EDB/IDB 区分同构——表示层事实全在 EDB，不变量层/派生结论全在 IDB，由规则定义，不显式存储。
  - 封闭边词表的"合法方向"：正向表驱动（`edge` 的 rel 列与 `valid_rel` 表做连接）是纯 Datalog。
- **哪些需要扩展**：
  - **否定**：词表"不合法"、候选"未审计/未通过"、"尚未晋升"都需否定。若否定只作用于 EDB 谓词（裁决/词表事实），即**半正 Datalog**（程序整体仍单调，适合"只追加审计裁决、只增不撤"的语义）；若否定作用到 IDB 谓词（如天花板判定 `!atLeastTwo(L)`），需**分层否定**（stratified negation）。Soufflé 规范原文："Not all negations are semantically permissible… Technically, rules involving negation must be stratifiable."；"Negated literals do not bind variables"（安全变量仍需正绑定）。CGT89 原文说明纯 Datalog 的局限："In pure Datalog, there is no way to represent such a rule"（本科生=学生且非研究生示例）。
  - **聚合**：停止规则"某层存活 <2 ⇒ 该层就是当前语料的抽象天花板"需要 count/门槛；Soufflé 提供 min/max/sum/count 聚合。也可用"两两不同存在"（`atLeastTwo(L) :- survives(X,L), survives(Y,L), X != Y`）改写为分层否定+不等式，不引入聚合算子。
  - **状态/时间**：晋升是"候选→已审计→已接受"的状态转变。静态 Datalog 一次求值可表达"给定全部裁决事实后的晋升闭包"；但"随时间逐轮晋升、复检产生新版本"需时序扩展（Q4）：把轮次/时间作参数列（temporal Datalog：时间排序+后继函数），或用 Statelog 式状态规则（"combines the declarative semantics of deductive rules with the possibility to define updates in the style of production rules and active rules"）。
  - **非确定性选择（仅当需求存在）**：若"晋升"要求在多个合格候选中"每槽恰选一个"（而非审计裁决确定性决定），需 Soufflé choice（"impose one or more functional dependency constraints… Soufflé only chooses arbitrary one of them"）或 ASP 风格非单调选择。**M08 现有规程（SPEC）是审计裁决决定 KEEP/KILL，未发现需要 choice 的明确表述（未核）**。
- **结论**：核心门控与词表约束在"分层否定+聚合"范围内可表达；纯 Datalog 不足以表达（缺否定），半正 Datalog 覆盖"裁决事实在 EDB"的情形，天花板规则需分层否定或聚合，时间演进需时序/版本列。

### Q2. Datalog 单调性与 M09"规模单调增长、新版本不覆盖旧结论"是否同构？增量求值对"复检产生新版本后自动更新派生结论"的适配性？

- **事实层同构**：正向 Datalog 语义=最小不动点（CGT89："This evaluation corresponds to computing a least fixpoint."），程序在 EDB 上单调：EDB 事实增加 ⇒ 派生事实只增不减。这与 M09"规模单调增长、事实只增不覆盖"在**存储/事实层**同构。
- **查询层非同构**：M09"新版本不覆盖旧结论"还有第二层——查询时"当前结论"是新版本**取代**旧版本，这是**非单调的当前视图**（按版本列过滤/取最新）。它需要版本列 + max/聚合或分层否定表达，不能由正向 Datalog 直接给出。因此精确表述：**append-only 事实积累与 Datalog 单调语义同构；"当前视图"是非单调投影，两者必须分层建模**。
- **增量求值适配性（A 级原文，四条独立证据）**：
  - DDlog："A DDlog programmer writes traditional, non-incremental Datalog programs. However, the execution model of DDlog is fully incremental: at runtime DDlog programs receive streams of changes to the input relations (insertions or deletions) and produce streams of corresponding changes to derived relations."——插入/删除流都支持；且脚注明言 "DDlog does not include a storage engine"（Datalog 常作派生/计算层，持久化另行负责）。
  - Differential Dataflow（CIDR 2013）："the definition of a new computation model, differential computation, that extends incremental computation by allowing state to vary according to a partial ordering of versions"——**版本偏序**正是增量语义的抽象。
  - DBSP（arXiv 2022，Materialize 的理论基础）：给出任意 DBSP 程序的增量视图维护算法，覆盖"monotonic and non-monotonic recursion"及聚合、流式聚合。
  - RDFox（ISWC 2015）：物化 + 增量更新，"To support changes to the input data without recomputing materialisations from scratch, RDFox employs a novel incremental reasoning algorithm that reduces the overall work by identifying early on whether a fact should be deleted"。
  - LogicBlox（SIGMOD 2015）："LogicBlox supports efficient incremental materialized view maintenance."
- **适配性结论**："复检产生新版本后自动更新派生结论"= 增量视图维护问题，学术（Gupta/Mumick 1993、Dong/Su/Topor 1992，B 级元数据）与工程（DDlog/RDFox/LogicBlox/Materialize）均成熟。关键建模选择：新版本以**追加事实**表达（增量引擎只处理插入），还是以**撤回旧派生结论**表达（增量引擎处理删除）。若 M09 语义禁止物理删除，输入流应只含插入，"撤回"由版本谓词+当前视图查询表达（xAPI 的 voiding 也是追加墓碑而非删除，见 T7 轨道 B 级引用）；此裁决与 B4 的位时/事件溯源语义重叠，归 B4/项目组。

### Q3. "校验即查询"：现有 Python 校验脚本的校验项能否改写为 Datalog 查询的否定形式？有没有先例系统用 Datalog 做数据完整性校验？

- **现有校验项（项目一手，A 级）**：
  - 锚点逐字存在：`tools/verify_anchors.py` 文档串"锚点机器校验：每条 quote 必须在其 file 中逐字连续出现"；SPEC："quote 必须在 file 中逐字连续出现，用 grep -F 机器校验"（长度 30–200 字符、不跨行、不改标点）。
  - 词表合法：SPEC 封闭关系词表（9+1）与封闭节点类型（4）。
  - 引用完整：`origin: source` 必须给逐字 `evidence`；L2+ 的 `members` 必须真实存在于下层数据；"审计裁决必须回显候选 id"（不用名字匹配）。
- **否定形式改写**：三类校验都是"违例集合为空"的 denial constraint，可写成派生 `violation` 谓词（数据库合法 ⇔ violation 为空）：
  - `bad_anchor(N,F,Q) :- anchor(N,F,Q), text(F,T), !contains(Q,T).`（Soufflé `contains(s1,s2)` 检查后者是否含前者子串，即逐字连续包含）
  - `bad_rel(E) :- edge(_,R,_), !valid_rel(R).`（封闭词表）
  - `missing_member(L,M) :- l2_member(L,M), !node(M).`、`missing_evidence(E) :- edge(E,"source"), !has_evidence(E).`（引用完整）
  - 锚点长度 30–200 可用 `match` 通配/用户定义函数近似（更别扭，需额外机制）。
- **先例系统（A 级）**：
  - **Olivé, VLDB 1991**（演绎数据库完整性校验）："An integrity constraint is a condition that a database is required to satisfy at any time. In a deductive database, integrity constraints may refer to stored and derived facts"；方法用 transition/internal event rules + SLDNF；"deals with both static and dynamic integrity constraints"。
  - **LogicBlox/LogiQL**："Whereas derivation rules define views, integrity constraints specify the set of legal database states."；约束形如 F→G（右箭头），"Both inclusion dependencies and functional dependencies can be naturally expressed by such expressions"。
  - **Soufflé constraints**："Constraints are predicates in the body of the rule that produces true and false values. Constraints can be equalities, inequalities, and string checks such as containment and string matching."
  - **ASP 对照**（Gelfond/Leone 2002）：answer set 语义下，硬约束使"违规程序"无 answer set（不一致），与"violation 谓词非空=校验失败"是同一思想。
- **边界（不预设优劣）**：Datalog 化改写把"校验程序"变成"声明式查询"，但诊断输出（行号、失败原因、部分通过报告）需额外工具层；改写不自动增强校验强度——M08 项目结论"稳定性不来自表示形式，来自验证程序"依然成立，规则是否正确编码审计规程才是关键。

### Q4. 时序 Datalog 扩展（temporal Datalog、Datalog±、Statelog 等）的学术与工程现状？

- **学术现状（三条线，A 级原文）**：
  - **temporal Datalog（时间排序+后继）**：Ronca et al., AAAI 2018——"study their computational properties on Datalog extended with a temporal sort and the successor function—a core rule-based language for stream reasoning applications"；流定义为"an unbounded, append-only, relation of timestamped tuples"；难点是"streamed query answers can depend on data that has not yet been received"。
  - **DatalogMTL（度量时序算子）**：Wałęga et al., IJCAI 2019——"extends Datalog with operators from metric temporal logic (MTL)"，数据复杂度 PSPACE，"DatalogMTL extended with negation on input predicates can express all queries in PSpace"。Lanzinger et al., IJCAI 2023（DatalogMTL∃，加存在规则）：一般不可判定（guarded/weakly-acyclic 均不可判定），uniform semantics 下 weakly-acyclic 为 2-ExpSpace-complete，附实现。
  - **Statelog（状态导向演绎+主动规则）**：Lausen/Ludäscher/May, 1998——"state-oriented logical approach to active rules which combines the declarative semantics of deductive rules with the possibility to define updates in the style of production rules and active rules"。
  - **Datalog±（存在规则/TGD）**：Calì/Gottlob/Lukasiewicz——"The Datalog± family admits existentially quantified variables in rule heads… stratified negation can be added to Datalog± while keeping ontology querying tractable"；Vadalog（PVLDB 2018）为 warded Datalog± 首个实现（"captures PTIME complexity while allowing ontological reasoning"）。非时序但常与时序组合。
- **工程现状**：Vadalog（PVLDB 2018，A）；Temporal Vadalog（TPLP 2025，B 级元数据，原文未核）；RDFox（物化+增量，ISWC 2015，A）；DDlog/DBSP/Materialize（增量 Datalog 系，A）。Crossref 显示 2003–2026 持续有 temporal Datalog/DatalogMTL 论文（TCS 2003、Acta Informatica 1993、KR 2021/2024/2026、AAAI 2019/2021 等，B 级元数据）——**学术活跃、工程面窄**（多为 Oxford/Vienna 学术系统加少数工业系统）。
- **与 M08/M09 的关系（分析性 C）**：M08/M09 需要的是"版本/时间列 + 当前视图"，量级远低于 MTL 的度量算子（区间断言、数值窗口）；temporal Datalog（时间列+后继）或版本参数化即够；引入 DatalogMTL 是过度设计风险。bitemporal 通用理论归 B4，本分支不展开。

### Q5. Datalog 事实库的持久化格式：事实纯文本可 grep 是否比 JSONL 更直接？Souffle 的 fact 文件格式是否可作为交换格式先例？

- **Soufflé fact 格式（A 级规范文档）**：
  - Facts："Facts are clauses that unconditional hold; they are rules with a head, but no rule body. In facts, all arguments must be constant terms."（`A(1,2).`）
  - 输入：".input 指令使 EDB 从 tab-separated 文件 A.facts 读取"；"The default input source is a tab-separated file for a relation where each row in the tab-separated file represents a fact in the relation."
  - 输出："The output relations of a Datalog program are, by default, written to a tab separated file with name <relation name>.csv"
  - **结论：Soufflé 的 fact/TSV 是 Datalog 社区 de facto 的纯文本交换格式先例**（列式、可 diff/grep、可版本化）。
- **与 JSONL 对比（语法层面，非性能，红线禁止评测）**：
  - JSON Lines 规范三要求：UTF-8、每行合法 JSON、行终止符 `\n`（jsonlines.org）。JSONL 中锚点文本在 JSON 字符串内需转义（`\"`、`\n`、`\uXXXX`），`grep -F` 原文 quote 可能不匹配转义形态，需先解析或改写搜索串。
  - 纯事实 TSV/事实语句：字段以原始字节出现，`grep -F` 直接逐字匹配。**"grep -F 更直接"在此语法意义上成立（分析性归纳 C2，未实测）**。
  - 注意：M08 锚点校验的 grep 对象是教材源 `.md` 文件（本就纯文本），与事实库格式无关；事实库相关校验（词表/引用完整）是结构化列匹配，JSONL 与 TSV 都可用脚本/查询完成，差异只在"是否需要 JSON 解析层/转义层"。
- **持久化两条传统（不预设优劣）**：
  - 纯文本事实文件（Prolog 事实 / Soufflé TSV）——可 grep、可 diff、版本友好。
  - 日志/EAV 存储 + Datalog 查询语言（Datomic 官方文档："Datomic's query and rules system is an extended form of Datalog… Typically a Datalog system would have a global fact database and set of rules. Datomic's query engine instead takes databases… and rule sets as inputs."）——事实不进明文文件。
  - DDlog 明言不带存储引擎（"DDlog does not include a storage engine"）——**Datalog 常作派生/计算层，持久化另行负责**，这一分工本身是重要先例。

---

## 2 关键发现

### F1. Datalog 的 EDB/IDB 分层定义（表示层事实 / 派生视图的标准语义）
- 论断：M08"表示层事实 vs 不变量层/派生结论"与 Datalog 的 EDB/IDB 分层同构：EDB 是物理存储的事实集，IDB 是不显式存储、由规则定义的关系视图。
- 来源：*What You Always Wanted to Know About Datalog (And Never Dared to Ask)*，IEEE TKDE 1(2)，Ceri/Gottlob/Tanca，1989-06。
- URL：https://scholar.archive.org/work/e43wn2js7bd3bgtktwz2bi34zm/access/wayback/http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.210.1118&rep=rep1&type=pdf
- 原文摘录："a set of ground facts, called the Extensional Database (EDB), physically stored in a relational database, and a Datalog program P called the Intensional Database (IDB)… IDB relations are not stored explicitly, and correspond to relational views."；"This evaluation corresponds to computing a least fixpoint."
- 等级：A

### F2. 纯 Datalog 缺否定：门控/校验必须扩展
- 论断："未通过/未审计/不属于词表"等信息需要否定；纯 Datalog 无法表达，需半正/分层否定。
- 来源：同 F1（CGT89 否定章节）+ *Foundations of Databases* Ch.12（Abiteboul/Hull/Vianu）。
- URL：F1 同址；教材 http://webdam.inria.fr/Alice/pdfs/Chapter-12.pdf
- 原文摘录（CGT89）："In pure Datalog, there is no way to represent such a rule."（und(X):-stud(X), ￢grad(X) 示例）；原文摘录（Alice）："Although datalog is of great theoretical importance, it is not adequate as a practical query language because of the lack of negation. In particular, it cannot express even the first-order queries."
- 等级：A

### F3. Datalog±：存在规则 + 分层否定的可处理扩展
- 论断：需要"本体级/存在量词"推理时，Datalog± 是学术界标准扩展，且可加分层否定保持可处理。
- 来源：*A General Datalog-Based Framework for Tractable Query Answering over Ontologies*，Oxford CL-RR-10-21（JWS 2012 前身），Calì/Gottlob/Lukasiewicz，2010。
- URL：https://scholar.archive.org/work/zs2alqxd25aqloolqoblavpifu/access/wayback/http://www.cs.ox.ac.uk/files/3608/rr1021.pdf
- 原文摘录："The Datalog± family admits existentially quantified variables in rule heads, and has suitable restrictions to ensure highly efficient ontology querying… We also show how stratified negation can be added to Datalog± while keeping ontology querying tractable."
- 等级：A

### F4. 增量 Datalog（DDlog）：增删流驱动派生结论自动更新，且不含存储引擎
- 论断："复检产生新版本后自动更新派生结论"= 增量视图维护；DDlog 接受插入/删除流并输出派生关系的对应变化；Datalog 本身常不负责持久化。
- 来源：*Differential Datalog*，CEUR Workshop Proc. Vol-2368（Datalog 2.0），Ryzhyk/Budiu，2019。
- URL：https://scholar.archive.org/work/uynxn2gjnfelvelsph524kqyom/access/wayback/http://ceur-ws.org/Vol-2368/paper6.pdf
- 原文摘录："the execution model of DDlog is fully incremental: at runtime DDlog programs receive streams of changes to the input relations (insertions or deletions) and produce streams of corresponding changes to derived relations."；脚注 "DDlog does not include a storage engine."
- 等级：A

### F5. 差分数据流：增量计算的版本偏序抽象
- 论断：差分计算把增量计算推广到"版本偏序"，是版本化 Datalog 求值的理论基础。
- 来源：*Differential Dataflow*，CIDR 2013，McSherry/Isaacs/Isard/Murray。
- URL：https://www.cidrdb.org/cidr2013/Papers/CIDR13_Paper111.pdf
- 原文摘录："the definition of a new computation model, differential computation, that extends incremental computation by allowing state to vary according to a partial ordering of versions, and maintains an index of individual updates, allowing them to be combined in different ways for different versions."
- 等级：A

### F6. DBSP：通用增量视图维护算法（含非单调递归），Materialize 理论基础
- 论断：增量视图维护对"含聚合与非单调递归的丰富查询语言"有通用解；工程上 Materialize 基于此。
- 来源：*DBSP: Automatic Incremental View Maintenance for Rich Query Languages*，arXiv:2203.16684（VMware Research / Materialize Inc. / UPenn），Budiu/McSherry/Ryzhyk/Tannen，2022-03。
- URL：https://arxiv.org/abs/2203.16684
- 原文摘录："we give a general algorithm for solving the incremental view maintenance problem for arbitrary DBSP programs… we show how to model many rich database query languages (including the full relational queries, grouping and aggregation, monotonic and non-monotonic recursion, and streaming aggregation) using DBSP."
- 等级：A

### F7. 时序 Datalog：时间排序 + 后继，流=append-only 时间戳元组
- 论断：temporal Datalog 把时间排序与后继函数加进规则语言，面向流推理；流在文献中就被定义为 append-only 时间戳关系。
- 来源：*Stream Reasoning in Temporal Datalog*，AAAI-18，Ronca/Kaminski/Cuenca Grau/Motik/Horrocks（Oxford），2018-04。
- URL：https://ojs.aaai.org/index.php/AAAI/article/download/11537/11396
- 原文摘录："study their computational properties on Datalog extended with a temporal sort and the successor function—a core rule-based language for stream reasoning applications."；"an input data stream is seen as an unbounded, append-only, relation of timestamped tuples"；"streamed query answers can depend on data that has not yet been received."
- 等级：A

### F8. DatalogMTL：度量时序算子，PSPACE 数据复杂度
- 论断：度量时序 Datalog 表达力强（加否定可表达全部 PSPACE 查询），学术成熟但算子复杂，远超朴素版本需求。
- 来源：*DatalogMTL: Computational Complexity and Expressive Power*，IJCAI 2019，Wałęga/Cuenca Grau/Kaminski/Kostylev。
- URL：https://www.ijcai.org/proceedings/2019/0261.pdf
- 原文摘录："a knowledge representation language that extends Datalog with operators from metric temporal logic (MTL)… We establish tight PSpace data complexity bounds and also show that DatalogMTL extended with negation on input predicates can express all queries in PSpace."
- 等级：A

### F9. DatalogMTL∃：时序+存在规则，uniform semantics 恢复可判定
- 论断：时序 Datalog 加存在规则一般不可判定；学术给出 uniform semantics 与 2-ExpSpace 界，并附实现——"学术活跃、工程面窄"的典型。
- 来源：*Temporal Datalog with Existential Quantification*，IJCAI 2023（paper 365），Lanzinger/Nissl/Sallinger/Wałęga（Oxford / TU Wien），2023-08。
- URL：https://www.ijcai.org/proceedings/2023/0365.pdf
- 原文摘录："We show that DatalogMTL∃ is undecidable even in the restricted cases of guarded and weakly-acyclic programs. To address this issue we introduce uniform semantics… it becomes 2-ExpSpace-complete for weakly-acyclic programs… We provide an implementation for the decidable case."
- 等级：A

### F10. Statelog：把演绎规则与"更新"结合的早期状态导向语言
- 论断：Statelog 是"规则+状态转移"（主动数据库风格）的早期先例，M08 晋升状态机可参照。
- 来源：*On Active Deductive Databases: The Statelog Approach*，LNCS（Transactions and Change in Logic Databases），Lausen/Ludäscher/May（Freiburg），1998。
- URL：https://scholar.archive.org/work/cfg6dsas3vdixasib7jd53ylbe/access/wayback/http://users.sdsc.edu/~ludaesch/Paper/moc98.pdf
- 原文摘录（PDF 提取文本，个别断字）："we present our own state-oriented logical approach to active rules which combines the declarative semantics of deductive rules with the possibility to define updates in the style of production rules and active rules. The resulting language Statelog is surprisingly simple, yet captures many features of active rules including composite events…"
- 等级：A

### F11. 演绎数据库完整性校验先例（Olivé VLDB 1991）
- 论断："校验即查询"有 30 年以上学术先例：完整性约束可引用存储与派生事实，用 SLDNF 检查。
- 来源：*Integrity Constraints Checking In Deductive Databases*，VLDB 1991，Antoni Olivé（UPC）。
- URL：https://www.vldb.org/conf/1991/P513.PDF
- 原文摘录："An integrity constraint is a condition that a database is required to satisfy at any time. In a deductive database, integrity constraints may refer to stored and derived facts and, thus, their evaluation may involve the deductive rules that define the derived facts."；"it deals with both static and dynamic integrity constraints."
- 等级：A

### F12. LogicBlox/LogiQL：Datalog 化系统把"完整性约束=合法数据库状态集合"做成一等公民
- 论断：工业级 Datalog 系统用 F→G 约束表达蕴含/函数依赖（含"类型即约束"），并做增量物化视图维护；是"校验即查询"的直接工程先例。
- 来源：*Design and Implementation of the LogicBlox System*，SIGMOD 2015，Aref/ten Cate/Green/Kimelfeld/Olteanu/Pasalić et al.
- URL：https://scholar.archive.org/work/i3eipvo7pvdzva3c6esglfqwty/access/wayback/http://www.cs.ox.ac.uk:80/dan.olteanu/papers/logicblox-sigmod15.pdf
- 原文摘录："Whereas derivation rules define views, integrity constraints specify the set of legal database states."；"Both inclusion dependencies and functional dependencies can be naturally expressed by such expressions."；"Each predicate may be declared as being either a base predicate (a.k.a. extensional or EDB predicate or relation), or a derived predicate (a.k.a. intensional or IDB predicate)… Base predicates contain input data and derived predicates are views over the base data."；"LogicBlox supports efficient incremental materialized view maintenance."
- 等级：A

### F13. RDFox：以 Datalog 物化+增量更新支撑 RDF 图存储
- 论断：Datalog 物化推理 + 增量更新是"图存储"的工程先例；增量算法明确处理"事实该删"。
- 来源：*RDFox: A Highly-Scalable RDF Store*，ISWC 2015（LNCS 9366），Nenov/Piro/Motik/Horrocks（Oxford）/Wu/Banerjee（Oracle），2015-10。
- URL：https://link.springer.com/content/pdf/10.1007/978-3-319-25010-6_1.pdf
- 原文摘录："a main-memory, scalable, centralised RDF store that supports materialisation-based parallel datalog reasoning and SPARQL query answering. RDFox uses novel and highly-efficient parallel reasoning algorithms for the computation and incremental update of datalog materialisations"；"To support changes to the input data without recomputing materialisations from scratch, RDFox employs a novel incremental reasoning algorithm… that reduces the overall work by identifying early on whether a fact should be deleted."
- 等级：A

### F14. Vadalog：warded Datalog± 首个实现（知识图谱推理）
- 论断："Datalog 作知识图谱推理语言"有工程系统（Vadalog）；推理知识图谱是"逻辑知识图谱"路线。
- 来源：*The Vadalog System: Datalog-based Reasoning for Knowledge Graphs*，PVLDB 11(9)，Bellomarini/Sallinger/Gottlob，2018。
- URL：http://www.vldb.org/pvldb/vol11/p975-bellomarini.pdf
- 原文摘录："to handle the complex knowledge-based scenarios encountered today, such as reasoning over large knowledge graphs, Datalog has to be extended with features such as existential quantification… Warded Datalog+/- is a very promising one, as it captures PTIME complexity while allowing ontological reasoning… we illustrate the first implementation of Warded Datalog+/-."
- 等级：A

### F15. Soufflé 事实格式 = 纯文本可 grep 的交换格式先例
- 论断：Soufflé 事实是无体规则（全部参数为常量），EDB 默认从 TSV（A.facts）读写，输出默认 TSV；是"事实=纯文本"的社区先例。
- 来源：Soufflé 官方语言文档 Facts / Directives（souffle-lang.github.io）。
- URL：https://souffle-lang.github.io/facts ；https://souffle-lang.github.io/directives
- 原文摘录："Facts are clauses that unconditional hold; they are rules with a head, but no rule body. In facts, all arguments must be constant terms."；"The default input source is a tab-separated file for a relation where each row in the tab-separated file represents a fact in the relation."；".input directive make the EDB read from a tab-separated file A.facts."
- 等级：A

### F16. Soufflé 约束与聚合：校验/门控的语言原语
- 论断：子串包含（contains）、通配匹配（match）、等式/不等式是规则体谓词；min/max/sum/count 聚合可用；否定必须可分层。锚点逐字校验与数量门槛在语言层面都有原语。
- 来源：Soufflé 官方文档 Constraints / Aggregates / Rules。
- URL：https://souffle-lang.github.io/constraints ；https://souffle-lang.github.io/aggregates ；https://souffle-lang.github.io/rules
- 原文摘录："Constraints are predicates in the body of the rule that produces true and false values. Constraints can be equalities, inequalities, and string checks such as containment and string matching."；"Constraint contains(string1, string2) is used to check if the latter string contains the former string."；"Aggregate functions min, max, sum, and count are available in souffle."；"Not all negations are semantically permissible… Technically, rules involving negation must be stratifiable."
- 等级：A

### F17. Datomic：Datalog 查询系统 + 独立持久化（"数据库+规则集"输入）
- 论断：Datalog 作图谱查询语言的另一条先例；其查询引擎把"数据库+规则集"作为输入，持久化不在 Datalog 层。
- 来源：Datomic 官方文档 *Datomic Queries and Rules*（on-prem，Wayback 2019 存档）。
- URL：http://web.archive.org/web/2019id_/https://docs.datomic.com/on-prem/query.html
- 原文摘录："Datomic's query and rules system is an extended form of Datalog. Datalog is a deductive query system, typically consisting of: A database of facts; A set of rules for deriving new facts from existing facts; a query processor…"；"Typically a Datalog system would have a global fact database and set of rules. Datomic's query engine instead takes databases (and in fact, many other data sources) and rule sets as inputs."
- 等级：A

### F18. JSON Lines：逐行 JSON 的文本格式规范（每行必须合法 JSON）
- 论断：JSONL 是规范化的文本行格式，但其内容在 JSON 字符串内需转义，逐字 grep 需先解析/改写搜索串；与纯文本事实的"直接 grep"属不同语法层。
- 来源：JSON Lines 规范，jsonlines.org。
- URL：https://jsonlines.org/
- 原文摘录："The JSON Lines format has three requirements: 1. UTF-8 Encoding; 2. Each Line is a Valid JSON Value; 3. Line Terminator is '\n'."
- 等级：A

### F19. M08 一手文档：候选池+审计晋升、不变量层/表示层、锚点=grep -F 硬校验
- 论断：M08 的工程形态是"候选池 + 审计晋升（不可自动生成层）"、不变量层/表示层二分、节点身份=锚点集合、封闭词表、锚点逐字 grep 校验；这些是 EDB/IDB 映射的建模对象。
- 来源：项目一手文档（等级 A）：`docs\图工程调研\06-M08技术选型.md`、`docs\图工程调研\M08实验-第15章分层图谱\SPEC.md`、`...\tools\verify_anchors.py`。
- URL：工作区本地文件（项目内部资料）。
- 原文摘录（06-M08技术选型.md）："L2 及以上必须是候选池 + 审计晋升，不能是自动生成层。"；"「稳定性不来自表示形式，来自验证程序」"；"主键 = <book>:<kebab-slug> 的命名空间 id，但判等看 anchors。"；（SPEC.md）"quote 必须在 file 中逐字连续出现，用 grep -F 机器校验"；"某层存活 <2 ⇒ 该层就是当前语料的抽象天花板，停止上提。"；（verify_anchors.py）"锚点机器校验：每条 quote 必须在其 file 中逐字连续出现。"
- 等级：A

### F20. M09 一手文档：append-only JSONL + 脚本校验现状
- 论断：M09 现状是 append-only JSONL + Python 校验脚本；任务卡 Q2 的"规模单调增长、新版本不覆盖旧结论"是 Datalog 单调性对照的目标语义。
- 来源：项目一手文档（等级 A）：`docs\图工程调研\存储选型调研\轨道T7-M09规模三方向技术评估\发现.md`（接口性引用，bitemporal 深挖归 B4）。
- URL：工作区本地文件。
- 原文摘录（轨道 T7 发现.md）："三方向中方向1（M09 内部给历史版本独立位置）与方向3… 都可在当前 append-only JSONL+脚本路线内落地"；"个人学习历史的单调增长在可预期规模下远未到需要分区/冷热分层的量级"。
- 等级：A

### B 级发现（元数据可核、原文未抓/仅索引）
- B1 Gupta/Mumick《Maintaining Views Incrementally》SIGMOD 1993，DOI 10.1145/170035.170066（Crossref 元数据）。增量视图维护奠基文献。
- B2 Dong/Su/Topor《Incremental evaluation of Datalog queries》ICDT'92，DOI 10.1007/3-540-56039-4_48（Crossref 元数据）。Datalog 增量求值理论源头。
- B3 《On temporal logic versus datalog》Theoretical Computer Science 2003，DOI 10.1016/s0304-3975(02)00447-4（Crossref 元数据）。
- B4 《The Temporal Vadalog System: Temporal Datalog-Based Reasoning》TPLP 2025，DOI 10.1017/s1471068425000018（Crossref 元数据）。时序 Datalog 工程化最新动态。
- B5 《Querying datalog programs with temporal logic》Acta Informatica 1993，DOI 10.1007/bf01191723（Crossref 元数据）。
- B6 《LogicBlox, Platform and Language: A Tutorial》LNCS 2012，DOI 10.1007/978-3-642-32925-8_1（Crossref 元数据）。
- B7 Calì/Gottlob/Lukasiewicz《Datalog±》PODS 2009 早期版，DOI 10.1145/1559795.1559809（JWS 版论文自述"significantly extended and revised version of a paper that appeared in PODS 2009"）。
- B8 Soufflé Publications 索引页 https://souffle-lang.github.io/publications.html（已抓页面，列 CAV16、PPDP21、LOPSTR22 等）。

### C 级发现（明确标注的分析性归纳）
- C1 M08 门控/停止规则的具体 Datalog 改写方案（半正/分层否定+聚合/两两存在改写天花板、时间列参数化）为本文推导，非任何来源原文直接陈述。
- C2 "JSONL 锚点 grep 需按转义形态匹配、纯文本事实可直接逐字 grep"是语法层面判断，未做实测（红线禁止性能评测）。

---

## 3 冲突与张力

1. **单调事实层 vs 非单调当前视图**：Datalog 派生在 EDB 上单调（只增），而 M09"当前结论=最新版本"是非单调投影。两者必须分层建模；把"不覆盖旧结论"误读为"派生也单调"会掩盖当前视图的非单调性。
2. **纯 Datalog 缺否定 vs 校验/门控天然需要否定**：Alice 教材直言纯 Datalog "cannot express even the first-order queries"；M08 的门控（未通过）、词表（不合法）、校验（违例）全部是否定形态，因此"纯 Datalog"不充分，至少半正/分层否定。
3. **强表达力时序扩展 vs 朴素版本需求**：DatalogMTL 加否定可表达全部 PSPACE 查询（IJCAI 2019），DatalogMTL∃ 复杂到需 uniform semantics 保可判定（IJCAI 2023）；M08/M09 只需"版本列+当前视图"，引入 MTL 类算子属过度设计。
4. **增量引擎支持删除流 vs M09 append-only 不删**：DDlog/RDFox 都处理删除（"whether a fact should be deleted"）；若 M09 禁止物理删除，输入流应只含插入，撤回语义（若有）以追加墓碑/版本谓词表达——建模决策未定，且与 B4 的位时/事件溯源边界重叠。
5. **"校验即查询"的吸引力 vs "稳定性来自验证程序"**：Datalog 化把校验声明化、可复用规则层，但校验强度取决于规则是否忠实编码审计规程；M08 项目结论"稳定性不来自表示形式，来自验证程序"在 Datalog 化后依然成立，不能把"改成 Datalog"当作更强的保证。
6. **集合语义 vs 逐行文档**：Datalog 关系是集合（去重、无序），JSONL 是逐行文档（可重复行、保留顺序）；事实层与物理格式之间的语义对齐需要显式决策（Soufflé 事实文件语义上仍是集合，TSV 只是传输/交换视图）。

---

## 4 未决问题

1. M08 候选池晋升是否需要"每槽恰选一个"的非确定性选择：现有 SPEC 是审计裁决 KEEP/KILL 决定晋升，未见需要 Soufflé choice/ASP 非单调选择的明确需求——**未核**，若需要则超出分层否定+聚合。
2. "复检产生新版本"建模为"追加新版本事实"还是"撤回旧派生结论"：增量引擎两者都支持，但 M09 append-only 语义下前者更一致；需 B4/项目组裁决（与 bitemporal 边界重叠）。
3. Datalog 化校验的诊断能力（行号、失败原因、部分通过报告、JSON 解析错误定位）是否有现成工具对标 Python 脚本：未核。
4. DatalogMTL/Temporal Vadalog 的工程算子覆盖与维护状态：手头原文以理论与系统描述为主，工程运维现状（算子全集、维护、落地范围）未核。
5. Datomic 持久化（EAV/log + Datalog 查询）与 Soufflé TSV 纯文本两种先例的取舍：取决于产品边界"可 grep 优先"还是"查询语言一致优先"，未决。
6. 时间/版本参数化 IDB 与 B4 bitemporal 通用理论的边界划分：本分支只确认"版本列+当前视图"可用，位时/交易时双轴语义归 B4，未裁定。

---

## 5 来源清单

### A 级（原文到手并摘录，共 22 项）
| # | 来源 | 类型 | 等级 |
|---|---|---|---|
| A1 | Ceri/Gottlob/Tanca, What You Always Wanted to Know About Datalog (IEEE TKDE 1989) | 学术论文 | A |
| A2 | Calì/Gottlob/Lukasiewicz, Datalog±（Oxford CL-RR-10-21, 2010；JWS 2012 前身） | 学术论文 | A |
| A3 | Ryzhyk/Budiu, Differential Datalog（CEUR Vol-2368, 2019） | 学术/工程论文 | A |
| A4 | Budiu/McSherry/Ryzhyk/Tannen, DBSP（arXiv:2203.16684, 2022） | 学术论文 | A |
| A5 | McSherry et al., Differential Dataflow（CIDR 2013） | 学术论文 | A |
| A6 | Bellomarini/Sallinger/Gottlob, The Vadalog System（PVLDB 11(9), 2018） | 学术论文 | A |
| A7 | Wałęga et al., DatalogMTL（IJCAI 2019） | 学术论文 | A |
| A8 | Ronca et al., Stream Reasoning in Temporal Datalog（AAAI 2018） | 学术论文 | A |
| A9 | Lanzinger et al., Temporal Datalog with Existential Quantification（IJCAI 2023） | 学术论文 | A |
| A10 | Lausen/Ludäscher/May, The Statelog Approach（LNCS, 1998） | 学术论文 | A |
| A11 | Abiteboul/Hull/Vianu, Foundations of Databases Ch.12（Alice 在线版） | 教材 | A |
| A12 | Olivé, Integrity Constraints Checking In Deductive Databases（VLDB 1991） | 学术论文 | A |
| A13 | Gelfond/Leone, Logic programming and knowledge representation—The A-Prolog perspective（AIJ 138, 2002） | 学术论文 | A |
| A14 | Nenov et al., RDFox: A Highly-Scalable RDF Store（ISWC 2015） | 学术/工程论文 | A |
| A15 | Aref et al., Design and Implementation of the LogicBlox System（SIGMOD 2015） | 学术/工程论文 | A |
| A16 | Soufflé 官方语言文档（facts/rules/directives/constraints/aggregates/choice/types） | 语言规范文档 | A |
| A17 | Datomic 官方文档：Queries and Rules（Wayback 2019 存档） | 工程文档 | A |
| A18 | JSON Lines 规范（jsonlines.org） | 规范文档 | A |
| A19 | 项目一手：docs\图工程调研\06-M08技术选型.md | 项目一手 | A |
| A20 | 项目一手：docs\图工程调研\M08实验-第15章分层图谱\SPEC.md | 项目一手 | A |
| A21 | 项目一手：docs\图工程调研\M08实验-第15章分层图谱\tools\verify_anchors.py | 项目一手 | A |
| A22 | 项目一手：docs\图工程调研\存储选型调研\轨道T7-M09规模三方向技术评估\发现.md | 项目一手 | A |

### B 级（元数据可核、原文未抓/仅索引，共 8 项）
| # | 来源 | DOI/URL | 类型 |
|---|---|---|---|
| B1 | Gupta/Mumick, Maintaining Views Incrementally, SIGMOD 1993 | 10.1145/170035.170066 | 学术元数据 |
| B2 | Dong/Su/Topor, Incremental evaluation of Datalog queries, ICDT'92 | 10.1007/3-540-56039-4_48 | 学术元数据 |
| B3 | On temporal logic versus datalog, TCS 2003 | 10.1016/s0304-3975(02)00447-4 | 学术元数据 |
| B4 | The Temporal Vadalog System, TPLP 2025 | 10.1017/s1471068425000018 | 学术元数据 |
| B5 | Querying datalog programs with temporal logic, Acta Informatica 1993 | 10.1007/bf01191723 | 学术元数据 |
| B6 | LogicBlox, Platform and Language: A Tutorial, LNCS 2012 | 10.1007/978-3-642-32925-8_1 | 学术元数据 |
| B7 | Calì et al., Datalog±（PODS 2009 早期版） | 10.1145/1559795.1559809 | 学术元数据（JWS 版自述） |
| B8 | Soufflé Publications 索引页 | https://souffle-lang.github.io/publications.html | 索引页 |

### C 级（明确标注的分析性归纳，共 2 项）
| # | 内容 |
|---|---|
| C1 | M08 门控/停止规则/时间化的 Datalog 改写方案（半正/分层否定+聚合）为本文推导 |
| C2 | JSONL 转义 vs 纯文本事实直接 grep 的语法层面判断（未实测） |

### 未核来源（尝试抓取失败，如实标注）
- USENIX OSDI'19 版 DDlog 论文原始 PDF：抓到的是 404/HTML 存档页，原文未核；本分支用 CEUR 版《Differential Datalog》覆盖（A3）。
- LogicBlox SIGMOD 2015：最初 dl.acm.org 需订阅，后经 IA Scholar 存档 PDF 补抓成功（A15），不再标未核。
- DatalogMTL 相关 KR/AAAI 2020–2026 论文：仅有 Crossref 元数据（部分并入 B 级），原文未逐一抓取。

---

## 6 判死自查

- [x] **可核来源 >=15**：来源清单共 32 项（A22 + B8 + C2）≥15。
- [x] **原文到手 >=10**：A 级 22 项，其中外部原文 15 篇论文/教材 + 3 份规范/工程文档 + 4 份项目一手文件，全部本地有原文并摘录。
- [x] **来源类型 >=3 类**：学术论文/教材（A1–A15 中 15 项）、语言规范/工程文档（A16–A18、B8）、工程先例（DDlog、RDFox、LogicBlox、Datomic、Materialize/DBSP、Soufflé）——≥3 类。
- [x] **候选逐一查证 >=5**：纯 Datalog（CGT89/Alice/Soufflé，A）；时序扩展（DatalogMTL/AAAI-Stream/tedb/Statelog，A；TCS2003/TPLP2025，B）；增量求值（DDlog/DBSP/DiffDataflow/RDFox/LogicBlox，A；Gupta-Mumick/Dong-Su，B）；Soufflé fact 格式（官方 facts/directives，A）；校验先例（Olivé/LogicBlox/Soufflé constraints，A）——5 组全查。
- [x] **关键词 >=4 组**：Datalog as graph storage（Vadalog/RDFox/Datomic/LogicBlox）；Datalog integrity constraints validation（Olivé/LogicBlox/Soufflé）；temporal Datalog extensions（DatalogMTL/AAAI/tedb/Statelog/TCS2003）；incremental Datalog evaluation differential（DDlog/DBSP/DiffDataflow/Gupta-Mumick/Dong-Su）；Souffle facts file format（Soufflé 官方文档）——5 组。
- [x] **禁止项自查**：
  - 未做引擎性能评测对比：RDFox 摘要中的速度/容量数字未引用；所有讨论限于语义/语法/建模层面。
  - bitemporal 通用理论归 B4：本分支仅确认"版本列+当前视图/追加事实"可用，未展开双时间轴理论（Q2/Q4 均已注明边界）。
  - 不捏造来源：所有引文来自已抓取原文；抓不到的标 B 或"未核"（OSDI19 版 DDlog 原文未核）。
  - 未预设 Datalog 优于/劣于现状：各结论均以"可表达/需扩展/语法层面/建模选择"表述，并保留"稳定性来自验证程序"的边界。