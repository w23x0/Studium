# G1d 安全击杀清单（可执行）

只读分析代理产出。**这是提案，不是执行结果**，未写任何 `data/` 文件。
输入：`G1a-悬空边清算.md`、`G1b-唯一载体检查.md`、`G1c-B2互证理由改写.md`（三份均存在，无缺件）
＋ `A1-互证塌缩检查.md` §1 的 22 条候选与 §2 的互证认定。
装配规则优先级按简报：G1c 撤回优先 → G1b 内容损失降级 → G1a 悬空边排序 → 互证对子拆批。

本清单只做装配与执行安全排序，**不重审任何 KILL 的死因判定**。

## 〇 结论速览（最终 KILL n 条 / 降级 FIX m 条 / 撤回 k 条，合计仍是 22）

**最终 KILL 19 条 / 降级 FIX 2 条 / 撤回 1 条 = 22 条，账面闭合。**

| 处置 | 条数 | id |
|---|---|---|
| **KILL** | **19** | A1 §1 表中的 #1–#15、#17、#18、#19、#21（逐条见 §一 步骤 4） |
| **降级 FIX** | **2** | `apostol:cx-law-of-cosines-needs-nonzero-elements`、`apostol:cx-absolute-value-and-product-of-integrals-on-polynomials` |
| **撤回** | **1** | `d:for-function-spaces-closure-is-the-only-real-content`（A1 已撤出，本清单确认） |

三条输入的贡献：

| 规则 | 输入 | 本清单的动作 |
|---|---|---|
| 1 G1c 撤回 → 移出清单 | G1c 报「3 条全部改写成功，0 条撤回」 | **无条目移出**。G1c 的作用是解开互证依赖（见 §四），不减 KILL |
| 2 G1b 内容彻底掉出 → 降级 FIX | G1b §三 第 1 档 2 个候选 | **2 条降级**（见 §二） |
| 2' G1b 第 2 档 → 保持 KILL，重挂为强制前置 | 4 个候选、5 条引文 | 并入 §一 步骤 1，**不降级** |
| 3 G1a 悬空边排序 | 24 条悬空边（18 删 + 6 改接） | 因 #22 降级，**改接降为 5 条、删除仍 18 条**；顺序=先改接再删节点（§一） |
| 4 互证对子拆批 | A1 §2.1 内容轴 3 对、§2.2 + G1b 锚点轴 2 对 | **不需拆批**，两对可同批同死，理由见 §四 |

**边的账（19 条 KILL 口径，取自 `tmp_index/edges.tsv` 逐 id 重数）**：

| 类 | 条数 | 处置 |
|---|---|---|
| 19 个待删 id 作 src（含各自的 part-of） | **38** | 随节点进墓地，存活端不受损 |
| 悬空边（存活 src → 待删 dst） | **23** | 5 改接 + 18 删除 |
| 两端皆死 | **3** | `edges-D1.jsonl:118`/`:125`/`:130`，随节点走 |

悬空边由 G1a 的 24 降为 23：`edges-A2-x2.jsonl:50` 的 dst 是降级为 FIX 的 #22，该节点不删，
**这条边不再是悬空边，保持原样、不改接、不删除**。这是本次装配对 G1a 的唯一数值修正。


## 一 执行序列（编号步骤，每步：动作 / 目标 file:line 或 id / 前置条件 / 执行后不变量）

总原则：**加/改在前，删在后**。锚点重挂与边改接都只指向存活节点，任何时刻不引入新 id；
边删除永不产生悬空 id；节点删除放在最后一步，此时已无存活边指向它们。
故**步骤 1–4 每一步执行完，悬空 id 均为 0**，`check_graph` 可过。

### 步骤 0 —— 落盘 G1c 的三条 reason 改写（`report/` 文件，非 `data/`）

- 动作：把 `audit-B2-verdicts.jsonl` 第 46、49、52 行的 `reason` 替换为 G1c §1.1/1.2/1.3 给出的新杀因全文。
- 目标：`report/audit-B2-verdicts.jsonl:46`、`:49`、`:52`。
- 前置条件：无。
- 执行后不变量：三条杀因不再点名任何将被删除的 id；墓地记录不会留下指向已删节点的论证。图结构未变，悬空 id = 0。
- 说明：第 46 行 `d:example-1-verification-is-the-field-axioms-of-r` 属「维持 3」，**不在本批 19 条内**，
  但它的 reason 引用了本批的 #12，故改写必须在本批执行前完成（见 §四 对 A）。

### 步骤 1 —— 锚点重挂（G1b §三 第 2 档，4 个候选、5 条引文）

强制前置。`apply_kills.py` 不重挂，跳过本步会静默丢失这 5 条逐字引文。

| 1.x | 动作 | 接手节点 | 引文（字符数） |
|---|---|---|---|
| 1a | 新增锚点 | `apostol:linear-space` | `In defining a linear space, we do not specify the nature of the elements nor do we tell how the operations are to be performed on them.`（135，`15.01.md:5` 第 ② 句） |
| 1b | 新增锚点 | `apostol:linear-space` | `Instead, we require that the operations have certain properties which we take as axioms for a linear space.`（107，同行第 ③ 句） |
| 1c | **延长**既有锚点 #0 | `d:example-2-the-complex-numbers-with-real-scalars` | 由 111 延长到整句，实测 **193** 字符（G1b 记 190，本轮重测为 193，详见 §五） |
| 1d | 新增锚点 | `d:one-proof-from-the-axioms-serves-every-example` | `Sometimes special knowledge of one particular example helps to anticipate or interpret results valid for other examples and reveals relationships which might otherwise escape notice.`（182，`15.03.md:37` 第 ④ 句） |
| 1e | 新增锚点 | `d:one-proof-from-the-axioms-serves-every-example` | `By unifying diverse examples in this way we gain a deeper insight into each.`（76，同行第 ③ 句；原只挂在 `edges-D1.jsonl:219` 上，无锚点对应） |

- 前置条件：无（纯新增/延长，不依赖删除）。
- 执行后不变量：悬空 id = 0（未动 id）；这 5 条引文的持有者数 ≥1 且持有者全部存活。
- 已核：1a/1b 的接手方 `apostol:linear-space` 已持同一源行 `15.01.md:5` 的第 ① 句（150 字符，`anchors.tsv`）；
  1d/1e 的接手方已持同一源行 `15.03.md:37` 的第 ① 句（113 字符）与另一句（128 字符）——**同源行加挂，不引入新语境**，
  不产生锚点盲区 A/D 型。1c 是把已有锚点向右延长到句末，同理。
- 五条新锚点的字符数 135/107/193/182/76 全在 SPEC 30–200 界内（实测）。

### 步骤 2 —— 改接 5 条悬空边（G1a §3.1，去掉已失效的 A2-x2:50）

rel 与 origin 保持原值，`ev_quote` 保持原值（改接不改引文）。

| 2.x | file:line | src | rel | 旧 dst | 新 dst |
|---|---|---|---|---|---|
| 2a | `data/edges-D1.jsonl:166` | `d:example-7-polynomials-of-degree-at-most-n` | requires | `d:function-space-addition-is-pointwise` | `apostol:function-space` |
| 2b | `data/edges-D1.jsonl:191` | `d:example-8-continuous-functions-on-an-interval` | requires | `d:function-space-addition-is-pointwise` | `apostol:function-space` |
| 2c | `data/edges-D1.jsonl:210` | `d:example-12-solutions-of-a-homogeneous-second-order-equation` | requires | `d:function-space-addition-is-pointwise` | `apostol:function-space` |
| 2d | `data/edges-CX2.jsonl:22` | `apostol:cx-a-whole-line-of-right-zeros` | requires | `d:axiom-5-states-the-zero-only-as-a-right-neutral-element` | `apostol:zero-element` |
| 2e | `data/edges-D5.jsonl:9` | `d:thm-15-2-left-neutrality-needs-the-commutative-law` | requires | `d:axiom-5-states-the-zero-only-as-a-right-neutral-element` | `apostol:zero-element` |

- 前置条件：步骤 1 完成（顺序上非强制，但同属「前置批」，一并做完再进删除）。
- 执行后不变量：5 条边的 dst 全为存活节点，悬空 id = 0；`apostol:function-space` / `apostol:zero-element` 无重复边。
- 已核（本轮独立查 `edges.tsv`）：以 `apostol:function-space` 为 dst 的 18 条边中**无一条 src 是例 7/8/12**；
  以 `apostol:zero-element` 为 dst 的 14 条边中**无一条 src 是这两个 src**。改接不产生同源同向重复边。
- 为什么必须改接而非删除：例 7/8/12 的 part-of 父与 `apostol:function-space` 之间只有 **is-a**
  （`inherited/edges-A1.jsonl:19/20/21`），is-a 不入 T3 池，裸删后「逐点运算」对这三个例子在四层池里彻底不可达（G1a §二）。
- 167/192/211 三条（同 src、同 rel、改接后与 2a/2b/2c 重复）**不改接，进步骤 3 删除**。

### 步骤 3 —— 删除 18 条悬空边（G1a §3.2）

- 动作：删除以下 18 条边。
  - `data/edges-D1.jsonl:` 104、141、150、151、159、160、163、164、196、197、200、201、204、205（14 条）
  - `data/edges-A2-x2.jsonl:47`（1 条）
  - `data/edges-D1.jsonl:` 167、192、211（3 条，步骤 2 合并后弃用）
- 前置条件：步骤 2 完成（否则 167/192/211 删掉后例 7/8/12 的改接边尚未建立，池会暂时缩小；
  悬空 id 仍为 0，但四层池会出现一个中间态缺口，故仍按此序）。
- 执行后不变量：悬空 id = 0（删边只减不增引用）；这 18 条 evidence 无一离开全图
  —— 3 条有存活持有者（`:141` 63 字符、`:159` 109 字符、`:160` 146 字符，`shared-quotes.tsv` 逐条核过），
  `:104` 的 138 字符由 src 自身锚点持有，其余 `ev_charlen=0`。
- 注：`data/edges-A2-x2.jsonl:50` **不在本步**，因其 dst 已降级为 FIX（见 §〇）。

### 步骤 4 —— 删除 19 个节点（可单批执行）

- 动作：删除 A1 §1 表中的 #1–#15、#17、#18、#19、#21 共 19 个 id。其各自作 src 的 **38 条边**
  （含 19 条自身 part-of、3 条两端皆死的 `edges-D1.jsonl:118`/`:125`/`:130`）随节点进墓地。
- 前置条件：**步骤 0、1、2、3 全部完成**。
- 执行后不变量：悬空 id = 0 —— 已无存活边以这 19 个 id 为 dst（23 条悬空边已 5 改接 + 18 删除）；
  A1 已核存活节点 `parent` 指向待删节点 **0 个**、`structures-L2-{a,b,c}.jsonl` 的 `members` 含待删 id **0 处**、
  待删 id 出现在任何 structures 文件的任何字段 **0 处**。
- 可否单批：**可以**。两对互证对子（#5/#10、#11/#12）在步骤 0 之后已无相互依赖（见 §四），
  不需要拆到不同批次。


## 二 降级为 FIX 的条目（id + FIX 的具体内容）

两条均来自 G1b §三 第 1 档。降级依据：它们是**练习原文的唯一载体**，删除后该练习在图谱里再无任何痕迹
—— 不是记账位置问题（内容不在别的节点上），而是教材内容彻底掉出图谱，正对应装配规则 2。
两条的 B2 死因判定（冗余）本轮**未推翻**，降级只解决引文归属，故死因编号写 **0（仅需 FIX）**，
原死因不再作为执行依据。

### 2.1 `apostol:cx-law-of-cosines-needs-nonzero-elements`（`nodes-A2-x2.jsonl:12`）

- 唯一持有的引文：`15.12-exercises.md:39`（85 字符，练习 7 题干）＋ `:42`（83 字符，余弦定律公式）。
- 独立核验（本轮查 `anchors.tsv` / `shared-quotes.tsv` / `edges.tsv`）：
  85 字符那条在 `shared-quotes.tsv` 里有行，但另两个持有者是 `edges-A2-x2.jsonl:29`、`:30`，
  **两条边的 src 都是本节点本身**，随节点同死；83 字符那条在 `shared-quotes.tsv` 查不到，`n_holders=1`。
  所以逐字持有者全灭成立，且无更长存活引文含住（G1b 已做包含式复核）。
- 作 dst 的边 **0 条**（`edges.tsv` 无以它为 dst 的行），降级不影响任何改接。
- **FIX 内容**：
  1. 保留节点与两条锚点，不删。
  2. 按 B2 原 reason 的意思改写 `statement`：去掉与 `apostol:angle-between-two-elements` 重复的
     「角只在非零元素间有定义」这一层复述，把 statement 收缩为**这道练习自身的内容**
     —— 即「练习 7 要求在非零 x, y 之间验证 ‖x−y‖² = ‖x‖² + ‖y‖² − 2‖x‖‖y‖cos θ，
     该式把余弦定律搬进内积空间，非零前提来自 θ 的定义式需要除以 ‖x‖‖y‖」。
     改写后节点的存在理由是「承载练习 7 这道题」，与概念节点不再重叠。
  3. 保留它作 src 的 4 条边（`edges-A2-x2.jsonl:29`–`:32`）不动。
- 依据：`tmp_index/anchors.tsv`（两行 charlen 85/83）、`shared-quotes.tsv`、`edges.tsv`、
  `source-lines.tsv`（`15.12-exercises.md:39` n_sentence_end=1、`:42` n_sentence_end=1，可按行号说「整行掉出」）；
  G1b §二 15.12 表、§三 第 1 档。
- 死因编号：0（仅需 FIX）。建议动作：**FIX**。
- 置信度：高。不确定点：改写后的 statement 是否与 `d:angle-requires-nonzero-elements`（`edges-A2-x2.jsonl:30` 的 dst）
  仍有重叠，未核该节点的 statement。

### 2.2 `apostol:cx-absolute-value-and-product-of-integrals-on-polynomials`（`nodes-A2-x2.jsonl:18`）

- 唯一持有的引文：`15.12-exercises.md:91`（47 字符，练习 12(b)）＋ `:94`（99 字符，练习 12(d)）。
- 独立核验：两条在 `shared-quotes.tsv` 里**都查不到**（`grep` 计数 0），即 `n_holders=1`，
  连它自己发出的 2 条边（`edges-A2-x2.jsonl:48`、`:49`）都没引这两条。彻底的唯一载体。
- **FIX 内容**：
  1. 保留节点与两条锚点，不删。
  2. 改写 `statement`，把它明确定位为「练习 12 的 (b)(d) 两个反例载体」：
     (b) 取积分的绝对值破坏加性（|·| 不是双线性），(d) 两个积分之积使 (f,f)=0 对非零 f 成立
     （任何积分为 0 的多项式都被判为零向量），故 (d) 破坏正定性。
     ——**这两句是对练习式子的数学解读，若落盘须标 `origin=model`**，不得当作教材原文。
  3. **`data/edges-A2-x2.jsonl:50` 保持原样**（`apostol:cx-inner-product-axiom-diagnosis --applies-to-->` 本节点），
     取消 G1a §3.1 对该边的改接建议 —— dst 存活，无需改接。
  4. 保留它作 src 的 2 条边（`:48`、`:49`）不动。
- 依据：`tmp_index/anchors.tsv`（两行 charlen 47/99）、`shared-quotes.tsv`（无命中）、
  `edges.tsv`（dst 边仅 `A2-x2.jsonl:50` 一条）、`source-lines.tsv`（`:91` n_sentence_end=0、`:94` n_sentence_end=1）；
  G1b §三 第 1 档。
- 死因编号：0（仅需 FIX）。建议动作：**FIX**。
- 置信度：高（引文归属部分为机械可核）。不确定点：FIX 内容第 2 条里对 (b)(d) 的数学解读
  **本轮未做独立数学核验**，只是复述 G1b 的定位；若主控要落盘，须先经数学审。

### 2.3 主控若坚持保持 KILL 数不变的替代路径（G1b 已列，本清单不推荐）

G1b 给出「先重挂到 `apostol:angle-between-two-elements` / `apostol:cx-inner-product-axiom-diagnosis` 再杀」
作为退路。本清单不采用，理由与 G1b 一致：这两个接手方的 statement 讲的是概念，不是这道题，
跨源位置重挂会造出锚点盲区 A/D 型（引文与断言错配）。若主控改选该路径，
则 §一 需插入两条「跨节点重挂」步骤，且 §〇 的账变为 KILL 21 / FIX 0 / 撤回 1。


## 三 撤回的条目（id + 撤回理由）

**1 条。**

### 3.1 `d:for-function-spaces-closure-is-the-only-real-content`（`nodes-D1.jsonl:62`，A1 §1 表第 16 行）

- 撤回理由：A1 §0 已认定它是**形式 B 真漂移**——锚点与断言错配，需要重挂锚点，
  重挂后节点内容成立，**不得杀**。撤回来自 A1，不来自 G1c（G1c 的三条改写全部成功，0 条撤回）。
- 本清单对它的独立核验（三点，说明撤回不留残余）：
  - 作 **dst** 的边数 **0**（G1a §〇 与 §一 第 16 行；`edges.tsv` 无以它为 dst 的行）——
    撤回不减少任何悬空边，也不增加。**它与其余 21 条无任何边耦合，可独立执行或独立撤回。**
  - 它作 src 有 4 条边（含自身 part-of `edges-D1.jsonl:154`），撤回后这 4 条全部保留。
  - 它的唯一锚点（`15.03.md`，115 字符）`n_holders=16`，另有 15 个存活持有者，
    杀不杀都不产生引文损失——即**撤回的理由是节点自身要重挂锚点，不是引文损失**。
- 依据：`A1-互证塌缩检查.md` §0 与 §1 第 16 行；`G1a-悬空边清算.md` §〇 与 §一；
  `G1b-唯一载体检查.md` §一 第 16 行（列为「不杀，无需处置」）；`tmp_index/edges.tsv`、`shared-quotes.tsv`。
- 死因编号：**不适用**（撤回，另按形式 B 漂移走重挂流程，编号由 A4 一线处置）。
- 建议动作：**撤回**（本批不执行任何操作；重挂锚点由 `A4-形式B漂移与借用锚点.md` 的流程处理，本清单不裁断）。
- 置信度：高。不确定点：重挂后是否仍应 KILL，本清单不预测——那取决于重挂后的锚点是否支撑其断言，未核。


## 四 互证对子的取舍（每对：杀谁保谁 + 理由）

共 4 对：内容轴 3 对（A1 §2.1）、锚点轴 2 对（A1 §2.2 + G1b §一 末尾），其中对 B 与对 C
在两条轴上是**同一对**，故去重后 4 对。结论先说：**没有一对需要「只能杀一个」**，
四对全部「两个都杀」或「一个本不在本批」，**不需要拆批次**。

### 对 A：`d:example-1-verification-is-the-field-axioms-of-r`（v:46）↔ `#12 d:example-3-verification-...`（v:52）

- **杀谁保谁：两个都杀，但不在同一批 —— v:46 属「维持 3」，本批只杀 v:52。**
- 理由：v:46 引 v:52 的方式是「属同一 species」，是**先例关系**不是承载关系（A1 §2.1 对 A），
  v:52 死亡不影响 v:46 是否冗余。G1c §1.1 已把 v:46 的 reason 末句改写为指向存活 parent
  `d:example-1-the-real-numbers-form-a-linear-space` 的 statement 末句，依赖解除。
- **跨批次约束（必须遵守）**：步骤 0 的 reason 改写要在本批步骤 4 之前完成。
  否则本批杀掉 v:52 后，v:46 的 reason 里留着一条指向已删节点的论证；
  等日后执行「维持 3」时，墓地记录已不可核。
- v:46 自身另有强制前置（十条公理映射表须先并入 parent，A1 §2.1 / ADJ1 §3.4 / `G2b-十条公理FIX.md`），
  **本清单不重复裁断**，也不把它排进 §一 的序列。

### 对 B：`#10 d:example-2-shows-the-scalars-decide-real-or-complex`（v:49）↔ `#5 d:real-in-real-linear-space-refers-to-the-scalars`（v:25）

- **杀谁保谁：两个都杀，同批可行，无需拆批。真正被「保」的是第三方 `d:example-2-the-complex-numbers-with-real-scalars`（B2 = KEEP）。**
- 理由（三层，逐层已核）：
  1. **reason 侧无相互依赖**。A1 判此对为假阳性；本轮独立读 `audit-B2-verdicts.jsonl:25` 原文核过：
     v:25 的 reason 只点 `apostol:real-linear-space`（KEEP）与 `d:example-2-the-complex-numbers-with-real-scalars`（KEEP），
     **没有反向点 v:49**。G1c §1.2 又把 v:49 reason 里对 v:25 的「三份拷贝」计数换成池度量。
     双向依赖至此全部指向存活节点。
  2. **引文侧无损失**。两者共用同一条 108 字符引文
     `Even though the elements of V are complex numbers, this is a real linear space because the scalars are real.`，
     第三持有者 `d:example-2-the-complex-numbers-with-real-scalars` 逐字持有同一条且存活
     （`anchors.tsv` 该节点锚点 #1，charlen=108，本轮核过）。
  3. **内容侧无损失**。「标量而非元素决定实/复」这一洞见完整存于存活 parent 的 statement 第二句。
- 附带：两端皆死的 `edges-D1.jsonl:118`（v:49 requires v:25，108 字符 evidence）随节点走，
  该 evidence 亦由存活 parent 持有，不产生引文损失。

### 对 C：`#12 d:example-3-verification-...`（v:52）↔ `#11 d:operations-of-example-3-are-componentwise`（v:51）

- **杀谁保谁：两个都杀，同批可行。真正被「保」的是 parent `d:example-3-v-n-with-componentwise-operations`（KEEP）与祖父 `apostol:v-n-space`（存活，无裁决行）。**
- 理由：
  1. 原 reason 里 v:52 把机制句的承载责任交给 v:51，这是**唯一的真承载依赖**（A1 §2.1 对 C）。
     G1c §1.3 已把承载者上移到祖父 `apostol:v-n-space` 的
     「with addition and multiplication by scalars defined in the usual way in terms of components」
     与 parent statement 的「with the usual componentwise operations」，两者都存活。
  2. 反向无依赖：本轮读 `audit-B2-verdicts.jsonl:51` 原文核过，v:51 的 reason 只点祖父与 parent，**不点 v:52**。
  3. 引文侧：两者共用同一条 92 字符引文，删除后该精确串的存活持有者归零，
     但它是存活的 171 字符锚点 `EXAMPLE 3. Let $V = V_{n}$ , ...`（持有者 `apostol:v-n-space` 与 parent，皆存活）
     的连续子串——A1 §2.2 口径下的 FULL / G1b 口径下的「含住」，**不产生内容损失**。
     以「新引入的源行数」度量：v:52 唯一源行 `15.03.md:9` 已被存活侧完整覆盖，新增源行数 0。
- 附带：两端皆死的 `edges-D1.jsonl:125`（`ev_quote` 空）随节点走。
  `edges-D1.jsonl:130`（`#13 operations-of-example-4` requires `#11`，`ev_quote` 空）同理。

### 对 D（锚点轴，G1b §一 末尾筛出，与对 B/C 是同两对）

G1b 机械筛出的两对锚点轴塌缩即上面的对 B（共用 108 字符）与对 C（共用 92 字符），
**不是新的对子**。两对的「同引文存活持有者数」分别为 1（对 B，第三方逐字持有）与 0（对 C，被更长串含住），
结论与 A1 一致：都不产生损失。

### 链式结构的提醒

A1 §2.1 指出 A 与 C 首尾相接构成 3 节点链
`v:46 → v:52 → v:51`。逐节点删除测试看不见链式结构，但本批的处置对链是安全的：
链的两个下游节点（v:52、v:51）在本批同死，**链的承载责任在步骤 0 之后已全部改指到链外的存活节点**
（parent、祖父 `apostol:v-n-space`），链本身不再承担任何论证。上游 v:46 不在本批。


## 五 本清单未能确定的部分（明确列出，不要含糊）

1. **1c 锚点延长后的字符数与 G1b 不一致。** G1b §三 第 2 档记「延长后 190 字符（实测）」，
   本轮从 `source-lines.tsv`（`apostol-ch15/15.03.md:7`，charlen=302、n_sentence_end=3）
   截取到第三句之前，**实测 193 字符**（含句末那个句点）。差 3 字符，可能是 G1b 未含句点或截取边界不同。
   两个值都在 SPEC 30–200 界内，**不改变处置**，但落盘时须以实际截取串重测，不要照抄任一数字。
2. **降级为 FIX 后的两个节点，statement 改写文本本清单只给了要点，不给可落盘全文。**
   §二 的 FIX 内容第 2 条是改写方向，不是成品；2.2 里对练习 12(b)(d) 的数学解读**未经数学核验**，
   须经数学审后才可落盘，且必须标 `origin=model`。
3. **步骤 3 与步骤 2 的相对顺序对「悬空 id = 0」不敏感，对「四层池不出现中间态缺口」敏感。**
   本清单按「先改接再删边」排，但未验证 `apply_kills.py` 是否支持这种分步调用，
   也未读该脚本（禁令：不得对这些脚本用 `--help`）。**工具能否按此序执行，未核。**
4. **19 条 KILL 里除本清单点到的之外，其余节点的死因判定本身未复核。**
   本清单只做装配与执行安全，不重审 B2 的 KILL 判定；G1b 也明示未核这 8 条引文是否真正支撑其宿主断言
   （死因 6 / 盲区五型）。**若某条引文本来就不支撑宿主，「唯一载体」的分量会变**，这一层三份输入都未核。
5. **G1c §1.3 附带报告的一条死因 6（v:52 statement 里「十条公理逐分量归约、O 是零元组」在池里无支撑）本清单未复核，也未收进任何统计。**
   该节点已判 KILL，不影响执行；是否收作死因 6 样本由综合代理决定。
6. **A1 §2.2 报「9 条 LOST」与 G1b 报「9 条」构成不同**（G1b：8 条锚点 + 1 条边证据，且其中 1 条为部分损失）。
   本清单按 G1b 的构成排步骤 1（5 条重挂覆盖其中 4 个候选、5 条引文）＋ §二 两条降级（覆盖 4 条引文），
   但**两份「9 条」的逐条对齐本清单未做完**——按 id 能对上 6 个节点，按引文条数的口径差异未彻底消解。
   综合代理裁决引文损失总数时**不要把两个 9 相加**。
7. **`15.12-exercises.md:87`（练习 12(a)，24 字符）删除前就无任何持有者**，是既存缺口，
   本清单不处置，也未核它是否在别处已登记。
8. **「维持 3」的另两条**（`d:function-space-zero-is-the-everywhere-zero-function`、
   `d:degree-exactly-n-is-not-a-subspace-of-degree-at-most-n`）本清单**完全未核**，
   不在 §一 序列内。它们与本批 19 条是否有悬空边耦合，未核（G1b 的 K24 复核只覆盖引文归属，不覆盖边）。
9. **步骤 4 之后的 `check_graph` 通过与否，本清单是推断而非实测**：依据是「无存活边以这 19 个 id 为 dst」
   ＋ A1 已核的 parent/members/structures 三项为 0。**未实际跑过 `check_graph`**（本轮只读，不改数据，无法跑）。


## 顺带发现

- 降级一个 KILL 候选会连带作废对它的悬空边改接建议（本例 `edges-A2-x2.jsonl:50`），G1a 那类清算表在候选集变动后必须重跑，不能直接复用。
- 三份 G1 提案对同一批候选各给一套编号口径（22 / 21 / 24），装配时四处都要显式声明口径，建议 SPEC 规定「击杀清单必须以候选 id 集合而非条数为主键」。
- `shared-quotes.tsv` 的 `n_holders` 含节点自己发出的边，本轮再次踩到：判「唯一载体」必须逐个看 holders 的存活性，G1b 已把这条写进方法，值得升进 SPEC。
- 例 7/8/12 经 is-a 连到 `apostol:function-space`，而 is-a 不入 T3 池，导致「改接到父」在这三处是必需而非可选；is-a 的池不可达性影响面超出本批，G1a 也已提出单独一查。
- `apostol:cx-*` 层节点普遍无 parent（本批两个即是），「改接到父」这一处置在 A2-x2 层不可用，该层的删除安全性天然低于 d: 层。

