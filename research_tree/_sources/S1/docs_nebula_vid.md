# 快照：VID（顶点 ID）
- URL: https://docs.nebula-graph.io/3.8.0/1.introduction/3.vid/
- 机构：NebulaGraph 官方文档
- 抓取日期：2026-08-13
- 工具：WebFetch 正文提取
- 证据等级：A（原文到手）

## 提取正文（关键句逐字）
- "VIDs can be generated via applications."（用户自行生成 VID）
- "the VID generation method must be set by users, because NebulaGraph does not provide auto increasing ID, or UUID."
- 建议方式："(Optimal) Directly take a unique primary key or property as a VID."；属性组合生成；雪花算法；长键 "Generate VIDs via BASE64, MD5, hash by encoding and splicing."
- 哈希碰撞："If you generate int64 VID via hash, the probability of collision is about 1/10 when there are 1 billion vertices."
- "The data types of VIDs are restricted to `FIXED_STRING(<N>)` or `INT64`."
- "One graph space can only select one VID type."
- "The data type of a VID must be defined when you create the graph space. Once defined, it cannot be modified."
- "A VID is set when you insert a vertex and cannot be modified."
- "Direct access to VIDs enjoys peak performance."

## 备注
VID 无自增/UUID 内建，须应用层生成；与 RDF 的 IRI 语义不同（VID 只是 int64/fixed_string 标识）。
