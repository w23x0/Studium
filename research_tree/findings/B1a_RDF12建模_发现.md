# B1a 发现 — RDF 1.2 三元组项/再述符建模模式（M08 语义建模深挖）

调研员：中心代执行（B1a，B1 RDF 系 R2 子任务）｜日期：2026-08-12｜基线：B1_RDF_发现.md
范围：只核 RDF 1.2 triple term/reifier 的语法、语义与建模模式；属性图语言归 B2、SHACL/ShEx 归 B5、工具链归 B1b。

## 0 一句话结论

RDF 1.2 用"triple term（只能出现在三元组宾语位置）+ rdf:reifies 再述符 + reifier 主语扩展"取代 RDF-star 的对称引用语法，给出官方建模路径：一条边要被挂上"状态/时间/处置单"，先断言该边、再以 reifier 为主语加任意属性（Primer 官方示例即"兴趣边+类型+起源日期"四元组）；命名图（RDF dataset）保持图内容分离、TriG 是多图+再述的统一语法，可承载"四图分开存储+对齐边跨图表达"；锚点集合若作节点身份，机器判等最直接的路径是"IRI/字面量解析还原转义后比对"（bnode 需图同构，代价更高）；N-Triples/N-Quads 的逐行文法使"追加即合法"在语法层天然成立（崩溃安全等应用层承诺需自建）；RDF 1.2 Concepts/Semantics 目前是 CR Snapshot（2026-04-07），四种序列化仍是 WD（2026-06/07），未达 REC——生产稳定性需关注（RDFC-1.0 规范化已是 REC 2024-05-21，可作审计指纹基础）。

## 1 逐条回答

### Q1 triple term 与 reifier 的语法、语义、标准状态（WD/CR/REC）

- **语法**：triple term 是"作为 RDF term 使用的三元组"，RDF 1.2 限定其**只能出现在另一三元组的宾语位置**（Concepts 与 Primer 均明言）。RDF-star（2021 CG Report）时代允许 quoted triple 作主语/宾语（对称），RDF 1.2 收窄为仅宾语+专用 rdf:reifies 谓词（K1、K2、K8）。
- **语义**：reifying triple = 谓词为 rdf:reifies、宾语为 triple term 的三元组；主语叫 reifier，可继续作其他三元组的主语/宾语；"reifier 作为主语的三元组子集"叫 triple annotation。triple terms 是"透明"的（其中的 term 与断言三元组中的同名词汇同指）。Semantics（CR）将 rdf:Proposition 声明为 rdf:reifies 的 rdfs:range，即"reifying triple 的宾语总指称一个命题"（K1、K3）。
- **标准状态**：Concepts=CR Snapshot 2026-04-07、Semantics=CR Snapshot 2026-04-07；N-Triples/N-Quads=WD 2026-07-23、Turtle=WD 2026-07-30、TriG=WD 2026-06-12；Concepts 明确"退出 CR 需 Semantics+至少一种具体语法各自满足退出标准"。RDF-star CG Report（2021-12-17）明言"不是 W3C 标准、不在标准轨道"。RDFC-1.0 规范化=RFC 级 W3C REC 2024-05-21（K1、K4-K8）。

### Q2 用 triple term / reifier 给"候选边/审计状态/晋升事件"建模：官方示例与规范章节

- **官方路径**：Primer §5.1.2.3"Representations of reifying triples"给出标准四元组模式——例："Bob is interested in the Mona Lisa"这条边 + reifier（"This is Bob's interest, with a type and a date of origin"），形式化为 4 条 triple（断言边 + reifying triple + 描述 reifier 的类型/日期的三元组）（K2）。
- **映射（推断 C）**：M08 的"边状态机"可照此建模——断言候选边（如 `:n1 :hasKnowledgeEdge :n2`）+ 再述（`:audit1 rdf:reifies << :n1 :hasKnowledgeEdge :n2 >>`）+ 属性（`:audit1 a :CandidateEdge; :status :audited; :promotedAt "..."^^xsd:dateTime; :workOrder :wo-42`）。**注意**：Concepts/Primer 只有"类型+日期"这种通用注解示例，**没有**"candidate/audited/promoted 状态机"的 W3C 规范示例——状态词汇表必须自建（未核，U1）。
- **断言与不断言**：triple term 被断言与否是独立维度（"the proposition denoted by the triple term is not claimed to be true. That would only be the case if the triple used as a triple term were also asserted"）——候选边可用"未断言的 triple term"表达"候选"，晋升=另行断言同一 triple（+annotation），即"候选池=未断言三元组、晋升=断言"，这一映射与 RDF 语义完全对齐（推断 C，基于 K1 原文）。

### Q3 对齐边（四图桥接边）在 RDF 里如何表达：命名图 + reifier 组合

- **图分离**：RDF dataset = default graph + 0..n 命名图，图名是 IRI/bnode；"把多个图内容保持分离"是 dataset 的设计目的，官方明言一个用途是"hold snapshots of multiple RDF sources"（K1）。
- **语法组合**：TriG 是多图语法（"An RDF dataset may contain a default graph and/or zero or more named graphs"），且与 Turtle 共享 reifying/annotation 扩展，"allows triple terms to also be asserted"——即命名图内也可以出现再述结构（K6）。
- **对齐边的表达**：跨图对齐 = 在 default graph 或专门的对齐图里写桥接三元组（如 `:nodeInGraphA :alignsWith :nodeInGraphB`），两端 IRI 各自在各自命名图里定义；RDF 没有"边必须属于某图"的约束，图归属是数据分区选择。**没有** W3C 规范章节专论"四图之间的对齐边"（未核，U2）；owl:sameAs 等标准对齐谓词属 OWL 词汇（B5 范围），RDF 1.2 本身不定制对齐谓词（推断 C）。

### Q4 锚点集合作为节点身份：机器判等路径

- **RDF 里的身份载体**：① IRI——全局唯一、字符串相等即同一资源，判等最直接；② blank node——图作用域内唯一，跨图判等需图同构（isomorphic mapping 对 IRI/字面量取恒等、对 bnode 做双射），代价更高；③ 带字面量属性的资源——用自定义谓词把"锚点逐字串集合"作为字面量挂在资源上，判等=解析转义后比对字面量值；④ triple term——可作嵌套结构载体（K1、K3）。
- **机器判等语义**：RDF 图同构定义（Concepts §3.7）明确对字面量取恒等（M(lit)=lit）、对 IRI 取恒等，因此"IRI 相等 / 字面量值相等"是 RDF 内建判等；"锚点集合相等"（排序后逐字比对集合）无 RDF 内建算子，属应用层逻辑（推断 C）。
- **与逐字 grep -F 的等价**：N-Triples 规定字面量内 `"`、LF、CR、`\` 只能以转义形式出现，且"lexical form 是定界符之间**处理完转义序列之后**的字符"——即锚点存入 RDF 必须先转义、判等必须先解析还原；对**不含特殊字符**的锚点串，解析还原=原文，可直接比对；含特殊字符的锚点必须走"解析后判等"而非对原始文件 grep（K4）。这与 B1 一轮结论一致：对源 markdown 的 grep -qF 现行流程不受影响。

### Q5 append-only 合法性：序列化性质

- **N-Triples**：官方定义"line-based, plain text format for encoding an RDF graph"；文法 `ntriplesDoc ::= statement? (EOL statement)* EOL?`——文档=由 EOL 分隔的语句序列，末尾追加一行保持文法合法。追加不改写已存在行→语法层"追加即合法"（K4；"崩溃安全/审计完整性"属应用层需另行保证，推断 C）。
- **N-Quads**："line-based, plain text format for encoding an RDF dataset"，同上逐行追加合法（K5）。
- **Canonicalization（RDFC-1.0）**：REC 级算法，把任意 dataset 变换为"序列化规范形态"，含 bnode 的确定性标识（"Any nodes without globally-unique identifiers must be issued deterministic identifiers"）；与"逐行追加"是两个方向——canonical 形态用于审计指纹/去重，追加日志用于时间流，二者不可在同一文件兼得（需分开维护，推断 C）（K7）。

## 2 关键发现（论断+URL+标题+机构+日期+原文摘录+等级）

- **K1｜RDF 1.2 Concepts：triple term 仅可作宾语；rdf:reifies+reifier 定义；triple annotation；透明性；atemporal；命名图=快照用途；图同构定义**（等级 A）
  - URL：https://www.w3.org/TR/rdf12-concepts/（本版 https://www.w3.org/TR/2026/CR-rdf12-concepts-20260407/）｜标题：RDF 1.2 Concepts and Abstract Data Model｜机构：W3C RDF & SPARQL Working Group｜日期：W3C Candidate Recommendation Snapshot 07 April 2026
  - 摘录："Compared to RDF 1.1, RDF 1.2 introduces the ability to use an RDF triple as a triple term, in the object position of another triple."；"A reifying triple is a triple where the predicate is rdf:reifies and the object is a triple term. The subject of that triple is called a reifier, and it can be the subject or object of other triples."；"the subset of triples including the reifier as subject—as illustrated in these examples—is called a triple annotation."；"we say that triple terms are transparent."；"The RDF abstract data model is atemporal: RDF graphs are static snapshots of information."；"One such use [of RDF datasets] is to hold snapshots of multiple RDF sources."；"Two RDF graphs G and G' are isomorphic (that is, they have the same form) if there exists an isomorphic RDF-term mapping M such that the triple (s,p,o) is in G if and only if the triple (M(s),M(p),M(o)) is in G'."；退出条件："requires that [RDF12-SEMANTICS] and at least one specification for a concrete syntax… have met their own exit criteria for the W3C Candidate Recommendation phase."

- **K2｜RDF 1.2 Primer：官方注解示例（边+类型+日期）、triple term 仅宾语+专用 reifies、多图 dataset**（等级 A）
  - URL：https://www.w3.org/TR/rdf12-primer/｜标题：RDF 1.2 Primer｜机构：W3C RDF & SPARQL Working Group｜日期：访问 2026-08-12（informative）
  - 摘录："This is Bob's interest, with a type and a date of origin, as a concrete circumstance of the fact that Bob is interested in the Mona Lisa. Formally, this annotation is composed of four triples."；"Triple terms may only appear in the object position, and should be used with the special reifies predicate of reifying triples."；"An RDF dataset may have multiple named graphs and at most one unnamed ('default') graph."

- **K3｜RDF 1.2 Semantics：rdf:Proposition 为 rdf:reifies 的 range，reifying 宾语必指称命题**（等级 A）
  - URL：https://www.w3.org/TR/rdf12-semantics/（本版 CR-rdf12-semantics-20260407）｜标题：RDF 1.2 Semantics｜机构：W3C RDF & SPARQL Working Group｜日期：W3C Candidate Recommendation Snapshot 07 April 2026
  - 摘录："This class is also declared as rdfs:range of the rdf:reifies property. In other words, the object of a reifying triple always denotes a proposition."

- **K4｜RDF 1.2 N-Triples：line-based 明文格式；逐行文法；字面量转义规则与 lexical form=处理转义后字符**（等级 A）
  - URL：https://www.w3.org/TR/rdf12-n-triples/（本版 WD-rdf12-n-triples-20260723）｜标题：RDF 1.2 N-Triples – A line-based syntax for an RDF graph｜机构：W3C｜日期：W3C Working Draft 23 July 2026
  - 摘录："N-Triples is a line-based, plain text format for encoding an RDF graph."；"[1] ntriplesDoc ::= statement? (EOL statement)* EOL?"；"Literals may not contain the characters ", LF, or CR except in their escaped forms. In addition \ may not appear in any quoted literal except as part of an escape sequence… The corresponding lexical form is the characters between the delimiters, after processing any escape sequences."

- **K5｜RDF 1.2 N-Quads：line-based dataset 格式；多图单文档**（等级 A）
  - URL：https://www.w3.org/TR/rdf12-n-quads/（本版 WD-rdf12-n-quads-20260723）｜标题：RDF 1.2 N-Quads – A line-based syntax for RDF datasets｜机构：W3C｜日期：W3C Working Draft 23 July 2026
  - 摘录："N-Quads is a line-based, plain text format for encoding an RDF dataset."；"The main distinction is that N-Quads allows the encoding of multiple graphs in a single document representing an RDF Dataset."

- **K6｜RDF 1.2 TriG：多图语法与 Turtle 共享再述/注解扩展**（等级 A）
  - URL：https://www.w3.org/TR/rdf12-trig/（本版 WD-rdf12-trig-20260612）｜标题：RDF 1.2 TriG – RDF Dataset Language｜机构：W3C｜日期：W3C Working Draft 12 June 2026
  - 摘录："An RDF dataset may contain a default graph and/or zero or more named graphs."；"RDF 1.2 TriG shares the reifying triples and annotation syntax extensions with [RDF12-TURTLE] which allows triple terms to also be asserted."

- **K7｜RDF Dataset Canonicalization（RDFC-1.0）：REC 级；任意 dataset→确定性规范形态；bnode 确定性标识**（等级 A）
  - URL：https://www.w3.org/TR/rdf-canon/（本版 REC-rdf-canon-20240521）｜标题：RDF Dataset Canonicalization – A Standard RDF Dataset Canonicalization Algorithm｜机构：W3C｜日期：W3C Recommendation 21 May 2024
  - 摘录："Canonicalization is the process of transforming an input dataset to its serialized canonical form. That is, any two input datasets that contain the same information, regardless of their arrangement, will be transformed into the same serialized canonical form."；"Any nodes without globally-unique identifiers must be issued deterministic identifiers."

- **K8｜RDF-star and SPARQL-star（Final CG Report）：背景规范；"不是 W3C 标准"；与 RDF 1.2 的差异（对称 quoted triple vs 仅宾语 triple term）**（等级 A）
  - URL：https://www.w3.org/2021/12/rdf-star.html｜标题：RDF-star and SPARQL-star｜机构：W3C RDF-DEV Community Group｜日期：Final Community Group Report 17 December 2021
  - 摘录："RDF-star extends RDF with a convenient way to make statements about other statements."；"It is not a W3C Standard nor is it on the W3C Standards Track."

- **K9｜rdf-canonize（JavaScript 实现）：RDFC-1.0 的工程实现**（等级 A）
  - URL：https://github.com/digitalbazaar/rdf-canonize（README 经 raw.githubusercontent 取回）｜标题：rdf-canonize｜机构：digitalbazaar｜日期：仓库 main，访问 2026-08-12
  - 摘录："An implementation of the RDF Dataset Canonicalization specification in JavaScript."；示例：canonize(dataset, {algorithm: 'RDFC-1.0', inputFormat: 'application/n-quads'})

- **K10｜RDF 1.1 Concepts（REC 2014-02-25）：RDF 1.2 之前的稳定基线；RDF 1.2 文档套件继承对象**（等级 A）
  - URL：https://www.w3.org/TR/rdf11-concepts/｜标题：RDF 1.1 Concepts and Abstract Syntax｜机构：W3C RDF Working Group｜日期：W3C Recommendation 25 February 2014
  - 摘录："This document was published by the RDF Working Group as a Recommendation… It is a stable document and may be used as reference material or cited from another document."

- **K11｜RDF 1.1 N-Triples（REC 2014）：line-based 语法在 REC 级已稳定多年（对照 RDF 1.2 的 WD 状态）**（等级 A）
  - URL：https://www.w3.org/TR/n-triples/｜标题：RDF 1.1 N-Triples – A line-based syntax for an RDF graph｜机构：W3C｜日期：W3C Recommendation 25 February 2014（RDF 1.2 版为 WD 2026-07-23）
  - 摘录（RDF 1.2 版 abstract 为基线）："N-Triples is a line-based, plain text format for encoding an RDF graph."（1.1 版同句式；本条目以 1.1 REC 稳定性为对照点）

## 3 冲突与张力

1. **RDF-star 对称语法 vs RDF 1.2 仅宾语**：2021 CG Report 允许 quoted triple 作主语/宾语；RDF 1.2 收窄为仅宾语+reifier 作主语。迁移期资料（CG Report 教程/工具）与 1.2 规范不一致，选型须以 1.2 为准（K1/K8）。
2. **CR/WD 未冻结 vs 工程落地**：Concepts/Semantics 是 CR Snapshot、序列化是 WD（2026-06/07），triple term 语法细节可能变动；RDF 1.1 REC 系（含 RDF 1.1 N-Triples、RDFC-1.0 REC）是当前"稳定可用"基线（K1/K4/K7/K10/K11）。
3. **atemporal 模型 vs M09 时间版本**：RDF 图=静态快照；M09 的双时间轴只能落"词汇+命名图+应用层版本约定"，SPARQL 无原生时态算子（K1；与 B1/B4 一轮冲突登记一致）。
4. **triple term 承载"边状态" vs 候选池语义**：规范里 triple term 可"未断言"（只表达命题不主张为真），这正好表达"候选"；但"未断言的三元组集"没有官方名称为"候选池"，工程上需自建约定（推断 C，U1）。

## 4 未决

- U1：W3C 无"candidate/audited/promoted 边状态机"规范示例——状态词汇表与晋升规则需自建并固定（未核）。
- U2：RDF 规范无"四图对齐边"专论；owl:sameAs 等对齐谓词的工程先例属 OWL/本体文献（归 B5），RDF 1.2 层面未核。
- U3：triple term 仅限宾语对"嵌套注解/边再述边"的影响需原型验证（推断 C，未实测）。
- U4：canonical 审计指纹与 append 日志分文件维护的具体工程形态（存储/命名/校验触发）未设计（推断 C）。
- U5：RDF 1.2 各规范最终 REC 时间未定（未核）。

## 5 来源清单

| # | 来源 | 类型 | 原文到手 |
|---|---|---|---|
| 1 | RDF 1.2 Concepts and Abstract Data Model（CR 2026-04-07） | 标准（W3C） | A |
| 2 | RDF 1.2 Semantics（CR 2026-04-07） | 标准（W3C） | A |
| 3 | RDF 1.2 Primer | 标准说明（W3C） | A |
| 4 | RDF 1.2 N-Triples（WD 2026-07-23） | 标准（W3C） | A |
| 5 | RDF 1.2 N-Quads（WD 2026-07-23） | 标准（W3C） | A |
| 6 | RDF 1.2 Turtle（WD 2026-07-30） | 标准（W3C） | A |
| 7 | RDF 1.2 TriG（WD 2026-06-12） | 标准（W3C） | A |
| 8 | RDF Dataset Canonicalization RDFC-1.0（REC 2024-05-21） | 标准（W3C） | A |
| 9 | RDF 1.1 Concepts（REC 2014-02-25） | 标准（W3C） | A |
| 10 | RDF 1.1 N-Triples（REC 2014-02-25） | 标准（W3C） | A |
| 11 | RDF-star and SPARQL-star（CG Report 2021-12-17） | 社区标准报告 | A |
| 12 | rdf-canonize（digitalbazaar） | 工程实现 | A |

来源类型：W3C 标准/说明 10、社区组报告 1、工程实现 1——≥3 类达标。候选逐一查证：triple term、reifier/annotation、命名图（dataset/TriG）、canonicalization、N-Triples/N-Quads 追加、RDF-star 对照、图同构判等——7 项≥5 达标。原文到手 12≥10 达标；来源 12（规范正文含测试套件/实现报告引用，B1 R1 的 25 源与主库 T4 可并入全局去重）。

## 6 判死自查

- 无来源论断？否——每条关键发现含 URL+机构+日期+摘录+等级。
- 二手当原文？否——无 B 级条目冒充；所有摘录来自实际抓取的规范文本。
- 越界漏答？否——5 问逐条作答；工具链/对齐谓词明确划归 B1b/B5。
- 推断当结论？否——Q2 状态机映射、Q3 对齐边表达、Q4 集合判等、Q5 崩溃安全均标 C 或注明"应用层约定"。
- 本项目红线：锚点判等=逐字 grep -F（K4 明确解析还原后才可判等，与 audit-nodes.md 源文本 grep 流程不冲突）；候选池/审计晋升（Q2 映射不预设结案机制）；四图不合并（命名图保持分离）；M09 锚定 M08、不物理删除（atemporal+命名图快照方案与 B4 时间版本结论互洽，无冲突登记新增）。
