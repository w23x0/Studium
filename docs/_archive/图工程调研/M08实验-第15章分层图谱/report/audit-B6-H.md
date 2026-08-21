# 审计 B6：横向对比层的信息增益（nodes-H2 / edges-H1 / edges-H2）

审计对象：`data/nodes-H2.jsonl`（11 节点）、`data/edges-H1.jsonl`（15 边）、`data/edges-H2.jsonl`（19 边）。
职责边界：只判**增益**。数学对错、锚点真假、边方向是否合 SPEC 一律不判（由正交的另一名审计负责）。
裁决文件：`report/audit-B6-H-verdicts.jsonl`（11 行）、`report/audit-B6-H-edges-verdicts.jsonl`（34 行）。

## §1 数字总览

| 对象 | 总数 | KEEP | KILL | 存活率 |
|---|---|---|---|---|
| 节点 `nodes-H2.jsonl` | 11 | 4 | 7 | **36.4%** |
| 边 `edges-H1.jsonl` | 15 | 6 | 9 | **40.0%** |
| 边 `edges-H2.jsonl` | 19 | 4 | 15 | **21.1%** |
| 边合计 | 34 | 10 | 24 | **29.4%** |

节点无 FIX。KILL 一律 `cause: 5`，子类型写在 reason 里。

存活的 4 个节点：`apostol:ext-chapter-12-finite-dependence-definition`、`apostol:ext-volume-2-proof-of-the-legendre-closed-form`、`apostol:ext-uncited-dimension-of-a-second-order-de-solution-space`、`apostol:ext-uncited-unit-coordinate-basis-of-vn`。

存活的 10 条边：H1 的第 3、5、8、11、12、13 条；H2 的第 13、16、18、19 条。

一条结构性观察，决定了 H2 的低存活率：**19 条 H2 边全部只连向本批新造的 11 个 ext 节点**（脚本核对：`:ext-` 在 `edges-H2.jsonl` 之外的任何边文件中出现 0 次）。因此每条 H2 边的命运完全由它端点节点的命运决定 —— 节点死则边死。H2 的边不是独立的增益单位。

## §2 节点 KILL 分类

7 个 KILL 分三类。

### 2.1 复述孪生 D 节点（5 个，最主要死因）

D 层已经为每一处外部委派建了一个"委派事实"节点，ext 节点把同一句话再写一遍，且**刻意不写外部定理自身的内容**（这是产出者出于"无第12章原文、指名即编造"的诚实政策，判断本身正确，但结果是节点内容为空壳）。

- `apostol:ext-theorem-12-8` ← 可从 `d:thm-15-5-proof-delegated-to-theorem-12-8` 重得：后者 statement 已写"Apostol gives no new argument in 15.07 … So the load-bearing wall of the dimension theory has no proof inside Chapter 15"，比 ext 节点更锋利。连 L1 的 `apostol:theorem-15-5` statement 都已含"The proof of the corresponding result for V_n (Theorem 12.8) uses only the linear space axioms and so carries over"。
- `apostol:ext-theorem-12-10-part-b` 与 `apostol:ext-theorem-12-10-part-c` ← 二者共用 15.08 的同一处委派，D 层用**一个**节点 `d:thm-15-7-proofs-delegated-to-theorem-12-10` 承载，ext 层按外部编号切成**两个**。这是纯语法切分：切分依据来自第12章的编号结构，不来自第15章的任何学习难点。`apostol:theorem-15-7` 的 statement 末句"The proofs are those of parts (b) and (c) of Theorem 12.10"已把两者一并给出。
- `apostol:ext-theorem-12-3` ← `d:cauchy-schwarz-proof-inherited-from-theorem-12-3` 已完整写出复用论证的三个环节（只用到12.2 所列性质、不依赖分量定义、故在任何实欧氏空间成立）。
- `apostol:ext-theorem-12-2` ← 拆开看，它的三项内容各有归属：「所列性质即内积公理、公理化后定理免费转移」在上述 D 节点里；「Apostol 把这类性质重新声明为公理」在 `apostol:inner-product-axioms` 的 statement 里（"Apostol states these properties and regards them as axioms"）；剩下的「第15章未逐条列出12.2 的性质」是 `edges-H2.jsonl` 第 10 条 `rel_note` 的内容，属于边的元数据，不是节点增益。

### 2.2 与既有 L1 节点表达同一对象（1 个）

- `apostol:ext-vn-c-section-12-16` ← `apostol:complex-euclidean-space` 的 statement 末句已是"One example is the complex vector space V_n(C)"。ext 节点净增的只有书目坐标"12.16 节、discussed briefly"，这是索引信息，不是判断力。

### 2.3 对象重复 + 三处旁证已各自到位（1 个）

- `apostol:ext-vn-as-a-prior-vector-space` ← 产出者自己在 `origin_note` 里预留了此判（"若审计认为二者重合可判 KILL"）。逐项核对，它的四项内容全部有既有承载者：对象本身 = `apostol:v-n-space`（15.03 例3，锚点是同一句）；「公理验证交给读者」= `d:examples-are-asserted-to-satisfy-the-axioms-and-left-to-the-reader`；「V_n 建于第12章」= `apostol:dot-product-in-vn` statement 的"defined in Chapter 12"；「V_n 是全章标准实例与直觉来源」= `d:example-3-v-n-with-componentwise-operations` statement 的"Everything in the axiom list can be read off from it"。

### 2.4 为什么另外 4 个活下来

四个存活节点的共同特征：它们提供的都是**警示（这里有个洞）**，而不是**转述（这里引了什么）**。转述型节点必然被 D 层孪生节点覆盖，警示型不会。

- `apostol:ext-chapter-12-finite-dependence-definition`：`apostol:independent-set` 只说新定义"unlike the Chapter 12 definition it is not restricted to finite sets"，没有任何邻居告诉读者「有限集上一致」这条声明**从未在第15章被核对**。读者默认它已被验证，这是真空白。
- `apostol:ext-volume-2-proof-of-the-legendre-closed-form`：`apostol:legendre-polynomials` 与 `d:legendre-normalizing-constant-from-y-n-to-p-n` 都把 Rodrigues 闭式当既成事实使用；只有本节点指出该等式的证明被推给第II卷、却已在本章承载 P_n 的定义。这是"未证等式承重"的唯一记录点。
- 两个 `ext-uncited-*`：孪生 D 节点只描述例子**做了什么**（"举一组基数一数"），ext 节点指出**没做什么**（独立性与张成两半皆未验证、且无任何出处）。`d:dim-of-a-second-order-de-solution-space-is-two` 补了独立性来自 15.07 例7，恰恰把「张成那一半仍无着落」这个更大的洞衬托出来而没有填上。

## §3 边的图上距离分析（本轮核心方法）

### 3.1 估距方法

用脚本、不用人眼。步骤：

1. 载入全部节点（`data/nodes-*.jsonl` + `data/inherited/nodes-*.jsonl`，共 504 个）。
2. 载入**除 H1/H2 之外**的全部边（`data/edges-*.jsonl` + `data/inherited/edges-*.jsonl`，共 1347 条），忽略方向，建无向邻接表。剔除 H1/H2 是关键：要问的是"在没有这条边的图上，两端相距多远"。
3. 额外把 `d:` 节点的 `parent` 字段当作一条边加入（284 条）。父子关系在数据里不总以边的形式出现，但在导航上等价于一步。
4. 对每条待审边的两端做 BFS，上限 6 步，得 `d`。
5. 三项辅助信号：两端 `sections` 是否有交集；两端之间是否已有**直连**边（并记下它的 `rel` 与来源文件）；两端是否**同父**。
6. 对同节的边再回到 `source/apostol-ch15/` 查原文行号，判断两端是否在原文里相邻（例如 15.07 例3/例4 分别在第 23/25 行）。

判据（事先固定，逐条套用）：

- `d=1`（已有直连边）⇒ KILL。导航增益严格为零。
- `d=2` 且**同父** ⇒ KILL。父节点的 statement 已把两半并列陈述，属兄弟冗余。
- `d=2` 且共享枢纽**已专门承载这条对立** ⇒ KILL（枢纽已做了辨析工作）。
- `d=2` 且**跨节**、共享枢纽是泛用概念（如 `apostol:spanning-set`、`apostol:euclidean-space`）⇒ 看是否真混淆，泛枢纽不承担辨析工作。
- `d>=3` 且无共享邻居 ⇒ 倾向 KEEP（图上真有绕行成本）。

### 3.2 H1 的 15 条：距离分布

| 距离 | 条数 | 边号（按 `edges-H1.jsonl` 行序） |
|---|---|---|
| `d=1`（已有其他边直连） | 2 | 06（已有 `implies`，edges-A2-s1）、09（已有 `part-of`，edges-A2-s2） |
| `d=2` | 9 | 01、02、03、04、07、08、10、14、15 |
| `d=3` | 3 | 05、11、13 |
| `d=4` | 1 | 12 |
| 合计 | 15 | — |

按 `sections` 交集分：**同节 11 条**（01,02,04,05,06,09,10,11,12,14,15），**跨节 4 条**（03: 15.06↔15.08；07: 15.13↔15.14；08: 15.11↔15.07；13: 15.15↔15.08）。**跨章 0 条** —— H1 按定义只做章内。

按结构关系分：**同父 2 条**（02 父 `apostol:theorem-15-7`；10 父 `d:gram-schmidt-inductive-step-defines-y-r-plus-one`），**已有直连边 2 条**，**无共享邻居 4 条**（05、11、12、13）。

结论：H1 的重心明显偏近 —— **15 条里 13 条的两端在图上相距 ≤2 步，11 条同节**。存活的 6 条正是分布的远尾：d=3 三条（05、11、13）、d=4 一条（12）全部存活，另加两条跨节 d=2（03、08）。

### 3.3 H2 的 19 条：距离全为 `None`

19 条边的 BFS 结果全部是"6 步内不可达"。原因不是它们连了远处，而是**它们连的是本批新造的孤立节点**：11 个 ext 节点在 H2 之外的任何边文件里都不出现，所以在剔除 H2 后的图上它们是孤立点，距离必然为无穷。

这使 `d` 对 H2 失去判别力，改用两项替代信号：

- **节点是否存活**（边不能比它的端点更有价值）。19 条中 15 条的端点已判 KILL。
- **父子并行**：H2 里有 6 组"同一委派事实挂两条边，一条从 L1 定理出发、一条从它的 `d:` 子节点出发"。核对 `parent` 字段确认了每一组的两个 src 恰是父子（如 `apostol:theorem-15-5` 与 `d:thm-15-5-proof-delegated-to-theorem-12-8`；`apostol:legendre-polynomials` 与 `d:legendre-normalizing-constant-from-y-n-to-p-n`；`apostol:independent-set` 与 `apostol:dependent-set` 之间另有 `contrasts` 直连，d=1）。父子之间 d=1，第二条边的导航增益为零，只需保留一条。

按 `sections` 交集分，H2 的 19 条**全部同节**（ext 节点的 `sections` 抄自引用语所在的第15章小节）。这是一个记账特征而非内容特征：这些边的内容确实跨章，但图上两端被登记在同一小节里，所以**用 sections 判"跨章"对 H2 完全失效**，只有节点存活性和父子并行两项可用。

## §4 哪些辨析是真需求，哪些是为了凑对比

### 4.1 真需求（6 条，全部存活）

- **H1-03** `d:spanning-set-may-be-infinite` ↔ `d:infinite-dimensional-operational-criterion-no-finite-spanning-set`：d=2 跨节（15.06→15.08），唯一共享枢纽 `apostol:spanning-set` 太泛，不承载"有张成集 ≠ 有有限张成集"。原文 15.08 例4 一句话里两者同时成立与不成立，是自带反例的辨析。
- **H1-05** `d:s-perp-is-defined-for-an-arbitrary-subset` ↔ `d:orthogonal-complement-is-a-name-reserved-for-subspaces`：d=3、无共享邻居、两父不同（`apostol:orthogonal-to-a-set` vs `apostol:orthogonal-complement`）。D 层把 15.14 同一句话的两半拆到了两支下，这条边修补的是真实的 3 步绕行。
- **H1-08** `apostol:theorem-15-10-orthogonal-sets-are-independent` ↔ `apostol:zero-element-forces-dependence`：d=2 但跨四节（15.11↔15.07），中介 `d:15-10-nonzero-hypothesis-is-essential` 在下一层而非并列两端的父节点。"加进 O 仍是正交集却变相依"是会真犯的错。
- **H1-11** `apostol:normalizing-an-element` ↔ `apostol:vanishing-orthogonalized-element-detects-dependence`：d=3、无共享邻居。同节但原文相距约 80 行；归一化要求非零，而 y=O 正是它失效处。
- **H1-12** `d:theorem-15-9-holds-for-every-inner-product` ↔ `d:inner-product-not-unique-on-a-given-space`：**d=4，本批最远**，无共享邻居，同节内相距约 70 行。两端合起来才是范数公理化的要点，单看任一端得不到。
- **H1-13** `apostol:fourier-coefficients` ↔ `apostol:components-relative-to-ordered-basis`：d=3、无共享邻居、跨 15.15↔15.08。形式同构而语义不同（投影系数 vs 基下坐标），是本章最易混的一对。

### 4.2 为凑对比而造（点名）

按"制造痕迹"由重到轻：

1. **H1-07** `apostol:theorem-15-14-orthonormal-basis-exists` ↔ `apostol:theorem-15-15-orthogonal-decomposition`。三个共享枢纽（`apostol:euclidean-space`、`apostol:finite-basis`、`apostol:finite-dimensional-space`），d=2。更直接的证据是它的 `evidence` 只抄了 15.15 的定理头（"THEOREM 15.15. ORTHOGONAL DECOMPOSITION THEOREM. Let V be a Euclidean space and let S be a finite-dimensional subspace of V."）—— 这句话陈述 15.15 的前提，**没有任何一处把它与 15.14 对立起来**。产出者报告承认这两者的关系是"有限维加在谁身上"，那是前提依赖的差别，不是混淆。
2. **H1-06** `apostol:theorem-15-13-orthogonalization-theorem` ↔ `apostol:theorem-15-14-orthonormal-basis-exists`。d=1，两者已有 `implies` 直连边。产出者在否决清单里以"已有 `requires` 边"为由否决了 15.15↔15.16，却对本条已有的 `implies` 边不作检查 —— 同一标准没有一致执行。
3. **H1-09** `apostol:projection-along-an-element` ↔ `apostol:projection-on-a-subspace`。d=1，已有 `part-of` 直连边（edges-A2-s2）。同上，重复连接。
4. **H1-02** 与 **H1-10**：同父兄弟。前者是定理 15.7 的 (a)(b) 两半，后者是 Gram-Schmidt 归纳步同一公式的两个分支。两个父节点的 statement 都已把两半并列，`contrasts` 只是把父节点里已经并排的两行再连一次。
5. **H1-14** 与 **H1-15**：都经 `apostol:independent-set` / `apostol:dependent-set` 到达，而这两个节点之间已有 `contrasts` 直连（edges-A1，d=1）。H1-14 的 evidence 自陈两端"logically equivalent" —— 等价陈述不构成辨析增益。H1-15 连的是"例子↔它所属定义的对立面"，属层级关系而非易混对。
6. **H1-01** `d:independence-of-the-empty-set` ↔ `apostol:zero-element-forces-dependence`：混淆点本身是真的（两个直觉都反），但 15.07 例3/例4 在原文第 23/25 行紧邻，且共享枢纽 `x:zero-element-destroys-independence` 已专门承载这条对立。**这是本批唯一一条"内容真、位置太近"的边** —— 杀它是导航判据的结果，不是说产出者看错了。
7. **H1-04** `apostol:dimension` ↔ `apostol:spanning-set`：d=2 经 `apostol:finite-basis`，而 finite-basis 的定义正是"独立 + 张成"把两者绑在一起；两端又都登记在 15.08。且 evidence 讲的是"不同集合可张成同一子空间",与"维数 vs 张成集大小"不完全对位。

H2 一侧的凑数痕迹不在"造对比"，而在**父子并行**：6 组边把同一句委派挂两次（L1 定理一条、它的 `d:` 子节点一条）。这不是恶意填充，是产出者想让两个粒度都可达；但两端 d=1，第二条是纯冗余。

## §5 两份产出者报告的辩护：哪些是循环论证

先说公道话：这两份报告的辩护质量高于本实验此前几轮。`横向-章内辨析.md` 的 15 段每一段都给出**一个可检验的错误结论**（往往带具体数值反例，如 15.10 例2 的内积下 `(1,1) → 3e₁ + 2e₂ = (3,2)`），这不是"它们需要辨析所以需要辨析"。`横向-跨章回指.md` 甚至主动更正了任务提示词的一处事实错误（§3.0：C-S 是被外包的，不是被重证的），并主动披露了两处重叠风险。以下三条是仍站不住的地方。

### 5.1 H-back：节点存在性的论证是纯计数，从头到尾没有增益论证（本批最实质的循环）

`横向-跨章回指.md` 的全部论证结构是：

> **15 处借用点**，分两类来源：13 处有明确引用语（点名了外部位置），2 处是无出处的静默借用。（§1）
> 因此 15 处借用点 → 11 个 ext 节点（§1.3 后一行）

"借用点"的判定标准是**第15章有一句引用语**。节点存在的理由是"这里是一处借用点"。合起来就是：*有引用语 ⇒ 有借用点 ⇒ 有节点*。这条链里没有任何一步问过"这个节点提供了图上别处得不到的什么"。报告 §2 那张"真外包 vs 记号沿用"表也一样，它是**分类**，不是增益论证 —— 分得再准也不能回答"D 层已经有一个孪生节点了，为什么还要这一个"。

这就是本批 7 个节点 KILL 的根源：产出者按第15章的**引用语数目**决定节点数目，而 D 层已经按第15章的**委派事实**建过一遍节点。两次抽取的对象是同一批句子。产出者在 §1.3 里确实为三处"零逻辑负载"的引用语忍住了没建节点，判据是"建节点属填充"——**这个判据是对的，只是没有对另外 11 处执行**，因为它检查的是"引用语有没有逻辑负载"，而不是"这个负载有没有已被别的节点承载"。

### 5.2 H-in：邻近性从未有否决权

`横向-章内辨析.md` 开篇的收录标准是：

> 收录标准：混淆这两个节点必须导出一个**具体的**错误结论或漏掉一个**必要前提**；只是"名字像""同一节出现"的候选一律否决

注意这句话的逻辑：邻近（"同一节出现"）只在候选**没有**误用后果时才起否决作用。一旦给出了误用后果，邻近性就不再被检查。于是 15 条边里 11 条同节、2 条已有直连边 —— 而报告里没有一段提到过"这两端在图上已经相邻"。这不是循环论证，是**判据缺项**：产出者用"混淆会不会出错"筛内容真伪，从未用"读者要不要这条边才能发现这个混淆"筛导航价值。

同一份报告的否决清单证明产出者**具备**这项能力，只是没有一致执行：

> `apostol:theorem-15-15-orthogonal-decomposition` || `apostol:theorem-15-16-approximation-theorem`：两者已有 `requires` 边，且找不到"混淆它们"产生的独立错误结论

这里"已有 `requires` 边"被当成否决理由。但 H1-06（已有 `implies` 边）与 H1-09（已有 `part-of` 边）就在正文里被收录了。**同一条标准，在否决清单里用了，在收录清单里没用。**

### 5.3 H1-07 的辩护：误用后果只涉及一端，与另一端无关

> 混淆点：有限维这个条件加在**谁**身上。15.14 要求整个空间 V 有限维；15.15 只要求子空间 S 有限维……误用后果：把 15.15 的前提抬到整个空间，就会认为 V 无限维时不能做正交分解

这段描述的错误是**读者单独误读 15.15 的假设**造成的 —— 把"S 有限维"错记成"V 有限维"。它不需要 15.14 在场就会发生，也不会因为知道 15.14 而被避免（知道 15.14 要求 V 有限维，反而更容易把这个要求带进 15.15）。所以这条边即使按产出者自己的标准也不成立：误用后果不是"混淆这两个节点"导出的。这条边的 `evidence` 只抄了 15.15 的定理头，也印证了这一点 —— 引文里没有对立。

### 5.4 一处需要记录的反向情况

`横向-跨章回指.md` §2.3 为 `apostol:ext-chapter-12-finite-dependence-definition` 给出的定位是：

> 它是"读者可核对"级别的桥接声明，**不承重**。

按产出者自己的说法，这个节点不承载任何推理。我仍然判了 KEEP，但理由与产出者给的不同：增益在于"一致性只被断言、第15章从未核对"这一**警示**在图上无其他路径可达。也就是说，这个节点活下来靠的是产出者报告里没写出来的那半句。同理，`apostol:ext-vn-as-a-prior-vector-space` 的 `origin_note` 主动写了"若审计认为二者重合可判 KILL"，我照此判了 KILL —— 产出者的自我披露在这两处都比它的正面辩护更有用。

## §6 覆盖反面：真正易混、但这批产出没有连的第15章概念对

方法：先从 L1 的 63 个 Apostol 节点里列出所有"形式相近或共用词汇"的候选对，再用 §3.1 的脚本（这次**包含** H1/H2 与全部 96 条既有 `contrasts`）算距离、查直连边，只保留"无直连、d>=2、且混淆能导出具体错误结论"的。共 5 对，按重要性排序。id 均逐字复制。

### 6.1 `apostol:theorem-15-11-components-relative-to-an-orthogonal-basis` ↔ `apostol:components-relative-to-ordered-basis`

d=2，无直连边，跨 15.11↔15.08。**这是本章最该连而没连的一对。**

15.08 的分量定义要求解线性方程组才能求出 c_i（`x = Σ c_i e_i`，未知数是 c_i）；15.11 给出的是 `c_j = (x, e_j)/(e_j, e_j)` 这个**免解方程组的封闭公式**，而它成立的前提是基正交。混淆的后果非常具体：对非正交基照用 `(x, e_j)/(e_j, e_j)`。产出者报告在为 H1-12 辩护时给的正是这个错误的一个实例（15.10 例2 的内积下把 `(1,1)` 展成 `3e₁ + 2e₂`），但那条边挂在 `d:theorem-15-9-holds-for-every-inner-product` ↔ `d:inner-product-not-unique-on-a-given-space` 上 —— **误用后果的两个真正当事人（一般基分量 vs 正交基分量公式）之间反而没有边。**

顺带记录：`apostol:theorem-15-11-components-relative-to-an-orthogonal-basis` ↔ `apostol:uniqueness-of-components` 是 d=3、无直连，也属同一片空白（分量唯一 vs 分量怎么算）。

### 6.2 `apostol:independence-of-exponential-functions` ↔ `apostol:homogeneous-de-solution-space`

d=2，无直连边，跨 15.07↔15.03，而误用发生在第三处（15.08 例3）。

15.07 例7 证的是"n 个互不相同指数的指数函数**独立**"；15.08 例3 用 `e^{-x}, e^{3x}` 作为解空间的**基**，并断言"Every solution is a linear combination of these two"。独立 ≠ 基，缺的是张成那一半，而张成正是第15章从未证明也未标出处的部分（本批存活节点 `apostol:ext-uncited-dimension-of-a-second-order-de-solution-space` 说的就是这个洞）。误用后果：以为 15.07 例7 已经把 15.08 例3 证完，于是相信只要凑出 k 个不同指数就得到 k 维解空间 —— 对二阶方程取三个指数即得"3 维解空间"，错误结论。

**这一对最值得注意的地方**：H2 已经识别出这个洞并建了节点，H1 负责连章内的易混对，但两批产出**都没有把 15.07 例7 与 15.03 例12 连起来**。洞被记录了，通往洞的两条路没有接通。

### 6.3 `apostol:euclidean-space` ↔ `apostol:linear-space`

d=3，无直连边，跨 15.10↔15.01/15.02。

"Euclidean space"在第15章是**线性空间 + 一个选定的内积**，不是线性空间的一种性质。`d:inner-product-not-unique-on-a-given-space` 的 statement 把这一点说得很清楚（"'Euclidean space' 是线性空间连同一个选定的内积，不是线性空间本身的性质"），但它与 `apostol:euclidean-space` 之间 d=2、也没有边。误用后果：把"欧氏空间"当成某类线性空间，于是问"V₂ 是不是欧氏空间"这种没有唯一答案的问题，并默认 V₂ 上正交性是良定义的 —— 15.10 例2 直接反驳（那个内积下标准基不正交）。

### 6.4 `apostol:orthogonal-complement` ↔ `apostol:linear-span`

d=2，无直连边，跨 15.14↔15.06。

`S⊥⊥ = L(S)`（不是 S）—— 这是 H1-05 的辩护里明确写出的事实：

> 看到"正交补"就以为 S⊥⊥ = S，对非子空间的 S 这是错的（S⊥⊥ = L(S) ⊋ S）

产出者用这个事实为 H1-05 辩护并收录了那条边，但**没有把 `apostol:orthogonal-complement` 与 `apostol:linear-span` 连起来**，而 `L(S)` 才是 S⊥⊥ 实际等于的那个对象。H1-05 连的是 15.14 内部的两个 `d:` 节点，跨到 15.06 的那一步没走。

### 6.5 `apostol:orthogonal-set` ↔ `apostol:finite-basis`

d=2，无直连边，跨 15.11↔15.08。

定理 15.10 的后半句由"n 个非零正交元素"直接给出基的结论，绕过了 `finite-basis` 定义要求的张成验证。误用后果：以为正交性本身蕴含基的地位，于是在 n 维空间里拿到任意正交集（不足 n 个）就当基用。这一对比 H1-08 已收录的那条更贴近误用现场：H1-08 连的是"正交集独立"与"含零元致相依"，处理的是 nonzero 假设；而"正交 ⇒ 基还需要计数到 n"这一步没有边。

### 6.6 一处不是"概念对"的空白，但影响更大

`横向-跨章回指.md` §1.4 列了 15.09 习题24 —— 其中 (c) "Every basis for S is part of a basis for V." 被产出者判定"本质是定理15.7(a) 的应用"，并明确不建节点（理由：这是向读者委派，不是向外章借用）。这个理由对 H2 成立，但结果是**图上没有任何东西记录"子空间的维数性质整体被外派给习题"**。D 层与 H 层都不覆盖它。这不是本批该杀的东西，是一处两批产出都合理地推给了对方的边界地带。

## §7 不确定项

1. **H1-01 是本批最可争议的一条 KILL。** 混淆点（空集独立 vs 含 O 致相依，两个直觉都反）是真实的，误用后果具体（dim{O}=0 失去依据、Gram-Schmidt 归纳起点不成立）。杀它的理由纯是位置：15.07 例3/例4 在原文第 23/25 行紧邻，且共享枢纽 `x:zero-element-destroys-independence` 已专门承载。**如果本实验认为"教材原文相邻"不该成为否决理由，这条应改判 KEEP。** 我按任务书给的导航判据执行，但把分歧点记在这里。

2. **`apostol:ext-theorem-12-2` 的 KILL 依赖一个判断**：我把"第15章未逐条列出12.2 的性质"归为边的 `rel_note` 内容而非节点增益。反对意见成立的话（"读者需要知道被引入证明的前提集是一份第15章从未展开的清单"），它应与另外三个 `ext-uncited-*`/`ext-volume-2-*` 同属警示型节点而存活。我倾向 KILL 是因为它的警示性弱于那三个：12.2 的性质**确实**在 15.10 以公理形式被重新给出了，读者手上不缺东西。

3. **父子并行边我一律只留一条，留的是内容更贴近的那条**，但没有统一规则决定该留父还是留子。H2-16 我留了从 L1 节点 `apostol:legendre-polynomials` 出发的那条（origin=source 有引文），杀了从 `d:` 子节点出发的（origin=model 无引文）；H2-13 我留了从 `apostol:independent-set` 出发的、杀了 `apostol:dependent-set`，这一处的取舍是任意的，两者对称。

4. **ext 节点的 sections 记账问题不在我职责内但影响了我的方法。** 11 个 ext 节点的 `sections` 填的是第15章引用语所在小节，不是外部内容的所在处。这使"跨章"在图上完全不可见 —— 按 sections 判，19 条 H2 边全是同节边。我改用了节点存活性和父子并行两项替代信号，但如果后续要对 H2 做真正的距离分析，需要先解决这个记账方式。

5. **`apostol:ext-` 前缀不在 SPEC 的 id 命名空间表内**（产出者已在报告 §0 自陈）。这属于 schema 合规问题，是审计 A 的范围，我不判；但若这 11 个 id 整体改名，本批裁决文件里的 id 需同步更新。

6. **§6 的 5 对是我在 L1 的 63 个 Apostol 节点范围内枚举出来的**，没有把 D 层的数百个 `d:` 节点两两配对扫一遍（组合量过大）。D 层内部可能还有同类空白，特别是 15.11/15.15 一带（Parseval、三角函数系、Fourier 系数三者之间）。这是已知的覆盖不全，如实记录。

## §8 自查：id 是否逐字复制

全部 id 由脚本从源数据文件读出后直接写入裁决文件，**没有任何一处手打**。写完后另跑一次核对脚本：

- `report/audit-B6-H-verdicts.jsonl`：11 行。`[r["id"] for r in verdicts] == [o["id"] for o in nodes-H2.jsonl]` → **True**（顺序与逐字均一致）。
- `report/audit-B6-H-edges-verdicts.jsonl`：34 行。每行的 `(src, rel, dst)` 三元组回到它声明的 `file` 里查找，**mismatch = 0**。
- 行数与顺序：前 15 行 `file` 为 `edges-H1.jsonl`，后 19 行为 `edges-H2.jsonl`，与任务书要求的次序一致。
- 计数复核：节点 KEEP 4 / KILL 7；边 H1 KEEP 6 / KILL 9，H2 KEEP 4 / KILL 15。与 §1 表格一致。

本报告正文中出现的 id 也全部来自脚本输出的复制粘贴，未凭记忆重写。

### 附：本轮未做的事（不静默截断）

- 未判任何数学对错、锚点真假、边方向合规性（职责之外，由正交审计负责）。
- 未读 `report/` 下任何 `audit-*` 文件，未读 `M08实验-Apostol微积分卷1/`。
- 未修改 `data/` 下任何文件。
- `data/edges-H1.jsonl` 的 15 条与 `data/edges-H2.jsonl` 的 19 条、`data/nodes-H2.jsonl` 的 11 条全部逐条判过，无遗漏、无抽样。





