# 任务卡 B4c — 墓碑与撤回（tombstone / retraction）位时间建模先例
角色：深度调研树分支调研员（B4c，B4 时间版本系 R3 子任务）。
分支名：bitemporal 模型里"结论被复检推翻/遗忘"如何建模：墓碑、撤回、软删除的规范与工程先例。

## 问题清单
1. bitemporal 数据建模（valid time + transaction time）的标准定义与文献（如 Snodgrass、SQL:2011 时态特性）原文。
2. "旧结论不物理删除、新版本覆盖"在 bitemporal 里的标准做法：新增一行 + 终止旧行有效期（closed-open interval）的原文示例。
3. 撤回（retraction）语义：RDF/语义网里的撤回先例（nanopub retraction、Web 撤回词汇），与软删除/tombstone 的区别。
4. 事件溯源里"取消事件/补偿事件"与 M09"复检产生新版本"的对应关系（B8 一轮已涉 Fowler Event Sourcing，本子任务挖补偿/撤回细节）。
5. 对"graveyard 不物理删除"红线：候选池→晋升→（可能）废弃的状态转移在 bitemporal/事件模型里的推荐表达。

## 候选空间与线索
SQL:2011 时态表文献、Snodgrass 时间数据库、nanopub retraction 说明、事件溯源补偿事件文献、软删除设计文献。

## 搜索关键词
中文：双时态 建模 有效时间 事务时间、墓碑 软删除 数据模型、nanopub 撤回 语义、事件溯源 补偿 事件
英文：bitemporal modeling valid time transaction time、tombstone soft delete data model best practice、retraction semantic web nanopub、event sourcing compensating event pattern

## 工作量红线
可核来源>=15 且原文到手>=10；来源类型>=3 类；候选逐一查证>=5；关键词>=4 组。

## 产出格式（发现.md，写入 research_tree/findings/B4c_墓碑撤回_发现.md）
0 一句话结论 / 1 逐条回答 / 2 关键发现（论断+URL+标题+机构+日期+原文摘录+等级 A/B/C）/ 3 冲突与张力 / 4 未决 / 5 来源清单 / 6 判死自查。

## 禁止项
不做数据库选型；不越界（版本理论总纲归 B4 一轮）；不捏造来源；抓不到写"未核"；推断标 C。
