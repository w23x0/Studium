# 快照：博客园文章《一文了解各大图数据库查询语言（Gremlin vs Cypher vs nGQL）》
- URL: https://www.cnblogs.com/nebulagraph/p/12418948.html
- 机构：博客园，NebulaGraph 官方账号文章
- 日期：约 2019-2020（nGQL 早期、openCypher 兼容前的 nGQL）
- 抓取日期：2026-08-13
- 工具：WebFetch 正文提取
- 证据等级：A（原文到手；文章为官方账号旧文，反映 v2.x 时代 nGQL 定位）

## 提取正文（关键句逐字）
- Gremlin："可以是声明性的也可以是命令性的"，基于 Groovy，支持 JanusGraph/Cosmos DB/Amazon Neptune。
- Cypher："一个描述性的图形查询语言"，类 SQL、关键字大小写不敏感，支持 Neo4j/RedisGraph/AgensGraph。
- nGQL："一种类 SQL 的声明型的文本查询语言"，"支持 Nebula Graph only"。
- 语法风格对比：nGQL 用 SQL 风格关键字 `GO FROM <vid> OVER <edge>`；方向用 `REVERSELY` / `BIDIRECT` 关键字；多跳 `GO N STEPS`。
- CRUD："Delete 一般用于点边，Drop 用于 Schema 删除"（遵循 SQL 约定）。
- "nGQL 用 INSERT、UPDATE、FETCH、GO、LOOKUP"，区别于 Cypher 的 CREATE/MATCH/SET。
- nGQL 无边 ID（edge ID 为"无"）。
- 管道：nGQL 用 `|` 串联查询（LOOKUP ... | GO FROM $-.VertexID OVER father）。

## 备注
此文是 v2.x 时代（openCypher 兼容加入前，nGQL 为纯 SQL 风格私有语言）的官方口径，与 v3.x"nGQL=原生+部分 openCypher 兼容"的表述共同说明 nGQL 的演化史。对比字段含日期信息需以版本为准。
