# A4 提案：形式 B 的 3 条真漂移与 7 条借用锚点

本文件是**提案**，不是执行结果。全部改写由主控自行落到 `data/` 下。本代理为只读代理，未写入 `data/` 下任何文件。

范围：`report/待应用清单.md` §6.1 的 3 条真漂移（死因 6）、§6.2 的 7 条借用锚点（死因 0，只摘锚点不动节点）。
另附 1 条本代理自行发现的**疑似**第 8 条借用锚点，标为 PLAUSIBLE，与被点名的 7 条严格分开。

采用的锚点判准（沿用 `report/审查-形式B-共享引文.md` 第 757–760 行自述的标准）：
锚点须支撑该节点的**主语**（在谈哪个对象）与**核心断言**；围绕核心断言的分析性展开视为 commentary，不单独要求锚点，但若分析中含可核的事实性主张，该主张须为真。

锚点 SPEC 复述（下文每条候选都按此逐项报告）：1–3 条；`quote` 须是 `file` 的逐字连续子串；30–200 字符；不跨行；不改标点、不省略号、不修 OCR 噪声。

字符数一律由本代理用 `len()` 实测，不沿用审查稿数字；`in_text` 与命中行号亦实测。

---

## 目录

- §0 校验方法与口径
- §1 §6.1 三条真漂移：逐断言拆解与替换锚点提案
  - §1.1 `d:degree-exactly-n-fails-axiom-2-at-the-scalar-zero`
  - §1.2 `d:degree-exactly-n-has-no-zero-element`
  - §1.3 `d:for-function-spaces-closure-is-the-only-real-content`
- §2 §6.2 七条借用锚点：逐条剥离方案与下限复查
- §3 疑似第 8 条借用锚点（PLAUSIBLE，未被点名）
- §4 对审查稿的四处实测更正
- §5 方法论发现：15.03 已被挖满，共享数本身不是缺陷
- §6 如实声明：剩余无法上锚的断言
- §7 主控执行清单（按文件、行号汇总）

## §0 校验方法与口径

**四层证据池。** 判断一条死因 6 指控是否成立，取以下三层为权威：T1 节点自身 anchors；T2 以该节点为 `src` 的边上的 evidence；T3 part-of 后代的 anchors 及后代发出的边。**TD（指向该节点的边）被排除**：下游消费者引了某行，不等于上游节点引了某行。T2 塌缩是记账位置问题，T3 塌缩是内容合法下移到子节点，两者补法不同，混为一谈会把修复引错方向。死因 1 对边证据免疫，死因 6 不免疫。

**冗余度口径。** 衡量替换锚点的收益，看它新引入的**源文句子**，不看"池子变大了"。把节点已经引过的行再引一遍，救不了任何断言。

**不用行号做覆盖比较。** 一行可以装好几句（15.10.md:119 是 460 字符 4 句；15.03.md:25 是 360 字符 4 句），行号比较无意义。

**机械信号只定向、不定论。** `check_unanchored_numbers.py` 召回 1/4；`check_shared_quotes.py` 对 238/522 = 46% 的节点是盲的。

**关于 `tools/verify_anchors.py` 的验证力（读源码第 40–80 行确认，未执行该脚本）：** 无锚节点被追加进 `nodes_without_anchor` 后 `continue`，**永不计入 failures**；唯一的检查是 `elif quote and quote in text`，其中 `text` 是**整份文件**，因此 30–200 长度规则与不跨行规则**从未被机器检查过**；`return 1 if failures or bad_json else 0`。所以验收必须去读 stdout 里 `nodes with NO anchor` 那一行，不能只看退出码。

**「N/N 锚点已验证」不得作为正确性保证汇报。** 本文件所有"已实测"仅指：逐字子串成立、长度落在 30–200、不跨行、命中行号唯一。它不保证引文支撑它所挂的断言——后者只能靠逐条人读。

**序列化。** `json.dumps(o, ensure_ascii=False)` 能逐字复现原 JSONL 行（已对 nodes-D4.jsonl:15、nodes-A2-x2.jsonl:2、nodes-D1.jsonl:69 三处校验过），故下文给出的"逐字最终文本"可直接落盘。

**边记录的 `evidence` 是单个对象（dict），不是数组。** 本代理第一版持有者普查按数组解析，漏计了边持有者，已重跑修正；下文所有边持有者数字来自修正后的普查。

## §1 §6.1 三条真漂移：逐断言拆解与替换锚点提案

三条节点**当前共用同一条锚点**，即 `15.03.md` 的 115 字符句：

```
The set of all polynomials of degree equal to n is not a linear space because the closure axioms are not satisfied.
```

该句在全图有 **2 个节点持有者**（不含本三条中另两条则为：`d:for-function-spaces-closure-is-the-only-real-content`、`d:degree-exactly-n-fails-axiom-2-at-the-scalar-zero`、`d:degree-exactly-n-has-no-zero-element`、以及 `d:degree-exactly-n-is-not-a-linear-space` 一族）与 **7 条边持有者**（edges-D1.jsonl:154、156、169、174、175、178、186）。这就是形式 B 把它挑出来的原因。

**共同的漂移机理：** 该句只说"次数恰为 n 的多项式集不是线性空间，因为封闭性公理不满足"。它给出的失效理由**只有封闭性**。三条节点分别在讲"公理 2 在标量 0 处失效"、"公理 5 无零元"、"函数空间里只有封闭性是真内容"——前两条讲的是**具体哪条公理、以何机制失效**，第三条讲的是**跨 Examples 5–12 的全局判断**。三者的核心断言都超出该句的字面射程，属 D 型（射程不足）叠 B 型（借用）。

**重要区分（对前两条）：** 这两条**不得归咎于 SPEC**。公理 2 整行 175 字符、公理 5 整行 85 字符，都落在 30–200 内，即**可引而未引**，不是"引不了"。

---

### §1.1 `d:degree-exactly-n-fails-axiom-2-at-the-scalar-zero`

- 目标文件：`data/nodes-D1.jsonl`，第 **69** 行
- id：`d:degree-exactly-n-fails-axiom-2-at-the-scalar-zero`
- sections：`["15.03"]`；parent：`d:degree-exactly-n-is-not-a-linear-space`
- 当前 anchors：1 条（上述 115 字符封闭性句）

statement 原文：

> For p of degree exactly n, the product 0p is the zero polynomial, which has no degree n and so lies outside the set; hence Axiom 2 fails for the single scalar a = 0. This failure is more radical than the additive one because it has no witness-dependent escape: it occurs for every member of the set.

**逐断言拆解**（(a)–(d) 为本提案编号）：

| 断言 | 内容 | 现锚点是否支撑 | 处理 |
| --- | --- | --- | --- |
| (a) | `0p` 是零多项式，零多项式没有次数 n | 否。现锚点一字未提标量乘、未提零多项式 | 属模型补的算术，源文无对应句可引（见 §6）。保留为 commentary |
| (b) | 因此它落在"次数恰为 n"的集合之外 | 部分。现锚点说了该集合不是线性空间，未说这一步 | 由 (c) 的公理 2 锚点 + 集合定义句共同承载 |
| (c) | **核心断言**：故公理 2 在单个标量 a = 0 处失效 | **否**。现锚点只说"封闭性公理不满足"，不区分公理 1 与公理 2，更不给出标量 0 | **必须补锚**：N1-a |
| (d) | 该失效比加法那条更彻底，因为无"见证依赖"的逃逸，对集合每个成员都发生 | 否 | 与加法失效的对照，用 N1-c 承载可核部分 |

**替换锚点候选**（不删原锚点，原锚点继续支撑"该集合不是线性空间"这一前提）：

**N1-a**（建议作为新增 anchors[1]）

- file：`15.02.md`；命中行号：**9**（唯一命中）
- 逐字 quote：

```
For every x in V and every real number a there corresponds an element in V called the product of a and x, denoted by ax.
```

- 实测字符数 **120**；30–200 **合规**；不跨行（该行第 9 行，quote 为其后缀）；`quote in text` = True
- 全图持有者：**节点 0 个、边 0 个** —— 这是本提案唯一"零共享"的候选，补它不新增任何共享
- 为什么：它是公理 2 的正文（"对每个 x 与每个实数 a，存在 V 中元素 ax"）。断言 (c) 说的正是"a = 0 时这个元素落在集合外"，主语（标量乘的结果元素）与判据（须属于 V）都由该句给出。取后缀而不取整行（整行 175 字符，含 `AXIOM 2. CLOSURE UNDER MULTIPLICATION BY REAL NUMBERS.` 标题，且整行已被 3 节点 + 1 边持有），是为了降共享、并让引文正对"结果元素须在集合内"这一判据。
- 验证方法：`open("source/apostol-ch15/15.02.md").read().split("\n")[8]` 的后缀比对；`len()` 实测 120；`quote in text` True；`sum(q in l for l in lines)` = 1。

**N1-c**（建议作为新增 anchors[2]，可选）

- file：`15.03.md`；命中行号：**25**（唯一命中）
- 逐字 quote：

```
For example, the sum of two polynomials of degree n need not have degree n.
```

- 实测字符数 **75**；30–200 **合规**；不跨行；`quote in text` = True
- 全图持有者：节点 1 个（`d:degree-exactly-n-fails-axiom-1-with-an-explicit-witness`）、边 2 个（edges-D1.jsonl:176、177）
- 为什么：断言 (d) 的对照项。该句的 `need not`（"未必"）正是"见证依赖"的字面依据——加法失效要举反例，而标量 0 的失效对每个成员都发生。补它使 (d) 的**对照的一半**有据；(d) 的另一半（"对每个成员都发生"）仍是模型推论，见 §6。
- 权衡：它会把该句的节点持有者从 1 提到 2。按 §5 的结论，这不构成缺陷，但若主控想把共享数压住，可只补 N1-a、把 (d) 整句降格为 commentary。

**提案后 anchors 逐字最终文本（3 条方案）：**

```json
[{"file": "15.03.md", "quote": "The set of all polynomials of degree equal to n is not a linear space because the closure axioms are not satisfied."}, {"file": "15.02.md", "quote": "For every x in V and every real number a there corresponds an element in V called the product of a and x, denoted by ax."}, {"file": "15.03.md", "quote": "For example, the sum of two polynomials of degree n need not have degree n."}]
```

**若只补 N1-a（2 条方案，本提案推荐）：**

```json
[{"file": "15.03.md", "quote": "The set of all polynomials of degree equal to n is not a linear space because the closure axioms are not satisfied."}, {"file": "15.02.md", "quote": "For every x in V and every real number a there corresponds an element in V called the product of a and x, denoted by ax."}]
```

推荐 2 条方案的理由：N1-a 一条就把核心断言 (c) 的漂移补掉了，而 (d) 是分析性展开，按判准不单独要求锚点。3 条方案的额外收益仅覆盖 (d) 的一半，代价是新增一处共享。

---

### §1.2 `d:degree-exactly-n-has-no-zero-element`

- 目标文件：`data/nodes-D1.jsonl`，第 **70** 行
- id：`d:degree-exactly-n-has-no-zero-element`
- sections：`["15.03"]`；parent：`d:degree-exactly-n-is-not-a-linear-space`
- 该节点带 `"audit_fix": "audit-A4a"`；`atomic_reason`：单一失效项:零元缺失;书中未点明,属模型补充。
- 当前 anchors：1 条（同一条 115 字符封闭性句）

statement 原文：

> The only candidate for O under pointwise addition is the zero polynomial, and it is excluded by the requirement of degree exactly n, so Axiom 5 has no witness and Axiom 6 loses its target. The set therefore fails not only closure, which is the reason Apostol gives, but also the additive axioms.

**先纠一处审查稿的判断错误。** 审查稿称 15.03 的括注句对本节点属"可引而未引"。**不成立**：该句已经出现在本节点**自己发出的两条边**上——

- `data/edges-D1.jsonl:182`：`d:degree-exactly-n-has-no-zero-element -part-of-> d:degree-exactly-n-is-not-a-linear-space`，evidence = 该括注句
- `data/edges-D1.jsonl:185`：`d:degree-exactly-n-has-no-zero-element -contrasts-> d:zero-polynomial-is-included-by-convention`，evidence = 该括注句

即 T2 层里它已在。这是**T2 塌缩**（记账位置问题），不是缺引。把它提升成 anchors 是一次**记账修复**，冗余度上不新增源文句子——按 §0 的冗余口径，它救不了任何断言。这一点必须写清，否则主控会以为补了它就把漂移补掉了。

**逐断言拆解：**

| 断言 | 内容 | 现锚点是否支撑 | 处理 |
| --- | --- | --- | --- |
| (a) | 逐点加法下 O 的唯一候选是零多项式 | 否 | 由 N2-a（零多项式的地位）+ N2-b（公理 5 正文）间接支撑；"唯一"是模型推论 |
| (b) | 零多项式被"次数恰为 n"排除 | 否。现锚点未提零多项式 | **补锚 N2-a**（T2 提升；见上，仅记账修复） |
| (c) | **核心断言**：故公理 5 无见证 | **否**。现锚点只说封闭性 | **必须补锚 N2-b** |
| (d) | 公理 6 因此失去作用对象 | 否 | 见 §6：公理 6 引用 O 的那一行是 16 字符显示公式，**低于 30 字符下限，不可引**。这一处**确属 SPEC 归因** |
| (e) | 因此该集合失效的不只是封闭性（Apostol 给的理由），还有加法公理 | 部分。"Apostol 给的理由是封闭性"由现锚点支撑；"还有加法公理"由 (c) 承载 | 现锚点保留即可 |

**替换锚点候选：**

**N2-b**（建议作为新增 anchors[1]，本条是三条候选里唯一非可选的）

- file：`15.02.md`；命中行号：**17**（唯一命中）
- 逐字 quote：

```
AXIOM 5. EXISTENCE OF ZERO ELEMENT. There is an element in V, denoted by O, such that
```

- 实测字符数 **85**（审查稿附录写 82，错，见 §4）；30–200 **合规**；不跨行（整行即 85 字符）；`quote in text` = True
- 全图持有者：节点 2 个（`d:axiom-5-existence-of-zero-element`、`d:thm-15-1-two-candidate-zeros-swap-roles-in-axiom-5`）、边 2 个（edges-D1.jsonl:17、27）
- 为什么：核心断言 (c) 说"公理 5 无见证"。公理 5 的内容是"**存在** V 中元素 O 使得……"，即一条存在性断言；"无见证"正是这条存在性断言在该集合上不成立。主语（O）与判据（存在于 V 中）都由该句给出，且该句以 `such that` 结尾、其后紧跟的 `x + O = x \quad f o r a l l x i n V.`（36 字符，可引）是 O 的定义式。
- 验证方法：`lines[16]`；`len()` = 85；`quote in text` True；唯一命中。

**N2-a**（建议作为新增 anchors[2]，可选；纯记账修复）

- file：`15.03.md`；命中行号：**25**（唯一命中）
- 逐字 quote：

```
(Whenever we consider this set it is understood that the zero polynomial is also included.)
```

- 实测字符数 **91**（审查稿附录写 90，错，见 §4）；30–200 **合规**；不跨行；`quote in text` = True
- 全图持有者：节点 1 个（`d:zero-polynomial-is-included-by-convention`）、边 3 个（edges-D1.jsonl:170、182、185，后两条即本节点自己）
- 为什么：支撑断言 (b) 的一半——它证明零多项式在 Apostol 那里需要**额外约定**才进入"次数 ≤ n"的集合，因此在"次数恰为 n"的集合里它自然在外。但请注意上文：这是把 T2 已有的证据搬到 T1，**不新增源文句子**。
- 若主控只想做最小改动：可只补 N2-b，把 N2-a 留在边上不动。

**另一条可选（N2-c，本提案不推荐）**

- file：`15.02.md`：17 行之后的公理 6 整行，`AXIOM 6. EXISTENCE OF NEGATIVES. For every x in V, the element $(-1)x$ has the property`，实测 **87** 字符，合规，唯一命中第 23 行；持有者节点 2 个（`d:axiom-6-existence-of-negatives`、`d:axiom-6-names-the-negative-as-minus-one-times-x`）+ 边 2 个（edges-D1.jsonl:18、29）。
- 不推荐的理由：它只能证明"公理 6 说了什么"，**不能**证明断言 (d)"公理 6 失去作用对象"——后者要引的是公理 6 里出现 O 的那半句，而那半句是独立显示公式 `x + (- 1) x = O.`，**16 字符，被 30 字符下限挡住**。补 N2-c 会给出一种"(d) 已上锚"的假象，正是 C 型盲区（把端点当中间步骤）。宁可如实留白（§6）。

**提案后 anchors 逐字最终文本（推荐：2 条，只补 N2-b）：**

```json
[{"file": "15.03.md", "quote": "The set of all polynomials of degree equal to n is not a linear space because the closure axioms are not satisfied."}, {"file": "15.02.md", "quote": "AXIOM 5. EXISTENCE OF ZERO ELEMENT. There is an element in V, denoted by O, such that"}]
```

**若同时做 T2 提升（3 条）：**

```json
[{"file": "15.03.md", "quote": "The set of all polynomials of degree equal to n is not a linear space because the closure axioms are not satisfied."}, {"file": "15.02.md", "quote": "AXIOM 5. EXISTENCE OF ZERO ELEMENT. There is an element in V, denoted by O, such that"}, {"file": "15.03.md", "quote": "(Whenever we consider this set it is understood that the zero polynomial is also included.)"}]
```

---

### §1.3 `d:for-function-spaces-closure-is-the-only-real-content`

- 目标文件：`data/nodes-D1.jsonl`，第 **62** 行
- id：`d:for-function-spaces-closure-is-the-only-real-content`
- type：concept；sections：`["15.03"]`；parent：`apostol:function-space`
- `atomic`：true；`atomic_reason`：单一判据陈述:验证工作全部落在封闭性上。
- 当前 anchors：1 条（同一条 115 字符封闭性句）
- **处理决定（来自 `待应用清单.md` §6.1）：重挂锚点，不得丢弃。已从 22 节点 KILL 批次中撤回。**

statement 原文：

> Since the pointwise laws hold automatically, deciding whether a given set of functions is a linear space amounts to asking whether it is closed under pointwise addition and pointwise scaling. Every success and every failure among Examples 5 to 12 is decided by that single question, and Apostol names the closure axioms in exactly the three places where a set fails.

**为什么现锚点是漂移。** 现锚点是 Example 7 里那句"次数恰为 n 的集合不是线性空间"。本节点的主语是**函数空间这一类的全部 Examples 5–12**，核心断言是"逐点律自动成立，故判定工作只剩封闭性"。用一个单例的失效句去支撑一个跨 8 个例子的全局判断，是典型 D 型（射程不足）：单例的失效**不能**证明"其余全部例子的判定也只看封闭性"。

**逐断言拆解：**

| 断言 | 内容 | 现锚点是否支撑 | 处理 |
| --- | --- | --- | --- |
| (a) | 逐点律自动成立 | 否 | **补锚 N3-a**（Apostol 明说"读者容易验证"，即把逐点律的验证判给读者） |
| (b) | **核心断言**：判定一个函数集是否线性空间，归结为问它是否对逐点加法与逐点数乘封闭 | **否**（只有单例） | 现锚点保留（它是三处失效之一）+ N3-b/N3-c 把"三处"补齐 |
| (c) | **可核事实性主张**：Apostol 恰在集合失效的那三处点出封闭性公理 | **否** | **已独立机械核实为真**：`closure axiom` / `closure axioms` 在 `15.03.md` 中恰好出现 **3** 次，分别在第 25 行（Example 7）、第 33 行（Example 11）、第 35 行（Example 12）。补锚 N3-b + N3-c 后三处齐备 |
| (d) | Examples 5 到 12 的每一次成功与每一次失败都由那一个问题裁定 | 否 | 全称量化，源文无对应句。见 §6。这是本节点最脆的一句 |

**替换锚点候选：**

**N3-a**（建议作为新增 anchors[0]，即置于最前）

- file：`15.03.md`；命中行号：**19**（唯一命中）
- 逐字 quote：

```
The reader can easily verify that each of the following sets is a function space.
```

- 实测字符数 **81**（审查稿 §3.1 写 81、附录写 78，附录错，见 §4）；30–200 **合规**；不跨行（该行共 360 字符，quote 为其末句）；`quote in text` = True
- 全图持有者：节点 1 个（`d:examples-are-asserted-to-satisfy-the-axioms-and-left-to-the-reader`）、边 1 个（edges-D1.jsonl:149）
- 为什么：支撑断言 (a)。它是 Apostol 把 Examples 5–12 的公理验证整体判给读者的那句，正是"逐点律自动成立、无需逐条验"的字面依据；同时它的主语（following sets，即 Examples 5–12 全体）与本节点主语一致——这是现锚点最缺的东西。

**N3-b**（建议作为新增 anchors[1]）

- file：`15.03.md`；命中行号：**33**（唯一命中，Example 11）
- 逐字 quote：

```
If we replace 0 by a nonzero number c, we violate the closure axioms.
```

- 实测字符数 **69**；30–200 **合规**；不跨行；`quote in text` = True
- 全图持有者：**节点 0 个**、边 2 个（edges-D1.jsonl:207、208，`d:example-11-a-nonzero-prescribed-value-breaks-closure` 发出）
- 为什么：断言 (c) 所说"三处"的第 2 处。零节点持有，补它不新增节点级共享。

**N3-c**（建议作为新增 anchors[2]）

- file：`15.03.md`；命中行号：**35**（唯一命中，Example 12）
- 逐字 quote：

```
The set of solutions of a nonhomogeneous differential equation does not satisfy the closure axioms.
```

- 实测字符数 **99**；30–200 **合规**；不跨行；`quote in text` = True
- 全图持有者：节点 1 个（`x:solution-set-of-a-homogeneous-linear-condition`）、边 2 个（edges-D1.jsonl:214、215）
- 为什么：断言 (c) 所说"三处"的第 3 处。

**锚点上限是 3，故必须做取舍。** 现锚点（第 1 处失效）+ N3-b（第 2 处）+ N3-c（第 3 处）恰好 3 条，正好把断言 (c) 这条**可核事实性主张**完整钉住；但这样 (a) 就没锚点了。反之 N3-a + N3-b + N3-c 也是 3 条，(a) 有锚点、"三处"只齐 2 处。

**本提案推荐：N3-a + 现锚点 + N3-b。** 理由：(a) 是核心断言 (b) 的前提（"逐点律自动成立"这一步不上锚，(b) 就悬空），必须留位；"三处"齐 2 处已足以让 (c) 从"零支撑"变成"多数支撑"，且第 3 处（N3-c）在 `x:solution-set-of-a-homogeneous-linear-condition` 与两条边上都在，T2/T3 可查；相比之下 (a) 在别处无任何替代。

**提案后 anchors 逐字最终文本（推荐）：**

```json
[{"file": "15.03.md", "quote": "The reader can easily verify that each of the following sets is a function space."}, {"file": "15.03.md", "quote": "The set of all polynomials of degree equal to n is not a linear space because the closure axioms are not satisfied."}, {"file": "15.03.md", "quote": "If we replace 0 by a nonzero number c, we violate the closure axioms."}]
```

**备选（把 (c) 钉满、放弃 (a) 的锚点）：**

```json
[{"file": "15.03.md", "quote": "The set of all polynomials of degree equal to n is not a linear space because the closure axioms are not satisfied."}, {"file": "15.03.md", "quote": "If we replace 0 by a nonzero number c, we violate the closure axioms."}, {"file": "15.03.md", "quote": "The set of solutions of a nonhomogeneous differential equation does not satisfy the closure axioms."}]
```

**关于审查稿提到的 15.06 候选（N3-opt / N3-opt2），本提案判为不可用：**

- `N3-opt`：`15.06.md`:9 的整句（"…are automatically satisfied in S because they hold for all elements of V."）实测 **207 字符，超 200 上限，SPEC 不合规，弃用**。
- 截短版 `The commutative and associative laws for addition (Axioms 3 and 4) and the axioms for multiplication by scalars (Axioms 7 through 10) are automatically satisfied in S` 实测 166 字符、合规、`in_text` True；`N3-opt2`（`Now we show that if S satisfies the closure axioms it satisfies the others as well.`，83 字符，合规，已被 2 节点持有）同样可用。
- **但两者都有射程错配**：15.06 讲的是定理 15.4，主语是**某个环境线性空间 V 的子集 S**，其"其余公理自动成立"是因为它们对 V 的所有元素都成立。本节点主语是 15.03 的**函数空间例子**，其"逐点律自动成立"是因为逐点运算归约到实数的算律——两条是不同的机制，前者不能当后者的证据。要用它就得同时把节点 `sections` 从 `["15.03"]` 扩到含 `"15.06"`，那实际上是改节点的定义域，超出"重挂锚点"的范围。**故不采用。**

---

## §2 §6.2 七条借用锚点：逐条剥离方案与下限复查

死因 **0**：只摘锚点，**不动节点、不动 statement、不动边**。

**全部 7 条 id 回显**（按 `待应用清单.md` §6.2 点名，逐条按 id 匹配定位，非按名字模糊匹配）：

1. `d:positivity-axiom-forbids-nonzero-self-orthogonal-elements`
2. `d:equality-holds-exactly-when-t-equals-s`
3. `apostol:cx-absolute-value-in-second-slot-breaks-symmetry`
4. `apostol:cx-root-of-sum-of-squared-products-breaks-linearity`
5. `apostol:cx-absolute-value-of-the-dot-product-breaks-homogeneity`
6. `apostol:cx-polarization-formula-is-twice-the-dot-product`
7. `apostol:cx-product-of-coordinate-sums-is-degenerate`

**下限复查总结论：7 条全部 2 → 1，锚点数下限（SPEC 要求 ≥ 1）无一被击穿，因此无需任何替换锚点。** 逐条数据见下。

---

### §2.1 `d:positivity-axiom-forbids-nonzero-self-orthogonal-elements`

- 目标文件：`data/nodes-D4.jsonl`，第 **15** 行
- 剥离对象：`anchors[1]`
- 借用的 (file, quote) 对：`15.10.md` :: `(b) $\| x\| >0$ if $x\neq O$ (positivity).`（实测 **42** 字符）
- 真正持有者：`d:norm-positivity-property`（`data/nodes-D3.jsonl`:31 的 `anchors[0]`），以及来源节点 `apostol:theorem-15-9-properties-of-norms`
- 为什么是借用：本节点讲的是**内积公理的正定性**禁止非零元与自身正交；被剥的那条是**范数**的正定性（定理 15.9(b)）。主语从内积 `(x, x)` 换成了范数 `||x||`，是 A 型（对象错）叠 B 型（借用）。
- 剥后 `anchors` 逐字最终文本：

```json
[{"file": "15.10.md", "quote": "(x, x) > 0 \\quad i f \\quad x \\neq O"}]
```

- 剥后条数 **1**，**下限未击穿**。存留锚点实测 35 字符，30–200 合规。

---

### §2.2 `d:equality-holds-exactly-when-t-equals-s`

- 目标文件：`data/nodes-D4.jsonl`，第 **52** 行
- 剥离对象：`anchors[1]`
- 借用的 (file, quote) 对：`15.15.md` :: `for all $t$ in $S$ ; the equality sign holds if and only if $t = s$ .`（实测 **69** 字符）
- 真正持有者：`apostol:theorem-15-16-approximation-theorem`（`data/nodes-A2-s3.jsonl`:1 的 `anchors[2]`）
- 为什么是借用：被剥的那条是**定理 15.16 陈述本身**的等号条件（定理级断言）；本节点是证明里"等号何时成立"的那一步。C 型（把端点当中间步骤）：用定理的结论去当证明步骤的证据。
- 剥后 `anchors` 逐字最终文本：

```json
[{"file": "15.15.md", "quote": "But $\\| s - t\\|^2 \\geq 0$ , so we have $\\| x - t\\|^2 \\geq \\| x - s\\|^2$ , with equality holding if and only if $s = t$ ."}]
```

- 剥后条数 **1**，**下限未击穿**。存留锚点实测 120 字符（`15.15.md`:23），30–200 合规，且它是证明内部那一步的原句，正对本节点断言。

---

### §2.3–§2.7 五条 cx 节点：同一条题干指令的借用

五条节点各自 `anchors[1]` 都是**同一条 117 字符题干**：

```
In each case, determine whether $(x, y)$ is an inner product for $V_{n}$ if $(x, y)$ is defined by the formula given.
```

- 真正持有者：`apostol:cx-inner-product-axiom-diagnosis`（`data/nodes-A2-x2.jsonl`:1 的 `anchors[0]`），它同时在 `data/edges-A2-x2.jsonl`:1、:6、:107 三条边上引用该句。**故五条全剥之后，该题干仍有 1 个节点持有者 + 3 条边持有者，不会变成孤引。**
- 为什么是借用：题干只说"逐题判断给定公式是否是 $V_n$ 的内积"。五条节点各自的核心断言是**某一个具体公式违反了哪一条公理**（对称性 / 线性 / 齐次性 / 是点积两倍 / 退化）。题干一字未提任何一条公理如何失效，对每条节点都只是**语境**，不是证据。D 型（射程不足）叠 B 型。每条节点的 `anchors[0]` 已是该题的公式本身，剥掉题干不损失任何支撑。

| # | 目标文件:行 | id | 剥后存留 anchors[0]（实测字符数） | 剥后条数 | 下限 |
| --- | --- | --- | --- | --- | --- |
| 3 | `data/nodes-A2-x2.jsonl`:2 | `apostol:cx-absolute-value-in-second-slot-breaks-symmetry` | `(x, y) = \sum_ {i = 1} ^ {n} x _ {i} \| y _ {i} \|.`（49） | 1 | 未击穿 |
| 4 | `data/nodes-A2-x2.jsonl`:3 | `apostol:cx-root-of-sum-of-squared-products-breaks-linearity` | `(x, y) = \left(\sum_ ... \right) ^ {1 / 2}.`（80） | 1 | 未击穿 |
| 5 | `data/nodes-A2-x2.jsonl`:4 | `apostol:cx-absolute-value-of-the-dot-product-breaks-homogeneity` | `(x, y) = \left\| \sum_ ... \right\|.`（60） | 1 | 未击穿 |
| 6 | `data/nodes-A2-x2.jsonl`:5 | `apostol:cx-polarization-formula-is-twice-the-dot-product` | `(x, y) = \sum_ ... (x _ {i} + y _ {i}) ^ {2} - ...`（127） | 1 | 未击穿 |
| 7 | `data/nodes-A2-x2.jsonl`:6 | `apostol:cx-product-of-coordinate-sums-is-degenerate` | `(c) $(x, y) = \sum_{i=1}^{n} x_i \sum_{j=1}^{n} y_j$ .`（54） | 1 | 未击穿 |

（表中为排版对齐做了省略与转义，**逐字最终文本见下方五个 JSON 块，落盘请用这五块，不要用表格里的省略形式。**）

`data/nodes-A2-x2.jsonl`:2 剥后 `anchors`：

```json
[{"file": "15.12-exercises.md", "quote": "(x, y) = \\sum_ {i = 1} ^ {n} x _ {i} | y _ {i} |."}]
```

`data/nodes-A2-x2.jsonl`:3 剥后 `anchors`：

```json
[{"file": "15.12-exercises.md", "quote": "(x, y) = \\left(\\sum_ {i = 1} ^ {n} x _ {i} ^ {2} y _ {i} ^ {2}\\right) ^ {1 / 2}."}]
```

`data/nodes-A2-x2.jsonl`:4 剥后 `anchors`：

```json
[{"file": "15.12-exercises.md", "quote": "(x, y) = \\left| \\sum_ {i = 1} ^ {n} x _ {i} y _ {i} \\right|."}]
```

`data/nodes-A2-x2.jsonl`:5 剥后 `anchors`：

```json
[{"file": "15.12-exercises.md", "quote": "(x, y) = \\sum_ {i = 1} ^ {n} (x _ {i} + y _ {i}) ^ {2} - \\sum_ {i = 1} ^ {n} x _ {i} ^ {2} - \\sum_ {i = 1} ^ {n} y _ {i} ^ {2}."}]
```

`data/nodes-A2-x2.jsonl`:6 剥后 `anchors`：

```json
[{"file": "15.12-exercises.md", "quote": "(c) $(x, y) = \\sum_{i=1}^{n} x_i \\sum_{j=1}^{n} y_j$ ."}]
```

**剥后总账：** 该 117 字符题干的节点持有者从 6 降到 1（`apostol:cx-inner-product-axiom-diagnosis`），边持有者 3 条不变。单看本组，全图锚点总数减 7（921 → 914）；叠加 §1 的补锚后的最终数见 §7 D。节点数、边数不变（522 / 1433）。

---

## §3 疑似第 8 条借用锚点（PLAUSIBLE，未被点名）

本条**不在** `待应用清单.md` §6.2 的 7 条之内，是本代理自查时发现的，与上面 7 条严格分开，**判定强度为 PLAUSIBLE，不是 CONFIRMED**，请主控人读定夺。

- 目标文件：`data/nodes-D4.jsonl`，第 **53** 行
- id：`d:strict-minimality-rests-on-positivity-of-the-norm`
- 疑似借用对象：`anchors[1]` = `15.10.md` :: `(x, x) > 0 \quad i f \quad x \neq O`（实测 **35** 字符）
- statement 原文：

> The step from ||s - t||^2 = 0 to s = t is exactly Theorem 15.9(b): the norm of a nonzero element is positive. Without positivity the theorem would only give a non-strict minimum.

- 为什么疑似借用：该 statement 通篇只谈**范数**与**定理 15.9(b)**，一字未提内积公理。而 `anchors[1]` 引的是**内积正定性公理**的式子。按审查稿自己在第 4 组用的逻辑（"主语从内积换成范数即为借用"），本条正是**镜像情形**——主语从范数换成了内积。审查稿宣称第 5 组"5/5 合法"，漏了这一条。
- 为什么只判 PLAUSIBLE 而非 CONFIRMED：该节点**点名了定理 15.9(b)**，而内积正定性公理正是该定理的证明依据，属**链式论证**（引上游根据）。这比第 4 组那种彻底的对象错配要弱。若采纳"允许引一层上游根据"的口径，本条合法；若采纳审查稿第 4 组的严格口径，本条是借用。**两种口径不能同时成立**，请主控择一并写进判准，否则下一轮又会漂。
- 该 (file, quote) 对的真正持有者：`d:positivity-axiom-forbids-nonzero-self-orthogonal-elements`（即 §2.1 那条，剥后它成为该节点的唯一锚点）
- 若判为借用、执行剥离，剥后 `anchors` 逐字最终文本：

```json
[{"file": "15.10.md", "quote": "(b) $\\| x\\| >0$ if $x\\neq O$ (positivity)."}]
```

- 剥后条数 **1**，**下限未击穿**。存留锚点实测 42 字符，30–200 合规，且正是"范数正定性"本身——与 statement 主语一致。
- 注意 `anchors` 顺序：本节点的 `anchors[0]` 已经是范数正定性那条、`anchors[1]` 才是内积那条，与 §2.1 的节点正好相反。**落盘时请按 index 剥，不要按"剥第二条"这种口头描述套用到别的节点上。**

**若这条也剥：** 全图锚点从 921 降到 **913**（减 8）。

---

## §4 对审查稿的四处实测更正

以下四处字符数以本代理 `len()` 实测为准，审查稿数字有误。这不是措辞问题——三条里有两条的数字被用来论证"可引 / 不可引"，错的数字会直接把归因引偏。

| 引文 | 位置 | 审查稿写 | 实测 | 影响 |
| --- | --- | --- | --- | --- |
| 公理 2 整行 | `15.02.md`:9 | 170 | **175** | 都在 30–200 内，结论（可引而未引）不变 |
| `The reader can easily verify that each of the following sets is a function space.` | `15.03.md`:19 | 附录 78 / §3.1 81 | **81** | 附录错；不影响可引性 |
| `(Whenever we consider this set it is understood that the zero polynomial is also included.)` | `15.03.md`:25 | 附录 90 | **91** | 不影响可引性 |
| `AXIOM 5. EXISTENCE OF ZERO ELEMENT. There is an element in V, denoted by O, such that` | `15.02.md`:17 | 附录 82 | **85** | 不影响可引性 |

**另外两处实质更正（不是数字）：**

1. 审查稿称 15.03 括注句对 `d:degree-exactly-n-has-no-zero-element` 属"可引而未引"——**不成立**，该句已在该节点自己发出的 `edges-D1.jsonl`:182 与 :185 上，属 T2 塌缩（记账位置问题）而非缺引。详见 §1.2。
2. 审查稿把 `15.06.md`:9 的整句作为可用候选提出——**实测 207 字符，超 200 上限，SPEC 不合规**。截短到 166 字符可合规，但存在射程错配（定理 15.4 的子集 S vs 15.03 的函数空间例子），本提案仍不采用。详见 §1.3 末段。

---

## §5 方法论发现：15.03 已被挖满，共享数本身不是缺陷

本代理对 `15.03.md` 全部可引句做了一次持有者普查，结果：**该节几乎每一句可引的句子都已经有节点持有者**，唯一无人持有的整句是

```
By unifying diverse examples in this way we gain a deeper insight into each.
```

（且它是 15.03 末段的修辞句，无法支撑任何具体断言。）

推论：**在一个已被密集开采的小节里，任何重新上锚都必然抬高共享计数。** 因此"这条引文被 4 个以上节点共享"这件事本身**不能**当作缺陷判据——形式 B 的机械信号只能用来定向。真正的判据是**承重性**：这条引文是否支撑了它所挂节点的主语与核心断言。§2 那 7 条要剥，不是因为它们共享数高，而是因为它们对各自节点**不承重**（题干只是语境、定理结论不是证明步骤、范数不是内积）。反过来，§1 提的 N1-c / N3-c 会抬高共享数，但它们承重，所以该补。

一个可直接用的推论，供后续轮次：**`check_shared_quotes.py` 的输出应当被当作"待人读清单"，而不是"待剥清单"。** 本轮 9 组里被判为真借用的只有 7 条锚点（约占该 9 组覆盖锚点的少数），其余是合法的多节点共引。

---

## §6 如实声明：剩余无法上锚的断言

以下断言在本提案执行后**仍然没有锚点支撑**。它们不是漏做，是源文里确实没有可引的句子（或被 SPEC 的字符下限挡住）。列在这里，供主控决定是"降格为 commentary"还是"改写 statement"。本代理**不为凑数编造锚点**。

1. **`0p` 是零多项式、零多项式没有次数 n**（§1.1 断言 (a)）。这是模型补的算术。`15.03.md` 只说"两个 n 次多项式之和未必是 n 次"（加法侧），标量侧一句没有。若要 100% 上锚，只能改 statement 把这一步降格为推论。
2. **"公理 6 失去作用对象"**（§1.2 断言 (d)）。公理 6 里出现 O 的那部分是独立显示公式 `x + (- 1) x = O.`，**实测 16 字符，低于 30 字符下限，不可引**。这一处**确属 SPEC 归因**（与前两条"可引而未引"不同，请勿混为一谈）。同理公理 5 的定义式 `x + O = x \quad f o r a l l x i n V.` 实测 36 字符，**在下限之上、可引**，已有 3 个节点持有（`d:axiom-5-existence-of-zero-element`、`d:axiom-5-states-the-zero-only-as-a-right-neutral-element`、`d:thm-15-2-left-neutrality-needs-the-commutative-law`），若主控愿把它塞进 §1.2 那条节点的第 3 个槽位，可多覆盖断言 (a) 的"唯一候选"半句——但那会占掉 N2-a 的位置，本提案不推荐。
3. **"Examples 5 到 12 的每一次成功与每一次失败都由那一个问题裁定"**（§1.3 断言 (d)）。全称量化，源文无对应句。`The reader can easily verify that each of the following sets is a function space.`（N3-a）只覆盖"成功"侧、且只是"判给读者"，覆盖不到"每一次失败"。这一句是该节点最脆的部分；若后续轮次要收紧死因 1（过度量化）的口径，它会再次被点名。**建议主控考虑把 statement 里 `Every success and every failure among Examples 5 to 12` 改成 `The successes and failures Apostol records among Examples 5 to 12`**，把全称降为对书中记录的陈述——但改 statement 超出"重挂锚点"的授权范围，故仅作建议，本提案不擅自改写。
4. **"该失效对集合每个成员都发生"**（§1.1 断言 (d) 后半）。同上，全称量化，无源文句。

---

## §7 主控执行清单（按文件、行号汇总）

**A. 补锚（§1，死因 6）——`data/nodes-D1.jsonl`**

| 行 | id | 操作 | 结果条数 |
| --- | --- | --- | --- |
| 62 | `d:for-function-spaces-closure-is-the-only-real-content` | 用 §1.3 推荐块整体替换 `anchors` | 3 |
| 69 | `d:degree-exactly-n-fails-axiom-2-at-the-scalar-zero` | 用 §1.1 的 2 条方案块整体替换 `anchors` | 2 |
| 70 | `d:degree-exactly-n-has-no-zero-element` | 用 §1.2 的 2 条方案块整体替换 `anchors` | 2 |

**B. 剥锚（§2，死因 0，只动 `anchors`，不动其他字段）**

| 文件 | 行 | id | 剥 index | 剥后 |
| --- | --- | --- | --- | --- |
| `data/nodes-D4.jsonl` | 15 | `d:positivity-axiom-forbids-nonzero-self-orthogonal-elements` | 1 | 1 |
| `data/nodes-D4.jsonl` | 52 | `d:equality-holds-exactly-when-t-equals-s` | 1 | 1 |
| `data/nodes-A2-x2.jsonl` | 2 | `apostol:cx-absolute-value-in-second-slot-breaks-symmetry` | 1 | 1 |
| `data/nodes-A2-x2.jsonl` | 3 | `apostol:cx-root-of-sum-of-squared-products-breaks-linearity` | 1 | 1 |
| `data/nodes-A2-x2.jsonl` | 4 | `apostol:cx-absolute-value-of-the-dot-product-breaks-homogeneity` | 1 | 1 |
| `data/nodes-A2-x2.jsonl` | 5 | `apostol:cx-polarization-formula-is-twice-the-dot-product` | 1 | 1 |
| `data/nodes-A2-x2.jsonl` | 6 | `apostol:cx-product-of-coordinate-sums-is-degenerate` | 1 | 1 |

**C. 待裁定（§3，PLAUSIBLE，不要自动执行）**

| 文件 | 行 | id | 若判借用则剥 index |
| --- | --- | --- | --- |
| `data/nodes-D4.jsonl` | 53 | `d:strict-minimality-rests-on-positivity-of-the-norm` | 1 |

**D. 执行后的验收口径**

- 期望锚点总数（按推荐方案）：A 组三条节点合计 1+1+1 = 3 → 3+2+2 = 7，**净增 4**；B 组**净减 7**。故 921 + 4 − 7 = **918**。若 C 组也执行，为 **917**。
- 若 A 组改用各自的备选方案，增量随之变化（§1.1 三条方案 = +2、§1.2 三条方案 = +2、§1.3 备选仍 = +2），请按实际采纳的方案重算，不要照抄 918。
- 节点数、边数不变：**522 / 1433**。
- `check_graph.py` problems 应仍为 **0**。
- `verify_anchors.py`：**必须读 stdout 里 `nodes with NO anchor` 那一行**，不能只看退出码（该脚本对无锚节点 `continue`、不计 failures；且从不检查 30–200 与不跨行）。本提案所有新增/存留锚点的长度与不跨行性已由本代理逐条实测，但**这不构成"锚点支撑断言"的保证**。

---

*本提案由只读分析代理产出。全部测量在 ROOT 下以 `tmp_` 前缀一次性脚本完成，脚本已删除。未读 `M08实验-Apostol微积分卷1/`；未读未被简报点名的其他代理输出文件；未对任何仓内脚本使用 `--help`；未写入 `data/` 下任何文件。*
