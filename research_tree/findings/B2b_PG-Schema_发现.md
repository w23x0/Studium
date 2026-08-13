# B2b 发现 — PG-Schema 与属性图 schema 语言状态

- 分支：B2b（B2 属性图系第二轮子任务）
- 任务卡：research_tree/tasks/B2b_PG-Schema.md
- 调研员：B2b 分支调研员（独立 Codex 会话）
- 产出时间：2026-08-12（快照日期以各来源原文/元数据为准）
- 说明：不比较厂商、不做性能评测；SHACL/ShEx 归 B5 分支，本文件仅在引用共性论文原文时提及、不做分析；抓不到写"未核"；推断一律标 C；原始证据存 research_tree/tmp/b2b/。

## 0 一句话结论

PG-Schema 目前是 **LDBC/GDC（Graph Data Council）社区与学术界推动的规范提案，尚未成为 ISO 正式标准**：其"官方原文"载体是 2022-11-20 首发、2023 年刊于 PACMMOD 的论文《PG-Schema: Schemas for Property Graphs》（DOI 10.1145/3589778）及 LDBC PGSWG 2020 年提交 ISO WG3 的材料（2023-04 以 OAEP-2023-04 公开）；语言语法（domel/pgschema EBNF v0.3）支持 STRICT/LOOSE、OPEN、标签联合（`|`）与可选属性，可表达"节点标签必填""边标签枚举（如 deposit|withdraw）"，但 **"9+other"没有官方现成语法**，other 兜底需 OPEN（其语义是"任意其他"，与"封闭枚举"命题语义不同，推断 C）；**属性类型 ENUM 在原始论文中仅是 §5.3"可能扩展"，不是核心语法**（EBNF 中 propertyType 仅为一个类型名；PG-Schema-PC 2025 论文才形式化属性约束）；**状态转换规则（M08 审计晋升等）无内建触发器/转换约束原语**，静态状态枚举可用 schema 表达，动态转换规则需应用层（推断 C）；工具链现状是"有语法/解析实现（domel/pgschema、pgs-grammar-check），**未发现标准 PG-Schema 校验器**"。

## 1 逐条回答

### Q1 PG-Schema 是否已发布为规范/草案？由谁发布？官方原文与版本日期？

- **未发布为 ISO 规范，也未发布为独立开源规范文档**；目前形式是"学术论文 + LDBC 社区工作文件 + 社区语法实现"三层。
- 主要"官方原文"：
  1. **论文**：Angles et al.,《PG-Schema: Schemas for Property Graphs》，arXiv:2211.10962（v1=2022-11-20，v4=2023-07-08），正式版 ACM PACMMOD Vol.1 No.2（Crossref created 2023-06-20，DOI 10.1145/3589778）。摘要原文："schema support is limited both in existing systems and in the first version of the GQL Standard. It is anticipated that the second version of the GQL Standard will include a rich DDL."（等级 A）
  2. **LDBC/GDC 社区文件**：PGSWG（Property Graph Schema Working Group）2020-06-12 提交 ISO WG3 的 GS-Basic 报告，2023-04 以 LDBC OAEP-2023-04 公开（DOI 10.54285/ldbc.OFJF3566）；LEX（Extended GQL Schema）工作组章程 WC-2023-01 v1.1（2023-10-16 通过，DOI 10.54285/ldbc.SSIF9351）。（等级 A）
  3. **语法实现**：domel/pgschema "PG-Schema Grammar 0.3"（Zenodo DOI 10.5281/zenodo.7362078，Dominik Tomaszuk，2022-11-25；EBNF/ANTLR/railroad 图/示例，MIT）。（等级 A）
- **版本日期**：论文 v1=2022-11-20、v4=2023-07-08；PACMMOD 2023-06（Crossref created 2023-06-20）；Grammar 0.3=2022-11-25；LEX 章程 1.1=2023-10-16。
- 发布方归属：论文 21 位作者（多机构，含 LDBC 代表 Alastair Green、Jan Hidders 等，脚注原文 "Seven authors of this paper are also members of ISO/IEC JTC1 SC32 WG3"）；社区组织 LDBC（现 GDC）负责 PGSWG/LEX；**无 ISO 版本**。ISO 官网 GQL 页（iso.org/standard/76120.html）本次抓取 403（未核）。

### Q2 PG-Schema 能否表达"边标签封闭枚举（9+other）""节点标签必填""属性类型枚举"？

- **边标签枚举（不含 other）**：能。domel/pgschema 示例 FraudGraphType 有 `[ActivityType: deposit|withdraw {time DATETIME}]`（标签联合，等级 A）。EBNF 原文 `labelSpec ::= '(' SP? labelSpec SP? ')' | '[' SP? labelSpec SP? ']' | labelSpec SP? ( ( '|' | '&' ) SP? labelSpec | '?' ) | labelName | typeName`（等级 A）。
- **"9+other"（9 个固定 + 任意 other）**：**无官方现成示例**（未核/缺位）。语法上可用 `STRICT` 图类型 + 显式 9 个标签联合，再在某元素类型上加 `OPEN` 表达"允许任意其他标签/属性"——OPEN 语义等价于"9 之外任意 other"，但 **OPEN 的 other 不受类型/白名单约束**（"任意其他"而非"其他也限定在受控集合内"）。若要求 other 本身也受控（如必须是 `otherKind`），核心语法无此原语，需应用层（推断 C）。
- **节点标签必填**：能。节点类型语法 `nodeType ::= '(' SP? typeName labelPropertySpec SP? ')'`，labelPropertySpec 要求 `':' labelSpec`（如 `(PersonType: Person {name STRING})`）；`STRICT` 图类型语义要求"每个节点/边必须符合某个已定义类型"（2606.06127 正文原文，等级 A）。
- **属性类型枚举**：**核心语法不能**。EBNF `property ::= ( OPTIONAL SP )? key SP propertyType SP?` 且 `propertyType ::= StringLiteral`（即引用一个类型名，如 STRING/INT32/DOUBLE/DATETIME）；论文 §5.3"Possible Extensions"给出的 `genre ENUM("Prose","Poetry","Dramatic")` 是**建议扩展示例，非核心语法**（等级 A）。属性集约束（含值域/基数/枚举类）由 PG-Schema-PC（K-CAP 2025，DOI 10.1145/3731443.3771349）在 2025 年扩展形式化，但该论文为研究论文（等级 B，Crossref 元数据，全文未核）。
- 封闭世界语义：`STRICT` + 无 `OPEN` 即"所有元素/属性/标签都必须由 schema 证明"，对应 PGSWG GS-Basic 的 closed 定义（"every vertex, edges and attribute must be somehow justified by the type or schema"，等级 A）。

### Q3 PG-Schema 与 GQL/SQL:PGQ 的关系：GQL 是否内建 schema 语言，还是 PG-Schema 独立演进？

- **GQL（ISO/IEC 39075:2024，2024-04 发布）第一版没有完整 schema 语言**：只含可选 graph types（node type/edge type 的集合），论文与 LEX 章程互证"rich DDL 预期在 GQL 第二版"。
- **术语陷阱**：PG-Schema 论文脚注原文——"in GQL, the term GQL-schema refers not to a schema in our sense, but to a dictionary of primary catalog objects such as graphs, graph types, or procedures."（等级 A）。
- **关系**：PG-Schema 定位为 GQL DDL 的输入/启发（论文摘要 "Aiming to inspire the development of GQL"；正文 "consolidates and extends discussions arising out of the Property Graph Schema Working Group of the Linked Data Benchmark Council"）；WWW'25 论文原文称 PG-Schema "was developed with liaisons to the GQL and SQL/PGQ standardization committees and is currently being used as a basis for extending these standards"（等级 A）。
- **演进状态**：独立于 ISO 进程在 LDBC/学术界演进，但与标准进程深度耦合：LDBC 是 ISO/IEC JTC1 SC32/WG3 的 Category C Liaison；LEX 章程任务原文 "Propose a concrete extended GQL schema language design, as an input to WG3"（等级 A）。
- **SQL:PGQ**：ISO/IEC 9075-16:2023（SQL:2023 第 16 部分，等级 B/Wikipedia，ISO 页未核）；PG-Schema 论文称其 PG-Types 部分 "reflecting and extending work on SQL/PGQ schemas"（等级 A）。

### Q4 属性图数据的 schema 校验工具链现状（有没有 PG-Schema 校验器、库）

- **未发现标准/通用的 PG-Schema 校验器**（"未发现"≠"确认不存在"，按 B/C 区分陈述）。
- 现有"实现层"证据：
  - **domel/pgschema**（Zenodo 10.5281/zenodo.7362078，MIT）：EBNF、ANTLR 语法、railroad 图、示例——是**语法实现**，README 无校验/验证功能描述（等级 A）。
  - **damianw27/pgs-grammar-check**（Zenodo 10.5281/zenodo.7344227，论文参考文献列出，2022-11）：按名称为语法检查工具（等级 B，仅论文书目证据，未单独核验仓库）。
  - **opengql/grammar**（GQL ANTLR grammar）：README 原文 "This repository contains a language-independent ANTLR grammar for GQL"，目标是**解析器生成**，无 PG-Schema 校验功能（等级 A）。
  - **2606.06127（arXiv，2026-06-04）**：《Validation of graph databases against PG-Schema》是**理论论文**（证明不含完整性约束的图类型校验 combined NP-complete / data PTIME），非工具（等级 A）。
- 结论：语法/解析层有实现，**校验（validation）层仅有理论结果与学术扩展，无标准库**（推断 C 结合未发现）。

### Q5 对 M08"候选池+审计晋升+处置单"：属性图 schema 能否表达状态机（边状态属性枚举+转换规则），还是必须靠应用层？

- **静态部分（可表达，等级 A 语法 + C 组合推断）**：
  - 状态作为边标签枚举：`[edgeType: status_pending | status_auditing | status_promoted | ...]`（FraudGraphType 的 `deposit|withdraw` 是同类语法先例，等级 A）；
  - 状态作为属性 + 值域约束：需 PG-Schema-PC 式属性约束扩展（K-CAP 2025，等级 B）或应用层校验；
  - 结构约束（每个候选必须有审计边、处置单唯一等）：PG-Keys 子语言有 `FOR ( c : customer ) MANDATORY ()-[: owns ]->( c )` 式 MANDATORY/SINGLETON/EXCLUSIVE 约束（等级 A，2606.06127 正文 Figure 3 示例）。
- **动态部分（不可表达，推断 C）**：状态机**转换规则**（"状态 A 只能由 B 迁入""晋升须先通过审计"这类时序/前置条件）**未见于 PG-Schema 核心语法**——EBNF 无触发器、无时序、无转换规则构造；`PG-Triggers: Triggers for Property Graphs`（SIGMOD 2024 Companion，DOI 10.1145/3626246.3653386）是研究论文，**非标准**（等级 B，Crossref 元数据）。
- 结论：**状态枚举与结构不变量可用 schema 表达；转换规则/审计晋升流程必须靠应用层（或外部约束引擎）**。此结论为 C 级推断（基于核心语法/EBNF 的未覆盖 + 未发现标准触发器语义）。

## 2 关键发现

### K1 — PG-Schema 的"规范"载体是学术论文，不是 ISO 或独立规范文档
- 论断：PG-Schema 尚无独立规范文本；事实标准文本是 arXiv/PACMMOD 论文。
- URL: https://arxiv.org/abs/2211.10962 ；正式版 https://doi.org/10.1145/3589778
- 标题: PG-Schema: Schemas for Property Graphs（Angles, Bonifati, Dumbrava, Fletcher, Green, Hidders, Li, Libkin, Marsault, Martens, Murlak, Plantikow, Savković, Schmidt, Sequeda, Staworko, Tomaszuk, Voigt, Vrgoč, Wu, Živković）
- 机构: arXiv（作者含 Universidad de Talca、Lyon 1/Liris CNRS、TU Eindhoven、LDBC、Birkbeck、Google、Edinburgh、RelationalAI、Neo4j、Amazon、data.world、Univ. Warsaw、Univ. Białystok、TigerGraph 等；脚注 "Seven authors of this paper are also members of ISO/IEC JTC1 SC32 WG3"）；正式版为 ACM PACMMOD
- 日期: arXiv v1 2022-11-20、v4 2023-07-08；PACMMOD 2023-06（Crossref created 2023-06-20，Vol.1 No.2）
- 原文摘录: 摘要 "Yet, despite documented demand, schema support is limited both in existing systems and in the first version of the GQL Standard. It is anticipated that the second version of the GQL Standard will include a rich DDL. Aiming to inspire the development of GQL and enhance the capabilities of graph database systems, we propose PG-Schema, a simple yet powerful formalism for specifying property graph schemas."
- 等级: A（ar5iv 全文 103KB 到手）

### K2 — PG-Schema 自我定位：consolidates LDBC PGSWG 讨论
- 论断：论文明言其来源是 LDBC Property Graph Schema Working Group 的讨论，走"给标准委员会提供推荐"的既有路径（G-CORE、PG-Keys 先例）。
- URL: https://arxiv.org/abs/2211.10962
- 标题: PG-Schema: Schemas for Property Graphs, §1
- 机构: arXiv / ACM PACMMOD
- 日期: 2022-11-20（v1）/ 2023（正式版）
- 原文摘录: "Our proposal, called PG-Schema, consolidates and extends discussions arising out of the Property Graph Schema Working Group of the Linked Data Benchmark Council (Group 2020). This model of providing recommendations to standards committees has proven successful, as evidenced by G-CORE (Angles et al. 2018) and PG-Keys (Angles et al. 2021) influencing GQL."
- 等级: A

### K3 — LDBC PGSWG 官方结构：4 个子组（PG-Basic/PG-Constraints/PG-Properties/PG-Nulls）
- 论断：PGSWG 是 LDBC/GDC 官方工作组，组长 Jan Hidders 与 Juan Sequeda，4 个子组覆盖 schema 基础、约束、属性、空值。
- URL: https://ldbcouncil.org/gql-community/pgswg/（Graph Data Council）
- 标题: Property Graph Schema Working Group (PGSWG) | Graph Data Council
- 机构: LDBC / Graph Data Council（GDC，原 LDBC）
- 日期: 抓取 2026-08-12（现行页面，无发布日戳）
- 原文摘录: "Group leaders: Jan Hidders (Birkbeck College, University of London), Juan Sequeda (data.world)" / "The PGSWG has 4 sub-groups: PG-Basic, PG-Constraints, PG-Properties, PG-Nulls"
- 等级: A（页面原文到手）

### K4 — PGSWG 2020-06-12 GS-Basic：closed schemas/types 定义与 open types 开放问题
- 论断：PGSWG 第一阶段明确以"封闭 schema/类型"为起点（每个顶点/边/属性必须被类型或 schema 证明），同时把"如何引入 open types"列为开放问题——为后来 PG-Schema 的 OPEN/LOOSE 留了口子。
- URL: https://ldbcouncil.org/resources/publications/ldbc-oaep/oaep-2023-04/ ；DOI https://doi.org/10.54285/ldbc.OFJF3566
- 标题: LDBC Property Graph Schema contributions to WG3（OAEP-2023-04，"GS-Basic Overview report"，WG3:MMX-069）
- 机构: LDBC（原文档 2020-06 提交 ISO/IEC JTC1 SC32 WG3；OAEP 系列 2023-04 公开）
- 日期: 文档 2020-06-12；公开 2023-04（LDBC 页面 Publication year: 2020）
- 原文摘录: "The scope of the discussions, and therefore also of this report, was for practical reasons limited to closed schemas and closed types. By 'closed' we mean here that every vertex, edges and attribute must be somehow justified by the type or schema."；开放问题列表含 "How to introduce open types?"
- 等级: A（PDF 全文 232 页文本到手）

### K5 — GQL 已发布：ISO/IEC 39075:2024，2024-04-12
- 论断：GQL（Graph Query Language）第一版已于 2024-04 由 ISO 发布；LDBC 侧公告与 Wikipedia 一致，ISO 官网页面本次抓取 403（未核）。
- URL: https://ldbcouncil.org/gql-community/opengql-announce/ ；https://en.wikipedia.org/wiki/Graph_Query_Language ；https://www.iso.org/standard/76120.html（未核）
- 标题: LDBC Open-Source GQL Tools（Alastair Green）；Graph Query Language（Wikipedia）；ISO/IEC 39075:2024（未核）
- 机构: LDBC（公告）/ ISO/IEC（标准）/ Wikipedia（二手）
- 日期: LDBC 公告 2024-05-09；Wikipedia 记载 2024-04-12
- 原文摘录: LDBC 公告 "The GQL standard was published in mid-April by ISO. See WG3 Convenor Keith Hare's summary: ISO/IEC JTC 1 GQL Database Language"；Wikipedia "GQL ... is a standardized query language for property graphs first described in ISO/IEC 39075, released in April 2024 by ISO/IEC."
- 等级: A（LDBC 公告原文）/ B（Wikipedia 佐证）；ISO 标准页未核

### K6 — GQL 第一版 schema 能力有限：graph types 可选、rich DDL 推迟 v2；"GQL-schema" 指 catalog dictionary
- 论断：GQL v1 只有 graph types（可选），rich DDL 预期在 v2；GQL 术语中 schema 指 catalog 字典而非约束语言。
- URL: https://arxiv.org/abs/2211.10962（摘要 + 脚注 3）
- 标题: PG-Schema: Schemas for Property Graphs
- 机构: arXiv / ACM PACMMOD
- 日期: 2022-11-20（v1）/ 2023（正式版）
- 原文摘录: 脚注 "Note that in GQL, the term GQL-schema refers not to a schema in our sense, but to a dictionary of primary catalog objects such as graphs, graph types, or procedures."；正文 "PG-Types ... reflecting and extending work on SQL/PGQ schemas (9075-16 2022 ...), Graph DDL in the openCypher Morpheus project ... and GQL graph types (39075 2023 ...)"
- 等级: A

### K7 — LEX 工作组章程：extended GQL schema language design 输入 WG3；graph types "not enough"
- 论断：LDBC 2023 年成立 LEX 工作组，使命是向 ISO WG3 提交扩展 GQL schema 语言设计；章程明言草案 GQL 的 graph types 不足以描述/规定实际数据图，复杂度要与 SQL schema 同量级。
- URL: https://ldbcouncil.org/resources/publications/ldbc-wc/wc-2023-01/ ；DOI https://doi.org/10.54285/ldbc.SSIF9351
- 标题: LDBC Extended GQL Schema (LEX) Work Charter 1.1（LDBC WC-2023-01，LEX-044）
- 机构: LDBC（Members Policy Council 通过）
- 日期: 2023-10-16（章程版本通过日）
- 原文摘录: "Mission: Propose a concrete extended GQL schema language design, as an input to WG3." / "The draft GQL standard includes optional graph types enclosing sets of node types and edge types. The experience of users of graph database languages indicates that this (vital) groundwork is not enough to describe and prescribe the structure and values of practical data graphs, to at least the same degree of complexity as SQL schema." / "The outputs of this Working Group will be contributed to WG3 through the LDBC liaison with that body"
- 等级: A（PDF 全文 18KB 到手）

### K8 — PG-Schema 语法实现：domel/pgschema Grammar 0.3（EBNF/ANTLR/railroad/examples，MIT）
- 论断：存在官方论文作者维护的语法仓库，含 EBNF、ANTLR、railroad 图、示例；Zenodo 归档 DOI 10.5281/zenodo.7362078。
- URL: https://github.com/domel/pgschema ；https://doi.org/10.5281/zenodo.7362078
- 标题: domel/pgschema: PG-Schema Grammar 0.3（README + Zenodo 记录）
- 机构: Dominik Tomaszuk（University of Białystok；社区仓库，MIT）
- 日期: Zenodo 2022-11-25；README 抓取 2026-08-12
- 原文摘录: Zenodo 描述 "PG-Schema grammar and related topics"；README 目录 "[PG-Schema grammar in EBNF](ebnf) / [PG-Schema grammar in ANTLR](antrl) / [PG-Schema railroad diagrams](railroad_diagrams) / [PG-Schema examples](examples)"；"This project is licensed under the MIT License"
- 等级: A

### K9 — 图类型形态语法：STRICT/LOOSE + OPEN + OPTIONAL（EBNF 原文）
- 论断：EBNF 提供 STRICT/LOOSE 图类型形态、元素级 OPEN（开放标签/属性）、属性 OPTIONAL；缺省即封闭。
- URL: https://github.com/domel/pgschema/blob/main/ebnf/pgs.ebnf
- 标题: pgs.ebnf（PG-Schema Grammar 0.3 的 EBNF）
- 机构: domel/pgschema（社区）
- 日期: 抓取 2026-08-12（仓库对应 v0.3，2022-11）
- 原文摘录: "graphType ::= typeName SP typeForm SP? graphTypeDefinition" / "typeForm ::= STRICT | LOOSE" / "labelPropertySpec ::= ( ':' SP? labelSpec )? SP? OPEN? SP? propertySpec?" / "property ::= ( OPTIONAL SP )? key SP propertyType SP?" / "propertyType ::= StringLiteral"
- 等级: A（EBNF 全文到手）

### K10 — 边标签联合枚举语法与示例：`deposit|withdraw`；"9+other"无官方示例，需 OPEN 等价变体
- 论断：边标签可用 `|` 联合枚举（FraudGraphType 示例），可扩展到 9 个标签；但"9 固定 + other 兜底"无现成官方示例，语法等价物是"9 个显式标签 + OPEN"，而 OPEN 的 other 不受控（推断 C）。
- URL: https://github.com/domel/pgschema/tree/main/examples ；EBNF https://github.com/domel/pgschema/blob/main/ebnf/pgs.ebnf
- 标题: FraudGraphType.pgs；pgs.ebnf（labelSpec）
- 机构: domel/pgschema（社区）
- 日期: 抓取 2026-08-12
- 原文摘录: "CREATE GRAPH TYPE FraudGraphType STRICT { ... (:TransactionType)-[ActivityType: deposit|withdraw {time DATETIME}]->(:AccountType) }"；EBNF "labelSpec ::= '(' SP? labelSpec SP? ')' | '[' SP? labelSpec SP? ']' | labelSpec SP? ( ( '|' | '&' ) SP? labelSpec | '?' ) | labelName | typeName"
- 等级: A（语法/示例原文）；"9+other 官方示例缺位"与 OPEN 等价性推断标 C

### K11 — 节点标签必填：nodeType 语法 + STRICT 语义
- 论断：节点类型要求 `: labelSpec`（如 `(PersonType: Person {name STRING})`）；STRICT 图类型要求每个节点/边符合某个已定义类型，实现"标签必填/节点必有类型"。
- URL: https://arxiv.org/abs/2606.06127 ；https://github.com/domel/pgschema/blob/main/ebnf/pgs.ebnf
- 标题: Validation of graph databases against PG-Schema（正文）；pgs.ebnf
- 机构: arXiv（Univ. Warsaw、TU Wien、Univ. Białystok）；domel/pgschema
- 日期: arXiv 2026-06-04；EBNF 抓取 2026-08-12
- 原文摘录: 2606.06127 正文 "The keyword STRICT indicates that in a graph of type customerGraph, each node and edge must conform to one of the defined types. The other alternative is LOOSE, which indicates that nodes and edges might not conform to any of the defined types, but integrity constraints must still hold."；EBNF "nodeType ::= '(' SP? typeName labelPropertySpec SP? ')'"
- 等级: A

### K12 — 属性类型枚举不是核心语法：ENUM 仅出现在论文 §5.3"Possible Extensions"
- 论断：核心语法属性类型仅为类型名（EBNF `propertyType ::= StringLiteral`）；`ENUM("Prose","Poetry","Dramatic")` 是论文建议扩展示例，非正式语法；属性值域/枚举约束到 2025 年才由 PG-Schema-PC 研究扩展形式化。
- URL: https://arxiv.org/abs/2211.10962（§5.3）；https://github.com/domel/pgschema/blob/main/ebnf/pgs.ebnf
- 标题: PG-Schema: Schemas for Property Graphs §5.3 Possible Extensions of PG-Schema；pgs.ebnf
- 机构: arXiv / ACM PACMMOD；domel/pgschema
- 日期: 2022-11-20（v1）/ 2023（正式版）；EBNF 抓取 2026-08-12
- 原文摘录: "Range constraints. Some schema languages allow for range constraints (RC). The syntax of PG-Schema can be thus extended, specifying restrictions on acceptable values for properties. For instance, the following example defines a node type Book, with properties title (a string with maximum 100 characters), genre (an enumeration), and isbn (a string conforming to a regular expression): ( bookType : Book { title STRING (100), genre ENUM ( \"Prose\" , \"Poetry\" , \"Dramatic\" ), isbn STRING ^...$ })"
- 等级: A（论文全文/EBNF 原文）；"非核心"为原文结构事实

### K13 — PG-Schema-PC（K-CAP 2025）：属性集约束扩展
- 论断：Tomaszuk & Labra Gayo 提出 PG-Schema-PC，覆盖结构/基数/值域约束（含分组、多重性、值条件），把属性约束从"可能扩展"推进到形式化研究。
- URL: https://doi.org/10.1145/3731443.3771349
- 标题: On Property Constraints in PG-Schema
- 机构: ACM（Proceedings of the Knowledge Capture Conference 2025，K-CAP）
- 日期: Crossref created 2025-12-09（发表年 2025）
- 原文摘录: Crossref 元数据：title "On Property Constraints in PG-Schema"；container "Proceedings of the Knowledge Capture Conference 2025"（摘要级：PG-Schema-PC 是 "an extension of PG-Schema for constraints over property sets, covering structural, cardinality, and range constraints (including alternative groupings, multiplicity control, and value conditions)"——按摘要转述，全文未核）
- 等级: B（Crossref 元数据 + 摘要级；全文未核）

### K14 — 校验复杂度与工具链现状：理论 NP-complete；无标准校验器
- 论断：2026 论文证明"不含完整性约束的 PG-Schema 图类型校验"combined 复杂度 NP-complete、data 复杂度 PTIME；现成实现停留在语法层，未发现独立标准 PG-Schema 校验器库。
- URL: https://arxiv.org/abs/2606.06127
- 标题: Validation of graph databases against PG-Schema（Ciszewski, Kłos, Jakubowski, Tomaszuk, Murlak）
- 机构: arXiv（Univ. Warsaw / TU Wien / Univ. Białystok）
- 日期: 2026-06-04（v1）
- 原文摘录: 摘要 "The problem of validating a given graph database instance against a given PG-Schema graph type without integrity constraints is NP-complete in terms of combined complexity and in PTIME in terms of data complexity. The combined complexity drops to PTIME when the alternation between type combinations and unions is suitably restricted."
- 等级: A（ar5iv 全文 36KB 到手）；"无标准校验器"为未发现（B 级陈述）+ C 级推断

### K15 — PG-Keys 约束子语言：EXCLUSIVE/MANDATORY/SINGLETON（结构性约束可表达）
- 论断：PG-Schema 约束部分基于 PG-Keys（SIGMOD 2021），可表达唯一性、必选边、单例边等结构性约束——对 M08"候选必须有审计边/处置单唯一"这类结构不变量有直接语法。
- URL: https://arxiv.org/abs/2606.06127（正文 Figure 3 示例）；PG-Keys DOI https://doi.org/10.1145/3448016.3457561
- 标题: Validation of graph databases against PG-Schema（Figure 3）；PG-Keys: Keys for Property Graphs
- 机构: arXiv；ACM SIGMOD（PG-Keys）
- 日期: 2606.06127=2026-06-04；PG-Keys=SIGMOD 2021（Crossref 元数据）
- 原文摘录: 2606.06127 正文示例 "FOR ( c : customer ) EXCLUSIVE c . id , FOR ( a : account ) EXCLUSIVE a . iban , FOR ( a : account ) MANDATORY ()-[: owns ]->( a ), FOR ( c : customer ) SINGLETON ( c )-[: owns ]->()"
- 等级: A（2606 正文全文）；PG-Keys 书目为 B（Crossref 元数据）

### K16 — 与 SQL:PGQ 的关系：ISO/IEC 9075-16:2023
- 论断：SQL/PGQ（SQL:2023 第 16 部分）是 ISO 标准；PG-Schema 论文将 SQL/PGQ schema 列为 PG-Types 的启发来源之一；PG-Schema 与 SQL/PGQ 标准委员会有 liaison。
- URL: https://en.wikipedia.org/wiki/SQL:2023 ；https://arxiv.org/abs/2502.01295 ；https://www.iso.org/standard/79473.html（未核）
- 标题: SQL:2023（Wikipedia）；Common Foundations for SHACL, ShEx, and PG-Schema；ISO 79473（未核）
- 机构: Wikipedia（二手）/ arXiv（论文）/ ISO（未核）
- 日期: SQL:2023=2023；2502.01295=2025-02-03
- 原文摘录: 2502.01295 "it was developed with liaisons to the GQL and SQL/PGQ standardization committees and is currently being used as a basis for extending these standards."；PG-Schema 论文 "reflecting and extending work on SQL/PGQ schemas (9075-16 2022 ...)"
- 等级: B（Wikipedia/Crossref 元数据）；ISO 页未核

### K17 — 状态机：无内建转换规则/触发器原语；PG-Triggers 是研究论文非标准
- 论断：EBNF 与论文正文均无触发器、时序或状态转换规则构造；PG-Triggers（SIGMOD 2024 Companion）证明"触发器"方向有研究，但不属于 PG-Schema 或 GQL 标准。
- URL: https://doi.org/10.1145/3626246.3653386 ；EBNF https://github.com/domel/pgschema/blob/main/ebnf/pgs.ebnf
- 标题: PG-Triggers: Triggers for Property Graphs（SIGMOD/PODS 2024 Companion）；pgs.ebnf
- 机构: ACM（Crossref 元数据）；domel/pgschema
- 日期: 2024（Crossref 元数据）；EBNF 抓取 2026-08-12
- 原文摘录: Crossref 元数据：title "PG-Triggers: Triggers for Property Graphs"；container "Companion of the 2024 International Conference on Management of Data"（全文未核）；EBNF 全文扫描未见 trigger/transition/sequence 类产生式（"未发现"陈述）
- 等级: B（Crossref 元数据）；"EBNF 无转换规则"为 A 级原文事实 + C 级推断

### K18 — openCypher schema 约束历史：Cypher schema constraints proposal（2016/2017）
- 论断：openCypher 社区早在 2016-12 就有 schema 约束语法提案（CIP2016-12-16，Mats Rydberg），2017-02 在首次 openCypher Implementers Meeting 汇报；LDBC 2023-04 以 OAEP-2023-03 公开——是属性图 schema 约束方向的早期候选/背景。
- URL: https://ldbcouncil.org/resources/publications/ldbc-oaep/oaep-2023-03/ ；DOI https://doi.org/10.54285/ldbc.KKHM1756
- 标题: Cypher schema constraints proposal（OAEP-2023-03）
- 机构: openCypher 社区 / LDBC（2023-04 公开；Apache License 2.0）
- 日期: 原文档 2016-12-16（CIP）；2017-02-08（oCIM 1 演示）；公开 2023-04
- 原文摘录: "Cypher schema constraints proposal CIP2016-12-16 'Constraints syntax', Mats Rydberg" / "First openCypher Implementers Meeting (oCIM 1) - 8 February 2017 SAP Walldorf, Germany"
- 等级: A（PDF 全文 10 页文本到手）

## 3 冲突与张力

1. **"consolidates PGSWG" vs 封闭起点**：PG-Schema 论文自称整合并扩展 PGSWG 讨论，但 2020-06-12 GS-Basic 明确"limited to closed schemas and closed types"（every vertex/edge/attribute must be justified），且把"如何引入 open types"列为开放问题；2022/2023 PG-Schema 则把 OPEN/LOOSE 纳入语法。即"封闭优先 → 开放纳入"是一条演进线，文献内部存在阶段差异（A 级原文互证）。
2. **ENUM 的"核心 vs 扩展"张力**：M08 需要"属性类型枚举"，但原始论文把 `ENUM(...)` 放在 §5.3"Possible Extensions"（非核心语法），domel EBNF 的 propertyType 也只是一个类型名；直到 K-CAP 2025（PG-Schema-PC）才形式化属性集约束，且那是研究论文不是标准。→"属性枚举可表达"的断言必须限定为"扩展/研究层面可表达"。
3. **"9+other"的命题语义分歧**：`STRICT` + 9 个显式标签表达"封闭枚举（9 之外禁止）"；"9 个显式标签 + OPEN"表达"9 之外任意 other 允许"。两者在"other 是否允许"上互补，但 **OPEN 的 other 是任意值**，若要求 other 也受控（例如 other 也必须是某枚举/有类型），核心语法无此原语，只能应用层——"9+other"需求的精确语义决定可表达性，任务卡未定义 other 是否受控。
4. **GQL 术语冲突**：PG-Schema 论文脚注明确 GQL 的 "GQL-schema" 指 catalog 字典（graphs/graph types/procedures），不是约束型 schema；GQL v1 的 "graph types" 与 PG-Schema 的 "graph type"（STRICT/LOOSE 语义）同名不同义。跨分支引用时容易混淆。
5. **标准化的"承诺 vs 现状"**：论文（2022）预期 GQL v2 会有 rich DDL、WWW'25（2025-02）称 PG-Schema "is currently being used as a basis for extending these standards"，但截至快照日 **GQL v2 尚未发布、LEX 仍在进行**——"PG-Schema 将进 GQL"是进行时，不是既成事实。
6. **校验复杂度 vs 工程可校验性**：2606.06127 证明无完整性约束的图类型校验 combined NP-complete；这与"属性图 schema 校验器应可高效落地"的工程预期存在张力，也部分解释了为何工具链只有语法层实现。
7. **状态机的"可表达"边界**：静态状态枚举（边标签联合/属性值域）可表达，但 M08 需要的"转换规则（审计晋升时序）"无标准语义；PG-Triggers 研究论文的存在说明社区已意识到缺口，但"研究有 = 标准支持"不成立（推断 C 明确区分）。

## 4 未决

1. **ISO 官网页面未核**：https://www.iso.org/standard/76120.html（GQL）与 https://www.iso.org/standard/79473.html（SQL/PGQ）本次抓取均 403，标准文本未到手；GQL 发布事实以 LDBC 公告（A）与 Wikipedia（B）佐证。
2. **ldbc/pg-schema-spec 仓库存续未核**：GitHub 检索该仓库名 2026-08-12 未成功（API 403/连接重置），无法确认是否存在官方规范仓库；若存在也未能核验内容。
3. **GQL v2 是否采用 PG-Schema/LEX 设计**：截至快照日无 WG3 最终决议公开证据；LEX 章程显示工作"进行中"。
4. **PG-Schema 标准校验器**："未发现"而非"确认不存在"；2606.06127 是理论论文，domel/pgschema 与 pgs-grammar-check 只覆盖语法层。
5. **"9+other"中 other 的受约束性**：任务卡未定义 other 是否受白名单/类型约束；不同解读下可表达性结论不同（OPEN 仅覆盖"任意 other"）。
6. **PG-Schema-PC 全文**：K-CAP 2025 论文只有 Crossref 元数据与摘要级证据，全文未核；其语法与 domel EBNF 的兼容性未核。
7. **PG-Triggers 细节**：仅 Crossref 元数据（标题/会议/年份），论文内容、与 PG-Schema 的关系、是否有进入 LEX/GQL 的讨论均未核。

## 5 来源清单

### 学术论文（5）
1. PG-Schema: Schemas for Property Graphs — https://arxiv.org/abs/2211.10962 — arXiv/ACM PACMMOD — v1 2022-11-20, v4 2023-07-08；PACMMOD 2023-06 — 学术 — A（ar5iv 全文 103KB）
2. PG-Schema: Schemas for Property Graphs（正式版）— https://doi.org/10.1145/3589778 — ACM PACMMOD Vol.1 No.2 — 2023-06（Crossref created 2023-06-20）— 学术/书目 — A（Crossref 元数据）
3. Common Foundations for SHACL, ShEx, and PG-Schema — https://arxiv.org/abs/2502.01295 — arXiv（WWW '25，DOI 10.1145/3696410.3714694）— 2025-02-03 — 学术 — A（ar5iv 全文 201KB）
4. Validation of graph databases against PG-Schema — https://arxiv.org/abs/2606.06127 — arXiv（Univ. Warsaw/TU Wien/Univ. Białystok）— 2026-06-04 — 学术 — A（ar5iv 全文 36KB）
5. On Property Constraints in PG-Schema（PG-Schema-PC）— https://doi.org/10.1145/3731443.3771349 — ACM K-CAP 2025 — 2025（Crossref created 2025-12-09）— 学术/书目 — B（元数据+摘要，全文未核）

### LDBC/GDC 官方文档与工作组页（7）
6. LDBC Property Graph Schema contributions to WG3（OAEP-2023-04，GS-Basic）— https://ldbcouncil.org/resources/publications/ldbc-oaep/oaep-2023-04/ ；DOI https://doi.org/10.54285/ldbc.OFJF3566 — LDBC — 文档 2020-06-12 / 公开 2023-04 — 官方工作文档 — A（PDF 232 页文本）
7. LDBC Extended GQL Schema (LEX) Work Charter 1.1（WC-2023-01）— https://ldbcouncil.org/resources/publications/ldbc-wc/wc-2023-01/ ；DOI https://doi.org/10.54285/ldbc.SSIF9351 — LDBC — 2023-10-16 — 官方工作章程 — A（PDF 全文）
8. Introduction to GQL Schema design（OAEP-2023-02，LEX-014）— https://ldbcouncil.org/resources/publications/ldbc-oaep/oaep-2023-02/ ；DOI https://doi.org/10.54285/ldbc.EPWQ6741 — Neo4j/LDBC — 原 2019-10 / 公开 2023-04 — 官方外部论文 — A（PDF 全文）
9. SQL/PGQ data model and graph schema（OAEP-2023-01）— https://ldbcouncil.org/resources/publications/ldbc-oaep/oaep-2023-01/ — Neo4j SQL WG/LDBC — 原 2018 / 公开 2023-04 — 官方外部论文 — A（PDF 全文 48 页）
10. Cypher schema constraints proposal（OAEP-2023-03）— https://ldbcouncil.org/resources/publications/ldbc-oaep/oaep-2023-03/ ；DOI https://doi.org/10.54285/ldbc.KKHM1756 — openCypher/LDBC — 原 2016-12-16 / 公开 2023-04 — 官方外部论文 — A（PDF 全文 10 页）
11. Property Graph Schema Working Group (PGSWG) 页 — https://ldbcouncil.org/gql-community/pgswg/ — LDBC/GDC — 抓取 2026-08-12 — 官方工作组页 — A
12. LDBC Extended GQL Schema (LEX) Working Group 页 — https://ldbcouncil.org/gql-community/lex/ — LDBC/GDC — 抓取 2026-08-12 — 官方工作组页 — A

### 工程仓库与包（6）
13. domel/pgschema（PG-Schema Grammar 0.3）README — https://github.com/domel/pgschema — Tomaszuk/社区（MIT）— 抓取 2026-08-12 — 工程 — A
14. domel/pgschema EBNF（pgs.ebnf）— https://github.com/domel/pgschema/blob/main/ebnf/pgs.ebnf — 同上 — 抓取 2026-08-12 — 工程/语法 — A
15. domel/pgschema 示例 FraudGraphType.pgs / CatalogGraphType.pgs — https://github.com/domel/pgschema/tree/main/examples — 同上 — 抓取 2026-08-12 — 工程/示例 — A
16. Zenodo 记录 domel/pgschema: PG-Schema Grammar 0.3 — https://doi.org/10.5281/zenodo.7362078 — Zenodo — 2022-11-25 — 工程/归档 — A
17. opengql/grammar README（GQL ANTLR grammar）— https://github.com/opengql/grammar — Open GQL/LDBC 系 — 抓取 2026-08-12 — 工程 — A
18. LDBC Open-Source GQL Tools 公告 — https://ldbcouncil.org/gql-community/opengql-announce/ — LDBC（Alastair Green）— 2024-05-09 — 官方公告 — A

### 书目/二手（4）
19. Wikipedia: Graph Query Language — https://en.wikipedia.org/wiki/Graph_Query_Language — Wikipedia — 抓取 2026-08-12（记载 2024-04-12 发布）— 二手 — B
20. Wikipedia: SQL:2023 — https://en.wikipedia.org/wiki/SQL:2023 — Wikipedia — 抓取 2026-08-12 — 二手 — B
21. Crossref API 记录（PG-Schema PACMMOD / PG-Keys / PG-Triggers / PG-Schema-PC / PG-FD / Repairing PG under PG-Constraints）— https://api.crossref.org/works/... — Crossref — 2026-08-12 实查 — 书目 — B
22. damianw27/pgs-grammar-check — https://doi.org/10.5281/zenodo.7344227 — Zenodo（经 PG-Schema 论文参考文献列出）— 2022-11 — 书目 — B（仅论文书目证据，仓库未单独核验）

### 未核（3，不计入可核来源）
23. ISO/IEC 39075:2024（GQL）— https://www.iso.org/standard/76120.html — ISO — 403 未核
24. ISO/IEC 9075-16:2023（SQL/PGQ）— https://www.iso.org/standard/79473.html — ISO — 403 未核
25. ldbc/pg-schema-spec（候选规范仓库）— https://github.com/ldbc/pg-schema-spec — GitHub — 2026-08-12 检索 403/连接重置 — 未核

## 6 判死自查

- **可核来源 ≥15**：可核来源 22 个（学术 5 + LDBC/GDC 官方 7 + 工程 6 + 书目/二手 4）✓（22 ≥ 15）
- **原文到手 ≥10**：A 级原文到手 17 个——arXiv×3（2211.10962/2502.01295/2606.06127 全文）、OAEP×4（2023-01/02/03/04 PDF 文本）、LEX 章程全文、PGSWG 页、LEX 页、opengql 公告、opengql/grammar README、Zenodo 页、domel README、domel EBNF、domel 示例×2 ✓（17 ≥ 10）
- **来源类型 ≥3**：学术论文（1–5）、LDBC/GDC 官方文档与工作组页（6–12）、工程仓库/包（13–18）、书目/二手（19–22）——4 类 ✓
- **候选逐一查证 ≥5**：① PG-Schema 论文（arXiv/PACMMOD/Crossref）；② LDBC PGSWG 与 OAEP-2023-04（GS-Basic 全文）；③ LEX 工作组与章程（全文）；④ domel/pgschema 语法仓库（README/EBNF/示例/Zenodo）；⑤ GQL 标准状态（LDBC 公告/Wikipedia/ISO 未核）；⑥ opengql/grammar（README）；⑦ ldbc/pg-schema-spec（未核 403）；⑧ openCypher schema 约束（OAEP-2023-03 全文）；⑨ 2606.06127 校验复杂度论文（全文）；⑩ K-CAP 2025 PG-Schema-PC（Crossref 元数据）；⑪ PG-Triggers（Crossref 元数据）——11 组 ✓
- **关键词 ≥4 组**：①"PG-Schema" specification（arXiv/DuckDuckGo/Bing 检索）；②PG-Schema property graph schema language specification（LDBC OAEP/Zenodo）；③property graph schema constraints enumeration / 属性图 标签 枚举 校验（EBNF labelSpec/FraudGraphType/K-CAP）；④GQL schema language PG-Schema / GQL schema 语言（LEX 章程/GQL Wikipedia/opengql）；⑤property graph validation tooling / PG-Schema validator（2606.06127/domel/opengql grammar）；⑥openCypher schema constraints（OAEP-2023-03）——6 组 ✓
- **禁止项**：未比较厂商（论文作者机构仅作归属说明）；未做性能评测；SHACL/ShEx 仅作为共性论文（2502.01295）的原文引用出现，未做 SHACL/ShEx 分析（归 B5）；未捏造来源——ISO 页 403、ldbc/pg-schema-spec 403、GQL v2 无公开决议、PG-Schema-PC/PG-Triggers 仅元数据等均如实写"未核/未发现"；推断项（"9+other"的 OPEN 等价、状态机转换规则需应用层、无标准校验器）全部标 C。

