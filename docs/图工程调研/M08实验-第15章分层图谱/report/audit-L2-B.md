# 审计 L2-B（抽象增益）报告

审计对象：`data/structures-L2-a.jsonl`、`data/structures-L2-b.jsonl`、`data/structures-L2-c.jsonl`（均为审计 A 修复后的现文）。
唯一维度：抽象增益。数学正确性、members 归属真实性、锚点一律不审（审计 A 的维度，本审计与之正交）。
判据：**删除测试**——删掉该 L2，学习者手里仍有它的全部 members；他能否仅凭 members 重新得出该结构声称的判断力？能 ⇒ 伪抽象 KILL（死因 5）；不能 ⇒ KEEP，且必须在 reason 里点出那个「本章外或 members 外的新对象」。

## §1 数字总览

候选总数 **24**（不是任务书估计的 21：a/b/c 各 8 个），全部审完，无遗漏、无静默截断。

| 文件 | 候选数 | KEEP | FIX | KILL | 存活率 |
| --- | --- | --- | --- | --- | --- |
| `structures-L2-a.jsonl` | 8 | 3 | 0 | 5 | 37.5% |
| `structures-L2-b.jsonl` | 8 | **0** | 0 | 8 | 0% |
| `structures-L2-c.jsonl` | 8 | 1 | 0 | 7 | 12.5% |
| **合计** | **24** | **4** | **0** | **20** | **16.7%** |

全部 20 条死因均为 `5`（伪抽象·层塌缩）；无 FIX——抽象增益要么有要么没有，改写辩护词不能把它变出来。

四个存活者：

1. `L2:uniqueness-by-forcing-the-difference-to-zero`（a）
2. `L2:independence-by-killing-all-but-one-coefficient`（a）
3. `L2:testing-infinite-objects-through-finite-windows`（a）
4. `L2:orthogonality-as-a-certificate-of-optimality`（c）

### 我实际使用的 KEEP 门槛

三个候选都能讲一套听着像方法论的故事，所以我必须把门槛写成可执行的，否则 24 个会全过或全死。我用的是：

> L2 必须提出一条**可证伪的跨成员断言**，它（a）不被任何单个 member 陈述，（b）不能由两三个 member 一步并置或一次移项得出，（c）把 statement 里的第15章专有名词换成别章的之后**不再成立**。

(b) 是决定性的一条。绝大多数被杀的候选不是胡说，而是**正确但便宜**：它们的「增益」是把两个已在 members 里的事实并排放好，再给这个并置起个名字。学习者手里既然还留着这两个成员，他并置它们不需要 L2 帮忙。

(c) 淘汰的是另一批：`L2:counts-survive-the-procedures-that-destroy-the-objects`（先认准手续守哪个量）、`L2:existence-costs-a-representation-uniqueness-is-free`（存在性要构造、唯一性要刚性）这类，命题为真且可迁移，但可迁移到任何章、任何教材，因而不是本章的抽象层，是治学习惯。

## §2 KILL 分类

20 条 KILL 分成四类。类别名沿用任务书给的「伪抽象面目」。

### 2.1 单成员塌缩（9 条）——增益整条写在某一个 member 里

`L2:closure-certificate-for-subspacehood`、`L2:read-off-a-coefficient-by-one-pairing`、`L2:proof-inheritance-by-auditing-what-the-old-proof-used`、`L2:dimension-as-a-two-sided-count-barrier`、`L2:one-independent-constraint-costs-exactly-one-dimension`、`L2:the-split-belongs-to-the-subspace-not-to-the-basis`、`L2:peel-off-the-projection-to-manufacture-a-new-direction`、`L2:orthonormal-systems-make-approximation-incremental`、`L2:orthogonalization-as-a-dimension-counter`

**详细实例：`L2:dimension-as-a-two-sided-count-barrier`。**
它的 `abstraction_gain` 全文只主张一件事：「给出一个不需要任何计算的反驳动作：要证一族元素相关，把个数对已知维数一比即可（n+1 个必相关）；要证一个集合张不满，同样只需比个数」，外加逆否形式的自查。

删除测试。删掉这个 L2，学习者手上留着它的 9 个 members。其中一条是 `d:n-plus-one-elements-in-an-n-dimensional-space-are-dependent`——n 维空间里 n+1 个元素必相关。这就是上限那一半的全部内容，逐字。矩阵形态另有 `strang:short-wide-matrix-has-dependent-columns` 独立给出。「先查维数再审查 n+1 个无关元素的断言」是同一条的逆否，不是第二件知识。

下限那一半更弱：该候选的 `statement` **自己承认**「下限本身两本教材都未陈述」且「由 15.5 一步可得」。而 `apostol:theorem-15-5` 正是它的 member。学习者从 members 出发写：若 k < n 个元素张成 V，则 V 中任 k+1 个元素相关，但基里的 n 个元素独立且 n ≥ k+1，矛盾。一行。

至于「两侧是同一次挤压」，members 里有 `d:thm-15-6-first-inequality-m-at-most-k` 与 `d:thm-15-6-conclusion-by-antisymmetry`——挤压的两半各自成节点，L2 只是把它们的存在描述了一遍。

三条增益全部可从 members 一步取得 ⇒ 伪抽象。

### 2.2 两成员一步并置（6 条）——增益 = 已有的 A 加已有的 B，加法本身不需要教

`L2:a-basis-locks-the-coordinate-count-not-the-geometry`、`L2:checking-against-a-set-compresses-to-checking-against-a-count`、`L2:orthogonalizing-first-decouples-the-coefficients`、`L2:self-orthogonality-forces-zero-the-uniqueness-engine`、`L2:orthogonal-splitting-makes-the-norm-additive`、`L2:the-size-of-the-best-approximation-is-fixed-by-the-subspace-dimension`

**详细实例：`L2:a-basis-locks-the-coordinate-count-not-the-geometry`。**
增益是一条分诊：结论只依赖坐标个数的，固定一个基就够；涉及长度、角度、正交、最近的，必须先声明用哪个内积。

删除测试。members 里有 `d:dimension-theory-uses-no-metric-notions`（维数理论不含度量概念）——这是分诊的正面一半，逐字。members 里还有 `d:inner-product-not-unique-on-a-given-space`（同一空间上内积不唯一，且按 b 文件自己的 boundary，这个节点自带 V_2 上两个不同内积的实例）——这是反面一半，逐字。

拿这两条去问一个本章外的新问题：「{1, t, t^2} 在多项式空间里正交吗？」学习者只凭第二个 member 就答得出「没有指定内积前这句话没有主词」，因为该 member 的实例就是同一个空间上两个内积给出不同的正交关系。L2 的分诊没有多给一步。

「所以坐标唯一永远推不出任何长度或正交结论」这句听起来像一条禁令，但它就是「维数理论不含度量」换个方向说。

### 2.3 空洞哲学（2 条）——换掉第15章专有名词后依然成立

`L2:counts-survive-the-procedures-that-destroy-the-objects`、`L2:existence-costs-a-representation-uniqueness-is-free`

**详细实例：`L2:counts-survive-the-procedures-that-destroy-the-objects`。**
增益原文：「给出一条使用任何化简手续之前的检查动作：先写下这道手续保的是哪个量，再确认你的结论只用到那个量。」

按任务书给的判定法替换专有名词：把「消元 / 正交化 / 乘可逆矩阵」换成「配方法 / 换元积分 / 泰勒展开」，把「秩 / 前缀张成」换成「判别式 / 积分值」——「用任何化简手续前先写下它保的是哪个量，再确认结论只用到那个量」照样成立，而且照样有用。这是通用治学习惯，不是第15章的抽象层。

它唯一硬的具体内容（不可拿 R 的列当 C(A) 的基）由两个 member 直接给出：`strang:pivot-columns-basis-for-column-space` 与 `strang:elimination-preserves-row-space-and-nullspace`。

它同时犯了大杂烩：members 里的守恒量彼此无关（秩、前缀张成、非零输出个数、缩放保正交），而 `d:span-inclusion-x-inside-y` 根本不是任何手续的守恒量。共性是「都跟数有关」这个话题。

### 2.4 同一结构的重复提出（3 条）——被判死时另有更强版本在别的文件里

`L2:construct-the-orthogonal-part-by-subtracting-projections`、`L2:expand-the-squared-norm-and-classify-the-cross-terms`、`L2:count-saturation-upgrades-a-necessary-condition-to-a-sufficient-one`

**详细实例：`L2:count-saturation-upgrades-a-necessary-condition-to-a-sufficient-one`（换名重装）。**
它的 members 里就有 `x:right-count-upgrades-one-basis-property-to-both`——X 层已有的不变量，「正确的计数把基的一个性质升级成两个」。L2 的 statement 是把它放宽成「某个量顶到已知上限时，两个待验条件塌成一条」。

删除测试：落地动作「拿到 d 个候选向量要判断是不是 d 维空间的基，只验无关性，不验张成」就是 member `d:thm-15-7b-n-independent-elements-form-a-basis`。第二实例是 member `d:15-10-n-orthogonal-nonzero-elements-form-a-basis`。第三实例是 member `strang:orthogonal-subspaces`。三个实例各自都已经是可迁移的断言；「饱和」这个词把它们收进一个袋子，没有产生第四个判断。

提案人自己写「若必须砍一个，砍它」——我同意，但不是因为他授权，而是删除测试给出同一结果。

## §3 三份提案说明里的循环论证与偷换概念

三份说明的整体质量不低——都做了 id 机器自查、都主动放弃了候选、都点了自己最不确定的一条。问题集中在论证形式上，四类。

### 3.1 循环：把「是结构而不是话题」当成判据，而它的定义就是结论

三份说明都用同一个小标题：「为什么它是结构而不是话题」。a 的说明开头把判据写成：

> 「判据是：拿掉话题词以后，这套动作还认得出来吗？」

这条判据只能筛掉最粗劣的分组，筛不掉伪抽象。以 b 的 C6 为例（`L2:checking-against-a-set-compresses-to-checking-against-a-count`）：拿掉「正交」，剩下「一个集合上的条件可以只在它张成的一组基上验」——动作确实还认得出来，判据通过。但它照样是伪抽象，因为这个动作**逐字就是它的 member** `d:orthogonality-to-a-set-equals-orthogonality-to-its-span`。

「动作认得出来」证明的是候选不是话题式分组；它不证明候选高于下层。三份说明都把前者当成了后者的证明，这是本轮辩护里最普遍的循环。

### 3.2 偷换：把「两侧表达不同」偷换成「抽象增益存在」

b 的说明反复用这个论证。C3（`L2:one-independent-constraint-costs-exactly-one-dimension`）：

> 「所以这个结构横跨两侧而两侧的表达完全不同，这是它有内容的证据。」

C6：「两侧的表达没有共同符号，压缩比却是同一个数，所以这是结构不是术语统一。」

跨教材识别是**审计 A 的维度**（members 归属是否真实、同名是否异物），不是抽象增益。两本书表达不同而背后是同一个数，这件事的价值在于确认对齐正确；它不回答「学习者比只看 members 多会做什么判断」。b 文件 8 个候选里有 7 个用了这个论证，而 b 的存活数是 0——这两件事有关。

### 3.3 偷换：用 boundary 的质量替换 abstraction_gain 的质量

b 的说明为 C8 辩护：

> 「我保留它是因为它的边界（Strang 亲自标出的列空间错误理由）提供了本轮最硬的一条反例，而这条反例不属于其他任何候选。」

反例硬不等于抽象增益成立。SPEC 要求两栏都合格，是合取不是择一。C8 的 boundary 确实是全 24 条里最硬的几条之一（见 §4），而它的 `abstraction_gain` 是「用任何化简手续前先写下它保的是哪个量」——空洞哲学。一栏优秀补不了另一栏空转。c 的说明为 C6 做的辩护是同一形式（「反例是我认为这条候选最硬的部分」）。

### 3.4 c 的 C5/C1 分工论证：切法自洽，但两条都不因此获得增益

c 的说明写：

> 「C1 说的是『唯一性那一半便宜』这个**格局**；C5 说的是驱动它的**引擎**……C1 若单独存在，会漏掉『同一台引擎跨越三个看起来无关的定理』这件事；C5 若单独存在，会漏掉『存在性的代价』这半边。」

这段论证的形式是「两条互补，故两条都该留」。但互补性只说明它们不重复彼此，不说明任一条高于自己的 members。删除测试对两条分别执行：C1 的格局断言由 `d:orthogonal-decomposition-uniqueness` 与 `d:finite-dimensionality-supplies-a-finite-orthonormal-basis` 并置即得；C5 的引擎断言由 `d:positivity-axiom-forbids-nonzero-self-orthogonal-elements` 与 `d:uniqueness-concludes-by-self-orthogonality` 逐字给出。两条各自塌缩，互补也救不了。

### 3.5 一处诚实的自我诊断，值得记录

a 的说明主动放弃了「对生成元成立即对整个张成成立」的升级定式，理由写得比我的判决更早也更准：

> 「它太短——整套动作只有一步，抽象增益基本只是『线性条件可以只在生成元上验』这一句。」

并且提示：若有人单独提出它并写出「哪些非线性条件不能升级」的完整反例族，那个版本更好。b 的 C6 正是把它单独提了出来——但没有提供那个反例族（C6 的三条 boundary 讲的是正交补命名、正交≠互补、无限维，都不是升级失败的反例）。a 的自我诊断预言了 b 的 C6 该死，这是三份说明之间唯一一次有效的交叉检验。

## §4 `boundary` 栏专项检查（逐个 24 条）

SPEC 要求 `boundary` 给出「看起来属于它但不属于」的**具体反例**。我把每条 boundary 的每个槽位归为三档：

- **真反例**：确实存在这么一个对象，外形像成员，而它不是成员（或它使结构失效）。
- **范围说明**：只是划定适用条件（「无限维时不成立」「前提不可省」），不指认任何冒充者。
- **误读防护**：纠正一句可能的错误读法，不涉及任何对象的归属。

判定标准：一条 boundary 至少要有一个**真反例**槽位才算合格；全是后两档 = 走过场 = 按任务书应计入死因。

### 逐条结果

| id（缩写） | 槽1 | 槽2 | 槽3 | 合格? |
| --- | --- | --- | --- | --- |
| a1 closure-certificate | 真反例（次数恰为 n 的多项式） | 范围说明（空集/非空前提不可省） | — | 合格 |
| a2 uniqueness-by-forcing | 真反例（内积不唯一：第三步无从下手） | **非反例**（自认「是真成员」） | — | 勉强合格 |
| a3 read-off-a-coefficient | 真反例（指数函数独立性：极限打项不是配对） | 范围说明（y_j = O） | 真反例（未规范化三角系读错系数） | 合格 |
| a4 independence-by-killing | 真反例（相依侧全部论证，结构相反） | 范围说明（第二步需非代数输入） | — | 合格 |
| a5 proof-inheritance | 真反例（复 C-S：宣布继承后必须补步） | 真反例（指数函数独立性搬不动） | — | 合格 |
| a6 construct-the-orthogonal-part | 真反例（S 垂是定义而非构造，对任意子集有定义） | 真反例（未规范化基代入使分解失效） | 范围说明（零方向元素靠约定补洞） | 合格 |
| a7 expand-the-squared-norm | 真反例（范数性质 (a)(b)(c)：同一定理内、无交叉项） | 范围说明（复情形先证为实） | — | 合格 |
| a8 finite-windows | 真反例（15.15/15.16/维数：同批词汇却过不了无限关；全体多项式空间） | — | — | 合格 |
| b1 two-sided-count-barrier | 范围说明（无限维时壁垒失效） | 误读防护（张成集可有 6 个元素） | — | **不合格** |
| b2 count-saturation | 真反例（R^3 两个 2 维平面：各自不超上限却不可能正交） | 范围说明（无限维无上限可饱和） | — | 合格 |
| b3 one-constraint-one-dimension | 真反例（相依的行不花钱） | 真反例（非齐次：y''=2 解集不是子空间） | **非反例**（出处声明：Apostol 没写这条式子） | 合格 |
| b4 basis-locks-the-count | 真反例（{i, j, i+j} 张成 V_2 但系数不唯一） | **是结构本身的兑现，不是反例**（换内积则几何全变） | 误读防护（换序不改变基） | 勉强合格 |
| b5 orthogonalization-as-counter | 真反例（照输出个数读会把 V_4 例读成 3，正确是 2） | 真反例（{O, x} 是正交集却相依） | 范围说明（无限维读出的不是全空间维数） | 合格 |
| b6 checking-compresses-to-count | 误读防护（「正交补」之名只对子空间） | 真反例（两个 2 维平面正交却不互补——但这是 b2 的反例复用） | 范围说明（L(S) 无限维时压不到有限条） | **勉强，且复用** |
| b7 best-approximation-size | 真反例（sin(pi t)：维数加一、项数加一、误差不降） | 误读防护（Parseval 要全空间正交规范基） | 范围说明（S 有限维为前提） | 合格 |
| b8 counts-survive-procedures | 真反例（A 与 R 有相同列空间是**假的**） | 真反例（正交化下「输出个数」不是守恒量） | 真反例（秩在相乘下不守恒） | **优秀** |
| c1 existence-costs-a-representation | 真反例（C(-1,1) 上 S = 全体多项式：唯一性成立、存在性失效） | 真反例（Strang 列相依时 x-hat 不唯一） | — | **优秀** |
| c2 orthogonality-as-certificate | 真反例（sup 范数最佳逼近：外形相同、正交判据无主词） | 真反例（只验部分生成元不够：两面墙） | — | **优秀** |
| c3 orthogonalizing-decouples | 真反例（e_1=(1,0), e_2=(1,1), x=(0,1)：套公式得 (1/2,1/2) ≠ x） | 范围说明（正交非规范时分母不能省） | — | **优秀** |
| c4 peel-off-the-projection | 真反例（15.13 例 1：y_3 = O，产出的不是新方向而是相依性证书） | 真反例（非正交方向逐个减投影，减完不正交） | — | **优秀** |
| c5 self-orthogonality-forces-zero | 真反例（两面墙：「看起来垂直」不能当前提） | 真反例（Minkowski 型配对：(1,1) 非零自正交，第三步崩塌） | — | **优秀** |
| c6 split-belongs-to-subspace | 真反例（不变性不能延伸到分量本身） | 范围说明（G-S 唯一性只到相差标量、且对固定输入序列） | — | 合格 |
| c7 orthogonal-splitting-additive | 真反例（(1,1) = (1,-1) + (0,2)：合法分解但 2 ≠ 2+4） | 误读防护（Parseval 要规范） | 误读防护（复情形共轭来自 Hermite 对称） | 合格 |
| c8 incremental-approximation | 真反例（单项式基下升维要全部重算） | 真反例（(f,phi_0)=(f,phi_2)=0 不等于饱和，(f,phi_3) ≠ 0） | — | **优秀** |

### 结论

**24 条里 23 条合格，1 条不合格。** 不合格的是 `L2:dimension-as-a-two-sided-count-barrier`：两个槽位一个是范围说明（无限维时整道壁垒失效），一个是误读防护（下限只说「不少于」n 个，`{O, i, -i, j, -j, i+j}` 张成 V_2 却有 6 个元素）。**没有任何一个对象被指认为「看起来属于它但不属于」。** 按任务书，这一条即便不因层塌缩死，也应因 boundary 走过场判 5。它实际已按层塌缩判死，此处作为独立理由记录。

另外三条勉强合格，各有一处槽位不是反例：

- `L2:uniqueness-by-forcing-the-difference-to-zero` 的「反例二」是 `apostol:orthogonal-sequence-unique-up-to-scalars`，而候选自己写「它确实跑完了三步，**是真成员**」——把一个真成员放进 boundary 栏。它想说的是「结论强度被误读」，属误读防护。该候选靠槽1（内积不唯一）保住合格。
- `L2:a-basis-locks-the-coordinate-count-not-the-geometry` 的「边界二」（换加权内积则范数、角度、正交全变）是**结构自身主张的兑现**，不是反例——结构说的就是「基锁不住几何」，举一个几何随内积改变的例子是在证明它，不是在划它的界。
- `L2:one-independent-constraint-costs-exactly-one-dimension` 的「边界三」是出处声明（Apostol 全章没有 dim S + dim S^perp = dim V），属审计 A 的防线，写在这里是好事，但不是本栏要的反例。

### 一个跨文件的观察

**boundary 质量与抽象增益完全不相关。** c 文件的 boundary 是三者最强（8 条里 6 条评为优秀，反例几乎全是可具体验算的对象，如 (1,1)=(1,-1)+(0,2)、e_2=(1,1) 代入公式得 (1/2,1/2)），而 c 的存活率只有 12.5%。b8 有全 24 条里最硬的一组反例（Strang 亲自标出的列空间错误理由），而它的 abstraction_gain 是纯空洞哲学。

原因是这两栏考的不是同一件事：写出一个好反例只需要**对本结构的边缘熟悉**，而抽象增益要求**结构本身高于成员**。一个把下层重新包装的候选完全可以对包装物的边缘了如指掌——事实上它比谁都清楚，因为它就住在那里。所以 boundary 栏是审计 A 的强力工具（它逼出量词与归属错误），但**不能**用作抽象增益的代理指标。这与提案人在 §3.3 里的辩护方式正好相反。

## §5 停止规则判断

**存活数：4。** SPEC 的天花板阈值是「某层存活 <2」，4 ≥ 2，**按字面 L2 不是天花板，L3 可以开工。**

但任务书要求我给出一句明确判断，并说若存活者彼此无法组合出更高结构就直说。我的判断是：

> **L2 勉强够格作为 L3 的地基，但只够支撑一个很窄的 L3，而且我不建议按「把四个存活者合成一个」的方式做。**

理由三条。

**（1）四个存活者不是同一族，强行合并必然产出空洞哲学。**

四条的形状：

| 存活者 | 它多给的那件事 | 形状 |
| --- | --- | --- |
| `L2:uniqueness-by-forcing-the-difference-to-zero` | 「找不到禁令 ⇒ 唯一性大概率为假」 | 成功侧与失败侧接成诊断律 |
| `L2:independence-by-killing-all-but-one-coefficient` | 「全部创造性劳动恰好在第二步，公理不供应它」 | 缺口定位 + 触发信号对照表 |
| `L2:testing-infinite-objects-through-finite-windows` | 「哪些结论能过无限关」的双栏划分 + 「有限窗口全通过推不出整体有限维」 | 量词位置的可证伪划分 |
| `L2:orthogonality-as-a-certificate-of-optimality` | 「我的距离是否由内积诱导」这个先行判断 + 否定时换什么刻画 | 判据的适用范围 |

我试着往上抽了一层，能写出来的最好版本是「第15章的可迁移内容都是把开放性任务压成有限清单，并指明清单外的缺口在哪」。把这句里的专有名词换掉——它对第10章的积分技巧、对任何一章都成立。按任务书的判定法，这是空洞哲学，我自己不会让它通过。所以四合一的 L3 我判定不可行。

**（2）唯一有真实合并前景的是一对，不是四个。**

`L2:uniqueness-by-forcing-the-difference-to-zero` 与 `L2:independence-by-killing-all-but-one-coefficient` 共享一个非平凡的形状，而且不是话题上的共享：

- 两者都把一个证明任务拆成「固定骨架 + 一处必须现场发明的零件」（前者是第三步的禁令，后者是第二步的打项运算）；
- 两者都给出**同一条反向动作**：那个零件找不到时，不是能力问题，而是待证命题大概率为假，应转去构造反例（前者转去构造两个不同的内积/张成集，后者转去找一条显式相依关系）。

这个「缺口的空缺本身是反例存在的证据」是可证伪的、非平凡的，并且**不是**任何单个 L2 的内容——它是两个 L2 并置后才出现的断言。它有资格做一个 L3 候选。

但请注意：**这将是一个只有 2 个 members 的 L3。** SPEC 的抽象层 schema 没写 members 下限，但一个 2 成员的抽象层是脆弱的，而且它离「把两个 L2 的共同点起个名字」很近——正是我这一轮杀掉 20 条时用的那把刀。我倾向认为它做出来会在 L3 的审计 B 手里勉强存活或勉强不存活，五成对五成。

**（3）另两个存活者上不去。**

`L2:testing-infinite-objects-through-finite-windows` 与 `L2:orthogonality-as-a-certificate-of-optimality` 与上述那对没有共同形状：前者讲量词摆在哪里，后者讲一个判据的适用范围条件。把它们与那对凑成一个 L3，只能靠「都是关于方法的适用范围」这种话题式共性——而它们本身是靠反对话题式分组才活下来的。

### 给 L3 代理的建议

若 L3 开工，我建议：

- **不要**要求 L3 覆盖全部 4 个存活者。指标改成「至少 1 个立得住的 L3」，而不是「L3 层要有 N 个候选」。凑数会直接复现本轮 20 条 KILL 的形态。
- L3 的产出者应当被明确告知：他手上只有 4 个 L2，其中只有 2 个形状相容。这个信息不给，他大概率会为了满足 members ≥ 3 而把不相容的三个塞进一个袋子。
- L3 的审计 B 应当把「members 数 ≥ 3」这条软规则与「不得为凑数纳入形状不相容的成员」显式排序，后者优先。

### 一条需要上报的结构性发现

**b 文件存活 0，不是产出者水平问题，是视角与 X 层系统性撞车。** b 的视角是「同一个守恒量/计数量」，而 `x:` 命名空间本身就是「跨教材对齐的不变量」层——守恒量正是不变量。b 的 8 个候选里 7 个含 `x:` 成员，其中至少 3 处那个 `x:` 节点几乎就是候选的主断言（`x:right-count-upgrades-one-basis-property-to-both` 对 b2、`x:orthogonality-to-a-whole-set` 对 b6、`x:dimension-versus-rank` 对 b8）。b 的产出者在 C2 的自述里察觉到了这一点（「我第一版草稿几乎就是把那个 X 节点的 statement 换成中文重写」），但采取的补救是把主张放宽得更抽象——这恰好加重了空洞化。

**建议：若后续实验仍设 L2 层，「守恒量/不变量」这个视角不应再单独分配给一名 L2 产出者，因为 X 层已经占据了它。** 这不是本轮任何一个候选的缺陷，是分工设计的重叠。

## §6 三个提案文件之间的重叠

a/b/c 是三名独立产出者做的，确实撞出了同一个结构。我先用机器算出全部跨文件成员交集（Jaccard 与共享成员数），再对高重叠对逐个判断是否「其实是同一个结构」。

### 机器测量：跨文件成员重叠（共享 ≥ 3 个成员的全部配对）

| Jaccard | 共享 | 配对 |
| --- | --- | --- |
| 0.389 | 7 | a `L2:expand-the-squared-norm-and-classify-the-cross-terms` ↔ c `L2:orthogonal-splitting-makes-the-norm-additive` |
| 0.333 | 6 | a `L2:construct-the-orthogonal-part-by-subtracting-projections` ↔ c `L2:peel-off-the-projection-to-manufacture-a-new-direction` |
| 0.312 | 5 | a `L2:read-off-a-coefficient-by-one-pairing` ↔ c `L2:orthogonalizing-first-decouples-the-coefficients` |
| 0.286 | 4 | b `L2:the-size-of-the-best-approximation-is-fixed-by-the-subspace-dimension` ↔ c `L2:orthonormal-systems-make-approximation-incremental` |
| 0.238 | 5 | a `L2:uniqueness-by-forcing-the-difference-to-zero` ↔ c `L2:self-orthogonality-forces-zero-the-uniqueness-engine` |
| 0.200 | 4 | a `L2:uniqueness-by-forcing-the-difference-to-zero` ↔ b `L2:a-basis-locks-the-coordinate-count-not-the-geometry` |

### 判定：四对是同一个结构

**（1）同一结构，且 c 版是 a 版的窄化。**
`L2:expand-the-squared-norm-and-classify-the-cross-terms`（a）↔ `L2:orthogonal-splitting-makes-the-norm-additive`（c）
c 的 10 个成员里 7 个在 a 里。两者的动作逐字相同（平方、双线性展开、看交叉项）；差别只是 a 保留了交叉项的三种归宿，c 只处理「归零」这一种并把它写成加法记账。**c 是 a 的真子集加一个反向检验。** 两条都已判死，此处仅记录重复。

**（2）同一结构，只是描述规模不同。**
`L2:construct-the-orthogonal-part-by-subtracting-projections`（a）↔ `L2:peel-off-the-projection-to-manufacture-a-new-direction`（c）
共享 6 个成员，含两条核心：`apostol:gram-schmidt-process` 与 `d:gram-schmidt-inductive-step-defines-y-r-plus-one`。a 说「减投影、配对验证、升级到张成」，c 说「取当前对象减去在已处理方向上的投影，余量与那些方向正交」。**这是同一个动作的两次陈述**，c 额外强调了「局部递推故不受维数限制」（该点已由 a 的有限窗口候选覆盖）。两条都已判死。

**（3）同一机制，一者叫「读出」一者叫「解耦」。**
`L2:read-off-a-coefficient-by-one-pairing`（a）↔ `L2:orthogonalizing-first-decouples-the-coefficients`（c）
共享 5 个成员，含 `apostol:theorem-15-11-components-relative-to-an-orthogonal-basis`、`d:orthogonal-basis-component-formula`、`d:15-11-proof-pair-with-basis-element`——即两者的全部计算内核。a 的框架是「一次配对把和式压成一项」，c 的框架是「正交性让系数间的耦合消失」。**这是同一件事的两种措辞**：和式塌成一项 ⟺ 系数解耦。c 多带了 Strang 的 A^T A 非对角元作为耦合侧的对照。两条都已判死。

**（4）同一台引擎，c 版是 a 版的真子集。**
`L2:uniqueness-by-forcing-the-difference-to-zero`（a）↔ `L2:self-orthogonality-forces-zero-the-uniqueness-engine`（c）
**这一对最值得点名，因为其中一条活了。** 共享 5 个成员，全部是唯一性论证的收尾步骤（`d:uniqueness-concludes-by-self-orthogonality`、`d:the-difference-lies-in-both-s-and-s-perp`、`d:z-r-is-orthogonal-to-itself`、`d:uniqueness-splits-the-competitor-into-span-plus-multiple`、`d:zero-is-the-only-element-orthogonal-to-itself`）。

两者都是「设两个、相减、逼出差为零」。差别在第三步：a 把第三步当作一个**可换的零件**并列出三种（消去律、独立性、自正交），c 把第三步**钉死在自正交这一种**上。所以 c 是 a 的真子集——覆盖 15.13/15.14 而不覆盖 15.04/15.08。

我保留 a 版、杀掉 c 版，理由不是先到先得，而是：a 版的增益（找不到禁令则转去找反例）需要**第三步可换**这个事实才成立——只有见过三种不同的禁令，才能形成「去清单里挑一条、挑不出就是命题假」这个动作。c 版把第三步固定成一种，它的增益就退化为「这条唯一性挂在公理 4 上」，而这句话逐字写在它自己的成员 `d:positivity-axiom-forbids-nonzero-self-orthogonal-elements` 里。**同一个结构，抽象得更窄的那一版反而塌缩了。**

### 一对判为不是同一结构

`L2:uniqueness-by-forcing-the-difference-to-zero`（a）↔ `L2:a-basis-locks-the-coordinate-count-not-the-geometry`（b）
共享 4 个成员，但共享的是分量唯一性这一族（`apostol:uniqueness-of-components` 及其两个证明步骤 + `x:unique-coordinates-in-a-basis`）。a 用它当「三步动作」的一个实例，b 用它当「锁住的只有个数」的证据。**两者对同一批成员做的是不同断言**，不是同一结构。（b 那条仍因塌缩判死，与本项无关。）

### 一对判为相邻而非相同

`L2:the-size-of-the-best-approximation-is-fixed-by-the-subspace-dimension`（b）↔ `L2:orthonormal-systems-make-approximation-incremental`（c）共享 4 个成员，都是 Apostol 的两个逼近例子。b 说「dim S 定死项数」，c 说「加一维不动旧系数」。两者都引用了同一个 sin(pi t) 现象，但 b 用它当**反例**（加一维、项数加一、误差不降），c 用它当**正面兑现**（配对为零故该维无贡献）——同一现象被一个当边界、被另一个当实例。这是三个文件之间最有意思的一处交叉，但不构成同一结构。

### 重叠总评

**24 个候选里有 8 个卷入 4 组「同一结构」配对，占三分之一。** 三名产出者的视角声明分别是「同一验证套路」「同一守恒量」「同一分解/最优性原理」，看起来正交，但落到第15章这个具体材料上，Gram-Schmidt、勾股展开、分量公式这三块料谁都绕不开，于是从三个方向各被抽了一遍。

这提示：**L2 层的视角分工若按「抽象的动机」切分，而材料本身只有那么几块，重复是必然的。** 按材料切分会更干净，代价是丧失独立交叉验证。本轮的重复也产出了一个副产品——上述第（4）对证明了「同一结构抽得更窄反而会塌缩」，这个证据在单个文件内看不到。

## §7 不确定项

**（1）我的门槛可能偏严，最脆弱的一条是「一步并置不算增益」。**
被杀的 20 条里有 6 条死在这条上（§2.2）。反对意见是合理的：教学上，把两个分散在不同小节的事实**明确并置并命名**，确实能让学习者少走一段弯路。我坚持杀掉它们，是因为任务书要求 KEEP 必须说出一个「学习者原本做不出」的判断，而并置型候选我每次都能构造出一条从 members 出发的一两行推导路径。但我承认这条界线在「一步」与「两步」之间，而不在「有」与「无」之间。**若上级认为并置本身值得保留，最该复活的三条是：`L2:a-basis-locks-the-coordinate-count-not-the-geometry`、`L2:orthogonal-splitting-makes-the-norm-additive`、`L2:orthogonalizing-first-decouples-the-coefficients`**——它们的并置对象跨度最大、误用后果最实际。

**（2）我判 KEEP 的四条里，`L2:testing-infinite-objects-through-finite-windows` 最可能被推翻。**
它的核心增益是那份「能过无限关 / 不能过无限关」的双栏划分。反对意见：这份划分的每一栏项目都可以逐个从对应成员读出（`d:gram-schmidt-works-in-infinite-dimensional-spaces` 说 G-S 能过、`d:finite-dimensionality-supplies-a-finite-orthonormal-basis` 说分解不能过），所以它可能只是一次「把成员按能过/不能过分成两堆」的整理。我最终留它，是因为「每个有限窗口都通过推不出整体有限维」这条**禁令**不在任何成员里，而它正是划分的分界线所在。但若审计上级不接受这条禁令的独立性，这条应当也死，那样存活数降到 3。

**（3）`L2:orthogonality-as-a-certificate-of-optimality` 的 KEEP 依赖一个本章外的反例。**
它活下来靠的是「sup 范数不由内积诱导 ⇒ 正交判据无主词 ⇒ 换等振荡刻画」这个判断。等振荡/Chebyshev 定理不在本实验材料内，提案人自己也标了 origin: model。我认为这**加强**而非削弱它的抽象增益（可迁移性的定义就是能走到材料之外），但如果本实验的规矩是「增益必须能在材料内兑现」，这条会变成不可核验。请上级确认口径。

**（4）我没有对 `members` 归属做任何独立核对。**
按分工这属审计 A，但它对我的判决有一处实质影响：我的删除测试是「学习者手里剩下全部 members」，若某个 members 列表里含有并不真正属于该结构的成员，我的删除测试会因为多给了学习者材料而**偏向 KILL**。我在四类 KILL 里引用的关键成员（如 `d:dimension-theory-uses-no-metric-notions`、`d:projection-does-not-depend-on-the-chosen-orthonormal-basis`）归属都明显合理，所以我认为这个偏差没有改变任何一条判决，但无法排除。

**（5）我未审的东西。**
`data/` 三个文件的 24 个候选全部审完，无遗漏。我未读、也未使用：`report/audit-L2-A*`（按禁令）、`report/` 下其他 audit-* 文件（按禁令）、`data/ID-MANIFEST.md`、`data/inherited/` 下的 L1 数据、以及全部 `15.*.md` 原文。这意味着**我对成员内容的判断完全依据候选文件与提案说明里对成员的描述**（成员 id 的语义 + statement/boundary 里对它们的引述）。这是本报告最大的方法论限制：若某个 d 节点的实际内容比其 id 与引述所示更窄，我可能高估了它、从而误杀了挂在它上面的 L2。受此影响最大的是 §2.1 的九条单成员塌缩判决。

## §8 自查：id 是否逐字复制

`report/audit-L2-B-verdicts.jsonl` 的全部 24 个 id 均由输入文件复制，未手打。写完后做了机器核对（Python 读取三个 `data/structures-L2-*.jsonl` 与本文件，逐位置比对）：

```
src count 24  verdict count 24
EXACT ORDER MATCH: True
missing: []   extra: []
```

- 数量一致：24 = 8 + 8 + 8。
- **顺序**一致：a 全部 8 条、然后 b 全部 8 条、然后 c 全部 8 条，与输入文件行序逐位置相同。
- 无缺失、无多余、无拼写差异（逐字符相等，非名字匹配）。
- `verdict` 取值仅 KEEP / KILL；`cause` 取值仅 {0, 5}，且 KEEP↔0、KILL↔5 一一对应，无错配。

另外，本报告正文里出现的候选 id 也全部来自复制。§4 的表格为了排版用了缩写（a1/b8/c3 等），但那一节的每个缩写在 §1/§2/§6 中都有对应的完整 id；判决文件里不存在任何缩写。









