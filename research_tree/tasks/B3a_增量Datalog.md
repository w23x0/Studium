# 任务卡 B3a — 增量 Datalog 机制与审计门控（DDlog/DBSP/RDFox 深挖）
角色：深度调研树分支调研员（B3a，属 B3 Datalog 系的第二轮子任务）。
分支名：增量 Datalog 引擎机制（DDlog/DBSP/RDFox/LogicBlox）如何承载"候选池+审计晋升+处置单"状态机。

## 问题清单
1. DDlog（VMware 系，GitHub 项目）的增量维护机制、语言特点、存储形态（程序即数据？关系事实文件？）官方文档原文。
2. DBSP（Budiu 等）的增量计算理论承诺（自动增量、完全增量）与工程落地现状。
3. RDFox 的增量 Datalog 与基于 RDF 的事实存储：EDB/IDB 划分、增量更新、审计场景先例。
4. 用增量 Datalog 表达"候选边→审计通过→晋升为正式边"状态机：事实层（单调）+ 当前视图（非单调）如何分层，是否有工程或论文先例？
5. 事实文本可否保持"grep -F 可查"：增量 Datalog 系统的事实文件/日志是否为可追加纯文本，锚点逐字校验能否直接作用于事实文件？

## 候选空间与线索
DDlog GitHub/文档、DBSP 论文（CIDR 2020/2023）、RDFox 文档与论文、LogicBlox 白皮书、souffle 增量相关、Datalog 教育体系（斯坦福/密歇根课件仅作背景）。

## 搜索关键词
中文：DDlog 增量 数据流 语言、DBSP 增量计算 论文、RDFox 增量 更新 审计、Datalog 状态机 事实 视图 分层
英文：DDlog incremental Datalog language design、DBSP automatic incrementalization paper、RDFox incremental reasoning updates、Datalog monotonic facts non-monotonic view layering

## 工作量红线
可核来源>=15 且原文到手>=10；来源类型>=3 类（工程文档/源码、学术论文、标准或规范）；候选逐一查证>=5；关键词>=4 组。

## 产出格式（发现.md，写入 research_tree/findings/B3a_增量Datalog_发现.md）
0 一句话结论 / 1 逐条回答 / 2 关键发现（论断+URL+标题+机构+日期+原文摘录+等级 A/B/C）/ 3 冲突与张力 / 4 未决 / 5 来源清单 / 6 判死自查。

## 禁止项
不比较厂商/引擎性能（只核机制与存储形态）；不越界（时间版本语义归 B4、校验语言归 B5/B8）；不捏造来源；抓不到写"未核"；推断标 C。
