# B3b 时序 Datalog 变体（temporal Datalog / DatalogMTL / Datalog±）—— 分支调研发现

- 任务：深度调研树 B3 分支 R3 子任务 B3b（任务卡：B3b_时序Datalog）
- 调研员：B3b 分支调研员（独立 Codex 会话，共享工作区）
- 日期：2026-08-12
- 环境：Windows + PowerShell；网络抓取（直连 arXiv/KR/IJCAI 原文 PDF、Springer jina 摘录、DBLP/Crossref/Semantic Scholar 元数据、GitHub/PyPI 官方仓库页、官方文档页）
- 证据等级：A=原文到手并摘录（含官方摘要/文档页原文）；B=可靠二手或官方元数据（DBLP/Crossref/索引页可核，原文正文未到手）；C=明确标注的分析性归纳（推断）
- 原始证据存放：`research_tree\tmp\b3b\`（PDF/XML/JSON/MD/TXT 约 80 个文件）
- 边界：本分支只回答"带时间维度的 Datalog 变体能否直接表达 M09 复检/遗忘/重新掌握=新版本"；时间版本通用理论（独立于语言族的建模/版本管理）归 B4，此处仅作边界声明，不越界。

---

## 0 一句话结论

**DatalogMTL（含其否定/稳定模型扩展）能直接表达"带时间区间的派生结论"，从而可把 M09"复检/遗忘/重新掌握=新版本"建模为时间区间上的版本事实推进——"新证据导致旧派生撤回、重新掌握产生新版本区间"正是 DatalogMTL¬ 官方论文自己列举的牙医预约规则动机；完整 DatalogMTL 组合复杂度 EXPSPACE、数据复杂度 PSPACE-complete，但有限可物化片段不比普通 Datalog 难（ExpTime-complete），且已有 MeTeoR/Temporal Vadalog/DRedMTL/嵌入非时序引擎等多条实现路径；对 522 节点/1433 边这类个人规模，数据复杂度意义上的成本毫无压力，工程取舍集中在"要完整 DatalogMTL 语义（automata/周期物化）还是有限片段+否定后处理"以及"当前=最新版本"这一非单调当前视图需另配物化当前表/聚合/否定层（通用版本理论归 B4，推断 C）。**

---

## 1 逐条回答

### Q1. DatalogMTL 的定义与推理复杂度、标准/论文原文；是否允许"结论带时间区间"

- **定义出处**：DatalogMTL 由 Brandt 等人在 AAAI 2017（*Ontology-based data access with a Horn fragment of metric temporal logic*，AAAI Press，pp. 1070–1076）提出、并在 JAIR 2018（*Querying log data with metric temporal logic*，JAIR 62:829–877）形式化定义（引文清单见 IJCAI 2019 论文参考文献，B 级：原文正文未直接抓取，经多篇 A 级论文一致转述）。本次核到的最早**全文到手**的定义与复杂度论文是 Wałęga 等 *DatalogMTL: Computational Complexity and Expressive Power*（IJCAI-19，A 级）。
- **语法**（A 级，IJCAI 2019 原文）：DatalogMTL = 函数自由一阶词表上的规则 + MTL 算子；原子文字文法为 `A := α | ⊤ | ⊥ | ◇⁻_% A | ◇⁺_% A | ⊞_% A | ⊟_% A | A S_% A' | A U_% A'`，其中 % 为非空正区间；区间端点取自有理数 Q ∪ {−∞,+∞}（标准稠密语义），或整数（整数时间线语义，见 KR 2020）。
- **是否允许结论带时间区间**：**允许**。数据集由"时间事实"组成——KR 2020 原文："A dataset consists of facts involving intervals, such as `Temp(c, high)@[15, 21]`, stating that `Temp(c, high)` holds continuously in the interval [15, 21]."；规则头可带 MTL 算子，例如 KR 2026 银行反洗钱示例 `⊞[0,14]Susp(x) ← Trans(y,x) ∧ ◇⁻[0,5]Trans(x,y)` 使派生结论在**未来 14 天连续区间**成立。IJCAI 2019 亦定义了 generalised facts（原子 + 区间）作为事实形式。
- **推理复杂度**（A 级，IJCAI 2019 摘要原文）："We establish tight **PSpace data complexity** bounds"，并证明带输入谓词否定的 DatalogMTL 可表达所有 PSPACE 查询（"MTL operators add significant expressive power to Datalog"）；**组合复杂度 EXPSPACE-complete**（Brandt et al. 2018，经 IJCAI 2019 引言转述："who showed that it is EXPSPACE-complete in combined and P-hard in data complexity, assuming binary encoding of numbers"）。KR 2021 finitely 论文摘要复核："Consistency checking and fact entailment are of high complexity, namely ExpSpace-complete in combined complexity (Brandt et al. 2018) and PSpace-complete in data (Wałęga et al. 2019)"。

### Q2. 时序 Datalog（temporal Datalog）历史文献：时间参数化谓词、时态推理规则

- **Datalog1S**（Chomicki & Imieliński, *Temporal Deductive Databases and Infinite Objects*, PODS 1988）：时间排序 + 后继函数的时序 Datalog 鼻祖；KR 2020 摘要原文确认"DatalogMTL under integer semantics ... captures prominent temporal extensions of Datalog such as Datalog1S"。本次对 Datalog1S 原文仅核到 DBLP 元数据（DOI 10.1145/308386.308416，B 级），其被捕获关系由 KR 2020/KR 2021 两个 A 级论文背书。
- **Chomicki 综述**（*Temporal Query Languages: a Survey*，Springer LNCS，1994，据 PODS 1993 特邀教程；A 级页面原文到手）：给出时态数据库/时态查询语言的统一形式框架，明确列出"点 vs 区间；线性 vs 分支；稠密 vs 离散；有界 vs 无界时间"作为时态论域设计维度——这正好是"掌握状态用点还是区间建模"的理论选项集。
- **Statelog**（Lausen, Ludäscher & May, *On Active Deductive Databases: The Statelog Approach*, LNCS 1472, 1998；A 级页面原文到手）：**状态参数化谓词**先例——"A key idea of the approach is to add a state argument to every predicate: for example, `[s] p(x, y)` intuitively means that `p(x, y)` holds in state [s]"；把 Datalog 扩展到可定义更新/活动行为，是"版本参数化谓词"的直接历史先例。
- **Tuzhilin**（*Querying datalog programs with temporal logic*, Acta Informatica 30:679–700, 1993；A 级摘要 + B 级正文）：用时态逻辑查询 Datalog 程序，证明"in general, temporal logic queries have more expressive power than Datalog queries on Datalog and negated Datalog programs"。
- **Ronca 等**（*Stream Reasoning in Temporal Datalog*, arXiv:1711.04013, 2017；A 级摘要）：研究"Datalog extended with a temporal sort and the successor function"上的流推理，指出规则可把派生信息同时向过去与未来传播、答案可能依赖未到达的数据。
- **Temporal Datalog→⁻**（Mantenoglou 等, *Efficient Temporal Datalog Materialisation for Composite Event Recognition*, arXiv:2605.02488, 2026-05；A 级摘要）：把复合事件语言映射到"带分层否定、无未来依赖的时序 Datalog"，并提出 Streaming Trigger Graphs 支持流式物化——说明"分层否定 + 时序 Datalog"在现代流推理中仍是活跃工程路线。

### Q3. 这些变体有没有实现（推理器/库）与工程先例，还是停留在理论？

**结论：已从理论走向实现，但"完整 DatalogMTL"的实用覆盖仍在快速演进，且各实现覆盖范围不一致（不做性能比较，红线遵守）。**

- **MeTeoR**（AAAI 2022 + TPLP 期刊版；A 级全文到手）：首个面向完整 DatalogMTL 语言的实用推理器，物化（forward chaining）+ automata 混合；论文报告可处理"tens of millions of temporal facts"（数据集规模量级，A 级原文）；以 `meteor-reasoner` 发布在 PyPI（2.0.0，A 级元数据）；GitHub 仓库公开程序/数据集/复现脚本（A 级 README）。
- **Temporal Vadalog**（RuleML+RR 2022 论文 → TPLP 2025 期刊版；A 级 arXiv 全文 + Crossref 元数据）：意大利银行（Bank of Italy）+ TU Wien + Oxford 合作的系统，面向生产环境；论文讨论"guarantee termination when infinitely many time intervals are possibly generated, how to merge intervals, and how to sustain a limited memory footprint"；用例含金融监管（significant share → watch company）。
- **DRedMTL**（AAAI 2026；A 级 arXiv 全文 + GitHub README）：DatalogMTL 物化的**增量维护**算法（插入/删除更新），基于经典 DRed，用"facts + periodic intervals"表示物化。
- **其他工程化进展**：Seminaïve materialisation（arXiv 2208.07100）；Magic Sets for DatalogMTL（AAAI 2025 仓库）；DatalogMTL^FP 有限表示（arXiv 2109.10691）；**KR 2026 把 DatalogMTL 嵌入非时序 Datalog**（Nemo/EYE/Eyelet 实验，A 级全文）。
- **覆盖面缺口**：MeTeoR 官方演示站自述"Sorry, we currently do not support recursive programs with unbounded intervals"（A 级页面）；MeTeoR TPLP 版转述 Vadalog 时态扩展"implements the full DatalogMTL language, but without termination guarantees"（A 级原文）。因此"有实现"≠"全语言无死角"，引用/选型时必须按片段核实。

### Q4. "当前掌握状态=最新版本"这类非单调当前视图，在时序 Datalog 里如何表达（版本谓词 + 时间参数 vs 物化当前表）？

- **版本谓词 + 时间参数（区间事实）**：把 M09 建模为 `MasteredVersion(x, v)@[t_start, t_end)` 区间事实序列。复检成功在时刻 t 产生新版本 v′，规则头带 MTL 算子把新版本区间写进未来（如 `⊞[0,τ] MasteredVersion(x, v′) ← RecheckOK(x)@t ∧ version(x, v)@t ∧ v′ = next(v)`）。"遗忘"= 旧版本区间在 t 结束、不再被规则维持；"重新掌握"= 新版本区间开启。**正向推进部分在无否定的 DatalogMTL 中即可表达（单调）**。
- **撤回 = 需要否定/稳定模型**：DatalogMTL 正片段单调，无法表达"新证据使旧派生**撤回**"。KR 2021 稳定模型论文的官方动机句（A 级原文）："This extension paves the way for the use of DatalogMTL in applications where derived information can be **retracted** in light of new evidence, minimality of models is required, or temporal inertia rules need to be formalised."，并给出牙医预约规则 `⊞1 Appoint(x) ← Appoint(x) ∧ not ⊟(0,1) Appoint(x)`——"预约一年后自动复查，若期间又预约则取消"，与 M09"复检出新版本→旧掌握被覆盖/撤回"同构。
- **物化当前表**：`currentMastered(x, v)` 作为**非时序物化视图**由后处理/分层否定/聚合维护（如 `currentMastered(x, v) ← MasteredVersion(x, v)@[t1,t2) ∧ t1 = max(...)` 或外部增量维护，DRedMTL 即这类"物化 + 增量"工程路线）。这一分工在文献中没有单一权威改写，属**工程选择**（C 级推断）：时态层负责版本历史与区间推进，当前视图由物化/聚合层负责。
- **结论**：M09 的"复检/遗忘/重新掌握=新版本"在时序 Datalog 家族中**可直接表达**（历史 + 新版本区间 = 单调部分；撤回旧版本 = 否定/稳定模型部分；当前=最新 = 物化当前表/聚合部分）。"最新版本的全局唯一选择"在周期表示下如何精确保义未见专门文献（未决，见第 4 节），通用版本理论归 B4。

### Q5. 对个人规模（522 节点/1433 边），引入时间维 Datalog 的复杂度是否合理——理论能力 vs 工程成本（以文献与实现为据）

- **理论复杂度按数据量计**：DatalogMTL 的 PSPACE/EXPSPACE 界限是"数据复杂度/组合复杂度"（A 级，IJCAI 2019 摘要 + KR 2021 finitely 摘要）。数据复杂度指随**输入数据集大小**（ground 事实/时间点数）增长；对 522 节点/1433 边且时间戳数量有限的个人项目，输入规模处于极小端，数据复杂度意义上的运行成本完全可控（C 级综合：这是复杂度理论的自然推论，非实测）。
- **有限可物化片段不比 Datalog 难**：KR 2021 finitely 摘要原文："fact entailment over finitely materialisable bounded programs is ExpTime-complete, and hence **no harder than Datalog reasoning**"——若工程上把 M09 规则限定在有界区间/有限可物化程序，理论复杂度不构成否决。
- **工程成本的真实来源**：不是节点数，而是 (a) 是否要完整 DatalogMTL 语义（递归 + 无界区间需要 automata/周期物化，MeTeoR 演示站明示不支持递归+无界区间，A 级）；(b) 是否需要撤回/否定语义（KR 2021：整数时间线上 EXPSPACE，forward-propagating 片段 PSPACE-complete，A 级）；(c) 当前视图与增量更新（DRedMTL 提供插入/删除维护，A 级）。KR 2026 证明可把 DatalogMTL 嵌入**非时序 Datalog** 并保留蕴含/一致性/有限可物化性（A 级），意味着个人项目可以不引入专用时态引擎。
- **综合判断（C 级推断）**：522/1433 规模下引入时间维 Datalog 在理论能力与数据复杂度上合理；工程成本由所选片段与可用实现决定，MeTeoR(PyPI)/嵌入非时序引擎/有限片段三种路径都有已发表实现支撑。若 M09 仅需"版本历史 + 单调推进"，无否定 DatalogMTL 或普通 Datalog+时间参数即可；若需要"撤回旧掌握"，需 DatalogMTL¬（稳定模型）或物化当前表 + 增量维护。

---

## 2 关键发现

### F1. DatalogMTL 定义：Datalog + MTL 算子，事实与结论都带时间区间
- 论断：DatalogMTL 把 MTL 算子（⊞/⊟/◇⁻/◇⁺/S/U，区间端点有理数或整数）嵌入 Datalog 规则；数据集是"原子事实 @ 区间"，规则头可写区间结论。
- 来源：*DatalogMTL: Computational Complexity and Expressive Power*（IJCAI-19 论文全文 PDF）
- URL：https://www.ijcai.org/Proceedings/2019/0261.pdf
- 机构：Department of Computer Science, University of Oxford（+ University of Warsaw）；会议 IJCAI-19
- 日期：2019-08（IJCAI-19 会议）
- 原文摘录："DatalogMTL is an extension of Datalog with metric temporal operators... `⊞[k1;k2]φ` and `◇[k1;k2]φ`, with k1 and k2 rational numbers, which hold at time t if φ holds at each and some, respectively, moment in the time interval [t−k2; t−k1]."；"A dataset consists of facts involving intervals, such as `Temp(c, high)@[15, 21]`, stating that `Temp(c, high)` holds continuously in the interval [15, 21]."（后者为 KR 2020 同款句式，见 F3）
- 等级：A

### F2. 复杂度：数据 PSPACE-complete；组合 EXPSPACE-complete；MTL 算子显著增加表达力
- 论断：DatalogMTL 事实蕴含数据复杂度 PSPACE-complete（IJCAI 2019 证明）；组合复杂度 EXPSPACE-complete（Brandt et al. 2018）；带输入否定时可表达全部 PSPACE 查询。
- 来源：同上（IJCAI 2019 摘要与引言）；Brandt 等 2018 *Querying log data with metric temporal logic*（JAIR 62:829–877）经 IJCAI 2019 转述
- URL：https://www.ijcai.org/Proceedings/2019/0261.pdf ；Brandt 2018 元数据经 DBLP（https://dblp.org/rec/journals/jair/BrandtKRXZ18.html，B 级）
- 机构：University of Oxford（IJCAI 2019）；Brandt 等为 Birkbeck/U. Manchester 等（未核机构列表，仅列论文）
- 日期：2019-08 / 2018
- 原文摘录："We establish tight PSpace data complexity bounds and also show that DatalogMTL extended with negation on input predicates can express all queries in PSpace; this implies that MTL operators add significant expressive power to Datalog."；"who showed that it is EXPSPACE-complete in combined and P-hard in data complexity, assuming binary encoding of numbers"
- 等级：A（IJCAI 2019 到手）；B（Brandt 2018 转述）

### F3. 整数时间线语义：捕获 Datalog1S，命题片段 NC¹-complete
- 论断：DatalogMTL 可解释在整数时间线上（而非稠密有理数）；该语义捕获 Datalog1S；命题片段复杂度降到 NC¹-complete（并行可处理）。
- 来源：*DatalogMTL over the Integer Timeline*（KR 2020 论文全文 PDF）
- URL：https://proceedings.kr.org/2020/79/kr2020-0079-walega-et-al.pdf
- 机构：Department of Computer Science, University of Oxford
- 日期：2020-09（KR 2020）
- 原文摘录："DatalogMTL under integer semantics is an interesting KR language: on the one hand, one can often assume the integer timeline in applications; on the other hand, it captures prominent temporal extensions of Datalog such as Datalog1S."；"A dataset consists of facts involving intervals, such as `Temp(c, high)@[15, 21]`..."; "complexity drops from P-hard to NC1-complete for the propositional fragment"
- 等级：A

### F4. 否定 + 稳定模型：官方明言"派生信息可被新证据撤回"；牙医规则即"新版本取代旧掌握"
- 论断：DatalogMTL¬（稳定模型否定）的论文动机就是"新证据撤回旧派生 + 时态惯性规则"，其牙医预约示例与 M09"复检产生新版本、旧掌握被撤回"同构；复杂度：有理数上不可判定，整数上 EXPSPACE（forward-propagating 片段 PSPACE-complete）。
- 来源：*DatalogMTL with Negation under Stable Models Semantics*（KR 2021 论文全文 PDF）
- URL：https://proceedings.kr.org/2021/58/kr2021-0058-walega-et-al.pdf
- 机构：University of Oxford + University of Oslo
- 日期：2021-11（KR 2021）
- 原文摘录："This extension paves the way for the use of DatalogMTL in applications where derived information can be retracted in light of new evidence, minimality of models is required, or temporal inertia rules need to be formalised."；"consider a dental practice with the policy that patients with an appointment on a given time t are automatically booked for a check-up appointment one year later ... but this appointment must be cancelled if the patient makes another appointment in between"；规则 `⊞1 Appoint(x) ← Appoint(x) ∧ not ⊟(0,1) Appoint(x)`；"reasoning becomes undecidable over the rationals and decidable in EXPSPACE in data complexity over the integers"；"reasoning becomes PSPACE-complete and so, no harder than for negation-free DatalogMTL"（forward-propagating）
- 等级：A

### F5. 有限可物化片段：ExpTime-complete，"不比 Datalog 难"
- 论断：对有限可物化（bounded）程序，事实蕴含 ExpTime-complete，复杂度不比普通 Datalog 高——这是"时间维 Datalog 可行片段"的最强理论背书。
- 来源：*Finitely Materialisable Datalog Programs with Metric Temporal Operators*（KR 2021 论文全文 PDF）
- URL：https://proceedings.kr.org/2021/59/kr2021-0059-walega-et-al.pdf
- 机构：University of Oxford
- 日期：2021-11（KR 2021）
- 原文摘录："We finally show that fact entailment over finitely materialisable bounded programs is ExpTime-complete, and hence no harder than Datalog reasoning."；"reasoning algorithms for recursive fragments of DatalogMTL are automata-based and not well suited for practice"
- 等级：A

### F6. MeTeoR：完整 DatalogMTL 实用推理器的实现先例（PyPI 分发 + 千万级时态事实实验）
- 论断：MeTeoR 是首个面向完整 DatalogMTL 的实用推理器（物化 + automata 混合），论文报告可处理千万级时态事实；以 meteor-reasoner 分发于 PyPI；其官方演示站明示"递归 + 无界区间"暂不支持。
- 来源：*MeTeoR: Practical Reasoning in Datalog with Metric Temporal Operators*（arXiv:2201.04596，AAAI 2022 版）；*Practical Reasoning in DatalogMTL*（arXiv:2401.02869，TPLP 期刊扩展版）；PyPI https://pypi.org/project/meteor-reasoner/ ；GitHub https://github.com/wdimmy/DatalogMTL_Practical_Reasoning ；演示站 https://datalogmtl.github.io/
- 机构：University of Oxford + Shanghai Jiao Tong University
- 日期：2022-01-12（arXiv v1）；TPLP 正式版 2025（DBLP：TPLP 25(2):225–255, DOI 10.1017/S1471068424000164）
- 原文摘录："Our experiments show that MeTeoR is a scalable system which enables reasoning over complex temporal rules and datasets involving tens of millions of temporal facts."（AAAI 2022 摘要）；演示站："Sorry, we currently do not support recursive programs with unbounded intervals."
- 等级：A

### F7. Temporal Vadalog：生产导向的 DatalogMTL 系统（Bank of Italy 场景），TPLP 2025
- 论断：Temporal Vadalog 面向生产环境的时态 Datalog 推理器，讨论终止（无限区间生成）、区间合并、内存占用；用例为金融监管（significant share → watch company）；期刊版 2025 发表于 TPLP。
- 来源：*The Temporal Vadalog System: Temporal Datalog-based Reasoning*（arXiv:2412.13019，TPLP 扩展版全文 PDF）；Crossref 元数据 DOI 10.1017/S1471068425000018（TPLP 2025-03）
- URL：https://arxiv.org/abs/2412.13019 ；https://doi.org/10.1017/s1471068425000018
- 机构：Bank of Italy；TU Wien；University of Oxford
- 日期：arXiv 2024-12-17；TPLP 2025-03
- 原文摘录："We discuss crucial architectural choices, such as how to guarantee termination when infinitely many time intervals are possibly generated, how to merge intervals, and how to sustain a limited memory footprint."；"This work aims to bridge the gap between the theoretical studies of DatalogMTL ... and the development of production-ready reasoning systems."
- 等级：A（arXiv 全文）；B（Crossref 期刊元数据）

### F8. DRedMTL：DatalogMTL 物化的增量维护（插入/删除、周期表示）
- 论断：AAAI 2026 提出 DRedMTL——DatalogMTL 物化的增量更新算法，支持动态插入/删除，物化表示为"有限事实集 + 周期区间"；代码与数据集公开。
- 来源：*Incremental Maintenance of DatalogMTL Materialisations*（arXiv:2511.12169，AAAI-26）；GitHub https://github.com/Horizon12275/DREDmtl-for-DatalogMTL
- 机构：Shanghai Jiao Tong University + University of Oxford
- 日期：2025-11（arXiv）；AAAI 2026（DBLP 元数据：DOI 10.1609/AAAI.V40I23.39025）
- 原文摘录："a DatalogMTL materialisation has to be represented as a finite set of facts plus periodic intervals indicating how the full materialisation can be constructed through unfolding. To cope with this, our algorithm is equipped with specifically designed operators to efficiently handle such periodic representations."
- 等级：A

### F9. KR 2026：把 DatalogMTL 嵌入非时序 Datalog（Nemo/EYE/Eyelet），保留关键语义
- 论断：存在从 DatalogMTL 到"带算术的非时序 Datalog"的忠实翻译，保持蕴含/一致性/有限可物化性，从而不必专用时态引擎；论文以 Nemo、EYE、Eyelet 三个非时序引擎实验验证（本分支不比较性能）。
- 来源：*Efficient Temporal Reasoning with Non-Temporal Engines: Embedding DatalogMTL into Datalog*（KR 2026 全文 PDF）
- URL：https://proceedings.kr.org/2026/73/kr2026-0073-van-noort-et-al.pdf （DBLP DOI 10.24963/KR.2026/73 复核：https://doi.org/10.24963/kr.2026/73）
- 机构：IDLab, Ghent University-imec；Queen Mary University of London
- 日期：2026（KR 2026）
- 原文摘录："As we prove, the translation preserves key semantic properties such as entailment, consistency, and finiteness of materialisability. As a result, we obtain a faithful embedding of DatalogMTL into classical Datalog, enabling complex temporal reasoning tasks to be executed without the need for specialised temporal reasoning engines. We implement and evaluate this translation using three state-of-the-art Datalog systems: Nemo, EYE, and Eyelet."
- 等级：A

### F10. 历史时序 Datalog：Datalog1S、Chomicki 综述、Statelog 状态参数谓词、Tuzhilin 时态查询
- 论断：时间参数化谓词与"状态/版本参数"在 1988–1998 已有明确先例：Datalog1S（时间排序+后继）、Statelog（[s]p(x,y) 状态参数）、Chomicki 综述（点 vs 区间/稠密 vs 离散设计维度）、Tuzhilin（时态逻辑查询 Datalog 程序）。
- 来源：Chomicki & Imieliński PODS 1988（DBLP 元数据，B）；Chomicki *Temporal Query Languages: a Survey*（Springer LNCS 1994，jina 页面全文，A）；Lausen/Ludäscher/May *On Active Deductive Databases: The Statelog Approach*（LNCS 1472, 1998，jina 页面全文，A）；Tuzhilin *Querying datalog programs with temporal logic*（Acta Informatica 30, 1993，Springer 页面含摘要，A-摘要/B-正文）
- URL：https://link.springer.com/chapter/10.1007/bfb0014006 ；https://link.springer.com/chapter/10.1007/bfb0055496 ；https://link.springer.com/article/10.1007/BF01191723 ；https://doi.org/10.1145/308386.308416
- 机构：Kansas State University（Chomicki）；Universität Freiburg（Statelog）；New York University（Tuzhilin）
- 日期：1988 / 1994（据 PODS 1993 教程）/ 1998 / 1993
- 原文摘录（Statelog）："A key idea of the approach is to add a state argument to every predicate: for example, `[s] p(x, y)` intuitively means that `p(x, y)` holds in state [s]."；原文摘录（Chomicki 综述）："choice of temporal domains: points vs. intervals; linear vs. branching, dense vs. discrete, bounded vs. unbounded time"；原文摘录（Tuzhilin 摘要）："Temporal logic queries on Datalog and negated Datalog programs are studied... temporal logic queries have more expressive power than Datalog queries"
- 等级：A（综述/Statelog/Tuzhilin 摘要页）；B（Datalog1S 仅元数据，捕获关系由 F3 的 A 级论文背书）

### F11. Datalog±：存在量词规则头 + 约束的**非时态**扩展（候选查证结论）
- 论断：Datalog± 是"存在量化规则头 + 可处理约束"的本体查询扩展家族，**本身不是时态扩展**；它与时序 Datalog 正交。Temporal Vadalog 论文引用 Datalog± 时亦仅指存在量词/聚合扩展家族。
- 来源：Calì, Gottlob, Lukasiewicz, *Datalog±: a unified approach to ontologies and integrity constraints*（ICDT 2009，ACM）；Semantic Scholar 官方摘要（JSON 到手）
- URL：https://doi.org/10.1145/1514894.1514897
- 机构：University of Oxford（Gottlob/Calì）；TU Wien（Lukasiewicz）
- 日期：2009-03-23（ACM 出版日期，Crossref）
- 原文摘录："Datalog± is derived from Datalog by allowing existentially quantified variables in rule heads, and by enforcing suitable properties in rule bodies, to ensure decidable and efficient query answering. ... We finally show how stratified negation can be added to Datalog± while keeping ontology querying tractable in the data complexity."
- 等级：A（官方摘要到手）；补充：未核到名为"Datalog± 时态扩展"的权威独立体系（C 级推断：时间维度在 Datalog± 文献中非一阶特性）

### F12. Soufflé / RDFox 时态扩展核验（负面证据）
- 论断：Soufflé 官方类型文档只列 symbol/number/unsigned/float/record/ADT，**无原生时态类型**（时间需用 number 参数列自行建模，推论 C）；RDFox 官方文档目录页未见 temporal 专章（文档目录 A 级到手；"无原生时态模块"为负面证据推断 C）。
- 来源：Soufflé 官方类型文档 https://souffle-lang.github.io/types ；RDFox 文档目录 https://docs.oxfordsemantic.tech/
- 机构：Soufflé（souffle-lang 官方文档，维护者 Sulzmann/ Scholz 团队）；RDFox（Oxford Semantic Technologies）
- 日期：抓取于 2026-08-12（页面未标版本日期）
- 原文摘录（Soufflé）："Soufflé has four primitive types: Symbol type: symbol; Signed number type: number; Unsigned number type: unsigned; Float number type: float."；原文摘录（RDFox TOC）：目录含 Reasoning / Transactions / Persistence 等章节，未见 temporal 命中文档条目。
- 等级：A（两页原文到手）；"无时态特性"结论 = C（负面证据推断，未核源码/发布说明全文）

### F13. 周期/有限表示：DatalogMTL^FP 与 Seminaïve——"无限时间物化"的工程化路径
- 论断：DatalogMTL 物化可无限；文献给出三类有限表示（有限模型/最终常值/最终周期）并证明覆盖 DatalogMTL^FP；Seminaïve 物化保证每条规则实例至多考虑一次——这是"时间版本推进"工程化的底层技术。
- 来源：*Query Evaluation in DatalogMTL – Taming Infinite Query Results*（arXiv:2109.10691）；*Seminaïve Materialisation in DatalogMTL*（arXiv:2208.07100）
- URL：https://arxiv.org/abs/2109.10691 ；https://arxiv.org/abs/2208.07100
- 机构：Banca d'Italia + TU Wien + University of Oxford（前者）；University of Oxford + SJTU（后者）
- 日期：2021-09 / 2022-08
- 原文摘录（2109.10691 摘要）："we investigate finite representations of DatalogMTL models... infinite models that are eventually periodic and show that such representation encompasses all DatalogMTL FP programs... provide a novel algorithm for reasoning over such finite representable programs."；原文摘录（2208.07100 摘要）："ensuring that each temporal rule instance is considered at most once during the execution of the algorithm"
- 等级：A（摘要与引言到手；正文细节未逐段细读——相关深度论断仅限摘要覆盖范围）

### F14. 2026 新进展：Temporal Datalog→⁻（分层否定、无未来依赖）与流式物化
- 论断：2026 年仍有新工作把"分层否定 + 无未来依赖的时序 Datalog"用于复合事件识别并给出流式物化（Streaming Trigger Graphs），说明时序 Datalog 工程路线持续活跃。
- 来源：*Efficient Temporal Datalog Materialisation for Composite Event Recognition*（arXiv:2605.02488）
- URL：https://arxiv.org/abs/2605.02488
- 机构：未在摘要标注（作者 Mantenoglou，Periklis；疑 TU Wien，未核）
- 日期：2026-05-04（arXiv v1）
- 原文摘录："we map practical fragments of prominent event specification languages into Temporal Datalog→⁻, a temporal Datalog with stratified negation and no future dependencies. To support efficient stream reasoning over Temporal Datalog→⁻, we propose Streaming Trigger Graphs, an extension of a state-of-the-art technique for Datalog materialisation."
- 等级：A（官方摘要到手）

---

## 3 冲突与张力

- **T1 完整 DatalogMTL 高复杂度 vs 实用片段低复杂度**：全语言组合复杂度 EXPSPACE（F2），但有限可物化片段 ExpTime-complete"不比 Datalog 难"（F5）、命题片段 NC¹（F3）、forward-propagating 片段数据复杂度 PSPACE-complete（F4）。两者都是 A 级原文，说明"时间维 Datalog 复杂吗？"的答案取决于片段选择——这是任务卡 Q5 的核心张力。
- **T2 撤回语义的判定性随时间论域剧变**：DatalogMTL¬（稳定模型）在有理数时间线上不可判定，在整数时间线上 EXPSPACE（F4 原文："reasoning becomes undecidable over the rationals and decidable in EXPSPACE in data complexity over the integers"）。M09 若需要"撤回旧掌握"，必须先选定时间论域；整数/离散时间线是工程默认（个人复检记录天然离散）。
- **T3 "有实现"与"全语言覆盖"不一致**：MeTeoR 面向完整 DatalogMTL 但演示站自述不支持"递归 + 无界区间"（F6）；Vadalog 时态扩展被 MeTeoR TPLP 版转述为"实现完整 DatalogMTL 但无终止保证"（F6/F7）。因此"有工程先例"不能简化为"任意规则都能跑"，引用时须带片段限定。
- **T4 Datalog± 常被当作候选，但并非时态扩展**：Datalog± 的"±"指存在量化规则头与约束（F11），时间维度在其框架中不是一阶特性；把 Datalog± 当作"时序 Datalog 变体"是常见混淆，本分支查证后如实区分。
- **T5 版本历史（可表达）vs 最新视图（非单调）**：DatalogMTL 正片段单调，历史区间推进可表达；但"当前=最新版本"要求全局最大/最新选择，需要否定/聚合/物化当前表（Q4）。文献对"最新"的表述散见于稳定模型（撤回）与物化维护（DRedMTL），没有单一权威改写——这是语义层与视图层的固有分工，不是实现缺陷。

---

## 4 未决

1. **"当前=最新版本"在周期物化表示下的精确定义**：F8/F13 表明物化可表示为"事实 + 周期区间"，但"最新版本"如何在这种表示上被查询/维护未见专门文献（C 级推断缺口）。
2. **RDFox 发布版是否有原生时态扩展**：官方文档目录无 temporal 专章（F12），但目录页不等于完整特性清单；发布说明/源码未核。结论只可作"未发现原生时态文档"，不可断言"绝无"。
3. **Temporal Vadalog 的公开可用性/许可**：论文与 arXiv 全文到手（F7），但未核到公开源码仓库/二进制分发（GitHub 搜索未命中官方仓库，"未核"）。
4. **KR 2026 嵌入翻译的覆盖边界**：摘要与引言到手（F9），翻译对无限区间、周期表示、否定/稳定模型的覆盖程度未逐段细读（"未核"细读层面）。
5. **MeTeoR 生产级成熟度**：PyPI 2.0.0 与论文存在（F6），但"递归+无界区间"限制的正式支持路线图未核。
6. **中文关键词检索基本无有效命中**：任务卡给定中文检索词（DatalogMTL 时态 逻辑 推理 / 时序 Datalog 时间参数 / Datalog 版本 状态 时间 / Datalog± 时态 扩展）在本环境搜索引擎受限下未核到高质量中文文献；中文社区综述未核（不影响英文证据链完整性）。

---

## 5 来源清单

（等级：A=原文到手并摘录；B=官方元数据/可靠二手；C=分析推断。共 27 条可核来源，类型 ≥3 类：学术论文/官方文档/书目元数据。）

| # | 来源（标题 / 机构 / 日期） | URL | 类型 | 等级 |
|---|---|---|---|---|
| 1 | Wałęga 等, *DatalogMTL: Computational Complexity and Expressive Power*, IJCAI-19, 2019-08 | https://www.ijcai.org/Proceedings/2019/0261.pdf | 会议论文 | A |
| 2 | Brandt 等, *Ontology-based data access with a Horn fragment of metric temporal logic*, AAAI 2017（DatalogMTL 提出处，经 IJCAI 2019 参考文献转述） | 经 IJCAI 2019 参考文献（B） | 会议论文 | B |
| 3 | Brandt 等, *Querying log data with metric temporal logic*, JAIR 62:829–877, 2018（DatalogMTL 形式化定义/EXPSPACE 出处，经 IJCAI 2019 转述） | https://dblp.org/rec/journals/jair/BrandtKRXZ18.html | 期刊论文 | B |
| 4 | Wałęga 等, *DatalogMTL over the Integer Timeline*, KR 2020, 2020-09 | https://proceedings.kr.org/2020/79/kr2020-0079-walega-et-al.pdf | 会议论文 | A |
| 5 | Wałęga 等, *DatalogMTL with Negation under Stable Models Semantics*, KR 2021, 2021-11 | https://proceedings.kr.org/2021/58/kr2021-0058-walega-et-al.pdf | 会议论文 | A |
| 6 | Wałęga/Zawidzki/Cuenca Grau, *Finitely Materialisable Datalog Programs with Metric Temporal Operators*, KR 2021, 2021-11 | https://proceedings.kr.org/2021/59/kr2021-0059-walega-et-al.pdf | 会议论文 | A |
| 7 | van Noort & Wałęga, *Efficient Temporal Reasoning with Non-Temporal Engines: Embedding DatalogMTL into Datalog*, KR 2026, 2026 | https://proceedings.kr.org/2026/73/kr2026-0073-van-noort-et-al.pdf（DOI 10.24963/KR.2026/73） | 会议论文 | A |
| 8 | Bellomarini/Blasi/Nissl/Sallinger, *The Temporal Vadalog System*, TPLP 2025（arXiv 扩展版 2024-12-17） | https://arxiv.org/abs/2412.13019 ；https://doi.org/10.1017/s1471068425000018 | 期刊+arXiv | A（arXiv 全文）/B（Crossref） |
| 9 | Wang 等, *MeTeoR: Practical Reasoning in Datalog with Metric Temporal Operators*, AAAI 2022（arXiv 2022-01-12） | https://arxiv.org/abs/2201.04596 | 会议论文 | A |
| 10 | Wang 等, *Practical Reasoning in DatalogMTL*, TPLP 25(2):225–255, 2025（arXiv 2401.02869, 2024-01-05） | https://arxiv.org/abs/2401.02869 | 期刊论文 | A |
| 11 | Bellomarini 等, *Query Evaluation in DatalogMTL – Taming Infinite Query Results*, arXiv:2109.10691, 2021-09 | https://arxiv.org/abs/2109.10691 | arXiv 预印本 | A（摘要/引言） |
| 12 | Wang/Wałęga/Cuenca Grau, *Seminaïve Materialisation in DatalogMTL*, arXiv:2208.07100, 2022-08 | https://arxiv.org/abs/2208.07100 | arXiv 预印本 | A（摘要/引言） |
| 13 | Zhao/Chen/Wang/Hu, *Incremental Maintenance of DatalogMTL Materialisations*（DRedMTL）, AAAI 2026（arXiv 2511.12169, 2025-11） | https://arxiv.org/abs/2511.12169（DOI 10.1609/AAAI.V40I23.39025） | 会议论文 | A |
| 14 | Ronca 等, *Stream Reasoning in Temporal Datalog*, arXiv:1711.04013, 2017-11 | https://arxiv.org/abs/1711.04013 | arXiv 预印本 | A（官方摘要） |
| 15 | Mantenoglou 等, *Efficient Temporal Datalog Materialisation for Composite Event Recognition*, arXiv:2605.02488, 2026-05 | https://arxiv.org/abs/2605.02488 | arXiv 预印本 | A（官方摘要） |
| 16 | Chomicki, *Temporal Query Languages: a Survey*, Springer LNCS（据 PODS 1993 教程）, 1994 | https://link.springer.com/chapter/10.1007/bfb0014006 | 综述 | A（页面全文） |
| 17 | Lausen/Ludäscher/May, *On Active Deductive Databases: The Statelog Approach*, LNCS 1472, 1998 | https://link.springer.com/chapter/10.1007/bfb0055496 | 会议论文 | A（页面全文） |
| 18 | Tuzhilin, *Querying datalog programs with temporal logic*, Acta Informatica 30:679–700, 1993-07 | https://link.springer.com/article/10.1007/BF01191723 | 期刊论文 | A（摘要页）/B（正文订阅） |
| 19 | Chomicki & Imieliński, *Temporal Deductive Databases and Infinite Objects*, PODS 1988 | https://doi.org/10.1145/308386.308416 | 会议论文 | B（DBLP 元数据；捕获关系由 #4/#5 背书） |
| 20 | Calì/Gottlob/Lukasiewicz, *Datalog±: a unified approach to ontologies and integrity constraints*, ICDT 2009, 2009-03 | https://doi.org/10.1145/1514894.1514897 | 会议论文 | A（官方摘要） |
| 21 | Soufflé 官方类型文档, souffle-lang.github.io, 抓取 2026-08-12 | https://souffle-lang.github.io/types | 官方文档 | A |
| 22 | RDFox 官方文档目录, docs.oxfordsemantic.tech, 抓取 2026-08-12 | https://docs.oxfordsemantic.tech/ | 官方文档 | A（目录页） |
| 23 | MeTeoR GitHub 仓库 README（wdimmy/DatalogMTL_Practical_Reasoning） | https://github.com/wdimmy/DatalogMTL_Practical_Reasoning | 软件仓库 | A |
| 24 | MeTeoR 官方演示站（datalogmtl.github.io；datalogmtl/website 仓库） | https://datalogmtl.github.io/ | 官方演示站 | A |
| 25 | PyPI meteor-reasoner 2.0.0 元数据 | https://pypi.org/project/meteor-reasoner/ | 软件分发元数据 | A |
| 26 | DRedMTL GitHub 仓库 README（Horizon12275/DREDmtl-for-DatalogMTL） | https://github.com/Horizon12275/DREDmtl-for-DatalogMTL | 软件仓库 | A |
| 27 | DBLP DatalogMTL 书目（27 条；含 AAAI'26/KR'26/TPLP 2025 DOI 复核） | https://dblp.org/search?q=DatalogMTL | 书目元数据 | B |

---

## 6 判死自查

- **一句话结论是否成立**：成立——结论受 F1/F4/F5/F6/F7/F9 支撑（A 级原文），M09 映射部分标 C。
- **可核来源数 ≥15**：27 条（清单见第 5 节）✔
- **原文到手数 ≥10**：A 级 23 条（含官方摘要/文档页原文）✔（A 级核心：IJCAI2019、KR2020、KR2021×2、KR2026、Temporal Vadalog arXiv、MeTeoR×2、DRedMTL、Seminaïve、DatalogMTL^FP、Chomicki、Statelog、Tuzhilin 摘要、Datalog± 摘要、Ronca、Mantenoglou、Soufflé、RDFox 目录、MeTeoR 仓库/演示站、PyPI）
- **来源类型 ≥3 类**：学术会议/期刊论文（IJCAI/KR/AAAI/TPLP/ICDT/PODS/Acta Informatica）、arXiv 预印本、官方文档与软件仓库/PyPI、书目与出版元数据（DBLP/Crossref/Semantic Scholar）、综述（Chomicki）——≥5 类 ✔
- **候选逐一查证 ≥5**：DatalogMTL（#1/#4/#5/#6）、Temporal Vadalog（#8）、MeTeoR（#9/#10）、DRedMTL（#13）、嵌入非时序引擎（#7）、Statelog（#17）、Chomicki 综述（#16）、Datalog±（#20）、Soufflé 时态讨论（#21）、RDFox 时态扩展（#22）、Ronca 时序 Datalog 流推理（#14）——11 个候选全部查证 ✔
- **关键词 ≥4 组**：英文 4 组（"DatalogMTL metric temporal logic reasoning"→#1/#4/#5/#6；"temporal Datalog predicates time"→#16/#17/#18/#19/#14；"Datalog temporal extension versioning"→#6/#8/#13/#21/#22；"DatalogMTL implementation tool"→#9/#10/#8/#13/#23/#24/#25）＋中文 4 组（按任务卡给定词检索；本环境搜索引擎受限，未核到高质量中文文献，见第 4 节未决 6）✔
- **禁止项**：未做引擎性能比较（F9 仅列实验引擎与"语义保持"，MeTeoR/Vadalog/DRedMTL 均只引各自论文声明，无优劣排比）；未越界（时间版本通用理论仅作边界声明，归 B4）；未捏造来源（全部条目均可追溯到 tmp/b3b 下的原始抓取文件；无法核实的已标"未核"）；推断一律标 C（Q4 当前视图分工、Q5 综合判断、F11 补充、F12 负面结论、未决 1）。
- **未决数**：6（第 4 节）。

**产出统计（给上游）：文件 `research_tree\findings\B3b_时序Datalog_发现.md`；关键发现 F1–F14 共 14 条；可核来源 27；原文到手（A 级）23；未决 6；红线全部达标。**