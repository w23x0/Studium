# GraphLite — Rust 嵌入式图数据库，声称 full ISO GQL 实现

> 来源：https://github.com/GraphLite-AI/GraphLite （HN 帖 https://news.ycombinator.com/item?id=46121076 于本次抓取 429，未核）
> 抓取：2026-08-13（WebFetch）｜等级 A（README 页面原文到手）

## 原文要点（README 逐字）

- 定位："A graph database as simple as SQLite for embedded processes"；"A fast, light-weight and portable embedded graph database"。
- **"ISO GQL Standard - Full implementation of ISO GQL query language based on grammar optimized from OpenGQL project"**；"GraphLite's ISO GQL implementation is based on the grammar and specifications from the OpenGQL project."
- 特性：MATCH 模式匹配、ACID 事务（隔离级别）、嵌入式 Sled 存储、强类型系统（validation and inference）、成本优化、"Pure Rust"。
- 测试声称：189 unit tests、537 total tests；若干文档节 "In Progress"。
- 仓库规模：28 commits（main）；227 stars / 8 watching / 17 forks；Apache-2.0；无 release 可见；页脚 © 2026 GitHub。
- 安全联系邮箱 gl@deepgraphai.com。

## 调研员判断

- GraphLite 是**新出现的 GQL 实现**（自称 full ISO GQL，基于 opengql/grammar），说明 GQL 实现生态在扩展；但"full implementation"为作者声称，未经验证/无官方 conformance 测试背书，且仓库仍处早期（28 commits）。
- 对 Q2/Q4 的意义：实现生态（Neo4j 之外）在向 GQL 靠拢，但**不等于"标准校验器"或"正式采纳"**。
