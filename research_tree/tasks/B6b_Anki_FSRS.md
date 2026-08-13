# 任务卡 B6b — Anki / FSRS 复习日志（revlog）格式与版本化先例
角色：深度调研树分支调研员（B6b，B6 先例系 R3 子任务）。
分支名：Anki revlog 与 FSRS scheduler 的时间版本数据结构（间隔重复领域）。

## 问题清单
1. Anki 的 collection/revlog 数据库结构：复习事件如何按时间追加、旧状态是否被覆盖（Anki 数据库格式官方文档原文）。
2. FSRS（Free Spaced Repetition Scheduler）算法输入/输出与日志：时间戳、稳定性、难度如何随每次复习更新，是否存在可重建的历史。
3. Anki 同步（collections 合并）时版本冲突如何处理——"旧结论覆盖新结论"的风险与本项目红线对照。
4. 间隔重复系统对"重新掌握/遗忘→新状态"的建模：是覆盖写还是新记录（先例文档/源码为据）。
5. 对 M09"复检/遗忘/重新掌握=新版本、旧版本不覆盖"的可借鉴点与不可借鉴点。

## 候选空间与线索
Anki 手册（数据库、同步、导出）、AnkiDroid 数据结构文档、FSRS 论文与文档（open-spaced-repetition）、ts-fsrs 源码。

## 搜索关键词
中文：Anki 数据库 revlog 结构、FSRS 稳定性 难度 日志、Anki 同步 冲突 覆盖、间隔重复 版本 记录
英文：Anki database format revlog schema、FSRS scheduling parameters history logs、Anki sync conflict resolution overwrite、spaced repetition log append-only

## 工作量红线
可核来源>=15 且原文到手>=10；来源类型>=3 类；候选逐一查证>=5；关键词>=4 组。

## 产出格式（发现.md，写入 research_tree/findings/B6b_Anki_FSRS_发现.md）
0 一句话结论 / 1 逐条回答 / 2 关键发现（论断+URL+标题+机构+日期+原文摘录+等级 A/B/C）/ 3 冲突与张力 / 4 未决 / 5 来源清单 / 6 判死自查。

## 禁止项
不评测记忆软件；不越界（学习记录规范归 B6c）；不捏造来源；抓不到写"未核"；推断标 C。
