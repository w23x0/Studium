# 审查报告：形式 B（借用引文 / borrowed-quote）

**状态：已完成**（清单 9 组全部查完；另附召回率评估。未扩到 ≥3 次的 37 组，见第 9 节）

审查员：形式 B 专职审查员（独立作业，未读其它审查员输出）
输入清单：`report/_形式B-共享引文候选.md`（只读）
判法：对每组共享引文，先写引文**究竟断言什么**，再拆每个引用节点的 statement 为原子 claim，
逐个判断射程覆盖，最后核该节点是否另有锚点顶上。

---

## 1. 覆盖声明

**已查**：输入清单全部 **9 组**（被引用 ≥4 次的全部共享引文），
共涉及 **45 处引用、41 个不同节点**（`d:positivity-axiom-forbids-nonzero-self-orthogonal-elements`、
`d:strict-minimality-rests-on-positivity-of-the-norm`、`apostol:inner-product-axioms` 各跨两组，
故引用数 45 > 节点数 41）。每组均按"引文究竟断言什么 → 逐节点 claim 分解 → 缺口 → 是否另有锚点顶上"
四步走完，并回源文核对了引文的上下文位置。

**未扩到 37 组（≥3 次）**：9 组做扎实后，我把剩余预算用在了**方法论的召回率评估**上
（第 7 节），因为我在抽样中发现了一整类共享检测**结构性看不见**的 B 型
（`nodes-CX2.jsonl`，15 个节点），其价值高于再机械地过 28 组。这是我主动的取舍，如实声明。

**判定结果汇总**

| 类别 | 数量 |
|---|---|
| 组：判为全组合法复用 | **5**（组 3、5、6、7、8） |
| 组：含至少一处漂移/借用 | **4**（组 1、2、4、9） |
| 确认 B 型漂移（核心断言落空、无锚顶上）→ 死因 `6` | **3** 个节点 |
| B 型借用锚点（另有锚点顶上）→ 死因 `0` + 删该锚 | **2** 个节点（组 4、组 9 各 1） |
| B 型借用锚点（整批、门面型）→ 死因 `0` + 删该锚 | **5** 个节点（组 2 的 `cx-*`） |
| 归因于 SPEC 缺陷的锚点缺口 | **9** 处（见第 5 节） |
| 顺带发现的 E 型 | **2** 类、共 **20** 个节点（见第 4 节） |

**没有一个节点我建议因 B 型而判死（`6`）之外还需删除**——
3 个判 `6` 的节点问题在锚点，内容多数仍有价值，处置方式见各条建议。

---

## 2. 判为「合法复用」的组

清单的前提"共享引文多数是合法的"**在本次审查中得到确认**：9 组中 5 组全员合法，
另 4 组也各只有 1–5 处问题而非全组皆错。逐组一句话理由：

| 组 | 引文（略） | 为什么合法 |
|---|---|---|
| **3** | `AXIOM 6. ... the element $(-1)x$ has the property` | 引文的**措辞本身**是承重物：三个 D 层节点分别讨论"Apostol 指名 (-1)x 而非存在性量化"这一措辞选择及其后果，证据只能是公理原句；两个 A 层节点是该公理的直接持有者。5/5。 |
| **5** | `(x, x) > 0 \quad i f \quad x \neq O` | 正定性公理是第 15 章下游一大批结论的共同根，五个引用者分别是它本身、它在 15.11 分母非零处的应用、它的逆否形式、它在严格极小性中的作用、以及公理组源节点——**同一公理被它的五种合法用途引用**。5/5。 |
| **6** | `The zero element is orthogonal to every element of V; it is the only element orthogonal to itself.` | 引文是**分号连接的双断言**，前半被两个节点用、后半被两个节点用、源节点用整句——**一句两半各有其主**，是共享的最正当形态。5/5。 |
| **7** | `(2) $(x,y + z) = (x,y) + (x,z)$ (distributivity, or linearity).` | 公理(2) 在三个引用者中都处于**推导链的中间一环**（第一格加性的导出、S⊥ 封闭性、公理本身），不是装饰。4/4。 |
| **8** | `DEFINITION. In a Euclidean space V, the nonnegative number $\|x\|$ defined by the equation` | 范数定义句被四个节点引用，其中两个用它**夹住不可引的展示方程**、一个用它的"缺少 real 一词"作对照、一个是记号节点。**引文的每一次复用都在利用它的不同侧面**。4/4。 |

组 8 里 `d:angle-defined-only-in-real-euclidean-space` 的用法值得单独一提：
它引用范数定义句，**利用的是引文里没有 "real" 这个词**——
以此对照角的定义句里有 "real"。引文的价值在其**沉默**而非其断言。
这类用法机器绝无可能判定，也提醒共享列表的读者不要按"引文是否重复断言 statement"来机械判断。

---

## 3. 确认的 B 型漂移实例

分两级：**3.1 是真漂移（核心断言落空且无锚顶上，死因 `6`）**；
**3.2 是借用锚点（另有锚点顶上，死因 `0` + 删该锚）**。
第 5 节列出的 SPEC 所致缺口**不重复计入本节**。

### 3.1 真漂移（死因 `6`）——3 个节点，全部来自组 1

三者共享同一条引文：
`15.03.md :: The set of all polynomials of degree equal to n is not a linear space because the closure axioms are not satisfied.`
**引文断言**：该集合不是线性空间；理由归于封闭性公理（复数、未点名哪一条、未说明机制）。

**(1) `d:degree-exactly-n-fails-axiom-2-at-the-scalar-zero`**（`data/nodes-D1.jsonl` 第 69 行）

- claim 分解：(a) 0p 是零多项式；(b) 零多项式无 n 次故在集合外；
  (c) **故 Axiom 2 在标量 a=0 处失败**；(d) 该失效无见证依赖的逃逸，对每个成员都发生。
- 缺口：(a) 是模型自算；(b) 不在引文内；(c) **点名 Axiom 2，而原文未点名任何一条，
  且原文自举的唯一例子是加法方向（Axiom 1）**；(d) 的对照项引用的是原文 `need not` 那句，
  但该句不是本节点的锚点。节点的**全部特有内容**都在射程外。
- 另有锚点顶上？**无，这是唯一锚点。**
- 死因建议：**`6`**。
- 补救：Axiom 2 全文（15.02.md 第 9 行，170 字符，长度合规）**可引而未引**。补上即可救活。
  **本条不属 SPEC 所致。**

**(2) `d:degree-exactly-n-has-no-zero-element`**（`data/nodes-D1.jsonl` 第 70 行）

- claim 分解：(a) O 的唯一候选是零多项式；(b) 它被"次数恰为 n"排除；
  (c) **故 Axiom 5 无见证、Axiom 6 失去对象**；(d) 该集合不只违反封闭性，还违反加法公理。
- 缺口：引文唯一覆盖的是 (d) 中的插入语"which is the reason Apostol gives"——
  **即锚点只覆盖了该节点用来作对照的背景，不覆盖它自己的论点**。
  且 Axiom 5/6 属**加法公理组**，与引文的**封闭性公理组**是不同公理组，
  故非"锚点较粗"而是"锚点谈的是另一件事"。
- 另有锚点顶上？**无。**
- 死因建议：**`6`**。
- 注意：该节点 `atomic_reason` 自陈「书中未点明,属模型补充」——
  **生产者知道自己超出原文，但锚点没有反映这一点**。这正是 B 型的危害所在：
  锚点让读者以为 (c) 是 Apostol 说的。
- 补救：Axiom 5 全文（85 字符）与 15.03 括号句
  `(Whenever we consider this set it is understood that the zero polynomial is also included.)`（91 字符）均可引。
  唯 `x + O = x` 方程本身受下限阻挡，故本条**部分**受 SPEC 影响。

**(3) `d:for-function-spaces-closure-is-the-only-real-content`**（`data/nodes-D1.jsonl` 第 62 行）

- claim 分解：(a) **逐点运算律自动成立，故判定函数集合是否线性空间就等于问它是否对逐点运算封闭**；
  (b) Examples 5–12 每次成败都由这一问题决定；(c) Apostol 恰在三处失败处点名 closure axioms。
- 缺口：引文只覆盖 (c) 的**三分之一**（它是三处之一），
  完全不触及承重的方法论断言 (a)，也不支撑全域断言 (b)。
- 另有锚点顶上？**无，这是唯一锚点。**
- 死因建议：**`6`**，但**强烈建议改锚而非弃用**——
  这是一个好的综合节点，`The reader can easily verify that each of the following sets is a function space.`
  （81 字符，15.03.md 第 18 行）直接支撑 (a) 的"自动成立"语气，应作 anchors[0]，
  本引文降为 anchors[1] 支撑 (c)。
- 附核：(c) 的"恰好三处"我核过——Example 7、11、12，**为真**。该主张虽只有 1/3 有锚，但不假。

### 3.2 借用锚点（死因 `0` + 建议删该锚）——7 个节点

**(4) `d:positivity-axiom-forbids-nonzero-self-orthogonal-elements`**（`data/nodes-D4.jsonl` 第 15 行）
的 **anchors[1]** = `15.10.md :: (b) $\| x\| >0$ if $x\neq O$ (positivity).`

- 该节点 statement **从头到尾没有出现"范数"**，三个 claim 全部只涉及内积 (x,x)。
  而 anchors[1] 是 Theorem 15.9(b)，**一条关于范数 ‖x‖ 的定理**。
  引文既不支撑任何 claim，也不在论证链上。
- 另有锚点顶上？**有——anchors[0] 正是内积正定性公理，恰是 claim 的主语，完全承重。**
- 死因 **`0`**，删 anchors[1]。
- **这是 B 型最典型的形状**：同名概念（positivity）在公理层与定理层各有一句，
  节点只需公理层那句，却把两句一并挂上。**组 4 与组 5 交叉给出了干净对照：
  同一节点，一条锚承重、一条借用。**

**(5) `d:equality-holds-exactly-when-t-equals-s`**（`data/nodes-D4.jsonl` 第 52 行）
的 **anchors[1]** = `15.15.md :: for all $t$ in $S$ ; the equality sign holds if and only if $t = s$ .`

- 该节点 anchors[0]（15.15.md 第 23 行证明句）**已同时包含不等式、非负性与等号条件**，
  三个 claim 全部落在 anchors[0] 射程内。anchors[1] 不提供任何额外支撑。
- 缺口性质是**冗余**而非错配——危害低于 3.1 各条，故标为**边缘**。
- 另有锚点顶上？**有，anchors[0] 独力足够。** 死因 **`0`**，anchors[1] 可删。

**(6)–(10) 组 2 的五个 `apostol:cx-*` 节点**（`data/nodes-A2-x2.jsonl` 第 2–6 行）
的 **anchors[1]** = `15.12-exercises.md :: In each case, determine whether $(x, y)$ is an inner product for $V_{n}$ if $(x, y)$ is defined by the formula given.`

节点：`cx-absolute-value-in-second-slot-breaks-symmetry`、
`cx-root-of-sum-of-squared-products-breaks-linearity`、
`cx-absolute-value-of-the-dot-product-breaks-homogeneity`、
`cx-polarization-formula-is-twice-the-dot-product`、
`cx-product-of-coordinate-sums-is-degenerate`。

- **引文是一条祈使句**，命题内容仅为"Exercise 1 提出了这个问题"。
  它不断言任何公式是或不是内积、不断言任何公理成立或失败、不断言任何见证元。
  **一条疑问句的射程止于"问题被提出"，无法延伸到"答案是什么"**——
  这不是锚点略粗，而是**语气类型不同**（interrogative vs. assertoric）。
- 直接回答委派方的提问：**不能**。这句指令不能支撑
  「∑x_i|y_i| 不是内积，因为绝对值只加在第二个因子上破坏了对称性」。
- 另有锚点顶上？**anchors[0] 是各自的公式行，是真锚点，但只撑住主语（在说哪个公式），
  撑不住谓语（是/不是内积、哪条公理、见证元）。**
- 死因 **`0`** + 删 anchors[1]。**我不建议因 B 型杀这五个节点**——
  它们的数学我逐个验算全部正确（详见附录组 2），杀掉会误伤。
- 但删掉借用锚点后，五节点核心断言变为**完全无原文支撑**：
  Exercise 1 在源文件中**没有解答**（152 行全文 `grep -i answer` 零命中）。
  **这是 E 型，见第 4 节。** 失败在 **provenance 而非 correctness**，这个区分决定处置方式。

---

## 4. 顺带发现的 E 型（无锚从句 / 模型自算）实例

委派方要求"若是模型自己算的，那是 E 型，也要登记"。我发现的不是零散实例，
而是**两整批同构的习题解答节点**。

### 4.1 `nodes-A2-x2.jsonl` 的内积习题解答（组 2 的 5 个节点）

**源文本事实**：`15.12-exercises.md` 共 152 行，Exercise 1 在第 3 行提问，
第 5–24 行是五个候选公式，第 26 行进入 Exercise 2。**文件内不存在任何解答。**

因此以下断言 **100% 来自模型演算**，原文一字未提：

| 节点 | 模型自算的断言 | 我的验算 |
|---|---|---|
| `cx-absolute-value-in-second-slot-breaks-symmetry` | 对称性破（n=1, x=−1, y=1）；正定性也破（(x,x)=−1） | **正确** |
| `cx-root-of-sum-of-squared-products-breaks-linearity` | 对称、正定成立；加性不成立；只绝对齐性 (cx,y)=|c|(x,y) | **正确** |
| `cx-absolute-value-of-the-dot-product-breaks-homogeneity` | 齐性对负标量失效；加性失效（n=1, x=1,y=1,z=−1 → 0 vs 2） | **正确** |
| `cx-polarization-formula-is-twice-the-dot-product` | 展开得 2∑x_iy_i；正倍数仍是内积；**答案是"是"** | **正确** |
| `cx-product-of-coordinate-sums-is-degenerate` | n≥2 正定性失效（x=(1,−1,0,…)）；n=1 退化为真内积 | **正确** |

**登记要点**：这批节点的问题**不是错误，是出处**。
数学全对，但锚点（公式行 + 习题指令）让读者以为诊断出自 Apostol。
处置建议：若 SPEC 允许习题解答类节点，应按 SPEC 第 「找不到可逐字引用的依据 ⇒ ... 标 `origin: model`
并如实说明」条款**标 `origin: model`**；这五个节点目前**都没有标**。
（对照：同文件的 `d:*` 层有节点主动标了 `origin: model`，见 4.3，说明这个机制是团队已知且在用的。）

### 4.2 `nodes-CX2.jsonl` 的反例习题解答（15 个节点）——**共享检测完全看不见的一批**

这是本次审查在方法论上最重要的发现，详见第 7 节。

**源文本事实**：`15.05-exercises.md` 的总指令为
`In Exercises 1 through 28, determine whether each of the given sets is a real linear space, ...
For those that are not, tell which axioms fail to hold.`——**同样只出题不给答案**
（`15.05-exercises.md` 与 `15.09-exercises.md` 的 `grep -i answer` 均为 0 命中）。

而 `nodes-CX2.jsonl` 的 15 个节点中，**12 个**的 statement 含 "fail"，
点名具体公理的次数统计为：Axiom 1×10、Axiom 2×4、Axiom 3×4、Axiom 4×2、Axiom 5×5、Axiom 6×8、Axiom 9×3。
样例（全部为**唯一引文**，故不在我的输入清单里）：

- `apostol:cx-inhomogeneous-endpoint-condition-breaks-closure`：断言 Axiom 1、2、5 各自如何失败，
  并给出具体见证函数 f(x)=x、g(x)=x、2f。锚点只有习题条目
  `5. All $f$ with $f(1) = 1 + f(0)$ .` 与范围说明句。
- `apostol:cx-increasing-functions-fail-under-negative-scalars`：断言 Axiom 2 与 Axiom 6 在 f(x)=x 上失败。
  锚点只有 `6. All step functions defined on [0, 1]. 11. All increasing functions.` 与范围说明句。
- `apostol:cx-affine-line-missing-the-origin`：断言 Axiom 5 直接失败、Axiom 1 在
  (1/3,0,0) 与 (−1,1,0) 处失败、Axiom 2 在 2(1/3,0,0) 处失败。锚点只有两条习题条目。
- `apostol:cx-degree-exactly-k-inside-p-n-still-fails-closure`：断言 Axiom 1 在 t^k 与 1−t^k 处失败。
  锚点是 `15.09-exercises.md` 的两条习题条目。

**这批与 4.1 是同一失败机制**（模型解题、锚点只锁定题目），
但**每个节点引的是不同的习题条目，引文互不重复，因此共享检测对它们完全静默**。
我只在做召回率抽样时偶然撞见。

一个细节佐证这不是我过度解读：
`apostol:cx-union-of-two-coordinate-planes-fails-additive-closure` 的 anchors[1] 正是
`For those that are not, tell which axioms fail to hold.`——**它把总指令挂上了**，
形状与组 2 的五个节点一模一样。**该批中只有它这么做**，其余 14 个连指令都没挂。
换言之：若 CX2 的 15 个节点都像它那样挂总指令，
共享检测就会把它们全抓出来（一句指令 ×15 次引用，稳居清单首位）。
**是"生产者没有统一挂门面引文"这一偶然，让整批 E 型逃过了机械检测。**
这个观察对评估检测手段的可靠性很关键：**该检测能否发现问题，取决于生产者的锚点习惯，
而不取决于问题是否存在。**

### 4.3 已如实自我披露的模型推断（**不算缺陷，记为正面对照**）

审查中遇到若干节点主动声明自己超出原文，处理是对的，登记以示区分：

- `d:axiom-10-is-derivable-from-apostols-form-of-axiom-6`：statement 首句即
  `Apostol does not remark on this; the derivation below is not in the text.`
  我验算其推导正确（Axiom 9 + Theorem 15.3(a) + Axiom 6，用 Axioms 3,4,5,6,9），
  并核了不循环（Theorem 15.3(a) 的原文证明用 Axiom 9/6/4，**不含 Axiom 10**）。
- `d:15-11-denominator-nonzero-by-positivity`：statement 含 `Apostol does not remark on it`。
- `d:normalized-element-has-norm-one`、`d:s-perp-closure-follows-from-linearity-in-the-first-argument`：
  `atomic_reason` 明写 `教材未写出这一步,故标 origin: model`。
- `d:norm-definition-as-square-root`：`atomic_reason` 明写
  `the display line itself is only 26 characters, so the surrounding sentence carries the anchor`。

**这四类披露证明团队有正确的处理范式；4.1 与 4.2 的问题是这个范式没有被贯彻到 A2/CX2 批次。**

---

## 5. 由 SPEC 短公式不可引导致的 B 型（单独计数）

**这一节判 SPEC 的错，不判生产者的死。**

### 5.1 实测：哪些核心公式被下限挡在门外

SPEC 锚点规则（`SPEC.md` 第 54 行）要求 `quote` **长度 30–200 字符、不跨行**。
我逐条量了第 15 章的关键公式（`tmp_b_len.py` / `tmp_b_len2.py`，已删）：

| 公式 | 字符数 | 可引？ |
|---|---:|---|
| Axiom 6 `x + (- 1) x = O.` | **16** | ✗ |
| Axiom 7 `a (b x) = (a b) x.` | **18** | ✗ |
| Axiom 8 `a (x + y) = a x + a y.` | **22** | ✗ |
| Axiom 9 `(a + b) x = a x + b x.` | **22** | ✗ |
| 内积公理(3) `(3) $c(x,y) = (cx,y)$` | **21** | ✗ |
| 范数定义式 `\| x \| = (x, x) ^ {1 / 2}` | **26** | ✗ |
| 逐点加法 `(f + g) (x) = f (x) + g (x)` | **27** | ✗ |
| Theorem 15.16 主不等式 `\| x - s \| \leq \| x - t \|` | **25** | ✗ |
| Theorem 15.9(a) `(a) $\| x\| = 0$ if $x = O$ .` | **29** | ✗ **差 1 字符** |
| Axiom 5 `x + O = x \quad f o r a l l x i n V.` | 36 | ✓ *侥幸* |
| 内积公理(4) `(x, x) > 0 \quad i f \quad x \neq O` | 35 | ✓ *侥幸* |
| Theorem 15.9(c) `(c) $\| cx\| = |c|\| x\|$ (homogeneity).` | 40 | ✓ |

**两条"侥幸"值得注意**：Axiom 5 的 36 字符是 OCR 把 "for all x in V" 拆成
`f o r a l l x i n V.` 撑出来的；内积公理(4) 的 35 字符靠 `\quad i f \quad`（"if" 被拆成 `i f`）。
**若 OCR 输出正常，这两条也会阵亡**（分别约 10 与 22 字符）。
即：第 15 章核心公式的可引性，部分取决于 OCR 噪声的多少——这本身就说明**下限规则与本语料不匹配**。
`Theorem 15.9(a)` 的 **29 字符差 1 个字符**更是刺眼。

### 5.2 由此产生的锚点缺口（9 处，逐条）

**成因 A：定义/公理句在"…the property / …the equation"处被迫截断**（引文语义不完整）

1. `d:axiom-6-existence-of-negatives`（唯一锚点）：statement 首句
   `For every x in V the element (-1)x satisfies x + (-1)x = O`，
   **等号右边的 O 无锚可依**——引文在 "has the property" 处停止，方程 16 字符不可引。
2. `apostol:norm-notation`：statement 的 `||x|| = (x, x)^(1/2)` 无锚——
   定义句被截断且该节点未取闭合句 `is called the norm of the element $x$ .`。
   （对照：`d:norm-definition-as-square-root` 与 `apostol:norm` 用"前半+后半夹住方程"的手法绕过了，
   证明此缺口**可缓解但不可消除**——方程本身始终引不到。）
3. `apostol:theorem-15-16-approximation-theorem` 及组 9 全体：主不等式 25 字符不可引，
   四个节点只能靠散文 `Then the projection of x on S is nearer to x than any other element of S.` 代替。
   **组 9 的高共享（一句尾句被 4 个节点引）直接源于此**：
   唯一性条件只有那一句可引，谁要谈唯一性就只能引它。

**成因 B：锚点上限 ≤3 条，而节点 statement 覆盖 4 个以上条目**

4. `apostol:axioms-for-addition`：statement 覆盖 Axioms 3–6 四条，只能挂 3 条锚
   → **Axiom 5 完全无锚**，而 statement 明写 "there is a zero element O with x + O = x"。
5. `apostol:inner-product-axioms`：statement 列四条公理，挂了元陈述句 + 公理(2) + 公理(4)
   → **公理(1)(3) 无锚**。其中公理(1) 49 字符（属配额问题），公理(3) **21 字符（属下限问题）**。
   **同一节点上两种成因叠加。**
6. `apostol:theorem-15-9-properties-of-norms`：statement 列 (a)(b)(c)(d) 四项，挂定理头 + (b) + 前置句
   → **(a)(c)(d) 无锚**。其中 (a) **29 字符，差 1 字符卡在下限外**；(c) 40、(d) 57 字符属配额问题。
7. `d:s-perp-closure-follows-from-linearity-in-the-first-argument`：三锚已满（15.14 习题句 + 公理(2) + 公理(1)），
   而 statement 还点名了 homogeneity（**公理(3)，21 字符不可引**）与子空间判别法（Theorem 15.4）。
8. `d:additivity-in-first-argument-derived`：statement 称对称性公理(1) 是 load-bearing 但未锚它——
   第三锚位给了三角不等式展开式。公理(1) 49 字符本可引，**属配额取舍而非下限**。
9. `apostol:theorem-15-15-orthogonal-decomposition`（抽样中遇到，非清单内）：
   statement 断言 "the norm of x obeys the Pythagorean formula"，
   但两条锚都在定理陈述前半，**勾股公式（47 字符，可引）未锚，且第三锚位空着**——
   这一处**不能归 SPEC**，是纯粹的锚位未用尽，如实分开记。

### 5.3 结论：SPEC 缺陷把"B 型"从粗心重新归因为规则缺陷——但只能解释一部分

**能归 SPEC 的**：8 处（上表 1–8）。机制是委派方预判的那个：
**想引的方程引不了，只能退而引附近那句散文，而那句散文常已被别的节点占用**。
组 3（Axiom 6，5 节点共享）、组 8（范数定义句，4 节点共享）、组 9（15.15 尾句，4 节点共享）
**三组的高共享度都直接由此产生**——9 组中有 3 组的共享是 SPEC 逼出来的，
这三组我全部判为合法或边缘，**没有一个生产者该为此挨死因**。

**不能归 SPEC 的**：第 3.1 节的三条真漂移。理由已逐条给出——
Axiom 2 全文 170 字符、Axiom 5 全文 85 字符、`The reader can easily verify...` 81 字符，
**都长度合规、单行可引、而未被引用**。第 3.2 节组 2 的五条借用同样不能归 SPEC：
五条公式行都远超下限且已被正确引用，引不到的是**答案**，而答案在原文中根本不存在
（源文本无解答 ≠ SPEC 长度下限，是两个不同成因）。

**给 SPEC 的建议**（超出我的裁量，仅供参考）：
下限 30 字符对散文合适，对**展示公式行**不合适。
可考虑：展示公式行豁免下限，或允许"定义句 + 紧邻公式行"作为一条跨行锚点（现规则明禁跨行），
或把锚点上限从 3 条放宽给列举型节点。第 5.2 节的 8 处缺口中有 5 处（4、5、6、7 与部分 2）
只要放宽上限就能消除。

---

## 6. 「原文未逐条点名、节点逐条点名」实例

委派方的第二个陷阱经核实**成立**，且范围比 15.03 一处大得多。

### 6.1 15.03 的情形（委派方指出的那处）——核实结果

**原文说了什么**：15.03.md 第 25 行，Apostol 的全部理由是
`because the closure axioms are not satisfied`——**复数、不点名**。
紧接一句给了加法方向的例子（`the sum of two polynomials of degree n need not have degree n`），
**这是他给出的唯一机制说明，且只涉及 Axiom 1 方向**。

**节点逐条点名的情形**：

| 节点 | 点名了什么 | 原文给的还是模型推的 |
|---|---|---|
| `d:degree-exactly-n-fails-axiom-2-at-the-scalar-zero` | **Axiom 2 在 a=0 处失败** | **模型推的**。原文未点名任何公理；且原文自举的例子是加法方向（Axiom 1），与此节点谈的公理**不是同一条**。 |
| `d:degree-exactly-n-has-no-zero-element` | **Axiom 5 无见证、Axiom 6 失去对象** | **模型推的**，且更远——Axiom 5/6 属加法公理组，**根本不在原文所说的"封闭性公理"范围内**。 |
| `d:degree-exactly-n-is-not-a-subspace-of-degree-at-most-n` | 未点名具体公理，只援引 Theorem 15.4 | **原文给的**（Theorem 15.4 已锚）。合法。 |
| `d:degree-exactly-n-is-not-a-linear-space` | 只说"Apostol 把失败归于封闭性公理" | **原文给的**，措辞与原文同样粗。**这是正确的做法。** |

**判断**：前两个节点的逐条点名是**模型推断**。两者的数学我核过：
0p 确为零多项式确实不在集合内（Axiom 2 在 a=0 失败为真）；
零多项式确为 O 的唯一候选且被排除（Axiom 5 无见证为真）。
**所以它们是"好节点"——推断正确、有教学价值。**
问题正如委派方所言：**锚点让人以为这是原文断言的。**
处置建议：内容保留，锚点补上可引的公理全文，并标 `origin: model`
（SPEC 已有此机制，且团队在 D 层其它节点上用过——见 4.3）。

`d:degree-exactly-n-is-not-a-linear-space` 提供了一个内部对照：
**它面对同一句引文，选择了与原文同样粗的措辞，因此完全合法。**
这说明"要不要逐条点名"是可选的，而选了点名就该补锚。

### 6.2 更大范围的同型问题（机械筛出，非清单内）

我写了个筛子（`tmp_b_shape.py`，已删）在**detector 看不见的 238 个 solo 节点**中找同一形状：
*statement 点名了具体的 Axiom N / Theorem 15.N，而没有任何锚点提到那个编号*。

结果：**45 个 solo 节点点名了具体编号，其中 39 个的锚点不含该编号（39/45 = 87%）。**

这 39 个**不能一概判为缺陷**，须分三类（我逐个看了前 14 个）：

**(i) 合法：点名的是"本节点自己就是那条公理"**——如
`d:axiom-3-commutative-law-for-addition` 的锚点是 Axiom 3 全文，
statement 里额外点名的 Axiom 5 与 Theorem 15.1 是**说明该公理的下游作用**（commentary）。
`d:axiom-4-associative-law-for-addition`、`d:axiom-8-*`、`d:axiom-9-*` 同理。
这类的"缺编号"是筛子的假阳性。

**(ii) 合法但值得注意：原文行为的忠实记录**——如
`d:proof-a-cancel-by-adding-the-negative-of-z`，statement 明写
`the text performs it in one line without naming these axioms`——
**节点自己声明了"原文没点名、是我点的"**。这是 6.1 那两个节点本该采取的做法。

**(iii) 真问题：习题解答类，即第 4.2 节的 CX2 批次**——
`cx-inhomogeneous-endpoint-condition-breaks-closure`（点名 Axiom 1、2、5）、
`cx-increasing-functions-fail-under-negative-scalars`（Axiom 2、6）、
`cx-integral-inequality-breaks-the-scalar-axioms`（Axiom 2、6）、
`cx-union-of-two-coordinate-planes-fails-additive-closure`（Axiom 1）、
`cx-affine-line-missing-the-origin`（Axiom 1、2、5）、
`cx-degree-exactly-k-inside-p-n-still-fails-closure`（Axiom 1）等。
**这些点名全部是模型推的**——`15.05-exercises.md` 与 `15.09-exercises.md` 只有题目
（总指令原话就是 `For those that are not, tell which axioms fail to hold.`），**没有答案**。

**结论**：委派方指出的"逐条点名"问题在 15.03 处成立（2 个节点），
但它的**主要聚集地不是 15.03，而是习题批次（A2-x2 与 CX2，共 20 个节点）**。
15.03 那两个节点是这个问题在正文批次里的少数实例；
习题批次里它是**系统性的**，因为习题的性质就是"问哪条公理失败"，
而答案从不在书里。

---

## 7. 方法反思：共享这条机械线索的召回率上限

委派方要求如实评估，并给了 `check_unanchored_numbers.py` 召回 1/4 的先例。
我的结论是：**这条线索的精确率不错，召回率很差，而且它的失效方式比 1/4 那个先例更麻烦——
它的盲区不是随机的，而是与生产者的锚点习惯系统相关。**

### 7.1 覆盖面的机械事实

我统计了全图（`tmp_b_recall.py`，已删）：

| 指标 | 数值 |
|---|---|
| 节点总数 | 522 |
| 锚点引用总数 | 921 |
| 不同 `(file, quote)` 对 | 708 |
| 锚点数分布 | 0 条: 4 / 1 条: 196 / 2 条: 241 / 3 条: 81 |
| **所有锚点均为唯一引文的节点（detector 完全静默）** | **238（45.6%）** |
| 触及 ≥2 次共享引文的节点 | 280 |
| 触及 ≥3 次共享引文的节点 | 113 |
| 触及 ≥4 次共享引文的节点（≈本次输入清单范围） | 42 |

**上限的第一层是纯算术的**：清单（≥4 次）覆盖 42/522 = **8%** 的节点；
扩到 ≥3 次覆盖 113/522 = **22%**；即使把阈值降到 ≥2 也只覆盖 280/522 = **54%**。
**近一半节点（238 个）无论怎么调阈值都进不了这份清单**，因为它们的每条锚点都只被自己引用。

**上限的第二层更严重**：921 次引用中有 196 个节点只挂 1 条锚。
单锚节点若那条锚是借来的，**没有"另有锚点顶上"可言，也没有兄弟节点与它共享**——
这类最严重的情形（第 3.1 节的三条真漂移全部是单锚节点）**恰好最难被共享检测发现**。
组 1 那三条是靠"该引文同时被另外四个节点引用"这个**偶然**才进了清单的：
引文的正主 `d:degree-exactly-n-is-not-a-linear-space` 与源节点
`apostol:polynomials-of-degree-exactly-n` 合法地引了它，把引用数抬到 7，
才带出了三个漂移者。**若那三个节点各自引了不同的邻近散文，它们全都逃逸。**

### 7.2 一个实证的逃逸案例（本节的主要产出）

委派方问："B 型有多少是共享检测抓不到的（例如两个节点引了不同引文，但其中一个的引文其实是借来的）？"
我找到了**一整批**，不是零星个例：

**`nodes-CX2.jsonl` 的 15 个节点**（详见第 4.2 节）与组 2 的五个 `cx-*` 节点
**是同一失败机制**：模型解习题，锚点只锁定题目、不支撑答案。
组 2 进了清单，因为那五个节点都挂了同一句总指令（6 次引用，清单第 2 位）。
CX2 那 15 个**没进清单，因为它们各自引不同的习题条目，引文互不重复**。

**判别性证据**：CX2 中**恰好有一个**节点
（`apostol:cx-union-of-two-coordinate-planes-fails-additive-closure`）
把总指令 `For those that are not, tell which axioms fail to hold.` 挂成了 anchors[1]——
**形状与组 2 的五个节点完全一样**。它是这批里唯一这么做的。
反推：若 CX2 的 15 个节点都统一挂总指令，这句话会有 15 次引用、**稳居共享清单首位**，
整批立刻暴露。

**所以：一批 15 个节点的同型缺陷是否被机械检测发现，
取决于"生产者有没有习惯性地挂那句门面引文"，而不取决于缺陷是否存在。**
挂门面引文的批次被抓（组 2），不挂的批次逃逸（CX2）——
**而不挂门面引文的锚点看起来更干净**。这条线索因此有一个反常的倾向：
**它偏向抓那些"多挂了一条无用锚点"的生产者，而放过那些"该挂的锚点根本没挂"的生产者**，
可后者往往更严重。

### 7.3 抽样验证：盲区里还有别的东西吗

我从 238 个 detector 盲区节点中，随机抽了 12 个纯 ch15 锚点的（seed 固定，`tmp_b_sample.py`，已删）
逐个读 statement + 锚点。结果：

- **0 个**清晰的 B 型漂移；
- **1 个**锚点覆盖缺口（`apostol:theorem-15-15-orthogonal-decomposition`，
  statement 断言勾股公式而未锚它，**且第三锚位空着**——已计入第 5.2 节第 9 条，明确标为"不能归 SPEC"）；
- 若干处无锚的 commentary，按我第 4 节前言的标准不判缺陷；
- 其余锚点与 statement 对应良好。

再用定向筛子（statement 点名具体公理/定理编号而锚点不含该编号）扫盲区：
**45 个命中中 39 个"缺编号"**，但逐个读前 14 个后，只有习题批次（CX2）是真问题，
其余是筛子的假阳性（节点本身就是那条公理，点名的是下游作用）。

**综合**：盲区里的问题**不是均匀分布的**。随机抽样几乎抓不到东西（0/12），
但**定向按"批次"抽就撞上了整批**（CX2 15 个）。
这提示比"共享引文"更有效的机械线索可能是**按生产批次分层**——
习题类批次（`*-x2`、`CX2`、`*-exercises` 相关）应整批人工过一遍，
因为它们的源文本结构性地不含答案。

### 7.4 这条线索的能力边界（结论）

**它能做什么**：
- 精确率尚可。9 组中我判出 4 组含问题、10 个节点的锚点该动，没有一组是纯噪声——
  清单给的每一组都值得读。相比 `check_unanchored_numbers.py` 的 1/4 召回，
  这条线索至少**指向的地方都有东西可看**。
- 它特别擅长抓一种具体形状：**同名概念在两个层次各有一句，节点只需一句却挂了两句**
  （第 3.2 节第 4 条，positivity 在公理层与定理层各一句）。这种冗余锚点几乎只能靠共享发现。

**它做不到什么**：
1. **覆盖率上限 54%**（阈值降到 ≥2），实际清单只覆盖 8%；238 个节点（46%）永久不可见。
2. **对单锚节点最弱**，而单锚节点恰是最严重情形的所在（3 条真漂移全是单锚）。
3. **盲区与生产者习惯相关而非与缺陷相关**（7.2 的 CX2 案例），
   这意味着它的召回率**不能从抽样外推**——CX2 逃逸不是因为运气，是因为机制。
4. **无法判定合法性**，这一点清单自己已声明，我确认：
   9 组中 5 组全员合法；且有 `d:angle-defined-only-in-real-euclidean-space` 这种
   **利用引文"没说 real"这个沉默**来承重的用法，任何机械规则都判不了。

**一句话**：共享引文是一条**值得跑但绝不完备**的线索。
它的输出应当被理解为"这里有 9 处值得人读"，而**不是**"B 型共 9 处"。
按 7.2 的机制推断，本图中未被这条线索发现的同型问题（CX2 一批 15 个）
**数量已超过它发现的（10 个）**。故这条线索的召回率我估计**低于 50%**，
且我无法给出可信的点估计——因为盲区的分布是批次相关的，抽样外推不成立。
如实说：**我只能证明它漏了至少 15 个，不能证明它漏的总数**。

---

## 8. 附录：逐组工作记录

### 组 1 — `15.03.md`：「degree equal to n is not a linear space because the closure axioms are not satisfied」（7 节点）

**引文究竟断言什么（不多不少）**

原文位置：`source/apostol-ch15/15.03.md` 第 25 行（EXAMPLE 7 内部第二句）。上下文全文为：

> EXAMPLE 7. The set of all polynomials of degree $\leq n$ , where n is fixed. (Whenever we consider
> this set it is understood that the zero polynomial is also included.) The set of all polynomials of
> degree equal to n is not a linear space because the closure axioms are not satisfied. For example,
> the sum of two polynomials of degree n need not have degree n.

引文断言两件事，仅此两件：

1. 「次数恰为 n 的多项式集合」不是线性空间；
2. 理由归于**封闭性公理**（复数、未点名是 Axiom 1 还是 Axiom 2，也未说明如何失败）。

引文**不**断言：哪一条封闭性公理失败；失败的机制；零元问题；子空间问题。
紧邻的下一句（`For example, the sum of two polynomials of degree n need not have degree n.`）
补上了**加法**方向的反例——注意是 "need not"，即见证依赖的。该句是独立可引锚点，
且已被 `apostol:polynomials-of-degree-exactly-n` 用作 anchors[1]。

另外确认：Apostol 在 15.03 中点名 closure axioms 的地方**恰好三处**——
Example 7（本引文）、Example 11（`we violate the closure axioms`）、Example 12
（`does not satisfy the closure axioms`）。这个「三」是可核的。

**逐节点判定**

| # | 节点 id | 共享引文位置 | 判定 |
|---|---------|------|------|
| 1 | `d:for-function-spaces-closure-is-the-only-real-content` | anchors[0]，**唯一锚点** | **B 型漂移** |
| 2 | `d:example-6-all-polynomials-as-a-function-space` | anchors[1] | 合法复用 |
| 3 | `d:degree-exactly-n-is-not-a-linear-space` | anchors[0]，唯一锚点 | 合法复用（本引文的正主） |
| 4 | `d:degree-exactly-n-fails-axiom-2-at-the-scalar-zero` | anchors[0]，**唯一锚点** | **B 型漂移** |
| 5 | `d:degree-exactly-n-has-no-zero-element` | anchors[0]，**唯一锚点** | **B 型漂移** |
| 6 | `d:degree-exactly-n-is-not-a-subspace-of-degree-at-most-n` | anchors[0] | 合法复用 |
| 7 | `apostol:polynomials-of-degree-exactly-n` | anchors[0] | 合法复用（源节点） |

**节点 1 的 claim 分解**（`d:for-function-spaces-closure-is-the-only-real-content`）

- (a) 逐点运算律自动成立，故判定一个函数集合是否线性空间就等于问它对逐点加法与逐点数乘是否封闭。
- (b) Examples 5–12 中每一次成功与每一次失败都由这一个问题决定。
- (c) Apostol 恰在三处集合失败的地方点名 closure axioms。

引文射程只覆盖 (c) 的**三分之一**（它是三处之一），且完全不触及 (a)（"逐点律自动成立" 是全节承重命题）
与 (b)（对 Examples 5–12 的全域断言）。缺口：承重的方法论断言 (a) 无锚。
**另有锚点顶上？无——这是唯一锚点。**
死因建议 **6**。可行的补救不是删节点（它是好的综合节点），而是改锚：
`The reader can easily verify that each of the following sets is a function space.`（78 字符，
15.03.md 第 18 行，符合 SPEC 长度，直接支撑 (a) 的"自动成立"语气）为更合适的 anchors[0]，
本引文可留作 anchors[1] 支撑 (c)。

**节点 4 的 claim 分解**（`d:degree-exactly-n-fails-axiom-2-at-the-scalar-zero`）

- (a) 对次数恰为 n 的 p，0p 是零多项式。
- (b) 零多项式没有 n 次，故落在集合外。
- (c) **故 Axiom 2 在单个标量 a = 0 处失败。**
- (d) 该失效比加法失效更彻底，因为它没有见证依赖的逃逸：对集合的每个成员都发生。

引文只给「封闭性公理未被满足」。(a) 是模型自算的代数；(b) 未在引文内；
(c) **点名 Axiom 2**——而原文既没点名任何一条，且它自己举的唯一例子是**加法**方向（Axiom 1）；
(d) 的比较项"加法失效"引用的是原文 `need not` 那一句，但该句**不是本节点的锚点**。
缺口：节点的全部特有内容（哪条公理、在哪个标量、为何更彻底）都在引文射程外，
且节点谈的公理与引文所举的例子**不是同一条**。
**另有锚点顶上？无。** 死因建议 **6**。
补记：这不是 SPEC 短公式所致——15.02.md 第 9 行 Axiom 2 全文
（`AXIOM 2. CLOSURE UNDER MULTIPLICATION BY REAL NUMBERS. For every x in V and every real number a there corresponds an element in V called the product of a and x, denoted by ax.`）
长度合规、可直接引用而未被引用。属真借用。

**节点 5 的 claim 分解**（`d:degree-exactly-n-has-no-zero-element`）

- (a) 逐点加法下 O 的唯一候选是零多项式。
- (b) 它被"次数恰为 n"的要求排除。
- (c) **故 Axiom 5 无见证，Axiom 6 失去作用对象。**
- (d) 该集合因此不只违反封闭性（Apostol 给的理由），还违反加法公理。

引文只支撑 (d) 中的插入语「which is the reason Apostol gives」——即该节点**唯一被锚点覆盖的部分
是它用来对照的背景，不是它自己的论点**。(a)(b)(c) 全部无锚。
更严重的是：Axiom 5/6 属**加法公理组**，与引文所说的**封闭性公理组**是不同的公理组，
所以此处不是"锚点较粗"，而是锚点谈的是另一件事。
节点自己的 `atomic_reason` 写着「书中未点明,属模型补充」——生产者知道自己超出了原文，
但锚点没有反映这一点。
**另有锚点顶上？无。** 死因建议 **6**。
可用而未用的锚点：15.03.md 第 25 行的括号句
`(Whenever we consider this set it is understood that the zero polynomial is also included.)`（90 字符）
直接关乎 (b)；15.02.md 第 17 行 `AXIOM 5. EXISTENCE OF ZERO ELEMENT. There is an element in V, denoted by O, such that`（82 字符）可引。
唯有方程 `x + O = x` 本身（16 字符）受 SPEC 下限阻挡——属**部分**受 SPEC 影响，见第 5 节。

**三个合法复用的理由**

- 节点 3 是本引文的正主：它的两个核心 claim（"要求次数等于 n 而非至多 n 破坏了结构"、
  "Apostol 把失败归于封闭性公理"）逐字落在引文内。
- 节点 2 的核心 claim (c) 是 Example 6 与 Example 7 的**对照**（"次数无界无害、次数固定为定值致命"），
  对照的后一半正是本引文；其 anchors[0]（`EXAMPLE 6. The set of all polynomials.`）承担前一半。两锚互补。
- 节点 6 的核心 claim 是"子集且继承运算却不是子空间"，需要两个前提：该集合不满足封闭性（本引文）
  与"子空间 ⟺ 满足封闭性公理"（anchors[1] 的 THEOREM 15.4 全文）。两锚各承一半，缺一不可。

### 组 2 — `15.12-exercises.md`：通用习题指令「In each case, determine whether ... is an inner product」（6 节点）

**先核一件决定性的事实：原文有没有答案。**

`source/apostol-ch15/15.12-exercises.md` 共 152 行。Exercise 1 在第 3 行提问，
随后第 5–24 行是五个候选公式的行内/展示公式，然后第 26 行直接进入 Exercise 2。
全文 `grep -i "answer"` 无命中；文件内**不存在**习题解答。
即：**Apostol 只出题，不给答案。**（这一点决定了本组的全部判定，请注意它可独立复核。）

**引文究竟断言什么**

> In each case, determine whether $(x, y)$ is an inner product for $V_{n}$ if $(x, y)$ is defined by the formula given.

这是一条**祈使句**，一条给读者的指令。它的命题内容仅有：

1. Exercise 1 对若干候选公式提出「它是否为 $V_n$ 上的内积」这个问题；
2. 语境是 $x, y$ 为 $V_n$ 中任意向量。

它**不**断言任何一个公式**是**或**不是**内积；不断言任何公理成立或失败；不断言任何见证元。
一条"在问什么"的指令，其射程止于"这个问题被提出了"，无法延伸到"这个问题的答案是什么"。

**直接回答委派方的提问**：不能。这句指令**不能**支撑
「∑x_i|y_i| 不是内积，因为绝对值只加在第二个因子上破坏了对称性」。
指令给出的是**疑问**，节点给出的是**判决 + 诊断 + 反例见证**。判决不在疑问的射程内，
这不是"锚点略粗"，而是**语气类型不同**（interrogative vs. assertoric），差距无法靠宽容解读弥合。

**那些具体断言的真正来源**（逐个追）

| 节点 | anchors[0]（各自专属） | anchors[0] 能撑住什么 | 判决与诊断从哪来 |
|---|---|---|---|
| `apostol:cx-absolute-value-in-second-slot-breaks-symmetry` | 公式行 `(x, y) = \sum_ ... x _ {i} | y _ {i} |.` | 只撑住**主语**：讨论的是哪个公式 | 模型自算 |
| `apostol:cx-root-of-sum-of-squared-products-breaks-linearity` | 公式行（平方和开方） | 同上 | 模型自算 |
| `apostol:cx-absolute-value-of-the-dot-product-breaks-homogeneity` | 公式行（点积取绝对值） | 同上 | 模型自算 |
| `apostol:cx-polarization-formula-is-twice-the-dot-product` | 公式行（极化式） | 同上 | 模型自算 |
| `apostol:cx-product-of-coordinate-sums-is-degenerate` | 公式行 `(c) $(x, y) = \sum x_i \sum y_j$` | 同上 | 模型自算 |

结论：**两个来源都有，但都不够。** 公式行（anchors[0]）确实是真锚点，它锁定了"在说哪个公式"——
这是承重的，不能删。但它只撑住**主语**，撑不住**谓语**（是/不是内积、哪条公理、见证元是什么）。
共享的指令（anchors[1]）撑住的是"这个问题被问了"，也是主语侧的框架信息。
**两个锚点合起来仍然不覆盖任何一个节点的核心断言。**
核心断言 100% 来自模型自己的演算——**这是 E 型，已登记（见第 4 节）**。

**B 型判定**

按委派定义（"同一引文被多节点引用，但只有一部分真正需要它"），本组结论清楚：

- **真正需要它的只有 1 个**：`apostol:cx-inner-product-axiom-diagnosis`（`method` 节点，
  statement 谈的正是"习题要求逐条指出哪些公理失败"这件**关于习题本身**的事）。
  它的三条锚点分工干净：anchors[0]（问是否为内积）+ anchors[1]（`In case $(x, y)$ is not an inner product, tell which axioms are not satisfied.`）覆盖 Exercise 1，
  anchors[2]（`In case $(f,g)$ is not an inner product, indicate which axioms are violated.`）覆盖 Exercise 12。
  该节点 statement 说的"Exercises 1 and 12"与三锚一致。**合法，且是本引文的唯一正主。**
- **其余 5 个是借用**：指令对它们只提供"出自 Exercise 1"这一出处信息，
  不提供任何支撑。这 5 条 anchors[1] 是**同一句话被复制五次充当门面**，
  典型的 B 型形状。

**死因建议（分两层，不要混）**

1. **B 型这一层**：5 个 `cx-*` 节点的 anchors[1] 建议**删除**（它是借用的、非承重的）。
   由于 anchors[0] 为真锚点且承担主语，仅就 B 型指控而言判 **`0` + 删掉借用锚点**。
   我不建议为 B 型杀这 5 个节点——杀掉会误伤（它们的数学是对的，见下）。
2. **E 型这一层**：删掉借用锚点后，5 个节点的核心断言变为**完全无原文支撑**。
   这是比 B 型更重的问题，但它超出我的裁量范围（涉及"习题解答类节点是否允许存在"的 SPEC 政策问题），
   我只登记，判定留给 E 型审查或裁定。

**一个减轻情节：五节点的数学我逐个验算，全部正确。**

- `x_i|y_i|`：n=1, x=-1, y=1 → (x,y)=-1, (y,x)=1，对称性确实破；x=(-1,0,…) → (x,x)=-1<0，正定性确实破。✓
- `(∑x_i²y_i²)^{1/2}` = ‖(x_iy_i)‖₂：对称 ✓，(x,x)=(∑x_i⁴)^{1/2}>0 ✓，(cx,y)=|c|(x,y) 确为绝对齐性 ✓，加性确实不成立 ✓
- `|∑x_iy_i|`：(cx,y)=|c|(x,y) ✓；n=1, x=1,y=1,z=-1 → (x,y+z)=0 而 (x,y)+(x,z)=2 ✓
- 极化式：∑(x_i+y_i)²−∑x_i²−∑y_i² = 2∑x_iy_i ✓，正倍数仍是内积 ✓
- `(∑x_i)(∑y_j)`：n≥2 取 x=(1,−1,0,…) → (x,x)=0 而 x≠O ✓；n=1 退化为诚实内积 ✓

所以这五个节点的**内容质量高、结论正确**，问题纯在**出处标注**：
锚点让人以为这些诊断出自 Apostol，而 Apostol 从未给出它们。
**失败在 provenance，不在 correctness**——这个区分对如何处置很关键。

**本组的 B 型不是 SPEC 短公式所致。** 五条公式行都远超 30 字符、单行可引，
生产者也确实引了。真正引不到的是**答案**，而答案在原文中根本不存在——
这是"源文本无解答"造成的锚点真空，与 SPEC 长度下限是两个不同的成因（见第 5 节的成因分类）。

**顺带记录一处源文本噪声**（不算生产者的错）：15.12 第 5–24 行的题号被 OCR 打乱——
`(a)` 之后的公式带 `\tag{d}`，下一个带 `\tag{b}`，再下一个带 `\tag{e}`，第四个无 tag，
第五个以 `(c)` 行内形式出现。故 (a)–(e) 的字母与公式的对应关系在源文件中已不可靠。
节点没有依赖这些字母（只引公式本体），处理是对的。

### 组 3 — `15.02.md`：「AXIOM 6. EXISTENCE OF NEGATIVES. For every x in V, the element $(-1)x$ has the property」（5 节点）

**引文究竟断言什么**

原文 15.02.md 第 23–27 行：

```
AXIOM 6. EXISTENCE OF NEGATIVES. For every x in V, the element $(-1)x$ has the property

$$
x + (- 1) x = O.
$$
```

引文（87 字符）断言：Axiom 6 名为"负元的存在性"，且对 V 中每个 x，**特定元素** $(-1)x$
具有某个性质——**而那个性质是什么，引文没说**。它在 "has the property" 处**戛然而止**，
承诺的内容（$x + (-1)x = O$）落在下一个展示公式里，而那行**只有 16 字符，低于 SPEC 下限 30，
不可作为锚点**。

这是本组的关键事实：**引文是一句语义上不完整的句子**。它锁定了"哪条公理"和"哪个元素"，
但把"什么性质"留在射程外。

**逐节点判定：本组无 B 型漂移，5/5 合法。**

| # | 节点 id | 位置 | 判定 |
|---|---------|------|------|
| 1 | `d:axiom-6-existence-of-negatives` | anchors[0]，唯一锚点 | 合法（正主），但方程被 SPEC 截断 |
| 2 | `d:axiom-6-names-the-negative-as-minus-one-times-x` | anchors[0] | 合法复用（承重且不可替代） |
| 3 | `d:axiom-10-is-derivable-from-apostols-form-of-axiom-6` | anchors[0] | 合法复用 |
| 4 | `apostol:axioms-for-addition` | anchors[2] | 合法复用，但受 ≤3 锚上限挤压 |
| 5 | `apostol:negative-of-an-element` | anchors[0] | 合法复用 |

理由逐条：

- **节点 2** 是最典型的"引文措辞本身就是承重物"的情形。它的 claim 是
  「Apostol 没有假设存在某个 y 使 x+y=O，而是断言特定元素 (-1)x 有此性质」——
  这个 claim 的证据**只能**是 Axiom 6 的原始措辞。引文精确到 "the element $(-1)x$ has the property"，
  正好是节点要对比的那个措辞选择。anchors[1]（15.04 的 `so $x$ has exactly one negative, the element $(-1)x$`）
  承担 statement 后半关于 Theorem 15.2 的部分。两锚分工清楚。
- **节点 3** 的两锚（Axiom 6 措辞 + Axiom 10 全文 66 字符）恰好是它论断
  「Axiom 10 可由 Apostol 版 Axiom 6 导出」的两个端点，都不可删。
  该节点的推导本身不在原文（statement 首句即自陈 "Apostol does not remark on this;
  the derivation below is not in the text."）——属 E 型，但**已如实自我披露**，
  且我验算其推导正确：Axiom 9 给 1x+(-1)x=(1+(-1))x=0x，Theorem 15.3(a) 给 0x=O；
  Axiom 6 给 x+(-1)x=O；两式各加 (-1)x 的一个负元 w，用 Axiom 4/5 化简得 1x=w 与 x=w，故 1x=x。
  我另核了循环依赖风险：Theorem 15.3(a) 的原文证明（15.04.md 第 49 行起）用的是 Axiom 9、6、4，
  **不含 Axiom 10**，故推导不循环。判 `0`。
- **节点 5** 的 anchors[1] 是 15.04.md 的
  `Axiom 6 tells us that each x has at least one negative, namely $(-1)x$`，
  它恰好补上了引文缺失的"性质是什么"以及"at least one negative"这个措辞。
  这是本组唯一把 SPEC 截断问题**绕过去**的节点——它去证明段落里找了一句散文替代不可引的方程。
  这个手法值得注意：它说明截断问题**有解**，其余节点只是没这么做。
- **节点 1** 是本引文的正主，但它是本组受 SPEC 伤害最重的：唯一锚点在 "has the property" 断掉，
  而它的 statement 首句就是 `For every x in V the element (-1)x satisfies x + (-1)x = O`——
  **等号右边那个 O 无锚可依**。详见第 5 节。
- **节点 4**（`apostol:axioms-for-addition`）是分组节点，statement 覆盖 Axioms 3–6 四条，
  但 SPEC 规定锚点**最多 3 条**，于是它引了 Axiom 3、4、6，**Axiom 5 完全无锚**——
  而 statement 明确写着 "there is a zero element O with x + O = x"。
  这不是借用（三条锚都在为各自的 claim 服务），而是**锚点配额不足**导致的覆盖缺口。
  同样归 SPEC，见第 5 节。
  附带一个反差：Axiom 5 的展示方程因 OCR 把 "for all x in V" 拆成
  `f o r a l l x i n V.` 而**膨胀到 36 字符，反而合规可引**；
  Axiom 6/7/8/9 的方程没有这种"意外救援"，全部卡在下限之下。

### 审查标准的一点交代（影响组 4 起的全部判定，请先读）

D 层（`d:*`）节点的 statement **按设计**就是分析、对照、反事实推演，
不可能句句都在原文里有对应。若要求 statement 的每个从句都被锚点覆盖，
D 层将被全灭——这显然不是本次审查的意图。故我采用如下标准：

> 锚点须支撑该节点的**主语**（在谈哪个对象）与**核心断言**（该节点作为一个节点存在的理由）。
> 围绕核心断言的分析性展开视为 commentary，不单独要求锚点，
> 但**若分析中包含可核的事实性主张**（如"原文在三处点名 X"、"Theorem 15.10 中有某步骤"），
> 该主张须为真——它虽不必有锚，但不得为假。

按此标准，组 1 的节点 4、5 仍判漂移，因为落空的是它们的**核心断言**（"哪条公理失败"就是该节点的全部内容），
而非环绕的分析。这个区分我尽量保持一致。

### 组 4 — `15.10.md`：Theorem 15.9(b)「(b) $\| x\| >0$ if $x\neq O$ (positivity).」（5 节点）

**引文究竟断言什么**

原文 15.10.md 第 125 行，是 THEOREM 15.9 四个条目中的 (b)。引文（42 字符）断言：
**范数**的正定性——x≠O 时 ‖x‖>0。注意它是列表项，"在 Euclidean space 中、对一切 x 与标量 c"
这个量化框架在第 121 行的定理头里，不在引文内。

**逐节点判定：4 合法，1 处借用锚点。**

| # | 节点 id | 位置 | 判定 |
|---|---------|------|------|
| 1 | `d:norm-positivity-property` | anchors[0]，唯一锚点 | 合法（正主） |
| 2 | `d:positivity-axiom-forbids-nonzero-self-orthogonal-elements` | **anchors[1]** | **B 型借用锚点** |
| 3 | `d:normalized-element-has-norm-one` | anchors[1] | 合法复用 |
| 4 | `d:strict-minimality-rests-on-positivity-of-the-norm` | anchors[0] | 合法复用 |
| 5 | `apostol:theorem-15-9-properties-of-norms` | anchors[1] | 合法（源节点），受 ≤3 锚上限挤压 |

**节点 2 的漂移（本组唯一）**

`d:positivity-axiom-forbids-nonzero-self-orthogonal-elements` 的 statement：

> The inner-product axiom (x, x) > 0 for x != O immediately yields the implication used above:
> (x, x) = 0 forces x = O. The self-orthogonality fact therefore carries no content beyond positivity...
> Note the implication is strictly weaker than the axiom, not equivalent to it...

claim 分解：
- (a) **内积**公理 (x,x)>0 (x≠O) 立即给出 (x,x)=0 ⇒ x=O。
- (b) 自正交这一事实的内容不超出正定性。
- (c) 该蕴含严格弱于公理，不等价。

三个 claim **全部只涉及内积 (x,x)，完全不涉及范数 ‖x‖**。statement 从头到尾没有出现范数。
而 anchors[1] 是 **Theorem 15.9(b)，一条关于范数的定理**。
缺口：引文谈的是 ‖x‖>0，节点谈的是 (x,x)>0；两者虽由 ‖x‖=(x,x)^{1/2} 相联，
但该联系本身需要范数定义作中介，而节点根本没走这条路——它走的是内积公理直接取逆否。
引文对这三个 claim **不提供任何支撑**，也不是节点论证链上的一环。
**另有锚点顶上？有——anchors[0] 正是内积正定性公理 `(x, x) > 0 \quad i f \quad x \neq O`，
恰好就是 claim (a) 的主语，完全承重。**
故死因 **`0`**，建议**删掉 anchors[1]**。这是一条纯粹"顺手挂上"的锚点：
两条引文都叫 positivity，生产者把两个 positivity 一并挂了，但节点只用到其中一个。
这正是 B 型最典型的形状——**同名概念在两个层次（公理层 / 定理层）各有一句，节点只需一句却挂了两句**。

**三个合法复用的理由**

- 节点 3（`d:normalized-element-has-norm-one`）：statement 末句 "Positivity of the norm is
  what makes the division legal" 明写 **norm** 的正定性，正是引文。anchors[0]（齐性 (c)）
  撑 ‖cy‖=|c|‖y‖，anchors[2]（15.11 orthonormal 定义）撑"norm 1"的语境。三锚各有其位。
- 节点 4（`d:strict-minimality-rests-on-positivity-of-the-norm`）：statement 明写
  "is exactly Theorem 15.9(b)"，引文即 Theorem 15.9(b) 本身，此处引文是 anchors[0]，铁定承重。
  其 anchors[1] 是内积正定性公理——我考虑过判它借用，但 ‖s−t‖²=0 ⇒ s=t 这一步的实际机制是
  ‖s−t‖²=(s−t,s−t)=0 再用公理，公理是比定理更贴近的那一环，故两锚都站得住，不判借用。
- 节点 5 是 Theorem 15.9 的源节点，statement 列了 (a)(b)(c)(d) 四项，
  却只能挂 3 条锚，于是选了定理头 + (b) + 前置说明句，**(a)(c)(d) 三项无锚**。
  (c) 40 字符、(d) 57 字符本可引，(a) 仅 **29 字符——差 1 字符卡在下限外**。
  这是配额与下限双重挤压，归 SPEC，见第 5 节。

### 组 5 — `15.10.md`：内积第四公理「(x, x) > 0 \quad i f \quad x \neq O」（5 节点）

**引文究竟断言什么，以及一个容易被忽略的事实**

原文 15.10.md 第 21–23 行是一个**展示公式块**。关键事实：
15.10 的内积公理列表中，(1)(2)(3) 都有编号前缀，而**第四条没有 "(4)" 标号**——
它直接以裸展示公式出现（第 19 行是 `(3) $c(x,y) = (cx,y)$`，第 21–23 行即本引文，
第 25 行已转入 "A real linear space with an inner product is called a real Euclidean space."）。

因此引文的射程是：**(x,x)>0 当 x≠O**，仅此。它**不自我标识为公理**，
也不自我标识为"第四条"。节点称它"the fourth axiom"/"axiom 4" 依赖的是
第 13 行 DEFINITION 句（"satisfying the following axioms"）与列表位置，
这个依赖是合理的，但严格说不在引文内。我不为此判漂移（属常识性语境继承），仅记录。

另记：引文 35 字符，**刚过下限 5 个字符**，而这 5 个字符是 OCR 把 "if" 拆成 `i f`、
在 `\quad` 之间塞了空格换来的。若 OCR 正常输出 `(x, x) > 0 if x \neq O`（约 22 字符），
**这条公理也会变成不可引**。第 15 章五条核心公理方程中已有四条阵亡，这一条是**侥幸生还**。
见第 5 节。

**逐节点判定：5/5 合法，无漂移。**

| # | 节点 id | 位置 | 判定 |
|---|---------|------|------|
| 1 | `d:inner-product-positivity-axiom` | anchors[0]，唯一锚点 | 合法（正主） |
| 2 | `d:15-11-denominator-nonzero-by-positivity` | anchors[1] | 合法复用 |
| 3 | `d:positivity-axiom-forbids-nonzero-self-orthogonal-elements` | anchors[0] | 合法复用（**承重的正是这条**） |
| 4 | `d:strict-minimality-rests-on-positivity-of-the-norm` | anchors[1] | 合法复用 |
| 5 | `apostol:inner-product-axioms` | anchors[2] | 合法（源节点），受挤压 |

- 节点 1 的核心断言即引文逐字内容；其后的"若削弱为半定会怎样"是反事实分析（按上述标准视为 commentary）。
  我核了其中的事实性主张：statement 称 Theorem 15.10 中有一步
  "(x_1, x_1) is not 0 since x_1 is not O"——**核对为真**，
  15.11.md 第 15 行确有 `But $(x_{1}, x_{1}) \neq 0$ since $x_{1} \neq O$`。
  该主张虽无锚，但为真，按标准通过。
- 节点 2 的 claim (c) 第二环明写 "a nonzero element has (e_j, e_j) > 0 by the positivity axiom"，
  引文即该公理，承重；anchors[0]（15.11 中通向 (15.8) 的那句）承担 claim (a)。两锚互补。
- 节点 3 见组 4——它的 anchors[0] 就是本引文，是它真正的依据。
  **组 4 与组 5 交叉给出了一个干净的对照：同一节点，一条锚承重、一条借用。**
  这个对照正是 B 型审查该有的产出形态。
- 节点 5 是内积公理的源节点，statement 列四条公理，只能挂 3 条锚，
  实际挂了元陈述句 + 公理(2) + 公理(4)，**公理(1)(3) 无锚**。
  公理(1) 49 字符本可引（是配额问题），公理(3) **仅 21 字符不可引**（是下限问题）。
  两种成因在同一节点上同时出现。

### 组 6 — `15.11.md`：「The zero element is orthogonal to every element of V; it is the only element orthogonal to itself.」（5 节点）

**引文究竟断言什么**：15.11.md 第 5 行首句。这是一句**双断言**句（分号连接）：
(i) O 与 V 的每个元素正交；(ii) O 是唯一与自身正交的元素。射程宽，且两半可分别被不同节点使用。

**逐节点判定：5/5 合法，无漂移。本组是"高共享但完全正当"的样板。**

- `d:zero-element-orthogonal-to-every-element`（唯一锚点）：核心断言即分号前半，正主。
  它称此为"Apostol's first remark after the definition"——核对为真（第 3 行 DEFINITION，第 5 行本句）。
- `d:15-10-nonzero-hypothesis-is-essential`（anchors[1]）：其 claim「把 O 添进正交集仍是正交集，
  因为 O 与一切正交」**直接需要分号前半**。承重。anchors[0] 是 Theorem 15.10 本体。
  我另核了它的反例 {O, i, i+j}：(i, i+j)=1≠0，故确非正交集；含 O 故相依。**反例正确。**
  它称"证明中该假设只用在除以 (x_1,x_1) 一处"——核对 15.11.md 第 15 行为真。
- `d:zero-is-the-only-element-orthogonal-to-itself`（anchors[0]）：用分号**后半**，正主。
  anchors[1]（15.14）与 anchors[2]（15.13）分别对应它声称的两处承重使用——
  我逐一核实：15.14.md 第 50 行确在 **THEOREM 15.15**（正交分解定理，第 18 行）的唯一性证明中；
  15.13.md 第 75 行确在 **THEOREM 15.13**（正交化定理）证明中且用于 property (a) 那一支。
  **"恰好两处"这一数量主张与三条锚点自洽。**
- `x:orthogonality-is-a-vanishing-pairing`（anchors[0]）：X 层跨教材节点，
  用 Apostol 本句与 Strang `4.1.md` 两句对照同一事实，正是 X 层的职能。承重。
- `apostol:orthogonal-elements`（anchors[1]）：源节点，anchors[0] 定义句 + anchors[1] 本句，
  statement 正是两句的合并。承重。

### 组 7 — `15.10.md`：内积公理 (2)「(2) $(x,y + z) = (x,y) + (x,z)$ (distributivity, or linearity).」（4 节点）

**引文究竟断言什么**：加性，**且只在第二个变元上**。63 字符，含编号与命名。

**逐节点判定：4/4 合法，无漂移。**

- `d:inner-product-additivity-axiom`（唯一锚点）：正主，核心断言逐字对应。
  其 claim「Apostol 只在第二格陈述加性」可从引文形状直接读出（引文里 y+z 在第二格）。
- `d:additivity-in-first-argument-derived`（anchors[0]）：claim 是
  「(x+y,z)=(x,z)+(y,z) 不是公理，而是用对称性绕进第二格、用公理(2)、再绕回来」。
  **公理(2) 是这条推导链的中间一环，铁定承重。**
  anchors[1] 是三角不等式证明中的展开式，对应 statement 后半。
  记一处缺口（非漂移）：该节点把**对称性公理(1)** 说成 load-bearing，但**没有锚它**——
  公理(1) 49 字符本可引，第三个锚位被展开式占了。属配额取舍，不是借用。
- `d:s-perp-closure-follows-from-linearity-in-the-first-argument`（anchors[1]）：
  claim 明写 "additivity in the second argument (axiom 2) transfers to the first through
  symmetry (axiom 1)"，公理(2) 与公理(1) 都被点名且都被锚（anchors[1]、anchors[2]），
  anchors[0] 是 15.14 那句 "It is a simple exercise to verify..." 对应 statement 末句。
  **三锚三用，无一冗余，是本次审查中锚点分工最干净的节点。**
  缺口：claim 还提到 homogeneity 是公理(3) 与"子空间判别法"（Theorem 15.4），二者无锚——
  但锚位已满 3 条，且公理(3) **仅 21 字符不可引**。归 SPEC。
- `apostol:inner-product-axioms`（anchors[1]）：源节点，已在组 5 讨论。

### 组 8 — `15.10.md`：范数定义句「DEFINITION. In a Euclidean space V, the nonnegative number $\|x\|$ defined by the equation」（4 节点）

**引文究竟断言什么**

15.10.md 第 105 行。**又一句在"defined by the equation"处断掉的引文**——
与组 3 的 Axiom 6 同型：定义的实质（`\| x \| = (x, x) ^ {1 / 2}`）在第 108 行的展示块里，
**26 字符，低于下限，不可引**。引文能给的是："在 Euclidean space V 中，有一个非负数 ‖x‖ 被某方程定义"。
"非负"这个词是引文里最有信息量的部分，后面会用到。

**逐节点判定：4/4 合法，无漂移。**

- `d:norm-definition-as-square-root`（anchors[0]）：正主。**这个节点的处理值得表彰**：
  它用 anchors[0]（定义句前半）+ anchors[1]（`is called the norm of the element $x$ .`，第 110 行）
  **把不可引的展示方程从两侧夹住**，并在 `atomic_reason` 里明写
  "the display line itself is only 26 characters, so the surrounding sentence carries the anchor"——
  **生产者明确意识到 SPEC 下限问题并留了记录。** 这是第 5 节归因的直接证据。
  其 claim「取非负分支，故 ‖x‖≥0 由构造而非证明得到」正由引文中的 "nonnegative" 支撑。
- `d:angle-defined-only-in-real-euclidean-space`（anchors[1]）：
  claim 是「范数在**任意** Euclidean space 中有定义，而角只在**实** Euclidean space 中有定义」。
  这是一个**对照**claim，对照的两端各需一锚：anchors[0] 是角的定义句（"In a **real** Euclidean space V"），
  anchors[1] 即本引文（"In a Euclidean space V"，**无 real**）。
  **引文中"缺少 real 这个词"正是承重物。** 合法复用，且是一个漂亮的用法：
  引文的价值不在它说了什么，而在它**没说** real。
  记一处未核主张（commentary，不判）：statement 称这是"15.10 中唯一一处实/复情形在
  '能定义什么'上真正分岔的地方"——这是全节域主张；我注意到第 29 行对称性公理在复空间被替换，
  那属"公理形式"而非"能否定义"，与该主张不直接冲突，但我未穷举 15.10 全节，故不背书。
- `apostol:norm`（anchors[0]）：源节点，同样用 anchors[0]+anchors[1] 夹住方程，anchors[2] 撑"依赖内积选择"。合法。
- `apostol:norm-notation`（anchors[0]）：合法，但**锚点选择弱于上面两个**：
  它只取了定义句前半（截断），**没有取 `is called the norm of the element $x$ .` 来闭合**，
  于是 statement 里的 `||x|| = (x, x)^(1/2)` 从两侧都无锚。
  它的 anchors[1] 用在 Cauchy-Schwarz 记法上（对应 statement 后半，合理），第三个锚位空着。
  **锚位有余而未用于闭合定义**，属可改进的取舍，不判漂移。

### 组 9 — `15.15.md`：「for all $t$ in $S$ ; the equality sign holds if and only if $t = s$ .」（4 节点）

**引文究竟断言什么**

15.15.md 第 9 行。这是 Theorem 15.16 陈述的**尾句**，它承接第 5–7 行的展示不等式
`\| x - s \| \leq \| x - t \|`（**25 字符，低于下限，不可引**）。
引文断言：(i) 上述不等式对 S 中一切 t 成立；(ii) 等号成立当且仅当 t=s。
引文**自身不含那个不等式**——"for all t in S" 悬空指向一个引不到的公式。
这是本组共享的根源：四个节点都要谈"唯一最佳逼近"，而唯一性条件只有这一句可引。

**逐节点判定：2 合法，1 边缘借用，1 弱锚（非漂移）。**

- `apostol:theorem-15-16-approximation-theorem`（anchors[2]）：源节点。
  三锚分工：anchors[0] 假设、anchors[1] 结论散文（`Then the projection of x on S is nearer
  to x than any other element of S.` —— **代替不可引的不等式**）、anchors[2] 等号条件。
  **合法，且 anchors[1] 是对 SPEC 下限的正确应对：用散文替公式。**
- `x:best-approximation-by-the-projection`（anchors[1]）：X 层节点，
  claim 的两半「最小化」与「唯一最小化者」分别由 anchors[0] 与 anchors[1] 承担，
  anchors[2] 是 Strang `4.2.md` 的对应陈述。三锚三用，合法。
- `d:equality-holds-exactly-when-t-equals-s`（anchors[1]）：**边缘 B 型借用。**
  它的 anchors[0] 是证明行第 23 行
  `But $\| s - t\|^2 \geq 0$ , so we have $\| x - t\|^2 \geq \| x - s\|^2$ , with equality holding if and only if $s = t$ .`，
  **该锚已经同时包含了不等式、非负性、以及等号条件**——即 anchors[1] 的全部内容
  已被 anchors[0] 覆盖。claim 分解（(a) ‖s−t‖²≥0 故不等式；(b) 等号迫使 ‖s−t‖²=0 即 s=t；
  (c) 投影是唯一最小化者）三条**全部**落在 anchors[0] 射程内。
  缺口：严格说没有缺口，而是**冗余**——anchors[1] 不提供 anchors[0] 之外的任何支撑。
  唯一可辩护的差别是 anchors[0] 出自**证明**、anchors[1] 出自**定理陈述**，
  后者可用于说明"这是定理所断言的"而非"这是证明所得的"。
  **另有锚点顶上？有，anchors[0] 独力足够。** 死因 **`0`**，anchors[1] 可删。
  我把它记为**边缘**而非确认漂移：它是冗余而非错配，危害远低于组 1 与组 2 的情形。
- `d:approximation-inequality-with-equality-only-at-the-projection`（anchors[1]）：
  **不判漂移，但记一处弱锚。** 该节点通篇谈的是**证明的两步结构**
  （勾股拆分 / 从同一恒等式读出等号情形），而它的两条锚 **都在定理陈述里**，
  没有一条在证明里。证明的关键行——第 20 行勾股恒等式
  `\| x - t \| ^ {2} = \| x - s \| ^ {2} + \| s - t \| ^ {2}.`（57 字符，**可引**）与
  第 23 行（>100 字符，**可引**）——**都可引而未引**，而兄弟节点
  `d:equality-holds-exactly-when-t-equals-s` 恰好引了第 23 行。
  按我的判定标准，两条锚确实确立了"定理有不等式与等号两半"这个该节点所分析的**对象**，
  故核心断言的**主语**有锚，判合法；但锚点没有落在它真正分析的文本上，
  这是一处**可改进的锚点选择**，登记备考。

<!-- APPEND-GROUPS-HERE -->


---

## 9. 未覆盖事项声明

**我查了什么**：输入清单 9 组、45 处引用、41 个节点，逐组回源核对。
另做了两项越出清单的机械筛查（全图共享度统计、solo 节点定向筛）与一次 12 节点随机抽样。

**我没查什么，如实列出**：

1. **≥3 次的另外 28 组（37 − 9）没查。** 这是我主动的取舍：
   发现 CX2 整批逃逸后，我判断评估召回率比机械过完 28 组更有价值。
   这 28 组仍未经任何人审查，**不要当作已清**。
2. **238 个 detector 盲区节点只抽样了 12 个（5%）**，另用定向筛子看了 45 个命中中的 14 个。
   **其余绝大部分未读。** 7.3 的"随机抽样 0/12"是一个样本量极小的观察，
   **不足以支持"盲区里问题不多"这种结论**，我没有这样声称。
3. **CX2 那 15 个节点我只读了 6 个的 statement**（筛子输出的前几个），
   没有逐个验算它们的数学（组 2 的五个我验算了）。
   我对它们的判断限于"锚点不支撑其对具体公理的点名"这一形式判断，
   **不含对其内容正确性的背书或否定**。
4. **跨教材（Strang）锚点未核**。`x:*` 节点的 `4.1.md`、`4.2.md` 锚点我只做了存在性与语义相关性的粗判，
   没有回 `source/strang-ch3`、`source/strang-ch4` 逐字核上下文。
   涉及 `x:orthogonality-is-a-vanishing-pairing`、`x:best-approximation-by-the-projection`。
5. **L2 抽象层（`structures-L2-*.jsonl`）完全未涉及。** SPEC 规定该层不要求原文锚点，
   故不在 B 型射程内；但其 `members` 归属的真实性（SPEC 称"编造成员归属是本实验最严重的缺陷"）
   **不是我查的，也没有人在本报告里查过**。
6. **边 (`edges-*.jsonl`) 完全未涉及。**
7. **若干 commentary 性质的全域主张我明确标注了"未核"**，不再重复：
   最主要的是 `d:angle-defined-only-in-real-euclidean-space` 的
   "15.10 中唯一一处实/复情形分岔"（我未穷举 15.10 全节）。
8. **第 4 节 E 型的处置我没有判定。** 组 2 与 CX2 共 20 个节点删掉借用锚点后核心断言无锚，
   这涉及"习题解答类节点是否允许存在、是否只需标 `origin: model`"的 SPEC 政策问题，
   超出我的裁量范围。我只登记事实，**留给 E 型审查或裁定**。

**我没有做的事**：没有修改 `data/` 下任何文件；没有读其它审查员的输出
（`审查-形式D-*`、`裁定-*`、`_捞回-*`、`audit-*`、`SPEC缺陷-*`）；
没有进入 `M08实验-Apostol微积分卷1/`。临时脚本 `tmp_b_*.py` 与 `tmp_b_solo.json` 已删除。

**关于"N/N 已验证"式表述**：本报告不作此类声明。
`grep -F` 100% 通过与本报告的发现并不矛盾——它们检验的是两件不同的事，
这正是本次审查要说明的：**逐字校验通过，不等于引文支撑了它所挂的断言。**
