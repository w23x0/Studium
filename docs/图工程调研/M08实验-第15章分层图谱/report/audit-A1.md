# 审计 A1：数学正确性与归属真实性

审计对象：`data/nodes-D2.jsonl`（94 节点，15.06–15.08 独立性/基/维数子树）、`data/nodes-D3.jsonl`（73 节点，15.10–15.11 内积/范数/正交性子树）。
判决文件：`report/audit-A1-verdicts.jsonl`，167 行，每个被审节点一行，id 逐字回抄，与源文件顺序一致。
锚点 quote 的逐字存在性按任务说明不再复核；本次复核的是**锚点是否真的支撑 statement**、statement 的数学正确性、parent 归属、atomic 判定、以及是否虚构教材出处。

## 判决计数

| verdict | D2 | D3 | 合计 |
|---|---|---|---|
| KEEP | 87 | 68 | 155 |
| FIX | 7 | 5 | 12 |
| KILL | 0 | 0 | 0 |

死因分布（仅计非 KEEP）：死因 1 量词过度断言 7；死因 4 数学错误 3；死因 3 伪造教材出处 1；死因 2 编造成员归属 1；死因 5 伪抽象/层塌缩 0。

无 KILL。两个文件的节点主体确实落在 Apostol 15.06–15.08 与 15.10–15.11 的正文之内，未发现把习题结论冒充正文定理、也未发现整节点级别的虚构断言；12 处问题都是可定点修改的局部缺陷。

## 按死因分组的问题清单

### 死因 1：量词过度断言（7 条）

- `d:inner-product-positivity-axiom` — 把严格正定弱化后写成「there exist nonzero elements with (x, x) = 0」，实际只是「允许存在」；V_n 上的点积本身即满足 (x,x)≥0 而无此类元素。改 there exist → there may exist。
- `d:zero-element-has-zero-inner-product` — 「is the only consequence he draws from an axiom before Theorem 15.8」不成立：15.10 在定理 15.8 之前还从齐次公理与 (1') 推出了配套关系 (x, cy) = conj(c)(x, y)。删去该从句或限定到实内积部分。
- `d:zero-element-orthogonal-to-every-element` — 「a set containing O is orthogonal under the definition」是错误全称断言；含 O 的集合仍须其余相异元素对内积为零，反例 {O, i, i+j}。改为「向正交集添入 O 后仍是正交集」。
- `d:15-10-nonzero-hypothesis-is-essential` — 同一错误全称断言「any set containing O is orthogonal」，同上反例。
- `d:zero-element-of-a-function-space-is-a-pointwise-identity` — 「Both independence proofs in function space exploit this by substituting particular values of the variable」过度概括：例 7 用的是乘 e^{-a_M x} 后令 x→+∞ 的极限论证，不是代入取值。
- `d:thm-15-6-conclusion-by-antisymmetry` — 「The only nonalgebraic input in the whole proof is the antisymmetry of the ordering of the integers」过度断言：同一证明还用到定理 15.5 与「含相关子集者相关」的单调性，且 nonalgebraic 未定义。把「唯一」的范围收缩到本步即可。
- `d:dim-of-a-second-order-de-solution-space-is-two` — name_en 把 Apostol 例 3 的单个方程 y''−2y'−3y=0 升格为「二阶齐次方程」的一般命题；15.08 并未证明一般结论。标题与 statement 同步限定到具体方程。

### 死因 2：编造成员归属（1 条）

- `d:n-plus-one-elements-in-an-n-dimensional-space-are-dependent` — parent 写 `apostol:theorem-15-7`，但该节点自述内容是定理 15.5 在一个基上的实例，是证明 15.7(b) 所用的推论，而非 15.7 的组成部分。同一节点还有两处措辞问题：「equivalent form of the counting content behind Theorem 15.7(b)」应为「必要成分/推论」；origin_note 里的「the 15.05 conclusion」是错引（15.05 是习题节，此处指定理 15.5）。建议 parent 改为 `apostol:theorem-15-5`。

### 死因 3：伪造教材出处（1 条）

- `d:thm-15-4-identities-inherited-from-the-ambient-space` — statement 覆盖公理 3、4 与 7–10，但唯一锚点从原句中段起截，只包含 Axioms 7 through 10 一半，公理 3、4 那半句落在 quote 之外（原句完整可用，无需截断）。同一节点还夹了一句「Closure under addition (Axiom 1) is never invoked」——非原文所述、未标 `origin: model`，且与 `d:thm-15-4-closure-under-scalar-multiplication-is-the-active-axiom` 的职责重复。

### 死因 4：数学错误（3 条）

- `d:dependence-coefficients-not-all-zero` — 反事实论证中的「including the empty set」不成立：Apostol 把见证族记作 x_1,…,x_k，隐含 k≥1，去掉非零系数条款后空集仍无见证族。此说还与同文件 `d:independence-of-the-empty-set` 所依赖的读法自相矛盾。
- `d:zero-space-declared-finite-dimensional-by-fiat` — 「needed」判断有误：按 Apostol 自己的两条约定（15.07 例 4 空集独立、15.06 中 L(∅)={O}），空集即为 {O} 的有限基，第一个析取项已覆盖零空间，该子句是冗余而非必需。这也与同文件 `d:dimension-of-the-zero-space-is-zero-by-convention`（称该规定「与一般定义相容」）相左。
- `d:cauchy-schwarz-equality-condition` — 几何解读漏掉非零前提：{x, y} 相关也含 x=O 或 y=O 的情形，而按 15.10 的角定义此时并无夹角，故「the angle between them is 0 or pi」不普遍成立。

### 死因 5：伪抽象/层塌缩

无。D2/D3 是纵向细粒度层，`atomic: true` 的节点基本落在「单一断言/单一证明步」的粒度上；五个 `atomic: false` 节点（`d:thm-15-4-sufficiency-direction`、`d:exponential-independence-proof-is-induction-on-n`、`d:thm-15-7b-argument-adjoining-an-outside-element-breaks-the-count`、`d:cauchy-schwarz-proof-inherited-from-theorem-12-3`、`d:trigonometric-orthogonal-system`）的 atomic_reason 都指出了具体的可拆分方向，判定成立。

## 最危险的 5 个问题

1. `d:n-plus-one-elements-in-an-n-dimensional-space-are-dependent` — 唯一的 parent 归属错误。挂错父节点会把定理 15.5 的推论伪装成定理 15.7 的内部成分，下游任何按子树聚合的抽象层都会继承这个错误依赖关系。
2. `d:zero-space-declared-finite-dimensional-by-fiat` — 断言一个实际冗余的子句「必需」，且与同层兄弟节点公开矛盾。同一子树里两个节点对空集/零空间给出不相容的说法，是最容易被抽象层放大的那类缺陷。
3. `d:dependence-coefficients-not-all-zero` — 「空集会变相关」在 Apostol 的记号下是数学错误，并且再次与 `d:independence-of-the-empty-set` 冲突。同一个空集约定在 D2 中被三处不同节点用了两种读法。
4. `d:thm-15-4-identities-inherited-from-the-ambient-space` — 锚点只支撑 statement 的一半，另一半（公理 3、4）无证据；同时混入一句未标 origin 的模型推断。这是全部 167 个节点里「锚点不支撑 statement」最实质的一例。
5. `d:cauchy-schwarz-equality-condition` — 缺失非零前提，属清单点名的典型缺陷（省略非零条件）。等号情形的几何解读若被后续「夹角/共线」类抽象节点继承，错误会静默扩散。

## 我不确定的地方

- **节点计数不符**：任务说明称 `nodes-D3.jsonl` 有 76 个节点，文件实际为 73 个非空 JSONL 行（77 原始行，尾部 4 个空行）。我按实际存在的 73 个逐一出了判决，未修改被审文件。若确有 3 个节点应存在而缺失，本次审计不覆盖它们；这需要产出方核对。D2 为 94，与说明一致。
- **未发现结构性问题**：脚本核查确认两文件内 id 无重复（167 个 id 全局唯一），且所有 `parent` 都能解析到 `data/inherited/` 中已存在的 id，无悬空引用。故死因 2 在纯引用层面清零，仅剩上述 1 处语义归属错误。
- **系统性但我未逐条判 FIX 的模式**：相当多节点的 statement 第二、三句是节点自己的数学分析（如「这一步只用到公理 X」「若去掉此前提则 Y 失效」），Apostol 原文并未如此表述，而 `origin` 仍写 `source`。同文件内另有约 13 个节点把同类论断诚实标了 `origin: model` + `origin_note`。这条界线由产出方划得并不一致。我只对其中论断本身可疑或与锚点脱节的两处（`d:thm-15-4-identities-inherited-from-the-ambient-space`、以及并入其 suggested_fix 的公理 1 之说）判了 FIX，其余按「论断为真且可由所引原文直接验证」放行。是否应统一要求标 `origin: model`，属于规范层决策，超出我的判决权限。
- **锚点长度下界造成的弱支撑**：`d:norm-zero-iff-zero-element` 的两个锚点分别是证明句与定理头，都没有逐字包含性质 (a) 本身——原文中 `(a) \|x\| = 0 if x = O` 作为独立展示行不足 30 字符，无法在不跨行、不省略的前提下取到。这是 SPEC 的 30 字符下界与展示式排版冲突的结果，不是产出方的过失，故判 KEEP。15.10/15.11 中另有若干展示式公式节点面临同样情况。
- **章节字段的小瑕疵**：`d:orthogonal-basis-elements-are-nonzero`、`d:parseval-conjugate-comes-from-hermitian-symmetry` 的 `sections` 只写 `15.11`，但锚点取自 `15.10.md`（定理 15.10 与 15.11 相邻且内容连贯）。我判这不构成伪造出处（锚点 file 字段本身诚实），未降级，但若规范要求 `sections` 必须覆盖全部锚点来源文件，则这几条需补。
- **作者意图类断言**：`d:components-depend-on-the-ordering-not-only-on-the-basis` 称这是「Apostol 在讲分量之前引入有序基的唯一理由」。该说法数学上无害且已标 `origin: model`，但它断定的是作者动机，无法由文本证真或证伪。我放行了，此处备案。
- **`d:finite-dimension-criterion-independent-sets-bounded` 的 equivalently**：Apostol 只证了「有有限基 ⇒ 独立集有界」这一向；反向需要用「向张成外添元保持独立」逐步构造，D2 里另有节点承担这一引理，故整体可闭合。但单看该节点，`equivalently` 的对称性强于原文所证。我判 KEEP，属边界判断。
