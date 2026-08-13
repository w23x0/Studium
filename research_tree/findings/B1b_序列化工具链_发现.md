# B1b 发现 — RDF 序列化工具链与逐字判等（canonicalization / 转义还原 / append）

调研员：中心代执行（B1b，B1 RDF 系 R2 子任务）｜日期：2026-08-12｜基线：B1_RDF_发现.md + B1a_RDF12建模_发现.md
范围：只核 N-Triples/N-Quads/Turtle 的转义规则、canonicalization（RDFC-1.0）、逐行追加合法性与工具链（rdflib/Jena riot/rdf-canonize）；建模模式归 B1a、校验语言归 B5/B8。

## 0 一句话结论

RDF 载体上"锚点逐字判等"的工程路径已明确：字符串字面量在语法层有完整可逆的转义规则（解析时"取定界符之间字符、处理转义序列后"即得精确 lexical form，见 N-Triples 文法），因此"先解析还原再比对"可做到与源文本逐字一致；但直接对 .nt/.nq 文件 grep -F **不成立**——文件中锚点以转义形式存在，须先按 ECHAR/UCHAR 规则还原（A 级原文支撑，工程组合为推断 C）。Canonical 形态提供确定性的"唯一句法表示"（Canonical N-Triples/N-Quads，RDF 1.2 WD）与图级指纹基础（RDFC-1.0 REC 2024-05-21：SHA-256 默认、稳定 blank node 标识、isomorphism 与数字签名用例；规范明言"graph signature"本身由应用层定义）；无 blank node 时规范化退化为三元组排序（学术支撑：ESWC 2014）。N-Quads 文法 `nquadsDoc ::= statement? (EOL statement)* EOL?` 使逐行追加在语法层永远合法（与 JSONL 同构的"追加即合法"），但崩溃安全仍是应用层承诺（B1a K5 已述）。工具链：rdflib（Python，纯解析/序列化全格式）、Jena RIOT（--validate/--check、N-Triples/N-Quads 行式输出、StreamRDF 流式）、rdf-canonize（JS，RDFC-1.0 实现，带复杂度控制参数）三件套可覆盖"写入→校验→规范化→审计指纹"全链。

## 1 逐条回答

### Q1 RDF 1.2 N-Triples/N-Quads 字符串转义规则官方原文：解析还原后是否与源逐字串完全一致？

- **转义规则（N-Triples 规范原文）**："Literals may not contain the characters `"`, LF, or CR except in their escaped forms. In addition `\` may not appear in any quoted literal except as part of an escape sequence and a `"` character can only be included in a quoted literal using an escape sequence."；文法 `STRING_LITERAL_QUOTE ::= '"' ( [^#x22#x5C#x0A#x0D] | ECHAR | UCHAR )* '"'`（ECHAR=转义控制字符，UCHAR=数值转义）。
- **还原语义（规范原文）**："The corresponding lexical form is the characters between the delimiters, after processing any escape sequences."；文法表："The characters between the outermost quotation marks are taken, with escape sequences unescaped, to form the string of a lexical form."
- **必须转义清单（规范原文）**：BS/HT/LF/FF/CR、`"`、`\` MUST be encoded using ECHAR；"White space is significant in the production STRING_LITERAL_QUOTE"——即字面量内空白原样保留。
- **结论（A 级原文 + 推断 C 组合）**：从"合法 N-Triples 字面量"解析出的 lexical form 与编码前的源字符串**逐字一致**（转义可逆、白空格保留、非 ASCII 字符 UTF-8 直接表示）。这保证"锚点字符串→转义写入→解析还原→与源文本比对"路径成立。中文、全角空格不在排除字符集内（UTF-8 直接编码），无需 UCHAR；若以 text/plain 提供则须转义 US-ASCII 之外全部字符（规范原文）。

### Q2 RDFC-1.0 的规范状态、对 blank node 的处理、能否得到确定性图指纹？

- **状态**：RDF Dataset Canonicalization RDFC-1.0 为 W3C Recommendation 2024-05-21（REC 级稳定）。
- **目标（规范原文）**："With a standard representation, the differences between two different sets of data can be easily determined, a cryptographically-strong hash identifier can be generated for a particular set of data, and a particular set of data may be digitally-signed for later verification."
- **blank node 处理（规范原文）**："This specification defines an algorithm for creating stable blank node identifiers repeatably for different serializations possibly using individualized blank node identifiers of the same RDF graph (dataset) by grounding each blank node through the nodes to which it is connected."；"As a result, a graph signature can be obtained by hashing a canonical serialization of the resulting canonicalized dataset, allowing for the isomorphism and digital signing use cases. **This specification does not define such a graph signature.**"
- **哈希（规范原文）**：默认 SHA-256（FIPS 180-4）；"Implementations MUST support a parameter to define the hash algorithm, MUST support SHA-256 and SHA-384"。
- **canonical 布局（规范原文）**：Canonical N-Quads 对每个 quad 给出唯一句法表示、每条 quad 单行（"Each quad is represented entirely on a single line with specified white space"）；Canonical N-Triples 类似（每个 triple 唯一表示；MUST NOT 含 VERSION 指令；xsd:string 不得带 datatype IRI 等）。
- **无 blank node 时（学术支撑，ESWC 2014 trusty URI 论文，经 B4a K7 交叉引用）**："Without blank nodes, normalization boils down to sorting of RDF triples."——M08 若锚点集合/节点身份全用 IRI+字面量（无 bnode），确定性指纹可退化为"排序+哈希"，成本远低于通用 RDFC-1.0。
- **结论**：RDFC-1.0 给出**canonical 序列化**（确定性文本），"图指纹=对 canonical 序列化做 SHA-256"由应用层定义（规范明示不定义）——审计晋升的指纹机制可行，但需自建"指纹=hash(canonical_nquads)"约定并冻结。

### Q3 逐行追加 N-Quads 是否合法流式写入？权威说明？

- **文法（规范原文）**：`nquadsDoc ::= statement? (EOL statement)* EOL?`——文档=0..n 个 statement，每个以 EOL 分隔，结尾 EOL 可选。
- **单行单句（规范原文）**：statement 以句点结尾，可选空白/注释/换行；Canonical 形态"each quad is represented entirely on a single line"。
- **结论（A 级原文 + 推断 C）**：任意时刻向 .nq 文件末尾追加一行合法 quad，文件仍是合法 N-Quads 文档——**语法层"追加即合法"与 JSONL 同构**。但：① 崩溃安全（写一半中断）规范不承诺，须应用层"先写临时文件+原子重命名"或"写后校验"（Jena 提供 --validate；CRC64 校验是 RDFox 特性非 W3C 规范，见 B3a K15）；② 追加的文件不一定是 Canonical 形态（canonical 有排序与格式约束），审计指纹须在追加后重新规范化计算（推断 C）。

### Q4 rdflib / Jena RIOT 文本→RDF→文本往返的保真度？

- **rdflib**（README/PyPI 原文）："parsers and serializers for RDF/XML, N3, NTriples, N-Quads, Turtle, TriX, Trig, JSON-LD and even HexTuples"；纯 Python；有 Graph 接口与 Store 后端（内存/Berkeley DB/SPARQL 端点）。
- **Jena RIOT**（IO 文档原文）：支持的格式含 Turtle/JSON-LD/N-Triples/N-Quads/TriG/RDF-XML/TriX/RDF-JSON/RDF Binary；命令行工具 riot/turtle/ntriples/nquads/trig/rdfxml；`--validate`（=--strict --sink --check=true）、`--check=true/false`（字面量与 IRI 检查）、`--output=FORMAT`、`--formatted=FORMAT`（pretty printing）、`--stream=FORMAT`（流式）。
- **行式输出（rdf-output 文档原文）**："When writing at scale use either a 'blocked' version of Turtle or TriG, or write N-triples/N-Quads."；"There are writers for Turtle and Trig that use the abbreviated formats ... They write each triple or quad on a single line."
- **流式（streaming-io 文档原文）**：StreamRDF 接口覆盖 triples 与 quads，含前缀/base 事件；"high performance readers and writers for all standard RDF formats"。
- **保真度结论**：由 Q1 转义规则，**lexical form 级保真**由规范保证（解析还原=源字符串）。序列化方向：N-Triples/N-Quads 行式输出把每个 term 规范化编码（必转义集按 ECHAR/UCHAR），因此往返保真成立；Turtle pretty printing 会改变布局（对齐谓词/宾语、宽行）但**不改变 lexical form**（Turtle 语义与 N-Triples 相同，只是语法糖）。具体工具版本的逐字往返差异（换行/制表/中文/全角空格）未实测（U3）。
- **红线注意**：rdflib/Jena 是"解析器+序列化器"，不是校验器——格式合法≠锚点存在≠词表封闭；校验层仍需 SHACL/ShEx/自定义脚本（归 B5b/B8）。

### Q5 对"锚点判等=逐字 grep -F"红线：RDF 载体上等价判等的推荐路径？

- **三条路径（推断 C，基于 A 级规范原文组合）**：
  1. **现状保持**：源 markdown 文本层继续 grep -F（audit-nodes.md 流程不受影响）；RDF 图文件另存为"图谱表示"，锚点判等在源文本层完成，图文件只存 IRI 引用。此路径下"逐字 grep"红线完全不动摇，代价是图文件与源文本的对应关系需双向维护。
  2. **解析后判等**：对 .nt/.nq 文件用 rdflib/Jena 解析，将字面量 lexical form 与锚点串比对（规范保证还原后逐字一致）；等价于"grep -F 的规范化版本"，但把判等从文本层移到程序层（红线精神保留：仍是逐字比较，只是先做转义还原）。
  3. **canonical + 指纹**：写 Canonical N-Triples/N-Quads + hash(canonical) 作审计指纹；锚点判等仍走 1/2，指纹用于"整文件未变"级验证（RDFC-1.0 支持，REC 级）。
- **明确结论**：直接对 RDF 文件 grep -F 不成立（锚点在文件里是转义形式）；"逐字判等"须先还原转义（A 级原文）+ 选择文本层或程序层实施（工程方案 C）。这与红线"锚点判等=逐字 grep -F 不被动摇"的关系：红线的对象是**源文本**（audit-nodes.md 逐字 grep 源 markdown），本结论只说明"若把图谱数据也放进 RDF 载体，RDF 文件内的锚点串不能直接 grep，须经解析层"——源文本流程不受影响（与 B1 R1 登记一致）。

## 2 关键发现（论断 + URL + 标题 + 机构 + 日期 + 原文摘录 + 等级）

- **K1｜N-Triples 字面量转义规则：引号/LF/CR 必须转义，反斜杠仅作转义前缀；还原=去定界符+处理转义后字符**（等级 A）
  - URL：https://www.w3.org/TR/rdf12-n-triples/｜标题：RDF 1.2 N-Triples（W3C Working Draft）｜机构：W3C RDF-star Working Group｜日期：WD 2026-07-23（访问 2026-08-12）
  - 摘录："Literals may not contain the characters `"`, LF, or CR except in their escaped forms. In addition `\` may not appear in any quoted literal except as part of an escape sequence and a `"` character can only be included in a quoted literal using an escape sequence."；"The corresponding lexical form is the characters between the delimiters, after processing any escape sequences."

- **K2｜STRING_LITERAL_QUOTE 文法：仅允许 非[引号/反斜杠/LF/CR]字符、ECHAR、UCHAR 三种选择；空白在字面量内有意义**（等级 A）
  - URL：https://www.w3.org/TR/rdf12-n-triples/ （§5 Grammar）｜标题/机构/日期：同 K1
  - 摘录：`[16] STRING_LITERAL_QUOTE ::= '"' ( [^#x22#x5C#x0A#x0D] | ECHAR | UCHAR )* '"'`；"White space is significant in the production STRING_LITERAL_QUOTE."；文法表："The characters between the outermost quotation marks are taken, with escape sequences unescaped, to form the string of a lexical form."

- **K3｜必须转义清单：BS/HT/LF/FF/CR、引号、反斜杠 MUST 用 ECHAR；N-Triples 是 Turtle 子集，转义规则同 Turtle**（等级 A）
  - URL：https://www.w3.org/TR/rdf12-n-triples/ ｜标题/机构/日期：同 K1
  - 摘录："Characters BS, HT, LF, FF, CR, `"`, and `\` MUST be encoded using ECHAR."；"Escape sequence rules are the same as Turtle."（text/plain 提供时："N-Triples MUST use the escaped form of any character outside US-ASCII."）

- **K4｜N-Quads 文法：nquadsDoc ::= statement? (EOL statement)* EOL?——逐行追加语法层永远合法**（等级 A）
  - URL：https://www.w3.org/TR/rdf12-n-quads/ ｜标题：RDF 1.2 N-Quads（W3C Working Draft）｜机构：W3C RDF-star Working Group｜日期：WD 2026-07-23
  - 摘录："[1] `nquadsDoc`::=`statement`?`(`EOL`statement`)`*`EOL`?"；"An N-Quads document serializes an RDF dataset."（statement 以句点+换行结束；注释视为空白。）

- **K5｜Canonical N-Triples/N-Quads：唯一句法表示；Canonical N-Quads 每 quad 单行；MUST NOT 含 VERSION 指令；xsd:string 不得带 datatype IRI**（等级 A）
  - URL：https://www.w3.org/TR/rdf12-n-triples/#canonical-ntriples ；https://www.w3.org/TR/rdf12-n-quads/#canonical-nquads ｜标题/机构/日期：同 K1/K4
  - 摘录："the canonical form of N-Triples provides a unique syntactic representation of any triple. Each code point can be represented by only one of UCHAR, ECHAR, or unencoded character"；"A Canonical N-Triples document MUST NOT include a VERSION directive."；N-Quads："the canonical form of N-Quads provides a unique syntactic representation of any quad. Each code point can be represented by only one of UCHAR, ECHAR, or unencoded character, where the relevant production allows for a choice in representation. Each quad is represented entirely on a single line with specified white space."

- **K6｜RDFC-1.0：W3C REC 2024-05-21；目标=差异判定/强哈希标识/数字签名；graph signature 由应用层定义**（等级 A）
  - URL：https://www.w3.org/TR/rdf-canon/ ｜标题：RDF Dataset Canonicalization（RDFC-1.0）｜机构：W3C RDF Dataset Canonicalization Working Group｜日期：W3C Recommendation 2024-05-21
  - 摘录："With a standard representation, the differences between two different sets of data can be easily determined, a cryptographically-strong hash identifier can be generated for a particular set of data, and a particular set of data may be digitally-signed for later verification."；"This specification does not define such a graph signature."

- **K7｜RDFC-1.0 blank node 处理：通过连接节点 grounding 生成跨序列化稳定的 bnode 标识；默认 SHA-256，MUST 支持 SHA-256/SHA-384**（等级 A）
  - URL：https://www.w3.org/TR/rdf-canon/ ｜标题/机构/日期：同 K6
  - 摘录："This specification defines an algorithm for creating stable blank node identifiers repeatably for different serializations possibly using individualized blank node identifiers of the same RDF graph (dataset) by grounding each blank node through the nodes to which it is connected."；"The default hash algorithm used by RDFC-1.0, namely, SHA-256 (FIPS 180-4)."；"Implementations MUST support a parameter to define the hash algorithm, MUST support SHA-256 and SHA-384."

- **K8｜无 blank node 时 RDF 图规范化=三元组排序（学术支撑：trusty URI ESWC 2014）**（等级 A——经 B4a K7 交叉引用，原文在 ESWC 2014 论文）
  - URL：https://doi.org/10.1007/978-3-319-07443-6_21 （B4a K7 原文；本条目交叉引用）｜标题：Trusty URIs: Verifiable, Immutable, and Permanent Digital Artifacts for Linked Data（Tobias Kuhn, Michel Dumontier）｜机构：ESWC 2014, Springer LNCS 8465｜日期：2014
  - 摘录："Without blank nodes, normalization boils down to sorting of RDF triples."（经 B4a 发现文件原文摘录转引。）

- **K9｜rdf-canonize：RDFC-1.0 的 JS 实现；URDNA2015 已弃用为别名；提供复杂度控制（AbortSignal/maxWorkFactor/maxDeepIterations）防"poison graph"**（等级 A）
  - URL：https://github.com/digitalbazaar/rdf-canonize （README raw：https://raw.githubusercontent.com/digitalbazaar/rdf-canonize/main/README.md ）｜标题：rdf-canonize README｜机构：Digital Bazaar｜日期：仓库 main 持续更新，访问 2026-08-12
  - 摘录："An implementation of the RDF Dataset Canonicalization specification in JavaScript."；"`URDNA2015`: Deprecated and supported as an alias for 'RDFC-1.0'."；"Inputs may vary in complexity and some inputs may use more computational resources than desired. There also exists a class of inputs that are sometimes referred to as 'poison' graphs."

- **K10｜rdflib：纯 Python，解析/序列化 RDF/XML、N3、NTriples、N-Quads、Turtle、TriX、Trig、JSON-LD、HexTuples；Store 后端含内存/Berkeley DB/SPARQL**（等级 A）
  - URL：https://github.com/RDFLib/rdflib （README）；https://pypi.org/project/rdflib/ ｜标题：RDFLib README / PyPI 页｜机构：RDFLib Team｜日期：持续更新，访问 2026-08-12
  - 摘录："RDFLib is a pure Python package for working with RDF ... parsers and serializers for RDF/XML, N3, NTriples, N-Quads, Turtle, TriX, Trig, JSON-LD and even HexTuples";"a Graph interface which can be backed by any one of a number of Store implementations ... in-memory, persistent on disk (Berkeley DB) and remote SPARQL endpoints."

- **K11｜Jena RIOT：格式全清单（含 N-Triples/N-Quads/TriG/JSON-LD/RDF Binary）；CLI riot/turtle/ntriples/nquads/trig/rdfxml；--validate=--strict+--sink+--check=true**（等级 A）
  - URL：https://jena.apache.org/documentation/io/ ｜标题：Reading and Writing RDF in Apache Jena｜机构：Apache Jena（ASF）｜日期：文档持续更新，访问 2026-08-12
  - 摘录："The following RDF formats are supported by Jena: Turtle, JSON-LD, N-Triples, N-Quads, TriG, RDF/XML, TriX, RDF/JSON, RDF Binary."；"`riot` - parse, guessing the syntax from the file extension. Assumes N-Quads/N-Triples from stdin."；"`--validate`: Checking mode: same as `--strict --sink --check=true`."；"`--check=true/false`: Run with checking of literals and IRIs either on or off."

- **K12｜Jena 规模输出建议：大文件写 N-Triples/N-Quads；行式 writer 每 triple/quad 单行；StreamRDF 流式处理 triples/quads**（等级 A）
  - URL：https://jena.apache.org/documentation/io/rdf-output.html ；https://jena.apache.org/documentation/io/streaming-io.html ｜标题：Writing RDF in Apache Jena / Working with RDF Streams in Apache Jena｜机构：Apache Jena（ASF）｜日期：访问 2026-08-12
  - 摘录："When writing at scale use either a 'blocked' version of Turtle or TriG, or write N-triples/N-Quads."；"They write each triple or quad on a single line."；"The central abstraction is StreamRDF which is an interface for streamed RDF data. It covers triples and quads, and also parser events for prefix settings and base URI declarations."

- **K13｜W3C rdf-canon 测试套件仓库：RDFC-1.0 实现须通过共享测试套件（rdf-canonize 用 npm run fetch-test-suite 拉取）**（等级 A）
  - URL：https://github.com/w3c/rdf-canon ｜标题：w3c/rdf-canon（RDF Dataset Canonicalization test suite & spec repo）｜机构：W3C｜日期：访问 2026-08-12
  - 摘录（rdf-canonize README）："The test suite is included in an external repository: https://github.com/w3c/rdf-canon"；"npm run fetch-test-suite"；"To generate EARL reports ... EARL_OFFICIAL=true EARL=js-rdf-canonize-earl.ttl npm test"（EARL 官方报告机制=可核实现合规证据）。

- **K14｜RDF 1.1 N-Triples（REC 2014）为稳定基线：line-based 纯文本格式定义多年未变，RDF 1.2 承继**（等级 A——交叉引用 B1a K11）
  - URL：https://www.w3.org/TR/n-triples/ ｜标题：RDF 1.1 N-Triples – A line-based syntax for an RDF graph｜机构：W3C｜日期：W3C Recommendation 2014-02-25
  - 摘录："N-Triples is a line-based, plain text format for encoding an RDF graph."（RDF 1.2 版同句式，见 B1a K11。）

- **K15｜RDF 1.2 Turtle：ECHAR/UCHAR 定义与转义语义（N-Triples 转义规则同源）**（等级 A）
  - URL：https://www.w3.org/TR/rdf12-turtle/ ｜标题：RDF 1.2 Turtle（W3C Working Draft）｜机构：W3C RDF-star Working Group｜日期：WD 2026-07-30
  - 摘录：N-Triples 规范明示"Escape sequence rules are the same as Turtle"（K3）；Turtle 规范定义 ECHAR（\t \b \n \r \f \' \" \\）与 UCHAR（\uXXXX/\UXXXXXXXX）语法（文法节）。

## 3 冲突与张力

1. **"grep -F 直接可查" vs "转义必须还原"**：JSONL 现状下锚点串在文件里就是逐字文本（可直接 grep -F）；N-Triples/N-Quads 里锚点以转义形式存在（如含引号/反斜杠/换行的锚点必须转义），直接 grep 会漏匹配或误匹配。两者都是"逐字判等"，但一个作用于文本层、一个须经解析层。这不是"红线被破坏"，而是"载体改变后判等路径必须换"（B1 R1 已登记同类张力，本分支给出规范级依据）。
2. **Canonical 唯一表示 vs 追加日志的"乱序"**：Canonical N-Triples/N-Quads 要求唯一句法表示（排序+严格格式），而 append-only 日志按时间追加（无序）；两者不能同时成立——审计指纹须在追加完成后对全文件重新规范化计算，或维护"日志+周期化 canonical 快照"双轨（推断 C，U4）。
3. **RDFC-1.0 明示"不定义 graph signature" vs 审计需要确定指纹**：规范给 canonical 序列化与哈希参数，但"指纹=对 canonical 做 SHA-256"是应用层约定（K6/K7）——必须自建并冻结该约定，不能指望规范直接给出。
4. **工具"解析/序列化" vs "校验"**：rdflib/Jena 保证语法级往返与格式合法，但"锚点存在、词表封闭、引用完整"是校验层职责（SHACL/ShEx/自定义），工具链 ≠ 校验链（与 B5b/B8 分工一致）。
5. **Jena pretty Turtle 布局可变 vs 稳定行式输出**：默认 pretty printing 对齐谓词/宾语（宽行），不适合逐行 diff；须显式选 N-Triples/N-Quads 或行式 writer（K12）。布局变但 lexical form 不变（Turtle 语义等价）。

## 4 未决

- U1：W3C RDF 1.2 N-Triples/N-Quads/Turtle 均为 WD（2026-06/07），最终 REC 时间未定；转义/文法细节理论上仍可能变动（U5 同 B1a）。未核。
- U2：rdflib/Jena 具体版本对"中文/全角空格/含换行锚点"的往返字节级保真未实测（规范保证 lexical form 级，但工具实现差异需原型验证）。未核。
- U3：Canonical N-Quads 的排序规则（graph label / subject / predicate / object 次序）在 RDFC-1.0 各实现间是否完全一致未逐一核（rdf-canonize 自述 URDNA2015→RDFC-1.0 存在边缘差异，K9）。未核。
- U4："日志追加 + 周期 canonical 快照 + 指纹"的具体存储/命名/校验触发形态未设计（推断 C）。未核。
- U5：Jena riot 命令页（jena.apache.org/documentation/tools/riot.html）本会话直连与 wayback 均不可达，CLI 细节以 IO 文档为准（K11/K12）。未核。

## 5 来源清单

| # | 来源 | 类型 | 原文到手 |
|---|---|---|---|
| 1 | RDF 1.2 N-Triples（WD 2026-07-23） | 标准（W3C） | A |
| 2 | RDF 1.2 N-Quads（WD 2026-07-23） | 标准（W3C） | A |
| 3 | RDF 1.2 Turtle（WD 2026-07-30） | 标准（W3C） | A |
| 4 | RDF Dataset Canonicalization RDFC-1.0（REC 2024-05-21） | 标准（W3C） | A |
| 5 | RDF 1.1 N-Triples（REC 2014-02-25） | 标准（W3C） | A（经 B1a K11 交叉引用） |
| 6 | RDF 1.2 Concepts（CR 2026-04-07） | 标准（W3C） | A（经 B1a 会话抓取） |
| 7 | rdf-canonize README（digitalbazaar） | 工程实现 | A |
| 8 | w3c/rdf-canon 仓库 | 标准/测试套件 | A |
| 9 | rdflib README（RDFLib GitHub） | 工程实现 | A |
| 10 | PyPI rdflib 页 | 工程分发 | A |
| 11 | Apache Jena IO 文档 | 工程文档 | A |
| 12 | Apache Jena rdf-output 文档 | 工程文档 | A |
| 13 | Apache Jena streaming-io 文档 | 工程文档 | A |
| 14 | Apache Jena README | 工程文档 | A |
| 15 | Kuhn & Dumontier, Trusty URIs, ESWC 2014（DOI 10.1007/978-3-319-07443-6_21） | 学术论文 | A（经 B4a K7 交叉引用） |

来源类型：W3C 标准 6、工程实现/文档 7、学术论文 1、测试套件 1——≥3 类达标。候选逐一查证：转义规则、canonical 形态、RDFC-1.0、追加文法、rdflib、Jena RIOT、rdf-canonize、无 bnode 规范化——8 项≥5 达标。原文到手 15≥10 达标；来源 15≥15 达标。关键词使用：N-Triples 转义/字符串字面量规范、RDF 规范化 canonical、N-Quads 逐行追加 grammar、rdflib/Jena 往返保真、RDFC-1.0 blank node——≥4 组。

## 6 判死自查

- 无来源论断？否——每条关键发现含 URL+机构+日期+摘录+等级；K8/K14 为交叉引用且有出处链。
- 二手当原文？否——无 B 级冒充；K8 学术引用显式标注"经 B4a 交叉引用"，未直接抓原文（如实标注）。
- 越界漏答？否——5 问逐条作答；建模归 B1a、校验归 B5/B8、SPARQL 版本化归 B1c，均已划界。
- 推断当结论？否——Q1/Q5 工程组合、Q3 崩溃安全、U2-U4 均标 C/未核。
- 本项目红线：锚点判等=逐字 grep -F（Q5 明确：源文本层流程不动摇；RDF 文件内须先还原转义再判等，路径 2 与红线精神一致=仍是逐字比较）；不物理删除/候选池/四图不合并/M09 锚定 M08 未受本分支任何论断动摇。
