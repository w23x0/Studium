# B7a YAML-LD 工程化与文档-图迁移（含工具链）— 发现报告

分支调研员：B7a（B7 文档-图混合系 R3 子任务）
工作区：C:\Users\Wang\Desktop\Studium\research_tree
日期：2026-08-12（抓取与实测）；规范版本：W3C YAML-LD 1.0 Working Draft 2026-07-28
原材料目录：research_tree/tmp/b7a/（HTML/JSON/文本原文）、tmp/b7/yamlld_tr.html（WD 全文）、tmp/venv_b7a + tmp/b7a_test.yaml + research_tree/tmp/b7a/local_test_log.md（本地实测）

## 0 一句话结论

YAML-LD 1.0（WD 2026-07-28）在"规范→工具"链条上处于早期：规范承诺"任何 YAML-LD 文档可表示为 JSON-LD、Basic profile 可语义无损往返"且自带 58 用例测试套件，但公开实现目前只有 Python 派生物 python-yaml-ld（yaml-ld 1.1.22，包裹 digitalbazaar/pyld）一家成熟可用（实测 expand/to_rdf/from_rdf/compact 全链路可跑通、含 PyLD 3.1.0 兼容性破坏），npm/JS 生态无 YAML-LD 包、pyld/jsonld.js/ruby-json-ld 零 YAML 支持；"Markdown frontmatter 升级为 YAML-LD"已有直接先例 remark-mdxld（MDX + YAML-LD frontmatter，@/$ 双前缀）但属个人小项目，Obsidian 官方 Properties 仅支持普通 YAML frontmatter 且不支持嵌套属性；YAML-LD+SHACL 无任何组合先例，社区 issue #217 明确"SHACL 不能直接作用于 YAML-LD，只能校验转换后的 RDF 图"；对"锚点逐字 grep + 人审"工作流，正文仍为 Markdown 可 grep、图数据进 frontmatter/YAML 块的双增益路径在原理上成立（推断 C），但 YAML 的注释/折叠标量/关键词引号规则是必须处理的新约束，尚无教程级验证（未核）。

## 1 逐条回答

### Q1 YAML-LD 规范要求的实现：解析器/序列化器有哪些公开实现？各自支持状态（官方文档为据）

- **Python：yaml-ld（PyPI 包名 yaml-ld，1.1.22）**——目前唯一成熟公开实现，作者 Anatoly Scherbakov，仓库 iolanta-tech/python-yaml-ld。PyPI 描述原文："A Python implementation for handling YAML-LD documents. Basically, a wrapper on top of digitalbazaar/pyld"。提供 expand / compact / flatten / frame / to_rdf / from_rdf / load_document 全套 API 及 CLI（`pyld`，"Command line tool to operate on ＊-LD data, where ＊ stands for JSON or YAML"），文档列 Parsers：YAML-LD/JSON-LD、Turtle、RDF/XML、HTML。W3C 官方 w3c/yaml-ld 仓库自身的 pyproject.toml 也以 `yaml-ld>=1.1.22`、`PyLD<3.0.0`、`iolanta>=2.1.42` 为依赖——即官方规范仓库把该 Python 实现当作自用参考工具。本地实测：expand/to_rdf/from_rdf/compact 全链路可跑通（见 2-K8/K9）。
- **Python：rdflib-yaml-ld（iolanta-tech/rdflib-yaml-ld）**——GitHub 标题 "YAML-LD support for rdflib"，2023-08 最后更新、0 star、以 git submodule 引用 yaml-ld-spec；仓库页可核，但 README 正文未抓到（未核），未见发布到 PyPI 的证据（未核）。
- **JS/npm：无**。npm 搜 "yamlld" 返回 total=0；搜 "yaml-ld" 返回的模糊结果中唯一直接相关包是 remark-mdxld（frontmatter 插件，见 Q3），核心 JSON-LD 库 jsonld.js（digitalbazaar）与 pyld 的 JS 对应物均无 YAML-LD 支持；JSON-LD Playground 侧栏把 "YAML-LD 1.0 drafts" 标为 "(historic)"（历史草稿，不可输入）。JSON-LD 1.1 主序列化仍是 JSON。
- **Ruby：ruby-rdf/json-ld**——抓取页面中 YAML/yaml 出现 0 次，无 YAML-LD 支持（负面证据）。
- **iolanta（同一作者的图浏览工具）**——README "Browse and visualize Linked Data with Python"，自身不实现 YAML-LD（repo 页 0 提及）；但其 org 页显示 python-yaml-ld / rdflib-yaml-ld / yaml-ld 均挂在 iolanta-tech 名下，生态单点集中。
- **官方测试套件**：w3c/yaml-ld tests/ 目录含 manifest.jsonld（58 用例：35 Expand 正 + 16 Expand 负 + 3 ToRDF + 2 Compact + 1 Flatten + 1 Frame）、README.md、cases/；manifest 声明针对 "YAML-LD JSON Profile"。规范 2.2 要求：conformant 实现除 YAML-LD 测试套件外还须通过 JSON-LD API 测试与 JSON-LD Framing 测试（"Since YAML is a superset of JSON, testing a YAML-LD implementation against test cases from JSON-LD test suites should be trivial"）。
- 支持状态小结：规范尚为 WD（2026-07-28），无官方 endorsed 实现清单页；公开实现以 Python 一家为主，其余候选（rdflib-yaml-ld、remark-mdxld）均小规模/个人维护。

### Q2 YAML-LD 与 JSON-LD 的互操作：转换工具是否已存在、是否可逆

- **规范层面（可核，A）**：WD 摘要原文 "this document identifies constraints on YAML such that any YAML-LD document can be represented in JSON-LD"；Basic profile 原文 "can be transformed into a JSON-LD11 representation, then back to a conforming YAML-LD document, without loss of semantic information"。即：方向 1（YAML-LD→JSON-LD）是规范级承诺；Basic profile 内"往返无损"也是规范级承诺。
- **实现层面（实测，A）**：python-yaml-ld 提供 expand（YAML-LD→JSON-LD）、compact/flatten/frame、to_rdf（→RDF N-Quads）、from_rdf（RDF→JSON-LD）。本地实测：YAML-LD 文件 → expand → JSON-LD（全 IRI 展开正确）；→ to_rdf → N-Quads 三句正确；N-Quads → from_rdf → JSON-LD 一致；→ compact → ruamel 重新 dump 成 YAML → 再 expand 与原结果相等（equal: True）。即"YAML-LD→JSON-LD→YAML"语义往返实测稳定。
- **不可逆/信息损失点（规范明示，A）**：YAML 注释按空白处理（规范 B 节：TURTLE 等其他序列化也没有保留注释的机制）；anchor 名不承载语义、处理中可丢弃（"anchor names MUST NOT be used to convey relevant information, MAY be altered…MAY be dropped"）；YAML 标量类型（如 YAML 1.1 时间戳）"MUST NOT be converted, MUST treat these values as strings"；非字符串 mapping key 直接报 mapping-key-error。即"可逆"指语义信息，不含注释/锚点名/键顺序等表现层信息。
- 结论：互操作工具已存在且实测可用；"任何 YAML-LD→JSON-LD"有规范与实现双重支撑；"可逆"仅语义级、限于 Basic profile，表现层细节（注释/锚点名）明确不保留。

### Q3 YAML-LD 能否直接承接 Obsidian 式 frontmatter：有无先例/教程

- **直接先例：remark-mdxld（npm 0.2.1，2024-12-15 发布，MIT，ai-primitives/remark-mdxld）**。npm 描述原文："Remark plugin for MDX with integrated support for YAML and YAML-LD Frontmatter"；README 原文："A remark plugin for MDX that adds integrated support for YAML-LD frontmatter…Supports both @ and $ prefixes for YAML-LD properties, with a preference for the $ prefix"；示例 `$type: https://mdx.org.ai/Document`；功能含 "Required frontmatter field validation (title, description, $type)"。这是"Markdown/MDX frontmatter 直接写 YAML-LD"的唯一公开先例（可核），但为个人/小项目、无官方背书、v0.2.1（beta 级）。
- **Obsidian 现状（官方文档，A）**：Properties 页原文 "Properties allow you to organize information about a note. Properties contain structured data such as text, links, dates, checkboxes, and numbers"；Source 模式 "displays properties in plain text YAML format"；官方明示不支持嵌套属性（"Nested properties: …not currently supported"）。即 Obsidian 原生只认普通 YAML frontmatter 键值对，无 YAML-LD 概念，也无官方迁移计划（未核，官方文档无 YAML-LD 提及）。
- **键值对→YAML-LD 上下文映射**：规范层面给出映射规则（mapping key 必须是 string、`@context` 内定义 term/前缀、$ 前缀别名见 json-ld.org dollar-convenience.jsonld）；实测顶层非引号 `@context` 会被 YAML 解析拒绝（"found character '@' that cannot start any token"），即 Obsidian 式裸键 frontmatter 不能原样升级，关键词必须加引号或用 `$` 别名 context——这是迁移路径上第一个必须处理的差异。教程级完整"frontmatter→YAML-LD 迁移"文档未找到（未核）。
- 结论：先例存在（remark-mdxld）且规范可支撑，但迁移不是透明替换：需要 ①引入 @context（引号包裹或 $ 别名）②处理嵌套属性（Obsidian 不支持，YAML-LD 支持 mapping 但 Obsidian UI 不显示）③决定 `@id` 与文件路径/锚点身份的关系（B7 一轮结论：文档载体节点身份=文件路径，YAML-LD 的 `@id` 是图侧身份，二者需应用层绑定）。

### Q4 YAML-LD 校验：能否配合 SHACL/ShEx

- **无直接先例**：w3c/yaml-ld 仓库 issue 搜索 "SHACL" 仅回显 issue #217（且标题不含 SHACL，正文含 SHACL 讨论），无任何 YAML-LD+SHACL 组合实现/教程/标准文本（可核搜索 + 未核搜索，判为无公开先例）。
- **社区断言（issue #217，2026-07-07，daddydrac 开，closed as invalid）**：原文 "SHACL validation cannot operate on YAML-LD directly; it validates RDF graphs produced after conversion"；"OWL DL/profile compliance cannot be guaranteed at the YAML syntax layer; it must be checked after RDF/OWL interpretation"。该 issue 整体诉求（拒 YAML-LD 作 canonical spec）被维护方以 invalid 关闭，但"SHACL 校验发生在 RDF 图而非 YAML 语法层"这一技术论断与 B5 一轮结论（封闭词表用 SHACL，SHACL 作用于 RDF 图）一致。
- **可行组合路径（推断 C）**：YAML-LD → to_rdf → N-Quads/RDF 图 → SHACL（pyshacl 已装可跑，或 npm rdf-validate-shacl）→ 校验封闭词表/必填属性；sh:closed/sh:in 语义不变，因为校验对象是转换后的 RDF。代价：每文档/每批先转换再校验，且 YAML 侧的语法错误（mapping-key-error、invalid-encoding、profile-error，规范 §5 YamlLdErrorCode）由 YAML-LD 处理器负责、SHACL 不覆盖。
- ShEx：同样无 YAML-LD 组合先例（未核/无公开证据）；ShEx 也作用于 RDF 图，路径与 SHACL 相同。

### Q5 "锚点逐字 grep + 人审"工作流：YAML-LD 载体是否同时保住两边的增益

- **正文侧（可 grep，A）**：Obsidian 官方文档 "notes are Markdown-formatted plain text files"（How Obsidian stores data 页，B7 一轮已核），YAML-LD 只约束 frontmatter/YAML 块，正文仍是 Markdown 纯文本——grep -F 固定字符串匹配直接作用于源文件，与 B7 R1 的锚点硬校验工作流兼容（推断 C，因为 YAML-LD 载体下正文段落不受 frontmatter 影响，但若正文中有 YAML 块/代码块需注意解析边界）。
- **图侧（YAML 块，A 规范约束 + C 推断）**：图数据进 frontmatter/YAML 块后可 expand/to_rdf 进 RDF 图，与 SHACL/SPARQL 打通。代价是必须遵守 YAML-LD 约束：关键词加引号或 $ 别名；YAML 注释被当作空白（逐字 grep 时注意注释内容不进入语义树）；折叠标量（`>-`）会改变字符串（实测 b7a_test.yaml 中 schema:description 用 `>-` 折叠，expand 后为单行字符串——若锚点值必须逐字，应避免折叠/自动换行，用引号或字面块 `|` 并自控换行）；锚点/别名（YAML `&`/`*`）名不承载语义、处理时可丢弃，不能把"锚点"身份押在 YAML anchor 名上（B7 的"锚点"指正文逐字串，与 YAML anchor 术语无关——规范 4.2.1 也专门澄清 "anchor means YAML's node anchor mechanism…not related to HTML hyperlinks or URL fragment identifiers"）。
- **综合判断（推断 C）**：在"正文=Markdown 可 grep、图=frontmatter/YAML 块"的架构下，双增益在原理上成立：正文逐字 grep 不受影响，图侧获得标准 JSON-LD/RDF 互操作与 SHACL 校验路径；但这不是 Obsidian 现成能力（Obsidian 不解析 YAML-LD），需要自建工具链（remark-mdxld 式解析或 python-yaml-ld 批处理），且"同文件双真相"的判等/审计语义（图侧值 vs 正文逐字串）仍须应用层建模（B7 R1 已踩"frontmatter 是 YAML、正文是 Markdown、两者同文件"的坑）。无教程级端到端验证（未核）。

## 2 关键发现（论断 + URL + 标题 + 机构 + 日期 + 原文摘录 + 等级）

- **K1（A）YAML-LD 1.0 为 W3C Working Draft（2026-07-28），承诺"任何 YAML-LD 文档可表示为 JSON-LD"**
  - URL: https://www.w3.org/TR/yaml-ld/（本版 https://www.w3.org/TR/2026/WD-yaml-ld-10-20260728/）
  - 标题: YAML-LD 1.0 — W3C Working Draft 28 July 2026 | 机构: W3C JSON-LD Working Group
  - 摘录: "This document defines YAML-LD as a set of conventions on top of YAML which specify how to serialize Linked Data as YAML based on JSON-LD syntax, semantics, and APIs." / "this document identifies constraints on YAML such that any YAML-LD document can be represented in JSON-LD."
  - 原文到手：tmp/b7/yamlld_tr.html（全文）
- **K2（A）Basic profile 语义无损往返 + YAML 1.2（或更新向后兼容）处理器强制**
  - URL: https://www.w3.org/TR/yaml-ld/ | 标题: YAML-LD 1.0 WD | 机构: W3C
  - 摘录: "A YAML-LD document complies with the YAML-LD Basic profile…can be transformed into a JSON-LD11 representation, then back to a conforming YAML-LD document, without loss of semantic information." / "YAML-LD processors MUST use a YAML 1.2 (or later, backward-compatible) implementation"
- **K3（A）conformant 实现须通过 YAML-LD 套件 + JSON-LD API/Framing 套件；YAML 是 JSON 超集故测试应平凡**
  - URL: https://w3c.github.io/yaml-ld/#test-suites（WD §2.2）| 机构: W3C
  - 摘录: "To be conformant, an implementation MUST satisfy all test cases from the following test suites: YAML-LD tests…; JSON-LD API tests…; JSON-LD Framing tests…" / "Since YAML is a superset of JSON, testing a YAML-LD implementation against test cases from JSON-LD test suites should be trivial."
- **K4（A）官方测试套件：w3c/yaml-ld tests/ 共 58 用例，manifest 声明针对 YAML-LD JSON Profile**
  - URL: https://github.com/w3c/yaml-ld/tree/main/tests（manifest: w3c/yaml-ld/tests/manifest.jsonld）
  - 标题: The YAML-LD Test Suite | 机构: W3C（JSON-LD Community Group / WG）
  - 摘录（manifest）: "name": "Tests using YAML-LD JSON Profile"; 计数：58 = 35 Expand 正 + 16 Expand 负 + 3 ToRDF + 2 Compact + 1 Flatten + 1 Frame；baseIri "https://w3c.github.io/yaml-ld/tests/"
  - 原文到手：tests_manifest.jsonld、tests_README.md
- **K5（A）公开实现现状：Python 派生物 yaml-ld（1.1.22）为唯一成熟实现，官方规范仓库自用**
  - URL: https://pypi.org/project/yaml-ld/（meta JSON）+ https://github.com/iolanta-tech/python-yaml-ld
  - 标题: python-yaml-ld — "YAML-LD implementation for Python" | 机构: iolanta-tech / Anatoly Scherbakov
  - 摘录（PyPI）: "A Python implementation for handling YAML-LD documents. Basically, a wrapper on top of digitalbazaar/pyld." 函数清单 expand/compact/flatten/frame/to_rdf/from_rdf
  - 摘录（w3c/yaml-ld pyproject.toml）: dependencies = ["yaml-ld>=1.1.22", "PyLD<3.0.0", "iolanta>=2.1.42"]
- **K6（A 负面）pyld / jsonld.js / ruby-json-ld 均无 YAML 支持；JSON-LD Playground 把 YAML-LD 标为 (historic)**
  - URL: https://github.com/digitalbazaar/pyld | https://github.com/digitalbazaar/jsonld.js | https://github.com/ruby-rdf/json-ld | https://json-ld.org/playground/
  - 标题: pyld / jsonld.js / ruby-rdf/json-ld / JSON-LD Playground | 机构: digitalbazaar / ruby-rdf / JSON-LD Community Group
  - 证据: 抓取页面中 pyld 与 jsonld.js 与 ruby-json-ld 的 "yaml" 出现 0 次；Playground 侧栏 "YAML-LD 1.0 drafts (historic)" 且注释 "The playground uses jsonld.js which conforms to JSON-LD 1.1"
- **K7（B）npm 生态：无 yamlld 包；唯一相关包 remark-mdxld 是 frontmatter 插件（0.2.1）**
  - URL: https://www.npmjs.com/search?q=yamlld （total: 0）；https://www.npmjs.com/search?q=yaml-ld （total: 30168，模糊匹配，首条 remark-mdxld）
  - 机构: npm registry | 日期: 2026-08-12 检索
- **K8（A 本地实测）YAML-LD→JSON-LD→N-Quads→JSON-LD→YAML 全链路可跑通且语义往返稳定**
  - URL: 本地 tmp/venv_b7a + tmp/b7a_test.yaml + research_tree/tmp/b7a/local_test_log.md | 机构: 本分支实测（python 3.14.3 + yaml-ld 1.1.22 + PyLD 2.0.4）
  - 证据: expand 输出 schema:name/description/dateDiscovered 全 IRI；to_rdf(format='application/n-quads') 输出 3 句 N-Quads（含 xsd:date 类型）；from_rdf 回读一致；compact→ruamel YAML→再 expand equal: True
- **K9（A 本地实测）PyLD 3.1.0 与 yaml-ld 不兼容：官方 "PyLD<3.0.0" 约束为必要**
  - URL: 本地实测记录 | 机构: 本分支实测
  - 证据: 隔离安装 PyLD==3.1.0 后 import yaml_ld 报 "ImportError: cannot import name 'prepend_base' from 'pyld.jsonld'（yaml_ld/document_loaders/http.py:9）"；降级 PyLD 2.0.4 后正常
- **K10（A 本地实测 + A 规范）YAML-LD 关键词必须引号包裹或 $ 前缀别名；顶层裸 @context 被 YAML 拒绝**
  - URL: https://json-ld.org/contexts/dollar-convenience.jsonld（$id/$type/$value 等别名 context，原文到手）+ 本地实测
  - 证据: ruamel 报 "found character '@' that cannot start any token" → yaml_ld.errors.LoadingDocumentFailed: Document is not a valid YAML；dollar-convenience context 下 $id 可正常展开为 @id
- **K11（A 规范）mapping key 必须为字符串；新增错误码 invalid-encoding / mapping-key-error / profile-error；YAML 时间戳类标量必须按字符串处理**
  - URL: https://www.w3.org/TR/yaml-ld/（§4.4.2、§5、§4.3.1）| 机构: W3C
  - 摘录: "all mapping keys in YAML-LD MUST be strings. Otherwise, a mapping-key-error error is raised" / WebIDL enum YamlLdErrorCode { "invalid-encoding", "mapping-key-error", "profile-error" } / "YAML-LD processors MUST NOT perform such conversion and MUST treat these values as strings"
- **K12（A 规范）YAML 注释按空白处理；anchor 名不承载语义、可被丢弃；YAML anchor 与 HTML/URL 锚点无关**
  - URL: https://www.w3.org/TR/yaml-ld/（§4.1.2、§4.2.1、附录 B）| 机构: W3C
  - 摘录: "Comments in YAML-LD streams are treated as white space." / "anchor names MUST NOT be used to convey relevant information, MAY be altered…MAY be dropped" / "In this specification, anchor means YAML's node anchor mechanism…It is not related to HTML hyperlinks or URL fragment identifiers."
- **K13（A 先例）remark-mdxld：Markdown/MDX frontmatter 直接写 YAML-LD 的公开先例（@/$ 双前缀、含校验）**
  - URL: https://www.npmjs.com/package/remark-mdxld（0.2.1，2024-12-15，MIT）+ https://github.com/ai-primitives/remark-mdxld
  - 摘录: "Remark plugin for MDX with integrated support for YAML and YAML-LD Frontmatter" / "Supports both @ and $ prefixes for YAML-LD properties, with a preference for the $ prefix" / "Required frontmatter field validation (title, description, $type)"
- **K14（A 对照）Obsidian Properties 官方现状：仅普通 YAML frontmatter、Source 模式显示纯文本 YAML、不支持嵌套属性**
  - URL: https://help.obsidian.md/Editing+and+formatting/Properties | 机构: Obsidian Help
  - 摘录: "Properties contain structured data such as text, links, dates, checkboxes, and numbers" / "Source – displays properties in plain text YAML format" / "Nested properties: …not currently supported"；旧 URL（Advanced topics/YAML front matter）返回 "This page does not exist"（404，未核/已废弃）
- **K15（B/C）YAML-LD+SHACL 无组合先例；社区断言 SHACL 只能校验转换后的 RDF 图**
  - URL: https://github.com/w3c/yaml-ld/issues/217（2026-07-07 开，closed as invalid）+ issue 搜索 "SHACL" 无其他结果
  - 摘录: "SHACL validation cannot operate on YAML-LD directly; it validates RDF graphs produced after conversion."（B：社区讨论原文；C：组合路径为推断）
- **K16（B 负面）iolanta / rdflib-yaml-ld：生态集中于 iolanta-tech 一人/一组织，无多实现竞争**
  - URL: https://github.com/iolanta-tech/iolanta | https://github.com/iolanta-tech/rdflib-yaml-ld | https://iolanta.org
  - 证据: iolanta repo 0 提及 yaml-ld；rdflib-yaml-ld 标题 "YAML-LD support for rdflib"、0 star、2023-08 后未更新（README 正文未抓到，未核）；iolanta.org 显示 python-yaml-ld 8 star / 22 issues

## 3 冲突与张力

1. **规范承诺 vs 工具现实**：WD 承诺"任何 YAML-LD→JSON-LD + Basic profile 往返无损"，但公开实现只有一家 Python 派生物（yaml-ld 1.1.22），且该实现与 PyLD 3.1.0 不兼容、官方仓库需显式锁 PyLD<3.0.0——"标准可移植"与"单实现锁定"之间存在张力。
2. **"YAML 是 JSON 超集、测试应平凡" vs 实测踩坑**：规范称 YAML 超集使 JSON-LD 套件测试"trivial"，但本地实测显示 YAML 侧有真实摩擦：顶层裸 @context 被 YAML 解析器拒绝、Windows 路径 URL 解析 bug、手写 N-Quads 被严格解析器拒绝等——"平凡"是理论判断，工程化并非无摩擦。
3. **frontmatter 迁移的两难**：remark-mdxld 证明"MDX frontmatter 写 YAML-LD"可行，但 Obsidian 官方不支持嵌套属性、不支持 YAML-LD，且 YAML-LD 关键词需要引号/$ 别名——"保持 Obsidian 兼容"与"升级为 YAML-LD"不可兼得（要么破坏 Obsidian 解析，要么双写）。
4. **SHACL 的定位冲突**：B5 一轮结论"封闭词表用 SHACL"成立的前提是数据是 RDF 图；YAML-LD 侧 SHACL 只能后置（先 to_rdf）。"在 YAML 语法层做词表封闭校验"（issue #217 的批评方向）与"SHACL 只作用于 RDF"（B5/W3C 语义）冲突，前者无实现支撑。
5. **"可逆/无损"的口径**：规范与 PyPI 文档强调语义无损往返，但注释、anchor 名、键顺序、YAML 1.1 时间戳类型均明确不保留/禁止转换——"无损"与"逐字保真"是不同承诺，对"锚点逐字 grep"工作流必须分清（正文逐字 vs frontmatter 语义值）。

## 4 未决

1. 无任何公开的"实现支持状态清单"（官方 endorsed 实现页）：谁实现了 expand/to_rdf 的完整规范面，只能靠逐个仓库核验，未核。
2. "任何 YAML-LD 文档可表示为 JSON-LD"是否已由实现逐条覆盖 58 用例：本次未跑官方测试套件（venv 只做冒烟往返），未核。
3. YAML-LD+SHACL/ShEx 组合：零公开先例；"先 to_rdf 再 SHACL"是推断路径（C），无教程/案例原文。
4. frontmatter→YAML-LD 的教程级完整迁移指南：未找到（未核）；remark-mdxld 是代码级先例而非教程。
5. Obsidian 官方对 YAML-LD 的态度/路线图：官方文档零提及（未核，无任何官方声明）。
6. rdflib-yaml-ld 的 README/能力细节：仓库页可核，README 正文与 PyPI 发布情况未抓到（未核）。
7. 搜索引擎（Bing/DDG）结果页受反爬：检索过程有记录但结果不可复核，本报告的可核证据以 W3C/GitHub/npm/PyPI/Obsidian 官方页与本地实测为准（Bing 4 页、DDG 4 页均标"检索记录，结果未核"）。

## 5 来源清单

可核来源（URL / 标题 / 机构 / 等级 / 原文到手）：
1. https://www.w3.org/TR/yaml-ld/ — YAML-LD 1.0 WD 2026-07-28（本版 WD-yaml-ld-10-20260728）— W3C — A — 到手（tmp/b7/yamlld_tr.html 全文）
2. https://w3c.github.io/yaml-ld/ — YAML-LD Editor's Draft 主页 — W3C — A — 到手（与 TR 同文）
3. https://github.com/w3c/yaml-ld — "CG specification for YAML-LD and UCR" 仓库 README — W3C JSON-LD CG — A — 到手
4. https://github.com/w3c/yaml-ld/tree/main — 仓库目录（spec/tests/UCR/extended-profile/…）— W3C — A — 到手
5. https://github.com/w3c/yaml-ld/tree/main/tests — 测试套件目录（cases/、manifest.jsonld、README.md）— W3C — A — 到手
6. https://github.com/w3c/yaml-ld/blob/main/tests/manifest.jsonld — 58 用例 manifest（YAML-LD JSON Profile）— W3C — A — 到手
7. https://github.com/w3c/yaml-ld/blob/main/tests/README.md — YAML-LD Test Suite 说明 — W3C — A — 到手
8. https://github.com/w3c/yaml-ld/blob/main/pyproject.toml — 官方仓库依赖（yaml-ld>=1.1.22, PyLD<3.0.0, iolanta>=2.1.42）— W3C — A — 到手
9. https://github.com/w3c/yaml-ld/blob/main/package.json — 测试站点构建（jsdom/marked）— W3C — A — 到手
10. https://pypi.org/project/yaml-ld/ — PyPI yaml-ld 1.1.22 meta（wrapper on top of pyld，函数清单）— PyPI — A — 到手
11. https://github.com/iolanta-tech/python-yaml-ld — "YAML-LD implementation for Python" — iolanta-tech — A — 到手
12. https://python-yaml-ld.iolanta.tech/ — 官方文档（CLI "Command line tool to operate on ＊-LD data"；Parsers: YAML-LD/JSON-LD、Turtle、RDF/XML）— iolanta-tech — A — 到手（含 to-rdf / from-rdf 页）
13. https://github.com/digitalbazaar/pyld — JSON-LD Python 库（yaml 出现 0 次）— digitalbazaar — A（负面）— 到手
14. https://github.com/digitalbazaar/jsonld.js — JSON-LD JS 库（yaml 出现 0 次）— digitalbazaar — A（负面）— 到手
15. https://github.com/ruby-rdf/json-ld — Ruby JSON-LD reader/writer（yaml 出现 0 次）— ruby-rdf — A（负面）— 到手
16. https://github.com/iolanta-tech/iolanta — "Browse and visualize Linked Data with Python"（yaml-ld 0 提及）— iolanta-tech — A（负面）— 到手
17. https://github.com/iolanta-tech/rdflib-yaml-ld — "YAML-LD support for rdflib"（0 star，2023-08）— iolanta-tech — B（页面可核，README 正文未核）— 到手（页面）
18. https://iolanta.org — iolanta-tech 组织页（python-yaml-ld/rdflib-yaml-ld/yaml-ld 挂靠）— iolanta-tech — A — 到手
19. https://www.npmjs.com/package/remark-mdxld — remark-mdxld 0.2.1（"integrated support for YAML and YAML-LD Frontmatter"）— npm — A — 到手
20. https://github.com/ai-primitives/remark-mdxld — 仓库 README（@/$ 双前缀、validation、MIT）— ai-primitives — A — 到手
21. https://www.npmjs.com/search?q=yamlld — npm 搜索 total=0 — npm registry — A — 到手
22. https://www.npmjs.com/search?q=yaml-ld — npm 搜索（30168 模糊结果，首条 remark-mdxld）— npm registry — A — 到手
23. https://json-ld.org/playground/ — JSON-LD Playground（"YAML-LD 1.0 drafts (historic)"）— JSON-LD CG — B — 到手
24. https://github.com/w3c/yaml-ld/issues/217 — "Reject YAML-LD as a canonical semantic spec…"（closed as invalid；含 SHACL 断言）— W3C 社区 — B — 到手
25. https://github.com/w3c/yaml-ld/issues?q=SHACL — issue 搜索（仅 #217 命中）— W3C 社区 — B — 到手
26. https://json-ld.org/contexts/dollar-convenience.jsonld — $id/$type/$value 等关键词别名 context — JSON-LD CG — A — 到手
27. https://help.obsidian.md/Editing+and+formatting/Properties — Obsidian Properties（结构化数据/Source 纯文本 YAML/不支持嵌套）— Obsidian Help — A — 到手
28. https://help.obsidian.md/Advanced+topics/YAML+front+matter — 旧 YAML front matter 页（404 "This page does not exist"）— Obsidian Help — 未核/404 — 到手（404 页）
29. https://help.obsidian.md/How+to/How+Obsidian+stores+data — Obsidian 存储方式（notes 为 Markdown 纯文本文件；B7 一轮已核）— Obsidian Help — A — 已由 B7 引用
30. 本地实测：tmp/venv_b7a（yaml-ld 1.1.22/PyLD 2.0.4/pyshacl 0.40.1）+ tmp/b7a_test.yaml + research_tree/tmp/b7a/local_test_log.md — 本分支实测 — A（本地）— 到手
31. 检索记录（结果不可复核）：Bing ×4、DuckDuckGo ×4（"Anomaly" 反爬）— 搜索引擎 — 未核 — 仅检索记录

来源类型统计：W3C 规范/测试套件/社区（1-9, 23-26）；包注册表 PyPI/npm（10, 19, 21-22）；官方文档（12, 27-29）；GitHub 仓库（3-9, 11, 13-18, 20）；社区 issue（24-25）；本地实测（30）；搜索引擎记录（31）——≥7 类（达标要求 ≥3）。
可核来源计数：1-30 号共 30 项（其中 #28 为 404 未核、#29 转引 B7）；原文到手 ≥25（达标要求 ≥15 可核 / ≥10 原文到手）。

## 6 判死自查

- **候选逐一查证（≥5）**：w3c/yaml-ld（官方）、python-yaml-ld、rdflib-yaml-ld、digitalbazaar/pyld、digitalbazaar/jsonld.js、ruby-rdf/json-ld、iolanta、remark-mdxld、JSON-LD Playground、npm 搜索 yamlld/yaml-ld、Obsidian Properties、W3C TR 页 —— 共 12 项逐一核验（含 4 项负面证据与 1 项 404）✓
- **关键词组（≥4）**：①"YAML-LD parser implementation / YAML-LD 解析器 工具"（GitHub/npm/PyPI 检索）②"YAML-LD to JSON-LD conversion / YAML-LD JSON-LD 转换"（WD 互操作承诺 + python-yaml-ld API + 本地实测）③"markdown frontmatter YAML-LD migration / frontmatter YAML-LD 迁移"（remark-mdxld、Obsidian Properties）④"YAML-LD validation SHACL / YAML-LD SHACL 校验"（issue #217、issue 搜索）✓
- **工作量红线**：可核来源 30（原文到手 ≥25）≥15/10 ✓；来源类型 ≥7 类 ≥3 ✓；候选查证 12 ≥5 ✓；关键词 4 组 ≥4 ✓
- **禁止项**：未做笔记软件评测（Obsidian 仅作 frontmatter 载体对照）；未越界到 RDF 语法细节（to_rdf 只证明互操作链路，语法规范归 B1）；未捏造来源（全部 URL/机构/日期/摘录来自实际抓取文件或本地实测；抓不到的标"未核"）；推断一律标 C（Q5 双增益、SHACL 组合路径、rdflib-yaml-ld 能力）；搜索引擎结果页不可复核，如实标"未核/仅检索记录"。

