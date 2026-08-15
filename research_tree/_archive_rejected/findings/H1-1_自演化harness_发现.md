# 叶子 H1-1 自演化 agent harness 调研发现
> ⚠ **已归档（2026-08-15 产品裁决）**：本卡属老旧范式（agent 记忆/RAG/知识库/上下文工程，临床办公场景），与「个人多教材理科学习」项目不匹配，已移入 _archive_rejected/，仅作历史参考，不再作为 Studium 设计依据。

> 任务 H1-1 / A=原文到手 B=二手转引 C=推断
> 调研主题：agent harness 从执行经验自改进运行时配置（self-evolving harness）
> 时间锚定：全部证据 2024-01 之后；DSH 本地全文 2026 为 A 级锚点

## 0. 一句话结论
**自演化 harness 已从「优化提示/流水线」升级到「优化 harness 本身的运行时配置」**：2026 文献出现 meta-harness 优化器（AutoDesign：递归改进 harness 配置，七配置均分 +12.4%）、把经验端到端内化进策略（LOPD）、递归自改进研究环（AQuA）；但同时实证了**自演化非单调且污染结构不可逆**——过临界池规模后新技能反降性能，事后回滚只能恢复一小部分，使技能准入成为 **pre-commit 必要**而非事后修复（When Self-Evolution Backfires，VaG 三层批评）。可移植模式 = 自改进 + 不可逆护栏缺一不可。

## 1. 父会话问题逐条回答

**Q1. 如何让 harness 从执行经验自改进？自改进对象是哪些维度？**
- 结论：自改进对象从「窄产物」（提示/流水线/工作流）扩展到「harness 运行时配置」。AutoDesign 明确：理想 harness 应对齐人类设计先验、经经验探索积累可复用经验以驱动递归自改进，而现有范式是静态的；它用 **meta-harness 优化器**引导 code agent 基于 rollout 反馈递归改进 harness，整合学到的 DesignHarness 在七配置上把均分 54.99→67.39（+12.4%）。MemoHarness（H3-4，2607.14159）把 harness 拆成六个可编辑控制维度（context/tools/orchestration/memory/decoding/output），存逐案诊断+蒸馏全局模式于双层经验库，按检索经验适配——这正是「自改进对象=harness 维度」。经验内化的更深层：LOPD 把 teacher 的 privileged context 端到端学习化（而非手工规定 OPSD 变体），让 agent 把经验内化进策略。
- 依据：AutoDesign 2608.13560、MemoHarness 2607.14159（H3-4）、LOPD 2608.13040
- 等级：A

**Q2. 自演化的失败模式与风险？护栏是什么？**
- 结论：**关键实证——自演化非单调且污染结构不可逆**。When Self-Evolution Backfires（2608.05810）：自演化 agent 靠蒸馏执行轨迹的可复用技能积累能力，但过临界池规模后新加入技能反降性能；一旦缺陷技能进入决策上下文，它成为后续技能蒸馏的参考材料，形成跨轮污染链；**污染结构不可逆**——事后移除源技能也无法消除后代已继承的缺陷推理，post-hoc 回滚只恢复丢失性能的一小部分。因此技能准入是 **pre-commit 必要**而非事后修复。护栏 = VaG（Verifier-as-Gatekeeper）：三层异质批评（结构有效性、行为无害、语义一致性）逐技能过滤 + 顶层边际增益子集选择移除组合污染；Terminal-Bench 2 上无条件累积先升后降、post-hoc 移除只恢复一小部分（不可逆的经验签名），VaG 每轮都改进、池小约 5x、冻结池正迁移到四骨干。Skill-α（2608.01678）补充：技能生成建模为序列编辑，用 rollback reward 评估每次编辑（比较原始与编辑后技能的下游执行）。
- 依据：2608.05810（核心失败模式）、2608.01678（rollback reward）
- 等级：A

**Q3. 对 Studium harness 的可移植模式？与 DSH 组件动态组合如何衔接？**
- 结论（C）：四点。（i）**harness 维度可自改进**：Studium 若建 harness，把 context/tools/memory 等做成可编辑维度，按执行经验自适应（仿 AutoDesign/MemoHarness），而非全用例复用单一静态配置。（ii）**准入优先于回滚**：Backfires 的「污染不可逆」实证直接对接 H3-1 的「组件移除回滚」——**回滚能力不能替代准入把关**；Studium 若让 harness 自演化积累技能/规则，须在写入前 pre-commit gating（结构/行为/语义三层批评），否则污染一旦形成结构性不可逆。（iii）**经验库分层**：MemoHarness 的双层经验库（逐案诊断+全局模式）可作 Studium harness 经验存储的形态参考。（iv）**与 DSH 衔接**：DSH 的 self-evolving agent harnesses 动机段（§1.2.2）正是本叶主题的理论入口；DSH 的 temporal composability（可逆）与 Backfires 的「污染不可逆」形成**张力**——DSH 假设副作用可逆，而实证示技能污染一旦形成后代继承就不可逆，提示 Studium 须把「可逆」限制在「未扩散的局部副作用」，准入护栏负责阻止不可逆扩散。
- 依据：2608.13560/2608.05810/2607.14159、DSH §1.2.2（本地全文）
- 等级：C（迁移模式与张力推断）

## 2. 关键发现

**F1. 【AutoDesign：meta-harness 优化，递归改进 harness 配置 +12.4%】**
- 论断：把多模态源转结构化媒体输出概念化为以 model-harness 系统为中心的长程 agentic 过程；理想 harness 应对齐人类设计先验+经经验探索积累可复用经验驱动递归自改进，现有范式静态；AutoDesign 用 meta-harness 优化器引导 code agent 基于 rollout 反馈递归改进 harness；PosterBench 七配置整合学到的 DesignHarness 把均分 54.99→67.39（+12.4%）。
- 来源：arXiv 2608.13560，abs 页 arxiv_abs_2608.13560.html；Yaxin Luo 等；published 2026-08-13
- 原文摘录：「a meta-harness optimizer guides a code agent to recursively improve harness based on rollout feedback」；「integrating the learned DesignHarness consistently improves performance」
- 等级：A

**F2. 【When Self-Evolution Backfires：自演化非单调、污染结构不可逆、准入 pre-commit 必要】**
- 论断：自演化 agent 蒸馏执行轨迹技能积累能力，但过临界池规模后新技能反降性能；缺陷技能进入决策上下文后成后续蒸馏参考，形成跨轮污染链；**污染结构不可逆**（事后移除源技能也无法消除后代继承的缺陷推理），post-hoc 回滚只恢复丢失性能一小部分；准入是 pre-commit 必要而非事后修复；VaG 三层异质批评（结构有效性/行为无害/语义一致性）+ 顶层边际增益子集选择；Terminal-Bench 2 上无条件累积先升后降、post-hoc 只恢复小部分（不可逆经验签名），VaG 每轮改进、池小约 5x、冻结池正迁移四骨干。
- 来源：arXiv 2608.05810，abs 页 arxiv_abs_2608.05810.html；Linfang Shang 等；published 2026-08-06
- 原文摘录：「past a critical pool size, newly added skills degrade performance」；「removing a source skill after the fact cannot erase the flawed reasoning its descendants have already inherited」；「skill admission a pre-commit necessity rather than a post-hoc fix」
- 等级：A

**F3. 【LOPD：把经验端到端内化进策略，privileged context 学习化】**
- 论断：把经验内化进策略是 self-evolving AI 中心问题；现有 OPSD 依赖设计师规定的 privileged artifacts（答案/反馈/技能/轨迹），限制端到端可学习性与持续自改进可扩展性；LOPD 让 teacher 的 privileged context 端到端从经验学习（检索相关经验组成连续 latent token 条件 self-teacher，学生在每个访问前缀接收密集 token 级监督）；privileged-margin 目标稳定化；超 RLVR/OPSD/SDPO/Skill-SD，rollout 预算 <30%。
- 来源：arXiv 2608.13040，abs 页 arxiv_abs_2608.13040.html；Guibin Zhang 等；published 2026-08-13
- 原文摘录：「makes the teacher's privileged context itself learnable end-to-end from experience」
- 等级：A

**F4. 【AQuA：递归自改进的研究环，证据驱动后续假设】**
- 论断：研究递归自改进于量化投资研究层——自治系统用早期实验证据改进后续迭代的假设与候选；两系统（符号因子发现/可训练模型开发）不共享 agent/memory/候选/状态，各自独立闭合研究环（保留已验证证据指导后续提案）；sealed sandbox 固定数据分割/特征标签定义/评估器。
- 来源：arXiv 2608.12841，abs 页 arxiv_abs_2608.12841.html；Jiacheng Guo 等；published 2026-08-13
- 等级：A

**F5. 【Skill-α：技能生成序列编辑 + rollback reward】**
- 论断：技能生成建模为序列编辑过程（分解为可单独评估的编辑）；rollback reward 评估每次编辑（比较原始与编辑后技能在锚定查询上的下游执行）；document-to-skill 与 experience-to-skill 两设置下超启发式/流水线基线。
- 来源：arXiv 2608.01678，abs 页 arxiv_abs_2608.01678.html；Junhao Shen 等；published 2026-08-03
- 原文摘录：「a novel rollback reward that evaluates each edit by comparing downstream execution under the original and edited skills」
- 等级：A

**F6. 【MemoHarness：harness 六维度自适应，双层经验库（H3-4 复用）】**
- 论断：agent harness=外部控制层管理 context/tools/orchestration/memory/decoding/output；MemoHarness 把 harness 拆六可编辑控制维度，双层经验库存逐案诊断+蒸馏全局模式，按检索经验适配无需测试标签/反馈/额外搜索；额外上下文在「检索经验可缓存」时保持成本竞争力。
- 来源：arXiv 2607.14159（H3-4 已抓快照）
- 等级：A

**F7. 【DSH self-evolving agent harnesses 动机】**
- 论断：DSH §1.2.2 把「self-evolving agent harnesses」列为动态组合的核心动机场景之一；temporal composability（组件移除副作用完全回滚）是其形式化目标。
- 来源：本地全文 docs/DSH/paper/full.md §1.2.2
- 等级：A（本地原文）

## 3. 对决策点的输入
- 自演化 harness 可移植模式 = **「自改进维度 + 准入护栏」缺一不可**：AutoDesign/MemoHarness 给自改进通道，Backfires 给准入护栏（pre-commit gating，因为污染不可逆）。
- **与 H3-1 的关键张力**：DSH/H3-1 的「组件移除可逆」假设 vs Backfires 的「技能污染不可逆」实证——提示 Studium 须把可逆限制在「未扩散局部副作用」，准入护栏阻止不可逆扩散。

## 4. 与范围/红线的冲突张力
- 无红线冲突。切分边界：不越过到训练期 agent-native training（聚焦 harness 运行时自改进），bounds 遵守。
- 与 DSH「temporal 可逆」的张力已在 §1.Q3/§3 标注为推断（C），非冲突而是细化。

## 5. 未决与风险
- AutoDesign 的 PosterBench 是单一任务（论文→海报），harness 自改进的跨任务泛化需谨慎。
- Backfires 的「不可逆」是 Terminal-Bench 2 单基准经验签名，跨域是否普适未确认 → 标 C 悬置。
- LOPD/AQuA 偏训练/研究环，与「harness 运行时自改进」边界有交叠，已标注。

## 6. 建议的下一步
- 把 Backfires 的「准入 pre-commit + 三层批评」与 Studium 既有「审计晋升状态机」（V/S 系列的审计员机制）对照——可能同构（都是写入前把关）。
- H1-2 继续挖 DSH 的 effect/coeffect 机制在组件级的落地。

## 7. 来源清单
1. https://arxiv.org/abs/2608.13560（AutoDesign Meta-Harness，2026-08）— A
2. https://arxiv.org/abs/2608.05810（When Self-Evolution Backfires，2026-08）— A
3. https://arxiv.org/abs/2608.13040（LOPD Latent Self-Distillation，2026-08）— A
4. https://arxiv.org/abs/2608.12841（AQuA Recursive Self-Improvement，2026-08）— A
5. https://arxiv.org/abs/2608.01678（Skill-α，2026-08）— A
6. https://arxiv.org/abs/2607.14159（MemoHarness，2026-07，H3-4 快照）— A
7. docs/DSH/paper/full.md（DSH §1.2.2，2026）— A
8. https://arxiv.org/abs/2608.13334（RippleMem associative memory，2026-08）— B（adjacent 记忆类）

## 8. 判死自查结果
- 关键论断均有来源 ✓；A/B 分级正确（abs 页+本地全文=一手；RippleMem 标 B adjacent）✓；未越界（不进训练期 agent-native training）✓；推断（Q3 迁移模式+张力）已标 C ✓；Backfires 不可逆跨域泛化已标未决 ✓。