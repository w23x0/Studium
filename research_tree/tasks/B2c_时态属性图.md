# 任务卡 B2c — 时态属性图（Temporal Property Graph）先例
角色：深度调研树分支调研员（B2c，B2 属性图系 R3 子任务）。
分支名：属性图上的时间版本建模先例（TPG）与 M09 适配性。

## 问题清单
1. 时态属性图（temporal property graph）的学术定义与综述：边/节点带有效时间或事务时间的主流建模（论文原文）。
2. 主流方案如何查询"某时刻图状态"（temporal graph query、bitemporal property graph）？
3. 属性图版本化工程先例：把图存成 append-only 变更日志再物化视图的项目/论文（如 event-sourced graph）。
4. TPG 方案对"旧结论不覆盖、复检生成新版本"（M09）的表达力：节点历史、边历史、属性历史的分开与统一。
5. TPG 的交换格式：这些方案用什么序列化/文件格式承载（JSON/CSV/Cypher dump/自研）？

## 候选空间与线索
Temporal Property Graph 综述论文（如 "Temporal Property Graph" / "bitemporal graph"）、event-sourced graph 工程、Neo4j 时间建模文档（仅背景）、时态图查询语言文献。

## 搜索关键词
中文：时态属性图 综述 建模、属性图 位时间 版本、事件溯源 图 物化、图 时间查询 语言
英文：temporal property graph survey bitemporal、property graph versioning event sourcing materialized view、temporal graph query language survey、append-only graph change log

## 工作量红线
可核来源>=15 且原文到手>=10；来源类型>=3 类（学术为主）；候选逐一查证>=5；关键词>=4 组。

## 产出格式（发现.md，写入 research_tree/findings/B2c_时态属性图_发现.md）
0 一句话结论 / 1 逐条回答 / 2 关键发现（论断+URL+标题+机构+日期+原文摘录+等级 A/B/C）/ 3 冲突与张力 / 4 未决 / 5 来源清单 / 6 判死自查。

## 禁止项
不做厂商性能比较；不越界（时间版本通用理论归 B4）；不捏造来源；抓不到写"未核"；推断标 C。
