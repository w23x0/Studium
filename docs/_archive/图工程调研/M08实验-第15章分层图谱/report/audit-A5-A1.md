# 审计 A5 —— `data/inherited/nodes-A1.jsonl`(Apostol 第15章 L1 底座,63 节点)

审计角色:审计 A(正确性与归属)。审计对象:63 个 `apostol:` 节点,覆盖 15.01–15.11。
配套 `edges-A1.jsonl`(112 条)仅在「节点 statement 与边方向矛盾」时抽查,未逐条审边。

**覆盖完整,无截断**:63 个节点全部出裁决,`report/audit-A5-A1-verdicts.jsonl` 63 行,
顺序与输入逐行对应(机器核对通过,见 §6)。

---

## §1 数字总览

| 裁决 | 计数 |
| --- | --- |
| KEEP | 57 |
| FIX | 6 |
| KILL | 0 |

死因分布(仅非 0):

| 死因 | 计数 | 节点 |
| --- | --- | --- |
| `6` 锚点不支撑陈述 | 4 | `apostol:zero-element`(形态 E)、`apostol:theorem-elementary-algebraic-properties`(形态 D/E)、`apostol:theorem-15-11-components-relative-to-an-orthogonal-basis`(形态 E)、`apostol:parsevals-formula`(形态 E) |
| `1` 量词过度断言 | 2 | `apostol:real-euclidean-space`、`apostol:orthonormal-set` |
| `2` 编造成员归属 | 0 | — |
| `3` 伪造教材出处 | 0 | — |
| `4` 数学错误 | 0(独立成因;两条 cause 1 的后果也是假命题) |
| `5` 伪抽象·层塌缩 | 0 | — |

先行的机器校验结果(我自己重跑,未参考他人产出):

- 63 个节点共 141 条锚点,**全部** 在声明的 `file` 中逐字连续出现,缺失 0 条。
- 长度全部落在 30–200 区间内,无越界。
- 有 3 组 `(file, quote)` 被两个节点共用,均属正当共用(同一定义句同时支撑概念与其记号),非「借引」:
  `AXIOM 6...`(`axioms-for-addition` + `negative-of-an-element`)、
  `We call this the subspace spanned by S...`(`linear-span` + `linear-span-notation-l-of-s`)、
  `DEFINITION. In a Euclidean space V, the nonnegative number...`(`norm` + `norm-notation`)。
- `sections` 归属:**无一例伪造**。所有 `sections` 值都指向真实存在的小节,且该小节确实讲了该对象。
  一处偏差是 `apostol:zero-element`(见 §3),一处偏宽是 `apostol:spanning-set`(`15.08` 无锚点但确有相关内容)。
- 边的形式检查:`origin: source` 的 96 条全部带 `evidence`,`rel=other` 的 4 条全部带 `rel_note`,
  `is-a`/`generalizes` 无反向重复。逐一核对 `is-a`/`generalizes`/`implies`/`alias-of`/`other` 共 30 条的方向,
  **未发现与节点 statement 矛盾者**。

底座总体质量结论:这个 L1 底座在「数学是否正确」和「出处是否真实」两项上非常干净——
57/63 完全无需改动,0 例伪造出处,0 例编造归属,0 例 KILL。
它的问题集中在**第三项**:锚点与陈述之间的支撑关系。这也正是机器校验 100% 通过所掩盖的那一层。

---

## §2 每类缺陷的典型实例

### 2.1 死因 1(量词过度断言)——两例,都在 statement 的最后一句

**实例 A:`apostol:real-euclidean-space`**

statement 第二句:

> These are the examples Apostol is primarily interested in, and **proofs given for V_n carry over verbatim to any real Euclidean space.**

它挂的锚点 2 是 15.10.md 的:

> Therefore, the very same proof is valid in any real Euclidean space.

引文逐字为真。但把它读回原文语境,这句话的主语是**一个特定的证明**——Theorem 12.3(V_n 上的 Cauchy-Schwarz)的证明,
而且原文专门交代了它为什么能搬:

> When we proved the corresponding result for vectors in $V_{n}$ (Theorem 12.3), we were careful to point out that the proof was a consequence of the properties of the dot product listed in Theorem 12.2 and did not depend on the particular definition used to deduce these properties.

也就是说,「能搬」是因为**那一个证明只用了 Theorem 12.2 列出的那几条一般性质**。
节点把「the very same proof」放大成「proofs given for V_n」(复数、无限定),得到一个假命题:
第12章里「V_n 的维数是 n,一组基是 n 个单位坐标向量」的证明就搬不到 C(a, b) 上去,
而 C(a, b) 恰恰是一个实欧氏空间(15.10 例3),它还是无穷维的。
凡是用到分量、n 元组、叉积、维数为 n 的第12章论证,一概搬不过去。

这同时是死因 6 的**形态 D(射程不足)**:引文为真、对象也对(都在讲实欧氏空间里证明的可搬性),
只管住了断言的一部分(一个证明),而断言覆盖的是全部证明。因为话题完全对得上,抽查时极易漏过。

**实例 B:`apostol:orthonormal-set`**

statement 第二句:

> Dividing each element of an orthogonal set by its norm produces an orthonormal set.

锚点 2:

> Dividing each $u_{n}$ by its norm, we obtain an orthonormal set $\{\varphi_0,\varphi_1,\varphi_2,\ldots \}$ where $\varphi_{n} = u_{n} / \| u_{n}\|$ .

引文逐字为真,但它讲的是 15.11 那个**具体的**三角函数系 S,而原文在这句之前刚刚写明:

> so S is an orthogonal set. Since no member of S is the zero element, S is independent.

「没有一个成员是零元素」是这个例子自带的前提。节点把它抹掉后,断言对一般正交集为假:
正交集的定义只约束**不同的**元素对,而 `(O, x) = 0` 恒成立,所以 `S = {O, x}`(x 非零)是合法的正交集;
此时 `||O|| = 0`,除法无定义,得不到任何正交规范集。缺的是「of nonzero elements」这个前提。
这也是形态 C/D:用一个端点齐全的具体例子去支撑一个把端点情形放进来的一般陈述。

### 2.2 死因 6(锚点不支撑陈述)——四例

四例的共同结构是:**三条锚点全部落在脚手架上**(定理抬头、引出句、证明说明、历史注记),
而 statement 真正断言的那些等式一条都没有锚点管到,尽管原文里那些等式行是可引的。
详见 §3,那里给出为什么这不是「锚点上限用完了」可以解释的。

### 2.3 一条被 SPEC 制度性挡住、不计入产出者账上的缺陷类型

第15章的核心公理等式因 30 字符下限而**根本无法引用**。我实测的字符数:

| 出处 | 等式 | 字符数 |
| --- | --- | --- |
| 15.02.md 公理6 | `x + (- 1) x = O.` | 16 |
| 15.02.md 公理7 | `a (b x) = (a b) x.` | 18 |
| 15.02.md 公理8 | `a (x + y) = a x + a y.` | 22 |
| 15.02.md 公理9 | `(a + b) x = a x + b x.` | 22 |
| 15.03.md 函数加法 | `(f + g) (x) = f (x) + g (x)` | 27 |
| 15.10.md 范数定义 | `\| x \| = (x, x) ^ {1 / 2}` | 26 |
| 15.10.md 内积公理(3) | `(3) $c(x,y) = (cx,y)$` | 21 |

受影响的节点:`apostol:axioms-for-addition`(公理6)、
`apostol:axioms-for-multiplication-by-numbers`(公理7/8/9 三条全部)、
`apostol:function-space`(函数加法)、`apostol:norm` 与 `apostol:norm-notation`(范数定义式)、
`apostol:inner-product-axioms`(公理3)。这七处只能引周边散文,**判 KEEP,不计缺陷**。

`apostol:axioms-for-multiplication-by-numbers` 是最严重的一例:statement 列了四条等式,
其中三条被 30 字符下限挡死,只有 `AXIOM 10. EXISTENCE OF IDENTITY. For every x in V, we have 1x = x.` 可引——
一个节点的四分之三内容在本实验的锚点制度下无法取证。

另一条硬约束是每节点 3 条锚点上限。有 8 个节点确实是 3 条已满、无处再挂
(节点 1、4、19、27、36、38、52、55、63 等),这部分我在裁决理由里明确写了「SPEC cap」,不记在产出者账上。

---

## §3 用「拆子命题 → 找管辖锚点」新发现的问题

方法:把每个节点的 statement 拆成独立子命题,逐个问「哪条锚点管这一句」,
把「无锚点管辖」的子句单独拎出来去原文核。63 个节点全部走了这一遍。
结果分成三档,第一档是本轮的核心发现。

### 3.1 第一档:三个定理节点,**全部断言无锚点管辖**——锚点只锚了脚手架

这是我用这套方法抓到的、单纯抽查绝不会发现的一类。三个节点的所有锚点都停在断言**之前一格**,
而断言本身(那些等式)在原文里是独立可引的行。

**(1) `apostol:theorem-elementary-algebraic-properties`(Theorem 15.3)**

statement 断言了八条恒等式:`0x = O`;`aO = O`;`(-a)x = -(ax) = a(-x)`;
`ax = O ⇒ a = 0 或 x = O`;`ax = ay, a≠0 ⇒ x = y`;`ax = bx, x≠O ⇒ a = b`;`-(x+y) = -x-y`;n 个 x 相加等于 nx。

三条锚点:

1. `THEOREM 15.3. In a given linear space, let $x$ and $y$ denote arbitrary elements and let $a$ and $b$ denote arbitrary scalars. Then we have the following properties:` —— 定理抬头,只交代量词,「following properties」是什么一个字没说
2. `The next theorem describes a number of properties which govern elementary algebraic manipulations in a linear space.` —— 引出句
3. `We shall prove (a), (b), and (c) and leave the proofs of the other properties as exercises.` —— 证明分工说明

**八条恒等式,零条锚点。** 三条锚点合起来只证明了「书里有个 Theorem 15.3,讲若干代数性质,只证了前三条」,
完全没有证明这八条恒等式的**内容**。任何一条被写错(比如把 (d) 写成「`ax = O ⇒ a = 0` 且 `x = O`」,
或把 (f) 的前提 `x ≠ O` 丢掉)机器校验依然 100% 通过,抽查者若只看「话题对不对」也会放过。

而原文里这些行是可引的,我实测:

- `(d) If $ax = O$ , then either $a = 0$ or $x = O$ .` —— 50 字符,可引
- `(h) $x + x = 2x, x + x + x = 3x$ , and in general, $\sum_{i=1}^{n} x = nx$ .` —— 76 字符,可引
- `(g) $-(x + y) = (-x) + (-y) = -x - y.$` —— 38 字符,可引
- `(e) If $ax = ay$ and $a \neq 0$ , then $x = y$ .` —— 48 字符,可引
- `(f) If $ax = bx$ and $x \neq O$ , then $a = b$ .` —— 48 字符,可引
- `(c) $(-a)x = -(ax) = a(-x).$` —— 28 字符,差 2 字符不可引(唯一被 SPEC 挡住的一条)

即八条里有五条(d、e、f、g、h)是可逐字引用的。
所以「锚点上限 3 条用完了」不能解释这个节点:它把 3 个槽位全给了脚手架,
而五条断言本身是可引的。**这是可修的,不是 SPEC 挡住的。**
我的 fix:statement 不动(数学全对),把锚点 2、3 换成 (d) 与 (h) 两行。

**(2) `apostol:theorem-15-11-components-relative-to-an-orthogonal-basis`(Theorem 15.11)**

节点存在的全部意义就是两个分量公式:`c_j = (x, e_j)/(e_j, e_j)`,以及正交规范基下 `c_j = (x, e_j)`。
三条锚点:

1. `THEOREM 15.11. Let $V$ be a finite-dimensional Euclidean space with dimension $n$ , and assume that $S = \{e_1, \ldots, e_n\}$ is an orthogonal basis for $V$ .` —— 假设
2. `then its components relative to the ordered basis $(e_1, \ldots, e_n)$ are given by the formulas` —— 「由以下公式给出」,**在公式前一格断掉**
3. `In particular, if $S$ is an orthonormal basis, each $c_{j}$ is given by` —— 又是「由…给出」,**又在公式前一格断掉**

两条锚点各自预告了一个公式,然后都恰好停在公式前。假设被锚了两遍,结论一遍没锚。
原文 (15.8) 是 101 字符、(15.9) 是 33 字符,**两条都可引**。这是形态 E 的教科书样本:
出错的那句(如果出错)恰好是唯一没有任何锚点管到的一句,而且这里「那句」是节点的**全部**结论。

**(3) `apostol:parsevals-formula`(Theorem 15.12)**

三条锚点:

1. `The next theorem shows that in a finite-dimensional Euclidean space with an orthonormal basis the inner product of two elements can be computed in terms of their components.` —— 引出句
2. `assume that $\{e_1, \ldots, e_n\}$ is an orthonormal basis for $V$ . Then for every pair of elements $x$ and $y$ in $V$ , we have` —— 停在 `we have` 之后、(15.11) 之前
3. `Note: Equation (15.11) is named in honor of M. A. Parseval (circa 1776–1836), who obtained this type of formula in a special function space.` —— 历史注记

第三条锚点值得单独说:它**认证的是名字,不是恒等式**。它证明了「(15.11) 叫 Parseval 公式」,
但对「(15.11) 是什么」提供零信息。一个把共轭放错位置的 Parseval 公式(比如写成
`(x,y) = Σ conj(x,e_i)(y,e_i)`)会带着这三条锚点 100% 通过机器校验。
原文 (15.11) 104 字符、(15.12) 70 字符,**两条都可引**。

三例合看,是一个**系统性的产出习惯**,不是三次偶然:遇到「定理抬头 + 编号公式」的版式时,
产出者倾向于锚定散文(抬头、引出句、注记),回避 LaTeX 显示公式行。
`apostol:theorem-15-7` 是反例——它锚了 `(a)`、`(b)` 两行断言本身——说明产出者有能力这么做,
只是不稳定。**底座里凡是「结论是显示公式」的定理节点都要复查锚点**,这是本轮最可迁移的结论。

### 3.2 第二档:一个 `sections` 归属偏差(形态 E)

`apostol:zero-element`,`sections: ["15.02","15.04"]`,statement 第二句:

> In a function space the zero element is the function whose values are everywhere zero.

这句为真,但它出自 **15.03**,既不在 `sections` 里,也不被两条锚点(都在 15.02/15.04)覆盖。
按声明的出处去核这句话的读者会核不到。这是**归属**问题而非数学问题,
且第三个锚点槽位是空的,原文 `The zero element is the function whose values are everywhere zero.`
是 66 字符、完全可引——可修。判 FIX,修法给在 verdicts 里(补 `15.03` 到 sections 并加该锚点)。

这一例也说明:`sections` 字段的正确性不能只看「这些小节讲了这个对象吗」(讲了),
还要看「statement 的每一句都能在这些小节里找到吗」(找不到)。

### 3.3 第三档:11 处「子句无锚点管辖但为真且在声明小节内」——判 KEEP,但记录在案

这些我没判 FIX(内容为真、出处小节正确、可自行核验),但它们是同一个风险面上的东西:
一旦将来有人改写 statement,这些位置没有锚点兜底。逐一列出,便于编排者按需补锚:

| 节点 | 无锚点管辖的子句 | 该子句是否可引 | 空槽 |
| --- | --- | --- | --- |
| `apostol:linear-space` | (无;但锚点3「includes all these examples」不支撑任何子句,属装饰性引文) | — | 0 |
| `apostol:function-space` | 零元素是处处为零的函数 | 可引(66) | 1 |
| `apostol:linear-span` | S 为空时 L(S) = {O} | 可引 | 1 |
| `apostol:spanning-set` | 「张成」的定义本身(三个槽位全给了例子和 Apostol 的设问) | 可引 | 0 |
| `apostol:finite-linear-combination` | 求和式 x = Σ c_i x_i | 可引(40) | 1 |
| `apostol:dependent-set` | 消失和式 Σ c_i x_i = O | 可引(40) | 1 |
| `apostol:independent-set` | 「不同于第12章定义」的对比 | 相关句未引 | 0 |
| `apostol:dot-product-in-vn` | 按分量求和的定义式 | 可引 | 1 |
| `apostol:complex-inner-product` | 伴随关系 (x, cy) = conj(c)(x, y) | 可引 | 1 |
| `apostol:orthogonal-set` | 例子里的 S 是三角函数系(锚点只说了「so S is an orthogonal set」,没说 S 是什么) | 可引(98) | 1 |
| `apostol:weighted-integral-inner-product` | w(t) = 1 退化为无权情形 | 可引(42) | 1 |
| `apostol:angle-between-two-elements` | 「恰好一个 θ」的理由(Note 那句) | 可引(86) | 1 |
| `apostol:theorem-15-5` / `15-6` / `15-4` / `独立性例7` | 证明可搬性/证明梗概等尾句 | 部分可引 | 0–1 |

另有两处**形态 B(借引)**,内容无害但值得记录:
`apostol:finite-dimensional-space` 的锚点 2 是 `THEOREM 15.6. Let $V$ be a finite-dimensional linear space.`——
它是 Theorem 15.6 的抬头,不支撑「有限维」的定义(定义已由锚点 1 完整承担);
`apostol:dimension` 的锚点 3(Example 1 关于 V_n)同样不支撑 statement 的任何子句。
两处都只是浪费槽位,不引入假命题,判 KEEP。

### 3.4 关于「缺陷集中在最后一句」的验证

任务书说前一轮 9 例缺陷有 6 例在最后一句。本轮 6 例 FIX 中:

- 最后一句出错:2 例(`real-euclidean-space`、`orthonormal-set`,即两条死因 1)——都是「在锚点射程之外多补一个洞见」,
  且**两句都是把一个带前提的具体结论去掉前提后普遍化**,失效机制完全相同。
- 归属偏差在最后一句:1 例(`zero-element`)。
- 其余 3 例(死因 6)不是「最后一句」问题,而是**全句无锚点覆盖**,分布在整个 statement 上。

所以「最后一句」规律在死因 1 上复现了(3/3 的 FIX 里有 2 例死因 1 都在末句),
但死因 6 的这三例揭示了一个**不同分布**的缺陷面:它不集中在某一句,而集中在某一种**版式**
(定理 + 编号显示公式)。抽查若只加强「读最后一句」这一个动作,会整类漏掉 §3.1 的三例。

---

## §4 底座级问题:向上传染范围

方法:遍历 `data/` 下所有文件的 `parent` / `members` / `src` / `dst` 字段,统计谁引用了这 6 个 FIX 节点。
**我只读了这些字段用于定位,没有审计任何下层文件的内容。**

### 4.1 传染面统计

| FIX 节点 | 死因 | D 层子节点数 | 被引边数 | L2 成员 |
| --- | --- | --- | --- | --- |
| `apostol:theorem-elementary-algebraic-properties` | 6 | **10**(nodes-D1) | 12(edges-D1 ×10, edges-D2 ×2)+ A1 内 3 | — |
| `apostol:parsevals-formula` | 6 | **5**(nodes-D3) | 5(edges-D3)+ 1(edges-A2-s2)+ A1 内 3 | — |
| `apostol:theorem-15-11-components-...-orthogonal-basis` | 6 | **5**(nodes-D3) | 5(edges-D3)+ 5(edges-A2-s1/s2/s3/x2)+ 1(edges-D4)+ A1 内 2 | **2 个 L2 结构** |
| `apostol:zero-element` | 6 | 1(nodes-D1) | 1(edges-D1)+ 6(edges-D2)+ 2(edges-A2-s1)+ 1(edges-A2-s2)+ 1(edges-D4)+ A1 内 4 | — |
| `apostol:orthonormal-set` | 1 | **2**(nodes-D3) | 2(edges-D3)+ 8(edges-A2-s1/s2/s3)+ 1(edges-D4)+ A1 内 2 | — |
| `apostol:real-euclidean-space` | 1 | 0 | 1(edges-A2-x2)+ A1 内 4 | — |

受影响的下层文件,**点名**:

- `data/nodes-D1.jsonl`(81 节点)—— 11 个节点挂在两个 FIX 节点下
- `data/nodes-D3.jsonl`(69 节点)—— 12 个节点挂在三个 FIX 节点下
- `data/edges-D1.jsonl`、`data/edges-D2.jsonl`、`data/edges-D3.jsonl`、`data/edges-D4.jsonl`
- `data/edges-A2-s1.jsonl`、`data/edges-A2-s2.jsonl`、`data/edges-A2-s3.jsonl`、`data/edges-A2-x2.jsonl`
- `data/structures-L2-a.jsonl`(`L2:read-off-a-coefficient-by-one-pairing`)
- `data/structures-L2-c.jsonl`(`L2:orthogonalizing-first-decouples-the-coefficients`)

### 4.2 哪些会**真的**传染,哪些不会

必须区分两类。四条死因 6 的 statement **数学上全对**,错的只是取证方式——
它们不会把假命题传下去,传下去的是**未取证的真命题**。风险是「上层引它当已验证事实,而它其实没被验证过」,
一旦发现底座某条公式抄错,整条链条要重查。这是**取证债**,不是错误传播。

两条死因 1 是**真的假命题**,会传播:

**(1) `apostol:orthonormal-set` —— 有一个 D 层子节点直接坐在那句错话上**

`data/nodes-D3.jsonl` 里有 `d:normalizing-an-orthogonal-set`,`parent` 正是 `apostol:orthonormal-set`。
从 id 就能看出它拆的就是「把正交集除以范数得到正交规范集」这一句——
也就是我判定缺了「of nonzero elements」前提的那一句。
**如果这个 D 节点继承了母节点的缺陷措辞,它会把「任意正交集都可规范化」当成一条原子事实固定下来**,
而这条事实对含 O 的正交集为假。这是本轮我能指出的**最直接的一处向上传染**,
建议编排者在落地母节点修法时连带复查该 D 节点(我未审计其内容,仅据 id 与 parent 指出)。

同一母节点下另有 `d:orthonormal-set-adds-unit-norm`,由 id 看是拆第一句(定义句),该句无缺陷。

**(2) `apostol:real-euclidean-space` —— 传染面小,但方向危险**

它没有 D 层子节点,只被 1 条 `edges-A2-x2` 的边指向(跨教材桥),加 A1 内部 4 条边。
传染面小。但它那句错话的**内容**是「V_n 的证明可以整体搬到一般实欧氏空间」——
这正好是一条**跨教材对齐**和**抽象层**最容易借用的元命题。
如果 H-cross 或 L2 层用它来论证「V_n 与一般欧氏空间在证明层面可互换」,
就会把一条假的可迁移性声明写进抽象增益里。指向它的那条 x2 边值得复查。

### 4.3 一条给编排者的判断

底座 63 个节点里 0 例 KILL、0 例伪造出处,说明「上面全错」的最坏情形没有发生:
挂在这 63 个节点上的 D 层与 L2 层,其**事实基础**基本是稳的。
真正需要动的是两处:`orthonormal-set` 那句缺前提的话(会传假命题),
以及 §3.1 三个定理节点的锚点(会传取证债,其中 `theorem-15-11-...` 还上到了两个 L2 结构)。
按传染面排序,修复优先级是:
`orthonormal-set` > `theorem-15-11-components-...`(5 个 D 子节点 + 2 个 L2)>
`theorem-elementary-algebraic-properties`(10 个 D 子节点)> `parsevals-formula`(5 个 D 子节点)>
`zero-element` > `real-euclidean-space`。

---

## §5 不确定项

1. **跨章引用无法核验。** 有 5 个节点的 statement 引用了第12章的内容:
   `apostol:independent-set`(「不同于第12章对有限集的定义」)、`apostol:theorem-15-5`(Theorem 12.8)、
   `apostol:theorem-15-7`(Theorem 12.10 的 (b)(c) 部分)、`apostol:real-euclidean-space` 与
   `apostol:cauchy-schwarz-inequality`(Theorem 12.2/12.3)、`apostol:complex-euclidean-space`(Section 12.16)。
   `source/` 只有第15章 16 个文件,第12章不在其中。
   我能核的是「15.x 确实这样说了第12章」(全部核过,无一伪造),
   **不能核的是「第12章是否真的那样」**。定理编号是否对得上、12.10 的 (b)(c) 是否真对应 15.7 的 (a)(b),我判不了。
   注意这与 `apostol:real-euclidean-space` 的 FIX 无关——那一例我是靠 15.10 内部的语境判的,不依赖第12章。

2. **`apostol:spanning-set` 的 `sections: ["15.06","15.08"]` 我判不了紧。**
   三条锚点全部来自 15.06,15.08 没有任何锚点。15.08 确实反复用到「spans」
   (基的定义、Example 4「no finite set of polynomials spans the space」),
   所以列 15.08 不算伪造;但「张成」的定义在 15.06 就给全了,15.08 是否**必要**我倾向于否,又不足以判 FIX。
   同一节点还有一个更实在的问题(定义句本身无锚点覆盖),已记在 §3.3。

3. **`apostol:orthogonal-set` 与 `apostol:orthonormal-set` 的边界我判 KEEP 但不完全踏实。**
   `orthogonal-set` 的 statement 第二句拿三角函数系当例子,而这个例子在原文里是**同时**用来说明
   正交集、独立性和正交规范化三件事的。节点 59、60 各取一部分,取法本身合理,
   但两个节点的锚点都只截取了这个长例子的一小段,读者从锚点复原不出例子的全貌。这算不算缺陷我拿不准,故判 KEEP + 记录。

4. **`apostol:uniqueness-of-components` 被标为 `node_type: theorem`,而原文没有把它列为编号定理**
   (它是 15.08 里 Equation (15.4) 之后的一段行内推导)。
   我认为这是合理的抽取(它确实是一条有证明的断言),但「把书里没编号的段落提为 theorem 节点」
   是否符合本实验意图,属于抽取口味问题,不是正确性问题,我不判。

5. **OCR 噪声我按 SPEC 要求不修正,但有一处影响可读性。**
   15.10 的内积公理列表里,第 4 条正性公理**丢了编号**(原文直接是一个显示公式
   `(x, x) > 0 \quad i f \quad x \neq O`,没有 `(4)`)。
   `apostol:inner-product-axioms` 的 statement 忠实地写成「and (x,x) > 0 if x is not the zero element」
   而没有编号,这是对的;但如果将来有人按「四条公理」去找 `(4)`,会找不到。
   同类噪声还有 `f o r a l l x i n V`(15.02 公理5)、`nc on any other special property`(15.07,应为 `not on`)。
   这些不是节点的问题,记录备查。

6. **边我只做了抽查。** 112 条边我核了形式完整性(全部通过)和 30 条非 `requires`/`part-of` 边的方向,
   没有逐条核 `requires` 的 68 条与 `part-of` 的 7 条的 `evidence` 是否支撑其方向
   (只机器核了「evidence 存在」)。任务书说边只在与 statement 矛盾时才看,我按此执行,
   但这意味着**边上可能存在与 §3 同型的「引文为真但不支撑该关系」缺陷,我没有系统查**。

---

## §6 自查

**id 是否逐字复制:是,且从未手打。**

裁决文件的 63 个 id 不是我手写的。我用脚本从 `data/inherited/nodes-A1.jsonl` 逐行
`json.loads(...)['id']` 取出,按行号索引写进裁决记录——id 字符串从未经过我的键盘,
构造上就排除了手打误差。

写完后另做一次独立核对:

- 行数:输入 63,裁决 63。
- **逐位置序列相等**:`[n['id'] for n in nodes] == [v['id'] for v in verdicts]` → `True`,顺序与输入完全一致。
- 集合相等 `True`,裁决内无重复 id。
- 两份 id 列表的 SHA256(前16位)均为 `05ae923517cdefa7`,**匹配**。

其他自查项:

- schema:63 行全部只含 `id`/`verdict`/`cause`/`reason`/`fix` 字段;6 条 FIX 全部带非空 `fix`;
  57 条 KEEP 不含 `fix` 字段。检查脚本报 0 问题。
- `fix` 内容:6 条全部给出了**完整的替换后句子**或**完整的替换后锚点 JSON**,无一条只写「应该改」。
- 锚点复核:141 条锚点我全部机器复验过在声明文件中逐字存在(0 缺失),长度全部在 30–200 内。
  我在报告里声称「可引」的每一条候选串,都实测过 `in` 命中与字符数,未凭印象下结论。
- **一处自我纠错**:我最初把 `apostol:finite-linear-combination` 与 `apostol:dependent-set` 的
  求和式判为「因 30 字符下限不可引」,实测为 40 字符即可引,已改写这两条裁决理由
  (从「SPEC 限制」改为「anchor hygiene」)。同样,Theorem 15.3 的 (e)(f) 两行我第一次测试因
  Python 转义失败而误判为不可引,实测 48 字符可引,已在 §3.1 更正。
- 独立性:我没有读 `report/` 下任何其他审计的产出(audit-A*/audit-B*/*-verdicts.jsonl),
  也没有读 `M08实验-Apostol微积分卷1/`。§4 只读了 `data/` 下文件的
  `parent`/`members`/`src`/`dst` 字段用于定位传染面,未读其 statement,未审计其内容。
- 未修改 `data/` 下任何文件。产出仅 `report/audit-A5-A1-verdicts.jsonl` 与本文件。
- 覆盖:63/63,无遗漏,无静默截断。

