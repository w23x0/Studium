# 快照：DELETE VERTEX 语句
- URL: https://docs.nebula-graph.io/3.8.0/3.ngql-guide/12.vertex-statements/4.delete-vertex/
- 机构：NebulaGraph 官方文档
- 抓取日期：2026-08-13
- 工具：WebFetch 正文提取
- 证据等级：A（原文到手）

## 提取正文（关键句逐字）
- 语法：`DELETE VERTEX <vid> [, <vid> ...] [WITH EDGE];`
- "NebulaGraph 3.8.0 only deletes the vertices, and does not delete the related outgoing and incoming edges of the vertices."
- "At this time, there will be dangling edges by default."
- "WITH EDGE: deletes vertices and the related incoming and outgoing edges of the vertices."
- "NebulaGraph traverses the incoming and outgoing edges related to the vertices and deletes them all. Then NebulaGraph deletes the vertices."
- "Atomic deletion is not supported during the entire process for now. Please retry when a failure occurs to avoid partial deletion, which will cause pendent edges."
- "Deleting a supernode takes a lot of time."（建议调大 --storage_client_timeout_ms）

## 备注
删除是物理语义（文档无 soft-delete/tombstone 表述）；默认删点留边会形成悬挂边；非原子。
