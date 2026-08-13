# 审计 B3 —— `data/inherited/nodes-A1.jsonl` 信息增益审计

**审计对象**:Apostol 第15章 L1 底座,63 个节点(15.01–15.11)。
**审计维度**:仅信息增益(删除测试)。数学正确性与锚点真实性由本轮另一名审计 A 独立负责,本报告不涉及。
**删除测试判据**:把该节点删掉,学习者能否从它的邻居(同节兄弟、它所属的更粗概念、引用它的定理)重新推导出它的陈述内容?能 ⇒ 无增益。
**裁决文件**:`report/audit-B3-A1-verdicts.jsonl`(63 行,顺序与输入一致)。

---

## §1 数字总览

| 裁决 | 数量 | 占比 |
| --- | --- | --- |
| KEEP | 51 | 81.0% |
| FIX | 6 | 9.5% |
| KILL | 6 | 9.5% |
| 合计 | 63 | 100% |

**存活率(KEEP+FIX)= 57/63 = 90.5%**;**净存活率(仅 KEEP)= 81.0%**。

按节分布(裁决 × 首节):

| 节 | KEEP | FIX | KILL | 小计 |
| --- | --- | --- | --- | --- |
| 15.01 | 1 | | | 1 |
| 15.02 | 5 | 3 | | 8 |
| 15.03 | 5 | 1 | | 6 |
| 15.04 | 4 | | | 4 |
| 15.06 | 4 | 1 | 1 | 6 |
| 15.07 | 6 | | | 6 |
| 15.08 | 9 | | 1 | 10 |
| 15.10 | 11 | 1 | 4 | 16 |
| 15.11 | 6 | | | 6 |

按 `node_type`:5 个 `notation` 节点中 **4 个判 KILL**(见 §2 第一类),这是 A1 唯一一处集中的死亡带。41 个 `concept`、17 个 `theorem` 中无一因增益不足被杀。

**存活率高于前一轮派生层,这符合预期而非放水**:A1 是照教材逐节抽的底座,每个节点都对应书里一处显式的定义、定理或例子,天然难以互相复述。真正的问题不在「有没有增益」,而在 §4 说的**增益边界划错**(把一件事切成两个节点、或把三件事塞进一个节点)。

---

## §2 KILL 分类

6 个 KILL 全部归 `cause=5`(伪抽象·层塌缩),分两类。

### 第一类:纯记号复述(4 个)

| id | 被谁重建 |
| --- | --- |
| `apostol:linear-span-notation-l-of-s` | `apostol:linear-span` + `apostol:theorem-15-5` |
| `apostol:dim-notation` | `apostol:dimension` + `apostol:theorem-15-7` |
| `apostol:inner-product-notation` | `apostol:inner-product` + `apostol:dot-product-in-vn` |
| `apostol:norm-notation` | `apostol:norm` + `apostol:cauchy-schwarz-inequality` |

共同结构:**记号节点的陈述 = 「符号 X 记对象 Y」,而 Y 由某个概念节点定义完毕,X 这个写法又已逐字出现在某个定理节点的陈述里**。两头都有载体,中间这一层是空的。

四者全部**无 D 层子节点**,全图引用数分别为 4/2/3/1(含自身),即它们几乎不承重。

**详细实例 —— `apostol:norm-notation`(最干净的一例)**:

其陈述为:「双竖线符号 ‖x‖ 表示元素 x 的范数,由 ‖x‖=(x,x)^{1/2} 定义。像 |(x,y)| ≤ ‖x‖‖y‖ 这样的不等式用此记号陈述。」

- 第一句的定义式与 `apostol:norm` 的陈述**是同一个 DEFINITION**,两个节点的第一条锚点甚至引的是原书同一句话(`15.10.md`,"DEFINITION. In a Euclidean space V, the nonnegative number $\|x\|$ defined by the equation")。
- 第二句提到的不等式,已**逐字**写在 `apostol:cauchy-schwarz-inequality` 的陈述里(「Expressed in terms of norms it reads |(x, y)| <= ||x|| ||y||」)。
- 删掉它,读者从 `apostol:norm` 得到符号与定义式、从 `apostol:cauchy-schwarz-inequality` 得到用法,信息一分不少。
- 全图仅 1 条边引用它,无 D 子节点,拆除代价近零。

**唯一存活的记号节点 `apostol:negative-and-difference-notation` 判 KEEP**,理由正好相反:它不只是给 (-1)x 换个写法 -x,而是**定义了一个新运算** y-x := y+(-x)。差这个运算在 A1 中无第二个载体,而 `apostol:theorem-elementary-algebraic-properties` 里的 -(x+y)=-x-y 反过来依赖它。这条对照说明:记号节点并非天然该死,**有没有引入新对象**才是分界。

### 第二类:实/复情形的纯切分(2 个)

| id | 被谁重建 |
| --- | --- |
| `apostol:real-euclidean-space` | `apostol:euclidean-space` + `apostol:real-linear-space` |
| `apostol:complex-euclidean-space` | `apostol:euclidean-space` + `apostol:complex-linear-space` |

`apostol:euclidean-space` 的陈述里**已经写明**「不加进一步限定时,空间可实可复,本章定理两种情形都成立」。既然母节点自己已经把实/复两侧都摊开说了,再各切一个节点出来,是把母节点的一句话拆成两个 id,不是新增判断力。两者**均无 D 层子节点**,全图引用数 1 和 3。

`apostol:complex-euclidean-space` 唯一独有物是别名「unitary space」——这应当作为 `aliases` 挂到 `apostol:euclidean-space`,而不是撑起一个节点。

对照:`apostol:real-linear-space` / `apostol:complex-linear-space` 这对同构的兄弟,我**没有**照样杀掉。区别在于 `apostol:complex-linear-space` 携带了两条实质内容——**具体改哪几条公理**(2、7、8、9)、以及**实空间定理可整体迁移到复空间**这一声明——所以判 KEEP;而 `apostol:real-linear-space` 判 FIX(不是 KILL),因为它虽陈述近空,却是 4 条边与 2 个 D 子节点的挂载点(详见 §4)。

### 没有出现的两类死因

前一轮总结的四类死因中,**「无信息量反例」在 A1 中一例未见**。A1 的两个反例都是真反例:`apostol:polynomials-of-degree-exactly-n`(两个 n 次多项式之和可能不是 n 次,封闭性真失效)、`apostol:homogeneous-de-solution-space` 里的非齐次情形(真不封闭)。**「复述父节点」也未构成独立死因**——A1 无 `parent` 字段,是平铺的底座层。

---

## §3 「打转的簇」

未发现互相复述成环的簇。A1 的冗余全部是**成对的**(A ↔ B 两两之间),没有出现 A→B→C→A 的环。三个成对冗余:

1. `apostol:norm` ↔ `apostol:norm-notation` —— 同一条 DEFINITION 被抽了两遍。已杀后者。
2. `apostol:inner-product` ↔ `apostol:inner-product-axioms` —— 四条公理的「点名版」与「公式版」。见 §4。
3. `apostol:scalar` ↔ `apostol:real-linear-space` ↔ `apostol:complex-linear-space` —— 三者都在说「哪种数当标量」。这是最接近成环的一处:`apostol:scalar` 第二句(实空间用实数、复空间用复数)= 后两者之和;`apostol:real-linear-space` 全句 ≈ `apostol:scalar` 第二句前半 + 一个命名约定。**但不构成真环**,因为 `apostol:complex-linear-space` 有独立内容(改哪几条公理、定理如何迁移),打断了循环。处理办法是把区分权收归一处:`apostol:scalar` 只留「作乘子的数称为标量」这一命名行为,实/复的区分交给后两者。

**一个更值得注意的结构**:上述第 3 组(15.02,标量层)与 §2 第二类(15.10,欧氏空间层)是**同一个切分模式在两个层级上重复出现**——「基对象 + 实版 + 复版」的三节点铺法。在 15.02 那层,三个节点里有两个有实质内容,勉强站得住;到 15.10 那层退化成纯切分,两个都该杀。同一个坏模式被复制了一次,说明它出自抽取时的机械习惯,而不是各节的内容需要。

---

## §4 底座质量评估

### 增益密度

以「独立承载了至少一件邻居给不出的事」为标准,63 个节点中 51 个(81%)达标。这个密度对底座层是健康的。

D 层挂载分布(读 `nodes-D1/D2/D3/D4.jsonl` 的 `parent` 字段,共 287 条):

- 挂在 A1 的 63 个 id 上的 D 节点:**187 个**
- 有 D 子节点的 A1 节点:**51 个**;**零 D 子节点的:12 个**
- 挂载最重的五个:`apostol:linear-space` (14)、`apostol:function-space` (11)、`apostol:theorem-elementary-algebraic-properties` (10)、`apostol:dependent-set` (7)、`apostol:theorem-15-6` / `apostol:independent-set` / `apostol:dimension` / `apostol:cauchy-schwarz-inequality` / `apostol:theorem-15-10-orthogonal-sets-are-independent` (各 6)

**这里与任务书给的数字不符,如实报告**:任务书称「63 个 A1 节点里有 48 个没有任何 D 层子节点」。按 `parent` 字段实测是 **12 个无 D 子节点、51 个有**。12 个无子节点的是:`apostol:scalar`、`apostol:negative-and-difference-notation`、`apostol:theorem-uniqueness-of-zero-element`、`apostol:theorem-uniqueness-of-negatives`、`apostol:linear-span-notation-l-of-s`、`apostol:dependence-inherited-by-supersets`、`apostol:zero-element-forces-dependence`、`apostol:dim-notation`、`apostol:inner-product-notation`、`apostol:real-euclidean-space`、`apostol:complex-euclidean-space`、`apostol:norm-notation`。**这 12 个里有 4 个正是我判 KILL 的记号节点、2 个是判 KILL 的欧氏空间切分**——零挂载与零增益在这 6 例上重合了。我未因零挂载判死任何节点(`apostol:theorem-uniqueness-of-zero-element` 等 6 个零挂载节点判 KEEP),但这个重合本身是个可用信号。

### 挂载点有用而陈述空洞:6 个 FIX

这是 A1 最需要动手的一类。它们不该删(拆了会断链),但陈述在复述别处已有的东西:

| id | D 子节点 | 该补什么 |
| --- | --- | --- |
| `apostol:zero-element` | 1(11 条边) | 现陈述 = 公理 5 原文 + 函数空间零元,两头都已有载体(`apostol:axioms-for-addition`、`apostol:function-space`)。应改成写零元**作为对象**的角色:它是 `apostol:theorem-uniqueness-of-zero-element` 断言唯一性的那个东西,是 `apostol:zero-element-forces-dependence` 用来判相依的那个东西。 |
| `apostol:function-space` | 11(全章最多) | 一句话塞了三件事:类的定义、两条运算公式、零元。**零元已有 `apostol:zero-element` 独立承载**,运算公式则是它自己 D 子节点必然复述的对象。应压到「元素是实值函数、运算逐点定义」。 |
| `apostol:inner-product-axioms` | 5(30 处引用,含 1 个 L2 成员) | 与 `apostol:inner-product` 构成同一内容的「公式版 / 点名版」。二择一:或 `apostol:inner-product` 删去公理枚举、本条独占四式;或反之。 |
| `apostol:spanning-set` | 3(1 个 L2 成员) | 谓词部分是 `apostol:linear-span` 的改写;「用几个元素够」由 `apostol:theorem-15-6` 答、「哪些空间能被有限集张成」由 `apostol:finite-dimensional-space` 答。独有的只剩「不同集合可张成同一子空间」。 |
| `apostol:scalar` | 0(4 条边) | 删第二句(实/复区分,与两个兄弟重复),留首句的命名行为。 |
| `apostol:real-linear-space` | 2 | 压到「省略 real 是默认约定」,实/复区分交回 `apostol:scalar`。 |

### 同一件事被拆成多个节点

- **`apostol:norm` / `apostol:norm-notation`** —— 同一条 DEFINITION 抽了两遍(已杀后者)。
- **`apostol:inner-product` / `apostol:inner-product-axioms`** —— 四条公理列了两遍,一遍给名字、一遍给式子。这不是「概念 + 公理」的正当分层,因为 `apostol:inner-product` 自己已经把四条按名字列全了。对比 `apostol:linear-space` 与它的三个公理组节点:那里分层站得住,因为 `apostol:linear-space` 只说「服从分三组的十条公理」,**不点名任何一条**。分界线是母节点有没有抢先把子节点的内容说出来。
- **`apostol:euclidean-space` / `apostol:real-euclidean-space` / `apostol:complex-euclidean-space`** —— 母节点已声明可实可复,两个子切分是纯拆(已杀)。

### 塞了本该分开的多件事(产出模式问题)

任务书提到 `apostol:function-space` 一句话同时给出两个运算公式和零元。**这个模式在 A1 中确认存在,并且我找到它的一般形式:凡是母节点抢先把子节点该讲的具体内容写进自己的 statement,该处的向下拆分必然复述。** A1 里有三处:

1. `apostol:function-space` —— 抢了运算公式(11 个 D 子节点无处落脚而只能复述)和零元(抢了兄弟 `apostol:zero-element` 的地盘)。
2. `apostol:euclidean-space` —— 抢先声明「可实可复、定理两边都成立」,直接导致两个实/复子节点无内容可讲。**这是母节点抢话把子节点挤死的完整实例**:不是子节点抽得差,是母节点先把话说完了。
3. `apostol:inner-product` —— 抢先点名四条公理,`apostol:inner-product-axioms` 只剩「把名字换成式子」可做。

反面对照:`apostol:linear-space` 的 statement 克制地只说「十条公理分三组」,把具体公理留给三个公理组节点,于是三个子节点各自都有实质内容(公理 1–2、3–6、7–10),`apostol:closure-axioms` 还成了 `apostol:theorem-15-4-subspace-criterion` 的判据本体。**同一个底座里两种写法并存,说明这是可控的写作选择,不是不可避免的**。

### 一条对 A1 有利的观察

17 个 `theorem` 节点无一因增益不足被杀,而且多数带有邻居给不出的**独有零件**:`apostol:triangle-inequality` 的等号条件(x=O、y=O 或 y=cx, c>0)不在 `apostol:theorem-15-9-properties-of-norms` 里;`apostol:theorem-15-11-components-relative-to-an-orthogonal-basis` 给的是算法(c_j=(x,e_j)/(e_j,e_j)),而 `apostol:components-relative-to-ordered-basis` 只断言唯一存在;`apostol:parsevals-formula` 算的是内积而非分量。定理层的切分比概念层干净得多。

---

## §5 覆盖空洞

### 事实更正:A1 覆盖了全部正文节,15.12–15.16 中只有三节是正文

任务书说「A1 覆盖 15.01–15.11,15.12–15.16 完全没有 L1 节点」。查 `source/apostol-ch15/` 的文件名与标题:

```
15.05-exercises.md  15.09-exercises.md  15.12-exercises.md  15.16-exercises.md
```

**15.05、15.09、15.12、15.16 四节都是习题节**,不是正文。A1 的 15.01–15.11 已覆盖该区间**全部正文节**,跳过 15.05/15.09 与跳过 15.12 是同一个(合理的)决定。

真正缺的是三节正文:

- **15.13 Gram-Schmidt 正交化过程**
- **15.14 正交补与投影**
- **15.15 有限维子空间中的最佳逼近**

### 这三节其实已有 L1 层,只是不在 A1 文件里

D 层的 `parent` 字段里出现了 **19 个 `apostol:` id 在 `nodes-A1.jsonl` 中不存在**,共 30 个 D 节点挂在这些「幽灵父节点」上。逐个追查其声明位置:

| 声明文件 | 幽灵父节点数 | 覆盖节 |
| --- | --- | --- |
| `data/nodes-A2-s1.jsonl` | 9 | 15.13 |
| `data/nodes-A2-s2.jsonl` | 7 | 15.14 |
| `data/nodes-A2-s3.jsonl` | 3 | 15.15 |

这三个文件共 28 个节点,schema 与 A1 一致(`aliases/anchors/book?/id/name_en/name_zh/node_type/sections/statement`,无 `parent`/`atomic`,即 L1 形制而非 `d:` 形制),`sections` 恰为 15.13/15.14/15.15。**结论:15.13–15.15 的 L1 节点是存在的,它们用的是 `apostol:` 命名空间,但落在 `nodes-A2-s*.jsonl` 而不是 `nodes-A1.jsonl`。**

所以「15.13/15.14/15.15 的内容目前只由 D4 层承载」这个描述也不准:D4 里 25+23+8=56 个节点确实覆盖这三节,但它们挂的父节点是 A2-s 里的 L1 节点,不是凭空悬挂。

### 对底座意味着什么(按增益视角)

1. **底座被切成两半,而分界线不是内容而是文件。** 一个把 `nodes-A1.jsonl` 当作「全部 L1」来读的下游代理,会认为 30 个 D 节点的 `parent` 指向不存在的 id。SPEC 要求 `members` 必须真实存在于下层数据文件中;`parent` 虽未同等明文约束,但「引用已有节点必须用它的原 id」的精神同样被绷紧了——这里不是编造归属,是**归属散落在两个文件、而没有任何清单说明它们合起来才是 L1**。这是本次审计发现的最要紧的结构问题,且它落在文件组织上,不落在任何单个节点的增益上,所以**没有影响任何一条裁决**。
2. **对增益判断的实际影响是有限但真实的。** 我的删除测试只在 A1 的 63 个节点内部找「能重新推出它的邻居」。如果把 A2-s 的 28 个节点算进同一层,`apostol:orthogonal-set`、`apostol:orthonormal-set`、`apostol:theorem-15-10-orthogonal-sets-are-independent` 这几个 15.11 的节点会多出一批 15.13 的邻居(Gram-Schmidt 一线)。我复查了这三个:15.13 的内容是**构造**正交集,15.11 是**定义与判定**,方向相反,不构成复述,裁决不变。但我把这列为 §6 的不确定项。
3. **15.13–15.15 是全章最重的三节**(D4 有 56 个节点落在这里,而 A2-s 的 L1 只有 28 个),底座与派生层的比例在这三节明显比 15.01–15.11 更陡。这不是 A1 的问题,但如果要评「底座够不够厚」,只看 A1 会得出偏乐观的结论。

---

## §6 我的不确定项

1. **跨文件邻居未纳入删除测试。** 我只在 A1 的 63 个节点内部找重建来源。已复查 15.11 的三个节点对 15.13 邻居不敏感(见 §5.2),但未系统复查全部 51 个 KEEP 是否会因 A2-s 的 28 个节点或 `nodes-A2-x2.jsonl` 而降级。风险方向是**我可能偏保守**(漏杀),不太可能偏激进。
2. **`apostol:dependence-inherited-by-supersets`(Example 1)判 KEEP 是我最软的一条 KEEP。** 「相依子集使全集相依」从 `apostol:dependent-set` 的定义出发只需一步论证(T 的有限子集也是 S 的有限子集)。我保留它,理由是「独立集的每个子集独立」这个对偶形式是可复用判据、且学习者不会自发注意到遗传性。但若审计标准更严(只保留定义不能一步推出的),它会翻成 FIX。
3. **`apostol:triangle-inequality` 与 `apostol:theorem-15-9-properties-of-norms` 的关系。** 前者是后者的 (d)。我判 KEEP 的唯一依据是等号条件(x=O、y=O 或 y=cx, c>0)只在前者;若有人认为等号条件应该并入定理 15.9 节点,则前者变成纯切分而该杀。这是一个**边界划法**的分歧,不是事实分歧。我在裁决 `reason` 里已建议改成以等号条件领起。
4. **`apostol:inner-product` / `apostol:inner-product-axioms` 我判了 KEEP + FIX,而没有杀掉任何一个。** 两者确实互相可重建(见 §4),严格执行删除测试应当杀掉一个。我没有这么做,因为**杀哪一个取决于内容怎么重排**,而重排不是我的裁决权限:`apostol:inner-product` 是 15.10–15.16 全部内容的入口(4 个 D 子节点),`apostol:inner-product_axioms` 承重更大(5 个 D 子节点、30 处引用、1 个 L2 成员)。我把判断落在 FIX 上并写明二择一方案,如实记录这是一次**回避了 KILL 的判决**。
5. **§4 的 D 挂载统计与任务书的「48 个无子节点」相差很大**(实测 12 个)。我按 `parent` 字段直接计数,方法写在 §4。若任务书用的是别的口径(例如只算某一层、或算 `edges-D*.jsonl` 的入边),我的统计可能与之不可比。这个数字**没有被我用作任何裁决依据**,只用于区分「挂载点有用」与「陈述有增益」。
6. **我未审数学正确性与锚点真实性。** 若审计 A 判定某节点数学错误或锚点伪造,我的 KEEP 不构成对它的辩护。我也注意到 `apostol:norm` 与 `apostol:norm-notation` 引了原书同一句话作锚点——我把这当作「同一内容抽了两遍」的增益证据,但**是否构成锚点复用缺陷,归审计 A 判**。

---

## §7 自查:id 是否逐字复制

**是。63 个 id 全部由脚本从 `data/inherited/nodes-A1.jsonl` 逐行 `json.loads` 后按行号取出,没有任何一个 id 经过手打。**

生成脚本:`tmp/B3-emit.py`。我的输入是「行号 + 裁决 + 死因 + 理由」的 TSV(`tmp/B3-batch1..7.tsv`),脚本按行号从源文件取 id 拼装 JSON。这样构造使**行号错位是唯一可能的 id 错误来源,而 id 拼写错误在结构上不可能发生**。

三重机器复核:

1. **顺序与完整性**:`diff` 裁决文件的 id 序列与源文件的 id 序列 —— `IDENTICAL (63/63, same order)`,零差异。
2. **理由中引用的 id**:脚本用正则抽出全部 63 条 `reason` 里出现的每一个 `apostol:*` token,逐个比对 A1 的 id 集合 —— 输出 `all apostol: ids cited in reasons exist in nodes-A1.jsonl`。这一项针对的正是「KILL 必须点名能重建它的具体节点」这个可核查性要求:**每个被点名的节点都真实存在,且都在 A1 内**。
3. **裁决计数**:`grep` 统计得 KEEP 51 / FIX 6 / KILL 6,合计 63,与 §1 表一致。

第一次落盘时 `json.dumps` 用了默认分隔符,产出 `"verdict": "KEEP"`(带空格),与 SPEC 的紧凑格式不符。已改用 `separators=(",", ":")` 全量重生成,当前文件为紧凑格式。此事只涉及格式,不涉及任何 id 或裁决内容。

**未静默截断**:63 个节点全部审完,无跳过。
