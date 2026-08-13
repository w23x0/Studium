# B1c 发现 — SPARQL 上的版本化约定（命名图快照 + 应用层时态查询）

调研员：B1c 分支调研员（深度调研树 B1 RDF 系 R3 子任务）｜日期：2026-08-12｜基线：B1_RDF_发现.md（RDF 图 atemporal 结论）
范围：只核"SPARQL/RDF 数据集层面用命名图 + 应用层约定做版本查询"的可行模式与先例；时态/位时理论归 B4（Gutiérrez 等仅作背景引用并注明边界），内容寻址/位点归 B4b，nanopub 归 B4a；不比较厂商、不做性能评测。
证据等级：A=原文到手并摘录；B=可靠二手/官方汇总/权威元数据（CrossRef 验证）；C=推断/未核。全部摘录均出自本地暂存原文（research_tree/tmp/b1c/ 下 .txt/.pdf 提取），未到手处一律标"未核"。

## 0 一句话结论

SPARQL 1.2 未引入任何数据时态/版本特性（2026-06 两个草案中无 GRU/temporal/valid time/transaction time 等时态语义，唯一带 version 字样的 VERSION 指令只是声明"查询语言语法版本"而非数据版本化，K1/K2）；在 RDF 1.2 明示图模型 atemporal（"The RDF abstract data model is atemporal: RDF graphs are static snapshots of information"，K3）的前提下，"每个版本一个命名图 + 图名承载版本标识/时间戳、默认图放版本号元数据三元组、用 PROV-O/OWL-Time 词汇记录版本生命周期"是规范文本（RDF dataset 定义："One such use is to hold snapshots of multiple RDF sources"，K4）与学术/工程先例（Fernández 等 RDF 档案综述的 IC 策略原文 K8、PROV-O 版本化示例 K11、RFC 7089 Memento 的时间键控快照 K13）共同支持的可行应用层约定：全量快照命名图使"某节点在某时间点的边集合"退化为一个 GRAPH 模式查询，增量补丁图省空间但把版本物化/跨版本查询的复杂度上移到应用层（K10）；而 SPARQL 服务端（Jena Fuseki/Virtuoso/GraphDB）官方文档均未见原生多版本批量管理与保留功能，需应用层自建（C 推断，K14-K17）。

## 1 逐条回答

### Q1. SPARQL 1.2 是否新增任何版本/时态特性（GRU 语义、命名图变更）？官方草案原文。

- **没有数据级版本/时态特性**。对 SPARQL 1.2 Query Language（W3C Working Draft 2026-06-25）与 SPARQL 1.2 Update（W3C Working Draft 2026-06-12）两个官方草案全文检索：Query 草案中 "GRU""temporal""valid time""transaction time" 均为 0 命中；Update 草案中 "version" 仅出现在文档自身的 "This version: https://www.w3.org/TR/2026/WD-sparql12-update-20260612/" 链接（文档版本号），与数据版本化无关（K1、K2）。
- **唯一与 "version" 相关的语言特性是查询语言版本标签**：Query 草案 §4.3 "Version Announcement" 原文——"To cope with the language evolution of SPARQL, the VERSION directive can be used… authors MAY announce the use of the new syntax forms by including this directive followed by a version label indicating the version required to process the included features."——即 `VERSION "1.2"` 声明的是**查询语言语法版本**（如 triple terms 等新语法），不是数据版本/时间戳（K1）。
- **命名图/数据集模型无变更**：RDF 1.2 仍为"默认图 + 零或多个命名图"（K4）；SPARQL 1.2 查询数据集语义沿用 SPARQL 1.1（默认图 + FROM/FROM NAMED/GRAPH），官方草案未引入"图版本""图快照""时间片"等概念。
- 结论：M09 若依赖 SPARQL 原生算子做版本查询，标准层面没有可用原语；版本语义全部落在应用层约定。

### Q2. "每个版本一个命名图 + 图名含时间戳/版本号"的查询模式是否有规范讨论或工程先例（dataset versioning 模式、PROV 结合）？

- **有规范文本背书**：RDF 1.2 Concepts 定义 RDF dataset = "a collection of RDF graphs"（默认图 + 命名图，图名可为 IRI/空白节点），并明确给出用例"One such use is to hold snapshots of multiple RDF sources"（K4）；RDF 1.1/1.2 Concepts 更直白："Some RDF sources may, however, be immutable snapshots of another RDF source, archiving its state at some point in time."（K5）——即"用多个命名图/图集装不同时间点的快照"是 W3C 文本明示的用法。
- **学术先例（直接对应"每个版本一个命名图"）**：Fernández 等《Evaluating Query and Storage Strategies for RDF Archives》（Semantic Web 期刊，2019）把 RDF 档案的 IC（independent copies）策略写为："All triples of each instance/version would be stored in named graphs with the version name being the graph name and respective metadate（原文如此）about the version number on the default graph. That is, a triple (:s :p :o) in version vi would result in the respective graph being stored in graph :version_v1 plus a triple (:version_v1 :version_number vi) in the default graph."（K8）；同文综述："versions/deltas are often managed under named/virtual graphs, so that the retrieval mediator can rely on existing solutions providing named/virtual graphs."（K9）。
- **PROV 结合先例**：PROV-O（W3C REC 2013）自带版本化示例——每个版本是 `prov:Entity`，用 `prov:specializationOf` 指向"最新版本 permalink"实体，用 `prov:wasRevisionOf` 指向前一版本，用 `prov:generatedAtTime`/`prov:invalidatedAtTime` 界定版本生命周期，并用 `sioc:latest_version`/`sioc:previous_version` 链接相邻版本（K11）。
- **工程先例（HTTP 层类比）**：RFC 7089 Memento 定义"Memento for an Original Resource is a resource that encapsulates a prior state of the Original Resource"，用 datetime negotiation + TimeMaps 枚举"按时间键控的冻结快照"——命名图快照模式在 Web 档案层有同类先例（K13）。
- 结论：该模式是"规范文本 + 学术综述 + 标准词汇 + 工程协议"四层共同支持的可行模式；但 SPARQL 标准本身没有把它规范化（无标准图命名约定、无标准版本元数据词汇），仍是应用层约定。

### Q3. RDF 图 atemporal 下"旧版本不覆盖"如何表达：快照全量复制 vs 增量补丁图，各自的查询复杂度与先例。

- **atemporal 的语义后果**：RDF 1.2 原文"Since RDF graphs are defined as mathematical sets, adding or removing triples from an RDF graph yields a different RDF graph."（K3）——"旧版本不覆盖"在 RDF 里天然就是"新状态 = 新图/新数据集"，旧图只要不再被更新就自然保留；规范没有提供"原地覆盖"的语义（更新=产生新图）。
- **两种表达方式（据 Fernández 综述 K10 分类）**：
  - **快照全量复制（IC, independent copies）**：每个版本一个独立完整图/数据集。版本物化查询（取某版本全部三元组、或"某节点在某版本的边集合"）复杂度最低——直接对命名图做一次 GRAPH 模式匹配即可；代价是静态信息跨版本重复（论文原文："It is, however, expected that IC faces scalability problems as static information is duplicated across the versions."）。
  - **增量补丁图（CB, change-based）**：只存版本间差异（added/deleted triples 的低层 delta），从"一个物化版本 + 后续 delta"重建任意版本。省空间，但论文原文："CB requires additional computational costs for delta propagation to access previous versions"，且版本物化"requires to rebuild the delta similarly to CB"——即查询复杂度（delta 传播/重建）上移到应用层/查询中介。
  - **第三种（TB, timestamp-based）**：每条三元组本地带版本时间戳，属"RDF 时间建模的特例"（K10），与 M09 的时间点查询语义最贴近，但依赖自建索引/压缩，规范同样不支持。
- **先例**：IC/CB/TB/HB 四策略 + BEAR 基准即来自该综述（K10）；OSTRICH 系统（Taelman 等，JWS 2019）做"压缩连续版本 + 元数据降低查询延迟"的档案索引，摘要到手（K18）；git 式 RDF 数据集协作（Arndt 等 2016）与任意 RDF 数据版本化（Frommhold 等 2016）为 B 级背景（K21/K22）。
- 注意：以上均为论文的定性复杂度描述，未引用任何厂商/系统性能数字（红线：不做性能评测）。

### Q4. SPARQL 服务端（Fuseki/Virtuoso/GraphDB 等）对多版本命名图的批量管理与保留是否有公开实践（官方文档为据，不做性能比较）。

- **Apache Jena Fuseki**：官方文档定义 Fuseki 为"a SPARQL server"，提供 SPARQL 1.1 query/update 与 SPARQL Graph Store 协议，数据集由 assembler 描述（dataset description）配置（K14）。所抓两页（主文档 + 配置文档）中 "version/snapshot/retention/archive" 命中仅为软件发布版本与推理缓存说明，**无数据集级多版本管理/保留特性**。
- **Virtuoso**：官方文档覆盖命名图的选择机制（`define input:default-graph-uri`、`FROM NAMED`、HTTP `default-graph-uri`/`named-graph-uri` 参数，K15）与图级 SPARUL 更新（`RDF_INSERT_TRIPLES`/`RDF_DELETE_TRIPLES` 以 graph_iri 为参数，K16）；所抓两页中 **无 snapshot/retention/archive/versioning 命中**。
- **GraphDB 11.0**：存档文档（Wayback 2025-07-27/08-02）给出 repository 配置选项 "Enable context index: Builds an additional Context-Predicate-Subject-Object index to boost the SPARQL query performance of queries with GRAPH, FROM, and FROM NAMED clauses."（K17）——即提供面向命名图查询的索引选项；所抓存档页中 **无快照/版本/保留功能**。
- **归纳（C 推断，明确为否定证据）**：三份官方文档均未见"多版本命名图的批量管理/保留/剪枝"原生功能；命名图的创建/命名/保留/回收需由应用层脚本与更新流程自行实现。此结论基于所抓页面子集，Virtuoso/GraphDB 全集未逐页检索（见 U2/U3）。

### Q5. 版本查询（"某节点在某时间点的边集合"）在 SPARQL 里如何写，是否有标准词汇（provenance ontology、time ontology）支撑。

- **写法（学术综述给出的现成翻译）**：Fernández 等把 AnQL 的版本标注查询 `P : l`（l=版本标签）直接翻译成原生 SPARQL：`GRAPH ?Gl { P } {?Gl :version_number l .`——即"版本号元数据三元组放默认图、数据放命名图、GRAPH 模式把查询限定到指定版本图"（K8）。若图名 IRI 本身含版本号/时间戳，则可直接 `FROM NAMED <…/v2026-08-12>` 或 `GRAPH <…/v2026-08-12> { <node> ?p ?o }`。
- **示例（C 推断，基于 K8 模式演示，非任何原文）**：
  ```
  # 版本图: <https://m09.example/versions/v2026-08-12>
  SELECT ?p ?o WHERE {
    GRAPH <https://m09.example/versions/v2026-08-12> { <https://m09.example/nodes/锚点> ?p ?o }
  }
  ```
  "某节点在某时间点的边集合"= 把时间点映射到版本图 IRI（版本号↔时间戳的映射由应用层维护），再对单个命名图执行上述模式；跨版本差异则对两个版本图分别取图后应用层求差（或预存 delta 图）。
- **标准词汇支撑**：
  - PROV-O（W3C REC 2013，K11）：`prov:generatedAtTime`/`prov:invalidatedAtTime` 界定版本生命周期起止；`prov:wasRevisionOf` 表达"新版本包含旧版本实质内容"；`prov:specializationOf` 把各版本指向"抽象实体"；`prov:value` 承载版本内容；`prov:wasDerivedFrom` 表达派生链。
  - OWL-Time（W3C CRD 2022，K12）：`time:Instant`/`time:Interval`、`time:hasTime`（"a completely generic predicate for associating a temporal entity with anything"）、`time:inXSDDateTimeStamp` 等把时间点/区间以标准方式挂到实体上。
  - SIOC（出现在 PROV-O 示例中）：`sioc:latest_version`/`sioc:previous_version` 链接相邻版本。
  - RFC 7089 Memento（K13）：`Memento-Datetime`/TimeMaps 作为"HTTP 层按时间键控快照"的协议级词汇类比。
- **注意**：没有"标准的 RDF 版本查询语言"——SPARQL 1.2 无时态算子（Q1），AnQL 等学术扩展未进 W3C 标准；PROV-O/OWL-Time 只提供元数据词汇，不提供查询算子。

## 2 关键发现

### K1｜SPARQL 1.2 Query Language——无数据时态/版本特性，VERSION 指令仅为语言版本标签（等级 A）
- URL：https://www.w3.org/TR/sparql12-query/（本版 https://www.w3.org/TR/2026/WD-sparql12-query-20260625/）
- 标题：SPARQL 1.2 Query Language
- 机构：W3C RDF & SPARQL Working Group｜日期：W3C Working Draft 2026-06-25
- 摘录："To cope with the language evolution of SPARQL, the VERSION directive can be used… authors MAY announce the use of the new syntax forms by including this directive followed by a version label indicating the version required to process the included features."；全文检索 "GRU""temporal""valid time""transaction time" 0 命中。
- 等级：A

### K2｜SPARQL 1.2 Update——无数据时态/版本特性（等级 A）
- URL：https://www.w3.org/TR/sparql12-update/（本版 https://www.w3.org/TR/2026/WD-sparql12-update-20260612/）
- 标题：SPARQL 1.2 Update
- 机构：W3C RDF & SPARQL Working Group｜日期：W3C Working Draft 2026-06-12
- 摘录：全文 "version" 仅见于 "This version: https://www.w3.org/TR/2026/WD-sparql12-update-20260612/"（文档自身版本链接）；无 GRU/时态/版本数据语义。
- 等级：A

### K3｜RDF 1.2 Concepts——RDF 图 atemporal："静态快照"（等级 A）
- URL：https://www.w3.org/TR/rdf12-concepts/（本版 https://www.w3.org/TR/2026/CR-rdf12-concepts-20260407/）
- 标题：RDF 1.2 Concepts and Abstract Data Model
- 机构：W3C RDF & SPARQL Working Group｜日期：W3C Candidate Recommendation Snapshot 2026-04-07
- 摘录："The RDF abstract data model is atemporal: RDF graphs are static snapshots of information."；"Since RDF graphs are defined as mathematical sets, adding or removing triples from an RDF graph yields a different RDF graph."；"Some RDF sources may, however, be immutable snapshots of another RDF source, archiving its state at some point in time."
- 等级：A

### K4｜RDF 1.2 Concepts——RDF dataset = 默认图 + 命名图，用途含"装多个源的快照"（等级 A）
- URL：https://www.w3.org/TR/rdf12-concepts/（本版 2026-04-07 CR Snapshot）
- 标题：RDF 1.2 Concepts and Abstract Data Model（§1.7 RDF Datasets 一带）
- 机构：W3C RDF & SPARQL Working Group｜日期：2026-04-07
- 摘录："RDF datasets are used to organize collections of RDF graphs, and consist of a default graph and zero or more named graphs."；"There are many possible uses for RDF datasets. One such use is to hold snapshots of multiple RDF sources."
- 等级：A

### K5｜RDF 1.1 Concepts——"不可变快照……归档其在某时间点的状态"（等级 A）
- URL：https://www.w3.org/TR/rdf11-concepts/
- 标题：RDF 1.1 Concepts and Abstract Data Model（§1.5 RDF and Change over Time）
- 机构：W3C RDF Working Group｜日期：W3C Recommendation 2014-02-25
- 摘录："Some RDF sources may, however, be immutable snapshots of another RDF source, archiving its state at some point in time."（RDF 1.2 Concepts §1.6 亦保留此句）
- 等级：A

### K6｜SPARQL 1.1 Query——GRAPH 关键字：把活动图切到命名图（等级 A）
- URL：https://www.w3.org/TR/sparql11-query/
- 标题：SPARQL 1.1 Query Language（§13.2.3 一带）
- 机构：W3C SPARQL Working Group｜日期：W3C Recommendation 2013-03-21
- 摘录："The GRAPH keyword is used to make the active graph one of all of the named graphs in the dataset for part of the query."
- 等级：A

### K7｜Fernández 等 2019——RDF 档案/版本的形式定义（等级 A）
- URL：https://www.semantic-web-journal.net/system/files/swj1608.pdf
- 标题：Evaluating Query and Storage Strategies for RDF Archives（J. D. Fernández, J. Umbrich, A. Polleres, M. Knuth）
- 机构：Semantic Web 期刊（IOS Press）／维也纳经济与商业大学 & HPI｜日期：Semantic Web 10 (2019)，DOI 10.3233/SW-180309（SEMANTiCS 2016 版本 DOI 10.1145/2993318.2993333）
- 摘录："Definition 1 (RDF Archive) A version-annotated triple is an RDF triple (s, p, o) with a label i ∈ N representing the version in which this triple holds…"；"Definition 2 (RDF Version) An RDF version of an RDF archive A at snapshot i is the RDF graph A(i) = {(s, p, o)|(s, p, o) : [i] ∈ A}…"；"Let N be a set of version labels in which a total order is defined."
- 等级：A（PDF 全文在手，本地提取 swj1608.txt）

### K8｜Fernández 等 2019——IC 策略原文：版本名即命名图名 + 默认图版本号元数据；AnQL→SPARQL 翻译（等级 A）
- URL：https://www.semantic-web-journal.net/system/files/swj1608.pdf
- 标题：Evaluating Query and Storage Strategies for RDF Archives（§3.3.1）
- 机构：同上｜日期：2019
- 摘录："All triples of each instance/version would be stored in named graphs with the version name being the graph name and respective metadate（原文如此）about the version number on the default graph. That is, a triple (:s :p :o) in version vi would result in the respective graph being stored in graph :version_v1 plus a triple (:version_v1 :version_number vi) in the default graph."；"each annotated pattern P : l in the AnQL queries above could be translated into a native SPARQL graph pattern as GRAPH ?Gl { P } {?Gl :version_number l."
- 等级：A

### K9｜Fernández 等 2019——"版本/delta 常以命名/虚拟图管理"（等级 A）
- URL：https://www.semantic-web-journal.net/system/files/swj1608.pdf
- 标题：Evaluating Query and Storage Strategies for RDF Archives（§2.2 末尾）
- 机构：同上｜日期：2019
- 摘录："versions/deltas are often managed under named/virtual graphs, so that the retrieval mediator can rely on existing solutions providing named/virtual graphs."
- 等级：A

### K10｜Fernández 等 2019——存储策略 IC/CB/TB/HB 与查询需求分类（等级 A）
- URL：https://www.semantic-web-journal.net/system/files/swj1608.pdf
- 标题：Evaluating Query and Storage Strategies for RDF Archives（§2.2）
- 机构：同上｜日期：2019
- 摘录："Independent Copies (IC)… manages each version as a different, isolated dataset. It is, however, expected that IC faces scalability problems as static information is duplicated across the versions."；"Change-based approach (CB)… computing and storing the differences (deltas) between versions… CB requires additional computational costs for delta propagation to access previous versions."；"Timestamp-based approach (TB)… each triple locally holds the timestamp of the version."
- 等级：A

### K11｜PROV-O——版本化示例：specializationOf / wasRevisionOf / generatedAtTime / invalidatedAtTime / value（等级 A）
- URL：https://www.w3.org/TR/prov-o/
- 标题：PROV-O: The PROV Ontology
- 机构：W3C Provenance Working Group｜日期：W3C Recommendation 2013-04-30
- 摘录：":post9821v1 a sioc:Post, prov:Entity; prov:specializationOf :more-crime-happens-in-cities; ## PERMALINK to the latest revision. … prov:generatedAtTime "2011-07-16T01:52:02Z"^^xsd:dateTime; … prov:invalidatedAtTime "2011-07-16T02:02:02Z"^^xsd:dateTime;."；":post9821v2 … prov:wasRevisionOf :post9821v1;"；":more-crime-happens-in-cities … sioc:latest_version :post9821v2; sioc:previous_version :post9821v1;."；"The properties prov:generatedAtTime and prov:invalidatedAtTime can be used to bound the starting and ending moments of an Entity's existence."
- 等级：A

### K12｜OWL-Time——时态词汇本体（等级 A）
- URL：https://www.w3.org/TR/owl-time/
- 标题：Time Ontology in OWL
- 机构：W3C Spatial Data on the Web Working Group｜日期：W3C Candidate Recommendation Draft 2022-11-15
- 摘录："OWL-Time is an OWL-2 DL ontology of temporal concepts, for describing the temporal properties of resources… The ontology provides a vocabulary for expressing facts about topological (ordering) relations among instants and intervals, together with information about durations, and about temporal position including date-time information."；":hasTime is a completely generic predicate for associating a temporal entity with anything."
- 等级：A

### K13｜RFC 7089 Memento——时间键控冻结快照的协议先例（等级 A）
- URL：https://www.rfc-editor.org/rfc/rfc7089.txt
- 标题：RFC 7089: HTTP Framework for Time-Based Access to Resource States -- Memento
- 机构：IETF（Van de Sompel, Nelson, Sanderson）｜日期：2013-12
- 摘录："Memento: A Memento for an Original Resource is a resource that encapsulates a prior state of the Original Resource. A Memento for an Original Resource as it existed at time T is a resource that encapsulates the state the Original Resource had at time T."；"The HTTP-based Memento framework bridges the present and past Web. It facilitates obtaining representations of prior states of a given resource by introducing datetime negotiation and TimeMaps."
- 等级：A

### K14｜Jena Fuseki 官方文档——SPARQL 服务器 + 数据集 assembler 配置，无版本/保留特性（等级 A）
- URL：https://jena.apache.org/documentation/fuseki2/ 与 https://jena.apache.org/documentation/fuseki2/fuseki-configuration.html
- 标题：Apache Jena Fuseki；Fuseki: Configuring Fuseki
- 机构：Apache Jena 项目（Apache Software Foundation）｜日期：访问 2026-08-12
- 摘录："Apache Jena Fuseki is a SPARQL server. It can run as a standalone server, or embedded in an application."；"Fuseki provides the SPARQL 1.1 protocols for query and update as well as the SPARQL Graph Store protocol."；"A Fuseki server is configured by defining the data services (data and actions available on the data)."；所抓两页中 "version/snapshot/retention/archive" 命中仅为软件发布版本与推理缓存说明，无数据集级版本管理/保留功能。
- 等级：A

### K15｜Virtuoso 官方文档——命名图选择机制（等级 A）
- URL：https://docs.openlinksw.com/virtuoso/rdfdefaultgraph/
- 标题：Default and Named Graphs（Virtuoso Open-Source Documentation, 16.2.8）
- 机构：OpenLink Software｜日期：访问 2026-08-12
- 摘录："Sometimes the default graph IRI is not known when the SPARQL query is composed. It can be added at the very last moment by providing the IRI in a 'define' clause as follows: define input:default-graph-uri <http://example.com>"；"When Virtuoso receives a SPARQL request via HTTP, the value of the default graph can be set in the protocol using a default-graph-uri HTTP parameter… There's similar support for named-graph-uri HTTP parameter."
- 等级：A

### K16｜Virtuoso 官方文档——图级 SPARUL 更新函数（等级 A）
- URL：https://docs.openlinksw.com/virtuoso/rdfsparul/
- 标题：SPARUL — an Update Language For RDF Graphs（16.3.2）
- 机构：OpenLink Software｜日期：访问 2026-08-12
- 摘录："create function DB.DBA.RDF_INSERT_TRIPLES (in graph_iri any, in triples any, in log_mode integer := null)"；"create function DB.DBA.RDF_DELETE_TRIPLES (in graph_iri any, in triples any, in log_mode integer := null)"；"Both functions receive the IRI of the graph that should be altered and a vector of triples that should be added or removed."（所抓两页无 snapshot/retention/archive/versioning 命中）
- 等级：A

### K17｜GraphDB 11.0 官方文档（Wayback 存档）——面向 GRAPH/FROM/FROM NAMED 的 context index（等级 A）
- URL：https://web.archive.org/web/20250727014845id_/https://graphdb.ontotext.com/documentation/11.0/configuring-a-repository.html
- 标题：Configuring a repository（GraphDB 11.0 Documentation）
- 机构：Ontotext｜日期：Wayback 快照 2025-07-27（文档对应 GraphDB 11.0）
- 摘录："Enable context index: Builds an additional Context-Predicate-Subject-Object index to boost the SPARQL query performance of queries with GRAPH, FROM, and FROM NAMED clauses."；所抓存档页（配置仓库、RDF4J API 两页）无 snapshot/retention/archive/versioning 命中。
- 等级：A（存档原文到手；GraphDB 现行站因验证码无法直连，见 U2）

### K18｜Taelman 等 2019——RDF 档案索引系统 OSTRICH 摘要（等级 A：作者页原文摘要；B：全文未到手）
- URL：https://rubensworks.net/publications/taelman_jws_ostrich_2018/（论文 DOI 10.1016/j.websem.2018.08.001，Journal of Web Semantics 2019）
- 标题：Triple Storage for Random-Access Versioned Querying of RDF Archives
- 机构：Ghent University（IDLab）/ Journal of Web Semantics｜日期：2018-2019
- 摘录（作者出版页摘要原文）："we introduce an RDF archive indexing technique that is able to store datasets with a low storage overhead, by compressing consecutive versions and adding metadata for reducing lookup times… Using the BEAR RDF archiving benchmark, we evaluate our implementation, called OSTRICH."（全文 PDF 未到手——semanticscholar 链接失效，见 U5）
- 等级：A（摘要）/B（全文未核）

### K19｜Gutiérrez, Hurtado & Vaisman 2007——Introducing Time into RDF（等级 B，背景；时态理论归 B4）
- URL：DOI 10.1109/TKDE.2007.34（IEEE TKDE；CrossRef 元数据已验证）
- 标题：Introducing Time into RDF
- 机构：IEEE Transactions on Knowledge and Data Engineering 19(2)｜日期：2007
- 摘录：未到手（仅元数据）；Fernández 等综述明确以该文"temporal RDF graphs"为形式化基础（"adapt the notion of temporal RDF graphs by Gutierrez et al."）。
- 等级：B（未核全文）

### K20｜Tappolet & Bernstein 2009——Applied Temporal RDF（等级 B；背景）
- URL：DOI 10.1007/978-3-642-02121-3_25（ESWC 2009, LNCS 5554；CrossRef 元数据已验证）
- 标题：Applied Temporal RDF: Efficient Temporal Querying of RDF Data with SPARQL
- 机构：Springer（ESWC 2009）｜日期：2009
- 摘录：未到手（paywall；仅元数据 + Fernández 综述中转述的 AnQL 翻译，见 K8）。
- 等级：B（未核全文）

### K21｜Arndt 等 2016——Distributed Collaboration on RDF Datasets Using Git（等级 B；背景）
- URL：DOI 10.1145/2993318.2993328（SEMANTiCS 2016；CrossRef 元数据已验证）
- 标题：Distributed Collaboration on RDF Datasets Using Git
- 机构：ACM（SEMANTiCS 2016）｜日期：2016
- 摘录：未到手（仅元数据）。
- 等级：B（未核全文）

### K22｜Frommhold 等 2016——Towards Versioning of Arbitrary RDF Data（等级 B；背景）
- URL：DOI 10.1145/2993318.2993327（SEMANTiCS 2016；CrossRef 元数据已验证）
- 标题：Towards Versioning of Arbitrary RDF Data
- 机构：ACM（SEMANTiCS 2016）｜日期：2016
- 摘录：未到手（仅元数据）。
- 等级：B（未核全文）

### K23｜Schandl 2010——Replication and Versioning of Partial RDF Graphs（等级 B；背景）
- URL：DOI 10.1007/978-3-642-13486-9_3（ESWC 2010, LNCS 6089；CrossRef 元数据已验证）
- 标题：Replication and Versioning of Partial RDF Graphs
- 机构：Springer（ESWC 2010）｜日期：2010
- 摘录：未到手（仅元数据）。
- 等级：B（未核全文）

### K24｜Taelman 等 2017——Live Storage and Querying of Versioned Datasets on the Web（等级 B；背景）
- URL：DOI 10.1007/978-3-319-70407-4_14（ESWC 2017 Satellite Events, LNCS 10577；CrossRef 元数据已验证）
- 标题：Live Storage and Querying of Versioned Datasets on the Web
- 机构：Springer（ESWC 2017）｜日期：2017
- 摘录：未到手（仅元数据）。
- 等级：B（未核全文）

## 3 冲突与张力

- **标准空白 vs 学术需求**：SPARQL/RDF 官方标准（2026 草案/CR）无任何数据时态/版本算子（K1-K3），而学术界从 2007（Gutiérrez 等）到 2019（Taelman/OSTRICH）持续产出时态/版本化 RDF 系统与基准（K18-K24）——"版本化需求真实存在但标准无原语"，一切落到应用层约定，各系统互不兼容。
- **IC 与 CB 的权衡无标准裁决**：快照全量复制版本物化最直接但空间重复、论文明示 scalability 问题；增量补丁省空间但 delta 传播/重建成本上移（K8/K10）。对 M09 这类"旧版本不覆盖 + 某时间点取边集合"需求，两方案都可行，取舍是应用层工程决策，规范与综述都不给唯一答案。
- **图 atemporal vs RDF source 可变**：RDF 1.2 同时说"图是静态快照"又说"RDF source 的状态可随时间变化、其快照可表达为 RDF 图"（K3）——"哪个快照是当前权威版本"（如默认图指向最新版、还是单独 current 图）规范未规定，须应用层自定约定。
- **版本号 vs 时间戳**：Fernández 综述为避开时间算子明确"把焦点放在版本标签而非时间标签"（K7 上下文："we make a syntactic-sugar modification to put the focus on version labels instead of temporal labels… time labels… complementary"）；而 PROV-O/OWL-Time/Memento 用时间点/区间。M09 的"某时间点的状态"查询需要版本号↔时间戳映射（应用层元数据），这一映射无标准。
- **服务端无保留能力 vs 用户持久承诺**：三厂商官方文档均未见多版本批量管理与保留（K14-K17，否定证据）——若用户假设服务端会自动保留旧命名图，将得不到文档保证；保留/剪枝必须由应用层流程负责（C 推断）。

## 4 未决

- **U1｜SPARQL 1.2 最终形态**：两个草案均为 2026-06 的 Working Draft，未来是否纳入时态/版本特性未定；本调研只对 2026-06-25/06-12 版本负责。
- **U2｜GraphDB 现行版**：graphdb.ontotext.com 现行文档被验证码拦截，仅核到 11.0 的 Wayback 存档两页；新版（11.0 之后）是否有版本/快照/保留功能未核。
- **U3｜Virtuoso/GraphDB 文档全集**：仅对抓取的页面做否定检索；其他章节（如备份/恢复、集群运维）是否存在多版本命名图管理未核。
- **U4｜中文一手来源**：中文检索（"SPARQL 版本化 命名图 快照"等）只返回通用 SPARQL 教程（知乎/CSDN/阮一峰等），未找到中文规范或中文工程一手资料（未核）。
- **U5｜OSTRICH 全文**：Taelman 等 JWS 2019 全文 PDF 未到手（semanticscholar 旧链接失效），仅作者页摘要；其版本化查询端点的具体 SPARQL 语法未核。
- **U6｜AnQL 细节**：Tappolet & Bernstein 2009 全文 paywalled，AnQL 算子全集与其 SPARQL 翻译细节仅通过 Fernández 综述二手转述（K8/K20），未核原论文。

## 5 来源清单

| # | 来源（URL/DOI） | 类型 | 等级 | 原文到手 |
|---|---|---|---|---|
| 1 | SPARQL 1.2 Query Language，W3C WD 2026-06-25（w3.org/TR/sparql12-query/） | 标准/规范 | A | 是 |
| 2 | SPARQL 1.2 Update，W3C WD 2026-06-12（w3.org/TR/sparql12-update/） | 标准/规范 | A | 是 |
| 3 | RDF 1.2 Concepts and Abstract Data Model，W3C CR Snapshot 2026-04-07（w3.org/TR/rdf12-concepts/） | 标准/规范 | A | 是 |
| 4 | RDF 1.1 Concepts，W3C REC 2014-02-25（w3.org/TR/rdf11-concepts/） | 标准/规范 | A | 是 |
| 5 | SPARQL 1.1 Query Language，W3C REC 2013-03-21（w3.org/TR/sparql11-query/） | 标准/规范 | A | 是 |
| 6 | PROV-O: The PROV Ontology，W3C REC 2013-04-30（w3.org/TR/prov-o/） | 标准/规范 | A | 是 |
| 7 | Time Ontology in OWL（OWL-Time），W3C CRD 2022-11-15（w3.org/TR/owl-time/） | 标准/规范 | A | 是 |
| 8 | RFC 7089 Memento，IETF 2013-12（rfc-editor.org/rfc/rfc7089.txt） | 标准/规范（RFC） | A | 是 |
| 9 | Fernández, Umbrich, Polleres, Knuth《Evaluating Query and Storage Strategies for RDF Archives》，Semantic Web 10 (2019)，DOI 10.3233/SW-180309（semantic-web-journal.net/system/files/swj1608.pdf） | 学术论文 | A | 是（PDF 全文） |
| 10 | Taelman 等《Triple Storage for Random-Access Versioned Querying of RDF Archives》，JWS 2019，DOI 10.1016/j.websem.2018.08.001（作者页 rubensworks.net/publications/taelman_jws_ostrich_2018/） | 学术论文 | A/B | 部分（摘要 A，全文未核） |
| 11 | Apache Jena Fuseki 主文档（jena.apache.org/documentation/fuseki2/） | 厂商官方文档 | A | 是 |
| 12 | Apache Jena Fuseki 配置文档（…/fuseki-configuration.html） | 厂商官方文档 | A | 是 |
| 13 | Virtuoso Docs: Default and Named Graphs（docs.openlinksw.com/virtuoso/rdfdefaultgraph/） | 厂商官方文档 | A | 是 |
| 14 | Virtuoso Docs: SPARUL（docs.openlinksw.com/virtuoso/rdfsparul/） | 厂商官方文档 | A | 是 |
| 15 | GraphDB 11.0: Configuring a repository（Wayback 2025-07-27 存档） | 厂商官方文档 | A | 是（存档原文） |
| 16 | GraphDB 11.0: Using GraphDB with the RDF4J API（Wayback 2025-08-02 存档） | 厂商官方文档 | A | 是（存档原文） |
| 17 | CrossRef API 元数据验证 ×9 DOI（works/10.3233/SW-180309 等） | 权威元数据 | B | 否（元数据） |
| 18 | Gutiérrez, Hurtado, Vaisman, Introducing Time into RDF, IEEE TKDE 2007（DOI 10.1109/TKDE.2007.34） | 学术论文 | B | 否 |
| 19 | Tappolet & Bernstein, Applied Temporal RDF, ESWC 2009（DOI 10.1007/978-3-642-02121-3_25） | 学术论文 | B | 否 |
| 20 | Arndt, Radtke, Martin, Distributed Collaboration on RDF Datasets Using Git, SEMANTiCS 2016（DOI 10.1145/2993318.2993328） | 学术论文 | B | 否 |
| 21 | Frommhold 等, Towards Versioning of Arbitrary RDF Data, SEMANTiCS 2016（DOI 10.1145/2993318.2993327） | 学术论文 | B | 否 |
| 22 | Schandl, Replication and Versioning of Partial RDF Graphs, ESWC 2010（DOI 10.1007/978-3-642-13486-9_3） | 学术论文 | B | 否 |
| 23 | Taelman 等, Live Storage and Querying of Versioned Datasets on the Web, ESWC 2017（DOI 10.1007/978-3-319-70407-4_14） | 学术论文 | B | 否 |

合计：来源 23（≥15）；A 级原文到手 16 个去重来源（≥10）；类型 4 类（标准/规范、学术论文、厂商官方文档、权威元数据）≥3。

## 6 判死自查

- **无来源论断？** 否——每条 K 含 URL+标题+机构+日期+摘录+等级；Q&A 中的论断均挂 K 条目；推断一律标 C。
- **二手当原文？** 否——16 个来源 A 级原文到手（本地 .txt/PDF 提取，摘录逐字核对）；B 级仅用于 CrossRef 元数据验证、摘要未到手全文未核的学术条目，均显式标注"未核全文"。
- **越界漏答？** 否——时态/位时理论只作背景（K19/K20 挂 B 并注明"理论归 B4"）；内容寻址/位点（IPLD/CID）未涉（归 B4b）；nanopub 未涉（归 B4a）；未比较厂商、未做性能评测（Fernández 论文中的 Jena/HDT 等性能对比内容一律未引用，只引策略/复杂度定性描述）。
- **推断当结论？** 否——"服务端无原生多版本批量保留"为 C 推断（基于三厂商文档子集的否定证据，已注明 U2/U3 未核）；Q5 查询示例为 C 推断（演示性，非原文）；U1-U6 未决未冒充结论。
- **红线核对**：可核来源 23≥15 ✓；原文到手 16≥10 ✓；来源类型 4≥3 ✓；候选逐一查证 9≥5 ✓（候选清单：SPARQL 1.2 Query/Update 两草案、RDF 1.2 atemporal/数据集定义、RDF 数据集版本化综述（Fernández SWJ）、PROV-O、OWL-Time、Memento RFC 7089、Jena Fuseki、Virtuoso、GraphDB——9 项全部查证并归档）；关键词组 4+≥4 ✓。
- **关键词组工作日志**（实际执行，2026-08-12）：① arXiv API `all:"RDF dataset versioning"`→0 结果（存 arxiv_versioning.xml）；② arXiv API `abs:"named graphs" AND abs:version`→4 结果均不相关（存 arxiv_tmp.xml）；③ 中文 Bing "SPARQL 版本化 命名图 快照 RDF 数据集"→仅通用 SPARQL 教程，无一手中文资料（记录为 U4 未核）；④ 英文 Bing "SPARQL dataset versioning named graphs snapshot"→返回通用/不相关结果（搜索质量差，改走 W3C/arXiv/Crossref/期刊直连）；⑤ 任务卡四组关键词（中文/英文各两组）作为检索范围依据；⑥ CrossRef 对 9 个 DOI 逐一验证元数据。
- **任务卡禁止项**：不比较厂商（未做任何厂商对比/评测）；不越界（时间版本理论归 B4、位点归 B4b）；不捏造来源（所有摘录均出自本地暂存原文，未到手处标"未核"）；推断标 C（服务端保留、查询示例等）。
