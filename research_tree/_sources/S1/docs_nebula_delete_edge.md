# 快照：DELETE EDGE 语句
- URL: https://docs.nebula-graph.io/3.8.0/3.ngql-guide/13.edge-statements/4.delete-edge/
- 机构：NebulaGraph 官方文档
- 抓取日期：2026-08-13
- 工具：WebFetch 正文提取
- 证据等级：A（原文到手）

## 提取正文（关键句逐字）
- 语法：`DELETE EDGE <edge_type> <src_vid> -> <dst_vid>[@<rank>] [...]`
- "deletes one edge or multiple edges at a time."
- "If no rank is specified, NebulaGraph only deletes the edge with rank 0."
- "to delete all the outgoing edges for a vertex, please delete the vertex"
- 示例：`DELETE EDGE serve "player100" -> "team204"@0;`
- 物理 vs 软删除：本页未说明为物理或逻辑删除；无 tombstone/TTL 与删除交互的表述。

## 备注
删除针对具体边实例（按 src/dst/rank）；文档无软删除表述。
