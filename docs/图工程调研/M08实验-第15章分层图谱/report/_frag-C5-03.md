# 缺口条目 · 15.09–15.12（C5-03）

逐字文本、行号、字符数均回查 `report/待应用-提案/G4-完备性-15.{09,10,11,12}.md` 对应小节照抄（字符数系提案 `len()` 实测，本片未复测）。下以 09/10/11/12 代指来源。

## 主体

**新建节点（09 §二；A1–A5 即 ex22(c)(d)(e) 与 ex24(a)(b)，教材点名要求证明而全图无对应节点）**

- A1 `apostol:intersection-of-two-subspaces-is-a-subspace`，锚 65 字符 `(e) If $S$ and $T$ are subspaces of $V$ , then so is $S \cap T$ .`（`15.09-exercises.md:47`）。采纳——已有 22(f)(g) 反例的对照另一半。
- A2 `apostol:subspace-of-a-finite-dimensional-space-is-finite-dimensional`，56 字符 `(a) $S$ is finite dimensional and $\dim S \leq \dim V$ .`（:73）采纳。
- A3 `apostol:equal-dimension-forces-the-subspace-to-be-the-whole-space`，46 字符 `(b) $\dim S = \dim V$ if and only if $S = V$ .`（:75）。采纳；part-of 归属交主控裁。
- A4 `apostol:subspacehood-is-equivalent-to-being-fixed-by-the-span-operator`，72 字符 `(c) A subset $S$ of $V$ is a subspace of $V$ if and only if $L(S) = S$ .`（:43）采纳。
- A5 `apostol:span-is-monotone-in-the-generating-set`，65 字符 `(d) If $S \subseteq T \subseteq V$ , then $L(S) \subseteq L(T)$ .`（:45）。采纳——现有反例节点「L 保序」一句所缺的依据。
- A6 `apostol:cx-repeated-exponents-need-more-than-the-distinct-exponent-theorem`，67 字符（:57，OCR 两栏合并含 ex23(b)(d)）。改后采纳——独立性结论系模型判定，标 model。
- A7 `apostol:homogeneous-conditions-on-p-n-cut-out-subspaces`，40 字符 `12. $f^{\prime}(0) = 0$ 17. $f$ is even.`（:25）。改后采纳——statement 须限缩 ex12/ex17（写作 ex11–17 即 D 型），两维数值（n 与 ⌊n/2⌋+1）标 model。

09 的 4 个节点 part_of 后代数全为 0（T3 恒空），上列不适用「内容合法下移」免责。

**新建节点（12 §二）**

- A8 `apostol:cx-sesquilinearity-is-the-two-slot-scalar-rule`（theorem），锚 L135 全行 86 字符 + L133 全行 155 字符。改后采纳——习题 15 整题 3 句零覆盖，本节唯一成体量缺口；相对 `d:conjugate-homogeneity-in-second-argument` 是否死因 5 须与审计 B 对齐。
- A9 `apostol:cx-polarization-recovers-the-inner-product-from-the-norm`（theorem），56 字符 `(b) $\|x + y\|^{2} - \|x - y\|^{2} = 2(x, y) + 2(y, x).$`（L141）。采纳——落既有 16(a)/16(c) 两节点同 parent 的第二个 part-of 子。
- A10 `apostol:cx-three-functions-give-all-three-angle-cases`（example），66 字符 `u _ {1} (t) = 1, \quad u _ {2} (t) = t, \quad u _ {3} (t) = 1 + t.`（L58）。改后采纳——π/6、π/3 的配对系自算（L61 未点名），须标 model 并登记数值表，否则退到不点名配对的弱版。

**补锚与改边**

- B1（10 FIX-1/2/3）`d:inner-product-homogeneity-axiom` ← `(3) $c(x,y) = (cx,y)$`（21 字符，L19）；`d:norm-definition-as-square-root` 与 `apostol:norm` ← `\| x \| = (x, x) ^ {1 / 2}`（26，L108）；`d:norm-vanishes-at-the-zero-element` ← `(a) $\| x\| = 0$ if $x = O$ .`（29，L123）。改后采纳——三条均低于 SPEC 30 下界且本节合不出可拼接邻句，须先开短式子例外；`apostol:norm` 那处是死因 6 干净样本。
- B2（10 抽查②）`data/edges-D3.jsonl:171` 的 dst 由 `apostol:polynomials-of-degree-at-most-n` 改为 `d:example-6-all-polynomials-as-a-function-space`，并补 62 字符锚 `EXAMPLE 5. In the linear space of all real polynomials, define`（`15.10.md:75`）。采纳——例 5 无次数上界，A 型对象错。未核：全图是否另有同类边。
- B3（11 §二）`d:trigonometric-orthogonal-system` 补 a2 51 字符 `If $m \neq n$ , we have the orthogonality relations`（`15.11.md:23`）、a3 52 字符 `\int_ {0} ^ {2 \pi} u _ {n} (x) u _ {m} (x) d x = 0,`（:26）。采纳——S18/S19 是本节唯一实质内容零覆盖；不建新节点（死因 5）。
- B4（12 §三末）`apostol:cx-convergence-must-be-proved-before-the-axioms` 补第 4 锚 48 字符 `(a) Prove that this series converges absolutely.`（L103）。采纳——statement 量词覆盖 11/13/14 的 (a)，而 13(a) 本身无锚。

**statement 越界与元数据（均判 FIX）**

- C1（09 抽查 1）`cx-degree-exactly-k-inside-p-n-still-fails-closure` 第 (ii) 段（f=0 修好 15.03 公理 2 与 5 失效）引文完全不含，且 15.03 四节点系本节点边的 dst、按四层池 TD 排除 → 标 model 或补 15.03 锚。采纳，死因 6。
- C2（10 抽查③）`d:additivity-in-first-argument-derived` 对定理 15.10 的引证池内无支撑（exposure T1=2/T2=0/T3=0，两锚均在 15.10.md，定理 15.10 在 15.11.md）→ 补 15.11.md 锚或删引证。改后采纳——「pair the vanishing combination with x₁」是否逐字存在提案方未核。
- C3（11 抽查一）`d:parseval-requires-an-orthonormal-basis`（`nodes-D3.jsonl:65`）断言 (iii)「只用正交基会带 1/(e_i,e_i) 因子」源文无对应文字而 origin 列空 → 补 model 或移出 statement。采纳。
- C4（11 抽查三）撤 `d:parseval-formula-statement` 的 a1（173 字符引导句，与父节点 `apostol:parsevals-formula` a0 共享、n_holders=2，对断言重点「共轭位置」零贡献）。改后采纳——若 SPEC 要求每节点 ≥2 锚点则改为降低共轭句份量。
- C5（11 §四 A−B）`d:normalized-element-has-norm-one`（`nodes-D4.jsonl:19`，sections=`15.10,15.13`）持有 file=15.11.md 的 a2（`anchors.tsv` 500 行，75 字符）→ sections 补 `15.11` 或撤这条借来的定义句。采纳为二择一，不能都不做。
- C6（12 §4.2）`cx-l2-sequence-space-is-an-infinite-dimensional-euclidean-space` 中「Theorems 15.11、15.12 假设有限维」分句池内既无 T1 也无 T2（3 锚全在 15.12-exercises.md，3 条边无一指向 15.11 的定理节点）→ 补边并附 15.11.md evidence，或删该分句。采纳。
- C7（12 抽查 1）`cx-dropping-the-conjugate-destroys-positivity` 的 f ≡ i 使 ∫w f² = −∫w 未标 origin、未登记旧清单 §3（该表现有 4 行）。采纳，D 型。
- C8（11 顺带）`d:15-10-nonzero-hypothesis-is-essential` 用反例 `{O, i, i + j}`，本节源文无此例（`i+j` 只见 `15.06.md:21`），origin 空 → 登记为未标注自算内容。采纳。

**登记与 SPEC**

- D1 更正 `report/反例层-15.05与15.09.md` §4「30 字符下限漏收实例数：0」——09 至少 ex11(10)、ex16(13)、ex23(f)(26)、ex23(i)(27) 四行低于 30 且不可跨行；12 的 S42（L87 全行 `(a) $(f,g) = f(1)g(1)$ .`，24 字符）同类，现行 SPEC 下无合规锚点可补。采纳。
- D2 回填 `report/丢弃与未覆盖清单.md`：§一补 09 的 ex6–10 整段 OCR 缺失（CX2 §6.1 已发现未回填）；§二补 12 习题 14 题干被 OCR 摧毁（L111 后直接是 L114/L118/L122 三个裸公式块、无「14.」编号行，两节点 statement 仍在陈述习题 14 的空间 V，附死因 3 疑点待裁）；§三补 12 约 7 处自算数值（提案方只核了不在 §3 表中、未复算，须标「数值未复算」）。改后采纳。
- D3 进 SPEC 四条：练习节 statement 超出题干的部分逐条标 origin=model（现行 SPEC 未收死因 6）；`sections` 口径二择一（归属 vs 概念所涉；10 锚点侧 70/sections 侧 76，11 A−B=1、B−A=12；凡称「某节有 N 个节点」须注明取哪一侧）；sections 一律补零并注明 `15-9` 指 15.10 的定理 15.9 而非 15.09 节；索引增 `origin_note` 列。采纳。
- D4 口径警示入总装：10 的 123 条锚点 100% 过机器逐字校验，而有意选样的 3 条抽查命中 3 处失配，不得作比例证据外推。采纳。

## 落选项

- 09 提案 7 `apostol:cx-three-generators-of-a-shifted-basis-span-only-a-plane`（95 字符，:35）：ex21(d) 是否真是陷阱有主观成分，提案方自评可降为不建——移出本轮（过度开采）。
- 09 抽查 2 的 `origin_note` 核对（`data/nodes-CX2.jsonl:14`）：本轮只读且字段不在索引——移出本轮，并入 D3 末条。
- 10 S63 刻度类比（168 字符）作 `apostol:norm` 第四锚：教学类比非数学内容，提案方自标可选、丢弃不影响任何断言——不采纳。
- 10 S3/S62 与 S5 出处子句：过渡与纯出处，公式本体已有锚点，建节点即复述 parent（死因 5）——不采纳；其中「ext- 独漏第 12 章点积定义出处」提案方未核——移出。
- 11 S5/S10/S27/S30/S32/S48：过渡 3、纯记号或引导词 2（S10 26、S27 13 字符低于下界）、重复 1——不采纳建节点。S30 与 S44（173 字符、已被两处收作锚点）的引导句口径不一致——移出本轮待裁。
- 12 §三 S1/S4/S12/S23/S24/S32/S33/S37/S38/S41/S47/S52/S54–S56/S59/S60：纯记号、计算小问、OCR 残骸，机制由既有 cx- 节点承担——不采纳。
- 12 抽查 3 可选补锚（L31 习题 3，57 字符，现挂 `equivalent → apostol:orthogonal-elements` 边 evidence）：T2 塌陷、死因 6 因边证据免除——移出。
- 12 抽查 2、11 §四 B−A 的 10 个 L2 与 2 个跨节引用者、10 §四(甲) 3 个节点：均判死因 0、建议保留，无待装配动作——不采纳。
