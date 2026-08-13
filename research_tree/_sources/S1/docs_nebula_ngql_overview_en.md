# 快照：nGQL Overview（英文）
- URL: https://docs.nebula-graph.io/3.8.0/3.ngql-guide/1.nGQL-overview/1.overview/
- 机构：NebulaGraph 官方文档
- 抓取日期：2026-08-13
- 工具：WebFetch 正文提取
- 证据等级：A（原文到手）

## 提取正文（关键句逐字）
- "NebulaGraph Query Language (nGQL)" — the query language of NebulaGraph.
- "nGQL is a declarative graph query language for NebulaGraph. It allows expressive and efficient graph patterns." "an SQL-like query language, so it's easy to learn."
- 兼容性：nGQL 与 openCypher 9 **部分**兼容。
- "nGQL is designed to be compatible with part of DQL (match, optional match, with, etc.)."
- "`nGQL` = `native nGQL` + `openCypher compatible sentences`"
- "Native nGQL is the part of a graph query language designed and implemented by NebulaGraph."
- "It is not planned to be compatible with any DDL, DML, or DCL."
- 不计划兼容 Bolt Protocol、APOC、GDS。
- 参照标准："(Draft) ISO/IEC JTC1 N14279 SC 32 - Database_Languages - GQL" 与 "(Draft) ISO/IEC JTC1 SC32 N3228 - SQL_Property_Graph_Queries - SQLPGQ"
- 已知差异：openCypher 用 `=` 判等，nGQL 用 `==`；openCypher 支持 `^` 幂运算，nGQL 不支持（建议 pow(x,y)）。

## 备注
nGQL 官方定位=原生 nGQL + 部分 openCypher 兼容语句；非纯 openCypher 方言。
