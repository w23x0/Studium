# 快照：NebulaGraph 数据模型
- URL: https://docs.nebula-graph.io/3.8.0/1.introduction/2.data-model/
- 机构：NebulaGraph 官方文档
- 抓取日期：2026-08-13
- 工具：WebFetch 正文提取
- 证据等级：A（原文到手）

## 提取正文（关键句逐字）
- "Graph spaces are used to isolate data from different teams or programs. Data stored in different graph spaces are securely isolated."
- "Vertices are used to store entities." 顶点以 VID 标识。
- "The `VID` must be unique in the same graph space."
- "VID should be int64, or fixed_string(N)."
- "A vertex has zero to multiple tags."
- "In NebulaGraph 3.8.0, a tag is not required for a vertex."
- 边："An edge is identified uniquely with `<a source vertex, an edge type, a rank value, and a destination vertex>`. Edges have no EID."
- "The rank value is an immutable user-assigned 64-bit signed integer." 同类型同两端多条边靠 rank 区分；"The default rank value is zero."
- 模型：有向属性图 G = < V, E, PV, PE >

## 备注
强 Schema 系统（tag/edge type 需先定义）；见中文 nGQL 概览页"强 Schema"表述。
