# 缺口装配片 C5-04（15.13–15.16）

已回查原文小节：15.13 §〇/§一/§二，15.14 §〇/§二/§四，15.15 §〇/§二/§五，15.16 §〇/§二。id、行号、字符数照抄原文实测值，长 LaTeX 逐字文本不复制（执行时按提案原文对应小节取）。

## 主体

1. **15.15 §〇** → 任务书前提「15.15 例 2（Legendre）完全没有对应节点」不成立：例 2 有两个节点 `apostol:legendre-polynomial-approximation`（`data/nodes-A2-s3.jsonl:6`，method，3 锚点 8 出边）、`apostol:best-linear-approximation-to-sine`（`:7`，concept，3 锚点 3 出边） → **采纳，须先于其他动作** → file=15.15.md 的 31 条锚点占 6 条、56 条边作 src 占 11 条，不撤回会重复建节点。

2. **15.13 A1** → 新建 `apostol:ex-gram-schmidt-in-v4-detects-a-dependence`（example，sections 15.13，part-of `apostol:gram-schmidt-process`），覆盖 E13/E14/E15/S56/S57/E16，锚点 L114=156、L117=156、L111=181 字符 → **采纳** → 掩码 0 的六单元含「x₁,x₂ 独立」与「dim=2」两个无归属断言，退化为 FIX 会丢这两条。

3. **15.13 A2** → 新建 `apostol:legendre-first-six-orthogonalized-polynomials`（parent `apostol:legendre-polynomials`），锚点 L147=181、L141=177 字符 → **改后采纳** → 提案自陈 y₃–y₅ 三式「未独立重算」，须补数值复核再入 SPEC。

4. **15.13 A3** → 新建 `apostol:normalized-legendre-first-six-explicitly`，锚点 L165=166、L169=95 字符 → **改后采纳，取其退化方案**：两锚点补给 `apostol:normalized-legendre-polynomials`，不建节点 → 提案自评有死因 5 风险（可由 parent 的 φₙ=yₙ/‖yₙ‖ 加 A2 机械导出），且 L165 整行 246 字符超 200 界、覆不到 φ₀–φ₃。

5. **15.16 2.3** → 新建 `apostol:cx-exponential-weight-produces-a-laguerre-family`（concept，sections 15.16），锚点 `15.16-exercises.md:47`=56、`:67`=116 字符，加边 `applies-to`→`apostol:weighted-integral-inner-product`、`contrasts`→`apostol:cx-legendre-family-changes-with-the-interval` → **采纳，须并入`丢弃与未覆盖清单.md` §一 第 5 题下** → `grep -ic laguerre` 四表皆 0、六对内积验算全为 0，对应由数学钉住而非 OCR 题干；它是部分回收不是新缺口。

6. **15.13 FIX 1**（死因 6，本片最严重之一） → 公式 15.15 本体（E11, L80）全图零锚点零边证据，而 `apostol:gram-schmidt-process` statement 逐字写「(formula 15.15)」；补 L80 截取版 155 字符 → **采纳** → 整行 217 超界，须截去尾部 `\quad \text { for } ... \tag{15.15}`。

7. **15.13 FIX 2 / 4b**（死因 6） → `d:span-inclusion-y-inside-x` statement 第一分句无锚，补 L49=72 字符；`apostol:ext-volume-2-proof-of-the-legendre-closed-form` 核心闭式 E22 无锚，补 L153=82 字符 → **采纳** → 掩码机器算、statement 逐字读，两边都不靠推测。

8. **15.14 FIX-1 / FIX-2**（死因均 0） → `apostol:theorem-15-15-orthogonal-decomposition` 补 (15.16) 锚点，不含 tag 的 111 字符版（含 tag 122，源第 21 行）；`d:orthogonal-decomposition-uniqueness` 补第 50 行「We wish to prove that $s = t$ and $s^{\perp} = t^{\perp}$ .」=59 字符 → **采纳，第二条挂载点留主控裁** → `\tag{15.16}` 在 anchors.tsv 与 edges.tsv 均 0 行；第 50 行 n_sentence_end=6 必须按句截，备选挂 `d:uniqueness-reduces-to-a-single-vanishing-difference`。

9. **15.14 §四 不一致 2**（死因 6） → `apostol:projection-along-an-element`（`data/nodes-A2-s1.jsonl:7`）3 条锚点全在 15.13.md，statement 末句的 15.14 内容无 15.14 锚点；补第 36 行 76 字符句，并把「where (y, y) = 1 reduces the coefficient to (x, e_i)」改标 `origin: model` 或删去 → **采纳** → 提案自陈「15.13 是否另有一句写了该退化」未核，保留该标记。

10. **15.15 FIX-1**（死因 6，本片最严重） → `apostol:legendre-polynomial-approximation` 补第 56 行 155 字符：例 2 投影公式在全图 921 锚点 + 1433 条边证据里零命中，而 statement 明文断言 → **采纳，连带采纳其 SPEC 建议**（「statement 逐子句证据覆盖」立为独立判据） → 例 1 同位公式 (15.21) 有锚（`apostol:fourier-coefficients` a1，157 字符），两例结构相同处理不同，是漏做非设计。

11. **15.15 FIX-2/3/4/5** → 同节点补第 53 行 66 字符（备选 79）；`apostol:best-linear-approximation-to-sine` 补第 65 行 46、第 68 行 114 字符；`d:fourier-coefficients-in-cosine-and-sine-form`（`data/nodes-D4.jsonl:54`）与 `apostol:trigonometric-polynomial` 补第 42 行 117 字符（去 tag 106） → **采纳** → 五条均 FOUND / count=1 / 不跨行 / 30–200 区间。

12. **15.16 2.1**（死因 6，E 型） → `apostol:cx-orthonormalizing-a-dependent-list-yields-a-shorter-basis` 补 `15.16-exercises.md:10` 的 78 字符（1(b) 向量组） → **采纳** → 四组向量只有 1(b) 无锚，`grep -F '(- 1, 1, - 1)'` 四表 0 命中；L10 全长 87，去 ` \tag {b}`。

13. **15.16 2.2**（死因 6，E+D 交叠） → `apostol:cx-normalizing-constant-breaks-at-the-index-zero` 补 `:26` 的 81 字符（对比项 y_n） → **采纳** → 该行 charlen=145，现有锚点只吃前 36，「A 与 B 不同」的断言只锚了 A。

14. **15.13 FIX 4 / FIX 5**（死因均 0） → `apostol:gram-schmidt-process` 补 L77 桥接句 124 字符（一般定理专化为具体过程的接缝）；`d:vanishing-projection-terms-in-the-legendre-computation` 补 L120=51 字符（Legendre 计算起点 y₀(t)=x₀(t)=1） → **采纳** → 两条均实测在 30–200 界内、不跨行。

15. **15.13 FIX 3** → `apostol:orthonormal-basis` 补 L117=156 字符 → **改后采纳：与第 2 条二者择一** → 与 A1 锚点 2 是同一条引文，A1 建成即由 A1 承担，否则会造出同引文双持有者。

16. **15.14 §四 不一致 1**（元数据错，死因 0） → `d:orthogonality-to-generators-extends-to-their-span`（`data/nodes-D4.jsonl:9`）sections 由 `15.13` 改为 `15.13,15.14` → **采纳** → 它 anchor#1 是 15.14.md 的 100 字符句，statement 自己声明跨两节；同条附带的「不建议 KILL 该 4 持有者共享句」置信度中、需连 15.13 的 parent 一起看，标**未复核**。

17. **15.15 §五 抽查 1 / 抽查 2** → 抽查 1：`apostol:best-approximation-in-a-finite-dimensional-subspace` a1（88 字符）撤掉，或换成定理 15.16 的一般性表述句；抽查 2（死因 6）：`apostol:trigonometric-polynomial-approximation` a2（146 字符）延长至含句尾（源第 51 行） → **抽查 1 采纳；抽查 2 改后采纳** → 抽查 2 延长后的字符数提案自陈「未核」，须执行方实测并确认不越 200 界。

18. **15.15 §三** → 记 SPEC 例外：「唯一逐字载体是短于 30 字符的独立公式行时，允许 statement 无逐字锚」 → **采纳** → 15.13 E12（L90 仅 26 字符，低于 SPEC 30 下界、机制上不可锚）是同机制的独立第二例，两节各出一例。

## 落选项

- 15.13 FIX 6：图 15.1 几何解释补 L93=84 字符 —— 原文自标「不进 SPEC（可选）」，纯图注无独立数学内容。
- 15.13 A3 原形态（新建节点）：死因 5 风险 + L165 超 200 界，降级为 FIX（见第 4 条）。
- 15.14 §三 S5/S17/S18/S21/S22/S41 六句：过渡叙述、图注、公式残片；S21 仅 16 字符低于 30 界，S22/S41 另建触发死因 5，已改为 FIX-1/FIX-2。
- 15.14 §四 不一致 2 的 13 个 L2 节点：按 `tmp_index/README.md` 第 21–22 行，24 个 L2 节点设计上无锚点、靠 members 引用，不是不一致。
- 15.15 §三 `apostol:trigonometric-polynomial` 补第 28 行 163 字符：源文写「In Section 15.11 we exhibited」属回引，原文判保留现状。
- 15.15 §五 抽查 3 `d:approximation-proof-starts-from-the-orthogonal-decomposition` a1（93 字符）：死因 0，原文判保留，无动作。
- 15.16 §三 单元 28（`Compute $\| g - f \|^2$ for this $g$ .`，38 字符）：与 L70、L72 尾部同形，已由现有锚点承担。
