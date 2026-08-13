# 快照：官方博客 GQL vs Cypher
- URL: https://nebula-graph.io/posts/gql-vs.-cypher-what-the-new-iso-standard-brings-to-the-table
- 机构：NebulaGraph 官方博客
- 抓取日期：2026-08-13
- 工具：WebFetch 正文提取
- 证据等级：A（原文到手）

## 提取正文（关键句逐字）
- "When the ISO published GQL in 2024, the graph community took notice." GQL 正式编号 ISO/IEC 39075。
- "GQL did not emerge in isolation. The ISO committee drew inspiration from several existing languages, with Cypher and openCypher being the most significant influences."
- "GQL has adopted much of Cypher's query construction semantics, including the MATCH/RETURN format."
- Neo4j 高管引语："If you're already using Cypher or openCypher, then you're already 95% there."
- "the openCypher specification is now evolving toward GQL compliance by progressively integrating GQL features."
- GQL 新增：正则式变长路径（`-[e]->{1,3}`、`-[e]->+`）、四种路径限定（WALK/TRAIL/ACYCLIC/SIMPLE）、LET 语句（替代 WITH 的非阻断变量定义）、封闭图类型（"GQL introduces closed graph types (also known as fixed-schema graphs)"）、多图支持、真正无向边、标准化术语。
- NebulaGraph 与 GQL："As a member of the Linked Data Benchmark Council (LDBC), Vesoft has actively participated in the development and promotion of the GQL standard."
- "NebulaGraph Enterprise Edition is the first distributed graph database to implement native GQL support."
- "the Enterprise Edition is designed with native GQL support at the architecture level, meaning queries can be migrated incrementally with clear compatibility."

## 备注
关键区分：原生 GQL 支持在 **Enterprise Edition**（企业版），社区版 nGQL 仍为私有方言+部分 openCypher。GQL 是完整 DB 语言（含 DDL），nGQL 只计划兼容部分 DQL。
