# 审计 B4 —— `data/inherited/nodes-S1.jsonl` 增益审计（删除测试）

**对象**：Strang ch3–4 的 L1 底座，62 节点，覆盖 3.3 / 3.4 / 3.5 / 4.1 / 4.2。
**方法**：单一判据 —— *把该节点删掉，学习者能否从它的邻居（同节兄弟、更粗的概念节点）重新推导出它？*
**正交约定**：本审计**不判**数学对错、不判锚点真伪（由另一名审计独立完成）。
**权重信息**：读了 `data/nodes-X.jsonl` 的 22 个 `x:` 节点，仅统计"哪些 `strang:` id 被引用"，未审 X 的内容。被引用与否作为权重，不作为判死依据。

---

## §1 数字总览

| | 数量 |
| --- | --- |
| 输入节点 | 62 |
| KEEP | **50** |
| FIX | **0** |
| KILL | **12** |
| 存活率 | **80.6 %** |

死因全部为 `5`（伪抽象·层塌缩），无 `0` 以外的其他编号。

按节点类型的死亡率差异极大：

| node_type | KILL / 总数 | 死亡率 |
| --- | --- | --- |
| `notation` | 4 / 5 | **80 %** |
| `theorem` | 6 / 27 | 22 % |
| `concept` | 2 / 25 | 8 % |
| `method` | 0 / 5 | **0 %** |

按节所在（取 `sections` 首项）：3.3 → 3/10，3.4 → 3/19，3.5 → 2/7，4.1 → 1/12，4.2 → 3/14。

**两条读数**：

1. `notation` 类近乎全灭（5 杀 4）。原因是同一个符号在被"命名"之前，早已出现在概念节点的 statement 里 —— 记号节点因此只剩下"读音/别名"，没有可推导之外的信息。唯一存活的 `strang:dot-product-notation` 是因为它把 `v . w` 与 `v^T w` 两种写法划等号，而这个等式确实不在任何邻居里。
2. `method` 类全数存活。方法节点的载荷是**可执行流程**（先做什么再做什么、哪一步有陷阱），流程编排无法由定理节点重新推出。这与"S1 是为对齐服务"的定位无关，是节点类型本身的性质。

---

## §2 KILL 分类

四类死因中命中三类，第四类（无信息量反例）在 S1 中**未出现** —— S1 没有"声称某命题失效"的节点。

### 2.1 复述父节点（4 个）

父节点的 statement 里已经把这句话写出来了。

- `strang:augmented-matrix`
- `strang:linear-dependence`
- `strang:full-column-rank-criterion`
- `strang:projection-matrix-symmetric-idempotent`

**详细实例：`strang:full-column-rank-criterion`**

它的 statement 是："The columns of A are independent exactly when the rank is r = n: there are n pivots and no free variables, so only x = 0 is in the nullspace. Independent columns produce full column rank."

逐项对照两个邻居：

| 本节点的成分 | 已在何处 |
| --- | --- |
| r = n、n 个主元、无自由变量 | `strang:full-column-rank` 的 statement：*"A has full column rank when r = n: all columns are pivot columns, there are no free variables, the nullspace is only the zero vector..."* |
| 零空间只有 x = 0 | 同上，逐字 |
| 列独立 ⟺ 零空间只有零向量 | `strang:independent-columns` 的 statement：*"...Equivalently the nullspace of A contains only the zero vector."* |

把这两条并起来，本节点的每一个断言都被逐字覆盖，连"exactly when"这个双向也是两侧各自的等价关系接起来直接得到。它自己的 `requires->strang:independent-columns` 边即自承了这一依赖。

这正是任务书里点明的**产出模式问题**：`strang:full-column-rank` 这个粗节点的 statement 已经把 r = n 的全部后果（主元列、无自由变量、零空间）写进去了，那么任何从它往下拆"r = n 意味着什么"的子节点必然复述。缺陷不在这一个节点，在粗节点写得太满。

### 2.2 兄弟冗余（6 个）

同节另一个节点已承载该内容。

- `strang:row-combination-consistency`
- `strang:row-space-notation`
- `strang:rank-theorem`
- `strang:counting-theorem`
- `strang:orthogonal-complement-notation`
- `strang:projection-coefficient-x-hat`

**详细实例：`strang:rank-theorem`**

这是本轮最"贵"的一次判死 —— 它是 Strang 明确命名的定理（列秩 = 行秩），教科书地位很高。但删除测试的问题不是"它有没有名字"，而是"删掉后能不能重新推出来"。

它的 statement 有两半，两半都被同节兄弟覆盖：

| 成分 | 覆盖者 |
| --- | --- |
| 命题：列空间维数 = 行空间维数 = r | `strang:pivot-columns-basis-for-column-space` 构造性给出"主元列是 C(A) 的基，dim = r"；`strang:pivot-rows-basis-for-row-space` 给出"主元行是行空间的基，dim = r"。两个显式基各自数出 r 个向量，相并即得等式。 |
| 它自陈的 the right reason：*"the same combinations of columns are zero for A and for R, since Ax = 0 exactly when Rx = 0"* | `strang:elimination-preserves-row-space-and-nullspace` 的 statement：*"...the elimination steps do not change the solutions of Ax = 0."* |

注意这里**没有循环**：34 与 35 是各自独立构造基的定理，不以秩定理为前提。而 `strang:fundamental-theorem-of-linear-algebra-part-1`（保留）的 statement 直接写"column space and row space both have dimension r"，比秩定理更强 —— 它以更粗的形态又覆盖了一次。

**与 §2.1 相反的一个反面对照（说明我没有一刀切）**：`strang:all-bases-have-the-same-size` 与 `strang:dimension` 是同一个"presuppose 关系"（维数的定义预设了所有基等长），但我**两个都保留**。区别在于：19 只*预设*该事实的良定义性、并不*断言*它，而且 20 还给出了 W = VA 的具体证法。而秩定理的情形是 29 已经把结论**断言**出来了。判据是"断言是否已在邻居的 statement 里"，不是"证明长不长"。

### 2.3 纯语法/逻辑切分（2 个）

把「A 且 B」或同一串符号切成两个节点，没有新内容。

- `strang:square-invertible-system`
- `strang:projection-onto-subspace-formula`

**详细实例：`strang:projection-onto-subspace-formula`**

- 本节点：`p = A (A^T A)^{-1} A^T b`
- `strang:column-space-projection-matrix`：`P = A (A^T A)^{-1} A^T`，且 statement 明写 `it satisfies p = Pb`

同一串符号，只在"矩阵"与"矩阵乘 b"之间挪了一次括号。把后者的两句话代入即逐字得到前者，反向亦然。保留矩阵形而杀掉向量形的理由：`P` 是可复用的命名对象（它有对称、幂等等自身性质，是 `strang:projection-matrix` 的实例），并且与 4.2 前半的 `strang:rank-one-projection-matrix` 构成"线 / 子空间"的对偶一对；`p` 只是它的一次作用结果。

### 2.4 无信息量反例（0 个）

S1 中没有"声称某命题失效但其实没失效"的节点。S1 的边里有 3 条 `contrasts`，都是真辨析对（列/行满秩、r=n 与 n>m、行侧与列侧正交性），不是伪反例。

---

## §3 打转的簇（互相复述成环）

以下节点组内部互相覆盖，靠彼此的 statement 就能循环推出，不是单点冗余。

### 3.1 维数事实簇：29 / 30 / 31（杀 2 存 1）

| id | 内容 | 处置 |
| --- | --- | --- |
| `strang:fundamental-theorem-of-linear-algebra-part-1` | 四个维数一次给全：r, r, n−r, m−r | KEEP |
| `strang:rank-theorem` | 列秩 = 行秩，即"前两个都是 r" | KILL |
| `strang:counting-theorem` | dim N(A) = n−r 且 r+(n−r)=n | KILL |

29 的 statement 是 30 与 31 的**严格超集**（它把四个维数全写出来了），而 30、31 各自只取其中一两项再复述一遍。同时 29 有 `implies->30` 与 `requires->31` 两条边，方向互相矛盾地把三者绑成一个环：29 蕴含 30，29 又需要 31，而 31 的内容是 29 的一部分 —— 这个环没有信息流向，只有同一组数字的三次改写。

存 29 的理由：它是**唯一**给出 `dim N(A^T) = m − r` 的节点，且唯一断言"秩单独决定全部四个维数"。31 的自由变量计数与零空间维数已在 `strang:special-solutions-basis-for-nullspace` 里逐字出现（*"with n variables and r pivots there are n - r of them ... which has dimension n - r"*），余下的 r+(n−r)=n 是两个已知数的加法。

### 3.2 投影矩阵性质簇：55 / 60（杀 1 存 1）

- `strang:projection-matrix`（定义）：*"A projection matrix P is a symmetric matrix with P^2 = P"*
- `strang:projection-matrix-symmetric-idempotent`（定理）：*"P^T = P and P^2 = P"*

同两条性质，一个当定义写、一个当定理写，构成一个纯粹的二元环：定义已断言的东西，定理再断言一次。存定义（它是 54 与 59 两个具体矩阵的共同上位，有 2 条 `is-a` 入边），杀定理。60 余下的"投影第二次不改变结果"是 P²=P 的字面翻译。

### 3.3 三步骨架簇：49 / 50 / 51 / 54 与 56 / 57 / 58 / 59（各杀 1）

4.2 的产出模式是：一个 method 节点声明"三步：先 x-hat、再 p、再 P"，然后三个节点各装一步。这是任务书里那个结构性发现的又一次实例，但**只部分成立**：

- 骨架节点（49、56）只*点名*三步，不给公式 —— 编排本身是内容，保留。
- 三步节点各装一个公式 —— 公式是新内容，原则上保留。
- 但**步与步之间**有包含关系：51 的 statement 是 `p = x-hat a = (a^T b / a^T a) a`，它把 50 的全部内容（x-hat 这个符号 + 它的值）逐字含在里面。同理 59 含 58。

所以死的不是"从骨架拆下来的子节点"，而是**同一条公式链上被前一环写进去的那一环**。杀 `strang:projection-coefficient-x-hat` 与 `strang:projection-onto-subspace-formula`。

### 3.4 秩情形簇：6 / 7 / 8 / 9（杀 1 存 3）

`strang:square-invertible-system` = `strang:full-column-rank` ∧ `strang:full-row-rank`，它自己的两条 `is-a` 边就是这个合取的自白。其"唯一解"一格也已在 `strang:four-possibilities-by-rank` 的四格表里，`x_p = A^{-1}b` 则是 ch2 的既有内容、非 3.3 新增。6、7、9 三者互不包含（9 独占 r<m 且 r<n 那一格，6、7 独占各自的结构性后果），故只死 8。

---

## §4 对齐效用评估

### 4.1 原始数字

22 个 `x:` 节点共引用了 **48 / 62** 个 `strang:` 节点（77.4 %），**14 个从未被任何 `x:` 节点引用**。

与我的裁决交叉：

| | 被 x 引用 | 未被引用 | 合计 |
| --- | --- | --- | --- |
| KEEP | 41 | 9 | 50 |
| KILL | 7 | 5 | 12 |
| 合计 | 48 | 14 | 62 |

两个方向的偏离都要交代：

- **7 个 KILL 是被引用的**。引用是保命权重，所以我逐个查了：*引用它的那个 x 节点，是否同时也引用了我指定的取代者？* 若是，则杀掉它不切断对齐（对齐端点仍在）。结果 9 个引用关系中 7 个安全，**2 个会切断**，见 4.3。
- **9 个 KEEP 是未被引用的**。未引用不是死因，但需要解释为什么留 —— 见 4.2 的分类。

### 4.2 如何区分"对齐层还没做到"与"本来就没用"

**区分方法**：Apostol 第 15 章讲的是**抽象线性空间**，没有矩阵、没有消元、没有主元。因此一个 Strang 节点能否对齐，取决于它的内容是否**依赖矩阵表示**：

- 内容本质是矩阵事实（消元、主元、m×n 形状、转置）⇒ Apostol 侧根本不存在同构对象 ⇒ **本来就没用**（对齐层做到天荒地老也接不上）。
- 内容是空间层面的事实（独立、基、维数、正交、投影）而 Apostol 15.x 里有对应节 ⇒ **对齐层还没做到**（缺口在 X 侧）。

**判别不止靠我的印象，还有一个可机器检验的信号**：如果存在一个 `x:` 节点，它的**主题恰好就是该 Strang 节点的内容**，却没有把它列进 `strang_ids`，那就是对齐层漏了 —— 而不是无从对齐。

按此分类 9 个 KEEP-未引用节点：

**A. 本来就没用（6 个，纯矩阵事实）**

| id | 为何 Apostol 侧无对应 |
| --- | --- |
| `strang:full-row-rank` | r = m 依赖行数 m 这个矩阵形状量 |
| `strang:four-possibilities-by-rank` | 四格表按 (r,m,n) 分类，全是矩阵形状 |
| `strang:short-wide-matrix-has-dependent-columns` | "行少于列"是矩阵形状陈述 |
| `strang:four-fundamental-subspaces` | 四子空间由 A 与 A^T 成对定义 |
| `strang:elimination-preserves-row-space-and-nullspace` | 消元是 Strang 独有的算法 |
| `strang:rank-one-matrix` | A = uv^T 是矩阵分解 |

（`strang:fundamental-theorem-of-linear-algebra-part-1` 同属此列 —— 四个维数含 m−r，依赖矩阵形状。计入本类则为 7 个。）

**B. 对齐层还没做到（2 个，有反证）**

1. **`strang:orthogonal-subspaces`** —— 有一个 `x:` 节点叫 `x:orthogonal-subspaces-versus-complements`（"正交子空间对 vs 正交补"），它的 `sections` 是 `["15.14","4.1"]`，主题**逐字就是**"正交子空间"与"正交补"的辨析。但它的 `strang_ids` 只有 `["strang:orthogonal-complement","strang:fundamental-theorem-part-2"]` —— 那个被辨析的另一端 `strang:orthogonal-subspaces` 没被列进去。这不是"无从对齐"，是漏挂。

2. **`strang:row-space-to-column-space-invertible`** —— "A 从行空间到列空间是 r 阶可逆映射"是空间层面的结构陈述（Apostol 15.x 讲线性变换的核与像时有同构对应），且它是 4.1 收束整节图景的那一步。X 层目前没有任何节点触及"A 的真正作用域"这个视角。

**另有一个同型证据（不在这 9 个里，但同样指向 X 侧漏挂）**：`x:dimension-versus-rank`（"空间的维数与矩阵的秩"）的 `strang_ids` 只有 `["strang:dimension","strang:pivot-rows-basis-for-row-space"]` —— 一个以"秩"为半个标题的对齐节点，竟没有引用任何一个以秩为核心的 Strang 节点。

### 4.3 两处 KILL 会切断现有引用（需 X 侧一行改写）

我不能修改 `data/`，故在此登记。两处都**不会使 x 节点失去全部 Strang 端点**，只需把 `strang_ids` 里的一项换成取代者：

| x 节点 | 它引用的被杀节点 | 它现有的其他 Strang 端点 | 建议改挂到 |
| --- | --- | --- | --- |
| `x:zero-element-destroys-independence` | `strang:linear-dependence` | `strang:basis`、`strang:dimension`（均存活） | `strang:linear-independence`（其 statement 含 *"Otherwise the vectors are dependent"*，相依的定义在内） |
| `x:best-approximation-by-the-projection` | `strang:projection-onto-subspace-formula` | `strang:projection-onto-a-subspace`、`strang:error-vector`、`strang:error-in-left-nullspace`（均存活） | `strang:column-space-projection-matrix` |

### 4.4 结论

Strang 底座的对齐效用**整体成立但有系统性偏斜**：

- 真正被用上的是 41 个（存活且被引用），占存活节点的 82 %。
- 没被用上的 9 个存活节点中，约 2/3（6–7 个）是**结构上不可对齐**的纯矩阵事实。它们对"跨教材对齐"这个用途确实是死重 —— 但按任务书的判据它们不该被杀：它们内容独立、推不出来，只是这条底座还有第二个隐含用途（保持 Strang 侧自身可读）。**如果 S1 的唯一用途真的只是给 X 提供挂载点，这 6–7 个节点就是该底座里最该被讨论去留的部分，而这个决定超出增益审计的权限。**
- 另有 2 个（+1 个旁证）是 X 侧漏挂，缺口在对齐层不在底座。
- 12 个 KILL 中有 7 个被引用，说明 **X 层在挂载时并未区分"这是不是一个有独立增益的节点"** —— 它挂到了 `strang:projection-onto-subspace-formula` 与 `strang:column-space-projection-matrix` 这样一对同义节点上，等于把同一个 Strang 事实数了两遍。

---

## §5 覆盖空洞

S1 声称覆盖 3.3 / 3.4 / 3.5 / 4.1 / 4.2。以 Strang 各节自带的 **REVIEW OF THE KEY IDEAS** 为 ground truth 逐条核对，以下核心内容明明在这几节里、却没有任何节点承载。

### 5.1 秩的定义本身（最严重）

62 个节点里有 6 个节点的 statement 用到"rank"，却**没有一个节点定义它**。原文两处明说：

- `3.3.md` REVIEW 第 1 条：*"The rank r is the number of pivots. The matrix R has m - r zero rows."*
- `3.5.md` 开篇：*"The rank of a matrix is the number of pivots. The dimension of a subspace is the number of vectors in a basis. We count pivots or we count basis vectors."*

3.5 整节的主题正是"connects rank and dimension"，而这个连接的一端在图里是悬空的。这个空洞还有一个直接后果：`x:dimension-versus-rank` 想对齐"维数 vs 秩"却找不到秩节点可挂（见 4.2 旁证）。

### 5.2 "n 个独立向量必张成 R^n"（有铁证）

`4.1.md` 第 171 行：*"Any n independent vectors in R^n must span R^n. So they are a basis."* 以及 REVIEW 第 4 条把双向都写出来了。

**铁证**：X 层有一个节点专门讲这件事 —— `x:right-count-upgrades-one-basis-property-to-both`（"元素个数正确时，基的一个性质推出另一个"），它的 anchors 里**直接引了 `4.1.md` 的这两句原文**，但它的 4 个 `strang_ids` 全是基/维数节点（`strang:basis`、`strang:dimension`、`strang:basis-of-rn-from-invertible-matrix`、`strang:all-bases-have-the-same-size`），**没有一个断言这个"个数对了就升级"的性质**。对齐层不得不越过 L1 直接引原文，正说明该 L1 节点缺失。

### 5.3 正交补的维数相加（4.1 REVIEW 第 2、3 条）

原文：*"Inside R^n, the dimensions of complements V and W add to n"*，并具体给出 `(n−r)+r = n` 与 `(m−r)+r = m`。

全 62 个节点的 statement 里搜"维数相加"式表述，命中 **0**。保留的 `strang:fundamental-theorem-part-2` 只说"是正交补"，不含维数配平。这一条恰恰是"正交"升级为"正交补"的**判据**（正交只要垂直，正交补还要维数凑满），缺了它，44 与 40/41 的差别在图里就没有可检验的内容。

### 5.4 左零空间的基（3.5 REVIEW 第 4 条）

原文：*"If EA = R, the last m - r rows of E are a basis for the left nullspace of A."*

3.5 的四条 REVIEW 里，另外三条各有对应节点（`strang:pivot-rows-basis-for-row-space`、`strang:pivot-columns-basis-for-column-space`、`strang:special-solutions-basis-for-nullspace`），**唯独左零空间这一条没有**。搜"E"/"EA = R"命中 0。结果是四个子空间里有三个给出了显式基、第四个只给了维数（在 29 里），四子空间的编排在图里是不对称的。

### 5.5 主元变量与自由变量的先后（3.3 REVIEW 第 4 条）

原文：*"The pivot variables are determined after the free variables are chosen."* 这是"为什么自由变量叫自由"的机制说明。`strang:particular-solution` 只用到它的一个特例（自由变量全取 0），一般的"先选后定"没有节点。

### 5.6 不算空洞的两项（交代清楚，免得被当成漏）

- **最小二乘**：`least squares` 在 `4.2.md` 只出现 1 次，在 `4.3.md` 出现 26 次 —— 它是 4.3 的主题，而 4.3 不在 S1 声明覆盖范围内。X 层的 `x:least-squares-is-a-projection` 只能挂 4.1/4.2 的节点，这是**范围问题不是空洞**。
- **零空间 N(A)、列空间 C(A) 本身没有独立节点**：它们在 3.1–3.2 定义，不在 S1 覆盖的 3.3–4.2 内。S1 把它们当既有对象引用是正确的。

---

## §6 不确定项

以下 5 条我给了裁决，但判据在边界上，复核时应优先看这几条。

1. **`strang:rank-theorem`（判 KILL）** —— 全场最重的一次判死。它在教科书里有正式定理名，杀掉它意味着图上不再有"列秩 = 行秩"这个命名结论。我的判据是"断言已在 34+35+29 里"，但若本实验认为**被 Strang 命名的定理应无条件保留其命名地位**，这条应回改为 KEEP。它 0 次被 X 引用是支持杀的旁证，但如 §4 所述引用数不是判据。

2. **`strang:square-invertible-system`（判 KILL）** —— 它的 `x_p = A^{-1}b` 与 `R = I` 两个具体形式，**字面上**不出现在 6、7、9 任何一个的 statement 里（只出现在非邻居的 `strang:basis-of-rn-from-invertible-matrix` 里）。若严格执行"字面不在邻居里就保留"，这条应回改。我判杀的理由是它自己的两条 `is-a` 边已自承是 6 与 7 的合取，且这两个形式是 ch2 既有内容。

3. **`strang:linear-dependence`（判 KILL）** —— 被 2 个 x 节点引用，是被引用最多的被杀节点之一，且"某个向量是其他向量的组合"这个等价刻画在教学上常单独出现。我按"父节点已写 Otherwise the vectors are dependent"判杀。这条也是两处切断引用之一。

4. **`strang:column-space-orthogonal-to-left-nullspace`（判 KEEP）** —— 它严格是 `strang:row-space-orthogonal-to-nullspace` 施于 A^T 的结果，按"转置改写"本可判纯语法切分。我保留是因为 Strang 明写两条、两者互为 `contrasts`、且 R^m 与 R^n 两侧各有一个 x 节点端点。若本实验对转置对偶从严，这条可判 KILL。

5. **`strang:zero-vector-in-two-orthogonal-subspaces`（判 KEEP）** —— 内容极短，只有"v ⊥ v ⇒ v = 0"一步。我保留因为这一步不在 39/43 的定义里、且 46 requires 它。但它接近"一步可证的引理"的下限。

另有一项**权限外**的不确定（已在 §4.4 提出）：6–7 个纯矩阵事实节点对"给 X 提供挂载点"这个声明用途是死重，但按增益判据不该杀。这个取舍需要任务发起方定夺，不是增益审计能决定的。

---

## §7 自查：id 是否逐字复制

**结论：62 行全部逐字，0 处手打。**

**做法（不是事后核对，而是从机制上排除手打）**：写了 `tmp/b4_write.py`，所有 id 一律由 `IDS[idx-1]` 从 `data/inherited/nodes-S1.jsonl` 按行号取出。我在批次里只写行号，从不写 id 字符串。`reason` 里需要点名取代者时用 `{n}` 占位符，同样按行号在写入时替换成原文 id，并断言替换后不残留 `{数字}`。写入前先把整批记录构建完并全部校验，任一条不过则整批不落盘（这条是第 2 批触发一次 `{{0}}` 花括号误判后加固的 —— 当时有 1 行已落盘，我把文件截回 10 行重写，并加了 `expect_start` 行数前置断言防止错位）。

**机器复核结果**：

- 行数 62 = 输入 62 ✓
- `[裁决 id 列表] == [输入 id 列表]`（含顺序）→ `True` ✓
- 全文所有 `strang:` token 均在输入 id 集合内 → 无未知 id ✓
- 12 条 KILL 的 `reason` 均点名了至少一个真实存在的取代者 id ✓
- `verdict` 仅取 KEEP/KILL；`cause` 与 verdict 一一对应（KEEP→0，KILL→5），无错配 ✓

一处**已修正**的瑕疵：相邻占位符（如 `{6}{7}`）展开后两个 id 直接相连、中间无分隔符，使正则切词读出 `strang:full-column-rankstrang` 这类假 token。id 本身是对的，但可读性有问题 —— 已在 10 处插入分隔符"与"并重新校验，现无未知 token。

本报告 §2 的 KILL 分类清单也是脚本从 verdicts 文件读出后打印、我复制粘贴的，未手打。
