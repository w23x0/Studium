# 任务卡 B6a — mathlib / MML 数学库的存储与版本化先例（最接近领域）
角色：深度调研树分支调研员（B6a，属 B6 先例系的第二轮子任务）。
分支名：形式化数学库（mathlib4/Lean、MML/Mizar、Coq 数学库）的存储格式、依赖图与版本化机制。

## 问题清单
1. Lean mathlib4 的文件/模块组织、声明间依赖（import 图）、git 版本管理与"不破坏下游"的机制（官方文档原文）。
2. Mizar Mathematical Library (MML) 的存储与版本化：条目、引用、MML 版本标识、验证方式（Mizar 官网/文档）。
3. 数学库的"图"结构：定义依赖图如何从文本源码生成、是否有标准工具（如 Lean 的 lake/exports、mizar 的 mml 查询工具）。
4. 数学库处理"概念重命名/重构/旧结论废弃"的方式（git 历史 vs 显式版本 vs 永不移除），与 M08"候选池+审计晋升"、M09"旧版本不覆盖"的异同。
5. 个人学习知识图谱从数学库先例可借鉴的最小集合：哪些机制可移植（如逐文件校验、import 完整性、版本标识），哪些不可移植（规模/自动化证明器依赖）。

## 候选空间与线索
Lean 官方文档（lake、import）、mathlib4 GitHub、Mizar/MML 官网与文档、Coq 数学库（mathcomp）、proof assistant 依赖管理论文。

## 搜索关键词
中文：mathlib 存储 依赖 版本管理、Mizar MML 条目 版本、形式化数学 库 依赖图、证明库 重构 废弃 处理
英文：mathlib4 storage module structure versioning、Mizar MML article version identification、formal math library dependency graph tooling、proof library refactoring deprecation policy

## 工作量红线
可核来源>=15 且原文到手>=10；来源类型>=3 类（项目官方文档、学术论文、工程仓库）；候选逐一查证>=5（mathlib4、MML、lake、import 图工具、重构/废弃先例）；关键词>=4 组。

## 产出格式（发现.md，写入 research_tree/findings/B6a_数学库_发现.md）
0 一句话结论 / 1 逐条回答 / 2 关键发现（论断+URL+标题+机构+日期+原文摘录+等级 A/B/C）/ 3 冲突与张力 / 4 未决 / 5 来源清单 / 6 判死自查。

## 禁止项
不评测工具性能；不越界（间隔重复/学习记录归 B6b/c；锚点校验方法归 B8）；不捏造来源；抓不到写"未核"；推断标 C。
