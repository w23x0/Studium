# G2b d:ten-axioms-listed-in-three-groups 的 FIX

## 〇 结论速览（改什么字段 / 锚点几条 / 实测字符数）

**判决**：`d:ten-axioms-listed-in-three-groups` 由 KILL 改 **FIX**，节点保留在
`data/nodes-D1.jsonl:5`（就地替换整行）。**不动 data/，本文件只出提案。**

改动只涉及三个字段，其余字段逐字不变（`id` / `name_en` / `name_zh` / `node_type` /
`sections` / `aliases` / `parent` / `atomic` 全部原样）：

| 字段 | 改动 | 理由 |
| --- | --- | --- |
| `statement` | 补出各组的公理编号：`(Axioms 1 and 2)` / `(Axioms 3 to 6)` / `(Axioms 7 to 10)`，实测 **225 字符** | 让 2/4/4 这个分配可逐条对上三个 L1 分组节点的 statement，把「两/四/四」从模型的计数改成教材编号的转写 |
| `anchors` | 由 2 条改 **3 条**；撤下 `15.01.md` 的过渡句，新增 2 条 `15.02.md` 引文 | 原第 2 条锚点（`We turn now to a detailed description of these axioms.`）不支撑 statement 的任何一句，是死因 6 的 E 型；新增两条把「三组」的组名与「十条」的编号上界落到原文 |
| `atomic_reason` / `audit_fix` | 重写 / 追加 | 原 `atomic_reason` 把「分组三节点已在 L1 层存在」写成了 B2 用来判死的把柄；改写成它真正的保留理由（唯一汇聚点）。`audit_fix` 追加本轮来源，保留原有 `audit-A4a` |

**锚点 3 条，实测字符数 163 / 175 / 36**，全部在 `15.02.md`，全部 30–200 界内、不含换行、
`grep -F` 逐条命中（见第四节）。**公理 2 的候选锚点我独立实测为 175 字符**（`awk` 行长与
Python `len()` 两法一致，`tmp_index/anchors.tsv:` 与 `shared-quotes.tsv:39` 的 charlen 列亦为 175），
确认任务书给出的 175 而非 170 是对的。

**边不动。** ADJ2 的前置条件（`data/edges-D1.jsonl:10/11/12` 三条 `part-of` 改指
`apostol:linear-space`）是**为 KILL 服务的**；既然改判 FIX、节点不删，这三条边保持原指向即可，
不需要任何改边动作。这一点与 待应用清单.md §2.1 的推理方向一致（它把改边写成「再删」的前置），
但结论上须明确：**FIX 之后不执行那三条改指**。

## 一 当前 JSON 行原文（逐字）

出处：`tmp_index/nodes.tsv:83` 给出 loc = `data/nodes-D1.jsonl:5`，`sed -n '5p'` 取出如下一行
（下面是该行的逐字全文，未加换行、未改标点）：

```
{"id": "d:ten-axioms-listed-in-three-groups", "name_en": "Ten axioms listed in three groups", "name_zh": "十条公理分三组列出", "node_type": "concept", "sections": ["15.02"], "statement": "The definition consists of exactly ten axioms, presented in three groups: two closure axioms, four axioms for addition, and four axioms for multiplication by numbers.", "aliases": ["axioms for a linear space"], "anchors": [{"file": "15.02.md", "quote": "Let V denote a nonempty set of objects, called elements. The set V is called a linear space if it satisfies the following ten axioms which we list in three groups."}, {"file": "15.01.md", "quote": "We turn now to a detailed description of these axioms."}], "parent": "apostol:linear-space", "atomic": true, "atomic_reason": "它只陈述公理表的规模与编组;十条公理本身各为独立节点,分组三节点已在 L1 层存在。", "audit_fix": "audit-A4a"}
```

当前两条锚点的实测值（`tmp_index/anchors.tsv:174-175`，charlen 列，含换行标志 0）：

| # | file | 实测字符数 | quote |
| --- | --- | --- | --- |
| 0 | 15.02.md | 163 | `Let V denote a nonempty set of objects, called elements. The set V is called a linear space if it satisfies the following ten axioms which we list in three groups.` |
| 1 | 15.01.md | **54** | `We turn now to a detailed description of these axioms.` |

锚点 1 落在 `source/apostol-ch15/15.01.md:5`（该行 449 字符、`source-lines.tsv:6` 记 n_sentence_end=4，
即该锚点只是这一行末尾的第四句）。这句话是章节过渡语，**不含「ten」「three」「groups」中任何一个词**，
也不含任何公理编号，它对 statement 的任何一句都不构成支撑——这是死因 6 的 E 型（整句无锚的另一面：
有锚点但锚点与断言无交集）。

节点当前证据池（`tmp_index/exposure.tsv:399`）：后代 19、T1 2、T2 1、T3 60、池总 63、去重 (file,quote) 27。

## 二 ADJ2 方案要点（逐字引出关键句）

来源：`report/裁定-ADJ2.md`，以 `grep -n 'ten-axioms'` 定位到 21 / 31 / 261 / 349 / 367 / 395 / 429 行，
逐段读取。以下四句是本次 FIX 直接依据的原文（逐字引出）。

**（1）改判本身与它的理由边界（ADJ2.md 第 2.1 节裁定句）**

> **裁定：FIX，不 KILL。** 冗余判断本身我翻不动——2/4/4 确实可从三个 L1 分组节点重新导出，这一点如实承认。但处置应为 FIX：把 2/4/4 并入 `apostol:linear-space` 的 statement，并把 edges-D1.jsonl:10/11/12 三条 `part-of` 改指 `apostol:linear-space`，然后才能删。B2 的 reason 需重写（含虚构从句）。

**（2）保留的实质理由：唯一汇聚点（ADJ2.md 第 2.1 节攻击三）**

> 本节点是图中**唯一把三个分组收拢为「一张十条公理表」的汇聚点**。直接 KILL 会留下 5 条悬空边，其中三条 `part-of` 需改指 `apostol:linear-space`。

**（3）B2 判死理由的事实错误（ADJ2.md 第 2.1 节攻击二）**

> B2 的 KILL 理由把一句**节点里根本不存在的话**当作被杀对象引用：「剩下的『分组只是叙述性的』」。……**没有任何关于「分组只是叙述性的」的从句**。

**（4）锚点为什么原来支撑不住 2/4/4（ADJ2.md §6.1(1)，本次改锚点的直接依据）**

> 该节点的断言是「十条公理分三组，各组 2/4/4 条」，最自然的锚点是三个分组标题。但其中两个（14、19 字符）不达标，只有第三个（36 字符）达标。生产者因此改用 `15.02.md:3` 的导言句（163 字符）作锚点——该句只支撑「十条、三组」，**不支撑 2/4/4 这个分配**。这是 brief 所列的 **D 型「射程不足」**：引文为真、对象也对，但只管住断言的一部分。**成因是 SPEC 的长度下限，不是生产者偷懒。**

**我对 ADJ2 方案的两处收窄（都是因为改判 FIX 之后前提变了）：**

1. ADJ2 的「把 2/4/4 并入 `apostol:linear-space` 的 statement」是**删除路线的补偿动作**。节点既然保留，
   2/4/4 就留在本节点，`apostol:linear-space` 不动——这也避免在 L1 继承层引入一处 D 层内容。
2. 同理，`edges-D1.jsonl:10/11/12` 三条 `part-of` 的改指不执行（见第〇节）。
   `:112` 那条 `requires` 来自 `d:example-1-verification-is-the-field-axioms-of-r`，该源节点仍判 KILL，
   它随源节点消失，不需要本提案处理；`:106` 的源节点存活、dst 仍存在，无需改动。

## 三 改写后的 JSON 行全文（单行、可直接替换，不要美化换行）

整行替换 `data/nodes-D1.jsonl:5`。已用 `json.loads` 复核可解析，字段顺序与原行一致，
`ensure_ascii=False`（与该文件既有行的中文写法一致）。行长**实测 1495 字节 / UTF-8**
（`len(s.encode('utf-8'))`，本轮复核值；此处早先写的 1561 是错的，已改正）。

```
{"id": "d:ten-axioms-listed-in-three-groups", "name_en": "Ten axioms listed in three groups", "name_zh": "十条公理分三组列出", "node_type": "concept", "sections": ["15.02"], "statement": "The definition consists of exactly ten axioms, listed in three consecutive groups: two closure axioms (Axioms 1 and 2), four axioms for addition (Axioms 3 to 6), and four axioms for multiplication by numbers (Axioms 7 to 10).", "aliases": ["axioms for a linear space"], "anchors": [{"file": "15.02.md", "quote": "Let V denote a nonempty set of objects, called elements. The set V is called a linear space if it satisfies the following ten axioms which we list in three groups."}, {"file": "15.02.md", "quote": "AXIOM 2. CLOSURE UNDER MULTIPLICATION BY REAL NUMBERS. For every x in V and every real number a there corresponds an element in V called the product of a and x, denoted by ax."}, {"file": "15.02.md", "quote": "Axioms for multiplication by numbers"}], "parent": "apostol:linear-space", "atomic": true, "atomic_reason": "它只陈述公理表的形状:十条、三组、各组 2/4/4 条。十条公理与三个分组各有独立节点;三个分组节点以 part-of 指向它,它是图中唯一把三组收拢成一张公理表的汇聚点。", "audit_fix": "audit-A4a; G2b(采 ADJ2):KILL 改 FIX,保留为三个分组节点的汇聚父节点;statement 补出各组公理编号,撤下 15.01 的过渡句锚点(它不支撑任何断言),换挂 15.02 内的公理 2 正文与第三组标题"}
```

**schema 复核**（对照 `SPEC.md:54`「至少 1 条，最多 3 条」「长度 30–200 字符」与 `SPEC.md:62` 的节点 schema）：

- 字段齐备且与 `data/nodes-D1.jsonl` 的多数行同构：该文件 81 行中 **18 行**（本轮实测，早先写的
  16 是错的）同时带 `atomic_reason` 与 `audit_fix`，本行属于这一组合，未新增字段。
- `node_type` = `concept`，在 `tools/check_graph.py:23` 的 `NODE_TYPES` 集合内
  （该集合实为 `{concept, method, theorem, notation}`，与 brief 列的四类节点型不同名，但 `concept` 两边都在）。
- 锚点 3 条 = 上限，未超；每条 `file` 均为 `15.02.md`，与 `sections: ["15.02"]` 同节
  （顺带消掉一处跨节引用：本轮实测 D1 层恰有 5 个节点带跨节锚点——第 1、5、21、50、55 行，
  本节点是第 5 行那个，改后减为 4 个）。
- `verify_anchors.py` 只做子串校验、不校验长度；30–200 的界是 SPEC 的人工规则，本提案三条都在界内。

## 四 每条锚点的核验（quote 逐字 / 源 file:line / 实测字符数 / grep -F 是否命中 / 它支撑 statement 的哪一句）

先把改写后的 statement 切成四个断言（下面用 S1–S4 指代）：

- **S1** `The definition consists of exactly ten axioms, listed in three consecutive groups:`
- **S2** `two closure axioms (Axioms 1 and 2)`
- **S3** `four axioms for addition (Axioms 3 to 6)`
- **S4** `four axioms for multiplication by numbers (Axioms 7 to 10)`

### 锚点 A1（保留原有）

- quote 逐字：`Let V denote a nonempty set of objects, called elements. The set V is called a linear space if it satisfies the following ten axioms which we list in three groups.`
- 源：`source/apostol-ch15/15.02.md:3`（该行共 163 字符，`source-lines.tsv` 记 n_sentence_end=2，
  锚点覆盖整行，故不存在按行号高报的 b 通道问题）
- **我自己实测：163 字符**（Python `len()`；与 `awk length($0)` 的行长 163 一致，与 `anchors.tsv:174` 的 charlen 一致）。含换行：否。30–200：**在界内**。
- `grep -nF` 命中：`15.02.md:3`，唯一命中。
- 支撑：**S1**（"ten axioms" 逐字、"three groups" 逐字）。**不支撑 S2/S3/S4**——这正是 ADJ2 §6.1(1) 指出的 D 型射程不足。
- 共享情况：`shared-quotes.tsv:149` 记 3 个持有者（`edge:data/edges-D1.jsonl:3`、
  `node:d:linear-space-requires-a-nonempty-underlying-set`、本节点）。本节点已在其中，改后持有者数不变。

### 锚点 A2（新增）

- quote 逐字：`AXIOM 2. CLOSURE UNDER MULTIPLICATION BY REAL NUMBERS. For every x in V and every real number a there corresponds an element in V called the product of a and x, denoted by ax.`
- 源：`source/apostol-ch15/15.02.md:9`（整行 175 字符，锚点即整行）
- **我自己实测：175 字符**（两法一致：`awk 'NR==9{print length($0)}'` = 175，Python `len()` = 175）。
  任务书给的 175 复核通过，**170 那个数是错的**。含换行：否。30–200：**在界内**。
- `grep -nF` 命中：`15.02.md:9`，唯一命中。
- 支撑：**S2 的一半**——它逐字给出「AXIOM 2」这个编号，且标题 `CLOSURE UNDER …` 逐字给出它属于
  closure 一组，于是「第一组的上界是公理 2、且公理 2 是封闭性公理」有原文支撑。
  **它不支撑「两条」这个计数，也不覆盖公理 1。** 公理 1 侧由 T3 后代覆盖：
  `pool.tsv` 中 `d:axiom-1-closure-under-addition` 的锚点（15.02.md，160 字符）与
  `apostol:closure-axioms` 的锚点（138 字符）均在池内。
- 共享情况：`shared-quotes.tsv:39` 记 5 个持有者（`edge:data/edges-D1.jsonl:14`、
  `edge:data/inherited/edges-A1.jsonl:7`、`node:apostol:closure-axioms`、
  `node:d:axiom-2-closure-under-multiplication-by-real-numbers`、
  `node:d:only-axiom-1-states-that-the-result-is-unique`）。**本提案会把它加到 6 个持有者**，
  按锚点盲区 B 型的定义这是一条**借用引文**。我如实登记：它对本节点的断言只是部分支撑，
  不是本节点独占的证据。

### 锚点 A3（新增）

- quote 逐字：`Axioms for multiplication by numbers`
- 源：`source/apostol-ch15/15.02.md:29`（整行 36 字符，即第三组的分组标题）
- **我自己实测：36 字符**。含换行：否。30–200：**在界内**（三个分组标题里唯一达标的那个，
  另两个 `Closure axioms` 14 字符、`Axioms for addition` 19 字符，**不可用作锚点**）。
- `grep -nF` 命中：`15.02.md:29`，唯一命中。
- 支撑：**S4 的组名部分**——教材确实把第三组命名为「Axioms for multiplication by numbers」。
  **不支撑「四条」与「7 到 10」**；这两点由 T3 后代覆盖：`pool.tsv` 中
  `d:axiom-7-…`、`d:axiom-8-…`、`d:axiom-9-…`、`d:axiom-10-existence-of-identity`
  四个后代节点的锚点（80 / 101 / 104 / 66 字符）逐条在池内，四条之数与 7–10 之编号由它们给出。
- 共享情况：`shared-quotes.tsv` 记 2 个持有者（`edge:data/edges-D1.jsonl:12`、
  `node:apostol:axioms-for-multiplication-by-numbers`），改后 3 个。同为 B 型借用，如实登记。

### 撤下的锚点

- quote：`We turn now to a detailed description of these axioms.`（`15.01.md:5`，实测 54 字符）
- 撤下理由：它对 S1–S4 **无一支撑**（不含 ten / three / groups / 任何公理编号）。
- 撤下代价核查：`grep -c` 全库，该 quote 只出现在 `data/nodes-D1.jsonl` 1 处，即本节点，
  **不是任何其他持有者的唯一载体**，撤下不使任何引文从图中消失；
  同一源行 `15.01.md:5` 的另一句（`Briefly, a linear space is a set of elements of any kind …`，150 字符）
  仍被 `apostol:linear-space` 持有，该源行不会因此脱离图。

### S3 的锚点状态（如实登记，不掩盖）

**S3（`four axioms for addition (Axioms 3 to 6)`）改后仍无 T1 锚点。** 原因是机械的：
第二组标题 `Axioms for addition` 只有 19 字符，`grep -F` 能命中但 **SPEC 的 30 字符下限把它挡在门外**；
锚点上限 3 条也已用尽（A1 管 S1，A2 管 S2，A3 管 S4）。
S3 的支撑全部落在 T3：`pool.tsv` 内 `apostol:axioms-for-addition` 的三条锚点
（AXIOM 3 / 71、AXIOM 4 / 95、AXIOM 6 / 87）、四个单公理后代节点
（`d:axiom-3-…` 73、`d:axiom-4-…` 97、`d:axiom-5-…` 85、`d:axiom-6-…` 87），
以及 `data/edges-D1.jsonl:11` 的 evidence `Axioms for addition`（19 字符，作边证据合法、作锚点不合法）。
按四层证据池，**T3 有支撑 ⇒ 不构成死因 6**；但它是 SPEC 长度下限造成的记账缺口，
与 ADJ2 §6.2 的修法建议同一条因果链。

### 冗余度的正确度量

A2、A3 引入的两条源行（`15.02.md:9`、`15.02.md:29`）**在改动前已经存在于本节点的 T3 池中**
（见 `pool.tsv` 该节点的 T3 行）。所以按「新引入的源行数」度量，
**本次 FIX 为本节点引入 0 条新源行**，池不变大；变的只是**记账位置**——
把支撑 2/4/4 的引文从 T3 提到 T1，同时删掉一条零支撑的 T1 锚点。
不要把这次改动报成「证据变多了」。

## 五 死因归零的论证（原死因编号 → 0 的依据）

节点身上原本挂着两个死因，分别来自两个不同的审查线索。要归零就得分开处理。

### 原死因 5（伪抽象·层塌缩）→ 0

- **B2 的判据**（`audit-B2-verdicts.jsonl:5`，逐字）："复述 parent apostol:linear-space 的
  「subject to ten axioms listed in three groups」……剩下的「分组只是叙述性的」是无后果的元评论。"
- **依据一：判据后半段引的从句不存在。** `statements.tsv:83` 给出本节点 statement 全文只有一句，
  无任何「分组只是叙述性」的内容。ADJ2 §2.1 攻击二已认定这是 reason 的事实错误，
  待应用清单.md §2.1 采纳。**判据的一半自证不成立。**
- **依据二：判据前半段（复述 parent）成立，但不足以判 5。** parent statement
  （`data/inherited/nodes-A1.jsonl:1`）确实含 "subject to ten axioms listed in three groups"，
  所以 S1 是复述；但 **S2/S3/S4 的 2/4/4 分配 parent 一个字未给**。
  死因 5 要求节点相对 parent 无增量，此处有增量（虽可从三个 L1 兄弟重新导出——ADJ2 与我都承认这点翻不动）。
- **依据三：它是三个 L1 分组节点唯一的汇聚父节点，删它就是层塌缩本身。**
  `tmp_index/partof.tsv:102` 逐字给出本节点的 part-of 子节点为
  `apostol:axioms-for-addition,apostol:axioms-for-multiplication-by-numbers,apostol:closure-axioms`；
  `data/edges-D1.jsonl:10/11/12` 三条边逐条对上。而 `tools/apply_kills.py` 只把边送进墓地、不改指向
  （待应用清单.md §2.1 已核）。**判 5（层塌缩）却用一个会造成层塌缩的动作执行，是自相矛盾的。**
- **归零结论**：死因 5 撤回，改判 **0（无死因，仅需 FIX）**。置信度高——三条依据里两条是机械可查的
  （statement 全文、partof 表），第三条是 ADJ2 与主控独立核过的边计数。

### 原死因 6（引文不支撑断言，D 型/E 型）→ 0

- **成立的部分**（ADJ2 §6.1(1) 与我第四节的复核一致）：改动前 2 条锚点里，
  A1（163 字符）只管 S1，`15.01.md` 那条（54 字符）**一句都不管**。
  2/4/4 在 T1 无支撑，是 D 型射程不足叠加一条零支撑锚点。
- **归零动作**：撤下零支撑那条；把两条本来就在 T3 池里的引文（`15.02.md:9`、`15.02.md:29`）提到 T1，
  分别落到 S2 与 S4；S3 明确登记为 T3 支撑（第四节已列出七条后代锚点与一条边证据）。
- **按四层证据池的判定**：S1 有 T1（A1）；S2 有 T1（A2）+ T3；S4 有 T1（A3）+ T3；
  S3 无 T1、有 T3。四层定义中 **T3 塌陷说明内容合法地下移**，不构成死因 6。
  故改后 **四句全部有池内支撑，死因 6 归零**。
- **不掩盖的残留**：A2、A3 都是 B 型借用引文（持有者数分别由 5→6、2→3），
  S3 仍靠 T3 记账。这两点是 SPEC 锚点规则（30 字符下限 + 3 条上限）造成的，
  **建议随 S1 提案一并进 SPEC 修订依据，本提案不主张改 SPEC。**
- **置信度**：中高。可机械证明的部分（三条 quote 逐字命中、字符数、持有者数、T3 池内容）已全部实测；
  不可机械证明的是「A2 支撑 S2、A3 支撑 S4」这类语义判断，我在第四节把每条锚点管到哪一句、
  管不到哪一句都写明了，读者可复核。

### 未核项（如实声明）

- 我**没有**核 `d:examples-are-asserted-to-satisfy-the-axioms-and-left-to-the-reader`（`:106` 的源节点）
  与 `d:example-1-verification-is-the-field-axioms-of-r`（`:112` 的源节点）的存活状态是否会在后续步骤中变化，
  只按待应用清单.md §2.1 与合并裁定表的记载采信「`:112` 源节点判 KILL、随之消失」。
- 我**没有**运行 `check_graph.py` / `verify_anchors.py`（本轮只读，不得改 data/，无法就地验收）。
  三条 quote 的子串性我用 `grep -nF` 与 Python `in` 两法各自独立验过。

## 顺带发现

- `report/待应用-提案/S3-SPEC-关系词与审计程序.md:177` 写「它的信息含量确实为零」，与本轮 FIX 裁决相左，该处表述已过期。
- ADJ2 §7.3(1) 那条连带修复（改 10/11/12 三条边指向、把 2/4/4 并入 parent）在改判 FIX 后**不应执行**，主控若照单执行会误改。
- 三个分组标题里两个（14、19 字符）被 SPEC 30 字符下限挡在锚点之外，`Closure axioms` 只以边证据形式存在于 `edges-D1.jsonl:10/23`。
- `d:thm-15-4-identities-inherited-from-the-ambient-space`（`data/nodes-D2.jsonl:6`）持有 `15.06.md` 里 175 字符的「Axioms 3 and 4 / 7 through 10」句，那是本章内唯一逐字给出分组编号区间的原文行，但它在 15.06 节、不宜作 15.02 节点的锚点。
- `tools/check_unanchored_numbers.py:36` 的 REFWORDS 含 'axiom' 与 'to'，故本提案 statement 里的 1/2/3/6/7/10 都会被判为交叉引用、不会新增未锚数值告警（未实跑，按源码判断）。
