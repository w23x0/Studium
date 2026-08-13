# B3a 发现 — 增量 Datalog 引擎机制与审计门控（DDlog/DBSP/RDFox/LogicBlox）

调研员：B3a（增量 Datalog 分支）｜日期：2026-08-12｜基线：B3_Datalog_发现.md
范围：只核增量引擎的**机制与存储形态**；不比较厂商/引擎性能；时间版本语义归 B4、校验语言归 B5/B8（RDFox 审计示例属增量机制+审计场景，归本分支引用）。

## 0 一句话结论

增量 Datalog 已是工程成熟范式：DDlog 用差分数据流把"程序"自动编译成增量实现、以内存关系为唯一状态且无存储引擎；DBSP 在理论上把"任意程序自动增量"推广到非单调递归并已获 VLDB 2023 最佳论文（Feldera 落地）；RDFox 用"显式输入事实（EDB，可删）+ 物化派生事实（IDB，不可显式删）"的增量物化语义，并自带"审计日志 commit procedure"官方工程先例；"事实层单调 + 当前视图非单调"的分层可用"单调规则积累事实 + 非单调视图/规则（含 not、聚合）在增量引擎上按事务重算"表达，LogicBlox 的版本分支/时旅行与 DBSP 的 Z 集合（负权重=删除）提供支撑；但"事实文件是否 grep -F 可查"的答案是**有条件**——能保证逐字可查的是系统边界上的纯文本事实导入/导出层与追加式日志，而不是引擎内存态本身，且字符串需按各格式的转义规则解析后才能与锚点逐字比对（推断，标 C，见 Q5）。

## 1 逐条回答

### Q1 DDlog 的增量维护机制、语言特点、存储形态（程序即数据？关系事实文件？）官方文档原文

- **增量机制**：DDlog 是"面向增量计算的编程语言"，程序员写普通非增量 Datalog，编译器自动合成增量实现，运行时只做最小必要工作量；底层基于 differential dataflow（差分数据流）。官方 README 与 Datalog 2.0 论文均有原文（见发现 K1、K2）。
- **语言特点**：强类型、关系为 input/output/intermediate 三类（"程序即数据"指程序被编译为数据流图，关系是程序内部状态而非外部文件）；规则由 joins/antijoins/unions 加聚合与 flatmap 组成，支持带分层否定（stratified negation）的递归（见 K2、K3）。
- **存储形态**：**无存储引擎**。DDlog 在内存中存储与处理数据，典型用法是配合外部持久数据库：外部记录作为 ground facts 喂入、派生事实写回数据库（见 K1）。关系事实文件**不是**引擎原生存储层；CLI 提供 `insert/delete/clear/commit/dump/dump_changes` 等文本命令来操作与导出（见 K4）。
- **事务 API**：单事务模型，事务内可任意 insert/delete 输入元组，commit 时所有更新原子应用并产出全部输出关系的变化（见 K3）。

### Q2 DBSP 的增量计算理论承诺（自动增量、完全增量）与工程落地现状

- **理论承诺**：DBSP 给出"任意 DBSP 程序"的增量视图维护一般算法，并把关系代数、聚合、非单调递归、流式聚合等富查询语言编码进 DBSP，从而为这些语言获得自动增量维护；关键机制是把集合化为 Z 集合（多重度可为负），删除即负权重；"时间"不是墙钟，而是事务序列计数，DB[t]=Σ_{i≤t}T[i]（见 K6、K7）。
- **工程落地**：Feldera 引擎基于 DBSP 理论（官方 Publications 页明确 "DBSP wins Best Paper award at VLDB 2023"，PVLDB 2023 已发表，另获 SIGMOD Research Highlights、VLDB Journal 2025 长版）；Feldera 官方文档称其"只查 changes、完全避免重算旧数据"（见 K8、K9）。DBSP 元数据（DOI 10.14778/3587136.3587137，PVLDB 16(7):1601-1614，2023-03）经 Crossref 核验（见 K7）。
- **边界**：DBSP 是计算模型/语言，不规定事实文件的文本形态；Feldera 的输入是 SQL 表/连接器（Kafka、CDC、S3 等），不是 Datalog 事实文件（见 K8）。

### Q3 RDFox 的增量 Datalog 与基于 RDF 的事实存储：EDB/IDB 划分、增量更新、审计场景先例

- **EDB/IDB 划分**：输入 RDF 图（显式事实）+ 规则/公理推导的物化（materialization）。官方明确：删除只限于"输入图中显式存在"的三元组，不处理派生三元组的删除（该问题被点名称为 belief revision / view update）——即派生事实（IDB）不能单独显式删除，只能因输入/规则变化而重算（见 K10）。
- **增量更新**：官方称实现"高效计算物化 + 在数据和规则增删下维护物化"的成熟算法（Oxford 多年研究，即 Backward/Forward 算法；AAAI 2015 论文原文描述 DRed 的不足与 B/F 机制，见 K11、K12）；Delta Queries 特性把查询答案变化以增/删形式增量计算、避免全量查询求值，并自述"historical tracking and traceability"（见 K13）。
- **审计场景先例**：官方 Transactions 文档给出 "Example: Audit logging with commit procedures"——用 Datalog 规则定义 `:NewAction`（带 `NOT EXISTS` 的增量规则）识别新增动作，commit procedure 只遍历增量求值出的 `:NewAction` 实例写入审计日志；官方原文明确"因为规则是增量求值的，识别新动作的成本与新增实例数成正比，而非与库中实例总数成正比"（见 K14）。这是"增量 Datalog 直接承载审计门控"的第一手工程先例。
- **持久化形态**：快照 + 零或多个 delta 文件、compaction 原子替换、CRC64 校验（见 K15）；导入导出支持 N-Triples/Turtle 等纯文本 RDF 格式，Datalog 规则/事实用专有格式 application/x.datalog（见 K16）。

### Q4 用增量 Datalog 表达"候选边→审计通过→晋升为正式边"状态机：事实层（单调）+ 当前视图（非单调）如何分层，是否有工程或论文先例？

- **分层模式（推断为主，标 C）**：把"已提交的边/审计日志"放**单调事实层**（只增，规则只 add facts——RDFox 官方明示"rules can only add facts"，见 K14 附注）；把"当前生效视图/正式边"放**非单调视图层**，用带否定（`NOT EXISTS`、antijoin）或聚合的规则定义；增量引擎在每个事务上自动重算该视图的变化（增/删），删除由"支撑事实消失→派生事实重算为负权重/删除"完成。
- **工程先例**：RDFox 官方审计日志示例即"单调积累（actionLog 只增）+ 增量规则筛出新动作 + commit procedure 落日志"的组合，直接对应"候选→审计→晋升"的每一跳（见 K14）。RDFox Delta Queries 给出"答案变化=增+删、增量计算、留存可追溯"的现成语义（见 K13）。
- **论文/系统先例**：
  - LogicBlox：增量物化视图维护保证工作量与"前后计算的 trace edit distance"成正比；不可变数据结构使多版本关系紧凑共存、事务 O(1) 分支版本、时旅行几乎免费、版本图为任意 DAG——"每事务从版本分支开始"即状态机式推进（见 K17）。
  - DBSP：Z 集合负多重度直接把"删除"编码进代数，时间=事务序号（见 K6、K7）。
  - Soufflé PPDP 2021：把增量求值显式做成"高影响变更→全量重算（Bootstrap）/ 低影响变更→增量更新（Update）"两种策略的弹性选择——说明"非单调当前视图"在工程上常以"增量 + 必要时重算"实现（见 K19）。
- **明确答案**：有工程先例（RDFox 审计日志 = 事实层单调 + 增量规则筛选 + 提交钩子）；"正式边视图随撤销而收缩"这种非单调当前视图本身是增量引擎的常规能力（增量维护输出变化），但"把整条候选→审计→晋升状态机显式分层建模"未在抓到的官方文档/论文中找到同款现成命名，标 C（推断），归入未决。

### Q5 事实文本可否保持"grep -F 可查"：事实文件/日志是否可追加纯文本，锚点逐字校验能否直接作用于事实文件？

- **可分三层回答**：
  1. **引擎内存态**：不可 grep。DDlog 无存储引擎、状态全在内存关系里（K1）；RDFox 是 main-memory 数据存储，物化在内存（K10）；它们的事实形态是"关系/三元组"，不是文本文件。
  2. **系统边界上的文本层**：可 grep。RDFox 导入导出明确支持 N-Triples（官方："N-Triples is a line-based, plain text format"，W3C REC 原文）与 Turtle 纯文本（K16、K18）；DDlog CLI 提供 `dump`/`dump_changes` 输出关系内容为文本、`insert` 等命令以文本输入（K4）；审计日志在 RDFox 示例中经 commit procedure 写入（最终落库或导出，官方示例未给落盘细节，见未决 U4）。若校验侧只需"可追加的纯文本事实层"，RDFox 的 N-Triples 输入 + 只增 actionLog 图是可达形态。
  3. **逐字校验的坑**：DDlog 字符串字面量有 C-like 转义（`\n`、`\t`、`\u{100}`）（K5）；N-Triples 是 line-based 但字面量含转义规则（K18），grep 前需按格式解析；且导出顺序、注释、I/O 规范化可能改变文本形态。因此"锚点逐字校验直接作用于事实文件"成立的前提是：校验对象是**追加式纯文本事实/日志层**且锚点文本先按同格式转义规则规范化；对引擎内存态或数据库内部格式则不成立（推断，标 C；格式转义有 A 级原文支撑，工程组合方式为推断）。

## 2 关键发现（论断 + URL + 标题 + 机构 + 日期 + 原文摘录 + 等级）

- **K1｜DDlog：面向增量计算的编程语言，编译器自动合成增量实现；内存存储、无存储引擎**（等级 A）
  - URL：https://github.com/vmware/differential-datalog （README 原文：https://raw.githubusercontent.com/vmware/differential-datalog/master/README.md ）
  - 标题：Differential Datalog (DDlog) README｜机构：VMware（现维护于 Feldera 生态）｜日期：README 持续更新，访问 2026-08-12
  - 摘录："DDlog is a programming language for *incremental computation*…the programmer does not need to worry about writing incremental algorithms. Instead they specify the desired input-output mapping in a declarative manner, using a dialect of Datalog. The DDlog compiler then synthesizes an efficient incremental implementation. DDlog is based on … differential dataflow library."；"**In-memory**: DDlog stores and processes data in memory. In a typical use case, a DDlog program is used in conjunction with a persistent database, with database records being fed to DDlog as ground facts and the derived facts computed by DDlog being written back to the database."（"无存储引擎"为对其内容的准确转述：README 未以"storage engine"字样出现，而是明确"in conjunction with a persistent database"；判断为 A 级原文依据充分。）

- **K2｜DDlog 论文：bottom-up、增量、内存、强类型 Datalog 引擎；三类关系（input/output/intermediate）**（等级 A）
  - URL：https://github.com/vmware/differential-datalog/blob/master/doc/datalog2.0-workshop/paper.pdf
  - 标题：Differential Datalog（Leonid Ryzhyk, Mihai Budiu）｜机构：VMware Research｜日期：Datalog 2.0 Workshop, 2019（README 标注）
  - 摘录："DDlog is a bottom-up, incremental, in-memory, typed Datalog engine for building embedded deductive databases."；"There are three kinds of relations in DDlog: Input relations … provided by the environment, in an incremental way. Output relations … computed by the DDlog program … Intermediate relations: these are also computed by the DDlog program, but they are hidden from the environment."

- **K3｜DDlog 事务 API：单事务、原子提交、产出全部输出变化；规则=join/antijoin/union+聚合+flatmap，递归支持分层否定**（等级 A）
  - URL：同上（paper.pdf）
  - 标题/机构/日期：同 K2
  - 摘录："After starting a transaction the user can insert and delete any number of tuples from input relations. When attempting to commit a transaction all updates are applied atomically and changes to all output relations are produced."；"DDlog rules are composed of standard Datalog operators: joins, antijoins, and unions … as well as aggregation, and flatmap … DDlog allows recursive rules with stratified negation."

- **K4｜DDlog CLI：文本命令 insert/delete/clear/commit/dump/dump_changes——文本是接口层，不是存储层**（等级 A）
  - URL：https://github.com/vmware/differential-datalog/blob/master/doc/command_reference/command_reference.md
  - 标题：Command Language Reference｜机构：VMware（DDlog 项目）｜日期：仓库 master 持续更新，访问 2026-08-12
  - 摘录："`insert <record>,` | `insert Rel1(1,true,"foo");` | insert record to relation Rel1"；"`delete <record>,` … delete record from Rel1"；"`commit dump_changes;` | … | commit current transaction and dump all changes to output relations"；"`dump <relation>;` … dump the content of an individual output relation"

- **K5｜DDlog 字符串字面量有 C-like 转义（grep 前必须解析/规范化）**（等级 A）
  - URL：https://github.com/vmware/differential-datalog/blob/master/doc/language_reference/language_reference.md
  - 标题：Language Reference｜机构：VMware（DDlog 项目）｜日期：仓库 master 持续更新，访问 2026-08-12
  - 摘录："In quoted strings, e.g.,`"foo\nbar"` C-like escape are recognized; for example single quotes and backslash characters can be escaped using backslashes; `\n` is newline, and `\t` is tab. Unicode character with code 100 can be written as `\u{100}`."

- **K6｜DBSP：任意 DBSP 程序的一般增量算法；覆盖非单调递归；Z 集合负多重度=删除**（等级 A）
  - URL：https://arxiv.org/abs/2203.16684 （PDF：https://arxiv.org/pdf/2203.16684 ）
  - 标题：DBSP: Automatic Incremental View Maintenance for Rich Query Languages｜机构：作者单位 VMware Research / Materialize Inc. / UPenn（arXiv 作者 Budiu, McSherry, Ryzhyk, Tannen）｜日期：arXiv 提交 2022-03-30
  - 摘录："we give a general algorithm for solving the incremental view maintenance problem for arbitrary DBSP programs … we show how to model many rich database query languages (including the full relational queries, grouping and aggregation, monotonic and non-monotonic recursion, and streaming aggregation) using DBSP."；"Multiplicities can be negative."

- **K7｜DBSP 时间=事务计数而非墙钟；PVLDB 2023 正式发表（Crossref 元数据核验）**（等级 A/B 混合：正文 A，书目元数据经 Crossref B 佐证）
  - URL：https://arxiv.org/abs/2203.16684 ；正式版 https://doi.org/10.14778/3587136.3587137
  - 标题：DBSP: Automatic Incremental View Maintenance for Rich Query Languages｜机构：PVLDB（ACM/Proc. VLDB Endow.）｜日期：PVLDB 16(7):1601-1614，published-print 2023-03（Crossref）
  - 摘录（arXiv）："Time is not the wall-clock time, but essentially a counter of the sequence of transactions applied to the database."；Crossref 元数据：title "DBSP: Automatic Incremental View Maintenance for Rich Query Languages"，DOI 10.14778/3587136.3587137，page 1601-1614，volume 16，issue 7（2023-03）。

- **K8｜Feldera：官方自述"只查变化、完全避免重算旧数据"，基于 DBSP 理论**（等级 A）
  - URL：https://docs.feldera.com/ （标题即 "What is Feldera?"）
  - 标题：What is Feldera?｜机构：Feldera｜日期：官方文档，访问 2026-08-12
  - 摘录："Feldera is a fast query engine for incremental computation."；"When the pipeline receives changes, Feldera incrementally updates all the views by only looking at the changes and it completely avoids recomputing over older data."

- **K9｜Feldera Publications 页：DBSP 获 VLDB 2023 最佳论文奖；VLDB Journal 2025 长版**（等级 A）
  - URL：https://docs.feldera.com/literature/papers/
  - 标题：Publications｜机构：Feldera｜日期：访问 2026-08-12
  - 摘录："The following publications and awards describe Feldera's theoretical foundation, DBSP. Awards … 🏆 DBSP wins Best Paper award at VLDB 2023"；"DBSP: automatic incremental view maintenance for rich query languages … VLDB Journal, Vol 34 no 39, April 2025. A longer version of the paper."

- **K10｜RDFox：main-memory RDF 存储；物化删除限于显式输入事实，派生事实删除被点名"belief revision / view update"**（等级 A）
  - URL：https://docs.oxfordsemantic.tech/7.6/reasoning.html （文档 v7.6，访问 2026-08-12）
  - 标题：10. Reasoning（RDFox 文档）｜机构：Oxford Semantic Technologies｜日期：文档版本 7.6（访问 2026-08-12）
  - 摘录："whenever data triples and/or rules are added and/or deleted, the 'old' materialization must be replaced with the 'new' materialization that contains all triples that follow from the updated input. In this setting, deletion of triples is restricted to those that are explicit in the input graph and hence one does not consider deletion of derived triples—a complex problem known in the literature as belief revision or view update."；welcome 页（https://docs.oxfordsemantic.tech/7.6/index.html ）："RDFox® is a main-memory, scalable, centralized data store … Rules in RDFox can be represented using a powerful extension of the well-understood Datalog language…"

- **K11｜RDFox：成熟增量物化维护算法（数据与规则增删均可），源于 Oxford 研究**（等级 A）
  - URL：https://docs.oxfordsemantic.tech/7.6/reasoning.html
  - 标题/机构/日期：同 K10
  - 摘录："RDFox implements sophisticated algorithms for both efficiently computing materializations and maintaining them under addition/deletion updates that may affect both the data and the rules."

- **K12｜Backward/Forward 算法论文：针对 DRed 在多重推导时低效而提出 B/F，删除判定改为"先判定删/留"**（等级 A；性能数字不引用、不作比较）
  - URL：https://ojs.aaai.org/index.php/AAAI/article/view/9365
  - 标题：Incremental Update of Datalog Materialisation: The Backward/Forward Algorithm（Boris Motik, Yavor Nenov, Robert Piro, Ian Horrocks）｜机构：University of Oxford, Dept. of Computer Science｜日期：AAAI 2015（pp. 1560–1568）
  - 摘录："the widely known Delete/Rederive (DRed) algorithm, can be inefficient in cases when facts have many alternate derivations. As a possible remedy, we propose a novel Backward/Forward (B/F) algorithm that tries to reduce the amount of work by a combination of backward and forward chaining."；"our algorithm … instead of a potentially inefficient overdeletion phase, it determines whether deleted …"（ISWC 2015 系统文亦引用："RDFox employs a novel incremental reasoning algorithm [14] that reduces the overall work by identifying early on whether a fact should be deleted or kept"；[14] 即本 B/F 论文——两处互相印证，等级 A）。

- **K13｜RDFox Delta Queries：查询答案变化按增/删增量计算、避免全量求值、留存可追溯**（等级 A）
  - URL：https://docs.oxfordsemantic.tech/7.6/transactions.html
  - 标题：11. Transactions（RDFox 文档）｜机构：Oxford Semantic Technologies｜日期：文档版本 7.6（访问 2026-08-12）
  - 摘录："RDFox efficiently computes and records changes to the query answers as additions and deletions. These changes are computed incrementally, thus avoiding full query evaluation. The answer changes are stored alongside the original query answers. … This ensures historical tracking and traceability of changes over time."

- **K14｜RDFox 官方审计日志先例：增量 Datalog 规则 + commit procedure**（等级 A）
  - URL：https://docs.oxfordsemantic.tech/7.6/transactions.html （§11.6 "Example: Audit logging with commit procedures"）
  - 标题/机构/日期：同 K13
  - 摘录："Because rules are evaluated incrementally, the cost of identifying the new actions in each transaction will now be proportional to the number of new instances rather than the total number of instances in the data store."（规则原文：`[?a, a, :NewAction] :- [?a, a, :Action], NOT EXISTS ?anyRole IN ( [?a, :actionTakenBy, ?anyRole] :actionLog ).`，commit procedure 为 `INSERT { GRAPH :actionLog { ?action :actionTakenBy ?role; :actionTakenAt ?now. } } WHERE { ?action a :NewAction . BIND(ROLE() AS ?role) BIND(NOW() AS ?now) }`）；同节另述："commit procedures can delete as well as add facts whereas rules can only add facts"（单调事实层 = 规则只增的支撑；官方还注明该示例"does not constitute a production-ready audit logging feature"，为工程示例而非产品功能）。

- **K15｜RDFox 持久化：快照+零或多个 delta、compaction 原子替换、CRC64 校验**（等级 A）
  - URL：https://docs.oxfordsemantic.tech/7.6/persistence.html
  - 标题：13. Persistence（RDFox 文档）｜机构：Oxford Semantic Technologies｜日期：文档版本 7.6（访问 2026-08-12）
  - 摘录："The content of a data store is saved as a snapshot followed by zero or more deltas. When a data store is compacted, the saved data is replaced by a fresh snapshot…"；"the process of compacting a data store first saves the current snapshot into a new file, and then it atomically replaces the old file with the new file."；"RDFox will use the CRC64 checksum algorithm to detect data corruption."

- **K16｜RDFox 导入导出：N-Triples/Turtle 纯文本 RDF 格式；Datalog 规则/事实为专有格式 application/x.datalog**（等级 A）
  - URL：https://docs.oxfordsemantic.tech/7.6/import-and-export.html
  - 标题：8. Import and Export（RDFox 文档）｜机构：Oxford Semantic Technologies｜日期：文档版本 7.6（访问 2026-08-12）
  - 摘录："RDFox uses a proprietary format described in Section 10.4 to capture datalog rules and facts. The MIME type of this format is application/x.datalog."；"The N-Triples format has MIME type application/n-triples."；"The Turtle format has MIME type text/turtle."

- **K17｜LogicBlox：增量物化维护工作量与 trace edit distance 成正比；不可变版本、O(1) 分支、时旅行、版本 DAG**（等级 A；机制描述，不含性能比较）
  - URL：https://www.cs.ox.ac.uk/people/dan.olteanu/papers/logicblox-sigmod15.pdf （正式版 DOI 10.1145/2723372.2742796，ACM DL）
  - 标题：Design and Implementation of the LogicBlox System｜机构：LogicBlox, Inc.（作者含 UCSC/UCLA/EPFL/LogicBlox；Ox 副本托管于 Dan Olteanu 个人页）｜日期：SIGMOD 2015
  - 摘录："LogicBlox supports efficient incremental materialized view maintenance. Our incremental maintenance algorithm … improves significantly on the classical count and DRed algorithms [20] by guaranteeing that the work done is proportional to the trace edit distance between the before and after computations."；"Each transaction starts by branching a version of the database in O(1) time…"；"We get useful temporal features such as time-travel essentially for free. We can branch any past version of the database, and the version graph can be an arbitrary directed acyclic graph."

- **K18｜W3C N-Triples：line-based 纯文本格式（标准层面的"可 grep 事实文本"基础，但字面量含转义）**（等级 A）
  - URL：https://www.w3.org/TR/n-triples/
  - 标题：RDF 1.1 N-Triples（W3C Recommendation）｜机构：W3C｜日期：2014-02-25（REC）
  - 摘录："N-Triples is a line-based, plain text format for encoding an RDF graph."（该规范同时定义字面量的转义/IRI 引用解析规则，故"逐字"需先解析，见 Q5。）

- **K19｜Soufflé 增量研究：弹性增量 = 高影响变更全量重算（Bootstrap）/ 低影响变更增量更新（Update）**（等级 A；现状有未决：官方主分支未合入）
  - URL：https://doi.org/10.1145/3479394.3479415 （PPDP 2021，Crossref 元数据核验：23rd International Symposium on Principles and Practice of Declarative Programming，2021-09-06；PDF 文本已到手）
  - 标题：Towards Elastic Incrementalization for Datalog（David Zhao, Mukund Raghothaman, Pavle Subotić, Bernhard Scholz；U. Sydney / USC / Microsoft）｜机构：ACM PPDP 2021｜日期：2021-09-06
  - 摘录："The first strategy is a Bootstrap strategy that recomputes the entire result for high-impact changes. The second is an Update strategy that performs an incremental update for low-impact changes."
  - 附：Soufflé Facts 官方页（https://souffle-lang.github.io/facts ）："Facts are clauses that unconditional hold; they are rules with a head, but no rule body. In facts, all arguments must be constant terms."（Q5 相关：Soufflé 事实即程序内常量子句，输入 directive 可加载 .facts 文件，等级 A。）

## 3 冲突与张力

1. **"程序即数据"与"事实文件"的措辞冲突**：DDlog README/论文把程序编译成数据流图、关系是内存状态（"程序即数据"可理解为程序被数据化编译），而任务假设里"关系事实文件"在 DDlog 中没有对应物（无存储引擎）。两者不矛盾，但若上游把它当作"DDlog 有事实文件"则是误读。RDFox 有明确的 N-Triples 事实文本层，但规则/事实的 Datalog 格式是专有的（K16）。
2. **"完全增量"承诺 vs 工程折衷**：DBSP 论文承诺"任意 DBSP 程序"的一般增量算法（K6），Feldera 宣称"完全避免重算旧数据"（K8）；而 Soufflé 的弹性增量研究明确说"增量并不总是比重算便宜"，高影响变更选全量重算（K19）。这是理论"自动增量"与工程"必要时重算"之间的真实张力，两者都属实（机制层，非性能比较）。
3. **派生事实的删除语义**：RDFox 官方把"派生三元组能否显式删除"标为 belief revision/view update 难题并**不做**（K10）；而"当前视图随撤销收缩"（非单调视图）正是状态机"晋升/降级"需要的语义。RDFox 的增量引擎在规则重算时会移除不再成立的派生事实（物化更新），但用户不能直接 delete 一条派生事实——这对审计/晋升建模意味着：状态转换必须通过"事实层增删 + 规则重算"表达，而不是直接改派生事实。
4. **审计示例的生产级声明**：RDFox 官方审计日志示例自带免责声明"does not constitute a production-ready audit logging feature"（K14），即它是机制示范而非产品承诺；引用时不能拔高为"RDFox 提供生产级审计日志"。

## 4 未决

- **U1**（Q4 分层建模）：未找到把"候选边→审计通过→晋升正式边"整条状态机显式分层命名（如 monotonic fact layer + non-monotonic view layer）的官方文档/论文原话；现有证据是散点式的（RDFox 审计示例、LogicBlox 版本分支、DBSP 负权重、Soufflé 弹性策略），组合推断标 C。
- **U2**（Q5 逐字校验）：未在抓到的来源中找到任何系统官方文档明示"事实文件可被外部 grep -F 逐字校验"；"追加式纯文本事实/日志层"的工程组合（RDFox N-Triples 输入 + 只增 actionLog + 导出）为推断，标 C。
- **U3**（DDlog 事实文件形态）：DDlog 文档未定义"关系事实文件"的持久格式（只有 CLI 文本命令与外部 DB 对接），如需"DDlog 原生事实文件"证据：未核（不捏造）。
- **U4**（审计日志落盘形态）：RDFox 审计示例的 commit procedure 写入 `:actionLog` 图，但官方示例未说明该图的持久化文件格式/路径细节，未核。
- **U5**（RDFox 文档发布日）：RDFox 7.6 文档无逐页发布日期，以"版本 7.6 + 访问日期 2026-08-12"计；如需精确发布日期：未核。
- **U6**（Soufflé 弹性增量合入状态）：PPDP 2021 论文的增量策略在 Soufflé 主分支的合入状态以官方发布说明为准，本次未抓取该发布说明，未核。

## 5 来源清单

已核来源（可核 17，其中原文到手 14；类型：工程文档/官方文档 ≥10、学术论文 5、标准 1——共 3 类）：

1. DDlog README｜https://github.com/vmware/differential-datalog（raw README.md）｜工程文档｜原文到手｜A
2. DDlog 论文 Differential Datalog（Ryzhyk & Budiu, VMware Research, Datalog 2.0 Workshop 2019）｜https://github.com/vmware/differential-datalog/blob/master/doc/datalog2.0-workshop/paper.pdf｜学术论文｜原文到手｜A
3. DDlog Language Reference｜https://github.com/vmware/differential-datalog/blob/master/doc/language_reference/language_reference.md｜工程文档｜原文到手｜A
4. DDlog Command Reference｜https://github.com/vmware/differential-datalog/blob/master/doc/command_reference/command_reference.md｜工程文档｜原文到手｜A
5. DDlog Tutorial｜https://github.com/vmware/differential-datalog/blob/master/doc/tutorial/tutorial.md｜工程文档｜原文到手｜A
6. DDlog model.tex（Streaming Differential Datalog）｜https://github.com/vmware/differential-datalog/blob/master/doc/model/model.tex｜工程文档/源码｜原文到手｜A（佐证差分语义，正文未直接引用）
7. DBSP arXiv 论文｜https://arxiv.org/abs/2203.16684｜学术论文（arXiv）｜原文到手｜A
8. DBSP PVLDB 2023（Crossref 元数据）｜https://doi.org/10.14778/3587136.3587137｜学术论文（书目元数据）｜原文未到手（元数据到手）｜B
9. Feldera "What is Feldera?"｜https://docs.feldera.com/｜工程文档｜原文到手｜A
10. Feldera Publications｜https://docs.feldera.com/literature/papers/｜工程文档｜原文到手｜A
11. RDFox 文档 Welcome/Reasoning/Transactions/Persistence/Import-and-Export（v7.6）｜https://docs.oxfordsemantic.tech/7.6/（各节 URL 见 K10–K16）｜工程文档｜原文到手｜A
12. RDFox ISWC 2015 论文 RDFox: A Highly-Scalable RDF Store｜https://link.springer.com/chapter/10.1007/978-3-319-25010-6_1｜学术论文｜原文到手｜A
13. RDFox AAAI 2015 B/F 论文｜https://ojs.aaai.org/index.php/AAAI/article/view/9365｜学术论文｜原文到手｜A
14. LogicBlox SIGMOD 2015 论文｜https://www.cs.ox.ac.uk/people/dan.olteanu/papers/logicblox-sigmod15.pdf（DOI 10.1145/2723372.2742796）｜学术论文｜原文到手｜A
15. Soufflé Facts 官方文档｜https://souffle-lang.github.io/facts｜工程文档｜原文到手｜A
16. Soufflé PPDP 2021 论文 Towards Elastic Incrementalization for Datalog｜https://doi.org/10.1145/3479394.3479415｜学术论文｜原文到手｜A
17. W3C RDF 1.1 N-Triples REC｜https://www.w3.org/TR/n-triples/｜标准｜原文到手｜A

未核来源：0（有抓取失败或未抓取的项已列入 U3/U5/U6 的"未核"注记，不冒充来源）。

## 6 判死自查

- [x] 问题清单 5 问全部逐条回答（第 1 节）。
- [x] 关键发现均带 URL+标题+机构+日期+原文摘录+等级 A/B/C（第 2 节，19 条关键发现）。
- [x] 可核来源 ≥15：17 个；原文到手 ≥10：14 个。
- [x] 来源类型 ≥3 类：工程文档/官方文档、学术论文（arXiv/AAAI/ISWC/SIGMOD/PPDP/PVLDB）、W3C 标准。
- [x] 候选逐一查证 ≥5：DDlog、DBSP、RDFox、LogicBlox、Soufflé、Feldera、W3C N-Triples（7 个候选，均已抓原文/元数据核验）。
- [x] 关键词 ≥4 组，实际使用：DDlog incremental language design（Q1）、DBSP automatic incrementalization（Q2）、RDFox incremental reasoning updates（Q3）、Datalog monotonic facts / non-monotonic view layering（Q4）、grep-able fact files（Q5 追加组）。
- [x] 不比较引擎性能：全文只描述机制、算法性质、存储形态；AAAI/LogicBlox/Soufflé 中的效率语句仅作机制引文摘录，未跨引擎对比。
- [x] 推断标 C：Q4 分层建模、Q5 逐字校验组合均为 C；K6/K7 混合处已注明等级构成。
- [x] 不越界：时间版本语义（B4）、校验语言（B5/B8）未展开；RDFox 审计示例因属增量机制+审计场景而保留。
- [x] 中文输出。
