# B2a 属性图工具：GQL / SQL·PGQ 实现、交换格式与时态属性图版本化 —— 发现报告

- 调研员：B2a（深度调研树 B2 属性图系第二轮子任务）
- 任务卡：research_tree/tasks/B2a_属性图工具.md
- 调研日期：2026-08-12
- 证据等级约定：A=官方一手原文到手并直接引用（ISO 页面、厂商官方文档/博客、arXiv 全文）；B=可靠来源原文到手但经存档/快照（Wayback、维基百科）或规范 URL 未在抓取中记录；C=推断或未直接核实。
- 原文抓取存档：research_tree/logs/B2a/（HTML/PDF 全文 90+ 文件，本报告摘录均可在其中复核）。

## 0 一句话结论

ISO/IEC 39075:2024（GQL）与 ISO/IEC 9075-16:2023（SQL/PGQ）均已正式发布（2024-04、2023-06），但截至 2026-08 无任何主流引擎声明"完整实现 GQL"：Neo4j 以 Cypher 兼容路线声明覆盖"大部分必选+相当部分可选 GQL 特性"并按 GG01 作最小符合声明；Google Spanner 声明同时支持 GQL 与 SQL/PGQ（分特性）；Oracle 23ai 自称"首个商业 SQL/PGQ 实现"；DuckDB（DuckPGQ 扩展）与 PostgreSQL 19 开发版实现 SQL/PGQ；TigerGraph 仅"正在实施 GQL"，Memgraph 以联邦翻译引擎实现 GQL。属性图**没有 ISO 级交换格式**——GQL 未定义序列化，实际交换靠 PG Format/PG-JSON/PG-JSONL、GraphML、Graphviz DOT、Cypher dump（APOC export.cypher）与 CSV/JSON 导出；时态属性图版本化已有学术/工程先例（AeonG 双存储+anchor+delta、Gradoop/TPGM、Grit 查询式 delta、ConVer-G），但无统一标准、无开箱产品。对"522 节点个人图谱、封闭边词表 9+other、候选池+审计晋升"的需求：**不必须专用图数据库**——SQL/PGQ（DuckDB/PostgreSQL/Oracle）或 Cypher 系（Neo4j）均可承担图查询与约束校验，纯文本 Cypher/PGQ 语句作为存储与交换是可行且已被官方 dump 工具采用的做法，但"审计晋升"状态机与版本回溯无现成组件，需自建（版本化机制细节归 B4）。

## 1 逐条回答

**Q1：GQL 标准发布后，有哪些公开实现/计划？各实现支持 GQL 的哪部分？**
答：已逐一查证 12 个候选（详见 F9-F26、F28、F39）。现状分层如下：
- 声明"支持"且有官方符合性细节：Neo4j（Cypher 兼容路线，"most mandatory GQL features and a substantial portion of its optional ones"，按 24.2 子条款声明 GG01 最小符合，同时官方列出 SESSION/事务语句/CURRENT_GRAPH/AT 子句等 mandatory 未支持项）；Google Spanner（"Both standards are supported"，即 GQL 与 SQL/PGQ，但分特性，如 graph-table 互操作 GQL 不支持）；Ultipa（"supports nearly all GQL features"，声明 GG01+GG02）。
- 明确"正在实施/规划"：TigerGraph（2024-04-19 博客"actively implementing GQL"）；AWS/Neptune（官方博客只谈 openCypher 逐步向 GQL 演进，未宣布实现）。
- 以翻译/联邦方式提供 GQL：Memgraph（2026-05-05 博客：MemGQL 联邦引擎"implements ISO/IEC 39075"，把 GQL 翻译到后端语言）。
- 产品级 GQL 语言支持：Microsoft Fabric（官方文档称"GQL is the ISO-standardized query language"）。
- 开源工程/研究工具：TuGraph gql-grammar（ANTLR4 语法文件，基于 2023.03 草案，自述 draft stage）；OlofMorra/GQL-parser（TU/e 实习研究子集）；Wikipedia 据此称"第一个可解释 GQL 的内存图数据库可用"。
- 结论：**GQL 生态处于"标准已定、实现部分化"阶段，无完整 GQL 实现声明**（C 推断，见 F26）。

**Q2：SQL/PGQ 实现现状：哪些主流数据库声明支持？**
答：注意标准编号口径：官方 ISO 页显示 SQL/PGQ 是 ISO/IEC 9075-16:2023（SQL 第 16 部分，2023-06-01 出版，269 页；任务卡所称"第 20 部分"系流传口径，以 ISO 官方页为准）。声明支持者：Oracle Database 23ai（官方博客自述"first commercially available SQL/PGQ implementation"），DuckDB（DuckPGQ 扩展，官方文档+PVLDB/CIDR 论文），PostgreSQL（官方 19 开发版文档明写"PostgreSQL implements SQL/PGQ"），Google Spanner（SQL/PGQ 与 GQL 同时声明支持），Microsoft Fabric。详见 F13、F22-F25。

**Q3：属性图是否有"交换格式"标准或事实标准？实际用什么交换？**
答：**无 ISO 级交换格式标准**。GQL 未定义图数据序列化/交换条款（公开资料未见，未购标准原文核验，C 推断）；SQL/PGQ 定义图数据在关系表上的视图语义而非交换格式。实际事实标准/工程先例：PG Format 系列（PG 文本/PG-JSON/PG-JSONL，arXiv:1907.03936 论文背书）、GraphML（XML 图文件格式）、Graphviz DOT（纯文本图描述）、Cypher dump（APOC export.cypher 把库导出为可重放 Cypher 语句）、CSV/JSON 导出。详见 F27-F33。

**Q4：属性图存储的版本化先例（temporal property graph）？**
答：存在成体系学术与工程先例：AeonG（内置时态图数据库，current+historical 双存储+anchor+delta 增量，PVLDB 17(6) 2024）；Gradoop/TPGM（Rost 博士论文，双时态属性图模型+分布式数据流参考实现）；Grit（TU Delft 硕士论文，Git 风格命令行工具，delta 编码为"重建查询"）；ConVer-G（知识图谱并发版本化，对快照/区间/增量三类方案系统梳理）。但无统一标准格式、无商业开箱产品，且均以"分析/回溯查询"为目标，与"审计晋升"的校验语义仍有距离（详见 F34-F38，机制细节归 B4）。

**Q5：对"522 节点个人图谱、封闭边词表 9+other、候选池+审计晋升"需求，属性图语言/存储的查询与校验能力边界？**
答：图查询（邻接/路径/子图模式）与数据约束（唯一性、属性存在、标签/类型约束）是属性图语言内建能力（Neo4j 官方约束文档、GQL 的 graph type/GG01-GG05 特性、SQL/PGQ 的 GRAPH_TABLE 模式匹配均直接支持），522 节点规模远低于任何引擎的量级门槛，**不必须专用图数据库**。纯文本 Cypher/PGQ 语句作为存储与交换可行（官方 dump 流程正是"语句即存储/交换"），但直接作为"可查询数据库"缺查询引擎，须配合引擎解析执行；"封闭边词表 9+other"可用约束/枚举校验，"候选池+审计晋升"的晋升状态机、审批流、时间版本回溯属应用层语义，图语言无内建支持，需自建（版本化机制归 B4）。此为 A 级来源（约束/查询能力）+C 级推断（方案边界）组合论断。

## 2 关键发现（39 条，F1-F39）

### 2.1 标准层（F1-F8）

**F1｜GQL（ISO/IEC 39075:2024）已正式发布，610 页**
- 论断：GQL 是 ISO 官方出版的属性图数据库语言国际标准，第一版 2024-04 出版。
- URL：https://www.iso.org/standard/76120.html
- 标题：ISO/IEC 39075:2024 - Information technology — Database languages — GQL
- 机构：ISO（ISO/IEC JTC 1/SC 32）
- 日期：Publication date 2024-04；生命周期 60.60 里程碑 2024-04-12"International Standard published"
- 原文摘录："Status : Published / Publication date : 2024-04 ... Number of pages : 610"
- 等级：A

**F2｜SQL/PGQ（ISO/IEC 9075-16:2023）已正式发布，269 页**
- 论断：SQL:2023 的图查询部分官方编号为 ISO/IEC 9075-16:2023"Property Graph Queries (SQL/PGQ)"，2023-06 出版（任务卡所称"第 20 部分"口径与官方页不符，以本页为准）。
- URL：https://www.iso.org/standard/79473.html
- 标题：ISO/IEC 9075-16:2023 - Information technology — Database languages SQL — Part 16: Property Graph Queries (SQL/PGQ)
- 机构：ISO
- 日期：2023-06（60.60 里程碑 2023-06-01）
- 原文摘录："Edition 1 2023-06 ... Number of pages : 269"
- 等级：A

**F3｜JTC1 官方文章确认 GQL 是"完整数据库语言"，2024-04-11 正式出版**
- 论断：GQL 不只是查询语言，还包含建图/增删改（DML）与图类型（schema）机制。
- URL：https://jtc1info.org/slug/gql-database-language/
- 标题：GQL Database Language
- 机构：ISO/IEC JTC 1（作者 Keith W. Hare，JTC 1/SC 32/WG 3）
- 日期：2024-04-18（脚注 1："The GQL standard was officially published 2024-04-11."）
- 原文摘录："The GQL standard is a full database language supporting creating, reading, updating, and modifying property graph data. The property graph data can either be schema-free or constrained by a full Graph Type – a property graph schema."
- 等级：A（官方 PDF 全文 7 页到手：logs/B2a/jtc1_gql_article.pdf）

**F4｜GQL 的 FDIS 投票与出版公告（gqlstandards.org）**
- 论断：GQL FDIS 表决 14 票赞成、0 票反对、6 票弃权，2024-04-17 公告正式出版。
- URL：https://web.archive.org/web/20260611153942/https://www.gqlstandards.org/（Wayback 快照）
- 标题：Graph Query Language GQL — GQL Standard（社区站，JCC Consulting 代管）
- 机构：ISO GQL Proponents 社区站（gqlstandards.org）
- 日期：2024-03-29 状态更新、2024-04-17 出版公告
- 原文摘录："The GQL FDIS ballot closed on 2024-03-23 ... with 14 national standards bodies approving, 0 disapproving, and 6 abstaining."；"April 17, 2024 – The GQL Standard is published! The GQL standard, ISO/IEC 39075:2024 ... is officially published and available for purchase on the ISO web store!"
- 等级：B（Wayback 存档原文到手）

**F5｜GQL 与 SQL/PGQ 共享 GPML；GQL 独有图专属类型与 DML**
- 论断：两标准共用"图模式匹配语言 GPML"，GQL 的差异化是 graph-only 数据类型（Vertex/Edge/Path）、建图与增删改等 SQL/PGQ 没有的能力。
- URL：https://web.archive.org/web/20260415230221/https://www.gqlstandards.org/what-is-a-gql-standard
- 标题：What is a GQL Standard?
- 机构：gqlstandards.org
- 日期：页面内容截至 2023-11（"as of November, 2023"）
- 原文摘录："Graph Pattern Matching — Identical to Graph Pattern Matching in SQL/PGQ:2023"；"GQL Specific Capabilities — Graph-only data types: Vertex, Edge, Path"；"Create Graph / Insert/Update/Delete Queries (using GPM) / Open graphs or graph types to constrain the contents of a graph"
- 等级：B

**F6｜GQL 标准定义"最小符合性"（子条款 24.2），实现可声明特性符合**
- 论断：GQL 按特性（feature）声明符合性（如 GG01 开放图类型、GG02 封闭图类型），厂商可只声明部分符合——这是理解"各家支持程度不一"的关键机制。
- URL：https://neo4j.com/docs/cypher-manual/current/appendix/gql-conformance/（引用标准子条款）
- 标题：GQL Conformance
- 机构：Neo4j 文档
- 日期：文档版本 2026.06（抓取于 2026-08-12）
- 原文摘录："Following the GQL Standard subclause 24.2, Minimum conformance, Cypher's support of the following mandatory GQL features is explicitly declared: Graph with an open graph type (Feature GG01)."
- 等级：A

**F7｜未发现 GQL 定义图数据序列化/交换格式的公开证据**
- 论断：GQL 规范公开摘要、JTC1 官方文章、Neo4j 符合性文档均只谈查询语言/图类型/符合性，未提及图数据交换或序列化条款；结合 B2 一轮结论（GQL 未定义交换格式），本子任务以"未核（未购买标准原文，无法绝对排除）"处理。
- URL：同 F1/F3/F6（三处公开文档均无序列化条款提及）
- 标题：见 F1/F3/F6
- 机构：见 F1/F3/F6
- 日期：见 F1/F3/F6
- 原文摘录：无直接摘录（缺证）
- 等级：C（推断）+ 未核

**F8｜GQL 标准生命周期进入"待修订"（90.92）**
- 论断：ISO 官方页显示 GQL 出版后很快进入复审（90.92 于 2024-06-23），说明标准处于演进中，实现接口可能变化。
- URL：https://www.iso.org/standard/76120.html
- 标题：同 F1
- 机构：ISO
- 日期：2024-06-23（90.92 里程碑）
- 原文摘录："Stage : International Standard to be revised [90.92] ... 90.92 2024-06-23 International Standard to be revised"
- 等级：A

### 2.2 GQL/SQL·PGQ 实现层（F9-F26）

**F9｜Neo4j：Cypher 覆盖"大部分必选+相当部分可选 GQL 特性"，按 GG01 最小符合声明**
- 论断：Neo4j 不提供独立 GQL 引擎，而是让 Cypher 兼容 GQL 语义并作符合性声明。
- URL：https://neo4j.com/docs/cypher-manual/current/appendix/gql-conformance/
- 标题：GQL Conformance
- 机构：Neo4j 文档
- 日期：2026.06 版（抓取于 2026-08-12）
- 原文摘录："GQL has adopted much of Cypher's query construction semantics ... Consequently, Cypher now accommodates most mandatory GQL features and a substantial portion of its optional ones (defined by the ISO/IEC 39075:2024(en) ... GQL Standard)."
- 等级：A

**F10｜Neo4j 官方列出未支持的 mandatory GQL 特性（SESSION/事务/CURRENT_GRAPH/AT）**
- 论断：Neo4j 的符合性并不完整：会话管理、事务语句、图引用值 CURRENT_GRAPH、schema 选择的 AT 子句等 mandatory 特性由驱动 API 替代而非 GQL 语句支持。
- URL：https://neo4j.com/docs/cypher-manual/current/appendix/gql-conformance/unsupported-mandatory/
- 标题：GQL Conformance — Unsupported Mandatory Features
- 机构：Neo4j 文档
- 日期：2026.06 版（抓取于 2026-08-12）
- 原文摘录："7.1-7.3 Session management — GQL defines the following session commands: SESSION SET, SESSION RESET, and SESSION CLOSE. Neo4j offers session management through the driver session API."；"11.1 Graph expressions — GQL defines the following graph reference values commands: CURRENT_GRAPH and CURRENT_PROPERTY_GRAPH."；"17.1 Schema reference — GQL defines an AT clause for selecting the current schema ... HOME_SCHEMA and CURRENT_SCHEMA."
- 等级：A

**F11｜Neo4j 从 5.23/5.25 起按 GQL 标准返回状态码**
- 论断：Neo4j 将错误/通知码迁移到 GQL 标准（GQLSTATUS），作为 GQL 支持的实施痕迹。
- URL：https://neo4j.com/docs/status-codes/current/
- 标题：Status Codes for Errors & Notifications
- 机构：Neo4j 文档
- 日期：2026.07 版（抓取于 2026-08-12）
- 原文摘录："Starting from 5.23 for notifications and 5.25 for errors, Neo4j supports the GQL standard."
- 等级：A

**F12｜Neo4j 官方博客：GQL 的八项核心设计（2024-05-07）**
- 论断：GQL 融合 openCypher/GSQL/PGQL 与 SQL，八项设计含属性图模型、ASCII 图模式、渐进式 schema（schema-free 与 fixed-schema 并存）。
- URL：https://neo4j.com/blog/cypher-and-gql/gql-database-language-standard/
- 标题：Creating the GQL database language standard
- 机构：Neo4j（作者 Keith Hare，Neo4j Query Languages Standards and Research Team）
- 日期：2024-05-07
- 原文摘录："GQL fuses ideas from industry-proven graph query languages, like openCypher, GSQL, and PGQL, with SQL ... into a full new database language standard, based on eight key ideas: Querying, updating, and managing graph databases using the property graph model. ... Gradual schema design enabled by supporting both schema-free and fixed-schema graphs."
- 等级：A

**F13｜Google Spanner：Graph 基于两个 ISO 标准，且"两个都支持"**
- 论断：Spanner Graph 同时声明支持 SQL/PGQ 与 GQL。
- URL：https://cloud.google.com/spanner/docs/graph/iso-standards
- 标题：Spanner Graph and ISO standards | Google Cloud Documentation
- 机构：Google Cloud
- 日期：页面无发布日期（抓取于 2026-08-12）
- 原文摘录："Spanner Graph is based on two ISO standards: ISO/IEC 9075-16:2023 ... Property Graph Queries (SQL/PGQ), Edition 1, 2023; ISO/IEC 39075:2024 ... GQL, Edition 1, 2024"；对照表中 "Both standards are supported."
- 等级：A

**F14｜Spanner 的"支持"是分特性的：GQL 不支持图-表互操作**
- 论断：同一官方页显示 GQL 与 SQL/PGQ 的支持程度不同——"Graph and table interoperability" 一栏 SQL/PGQ 为 Supported、GQL 为 Not supported，说明"Both standards supported"不等于对等完整实现。
- URL：https://cloud.google.com/spanner/docs/graph/iso-standards
- 标题：Spanner Graph and ISO standards
- 机构：Google Cloud
- 日期：抓取于 2026-08-12
- 原文摘录："Graph and table interoperability — Supported. / Not supported."（SQL/PGQ vs GQL 栏）
- 等级：A

**F15｜TigerGraph：官方博客称"正在积极实施 GQL"（2024-04-19）**
- 论断：TigerGraph 只给出实施承诺，未给支持范围或时间表；同时强调继续支持 openCypher。
- URL：https://www.tigergraph.com/blog/the-rise-of-gql-a-new-iso-standard-in-graph-query-language/
- 标题：The Rise of GQL: A New ISO Standard in Graph Query Language
- 机构：TigerGraph
- 日期：2024-04-19
- 原文摘录："At TigerGraph, we're actively implementing GQL to champion this standard, maintaining our unwavering commitment to both openCypher and GQL."
- 等级：A

**F16｜Memgraph：MemGQL 是"实现 ISO/IEC 39075"的联邦 GQL 查询引擎（2026-05-05）**
- 论断：Memgraph 通过翻译层把 GQL 查询下推到后端执行，属于"GQL 前端+任意后端"路线，而非自研完整 GQL 存储引擎。
- URL：https://memgraph.com/blog/introducing-memgraph-zero-memgql-federated-gql-engine
- 标题：Introducing Memgraph Zero and MemGQL: Easy Graph Intelligence for Everyone
- 机构：Memgraph
- 日期：2026-05-05
- 原文摘录："MemGQL is a federated GQL query engine that implements ISO/IEC 39075, the new international standard for graph query language. It translates standard GQL queries into the native language of whatever backend holds your data, executes them in place, and returns unified results."
- 等级：A

**F17｜Microsoft Fabric：官方文档以 GQL 为图查询语言**
- 论断：Fabric 的 graph 功能把 GQL 作为标准查询语言写入官方文档（与 SQL 同源工作组成果）。
- URL：https://learn.microsoft.com/en-us/fabric/graph/gql-language-guide
- 标题：GQL language guide for graph in Microsoft Fabric
- 机构：Microsoft
- 日期：页面未标发布日期（抓取于 2026-08-12）
- 原文摘录："GQL (Graph Query Language) is the ISO-standardized query language for graph databases. Use GQL to query, analyze, and work with graph data efficiently with graph in Microsoft Fabric. The same ISO working group that standardizes SQL develops GQL."
- 等级：A

**F18｜Ultipa：官方符合性页称"支持几乎全部 GQL 特性"，声明 GG01+GG02**
- 论断：Ultipa 是目前声明覆盖度最高的厂商之一（"nearly all"），并给出按 24.2 的逐特性符合清单。
- URL：https://www.ultipa.com/docs/gql/gql-conformance
- 标题：GQL Conformance
- 机构：Ultipa
- 日期：抓取于 2026-08-12
- 原文摘录："Ultipa now supports nearly all GQL features."；"Minimum Conformance Per subclause 24.2, Ultipa claims: Graph Type Support: Conformance to both Feature GG01 (open graph type) and Feature GG02 (closed graph type)."
- 等级：A

**F19｜TuGraph：开源 ANTLR4 语法文件，基于 2023.03 草案且自述 draft**
- 论断：TuGraph 提供的不是引擎实现而是语法文件，且基于标准草案（2023.03），说明其 GQL 支持仍在开发中。
- URL：https://github.com/TuGraph-family/gql-grammar
- 标题：ISO GQL (ISO/IEC 39075) Antlr4 Grammar File
- 机构：TuGraph 项目（GitHub 组织 TuGraph-family）
- 日期：抓取于 2026-08-12（仓库未标发布日期）
- 原文摘录："This repository contains the Antlr4 Grammar file implementation for the Graph Query Language standard (ISO/IEC 39075), which is currently in the draft stage. Our latest grammar files are based on the draft of version 2023.03."
- 等级：A

**F20｜OlofMorra/GQL-parser：TU/e 实习研究子集解析器；Wikipedia 称"首个可解释 GQL 的内存图数据库"**
- 论断：目前公开可见的"可运行 GQL"开源实现是研究性子集（ANTLR4 解析器+实习项目），不是产品级引擎；Wikipedia 据此给出谨慎表述。
- URL：https://github.com/OlofMorra/GQL-parser ；https://en.wikipedia.org/wiki/Graph_Query_Language
- 标题：GQL parser / Graph Query Language
- 机构：OlofMorra（个人，TU/e 实习）/ Wikipedia
- 日期：抓取于 2026-08-12
- 原文摘录："A GQL parser built with ANTLR v4. This parser is built to support my internship research at University of Technology Eindhoven (TU/e)."（GitHub）；"The first in-memory graph database that can interpret GQL is available."（Wikipedia，B 级）
- 等级：A（GitHub 原文到手）+ B（Wikipedia）

**F21｜AWS/Neptune：官方博客只谈 openCypher 向 GQL 演进，未宣布 GQL 实现**
- 论断：Neptune 立场是把 GQL 新特性逐步并入 openCypher 以"铺路"，而非即刻提供 GQL 引擎。
- URL：https://aws.amazon.com/blogs/database/gql-the-iso-standard-for-graphs-has-arrived/
- 标题：GQL: The ISO standard for graphs has arrived
- 机构：AWS Database Blog（作者 Philip Rathle、Brad Bebee）
- 日期：25 APR 2024
- 原文摘录："This work will continue, and we will add all of this to openCypher over time so that users looking for a straightforward path to GQL can gain access to this great functionality."
- 等级：A

**F22｜Oracle 23ai：自称"首个商业可用的 SQL/PGQ 实现"（完整 GQL 未声明）**
- 论断：Oracle 的图查询落地为 SQL/PGQ（在 SQL 内建属性图），未声明支持 GQL 的图专属 DML。
- URL：https://web.archive.org/web/20260812100105/https://blogs.oracle.com/database/property-graphs-in-oracle-database-23ai-the-sql-pgq-standard
- 标题：Property Graphs in Oracle Database 23ai: The SQL/PGQ Standard
- 机构：Oracle（作者 Oskar van Rest，Oracle Database Insider 博客）
- 日期：2025-03-19（Wayback 存档）
- 原文摘录："Oracle not only spearheaded the standardization effort but also introduced the first commercially available SQL/PGQ implementation as part of Oracle Database 23ai. Property graphs are deeply integrated into SQL ..."
- 等级：B（Wayback 存档原文到手）

**F23｜Oracle 官方文档：GRAPH_TABLE 运算符执行 SQL 属性图模式匹配**
- 论断：Oracle 文档给出 GRAPH_TABLE + MATCH 的查询范式，证明其图查询走 SQL/PGQ 语法而非 GQL。
- URL：未核（抓取未记录规范 URL；Brave 搜索快照指向 https://docs.oracle.com/en/database/oracle/oracle-database/26/sqlrf/graph_table-operator.html ，2025-11-07 版）
- 标题：SQL GRAPH_TABLE Queries（Graph Developer's Guide for Property Graph，Release 23.2）
- 机构：Oracle 文档
- 日期：Release 23.2（页面未标具体日期）
- 原文摘录："You can query a SQL property graph using the GRAPH_TABLE operator to express graph pattern matching queries. ... You must provide the graph to be queried as an input to the GRAPH_TABLE operator along with the MATCH clause containing the graph patterns to be searched."
- 等级：A（页面全文到手；URL 未核）

**F24｜DuckDB：DuckPGQ 扩展把 SQL/PGQ 带进分析型 RDBMS**
- 论断：DuckDB 以社区扩展实现 SQL/PGQ（官方文档收录论文），说明 SQL/PGQ 可在轻量关系引擎上落地。
- URL：https://duckdb.org/library/duckpgq/
- 标题：DuckPGQ: Efficient Property Graph Queries in an Analytical RDBMS
- 机构：DuckDB 官方文档（作者 ten Wolde、Singh、Szárnyas、Boncz）
- 日期：2023-01-08（CIDR 2023）
- 原文摘录："We outline our design of DuckPGQ that follows this recipe, by adding efficient SQL/PGQ support to the popular open-source analytical RDBMS DuckDB."
- 等级：A

**F25｜DuckPGQ 论文（PVLDB 2023）：SQL:2023 最重要新特性是 SQL/PGQ**
- 论断：学术论文从标准与系统双视角验证 SQL/PGQ 可嵌入 RDBMS（扩展机制+新语法+最短路）。
- URL：未核（PDF 全文到手 logs/B2a/duckpgq_vldb_pdf.bin；卷期 PVLDB 16(12):4034-4037, 2023）
- 标题：DuckPGQ: Bringing SQL/PGQ to DuckDB
- 机构：CWI（Daniel ten Wolde, Gábor Szárnyas, Peter Boncz）
- 日期：PVLDB 16(12), 2023
- 原文摘录："We demonstrate the most important new feature of SQL:2023, namely SQL/PGQ, which eases querying graphs using SQL by introducing new syntax for pattern matching and (shortest) pathfinding."
- 等级：A（PDF 到手；URL 未核）

**F26｜PostgreSQL 官方 19 开发版文档：明写 "PostgreSQL implements SQL/PGQ"**
- 论断：PostgreSQL 在官方文档（19 开发版，2026-07-16 Beta 2 发布后抓取）声明实现 SQL/PGQ，图被定义为关系表的只读视图。
- URL：https://www.postgresql.org/docs/19/ddl-property-graphs.html
- 标题：PostgreSQL: Documentation: 19: 5.15. Property Graphs
- 机构：PostgreSQL 全球开发组
- 日期：19 为开发版本（页面横幅："July 16, 2026: PostgreSQL 19 Beta 2 Released!"，抓取于 2026-08-12）
- 原文摘录："PostgreSQL implements SQL/PGQ [6], which is part of the SQL standard, where a property graph is defined as a kind of read-only view over relational tables. So the actual data is still in tables or table-like objects, but is exposed as a graph for graph querying operations."
- 等级：A（注意：19 尚未正式发布，属开发版文档）

**F27｜交叉结论：截至 2026-08，无任何厂商/引擎声明"完整实现 GQL"（推断）**
- 论断：综合 F9-F26，公开声明最高覆盖度为"nearly all"（Ultipa）与"most mandatory + substantial optional"（Neo4j），其余为"支持两标准"（Spanner，分特性）、"正在实施"（TigerGraph）、"联邦翻译"（Memgraph）或"未宣布"（AWS）；没有任何来源给出"完整/100% GQL 符合"声明。
- URL：综合 F9-F26 各官方页
- 标题：综合（无单一来源）
- 机构：综合
- 日期：截至 2026-08-12
- 原文摘录：无单一摘录（由 F9-F26 归纳）
- 等级：C（推断，基于已查证的 12 个候选官方来源）

### 2.3 交换格式层（F28-F34）

**F28｜PG Format：PG / PG-JSON / PG-JSONL 三种序列化格式**
- 论断：PG Format 项目给出带标签属性图的正式数据模型与三种文本/JSON 序列化，是目前最接近"事实交换格式"的社区规范。
- URL：未核（页面原文到手 logs/B2a/pg_format.html；项目主页为 pg-format.github.io，对应论文 arXiv:1907.03936）
- 标题：Property Graph Exchange Format (PG)
- 机构：PG Format 项目（对应论文见 S26）
- 日期：抓取于 2026-08-12（页面未标发布日期）
- 原文摘录："The Property Graph Exchange Format (PG) provides the specification of a labeled property graph data model with serialization formats PG Format, PG-JSON, and PG JSONL."
- 等级：A（页面全文到手）+ 未核（URL）

**F29｜PGX 论文：属性图"缺少标准化数据模型"，提出互操作序列化**
- 论断：论文明确指出属性图与 RDF 不同、没有标准数据模型，是"交换格式空缺"的学术证据。
- URL：https://arxiv.org/abs/1907.03936
- 标题：Property Graph Exchange Format
- 机构：arXiv（作者 Hirokazu Chiba, Ryota Yamanaka, Shota Matsumoto）
- 日期：2019-07-09（v1）
- 原文摘录："In contrast to the standardized RDF, however, property graphs lack a standardized data model. Here, we considered the general requirements for representing property graphs and designed two serialization formats as flat text and JSON."
- 等级：A（论文全文到手）

**F30｜GraphML：XML 图文件格式，支持有向/无向/混合图与扩展数据**
- 论断：GraphML 是久经使用的图交换文件格式（XML 基础），可作为个人图谱归档/交换的候选。
- URL：未核（页面原文到手 logs/B2a/graphml.html；项目主页惯用地址 http://graphml.graphdrawing.org/）
- 标题：The GraphML File Format
- 机构：GraphML 项目（graphdrawing.org）
- 日期：抓取于 2026-08-12（页面未标发布日期）
- 原文摘录："GraphML is a comprehensive and easy-to-use file format for graphs. It consists of a language core to describe the structural properties of a graph and a flexible extension mechanism to add application-specific data. Its main features include support of directed, undirected, and mixed graphs, hypergraphs, hierarchical graphs ... Unlike many other file formats for graphs, GraphML does not use a custom syntax. Instead, it is based on XML."
- 等级：B（原文到手；URL 未核）

**F31｜Graphviz DOT：纯文本图描述语言（有向/无向、节点边属性）**
- 论断：DOT 是轻量纯文本图格式，适合人工可读的图谱快照与渲染，但面向布局/绘图而非数据库交换。
- URL：https://graphviz.org/doc/info/lang.html
- 标题：DOT Language | Graphviz
- 机构：Graphviz 项目
- 日期：抓取于 2026-08-12（文档未标发布日期）
- 原文摘录："Abstract grammar for defining Graphviz nodes, edges, graphs, subgraphs, and clusters."；"An edgeop is -> in directed graphs and -- in undirected graphs."
- 等级：A

**F32｜APOC export.cypher：把整库导出为可重放 Cypher 语句**
- 论断：Neo4j 生态的官方扩展 APOC 提供"语句即交换"的导出，是 Cypher dump 的事实实现。
- URL：https://neo4j.com/docs/apoc/current/export/cypher/
- 标题：Export to Cypher Script
- 机构：Neo4j（APOC 文档）
- 日期：2026.07 版（og:url），抓取于 2026-08-12
- 原文摘录："The export to Cypher procedures export data as Cypher statements that can then be used to import the data into another Neo4j instance."
- 等级：A

**F33｜openCypher：开放规范，"最广泛采用的属性图查询语言"，向 GQL 演进**
- 论断：Cypher 的开源规范站把自身定位为属性图查询语言事实标准，并声明向 GQL 演进；它定义查询语言而非图交换格式。
- URL：https://opencypher.org/
- 标题：openCypher
- 机构：openCypher 项目（Neo4j 发起）
- 日期：抓取于 2026-08-12（页面未标发布日期）
- 原文摘录："openCypher is an open source specification of Cypher® - the most widely adopted query language for property graph databases. ... Today, the specification of openCypher evolves towards ISO/IEC 39075 GQL — the property graph query language standard developed by ISO/IEC JTC1 SC32 WG3."
- 等级：B（原文到手；URL 未核 canonical）

**F34｜事实交换组合（推断）：Cypher/PGQ 语句 + CSV/JSON + GraphML/DOT**
- 论断：综合 F28-F33 与 Q3，当前属性图跨系统交换无 ISO 标准，实际由四类手段拼合：① 语句脚本（Cypher dump / SQL·PGQ 导入导出）；② 表格序列化（CSV/JSON）；③ 专用图格式（PG Format、GraphML）；④ 可视化格式（DOT）。对"纯文本语句作为存储"的需求，F32 证明语句可重放即等价于存储。
- URL：综合 F28-F33
- 标题：综合
- 机构：综合
- 日期：截至 2026-08-12
- 原文摘录：无单一摘录（综合归纳）
- 等级：C（推断）

### 2.4 时态属性图/版本化先例层（F35-F39）

**F35｜AeonG：内置时态图数据库，current+historical 双存储 + anchor+delta**
- 论断：AeonG 是目前"属性图+时间版本"最完整的内置方案：当前版本与历史版本分库存储，用周期性完整快照（anchor）+相邻快照间变更（delta）控制历史开销，并支持时间点/区间回溯查询。
- URL：https://arxiv.org/abs/2304.12212
- 标题：AeonG: An Efficient Built-in Temporal Support in Graph Databases (Extended Version)
- 机构：arXiv（PVLDB 17(6): 1515-1527, 2024）
- 日期：v2 2024-04-01（论文 PVLDB 2024）
- 原文摘录："we separate the storage into a current storage to manage the most recent versions of graph objects, and another historical storage to manage the previous versions of graph objects."；"To reduce the historical storage overhead, we propose a novel anchor+delta strategy, in which we periodically create a complete version (namely anchor) of a graph object, and maintain every change (namely delta) between two adjacent anchors of the same object."
- 等级：A（全文到手）

**F36｜Rost 博士论文：TPGM 双时态属性图模型 + Gradoop 参考实现**
- 论断：莱比锡大学博士论文给出顶点/边双时态（valid+transaction time）属性图数据模型 TPGM 与分布式数据流参考实现 Gradoop，是"属性图版本化"的学术基准之一。
- URL：未核（PDF 全文到手 logs/B2a/rost_dissertation.pdf，189 页）
- 标题：Scalable Management and Analysis of Temporal Property Graphs
- 机构：Universität Leipzig（作者 Christopher Rost，Dr. rer. nat. 论文）
- 日期：论文未在 PDF 首页标注答辩日期（抓取于 2026-08-12）
- 原文摘录："This thesis introduces the Temporal Property Graph Model (TPGM), a sophisticated data model designed for bitemporal modeling of vertices and edges, as well as logical abstractions of subgraphs and graph collections. The reference implementation of this model, namely Gradoop, is a graph dataflow system explicitly designed for scalable and distributed analysis of static and temporal graphs."
- 等级：A（PDF 到手；URL 未核）

**F37｜Grit：Git 风格图数据库版本控制，delta 编码为"重建查询"**
- 论断：TU Delft 硕士论文把版本差异编码为一组可重放查询（query-as-delta），并提供快照+delta 两种变体——与"审计晋升"想用纯文本语句记录变更的思路高度契合。
- URL：https://repository.tudelft.nl/record/uuid:3cdbd161-3e6b-463a-957d-00ec0942917a
- 标题：Data Versioning for Graph Databases（Master Thesis, 2019）
- 机构：TU Delft（作者 Mohamat Ulin Nuha；导师 Asterios Katsifodimos）
- 日期：2019（硕士论文）
- 原文摘录："The delta encoding is represented as a set of queries to reconstruct one version from the other. We presented Grit, a Git-style command line tool to do data versioning for graph databases. We investigated two variants of our approach, with and without leveraging snapshots of data in the process."
- 等级：A（记录页与 PDF 均到手）

**F38｜ConVer-G：知识图谱并发版本化，系统梳理快照/区间/增量三类方案**
- 论断：BDA 2024 论文对数据版本化三类范式（快照式 Git 系、区间式时态表、增量式 Delta Lake/Hudi/OSTRICH）做了系统分类，可用于个人图谱版本方案的选型参照。
- URL：https://arxiv.org/abs/2409.04499
- 标题：ConVer-G: Concurrent versioning of knowledge graphs
- 机构：arXiv / BDA 2024（作者 Jey Puget Gil, Emmanuel Coquery, John Samuel, Gilles Gesquiere）
- 日期：2024-09-06 提交
- 原文摘录："Some popular Git-based tools (snapshot-based versioning tools) like Qri, QuitStore, GeoGig, and UrbanCo2Fab represent versions as snapshots."；"These tables store the start and end timestamps for each version of the data, allowing for querying the data at specific points in time or in a specific time interval."；"Delta-based versioning systems like Delta Lake, Apache Hudi and OSTRICH ... store the changes made to the data as deltas, allowing for efficient querying of the data at different versions."
- 等级：A（全文到手）

**F39｜演进图 NoSQL 综述：MongoDB 顶点中心存储 + 快照/区间混合建模**
- 论断：2025 年综述/实现论文以 MongoDB 存储演进图，把快照与区间两类时态建模结合——证明"时间版本属性图"已进入 NoSQL 工程实践，但同样无统一格式。
- URL：https://arxiv.org/abs/2504.17438
- 标题：Storing and Querying Evolving Graphs in NoSQL Storage Models
- 机构：arXiv（作者 Alexandros Spitalas, Anastasios Gounaris, Andreas Kosmatopoulos, Kostas Tsichlas）
- 日期：2025-04-24 提交
- 原文摘录："We investigate the implementation of an enhanced vertex-centric storage model in MongoDB that prioritizes space efficiency by leveraging in-database query mechanisms to minimize redundant data and reduce storage costs."；"we employ datasets, some of which are generated with the LDBC SNB generator, appropriately post-processed to utilize both snapshot- and interval-based [models]."
- 等级：A（全文到手）

## 3 冲突与张力

**T1｜"GQL 已发布" vs "实现普遍部分化"**：标准 2024-04 出版后一年半，声明完整 GQL 的引擎为零；最高声明为"nearly all"（Ultipa）与"most mandatory + substantial optional"（Neo4j），TigerGraph 仍在"actively implementing"，Memgraph 是联邦翻译而非原生存储。GQL 的"落地叙事"明显领先于实际产品覆盖（F9-F27）。

**T2｜Neo4j 同时存在"符合声明"与"未支持清单"**：官方符合性页声明 GG01 最小符合，同一文档树下的 unsupported-mandatory 页却列出 SESSION/事务语句/CURRENT_GRAPH/AT 子句等 mandatory 特性未以 GQL 语句形式支持（F6、F9、F10）。"conforms"按 24.2 最小符合口径成立，但不等同于完整实现——读者易误读。

**T3｜Spanner "Both standards are supported" 是分特性支持**：同一官方页显示 GQL 在"graph-table 互操作"栏为 Not supported，说明"支持 GQL"与"完整对等支持"之间有实质差距（F13、F14）。

**T4｜"第一个可解释 GQL 的内存图数据库"是研究子集**：Wikipedia 的表述来自 TU/e 实习项目（OlofMorra/GQL-parser，ANTLR4 解析器+查询子集），并非产品级引擎；引用时需防误读（F20）。

**T5｜交换格式"标准空缺"与"事实格式"并存**：GQL/SQL·PGQ 均未定义图交换格式（F7），但工程生态已用 Cypher dump、PG Format、GraphML、DOT、CSV/JSON 承担交换（F28-F34）。对"用纯文本语句做存储"的需求，这既是可行路径（可重放即存储），也是无标准可依的隐患（互操作靠各引擎各自实现）。

**T6｜时态属性图先例多元但无统一标准**：AeonG 双存储+anchor+delta（F35）、Gradoop/TPGM 双时态模型（F36）、Grit 查询式 delta（F37）、ConVer-G 三类方案分类（F38）、MongoDB 快照/区间混合（F39）——方案谱系完整，但没有一个成为事实标准，也无商业开箱产品；对"审计晋升"需求需自研组合。

**T7｜PostgreSQL "implements SQL/PGQ" 出现在开发版文档**：官方文档（19/devel，2026-07-16 Beta 2）明写实现，但 19 尚未正式发布，稳定分支能力需以正式发布版为准（F26）。

## 4 未决

**U1**（未核）：GQL 标准正文是否含图数据序列化/交换条款——未购买 ISO 标准原文，基于公开资料（ISO 摘要、JTC1 文章、Neo4j 符合性文档）未见提及；建议如预算允许直接核验 610 页标准正文。等级：未核。

**U2**：各厂商 GQL 符合度的第三方独立测评缺失——现有一切符合声明均为厂商自述（Neo4j/Ultipa/Spanner），无 TCK/独立基准公开结果。等级：未核。

**U3**：TigerGraph 的 GQL 支持范围与时间表未公布（官方博客只有承诺）。等级：未核。

**U4**：Oracle 是否/何时提供完整 GQL（含图专属 DML）未公开声明——目前仅 SQL/PGQ。等级：未核。

**U5**：gqlstandards.org 的"Projects and Vendors"实现清单页未能抓取到正文（Wayback 仅存横幅页），该社区维护的实现列表内容未核。等级：未核。

**U6**：PostgreSQL 19 的 SQL/PGQ 功能覆盖（哪些 PGQ 特性、有无 GRAPH_TABLE 之外的语法）未在抓取页展开，需正式发布版文档进一步核。等级：未核。

**U7**：PG Format / GraphML / openCypher 三个来源的规范 URL 未在抓取中记录（页面原文已到手，URL 以常见主页地址标注）。等级：未核。

**U8**：DuckPGQ 论文 URL 未核（PDF 到手，卷期 PVLDB 16(12) 2023 由交接核验确认）。等级：未核。

## 5 来源清单（36 项，S1-S36）

类型：STD=ISO/标准机构；DOC=数据库/厂商官方文档；BLOG=官方博客/公告；PAPER=学术论文/预印本；ENG=工程先例/社区规范；WIKI=维基百科。

| # | 来源（机构/类型） | URL | 等级 | 原文 |
|---|---|---|---|---|
| S1 | ISO/IEC 39075:2024 官方页（STD） | https://www.iso.org/standard/76120.html | A | 全文到手 |
| S2 | ISO/IEC 9075-16:2023 官方页（STD） | https://www.iso.org/standard/79473.html | A | 全文到手 |
| S3 | JTC1：GQL Database Language（STD） | https://jtc1info.org/slug/gql-database-language/ | A | PDF 7 页到手 |
| S4 | gqlstandards.org 首页/状态公告（STD-社区） | https://web.archive.org/web/20260611153942/https://www.gqlstandards.org/ | B | Wayback 到手 |
| S5 | gqlstandards.org：What is a GQL Standard（STD-社区） | https://web.archive.org/web/20260415230221/https://www.gqlstandards.org/what-is-a-gql-standard | B | Wayback 到手 |
| S6 | Neo4j：GQL Conformance（DOC） | https://neo4j.com/docs/cypher-manual/current/appendix/gql-conformance/ | A | 全文到手 |
| S7 | Neo4j：Unsupported Mandatory Features（DOC） | https://neo4j.com/docs/cypher-manual/current/appendix/gql-conformance/unsupported-mandatory/ | A | 全文到手 |
| S8 | Neo4j：Status Codes（DOC） | https://neo4j.com/docs/status-codes/current/ | A | 全文到手 |
| S9 | Neo4j 博客：Creating the GQL database language standard（BLOG） | https://neo4j.com/blog/cypher-and-gql/gql-database-language-standard/ | A | 全文到手 |
| S10 | Google：Spanner Graph and ISO standards（DOC） | https://cloud.google.com/spanner/docs/graph/iso-standards | A | 全文到手 |
| S11 | Google：Spanner GQL 查询语句参考（DOC） | https://docs.cloud.google.com/spanner/docs/reference/standard-sql/graph-query-statements | A | 全文到手 |
| S12 | TigerGraph 博客：The Rise of GQL（BLOG） | https://www.tigergraph.com/blog/the-rise-of-gql-a-new-iso-standard-in-graph-query-language/ | A | 全文到手 |
| S13 | Memgraph 博客：Introducing Memgraph Zero and MemGQL（BLOG） | https://memgraph.com/blog/introducing-memgraph-zero-memgql-federated-gql-engine | A | 全文到手 |
| S14 | Microsoft：GQL language guide for graph in Microsoft Fabric（DOC） | https://learn.microsoft.com/en-us/fabric/graph/gql-language-guide | A | 全文到手 |
| S15 | Ultipa：GQL Conformance（DOC） | https://www.ultipa.com/docs/gql/gql-conformance | A | 全文到手 |
| S16 | TuGraph：gql-grammar（ENG） | https://github.com/TuGraph-family/gql-grammar | A | 全文到手 |
| S17 | OlofMorra：GQL-parser（ENG） | https://github.com/OlofMorra/GQL-parser | A | 全文到手 |
| S18 | Wikipedia：Graph Query Language（WIKI） | https://en.wikipedia.org/wiki/Graph_Query_Language | B | 全文到手 |
| S19 | AWS Database Blog：GQL: The ISO standard for graphs has arrived（BLOG） | https://aws.amazon.com/blogs/database/gql-the-iso-standard-for-graphs-has-arrived/ | A | 全文到手 |
| S20 | Oracle Database Insider：The SQL/PGQ Standard（BLOG，Wayback） | https://web.archive.org/web/20260812100105/https://blogs.oracle.com/database/property-graphs-in-oracle-database-23ai-the-sql-pgq-standard | B | Wayback 到手 |
| S21 | Oracle 文档：SQL GRAPH_TABLE Queries（DOC） | 未核（见 F23） | A | 全文到手 |
| S22 | DuckDB 文档：DuckPGQ（DOC） | https://duckdb.org/library/duckpgq/ | A | 全文到手 |
| S23 | DuckPGQ: Bringing SQL/PGQ to DuckDB（PAPER，PVLDB 16(12) 2023） | 未核（PDF 到手） | A | PDF 到手 |
| S24 | PostgreSQL 19 文档：5.15. Property Graphs（DOC） | https://www.postgresql.org/docs/19/ddl-property-graphs.html | A | 全文到手 |
| S25 | PG Format 官网（ENG） | 未核（pg-format.github.io） | A | 全文到手 |
| S26 | Chiba et al.: Property Graph Exchange Format（PAPER，arXiv:1907.03936） | https://arxiv.org/abs/1907.03936 | A | 全文到手 |
| S27 | GraphML File Format 官网（ENG） | 未核（graphml.graphdrawing.org） | B | 全文到手 |
| S28 | Graphviz：DOT Language（ENG/DOC） | https://graphviz.org/doc/info/lang.html | A | 全文到手 |
| S29 | Neo4j APOC：Export to Cypher Script（DOC） | https://neo4j.com/docs/apoc/current/export/cypher/ | A | 全文到手 |
| S30 | openCypher.org（ENG） | https://opencypher.org/ | B | 全文到手 |
| S31 | Neo4j：Constraints（DOC，供 Q5 约束能力引用） | https://neo4j.com/docs/cypher-manual/current/schema/constraints/ | A | 全文到手 |
| S32 | AeonG（PAPER，arXiv:2304.12212 / PVLDB 17(6) 2024） | https://arxiv.org/abs/2304.12212 | A | 全文到手 |
| S33 | Rost：Scalable Management and Analysis of Temporal Property Graphs（PAPER，博士论文） | 未核（PDF 到手） | A | PDF 到手 |
| S34 | Grit：Data Versioning for Graph Databases（PAPER，TU Delft 硕士论文 2019） | https://repository.tudelft.nl/record/uuid:3cdbd161-3e6b-463a-957d-00ec0942917a | A | 记录页+PDF 到手 |
| S35 | ConVer-G（PAPER，arXiv:2409.04499，BDA 2024） | https://arxiv.org/abs/2409.04499 | A | 全文到手 |
| S36 | Storing and Querying Evolving Graphs in NoSQL Storage Models（PAPER，arXiv:2504.17438） | https://arxiv.org/abs/2504.17438 | A | 全文到手 |

## 6 判死自查（红线核对）

| 红线要求 | 要求值 | 本报告实际 | 达标 |
|---|---|---|---|
| 可核来源数 | ≥15 | 36（S1-S36） | 达标 |
| 原文到手数 | ≥10 | 31 项标注"全文/PDF 到手"（S1-S3、S6-S19、S21-S26、S28-S32、S34-S36；S20、S27、S30 为存档/原文到手；S4-S5 为 Wayback 原文） | 达标 |
| 来源类型数 | ≥3 类 | 5 类：ISO/标准机构（S1-S5）、数据库/厂商官方文档（S6-S8、S10-S11、S14-S15、S21-S22、S24、S29、S31）、官方博客/公告（S9、S12-S13、S19-S20）、学术论文（S23、S26、S32-S36）、工程先例/社区规范（S16-S17、S25、S27-S28、S30） | 达标 |
| 候选逐一查证 | ≥5 | 12 个：Neo4j、Google Spanner、TigerGraph、Memgraph、Microsoft Fabric、Ultipa、TuGraph、OlofMorra/GQL-parser、AWS Neptune、Oracle、DuckDB/DuckPGQ、PostgreSQL（F9-F26） | 达标 |
| 关键词组数 | ≥4 组 | ① "GQL ISO 39075 implementations engines 2024"；② "SQL:2023 SQL/PGQ support database official"；③ "property graph exchange format standard"；④ "temporal property graph survey"；另含中文组"GQL 标准 实现 数据库 2024"、"属性图 交换格式"（检索记录见 logs/B2a/brave_*.html 快照） | 达标 |

**禁止项自查**：未做厂商/引擎浅层对比（仅核实现状态与交换格式，未比较性能/口碑）；未越界（RDF 归 B1、时间版本机制细节归 B4，本报告只确认"先例存在与类别"）；未捏造来源（所有 URL 均来自抓取文件的 canonical/og:url 或明确标注"未核"）；推断均标 C（F7、F27、F34、Q5 方案边界、T1/T4 评述）；抓不到的来源均写"未核"（U1-U8、S21/S23/S25/S27/S30/S33 URL）。

**未决数统计**：8 项（U1-U8，全部为"未核"性质）。
**关键发现条数**：39 条（F1-F39）。
**来源数**：36 项（S1-S36）。

---
*报告完。本文件由 B2a 分支调研员生成，所有摘录均可回溯至 research_tree/logs/B2a/ 下的抓取存档。*

