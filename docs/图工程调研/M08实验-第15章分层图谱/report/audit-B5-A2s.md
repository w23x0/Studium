# 审计 B5 —— A2-s1/s2/s3 信息增益（删除测试）

审计对象：`data/nodes-A2-s1.jsonl`(11) / `nodes-A2-s2.jsonl`(10) / `nodes-A2-s3.jsonl`(7)，共 28 节点，覆盖 15.13–15.15。
裁决文件：`report/audit-B5-A2s-verdicts.jsonl`（28 行，顺序 s1→s2→s3）。
本轮**不审**数学正确性、锚点真伪、量词，那是审计 A 的维度。

判据（唯一）：删掉该节点后，学习者能否从邻居——同节其余 A2-s 节点、父节点、以及 `nodes-D4.jsonl` 的 54 个 `d:` 节点——重新推导出它。能 ⇒ KILL（死因 5），不能 ⇒ KEEP。

两条打破循环的规则（因为 A2-s 与 D4 存在互相复述，必须先定序才能判）：

- **R1 保留教材自己的编号/命名单元，杀派生碎片。** 当 A2-s 节点与某 `d:` 节点互为对方的重建来源（成环）时，保留原文编号定理/原文命名对象那一侧。这是 KEEP 掉定理 15.13/15.15/15.16 三个节点的理由：它们的 `d:` 后代在 statement 里自称「Theorem 15.15 的一半」「the proof」，预设了被指称对象。
- **R2 区分「陈述它」与「评论它」。** 若 `d:` 节点把 A2-s 节点的断言完整陈述出来（定义式、公式、结论都在），则 A2-s 无增益；若 `d:` 节点只是评论其假设消耗点、证明步骤、术语适用范围，则被评论的对象仍需存在。

## §1 数字总览

| 文件 | 节点数 | KEEP | FIX | KILL | 存活率 |
| --- | --- | --- | --- | --- | --- |
| nodes-A2-s1.jsonl（15.13） | 11 | 8 | 0 | 3 | 72.7% |
| nodes-A2-s2.jsonl（15.14） | 10 | 4 | 0 | 6 | 40.0% |
| nodes-A2-s3.jsonl（15.15） | 7 | 5 | 0 | 2 | 71.4% |
| **合计** | **28** | **17** | **0** | **11** | **60.7%** |

无 FIX：本轮所有缺陷都是「整节点无增益」，没有出现「改一句就有增益」的情形。s2 存活率显著低于 s1/s3，原因见 §3——15.14 一节几乎每个定义都被 D4 重抄了一遍。

## §2 KILL 分类

11 个 KILL 全部记死因 `5`。按四类死因归档（有节点同时命中两类，按主因归档）：

### 2.1 复述父节点（3 个）

- `apostol:orthogonal-sequence-unique-up-to-scalars`
- `apostol:orthogonal-decomposition`
- `apostol:pythagorean-formula-for-orthogonal-decomposition`

**详细实例：`apostol:orthogonal-sequence-unique-up-to-scalars`**

父节点 `apostol:theorem-15-13-orthogonalization-theorem` 的 statement 里已逐字写着 `(c) the sequence is unique except for scalar factors`。子节点做的事只有两件：把 (c) 的精确形式（存在标量 c_k 使 y_k' = c_k y_k）写全，再把证明梗概（写成 z_r + c_{r+1} y_{r+1}，证 z_r 自正交）写一遍。而这两件事分别由 `d:uniqueness-splits-the-competitor-into-span-plus-multiple`（拆分＋归约到 z_r = O）和 `d:z-r-is-orthogonal-to-itself`（证自正交）完整承载，第三步 z_r = O 由 `d:zero-is-the-only-element-orthogonal-to-itself` 承载。删掉本节点，(c) 的名字在父节点里、精确形式与三步证明在三个 `d:` 节点里，无一丢失。

注意这里必须用 R1 定序：定理节点也可由 `d:orthogonalization-conclusion-a-orthogonal-to-earlier-span` + `d:orthogonalization-conclusion-b-spans-agree` + 本节点重建，三者构成环（详见 §4）。按 R1 保编号定理、杀 (c) 碎片。

### 2.2 兄弟冗余（6 个）

- `apostol:normalizing-an-element`
- `apostol:normalized-legendre-polynomials`
- `apostol:distance-between-elements`
- `apostol:orthogonal-complement-is-a-subspace`
- `apostol:projection-on-a-subspace`
- `apostol:best-approximation-in-a-finite-dimensional-subspace`

**详细实例：`apostol:distance-between-elements`**

其 statement 两句：「两元素 x, y 的距离定义为范数 ||x - y||」「这把 15.10 的范数变成逼近问题里被极小化的量」。`d:distance-is-the-norm-of-the-difference` 的 statement 也是两句：「The distance between x and y is ||x - y||」「Every minimization statement in 15.14 and 15.15 is therefore a statement about norms, which is why the Pythagorean formula can settle it」。两句一一对应，第二句 D4 版还更强（点明了勾股公式为何能收尾）。粗节点与它的原子子节点在这里字面重合，是最纯粹的层塌缩：一句话的定义不存在「更细的层」，向下拆只能重抄。

`apostol:best-approximation-in-a-finite-dimensional-subspace` 是本批唯一一例**批内自复制**：它与 s2 的 `apostol:best-approximation-problem` 是同一个问题的两个 id，只因分属 15.14 与 15.15 两节而被抽了两次。按 R1 保留原文首次提出问题处（15.14，`apostol:best-approximation-problem`，其 anchor 是原文提问句）。

### 2.3 纯语法/逻辑切分（2 个）

- `apostol:s-perp-notation`
- `apostol:trigonometric-polynomial-approximation`

**详细实例：`apostol:s-perp-notation`**

原文 15.14 的 DEFINITION 段是连续两句：「An element in V is said to be orthogonal to S if it is orthogonal to every element of S. The set of all elements orthogonal to S is denoted by S⊥ and is called "S perpendicular."」第一句成了 `apostol:orthogonal-to-a-set`，第二句成了本节点。切在句号上，没有引入新对象——S⊥ 只是第一句所定义集合的名字。删除后：符号 S⊥ 及其所指出现在 `apostol:orthogonal-complement` 的 statement（"the subspace S perp of all elements orthogonal to S"）与 aliases（`S perpendicular`）里，「两种情形共用同一符号」这一条由 `d:orthogonal-complement-is-a-name-reserved-for-subspaces` 完整承载。

`apostol:trigonometric-polynomial-approximation`（例 1）属逻辑组合：定理 15.16 ∧ 子空间 S ∧ Fourier 系数 ⇒ f_n 是最佳三角逼近，一步代入，无新数学；(15.22) 的 cos/sin 改写由 `d:fourier-coefficients-in-cosine-and-sine-form` 承载。对照例 2（`apostol:legendre-polynomial-approximation`）之所以 KEEP：它多带一个别处没有的事实——n+1 个规范化 Legendre 多项式张成的恰是全部次数 ≤ n 的多项式。

### 2.4 无信息量反例（0 个）

本批无此类。三个文件里没有「声称某命题失效」的节点；唯一涉及退化情形的 `d:zero-earlier-element-makes-the-coefficient-irrelevant`（y_j = O 时系数任取）在 D4 侧，且它处理的是原文真实存在的分情形，不是伪失效。

## §3 A2-s 与 D4 的分工是否清晰（本轮重点）

**结论：不清晰，是大面积重叠，不是各管一段。** 28 个 A2-s 节点中有 19 个（68%）挂着 `d:` 子节点，其中 **10 个被自己的子节点或同批 `d:` 节点完整承载**。重叠不是随机的，有明确的形态：

D4 名义上是「纵向下延的细粒度/原子节点」，实际产出分成两种：

- **真下延（多数，约 44/54）**：证明步骤、假设消耗点、验证义务的分解——`d:inner-product-of-the-new-element-with-an-earlier-one`、`d:finite-dimensionality-supplies-a-finite-orthonormal-basis`、`d:uniqueness-reduces-to-a-single-vanishing-difference` 这类。这些确实在 A2-s 之下，分工清晰。
- **平层重抄（约 10/54）**：把 A2-s 的定义句原样搬到 `d:` 层。定义是一句话时，「向下拆」无处可拆，只能重抄。这 10 例造成了本轮 11 个 KILL 里的 8 个。

### 3.1 完整重叠的 id 对清单（10 对）

`d:` 侧完整陈述了 A2-s 侧的断言（R2 判据），A2-s 侧无余量：

| A2-s 节点（本轮 KILL/KEEP） | 承载它的 D4 节点 |
| --- | --- |
| `apostol:distance-between-elements`（KILL） | `d:distance-is-the-norm-of-the-difference` |
| `apostol:normalizing-an-element`（KILL） | `d:normalizing-converts-an-orthogonal-basis-into-an-orthonormal-one` |
| `apostol:normalized-legendre-polynomials`（KILL） | `d:normalized-legendre-polynomials-are-y-n-over-its-norm` |
| `apostol:orthogonal-complement-is-a-subspace`（KILL） | `d:s-perp-closure-follows-from-linearity-in-the-first-argument` ＋ `d:orthogonal-complement-is-a-name-reserved-for-subspaces` |
| `apostol:pythagorean-formula-for-orthogonal-decomposition`（KILL） | `d:pythagorean-cross-terms-vanish-by-orthogonality` ＋ `d:pythagorean-expansion-of-the-squared-norm` |
| `apostol:projection-on-a-subspace`（KILL） | `d:projection-on-a-subspace-is-defined-through-an-orthonormal-basis` ＋ `d:projection-is-the-s-component-of-the-orthogonal-decomposition` |
| `apostol:orthogonal-sequence-unique-up-to-scalars`（KILL） | `d:uniqueness-splits-the-competitor-into-span-plus-multiple` ＋ `d:z-r-is-orthogonal-to-itself` |
| `apostol:s-perp-notation`（KILL，非父子） | `d:orthogonal-complement-is-a-name-reserved-for-subspaces`（＋兄弟 `apostol:orthogonal-complement`） |
| `apostol:orthogonal-complement`（KEEP，部分重叠） | `d:orthogonal-complement-is-a-name-reserved-for-subspaces` 覆盖定义与命名约定，**未**覆盖 V_3 平面/垂线几何实例 |
| `apostol:gram-schmidt-process`（KEEP，部分重叠） | `d:gram-schmidt-base-step-y1-equals-x1` ＋ `d:gram-schmidt-inductive-step-defines-y-r-plus-one` ＋ `d:coefficient-that-cancels-the-projection-component` 合起来重建了公式 (15.15) 全部内容 |

### 3.2 边界清晰的部分（供对照）

- **9 个 A2-s 节点没有任何 `d:` 子节点**：`apostol:orthonormal-basis`、`apostol:vanishing-orthogonalized-element-detects-dependence`、`apostol:s-perp-notation`、`apostol:orthogonal-decomposition`、`apostol:best-approximation-in-a-finite-dimensional-subspace`、`apostol:trigonometric-polynomial`、`apostol:trigonometric-polynomial-approximation`、`apostol:legendre-polynomial-approximation`、`apostol:best-linear-approximation-to-sine`。其中 15.15 的例 1/例 2/数值实例（4 个）D4 完全没进入，是真正的各管一段：**D4 止步于定理 15.16 的证明，未覆盖 15.15 的两个应用例**。
- **D4 有 10 个 `d:` 节点的 parent 是另一个 `d:` 节点**（如 `d:orthogonal-decomposition-existence` 下挂 5 个），这部分是 D4 内部的第二层，与 A2-s 无关。

### 3.3 这是产出模式问题，不是单节点问题

任务书预判的模式在这三个文件里成立且可复现：**当 A2-s 的粗节点 statement 已经把定义式/公式/结论写出来了，从它往下拆的 `d:` 子节点必然复述**。触发条件是 A2-s 节点的内容本身只有一句话（一个定义、一个记号、一个公式），此时不存在「更细的层」。反之，A2-s 节点若是编号定理（含多个结论）或带独立实例（例 2 的张成事实、sin πt 的数值），下拆就能产出真内容。

**修复方向的说明（越权提示，不计入裁决）**：上表 10 对里，若图的所有者更希望保留粗定义层（因为 A2-s 侧持有教材定义句的锚点、`d:` 侧持有的是证明分解），则镜像做法是杀 `d:` 侧、留 A2-s 侧。本轮裁决按任务书明确规定的方向（「若某个 A2-s 节点的内容已被某个 `d:` 节点承载，那它就没有增益」）判在 A2-s 侧；对 D4 的镜像裁决不在我的授权范围内。更优解可能是**合并**而非删除。

## §4 打转的簇（互相复述成环）

发现 4 个环。每个环里，任何单个成员都能从其余成员重建，删除测试单独施用于每个成员都会返回 KILL——必须先定序再判，否则会把整簇杀空。定序用 R1（保教材编号/命名单元）。

**环 1（定理 15.13 的三个结论）**

```
apostol:theorem-15-13-orthogonalization-theorem
   ↕ d:orthogonalization-conclusion-a-orthogonal-to-earlier-span
   ↕ d:orthogonalization-conclusion-b-spans-agree
   ↕ apostol:orthogonal-sequence-unique-up-to-scalars     ← 本轮 KILL
```
定理 = (a)+(b)+(c)，三个碎片各自又只是定理 statement 的一句。保定理，杀 (c)（(a)(b) 在 D4 侧，不在我的授权内）。

**环 2（定理 15.15 的存在性/唯一性/勾股）**

```
apostol:theorem-15-15-orthogonal-decomposition
   ↕ d:orthogonal-decomposition-existence
   ↕ d:orthogonal-decomposition-uniqueness
   ↕ apostol:pythagorean-formula-for-orthogonal-decomposition   ← 本轮 KILL
   ↕ apostol:orthogonal-decomposition                            ← 本轮 KILL
```
五节点环。两个 `d:` 节点的 statement 自称「Existence half / Uniqueness half of Theorem 15.15」，语言上预设定理存在，故定理是环的锚。`apostol:orthogonal-decomposition` 是环里最弱的一环：它只给定理结论起名，原文并无对应的 DEFINITION 段。

**环 3（定理 15.16 的证明链）**

```
apostol:theorem-15-16-approximation-theorem
   ↕ d:approximation-inequality-with-equality-only-at-the-projection
       ↕ d:x-minus-t-splits-orthogonally
       ↕ d:pythagorean-split-of-the-approximation-error
       ↕ d:equality-holds-exactly-when-t-equals-s
```
这是 D4 内部的环（一个 `d:` 节点被它自己的三个子节点完整重建：`d:approximation-inequality-with-equality-only-at-the-projection` 的 statement 已把两步证明全写了，三个子节点是它的逐句展开）。A2-s 侧只有定理本身，KEEP。**环的病灶在 D4 内部，超出本轮授权，仅记录。**

**环 4（投影 / 正交分解 / 逼近问题，跨节）**

```
apostol:projection-on-a-subspace          ← 本轮 KILL
   ↕ d:projection-is-the-s-component-of-the-orthogonal-decomposition
   ↕ apostol:orthogonal-decomposition      ← 本轮 KILL
apostol:best-approximation-problem
   ↕ apostol:best-approximation-in-a-finite-dimensional-subspace  ← 本轮 KILL
```
第二段是纯同义环（同一个问题两个 id，跨 15.14/15.15），无内容差；保原文首次提问处。

## §5 覆盖空洞（这 28 个节点没碰的核心内容）

按「原文明确讲了、且属于概念/方法/定理层」筛，不含习题（`15.16-exercises.md` 按任务书排除）。已用 grep 核对是否落在 D4 或其他 `nodes-*.jsonl` 里。

**空洞 1：例 1 的维数结论（15.13）——完全无覆盖。** 原文由 y_3 = O 推出 L(x_1, x_2, x_3) 是 2 维子空间。A2-s1 的 `apostol:vanishing-orthogonalized-element-detects-dependence` 只讲「y_{r+1} = O ⇒ 相依」，没讲「非零 y 的个数 = span 的维数」——即 Gram-Schmidt 顺带算出张成空间维数这一实用后果。D4 也无。这是三节里最实用的一条缺失。

**空洞 2：Rodrigues 公式与 y_n 的显式表（15.13）——A2-s 侧无覆盖。** 原文给了 y_n(t) = (n!/(2n)!) dⁿ/dtⁿ (t²-1)ⁿ 以及 y_3, y_4, y_5、φ_0…φ_5 的显式表。`apostol:legendre-polynomials` 只写到 y_2 = t² - 1/3 与 P_n 的 Rodrigues 形式。`d:legendre-normalizing-constant-from-y-n-to-p-n` 覆盖了常数与 Rodrigues，故不算全空；但「y_n 自身的微分表示（与 P_n 相差常数）」以及显式表在本批与 D4 均缺。

**空洞 3：15.20 的三角正交规范集本身——被引用而未被定义。** `apostol:trigonometric-polynomial` 说 φ_0…φ_{2n} 张成 2n+1 维子空间，但 φ_0 = 1/√(2π), φ_{2k-1} = cos kx/√π, φ_{2k} = sin kx/√π 这个集合本身在本批 28 节点中没有节点。原文自己说它来自 15.11，L1 里 15.11 的节点是 `apostol:orthonormal-set` / `apostol:parsevals-formula`，都不是这个具体集合。grep 显示 `nodes-D3.jsonl`/`nodes-D4.jsonl`/`nodes-X.jsonl` 含 trigonometric 字样，`d:fourier-coefficients-in-cosine-and-sine-form` 提到了 (15.20)——故这是**跨批依赖**而非绝对空洞，但 A2-s3 自身留了个悬空引用。

**空洞 4：图 15.1 与图 15.2 的几何读法（15.13/15.14）——部分覆盖。** 图 15.2 的读法在 `apostol:orthogonal-complement`（平面→垂线）与 `d:nearest-point-by-dropping-a-perpendicular` 里有；图 15.1（V_3 中 Gram-Schmidt 的几何图示）无任何节点。grep `Figure 15.1` 在全部 `nodes-*.jsonl` 中零命中。

**空洞 5：a_k, b_k 的显式积分公式（15.15）——A2-s 侧只提名字。** `apostol:fourier-coefficients` 说「在 cos/sin 归一化下它们变成 a_k 和 b_k」，但 a_k = (1/π)∫₀^{2π} f cos kx dx 的公式不在本批任何节点里。由 `d:fourier-coefficients-in-cosine-and-sine-form` 部分承载（它给了 (f, φ_{2k-1}) = √π a_k 的换算关系与 k=0 项的 a_0/2，未给积分式本身）。

**非空洞（已确认有覆盖，列出以免误报）**：正交化定理三个结论、Gram-Schmidt 递推与系数、S⊥ 是子空间、定理 15.15 全部三段、投影定义与基无关性、定理 15.16 两步证明、例 2 的 Legendre 逼近与 sin πt 数值实例。

## §6 不确定项

1. **10 对重叠该杀哪一侧（§3.1）。** 我按任务书规定的方向判在 A2-s 侧，但其中 4 例（`distance-between-elements`、`projection-on-a-subspace`、`normalizing-an-element`、`normalized-legendre-polynomials`）是教材原文的 DEFINITION 句，A2-s 侧持有该定义句的锚点，`d:` 侧持有的是「基依赖性」「操作效果」这类评注。若图的所有者认为定义应留在 `apostol:` 层，这 4 例应改判 KEEP，镜像 KILL 落在 D4。**这是本轮最大的不确定项，且它是分层策略问题，不是单节点判断问题。**
2. **`apostol:projection-on-a-subspace` 的下游影响。** 杀它后，「x 在 S 上的投影」这个定义只存在于 `d:projection-on-a-subspace-is-defined-through-an-orthonormal-basis`，而定理 15.16（KEEP）的 statement 以它为主词。内容上不丢，但图上把一个被编号定理量化的对象降到了 `d:` 层。若这在建图约定上不可接受，本条应改判 FIX（保留粗节点、精简 statement 至定义句）。
3. **孤儿边问题。** 11 个 KILL 中有 7 个是 D4 节点的 `parent`，删除会让合计 11 个 `d:` 子节点失去父节点：`apostol:orthogonal-sequence-unique-up-to-scalars`(2 子)、`apostol:normalizing-an-element`(1)、`apostol:normalized-legendre-polynomials`(1)、`apostol:distance-between-elements`(1)、`apostol:orthogonal-complement-is-a-subspace`(1)、`apostol:pythagorean-formula-for-orthogonal-decomposition`(2)、`apostol:projection-on-a-subspace`(3)。删除需配合 parent 改挂，否则会产生悬空 parent。我未修改 `data/`，仅记录。
4. **`apostol:orthonormal-basis`（KEEP）的边界。** 它与 `apostol:orthogonal-basis` + `apostol:normalizing-an-element`（已 KILL）构成一个近乎逻辑组合的三角。我保留它，理由是它是定理 15.14 的主词、15.14 节投影定义的输入，且 L1 只有 `apostol:orthonormal-set`（集合，非基）。但若审计者认为「正交基 + 每元素范数 1」属纯逻辑组合，它是本批最可能被追加 KILL 的 KEEP 节点。
5. **例 1 与例 2 的不对称判决。** 我杀了例 1（`trigonometric-polynomial-approximation`）、留了例 2（`legendre-polynomial-approximation`）。差别只在于例 2 多带「n+1 个规范化 Legendre 多项式张成的恰是次数 ≤ n 的全部多项式」这一独立事实，而例 1 的「2n+1 个 φ 张成 2n+1 维 S」这一对应事实被单独抽成了 `apostol:trigonometric-polynomial`（KEEP）。所以两例的**总信息量相同**，只是切分方式不同：例 1 被切成「对象 + 应用」两节点、例 2 合成一个节点。若统一切分方式，判决会变。这是切分不一致导致的判决不一致，值得记一笔。

## §7 自查：id 是否逐字复制

**是。** 全部 28 个 id 由程序从 `data/nodes-A2-s1.jsonl`、`nodes-A2-s2.jsonl`、`nodes-A2-s3.jsonl` 用 `json.loads(line)['id']` 读出后直接写入裁决文件，未经手打、未经缩写。裁决按输入行号索引赋值（`v[行号]`），不用名字匹配。

写完后跑了一次逐位比对：把三个输入文件的 id 按 s1→s2→s3 顺序拼成列表，与 `report/audit-B5-A2s-verdicts.jsonl` 逐行读出的 id 列表做 `==` 比较，结果 `src 28 got 28 IDENTICAL_IN_ORDER`。裁决计数 `Counter({'KEEP': 17, 'KILL': 11})`，与 §1 表一致。

报告正文中出现的 `d:` 前缀 id 均从 `data/nodes-D4.jsonl` 复制；正文中的 `apostol:` id 均从三个输入文件复制。未引用 `report/` 下任何 `audit-*` 文件，未读 `M08实验-Apostol微积分卷1/`，未修改 `data/` 下任何文件。



