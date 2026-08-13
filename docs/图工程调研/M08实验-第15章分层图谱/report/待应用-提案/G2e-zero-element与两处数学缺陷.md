# G2e zero-element 与两处数学缺陷

本文只处理三条互不相干的小修，范围外不展开。所有引用的字符数取自
`tmp_index/anchors.tsv` / `edges.tsv` / `source-lines.tsv` 的 charlen 实测列。
本轮只读，不改 data/。

## 一 apostol:zero-element

节点：`data/inherited/nodes-A1.jsonl:8`，type=concept，sections=`["15.02","15.04"]`，2 条锚点。
statement 两句，须分开判：

- 句 1「Axiom 5 postulates an element of V, denoted by O, with x + O = x for all x in V.」
- 句 2「In a function space the zero element is the function whose values are everywhere zero.」

### 1.1 池清单（T1/T2/T3，取自 tmp_index/pool.tsv 该节点 7 行）

| 层 | via | file | charlen | quote |
| --- | --- | --- | --- | --- |
| T1 | 自身锚点 | 15.02.md | 85 | AXIOM 5. EXISTENCE OF ZERO ELEMENT. There is an element in V, denoted by O, such that |
| T1 | 自身锚点 | 15.04.md | 57 | Axiom 5 tells us that there is at least one zero element. |
| T2 | 自发边 `inherited/edges-A1.jsonl:4` | 15.02.md | 85 | （同上 85 字那条） |
| T3 | 后代锚 `d:axiom-5-states-the-zero-only-as-a-right-neutral-element` | 15.02.md | 36 | x + O = x \quad f o r a l l x i n V. |
| T3 | 同上后代锚 | 15.04.md | 88 | y_{2} + (x + y_{1}) = (y_{2} + x) + y_{1} = O + y_{1} = y_{1} + O = y_{1}. |
| T3 | 后代边 `edges-D1.jsonl:26` | 15.02.md | 36 | x + O = x \quad f o r a l l x i n V. |
| T3 | 后代边 `edges-D1.jsonl:27` | 15.02.md | 85 | （同上 85 字那条） |

`exposure.tsv`：后代数 1、T1=2、T2=1、T3=4、池总 7、去重后不同 (file,quote) **仅 4 条**。
池里出现的源文件只有 **15.02.md 与 15.04.md 两个**，没有任何一条 15.03.md 的证据。

### 1.2 TD 清单（pool-TD-excluded.tsv 该节点 14 行，一律不入池）
TD 共 14 条，涉及 15.02 / 15.06 / 15.07 / 15.08 / 15.11 / 15.13 / 15.14 / 15.03 各文件。
与本次争议直接相关的一条：

- `data/inherited/edges-A1.jsonl:18`，evidence=15.03.md，charlen=66，
  quote「The zero element is the function whose values are everywhere zero.」

**上一轮「死因 6 → 0」的理由无效，本轮独立确认。** 该边上 `apostol:zero-element` 是 **dst**，
按四层证据池定义属 TD，**不入池**。它是句 2 唯一的字面对应物，却恰好是唯一不能用的那一类。
「图里有这条边」不构成句 2 的证据支撑，只说明记账位置错了（内容挂在指向该节点的边上，
而不在该节点自身或其后代上）。

### 1.3 死因 6 判定：**成立，不归 0**

分句判定：

- **句 1 有支撑。** T1 的 85 字锚点给出 Axiom 5 的存在性与记号 O，但它在 “such that” 处截断，
  不含 `x + O = x` 本身；补上这一半的是 T3 后代锚（15.02.md，36 字，`x + O = x \quad for all x in V.`）。
  两条合起来覆盖句 1 全部内容。注意这属于过报通道 (c) 的镜像情形：句 1 的支撑是
  **两条锚点各覆盖一半**，任一条单独看射程都不足，不能拿 85 字那条单独宣称句 1 已验证。
- **句 2 无支撑。** 池内 4 条不同 (file,quote) 全部来自 15.02 / 15.04，讲的都是一般线性空间里
  Axiom 5 的存在性与唯一性，**没有一条提到函数空间**，更没有「处处取零的函数」。
  句 2 的字面出处只存在于 TD（`inherited/edges-A1.jsonl:18`，15.03.md）。

排除三条过报通道后仍成立：
- 通道 (a) 内容下移？**不成立。** 该节点只有 1 个 part-of 后代
  `d:axiom-5-states-the-zero-only-as-a-right-neutral-element`（`partof.tsv`），讲右单位元，与函数空间无关。
  写着句 2 内容的 `d:function-space-zero-is-the-everywhere-zero-function`（`nodes-D1.jsonl:60`，sections=15.03）
  parent 是 **`apostol:function-space`**，不是本节点，故不是本节点的 T3，下移抗辩不适用。
- 通道 (b) 单行多句？句 2 的源行 `apostol-ch15/15.03.md:19` 的 `n_sentence_end=4`，
  确属多句行，因此**不得**按行号做覆盖比对——但这只是禁止用行号高报，不改变「池内 0 条 15.03」这个结论。
- 通道 (c) 同行两半分挂节点与边？句 2 只在 TD 边上出现一次，无「两半」可拼。

盲区归型：句 2 是 **E 型（整句完全无锚）**，不是 D 型射程不足。
`shared-quotes.tsv` 显示 15.03 那条 66 字 quote 有 5 个持有者，但其中的 node 持有者是
`d:function-space-axioms-reduce-pointwise-to-facts-about-real-numbers` 与
`d:function-space-zero-is-the-everywhere-zero-function`，均非本节点，故也不构成 B 型借用的豁免。

**结论：死因 6 成立（针对句 2），建议动作 FIX，不撤回、不 KILL、不归 0。**
置信度高。不确定点：句 2 是否该保留在本节点、还是因与 `nodes-D1.jsonl:60` 重复而删除，属编辑口味，见 1.4 两案。

### 1.4 sections 改动与可落盘修正

**关键耦合：单加 `sections` 不能消死因 6。** sections 是元数据，不是证据；
若只把 15.03 写进 sections 而不加锚点，池内仍是 0 条 15.03，句 2 依旧无支撑，
反而制造「sections 声称覆盖 15.03、池里却查不到」的新不一致。故两项须同时落盘。

首选案（A 案，补锚 + 补 section）。新增锚点 quote 已实测：`apostol-ch15/15.03.md:19` 内
逐字连续子串、不跨行、charlen=**66**，落在 SPEC 30–200 界内。

```json
{"id":"apostol:zero-element","name_en":"Zero element","name_zh":"零元素","node_type":"concept","book":"apostol","sections":["15.02","15.03","15.04"],"statement":"Axiom 5 postulates an element of V, denoted by O, with x + O = x for all x in V. In a function space the zero element is the function whose values are everywhere zero.","aliases":["O"],"anchors":[{"file":"15.02.md","quote":"AXIOM 5. EXISTENCE OF ZERO ELEMENT. There is an element in V, denoted by O, such that"},{"file":"15.04.md","quote":"Axiom 5 tells us that there is at least one zero element."},{"file":"15.03.md","quote":"The zero element is the function whose values are everywhere zero."}]}
```

改动只有两处：`sections` 加 `"15.03"`；`anchors` 末尾加第 3 条。statement 不动。
落盘后句 2 由 E 型无锚变为 T1 直接支撑，死因 6 消解为 0。

备选案（B 案，删句 2）：把 statement 截为第一句，sections 保持 `["15.02","15.04"]` 不动，
理由是句 2 内容已由 `d:function-space-zero-is-the-everywhere-zero-function` 承载，本节点重复。
B 案同样能消死因 6，但会使本节点丢掉「同一概念在具体空间里的实例化」这一层，且与任务给的
「sections 补 15.03」指示相反。**我推荐 A 案**；若主控偏好去重，B 案也自洽，但两案不可混用
（B 案下绝不可再加 15.03 到 sections）。

冗余度提醒：A 案新引入的**源行数为 1**（15.03.md:19，池内此前无此行），
不是「池从 7 条变 8 条」这种规模叙述。


## 二 d:exponential-independence-select-the-largest-exponent

节点：`data/nodes-D2.jsonl:36`，type=method，sections=`["15.07"]`，
parent=`d:exponential-independence-proof-is-induction-on-n`，1 条锚点（15.07.md，67 字）。
池：T1=1、T2=1，去重后不同 (file,quote) 仅 1 条，即锚点自身那句
「Let $a_{M}$ be the largest of the n numbers $a_{1},\ldots ,a_{n}$ .」

statement 原文：
> The step picks a_M to be the largest of the n exponents. This uses the total ordering of the reals
> and the finiteness of the index set, so a maximum exists; the choice is what makes all the other
> exponents smaller by a strictly negative amount.

### 2.1 错在哪一步

错在**第二句的归因**，即分号后半「the choice is what makes all the other exponents smaller by a
strictly negative amount」——把「严格负」这一步的功劳记在了「取最大值」这个选择上，
而真正承载严格性的是 **a_k 两两不同（distinct）** 这条题设假设。

源文对照（`apostol-ch15/15.07.md`，Example 7）：
- 行 39：`EXAMPLE 7. If $a_1, \ldots, a_n$ are **distinct** real numbers, ...` —— distinct 是明写的题设。
- 行 51：`Let $a_{M}$ be the largest of the n numbers ...`（本节点锚点所在行）
- 行 57：`If $k \neq M$ , the number $a_k - a_M$ is **negative**.` —— 此处「negative」即严格负。

拆开看，两个前提各管一件事：

| 前提 | 它实际保证的结论 |
| --- | --- |
| 实数全序 + 指标集有限非空 | 最大值 **存在**，即 a_k − a_M ≤ 0 对一切 k 成立（**只到 ≤**） |
| a_1,…,a_n **两两不同** | k ≠ M 时 a_k − a_M ≠ 0，从而把 ≤ 0 提升为 **< 0**；并使最大值下标 M **唯一** |

statement 只列了第一行的两个前提（全序、有限），却宣称得到第二行的结论（strictly negative），
中间少了 distinct。仅凭全序 + 有限，只能得 a_k − a_M **≤ 0**，得不到严格负。
这是死因 **4（数学错误）**——不是措辞不严，而是推理链缺一条必要假设，且把严格性错误归因给了另一步。

失效场景（说明 distinct 不可省）：若允许重复，取 n = 2、a_1 = a_2 = 0，则 k ≠ M 时
a_k − a_M = 0，(15.3) 中该项为 e^0 = 1，x → +∞ 时**不趋于零**，Apostol 行 57 的取极限推出 c_M = 0
随即失效——整个 Example 7 的论证在此崩塌。可见严格负（而非仅 ≤ 0）是论证的承重点，
而它来自 distinct，不来自「选最大」。附带一点：无 distinct 时「the largest」还可能不唯一，M 本身也没定义好。

### 2.2 正确表述

建议把第二句改为（保留原句式，只补回真正的前提并纠正归因）：

> This uses the total ordering of the reals and the finiteness of the index set, so a maximum exists;
> and because the exponents a_1, ..., a_n are distinct by hypothesis, the index M is unique and
> a_k - a_M is strictly negative for every k != M. Existence of the maximum only gives a_k - a_M <= 0;
> the strict inequality comes from distinctness, and it is the strictness that makes each term with
> k != M tend to zero as x -> +infinity.

要点三条：最大值存在归于全序 + 有限；严格负与 M 唯一归于 distinct；并点明严格性正是后续取极限一步之所需。

### 2.3 可落盘修正

只改 `statement`（与随之微调的 `atomic_reason`），`anchors` / `sections` / `parent` / `node_type` 均不动
——现锚点（15.07.md，67 字）正对应「取最大」这一步，改文后仍逐字支撑第一句，无需换锚。

```json
{"id": "d:exponential-independence-select-the-largest-exponent", "name_en": "Selecting the largest exponent", "name_zh": "选取最大的指数", "node_type": "method", "sections": ["15.07"], "statement": "The step picks a_M to be the largest of the n exponents. The total ordering of the reals and the finiteness of the index set give only that a maximum exists, hence a_k - a_M <= 0 for all k. The strict inequality a_k - a_M < 0 for k != M, and the uniqueness of the index M, come from the hypothesis that a_1, ..., a_n are distinct; strictness is what later makes each term with k != M tend to zero as x -> +infinity.", "aliases": [], "anchors": [{"file": "15.07.md", "quote": "Let $a_{M}$ be the largest of the n numbers $a_{1},\\ldots ,a_{n}$ ."}], "parent": "d:exponential-independence-proof-is-induction-on-n", "atomic": true, "atomic_reason": "One selection step; the order-theoretic fact gives existence of the maximum and the distinctness hypothesis gives strictness. It has no substeps."}
```

死因 4 / 建议动作 **FIX**（不 KILL：这一步在原证明里真实存在，锚点也真实，只是归因写错）。
置信度高（行 39 的 distinct 与行 57 的 negative 均已逐字核对）。
不确定点：是否要为「distinct」另加一条 15.07.md:39 的锚点。倾向**不加**——本节点是「选最大」这一步，
distinct 是 Example 7 的全局题设，更该挂在 Example 7 的节点上；此处只需在 statement 里如实归因。
此项未核：Example 7 顶层节点当前是否已锚住 distinct，超出本轮范围。

## 三 d:pythagorean-split-of-the-approximation-error

节点：`data/nodes-D4.jsonl:51`，type=theorem，sections=`["15.15"]`，
parent=`d:approximation-inequality-with-equality-only-at-the-projection`，2 条锚点。
池：T1=2、T2=3，去重后不同 (file,quote) 3 条，全部来自 15.15.md。

statement 原文：
> Applying the Pythagorean formula to the decomposition of x - t gives
> ||x - t||^2 = ||x - s||^2 + ||s - t||^2. This identity, not an inequality, is the substantive content
> of the approximation theorem: the error of any competitor exceeds the error at s by exactly ||s - t||^2.

### 3.1 出处复核：**15.15 成立，15.11 不成立**

任务给的更正经独立复核为真，且该节点当前落盘值已经是 15.15，无需改 sections：

- `nodes.tsv` / `nodes-D4.jsonl:51`：`sections: ["15.15"]`。
- 两条锚点的 file 均为 **15.15.md**（charlen 58 与 47），见 `anchors.tsv`。
- 该节点作 src 发出的 3 条边（`edges-D4.jsonl:125/126/127`）evidence 的 file 也全是 **15.15.md**。
- 池内 5 行、去重 3 条，file 列**无一条 15.11.md**。

正面确认 15.15 有对应源文（`apostol-ch15/15.15.md`）：
行 14 `x - t = (x - s) + (s - t).`；行 17「…this is an orthogonal decomposition of $x - t$ ,
so its norm is given by the Pythagorean formula」；行 20 即勾股等式；
行 23「But $\| s - t\|^2 \geq 0$ , so we have $\| x - t\|^2 \geq \| x - s\|^2$ , with equality holding
if and only if $s = t$ .」

反面确认 15.11 无对应源文：在 `source-lines.tsv` 中筛 `apostol-ch15/15.11.md`，
**没有任何一行含 “Pythagor”**。15.11 谈的是正交性（「The zero element is orthogonal to every element of V…」，
该行只作为 `apostol:zero-element` 的一条 TD 出现，见本文第一节）。
故「此缺陷出自 15.11」是误记；勾股公式本身另有节点 `apostol:pythagorean-formula-for-orthogonal-decomposition`
（`nodes-A2-s2.jsonl:9`，sections=**15.14**），15.14 是公式的出处、15.15 是它在逼近定理里的应用，两处都不是 15.11。

**结论：出处 = 15.15（含公式来源 15.14），无 sections 改动。** 置信度高。

### 3.2 错在哪：末句把「误差」与「误差平方」混同

首句正确，不动：勾股公式用在 x − t = (x − s) + (s − t) 的正交分解上，确实给出
‖x − t‖² = ‖x − s‖² + ‖s − t‖²，且这是等式而非不等式，与行 20 逐字相符。

错在**末句**「the error of any competitor exceeds the error at s by **exactly ‖s − t‖²**」。
等式关于的是**平方范数**：差 ‖s − t‖² 是 ‖x − t‖² 与 ‖x − s‖² 之差，
而不是 ‖x − t‖ 与 ‖x − s‖ 之差。而「error」在本节上下文中指的是距离 ‖x − t‖ 本身
（行 23 用 ‖x − t‖² ≥ ‖x − s‖² 推出的正是「s 是最佳逼近」这一距离意义的结论）。
把两者对齐，末句成了 ‖x − t‖ − ‖x − s‖ = ‖s − t‖²，这是假的。死因 **4（数学错误）**。

反例（已数值核对，S = R² 的 x 轴，x = (0,1)，投影 s = (0,0)，竞争者 t = (1,0) ∈ S）：

| 量 | 值 |
| --- | --- |
| ‖x − t‖ | √2 ≈ 1.41421 |
| ‖x − s‖ | 1 |
| ‖s − t‖ | 1 |
| 平方等式 ‖x−t‖² = ‖x−s‖² + ‖s−t‖² | 2 = 1 + 1，**成立** |
| 末句所断言的 ‖x−t‖ − ‖x−s‖ | ≈ **0.41421** |
| 末句所说的「exactly ‖s−t‖²」 | **1** |

0.41421 ≠ 1，末句在最简单的欧氏例子上即失效；而同一组数据下平方形式的等式精确成立。
（另有一处次要不准：t = s 时差为 0，用 “exceeds” 不确，应说「超出量恰为 ‖s − t‖²，当且仅当 t = s 时为 0」。）

### 3.3 可落盘修正

只改 `statement`，`sections` / `anchors` / `parent` / `node_type` / `atomic_reason` 全部不动
——两条锚点（58 字的等式、47 字的 “so its norm is given by the Pythagorean formula”）本就是平方形式，
改文后与 statement 更贴合，不需换锚也不需补锚，新引入源行数 **0**。

```json
{"id": "d:pythagorean-split-of-the-approximation-error", "name_en": "The error identity ||x - t||^2 = ||x - s||^2 + ||s - t||^2", "name_zh": "误差恒等式 ||x - t||^2 = ||x - s||^2 + ||s - t||^2", "node_type": "theorem", "sections": ["15.15"], "statement": "Applying the Pythagorean formula to the decomposition of x - t gives ||x - t||^2 = ||x - s||^2 + ||s - t||^2. This identity, not an inequality, is the substantive content of the approximation theorem: the SQUARED error of any competitor t exceeds the squared error at s by exactly ||s - t||^2, the excess being 0 if and only if t = s. The statement is about squared norms; no such identity holds for the unsquared distances ||x - t|| and ||x - s||.", "aliases": [], "anchors": [{"file": "15.15.md", "quote": "\\| x - t \\| ^ {2} = \\| x - s \\| ^ {2} + \\| s - t \\| ^ {2}."}, {"file": "15.15.md", "quote": "so its norm is given by the Pythagorean formula"}], "parent": "d:approximation-inequality-with-equality-only-at-the-projection", "atomic": true, "atomic_reason": "一次把已证的勾股公式代入上一步的分解,是单一等式,已到底。"}
```

（落盘时把上面 JSON 里的 `SQUARED` 写作正常小写 `squared`；此处大写只为标出改动位置。）

死因 4 / 建议动作 **FIX**（不 KILL：等式本身正确、锚点正确、层位正确，坏的只是末句的量纲）。
置信度高（源文行 20/23 逐字核对 + 反例数值核对）。
不确定点：是否要把「‖s − t‖² ≥ 0 故得不等式」也并进本节点。倾向不并——那是 parent
`d:approximation-inequality-with-equality-only-at-the-projection` 的内容（对应行 23），
并进来会造成层塌缩（死因 5 的制造方式）。

## 顺带发现

- 权威 backlog `report/待应用清单.md` 里**不存在 §4.9**（`grep -n '^#'` 只有 4.1、4.2 两个四级小节），本轮三条节点在该文件中也检索不到，任务编号与 backlog 现状不符，请主控核对编号来源。
- backlog:179 提到的是 `d:degree-exactly-n-has-no-zero-element`（另一个节点），与本轮 `apostol:zero-element` 同名易混，裁决时勿并。
- `apostol:zero-element` 的 TD 里有两条 evidence 为空（`edges-D2.jsonl:35`、`inherited/edges-A1.jsonl:6`，charlen=0），本轮未追查。
- 15.02.md 那条 85 字 quote 有 6 个持有者（3 节点 3 边，见 shared-quotes.tsv），是本章共享度较高的一条，可能属 SPEC 归因批次，本轮未展开。
- 15.15.md 那条 96 字 quote 的两个持有者都是边（`edges-A2-s3.jsonl:4`、`edges-D4.jsonl:126`），无节点持有，未核是否合规。
- 池内多条锚点带 OCR 空格残留（如 `f o r a l l x i n V.`、`\sum_ {i = 1}`），逐字校验能过但可读性差，本轮未处理。

