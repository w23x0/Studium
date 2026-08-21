# 审计 B2:抽象增量 / 删除测试

审计对象:`data/nodes-D1.jsonl`(81)、`data/nodes-X.jsonl`(22)、`data/nodes-A2-x2.jsonl`(34),共 137 个节点。
逐节点判决:`report/audit-B2-verdicts.jsonl`(137 行)。

本审计只用一把尺子:**把这个节点删掉,学习者只凭它的 parent 与已有兄弟节点能不能自己推出来。** 能则无增量(判 KILL,死因 5),不能则判 KEEP。数学对错不在本审计职权内,凡涉及量词、成员归属、出处、算错的问题一律未记入本报告。唯一的例外处理是:无增量但有子节点挂靠的枢纽节点判 FIX 而非 KILL。

为避免被他人结论带走,全程未读 `report/audit-A*.md`、`report/audit-B.md` 及其 verdicts、`report/L2-*-提案说明.md`、`report/横向-跨教材差异.md`、`data/graveyard/`,亦未读同级目录 `M08实验-Apostol微积分卷1/`。所据材料为 SPEC.md、三个审计对象文件、`data/inherited/nodes-A1.jsonl`、`data/inherited/nodes-S1.jsonl`,以及 `source/apostol-ch15/`(16 个文件全读)与 `source/strang-ch3`、`source/strang-ch4` 的定点核查。

## 1. 存活率

| 文件 | 节点数 | KEEP | FIX | KILL | 存活率(KEEP+FIX) | 纯 KEEP 率 |
|---|---|---|---|---|---|---|
| nodes-D1.jsonl | 81 | 55 | 1 | 25 | **69.1%** | 67.9% |
| nodes-X.jsonl | 22 | 19 | 2 | 1 | **95.5%** | 86.4% |
| nodes-A2-x2.jsonl | 34 | 31 | 0 | 3 | **91.2%** | 91.2% |
| 合计 | 137 | 105 | 3 | 29 | **78.8%** | 76.6% |

三个文件的差距本身是本次审计最主要的结论。D1 层每三个节点就有一个是复述,而 X 层与反例层的增量密度接近饱和。原因不在写作质量而在层的性质:D1 向下切分时,parent 的 statement 往往已经把要切出来的东西写在句子里了(尤其 `apostol:function-space` 一句里同时给出两个运算公式与零元),而 X 层的 divergence 与反例层的"卡住哪个错命题"天然要求一条 parent 不可能包含的信息。

## 2. KILL 分类

29 个 KILL 分四类。

### 2.1 复述 parent 的(13 个)

节点的 statement 与 parent(或祖父)statement 的某一句是同一句话的改写。

| 被杀节点 | 复述了谁的哪一句 |
|---|---|
| `d:nature-of-the-elements-is-left-unspecified` | `apostol:linear-space`「The nature of the elements and of the operations is not specified」 |
| `d:axioms-replace-a-construction-with-required-properties` | `apostol:linear-space`「only the axioms are required」 |
| `d:ten-axioms-listed-in-three-groups` | `apostol:linear-space`「ten axioms listed in three groups」 |
| `d:only-axiom-1-states-that-the-result-is-unique` | `apostol:closure-axioms`「a unique sum x + y in V」 |
| `d:axioms-2-7-8-9-are-the-scalar-dependent-axioms` | `apostol:complex-linear-space`「Axioms 2, 7, 8 and 9」 |
| `d:real-in-real-linear-space-refers-to-the-scalars` | `apostol:real-linear-space`「Its scalars are the real numbers」 |
| `d:example-1-verification-is-the-field-axioms-of-r` | `d:example-1-the-real-numbers-form-a-linear-space`「the degenerate case against which the other examples should be read」 |
| `d:operations-of-example-2-complex-addition-and-real-scaling` | 同名 parent「allowing only real numbers as multipliers」 |
| `d:example-2-shows-the-scalars-decide-real-or-complex` | `d:example-2-the-complex-numbers-with-real-scalars` 第二句(两个域的分离) |
| `d:function-space-addition-is-pointwise` | `apostol:function-space`「(f + g)(x) = f(x) + g(x)」 |
| `d:function-space-scalar-multiple-is-pointwise` | `apostol:function-space`「af the function whose value at x is af(x)」 |
| `d:function-space-zero-is-the-everywhere-zero-function` | `apostol:function-space`「with the everywhere-zero function as zero element」 |
| `d:notation-c-a-b-for-continuous-functions-on-a-b` | `apostol:space-of-continuous-functions`「this space is denoted by C(a, b)」 |

`apostol:function-space` 一个 L1 节点独自杀掉三个子节点。它的 statement 把两个运算公式与零元一并写出,于是任何"把它拆成三条"的向下切分都必然是复述。这是本层最集中的一处结构性问题。

### 2.2 兄弟冗余的(11 个)

同一判断在兄弟节点里已经给出,两者只留一个。

| 被杀 | 保留 | 为何保留另一个 |
|---|---|---|
| `d:axiom-5-states-the-zero-only-as-a-right-neutral-element` | `d:axiom-3-commutative-law-for-addition` | 左右中立的等价性由交换律节点承担,不必在公理5 处重述 |
| `d:thm-15-3-quantifiers-arbitrary-elements-and-arbitrary-scalars` | `d:proof-a-*` 两节点 | 量词范围在证明节点里被实际使用,单独陈述量词无判别力 |
| `d:proof-b-mirrors-proof-a-with-axiom-8` | `d:proof-a-set-z-equal-to-0x-and-double-it` | "翻倍"手法在 (a) 处首次给出,(b) 只是换一条公理重放 |
| `d:an-example-is-a-set-plus-two-explicit-operations` | `d:linear-space-is-a-set-together-with-two-operations` | 后者拥有同一 15.03 锚点且更靠上 |
| `d:operations-of-example-1-are-ordinary-arithmetic` | `d:example-1-the-real-numbers-form-a-linear-space` | parent 名称与正文已含"ordinary addition and ordinary multiplication" |
| `d:operations-of-example-3-are-componentwise` | `d:example-3-v-n-with-componentwise-operations` | 祖父 `apostol:v-n-space` 已写"in terms of components" |
| `d:example-3-verification-reduces-to-arithmetic-in-each-component` | `d:example-3-v-n-with-componentwise-operations` | 结论句与 parent 的"poor test of whether a given axiom is really needed"同句 |
| `d:operations-of-example-4-are-inherited-from-v-n` | `d:example-4-vectors-orthogonal-to-a-fixed-nonzero-vector` | "被筛选的子集"已蕴含运算继承与"考集合不考运算" |
| `d:for-function-spaces-closure-is-the-only-real-content` | `d:function-space-axioms-reduce-pointwise-to-facts-about-real-numbers` | 后者是归约机制,前者是它末句的直接推论 |
| `d:knowledge-of-one-example-guides-work-in-the-others` | `d:one-proof-from-the-axioms-serves-every-example` | 同一段落的软化版,且无任何判定用途 |
| `x:least-squares-is-a-projection` | `x:best-approximation-by-the-projection` | 后者另有"定理 vs 定义"位置互换与唯一性条款存否 |

另有两个 A2-x2 反例属兄弟冗余:`apostol:cx-single-point-evaluation-is-degenerate`(是 `apostol:cx-sampling-inner-product-on-p-n` 取单节点的特例,节点自己写明这一点)与 `apostol:cx-absolute-value-and-product-of-integrals-on-polynomials`(两半分别是 `apostol:cx-absolute-value-of-the-dot-product-breaks-homogeneity` 与 `apostol:cx-product-of-coordinate-sums-is-degenerate` 换积分号重写)。它们计入 2.1/2.2 之外的第 2.4 类以免重复计数,此处仅作交叉说明。

### 2.3 纯语法/逻辑切分的(3 个)

不是复述某一句,而是从已有节点一步机械推出,不带任何新的判断。

- `d:degree-exactly-n-is-not-a-subspace-of-degree-at-most-n` — 由 parent(不是线性空间)加 `apostol:subspace` 定义一步即得;所谓寓意就是子空间定义本身。
- `d:linear-space-concept-permeates-algebra-geometry-analysis` — 把十二个例子摆在一起就直接看见,不提供判断力。
- `apostol:cx-law-of-cosines-needs-nonzero-elements` — 见 2.4。

### 2.4 无信息量反例的(3 个)

- `apostol:cx-law-of-cosines-needs-nonzero-elements` — **所指的命题并不真的失效**。x=O 时左端 ||x-y||²=||y||²,右端 ||x||²+||y||²−2||x||||y||cosθ 因 ||x||=0 而末项恒为零,两边仍相等,节点自己也承认「the identity itself then survives」。真正无定义的只有角度,而那是 `apostol:angle-between-two-elements` 的定义式分母非零条件本身。
- `apostol:cx-single-point-evaluation-is-degenerate` — 卡住的命题已被 `apostol:cx-sampling-inner-product-on-p-n` 卡住,机制与见证构造法完全相同,取单节点即得 t−1。
- `apostol:cx-absolute-value-and-product-of-integrals-on-polynomials` — 两个失败机制(绝对值毁线性、线性形式之积退化)已分别由 V_n 上的两个反例给出,此处只是把和号换成积分号。

反例层只死三个,且没有一个属于"反驳了没人会相信的命题"这一最坏情形——两个是重复,一个是命题其实不失效。这一层的设计质量明显高于 D1 层。

## 3. FIX(3 个,无增量但不宜直接删)

- `d:degree-exactly-n-is-not-a-linear-space` — 结论、理由、反例类型三样都在 `apostol:polynomials-of-degree-exactly-n` 正文里,"等式约束 vs 不等式约束"的框架又已在兄弟 `d:example-7-polynomials-of-degree-at-most-n` 末句。但它是四个子节点(公理1、公理2、无零元、非子空间)的挂载枢纽。修法:把"对定义性不变量施加等式约束⇒封闭性一般失效,施加不等式约束⇒一般成立"提升为 statement 主句(15.9 习题19/20 正是这一对),删去"本节唯一反面例子"这类记账语。
- `x:dimension-versus-rank` — statement 首句与 `x:all-bases-are-equinumerous` 重复,第三句是 `strang:dimension` 自带的告示。真增量是一条**负向对齐**:rank 在 Apostol 第15章一次都不出现(已用 `grep -w rank` 核实为 0 次),故 Rank Theorem、Counting Theorem、Fundamental Theorem part 1 不是共享不变量而是 Strang 单方面增加物。修法:改标为单边缺口节点,主张改为"本对齐点没有共享不变量,不得在 Apostol 侧寻找对应物"。
- `x:independence-criterion-and-its-consequences` — 首句与 `x:unique-coordinates-in-a-basis` 是同一双条件;等价链按 divergence 自己的话是"关于表示矩阵而非子空间的陈述,所以 Apostol 无法陈述",即非共享不变量。真增量埋在 divergence 末句:独立性失效时投影 p 仍唯一而系数 x-hat 不唯一,而 Apostol 从不把 S 的元素与它的系数元组分开。修法:把该末句提升为节点主张。

## 4. 空洞区:看着像向下延伸、实际在原地打转

四处集群,都在 D1 层,都源自 15.03 的两个段落。

**(a)「不指定、只公理化、故一证通吃」四联复述。** `apostol:linear-space` 名下 `d:nature-of-the-elements-is-left-unspecified`、`d:axioms-replace-a-construction-with-required-properties`、`d:an-example-is-a-set-plus-two-explicit-operations`、`d:one-proof-from-the-axioms-serves-every-example`,加上 `d:linear-space-is-a-set-together-with-two-operations`,五个节点讲同一件事。只有 `d:one-proof-from-the-axioms-serves-every-example`(可用来判定"这个证明用了 V_n 特有的性质,故不证明任何一般结论")与 `d:linear-space-is-a-set-together-with-two-operations`(同一集合配不同运算是不同空间)带判定力,其余三个已杀。

**(b)「封闭性是唯一有内容的一条」三联。** `d:examples-are-asserted-to-satisfy-the-axioms-and-left-to-the-reader`(章级)、`d:function-space-axioms-reduce-pointwise-to-facts-about-real-numbers`(机制)、`d:for-function-spaces-closure-is-the-only-real-content`(结论)。第三个夹在前两个中间,已杀。前两个层级不同,保留。

**(c)「运算定义原子」模式。** 每个例子下挂一个 `d:operations-of-example-N-…`,而例子 parent 的名称或正文往往已经写出运算。五个中杀掉四个(例1、例2、例3、例4),只有函数空间那一支因为 `d:function-space-addition-lives-on-the-intersection-of-domains` 带出了"定义域收缩会破坏公理1,故例5/8/10/12 都预先固定区间"这条真判据而保留。**这是全层最系统性的伪切分模式,建议今后禁止"把 parent 已写出的运算再单立一个节点"这种切法。**

**(d)「熟悉例子的验证是平凡的」双联。** `d:example-1-verification-is-the-field-axioms-of-r` 与 `d:example-3-verification-reduces-to-arithmetic-in-each-component` 都是逐条把公理映射到算术律,再补一句"所以此例检验不了公理独立性",而后一句在两个 parent 里都已有等价表述。两个都已杀。

X 层与反例层未发现此类空转集群。X 层唯一的重复是 `x:orthogonality-is-a-vanishing-pairing` 的 divergence 后半段与 `x:the-pairing-that-carries-geometry` 末句都在说"Strang 到不了函数",已在 suggested_fix 中标出为可削减而非致死。

## 5. 覆盖空洞

### 5.1 D1 层只覆盖 15.01–15.04

81 个 D1 节点的 section 分布:15.01 有 4、15.02 有 21、15.03 有 42、15.04 有 18。**15.06、15.07、15.08、15.10、15.11、15.13、15.14、15.15 无任何 D1 节点**,四个习题节(15.05、15.09、15.12、15.16)亦无 D1 节点。也就是说子空间、张成、独立性、基、维数、内积、范数、正交、Gram-Schmidt、正交补、投影、逼近定理这十二个主题全部没有向下延伸,D1 只做完了"什么是线性空间"这一段。

按文件计,全章 16 个 source 文件中有 12 个未被 D1 触及。

### 5.2 48 个 L1 Apostol 节点无 D1 子节点

63 个继承 L1 节点里只有 15 个有 D1 子节点,48 个没有。缺口从 `apostol:subspace` 开始一直到 `apostol:parsevals-formula`,完整清单(48 个)见下:

`apostol:scalar`、`apostol:negative-and-difference-notation`、`apostol:theorem-uniqueness-of-zero-element`、`apostol:theorem-uniqueness-of-negatives`、`apostol:subspace`、`apostol:theorem-15-4-subspace-criterion`、`apostol:finite-linear-combination`、`apostol:linear-span`、`apostol:linear-span-notation-l-of-s`、`apostol:spanning-set`、`apostol:dependent-set`、`apostol:independent-set`、`apostol:dependence-inherited-by-supersets`、`apostol:zero-element-forces-dependence`、`apostol:independence-of-exponential-functions`、`apostol:theorem-15-5`、`apostol:finite-basis`、`apostol:finite-dimensional-space`、`apostol:infinite-dimensional-space`、`apostol:theorem-15-6`、`apostol:dimension`、`apostol:dim-notation`、`apostol:theorem-15-7`、`apostol:ordered-basis`、`apostol:components-relative-to-ordered-basis`、`apostol:uniqueness-of-components`、`apostol:inner-product`、`apostol:inner-product-axioms`、`apostol:inner-product-notation`、`apostol:dot-product-in-vn`、`apostol:complex-inner-product`、`apostol:euclidean-space`、`apostol:real-euclidean-space`、`apostol:complex-euclidean-space`、`apostol:integral-inner-product-on-continuous-functions`、`apostol:weighted-integral-inner-product`、`apostol:cauchy-schwarz-inequality`、`apostol:norm`、`apostol:norm-notation`、`apostol:theorem-15-9-properties-of-norms`、`apostol:triangle-inequality`、`apostol:angle-between-two-elements`、`apostol:orthogonal-elements`、`apostol:orthogonal-set`、`apostol:orthonormal-set`、`apostol:theorem-15-10-orthogonal-sets-are-independent`、`apostol:theorem-15-11-components-relative-to-an-orthogonal-basis`、`apostol:parsevals-formula`

需要说明的是,这 48 个中有一部分被 X 层节点的 `apostol_ids` 与 A2-x2 反例引用(例如 `apostol:inner-product-axioms` 被 `x:the-pairing-that-carries-geometry` 引用、`apostol:angle-between-two-elements` 被本审计用于判决),即它们并非全然孤立,但**沿 D 方向的向下细化确实为零**。

### 5.3 L1 底座本身的缺口(影响判决)

`data/inherited/nodes-A1.jsonl` 没有 15.03 例1、2、4、5、6、9、10、11 的节点(只有 V_n、函数空间、两类多项式、连续函数、微分方程解空间等若干)。后果是 D1 层里 `d:example-1-…`、`d:example-2-…`、`d:example-4-…`、`d:example-5-…`、`d:example-6-…`、`d:example-9-…`、`d:example-10-…`、`d:example-11-…` 这些节点承载了对象本身,删掉即整例消失。这直接影响了多处判决——它们的增量有相当部分来自"这个例子在图里没有别的落点",而不是来自 statement 的洞察力。若今后补齐 L1 例子节点,这批节点需重审。

### 5.4 15.05 与 15.09 习题节零覆盖

A2-x2 的 34 个反例节点全部落在 15.12(25 个)与 15.16(9 个)。**15.05 与 15.09 两个习题节没有任何反例节点**,而这两节恰好含有本章最经典的"哪条公理失效"练习:15.5 #29(R⁺ 以乘法当加法)、#30(公理10 可否由其余推出)、#31(R² 上四种运算变体)、#32(证明定理15.3 的 (d)–(h)),以及 15.9 #11–20(哪些函数集是子空间)、#19/#20(次数≤k vs =k)。D1 层的多个节点(如 `d:degree-exactly-n-*` 四联)实际服务于这些习题,却没有对应的反例节点与之配对。

## 6. 我不确定的地方

诚实列出,不留空。

1. **枢纽豁免的边界。** SPEC 与任务书都说无增量的挂载枢纽判 FIX,但没说"子节点若同时被判死,枢纽是否还算枢纽"。`d:degree-exactly-n-is-not-a-linear-space` 的四个子节点里我杀了一个(非子空间)、留了三个,所以它仍是枢纽,判 FIX 无争议。但若审计 A 因数学原因再杀掉两个,这个 FIX 是否应改为 KILL,我给不出规则。

2. **`d:degree-exactly-n-has-no-zero-element` 是本次最难的一票。** 它与兄弟 `d:degree-exactly-n-fails-axiom-2-at-the-scalar-zero` 共用同一事实(零多项式不在集内),按"parent + 已有兄弟能否推出"的严格读法只隔一步推理,应判死。我最终判 KEEP,理由是它断言的其实是"Apostol 给出的理由不完整"(书上只归因于封闭性,实际公理5、6 也失效),这是对教材论证的修正而非复述。这一票换个审计者很可能相反,已在 suggested_fix 里注明"若上层要压缩节点数,这两个可合并为一个失效公理清单节点"。

3. **X 层的 divergence 我只能验证事实、无法验证完备性。** 我抽查核实了四条承重断言(Strang 3.4 末段的空集基与"because then linear independence is lost"、4.1 的两墙反例与"Two planes cannot be orthogonal subspaces"、Apostol 第15章 `rank` 出现 0 次、Strang 4.2 节首把投影定义为 the closest vector 且节内无唯一性条款),全部成立。但"这条 divergence 是否遗漏了更重要的差异"不是删除测试能回答的问题,超出本审计的尺子。X 层 95.5% 的高存活率有可能部分来自我无法检出的这类遗漏。

4. **SPEC 缺口:X 层节点没有 parent。** 删除测试的原始形式建立在 parent 之上,而 `x:` 节点只有 `apostol_ids` / `strang_ids` 两侧成员。我按任务书给的 X 专用问法执行(删掉后只看两侧成员能否看出这是同一件事),并把"两侧成员各自的 statement"当作 parent 位。这是我自己的操作化,SPEC 未规定,若上层另有约定则本层 22 个判决需重跑。

5. **SPEC 缺口:A2-x2 反例节点也没有 parent,且 `sections` 只指向习题文件。** 我把"该反例所服务的正文概念节点"当作事实上的 parent(例如把 `apostol:angle-between-two-elements` 当作法余弦那个反例的 parent)。这一步是推断出来的,不是文件里写的。

6. **`d:example-7-polynomials-of-degree-at-most-n` 与 `d:degree-exactly-n-is-not-a-linear-space` 的"不等式 vs 等式"框架究竟该归谁。** 我把它算作前者的增量、后者的重复,因为前者的 statement 里有"precisely because the bound is an inequality and can be met with room to spare"这句原话。但从教学次序看,这条判据在反面例子处才真正被使用。若上层认为该判据应归属后者,则两节点的判决互换。

7. **未读文件带来的盲区。** 按任务书要求未读其他代理的输出,因此若 `d:` 层某节点已被审计 A 以数学原因杀掉,我仍对它做了增量判决(浪费但无害);反之若某节点的 KILL 理由与审计 A 的理由重合,合并时会出现同一节点两条不同死因(4 与 5),需要上层决定取哪一个。我无法自行去重。

## 7. 交付前自检

| 检查项 | 结果 |
|---|---|
| 判决行数 == 三文件非空行数之和 | **通过**。`grep -c '[^[:space:]]'` 给出 81 / 22 / 34,合计 137;判决文件 137 行。与任务书所述 81/22/34 完全一致,无需以自己的计数覆盖。 |
| 无越界 id | **通过(经一次修正)**。首轮自检发现 **9 个 id 是凭 dump 印象手打而非逐字照抄**,全部集中在 D1 的例7b–例12 一段:`d:example-7b-polynomials-of-degree-exactly-n-is-not-a-linear-space`、`d:example-8-continuous-functions-and-the-space-c-a-b`、`d:notation-c-a-b`、`d:example-9-functions-differentiable-at-a-point`、`d:example-10-integrable-functions-on-an-interval`、`d:example-11-functions-vanishing-at-one`、`d:example-11-with-a-nonzero-prescribed-value-breaks-closure`、`d:example-12-solutions-of-a-homogeneous-linear-differential-equation`、`d:nonhomogeneous-solutions-break-closure`。已按源文件逐字改正,复查越界 0、未判 0。**这正是任务书警告的名字匹配失误模式,记录在此以备后续代理引以为戒。** |
| 无重复 id | **通过**。0 个重复。 |
| 每个 KILL 都点名复述对象 | **通过**。29 个 KILL 的 reason 全部含至少一个存在于 D1/X/A2-x2/A1/S1 的节点 id。另做了一轮反向校验:reason 与 suggested_fix 里出现的所有 `d:`/`x:`/`apostol:`/`strang:` 形式的 token 都必须是真实存在的节点 id,首轮查出 3 处简写(`d:thm-15-3a`、`d:thm-15-3c`、`d:proof-c-first-half`)与 1 处只点了小节号未点节点 id 的 KILL,均已改为逐字 id。 |
| cause 取值合规 | **通过**。KEEP 全部 cause=0(105 个),KILL/FIX 全部 cause=5(32 个),未使用死因 1–4(不在本审计职权内)。 |
| FIX 都写了修法 | **通过**。3 个 FIX 的 suggested_fix 均非空。 |
| JSONL 合法 | **通过**。137 行全部 `json.loads` 成功。 |
