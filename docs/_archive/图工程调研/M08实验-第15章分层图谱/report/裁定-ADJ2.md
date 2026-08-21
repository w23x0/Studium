# 裁定报告 ADJ2（独立裁定人，对抗性受命：尽力翻案 B2 的七个 KILL）

> **状态：完成。** 九个节点全部处理。
>
> 立场声明：本报告受对抗性任命，先验假定每个 KILL 都是错的，然后尽力用证据证明它错。
> 翻不动的写进第 3 节。全程未读 `裁定-orchestrator.md`、`裁定-ADJ1.md`、`裁定-ADJ3.md`、
> `_捞回-裁定员推理原文.md`、`待应用清单.md`，未读 `M08实验-Apostol微积分卷1/`，
> 未读除 `audit-B2.md` / `audit-B2-verdicts.jsonl` 外的任何审计员输出。完整读取清单见 §7.2。
>
> **一句话结论：七个 KILL 我完全翻案 2 个（`d:axioms-2-7-8-9-…`、`d:an-example-is-a-set-plus-two-explicit-operations`），
> 改判为 FIX 2 个（不得直接删），维持 KILL 3 个。B2 不存在「滥杀以显得在干活」意义上的系统性过度开火，
> 但它的 KILL 理由自检只验证了「点名的 id 真实」，未验证「冗余论证是否覆盖 statement 的每一句」——
> 七个里有三个的理由描述不属实。**

## 1. 结论表

| id | B2 verdict | ADJ2 裁定 | 翻案 |
|---|---|---|---|
| `x:dimension-versus-rank` | FIX | FIX 同意 | 追加修法：3 个 Strang 定理补进 `strang_ids` |
| `x:independence-criterion-and-its-consequences` | FIX | FIX 同意 | 无异议，B2 指认的增量经复核成立 |
| `d:ten-axioms-listed-in-three-groups` | KILL | **FIX** | 部分翻案：冗余成立但处置错，且 B2 理由含虚构从句 |
| `d:axioms-2-7-8-9-are-the-scalar-dependent-axioms` | KILL | **KEEP** | **完全翻案**：B2 把节点第二句转述错，节点正是防这个错的 |
| `d:an-example-is-a-set-plus-two-explicit-operations` | KILL | **KEEP** | **翻案**：末句的十二例运算来源普查表 B2 全未处理 |
| `d:example-1-verification-is-the-field-axioms-of-r` | KILL | KILL 维持 | **翻案失败**：入度 0，末句洞见已由存活的例3 parent 承担 |
| `d:function-space-zero-is-the-everywhere-zero-function` | KILL | KILL 维持 | **翻案失败**（B2 挂错公理，换正确公理后冗余仍成立；reason 须重写） |
| `d:degree-exactly-n-is-not-a-subspace-of-degree-at-most-n` | KILL | KILL 维持 | **翻案失败**：入度 0，定理15.4 一步可得；覆盖率不算判据 |
| `x:least-squares-is-a-projection` | KILL | **FIX** | 部分翻案：2 个 L1 成员在 X 层别无落点，5 条入边悬空 |

## 2. 逐节点裁定

### 2.1 `d:ten-axioms-listed-in-three-groups` — B2: KILL → **ADJ2: FIX（部分翻案）**

**B2 的理由。** 复述 parent `apostol:linear-space` 的「subject to ten axioms listed in three groups」；三个分组本身已是 L1 兄弟节点；「剩下的『分组只是叙述性的』是无后果的元评论」。

**我的攻击与证据。**

*攻击一（路径 1，兄弟集合核对）——失败。* 我把 `apostol:linear-space` 名下全部 13 个 D1 兄弟从 `data/nodes-D1.jsonl` 筛出逐条读过。节点 statement 相对 parent 的唯一增量是 **2/4/4 这个具体分配**（parent 只说「three groups」，不说每组几条）。但三个 L1 分组节点各自的 statement 把自己的成员逐字写明：`apostol:closure-axioms`「(Axioms 1 and 2)」、`apostol:axioms-for-addition`「(Axioms 3 to 6)」、`apostol:axioms-for-multiplication-by-numbers`「(Axioms 7 to 10)」。**2/4/4 从这三条一眼可数。** 删除测试在残余内容上成立，这一路攻不动。

*攻击二（路径 3，逐句核对）——命中，但只伤 B2 的理由，不伤结论。* B2 的 KILL 理由把一句**节点里根本不存在的话**当作被杀对象引用：「剩下的『分组只是叙述性的』」。节点 statement 只有一句（`data/nodes-D1.jsonl:5`），全文为 "The definition consists of exactly ten axioms, presented in three groups: two closure axioms, four axioms for addition, and four axioms for multiplication by numbers."，**没有任何关于「分组只是叙述性的」的从句**。B2 虚构了一个从句、再把它贬为「无后果的元评论」以充实 KILL 理由。这是 reason 字段的事实错误，但被虚构的那句不存在，所以它的消失不会给节点增加任何应予保留的内容。

*攻击三（路径 4，公共前提）——命中，且改变处置方式。* `data/edges-D1.jsonl` 里指向本节点的边有 5 条，其中 **3 条是 `part-of` 且来自三个 L1 分组节点**（edges-D1.jsonl:10/11/12：`apostol:closure-axioms`、`apostol:axioms-for-addition`、`apostol:axioms-for-multiplication-by-numbers` 各以 `part-of` 指向它），另 2 条为 `requires`（:106 来自 `d:examples-are-asserted-to-satisfy-the-axioms-and-left-to-the-reader`，:112 来自 `d:example-1-verification-is-the-field-axioms-of-r`）。本节点是图中**唯一把三个分组收拢为「一张十条公理表」的汇聚点**。直接 KILL 会留下 5 条悬空边，其中三条 `part-of` 需改指 `apostol:linear-space`。

*攻击四（B2 自身规则的一致性）——命中。* B2 在 `audit-B2.md` §6 声明的豁免规则是「无增量但有子节点挂靠的枢纽节点判 FIX 而非 KILL」。按 `parent` 字段严格读，没有任何节点以本节点为 parent（我全库查过，0 条），所以严格意义上它不是「挂载枢纽」。但 B2 实际给出的 3 个 FIX 的入度为 6/8/6，而它 KILL 掉的节点入度最高达 10（`d:function-space-addition-is-pointwise`）、9（`d:function-space-scalar-multiple-is-pointwise`）、5（本节点、`x:least-squares-is-a-projection`）。**B2 的枢纽豁免没有可复现的阈值**，同等或更高连通度的节点一半被豁免一半被处死。详见第 5 节量化。

**裁定：FIX，不 KILL。** 冗余判断本身我翻不动——2/4/4 确实可从三个 L1 分组节点重新导出，这一点如实承认。但处置应为 FIX：把 2/4/4 并入 `apostol:linear-space` 的 statement，并把 edges-D1.jsonl:10/11/12 三条 `part-of` 改指 `apostol:linear-space`，然后才能删。B2 的 reason 需重写（含虚构从句）。

### 2.2 `d:axioms-2-7-8-9-are-the-scalar-dependent-axioms` — B2: KILL → **ADJ2: KEEP（完全翻案）**

**B2 的理由。** 复述 parent `apostol:complex-linear-space` 首句——parent 已逐条点名这四条。「剩下的『**其余六条只谈 V 中元素**，故不受标量域改变影响』是 10 减 4 的直接补集，读 parent 一眼可得。」

**我的攻击与证据。这一票 B2 判错了，因为它引述的第二句不是节点写的那一句，而恰好是节点写来防止的那个错误。**

*路径 3（逐句核对）命中。* 节点 statement 第二句（`data/nodes-D1.jsonl:24`）逐字为：

> "The remaining six axioms name no scalar other than the fixed numbers -1 and 1 (in Axioms 6 and 10), which lie in both fields, and are therefore untouched by the change of scalar field."

节点说的是：其余六条**确实提到了标量**，只是提到的是 −1 和 1 这两个**定数**，而这两个数**同时属于 R 和 C**，所以换标量域对它们无影响。

B2 把这句转述成「其余六条**只谈 V 中元素**」。这个转述是**假的**，而且是可从 source 直接否证的假：

- `source/apostol-ch15/15.02.md:23` AXIOM 6：`For every x in V, the element $(-1)x$ has the property` —— 出现标量 **−1**。
- `source/apostol-ch15/15.02.md:49` AXIOM 10：`For every x in V, we have 1x = x.` —— 出现标量 **1**。

所以「其余六条只谈 V 中元素」对公理 6、10 直接为假。

*这正是节点的判别力所在。* B2 主张「10 减 4 的直接补集，读 parent 一眼可得」。但**朴素取补集恰好会得出 B2 写下的那个错误结论**：数一下十条里哪几条出现了数，会数出 2、6、7、8、9、10 共六条，于是「提到数的公理」与「Apostol 要替换的公理」两个集合**并不相同**。节点承担的正是这个差额的**理由**：6 和 10 提到的是 ±1，而 ±1 ∈ R ⊂ C，替换在它们身上是空操作，所以 Apostol 的替换清单只列 2、7、8、9。

parent `apostol:complex-linear-space` 的 statement 给的是**事实**（"If real number is replaced by complex number in Axioms 2, 7, 8 and 9, the resulting structure is a complex linear space; its scalars are the complex numbers. All the theorems proved for real linear spaces are valid for complex linear spaces as well."），**没有一个字**解释为什么只有这四条、为什么 6 和 10 不在其中。这是 brief 路径 2 的教科书情形：**parent 给事实，节点给「为什么恰好是这四条」的理由，删除测试对后者不成立。**

*反向验证：B2 自己被这个坑绊倒了。* 一个「读 parent 一眼可得」的补集，不该让执行删除测试的审计员在写 KILL 理由时把它写错。B2 的 reason 字段本身就是这个节点存在价值的实证——**没有它，做这道题的人确实会得出「其余六条只谈 V 中元素」这个错误概括。**

*入度。* `data/edges-D1.jsonl:119` 有 1 条入边（`d:example-2-shows-the-scalars-decide-real-or-complex` 以 `requires` 指向它），且该来源节点也被 B2 判死，故入度不构成独立论据，此处不据此加分。

**裁定：KEEP，完全翻案。** 死因 5（伪抽象/层塌缩）不成立：节点承担的是 parent 未给的理由，而非 parent 的改写。附带记录一条 B2 的正确性问题（见第 4 节）。

### 2.3 `d:an-example-is-a-set-plus-two-explicit-operations` — B2: KILL → **ADJ2: KEEP（翻案，据末句）**

**B2 的理由。** 与兄弟 `d:linear-space-is-a-set-together-with-two-operations` 同题；后者已写「线性空间不是集合本身，而是集合 V 配上加法规则与数乘规则；只给出 V 什么也没给出」，**并且已经把本节点赖以成立的 15.03 原句收作自己的锚点**。保留前者因为它另有「同一底集换运算即另一空间」的判别力。

**我的攻击与证据。**

*B2 的前半对。* 我核对了 `d:linear-space-is-a-set-together-with-two-operations`（`data/nodes-D1.jsonl:1`）的锚点，确认它的第二条锚点逐字就是 `"If we specify the set V and tell how to add its elements and how to multiply them by numbers, we get a concrete example of a linear space."`，与本节点的唯一锚点**完全同一 `(file, quote)` 对**——这是 brief 所列的 **B 型借用引文**，两节点共用一条引文。本节点 statement 第一句（三项数据：V、加法规则、数乘规则）相对该兄弟确实是改写，这一半我翻不动。

*路径 3（B2 只处理了 statement 的前半）命中。* 节点 statement 的末句（`data/nodes-D1.jsonl:42`）逐字为：

> "...which is why the section fixes the operations before the sets: **Examples 1 to 3 name their own operations, Example 4 inherits those of V_n, and Examples 5 to 12 share the ones given in the function-space preamble.**"

这是一张**15.3 节全部十二个例子的运算来源普查表**，把十二个例子按「自带运算 / 继承 V_n / 共用函数空间前言」分成三段。B2 的 KILL 理由**一个字也没碰这句**——它只论证了第一句与兄弟同题，然后停下。

*该普查表不可从 parent 或兄弟重新导出。*
- parent `apostol:linear-space` 的 statement 讲抽象定义，无一字涉及 15.3 的例子编号或它们的运算来源。
- 兄弟 `d:linear-space-is-a-set-together-with-two-operations` 讲的是「集合 + 运算」这个本体论要点与「换运算即换空间」，同样无例子编号分段。
- 该分段是对 §15.3 **篇章组织结构**的观察，而非任何单条公理或单个例子的性质，因此不在任何单个例子节点里。

*普查表本身经 source 核实为真*（`source/apostol-ch15/15.03.md`）：例1（:5）自带 "ordinary addition and multiplication"、例2（:7）自带复数加法与实数乘、例3（:9）自带 "in the usual way in terms of components"；例4（:11）取 V_n 中向量的子集，运算继承 V_n；:13–19 是函数空间前言，给出 `(f + g)(x) = f(x) + g(x)`、`af`、零元，随后 :21–35 的例5至例12 全部落在该前言之下。**三段分界与节点所述完全一致。**

*节点类型佐证。* 本节点 `node_type` 为 `method`（「怎样造出一个例子」的操作条款），兄弟为 `concept`（「线性空间是什么」的本体论条款）。B2 把两者当「同题」，混淆了方法与概念。

*入度。* `data/edges-D1.jsonl:110`、`:123` 两条入边（`d:operations-of-example-1-are-ordinary-arithmetic`、`d:operations-of-example-3-are-componentwise` 以 `requires` 指向），但这两个来源节点也被 B2 判死，故不据此加分。

**裁定：KEEP，翻案。** 依据是末句的运算来源普查表，它落在锚点射程之外（brief 现象二：生产者在锚点射程外「再加一条洞见」），也落在 B2 冗余论证的射程之外。可接受的压缩方案：删去与兄弟重复的第一句、保留末句普查表。但**不得整节点删除**。

### 2.4 `d:example-1-verification-is-the-field-axioms-of-r` — B2: KILL → **ADJ2: KILL 维持（翻案失败）**

**B2 的理由。** 逐条把十条公理映射到 R 的算术律，是公理在最熟悉情形下的纯代入，无判别力；结论「本例无非平凡验证」已被 parent `d:example-1-the-real-numbers-form-a-linear-space` 的「the degenerate case against which the other examples should be read」覆盖。与被杀的 `d:example-3-verification-reduces-to-arithmetic-in-each-component` 同 species。

**我的攻击与证据（四条路径全部走完，全部未能翻案）。**

*路径 1（兄弟集合核对）失败。* parent `d:example-1-the-real-numbers-form-a-linear-space` 名下只有两个兄弟：本节点与 `d:operations-of-example-1-are-ordinary-arithmetic`（后者亦被 B2 判死）。我逐条读了 parent 与该兄弟的 statement。parent 确实含 "the degenerate case against which the other examples should be read"，与本节点末句「无非平凡验证」是同一判断的两种说法。B2 的归属核对成立。

*路径 3（末句）失败——这次末句也已被覆盖。* 节点末句为 "No verification here is non-trivial, which is exactly why the example carries no information about the axioms' independence."。我本想据「公理独立性」这一层做翻案：parent 说的是「读其他例子的基准」，不完全等于「不提供公理独立性信息」。但这条洞见在图里**另有落点且措辞更准**：兄弟例3 的 parent `d:example-3-v-n-with-componentwise-operations`（`data/nodes-D1.jsonl:50`）statement 第二句逐字为 "Everything in the axiom list can be read off from it, which makes it a **poor test of whether a given axiom is really needed**."——「是否真的需要某条公理」就是公理独立性。该节点被 B2 判 KEEP。于是「熟悉例子检验不了公理独立性」这条判断在图中已由一个存活节点承担，本节点重复它。

*路径 4（公共前提）失败。* 入度为 **0**（`data/edges-D1.jsonl` 中无任何边以它为 `dst`）。它只有两条出边（:111 `part-of` 指 parent，:112 `requires` 指 `d:ten-axioms-listed-in-three-groups`）。删除它不使任何节点悬空。

*路径 5（操作化未定义）不适用。* 本节点有 `parent` 字段，B2 §6.4/§6.5 的操作化缺陷与它无关。

*正文映射本身无判别力。* statement 主体是把十条公理逐条对应 R 的算术律。对 V = R 这一情形，此映射对任何知道 R 是域的读者都是即时的纯代入，不产生任何「这个集合是不是线性空间」的判定能力。这符合死因 5。

**裁定：KILL 维持。翻案失败。** 我唯一能加的是一条 statement 措辞不精确（见第 4 节，不改变判决）。

### 2.5 `d:function-space-zero-is-the-everywhere-zero-function` — B2: KILL → **ADJ2: KILL 维持，但 B2 的理由须重写**

**B2 的理由。** 复述 parent `apostol:function-space` 的「with the everywhere-zero function as zero element」。附加判据「不含该函数的函数集不可能是线性空间」是**公理5 节点 `d:axiom-5-existence-of-zero-element` 的直接代入**；所举实例（次数恰为 n）已由 `d:degree-exactly-n-has-no-zero-element` 承担。

**我的攻击与证据。**

*路径 3 命中一半：B2 挂错了公理。* 节点 statement 第二句（`data/nodes-D1.jsonl:60`）逐字为：

> "A set of functions that happens to exclude this function, such as the polynomials of degree exactly n, cannot be a linear space under the pointwise operations, **since Axiom 2 forces 0f = O into the set.**"

节点写的是**公理 2**（数乘封闭：取 a = 0 则 0f 必须留在集内），不是公理 5。这两者不是同一个论证，强弱也不同：公理 5 只**断言存在**一个零元，一个集合可以「没有零元故违反公理5」；而公理 2 是**强迫**——只要集合非空且对数乘封闭，0f = O 就被推回集内，因此排除零函数的集合连公理 2 都过不了。节点选的是更强的那条。B2 把它当作「公理5 节点的直接代入」，**代入的是另一条公理**，该冗余论证因此没有击中 statement 第二句。

*但改用正确的公理后，冗余仍然成立——这一路最终没能翻案。* 公理 2 强迫机制在图中已由**两个存活节点**承担，且都写得比本节点完整：
- `d:zero-polynomial-is-included-by-convention`（`data/nodes-D1.jsonl:66`，B2 判 KEEP）："the zero polynomial is the element O demanded by Axiom 5, and it is also 0p for any member p, so **excluding it would break Axiom 2 and Axiom 5 at once**." —— 同一机制，且同时点出两条公理。
- `d:function-space-axioms-reduce-pointwise-to-facts-about-real-numbers`（`data/nodes-D1.jsonl:61`，B2 判 KEEP）："Axioms 5 and 6 are met by the zero function and by (-1)f, **both of which Axiom 2 puts back into the set**." —— 同一机制。

所以第二句的判别力在图中重复出现两次，本节点是第三次。

*第一句（类型警告）亦被覆盖。* 第一句「零元是处处取零的函数，不是数 0」相对 parent 的 "with the everywhere-zero function as zero element" 只是把「不是数 0」显式化。而 `d:zero-element-of-a-function-space-is-a-pointwise-identity`（`data/nodes-D2.jsonl:31`）把这个类型区分用到了实处（「和为 O 的关系式是对每个变量值都成立的恒等式」，并举 15.07 的两处用法）。本节点的类型警告是它的弱化版。

*路径 4（公共前提）——有代价，但不足以翻案。* 入度 2：`data/edges-D1.jsonl:152`（`d:function-space-axioms-reduce-pointwise-to-facts-about-real-numbers` → `requires`）与 `:171`（`d:zero-polynomial-is-included-by-convention` → `requires`）。**这两个来源节点都被 B2 判 KEEP**，所以删除本节点会留下 2 条来自存活节点的悬空 `requires` 边。这是真实代价，但两个来源节点各自的 statement 都已自带该机制（见上），改指 `apostol:function-space` 即可修复，不构成保留理由。

**裁定：KILL 维持，但 B2 的 reason 必须重写**（现文把公理 2 的论证说成公理 5 的代入，并因此漏掉了真正的冗余对象 `d:zero-polynomial-is-included-by-convention`）。删除前需修 edges-D1.jsonl:152 与 :171 两条入边。

### 2.6 `d:degree-exactly-n-is-not-a-subspace-of-degree-at-most-n` — B2: KILL → **ADJ2: KILL 维持（翻案失败）**

**B2 的理由。** 从 parent `d:degree-exactly-n-is-not-a-linear-space`（不是线性空间）加 `apostol:subspace` 的定义一步即得；所谓寓意「被包含在线性空间中并沿用其运算并不足够」就是子空间定义本身的改写。

**我的攻击与证据（全部路径走完，未能翻案）。**

*路径 2（parent 给事实、节点给理由）失败——这次方向相反。* 我试图论证 parent 只说「不是线性空间」，而本节点给的是「子集关系 + 运算继承仍不够」这层理由。但核对 `apostol:subspace` 的 statement（`data/inherited/nodes-A1.jsonl:20`）：

> "Given a linear space V, a nonempty subset S of V is called a subspace of V **if S is itself a linear space under the same operations** of addition and multiplication by scalars."

这是一个**条件式定义**：子集 + 同运算是前提，「S 本身是线性空间」是待验条件。所以「被包含在线性空间中并沿用其运算并不足够」**就是这个定义的直接读法**，不是对定义的补充。B2 说它「就是子空间定义本身的改写」，我核对后认为这个判断准确。节点末句因此不构成路径 2 意义上的「理由」。

*路径 3（末句）失败。* 末句 "The pair shows that being contained in a linear space and carrying its operations is not enough." 正是上面已被覆盖的那句，B2 明确处理了它（「所谓寓意…就是子空间定义本身」）。不存在 B2 未碰的后半。

*路径 4（公共前提）失败。* 入度 **0**。四条出边（`data/edges-D1.jsonl:186` `part-of` → parent、`:187` `requires` → `apostol:theorem-15-4-subspace-criterion`、`:188` `other` → `d:subspace-satisfies-all-linear-space-axioms`、`:189` `contrasts` → `d:example-7-polynomials-of-degree-at-most-n`）。删除不使任何节点悬空。

*一步导出确实成立。* 链条为：parent 已确立「次数恰为 n 的集合封闭性失效」；`apostol:theorem-15-4-subspace-criterion`（`data/inherited/nodes-A1.jsonl:21`）给出「S 是子空间 ⟺ S 满足封闭公理」。封闭失效 + 该充要条件 ⇒ 不是子空间。**一步，且不含任何新判断。** 子集关系本身（次数 = n ⇒ 次数 ≤ n）是定义级的即时事实。

*我能找到的唯一保留论据，且它不足以翻案。* 本节点的 `sections` 为 `["15.03","15.06"]`，是**全部 81 个 D1 节点中唯一带 15.06 的**（B2 §5.1 称「15.06 无任何 D1 节点」，与此不符，见第 4 节）。删除它会使 15.06 的 D1 覆盖归零，并切断 15.03 反面例子与 15.06 子空间判据之间唯一的 D 层连接。但**覆盖率不是删除测试的判据**：B2 的尺子问「学习者能否重新导出」，而不问「图的分节覆盖是否好看」。以覆盖为由保留一个可一步导出的节点，等于用凑数替代增量。我拒绝用这条翻案。

**裁定：KILL 维持。翻案失败。** 附带记录：删除后 15.06 的 D1 覆盖归零（第 7 节），以及 B2 §5.1 的计数与本节点 sections 矛盾（第 4 节）。另注 B2 §6.1 自陈的规则空缺在此实例化：本节点是 parent（被判 FIX 的枢纽）四个子节点之一，杀掉它使该枢纽的挂载数从 4 降到 3，B2 承认它给不出「枢纽还算不算枢纽」的规则。

### 2.7 `x:least-squares-is-a-projection` — B2: KILL → **ADJ2: FIX（部分翻案：不得直接删）**

**B2 的理由。** 复述兄弟 `x:best-approximation-by-the-projection` 的 divergence 末段；statement 是 `x:orthogonality-of-the-residual` 与 `x:projection-onto-a-subspace` 的不变量换一种说法；「所谓两侧动机相反（逼近论 vs 不可解方程）正是上述末段已给的同一件事」。保留兄弟，因为它另有「定理 vs 定义」的位置互换与唯一性条款存否。

**我的攻击与证据。**

*路径 5（操作化未定义）命中，且 B2 自己承认。* B2 在 `audit-B2.md` §6.4 写明：「**SPEC 缺口：X 层节点没有 parent。** 删除测试的原始形式建立在 parent 之上，而 `x:` 节点只有 `apostol_ids` / `strang_ids` 两侧成员。…**这是我自己的操作化，SPEC 未规定，若上层另有约定则本层 22 个判决需重跑。**」本节点是 `x:` 节点，是这 22 个之一，且是其中**唯一被判死的**。按 brief 的要求我在此明确区分：这使该判决**依据未定义的操作化**，**不等于结论必错**。

*路径 4（公共前提）命中，这是最硬的一条。* `data/edges-X.jsonl` 中有 **5 条入边**以本节点为 `dst`（:93 `apostol:best-approximation-problem`、:94 `apostol:distance-between-elements`、:95 `strang:normal-equation`、:96 `strang:error-vector`、:97 `strang:solvability-condition`，全为 `is-a`）。我进一步查了这 5 个 L1 成员在整个 X 层的归属：

- **`strang:solvability-condition`** —— 全 X 层仅出现在本节点的 `strang_ids` 中，**别无他处**。
- **`apostol:distance-between-elements`** —— 全 X 层仅出现在本节点的 `apostol_ids` 中，**别无他处**。
- `strang:normal-equation` 另见于 `x:projection-onto-a-subspace`；`strang:error-vector` 与 `apostol:best-approximation-problem` 另见于 `x:best-approximation-by-the-projection`（B2 要保留的那个）。

也就是说：**B2 指定的替代节点 `x:best-approximation-by-the-projection` 并不覆盖被杀节点的全部两侧成员。** 直接删除会使 `strang:solvability-condition` 与 `apostol:distance-between-elements` 失去在 X 层的唯一落点，并留下 5 条悬空边。B2 的 KILL 理由完全没有检查成员覆盖，而 SPEC 恰恰把「成员归属」列为最严重的缺陷类别。

*路径 1/3（兄弟 statement 逐条核对）——部分命中。* 我逐字读了 B2 点名的三个兄弟。B2 说「两侧动机相反正是兄弟末段已给的同一件事」，这一点**不准确**。兄弟 `x:best-approximation-by-the-projection` 的 divergence 末句是：

> "Apostol's theorem instantiates to Fourier partial sums and Legendre approximation of continuous functions...; Strang's flows into least squares fitting of data, and he defers function approximation out of the chapter."

这讲的是**应用层的分流去向**（定理各自实例化成什么）。被杀节点的 divergence 讲的是**出发动机与提法**：Apostol 从逼近论出发、「哪个元素最近」自身即问题、全程无方程；Strang 从 Ax=b 无解出发、最小二乘是抢救操作、4.1 在投影尚未定义前就先announce误差向量 b−Ax 落在 N(Aᵀ) 里。**「定理各自流向何处」与「两书为何各自提出这个问题」不是同一件事。** 前者是下游，后者是上游。

此外被杀节点 divergence 含一条**迁移失败后果**：「a reader of ch15 alone would not know that this theory solves overdetermined systems」——单读 Apostol 第15章者不会知道这套理论能解超定方程组。这是对齐层特有的判断力（读者会缺什么），三个兄弟节点无一含此内容。

*但 statement 层面 B2 是对的。* 被杀节点的 statement 两句（「无法精确表示时最佳表示由投影得到」+「不可解的精确问题被替换为可解的正交性条件」）确与 `x:orthogonality-of-the-residual`（「差落在整个子空间的正交方向上，这一条件刻画投影」）与 `x:best-approximation-by-the-projection`（「投影是唯一最小化者」）的不变量重合。这一半我翻不动。

**裁定：FIX，不 KILL。** 三条依据：(1) 5 条入边中两个 L1 成员在 X 层别无落点，直接删触及 SPEC 的成员归属红线；(2) divergence 的上游动机对比与「单读一侧会缺什么」的迁移判断不在任何兄弟中；(3) 该判决依据 B2 自陈 SPEC 未定义的操作化。修法：把 statement 两句削去（确与两个兄弟重复），把 divergence 的动机对比与迁移后果提升为节点主张，并保留全部两侧成员归属。

### 2.8 `x:dimension-versus-rank` — B2: FIX → **ADJ2: FIX 同意，补一项修法**

**B2 的理由与修法。** statement 首句与 `x:all-bases-are-equinumerous` 重复；第三句是 `strang:dimension` 自带的告示；真增量是一条负向对齐（rank 在 Apostol 第15章 0 次出现），故 Rank Theorem、Counting Theorem、Fundamental Theorem part 1 是 Strang 单边增加物。修法：改标为单边缺口节点。

**我的核验。** 三项承重事实我都独立复核，全部成立：

1. **`grep -rniw rank source/apostol-ch15/` 返回 0 行。** B2 的核心事实为真。
2. **第三句确与 `strang:dimension` 重复。** 该 L1 节点（`data/inherited/nodes-S1.jsonl:19`）statement 末句逐字为 "We never speak of the rank of a space or the dimension of a basis."，与被指句「两个词不可互换：只有一个对空间有定义、只有一个对矩阵有定义」是同一告示。
3. **首句与 `x:all-bases-are-equinumerous` 部分重复。** 后者（`data/nodes-X.jsonl:7`）："This is the theorem that makes 'dimension' a well-defined function of the space rather than of a chosen basis." 被指句「维数是一个空间所有基的公共元素个数」把该定理的结论当定义用。重复为实，B2 的削减方向正确。

**我要补的一项修法（B2 未发现）。** 本节点入度 8，是全部 137 个节点中最高。但把入边来源与节点自己的成员表对照，发现**不一致**：`data/edges-X.jsonl:37/38/39` 三条 `is-a` 边分别来自 `strang:rank-theorem`、`strang:counting-theorem`、`strang:fundamental-theorem-of-linear-algebra-part-1`，而这三个 id **都不在本节点的 `strang_ids` 里**（该字段只有 `strang:dimension` 与 `strang:pivot-rows-basis-for-row-space` 两项）。三个 Strang 定理在边文件里声明自己是本节点的实例，节点却不认它们为成员。

这条不一致与 B2 的修法同向：B2 要把节点改标为「单边缺口」并把 Rank/Counting/FTLA-1 作为 Strang 单边增加物写进主张——那正好给这三条入边一个正当归属。所以修法应追加一条：**把这三个 id 补进 `strang_ids`**，使成员表与边文件一致。

**裁定：FIX，同意 B2，并追加成员表补齐一项。** 无异议可提。

### 2.9 `x:independence-criterion-and-its-consequences` — B2: FIX → **ADJ2: FIX 同意**

**B2 的理由与修法。** 首句与 `x:unique-coordinates-in-a-basis` 是同一双条件；等价链按 divergence 自己的话是「关于表示矩阵而非子空间的陈述，所以 Apostol 无法陈述」，即非共享不变量。真增量埋在 divergence 末句。修法：把末句（独立性失效时投影 p 仍唯一而系数 x-hat 不唯一）提升为节点主张。

**我的核验。**

1. **首句重复为实。** `x:unique-coordinates-in-a-basis`（`data/nodes-X.jsonl:6`）首句："Relative to a fixed basis, every element has exactly one representation...: existence comes from spanning, **uniqueness from independence**." 与本节点首句「生成族的独立性正是使表示唯一的条件」是同一双条件的两种写法。
2. **B2 指认的真增量在数学上成立。** divergence 末句称：独立性失效时，投影 p 仍存在且唯一，但系数向量 x̂ 不唯一。核验：p 是 b 在列空间 C(A) 上的正交投影，只依赖 C(A) 与 b，与 A 的列是否独立无关，故唯一；而 x̂ 满足 AᵀA x̂ = Aᵀb，列相关时 N(A) ≠ {0}，解集是 N(A) 的一个陪集，故不唯一。**正确。**
3. **该增量已有锚点支撑，提升进 statement 无需新锚点。** 节点第三条锚点 `4.2.md` 的 "## $A ^ { \mathrm { T } }$ A is invertible if and only if A has linearly independent columns."（93 字符，`grep -F` 通过）正是「独立性失效 ⇒ AᵀA 不可逆 ⇒ x̂ 不唯一」这一链条的原文依据。

**裁定：FIX，同意 B2。** 修法可直接执行。我另注一点供上层参考：B2 对这两个 FIX 的处理质量明显高于它对七个 KILL 的处理——两个 FIX 的 reason 都逐句核对了 statement 且指认的增量经我复核全部成立，而七个 KILL 中有三个的 reason 存在事实错误（见第 4、5 节）。**判活的理由比判死的理由写得更严谨，这与「判死看起来像在干活」的动机预期正好相反**，是对 B2 有利的证据。

## 3. 我未能翻案的节点及失败原因

**七个 KILL 我翻动了两个（完全翻案），另有两个改为 FIX（部分翻案：冗余成立但不得直接删），三个维持 KILL。**

### 3.1 完全翻案失败：`d:example-1-verification-is-the-field-axioms-of-r`

挡住我的证据，按对我的杀伤力排序：

1. **兄弟节点 `d:example-3-v-n-with-componentwise-operations`（存活）的第二句。** 我原打算据「本例不提供公理独立性信息」翻案，理由是 parent 只说「读其他例子的基准」，与「公理独立性」不同层。但该存活兄弟的 statement 逐字含 "which makes it a **poor test of whether a given axiom is really needed**"——「是否真的需要某条公理」即公理独立性。这条洞见在图中已有存活落点，我的翻案理由被直接占位。
2. **入度 0。** 路径 4 不可用：`data/edges-D1.jsonl` 中无任何边以它为 `dst`。删除不使任何节点悬空，我无法主张它是公共前提。
3. **statement 主体是纯代入。** 把十条公理逐条映射到 R 的算术律，对 V = R 这一情形无判定能力。我找不出任何一句落在 parent + 兄弟射程之外。
4. **有 `parent` 字段，路径 5 不适用。** 无法用「操作化未定义」攻击。

我诚实承认：这个节点我从四条路径都试过，没有一条能拿出证据。B2 判对了。

### 3.2 完全翻案失败：`d:function-space-zero-is-the-everywhere-zero-function`

这一个我**打中了 B2 的理由但没能救下节点**，值得区分清楚：

- **命中的部分**：B2 说第二句是「公理5 节点的直接代入」，而节点写的是**公理 2 强迫 0f = O 进入集合**。这是两条不同的公理、两个强弱不同的论证。B2 的冗余论证没有击中它声称击中的那句。
- **失败的部分**：换成正确的公理 2 之后，冗余**仍然成立**，而且比 B2 说的更严重——公理 2 强迫机制在图中已由**两个存活节点**承担：`d:zero-polynomial-is-included-by-convention`（"excluding it would break Axiom 2 and Axiom 5 at once"）与 `d:function-space-axioms-reduce-pointwise-to-facts-about-real-numbers`（"both of which Axiom 2 puts back into the set"）。本节点是第三次重复。
- 第一句的类型警告（零元是函数不是数 0）也被 `d:zero-element-of-a-function-space-is-a-pointwise-identity` 以更实用的形式承担。
- 入度 2 且两个来源节点都存活，这是真实代价，但两个来源节点各自的 statement 都自带该机制，改指 parent 即可修复，不构成保留理由。

**修正 B2 的理由 ≠ 翻案。** 结论维持。

### 3.3 完全翻案失败：`d:degree-exactly-n-is-not-a-subspace-of-degree-at-most-n`

挡住我的证据：

1. **`apostol:subspace` 的 statement 是条件式定义。** 我原想走路径 2（parent 给事实、节点给理由），主张「子集 + 同运算仍不够」是 parent 没给的理由。但该 L1 定义逐字为 "a nonempty subset S of V is called a subspace of V **if S is itself a linear space under the same operations**"——子集与同运算是前提、「本身是线性空间」是待验条件，所以「不够」就是定义的直接读法。B2 说「就是子空间定义本身的改写」，我核对后认为准确。
2. **定理 15.4 使推导成为一步。** `apostol:theorem-15-4-subspace-criterion`：「S 是子空间 ⟺ S 满足封闭公理」。parent 已给封闭性失效，一步即得，不含新判断。
3. **入度 0。** 路径 4 不可用。

**我主动放弃的一条翻案理由，记录在此以证诚实：** 本节点是 81 个 D1 节点中**唯一 sections 含 15.06 的**，删掉它会使 15.06 的 D 层覆盖归零。这是真实后果，但**覆盖率不是删除测试的判据**——B2 的尺子问「能否重新导出」，不问「分节覆盖是否好看」。用覆盖率保留一个可一步导出的节点，等于用凑数替代增量。我拒绝用它翻案，只把它记入第 7 节作为删除后果告知。

### 3.4 只做到部分翻案的两个

- **`d:ten-axioms-listed-in-three-groups`**：冗余判断我**翻不动**——2/4/4 确实可从三个 L1 分组节点各自 statement 里的「(Axioms 1 and 2)」「(Axioms 3 to 6)」「(Axioms 7 to 10)」一眼数出。我只翻动了处置方式（3 条 `part-of` 入边需先改指），以及指出 B2 的 reason 引用了一句节点里不存在的从句。
- **`x:least-squares-is-a-projection`**：statement 两句与两个兄弟的不变量重合，这一半我**翻不动**。翻动的是「直接删」这个动作：两个 L1 成员在 X 层别无落点、5 条入边悬空、且该判决依据 B2 自陈 SPEC 未定义的操作化。

### 3.5 我没能对任何节点使用的攻击路径

- **路径 1（B2 漏读 sibling 集合）：0 次得手。** 我把五个相关 parent 名下的全部兄弟从 `data/nodes-D1.jsonl` 逐条筛出读过（`apostol:linear-space` 13 个、`apostol:function-space` 12 个、`d:degree-exactly-n-is-not-a-linear-space` 4 个、`d:example-1-…` 2 个、`apostol:complex-linear-space` 1 个），另读了 B2 点名的全部 X 层兄弟。**B2 声称「某 sibling 已承担」的每一处，我核对后都确认那个 sibling 的 statement 真的说了那件事。** brief 预期的「很可能没说」在本批九个节点上没有出现。这是对 B2 有利的证据，如实记录。

得手的是路径 2（1 次：2.2）、路径 3（2 次：2.2、2.3）、路径 4（2 次：2.1、2.7）、路径 5（1 次：2.7）。

## 4. 正确性问题（带 `文件:行号`）

分两类：B2 判决文本的错误，与节点/数据本身的错误。

### 4.1 B2 判决文本的事实错误（3 处）

**(1) `report/audit-B2-verdicts.jsonl:24` — 转述与原文相反，且转述内容可从 source 直接否证。**
B2 写：「其余六条**只谈 V 中元素**，故不受标量域改变影响」。
节点 `data/nodes-D1.jsonl:24` 实际写："The remaining six axioms **name no scalar other than the fixed numbers -1 and 1 (in Axioms 6 and 10)**, which lie in both fields..."
否证：`source/apostol-ch15/15.02.md:23`（AXIOM 6 含 `$(-1)x$`）与 `source/apostol-ch15/15.02.md:49`（AXIOM 10 含 `1x = x`）都出现标量。**「只谈 V 中元素」对公理 6、10 为假。** 这是本批最实质的一处，直接导致误杀（见 2.2）。

**(2) `report/audit-B2-verdicts.jsonl:5` — 引用了一句节点里不存在的从句。**
B2 写：「剩下的『分组只是叙述性的』是无后果的元评论」。
节点 `data/nodes-D1.jsonl:5` 的 statement 只有一句，全文无任何关于「分组只是叙述性的」的从句。B2 虚构了一个被杀对象再贬低它。

**(3) `report/audit-B2-verdicts.jsonl:60` — 挂错公理。**
B2 写：附加判据「是**公理5 节点** `d:axiom-5-existence-of-zero-element` 的直接代入」。
节点 `data/nodes-D1.jsonl:60` 写的是 "since **Axiom 2** forces 0f = O into the set"。公理 5 只断言零元存在；公理 2 是强迫机制。两者强弱不同。B2 因此漏掉了真正的冗余对象（`d:zero-polynomial-is-included-by-convention`，`data/nodes-D1.jsonl:66`）。结论仍成立但理由须重写。

### 4.2 B2 报告正文的计数矛盾（1 处）

**`report/audit-B2.md:107`** 称「**15.06**、15.07、15.08、15.10、15.11、15.13、15.14、15.15 无任何 D1 节点」，并在 §5.1 据此得出「全章 16 个 source 文件中有 12 个未被 D1 触及」。
但 `data/nodes-D1.jsonl:71` 的 `sections` 为 `["15.03","15.06"]`。**15.06 有 1 个 D1 节点**，未触及文件数应为 11 而非 12。
附带后果：该节点正是 B2 判死的对象之一，若执行 KILL，B2 §5.1 的陈述会在删除后**变成**真的。建议上层在应用清单里注明这一先后关系。

### 4.3 节点数据本身的问题（2 处）

**(1) `data/nodes-X.jsonl:8` — 成员表与边文件不一致。**
`x:dimension-versus-rank` 的 `strang_ids` 只有 `strang:dimension` 与 `strang:pivot-rows-basis-for-row-space`，但 `data/edges-X.jsonl:37/38/39` 三条 `is-a` 边的 src 分别是 `strang:rank-theorem`、`strang:counting-theorem`、`strang:fundamental-theorem-of-linear-algebra-part-1`，三者均不在该成员表内。边声明了归属，节点不认。修法见 2.8。

**(2) `data/nodes-D1.jsonl:46` — statement 措辞不精确（不改变判决）。**
"Axioms 1 and 2 are closure of R under its own operations"。对 V = R，公理 2 的标量集恰好也是 R，所以「R 在自身运算下封闭」这个说法成立；但公理 1 与公理 2 是两种不同的封闭（元素间加法 vs 标量与元素相乘），把两者合并称为 "closure of R under its own operations" 掩盖了这个区分，而该区分正是这个例子唯一的可讲之处（见 `data/nodes-D1.jsonl:45` 的「本例是全节唯一两个运算无法按类型区分的例子」）。属瑕疵，非错误。

### 4.4 我核验通过、未发现问题的项

- **九个节点的全部 17 条锚点，`grep -F` 逐字全部命中**（长度 54–172 字符，均在 SPEC 的 30–200 区间内，无跨行）。无 A/B/C 型失败被发现于本批；B 型「借用引文」存在一例但属正当共用（2.3，两节点共用 15.03 同一句），已在该节说明。
- **`grep -rniw rank source/apostol-ch15/` = 0 行**，B2 §3 的承重事实为真。
- 2.9 的数学核验（列相关时投影 p 唯一、系数 x̂ 不唯一）成立。
- 2.3 的十二例运算来源普查表与 `source/apostol-ch15/15.03.md:5–35` 逐例核对一致。

## 5. B2 方法评价：是否存在系统性过度开火

**结论：不存在「为显得在干活而滥杀」意义上的系统性过度开火。但存在一个真实且可量化的缺陷——KILL 理由的自检只验证了「点名的 id 是否真实」，没有验证「对被杀节点内容的描述是否属实」。** 分开陈述证据。

### 5.1 反对「系统性过度开火」的证据（四项，均为机械可复核）

**(1) KILL 率在三层之间相差 7 倍，不是均匀开火。**

| 文件 | n | KILL | KILL 率 |
|---|---|---|---|
| `data/nodes-D1.jsonl` | 81 | 25 | **30.9%** |
| `data/nodes-A2-x2.jsonl` | 34 | 3 | 8.8% |
| `data/nodes-X.jsonl` | 22 | 1 | **4.5%** |

一个以「判死看起来像在干活」为动机的审计员没有理由把火力如此不均地集中在一层。21% 的总体死亡率是 D1 层 30.9% 与另两层 4.5%/8.8% 的加权结果，**不是一个全局阈值**。而 D1 层高死亡率有独立的结构解释（见 (4)）。

**(2) 29 个 KILL 中，0 个是「循环判死」。** 我机械检查了每个 KILL 的 `reason` + `suggested_fix` 里点名的全部节点 id：**每一个 KILL 都至少点名了一个「存活节点」或「L1 继承节点」作为冗余对象**，没有任何一个 KILL 的替代对象全部是 B2 自己也判死的节点。如果 B2 在滥杀，最容易出现的自相矛盾就是 A 因 B 而死、B 因 A 而死，这一项为 0。

**(3) 29 个 KILL 的 reason 中，0 个虚构 id。** 我用正则抽出全部 `d:`/`x:`/`apostol:`/`strang:` token 逐一比对四个节点文件的真实 id 集合，**假 id 数为 0**，与 B2 §7 自检表所称一致。B2 自陈首轮曾有 9 个凭印象手打的 id 与 3 处简写，均已改正——**自检声明经我独立复核为真**。

**(4) KILL 集中在图的叶子上，KEEP 不然。** 入度统计（`data/edges-*.jsonl` + `data/inherited/edges-*.jsonl` 全量）：

| 判决 | n | 平均入度 | 中位入度 | 入度为 0 的比例 |
|---|---|---|---|---|
| KEEP | 105 | 2.55 | 1 | 34% |
| FIX | 3 | 6.67 | 6 | 0% |
| KILL | 29 | 1.45 | 0 | **55%** |

被杀节点有一半以上是图的叶子，平均入度约为存活节点的一半。这与「冗余节点是后加的、没人依赖它」的预期一致，与「随机开火」不一致。

**(5) 判活的理由比判死的理由写得更严谨。** 两个 FIX（2.8、2.9）的 reason 都逐句核对了 statement，指认的增量经我独立复核**全部成立**（含 `grep -w rank` = 0 这一承重事实，以及列相关时 p 唯一而 x̂ 不唯一这一数学判断）。而七个 KILL 里有三个 reason 含事实错误。**若动机是「判死显得在干活」，严谨度的分布应该相反。**

### 5.2 支持「存在缺陷」的证据：KILL 理由的内容描述未经自检

我手检的 7 个 KILL 中，**3 个的 reason 对被杀节点或相关数学的描述不属实**（详见第 4.1 节）：

| 节点 | 缺陷类型 | 后果 |
|---|---|---|
| `d:axioms-2-7-8-9-…` | 把节点第二句转述成相反的内容（「其余六条只谈 V 中元素」） | **误杀**，已翻案 |
| `d:ten-axioms-…` | 引用一句节点里不存在的从句 | 结论不变，理由须重写 |
| `d:function-space-zero-…` | 挂错公理（说公理 5，节点写公理 2） | 结论不变，理由须重写，且漏掉真正的冗余对象 |

**机制诊断。** B2 §7 的自检表有一项是「每个 KILL 都点名复述对象」，做法是校验 reason 里的 id **是否真实存在**。这个校验对上述三处**全部无效**：三处点名的 id 都真实存在、都确实是 parent 或兄弟，错的是**对那些节点或被杀节点说了什么的转述**。这与我笔记里那条方法学结论同构——**机器校验「引文是原文子串」证明不了「引文支撑其所挂断言」**；这里是它的判决层版本：**校验「id 真实」证明不了「冗余论证击中了 statement」。**

这三处缺陷有一个共同形态：**B2 处理 statement 第一句、然后用一句自己概括的话代表剩余内容**。2.2 的第二句、2.3 的末句、2.5 的第二句都是这样被概括掉的。其中 2.3 的末句（十二例运算来源普查表）B2 一个字未提。这与 brief 现象二一致：**缺陷集中在末句，而末句也正是审计员最容易跳过的地方。**

### 5.3 我不能从 7 个外推到 29 个

必须说明抽样问题：**我手检的 7 个 KILL 不是随机抽样**，是任务书指定的。它们很可能正是最有争议的那批。所以「3/7 的 reason 含事实错误」**不能外推**为「29 个 KILL 里有 12 个含事实错误」。

我能对全部 29 个说的话只限于机械可查的部分：0 个循环判死、0 个虚构 id、55% 入度为 0。这三项都对 B2 有利。**未经人工逐句核对的另外 22 个 KILL，其 reason 描述是否属实，我没有检查，不作断言**（见第 7 节）。

### 5.4 一处规则不一致（非过度开火，但需上层裁定）

B2 §6 的豁免规则是「无增量但有子节点挂靠的枢纽节点判 FIX 而非 KILL」，但**没有可复现的阈值**：

- 3 个 FIX 的入度：6、8、6。
- 被 KILL 的最高入度：**10**（`d:function-space-addition-is-pointwise`）、**9**（`d:function-space-scalar-multiple-is-pointwise`）、5（`d:ten-axioms-listed-in-three-groups`）、5（`x:least-squares-is-a-projection`）。

按 `parent` 字段严格读，被杀的这四个都没有以它们为 parent 的子节点（我全库查过，0 条），所以严格意义上都不是「挂载枢纽」，B2 形式上没有违规。但入度 9、10 的节点被删会留下 9、10 条悬空边，而入度 6 的被豁免。**「枢纽」若按 `parent` 定义则应明说，若按入度定义则阈值应给出。** 这是 SPEC 缺口而非 B2 的判断失误，B2 自己在 §6.1 也承认给不出规则。

### 5.5 总评

B2 的**尺子（删除测试）用得一致**，判决的**结构性证据（入度分布、层间差异、零循环判死、零假 id）经我独立复核全部支持它不是在滥杀**。它的缺陷在**理由写作与自检的覆盖面**：自检验证了 id 的真实性，没有验证冗余论证是否真的覆盖了 statement 的每一句。七个 KILL 里因此漏掉一个真误杀（2.2）、两个理由须重写（2.1、2.5）、两个处置须从 KILL 改 FIX（2.1、2.7）。**改判率 4/7，但其中只有 1 个是节点本身被救活。**

## 6. 30 字符 SPEC 缺陷实例计数

SPEC:54 要求 `quote` 长度 **30–200 字符且不跨行**。本批九个节点涉及的原文片段中，**不达 30 字符下限因而无法直接引用者共 8 个**（逐一 `len()` 实测）：

| # | 原文片段 | 位置 | 字符数 | 达标 |
|---|---|---|---|---|
| 1 | `x + (- 1) x = O.` | `15.02.md:26` | **16** | ✗ |
| 2 | `a (b x) = (a b) x.` | `15.02.md:34` | **18** | ✗ |
| 3 | `a (x + y) = a x + a y.` | `15.02.md:40` | **22** | ✗ |
| 4 | `(a + b) x = a x + b x.` | `15.02.md:46` | **22** | ✗ |
| 5 | `(f + g) (x) = f (x) + g (x)` | `15.03.md:16` | **27** | ✗ |
| 6 | `Closure axioms`（分组标题） | `15.02.md:5` | **14** | ✗ |
| 7 | `Axioms for addition`（分组标题） | `15.02.md:11` | **19** | ✗ |
| 8 | `x + O = x \quad f o r a l l x i n V.` | `15.02.md:20` | 36 | ✓ |
| 9 | `Axioms for multiplication by numbers`（分组标题） | `15.02.md:29` | 36 | ✓ |

**计数：公理方程 5 条中 4 条不达标**（公理 6、7、8、9；公理 5 的 36 字符仅因含 OCR 噪声 `\quad f o r a l l x i n V.` 才过关）；**函数空间加法定义式不达标**（27 字符）；**三个分组标题中 2 个不达标**。合计 **8 个应引而不可引的片段**，与 brief 所述实测一致。

### 6.1 这个缺陷在本批节点上的具体后果（三处，均不判生产者死）

**(1) `d:ten-axioms-listed-in-three-groups`（2.1）。** 该节点的断言是「十条公理分三组，各组 2/4/4 条」，最自然的锚点是三个分组标题。但其中两个（14、19 字符）不达标，只有第三个（36 字符）达标。生产者因此改用 `15.02.md:3` 的导言句（163 字符）作锚点——该句只支撑「十条、三组」，**不支撑 2/4/4 这个分配**。这是 brief 所列的 **D 型「射程不足」**：引文为真、对象也对，但只管住断言的一部分。**成因是 SPEC 的长度下限，不是生产者偷懒。**（旁证：`apostol:axioms-for-multiplication-by-numbers` 用了达标的那个标题作锚点，而另两个分组节点只能退回引用单条公理正文——三个同构节点被 SPEC 逼出两种不同的锚点策略。）

**(2) `d:axioms-2-7-8-9-are-the-scalar-dependent-axioms`（2.2）。** 该节点第二句的承重事实是「公理 6 与公理 10 出现的标量是 −1 和 1」。要逐字支撑它，最直接的锚点是公理 6 的方程 `x + (- 1) x = O.`（16 字符，不达标）。生产者只能退回 `15.02.md:51` 的复空间句（128 字符），而那句**只支撑第一句**（哪四条要替换），第二句因此**无锚点**——brief 所列的 **E 型「无锚点从句」**。

**讽刺后果：这个无锚点从句恰好是节点唯一的真增量，也恰好是 B2 转述错、并因此误杀的那一句。** 一条 SPEC 长度规则 → 承重句无法挂锚 → 审计员在无锚处失去逐字校验的抓手 → 误杀。这是本实验里 SPEC 缺陷与审计缺陷**串联成因果链**的一个完整实例，建议上层记入 SPEC 修订依据。

**(3) `d:function-space-zero-is-the-everywhere-zero-function`（2.5）。** 该节点第二句依赖公理 2 的强迫机制（`0f = O`）。公理 2 的正文句达标（128 字符，被 `d:axiom-2-closure-under-multiplication-by-real-numbers` 用作锚点），但函数空间加法定义式 `(f + g) (x) = f (x) + g (x)`（27 字符）不达标。生产者选了 `15.03.md:19` 的零元句（66 字符，达标）作唯一锚点，它支撑第一句而不支撑第二句。同为 E 型。

### 6.2 建议（供 SPEC 修订参考，非本裁定的判决内容）

数学公式行天然短于 30 字符，长度下限对**公式类锚点**是失配的。可选修法：对含 `$` 或位于 `$$` 块内的行豁免下限，或把下限降到 12 字符并改以「不得为单个符号或单个词」作为反滥用条件。另：3 锚点上限使「一句一锚」在 3 句以上的 statement 上不可能实现，本批 2.2（2 句）勉强可行、2.3（2 句含长末句）已需取舍。

## 7. 未覆盖事项声明

### 7.1 我没有检查的东西

1. **另外 22 个 KILL 的 reason 是否属实。** 我只人工逐句核对了任务书指定的 7 个。对其余 22 个我只做了机械检查（id 真实性、循环判死、入度）。**「3/7 的 reason 含事实错误」不可外推**，理由见 5.3（样本非随机）。若上层要判断 B2 全层的 reason 质量，需要对剩余 22 个做同样的逐句核对——按本批的工作量估计约需重读全部 D1 层 parent 与兄弟。
2. **105 个 KEEP 我一个都没查。** 对抗性任命只要求我攻 KILL。B2 §6.3 自陈「X 层 95.5% 的高存活率有可能部分来自我无法检出的遗漏」，这个风险我没有独立评估，也没有能力用删除测试评估（遗漏不是删除测试能回答的问题）。
3. **数学正确性（死因 1–4）。** B2 §6 声明数学对错不在其职权内，我也只在被杀节点的 statement 上顺带核验（结果见 4.3、4.4）。我没有系统检查九个节点之外任何节点的数学。
4. **`data/graveyard/`、`data/structures-L2-*.jsonl`、`data/nodes-A2-s*.jsonl`、`data/nodes-D2..D5`、`data/nodes-CX2`、`data/nodes-H2`、`data/edges-CX2/H1/H2/D2..D5/A2-*`。** 除为核查 2.5 而读了 `data/nodes-D2.jsonl:31` 一行、以及入度统计时机械扫过全部 edges 文件外，这些文件的内容我未阅读。**若被杀节点在这些文件里另有引用者，我的入度统计已经把它算进去了**（统计覆盖 `data/edges-*.jsonl` 全部 14 个文件 + `data/inherited/edges-*.jsonl` 2 个），但我没有读那些引用的语义。
5. **Strang 侧 source。** 我只为 2.8/2.9 的锚点校验读取了 `3.3.md`、`3.5.md`、`4.2.md` 的相关片段（通过 `grep -F` 子串检查，非通读），为 2.7 读取了 `4.1.md` 的锚点片段。Strang ch3–4 我没有通读，因此**无法独立判断 X 层 divergence 的完备性**——与 B2 §6.3 同一盲区。

### 7.2 按硬禁清单，我确认未读的文件

`report/裁定-orchestrator.md`、`report/裁定-ADJ1.md`、`report/裁定-ADJ3.md`、`report/_捞回-裁定员推理原文.md`、`report/待应用清单.md`、任何 `M08实验-Apostol微积分卷1/` 下的文件、以及除 `audit-B2.md` / `audit-B2-verdicts.jsonl` 外的全部审计员输出（`audit-A*`、`audit-B`、`audit-B3..B6`、`audit-L2-*` 及其 verdicts）、全部 `report/横向-*.md`、`report/L2-*-提案说明.md`、`report/审查-形式D-*.md`、`report/无锚点数值筛查.md`、`report/SPEC缺陷-锚点规则量化.md`、`report/共享引文清单.md`、`report/进度报告.md`、`report/反例层-15.05与15.09.md`、`report/D5-下延说明.md`、`report/丢弃与未覆盖清单.md`、`report/代理团队架构.md`、`report/悬空成员修复日志.md`。

我读过的文件完整清单：`SPEC.md`、`report/audit-B2.md`、`report/audit-B2-verdicts.jsonl`、`data/nodes-D1.jsonl`、`data/nodes-X.jsonl`、`data/nodes-D2.jsonl`（1 行）、`data/inherited/nodes-A1.jsonl`、`data/inherited/nodes-S1.jsonl`、全部 `data/edges-*.jsonl` 与 `data/inherited/edges-*.jsonl`（机械统计）、`source/apostol-ch15/15.02.md`、`source/apostol-ch15/15.03.md`、`source/` 下其余文件仅用于 `grep -F` 锚点校验与 `grep -w rank` 计数（未通读）、本报告自身。

**注意：`data/tmp_*.py`、`data/tmp_*.json`、`data/tmp_out*.txt`、`data/tools/`、`data/ID-MANIFEST.md` 我未读**——其中 `tmp_out2c.txt`/`tmp_out2d.txt` 等可能含他人分析结论，为避免污染一律回避。

### 7.3 执行我的裁定所需的连带修复（不在我职权内，仅告知）

若上层采纳本报告：

1. **`d:ten-axioms-listed-in-three-groups` 改 FIX**：需把 `data/edges-D1.jsonl:10/11/12` 三条 `part-of` 改指 `apostol:linear-space`，并把 2/4/4 并入 `apostol:linear-space` 的 statement；`:106`、`:112` 两条 `requires` 亦需改指（其中 `:112` 的来源节点本身被判死，可随之消失）。
2. **`d:function-space-zero-…` 维持 KILL**：需修 `data/edges-D1.jsonl:152`、`:171` 两条来自**存活节点**的 `requires` 入边。
3. **`d:degree-exactly-n-is-not-a-subspace-…` 维持 KILL**：删除后 **15.06 的 D 层覆盖归零**，且 `d:degree-exactly-n-is-not-a-linear-space` 这个被判 FIX 的枢纽挂载数从 4 降到 3（B2 §6.1 自陈无规则处理此情形）。另需同步修正 B2 §5.1 的「12 个文件未被 D1 触及」——删除前应为 11，删除后才是 12。
4. **`x:least-squares-is-a-projection` 改 FIX**：若上层仍决定删，则必须先为 `strang:solvability-condition` 与 `apostol:distance-between-elements` 另找 X 层落点，否则触及 SPEC:57 的成员归属红线；并处理 `data/edges-X.jsonl:93–97` 五条悬空 `is-a` 边。
5. **`x:dimension-versus-rank`**：除 B2 的修法外，补 `strang:rank-theorem`、`strang:counting-theorem`、`strang:fundamental-theorem-of-linear-algebra-part-1` 进 `strang_ids`（对齐 `data/edges-X.jsonl:37/38/39`）。
6. **B2 的三条 reason 须重写**（`audit-B2-verdicts.jsonl` 第 5、24、60 行），第 24 行同时是判决改判。

### 7.4 一句自我限定

我受命尽力翻案，因此本报告的攻击性是**任命的产物而非证据的产物**。第 5 节我给出的对 B2 有利的证据（零循环判死、零假 id、入度分布、层间差异、判活比判死严谨）是我在攻击过程中撞见的，不是我去找的——**我没有系统地为 B2 辩护**。一个受命为 B2 辩护的裁定人大概能找到更多。上层在合并三份裁定时应把这一偏置计入。
