# G3d 15 条 origin=model 带 quote 的跨教材边

只读分析代理产出。**本文件是提案，未改动 data/ 下任何文件。**

审查对象：`data/edges-X.jsonl:106–121` 中 15 条 `rel=generalizes` 的 Apostol→Strang 边
（108 行不含 evidence 的 119 行不在本轮范围内）。这 15 条 `origin=model` 却带 `quote`，
`check_graph` 只校验 `origin=source` 的 916 条，从未逐字核过它们。

## 〇 结论速览

**逐字核验通过 15 / 失败 0**。15 条 quote 全部是对应 Apostol 源文件里逐字连续、不跨行的
子串，独立实测字符数与 `tmp_index/unverified-model-quotes.tsv` 的 charlen 列**逐条一致**，
全部落在 SPEC 的 30–200 界内。**没有虚构引文，硬禁令 2 无违反。**

**origin 应改 source 的 0 条。** 任务简报给的口径（"quote 来自教材原文 ⇒ origin 应标 source"）
在这里不成立，我不采用：`origin` 记的是**这条边的关系断言**的来源，不是 quote 字符串的来源。
Apostol 第 15 章通篇没有提到 Strang，任何 Apostol→Strang 的跨教材断言在教材里都无原文依据，
所以这 24 条跨教材边（15 generalizes + 6 contrasts + 3 alias-of）**全部只能是 origin=model，
现状是对的**。真正的缺陷不在 `origin` 字段，而在两处：(a) 工具缺口——`check_graph` 不核
`origin=model` 的 quote，导致 15 条引文长期无人验证（这次核完了，全过）；(b) 引文选得差
——**15 条里有 6 条的 quote 只截了定理/定义的假设句或引言半句，不含任何结论**，
即使逐字为真也支撑不了它所挂的断言（死因 6）。

**应撤回 1 条**：`:107 apostol:euclidean-space generalizes strang:orthogonal-vectors`
——源与目标不同类（空间 vs 两向量间的关系），quote 通篇未提正交，且 `:121`
已经承担了正确配对。死因 6 + 5，建议 KILL。

分类汇总（详见 §四、§五）：
- 方向与配对都站得住、quote 也支撑：**4 条**（113、114、116、121）
- 方向对但 quote 只有假设句/半句，需换引文：**6 条**（109、110、111、112、117、120）
- 方向对但"generalizes"过强（Strang 侧本来就是一般表述，差别在证明手段而非一般性）：
  **3 条**（115、116、118）——其中 116 与上一类重叠，建议改 `equivalent`
- 配对本身错、应改指或撤回：**2 条**（107 撤回、112 改指）
- 借用引文（B 型，quote 的主持有者是别的节点）：**6 条**（107、109、113、114、116、120）

置信度：逐字核验与字符数 = 高（可复算，见 §一）；origin 判定 = 高；
generalizes 方向 = 中（依据 statements.tsv 里两侧的 statement 与 Apostol 原文，
未通读 Strang 3.4/4.1/4.2 全文，只读了两侧 statement 与 dst 的锚点清单）。



## 一 逐条核验表

核验方法：`json.loads` 取出 evidence.quote 原字符串（不经 TSV 转义），
`quote in open(source/apostol-ch15/<file>).read()` 判逐字连续，
再按行切分定位命中行号（命中行号唯一 ⇒ 不跨行），`len(quote)` 独立实测。

| loc | ev_file:命中行 | 逐字命中 | 跨行 | 我实测 charlen | 索引 charlen | 一致 | quote 是否含结论 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| :106 | 15.10.md:11 | 是 | 否 | 162 | 162 | ✓ | 是（完整句，且正面讲一般化） |
| :107 | 15.10.md:25 | 是 | 否 | 75 | 75 | ✓ | 是（完整句，但与断言无关） |
| :108 | 15.14.md:11 | 是 | 否 | 102 | 102 | ✓ | 是（完整句） |
| :109 | 15.14.md:18 | 是 | 否 | 75 | 75 | ✓ | **否，只有假设句** |
| :110 | 15.14.md:60 | 是 | 否 | 79 | 79 | ✓ | **否，截到逗号处** |
| :111 | 15.13.md:87 | 是 | 否 | 79 | 79 | ✓ | **否，截到"the element"** |
| :112 | 15.15.md:3 | 是 | 否 | 131 | 131 | ✓ | **否，只有假设句** |
| :113 | 15.07.md:17 | 是 | 否 | 65 | 65 | ✓ | 是（完整句，且正面讲一般化） |
| :114 | 15.06.md:19 | 是 | 否 | 117 | 117 | ✓ | 是（完整句） |
| :115 | 15.08.md:5 | 是 | 否 | 124 | 124 | ✓ | 是（定理全文） |
| :116 | 15.08.md:9 | 是 | 否 | 102 | 102 | ✓ | 是（定义全句） |
| :117 | 15.08.md:19 | 是 | 否 | 106 | 106 | ✓ | **否，止于"the following:"** |
| :118 | 15.08.md:3 | 是 | 否 | 122 | 122 | ✓ | 是（定义全句） |
| :120 | 15.14.md:24 | 是 | 否 | 61 | 61 | ✓ | **否，公式在下一行 26–27 的 display 块里** |
| :121 | 15.11.md:3 | 是 | 否 | 110 | 110 | ✓ | 是（定义全句） |

15/15 逐字通过，15/15 字符数与索引一致，15/15 在 30–200 内，0 条跨行。

### 过报通道 (b) 与 (c) 的排查
`tmp_index/source-lines.tsv` 的 `n_sentence_end`（同一源行的句末标点数）：

| ev_file:行 | 该行 charlen | n_sentence_end | 说明 |
| --- | --- | --- | --- |
| 15.10.md:11 | 279 | 2 | 多句行，quote 只取第 1 句 |
| 15.10.md:25 | 75 | 1 | 整行=整句 |
| 15.14.md:11 | 186 | 2 | 多句行，取第 1 句 |
| 15.14.md:18 | 255 | 4 | 多句行，quote 只截了假设，结论在同一行后半 |
| 15.14.md:60 | 199 | 2 | 多句行，quote 截在逗号处 |
| 15.13.md:87 | 79 | **0** | 该行整句都没结束，正文接 89–91 的 display |
| 15.15.md:3 | 256 | 4 | 多句行，quote 只截假设 |
| 15.07.md:17 | 173 | 2 | 多句行，取第 2 句 |
| 15.06.md:19 | 436 | 4 | 多句行，取其中 1 句 |
| 15.08.md:5 | 124 | 3 | quote=整行 |
| 15.08.md:9 | 169 | 4 | 多句行，取第 1 句 |
| 15.08.md:19 | 106 | 2 | quote=整行，但整行本身不含结论 |
| 15.08.md:3 | 262 | 4 | 多句行，取第 1 句 |
| 15.14.md:24 | 61 | **0** | 该行不含句末标点，公式在 26–27 |
| 15.11.md:3 | 296 | 4 | 多句行，取第 1 句 |

13/15 落在 `n_sentence_end > 1` 的多句行上，**这 15 条一律不得按行号做覆盖率比对**
（已知过报通道 b）。两条 `n_sentence_end = 0` 的（:111 的 15.13.md:87、:120 的 15.14.md:24）
是最严重的情形：源行本身就是一个悬空的引出句，真正的数学内容在紧随的 `$$` display 块里，
quote 逐字为真而信息量为零。



## 二 origin 判定

### 判据先说清楚
SPEC.md:73–74 的原话是：「`origin: source` 必须给逐字 `evidence`（机器校验）。
`origin: model` **可省** `evidence`，但必须如实标注，不要把推断伪装成原文。」
——"可省"不是"禁带"。SPEC 并未禁止 `origin=model` 同时带 evidence，
所以这 15 条的字段组合本身**不违反 SPEC**。

关键是 `origin` 指的是谁的来源。`origin` 是**边的属性**，边的内容是「src rel dst」这个断言。
所以 `origin=source` 的含义是「教材原文明说了这个关系」，不是「这个 quote 是教材原文」。
Apostol 第 15 章从未提及 Strang、更未声明自己推广了谁；
Strang 3.4/4.1/4.2 也未提及 Apostol。因此**任何 Apostol↔Strang 的边，其关系断言都必然是
模型的对齐判断，`origin` 只能是 `model`**。全图 24 条跨教材边现状全为 `origin=model`
（本轮实测：generalizes 15 + contrasts 6 + alias-of 3，无一例 source），口径是自洽的。

### 逐条判定（全 15 条同一结论）

| loc | 应为 | 理由 | quote 处理 |
| --- | --- | --- | --- |
| :106 | **model**（保持） | 关系断言是模型对齐 | 保留，quote 恰好正面支撑一般化 |
| :107 | **model**（保持） | 同上 | **随边一起撤回**（见 §四、§五） |
| :108 | **model**（保持） | 同上 | 保留，但建议把 src 改指 `apostol:orthogonal-complement` |
| :109 | **model**（保持） | 同上 | **换引文**（现引文只有假设句） |
| :110 | **model**（保持） | 同上 | **换引文**（现引文截在逗号处） |
| :111 | **model**（保持） | 同上 | **换引文**（现引文截在"the element"） |
| :112 | **model**（保持） | 同上 | **换引文 + 改指** |
| :113 | **model**（保持） | 同上 | 保留 |
| :114 | **model**（保持） | 同上 | 保留 |
| :115 | **model**（保持） | 同上 | 保留（争点在 rel 不在 quote） |
| :116 | **model**（保持） | 同上 | 保留（建议 rel 改 `equivalent`） |
| :117 | **model**（保持） | 同上 | **换引文**（现引文止于"the following:"） |
| :118 | **model**（保持） | 同上 | 保留（争点在 rel 不在 quote） |
| :120 | **model**（保持） | 同上 | **换引文**（公式在 display 块里，现引文只是引出句） |
| :121 | **model**（保持） | 同上 | 保留 |

死因编号：`origin` 字段本身 **0（无死因）**；6 条需换引文的是 **死因 6**（引文不支撑断言，
在用但尚未进 SPEC）；:107 是 **死因 6 + 5**（源与目标不同类，属伪对齐）。

建议动作：`origin` 字段一律**保留**，不改。

### 需要进 SPEC 的一条
现行 SPEC 只规定 `origin=source` 受机器校验，于是 `origin=model` 带 quote 成了
**校验真空**：这 15 条从建图到本轮之前，任何工具都没核过。
建议进 SPEC：**「evidence 字段一旦存在，无论 origin 取值，都必须过逐字校验」**，
并同步改 `check_graph`，把校验分母从 916 提到 931。
本轮实测结果是 15/15 通过，所以这条规则的**追溯成本为零**，可以直接加。



## 三 单侧引文能否支撑跨教材断言

### 正面回答：不能。单侧引文在原理上不可能独立支撑跨教材 generalizes 断言。

判据是断言的**真值条件有几个**。「A generalizes B」是二元断言，要判它真假必须同时确定三件事：
1. A 断言了什么（Apostol 侧）；
2. B 断言了什么（Strang 侧）；
3. B 是 A 的一个特例（代入具体空间/具体内积后 A 退化成 B）。

一条只引 Apostol 的 quote，**最多只能确定 (1)**。(2) 需要 `strang-ch3/` 或 `strang-ch4/`
的原文；(3) 是模型的推理，本来就靠 `origin=model` 如实标注承担，不需要引文。
所以这 15 条的引文覆盖，结构上恰好**缺了三分之一**：15/15 条都只有 (1)，没有 (2)。

### 但这不等于「这 15 条无据」——缺的那一半在图里，只是没挂在边上
本轮实测：15 条边的 14 个不同 dst 节点，**每一个都自带 2–3 条锚点，且全部来自 Strang 源文件**
（`strang:dot-product-notation` 2 条 4.1.md、`strang:linear-independence` 2 条 3.4.md、
`strang:projection-onto-a-line` 2 条 4.2.md，……14/14 皆如此，见 `tmp_index/anchors.tsv`）。
也就是说 (2) 的原文依据在图里是齐的，只是记在 dst 节点的 T1，而不是记在边上。

这与四层证据池里 **T2 塌陷**的性质相同：**记账位置问题，不是内容缺失**。
但要注意四层池的 TD 规则在这里同样适用——从 dst 节点的角度看，这 15 条是指向它的边，
属 TD，**排除，不入 dst 的池**；反过来从边的角度，dst 的锚点也不自动成为边的 evidence。
所以「内容在图里」不能被当成「这条边已有双侧证据」来报覆盖率。

### 结论与建议
- **不判死因 6 于"单侧"本身**。单侧是 schema 造成的，不是这 15 条的个别过失：
  本轮实测全图 931 条带 evidence 的边，`evidence` 字段**全部是单个 dict**（931/931），
  一条边**结构上就装不下两侧引文**。追究个别边不公平。
- **建议进 SPEC**：跨教材边（src 与 dst 的 id 前缀不同教材）的 `evidence` 允许写成数组，
  且**要求两侧各一条**；或退一步，新增 `evidence_dst` 字段。在 schema 改之前，
  这 15 条的现状（Apostol 侧单引文 + origin=model）是**当前 schema 下能做到的最好状态**，
  不应因单侧而扣分。
- **报覆盖率时的正确说法**：这 15 条给跨教材断言引入的**新源行数 = 15 行，全在 Apostol 侧，
  Strang 侧新增 0 行**。不要说"跨教材对齐已有 15 条引文支撑"——那是把单侧当双侧。

置信度：高。判据是 schema 实测（931/931 单 dict）与 dst 锚点实测（14/14 有 Strang 侧锚点），
两项都可复算。不确定点：我没有逐条读 Strang 3.4/4.1/4.2 原文去核 dst 锚点的逐字性，
那 916 条已由 check_graph 覆盖，我按其结论采信。



## 四 generalizes 方向逐条判定

判据：读 `tmp_index/statements.tsv` 里 src 与 dst 两侧的 statement 全文，
问「把 Apostol 的一般对象代成 Strang 的具体对象（$V \to \mathbf{R}^n$、
$(x,y) \to v^{\mathsf T}w$），A 是否退化成 B」。逐条判，不一概而论。

**:106 inner-product → dot-product-notation　方向对，配对偏。** 公理化内积代入
$v^{\mathsf T}w$ 即得点积，一般化关系成立。偏差在 dst 是 `node_type=notation` 的记号节点
（"点积写作 $v\cdot w=v^{\mathsf T}w$"），概念推广记号是类型错配。但本条 quote 恰恰讲的就是
记号替换（"we write $(x,y)$ instead of $x\cdot y$"），所以勉强自洽。**保留**，死因 0。

**:107 euclidean-space → orthogonal-vectors　方向与配对都错。** 欧氏空间是空间，
正交向量是两向量间的关系，二者不构成一般/特例。且 quote（"A real linear space with an
inner product is called a real Euclidean space."）通篇未提正交，支撑不了这条边的任何一半。
`:121 orthogonal-elements → orthogonal-vectors` 已承担正确配对，本条是冗余的伪对齐。
**撤回（KILL）**，死因 6 + 5。

**:108 orthogonal-to-a-set → orthogonal-complement　方向对，src 挂错。** Apostol 一般欧氏空间
的 $S^{\perp}$ 推广 Strang 在 $\mathbf{R}^n$ 里的正交补，方向成立。但 src 写的是
`apostol:orthogonal-to-a-set`（元素对集合正交），而 quote 讲的是 $S^{\perp}$ 是子空间，
对应的是另一个已存在的节点 `apostol:orthogonal-complement`。**FIX：src 改指
`apostol:orthogonal-complement`**，死因 6（引文支撑的是邻近节点，不是所挂节点）。

**:109 theorem-15-15 → fundamental-theorem-part-2　方向勉强成立，配对松。** 15.15 断言
「有限维子空间 S 使 V 的每个 x 唯一分解为 $s+s^{\perp}$」；Strang FT part 2 断言
「$N(A)=C(A^{\mathsf T})^{\perp}$、$N(A^{\mathsf T})=C(A)^{\perp}$」。后者是**四个具体子空间的
互为正交补的识别**，Apostol 从不谈矩阵，推不出这个识别。只有把 Strang 那条读成
「$\mathbf{R}^n=C(A^{\mathsf T})\oplus N(A)$」时，它才是 15.15 的特例。**保留但换引文**，
现引文只有假设句（死因 6）；建议加 `rel_note` 说明对齐的是分解那一面，不是识别那一面。
不确定点：Strang 是否在 4.1 明写了 $\oplus$ 形式，我未读 Strang 原文，标**未核**。

**:110 projection-on-a-subspace → projection-onto-a-subspace　方向对，配对正。**
$s=\sum(x,e_i)e_i$ 代入正交列即得 Strang 的三步投影。**保留，换引文**（死因 6）。

**:111 projection-along-an-element → projection-onto-a-line　方向对，配对正。**
$\frac{(x,y)}{(y,y)}y$ 是 Strang 沿直线投影的一般化，无争议。**保留，换引文**（死因 6，
现引文 15.13.md:87 `n_sentence_end=0`，公式在 89–91 的 display 块里，引文信息量为零）。
另注：同一对 (src,dst) 在 `data/edges-X.jsonl:124` 还有一条 `contrasts`
——**同一对节点同时挂 generalizes 与 contrasts**，需主控裁一条。

**:112 theorem-15-16 → projection-onto-subspace-formula　方向对但目标挂错。**
15.16 是**最优性定理**（投影比 S 中任何别的元素更接近 x）；dst 是**公式**
$p=A(A^{\mathsf T}A)^{-1}A^{\mathsf T}b$。定理推广不了公式——公式的一般化是
`apostol:projection-on-a-subspace` 的定义式（已由 :110 承担）。15.16 该指的是 Strang 侧
"最近点/误差最小"那一条。图里 4.2 段可用的候选是 `strang:error-perpendicular-to-a`
或 `strang:error-vector`，但两者都不是"最优性"陈述本身。**FIX：改指
`strang:projection-onto-a-subspace`（其 statement 明写 "find the closest combination p"），
并换引文**；若主控认为该 dst 已被 :110 占用而不宜复用，则**撤回本条**。死因 6。

**:113 independent-set → linear-independence　方向对，本组最佳。** quote
"However, the present definition is not restricted to finite sets." **正面陈述了一般化本身**
——从有限序列扩到任意集合。15 条里唯一一条引文直接命中"推广"这个动作的。**保留**，死因 0。

**:114 linear-span → spanning-a-space　方向对。** 任意子集的有限线性组合之集推广
「矩阵列张成列空间」。quote 确立了一般 V 中 span 是子空间。**保留**，死因 0。

**:115 theorem-15-6 → all-bases-have-the-same-size　方向偏弱。** 两侧陈述的一般性其实相当：
Strang 那条写的是"both bases for the same vector space"，并未限定 $\mathbf{R}^n$。
真正的差别在**证明手段**（Apostol 用 Thm 15.5 两次；Strang 用 $W=VA$ 加短宽矩阵零解），
那是 `contrasts` 而不是 `generalizes`。**FIX：建议改 `contrasts` 并加 rel_note 指明
差别在证明手段**；若主控坚持保留 generalizes，则须补 rel_note 说明"一般性差别在于
Apostol 不预设 $\mathbf{R}^n$ 的坐标"。死因 0（非错，是关系词偏强）。

**:116 dimension → dimension　方向过强，应为 equivalent。** 两侧定义实质相同
（基的元素个数）；Strang 甚至多给了"$\mathbf{R}^n$ 的维数是 $n$"与
"不说空间的 rank、不说基的 dimension"两句用法约束，Apostol 多给了 $\dim\{O\}=0$。
这不是一般/特例，是同一定义的两种表述。**FIX：rel 改 `equivalent`**（封闭词表内），死因 0。

**:117 theorem-15-7 → basis-of-rn-from-invertible-matrix　方向对但只覆盖一半。**
15.7(b)「$n$ 维空间里任意 $n$ 个独立元素构成基」确实推广了 Strang 的
"独立 + 个数对 ⇒ 基"那一半；但 Strang 那条是 **iff**，还含"⇔ 是 $n\times n$ 可逆矩阵的列"
的矩阵刻画，Apostol 不谈矩阵，推广不到。**保留，换引文 + 加 rel_note 限定到 (b) 那一半**，
死因 6（现引文止于"Then we have the following:"，无任何结论）。

**:118 finite-basis → basis　方向对但有反向张力。** 一般化的是**环境空间**
（任意线性空间 vs $\mathbf{R}^n$ 与矩阵/函数空间）；但 Apostol 的节点是**有限**基，
在"基的势"这一维上反而比 Strang 的"sequence of vectors"更窄。合起来仍算一般化
（Strang 的基也是有限的），但值得 rel_note。**保留 + 建议加 rel_note**，死因 0。

**:120 pythagorean-formula → pythagorean-law-orthogonality　方向对，配对正。**
$\|x\|^2=\|s\|^2+\|s^{\perp}\|^2$ 推广 $\|v\|^2+\|w\|^2=\|v+w\|^2$。**保留，换引文**
（死因 6，现引文 15.14.md:24 `n_sentence_end=0`，公式在 26–27 的 display 块里）。

**:121 orthogonal-elements → orthogonal-vectors　方向对，配对正，引文完整。**
"内积为零"代入点积即得 $v^{\mathsf T}w=0$。**保留**，死因 0。

### 方向判定汇总
方向+配对都成立：**11 条**（106、108\*、109\*、110、111、112\*、113、114、117、120、121，
带 \* 者需改指或加 rel_note）；关系词偏强应改：**2 条**（115→contrasts、116→equivalent）；
方向勉强、需 rel_note：**1 条**（118）；方向错应撤回：**1 条**（107）。
**没有一条是把方向写反的**——不存在 Strang generalizes Apostol 的误写。



## 五 可执行修改清单

**本代理只读，以下改动由主控串行执行。** 所有替换用的新 quote 我都已独立 grep 过：
逐字连续、不跨行、字符数已实测并标注、全部落在 30–200 内。
行号是改动前的原始行号，**逐行原地替换，不增删行数**（唯一的例外是 §5.1 的删除，
建议主控按倒序处理或改为整行注释以免行号漂移）。

### 5.1 撤回 1 条

**`data/edges-X.jsonl:107`　删除整行**（死因 6+5，见 §四）。
原行：
```json
{"src": "apostol:euclidean-space", "rel": "generalizes", "dst": "strang:orthogonal-vectors", "origin": "model", "evidence": {"file": "15.10.md", "quote": "A real linear space with an inner product is called a real Euclidean space."}}
```
删除后跨教材边 24 → 23，全图边 1433 → 1432，带 evidence 的边 931 → 930。

### 5.2 换引文 6 条（origin 一律不动，仍为 model）

**`:109`**（新 quote 15.14.md:18，实测 113 字符）
```json
{"src": "apostol:theorem-15-15-orthogonal-decomposition", "rel": "generalizes", "dst": "strang:fundamental-theorem-part-2", "origin": "model", "evidence": {"file": "15.14.md", "quote": "Then every element x in V can be represented uniquely as a sum of two elements, one in S and one in $S^{\\perp}$ ."}}
```

**`:110`**（新 quote 15.14.md:66，实测 53 字符）
```json
{"src": "apostol:projection-on-a-subspace", "rel": "generalizes", "dst": "strang:projection-onto-a-subspace", "origin": "model", "evidence": {"file": "15.14.md", "quote": "is called the projection of $x$ on the subspace $S$ ."}}
```

**`:111`**（新 quote 15.13.md:93，实测 38 字符）
```json
{"src": "apostol:projection-along-an-element", "rel": "generalizes", "dst": "strang:projection-onto-a-line", "origin": "model", "evidence": {"file": "15.13.md", "quote": "is called the projection of x along y."}}
```

**`:112`**（新 quote 15.15.md:3，实测 73 字符；同时改指 dst，见 §四）
```json
{"src": "apostol:theorem-15-16-approximation-theorem", "rel": "generalizes", "dst": "strang:projection-onto-a-subspace", "origin": "model", "evidence": {"file": "15.15.md", "quote": "Then the projection of x on S is nearer to x than any other element of S."}, "rel_note": "对齐的是最优性/最近点那一面"}
```
注意：`rel_note` 在 SPEC 里标注为「仅 rel=other 时必填」，非 other 时是否允许携带，
**我未在 SPEC 找到明文允许或禁止，标未核**。若主控判定不允许，则去掉 `rel_note` 字段，
把说明另记在提案里。本节其余带 `rel_note` 的条目同此保留意见。

**`:117`**（新 quote 15.08.md:23，实测 55 字符）
```json
{"src": "apostol:theorem-15-7", "rel": "generalizes", "dst": "strang:basis-of-rn-from-invertible-matrix", "origin": "model", "evidence": {"file": "15.08.md", "quote": "(b) Any set of n independent elements is a basis for V."}, "rel_note": "只推广 Strang 那条 iff 的独立+计数那一半，不含矩阵可逆刻画"}
```

**`:120`**（新 quote 15.14.md:58，实测 93 字符）
```json
{"src": "apostol:pythagorean-formula-for-orthogonal-decomposition", "rel": "generalizes", "dst": "strang:pythagorean-law-orthogonality", "origin": "model", "evidence": {"file": "15.14.md", "quote": "the remaining terms being zero since $s$ and $s^{\\perp}$ are orthogonal. This proves (15.17)."}}
```

### 5.3 改指 src 1 条

**`:108`**（src 改为已存在的 `apostol:orthogonal-complement`，
该 id 实测存在于图中并已被 `data/edges-X.jsonl:122` 引用；quote 不变，仍是 15.14.md:11，102 字符）
```json
{"src": "apostol:orthogonal-complement", "rel": "generalizes", "dst": "strang:orthogonal-complement", "origin": "model", "evidence": {"file": "15.14.md", "quote": "It is a simple exercise to verify that $S^{\\perp}$ is a subspace of V, whether or not S itself is one."}}
```

### 5.4 改关系词 2 条

**`:115`**（generalizes → contrasts，quote 不变）
```json
{"src": "apostol:theorem-15-6", "rel": "contrasts", "dst": "strang:all-bases-have-the-same-size", "origin": "model", "evidence": {"file": "15.08.md", "quote": "THEOREM 15.6. Let $V$ be a finite-dimensional linear space. Then every finite basis for $V$ has the same number of elements."}}
```

**`:116`**（generalizes → equivalent，quote 不变）
```json
{"src": "apostol:dimension", "rel": "equivalent", "dst": "strang:dimension", "origin": "model", "evidence": {"file": "15.08.md", "quote": "DEFINITION. If a linear space V has a basis of n elements, the integer n is called the dimension of V."}}
```
注意：`equivalent` 是对称关系。改后需查是否已存在反向重复边
（`strang:dimension equivalent apostol:dimension`）——本轮实测跨教材边里**不存在**该反向边，
可安全改，但主控改完应重跑对称边去重检查。

### 5.5 原样保留 4 条
`:106`、`:113`、`:114`、`:121` 不动（含 origin=model、quote、rel 全不改）。
`:118` 亦不改字段，仅建议在提案层面记一句"一般化的是环境空间而非基的势"。

### 5.6 需主控裁决、不属本代理范围的 1 处
`(apostol:projection-along-an-element, strang:projection-onto-a-line)` 这一对
同时有 `:111 generalizes` 与 `:124 contrasts` 两条边。二者不必然互斥
（可以既是一般化又在表述上有对比），但按封闭词表的用法应择一。**建议保留 generalizes、
撤回 :124 的 contrasts**，理由是两侧确为一般/特例关系，contrasts 无独立信息增益。
置信度中，:124 不在我的审查范围（它无 evidence，不属这 15 条），标为待裁。

### 5.7 改后应变化的计数
- 边总数 1433 → 1432（删 :107）
- 带 evidence 的边 931 → 930
- 跨教材边 24 → 23；其中 generalizes 15 → 13（删 :107、:116 改 equivalent）、
  contrasts 6 → 7（:115 改入）、equivalent 0 → 1、alias-of 3 不变
- 若 §5.6 也执行，contrasts 7 → 6，边总数 1432 → 1431
- `check_graph` 的校验分母：若同时采纳 §二末尾那条 SPEC 提案，应从 916 提到 930



## 顺带发现

- Strang 侧节点用了封闭词表外的 `node_type`：实测有 `notation`（如 `strang:dot-product-notation`）与 `method`（如 `strang:projection-onto-a-line`），词表只允许 concept/theorem/proof-step/example。
- `evidence` 字段全图 931/931 都是单个 dict，schema 结构上装不下双侧引文，跨教材对齐因此天然只能单侧。
- `apostol:euclidean-space` 与 `apostol:real-euclidean-space` 是两个独立节点（nodes-A1.jsonl:47 与 :48），语义高度重叠且无边相连，疑似应有 is-a 或 alias-of 边。
- 本轮 6 条借用引文（B 型）中，:107 的 quote 实为 `apostol:real-euclidean-space` 的 anchor[0]，:109 的 quote 实为 `d:finite-dimensionality-supplies-a-finite-orthonormal-basis` 持有——借用发生在语义邻近的兄弟节点之间，比跨语义借用更难用机器发现。
- `tmp_index/unverified-model-quotes.tsv` 表头写 15 条、实际 15 行数据，但行号列里 `:119` 缺失（那行 contrasts 边无 evidence），编号不连续，易被误读为漏了一条。
- `rel_note` 在 SPEC 里只规定「仅 rel=other 时必填」，未说明非 other 时可否携带；§5.2 若采纳需先定这个口径。
- 本代理在实验根目录留下 7 个临时脚本 `tmp_G3d_a.py` … `tmp_G3d_g.py`，未清理，供复算用。

