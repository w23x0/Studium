# 任务卡 B3 — Datalog/逻辑事实库系
角色：深度调研树分支调研员（B3）。
分支名：Datalog/逻辑编程范式作为图谱存储语言。

## 问题清单
1. 把 M08 建模为 EDB（事实集）+ IDB（推导规则）：候选池到审计晋升的门控、封闭边词表、不变量层/表示层区分，能否用纯 Datalog 规则表达？哪些需要聚合/否定/半正 Datalog 等扩展？
2. Datalog 的单调性语义与 M09"规模单调增长、新版本不覆盖旧结论"是否同构？增量求值（增量 Datalog/差分数据流）对"复检产生新版本后自动更新派生结论"的适配性？
3. "校验即查询"：现有 Python 校验脚本的校验项（锚点逐字存在、词表合法、引用完整）能否改写为 Datalog 查询的否定形式？有没有先例系统用 Datalog 做数据完整性校验？
4. 时序 Datalog 扩展（temporal Datalog、Datalog+-、Statelog 等）的学术与工程现状？
5. Datalog 事实库的持久化格式：事实是纯文本可 grep 的，grep -F 锚点校验是否比在 JSONL 上更直接？Souffle 的 fact 文件格式是否可作为交换格式先例？

## 候选空间与线索
纯 Datalog 及扩展（否定、聚合、时序、半正）、Souffle 语言文档、Prolog 事实库先例、增量/差分 Datalog 学术成果（DDlog、differential dataflow 论文）、LogicBlox/Datomic 设计论文（只挖语言设计，不做产品对比）、answer set programming（对照）。

## 搜索关键词
中文：Datalog 知识图谱 存储、Datalog 数据完整性 校验、时序 Datalog 扩展、增量 Datalog 求值
英文：Datalog as graph storage language、Datalog integrity constraints validation、temporal Datalog extensions、incremental Datalog evaluation differential、Souffle facts file format

## 工作量红线
可核来源>=15 且原文到手>=10；来源类型>=3 类（学术论文/语言规范文档/工程先例）；候选逐一查证>=5（纯 Datalog、时序扩展、增量求值、Souffle fact 格式、校验先例）；关键词>=4 组。

## 产出格式（发现.md）
0 一句话结论 / 1 逐条回答 / 2 关键发现（论断+URL+标题+机构+日期+原文摘录+等级 A/B/C）/ 3 冲突与张力 / 4 未决问题 / 5 来源清单 / 6 判死自查

## 禁止项
不做引擎性能评测对比；不越界（bitemporal 通用理论归 B4）；不捏造来源，抓不到写"未核"；不预设 Datalog 优于/劣于现状。
