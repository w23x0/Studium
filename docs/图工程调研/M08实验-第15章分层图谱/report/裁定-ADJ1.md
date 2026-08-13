# 裁定报告 ADJ1

独立裁定人 ADJ1，对九个存在 A/B2 冲突裁决的节点逐一裁定。
维度：B2 的 deletion test（删除该节点后，学习者能否从 parent + 现存 siblings 重新导出其内容）。

冲突来源已查明：三个 `x:` 节点由 **A2** 判 FIX（成员越列/出处错置，均为 `cause 2/3`），六个 `d:` 节点由 **A4a** 判 FIX（末句过度断言/锚点射程，`cause 1/2/3`）。两批 A 侧修复看上去均已落进 `data/nodes-*.jsonl` 的现行文本。B2 随后在同一批节点上判了 2 FIX + 7 KILL。

## 1. 结论表

| id | B2 verdict | ADJ1 裁定 | 死因编码 | 一句话依据 |
| --- | --- | --- | --- | --- |
| `x:dimension-versus-rank` | FIX | **UPHOLD**（FIX，且扩大修复范围） | 0（存活） | 三句 statement 全部可从 siblings + L1 复得，但 `divergence` 里的负向对齐（rank 在 Apostol 第15章零次出现）无任何 sibling 承担，不可删。 |
| `x:independence-criterion-and-its-consequences` | FIX | **UPHOLD**（FIX，并给出可执行锚点） | 0（存活） | 首句确与 `x:unique-coordinates-in-a-basis` 同命题；但"独立性失效时 p 唯一而 x-hat 不唯一"无 sibling 承担，且我在 `4.3.md` 找到了它的逐字锚点，B2 的提升方案可执行。 |
| `d:ten-axioms-listed-in-three-groups` | KILL | **UPHOLD**（KILL） | 5 | A4a 修完后只剩计数句；「十条、三组」逐字在 parent statement 里，组内规模 2/4/4 由三个 L1 组节点的公理编号区间明写，无一原子残留。 |
| `d:axioms-2-7-8-9-are-the-scalar-dependent-axioms` | KILL | **OVERRIDE → FIX** | 0（存活） | B2 的"10 减 4"论证打的是 A4a 已改掉的**旧假句**；改后的末句含一条不可导出的事实（公理 6、10 确实点名标量 -1 与 1，二者在两个域里都有），且本节点**无兄弟**，parent 不含此句。 |
| `d:an-example-is-a-set-plus-two-explicit-operations` | KILL | **UPHOLD**（KILL，附并入建议） | 5 | 与兄弟 `d:linear-space-is-a-set-together-with-two-operations` 同题且**共用同一条 (file, quote) 锚点**（B 型借用引文，已核）；A4a 补的例次普查每一项都在各例自己的节点里明写。 |
| `d:example-1-verification-is-the-field-axioms-of-r` | KILL | **UPHOLD**（KILL，但**并入 parent 是强制的**，不可裸删） | 5 | 十条映射表是纯代入、可机械导出；但"本例不能检验公理独立性"这一句 parent 与唯一的兄弟都没有——B2 引的 example-3 先例并不对称。 |
| `d:function-space-zero-is-the-everywhere-zero-function` | KILL | **UPHOLD**（KILL，**零残留**，无需并入） | 5 | 首句在 parent statement 里逐字（"with the everywhere-zero function as zero element"）；末句的机制（公理 2 把零函数放回集合）在兄弟 `:61` 里**逐字**；末句举的实例（degree exactly n）在兄弟 `:62` 里明写。且本节点**唯一**锚点是与 `:61` 共用的借用引文（B 型，已核）。 |
| `d:degree-exactly-n-is-not-a-subspace-of-degree-at-most-n` | KILL | **UPHOLD**（KILL） | 5 | "不是子空间"由 parent"不是线性空间"+ 定理 15.4 一步即得；"寓意"是子空间定义的改写；且 `apostol:cx-degree-exactly-k-inside-p-n-still-fails-closure` 以更强形式（带反例、带 Exercise 19 的正对照）承担同一命题。两条锚点**全部**是借用引文，独有锚点为 0；它的 `contrasts` 边与 `A1.jsonl:22` 的既有边重复。 |
| `x:least-squares-is-a-projection` | KILL | **OVERRIDE → FIX** | 0（存活） | statement 首句确与 `x:projection-onto-a-subspace` 同义（B2 对），但"不可解的精确问题被换成可解的正交条件"这一 invariant 及其"动机相反"的负向对齐**全图无承担者**：22 个 x: 节点里只有本节点出现 no solution / unsolvable / salvage，且它是 `strang:solvability-condition` 的**唯一**持有者。B2 只把它和 `x:best-approximation-by-the-projection` 的末段比过，没查这一项。 |

## 2. 逐节点裁定

### 2.1 `x:dimension-versus-rank` — UPHOLD（维持 FIX，并扩大修复范围）

节点位置：`data/nodes-X.jsonl:8`。A2 已修（`audit_fix: audit-A2`，`strang_ids` 已按 A2 建议裁到 `strang:dimension` + `strang:pivot-rows-basis-for-row-space`）。

**B2 的理由**：statement 首句与 `x:all-bases-are-equinumerous` 重复；第三句是 `strang:dimension` 自带的告示；真增量是"rank 在 Apostol 第15章零次出现"这条负向对齐，埋在 `divergence` 里。

**我读的 sibling**（`x:` 节点无 `parent`，同层 peer 即 `nodes-X.jsonl` 全部 22 个；与本节点同主题的逐条读了 4 个，另全量 grep 了 `rank` 一词的分布）：

- `x:all-bases-are-equinumerous`（:7）— "This is the theorem that makes 'dimension' a well-defined function of the space rather than of a chosen basis."
- `x:basis`（:5）、`x:unique-coordinates-in-a-basis`（:6）、`x:vectors-need-not-be-columns`（:1）
- L1 底座：`apostol:dimension`（`inherited/nodes-A1.jsonl:36`）、`apostol:dim-notation`（:37）、`strang:dimension`（`inherited/nodes-S1.jsonl:19`）、`strang:rank-theorem`（:30）、`strang:counting-theorem`（:31）、`strang:fundamental-theorem-of-linear-algebra-part-1`（:29）、`strang:pivot-rows-basis-for-row-space`（:35）

**逐句删除测试**：

| statement 句 | 谁已承担 | 结论 |
| --- | --- | --- |
| 1「Dimension is the common size of all bases of a space」 | `x:all-bases-are-equinumerous` 全句 + `apostol:dimension` 的定义句 + `strang:dimension`「the number of vectors in every basis」 | 冗余，三处重复 |
| 2「Rank … equal to the number of pivots，且等于列空间与行空间的维数」 | `strang:rank-theorem`（:30）statement 逐字含"column space of A has dimension r, the same as the row space"；pivot 计数在 `strang:dimension` 与 `strang:pivot-rows-basis-for-row-space` | 冗余，纯 Strang 侧复述 |
| 3「两词不可互换：一个只对空间有定义，一个只对矩阵有定义」 | **B2 说对了**：`strang:dimension` statement 末句已写"We never speak of the rank of a space or the dimension of a basis."原文在 `source/strang-ch3/3.4.md:276` | 冗余 |

三句全部可复得。**但删除测试不是对 statement 做的，是对节点做的。** `divergence` 里有一条无任何 peer 承担的信息：**rank 与四个基本子空间在 Apostol 第15章不是"讲法不同"而是结构性缺失，因此不得在 Apostol 侧为 Rank Theorem / Counting Theorem / Fundamental Theorem part 1 寻找对应物。** 我实测核实：`grep -ric rank source/apostol-ch15/` 全部文件返回 0，该章通篇无 rank 一词。全量扫描 22 个 `x:` 节点的 statement+divergence，"rank"仅出现在另外 3 个节点且均为顺带提及（`x:vectors-need-not-be-columns` 说"pivots, rank, R 不适用于 sin x"；`x:independence-criterion` 说"full column rank"；`x:projection-onto-a-one-dimensional-direction` 说"rank-one matrix"），**没有一个说出"Apostol 侧无此物、不要去找"**。这条是跨教材对齐图谱里最有判断力的一类结论（负结果防止读者伪造对应关系），删掉是净损失。

**裁定：UPHOLD B2 的 FIX**，不判死，`cause 0`。B2 在这个节点上没有过度开火——它自己就没判死。我同意它的修复方向，并补两条：

1. B2 的修复清单我全部接受（改成负向对齐、把 divergence 证据提升进 statement、删去重复的维数定义句）。**追加**：第三句也要删，理由是与 `strang:dimension` 重复（B2 只说它"是 strang:dimension 自带的告示"，未明确列入删除清单）。
2. **B2 修复清单里的第 4 项不可直接执行**：它建议"节点类型宜从共享不变量改标为单边缺口"。SPEC 的 `node_type` 是封闭四值（`concept`/`method`/`theorem`/`notation`），`x:` 节点 schema 里**没有**"共享不变量 vs 单边缺口"这一栏。要执行必须先扩 schema（例如加 `alignment_kind: shared|unilateral-gap`），否则只能写在 statement 散文里。这是 SPEC 的表达力缺口，记入第 5 节。

**顺带发现的正确性问题**（详见第 3 节）：若按 B2 建议删去 statement 第二句，则第三条锚点 `3.5.md :: Rank Theorem: The number of independent columns =the number of independent rows`（79 字符）将失去它所支撑的断言——A2 已把 `strang:rank-theorem` 从成员里移走，该锚点届时挂空。这是 **E 型（无锚点从句）的镜像**：锚点在、断言没了。执行修复时必须一并处理。

### 2.2 `x:independence-criterion-and-its-consequences` — UPHOLD（维持 FIX，并补上 B2 没给的锚点）

节点位置：`data/nodes-X.jsonl:9`。已被改过两轮：A2 判 FIX（`apostol:theorem-15-7` 成员越列、锚点疑与 `x:right-count-upgrades-one-basis-property-to-both` 互换），当前 `audit_fix` 字段记的是 `orchestrator-formB`。我核对：`apostol:theorem-15-7` 已从 `apostol_ids` 移除，首锚点已换成 15.08 的唯一性原句，**A2 的修复确已落盘**。

**B2 的理由**：首句与 `x:unique-coordinates-in-a-basis`「existence from spanning, uniqueness from independence」是同一双条件；第二句的等价链按 divergence 自己的话是"关于表示矩阵而非子空间的陈述"，故非共享不变量；唯一真增量埋在 divergence 末句。

**我读的 sibling**：`x:unique-coordinates-in-a-basis`（:6）、`x:linear-independence`（:3）、`x:right-count-upgrades-one-basis-property-to-both`（:22）、`x:projection-onto-a-subspace`（:17）、`x:best-approximation-by-the-projection`（:19）、`x:orthogonality-of-the-residual`（:18）。

**逐句删除测试**：

| statement 句 | 谁已承担 | 结论 |
| --- | --- | --- |
| 1「独立性正是使表示唯一的条件」 | `x:unique-coordinates-in-a-basis` 首句「existence comes from spanning, uniqueness from independence」——同一命题的两种措辞 | 冗余，B2 正确 |
| 2 等价链「满列秩 ⟺ 零空间平凡 ⟺ A^T A 可逆」 | 链上每一环都已散落在 sibling 里：`N(A)={0}` 在 `x:linear-independence` divergence（"converts it into the matrix test N(A) = {0}"）；`A^T A` 可逆⟺列独立在 `x:projection-onto-a-subspace` divergence（"must prove separately that A-transpose-A is invertible exactly when the columns are independent"） | 环已备齐；且按定义它是 Strang 单边内容，不该充当"共享不变量" |

**divergence 末句的删除测试**：「独立性失效时，列空间上的投影 p 仍存在且唯一，但系数向量 x-hat 不唯一——Apostol 从不把 S 的元素与其系数元组分开。」

我逐个查了三个投影类 sibling，**没有一个承担这条**：
- `x:projection-onto-a-subspace`：divergence 明确从"an arbitrary INDEPENDENT list"起步，**假设了独立性**，不讨论失效情形。
- `x:best-approximation-by-the-projection`：讲的是"定理 vs 定义"的位置互换与唯一性条款存否，唯一性指的是**极小元 t=s 的唯一性**，不是系数向量的唯一性。
- `x:orthogonality-of-the-residual`：讲残差的两个名字（error vector / N(A^T) 成员），无系数讨论。

所以这条是真增量，节点不能删。**裁定：UPHOLD B2 的 FIX**，`cause 0`。

**我给 B2 补一条它没给的东西**：B2 说这条"值得独立成节点"，但没说它能不能满足锚点硬校验——按 SPEC「找不到可逐字引用的依据 ⇒ 不要收录」，提升一条无锚点的断言会直接制造 E 型缺陷。我去查了源文件，**它是可锚的**：Strang §4.3 有一整节标题就叫 `## Dependent Columns in A: What is x?`（`source/strang-ch4/4.3.md:213`）。四条候选引文我已逐字校验存在（`in text == True`）：

| 候选引文 | 字符数 | 合规 |
| --- | --- | --- |
| `An equation with no solution has become an equation with infinitely many solutions.` | 83 | 合规 |
| `From the start, this chapter has assumed independent columns in A.` | 66 | 合规 |
| `Which x is best if A has dependent columns?` | 43 | 合规 |
| `## Dependent Columns in A: What is x?` | 37 | 合规 |

原文 `4.3.md:223` 同一段还写着把 b=(3,1) 投到 p=(2,2)、"That changes the equation Ax = b to the equation A x-hat = p"，即 **p 定了而 x-hat 有无穷多解**，正是 B2 要提升的那件事。执行修复时须 `sections` 补 `'4.3'`（现为 `['15.08','3.3','4.2']`）。

**两处需与执行者交代的连带问题**（并入第 3 节）：
1. 删去首句会使第一条锚点 `15.08.md :: But since the basis elements are independent, this implies $c_{i}=d_{i}$ for each i`（83 字符）挂空——它支撑的正是被删的首句。与 2.1 同型。
2. **3 锚点上限在这里real bites**：要加 4.3 的新锚点，就得从现有三条（15.08 / 3.3 / 4.2）里删一条，而 4.2 那条（`A^T A is invertible if and only if...`）是等价链末环的唯一凭据。此为 SPEC 约束致的取舍，非生产者过失，记入第 5 节。
3. **结构性观察**：若 2.1 与 2.2 两处 FIX 都按 B2 方案执行，则 22 个跨教材对齐节点里会出现**两个"无共享不变量"节点**——它们记录的是 Apostol 侧的结构性缺失，而非两侧共有的东西。这类节点在 `x:` schema 里没有合法位置（详见第 5 节）。

### 2.3 `d:ten-axioms-listed-in-three-groups` — UPHOLD（维持 KILL，`cause 5`）

节点位置：`data/nodes-D1.jsonl:5`。parent = `apostol:linear-space`。A4a 已修（删掉了原末句"The grouping is expository rather than logical, since no result is licensed to use one group in isolation from the others."，因该全称否定为假——定理 15.1 的证明只用了同属加法组的公理 5 与交换律）。

**B2 的理由**：复述 parent 的"subject to ten axioms listed in three groups"；三个分组已是 L1 兄弟节点；剩下的"分组只是叙述性的"是无后果的元评论。

**先记一条 B2 的程序问题**：B2 理由的末半句针对的正是 **A4a 已经删掉的那句话**。现行 statement 里没有任何"分组只是叙述性的"内容。B2 是在**修复前的文本**上做的判断。这不改变结论（它的主论据独立成立），但说明 B2 的输入不是当时的落盘状态，记入第 4 节。

**我读的 sibling**（parent `apostol:linear-space` 名下共 14 个 `d:` 子节点，全部读过；另加三个 L1 组节点）：`d:linear-space-is-a-set-together-with-two-operations`、`d:nature-of-the-elements-is-left-unspecified`、`d:linear-space-requires-a-nonempty-underlying-set`、`d:axioms-replace-a-construction-with-required-properties`、`d:one-proof-from-the-axioms-serves-every-example`、`d:vector-space-and-linear-vector-space-are-aliases`、`d:unqualified-linear-space-may-be-real-or-complex`、`d:objects-already-met-that-can-be-added-and-scaled`、`d:an-example-is-a-set-plus-two-explicit-operations`、`d:examples-are-asserted-to-satisfy-the-axioms-and-left-to-the-reader`、`d:example-1-the-real-numbers-form-a-linear-space`、`d:linear-space-concept-permeates-algebra-geometry-analysis`、`d:knowledge-of-one-example-guides-work-in-the-others`；L1：`apostol:closure-axioms`、`apostol:axioms-for-addition`、`apostol:axioms-for-multiplication-by-numbers`（均在 `inherited/nodes-A1.jsonl:2-4`）。

**逐原子删除测试**（现行 statement 只剩三个原子）：

| 原子 | 谁已承担 | 位置 |
| --- | --- | --- |
| 恰好十条公理 | parent statement **逐字**："subject to ten axioms listed in three groups" | `inherited/nodes-A1.jsonl:1` |
| 分三组 | 同上，同一从句 | 同上 |
| 组内规模 2 / 4 / 4 | 三个 L1 组节点各自 statement 用**公理编号区间**明写："(Axioms 1 and 2)"、"(Axioms 3 to 6)"、"(Axioms 7 to 10)" | `inherited/nodes-A1.jsonl:2` / `:3` / `:4` |

三个原子全部有明确的、可指名的承担者，**没有任何信息因删除而丢失**。裁定：**UPHOLD KILL，`cause 5`**。

**一处我不采用的论证**（避免过度开火）：不能用"数子节点个数即得组内规模"来支持冗余。实测三组的子节点数是 **3 / 4 / 5**，而真实公理数是 2 / 4 / 4——因为 `d:only-axiom-1-states-that-the-result-is-unique`（:20）与 `d:axiom-10-is-derivable-from-apostols-form-of-axiom-6`（:23）是分析性节点而非公理节点，混在公理节点里。**数孩子会数错。** 我的冗余判定只依赖上表第三行的编号区间明写，不依赖计数。

### 2.4 `d:axioms-2-7-8-9-are-the-scalar-dependent-axioms` — OVERRIDE → FIX

节点位置：`data/nodes-D1.jsonl:24`。parent = `apostol:complex-linear-space`（`inherited/nodes-A1.jsonl:7`）。A4a 判 FIX，理由是原末句"The remaining six axioms speak only of elements of V"为假（公理 6 说 (-1)x、公理 10 说 1x，都提到标量），会与 `d:axiom-6-names-the-negative-as-minus-one-times-x` 直接冲突。

**B2 的理由**：复述 parent 首句（parent 已逐条点名这四条）；剩下的"其余六条只谈 V 中元素，故不受标量域改变影响"是 10 减 4 的直接补集，读 parent 一眼可得。

**B2 又读了修复前的文本。** "其余六条只谈 V 中元素"正是 A4a 判定为**假**并已改掉的那句。现行末句是：*The remaining six axioms name no scalar other than the fixed numbers -1 and 1 (in Axioms 6 and 10), which lie in both fields, and are therefore untouched by the change of scalar field.* 这不是"10 减 4 的补集"——它恰恰否认了那个补集论证：其余六条**不是**没有标量，而是只有 -1 和 1 这两个定数。B2 的论证对旧句成立，对新句不成立。

**sibling 情况**：`apostol:complex-linear-space` 名下**只有这一个子节点**。删除测试的"parent + siblings"在这里退化成"parent 一个人"。parent statement 全文为：*If real number is replaced by complex number in Axioms 2, 7, 8 and 9, the resulting structure is a complex linear space; its scalars are the complex numbers. All the theorems proved for real linear spaces are valid for complex linear spaces as well.* ——**没有任何一句谈其余六条公理里有没有标量。**

**逐句删除测试**：

| statement 句 | 谁已承担 | 结论 |
| --- | --- | --- |
| 1「恰有四条提到实数，即公理 2、7、8、9；替换后成为复线性空间」 | parent 首句逐字覆盖 | 冗余，B2 正确 |
| 2「其余六条只点名 -1 与 1（在公理 6、10 中），二者在两域中皆有，故不受标量域改变影响」 | **无人承担**。parent 无此内容；本节点无兄弟；`d:axiom-6-names-the-negative-as-minus-one-times-x`（:22，parent 是 `apostol:negative-of-an-element`，**不是本节点的兄弟**）只讲公理 6 自己指名 -1，不讲"因此标量域改变不影响它" | 真增量，不可删 |

我把公理原文逐条核了一遍（`source/apostol-ch15/15.02.md:7-49`）：公理 1、3、4 无标量；公理 5 是 `x + O = x`，无标量；公理 6 是 `x + (-1)x = O`，标量 -1；公理 10 是 `1x = x`，标量 1。**末句为真。**

**裁定：OVERRIDE → FIX。** 判死是错的。这条节点是全图**唯一**挡住"其余六条与标量无关"这个错误推论的地方——而这个错误推论有案可查：本节点自己的修复前版本就栽在上面。删掉它，A4a 那次修复的成果一并消失，学习者会重新落进同一个坑。`cause 0`（存活）。

**修法**（三步，均可执行）：
1. 删去 statement 首句（与 parent 逐字重复），保留末句。
2. 末句目前**无锚点管**（E 型）。现有唯一锚点 `15.02.md :: If real number is replaced by complex number in Axioms 2, 7, 8, and 9...`（128 字符）支撑的是被删的首句。补两条合规锚点，我已逐字校验：
   - `AXIOM 6. EXISTENCE OF NEGATIVES. For every x in V, the element $(-1)x$ has the property`（**87 字符**，单行，合规）
   - `AXIOM 10. EXISTENCE OF IDENTITY. For every x in V, we have 1x = x.`（**66 字符**，单行，合规）
   连同保留的替换句共三条，正好触到 3 锚点上限。
3. "-1 与 1 在两个域中都有，故不受影响"这一步是 Apostol 没写的推理，应按 SPEC 标 `origin: model` 并如实说明。本文件已有先例可循：`d:axiom-10-is-derivable-from-apostols-form-of-axiom-6`（:23）statement 开头就写"Apostol does not remark on this; the derivation below is not in the text."

**一条必须拦下的错误修复**（正确性问题，详见第 3 节）：**A4a 对首句的改法本身是假的，不得执行。** A4a 建议把"mention real numbers"改成"contain the phrase real number"。实测 `grep -n -i "real number" 15.02.md` 只命中第 9 行（公理 2）、第 31 行（公理 7）和第 51 行（正文段），**公理 8 与公理 9 并不含"real number"这一短语**——它们写的是 `all real $a$`（`15.02.md:37`）与 `all real $a$ and $b$`（`15.02.md:43`）。所幸落盘时只采纳了 A4a 的末句改写、未采纳首句改词，现行文本因此侥幸为真。若后续执行者去补做 A4a 那半个未应用的修复，会**引入**一处事实错误。

### 2.5 `d:an-example-is-a-set-plus-two-explicit-operations` — UPHOLD（维持 KILL，`cause 5`）

节点位置：`data/nodes-D1.jsonl:42`。parent = `apostol:linear-space`。A4a 判 FIX：原末句"every example in this section opens by naming its operations before any axiom is checked"经逐例核对为假，改为现在的例次普查。

**B2 的理由**：与兄弟 `d:linear-space-is-a-set-together-with-two-operations`（:1）同题，后者正文已写同一件事，**并且已经把本节点赖以成立的 15.03 原句收作自己的锚点**；保留前者，因为它另有"同一底集换运算即另一空间"的判别力。

**B 型借用引文，已机器确认。** 我扫了全部 `nodes-*.jsonl`，`15.03.md :: If we specify the set V and tell how to add its elements and how to multiply them by numbers, we get a concrete example of a linear space.`（138 字符）这条 `(file, quote)` 对**恰好被两个节点引用**：`:1` 与 `:42`。而 `:42`（本节点）**只有这一条锚点**，`:1` 另有一条 15.01 的锚点。也就是说本节点的全部原文依据都是与兄弟共用的那一条——正是方法学备忘里的 B 型。

**我读的 sibling**：parent 名下 14 个 `d:` 子节点全部读过（清单见 2.3）。与本节点争议直接相关的四个：`d:linear-space-is-a-set-together-with-two-operations`（:1）、`d:examples-are-asserted-to-satisfy-the-axioms-and-left-to-the-reader`（:43）、`d:example-1-the-real-numbers-form-a-linear-space`（:44）、`d:axioms-replace-a-construction-with-required-properties`（:4）。

**逐原子删除测试**：

| 原子 | 谁已承担 | 位置 |
| --- | --- | --- |
| 造一个具体线性空间须给三项数据（V、加法、数乘） | 兄弟 `:1`："a set V paired with a rule for adding two elements and a rule for multiplying an element by a number" | `nodes-D1.jsonl:1`，**真兄弟** |
| 缺任一规则则公理无所指 | 兄弟 `:1`："Specifying V without the two operations specifies nothing" | 同上 |
| 运算来源的粗粒度概括 | 兄弟 `:43`："in every example the operations are inherited from the real numbers componentwise or pointwise" | `nodes-D1.jsonl:43`，**真兄弟** |
| 例 1–3 各自点名运算 | 例 1 在真兄弟 `:44`（"with ordinary addition and ordinary multiplication"）；例 2 在 `:47`、例 3 在 `:50`（非兄弟，但各在自己 parent 名下明写） | :44 / :47 / :50 |
| 例 5–12 共用函数空间前言的运算 | `apostol:function-space` 名下三节点更细地承担：`d:function-space-addition-is-pointwise`（:57）、`d:function-space-scalar-multiple-is-pointwise`（:59）、`d:for-function-spaces-closure-is-the-only-real-content`（:62） | :57 / :59 / :62 |

我按原文（`source/apostol-ch15/15.03.md:1-40`）逐例核过 A4a 这份普查，**它是真的**：例 1「let $x+y$ and $ax$ be ordinary addition and multiplication」、例 2「define $x+y$ to be ordinary addition of complex numbers」、例 3「defined in the usual way in terms of components」都自带运算；例 4 通篇不提运算；例 5–12 由前言「(f + g) (x) = f (x) + g (x)」一次性给定。

**裁定：UPHOLD KILL，`cause 5`。** 两点理由：

1. 核心断言与兄弟 `:1` 逐点重复，且本节点的**唯一**锚点是从 `:1` 借来的（B 型）。按 B2 的取舍——保留 `:1`，因为它多一条"同一底集换运算即另一空间"的判别力，而本节点没有——我同意。
2. 现存的差异化内容（例次普查）**是 A4a 的修补产物，不是节点原本的知识贡献**。原末句为假，被替换成一份纯记账式的普查；普查的每一项都能在相应例子自己的节点上读到。

**我如实记下删除会损失的东西**（不夸大也不隐瞒）：普查里有一项在别处**没有显式对应**——"例 4 自己不声明运算，沿用 V_n 的"。`d:example-4-nontrivial-check-is-closure-by-linearity-of-the-dot-product`（:55）只是间接蕴含（"identities that already hold throughout V_n, hence on any subset"）。另外"§15.3 先定运算后给集合"这一叙述顺序观察也随之消失。**建议**：若要留，按 B2 的思路并进兄弟 `:1` 的 statement 末句即可——`:1` 本来就持有那条锚点，并入不会产生新的无锚点从句。不值得为这两项单立节点。

### 2.6 `d:example-1-verification-is-the-field-axioms-of-r` — UPHOLD（维持 KILL，`cause 5`；但并入 parent 是强制条件）

节点位置：`data/nodes-D1.jsonl:46`。parent = `d:example-1-the-real-numbers-form-a-linear-space`（:44）。A4a 判 FIX，`cause 2`：逐条映射本身核过全部正确，缺陷在**锚点射程**——所引 `The reader can easily verify...` 只支撑末句，支撑不了那份十条映射表。A4a 要求 `sections` 补 15.02 并加一条例 1 原句锚点。我核对：`sections` 现为 `['15.02','15.03']`、例 1 锚点（144 字符）已在，**A4a 修复已落盘**。

**B2 的理由**：逐条映射是公理在最熟悉情形下的纯代入，无判别力；结论"本例无非平凡验证"已被 parent 的"smallest interesting example ... the degenerate case against which the other examples should be read"覆盖；与已被杀的 `d:example-3-verification-reduces-to-arithmetic-in-each-component` 属同一 species。

**我读的 sibling**：parent `:44` 名下只有**两个**子节点，本节点与 `d:operations-of-example-1-are-ordinary-arithmetic`（:45）。后者全文讲的是"例 1 的两个运算就是普通算术，数乘与集合内乘法同型"，不涉及公理验证，也不涉及独立性。

**逐原子删除测试**：

| 原子 | 谁已承担 | 结论 |
| --- | --- | --- |
| 十条公理→R 的算术律的逐条映射 | 无人逐条写，**但可机械导出**：parent 已给"V = R 配普通加法与普通乘法"，十条公理各有自己的节点（`d:axiom-1-…` 至 `d:axiom-10-…`，`nodes-D1.jsonl:10-19`），把 R 代进去即得。无需洞察。 | 冗余（可导出） |
| 「本例无非平凡验证」 | parent 的"the degenerate case against which the other examples should be read"，粗粒度覆盖 | 大体冗余 |
| 「因此本例不含公理独立性的任何信息」 | **parent 没有，唯一的兄弟 `:45` 也没有。** | **真缺口** |

**B2 引的先例并不对称，这点必须记下。** B2 说本节点与被杀的 example-3 verification 节点同 species。两者的处境不同：
- example-3 的 parent `d:example-3-v-n-with-componentwise-operations`（:50）statement **明写**"which makes it a poor test of whether a given axiom is really needed"——所以杀掉它的 verification 子节点确实零损失。
- example-1 的 parent（:44）**只说"degenerate case"，不含独立性判断**。
我用 grep 核了 `nodes-D1.jsonl`：`axioms' independence` 全文**只出现 1 次**，就在本节点里。

**裁定：UPHOLD KILL，`cause 5`，但附一个强制条件。** 前两个原子确属伪抽象/可导出，节点不值得独立存在，这一点 B2 对。但**裸删会丢掉第三个原子**。所幸 B2 自己在 `suggested_fix` 里已经写明了正确处置——"把它并入 parent 的 statement 末句，而不是单立节点"。我裁定：**KILL 成立，但必须连带执行这条并入**；若执行者只删不并，本裁定不支持。

**一条支持 KILL 的结构性理由（SPEC 侧，见第 5 节）**：这份十条映射表在 3 锚点上限下**根本无法合规锚定**——要支撑它需要十条公理原文，而锚点上限是 3。A4a 察觉了射程不足（它自己写了"那份映射的依据在 15.02 的公理原文"）并补了 `sections: 15.02`，**但并没有真的加进任何一条 15.02 锚点**。所以修复之后，映射表**仍然没有锚点管**（残留的 D 型/E 型）。这类"逐条验证映射"节点在现行锚点规则下先天不可能合规，是这一 species 该整批退场的独立理由。

### 2.7 `d:function-space-zero-is-the-everywhere-zero-function` — UPHOLD（维持 KILL，`cause 5`）

**位置** `data/nodes-D1.jsonl:60`，parent `apostol:function-space`（`inherited/nodes-A1.jsonl:12`）。

**A4a 此前的处置**：`cause 1`，判末句越界，已改写。当前 statement 两句：
1. "The element O required by Axiom 5 is realized in a function space by the function whose value is zero at every point of the domain, not by the number 0."
2. "A set of functions that happens to exclude this function, such as the polynomials of degree exactly n, cannot be a linear space under the pointwise operations, since Axiom 2 forces 0f = O into the set."

**B2 的 KILL 理由**（三条）：首句复述 parent 的 "with the everywhere-zero function as zero element"；末句补的判据是在**替公理 5 节点说话**；末句举的实例已由 `d:degree-exactly-n-has-no-zero-element` 承担。

**我读了 parent 的全部 11 个兄弟**（`apostol:function-space` 的子节点，`nodes-D1.jsonl` 的 `:57` `:58` `:59` `:61` `:62` `:63` `:64` `:74` `:75` `:76` 加本节点）。逐原子结果：

| statement 原子 | 谁已承担 | 位置 |
| --- | --- | --- |
| 函数空间的零元就是处处为零的函数 | parent statement **逐字**尾句："and with the everywhere-zero function as zero element" | `inherited/nodes-A1.jsonl:12` |
| "是函数不是数 0"这一对比 | parent 句式本身已把它说成 function；同一强调在 `d:zero-element-of-a-function-space-is-a-pointwise-identity`（非本 parent 下，`nodes-D2.jsonl:31`）里以"vanishes everywhere ⇒ 关系式是恒等式"的形式复述 | 同上 |
| 机制：公理 2 把零函数强行放回集合 | 兄弟 `:61` statement **逐字**："Axioms 5 and 6 are met by the zero function and by (-1)f, **both of which Axiom 2 puts back into the set**" | `nodes-D1.jsonl:61` |
| "在逐点运算下"这一限定 | 兄弟 `:62` statement 逐字："whether it is closed under **pointwise** addition and **pointwise** scaling" | `nodes-D1.jsonl:62` |
| 实例：degree exactly n 不是线性空间 | 兄弟 `:62` statement **明写**"Apostol names the closure axioms in exactly the three places where a set fails"，且其锚点就是"The set of all polynomials of degree equal to n is not a linear space because the closure axioms are not satisfied."；专管节点 `d:degree-exactly-n-has-no-zero-element`（`:70`）更完整（还说了公理 6 失去作用对象） | `nodes-D1.jsonl:62` / `:70` |

**B 型借用引文，机械确认。** 本节点的锚点只有一条：`15.03.md :: The zero element is the function whose values are everywhere zero.`（66 字符）。我遍历了全部 `nodes-*.jsonl` 的 anchors 字段，这条引文被**恰好两个**节点引用：本节点与兄弟 `:61`。而 `:61` 另有两条独立锚点（146、109 字符），本节点**除这条借用引文外一无所有**。这与 2.5 节的形态完全一致：**独有锚点为零 + 唯一锚点是共用引文**。

**E 型孤儿风险：本节点不构成。** 我特意核了 parent 的锚点——parent 的两条锚点（160、146 字符）分别管加法与数乘定义句，**并不管**它 statement 里的零元从句。但杀掉本节点后这条引文仍留在兄弟 `:61` 上，引文不出图，所以本次 KILL **不产生**新的孤儿锚点。（parent 的零元从句本身无锚点管，是一条先存的 E 型，与本次删除无关，记入第 3 节。）

**裁定：UPHOLD KILL，`cause 5`。这是九个节点里唯一一个零残留的删除。** 与 2.5、2.6 不同，我找不出任何需要并入的剩余原子：每一条都有指名的承担者，且承担者多为逐字重复而非"可推导"。B2 三条理由中前两条我确认成立；第三条（实例已被 `:70` 承担）成立但 B2 引错了最强的证人——真正的兄弟级承担者是 `:62`，`:70` 不是本节点的兄弟（其 parent 是 `d:degree-exactly-n-is-not-a-linear-space`），B2 用非兄弟节点做删除测试的承担者，这一次结论侥幸没错，但方法上是越界的（记入第 4 节）。

**一处对 B2 措辞的修正**：B2 说末句"在替公理 5 节点说话"。查 `d:axiom-5-existence-of-zero-element`（`nodes-D1.jsonl:14`）的 statement，它讲的是公理 5 本身的存在性断言，**并不含**"某集合排除零元则不成空间"这个反向判据。这个判据的真正承担者是 `:61` 与 `:62`。B2 的结论对，指认的承担者错。

### 2.8 `d:degree-exactly-n-is-not-a-subspace-of-degree-at-most-n` — UPHOLD（维持 KILL，`cause 5`）

**位置** `data/nodes-D1.jsonl:71`，parent `d:degree-exactly-n-is-not-a-linear-space`（`:67`）。statement 两句：
1. "The polynomials of degree exactly n sit inside the linear space of polynomials of degree at most n and inherit its operations, yet they are not a subspace, since a subspace must itself satisfy the closure axioms."
2. "The pair shows that being contained in a linear space and carrying its operations is not enough."

**B2 的 KILL 理由**：由 parent（不是线性空间）+ `apostol:subspace` 的定义一步即得；末句"寓意"就是子空间定义本身的改写。

**我读了全部 3 个兄弟**（`nodes-D1.jsonl` 的 `:68` `:69` `:70`）。逐原子结果：

| statement 原子 | 谁已承担 | 位置 |
| --- | --- | --- |
| exactly-n ⊂ at-most-n，且沿用同一运算 | parent statement 首句已把两者摆成同一约束的两个版本："Requiring the degree to equal n **rather than to be at most n** destroys the structure"，末句"isolates the difference between an inequality constraint and an equality constraint"；`inherited/nodes-A1.jsonl:22` 已有一条 `apostol:polynomials-of-degree-exactly-n --contrasts--> apostol:polynomials-of-degree-at-most-n` 边 | `nodes-D1.jsonl:67`；`inherited/nodes-A1.jsonl:22` |
| 不是子空间 | parent 说封闭性失效；`apostol:theorem-15-4-subspace-criterion` statement 逐字给出"S is a subspace **if and only if** S satisfies the closure axioms"。两者合成是**一步取反**，不是新信息 | `inherited/nodes-A1.jsonl:21` |
| 理由：子空间必须自身满足公理 | `d:subspace-satisfies-all-linear-space-axioms` statement 逐字："By definition a subspace is itself a linear space, so all ten axioms hold in S" | `nodes-D2.jsonl:3` |
| 末句寓意：被包含 + 沿用运算不够 | `apostol:subspace` 定义句的结构本身："a nonempty subset S of V is called a subspace **if** S is itself a linear space under the same operations"——"是子集"是前提，"是线性空间"是额外要求；`d:subspace-inherits-the-operations-of-the-ambient-space` 还把这条从句单独立成节点并解释了它的作用 | `inherited/nodes-A1.jsonl:20`；`nodes-D2.jsonl:2` |

**我找到了一个比 B2 所引更强的承担者，B2 自己没提。** `apostol:cx-degree-exactly-k-inside-p-n-still-fails-closure`（`data/nodes-CX2.jsonl:12`）statement 首句就是"the set of polynomials of degree exactly k … **is not a subspace**"，并且比本节点多给三样东西：具体反例（$t^k$ 与 $1-t^k$）、与 15.3 那个集合的失效项对账（"Adjoining f = 0 does repair the two failures that the degree-exactly-n set of Section 15.3 suffers … so Axiom 1 is the only surviving defect"）、以及 Exercise 19 的正向对照（degree ≤ k 就是子空间，维数 k+1，"localizes the entire failure in the word exactly"）。本节点想传达的"exactly 与 at most 的分水岭"这一寓意，在那里是**带证据的**，在这里是断言的。全图 statement 里出现"not a subspace"类表述的只有 4 个节点（`nodes-A2-s2.jsonl:6`、`nodes-CX2.jsonl:12`、本节点、`nodes-D2.jsonl:4`），我逐个读过，其中 CX2:12 与本节点同题且严格更强。

**B 型借用引文：本节点独有锚点为 0，是九个节点里最彻底的一例。** 我统计了两条锚点的引用节点数：
- 115 字符的"The set of all polynomials of degree equal to n is not a linear space because the closure axioms are not satisfied." —— **7 个**节点引用（`inherited/nodes-A1.jsonl:14`、`nodes-D1.jsonl:62` `:64` `:67` `:69` `:70` `:71`），其中 `:67` 就是本节点的 parent。
- 129 字符的定理 15.4 原文 —— **2 个**节点引用：`apostol:theorem-15-4-subspace-criterion` 与本节点。定理原文本就是那个 L1 节点的第一条锚点。

两条锚点都是别处的自有引文，本节点一条独有的都没有。这与 2.5、2.7 三次一致。

**边的层面也是重复的。** 本节点带 4 条出边（`data/edges-D1.jsonl:186-189`）：`part-of` 指 parent；`requires` 指定理 15.4（该定理已有 **12** 条入边，删掉一条不影响连通）；`other` 指 `d:subspace-satisfies-all-linear-space-axioms`；`contrasts` 指 `d:example-7-polynomials-of-degree-at-most-n`——而这条对照关系在 `inherited/nodes-A1.jsonl:22` 与 `data/edges-D1.jsonl:169`（`d:example-7-… --contrasts--> d:degree-exactly-n-is-not-a-linear-space`）已经存在两次。**删除不切断任何唯一路径**，包括 15.03↔15.06 的跨节链接（`nodes-CX2.jsonl:30` 也有一条 `contrasts` 指向定理 15.4）。

**裁定：UPHOLD KILL，`cause 5`。零残留，无需并入。** 本节点数学上完全正确（我核过：exactly-n 确实是 at-most-n 的子集，闭性确实失效，定理 15.4 的等价式确实给出"非子空间"），末句也确实落在锚点射程内——它死于冗余，不死于错误。这一点与 2.3 相同：A 类审计（数学正确性）与 B2（抽象增益）在此并不真冲突，两者判的是不同的量。

### 2.9 `x:least-squares-is-a-projection` — OVERRIDE → FIX

**位置** `data/nodes-X.jsonl:20`，`audit_fix: audit-A2`。x: 节点无 parent，删除测试的对照面是**同簇的 peer**。我读了投影/逼近簇的全部四个 peer：`x:the-pairing-that-carries-geometry`（:10）、`x:projection-onto-a-subspace`（:17）、`x:orthogonality-of-the-residual`（:18）、`x:best-approximation-by-the-projection`（:19），并对全部 22 个 x: 节点做了关键词普查。

**B2 的 KILL 理由**：复述 `x:best-approximation-by-the-projection` 的 divergence 末段（Apostol 的定理实例化为 Fourier/Legendre，Strang 流向数据拟合，函数逼近被推出本章）；statement 是 `x:orthogonality-of-the-residual` 与 `x:projection-onto-a-subspace` 的不变量换一种说法；"两侧动机相反"就是上述末段的同一件事。

**逐原子结果**：

| 原子 | 谁已承担 | 结论 |
| --- | --- | --- |
| statement 首句「无法精确表示时，最佳表示由投到生成子空间得到」 | `x:projection-onto-a-subspace` statement 逐字给出投影的极小化刻画 + `x:best-approximation-by-the-projection` statement"the projection of x on S minimises the distance to x, and it is the only minimiser" | **冗余，B2 对** |
| divergence 末段：Apostol 侧实例化为 Fourier / Legendre 逼近 | `x:19` divergence 末段逐字；`x:17` divergence 亦写"it reads identically in C(a,b), where it becomes the Fourier/Legendre partial sum" | **冗余，B2 对** |
| divergence 末段：Strang 把函数逼近推出本章 | `x:19`"he defers function approximation out of the chapter"；`x:10` divergence 末句更给了**原因**"nothing in his notation suggests that an integral could take the place of the sum, and function approximation is therefore deferred out of the chapter entirely" | **冗余，且 `x:10` 比本节点更强** |
| statement 末句「不可解的精确问题被换成一个可解的正交条件」 | **无承担者。** `x:17` 讲投影是什么、怎么算；`x:18` 讲残差正交是刻画条件；`x:19` 讲极小性是定理还是定义。三者都**不含**"原问题不可解"这一前提 | **存活** |
| divergence：Strang 的动机是不可解方程（b ∉ C(A)，Ax = b 无解，最小二乘是抢救方案） | **无承担者。** 我对 22 个 x: 节点全文（statement + divergence）搜 `no solution` / `unsolvable` / `overdetermined` / `salvage`，**命中仅本节点一个** | **存活** |
| divergence：Apostol 侧通篇不出现方程，故只读第 15 章的人不会知道这套理论能解超定系统 | **无承担者**，且这是**负向对齐**，与 2.1 节 rank 那一项同型 | **存活** |

**一条决定性的结构证据，B2 完全没查。** 本节点是 `strang:solvability-condition`（`inherited/nodes-S1.jsonl:3`："Ax = b is solvable exactly when … b must lie in the column space of A"）在**全部 22 个 x: 节点中的唯一持有者**。我逐个核过 `strang_ids` 字段：`strang:error-vector` 有 4 个持有者（:12 :18 :19 :20），`strang:normal-equation` 有 2 个（:17 :20），而 `strang:solvability-condition` 只有 :20。杀掉本节点，这条 Strang 侧 L1 节点在跨教材层**彻底失去对齐**。A2 在同一节点上做过相反方向的判断并明确肯定了这一项——"同批的 `strang:solvability-condition` 可保留：它给出 b∉C(A) 这一前提，divergence 已说明其动机角色"。**B2 的 reason 全文没有出现 solvability，也没有出现 b ∉ C(A)。**

**这就是 B2 与 A2 真冲突的所在，而我站 A2。** B2 的比较只做了一半：它把本节点与 `x:19` 的末段比过，得出"应用层重复"的正确结论，然后就据此判死——但它没有对本节点的 invariant（"不可解 → 可解"）与"动机"这两项做任何 peer 检索。**方法上这与 2.4 是同一个失误的另一种形态**：2.4 是拿旧句做前提，这里是**只对一个被点名的 peer 做删除测试，而不是对整簇**；两次都导致 B2 的 reason 文本里根本没提到那个真正存活的原子。

**裁定：OVERRIDE → FIX，`cause 0`。** 具体修复四步：
1. **删掉 statement 首句**（与 `x:17`/`x:19` 同义）。保留末句作为本节点的 invariant："The unsolvable exact problem is replaced by a solvable orthogonality condition."——这是它与整簇其余四个节点唯一不重合的不变量。
2. **divergence 砍掉应用层末段**（"Consequence" 之后关于 Fourier/Legendre 与函数逼近推出本章的部分，已由 `x:19` 与 `x:10` 双重承担），**保留动机对照与负向对齐**（Apostol 侧无方程 / Strang 侧 b ∉ C(A)）。
3. **补一条锚点，修掉一处 D 型射程不足**（详见第 3 节）。本节点现有的 4.1 锚点是 140 字符的 `It contains the error $e = b - A x$ in the "least-squares" solution. Least squares is the key application of linear algebra in this chapter.`——它**从动机句之后才开始**，因此支撑得住"残差"却支撑不住"b 在列空间之外所以无解"这个真正存活的原子。我核过：把锚点向前扩展到含动机句，全长 **333 字符，超 200 上限**，不可行（且中间夹着一处 OCR 损坏，`can't` 被识别成 `$\cos \mathrm{\Omega}_{\mathrm{t}}$`）。可行方案是**单独加第三条锚点**：`4.1.md :: When b is outside the column space-when we want to solve`——**56 字符，我已逐字核验存在于 `source/strang-ch4/4.1.md:31`，不跨行，落在 30–200 区间内**。本节点现只有 2 条锚点，加第三条不触 3 锚点上限，**无需牺牲任何现有锚点**（与 2.2 的处境不同）。
4. A2 那条修复（`strang_ids` 删去 `strang:four-possibilities-by-rank`）我已核**确已落盘**：当前 `strang_ids` 为 `solvability-condition / error-vector / normal-equation / projection-onto-a-subspace`，越列成员已不在。

## 3. 发现的正确性问题

以下都是我在裁定过程中顺带核出来的，**不属于**这九个节点的存废判断本身。按严重程度排序。

### 3.1 A4a 那条尚未落盘的修复文本本身是假的（会引入新错误）

`report/audit-A4a-verdicts.jsonl` 对节点 4 提出把"提到实数（mention real numbers）"改成"**含有 real number 这一措辞**"。这条改写是**错的**：

| 公理 | 原文措辞 | 位置 | 含 "real number"？ |
| --- | --- | --- | --- |
| 2 | "CLOSURE UNDER MULTIPLICATION BY REAL NUMBERS … every **real number** a" | `source/apostol-ch15/15.02.md:9` | 是 |
| 7 | "all **real numbers** a and b" | `15.02.md:31` | 是 |
| 8 | "all **real** $a$" | `15.02.md:37` | **否** |
| 9 | "all **real** $a$ and $b$" | `15.02.md:43` | **否** |

`grep -n real source/apostol-ch15/15.02.md` 的全部命中只有 9、31、37、43、51 五行，其中 37 与 43 写的是"real $a$"，**不含 "real number"**。当前落盘的 statement 用的是"提到实数"，语义为真，侥幸未受影响；但**若后续执行者去补齐 A4a 未应用的那一半，就会把一句真话改成假话**。这是我这轮唯一一处发现的"审计员的修复方案本身有数学/文本错误"，比生产者的错误更值得记一笔——修复方案没有被再审一遍。

### 3.2 D 型射程不足一处（`x:least-squares-is-a-projection` 的 4.1 锚点）

节点 9 的 140 字符锚点 `It contains the error $e = b - A x$ in the "least-squares" solution. Least squares is the key application of linear algebra in this chapter.` **起点落在动机句之后**。它支撑得住"残差 e = b − Ax"，支撑不住该节点真正存活的那个原子——"b 在列空间之外，所以 Ax = b 无解"。动机句在同一行的前半段（`source/strang-ch4/4.1.md:31`）。这正是 brief 所说的最危险形态：主题相关性抽查会通过（都在讲最小二乘），但断言与射程错位。修法见 §2.9 第 3 步。

### 3.3 E 型无锚点从句一处（`apostol:function-space`，先存缺陷）

`inherited/nodes-A1.jsonl:12` 的 statement 有三个从句（逐点加法、逐点数乘、零元），而它的两条锚点（160 字符与 146 字符）只覆盖前两个。**"with the everywhere-zero function as zero element" 这一从句没有任何锚点管。** 能覆盖它的引文（66 字符，`The zero element is the function whose values are everywhere zero.`）存在于图里，但挂在两个 d: 子节点上（`nodes-D1.jsonl:60` `:61`）。该 L1 节点当前只有 2 条锚点，加第三条不触上限。这与本轮删除无关（`:61` 保留该引文），但它本身是个应修项。

### 3.4 节点 6 的十条映射在修复之后仍然无锚点

A4a 察觉了射程不足并给节点 6 补了 `sections: 15.02`，**但没有真的加进任何一条 15.02 锚点**。所以那份"十条公理逐条对应 R 的域公理"的映射表在修复后依然处于无锚点状态。这既是残留的 D/E 型，也是我在 §2.6 支持 KILL 的一条独立理由。

### 3.5 B2 的一条修复建议在现行 schema 下不可执行

节点 1 的 `suggested_fix` 第 4 项要求改节点类型标签。`node_type` 是封闭的 4 值域（`concept`/`method`/`theorem`/`notation`），x: 节点又有自己的固定 schema，**没有一个合法取值能表达 B2 想要的那个标签**。执行者会卡在这一项上。

### 3.6 两处元数据不一致（轻微）

- 节点 9 的 `apostol_ids` 含 `apostol:theorem-15-16-approximation-theorem`，该节点 `sections=['15.15']`（定理原文在 `source/apostol-ch15/15.15.md:3`），而节点 9 自己的 `sections` 只声明了 `['15.14','4.1']`——**引用了一个未声明章节的成员**。
- `source/strang-ch4/4.1.md:31` 有一处 OCR 损坏：原文的 `can't` 被识别成 `$\cos \mathrm{\Omega}_{\mathrm{t}}$`。这不是图谱的错，但它**限制了锚点选取**——那句动机句无法作为完整句子引用，只能截取前 56 字符。这类源文件损坏应当有一份清单，否则每个碰到它的生产者都要重新发现一次。

### 3.7 删除会留下两条悬空入边（节点 7）

`data/edges-D1.jsonl:152` 与 `:171` 分别是 `d:function-space-axioms-reduce-pointwise-to-facts-about-real-numbers --requires-->` 和 `d:zero-polynomial-is-included-by-convention --requires-->` 指向节点 7。执行 §2.7 的 KILL 时这两条边必须改指 `apostol:function-space`（承担者就是它）。**这不构成保留理由**（承担者明确、改指是机械操作），但漏掉会破图。同类检查我对节点 8 做过：它的 4 条边全是出边，且目标另有充足入边，删除不留悬空。

## 4. 对 B2 方法本身的评价

### 4.1 B2 在这九个节点上的命中率

| 类别 | B2 判定 | 我维持 | 我推翻 | 备注 |
| --- | --- | --- | --- | --- |
| d: 节点（6 个） | KILL ×6 | 5 | 1（节点 4） | 其中 2 个（节点 5、6）我加了并入条件 |
| x: 节点（3 个） | FIX ×2、KILL ×1 | 2（皆 FIX） | 1（节点 9） | KILL 命中率 0/1 |
| 合计（9 个） | KILL ×7、FIX ×2 | 7 | 2 | 一致率 7/9 |

**结论：在这批样本上 B2 并不是"整体过度开火"，而是有一个可定位的分布性偏差。** 它的 KILL 在 d: 节点上准确（5/6），在 x: 节点上失手（0/1）；两处失手的共同点不是"判得太狠"，而是**删除测试的对照面选错了**。

### 4.2 系统性缺陷一：输入过期（两例，其中一例致命）

B2 至少两次在对**已被 A 类审计改掉或删掉的旧文本**做论证：

- **节点 3**：B2 反驳的那句"分三组、组内各 2/4/4 条"，A4a 已经删过一遍。结论侥幸未变（剩下的计数句同样冗余），属无害。
- **节点 4**：B2 的核心论据是"10 减 4 得 6，所以'另外六条不含标量'可由 parent 一步导出"。这句"另外六条不含标量"正是 A4a 判为假并**已经替换掉**的旧句。改后的末句（公理 6、10 确实点名标量 −1 与 1，二者在实域与复域中都是标量）**不可从 parent 导出，且全图无第二处承担**，而该节点**没有兄弟**。B2 打的是一个不存在的靶子，结论因此错误。这是我唯一一次因"B2 的前提与磁盘状态不符"而推翻它。

这是**流水线缺陷，不是判断力缺陷**：B2 读到的节点文本似乎不是 A 类修复应用后的版本。修法与 B2 的方法无关——重跑一遍就行。但它意味着**B2 这一轮的 29 条 KILL 里，凡是落在 A 类改过的节点上的，都需要按当前磁盘文本重新验一次**。

### 4.3 系统性缺陷二：x: 节点的删除测试只对单个被点名的 peer 做，而不是对整簇

x: 节点没有 `parent`，删除测试没有现成的对照面，必须自己划定同簇 peer。B2 在三个 x: 节点上的做法是**挑一个最像的 peer 逐句比对**：节点 1 比 `strang:dimension`、节点 2 比 `x:unique-coordinates-in-a-basis`、节点 9 比 `x:best-approximation-by-the-projection`。

这个做法能可靠地查出 **statement 冗余**——三次全对，我全部维持。它查不出的是**存活原子藏在 `divergence` 里**的情况：

| 节点 | statement | divergence 里的存活原子 | B2 是否检索过 |
| --- | --- | --- | --- |
| 1 | 三句全冗余 | rank 在 Apostol 第 15 章零次出现（负向对齐） | 是（判 FIX，正确） |
| 2 | 首句冗余 | 独立性失效时 p 唯一而 x̂ 不唯一 | 是（判 FIX，正确） |
| 9 | 首句冗余 | 不可解方程作为动机；Apostol 侧无方程 | **否（判 KILL，错误）** |

节点 9 的检索缺口是可证的：B2 的 reason 全文**不出现 solvability，不出现 b ∉ C(A)**，而这个节点是 `strang:solvability-condition` 在全部 22 个 x: 节点里的**唯一持有者**。同一节点上的 A2 明确肯定了这一项。所以这不是两人对同一事实的不同权衡，是 B2 漏检了一个字段。

**可操作建议**：x: 节点的删除测试必须**分字段做两遍**——statement 对 peer 的 statement，divergence 对**全簇**的 divergence——并且额外做一次 `apostol_ids`/`strang_ids` 的**唯一持有者检查**（某个 L1 成员是否只被这一个 x: 节点对齐）。后者是纯机械的，我在节点 9 上用它一步定案。

### 4.4 一个反向发现：B2 的 `suggested_fix` 字段比它的 `reason` 更可靠

- 节点 6：B2 判 KILL，但 `suggested_fix` 已写明"并入 parent 的 statement 末句"——**这正是唯一安全的执行方式**，我把它升格成了裁定的强制条件。
- 节点 7、8：真正零残留，`suggested_fix` 为空。
- 节点 5：`suggested_fix` 指向的合并目标（兄弟 `:1`）恰好就是那条共用锚点的自有者。

也就是说 B2 对残留的感知是准的，只是有时把"该并入"写成了 KILL。**执行 B2 的 KILL 时不读 `suggested_fix` 会造成真实信息损失**——节点 6 就是例子。

### 4.5 一处措辞层面的错误归因（不影响结论，但影响可复核性）

节点 7 上 B2 说末句"在替 `d:axiom-5-existence-of-zero-element` 说话"。我核了那个节点（`nodes-D1.jsonl:14`）：它讲公理 5 自身的存在性断言，**不含**"某集合排除零元则不成空间"这个反向判据。真正的承担者是兄弟 `:61`（机制）与 `:62`（逐点限定 + 实例）。节点 8 上同样：B2 引 `apostol:subspace` 的定义，而**更强的承担者**是 `apostol:cx-degree-exactly-k-inside-p-n-still-fails-closure`（带反例、带 Exercise 19 正对照），B2 没提。两次结论都对，指认的证人都不是最强的那个。这类"结论对、证人错"会让下游执行者按错误的承担者去做合并。

### 4.6 关于"是否系统性过度开火"的诚实限定

我不能从这九个节点外推到 B2 的另外 22 条 KILL。理由：**这九个节点是被选出来的**——它们全部是 A 类审计已经修过的节点，即 A 类认为"有问题但值得救"的那一批。B2 在这个子集上的 KILL 天然更容易与"值得救"的判断冲突。在 137 个节点里 B2 判了 105 KEEP / 29 KILL / 3 FIX（我核过该文件行数与计数），杀伤率 21%；我这 9 个样本的推翻率 2/9 **不能**乘到 29 上去。要评估整体过度开火率，需要在**未被 A 类改过的**那些 KILL 里再抽一批。这一点我列入第 6 节。

## 5. SPEC 缺陷（30 字符下限 / 200 字符上限 / 3 锚点上限）在本批中的实例计数

我复核了 brief 给出的测量值，全部为真（`source/apostol-ch15/15.02.md`，行内计数）：

| 位置 | 内容 | 字符数 | 对 30 字符下限 |
| --- | --- | --- | --- |
| `15.02.md:20` | `x + O = x \quad f o r a l l x i n V.` | 36 | 通过 |
| `15.02.md:26` | `x + (- 1) x = O.` | **16** | 不通过 |
| `15.02.md:34` | `a (b x) = (a b) x.` | **18** | 不通过 |
| `15.02.md:40` | `a (x + y) = a x + a y.` | **22** | 不通过 |
| `15.02.md:46` | `(a + b) x = a x + b x.` | **22** | 不通过 |
| `15.03.md` | `(f + g) (x) = f (x) + g (x)` | **27** | 不通过 |

即本章五条核心公理等式中有四条、外加函数空间的逐点加法定义式，**在现行 SPEC 下都不能被直接引用**。

**本批九个节点中，判定实际被这三条规则影响的实例：6 个。**

| # | 节点 | 触发的规则 | 后果 | 是否硬阻塞 |
| --- | --- | --- | --- | --- |
| 1 | 节点 6 `d:example-1-verification-is-the-field-axioms-of-r` | 30 字符下限 **+** 3 锚点上限 | 那份"十条公理逐条映射到 R 的域公理"的表，需要十条公理原文才能支撑，而上限是 3 条；即便放宽条数，公理 6/7/8/9 的等式本身也过短不可引。**该节点在现行规则下先天不可能合规锚定。** | **是**（构成 KILL 的独立理由） |
| 2 | 节点 2 `x:independence-criterion-and-its-consequences` | 3 锚点上限 | 我给出的 4.3 锚点必须占一个槽位，而该节点已满 3 条，**须牺牲一条现有锚点**（含一条 83 字符的 15.08 锚点面临成为孤儿） | **是**（修复方案被迫做减法） |
| 3 | 节点 4 `d:axioms-2-7-8-9-are-the-scalar-dependent-axioms` | 30 字符下限 | 存活原子要引公理 6 与公理 10 的**等式**（16 字符、`1x = x` 更短），二者都不可引。我改用两条**公理散文全句**（87 字符 `15.02.md:23`、66 字符 `15.02.md:49`）绕过 | 否，但**靠运气**——这两条公理恰好把等式写进了散文行；公理 7/8/9 的散文行与等式分行，同样的绕法在那里失效 |
| 4 | 节点 9 `x:least-squares-is-a-projection` | 200 字符**上限** | 把现有 4.1 锚点向前扩展到含动机句需 **333 字符**，超上限；只能另起一条 56 字符锚点 | 否，但靠该节点尚有空槽 |
| 5 | 节点 1 `x:dimension-versus-rank` | **schema 槽位缺失**（非字符类） | x: 节点没有字段能区分"共享不变量"与"单边空缺"；本节点存活的恰是后者，只能塞在 `divergence` 里 | 是（B2 与 A2 的分歧部分源于此） |
| 6 | 节点 1 同上 | `node_type` 封闭 4 值域 | B2 要求的重标类型无合法取值可用，`suggested_fix` 第 4 项不可执行 | 是 |

**归类**：字符/条数类 4 例（节点 6、2、4、9），其中 2 例硬阻塞、2 例靠巧合绕过；schema 表达力类 2 例（均在节点 1）。

**这些都不计入生产者的错误。** 节点 6 的无锚点映射、节点 4 的锚点缺位、节点 9 的射程不足，其根因都是"需要引的那句话在规则下引不了"。但要注意区分：**节点 9 的 D 型射程不足是可修的**（56 字符锚点合规且有空槽），生产者当初没补，这一半仍算生产侧漏项；而节点 6 是真的无路可走。

**给 SPEC 的建议（按本批证据的强度排序）**：
1. 30 字符下限应当对**公式类引文豁免**，或改为"公式类引文允许 10 字符起"。四条核心公理不可引是硬伤，且它波及的是本章最基础的层。
2. 3 锚点上限对"逐条验证/逐条映射"类节点是结构性不适配。要么允许这类节点提高上限，要么在 SPEC 里**明令此类节点不得存在**（本批的证据支持后者：节点 6 该退场）。
3. x: 节点的 schema 需要一个字段区分"共享不变量"与"单边空缺"。这不是美观问题——节点 1 与节点 9 都是"statement 冗余但单边空缺存活"，两位审计员因为没有共同的字段可指而给出了相反判定。

## 6. 未覆盖事项声明

以下是我**没有**做到的，不做补充推断。

1. **我只裁定了这九个节点，没有抽查 B2 的其余 23 条 KILL 与 1 条 FIX。** 我核过 `report/audit-B2-verdicts.jsonl` 共 137 行、105 KEEP / 29 KILL / 3 FIX。这九个节点是**被 A 类审计改过的那一批**，是有偏样本（见 §4.6）。**我这 2/9 的推翻率不能外推到 29 条 KILL 上。** 要评估 B2 的整体杀伤是否过度，必须在"未经 A 类修复"的 KILL 里再抽样。
2. **我没有独立复核 A 类审计的全部数学结论。** 我只核了删除测试要用到的部分，以及我在报告里直接引用的断言（公理 1/3/4/5 无标量、公理 6 与 10 的形式、`grep -ric rank` 在 Apostol 第 15 章为零、A4a 的例次普查、CX2:12 的反例形式）。A4a 与 A2 在这九个节点上的**其余**结论我按已应用状态接受，未逐条回验。
3. **x: 节点的"兄弟"是我自己划的。** x: 节点无 `parent`，我按"同章节 + 同主题簇"取 peer（节点 9 取投影/逼近簇的 :10 :17 :18 :19，节点 1、2 取维数/独立性簇）。另一位裁定员若把簇界划得更宽或更窄，**在节点 9 上完全可能得出不同结论**——这是本次三人分歧率里应当归因于方法而非判断的部分。我把簇界和检索范围都写进了各节，便于复核。
4. **两条并入条件（节点 5、6）我没有执行，只核了可行性。** 节点 6 的 parent（`nodes-D1.jsonl:44`）当前 1 条锚点、有 2 个空槽，并入不触上限——这一点我核过。节点 5 的并入目标（兄弟 `:1`）已是那条共用锚点的自有者。**但两处并入后的文本我没有起草**，也没有验证并入后 statement 是否仍落在锚点射程内。
5. **B2 的 29 条 KILL 里凡落在 A 类改过的节点上的，都可能带着 §4.2 那个过期输入问题，我只在这九个里查证了两例。** 其余未查。
6. **我没有做全图的"唯一持有者"普查。** §4.3 建议的那项机械检查（某个 L1 成员是否只被一个 x: 节点对齐）我只在节点 9 上跑了一次，就定了案。全部 22 个 x: 节点对全部 L1 成员的覆盖矩阵我没有算——那可能还会暴露别的唯一持有者，也可能反过来说明某些 x: 节点确实全冗余。
7. **源文件我只按需读取。** Strang 侧我只读了 `3.4.md`、`4.1.md`、`4.2.md`、`4.3.md` 中与本批节点相关的行，Apostol 侧只读了 15.02、15.03、15.14、15.15 的相关行。`§3.6` 那处 OCR 损坏是顺带发现的；**同类损坏我没有做系统排查**，别处可能还有，会同样限制锚点选取。
8. **两处"零残留"结论的强度不等。** 节点 8 我做到了穷尽（4 条边逐条查、2 条锚点的引用节点数逐个数、全图 "not a subspace" 表述普查）。节点 7 我查了 11 个兄弟、锚点共引数和 5 条边，但**没有做全图范围的"处处为零函数"表述普查**——我认为承担者已足够明确（parent 逐字 + `:61` 逐字），但强度不如节点 8。
