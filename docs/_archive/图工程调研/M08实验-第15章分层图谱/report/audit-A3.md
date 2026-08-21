# 审计 A3(正确性与归属)—— data/nodes-D4.jsonl

审计对象:`data/nodes-D4.jsonl`,54 个节点(`grep -c .` 实测 54 行,与任务书一致)。
源文本:`source/apostol-ch15/`(逐条回原文核对)。
本审计独立进行,未读 `report/audit-B.md`,未读 `M08实验-Apostol微积分卷1/`。

## 1. 判决计数与死因分布

| 项 | 数 |
| --- | --- |
| KEEP | 44 |
| FIX | 10 |
| KILL | 0 |

死因分布:

| cause | 含义 | 数 |
| --- | --- | --- |
| 0 | KEEP | 44 |
| 1 | 量词过度断言 | 0 |
| 2 | 编造归属(成员/parent 归错) | 1 |
| 3 | 错误教材归属(含锚点支撑不了断言) | 5 |
| 4 | 数学错误 | 4 |
| 5 | 伪抽象·层塌缩 | 0 |

无 KILL:D4 层没有"内容本身错到不可修"或"完全无据"的节点。所有 10 条缺陷都是可定点修改的
(改一个词、换一条锚点、补 `origin: model`、换一个 parent)。

**量词一栏为零,值得单独说明。** 任务书预期"过度断言是本实验最高频的缺陷",但 D4 层实测为 0。
本层的强量词断言我逐条回原文核过,全部成立:

- 节点14 `d:zero-is-the-only-element-orthogonal-to-itself` 声称自正交事实在全章"恰好两处承重"。
  `grep -n "orthogonal to itself" *.md` 实测只有三处命中:15.11(陈述)、15.13:75(定理15.13(c))、
  15.14:50(定理15.15 唯一性)。后两处正是它列的两个承重点。量词精确。
- 节点22、31 各声称有限维假设"唯一使用点"。通读 15.13、15.14 全文,存在性段确实只在
  `Since S is finite-dimensional, it has a finite orthonormal basis` 消耗一次,唯一性段与勾股段未再用。成立。
- 节点52 的 "the only one"、节点16 的 "no finiteness hypothesis"、节点49 的"两条通道",均与原文一致。

推测原因:D4 是最细的证明步骤层,每个节点只承担原文一两句话,量词几乎都能逐字抄下来;
量词膨胀更容易发生在需要跨节点概括的抽象层。这一点对后续分层策略有意义。

## 2. 最危险的 5 条(不改会让学习者学到错东西)

按危险程度排序。

### 危险度 1 — `d:fourier-coefficients-in-cosine-and-sine-form`(cause 4)

statement 说代入三角函数"turns `(f, phi_k)` into the classical integrals `a_k` and `b_k`",
末句又说"It is a change of notation for the projection coefficients"。两句合读的唯一自然结论是
`(f, phi_k) = a_k`。**这是错的。** 由(15.20),`phi_{2k-1}(x) = cos kx / sqrt(pi)`,所以

    (f, phi_{2k-1}) = (1/sqrt(pi)) ∫ f cos kx dx = sqrt(pi) · a_k

两者相差 `sqrt(pi)`。`k = 0` 处更不同:`(f, phi_0) phi_0 = a_0/2`,不是 `a_0`。
真正成立的是整条公式(15.21) 改写为(15.22) 时,`phi_k` 的归一化因子与系数因子相消。
危险在于这是学习者会直接拿去用的计算公式,记错了因子会算错每一个 Fourier 系数;
而 anchor1 说的恰是 `rewrite (15.21) in the form`(整式改写),引文本身没错,是 statement 把它读成了逐系数相等。

### 危险度 2 — `d:coefficient-that-cancels-the-projection-component`(cause 4)

"When y_j != O the **quotient** `(y_j, y_j)` is nonzero" —— 真正的 quotient 是 `a_j`,
`(y_j, y_j)` 只是分母。按字面读成"那个商非零"就得到一条假命题:`a_j` 完全可以为零。
本层节点23 的 Legendre 计算里 `(x_1, y_0) = 0` 使 `a_j = 0`,正是反例。
危险在于这是 Gram-Schmidt 的核心公式所在节点,而误读方向与同层另一节点直接冲突,
学习者若据此以为"系数恒非零",就会看不懂 Legendre 例子里为什么"什么都没减"。

### 危险度 3 — `d:approximation-inequality-with-equality-only-at-the-projection`(cause 3)

statement 把 `||z|| = 0 iff z = O` 称作 "the norm axiom"。**Apostol 第15章没有任何"范数公理"表**:
范数的这些性质是**定理 15.9(a)(b)**,由内积公理推出。同层节点53 对同一事实写的正是
`exactly Theorem 15.9(b)`。两个节点对同一依据给出互相冲突的出处,
学习者拿着 "norm axiom" 回书里找会找不到,并且会误以为范数正性是独立假设而非可证结论——
这恰好抹掉了本章"从内积公理推出度量性质"的主线。

### 危险度 4 — `d:orthogonal-decomposition-existence`(cause 4)

末句 "the choice of basis is the only arbitrary input, **which is why uniqueness has to be proved separately**"
把因果讲反了。教材证唯一性是因为定理本身断言了 "uniquely",与基的任意性无关;
反过来,是唯一性证完之后才推出投影不依赖基的选取(这正是节点44 说的)。
照现文读,学习者会把"分解唯一"与"投影不依赖基"混为一谈,
而这两件事在 15.14 里是**先后**关系、不是同一件事。

### 危险度 5 — `d:s-perp-closure-follows-from-linearity-in-the-first-argument`(cause 3)

结论对,但 anchor2 引的是公理(2) `(x,y+z) = (x,y)+(x,z)`——那是**第二**变元的可加性,
而 name 和 statement 都说"first argument"。在 Apostol 的公理表里,第一变元可加性
不是公理,要经对称公理(1)(复情形 (1'))才能得到。
危险在于它教给学习者一个不存在的公理形态;在复 Euclid 空间里第一/第二变元不对称
(一边线性、一边共轭线性),把两者混同是后续学复内积时的高频错误源。

## 3. 锚点错挂专章:引文为真却支撑不了该断言

这是本层最需要人眼的部分。机器校验 101/101 全过(我用 `grep -F` 等价的逐字包含重跑确认),
长度全部落在 30–200,文件全部存在。**但机器通过不等于锚点正确。**
把每条 anchor 与它所挂的 statement 并排读之后,发现 5 例引文真实、却支撑不了所挂断言。
它们分三种形态,值得分开记录,因为三种要用不同办法才能查出来。

### 形态 A:引文谈的是相邻但不同的对象(第一/第二变元之别)

**`d:s-perp-closure-follows-from-linearity-in-the-first-argument`**
- 断言:内积在**第一**变元可加、齐次。
- 引文:`(2) $(x,y + z) = (x,y) + (x,z)$ (distributivity, or linearity).`
- 引文是原文公理(2) 的逐字子串,但它说的是**第二**变元。差别一个变元位,
  在实数情形被对称性掩盖,在复情形就是线性 vs 共轭线性的分水岭。
- 修法:补 `(1) $(x,y) = (y,x)$ (commutativity, or symmetry).`(15.10.md,49 字符,已验证逐字唯一存在)作第三条锚点,
  并把 statement 改为"第二变元可加齐次 + 对称(复情形共轭对称)故第一变元亦线性"。

**`d:rescaling-preserves-orthogonality`**
- 断言:`(c_i y_i, c_j y_j) = c_i conj(c_j) (y_i, y_j)`,故缩放保正交。
- 引文:`In the homogeneity axiom, the scalar multiplier c can be any complex number.`
- 引文只说了"齐次公理允许复标量",既没给出齐次性本身、更没给出共轭齐次性。
  真正的依据 `(x, c y) = ... = \bar{c}(x,y)` 就在同一份 15.10.md 里却没被引。
- 修法:anchor1 换成 15.10.md 的
  `(x, c y) = \overline {{(c y , x)}} = \bar {c} (\overline {{y , x}}) = \bar {c} (x, y).`(86 字符,已验证逐字存在)。

### 形态 B:引文支撑的是**另一个节点**的断言(共用引文导致的漂移)

我把全层 101 条锚点按 (file, quote) 聚合,找出 11 组被两个以上节点共用的引文。
其中 9 组是正当复用(两个节点从不同角度描述同一处文本,如节点13/14 共用
`z_r is orthogonal to itself, so z_r = O`,一个要那半句、一个要这半句)。**另 2 组是漂移:**

**`d:orthogonality-to-a-set-equals-orthogonality-to-its-span`** 与 `d:s-perp-closure-...` 共用
`It is a simple exercise to verify that $S^{\perp}$ is a subspace of V, whether or not S itself is one.`
- 这句支撑的是"S perp 是子空间"(即节点27 的断言),不是本节点的等式 `S perp = L(S) perp`。
- 该等式在教材里根本没被明写,节点却把这句借来充当第二条依据。

**`d:projection-is-the-s-component-of-the-orthogonal-decomposition`** 与
`d:projection-on-a-subspace-is-defined-through-an-orthonormal-basis` 共用
`is called the projection of $x$ on the subspace $S$ .`
- 这句只给出**命名**,支撑的是节点42(投影的定义),不是本节点的**同一性**断言
  (投影 = 正交分解的 S 分量)。第二条 anchor `That is, if s is the projection of x on S, we have`
  也只说明 15.15/15.16 在谈投影。
- 教材从未明写这条同一性,它靠"定义式与(15.18) 是同一条公式"隐含;节点却按 `origin: source` 收录。
- 修法:补 `origin: model`,anchor2 换成
  `We prove next that the projection of $x$ on $S$ is the solution to the approximation problem stated at the beginning of this section.`(133 字符,已验证逐字唯一存在)。

### 形态 C:引文是该推理的**终点**,而断言描述的是原文没写出的**中间步骤**

**`d:pythagorean-expansion-of-the-squared-norm`**
- 断言:展开 "produces the two square terms **plus two cross terms**"。
- 引文:`\| x \| ^ {2} = (x, x) = (s + s ^ {\perp}, s + s ^ {\perp}) = (s, s) + (s ^ {\perp}, s ^ {\perp}),`
- 这条算式在教材里**已经是消项后的形式**,交叉项从未被写出来。
  唯一提到"剩余项"的那句 `the remaining terms being zero` 被节点41 拿走了。
- 于是本节点在描述一个教材没写的重构步骤,却没标 `origin`。
- 修法:补 `origin: model`,并在 statement 注明 Apostol 把展开压缩成一行、中间形态是重构。

### 方法论小结

这三种形态里,只有形态 B 能靠"统计共用引文"半自动地筛出来——我正是这样找到那 2 例的,
建议把"同一 (file, quote) 被多个节点引用"做成一条**机器警告**(不是错误),交人复核。
形态 A 与形态 C 无法机器化:A 要求核对引文里的变元位置与断言是否同一个,
C 要求判断引文是推理链的哪一环。二者都必须把 anchor 与 statement 并排通读。

另记一条**正面样本**:`d:x-minus-t-splits-orthogonally` 的引文里带 OCR 噪声
(原文 `x - s = $s^{-}$` 应为 `s^{\perp}`),节点按锚点规则未修引文,而在 statement 中写作 `s perp`。
这是本层对"不修正 OCR 噪声"的正确处理方式,与错挂无关,值得保留为范例。

## 4. 我不确定的地方

以下是我判不下来的、SPEC 没规定清楚的、或生产方口径不一致的。都未计入判决的死因,但会影响下一轮。

### 4.1 `origin` 字段在节点上属于未定义 schema,且实际使用不一致

SPEC 的节点 schema(第59–65行)**没有 `origin` 字段**,`origin` 只在**边** schema 里定义。
但锚点规则(第55行)写"找不到可逐字引用的依据 ⇒ 不要收录,或标 `origin: model` 并如实说明",
似乎又允许节点带它。D4 实际有 7 个节点带 `origin: model`
(15、19、20、23、27、28、44),其余 47 个不带。

问题是这 7 个的选取标准与实际情况不匹配:
- 节点19、20、23、27、28、44 的 `atomic_reason` 里自述"故标 origin: model",字段确实也在,自洽;
- 节点15 带 `origin: model` 但 `atomic_reason` 没提;
- **反过来**,节点40、43 同样在描述教材没写的内容(见第3节形态 B、C),却**没有** `origin`。

我按"教材是否明写"这一实质标准判了 40 和 43,但如果 SPEC 的本意是"节点不该有 origin 字段",
那这 7 个都算越出 schema,该由生产方统一。**这条要请裁决:节点是否允许 `origin`?**

### 4.2 `sections` 里列了没有锚点的小节,SPEC 未规定是否允许

5 个节点的 `sections` 含有该节点任何锚点都不指向的小节:

| 节点 | sections | 锚点所在 | 无锚点的小节 |
| --- | --- | --- | --- |
| 15 | 15.10, 15.11 | 15.10 | 15.11 |
| 19 | 15.10, 15.13 | 15.10, 15.11 | 15.13 |
| 20 | 15.10, 15.11, 15.13 | 15.10, 15.11 | 15.13 |
| 22 | 15.08, 15.13 | 15.13 | 15.08 |
| 53 | 15.10, 15.15 | 15.10 | 15.15 |

SPEC 只要求锚点 1–3 条,没说 `sections` 必须逐一有锚点。这些 `sections` 大多是"该事实被用在哪一节"
(如节点53 的 15.15 是使用现场、15.10 是依据现场),语义上讲得通。
节点19 更奇怪:`sections` 有 15.13 无锚点,却有一条 15.11 的锚点而 `sections` 里没有 15.11。
我没有为此判任何 FIX,但 `sections` 的语义(是"定义处"还是"定义处 + 使用处")需要 SPEC 补一句。

### 4.3 节点15 的 `atomic_reason` 与它自己的 statement 互相矛盾

statement 说得很精确:该蕴含 `(x,x)=0 ⇒ x=O` **严格弱于**公理 `(x,x)>0 (x≠O)`
("not equivalent to it: it alone does not give strict positivity")。这是对的。
但同一节点的 `atomic_reason` 写"就是一条公理的**逆否形式**"——逆否是**逻辑等价**的。
公理的逆否是 `(x,x) ≤ 0 ⇒ x = O`,比该蕴含强。
两栏对同一件事给了不相容的刻画。因为 statement(承载知识的那一栏)是对的、且这一区分本身是本层
少见的精确观察,我判了 KEEP;但 `atomic_reason` 里"逆否"一词应改为"弱化形式"。
**这属于我拿不准是否该算缺陷的边界情形**:SPEC 没说 `atomic_reason` 是否也在正确性审计范围内。

### 4.4 同一条引理在多个使用现场重复建节点,SPEC 未规定是否算冗余

"与生成元正交 ⇒ 与张成子空间正交"这一条桥梁,在 D4 层出现了三次:
节点9(Gram-Schmidt 现场)、节点35(定理15.15 现场,statement 自述"the same span-extension bridge
used inside the Gram-Schmidt proof")、节点28(集合/张成等式)。
自正交事实类似:节点14(陈述)+ 节点13、39(两个使用现场)。

这在**证明步骤层**是合理的——每个使用现场都是一个可独立检查的步骤,而且节点35、13、39 都诚实地
交叉引用了被复用的节点、没有冒领。但它也意味着 D4 里存在同一数学内容的多份表达,
`is-a`/`part-of` 之外需要一种"此处复用了那个节点"的关系,现有 9+1 词表里最近的是 `requires`,
语义并不贴切(不是"要理解 A 必须先有 B",而是"A 这一步就是 B 的一次调用")。
我未据此判任何缺陷,但这是词表的一个真实缺口。

### 4.5 节点22 的"构造与维数无关"半句在本节点内无引文

`d:finite-dimensionality-supplies-a-finite-basis-to-orthogonalize` 的
"The construction itself is dimension-free" 一句,依据在节点16 的锚点里
(`in any Euclidean space, finite or infinite dimensional`),本节点自己没带。
我判 KEEP(依据在同层真实存在,且未错挂到别处),但这属于"锚点偏薄"。
另外,该节点在 Apostol 的框架内是否成立还有一层微妙:15.08 只为**有限维**空间定义 basis,
所以"无穷维时构造仍给出基"在本书语境里严格说不成立——节点没有这样声称
(它只说构造本身与维数无关,这是对的),但读者容易顺势多想一步。

## 5. 交付前自检

| 检查项 | 结果 |
| --- | --- |
| D4 非空行数(`grep -c .` 实测) | 54 |
| 判决行数 | 54,与 D4 相等 |
| 判决 id 不在 nodes-D4.jsonl 中者 | 0 |
| nodes-D4.jsonl 中无判决的 id | 0 |
| 重复 id | 0 |
| 判决顺序与 D4 行序一致 | 是 |
| 每行字段 = {id, verdict, cause, reason, suggested_fix} | 全部通过 |
| KEEP ⇔ cause 0 且 suggested_fix 为空串 | 全部通过 |
| FIX ⇔ cause ≠ 0 且 suggested_fix 非空 | 全部通过 |
| 所有 id 逐字取自 nodes-D4.jsonl(程序读取写入,未按名字匹配) | 是 |

id 一律由程序从 `nodes-D4.jsonl` 逐字读出后回填,不经名字匹配,避免上一轮 9 例误杀的复现。

锚点机器校验(我自行重跑一遍作为基线,非替代人工):101 条锚点全部逐字命中、
长度全部在 30–200、文件全部存在。**第 3 节列出的 5 例错挂全部在这 101 条"通过"之内。**

未截断:54 个节点全部逐条审完,无因篇幅丢弃者。
