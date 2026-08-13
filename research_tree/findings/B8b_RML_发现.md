# B8b 发现：RML/YARRRML 映射工程成熟度与迁移工具链

> 分支：B8b（B8 校验迁移系 R3 子任务）｜调研员：深度调研树分支 B8b｜产出日期：2026-08-12
> 证据规则：关键论断带 URL+标题+机构+日期+原文摘录+证据等级（A 原文到手 / B 二手 / C 推断）；抓不到写"未核"；推断一律标 C；不做处理器性能评测；schema 演化归 B8a。

## 0 一句话结论

RML 及 RML-Core 提供了由"结构化数据（含 JSON/JSONPath 逻辑源）→ RDF 三元组"的成熟机械映射能力，并有 RMLMapper、SDM-RDFizer、RocketRML、Morph-KGC、CARML、RMLStreamer 等多个可查证且部分活跃维护的处理器与 rml.io 官方 JSON 教程背书，但 RML 与 RML-Core 均为"无正式标准地位"的草案（唯一 W3C 正式标准是 2012 年的 R2RML REC）；YARRRML 以 YAML 文本提供人可读、可 grep/可版本化的规则层，配合 Turtle 规则文本、SHACL 形状校验与 JSONPath+iterator，足以支撑"JSONL 行→RDF"管线；而"JSONL→属性图"在 RML 生态中无原生输出，需自行转换或维持 RDF 形态（推断 C）。

## 1 逐条回答

### Q1 RML 规范（rml.io）与 RML-Core 的映射构件：triples map、logical source、term map 官方原文；自述标准地位

- **RML（rml.io 维护版，v1.1.2）**：`rml.io/specs/rml` 页面自述为 "Unofficial Draft 20 June 2024"；开篇即声明 "This document is a draft of a potential specification. It has no official standing of any kind and does not represent the support or consensus of any standards organization."（本文件无任何正式地位，不代表任何标准组织的支持或共识）。其自述为 R2RML 的扩展/超集："This document describes RML, a generic mapping language, based on and extending [R2RML]." 与 "RML is defined as a superset of the W3C-standardized mapping language [R2RML]"；"RML follows exactly the same syntax as R2RML; therefore, RML mappings are themselves RDF graphs."
- **映射构件官方原文（RML v1.1.2 词表节）**：`rr:TriplesMap is the class of triples maps as defined by R2RML.`；`rml:LogicalSource is the class of logical sources.`；`rr:TermMap is the class of term maps, as defined by R2RML. It has four subclasses:`（即 subject/predicate/object/graph 四类 term map）；另含 `rml:version`（"version identifier，imported from R2RML vocabulary"）。JSON 源示例："rml:logicalSource [ rml:source "Venue.json"; rml:referenceFormulation ql:JSONPath; rml:iterator "$.venue[*]" ]"。
- **RML-Core（W3C KG-construct 社区组）**：`w3id.org/rml/core` 自述 "Ontology Specification Draft"，Revision 0.1.0，Publisher = W3C Knowledge Graph Construction Community Group；JSON-LD 元数据 datePublished = "Wed Apr 19 19:52:02 UTC 2023"。其 ontology.ttl（原文到手）定义了 `<http://w3id.org/rml/TriplesMap> rdf:type owl:Class`、`<http://w3id.org/rml/logicalSource> rdf:type owl:ObjectProperty`（domain TriplesMap，range AbstractLogicalSource）、`<http://w3id.org/rml/TermMap> rdf:type owl:Class`、`<http://w3id.org/rml/AbstractLogicalSource> rdf:type owl:Class` 等；crossref 页定义 "Abstract Logical Source：An iterable that can be associated with a triples map such that a data source can be mapped to RDF triples."、"Triples Map：Represents a triples map."。
- **R2RML（唯一正式标准）**：W3C "R2RML: RDB to RDF Mapping Language"，W3C Recommendation 27 September 2012；triples map 原文："Each logical table is mapped to RDF using a triples map. The triples map is a rule that maps each row in the logical table to a number of RDF triples."
- **自述标准地位小结**：RML（rml.io 版）与 RML-Core 均自称 draft / 无正式地位；RML v1.1.2 还明确指出 "The Knowledge Graph Construction W3C Community Group is developing a new version of the RML specification at https://w3id.org/rml/portal … This document covers the original RML specification."，即两套规范并存的官方自述。

### Q2 YARRRML 语法对人可读性的承诺与参考实现（YARRRML Parser）支持的 profile

- **人可读承诺**：YARRRML 规范（rml.io/yarrrml/spec，canonicalURI `https://w3id.org/yarrrml/spec/`）开篇原文："YARRRML (pronounced /jɑɹməl/) is a human readable text-based representation for declarative generation rules. It is a subset of [[YAML]], a widely used data serialization language designed to be human-friendly."。2018-10-01 W3C semantic-web 邮件列表发布信同样以 "YARRRML: human readable text-based representation for declarative Linked Data generation rules" 为题。
- **Profiles（规范原文）**："This specification includes the following main profiles for tools that process YARRRML documents: R2RML: applies the semantics specified by [[R2RML]]; RML: applies the semantics specified by [[RML]]; and RMLT: applies the semantics specified by [[RMLT]]. RMLAHT: applies the semantics specified by [[RMLATH]]. RMLTDT: applies the semantics specified by [[RMLTDT]]."（另有 FORMATS/COMP/VOID/FnO/DCAT/D2RQ/SD/CSVW/WOT 等扩展 profile）。规范状态为 unofficial（respec specStatus: "unofficial"，previousPublishDate: 2021-09-30）。
- **参考实现（YARRRML Parser，RMLio/yarrrml-parser）**：README 原文："This library allows to convert YARRRML rules to RML or R2RML rules."；"By default, the parser generates RML rules. If you want to generate R2RML rules add `-f R2RML`."；反向工具 "yarrrml-generator：If you want to generate YARRRML rules from an RML document…"。README 只显式提 RML/R2RML 两种输出，未提 RMLT/RMLTDT；但本地 clone（commit 93a76eee，2026-06-11；package.json version 1.12.2）源码 `lib/abstract-generator.js` 中存在生成 `rml:logicalTarget` 命名节点的逻辑（`namedNode(namespaces.rml + 'logicalTarget')`），即代码层面对 RMLT（logical target）有生成支持——规范文档与 README 的 profile 粒度不一致（见第 3 节冲突）。

### Q3 RML 处理器生态：维护中的实现及其输入/输出（官方仓库为据，不做性能比较）

按官方仓库 README 逐一查证（候选 10 个，详见第 2 节与第 5 节）：
- **RMLMapper**（RMLio/rmlmapper-java，Java/Maven）："The RMLMapper executes RML rules to generate Linked Data." 本地源 Excel(.xlsx)/ODS/CSV（含 CSVW）/JSON（JSONPath，`@` 选当前对象）/XML（XPath）；远程源关系库（MySQL/PostgreSQL/Oracle/SQLServer）、WoT Web API、SPARQL 端点、HTTP 文件；输出 nquads（默认）/turtle/trig/trix/jsonld/hdt/jelly；targets 本地文件、VoID dataset、SPARQL UPDATE、HTTP request、动态 logical target。维护证据：GitHub API 显示 pushed_at=2026-02-17、archived=false、stars=202；最新 release v8.1.0（release 页 "23 Dec"，年份未在页面呈现；"Requires Java version >= 21"）。README 明示："All functionalities above refer to using RML as maintained at https://rml.io/specs/rml. There is some support for RML as developed within W3C's Knowledge Graph Construction Community Group"。
- **SDM-RDFizer**（SDM-TIB/SDM-RDFizer，Python/PyPI rdfizer）："The current version of the SDM-RDFizer assumes mapping rules are defined in the RDF Mapping Language (RML)… SDM-RDFizer is able to process data from heterogeneous data sources (CSV, JSON, RDB, XML)"；安装/运行 "python3 -m pip install rdfizer; python3 -m rdfizer -c /path/to/config/file"。（其 README 另含性能对比章节——按红线，本调研不引用、不转述任何性能结论。）
- **RocketRML**（semantifyit/RocketRML，JavaScript/npm）："This is a javascript RML-mapper implementation for the RDF mapping language (RML)."；`npm install rocketrml`；输出写到 ./out.n3；支持 XML/JSON/CSV，查询语言 JSONPath/XPath/csv-parse。GitHub 页显示 289 commits、28 stars、15 forks；最近提交日期未通过 API 取得（rate limit），标未核。
- **Morph-KGC**（morph-kgc/morph-kgc，Python）："an engine that constructs RDF knowledge graphs from heterogeneous data sources with the R2RML and RML mapping languages"；特性含 YARRRML、RML-FNML（含 Python UDF）、RML-star、RML views；输入 CSV/TSV/Excel/Parquet/Feather/ORC/Stata/SAS/SPSS/ODS、JSON/XML、内存 Python 字典/DataFrame、Neo4j/Kùzu；集成 RDFLib/Oxigraph/Kafka；`pip install morph-kgc`；Apache-2.0。
- **CARML**（carml/carml，Java/RDF4J/Maven）："CARML is built on RDF4J, and currently the Mapper directly outputs an RDF4J Model"；JSON/XML/CSV 三个 logical-source resolver（jsonpath/xpath/csv）；并提供 SHACL shapes 图 rml.sh.ttl 校验 RML 映射（见 Q5）。
- **RMLStreamer**（RMLio/RMLStreamer，Flink/Docker）："The RMLStreamer generates RDF from files or data streams using RML. The difference with other RML implementations is that it can handle big input files and continuous data streams, like sensor data."
- **RML Implementation Report**（rmlio.github.io/rml-implementation-report，Unofficial Draft 2022-02-17）列出处理器：RMLMapper 4.9.0、CARML 0.3.0、RocketRML 1.0.6、SDM-RDFizer 3.2、RMLStreamer 2.0.0、Chimera 2.1、Morph-KGC 1.4.0（测试日期 2019–2021，较早；不据此论断当前维护状态）。
- **rml.io Tools 页**还列出 RMLWeaver-JS、RMLEditor、Matey、YARRRML Parser、RML Playground（RML.kgc/Burp 与 RML.rmlio/RMLMapper）、wrappers（rmlmapper-java-wrapper-js、rmlmapper-webapi-js、fetch-rmlmapper-java-js）与校验工具 Validatrr——即官方站点自述的完整工具链生态。

### Q4 从"现有 JSONL 行"映射到 RDF 三元组/属性图：源为 JSON 的 logical source 是否成熟

- **JSON 源成熟度高（多源 A 级证据）**：RML 规范自带 JSON 示例（Venue.json + ql:JSONPath + iterator）；rml.io 官方教程 "Tutorial: Generate RDF from a JSON file"（characters.json 完整 Turtle 规则）；RML Test Cases 含 RMLTC0000-JSON（Unofficial Draft 2019-03-01）；RMLMapper/SDM-RDFizer/RocketRML/Morph-KGC/CARML 均在其官方 README 列出 JSON 输入支持；YARRRML 规范提供 jsonpath 引用格式示例。
- **"JSONL 行作为 rml:source 的专门先例"未找到**：未检索到把 JSON Lines（.jsonl）文件直接作为 logical source、iterator 指向"行"的官方教程/规范级先例——标"未核"。JSON Lines 格式本身有独立规范站点 jsonlines.org 定义（三要求：UTF-8 编码、每行是一个合法 JSON 值、行终止符为 '\n'，扩展名 .jsonl）。"把 .jsonl 视为 JSON 逻辑源、以 JSONPath+iterator 组合逐行/逐记录映射"属于合理推断（标 C，且不同处理器对顶层数组/流式行的处理未见统一声明）。
- **输出到属性图**：RML 生态的 target/serialization 均为 RDF 三元组（nquads/turtle/trig/trix/jsonld/hdt/jelly、SPARQL endpoint、HTTP 等）；Morph-KGC 支持向 Neo4j/Kùzu 写入，但 README 未描述其 RML 输出为属性图模型，"JSONL→属性图"在 RML 规范/主流处理器中无原生输出，需自行转换——推断 C。

### Q5 映射规则本身的版本化与校验：规则可 grep/可审计吗——与"校验规则可版本化"增益的关系

- **规则是文本（A）**：RML 规则是 Turtle（"RML mappings are themselves RDF graphs"，且与 R2RML 同语法）；YARRRML 是 YAML 文本。二者都是纯文本，因此可 grep、可 diff、可进 git 做版本化与审计——此为基于 A 级事实的合理推断（标 C）。
- **规则自身版本元数据（A）**：RML 规范词表含 `rml:version`（"version identifier, imported from R2RML vocabulary"）。
- **规则校验工具（A）**：CARML README："We're not set up for full mapping validation yet. But … we've created a SHACL shapes graph (here: carml/rml.sh.ttl) that validates RML mappings."；其 rml.sh.ttl 原文到手："This shapes graph can be used to validate RML mapping graphs."，含 sh:targetClass rr:TriplesMap / rml:LogicalSource / rr:SubjectMap 等。RML2SHACL（RMLio/RML2SHACL）："A tool to generate SHACL shapes from RML mapping files for RDF graphs validation."。rml.io Tools 页亦列 Validatrr："A validation approach using rule-based reasoning."（其 README 呈现的是基于 EYE/N3Unit 的通用校验工作流，含 "Docker - RML Validate" 对 rml 文件运行 n3unit-rml 输出 output.ttl 的命令，但未给出针对 RML 映射的具体校验规则细节，表述需谨慎）。
- **跨版本迁移工具（A）**：RMLMapper CLI 提供 `--convert-mapping`："Only convert the mapping to the latest RML specification by the W3C Community Group"——即存在把规则从 rml.io 版迁移到 KG-construct/RML-Core 版的最小工具路径（该开关为"仅转换"模式）。
- **与"校验规则可版本化"增益的关系（C 推断）**：因为映射规则与校验形状（SHACL shapes）同为文本工件，可一并纳入版本控制、随数据/模式变更审计；但"规则校验器是否成熟到可作为 CI 门禁"未完全确认（Validatrr 细节不足，CARML 自述"not set up for full mapping validation yet"），故该增益为"可行但工程成熟度部分未核"。

## 2 关键发现（论断 + URL + 标题 + 机构 + 日期 + 原文摘录 + 等级）

1. **RML（rml.io 版）自述无正式标准地位，v1.1.2**
   - URL: https://rml.io/specs/rml/ ｜ 标题: RDF Mapping Language (RML) ｜ 机构: rml.io（编辑 Anastasia Dimou, DTAI-KU Leuven 等）｜ 日期: Unofficial Draft 20 June 2024（版本 v1.1.2）
   - 摘录: "This document is a draft of a potential specification. It has no official standing of any kind and does not represent the support or consensus of any standards organization."；"The version of this document is v1.1.2."
   - 等级: A

2. **RML 是 R2RML 的超集/扩展，规则本身是 RDF 图**
   - URL: https://rml.io/specs/rml/ ｜ 同上
   - 摘录: "This document describes RML, a generic mapping language, based on and extending [R2RML]."；"RML is defined as a superset of the W3C-standardized mapping language [R2RML]… RML follows exactly the same syntax as R2RML; therefore, RML mappings are themselves RDF graphs."
   - 等级: A

3. **RML 三构件官方定义（TriplesMap / LogicalSource / TermMap）**
   - URL: https://rml.io/specs/rml/ ｜ 同上
   - 摘录: "rr:TriplesMap is the class of triples maps as defined by R2RML."；"rml:LogicalSource is the class of logical sources."；"rr:TermMap is the class of term maps, as defined by R2RML. It has four subclasses:"；"rml:version — version identifier — imported from R2RML vocabulary"
   - 等级: A

4. **RML 规范自带 JSON 逻辑源示例（JSONPath 为 JSON 默认引用格式）**
   - URL: https://rml.io/specs/rml/ ｜ 同上
   - 摘录: "JSONPath is the default reference formulation used by RML for references to JSON data sources."；"rml:logicalSource [ rml:source "Venue.json"; rml:referenceFormulation ql:JSONPath; rml:iterator "$.venue[*]" ]"
   - 等级: A

5. **RML-Core 为 W3C KG-construct 社区组发布的 Ontology Specification Draft（Revision 0.1.0）**
   - URL: http://w3id.org/rml/core/ ｜ 标题: RML-Core: Generic Mapping Language for RDF ｜ 机构: W3C Knowledge Graph Construction Community Group（publisher 链接 https://www.w3.org/community/kg-construct/）｜ 日期: datePublished "Wed Apr 19 19:52:02 UTC 2023"
   - 摘录: "Ontology Specification Draft"；"Revision: 0.1.0"；"Publisher: https://www.w3.org/community/kg-construct/"
   - 等级: A

6. **RML-Core 词表包含 TriplesMap/logicalSource/TermMap/AbstractLogicalSource**
   - URL: http://w3id.org/rml/core/ontology.ttl（及文档页 crossref 节）｜ 同上 ｜ 2023
   - 摘录: "<http://w3id.org/rml/TriplesMap> rdf:type owl:Class"；"<http://w3id.org/rml/logicalSource> rdf:type owl:ObjectProperty; rdfs:domain <http://w3id.org/rml/TriplesMap>; rdfs:range <http://w3id.org/rml/AbstractLogicalSource>"；"<http://w3id.org/rml/TermMap> rdf:type owl:Class"；文档: "Abstract Logical Source — An iterable that can be associated with a triples map such that a data source can be mapped to RDF triples."
   - 等级: A

7. **R2RML 是唯一 W3C 正式标准；triples map 定义**
   - URL: https://www.w3.org/TR/r2rml/ ｜ 标题: R2RML: RDB to RDF Mapping Language ｜ 机构: W3C ｜ 日期: W3C Recommendation 27 September 2012
   - 摘录: "Each logical table is mapped to RDF using a triples map. The triples map is a rule that maps each row in the logical table to a number of RDF triples."
   - 等级: A

8. **YARRRML 自述人可读、YAML 子集**
   - URL: https://rml.io/yarrrml/spec/（canonicalURI: https://w3id.org/yarrrml/spec/）｜ 标题: YARRRML ｜ 机构: rml.io / KG-construct 系 ｜ 日期: unofficial（respec previousPublishDate 2021-09-30）
   - 摘录: "YARRRML (pronounced /jɑɹməl/) is a human readable text-based representation for declarative generation rules. It is a subset of [[YAML]], a widely used data serialization language designed to be human-friendly."
   - 等级: A

9. **YARRRML 规范 profile 列表（R2RML/RML/RMLT/RMLAHT/RMLTDT）**
   - URL: https://rml.io/yarrrml/spec/ ｜ 同上
   - 摘录: "This specification includes the following main profiles… R2RML: applies the semantics specified by [[R2RML]]; RML: applies the semantics specified by [[RML]]; and RMLT: applies the semantics specified by [[RMLT]]."
   - 等级: A

10. **YARRRML 规范含 JSON 源示例（access/referenceFormulation/iterator）**
    - URL: https://rml.io/yarrrml/spec/ ｜ 同上
    - 摘录: "sources: person-source: access: data/person.json; referenceFormulation: jsonpath; iterator: $" → "<#LogicalSource> a rml:LogicalSource; rml:source "data/person.json"; rml:referenceFormulation ql:JSONPath; rml:iterator "$"."
    - 等级: A

11. **YARRRML Parser 参考实现：YARRRML→RML/R2RML，可反向生成**
    - URL: https://github.com/RMLio/yarrrml-parser（README）｜ 机构: RMLio / Ghent University – imec（LICENSE: "copyrighted by Ghent University – imec… MIT"）
    - 摘录: "This library allows to convert YARRRML rules to RML or R2RML rules."；"If you want to generate R2RML rules add -f R2RML."；"If you want to generate YARRRML rules from an RML document, you do the following: yarrrml-generator -i rules.rml.ttl."
    - 等级: A（另本地 clone commit 93a76eee 2026-06-11、package version 1.12.2，源码含 rml:logicalTarget 生成逻辑）

12. **W3C 邮件列表发布 YARRRML（人可读声明）**
    - URL: https://lists.w3.org/Archives/Public/semantic-web/2018Oct/0000.html ｜ 标题: YARRRML: human readable text-based representation for declarative Linked Data generation rules ｜ 机构: W3C semantic-web@w3.org 邮件列表 ｜ 日期: Mon, 1 Oct 2018（Pieter Heyvaert 等）
    - 摘录: "We present YARRRML [1,2]: a human readable text-based representation for declarative Linked Data generation rules. It is a subset of YAML… It can already be used to represent R2RML and RML rules."
    - 等级: A

13. **RMLMapper 是维护中的 Java 处理器（支持源/输出/targets 官方清单）**
    - URL: https://github.com/RMLio/rmlmapper-java（README；GitHub API json）｜ 机构: RMLio ｜ 日期: pushed_at=2026-02-17（API）；v8.1.0 release 页（"23 Dec"，年份未呈现）
    - 摘录: "The RMLMapper executes RML rules to generate Linked Data. It is a Java library…"; 支持 "JSON files (JSONPath (`@` can be used to select the current object.))"; 输出 "nquads (default), turtle, trig, trix, jsonld, hdt, jelly"; "All functionalities above refer to using RML as maintained at https://rml.io/specs/rml. There is some support for RML as developed within W3C's Knowledge Graph Construction Community Group…"
    - 等级: A

14. **RMLMapper 提供 `--convert-mapping`（规则跨版本迁移开关）**
    - URL: https://github.com/RMLio/rmlmapper-java（README CLI 节）
    - 摘录: "--convert-mapping  Only convert the mapping to the latest RML specification by the W3C Community Group"
    - 等级: A

15. **SDM-RDFizer 是 Python/PyPI 的 RML 解释器（CSV/JSON/RDB/XML）**
    - URL: https://github.com/SDM-TIB/SDM-RDFizer（README）｜ 机构: SDM-TIB（TIB Leibniz）｜ 版本: v4.7.5.15.1（README 头）
    - 摘录: "The current version of the SDM-RDFizer assumes mapping rules are defined in the RDF Mapping Language (RML) by Dimou et al… SDM-RDFizer is able to process data from heterogeneous data sources (CSV, JSON, RDB, XML)…"; "python3 -m pip install rdfizer; python3 -m rdfizer -c /path/to/config/file"
    - 等级: A（性能章节不引用）

16. **RocketRML 是 JavaScript/npm 的 RML mapper（JSON/XML/CSV）**
    - URL: https://github.com/semantifyit/RocketRML（README + GitHub 页）｜ 机构: semantifyit ｜ 页面显示 289 commits / 28 stars / 15 forks（最近提交日期未核）
    - 摘录: "This is a javascript RML-mapper implementation for the RDF mapping language (RML)."; "npm install rocketrml"; "The mapper supports XML, JSON and CSV as input format."
    - 等级: A（维护状态细节 B/未核）

17. **Morph-KGC 是 Python 的 R2RML/RML 引擎（YARRRML、JSON/CSV/XML/RDB/Parquet、Neo4j/Kùzu、RDFLib/Oxigraph/Kafka）**
    - URL: https://github.com/morph-kgc/morph-kgc（README）｜ 机构: morph-kgc（OEG-UPM 系）｜ Apache-2.0
    - 摘录: "Morph-KGC is an engine that constructs RDF knowledge graphs from heterogeneous data sources with the R2RML and RML mapping languages."；"User-friendly mappings with YARRRML."
    - 等级: A

18. **CARML 是 Java/RDF4J 的 RML mapper，并提供 SHACL 形状校验 RML 映射**
    - URL: https://github.com/carml/carml（README）+ https://raw.githubusercontent.com/carml/carml/master/rml.sh.ttl ｜ 机构: carml（Taxonic）
    - 摘录: "CARML is built on RDF4J…"; "We're not set up for full mapping validation yet. But… we've created a SHACL shapes graph (here: carml/rml.sh.ttl) that validates RML mappings."；rml.sh.ttl: "This shapes graph can be used to validate RML mapping graphs."（含 sh:targetClass rr:TriplesMap / rml:LogicalSource）
    - 等级: A

19. **RMLStreamer 面向大数据/流式（Flink/Docker）**
    - URL: https://github.com/RMLio/RMLStreamer（README）｜ 机构: RMLio
    - 摘录: "The RMLStreamer generates RDF from files or data streams using RML. The difference with other RML implementations is that it can handle big input files and continuous data streams, like sensor data."
    - 等级: A

20. **RML Implementation Report 列出处理器清单（Unofficial Draft 2022-02-17）**
    - URL: https://rmlio.github.io/rml-implementation-report/ ｜ 机构: RMLio ｜ 日期: Unofficial Draft 17 February 2022
    - 摘录: "This document reports on implementations of RML specification…"；处理器表含 RMLMapper 4.9.0（2020-09-17）、CARML 0.3.0、RocketRML 1.0.6（2019-06-28）、SDM-RDFizer 3.2、RMLStreamer 2.0.0、Chimera 2.1、Morph-KGC 1.4.0（2021-11-11）。
    - 等级: A（注意测试日期 2019–2021 较早，不代表当前维护状态）

21. **RML Test Cases 含 JSON 用例（RMLTC0000-JSON）**
    - URL: https://rmlio.github.io/rml-test-cases/ ｜ 机构: RMLio（Ghent University - IDLab, imec 编辑）｜ 日期: Unofficial Draft 01 March 2019
    - 摘录: "3.2 RMLTC0000-JSON — Title: one table, one column, zero rows — Description: Tests if an empty table produces an empty RDF graph"
    - 等级: A

22. **rml.io 官方 JSON 教程（JSON 文件→RDF 完整规则）**
    - URL: https://rml.io/docs/rml/tutorials/json/ ｜ 标题: Tutorial: Generate RDF from a JSON file ｜ 机构: rml.io
    - 摘录: ":TriplesMap a rr:TriplesMap; rml:logicalSource [ rml:source "characters.json"; rml:referenceFormulation ql:JSONPath; rml:iterator "$.characters[*]" ]."（完整示例含 subjectMap/predicateObjectMap）
    - 等级: A

23. **rml.io 官方 Tools 页自述工具链（处理器/编辑器/YARRRML/校验）**
    - URL: https://rml.io/tools/ ｜ 机构: rml.io
    - 摘录: "RML is an extension of R2RML. RML rules are executed by processors."；"It is also possible to validate your RML rules to improve the quality of your resulting knowledge graphs."；列出 RMLMapper、RMLStreamer、YARRRML Parser、Matey、Validatrr 等。
    - 等级: A

24. **RML2SHACL：从 RML 映射生成 SHACL 形状用于 RDF 图校验**
    - URL: https://github.com/RMLio/RML2SHACL（README）｜ 机构: RMLio
    - 摘录: "A tool to generate SHACL shapes from RML mapping files for RDF graphs validation."
    - 等级: A

25. **Validatrr：rml.io 列为规则质量校验（基于规则推理）**
    - URL: https://github.com/IDLabResearch/validatrr（README）｜ 机构: IDLab（Ghent University - imec）
    - 摘录（rml.io 工具页）: "Validatrr — A validation approach using rule-based reasoning."；README 含 "Docker - RML Validate: docker run -it -v […]:/usr/local/n3unit/resources n3unit-rml [path to rml file] > output.ttl"（EYE/N3Unit 工作流）。
    - 等级: A（但其对 RML 映射文件的具体校验语义未在 README 展开，表述谨慎）

26. **JSON Lines 格式定义（.jsonl）**
    - URL: https://jsonlines.org/ ｜ 标题: JSON Lines ｜ 机构: jsonlines.org（维护者 Ian Ward）｜ 生成日期（页脚）: 2025-12-02
    - 摘录: "The JSON Lines format has three requirements: 1. UTF-8 Encoding … 2. Each Line is a Valid JSON Value … 3. Line Terminator is '\n' …"；"JSON Lines files may be saved with the file extension .jsonl."
    - 等级: A

27. **RML 处理器"内存型/流式型"设计差异（事实性，非性能）**
    - URL: https://github.com/RMLio/rmlmapper-java（README）与 https://github.com/RMLio/RMLStreamer（README）
    - 摘录: RMLMapper "loads all data in memory, so be aware when working with big datasets."；RMLStreamer "can handle big input files and continuous data streams."
    - 等级: A（仅陈述官方 README 设计说明，不做性能评测）

28. **JSONL 行→RML 的直接先例**
    - URL: 未找到 ｜ 结论: "未核"（未检索到把 .jsonl 作为 rml:source、iterator 指向行的官方教程/规范级先例；RML/处理器文档均以完整 JSON 文档为示例）。"JSONL 可通过 JSONPath+iterator 逐记录映射"为推断（C）。

## 3 冲突与张力

1. **两套 RML 规范并存**：rml.io 维护的 RML v1.1.2（2024-06-20）与 W3C KG-construct 社区组的 RML-Core（w3id.org/rml/core，Revision 0.1.0，2023）同时存在；RML v1.1.2 自述 "The Knowledge Graph Construction W3C Community Group is developing a new version of the RML specification at https://w3id.org/rml/portal… This document covers the original RML specification."；RMLMapper README 明确 "All functionalities above refer to using RML as maintained at https://rml.io/specs/rml. There is some support for RML as developed within W3C's KGC-CG"——工具实现需声明跟随哪套规范，迁移时存在双轨成本（RMLMapper 以 `--convert-mapping` 单向桥接，A）。
2. **"成熟工具链" vs "非正式标准"**：处理器生态（≥7 个实现、官方教程、测试套件）相当成熟，但 RML 与 RML-Core 均为 draft、无官方标准地位；唯一 W3C REC 是 2012 年的 R2RML（仅关系库）。"工程成熟"与"标准地位"是两个不同维度。
3. **YARRRML 规范与参考实现的 profile 粒度不一致**：规范列 R2RML/RML/RMLT/RMLAHT/RMLTDT 五个主 profile；YARRRML Parser README 只写 "to RML or R2RML"（`-f R2RML`）。源码确有 rml:logicalTarget（RMLT 概念）生成逻辑，但 README 级声明缺失——用户需从源码/测试推断 RMLT 支持程度。
4. **内存型 vs 流式型处理**：RMLMapper 官方 README 自述 "loads all data in memory"；RMLStreamer 定位 "big input files and continuous data streams"。这是设计取向差异，非性能结论；对"JSONL 大文件逐行迁移"场景，选择哪个处理器需结合数据规模（本调研不做评测）。
5. **JSONL 逐行友好 vs RML 文档导向**：JSON Lines 的卖点是"每行一个记录、可流式处理"（jsonlines.org）；而 RML 的 logical source 示例以"整个 JSON 文档 + JSONPath iterator 指向数组元素"为范式。两者组合可行但缺乏规范级先例（未核/推断 C）。

## 4 未决

1. **"JSON Lines 文件直接作为 rml:source、iterator 指向行"的官方教程/规范级先例未找到**（未核）；各处理器对顶层 JSON 数组/流式行的解析行为未见统一声明。
2. **RocketRML 最近提交/发布日期未取得**（GitHub API 触发 rate limit，403）；仅以仓库结构（master 分支、289 commits）与 README 为据。
3. **YARRRML Parser 对 RMLT profile 的"说明书级"支持声明未在 README 出现**（源码有 logicalTarget 生成逻辑）；RMLT/RMLAHT/RMLTDT profile 的实际覆盖度未逐项验证。
4. **专门的"RML 规则校验器"（非 SHACL 形状）成熟度未完全确认**：CARML 自述 "not set up for full mapping validation yet"；Validatrr 的 RML Docker 用法描述较模糊（输出 output.ttl 的语义未展开）。
5. **JSONL→属性图**：RML 生态 target/serialization 均为 RDF；Morph-KGC 支持 Neo4j/Kùzu，但 RML 输出是否为属性图模型未在 README 明确；"JSONL→属性图需自行转换"为推断（C）。
6. RMLMapper v8.1.0 release 页 "23 Dec" 的年份未在页面呈现（GitHub 页脚 ©2026 提示为近年，具体年份未核）。

## 5 来源清单

**A 级原文到手（28 项）**
1. RML 规范 v1.1.2 — https://rml.io/specs/rml/ — rml.io — Unofficial Draft 2024-06-20
2. RML-Core 文档 — http://w3id.org/rml/core/ — W3C KG-construct CG — Ontology Specification Draft 0.1.0（datePublished 2023-04-19）
3. RML-Core ontology.ttl — http://w3id.org/rml/core/ontology.ttl — 同上
4. R2RML W3C REC — https://www.w3.org/TR/r2rml/ — W3C — 2012-09-27
5. YARRRML 规范 — https://rml.io/yarrrml/spec/ — rml.io/KG-construct 系 — unofficial（previousPublishDate 2021-09-30）
6. YARRRML Parser README — https://github.com/RMLio/yarrrml-parser — RMLio — 抓取日 2026-08-12
7. YARRRML Parser 源码 clone — research_tree/tmp/b8b/yarrrml-parser（commit 93a76eee，2026-06-11；v1.12.2）
8. RMLMapper README — https://github.com/RMLio/rmlmapper-java — RMLio
9. RMLMapper GitHub API（pushed_at=2026-02-17, archived=false, stars=202）— api.github.com/repos/RMLio/rmlmapper-java
10. RMLMapper release v8.1.0 页 — https://github.com/RMLio/rmlmapper-java/releases/latest
11. RMLMapper Wiki（JSONPath `@` 当前对象）— https://github.com/RMLio/rmlmapper-java/wiki
12. SDM-RDFizer README — https://github.com/SDM-TIB/SDM-RDFizer — SDM-TIB（v4.7.5.15.1；性能章节未引用）
13. RocketRML README + GitHub 页 — https://github.com/semantifyit/RocketRML — semantifyit（289 commits / 28 stars / 15 forks）
14. Morph-KGC README — https://github.com/morph-kgc/morph-kgc — morph-kgc
15. CARML README — https://github.com/carml/carml — carml（Taxonic）
16. CARML rml.sh.ttl — https://raw.githubusercontent.com/carml/carml/master/rml.sh.ttl
17. RMLStreamer README — https://github.com/RMLio/RMLStreamer — RMLio
18. RML Implementation Report — https://rmlio.github.io/rml-implementation-report/ — RMLio — Unofficial Draft 2022-02-17
19. RML Test Cases — https://rmlio.github.io/rml-test-cases/ — RMLio — Unofficial Draft 2019-03-01
20. rml.io 教程 "Tutorial: Generate RDF from a JSON file" — https://rml.io/docs/rml/tutorials/json/
21. rml.io 介绍页 "RDF Mapping Language (RML)" — https://rml.io/docs/rml/introduction/
22. rml.io "RML vs R2RML" — https://rml.io/docs/rml/vs/r2rml/（抓取页 rml_vs_r2rml）
23. rml.io Tools 页 — https://rml.io/tools/ 与 rml.io 首页/Data retrieval 页（rmlio_home/rmlio_docs/rml_data_retrieval）
24. W3C semantic-web 邮件列表（YARRRML 发布）— https://lists.w3.org/Archives/Public/semantic-web/2018Oct/0000.html — 2018-10-01
25. RML2SHACL README — https://github.com/RMLio/RML2SHACL — RMLio
26. Validatrr README + GitHub 页 — https://github.com/IDLabResearch/validatrr — IDLab（Ghent University - imec）
27. JSON Lines 规范页 — https://jsonlines.org/ — jsonlines.org — 页脚生成 2025-12-02
28. rml.io 数据检索页 — https://rml.io/docs/rml/access/（抓取页 rml_data_retrieval）

**搜索记录（关键词组，≥4）**
- 中文："RML 映射 规范 处理器"、"YARRRML 人可读 映射"、"JSONL RDF 映射 工具"、"R2RML RML 区别"（含 Bing 国内/国际、DuckDuckGo 结果页：bing_jsonl、bing_rmlcore、bing_rmlcore2、ddg_rmlcore）
- 英文："RML mapping specification triples map"、"YARRRML human readable mapping language"、"RMLMapper JSON source mapping"、"RML processor implementation comparison"、"RML-Core"

**来源类型（≥3）**：①W3C/规范类（R2RML REC、RML spec、RML-Core、RML Test Cases、RML Implementation Report）；②GitHub 官方仓库 README/源码（RMLMapper、SDM-RDFizer、RocketRML、Morph-KGC、CARML、RMLStreamer、yarrrml-parser、RML2SHACL、Validatrr）；③rml.io 官方站点文档/教程（introduction、JSON tutorial、Tools、Data retrieval、home）；④W3C 邮件列表（semantic-web 2018-10）；⑤独立格式规范站点（jsonlines.org）。

## 6 判死自查

- **红线 1：可核来源 ≥15** — 通过。第 5 节列出可核来源 28 项（A 级原文 24+）。
- **红线 2：原文到手 ≥10** — 通过。关键论断全部带原文摘录；抓取副本存于 `research_tree/tmp/b8b/`（html/txt/readme.md/ttl/json），另有本地 clone。
- **红线 3：来源类型 ≥3** — 通过。W3C/规范、GitHub 官方仓库、rml.io 官方站点、W3C 邮件列表、jsonlines.org 共 5 类。
- **红线 4：候选逐一查证 ≥5** — 通过。逐一查证 RMLMapper、SDM-RDFizer、RocketRML、Morph-KGC、CARML、RMLStreamer、yarrrml-parser、RML-Core、Validatrr、RML2SHACL（共 10 个候选）。
- **红线 5：关键词 ≥4 组** — 通过。中英合计 ≥6 组（见第 5 节搜索记录）。
- **禁止项 1：不做处理器性能评测** — 通过。全文无执行时间/吞吐/内存对比结论；SDM-RDFizer README 中的性能对比章节未引用、未转述。
- **禁止项 2：不越界（schema 演化归 B8a）** — 通过。本分支只谈 RML/YARRRML 映射机械转换与规则文本版本化/校验；数据模式演化、schema migration 内容未涉及。
- **禁止项 3：不捏造来源** — 通过。所有 URL 均可回溯到 research_tree/tmp/b8b/ 下的抓取副本；抓不到的（JSONL 官方先例、RocketRML 最近提交日期、release 年份）一律写"未核"。
- **禁止项 4：推断标 C** — 通过。"JSONL 行可通过 JSONPath+iterator 逐记录映射"、"Turtle/YAML 文本可 grep/可审计/可版本化"、"JSONL→属性图需自行转换"等推断均标 C。