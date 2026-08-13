# Neo4j Cypher Manual — Supported mandatory GQL features（镜像）

> 来源：raw.githubusercontent.com/AsherBond/neo4j-docs-cypher/dev/modules/ROOT/pages/appendix/gql-conformance/supported-mandatory.adoc
> 抓取：2026-08-13（WebFetch）｜等级 A（原文到手）

## 原文要点（逐字/近逐字）

- 开头："Unlike optional features, mandatory GQL features are not assigned a GQL feature ID code."；表按 "listed in order of their appearance in the ISO/IEC 39075:2024(en) GQL Standard" 排列。
- 支持项（GQL 标准子条款 → 描述）：
  - 4.9.2 GQL-status objects："Neo4j exposes successful execution results, errors, exceptions, and warnings as GQL-status objects."
  - 4.11 Graph pattern matching
  - 4.13 GQL object types："Includes: NODE (ANY NODE, VERTEX, ANY VERTEX) and RELATIONSHIP (ANY RELATIONSHIP, EDGE, ANY EDGE)."
  - 4.16 Predefined value types：BOOLEAN/BOOL, FLOAT, INTEGER/SIGNED INTEGER/INT, STRING/VARCHAR。备注："Cypher supports the boolean type predicate for true, false, and null but does not support the GQL key UNKNOWN."
  - 9.1 Nested procedure specification（UNION / UNION ALL 相关）
  - 13.2 INSERT
  - 13.3 SET（备注：GQL 的 SET 无顺序依赖，Cypher 的 SET 行序会影响结果）
  - 13.4 REMOVE
  - 13.5 DELETE
  - 14.4 MATCH / OPTIONAL MATCH
  - 14.9 ORDER BY / SKIP / OFFSET / LIMIT
  - 14.10 FINISH
  - 14.11 RETURN（备注：GQL 的 RETURN ALL "is currently not available in Cypher."）
  - 16.2 LIMIT clause
  - 16.4 Graph pattern
  - 16.5 Insert graph pattern (CREATE)
  - 16.6 ORDER BY clause
  - 16.7 Path pattern expression
  - 16.8 Label expression
  - 16.9 Path variable reference
  - 16.11 Graph pattern quantifier
  - 16.17 Sort specification list
  - 16.19 OFFSET (SKIP, OFFSET)
  - 19.3 Comparison predicate
  - 19.4 EXISTS predicate (exists())
  - 19.5 NULL predicate
  - 19.6 Value type predicate
  - 19.7 Normalized predicate (IS NORMALIZED / IS NOT NORMALIZED)
  - 20.2 Value expression primary
  - 20.3 Value specification（备注：GQL 的 SESSION_USER，Cypher 用 SHOW CURRENT USER 替代）
  - 20.7 CASE / nullIf() / coalesce()
  - 20.9 Aggregate functions（avg/count/max/min/sum；备注：GQL 空集 sum 返回 null，Cypher 返回 0）
  - 20.11 Property reference
  - 20.21 Numeric value expression
  - 20.22 Numeric value function（char_length/character_length）
  - 20.23 String value expression（|| 连接）
  - 20.24 Character string function（left/lower/normalize/right/trim/upper；备注：GQL TRIM 只去空格，Cypher 去任意空白）
  - 21.1 Names and variables（备注：GQL 允许扩展参数标识符如 $0hello、引号分隔标识符，Cypher 不支持）
  - 22.15 Grouping operations

## 未支持/部分支持（本页标注）

- UNKNOWN 关键字不支持
- RETURN ALL 当前不可用
- SESSION_USER 无直接等价（用 SHOW CURRENT USER）
- 扩展参数标识符 $0hello 不支持
- 引号分隔标识符 n."a prop" 不支持
