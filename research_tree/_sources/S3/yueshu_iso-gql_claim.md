# 悦数（Yueshu）图数据库 — 声称全面支持 ISO-GQL（2026-05-14，厂商自述）

> 来源：https://www.yueshu.com.cn/posts/ISO-GQL-important
> 抓取：2026-08-13（WebFetch）｜等级 B/C（厂商博客自述，无独立 conformance 背书）

## 要点（逐字摘录）

- "2024 年 4 月，国际标准化组织（ISO）正式发布 GQL（Graph Query Language）标准，编号 ISO/IEC 39075:2024。"
- "悦数率先在国内图数据库产品中全面支持 ISO-GQL 国际标准，用户可以直接用标准语法编写图谱查询。"
- 兼容 nGQL（Cypher 系扩展语言）以支持存量迁移。
- 技术自述："C++ 原生存储引擎"、"Shared-Nothing 分布式架构"、"千亿级图谱规模毫秒级响应"。
- 未说明具体产品版本号；无第三方 conformance 测试结果。

## 调研员判断

- 中文厂商对 ISO-GQL 的支持宣称（2026-05），可作"GQL 实现生态扩展"的次级证据；但**全部为厂商自述**，且未说明 GQL 特性覆盖级别（最小符合/可选特性），等级 B/C。
- 与 S1（NebulaGraph 评估）存在邻接，此处仅引用其 GQL conformance 宣称，不做引擎选型判断。
