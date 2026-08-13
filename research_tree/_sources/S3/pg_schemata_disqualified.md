# 排除项：pg-schemata（silverstone-i.github.io）不是属性图 PG-Schema

> 来源：https://silverstone-i.github.io/pg-schemata/guide/validation
> 抓取：2026-08-13（WebFetch）｜等级 A（页面原文到手）

## 结论

- **pg-schemata 是 "lightweight Postgres-first ORM layer"**（PostgreSQL ORM），用 JSON 风格 schema 定义表列并自动生成 Zod validators。其中 "pg" = PostgreSQL，"schemata" = 管理数据库 schema/表。
- 与 ISO GQL / LDBC PG-Schema（属性图 schema 语言）**无关**。
- 检索中出现的另一候选 github.com/pgplex/pgschema 同样是 PostgreSQL 迁移工具（Terraform-style），无关。

## 备注

- 该候选排除后，"PG-Schema 标准校验器"方向没有发现新的合格工具；现成校验能力仍只有语法层实现（domel/pgschema、pgs-grammar-check）+ LEX-2026 参考库（grasch-lex，内部 validation）。
