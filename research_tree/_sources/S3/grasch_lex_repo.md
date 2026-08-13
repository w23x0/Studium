# alastai/grasch-lex — GQL Catalog & LEX-2026 Schema Library（Alastair Green 个人仓库）

> 来源：https://github.com/alastai/grasch-lex
> 抓取：2026-08-13（WebFetch）｜等级 A（页面原文到手）

## 原文要点

- 描述："Grasch - GQL Catalog and LEX-2026 Schema Library."
- 现状（README）："This project is currently in the design and specification phase, implementing **LEX-2026 as the first version of the LEX (LDBC Extended GQL Schema) standard**."
- 三层架构：PSO Interface（低层程序化 API）、DDL Interface、YAML Interface。
- 提供："schema definition, validation, an advanced type system, multiple definition formats, and Kuzu graph database integration."
- 388 commits（main）；0 stars / 0 watchers / 0 forks；无 release。
- 根目录 LEX-2026 文档（节选）：LEX-2026-GRAPHTYPE-NODETYPES-EDGETYPES-SPEC.md、LEX-2026-VERSION-HISTORY.md、LEX-2026.0.3.2-SCHEMA-UPDATE-PLAN.md、LEX-2026.0.3.2-COMPREHENSIVE-CONSISTENCY-ANALYSIS.md、LEX-2026.0.3.2-SUMMARY.md、LEX-2026.0.3.2-IMPLEMENTATION-PROGRESS.md、LEX-100r3-MODERNIZATION-GUIDE.md、LEX-100r3-TO-LEX-2026.0.4-UPGRADE-GUIDE.md 等。含 graph_RAG 目录。
- 页脚 "© 2026 GitHub, Inc."。

## 调研员判断

- LEX 有一个版本化 2026 交付物代号 **LEX-2026**（当前 0.3.2，向 0.4 演进），以公开个人仓库形式落地（Alastair Green 系 LEX 组长）。这是相对 B2b 基线的**新增证据**，说明 LEX 从"章程/讨论"进入"版本化规范+Python 库实现"阶段。
- 局限：个人公开仓库（非 GDC 官方发布、非 ISO 交付物）、0 star、未发布 release、处于 design/spec 阶段；"validation"指该库内部校验，不等于"标准校验器"。
