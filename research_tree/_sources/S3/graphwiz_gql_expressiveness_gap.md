# graphwiz.ai — "The GQL Expressiveness Gap: What the New ISO Standard Can't Do"（2026-06-08）

> 来源：https://graphwiz.ai/content/graphs/gql-expressiveness-gap/
> 抓取：2026-08-13（WebFetch）｜等级 B（行业博客，非一手标准文件；引用 VLDB 2025 / ICDT 2025 学术结果）

## 原文要点

- 发布日期：**June 8, 2026**。
- GQL 表达力缺口（引 VLDB 2025、ICDT 2025-2026 研究）：
  1. **边属性单调性**："GQL cannot compare consecutive edge properties within a recursive pattern match."（金融欺诈/时序沿边时间戳查询受限）
  2. **基于值的递归**：VLDB 2025 Libkin 等："Core GQL and Core PGQ cannot express queries expressible in positive recursive SQL and linear Datalog."（递归作用于图结构而非值）
  3. **元属性/Schema 自省**："GQL does not support quantification over properties or labels. You cannot query the schema itself."（无 INFORMATION_SCHEMA 等价物）
  4. 偶长路径：Cypher 的缺陷（ICDT 2025 证明），GQL 用 `*` 运算解决。
- 实际影响：欺诈检测、流程挖掘、schema 发现受阻；变通=两阶段检索 + 应用代码/递归 SQL。
- 结尾："The ISO committee is aware of these gaps and has deferred features documented as 'language opportunity' items, but **GQL v2 timelines remain uncertain**."

## 调研员判断

- 2026-06 的行业博客确认：GQL v2 时间线"仍不确定"（与 Keith Hare deck 的 2027 目标互补，博客更保守）。
- "GQL 不能查询 schema 自身 / 无 schema 自省" => 与 GQL V2"Schema information graph"在讨论项、以及 LEX 2025.13 Information Schema Graph 直接呼应（缺口认识 = 解决前景的输入）。
