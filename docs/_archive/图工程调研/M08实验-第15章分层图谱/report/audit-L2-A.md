# 审计 A —— L2 抽象层的正确性与归属

审计对象：`data/structures-L2-a.jsonl`、`-b.jsonl`、`-c.jsonl`，共 24 个 L2 候选（每文件 8 条，已用 `grep -c` 逐文件确认）。
逐条判决见 `report/audit-L2-A-verdicts.jsonl`（24 行，与候选一一对应）。
未读 `report/audit-B.md`，未读同级目录 `M08实验-Apostol微积分卷1/`。

## 0. 审计口径

四项检查按 SPEC「抽象层候选 schema」与「审计规则」执行：成员归属是否真实、`statement` 定式是否数学正确、`boundary` 反例是否成立、`abstraction_gain` 的可迁移判断是否站得住。是否只是复述下层由审计 B 裁决，本审计不碰。

两条口径需要写明，因为它决定了本轮 10 个 FIX 里的 5 个：

**成员 vs 边界材料。** 一个节点如果被候选自己的 `boundary` 指认为「本定式在此失效」的地方，或者它的全部内容就是边界那个反例的出处，那它是边界材料，不是定式的实例。把它收进 `members`，等于用「定式管不着的东西」来充实例数。这条口径不是我发明的：`report/L2-c-提案说明.md` 的 C6 条自述，它故意把 `d:components-depend-on-the-ordering-not-only-on-the-basis` 留在 `boundary` 而不放进 `members`，理由写的是「把边界证据误收成成员，正是死因 2 的软性版本」。提案方自己立了这条标准，我按同一条标准检查全部 24 条。

**散文字段里的 id 同样受悬空规则约束。** SPEC 说「清单外的 id 一律视为悬空」，没有把范围限定在 `members`。`report/悬空成员修复日志.md` 只清洗了 `members` 与 `apostol_ids` 两个字段，`boundary` 与 `abstraction_gain` 里的引用没有过筛。我对全部 24 条的散文字段做了一遍 id 扫描，扫出的唯一一处悬空就在 a4 的 `boundary`（详见第 2 章）。

## 1. 判决计数与死因分布

24 个候选：**KEEP 14 / FIX 10 / KILL 0**。

无一 KILL。10 个 FIX 全部是局部可修的：删指定成员、收窄一个量词、或改一句挂错出处的边界文字，没有一条需要推翻整个定式。这一点值得记下来——L2 层的 24 条定式，作为「定式」本身没有一条是伪造的或空的。

死因分布：

| cause | 含义 | 条数 |
|---|---|---|
| 0 | KEEP | 14 |
| 1 | 量词过度断言 | 3 |
| 2 | 编造成员归属 | 5 |
| 3 | 错误教材归属 | 1 |
| 4 | 数学错误 | 1 |

三个视角各自得分：

| 视角 | 主题 | KEEP | FIX | 死因 |
|---|---|---|---|---|
| a | 同一套验证动作 | 0 | 8 | 1×3、2×4、4×1 |
| b | 计数 | 6 | 2 | 2×1、3×1 |
| c | 正交性/最优性 | 8 | 0 | —— |

视角间的落差极大，且成因清楚。视角 a 的每个候选带 13–16 个成员（共 117 个引用），且它的组织原则是「这些证明走的是同一套动作」——成员越多、动作说得越死，被单个不合规成员或单个「任何/每一条」量词推翻的面就越大。a 的 8 个 FIX 里，3 个是量词（a1、a2、a7），4 个是成员归属（a3、a4、a5、a8），1 个是数学错误（a6）。视角 c 每条 8–11 个成员（共 75 个），定式是「正交性买到了什么」这类结构性判断，反而全部通过。视角 b 居中（共 71 个）。

成员引用总量 263 个，全部能在 `data/ID-MANIFEST.md` 的活 id 里解析，无一悬空，候选内部无重复。修复日志确实把 `members` 字段清干净了。（清单在本次审计期间被重新生成过一次，总数从 493 变为 504，我按新清单重跑了全部核对，结论不变——见 6.2。）

## 2. 成员归属错误专章

5 条 cause 2。按 SPEC「编造成员归属一律至少 FIX，并逐个点名该删的成员 id」，逐条点名如下。

需要先说清一件事：**这 5 条没有一条是凭空发明 id**。全部 263 个成员引用都指向真实存在的活节点。错的是归属关系——把一个真实节点挂在了它并不实例化的定式下面。SPEC 把这类和凭空造 id 归为同一死因，我按同一死因判，但两者的严重程度应当区分开：前者是分类错误，后者是伪造。本轮的 5 条全是前者。

### 2.1 a3 `L2:read-off-a-coefficient-by-one-pairing` —— 删 1

删 `d:parseval-proof-pair-expansion-with-y`。

定式是「配对一次使和式塌成单项，再除以自内积读出系数」。但 15.11 的定理 15.12（Parseval）证明里，和式一项都没塌：把 (15.10) 与**任意** y 配对再用线性，得到的是 Σ (x, e_i) conj(y, e_i)，n 项全留着。被配对的第二变元不是正交系成员 e_j 而是空间里任意元素 y，所以既没有「除第 j 项外全为零」，也没有可除的 (e_j, e_j)，更没有被读出的单个系数。该成员自己的 `statement` 只说「与 y 作内积并用线性性质」，通篇没有正交塌缩。它是「配对 + 线性」的实例，不是本定式的实例。

其余 12 项核对通过。

### 2.2 a4 `L2:independence-by-killing-all-but-one-coefficient` —— 改 boundary 引用，members 不动

这一条的成员 15 项全部合规，问题在 `boundary`：它把 `d:exponential-nonvanishing-used-for-reversibility` 与 `d:exponential-law-used-in-the-shift` 并列为「非代数输入」的两处记录，但前者已被审计 B 判死并移入 `data/graveyard/killed-nodes-auditB.jsonl`，不在活 id 清单内（493 版与 504 版都不在，我两次都查过）。

**这是全部 24 个候选、全部字段里唯一的一处悬空引用**，而它之所以漏网，正是因为修复日志只过筛 `members` 与 `apostol_ids`。所述事实本身不假（指数恒不为零使规范化可逆），它保存在活节点 `d:exponential-independence-multiply-by-a-normalizing-exponential` 的 `statement` 里，改指过去即可。

### 2.3 a5 `L2:proof-inheritance-by-auditing-what-the-old-proof-used` —— 删 3

删 `apostol:theorem-15-14-orthonormal-basis-exists`、`d:finite-dimensionality-supplies-a-finite-basis-to-orthogonalize`、`d:theorem-15-9-holds-for-every-inner-product`。

定式限定为跨章搬运：把第 12 章关于 V_n 的结论搬到一般线性空间时，回去清点旧证明用过哪些性质，确认没有 V_n 专属结构，于是宣布同一份证明逐字有效。15.5→12.8、15.7→12.10、15.8→12.3 三条合格。但定理 15.14 是章内定理 15.13 的推论（正交化后逐个规范化），既没有第 12 章的旧证明可清点，也没有把证明搬到新场合，只是「不另写证明」——候选自己的 `statement` 就承认它是「被显式说明是正交化定理的推论而非新证明」，机制不同却被并列成同一套路。`d:theorem-15-9-holds-for-every-inner-product` 讲的是 15.9 的量词覆盖面，属于「一条定理有多广」而非「一份旧证明用过什么」。

**这一条与修复日志直接相关。** 日志第 13 行对本候选做的是 DROP：被杀的 `d:theorem-15-14-is-a-corollary-not-a-new-proof` 被直接删掉，理由写的是「replacement `apostol:theorem-15-14-orthonormal-basis-exists` already a member」。那次修复清掉了悬空引用，却把这个本不该在此的成员留了下来。本条要删的正是它。

### 2.4 a8 `L2:testing-infinite-objects-through-finite-windows` —— 删 2

删 `d:dependence-distinctness-of-the-chosen-elements`、`d:orthogonal-set-condition-on-distinct-pairs-only`。

定式是「每个定义只在有限子族上下判断，再对全部有限子族取量词」。这两项讲的是元素**互异性**，不是有限性。前者全部内容是「见证元素必须互不相同；否则取 x_1 = x_2、c_1 = 1、c_2 = −1 就使每个非空集相依」，与子族大小、与量词位置都无关。后者明说 distinct 的作用是「豁免对角线，故不对 (x, x) 作断言，正交集因此可以含零元，这正是定理 15.10 要额外加非零假设的原因」，同样与有限窗口无关。互异性与有限性是定义里两条彼此独立的子句，`statement` 中「正交集只对相异元素对提要求」一句正是把前者说成后者、以凑齐第四个实例。

删掉后实例数不减：正交集真正能进本套路的理由是 `d:15-10-proof-setup-vanishing-finite-combination`（无限正交系的独立性靠有限组合判定，三角系即其实例），该成员已在列。

关于任务简报提示的材料集中：本候选 15 个成员里 13 个是 `d:` 前缀、2 个是 `apostol:`。材料确实高度集中在定义注记一侧。但这属于抽象增益是否只是复述下层的问题，归审计 B，本审计不据此裁决。

### 2.5 b1 `L2:dimension-as-a-two-sided-count-barrier` —— 删 2

删 `d:infinite-dimensional-operational-criterion-no-finite-spanning-set`、`d:spanning-set-is-not-unique`。

两项都是边界材料，而且第一项正是本候选自己边界里的反例。边界一逐字引用它来说明「此时既没有天花板也没有有限地板，整道壁垒失效」——一个候选自己指认为定式失效处的节点，不能同时算作实例化这条定式的成员。第二项说的是「不同集合可以有相同张成，是多对一关系」，通篇不含任何计数上下界，它的内容恰好就是边界二那个 {O, i, −i, j, −j, i+j} 例子的出处。

两者仍可留在 `boundary` 的引用里，边界文字不必改。

### 2.6 双重计数问题的回答

任务简报问：修复日志里 14 处（我数为 15，见第 6 章）「replacement already a member」式的直接删除，是否意味着双重计数？

答案是**轻度的粒度重复，不是编造归属**。我对全部 24 个候选建了父子链塌缩表：那些 DROP 行的共同形态是，一个被杀的子节点和它仍然存活的父节点**同时**列在 `members` 里，修复时删掉子节点，父节点留下。父节点是真成员，所以删除后归属关系没有受损，损失的只是「同一件事在两个粒度上各算一次」带来的计数虚高。

这个现象在 `members` 内部本来就存在，与修复无关。塌缩到不同父链后的分布：a4 的 15 个成员塌成 4 个不同的根、含 11 对父子关系（最严重）；另一端 b3、b7、c8 塌缩后为 0 对父子关系（成员彼此独立）。成员计数因此不能直接当作「实例数」横向比较，视角 a 的 13–16 与视角 b/c 的 8–11 之间的差距有一部分来自这个。这属于计数口径问题，我没有据此下 FIX。

## 3. 边界反例专章

SPEC 要求每条 L2 至少给一个具体反例，说明「什么东西看起来属于它但不属于」。24 条全部给了 `boundary`，没有一条缺失或空泛到需要因此判死。多数候选给了 2–3 条反例。

但边界字段是本轮问题最集中的地方：10 个 FIX 里有 6 个的缺陷在 `boundary` 或由 `boundary` 暴露。

### 3.1 边界推翻了自己的 statement（2 条）

**a1 `L2:closure-certificate-for-subspacehood`（cause 1）。** 边界给的可操作预判是「定义条件若是齐次线性等式（=0）定式会通过；若带非零常数项或是次数、正性一类非线性约束，定式会在封闭性一步失败」。这被 Apostol 自己的 15.03 例 7 推翻：「次数 ≤ n 的多项式」正是次数约束，却通过封闭性检验（15.03 把它列为线性空间，只把「次数**恰为** n」判为不是）。更糟的是 `abstraction_gain` 第 (2) 条把例 7 列为该预判的三处兑现之一，与预判本身直接矛盾。另外 15.03 例 1 至例 12 通篇没有正性例子，「正性一类」是无章内出处的外推。

**a7 `L2:expand-the-squared-norm-and-classify-the-cross-terms`（cause 1）。** `statement` 断言「第 15 章处理**任何**关于范数的等式或不等式时走的是同一套动作」，而候选自己的边界第一段就承认定理 15.9 的 (a)(b)(c)（‖O‖ = 0、非零元范数为正、‖cx‖ = |c|‖x‖）里「根本没有两个不同元素相加，所以没有交叉项可展开、可分类，本定式的核心判断在它们身上是空转的」。边界的内容是对的（15.10 原文明写 (a)(b)(c) 由公理直接得出，全部证明文字给 (d)），错的是 `statement` 的量词。收窄为「涉及两个及以上元素之和的范数等式或不等式」，边界第一段就从「自我推翻」回归为正常的边界说明。

这两条形态相同：边界写得比 `statement` 更准，是 `statement` 的量词没跟上。

### 3.2 边界本身数学错误（1 条）

**a6 `L2:construct-the-orthogonal-part-by-subtracting-projections`（cause 4，本轮唯一）。** 边界反例三称「方向元素为零时整套动作停摆」，与 15.13 原文不符。原文（`source/apostol-ch15/15.13.md:35`）：

> If $y_{j} = O$, then $y_{r+1}$ is orthogonal to $y_{j}$ for any choice of $a_{j}$, and in this case we choose $a_{j} = 0$. Thus, the element $y_{r+1}$ is well defined and is orthogonal to each of the earlier elements

即 y_j = O 时递推照常继续，只是系数人为取 0。候选自己引用的 `d:zero-earlier-element-makes-the-coefficient-irrelevant` 写的正是这个，而 15.13 例 1（在 V_4 中算出 y_3 = O 并据此得 dim = 2）就是这条约定跑通的实例。真正停摆的只有「沿 y_j 求投影」这一个动作（`d:projection-along-an-element-needs-a-nonzero-direction`）。

这个错误会误导读者以为 Gram-Schmidt 遇到零元就无法继续，而 15.13 恰恰因为这条约定才**不需要输入独立**——这是该定理的一个要点，说反了代价不小。

### 3.3 边界挂错教材出处（1 条）

**b4 `L2:a-basis-locks-the-coordinate-count-not-the-geometry`（cause 3，本轮唯一）。** 边界二写「同一个 V_n 上换一个加权内积（`apostol:weighted-integral-inner-product` 就是这么做的）」。但该节点文本与 15.10 原文都只把权函数内积定义在 C(a,b) 上（w 是 C(a,b) 里的固定正函数），15.10 全节没有任何 V_n 上的加权内积。V_n 上的第二个内积是 Example 2 的双线性型 2x₁y₁ + x₁y₂ + x₂y₁ + x₂y₂，那是一般双线性型不是加权内积。

边界的实质结论完全正确（换内积不改坐标个数、却改变范数与正交关系），而且它的正确出处 `d:inner-product-not-unique-on-a-given-space` **已经在 members 里**，该节点逐字给出 Example 2 与「there may be more than one inner product in a given linear space」。改一句引用即可，9 个成员全部真实。

### 3.4 边界与成员混淆（2 条，已在第 2 章点名）

b1 和 a4：b1 把边界一自己指认的失效节点和边界二的例子出处都收进了 `members`；a4 的边界引用了一个被杀的 id。

### 3.5 KEEP 侧值得记录的边界

**c8 的边界二是我独立验算后确认的，Apostol 没算。** 边界称用 Legendre 多项式逼近 sin(πt) 时，次数从 2 提到 3 严格降低误差。φ₃ ∝ P₃(t) = (5t³ − 3t)/2，∫₋₁¹ sin(πt)P₃(t)dt ∝ 2/π − 30/π³ ≈ −0.331 ≠ 0，故该系数非零、误差严格下降。边界成立，但读者无法在教材里查证这一步。

**c3、c7 的边界都给了可手算的具体反例，我逐个验算通过。** c3：e₁ = (1,0)、e₂ = (1,1) 非正交，x = (0,1) 代入正交基公式给 (1/2, 1/2) ≠ x，正确答案是 c₁ = −1、c₂ = 1（验：−1·(1,0) + 1·(1,1) = (0,1)）。c7：x = (1,1) 拆成 (1,−1) + (0,2)，配对得 −2，‖x‖² = 2 而分量平方和为 2 + 4 = 6，差 4 正是交叉项 2·(−2)。这类能落到数字上的边界，是本轮质量最高的一类。

**c2、c5 的边界引 Strang 4.1 的 Example 1（地板/墙）与 Example 2（两面墙不正交），编号与 `source/strang-ch4/4.1.md:41-43` 一致。** 但这两个例子讲的是子空间与子空间的正交，见第 5 章的存疑记录。

## 4. 跨视角重叠

只报事实。是否合并、合并成哪一条，由审计 B 裁决——本审计没有对任何候选因重叠而下 FIX。

三个视角独立提案，264 个成员位置里 263 个有效引用落在 195 个不同的下层节点上，其中 **54 个节点被两个以上视角的候选同时引用**，4 个被全部三个视角引用（`apostol:fourier-coefficients`、`apostol:uniqueness-of-components`、`d:orthogonality-to-generators-extends-to-their-span`、`d:s-defined-as-the-sum-of-projections-along-the-basis-elements`）。

按成员集合的 Jaccard 相似度排序，跨视角重叠达到 J ≥ 0.15 或共享 ≥ 3 个成员的配对共 6 组：

| J | 共享 | 候选一 | 候选二 |
|---|---|---|---|
| 0.39 | 7 | a7 `expand-the-squared-norm-and-classify-the-cross-terms` | c7 `orthogonal-splitting-makes-the-norm-additive` |
| 0.33 | 6 | a6 `construct-the-orthogonal-part-by-subtracting-projections` | c4 `peel-off-the-projection-to-manufacture-a-new-direction` |
| 0.29 | 5 | a3 `read-off-a-coefficient-by-one-pairing` | c3 `orthogonalizing-first-decouples-the-coefficients` |
| 0.29 | 4 | b6 `the-size-of-the-best-approximation-is-fixed-by-the-subspace-dimension` | c8 `orthonormal-systems-make-approximation-incremental` |
| 0.24 | 5 | a2 `uniqueness-by-forcing-the-difference-to-zero` | c5 `self-orthogonality-forces-zero-the-uniqueness-engine` |
| 0.20 | 4 | a2 `uniqueness-by-forcing-the-difference-to-zero` | b4 `a-basis-locks-the-coordinate-count-not-the-geometry` |

最高的三组（a7/c7、a6/c4、a3/c3）共享成员分别是勾股展开族、Gram-Schmidt 投影族、分量公式族的核心节点，两侧的差别主要在切入角度：a 侧说「这些证明走同一套动作」，c 侧说「正交性买到了什么结构」。同一批下层节点被两种组织原则各覆盖一次。

**视角内部几乎没有重叠。** 同一文件内共享 ≥ 3 个成员的配对为 0。提案方各自在内部做过去重。`report/L2-a-提案说明.md` 自述 a3 与 a6 是它最容易塌陷的一对，共享 `d:coefficient-that-cancels-the-projection-component`，并建议只留一条时保 a6——我核对了，两者确实只共享这 1 个成员，J 远低于阈值。

一处相关的张力（不构成重叠，但同一事实被两条候选用作反向论据）：c2 的第二条边界与 b6 关于压缩的主张方向相反，见第 5 章。

## 5. 我不确定的地方

以下 8 处是我判决时确实犹豫、或结论建立在我自己的推断而非教材原文之上的地方。逐条列出，供审计 B 与用户复核。

**5.1 c6 的一处教材归属，我最终放过，但提案方自己也不确定。** `report/L2-c-提案说明.md` 的 C6 条自述，`apostol:orthogonal-sequence-unique-up-to-scalars` 挂在 C6 而不是 C5，是按「结论 vs 证明步骤」切分的，并主动标注这是它最不确定的一处归属。我认为按该切分标准 c6 站得住，故判 KEEP。但这个节点同时是 a2 边界争议的焦点（见 5.2），三处判断彼此牵连，如果审计 B 对切分标准有不同意见，c6 的这一项和 a2 的边界二应当一并重看。

**5.2 a2 的 FIX 理由有两条，第二条比第一条弱。** 第一条（定理 15.6 走的是反对称计数，不是「设两个再相减」，因此「每一条唯一性结论」为假）我有把握。第二条是内部矛盾：`boundary` 把 `apostol:orthogonal-sequence-unique-up-to-scalars` 点名为「伪成员」，而它就列在 `members` 第 12 位。我判定它是**真**成员、错的是边界给的标签，依据是 15.13(c) 原证确实跑完三步（把竞争者拆成 z_r + c_{r+1}y_{r+1}，用 z_r 自正交逼出 z_r = O）。但也可以反过来判：结论是「相差标量因子」而非「相等」，把它算作定式的弱结论变体本身就有拉伸。我选了保成员、改标签，因为删成员的代价更大。这个选择可以被推翻。

**5.3 b8 的 `d:rescaling-preserves-orthogonality`，我犹豫后判 KEEP。** 它保持的是一个关系（正交性），不是一个计数，严格说与 b8 的计数主题隔一层。按我对 b1 用的同一把尺子，它比 b1 那两项离主题更近但仍不算标准实例。判 KEEP 是因为它在 b8 的论证链里承担「规范化不改变独立性因而不改变计数」这一步，属于计数结论的前提供给。如果审计 B 认为「前提供给者不算实例」，b8 应改 FIX。

**5.4 c3 的 `apostol:uniqueness-of-components` 同时是前提供给者和边界对照案例。** 与 5.3 同类，我同样判 KEEP。这类「前提供给者算不算成员」的问题，本轮出现 3 次（b8、c3、b6 各一次），我给出的答案都是算，但 SPEC 没有明文规定，标准是我立的。

**5.5 c2 的第二条边界，事实正确但例子和论点对不上。** 边界要论证的是「只检查部分生成元不够」，引的是 Strang 4.1 Example 2（两面墙不正交）。两面墙那个例子讲的是**子空间与子空间**的正交，不是「检查了部分生成元就以为对全部成立」。事实陈述没错，例子选得不贴。我没有据此下 FIX，因为该候选的第一条边界已独立满足 SPEC 的边界义务。这一条如果从严，可以判 FIX。

**5.6 c2 与 b6 在压缩问题上方向相反。** c2 强调检查部分生成元不足以推出整体结论，b6 强调最优逼近的大小完全由子空间维数锁定（一种压缩主张）。两者不直接矛盾（论域不同），但放在同一张图里读者会觉得别扭。这是我个人的观感，不是缺陷认定。

**5.7 c2 与 c8 的部分边界属于「模型层面」的反例，不是教材事实。** `report/L2-c-提案说明.md` 自己给这类边界标了 origin: model。它们成立，但无法在 Apostol 或 Strang 里查证（c8 边界二我自己验算了，见 3.5；c2 的一致范数反例我认为正确但同样是章外的）。判 KEEP 时我接受了这类边界，理由是 SPEC 只要求反例具体且成立，没要求必须有教材出处。

**5.8 我读过一个被杀节点的 `_kill_reason`。** 查 a4 那处悬空引用时，我打开了 `data/graveyard/killed-nodes-auditB.jsonl` 里 `d:exponential-nonvanishing-used-for-reversibility` 的记录，看到了它的死因（cause 5）。任务要求我不读 `report/audit-B.md`、保持独立，我判断读墓地文件确认一个 id 是死的属于必要核对，但确认死活时顺带看到死因，已经踩在那条线上。我没有据此改动任何判决——a4 的 FIX 理由是「引用了清单外的 id」，与它为什么被杀无关。如实记录。

## 6. 与任务简报不符的两处数据

按简报规则「不符时以你数出的为准并说明」。

**6.1 悬空修复日志是 15 处删除 / 7 处重定向，简报说 14 / 8。**

`report/悬空成员修复日志.md` 有 22 条数据行，与简报所说的 22 处悬空一致。但按文件 × 动作拆分：

| 文件 | DROP | REDIRECT |
|---|---|---|
| structures-L2-a | 7 | 2 |
| structures-L2-b | 2 | 1 |
| structures-L2-c | 1 | 3 |
| nodes-X | 5 | 1 |
| 合计 | **15** | **7** |

字段分布是 `members` 16 处、`apostol_ids` 6 处。

算术可以佐证 15 这个数：`report/L2-a-提案说明.md` 声称视角 a 有 124 个成员引用，124 − 7（a 文件的 DROP 数）= 117，与当前 `structures-L2-a.jsonl` 实测的 117 个引用完全吻合。REDIRECT 不改变数量，只有 DROP 减少数量，所以 a 文件的 DROP 必须正好是 7。同理 b：73 − 2 = 71（实测 71）；c：76 − 1 = 75（实测 75）。三个文件全部自洽。

**6.2 id 清单在审计期间从 493 个增长到 504 个；三份提案说明里的 405 则早已过期。**

清单总数出现过三个版本，需要一并交代：

| 版本 | 总数 | apostol | d | strang | x |
|---|---|---|---|---|---|
| 三份提案说明依据的白名单 | 405 | 91 | 230 | 62 | 22 |
| 我开始审计时读到的 | 493 | 125 | 284 | 62 | 22 |
| 我交付前重新读到的（当前） | **504** | **136** | 284 | 62 | 22 |

`data/ID-MANIFEST.md` 由 `tools/gen_manifest.py` 自动生成，表头现在写「节点总数 **504**：apostol L1 136、d: 下延 284、x: 跨教材 22、strang L1 62」，我正则抽取得到的唯一 id 数正好 504。也就是说，在我审计这 24 个候选的过程中，有人重新生成过清单，`apostol:` 命名空间增加了 11 个 L1 节点。

**这不影响任何判决，我按 504 版重跑了全部机器核对：** 263 个成员引用仍然全部解析（0 悬空）；a4 的那处散文悬空引用 `d:exponential-nonvanishing-used-for-reversibility` 仍然在清单外；a5 附注里提到的 `d:theorem-15-14-is-a-corollary-not-a-new-proof` 仍然在清单外。新增的 11 个都是 `apostol:` 前缀，而我全部 10 条 FIX 里没有一条的理由是「某个 apostol id 不存在」——b4 那条 cause 3 的问题是出处所在的空间不对，不是 id 不存在。

后续读者若按 405 或 493 复核会得出错误结论，故记录在此。另外提醒：清单既然会在工作期间被重新生成，任何依赖「清单外即悬空」的审计结论都应当注明所依据的清单版本。本报告的一切 id 存在性判断以 **504 版**为准。

## 7. 交付前自检

三项自检按简报要求执行，结果如下。

**7.1 判决行数 == 24。** `grep -c` 三个数据文件各得 8、8、8，合计 24 个候选；`report/audit-L2-A-verdicts.jsonl` 24 行，每行合法 JSON，`id` 与候选一一对应。**通过。**

**7.2 无超范围 id、无重复。** 24 个 `id` 全部逐字取自三个数据文件，无一条靠名字匹配；24 个 id 互不重复，无遗漏、无多余。**通过。**

此项曾经不通过。我初版的自检脚本正则只匹配「删除成员」这个词，只捞出 b1 一条，覆盖不足。改成对 10 个 FIX 行提到的每一个 id 逐个查 `members`、查 manifest、查击杀名单后重跑，才发现 7.3 下面那个缺陷。

**7.3 被点名删除的成员 id 确实出现在该候选的 members 里。** 8 个被点名删除的成员 id（a3 一个、a5 三个、a8 两个、b1 两个）全部在对应候选的 `members` 中实测存在。**通过。**

一处需要说明：a5 的 `suggested_fix` 里还提到 `d:theorem-15-14-is-a-corollary-not-a-new-proof`，这个 id **不在** 493 个活 id 内。它不是我编的，也不是我要删的目标——它是被审计 B 杀掉的节点，我引用它是为了复述修复日志第 13 行的历史。但我初版的措辞说日志把它「顶替」了，而日志那一行的动作是 DROP 不是 REDIRECT。我按日志原文改写了这条附注，并重新校验了全部 24 行。

**7.4 额外做的一项：全字段悬空扫描。** 简报只要求核对 `members`，我对 `boundary`、`abstraction_gain`、`statement` 也做了 id 扫描，因为修复日志没覆盖这些字段。扫出 1 处（a4，见 2.2）。

**7.5 交付前按重新生成后的 504 版清单重跑了 7.1–7.4 全部核对，结果全部不变。** 判决文件另经结构校验：24 行全部是合法 JSON，字段齐全，`cause == 0` 与 `verdict == KEEP` 严格互为充要，14 个 KEEP 行的 `suggested_fix` 全部为空。

## 8. 一处差点误判的记录

c6 引用 Strang 4.2 关于 A₁/A₂/A₃ 的一段（不同矩阵、相同列空间、相同投影矩阵）。我用 `A_2`、`A_{2}`、`A_ 2` 三种写法 grep 全部返回空，已经准备判它 cause 3（编造教材归属）。改用更宽的模式重搜，在 `source/strang-ch4/4.2.md:64` 逐字找到了：

> That plane is the column space of … $A _ { 2 }$ … is also the column space of $A _ { 3 }$ (a subspace has many bases). So ${p}_{2} = {p}_{3}$ and $P_{2} = P_{3}$

原文用的是**带空格的 LaTeX** `A _ { 2 }`，我的三种模式全都匹配不上。c6 的引用是干净的，判 KEEP。

这正是简报警告的「曾因名字匹配误杀 9 个节点」那类事故的翻版：检索模式没命中不等于内容不存在。我把这次经过写进了 c6 的判决 `reason`，并立刻用更稳的方式重跑了 b4 的同类核对（b4 的 cause 3 在重跑后仍然成立——那一条的问题不是找不到出处，而是出处所在的空间不对）。

## 附录：判决一览

| # | id | verdict | cause |
|---|---|---|---|
| a1 | `L2:closure-certificate-for-subspacehood` | FIX | 1 |
| a2 | `L2:uniqueness-by-forcing-the-difference-to-zero` | FIX | 1 |
| a3 | `L2:read-off-a-coefficient-by-one-pairing` | FIX | 2 |
| a4 | `L2:independence-by-killing-all-but-one-coefficient` | FIX | 2 |
| a5 | `L2:proof-inheritance-by-auditing-what-the-old-proof-used` | FIX | 2 |
| a6 | `L2:construct-the-orthogonal-part-by-subtracting-projections` | FIX | 4 |
| a7 | `L2:expand-the-squared-norm-and-classify-the-cross-terms` | FIX | 1 |
| a8 | `L2:testing-infinite-objects-through-finite-windows` | FIX | 2 |
| b1 | `L2:dimension-as-a-two-sided-count-barrier` | FIX | 2 |
| b4 | `L2:a-basis-locks-the-coordinate-count-not-the-geometry` | FIX | 3 |
| b2, b3, b5, b6, b7, b8 | 见 verdicts.jsonl | KEEP | 0 |
| c1 – c8 | 见 verdicts.jsonl | KEEP | 0 |




