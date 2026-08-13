# B4b 发现 — IPLD / 内容寻址数据结构的版本链机制

调研员：中心代执行（B4b，B4 时间版本系 R2 子任务）｜日期：2026-08-12｜基线：B4_时间版本_发现.md
范围：只核 IPLD/CID/内容寻址/版本链机制与 IPFS-IPLD 生态先例；nanopub/trusty URI 归 B4a，RDF 语法归 B1；不比较数据库/引擎产品，不做产品评测。
证据等级：A=原文到手并摘录；B=可靠二手/官方汇总页；C=推断/未核。

## 0 一句话结论

IPLD 把"旧版本不覆盖"做成**默认语义而非附加功能**：数据块由其内容哈希寻址（CID=多哈希 multihash+编解码器，官方定义"类型化内容地址"），任何修改都会产生新 CID，旧块在语义上永不消失（IPFS 官方文档原话："Node B is not being edited… Nothing is overwritten"），版本历史由此天然表达为"新块用 CID 链接到旧块"的链表/DAG（git 同构），官方文档与工程实现（ipfs-log/OrbitDB 的 append-only log）都有直接先例；防篡改保证 = 逐块哈希自验证（multihash 自描述）+ 链/DAG 结构传递不可变，与 RFC 6962 的 Merkle 树 append-only 日志属同一思想族（6962 用树根签名+一致性证明做"证明旧版本被新版本包含"的公开审计，IPLD 用块级哈希做无需信任的逐块验证，两者互补而非二选一）；对"锚点逐字 grep -F + 人审"工作流：dag-json 层是规范化的可读 JSON（CID 以 base32/base58 字符串内嵌，CID 本身不可读、官方只给"人读形式"作调试指导），迁移无现成先例（推断 C），个人规模采用需自备工具链。

## 1 逐条回答

### Q1 IPLD 规范（data model / codecs / dag-cbor / dag-json）与 CID 的官方定义原文；CID 是否稳定指向不可变内容

- **IPLD 不是一个单一规范，而是一组规范**：官方 specs README 原话 "IPLD is not a single specification, it is a set of specifications." Block layer 定义"所有内容寻址块格式、块如何寻址、如何自描述编解码器、块之间如何链接"；Codecs 层定义 Data Model ↔ 字节的序列化；DAG-CBOR/DAG-JSON 是"currently enable the most complete form of the Data Model"的原生 codec（K1）。
- **Data Model**：9 种 kinds（Null/Boolean/Integer/Float/String/Bytes/List/Map/Link），Link kind 官方定义 "A link represents a piece of information which points to more data in another IPLD block… Links are concretely implemented as CIDs"（K2、K3）。
- **CID 官方定义**：三处一致——IPLD CID 规范（Status: Descriptive - Final）："A CID is a hash-based content identifier. Includes the codec and multihash."；现行维护版（specs.ipfs.tech，status permanent，2026-06-26）："A CID is a self-describing content-addressed identifier… Concretely, it's a *typed* content address: a tuple of (content-type, content-address)"；multiformats/cid 历史版同义（K4、K5、K6）。
- **CID 结构**：CIDv1 二进制 = `<multicodec-cidv1><multicodec-content-type><multihash-content-address>`；字符串形式 = multibase 前缀 + base 编码的二进制 CID（K5、K6）。multihash 格式 = `<varint hash function code><varint digest size in bytes><hash function output>`，自描述哈希算法（K7）。
- **CID 稳定指向不可变内容**：是。IPFS 文档（Content addressing）："Any difference in the content will produce a different CID. The same content added to two different IPFS nodes using the same settings will produce the same CID"（K15）；IPFS 文档（Immutability）："A CID is an absolute pointer to content. No matter when we request a CID, the CID value will always be the same"（K14）。"稳定"指同一内容恒同 CID、改动内容必换 CID——不是"一个可变的名称绑定"。

### Q2 IPLD 如何表达"对象旧版本不覆盖"：链表/DAG 承载版本历史是否有规范或教程先例

- **官方机制级陈述（教程先例）**：IPFS Docs "Merkle Directed Acyclic Graphs (DAGs)" 给出链表示例 "A=Hash(B)→B=Hash(C)→C=Hash(∅)"，并断言 "Merkle DAG nodes are immutable. Any change in a node would alter its identifier and thus affect all the ascendants in the DAG, essentially creating a different DAG"（K12）。
- **官方动机文档**：IPLD "Benefits of Content Addressing"："Since data is addressed by its content, it is also immutable by default… if you'd like to keep track of changes, you can build a DAG that links to earlier versions of a piece of data"——官方明示"用链接到早期版本的 DAG 记录变更"（K13）。
- **"旧版本不覆盖"的官方原话**：IPFS Docs "Immutability"：修改内容时 "Node B is not being edited, updated, or otherwise changed. Instead, we are creating a new DAG"；"Nothing is overwritten. The original CID … will always refer to a webpage with the headers hello and world. What we're doing is constructing a new DAG"（K14）。
- **规范层没有"版本历史"专用规范条文**：IPLD 规范集提供块/CID/编解码器/选择器/ADL 原语，未见名为"versioning/append-only log"的规范；版本链是**数据模型层以上由应用自行约定的结构**，官方以教程/概念文档示例（K12、K13、K14），工程上以 ipfs-log/OrbitDB 的 append-only log 实现（K22、K21）——这本身是"规范先例"，但不是"版本化规范"。
- **与 git 同构**：IPLD Primer 目标陈述："it should be possible to produce a new system 'like git' (in that it's content-addressed, decentralized, and excellent) in one order of magnitude less time"（K29）；IPFS Merkle DAG 文档："Source control systems like git and others use them [Merkle DAGs] to efficiently store the repository history"（K12）。

### Q3 内容寻址对"防篡改"的保证：CID=内容哈希（multihash），与 B4 一轮的哈希链/梅克尔树的关系（RFC 6962 对照）

- **CID 的防篡改语义**：IPLD 概念文档 "Content Addressability"："refer to content by a trustless identifier… provides a secure way to verify the content"（K11）；multihash 规范："non-cryptographic hash functions are not suitable for content addressing systems"（K7）——即寻址哈希必须是密码学哈希。
- **机制**：块级防篡改 = 拿到 CID 后重算哈希比对即可验证（不信任提供者）；结构级防篡改 = 父块 CID 覆盖其所有子块 CID（自验证，IPFS 文档："Merkle DAGs are self-verified structures. The CID of a node is univocally linked to the contents of its payload and those of all its descendants"）（K12）。
- **与 RFC 6962 的关系**：同族不同用途。RFC 6962（CT 1.0，2013）："The append-only property of each log is technically achieved using Merkle Trees, which can be used to show that any particular version of the log is a superset of any particular previous version. Likewise, Merkle Trees avoid the need to blindly trust logs…"（K17）。对照：6962 面向"第三方日志服务器必须证明没篡改"的公开审计场景，需要签名树头（STH）+ 一致性证明/包含证明；IPLD 面向"任何人可无信任取用内容"的场景，靠块级哈希即可自验证，不需要签名与证明树——CT 的 Merkle 树是"日志整体不可变+可证明"，IPLD 的 Merkle DAG 是"每个块不可变+可验证"。CT 的 append-only（新版本是旧版本的超集）正是 B4 一轮"单调事实层"的密码学实例；IPLD 的"旧块仍在、新 DAG 另起"是同一单调性的块级实现（K17、K14）。RFC 9162（CT 2.0，2021）延续同一 Merkle 树设计并给出签名/证明细节（K18）。
- **CT 学术出处**：Laurie（Google），"Public, verifiable, append-only logs"，ACM Queue 12(8)，2014（K19）；Merkle-CRDTs 论文（arXiv 2004.00107，2020）把同一思路带到 CRDT："Merkle-DAGs can act as logical clocks"（K20）。

### Q4 IPFS/IPLD 生态里"个人笔记/知识图谱"存储先例（如 OrbitDB、IPLD 知识图谱项目），工程成熟度

- **OrbitDB**（维护中，npm @orbitdb/core，MIT）："serverless, distributed, peer-to-peer database"，基于 Merkle-CRDT；events 类型是 "an immutable (append-only) log with traversable history"；底层 OpLog 是 "an immutable, cryptographically verifiable, operation-based CRDT"（K21）。Go 实现由 Berty 维护。成熟度：有活跃文档/API/测试/benchmark，属 IPFS 生态里最成熟的"日志型数据库"先例之一。
- **ipfs-log**（OrbitDB 底层，独立仓库）："An append-only log on IPFS… Every entry in the log is saved in IPFS and each points to a hash of previous entry(ies) forming a graph. Logs can be forked and joined back together."（K22）——直接证明"内容寻址版本链"在工程上已实现并复用。
- **Ceramic**（3Box Labs，维护中）："decentralized data network… event streaming protocol"，用事件流承载可变状态（K23）——属 IPLD 生态流式状态先例（注：其锚定/身份体系超出本分支范围）。
- **知识图谱先例（均为原型级）**：官方 IPFS Camp 2019 非会议（unconf）记录 "Knowledge Graphs and Underscore Protocol"：与会者包括 _Prtcl(uprtcl)、Anytype、WorldBrain、hyperknowledge、Interplanetary mind map 等项目；结论是"defining a data model is the hardest and more critical element to resolve"，并列出需求（可追溯性/因果/合并历史等）（K24）。uprtcl/js-uprtcl（_Prtcl 协议，IPLD 知识图谱）自述 "Unfortunately this project only reached the stage of prototype… had to move on"——已停（K25）。Interplanetary Mind Map（2018）："It extends IPLD… two different mind maps pointing to the same concept should converge if put together"——原型（K26）。Welding（sanctuarycomputer）："decentralized knowledge graph protocol"，EVM NFT + IPFS 存内容，版本/修订在 roadmap 未实现（K27）。
- **工程成熟度结论**：日志/数据库层（OrbitDB/ipfs-log）成熟可用；"个人笔记/知识图谱"应用层项目几乎全部停在原型或已终止，没有生产级"个人笔记知识图谱 on IPLD"成熟先例（该结论为对上述原文的归纳，标 B/C 边界：先例状态为 A 级原文，成熟度判定为归纳，标 C 倾向）。

### Q5 对"锚点逐字 grep -F + 人审"工作流：IPLD 载体的可读层（dag-json 文本可读？CID 不可读？）与迁移成本

- **dag-json 文本可读**：DAG-JSON 规范："Most simple JSON objects are valid DAG-JSON. The primary differences are: Bytes and Links are supported with special use of single-key ('/') map; … Maps are sorted by key."；序列化规则（"Codec implementors MUST… Sort object keys… Strip whitespace"）保证同数据同哈希（K10）。Kubo CLI 的 `ipfs dag get` 默认输出 codec 即 dag-json（"Format that the object will be encoded as. Default: dag-json."）（K28）。即：**载体层是规范化的 JSON 文本，人可读**；但注意排序/去空白等 canonical 规则意味着"展示文本"与"哈希原文"是同一规范形式（对逐字 grep 是好事，只要落盘就是规范形式）。
- **CID 本身不可读**：CID 字符串是 base32（CIDv1 默认）/base58（CIDv0）的不透明文本；现行 CID 规范明确人读形式仅作为工具展示指导："This is design guidance for tools that present a human-readable CID inspector… It is not a wire format: nothing produces or parses it"（K5）；IPFS 官方亦直言 "CIDs can be difficult to deal with and hard to remember"（K14）。所以"锚点"若以 CID 形式出现，人审只能看到不透明字符串；若锚点以 dag-json 中的字符串字段出现（如把锚点原文作为 string kind 存进块），则可读且可 grep -F——前提是该字段是普通 string 而非 Link（K3、K10）。
- **迁移成本**：无现成先例（未核到 markdown/JSONL → IPLD dag-json 的官方或社区迁移指南）；IPLD 官方 GTD 文档建议"尽量用既有 codec、Data Model 优先、新 codec 是最后手段"（K31），说明迁移成本主要在学习曲线与工具链（kubo/helia + IPLD 库），而非格式本身；522 节点/几十次更新/年的个人规模是否值得引入完整 IPFS/IPLD 栈，无先例可依（推断，标 C）。

## 2 关键发现（K 编号条目）

- **K1｜IPLD Specs README：一组规范、块层/编解码器/数据模型分层**（等级 A——原文到手）
  - URL：https://raw.githubusercontent.com/ipld/specs/master/README.md（已迁移声明指向 ipld/ipld 与 ipld.io）｜标题：IPLD Specifications｜机构：Protocol Labs / IPLD 项目｜日期：仓库 master（迁移声明为现行）
  - 摘录："IPLD is not a single specification, it is a set of specifications."、"The block layer encompasses all content addressed block formats and specifies how blocks are addressed, how they self-describe their codec…"、"DAG-CBOR and DAG-JSON are native IPLD codecs that currently enable the most complete form of the Data Model."
- **K2｜IPLD Data Model 规范（data-model.md）**（等级 A）
  - URL：https://raw.githubusercontent.com/ipld/specs/master/data-model-layer/data-model.md｜标题：Specification: IPLD Data Model｜机构：IPLD 项目｜日期：仓库 master
  - 摘录：Data Model 含 Null/Boolean/Integer/Float/String/Bytes/List/Map/Link kinds；"Link is a scalar kind -- however, when 'loaded', may become another kind"；建议避免 Float。
- **K3｜IPLD Data Model Kinds（ipld.io 现行）**（等级 A）
  - URL：https://ipld.io/docs/data-model/kinds/｜标题：IPLD ♦ Data Model Kinds｜机构：IPLD｜日期：访问 2026-08-12
  - 摘录："A link represents a piece of information which points to more data in another IPLD block."、"Links are concretely implemented as CIDs."
- **K4｜IPLD CID 规范（Descriptive - Final）**（等级 A）
  - URL：https://raw.githubusercontent.com/ipld/specs/master/block-layer/CID.md｜标题：Specification: CIDs｜机构：IPLD 项目｜日期：仓库 master
  - 摘录："A CID is a hash-based content identifier. Includes the codec and multihash."；CIDv1 结构 `<mbase><version><mcodec><mhash>`；"Old v0 CIDs are strictly sha2-256 multihashes encoded in base58"。
- **K5｜CID 规范现行维护版（specs.ipfs.tech，permanent）**（等级 A）
  - URL：https://specs.ipfs.tech/cid/｜标题：CID (Content IDentifier)｜机构：IPFS 标准（IPFS Foundation / Interplanetary Shipyard 编辑）｜日期：页面标注 26 June 2026
  - 摘录："A CID is a self-describing content-addressed identifier. It uses cryptographic hashes for content addressing…"、"Concretely, it's a typed content address: a tuple of (content-type, content-address)."；Human-Readable Form 节："This is design guidance for tools that present a human-readable CID inspector… It is not a wire format: nothing produces or parses it"。
- **K6｜multiformats/cid README（历史版）**（等级 A）
  - URL：https://raw.githubusercontent.com/multiformats/cid/master/README.md｜标题：CID (Content IDentifier) Specification｜机构：Protocol Labs / multiformats｜日期：仓库 master（README 首行声明 "This repository is outdated and kept for historical reference"）
  - 摘录：CIDv1 二进制公式 `<cidv1> ::= <multicodec-cidv1><multicodec-content-type><multihash-content-address>`；"CIDs are a well established standard."
- **K7｜multihash 规范**（等级 A）
  - URL：https://raw.githubusercontent.com/multiformats/multihash/master/README.md｜标题：multihash｜机构：Protocol Labs / multiformats｜日期：仓库 master（© 2016 声明）
  - 摘录：格式 `<varint hash function code><varint digest size in bytes><hash function output>`；"Multihash is intended for 'well-established cryptographic hash functions' as non-cryptographic hash functions are not suitable for content addressing systems."
- **K8｜multibase 规范**（等级 A）
  - URL：https://raw.githubusercontent.com/multiformats/multibase/master/README.md｜标题：multibase｜机构：Protocol Labs / multiformats｜日期：仓库 master
  - 摘录："Multibase is a protocol for disambiguating the 'base encoding' used to express binary data in text formats (e.g., base32, base36, base64, base58, etc.) from the expression alone."
- **K9｜DAG-CBOR 规范（ipld.io）**（等级 A）
  - URL：https://ipld.io/specs/codecs/dag-cbor/spec/｜标题：IPLD ♦ DAG-CBOR Specification（Status: Descriptive - Draft）｜机构：IPLD｜日期：访问 2026-08-12
  - 摘录："Tag 42 interpreted as CIDs, no other tags are supported. Maps must only be keyed by strings."；"DAG-CBOR requires that there exist a single, canonical way of encoding any given set of data"；map keys 按字节序排序。
- **K10｜DAG-JSON 规范**（等级 A）
  - URL：https://raw.githubusercontent.com/ipld/specs/master/block-layer/codecs/dag-json.md｜标题：Specification: DAG-JSON（Descriptive - Final）｜机构：IPLD｜日期：仓库 master
  - 摘录："Most simple JSON objects are valid DAG-JSON."；Links 用 `{"/": String /* Base58 encoded CIDv0 or Multibase Base32 encoded CIDv1 */}`；"Codec implementors MUST… Sort object keys by their (UTF-8) encoded representation… Strip whitespace… ensure that two codecs producing the same data end up with matching block hashes."
- **K11｜Content Addressability 概念**（等级 A）
  - URL：https://raw.githubusercontent.com/ipld/specs/master/concepts/content-addressability.md｜标题：Concept: Content Addressability｜机构：IPLD｜日期：仓库 master
  - 摘录："'Content addressability' refers to the ability to refer to content by a trustless identifier… allows complete decentralization… and provides a secure way to verify the content."
- **K12｜IPFS Docs: Merkle DAGs——不可变、链表示例、自验证**（等级 A）
  - URL：https://docs.ipfs.tech/concepts/merkle-dag/｜标题：Merkle Directed Acyclic Graphs (DAG)｜机构：IPFS 文档｜日期：页面 Published Fri, 07 Aug 2026
  - 摘录："Merkle DAG nodes are immutable. Any change in a node would alter its identifier and thus affect all the ascendants in the DAG, essentially creating a different DAG."；链表示例 "A=Hash(B)→B=Hash(C)→C=Hash(∅)"；"Merkle DAGs are self-verified structures. The CID of a node is univocally linked to the contents of its payload and those of all its descendants."
- **K13｜IPLD Benefits of Content Addressing——用 DAG 记录版本**（等级 A）
  - URL：https://ipld.io/docs/motivation/benefits-of-content-addressing/｜标题：IPLD ♦ Benefits of Content Addressing｜机构：IPLD｜日期：访问 2026-08-12
  - 摘录："Since data is addressed by its content, it is also immutable by default… if you'd like to keep track of changes, you can build a DAG that links to earlier versions of a piece of data."
- **K14｜IPFS Docs: Immutability——"Nothing is overwritten"**（等级 A）
  - URL：https://docs.ipfs.tech/concepts/immutability/｜标题：Immutability｜机构：IPFS 文档｜日期：访问 2026-08-12
  - 摘录："Node B is not being edited, updated, or otherwise changed. Instead, we are creating a new DAG…"；"Nothing is overwritten. The original CID … will always refer to a webpage with the headers hello and world."；"CIDs can be difficult to deal with and hard to remember."
- **K15｜IPFS Docs: Content addressing（CIDs）**（等级 A）
  - URL：https://docs.ipfs.tech/concepts/content-addressing/｜标题：Content Identifiers (CIDs)｜机构：IPFS 文档｜日期：访问 2026-08-12
  - 摘录："Any difference in the content will produce a different CID. The same content added to two different IPFS nodes using the same settings will produce the same CID."
- **K16｜Benet, IPFS 论文（学术）**（等级 A——摘要原文到手）
  - URL：https://arxiv.org/abs/1407.3561｜标题：IPFS - Content Addressed, Versioned, P2P File System｜机构：arXiv / Juan Benet｜日期：2014-07-14
  - 摘录："IPFS provides a high throughput content-addressed block storage model, with content-addressed hyper links. This forms a generalized Merkle DAG, a data structure upon which one can build versioned file systems, blockchains, and even a Permanent Web."
- **K17｜RFC 6962——append-only 由 Merkle 树达成**（等级 A——全文到手）
  - URL：https://www.rfc-editor.org/rfc/rfc6962.txt｜标题：RFC 6962 Certificate Transparency｜机构：IETF（Laurie, Langley, Kasper）｜日期：2013 年 6 月（Experimental）
  - 摘录："The append-only property of each log is technically achieved using Merkle Trees, which can be used to show that any particular version of the log is a superset of any particular previous version. Likewise, Merkle Trees avoid the need to blindly trust logs…"
- **K18｜RFC 9162——CT 2.0 延续**（等级 A——全文到手）
  - URL：https://www.rfc-editor.org/rfc/rfc9162.txt｜标题：RFC 9162 Certificate Transparency Version 2.0｜机构：IETF（Laurie, Kasper 等）｜日期：2021 年 12 月（Proposed Standard）
  - 摘录：目录结构含 "Cryptographic Components / Merkle Trees / Merkle Inclusion Proofs / Merkle Consistency Proofs / Signed Tree Head (STH)"——设计延续 6962。
- **K19｜Laurie, Certificate Transparency（ACM Queue，学术）**（等级 A）
  - URL：https://queue.acm.org/detail.cfm?id=2668154｜标题：Certificate Transparency（副题 Public, verifiable, append-only logs）｜机构：ACM Queue 12(8)，Ben Laurie（Google）｜日期：2014-09-08
  - 摘录：以 DigiNotar 事件为动机，论证"公开可验证的 append-only 日志"；"More than 94 percent of CAs (by volume of certificates issued) have agreed to include SCTs in their EV certificates."
- **K20｜Merkle-CRDTs 论文（学术）**（等级 A——摘要原文到手）
  - URL：https://arxiv.org/abs/2004.00107｜标题：Merkle-CRDTs｜机构：arXiv（Sanjuan, Ponce, Pini, Ceresa）｜日期：2020-04-27
  - 摘录："We study Merkle-DAGs as a transport and persistence layer for Conflict-Free Replicated Data Types (CRDTs)… We show how Merkle-DAGs can act as logical clocks… to take advantage of the security and de-duplication properties of content-addressing."
- **K21｜OrbitDB README——Merkle-CRDT 数据库、append-only events**（等级 A）
  - URL：https://raw.githubusercontent.com/orbitdb/orbitdb/main/README.md｜标题：OrbitDB｜机构：OrbitDB（Protocol Labs 赞助）｜日期：main 分支（访问 2026-08-12）
  - 摘录："OrbitDB is a serverless, distributed, peer-to-peer database. OrbitDB uses IPFS as its data storage…"；events 类型："an immutable (append-only) log with traversable history"；"All databases are implemented on top of OrbitDB's OpLog, an immutable, cryptographically verifiable, operation-based conflict-free replicated data structure (CRDT)"。
- **K22｜ipfs-log README——内容寻址版本链的工程原型**（等级 A）
  - URL：https://raw.githubusercontent.com/orbitdb/ipfs-log/main/README.md｜标题：ipfs-log（An append-only log on IPFS）｜机构：OrbitDB / Protocol Labs｜日期：main 分支（© 2016-2019 声明）
  - 摘录："Every entry in the log is saved in IPFS and each points to a hash of previous entry(ies) forming a graph. Logs can be forked and joined back together."；用途列表含 "Track a version of a file"。
- **K23｜Ceramic 文档——事件流协议**（等级 A）
  - URL：https://developers.ceramic.network/docs/introduction/intro｜标题：The Composable Data Network｜机构：Ceramic（3Box Labs）｜日期：访问 2026-08-12
  - 摘录："Ceramic is a decentralized data network… Ceramic's event streaming protocol is a highly-scalable decentralized data infrastructure…"
- **K24｜IPFS Camp 2019 非会议记录：知识图谱与 _Prtcl**（等级 A）
  - URL：https://raw.githubusercontent.com/ipfs/camp/master/UNCONF/ipfscamp2019-unconf-knowledge-graphs_and_uprtcl.md｜标题：Knowledge Graphs and Underscore Protocol｜机构：ipfs/camp（官方）｜日期：2019（仓库 master）
  - 摘录："We agreed that defining a data model is the hardest and more critical element to resolve"；需求清单含 "Traceability > causality > sequence of actions (e.g. merge history)"、去重/本地合并/分叉等。
- **K25｜uprtcl/js-uprtcl README——原型已停**（等级 A）
  - URL：https://raw.githubusercontent.com/uprtcl/js-uprtcl/master/README.md｜标题：_Prtcl｜机构：uprtcl（Guillem Córdoba 等）｜日期：master 分支（访问 2026-08-12）
  - 摘录："Unfortunately this project only reached the stage of prototype. We faced technical issues that were out of our reach and had to move on."
- **K26｜Interplanetary Mind Map README——个人知识/思维导图 on IPLD**（等级 A）
  - URL：https://raw.githubusercontent.com/interplanetarymindmap/mind-map/master/README.md｜标题：Mind Map｜机构：interplanetarymindmap｜日期：仓库日志至 2018-11-15
  - 摘录："It extends IPLD."、"It needs to work on a global domain. This means that two different mind maps pointing to the same concept should converge if put together."
- **K27｜Welding README——去中心知识图谱（EVM+IPFS），修订未实现**（等级 A）
  - URL：https://raw.githubusercontent.com/sanctuarycomputer/welding/main/README.md｜标题：welding.app • knowledge is valuable｜机构：sanctuarycomputer｜日期：main 分支（访问 2026-08-12）
  - 摘录："Welding is a decentralized knowledge graph protocol for building and managing networks of research and documentation… built on the Ethereum Virtual Machine (and deployed to Polygon)… ensuring all content is free and public forever (via IPFS)."；Roadmap 首项 "Revision | RevisionFragment"（未完成）。
- **K28｜Kubo CLI：ipfs dag get 默认输出 dag-json**（等级 A）
  - URL：https://docs.ipfs.tech/reference/kubo/cli/#ipfs-dag-get｜标题：ipfs dag get｜机构：Kubo/IPFS 文档｜日期：访问 2026-08-12
  - 摘录："ipfs dag get <ref> - Get a DAG node from IPFS."；"--output-codec string - Format that the object will be encoded as. Default: dag-json."
- **K29｜IPLD Primer——"like git" 命题**（等级 A）
  - URL：https://ipld.io/docs/intro/primer/｜标题：IPLD ♦ The Brief Primer｜机构：IPLD｜日期：访问 2026-08-12
  - 摘录："Given the IPLD libraries and specs, it should be possible to produce a new system 'like git'… in one order of magnitude less time than it would otherwise take."
- **K30｜IPLD From Data to Data Structures——CID 是 multihash 的扩展**（等级 A）
  - URL：https://ipld.io/docs/motivation/data-to-data-structures/｜标题：IPLD ♦ From Data to Data Structures｜机构：IPLD｜日期：访问 2026-08-12
  - 摘录："A CID is an extension of multihash, in fact a multihash is part of a CID. We simply add a codec to a multihash…"
- **K31｜IPLD Getting Things Done——用既有 codec，新 codec 是最后手段**（等级 A）
  - URL：https://ipld.io/docs/synthesis/gtd/｜标题：IPLD ♦ Getting Things Done with IPLD｜机构：IPLD｜日期：访问 2026-08-12
  - 摘录："Writing a new Codec poses future portability questions… it's best to stick to one of the already widely supported codecs."
- **K32｜ProtoSchool: Anatomy of a CID——官方教程先例**（等级 A）
  - URL：https://proto.school/anatomy-of-a-cid｜标题：Multiformats Tutorial | Anatomy of a CID｜机构：ProtoSchool（Protocol Labs 生态）｜日期：访问 2026-08-12
  - 摘录："Explore the ins and outs of CIDs (Content Identifiers), the unique labels used to point to data stored on distributed information systems including IPFS, IPLD, libp2p, and Filecoin."

## 3 冲突与张力

1. **"不可变块层 vs 可变视图层"**：IPFS 官方文档明确旧块永不被覆盖、只有"指针/命名"层（IPNS/应用指针）可变（K14）。这与 B4 一轮"单调事实层 + 非单调当前视图"的结论一致；IPLD 本身不提供可变视图，需要应用自建"最新版本指针"。
2. **CID 定义的多版本文本并存**：multiformats/cid 仓库自声明 outdated（K6），现行维护版在 specs.ipfs.tech（K5），ipld/specs 与 ipld.io 又各有版本（K4、K9、K10）；引用 CID 定义时必须注明版本来源，否则同一论断可能对到不同文本。
3. **"载体可读、CID 不可读"**：dag-json 是规范化 JSON（人可读、可 grep -F），但其中的 Link 是 base32/base58 不透明 CID（K5、K10）；"锚点逐字 grep"若锚点是普通字符串字段则直接可行，若锚点落在 CID 里则人审退化为比对不透明串（推断 C，机制依据 A）。
4. **canonical 编码的双刃剑**：dag-json/dag-cbor 要求 key 排序、去空白等确定性规则以保证同数据同哈希（K9、K10）——对"人审文本 vs 规范形式"的差异（如 JSON 转义、键序）敏感，逐字判等须以规范序列化后的落盘文本为准（推断 C）。
5. **工程成熟度错配**：日志/数据库基础设施（OrbitDB/ipfs-log/Ceramic）成熟，但个人笔记/知识图谱应用层（uprtcl、interplanetary mind map、Welding）全是原型或已终止（K25、K26、K27）；"522 节点个人笔记上 IPLD 全栈"无成熟先例（推断 C）。
6. **CT 对照的语义边界**：RFC 6962 的"防篡改"依赖第三方日志 + 签名树头 + 证明（审计式），IPLD 的"防篡改"是逐块哈希自验证（无签名、无证明）；两者都保证"内容不可变"，但 CT 额外提供"日志没删改旧条目"的公开证明，IPLD 依赖数据提供方本身诚实提供块（拿到错误块即可验出）。不能把 6962 的审计保证直接套到裸 IPLD 上（A 级机制 + C 级边界判断）。

## 4 未决

- U1：IPLD 官方是否发布过"版本历史/append-only log"专用规范条文——未核到；现有证据均为概念文档/教程（K12-K14）与工程实现（K21、K22），官方 specs 索引页正文经 r.jina.ai 只取回导航（原始抓取 1830 字节），未逐页穷举 specs 树。
- U2："个人笔记 markdown+JSONL → IPLD dag-json"迁移指南/先例——未核到（搜索引擎多被挡，Bing 结果被 SEO 污染；仅 Brave 一次有效命中官方 camp 记录）。
- U3：IPLD 官方文档的"日期/版本"——ipld.io 页面多为动态生成、无显式修订日期；specs.ipfs.tech/cid 标注 2026-06-26 可采信，其余以"访问 2026-08-12"计，未用 web.archive 复核快照。
- U4：Ceramic 的锚定/身份机制（DID、EVM 锚定）是否仍属"IPLD 生态"纯范畴——为避免越界未深挖，其与纯 IPLD 的耦合度未核。
- U5：RFC 9162 与 RFC 6962 的具体哈希函数差异（SHA-256 vs SHA-256/树哈希细节）——本分支只需"同族延续"结论，未逐条比对（全文已在手，留作后续）。

## 5 来源清单

| # | 来源 | 类型 | 原文到手 |
|---|---|---|---|
| 1 | IPLD Specs README（ipld/specs） | 规范 | A |
| 2 | IPLD Data Model 规范（data-model.md） | 规范 | A |
| 3 | IPLD Data Model Kinds（ipld.io） | 规范/文档 | A |
| 4 | IPLD CID 规范（ipld/specs, Descriptive-Final） | 规范 | A |
| 5 | CID 规范维护版（specs.ipfs.tech, permanent, 2026-06-26） | 标准 | A |
| 6 | multiformats/cid README（历史版） | 规范 | A |
| 7 | multiformats/multihash README | 规范 | A |
| 8 | multiformats/multibase README | 规范 | A |
| 9 | DAG-CBOR 规范（ipld.io） | 规范 | A |
| 10 | DAG-JSON 规范（ipld/specs） | 规范 | A |
| 11 | IPLD Content Addressability 概念 | 规范/文档 | A |
| 12 | RFC 6962（CT 1.0, 2013-06） | 标准 | A（全文） |
| 13 | RFC 9162（CT 2.0, 2021-12） | 标准 | A（全文） |
| 14 | Benet, IPFS 论文（arXiv 1407.3561, 2014-07-14） | 学术 | A（摘要） |
| 15 | Sanjuan et al., Merkle-CRDTs（arXiv 2004.00107, 2020-04-27） | 学术 | A（摘要） |
| 16 | Laurie, Certificate Transparency（ACM Queue 12(8), 2014-09-08） | 学术 | A |
| 17 | IPFS Docs: Merkle DAGs（2026-08-07） | 工程文档 | A |
| 18 | IPFS Docs: Content addressing（CIDs） | 工程文档 | A |
| 19 | IPFS Docs: Immutability | 工程文档 | A |
| 20 | IPLD Primer（ipld.io） | 工程文档 | A |
| 21 | IPLD Benefits of Content Addressing（ipld.io） | 工程文档 | A |
| 22 | IPLD From Data to Data Structures（ipld.io） | 工程文档 | A |
| 23 | IPLD Hello, World（ipld.io） | 工程文档 | A |
| 24 | IPLD Getting Things Done（ipld.io） | 工程文档 | A |
| 25 | Kubo CLI: ipfs dag get（docs.ipfs.tech） | 工程文档 | A |
| 26 | ProtoSchool: Anatomy of a CID | 教程 | A |
| 27 | OrbitDB README（GitHub） | 工程先例 | A |
| 28 | ipfs-log README（GitHub） | 工程先例 | A |
| 29 | Ceramic 文档 Intro（developers.ceramic.network） | 工程先例 | A |
| 30 | IPFS Camp 2019 unconf: Knowledge Graphs and _Prtcl（ipfs/camp） | 先例（官方记录） | A |
| 31 | uprtcl/js-uprtcl README | 工程先例 | A |
| 32 | Interplanetary Mind Map README | 工程先例 | A |
| 33 | Welding README（sanctuarycomputer） | 工程先例 | A |

统计：可核来源（A+B）=33（红线≥15）；原文到手（A）=33（红线≥10，其中规范/标准 11、工程文档 10、学术 3、先例 6、教程 1、官方记录 1 等）。来源类型≥3（标准/RFC、学术论文、工程文档与工程先例）达标。候选逐一查证：①CID 官方定义三处一致 ②链表/DAG 版本链规范与教程先例 ③multihash+CT 防篡改对照 ④OrbitDB/知识图谱先例 ⑤dag-json 可读性与 CID 不可读性——5/5 达标。关键词组≥6（4 组英文：IPLD data model CID content addressing specification / content addressed immutable version chain / OrbitDB IPLD database versioning / multiformats multihash CID；2 组中文：IPLD 内容寻址 CID 版本 / IPFS 知识图谱 个人笔记；另 arXiv API "content addressing"+"version"）。

## 6 判死自查

- 无来源论断？否——每条关键发现含 URL+标题+机构+日期+摘录+等级；Q&A 中的机制论断均挂 K 条目。
- 二手当原文？否——33 条全部 A 级原文到手；B/C 只在"工程成熟度归纳""迁移成本"处出现并显式标注。
- 越界漏答？否——nanopub/trusty URI 只字未动（归 B4a），RDF 语法未涉（归 B1）；OrbitDB/Ceramic 仅作 IPFS-IPLD 生态先例引用，未做产品对比评测。
- 推断当结论？否——"个人规模迁移成本""成熟度错配""canonical 编码对 grep 的影响"均标 C；U1-U5 未决未冒充结论。
- 红线核对：可核来源 33≥15、原文到手 33≥10、来源类型≥3、候选 5/5、关键词组≥6——全部达标。
- 本项目红线：不物理删除（IPLD 语义即"旧块不覆盖、另建新 DAG"，与红线一致，K14 原文背书）；锚点判等（dag-json 规范形式落盘后可逐字 grep -F，前提是锚点存为 string kind；CID 形式不可人读，冲突 3/4 已登记）；候选池/审计/四图不合并/M09 锚定 M08 等未受本分支任何论断动摇。
