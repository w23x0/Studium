# Neo4j Cypher Manual — GQL conformance（镜像于 GitHub fork，2026.04 版）

> 来源：raw.githubusercontent.com/PrimeKoboDevlopement/Nep4j_docs-cypher/dev/modules/ROOT/pages/appendix/gql-conformance/index.adoc
> 抓取：2026-08-13（WebFetch）｜等级 A（原文到手）
> 注意：neo4j.com 官方文档页对抓取工具返回 403；此文本来自该 fork 的 dev 分支，标记版本 2026.04（2026-04-30 更新）。引用时标注来源为文档镜像。

## 原文关键句（逐字）

- "Last updated*: 30 April 2026"
- "Neo4j version*: 2026.04"
- "Consequently, Cypher now accommodates most mandatory GQL features and a substantial portion of its optional ones"
- 最低符合声明："Graph with an open graph type (Feature GG01)."
- 强制属性类型支持："BOOLEAN (BOOL)", "FLOAT", "INTEGER (SIGNED INTEGER, or INT)", "STRING (VARCHAR)"
- 未支持声明："There are, however, currently a few mandatory GQL features not yet in Cypher that Neo4j is actively working towards implementing."（具体清单见 unsupported-mandatory.adoc）
- "Neo4j is also working towards increasing its support of optional GQL features."

## 对照（AsherBond fork，2025.06 版）

- 同文件另一镜像（AsherBond/neo4j-docs-cypher dev 分支）标记："Last updated: 2 June 2025" / "Neo4j version: 2025.06"，主句同为 "Cypher now accommodates most mandatory GQL features and a substantial portion of its optional ones"。
- 说明"most mandatory"措辞在 2025.06 与 2026.04 两个版本间保持。

## 备注

- 全文档未见 SESSION / CURRENT_GRAPH / AT 三词（其未支持状态见 unsupported-mandatory 快照）。
