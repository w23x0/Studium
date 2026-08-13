# B6e 分支调研发现：审计日志（append-only 哈希链）工程实现先例

| 字段 | 值 |
| --- | --- |
| 分支 | B6e（B6 先例系 R3 子任务：append-only 审计日志工程实现模式） |
| 调研日期 | 2026-08-12 |
| 工作区 | C:\Users\Wang\Desktop\Studium |
| 原始证据 | research_tree\tmp\b6e\（25+ 份原始文档，PDF/TXT/HTML/MD/RST） |
| 红线自评 | 可核来源 22 ≥ 15；原文到手 20 ≥ 10；来源类型 6 类 ≥ 3；候选查证 5/5；关键词 6 组 ≥ 4（详见第 6 节） |

---

## 0 一句话结论

逐行哈希链与 Merkle/透明日志两类 append-only 防篡改日志均有成熟权威先例（Crosby & Wallach USENIX'09、Schneier & Kelsey、RFC 6962/9162、QED/BBVA、Trillian、secure-log、Hypercore、OpenTimestamps 等），但 CT/透明日志的"不受信日志 + 多方审计 + gossip"模型对 522 单机个人图谱属过度设计（推断 C）；个人最小可行方案应为"本地哈希链/内容寻址 + 周期签名 checkpoint + 可选外部时间戳锚定"（推断 C）；syslog-ng/rsyslog 官方文档中未查到原生哈希链实现（未核，不臆断其存在）。

---

## 1 逐条回答

### 1.1 问题 1：防篡改审计日志的工程先例（syslog-ng/rsyslog 哈希链、Crosby & Wallach 后续工程实现）官方文档原文

- **syslog-ng / rsyslog 原生哈希链：未核。** 抓取 syslog-ng 3.37 官方 Admin Guide（Wayback 存档，© 2024 One Identity）与 rsyslog.conf(5) man page 全文检索，"hash / logstore / integrity / crypto / tamper / append-only" 等关键词仅命中 TLS 加密、CA 哈希命名等无关内容，未发现任何"哈希链 / logstore 完整性"原生功能描述（详见 KF-20、KF-21）。不排除其商业版（Premium Edition / Store Box）存在类似功能，但官方文档原文未到手，按红线标"未核"。
- **Crosby & Wallach（USENIX Security 2009）的后续工程实现：有。** 论文定义经典哈希链 `Ci = H(Ci−1 ∥ Xi), C−1 = □`，并给出历史树（history tree）的构造（KF-01/02/03）。其工程化后续包括：
  - **BBVA/QED**（Go，开源）：自称 scalable / auditable / high-performance tamper-evident log，实现"forward-secure append-only persistent authenticated data structure"，每次 append 产出签名快照（KF-09）。
  - **Google Trillian**：CT 的泛化实现，"An append-only Log mode, analogous to the original Certificate Transparency logs"（KF-08）。
  - **tegmentum/secure-log**（Rust，开源）："Hash-chained entries, Merkle-sealed segments, externally-signed checkpoints, witness anti-equivocation"（KF-10）。
  - **sigstore Rekor**：签名透明日志，v2 明确采用 tile-based log / Trillian-Tessera（KF-22）。

### 1.2 问题 2：逐行哈希链的具体实现要素（行结构、种子、验证算法）与开源实现

- **行结构（论文原文，A）：** `Ci = H(Ci−1 ∥ Xi), C−1 = □`（Crosby & Wallach 论文第 5.1 节，KF-01）。即每行 = 前一行哈希（prev hash）拼接本行数据后取哈希；`C−1`（种子/初始锚点）为空串或约定值。Schneier & Kelsey 1999 年论文《Secure Audit Logs to Support Computer Forensics》给出更早的"在不受信机器上保证日志不可被秘密篡改"的构造（KF-05 补充，OCR 原文较乱，仅作旁证）。
- **种子：** 哈希链的起点锚点（`C−1`）；实际系统通常以"首次写入时的随机种子/初始 hash + 后续周期签名 checkpoint"作锚点（secure-log 的 CheckpointSigner、QED 的 signed snapshot）。
- **验证算法：** 从锚点开始顺序重算每行哈希，比对最新行哈希/签名 checkpoint；若任一行被改，其后所有行哈希失配（链式传播）。Crosby & Wallach 明确指出哈希链"do not permit events to be skipped"，证明某事件在链中需线性扫描中间事件（KF-02）。
- **开源实现仓库：** tegmentum/secure-log（Rust，哈希链+分段 Merkle+签名 checkpoint，KF-10）、RomaLytar/yammi-audit-log（PHP/Laravel 审计日志哈希链，KF-11，B 级）、BBVA/QED（Go，Merkle 历史树而非逐行链，KF-09）、holepunchto/hypercore（JS，签名 Merkle 树分布式日志，KF-12）。
- **注意：不存在"统一的逐行哈希链行格式标准"**（如 prev hash + data + hash 的权威字段定义），只有论文公式与各家实现（见第 4 节未决）。

### 1.3 问题 3：透明日志（RFC 6962 CT）作为"外部可验证 append-only"的规范原文与个人场景适配性

- **规范原文（A）：** RFC 6962 摘要定义 CT 为 "publicly auditable, append-only, untrusted logs of all issued certificates"；§1 指出 "The append-only property of each log is technically achieved using Merkle Trees"；§3.5 定义 Signed Tree Head（`version / timestamp / tree_size / sha256_root_hash / TreeHeadSignature`）；追加性违约靠 "global gossiping, i.e., everyone auditing logs comparing their versions of the latest Signed Tree Heads" 检测（KF-04/05/06）。RFC 9162（2021-12）为 CT v2，Obsoletes 6962（KF-07）。
- **适配性结论（推断 C）：** CT 是"外部可验证"设计的代表，但其安全模型假设**不受信日志服务器 + 大量独立审计者 + 全网 gossip + 多日志间交叉比对**。对 522 单机个人图谱：写入者即所有者（单一受信主体），无需防"日志服务器撒谎"的多方博弈；CT 的 SCT/STH/Merkle 一致性证明/gossip 生态属于过度设计。可保留的最小收益仅是"第三方可验证某条记录在某时刻确实在链上"，该收益用本地哈希链 + 周期签名 checkpoint + 可选 OpenTimestamps/RFC3161 时间戳锚定即可近似获得（见 1.5）。权威来源未给出针对单机个人场景的定量适配成本，故整条为 C 级推断。

### 1.4 问题 4：日志轮转/压缩与"不物理删除"的冲突：常见保留策略

- **常见做法（A）：** NIST SP 800-92（2006-09）明确定义 **Log archival**（长期保留）、区分 **retention**（常规归档）与 **preservation**（证据性保存），并定义 **Log compression**："storing a log file in a way that reduces the amount of storage space needed for the file without altering the meaning of its contents. Log compression is often performed when logs are rotated or archived"；同时指出 "Ensuring that the original logs are not altered supports their use for evidentiary purposes"（KF-15）。
- **Linux 侧（A）：** auditd.conf(5) 的 `max_log_file_action` 支持 `ignore / syslog / rotate / keep_logs / remove`（KF-16）；logrotate(8) 是标准轮转工具；chattr(1) 的 `+a`（append-only）属性限制文件"只能以追加模式打开写入"，是内核层面的"不物理删除"辅助手段；auditctl(8) `-e 2` 锁定配置"can only be changed by rebooting the machine"。
- **云对象存储（A）：** AWS S3 Object Lock Compliance 模式下对象 "can't be overwritten or deleted by any user, including the root user in your AWS account"，保留期不可缩短（KF-19）——这是"不物理删除"的托管实现。
- **冲突点：** 标准运维默认在保留期结束后**删除**旧日志以控成本，与红线"不物理删除"直接冲突；折衷路线是"轮转 → 压缩 → 归档到不可变存储（S3 Object Lock / WORM / 只读介质）→ 按保留策略到期处置"，把"删不删"从运维默认行为变成显式策略决策。

### 1.5 问题 5：522 节点级个人图谱的最小签名锚点方案（推断 C）

无服务器个人场景（单机/单写入者）最小可行方案（**全部为 C 级推断，组件引用现有签名方案文档**）：

1. **本地哈希链/内容寻址存储**：每行 `prev_hash + data + hash`（或直接复用 Git 内容寻址对象图，KF-17），保证链内篡改可检测。
2. **周期签名 checkpoint**：每隔 N 条（或每次会话结束）对最新链头哈希做签名；私钥离线保管（GPG/KF-GnuPG、minisign/KF-Minisign、或 ssh-keygen `-Y sign` + allowed_signers + namespace，KF-18），公钥随图谱发布作为验证锚点。
3. **可选外部时间戳锚定**：把 checkpoint 哈希提交 OpenTimestamps（Bitcoin 区块链作时间戳公证，KF-13）或 RFC 3161 TSA（"proof that a datum existed before a particular time"，KF-14），获得"在特定时间点之前已存在"的外部证据。
4. **密钥管理**：签名密钥与图谱数据分离（离线/HSM/可移动介质），仅验证公钥在线；密钥丢失 = 失去未来锚定能力但历史链仍可验证（此句为 C 级推断）。

红线说明：本方案为推断性组合方案，每个组件的存在性均有 A 级文档支撑，但"对 522 个人图谱足够"的论断无权威定量来源，一律标 C。

---

## 2 关键发现

### KF-01 经典哈希链公式（Crosby & Wallach）
- 论断：逐行哈希链的标准形式为 `Ci = H(Ci−1 ∥ Xi), C−1 = □`（前一行哈希拼接本行数据后取哈希，种子为空串）。
- URL：https://www.usenix.org/conference/usenixsecurity09/technical-sessions/presentation/efficient-data-structures-tamper-evident （PDF：https://www.usenix.org/legacy/event/sec09/tech/full_papers/crosby.pdf ，已 HEAD 验证 200）
- 标题：Efficient Data Structures for Tamper-Evident Logging
- 机构：USENIX（18th USENIX Security Symposium, Montreal）
- 日期：2009
- 原文摘录："Existing tamper-evident log designs based on a classic hash-chain have the form Ci = H(Ci−1 ∥ Xi), C−1 = □ and do not permit events to be skipped."
- 等级：A

### KF-02 哈希链证明代价线性 vs 历史树对数
- 论断：哈希链的成员/增量证明需线性扫描中间事件，Merkle 式历史树证明为对数级；这是"工程上为何不只用逐行链"的关键依据。
- URL：同上（USENIX 论文全文，research_tree\tmp\b6e\crosby_wallach.pdf）
- 标题：Efficient Data Structures for Tamper-Evident Logging
- 机构：USENIX
- 日期：2009
- 原文摘录："Where a classic hash chain might require an 800 MB trace to prove that a randomly chosen event is in a log with 80 million events, our prototype returns a 3 KB proof with the same semantics." 以及 "in a log of 80 million events, our history tree can return a complete proof for any randomly chosen event in 3100 bytes. In a hash chain, where intermediate events cannot be skipped, an average of 40 million hashes would be sent."
- 等级：A

### KF-03 防篡改日志的双重安全目标
- 论断：论文明确防篡改日志必须同时满足"单日志内篡改可检测"与"多实例日志不一致声明可检测"两个目标。
- URL：https://www.usenix.org/conference/usenixsecurity09/technical-sessions/presentation/efficient-data-structures-tamper-evident
- 标题：Efficient Data Structures for Tamper-Evident Logging
- 机构：USENIX
- 日期：2009
- 原文摘录："To be secure, a tamper-evident log system must both detect tampering within each signed log and detect when different instances of the log make inconsistent claims."
- 等级：A

### KF-04 RFC 6962 定义"公开可审计、append-only、不受信"日志
- 论断：CT 的规范目标是任何第三方都能审计日志本身，其核心属性是公开可审计、append-only、不受信。
- URL：https://www.rfc-editor.org/rfc/rfc6962
- 标题：RFC 6962 — Certificate Transparency
- 机构：IETF（B. Laurie, A. Langley, E. Kasper）
- 日期：2013-06
- 原文摘录："...certificates by providing publicly auditable, append-only, untrusted logs of all issued certificates. The logs are publicly auditable so that it is possible for anyone to verify the correctness of each log..."
- 等级：A

### KF-05 RFC 6962 用 Merkle 树实现追加性 + STH 结构
- 论断：CT 的 append-only 属性由 Merkle 树实现，签名树头（STH）由 `version / timestamp / tree_size / sha256_root_hash / TreeHeadSignature` 构成；树哈希有明确递归定义。
- URL：https://www.rfc-editor.org/rfc/rfc6962
- 标题：RFC 6962 — Certificate Transparency
- 机构：IETF
- 日期：2013-06
- 原文摘录："The append-only property of each log is technically achieved using Merkle Trees..."；"MTH({}) = SHA-256(). MTH({d(0)}) = SHA-256(0x00 || d(0)). MTH(D[n]) = SHA-256(0x01 || MTH(D[0:k]) || MTH(D[k:n]))"；STH 内结构 "uint64 timestamp; uint64 tree_size; opaque sha256_root_hash[32]; } TreeHeadSignature;"
- 等级：A

### KF-06 追加性违约靠 gossip 检测
- 论断：CT 依赖"所有审计者比对各自看到的 STH"（gossip）来发现日志分叉，即日志服务器撒谎在 CT 模型中是核心威胁。
- URL：https://www.rfc-editor.org/rfc/rfc6962
- 标题：RFC 6962 — Certificate Transparency
- 机构：IETF
- 日期：2013-06
- 原文摘录："Violation of the append-only property is detected by global gossiping, i.e., everyone auditing logs comparing their versions of the latest Signed Tree Heads. As soon as two conflicting Signed Tree Heads..."
- 等级：A

### KF-07 RFC 9162：CT v2 取代 6962
- 论断：CT 协议已升级到 v2（RFC 9162，Obsoletes 6962），作者为 Google 与 Sectigo 成员，说明该规范仍在演进而非静止标准。
- URL：https://www.rfc-editor.org/rfc/rfc9162
- 标题：RFC 9162 — Certificate Transparency Version 2.0
- 机构：IETF（B. Laurie, E. Messeri, R. Stradling）
- 日期：2021-12
- 原文摘录："This document describes version 2.0 of the Certificate Transparency (CT) protocol for publicly logging the existence of Transport Layer Security (TLS) server certificates as they are issued or observed, in a manner that allows anyone to audit certification authority (CA) activity..."
- 等级：A

### KF-08 Trillian：CT 的泛化工程实现，且官方已进入维护模式
- 论断：Trillian 是 CT 概念的通用化 Merkle 树实现，提供 append-only Log 模式；其 README 已声明进入维护模式并推荐新项目改用 Tessera/tile-based log。
- URL：https://github.com/google/trillian
- 标题：Trillian: General Transparency（README）
- 机构：Google / transparency-dev
- 日期：README 抓取于 2026-08（正文含"Trillian is in maintenance mode"）
- 原文摘录："An append-only Log mode, analogous to the original Certificate Transparency logs. In this mode, the Merkle tree is effectively filled up from the left, giving a dense Merkle tree."；"Trillian is in maintenance mode. The next generation of transparency logs uses Tiled APIs and are better supported by Tessera... We recommend that any new log operators first try Tessera."
- 等级：A

### KF-09 BBVA/QED：防篡改日志的工程化实现（签名快照）
- 论断：QED 自称 scalable/auditable/high-performance tamper-evident log，实现"前向安全、append-only、持久化认证数据结构"，每次追加产出签名快照；部署于不受信服务器时篡改必然被发现。
- URL：https://github.com/BBVA/qed （文档：https://qed.readthedocs.io/en/latest/）
- 标题：QED — Scalable, auditable and high-performance tamper-evident log（README.rst 与 Overview 文档）
- 机构：BBVA（西班牙对外银行）开源
- 日期：仓库最近推送 2020-02（GitHub 搜索元数据）；README 抓取 2026-08
- 原文摘录："QED guarantees that the system itself, even when deployed into a non-trusted server, cannot be modified without being detected."；"QED implements a forward-secure append-only persistent authenticated data structure. Each append operation produces as a result a cryptographic structure (a signed snapshot)..."
- 等级：A

### KF-10 tegmentum/secure-log：开源逐行哈希链 + 分段 Merkle + 签名 checkpoint
- 论断：存在一个明确以"哈希链条目 + Merkle 密封分段 + 外部签名 checkpoint"为架构的开源 Rust 审计日志实现，可作为逐行哈希链工程要素（行结构、种子、验证、checkpoint 签名）的直接参照。
- URL：https://github.com/tegmentum/secure-log
- 标题：secure-log — Tamper-evident audit log for Rust（README）
- 机构：GitHub 个人组织 tegmentum（开源）
- 日期：README 抓取 2026-08；GitHub 搜索元数据显示最近推送 2026-08-04
- 原文摘录："Tamper-evident audit log for Rust. Hash-chained entries, Merkle-sealed segments, externally-signed checkpoints, witness anti-equivocation, and optional AEAD payload sealing."；"Checkpoint signing happens in-graph; verification dispatches on the key's algorithm (ed25519 / ecdsa-p256 / rsa-pss-sha256)."
- 等级：A

### KF-11 RomaLytar/yammi-audit-log：PHP 生态的审计日志哈希链
- 论断：存在以"tamper-evident hash chain"为核心卖点的 Laravel 审计日志库，可作为逐行哈希链在应用层的现成实现线索。
- URL：https://github.com/RomaLytar/yammi-audit-log
- 标题：yammi-audit-log（GitHub 搜索元数据描述）
- 机构：GitHub 个人项目（开源）
- 日期：GitHub 搜索元数据显示最近推送 2026-06-30
- 原文摘录（GitHub 搜索 API 返回的描述）："Laravel audit log & change history with real actor attribution..., tamper-evident hash chain, GDPR reports, anomaly detection, Slack/webhook alerts, multi-tenancy and an optional dashboard."
- 等级：B（仅 GitHub 搜索元数据，未抓取仓库 README 原文验证）

### KF-12 Hypercore：分布式 append-only log，但 v10 支持 truncate
- 论断：Hypercore 自称"secure, distributed append-only log"并用签名 Merkle 树实时校验完整性；但其最新 v10 已支持 truncate（截断），与严格 append-only 语义存在张力。
- URL：https://github.com/holepunchto/hypercore
- 标题：Hypercore（README）
- 机构：Holepunch（开源）
- 日期：README 抓取 2026-08
- 原文摘录："Hypercore is a secure, distributed append-only log."；"Secure. Uses signed merkle trees to verify log integrity in real time."；"Note that the latest release is Hypercore 10, which adds support for truncate and many other things."
- 等级：A

### KF-13 OpenTimestamps：区块链时间戳的标准格式
- 论断：OpenTimestamps 目标是"区块链时间戳的标准格式"，客户端用 Bitcoin 区块链作为时间戳公证，为"外部可验证时间锚点"提供现成协议。
- URL：https://opentimestamps.org （客户端：https://github.com/opentimestamps/opentimestamps-client）
- 标题：OpenTimestamps（官网与客户端 README）
- 机构：OpenTimestamps / Peter Todd 等（开源）
- 日期：官网与 README 抓取 2026-08
- 原文摘录："OpenTimestamps aims to be a standard format for blockchain timestamping."；"OpenTimestamps protocol, using the Bitcoin blockchain as a timestamp notary."
- 等级：A

### KF-14 RFC 3161：时间戳权威（TSA）
- 论断：RFC 3161 定义时间戳权威（TSA）协议，提供"数据在特定时间之前已存在"的证明，是比区块链更轻的外部时间锚定标准。
- URL：https://www.rfc-editor.org/rfc/rfc3161
- 标题：RFC 3161 — Internet X.509 Public Key Infrastructure Time-Stamp Protocol (TSP)
- 机构：IETF（C. Adams, P. Cain, D. Pinkas, R. Zuccherato）
- 日期：2001-08
- 原文摘录："A time-stamping service supports assertions of proof that a datum existed before a particular time. A TSA may be operated as a Trusted Third Party (TTP) service, though other operational models may be appropriate..."
- 等级：A

### KF-15 NIST SP 800-92：日志归档/保留/压缩的权威定义
- 论断：NIST 明确定义 log archival（长期保留）、retention 与 preservation 两种归档、以及"不改变内容含义的压缩"，并指出"确保原始日志不被改动支持其证据用途"——这是"append-only + 归档 + 压缩"策略的政府级依据。
- URL：https://csrc.nist.gov/pubs/sp/800/92/final
- 标题：NIST SP 800-92 — Guide to Computer Security Log Management
- 机构：美国国家标准与技术研究院（NIST）
- 日期：2006-09
- 原文摘录："Log archival is retaining logs for an extended period of time, typically on removable media..."；"Log compression is storing a log file in a way that reduces the amount of storage space needed for the file without altering the meaning of its contents. Log compression is often performed when logs are rotated or archived."；"Ensuring that the original logs are not altered supports their use for evidentiary purposes."
- 等级：A

### KF-16 Linux 审计栈：rotate/keep/remove、配置锁定、append-only 属性
- 论断：Linux auditd 的 `max_log_file_action` 官方支持 ignore/syslog/rotate/keep_logs/remove；auditctl `-e 2` 可锁定配置（仅重启可改）；chattr `+a` 提供内核级 append-only 写入约束——即"不物理删除"在 Linux 上可借 chattr +a 实现，而轮转删除则是默认运维路径。
- URL：https://man7.org/linux/man-pages/man5/auditd.conf.5.html 、https://man7.org/linux/man-pages/man8/auditctl.8.html 、https://man7.org/linux/man-pages/man1/chattr.1.html
- 标题：auditd.conf(5) / auditctl(8) / chattr(1) — Linux manual page（man7.org）
- 机构：Linux man-pages 项目 / kernel 社区
- 日期：抓取 2026-08（man7 现行版）
- 原文摘录："Valid values are ignore, syslog, rotate, keep_logs..."；auditctl `-e 2`："only be changed by rebooting the machine"；chattr："files: append only (a)..." 且该属性下文件"can only be opened in append mode for writing."
- 等级：A

### KF-17 Git：内容寻址 + commit 父指针链 + GPG 签名
- 论断：Git 以内容寻址（SHA-1 哈希对象）天然形成对象图与提交链，可用 GPG 对 tag/commit 签名——"哈希链 + 签名锚点"在个人本地图谱上已有现成、文档完善的实现。
- URL：https://git-scm.com/book/en/v2/Git-Internals-Git-Objects 、https://git-scm.com/book/en/v2/Git-Tools-Signing-Your-Work
- 标题：Pro Git — Git Objects / Signing Your Work
- 机构：Git 官方（Scott Chacon, Ben Straub）
- 日期：Pro Git 2nd ed.（抓取 2026-08）
- 原文摘录："Git is a content-addressable filesystem."；"This is the SHA-1 hash — a checksum of the content you're storing plus a header..."；签名章节："To verify a signed tag, you use git tag -v <tag-name>. This command uses GPG to verify the signature."
- 等级：A

### KF-18 ssh-keygen：无 PKI 的轻量签名锚点（-Y sign / allowed_signers / namespace）
- 论断：OpenSSH 提供 `ssh-keygen -Y sign/verify`、`allowed_signers` 文件、签名 namespace 与 valid-after/before 约束，可作为个人最小签名锚点方案中"无需 PKI/CA 的轻量签名与验签"组件。
- URL：https://man.openbsd.org/ssh-keygen.1
- 标题：ssh-keygen(1) — OpenBSD manual pages
- 机构：OpenBSD / OpenSSH
- 日期：抓取 2026-08
- 原文摘录："Cryptographically sign a file or some data using an SSH key. When signing, accepts a message on standard input and a signature namespace using -n."；"An additional signature namespace, used to prevent..."；"NAMESPACE@YOUR.DOMAIN pattern to generate unambiguous namespaces."
- 等级：A

### KF-19 AWS S3 Object Lock：托管"不物理删除"
- 论断：云对象锁 Compliance 模式下对象不可被任何用户（含 root）覆盖或删除、保留期不可缩短，是"物理不可删除"的托管实现；其局限是保留期过后仍需显式策略处置。
- URL：https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock-overview.html
- 标题：Locking objects using S3 Object Lock（User Guide）
- 机构：Amazon Web Services
- 日期：抓取 2026-08（现行文档）
- 原文摘录："Objects protected by Object Lock (both GOVERNANCE and COMPLIANCE modes) do not allow..."；"an object is locked in compliance mode... can't be overwritten or deleted by any user, including the root user in your AWS account. When an object is locked in compliance mode, its retention mode can't be changed, and its retention period can't be shortened."
- 等级：A

### KF-20 syslog-ng 3.37 官方 Admin Guide：未发现哈希链/logstore 原生实现
- 论断：对 syslog-ng OSE 3.37 官方 Admin Guide 全文（Wayback 存档，451 个主题页）检索 hash/logstore/append-only/integrity，仅命中 TLS 加密、CA 哈希命名等无关内容；"syslog-ng 原生哈希链"无官方文档支撑。
- URL：https://web.archive.org/web/2024*/https://www.syslog-ng.com/technical-documents/doc/syslog-ng-open-source-edition/3.37/administration-guide/
- 标题：syslog-ng Open Source Edition 3.37 Administration Guide
- 机构：One Identity / syslog-ng 官方
- 日期：Wayback 存档抓取（页面版权 © 2024 One Identity LLC；具体快照时间戳未核）
- 原文摘录：全文检索命中项均为无关内容（如 "CA...hash" 命名、TLS 选项）；未检索到 "hash chain / logstore / append-only" 功能条目。
- 等级：未核（官方文档原文已到手但无相关功能描述；不据此断言"存在"或"不存在"商业版功能）

### KF-21 rsyslog.conf(5) man page：未发现哈希/完整性/加密模块
- 论断：rsyslog 官方 man page（man7 现行版）中 hash/integrity/crypto/tamper/append-only 关键词仅命中注释行语法说明，未发现完整性哈希链功能描述。
- URL：https://man7.org/linux/man-pages/man5/rsyslog.conf.5.html
- 标题：rsyslog.conf(5) — Linux manual page
- 机构：rsyslog / Linux man-pages
- 日期：抓取 2026-08
- 原文摘录：检索命中仅 "Lines starting with a hash mark ('#') and empty lines are ignored."（配置注释语法）；未发现哈希链/完整性模块条目。
- 等级：未核

### KF-22 Rekor（sigstore）：签名透明日志的现行实现与演进
- 论断：Rekor 为软件签名提供透明日志（含 inclusion proof、完整性验证），并明确 v2 采用 tile-based log / Trillian-Tessera——透明日志工程栈仍在活跃演进，且 CT 是其设计根基。
- URL：https://github.com/sigstore/rekor
- 标题：Rekor（README）
- 机构：sigstore / Linux Foundation
- 日期：README 抓取 2026-08
- 原文摘录："The Rekor project provides a restful API based server for validation and a transparency log for storage."；"Building on the active development in the Certificate Transparency ecosystem, Rekor v2 will be backed by a tile-based log and will use a modernized version of Trillian, Trillian-Tessera."
- 等级：A

---

## 3 冲突与张力

1. **"append-only"标签 vs 实际可删改能力**：Hypercore 自称 "secure, distributed append-only log"，但官方 README 明示 v10 "adds support for truncate"（KF-12）——"append-only"在不同项目中的严格程度不一致。
2. **Git 内容寻址天然链式但支持历史改写**：Git commit 图可被 rebase/amend/force-push 改写；"链式"不等于"不可篡改"，必须靠 GPG 签名 tag/commit 锚定（KF-17）。即：哈希链提供篡改**可检测性**，签名提供**不可抵赖锚点**，二者缺一不可。
3. **常规运维默认删除 vs "不物理删除"红线**：auditd `max_log_file_action` 的 rotate/keep/remove（KF-16）、logrotate 标准做法、以及 NIST 允许"保留期结束后删除"（KF-15），均与红线"不物理删除"直接冲突；需要把归档目标设为不可变存储（如 S3 Object Lock Compliance，KF-19）或 chattr +a（KF-16）才能物理防删。
4. **CT 多方可信模型 vs 单机个人场景**：RFC 6962 的核心威胁是"不受信日志服务器撒谎"，对策是公开审计 + gossip（KF-04/06）；个人单机场景写入者即所有者，无此威胁，全套 CT 机制属过度设计（推断 C）。
5. **证明效率取舍**：逐行哈希链证明需线性扫描（800 MB / 8000 万事件场景），Merkle 历史树为对数级（3 KB 证明）——论文原文明确比较（KF-02）；逐行链实现简单、Merkle 实现复杂，个人小规模图谱前者足够，规模增长后再升级。
6. **外部时间戳锚定 vs 离线个人场景**：OpenTimestamps 依赖 Bitcoin 网络（KF-13）、RFC 3161 依赖 TSA 服务（KF-14），均为外部依赖；纯离线个人场景只能退化为"本地签名 checkpoint + 物理介质隔离"（推断 C）。

---

## 4 未决

1. **syslog-ng/rsyslog 官方原生哈希链实现：未核。** 官方文档（syslog-ng 3.37 Admin Guide、rsyslog.conf(5)）中未找到相关功能描述；其商业版（Premium Edition / Store Box）是否存在 logstore 完整性机制，未获官方文档原文，不能下结论。
2. **不存在"权威的逐行哈希链行格式标准"。** prev hash + data + hash + 种子的字段级标准化定义未在任何规范中查到，只有论文公式（KF-01）与各家开源实现（KF-10/11），各行格式互不兼容。
3. **CT/透明日志对单机个人图谱的适配成本**无权威定量结论；"过度设计"仅为 C 级推断（第 1.3 节）。
4. **"不物理删除"与法律/合规允许到期删除的边界**没有统一答案：NIST 允许按策略删除（KF-15），S3 Object Lock 也只能保证保留期内不可删（KF-19），永久保留缺乏权威支撑。
5. **Hypercore v10 的 truncate 与 append-only 语义如何调和**：官方 README 未给出解释，缺权威说明。
6. **522 节点级个人图谱的具体含义**（522 指节点数还是别的度量）不在本分支任务范围内，本分支只给出通用结论；若 522 为规模量级，逐行哈希链 + 周期 checkpoint 在千条级完全可行（推断 C）。

---

## 5 来源清单

> 类型：RFC/标准、学术论文、开源仓库、厂商文档、政府手册、man page。原文到手 = 已抓取原始文本/PDF 并可直接引用。

| # | 来源 | 机构 | 类型 | 日期 | URL | 原文到手 |
| --- | --- | --- | --- | --- | --- | --- |
| S01 | RFC 6962 Certificate Transparency | IETF | RFC/标准 | 2013-06 | https://www.rfc-editor.org/rfc/rfc6962 | 是（txt） |
| S02 | RFC 9162 Certificate Transparency v2.0 | IETF | RFC/标准 | 2021-12 | https://www.rfc-editor.org/rfc/rfc9162 | 是（txt） |
| S03 | RFC 3161 Time-Stamp Protocol | IETF | RFC/标准 | 2001-08 | https://www.rfc-editor.org/rfc/rfc3161 | 是（txt） |
| S04 | Efficient Data Structures for Tamper-Evident Logging（Crosby & Wallach） | USENIX | 学术论文 | 2009 | https://www.usenix.org/conference/usenixsecurity09/technical-sessions/presentation/efficient-data-structures-tamper-evident ；PDF https://www.usenix.org/legacy/event/sec09/tech/full_papers/crosby.pdf | 是（PDF+txt，URL 已 HEAD 验证） |
| S05 | Secure Audit Logs to Support Computer Forensics（Schneier & Kelsey） | Counterpane（ACM CCS'99） | 学术论文 | 1999 | https://www.schneier.com/wp-content/uploads/2016/02/paper-auditlogs.pdf | 是（PDF+txt，URL 已 HEAD 验证，OCR 较乱） |
| S06 | Trillian README | Google/transparency-dev | 开源仓库 | 抓取 2026-08 | https://github.com/google/trillian | 是（md） |
| S07 | QED README + 官方文档 | BBVA | 开源仓库+文档 | 仓库最近推送 2020-02 | https://github.com/BBVA/qed ；https://qed.readthedocs.io/en/latest/ | 是（rst） |
| S08 | tegmentum/secure-log README | GitHub 开源 | 开源仓库 | 最近推送 2026-08-04 | https://github.com/tegmentum/secure-log | 是（md） |
| S09 | RomaLytar/yammi-audit-log（GitHub 搜索元数据） | GitHub 开源 | 开源仓库 | 最近推送 2026-06-30 | https://github.com/RomaLytar/yammi-audit-log | 否（仅搜索元数据，B 级） |
| S10 | Hypercore README | Holepunch | 开源仓库 | 抓取 2026-08 | https://github.com/holepunchto/hypercore | 是（md） |
| S11 | certificate-transparency-go README | Google | 开源仓库 | 抓取 2026-08 | https://github.com/google/certificate-transparency-go | 是（md） |
| S12 | sigstore Rekor README | sigstore/Linux Foundation | 开源仓库 | 抓取 2026-08 | https://github.com/sigstore/rekor | 是（md） |
| S13 | OpenTimestamps 官网 + 客户端 README | OpenTimestamps | 开源项目/协议 | 抓取 2026-08 | https://opentimestamps.org ；https://github.com/opentimestamps/opentimestamps-client | 是（html+md） |
| S14 | NIST SP 800-92 Guide to Computer Security Log Management | NIST | 政府手册 | 2006-09 | https://csrc.nist.gov/pubs/sp/800/92/final | 是（pdf+txt） |
| S15 | auditd.conf(5) man page | Linux man-pages | man page | 抓取 2026-08 | https://man7.org/linux/man-pages/man5/auditd.conf.5.html | 是（html） |
| S16 | auditctl(8) man page | Linux man-pages | man page | 抓取 2026-08 | https://man7.org/linux/man-pages/man8/auditctl.8.html | 是（html） |
| S17 | chattr(1) man page | Linux man-pages | man page | 抓取 2026-08 | https://man7.org/linux/man-pages/man1/chattr.1.html | 是（html） |
| S18 | logrotate(8) man page | Linux man-pages | man page | 抓取 2026-08 | https://man7.org/linux/man-pages/man8/logrotate.8.html | 是（html） |
| S19 | rsyslog.conf(5) man page | Linux man-pages | man page | 抓取 2026-08 | https://man7.org/linux/man-pages/man5/rsyslog.conf.5.html | 是（html，无相关功能） |
| S20 | ssh-keygen(1) man page | OpenBSD/OpenSSH | man page | 抓取 2026-08 | https://man.openbsd.org/ssh-keygen.1 | 是（html） |
| S21 | Pro Git — Git Objects / Signing Your Work | Git 官方 | 厂商文档/书籍 | 抓取 2026-08 | https://git-scm.com/book/en/v2/Git-Internals-Git-Objects ；https://git-scm.com/book/en/v2/Git-Tools-Signing-Your-Work | 是（html） |
| S22 | AWS S3 Object Lock User Guide | Amazon Web Services | 厂商云文档 | 抓取 2026-08 | https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock-overview.html | 是（html） |
| S23 | syslog-ng OSE 3.37 Administration Guide | One Identity | 厂商文档 | Wayback 存档 2024（版权页） | https://web.archive.org/web/2024*/https://www.syslog-ng.com/technical-documents/doc/syslog-ng-open-source-edition/3.37/administration-guide/ | 是（html+txt，无相关功能） |
| S24 | GnuPG Manual（Making and verifying signatures） | GnuPG | 厂商文档 | 抓取 2026-08 | https://www.gnupg.org/gph/en/manual.html | 是（html） |
| S25 | Minisign | Frank Denis | 开源项目 | 抓取 2026-08 | https://jedisct1.github.io/minisign/ | 是（html） |
| S26 | certificate.transparency.dev | CT 社区 | 开源社区 | 抓取 2026-08 | https://certificate.transparency.dev/ | 是（html） |

---

## 6 判死自查

### 6.1 工作量红线

| 红线 | 要求 | 实测 | 结果 |
| --- | --- | --- | --- |
| 可核来源数 | ≥ 15 | 22（来源清单 S01–S26，其中独立来源 22 个） | ✅ 通过 |
| 原文到手数 | ≥ 10 | 20（S01–S08、S10–S18、S20–S26 均到手原文；S09 仅搜索元数据） | ✅ 通过 |
| 来源类型 | ≥ 3 类 | 6 类：RFC/标准、学术论文、开源仓库、厂商文档、政府手册、man page | ✅ 通过 |
| 候选逐一查证 | ≥ 5 | 5/5：RFC 6962（S01/S02）、Crosby&Wallach（S04）、tamper-evident log 开源实现（S08/S09）、ct log（S11/S12/S06）、rsyslog 文档（S19）+ syslog-ng（S23） | ✅ 通过 |
| 关键词组数 | ≥ 4 组 | 6 组：①审计日志 哈希链 防篡改 实现 / tamper-evident audit log hash chain；②透明日志 RFC 6962 / certificate transparency append-only；③日志 轮转 归档 保留 / log rotation archival retention append-only；④个人 签名 锚点 哈希 / hash chain signature anchor personal use；⑤syslog-ng hashing logstore；⑥secure-log github hash chain | ✅ 通过 |

### 6.2 禁止项与证据纪律自查

- **不做产品选型**：✅ 全文无"推荐某产品/比较厂商"的选型结论；仅陈述先例与模式（对个人场景的最小方案为 C 级模式推断，非产品推荐）。
- **不越界（时间版本理论归 B4）**：✅ 未讨论版本时间戳/冲突消解等 B4 主题；RFC 3161/OpenTimestamps 仅作为"外部时间锚定"组件引用。
- **不捏造来源**：✅ 全部 22 个独立来源均有真实 URL 与抓取文件；两处 PDF URL 已 HEAD 验证 200 且字节数与抓取文件一致；syslog-ng/rsyslog 无相关功能证据处明确标"未核"，未虚构任何功能描述。
- **抓不到写"未核"**：✅ syslog-ng 原生哈希链（KF-20）、rsyslog 完整性模块（KF-21）均标"未核"；具体 Wayback 快照时间戳标"未核"。
- **推断一律标 C**：✅ 问题 3"过度设计"（1.3 节）、问题 5 最小方案（1.5 节）、KF-11（B 级元数据）、第 3 节第 4/6 条、第 4 节第 3/6 条均显式标 C 或 B。
- **证据等级标注**：✅ 关键发现 KF-01~KF-22 每条均带 URL+标题+机构+日期+原文摘录+等级（A/B/C/未核）。

### 6.3 统计（供汇总）

- 关键发现条数：22（KF-01 ~ KF-22，其中 A 级 20、B 级 1、未核 2 —— KF-20/21 计未核，KF-11 计 B）
- 独立来源数：22
- 原文到手数：20
- 未决数：6（见第 4 节）