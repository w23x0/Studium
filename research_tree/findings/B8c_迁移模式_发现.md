# B8c 存储迁移的工程模式（双写/影子读/回放）与"不丢失 JSONL 崩溃安全"的迁移设计 — 发现

调研日期：2026-08-12 ｜ 分支：B8c（B8 校验迁移系 R3 子任务）｜ 角色：深度调研树分支调研员

## 0 一句话结论
双写（dual-write）与影子读（shadow read）是存储迁移的成熟工程模式——Stripe 的"4 步双写"与 GitHub Scientist 影子实验给出可核原文（等级 A），其一致性风险（两写非原子）由 transactional outbox / SAGA 缓解（A），但跨不可靠通道的"原子双写"有理论不可解边界（Two Generals，B）；expand-migrate-contract（= Fowler Parallel Change）与蓝绿部署是并行运行期、可回滚的迁移策略（A）；事件重放/重建是事件溯源的内建能力（Fowler/Azure/Axon，A），而"把旧 JSONL 重放到新格式并对比审计结果"属于把该机制用于迁移验证的工程推断（C，组件先例为 AWS DMS 源-目标逐行比对与 Scientist 影子比对）；对"磁盘上任何时刻都是合法文件"红线：JSONL 逐行独立合法+末行半截可截断恢复（jsonlines + Redis AOF，A）与数据库事务提交点（WAL flush / 临时文件+fsync+rename，A）是两种不同的"安全"语义——目标格式若仍逐行 append 完整 JSON 值则可继承该红线，若引入多行事务/提交记录则必须自带恢复协议（C）。

## 1 逐条回答

### Q1 双写与影子读：工程定义、风险与缓解（outbox、SAGA）
- 双写定义（A，Stripe）："Dual writing to the existing and new tables to keep them in sync" 是 Stripe 总结的"4 步 dual writing pattern"第 1 步——把同一变更同时写入新旧两个存储；影子读（A，Stripe/Scientist）：切换读路径前用 Scientist 同时从新旧两表读并比对结果、不一致即告警。
- 风险（A，microservices.io outbox）：业务写库与发消息/写第二存储无法用跨库 2PC 保证原子；"But without using 2PC, sending a message in the middle of a transaction is not reliable. There's no guarantee that the transaction will commit." / "if a service sends a message after committing the transaction there's no guarantee that it won't crash before sending the message."（A，AWS Prescriptive Guidance）："A dual write operation occurs when an application writes to two different systems… A failure in one of these operations might result in inconsistent data."
- 理论界限（B，Wikipedia Two Generals' Problem）：不可靠通道上两方"协调一致提交"被证明不可解——双写跨两个独立存储/通道时，任何消息协议都不能给出原子保证，工程上只能缓解（见下）。
- 缓解 1：transactional outbox（A，microservices.io / Debezium / Confluent / AWS PG）——业务变更与"待发事件记录"在同一数据库事务内写入 outbox 表，后台进程/CDC 再发布；"Messages are guaranteed to be sent if and only if the database transaction commits"（microservices.io）。
- 缓解 2：SAGA 补偿事务（A，microservices.io）——跨服务时以本地事务序列+补偿事务维持最终一致，代价是"Lack of automatic rollback"。
- 影子读定义与机制（A，GitHub Scientist README）：use=control（旧行为）、try=candidate（新行为），"Compares the result of try to the result of use"，差异可发布/告警。

### Q2 数据库迁移经典模式：expand-migrate-contract、蓝绿、回滚
- expand-migrate-contract（A，Fowler Parallel Change）："Parallel change, also known as expand and contract, is a pattern to implement backward-incompatible changes to an interface in a safe manner, by breaking the change into three distinct phases: expand, migrate, and contract."——expand 阶段新旧接口并存、migrate 阶段逐客户端切换、contract 阶段删除旧接口。
- 数据库版（A，Prisma Data Guide）："transition data from an old data structure to a new data structure without affecting uptime"，Step 2 要求客户端"add or modify data in both the original structure and in the new structure"（即迁移期双写）；并明言"allows you to rollback changes easily at most points in the process"。
- 蓝绿（A，Fowler BlueGreen Deployment）：两个尽可能一致的生产环境、路由器切换、"Blue-green deployment also gives you a rapid way to rollback - if anything goes wrong you switch the router back to your blue environment"；对迁移事务：可"feed transactions to both environments"保持备份，或"put the application in read-only mode before cut-over… and then switch it to read-write mode"冲刷问题。
- 工程落地（A，AWS RDS Blue/Green Deployments）：staging 环境改库不影响生产，"promote the staging environment to be the new production database environment, with downtime typically under one minute"。
- 回滚策略补充（A，Fowler Canary Release）：canary 是 ParallelChange 的应用，"the rollback strategy is simply to reroute users back to the old version"。
- 小步迁移/版本控制（A，Fowler EvoDB）："All database changes are migrations"+"Our usual rule is to make each database change as small as possible… it's best to do many small ones"；大表数据迁移工程（A，GitLab）：batched background migrations 用后台任务分批搬数据且"should not change the schema"。
- Refactoring Databases（Ambler & Sadalage 2006）书页（A，Fowler 书页）确认该书主题是"数据库重构+数据本身持续迁移"；书内 "expand/contract" 具体章节措辞未见原文（未核）。

### Q3 事件回放/重建作为迁移验证
- 事件溯源内建能力（A，Fowler Event Sourcing）：Complete Rebuild——"We can discard the application state completely and rebuild it by re-running the events from the event log on an empty application."；Event Replay——"If we find a past event was incorrect, we can compute the consequences by reversing it and later events and then replaying the new event and later events."
- 工程化复述（A，Azure Event Sourcing）："Applications derive the current state of an entity by replaying all the events in its stream. This process is known as rehydration."；并警示 in-place migration"breaks immutability and undermines the audit trail"。
- 处理器级重放（A，Axon Reference）：同一 processor 内 handlers "replayed together"、可"advance and replay multiple projections as a unit"——重放是事件处理器内建操作。
- "把旧 JSONL 重放到新格式并对比审计结果"：属于把重建/重放机制应用于迁移验证——旧 JSONL 是 append-only 事件日志（近似事件溯源），新格式是重建目标；"全量重跑+源-目标逐行比对"有 AWS DMS 先例（A），"双路径并行比对+告警"有 Scientist 先例（A）。但"JSONL 重放+审计结果对比"作为迁移验收的完整方法，未见现成文献原词 → 机制推断标 C。

### Q4 "磁盘上任何时刻都是合法文件"红线：逐行合法 vs 事务提交点
- JSONL 规范（A，jsonlines.org）三要求：UTF-8、"Each Line is a Valid JSON Value"、行终止符 '\n'；且"末行后的行终止符强烈建议但非必需"——意味着崩溃时最后一行可能未写完（半截），但该半截行是唯一"不完整"之处。
- 逐行崩溃安全的工程先例（A，Redis AOF）："The AOF log is an append-only log, so there are no seeks, nor corruption problems if there is a power outage. Even if the log ends with a half-written command… the redis-check-aof tool is able to fix it easily."——即 append-only 日志的崩溃安全=可截断恢复，而非多行原子。
- 事务提交点语义（A，PostgreSQL WAL）："changes to data files… must be written only after those changes have been logged, that is, after WAL records describing the changes have been flushed to permanent storage"——"提交"是 WAL flush 之后才成立。
- 单文件原子更新（A，LWN）："write the updated data to a temporary file, ensure that it is safe on stable storage, then rename the temporary file to the original file name… This ensures an atomic update of the file, so that other readers get one copy of the data or another."
- 结论（推断 C）：目标格式若仍"逐行 append 完整 JSON 值"且读取器容忍末行半截（截断到最后一个完整 '\n'），则任意时刻磁盘上的文件"除正在写的最后一行外全部合法"，近似保留红线；若目标格式引入跨行事务/提交记录/索引段，事务中段状态会出现在磁盘上，必须自带 WAL/提交标记+恢复协议。红线原文（A，本地 docs，经 B8 母发现引用）："数据格式 append-only JSONL：崩溃安全：磁盘上任何时刻都是合法文件；实测两次中断事故都靠这个止损"。

### Q5 迁移验收标准设计（哈希/计数/锚点/全量重跑/抽样人审）
- 全量行比对先例（A，AWS DMS data validation）："AWS DMS provides support for data validation to ensure that your data was migrated accurately from the source to the target… During data validation, AWS DMS compares each row in the source with its corresponding row at the target, verifies the rows contain the same data, and reports any mismatches."
- 影子比对告警先例（A，Stripe/Scientist）：读路径切换前双读比对、不一致即告警。
- 离线全量重跑先例（A，Stripe）：backfill 完成后"run the Scalding job once again to make sure there are no existing subscriptions missing from the Subscriptions table"——即全量重跑确认无遗漏。
- "哈希/计数/锚点 + 抽样人审"四件套：作为一套完整验收标准未找到单一权威先例（未核）；其组件（全量行比对、双跑差异告警、离线重跑确认）均有上述 A 级先例；把组件组合成"哈希+计数+锚点+抽样人审"的验收方案属于设计推断（C）。

## 2 关键发现
K1. **双写的定义与风险：命令需要原子地更新数据库并发送消息，否则产生不一致与 bug；跨库/跨代理无共享事务**
- URL: http://microservices.io/patterns/data/transactional-outbox.html | 标题: Transactional Outbox | 机构: microservices.io（Chris Richardson）| 日期: © 2026（访问 2026-08-12）
- 摘录: "The command must atomically update the database and send messages in order to avoid data inconsistencies and bugs." / "However, it is not viable to use a traditional distributed transaction (2PC) that spans the database and the message broker" / "But without using 2PC, sending a message in the middle of a transaction is not reliable. There's no guarantee that the transaction will commit." / "Similarly, if a service sends a message after committing the transaction there's no guarantee that it won't crash before sending the message."
- 等级: A

K2. **Outbox 解法：先把消息随业务写进数据库（同事务），后台进程再发布**
- URL: http://microservices.io/patterns/data/transactional-outbox.html | 标题: Transactional Outbox | 机构: microservices.io（Chris Richardson）| 日期: © 2026（访问 2026-08-12）
- 摘录: "The solution is for the service that sends the message to first store the message in the database as part of the transaction that updates the business entities. A separate process then sends the messages to the message broker." / "Messages are guaranteed to be sent if and only if the database transaction commits"（另注：message relay 可能重复发布，消费者须幂等）
- 等级: A

K3. **AWS 对 dual-write 问题的官方定义：写两个系统，一方失败即不一致；outbox 解决之**
- URL: https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html | 标题: Transactional outbox pattern - AWS Prescriptive Guidance | 机构: Amazon Web Services | 日期: 访问 2026-08-12（无出版日期）
- 摘录: "The transactional outbox pattern resolves the dual write operations issue that occurs in distributed systems when a single operation involves both a database write operation and a message or event notification. A dual write operation occurs when an application writes to two different systems; for example, when a microservice needs to persist data in the database and send a message to notify other systems. A failure in one of these operations might result in inconsistent data."
- 等级: A

K4. **Confluent：outbox 的优点是避免双写问题，状态与 outbox 表总是事务性同更新**
- URL: https://developer.confluent.io/courses/microservices/the-transactional-outbox-pattern/ | 标题: The Transactional Outbox Pattern（Designing Event-Driven Microservices 课程）| 机构: Confluent（作者 Wade Waldron）| 日期: 访问 2026-08-12（无出版日期）
- 摘录: "The advantage of the transactional outbox pattern is it avoids the dual-write problem." / "The state, and the outbox table, will always be updated in a transactional fashion." / "If for some reason, the state fails to update, then the event won't be written to the outbox."
- 等级: A

K5. **Debezium：数据库与 Kafka 无共享（XA）事务，双写会不一致；outbox 表同事务写入 + CDC 发布**
- URL: https://debezium.io/blog/2019/02/19/reliable-microservices-data-exchange-with-the-outbox-pattern/ | 标题: Reliable Microservices Data Exchange With the Outbox Pattern | 机构: Debezium（Red Hat）| 日期: 2019-02-19（页内另有 2019-09-13 更新说明）
- 摘录: "The reason being that we cannot have one shared transaction that would span the service's database as well as Apache Kafka, as the latter doesn't support to be enlisted in distributed (XA) transactions." / "The idea of this approach is to have an 'outbox' table in the service's database. When receiving a request…, as part of the same transaction, also a record representing the event to be sent is inserted into that outbox table."
- 等级: A

K6. **SAGA：本地事务序列 + 补偿事务，维持跨服务一致但不自动回滚**
- URL: http://microservices.io/patterns/data/saga.html | 标题: Saga | 机构: microservices.io（Chris Richardson）| 日期: © 2026（访问 2026-08-12）
- 摘录: "A saga is a sequence of local transactions. Each local transaction updates the database and publishes a message or event to trigger the next local transaction in the saga. If a local transaction fails because it violates a business rule then the saga executes a series of compensating transactions that undo the changes that were made by the preceding local transactions." / 缺点: "Lack of automatic rollback - a developer must design compensating transactions that explicitly undo changes… rather than relying on the automatic rollback feature of ACID transactions"
- 等级: A

K7. **Two Generals：不可靠通道上两方原子协调被证明不可解（双写原子性的理论界限）**
- URL: https://en.wikipedia.org/wiki/Two_Generals%27_Problem | 标题: Two Generals' Problem | 机构: Wikipedia | 日期: 访问 2026-08-12
- 摘录: "The Two Generals' Problem was the first computer communication problem to be proven to be unsolvable." / "An important consequence of this proof is that generalizations such as the Byzantine Generals problem are also unsolvable in the face of arbitrary communication failures, thus providing a base of realistic expectations for any distributed consistency protocols."
- 等级: B（百科/二手；结论常被分布式系统文献引用，未核原始证明论文）

K8. **Stripe 4 步双写模式：双写同步 → 切读 → 切写 → 删旧，用于大表在线迁移**
- URL: https://stripe.com/blog/online-migrations | 标题: Online migrations at scale | 机构: Stripe Engineering | 日期: 2017-02-02（JSON-LD datePublished）
- 摘录: "There's a common 4 step dual writing pattern that people often use to do large online migrations like this. Here's how it works: Dual writing to the existing and new tables to keep them in sync. Changing all read paths in our codebase to read from the new table. Changing all write paths in our codebase to only write to the new table. Removing old data that relies on the outdated data model."
- 等级: A

K9. **影子读：Stripe 用 GitHub Scientist 双读新旧表，结果不一致立即告警**
- URL: https://stripe.com/blog/online-migrations | 标题: Online migrations at scale | 机构: Stripe Engineering | 日期: 2017-02-02
- 摘录: "We'll use GitHub's Scientist to help us verify our read paths. Scientist is a Ruby library that allows you to run experiments and compare the results of two different code paths, alerting you if two expressions ever yield different results in production." / "Use Scientist to read from both the Subscriptions table and the Customers table. If the results don't match, raise an error alerting our engineers to the inconsistency."
- 等级: A

K10. **Scientist 机制：use=control（旧行为）、try=candidate（新行为），比对结果并发布**
- URL: https://github.com/github/scientist | 标题: Scientist! A Ruby library for carefully refactoring critical paths | 机构: GitHub | 日期: README（访问 2026-08-12）
- 摘录: "Wrap a `use` block around the code's original behavior, and wrap `try` around the new behavior." / "The `use` block is called the **control**. The `try` block is called the **candidate**." / "Compares the result of `try` to the result of `use`" / "Swallow and record exceptions raised in the `try` block when overriding `raised`" / "Publishes all this information."
- 等级: A

K11. **expand-migrate-contract：Parallel Change 把不兼容变更拆成 expand / migrate / contract 三阶段**
- URL: https://martinfowler.com/bliki/ParallelChange.html | 标题: Parallel Change | 机构: martinfowler.com（作者 Danilo Sato）| 日期: 2014-05-13
- 摘录: "Parallel change, also known as expand and contract, is a pattern to implement backward-incompatible changes to an interface in a safe manner, by breaking the change into three distinct phases: expand, migrate, and contract." / "In the expand phase you augment the interface to support both the old and the new versions." / "During the migrate phase you update all clients using the old version to the new version. This can be done incrementally." / "Once all usages have been migrated to the new version, you perform the contract phase to remove the old version."
- 等级: A

K12. **数据库版 expand-contract：不中断运行地迁移数据结构，迁移期客户端双写，多数步骤可回滚**
- URL: https://www.prisma.io/dataguide/types/relational/expand-and-contract-pattern | 标题: Using the expand and contract pattern | 机构: Prisma（Data Guide）| 日期: 访问 2026-08-12（无出版日期）
- 摘录: "The expand and contract pattern is a process that database administrators and software developers can use to transition data from an old data structure to a new data structure without affecting uptime." / "it is also helpful in that it allows you to rollback changes easily at most points in the process if something doesn't go as planned" / Step 2: "when performing write operations, the client will now add or modify data in both the original structure and in the new structure."
- 等级: A

K13. **蓝绿部署：双生产环境 + 路由器切换 + 快速回滚；可双环境喂事务或用只读窗口冲刷**
- URL: https://martinfowler.com/bliki/BlueGreenDeployment.html | 标题: Blue Green Deployment | 机构: martinfowler.com（Martin Fowler）| 日期: 2010-03-01
- 摘录: "ensure you have two production environments, as identical as possible… Once the software is working in the green environment, you switch the router so that all incoming requests go to the green environment - the blue one is now idle." / "Blue-green deployment also gives you a rapid way to rollback - if anything goes wrong you switch the router back to your blue environment." / "you may be able to feed transactions to both environments in such a way as to keep the blue environment as a backup when the green is live. Or you may be able to put the application in read-only mode before cut-over… and then switch it to read-write mode."
- 等级: A

K14. **AWS RDS Blue/Green：staging 环境改库不影响生产，切换通常停机 <1 分钟**
- URL: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/blue-green-deployments.html | 标题: Using Amazon RDS Blue/Green Deployments for database updates | 机构: Amazon Web Services | 日期: 访问 2026-08-12（无出版日期）
- 摘录: "By using Amazon RDS Blue/Green Deployments, you can make changes to the database in the staging environment without affecting the production environment… When you're ready, you can promote the staging environment to be the new production database environment, with downtime typically under one minute."
- 等级: A

K15. **Canary 回滚策略：发现问题就把用户重新路由回旧版本；canary 是 ParallelChange 的应用**
- URL: https://martinfowler.com/bliki/CanaryRelease.html | 标题: Canary Release | 机构: martinfowler.com（作者 Danilo Sato）| 日期: 2014-06-25
- 摘录: "Canary release is an application of ParallelChange, where the migrate phase lasts until all the users have been routed to the new version. At that point, you can decomission the old infrastructure. If you find any problems with the new version, the rollback strategy is simply to reroute users back to the old version until you have fixed the problem."
- 等级: A

K16. **演化式数据库：所有数据库变更都是迁移，变更越小越易正确，最好多而小**
- URL: https://martinfowler.com/articles/evodb.html | 标题: Evolution of Database | 机构: martinfowler.com（Pramod Sadalage & Martin Fowler）| 日期: 2016-05（更新版）
- 摘录: "All database changes are migrations"（实践清单）/"Our usual rule is to make each database change as small as possible. The smaller it is, the easier it is to get right, and any errors are quick to spot and debug. Migrations like this compose easily, so it's best to do many small ones."
- 等级: A

K17. **GitLab 大数据迁移：batched background migrations 用后台任务分批搬数据，不改 schema**
- URL: https://docs.gitlab.com/development/migration_style_guide/ | 标题: Migrations style guide | 机构: GitLab | 日期: 持续更新（访问 2026-08-12）
- 摘录: "Batched background migrations. These aren't regular Rails migrations, but application code that is executed via Sidekiq jobs, although a post-deployment migration is used to schedule them. Use them only for data migrations that exceed the timing guidelines for post-deploy migrations. Batched background migrations should not change the schema."
- 等级: A

K18. **Refactoring Databases（2006 书）：数据库重构不仅改程序与数据结构，还必须持续迁移数据本身**
- URL: https://martinfowler.com/books/refactoringDatabases.html | 标题: Refactoring Databases (Evolutionary Database Design) | 机构: martinfowler.com（Martin Fowler 为 Scott J Ambler & Pramod J. Sadalage 书作序）| 日期: 2006
- 摘录: "not just do you have to change program and data structures, you also have to manage continual migration of the data itself. This book tells you how to do that, backed by the project experience (and scars) that these two have accumulated."
- 等级: A（书页原文到手；书内 "expand/contract" 章节措辞未核）

K19. **事件溯源：Complete Rebuild 可丢弃应用状态重放事件重建；Event Replay 可逆转旧事件并重放**
- URL: https://martinfowler.com/eaaDev/EventSourcing.html | 标题: Event Sourcing | 机构: martinfowler.com（Martin Fowler）| 日期: 2005-12-12
- 摘录: "The fundamental idea of Event Sourcing is that of ensuring every change to the state of an application is captured in an event object, and that these event objects are themselves stored in the sequence they were applied…" / "Complete Rebuild: We can discard the application state completely and rebuild it by re-running the events from the event log on an empty application." / "Event Replay: If we find a past event was incorrect, we can compute the consequences by reversing it and later events and then replaying the new event and later events."
- 等级: A

K20. **Azure 事件溯源：replay 事件得到当前状态（rehydration）；就地改写历史事件破坏不可变性与审计线索**
- URL: https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing | 标题: Event Sourcing pattern | 机构: Microsoft（Azure Architecture Center）| 日期: ms.date 2026-03-27
- 摘录: "Applications derive the current state of an entity by replaying all the events in its stream. This process is known as rehydration." / "In-place migration: Rewrite historical events to the new schema directly in the event store. This approach breaks immutability and should be a last resort because it undermines the audit trail."
- 等级: A

K21. **Axon：事件重放是事件处理器的内建能力，同一处理器内的 handlers 一起重放**
- URL: https://docs.axoniq.io/axon-framework-reference/5.1/events/event-processors/ | 标题: Event Processors | 机构: AxonIQ | 日期: 5.1 版（© 2025，访问 2026-08-12）
- 摘录: "event handlers across all event handling components assigned to the same processor are sequenced together, replayed together and share the same thread pool and dead letter queue." / "A good rule of thumb usually is: If you want to advance and replay multiple projections as a unit or isolate failures across them, assign them to the same processor."
- 等级: A

K22. **JSON Lines 三要求：UTF-8、每行是合法 JSON 值、行终止符 '\n'；末行换行强烈建议但非必需**
- URL: https://jsonlines.org/ | 标题: JSON Lines | 机构: JSON Lines 项目页（维护者 Ian Ward）| 日期: 页脚生成 2025-12-02（访问 2026-08-12）
- 摘录: "The JSON Lines format has three requirements: 1. UTF-8 Encoding… 2. Each Line is a Valid JSON Value… 3. Line Terminator is '\n'" / "Including a line terminator after the last JSON value in a file is strongly recommended but not required."
- 等级: A

K23. **Redis AOF：append-only 日志断电无损坏问题，末尾半条命令可被工具修复**
- URL: https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/ | 标题: Redis persistence | 机构: Redis | 日期: dateModified 2026-07-30
- 摘录: "The AOF log is an append-only log, so there are no seeks, nor corruption problems if there is a power outage. Even if the log ends with a half-written command for some reason (disk full or other reasons) the redis-check-aof tool is able to fix it easily."（fsync 策略：默认每秒一次，最多丢 1 秒写）
- 等级: A

K24. **PostgreSQL WAL：数据文件的变更必须先写日志并 flush 到永久存储，提交点由此定义**
- URL: https://www.postgresql.org/docs/current/wal-intro.html | 标题: Write-Ahead Logging (WAL) | 机构: PostgreSQL Global Development Group | 日期: 页面元数据 2026-05-14（访问 2026-08-12）
- 摘录: "WAL's central concept is that changes to data files (where tables and indexes reside) must be written only after those changes have been logged, that is, after WAL records describing the changes have been flushed to permanent storage."
- 等级: A

K25. **LWN：临时文件 + fsync + rename 实现单文件原子更新**
- URL: https://lwn.net/Articles/457667/ | 标题: Ensuring data reaches disk | 机构: Linux Weekly News（作者 Jeff Moyer）| 日期: 2011-09-07
- 摘录: "it is common practice (and advisable) to write the updated data to a temporary file, ensure that it is safe on stable storage, then rename the temporary file to the original file name (thus replacing the contents). This ensures an atomic update of the file, so that other readers get one copy of the data or another."
- 等级: A

K26. **AWS DMS 数据校验：源-目标逐行比对、验证内容一致并报告不匹配**
- URL: https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Validating.html | 标题: AWS DMS data validation | 机构: Amazon Web Services | 日期: 访问 2026-08-12（无出版日期）
- 摘录: "AWS DMS provides support for data validation to ensure that your data was migrated accurately from the source to the target." / "During data validation, AWS DMS compares each row in the source with its corresponding row at the target, verifies the rows contain the same data, and reports any mismatches."
- 等级: A

K27. **本项目红线原文：append-only JSONL 崩溃安全——磁盘上任何时刻都是合法文件，实测两次中断事故靠此止损**
- URL: 本地文档 docs/图工程调研/M08实验-Apostol微积分卷1（经 research_tree/findings/B8_校验迁移_发现.md 引用）| 标题: 本地技术选型文档（append-only JSONL 决策）| 机构: 本项目工程文档 | 日期: 2026-08 项目期
- 摘录: "数据格式 append-only JSONL：崩溃安全：磁盘上任何时刻都是合法文件；实测两次中断事故都靠这个止损"
- 等级: A（本地原文到手）

K28. **Strangler Fig：渐进式替换旧系统（现代化迁移的"小步慢走"策略）**
- URL: https://martinfowler.com/bliki/StranglerFigApplication.html | 标题: Strangler Fig Application | 机构: martinfowler.com（Martin Fowler）| 日期: 2024-08-22（更新版；原帖 2004）
- 摘录: "The alternative that my colleagues and I prefer, is to do a gradual process of modernization. Like the fig, it begins with small additions…"（全文描述渐进替换旧系统而非一次性重写）
- 等级: A

## 3 冲突与张力
- **"最终一致" vs "任意时刻合法文件"**：outbox/CDC/SAGA 提供的都是异步最终一致（Debezium、Confluent、AWS PG 原文均明示）；而本项目红线"磁盘上任何时刻都是合法文件"是即时属性。迁移窗口内新旧两存储/两文件必然短暂不一致——需要定义"以谁为真"（母发现 B8 未决 3 同源）。
- **逐行合法 ≠ 事务提交点**：JSONL 的崩溃安全是"每条独立可解析+末行可截断恢复"（K22、K23），PostgreSQL 的提交语义是"WAL flush 之后"（K24），单文件原子更新是"临时文件+fsync+rename"（K25）。三者"安全"含义不同：若目标格式声称保留"逐行合法"红线，就不能同时承诺"多行跨记录事务原子提交"而不带恢复机制。
- **双写原子性：工程缓解 vs 理论不可解**：Two Generals 证明不可靠通道上两方原子协调不可解（K7），outbox/SAGA 只是把窗口从"两写之间"移到"outbox 发布与消费之间"（K2/K6），并未消除最终一致窗口——这是工程模式与理论边界的张力，引用时必须区分。
- **事件不可变 vs 迁移改写**：Azure 明示 in-place migration"breaks immutability and undermines the audit trail"（K20）；而"重放旧 JSONL 到新格式"是重建式迁移（不动旧文件、产出新文件），更接近 upcast/rebuild；若直接原地改写旧 JSONL 则破坏 append-only 红线——两者是不同路线。
- **蓝绿零停机 vs 双写负担**：Fowler 蓝绿要求"双环境喂事务"或"只读窗口冲刷"（K13），前者需要应用层双写能力、后者需要可接受的只读窗口；AWS RDS 把切换停机压到 1 分钟内但需数据库侧复制支撑（K14）——"零停机"在不同实现里定义不同。
- **expand-contract 的措辞归属**：Fowler 明言 Parallel Change = expand and contract（K11），Prisma 数据库版沿用（K12）；Refactoring Databases 书内该模式的确切措辞未见原文（未核）——引用时不要把它当作该书原词。

## 4 未决
- U1：目标格式是否仍为"每行独立合法 JSON 值"——若引入跨行引用/事务提交记录/索引段，"任意时刻合法文件"红线需重新论证（推断 C，待 B8 主分支与格式设计定）。
- U2："哈希+计数+锚点+抽样人审"四件套验收标准无单一权威先例（未核）；组件先例存在（AWS DMS 逐行比对 K26、Scientist 影子告警 K10、Stripe 离线重跑确认 K8），组合为完整验收方案属设计推断 C。
- U3：Refactoring Databases（Ambler & Sadalage 2006）书内 "expand/contract" 的确切章节与措辞未核（仅有 Fowler 书页与第三方复述）。
- U4：双写迁移期间"以谁为真"（旧 JSONL vs 新格式）与读写路径切换顺序（先切读再切写 vs 反向）在本项目未定（母发现 B8 未决 3 同源）。
- U5：影子读/影子实验在离线批量文件迁移场景的落地方式（Scientist 是线上请求级比对；对批量重放需自行设计比对器并定义差异阈值）——无直接先例，推断 C。
- U6：JSON Lines 尚无正式 RFC/标准 MIME（jsonlines.org 原文："MIME type may be application/jsonl, but this is not yet standardized"）——若目标格式基于 JSONL，标准化状态未决。

## 5 来源清单
### 博客 / 工程文章 / 模式库（12）
1. http://microservices.io/patterns/data/transactional-outbox.html — Transactional Outbox — Chris Richardson / microservices.io — A
2. http://microservices.io/patterns/data/saga.html — Saga — Chris Richardson / microservices.io — A
3. https://martinfowler.com/bliki/ParallelChange.html — Parallel Change — Danilo Sato / martinfowler.com — A（2014-05-13）
4. https://martinfowler.com/bliki/BlueGreenDeployment.html — Blue Green Deployment — Martin Fowler — A（2010-03-01）
5. https://martinfowler.com/bliki/CanaryRelease.html — Canary Release — Danilo Sato / martinfowler.com — A（2014-06-25）
6. https://martinfowler.com/bliki/StranglerFigApplication.html — Strangler Fig Application — Martin Fowler — A（2024-08-22 更新）
7. https://martinfowler.com/eaaDev/EventSourcing.html — Event Sourcing — Martin Fowler — A（2005-12-12）
8. https://martinfowler.com/articles/evodb.html — Evolution of Database — Sadalage & Fowler — A（2016-05）
9. https://stripe.com/blog/online-migrations — Online migrations at scale — Stripe Engineering — A（2017-02-02）
10. https://debezium.io/blog/2019/02/19/reliable-microservices-data-exchange-with-the-outbox-pattern/ — Reliable Microservices Data Exchange With the Outbox Pattern — Debezium — A（2019-02-19）
11. https://developer.confluent.io/courses/microservices/the-transactional-outbox-pattern/ — The Transactional Outbox Pattern — Confluent（Wade Waldron）— A
12. https://lwn.net/Articles/457667/ — Ensuring data reaches disk — LWN（Jeff Moyer）— A（2011-09-07）

### 官方文档 / 工程指南（9）
13. https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/ — Redis persistence（AOF）— Redis — A（2026-07-30）
14. https://www.postgresql.org/docs/current/wal-intro.html — Write-Ahead Logging (WAL) — PostgreSQL — A（2026-05-14 页面元数据）
15. https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Validating.html — AWS DMS data validation — AWS — A
16. https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/blue-green-deployments.html — Using Amazon RDS Blue/Green Deployments — AWS — A
17. https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html — Transactional outbox pattern — AWS Prescriptive Guidance — A
18. https://www.prisma.io/dataguide/types/relational/expand-and-contract-pattern — Using the expand and contract pattern — Prisma Data Guide — A
19. https://docs.gitlab.com/development/migration_style_guide/ — Migrations style guide — GitLab — A
20. https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing — Event Sourcing pattern — Microsoft Azure Architecture Center — A（2026-03-27）
21. https://docs.axoniq.io/axon-framework-reference/5.1/events/event-processors/ — Event Processors — AxonIQ — A（5.1，© 2025）

### 规范（1）
22. https://jsonlines.org/ — JSON Lines — JSON Lines 项目页 — A（页脚 2025-12-02）

### 书 / 书页（1）
23. https://martinfowler.com/books/refactoringDatabases.html — Refactoring Databases (Evolutionary Database Design) — Martin Fowler 书页（Ambler & Sadalage 2006 书）— A（书内 expand/contract 原文未核）

### 百科（1）
24. https://en.wikipedia.org/wiki/Two_Generals%27_Problem — Two Generals' Problem — Wikipedia — B（二手）

### 本地工程文档（1）
25. 本地 docs/图工程调研/M08实验-Apostol微积分卷1（经 B8_校验迁移_发现.md 引用）— append-only JSONL 崩溃安全红线 — 本项目 — A

### 代码仓库 README（1）
26. https://github.com/github/scientist — Scientist! A Ruby library for carefully refactoring critical paths — GitHub — A

统计：可核来源 26（≥15 ✓）；原文到手 26 份（其中 A 级 25、B 级 1；≥10 ✓）；来源类型 6 类：博客/工程文章/模式库、官方文档/工程指南、规范、书/书页、百科、本地工程文档、代码仓库 README（≥3 ✓）。

### 候选逐一查证清单（≥5 ✓）
1. microservices.io outbox 模式 → 已查证（A，K1/K2）
2. Refactoring Databases 的 expand/contract → 部分查证：Fowler 书页到手（A，K18）；书内原文未核（U3）
3. 蓝绿部署文献（Fowler + AWS RDS）→ 已查证（A，K13/K14）
4. 事件溯源重放文献（Fowler Event Sourcing）→ 已查证（A，K19）
5. 工程博客（Stripe / Debezium / Confluent）→ 已查证（A，K8/K9/K5/K4）
6. 影子读/实验（GitHub Scientist）→ 已查证（A，K10）

### 关键词组（≥4 ✓）
1. 中文：双写 影子读 迁移 模式
2. 中文：expand migrate contract 数据库 迁移
3. 中文：事件 重放 重建 验证
4. 中文：蓝绿 部署 回滚
5. 英文：dual write shadow read migration pattern
6. 英文：expand contract database migration pattern
7. 英文：event replay rebuild verification
8. 英文：blue-green deployment rollback strategy
（搜索引擎 Google/Bing/DDG/Mojeek/Brave 均被反爬拦截，改为直接导航权威原文 + 在原文中做关键词命中核验；与 B8a 分支做法一致。）

## 6 判死自查
- 无来源论断：否。关键发现（K1-K28）每条均含 URL+标题+机构+日期+原文摘录+等级；逐条回答中的论断均指向对应 K 或本地红线。
- 二手当原文：否。除 Two Generals（B，Wikipedia 百科）外均直接抓取权威原文（A）；凡未直接到手的（Refactoring Databases 书内 expand/contract 措辞、DMS 之外的哈希/计数/锚点先例）已标"未核"。
- 越界：否。未做工具/厂商选型对比、未做性能评测；映射机制（B8b）、校验语言（B5）未涉足。
- 捏造来源：否。所有 URL 均为实际抓取的页面；不可用的抓取（zendesk、agiledata、industriallogic、ndjson.org 域名被劫持、axon 5.1 重定向页）未纳入来源清单。
- 推断标 C：是。"JSONL 重放+审计对比"机制（Q3）、目标格式红线可继承性边界（Q4）、哈希/计数/锚点+抽样人审验收方案（Q5）均标 C；Two Generals 结论对双写的应用（Q1）标 B/C。
- 未核已标：是。U1-U6 及正文中 4 处"未核"均显式标注。
- 证据等级规范：是。A=原文到手（25 份）、B=二手（1 份）、C=推断（3 处，已显式标注）。
