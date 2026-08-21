# 审计 A2:数学正确性与归属真实性

审计对象:`nodes-D4.jsonl`(63)、`nodes-A2-s1/s2/s3.jsonl`(11+10+7=28)、`nodes-X.jsonl`(22)。
逐条判决见 `report/audit-A2-verdicts.jsonl`,每个被审节点恰有一行,id 逐字回抄,无遗漏、无重复、无静默截断(已用集合双向比对确认)。

## 0. 节点计数与任务书不符

任务书写"114 个节点",其中 A2-s* 记为"合计 29 个"。实际磁盘上是 **113**:D4 63 + A2-s1 11 + A2-s2 10 + A2-s3 7(合计 28)+ X 22。缺口在 A2-s* 一侧。我按实有节点出 113 行判决,没有为凑数补空行。请核对是否有一个 A2-s* 节点在交付前被删掉或从未落盘。

## 1. 判决计数

| verdict | 数量 |
|---|---|
| KEEP | 94 |
| FIX | 19 |
| KILL | 0 |
| 合计 | 113 |

按层:D4 63 个中 FIX 5(其余 KEEP);A2-s* 28 个中 FIX 2;X 22 个中 **FIX 12**——缺陷高度集中在 X 层,占其自身的 55%,而 D/A2 层合计只有 7.7%。

死因分布(仅计 19 个 FIX):

| 死因 | 数量 |
|---|---|
| 1 量词过度断言(含遗漏前提) | 6 |
| 2 虚构的归属/成员关系 | 4 |
| 3 虚假的教材出处 | 5 |
| 4 数学错误 | 4 |
| 5 伪抽象/层级塌缩 | 0 |

无 KILL:所有 19 个缺陷都可由改写 statement / 调整成员表 / 换锚点修好,没有节点的核心 invariant 整体虚假到只能删除。第 5 类死因未出现——受审节点没有把不同层级的东西压平成一个,X 层的问题是成员越列(第 2 类)而非伪抽象。

## 2. 按死因归组的问题清单

### 死因 4:数学错误(4 个,全在 D4 层)

三个同源:**Apostol 的 Euclidean space 默认含复情形**(`15.10.md:45`:"When we use the term Euclidean space without further designation, it is to be understood that the space can be real or complex",配 `(x,y)=conj((y,x))`、`(x,cy)=conj(c)(x,y)`)。凡把内积写成"双线性/对每个变元线性"的都在复情形下为假。

- `d:rescaling-preserves-orthogonality` — 写 `(c_i y_i, c_j y_j)=c_i c_j (y_i,y_j)`,正确是 `c_i·conj(c_j)·(y_i,y_j)`。加重情节:该节点自己的锚点就是"the scalar multiplier c can be any complex number"。
- `d:orthogonality-to-generators-extends-to-their-span` — "the inner product is linear in each argument" 在第二变元上为假(共轭线性)。
- `d:positivity-axiom-forbids-nonzero-self-orthogonal-elements` — 把 `(x,x)=0 ⟹ x=O` 说成 `x≠O ⟹ (x,x)>0` 的逆否命题。真正的逆否是 `(x,x)≤0 ⟹ x=O`;两者不等价(需要正定公理本身,不是纯逻辑变形)。
- `d:gram-schmidt-base-step-y1-equals-x1` — "(a) and (b) hold vacuously for k=1" 对 (b) 为假:(b) 在 k=1 时是实质等式 `L(y_1)=L(x_1)`,它成立是因为 `y_1=x_1`,不是空真。另"L(y_1,...,y_0) is empty"非 Apostol 措辞。

一致性说明:我 FIX 了 `d:positivity-axiom-*` 但 KEEP 了 `d:strict-minimality-rests-on-positivity-of-the-norm`——后者用的范数按定义是非负实数,取逆否合法;前者的 `(x,x)` 在未用正定公理前无先验符号。

### 死因 1:量词过度断言 / 遗漏前提(6 个)

- `x:orthogonal-decomposition-of-the-ambient-space` — statement 漏掉 **S 有限维**。写成"Given a subspace S of a space with a pairing, every element ... is the sum ...",而定理15.15 明文要求 dim S 有限(存在性证明要走 S 的有限正交规范基);去掉前提后在无限维不封闭子空间上为假。本节点自己的 divergence 恰恰知道这一点。
- `x:the-pairing-that-carries-geometry` — statement 说配对是 "symmetric, positive-definite, **bilinear**",排除了它自己的成员 `apostol:inner-product-axioms` / `apostol:euclidean-space` 明确覆盖的复情形。
- `x:basis` — "Apostol 无法产出给定子空间的基,他只断言存在(15.7a)而从不计算"在全章范围内为假:15.13 例1 就从 V_4 中三个给定向量算出正交规范基,例2 算出 Legendre 基。该断言只在 15.05–15.08 链条内成立。
- `x:span-of-a-set` — "he loses the ability to say 'the subspace spanned by cos x, cos 2x, ...' **at all**" 为假:Strang 3.4 Function spaces 小节明写 "That solution space for y''=−y has two basis functions: sin x and cos x"。真实差别只是他没有作用于任意子集的 L(S) 算子记号。
- `d:approximation-proof-starts-from-the-orthogonal-decomposition` — "the only channel through which the finite-dimensionality hypothesis reaches Theorem 15.16" 是排他性过度断言;"x 在 S 上的投影"本身按 15.14 的定义就已经要求有限维。
- `apostol:best-approximation-in-a-finite-dimensional-subspace` — "the problem is meaningful only in a Euclidean space" 为假:最佳逼近在任何赋范/度量空间都有意义,内积只是让它可解。

### 死因 3:虚假的教材出处(5 个)

- `x:right-count-upgrades-one-basis-property-to-both` — **锚点不支持 statement**。statement 是 15.7(b)"n 个独立元即成基",而 Apostol 侧锚点引的是 (a)"Any set of independent elements in V is a subset of some basis for V";同向地 `d:thm-15-7a-independent-sets-extend-to-bases` 也被列为 (b) 的成员。疑与 `x:independence-criterion-and-its-consequences`(其锚点恰为 15.7(b))互换。
- `x:vectors-need-not-be-columns` — 对 Strang 的描述三处失实,详见第 3 节。
- `apostol:projection-on-a-subspace` — "15.15 shows it solves the approximation problem":按直读为假,那是定理15.16(位于 §15.15),且该节点 `sections` 只有 `['15.14']`。
- `x:orthogonality-to-a-whole-set` — divergence 说 Apostol "proves it is a subspace",原文是 "It is a simple exercise to verify that S⊥ is a subspace of V, whether or not S itself is one"——留作习题而非证明。
- `x:zero-element-destroys-independence` — "explicitly to protect the count":所引 "because then linear independence is lost" 解释的是为何不许零向量进基,并未解释空集为何是 Z 的基,Strang 也没写出该动机。

### 死因 2:虚构的成员关系(4 个,全在 X 层)

见第 3 节。

## 3. X 层成员真实性核验(单列)

22 个 X 节点的 `apostol_ids` / `strang_ids` 成员共 100+ 条引用,机器层面全部可解析(无悬空 id)。语义层面回到**两侧原文**逐个核验后,**4 个节点的成员关系不真实**——即它们宣称某 Apostol 节点与某 Strang 节点描述同一 invariant,而两者其实不是同一回事:

1. **`x:dimension-versus-rank`** — 把 `strang:rank-theorem`、`strang:counting-theorem`、`strang:fundamental-theorem-of-linear-algebra-part-1` 列为与 Apostol 共享 invariant 的成员,而该节点自己的 divergence 就写明 `r+(n−r)=n` 是 "an assertion Apostol's vocabulary cannot even formulate"。我对 `source/apostol-ch15/` 全目录检索 "rank" **零命中**:Apostol 第15章根本没有 rank 概念。这三个成员在 Apostol 侧无任何对应物。

2. **`x:independence-criterion-and-its-consequences`** — `apostol:theorem-15-7` 被列为"独立性 ⟺ 表示唯一"的成员,但 15.7(b)"Any set of n independent elements is a basis for V"讲的是计数升级为基,与表示唯一性不是同一命题;该节点的 Apostol 锚点偏偏就引了这句。与上面 `x:right-count-*` 的锚点错置合起来看,像是两节点锚点互换。

3. **`x:orthogonal-subspaces-versus-complements`** — invariant"相互正交严格弱于互为正交补"在 Apostol 侧不存在(divergence 自认 "Apostol never states the distinction")。所列 apostol_ids 只支撑"S⊥ 之名保留给子空间"与"V=S⊕S⊥",不支撑该对比。这是 Strang 独有命题被写成共享 invariant。

4. **`x:least-squares-is-a-projection`** — `strang:four-possibilities-by-rank`(按 r/m/n 数解的个数)与"最小化平方残差 = 投影"无关,它不含任何被极小化的量。同批的 `strang:solvability-condition` 可留(给出 b∉C(A) 这一前提,divergence 已说明其动机角色)。

另有 `x:orthogonal-decomposition-of-the-ambient-space` 的 `strang:row-space-to-column-space-invertible` 属同类越列(divergence 自认它是 Strang 版本额外产出、Apostol 版本给不出),但该节点已按更严重的遗漏前提记为死因 1。

**核验为真、经得起回源的成员关系**(抽样但覆盖全部 22 节点的主干):`x:linear-independence`(含 Apostol EXAMPLE 6 求导取 t=0 / EXAMPLE 7 乘 e^{−a_M x} 令 x→+∞ 两种逐族论证,均逐字核对)、`x:unique-coordinates-in-a-basis`、`x:all-bases-are-equinumerous`(Strang 3.4 的 W=VA 短宽夹逼、"If m>n we exchange the v's and w's" 已核对)、`x:orthogonality-is-a-vanishing-pairing`、`x:pythagorean-identity-for-orthogonal-parts`、`x:projection-onto-a-one-dimensional-direction`、`x:projection-onto-a-subspace`、`x:orthogonality-of-the-residual`、`x:best-approximation-by-the-projection`、`x:solution-set-of-a-homogeneous-linear-condition`。

**divergence 诚实性**:未发现把真实分歧粉饰为"表述差异"的情形——本批 divergence 普遍偏向充分披露,多处甚至自己写明了成员越列的理由(这也是我据以定罪的依据)。反方向的问题(把同一件事夸大成分歧)出现 1 处半:`x:vectors-need-not-be-columns` 把 Strang 3.4 末尾的**具名小节** "Bases for Matrix Spaces and Function Spaces"(约 25 段,当场算出 2×2/n×n/上三角/对角/对称矩阵空间与 y''=0,−y,y 三个解空间共五个维数)说成"两段附注加习题",并称 3.4/3.5"全跑在列上"(被同一小节反证)、该附注"要到第10章才活起来"(所给源里唯一的 Chapter 10 引用在 3.5:257,讲电网络);整段 Apostol/Strang 强弱对比因此反转。`x:span-of-a-set` 同类但较轻。

两处核验为**真**、原本最像虚构的断言,特此记录以免后手误杀:`x:right-count-*` 的"delegates the proof to Chapter 12"确有其事(`15.08.md:25`:"The proof of (a) is identical to that of part (b) of Theorem 12.10...");其"uses it in 15.11"亦为真(`15.11.md:15` 原文"Theorem 15.7(b) shows that S is a basis for V")。`x:best-approximation-by-the-projection` 称 Strang 4.2 全节未给唯一性子句,全文检索核实为真。

## 4. 最危险的 5 个问题

按"会让下游读者算错或引错"排序:

1. `d:rescaling-preserves-orthogonality` — 公式 `(c_i y_i, c_j y_j)=c_i c_j (y_i,y_j)` 在复情形直接错,而节点自带的锚点正是"c 可为任意复数"。这是唯一一处**可被直接抄去用的错公式**。
2. `x:orthogonal-decomposition-of-the-ambient-space` — 遗漏 S 有限维前提,把一条有条件的分解定理写成无条件的。X 层是给跨教材复用的,这个前提丢失会一路传下去。
3. `x:dimension-versus-rank` — 把 Apostol 全章不存在的 rank 三定理列为共享成员。若下游按成员表生成"两书都讲了 X"的结论,会凭空给 Apostol 安上 rank 理论。
4. `x:right-count-upgrades-one-basis-property-to-both` 与 `x:independence-criterion-and-its-consequences` 的**锚点互换** — 两个节点各自的锚点都在支撑对方的 statement。这类错误在机器化的"锚点存在性"检查下 100% 通过,只能人工发现。
5. `x:vectors-need-not-be-columns` — 唯一一处把两书强弱关系整体讲反的 divergence,而它恰是"抽象 vs 具体"这条主线的招牌节点。

## 5. 我不确定的地方

- **X 层成员表的收纳标准未定**。我采用的线是:同一数学事实的不同写法(如 `P=aa^T/a^Ta` 作为沿单方向投影的矩阵形式)、以及为到达同一结论所必需且 divergence 已说明角色的引理(如 `strang:ata-invertible-iff-independent-columns`、`strang:all-bases-have-the-same-size`)算成员;**另一条定理**(rank 计数、解的个数、row→column 可逆性)不算。若项目的标准更宽(只要在同一推理链上就算成员),那么我按死因 2 记的 4 个 FIX 中至少 3 个应降为 KEEP;若更严(只有 statement 逐字对应才算),则 `x:projection-onto-a-subspace`、`x:all-bases-are-equinumerous`、`x:pythagorean-identity-for-orthogonal-parts` 也要一并 FIX。**这条线需要项目方裁定**,它决定 X 层判决的一半。
- `x:projection-onto-a-subspace` 内部有一处张力:divergence 称 Apostol 的和式为 "basis-dependent",而它自己的成员 `d:projection-does-not-depend-on-the-chosen-orthonormal-basis` 说投影不依赖基的选取。我按"basis-dependent = 须经某组基写出"读为真而 KEEP,但若按字面读则应 FIX。
- `x:orthogonality-of-the-residual` 的 statement 末句"is what both books use to identify it"与其 divergence 的"逻辑方向相反"(Apostol 是验证、Strang 是输入)有张力。我因 divergence 已把差别写明而 KEEP。
- `x:zero-element-destroys-independence` 与 `x:orthogonality-to-a-whole-set` 两个 FIX 都只是一个词的问题("explicitly"、"proves"),严重度很低,只因"宁可误杀"的口径才没有 KEEP。若项目希望 FIX 只用于影响结论的缺陷,这两个可以合并成一条编辑备注。
- Strang 侧我只有 `source/strang-ch3/` 与 `source/strang-ch4/`。凡 divergence 提到第 10 章、伪逆、后续章节的断言,我只能在所给范围内否证(如 Chapter 10 那处),**不能确认**它们在全书范围内是否成立。
- 全部锚点的逐字存在性按任务书要求未重验,我只审"锚点是否支持 statement"。`x:right-count-*` 的错置是在这个层面发现的;同类错置若还有,只可能藏在我判 KEEP 的节点里。
- D4 层 63 个节点中我 KEEP 了 58 个,其中若干 `atomic_reason` 的措辞(如把 `(y_j,y_j)` 称作"the quotient")属不改变数学的口误,我按既定口径未记为缺陷。
