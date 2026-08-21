# 审查报告：形式 D（SCOPE-SHORTFALL）与形式 E（unanchored clause） — 文件 D2

审查者：FD2（Form-D Hunter, file D2）
数据文件：`data/nodes-D2.jsonl`（sections 15.06–15.08）
源文件：`source/apostol-ch15/15.06.md`, `15.07.md`, `15.08.md`, `15.09-exercises.md`

> **合并说明（本次写入）**：本文件原为骨架（时间戳早于三个分片的完成时间），第 1–8 节为空。
> 现按 `report/_D分片-主控核验.md` 的判决把三段工作合并进来：
> 骨架附录批次 1–4（节点 1–35，原地保留）＋ `报-形式D-D2-片36-58.md`（节点 36–58）
> ＋ `审查-形式D-D2-片59-80.md`（节点 59–80）。**合计 80/80 节点，无缺口。**
>
> 合并纪律：分片的原始指控**不照抄**。主控核验已按四层证据池（T1 自身 anchors ／
> T2 节点自己发出的边的 evidence ／ T3 part-of 后代的 anchors 与后代自发边 ／
> **TD 指向该节点的边——不入池**）逐句复核，凡判为「塌陷」的指控在本文件中一律标注为
> **指控不成立**，并写明塌陷通道。分片自评最重的两条（片 59–80 的 L66、片 36–58 的 L45）
> 都在这一步倒掉了。

## 1. 覆盖声明

**审查范围**：`data/nodes-D2.jsonl` 全 80 行（1-indexed），**80/80 审完，无抽样、无静默截断**。

| 来源 | 节点行区间 | 数量 | 状态 |
| --- | --- | --- | --- |
| 本文件附录批次 1–4（骨架原有） | 1–35 | 35 | 已审 |
| `审查-形式D-D2-片36-58.md` | 36–58 | 23 | 已审，声明无截断 |
| `审查-形式D-D2-片59-80.md` | 59–80 | 22 | 已审，声明无截断 |

**实际读过的原文**：`15.06.md`（31 行）、`15.07.md`（63 行）、`15.08.md`（39 行）逐行读过；
`15.11.md`、`15.13.md`、`15.14.md`、`15.09-exercises.md`、`15.16-exercises.md` 就
`basis|bases`、`infinite` 两组关键词做穷举检索（用于核行 55 的章级否定存在断言）。
未读 `M08实验-Apostol微积分卷1/`。

**分片描述的一处更正**（片 59–80 自行发现并已核实）：任务书称 59–80 覆盖 15.06/15.07，
实测这 22 个节点的 `sections` **全部含 15.08**，仅行 71、74 兼挂 15.07。
全文件 `sections` 分布实测：`['15.08']` 30 个、`['15.07']` 27 个、`['15.06']` 19 个、
`['15.07','15.08']` 2 个、`['15.06','15.08']` 1 个、`['15.06','15.07','15.08']` 1 个。

**锚点机器校验的效力声明**：两个分片都自行用 Python `in` 逐条复核过锚点为逐字连续子串，
全部命中。**这个数字没有正确性证明力**，只说明引文未被生产者改写——本报告下面全部 7 处
确认缺陷都发生在通过逐字校验之后。另实测 80 个节点的锚点槽位使用：
**0 槽 4 个、1 槽 75 个、2 槽 1 个、3 槽 0 个**。`verify_anchors.py` 会打印
`nodes with NO anchor: 4` 但**退出码仍为 0**（`:75` 是 `return 1 if failures or bad_json else 0`），
所以只看退出码会漏掉这 4 个。

## 2. 确认的形式 D 实例

先说三条**被主控核验判为塌陷的指控**，因为它们里面包含两个分片自评最重的条目。
塌陷 = 指控不成立，不是"缺陷较轻"。

### 2.0 塌陷的三条（指控不成立）

| 行 | 节点 | 分片的原始指控 | 塌陷通道 | 载体 |
| --- | --- | --- | --- | --- |
| 66 | `d:dim-of-a-second-order-de-solution-space-is-two` | 「"dimension 2" 与那个微分方程本身都无锚」，片 59–80 的**头条** | **通道 (c)**：一源行两半分落节点锚点与边 | `edges-D2.jsonl:85` |
| 37 | `d:exponential-independence-multiply-by-a-normalizing-exponential` | 「锚点止于 "we obtain"，替换结果与 c_M 塌缩落在射程外」 | **通道 (a)**：内容下移到 part-of 后代 | 后代 `d:exponential-law-used-in-the-shift` 的锚点＋其自发边 `edges-D2.jsonl:38` |
| 45 | `d:thm-15-5-proof-delegated-to-theorem-12-8` | cause 6 那一半（"在任意线性空间成立"的依据无锚） | **T2**：节点自己发出的边 | `edges-H2.jsonl:2` |

**行 66 的塌陷细节（本报告须逐字回写的第一件事）。**
`15.08.md:15` 是一行 **233 字符**、含三句。节点自身锚点取的是中间那句
`One basis consists of the two functions $u_1(x) = e^{-x}$ , $u_2(x) = e^{3x}$ .`（**79 字符**）；
而首句 `The space of solutions of the differential equation $y'' - 2y' - 3y = 0$ has dimension 2.`
（**89 字符**）由 `edges-D2.jsonl:85` 携带（`rel=requires`，`dst=apostol:homogeneous-de-solution-space`，
`src` 正是本节点自己，故属 **T2 而非 TD**）。
两个 claim 都在池里，**「主断言无锚」不成立**。只读 `anchors` 字段必然报出这一条——
这正是三条过报通道中的第 (c) 条，也是本文件唯一的一例。

**附带的记账更正（两处，方向相反，都要写清）**：
- 片 59–80 建议的补锚串写作 100 字符，我实测 `EXAMPLE 3. ...has dimension 2.`（带 `EXAMPLE 3. ` 前缀）
  **确为 100 字符且确为逐字子串**；去掉前缀的裸句为 **89 字符**，也是逐字子串。
  主控核验记的"实际可引子串是 89 字符"指的是**边上已有的那一条**（裸句），
  不是说分片把 100 数错了。两个数字各自都对，量的是两个不同的串。**塌陷判决不受影响。**
- 行 37 的塌陷载体是 T3，不是 T2。**修法因此与另两条不同**：内容合法地下移给了
  `d:exponential-law-used-in-the-shift`（它正是为承载公式 (15.3) 而设的兄弟/子节点），
  **父节点可能什么都不用改**。而行 66、行 45 是 T2 塌陷，属**记账位置问题**——
  生产者确实引了那一行，只是写进了边的 `evidence` 而没写进 `anchors`；
  修法是把引文搬进 `anchors`（或由 SPEC 裁定边证据能否充当锚点）。
  把这两类都报成"锚点不支撑断言"会把修复方向带错。

**行 45 只塌了一半，另一半维持**：塌陷的是 cause 6（缺引文），
维持的是**末句为假**——分片称"维数理论的承重墙在第 15 章内没有证明"，
而 `15.07.md:61` 以 `Proof.` 起头并给出了实质的元层论证（审查 12.8 的证明只依赖线性空间性质
⇒ 移植合法）。引文可以长在别处，**"没有证明"这句话为假却撤不回**。
主控核验的原话是"line 45 确有缺陷，但比分片说的窄"。

### 2.1 主控亲核并确认成立的两条

**行 36 `d:exponential-independence-select-the-largest-exponent` | KILL | 死因 6 + 4 | 归因错误**

claim 3「正是这个选择使其余所有指数都小一个严格负的量」**错**：取最大只给出 `a_k − a_M ≤ 0`，
**严格**性来自 `a_k ≠ a_M`，即 Example 7 的 distinctness 假设（`15.07.md:39`，89 字符），
不来自"取最大"这个动作。同片行 39 自己正确写道 "This is where the distinctness hypothesis is consumed"
——两个节点对**同一步的严格性**给了互斥归因，行 36 那个是错的。
**证据池救不了它**：池共 2 条，T1 与 `edges-D2.jsonl:149` 的 T2 **逐字相同**（同一条 67 字符引文），
新引入源行 0 条。（`edges-D2.jsonl:40` 那条 `If $k \neq M$ , the number $a_k - a_M$ is negative.`
是 **TD**——它的 `src` 是下游的 `d:...-negativity-of-the-shifted-exponents`，按四层定义**不入池**。）

**行 42 `d:exponential-independence-uses-no-inner-product` | KILL | 死因 4 | 正面清单一错一漏**

主控追加核验，三项结构事实全部核实：`anchors: []`、`origin: model`、
`origin_note` 自称 "obtained by inspecting every step of Example 7 in 15.07"。逐项核正面清单：

| 清单项 | 是否真被用到 |
| --- | --- |
| ordering of the reals | 是（`15.07.md:51` "Let $a_M$ be the largest"） |
| exponential addition law | 是（乘 `e^{-a_M x}` 得 `e^{(a_k−a_M)x}`） |
| **nonvanishing of the exponential** | **未被用到** |
| one limit | 是（`:57` `x \to +\infty`） |
| **induction** | **被漏掉**，而 `:45` 明写 `We can prove this by induction on $n$ .`（39 字符，可锚） |

非零性那条：证明只做前向的 (15.2)→(15.3)，等式两边乘任何东西都保持 `= 0`，**不需要乘数非零**
（反推 (15.3)→(15.2) 才需要，而 Apostol 没做这一步）。这与行 37 statement 里的
"legal and reversible because the exponential never vanishes" 是**同一个错误，出现在两个节点里**。
问题**不是"零锚点"本身**——`origin: model` 已诚实声明它不是原文断言；
问题是 `origin_note` 声称做了穷举审计（"every step"），而清单同时**多一条假的、少一条最重要的**。
**声明的严谨性与内容的严谨性脱节。** 负面清单（no inner product / norm / orthogonality /
differentiation / dimension count）经核**全部为真**，值得保留。
池：T1=0、T2=0、后代=0，**总池 0 条**，无任何东西可救。

### 2.2 主控核验后**否掉**的一条矛盾指控

**片 36–58 称行 45 与行 46 互相矛盾。不成立。**
行 46 的原文是 "This audit, **not any new computation**, is what makes Theorem 15.5 hold in
arbitrary linear spaces." 它自己就说了"没有新计算"，这与行 45 的 "Apostol gives no new argument"
**方向一致**。分片把"46 说 audit 使定理成立"读成了"46 说这里有新论证"，误读。

这条有方法论价值：**"节点间矛盾"是最容易被误报的一类指控**，因为它要求同时正确理解两个节点，
误读任一个都会产生假矛盾。注意本文件里还有两条同类指控（行 36 vs 行 39、行 70 vs 行 62），
那两条经核**成立**——所以这一型不能一概而论，只能逐条回原文核双方。

### 2.3 维持的形式 D（射程不足，结论为真，须补锚）

以下各条我按四层证据池重算过，**池中均无所缺引文**，指控维持。
括号内为实测的补锚串长度（全部经 Python 逐字校验为对应文件的连续子串、单行、未改标点）。

- **行 43** `d:thm-15-5-hypothesis-independent-set-of-k-elements` —— 本文件**最纯粹的射程不足样本**。
  锚点管住"假设是什么"，末句却断言"这个假设的最优性"（k+1 是紧阈值）。Apostol 全节不讨论紧性。
  断言为真（S 自身即 L(S) 中 k 个独立元素）但属**定理级事实**。
  **池的形状值得单记：3 条全是同一句 72 字符引文**（T1 ＋ `edges-D2.jsonl:48` ＋ `:155` 两条 T2 逐字重复），
  新引入源行 **0**。这与 D3 的 L47 同型——池子看着有 3 条，实际只有 1 条信息。
- **行 44** —— 末句「只需能表为 S 成员的有限组合」的依据是 L(S) 的定义
  （`15.06.md:19`：`The set of all finite linear combinations of elements of S satisfies the closure axioms and hence is a subspace of V.`，**117 字符**），
  而 `sections` 只写 `["15.07"]`。池同样是 3 条同一句 103 字符引文的重复。
- **行 46** —— 锚点止于 `...special property of $V_{n}$ .`，"在任意线性空间成立"的依据是紧接的
  `Therefore the proof given for Theorem 12.8 is valid for any linear space $V$ .`（**78 字符**）。
  **一处跨节点记账巧合**：这一句在图里**确实存在**，但它挂在**行 45** 的自发边 `edges-H2.jsonl:2` 上
  ——即它是行 45 的 T2、行 46 的 TD。按四层定义 TD 不入池，故**行 46 的指控维持**，
  而同一句话却让行 45 的 cause 6 半塌陷。同一条引文对相邻两节点一个救得了一个救不了，
  是"证据挂在哪个节点上"这件事有实质后果的干净实例。
- **行 47** —— 末句「独立性正是使表示唯一的东西」的论证就在同文件 `15.08.md:35`
  （`But since the basis elements are independent, this implies $c_{i}=d_{i}$ for each i`，**83 字符**）。
  该句在图里由 `edges-D2.jsonl:112` 携带，但 `src` 是 `d:uniqueness-of-components-apply-independence`
  ——**下游消费者，属 TD，不入池**。指控维持。这是本文件的第二个"仅 TD"个案。
- **行 48** —— 末句后半是 `15.06.md:19` L(S) 定义的同义重述，可锚未锚。锚点是行 47 锚点的 62 字符子串。
- **行 49** `d:finite-basis-two-clauses-are-logically-independent` —— **谓词越界**：
  锚点 `$\{i,j\}$ , $\{i,j,i+j\}$ , $\{O,i,-i,j,-j,i+j\}$ .`（51 字符）**只列集合，不含 "span V_2" 这个谓词**，
  谓词在同一行前半。左扩到 122 字符即闭合（实测：
  `the space $V_{2}$ is spanned by each of the following sets of vectors: ... $\{O,i,-i,j,-j,i+j\}$ .` = 122 字符）。
  "不独立"这半依据在 `15.07.md:23` Example 3（**48 字符**）或 `:21` Example 2，而 `sections` 未列 15.07。
  池 2 条，逐字重复，新源行 0。
- **行 53** —— **结论落在锚点左侧**：锚点从 `Although the infinite set...` 起（115 字符），
  而 `The space of all polynomials $p(t)$ is infinite-dimensional.` 在同一行前半、锚点之外。
  左扩取整个 Example 4 = **187 字符**（实测，仍在 200 上限内）即闭合。
- **行 57** —— 见 §3（点名引用 Example 1 却不挂锚，形式 E）。
- **行 59、60、65、75、76、71** —— 轻度射程不足，逐条见 §7 与附录；补锚串已实测：
  基定义 `15.08.md:3`（**110 字符**）、`Proof. Let S and T be two finite bases for V.`（**45 字符**）、
  `Since T is an independent set, we must have $m \leq k$ .`（**56 字符**）、
  Example 2 全句含 `$\{1, t, t^2, \ldots, t^n\}$`（**153 字符**）。
  行 71 有 `origin: model` ＋ `origin_note` 如实披露"锚点引的是被实例化的那个结论"，**减责**。

## 3. 确认的形式 E 实例

**先给方法声明。** 本节每一条我都跑过四层证据池（T1 自身 anchors ／ T2 节点自己发出的边 ／
T3 part-of 后代的锚点与后代自发边 ／ TD 不入池）。结果是：**除行 66 外，本文件所报的形式 E
所缺的那条引文，一条都没有进池**。这个负面结果是本文件最该记的一条——它不是"没查"，
而是查过之后指控维持。原因也已量清：**D2 只有 6/80 个节点有 part-of 后代**（实测 6，与主控核验的
"6/80"一致），T3 通道在本文件几乎不存在；而 T2 通道在本文件绝大多数情况下是**逐字重复节点自己的锚点**
（见 §7.1 的池形状实测）。

### 3.1 行 52 `d:zero-space-declared-finite-dimensional-by-fiat` | KEEP | 死因 0

四个 claim：(1)「or if V consists of O alone」是第二析取项而非第一项的推论 —— 锚点 1 命中；
(2)**「由 Example 4，空集是独立的」无锚**；(3) 由 15.06 约定空集 span {O} —— 锚点 2 逐字命中；
(4) 末句「Apostol 单列此情形是为了不让定义依赖那两条边界约定」为**作者意图推测**，原文无依据，不可锚。

池实测 4 条（T1×2 ＋ T2×2，其中 `edges-D2.jsonl:164` 与 T1 逐字重复），
**`15.07.md:25` 一次都没进池**，指控维持。可修性极好：Example 4 在 `15.07.md:25`，
节点 `sections` **已含 15.07**，且**只用了 2 槽、尚有 1 空槽** —— 纯遗漏。

长度实测（这一条对 SPEC 议题有用）：裸句 `The empty set is independent.` = **29 字符，恰差 1 字符**触下限；
加原文自带前缀作 `EXAMPLE 4. The empty set is independent.` = **40 字符**（已逐字校验为 `15.07.md:25` 单行子串），
合规可用。**故 SPEC 下限在此不构成真实阻碍** —— 与 D4 那条"必须选 (b) 支才锚得上"同型：
下限看似致命、实则可绕。

数学核查：空集有限 ✓、独立（`15.07.md:25`）✓、span {O}（`15.06.md:19`）✓ ⇒ 节点"形式上冗余"的判断**正确**。
claim 4 建议降格为"效果上使定义不依赖那两条边界约定"，去掉意图归因。

### 3.2 行 57 `d:thm-15-6-upgrade-from-k-plus-one-to-more-than-k` | KEEP | 死因 0

claim (3)「它依赖'含相关子集的集合是相关的'，即 15.07 的 Example 1」**点名引用了原文某处却不给锚点**
—— 这是最容易补、也最不该漏的一类形式 E。Example 1 在 `15.07.md:19`
（`EXAMPLE 1. If a subset T of a set S is dependent, then S itself is dependent.`，**77 字符**，已实测），
而 `sections` 只写 `["15.08"]`、只用 1 槽。

池实测 3 条：T1（63 字符）＋ `edges-D2.jsonl:71`（112 字符，同一行的左扩版）＋ `:169`（与 T1 逐字重复）。
`15.07.md:19` **未入池**，指控维持。
（另有 `edges-D2.jsonl:72` 携带同一行的右扩片段，但其 `src` 是行 58，属 **TD，不入池**。）

**值得单记的是它的锚点选得极好**：`Therefore, every set of more than k elements in V is dependent.`
**恰好见证了"沉默"本身** —— 原文只有一个 "Therefore,"，没有任何理由。
claim (1)(2)（15.5 说 k+1、证明却要"多于 k"、这一升级在原文中是沉默的）由此得到正面支撑。
这是本文件锚点选取最贴切的一条。数学核查：对"多于 k"元的集合取任一 k+1 元子集即得，对无限集亦成立 ✓。

### 3.3 行 63 `d:dimension-of-the-zero-space-is-zero-by-convention` | KEEP | 死因 0

末句两个子断言跨文件无锚，且**两处原文都存在、都可引**：

| 子断言 | 原文出处 | 实测字符 | 是否入池 |
| --- | --- | --- | --- |
| 空集独立 | `15.07.md:25` `EXAMPLE 4. The empty set is independent.` | **40** | 否 |
| 空集张成零空间 | `15.06.md:19` `If S is empty, we define $L(S)$ to be $\{O\}$ , the set consisting of the zero element alone.` | **93** | 否 |

池实测 2 条（T1 42 字符 ＋ `edges-D2.jsonl:174` 与之逐字重复），新引入源行 **0**。指控维持，锚点位剩 2 个。

**一处跨节点记账观察（不构成塌陷）**：行 52 的**第二条锚点就是** `15.06.md:19` 那句空集约定
——即行 63 所缺的两句里的一句，在图里由**兄弟节点**持有。但行 52 不是行 63 的 part-of 后代，
按四层定义**不入行 63 的池**，故指控不受影响。这与 §2.3 行 46／行 45 那一对是同型现象：
**同一条引文挂在哪个节点上有实质后果**。

另：Apostol 把"空集独立"作为 **Example（事实）** 陈述，节点却称之为 "convention（约定）"，
属轻度性质错标（登记于 §7）。首句"零空间没有正维数的基"无锚但为真
（零空间任何非空子集含 O，由 `15.07.md:23` Example 3 即相关）。

### 3.4 行 70 `d:thm-15-7-proofs-delegated-to-theorem-12-10` | 死因 1 | 排他性断言

末句：`the only chapter-internal ingredient available is Theorem 15.5`。锚点（135 字符）逐字覆盖
"(a) 同 12.10(b)、(b) 同 12.10(c)"，并支撑"Apostol 未复述论证""章内证明是空的"。
**末句完全在射程外，池实测 2 条且第 2 条与 T1 逐字重复，新引入源行 0。**

**独立核验判定末句为假（至少严重过强）**：15.08 之前可用的章内原料不止 15.5，还有 Theorem 15.4、
**Theorem 15.6**、`L(S)` 与线性组合的定义、相关/无关的定义、15.07 的 Example 1–7。
决定性的一点是 **15.6 不可缺**：15.7 的假设是 `dim V = n`，而本图**自己的行 62**
（`d:dimension-well-definedness-requires-all-bases-to-be-equinumerous`）正断言"没有 15.6，
`the dimension of V` 这个短语根本不指称任何东西"。

**这是本文件第三条"节点间矛盾"型指控，而它成立。** 按 §2.2 立的规矩，我回原文核了双方：
行 62 的锚点 `Then every finite basis for $V$ has the same number of elements.`（64 字符）
确实只讲等势、正是 dim 良定义的依据；行 70 的"章内只有 15.5"确实把它排除在外。两条不能同时为真。
（对照 §2.2 那条被否掉的行 45 vs 行 46：那里两个节点方向一致，是分片误读；这里是真冲突。
**同类指控三条、两成立一不成立，所以只能逐条回原文核双方，不能一概而论。**）

更强的一点：本文件行 72、73 自己承认，重建 15.7(b) 还需一条"添加张成集外元素保持独立性"的引理，
而行 73 的 `origin_note` 写明该引理 `Not stated in 15.06 through 15.08`。
所以章内原料**不足以**支撑 15.7，说"唯一可用的原料是 15.5"反而给人"够用"的错觉。

建议改写为 `... the chapter-internal ingredients it rests on are Theorem 15.5 together with Theorem 15.6, which is what makes dim V meaningful.`；不改则判 `1`。

### 3.5 行 74 `d:dimension-theory-uses-no-metric-notions` | 死因 0 | 未披露的前向架构断言

末句：`which is why all of 15.10 onward can be built on top of this layer rather than beside it`。

唯一锚点是 `15.07.md:61` 的 `it is based only on the fact that $V_{n}$ is a linear space and nc on any other special property of $V_{n}$`（**107 字符**，含原文 OCR 噪声 `nc`，**未修正，做法正确**）。
这条引文出自 **Theorem 15.5 证明**中 Apostol 对 12.8 的评述，**只管 15.5 一个定理**，
而 statement 的 claim 1 是对 **15.5、15.6、15.7 三条**的全称范围断言。

- claim 1、2 覆盖到 15.6/15.7 的部分是**推断**，`origin_note` 已诚实披露
  （"the anchor is Apostol's own statement of it for the 15.5 ingredient only"），**此处不判缺陷**。
- **claim 3 既无锚点，也未被 `origin_note` 覆盖** —— note 只声明了"三定理的范围断言是推断"，
  对"15.10 onward 的架构结论"一字未提，且该结论谈的是本节点 `sections`(15.07/15.08) **之外**的章节。
  **这是标准形式 E。**

池实测 3 条：T1（107）＋ `edges-D2.jsonl:102`（**109 字符，同一句的左扩两字符**）＋ `:183`（与 T1 逐字重复）。
新引入源行 **0**，指控维持。

**附带一条分片漏掉的形式 B 事实（我实测补上）**：行 74 的这条 107 字符锚点，
**是行 46 那条 122 字符锚点的真子串**（同为 `15.07.md:61`）。
行 46 用它支撑 15.5 的移植论证，是**本地用法**；行 74 拿同一句去覆盖三条定理，是**借用并外推**。
分片 59–80 自称"20 条锚点无一与图内其它节点共用，形式 B 清零"——该结论**不成立**，
它只做了 `(file, quote)` 精确去重，**漏掉了包含关系**（见 §7.4 的完整实测）。

**真值**：claim 3 实际为真。15.10 起全是内积/范数/正交/Gram-Schmidt/投影，
且 `15.11.md:43` 的 Theorem 15.11 与 `:77` 的 15.12 都以 `finite-dimensional Euclidean space ... dimension $n$` 为假设，
即度量层**反过来依赖**维数层，依赖方向与 claim 3 一致。缺的不是真值，是"不要把推断伪装成原文"这条义务的完整履行。

### 3.6 行 77 `d:components-depend-on-the-ordering-not-only-on-the-basis` | 死因 1

末句：`This is the sole reason Apostol introduces ordered bases before components`
—— 一条关于**作者写作意图**的排他性断言，原文没有任何句子谈自己的编排理由。
`origin_note` 只披露了 claim 1 的置换观察（"read off from the n-tuple notation"），**没提"唯一理由"**。
池实测 2 条，第 2 条与 T1 逐字重复，新引入源行 0。

**真值**：不可从原文证实，且可举出别的理由 —— n-tuple 记法把 V 与 `V_n` 的分量对应起来，
是后文（15.11 的展开式系数、15.12 的正交基分量公式）反复使用的记法基础；"唯一理由"排除了这一同样成立的动机。
建议把 `the sole reason` 降为 `the reason`。

### 3.7 行 59 末句 —— 表述歧义，不判死因 1

原句：`The phrase the same argument hides the second, and only, use of T being a spanning set.`
该从句无任何锚点管辖（唯一锚点只讲 `k \leq m` 这个结论），池实测 2 条且 T2 与 T1 逐字相同。

独立核原文：正向那一半（`Since T is an independent set, we must have $m \leq k$ .`，**56 字符**）
**只用到 T 独立**，未用 T 张成 ⇒"T 张成在整个证明里只被用了一次"为真。
**但"第二次、也是唯一一次"自相矛盾**：若是第二次就必有第一次，若是唯一一次就不该称第二次。
作者本意应是"S 张成用了一次（正向）、T 张成用了一次（反向）"，即这是 **S/T 合计的第二次**"张成"使用、
却是 **T 张成的唯一一次**使用。两个计数口径被压进一个短语。

**不判 `1`**：两个口径下的数字各自都对，问题是**表述歧义**而非断言为假。
建议改写为 `... hides the only use of T being a spanning set, the second time a spanning hypothesis is consumed in the proof.`

### 3.8 行 49 的两处形式 E

见 §2.3：claim 2 的"不独立"半句（依据在 `15.07.md:23` Example 3，**48 字符**，或 `:21` Example 2，
而 `sections` 未列 15.07）与 claim 3（"V_2 中单个非零向量独立而不 span V_2"，
15.06/15.08 中**无此例**，整句无锚）。
关键问题：`origin:model` 只声明了"两从句互不推出"这个**结论**是模型推的，
**没有声明两个见证例的关键谓词也是模型补的**，声明不足。

### 3.9 行 73 末句 —— 越出指定源的归属断言（登记，不判死）

原句：`This lemma is the engine of both the extension in part (a) and the contradiction in part (b).`
断言的是 15.7(a)/(b) **证明的内部构造**，而那两个证明在第 15 章内是空的（委派 12.10），
**在指定源内根本不可核**。池实测 **0 条**（T1=0、T2=0、后代 1 个但无证据）。
不判死（`origin: model` 已尽披露义务），建议在 `origin_note` 补一句
"部分 (a)(b) 的实际证明在第 12 章，未在指定源内核实"。

### 3.10 四个零证据节点的性质：**合规缺口，不是编造归属**

行 42、54、72、73 的 `anchors` 为空数组。**四个节点全部带 `origin: model` 且带具体 `origin_note`**
（我逐条读过字段，实测结果如下），走的是 SPEC 第 55 行明许的通道
（"找不到可逐字引用的依据 ⇒ 不要收录，或标 `origin: model` 并如实说明"）：

| 行 | id | `origin` | `origin_note` 摘要 |
| --- | --- | --- | --- |
| 42 | `d:exponential-independence-uses-no-inner-product` | `model` | "obtained by inspecting every step of Example 7 in 15.07. Not stated by Apostol." |
| 54 | `d:infinite-dimensional-...-arbitrarily-large-independent-sets` | `model` | "not stated in 15.08; Apostol gives only the negative spanning form. Derived here from Theorem 15.5." |
| 72 | `d:thm-15-7b-argument-adjoining-an-outside-element-breaks-the-count` | `model` | "Apostol delegates the proof of 15.7(b) to Theorem 12.10 and gives no argument in 15.08." |
| 73 | `d:adjoining-an-element-outside-the-span-preserves-independence` | `model` | "Not stated in 15.06 through 15.08. Recorded as model-origin because it is the missing link..." |

**这四条按合规缺口口径处理，不按"编造成员归属"（死因 2）处理。**
**须更正分片 59–80 的一处自相矛盾记账**：该分片附录批 1 写"行 72、73 的 anchors 为空数组，
**且两节点均无 `origin: model` 标注**。这是本片区最严重的发现"——**该说法为假**，
两节点都有 `origin: model`；分片自己在第 5、7 节已改口称它们"走的是 SPEC 明许的通道"，
但附录里那句错的记账留着没删。**按本报告口径以字段实测为准：合规，非最严重发现。**

真正的问题不在"零锚点"本身，而在**逃逸口被用来承载了比声明更强的断言**：
行 42 的 note 声称检视了"every step"，实际清单一错一漏（见 §2.1）；
行 54 的 note 只覆盖已证的单向（见 §4.2）。**这是形式 E 在 `origin:model` 节点上的变体：
不是"没有锚点"，而是"声明没有覆盖到全部无锚内容"。**

**顺带一条工具层缺陷（非生产者）**：`verify_anchors.py` 对空数组直接跳过，
无法区分"合规的空"与"漏填的空"。它会打印 `nodes with NO anchor: 4` 但**退出码仍为 0**
（`:75` 是 `return 1 if failures or bad_json else 0`）。
建议增加一条硬校验：`anchors == [] ⇒ 必须存在 origin == "model"`。

## 4. 有限维假设与量词专项检查

### 4.1 有限维假设的增删：全 80 节点**零例**

两个分片各自在自己片区内核过，我在合并时把范围补齐到 80 个节点，并回源逐条实测了
四条定理的原文假设（括号内为实测字符数，全部为对应文件的逐字单行子串）：

| 定理 | 原文位置 | 原文有无有限维假设 | 引用它的节点 | 判定 |
| --- | --- | --- | --- | --- |
| Thm 15.4 | `15.06.md:5`（129） | **无**（只要求 S 非空） | 行 4–11 | ✓ 未擅加 |
| Thm 15.5 | `15.07.md:59`（185） | **无**（只要求 S 独立、含 k 元） | 行 43、44、45、46、54、56、71 | ✓ 无一节点擅加 |
| Thm 15.6 | `15.08.md:5`（124） | **有**（`Let $V$ be a finite-dimensional linear space.`） | 行 55、56、57、58、59、60、62 | ✓ 保留，见下 |
| Thm 15.7 | `15.08.md:19`（106） | **有**（`with $\dim V = n$`） | 行 67、68、69、70、72 | ✓ 行 67 锚点（92）逐字含之 |

三处需要单记：

- **行 55 是全文件处理得最干净的一条**：它把 15.6 的有限维前提当作**受审对象**
  （"stated only for finite-dimensional V"）而不是默认背景。这正是任务书点名的
  `15.11.md:7`（15.10 首句无有限维假设）vs `:43`/`:77`（15.11/15.12 都有）那类陷阱的正确处理姿势。
- **行 62 技术上抹掉了 15.6 的假设，但无害**：它的锚点只取后半句
  `Then every finite basis for $V$ has the same number of elements.`（**64 字符**），
  首句的 `finite-dimensional` 落在外面。之所以无害：引文自带 `finite basis` 限定，
  而 Apostol 的 basis 定义本身就是有限集（`15.08.md:3` 的 `A finite set S`，实测该整句 122 字符），
  故"所有基"自动等于"所有有限基"。**建议把锚点扩到含首句的 124 字符全句**，一次消除隐患
  （实测 `THEOREM 15.6. Let $V$ be ... same number of elements.` = **124 字符**，逐字子串，合规）。
- **行 71 把 15.5 实例化到 n 维空间，合法**：n 维假设是由"取 V 的一个基"引入的，
  不是加到 15.5 身上；且 `origin: model` + `origin_note` 已如实声明它是实例化。

**15.11 陷阱在本文件不触发**：D2 的 80 个节点 `sections` 全部落在 15.06/15.07/15.08
（分布见 §1），**无任何节点引 15.11**。唯一碰到 15.11 的是行 55 那条章级否定断言的**核验过程**
（我为核它跨 16 个文件检索 `basis|bases`），不是节点内容。

### 4.2 量词与排他性断言：机械筛选命中 50/80，真缺陷 3 条

先给筛选口径与它的精度，因为这是 §8 要用的数据。用正则
`\b(only|sole|solely|never|always|cheapest|first|single|nothing|every|all of)\b`
扫 80 条 statement，**命中 50 条（62.5%）**。逐条回原文核完，判 `1`（量词过度断言）的只有 **3 条**，
另有 2 条最高级为假但按其它死因归类。**筛选精度 3/50 = 6%** —— 这个信号只能定向，不能结案。

| 行 | 措辞 | 判定 |
| --- | --- | --- |
| 70 | `the only chapter-internal ingredient available is Theorem 15.5` | **死因 1**，与行 62 真冲突（§3.4） |
| 77 | `the sole reason Apostol introduces ordered bases before components` | **死因 1**，作者意图排他断言（§3.6） |
| 54 | `Equivalently`（宣称双向等价，只给出单向论证） | **死因 1**，反向需基扩张引理，而 15.7(a) 前提有限维、用不上 |
| 25 | `the cheapest sufficient condition for dependence` | **最高级为假**，反例就在锚点下方两行：`15.07.md:23` Example 3（`EXAMPLE 3. If $O \in S$ , then $S$ is dependent.`，**48 字符**）只需 **1** 个元素 |
| 34 | `Only the elimination step uses ... distinct ... the recursion itself is independent of it` | **为假**：descent step 调用归纳假设，而 IH 的前提就是剩余 n−1 个指数互不相同 |
| 36 | `the choice is what makes all the other exponents smaller by a strictly negative amount` | **死因 6+4（归因错误）**，严格性来自 distinctness 不来自取最大（§2.1） |
| 9 | `Closure under addition (Axiom 1) is **never** invoked` | **为真**（通读 `15.06.md:9–11` 核过），但属**全局否定断言**，单条锚点原理上支撑不了 |
| 15 | `the very first application of Theorem 15.4 in the book is to the span` | **为真**（15.4 在 `:5`、证明 `:7–:11`、紧接 `:19` 即 span，其间无别的应用），属全局排序断言 |
| 8 | `the single load-bearing use of the nonemptiness hypothesis in the whole proof` | **为真**（非空性仅在 `15.06.md:11` 用一次） |
| 59 | `the second, and only, use` | **表述歧义，不判 1**：两个计数口径各自为真（§3.7） |
| 68 | `an independent set, of any size up to n` | 原文 `Any set of independent elements in $V$` **无 size 上界**；上界可由 dim V = n 与 15.5 导出，**为真但是原文没有的补充**。登记不判死 |
| 64 | `the only way available: exhibit one basis and count it` | 元陈述而非数学断言；此处维数定义即"存在 n 元基"，实质为真。不判死 |
| 74 | `use only the linear space axioms` / `No inner product, norm, ... appears` | 真；`origin_note` 已披露推断部分。唯 `coordinates` 一词最弱——分量正是在 15.08 引入的，但确不出现在 15.5–15.7 内，成立 |
| 76 / 78 | `Independence plays no role in the existence of the expansion` / `it uses only the linear space axioms` | 均为真、无锚、短且可核，低风险 |
| 42 | 否定清单（no inner product / norm / orthogonality / differentiation / dimension count） | **否定部分全部属实** ✓；缺陷在正面清单（§2.1） |

**核过未发现问题的量词点**：行 44 的 `all sets of k+1 elements` 与原文 `every set of $k+1$ elements` 一致，
且正确把范围限定在 L(S) 而非 V ✓；行 56 把 15.5 的 `in L(S)` 换成 `in V` —— **合法，且这个替换是
Apostol 自己做的**（S span V ⇒ L(S)=V），锚点直接见证 ✓；行 57 的 `every set of more than k`、
行 58 的 `cannot have more than k elements` 与 `m \leq k` 一致 ✓。

### 4.3 有限/无限与 distinct（集合式定义）专项

Apostol 的 dependence 定义（`15.07.md:3`）建立在 "a **finite** set of **distinct** elements in S" 上，
是**集合式**而非列表式；independence 是"不 dependent"的残余定义（`:9`）；
`:17` 明确 `However, the present definition is not restricted to finite sets.`（实测该整句 65 字符，
正是行 29 的锚点）。据此逐条核：

- **全文件唯一一例把集合式定义误当列表式：行 33**（批 4 已判）。它称"若两个指数相同则两函数相等、
  故由标量倍判据相关"——在集合式定义下站不住：若 a_i = a_j，两个指数函数是**同一个**函数，
  集合 S 里只有**一个**元素，而 Example 2 的判据需要**两个不同**元素；`{e^{ax}}` 是**独立**的。
- **这一例与行 21 直接冲突，而这个冲突只有在整文件视角下才看得见**：行 21 末句正是把
  `x_1 = x_2 = x, c_1 = 1, c_2 = −1` 这一 family-vs-set 混淆指认为**病态**（用以说明定义为何必须要求
  distinct），行 33 却把同一步当作**合法**推理来用。两者不可同时为真。
  两条都落在批 1–4 片区，任一分片单看都发现不了 —— 这是**跨片合并才产生的发现**，记在此处。
- 行 41 的"余下 n−1 个指数互不相同"：distinct 不在锚点内，但作为 distinct 集合的子集自动继承，
  数学无误（轻，§2.3）。
- 行 44 用 `finite combinations` 与原文 `finite linear combination` 一致 ✓，但依据在未挂锚的
  `15.06.md:19`（117 字符，§2.3）。
- 行 52 关于空集的三项校验数学上全对（有限 ✓、独立 ✓、span {O} ✓，§3.1）。
- 行 53 保持残余（负向）定义的形态 ✓；行 54 试图给出正向刻画而量词越界 ✗（见 4.2）。
- **行 55 的章级否定存在断言经穷举核验属实**：`grep -c basis|bases` 全章 = 15.06:1、15.08:13、
  15.09-ex:2、15.11:9、15.13:5、15.14:3、15.16-ex:2，逐条读过，全部为 finite / orthogonal /
  orthonormal basis 或 "basis of n elements"；`15.13.md:3` 的 "finite or infinite dimensional" 与
  `:5` 的 "finite or infinite sequence" 说的是空间与序列，**无一处把无限集称为 basis** ⇒ 断言属实。
  但它**无法用任何单条逐字引文见证**，记入 §6.3。
- 行 59–80 片区**无任何节点**触及"重复元素"话题；最接近的是行 66 调用 15.07 Example 7，
  其 distinct 条件已核（指数 −1 与 3 互不相同，合法）。

## 5. 检查且判定支撑充分的节点 id 清单

**口径先声明，因为合并后有两档。** 「支撑充分」在本节分成两层，理由是主控核验证明了
「只读 `anchors`」与「按四层证据池」会给出不同答案，两者混报会把修复方向带错：

- **第一档（T1 自足）**：只看节点自己的 `anchors` 就已覆盖全部实质断言。**31 个**。
- **第二档（须靠 T2/T3 才充分）**：`anchors` 单看不足，但按四层池复核后指控塌陷。**2 个**。
  这一档**不是"没问题"**，是"问题不在射程而在记账位置"，必须与第一档分开列。

**回显 id 是硬要求**（上一轮按名字匹配错杀过 9 个），故下表全部逐字回显。

### 5.1 第一档：T1 自足，31 个

批 1–4 片区（行 1–35），13 个：

| 行 | id |
| --- | --- |
| 2 | `d:subspace-inherits-the-operations-of-the-ambient-space` |
| 3 | `d:subspace-satisfies-all-linear-space-axioms` |
| 4 | `d:thm-15-4-hypothesis-nonempty-subset` |
| 5 | `d:thm-15-4-sufficiency-direction` |
| 6 | `d:thm-15-4-identities-inherited-from-the-ambient-space` |
| 7 | `d:thm-15-4-remaining-obligations-zero-and-negative` |
| 8 | `d:thm-15-4-witness-element-supplied-by-nonemptiness` |
| 10 | `d:thm-15-4-zero-element-obtained-by-taking-the-scalar-zero` |
| 11 | `d:thm-15-4-negative-obtained-by-taking-the-scalar-minus-one` |
| 26 | `d:independence-universal-quantifier-over-choices` |
| 27 | `d:independence-vanishing-combination-forces-vanishing-coefficients` |
| 32 | `d:powers-independence-by-differentiating-and-evaluating-at-zero` |
| 35 | `d:exponential-independence-base-case-n-equals-one` |

片 36–58，9 个：

| 行 | id |
| --- | --- |
| 38 | `d:exponential-law-used-in-the-shift` |
| 39 | `d:exponential-independence-negativity-of-the-shifted-exponents` |
| 40 | `d:exponential-independence-limit-argument-isolates-one-coefficient` |
| 41 | `d:exponential-independence-delete-the-killed-term-and-recurse` |
| 50 | `d:finite-basis-finiteness-clause` |
| 51 | `d:finite-dimensional-defined-by-existence-of-a-finite-basis` |
| 55 | `d:thm-15-6-hypothesis-finite-dimensional-space` |
| 56 | `d:thm-15-6-apply-theorem-15-5-to-the-first-basis` |
| 58 | `d:thm-15-6-first-inequality-m-at-most-k` |

片 59–80，9 个：

| 行 | id |
| --- | --- |
| 61 | `d:dimension-defined-as-the-element-count-of-a-basis` |
| 62 | `d:dimension-well-definedness-requires-all-bases-to-be-equinumerous` |
| 64 | `d:dim-of-vn-is-n-via-unit-coordinate-vectors` |
| 67 | `d:thm-15-7-hypothesis-dim-v-equals-n` |
| 68 | `d:thm-15-7a-independent-sets-extend-to-bases` |
| 69 | `d:thm-15-7b-n-independent-elements-form-a-basis` |
| 78 | `d:uniqueness-of-components-subtract-to-get-a-vanishing-relation` |
| 79 | `d:uniqueness-of-components-apply-independence` |
| 80 | `d:uniqueness-of-components-conclusion-tuple-determined-by-x` |

**四条附加保留（列入但须带条件读）**：

- **行 38** `d:exponential-law-used-in-the-shift` —— 判"充分"是就**数学内容**而言，不就锚点合规性。
  它的核心断言（指数加法律不是线性空间性质）在 15.07 内**结构性不可锚**：全节根本不写
  `e^a·e^b = e^{a+b}`。且它**未标** `origin: model`（我核过 `origin` 字段为 `None`），
  而同片行 42、49、54 都标了 —— 属生产者的合规遗漏（登记于 §7）。
- **行 62** —— 见 §4.1：锚点技术上抹掉了 15.6 的 `finite-dimensional` 前提，判无害，
  但建议扩到 124 字符全句。它同时是驳倒行 70 的关键证人（§3.4）。
- **行 68** —— `of any size up to n` 这个上界原文没有（`15.08.md:21` 只写
  `Any set of independent elements in $V$`），为真但属补充，登记不判死（§4.2）。
- **行 79** —— 末句后半是行 76 结论的复述，本节点锚点不管，属**轻度借用结论**；可溯源、数学为真。

### 5.2 第二档：`anchors` 单看不足、按四层池复核后指控塌陷，2 个

| 行 | id | 塌陷通道 | 载体 | 修法 |
| --- | --- | --- | --- | --- |
| 66 | `d:dim-of-a-second-order-de-solution-space-is-two` | **T2**（过报通道 c） | `edges-D2.jsonl:85` | 把 89 字符裸句搬进 `anchors`（记账位置） |
| 37 | `d:exponential-independence-multiply-by-a-normalizing-exponential` | **T3** | 后代 `d:exponential-law-used-in-the-shift` 的锚点 + `edges-D2.jsonl:38` | **父节点可能什么都不用改** |

**这两行绝不能与 §5.1 混列。** 行 66 是记账位置错（生产者确实引了那一行），
行 37 是内容合法下移（结构如预期）。两者都报成"支撑充分"会掩盖行 66 那条待搬的引文；
都报成"锚点不支撑断言"又会给行 37 派一个它不需要的修复动作。

### 5.3 明确**不**列入本清单的 47 个

- **实质缺陷（KILL 或含假断言）5 行**：36、42、45（只塌一半，末句为假仍在）、54、70、77。
- **须补锚后才算充分（形式 D 二级 / 形式 E）**：43、44、46、47、48、49、52、53、57、
  59、60、63、65、71、73、74、75、76。
- **批 1–4 片区待修**：1、9、12、13、14、15、16、17、18、19、20、21、22、23、24、25、
  28、29、30、31、33、34。
- **零证据节点 4 行**：42、54、72、73 —— 按**合规缺口**处理，不按死因 2（§3.10）。
  其中 72 我核过数学为真、73 数学为真但叙述压缩（漏"再用一次 S 的独立性"这一步）。

**合计：31 + 2 + 47 = 80，与 §1 的 80/80 闭合，无缺口。**

## 6. SPEC 缺陷导致证据不足的实例计数

**口径**：本节只计**规则本身造成**的证据不足，与 §2／§3 里生产者造成的射程不足分开计。
判据取 `SPEC.md:53–55`（至少 1 条最多 3 条、长度 30–200、**不跨行拼接**、找不到逐字依据则不收录或标 `origin: model`）。

### 6.1 「不跨行拼接」＋显示公式：本文件最大的一处规则致因，命中 **17/80 节点**

Apostol 的定义句以 `such that` / `we obtain` / `these basis elements:` 收尾，
**定义式单独占一行**（`$$` 包裹）。实测 15.06–15.08 共有 **18 行**文本紧贴 `$$` 分隔符，
其中 **15 行没有句末标点**（语法未闭合）。因 `SPEC.md:54` 禁止跨行拼接，
**「定义句 ＋ 定义式」永远不可能落进同一条锚点**，单条锚点必然是半句。

实测受影响的 D2 节点（锚点落在这 15 行中的某一行上）共 **17 个**，占 80 的 21.3%：
行 12、17、18、20、21、22、26、30、31、33、34、35、36、37、38、49、76。
逐行对应：`15.06.md:16`→行 12；`:21`→行 17、18、49；`15.07.md:3`→行 20、21、22；
`:9`→行 26；`:31`→行 30、31；`:39`→行 33；`:45`→行 34、35；`:51`→行 36、37；
`:54`→行 38；`15.08.md:29`→行 76。

这解释了本报告若干条指控的**机械成因**，而非生产者疏忽：
- **行 37** 的锚点「止于 `we obtain`」（§2.0）—— `15.07.md:51` 就是以 `we obtain` 收尾的 130 字符行，
  公式 (15.3) 在 `:54`，两行不可拼；
- **行 38** 的核心断言在 15.07 内「结构性不可锚」（§5.1）—— 它的锚点落在 `:54`，
  即 (15.3) 的公式行本身（70 字符，含 `\tag{15.3}`）；
- **行 76** 的锚点「没有一个字提到 spanning」—— `15.08.md:29` 以冒号收尾，展开式 (15.4) 在 `:32`。

**可绕程度**：3 个槽位允许「句 ＋ 式」各占一槽，故这不是死锁，但**单槽自足性**被规则排除了。
建议 SPEC 增设一档：同一定义的连续行允许写成同一锚点的多个 `quote`，或明许「句 + 式」双锚并视为一条。

### 6.2 200 字符上限：唯一一处真 binding，影响 3 个节点

`15.07.md:3` 是 **234 字符的单句**（`source-lines.tsv` 实测 charlen=234、`n_sentence_end=1`），
即 dependence 的**定义句本身**，超上限 34 字符 ⇒ **任何节点都不可能整句引用**。
行 20、21、22 各持一个片段（实测 **70 / 78 / 81** 字符，在该行内的起始偏移 52 / 72 / 154）：
行 20 拿到 `is called dependent if there is a finite set of distinct elements in S`（有「有限」「distinct」无系数条件），
行 22 拿到 `and corresponding set of scalars ... not all zero, such that`（有系数条件无被定义项）。
**没有任何一个节点持有完整定义**，这正是 §4.3 那一族「谓词/量词落在引文外」的规则级根源。

另有 3 处单句超 200 但未造成本文件的指控：`15.06.md:9` 内 207 字符句、`15.06.md:29` 内 291 字符句、
`15.08.md:35` 内 214 字符句（行 78、79、80 各引其中 84 / 83 / 122 字符的片段，各自片段已够用）。

### 6.3 原理上不可由任何单条逐字引文见证的断言：**4 条**

这一类不是「引文没找到」，而是「引文这种证据形式不适配断言的量词结构」，SPEC 未给出记账方式：

| 行 | 断言形态 | 核验实际付出的代价 | 出处 |
| --- | --- | --- | --- |
| 55 | **章级否定存在**（全章无一处把无限集称为 basis） | 跨 7 个文件穷举 `basis\|bases` 共 35 处逐条读 | §4.3 |
| 9 | 全局否定（Axiom 1 在整个证明中从未被调用） | 通读 `15.06.md:9–11` | §4.2 |
| 15 | 全局排序（Thm 15.4 在书中的**首次**应用是 span） | 核 `15.06.md:5`／`:7–11`／`:19` 之间无其它应用 | §4.2 |
| 8 | 全局唯一性（非空性假设在整个证明中只承重一次） | 核出仅 `15.06.md:11` 用一次 | §4.2 |

四条经核**全部为真**，且四条**全部无法用一条 30–200 字符的子串见证**。
建议 SPEC 为这一型增设 `origin: model` 之外的第三档（如 `evidence_kind: exhaustive-scan` ＋ 扫描范围与命中计数），
否则生产者只有两条路：要么不收录这类真断言，要么把它伪装成有锚断言。

### 6.4 `SPEC.md:55` 只有两档，导致 **8 处 claim** 无处安放

规则只给「不要收录」与「标 `origin: model`」，没有「收录 ＋ 标注为推论 ＋ 挂关联锚点」的中间档。
本文件实测的结构性不可锚 claim（原文在指定源内**根本不写**该内容）：

行 4 末句（空集不是子空间，原文不讨论，§附录批 1）、行 38（指数加法律，15.07 全节不写，§5.1）、
行 43 末句（k+1 的紧性，Apostol 全节不讨论，§2.3）、行 49 claim 3（15.06/15.08 无此见证例，§3.8）、
行 52 claim 4（作者意图，§3.1）、行 73 末句（15.7(a)(b) 的证明在第 12 章，指定源内不可核，§3.9）、
行 74 claim 3（15.10 起的架构，在本节点 `sections` 之外，§3.5）、行 77 末句（作者意图，§3.6）。

其中 4 处（行 52 claim 4、行 74 claim 3、行 77 末句、行 4 末句）是**作者意图或章外架构**断言，
`origin: model` 能覆盖但生产者未逐句覆盖 —— 那是执行问题（§3.10）；
规则问题在于：**「真但不可锚」与「假」在 SPEC 里落进同一个桶**。

### 6.5 实测**不**构成阻碍的两条界（负面结果，同样要记）

- **30 字符下限：0 例真阻碍。** D2 全部 **77 条锚点**实测落在 **[40, 175]** 区间
  （最短 40 字符在行 12／`15.06.md`，最长 175 在行 32／`15.07.md`），无一条贴近下限。
  唯一一次「看似致命」是行 52 所缺的 `The empty set is independent.` = **29 字符，差 1 字符**，
  但加原文自带前缀成 `EXAMPLE 4. The empty set is independent.` = **40 字符**即合规（§3.1）。
  15.06–15.08 的公式行实测最短 **36 字符**（`15.06.md:24`），也在界内 ⇒ 下限对公式行同样不 binding。
- **3 槽上限：0 例已 binding，1 例潜在 binding。** 实测槽位使用 0 槽 4 个、1 槽 75 个、2 槽 1 个、3 槽 0 个（§1），
  **无一节点用满**。按「池跨多少个不同源行」做代理度量，76 个池非空节点的分布为
  1 行 64 个、2 行 9 个、3 行 2 个、**4 行 1 个** —— 唯一超过 3 的是
  行 34 `d:exponential-independence-proof-is-induction-on-n`（跨 `15.07.md` 的 4 个源行）。
  即：即使把射程补全，也只有这 1 个节点可能撞上槽位上限。

### 6.6 计数汇总

| 规则 | 判据 | 受影响单位 | 计数 |
| --- | --- | --- | --- |
| `:54` 不跨行 ＋ 显示公式独占行 | 锚点落在 15 条语法未闭合行之一 | 节点 | **17 / 80** |
| `:54` 长度 200 上限 | 单句 234 字符，整句不可引 | 节点 | **3**（行 20/21/22，含于上 17） |
| 无适配档位（量词结构） | 单条子串原理上不可见证 | claim | **4** |
| `:55` 只有两档 | 原文在指定源内不写该内容 | claim | **8** |
| `:54` 长度 30 下限 | 无一条锚点或候选串被卡住 | — | **0** |
| `:53` 最多 3 条 | 无节点用满槽位 | — | **0**（潜在 1：行 34） |

**去重后的节点级计数：17 个节点（21.3%）的证据不足至少部分由 SPEC 规则造成**；claim 级另有 12 处（4 ＋ 8）。

把这 17 个按 §5 的归档逐一对照（**这一步是必要的，否则会把规则致因与生产者致因重复计数**）：
**13 个同时被本报告判为须修**（批 1–4 片区待修 10 个：行 12、17、18、20、21、22、30、31、33、34；
实质缺陷 1 个：行 36；须补锚 2 个：行 49、76），
**2 个已被判 T1 自足**（行 26、35 —— 即半句锚点在这两处恰好够用，规则未造成实害），
**1 个指控已塌陷**（行 37，§5.2），**1 个附加保留**（行 38，§5.1）。
**两类成因叠加的那 13 个必须分别处理**：补锚治生产者侧，规则侧只能靠 SPEC 修订，
把补锚当成全部修复会让 `15.07.md:3` 那类超长定义句的问题在下一轮原样复现。

## 7. 其它维度顺带发现（不裁定）

### 7.1 证据池形状实测：T2 通道在本文件基本是空转

前面多处（§3 方法声明、§2.1、§2.3、§3.5、§3.6）都写了「T2 与 T1 逐字重复、新引入源行 0」。
这里把它一次量清，因为它决定了「四层池」这套复核在本文件到底能救回多少条指控。

D2 池总量实测 **261 条**（T1 **77** ＋ T2 **135** ＋ T3 **49**，TD 已排除），覆盖 **76/80** 个节点
（4 个池全空：行 42、54、72、73，§3.10）。

- **T2 的 135 条里，102 条（75.6%）与本节点自己的 T1 是完全相同的 `(file, quote)`**，
  另有 15 条与 T1 成子串/包含关系，**只有 18 条（13.3%）与 T1 无重叠**。
- **76 个有 T2 的节点里，52 个（68.4%）的 T2 全部是自身 T1 的逐字复制** —— 池从 1 条涨到 2、3 条，
  信息量一条没涨。这就是 §2.3 行 43「3 条全是同一句 72 字符引文」那种形状的普遍版本。
- 按任务书要求的正确度量（**新引入的源行数**，不是池条数）：**76 个池非空节点中 65 个（85.5%）的
  T2＋T3 一个新源行都没带进来**。只有 11 个节点带进了新源行，合计 **15 个新 `(file, line)`**：
  行 5（`15.06.md:11`）、行 7（`15.06.md:11`）、行 19（`15.08.md:17`）、行 25（`15.07.md:29`）、
  行 30（`15.07.md:17`）、行 31（`15.07.md:27`）、行 32（`15.07.md:31`）、
  行 34（`15.07.md:51`、`:54`、`:57`，3 行）、行 37（`15.07.md:54`）、
  行 68（`15.08.md:23`、`:25`）、行 69（`15.08.md:19`、`:25`）。

**这解释了为什么 D2 的塌陷率远低于 D3。** 塌陷需要池里有新东西，而 D2 的池 85.5% 是回声：
`n_partof_desc > 0` 的节点实测只有 **6/80**（行 5、7、34、37、69、72），
其中 T3 真有证据的只有 **4 个**（行 5：T3=19、行 7：T3=10、行 34：T3=18、行 37：T3=2；
行 69、72 有后代但后代无证据）⇒ **T3 通道对 95% 的节点根本不存在**。
落到结果上：§2.0 的三条塌陷里，两条（行 66、45）走 T2、一条（行 37）走 T3，
而行 37 恰是那 4 个 T3 有货节点之一 —— **不是运气，是结构决定的**。

### 7.2 `origin` 与性质标注的合规遗漏（4 处，均不判死）

- **行 38** `d:exponential-law-used-in-the-shift`：`origin` 字段实测为 `None`（既非 `source` 也非 `model`），
  而其核心断言在 15.07 内结构性不可锚（§5.1、§6.1）。同片行 42、49、54 都标了 `origin: model`
  ⇒ 属**生产者的标注遗漏**，不是内容问题。建议补 `origin: model` ＋ 说明。
- **行 63**：Apostol 把「空集独立」作为 **EXAMPLE（事实）** 陈述（`15.07.md:25`），
  节点却称之为 `convention`（约定）—— **轻度性质错标**（§3.3）。同一节点把「零空间维数为 0」
  称约定是对的（那确实是 Apostol 的约定），错的是把随之引用的 Example 4 也归成约定。
- **行 60** claim 3：说两个不等式「各由 Theorem 15.5 产生」**略有跳步** ——
  原文从「每 k+1 个元素相关」到「每**多于** k 个元素相关」还走了一步单调性推广
  （`Therefore, every set of more than k elements in V is dependent.`），15.5 本身只给 k+1。
  **轻度归因简化**，登记不判死。
- **行 4** 末句：「空集 vacuously 满足两条封闭公理却没有零元」是**模型补充的正确理由**，
  原文 15.06 不讨论空集不是子空间（`:19` 只定义 `L(∅)={O}`）。数学为真、不判形式 E，
  但建议在 `origin_note` 里点明这一句是补充理由（§附录批 1）。

### 7.3 六条轻度射程不足的补锚串（§2 点名转到本节，逐条给实测串）

均为「结论为真、锚点未覆盖某个前提或谓词」，锚点位都还有空槽，属低成本可修：

| 行 | 未被锚点覆盖的部分 | 建议补锚串（实测字符数） | 空槽 |
| --- | --- | --- | --- |
| 59 | 正向那一半 `m ≤ k` 落在同行更前处 | `Since T is an independent set, we must have $m \leq k$ .`（**56**） | 2 |
| 60 | claim 3 的 `m ≤ k` 那一半 | 同上（**56**） | 2 |
| 65 | 基的枚举未被覆盖，可引句就在同一行 | Example 2 全句含 `$\{1, t, t^2, \ldots, t^n\}$`（**153**） | 2 |
| 71 | 从 `L(S)` 到 `V` 的三个前提无锚（`origin: model` 已披露，减责） | 基定义 `15.08.md:3`（**110**） | 2 |
| 75 | 「基是集合、因而无序」这一前提无锚 | 基定义 `15.08.md:3`（**110**） | 2 |
| 76 | 锚点无一字提 spanning，而归因正是张成那一半 | 基定义 `15.08.md:3`（**110**） | 2 |

注意 71、75、76 三条**指向同一句** `15.08.md:3` —— 这句是 15.08 的基定义（实测整句 122 字符），
补完后它将成为 D2 内新的共享引文（形式 B 候选），须与 §7.4 一并交给形式 B 审查。

### 7.4 形式 B 完整实测：精确去重会漏掉包含关系，分片「形式 B 清零」的结论不成立

§3.5 已指出行 74 的 107 字符锚点是行 46 的 122 字符锚点的真子串（同为 `15.07.md:61`）。
这里给全量实测。口径：拿 D2 的 **77 条节点锚点**与**全图 921 条节点锚点**逐条比 `(file, quote)`，
既比精确相等，也比子串包含（`shared-quotes.tsv` 只做前者）。

| 关系 | D2 受影响节点数 | 其中配对方也在 D2 内 |
| --- | --- | --- |
| 与别的节点**精确共用**同一 `(file, quote)` | **23** | 4（行 16↔52、行 18↔49） |
| 与别的节点成**真子串/包含**关系 | **28** | 15 |
| 二者之一（**有共用风险**） | **48 / 76**（63.2%） | — |
| 完全孤立（无精确也无包含） | **28** | — |

**分片 59–80 的「20 条锚点无一与图内其它节点共用，形式 B 清零」经实测为假**：
该片 20 个有锚节点中，**10 个精确共用**（行 62、63、64、66、68、69、71、76、79、80）、
**9 个成包含关系**（行 59、60、61、62、67、70、71、74、75），**去重后 17/20 落在某种共用关系里**，
真孤立的只有 3 个（行 65、77、78）。

**但 23 条精确共用里绝大多数不是「借用」**：只有 4 个的配对方在 D2 内，
其余 19 个配对的是 `apostol:` / `x:` 的 L1 底座节点 —— 即 `d:` 细化节点与它所细化的底座条目引同一句，
**这是分层设计的预期结果，不是借用引文**。真正需要形式 B 审查的是 **D2 内部**的那 15 个包含关系，
典型两族：
- **行 47 ⊃ 行 50、行 47 ⊃ 行 48**（`15.08.md:3` 的 122 字符基定义句被切成 110／77／62 三个嵌套片段，
  一节点一子句）。**这一族不是 SPEC 逼的**——整句 122 字符在 200 界内，是建模选择，与 §6.2 的 234 字符句性质不同；
- **行 46 ⊃ 行 74**（同一句 122 字符，行 46 本地使用、行 74 拿去覆盖三条定理并外推，§3.5）。
  **只有这一族是真的借用并外推**，也是本文件唯一一处「包含关系掩盖了外推」的实例。

**方法结论**：包含关系检测是**可机械化**的（子串测试即可），
`shared-quotes.tsv` 的精确去重口径应补一列「与本条成包含关系的持有者」，否则形式 B 的召回率天然有缺口。

### 7.5 本报告自身的一处记账错（照 §背景 的要求同类必报）

§5.3 首行写「**实质缺陷（KILL 或含假断言）5 行**」，但紧随其后枚举了 **6 项**
（36、42、45、54、70、77）。按该节末尾的闭合式验算：31 ＋ 2 ＋ 47 = 80，
而 47 = 6（实质缺陷）＋ 18（须补锚）＋ 22（批 1–4 待修）＋ 1（行 72，其余零证据节点已计入前三类），
**闭合要求这一档是 6 不是 5** ⇒ **「5 行」这个标签数字错，枚举与总数都对**。
按只读纪律我不改 §5.3 原行，交主控串行修正（改 `5 行` → `6 行`，一字修）。

## 8. 方法反思：形式 D 可否机器化

**结论先行：不能整体机器化，但能把「机器筛」与「人核」的边界划得比现在清楚得多。**
本文件的全部数据都支持同一个判断：**机器能可靠地判定引文的形式属性，判不了引文与断言的支撑关系。**

### 8.1 现有机器校验的效力上限：实测为零相关

D2 的 **77 条锚点全部通过逐字子串校验**（两个分片各自用 Python `in` 复核、我按索引复核），
而本报告确认的缺陷**全部发生在通过校验之后**。逐字校验证明的是「引文未被生产者改写」，
它与「引文支撑该断言」之间**没有任何蕴含关系** —— 这正是锚点盲区五型的整体意思。
`verify_anchors.py` 的退出码更弱：它对 4 个空数组节点打印 `nodes with NO anchor: 4`
但**退出码仍为 0**（`:75` 是 `return 1 if failures or bad_json else 0`），只看退出码连合规缺口都发现不了。

### 8.2 实测**可**机械化的 7 项（本轮全部真跑过，不是设想）

| 检查 | 实现方式 | 本轮实测产出 |
| --- | --- | --- |
| 长度界 | `charlen` 与 30／200 比 | D2 全 77 条落在 [40,175]，两界均未 binding（§6.5） |
| `anchors==[] ⇒ origin=="model"` | 字段硬校验 | 4 个空数组节点全部合规（§3.10），可把「合规的空」与「漏填的空」分开 |
| **包含关系共用**（形式 B 召回缺口） | 子串测试，非精确去重 | D2 48/76 节点有共用风险，分片「清零」结论被推翻（§7.4） |
| 单行多句标记（过报通道 b） | `n_sentence_end > 1` | 15.06–15.08 的 130 行里 **36 行（27.7%）** 含多句，按行号比对必高报覆盖 |
| 超 200 单句标记 | 分句后测长 | 命中 4 处，其中 `15.07.md:3` 是 234 字符单句、定义句整句不可引（§6.2） |
| 语法未闭合的公式前置行 | 下一非空行为 `$$` 且本行无句末标点 | 15 行，牵连 **17/80** 节点（§6.1） |
| **池形状**：T2 是否为 T1 的回声 | 池内 `(file,quote)` 与 T1 比对；再折算**新引入源行数** | T2 的 75.6% 是 T1 逐字复制；85.5% 的节点新源行为 0（§7.1） |

最后一项最有价值：它把「四层池复核」这个昂贵动作变成**可预筛的**。
池里没有新源行的节点，复核必然维持指控 —— 本文件 65 个这样的节点无需人工再跑一遍池。

### 8.3 实测**不可**机械化的部分，以及它们各自的失败方式

- **D 型（覆盖范围不足）——本形式的主体，机器查不出来。** 它要求先把 statement 拆成 claim，
  再判每个 claim 的射程是否落在引文内。本文件确认的缺陷**无一例外**产生于「拆句 ＋ 回原文核射程」
  这一步之后（死因分布不止 D 型：行 36 是归因错、行 42 是数学错、行 70／77／54 是量词过度断言），
  但它们的**发现途径**全部相同 —— 没有一条是靠机器指标浮出来的。
- **A 型（归因错）伪装成通过。** 行 36 的锚点逐字无误、长度合规、池里有 2 条证据，
  但「严格性来自取最大」这个归因是错的（真来源是 distinctness，`15.07.md:39`）。
  **机器看到的一切指标都是绿的。**
- **节点间矛盾：既最易误报，也最需要全局视野。** 本文件 3 例同类指控里 1 例误报（行 45 vs 46，§2.2）、
  2 例成立（行 36 vs 39、行 70 vs 62）。更关键的是行 33 与行 21 的冲突
  （同一步 family-vs-set 混淆，一处判病态、一处当合法用）**只有在整文件视角下才看得见**，
  任何分片单独审都发现不了（§4.3）—— 这对**分片策略本身**是个警告，不只是对机器化。
- **作者意图与章外架构断言**：行 52 claim 4、行 74 claim 3、行 77 末句。机器无从判定，
  且 SPEC 目前也没有档位承载（§6.4）。

### 8.4 量词正则的精度实测：只能定向，不能结案

用 `\b(only|sole|solely|never|always|cheapest|first|single|nothing|every|all of)\b`
扫 80 条 statement，**命中 50 条（62.5%）**，逐条回原文核完判死因 1 的只有 **3 条**
⇒ **精度 3/50 = 6%**（§4.2）。召回侧也不干净：行 25、34 的最高级为假是靠回读原文发现的，
不是靠这个正则定位的。**这个信号的正确用法是排产顺序，不是判决依据。**

### 8.5 三条过报通道在本文件的实测频率

| 通道 | 机制 | D2 实测频率 |
| --- | --- | --- |
| (a) 内容下移到 part-of 后代 | T3 | **6/80** 节点有后代，其中 T3 真有货 **4/80**（§7.1）⇒ 95% 的节点用不上这条 |
| (b) 一源行含多句 | 按行号比对高报 | **36/130 行（27.7%）**含多句 ⇒ 覆盖率**必须按句粒度算** |
| (c) 同源行两半分落锚点与边 | T2 | **1 例**（行 66，`15.08.md:15` 是 233 字符三句行，79 字符归锚点、89 字符归 `edges-D2.jsonl:85`，§2.0） |

通道 (b) 的 27.7% 是本节最该被下一轮记住的数字：**任何按 `file:line` 做覆盖比对的脚本，
在本章的源文件上有超过四分之一的行会给出偏乐观的结果。**

### 8.6 给下一轮的分工建议

1. **机器先跑 §8.2 那 7 项**，产出：嫌疑清单 ＋ 每节点的池形状 ＋ 新引入源行数 ＋ 单行多句标记。
2. **人只做两件机器做不了的事**：把 statement 拆成 claim；判每个 claim 的射程。
   拆 claim 这一步不要交给机器 —— 本文件的每一处确认缺陷都产生于拆句之后。
3. **把「新引入源行数为 0」当作免复核条件**（本文件可省 65 个节点的池复核）。
4. **形式 B 的共用检测改为子串口径**，并给 `shared-quotes.tsv` 补「包含关系持有者」列。
5. **矛盾类指控必须在整文件（而非分片）粒度上跑一遍**，否则行 33 vs 21 那型冲突结构性地漏掉。
6. **覆盖率一律按句粒度报**，并在报告里写明该行 `n_sentence_end`，避免通道 (b)。

---

# 附录：逐批工作记录（防中断，按批次落盘）

## 批次 1（节点 1–8，15.06 子空间与 Thm 15.4）

- `d:subspace-nonempty-requirement` — **形式 D（轻）**。锚点只覆盖第一句（15.06 L3 定义中的 nonempty）。末句「it is what later supplies a witness element x from which the zero element and negatives are manufactured」的射程在 15.06 L11（`Let $x$ be any element of $S$ . (S has at least one element since $S$ is not empty.)` 及其后 `Taking a = 0` / `Taking a = -1`），锚点完全不触及。越界部分本身**数学正确且原文有据**，且节点仅用了 1/3 锚点额度，不构成 SPEC 缺陷。建议：补第二锚点（15.06 L11）。
- `d:subspace-inherits-the-operations-of-the-ambient-space` — 支撑充分。末句为解释性评注（structural part of V），非独立数学断言。
- `d:subspace-satisfies-all-linear-space-axioms` — 支撑充分。"all ten axioms" 与 15.06 L9/L11 对 Axioms 1–10 的引用一致；末句「Thm 15.4 reduces to the two closure axioms」有 L5 原文支持（未锚，但真）。
- `d:thm-15-4-hypothesis-nonempty-subset` — 支撑充分（末句为无锚模型评注但数学正确）。末句「the empty set satisfies both closure axioms vacuously yet has no zero element」原文**不讨论**空集不是子空间（15.06 L19 只定义 `L(∅)={O}`），属模型补充的正确理由，非形式 E（无错）。已记入第 7 节。
- `d:thm-15-4-sufficiency-direction` — 支撑充分。"the other eight axioms"（10−2 closure）与 L9 列举的 Axioms 3,4 + 7–10 + 5,6 = 8 相符；6/2 分组由子节点 6、7 承载锚点。
- `d:thm-15-4-identities-inherited-from-the-ambient-space` — 支撑充分。"four scalar multiplication axioms" = Axioms 7–10，正确；"universally quantified" 由锚点内 `because they hold for all elements of V` 直接支持。
- `d:thm-15-4-remaining-obligations-zero-and-negative` — 支撑充分。锚点逐字覆盖「仅剩两项义务」。
- `d:thm-15-4-witness-element-supplied-by-nonemptiness` — 支撑充分。末句「the single load-bearing use of the nonemptiness hypothesis in the whole proof」可由通读证明（15.06 L7–L11）核实：nonemptiness 仅在 L11 使用一次。

## 批次 2（节点 9–17，15.06 span / linear combination）

- `d:thm-15-4-closure-under-scalar-multiplication-is-the-active-axiom` — **形式 D**。锚点 `By Axiom 2, $ax$ is in $S$ for every scalar $a$ .` 只证明 Axiom 2 被用到；末句是一条**全局否定断言**「Closure under addition (Axiom 1) is never invoked in the proof of the sufficiency direction」。否定断言的射程覆盖整个 L9–L11，锚点是其中一个正面实例，逻辑上无法支撑。核对 L7–L11：a=0 得 O∈S；a=−1 得 (−1)x∈S；`x + (-1)x = O` 一步显式说明理由是 `since both $x$ and $(-1)x$ are in $V$`（即在 V 中做加法，不用 S 的封闭性）。**断言为真**，但需通读全证明才能判定，锚点射程不足。建议：补锚点 15.06 L11 `But $x + (-1)x = O$ since both $x$ and $(-1)x$ are in $V$` 以支撑否定断言的关键一步。
- `d:linear-combination-finiteness-of-the-index-set` — **形式 E（无锚从句，非错）**。末句给出「因为 bare linear space 只有二元加法、没有收敛概念，所以无穷和无定义」的**理由**，15.06 全节不含任何此类论述（原文只写 `finite linear combination`，从不解释为何要 finite）。理由为真但纯属模型补充；原文无可引之处，不可锚。不判死因。
- `d:linear-combination-summands-drawn-from-s` — **形式 D（轻）**。第一句含两半：x_i ∈ S（锚点覆盖）与 x 位于 ambient V（在 L13 `An element $x$ in $V$ of the form`，锚点不覆盖）。建议把 quote 前移或补第二锚点。末句为解释性评注。
- `d:linear-combination-coefficients-are-arbitrary-scalars` — **形式 D（跨文件未锚）**。末句的对比项「the dependence definition, which forbids all-zero coefficients」射程在 **15.07.md L3**（`not all zero`），本节点 3 条锚点额度只用了 1 条，却无 15.07 锚点。另：「forbids all-zero coefficients」表述偏紧——15.07 的 dependence 定义是「存在一组 not all zero 的系数使和为 O」，并非「禁止系数全为零」。建议补 15.07 锚点并收紧措辞。
- `d:span-is-a-subspace-via-the-closure-test` — **形式 D**。锚点覆盖「closure 检验 ⇒ 是子空间」。末句「the very first application of Theorem 15.4 in the book is to the span」是**全局排序断言**，锚点不可能支撑。核对：Thm 15.4 在 15.06 L5 首次出现，L7–L11 是其证明，L19 紧接就是 span，其间无其他应用 ⇒ 断言在 15.06 范围内为真。另注：锚点从句中截断，`satisfies the closure axioms` 的主语（`The set of all finite linear combinations of elements of S`）落在引文之外，单看锚点无法确认「谁」满足封闭性——治理力偏弱但不违 SPEC。
- `d:span-of-the-empty-set-is-the-zero-subspace` — **形式 E（无锚从句，非错）**。末句「Without this convention L(S) would be empty and would fail to be a subspace」为模型补充理由，原文无此论述。为真但依赖「空和不约定为 O」这一读法（Apostol 的 `\sum_{i=1}^{k}` 要求 k≥1，故成立）。不判死因。
- `d:spanning-set-is-not-unique` — **形式 D**。锚点止于 `spanned by each of the following sets of vectors:`，**三个集合本身与多项式例子全部落在锚点之外**（L21 `$\{i,j\}$ , $\{i,j,i+j\}$ , $\{O,i,-i,j,-j,i+j\}$`；L21+L24+L27 的三个多项式生成集）。statement 明确声称「three different sets ... and three different sets」，两个数字 3 都无锚点覆盖。核对原文：V_2 确为 3 个；degree ≤ n 多项式确为 3 个（`{1,t,...,t^n}`、`{1,t/2,...,t^n/(n+1)}`、`{1,(1+t),...,(1+t)^n}`）⇒ **计数为真**。仍用了仅 1/3 锚点额度。建议补锚点。末句「many-to-one relation」为评注（严格说应为「非单射」）。
- 支撑充分：`d:thm-15-4-zero-element-obtained-by-taking-the-scalar-zero`、`d:thm-15-4-negative-obtained-by-taking-the-scalar-minus-one`（两者锚点逐字覆盖全部断言）。

## 批次 3（节点 18–26，15.06 尾 + 15.07 dependence/independence 定义）

- `d:spanning-set-need-not-be-independent` — **形式 D（本批最严重的锚点治理失效）**。锚点是 `$\{i,j\}$ , $\{i,j,i+j\}$ , $\{O,i,-i,j,-j,i+j\}$ .` ——**三个集合字面量，无谓语、无断言**。statement 第一句断言「该集合 spans V_2」，而「spans」这个动词落在锚点之外（15.06 L21 前半 `the space $V_{2}$ is spanned by each of the following sets of vectors:`）。单看锚点，读者无法确认这些集合与 spanning 有任何关系。末句「why a basis needs a second clause」前指 **15.08 L3** 的 basis 定义（`if S is independent and spans V`），亦无锚。断言为真。建议：至少补 15.06 L21 前半与 15.08 L3。
  - 附带（形式 B 相邻现象，不裁定）：本节点与 `d:spanning-set-is-not-unique` 把 15.06 L21 **同一句话切成互补两半**各取其一——前者取谓语丢例子，后者取例子丢谓语。两者合起来才够，单独都不够。
- `d:spanning-set-may-be-infinite` — **形式 D（轻）**。第一句锚点逐字覆盖。第二句「Nothing in the definition of span forces S to be finite」的射程在 **L19 定义**（`The set of all finite linear combinations of elements of S`，finiteness 挂在 combination 上而非 S 上），锚点落在 L27 的例子处，不覆盖定义。仅用 1/3 额度。断言为真。
- `d:dependence-finiteness-of-the-witnessing-family` — **形式 D + 形式 E（均非错）**。「even when S is infinite」射程在 **15.07 L17** `However, the present definition is not restricted to finite sets.`，无锚。末句关于「no topology ⇒ 无穷和无定义」的理由与节点 12 同型：原文完全不作此论述，为模型补充，为真但不可锚。
- `d:dependence-distinctness-of-the-chosen-elements` — **形式 E（无锚从句，非错）**。锚点覆盖 distinctness 要求。末句反事实论证（去掉 distinctness ⇒ 取 x_1=x_2=x, c_1=1, c_2=−1 ⇒ 任何非空集都 dependent）经核验数学正确，但原文无任何此类反事实讨论，纯模型补充。
- `d:dependence-coefficients-not-all-zero` — **形式 E（第三句，需注意）**。前两句由锚点 `not all zero` 支撑。**末句**「The empty set is unaffected, because the witnessing family x_1, ..., x_k is understood to have k >= 1, so it has no witness either way」——`k >= 1` 这个约定原文**从未明言**（L3 只写 `say $x_{1}, \ldots, x_{k}$`）。该约定是结论成立的全部依据：若允许 k=0，空和为 O，去掉 not-all-zero 后连空集都会变 dependent。节点把一条**解释性补缺**当作教材既定事实陈述（"is understood to"）。与 L25 `EXAMPLE 4. The empty set is independent.` 不矛盾，数学上可辩护，但属无锚且含隐藏解释选择。建议：措辞降级为模型推断，或补 L25 锚点。
- `d:dependence-target-is-the-zero-element` — **形式 E（轻，含小失准）**。锚点为公式（33 字符，过下限）。末句「Replace O by an arbitrary target y and the condition ... describes membership of y in the span of S」不完全精确：dependence 定义同时带 distinctness 与 not-all-zero 两个约束，而 span 成员资格两者都不要求（全零系数给出 O，本已在 span 中）。对应关系是「近似」而非「即是」。无锚。
- `d:dependence-witness-must-be-exhibited-not-merely-counted` — **形式 D（轻，含小失准）**。锚点覆盖 Example 5 结论。「exhibit a single identity with **nonzero coefficients**」略微过强：定义只要求 not all zero；此例系数恰为 (1,1,−1) 全非零，故就本例无误，但作为「dependence proof 的实践形状」的一般描述失准。首句的方法论定性（"the practical shape of a dependence proof"）原文未作，无锚。
- `d:dependence-from-one-element-being-a-scalar-multiple-of-another` — **形式 E（确认为假的无锚从句）**。锚点逐字覆盖 Example 2 全文，第一句无问题。**末句**「This is **the cheapest** sufficient condition for dependence and needs only two elements of S」中的最高级**为假**，且反例就在锚点下方两行：**15.07 L23 `EXAMPLE 3. If $O \in S$ , then $S$ is dependent.`** 只需 **1** 个元素，比 Example 2 的 2 个更「便宜」。这是本批唯一一条**无锚且判定为不支撑**的从句，恰好落在末句。建议：删去 "the cheapest" 最高级（保留 "needs only two elements of S"，该部分为真），或判**死因 6**。
- `d:independence-universal-quantifier-over-choices` — 支撑充分。锚点 `for all choices of distinct elements ... and scalars` 直接支撑量词翻转。末句方法论评注（独立性证明须处理任意关系）无锚但由 L31 Example 6、L45 Example 7 的实际证明形态印证，为真。

## 批次 4（节点 27–35，15.07 independence / Examples 4,6,7）

- `d:independence-of-the-empty-set` — **形式 E（确认为不支撑，且与原文组织方式相悖）**。锚点 `EXAMPLE 4. The empty set is independent.` 只给出裸断言，第一句的**理由**（vacuity）为模型补充但正确。**末句**「This boundary case is what makes the zero space fit the basis machinery」**不成立**：Apostol 处理零空间恰恰**不**走「空集当基」这条路，而是两处**独立例外条款**——
  - 15.08 L3：`The space V is called finite dimensional if it has a finite basis, or if V consists of O alone.`
  - 15.08 L9：`If $V = \{O\}$ , we say V has dimension 0.`
  若 Example 4 真的「使零空间纳入 basis 机制」，这两条例外条款都是多余的；原文保留它们，说明作者并未依赖该路径。该从句无锚，且被原文结构反证。建议：删去末句或判**死因 6**。
- `d:exponential-independence-hypothesis-distinct-exponents` — **形式 E（末句论证含实质失准）**。锚点逐字覆盖 Example 7 的 distinctness 假设，第一句无问题。**末句**「If two exponents coincide the two functions are equal, hence dependent by the scalar-multiple criterion」在 Apostol 的**集合式** dependence 定义下站不住：若 a_i = a_j，则 e^{a_i x} 与 e^{a_j x} 是**同一个函数**，集合 S 里只有**一个**元素，而 Example 2 的 scalar-multiple 判据需要 S 中**两个不同**元素。集合 {e^{ax}} 是**独立**的（单个非零函数独立），并非 dependent。正确说法是：作为**列表/族**出现重复项时会退化，而 Apostol 的定义建立在 distinct elements 上，本就不接纳重复。
  - 内部张力（同文件两节点互相矛盾）：`d:dependence-distinctness-of-the-chosen-elements` 末句正是把「x_1=x_2=x, c_1=1, c_2=−1」这一 family-vs-set 混淆指认为**病态**（说明为何定义必须要求 distinct）；而本节点末句却把同一步当作**合法**推理来用。两者不可同时为真。
- `d:exponential-independence-proof-is-induction-on-n` — **形式 E（末句长句含错误断言）**。锚点覆盖 `induction on $n$` + base case + IH 设定；**elimination step 细节（a_M、乘 e^{-a_M x}、x→+∞）与 descent step 全部落在锚点之外**（15.07 L51–L57），节点自身 `atomic_reason` 也承认「Not atomic」。末句中——
  - 「it is what makes a_k − a_M strictly negative for k not M」：**为真**，对应 L57 `If $k \neq M$ , the number $a_k - a_M$ is negative.`（严格负需要 distinctness + a_M 最大）。
  - 「**Only** the elimination step uses the hypothesis that the exponents are distinct ... while **the recursion itself is independent of it**」：**不成立**。descent step 要对剩下 n−1 个指数函数调用归纳假设，而归纳假设本身的前提就是「n−1 个**互不相同**的指数」；必须先验证剩余族仍满足 distinctness 才能调用 IH。故 distinctness 在递归步同样被使用。这是一条无锚、且数学上错误的排他性断言（"Only"），落在末句。建议：删去 "Only ... independent of it" 一段或判**死因 6**。
- `d:zero-element-of-a-function-space-is-a-pointwise-identity` — **形式 D（锚点在关键载荷前截断）**。锚点 `A relation of the form $\sum c_{k} u_{k} = O$ means that` **以 "that" 结尾**，真正的载荷（L34 的 `\sum_{k=0}^{n} c_k t^k = 0` 与 L31/L37 的 `for all real $t$`）在引文之外，故「O 是处处为零的函数 / 关系式是对每个变量值成立的恒等式」这一核心断言未被覆盖。另，「When V is a space of real-valued functions」这一前提射程在 **L27** `In each case the underlying linear space V is the set of all real-valued functions defined on the real line.`，亦无锚。仅用 1/3 额度。末句两个技法描述（Example 6 代入 t=0 后反复求导；Example 7 乘 e^{-a_M x} 后令 x→+∞）经 L37、L51–L57 核对为真但无锚。
- `d:dependence-definition-not-restricted-to-finite-sets` — **形式 D（轻）**。锚点只覆盖 `not restricted to finite sets`；第一句前半「For finite S the definition agrees with the earlier one for V_n」射程在 **L17 前半句** `If S is a finite set, the foregoing definition agrees with that given in Chapter 12 for the space $V_{n}$ .`——就在锚点**紧前一句**却未纳入。仅用 1/3 额度。
- `d:independence-of-an-infinite-set-reduces-to-its-finite-subsets` — **形式 E（无锚理由，非错）**。锚点覆盖归约动作本身。末句理由「because every witnessing relation is finite」原文未述（属 L3 定义的 finiteness 子句），为真但无锚；节点 `atomic_reason` 已如实指出该依据是另一节点。
- `d:powers-independence-by-differentiating-and-evaluating-at-zero` — 支撑充分（末句为无锚方法论定性但为真）。锚点逐字覆盖三步系数提取。末句「analytic, not algebraic」原文未作此定性，但证明确实用到求导，为真。
- 支撑充分：`d:independence-vanishing-combination-forces-vanishing-coefficients`（锚点为 L12 蕴含式，逐字覆盖操作性核心；末句「every independence proof in the chapter actually verifies」为全局评注，在 15.07 范围内由 Example 6/7 印证）、`d:exponential-independence-base-case-n-equals-one`（base case 内容为模型补充，但末句 `Apostol calls this trivial and does not expand it` **如实声明**了这一点，是本批处理最诚实的节点）。
- 形式 B 相邻现象（不裁定）：`d:exponential-independence-base-case-n-equals-one` 的锚点 `The result holds trivially when $n = 1$ .` 完整包含于 `d:exponential-independence-proof-is-induction-on-n` 的锚点跨度之内。
