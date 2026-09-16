# docs/_archive INDEX

MAX_FILE_SIZE=50000 bytes | ARCHIVED=2026-08-16 | AGENT_OPTIMIZED=2026-09-09

## 归档原则
能删就删。冗余/死索引/完全覆盖→删除(git可恢复)；用户历史原话/实验原始数据/可复用工具→保留。与research_tree/_archive_rejected一致，归档≠否决，表示当前不作设计依据。

## 清理记录
DELETED: 知识组织调研/README.md(过时指路索引) | 图工程调研/02-资料索引.md(外部链接清单) | 图工程调研/存储选型调研/(汇入research_tree存储选型v1.3) | 深度调研树/_archive_v2/(废弃v2手工多会话框架) | 图工程调研/M08实验-*/tmp/(53M临时JSON/Python计算产物) | 图工程调研/M08实验-*/obsidian/(548K Obsidian笔记冗余)
SIZE_REDUCTION: 63M→9.8M

## 目录结构

### 图工程调研/ (9.7M)
USER_HISTORICAL_QUOTES: 07-M08历史想法打捞.md (73KB, 899行) — 用户28个历史会话中M08相关原话，含五层塔/七维评估/载体必须保住的东西，标注【用户主张】【当时结论】【提出后被放弃】
M08实验-Apostol微积分卷1/ (1.5M, 164文件) — Apostol《Calculus Vol1》ch10实验原始数据：data/(audit-edges.md审计边/audit-nodes.md审计节点/merge-log.md合并日志) | report/(实验报告.md) | source/ch10/(10.01-10.21.md源文本21个章节)
M08实验-第15章分层图谱/ (7M) — Apostol ch15分层有向图实验：data/(ID-MANIFEST.md 829行ID清单/inherited/继承L1底座/graveyard/墓地恢复记录) | report/(共享引文清单.md 4468行326KB/审查-形式B-D系列/裁定-ADJ系列/待应用-提案/SPEC缺陷-锚点规则量化.md) | source/(apostol-ch15/15.01-15.16源文本/strang-ch3-4/跨教材对比源文本) | tools/(Python脚本14个) | SPEC.md(抽取契约：关系词表9+1/节点类型4/id命名空间/锚点规则)
M08实验-跨教材不变量/ (1.7M) — 跨教材对齐实验：align/(对齐结果) | data/(实验数据) | report/(审查报告) | source/(strang-ch3-4源文本与M08实验-第15章分层图谱/source重复) | tools/(Python脚本) | SPEC.md | tmp_build_s3b.py

### 深度调研树/ (60K)
README.md — 引擎v3说明：主对话当总控/Workflow当执行引擎/state.json当唯一事实源，状态机queued→running→submitted→accepted→archived，v2废弃原因(四份运行时状态从未真维护/强依赖人当执行器/无断点续跑)，知识载体主线V1-V7全accepted到叶归档，下阶段模块组合设计
_engine/ — 引擎机制(已休眠)：ENGINE.md总纲 | prompts/(E-RES调研员/E-AUD审计员/E-SYN汇总员/E-COM对比员) | workflows/(run_batch.js调研→审计流水线/run_proto.js原型实测)
运行时产出→research_tree/: findings/(调研发现) | audit/(审计结论) | synthesis/(合成稿/决策点终稿人最终读这层) | 总目录.md(目录结构/保留删除状态/收口说明)

## 文件大小分布
>100KB(10): 共享引文清单.md(327KB) | _综合-摘要对照表.md(134KB) | ch10-full-raw.md(121KB) | 待应用清单-v2.md(103KB) | _捞回-裁定员推理原文.md(96KB) | 审查-形式D-D2.md(82KB) | 审查-形式B-共享引文.md(73KB) | 07-M08历史想法打捞.md(73KB) | 审查-形式D-D1-片31-56.md(72KB) | 审查-形式D-D1.md(68KB)
50-100KB(28): ID-MANIFEST.md(67KB) | 审查-形式D-D3系列 | 裁定-ADJ系列 | 待应用-提案/A5-CX2与origin.md等
<50KB(254): 审查报告片段/待应用提案/源文本章节/工具脚本

## 实验结论访问路径
M08图工程底层表示 — 用户历史诉求:07-M08历史想法打捞.md → 技术选型产出:research_tree/synthesis/M08-知识图存储v1.3-终稿.md → 实验原始数据:M08实验-Apostol微积分卷1/M08实验-第15章分层图谱/M08实验-跨教材不变量 → 锚点校验盲区:memory/anchor-verification-blind-spot.md
深度调研树引擎 — 引擎机制:深度调研树/README.md+_engine/ → 调研产出:research_tree/synthesis/(LLM主线R14-R16/知识载体主线V1-V7) → 引擎状态:队列空/到叶归档/下阶段模块组合设计

## 关键概念速查
关系词表(M08): is-a | part-of | requires | implies | equivalent | contrasts | applies-to | generalizes | alias-of | other(必填rel_note)
节点类型(M08): concept | method | theorem | notation
id命名空间(M08): apostol: | strang: | d:(下延原子) | x:(跨教材对齐) | L2:-Ln:(抽象结构)
锚点规则(M08): anchors:[{file,quote}] 逐字连续子串 唯一硬校验
五层塔(用户主张ec248b75): 语言公式图像案例(证据和外部表征)→概念对象与适用边界→类型化关系约束和推导规则→机制变换和可执行过程→跨表述保持不变的知识逻辑结构
七维评估(用户主张ec248b75): 唯一性/组合性/可推理性/可验证性/动态更新能力/人类可解释性/跨表述稳定性
调研引擎状态机: queued→running→submitted→{accepted→archived | rejected→queued} | running--(超时/失联)→queued
收口条件: 队列空 且 无running 且 无rejected

## 待定事项(归档README原始记录)
图工程调研 — M08实验用书未列入学习/结论不直接当设计/数据暂留
深度调研树 — 调研引擎已休眠/主线到叶归档/队列空/下一步模块组合设计而非继续调研/需恢复引擎时从git找回

## 访问建议(agent)
读用户历史诉求 → 07-M08历史想法打捞.md (73KB一次读完)
查M08实验契约 → M08实验-第15章分层图谱/SPEC.md (5KB)
查M08实验ID清单 → M08实验-第15章分层图谱/data/ID-MANIFEST.md (67KB)
查M08实验审查报告 → M08实验-第15章分层图谱/report/(按形式B/D/裁定ADJ/待应用提案分类,单文件30-330KB)
查调研引擎机制 → 深度调研树/README.md (2KB) + 深度调研树/_engine/ENGINE.md
查调研终稿 → research_tree/synthesis/(非archive,在上级目录)
大文件(>100KB)先读前500行判断相关性再决定是否全读
