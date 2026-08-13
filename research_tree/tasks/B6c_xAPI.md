# 任务卡 B6c — xAPI / LRS 学习记录存储与不可变声明先例
角色：深度调研树分支调研员（B6c，B6 先例系 R3 子任务）。
分支名：xAPI（Experience API）与学习记录存储（LRS）的 statement 不可变性与版本化。

## 问题清单
1. xAPI 规范（IEEE 9274.1.1）对 statement 不可变性的规定原文：statement id、不可修改、冲突处理。
2. LRS（Learning Record Store）的存储模型：statement 流如何按 actor/activity 检索，是否天然 append-only。
3. xAPI 的 voiding statement（声明作废）机制：撤回不物理删除的规范原文（对应本项目"不物理删除"红线）。
4. xAPI 对"学习者掌握状态"的建模：是事件流（statements）还是状态（state API 的 document 存储），两者版本语义差异。
5. 对 M09"个人学习记录+时间版本"的可借鉴点：事件不可变、作废声明、按时间查询。

## 候选空间与线索
xAPI 规范（Experience API 1.0.3 / IEEE）、ADL 文档、LRS 实现文档（如 Learning Locker、xAPI 官方说明）、Tin Can API 资源。

## 搜索关键词
中文：xAPI statement 不可变 规范、LRS 学习记录存储 模型、xAPI 作废声明 voiding、学习记录 事件流 版本
英文：xAPI specification statement immutable voiding、LRS learning record store append-only、Experience API voiding statement spec、learning record stream versioning

## 工作量红线
可核来源>=15 且原文到手>=10；来源类型>=3 类；候选逐一查证>=5；关键词>=4 组。

## 产出格式（发现.md，写入 research_tree/findings/B6c_xAPI_发现.md）
0 一句话结论 / 1 逐条回答 / 2 关键发现（论断+URL+标题+机构+日期+原文摘录+等级 A/B/C）/ 3 冲突与张力 / 4 未决 / 5 来源清单 / 6 判死自查。

## 禁止项
不评测 LRS 产品；不越界（事件溯源理论归 B4）；不捏造来源；抓不到写"未核"；推断标 C。
