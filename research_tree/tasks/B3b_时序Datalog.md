# 任务卡 B3b — 时序 Datalog 变体（temporal Datalog / DatalogMTL / Datalog±）
角色：深度调研树分支调研员（B3b，B3 Datalog 系 R3 子任务）。
分支名：带时间维度的 Datalog 变体能否直接表达 M09"复检/遗忘/重新掌握=新版本"。

## 问题清单
1. DatalogMTL（metric temporal logic + Datalog）的定义与推理复杂度、标准/论文原文；是否允许"结论带时间区间"。
2. 时序 Datalog（temporal Datalog）历史文献：时间参数化谓词、时态推理规则。
3. 这些变体有没有实现（推理器/库）与工程先例，还是停留在理论？
4. "当前掌握状态=最新版本"这类非单调当前视图，在时序 Datalog 里如何表达（版本谓词 + 时间参数 vs 物化当前表）？
5. 对个人规模（522 节点/1433 边），引入时间维 Datalog 的复杂度是否合理——理论能力 vs 工程成本（以文献与实现为据）。

## 候选空间与线索
DatalogMTL 论文（Wałęga 等）、temporal Datalog 综述、Vadalog/RDFox 的时态扩展、souffle 时态扩展讨论。

## 搜索关键词
中文：DatalogMTL 时态 逻辑 推理、时序 Datalog 时间参数、Datalog 版本 状态 时间、Datalog± 时态 扩展
英文：DatalogMTL metric temporal logic reasoning、temporal Datalog predicates time、Datalog temporal extension versioning、DatalogMTL implementation tool

## 工作量红线
可核来源>=15 且原文到手>=10；来源类型>=3 类（学术为主）；候选逐一查证>=5；关键词>=4 组。

## 产出格式（发现.md，写入 research_tree/findings/B3b_时序Datalog_发现.md）
0 一句话结论 / 1 逐条回答 / 2 关键发现（论断+URL+标题+机构+日期+原文摘录+等级 A/B/C）/ 3 冲突与张力 / 4 未决 / 5 来源清单 / 6 判死自查。

## 禁止项
不做引擎性能比较；不越界（时间版本通用理论归 B4）；不捏造来源；抓不到写"未核"；推断标 C。
