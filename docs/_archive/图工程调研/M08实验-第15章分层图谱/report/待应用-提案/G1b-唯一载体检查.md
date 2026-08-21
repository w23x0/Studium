# G1b 唯一载体检查

只读分析代理产出。**这是提案，不是执行结果**，未写任何 `data/` 文件。

## 〇 结论速览

口径声明：本节所有数字按 A1 §0 的 **21 条实际待杀**（22 候选减去已撤出的
`d:for-function-spaces-closure-is-the-only-real-content`）计算。另按「21 + 维持的 3 条 = 24 条」
重算过一遍，**结果完全相同**（见 §一 末尾的 K24 复核），所以本轮结论不依赖两种口径的选择。

| 项 | 结果 |
|---|---|
| 22 个候选持有的锚点总数 | 27 条（`anchors.tsv` 按 id 计数；16 个候选各 1 条、6 个各 2 条） |
| 逐字同 (file,quote) 仍有存活持有者 | 15 条（可安全丢弃） |
| 逐字持有者全灭 | **12 条** |
| ├ 被存活侧更长引文完整含住（CONTAINED） | 3 条 |
| ├ 仅差末尾句点即被含住（NEAR） | 1 条 |
| └ **彻底掉出图谱** | **8 条**（其中 1 条为部分损失，见下） |
| 彻底掉出的 8 条涉及的候选 id 数 | **6 个** |
| 因此再无任何持有者的**源行数** | **4 行**（全在 `15.12-exercises.md`） |
| 另有：只挂在将死边上、无锚点对应的引文 | **1 条**（`edges-D1.jsonl:219`，76 字符） |

**与 A1 §2.2 的关系**：A1 报「6 节点、9 条引文 LOST」。本轮独立复算得到的**节点数一致（6 个）**，
条数也是 9，但**构成不同**：本轮把 8 条判给节点锚点、第 9 条判给一条将死边上的独立引文
（`By unifying diverse examples in this way we gain a deeper insight into each.`，76 字符，
`15.03.md`，唯一持有者 `edges-D1.jsonl:219`，该边 src 是候选 `d:knowledge-of-one-example-guides-work-in-the-others`）。
并且本轮认定 8 条里有 1 条只是**部分损失**（`d:operations-of-example-2-...`，见 §二）。
差异不构成矛盾，但两份提案的「9 条」不是同一个 9 条，综合裁决时须按 id 逐条对齐，不要相加。

死因编号：本节全部为 **0（无死因、仅需 FIX 或附加重挂动作）**——唯一载体是**执行安全问题**，
不是节点自身的质量缺陷，不新增死因。

## 一 逐候选的引文归属表

判定口径（三点，避免过报）：
1. 「其它持有者」取自 `shared-quotes.tsv` 的 `holders` 列，逐个判存活：`node:` 持有者看 id 是否在待杀集；
   `edge:` 持有者看该边的 **src 或 dst 任一端在待杀集即算随节点进墓地**（`edges.tsv` 的 src/dst 列）。
   只看 `n_holders` 会高报存活——多数候选的「其它持有者」正是它自己发出的 part-of 边。
2. 候选的某条 quote 若在 `shared-quotes.tsv` 查不到，则 `n_holders=1`，即它自己是唯一持有者。
3. 逐字持有者全灭后，再做一道**包含式**复核（空白归一后的子串判定），在存活侧的
   节点锚点 ∪ 边证据里找是否有更长引文含住它。含住即无内容损失。

`唯一载体` 列含义：**是** = 逐字持有者全灭且未被存活侧含住；**含住** = 全灭但被含住；
**否** = 仍有存活持有者。「存活持有者」列只列存活的，死掉的不列。

| # | 候选 id | 锚点 | 源文件 | 字符数 | n_holders | 存活持有者 | 唯一载体 |
|---|---|---|---|---|---|---|---|
| 1 | `d:nature-of-the-elements-is-left-unspecified` | #0 | 15.01.md | 135 | 2 | 无（另一持有者是自身 part-of 边 `edges-D1.jsonl:2`） | **是** |
| 2 | `d:axioms-replace-a-construction-with-required-properties` | #0 | 15.01.md | 107 | 2 | 无（`edges-D1.jsonl:4` 同死） | **是** |
| 3 | `d:only-axiom-1-states-that-the-result-is-unique` | #0 | 15.02.md | 160 | 4 | `node:d:axiom-1-closure-under-addition`、`node:d:example-4-nontrivial-check-...`、`edge:edges-D1.jsonl:13` | 否 |
| 3 | 同上 | #1 | 15.02.md | 175 | 5 | `node:apostol:closure-axioms`、`node:d:axiom-2-closure-...`、2 条存活边 | 否 |
| 4 | `d:axiom-5-states-the-zero-only-as-a-right-neutral-element` | #0 | 15.02.md | 36 | 5 | `node:d:axiom-5-existence-of-zero-element`、`node:d:thm-15-2-left-neutrality-...` | 否 |
| 4 | 同上 | #1 | 15.04.md | 88 | 4 | `node:d:thm-15-2-left-neutrality-...`、`node:d:thm-15-2-same-sum-...`、`edge:edges-D5.jsonl:2` | 否 |
| 5 | `d:real-in-real-linear-space-refers-to-the-scalars` | #0 | 15.02.md | 153 | 4 | `node:apostol:real-linear-space`、`edge:inherited/edges-A1.jsonl:9` | 否 |
| 5 | 同上 | #1 | 15.03.md | 108 | 6 | `node:d:example-2-the-complex-numbers-with-real-scalars`、`edge:edges-D1.jsonl:113` | 否 |
| 6 | `d:thm-15-3-quantifiers-arbitrary-elements-and-arbitrary-scalars` | #0 | 15.04.md | 126 | 3 | `edge:inherited/edges-A1.jsonl:31`（逐字同引文） | 否 |
| 7 | `d:proof-b-mirrors-proof-a-with-axiom-8` | #0 | 15.04.md | 64 | 7 | `node:d:thm-15-3b-every-scalar-annihilates-the-zero-element` + 2 条存活边 | 否 |
| 8 | `d:operations-of-example-1-are-ordinary-arithmetic` | #0 | 15.03.md | 77 | 2 | 无（`edges-D1.jsonl:109` 同死） | 含住（144 字符 EXAMPLE 1 整句，持有者 `d:example-1-the-real-numbers-form-a-linear-space`） |
| 9 | `d:operations-of-example-2-complex-addition-and-real-scaling` | #0 | 15.03.md | 139 | 3 | 无（`edges-D1.jsonl:115`、`:116` 同死） | **是（部分）** |
| 10 | `d:example-2-shows-the-scalars-decide-real-or-complex` | #0 | 15.03.md | 108 | 6 | `node:d:example-2-the-complex-numbers-with-real-scalars`、`edge:edges-D1.jsonl:113` | 否 |
| 11 | `d:operations-of-example-3-are-componentwise` | #0 | 15.03.md | 92 | 4 | 无（4 个持有者中 2 节点皆候选、2 边皆同死） | 含住（171 字符 EXAMPLE 3 整句） |
| 12 | `d:example-3-verification-reduces-to-arithmetic-in-each-component` | #0 | 15.03.md | 92 | 4 | 同上，同一条 92 字符引文 | 含住（同上） |
| 13 | `d:operations-of-example-4-are-inherited-from-v-n` | #0 | 15.03.md | 82 | 5 | `node:d:example-4-nontrivial-check-...` + 2 条存活边 | 否 |
| 14 | `d:function-space-addition-is-pointwise` | #0 | 15.03.md | 109 | 4 | `node:d:function-space-axioms-reduce-pointwise-...` | 否 |
| 15 | `d:function-space-scalar-multiple-is-pointwise` | #0 | 15.03.md | 146 | 6 | `node:apostol:function-space`、`node:d:function-space-axioms-reduce-...` | 否 |
| ~~16~~ | ~~`d:for-function-spaces-closure-is-the-only-real-content`~~ 已撤出 | #0 | 15.03.md | 115 | 16 | 15 个（不杀，无需处置） | 否 |
| 17 | `d:notation-c-a-b-for-continuous-functions-on-a-b` | #0 | 15.03.md | 65 | 2 | 无（`edges-D1.jsonl:194` 同死） | NEAR（131 字符引文只差末句点，持有者 `apostol:space-of-continuous-functions`） |
| 18 | `d:linear-space-concept-permeates-algebra-geometry-analysis` | #0 | 15.03.md | 113 | 3 | `node:d:one-proof-from-the-axioms-serves-every-example` | 否 |
| 19 | `d:knowledge-of-one-example-guides-work-in-the-others` | #0 | 15.03.md | 182 | 2 | 无（`edges-D1.jsonl:218` 同死） | **是** |
| 20 | `apostol:cx-law-of-cosines-needs-nonzero-elements` | #0 | 15.12-exercises.md | 85 | 3 | 无（`edges-A2-x2.jsonl:29`、`:30` 皆以本节点为 src） | **是** |
| 20 | 同上 | #1 | 15.12-exercises.md | 83 | 1 | 无（表中查不到，唯一持有者） | **是** |
| 21 | `apostol:cx-single-point-evaluation-is-degenerate` | #0 | 15.12-exercises.md | 145 | 5 | `node:apostol:cx-derivative-pairing-is-blind-to-constants` | 否 |
| 22 | `apostol:cx-absolute-value-and-product-of-integrals-on-polynomials` | #0 | 15.12-exercises.md | 47 | 1 | 无 | **是** |
| 22 | 同上 | #1 | 15.12-exercises.md | 99 | 1 | 无 | **是** |

字符数全部取自 `anchors.tsv` 的 charlen 列（实测值，转义前）；27 条锚点无一含换行（`has_nl=0`）。

**K24 复核**：把维持的 3 条 KILL（`d:example-1-verification-is-the-field-axioms-of-r`、
`d:function-space-zero-is-the-everywhere-zero-function`、`d:degree-exactly-n-is-not-a-subspace-of-degree-at-most-n`）
一并加入待杀集后重跑，上表 27 行的判定**逐行不变**。原因：第 8 行的含住者是
`d:example-1-the-real-numbers-form-a-linear-space`（KEEP），不是同名的 `-verification-` 那条，
虽然后者也持同一条 144 字符引文，但它不是唯一存活含住者。**A1 §2.1 对 A 的裁定不受本轮影响。**

**锚点轴互证塌缩（本轮机械筛出 2 对）**：
- `d:operations-of-example-3-are-componentwise` ↔ `d:example-3-verification-reduces-to-arithmetic-in-each-component`
  共用同一条 92 字符引文，两者皆在候选内，**同引文的存活节点数为 0** ——这正是简报要的锚点轴形态。
  但被 171 字符的 EXAMPLE 3 整句含住（持有者 `d:example-3-v-n-with-componentwise-operations` 与
  `apostol:v-n-space`，皆 KEEP），**不产生损失**。与 A1 对 C 的裁定一致。
- `d:real-in-real-linear-space-refers-to-the-scalars` ↔ `d:example-2-shows-the-scalars-decide-real-or-complex`
  共用同一条 108 字符引文，两者皆在候选内，但第三持有者
  `d:example-2-the-complex-numbers-with-real-scalars`（KEEP）逐字持有同一条，**不产生损失**。
  与 A1 对 B 的裁定一致。

## 二 会彻底掉出图谱的引文清单

按源文件与行号排序。「掉的是哪半句」逐条用 `source-lines.tsv` 的 `n_sentence_end` 核过：
`n_sentence_end>1` 的行**不得按行号算覆盖**（过报通道 b），所以下面对多句行只报「掉哪一句」，
不报「掉整行」。

### 15.01.md:5（charlen=449，n_sentence_end=**4**，四句同一行）

该行四句依次为：①`Briefly, a linear space is a set of elements of any kind ...`（150 字符）、
②`In defining a linear space, we do not specify the nature ...`（135 字符）、
③`Instead, we require that the operations have certain properties ...`（107 字符）、
④`We turn now to a detailed description of these axioms.`（54 字符）。

| 掉出的引文 | 字符数 | 唯一载体 | 掉的是 |
|---|---|---|---|
| `In defining a linear space, we do not specify the nature of the elements nor do we tell how the operations are to be performed on them.` | 135 | `d:nature-of-the-elements-is-left-unspecified` | 第 ② 句，整句 |
| `Instead, we require that the operations have certain properties which we take as axioms for a linear space.` | 107 | `d:axioms-replace-a-construction-with-required-properties` | 第 ③ 句，整句 |

① 与 ④ 在删除后仍有存活持有者（① 由 `apostol:linear-space` 与
`d:linear-space-is-a-set-together-with-two-operations` 逐字持有）。所以**该行不会整行掉出**，
掉的是中间两句——恰好是 Apostol 讲「不构造、改用公理」这一步的两句。
按行号比对会把这两句判成「已覆盖」（因为 ①④ 在），这是过报通道 b 的实例。

### 15.03.md:7（charlen=302，n_sentence_end=**3**）—— 部分损失

| 掉出的引文 | 字符数 | 唯一载体 | 掉的是 |
|---|---|---|---|
| `define $x + y$ to be ordinary addition of complex numbers, and define ax to be multiplication of the complex number x by the real number a.` | 139 | `d:operations-of-example-2-complex-addition-and-real-scaling` | 见下，**半句** |

存活的 `d:example-2-the-complex-numbers-with-real-scalars` 持一条 111 字符引文
`EXAMPLE 2. Let V = C, the set of all complex numbers, define $x + y$ to be ordinary addition of complex numbers`，
它含住死者引文的**前 57 字符**（`define $x + y$ to be ordinary addition of complex numbers`），
但在此处截断。真正掉出图谱的是尾段
`and define ax to be multiplication of the complex number x by the real number a.`（**80 字符，本轮新构造并实测**），
即「标量乘法怎么定义」那半句。第三句（108 字符，`Even though the elements of V are complex numbers ...`）不受影响。

### 15.03.md:27（charlen=133，n_sentence_end=3）—— 不损失，仅登记

`If the interval is $[a, b]$ , we denote this space by $C(a, b)$ .`（65 字符）逐字持有者全灭，
但被 `apostol:space-of-continuous-functions` 的 131 字符锚点整句含住，**只差末尾句点**。
与 A1 §2.2 的 NEAR 结论一致，**不计入损失**。

### 15.03.md:37（charlen=502，n_sentence_end=**4**，四句同一行）

| 掉出的引文 | 字符数 | 唯一载体 | 掉的是 |
|---|---|---|---|
| `Sometimes special knowledge of one particular example helps to anticipate or interpret results valid for other examples and reveals relationships which might otherwise escape notice.` | 182 | `d:knowledge-of-one-example-guides-work-in-the-others`（锚点 #0） | 第 ④ 句，整句 |
| `By unifying diverse examples in this way we gain a deeper insight into each.` | 76 | 同节点发出的边 `edges-D1.jsonl:219`（无对应锚点） | 第 ③ 句，整句 |

第 ① 句（113 字符，permeates 那句）由存活的 `d:one-proof-from-the-axioms-serves-every-example`
逐字持有；第 ② 句（128 字符）另有存活持有者。所以该行也**不会整行掉出**，掉的是后两句。
第 ③ 句是本轮独立发现、只挂在将死边上的引文，A1 §2.2 的节点锚点口径看不见它。

### 15.12-exercises.md —— **唯一四条会整行掉出的源行**

| 行 | charlen | n_sent_end | 掉出的引文 | 字符数 | 唯一载体 | 掉的是 |
|---|---|---|---|---|---|---|
| :39 | 85 | 1 | `7. If $x$ and $y$ are nonzero elements making an angle $\theta$ with each other, then` | 85 | `apostol:cx-law-of-cosines-needs-nonzero-elements` #0 | 整行 |
| :42 | 83 | 1 | `\| x - y \| ^ {2} = \| x \| ^ {2} + \| y \| ^ {2} - 2 \| x \| \| y \| \cos \theta .` | 83 | 同上 #1 | 整行 |
| :91 | 47 | 0 | `(b) $(f,g) = \left|\int_0^1 f(t)g(t)dt\right|.$` | 47 | `apostol:cx-absolute-value-and-product-of-integrals-on-polynomials` #0 | 整行 |
| :94 | 99 | 1 | `\text {(d)} (f, g) = \left(\int_ {0} ^ {1} f (t) d t\right) \left(\int_ {0} ^ {1} g (t) d t\right).` | 99 | 同上 #1 | 整行 |

四行 `n_sentence_end ≤ 1`，且删除后该行**再无任何持有者**（逐行核过整个存活证据集），
所以这里可以按行号说「整行掉出」，不触发过报通道 b。

**全图口径复核**：删除前有 505 条源行被至少一条存活引文覆盖，删除后 501 条，
新失覆盖的正是上面这 4 行。**这是唯一的行级损失。**（其余损失都发生在多句行内部，
行级口径看不见——这正说明行级覆盖率不能当内容损失的度量。）
去重后的不同 (file,quote) 数由 875 降至 861，即 14 条引文离开全图；
其中 8 条属候选锚点（1 条部分）、其余为随边一同进墓地的边证据。

**内容后果**：`15.12-exercises.md:39/41-43` 是练习 7 的**全文**（题干 + 公式，`:41`/`:43` 是 `$$` 定界符），
`:91` 与 `:94` 是练习 12 的 (b)(d) 两小问。删掉这两个节点，练习 7 整题、练习 12 的两个反例
**在图谱里再无任何痕迹**。注：练习 12(a)（`:87`，24 字符）当前本来就无任何持有者，
是**删除前就已存在的缺口**，不由本批造成。

死因编号 0（无死因）；证据：`anchors.tsv`、`shared-quotes.tsv`、`edges.tsv`、`source-lines.tsv` 逐条比对。

## 三 因内容损失而应降级为 FIX 的候选

分两档。**第 1 档：建议降级为 FIX**（把「唯一载体」当节点的存在理由，不删）；
**第 2 档：可杀，但必须先把引文重挂到指定存活节点**（附条件 KILL，`apply_kills.py` 裸跑会静默丢内容）。
两档都不改判死因——B2 判它们冗余的理由（内容已在别处）本轮未推翻，只是**引文没跟着内容一起在别处**。

### 第 1 档：降级为 FIX —— 2 个候选

| 候选 id | 唯一持有的引文 | 理由 | 建议动作 | 置信度 |
|---|---|---|---|---|
| `apostol:cx-law-of-cosines-needs-nonzero-elements` | 85 + 83 字符（练习 7 全文） | 删掉后练习 7 整题掉出图谱，且**无任何存活节点覆盖该题**——不是记账位置问题，是内容彻底消失 | **FIX**（保留节点，按 B2 的 reason 改写 statement），或至少改为「先重挂到 `apostol:angle-between-two-elements` 再杀」 | 高 |
| `apostol:cx-absolute-value-and-product-of-integrals-on-polynomials` | 47 + 99 字符（练习 12(b)(d)） | 同上，两个反例公式无存活覆盖。它自身 `n_holders=1`，连自己发出的边都没引这两条 | **FIX**，或改为「先重挂到 `apostol:cx-inner-product-axiom-diagnosis` 再杀」 | 高 |

选 FIX 而不是「重挂后杀」的理由：这两个节点的引文是**练习原文**，不是导出式复述。
第 15 章的练习节点体系里（`nodes-A2-x2.jsonl`）它们各自对应一道独立练习，
删掉后接手方（`apostol:angle-between-two-elements` / `apostol:cx-inner-product-axiom-diagnosis`）
的 statement 讲的是概念，不是这道题，重挂会造成锚点盲区 A/D 型（引文与断言错配）。
**这一判断有主观成分**，若主控偏好保持 KILL 数不变，走「重挂后杀」也可，但必须显式重挂。

### 第 2 档：可杀，但重挂为强制前置 —— 4 个候选、5 条引文

| 候选 id | 引文（字符数） | 建议接手的存活节点 | 依据 |
|---|---|---|---|
| `d:nature-of-the-elements-is-left-unspecified` | 135 | `apostol:linear-space` | 该节点已持同一源行的第 ① 句（150 字符），加挂第 ② 句不引入新语境 |
| `d:axioms-replace-a-construction-with-required-properties` | 107 | `apostol:linear-space` | 同上，第 ③ 句紧接第 ② 句，同一段论证 |
| `d:operations-of-example-2-complex-addition-and-real-scaling` | 尾段 80（新构造实测） | `d:example-2-the-complex-numbers-with-real-scalars` | 它已持前 57 字符，把 111 字符锚点**延长到整句 190 字符**即可，无需新建锚点。延长后字符数仍在 SPEC 30–200 界内（实测 190） |
| `d:knowledge-of-one-example-guides-work-in-the-others` | 182 + 边上 76 | `d:one-proof-from-the-axioms-serves-every-example` 或 `apostol:linear-space` | 前者已持同源行第 ① 句；第 ③ 句（76 字符）现只挂在 `edges-D1.jsonl:219` 上，须一并重挂 |

第 2 档不降级为 FIX 的理由：这 4 条的接手方都在**同一源行**已有锚点，重挂是纯记账操作，
不产生锚点盲区 A/D 型风险。而第 1 档的接手方跨了源位置。

**执行顺序（强制）**：重挂必须在 `apply_kills.py` 之前完成。A1 §0 已把「§2 裁断 + §3.2 重指」
列为前置条件，本节的 5 条重挂应并入同一批前置，否则四层证据池会静默缩小。

### 不需要处置的候选（本节明确排除）

其余 16 个候选（含已撤出的第 16 条）的每一条锚点都满足「有存活持有者」或「被存活侧含住/NEAR」，
**KILL 不产生引文损失**，本节不提改判。其中 `d:notation-c-a-b-for-continuous-functions-on-a-b`
虽逐字持有者全灭，但 NEAR 判定成立，与 A1 §2.2 一致，**不入本节**。

### 未核项（不预测）

- 本节只核**引文归属**，未核这 8 条引文各自是否真正支撑其宿主节点的 statement（死因 6 / 盲区五型）。
  某条引文若本来就不支撑其宿主断言，那么「唯一载体」的分量会下降——**这一层本轮未核**。
- 第 1 档两个节点的 statement 是否另有数学错误（死因 4），未核。
- 重挂后接手节点的 statement 是否需同步改写，未核。
- `15.12-exercises.md:87`（练习 12(a)）当前无持有者一事，是否属别处已登记的问题，未核。

## 顺带发现

- `15.12-exercises.md:87`（练习 12(a)，`(a) $(f,g) = f(1)g(1)$ .`，24 字符）删除前就无任何持有者，是既存覆盖缺口，与本批无关。
- `shared-quotes.tsv` 的 `n_holders` 含节点自己发出的边，直接当「有别人持有」用会系统性高报存活；本轮 22 个候选里有 6 个仅此一项就足以误判。
- 「行级覆盖率」在本批只掉 4 行，却有 14 条引文离开全图——行级指标对多句行内部的损失完全不敏感。
- `d:one-proof-from-the-axioms-serves-every-example` 与 `d:linear-space-concept-permeates-algebra-geometry-analysis` 共用同一条 113 字符引文，前者存活，属正常互备。
- A1 §2.2 与本轮的「9 条」构成不同（本轮 8 条锚点 + 1 条边证据，且 1 条为部分损失），综合裁决时须按 id 对齐而非相加。
