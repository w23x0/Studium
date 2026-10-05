# 06 · 经典 ITS 谱系：Cognitive Tutor / MATHia · AutoTutor · VanLehn 2011

> 状态：待定（2026-10-05 开讲，C–G 同一会话的第一组）。**参考材料，不作产品结论**。
> 对象：无代码；读论文、技术报告、综述。
> 要回答（README「待看」C 行）：成熟时间线；程序全控的上限与代价；从对话判学会的最早做法（要点是否由学生自己说出）；判断粒度细到哪一层才有收益。
>
> 材料：`A95` = Anderson, Corbett, Koedinger, Pelletier《Cognitive Tutors: Lessons Learned》J. Learning Sciences 4(2) 1995 · `CA95` = Corbett & Anderson, UMUAI 4 1995（knowledge tracing，OCR）· `VL11` = VanLehn, Educational Psychologist 46(4) 2011 · `VL07` = VanLehn 等《When are tutorial dialogues more effective than reading?》（2006-06 作者稿，出版版 Cognitive Science 31(1) 未核）· `Nye14` = Nye, Graesser, Hu《AutoTutor and Family》IJAIED 24(4) 2014 · `G05` = Graesser 等 FLAIRS 2005 · `P00` = Person 等 AAAI FS-00-01 · `P01` = Person 等 IJAIED 12 · `KF16` = Kulik & Fletcher RER 86(1) 2016 · `WWC16` = What Works Clearinghouse 2016 干预报告。关键引句已在抽取文本中抽查（A95 每条规则 10 小时、VL11 假说原话与表 1、Bloom 2σ 归于掌握学习、P00 AutoTutor-1/2 覆盖口径、G05 学习者须说出每条期望、VL07 对话优势条件、Nye14 内容压过交互）。

## 1. 技术核心

### 1.1 Cognitive Tutor / MATHia（程序全控 · 过程性技能）

| 项 | 内容 | 出处 |
| --- | --- | --- |
| 流程谁控制 | 程序：model tracing 判每一步是否落在认知模型（产生式规则）能产生的动作里；错误信息来自 bug 规则；帮助只在学生请求时逐级给；knowledge tracing 按技能档案选题，全部规则达标才进下一节 | `A95` p.171–172、187、199 |
| 理解不在导师里 | “acquisition of the declarative knowledge is relatively problem-free”；导师总在学生另有讲授的环境里用 | `A95` p.170–171 |
| 学会了怎么判 | BKT：每条规则两状态（会 / 不会）、无遗忘，四参数（初始会、每次机会学会、猜对、失误），步骤对错贝叶斯更新，0.95 算掌握；“Tests can be used to validate mastery decisions but do not enter into the mastery decisions.” | `CA95` p.260–262 |
| 判会 ≠ 实测会 | 达 0.95 的学生里实测 90% 正确的只占 56%；模型预测准确率 0.99，实测 0.86 | `CA95` Exp.4 |
| 自我解释 | 几何导师里解释步骤的学生理解与迁移更好；解释 = 从术语菜单选定理，程序可判（只读摘要 + 作者讲稿） | Aleven & Koedinger 2002 |
| 开发代价 | 作者原数：“10 hr or more per production rule”，高等数学“may not be economical or feasible”；常见“200 小时 / 教学小时”是后人转述（Murray 等），原文没有；几何三单元约 665 条规则 | `A95` p.203；Aleven 2010 p.46 |
| 作者自述教训 | 即时反馈原则“most controversial”；随学习调粒度“not notably successful”；放弃“导师 = 模仿人类”；解释性错误信息只加快进度、不改最终成绩；好评估都离不开深度参与的教师；适用于产生式成分多的领域，事实性课程不做 | `A95` p.181–203 |
| MATHia | 2016 HTML5 重写，“essentially the same”；掌握按节判、节间不继承；每节题数上限（常 25），超出强制升节（约 12% 的节）；建议软件约占课时 40% | Ritter & Fancsali 2016；Fancsali 2021 |
| 对大模型 | 2023-11 发布 LiveHint AI（聊天式提示，营销稿，无对照实验）；MATHia 本体仍称“symbolic and machine learning-based AI” | Carnegie Learning 新闻稿 / 博客 |

### 1.2 AutoTutor（对话判学会）

| 项 | 内容 | 出处 |
| --- | --- | --- |
| 一道题写什么 | 主问题、理想答案、2–10 条期望要点（expectation）、0–5 条误概念；由领域专家写（物理版：两位物理学家 + 一位认知科学家） | `G05` p.2；`Nye14`；`VL07` p.19 |
| 覆盖怎么算 | 学生发言与期望的 LSA 余弦 ≥ 阈值（各版本 0.40–0.75）；后改 LSA + 正则 + 加权词重叠混合 | `G05` p.2；`Nye14` |
| 谁说出才算 | AutoTutor-1：学生或导师说出都算；AutoTutor-2：只算学生说的，“forces the student to articulate the explanations in their entirety, an extreme form of constructivism”；后期：“requires that the learner articulate each of the expectations before it considers the question answered” | `P00` p.5；`G05` p.2 |
| 流程谁控制 | 规则：五步框架（问 → 答 → 简评 → 协作改进 → 确认理解）外层，15 条模糊产生式规则选对话动作；递进 pump → hint → prompt → assertion，覆盖即停 | `Nye14`；`P01` p.7–9 |
| 可靠度 | LSA 与专家整体评分 r≈0.50，专家之间约 0.65；逐条期望 r 从 0.12 到 0.71，“difficult to predict a priori” | `G05` p.3–5 |
| 代价 | 学生初答常只有一两句；两轮“提示 → 追问 → 导师说出”让学生烦，放弃；误概念“even experts have trouble anticipating”；阈值靠迭代调 | `G05` p.1；`Nye14` |
| 后期分支 | Guru：把辅导与应用混在一起，“provide practice and also diagnose” | `Nye14` |
| 对大模型 | Hu, Xu, Tong, Graesser 2025 愿景文：GPT-4 + JSON 跟踪期望 / 误概念，无实验数据 | arXiv 2501.06682 |

### 1.3 VanLehn 2011：粒度与收益

| 项 | 内容 | 出处 |
| --- | --- | --- |
| 假说 | “the effectiveness of tutoring systems … increases as the granularity of interaction of the system decreases”；粒度 = 两次交互之间学生要做的推理量 | `VL11` p.202–204 |
| 效应量（对无辅导） | 答案级 0.31 · 步骤级 0.76 · 子步骤级 0.40 · 人类 0.79；人类对步骤级 0.21，子步骤对步骤 0.16 | `VL11` 表 1 p.208 |
| 结论 | 平台：人类 ≈ 子步骤 ≈ 步骤 > 答案；更细不再更好。解释：几种都让学生自己做出正确解，步骤级反馈已足够定位并自我修复错误 | `VL11` p.209–212 |
| Bloom 2σ | 主要来自更高的过关线（辅导组 90% vs 课堂掌握组 80%），“a demonstration of the power of mastery learning rather than human tutoring” | `VL11` p.210–211 |
| 局限 | 仅 STEM、有对错答案的任务、一对一；取效应最大的测验；排除 Carnegie Learning 研究 | `VL11` p.204–214 |

### 1.4 对话 vs 读书

| 项 | 内容 | 出处 |
| --- | --- | --- |
| 条件 | “The value of interactive tutoring over reading text is minimal or non-existent when: (1) content is controlled, and (2) students are required to answer questions as they study the text, and (3) the students are studying text written to their level”；只在牛顿力学里做过 | `VL07` p.12–13 |
| 优势在哪 | 新手学中等难度（最近发展区）材料时，真人辅导对等内容脚本 1.64σ；知识太高或太低都无差别 | `VL07`；`Nye14` |
| 内容压过交互 | “engaging with appropriate, relevant content dominates other factors such as modality and sometimes even interactivity”；AutoTutor 对读辅导脚本 −0.07σ | `Nye14` §Discussion |

## 2. 时间线

| 年 | 事件 | 出处 |
| --- | --- | --- |
| 1983 | LISP 导师、几何导师开工（先为检验 ACT* 理论） | `A95` p.171 |
| 1995 | knowledge tracing 发表；《Lessons Learned》 | `CA95`；`A95` |
| 1997 | AutoTutor 起步；匹兹堡代数评估：标准化测验约 +0.3 SD，本地测验 0.7–1.2 SD（二手） | `Nye14`；Ritter 2007 |
| 1998 | Carnegie Learning 成立 | 官网 |
| 2007 | `VL07` 对话 vs 读书 | — |
| 2011 | `VL11` 元分析；Apollo 收购 Carnegie Learning | — |
| 2014 | RAND 大规模随机试验（约 2.5 万人）：第一年无效，第二年高中显著（约 +8 个百分位）；`Nye14` 17 年综述 | Pane 等 2014（摘要） |
| 2016 | MATHia X；WWC 修订：代数“mixed effects” | `WWC16` |
| 2023–25 | LiveHint AI；AutoTutor 团队 LLM 愿景文 | 见上 |

## 3. 证据

| 项 | 内容 | 出处 |
| --- | --- | --- |
| ITS 总体 | 50 项评估中位 0.66 SD，但本地测验 0.73、标准化测验 0.13 | `KF16` |
| AutoTutor | 对读静态教材平均约 0.8σ（二手）；早期版本约 0.5σ，深层题 0.28σ | `Nye14` |
| Cognitive Tutor | 第三方大规模随机试验约 0.2 SD、第二年才有；WWC 判混合 | Pane 2014；`WWC16` |

## 4. 和我们对照：产品负责人的判断与 agent 分析

| 条 | 产品负责人 | agent 分析 | 归类 |
| --- | --- | --- | --- |
| 1.1 要点是否学生自己说出 | 期望要点类似 M05 给闭环定的结束判断边界；必须学习者自己说出才算成功，难就把边界收窄，但不降“自己说”；模型不直接提示、旁敲侧击逼学习者自己想；学习者烦躁是主动接受新知识的正常表现；只能靠模型自己的教学方式，不能用提示词强制旁敲侧击（之前犯过，会很奇怪）；没有可借的 | 同。守卫提示词已是 AutoTutor-2 的口径（只认学习者自己的输出，讲过后换自己方式重走算，附和照抄不算），差在按意思核对而非词语相似度。要分开看：“不直接提示”与闭环定义的“先讲理解、该讲就成段讲”——agent 理解为讲解可直讲、计入合上的输出须无提示产出。若是，守卫提示词缺“被一步步提示出来的不算”，记下，等 #8 恢复再处理 | 同 |
| 1.1b 讲过之后的检验标准 | 确认可以讲解：学习者自己推不出来、或考虑压力因素时可讲；但讲过的部分检验标准要提到很高才能通过 | 有旁证：Bloom 2σ 的大头来自过关线更高（90% vs 80%，`VL11` p.210–211）；判会 ≠ 实测会（`CA95`：达 0.95 的只有 56% 实测过关）。落到守卫：现在“讲过后换自己方式重走一遍”就算该步走通，按此应收紧——讲过的步，重述不够，要在新情境里独立用上才算；代价是闭环变长、学习者更烦，泄压口是 M05 收窄边界（产品负责人 1.1 已说）。只记下，等 #8 恢复改守卫 | 同；启示 → #8 |
| 1.2 对话比读书强在哪 | K12 的书本与结构很符合学生当下的基础和理解能力，K12 以上不好说；优势确实在闭环之间，闭环内可以按书本的学习结构学，有保底 | 对话本身强不了多少：内容对齐、读时也答题、材料按水平写时，辅导优势“minimal or non-existent”，只在材料略高于学习者水平时显出（`VL07`）；内容压过交互（`Nye14`）。对我们：单次闭环“不明显差于通用模型 + 教材”的标准定得对；对话赢在出发点做的事（从已会的点到稍远的新点）——同。新的一点：#8 对照实验的测试学习者应与书的目标读者知识面不一致（缺书默认的前置，或已会书里一部分），否则大概率比不出差别；产品负责人的 K12 分界说明测试材料该用 K12 以上（K&K 力学、线代已是）。要分开的一点（agent 推断）：闭环内按书走的保底，在 M05 选的出发点就是书的前置时最稳；出发点换成书外的（K12 以上常见），书的讲法不能直接套，闭环内保底落到模型自己的教学上 | 同；启示 → #8 |
| 1.3 程序全控的上限 | 我们不靠题目测，靠工程迁移、学习者自己讲解、从书里选题；开放的理解与迁移，除了模型还有什么办法检验？这个担心很奇怪 | 讲了：最成熟的程序全控系统，系统方自出测验中位 0.73、标准化测验 0.13（`KF16`），第三方大规模试验约 0.2 SD 且第二年才有（Pane 2014；`WWC16`）。agent 原想引出“要有不由自己出题打分的外部尺子”，产品负责人指出不成立。agent 收回：开放理解只能靠模型判，“不自评”的办法我们已有——守卫隔离、书本题、工程实际跑通（现实来判）、产品负责人真人试用；没有新东西 | 只作参考 |
