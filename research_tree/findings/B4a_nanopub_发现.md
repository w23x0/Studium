# B4a 发现 — nanopub / trusty URI / 出处机制（M09 版本与出处载体）

调研员：中心代执行（B4a，B4 时间版本系 R2 子任务）｜日期：2026-08-12｜基线：B4_时间版本_发现.md
范围：只核 nanopub 与 trusty URI 的机制细节；IPLD/哈希链数据结构归 B4b；RDF 语法细节归 B1；不比较数据库/引擎。

## 0 一句话结论

nanopub 是"三段式 RDF 容器 + trusty URI 内容寻址标识 + 去中心 server 网络"的完整发布体系：官方规范给出严格 well-formed 判据（四图 Head/Assertion/Provenance/PublicationInfo、URI 全部非空、三元组必须落在四图之一），trusty URI（SHA-256 哈希内嵌 URI、推荐作 integrity key）实现"发布后不可删、只能撤回或被新版本 supersede"的不可变语义，与 M09"旧结论不覆盖、可标记撤回、防篡改"高度契合；但官方 server 明确"只返回整条 nanopub、不支持查询、无 triple store"，粒度查询需自建上层索引/SPARQL 服务；对 522 节点/几十次更新/年的个人规模，机制可完整落地但需自行承担 server+索引两套基建，官方网络规模数据（10M+ nanopub、约 10-15kB/条）证明其面向的是科学数据大规模去中心发布，个人规模属"可用但为小马拉大车"（推断，标 C）。

## 1 逐条回答

### Q1 nanopub 格式（三段式）、发布-检索基础设施、标准状态——官方原文

- **三段式结构与四图模型**：官方 Guidelines（working draft）定义 nanopublication 由 assertion/provenance/publication info 三部分组成，每部分是一个 RDF 图；另有一个 head 图（`:Head`）把 nanopub 本体与其三部分链接起来（`: a np:Nanopublication . : np:hasAssertion :assertion . : np:hasProvenance :provenance . : np:hasPublicationInfo :pubinfo .`）。命名空间 `http://www.nanopub.org/nschema#`，用 OWL 定义 np:Nanopublication/Assertion/Provenance/PublicationInfo 类与三个 FunctionalProperty（K1、K2）。
- **well-formed 判据**：官方 Guidelines 用 MUST 级给出 9 条结构判据（RDF quads 集合；每个 triple 的 context 必须是合法 URI 不能为空；恰好一个 `[N] rdf:type np:Nanopublication [H]`；[N]/[H]/[A]/[P]/[I] 五个 URI 必须互不相同；所有 triple 必须落在 [H]/[A]/[P]/[I] 之一；[P] 中至少一条引用 [A]；[I] 中至少一条引用 [N]）（K2）。
- **标准状态**：**非 W3C 标准**。nanopub.org 自述 "community-driven approach"，Guidelines 为 "working draft"；官网表述 "Nanopublications are implemented in the language RDF and come with an evolving ecosystem of tools and systems"（K1）。nanopub 建立在 W3C RDF/OWL/SPARQL 之上（K1、K2）。
- **基础设施**：去中心 server 网络（nanopub-server 实现），nanopub-java 库负责生成/签名/发布，nanodash 为浏览/发布 web 客户端；server 网络规模与健康状态有 nanopub monitor（K5、K6、K8）。

### Q2 trusty URI（可信 URI）：内容寻址、不可变标识、签名，与 M09 的契合点与限制

- **结构**：trusty URI 以 Base64 字符结尾，末 45 字符 = artifact code（前 2 字符=模块标识，如 RA=RDF 图集合、FA=纯文件字节；后 43 字符=SHA-256 哈希）。规范 v1（2015-02-23）与 trustyuri.net 官方页给出定义与模块说明（K3、K4）。
- **验证语义**：Definition 4："Given a potential trusty URI and a digital artifact, if the identifier part refers to an module that returns a hash value for the digital artifact that is identical to the one encoded in the hash part, then the potential trusty URI is a verified trusty URI"——即内容可随时重算哈希验证（K4）。
- **不可变与权威转移**：ESWC 2014 论文："our approach entails a certain shift of authority: Once a trusty URI is established, its artifact code defines what object it refers to, and the issuing authority has no longer the power to change its meaning"（K7）。
- **对 RDF 图级内容寻址**：trusty URI 的 RA 模块在 RDF 图集合抽象层算哈希（而非字节层），使"同一内容不同序列化"哈希不变；论文明确 blank node 规范化是难点（"In the general case, RDF graph normalization is known to be a very hard problem, possibly unsolvable in polynomial time… Without blank nodes, normalization boils down to sorting of RDF triples"）（K7、K9）。
- **限制（与 M09 对照）**：trusty URI 提供"内容防篡改+不可变标识"，但**不含时间戳/版本语义**本身——版本化靠"新 nanopub 引用旧 nanopub + 撤回标记"的应用层约定（K5、K10）；也不含签名（签名在 nanopub 流程中由 nanopub-java 的 RSA 密钥对签名步骤单独提供，K6）；**trusty URI 与内容必须成对存储**，仅有 URI 无法反推内容（K3、K4 隐含，标 C）。

### Q3 nanopub 的检索与查询：按断言/时间/掌握状态查询？SPARQL 端点？

- **官方 server 层不提供查询**：nanopub-server README 原文："Such a server only returns entire nanopubs. No queries supported; no triple store involved."（K5）。
- **查询路径一：SPARQL 查询模板**——Guidelines 提供把整条 nanopub 从 triple store 提取的 SPARQL 查询模板（union 四图）；即查询需自建 triple store 灌入后用 SPARQL（K2）。
- **查询路径二：上层服务**——PeerJ 论文设计"core services"（解析反向引用"哪些 nanopub 引用此条"、按作者/URI 检索）与"advanced services"（SPARQL 端点/Triple Pattern Fragments/关系库缓存；"Such a service would regularly check for new data in the server network… and replace outdated nanopublications in its triple store with new ones"）（K5）。
- **对"某学习者对某知识点的掌握状态"查询**：无现成机制；需在 assertion 图里用自定义谓词表达"掌握状态"并在上层 SPARQL 索引里查询（推断，标 C；官方无"掌握状态"先例，未核）。

### Q4 nanopub 对"个人规模"（几百节点、几十次更新/年）是否过度设计？先例？

- **规模数据**：eScience 2018 论文摘要："More than 10 million such nanopublications have been published"，且"mostly from Life Science domains"（K10）；nanopub-server README 给单条存储量级："Disk space of up to around 15kB per nanopublication (10-11kB is average so far)"（K5）。522 节点/1433 边/921 锚点（约几千条候选断言）在这个量级面前是极小规模。
- **设计取向**：nanopub 面向"科学数据去中心化发布"（可引用、可归属、可审计），PeerJ 论文把可靠性/去中心化/长期归档作为核心动机（K5）；个人单机场景其去中心冗余/服务器网络/监控等机制基本用不上。
- **先例与结论**：官方/社区无"个人学习记录"先例（未核）；nanobench 等基准面向 server 网络性能。结论（推断 C）：机制层（三段式+trusty URI+撤回）对个人规模不构成技术负担，但"去中心网络/多 server"那一整套是过度设计，个人可裁剪为"本地 nanopub 目录 + 自建小 triple store 索引"。

### Q5 版本化：复检→新结论 = 新 nanopub + 撤回旧的？retraction 机制规范原文

- **不可删除/不可撤回发布，只能标记**：PeerJ 论文原文："(As with classical publications, a nanopublication—once published to the network—cannot be deleted or 'unpublished,' but only marked retracted or superseded by the publication of a new nanopublication.)"（K5）。
- **机制不是单一规范**：PeerJ 论文指出如何描述"引用旧版本、标记撤回、评审"需"使用既有本体（并必要时定义新本体）"，即**没有一套统一的"撤回谓词"规范原文**；nanopub 社区通过 ontology 描述这些关系（K5、K10 佐证；具体谓词集合未核）。
- **与 M09 的映射（推断 C）**：一次"复检→新掌握结论"= 发布一条新 nanopub（含新断言+provenance 记录复检动作）+ 对旧结论 nanopub 发布撤回/supersede 标记；两条均不可变、旧版仍在链上，完全符合"不覆盖旧结论"红线；但"撤回是发布另一条 nanopub 还是原条加标记"的工程形态取决于所用客户端/本体约定（未核）。

## 2 关键发现（论断+URL+标题+机构+日期+原文摘录+等级）

- **K1｜nanopub 官方定义：最小可发布信息单元；三段式（Assertion/Provenance/Publication Info）；基于 RDF 实现**（等级 A）
  - URL：https://nanopub.org/wordpress/?page_id=65（经 Wayback 快照取回，原文 site 当时不可达）｜标题：What is a Nanopublication?｜机构：nanopub.org（社区）｜日期：页面 ©2022，快照访问 2026-08-12
  - 摘录："A nanopublication is the smallest unit of publishable information… a nanopublication has three basic elements: Assertion: The assertion is the main content of a nanopublication in the form of an small atomic unit of information; Provenance: This part describes how the assertion above came to be…; Publication Info: This part contains metadata about the nanopublication as a whole, such as when and by whom it was created and the license terms for its reuse."；"Nanopublications are implemented in the language RDF and come with an evolving ecosystem of tools and systems. They can be published to a decentralized server network, for example, and then queried, accessed, reused, and linked."
  - 备注：官方首页标语 "FAIR data containers for scientific results, and more"（https://nanopub.org/wordpress/ 快照）。

- **K2｜Nanopublication Guidelines（working draft）：四图结构、OWL 本体、9 条 well-formed MUST 判据、SPARQL 提取模板、integrity key 推荐 trusty URI**（等级 A）
  - URL：http://nanopub.net/guidelines/working_draft/（经 Wayback 快照）｜标题：Nanopublication Guidelines｜机构：nanopub.org 社区｜日期：working draft，快照访问 2026-08-12
  - 摘录："a community-driven approach to representing structured data along with its provenance as small self-contained and citable entities. A nanopublication consists of an assertion, the provenance of the assertion… and the provenance of the whole nanopublication (called 'publication info')."；"We recommend using TriG syntax for writing nanopublications."；well-formed 判据（节选）："A nanopublication consists of a set of RDF quads (i.e. subject-predicate-object + context)"; "The context (i.e. graph) of each triple has to be specified as a valid URI (i.e. no null values)"; "The URIs for [N], [H], [A], [P], [I] must all be different"; "All triples must be placed in one of [H] or [A] or [P] or [I]"; "Triples in [P] have at least one reference to [A]"; "Triples in [I] have at least one reference to [N]"; integrity key："Trusty URIs [5] are the recommended way of assigning integrity keys to nanopublications."
  - 备注：本体摘要：np:hasAssertion/hasProvenance/hasPublicationInfo 为 owl:FunctionalProperty，命名空间 http://www.nanopub.org/nschema#。

- **K3｜Trusty URI 官方规范 v1（2015-02-23）：Base64 artifact code、模块标识、SHA-256 内容哈希、verified trusty URI 定义**（等级 A）
  - URL：https://github.com/trustyuri/trustyuri-spec（README 原文经 raw.githubusercontent 取回）｜标题：Trusty URI Specification – Version 1｜机构：Tobias Kuhn, trustyuri.net｜日期：2015-02-23
  - 摘录："Every trusty URI ends with at least 25 Base64 characters. The sequence of characters following the last non-Base64 character is called the artifact code. The first two characters of the artifact code are called the module identifier."；Definition 4："Given a potential trusty URI and a digital artifact, if the identifier part refers to an module that returns a hash value for the digital artifact that is identical to the one encoded in the hash part, then the potential trusty URI is a verified trusty URI and the digital artifact is its verified content."；Module FA："A hash value is calculated using SHA-256 on the content of the file in byte representation."

- **K4｜trustyuri.net 官方页：模块现状（FA=文件字节 / RA=RDF 图集合）、43 字符哈希、三语言参考实现**（等级 A）
  - URL：http://trustyuri.net/｜标题：Trusty URIs｜机构：trustyuri.net｜日期：访问 2026-08-12
  - 摘录："Generally, trusty URIs are URIs that contain a certain kind of hash value that can be used to verify the respective resource."；"The first two characters of the artifact code (RA in this example) define the type and version of the module. (Only FA for plain file content and RA for sets of RDF graphs are supported at this point.) The remaining 43 characters are the actual hash value."
  - 备注：列出 trustyuri-java/perl/python 三个（部分）实现。

- **K5｜Decentralized provenance-aware publishing with nanopublications（PeerJ CS 2016）：不可删只可撤回/supersede；server 网络无查询；core/advanced services 分层设计**（等级 A，全文到手）
  - URL：https://peerj.com/articles/cs-78/｜标题：Decentralized provenance-aware publishing with nanopublications｜机构：PeerJ Computer Science（作者 Kuhn, Dumontier 等）｜日期：2016-08-16（v1 2016-05）
  - 摘录："(As with classical publications, a nanopublication—once published to the network—cannot be deleted or 'unpublished,' but only marked retracted or superseded by the publication of a new nanopublication.)"；"Core services could involve things like resolving backwards references (i.e., 'which nanopublications refer to the given one?') and the retrieval of the nanopublications published by a given person or containing a particular URI."；"as nanopublications are immutable, they are easy to cache"；"how to use existing ontologies (and to define new ones where necessary) to describe properties and relations of nanopublications, such as referring to earlier versions, marking nanopublications as retracted, and reviewing of nanopublications."
  - 备注：第 66 段示例以 TriG 格式写 nanopub；评价部分以"排序后的 N-Quads 表示"作为规范化比较基准。

- **K6｜nanopub-server README：server 只返回整条 nanopub、无查询、无 triple store；MongoDB 存储；单条约 10-15kB；Docker/Java 部署**（等级 A）
  - URL：https://github.com/Nanopublication/nanopub-server（经 Wayback 快照）｜标题：Nanopub Server｜机构：Nanopublication 社区（原 tkuhn/nanopub-server）｜日期：README 访问 2026-08-12（快照）
  - 摘录："(Such a server only returns entire nanopubs. No queries supported; no triple store involved.)"；"Disk space of up to around 15kB per nanopublication (10-11kB is average so far, but this value might change…)"
  - 备注：README 引用 ISWC 2015 论文（arXiv 1411.2749）、PeerJ Preprints 1760、nanopub-java LISC 2015（arXiv 1508.04977）。

- **K7｜Trusty URIs: Verifiable, Immutable, and Permanent Digital Artifacts for Linked Data（ESWC 2014, LNCS 8465）：哈希内嵌 URI、权威转移、RDF 规范化难点**（等级 A，全文到手）
  - URL：https://link.springer.com/chapter/10.1007/978-3-319-07443-6_27｜标题：Trusty URIs: Verifiable, Immutable, and Permanent Digital Artifacts for Linked Data｜机构：Springer LNCS 8465（作者 Kuhn, Dumontier；ETH Zurich / Stanford）｜日期：ESWC 2014
  - 摘录："To make digital resources on the web verifiable, immutable, and permanent, we propose a technique to include cryptographic hash values in URIs."；"our approach entails a certain shift of authority: Once a trusty URI is established, its artifact code defines what object it refers to, and the issuing authority has no longer the power to change its meaning."；"In the general case, RDF graph normalization is known to be a very hard problem, possibly unsolvable in polynomial time… Without blank nodes, normalization boils down to sorting of RDF triples, which can be performed in O(n log n)."

- **K8｜nanopub-java README：RDF4J 实现、官方 guidelines 结构、RSA 密钥对签名、发布到 server**（等级 A）
  - URL：https://github.com/Nanopublication/nanopub-java（README 经 raw.githubusercontent 取回）｜标题：nanopub-java｜机构：Nanopublication 社区｜日期：仓库 master，访问 2026-08-12
  - 摘录："This is a Java library for nanopublications… based on RDF4J. It implements the formal structure defined in the official nanopublication guidelines."；quickstart 流程：MakeKeys.make("~/.nanopub/id", SignatureAlgorithm.RSA) → NanopubCreator → SignNanopub.signAndTransform → PublishNanopub.publishToTestServer/publish。

- **K9｜Making Digital Artifacts on the Web Verifiable and Reliable（IEEE TKDE 27(9), 2015；arXiv 1507.01697）：格式无关验证、整棵引用树可验证**（等级 A，arXiv 摘要到手；全文 PDF 可经 arXiv 获取未逐段核）
  - URL：https://arxiv.org/abs/1507.01697｜标题：Making Digital Artifacts on the Web Verifiable and Reliable｜机构：IEEE TKDE / arXiv（Kuhn, Dumontier）｜日期：arXiv v1 2015-07-07；期刊 2015
  - 摘录："we propose trusty URIs containing cryptographic hash values. We show how trusty URIs can be used for the verification of digital artifacts, in a manner that is independent of the serialization format in the case of structured data files such as nanopublications."；"the contents of these files become immutable, including dependencies to external digital artifacts and thereby extending the range of verifiability to the entire reference tree."

- **K10｜Nanopublications: A Growing Resource of Provenance-Centric Scientific Linked Data（IEEE e-Science 2018）：10M+ 条、生命科学为主、可访问/查询方式**（等级 B——官方摘要经 Semantic Scholar API 到手，IEEE 全文未到手）
  - URL：https://doi.org/10.1109/eScience.2018.00024（arXiv 预印：https://arxiv.org/abs/1809.06532 已验证可达）｜标题：Nanopublications: A Growing Resource of Provenance-Centric Scientific Linked Data｜机构：IEEE 14th Int. Conf. on e-Science（作者 Kuhn, Meroño-Peñuela, Malic, Poelen, Hurlbert, Dumontier 等 15 人）｜日期：2018-10
  - 摘录："More than 10 million such nanopublications have been published, which now form a valuable resource…"; "In contrast to the common Linked Data publishing practice, nanopublications work at the granular level of atomic information snippets and provide a consistent container format to attach provenance and metadata at this atomic level."

- **K11｜The Anatomy of a Nanopublication（2010）—— 概念起源（Groth/Gibson/Velterop）**（等级 B——Crossref 元数据到手，全文未到手）
  - URL：https://doi.org/10.3233/ISU-2010-0613｜标题：The anatomy of a nanopublication｜机构：Information Services & Use 30(1-2):51-56（IOS Press）｜日期：2010
  - 摘录（Crossref 元数据）：title "The anatomy of a nanopublication"；container Information Services and Use；issued 2010。（Guidelines 参考文献 [1] 亦引用此篇。）

- **K12｜Publishing without Publishers（ISWC 2015，arXiv 1411.2749）：去中心发布/检索/归档协议论文**（等级 A——arXiv 摘要到手）
  - URL：https://arxiv.org/abs/1411.2749｜标题：Publishing without Publishers: a Decentralized Approach to Dissemination, Retrieval, and Archiving of Data｜机构：arXiv（Kuhn, Chichester, Krauthammer, Dumontier）｜日期：arXiv v1 2014-11-11，v2 2015-07-22（ISWC 2015）
  - 摘录（页面元数据）：作者与版本信息如上；该文被 nanopub-server README 引为网络设计论文（K6）。

- **K13｜nanodash：浏览与发布 nanopublications 的 web 客户端（社区工程现状）**（等级 A——GitHub 页面经 Wayback 快照）
  - URL：https://github.com/knowledgepixels/nanodash｜标题：nanodash – A web client to browse and publish nanopublications｜机构：knowledgepixels｜日期：仓库 master，访问 2026-08-12（快照）
  - 摘录："A web client to browse and publish nanopublications."（AGPL-3.0）

## 3 冲突与张力

1. **"官方标准 vs 社区规范"**：nanopub Guidelines 是社区 working draft、非 W3C 标准（K1/K2），而项目红线要求"可稳定查询审查"；若采用，其格式稳定性取决于社区维护，需自建冻结版本（推断 C）。
2. **"不可变撤回 vs 查询最新态"**：nanopub 网络本身不可删只能撤回（K5），但查询"当前掌握状态"需要上层服务把最新版物化并替换（K5 明确 advanced service 会 replace outdated nanopublications）——物化层与不可变层语义分离，与 B4 一轮"单调事实层+非单调当前视图"的结论一致。
3. **"trusty URI 内容寻址 vs 锚点逐字 grep -F"**：trusty URI 的 RA 模块在 RDF 图抽象层哈希，且 blank node 规范化困难（K7）；锚点作为字符串字面量需先按 RDF 转义还原才能逐字比对（B1 结论），trusty URI 不改变这一判等路径，只提供"整图防篡改"。
4. **"规模设计 vs 个人场景"**：10M+ 条/去中心网络（K10/K5）vs 522 节点个人库——机制可裁剪但官方工具链与个人单机工作流（markdown+JSONL+grep）的集成成本未被任何先例覆盖（未核）。

## 4 未决

- U1：nanopub 撤回的具体谓词/本体（如哪条 RDF 属性标记 retracted、superseded-by）没有抓到单一规范原文——需进一步查 nanopub 社区 ontology 或具体客户端实现（未核）。
- U2：个人规模（几百节点、几十次更新/年）使用 nanopub 的官方/社区先例——未核（未见非科学领域个人笔记先例）。
- U3：nanopub 官方 server 的"版本/时间查询"接口：是否按发布时间范围检索——未核（README 只说了无查询）。
- U4：trusty URI RA 模块对"含 blank node 的 RDF 图"的处理现状（论文 2014 说明难，规范 v1 是否给出实际算法）——未核。
- U5：nanopub.org 官网 2026-08 直接访问不可达（域名解析失败/超时），所有官网内容经 Wayback 快照取回——快照时效需复核。

## 5 来源清单

| # | 来源 | 类型 | 原文到手 |
|---|---|---|---|
| 1 | nanopub.org What is a Nanopublication?（Wayback） | 社区官方 | A |
| 2 | nanopub.org 首页（Wayback） | 社区官方 | A |
| 3 | Nanopublication Guidelines working draft（Wayback） | 社区规范 | A |
| 4 | Kuhn & Dumontier, Trusty URIs, ESWC 2014 (Springer LNCS 8465) | 学术论文 | A |
| 5 | Kuhn & Dumontier, Decentralized provenance-aware publishing, PeerJ CS 2016 | 学术论文 | A |
| 6 | Kuhn & Dumontier, Making Digital Artifacts Verifiable and Reliable, TKDE 2015 (arXiv 1507.01697) | 学术论文 | A(摘要) |
| 7 | trustyuri.net | 社区官方 | A |
| 8 | Trusty URI Specification v1 (trustyuri-spec) | 规范 | A |
| 9 | nanopub-java README | 工程实现 | A |
| 10 | nanopub-server README（Wayback） | 工程实现 | A |
| 11 | Kuhn et al., Publishing without Publishers, arXiv 1411.2749 | 学术论文 | A(摘要) |
| 12 | Kuhn et al., Nanopublications: A Growing Resource…, eScience 2018 (DOI + S2 摘要) | 学术论文 | B(摘要) |
| 13 | Groth et al., The Anatomy of a Nanopublication, ISU 2010 (Crossref) | 学术论文 | B(元数据) |
| 14 | nanodash GitHub（Wayback） | 工程实现 | A |
| 15 | arXiv 1809.06532（growing resource 预印本，HTTP 200 验证） | 学术论文 | B(可达验证) |

来源类型：社区官方/规范 3、学术论文 6、工程实现 4、元数据服务 2——≥3 类达标。候选逐一查证：nanopub 三段式、trusty URI、nanopub server 网络、撤回机制、查询路径（SPARQL 模板/无查询 server）、规模先例——≥5 达标。

## 6 判死自查

- 无来源论断？否——每条关键发现含 URL+机构+日期+摘录+等级。
- 二手当原文？否——B 级均显式标注且注明"全文未到手/元数据到手"。
- 越界漏答？否——5 问逐条作答；IPLD/RDF 语法均标注归其他分支。
- 推断当结论？否——Q3/Q4/Q5 的"个人场景映射"均标 C，U1-U5 未决未冒充结论。
- 本项目红线：不物理删除（nanopub 语义即"不可删只可撤回"，与红线一致）；锚点判等（K7 冲突登记明确 trusty URI 不改变判等路径）；候选池/审计/四图不合并/M09 锚定 M08 等未受本分支任何论断动摇。
