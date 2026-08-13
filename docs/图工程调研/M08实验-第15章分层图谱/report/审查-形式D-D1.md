# 形式 D / E 审查报告 — data/nodes-D1.jsonl（15.01–15.06）

审查者：FD1（Form-D Hunter, file D1）

## 1. 覆盖声明

`data/nodes-D1.jsonl` 共 **81 个节点**（tmp_index/nodes.tsv 按 loc 前缀 `data/nodes-D1.jsonl:` 逐行计数 = 81）。
本报告合并三个来源，覆盖 **81/81，无缺口、无抽样**：

| 区间 | 节点数 | 来源 | 状态 |
| --- | --- | --- | --- |
| 行 1–30 | 30 | **本文件 §2 批次 1–3 + §4 前 11 条**（在骨架内直接完成，无独立分片文件） | 已审 |
| 行 31–56 | 26 | `report/审查-形式D-D1-片31-56.md` → 摘要 `待应用-提案/G6d-D1-片31-56-摘要.md` | 已审 |
| 行 57–81 | 25 | `report/审查-形式D-D1-片57-81.md` → 摘要 `待应用-提案/G6d-D1-片57-81-摘要.md` | 已审 |

**关于「片 1–30 无分片文件」的核查结论（原怀疑是审计覆盖缺口，核后不成立）：**
行 1–30 并非未审，而是**审在本文件自身**——骨架的 §2 批次 1/2/3 与 §4 的前 11 条即是该区间的形式 D 产出，
它早于分片机制建立，故没有独立的 `片1-30` 文件。核查方式与结果：
- 逐 id 比对：nodes.tsv 取出行 1–30 的 30 个 id，其中 **29 个**在本文件中逐字出现；
  唯一未逐字出现的 `d:axiom-7-associative-law-for-multiplication-by-numbers`（行 16）
  在 **D-13** 中以「节点 16」序号形式裁决（该条一并处理行 16/18/19 三个节点）。故 **30/30 已覆盖**。
- 节点账目闭合：§2 批次 1–3 的 20 个 `D-nn` 标签覆盖 **22 个节点**
  （D-07 含两段、D-13 一条含 3 个节点），§4 前 11 条中 **8 条**为该区间独有的支撑充分节点
  （行 7/8/9/22/23/25/27/28），另 3 条（行 10/18/19）与 D-07/D-13 重叠、标注为「部分」。
  **22 + 8 = 30**，逐行闭合。
- 旁证：行 1–30 的节点亦出现在 `待应用-提案/G4-完备性-15.01.md`～`15.04.md` 中，
  但那是**完备性**维度，不替代形式 D；本条不作为覆盖依据，仅登记。

**两份分片摘要均存在**（G6d-D1-片31-56-摘要.md 17071 字节、G6d-D1-片57-81-摘要.md 19714 字节），
无「缺分片摘要」情形。按任务约定未读两份原始分片，全部内容取自摘要；
凡摘要与索引冲突处，**以 tmp_index 实测值为准**（见 §6）。

**口径警告（影响本报告一切跨区间加总）：** 三个区间的 D/E 判型口径**互不相同、不可直接相加**：
行 1–30 不做 D/E 二分，只按 **S（书中他处亦无据）/ L（书中有据未引）** 分级；
行 31–56 自定 D=射程不足、E=无锚新增断言（同一节点可兼两者，故 4 D + 20 E > 26 未矛盾）；
行 57–81 用 D/E 互斥计数（6 D + 4 E + 15 其它 = 25）。
因此 §2/§3 只报**分区间原始计数**，唯一可加总的统一轴是 **节点级动作**（§2 末的裁决计数）。

## 2. 确认的形式 D 实例（SCOPE-SHORTFALL）

判定门槛（先声明，避免为凑数造缺陷）：statement 里必须有一段**实质断言**，其内容超出全部锚点的射程，且满足下列之一：
- **严重（S）**：书中他处也没有依据 —— 它是模型自己加的推论/规范性评注。建议缩 statement，或判死因 6。
- **轻（L）**：书中他处确有依据但没被引 —— 锚点射程不足是选点问题。建议补锚点，不判死因。

纯修辞连接词（"This is the payoff…"、"The clause is not idle…"）不计入。

### 批次 1（节点 1–10，15.01–15.02）

**D-01 `d:linear-space-is-a-set-together-with-two-operations`（S）**
- 越界原文：`putting different operations on the same underlying set produces a different linear space.`（末句后半）
- 锚点原文：`If we specify the set V and tell how to add its elements and how to multiply them by numbers, we get a concrete example of a linear space.`（15.03.md L3）
- 射程分析：锚点只断言「集合 + 两个运算 ⇒ 得到一个具体例子」，是**构成性**断言。statement 把它推成**个体化**断言（同一集合换运算 ⇒ 换成另一个线性空间）。这一步在 15.01/15.02/15.03 中无任何句子支持；书里最接近的材料是 Example 2（C 配实标量是实线性空间）暗示了标量的选择影响结论，但该句未被引，且它讲的是标量域而非"两个运算"。断言本身数学上成立（线性空间形式上是三元组），所以这是**射程不足**而非数学错误。
- 建议：缩 statement 删末句后半，或标 `origin: model`。不判死因 6。

**D-02 `d:nature-of-the-elements-is-left-unspecified`（S）**
- 越界原文：`it also forbids any proof from using a property of the elements that no axiom grants.`（末句末尾）
- 锚点原文：`In defining a linear space, we do not specify the nature of the elements nor do we tell how the operations are to be performed on them.`（15.01.md L5）
- 射程分析：锚点是**作者做了什么**（不指定元素性质）的陈述；statement 末尾是**对读者的禁令**（证明不得使用公理未授予的元素性质）。书中从未下过这条禁令。同句前半 `This deliberate omission is what lets one proof serve every example` 也超出锚点，但它在 15.03 L37 有依据（属轻度，见下表）。
- 建议：缩 statement；禁令属模型推论。

**D-03 `d:linear-space-requires-a-nonempty-underlying-set`（S，最典型的一例）**
- 越界原文：`of the ten axioms only Axiom 5, being existential, would fail for the empty set, so without the nonemptiness declaration the exclusion of the empty set would rest entirely on that one axiom.`
- 锚点原文：`Let V denote a nonempty set of objects, called elements. The set V is called a linear space if it satisfies the following ten axioms which we list in three groups.`（15.02.md L3）
- 射程分析：锚点只覆盖 statement 第一句（V 在任何公理之前就被声明为非空）。第二句是一份**对十条公理逐条做空集检验**的数学分析，锚点一个字都没碰到。这正是形式 D 最危险的形态：审计者读到引文，看到"nonempty set"，判定切题且逐字，然后走开——那份十条公理的分析从未被检验。
- 我实际检验了：V = ∅ 时 Axiom 1/2（"For every pair…"、"For every x in V…"）空真，3/4/6/7/8/9/10 全为全称句故空真，唯 Axiom 5 `There is an element in V, denoted by O` 为存在句，对空集假。**该断言成立。**
- 建议：补锚点（15.02.md L17 的 Axiom 5 首句 >30 字符，可引）。不判死因 6 —— 但请注意：本条的正确性完全依赖人工核验，机器校验对它零覆盖。

**D-04 `d:axioms-replace-a-construction-with-required-properties`（S）**
- 越界原文：`no argument may appeal to how the operations are computed.`（末句末尾）
- 锚点原文：`Instead, we require that the operations have certain properties which we take as axioms for a linear space.`（15.01.md L5）
- 射程分析：与 D-02 同构。锚点讲作者的做法（列性质而非造运算），statement 末尾是对论证的禁令。书中无此禁令句。（书中 `nor do we tell how the operations are to be performed on them` 讲的是作者不说明运算怎么做，不等于"论证不得援引运算怎么算"。）
- 建议：缩 statement。

**D-05 `d:ten-axioms-listed-in-three-groups`（S，但根因是 SPEC）**
- 越界原文：`two closure axioms, four axioms for addition, and four axioms for multiplication by numbers`
- 锚点原文：锚点 1 `…the following ten axioms which we list in three groups.` 只给"十条 / 三组"；锚点 2 `We turn now to a detailed description of these axioms.`（15.01.md L5）对本 statement 零信息量。
- 射程分析：每组各含几条、含哪几条，两条锚点都不覆盖。我核了分组标题：L5 `Closure axioms` → 公理 1,2（两条）；L11 `Axioms for addition` → 3,4,5,6（四条）；L29 `Axioms for multiplication by numbers` → 7,8,9,10（四条）。**断言正确。**
- 但：`Closure axioms`（14 字符）与 `Axioms for addition`（19 字符）都低于 SPEC 30 字符下限，**无法作为锚点引用**。故本条证据不足的根因是 SPEC 而非生产者（计入第 5 节）。
- 建议：不判死因。锚点 2 应换掉——它是填充引文。

**D-06 `d:one-proof-from-the-axioms-serves-every-example`（S）**
- 越界原文：`it fixes the price: an argument that uses a feature special to one example proves nothing about the others.`（末句）
- 锚点原文：锚点 1 `When a theorem is deduced from the axioms of a linear space, we obtain, in one stroke, a result valid for each concrete example.`（15.03.md L37）
- 射程分析：锚点 1 是**正向**收益陈述（公理⇒普适），statement 末句是**反向**代价陈述（用特例性质⇒证不出普适）。逻辑上是逆否的近亲但不是同一命题，书中没有这句话。锚点 2 `…permeates algebra, geometry, and analysis` 与本 statement 无关（见第 6 节，疑似形式 B）。
- 建议：缩 statement。

**D-07 `d:axiom-1-closure-under-addition`（L + S 各一段）**
- 越界原文 a（L）：`as adding two polynomials of degree exactly n can do`
- 越界原文 b（S）：`without which an expression such as x + y + z would not denote one element at all`
- 锚点原文：`AXIOM 1. CLOSURE UNDER ADDITION. For every pair of elements x and y in V there corresponds a unique element in V called the sum of x and y, denoted by $x + y$ .`（15.02.md L7）
- 射程分析：锚点覆盖"存在、唯一、仍在 V 内"。(a) 的多项式反例出自 15.03.md L25 `the sum of two polynomials of degree n need not have degree n`，书中确有但未被引，且本节点只用了 1 条锚点，3 锚点上限不构成约束 —— 属选点不足。(b) 关于 `x + y + z` 的评注书中无依据；数学上成立，但它把唯一性的作用外推到了多元表达式的良定义，锚点不到那里。
- 建议：(a) 补锚点；(b) 缩 statement。

### 批次 2（节点 11–20，十条公理）

这一批出现一个**贯穿性模式**：十个公理节点的 statement 全部是「公理正文 + `It forbids …` 的作用解释 + 一个反例或一条对后文证明的依赖」三段式，而每个节点只挂 1–2 条锚点，锚点一律只覆盖第一段。第二、三段的支撑状况分两类，我分开记：

**D-08 `d:axiom-2-closure-under-multiplication-by-real-numbers`（S）**
- 越界原文：`the n-tuples with integer components are closed under addition, yet halving one of them leaves the set, so they violate Axiom 2 and form no linear space.`（末句）
- 锚点原文：Axiom 2 正文（15.02.md L7–9），只讲公理断言什么。
- 射程分析：整数分量 n 元组这个反例**书中不存在**（15.03 的十二个例子里没有 Z^n）。锚点覆盖"公理说什么"，不覆盖"哪个集合违反它"。数学正确（Z^n 加法封闭、乘 1/2 出界）。
- 建议：标 `origin: model` 或缩 statement。不判死因 6（锚点没被误用，只是射程不到）。

**D-09 `d:axiom-4-associative-law-for-addition`（S，含逻辑跳跃）**
- 越界原文：`and an element could carry two different negatives.`（末句末尾）
- 锚点原文：Axiom 4 正文（15.02.md L15）。
- 射程分析：前半 `without it the regrouping of y_2 + (x + y_1) into (y_2 + x) + y_1 used in Theorem 15.2 is unavailable` 在 15.04.md L20 有逐字依据（该行确有 `(y _ {2} + x) + y _ {1}`），未被引 → 轻度选点问题。但末尾这句是从「Thm 15.2 的证明用到 Axiom 4」推到「去掉 Axiom 4 则负元可以不唯一」——**证明依赖某公理不等于结论离开该公理即失效**，需要一个反模型才能断言，statement 没给。锚点对此零覆盖。
- 值得注意的是：同一批的 `d:axiom-7-…` 节点在同类位置**主动写下了**这条方法论警告（`so it does not by itself establish the independence of Axiom 7`），说明生产者知道这个标准。本条是同一生产者在同一标准下的失手，不是标准缺失。
- 建议：缩 statement 至"该证明的这一步不可用"，删"可以有两个负元"。同型问题见 D-11。

**D-10 `d:axiom-5-existence-of-zero-element`（S）**
- 越界原文：`the later machinery of vanishing linear combinations, dependence, span and subspace has no target to vanish to`（末句尾）
- 锚点原文：Axiom 5 标题句 + 位移公式 `x + O = x \quad f o r a l l x i n V.`（36 字符，合规）。
- 射程分析：两条锚点合起来正好覆盖第一句，一个字也没进入后面的三项后果。其中 `the difference y - x cannot be defined` 在 15.04.md L25 有逐字依据（`The difference $y - x$ is defined to be the sum $y + (-x)$ .`）未被引；而"线性组合为零 / 相关性 / 生成 / 子空间"是对 15.06 及以后各节的**前向断言**，本节点 `sections` 只写 `["15.02"]`，锚点也只在 15.02，等于把四个后文概念的存在与形态全部押在零证据上。这是本批中最深的末句越界。
- 建议：缩 statement 删该列举，或补 15.06 锚点并扩 sections。

**D-11 `d:axiom-8-distributive-law-for-addition-in-v`（S，与 D-09 同型）**
- 越界原文：`so without it aO could be an element other than O`
- 锚点原文：Axiom 8 标题句（15.02.md L37），且**不含公式本体**。
- 射程分析：同 D-09 的逻辑跳跃（证明用到 ⇒ 去掉则结论失效）。前半 `it is also the axiom that carries the proof of Theorem 15.3(b)` 在 15.04.md L57 有逐字依据（`Proof of (b). Let $z = aO$ , add $z$ to itself, and use Axiom 8.`，63 字符）未被引。
- 建议：补 15.04 锚点；缩末尾反事实断言。

**D-12 `d:axiom-6-existence-of-negatives`（S，轻）**
- 越界原文：`subtraction and cancellation both fail`
- 射程分析：statement 用的 "cancellation" 与书中 Thm 15.3(e)(f) 的 "cancelled"（消去标量 / 消去元素）不是同一件事，后者依赖 (a)(b)(c) 而非直接依赖 Axiom 6。措辞把两个不同的消去概念混在一起，锚点（Axiom 6 标题句）不覆盖任何一个。同句 `the closing step of the proof of Theorem 15.3(a), which adds -z to both members` 在 15.04.md L55 有依据未被引。
- 建议：改写该短语；补 15.04 锚点。

**D-13 `d:axiom-7 / axiom-9 / axiom-10` 三节点的反例段（S，但性质与上面不同）**
- 越界原文：三个自造反例 —— `a . x = 2ax on V_n`（节点 16）、`a . x = |a|x on V_n`（节点 18）、`ax = O for every a and x`（节点 19）。
- 射程分析：三例书中都不存在，锚点（各公理标题句）全不覆盖。**但我逐一验算，三例数学全部正确**：2ax 下 a(bx)=4abx 而 (ab)x=2abx，且确实满足 Axiom 8、9；|a|x 下 (1+(−1))·x=O 而 1·x+(−1)·x=2x，且确实满足 7、8、10；ax≡O 在把 Axiom 6 换成存在型后确实满足其余九条而只违反 Axiom 10。三例的限定语（"obeys Axioms 8 and 9"、"under the usual existential form of the inverse axiom"）也都恰好卡在正确的范围上，节点 16 还自己声明了不能据此断言独立性。
- 结论：这是**证据缺位但判断可靠**的一类。它们是 `origin: model` 该标而未标，不是缺陷内容。
- 建议：统一标 `origin: model`。不判死因。附带风险：节点 18 未像节点 16 那样声明"这不构成独立性证明"，读者可能误读；建议补一句。

**D-14 `d:axiom-3-commutative-law-for-addition`（L）**
- 越界原文：`the element O of Axiom 5 would be guaranteed only as a right neutral element` 与 `that proof closes by rewriting O_1 + O_2 as O_2 + O_1`
- 射程分析：两处在书中都有逐字依据（Axiom 5 的位移公式 `x + O = x…` 36 字符可引；15.04.md L7 `But $O_1 + O_2 = O_2 + O_1$ because of the commutative law, so $O_1 = O_2$ .` 可引），节点只挂了 1 条锚点、远未触及 3 锚点上限，纯选点不足。
- 建议：补两条锚点即可。

**D-15 `d:only-axiom-1-states-that-the-result-is-unique`（L）**
- 越界原文：`Both operations are single-valued in every example`
- 射程分析：这是对 15.03 十二个例子的全称断言，两条锚点都在 15.02，对例子零覆盖。断言为真但无引文；量词 "every example" 的射程完全在锚点之外。同句后半（唯一性只写给加法）由两条锚点的对照充分支撑。
- 建议：删该从句，或补一条 15.03 锚点。

### 批次 3（节点 21–30，公理细读 + Thm 15.3）

**D-16 `d:axiom-5-states-the-zero-only-as-a-right-neutral-element`（S，定位错误）**
- 越界原文：`The two-sided property, used freely from Theorem 15.1 onward`
- 锚点原文：锚点 2 = `y _ {2} + (x + y _ {1}) = (y _ {2} + x) + y _ {1} = O + y _ {1} = y _ {1} + O = y _ {1}.`（15.04.md L20，**Theorem 15.2** 的证明）
- 射程分析：锚点 2 确实展示了 `O + y_1 = y_1`（左中性用法），但它出自 **Thm 15.2**。statement 把这一用法的起点定在 **Thm 15.1**。我核了 15.04.md L7：Thm 15.1 的证明两次用 Axiom 5 都是**右**中性（`O_1 + O_2 = O_1`、`O_2 + O_1 = O_2` 各按 Axiom 5 的原形代入），然后靠 `because of the commutative law` 把两式接起来——它**没有**把 O 当左中性元用。真正首次左加 O 的是 Thm 15.2。锚点支持"这一用法存在"，不支持"从 15.1 起"。
- 这是形式 D 与形式 C 的混合体：引文讲一个位置的用法，断言覆盖了一段更早开始的区间。
- 建议：改 `from Theorem 15.2 onward`；另外 `is supplied by Axiom 3` 未引 Axiom 3 正文（15.02.md L13，73 字符可引，本节点尚有 1 个锚点位），可补。

**D-17 `d:thm-15-3c-negation-passes-through-scalar-multiplication`（L，等式链的教科书式射程不足）**
- 越界原文：三元等式链 `(-a)x = -(ax) = a(-x)` 的**第三项**，及其复述 `negating the element` 那一支。
- 锚点原文：`Proof of (c). Let $z = (-a)x$ . Adding $z$ to $ax$ and using Axiom 9, we find that` + `z + a x = (- a) x + a x = (- a + a) x = 0 x = O,`
- 射程分析：两条锚点合起来只证到 `z = -(ax)`，即 `(-a)x = -(ax)`。`a(-x)` 在两条引文里一次都没出现。它在 15.04.md L65 有逐字依据（`if we add $a(-x)$ to ax and use Axiom 8 and property (b), we find that $a(-x) = -(ax)$`）未被引，本节点还剩 1 个锚点位。
- 这是形式 D 的教学范本：引文切题、逐字、来自正确的证明，抽查一眼就过；但被断言的等式有三项，引文只管两项。
- 建议：补 L65 锚点。

**D-18 `d:thm-15-3-quantifiers-arbitrary-elements-and-arbitrary-scalars`（L，末句）**
- 越界原文：`every property holds verbatim in each of the twelve examples of Section 15.3 and in the complex case as well.`
- 锚点原文：`THEOREM 15.3. In a given linear space, let $x$ and $y$ denote arbitrary elements and let $a$ and $b$ denote arbitrary scalars.`
- 射程分析：锚点是 15.04 内部的量词声明，对 15.03 的例子和复情形零覆盖。两处都在书中有依据未被引：例子数十二可由 15.03 的 EXAMPLE 1–12 核出（我核过，正好十二个）；复情形有 15.02.md L51 `all the theorems are valid for complex linear spaces as well`（逐字可引）。节点仅 1 条锚点，剩 2 位。
- 建议：补 15.02 L51 锚点。

**D-19 `d:axioms-2-7-8-9-are-the-scalar-dependent-axioms`（L，末句）**
- 越界原文：`The remaining six axioms name no scalar other than the fixed numbers -1 and 1 (in Axioms 6 and 10), which lie in both fields, and are therefore untouched by the change of scalar field.`
- 锚点原文：`If real number is replaced by complex number in Axioms 2, 7, 8, and 9, the resulting structure is called a complex linear space.`
- 射程分析：锚点只讲被改动的那四条，对"其余六条含什么"零覆盖。我逐条核了 15.02.md L5–49：Axiom 1/3/4/5 不含任何数字，Axiom 6 含 (-1)，Axiom 10 含 1，且"real number"字样确实只出现在 2/7/8/9 —— **断言全部正确**。Axiom 6 标题句（86 字符）与 Axiom 10 全句（66 字符）都可引，节点仅 1 条锚点。
- 建议：补两条锚点。

**D-20 `d:thm-15-3d-a-vanishing-product-forces-a-vanishing-factor`（L，末句）**
- 越界原文：`it is the converse direction to (a) and (b) taken together: those two produce the zero element, this one says nothing else does.`
- 锚点原文：`(d) If $ax = O$ , then either $a = 0$ or $x = O$ .`
- 射程分析：锚点是 (d) 本身，对 (a)(b) 零覆盖，而末句是一条关于三个命题之间逻辑关系的断言。该断言正确（(d) 恰是 (a)∨(b) 的逆命题）。(a)(b) 的正文均 <30 字符不可引（见第 5 节），但两者的 `Proof of (a)…` / `Proof of (b)…` 行可引。
- 建议：补锚点，或缩 statement。

### 本批中支撑到位的正面对照

`d:axiom-10-is-derivable-from-apostols-form-of-axiom-6` 值得单列为**正面样本**：它的 statement 第一句就写明 `Apostol does not remark on this; the derivation below is not in the text.` —— 主动声明证据边界，正是形式 D 的解药。我逐步验算了它给的推导（令 u=(−1)x；Axiom 9 + Thm 15.3(a) 得 1x+u=O，Axiom 6 得 x+u=O，两边各加 (−1)u 并用 Axiom 4/5/3 得 1x=(−1)u=x），**只用到 Axioms 3,4,5,6,9，且 Thm 15.3(a) 的证明本身不用 Axiom 10，无循环**。声明的"更常见的存在型逆元公理下 Axiom 10 独立"也正确。

### 批次 4（行 31–56，Thm 15.3 余项 + 证明步 + Examples 1–4）

来源：G6d-D1-片31-56-摘要.md §一。该片 26 个节点全审，**形式 D 4 例、形式 E 20 例**（同一节点可兼两者），
20 个缺陷节点的缺陷 **100% 落在或延伸到 statement 末句**。以下只列该片自评最重、或死因非 0 的条目；
其余 FIX 条目见 §4 的「轻度」清单。

**D-21 行 40 `d:proof-c-conclusion-rests-on-uniqueness-of-the-negative`（死因 6，本片最重）**
- 指控：节点的唯一存在理由「这一步就是 Theorem 15.2」**全无锚**。
- 依据：应引 15.04.md:9（实测 179 字符、n_sentence_end=4，source-lines.tsv），现成合规；
  节点 `n_anchors`=1，剩 2 个空位（nodes.tsv）。→ **判生产者，不判 SPEC。**
- 我按四层池复核：T1 = 15.04.md 的 141 字符句；T2（edges-D1.jsonl:63）= **同一句的 41 字符前缀子串**
  （pool.tsv 逐字比对，同 file 同句）。**T2 属重复不属新证据，塌陷成立。**
- 死因 6 / 动作 FIX（补 15.04.md:9）/ 置信度高。

**D-22 行 43 `d:examples-are-asserted-to-satisfy-the-axioms-and-left-to-the-reader`（死因 4 + 1，本片唯一数学错）**
- 指控 a（死因 4）：「nine axioms are mechanical / closure is the sole item」**数目错**——封闭是**两条**公理，10−2=**8**；
  原文三处用复数 `closure axioms`。依据 15.02.md:7（160）、15.02.md:9（175，实测确认）、15.03.md:25/:33/:35。
- 指控 b（死因 1）：「only because…every example」双重全称为假（Example 1、2 的运算既非按分量也非按点）。
- **分片动作栏写「KILL 或强改」，按合并规则 2 我裁一次：判 FIX（强改），不 KILL。**
  理由：该节点核心断言（书把公理验证宣称为真并留给读者）本身有锚且成立，
  错的是一个可数数字与一个可限定的全称量词，二者均为局部可改；KILL 应留给核心内容改不出来的节点。
- 死因 4 + 1 / 动作 FIX（强改）/ 置信度高（数目一项已由 15.02.md:7/:9 双向核实）。
- **必须与行 46 联动**：两者的公理分组互相矛盾（8 vs 9 条机械），主控修一处必须同时看另一处。

**D-23 行 52 `d:example-3-verification-reduces-to-arithmetic-in-each-component`（死因 6，B 型样本）**
- 指控：唯一锚点只说运算怎么定义，却被用来担保**十条公理的验证结论 + 「O 是零元组」这一零元指认**。
- 依据：15.02.md:3–49（十条公理正文）、15.03.md:19。
- B 型证据：同一条引文（15.03.md:9 后半，92 字符）被行 51 与行 52 逐字共用，**行 51 够用、行 52 不够用**。
  这正是 `grep -F` 通过率无法区分的东西——两者的引文都逐字为真，射程一成一败。
- 死因 6 / 动作 FIX / 置信度高。

**D-24 行 55 `d:example-4-nontrivial-check-is-closure-by-linearity-of-the-dot-product`（分片自评「本片质量最高的洞见」）**
- 洞见成立面：正确指出**点积线性性是公理表之外的隐藏依赖**（点积定义在第 12 章，见 15.10.md:5），但该洞见**无锚**。
- 射程不足面：只引了 Axiom 1 却断 `Axioms 1 and 2`，`(ax)·N=0` 那半属 Axiom 2 辖区；
  claim 2 的 `O∈V` 少一步（a=0 + Thm 15.3(a)）。依据 15.02.md:9、15.06.md:5（129）、15.06.md:11（实测 440 字符、7 句）、15.10.md:5。
- 死因 0 / 动作 FIX / 置信度中（部分归因 SPEC 3 锚点上限，但 nodes.tsv 实测 `n_anchors`=2、**尚剩 1 空位**，归因偏软，见 §5）。

**D-25 行 35 `d:thm-15-3-only-a-b-c-are-proved-in-the-text`（死因 1）**
- 「文本自证的公理归属只有 (a)(b)(c) 里的」照字面为假：Thm 15.1/15.2 的证明各自点名了公理（15.04.md:7、:11）；缺 `for Theorem 15.3` 限定。
- 该节点带 `audit_fix: audit-A4a` 但缺陷仍在。死因 1 / 动作 FIX / 置信度高。

**D-26 行 38 `d:proof-b-mirrors-proof-a-with-axiom-8`（死因 1）**
- 「两证明只差在哪条分配律」为假：(a) 的内层塌缩靠实数 0+0=0，(b) 靠 Axiom 5。依据 15.04.md:57。死因 1 / FIX。

**D-27 行 42 `d:an-example-is-a-set-plus-two-explicit-operations`（形式 D + E）**
- claim 1 把锚点的**充分性读成必要性**（方向反转）；末句「本节先定运算后给集合」对 Examples 1–3 为假、只对 5–12 成立。
- 依据 15.03.md:3（实测 253 字符、2 句）、15.03.md:13（160）。死因 0 / FIX。
- **分片留了两个互斥改法**（改述为充分性 / 另补锚点）未择一；我裁：**改述为充分性**更省——
  方向反转是措辞错，补锚补不掉一个反向断言。置信度中。

**D-28 行 50 `d:example-3-v-n-with-componentwise-operations`（形式 D + E）**
- 「15.1 cites as motivating」把「被列举」读成「动机来源」；15.01.md:3（实测 481 字符、4 句）后半方向恰好相反（公理 ⊇ 例子）。死因 0 / FIX。

**行 37 单列为诚实样板**：`d:proof-a-cancel-by-adding-the-negative-of-z` 的公理归属虽无锚，
但节点在同句里如实声明「书中一行未点名公理」——与 §2 末的行 23 同属主动声明证据边界的解药型写法，**保留**。

### 批次 5（行 57–81，函数空间 + Examples 5–12 + 收尾）

来源：G6d-D1-片57-81-摘要.md §一。25 个节点全审。该片口径下 **形式 D 6 例、形式 E 4 例、其它 15**（6+4+15=25 闭合）。
注意摘要已订正分片两处总账错：§1 原写「形式 D 5 例」漏了 #80（实为 **6 例**）；§4 表头「14 个」与表末「16 行」均错，实为 **15 行**。

**D-29 #62 `d:for-function-spaces-closure-is-the-only-real-content`（死因 6，分片自评「最典型的 D」）**
- 指控：`exactly the three places` 计数经核为真，但**锚点只管住三处之一、八例之一**。
- 依据：锚点 15.03.md:25 覆盖三处失败中的第一处；应补 15.03.md:33（69 字符）与 15.03.md:35（分片记 98，**实测 99**）。
- 为何最典型：锚点主题高度相关（就在讲「封闭公理不满足」），**主题式抽查必过**，实际覆盖 1/3。
- **明确不是 SPEC 的错**：两个空锚位现成，另两句原文合法且长度合规。
- 我按池复核：T1 = 15.03.md 的 115 字符句，T2（edges-D1.jsonl:154/156）= **与 T1 完全相同的引文**（pool.tsv）。**T2 零新证据，塌陷成立。**
- 死因 6 / FIX / 置信度高。

**D-30 #80 `d:linear-space-concept-permeates-algebra-geometry-analysis`（死因 6 兼 1）**
- 三层全在射程外：计数 `twelve`（经核为真）、「通过原点的直线与平面」、末句对比性洞见；
  且节点把锚点的 `algebra` 换成 `arithmetic`，三分漏掉例 5/6/7。
- 依据：锚点 15.03.md:37 只有三个领域名（该行实测 502 字符、4 句）；应引未引 15.03.md:11（例 4 原句，实测 227 字符、4 句）。
- 我按池复核：T2（edges-D1.jsonl:217）= 与 T1 逐字相同的 113 字符引文。**T2 零新证据。**
- 死因 6 + 1 / FIX / 置信度高。**死因 1 部分（计数与三分全称）按本轮定义不因边证据免除。**

**D-31 #75 `d:example-10-functions-integrable-on-an-interval`（死因 6 兼 4）**
- 末句跨 3 例断言必然性与机制，**射程只有 1 例名**；且该机制**对它点名的例 9 不成立**（例 9 定义域确实缩小），属机制混同。
- 依据 15.03.md:31（锚点仅例 10 集合名）；关键反证事实来自 #74。死因 6 + 4 / FIX（末句限缩到例 8 与例 10，另交代例 9 机制）/ 置信度高。

**D-32 #58 `d:function-space-addition-lives-on-the-intersection-of-domains`（死因 6 兼 1）**
- 末句对 5 个例子作「事先固定区间/点」的**设计意图归因**，原文从未给此理由；且该因果**对它自引的例 9 最不成立**。
- 依据 15.03.md:29（锚点仅给例 9 集合名）。死因 6 + 1 / FIX（限缩到例 5/8/10 并删「which is why」，或补锚）/ 置信度高。

**D-33 #67 `d:degree-exactly-n-is-not-a-linear-space`（死因 6）**
- 比较句的 `rather than at most n` 一侧与「本节唯一反例」的唯一性均在射程外；rel_note 态度诚实。
- 依据 15.03.md:25（锚点只讲等式那一侧）；应补例 7 集合名句（#65 已在用，本节点有 2 空位）。死因 6 / FIX。

**D-34 #69 `d:degree-exactly-n-fails-axiom-2-at-the-scalar-zero`（死因 6，兼 B 型借用）**
- `a=0`、`0p` 是零多项式这条**机制链一字无锚**；所借锚点讲的是加法侧。
- 依据 15.02.md:9（Axiom 2 全句，**实测 175 字符**，含关键的 `every real number a`，应引未引）；15.03.md:25。
- 缓解只在**一条 origin=model 且无 evidence 的边的 rel_note 里**——按四层池 rel_note 不入池，故缓解不成立，照判。死因 6 / FIX / 置信度高。

**D-35 #60 `d:function-space-zero-is-the-everywhere-zero-function`（死因 6，形式 E 单发）**
- 第二句讲的对象（次数恰为 n 的集合、Axiom 2 强制）与唯一锚点讲的对象**完全不同**，且三条边无一指向 Axiom 2 或 degree-exactly-n。
- 我按池复核：T1 = 66 字符零元句，T2（edges-D1.jsonl:146/147）= **与 T1 逐字相同**。**T2 零新证据。**
- 死因 6 / FIX（补 Axiom 2 全句为锚 + 加边，或删第二句）/ 置信度高。

**#68 `d:degree-exactly-n-fails-axiom-1-with-an-explicit-witness`（死因 4 或 1，分片自评「本片最重的非 D/E 问题」）**
- 见证 `p=t^n, q=-t^n+t` 声明 `both of degree n` 在 **n∈{0,1} 上为假**；结论仍成立，错的是普适性。
- **同一缺陷在边 rel_note 中原样复制，是两处而非一处，修 statement 不足以修完。**
- 死因 4（或 1）/ FIX（改 `q(t) = -t^n + 1`，或注明 n ≥ 2）/ 置信度高。

**#64、#70 两条锚点/引用错指（分片未编死因号，我按盲区五型归类）**
- #64 `d:example-6-all-polynomials-as-a-function-space`：末句把「确切次数致命」记到例 7 头上，而例 7 是 degree ≤ n。
  **属 A 型（对象错）**，数学无误。死因 0 / FIX（改末句所指）。
- #70 `d:degree-exactly-n-has-no-zero-element`：锚点是「封闭公理」句，而 **Axiom 5、6 都不是封闭公理**
  （15.02.md:5 只含 Axiom 1、2），锚点在逻辑上不可能支撑该断言。**属 B 型锚点错配。**
  见 §2 末「分片间冲突」条 3 —— 该节点在分片里被同时列入「支撑充分」与「建议换锚」，我已择一。

### 分片间冲突与我的裁决

按合并规则 2 单列。四条冲突，全部给出双方依据与我的裁决。

**冲突 1（跨片，口径级，影响面最大）：量词过度断言该记死因 0 还是 1？**
- 行 31–56 一侧：表里把行 **31、45、53、54** 的 `only / the only / the first / every` 一律记 **死因 0**
  （同片的行 35、38、43 却记了死因 1，故该片内部口径亦不一致）。摘要作者已指出这倾向死因 1，未改判。
- 行 57–81 一侧：把 #62 claim 2 的跨 8 例全称、#80 claim 1 的计数明确按 **死因 1** 类处理（#80 判「6 兼 1」）。
- **我的裁决：采行 57–81 的口径。** 依据封闭词表「死因 1 = 量词过度断言」与本轮定义
  「死因 1 不因边证据而免除」——判据是**断言的量词射程是否超出已核证据**，与该量词写成 only 还是 every 无关。
  故行 31、45、53、54 四条应由 0 **改记死因 1**。
- **不确定点（必须交代）：我未逐条重读这四个节点的 statement 原文**，只按摘要转述的从句判型。
  若某条的 only/first 经核实为**已被锚点射程覆盖**的限定语，则不构成死因 1。
  这四条的**逐句事实核验：未核**。裁决仅及口径，不及个案事实。置信度：口径高、个案中。

**冲突 2（跨片，方法级）：「兄弟节点已承载」能否作为减轻理由？**
- 行 57–81 一侧：分片 3 处以此减轻（#60、#81、以及 R-5 涉及的 8 个节点），摘要作者已判其不成立。
- 行 1–30 与 31–56 一侧：未使用该理由（行 31–56 用的是 part-of 后代与边，属 T2/T3 正规通道）。
- **我的裁决：兄弟节点不入池，减轻不成立**，除非该兄弟恰为本节点的 **part-of 后代**（那时它是 T3）。
  依据四层池定义：池只含 T1（自身锚点）、T2（自身作 src 的边 evidence）、T3（part-of 后代）。
  兄弟既非自身锚点、亦非自身出边、亦非后代，落在三层之外。置信度高。
- 具体后果见冲突 3 与 §3 的 R-5。

**冲突 3（片内自相矛盾，需择一）：#66 与 #70 的改判基础**
- #66 `d:zero-polynomial-is-included-by-convention`：分片**初判 E → 改判支撑充分**，依据是两条边（requires→axiom-5、other→thm-15-4）的 **rel_note**。
- #69 同类情形分片却按「rel_note 不算」照判 D —— 同一分片两处口径相反，摘要作者已点出。
- **我的裁决：#66 恢复 E 登记，死因 6，动作由「保留」改为 FIX。** 直接池证据（我实测 pool.tsv）：
  #66 的池只有两条 —— T1 = 15.03.md 的 91 字符零多项式约定句，T2（edges-D1.jsonl:170）= **与 T1 逐字相同的同一句**。
  那两条被援引作减轻的边**在池里没有 evidence**（只有 rel_note），故 **T2 新引证据为 0**，减轻不成立。
  statement 第二句需补锚或删除。置信度高（有直接实测）。
- **#70 的双重定性，我裁：节点级保留，锚点级 FIX，两者不真冲突。** 依据：
  #70 的池含 T2 两条（edges-D1.jsonl:182/185），evidence = 15.03.md 的 91 字符零多项式约定句，
  **是真 evidence 而非 rel_note**，且相对 T1（115 字符的封闭公理句）**引入了新引文**——
  故节点层面 T2 缓解**成立**，与 #66 情形不同。但锚点本身仍是 B 型错配（见 D-35 上一条），应换成零多项式约定句。
  即：保留节点、改锚点。置信度高。

**冲突 4（跨片，非实质，仅记账）：形式 D/E 的计数不可加**
- 三区间口径互不相同（详见 §1 末的口径警告），且行 31–56 的摘要已订正该片 §3 标题「17 例」应为 **20 例**。
- **我的裁决：不做跨片 D/E 加总**，只报分区间原始数；统一轴改用节点级动作（见下）。置信度高。

### 本报告的裁决计数（n = 逐行计数，可从上列各表与 §4 清单逐行数出）

| 区间 | KILL | FIX | 保留 | 进 SPEC | 小计 |
| --- | --- | --- | --- | --- | --- |
| 行 1–30（本文件 §2 批次 1–3 + §4） | 0 | 22 | 8 | 0 | 30 |
| 行 31–56（片摘要 §一） | 0 | 20 | 6 | 0 | 26 |
| 行 57–81（片摘要 §一） | 0 | 13 | 10 | 2 | 25 |
| 分片原始合计 | **0** | **55** | **24** | **2** | **81** |
| 我的改判：#66 保留 → FIX（冲突 3） | 0 | +1 | −1 | 0 | 0 |
| **最终** | **0** | **56** | **23** | **2** | **81** |

逐行口径说明（避免与分片自报数对不上）：
- 行 1–30 的 22 = §2 批次 1–3 的 20 个 `D-nn` 标签所覆盖的节点数（D-07 一标签一节点但两段、**D-13 一标签含 3 个节点**）；
  8 = §4 前 11 条中该区间独有者（行 7/8/9/22/23/25/27/28），另 3 条（行 10/18/19）计入 22 侧、在 §4 标「部分」。
- 行 31–56 的 20/6 直接取自摘要 §一（保留者为行 37、39、41、47、49、51）；该片**行 43 的「KILL 或强改」已由我裁为 FIX**，故 KILL 栏为 0。
- 行 57–81 的 13/10/2 逐行数自摘要 §一（进 SPEC = #57、#61）。
- **KILL 全区间为 0**：三个区间无一条建议删除节点。
- #70 不改计数（节点级仍记保留，锚点级 FIX 单独登记于 §6）。

## 3. 确认的形式 E 实例（unanchored clause）

**先声明口径不可加**（同 §1 末）：行 1–30 未做 D/E 二分，故本节**不含该区间的 E 计数**——
该区间的无锚从句已并入 §2 的「越界原文」一栏，未单独标 E。这是本报告的一处**登记口径缺口**，
不是覆盖缺口：那 30 个节点全部审过，只是没有按 E 单独编号，事后无法从摘要重建其 E 计数（**未核**，
需回原始 §2 逐条重判才能得数，本轮不做）。

**行 31–56：形式 E 20 例（E-1…E-20，对应 20 个缺陷节点）。**
摘要已订正分片 §3 标题的「17 例」为错，**以 20 为准**（20 例与「20 个节点存在缺陷」「FIX 20 条」三处闭合）。
该区间的一条结构性发现值得单列：**20 个缺陷节点的缺陷 100% 落在或延伸到 statement 末句**，
唯一例外是 **行 48**（`d:operations-of-example-2-complex-addition-and-real-scaling`，
`deliberately` 是对作者意图的归因，锚点无此内容）——分片自述这是该片**唯一不落在末句的形式 E**。
末句聚集是本报告最强的可机械化信号，见 §7。

**行 57–81：形式 E 4 例**，分两组，性质截然不同：
- **#60 单发，判死因 6、FIX**（见 D-35）。属真缺陷：可引之据现成（15.02.md:9，实测 175 字符）却未引。
- **#72 / #74 / #78 一组，死因 0，明确不判生产者。** 三者分别是连续函数、可微函数、二阶齐次方程解集，
  其封闭性的实质论证依赖**极限定理 / 求导线性性 / 微分算子线性性**，而这些定理在 `source/` 下不存在
  （只有 ch15），**锚点在物理上无法存在**。形式 E 在节点层成立，但成因是**源材料范围**。
  动作：显式标注跨章依赖（仿 #70 的 `atomic_reason` 写法）。
- **重要：这 4 条（连 #75 的可积性一项）不得计入 §5 的 SPEC 计数。** 分片把它们写进「SPEC 缺陷」一节（编号 S-3）
  却在正文声明「成因是源材料范围而非 SPEC」，节标题与内容不符；摘要已明确提醒勿计入。我采纳。

**我追加的 E 实例：#66**（见 §2 冲突 3）。恢复分片初判的 E，死因 6。
理由是其 statement 第二句无锚，而所援引的减轻只存在于 rel_note、不入池；实测 T2 新引证据为 0。

**形式 E 计数汇总（不跨区间相加）：** 行 1–30 **未按 E 登记**（口径缺口）；行 31–56 **20 例**；
行 57–81 **4 例 + 我追加 1 例（#66）= 5 例**，其中仅 **2 例判生产者**（#60、#66），3 例归源材料范围。

## 4. 检查过并判定支撑充分的节点

（含少量轻度选点问题但不影响结论的节点，标注在 id 后）

- d:vector-space-and-linear-vector-space-are-aliases
- d:unqualified-linear-space-may-be-real-or-complex
- d:objects-already-met-that-can-be-added-and-scaled
- d:axiom-1-closure-under-addition（部分，见 D-07）
- d:axiom-9-distributive-law-for-addition-of-numbers（正文段支撑充分；反例段见 D-13）
- d:axiom-10-existence-of-identity（同上）
- d:axiom-6-names-the-negative-as-minus-one-times-x（两条锚点各管一句，射程正好覆盖；本批最干净的一个）
- d:axiom-10-is-derivable-from-apostols-form-of-axiom-6（自报证据边界，见批次 3 末）
- d:real-in-real-linear-space-refers-to-the-scalars（两句两锚点，一一对应）
- d:thm-15-3a-the-scalar-zero-annihilates-every-element
- d:thm-15-3b-every-scalar-annihilates-the-zero-element

以上 11 条中，**8 条**为行 1–30 独有的支撑充分节点（行 7/8/9/22/23/25/27/28），
另 3 条（行 10 = D-07、行 18/19 = D-13）标「部分」、其缺陷段已计入 §2，**不重复计数**。

### 行 31–56 的支撑充分节点（6 条，逐行数自摘要 §一「保留」栏）

- 行 37 `d:proof-a-cancel-by-adding-the-negative-of-z` —— **诚实样板**：公理归属无锚，但节点在同句里如实声明「书中一行未点名公理」。
- 行 39 `d:proof-c-first-half-collapses-z-plus-ax-by-axiom-9` —— 两锚点逐字覆盖等式链，且谨慎写 `a negative` 把唯一性升级留给行 40，**拆分正确**。
- 行 41 `d:proof-c-second-half-uses-axiom-8-and-property-b` —— 锚点逐字含 `use Axiom 8 and property (b)` 与 `a(-x)=-(ax)`；末句完全不冒险。
- 行 47 `d:example-2-the-complex-numbers-with-real-scalars` —— 两锚点完整覆盖；仅 `field` 一词属术语外引，登记不判。
- 行 49 `d:example-2-shows-the-scalars-decide-real-or-complex` —— 锚点几乎逐字覆盖，**末句紧贴锚点，是末句处理的正面样本**（对照该片 20/20 缺陷全在末句）。
- 行 51 `d:operations-of-example-3-are-componentwise` —— `in terms of components` 属忠实展开，末句不引入新数学。

该区间另有 **14 条 FIX 属轻度**（死因 0、仅需补锚或收紧措辞），不列入本节：
行 31、32、33、34、36、44、45、46、48、53、54、56，以及已在 §2 详列的行 42、50。
其中行 32、34、44、48 分片标「FIX（轻）」，纯编辑性无锚措辞，不产生假数学。

### 行 57–81 的支撑充分节点（10 条，逐行数自摘要 §一「保留」栏）

- #59 `d:function-space-scalar-multiple-is-pointwise` —— 数乘定义在原文是**散文而非 display 公式**，锚点逐字覆盖全部 claim。
  **与 #57 构成 SPEC 致害的干净对照**（见 §5）。
- #63 `d:example-5-all-functions-on-a-given-interval` —— 末句整句无锚但数学内容可推出；仅排他性因果超出原文，登记。
- #65 `d:example-7-polynomials-of-degree-at-most-n` —— 缺口由子节点 #66 承担，**父子结构有覆盖（T3 合法承接）**。
- #71 `d:degree-exactly-n-is-not-a-subspace-of-degree-at-most-n` —— **本片锚点质量最好**：两锚点真正协同推出结论；Thm 15.4 的非空前提亦经核（含 t^n）。
- #73 `d:notation-c-a-b-for-continuous-functions-on-a-b` —— 末句后半为无锚因果，程度轻微，登记。
- #76 `d:example-11-functions-vanishing-at-a-point` —— 完美锚点合理让给子节点 #77（`atomic:false` 明确下挂），**T3 承接**。
- #77 `d:example-11-a-nonzero-prescribed-value-breaks-closure` —— **范例**：双见证对所有 c≠0 一律成立、无隐含限制，且恰对应两条封闭公理各一。
- #79 `d:example-12-nonhomogeneous-solutions-break-closure` —— **本片唯一末句落在锚点射程内者**；锚点内含 `Here again 0 is essential`，其 `again` 即 Apostol 自己的回指动作。
- #81 `d:knowledge-of-one-example-guides-work-in-the-others` —— 末句无锚，方向略偏（原文是「具体→其他具体」）。
  **注意：分片以「兄弟节点承载」减轻，按 §2 冲突 2 该减轻不成立**；我仍保留其「保留」判定，
  因末句可由锚点推出、偏差属措辞级；但**减轻理由须换**，不得写「兄弟已承载」。置信度中。

以上 **9 条**（#59、#63、#65、#71、#73、#76、#77、#79、#81）是本区间最终的支撑充分节点。
与分片自报的 10 条相差 1，差额就是 **#66**——分片列为保留，我改判 FIX（§2 冲突 3）。

**#70 不在本节，仍记 FIX。** 我在 §2 冲突 3 裁定它的**节点级 T2 缓解成立**（真 evidence、相对 T1 引入新引文），
但「保留」在本报告的口径里意为**无需动作**，而 #70 的锚点是 B 型错配、必须更换，
故动作码取 FIX（换锚），与分片裁决表一致。**这一条的「不判缺陷」与「需要动作」并存，不矛盾。**

三区间保留数合计：8（行 1–30）+ 6（行 31–56）+ 9（行 57–81）= **23**，与 §2 裁决表逐行闭合。

## 5. 因 SPEC 规则导致证据不足的实例计数

**计数：6 条**，分三档可信度。全部字符数为 tmp_index 实测（anchors.tsv / source-lines.tsv 的 charlen 列）。

### 5.1 归因确凿（4 条）—— 合规引文在物理上不存在

| 条目 | 被锁死的原句 | 实测字符 | 锁死规则 |
| --- | --- | --- | --- |
| D-05 行 5 | `Closure axioms`（分组标题） | 14 | 30 字符下限 |
| D-05 行 5 | `Axioms for addition`（分组标题） | 19 | 30 字符下限 |
| #57 行 57 | 按点加法定义式（15.03.md:16） | **27** | 30 下限 **+ 不得跨行**（独立 display 行）双重封锁 |
| #61 行 61 | Axiom 6 公式行（15.02.md:26） | **16** | 30 字符下限 |

- **D-05**（`d:ten-axioms-listed-in-three-groups`）：断言「两条封闭 + 四条加法 + 四条数乘」正确（我核过分组标题与公理编号），
  但两个分组标题都低于 30 字符下限，**无法作为锚点引用**。归因 SPEC 而非生产者。
- **#57**（`d:function-space-addition-is-pointwise`）：节点只能挂止于冒号的引子。
  **与 #59 构成本报告最干净的 SPEC 致害对照**：同一节点对（加法 / 数乘），
  数乘因原文是**散文**而支撑充分（#59 保留），加法因原文是 **display 公式**而不足（#57 归 SPEC）——
  差别只在原文版式，与生产者选点能力无关。
- **#61**（`d:function-space-axioms-reduce-pointwise-to-facts-about-real-numbers`）：8 条公理 + 2 个运算定义 + 零元
  要 3 个锚位承载，**结构上不可能**；且 `n_anchors`=3 已满（nodes.tsv 实测）。
  兼有真 T2 缓解（part-of 边 evidence = 15.03.md:19 末句，81 字符，origin=source；我在 pool.tsv 实测确认该条为 **T2 新引证据**）。
  归 SPEC 的同时是本报告**唯一一条 T2 真缓解**的节点。
- **附带实测（供主控直接引用）**：Axiom 6/7/8/9 的方程行分别为 **16 / 18 / 22 / 22** 字符
  （source-lines.tsv 的 15.02.md:26/34/40/46），**全部低于 30 下限**。
  这四条是「公理正文本体不可引，只能引标题句」这一系统性问题的根，D-10、D-11 的锚点缺公式本体即源于此。

### 5.2 归因偏软（2 条）—— 记 SPEC 但仍有空锚位

| 条目 | 分片归因 | 索引实测 | 我的裁决 |
| --- | --- | --- | --- |
| 行 46 `d:example-1-verification-is-the-field-axioms-of-r` | 3 锚点上限致证据不足 | `n_anchors` = **2**，剩 1 空位 | **不计入 SPEC**，归生产者 |
| 行 55 `d:example-4-nontrivial-check-is-closure-by-linearity-of-the-dot-product` | 3 锚点上限致证据不足 | `n_anchors` = **2**，剩 1 空位 | **不计入 SPEC**，归生产者 |

裁决理由：3 锚点上限只有在 `n_anchors` **已达 3** 时才构成约束。两条各剩 1 个空位，
且分片自己在正文承认了这点（摘要 §四 #7 已标为「归因偏软」）。故上表 6 条中，
**确凿 4 条 + 偏软 2 条**，主控若要一个保守数字，用 **4**。置信度：确凿档高，偏软档高（有 nodes.tsv 直接实测）。

### 5.3 明确不计入 SPEC 的（4 条，防止误计）

**#72、#74、#78，以及 #75 的可积性一项** —— 成因是 **`source/` 只有 ch15，外部定理不在语料内**，
锚点在物理上无法存在，但这**不是 SPEC 规则造成的**。分片把它们编入「SPEC 缺陷」一节（S-3）
却在正文声明成因是源材料范围，节标题与内容不符。**本报告不计入 SPEC 计数**，动作是显式标注跨章依赖。

### 5.4 SPEC 归因本身的一处未核

行 57–81 的分片**未读 `SPEC.md`** 即对 #57、#61 作「归 SPEC」处置——
即两条的 SPEC 归因依赖它未核的 SPEC 文本。我亦**未核 SPEC.md 原文**（不在本轮任务范围）。
上表 5.1 的四条 30 字符判据是按本报告给定的 SPEC 30–200 界写的；若该界在 SPEC 中另有豁免条款，
本节计数需重算。**登记为未核。**

## 6. 顺带发现的其它维度问题（不做裁定）

### 6.1 主通道统计（合并三区间，并回答「D1 属哪一形态」）

**先给形态答案：D1 属 T1 主导塌陷型，与 D3/D2 的 T2 主导、A1/S1 的 T3 主导都不同。**

D1 有 part-of 后代的节点数，我用 exposure.tsv 的 `n_partof_desc` 列实测：

| 组 | 有 part-of 后代的节点 | 占比 | 主通道 |
| --- | --- | --- | --- |
| **D1（本组）** | **13 / 81** | **16.0%** | **T1 塌陷主导，T2 与 T3 各仅救回 2 条** |
| D3 | 5 / 69 | 7.2% | T2（6/7） |
| D2 | 6 / 80 | 7.5% | T2（6/7） |
| A1 / S1 | （未在本轮实测） | 高 | T3 主导 |

D1 那 13 个有后代的节点（exposure.tsv 实测，格式为「行号 后代数」）：
行 5 (19)、27 (2)、28 (1)、29 (3)、44 (2)、47 (2)、50 (2)、53 (3)、65 (1)、67 (4)、72 (1)、76 (1)、78 (1)。
行 5 `d:ten-axioms-listed-in-three-groups` 一家独大（19 个后代、T3 池 60 条），其余 12 个各只有 1–4 个后代。

**为什么 D1 不是 T3 主导：** 后代覆盖率虽比 D3/D2 高出一倍（16% vs 7%），但后代**集中在一个节点上**，
且那 13 个节点里只有 2 个（#65、#76）的指控真被后代救回。D1 的后代拓扑是「一个宽扇出 + 十二个单子」，
不是 A1/S1 那种普遍的两层下延，故 T3 通道虽存在却极少生效。

**为什么 D1 也不是 T2 主导（与 D3/D2 相反）：** 这是本节最要紧的一条。
D1 的 81 个节点**全部** `T2 > 0`（exposure.tsv：T2>0 的节点 = 81/81），池总量 T1 106 / T2 132 / T3 127 条——
按池条数看 T2 甚至比 T1 多。**但这是假象。** 按本轮规定的正确度量「**新引入的源行数**」而非「池变大了」：
- 行 31–56：T2 相对 T1 **新引入 0 条源行的有 25/26 个**，唯一例外是行 44（新引 15.03.md:3，
  内容是 `reader can easily verify…`，与该节点被指控的从句无关）。**T2 全线塌陷，无一条指控被边证据免除。**
- 行 57–81：**7 条**指控经分片实测 T2 不缓解而站住（#58、#60、#62、#67、#69、#75、#80）；
  仅 **2 条**被真 T2 evidence 救回（#61、#70）；另 **2 条**的所谓缓解只在 rel_note 里（#66、#69），按池定义不入池。
- 行 1–30：**未按池口径核**（该区间早于四层池定义，只审 T1 锚点）。登记为未核，见 6.5。

**我实测的一处度量陷阱（重要方法结论）：** 我按 (file, quote) 对重算「T2 是否引入新证据」，
得到行 31–56 有 **7 个**节点的 T2 引入了新 (file,quote) —— 与分片摘要报的「新引源行 1 条」看似矛盾，**实则不矛盾**：
差额全部是**同一源行内的子串重复**。最干净的例子是行 40（本片最重条目），我逐字比对 pool.tsv：
T1 = 15.04.md 的 141 字符整句（该行 charlen=141、n_sentence_end=2，即锚点吃掉整行），
T2（edges-D1.jsonl:63）= **同句的 41 字符前缀**。
按 quote 计它是「新证据」，按源行计它是 **0 新增**。**按 quote 计数会系统性高报冗余度**，
这正是「冗余度的正确度量是新引入的源行数」这条规定要防的东西。本报告一律采用源行口径。

**「仅 TD」个案：D1 全区间 0 条。** 行 31–56 的六条最重条目（行 40、43、52、55、56 与 §6.2 涉及的 46/50/52）
池全部落在 T1；行 57–81 的 7 条站住的指控亦然。**与 §4.11 的 L64 那类（唯一「仅 TD」个案）无同型出现。**

### 6.2 「公理独立性」母题：一条章外洞见被无锚断了三遍

行 **46、50、52** 各自独立地断了「这是判断某公理是否必需的一个差的检验 / 公理独立性」这类话，
而分片 grep 全章确认**第 15 章从不谈公理独立性**。风险有二：
- `independent` 一词在章内**已被占用**为线性无关（15.06.md:29、15.07.md、15.11.md:7），有下游误连风险；
- 三处措辞互不引用，读者会以为是书里的主题。
建议三处**至多留一个并换词**。分片强调「这不是抽查能发现的」——三条各自看都像无害的一句评注。
**关联正面样本**：行 1–30 的行 16（`d:axiom-7-…`）与行 23 都**主动声明**了「不构成独立性证明」，
说明生产者知道这个标准；D-09、D-11 是同一生产者在同一标准下的失手，**不是标准缺失**。

### 6.3 跨层不一致：边层诚实、节点层不诚实

行 31–56 的一条结构性发现：那些无锚的公理归属**在边上已老实标 `origin: model` 且无 evidence**，
而在节点 statement 里被当作事实陈述。行 55 的边甚至已连到 `apostol:theorem-15-4-subspace-criterion`，
正是 D-24 建议补的那条（15.06.md:5，实测 129 字符）。
**建议：修 statement 时直接复用边上已有的 model 标注**，这是现成的、免费的诚实来源。
同型问题：行 52 的边 `data/edges-D1.jsonl:126` 是 `other` 关系指向 `d:axiom-5-existence-of-zero-element`、
`origin: model` 且无 evidence，与该节点「O 是零元组」这条无锚断言对应，属**记账位置**问题。

### 6.4 缺陷在 statement 与边 rel_note 上双写，修一处不够

**#68** 的见证缺陷（`both of degree n` 在 n∈{0,1} 上为假）**同时存在于 statement 与边 rel_note**，
是两处而非一处。主控修 statement 不足以修完，**须两处同改**。
这类「同一缺陷跨层复制」是本报告发现的第二类记账问题（第一类是 6.3 的层间不一致）。

### 6.5 未核事项（明确登记，不猜）

1. **行 1–30 未按四层池口径核 T2/T3。** 该区间早于池定义，只审 T1 锚点。
   其 22 条缺陷中有多少能被 T2/T3 免除，**未核**。这是本报告最大的方法性缺口。
   注：exposure.tsv 显示该区间 30/30 节点 T2>0、4 个节点有后代（行 5/27/28/29），故值得回查。
2. **行 31、45、53、54 的死因 0→1 改判只及口径、不及个案事实**（§2 冲突 1）。四条的逐句事实**未核**。
3. **#66、#69、#70 三处减轻所指向的目标节点自身锚点未核。** 分片只验证了「边存在且 rel_note 写明内容」，
   **未打开 `d:axiom-2/5/6`、`d:thm-15-4` 确认其自身锚点支撑所路由的内容**。
   我对 #66、#70 的池做了直接实测（结论见 §2 冲突 3），但**目标节点的锚点质量仍未核**。
4. **`apostol:` 前缀父节点未核**（`apostol:linear-space`、`apostol:v-n-space`、`apostol:real-linear-space`、
   `apostol:function-space`、`apostol:polynomials-of-degree-exactly-n`、`apostol:theorem-elementary-algebraic-properties`）。
   凡涉「父节点已承载某前提」的判断只验证了同文件兄弟节点。**`parent` 字段全区间未核。**
5. **`atomic` / `atomic_reason` 字段未核。** 行 44、47、50、53 标 `atomic: false` 并声明下挂 N 个子节点，
   分片称从相邻行推知自洽但未完整核对；行 57–81 亦未验证。
   注：这些可用 partof.tsv 机械核对，本轮未做。
6. **边的完备性与 `rel` 方向合规性未系统审。** 两片都只在边能改变 D/E 判定时才查边。
7. **A 型（变量/对象错）未主动扫。** 两片都声明非其职责；本报告只被动收获 2 条（#64 的对象错指、#70 的 B 型错配）。
8. **B 型未做系统扫描。** 可半机械化（查 shared-quotes.tsv 同 (file,quote)）但本轮未跑全量。
9. **#72/#74/#78/#75 依赖的外部定理只按数学常识判真**，未去 Vol.1 前面各章核 Apostol 确切表述（`source/` 下无那些章节）。
10. **R-5 悬置（行 57–81 分片自称最大悬置，我在此裁一半）：**
    #63、#64、#65、#72、#74、#75、#76、#78 共 **8 个节点**的主句谓语「…is a function space」普遍未锚，
    承担该谓语的原句是 `15.03.md:19` 末句（**实测 81 字符**，分片另一处记 89 为错）。
    该句已被行 43 的兄弟节点占用，且同时作 #61 的 part-of 边 evidence（edges-D1.jsonl:149，我在 pool.tsv 实测确认）。
    **我能裁的部分：分片以「兄弟节点（行 43）已承载」作减轻，按 §2 冲突 2 该减轻不成立**——
    行 43 不是这 8 个节点的 part-of 后代，故不入任何一层池。
    **我不能裁的部分：这 8 条是否因此各计一条缺陷，取决于 SPEC 对「锚点职责」的规定，而 SPEC.md 我未读。**
    维持悬置，**交主控**。若 SPEC 要求每个 statement 句子都被锚点管到（对应提案 G5-P12），则这 8 条全部成立。

### 6.6 摘要作者已核出的分片记账错（合并时以索引为准，不影响任何裁决成立）

行 31–56：形式 E 计数 17→**20**；行 37 锚点 39→**40**；行 45 的 74→**77**；行 49 的 105→**108**；
§6.2 标题「13 个共享对」但表体 11 行、索引 15 行（**三处不一致，13 无出处**）；
行 53 锚点 93 字符含 `EXAMPLE 4.` 前缀而行 54/55 锚点 82 字符无前缀（同为 15.03.md:11，表述可收紧、事实无误）。
另：**15.02.md:51 实测 791 字符、6 句**，远超 SPEC 200 上限，被推荐给行 48 时只能引其子句，分片未说明这一点。

行 57–81：形式 D 5→**6 例**（漏 #80）；§4「14 个」「16 行」→**15 行**（25 = 6 D + 4 E + 15 才闭合）；
`reader can easily verify…` 89→**81**；`for every real x in the intersection…` 61→**63**；
不齐次微分方程句 98→**99**；Axiom 6 引入句（15.02.md:23）88→**87**；Axiom 2 全句批 1 记「130+」→**175**；
15.03.md 行数 37→**38**（我实测 source-lines.tsv 该文件 38 行）。
分片另有一处**过期陈述未回改**：批 1 称 15.03.md:19 末句「全片段无人用过」，批 3 已实测它正是 #61 的 part-of 边 evidence。
以及一处**片内计数被读成全图**：该共享引文分片称「6 个节点引用」（片内正确），
shared-quotes.tsv 实测**共 16 个持有者 = 7 个节点 + 9 条边**，第 7 个节点是片外父节点 `apostol:polynomials-of-degree-exactly-n`。

**我实测无误、可放心复用的数值：** 15.02.md:7=160、15.02.md:9=**175**、15.02.md:17=**85**、15.02.md:26=**16**、
15.02.md:37=101、15.02.md:51=**791**、15.03.md:13=160、15.03.md:16=**27**、15.03.md:33=69、15.03.md:37=502、
15.04.md:9=**179**、15.04.md:25=111、15.04.md:65=**141**、15.06.md:5=129、15.06.md:11=**440**（加粗者为我本轮直接实测）。

## 7. 方法反思：形式 D 可机器化吗

**结论先写：不能全自动。可机械化的部分全部落在记账层，射程判断本身不可机械化。**
可行的形态是「机械预筛把人工注意力压到小候选集 + 人工逐句定夺」。
本节的 D1 实测值全部由我本轮直接跑出（数据源写在表内），与 §6.1 的结论同源但更机械。

### 7.1 真能跑的五条判据（附 D1 实测值）

| # | 判据 | 数据源 | D1 实测 | 抓什么 |
| --- | --- | --- | --- | --- |
| 1 | 空锚位检测 | nodes.tsv `n_anchors` | `n_anchors` = 1 的 **57** 个、= 2 的 **23** 个、= 3 的 **1** 个 → **80/81 有空位** | 机械否证「3 锚点上限」归因 |
| 2 | 池是否真扩（按源行） | pool.tsv × source-lines.tsv 子串反查 | T2 存在 **81/81**，但 T2 引入新源行的只有 **5** 个节点、共 **6** 条新行；T3 存在 13，引入新源行 **4** 个节点、共 **22** 条新行 | 区分「池变大」与「真有新证据」 |
| 3 | 末句定位 | statements.tsv 切句 × anchors.tsv | 行 31–56 的缺陷 **20/20** 落在或延伸到末句 | 缺陷位置的强先验 |
| 4 | B 型借用 | shared-quotes.tsv 同 (file,quote) `n_holders`≥2 | 半机械化，本轮未跑全量 | 同引文一成一败的候选 |
| 5 | 多句行标记 | source-lines.tsv `n_sentence_end` | 15.03.md:19/:25/:33/:35/:37 与 15.04.md:9 **全部 n_sent=4** | 封锁过报通道 (b) |

**判据 1 的直接收益：** 它把本报告 §5 的 SPEC 归因面压到只剩 **#61 一个节点**——D1 里 `n_anchors` 达 3 的仅此一条。
§5.2 把行 46、55 判回生产者不是口径选择，而是这条机械判据的必然结果。

**判据 2 的完整实测（可直接复用，格式为「行号 层 新增源行」）：**
T2 新增 —— 行 20（15.02.md:5）、行 21（15.02.md:17）、行 29（15.04.md:65）、行 44（15.03.md:3）、行 63（15.03.md:13 与 :19）。
T3 新增 —— 行 5（15.02.md 的 11 行 + 15.04.md 的 5 行，共 **19** 条）、行 27（15.04.md:55）、行 53（15.02.md:7）、行 67（15.06.md:5）。
其余 **72 个节点的 T2 与 T3 零新增源行**。行 5 一家独占 T3 新增的 19/22 条，与 §6.1「一个宽扇出 + 十二个单子」的拓扑描述一致。

**判据 2 抓到的一条实质更正（交主控，不改任何计数）：**
**行 29 = D-17** 的指控是「`a(-x)` 那一支在 15.04.md:65 有逐字依据而未被引」，
而我实测该节点的 **T2 恰好引入 15.04.md:65**。按四层池 T2 入池，故这条不是「证据不在图里」，
而是**内容在图里、只是记在边上**——即本轮定义的记账位置问题。
D-17 的动作仍是 FIX（补锚点），**故 §2 裁决表与 §4 的 23 条保留数均不变**，
但其**理由须由「缺证据」改写为「证据错位」**。这是本轮机械判据唯一改写掉一条既有判定理由的地方。
置信度高（pool.tsv 与 source-lines.tsv 双向实测）；不确定点：我**未重读该边的完整 evidence 文本**是否覆盖 D-17 指控的全部三项等式，只核到源行级。

### 7.2 跑不出来的三类

- **D 型射程不足（最危险，机器零覆盖）。** 标本是 **#62**：锚点主题高度相关（原文就在讲「封闭公理不满足」）、
  引文逐字为真、来自正确的段落，实际覆盖三处失败中的 **1/3**、八例中的 1/8。
  任何主题相似度打分或 `grep -F` 都会放行它。同型的 D-03（十条公理逐条空集检验全无锚）、
  D-17（三项等式链只锚两项）也一样：**引文越切题，漏检概率越高**。
- **A 型对象错、机制混同、意图归因。** #64 把「确切次数致命」记到例 7 头上（例 7 是 degree ≤ n）；
  #75 的机制对它自己点名的例 9 不成立；#48 的 `deliberately`、#58 的 `which is why` 是对作者意图的归因。
  三者都要求读懂数学与上下文，无一可由字符串操作发现。
- **数目与量词：可机械捞候选，不可机械定真假。** 词表（nine / eight / ten / twelve / only / the first / every）
  能把候选全部捞出，但本报告里 #62 的 `three`、#80 的 `twelve` 经核**为真**，
  行 43 的 `nine axioms are mechanical` 经核**为假**（封闭是两条公理，10−2=8）——
  **同一词表内三真一假，真假只能人工验**。这也是行 43 那条死因 4 被分片「反查」撞见、而非正查发现的原因。

### 7.3 一处度量的对称失效（本轮新发现）

本轮规定「冗余度的正确度量是新引入的源行数」，用来防按 quote 计数的**高报**。
我实测到它在多句行上会反向**低报**：

- **高报方向（规定要防的）**：行 40 的 T2 是 T1 同句的 41 字符前缀（T1 为 141 字符整句），
  按 quote 算是「新证据」，按源行算是 0 新增。源行口径正确地拦住了它。
- **低报方向（规定没防的）**：**#65** 在 §4 被判「T3 合法承接」（缺口由子节点 #66 承担），
  但我实测 #65 的 **T3 引入 0 条新源行** —— 因为 #66 的引文与 #65 的锚点同落在 **15.03.md:25**
  （该行实测 **360 字符、n_sentence_end = 4**）。同一行内的不同句子，按源行看是零新增，按语义看是真承接。
  **#76 / #77 同型**（同落 15.03.md:33，该行实测 180 字符、n_sent = 4）。

**结论：正确粒度是句，不是行、也不是 quote。** 行口径与 quote 口径的失效方向相反，
但**根因同一个：多句行**。这与过报通道 (b) 是同一件事的两面。
本报告 §6.1 采用源行口径的判断仍然成立（它处理的是高报方向），
但主控若要把这条判据做成脚本，**必须先切句**，否则 T3 承接会被系统性判成塌陷。
**注：本条不改 §4 任何裁决** —— #65、#76 的「承接成立」是语义判断，我只指出机械度量与它不同调。

### 7.4 一条干净的负面结果

check_graph 的 **15 条盲区边**（`origin=model` 却带 quote，见 unverified-model-quotes.tsv）
**无一条属于 D1**（我逐行核过该表全部 15 行）。
故 D1 的边证据不受该校验盲区污染，§6.1 与 7.1 判据 2 的 T2 计数**不需要为此打折**。

### 7.5 D1 的形态为什么恰好证伪「按池大小自动放行」

D1 的 81 个节点**全部** T2 > 0；按 quote 计池条数 **T1 106 / T2 132 / T3 127**（exposure.tsv 实测），
**T2 甚至多于 T1**。任何「池够大即放行」的自动规则都会放过整个 D1。
而按源行计，T2 的真新增只有 **6 条**、覆盖 5 个节点 —— **记账指标与真实证据量差了一个数量级**。
这就是形式 D 无法用池规模自动化的实证：**池的大小几乎不携带证据量的信息**。

可机械化的五条判据全部是记账层的（空锚位、池是否真扩、末句位置、共享引文、多句行），
它们能把人工注意力从 81 个节点压到一个小得多的候选集；
**但「这句引文是否支撑这条断言」不可机械化**——`grep -F` 在定义上只能证明引文未被篡改。
这正是锚点盲区五型与「N/N 锚点已验证 ≠ 正确性保证」的机器侧根据。

## 顺带发现（范围外，各一行，不展开）

- **§1 的一处自指瑕疵**：全 id `d:axiom-7-associative-law-for-multiplication-by-numbers` 在本报告中**只出现在 §1 那句「唯一未逐字出现」里**，该句因此自我否证；实质覆盖仍成立（D-13 以「节点 16」裁决行 16/18/19），建议主控改写该句措辞。
- **§6.5 第 1 条可退役一半**：行 1–30 的 T2/T3 机械侧我已核完（T2 新增仅行 20、21、29；T3 新增仅行 5、27；其余 25 个节点零新增），但「新增行是否支撑被指控从句」的语义侧仍未核。
- **覆盖缺口核查结论：不存在缺口**，行 1–30 的 30 个 id 全部在本报告 §2 批次 1–3 内被裁决（逐 id grep 实测 30/30）；`report/共享引文清单.md` 亦覆盖该 30 个 id，但那是共享引文维度，不作为形式 D 覆盖依据。
- 行 5 `d:ten-axioms-listed-in-three-groups` 的 T3 独占全组新增源行的 19/22 条，是 D1 唯一的宽扇出节点，值得单独做一次 T3 语义核查（本轮未做）。


