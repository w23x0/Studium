# 快照：nGQL 概述（中文官方文档）
- URL: https://docs.nebula-graph.com.cn/3.8.0/3.ngql-guide/1.nGQL-overview/1.overview/
- 机构：NebulaGraph 官方中文文档
- 抓取日期：2026-08-13
- 工具：WebFetch 正文提取
- 证据等级：A（原文到手）

## 提取正文（关键句逐字，中文）
- "nGQL 设计目标仅为兼容部分的 DQL 语句(match, optional match, with等)。"
- "不计划兼容任何 DDL，DML，DCL；"
- "不计划兼容 Bolt 协议；"
- "不计划兼容 APOC 与 GDS。"
- "原生 nGQL 是由 NebulaGraph 自行创造和实现的图查询语言。"
- "nGQL 语言 = 原生 nGQL 语句 + openCypher 兼容语句"
- Schema：openCypher 为"弱 Schema"，nGQL 为"强 Schema"；判等运算符 openCypher 用 "="，nGQL 用 "=="。
- 参照标准："(Draft) ISO/IEC JTC1 N14279 SC 32 - Database_Languages - GQL" 与 "(Draft) ISO/IEC JTC1 SC32 N3228 - SQL_Property_Graph_Queries - SQLPGQ"
- "是否支持 TinkerPop Gremlin？不支持。也没有计划。"
- "是否支持 W3C 的 RDF（SPARQL） 或 GraphQL 等？不支持。也没有计划。"
- "NebulaGraph 的数据模型是属性图，是一个强 Schema 系统，不支持 RDF 标准。"

## 备注
中文官方明确：强 Schema、不支持 RDF/SPARQL/Gremlin、nGQL=原生+部分 openCypher 兼容。
