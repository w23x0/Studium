# G3a data/edges-H1.jsonl 15 条逐条审查

只读分析代理产出。**未改动 data/ 下任何文件。**

## 〇 结论速览（保留 4 / 修 7 / 撤回 4 = 15）

| # | src → dst（略写） | 关系词 | evidence 支撑 | 结论 |
| --- | --- | --- | --- | --- |
| 1 | 空集独立 → O∈S 则相依 | 真辨析 | 单侧（src） | 修（origin→model） |
| 2 | 15.7(a) → 15.7(b) | 真辨析 | 单侧（dst） | 保留 |
| 3 | 张成集可无穷 → 无有限张成集 | 真辨析 | **双侧** | 保留 |
| 4 | dimension → spanning-set | 真辨析 | 单侧（dst） | 修（换引文） |
| 5 | S⊥对任意子集 → 正交补名号 | 真辨析 | **双侧** | 保留 |
| 6 | 15.13 → 15.14 | 误用（已有 implies） | 单侧（src） | 撤回 |
| 7 | 15.14 → 15.15 | 误用（应为 requires） | 单侧（dst） | 修（改词+反向+换引文） |
| 8 | 15.10 → O∈S 则相依 | 真辨析 | 单侧（src） | 修（换引文） |
| 9 | 沿元素投影 → 在子空间上投影 | 真辨析 | 单侧（dst） | 修（换引文） |
| 10 | a_j 抵消式 → y_j=O 时 a_j 无关 | 真辨析 | 单侧（dst） | 保留 |
| 11 | 归一化 → y=O 检测相依 | 误用 | 单侧（dst） | 撤回 |
| 12 | 15.9 对每个内积成立 → 内积不唯一 | 真辨析 | 单侧（dst） | 修（换引文） |
| 13 | Fourier 系数 → 有序基下的分量 | 真辨析 | **零侧** | 修（origin→model） |
| 14 | 相依被超集继承 → 独立性的全称量词 | 误用（对象错） | 单侧（src） | 撤回 |
| 15 | 标量倍导致相依 → 独立集 | 误用（对象错） | **零侧** | 撤回 |

机械合规：15/15 条 quote 在 `source/apostol-ch15/` 对应文件中逐字命中、单行、
charlen 40–186 全落在 SPEC 的 30–200 界内（自测，见每条正文）。15 条全为 `origin=source`，
**没有一条落在 tmp_index/unverified-model-quotes.tsv 里**（该表 0 条来自 edges-H1），
即这 15 条的引文本身已被 check_graph 逐字核过。本轮的问题全部不在合规性，在支撑力与选词。

## 一 逐条审查

### 判定尺子（先说清，否则 7 条「修」看不出为什么）

`contrasts` 按 SPEC 是**对称**关系（SPEC.md:23 表），所以「方向对不对」对本批 15 条
退化为两问：(i) 图里有没有反向重复边；(ii) 若改成非对称词，方向才成为实质问题。
逐对全图扫过：15 对中只有 2 对另有边（E6 已有 `implies`、E9 已有 `part-of`），
**无一条反向重复**（tmp_index/edges.tsv 全表比对）。

`origin` 按 SPEC.md:73 编码的是**断言是谁下的**——「不要把推断伪装成原文」。
据此定尺子：**只有当源文本自己把两端并置**（同一句里带对比连词，或同一编号定理/定义的
两个标号部分、同一段证明里的 if / if-not 两支），`contrasts` 才配 `origin=source`；
否则这个并置是模型做的，应为 `origin=model`。这把尺子是本文 7 条「修」里 2 条的唯一依据。

「单侧 / 双侧 / 零侧」指引文覆盖了关系的哪几端：单侧 = 只讲了 src 或只讲了 dst
（盲区 C/D 型在边上的形态：一条讲 A 的引文不能证明 A 与 B 对比）；零侧 = 两端都没讲到。

### E1 `data/edges-H1.jsonl:1`

```json
{"src": "d:independence-of-the-empty-set", "rel": "contrasts", "dst": "apostol:zero-element-forces-dependence", "origin": "source", "evidence": {"file": "15.07.md", "quote": "EXAMPLE 4. The empty set is independent."}}
```

- **关系词**：对。两端是 15.07 相邻的 EXAMPLE 4 与 EXAMPLE 3（15.07.md:25 与 :23），
  「空集独立 / 含 O 的集合相依」是相依性边界上最典型的一对易混点。真辨析，不是「相关」凑数。
- **evidence 支撑力**：**单侧**。引文只说「空集是独立的」（40 字符，= src 侧），
  对 O∈S 一字未提，撑不起「与 dst 成对」。Ex3 在 :23、Ex4 在 :25，隔一空行，
  受「不跨行」约束不可能取到双侧引文。
- **借用**：该 quote 的 (file,quote) 有 4 个持有者（shared-quotes.tsv：
  edge:data/edges-D2.jsonl:141、edge:data/edges-H1.jsonl:1、node:d:independence-of-the-empty-set、
  node:x:zero-element-destroys-independence），即它同时是 src 节点自己的锚点 —— B 型借用，
  且属过报通道 (c)：同一源行分别落在节点锚点与边证据上，算冗余度时不得重复计入。
- **方向**：对称词，无反向重复边。
- **origin**：**标错**。Apostol 没有把 Ex3 与 Ex4 并置成一组对比，两条只是先后排列；
  这个并置是模型做的。
- **结论：修**。关系保留，origin 改 model 并删 evidence（SPEC.md:73 允许 model 省 evidence）。
  死因 6。置信度中高。不确定点：若综合代理认为「相邻编号例子」也算源自并置，
  则改为保留原行即可，此时须记账为「单侧证据」。

### E2 `data/edges-H1.jsonl:2`

```json
{"src": "d:thm-15-7a-independent-sets-extend-to-bases", "rel": "contrasts", "dst": "d:thm-15-7b-n-independent-elements-form-a-basis", "origin": "source", "evidence": {"file": "15.08.md", "quote": "(b) Any set of n independent elements is a basis for V."}}
```

- **关系词**：对。THEOREM 15.7 的 (a) 与 (b)（15.08.md:21 / :23）：(a) 是存在性延拓
  「独立集⊂某个基」，(b) 是计数饱和「数目够了独立就够」。两半常被混读成一句，真辨析。
- **evidence 支撑力**：单侧（dst 侧，55 字符，逐字命中 15.08.md:23）。但**并置本身是 Apostol 的**
  —— 两端是同一编号定理的两个标号部分，源结构自己成对。按尺子这属 origin=source 合格情形。
- **借用**：n_holders=6（含 node:apostol:theorem-15-7、node:d:thm-15-7b-...、
  node:x:right-count-upgrades-one-basis-property-to-both 等），B 型借用 + 过报通道 (c)。
- **方向**：对称词，无反向重复边。
- **origin**：对。
- **结论：保留**。死因 0。置信度中。不确定点：引文单侧这一条我不打算靠换引文修
  —— (a) 在 :21、(b) 在 :23 分行，取不到双侧引文；这是 SPEC「不跨行」与「contrasts 需双侧」
  的结构性冲突，属 SPEC 层面议题，不是本条的缺陷。

### E3 `data/edges-H1.jsonl:3`

```json
{"src": "d:spanning-set-may-be-infinite", "rel": "contrasts", "dst": "d:infinite-dimensional-operational-criterion-no-finite-spanning-set", "origin": "source", "evidence": {"file": "15.08.md", "quote": "Although the infinite set $\\{1, t, t^{2}, \\ldots\\}$ spans this space, no finite set of polynomials spans the space."}}
```

- **关系词**：对。「张成集可以是无穷集」与「无穷维 = 没有有限张成集」都围绕无穷张成，
  极易混为一谈；分辨点正是「无穷集张成成立 ≠ 有限集张成成立」。
- **evidence 支撑力**：**双侧，本批最强的一条**。引文（115 字符，15.08.md:17 逐字命中）
  前半 "Although the infinite set … spans this space" 正是 src，后半
  "no finite set of polynomials spans the space" 正是 dst，`Although … ,` 是 Apostol
  自己的对比连词。引文与关系断言严格同构。
- **借用**：not-shared（shared-quotes.tsv 无此 (file,quote)），独占。
- **方向**：对称词，无反向重复边。
- **origin**：对，源文本自己并置。
- **结论：保留**。死因 0。置信度高。注意：所在源行 15.08.md:17 的 n_sentence_end=3
  （source-lines.tsv），按行号做覆盖比对会高报（过报通道 b）。

### E4 `data/edges-H1.jsonl:4`

```json
{"src": "apostol:dimension", "rel": "contrasts", "dst": "apostol:spanning-set", "origin": "source", "evidence": {"file": "15.06.md", "quote": "Different sets may span the same subspace. For example, the space $V_{2}$ is spanned by each of the following sets of vectors: $\\{i,j\\}$ , $\\{i,j,i+j\\}$ , $\\{O,i,-i,j,-j,i+j\\}$ ."}}
```

- **关系词**：对。真辨析点是「张成集不唯一，但张成所需的最小个数唯一」——
  dimension 与 spanning-set 是同一问题的两面，学生常把「有一个张成集」当成「维数已定」。
- **evidence 支撑力**：**单侧（dst 侧）**。引文 178 字符，15.06.md:21 逐字命中，
  内容全部是「不同集合可张成同一子空间」加三个 V₂ 的例子 —— 这只讲了 spanning-set 的
  非唯一性，**"dimension" 一词及任何计数概念都没出现**。一条讲张成集的引文证明不了
  「张成集与维数需成对辨析」。此外该引文几乎就是 apostol:spanning-set 的 statement 首句
  （statements.tsv：`A set spans a space … Different sets may span the same subspace…`），
  等于用 dst 的自我描述来证明一条二元关系。
- **借用**：not-shared。
- **方向**：对称词，无反向重复边。
- **origin**：可保 source，但须换成真正并置两端的句子。
- **结论：修**。换引文为 15.06.md:29 里 Apostol 自己把两端串起来的那一问：
  "If a space can be spanned by a finite set of elements, what is the smallest number of
  elements required?" —— 前半是张成，后半 "smallest number of elements" 正是维数的来源，
  一句之内双侧。自测 104 字符，落在 30–200，逐字命中 15.06.md:29，单行。死因 6。
  置信度中高。不确定点：该源行 n_sentence_end=5 级别的多句行（source-lines.tsv 记 15.06.md:29
  为长行），取子句合法但按行号算覆盖会高报（过报通道 b）。

### E5 `data/edges-H1.jsonl:5`

```json
{"src": "d:s-perp-is-defined-for-an-arbitrary-subset", "rel": "contrasts", "dst": "d:orthogonal-complement-is-a-name-reserved-for-subspaces", "origin": "source", "evidence": {"file": "15.14.md", "quote": "It is a simple exercise to verify that $S^{\\perp}$ is a subspace of V, whether or not S itself is one. In case S is a subspace, then $S^{\\perp}$ is called the orthogonal complement of S."}}
```

- **关系词**：对。「S⊥ 对任意子集都有定义且总是子空间」与「只有 S 本身是子空间时才叫正交补」
  是一对纯术语性辨析，混淆代价实在（会误以为 S 必须是子空间）。
- **evidence 支撑力**：**双侧**。引文 186 字符，15.14.md:11 逐字命中：
  前句 "whether or not S itself is one" = src（任意子集），
  后句 "In case S is a subspace, then … orthogonal complement" = dst（名号限于子空间）。
  引文两端俱全，且这正是 Apostol 自己在同一行内做的限定。
- **借用**：not-shared。
- **方向**：对称词，无反向重复边。
- **origin**：对。
- **结论：保留**。死因 0。置信度高。该行 n_sentence_end=2，覆盖比对时注意过报通道 (b)。

### E6 `data/edges-H1.jsonl:6`

```json
{"src": "apostol:theorem-15-13-orthogonalization-theorem", "rel": "contrasts", "dst": "apostol:theorem-15-14-orthonormal-basis-exists", "origin": "source", "evidence": {"file": "15.13.md", "quote": "whose proof shows how to construct orthogonal sets in any Euclidean space, finite or infinite dimensional."}}
```

- **关系词**：**误用**。15.14 是 15.13 的推论 —— 源文 15.13.md:83 明写
  "as a corollary of Theorem 15.13 we have the following"，且图里已有
  `data/edges-A2-s1.jsonl:8  apostol:theorem-15-13… implies apostol:theorem-15-14…`（origin=source）。
  定理与其推论是嵌套关系，不是「易被混淆的一对」。`contrasts` 在这里被当成「相关」用了。
- **evidence 支撑力**：单侧（src 侧）。引文 106 字符，15.13.md:3 逐字命中，说的是
  15.13 的证明在有限或无限维都能构造正交集 —— 这是 15.13 的适用范围，
  对 15.14「仅有限维」一字未提。真正的分辨点（15.13 达无穷维 / 15.14 限有限维）
  的 dst 侧在 15.13.md:85（THEOREM 15.14 的陈述行），不同行，取不到双侧。
- **借用**：not-shared。
- **方向**：对称词，无反向重复边；但与 A2-s1:8 的 `implies` 构成语义重复。
- **origin**：引文合规，但「与 15.14 成对辨析」这个断言不是源文所下。
- **结论：撤回**。死因 6（引文只支撑 src 的一般性，不支撑对比断言）+ 关系词误用，
  且与已有 `implies` 边冗余。撤回后信息不丢：「15.13 覆盖无穷维」已在 15.13 自身的锚点里
  （该 quote 是 15.13.md:3 的原句），「15.14 限有限维」在 15.14 的 statement 里。
  置信度中高。不确定点：若综合代理认为「一般定理 vs 其有限维推论」值得保留一条独立辨析边，
  则最小修法是 origin→model 并删 evidence，我不推荐（与 implies 并存会让 rel 语义更含混）。

### E7 `data/edges-H1.jsonl:7`

```json
{"src": "apostol:theorem-15-14-orthonormal-basis-exists", "rel": "contrasts", "dst": "apostol:theorem-15-15-orthogonal-decomposition", "origin": "source", "evidence": {"file": "15.14.md", "quote": "THEOREM 15.15. ORTHOGONAL DECOMPOSITION THEOREM. Let V be a Euclidean space and let S be a finite-dimensional subspace of V."}}
```

- **关系词**：**误用**。两者不是可辨析的兄弟，而是**依赖**：15.15 的存在性证明
  第一步就调用 15.14 —— 15.14.md:30 "Since S is finite-dimensional, it has a finite
  orthonormal basis, say $\{e_{1},\ldots,e_{n}\}$ ."。`contrasts` 在这里遮蔽了一条真实的
  `requires`，而图里**目前没有**这条依赖边：15-15 已有 11 条 `requires`
  （euclidean-space / subspace / finite-dimensional-space / orthonormal-set / finite-basis …），
  但 dst 里没有 theorem-15-14（tmp_index/edges.tsv 全表扫过）。这是本批唯一一条修完能
  **净增真实信息**的边。
- **evidence 支撑力**：单侧（dst 侧）。引文 124 字符，15.14.md:18 逐字命中，
  是 15.15 的定理头 —— 只是 dst 的自我陈述，既未提 15.14，也未说两者需辨析。
- **借用**：n_holders=3（edge:data/edges-A2-s2.jsonl:22、本边、node:apostol:theorem-15-15-…），
  即它同时是 dst 节点的锚点。B 型借用 + 过报通道 (c)。
- **方向**：现方向 15.14 → 15.15 在对称词下无所谓；改成 `requires` 后**必须反向**
  （SPEC：requires 是「要陈述或理解 src 必须先有 dst」，故 src=15.15、dst=15.14）。
- **origin**：改后仍可为 source，引文换成 15.14.md:30 那句调用。
- **结论：修**。改词 `contrasts`→`requires`、反向、换引文（自测 96 字符，
  逐字命中 15.14.md:30，单行，落在 30–200）。死因 6 + 关系词误用。置信度高。
  不确定点：若综合代理另有别处已补 15-15 requires 15-14，则本条应直接撤回以免重复；
  我在 edges.tsv 全表未见该边。

### E8 `data/edges-H1.jsonl:8`

```json
{"src": "apostol:theorem-15-10-orthogonal-sets-are-independent", "rel": "contrasts", "dst": "apostol:zero-element-forces-dependence", "origin": "source", "evidence": {"file": "15.11.md", "quote": "THEOREM 15.10. In a Euclidean space V, every orthogonal set of nonzero elements is independent."}}
```

- **关系词**：对，而且是本批最有教学价值的一对。分辨点：O 与一切元素正交（含自身），
  所以若不加 nonzero 假设，含 O 的「正交集」会同时是相依集 —— 15.10 的 nonzero 假设
  正是被 Ex3 逼出来的。真辨析。
- **evidence 支撑力**：单侧（src 侧）。引文 95 字符，15.11.md:7 逐字命中，
  是 15.10 的定理头。它讲的是「非零正交集独立」，关系断言的是「它与『O∈S 则相依』成对」——
  引文里 zero element 一词都没有，dst 侧全空。
- **借用**：n_holders=5（含 node:apostol:theorem-15-10-…、node:d:15-10-nonzero-hypothesis-is-essential、
  edge:data/edges-D3.jsonl:51、edge:data/inherited/edges-A1.jsonl:106）。B 型借用，
  且与 `d:15-10-nonzero-hypothesis-is-essential` 抢同一条引文 —— 那个 d: 节点才是这条引文的
  正主，本边等于蹭它的锚点。
- **方向**：对称词，无反向重复边。
- **origin**：可保 source，源文里确有并置句。
- **结论：修**。换引文为 15.11.md:5 "The zero element is orthogonal to every element of V;
  it is the only element orthogonal to itself. The next theorem shows a relation between
  orthogonality and dependence." —— 前句正是 dst 侧（O 的正交性质，Ex3 相依的成因），
  后句 "a relation between orthogonality and dependence" 正是这条边要表达的辨析轴，
  且是 Apostol 自己写的过渡句。自测 170 字符，逐字命中 15.11.md:5，单行，落在 30–200。
  死因 6。置信度中高。不确定点：该行 n_sentence_end=2，覆盖记账须避开过报通道 (b)；
  新引文严格说仍未逐字点出 "O ∈ S ⇒ S dependent"（那句在 15.07.md:23），
  但已把辨析轴写在明面上，比原引文强。

### E9 `data/edges-H1.jsonl:9`

```json
{"src": "apostol:projection-along-an-element", "rel": "contrasts", "dst": "apostol:projection-on-a-subspace", "origin": "source", "evidence": {"file": "15.14.md", "quote": "DEFINITION. Let $S$ be a finite-dimensional subspace of a Euclidean space $V$ , and let $\\{e_1, \\ldots, e_n\\}$ be an orthonormal basis for $S$ ."}}
```

- **关系词**：可保。两者同名「projection」，一个沿单个元素、一个在子空间上，是高频混点。
  图里已有 `data/edges-A2-s2.jsonl:46  projection-along-an-element part-of projection-on-a-subspace`
  （origin=source），编码的是组成关系（子空间投影 = 沿各基元素投影之和）；
  `contrasts` 编码的是「同名易混」，二者不重复，可并存。
- **evidence 支撑力**：单侧（dst 侧），而且是**最弱的一类**：引文 144 字符，
  15.14.md:60 逐字命中，是「在子空间上投影」定义的**前半句铺垫**（设 S、设正交规范基），
  连 "projection" 一词都还没出现（那在 :66 "is called the projection of $x$ on the subspace $S$ ."）。
  这是盲区 C 型：把定义的起手式当成了结论。
- **借用**：not-shared。
- **方向**：对称词，无反向重复边。
- **origin**：可保 source，源文有并置句。
- **结论：修**。换引文为 15.14.md:36 "Note that each term $(x, e_{i})e_{i}$ is the projection
  of x along $e_{i}$ . The element s is the sum of the projections of x along each basis element."
  —— 前句是 src（沿元素投影），后句把 s（即 dst 的对象）写成「沿各基元素投影之和」，
  一句之内双侧，且是 Apostol 自己的并置。自测 151 字符，逐字命中 15.14.md:36，单行，
  落在 30–200。死因 6。置信度中高。不确定点：新引文同时也很适合作 A2-s2:46 那条 `part-of`
  的证据，若两条边都用它会再造一处过报通道 (c)；建议主控二选一，我倾向留给 `part-of`
  而本条改 origin=model —— 但这需要主控裁决，我按「换引文」记账。

### E10 `data/edges-H1.jsonl:10`

```json
{"src": "d:coefficient-that-cancels-the-projection-component", "rel": "contrasts", "dst": "d:zero-earlier-element-makes-the-coefficient-irrelevant", "origin": "source", "evidence": {"file": "15.13.md", "quote": "If $y_{j} = O$ , then $y_{r+1}$ is orthogonal to $y_{j}$ for any choice of $a_{j}$ , and in this case we choose $a_{j} = 0$ ."}}
```

- **关系词**：对。两端是 Gram-Schmidt 归纳步里 Apostol 亲手分的两支：
  y_j ≠ O 时 a_j 被 (15.14) 唯一确定（15.13.md:29 起），y_j = O 时 a_j 任取而约定取 0（:35）。
  同一 parent（`d:gram-schmidt-inductive-step-defines-y-r-plus-one`，nodes.tsv）下的真兄弟，
  分情况讨论的两支互为辨析对象。
- **evidence 支撑力**：单侧（dst 侧），但**是较好的那一半**：引文 125 字符，
  15.13.md:35 逐字命中，开头 "If $y_{j} = O$" 这个条件式本身就点明了存在互补分支，
  "for any choice of $a_{j}$" 与 src 的「a_j 被公式钉死」构成直接对照。
  互补侧在 15.13.md:29（"If $y_{j}\neq O$ , we can make …"），另一行，取不到双侧引文。
- **借用**：n_holders=4（edge:data/edges-A2-s1.jsonl:6、edge:data/edges-D4.jsonl:15、本边、
  node:d:zero-earlier-element-makes-the-coefficient-irrelevant），即它是 dst 节点自己的锚点。
  B 型借用 + 过报通道 (c)。
- **方向**：对称词，无反向重复边。
- **origin**：对。同一段证明里的 if / if-not 两支是 Apostol 自己的并置，符合尺子。
- **结论：保留**。死因 0。置信度中。不确定点：若综合代理坚持 contrasts 必须双侧证据，
  则本条与 E2 同属「源结构成对但受不跨行限制取不到双侧」，应一并归到 SPEC 议题而非逐条改。

### E11 `data/edges-H1.jsonl:11`

```json
{"src": "apostol:normalizing-an-element", "rel": "contrasts", "dst": "apostol:vanishing-orthogonalized-element-detects-dependence", "origin": "source", "evidence": {"file": "15.13.md", "quote": "if the first k elements $x_{1},\\ldots,x_{k}$ are independent, then the corresponding elements $y_{1},\\ldots,y_{k}$ are nonzero."}}
```

- **关系词**：**误用**。「归一化」是一个方法（除以范数，15.13.md:83），
  「y_{r+1}=O 检测相依」是一个判据性结论（:77）。两者不同名、不同型、不在同一分类轴上，
  谈不上「成对辨析或易被混淆」。它们的真实联系是：归一化要求 y_i ≠ O，
  而 dst 恰好提供这个非零保证 —— 但那是前提供给关系，不是对比关系。
  按 SPEC，`requires` 是「要陈述或理解 src 必须先有 dst」，而陈述/理解「除以范数」
  并不需要先有相依检测定理，所以**也不能改成 requires**；封闭词表里没有合适的替代词
  （硬套 `other` + rel_note 只是把问题改名）。
- **evidence 支撑力**：单侧（dst 侧）。引文 127 字符，15.13.md:77 逐字命中，
  正是 dst 陈述的后半句（statements.tsv 里 dst 的 statement 原样含此句）。
  引文对「归一化」一字未提 —— 一条讲相依检测的引文证明不了它与归一化成对。
- **借用**：not-shared。
- **方向**：对称词，无反向重复边。
- **origin**：引文合规，但对比断言不是源文所下。
- **结论：撤回**。死因 6（引文零支撑对比断言）+ 关系词误用（非成对辨析）。
  撤回后信息不丢：非零保证已在 dst 自身 statement 与锚点里，归一化需非零已写在
  `apostol:normalizing-an-element` 的 statement（"Dividing a nonzero element y_i …"）。
  置信度中高。不确定点：若综合代理认为「Gram-Schmidt 后的两种去向（能归一化 / 已塌成 O）」
  值得一条边，那该边的正确两端应是 y_i≠O 与 y_i=O 两个情形节点，不是「归一化」这个方法节点。

### E12 `data/edges-H1.jsonl:12`

```json
{"src": "d:theorem-15-9-holds-for-every-inner-product", "rel": "contrasts", "dst": "d:inner-product-not-unique-on-a-given-space", "origin": "source", "evidence": {"file": "15.10.md", "quote": "Since it may be possible to define an inner product in many different ways, the norm of an element will depend on the choice of inner product."}}
```

- **关系词**：对。分辨点很锐：范数**依赖**内积选择，而 15.9 的性质 (a)–(d)
  **不依赖**内积选择。「依赖 / 不依赖」是同一句里的对照，真辨析。
- **evidence 支撑力**：单侧（dst 侧），且方向上还有点扎手：引文 142 字符，
  15.10.md:119 逐字命中，说的是「内积可以有多种定义，故范数依赖于内积的选择」——
  这完整支撑 dst（内积不唯一），但对 src（15.9 对每个内积都成立）恰好说的是**相反那一半**
  （依赖），容易被误读成 src 不成立。属盲区 C 型：把铺垫当成了结论。
- **借用**：n_holders=3（edge:data/edges-H1.jsonl:12、edge:data/inherited/edges-A1.jsonl:88、
  node:apostol:norm），即它是 `apostol:norm` 的锚点。B 型借用。
- **方向**：对称词，无反向重复边。
- **origin**：可保 source —— 同一源行的下一句就是双侧句。
- **结论：修**。换引文为同行的 "The next theorem gives fundamental properties of norms that
  do not depend on the choice of inner product." —— "do not depend" 是 src，
  "the choice of inner product" 预设了 dst 的多重选择，一句之内双侧，
  且这是 Apostol 引出 15.9 的原话。自测 105 字符，逐字命中 15.10.md:119，单行，落在 30–200。
  死因 6。置信度中高。不确定点：15.10.md:119 是 460 字符、n_sentence_end=4 的长行，
  新旧引文同属一行，若按行号算覆盖，换引文不带来新源行（冗余度按「新引入源行数」度量时增益为 0）。

### E13 `data/edges-H1.jsonl:13`

```json
{"src": "apostol:fourier-coefficients", "rel": "contrasts", "dst": "apostol:components-relative-to-ordered-basis", "origin": "source", "evidence": {"file": "15.15.md", "quote": "If $f \\in C(0, 2\\pi)$ , let $f_n$ denote the projection of $f$ on the subspace $S$ . Then we have"}}
```

- **关系词**：对，辨析点真实且不平凡：有序基下的分量（15.08）要求 x **属于**该基张成的空间，
  分解是精确的；Fourier 系数 (f,φ_k) 对 f **不在** S 中时同样有定义，得到的是投影 f_n 而非 f。
  同一套「按基读系数」的形式，语义前提不同 —— 这正是易混点。
- **evidence 支撑力**：**零侧**，本批最差。引文 97 字符，15.15.md:33 逐字命中，
  内容是「设 f_n 为 f 在 S 上的投影，于是我们有」——
  一句未完的引入语，既没出现 "Fourier coefficients"（那在 :39），
  也与「有序基下的分量」毫无字面关联。既不支撑 src、也不支撑 dst，更不支撑二者的对比。
  这是 E 型（整句几乎无锚）叠加 C 型（把引入句当结论）。
- **借用**：not-shared。
- **方向**：对称词，无反向重复边。
- **origin**：**标错**。通查 15.15 与 15.08，Apostol 从未把 Fourier 系数与「有序基下的分量」
  并置比较（15.15 只说 f_n 是投影、(f,φ_k) 叫 Fourier 系数；跨节的类比是模型做的）。
- **结论：修**。关系保留（有价值），origin 改 model 并删 evidence。
  死因 6。置信度中高。不确定点：若综合代理要求 origin=model 的边也必须带定位引文，
  可退用 15.15.md:39 "The numbers $(f, \varphi_k)$ are called Fourier coefficients of $f$ ."
  （自测 69 字符，逐字命中 15.15.md:39，单行）—— 但那仍是单侧（src），
  且会把本条塞进 tmp_index/unverified-model-quotes.tsv 那类从不被 check_graph 校验的边，
  我不推荐。

### E14 `data/edges-H1.jsonl:14`

```json
{"src": "apostol:dependence-inherited-by-supersets", "rel": "contrasts", "dst": "d:independence-universal-quantifier-over-choices", "origin": "source", "evidence": {"file": "15.07.md", "quote": "If a subset T of a set S is dependent, then S itself is dependent. This is logically equivalent to the statement that every subset of an independent set is independent."}}
```

- **关系词**：**误用，且对象错（A 型）**。引文 168 字符，15.07.md:19 逐字命中，
  两句讲的是「相依被超集继承」与其等价说法「独立集的每个子集独立」——
  **这两句都在 src 节点自己的 statement 里**（statements.tsv：
  `EXAMPLE 1: if a subset T of a set S is dependent, then S itself is dependent.
  Apostol notes this is logically equivalent to …`）。也就是说引文的两侧都是 src，
  等于一条自指边。
  dst `d:independence-universal-quantifier-over-choices` 讲的是把相依定义的存在量词取反
  得到的**全称量词形式**（statements.tsv：`Negating the existential … turns independence into
  a claim about all choices …`）—— 引文里没有任何一句谈量词形式。
  关系断言的是「继承性 vs 量词形式需成对辨析」，引文讲的是「继承性 ⟺ 子集独立性」，
  两者不是同一件事。另外，Apostol 原话是 "logically equivalent"，
  若真要连这两句，封闭词表里对应的词是 `equivalent`，不是 `contrasts`；
  但 `equivalent` 的另一端（「独立集的每个子集独立」）**在图里没有节点**
  （nodes.tsv 里搜 subset / superset / hereditar 只得到 `apostol:dependence-inherited-by-supersets`
  自己及无关的 subspace/inherited 节点），所以也建不出那条边。
- **evidence 支撑力**：单侧（全在 src 侧），dst 侧零支撑。
- **借用**：not-shared。
- **方向**：对称词，无反向重复边。
- **origin**：引文合规，但对比断言不是源文所下。
- **结论：撤回**。死因 6（引文不支撑对比断言）+ A 型对象错（dst 挂错节点）。
  置信度高。不确定点：若综合代理想保留「继承性靠的是独立性的全称形式」这层意思，
  正确形态是 `apostol:dependence-inherited-by-supersets requires
  d:independence-universal-quantifier-over-choices` + origin=model（源文未言此依赖），
  我列出但不推荐在本轮补 —— 那是新增边，超出「保留/修/撤回」范围。

### E15 `data/edges-H1.jsonl:15`

```json
{"src": "d:dependence-from-one-element-being-a-scalar-multiple-of-another", "rel": "contrasts", "dst": "apostol:independent-set", "origin": "source", "evidence": {"file": "15.07.md", "quote": "The Pythagorean identity shows that $u_{1} + u_{2} - u_{3} = O$ , so the three functions $u_{1}, u_{2}, u_{3}$ are dependent."}}
```

- **关系词**：**误用**。src 是相依的一个充分判据（EXAMPLE 2，15.07.md:21：某元素是另一元素的标量倍），
  dst 是「独立集」的定义。判据与被否定概念的定义不是兄弟，不构成成对辨析；
  这条边实际表达的只是「都跟独立/相依有关」——`contrasts` 被当成「相关」用了。
- **evidence 支撑力**：**零侧，且是本批唯一的实质性对象错**。引文 125 字符，
  15.07.md:29 逐字命中，但那是 **EXAMPLE 5**（u₁=cos²t, u₂=sin²t, u₃=1，
  由勾股恒等式得 u₁+u₂−u₃=O），而 src 节点是 **EXAMPLE 2**（statements.tsv：
  `Example 2: if some element of S equals a scalar times another element of S…`）。
  更要紧的是数学上不吻合：cos²t、sin²t、1 两两都**不是**彼此的标量倍，
  Example 5 的相依来自一个三项关系，**不是** Example 2 判据的实例。
  所以这条引文不但不支撑对比，连 src 本身都不支撑，而且会诱导读者把三项关系
  误读成「标量倍」判据。A 型（变量/对象错）叠加 D 型。
- **借用**：n_holders=3（edge:data/edges-D2.jsonl:137、本边、
  node:d:dependence-witness-must-be-exhibited-not-merely-counted），
  即这条引文的正主是「相依需给出见证而非仅计数」那个节点 —— 本边借用了它。B 型借用。
- **方向**：对称词，无反向重复边。
- **origin**：引文合规（逐字），但把 Example 5 的内容记在 Example 2 的名下。
- **结论：撤回**。死因 6 为主（引文不支撑断言），并附 A 型对象错。
  置信度高。不确定点：Example 2 与「独立集」定义之间若确需一条边，
  合理形态是 `is-a`/`implies` 指向 `apostol:dependent-set` 一侧，
  而非 contrasts 指向 `apostol:independent-set`；本轮不新增。

## 二 撤回清单

| file:line | 死因 | 一句话理由 |
| --- | --- | --- |
| `data/edges-H1.jsonl:6` | 6 + 关系词误用 | 15.14 是 15.13 的推论（15.13.md:83 "as a corollary"），已有 `edges-A2-s1.jsonl:8` 的 `implies`；引文只讲 15.13 覆盖无穷维，不支撑「成对辨析」。 |
| `data/edges-H1.jsonl:11` | 6 + 关系词误用 | 「归一化」（方法）与「y=O 检测相依」（判据）不在同一分类轴上，非成对辨析；引文是 dst 自身 statement 的后半句，对归一化零支撑，且封闭词表内无合适替代词。 |
| `data/edges-H1.jsonl:14` | 6 + A 型对象错 | 引文两句（继承性 + 其等价说法）**都在 src 自己的 statement 里**，构成自指；dst 讲的是独立性的全称量词形式，引文一字未及。 |
| `data/edges-H1.jsonl:15` | 6 + A 型对象错 | 引文是 EXAMPLE 5（cos²+sin²−1=O，三项关系），src 却是 EXAMPLE 2（标量倍判据）；cos²t、sin²t、1 两两互不成标量倍，引文连 src 都不支撑，还会诱导误读。 |

四条撤回后无信息净损失：相关内容均已在对应节点自身的 statement / anchors 或已有边上
（E6→`edges-A2-s1.jsonl:8` 的 implies；E11→dst 的 statement 与 `apostol:normalizing-an-element`
的 statement；E14→src 的 statement 已含两句；E15→`d:dependence-witness-must-be-exhibited-not-merely-counted`
持有同一引文）。

## 三 修改清单

以下 7 行为改后 JSON 全文。所有新引文均由我自己 `grep -F` 逐字核过、单行、
字符数为自测实测值并落在 SPEC 的 30–200 界内（括注为 file:line 与实测字符数）。

**E1** `data/edges-H1.jsonl:1` —— origin→model，删 evidence（Ex3/Ex4 分行，无源文并置）
```json
{"src": "d:independence-of-the-empty-set", "rel": "contrasts", "dst": "apostol:zero-element-forces-dependence", "origin": "model"}
```

**E4** `data/edges-H1.jsonl:4` —— 换引文（15.06.md:29，104 字符，双侧）
```json
{"src": "apostol:dimension", "rel": "contrasts", "dst": "apostol:spanning-set", "origin": "source", "evidence": {"file": "15.06.md", "quote": "If a space can be spanned by a finite set of elements, what is the smallest number of elements required?"}}
```

**E7** `data/edges-H1.jsonl:7` —— 改词 contrasts→requires、反向、换引文（15.14.md:30，96 字符）
```json
{"src": "apostol:theorem-15-15-orthogonal-decomposition", "rel": "requires", "dst": "apostol:theorem-15-14-orthonormal-basis-exists", "origin": "source", "evidence": {"file": "15.14.md", "quote": "Since S is finite-dimensional, it has a finite orthonormal basis, say $\\{e_{1},\\ldots,e_{n}\\}$ ."}}
```

**E8** `data/edges-H1.jsonl:8` —— 换引文（15.11.md:5，170 字符，含 dst 侧与辨析轴）
```json
{"src": "apostol:theorem-15-10-orthogonal-sets-are-independent", "rel": "contrasts", "dst": "apostol:zero-element-forces-dependence", "origin": "source", "evidence": {"file": "15.11.md", "quote": "The zero element is orthogonal to every element of V; it is the only element orthogonal to itself. The next theorem shows a relation between orthogonality and dependence."}}
```

**E9** `data/edges-H1.jsonl:9` —— 换引文（15.14.md:36，151 字符，双侧）
```json
{"src": "apostol:projection-along-an-element", "rel": "contrasts", "dst": "apostol:projection-on-a-subspace", "origin": "source", "evidence": {"file": "15.14.md", "quote": "Note that each term $(x, e_{i})e_{i}$ is the projection of x along $e_{i}$ . The element s is the sum of the projections of x along each basis element."}}
```

**E12** `data/edges-H1.jsonl:12` —— 换引文（15.10.md:119，105 字符，双侧）
```json
{"src": "d:theorem-15-9-holds-for-every-inner-product", "rel": "contrasts", "dst": "d:inner-product-not-unique-on-a-given-space", "origin": "source", "evidence": {"file": "15.10.md", "quote": "The next theorem gives fundamental properties of norms that do not depend on the choice of inner product."}}
```

**E13** `data/edges-H1.jsonl:13` —— origin→model，删 evidence（跨节类比，源文无并置）
```json
{"src": "apostol:fourier-coefficients", "rel": "contrasts", "dst": "apostol:components-relative-to-ordered-basis", "origin": "model"}
```

### 应用后的记账提醒

- E7 改后 `contrasts`（对称）变 `requires`（非对称），主控须一并核 SPEC「纵向边方向恒为粗→细」
  与 15-15 现有 11 条 requires 的一致性。
- E1、E13 改后 origin=model 且无 evidence，`check_graph` 的「已校验引文数」会从
  916 降到 914，**这是记账下降而非质量下降**，报覆盖率时须注明。
- E4/E8/E9/E12 四条换引文后，新引入源行只有 15.11.md:5、15.14.md:36、15.06.md:29 三行
  （E12 新旧引文同属 15.10.md:119 一行，新增源行为 0）。按「新引入源行数」度量，
  本轮修改的冗余度增益是 **+3 行**，不是 +4 条证据。

## 顺带发现

- SPEC.md:29 的节点类型封闭词表是 `concept / method / theorem / notation`（4 个），与本轮任务书给的 `concept / theorem / proof-step / example` 不一致；本批 15 条涉及的节点里实际出现了 `method`（4 个）与 `notation`（1 个），我按 SPEC.md 判为合法。
- 全图 `contrasts` 125 条中 origin 为 model 62 / source 63，而 edges-H1 这 15 条**全部**是 source，比例明显偏离；若我这把 origin 尺子成立，H1 之外的 48 条 source 型 contrasts 值得同样抽查。
- 本批 15 条无一条带 `rel_note`，但 S3 提案 §记载全图有 7 条 `contrasts` 带 `rel_note`，即 rel_note 已被当通用注释栏用；H1 若要记录「辨析点是什么」，现有 schema 没有栏位。
- `d:15-10-nonzero-hypothesis-is-essential` 与 `edges-H1.jsonl:8` 抢同一条引文（15.11.md:7），前者才是正主；换引文后此冲突消解。
- A7-H层整合.md §0 称 H1/H2「31 条边引文逐字命中、字符数实测全部落在 30–200」，本轮独立复核 15 条 H1 部分与之一致，未发现该结论有误。
- `tmp_index/unverified-model-quotes.tsv` 的 15 条与 edges-H1 的 15 条条数相同但**无一条重合**（交集为 0），两个「15」易被混读，报数时须说清是哪一个。

