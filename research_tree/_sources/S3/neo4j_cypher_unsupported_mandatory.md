# Neo4j Cypher Manual — Currently unsupported mandatory GQL features（镜像）

> 来源：raw.githubusercontent.com/AsherBond/neo4j-docs-cypher/dev/modules/ROOT/pages/appendix/gql-conformance/unsupported-mandatory.adoc
> 抓取：2026-08-13（WebFetch）｜等级 A（原文到手）

## 原文要点（逐字/近逐字）

页面开头："Cypher supports most mandatory GQL features"，但"a few mandatory features not yet implemented"（引用 ISO/IEC 39075:2024）。

未支持项表：

- **7.1–7.3 Session management**：GQL 定义 "SESSION SET"、"SESSION RESET"、"SESSION CLOSE" 命令。Neo4j 用 driver session API 提供会话管理。
- **8.1–8.4 Transaction management**：GQL 定义 "START TRANSACTION"、"COMMIT"、"ROLLBACK"。Neo4j 用 driver transaction API 和 Cypher Shell 命令。
- **11.1 Graph expressions**：GQL 定义 "CURRENT_GRAPH" 和 "CURRENT_PROPERTY_GRAPH" 作为图引用值命令。
- **17.1 Schema reference**：GQL 定义 "AT clause"（用于选择当前 schema），以及 "HOME_SCHEMA"、"CURRENT_SCHEMA" 选项。
- **21.3 Tokens, separators, and identifiers**：GQL 保留字列表与 Cypher 保留字列表不同。

## 备注

- 本页未提及 USE GRAPH 或图上下文子句；未列出具体版本号与目标日期。
- 对照：baseline B2b F9/F10 记录 "SESSION/CURRENT_GRAPH/AT 未支持"——本快照显示截至 2026.04 版文档，这三项仍列于"未支持 mandatory 特性"。
