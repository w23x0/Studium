# B1 分支调研：RDF 数据模型、序列化与 SPARQL 对个人知识图谱的适配性

- 任务卡：B1（RDF/语义网系）
- 调研日期：2026-08-12
- 环境：Windows + PowerShell；网络检索（DuckDuckGo HTML / Bing / Crossref / arXiv / Springer）+ 原文抓取（curl.exe / Invoke-WebRequest）
- 原文缓存：`%TEMP%\rdf_research\`（工作区外临时目录，未改动工作区其他文件）
- 边界声明：本体语言→B5；时间版本（M09 多版本语义）→B4；工程先例落地→B6。本分支只做数据模型/序列化/查询表达力层面的适配性核验，不越界。

---

## 0 一句话结论

RDF 数据模型 + 序列化（Turtle/N-Triples/N-Quads/TriG/JSON-LD/RDF-XML）+ SPARQL 可以把本方案的不变量层/表示层节点、跨层对齐边、锚点逐字字符串、封闭边词表（9 类+other）与"边挂候选池状态"在 RDF 1.2（CR/WD 阶段）下近乎无损地建模——边属性由 triple term/reifier（`rdf:reifies` + 注解三元组）与命名图承接，锚点判等须"先解析还原转义再按 term 判等"（不能对序列化文件直接 grep -F，Canonical N-Triples 可强化确定性），N-Quads 按行追加天然合法且可作 append-only 日志载体；但"节点身份=锚点集合"与"跨时间版本查询"没有原生构造，需应用层编码/约定，且 RDF-star→RDF 1.2 全部关键机制尚处 CR/WD、未达 REC。

---

## 1 逐条回答（问题 1–5）

### 问题 1：RDF 数据模型（三元组/四元组、命名图）能否无损表达五类构造？

| 目标构造 | 能否无损表达 | 建模方式 / 说明 |
|---|---|---|
| 不变量层与表示层节点 | 可表达（语义分层属应用层） | RDF 1.1 三元组 subject/object 可为 IRI 或 blank node（RDF11 Concepts §3.1）；"层"无内置语义，需自定 IRI/词表（如 `:layer/invariant`、`:layer/representation` + `rdf:type`）区分两类节点。表达层面无损，分层解释在应用层。 |
| 跨层对齐边 | 可表达（边本身无属性） | 普通三元组（谓词 IRI）即可；RDF 谓词必须是 IRI，三元组是集合元素、不带属性——"边挂数据"见下两行。 |
| 节点身份=锚点集合（锚点=逐字字符串） | 不可直接表达（需应用层编码） | RDF 节点身份只有 IRI / literal / blank node /（1.2）triple term 四类（RDF12 Concepts §1.1）。"身份=若干逐字字符串锚点的集合"不是原生构造；可行编码：为每个锚点建 `:hasAnchor "..."` 三元组 + 用规范化串（如排序拼接）映射为 IRI，或借用 reification/triple term 承载。RDF 1.2 triple term 只能引用三元组，不表示"锚点集合身份"。 |
| 封闭边词表 9 类+other | 数据模型不可原生强制；校验层可表达 | RDF 数据模型不禁止任何谓词（开放世界、可加任意 IRI 谓词）；SHACL `sh:closed` + `sh:ignoredProperties` 可在校验层强制"仅允许列出的谓词"（SHACL §4.8.1 示例）。强制力落在校验器，不在数据模型。 |
| 边挂候选池状态字段 | 1.1 间接可表达；1.2 紧凑可表达 | RDF 1.1：标准 reification（rdf:Statement + rdf:subject/predicate/object）或中间节点/命名图。RDF 1.2：triple term + `rdf:reifies` + reifier（triple annotation），SPARQL 1.2 官方示例 `:myreifier rdf:reifies ?tt . :myreifier :tripleAdded ?date` 直接把"日期/阶段/证据/置信度"挂到 reifier 上。 |

### 问题 2：SPARQL 1.1/1.2 对三类查询的表达能力

1. **沿锚点做逐字匹配**：SPARQL 1.1 提供 term 级判等 `sameTerm` / `RDFterm-equal` 与 `FILTER`、`regex`（对 literal lexical form 做正则）。注意三点：(a) literal 与 IRI 是不同 term（"http://x" 作为 IRI 与作为 literal 不相等，RDF11 Concepts §3.1）；(b) 没有 "grep -F" 原语，固定串匹配需自行转义后写正则或用 `STRSTARTS`/`CONTAINS` 组合；(c) 匹配发生在解析后的抽象 term 上，与文件级字节/字符 grep 语义不同（见问题 4）。
2. **机械信号定向类统计**：标准能力。度分布 = property paths + `COUNT`/`GROUP BY` 聚合；孤立节点 = `FILTER NOT EXISTS`（SPARQL 1.1 §8.1.2 有官方示例）；词表外用法计数 = `FILTER` 排除已知 9+1 谓词后 `COUNT`。全部可在 SPARQL 1.1 内表达，无需扩展。
3. **跨时间快照查询（M09 多版本）**：无原生时态机制，需应用层/命名约定。RDF 1.2 Concepts §1.6 明确"RDF abstract data model is atemporal: RDF graphs are static snapshots"；SPARQL 1.1/1.2 均无时态算子（SPARQL 1.2 的 NOW() 只是取值函数，非快照版本语义）。可行路径：每个快照放一个命名图（GRAPH/FROM NAMED 按图选择），版本选择规则、时间轴语义落在应用层查询模板/约定；标准化层面 SPARQL 1.2 仍为 WD，未引入版本化查询语法。→ 版本化查询需扩展或落到应用层（时间版本语义归 B4）。

### 问题 3：RDF-star / RDF 1.2 quoted triple 能否给单条边附加证据/出处/置信元数据？

- **可以**。RDF 1.2 Concepts（CR Snapshot 2026-04-07）定义 triple term、reifying triple（谓词为 `rdf:reifies`、宾语为 triple term）、reifier、triple annotation（断言三元组 + 以 reifier 为主语的注解三元组）；SPARQL 1.2 Query（WD 2026-06-25）示例 `:myreifier rdf:reifies ?tt . :myreifier :tripleAdded ?date` 直接演示给单条边附加日期。证据/出处/置信度/阶段均可作为 reifier 的属性挂载。
- **标准化状态**：RDF-star and SPARQL-star 是 W3C RDF-DEV 社区组 Final Report（2021-12-17），明确"不是 W3C 标准、不在标准轨道"；其后 RDF 1.2 工作组将其吸收为 RDF 1.2 Concepts（CR Snapshot 2026-04-07）与 SPARQL 1.2 Query（WD 2026-06-25），RDF 1.2 N-Triples/N-Quads/Turtle（WD 2026-07）——均未达 REC，特性可能变动。
- **重要张力**：CG 报告 §B.2 承认"seminal example 不成立"：`<<:bob foaf:age 23>> dct:creator ... ; dct:source ...` 当存在多个 creator/source 时无法区分哪个 source 对应哪个 creator，必须显式 occurrence 节点；quoted triple 不表示 occurrence。RDF 1.2 用 reifier 承接该需求（"There can be multiple, distinct reifiers related to the same abstract proposition, such as statements with different sources"），但最终建模指引仍随规范未冻结。

### 问题 4：锚点硬校验（逐字 grep -F）与序列化转义/规范化

- **转义会破坏"对文件逐字匹配"**：Turtle/N-Triples 都允许 UCHAR（`\uXXXX`/`\UXXXXXXXX`）与 ECHAR（`\t \b \n \r \f \" \' \\`），解析后还原为 Unicode 字符；同一抽象 literal 可有多种 surface 写法（`"\u0041"` 与 `"A"` 是同一 lexical form）。因此对序列化文件直接做字节/字符级 grep -F ≠ 抽象 term 判等：必须先解析并还原转义，再按 literal term equality（lexical form、datatype、language tag 逐字符比较，RDF11 Concepts §3.3）比较。
- **Unicode 规范化**：RDF 1.1 Concepts §3.3 说 lexical form "SHOULD be in Normal Form C [NFC]"（非 MUST）；RDF 1.2 Concepts 变更记录明确 "removes obsolete recommendations for the use of Normalization Form C in literals"。grep -F 不做 NFC。→ 锚点判等是否以 NFC 为前置是应用层决策，标准层未强制。
- **N-Triples 确定性是否强于 Turtle**：是，但限于 Canonical 形态。RDF 1.1 N-Triples §4（Canonical N-Triples）规定单空格、禁 UCHAR、限定 ECHAR、HEX 大写、无注释；RDF 1.2 N-Triples §3 明确 canonical form "provides a unique syntactic representation of any triple"，并规定 Canonical 文档禁 VERSION 指令、`xsd:string` 不带 datatype IRI、EOL 用 LF。Turtle 因前缀缩写/@base/集合/数字字面量糖存在更多表示歧义，确定性弱。注意：canonical 是对文档形态的额外约束（1.1 为"鼓励产出"，1.2 仅对 conforming Canonical document 强制），不是数据模型层保证——不能假设任意 Turtle/N-Triples 文件都满足逐字确定性。

### 问题 5：N-Quads 与 append-only 追加写入

- **追加行天然合法**：N-Quads 1.1 文法 `nquadsDoc ::= statement? (EOL statement)* EOL?`，`statement ::= subject predicate object graphLabel? '.'`，每条 statement 独立成行；把新行追加到现有文档末尾整体仍符合文法，且行间顺序对语义无要求（RDF dataset 本质是集合）。行内 literal 中的 LF/CR 必须转义（ECHAR/UCHAR），因此"一行=一个 statement"成立。
- **与 JSONL 现状的差异（事实性对照，不预设优劣）**：JSON Lines 同样支持逐行追加（每行一个合法 JSON 值、行终止符 `\n`、空行非法、UTF-8）。N-Quads 侧差异：无包裹对象/逗号/键结构，schema 语义在谓词 IRI 而非文档层；graph label 可携带来源/快照/池标识；RDFC-1.0（REC 2024-05-21）定义 Canonical N-Quads（"unique syntactic representation of any quad"），利于确定性 diff；RDF literal 转义规则简单明确，JSON 字符串嵌套转义层级更深。工程先例：RDF Patch / RDF Delta 以行式 N-Triples-like 变更日志记录追加/删除（README 标注项目将归档）。
- **检索核验**：直接检索 "N-Quads append-only log"（DuckDuckGo/Bing）未获有效第三方来源（中文广告污染/限流），该论点由文法原文推导 + 工程文档对照支撑，第三方直接来源记"未核"。

---

## 2 关键发现

> 证据等级：A = 原文到手（已抓取全文/原文页面）；B = 仅摘要/元数据/二手；C = 基于 A/B 的推断并标注依据。

### A 级（原文到手，26 条）

**F1. [A] RDF 三元组结构与"边无属性"**
- 论断：三元组 subject=IRI 或 blank node，predicate=IRI，object=IRI/literal/blank node；谓词是唯一承载关系类型的元素，边本身不能直接挂属性。
- 来源：https://www.w3.org/TR/rdf11-concepts/（RDF 1.1 Concepts and Abstract Syntax）
- 机构/日期：W3C，2014-02-25（W3C Recommendation）
- 原文摘录："An RDF triple consists of three components: the subject, which is an IRI or a blank node; the predicate, which is an IRI; the object, which is an IRI, a literal or a blank node."

**F2. [A] RDF 图=三元组集合；节点集=subject/object**
- 论断：RDF 图是三元组集合；图的节点集是图中三元组的 subject 与 object（谓词 IRI 也可作为节点出现）。
- 来源：https://www.w3.org/TR/rdf11-concepts/
- 机构/日期：W3C，2014-02-25
- 原文摘录："An RDF graph is a set of RDF triples. … The set of nodes of an RDF graph is the set of subjects and objects of triples in the graph."

**F3. [A] IRI 判等=简单字符串比较，禁止进一步规范化**
- 论断：IRI 相等即简单字符串比较，明确"不得再做规范化"；这保证以 IRI 为身份的节点判等是逐字符的。
- 来源：https://www.w3.org/TR/rdf11-concepts/
- 机构/日期：W3C，2014-02-25
- 原文摘录："Two IRIs are equal if and only if they are equivalent under Simple String Comparison according to section 5.1 of [RFC3987]. Further normalization MUST NOT be performed when comparing IRIs for equality."

**F4. [A] literal term equality=lexical form/datatype/language tag 逐字符**
- 论断：literal 判等按 lexical form、datatype IRI、language tag 逐字符比较；不同 surface 写法还原后同一 term，值相同但 term 不同仍不等（如 "1"^^xs:integer 与 "01"^^xs:integer）。
- 来源：https://www.w3.org/TR/rdf11-concepts/
- 机构/日期：W3C，2014-02-25
- 原文摘录："Two literals are term-equal (the same RDF literal) if and only if the two lexical forms, the two datatype IRIs, and the two language tags (if any) compare equal, character by character."

**F5. [A] 命名图：图名 IRI/blank node + RDF graph；dataset=default + named graphs**
- 论断：命名图是"图名 + RDF 图"的对；RDF dataset 由一个默认图与零或多个命名图组成，图名在 dataset 内唯一。
- 来源：https://www.w3.org/TR/rdf11-concepts/
- 机构/日期：W3C，2014-02-25
- 原文摘录："Each named graph is a pair consisting of an IRI or a blank node (the graph name), and an RDF graph. … Zero or more named graphs. Graph names are unique within an RDF dataset."

**F6. [A] RDF 1.2：节点类型扩为四类（含 triple term）**
- 论断：RDF 1.2 抽象模型仍是三元组集合，但元素可含 triple term；节点类型为 IRI/literal/blank node/triple term。
- 来源：https://www.w3.org/TR/rdf12-concepts/（RDF 1.2 Concepts and Abstract Data Model）
- 机构/日期：W3C，2026-04-07（Candidate Recommendation Snapshot）
- 原文摘录："RDF graphs are sets of subject-predicate-object triples, where the elements may be IRIs, blank nodes, datatyped literals, or triple terms."

**F7. [A] RDF 1.2 atemporal：图=静态快照；source 可变、dataset 可装多源快照**
- 论断：RDF 数据模型无时间维度；RDF source 状态可随时间变化并提供不同图；某些 source 可作另一 source 的不可变快照；dataset 的一种用途是容纳多个 RDF source 的快照。
- 来源：https://www.w3.org/TR/rdf12-concepts/
- 机构/日期：W3C，2026-04-07（CR Snapshot）
- 原文摘录："The RDF abstract data model is atemporal: RDF graphs are static snapshots of information. … RDF sources may change their state over time. That is, they may provide different RDF graphs at different times. Some RDF sources may, however, be immutable snapshots of another RDF source, archiving its state at some point in time."

**F8. [A] RDF 1.2：triple term / rdf:reifies / reifier / triple annotation / 多 reifier 对应多来源**
- 论断：RDF 1.2 用 triple term + `rdf:reifies` + reifier 表达"关于语句的语句"；多个不同 reifier 可对应同一抽象命题的不同来源/情境；reifier（而非 triple term）用于后续陈述。
- 来源：https://www.w3.org/TR/rdf12-concepts/
- 机构/日期：W3C，2026-04-07（CR Snapshot）
- 原文摘录："A triple term is an RDF triple used as an RDF term within another triple. … A reifying triple is a triple where the predicate is rdf:reifies and the object is a triple term. … There can be multiple, distinct reifiers related to the same abstract proposition, such as statements with different sources, or situations with different characteristics."

**F9. [A] N-Triples 1.1：line-based；文法=逐行三元组，追加合法**
- 论断：N-Triples 是行式纯文本格式，文法 `ntriplesDoc ::= triple? (EOL triple)* EOL?`；文档由 EOL 分隔的三元组行组成，末尾可选 EOL——逐行追加后整体仍合法。
- 来源：https://www.w3.org/TR/n-triples/（RDF 1.1 N-Triples）
- 机构/日期：W3C，2014-02-25
- 原文摘录："N-Triples is a line-based, plain text format for encoding an RDF graph. … ntriplesDoc ::= triple? (EOL triple)* EOL?"

**F10. [A] N-Triples 1.1 Canonical：单空格、禁 UCHAR、限定 ECHAR、HEX 大写**
- 论断：Canonical N-Triples 消除表示歧义：禁止 UCHAR、仅允许在限定字符上用 ECHAR、HEX 大写、布局单空格。
- 来源：https://www.w3.org/TR/n-triples/
- 机构/日期：W3C，2014-02-25
- 原文摘录："Characters MUST NOT be represented by UCHAR. … Within STRING_LITERAL_QUOTE, U+0022, U+005C, U+000A, U+000D are encoded using ECHAR. … HEX MUST use only uppercase letters ([A-F])."

**F11. [A] RDF 1.2 N-Triples canonical：唯一语法表示，禁 VERSION 指令、xsd:string 不带 datatype**
- 论断：RDF 1.2 将 canonical form 定义为"任意三元组的唯一语法表示"；Canonical 文档不得含 VERSION 指令，`xsd:string` 字面量不写 datatype IRI。
- 来源：https://www.w3.org/TR/rdf12-n-triples/（RDF 1.2 N-Triples）
- 机构/日期：W3C，2026-07-23（Working Draft）
- 原文摘录："the canonical form of N-Triples provides a unique syntactic representation of any triple. Each code point can be represented by only one of UCHAR, ECHAR, or unencoded character. … A Canonical N-Triples document MUST NOT include a VERSION directive. … Literals with the datatype http://www.w3.org/2001/XMLSchema#string MUST NOT use the datatype IRI part of the literal."

**F12. [A] N-Quads 1.1：line-based；statement 每行一个；graphLabel 可省略；不支持空图**
- 论断：N-Quads 是行式 RDF dataset 语法；文法 `nquadsDoc ::= statement? (EOL statement)* EOL?`、`statement ::= subject predicate object graphLabel? '.'`；省略 graphLabel 即默认图；不能序列化空命名图。
- 来源：https://www.w3.org/TR/n-quads/（RDF 1.1 N-Quads）
- 机构/日期：W3C，2014-02-25
- 原文摘录："N-Quads is a line-based, plain text format for encoding an RDF dataset. … nquadsDoc ::= statement? (EOL statement)* EOL? … The graph label IRI can be omitted, in which case the triples are considered part of the default graph of the RDF dataset. … N-Quads documents do not provide a way of serializing empty graphs."

**F13. [A] RDFC-1.0：Canonical N-Quads=任意 quad 的唯一语法表示**
- 论断：RDF Dataset Canonicalization（RDFC-1.0）附录 A 定义 Canonical N-Quads，扩展 Canonical N-Triples 到 graphLabel，并给出空白节点规范标签。
- 来源：https://www.w3.org/TR/rdf-canon/（RDF Dataset Canonicalization, RDFC-1.0）
- 机构/日期：W3C，2024-05-21（W3C Recommendation）
- 原文摘录："Canonical N-Quads updates and extends Canonical N-Triples in [N-TRIPLES] to include graphLabel. … the canonical form of N-Quads provides a unique syntactic representation of any quad."

**F14. [A] Turtle 1.1：前缀/@base/集合/数字糖带来表示歧义**
- 论断：Turtle 是 RDF 图的文本语法（turtleDoc），支持前缀缩写、@base、列表、数字字面量糖；同一图可有多种 surface 写法，确定性弱于 Canonical N-Triples。
- 来源：https://www.w3.org/TR/turtle/（RDF 1.1 Turtle）
- 机构/日期：W3C，2014-02-25
- 原文摘录："A conforming Turtle document is a Unicode string that conforms to the grammar and additional constraints defined in section 6. Turtle Grammar, starting with the turtleDoc production. A Turtle document serializes an RDF Graph."

**F15. [A] TriG 1.1：RDF Dataset Language（命名图块）**
- 论断：TriG 是 RDF dataset 语法（Turtle 的 dataset 版，含命名图块），为"图=快照/来源"的分区序列化提供标准载体。
- 来源：https://www.w3.org/TR/trig/（RDF 1.1 TriG: RDF Dataset Language）
- 机构/日期：W3C，2014-02-25
- 原文摘录："RDF 1.1 TriG — RDF Dataset Language — W3C Recommendation 25 February 2014"（文档标题/状态行）。

**F16. [A] RDF/XML：XML 语法，映射到 N-Triples；含 reification 规则（§7.3）**
- 论断：RDF/XML 以 XML 编码 RDF 图，映射过程以 N-Triples 输出；语法含 Reification Rules（§7.3）。与行式格式相比，XML 树结构/命名空间带来额外表示层。
- 来源：https://www.w3.org/TR/rdf-syntax-grammar/（RDF 1.1 XML Syntax）
- 机构/日期：W3C，2014-02-25
- 原文摘录："This document defines the XML [XML10] syntax for RDF graphs. … The mapping to the RDF graph is done by emitting statements in the N-Triples [N-TRIPLES] format. … 7.3 Reification Rules."

**F17. [A] SPARQL 1.1：GRAPH 命名图查询、FILTER NOT EXISTS（官方孤立节点示例）、聚合、属性路径**
- 论断：SPARQL 1.1 可用 GRAPH 在命名图间切换查询；FILTER NOT EXISTS 官方示例即"找出没有名字的人"（孤立/缺失信号）；COUNT/GROUP BY/HAVING 聚合与属性路径（含任意长度）均为标准能力。
- 来源：https://www.w3.org/TR/sparql11-query/（SPARQL 1.1 Query Language）
- 机构/日期：W3C，2013-03-21（W3C Recommendation）
- 原文摘录："The GRAPH keyword is used to make the active graph one of all of the named graphs in the dataset for part of the query." / "FILTER NOT EXISTS { ?person foaf:name ?name }"（§8.1.2 官方示例）。

**F18. [A] SPARQL 1.2：TRIPLE/SUBJECT/PREDICATE/OBJECT/isTRIPLE + rdf:reifies 示例 + VERSION 指令**
- 论断：SPARQL 1.2（WD）提供 triple term 构造/拆解函数与 VERSION 指令；官方示例直接演示给单条边附加日期：`:myreifier rdf:reifies ?tt . :myreifier :tripleAdded ?date`。
- 来源：https://www.w3.org/TR/sparql12-query/（SPARQL 1.2 Query Language）
- 机构/日期：W3C，2026-06-25（Working Draft）
- 原文摘录："VERSION "1.2" PREFIX : <http://example/> … SELECT ?s ?date { ?s ?p ?o . BIND( <<( ?s ?p ?o )>> AS ?tt ) :myreifier rdf:reifies ?tt . :myreifier :tripleAdded ?date . }"（§4.3 附近示例）。

**F19. [A] RDF-star CG Final Report：非 W3C 标准；seminal example 不成立、需 occurrence 节点**
- 论断：RDF-star/SPARQL-star 最终社区组报告明确自身不在标准轨道；其 §B.2 承认著名的 provenance 示例（`:bob foaf:age 23` 挂 dct:creator/dct:source）在多个 creator/source 时无法区分对应关系，需显式 occurrence 节点；quoted triple 不代表 occurrence。
- 来源：https://www.w3.org/2021/12/rdf-star.html（RDF-star and SPARQL-star Final Community Group Report）
- 机构/日期：W3C RDF-DEV Community Group，2021-12-17
- 原文摘录："This specification was published by the RDF-DEV Community Group. It is not a W3C Standard nor is it on the W3C Standards Track." / "Although RDF-star can be used for provenance, the seminal example does not work as stated and can lead to the fundamentally incorrect interpretation that RDF-star can represent multiple distinct quoted triples with the same subject, predicate, and object. … Correctly capturing this information would require additional nodes to explicitly represent triple occurrences."

**F20. [A] SHACL sh:closed：封闭形状校验（仅允许列出谓词+ignoredProperties）**
- 论断：SHACL 可在校验层强制封闭词表：shape 置 `sh:closed true` 后，焦点节点使用未列出谓词即产生验证结果。
- 来源：https://www.w3.org/TR/shacl/（SHACL, Shapes Constraint Language）
- 机构/日期：W3C，2017-07-20（W3C Recommendation）
- 原文摘录："the shape ex:PersonShape has the property sh:closed set to true but ex:Calvin uses the property ex:birthDate which is neither one of the predicates from any of the property shapes of the shape, nor one of the properties listed using sh:ignoredProperties."（§4.8.1 示例说明）

**F21. [A] JSON-LD 1.1：JSON-based 序列化，W3C REC 2020**
- 论断：JSON-LD 1.1 是 W3C 推荐标准，定位为 Linked Data 的 JSON 序列化；JSON 语法（对象/数组/上下文）本身支持任意嵌套结构。
- 来源：https://www.w3.org/TR/json-ld11/（JSON-LD 1.1）
- 机构/日期：W3C，2020-07-16（W3C Recommendation）
- 原文摘录："JSON-LD 1.1 — A JSON-based Serialization for Linked Data — W3C Recommendation 16 July 2020"（标题/状态行）。

**F22. [A] Streaming JSON-LD（提案）：官方处理算法非流式，先全量载入内存**
- 论断：W3C JSON-LD 流式处理提案指出推荐处理算法不流式（先全量载入内存），大规模文档流式处理需专门设计。
- 来源：https://w3c.github.io/json-ld-streaming/（Streaming JSON-LD，编辑草案/提案）
- 机构/日期：W3C JSON-LD 社区（Ghent University – imec 主编），编辑草案（无 REC 轨道）
- 原文摘录："The recommended processing algorithms [[JSON-LD11-API]] do not work in a streaming manner, as these first load all required data in memory, after which this data can be processed."

**F23. [A] JSON Lines：每行一个合法 JSON 值、空行非法、UTF-8**
- 论断：JSON Lines 规定 UTF-8、每行一个合法 JSON 值、行终止符为 `\n`；空行不是合法值。逐行追加后整体仍合法。
- 来源：https://jsonlines.org/
- 机构/日期：jsonlines.org（格式说明页），访问于 2026-08-12
- 原文摘录："2. Each Line is a Valid JSON Value — e.g. null is a valid value but a blank line is not."

**F24. [A] RDF Patch / RDF Delta：行式变更日志工程先例（README 标注将归档）**
- 论断：RDF Delta 以 RDF Patch（N-Triples 风格行式格式）记录对 RDF dataset 的变更，用于复制、增量备份、记录变更；官方 README 明确标注项目将归档。
- 来源：https://github.com/afs/rdf-delta / https://afs.github.io/rdf-delta
- 机构/日期：Apache Jena 生态（Andy Seaborne 等），README 访问于 2026-08-12
- 原文摘录："** This project is going to be archived **" / "RDF Patch - a format for recording changes to an RDF Dataset".

**F25. [A] Carroll et al. 2005：命名图=出处/信任的形式化基础（全文到手）**
- 论断：命名图把 RDF 扩展为"可命名、可描述、可签名"的图，为出处与信任策略提供形式化框架——这是"边/图挂出处元数据"的经典学术依据。
- 来源：https://doi.org/10.1145/1060745.1060835（WWW2005）/ https://www.hpl.hp.com/techreports/2004/HPL-2004-57R1.html（HP TR HPL-2004-57R1）
- 机构/日期：Hewlett-Packard Labs / FU Berlin / IHMC / Nokia；WWW2005（2005-05-10/14），HP TR 2004
- 原文摘录（论文摘要，PDF 全文已抽取）："This paper extends the syntax and semantics of RDF to cover such Named Graphs. This enables RDF statements that describe graphs … information consumers can evaluate specific graphs using task-specific trust policies … The extension of RDF to Named Graphs provides a formally defined framework to be a foundation for the Semantic Web trust layer."

**F26. [A] Rupp et al. 2022：RDF-star 与命名图的元建模视角（全文到手）**
- 论断：RDF 元层（对语句的语句）存在多种建模方式（标准 reification、RDF-star、命名图）；RDF-star 可简化元数据建模，但复杂归属仍需中间资源。
- 来源：https://arxiv.org/abs/2211.16195（Easy and complex: new perspectives for metadata modeling using RDF-star and Named Graphs）
- 机构/日期：Florian Rupp, Benjamin Schnabel, Kai Eckert（HdM Stuttgart 等）；arXiv 2022-11-29
- 原文摘录（摘要）："There are, however, multiple ways in RDF to use a meta-level, i.e., to provide additional statements about statements. … shifting information to a meta-level can … (1) provide provenance information … (3) reduce the complexity of a data model."

### B 级（仅摘要/元数据，2 条）

**F27. [B] RSP-QL^star（2019）：流式+语句级注解的 RDF 流查询扩展（仅摘要/元数据页）**
- 论断：存在将 RDF-star 语句级注解引入流式/版本化 RDF 查询的研究（RSP-QL^star），证明"边注解+时间流"是活跃研究点；本调研仅获摘要页，未获全文。
- 来源：https://link.springer.com/chapter/10.1007/978-3-030-33220-4_11
- 机构/日期：Springer LNCS，2019
- 原文摘录（页面标题/摘要片段）："RSP-QL^star: Enabling Statement-Level Annotations in RDF Streams"（作者名单未从抓取页完整提取，不臆列）。
- 等级说明：仅元数据+摘要 → B。

**F28. [B] arXiv 1406.3399：RDF reification 的替代基础（摘要页）**
- 论断：Hartig & Thompson 提出兼容 RDF reification 的替代方法以承载 statement-level 元数据，是 RDF-star 的前身之一；仅摘要页到手。
- 来源：https://arxiv.org/abs/1406.3399
- 机构/日期：Olaf Hartig, Bryan Thompson；arXiv 2014-06-13（2021-12-16 修订）
- 原文摘录（摘要）："This document defines extensions of the RDF data model and of the SPARQL query language that capture an alternative approach to represent statement-level metadata … clarifies a means to … emphasize link attributes."
- 等级说明：摘要页 → B。

### C 级（基于 A/B 的推断，3 条）

**F29. [C] 封闭边词表（9 类+other）可由 SHACL sh:closed 表达，但非数据模型原生（推断）**
- 论断：结合 F1（RDF 不限制谓词）、F20（sh:closed 校验语义），"封闭边词表"可由一个 NodeShape 的 sh:closed+sh:ignoredProperties 表达，校验器外无强制力；数据模型层无法禁止未知谓词。
- 依据：F1、F20。等级 C（组合推断，两个前提均为 A 级原文）。

**F30. [C] "节点身份=锚点集合"需应用层编码（推断）**
- 论断：RDF 无"集合身份"原生类型（F6 四种节点）；将"锚点集合"映射为身份需应用层方案（如规范化排序拼接后作 IRI，或以 reifier/中间节点承载集合与成员关系），标准层不可直接表达。
- 依据：F4（逐字 literal 判等）、F6（节点类型）、F8（reifier 可承载复合结构）。等级 C。

**F31. [C] N-Quads 逐行追加=天然 append-only 日志；第三方直接来源未核（推断）**
- 论断：由 F12 文法（statement 每行、行间顺序无语义）+ F13（Canonical N-Quads 确定性）+ F23/F24（JSONL 与 RDF Delta 对照）推断：N-Quads 追加行天然合法且具备确定性 diff 前提。直接检索 "N-Quads append-only log" 未获有效第三方来源，该点无二手佐证。
- 依据：F12、F13、F23、F24。等级 C（检索缺口已如实标注）。

**F32. [C] 锚点逐字判等须"先解析还原转义，再按 term 判等"（推断）**
- 论断：由 F4（term 判等基准）、F9/F14（UCHAR/ECHAR 转义存在多重表示）、F10/F11（canonical 消除歧义）推断：对文件直接 grep -F 会因转义/表示歧义产生假阴性/假阳性；正确做法是解析后按 lexical form 判等；Canonical N-Triples 输出可把"文件级逐字"与"term 级逐字"对齐（前提是 canonical 约束被遵守）。
- 依据：F4、F9、F10、F11、F14。等级 C。

---

## 3 冲突与张力

1. **RDF-star 的"边属性简洁性"与其正式语义冲突**：CG 报告 §B.2 明确"seminal example 不成立"、quoted triple 不表示 occurrence；RDF 1.2 改由 reifier 承接多来源归属，但最终规范未冻结，建模指引仍在变动中（F8 vs F19）。
2. **NFC 建议在两版标准间漂移**：RDF 1.1 要求 lexical form "SHOULD be in NFC"，RDF 1.2 变更记录移除该建议——锚点逐字判等的 Unicode 规范化基准不稳定，应用层必须自定策略（F4/F10 与 RDF12 变更记录）。
3. **Canonical 确定性 vs 数据模型不保证文档形态**：canonical 是文档级可选约束（1.1"鼓励产出"、1.2 仅对 Canonical 文档强制），不能假设任意 Turtle/N-Triples 文件满足逐字确定性；"确定性更强"仅对 canonical 形态成立（F10/F11/F14）。
4. **atemporal 数据模型 vs 版本化需求**：RDF 1.2 明说图是静态快照、dataset 可容纳多源快照，但 SPARQL 1.1/1.2 无时态算子——快照可建模，版本化查询须应用层约定（F7/F17/F18；时间版本语义归 B4，本分支不展开）。
5. **JSONL 现状 vs N-Quads**：两者均支持逐行追加（F23/F12）；差异是事实性的（结构层级、schema 位置、graph label、canonical），本分支不预设 RDF 优于/劣于 JSONL 的结论（禁止项）。
6. **中文/特定检索缺口**：中文关键词（RDF-star 边属性标准、SPARQL 版本化查询、命名图出处）与英文 "SPARQL bitemporal query patterns"、"N-Triples canonical form literal escaping" 在 DuckDuckGo/Bing 命中 0 或极稀（Bing RSS 被中文广告污染、DDG 限流），无法形成中文二手证据链——相关结论全部来自 W3C/学术/工程一手原文（见 §6 自查）。

## 4 未决问题

1. RDF 1.2 / SPARQL 1.2 尚未定稿（CR Snapshot / WD）：triple term 语法、VERSION 指令、`rdf:reifies` 细节、Canonical 约束是否进 REC 均未冻结。
2. "边挂多条出处（多 creator/source）"的规范化建模指引：RDF 1.2 reifier 语义已能表达多来源，但官方是否给出 occurrence 模式的标准指引未见定稿（CG 报告仅承认问题、给出方向）。
3. 锚点 Unicode 规范化策略：RDF 1.2 移除 NFC 建议后，"锚点逐字判等"以何种规范化形式为基准（NFC/NFD/原样）悬而未决，需应用层拍板。
4. 跨时间快照查询无原生 SPARQL 机制：命名图+应用约定的可行性与一致性代价未在标准层解决（版本语义整体归 B4）。
5. N-Quads append-only 的直接工程先例证据不足："N-Quads append-only log" 检索未获有效第三方来源（未核）；RDF Delta 官方标注将归档，长期先例状态不明。
6. "节点身份=锚点集合"的应用层编码（规范化拼接/IRI 映射/reifier 承载）未形成公认模式，属设计开放问题。
7. SPARQL 1.2 的 VERSION 指令与 1.2-basic（无 triple term）分层对既有工具链的兼容影响未评估（本分支不做引擎/厂商对比）。

## 5 来源清单

### 5.1 W3C 标准/规范原文（17 项，均可核、原文到手）
| # | 来源 | 版本/日期 | 等级 |
|---|---|---|---|
| S1 | RDF 1.1 Concepts and Abstract Syntax — https://www.w3.org/TR/rdf11-concepts/ | REC 2014-02-25 | A |
| S2 | RDF 1.1 Turtle — https://www.w3.org/TR/turtle/ | REC 2014-02-25 | A |
| S3 | RDF 1.1 N-Triples — https://www.w3.org/TR/n-triples/ | REC 2014-02-25 | A |
| S4 | RDF 1.1 N-Quads — https://www.w3.org/TR/n-quads/ | REC 2014-02-25 | A |
| S5 | RDF 1.1 TriG — https://www.w3.org/TR/trig/ | REC 2014-02-25 | A |
| S6 | RDF 1.1 XML Syntax (RDF/XML) — https://www.w3.org/TR/rdf-syntax-grammar/ | REC 2014-02-25 | A |
| S7 | SPARQL 1.1 Query Language — https://www.w3.org/TR/sparql11-query/ | REC 2013-03-21 | A |
| S8 | JSON-LD 1.1 — https://www.w3.org/TR/json-ld11/ | REC 2020-07-16 | A |
| S9 | RDF 1.2 Concepts and Abstract Data Model — https://www.w3.org/TR/rdf12-concepts/ | CR Snapshot 2026-04-07 | A |
| S10 | SPARQL 1.2 Query Language — https://www.w3.org/TR/sparql12-query/ | WD 2026-06-25 | A |
| S11 | RDF 1.2 N-Triples — https://www.w3.org/TR/rdf12-n-triples/ | WD 2026-07-23 | A |
| S12 | RDF 1.2 N-Quads — https://www.w3.org/TR/rdf12-n-quads/ | WD 2026-07-23 | A |
| S13 | RDF 1.2 Turtle — https://www.w3.org/TR/rdf12-turtle/ | WD 2026-07-30 | A |
| S14 | RDF Dataset Canonicalization (RDFC-1.0) — https://www.w3.org/TR/rdf-canon/ | REC 2024-05-21 | A |
| S15 | SHACL — https://www.w3.org/TR/shacl/ | REC 2017-07-20 | A |
| S16 | RDF-star and SPARQL-star Final Community Group Report — https://www.w3.org/2021/12/rdf-star.html | CG 2021-12-17（非标准） | A |
| S17 | RDF 1.1 N-ary Relations (SWBP) — https://www.w3.org/TR/swbp-n-aryRelations/ | W3C Note 2006-02-12 | A |

### 5.2 学术论文（5 项）
| # | 来源 | 日期 | 等级 |
|---|---|---|---|
| S18 | Carroll, Bizer, Hayes, Stickler, "Named Graphs, Provenance and Trust", WWW2005 — https://doi.org/10.1145/1060745.1060835（PDF 全文到手） | 2005 | A |
| S19 | Rupp, Schnabel, Eckert, "Easy and complex: new perspectives for metadata modeling using RDF-star and Named Graphs", arXiv:2211.16195 — https://arxiv.org/abs/2211.16195（ar5iv 全文到手） | 2022 | A |
| S20 | "RSP-QL^star: Enabling Statement-Level Annotations in RDF Streams", Springer LNCS — https://link.springer.com/chapter/10.1007/978-3-030-33220-4_11（仅摘要/元数据） | 2019 | B |
| S21 | Hartig & Thompson, "Foundations of an Alternative Approach to Reification in RDF", arXiv:1406.3399 — https://arxiv.org/abs/1406.3399（摘要页） | 2014/2021 | B |
| S22 | HP Labs HPL-2004-57R1（即 Carroll et al. 的 HP 技术报告页，Named Graphs, Provenance and Trust）— https://www.hpl.hp.com/techreports/2004/HPL-2004-57R1.html（摘要页；全文同 S18） | 2004 | B（摘要页）/A（全文经 S18） |

### 5.3 工程文档/先例项目（3 项）
| # | 来源 | 日期 | 等级 |
|---|---|---|---|
| S23 | RDF Delta / RDF Patch（Apache Jena 生态）— https://github.com/afs/rdf-delta 、https://afs.github.io/rdf-delta（README 全文到手；官方标注将归档） | 访问于 2026-08-12 | A |
| S24 | JSON Lines 官网 — https://jsonlines.org/（全文到手） | 访问于 2026-08-12 | A |
| S25 | Streaming JSON-LD（W3C 社区编辑草案/提案）— https://w3c.github.io/json-ld-streaming/（全文到手） | 访问于 2026-08-12 | A |

**来源类型覆盖**：W3C 标准原文（S1–S17）/ 学术论文（S18–S22）/ 工程文档或先例项目（S23–S25）≥ 3 类。
**红线核算**：可核来源 25 ≥ 15；原文到手（A 级全文/页面）覆盖 S1–S19、S23–S25 共 22 个来源文档、26 处 A 级引用 ≥ 10；候选逐一查证：Turtle（S2/S13）、N-Triples/N-Quads（S3/S4/S11/S12）、RDF-star（S16/S9）、JSON-LD（S8/S25）、SPARQL（S7/S10），另覆盖 TriG（S5）、RDF/XML（S6）、SHACL（S15）、RDFC-1.0（S14）≥ 5 项。
**关键词组（≥4）**：共执行 7 组并记录（%TEMP%\rdf_research\search_log.txt / search_log2.txt）：①RDF 序列化 比较 Turtle N-Triples（10 命中）；②RDF-star 边属性 标准（0）；③SPARQL 版本化 查询（0）；④命名图 出处（0）；⑤SPARQL bitemporal query patterns（0）；⑥RDF 1.2 working group status（0）；⑦N-Triples canonical form literal escaping（0）。中文组与 bitemporal 组无有效命中 → 相关论断全部以一手原文为准，二手佐证记"未核"。

## 6 判死自查

- [确认] **无无来源论断**：第 2 节每条发现均附 URL+标题+机构+日期+原文摘录；第 1 节逐项回答均有 A 级原文支撑或明确标"未核/推断"。
- [确认] **无二手当原文**：A 级均指已抓取全文/原文页面（W3C REC/WD/CR、arXiv/ar5iv 全文、PDF 全文、官网页面、README）；B 级仅摘要/元数据并注明（S20/S21/S22）；"N-Quads append-only log""SPARQL bitemporal"等检索无命中的主题如实写"未核"，未伪造来源。
- [确认] **无越界漏答**：问题 1–5 全部作答；本体语言（B5）、时间版本（B4）、先例落地（B6）仅标注边界、未展开；未做厂商/引擎对比；未预设 RDF 优于/劣于 JSONL 的结论。
- [确认] **无推断当结论**：推断条目标 C（F29–F32）并注明前提依据；结论性表述均限定在原文措辞范围（如 canonical 仅对 Canonical 文档强制、SPARQL 1.2 为 WD 未定稿）。

---

*生成：2026-08-12，B1 分支调研。原文缓存：%TEMP%\rdf_research\（临时目录，未写入工作区其他文件）。*