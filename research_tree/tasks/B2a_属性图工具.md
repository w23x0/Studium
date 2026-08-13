# 任务卡 B2a — 属性图语言 GQL/SQL:PGQ 的实现与交换格式现状
角色：深度调研树分支调研员（B2a，属 B2 属性图系的第二轮子任务）。
分支名：GQL（ISO/IEC 39075:2024）与 SQL/PGQ（SQL:2023）的实际实现、工具链与交换格式现状。

## 问题清单
1. GQL 标准发布后，有哪些公开实现/计划（数据库厂商、开源引擎）？各实现支持 GQL 的哪部分？（以官方文档/发布公告为据）
2. SQL/PGQ（SQL:2023 第 20 部分）的实现现状：哪些主流数据库声明支持 PGQ 图查询（官方文档原文）？
3. 属性图是否有任何"交换格式"标准或事实标准（GPML？GQL 是否定义序列化？openCypher 的导出格式？）——B2 一轮已发现 GQL 未定义交换格式，本子任务要挖"那实际用什么交换"（如 JSON/CSV 导出、Cypher dump、graphml、dot）。
4. 属性图存储的版本化先例：有没有把属性图做成 append-only/时间版本的工程或学术方案（temporal property graph）？
5. 对"522 节点个人图谱、封闭边词表 9+other、候选池+审计晋升"需求，属性图语言/存储的查询与校验能力边界（是否必须图数据库？纯文本 Cypher/PGQ 语句作为存储是否可行？）。

## 候选空间与线索
ISO/IEC 39075 官方页、SQL:2023 标准摘要、Neo4j/openCypher/Cypher 文档、GQL 实现清单（W3C/ISO 相关列表）、temporal property graph 论文（如 TPG 文献）、GraphML/dot/JSON 交换先例。

## 搜索关键词
中文：GQL 标准 实现 数据库 2024、SQL PGQ 图查询 支持 数据库、属性图 交换格式、时态属性图 版本
英文：GQL ISO 39075 implementations engines 2024、SQL:2023 SQL/PGQ support database official、property graph exchange format standard、temporal property graph survey

## 工作量红线
可核来源>=15 且原文到手>=10；来源类型>=3 类（ISO/标准机构、数据库官方文档、学术论文、工程先例）；候选逐一查证>=5；关键词>=4 组。

## 产出格式（发现.md，写入 research_tree/findings/B2a_属性图工具_发现.md）
0 一句话结论 / 1 逐条回答 / 2 关键发现（论断+URL+标题+机构+日期+原文摘录+等级 A/B/C）/ 3 冲突与张力 / 4 未决 / 5 来源清单 / 6 判死自查。

## 禁止项
不做厂商/引擎浅层对比（只核实现状态与交换格式，不比性能口碑）；不越界（RDF 系归 B1、时间版本机制归 B4）；不捏造来源；抓不到写"未核"；推断标 C。
