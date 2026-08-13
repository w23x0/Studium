# B5a — SHACL-SPARQL 约束组件与状态机校验（发现文档）

- 分支：B5a（B5 知识表示系 R3 子任务）
- 角色：深度调研树分支调研员（独立 Codex 会话）
- 产出日期：2026-08-12
- 状态：完成（红线自查见第 6 节）
- 原始抓取证据：`research_tree/tmp/b5a/`（W3C 规范/草案、工程文档、论文、搜索日志等）

---

## 0 一句话结论

**SHACL-SPARQL 能把"候选池 + 状态枚举 + 部分迁移约束"写成声明式"查询返回违例"约束（W3C REC §5，A 级），但"promoted 边必须来自 audited 边""处置单单点"这类依赖**前状态/时序事实**的迁移约束，只有在前状态被显式建模为可查询谓词（如 auditedBy/auditedAt、上一状态边、处置单链接）时才可纯声明表达，否则需要过程式检查或状态历史实体（C 级推断）；SHACL-AF 规则适合做"审计晋升"的自动写入（inference）但规范把多轮规则迭代留待未来，且校验器默认未必开启该扩展（A 级）。**

---

## 1 逐条回答

### 1.1 Q1：SPARQL-based constraints 的规范原文——sparql target/constraint/function 如何注册与执行

- **分层**：W3C SHACL REC（2017-07-20）把规范分为 SHACL Core 与 SHACL-SPARQL。Core 是 MUST 实现；SHACL-SPARQL = Core + "SPARQL-based constraints and an extension mechanism to declare new constraint components"（K5a-01）。
- **约束（REC §5）**：`sh:SPARQLConstraintComponent`，参数 `sh:sparql`，值是 SPARQL **SELECT** 查询。执行时对每个焦点节点预绑定 `$this`（可选 `$shapesGraph`、`$currentShape`），查询返回的 `?value` 绑定即违例；每个解产生一条验证结果，映射为 `sh:focusNode` / `sh:resultPath` / `sh:value` / `sh:resultMessage` / `sh:sourceConstraint`（K5a-01、K5a-02）。
- **约束组件（REC §6）**：可复用扩展机制——用 `sh:parameter`（可带 `sh:optional`）声明参数、`sh:validator` 挂 SPARQL ASK（`sh:SPARQLAskValidator`，value node 上 ASK=false 即违例）或 SELECT（`sh:SPARQLSelectValidator`，`$PATH` 在属性形状中替换）验证器（K5a-04）。
- **target（SHACL-AF）**：`sh:SPARQLTarget` 用 `sh:select`（单结果变量 `this`）计算目标节点，可附 `sh:ask` 过滤；`sh:SPARQLTargetType` 是参数化目标类型。注意 target 属 AF 扩展，不是 REC Core/SHACL-SPARQL 内容（K5a-05）。
- **function（SHACL-AF）**：`sh:SPARQLFunction` 通过 SPARQL 1.1 Extensible Value Testing 机制安装新函数，`sh:parameter` + `sh:returnType` + `sh:select`（K5a-06）。
- **语法硬限制**：预绑定机制要求查询不得含 `MINUS`、`SERVICE`（联邦）、`VALUES` 子句，不得对潜在预绑定变量用 `AS ?var`，子查询必须返回所有潜在预绑定变量（REC 附录 A；SHACL 1.2 SPARQL 草案延续此限制，K5a-03、K5a-09）。

### 1.2 Q2：用 SHACL-SPARQL 表达"边状态 ∈ {candidate, audited, promoted} 且迁移只能按状态机"的可行性

- **状态枚举**：可行且自然。写一条 SPARQL 约束，对 `$this`（焦点边）查 `?this ex:status ?s` 且 `FILTER(?s NOT IN (ex:candidate, ex:audited, ex:promoted))`，返回即违例。这完全落在 REC §5 的"查询返回违例解"语义内（K5a-01；枚举部分结论等级 A）。
- **迁移只能按状态机**：取决于"迁移历史"在数据模型中的存在形式：
  - 若模型显式记录**前状态/上一状态**谓词（如 `ex:previousStatus`、审计事件实体 `ex:auditEvent` 带 `ex:fromState/ex:toState/ex:time`），则每条迁移规则可写成约束，如"若存在 promoted 状态则必须存在 from=audited 的审计事件"——仍属 SELECT 查询返回违例（可行，但可表达性以数据建模为前提，**推断标 C**，K5a-20）。
  - 若模型只有**当前状态**而无历史，则"promoted 必须来自 audited"在单图快照上**不可判定**——查询能验证"当前是 promoted"，但无法知道它是否"来自" audited（除非另有事实）。此时需过程式检查、版本化图（B4 分支）或外部时序数据（C 级推断，K5a-20）。
- **无现成先例**：英文/中文搜索"SHACL state machine / 状态机 校验 / workflow validation"未找到把 SHACL 直接当状态机校验器的现成工程或文章（相关最近的学术工作是"图更新下的 SHACL 静态验证" ISWC 2025，主题不同，K5a-18）；状态机校验先例记为**未核**，不可引用不存在的来源。

### 1.3 Q3：状态机转换约束能否纯声明式表达，还是需要过程式检查？

- **纯声明式可表达的**：状态枚举、单值性（`sh:maxCount 1`）、"状态存在且合法"、依赖可查询事实的单步迁移（如上一条）、处置单与边的一一对应（可用 `sh:maxCount`/`sh:minCount` 或 SPARQL 约束）——这些不需要过程式代码（A 级规范依据 + C 级组合推断，K5a-21）。
- **需要过程式/外部机制的**：全局迁移链完整性与时序约束（"必须经历 candidate→audited→promoted 且顺序正确、时间单调"）。规范本身只提供"查询判违例"与"规则写图"两种机制，没有内建的状态机/时序语义；多轮规则迭代在 SHACL-AF 中明确"left to future work"（A 级，K5a-07），pySHACL 用自设上限 100 次迭代近似稳态（A 级，K5a-12）——这已是工程过程式实现而非纯声明语义。
- **结论**：能纯声明表达"快照约束"（合法状态集合 + 可查询事实上的迁移合法性）；表达不了"不可观察的历史/时序"。任何声称"完整状态机可纯声明"的论断应标 C 并附数据模型前提。

### 1.4 Q4：校验器对 SHACL-SPARQL 的支持度与安全限制（是否默认禁用 SPARQL 扩展）

- **支持度（A 级，各工程原文在手）**：
  - **pySHACL**：SPARQL 约束组件是默认能力（`pyshacl/constraints/sparql/` 常驻，无需开关）；SHACL-AF 的 targets/rules/functions 需 `-a/--advanced`；`sparql_mode`（远程 SPARQL 数据图）下规则与 SHACL-JS 被禁用（K5a-11、K5a-12）。
  - **TopBraid（TopQuadrant/shacl）**：README 明示覆盖 "SHACL Core and SHACL-SPARQL validation" + "SHACL Advanced Features (Rules etc)"，基于 Apache Jena（K5a-13）。
  - **Apache Jena**：`jena-shacl` "implements SHACL Core and SHACL SPARQL Constraints"，另提供 SPARQL-based targets（K5a-14）。
  - **RDF4J ShaclSail**：支持 `sh:sparql`、`sh:select`、`sh:SPARQLTarget`；DASH/RSX 需显式开启且标注实验性（K5a-15）。
  - **shaclex**：声称通过 shacl-core 兼容测试，可经 Jena/RDF4J 或外部 SPARQL endpoint 验证（K5a-16）。
- **安全限制（A 级）**：
  - REC 附录 E："SHACL-SPARQL includes all the security issues of SPARQL."（K5a-08）。
  - SHACL-AF 附录 B："users to only use trusted and controlled shape graphs"（K5a-08）。
  - 没有证据表明任何主流校验器"默认禁用 SPARQL 约束组件"本身；"默认关闭"的是 **SHACL-AF 扩展**（pySHACL `advanced=False`）与可选开关（`-it` 迭代规则、`-j` JS）。这个区分是本分支报告的核心，避免把 SHACL-SPARQL（REC §5/6）与 SHACL-AF（targets/functions/rules）混为一谈。

### 1.5 Q5：SHACL-AF（规则、SPARQL 规则）与约束的区别，对"审计晋升"自动化的适用性

- **区别（A 级，SHACL-AF §8 + REC）**：
  - 约束 = **只读判定**：对数据图求值，返回违例结果，不改数据。
  - 规则 = **写图推理**："A SHACL rules engine is a computer procedure that takes as input a data graph and a shapes graph and is capable of adding triples to the data graph. The new triples that are produced by a rules engine are called the inferred triples." `sh:SPARQLRule` 用 `sh:construct` 的 CONSTRUCT 查询，预绑定 `$this`，产出三元组；`sh:TripleRule` 用 node expressions（K5a-07）。
  - 迭代：AF 伪代码"only covers a single 'iteration' over all rules, without prescribing the behavior if the same rule needs to be applied multiple times after other rules have fired. The latter is left to future work."（K5a-07）——规范不保证多轮传播，工程如 pySHACL 自行实现迭代与上限。
- **对"审计晋升"自动化的适用性**：
  - 适用（A 级机制 + C 级应用推断）：用 `sh:SPARQLRule` 在满足审计条件（如收到 auditEvent、状态=audited）的候选边上自动写 `ex:status ex:promoted` 或生成处置单三元组；用 `sh:SPARQLTarget` 圈定候选池；用约束做晋升后的事后校验（如 promoted 必须带处置单）。
  - 注意：规则写图与约束校验是**两种不同用途**——约束保证数据合法，规则改变数据。若管线中规则与约束混跑，需明确"先规则后校验"的顺序与幂等性（推断 C，K5a-20/21）。

---

## 2 关键发现

> 等级：A=原文到手；B=二手；C=推断/组合。原文摘录均来自 `research_tree/tmp/b5a/` 下抓取文件。

### K5a-01｜规范分 Core 与 SHACL-SPARQL 两层；SPARQL 约束是 SELECT 查询，返回违例即结果非空（A）
- 论断：SPARQL-based constraints 的核心语义是"SELECT 查询对每个焦点节点求值，返回 `?value` 绑定即违例"，因此"违规即结果非空"的写法是规范原生语义。
- URL：https://www.w3.org/TR/2017/REC-shacl-20170720/（抓取文件 w3c_shacl_rec_dated.html/.txt）
- 标题：Shapes Constraint Language (SHACL)，W3C Recommendation 20 July 2017
- 机构：W3C
- 日期：2017-07-20
- 原文摘录："SHACL-SPARQL consists of all features of SHACL Core plus the advanced features of SPARQL-based constraints and an extension mechanism to declare new constraint components."（§1.1）；"SHACL-SPARQL supports a constraint component that can be used to express restrictions based on a SPARQL SELECT query."（§5）；"The SPARQL query returns result set solutions for all bindings of the variable `value` that violate the constraint. There is a validation result for each solution in that result set..."（§5.1）

### K5a-02｜预绑定变量 this/shapesGraph/currentShape；shapesGraph 可选、跨实现不保证互操作（A）
- 论断：状态机查询主要用 `$this`（焦点节点）；引用 `$shapesGraph` 会牺牲互操作性，pySHACL 甚至未实现该预绑定。
- URL：https://www.w3.org/TR/2017/REC-shacl-20170720/
- 标题：Shapes Constraint Language (SHACL)，W3C Recommendation 20 July 2017
- 机构：W3C
- 日期：2017-07-20
- 原文摘录："When the SPARQL queries of SPARQL-based constraints and the validators of SPARQL-based constraint components are processed, the SHACL-SPARQL processor pre-binds values for the variables... `this` The focus node. `shapesGraph` (Optional) ... Not all SHACL-SPARQL processors need to support this variable. Processors that do not support the variable `shapesGraph` MUST report a failure if they encounter a query that references this variable. Use of `GRAPH $shapesGraph { ... }` should be handled with extreme caution. It may result in constraints that are not interoperable across different SHACL-SPARQL processors and that may not run on remote RDF datasets."（§5.3.1）

### K5a-03｜预绑定对查询语法有硬限制：禁 MINUS/SERVICE/VALUES、禁 AS 预绑定变量（A）
- 论断：写状态机约束查询时须避开这些子句（如用 FILTER NOT EXISTS 替代 MINUS、避免 VALUES 内联候选状态——可改用 FILTER(?s NOT IN(...)) 或查询外部 shapes 常量）。
- URL：https://www.w3.org/TR/2017/REC-shacl-20170720/
- 标题：Shapes Constraint Language (SHACL)，W3C Recommendation 20 July 2017
- 机构：W3C
- 日期：2017-07-20
- 原文摘录："SPARQL queries must not contain a `MINUS` clause / SPARQL queries must not contain a federated query (`SERVICE`) / SPARQL queries must not contain a `VALUES` clause / SPARQL queries must not use the syntax form `AS ?var` for any potentially pre-bound variable / Subqueries must return all potentially pre-bound variables..."（附录 A "Pre-binding of variables"）

### K5a-04｜约束组件扩展机制：sh:parameter + sh:validator（ASK/SELECT），可封装状态机规则为可复用组件（A）
- 论断：候选状态枚举、合法迁移检查可封装成自定义约束组件在多个形状间复用，机制即 REC §6。
- URL：https://www.w3.org/TR/2017/REC-shacl-20170720/
- 标题：Shapes Constraint Language (SHACL)，W3C Recommendation 20 July 2017
- 机构：W3C
- 日期：2017-07-20
- 原文摘录："For ASK-based validators: For each value node `v` where the SPARQL ASK query returns `false` with `v` pre-bound to the variable `value`, create one solution..."（§6.3）；"The SPARQL query executions above MUST pre-bind the variables `this` and, if supported, `shapesGraph` and `currentShape`... In addition, each value of a parameter of the constraint component in the constraint MUST be pre-bound as a variable that has the parameter name as its name."（§6.3）

### K5a-05｜SHACL-AF 的自定义目标：sh:SPARQLTarget / sh:SPARQLTargetType（A）
- 论断：候选池可用 SPARQL 目标声明（SELECT 绑定 `this` 为目标节点），属 AF 扩展而非 REC Core。
- URL：https://www.w3.org/TR/shacl-af/（抓取文件 w3c_shacl_af.html/.txt，W3C Working Group Note 08 June 2017）
- 标题：SHACL Advanced Features，W3C Working Group Note
- 机构：W3C
- 日期：2017-06-08
- 原文摘录："The target nodes of T are the bindings of the variable this returned by Q against the data graph."（SPARQLTarget 定义；见 §5.3 附近）"SPARQLTargetType... a type of target that can be parameterized."（§5.4 附近；摘录为该节要义，细节以原文为准）

### K5a-06｜SHACL-AF 的 SPARQL 函数：基于 SPARQL 1.1 Extensible Value Testing（A）
- 论断：可用 SPARQL 函数把"状态迁移合法性"做成表达式级可复用逻辑，但依赖引擎支持 AF functions。
- URL：https://www.w3.org/TR/shacl-af/
- 标题：SHACL Advanced Features，W3C Working Group Note
- 机构：W3C
- 日期：2017-06-08
- 原文摘录："SPARQL engines that support SHACL functions install a new SPARQL function based on the SPARQL 1.1 Extensible Value Testing mechanism."（§7 SPARQL Functions）

### K5a-07｜AF 规则是"向数据图加三元组"的过程，多轮迭代未标准化（A）
- 论断：规则与约束本质不同（写 vs 读）；规范不保证多轮规则传播，审计晋升链式触发在规范层面无标准语义。
- URL：https://www.w3.org/TR/shacl-af/
- 标题：SHACL Advanced Features，W3C Working Group Note
- 机构：W3C
- 日期：2017-06-08
- 原文摘录："A SHACL rules engine is a computer procedure that takes as input a data graph and a shapes graph and is capable of adding triples to the data graph. The new triples that are produced by a rules engine are called the inferred triples."（§8 Rules）；"Note that this algorithm only covers a single 'iteration' over all rules, without prescribing the behavior if the same rule needs to be applied multiple times after other rules have fired. The latter is left to future work."（§8）
- 附注：SHACL-AF 1.1 草稿（https://w3c.github.io/shacl/shacl-af/，抓取文件 w3c_shacl_af11.html）保留相同措辞，说明该空白至今未补。

### K5a-08｜安全声明：SHACL-SPARQL 继承 SPARQL 全部安全问题；AF 建议只用受信任 shapes graph（A）
- 论断：运行不受信任的 SPARQL 约束/规则等于运行任意 SPARQL；项目若采纳需控制 shapes graph 来源。
- URL：https://www.w3.org/TR/2017/REC-shacl-20170720/ ；https://www.w3.org/TR/shacl-af/
- 标题：Shapes Constraint Language (SHACL)；SHACL Advanced Features
- 机构：W3C
- 日期：2017-07-20；2017-06-08
- 原文摘录："SHACL-SPARQL includes all the security issues of SPARQL."（REC 附录 E）；"The general advice is for users to only use trusted and controlled shape graphs."（AF 附录 B）

### K5a-09｜SHACL 1.2 SPARQL Extensions 草稿延续同样的预绑定与语法限制（A）
- 论断：SHACL-SPARQL 机制在现行草案（SHACL 1.2 体系）中稳定，未出现撤销或语义重写。
- URL：https://w3c.github.io/shacl/shacl-sparql/（抓取文件 w3c_shacl12_sparql_gh.html；W3C TR 版被 Cloudflare 拦截，GitHub Pages 版可访问）
- 标题：SHACL 1.2 SPARQL Extensions（Editor: Dimitris Kontokostas, University of Leipzig）
- 机构：W3C（草稿）
- 日期：未标注具体日期（抓取于 2026-08-12）
- 原文摘录："SPARQL queries must not contain a MINUS clause / SPARQL queries must not contain a federated query (SERVICE) / SPARQL queries must not contain a VALUES clause / SPARQL queries must not use the syntax form AS ?var for any potentially pre-bound variable"（与 REC 附录 A 同款限制）

### K5a-10｜W3C SHACL Test Suite 含 sparql/ 测试目录与多实现通过记录（A）
- 论断：SHACL-SPARQL 是可测试的规范面，多家实现提交了通过报告（作为"机制可用"的佐证，非性能比较）。
- URL：https://w3c.github.io/data-shapes/data-shapes-test-suite/（抓取文件 w3c_shacl_test_suite.html/.txt）
- 标题：SHACL Test Suite and Implementation Report
- 机构：W3C（data-shapes 工作组）
- 日期：未标注具体日期（抓取于 2026-08-12）
- 原文摘录："This document defines the format of the tests in the SHACL test suite, the process to use them to evaluate SHACL implementations, and lists test results from implementations that have submitted their test results."；报告中含 `sparql/node/sparql-001`、`sparql/component/validator-001` 等测试条目。

### K5a-11｜pySHACL 默认开关：advanced=False、sparql_mode=False、iterate_rules=False（A）
- 论断：pySHACL 默认不启用 SHACL-AF 扩展（targets/rules/functions 需 `-a/--advanced`）；SPARQL 约束组件本身属默认能力；远程 SPARQL 模式禁用规则。
- URL：https://github.com/RDFLib/pySHACL（README）；https://pypi.org/project/pyshacl/（PyPI JSON 元数据）
- 标题：pySHACL README / FEATURES / 源码 validator.py；pySHACL 0.40.1（PyPI 发布 2026-07-28）
- 机构：RDFLib 社区（开源）
- 日期：README 未标日期；版本 0.40.1，PyPI 上传 2026-07-28
- 原文摘录："`-a`, `--advanced` Enable features from the SHACL Advanced Features specification"；源码 `_load_default_options`：`options_dict.setdefault('advanced', False)`、`options_dict.setdefault('sparql_mode', False)`、`options_dict.setdefault('iterate_rules', False)`；"SHACL Rules (Advanced mode SPARQL-Rules) are not allowed (because the remote graph is read-only)"（README "SPARQL Remote Graph Mode" 节）

### K5a-12｜pySHACL 实现细节：shapesGraph 预绑定不支持；规则迭代上限 100（A）
- 论断：pySHACL 对 REC §5.3.1 的可选预绑定 `$shapesGraph` 未实现（写状态机查询时应避免依赖它）；AF 规则迭代是工程实现（上限 100），非规范语义。
- URL：https://github.com/RDFLib/pySHACL/blob/main/docs/features.md ；https://github.com/RDFLib/pySHACL/blob/main/pyshacl/rules/__init__.py
- 标题：pySHACL FEATURES.md；pyshacl/rules/__init__.py（源码）
- 机构：RDFLib 社区（开源）
- 日期：未标注（抓取于 2026-08-12）
- 原文摘录：FEATURES.md："sparql/pre-binding/shapesGraph-001.ttl : Prebinding to $shapesGraph is currently unsupported. This will be supported in the future."；rules/__init__.py：`RULES_ITERATE_LIMIT = 100`、"SHACL Shape Rule iteration exceeded iteration limit of 100."

### K5a-13｜TopBraid（TopQuadrant/shacl）覆盖 SHACL Core、SHACL-SPARQL 与 AF 规则（A）
- 论断：TopBraid SHACL 实现明确声明覆盖 REC 的 Core+SPARQL 校验与 AF 规则，可做约束校验与规则推理。
- URL：https://github.com/TopQuadrant/shacl（抓取文件 topbraid_shacl_readme.md）
- 标题：TopQuadrant/shacl README
- 机构：TopQuadrant / Zazuko（开源，基于 Apache Jena）
- 日期：未标注（抓取于 2026-08-12）
- 原文摘录："An open source implementation of the W3C Shapes Constraint Language (SHACL) based on Apache Jena."；"Can be used to perform SHACL constraint checking and rule inferencing"；Coverage："SHACL Core and SHACL-SPARQL validation"、"SHACL Advanced Features (Rules etc)"

### K5a-14｜Apache Jena jena-shacl：SHACL Core + SHACL SPARQL Constraints + SPARQL-based targets（A）
- 论断：Jena 官方文档确认 SPARQL 约束与 SPARQL 目标是其 SHACL 实现的一部分。
- URL：https://jena.apache.org/documentation/shacl/（抓取文件 jena_shacl.html/.txt）
- 标题：Apache Jena – SHACL
- 机构：Apache Software Foundation
- 日期：页面版权 2011-2026
- 原文摘录："`jena-shacl` is an implementation of the W3C Shapes Constraint Language (SHACL). It implements SHACL Core and SHACL SPARQL Constraints."；"In addition, it provides: SHACL Compact Syntax; SPARQL-based targets"

### K5a-15｜RDF4J ShaclSail：支持 sh:sparql、sh:select、sh:SPARQLTarget；DASH/RSX 需显式开启（A）
- 论断：RDF4J 的 SHACL 支持列表明确含 SPARQL 约束与 SPARQL 目标；DASH/RSX 扩展是实验性开关；"SPARQL is not supported" 指不能用 SPARQL 更新保留图里的 shapes（需防误读）。
- URL：https://rdf4j.org/documentation/programming/shacl/（抓取文件 rdf4j_shacl.html/.txt）
- 标题：RDF4J – SHACL Support（ShaclSail）
- 机构：Eclipse RDF4J 项目
- 日期：未标注（抓取于 2026-08-12）
- 原文摘录："By default, the ShaclSail uses a reserved graph (`http://rdf4j.org/schema/rdf4j#SHACLShapeGraph`) for storing the SHACL shapes... SPARQL is not supported."（上下文为用 SPARQL 更新 shapes 的警告："Do not use SPARQL to update your shapes!"）；Supported features 含 "`sh:sparql`"、"`sh:select`"、"`sh:target` for use with DASH targets and `sh:SPARQLTarget`"

### K5a-16｜shaclex：SHACL/ShEx 验证器，声称通过 shacl-core 兼容测试（A）
- 论断：shaclex 可经 Jena/RDF4J 或外部 SPARQL endpoint 验证，兼容测试通过 shacl-core 套件。
- URL：https://github.com/labra/shaclex（抓取文件 shaclex_readme.md）
- 标题：shaclex README
- 机构：开源项目（labra / Universidad de Oviedo 关联）
- 日期：未标注（抓取于 2026-08-12）
- 原文摘录："The current implementation passes all [shacl-core tests](https://w3c.github.io/data-shapes/data-shapes-test-suite/)."；"It is also possible to use [Jena SHACL]... using: --engine JenaSHACL"

### K5a-17｜图书佐证：Validating RDF Data (2018) 描述 SHACL-SPARQL 为 SPARQL 扩展机制（A）
- 论断：学术图书把 SHACL 分成 Core 与 SHACL-SPARQL（SPARQL 扩展机制），与 REC 一致。
- URL：https://book.validatingrdf.com/bookHtml011.html（第 6 章 SHACL，抓取文件 validatingrdf_book_011.html）
- 标题：Validating RDF Data（Jose E. Labra Gayo, Eric Prud'hommeaux, Iovka Boneva, Dimitris Kontokostas）
- 机构：Morgan & Claypool（Synthesis Lectures on the Semantic Web）
- 日期：2018（版权 © 2018）
- 原文摘录："...while the second part describes an extension mechanism in terms of SPARQL and has been called: SHACL-SPARQL. Two working group notes have been published to extend SHACL with (a) advanced features such as rules and complex expressions and (b) to enable the definition of constraint components in Javascript (called SHACL-Javascript)."

### K5a-18｜学术相关：图更新下 SHACL 静态验证（ISWC 2025）（A）
- 论断：学界研究的是"图更新后约束是否保持/更新序列的静态验证"，不是状态机语义本身；说明"随时间变化的状态校验"仍是开放研究区，无现成状态机组件。
- URL：https://arxiv.org/abs/2508.00137（抓取文件 arxiv_2508_00137.html）
- 标题：SHACL Validation under Graph Updates（Extended Paper）
- 机构：arXiv（会议：ISWC 2025）
- 日期：2025-08（提交）
- 原文摘录："In this paper, we study SHACL validation in RDF graphs under updates. We present a SHACL-based update language that can capture intuitive and realistic modifications on RDF graphs and study the problem of static validation under such updates."

### K5a-19｜学术相关：含本体的 SHACL 验证语义与重写（TU Wien, 2025）（A）
- 论断：学术工作把 SHACL 当作可判定的约束语言研究（与本体/递归组合时的语义与复杂度），可作为"SHACL 作为形式化约束语言"的背景依据。
- URL：https://arxiv.org/html/2507.12286v1（抓取文件 arxiv_2507_12286.html）
- 标题：SHACL Validation in the Presence of Ontologies: Semantics and Rewriting Techniques
- 机构：TU Wien（Anouk Oudshoorn, Magdalena Ortiz, Mantas Šimkus）
- 日期：2025-07-16
- 原文摘录（摘要）："We study SHACL validation in RDF graphs under updates..."（同 K5a-18 摘录勿混；本篇摘录）"SHACL (SHApe Constraint Language) is a W3C standardized constraint language for RDF graphs..."（以页面 Abstract 为准）

### K5a-20｜推断：迁移约束的可声明性取决于数据模型是否显式记录前状态/时序事实（C）
- 论断：在"只有当前状态快照"的模型上，"promoted 必须来自 audited"不可判定；在有显式审计事件/前状态谓词的模型上可写成 SPARQL 约束。此为组合推断（基于 K5a-01/02/03 的机制 + 图数据建模常识），证据等级 C。
- URL：无单一来源；依据 K5a-01/02/03（REC）推断
- 标题：—
- 机构：—
- 日期：—
- 原文摘录：见 K5a-01/02/03（推断依据）；结论本身无原文，标 C。

### K5a-21｜推断：处置单单点与"一条边一次晋升"可用声明式表达，工作流全局唯一性看建模（C）
- 论断：处置单-边的一一对应可用 `sh:minCount/sh:maxCount` 或 SPARQL 约束声明；"全局只存在一个活动处置单/一次晋升"若涉及跨实体计数也可用 SPARQL 约束（聚合需注意 REC 禁 VALUES 等限制）；若指时序上"同一时刻唯一"则需时间戳建模与过程式判定。标 C。
- URL：无单一来源；依据 K5a-01（REC）与 K5a-03（语法限制）推断
- 标题：—
- 机构：—
- 日期：—
- 原文摘录：—

### K5a-22｜未核：Stardog、GraphDB、dotNetRDF 的 SHACL-SPARQL 支持细节（未核）
- 论断：无法从原文核证（Stardog 文档页 404/跳 404.html；GraphDB 文档被反爬拦截；dotNetRDF 用户指南仅见一句 "Validating RDF using SHACL" 而无 SHACL-SPARQL 细节）。不采信任何关于这三者的二手说法。
- URL：https://docs.stardog.com/querying/shacl/（404）；https://graphdb.ontotext.com/documentation/10.8/shacl-validation.html（反爬，抓到 214 字节拦截页）；https://dotnetrdf.org/docs/（用户指南）
- 标题：Stardog SHACL 文档 / GraphDB SHACL 文档 / dotNetRDF 文档
- 机构：Stardog / Ontotext / dotNetRDF
- 日期：—
- 原文摘录：未核（无原文）
- 等级：未核

### K5a-23｜二手文章：Kurt Cagle《Validating ANYTHING With SHACL》（B）
- 论断：业界作者把 SHACL 视为"通用约束/形状语言"，提到 SPARQL 可表达推理式规则；作为背景性二手来源，不支撑具体技术论断。
- URL：https://ontologist.substack.com/p/validating-anything-with-shacl（抓取文件 cagle_validating_anything_shacl.html）
- 标题：Validating ANYTHING With SHACL
- 机构：Substack（作者 Kurt Cagle）
- 日期：2025-08-23
- 原文摘录："...the rise of SPARQL, which made it possible to create ad hoc queries that could do everything that inferencing rules could do, but were easier to express... A shape can describe an individual node or class of nodes, a property, or other constraints, including those described by SPARQL, a function, or templates of various sorts."
- 等级：B（二手/观点）

---

## 3 冲突与张力

1. **约束只读 vs 规则写图**：SHACL-SPARQL 约束（REC §5/6）是只读判定；SHACL-AF 规则（§8）会向数据图添加三元组。项目若"用规则自动晋升 + 用约束校验晋升结果"混用，需定义执行顺序与幂等性；规范未规定二者编排（A 级依据，K5a-01/07）。
2. **shapesGraph 可选预绑定 vs 跨实现可移植**：REC 明确 `$shapesGraph` 可选且"not interoperable across different SHACL-SPARQL processors"，pySHACL 直接标注不支持；写状态机查询若依赖 shapes 图内常量/参数将不可移植（A 级，K5a-02/12）。
3. **附录 A 语法限制 vs 复杂状态查询的惯用写法**：禁 MINUS/SERVICE/VALUES 且禁对预绑定变量用 AS，而"候选状态集合"惯用 VALUES/IN 内联或 MINUS 排除——需改写为 FILTER NOT EXISTS、FILTER(?s NOT IN(...)) 或外部前缀常量；限制是 MUST 级，违规 shapes graph 必须报 failure（A 级，K5a-03/09）。
4. **AF 规则迭代未标准化 vs 工程默认有上限**：规范说多轮规则"left to future work"，pySHACL 用 `RULES_ITERATE_LIMIT=100` 逼近稳态；审计晋升链若超过迭代上限会报错——"自动化"程度是工程行为而非规范保证（A 级，K5a-07/12）。
5. **"默认是否启用 SPARQL 扩展"的表述陷阱**：SPARQL 约束组件（REC 层）通常默认可用；被默认关闭的是 SHACL-AF（pySHACL `advanced=False`）与可选模式（远程 SPARQL 禁规则）。若报告/文档笼统说"默认禁用 SPARQL 扩展"，会把两个不同层面混在一起（A 级，K5a-11）。
6. **工具对"SPARQL 更新 shapes"的警告与 SPARQL 约束支持的并存**：RDF4J 文档同时说"SPARQL is not supported"（指用 SPARQL 更新保留 shapes 图）与支持 `sh:sparql` 约束——同一词"SPARQL"两种含义，引用须带上下文（A 级，K5a-15）。
7. **状态机"迁移"的语义缺口**：规范与搜索均未提供"状态机转换约束"的标准组件；"promoted 必须来自 audited"是否可判定完全取决于数据模型是否记录前状态/时序——这是本项目需在 B8 锚点方法层面解决的建模决策，本分支只给出机制与限制（C 级推断，K5a-20）。

---

## 4 未决

1. **Stardog SHACL 文档**：`docs.stardog.com/querying/shacl/` 返回 404/跳转 404 页（含 wayback 重试受限）；其 SHACL-SPARQL 支持细节**未核**。
2. **GraphDB SHACL 文档**：`graphdb.ontotext.com/documentation/10.8/shacl-validation.html` 被反爬拦截（sgcaptcha，214 字节），jina reader 亦只回缓存壳；其 SHACL-SPARQL/AF 支持细节**未核**。
3. **dotNetRDF SHACL 细节**：用户指南仅见一句 "Validating RDF using SHACL"；是否支持 SPARQL 约束/AF 未核。
4. **"处置单单点"在项目数据模型中的精确定义**：是"一条边最多一张处置单"（可声明）还是"全局同时只有一个活动处置单/一次晋升"（需时序建模+过程式判定）——取决于 B5/B8 的模型决策，本分支**未决**。
5. **状态机校验先例**：未检索到"SHACL 直接作为状态机校验器"的现成实现/文章；相关最近工作是图更新下的静态验证（ISWC 2025，K5a-18），是否可复用其框架未评估（归 B8 或后续分支）。
6. **SHACL 1.2 系列正式化进度**：SHACL 1.2 SPARQL Extensions / AF 1.1 均为 w3c.github.io 草稿，正式 REC 状态与发布日未核（W3C TR 版被 Cloudflare 拦截）。
7. **W3C SHACL UCR 的原文**：`w3.org/TR/shacl-ucr/` 直接抓取被 Cloudflare 拦截，jina 拿到全文但 URL 权威性略降；未作为关键论断的唯一来源（仅作背景）。

---

## 5 来源清单

> 类型：规范 / 工程文档·源码 / 学术·图书 / 博客·社区。等级：A=原文到手，B=二手，未核=未核证。

### 规范（W3C）— 7 条
| # | 来源 | URL | 日期 | 等级 |
|---|---|---|---|---|
| S1 | SHACL W3C Recommendation | https://www.w3.org/TR/2017/REC-shacl-20170720/ | 2017-07-20 | A |
| S2 | SHACL Advanced Features (WG Note) | https://www.w3.org/TR/shacl-af/ | 2017-06-08 | A |
| S3 | SHACL Use Cases and Requirements | https://www.w3.org/TR/shacl-ucr/ | 2017-06-08 | A |
| S4 | SHACL 1.2 SPARQL Extensions（草稿） | https://w3c.github.io/shacl/shacl-sparql/ | 未标注（抓取 2026-08-12） | A |
| S5 | SHACL Advanced Features 1.1（草稿） | https://w3c.github.io/shacl/shacl-af/ | 未标注（抓取 2026-08-12） | A |
| S6 | SHACL Test Suite and Implementation Report | https://w3c.github.io/data-shapes/data-shapes-test-suite/ | 未标注（抓取 2026-08-12） | A |
| S7 | data-shapes gh-pages 历史编辑稿（辅证） | https://w3c.github.io/data-shapes/shacl/ | 历史版本（抓取 2026-08-12） | B |

### 工程文档·源码 — 9 条
| # | 来源 | URL | 日期 | 等级 |
|---|---|---|---|---|
| S8 | pySHACL README / CLI | https://github.com/RDFLib/pySHACL | 版本 0.40.1（PyPI 2026-07-28） | A |
| S9 | pySHACL FEATURES.md | https://github.com/RDFLib/pySHACL/blob/main/docs/features.md | 未标注 | A |
| S10 | pySHACL 源码 validator.py / rules/__init__.py | https://github.com/RDFLib/pySHACL | 未标注 | A |
| S11 | TopQuadrant/shacl README | https://github.com/TopQuadrant/shacl | 未标注 | A |
| S12 | Apache Jena SHACL 文档 | https://jena.apache.org/documentation/shacl/ | 版权 2011-2026 | A |
| S13 | RDF4J ShaclSail 文档 | https://rdf4j.org/documentation/programming/shacl/ | 未标注 | A |
| S14 | shaclex README | https://github.com/labra/shaclex | 未标注 | A |
| S15 | DASH（Data Shapes）首页 | https://datashapes.org/ | 未标注 | B |
| S16 | dotNetRDF 用户指南 | https://dotnetrdf.org/docs/ | 未标注 | B |

### 学术·图书 — 3 条
| # | 来源 | URL | 日期 | 等级 |
|---|---|---|---|---|
| S17 | Validating RDF Data（第 6 章 SHACL） | https://book.validatingrdf.com/bookHtml011.html | 2018 | A |
| S18 | SHACL Validation under Graph Updates（ISWC 2025） | https://arxiv.org/abs/2508.00137 | 2025-08 | A |
| S19 | SHACL Validation in the Presence of Ontologies（TU Wien） | https://arxiv.org/html/2507.12286v1 | 2025-07-16 | A |

### 博客·社区 — 1 条
| # | 来源 | URL | 日期 | 等级 |
|---|---|---|---|---|
| S20 | Kurt Cagle, Validating ANYTHING With SHACL | https://ontologist.substack.com/p/validating-anything-with-shacl | 2025-08-23 | B |

### 未核（尝试过但未获原文）
| # | 来源 | URL | 结果 |
|---|---|---|---|
| S21 | Stardog SHACL 文档 | https://docs.stardog.com/querying/shacl/ | 404/跳 404 页，未核 |
| S22 | GraphDB SHACL 文档 | https://graphdb.ontotext.com/documentation/10.8/shacl-validation.html | 反爬拦截，未核 |

合计：可核来源 20（S1–S20），未核 2（S21–S22）。A 级原文 16 条（S1–S6、S8–S14、S17–S19），B 级 4 条（S7、S15、S16、S20）。

---

## 6 判死自查

| 红线 | 要求 | 实测 | 结果 |
|---|---|---|---|
| 可核来源数 | ≥15 | 20（S1–S20） | ✅ |
| 原文到手数 | ≥10 | 16（A 级） | ✅ |
| 来源类型数 | ≥3 | 4（W3C 规范、工程文档·源码、学术·图书、博客·社区） | ✅ |
| 候选逐一查证 | ≥5 | 11：W3C REC/AF/UCR/1.2SPARQL/AF1.1/TestSuite、pySHACL、TopBraid、Jena、RDF4J、shaclex、DASH、dotNetRDF、Stardog(404)、GraphDB(反爬)、Validating RDF 书、arXiv×2 | ✅ |
| 关键词组 | ≥4 | 8：①SHACL-SPARQL constraint components specification（REC 抓取）②SHACL state machine validation workflow（DDG 搜索已存）③SHACL Advanced Features rules（AF 抓取）④pyshacl SPARQL-based constraints security（DDG 搜索已存）⑤SHACL-SPARQL 约束组件 规范（Bing 中文）⑥SHACL-AF 规则 自动化（Bing 中文）⑦SHACL 状态机 校验 工作流（Bing 中文）⑧pyshacl SPARQL 扩展（Bing 中文） | ✅ |
| 关键论断带证据五件套 | URL+标题+机构+日期+摘录 | 全部 K5a-01~19、23 满足；推断类 K5a-20/21 标 C 并注明无单一来源；K5a-22 标未核 | ✅ |
| 不捏造来源 | — | 所有摘录均来自 tmp/b5a/ 实际抓取文件；Stardog/GraphDB 写"未核" | ✅ |
| 推断标 C | — | K5a-20/21 标 C；第 0/1 节中可表达性结论均带 C 标注 | ✅ |
| 禁止项：性能评测 | 不做 | 全文无性能数据/基准比较 | ✅ |
| 禁止项：厂商比较 | 不比较 | 仅并列陈述各实现文档原文（支持面），无优劣比较 | ✅ |
| 禁止项：越界（工具生态归 B5b、锚点方法归 B8） | 不越界 | 无工具生态横向评测；状态机建模决策仅提示归属 B8 未展开 | ✅ |

**结论：本分支未判死，产出可用；遗留 4 个未决项（见第 4 节）交 master_db 跟踪。**