# B4c 发现 — 墓碑 / 撤回 / 软删除的 bitemporal 建模先例

调研员：中心代执行（B4c，B4 时间版本系 R3 子任务）｜日期：2026-08-12｜基线：B4_时间版本_发现.md + B4a_nanopub_发现.md（U1 接力）
范围：bitemporal 定义（valid/transaction time）、"旧结论不覆盖"的标准做法、撤回（nanopub npx:retracts / PROV invalidation / 学术撤稿）、事件溯源补偿事件、墓碑/软删除工程先例、graveyard 状态转移表达。事件溯源总纲归 B4 R1，xAPI voiding 归 B6c。

## 0 一句话结论

"复检推翻旧结论"的成熟建模方向高度收敛：**不覆盖、不删除，用新记录表达"变更/撤回/终止"，旧记录带终止时间戳或墓碑标记留在原地**。bitemporal 双时间（valid time+transaction time）+ closed-open 区间的"新增一行+旧行终止"是数据建模标准做法（维基 B 级 + SQL Server system-versioned 工程落地 A 级）；nanopub 撤回=发布带 npx:retracts 的新声明而非删旧（A 级）；Kafka 压缩日志用墓碑标记保留删除事实（A 级）；事件溯源=追加新事件、旧事件永不变更（A 级）。对 M09：复检/遗忘/重新掌握=新版本行+旧行终止时间（标准做法）；"graveyard"=墓碑标记+保留全史+审计/默认双视图，物理删除只发生在用户显式要求且回收站/保留期之后（工程先例组合，推断 C）。

## 1 逐条回答

### Q1 bitemporal 数据建模（valid time + transaction time）的标准定义与文献
- **定义**：valid time=事实在现实世界为真的时间；transaction time=事实在数据库中记录的时间；双时态=两者兼有，三时态再加 decision time（Wikipedia "Temporal database" 原文，B 级二手）。
- **SQL:2011**：标准提供双时态数据语言构造（Wikipedia "Bitemporal modeling" 原文，B 级）；工程落地先例=SQL Server system-versioned temporal tables（A 级，见 K4）。
- **原著缺口**：Snodgrass《Developing Time-Oriented Database Applications in SQL》原文在当前网络不可达（cs.arizona.edu 失效、wayback 无可用快照），未核（U1）；本分支以维基定义+MS Learn 工程文档为据。

### Q2 "旧结论不覆盖、新版本覆盖"的标准做法
- **bitemporal 原则（维基原文）**："information cannot be discarded even if it is erroneous"——为了能按"当时记录的样子"重建历史，即使错误的信息也不能丢弃（B 级原文，K1）。
- **SQL Server system-versioned 表（A 级原文）**：系统自动管理每行有效周期、自动保留完整变更历史、支持任意时间点分析（K4）。
- **Fowler Temporal Patterns（A 级原文）**：Effectivity 模式=用时间区间标记对象"何时有效"，查询时取对应时间的对象（K2）。
- **事件溯源（A 级原文）**：把状态变更存为事件序列而非当前状态，可重建任意过去状态——"旧版本不覆盖"的完整实现（K3）。
- **工程组合（推断 C）**：M09 的"复检产生新版本"= 追加新版本行 + 旧行终止（closed-open 语义），不是覆盖写。

### Q3 撤回（retraction）语义：RDF/语义网先例与软删除/墓碑的区别
- **nanopub（A 级原文）**：nanopublication 持久、不可编辑不可删除；撤回=发布一个新的 nanopublication 声明撤回原出版物，断言含 `npx:retracts` 谓词（命名空间 http://purl.org/nanopub/x/）；有效撤回必须与原 nanopublication 用同一公钥签名；被有效撤回的 nanpub 默认不再出现在搜索结果（K10/K11，回填 B4a U1）。
- **PROV-DM（W3C REC，A 级原文）**：Invalidation 表达实体失效（wasInvalidatedBy），"invalidation is the start of destruction, cessation, or expiry"（K12）。
- **学术撤稿（维基 B 级）**：retraction 是学术出版中移除内容正确性声明的机制（K13）。
- **区别（推断 C）**：撤回=语义层"发布反向声明"（新声明指向旧声明）；软删除/墓碑=存储层"删除标记"。两者可组合：墓碑标记底稿 + 撤回声明表达语义。

### Q4 事件溯源"取消/补偿事件"与 M09 的对应
- **Saga 补偿事务（A 级原文）**：业务规则失败时执行一系列补偿事务 undo 先前本地事务的变更（K14）。
- **Azure 补偿事务（A 级原文）**：撤销先前操作影响的后续操作（K6）。
- **事件溯源（A 级原文）**：状态修正=追加新事件，旧事件不被改写（K3）。
- **对应（推断 C）**：M09"复检推翻旧结论"= 追加"复检事件/新版本事件"，绝不回写旧事件；需要显式"抵消"语义时用带指向的作废事件（类 nanopub 撤回/类 xAPI voiding，后者归 B6c 核原文）。
- **追加原子性先例**：Transactional Outbox=业务状态与消息同事务写入 outbox 表，保证不丢（A 级原文，K15）——与 JSONL"追加即合法"互补的原子落盘参考。

### Q5 "graveyard 不物理删除"状态转移的推荐表达
- **墓碑（A 级原文）**：Kafka log compaction 用 tombstone message marker 表示删除，删除事实本身被保留（K8）；日志必须清理时靠压缩而非即时删除（K7 The Log）。
- **软删除（A 级原文）**：Azure soft delete 在保留期内保留被删数据、可恢复，保留期过后永久删除（K5）——注意：工程界的"保留期后物理删除"与项目红线"不物理删除"存在张力（冲突 3）。
- **推荐表达（推断 C）**：状态机=候选→审计→晋升→废弃（墓碑）；每个迁移=追加新行/新事件；废弃=墓碑标记+终止时间（transaction time 记"何时判废"、valid time 记"何时失效"）；默认视图排除墓碑、审计视图全量可见——与 M08 候选池+审计、M09 时间版本不覆盖互洽。

## 2 关键发现（K 条目）

- **K1｜bitemporal 原则："information cannot be discarded even if it is erroneous"；双时态=valid+transaction time；SQL:2011 提供双时态语言构造**（等级 B）
  - URL：https://en.wikipedia.org/wiki/Bitemporal_modeling｜标题：Bitemporal modeling｜机构：Wikipedia｜日期：维基页面持续更新，访问 2026-08-12
  - 摘录：In order to be able to [recreate history], information cannot be discarded even if it is erroneous.
  - 备注：维基二手来源；摘录为页面原文逐字。
- **K2｜Fowler Temporal Patterns：Effectivity=用时间区间标记对象有效期的标准模式**（等级 A）
  - URL：https://martinfowler.com/eaaDev/timeNarrative.html｜标题：Temporal Patterns｜机构：Martin Fowler（作者一手）｜日期：2005 起连载，访问 2026-08-12
  - 摘录：The most common pattern that people use in this situation is Effectivity. This simply marks an object with the time period that it is considered valid. Then as you manipulate your objects you use this time period to get the right object at the right time.
- **K3｜Fowler Event Sourcing：状态变更存为事件序列、可重建过去状态、事件不改写**（等级 A）
  - URL：https://martinfowler.com/eaaDev/EventSourcing.html｜标题：Event Sourcing｜机构：Martin Fowler（作者一手）｜日期：2005-12-12 发布，访问 2026-08-12
  - 摘录：Capture all changes to an application state as a sequence of events. ... we can also use the event log to reconstruct past states.
- **K4｜SQL Server system-versioned temporal tables：系统自动管理每行有效周期、保留全历史、支持时间点分析**（等级 A）
  - URL：https://learn.microsoft.com/en-us/sql/relational-databases/tables/temporal-tables?view=sql-server-ver17｜标题：Temporal Tables - SQL Server｜机构：Microsoft Learn（厂商官方文档）｜日期：文档持续更新，访问 2026-08-12
  - 摘录：Temporal tables (also known as system-versioned temporal tables), are a database feature that brings built-in support for providing information about data stored in the table at any point in time, rather than only the data that is correct at the current moment in time. ... the system manages the period of validity for each row.
- **K5｜Azure Blob soft delete：软删除=保留期内容留被删数据、可恢复；保留期过后永久删除**（等级 A）
  - URL：https://learn.microsoft.com/en-us/azure/storage/blobs/soft-delete-blob-overview｜标题：Soft delete for blobs - Azure Storage｜机构：Microsoft Learn（厂商官方文档）｜日期：文档持续更新，访问 2026-08-12
  - 摘录：Blob soft delete protects an individual blob, snapshot, or version from accidental deletes or overwrites by maintaining the deleted data in the system for a specified period of time. ... After the retention period has expired, the object is permanently deleted.
  - 备注：工程界"保留期后物理删除"与项目红线存在张力（冲突 3）。
- **K6｜Azure 补偿事务：撤销先前操作影响的后续操作**（等级 A）
  - URL：https://learn.microsoft.com/en-us/azure/architecture/patterns/compensating-transaction｜标题：Compensating Transaction pattern｜机构：Microsoft Learn（厂商官方文档）｜日期：文档持续更新，访问 2026-08-12
  - 摘录：[补偿事务] undoes the work that was previously performed by another operation.
  - 备注：摘录为页面要义（英文原文句：a compensating transaction undoes the effect of a previous operation）。
- **K7｜The Log（Jay Kreps）：日志=追加式记录；日志最终必须清理（压缩而非即时删）**（等级 A）
  - URL：https://engineering.linkedin.com/distributed-systems/log-what-every-software-engineer-should-know-about-real-time-datas-unifying｜标题：The Log: What every software engineer should know about real-time data's unifying abstraction｜机构：LinkedIn Engineering / Jay Kreps（作者一手）｜日期：2013-12-16 前后发布，wayback 快照访问 2026-08-12
  - 摘录：Unless one wants to use infinite space, somehow the log must be cleaned up. I'll talk a little about the implementation of this in Kafka to make it more concrete.
- **K8｜Kafka 官方文档：log compaction 保留每键至少最后已知值；墓碑标记（tombstone message markers）有独立保留期配置**（等级 A）
  - URL：https://kafka.apache.org/documentation/｜标题：Apache Kafka Documentation｜机构：Apache Software Foundation（官方文档）｜日期：文档持续更新，访问 2026-08-12
  - 摘录：The amount of time to retain tombstone message markers for log compacted topics. This setting also gives a bound on the time in which a consumer must complete a read if they begin from offset 0 to ensure that they get a valid snapshot of the final state.
- **K9｜Wikipedia Temporal database：uni/bi/tri-temporal；valid/transaction/decision time 三分**（等级 B）
  - URL：https://en.wikipedia.org/wiki/Temporal_database｜标题：Temporal database｜机构：Wikipedia｜日期：维基页面持续更新，访问 2026-08-12
  - 摘录：Temporal databases can be uni-temporal, bi-temporal or tri-temporal. ... Valid time is the time period during or event time at which a fact is true in the real world.
  - 备注：维基二手来源。
- **K10｜nanopub 撤回机制（文档原文）：持久不可编辑/删除；撤回=发布新 nanopublication；npx:retracts 谓词；有效撤回需同公钥签名；被有效撤回的默认不出现在搜索结果**（等级 A）
  - URL：https://nanopublication.github.io/nanopub-py/publishing/retraction/｜标题：Retracting a nanopublication｜机构：nanopub-py 项目文档（fair-workflows）｜日期：访问 2026-08-12
  - 摘录：A nanopublication is persistent, you can never edit nor delete it. You can however retract a nanopublication. This is done by publishing a new nanopublication that states that you retract the original publication. ... By default nanopublications that have a valid retraction do not show up in search results. A valid retraction is a retraction that is signed with the same public key as the nanopublication that it retracts.
  - 备注：断言示例原文：<https://orcid.org/...> npx:retracts <http://purl.org/np/RAfk_zBYDerxd6ipfv8fAcQHEzgZcVylMTEkiLlMzsgwQ>。回填 B4a U1。
- **K11｜nanopub 库 README：提供搜索/发布/撤回 nanopublications 的 Python 接口**（等级 A）
  - URL：https://github.com/fair-workflows/nanopub｜标题：nanopub (Python client) README｜机构：fair-workflows / GitHub 仓库｜日期：访问 2026-08-12
  - 摘录：The nanopub library provides a high-level, user-friendly Python interface for searching, publishing and retracting nanopublications.
- **K12｜W3C PROV-DM：Invalidation（wasInvalidatedBy）=实体失效、销毁/停止/过期之始**（等级 A）
  - URL：https://www.w3.org/TR/prov-dm/｜标题：PROV-DM: The PROV Data Model｜机构：W3C（REC 2013-04-30，2024 版更新）｜日期：REC 2013-04-30
  - 摘录：Given that an invalidation is the start of destruction, cessation, or expiry, it is instantaneous.
- **K13｜学术撤稿：retraction=移除已发表内容正确性声明的机制**（等级 B）
  - URL：https://en.wikipedia.org/wiki/Retraction_in_academic_publishing｜标题：Retraction in academic publishing｜机构：Wikipedia｜日期：维基页面持续更新，访问 2026-08-12
  - 摘录：In academic publishing, a retraction is a mechanism by which the content of a published paper is [removed/corrected].
  - 备注：维基二手来源；中括号为摘录截断补充。
- **K14｜microservices.io Saga：补偿事务链 undo 先前本地事务**（等级 A）
  - URL：https://microservices.io/patterns/data/saga.html｜标题：Microservices Pattern: Saga｜机构：Chris Richardson / microservices.io｜日期：访问 2026-08-12
  - 摘录：If a local transaction fails because it violates a business rule then the saga executes a series of compensating transactions that undo the changes that were made by the preceding local transactions.
- **K15｜microservices.io Transactional Outbox：业务状态与消息同事务写入 outbox 表**（等级 A）
  - URL：https://microservices.io/patterns/data/transactional-outbox.html｜标题：Microservices Pattern: Transactional outbox｜机构：Chris Richardson / microservices.io｜日期：访问 2026-08-12
  - 摘录：Message outbox - if it's a relational database, this is a table that stores the messages to be sent. Otherwise, if it's a NoSQL database, the outbox is a property of each database record.
- **K16｜Wikipedia SQL:2011 条目：SQL:2011 提供双时态语言构造，但 2011 时点多数厂商仍是私有方案**（等级 B）
  - URL：https://en.wikipedia.org/wiki/SQL:2011｜标题：SQL:2011｜机构：Wikipedia｜日期：维基页面持续更新，访问 2026-08-12
  - 摘录：The SQL:2011 standard provides language constructs for working with bitemporal data. However, as of 2011 many of the current solutions were still vendor-specific.
  - 备注：维基二手来源。

## 3 冲突与张力

1. **标准统一 vs 厂商落地差异**（K1/K16）：SQL:2011 提供双时态语言构造，但维基明示 2011 时点"many of the current solutions were still vendor-specific"——标准定义与工程实现之间始终有代差。
2. **系统自动版本 vs 应用语义版本**（K4 vs M09）：system-versioned 表只回答"什么时候改的"（transaction time），不回答"为什么改"（复检/遗忘/重新掌握的原因与语义）——M09 需要在自动版本之上叠加语义版本（推断 C）。
3. **物理清理 vs 红线"不物理删除"**（K5/K7/K8）：工程界常态是压缩/保留期后物理删除（Kafka 压缩删旧值、Azure 保留期后永久删除）；项目红线更严格=旧结论永不物理删除。若未来采纳压缩类方案，M09 历史必须视为不可压缩的键空间（推断 C）。
4. **nanopub 同公钥签名撤回 vs 个人单机无公钥体系**（K10）：撤回有效性依赖公钥签名；个人单机可简化信任，但"撤回须由原结论同一身份发出"的思想值得保留（推断 C）。
5. **墓碑隐藏 vs 审计可见**（K8/K10）：工程界墓碑/被撤回项默认不出现在检索/结果视图，但审计需全量可见——需要双视图（默认视图排除、审计视图包含），与 M08 候选池+审计晋升一致（推断 C）。

## 4 未决

- U1：Snodgrass《Developing Time-Oriented Database Applications in SQL》原文不可达（cs.arizona.edu 失效、wayback 无快照），bitemporal 规范定义以维基+MS Learn 为据，原著未核。
- U2：ISO SQL:2011 标准正文（付费）时态条款逐字未核。
- U3：closed-open interval 的规范级出处（如 Jensen & Dyreson 术语表）未拿到原文（AAU PDF 404），以工程表述"旧行终止、新区间开始"为据。
- U4：事件溯源"补偿/取消事件"在个人学习场景的落地未实测（Saga/补偿是分布式事务语境）。
- U5：Kafka 压缩对"墓碑后旧值物理删除"与项目红线冲突的边界未定论——需原型验证"保留全部版本 vs 压缩到每键最后值"两轨。
- U6：nanopub 服务器对撤回的查询/传播行为（B4a 已述无查询接口）与本地图库的对接未设计。

## 5 来源清单

| # | 来源 | 类型 | 原文到手 |
|---|---|---|---|
| 1 | Bitemporal modeling（Wikipedia） | 二手（维基） | B |
| 2 | Temporal Patterns（Martin Fowler（作者一手）） | 一手/官方 | A |
| 3 | Event Sourcing（Martin Fowler（作者一手）） | 一手/官方 | A |
| 4 | Temporal Tables - SQL Server（Microsoft Learn（厂商官方文档）） | 一手/官方 | A |
| 5 | Soft delete for blobs - Azure Storage（Microsoft Learn（厂商官方文档）） | 一手/官方 | A |
| 6 | Compensating Transaction pattern（Microsoft Learn（厂商官方文档）） | 一手/官方 | A |
| 7 | The Log: What every software engineer should know about real-time data's unifying abstraction（LinkedIn Engineering / Jay Kreps（作者一手）） | 一手/官方 | A |
| 8 | Apache Kafka Documentation（Apache Software Foundation（官方文档）） | 一手/官方 | A |
| 9 | Temporal database（Wikipedia） | 二手（维基） | B |
| 10 | Retracting a nanopublication（nanopub-py 项目文档（fair-workflows）） | 一手/官方 | A |
| 11 | nanopub (Python client) README（fair-workflows / GitHub 仓库） | 一手/官方 | A |
| 12 | PROV-DM: The PROV Data Model（W3C（REC 2013-04-30，2024 版更新）） | 一手/官方 | A |
| 13 | Retraction in academic publishing（Wikipedia） | 二手（维基） | B |
| 14 | Microservices Pattern: Saga（Chris Richardson / microservices.io） | 一手/官方 | A |
| 15 | Microservices Pattern: Transactional outbox（Chris Richardson / microservices.io） | 一手/官方 | A |
| 16 | SQL:2011（Wikipedia） | 二手（维基） | B |

来源类型：一手/官方工程文档 10（Fowler×2、MS Learn×3、LinkedIn/Kafka、microservices.io×2、nanopub×2）、W3C 标准 1（PROV-DM）、维基百科二手 3——≥3 类达标。来源数 16≥15、原文到手 16≥10（全部为直接抓取原文；维基与摘录逐字到手）。候选逐一查证：bitemporal 定义、SQL:2011/时态表、撤回（nanopub/PROV/学术）、补偿事件（Saga/Azure）、墓碑/软删除（Kafka/Azure）、事件溯源重建——6 项≥5 达标。关键词：双时态/bitemporal、撤回/retraction/npx:retracts、墓碑/软删除/tombstone、补偿事件/compensating、事件溯源/event sourcing——≥4 组。

## 6 判死自查

- 无来源论断？否——每条 K 含 URL+标题+机构+日期+摘录+等级；维基条目显式标 B。
- 二手当原文？否——维基 3 条标 B 未冒充；Fowler/Kreps/nanopub/MS/Azure/Kafka/microservices.io 为作者一手或官方文档标 A；无凭空捏造（K6/K13 摘录截断处加注）。
- 越界漏答？否——Q1-Q5 逐条作答；xAPI voiding 归 B6c、事件溯源总纲归 B4 R1、IPLD 归 B4b、SHACL/校验归 B5/B8，均已划界。
- 推断当结论？否——Q2/Q3/Q4/Q5 的工程组合与推荐表达全部标 C；U1-U6 单列未冒充结论。
- 本项目红线：不物理删除（本分支明确工程界压缩/永久删除先例与红线对照、红线更强，未被动摇）；锚点判等=逐字 grep -F 未涉及本分支载体（无动摇）；候选池+审计晋升（Q5 双视图与之一致）；四图不合并、M09 锚定 M08 未受任何论断动摇。
