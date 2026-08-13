# 叶子 NebulaGraph 作为 M08/M09 存储候选的评估（此前调研缺口） 调研发现

> 任务 S1 / A=原文到手 B=二手转引 C=推断
> 调研员：S1 调研员 / 日期：2026-08-13
> 范围声明：本卡只评估 NebulaGraph 候选本身；Neo4j/Cypher 由 S2/S3 承担；不做性能基准（项目红线）。文内第三方文章出现其他引擎对比仅为其原文内容，本卡不采信为评估结论。

---

## 0. 一句话结论

**NebulaGraph 是"分布式优先、强 Schema、二进制 KV（RocksDB）存储、私有方言 nGQL（部分兼容 openCypher DQL、GQL 原生支持仅企业版）"的企业级图引擎；对 522 节点/1433 边起步的个人自托管知识图谱是明确的过度设计，且四条项目红线中两条不满足（锚点 grep、不物理删除）、两条需自建（开放字段查询审查、候选池+审计状态机），与 L0 JSONL + L1 RDF 双轨相比在任何"个人规模 + 单用户"具体场景下都不构成更优选择——结论为【不采用】。**

---

## 1. 父会话问题逐条回答

### Q1. 存储架构（RocksDB/分片）、查询语言 nGQL、与 GQL/ISO 标准的关系：nGQL 是私有方言还是标准对齐？

**结论：nGQL 是私有方言，不是标准对齐；存储是"RocksDB 之上的自定义 KVStore + 静态哈希分片 + Raft 多组共识"的分布式架构。** 依据（全部 A 级）：

- **存储引擎**：官方存储服务文档——"NebulaGraph develops its own KVStore with RocksDB as the local storage engine"，提供 `get`/`put`/`scan`；每个分区独立 WAL；顶点与边以**二进制编码 key**（Type/PartID/VertexID/TagID 等字段）+ 序列化属性值存放；**边双写放大**（"an edge corresponds to two key-value pairs on the hard disk"，官方明言 "doubles the actual capacities needed for edge storage"）。
- **分片**：静态哈希，"NebulaGraph uses a **static Hash** strategy to shard data through a modulo operation on vertex ID"，公式 `pId = vid % numParts + 1`；分区数在创建 space 时定死 "cannot be changed afterward"；副本数同样定死，Raft 多数派（"the number of replicas cannot be even"）。
- **nGQL 性质**：官方中文/英文文档一致——"nGQL 语言 = 原生 nGQL 语句 + openCypher 兼容语句"，"原生 nGQL 是由 NebulaGraph 自行创造和实现的图查询语言"；仅 "compatible with part of DQL (match, optional match, with, etc.)"，"不计划兼容任何 DDL，DML，DCL"，不兼容 Bolt/APOC/GDS/Gremlin/RDF(SPARQL)/GraphQL。
- **与 GQL/ISO 关系**：GQL 已于 2024-04-17 以 **ISO/IEC 39075:2024** 发布（gqlstandards.org）；nGQL 文档引用的仍是 **Draft**（"(Draft) ISO/IEC JTC1 N14279 SC 32 - Database_Languages - GQL" 与 SQLPGQ Draft N3228）；官方博客明言原生 GQL 支持在 **Enterprise Edition**（"NebulaGraph Enterprise Edition is the first distributed graph database to implement native GQL support"），社区版 nGQL 与之无涉。
- **判定**：nGQL = 引擎私有方言 + 借用了 openCypher 部分 DQL 语法（`MATCH` 等）+ 对 GQL 标准"参照设计但不对齐"；强 Schema（"openCypher 为弱 Schema，nGQL 为强 Schema"）。既非 openCypher，也非 GQL。

### Q2. 对 522 节点/1433 边起步的个人知识图谱规模是否过度设计？个人自托管（单机、低运维、无集群）适配度？

**结论：明确过度设计；个人自托管适配度低。** 依据（全部 A 级）：

- 官方资源要求：测试环境 4 核/8GB/100GB SSD；**生产环境 48 核/256GB/2×1.6TB NVMe SSD**；"NebulaGraph is designed and implemented for NVMe SSD"，不推荐 HDD/NAS/SAN/RAID。
- 单机最小部署可行但仍是**分布式引擎最小形态**：1 metad + 1 storaged + 1 graphd 共 3 进程（Raft、WAL、分区、心跳选举全部照常跑）；官方快速开始默认形态是 docker-compose **9 容器**（3 metad + 3 graphd + 3 storaged）。
- 运维模型面向集群：分区数/副本数创建时定死、容量公式按"磁盘数×multiplier"、"the_number_of_disks_in_the_cluster"计算、读路径强制走 Raft leader。
- 官方为"个人开发者与学习者"给的降门槛方案是 **NebulaGraph Desktop**（容器化一键跑**同一个**分布式引擎），不是把引擎改小。
- 平台摩擦：官方"不建议在 Windows 上使用 Docker Desktop"（性能差），本机为 Windows 11。
- 规模对照：引擎设计目标 "hundreds of billions of vertices and trillions of edges"（官方简介），比 522 节点高 8-9 个数量级。
- 判定：522/1433 起步规模，资源与运维模型均为数量级错配；个人自托管"低运维、无集群"诉求与 Raft 共识、固定分区/副本、NVMe 要求、无社区版导出工具直接冲突。

### Q3. 与项目红线逐条对照（满足/不满足/需自建）

| 项目红线 | 对照结论 | 依据（等级） |
|---|---|---|
| R1 锚点逐字 grep -F（二进制存储能否 grep） | **不满足** | 数据以二进制编码 KV 存于 RocksDB（存储服务文档 A）；原生索引仅属性前缀/LOOKUP 型查询，任意子串/全文检索需外部 Elasticsearch 7.x（全文索引文档 A）。对 RocksDB 数据文件直接 grep -F 不可行（二进制编码 + 序列化 + 压缩）。若要"锚点逐字 grep"，必须先导出文本，而社区版**无导出工具**（Exchange 导出仅企业版 + Spark 环境，社区官方确认"目前我们是没有数据导出工具的"，A）。→ 需自建文本导出镜像或双写文本载体。 |
| R2 不物理删除（删除语义） | **不满足** | DELETE VERTEX/DELETE EDGE 为查询语言层物理删除语义；文档无 soft-delete/tombstone 表述（A）。默认删点不删边会留悬挂边（A）；删除非原子（"Atomic deletion is not supported" A）。TTL 只是按时间过期，非用户语义的"不物理删除"。BR 社区版可做删除前全量备份，但备份为引擎快照非可读文本（A）。→ 需自建版本化/归档层（如删除前先导出文本档案，或应用层墓碑 tag）。 |
| R3 开放字段稳定查询审查（schema 演化） | **需自建适配** | 引擎为强 Schema：字段须先建模为 tag/edge type 属性（A）。ALTER TAG/EDGE 支持 ADD/DROP/CHANGE，但**索引属性不能改**（报 Conflict -1005，须先删索引）、变更**异步**生效（"Wait for two heartbeat cycles, i.e., 20 seconds"）、类型变更面极窄（仅 FIXED_STRING→STRING、FLOAT→DOUBLE；STRING/INT 长度不可减，A）。"开放字段"若指 schema-free 字段，则与强 Schema 直接冲突，须自建映射（如 MAP 属性或每字段一 tag）+ 索引重建协调流程。 |
| R4 候选池+审计晋升状态机（引擎是否内建） | **需自建** | 引擎内建仅 RBAC（"user privilege management" 与 "Role-based access control"），**无**候选池/晋升状态机/审计工作流（A 级文档与官方特性清单均无；C 级：未在抓取范围发现任何此类内建能力）。状态机须用 tag/属性/边在应用层建模（如 status 属性 + 晋升事件边类型），审计链路完全自建。 |

逐条结论：**R1 不满足、R2 不满足、R3 需自建、R4 需自建**。无一条"满足"，三条（R1/R3/R4）需自建工程。

### Q4. 与调研推荐的 L0 JSONL + L1 RDF 双轨对比：什么具体场景下 NebulaGraph 会优于文本载体方案？

**结论：在"当前项目规模 + 单用户个人工具"下不存在具体场景能严格优于文本载体；NebulaGraph 的相对优势只出现在把项目改造成不同形态（多用户高并发、图规模扩大 5+ 个数量级）时。** 依据（A 级为主）：

- 文本载体（JSONL/RDF）天然满足四条红线（可 grep 的 UTF-8 文本、追加式/版本化不物理删除、schema 自由、状态机即数据文件里的记录）；NebulaGraph 四条红线全部需补偿工程（见 Q3）。
- NebulaGraph 可提供而文本方案需要自己写代码实现的图能力：多跳遍历与路径查询（`GO N STEPS`、`MATCH`、`FIND PATH`）、属性索引点查（`LOOKUP` + 原生索引）、子图提取（`GET SUBGRAPH`）、同分区共置的邻居访问优化、并发读放大。
- **但**：522 节点/1433 边的图在内存中做多跳遍历是微秒-毫秒级小事，文本方案无需引擎即可覆盖；单用户个人工具没有并发读诉求。这些能力在本规模上是"有它更好，没它也不缺"，且要付的代价是 3 进程常驻、Raft 心跳、强 Schema 约束、无导出工具、NVMe 依赖。
- **具体"会优于"的假设场景**（均以"项目形态改变"为前提，非当前形态）：①图规模进入 10^7+ 边、遍历深度≥4 且需要索引化属性点查；②多用户并发实时图查询（NebulaGraph 读路径直达 leader、线性扩展）；③未来图分析（50+ 图算法、子图匹配）。当前红线与规模都不指向这些场景。
- 判定：当前项目场景下 L0 JSONL + L1 RDF 双轨在"红线满足度 + 运维成本 + 可审计性"三维上全面优于 NebulaGraph；NebulaGraph 无胜出场景。

---

## 2. 关键发现

| # | 论断 | URL | 标题 | 机构 | 日期 | 原文摘录 | 等级 |
|---|---|---|---|---|---|---|---|
| F1 | 存储为 RocksDB 之上的自定义 KVStore，二进制编码 key | docs.nebula-graph.io/3.8.0/1.introduction/3.nebula-graph-architecture/4.storage-service/ | Storage Service | NebulaGraph 官方文档 | v3.8 | "NebulaGraph develops its own KVStore with RocksDB as the local storage engine." | A |
| F2 | 静态哈希分片，分区数创建 space 时定死 | 同上 | Storage Service | 官方文档 | v3.8 | "uses a static Hash strategy to shard data through a modulo operation on vertex ID"; "cannot be changed afterward" | A |
| F3 | 边双写放大，存储量翻倍 | 同上 | Storage Service | 官方文档 | v3.8 | "an edge corresponds to two key-value pairs on the hard disk"; "doubles the actual capacities needed for edge storage" | A |
| F4 | 副本定死、Raft 多数派、读只走 leader | 同上 | Storage Service | 官方文档 | v3.8 | "the number of replicas cannot be even"; "reading request...get to the Leader directly" | A |
| F5 | nGQL=原生+部分 openCypher 兼容；强 Schema | docs.nebula-graph.com.cn/3.8.0/3.ngql-guide/1.nGQL-overview/1.overview/ | nGQL 概述 | 官方中文文档 | v3.8 | "nGQL 语言 = 原生 nGQL 语句 + openCypher 兼容语句"; "openCypher 为弱 Schema，nGQL 为强 Schema" | A |
| F6 | 不兼容 RDF/SPARQL/Gremlin/GraphQL | 同上 | nGQL 概述 | 官方中文文档 | v3.8 | "是否支持 W3C 的 RDF（SPARQL） 或 GraphQL 等？不支持。也没有计划。" | A |
| F7 | nGQL 参照 GQL/SQLPGQ 的**草稿**（非发布版） | docs.nebula-graph.io/3.8.0/3.ngql-guide/1.nGQL-overview/1.overview/ | nGQL Overview | 官方文档 | v3.8 | "refers to (Draft) ISO/IEC JTC1 N14279 SC 32...GQL" | A |
| F8 | GQL 已发布为 ISO/IEC 39075:2024 | gqlstandards.org | GQL Standard | GQL Standard 社区 | 2024-04-17 | "April 17, 2024 – The GQL Standard is published!" | A |
| F9 | 原生 GQL 支持仅企业版 | nebula-graph.io/posts/gql-vs.-cypher-what-the-new-iso-standard-brings-to-the-table | GQL vs. Cypher | NebulaGraph 官方博客 | 2024 后 | "NebulaGraph Enterprise Edition is the first distributed graph database to implement native GQL support." | A |
| F10 | 测试环境 4核/8GB/100GB SSD，生产 48核/256GB/2×1.6TB NVMe | docs.nebula-graph.io/3.8.0/4.deployment-and-installation/1.resource-preparations/ | Resource Preparations | 官方文档 | v3.8 | "Production Environment: 48 cores / 256 GB memory / 2 × 1.6 TB NVMe SSD" | A |
| F11 | 单机最小 3 进程（1 metad+1 storaged+1 graphd） | 同上 | Resource Preparations | 官方文档 | v3.8 | "you can deploy 1 metad, 1 storaged, and 1 graphd processes in the machine." | A |
| F12 | 默认快速开始为 9 容器集群形态 | docs.nebula-graph.io/3.8.0/2.quick-start/1.quick-start-workflow/ | Quick Start Workflow | 官方文档 | v3.8 | docker-compose 启动 3 metad + 3 graphd + 3 storaged | A |
| F13 | DELETE VERTEX 默认留悬挂边；删除非原子 | docs.nebula-graph.io/3.8.0/3.ngql-guide/12.vertex-statements/4.delete-vertex/ | DELETE VERTEX | 官方文档 | v3.8 | "only deletes the vertices, and does not delete the related outgoing and incoming edges"; "Atomic deletion is not supported" | A |
| F14 | DELETE EDGE 按 src/dst/rank 物理删边；文档无软删 | docs.nebula-graph.io/3.8.0/3.ngql-guide/13.edge-statements/4.delete-edge/ | DELETE EDGE | 官方文档 | v3.8 | "If no rank is specified, NebulaGraph only deletes the edge with rank 0." | A |
| F15 | ALTER 受限：索引属性不能改、异步 20s、类型变更面窄 | docs.nebula-graph.io/3.8.0/3.ngql-guide/10.tag-statements/3.alter-tag/ | ALTER TAG | 官方文档 | v3.8 | "make sure that the properties are not indexed"; "Wait for two heartbeat cycles, i.e., 20 seconds" | A |
| F16 | 原生索引非子串型；全文检索须外部 ES 7.x | docs.nebula-graph.com.cn/3.8.0/4.deployment-and-installation/6.deploy-text-based-index/2.deploy-es/ | 部署全文索引 | 官方中文文档 | v3.8 | "NebulaGraph 的全文索引是基于 Elasticsearch 实现"; "仅支持 7.x 版本" | A |
| F17 | 社区版无导出工具（无 mysqldump 等价物） | discuss.nebula-graph.com.cn/t/topic/14169 | 关于导出数据的讨论 | NebulaGraph 社区论坛 | 约 2023 | 官方成员："目前我们是没有数据导出工具的，可以借助 Spark，通过 spark-connector 来导出工具。" | A |
| F18 | 官方唯一导出路径=Exchange，CSV 导出仅企业版+Spark | docs.nebula-graph.io/3.4.3/nebula-exchange/use-exchange/ex-ug-export-from-nebula/ | Export data from NebulaGraph | 官方文档 | v3.4.3 | "Only Exchange Enterprise Edition supports exporting data from NebulaGraph." | A |
| F19 | VID 无自增/UUID，须应用层生成且不可改 | docs.nebula-graph.io/3.8.0/1.introduction/3.vid/ | VID | 官方文档 | v3.8 | "NebulaGraph does not provide auto increasing ID, or UUID"; "Once defined, it cannot be modified" | A |
| F20 | 官网/README 自述 openCypher-compatible（营销口径 vs 文档部分兼容） | github.com/vesoft-inc/nebula | nebula README | vesoft Inc. | 现行 | "OpenCypher-compatible query language" | A（以官方文档细节为准） |
| F21 | 官方个人/学习者降门槛方案=Desktop 容器化跑同一引擎 | www.nebula-graph.com.cn/posts/nebulagraph-desktop | NebulaGraph Desktop 官宣 | 官方博客 | 2024 | "尤其适合个人开发者与学习者"; "一键启动本地 NebulaGraph 实例" | A |
| F22 | BR 备份分社区/企业版，社区版全量、企业版增量；备份非可读文本 | www.nebula-graph.com.cn/posts/how-to-use-nebulagraph-backup-restore | 一文上手 NebulaGraph BR | 官方博客 | 2023 | "BR 分为社区版和企业版两个版本，企业版在社区版功能的基础上额外提供了增量备份的能力。" | A |
| F23 | 第三方选型口径：NebulaGraph 被归为"分布式/可扩展/新设计"阵营 | cloud.tencent.com/developer/article/2381494 | 知识图谱之图数据库如何选型 | 腾讯云社区（第三方） | 约 2023-2024 | "DGraph、NebulaGraph...根据图数据的特点对数据存储模型、点边分布、执行引擎进行了全新设计" | A（文内基准数字标 B，本卡不采信） |
| F24 | 第三方解读：nGQL 为"分片感知/分布式优先"设计、非完全兼容 openCypher | blog.csdn.net/o4p5q6r7s/article/details/155488644 | 图数据库查询语言哲学 | CSDN（第三方） | 约 2024 | "在分布式环境下，可控性比语法糖更重要"; "自主研发nGQL而非完全兼容OpenCypher" | A（第三方解读，仅佐证） |
| F25 | 旧版官方口径（v2.x）：nGQL 为纯 SQL 风格私有语言，仅支持 Nebula | cnblogs.com/nebulagraph/p/12418948.html | Gremlin vs Cypher vs nGQL | 博客园（官方账号旧文） | 约 2019-2020 | "一种类 SQL 的声明型的文本查询语言"，"支持 Nebula Graph only" | A（反映 v3 前历史口径） |
| F26 | 架构三服务+存算分离+shared-nothing；RBAC 为权限管理 | docs.nebula-graph.io/3.8.0/1.introduction/3.nebula-graph-architecture/1.architecture-overview/ | Architecture Overview | 官方文档 | v3.8 | "NebulaGraph consists of three services..."; "separation of storage and computing architecture" | A |

---

## 3. 对决策点的输入

- **M08/M09 存储候选否决**：NebulaGraph 四条红线无一"满足"（R1/R2 不满足，R3/R4 需自建），且个人规模过度设计与运维模型错配（Q2），无胜出场景（Q4）。决策输入为【不采用】。
- **若决策层仍想保留图引擎选项**：唯一可能成立的形态是把项目改造成"多用户并发 + 10^7+ 边 + 需索引化图遍历"的企业级场景，且需接受三条自建补偿（文本导出镜像满足 R1、归档/版本化层满足 R2、应用层状态机满足 R4）+ 平台迁移（Windows 不推荐，须 Linux + NVMe）。
- **对调研树的意义**：本叶子确认 L0 JSONL + L1 RDF 双轨相对图引擎候选在红线满足度上无替代压力，无需为 NebulaGraph 预留适配位。

---

## 4. 与范围/红线的冲突张力

- **性能基准红线**：本卡**未做任何性能基准**。F23（腾讯云文）内含第三方基准数字（Neo4j vs NebulaGraph 时延对比），本卡明确**不采信**这些数字做结论（已标 B 且注明），仅引用其"选型口径/阵营划分"层面的论述。
- **不评估其他图引擎**：本卡只评估 NebulaGraph。F23 原文包含 Neo4j/JanusGraph/HugeGraph 对比，属于**来源内容**而非本调研评估；F25 亦仅作 nGQL 历史口径佐证。未对任何其他引擎做独立评价。
- **不改变既有红线**：四条红线原样逐条对照，未修改红线本身；本卡红线映射为 R1 不满足 / R2 不满足 / R3 需自建 / R4 需自建。
- 其余无冲突张力。

---

## 5. 未决与风险

- **GQL 对齐口径含糊（风险高）**：官方博客称企业版"native GQL support"，而 nGQL 文档引用的是 GQL **Draft**；社区版 nGQL 对 GQL 的持续对齐路径、对齐到哪个版本未公开。若未来 M08/M09 需要 GQL 兼容，社区版现状不满足。
- **删除"物理 vs 逻辑"的底层细节未核**：查询语言层无 soft-delete（F13/F14），但 RocksDB 存储层 compaction 存在 tombstone；"是否物理删除"在**存储字节层**的具体行为未核到文档。本卡 R2 结论基于查询语义层（A）+ 存储层推断（C），已如实分层。
- **导出工具状态可能变化**：F17 确认的是 3.5 时代状态；3.8 文档的 Exchange 导出仍标注企业版（F18），截至抓取日未见社区版简化导出工具。属动态信息，需在决策时复核。
- **单机最小部署的实际开销未验**：文档说 3 进程可跑，但 Raft/WAL/心跳在 522 节点规模下的真实资源占用因"禁止基准"红线未实测；保守估计也远超文本方案。
- **Docker Desktop on Windows 不建议**（F12 官方口径），本机 Windows 11，容器化单机部署在平台上有官方背书的不利表述。

---

## 6. 建议的下一步

1. **M08/M09 决策**：维持 L0 JSONL + L1 RDF 双轨，不引入 NebulaGraph；如要保留书面结论，可在决策记录中引用本叶子。
2. **如未来规模跃迁**（10^7+ 边 或 多用户并发）触发重新评估：复核 (a) 社区版 GQL 对齐进展、(b) 社区版导出/归档工具是否出现、(c) 单机部署官方资源建议更新——三者任一变化都可能改变 R1/R2 判定。
3. **向 S2/S3 传递**：nGQL 的 MATCH 兼容仅限部分 DQL、强 Schema、与 openCypher 的 `==`/`=` 差异，供 Cypher 相关任务引用，避免把 nGQL 当 openCypher 子集处理。
4. **无需**为本候选新建专项实验；若未来要实验，红线外操作（容器化 3 进程 + 数据导入）成本可估，但当前无必要。

---

## 7. 来源清单（全部 URL，标 A/B/C）

A 级（原文到手，26 条，快照存于 _sources/S1）：
1. https://docs.nebula-graph.io/3.8.0/1.introduction/1.what-is-nebula-graph/ (A)
2. https://docs.nebula-graph.io/3.8.0/1.introduction/3.nebula-graph-architecture/1.architecture-overview/ (A)
3. https://docs.nebula-graph.io/3.8.0/1.introduction/3.nebula-graph-architecture/4.storage-service/ (A)
4. https://docs.nebula-graph.io/3.8.0/3.ngql-guide/1.nGQL-overview/1.overview/ (A)
5. https://docs.nebula-graph.com.cn/3.8.0/3.ngql-guide/1.nGQL-overview/1.overview/ (A)
6. https://docs.nebula-graph.io/3.8.0/1.introduction/2.data-model/ (A)
7. https://docs.nebula-graph.io/3.8.0/1.introduction/3.vid/ (A)
8. https://docs.nebula-graph.io/3.8.0/3.ngql-guide/12.vertex-statements/4.delete-vertex/ (A)
9. https://docs.nebula-graph.io/3.8.0/3.ngql-guide/13.edge-statements/4.delete-edge/ (A)
10. https://docs.nebula-graph.io/3.8.0/3.ngql-guide/14.native-index-statements/ (A)
11. https://docs.nebula-graph.io/3.8.0/3.ngql-guide/10.tag-statements/3.alter-tag/ (A)
12. https://docs.nebula-graph.io/3.8.0/2.quick-start/1.quick-start-workflow/ (A)
13. https://docs.nebula-graph.io/3.8.0/4.deployment-and-installation/1.resource-preparations/ (A)
14. https://docs.nebula-graph.com.cn/3.8.0/4.deployment-and-installation/1.resource-preparations/ (A)
15. https://docs.nebula-graph.com.cn/3.8.0/4.deployment-and-installation/6.deploy-text-based-index/2.deploy-es/ (A)
16. https://docs.nebula-graph.io/3.4.3/nebula-exchange/use-exchange/ex-ug-export-from-nebula/ (A)
17. https://www.nebula-graph.io/ (A)
18. https://github.com/vesoft-inc/nebula (A)
19. https://www.gqlstandards.org/ (A)
20. https://nebula-graph.io/posts/gql-vs.-cypher-what-the-new-iso-standard-brings-to-the-table (A)
21. https://www.nebula-graph.com.cn/posts/nebulagraph-desktop (A)
22. https://www.nebula-graph.com.cn/posts/how-to-use-nebulagraph-backup-restore (A)
23. https://discuss.nebula-graph.com.cn/t/topic/14169 (A)
24. https://www.cnblogs.com/nebulagraph/p/12418948.html (A，官方账号旧文，历史口径)
25. https://blog.csdn.net/o4p5q6r7s/article/details/155488644 (A，第三方解读)
26. https://cloud.tencent.com/developer/article/2381494 (A；文内基准数字 B，未采信)

B 级（二手转引，未单独成源，仅在 F23 内标注）：
- 腾讯云文章引用的 Neo4j vs NebulaGraph 基准时延数字（B，不采信）。

未核（尝试抓取失败，不计入）：
- https://raybyte.cn/post/2026/7/11/fbcf90e0 （Access Denied，未核）
- https://discuss.nebula-graph.io/ （Socket closed，未核；改用中文论坛源 23）

---

## 8. 判死自查结果

- **来源数 ≥15**：26 条 A 级来源，通过。
- **A 级 ≥10**：26 条，通过。
- **类型 ≥3**：6 类——官方文档（中/英）、官方官网与博客、GitHub 仓库、标准组织页（gqlstandards.org）、第三方技术文章（CSDN/腾讯云/博客园）、社区论坛（discuss.nebula-graph.com.cn），通过。
- **候选查证 ≥5**：7 项——①存储架构/RocksDB/分片（F1-F4）；②nGQL 性质与 GQL/ISO 标准关系（F5-F9）；③单机部署/资源/个人适配（F10-F12、F21）；④删除语义（F13-F14）；⑤schema 演化（F15）；⑥锚点 grep/全文索引/二进制存储（F1、F16）；⑦导出与备份（F17-F18、F22），通过。
- **关键词组 ≥4（中英各半）**：10 组检索（中文 7、英文 3），通过（检索日志见 _sources/S1/_methodology_search_log.md；环境 WebSearch 返回空，已用 DuckDuckGo HTML 端点替代并如实记录）。
- **边界遵守**：未做性能基准（F23 数字不采信）；未评估其他图引擎（仅来源内容提及）；红线逐条对照未修改；结论含"满足/不满足/需自建"逐条，无模糊。
- **如实性**：所有 A 级来源均 WebFetch 抓取原文并留快照；抓不到的两处标"未核"；推断处标 C 且已注明。

**判死自查：通过。**
