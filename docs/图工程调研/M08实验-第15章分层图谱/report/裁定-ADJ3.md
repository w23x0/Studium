# 裁定 ADJ3：真值与精确性审查

审查视角：statement 的原子 claim 是否为真、是否精确、是否有 source 支撑。冗余性不在本报告范围内。

判死因编码：`0`=KEEP、`1`=量词过度断言、`2`=伪造归属、`3`=虚假教材归属、`4`=数学错误、`6`=锚点不支撑其断言。

> 九节点全部审完。数据位置：`d:ten-axioms-listed-in-three-groups`(nodes-D1.jsonl:5)、
> `d:axioms-2-7-8-9-are-the-scalar-dependent-axioms`(:24)、`d:an-example-is-a-set-plus-two-explicit-operations`(:42)、
> `d:example-1-verification-is-the-field-axioms-of-r`(:46)、`d:function-space-zero-is-the-everywhere-zero-function`(:60)、
> `d:degree-exactly-n-is-not-a-subspace-of-degree-at-most-n`(:71)、`x:dimension-versus-rank`(nodes-X.jsonl:8)、
> `x:independence-criterion-and-its-consequences`(:9)、`x:least-squares-is-a-projection`(:20)

## 1. 结论表

| 节点 | claim 总数 | 假 | 不精确 | 无锚 | 处置 / 死因 |
| --- | --- | --- | --- | --- | --- |
| `d:ten-axioms-listed-in-three-groups` | 5 | 0 | 0 | 3 | KEEP / 0 |
| `d:axioms-2-7-8-9-are-the-scalar-dependent-axioms` | 6 | **1** | 1 | 3 | **须改写 / 1** |
| `d:an-example-is-a-set-plus-two-explicit-operations` | 6 | **1** | 0 | 5 | **须改写 / 1** |
| `d:example-1-verification-is-the-field-axioms-of-r` | 6 | 0 | 1 | 4 | 须改写 / 0 |
| `d:function-space-zero-is-the-everywhere-zero-function` | 5 | 0 | 0 | 4 | KEEP / 0 |
| `d:degree-exactly-n-is-not-a-subspace-of-degree-at-most-n` | 5 | 0 | 0 | 3 | KEEP / 0 |
| `x:dimension-versus-rank` | 4 | 0 | 1 | 1 | 须改写 / 0 |
| `x:independence-criterion-and-its-consequences` | 4 | 0 | 0 | 0 | KEEP / 0 |
| `x:least-squares-is-a-projection` | 2 | 0 | 0 | 1 | KEEP / 0（出处栏疏漏） |
| **合计** | **43** | **2** | **3** | **24** | 4 节点须改写 |

两条**假** claim：`C4.1`（"恰四条公理提到实数"——按字面读为六条，且与本节点次句自相矛盾）、`C5.3`（"本节先定运算后定集合"——例 1–4 反驳）。
三条**不精确**：`C4.6`（末句"另六条不受影响"）、`C6.6`（末句独立性因果给错）、`C1.1`（首句缺"有限维"限定）。
**五条缺陷中三条落在 statement 末句**（C4.6、C5.3、C6.6），与既有规律一致；另两条落在首句。九个节点里 6 个的末句为真，3 个的末句有缺陷。

## 2. 逐节点 claim 分解

### 2.1 `d:ten-axioms-listed-in-three-groups` — KEEP / 0

statement：*The definition consists of exactly ten axioms, presented in three groups: two closure axioms, four axioms for addition, and four axioms for multiplication by numbers.*

| # | claim | 锚点/行号 | 判定 |
| --- | --- | --- | --- |
| C3.1 | 定义恰含**十**条公理 | 锚1（15.02:3 "the following ten axioms"）+ 自查 15.02:7,9,13,15,17,23,31,37,43,49 共 10 条 | **真** |
| C3.2 | 分**三**组呈现 | 锚1 "which we list in three groups" + 组标题 15.02:5, :11, :29 | **真** |
| C3.3 | 封闭公理**两**条 | 无锚（标题 15.02:5 "Closure axioms" 未被引；Axiom 1:7、2:9） | **真**（自查） |
| C3.4 | 加法公理**四**条 | 无锚（标题 15.02:11；Axiom 3:13、4:15、5:17、6:23） | **真**（自查） |
| C3.5 | 数乘公理**四**条 | 无锚（标题 15.02:29；Axiom 7:31、8:37、9:43、10:49） | **真**（自查） |

量词核对：`exactly ten` 逐条点数为 10，真；三处组内计数 2/4/4 与三个组标题下的实际编号完全吻合，真。全节点无假、无不精确。

锚点问题：C3.3–C3.5 的 2/4/4 拆分不在锚1 射程内（**D 型·射程不足**，轻度：断言仍可由同文件 2–26 行直接点数核实，且 SPEC 使其不可补——见第 6 节）。锚2（15.01:5 "We turn now to a detailed description of these axioms."，54 字符）不支撑本 statement 任何一条 claim，属**纯过渡句、零射程锚点**。

### 2.2 `d:axioms-2-7-8-9-are-the-scalar-dependent-axioms` — 须改写 / 1（首句量词假，且与自身次句矛盾）

> 处置约定：真值层面只有"statement 是否可原样保留"。有真且被锚点支撑的内核者记**须改写**并在第 3 节给出成品文本；内核全假者记 **KILL**。

statement：*Exactly four of the ten axioms mention real numbers, namely Axioms 2, 7, 8 and 9, and replacing real number by complex number in those four converts the definition into that of a complex linear space. The remaining six axioms name no scalar other than the fixed numbers -1 and 1 (in Axioms 6 and 10), which lie in both fields, and are therefore untouched by the change of scalar field.*

| # | claim | 锚点/行号 | 判定 |
| --- | --- | --- | --- |
| C4.1 | 十条中**恰四条** "mention real numbers" | 锚1 只给"哪四条"，不给"恰四条提到实数"这个谓词 | **假** |
| C4.2 | 那四条是 Axioms 2、7、8、9 | 锚1（15.02:51 逐字）；`grep -niw real` 命中且仅命中公理行 :9、:31、:37、:43 | **真** |
| C4.3 | 在这四条里把 real number 换成 complex number 即得复线性空间的定义 | 锚1 逐字 | **真** |
| C4.4 | 余下六条除固定数 −1、1（在 Axiom 6、10）外不提任何标量 | 无锚（**E 型**） | **真**（逐条自查见下） |
| C4.5 | −1 与 1 同属两个域 | 无锚（**E 型**） | **真**（R ⊂ C） |
| C4.6 | 余下六条**因此不受**标量域更换的影响 | 无锚（**E 型**，且为**末句**） | **不精确** |

C4.1 为何假：谓词 "mention real numbers" 按字面读要为全域负责，而 Axiom 6（:23–27）含常数 $(-1)$、Axiom 10（:49）含常数 $1$，二者都**是实数**，故按字面读"提到实数"的公理有六条，不是四条。更致命的是本节点**次句自己承认** −1 和 1 是数、且"lie in both fields"——即 statement 内部就自相矛盾：首句说只有四条提到实数，次句说另有两条点了名为实数的常数。真正为真的精确断言是"恰有四条**量化一个任意标量**"（或"恰有四条**文本中出现 real 一词**"）：A2 "every real number a"、A7 "all real numbers a and b"、A8 "all real $a$"、A9 "all real $a$ and $b$"，其余六条无一量化标量。死因 `1`（量词/谓词过度断言）。

C4.4 逐条自查（六条=1,3,4,5,6,10）：A1(:7) 无标量；A3(:13) 无；A4(:15) 无；A5(:17–21) 无（O 是 V 的元素，不是标量）；A6(:23–27) 仅 $(-1)$；A10(:49) 仅 $1$。故"除 −1、1 外不提标量"为真，且 −1、1 恰出现在 A6、A10，位置也对。

C4.6 为何不精确：这六条的**文字**确实无需改写（真），但"untouched"过强。A6、A10 断言的是数乘运算的性质，而该运算本身由 A2 定义；换域后 A2 把数乘扩张到每个复数 a，于是 A6 中的 $(-1)x$、A10 中的 $1x$ 所指的运算已经变了，只是记法不变。原文（:51）对"另外六条"未置一词，此为生产者在锚点射程外自加的一条洞见——**与"缺陷集中在末句"的既有规律吻合**。

### 2.3 `d:an-example-is-a-set-plus-two-explicit-operations` — 须改写 / 1（末句"先定运算后定集合"对本节不成立）

statement：*To exhibit a concrete linear space one must supply three data: the set V, a rule for adding two elements, and a rule for multiplying an element by a number. Omitting either rule leaves the axioms with nothing to speak about, which is why the section fixes the operations before the sets: Examples 1 to 3 name their own operations, Example 4 inherits those of V_n, and Examples 5 to 12 share the ones given in the function-space preamble.*

| # | claim | 锚点/行号 | 判定 |
| --- | --- | --- | --- |
| C5.1 | 给出具体线性空间**必须**供三项数据 | 锚1（15.03:3） | **真**（但锚点只给充分性，见下） |
| C5.2 | 缺任一运算则公理无所指 | 无锚（**E 型**） | **真**（自查） |
| C5.3 | **本节因此先定运算、后定集合** | 无锚（**E 型**，且为**末句**） | **假** |
| C5.4 | 例 1–3 各自指明自己的运算 | 无锚（15.03:5、:7、:9） | **真** |
| C5.5 | 例 4 沿用 V_n 的运算 | 无锚（15.03:11） | **真** |
| C5.6 | 例 5–12 共用函数空间前言给的运算 | 无锚（15.03:13–19 对 :21–35） | **真** |

C5.1 的锚点方向：15.03:3 是**充分**条件（"If we specify … we get a concrete example"），statement 断的是**必要**（"one must supply"）。必要性独立为真——十条公理里 A1,3,4,5,6,8 需要加法、A2,6,7,8,9,10 需要数乘，缺一即有公理无法陈述——但这一步不在锚点射程内（**D 型·射程不足**）。

C5.3 为何假：本节的实际编排不是"先运算后集合"。例 1（:5）、例 2（:7）、例 3（:9）都在**同一句里同时**给出集合与运算；例 4（:11）只给集合、根本没提运算。"运算先于集合"只对函数空间那一段成立（前言 :13–19 先定 $(f+g)(x)$ 与 $af$，随后 :21–35 才逐个列集合），即只覆盖 12 个例子中的 8 个。作为对"the section"的整体断言，它被例 1–4 反驳。另外 "which is why" 是关于作者编排意图的因果断言，原文无任何依据。注意：紧跟其后的 C5.4–C5.6 三项枚举本身**全真**——假的只是把它们统摄起来的那句因果概括。

C5.2 逐条自查：去掉加法规则，A1、A3、A4、A5、A6、A8 无法陈述；去掉数乘规则，A2、A6、A7、A8、A9、A10 无法陈述。故"缺任一运算公理即无所指"为真。

### 2.4 `d:example-1-verification-is-the-field-axioms-of-r` — 须改写 / 0（数学全真，末句因果不精确）

statement：*For V = R every one of the ten axioms is a familiar arithmetic law: Axioms 1 and 2 are closure of R under its own operations, Axioms 3, 4, 7, 8 and 9 are commutativity, associativity and distributivity of real arithmetic, and Axioms 5, 6 and 10 hold with O = 0 and 1x = x. No verification here is non-trivial, which is exactly why the example carries no information about the axioms' independence.*

| # | claim | 锚点/行号 | 判定 |
| --- | --- | --- | --- |
| C6.1 | V=R 时十条公理**每一条**都是熟悉的算律 | 锚1+锚2（15.03:3、:5） | **真** |
| C6.2 | A1、A2 是 R 对自身运算的封闭性 | 无锚（15.02:7、:9） | **真** |
| C6.3 | A3,4,7,8,9 是实算术的交换、结合、分配律 | 无锚（15.02:13,15,31,37,43） | **真** |
| C6.4 | A5、A6、A10 取 O=0、1x=x 即成立 | 无锚（15.02:17–21,23–27,49） | **真** |
| C6.5 | 此处无一步验证是非平凡的 | 锚1 "can easily verify"（射程见下） | **真** |
| C6.6 | **正因如此**该例对公理独立性不提供信息 | 无锚（**E 型**，且为**末句**） | **不精确** |

量词核对：`every one of the ten` 逐条走一遍——A1 $x+y\in\mathbf R$、A2 $ax\in\mathbf R$、A3 加法交换、A4 加法结合、A5 $x+0=x$、A6 $x+(-1)x=0$、A7 $a(bx)=(ab)x$ 即乘法结合、A8 $a(x+y)=ax+ay$、A9 $(a+b)x=ax+bx$ 皆分配律、A10 $1x=x$。十条全中，C6.1 真。C6.2–C6.4 的分组映射（2+5+3=10）也逐条对得上。C6.4 措辞略压缩（"hold with O = 0 and 1x = x" 把 A10 自身当作了见证），但不假。

C6.6 为何不精确：结论本身（单个模型不能给出任何公理的独立性信息）为真，错在 "exactly why" 这个因果。使该例对独立性无信息的原因是**它是十条公理全部成立的一个模型**——要证 A_k 独立于其余，需要一个"其余成立而 A_k 失效"的模型，任何全满足的例子都不行，验证难易与此无关；一个验证很吃力的模型同样给不出独立性信息。此外 `grep -rniE "independen[ct]"` 与 `axiom` 的交集在整章为 **0**，"redundant/minimal/superfluous" 亦为 0：Apostol 在第 15 章从未提出公理独立性问题，这一整句是生产者在锚点射程外自加的——**又一次落在末句**。

### 2.5 `d:function-space-zero-is-the-everywhere-zero-function` — KEEP / 0

statement：*The element O required by Axiom 5 is realized in a function space by the function whose value is zero at every point of the domain, not by the number 0. A set of functions that happens to exclude this function, such as the polynomials of degree exactly n, cannot be a linear space under the pointwise operations, since Axiom 2 forces 0f = O into the set.*

| # | claim | 锚点/行号 | 判定 |
| --- | --- | --- | --- |
| C7.1 | A5 要求的 O 在函数空间里由**处处取零**的函数实现 | 锚1（15.03:19 逐字） | **真** |
| C7.2 | 而**不是**数 0 | 无锚（**E 型**；15.03:13 "The elements of V are real-valued functions"） | **真** |
| C7.3 | 排除该函数的函数集在逐点运算下**不能**是线性空间 | 无锚（**E 型**） | **真** |
| C7.4 | 次数恰为 n 的多项式即为此种集合 | 无锚（15.03:25 说它不是线性空间，但未提零元） | **真** |
| C7.5 | 因为 A2 把 $0f=O$ 逼进集合 | 无锚（**E 型**，**末句**；论证同 15.06:11 定理 15.4 证明） | **真** |

C7.2 自查：15.03:13 明确 "The elements of V are real-valued functions"，故数 0 根本不是函数空间的元素，"not by the number 0" 为真且是有教学价值的辨析。

C7.3+C7.5 自查（这是本节点唯一需要真正论证的一步，且落在末句，故重点核）：设函数集 W 在逐点运算下是线性空间。取 $f\in W$（A5 要求 V 非空，W 亦然）。A2 对**每个**实数 a 要求 $af\in W$，取 $a=0$ 得 $0f\in W$；而逐点定义下 $(0f)(x)=0\cdot f(x)=0$ 对定义域中每个 x 成立，即 $0f$ 就是处处取零的函数。故任何线性空间的函数集必含该函数；排除它者不是线性空间。逆否成立，C7.3 真。此论证与 Apostol 自己在定理 15.4 证明中的写法一致（15.06:11："Taking $a = 0$ , it follows that $0x$ is in $S$ . But $0x = O$"），故不是生产者编造的路子。**措辞上有一处压缩**："Axiom 2 forces … into the set" 严格说 A2 是对线性空间的要求、不是对任意集合的强制力；此处是反证法的省略写法，可接受，不判不精确。

C7.4 自查：次数恰为 n 的多项式集合确实排除零多项式（零多项式无次数 n），故它属于 C7.3 所说的那类集合。真。

本节点五条 claim 全真，无假、无不精确。

### 2.6 `d:degree-exactly-n-is-not-a-subspace-of-degree-at-most-n` — KEEP / 0

statement：*The polynomials of degree exactly n sit inside the linear space of polynomials of degree at most n and inherit its operations, yet they are not a subspace, since a subspace must itself satisfy the closure axioms. The pair shows that being contained in a linear space and carrying its operations is not enough.*

| # | claim | 锚点/行号 | 判定 |
| --- | --- | --- | --- |
| C8.1 | 次数恰为 n 者**含于**次数 ≤ n 的线性空间之内 | 无锚（**E 型**；15.03:25 例 7 给出 ≤ n 空间） | **真** |
| C8.2 | 且沿用后者的运算 | 无锚（**E 型**；逐点运算 15.03:13–19） | **真** |
| C8.3 | 但它**不是**子空间 | 锚1（15.03:25 "not a linear space"）+ 锚2（定理 15.4） | **真** |
| C8.4 | 因为子空间自身**必须**满足封闭公理 | 锚2（15.06:5 定理 15.4 逐字，iff） | **真** |
| C8.5 | 此对照表明"含于线性空间+带着它的运算"**不够** | 无锚（**E 型**，**末句**） | **真** |

C8.1 自查：$\{p:\deg p=n\}\subset\{p:\deg p\le n\}$ 显然，且后者是线性空间（例 7，:25，含零多项式）。真。C8.2 自查：两者都用 15.03:13–19 的逐点加法与数乘，前者未另定运算。真——但须注意"inherit its operations"在此只能读作"沿用环绕空间的运算规则"，**不能**读作"该集合在这些运算下封闭"（恰恰不封闭，这正是本节点的要点）。原 statement 未因此产生歧义，因为紧接着就说了 not a subspace。

C8.3+C8.4 的推理链：定理 15.4（:5）说非空子集是子空间 **iff** 满足封闭公理；15.03:25 说该集合封闭公理不满足；故它不是子空间。链条完整，两锚点各承担一环，无缺口。另外该集合非空（如 $x^n$），定理 15.4 的非空前提满足，链条不因前提落空而断。

C8.5（末句）自查：该断言等价于"子集 + 同样的运算 ⇏ 子空间"，反例正是本节点这一对——$x^n$ 与 $1-x^n$ 都在次数恰为 n 的集合里（$n\ge1$），其和为 $1$，次数 0，出集；这正是 15.03:25 给的理由 "the sum of two polynomials of degree n need not have degree n"。故末句为真，且反例是原文的。**这是九个节点里唯一一个末句既为真又落在锚点射程内的**。措辞小瑕：定理 15.4 还要求"非空"，末句列举"含于+带运算"两项时未提非空；但由于此处集合非空，不影响本节点结论的真值。

### 2.7 `x:dimension-versus-rank` — 须改写 / 0（首句缺"有限维"限定）

statement：*Dimension is the common size of all bases of a space. Rank is an attribute of a matrix, equal to the number of pivots, and it happens to equal the dimension of that matrix's column space and of its row space. The two words are not interchangeable: only one of them is defined for a space and only one is defined for a matrix.*

| # | claim | 锚点/行号 | 判定 |
| --- | --- | --- | --- |
| C1.1 | 维数是一个空间**所有**基的公共大小 | 锚1（15.08:9 只给定义，不给良定性） | **不精确** |
| C1.2 | 秩是矩阵的属性，等于主元个数 | 锚2（3.5 逐字 "The rank of a matrix is the number of pivots"） | **真** |
| C1.3 | 且它恰等于该矩阵列空间与行空间的维数 | 锚3（Rank Theorem）+ 3.5:23 | **真** |
| C1.4 | 二词不可互换：**只有**一个对空间有定义、**只有**一个对矩阵有定义 | 无锚（**E 型**；但 3.4:276 有逐字可引句） | **真** |

C1.1 为何不精确：「所有基的公共大小」这一良定性内容是**定理 15.6**（15.08:5），而该定理明写 "Let $V$ be a **finite-dimensional** linear space"。锚1 引的是紧随其后的 DEFINITION 句，只说"若 V 有 n 元基则 n 称为维数"，**不含**"所有基同大小"（**D 型·射程不足**）。而去掉有限维前提后有两处反例：其一，无限维空间（15.08 例 4，全体多项式）Apostol 不赋任何整数维数，"公共大小"无所指；其二，$V=\{O\}$ 的维数 0 是**另立的约定**（15.08:9 "If $V = \{O\}$ , we say V has dimension 0"），它没有 $n\ge1$ 元基。本节点自己的 `apostol_ids` 里就列了 `d:dimension-of-the-zero-space-is-zero-by-convention`，说明生产者知道这个边界却仍写了不覆盖它的概括。

C1.4 逐向核（负向 `only`，两个方向都要为全域负责）：方向一"空间无秩"——`grep -rniE "rank of (a|the) (sub)?space"` 在 Strang ch3–4 只命中 3.4:276，而那一句恰恰是**禁止**该说法。方向二"矩阵无维数"——`grep` 未发现 Strang 用 dimension 指矩阵尺寸（他一律写 "m by n"）；ch3–4 里 dimension 后面跟的都是子空间。故 C1.4 真。**且 3.4:276 是一句完美的逐字依据（"We never say "the rank of a space" or "the dimension of a basis" or "the basis of a matrix". Those terms have no meaning."），生产者未用它，却把 3 个锚位额度用在了两条 3.5 引文上**——这是"该引的没引"，而非引错。

### 2.8 `x:independence-criterion-and-its-consequences` — KEEP / 0

statement：*Independence of a generating family is exactly the condition that makes the representation of an element by that family unique. In matrix form it is full column rank, equivalently a trivial nullspace, equivalently invertibility of A-transpose-A.*

| # | claim | 锚点/行号 | 判定 |
| --- | --- | --- | --- |
| C2.1 | 生成族的独立性**恰好**是使表示唯一的条件 | 锚1（15.08:37 只给 ⇒ 一向） | **真** |
| C2.2 | 矩阵语言下即列满秩 | 3.3:131–141（锚2 位于该表之内） | **真** |
| C2.3 | 等价于零空间平凡 | 锚2（3.3:137 逐字，表中第 3 项） | **真** |
| C2.4 | 等价于 $A^{\mathrm T}A$ 可逆 | 锚3（4.2:269 逐字，iff） | **真** |

C2.1 的 `exactly` 是双向断言，须两向都核。⇒ 向：锚1 即 Apostol 的原话（独立 ⇒ 系数相等）。⇐ 向**锚点未覆盖**（**D 型·射程不足**），须自验：设生成族 $\{v_i\}$ 张成但相关，则有非平凡关系 $\sum a_iv_i=O$（某 $a_j\neq0$）；于是任一表示 $x=\sum c_iv_i$ 同时等于 $\sum(c_i+a_i)v_i$，两个系数元组不同，唯一性破。故 iff 成立，C2.1 真。注意 statement 隐含"generating/张成"前提（唯一性只对张成族才谈得上），该词已写在 claim 里，无遗漏。

C2.2–C2.4 的等价链自验：列满秩 ⟺ 无自由变量 ⟺ $N(A)=\{0\}$（3.3:133–137 三项同表）；$N(A)=\{0\}$ ⟺ $A^{\mathrm T}A$ 可逆（4.2:269；实矩阵下 $A^{\mathrm T}Ax=0\Rightarrow x^{\mathrm T}A^{\mathrm T}Ax=\|Ax\|^2=0\Rightarrow Ax=0$，反向平凡）。链条无缺口，四条 claim 全真，无假、无不精确。

### 2.9 `x:least-squares-is-a-projection` — KEEP / 0（statement 全真；锚点射程不足，另有出处栏疏漏）

statement：*When an element cannot be represented exactly by the available generators, the best representation in the norm induced by the pairing is obtained by projecting onto the subspace they span. The unsolvable exact problem is thus replaced by a solvable orthogonality condition.*

| # | claim | 锚点/行号 | 判定 |
| --- | --- | --- | --- |
| C9.1 | 无法精确表示时，配对导出的范数下的最佳表示由**投影到它们张成的子空间**得到 | 锚1（15.14:3 只陈述**问题**，不给解） | **真** |
| C9.2 | 于是不可解的精确问题被替换为可解的正交性条件 | 无锚（**E 型**，**末句**） | **真** |

C9.1 自验：定理 15.16（**位于 `15.15.md:3`**）逐字断言 "the projection of x on S is nearer to x than any other element of S"，正是 C9.1 的内容；定理 15.15（15.14:18）给出存在唯一的正交分解。距离定义为 $\|x-y\|$（15.14:3），范数由内积（pairing）导出，故"the norm induced by the pairing"用词准确。有限维前提（两定理都写了 finite-dimensional）在 statement 里由 "the available generators"（有限生成族）隐含承担，不构成缺陷。

**锚点射程（D 型）**：锚1 "Given an element x in V, to determine an element in S whose distance from x is as small as possible." 只是**问题陈述**，"最佳表示由投影得到"这个**解**在它射程之外——真正的依据是 15.15.md:3 的定理 15.16。这正是「拿问题当结论」式的射程不足。

**出处栏疏漏（不影响 statement 真值，但属归属不完整）**：节点 `apostol_ids` 列了 `apostol:theorem-15-16-approximation-theorem`，该定理**确实存在**（非伪造归属），但它在 `15.15.md`，而节点 `sections` 只写了 `["15.14","4.1"]`，未列 15.15；锚点也无一条来自 15.15。即节点的核心依据所在小节没有出现在它自己的出处声明里。

C9.2 自验（末句，重点核）：定理 15.15 把 $x$ 唯一分解为 $s+s^{\perp}$，$s\in S$、$s^{\perp}\in S^{\perp}$；求最近点这一极小化问题于是化为"误差与 S 正交"这一线性条件，在 Strang 侧即法方程 $A^{\mathrm T}(b-A\hat x)=0$。"unsolvable" 指精确表示问题无解（Strang 4.1:31 "when we want to solve $A x = b$ and can't do it"），措辞与两书都对得上。真。


## 3. 需要改写的 statement 全文

以下四条为成品文本，可直接替换对应节点的 `statement` 字段。

**`d:axioms-2-7-8-9-are-the-scalar-dependent-axioms`**（修 C4.1 假、C4.6 不精确）

```
Exactly four of the ten axioms quantify over an arbitrary scalar, and they are the only four whose text contains the word real: Axioms 2, 7, 8 and 9. Replacing real number by complex number in those four converts the definition into that of a complex linear space. The other six name no scalar at all except the two fixed constants -1 and 1 (Axioms 6 and 10), which denote the same elements in either field, so their wording carries over unchanged; what changes beneath them is the scalar multiplication of Axiom 2, on which both depend.
```

**`d:an-example-is-a-set-plus-two-explicit-operations`**（删 C5.3 假因果，保留全真的枚举）

```
To exhibit a concrete linear space one must supply three data: the set V, a rule for adding two elements, and a rule for multiplying an element by a number. Omitting either rule leaves the axioms with nothing to speak about, since six of the ten mention addition and six mention multiplication by numbers. The section supplies the three data in varying order: Examples 1 to 3 name set and operations together, Example 4 gives only the set and inherits the operations of V_n, and Examples 5 to 12 are listed after the function-space preamble has fixed the pointwise operations once for all of them.
```

**`d:example-1-verification-is-the-field-axioms-of-r`**（修 C6.6 因果）

```
For V = R every one of the ten axioms is a familiar arithmetic law: Axioms 1 and 2 are closure of R under its own operations, Axioms 3, 4, 7, 8 and 9 are commutativity, associativity and distributivity of real arithmetic, and Axioms 5, 6 and 10 hold with O = 0, (-1)x the ordinary negative, and 1x = x. No verification here is non-trivial. Being a model in which all ten axioms hold, the example also says nothing about whether any one of them follows from the others -- that would require a model where one fails and the rest hold -- a question Apostol does not raise in this chapter.
```

**`x:dimension-versus-rank`**（修 C1.1 缺限定；建议同时把 3.4:276 的禁令句换入锚位，见第 5 节）

```
For a finite-dimensional space, dimension is the common size of all its bases, the zero space being assigned dimension 0 by separate convention. Rank is an attribute of a matrix, equal to the number of pivots, and it happens to equal the dimension of that matrix's column space and of its row space. The two words are not interchangeable: only one of them is defined for a space and only one is defined for a matrix.
```

## 4. 负向断言专项

负向断言要为全域负责，故逐条实际 grep 全章而非抽样。下表含九节点 `statement` 里的全部负向 claim，以及 `divergence` 栏里承重的负向断言（后者不计入第 1 节 claim 计数，但同为"被保留内容"，故一并核）。

| 负向断言 | 出处 | 实际执行的校验 | 判定 |
| --- | --- | --- | --- |
| 十条中"**恰四条**提到实数"（隐含"另六条不提"） | C4.1 | `grep -niw real 15.02.md` → 仅公理行 :9,:31,:37,:43；但 A6(:23–27) 含 $(-1)$、A10(:49) 含 $1$，均为实数 | **假** |
| 另六条"**不提** −1、1 以外的标量" | C4.4 | 逐条读 A1,3,4,5,6,10：A1/A3/A4/A5 无标量，A6 仅 $(-1)$，A10 仅 $1$ | **真** |
| 零元"**不是**数 0" | C7.2 | 15.03:13 "The elements of V are real-valued functions" | **真** |
| 排除零函数的集合"**不能**是线性空间" | C7.3 | 反证：A2 取 $a=0$ 得 $0f\in W$，逐点算得 $0f$ 即零函数（同 15.06:11 的走法） | **真** |
| 次数恰为 n 者"**不是**子空间" | C8.3 | 15.03:25 + 定理 15.4（15.06:5，iff） | **真** |
| "含于线性空间+带其运算"**不够** | C8.5 | 反例 $x^n+(1-x^n)=1$，即原文 :25 给的理由 | **真** |
| "**只有**一个词对空间有定义、**只有**一个对矩阵有定义" | C1.4 | `grep -rniE "rank of (a\|the) (sub)?space"` ch3–4 → 唯一命中 3.4:276，而该句是禁令；未见 dimension 用于矩阵尺寸 | **真** |
| Apostol "有维数而**全无**秩：该词在第 15 章不出现" | `x:dimension-versus-rank` divergence | `grep -rniw rank apostol-ch15/` → **0** | **真** |
| "Apostol 的词汇**无法**表述那三条定理，因他没有矩阵、也就没有四个子空间" | 同上 | `grep -rniwE "matrix\|matrices" apostol-ch15/` → **0** | **真** |
| 15.06–15.07 是 metric-free | 同上（原文写作 "15.05-15.07"） | `grep -rniE "inner product\|norm\|length\|orthogonal\|dot product\|distance" 15.06 15.07` → **0** | **真**（但小节区间标错，见下） |
| Rank Theorem / Counting Theorem / FTLA part 1 是 Strang 独有 | 同上 | 三者分别在 3.5、3.5:128、3.5:23 找到；Apostol 侧无矩阵 | **真** |
| Apostol "**从不**提方程，故只读 ch15 的读者不会知道此理论能解超定系统" | `x:least-squares-is-a-projection` divergence | `grep -rniE "system\|linear equations\|overdetermined\|unknowns" 15.14 15.15` → **0** | **真** |
| Strang 4.1–4.2 "**没有**函数上的范数，因而无法提出函数逼近问题" | 同上 | `grep -rniE "function\|polynomial\|continuous" 4.1.md 4.2.md` → **0** | **真** |
| Apostol 未提出公理独立性问题 | C6.6 改写文本所依赖 | `grep -rniE "independen[ct]"` ∩ `axiom` 全章 → **0**；`redundan\|minimal set\|superfluous` → **0** | **真** |

十四条负向断言中十三条经全章 grep 或穷举核对为真，一条（C4.1）为假。**负向断言的整体质量高于正向的量词断言**——唯一的假不是出在"原文没有 X"这类需要全域搜索的断言上，而是出在一个本可以数出来的十项枚举上。

另有两处 `divergence` 栏的**定位/数学不精确**（在 `x:dimension-versus-rank`，不影响其 statement 真值）：

1. "The chain **15.05-15.07** is metric-free and representation-free … so he can assign a dimension"。metric-free 为真，但区间标错：`15.05` 在本语料里是习题节（`15.05-exercises.md`，"15.5 Exercises"），且**维数根本不在这个区间里定义**——定义在 15.08，本节点自己的 `sections` 写的也是 `15.08`。实质链条应为 15.06–15.08。属**A 型（位置错）**的变体：小节坐标指向了不含该内容的区间。
2. "r + (n - r) = n **pins those four dimensions simultaneously**"。此式只钉住 $\mathbf R^n$ 侧的两个（行空间 $r$、零空间 $n-r$）；$\mathbf R^m$ 侧的两个还需 $r+(m-r)=m$。Strang 原文（3.5:25）写的是 "$N(A)$ and $N(A^{\mathrm T})$ have dimensions $n - r$ and $m - r$, to make up the full n and rn"，**两式并列**。以一式称"同时钉住四个"是**数学不精确**（死因 4 的轻度形态）。

## 5. 锚点支撑性问题（形式 A–E）

九节点共 17 条锚点，全部经 `grep -F` 确认为逐字子串（机器校验 100% 通过）——正因如此，以下问题没有一条是机器能查出来的。

**A 型（位置错）：1 例（在 divergence 栏，非锚点本身）**
`x:dimension-versus-rank` 的 "the chain 15.05-15.07" 指向的区间不含维数定义（在 15.08），且 15.05 是习题节。详见第 4 节。锚点本身（15.08:9）位置正确。

**B 型（借用引文）：0 例判缺陷；6 组共享待记录**
六条锚点被本批以外的节点同时引用，但逐组核对后**每一组的双方都真的需要它所引的那一句**（多为同一句的不同分句），故不构成 B 型缺陷：

| 共享引文 | 本批节点 | 同引者 | 判定 |
| --- | --- | --- | --- |
| 15.02:3（nonempty set … ten axioms … three groups） | `d:ten-axioms-listed-in-three-groups` | `d:linear-space-requires-a-nonempty-underlying-set` | 各取不同分句，双方均被支撑 |
| 15.03:3（specify V and tell how to add / multiply） | `d:an-example-is-a-set-plus-two-explicit-operations` | `d:linear-space-is-a-set-together-with-two-operations` | 同一句支撑两个高度相近的命题；引文对两者均为真 |
| 15.03:3（reader can easily verify …） | `d:example-1-verification-is-the-field-axioms-of-r` | `d:examples-are-asserted-to-satisfy-the-axioms-and-left-to-the-reader` | 后者以此为主命题，前者作射程有限的旁证 |
| 15.03:5（EXAMPLE 1 …） | `d:example-1-verification-is-the-field-axioms-of-r` | 其 `parent` 节点 `d:example-1-the-real-numbers-form-a-linear-space` | 父子同引，双方均需 |
| 15.03:19（The zero element is the function …） | `d:function-space-zero-is-the-everywhere-zero-function` | `d:function-space-axioms-reduce-pointwise-…` | 本节点是该句的主用者 |
| 15.03:25（degree equal to n is not a linear space …） | `d:degree-exactly-n-is-not-a-subspace-of-degree-at-most-n` | 另 **5** 个节点 | 单句承载 6 个节点，为本图共享度最高的引文 |
| 15.08:37（since the basis elements are independent …） | `x:independence-criterion-and-its-consequences` | `d:uniqueness-of-components-apply-independence` | 后者更贴近该句，前者用其 ⇒ 向 |

（"该由谁保留"属冗余维度，不在本报告范围。此处只记录共享事实与"引文是否支撑各自断言"。）

**C 型（拿端点当中间步骤）：1 例**
`x:least-squares-is-a-projection` 锚1（15.14:3）是**问题陈述**（"to determine an element in S whose distance from x is as small as possible"），被用来支撑"最佳表示**由投影得到**"这一**结论**。结论的真正依据是定理 15.16（`15.15.md:3`），而 15.15 既不在锚点里也不在该节点 `sections` 里。

**D 型（射程不足）：5 例——最危险且最多的一型**

| # | 节点 | 断言 | 锚点实际覆盖 | 缺口 |
| --- | --- | --- | --- | --- |
| D-1 | `d:ten-axioms-listed-in-three-groups` | 2/4/4 分组计数 | 只覆盖"十条""三组" | 三个组标题（15.02:5,:11,:29）未引，且两个标题被 SPEC 挡住（第 6 节） |
| D-2 | `d:an-example-is-a-set-plus-two-explicit-operations` | "one **must** supply"（必要性） | 15.03:3 是"if we specify … we get"（充分性） | 方向相反，必要性无锚 |
| D-3 | `d:example-1-verification-is-the-field-axioms-of-r` | 逐公理映射（A1,2 / A3,4,7,8,9 / A5,6,10） | 两锚只说"例 1 是 R"和"读者易验证" | 十条公理的具体对应全在射程外 |
| D-4 | `x:dimension-versus-rank` | "**所有**基的公共大小" | 锚1 只是 DEFINITION 句 | 良定性出自定理 15.6（15.08:5），未引；该定理的 finite-dimensional 前提也随之丢失 |
| D-5 | `x:independence-criterion-and-its-consequences` | "**exactly** the condition"（iff） | 锚1 只给独立 ⇒ 唯一 | ⇐ 向无锚（经自验为真） |

**E 型（无锚点从句）：24 条 claim**
分布：节点3 有 3、节点4 有 3、节点5 有 5、节点6 有 4、节点7 有 4、节点8 有 3、节点1 有 1、节点9 有 1、节点2 有 0。其中承载全部 5 条缺陷的都是无锚 claim（C4.1 部分有锚但谓词无锚，C4.6/C5.3/C6.6/C1.1 全无锚）。**结论：本批 43 条 claim 里，凡出问题的都在锚点射程之外；锚点射程之内的断言无一为假。**

**另记：零射程锚点 1 例**
`d:ten-axioms-listed-in-three-groups` 锚2（15.01:5 "We turn now to a detailed description of these axioms."）不支撑该 statement 的任何一条 claim，是纯过渡句。它占用了一个锚位，而真正需要锚的 2/4/4 分组却没有锚（与 D-1 同一节点）。

**另记：该引而未引 1 例**
`x:dimension-versus-rank` 的 C1.4 无锚，但 `strang-ch3/3.4.md:276` 有一句逐字可用、长度合规的禁令句（"We never say "the rank of a space" or "the dimension of a basis" or "the basis of a matrix". Those terms have no meaning."）。三个锚位中有两条都投给了 3.5，建议以此句替换其中一条。

## 6. SPEC 缺陷实例计数（30 字符下限 / 3 锚点上限）

以下均**不判生产者死**：这是"该引的引不了"，是规则的问题。计数只统计本批九节点实际撞上的。

**30 字符下限（不跨行）撞墙：8 处**

| 位置 | 内容 | 长度 | 谁需要它 |
| --- | --- | --- | --- |
| 15.02:26 | `x + (- 1) x = O.` | 16 | 节点4（A6 含 −1 的证据）、节点7（A6） |
| 15.02:34 | `a (b x) = (a b) x.` | 18 | 节点4、节点6（A7 结合律） |
| 15.02:40 | `a (x + y) = a x + a y.` | 22 | 节点4、节点6（A8 分配律） |
| 15.02:46 | `(a + b) x = a x + b x.` | 22 | 节点4、节点6（A9 分配律） |
| 15.02:5 | `Closure axioms` | **14** | 节点3（"两条封闭公理"） |
| 15.02:11 | `Axioms for addition` | **19** | 节点3（"四条加法公理"） |
| 15.03:16 | `(f + g) (x) = f (x) + g (x)` | 27 | 节点7（逐点加法定义） |
| 15.02:20 | `x + O = x \quad f o r a l l x i n V.` | 36 | （**恰好过关**，非缺陷，列此作对照） |

新增于既有清单的是后三条中的两个**组标题**：`Closure axioms`(14) 与 `Axioms for addition`(19) 均不达标，而第三个组标题 `Axioms for multiplication by numbers`(36) 达标。**同一个三元分组里，两个标题不可引、一个可引**——这直接造成 D-1：节点3 的 2/4/4 分组无法补锚。

**>200 字符上限撞墙：3 处**
`15.03:19`(359)、`15.03:25`(360)、`strang-ch3/3.4.md:276`(239) 三整行超上限。此项**可绕过**：取其内部的合规子串即可（SPEC 只要求逐字连续、不跨行）。实测 3.4:276 内部的 `We never say "the rank of a space" …no meaning.` 为 **121 字符**、逐字命中、完全合规——故第 5 节推荐它作节点1 的替换锚点是可执行的，此处不算真缺陷。

**3 锚点上限撞墙：2 处**
- 节点3：3 个锚位里 1 个给了零射程的过渡句（15.01:5）；即便回收该位，也只能补 1 个组标题，而两个需要的标题都不达 30 字符 —— 上限与下限**叠加**致使该断言无法完整落锚。
- 节点1：3 锚位已满（15.08 定义 + 3.5 两条），要补定理 15.6（124 字符，合规）或 3.4:276（121 字符，合规）就必须挤掉一条。**两条本该引的合规句竞争一个空位**，这是 3 锚点上限在本批唯一的实质约束。

节点9 只用了 2 个锚位、尚余 1 位可给 `15.15.md:3` 的定理 15.16 —— 该处未落锚**不是** SPEC 所迫，属生产者取舍，已计入第 5 节 C 型。

## 7. 未覆盖事项

如实列出没做到、没验算、或不确定的部分，不为凑数补结论。

1. **`divergence` 栏未逐条分解**。按任务书，claim 分解的单位是 `statement`，故第 1 节的 43 条计数只来自 statement。三个 `x:` 节点的 `divergence` 各有 150–250 词，含大量断言。我只挑了其中**承重的负向断言**和**可验算的数值/结构断言**核（结果见第 4 节，发现 2 处不精确）。未核的部分主要是**动机与意图类**表述，例如"Apostol 的动机是逼近论""Strang 的动机是不可解系统""the entire content of 3.5 is the bridge between them""What rank buys Strang is arithmetic"。这些是解释性判断，我没有为它们建立真假标准，也没有通读 3.5 全节来核"entire content"这个全称。

2. **数值验算：本批无标的**。任务书提示要人工验算 `(e−1/e)/2`、`3/e`、`e^2 − 1`、`pi − 2 sin x`、`x = 1 and y = i` 这类模型自算的符号值（机器筛查召回 1/4）。我逐字检查了九个节点的 statement，**没有一条含数值或符号计算结果**——本批全是结构性/索引性断言（公理编号、分组计数、集合包含、等价链）。故"数值必须人工验算"这一项在本批**无适用对象**，不是我跳过了它。唯一带算式的验算是我自己为核 C7.3、C8.5、C2.1 的 ⇐ 向而做的推导，已写在对应节点里。

3. **`atomic` / `atomic_reason` / `parent` / `sections` 字段未系统审**。这些不是 statement 真值。仅在真值审查顺带撞见时记了两处：节点9 的 `sections` 漏了 15.15（第 2.9 节），节点1 的 divergence 小节区间标错（第 4 节）。其余节点的这些字段没查。

4. **边（`edges-*.jsonl`）完全未审**。九个节点各自的出入边、`rel` 方向、`evidence` 逐字性都不在本次范围内。

5. **Strang 侧只读了被引用到的位置**。3.3、3.4、3.5、4.1、4.2 我读的是 grep 命中的行及其上下文，未通读；problemset 文件只在 grep 时扫过。若 `x:` 节点的某条断言依赖我没读到的段落，我可能漏判。特别是"独立性失效时 p 唯一而 x̂ 不唯一"这条（节点2 divergence 末句），我**未在 Strang 原文中定位到支撑句**，只在数学上确认它为真（$\hat p$ 是投影故唯一；列相关时 $A\hat x=\hat p$ 的解集是 $\hat x_0+N(A)$，非唯一）。它是否有原文依据，未确认。

6. **`d:` 节点的 parent 链未上溯核对**。例如节点6 的 parent 是 `d:example-1-the-real-numbers-form-a-linear-space`，节点8 的 parent 是 `d:degree-exactly-n-is-not-a-linear-space`——我读了这两个 parent 的 statement（为判 B 型共享），但没有核它们自身的真值。

7. **对 C6.4 的措辞判断有主观成分**。原文 "Axioms 5, 6 and 10 hold with O = 0 and 1x = x" 把三条公理的见证压成两个等式，A6 的见证 $(-1)x$ 被省略。我判为"略压缩、不假"而非"不精确"，并在改写文本里补上了。若采更严标准，此条可计为第 4 条不精确。

8. **单人裁定，无交叉校验**。按实验设计我未读 ADJ1/ADJ2/orchestrator 的结论及 `_捞回-裁定员推理原文.md`、`待应用清单.md`、`audit-B2*`。故本报告的 5 条缺陷判定没有第二人复核；C4.1 那条已由任务书预先点明，其余 4 条（C5.3、C6.6、C1.1、C4.6）是本轮新发现，尚未经他人验证。
