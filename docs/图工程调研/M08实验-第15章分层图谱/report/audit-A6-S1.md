# 审计 A6 —— `data/inherited/nodes-S1.jsonl`(Strang ch3–4,L1 底座,62 节点)

审计身份:审计 A(正确性与归属)。审计对象为**从未经人工审计**的继承文件。
配套边文件 `edges-S1.jsonl` 仅在怀疑「节点 statement 与边方向矛盾」时抽查,未逐条审边。

裁决文件:`report/audit-A6-S1-verdicts.jsonl`(62 行,顺序与输入严格一致)。

## §1 数字总览

| 项 | 数 |
| --- | --- |
| 节点总数 | 62 |
| KEEP | 60 |
| FIX | 2 |
| KILL | 0 |

死因分布:

| 死因 | 含义 | 数 | id |
| --- | --- | --- | --- |
| 0 | KEEP | 60 | — |
| 1 | 量词过度断言 | 1 | `strang:basis` |
| 2 | 编造成员/父节点归属 | 0 | — |
| 3 | 伪造教材出处 | 0 | — |
| 4 | 数学错误 | 0 | — |
| 5 | 伪抽象·层塌缩 | 0 | — |
| 6 | 锚点不支撑陈述 | 1 | `strang:pivot-columns-basis-for-column-space`(形态 D) |

机器校验复核(我自己重跑,未采信「已校验」标注):

- 128 条锚点(62 节点)全部 `grep -F` 逐字命中,**0 失败**。
- 长度全部落在 30–200 字符区间内,**0 违规**。
- `(file, quote)` 对**无一重复** ⇒ 本文件不存在形态 B「借引」。这是本文件与前几轮受审文件的显著差别。
- `sections` 归属:62 节点全部指向真实存在的 `3.3/3.4/3.5/4.1/4.2`,且所引锚点文件与 `sections` 一致;跨节点的(如 `['3.4','3.5']`)均确有两节内容支撑。**未发现伪造出处,死因 3 计 0。**

底座质量总评:这是一个**质量明显高于预期**的文件。62 个节点里只有 2 处需要动,且都不是编造出处或编造归属。下文 §4 说明为什么「跨教材污染」这一预设高危项在本文件上几乎没有实现。

## §2 每类缺陷的典型实例

### 死因 1:量词过度断言 —— `strang:basis`

statement 末句:

> A space has infinitely many different bases.

Strang 的原话(3.4.md 第 202 行)是**带限定**的:

> The vectors $v _ { 1 } , \ldots , v _ { n }$ are a basis for $\mathbf { R } ^ { n }$ exactly when they are the columns of an n by n invertible matrix. Thus $\mathbf { R } ^ { n }$ has infinitely many diferent bases.

Strang 说的是 **R^n** 有无穷多基,理由也只对 R^n 成立(每个 n 阶可逆矩阵给一组基)。节点把主语换成了「a space」。

这不只是「原文没这么说」,而是**同一节里就有反例**。3.4.md 第 334 行:

> We end here with the space Z that contains only the zero vector. The dimension of this space is zero. The empty set (containing no vectors) is a basis for Z.

零空间 Z 的基是空集,**唯一一组**,不是无穷多组。所以这句话作为一般命题为假,而否证它的原文就在同一节的结尾段。

三条锚点分别是「basis 定义」「独立且张成」「两个向量张不出 R^3」——**没有一条谈及基的个数**。这正是形态 E:出错那句恰好是唯一没有锚点管到的一句;同时也落在「缺陷集中于 statement 最后一句」的已知规律上。

对照证据(这一点让判决更硬):**同文件的 `strang:basis-of-rn-from-invertible-matrix` 把限定保留得完全正确**——它写的是「so R^n has infinitely many different bases」。同一份产出里,一处保留 R^n、一处丢掉 R^n,说明这是局部失范而非产出者理解错误。

fix(已写入裁决):

> A basis for a vector space is a sequence of vectors that are linearly independent and that span the space: not too many and not too few. R^n has infinitely many different bases, so a basis is not unique.

### 死因 6 形态 D:锚点管不住 —— `strang:pivot-columns-basis-for-column-space`

statement:

> The pivot columns of A are a basis for its column space: **they are independent because they start with the r by r identity matrix**, and every free column is a combination of them. The dimension of the column space is r. Note that the pivot columns of A must be used, not those of R.

加粗那句的出处是 3.5.md 第 59 行,但原文说的对象是 **R**:

> Reason: The pivot columns 1 and 4 form a basis for **C(R)**. They are independent because they start with the r by r identity matrix.

节点第二条锚点也诚实地写着 `they are a basis for C(R)`——**锚点自己说的是 C(R),陈述说的是 C(A)**。对象在引用过程中漂移了。

而这条理由**移到 A 身上就是假的**。A 的枢轴列一般不以 r×r 单位阵开头:取

```
A = [[2, 4],
     [1, 3]]
```

秩 2,两列都是枢轴列,前导 2×2 块是 `[[2,4],[1,3]]`,不是 I。所以「because they start with the r by r identity matrix」对 A 不成立。

反讽之处在于节点**末句自己强调**「the pivot columns of A must be used, not those of R」——它明知 A 与 R 的枢轴列不可混,却用只有 R 才具备的性质去论证 A。结论(A 的枢轴列是 C(A) 的基、维数为 r)是**对的**,坏掉的是理由。

Strang 给 A 的正确理由在 3.5.md 第 122 行:

> Right reason: The same combinations of the columns are zero ( or nonzero) for A and R. Dependent in A ¢c;, dependent in R. Say that another way: $A x = \mathbf { 0 }$ exactly when $R x = \mathbf { 0 }$

fix(已写入裁决):

> The pivot columns of A are a basis for its column space: the same combinations of the columns are zero for A and for R, so the pivot columns of A inherit independence from those of R, and every free column is a combination of them. The dimension of the column space is r. Note that the pivot columns of A must be used, not those of R.

**注意 3.5 节的第 120 行是一个陷阱**,原文写着 `Wrong reason: "A and R have the same column space." This is false.` 产出者没有踩这个陷阱(没有节点声称 C(A)=C(R)),但踩了紧邻的另一个坑:把 R 的独立性理由搬给了 A。

## §3 用「拆子命题 → 找管辖锚点」新发现的问题

方法:把每个 statement 拆成独立子命题,逐句问「哪条锚点管这一句」。管不到的子句单独查原文。全 62 节点执行。

### 3.1 这个方法唯一抓到的**真缺陷**

`strang:basis` 的末句(§2 已详述)。三条锚点覆盖「定义」「独立+张成」「两向量张不出 R^3」,**基的个数无人管辖** ⇒ 查原文 ⇒ 发现限定被删且同节有反例。

若只做话题级抽查,这条极易漏过:节点讲 basis,锚点讲 basis,`grep` 100% 通过,话题完全对得上。

### 3.2 「无锚点管辖但为真」的子句(5 例,均判 KEEP)

这些子句超出锚点射程,但我逐一回原文查证后确认为真、且在 `sections` 已声明的节内。**它们不是缺陷,但是审计盲区的真实分布**,记录在此供方法学参考。

| id | 无人管辖的子句 | 回查结果 |
| --- | --- | --- |
| `strang:full-row-rank` | 「one solution if m = n, infinitely many if m < n」 | 真。3.3:147 与 3.3:217 表格 |
| `strang:dimension` | 「We never speak of the rank of a space or the dimension of a basis」 | 真,逐字见 3.4:276 |
| `strang:row-space-notation` | 「The left nullspace is written N(A^T)」 | 真,3.5:16;`sections` 已含 3.5 |
| `strang:vector-splitting-row-null` | 「splits **uniquely**」 | 真但非逐字。存在性见 4.1:117/187;唯一性由正交补的直和结构必然成立,且 4.1:123 对 x_r 已给完整唯一性证明。属温和加强 |
| `strang:error-vector` | 「The vectors p and e add to b」 | 真,4.1/4.2:231「The vector b is being split into the projection p and the error e = b - p」 |

其中 `strang:vector-splitting-row-null` 的 `uniquely` 是全文件**唯一一处**「锚点无逐字、靠数学结构补上」的加强。我判 KEEP,但它是本文件里最接近边界的一条,列入 §6。

### 3.3 一个「差一点就是形态 A」的观察

`strang:ata-invertible-iff-independent-columns` 的第一条锚点逐字是:

> A is invertible if and only if A has linearly independent columns.

**孤立读这句话是假的**——矩形矩阵 A 根本没有逆。原文第 269 行是 `## $A ^ { \mathrm { T } }$ A is invertible if and only if...`,OCR 的 LaTeX 标记把 `A^T` 和 `A` 隔开,子串从标记之后开始截取,于是「A^T」掉了。

判 KEEP 的理由:**节点自己的 statement 写对了**(`A^T A is invertible if and only if...`),第二条锚点(第 283 行)干净完整,且这是 OCR/标记的产物而非产出者改动原文。但这条说明:**逐字子串校验通过的引文,单独读起来可以是一个假命题**。这是形态 A(变量/符号位置错误)的一个新变种——不是产出者搬错了变量,而是引文截取边界落在了标记内部。列入 §6。

## §4 跨教材污染专节

任务书预设本文件最可能的缺陷是「用 Apostol 的框架讲 Strang」。我按三个子类逐项搜查,结论是:**这个预设在本文件上基本没有实现,污染节点数为 0,过度一般化 1 例。**

### 4.1 用 Apostol 说法伪造 Strang 出处:**0 例**

搜查方式:全文件搜 Apostol 侧特征词汇(`linear space`、`family`、`element`、`L(S)`、`finite basis`、`ordered basis`、`vacuously`、`axiom`),并逐节点比对 statement 用词与 Strang 原文用词。

结果:62 个节点**全部使用 Strang 自己的词汇层**——`vector space` 而非 `linear space`,`sequence of vectors` 而非 `set of elements`,`nullspace`(Strang 的连写)而非 `kernel`,`pivot / free variable / elimination / rank` 这些 Apostol 第 15 章完全没有的词。没有任何节点出现 `L(S)`、`family`、`element` 之类 Apostol 特征表述。

特别值得肯定的两处:

- `strang:basis` 的 statement 用 **sequence**(`a sequence of vectors`),这正是 Strang 的载体选择,而 Apostol 用的是 set。产出者没有把 Apostol 的 set 语言灌进来。X 层的 `x:basis` 在 `divergence` 里也明确记录了这个 set/sequence 差异,双方口径一致。
- `strang:bases-for-matrix-and-function-spaces` 讲矩阵空间与函数空间——这是最容易滑向 Apostol 抽象线性空间叙事的节点。但它引的三条锚点全是 3.4 原文(第 280/286/330 行),`n^2`、`sin x` 与 `cos x`、维数 2 全部逐字可查(3.4:308、3.4:330)。这是**用 Strang 自己的话讲 Strang 也讲了的抽象内容**,不是层塌缩,判 KEEP。

### 4.2 把 Strang 限定在 R^n / 矩阵上的结论说成一般结论:**1 例**

即 `strang:basis`(§2)。「R^n has infinitely many bases」→「A space has infinitely many bases」。这是本文件唯一一处真正命中任务书预设风险的缺陷,而且命中的正是「丢掉 R^n 限定」这一子类。

反向核查:我逐个检查了其余所有含全称量词的节点,**未发现第二例**。`strang:linear-independence` 的 `applies to any sequence of vectors in any vector space` 看起来最像过度一般化,但 Strang 第 56 行原文就是这么写的:

> The following definition of independence will apply to any sequence of vectors in any vector space.

这是 Strang 本人的一般化声明,不是产出者加的。判 KEEP。同理 `strang:column-space-orthogonal-to-left-nullspace` 里的 `always`,原文第 78 行自带 `are always orthogonal subspaces`。

### 4.3 把具体维数/秩例子说成定理:**0 例**

3.5 节的主例是一个 rank r = 2 的 3×5 矩阵,维数 2、3、1 等具体数字散布全节。这是最容易被误当定理抽走的素材。

逐一核查 `strang:counting-theorem`、`strang:special-solutions-basis-for-nullspace`、`strang:pivot-rows-basis-for-row-space`、`strang:fundamental-theorem-of-linear-algebra-part-1`:**全部写成 r / n-r / m-r 的一般形式,没有一个把 `5-2=3` 之类的例子数字固化成定理**。`strang:special-solutions-basis-for-nullspace` 甚至正确地把原文「they contain the identity matrix in rows 2, 3, 5」(例子的具体行号)一般化成「in the free rows」,一般化方向正确且成立。

`strang:rank-one-matrix` 引的是 3.5:213-217,那里的 `[[2,3,7,8],[2a,...],[2b,...]]` 是例子,但节点写的是 `A = uv^T` 一般形式,与第 217 行「Every rank one matrix is one column times one row」逐字一致。判 KEEP。

### 4.4 小结

**点名清单:跨教材污染节点 0 个;因丢弃 Strang 的 R^n 限定而过度一般化的节点 1 个 —— `strang:basis`。**

为什么预设风险没有实现,我的判断是:这批节点的锚点密度很高(62 节点 128 条锚点,平均 2.06 条),且锚点几乎全部落在 Strang 的**定义句与高亮结论句**上。产出者是贴着原文的黑体框和 DEFINITION 抽的,这个工作方式天然抑制了外部框架植入。代价是 §3.2 那类「锚点只管定义、不管补充洞见」的射程不足,而不是伪造出处。

## §5 对跨教材对齐层的影响

我读了 `data/nodes-X.jsonl`(仅为定位引用关系,**未审计 X 文件本身**)。22 个 `x:` 节点通过 `strang_ids` 字段引用 S1 节点。我审出的两个缺陷波及以下不变量。

### 5.1 `strang:basis` 的错误波及 8 个 `x:` 节点,但**只让 1 个不变量出现内部矛盾**

引用 `strang:basis` 的 `x:` 节点:`x:vectors-need-not-be-columns`、`x:zero-element-destroys-independence`、`x:basis`、`x:unique-coordinates-in-a-basis`、`x:right-count-upgrades-one-basis-property-to-both`(另有 3 个经 `strang:dimension` 间接相关)。

**最严重的一处是 `x:zero-element-destroys-independence`。** 它的不变量声明是:

> ...the zero element can never belong to a basis, and **the empty set is the (only) basis of the zero space**.

而它列出的 Strang 侧锚 `strang:basis` 说的是「**A space has infinitely many different bases**」。

**这两句直接互相否证**:零空间是一个 space,若「任何 space 都有无穷多基」,则零空间不可能「只有空集一组基」。X 层的不变量声明与它自己引用的 Strang 侧底座节点冲突。

值得注意的是:**X 层这一侧是对的**,它的 Strang 锚点直接取自 3.4:334(`We can never allow the zero vector into a basis...`),即我用来否证 `strang:basis` 的那一段。所以这个不变量本身**站得住**,失效的是它脚下的那块 Strang 砖。按 §2 的 fix 修好 `strang:basis` 后,矛盾即消除,不变量无需改动。

其余 7 个节点(`x:basis`、`x:unique-coordinates-in-a-basis`、`x:all-bases-are-equinumerous`、`x:right-count-upgrades-one-basis-property-to-both` 等)的不变量都只用到 `strang:basis` 的**定义部分**(独立 + 张成),不依赖那句错误的末句。它们的锚点也另有出处(如 `x:basis` 引 3.4:168 的 DEFINITION 与 3.4:276 的语言告诫)。**结论:这 7 个不变量不失效**,但它们指向了一个含错节点,修 `strang:basis` 后引用链才干净。

特别地,`x:all-bases-are-equinumerous`(「Two bases of one space cannot have different sizes」)看似与「无穷多基」相关,实则不冲突——基的**个数**与每组基的**大小**是两回事,该不变量依赖的是 `strang:all-bases-have-the-same-size`,我判 KEEP。**该不变量不受影响。**

### 5.2 `strang:pivot-columns-basis-for-column-space` 的错误波及 3 个 `x:` 节点,**均不失效**

引用者:`x:span-of-a-set`、`x:basis`、`x:dimension-versus-rank`(后者经 `strang:pivot-rows-basis-for-row-space`,该节点判 KEEP)。

这三个不变量用到的都是该节点的**结论**(枢轴列构成列空间的一组基 / 维数 = r),而坏掉的是**独立性的理由**。理由不参与任何跨教材不变量的构成——Apostol 侧没有 pivot 概念,不变量只能建立在「基的存在性与计数」这一层。

例:`x:dimension-versus-rank` 的不变量是「Dimension is the common size of all bases of a space. Rank is an attribute of a matrix...」,它需要的是「rank = dim C(A) = dim C(A^T)」,不需要「枢轴列以单位阵开头」。**不变量成立。**

### 5.3 汇总:哪些不变量声明「可疑」

| `x:` 节点 | 状态 | 说明 |
| --- | --- | --- |
| `x:zero-element-destroys-independence` | **内部矛盾,须复核** | 不变量本身正确,但与其引用的 `strang:basis` 直接冲突;修 S1 后消除 |
| `x:basis` / `x:unique-coordinates-in-a-basis` / `x:vectors-need-not-be-columns` / `x:right-count-upgrades-one-basis-property-to-both` | 不失效,引用链待清理 | 只用 `strang:basis` 的定义部分 |
| `x:span-of-a-set` / `x:dimension-versus-rank` | 不失效 | 只用结论,不用被污染的理由 |
| `x:all-bases-are-equinumerous` | 不受影响 | 依赖的 S1 节点全部 KEEP |

**没有任何跨教材不变量因本次审计而必须撤销。** 需要动的是 S1 侧的两句话,以及 `x:zero-element-destroys-independence` 引用链的一次复核。这个结果与 §1 的总评一致:Strang 侧底座是可靠的,「底座讲错导致所有不变量为假」的担忧在本文件上没有成立。

## §6 不确定项

1. **`strang:solvability-condition` 的 `exactly when`。** Strang 原文(3.3:6)写的是 `solvable **only when** all zero rows of R have zeros in d`,即只声明必要性;节点写成 `solvable **exactly when**`,加强为充要。该加强数学上成立(零行在 d 中亦为零时可回代求解),且第二条锚点覆盖了「b 在列空间」的等价说法,故判 KEEP。**但如果本实验的判据是「量词必须与原文强度一致」而非「量词必须为真」,这条应改判 FIX(死因 1)。** 我按「为真」判,请裁定口径。

2. **`strang:vector-splitting-row-null` 的 `uniquely`。** 见 §3.2。存在性逐字有据,唯一性无逐字锚点,靠正交补的直和结构补上。全文件唯一一处此类加强。同样取决于上述口径。

3. **`strang:ata-invertible-iff-independent-columns` 的第一条锚点**孤立读为假命题(见 §3.3)。我判这是 OCR 标记造成的截取边界问题,非产出者过错。若实验要求「锚点单独成句时必须为真」,该锚点应替换为第 283 行那条完整引文。

4. **未审边。** 按任务书,`edges-S1.jsonl`(101 条)未逐条审计。我只在 `strang:pivot-columns-basis-for-column-space` 一处怀疑对象漂移时抽查过相关边,未发现与 statement 矛盾的方向错误。**101 条边的方向与 evidence 未经本次审计覆盖,这是本报告最大的未覆盖面。**

5. **`strang:full-row-rank` 的括号子句**超出两条锚点射程(§3.2)。事实为真且在同节,我判 KEEP;若要求「每个子句都必须有锚点管辖」,则该节点需补第三条锚点(3.3:217 的四情形表格)。

## §7 SPEC 缺陷实例(不记产出者账上)

任务书要求记录 SPEC 的 30–200 字符 / 不许跨行 / 每节点上限 3 条锚点在 Strang 侧造成的实测困难。

**Strang 侧同样存在「核心公式引不了」的情形,但比 Apostol 侧轻。** 实例:

- **公式在 `$$ ... $$` 独立块中,与陈述句分离。** 3.3 节的四情形表格(第 217 行)、3.5 节的特解向量组、4.2 节的 `p = A x-hat = A(A^T A)^{-1} A^T b`(第 197 行公式 (6))全都是独立公式块。节点若要引用「公式本身」,只能引那一行 LaTeX;要引「说明这个公式的话」,则公式不在射程内。**`strang:full-row-rank` 的括号子句无锚点可依,根源就在这里**——四情形表格是公式块,而叙述句(第 147 行)与它隔着 70 行。
- **短公式引不了。** `$v ^ { \mathrm { T } } w = 0$ for all v in V and all w in W.`(4.1:39)整行含 LaTeX 才勉强够 30 字符;若想引纯粹的 `v^T w = 0`(7 字符)则完全不可能。`P^2 = P`、`R = I`、`r = m = n` 同理。**本文件的应对办法是引包含该公式的整句叙述**,这是可行的规避,但意味着「公式级锚点」在本 SPEC 下不存在。
- **上限 3 条锚点的实测压力。** 62 节点中有 24 个用满 3 条。§3.2 列出的 5 处「无人管辖子句」里,`strang:dimension` 与 `strang:full-row-rank` 都只用了 2 条锚点却仍有子句失管,说明**这两例不是被上限逼的**,而是产出者没有为末句配锚。但 `strang:basis`(用满 3 条)确实面临「定义 + 独立张成 + 反例」已占满三格、无处再放「基的个数」锚点的结构性压力——**这一例可以部分归因于 SPEC 的 3 条上限。**

一个正面记录:OCR 噪声(`diferent`、`nulspace`、`ful row rank`、`Rare`、`bas an extra column`)在本文件的 128 条锚点中被**如实保留、未做修正**,符合 SPEC「不修正 OCR 噪声」的要求。这一点全文件无违例。

## §8 自查:id 是否逐字复制

**是。** 采取的措施与验证结果:

1. **生成方式:** 裁决文件的 `id` 字段**不是手打的**。我用脚本读取 `data/inherited/nodes-S1.jsonl`,以 `json.loads(line)['id']` 取出原 id,按行号索引写入裁决。全程无字符串字面量、无名字匹配。
2. **回头核对:** 写完后重跑比对脚本,把裁决文件的 62 个 id 与输入文件的 62 个 id **按序逐一比较**:

```
input count 62 verdict count 62
EXACT ORDER MATCH: True
mismatches []
```

3. **顺序:** 与输入文件严格一致(第 1 行 `strang:complete-solution` … 第 62 行 `strang:error-in-left-nullspace`)。
4. **两个非 KEEP 裁决的 id** 单独复核过,且 `fix` 字段均为完整替换句(非「应该改」式描述):
   - `strang:basis` → FIX / 死因 1
   - `strang:pivot-columns-basis-for-column-space` → FIX / 死因 6
5. **未修改 `data/` 下任何文件。** 两处 fix 只写在裁决文件的 `fix` 字段里。
6. **未读 `M08实验-Apostol微积分卷1/`,未读 `report/` 下其他审计产出。** `data/nodes-X.jsonl` 仅为 §5 定位引用关系而读,未对其做裁决。
