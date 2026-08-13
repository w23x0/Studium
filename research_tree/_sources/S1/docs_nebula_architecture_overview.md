# 快照：NebulaGraph Architecture Overview
- URL: https://docs.nebula-graph.io/3.8.0/1.introduction/3.nebula-graph-architecture/1.architecture-overview/
- 机构：NebulaGraph 官方文档
- 抓取日期：2026-08-13
- 工具：WebFetch 正文提取
- 证据等级：A（原文到手）

## 提取正文（关键句逐字）
- "NebulaGraph consists of three services: the Graph Service, the Storage Service, and the Meta Service."
- "It applies the separation of storage and computing architecture."
- "The Meta Service in the NebulaGraph architecture is run by the nebula-metad processes."
- "It is responsible for metadata management, such as schema operations, cluster administration, and user privilege management."
- "nebula-graphd and nebula-storaged"（Graph/Storage 服务独立进程）
- "The Graph Service is responsible for querying. The Storage Service is responsible for storage."
- 四项收益：Scalability / High availability / Cost-effectiveness / Openness
- "Users can deploy a NebulaGraph cluster on a single machine or multiple machines using these binaries."

## 备注
本页不含分片细节；partition/replica/RocksDB 细节在 Storage Service 页。
