# G1a 22 个 KILL 候选的悬空边清算

只读分析代理产出。**这是提案，不是执行结果**，未写任何 `data/` 文件。
口径全部取自 `tmp_index/edges.tsv`（1433 行）、`nodes.tsv`、`partof.tsv`、`shared-quotes.tsv`，未重扫 `data/`。

## 〇 结论速览

**22 个候选共触及 75 条边：48 条它们作 src（随节点走，不悬空）、24 条存活节点作 src 而 dst 将死（=悬空边）、3 条两端皆死。24 条悬空边里 18 条建议一并删除、6 条必须改接到 `apostol:function-space`；无一条需要阻止 KILL，但有 1 项必须降级为「先改接后杀」的强制前置。**

| 项 | 数 | 说明 |
|---|---|---|
| 22 个 id 作 **src** 的边（含 22 条 part-of 自身） | 48 | B 类，随节点进墓地，存活端不受损 |
| **悬空边**（存活 src → 待删 dst） | **24** | 本文件唯一需处置的对象 |
| 两端皆死（C 类） | 3 | D1:118 / D1:125 / D1:130，无需处置 |
| 悬空边处置：一并删除 | 18 | 全部为「已被 part-of 或存活兄弟覆盖」的冗余 requires/contrasts |
| 悬空边处置：改接到父节点 | **6** | 例 7 / 例 8 / 例 12 各 2 条，新 dst 均为 `apostol:function-space` |
| 因此必须**阻止**的 KILL | **0** | — |
| 必须**降级为「先改接后杀」**的 KILL | **2** | `d:function-space-addition-is-pointwise`、`d:function-space-scalar-multiple-is-pointwise`；裸跑 `apply_kills.py` 会静默丢这 6 条 |

口径与 A1 §0 的差异：A1 记「本批 21 条 → A 类存活者为 src = 24」。本文件对 22 个候选（含 A1 已撤出的 #16）逐 id 数，得同一个 24 —— 因为 #16 `d:for-function-spaces-closure-is-the-only-real-content` 的 dst 边数为 **0**（`edges.tsv` 无任何行以它为 dst），撤不撤出都不改变悬空边总数。这一条可独立执行或独立撤回，与其余 21 条无边耦合。

死因编号：本节所有处置均为 **0（无死因、仅需 FIX/改接）** —— 悬空边本身不是内容错误，是删除操作的副作用。

## 一 逐 id 清算表

「作 src」列含该节点自己那条 part-of（记在 48 里）。「作 dst」列即悬空边数，**两端皆死的 3 条单列**，不计入悬空边。
16 个 id 的作 dst 数为 0 —— 它们删掉后不产生任何悬空边，可直接执行。

| # | id | 作 src | 作 dst（悬空） | 两端皆死 | 悬空边 file:line | 处置 |
|---|---|---|---|---|---|---|
| 1 | `d:nature-of-the-elements-is-left-unspecified` | 1 | **1** | 0 | `edges-D1.jsonl:104` | 一并删除 |
| 2 | `d:axioms-replace-a-construction-with-required-properties` | 1 | 0 | 0 | — | 无悬空，直接执行 |
| 3 | `d:only-axiom-1-states-that-the-result-is-unique` | 3 | 0 | 0 | — | 无悬空，直接执行 |
| 4 | `d:axiom-5-states-the-zero-only-as-a-right-neutral-element` | 3 | **2** | 0 | `edges-CX2.jsonl:22`、`edges-D5.jsonl:9` | 改接到 `apostol:zero-element` |
| 5 | `d:real-in-real-linear-space-refers-to-the-scalars` | 2 | 0 | 1（作 dst） | — | 无悬空，直接执行 |
| 6 | `d:thm-15-3-quantifiers-arbitrary-elements-and-arbitrary-scalars` | 1 | 0 | 0 | — | 无悬空，直接执行 |
| 7 | `d:proof-b-mirrors-proof-a-with-axiom-8` | 3 | 0 | 0 | — | 无悬空，直接执行 |
| 8 | `d:operations-of-example-1-are-ordinary-arithmetic` | 2 | 0 | 0 | — | 无悬空，直接执行 |
| 9 | `d:operations-of-example-2-complex-addition-and-real-scaling` | 2 | 0 | 0 | — | 无悬空，直接执行 |
| 10 | `d:example-2-shows-the-scalars-decide-real-or-complex` | 3 | 0 | 1（作 src） | — | 无悬空，直接执行 |
| 11 | `d:operations-of-example-3-are-componentwise` | 2 | 0 | 2（作 dst） | — | 无悬空，直接执行 |
| 12 | `d:example-3-verification-reduces-to-arithmetic-in-each-component` | 2 | 0 | 1（作 src） | — | 无悬空，直接执行 |
| 13 | `d:operations-of-example-4-are-inherited-from-v-n` | 2 | 0 | 1（作 src） | — | 无悬空，直接执行 |
| 14 | `d:function-space-addition-is-pointwise` | 2 | **10** | 0 | `edges-D1.jsonl:` 141 / 150 / 159 / 163 / 166 / 191 / 196 / 200 / 204 / 210 | 7 删除 + **3 改接** |
| 15 | `d:function-space-scalar-multiple-is-pointwise` | 3 | **9** | 0 | `edges-D1.jsonl:` 151 / 160 / 164 / 167 / 192 / 197 / 201 / 205 / 211 | 6 删除 + **3 改接** |
| ~~16~~ | ~~`d:for-function-spaces-closure-is-the-only-real-content`~~（A1 已撤出） | 4 | **0** | 0 | — | 与本清算无耦合 |
| 17 | `d:notation-c-a-b-for-continuous-functions-on-a-b` | 1 | 0 | 0 | — | 无悬空，直接执行 |
| 18 | `d:linear-space-concept-permeates-algebra-geometry-analysis` | 1 | 0 | 0 | — | 无悬空，直接执行 |
| 19 | `d:knowledge-of-one-example-guides-work-in-the-others` | 2 | 0 | 0 | — | 无悬空，直接执行 |
| 20 | `apostol:cx-law-of-cosines-needs-nonzero-elements` | 4 | 0 | 0 | — | 无悬空，直接执行 |
| 21 | `apostol:cx-single-point-evaluation-is-degenerate` | 2 | **1** | 0 | `edges-A2-x2.jsonl:47` | 一并删除 |
| 22 | `apostol:cx-absolute-value-and-product-of-integrals-on-polynomials` | 2 | **1** | 0 | `edges-A2-x2.jsonl:50` | 改接到 `apostol:cx-derivative-pairing-is-blind-to-constants` |
| | **合计** | **48** | **24** | **3** | | 18 删 + 6 改接 |

### 1.1 理由（只写 6 个有悬空边的 id）

**#14+#15 函数空间双子星，19 条悬空边 —— 处置分两种，取决于 src 的 part-of 父是不是 `apostol:function-space`。**
两个待删节点的 part-of 父都是 `apostol:function-space`（`nodes.tsv`）。19 条悬空边的 src 共 10 个存活节点：
- **7 个 src 自身 part-of `apostol:function-space`**（`edges-D1.jsonl:` 140 / 149 / 158 / 162 / 195 / 199 / 203）：
  `function-space-addition-lives-on-the-intersection-of-domains`、`function-space-axioms-reduce-pointwise-to-facts-about-real-numbers`、例 5、例 6、例 9、例 10、例 11。
  对这 7 个，`requires → 待删节点` 改接成 `requires → apostol:function-space` 会与已有的 `part-of → apostol:function-space` **同源同向重复**，
  且「逐点」这一内容已在父的 statement 里逐字存在（`statements.tsv`：`with (f + g)(x) = f(x) + g(x), with af the function whose value at x is af(x)`）。
  **处置：一并删除这 13 条**（`edges-D1.jsonl:` 141 / 150 / 151 / 159 / 160 / 163 / 164 / 196 / 197 / 200 / 201 / 204 / 205）。
- **3 个 src 的 part-of 父不是 `apostol:function-space`**：例 7 → `apostol:polynomials-of-degree-at-most-n`（`edges-D1.jsonl:165`）、
  例 8 → `apostol:space-of-continuous-functions`（:190）、例 12 → `apostol:homogeneous-de-solution-space`（:209）。
  这三个父与 `apostol:function-space` 之间是 **is-a**（`inherited/edges-A1.jsonl:` 19 / 20 / 21），不是 part-of ——
  按四层证据池定义只有 **part-of 后代** 才入 T3，is-a 链不导通，所以裸删后这三个例子在池里**再也接不到「逐点」**。
  **处置：这 6 条必须改接到 `apostol:function-space`（rel 保持 requires，语义仍成立：例 7/8/12 确实依赖函数空间的逐点运算定义）。**
  可两条合并为一条（同 src、同 rel、同新 dst），合并后共 3 条。

引文侧已核，删除不产生引文损失：`edges-D1.jsonl:141` 的 63 字符 evidence 由存活 src 自身的锚点持有
（`shared-quotes.tsv`，n_holders=3，含 `node:d:function-space-addition-lives-on-the-intersection-of-domains`）；
`:159` 的 109 字符 evidence 另有存活持有者 `node:d:function-space-axioms-reduce-pointwise-to-facts-about-real-numbers`（n_holders=4）；
`:160` 的 146 字符 evidence n_holders=6，存活持有者含 `node:apostol:function-space` 本身。
其余 10 条 `ev_charlen=0`（`edges.tsv` 的 ev_quote 列为空），无引文可失。

**#4 `d:axiom-5-states-the-zero-only-as-a-right-neutral-element`，2 条 —— 改接到 `apostol:zero-element`。**
两条 src 都以「公理 5 只给右中性」为前提：`apostol:cx-a-whole-line-of-right-zeros`（练习 31(c) 有一整条右零元直线）与
`d:thm-15-2-left-neutrality-needs-the-commutative-law`。改接语义成立，因为父 `apostol:zero-element` 的 statement 逐字写着
单侧形式 `with x + O = x for all x in V`（`statements.tsv`），requires 的被依赖内容仍在。
两条 src 各自的 statement 已独立复述「只右不左」这一观察（`statements.tsv` 逐字核过），所以杀掉待删节点不丢内容。
evidence 侧：`edges-D5.jsonl:9` 那条 36 字符 `x + O = x \quad f o r a l l x i n V.` 的持有者共 5 个
（`shared-quotes.tsv`），改接后仍由 `node:d:axiom-5-existence-of-zero-element` 与 src 自身持有。`edges-CX2.jsonl:22` 无 evidence。

**#1 `d:nature-of-the-elements-is-left-unspecified`，1 条 —— 一并删除。**
`edges-D1.jsonl:104` 是 `d:an-example-is-a-set-plus-two-explicit-operations --contrasts-->` 它。
父 `apostol:linear-space` 的 statement 已含该断言逐字对应句（`The nature of the elements and of the operations is not specified; only the axioms are required.`），
但改接后会得到「`an-example-is-a-set-plus-two-explicit-operations` contrasts `apostol:linear-space`」，而前者正是后者的 part-of 子（`edges-D1.jsonl:101`）——
**子与父 contrasts 语义不成立**，故不改接。该边的 138 字符 evidence 由 src 自身锚点持有（`shared-quotes.tsv`，n_holders=4），无引文损失。

**#21 `apostol:cx-single-point-evaluation-is-degenerate`，1 条 —— 一并删除。**
`edges-A2-x2.jsonl:47` 是 `apostol:cx-derivative-pairing-is-blind-to-constants --contrasts-->` 它，origin=model、无 evidence。
该节点无 parent（`nodes.tsv` parent 列空，非 d: 层），**无父可改接**。
改接到它的 is-a 目标 `apostol:cx-sampling-inner-product-on-p-n` 语义不成立：后者是一个合格内积，src 要对比的是「另一种正定性失效方式」，改接会把对比对象换成一个不失效的东西。建议把这一对比并入 src 的 statement 后删边。

**#22 `apostol:cx-absolute-value-and-product-of-integrals-on-polynomials`，1 条 —— 改接到兄弟节点。**
`edges-A2-x2.jsonl:50` 是 `apostol:cx-inner-product-axiom-diagnosis --applies-to-->` 它，origin=source，
145 字符 evidence 是练习 12 的题干，n_holders=5，存活持有者含 `node:apostol:cx-derivative-pairing-is-blind-to-constants`（`shared-quotes.tsv`）。
待删节点同样无 parent。**改接到同属练习 12 的存活节点 `apostol:cx-derivative-pairing-is-blind-to-constants`**：
applies-to 语义成立（「公理诊断适用于练习 12 的这个具体式子」），且该 src 尚无指向它的边（已查其 5 条 src 边，无此 dst，不产生重复）。
置信度中：这是同一道练习内的横向替换，若综合代理认为 applies-to 不宜指向同批另一案例，退化处置为一并删除，代价是练习 12 题干在边层的一个记账位丢失（引文本身不丢）。

## 二 必须阻止或降级为 FIX 的 KILL

**阻止：0 条。** 24 条悬空边全部可删或可改接，无一条的存活 src 会因此失去无法他处获得的内容。

**降级为「先改接后杀」（强制前置）：2 条。**

| id | 强制前置 | 不做会怎样 |
|---|---|---|
| `d:function-space-addition-is-pointwise` | 先建 3 条改接边（例 7/8/12 → `apostol:function-space`）中的相应部分 | 例 7/8/12 的 part-of 父与 `apostol:function-space` 只有 **is-a** 相连，is-a 不入 T3 池，「逐点加法」对这三个例子彻底不可达 |
| `d:function-space-scalar-multiple-is-pointwise` | 同上 | 同上，「逐点标量乘」不可达 |

这与 A1 §0 那句「`apply_kills.py` 把边送进墓地但**不重指**，裸跑会静默丢内容」是同一件事的具体落点：
**具体丢的就是这 6 条**（`edges-D1.jsonl:` 166 / 167 / 191 / 192 / 210 / 211）。其余 18 条裸删无害。

**结构层面的提示（不构成阻止）**：#14/#15 是全图里 fan-in 最高的两个待删节点（10 与 9），
它们把例 5–12 共 8 个例子「都用逐点运算」这件事收在一处。两个一起杀后，19 条边压成 3 条，
这个「共享定义」的扇入结构在图上消失。内容不丢（父 statement 与父锚点都在，146 字符的标量乘引文由父持有），
但如果 SPEC 关心「同一定义被多少例子共享」这类可读性指标，这一步会让该指标不可见。仅作提示，本文件不据此建议保留。

## 三 建议的改接清单

### 3.1 改接（8 条 → 合并后 5 条）

rel 与 origin 一律保持原值；ev_quote 一律保持原值（改接不改引文）。

| file:line | src | rel | 旧 dst | → 新 dst |
|---|---|---|---|---|
| `data/edges-D1.jsonl:166` | `d:example-7-polynomials-of-degree-at-most-n` | requires | `d:function-space-addition-is-pointwise` | `apostol:function-space` |
| `data/edges-D1.jsonl:167` | `d:example-7-polynomials-of-degree-at-most-n` | requires | `d:function-space-scalar-multiple-is-pointwise` | `apostol:function-space` |
| `data/edges-D1.jsonl:191` | `d:example-8-continuous-functions-on-an-interval` | requires | `d:function-space-addition-is-pointwise` | `apostol:function-space` |
| `data/edges-D1.jsonl:192` | `d:example-8-continuous-functions-on-an-interval` | requires | `d:function-space-scalar-multiple-is-pointwise` | `apostol:function-space` |
| `data/edges-D1.jsonl:210` | `d:example-12-solutions-of-a-homogeneous-second-order-equation` | requires | `d:function-space-addition-is-pointwise` | `apostol:function-space` |
| `data/edges-D1.jsonl:211` | `d:example-12-solutions-of-a-homogeneous-second-order-equation` | requires | `d:function-space-scalar-multiple-is-pointwise` | `apostol:function-space` |
| `data/edges-CX2.jsonl:22` | `apostol:cx-a-whole-line-of-right-zeros` | requires | `d:axiom-5-states-the-zero-only-as-a-right-neutral-element` | `apostol:zero-element` |
| `data/edges-D5.jsonl:9` | `d:thm-15-2-left-neutrality-needs-the-commutative-law` | requires | `d:axiom-5-states-the-zero-only-as-a-right-neutral-element` | `apostol:zero-element` |
| `data/edges-A2-x2.jsonl:50` | `apostol:cx-inner-product-axiom-diagnosis` | applies-to | `apostol:cx-absolute-value-and-product-of-integrals-on-polynomials` | `apostol:cx-derivative-pairing-is-blind-to-constants` |

**合并说明**：166+167、191+192、210+211 三组各自同 src / 同 rel / 同新 dst，改接后重复，
每组保留 1 条即可（建议保留行号较小者，另一条随删除批走）。合并后实际新增 0 条、保留 3 条 + 3 条（CX2:22、D5:9、A2-x2:50）= **6 条边落地**，
被删边由 24 降至 **18**。CX2:22 与 D5:9 改接后 dst 相同但 src 不同，不重复。
已核 `apostol:zero-element` 尚无来自这两个 src 的 requires 边（`edges.tsv` 中以它为 dst 的边不含这两 src），不产生重复。

### 3.2 一并删除（18 条）

`data/edges-D1.jsonl:` 104、141、150、151、159、160、163、164、196、197、200、201、204、205
（14 条）＋ `data/edges-A2-x2.jsonl:47`（1 条）＋ 3.1 合并后弃用的 `data/edges-D1.jsonl:` 167、192、211（3 条）= **18 条**。
全部已逐条核过 evidence 归属，无引文离开全图（见 §1.1）。

### 3.3 无需处置（3 条，两端皆死）

`data/edges-D1.jsonl:118`（`example-2-shows-the-scalars-decide` requires `real-in-real-linear-space-refers-to-the-scalars`，
108 字符 evidence 由存活 `node:d:example-2-the-complex-numbers-with-real-scalars` 持有，`shared-quotes.tsv` n_holders=6）、
`:125`、`:130`（两条 ev_quote 为空）。随节点进墓地即可。

## 顺带发现

- `is-a` 不入四层证据池（只有 part-of 后代入 T3），因此 `apostol:polynomials-of-degree-at-most-n` / `space-of-continuous-functions` / `homogeneous-de-solution-space` 三个 is-a 子空间的证据可达性系统性低于 part-of 子；这不止影响本批，值得单独一查。
- A1 已撤出的 #16 作 dst 的边数为 0，与本批其余 21 条无任何边耦合，可独立执行或独立撤回。
- 15 条 origin=model 却带 quote 的未校验边全部落在 `data/edges-X.jsonl`，与本批 22 个 id 的 75 条边**无交集**（已比对 `unverified-model-quotes.tsv`），本清算不受该盲区影响。
- `edges-D1.jsonl:104` 若改接会造出「part-of 子 contrasts 其父」，这类「改接产生子父互斥关系」的模式可能在别处也有，建议改接工具加一条 part-of 祖先检查。
- `apostol:cx-single-point-evaluation-is-degenerate` 与 `cx-absolute-value-and-product-of-integrals-on-polynomials` 都无 parent，A2-x2 层的 cx 节点普遍缺 part-of，导致「改接到父」这一处置在该层不可用。
