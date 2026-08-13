# B5b 发现 — ShEx vs SHACL 工具生态与封闭世界校验落地

- 分支：B5b（B5 知识表示系第二轮子任务）
- 任务卡：research_tree/tasks/B5b_ShEx_SHACL.md
- 调研员：B5b 分支调研员
- 产出时间：2026-08-12（快照日期以各来源原文/元数据为准）
- 说明：不做性能评测；抓不到写"未核"；推断标 C；RDF 语法归 B1、校验迁移归 B8，不越界。

## 0 一句话结论

SHACL（W3C REC，2017-07-20）与 ShEx（W3C CG Final Report，2019-08-09）都能做封闭词表与引用约束，但能力边界不同：ShEx 的 valueSet（显式值 + "~" 通配并置）可**语法直接**表达"9 个固定值 + other"，CLOSED/EXTRA 表达谓词封闭；SHACL 的 sh:in 是封闭列表、sh:closed/sh:ignoredProperties 表达谓词封闭，但"other（任意值）"无内建原语，需 sh:or 组合或 SHACL-SPARQL 扩展；"锚点引用的源文档必须存在""边两端节点必须存在"两类语言均**无内建原子原语**，只能靠形状引用 + 基数约束间接表达或走 SHACL-SPARQL/外部逻辑（推断标 C）；工程生态上 W3C 官方"实现列表"已归档（只指向 test suite 的 7 个提交实现：Corese、dotNetRDF、Netage、pySHACL、RDFUnit、shaclex、TopBraid），活跃工具链以 pySHACL、Apache Jena、TopBraid、RDF4J（源码为证）、shaclex、shex.js、PyShEx 为代表，ShEx↔SHACL 转换在 shaclex 中仍标记 "work in progress"。

## 1 逐条回答

### Q1 SHACL 的实现清单与各实现支持的特性

- **W3C 官方清单**：SHACL 规范正文不列实现；W3C RDF Data Shapes WG 的 "Implementations" wiki 页**已归档、只读**，内容仅一行——"See http://w3c.github.io/data-shapes/data-shapes-test-suite/"。真正的官方实现证据是 **SHACL Test Suite and Implementation Report**（w3c.github.io/data-shapes/data-shapes-test-suite/），列出 7 个提交过测试结果的实现：**Corese、dotNetRDF、Netage、pySHACL、RDFUnit、shaclex、TopBraid**，通过率分别为 98/121 (81%)、121/121 (100%)、100/121 (83%)、119/121 (99%)、82/121 (68%)、98/121 (81%)、121/121 (100%)；各实现 "Tests Updated" 日期在 2017-05 至 2019-07 之间（页面未标注实现版本号）。
- **活跃维护库（工程文档原文）**：
  - pySHACL（Python/RDFLib）：README 宣称 "adhere to the SHACL Recommendation"；PyPI 当前 0.40.1（requires_python >=3.9）；CHANGELOG 显示 2026-07-28 仍有 0.40.1 修复发布；CLI 支持 -m（meta-shacl）、-a（Advanced Features）、-j（SHACL-JS）、REST server、SPARQL Remote 模式（该模式下禁用 Rules 与 JS）。
  - Apache Jena SHACL：官方文档原文 "It implements SHACL Core and SHACL SPARQL Constraints"，另有 SHACL Compact Syntax、SPARQL-based targets、CLI `shacl validate --shapes --data`、Fuseki `fuseki:shacl` 集成、API `ShaclValidator`/`GraphValidation`。
  - TopBraid SHACL API：README 原文 "Coverage: SHACL Core and SHACL-SPARQL validation / SHACL Advanced Features (Rules etc)"；1.4.0 起不再含 Compact Syntax、1.3.2 起不再含 SHACL-JS；被欧盟委员会官方 SHACL 校验器使用；CLI shaclvalidate/shaclinfer（当前仅支持 Turtle）。
  - RDF4J：rdf4j.org 的 shacl-validation 文档页当前 **404（未核，页面不存在）**；以 GitHub 源码树 `eclipse-rdf4j/rdf4j/tree/main/core/sail/shacl` 及 `ShaclSail.java`/`ShaclValidator.java` javadoc 为证（ShaclSail javadoc 原文 "A Sail implementation that adds support for the Shapes Constraint Language (SHACL)"）。
  - shaclex（Scala）：README 原文同时实现 SHACL 与 ShEx，支持 Jena/RDF4J 后端及外部 SPARQL 端点。
  - Corese、dotNetRDF、Netage、RDFUnit：本次仅以 W3C test suite 通过率为证，各自 README/特性文档未逐一抓取（未核）。

### Q2 ShEx 的实现与工具及与 SHACL 的互操作

- **shex.js**（shexjs/shex.js，JavaScript）：README 提供 `npx shex-validate -x schema -d data -s shape -n node` CLI，输出 JSON 结构；提供 shex-to-json/json-to-shex 格式转换；扩展包 @shexjs/extension-map 的 shexmap-materialize 做数据物化；有 Zenodo DOI 10.5281/zenodo.1213693。
- **PyShEx**（linkml/PyShEx，原 Harold Solbrig 开发，已捐赠 LinkML）：README 原文 "reasonably literal implementation of the Shape Expressions Language 2.0"；CLI `shexeval`（-fn focus、-A allsubjects、-ss SPARQL slurper、-sq SPARQL query 等）；**明言有测试不通过**；修订 0.7.5 "Fix CLOSED issue in evaluate call (issue 41)"；当前发布为支持 Python 3.14。
- **ShExJava**：查证结果——shexSpec 组织下**不存在** shexjava 仓库（GitHub 404）；GitHub 仓库搜索 q=shexjava 仅命中 `ElwinHuaman/ShExJava`（0 star、README 仅一行）与 `iovka/ShExJavaWebsite`（其 README 指向 jdusart/ShExJavaWebsite，即 Lille/Boneva 的 Java 实现网站）；shex wiki 记载的 "ShEx implementation in Java (Lille)" 链接为 gforge.inria.fr（已失效，未核）。**维护状态未核**。
- **其他**：ShExRuby（ruby-rdf/shex，Gregg Kellogg，wiki 记载）、shaclex（Scala）、shexTest 测试套件（shexspec.github.io/shexTest）。
- **互操作（转换）**：shaclex README 原文 "Shaclex can be used to convert schemas from ShEx to SHACL and viceversa. The conversion code is work in progress."（ShEx→SHACL 跟踪 issue #114、SHACL→ShEx 跟踪 issue #113）；学术侧：专著 Validating RDF Data（2018）第 7 章原文 "In most of the common cases, it is possible to translate between ShEx and SHACL"；arXiv:1907.10603（Semi Automatic Construction of ShEx and SHACL Schemas，2019）、arXiv:2502.01295（Common Foundations for SHACL, ShEx, and PG-Schema，2025）、arXiv:2606.03502（A Community Survey on SHACL and ShEx，2026）、WWW'22 Companion 论文 "SHACL and ShEx in the Wild"（DOI 10.1145/3487553.3524253）构成互操作/对比研究线索（后四者仅元数据到手，正文未核）。

### Q3 封闭词表：sh:in / sh:closed vs valueSet / CLOSED，能否表达"边词表=9 个固定值+other"

- **先区分两类封闭**：①**谓词封闭**（允许哪些谓词出现在节点上）＝SHACL sh:closed/sh:ignoredProperties、ShEx CLOSED/EXTRA；②**值封闭**（某属性的值必须是给定集合成员）＝SHACL sh:in、ShEx valueSet。任务卡"边词表"若指**边类型属性的值域**，属②；若指**允许出现的边谓词集合**，属①。
- **ShEx valueSet（值封闭）**：规范原文 "Value sets identify ranges of RDF nodes by explicit inclusion or by range (indicated by '~')"，语法 `valueSet ::= '[' valueSetValue* ']'`，valueSetValue 可为显式 IRI/字面量或 IriStem（含 Wildcard "~"）。因此 `[ ex:t1 ... ex:t9 ~ ]` 可**语法直接**表达"9 个固定值 + other（任意未排除值）"（A 级：语法事实；"9+other 官方示例"未见于规范，标 C）。
- **SHACL sh:in（值封闭）**：规范原文 "sh:in specifies the condition that each value node is a member of a provided SHACL list"；sh:in 是**封闭列表**，无"任意其他"通配。若 "other" 是具体值（如 ex:other），`sh:in (9 个 + ex:other)` 直接表达（A 级语法）；若 "other" 指"任意其他值"，需 `sh:or ( [sh:in (9 个)] [sh:nodeKind sh:IRI] )` 之类组合或 SPARQL FILTER NOT IN——**规范无官方示例，属推断，标 C**。
- **谓词封闭**：SHACL 原文 "sh:closed ... each value node has values only for those properties that have been explicitly enumerated via the property shapes"，配合 sh:ignoredProperties 白名单；ShEx 原文 "closed is true if the 'CLOSED' choice was matched one or more times"、CLOSED 下 unmatchables 非空即失败，EXTRA 允许额外谓词。"9 个固定谓词 + other（一个兜底谓词）"在两者都可表达（9 个列进 sh:property / TripleConstraint，other 放 sh:ignoredProperties / EXTRA），属组合用法（C）。

### Q4 引用完整校验："锚点引用的源文档必须存在""边两端节点必须存在"

- **SHACL Core 无"节点存在"内建原子原语**：Core 提供 sh:class（"each value node is a SHACL instance of a given type"，需要 rdf:type 事实）、sh:node（"each value node conforms to the given node shape"）、sh:hasValue、基数约束（sh:minCount 等）——它们可**间接**近似存在性（如用 sh:node + 恒真形状或反向路径 + minCount 1），但规范没有"对象节点必须在图中出现"的原子组件（推断缺位，B/C）。
- **"源文档必须存在"是图外事实**：SHACL/ShEx 校验对象是 RDF 图，文档级存在性（文件系统/仓库层）不在两语言语义内（推断 C）；需要 SHACL-SPARQL（自定义 SPARQL 约束查图内目标）、SHACL-JS 扩展或校验器外部逻辑。
- **SHACL-SPARQL 约束组件**：REC 第 5 节原文 "SHACL-SPARQL supports a constraint component that can be used to express restrictions based on a SPARQL SELECT query"；第 6 节原文 SPARQL-based constraint components 可 "declare high-level reusable components similar to the Core constraint components"——即引用完整类检查可封装成可复用约束组件（A 级）。SHACL-AF（W3C Note，2017-06-08）进一步定义 SPARQL-based targets、自定义函数、规则等。
- **ShEx 侧**：语法 `shapeExprRef = shapeExprLabel`，值表达式可用 `@<ShapeLabel>` 引用形状——对象节点必须满足被引用形状，配合基数约束可近似"边另一端节点存在且结构合法"（语法 A 级）；"源文档存在"同样属图外事实（C）。
- **递归注意**：SHACL REC 3.4 原文 "By leaving recursion undefined, implementations may chose to not support recursion"——递归引用链（如锚点链）的语义未标准化，跨实现行为可能不一致（A 级原文）。

### Q5 522 节点/1433 边规模的实际可用性（文档承诺为据，不做评测）

- **无公开基准**：未见针对 522/1433 规模的公开基准或工程文档性能承诺（未核）；红线禁止本任务做评测。
- **文档承诺（均为工程文档原文，非实测）**：
  - pySHACL：`pip install pyshacl`（纯 Python，依赖 rdflib/OWL-RL，可选 oxigraph extra）；CLI `pyshacl -s shapes.ttl data.ttl`；退出码 **0=Conformant / 1=Non-Conformant / 2=RuntimeError / 3=Not-Implemented**；REST server（`pyshacl --server`/`pyshacl_server`）；SPARQL Remote 模式（只读，禁 Rules/JS）；Windows 可用 PyInstaller 生成 exe（仓库含 pyshacl-cli.spec）。
  - shex.js：`npm install shex` / `npx shex-validate`，输出 JSON；npm 生态。
  - PyShEx：`pip install PyShEx`；CLI `shexeval rdf shex`；README 警告部分测试不通过。
  - TopBraid：Maven 依赖 org.topbraid:shacl 或 Docker 镜像（ghcr.io/ashleycaselli/shacl）+ `validate`/`infer` 命令；CLI 当前仅支持 Turtle。
  - Jena：`shacl validate --shapes SHAPES.ttl --data DATA.ttl`；可作 Java API 或 Fuseki 服务。
  - shaclex：sbt 构建的 Scala 工具，`sbt "run --data ... --engine shaclex"`。
- **安装/维护成本信号**：pySHACL 0.40.1（2026-07-28）与 Jena 文档版权到 2026，说明两者活跃维护；PyShEx 处于"接管后修复"状态；TopBraid 移除了 Compact Syntax 与 SHACL-JS（1.4.0/1.3.2 起）属于维护性裁剪；RDF4J 官方 SHACL 文档页 404 属维护/文档缺口（未核原因）。

## 2 关键发现

### K1 — SHACL sh:in 是封闭值列表，字面量精确匹配
- 论断：SHACL 值封闭用 sh:in（SHACL 列表），无"任意其他"通配；"9 固定 + other 具体值"可直接列，"+任意其他"需组合。
- URL: https://www.w3.org/TR/shacl/#InConstraintComponent
- 标题: Shapes Constraint Language (SHACL), §4.8.3 sh:in
- 机构: W3C（RDF Data Shapes Working Group）
- 日期: 2017-07-20（W3C Recommendation）
- 原文摘录: "sh:in specifies the condition that each value node is a member of a provided SHACL list." / "Note that matching of literals needs to be exact, e.g. "04"^^xsd:byte does not match "4"^^xsd:integer." / 规范 ASK: `ASK { GRAPH $shapesGraph { $in (rdf:rest*)/rdf:first $value . } }`
- 等级: A

### K2 — SHACL sh:closed/sh:ignoredProperties 是谓词封闭
- 论断：SHACL 谓词封闭允许"显式枚举属性 + 白名单（ignoredProperties）"，可表达"9 个固定谓词 + other 兜底谓词"。
- URL: https://www.w3.org/TR/shacl/#ClosedConstraintComponent
- 标题: Shapes Constraint Language (SHACL), §4.8.1 sh:closed, sh:ignoredProperties
- 机构: W3C（RDF Data Shapes Working Group）
- 日期: 2017-07-20（W3C Recommendation）
- 原文摘录: "sh:closed ... each value node has values only for those properties that have been explicitly enumerated via the property shapes specified for the shape via sh:property"；"If $ignoredProperties has a value then the properties enumerated as members of this SHACL list are also permitted"；示例 Bob/ex:middleInitial 因未枚举谓词而失败。
- 等级: A

### K3 — SHACL-SPARQL：SELECT 约束与可复用约束组件（引用完整/其他检查的官方扩展点）
- 论断：图内"存在性/引用完整"类检查的官方扩展路径是 SHACL-SPARQL（第 5 节）与 SPARQL-based Constraint Components（第 6 节）。
- URL: https://www.w3.org/TR/shacl/#sparql-constraints / https://www.w3.org/TR/shacl/#sparql-constraint-components
- 标题: Shapes Constraint Language (SHACL), Part 2: SHACL-SPARQL (§5, §6)
- 机构: W3C（RDF Data Shapes Working Group）
- 日期: 2017-07-20（W3C Recommendation）
- 原文摘录: "SHACL-SPARQL supports a constraint component that can be used to express restrictions based on a SPARQL SELECT query."；"SPARQL-based constraint components ... as a way to abstract the complexity of SPARQL and to declare high-level reusable components similar to the Core constraint components."
- 等级: A

### K4 — SHACL 递归语义未定义（影响递归引用链校验的一致性）
- 论断：SHACL 规范明确不定义递归，跨实现递归形状行为可能不一致，影响"引用链完整"类校验落地。
- URL: https://www.w3.org/TR/shacl/#shapes-recursion
- 标题: Shapes Constraint Language (SHACL), §3.4 递归
- 机构: W3C（RDF Data Shapes Working Group）
- 日期: 2017-07-20（W3C Recommendation）
- 原文摘录: "By leaving recursion undefined, implementations may chose to not support recursion so that they can issue a static set of SPARQL queries ... The expectation is that future work ... will lead to the definition of specific dialects of SHACL where recursion is well-defined."
- 等级: A

### K5 — ShEx valueSet：显式包含 + "~" 范围（可并置），"9 固定 + other"语法直接可写
- 论断：ShEx 值封闭比 SHACL sh:in 多一个"范围/通配"维度：`[ e1 ... e9 ~ ]` 即"9 固定 + 任意其他"，语法级支持。
- URL: https://shex.io/shex-semantics/#valueSet
- 标题: Shape Expressions Language 2.next（Final Community Group Report 2019-08-09）, §valueSet / ValueSetValue / Wildcard
- 机构: W3C Shape Expressions Community Group
- 日期: 2019-08-09（规范元数据 publishISODate 2019-07-31 / generatedSubtitle "Final Community Group Report 9 August 2019"）
- 原文摘录: "Value sets identify ranges of RDF nodes by explicit inclusion or by range (indicated by '~')."；`valueSet ::= '[' valueSetValue* ']'`；valueSetValue 可为显式 objectValue 或 IriStemRange（stem: IRIREF | Wildcard）。注：规范无"9+other"示例，组合用法为推断（C）。
- 等级: A（语法事实）；"9+other 官方示例"缺位标 C

### K6 — ShEx CLOSED/EXTRA：谓词封闭语义
- 论断：ShEx CLOSED 下未匹配谓词（unmatchables）非空即失败，EXTRA 声明额外允许谓词；与 SHACL sh:closed/sh:ignoredProperties 同构。
- URL: https://shex.io/shex-semantics/#closed (ShapeExpr / CLOSED)
- 标题: Shape Expressions Language 2.next, Shape 语义与 unmatchables
- 机构: W3C Shape Expressions Community Group
- 日期: 2019-08-09（Final CG Report）
- 原文摘录: "closed is true if the 'CLOSED' choice was matched one or more times."；"Let unmatchables be the triples in outs which are not in matchables."；"closed is false or unmatchables is empty."；EXTRA 语法 `extraPropertySet ::= "EXTRA" predicate+`
- 等级: A

### K7 — W3C SHACL Test Suite and Implementation Report：7 个提交实现与通过率
- 论断：W3C 官方"实现列表"的实际载体是 test suite 报告页，7 个实现、两级合规（partial/full）、121 个测试；页面只给 "Tests Updated" 日期不给版本号。
- URL: https://w3c.github.io/data-shapes/data-shapes-test-suite/
- 标题: SHACL Test Suite and Implementation Report
- 机构: W3C（RDF Data Shapes Working Group；编辑 Labra Gayo/Knublauch/Kontokostas）
- 日期: 各实现 Tests Updated 2017-05-04（Corese）至 2019-07-01（dotNetRDF）
- 原文摘录: "This section summarizes the outcomes of test reports for submitted SHACL implementations." 表头顺序 Corese / dotNetRDF / Netage / pySHACL / RDFUnit / shaclex / TopBraid，通过率 `98/121 (81%) 121/121 (100%) 100/121 (83%) 119/121 (99%) 82/121 (68%) 98/121 (81%) 121/121 (100%)`；"Implementations may report two levels of compliance: partial compliance ... full compliance ..."
- 等级: A

### K8 — W3C RDF Data Shapes WG "Implementations" wiki 已归档只读，仅指向 test suite
- 论断：W3C 官方实现清单页本身已停更归档，不具备"当前实现清单"功能。
- URL: https://www.w3.org/2014/data-shapes/wiki/Implementations
- 标题: RDF Data Shapes Working Group — Implementations
- 机构: W3C
- 日期: 2017-03-30 前后归档（页面标注 "This wiki has been archived and is now read-only"）
- 原文摘录: "This wiki has been archived and is now read-only."；正文仅 "See http://w3c.github.io/data-shapes/data-shapes-test-suite/"
- 等级: B（归档页，事实可核）

### K9 — pySHACL：纯 Python、CLI 退出码 0/1/2/3、meta/advanced/JS、REST、SPARQL Remote
- 论断：pySHACL 是文档最完整、维护最活跃（0.40.1，2026-07-28）的 SHACL 工具链候选；退出码语义明确，适合脚本集成。
- URL: https://github.com/RDFLib/pySHACL（README）/ https://pypi.org/project/pyshacl/ / https://github.com/RDFLib/pySHACL/blob/master/CHANGELOG.md
- 标题: pySHACL README / PyPI 元数据 / CHANGELOG
- 机构: RDFLib 组织（GitHub/PyPI）
- 日期: README 快照内置 CLI 显示 0.27.0；PyPI 当前 0.40.1（requires_python >=3.9）；CHANGELOG 0.40.1 = 2026-07-28
- 原文摘录: "This is a pure Python module which allows for the validation of RDF graphs against Shapes Constraint Language (SHACL) graphs."；"System exit codes are: 0 = DataGraph is Conformant, 1 = DataGraph is Non-Conformant, 2 = The validator encountered a RuntimeError, 3 = Not-Implemented"；"-m enable the meta-shacl feature, -a enable SHACL Advanced Features, -j enable SHACL-JS Features"；"PySHACL now has a built-in validation service, exposed via an OpenAPI3.0-compatible REST API."
- 等级: A

### K10 — Apache Jena SHACL：Core + SPARQL Constraints、CLI、Fuseki
- 论断：Jena 是 Java 生态里明确声明支持 SHACL Core + SHACL-SPARQL 且持续维护（版权 2011–2026）的实现。
- URL: https://jena.apache.org/documentation/shacl/
- 标题: Apache Jena — Apache Jena SHACL
- 机构: Apache Software Foundation
- 日期: 文档版权 2011–2026（抓取快照 2026-08-12）
- 原文摘录: "It implements SHACL Core and SHACL SPARQL Constraints. In addition, it provides: SHACL Compact Syntax, SPARQL-based targets."；CLI "shacl validate --shapes SHAPES.ttl --data DATA.ttl"；"Fuseki has a new service operation fuseki:shacl"
- 等级: A

### K11 — TopBraid SHACL API：Core+SPARQL+AF 全覆盖，但已裁剪 Compact/SHACL-JS
- 论断：TopBraid 覆盖最全（含 SHACL-AF Rules），但 1.4.0 起移除 Compact Syntax、1.3.2 起移除 SHACL-JS；EC 官方校验器在用；CLI 仅支持 Turtle。
- URL: https://github.com/TopQuadrant/shacl
- 标题: TopBraid SHACL API README
- 机构: TopQuadrant / knowledgepixels
- 日期: 抓取快照 2026-08-12（README 未标注版本日期）
- 原文摘录: "An open source implementation of the W3C Shapes Constraint Language (SHACL) based on Apache Jena."；"Coverage: SHACL Core and SHACL-SPARQL validation / SHACL Advanced Features (Rules etc)"；"Former Coverage until version 1.4.0: SHACL Compact Syntax"；"Former Coverage until version 1.3.2: SHACL JavaScript Extensions"；"The TopBraid SHACL API is internally used by the European Commission's generic SHACL-based RDF validator"；"Currently, only Turtle (.ttl) files are supported."
- 等级: A

### K12 — RDF4J：官方文档页 404，源码树与 javadoc 为证
- 论断：RDF4J 有 SHACL 实现（core/sail/shacl：ShaclSail/ShaclValidator），但官方 shacl-validation 文档页当前不可访问（404），功能矩阵未核。
- URL: https://github.com/eclipse-rdf4j/rdf4j/tree/main/core/sail/shacl （文档页 https://rdf4j.org/documentation/reference/shacl-validation/ 404）
- 标题: eclipse-rdf4j/rdf4j — core/sail/shacl 源码树 / ShaclSail.java
- 机构: Eclipse Foundation（RDF4J 项目）
- 日期: 源码抓取快照 2026-08-12（ShaclSail.java 版权 2018）
- 原文摘录: ShaclSail.java javadoc: "A {@link Sail} implementation that adds support for the Shapes Constraint Language (SHACL)."；类注释引用 "SHACL W3C Recommendation"；ValidationException 提供 validationReportAsModel()。
- 等级: B（源码为证；官方文档页未核/404）

### K13 — shaclex：双语言实现 + ShEx↔SHACL 转换（work in progress）
- 论断：shaclex 是唯一同时实现 SHACL 与 ShEx 并在 README 明确提供双向转换命令的工程；转换代码明确标记未完成。
- URL: https://github.com/weso/shaclex
- 标题: SHaclEX README
- 机构: WESO Research Group（weso，Labra Gayo 团队）
- 日期: 抓取快照 2026-08-12（README 未标注版本日期）
- 原文摘录: "Scala implementation of SHEX and SHACL."；"This project contains an implementation of SHACL and ShEx"；"Both are implemented in Scala using the same underlying mechanism using a purely functional approach."；"Shaclex can be used to convert schemas from ShEx to SHACL and viceversa. ... The conversion code is work in progress. This issue tracks ShEx->SHACL conversion (issue #114) and this one tracks SHACL->ShEx conversion (issue #113)."
- 等级: A

### K14 — shex.js：CLI + 格式转换 + materialize
- 论断：shex.js 是 ShEx 生态最活跃的 JS 实现，提供 npx CLI、ShExC/ShExJ 互转与物化扩展。
- URL: https://github.com/shexjs/shex.js
- 标题: shex.js README
- 机构: shexjs（Shape Expressions 社区）
- 日期: 抓取快照 2026-08-12（README 未标注版本日期；Zenodo DOI 10.5281/zenodo.1213693）
- 原文摘录: "shex.js javascript implementation of Shape Expressions"；"npx shex-validate -x <schema> -d <data> -s <shape> -n <node>"；"The result is a JSON structure which tells you exactly how the data matched the schema."；"You can convert between them with shex-to-json" / "json-to-shex"；"shexmap-materialize ... transforms data from a source schema"
- 等级: A

### K15 — PyShEx：LinkML 接管、部分测试不通过、0.7.5 修复 CLOSED
- 论断：PyShEx 是 Python 侧 ShEx 校验器，但维护交接后有已知未通过测试，README 明示谨慎使用；CLOSED 支持有过 bug 修复记录。
- URL: https://github.com/linkml/PyShEx
- 标题: PyShEx README
- 机构: LinkML 组织（原 Harold Solbrig）
- 日期: 抓取快照 2026-08-12（README 记录 0.7.5/0.7.6 修订）
- 原文摘录: "This repository was originally developed by Harold Solbrig and was kindly contributed to the LinkML organization"；"Since development was taken over after a long time of no development, there are tests that are not passing."；"This package is a reasonably literal implementation of the Shape Expressions Language 2.0."；"0.7.5 -- Fix CLOSED issue in evaluate call (issue 41)"
- 等级: A

### K16 — ShEx 实现生态与 shexjava 查证
- 论断：ShEx 官方（社区）实现清单在 shexSpec wiki；"shexjava" 在 shexSpec 组织不存在，GitHub 搜索仅 2 个弱相关仓库，Lille Java 实现链接已失效。
- URL: https://github.com/shexSpec/shex/wiki/ShEx ；https://github.com/search?q=shexjava&type=repositories
- 标题: ShEx wiki（迁移自 W3C SW wiki）/ GitHub 仓库搜索结果
- 机构: shexSpec（Shape Expressions 社区）
- 日期: wiki 抓取快照 2026-08-12；github 搜索快照 2026-08-12
- 原文摘录: wiki 实现列表 "ShEx.js（Eric Prud'hommeaux）、SHACLex（Labra Gayo）、ShEx Ruby（Gregg Kellogg）、ShEx implementation in Java (Lille)（Iovka Boneva）、Old implementations: RDFShape, Shexcala, JSShExTest"；GitHub 搜索 q=shexjava 仅命中 ElwinHuaman/ShExJava 与 iovka/ShExJavaWebsite（README 指向 jdusart/ShExJavaWebsite）。
- 等级: B

### K17 — 专著 Validating RDF Data（2018）第 7 章：扩展机制对比与"常见情形可转换"
- 论断：学术专著明确 ShEx 用 semantic actions、SHACL 用 SHACL-SPARQL 作为扩展机制，且"多数常见情形下 ShEx 与 SHACL 可互译"——与 shaclex 的 WIP 工程现状形成张力。
- URL: https://book.validatingrdf.com/bookHtml013.html
- 标题: Validating RDF Data, Chapter 7 "Comparing ShEx and SHACL"（Labra Gayo, Prud'hommeaux, Boneva, Kontokostas, Morgan & Claypool, DOI 10.2200/S00786ED1V01Y201707WBE016）
- 机构: Morgan & Claypool（Synthesis Lectures on the Semantic Web）
- 日期: 2018
- 原文摘录: "Both ShEx and SHACL have extension mechanisms that support the declaration of more advanced constraints. ShEx has semantic actions ... and SHACL has SHACL-SPARQL ..."；"In most of the common cases, it is possible to translate between ShEx and SHACL."；"ShEx is a W3C Community Group specification while SHACL Core and SHACL-SPARQL are a W3C Recommendation."
- 等级: A（原文到手）

### K18 — 学术互操作/对比研究线索（4 篇，元数据到手，正文未核）
- 论断：2019–2026 年持续有 ShEx/SHACL 对比、互转与社区调查论文，构成互操作研究的学术面；本任务仅核到元数据。
- URL: https://arxiv.org/abs/2502.01295 ；https://arxiv.org/abs/2606.03502 ；https://arxiv.org/abs/1907.10603 ；https://doi.org/10.1145/3487553.3524253
- 标题: Common Foundations for SHACL, ShEx, and PG-Schema（2025-02-03）；A Community Survey on SHACL and ShEx: Briding Gaps in RDF Validation（2026-06-02）；Semi Automatic Construction of ShEx and SHACL Schemas（2019-07-24）；SHACL and ShEx in the Wild: A Community Survey on Validating Shapes Generation and Adoption（Rabbani/Lissandrini/Hose, WWW '22 Companion, 2022-04-25, 页 260–263）
- 机构: arXiv 预印本 / ACM（Crossref）
- 日期: 见各条
- 原文摘录: arXiv 摘要元数据（如 2502.01295 "Graphs have emerged as an important foundation ..."）；Crossref 元数据 title/作者/DOI/event "WWW '22: The ACM Web Conference 2022"。
- 等级: B（元数据级）

## 3 冲突与张力

1. **官方"实现列表"已死 vs 生态活跃**：W3C wiki 实现页 2017 年即归档只读，test suite 各实现 "Tests Updated" 停在 2017–2019；而 pySHACL 0.40.1（2026-07-28）、Jena 2026 版权仍在迭代——"W3C 官方清单"不能反映当前生态，当前清单需从 GitHub/PyPI/npm 自行核证。
2. **test suite 通过率无版本对应**：报告页只有 "Tests Updated" 日期，无实现版本号；今日各库的通过率不可从该页推出（本任务未核当前通过率）。
3. **pySHACL 文档内部版本漂移**：README 内嵌 CLI 帮助显示 "PySHACL 0.27.0"，而 PyPI 当前 0.40.1——README 快照滞后，引用时需区分。
4. **PyShEx"可用"vs"测试不过"**：README 明言接管后有测试不通过（依赖升级或真 bug），与"PyShEx 是 ShEx 主流 Python 工具"的印象存在张力；CLOSED 语义还有过 issue #41 修复记录。
5. **学术"常见情形可转换" vs 工程"work in progress"**：专著第 7 章称多数常见情形可互译，shaclex README 却把双向转换标为 WIP（issue #114/#113）——理论可行性与工程完成度不一致。
6. **RDF4J 文档 404 vs 源码存在**：rdf4j.org 的 shacl-validation 文档页 404，但仓库 core/sail/shacl 有完整实现与 javadoc——官方文档与源码不一致（原因未核）。
7. **ShEx 标准状态认知分裂**：W3C SW wiki 将 ShEx 页标 "Obsolete - please see the ShEx github wiki"，而 ShEx 规范 2019 年仍发布 "Final Community Group Report"；SHACL 是 W3C REC（2017）——两语言标准化层级不对等（REC vs CG Report）。
8. **"9+other" 表达路径不对称**：ShEx valueSet 语法直接支持"显式值 + ~ 通配"；SHACL sh:in 无通配，需 sh:or/SPARQL 组合（C）。若任务卡意图是"边词表=9 固定谓词+other 谓词"，则 sh:closed+sh:ignoredProperties 与 CLOSED+EXTRA 可对称表达（组合用法，C）。

## 4 未决

1. **RDF4J 官方 SHACL 功能矩阵未核**：rdf4j.org/documentation/reference/shacl-validation/ 404；仅以源码树与 javadoc 为证，RDF4J 对 SHACL 各特性（Core/SPARQL/AF）的支持边界与版本演进未核。
2. **shexjava（Lille Java 实现）当前维护状态未核**：gforge.inria.fr 链接失效；GitHub 上仅 ElwinHuaman/ShExJava（0 star、一行 README）与 iovka/ShExJavaWebsite（指向 jdusart/ShExJavaWebsite）；当前是否可编译/维护不可知。
3. **"9+other" 的 SHACL 组合表达无官方示例**：sh:or + sh:in 组合、sh:closed + sh:ignoredProperties 兜底均为推断（C），规范无现成示例。
4. **522 节点/1433 边规模无公开基准或工程承诺**：未核到任何针对该规模的性能/资源文档；按红线不做评测。
5. **"锚点引用的源文档必须存在"的规范级缺位证据不足**：SHACL/ShEx 语义作用于图内事实，"文档存在"属图外——该结论是推断（C），未见规范显式讨论"图外存在性"。
6. **test suite 通过率的版本映射缺失**：7 个实现的通过率对应哪一版本未在页面标注；当前版本通过率未核。

## 5 来源清单

说明：类型 = 规范/工程/学术；状态 = A（原文到手）/ B（元数据或部分原文）/ 未核。

### W3C 规范与官方页（8）
1. W3C SHACL Recommendation — https://www.w3.org/TR/shacl/ — W3C — 2017-07-20 — 规范 — A（全文 271KB，含 4.8.1/4.8.3/§5/§6/3.4 摘录）
2. W3C SHACL Advanced Features (SHACL-AF) — https://www.w3.org/TR/shacl-af/ — W3C RDF Data Shapes WG — 2017-06-08（api.w3.org first-version 20170608）— 规范 — A（全文 83KB）
3. W3C SHACL Test Suite and Implementation Report — https://w3c.github.io/data-shapes/data-shapes-test-suite/ — W3C — 2017–2019（Tests Updated）— 规范/测试 — A（原文 81KB）
4. W3C RDF Data Shapes WG wiki: Implementations — https://www.w3.org/2014/data-shapes/wiki/Implementations — W3C — 归档只读（2017-03-30）— 规范 — B
5. W3C Semantic Web Standards: SHACL — https://www.w3.org/2001/sw/wiki/SHACL — W3C — Publication date 2017-07-20 — 规范 — B
6. W3C Semantic Web Standards: ShEx — https://www.w3.org/2001/sw/wiki/ShEx — W3C — Obsolete — 规范 — B
7. ShEx 规范（Shape Expressions Language 2.next） — https://shex.io/shex-semantics/ — W3C Shape Expressions CG — Final CG Report 2019-08-09 — 规范 — A（全文 148KB）
8. shexTest — http://shexspec.github.io/shexTest/ — shexSpec — 抓取 2026-08-12 — 工程/测试 — B

### 工程仓库与包（12）
9. pySHACL README — https://github.com/RDFLib/pySHACL — RDFLib — 抓取 2026-08-12 — 工程 — A
10. pySHACL PyPI 元数据 — https://pypi.org/project/pyshacl/ — PyPI — 0.40.1（requires_python >=3.9）— 工程 — A（JSON）
11. pySHACL CHANGELOG — https://github.com/RDFLib/pySHACL/blob/master/CHANGELOG.md — RDFLib — 0.40.1=2026-07-28 — 工程 — A
12. shex.js README — https://github.com/shexjs/shex.js — shexjs — 抓取 2026-08-12 — 工程 — A
13. PyShEx README — https://github.com/linkml/PyShEx — LinkML — 抓取 2026-08-12 — 工程 — A
14. TopBraid SHACL API README — https://github.com/TopQuadrant/shacl — TopQuadrant/knowledgepixels — 抓取 2026-08-12 — 工程 — A
15. Apache Jena SHACL 文档 — https://jena.apache.org/documentation/shacl/ — Apache — 版权 2011–2026 — 工程 — A
16. shaclex README — https://github.com/weso/shaclex — WESO — 抓取 2026-08-12 — 工程 — A
17. eclipse-rdf4j/rdf4j 源码树 core/sail/shacl + ShaclSail.java/ShaclValidator.java — https://github.com/eclipse-rdf4j/rdf4j/tree/main/core/sail/shacl — Eclipse Foundation — 抓取 2026-08-12 — 工程 — B（源码原文到手；官方文档页 404）
18. shexSpec wiki: ShEx（实现列表） — https://github.com/shexSpec/shex/wiki/ShEx — shexSpec — 抓取 2026-08-12 — 工程 — B
19. GitHub 仓库搜索 q=shexjava — https://github.com/search?q=shexjava&type=repositories — GitHub — 抓取 2026-08-12 — 工程 — B
20. ElwinHuaman/ShExJava README（一行） — https://github.com/ElwinHuaman/ShExJava — 抓取 2026-08-12 — 工程 — B

### 学术论文与专著（6）
21. Validating RDF Data（第 7 章 Comparing ShEx and SHACL） — https://book.validatingrdf.com/bookHtml013.html — Labra Gayo/Prud'hommeaux/Boneva/Kontokostas, Morgan & Claypool — 2018（DOI 10.2200/S00786ED1V01Y201707WBE016）— 学术专著 — A（原文 295KB）
22. SHACL and ShEx in the Wild: A Community Survey on Validating Shapes Generation and Adoption — https://doi.org/10.1145/3487553.3524253 — Rabbani/Lissandrini/Hose, ACM WWW '22 Companion — 2022-04-25 — 学术 — B（Crossref 元数据）
23. Common Foundations for SHACL, ShEx, and PG-Schema — https://arxiv.org/abs/2502.01295 — arXiv — 2025-02-03 — 学术 — B（arXiv 元数据）
24. A Community Survey on SHACL and ShEx: Briding Gaps in RDF Validation — https://arxiv.org/abs/2606.03502 — arXiv — 2026-06-02 — 学术 — B（arXiv 元数据）
25. Semi Automatic Construction of ShEx and SHACL Schemas — https://arxiv.org/abs/1907.10603 — arXiv — 2019-07-24 — 学术 — B（arXiv 元数据）
26. Semantics and Validation of Shapes Schemas for RDF — https://doi.org/10.1007/978-3-319-68288-4_7 — Boneva et al. — 2014/2017 — 学术 — B（S2 元数据）

## 6 判死自查

- **可核来源 ≥15**：26 个实体来源（规范 8 + 工程 12 + 学术 6）✓（26 ≥ 15）
- **原文到手 ≥10**：A 级原文 1–3、7、9–16、21 共 15 个来源全文/原文在手；另有 B 级原文（4–6、8、17–20）✓（≥10）
- **来源类型 ≥3**：W3C 规范（1–8）、工程仓库/包（9–20）、学术论文/专著（21–26）✓
- **候选逐一查证 ≥5**：pySHACL（README+PyPI+CHANGELOG）、TopBraid（README）、RDF4J（源码树+404 文档页）、Jena（官方文档）、shaclex（README）、Corese/dotNetRDF/Netage/RDFUnit（test suite 通过率）、shex.js（README）、PyShEx（README）、shexjava（GitHub 搜索+404）、shexTest（站点）、ShExRuby（wiki 记载）——共 11 组 ✓
- **关键词 ≥4 组**：①"SHACL implementations list W3C"（W3C wiki/test suite/swwiki）；②"ShEx validator tools shex.js"（shex.js README/shex wiki）；③"SHACL sh:closed closed shape closed vocabulary"（REC 4.8.1）；④"SHACL-SPARQL constraint component"（REC §5/§6）；另执行 "rdf4j shacl"、"shexjava"、"ShEx SHACL translation conversion tool"（Bing RSS 存档）等补充检索 ✓
- **禁止项**：未做任何性能评测（522/1433 仅报文档承诺）；RDF 语法归 B1、校验迁移归 B8，未越界；未捏造来源——抓取失败处（RDF4J 文档页 404、shexjava 仓库 404、shex impl report 404、Bing 搜索无关结果）均如实写"未核"；推断项（"9+other" 的 SHACL 组合、图外存在性、版本映射）全部标 C。
