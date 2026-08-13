# G2c d:an-example-is-a-set-plus-two-explicit-operations 的重写

## 〇 结论速览（原 statement 几句 / 改写后几句 / 锚点几条 / 是否仍有无锚句）

| 项 | 原 | 改写后 |
| --- | --- | --- |
| statement 句数 | 2 句（含 6 个断言子句 C5.1–C5.6） | 2 句（含 4 个断言子句 N1–N4） |
| statement 字符数 | 437（实测） | 405（实测） |
| 锚点条数 | 1（138 字符） | 3（138 / 160 / 146 字符，全部 30–200 合规） |
| 是否仍有无锚句 | 有：C5.2、C5.3 全无锚（E 型），C5.4–C5.6 全无锚 | **无 E 型**。4 个子句全部落在锚点射程内 |
| 死因处置 | 死因 1（量词过度断言，A4a 判）+ ADJ3 查出的 C5.3 为假 | 两者均消除：删掉"must"必要性断言与"which is why"因果断言 |
| 建议动作 | **FIX（改写 + 补 2 条锚点），节点保留** | 置信度 0.85 |

节点存活理由与主控裁断一致（待应用清单 §2.2）：ADJ1 认为末句普查可复得、ADJ2 认为不可复得，主控查明例 5–12 无运算节点，第三桶确实无处可复得。但**本提案的做法与 §2.2 的"保留末句普查表"有一处偏离**：主控要求"删掉可复得的前两句、保留末句普查表"，而我把普查表的三桶枚举也删了，只留第三桶（函数空间前言）并给它**上了两条锚点**。理由见 §二末段与 §五。

主要变化：
1. 首句由"one **must** supply three data"（必要性）改为"is enough to produce"（充分性），与锚点 1 的 `If we specify … we get` 方向一致 —— 消除 ADJ3 的 D-2 射程错配。
2. 删 `Omitting either rule leaves the axioms with nothing to speak about`（C5.2，真但全章无锚，E 型）。
3. 删 `which is why the section fixes the operations before the sets`（C5.3，ADJ3 已证**为假**，例 1–4 反驳）。
4. 删例 1–3、例 4 两桶枚举（C5.4/C5.5，可在 `d:operations-of-example-1..4-*` 四节点复得，且借锚会新造 B 型）。
5. 保留第三桶（例 5–12 共用前言），并把该桶从"无锚断言"变成"两条锚点直接支撑"：新增锚点 1（前言的加法定义，160 字符）与锚点 2（前言的数乘定义，146 字符）。

## 一 当前 JSON 行原文（逐字）与 statement 逐句分解

依据：`tmp_index/nodes.tsv:120` 给出 loc = `data/nodes-D1.jsonl:42`；`sed -n '42p'` 取得下面这一行（逐字，未改动）：

```json
{"id": "d:an-example-is-a-set-plus-two-explicit-operations", "name_en": "An example is produced by naming the set and both operations", "name_zh": "给出一个例子=指定集合+两个运算", "node_type": "method", "sections": ["15.03"], "statement": "To exhibit a concrete linear space one must supply three data: the set V, a rule for adding two elements, and a rule for multiplying an element by a number. Omitting either rule leaves the axioms with nothing to speak about, which is why the section fixes the operations before the sets: Examples 1 to 3 name their own operations, Example 4 inherits those of V_n, and Examples 5 to 12 share the ones given in the function-space preamble.", "aliases": ["recipe for a concrete example"], "anchors": [{"file": "15.03.md", "quote": "If we specify the set V and tell how to add its elements and how to multiply them by numbers, we get a concrete example of a linear space."}], "parent": "apostol:linear-space", "atomic": true, "atomic_reason": "单一方法条款:三项数据缺一不可,无可再分。", "audit_fix": "audit-A4a"}
```

现状核对（全部来自索引表，未重算）：
- 锚点 1 条，`anchors.tsv:225`，`15.03.md`，实测 **138 字符**，不含换行；命中源文件 `source/apostol-ch15/15.03.md:3`（我自己 `in text` 复核为 True）。
- 该锚点 `shared-quotes.tsv:80`：**n_holders = 4**，持有者 `node:d:an-example-is-a-set-plus-two-explicit-operations`、`node:d:linear-space-is-a-set-together-with-two-operations`、`edge:data/edges-D1.jsonl:101`、`edge:data/edges-D1.jsonl:104`。即**唯一锚点本身就是 B 型借用**（两个节点同引一句），这也是 ADJ1 判 KILL 的主要理由。
- 证据池（`exposure.tsv:188`）：后代 0、T1=1、T2=2、T3=0，池总 3，**去重后不同 (file,quote) 仅 1 条**。T2 的两条（`edges-D1.jsonl:101` part-of、`:104` contrasts）evidence 与 T1 是同一句 138 字符 —— 这是过报通道 (c) 的典型：池 3 条但**新引入的源行数 = 0**。
- TD（`pool-TD-excluded.tsv:734/735`）两条边 `edges-D1.jsonl:110`、`:123` 均 origin=model、无 quote，按四层定义**排除**，不入池。

**源行 15.03.md:3 是多句行**（`source-lines.tsv`：len=253、`n_sentence_end=2`），故不得按行号做覆盖比对（过报通道 b）。该行第二句是 `The reader can easily verify that each of the following examples satisfies all the axioms for a real linear space.`，与本节点无关。

statement 逐句分解（子句编号沿用 ADJ3 §2.3 的 C5.x，判定我已独立复核）：

| # | 断言子句（逐字） | 类型 | 现有锚点覆盖 | 我的复核 |
| --- | --- | --- | --- | --- |
| C5.1 | `To exhibit a concrete linear space one must supply three data: the set V, a rule for adding two elements, and a rule for multiplying an element by a number.` | 必要性 | **部分**。锚点是 `If we specify … we get`，即**充分**方向 | 命题本身为真，但**方向与锚点相反 ⇒ D 型射程不足**。同 ADJ3 的 D-2 |
| C5.2 | `Omitting either rule leaves the axioms with nothing to speak about` | 推理 | **无** | 为真（去掉加法则 A1/3/4/5/6/8 无法陈述；去掉数乘则 A2/6/7/8/9/10 无法陈述），但 15.02 的公理表不在本节点 `sections` 内，本节无字面依据 ⇒ **E 型** |
| C5.3 | `which is why the section fixes the operations before the sets` | 因果 + 全称 | **无** | **假**。15.03:5/:7/:9 三例在同一句里同时给集合与运算；:11（例 4）只给集合、不提运算。"运算先于集合"只对 :13–19 的函数空间前言成立 ⇒ E 型 + 死因 1 |
| C5.4 | `Examples 1 to 3 name their own operations` | 枚举 | **无** | 真（:5、:7、:9）。但可在 `d:operations-of-example-1/2/3-*`（`nodes-D1.jsonl:45/48/51`）复得 |
| C5.5 | `Example 4 inherits those of V_n` | 枚举 | **无** | 真（:11）。可在 `d:operations-of-example-4-are-inherited-from-v-n`（`nodes-D1.jsonl:54`）复得 |
| C5.6 | `Examples 5 to 12 share the ones given in the function-space preamble` | 枚举 | **无** | 真（前言 :13–19 对例 :21–35）。**全图无其它节点承担**（例 5–12 无运算节点；唯一另外承担的 `d:for-function-spaces-closure-is-the-only-real-content` 被 B2 判 KILL）⇒ 这是本节点的**唯一不可复得内容** |

结论：原 statement 6 个子句里，**1 个假（C5.3）、1 个 D 型、4 个 E 型**，锚点射程内只覆盖 C5.1 的充分性方向。死因 1（A4a 已判）+ ADJ3 的 C5.3 假。死因 1 不因 T2 边证据而免除 —— 而这里 T2 与 T1 本就是同一句，连"记账位置问题"都不成立。

## 二 207 字符候选锚点的处置（截短方案逐字 + 实测字符数，或换用的新锚点）

**处置：换掉，不截短。** 该 207 字符候选整条弃用，本节点不引用 15.06 的任何文字。

先把它定位清楚。全图**不存在**任何 207 字符的既有锚点或边证据（`awk '$4==207' anchors.tsv`、`awk '$7==207' edges.tsv` 均 0 命中），15.03.md 也没有任何 195–215 字符的源行。这条 207 字符的东西是**候选**，出处是 `report/待应用-提案/G4-完备性-15.06.md:198` 与 `A4-形式B漂移与借用锚点.md:292/446`，逐字为：

```
The commutative and associative laws for addition (Axioms 3 and 4) and the axioms for multiplication by scalars (Axioms 7 through 10) are automatically satisfied in S because they hold for all elements of V.
```

我实测（Python `len()`，读 `source/apostol-ch15/15.06.md`）：**207 字符，`in text` = True，命中第 9 行，不跨行** —— 超 SPEC 200 上界 7 字符，确认。SPEC.md:54 的原文是"长度 30–200 字符"，无"新建/修改"之分，故这是硬违规。

三个可行截短版我都实测了（全部 `in text` True、命中 15.06.md:9、不跨行、且 exact-match 全图持有者 0）：

| 方案 | 逐字 | 实测字符数 | 30–200 |
| --- | --- | --- | --- |
| T-192 | `The commutative and associative laws for addition (Axioms 3 and 4) and the axioms for multiplication by scalars (Axioms 7 through 10) are automatically satisfied in S because they hold for all` | **192** | 合规 |
| T-166 | `The commutative and associative laws for addition (Axioms 3 and 4) and the axioms for multiplication by scalars (Axioms 7 through 10) are automatically satisfied in S` | **166** | 合规 |
| T-133 | `The commutative and associative laws for addition (Axioms 3 and 4) and the axioms for multiplication by scalars (Axioms 7 through 10)` | **133** | 合规 |

**但三者全部不采用，理由是射程错配，与截短无关：**
- 15.06 的主语是**某个环境线性空间 V 的非空子集 S**（`15.06.md:5` THEOREM 15.4），"其余公理自动成立"的机制是 `because they hold for all elements of V` —— 子集继承。
- 本节点的主语是 15.03 的**例子构造法**，`sections = ["15.03"]`。想用 15.06 就得把 `sections` 扩到含 `"15.06"`，那是改节点定义域，超出"重挂锚点"的范围。这与 `A4-形式B漂移与借用锚点.md:446` 的判断一致，我复核后同意。
- T-192 还额外坏：它把 `elements of V.` 切掉，句子停在 `hold for all`，语义悬空 —— 这本身就是新造一个 D 型。

**换用的两条新锚点（均取自 15.03 的函数空间前言，与本节点同 section）：**

| 序号 | file | 命中行 | 逐字 quote | 实测字符数 | 30–200 | 换行 | exact-match 全图持有者 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 新 #1 | 15.03.md | 13（唯一命中） | `The following examples are called function spaces. The elements of V are real-valued functions, with addition of two functions f and g defined in the usual way:` | **160** | 合规 | 无 | **1 个**：`node:apostol:function-space`（`anchors.tsv:672`）。边 0 个 |
| 新 #2 | 15.03.md | 19（唯一命中） | `Multiplication of a function f by a real scalar a is defined as follows: af is that function whose value at each x in the domain of f is $af(x)$ .` | **146** | 合规 | 无 | **3 个**：`node:d:function-space-scalar-multiple-is-pointwise`、`node:d:function-space-axioms-reduce-pointwise-to-facts-about-real-numbers`、`node:apostol:function-space`（`shared-quotes.tsv:25`，另 3 条边） |

字符数与 `in text` 均为本人 Python `len()` / `in` 实测；持有者用 (file, quote) **精确相等**比对 `anchors.tsv` + `edges.tsv` 全表算出（不是子串匹配）。

新 #2 会把该 quote 的节点持有者从 3 抬到 4，**这是新增一处 B 型共享**，必须交代清楚：本节点用它来支撑"前言在例子之前就把数乘定好了"（供给时序），另三个持有者用它支撑"数乘是逐点的"（运算定义本身）。断言不同 ⇒ 按形式 B 审查的标准属**合法共享**，不是漂移。若主控不接受抬升共享度，可退到只用新 #1 一条（此时 statement 第 2 句的数乘半句降为"部分支撑"，见 §四备注）。

关于借锚禁令的自查：续跑注记要求不得借 `d:operations-of-example-1-are-ordinary-arithmetic` 的 144 字符 EXAMPLE 1 整句锚点。**本方案未使用 15.03.md:5 的任何文字**，也未使用任何 `EXAMPLE N.` 开头的引文；改写后 statement 里不再出现例 1–4，从内容上也不再需要它。

## 三 改写后的 JSON 行全文（单行、可直接替换）

替换 `data/nodes-D1.jsonl:42` 整行。已用 `json.loads` 往返验证：可解析、与构造的 dict 相等、**不含换行**（单行 1376 字符）。三条 quote 均已 `in text` 复核为 True。

```json
{"id": "d:an-example-is-a-set-plus-two-explicit-operations", "name_en": "An example is produced by naming the set and both operations", "name_zh": "给出一个例子=指定集合+两个运算", "node_type": "method", "sections": ["15.03"], "statement": "Specifying the set V together with a rule for adding its elements and a rule for multiplying them by numbers is enough to produce a concrete example of a linear space. The preamble to the function spaces fixes both rules in advance for all the examples that follow it: addition of two functions f and g is defined in the usual way, and af is the function whose value at each x in the domain of f is af(x).", "aliases": ["recipe for a concrete example"], "anchors": [{"file": "15.03.md", "quote": "If we specify the set V and tell how to add its elements and how to multiply them by numbers, we get a concrete example of a linear space."}, {"file": "15.03.md", "quote": "The following examples are called function spaces. The elements of V are real-valued functions, with addition of two functions f and g defined in the usual way:"}, {"file": "15.03.md", "quote": "Multiplication of a function f by a real scalar a is defined as follows: af is that function whose value at each x in the domain of f is $af(x)$ ."}], "parent": "apostol:linear-space", "atomic": true, "atomic_reason": "单一方法条款:供给集合与两条运算规则,不可再分。", "audit_fix": "audit-A4a; G2c-rewrite"}
```

字段级 diff（其余字段未动）：

| 字段 | 原 | 新 |
| --- | --- | --- |
| `statement` | 437 字符，6 子句 | **405 字符，4 子句** |
| `anchors` | 1 条（138） | **3 条（138 / 160 / 146）**，均 15.03.md |
| `atomic_reason` | `单一方法条款:三项数据缺一不可,无可再分。` | `单一方法条款:供给集合与两条运算规则,不可再分。`（原文的"缺一不可"是 C5.2 的必要性说法，随 C5.2 删除一并改掉） |
| `audit_fix` | `audit-A4a` | `audit-A4a; G2c-rewrite` |
| `id` / `sections` / `parent` / `node_type` / `aliases` / `atomic` / `name_*` | — | **不变** |

边不动：`edges-D1.jsonl:101`（part-of → `apostol:linear-space`）、`:102`/`:103`（requires 两条闭包公理，origin=model 无 quote）、`:104`（contrasts → `d:nature-of-the-elements-is-left-unspecified`）保持原样；改写后的首句仍与 `:101`/`:104` 的 evidence（同 138 字符句）一致。指向本节点的两条 TD 边 `:110`/`:123` 也不动。

**本轮只读**：以上 JSON 未写入 `data/`，落盘由主控串行执行。

## 四 句—锚映射表

锚点序号：**#0** = 138 字符 `If we specify the set V and tell how to add …`（15.03.md:3，原有）；**#1** = 160 字符 `The following examples are called function spaces. The elements of V are real-valued functions, with addition …`（15.03.md:13，新增）；**#2** = 146 字符 `Multiplication of a function f by a real scalar a is defined as follows: af is …`（15.03.md:19，新增）。

改写后 statement 拆成 4 个断言子句（N1–N4）。第 1 句 = N1；第 2 句 = N2 + N3 + N4。

| # | 断言子句（逐字） | 支撑锚点 | 支撑程度 | 若部分，缺的是哪部分 |
| --- | --- | --- | --- | --- |
| N1 | `Specifying the set V together with a rule for adding its elements and a rule for multiplying them by numbers is enough to produce a concrete example of a linear space.` | **#0** | **完全** | 无。`Specifying the set V` ↔ `we specify the set V`；`a rule for adding its elements` ↔ `tell how to add its elements`；`a rule for multiplying them by numbers` ↔ `how to multiply them by numbers`；`is enough to produce a concrete example` ↔ `we get a concrete example`。**方向已统一为充分性**，逐词对应，D-2 消除 |
| N2 | `The preamble to the function spaces fixes both rules in advance for all the examples that follow it` | **#1** | **完全** | 无。`the function spaces` ↔ `are called function spaces`；`the examples that follow it` ↔ `The following examples`（#1 的主语字面就是"下文诸例"）；`in advance` = "前言在诸例之前"，由 `The following` 的时序义直接给出。"both rules"由 N3（加法）与 N4（数乘）分别落实，见下两行 —— 本行只承担"前言统一供给"这一层 |
| N3 | `addition of two functions f and g is defined in the usual way` | **#1** | **完全** | 无。#1 后半逐字为 `with addition of two functions f and g defined in the usual way:` —— 与 N3 除语序（`is defined` / `defined`）外逐词一致 |
| N4 | `and af is the function whose value at each x in the domain of f is af(x)` | **#2** | **完全** | 无。#2 逐字为 `af is that function whose value at each x in the domain of f is $af(x)$ .` —— 差别只有 `that`/`the` 与 LaTeX 包裹符 `$…$`（SPEC 禁止改引文标点，故 quote 保留 `$af(x)$ .`；statement 里写纯文本 `af(x)`。这是 statement 侧的正常改写，不是引文篡改） |

覆盖度自检（按"新引入的源行数"度量，不按池大小）：改写前池里去重后只有 **1** 条 (file,quote)，源行仅 15.03.md:3；改写后 **3** 条，源行 15.03.md:3、13、19 —— **新引入源行 2 行**，是真冗余增益，不是过报通道 (c)。

三条过报通道逐条排除：
- (a) 内容已下移到后代：本节点后代数 = 0（`exposure.tsv:188`），无下移空间，不适用。
- (b) 一源行含多句：#0 所在 15.03.md:3 `n_sentence_end=2`、#1 所在 :13 `n_sentence_end=1`、#2 所在 :19 `n_sentence_end=4`。**故本节全程不按行号做覆盖比对**，上表逐条按 quote 与子句的逐词对应判定。
- (c) 同一源行两半分落节点锚点与边证据：#0 确实是这种情形（T1 与 T2 两条边共用同一句），但我上面统计的是**去重后的 (file,quote)**，#0 只计 1，未把 T2 重复计入。

**备注（若主控为压低共享度而否掉 #2）**：只保留 #0 + #1 时，N4 从"完全"降为"**无**"（#1 只到冒号，不含数乘定义），N2 的 `both rules` 降为"**部分** —— 缺数乘那一半"。此时应把 statement 第 2 句改到只讲加法，否则立刻新造一个 E 型 + 一个 D 型。我不推荐这条退路。

## 五 残余风险

按盲区五型逐型给出改写后的残余状况：

- **A 型（变量/对象错）**：无。V、f、g、a、x 在三条 quote 与 statement 里指同一批对象；未出现例次编号，无编号错配空间。
- **B 型（借用引文）**：**仍有，且比改写前多一处。**
  - #0：节点持有者仍是 2 个（本节点 + `d:linear-space-is-a-set-together-with-two-operations`）。**这处未消除** —— ADJ1 判 KILL 的核心理由（与兄弟共用同一锚点）依然成立，本提案是靠"新增 2 条本节点独占方向的锚点"把节点的证据基础从 1 条共享句扩到 3 条，而不是靠拆掉 #0。若主控采 ADJ1 的合并路线，本提案作废。
  - #1：新增后节点持有者 1 → 2（另一个是 `apostol:function-space`）。
  - #2：新增后节点持有者 3 → 4。
  - 三处我都判**合法共享**（同句支撑不同断言），但共享度确实被抬高了 —— 这与 §6.4"SPEC 归因"里"高共享是 SPEC 3 锚上限直接造成的"是同一个机制：15.03 前言只有这两句可引，谁要讲函数空间的运算都得引它。
- **C 型（把端点当中间步骤）**：无。三条 quote 都是定义/说明句，statement 也停在"运算已被供给"，未拿定义句冒充结论。
- **D 型（覆盖范围不足）**：改写前的 D-2（必要性 vs 充分性）已消除。**残余一处弱 D**：N2 的 `for all the examples that follow it` 是全称量化，#1 的 `The following examples` 字面支撑"下文诸例"，但**没有给出"下文诸例"的下界**——即"到底是例 5 到例 12"这个范围，#1 本身不含例次。我在 statement 里已刻意**不写"Examples 5 to 12"**，改用 `the examples that follow it`，使断言的辖域与 quote 的辖域完全重合，故不判 D 型命中；但读者若想知道具体是哪 8 个例子，仍需下钻到 `d:example-5-*` … `d:example-12-*`。这是主控 §2.2"保留末句普查表"要求与"避免 D 型"要求之间的取舍点，**请主控裁**：要显式写出"Examples 5 to 12"就必然带回一个无锚的例次范围（现有三条 quote 都不含 `EXAMPLE 5`/`EXAMPLE 12` 字样，而补第 4 条锚点又超 SPEC 3 条上限）。
- **E 型（整句无锚）**：**无**。4 个子句全部有锚，这是改写的主要收益（原 6 子句里 4 个 E 型 + 1 个假）。

其它残余：
- 内容损失。C5.2（"缺任一运算则公理无所指"）为真但被删，全图此后**无节点承担**这条 —— 我核过它无处可复得（它要引 15.02 的公理表，越出本节点 sections）。若认为它值得保留，正确做法是**另建一个 sections=["15.02","15.03"] 的新节点**，不是塞回本节点。这条我**未核** 15.02 是否有可引的整句，留给主控。
- C5.4/C5.5 删除后，"例 1–3 自带运算、例 4 继承 V_n"改由 `d:operations-of-example-1..4-*` 四节点（`nodes-D1.jsonl:45/48/51/54`）承担。我读过这四条 statement，内容齐备。但**它们与本节点之间是否有边把这层关系连起来，我未核**（只知 `:110`/`:123` 是例 1、例 3 的运算节点 requires 本节点，例 2、例 4 的对应边未查）。
- 死因编号：原 **1**（量词过度断言，A4a 判；ADJ3 另证 C5.3 为假）。改写后判 **0**（无死因）。
- 建议动作：**FIX + 进 SPEC 无关**（本条不涉及 SPEC 条文变更）。节点**保留**。
- 置信度 **0.85**。不确定点三处：(i) 若主控最终采 ADJ1 的 KILL/合并，本提案整体作废；(ii) #2 抬升共享度是否被接受；(iii) 是否必须显式写出"Examples 5 to 12"（见上 D 型条）。

## 顺带发现

- 全图无 207 字符的既有锚点或边证据（`anchors.tsv` / `edges.tsv` 各 0 命中）；任务描述里的"15.06 一条候选锚点实测 207 字符"是**候选**，出处为 `G4-完备性-15.06.md:198`、`A4-形式B漂移与借用锚点.md:292/446`，非在册数据。
- `d:an-example-is-a-set-plus-two-explicit-operations` 的 T2 两条边证据与 T1 是**同一句 138 字符**，池 3 条但新引入源行 0 行 —— 建议 `exposure.tsv` 增一列"新引入源行数"，否则池总数会持续误导。
- 15.03.md:19 的 `The zero element is the function whose values are everywhere zero. The reader can easily verify that each of the following sets is a function space.`（实测 148 字符、合规、精确匹配全图持有者 0）是一条**尚未被任何节点或边使用**的整句，可作 15.03 覆盖率缺口的备用锚位。
- `d:function-space-addition-lives-on-the-intersection-of-domains` 的两条锚点分别是 `for every real x in the intersection of the domains of f and g.`（63 字符）与 `EXAMPLE 9. The set of all functions differentiable at a given point.`（68 字符，来自 15.03.md:29）—— 后者与"定义域交集"无关，疑似 B 型借用或挂错节点，未展开。
- `edges-D1.jsonl:102`/`:103`（本节点 requires 两条闭包公理）origin=model、无 quote，属 `unverified-model-quotes` 之外的另一类：完全无证据的 model 边，check_graph 也不校验。
