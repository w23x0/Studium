# 审计 B 报告:D 层是否构成真实下延

审计对象:`data/nodes-D2.jsonl`(94)、`nodes-D3.jsonl`(73)、`nodes-D4.jsonl`(63),共 230 个节点,分属 77 个 parent。
判决依据只有一条:**删除测试**——把该子节点删掉,学习者从 parent 出发能不能自己想出来。能 → KILL(死因 5,伪抽象/层级塌缩);不能且给出可迁移的具体判断 → KEEP。数学正确性、锚点逐字性、量词错误属审计 A,本报告只在末节顺带记录。
逐节点判决见 `report/audit-B-verdicts.jsonl`(230 行,id 逐字回抄,由脚本校验 id 必须是三个 D 文件中的成员,无假杀风险)。

## 1 判决计数

| verdict | 数量 | 占比 |
|---|---|---|
| KEEP | 198 | 86.1% |
| KILL | 28 | 12.2% |
| FIX | 4 | 1.7% |

## 2 三棵子树的存活率

| 子树 | 覆盖节 | 节点数 | KEEP | KILL | FIX | 存活率 |
|---|---|---|---|---|---|---|
| D2 | 15.06 / 15.07 / 15.08 | 94 | 79 | 14 | 1 | **84.0%** |
| D3 | 15.10 / 15.11 | 73 | 67 | 5 | 1 | **91.8%** |
| D4 | 15.13 / 15.14 / 15.15(+15.08/10/11 少量) | 63 | 52 | 9 | 2 | **82.5%** |

## 3 被杀节点按类型分类

### 3.1 同义改写 / parent 语句切片(15 个)

statement 与 parent 的 statement 或 parent 锚点逐字重合,附加语与被重复的那句同义。

- `d:approximation-problem-is-to-minimize-the-distance`
- `d:unitary-space-alias`
- `d:dependence-terminology-transferred-from-sets-to-elements`
- `d:span-is-the-set-of-all-finite-linear-combinations`
- `d:infinite-dimensional-defined-as-the-residual-case`
- `d:independence-defined-as-negation-of-dependence`
- `d:minimal-spanning-set-question`
- `d:fourier-coefficients-are-inner-products-with-the-orthonormal-system`
- `d:legendre-sequence-orthogonalizes-the-monomials`
- `d:each-gram-schmidt-step-subtracts-projections`
- `d:theorem-15-14-is-a-corollary-not-a-new-proof`
- `d:vanishing-new-element-exhibits-a-dependence`
- `d:exponential-nonvanishing-used-for-reversibility`
- `d:orthogonal-to-a-set-means-orthogonal-to-every-member`
- `d:parseval-attribution-note`(史注型附加物,既不拆解公式也不给判断)

其中最典型的三个:`d:unitary-space-alias`(parent 锚点已逐字含 "the term unitary space is also used",子节点只把这半句摘出来)、`d:approximation-problem-is-to-minimize-the-distance`(连「有限维」这一限定都与 parent 相同)、`d:fourier-coefficients-are-inner-products-with-the-orthonormal-system`(自认 "nothing but the coefficients supplied by the projection formula")。

### 3.2 兄弟 / 近邻冗余(7 个)

同一断言在图中出现两次,保留信息量更大的一个。

| 被杀 | 保留 |
|---|---|
| `d:zero-is-the-only-self-orthogonal-element` | `d:zero-is-the-only-element-orthogonal-to-itself`(同锚点同 name_zh;后者带子节点承担正定性依据,并指明 15.13(c)、15.15 两处承重使用点) |
| `d:norm-is-the-metric-concept-of-length` | `d:metric-properties-motivate-the-inner-product`(给出 内积→范数→角 的完整依赖次序) |
| `d:norm-depends-on-choice-of-inner-product` | `d:theorem-15-9-holds-for-every-inner-product` |
| `d:components-are-the-coefficient-tuple-of-the-expansion` | `d:components-depend-on-the-ordering-not-only-on-the-basis` |
| `d:dependence-existential-quantifier` | `d:dependence-witness-must-be-exhibited-not-merely-counted` |
| `d:infinite-dimensional-example-space-of-all-polynomials` | `d:infinite-dimensional-operational-criterion-no-finite-spanning-set` |
| `d:explicit-gram-schmidt-formulas-for-an-independent-input` | `d:zero-earlier-element-makes-the-coefficient-irrelevant`(含实际的分情形处理) |

### 3.3 证明的语法切分(6 个)

把证明的开场句或收束句单独切成节点,内容是全称实例化、逆否重述或「公理都验过了所以结论成立」,不含任何 parent 之外的判断。这是本次审计发现的第二类系统性塌缩,值得单列。

- `d:uniqueness-of-components-assume-two-representations`
- `d:thm-15-6-setup-two-bases-with-counts-k-and-m`
- `d:exponential-independence-arbitrary-vanishing-relation-is-the-starting-point`
- `d:thm-15-4-necessity-direction`(把 iff 按语法切成两半,而其中一半无增量)
- `d:thm-15-4-conclusion-s-is-a-subspace`
- `d:independent-input-forces-nonzero-output`(节点自己的 atomic_reason 承认它只是上一节点的逆否)

对照:同样是「拆证明步骤」,定理 15.6、15.10、15.11、15.13 的其余步骤节点全部 KEEP,因为它们各自给出了被文字掩盖的依据(哪条公理被消耗、哪个假设在此处被花掉、哪一步是分析性而非代数性的)。可切分的证明步骤本身不是问题,**只切语法不切依据**才是。

### 3.4 复合伪原子 / 需要修而不是杀(FIX,4 个)

**(a) atomic 标记名不副实(1 个)**

- `d:angle-requires-nonzero-elements`:内容有增量,但 `atomic:true` 错误——「非零(分母有定义)」与「区间 [0, pi](解唯一)」是两条互相独立、依据不同的可验证命题(前者靠 15.9(b) 正定性,后者靠 cos 在 [0, pi] 上单射),应拆成两个原子节点。

**(b) 伪下延但身为挂载枢纽,不能直接删(3 个)**

- `d:exponential-independence-proof-is-induction-on-n`:statement 是 parent 的真子集(parent 已写 "induction on n, multiplying by e^{-a_M x} and letting x tend to infinity"),但它挂着 7 个证明步骤子节点。修法:改写为真正的架构说明(基例 → 选最大指数 → 归一化 → 极限杀掉一项 → 降阶),或并入 parent 并把 7 个子节点改挂 parent。
- `d:orthogonal-decomposition-existence`:statement 是 parent 存在性一句的重述,真正的增量(四项互相独立的验证义务)只写在 `atomic_reason` 里。挂 5 个子节点。
- `d:approximation-inequality-with-equality-only-at-the-projection`:statement 与 parent 陈述重合,增量同样只在 `atomic_reason`(勾股拆分 + 非负项判零两步)。挂 4 个子节点。

这三个是同一个可复现的失败模式:**真实的架构判断被写进了 `atomic_reason` 而不是 `statement`**,于是节点对外看起来像 parent 的复述。修法一致:把 `atomic_reason` 里的分解结构提进 `statement`。

## 4 空洞(不出判决,仅登记)

### 4.1 整片未覆盖的节

三棵 D 子树合起来只覆盖 **15.06、15.07、15.08、15.10、15.11、15.13、15.14、15.15**。完全没有 D 层的有:15.02–15.05(线性空间公理、零元、负元、定理 15.1/15.2/15.3)、15.09、15.12、15.16–15.18(三个逼近应用例)。对应地,L1 层有 **34 个 apostol 节点没有任何 D 子节点**,其中成片缺失的是:

- 公理与基本性质:`apostol:axioms-for-addition`、`axioms-for-multiplication-by-numbers`、`closure-axioms`、`zero-element`、`negative-of-an-element`、`theorem-uniqueness-of-zero-element`、`theorem-uniqueness-of-negatives`、`theorem-elementary-algebraic-properties`
- 具体空间实例:`v-n-space`、`function-space`、`space-of-continuous-functions`、`polynomials-of-degree-at-most-n`、`polynomials-of-degree-exactly-n`、`homogeneous-de-solution-space`、`trigonometric-polynomial`
- 逼近应用:`best-approximation-in-a-finite-dimensional-subspace`、`best-linear-approximation-to-sine`、`legendre-polynomial-approximation`、`trigonometric-polynomial-approximation`
- 记号类:`dim-notation`、`inner-product-notation`、`norm-notation`、`s-perp-notation`、`linear-span-notation-l-of-s`、`negative-and-difference-notation`
- 另有两条被别处反复引用却无下延:`apostol:dependence-inherited-by-supersets`(定理 15.6 的证明明确要用它)、`apostol:zero-element-forces-dependence`(定理 15.10 非零假设的必要性要用它)

### 4.2 判决后剩空的 parent

- `apostol:complex-euclidean-space`:唯一子节点被杀 → 该 parent 在 D 层归零。复情形真正需要的内容(哪些结论必须按复的读、共轭出现在哪)现在散挂在 `d:euclidean-space-unqualified-covers-real-and-complex` 与 `d:self-inner-product-is-real-in-complex-case` 上。
- `apostol:vanishing-orthogonalized-element-detects-dependence`:两个子节点全部被杀(一个重述 parent 首句,一个重述其逆否)→ 该 parent 在 D 层归零。缺的是这条判据与 Legendre 例、与相依集定义之间的实际使用链。
- `apostol:theorem-15-16-approximation-theorem`:唯一子节点判 FIX,真内容全在孙层 4 个节点 → 中间层空转。
- 杀掉 `d:explicit-gram-schmidt-formulas-for-an-independent-input` 后,公式 (15.15) 的显式形式在图中失去承载;应在 parent 或 `d:gram-schmidt-inductive-step-defines-y-r-plus-one` 里补一句。

### 4.3 结构标记与图不一致

- `d:cauchy-schwarz-proof-inherited-from-theorem-12-3` 标 `atomic:false` 却没有子节点——已宣告未偿付的下延。缺的是「定理 12.2 所列的哪几条性质被实际用到」。
- **7 个节点标 `atomic:true` 却有子节点**:`d:thm-15-4-remaining-obligations-zero-and-negative`(2)、`d:exponential-independence-multiply-by-a-normalizing-exponential`(2)、`d:thm-15-7b-n-independent-elements-form-a-basis`(1)、`d:inner-product-homogeneity-axiom`(1)、`d:hermitian-symmetry-axiom`(1)、`d:orthogonal-basis-component-formula`(1)、`d:orthonormal-basis-component-is-the-inner-product`(1)。前两个是真正的 atomic 标记错误(子节点确实是它的分解部件);后五个是 parent 边被当作「推论/特例化」边用,而非分解边——这是 SPEC 里 `parent` 语义未定死造成的,建议在 SPEC 中明确 parent 边是否只表示分解。

## 5 最高与最低质量子树

**最高:D3(15.10 / 15.11),存活率 91.8%。** 它的节点几乎全部落在同一种模式上:给出一条被教材省略或一句带过的**依据、失效模式或强弱对照**。例如 `d:norm-positivity-property` 列出正定性退化为半正定时连带失效的三处(以范数刻画 O、夹角公式分母、(15.8) 分母);`d:cross-term-sum-is-real` 说明不先确认交叉项为实就无法谈不等式,并由此指出实、复两个证明合为一个;`d:15-11-denominator-nonzero-by-positivity` 补出教材完全没写的两环链条。这些都通不过「从 parent 自己能想出来」的测试,因此几乎无可杀。

**最低:D4(15.13 / 15.14 / 15.15),存活率 82.5%,且 4 个 FIX 中有 2 个在这里。** 两个原因:一是它处理的是长证明,于是出现了「把定理的两半各切一个节点」这种只切语法的中间层(`orthogonal-decomposition-existence`、`approximation-inequality-...`、`orthogonalization-conclusion-a/b` 都属这一族,后两个因为带真实的强度对照而勉强 KEEP);二是它离 parent 最近的那一层反复重述 parent(`theorem-15-14-is-a-corollary`、`each-gram-schmidt-step-subtracts-projections`、`vanishing-new-element-exhibits-a-dependence`、`independent-input-forces-nonzero-output`)。有意思的是 D4 的**孙层**质量很高——`d:strict-minimality-rests-on-positivity-of-the-norm`、`d:orthogonality-to-generators-extends-to-their-span`、`d:zero-earlier-element-makes-the-coefficient-irrelevant`(解释了定理 15.13 为何不需要对 x 序列加独立性假设)都是硬内容。所以 D4 的问题不是缺深度,而是**多了一层空转的中间节点**。

D2(84.0%)的失分集中在定义型 parent 上:`linear-span`、`independent-set`、`infinite-dimensional-space`、`spanning-set`、`components-relative-to-ordered-basis` 这几处都出现了「把定义句摘出来重说」的子节点。相比之下 D2 里定理型 parent(15.4、15.5、15.6、15.7)的子树质量与 D3 相当。

## 6 顺带记录(属审计 A 范围,未作为本报告的判决依据)

- `anchors` 为空数组:`d:exponential-independence-uses-no-inner-product`、`d:exponential-nonvanishing-used-for-reversibility`、`d:adjoining-an-element-outside-the-span-preserves-independence`、`d:thm-15-7b-argument-adjoining-an-outside-element-breaks-the-count`。后两个是内容上很有价值的补洞节点,补锚点比删更合适。
- 在 `atomic_reason` 中自陈 `origin: model` 的:`d:vanishing-projection-terms-in-the-legendre-computation`、`d:s-perp-closure-follows-from-linearity-in-the-first-argument`、`d:orthogonality-to-a-set-equals-orthogonality-to-its-span`、`d:projection-does-not-depend-on-the-chosen-orthonormal-basis`、`d:normalized-element-has-norm-one`、`d:rescaling-preserves-orthogonality`。声明是诚实的,但 SPEC 要求 `origin` 是独立字段而非写在 reason 里。
- 跨 parent 的内容重叠(未按兄弟冗余处理,因为判决范围限定在同一 parent 下):`d:orthogonality-to-the-basis-extends-to-all-of-s` 与 `d:orthogonality-to-generators-extends-to-their-span` 是同一条张成推广桥的两次实现;`d:orthogonality-to-a-set-equals-orthogonality-to-its-span` 是第三次。合并时应保留一条通用引理,其余改为引用。
- `d:equality-holds-exactly-when-t-equals-s` 与其 parent `d:approximation-inequality-with-equality-only-at-the-projection` 的 `name_zh` 讲的是同一件事,虽然内容有增量(给出了由等式转不等式并钉住等号的机制),建议改名以免看起来像塌缩。
