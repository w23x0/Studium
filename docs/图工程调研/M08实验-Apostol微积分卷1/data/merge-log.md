# M08 消歧合并日志(nodes-G1..G4 → nodes-merged.jsonl)

- 日期:2026-07-26
- 输入:nodes-G1.jsonl(36,§10.1–10.10)、nodes-G2.jsonl(16,§10.11–10.16)、nodes-G3.jsonl(18,§10.17–10.21)、nodes-G4.jsonl(12,§10.23–10.24)
- 合并前总数:82;合并后总数:81(执行 1 次合并)
- 全部节点 id 无跨组冲突(82 个 id 互不相同);四组按章节切分,天然交叠极少。合并后所有节点 `status` 统一置为 `"merged"`(表示已通过消歧合并阶段;`origin` 字段保持原值)。

## 一、执行的合并

### M-1:`harmonic-partial-sum-asymptotic` 并入 `euler-constant`(均来自 G3)

- **保留 id**:`euler-constant`(概念对象"欧拉常数"是更规范的命名实体;被并节点标题为公式别名)。
- **理由(定义等价)**:`euler-constant` 的定义同时给出 (10.49) $\lim_n(\sum_{k\le n}1/k-\log n)=C$ 与其改写 (10.50) $\sum_{k\le n}1/k=\log n+C+o(1)$;而 `harmonic-partial-sum-asymptotic` 的全部内容恰是公式 (10.50) 及其推论 $\sum_{k\le n}1/k\sim\log n$。原书中 (10.50) 只是 (10.49) 的等价改写("This equation can also be written as"),二者描述同一对象,属抽取时把一个对象拆成了两个节点。
- **操作**:definitions 取两者并集(保留两条,信息最完整);aliases 合并为 `["C", "$\gamma$", "formula (10.50)", "harmonic partial sums asymptotically equal to log n"]`;anchors 合并去重(2→4 条,含 10.20.md 中"重排级数求和用到该渐近关系"的锚点);sections 合并为 `["10.17","10.21"]`。

## 二、审查后判定"相关但不同、不予合并"的候选对

以下各对经逐条比对定义与锚点,判定为**不同对象**,保留为独立节点(应由后续建边阶段建立对照/类比边):

1. **级数判别法 vs 瑕积分判别法(G2 vs G4,系统性类比,共 4 对)**
   - `comparison-test`(定理 10.8)vs `comparison-test-for-improper-integrals`(定理 10.24)
   - `limit-comparison-test`(定理 10.9)vs `limit-comparison-test-for-improper-integrals`(定理 10.25)
   - `bounded-partial-sums-criterion`(定理 10.7)vs `boundedness-criterion-for-improper-integrals`(定理 10.23)
   - `dominates`(级数的优超)vs `dominated-integral`(积分的优超)
   - 理由:原书对级数与瑕积分平行地各自陈述定理并各自定义"dominates"术语,对象不同(∑aₙ vs ∫f),类似题目给出的 convergence-of-sequence / convergence-of-series 范例——互为对照,绝不合并。
2. **`partial-sum`(第 n 部分和)vs `partial-integral`(部分积分)**:后者是原书明确的类比("play the role of the partial sums"),对象不同,仅建对照。
3. **`infinite-sequence` vs `infinite-series`,及 `convergent-sequence`/`divergent-sequence` vs `convergent-series`/`divergent-series`**:序列与级数是不同对象(级数被定义为部分和序列,但概念层级不同),按任务红线保持分立。
4. **`integral-comparison-estimate`(§10.1 的方法,origin=model)vs `integral-test`(定理 10.11,Cauchy 积分判别法)**:前者是用积分估计部分和大小的技巧(导出不等式 10.8),后者是敛散性判别定理;思想同源(定理 10.11 的证明依赖同类不等式),但一为非正式方法、一为编号定理,陈述与用途均不同。保留两者,建议建"形式化为/证明依据"边。
5. **`euler-constant` 相关**:`harmonic-series`(G1)与合并后的 `euler-constant` 不合并——前者是级数对象本身,后者是其部分和渐近行为定义的常数。
6. **`asymptotically-equal`(概念)vs `asymptotic-equality-notation`(记号 $a_n\sim b_n$)**:全部四组的抽取模式均把 notation 与 concept 分立(如 `sequence-notation`、`series-sum-notation`、`positive-negative-part-notation`),为保持模式一致不合并。
7. **`alternating-harmonic-series`(G3)vs `logarithmic-series`(G1,Mercator 级数)**:前者是数值级数 ∑(−1)^{n−1}/n(和为 log 2),后者是幂级数 log(1+x) 的展开;前者仅是后者在 x=1 处的取值,对象不同。
8. **`geometric-series`(G1)vs `geometric-exponential-partial-sum-bound`(G3,定理 10.19)**:后者是 |x|=1 时几何级数部分和的恒等式与界,是关于前者的一条定理,不是同一对象。
9. **`harmonic-series`(G1)vs `riemann-zeta-function`(G2)**:调和级数只是 ζ(s) 在 s=1 的发散特例,不合并。
10. **`improper-integral`(总称)vs `infinite-integral`(第一类)vs `improper-integral-second-kind`(第二类)**:总称与两个子类粒度不同,保持三节点。
11. **`absolutely-convergent-series`/`conditionally-convergent-series`(定义)vs `absolute-convergence-implies-convergence`(定理 10.15)**:概念与定理分立。
12. **`positive-negative-part-notation`(记号 10.59)vs `positive-negative-parts-theorem`(定理 10.21)**:记号与定理分立。

## 三、其他说明

- 未发现跨组"同名不同 id"或"别名互指"的真重复:四个抽取组的章节切分(10.1–10.10 / 10.11–10.16 / 10.17–10.21 / 10.23–10.24)互不重叠,跨节引用(如 G2 的 ζ 函数提及调和级数)均以引用形式出现,未产生重复节点。
- 类型不一致备注(未改动,留给质检阶段):`raabe-test`、`gauss-test` 被 G2 标为 `method`,而其余判别法均为 `theorem`(二者出自习题,G2 的选择可辩护);`harmonic-partial-sum-asymptotic` 原为 `notation`,并入 `concept` 节点 `euler-constant` 后该类型标签消失。
