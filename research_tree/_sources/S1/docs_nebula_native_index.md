# 快照：Native Index（原生索引）
- URL: https://docs.nebula-graph.io/3.8.0/3.ngql-guide/14.native-index-statements/
- 机构：NebulaGraph 官方文档
- 抓取日期：2026-08-13
- 工具：WebFetch 正文提取
- 证据等级：A（原文到手）

## 提取正文（关键句逐字）
- "Native indexes allow querying data based on a given property."（tag index 与 edge type index 两类）
- "Native indexes must be updated manually"（需 REBUILD INDEX）
- "Indexes can improve query performance but may reduce write performance."
- 原生索引 "support indexing multiple properties on a tag or an edge type (composite indexes), but do not support indexing across multiple tags or edge types."
- 两类索引：native indexes 与 full-text indexes。

## 备注
原生索引基于属性前缀/Lookup 型查询；全文/子串检索需外部 ES（见 docs_nebula_fulltext_es_cn.md）。
