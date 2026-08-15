# 叶子 H1-2 可逆副作用与依赖解析 调研发现

> 任务 H1-2 / A=原文到手 B=二手转引 C=推断
> 调研主题：把「组件移除副作用可逆 + 组件间依赖可解析」落到 agent harness 语境（revertible effects + reactive coeffects）
> 时间锚定：本地全文 DSH 为 T0 锚；外部 PL 文献全部 2024-01 后（2106.04480 为 2021 经典脉络，标 B）

## 0. 一句话结论
**「可逆副作用 + 依赖解析」在 2024–2026 已有完整的形式化与实现，且 DSH（北大+DeepSeek）把 effect/coeffect 理论从「编译期静态分析」整体 lifting 到「运行时可操作机制」，正是 agent harness 动态组合的语言无关根基。** 三个核心机制可移植：（i）**revertible effects**——每个副作用携带显式 inverse，运行时累积进 accumulator，组件卸载时按 inverse 回滚上下文（非整库重启，保本地状态）；（ii）**reactive coeffects**——组件把依赖声明为 specification，每次上下文变更按 satisfaction predicate 分类为 activating/deactivating/neutral，驱动激活/去激活；（iii）**unified context paradigm**——把 effect context 与 coeffect context 统一进自相似类型 $\Gamma_\infty$，用 observational equivalence 商掉「物理不可恢复」部分，让独立组件的副作用可在任意顺序回滚。学术脉络并行坐实（Willow 静态 type-and-effect、Tempo/Yarrow 运行时 effect handler、Algebraic Semantics of Governed Execution 的 effect algebra 治理）。

## 1. 父会话问题逐条回答

**Q1. 如何形式化「组件移除时副作用完全回滚」？回滚的物理边界在哪？**
- 结论：DSH §3.1 给出完整形式化——**revertible effects**。把每个不纯函数 $f_{\text{impure}}:X\to Y$ 变成纯形式 $f:\Gamma\times X\to\Gamma\times Y$（所有副作用都是对上下文 $\Gamma$ 的变换）；要可撤销，每个变换 $f$ 配一个 left inverse $g$（$g\circ f$ 回到原态）。**effect function** $\mathfrak{E}_\Gamma := \Gamma\to\Gamma\times(\Gamma\to\Gamma)$ 在应用点产出新上下文 + 当前 effect 的 inverse（per-state，不是 a priori 固定）；witnessed refinement $\mathfrak{E}_\Gamma^*$ 用约束 $g(\delta)=\gamma$ 把 inverse 限定在它被应用的态。**accumulator** $\varphi$ 是迄今所有 inverse 的复合，存在 effect context $\partial\Gamma:=\Gamma\times(\Gamma\to\Gamma)$ 里；**soundness invariant** $\varphi(\gamma)=\gamma_0$ 保证任一时刻都能恢复到初始态。$\diamond$（twisted composition）让 effect function 保持 monoid 结构且 revertibility 不丢。
- **物理边界**（§3.3.2 关键）：recovery 是「equality of states」的理想化——物理态无法完全恢复（free 把内存还给 allocator 但不还原 heap layout；生成式名字 discard 后下次创建取新名）。因此所有等式**读到 observational equivalence $\simeq$ 之下**：两个态相关当且仅当它们的 coeffect 投影绑定相同 key 到相关值；coeffect 没绑定的部分被遗忘，正是这种遗忘让 Theorem 7 的 recovery 在 $\simeq$ 下成立。**可移植判据：回滚保证到「观测等价」，不到「比特级完全一致」**——这是 Studium 「回滚后回到可 grep 的稳定原版」红线的形式化对应（原版可观测即可，不必字节一致）。
- 依据：DSH §3.1（Definition 1-21，twisted composition/effect function/witnessed/independence/Corollary 21）、§3.3.2（Definition 33-34，observational equivalence）、§3.1.3（independence = commutation，让 inverse 可在任意顺序运行）
- 等级：A（本地全文逐条）

**Q2. 组件间依赖如何声明、解析、撤销？与传统 IoC 容器的差别？**
- 结论：DSH §3.2 给出 **reactive coeffects**。把依赖形式化为 **coeffect context** $\Sigma := (k:K)\rightharpoonup \mathcal{V}_k$（依赖偏函数）；组件声明的依赖集合是 **specification** $d\subseteq K$；**satisfaction predicate** $\sigma\vDash d := \forall k\in d.\, k\in\text{dom}(\sigma)$（可判定，因 dom 有限）。每次上下文变更（必经 effect function，故变更在 effect boundary 可观测）按 **notify** 三分类：$\text{notify}_d(\sigma,\sigma')$ = activating（从不满足变满足）/ deactivating（从满足变不满足）/ neutral（其余）。activating 触发组件 effect 执行（带完整 effect tracking），deactivating 触发 accumulator 回收。**reactive invariant**：组件只在满足其 specification 的态激活，故永不读缺失 binding；每次上下文变更都对该 specification 分类，故满足性丢失在发生处被检出并驱动去激活。
- **与传统 IoC 容器的差别**（§3.2.1 明言）：传统 IoC 把依赖当 key-value 静态映射；coeffect context 与 revertible effects **协同**——所有 $\Sigma$ 的变更都走 effect function（带 inverse），所以「依赖变更可逆 + 变更可在 boundary 观测」是同一个机制的两面，不是外挂。进一步有 **coeffect isolation**（同一 key 在不同 context 解析到不同值，runtime ad-hoc polymorphism，用于多租户/沙箱）和 **coeffect interception**（给依赖访问挂跨切面 metadata，加行为不改值）。
- 依据：DSH §3.2（Definition 22-30，coeffect context/specification/satisfaction/notify/isolation/interception）
- 等级：A（本地全文逐条）

**Q3. 对 Studium harness 的可移植模式？与 DSH「可逆」假设的衔接？**
- 结论（C）：四点。（i）**上下文即统一可回滚对象**：DSH §3.3 的 unified context $\Gamma_\infty := \mu\Gamma.\,\Gamma\times(\Gamma\to\Gamma)\times\Sigma$ 把「当前态 + 本层 accumulator + 依赖表」打成自相似类型，effect 在其上映到自身——plug-in 隐喻落地为「加载组件=执行其 effect（plug in），卸载组件=recover 其 effect（unplug，不影响其他运行组件）」。Studium 若把 harness 的上下文（context/tools/memory 等）建模成 $\Gamma_\infty$，则组件级热插拔有形式化保证。（ii）**回滚到观测等价而非比特一致**：§3.3.2 的 observational equivalence 给 Studium 「回滚后回到可 grep 的稳定原版」一条可形式化的判据——原版可观测等价即可，物理布局/生成名字等不在 coeffect 投影里的部分可遗忘；这降低了对回滚的不现实期望。（iii）**依赖解析做成 reactive coeffect**：Studium 组件间依赖（如 V 系列审计员依赖审计单、综合代理依赖各叶发现）可声明为 specification，按 satisfaction predicate 自动激活/去激活，而非手工连线；隔离机制给多租户/沙箱（仿 isolation realm）。（iv）**与 H1-1 的张力衔接**：H1-1 的 Backfires 实证「技能污染一旦扩散到后代就不可逆」；DSH 的 revertible effects 保证的是「未扩散的局部副作用可逆」——**observational equivalence 的「遗忘」恰恰定义了哪些副作用算「未扩散」**：只要污染还没进入任何组件的 coeffect 投影（还没被任何后代声明为依赖），它就在 $\simeq$ 的遗忘范围内、可回滚；一旦进入依赖图被后代继承，就超出了局部回滚边界。这把 H1-1 与 H3-1/H1-2 的张力精确化了：「可逆」=「副作用未扩散到依赖图」，「不可逆」=「已扩散并被继承」。
- 依据：DSH §3.3、§3.3.2、H1-1 Backfires（2608.05810）
- 等级：C（迁移模式与张力推断）

## 2. 关键发现

**F1. 【DSH revertible effects：每副作用携带显式 inverse，accumulator 累积，组件卸载按 inverse 回滚】**
- 论断：effect function $\mathfrak{E}_\Gamma=\Gamma\to\Gamma\times(\Gamma\to\Gamma)$ 在应用点产出新上下文+当前 inverse（per-state）；witnessed refinement $\mathfrak{E}_\Gamma^*$ 用 $g(\delta)=\gamma$ 约束 inverse；accumulator $\varphi$ 累积所有 inverse 存于 effect context $\partial\Gamma=\Gamma\times(\Gamma\to\Gamma)$；soundness invariant $\varphi(\gamma)=\gamma_0$；$\diamond$（twisted composition）保 monoid 且 revertibility；independence（commutation，Def 19）让 inverse 可在任意顺序运行（Corollary 21），支持「从运行系统撤出一个组件」。
- 来源：本地全文 docs/DSH/paper/full.md §3.1（Definition 1-21）
- 原文摘录：「every context transformation carries an explicit inverse that the runtime tracks, and both tracking and recovery preserve composition, so the context is recovered upon component removal」；「Loading a component is applying such a sequence and accumulating its inverses in φ; unloading it is applying φ」
- 等级：A

**F2. 【DSH reactive coeffects：依赖声明为 specification，notify 三分类驱动激活/去激活】**
- 论断：coeffect context $\Sigma=(k:K)\rightharpoonup\mathcal{V}_k$；specification $d\subseteq K$；satisfaction predicate $\sigma\vDash d=\forall k\in d.\,k\in\text{dom}(\sigma)$ 可判定；notify 三分类 activating/deactivating/neutral；所有 $\Sigma$ 变更经 effect function（带 inverse），故依赖变更可逆且在 boundary 可观测——reactivity 是 $\Sigma/\simeq$ 的性质；coeffect isolation（runtime ad-hoc polymorphism，多租户/沙箱）+ coeffect interception（跨切面 metadata）。
- 来源：本地全文 docs/DSH/paper/full.md §3.2（Definition 22-30）
- 原文摘录：「a component activates only at a state satisfying its specification, so it never reads a binding that is absent, and every change to the context is classified against that specification」；「set remains an effect function and thus inherits revertibility」
- 等级：A

**F3. 【DSH unified context paradigm：$\Gamma_\infty$ 自相似，observational equivalence 商掉物理不可恢复部分】**
- 论断：$\Gamma_\infty=\mu\Gamma.\,\Gamma\times(\Gamma\to\Gamma)\times\Sigma$ 把当前态+accumulator+依赖表统一进自相似类型，effect 映到自身；plug-in 隐喻（load=执行 effect，unload=recover）；observational equivalence $\gamma\simeq\gamma' := \sigma_\gamma\simeq\sigma_{\gamma'}$（coeffect 投影相关即态相关），coeffect 没绑定的部分被遗忘——正是这种遗忘让 recovery 在 $\simeq$ 下成立（heap layout、生成名字等物理细节在关系外）。
- 来源：本地全文 docs/DSH/paper/full.md §3.3（Definition 32-34）
- 原文摘录：「two states are related when no observer can distinguish them」；「The part of a state that no key binds is thereby forgotten, and forgetting it is what lets Theorem 7 be read up to ≃ at all」
- 等级：A

**F4. 【Willow：reactive program 的 type-and-effect 系统，effects 形成 temporal dependency graph（静态侧平行工作）】**
- 论断：React 类 reactive 框架的时序行为难验证（stale read/transient inconsistency/order-dependent/feedback cycle）；Willow 给 time-aware operational semantics（以 render 为基本求值步）+ novel type-and-effect system 把时序行为静态追踪为 effect；"next" modality 表达延迟（render/network/ms 单位）；modality 族追踪 event handler 生命周期（register/fire/cancel/remove）；**effects 形成 temporal dependency graph**，标准图算法静态检出 render cascade 与 inter-render loop（致不终止或性能退化）；formalize + preservation 证明 + prototype checker + automatic effect inference。
- 来源：arXiv 2607.27074，abs 页 arxiv_abs_2607.27074.html；56 页含附录
- 原文摘录：「a novel type-and-effect system that statically tracks timing behavior as effects」；「the resulting effects form a temporal dependency graph, letting standard graph algorithms statically detect render cascades and inter-render loops」
- 等级：A

**F5. 【Tempo：OCaml 5 algebraic effects + deep handlers 重建 synchronous reactive runtime（实现侧）】**
- 论断：synchronous reactive programming 给 reactive 系统确定性时序结构（logical instant + signal 通信）；Boussinot 模型加协作线程/广播信号/动态进程，ReactiveML 把它带进 strict typed higher-order 语言；Tempo 研究同一核心机制能否在普通 OCaml 5 内重建（非专用语言扩展）——基于 algebraic effects + deep handlers 的 library runtime：effect 操作界定 reactive 挂起点，handler 把捕获 continuation 物化为按 logical-instant 语义调度的 task；与 ReactiveML 对比量化 library 级重建开销并定位主导成本的 runtime 机制。
- 来源：arXiv 2607.23550，abs 页 arxiv_abs_2607.23550.html；published 2026-07-26
- 原文摘录：「effect operations delimit reactive suspension points, and the handler reifies captured continuations as tasks scheduled by logical-instant semantics」
- 等级：A

**F6. 【Effect Systems as Abstract Interpretations：effect quantale 还原为对 event occurrences 的 abstract interpretation（理论根基）】**
- 论断：静态程序行为推理的形式关系鲜被研究；type system 已知被 abstract interpretation 捕获，但 type-and-effect system 的一般情形 unsettled；本文给 abstract interpretation 与一般 effect system 的形式关系——（i）effect quantale 嵌入 abstract domain；（ii）把 effect quantale 一般形式还原为 abstract interpretation（不是对 states/values，而是对 **event occurrences**）。
- 来源：arXiv 2606.19686，abs 页 arxiv_abs_2606.19686.html
- 原文摘录：「we recover the general form of an effect quantale as an abstract interpretation -- not on states or values, but on event occurrences」
- 等级：A

**F7. 【Algebraic Semantics of Governed Execution：effect algebra 约束 handler algebra 作治理（治理形式化）】**
- 论断：governed execution 的 algebraic semantics——governance 公理化、组合化、与可表达性共终；框架 Rocq 机械化（32 模块~12000 行/454 定理/0 admitted），基于 interaction tree + parameterized coinduction；三公理 GovernanceAlgebra（safety/transparency/properness）导出 symmetric monoidal category 且 tensor 组合保 governance；algebraic effect system 约束 handler algebra 使安全 fragment 只能构造 governance-preserving handler；capability-indexed composition 把程序与机器检 capability bound 打包；coterminous boundary（可表达即 governed，governed 即可表达程序的 image）；Turing 完整性在 governance 内保留；抽取 OCaml 作 BEAM NIF 运行。
- 来源：arXiv 2605.01032，abs 页 arxiv_abs_2605.01032.html；published 2026-05-01
- 原文摘录：「An algebraic effect system constrains the handler algebra so that only governance-preserving handlers can be constructed in the safe fragment」；「Capability-indexed composition bundles programs with machine-checked capability bounds」
- 等级：A

**F8. 【Yarrow：algebraic effects + region-based memory，checkpointing 作可回滚内存形态】**
- 论断：新 ML-like 语言 Yarrow 含 algebraic effects + region-based memory；调和二者有挑战（algebraic effects 的非局部控制流破坏 region 依赖的栈规矩；multi-shot handler 破坏 region 至多退出一次的不变式）；给程序逻辑 Yarrow Logic（YL）支持 one-shot/multi-shot handler 下 region 的安全模块化推理；对 OCaml-inspired operational semantics 证 sound；case study 含 **checkpointing**、异步计算、LIFO 数据结构——所有内存位置分配在 region 内，避开更低效的 GC heap；用 Iris separation logic + Rocq 机械化。
- 来源：arXiv 2607.15876，abs 页 arxiv_abs_2607.15876.html；published 2026-07-17
- 原文摘录：「We use YL to prove correctness of a number of case studies with algebraic effects, including checkpointing, asynchronous computation and a LIFO data structure」
- 等级：A

**F9. 【There Is No Turning Back：reversibility-aware RL 的经典对照（2021 脉络）】**
- 论断：自监督方法让 RL agent 感知动作可逆性——并非所有动作可撤销，agent 须学「不可逆动作」的后果；「There Is No Turning Back」点明回滚的物理边界：现实世界动作（打碎杯子等）结构性不可逆。这与 DSH revertible effects 形成**对照**：DSH 在受控软件上下文内保证可逆（副作用都是对 $\Gamma$ 的可逆变换），而物理/现实动作天然不可逆——提示 Studium 的「可逆」承诺只能施加于「harness 内部软件上下文」，对外部世界调用（API 副作用、文件写入）须显式 inverse 或承认不可逆。
- 来源：arXiv 2106.04480（2021-06，早于 2024 锚，作经典脉络）
- 等级：B（经典对照，非 2024+ 一手关键发现）

## 3. 对决策点的输入
- 可移植模式 = **「上下文建模成 $\Gamma_\infty$（当前态+accumulator+依赖表），副作用走 effect function 带显式 inverse，依赖走 reactive coeffect specification，回滚保证到 observational equivalence」**——这是 H3-1「版本化可回滚」在机制层的形式化根基（H3-1 给了 ChronoMem 整库快照的工程形态，H1-2 给了它为什么能「精确回滚到卸载点」的理论保证）。
- **与 H1-1 的精确张力**：H1-1 Backfires「技能污染扩散到后代不可逆」 vs DSH「revertible effects 可逆」——本叶用 observational equivalence 把边界精确化：**可逆 = 副作用未扩散进任何组件的 coeffect 投影（未被声明为依赖）**；一旦被后代继承为依赖，超出局部回滚边界。这给 Studium 一个判据：在写入前做 dependency-graph 检查（污染是否会进入依赖图），与 H1-1 的 pre-commit gating 同向。

## 4. 与范围/红线的冲突张力
- 无红线冲突。切分边界：聚焦「可逆副作用 + 依赖解析」的机制形式化与 agent-harness 落地，不展开 DSH §4 calculus 的完整 operational semantics 细节（标 OPEN）。
- 与 DSH「temporal 可逆」的张力已在 §1.Q1（物理边界）/Q3（与 H1-1 张力）标注为 A（机制）+ C（迁移推断），非冲突而是细化。

## 5. 未决与风险
- DSH 的 revertible effects 假设「副作用都是对 $\Gamma$ 的可逆变换」——对外部世界调用（网络/磁盘/真实 API）须人工提供 inverse，框架不自动给。Yarrow 的 checkpointing 是 region 内内存的特例。外部副作用的可逆性是 OPEN。
- Willow/Tempo/Yarrow 是 PL 理论/实现，与「agent harness」的衔接靠 DSH 这一座桥；若不用 DSH 的 Cordis，单独移植 PL 机制到 harness 需自行做 lifting。
- Algebraic Semantics of Governed Execution（2605.01032）的「governed execution」偏治理/安全，与 DSH 的「动态组合」动机不同，但 effect algebra 形式化共振——可作治理维度种子，非本叶核心。

## 6. 建议的下一步
- H1-2 的输出（$\Gamma_\infty$ + observational equivalence）直接喂 synthesis：把 H3-1「整库快照回滚」+ H1-2「effect function 精确回滚」合成「分两层回滚：组件级走 effect inverse（轻、精确）、跨会话走整库快照（重、观测等价）」。
- 把 §3.3.2 observational equivalence 的「遗忘」判据写进 Studium 的「回滚后回到可 grep 的稳定原版」红线的形式化注脚。

## 7. 来源清单
1. docs/DSH/paper/full.md（DSH §3.1/3.2/3.3 revertible effects + reactive coeffects + unified context，北大+DeepSeek，2026）— A（本地全文 T0）
2. https://arxiv.org/abs/2607.27074（Willow type-and-effect for reactive，2026-07）— A
3. https://arxiv.org/abs/2607.23550（Tempo OCaml 5 effects reactive runtime，2026-07）— A
4. https://arxiv.org/abs/2606.19686（Effect Systems as Abstract Interpretations，2026-06）— A
5. https://arxiv.org/abs/2605.01032（Algebraic Semantics of Governed Execution，2026-05）— A
6. https://arxiv.org/abs/2607.15876（Yarrow effects handlers + region memory，2026-07）— A
7. https://arxiv.org/abs/2106.04480（There Is No Turning Back reversibility-aware RL，2021）— B（经典对照脉络）

## 8. 判死自查结果
- 关键论断均有来源 ✓；A/B 分级正确（DSH 本地全文+5 篇 2024+ abs 页=一手 A；2106.04480 早于锚标 B 脉络）✓；未越界（不展开 §4 calculus 细节，聚焦 §3 机制）✓；推断（Q3 迁移模式+与 H1-1 张力精确化）已标 C ✓；外部副作用可逆性已标 OPEN ✓。
