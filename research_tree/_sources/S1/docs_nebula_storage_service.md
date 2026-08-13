# 快照：NebulaGraph Storage Service（存储架构核心证据）
- URL: https://docs.nebula-graph.io/3.8.0/1.introduction/3.nebula-graph-architecture/4.storage-service/
- 机构：NebulaGraph 官方文档
- 抓取日期：2026-08-13
- 工具：WebFetch 正文提取
- 证据等级：A（原文到手）

## 提取正文（关键句逐字）
- "NebulaGraph develops its own KVStore with RocksDB as the local storage engine."
- KVStore 提供 "operations like `get`, `put`, and `scan` on local disks"
- "For multiple local hard disks, NebulaGraph can make full use of its concurrent capacities through deploying multiple data directories."
- "Each partition owns its WAL"
- "One NebulaGraph KVStore cluster supports multiple graph spaces, and each graph space has its own partition number and replica copies."
- "Different graph spaces are isolated physically from each other in the same cluster."
- 分片策略："NebulaGraph uses a **static Hash** strategy to shard data through a modulo operation on vertex ID." 公式：`pId = vid % numParts + 1;`
- "All the out-keys, in-keys, and tag data will be placed in the same partition."
- "The number of partitions needs to be determined when users are creating a graph space since it cannot be changed afterward."
- "we cannot assume that any two partitions are located on the same machine."
- 副本："the number of replicas needs to be determined when creating a space, since it cannot be changed afterward."
- "Raft is based on a quorum vote, so the number of replicas cannot be even."（典型 1 副本测试 / 3 副本生产）
- 写路径三层：Storage Interface / Consensus Layer（Multi Group Raft，"the Leader will initiate a Raft-wal and synchronize it with the Followers"）/ Store Engine（写入本地 RocksDB）
- 读路径："For every reading request of the clients, it will get to the Leader directly, while Followers will not be involved."
- 顶点存储为 KV：v3.x 增加无 TagID 新 key；顶点 key 含 Type/PartID/VertexID/TagID 字段，值为 "SerializedValue"（序列化属性）
- 边："an edge corresponds to two key-value pairs on the hard disk"（out-edge + in-edge 各一份）
- 边 key 含 Type/PartID/VertexID/Edge Type/Rank/VertexID/PlaceHolder；"Greater than zero indicates out-edge, less than zero means in-edge"
- 存储放大："NebulaGraph redundantly stores the information of each edge, which doubles the actual capacities needed for edge storage."
- 属性编码："NebulaGraph will store the properties of vertex and edges in order after encoding them."；"NebulaGraph will add the corresponding schema version to support online schema change."
- Raft："Each Raft group stores all the replicas of each partition."
- 磁盘 IO 警告："If the hard disk IO is severely blocked, there will be no Leader for a long time."；"If hard disk bottlenecks to write, Raft will fail to send a heartbeat and conduct a new round of elections."

## 备注
本页是"二进制存储、静态哈希分片、固定分区数/副本数、边双写放大"等论断的 A 级依据。
