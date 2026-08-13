# A5 提案 —— CX2 全 15 节点 + 15.12 习题 1 的 5 个节点：登记形式 E，给诚实 origin

只读代理产出的**提案**，不是执行结果。主控自行改数据。
本文件不写 `data/` 下任何内容；核验用的一次性脚本 `tmp_a5_verify.py` 已在收尾时删除。

## §0 结论摘要（先看这一段）

1. **20 个节点全部 KEEP，登记形式 E（有子句完全无锚），零 KILL。** 与 §六 6.3 的裁定一致。
2. **锚点核验：41 条锚点全部逐字通过**，`occurrences` 均为 1（无多处歧义命中），
   换行 0 条，实测长度 min 34 / max 167，全部落在 SPEC 的 30–200 区间内。**0 违规。**
3. **锚点确实只覆盖题面**，逐条回源比对已确认（按字符偏移定位，不按行号）。
   41 条锚点里没有一条含失效诊断、见证元素或数值。三份源文件里**不存在**任何答案文本
   （见 §2.3 的强化核验：不只 grep `answer`，还扫了 8 个解答标志词，唯一命中是
   15.05 第 17 题的 "All **solutions** of a linear second-order..."，是题面用词，不是答案）。
4. **字段方案：推荐形态 (a)，即节点带 `origin`。理由是它已经不是待议项——**
   `origin` 已在 33 个节点上实际使用（D1 1 / D2 8 / D3 4 / D4 9 / H2 11），
   `origin_note` 已在 39 个节点上使用，且 `tools/export_obsidian.py` **已经实现了两者的渲染**
   （`:183-184` 写进 frontmatter，`:229-230` 渲染成「## 来源说明」章节）。
   详见 §3——这一项**不是新增 SPEC 能力，而是补写 SPEC 已落后于实现的文档**。
5. 改动量：**15 个 CX2 节点各加 1 个字段**（`origin`，`origin_note` 已有，不动）；
   **5 个 15.12 节点各加 2 个字段**（`origin` + 新写 `origin_note`）。逐字文本见 §5。
6. 未做完的：见 §7。有 1 项须主控裁断（`apostol:cx-inner-product-axiom-diagnosis`
   是否一并处理，它是习题 1 的伞节点但不在本简报点名的 5 个之内）。

## §1 20 个节点的 id 回显（必须回显，防名字匹配错杀）

按简报要求逐个回显 id + 文件 + 行号。**这 20 个全部 KEEP。**

### 1.1 CX2 的 15 个（`data/nodes-CX2.jsonl`，行号即文件内行序）

| # | 行 | id | 题源 | 现有 `origin_note` |
| --- | --- | --- | --- | --- |
| 1 | :1 | `apostol:cx-inhomogeneous-endpoint-condition-breaks-closure` | 15.05 Ex 5 | 有 |
| 2 | :2 | `apostol:cx-increasing-functions-fail-under-negative-scalars` | 15.05 Ex 11 | 有 |
| 3 | :3 | `apostol:cx-integral-inequality-breaks-the-scalar-axioms` | 15.05 Ex 14 | 有 |
| 4 | :4 | `apostol:cx-union-of-two-coordinate-planes-fails-additive-closure` | 15.05 Ex 23 | 有 |
| 5 | :5 | `apostol:cx-affine-line-missing-the-origin` | 15.05 Ex 25 | 有 |
| 6 | :6 | `apostol:cx-scalar-product-that-kills-the-second-coordinate` | 15.05 Ex 31(a)+30(b) | 有 |
| 7 | :7 | `apostol:cx-addition-that-discards-the-second-coordinate-has-no-zero` | 15.05 Ex 31(b) | 有 |
| 8 | :8 | `apostol:cx-addition-that-keeps-only-the-left-first-coordinate-is-noncommutative` | 15.05 Ex 31(c) | 有 |
| 9 | :9 | `apostol:cx-a-whole-line-of-right-zeros` | 15.05 Ex 31(c) | 有 |
| 10 | :10 | `apostol:cx-addition-reading-one-coordinate-from-each-summand` | 15.05 Ex 31(d) | 有 |
| 11 | :11 | `apostol:cx-absolute-value-in-the-scalar-product-destroys-the-identity` | 15.05 Ex 31(d) | 有 |
| 12 | :12 | `apostol:cx-degree-exactly-k-inside-p-n-still-fails-closure` | 15.09 Ex 20 | 有 |
| 13 | :13 | `apostol:cx-span-does-not-commute-with-intersection` | 15.09 Ex 22(g) | 有 |
| 14 | :14 | `apostol:cx-a-basis-for-v-need-not-contain-a-basis-for-a-subspace` | 15.09 Ex 24(d) | 有 |
| 15 | :15 | `apostol:cx-an-identity-hides-a-dependence-among-transcendental-functions` | 15.09 Ex 23(e)(h)(g) | 有 |

### 1.2 15.12 习题 1 的 5 个（`data/nodes-A2-x2.jsonl`）

我自己定位的结果，回显如下。**这 5 个都在 `nodes-A2-x2.jsonl`，不在 `nodes-CX2.jsonl`**
（该文件共 25 个节点锚到 `15.12-exercises.md`，其中习题 1 的候选公式节点恰为下列 5 个）：

| # | 行 | id | 对应习题 1 的哪一式 | 现有 `origin_note` |
| --- | --- | --- | --- | --- |
| 16 | :2 | `apostol:cx-absolute-value-in-second-slot-breaks-symmetry` | 源 :8 标 `\tag{d}` 的 `sum x_i \|y_i\|` | **无** |
| 17 | :3 | `apostol:cx-root-of-sum-of-squared-products-breaks-linearity` | 源 :12 标 `\tag{b}` 的开方式 | **无** |
| 18 | :4 | `apostol:cx-absolute-value-of-the-dot-product-breaks-homogeneity` | 源 :16 标 `\tag{e}` 的 `\|sum x_i y_i\|` | **无** |
| 19 | :5 | `apostol:cx-polarization-formula-is-twice-the-dot-product` | 源 :20 无 tag 的极化式 | **无** |
| 20 | :6 | `apostol:cx-product-of-coordinate-sums-is-degenerate` | 源 :23 的 `(c)` 坐标和之积 | **无** |

**定位依据与边界**：`15.12-exercises.md:3` 是习题 1 的题干，`:5` 是一个孤立的 `(a)`，
随后 `:8/:12/:16/:20` 四个行间公式分别带 `\tag{d}`、`\tag{b}`、`\tag{e}`、无 tag，
`:23` 是 `(c)`。**OCR 把 (a)–(e) 的字母与公式的对应关系打乱了**（`(a)` 孤立成行、
四式的 tag 顺序为 d/b/e/无），所以「哪一式是 (a)」在源文件里已不可判定。
这 5 个节点的做法是**只锚公式本体、不声称字母编号**，这是对的；我在 §5 的
`origin_note` 里把这一点如实登记，避免后续有人按字母去核而误判。
`:7`（`cx-anisotropy-forces-a-definite-form`）与 `:8`（`cx-isotropic-element-in-a-mixed-sign-plane`）
属**习题 2**，不在本批；`:1`（`cx-inner-product-axiom-diagnosis`）是伞节点，见 §7.1。

## §2 核实：这 20 个节点的锚点是否真的只覆盖题面

### 2.1 方法（不按行号比对）

按 4.3 的纪律，**不做行号级覆盖比对**。做法是：对每条 `quote` 取它在源文件中的
**字符偏移**，由偏移反查所在行的**全文**，同时算出 `len(quote) / len(所在行)` 的占比，
再人工读该行全文判断被覆盖的是哪一句。这样 15.05:3（418 字符、5 句）、
15.05:67（291 字符、3 句）、15.12:3（299 字符、3 句）这三条长行不会被误判成「整行已覆盖」。
另记录 `occurrences`（该 quote 在全文出现次数），用于排除歧义命中。

### 2.2 逐条结果（41 条锚点）

全部 `verbatim=True`、`occurrences=1`、`newline=0`。长度与占比如下，
**「覆盖内容」一栏是回源读过该行全文后的判断**：

| 节点 # | 锚点 | 源行 | 长度 | quote/行 | 覆盖内容 |
| --- | --- | --- | --- | --- | --- |
| 1 | A1 | 15.05:15 | 35 | 56% | 第 5 题题面（同行另含第 10 题，未覆盖） |
| 1 | A2 | 15.05:3 | 70 | 17% | 前言第 4 句：Ex 3/4/5 的定义域约定 |
| 2 | A1 | 15.05:17 | 70 | 100% | 第 6 题 + 第 11 题两条题面（OCR 合并行） |
| 2 | A2 | 15.05:3 | 65 | 16% | 前言第 5 句：Ex 7–12 的定义域约定 |
| 3 | A1 | 15.09→15.05:25 | 67 | 100% | 第 14 题题面 |
| 3 | A2 | 15.05:23 | 64 | 100% | 第 13 题题面（对照用） |
| 4 | A1 | 15.05:45 | 64 | 100% | 第 23 题题面 |
| 4 | A2 | 15.05:3 | 55 | 13% | 前言第 2 句：「tell which axioms fail to hold」指令 |
| 5 | A1 | 15.05:49 | 69 | 100% | 第 25 题题面 |
| 5 | A2 | 15.05:47 | 54 | 100% | 第 24 题题面（对照用） |
| 6 | A1 | 15.05:69 | 103 | 100% | 第 31(a) 题的两个运算定义 |
| 6 | A2 | 15.05:65 | 167 | 100% | 第 30(b) 题面（Apostol 的独立性断言） |
| 7 | A1 | 15.05:71 | 92 | 100% | 第 31(b) 题的两个运算定义 |
| 7 | A2 | 15.05:67 | 69 | 24% | 第 31 题前言第 3 句：指令 |
| 8 | A1 | 15.05:73 | 96 | 100% | 第 31(c) 题的两个运算定义 |
| 8 | A2 | 15.05:67 | 77 | 26% | 第 31 题前言第 1 句：S 的定义 |
| 9 | A1 | 15.05:73 | 96 | 100% | 第 31(c) 题的两个运算定义（与 #8 同一条，见 §2.4） |
| 9 | A2 | 15.05:67 | 69 | 24% | 第 31 题前言第 3 句：指令（与 #7 同一条） |
| 10 | A1 | 15.05:75 | 116 | 100% | 第 31(d) 题的两个运算定义 |
| 10 | A2 | 15.05:67 | 143 | 49% | 第 31 题前言第 2 句：指令 |
| 11 | A1 | 15.05:75 | 116 | 100% | 第 31(d) 题的两个运算定义（与 #10 同一条） |
| 11 | A2 | 15.05:67 | 69 | 24% | 第 31 题前言第 3 句：指令（与 #7、#9 同一条） |
| 12 | A1 | 15.09:31 | 73 | 100% | 第 15 题 + 第 20 题两条题面（OCR 合并行） |
| 12 | A2 | 15.09:29 | 83 | 100% | 第 14 题 + 第 19 题两条题面（OCR 合并行） |
| 13 | A1 | 15.09:51 | 64 | 100% | 第 22(g) 题面：「Give an example in which …」 |
| 13 | A2 | 15.09:49 | 85 | 100% | 第 22(f) 题面：单向包含（Apostol 的断言） |
| 14 | A1 | 15.09:79 | 49 | 100% | 第 24(d) 题面（Apostol 的断言） |
| 14 | A2 | 15.09:77 | 52 | 100% | 第 24(c) 题面（Apostol 的断言） |
| 15 | A1 | 15.09:59 | 34 | 100% | 第 23(e) 的集合 |
| 15 | A2 | 15.09:61 | 34 | 100% | 第 23(h) 的集合 |
| 15 | A3 | 15.09:67 | 34 | 100% | 第 23(g) 的集合（对照用） |
| 16 | A1 | 15.12:8 | 49 | 88% | 公式本体（未覆盖行尾 `\tag{d}`） |
| 16 | A2 | 15.12:3 | 117 | 39% | 习题 1 题干第 2 句：指令 |
| 17 | A1 | 15.12:12 | 80 | 92% | 公式本体（未覆盖 `\tag{b}`） |
| 17 | A2 | 15.12:3 | 117 | 39% | 同上指令（与 #16 同一条） |
| 18 | A1 | 15.12:16 | 60 | 90% | 公式本体（未覆盖 `\tag{e}`） |
| 18 | A2 | 15.12:3 | 117 | 39% | 同上指令 |
| 19 | A1 | 15.12:20 | 127 | 100% | 极化式本体 |
| 19 | A2 | 15.12:3 | 117 | 39% | 同上指令 |
| 20 | A1 | 15.12:23 | 54 | 100% | 第 (c) 式题面 |
| 20 | A2 | 15.12:3 | 117 | 39% | 同上指令 |

**结论：41/41 条锚点覆盖的都是题面**——集合定义、运算定义、题干指令、或相邻题的题面（对照用）。
**没有任何一条覆盖失效诊断、见证元素或数值。**这与 §六 6.3 的机制描述完全一致。

### 2.3 「源文件无答案」的强化核验

原核验是 `grep -ci answer` = 0。这个信号太弱（答案未必用 answer 一词），故补测：
对三份源文件扫 `solution|answer|because|therefore|hence|it follows|fails|violated by|we get`，
结果 15.05 命中 1、15.09 命中 0、15.12 命中 0。
唯一那 1 处是 `15.05-exercises.md:31`：

```
17. All solutions of a linear second-order homogeneous differential equation $y'' + P(x)y' +$
```

即第 17 题题面里的 "All solutions of"，**是题面用词，不是答案**。
另：`15.12-exercises.md` 共 152 行，含 Exercise 1–12，通读确认全是「Prove / Determine /
In case … tell which axioms」型指令，无一处给出结论。
**故三份文件零答案这一事实成立，20 个节点的诊断结论 100% 是模型自算。**

### 2.4 顺带发现的两项（不改变裁定，登记备查）

**(i) 本批内部存在形式 B（借用引文）共享。**同一 `(file, quote)` 对被多个节点引用：

- `15.05:73` 的 31(c) 运算定义：#8、#9 共享（拆题所致，两节点确实都在讲 31(c)，合理）
- `15.05:75` 的 31(d) 运算定义：#10、#11 共享（同上，合理）
- `15.05:67` 的 "If the set is not a linear space, indicate which axioms are violated."：#7、#9、#11 三家共享
- `15.12:3` 的 "In each case, determine whether …"：#16–#20 五家共享，且 `nodes-A2-x2.jsonl:1`
  的伞节点也用它，实为 6 家

按 4.6 的定义这属**记账层面的共享，不构成新死因**：这些是题干指令句，性质上就是全题公用的，
不是「拿别人的证据充自己的数」。但它意味着**这批节点的锚点里，人均有 1 条是不带任何
本题信息的公用指令句**——即每个节点真正指向本题的锚点通常只有 1 条。
这一点在 §3 讨论「为什么 `origin` 字段是必需的而不是可选的」时会用到。

**(ii) 两处 OCR 合并行导致锚点夹带邻题。**#2 的 A1 夹带第 6 题、#12 的 A1/A2 各夹带第 15/14 题。
`反例层-15.05与15.09.md` §4 已自行登记过这一点，**不是本次新发现，也不是缺陷**
（`grep -F` 意义下合法，且非人工拼接）。此处仅复核确认属实。

## §3 字段方案：怎么在节点上诚实标注 origin

### 3.1 先纠正简报里的一处前提

简报说「当前 SPEC 里 `origin` 只定义在**边**上，节点是否可带 `origin` 属于待议 SPEC 修订项」。
**这个前提只对了一半，须纠正**，否则方案会选错：

- **SPEC 的边 schema（`SPEC.md:70`）确实定义了 `origin`。**这部分对。
- **但 SPEC 的「锚点规则」一节（`SPEC.md:55`）也已经在节点语境里写了 `origin: model`：**

  ```
  - 找不到可逐字引用的依据 ⇒ **不要收录**,或标 `origin: model` 并如实说明。
  ```

  这条位于 `## 锚点规则(唯一硬校验)` 之下，紧跟节点 `anchors` 的长度规则，
  且「不要收录」的宾语是**节点**（边不叫「收录」）。所以 SPEC 已经授权了节点带 `origin: model`，
  只是没把它写进 §节点 schema 的那一行 JSON 里。
- **实现层面早已落地。**见 3.2。

**所以这不是「新增一项 SPEC 能力」，而是「补写 SPEC 已落后于自身实现与自身规则的文档」。**
定性变了，处置的门槛也就变了：不需要等 SPEC 裁议才能动手。

### 3.2 已存在的事实基础（机器统计，可复核）

对 `data/nodes-*.jsonl` + `data/structures-*.jsonl` 全量扫描：

| 字段 | 已使用节点数 | 分布 |
| --- | --- | --- |
| 节点级 `origin` | **33** | D1 1、D2 8、D3 4、D4 9、H2 11 |
| 节点级 `origin_note` | **39** | CX2 15、D2 9、D3 4、H2 11 |

节点级 `origin` 的取值分布：`model` 24、`source` 9 ——**与边的词表 `source|model` 完全一致**，
没有第三种取值。33 个中 `(有 origin, 有 anchors)` 的组合占 29 个
（19 个另带 `origin_note`、10 个不带），即**「有锚点同时标 `origin: model`」是已确立的既有用法**，
不是本提案发明的。这正是 CX2 这批的情形：锚点钉题面，结论是模型算的。

工具链支持（已读源码）：

- `tools/export_obsidian.py:183-184`：`if node.get("origin"): fm.append(f"origin: ...")`
  ——节点级 `origin` **已被渲染进 Obsidian frontmatter**。
- `tools/export_obsidian.py:229-230`：`if node.get("origin_note"): body += ["## 来源说明", ...]`
  ——`origin_note` **已被渲染成正文章节**。
- `tools/check_graph.py`：节点侧只查 `id` 唯一性与 `node_type` 词表（`:68-80`），
  **无字段白名单**，多余字段不会报 problem。
- `tools/verify_anchors.py`：只读 `anchors`，对其他字段无感。

**结论：加 `origin` 字段的机器风险为零，且加了之后 Obsidian 导出会自动显示，不需要改任何工具。**

### 3.3 形态 (a)：SPEC 允许节点带 `origin`（**推荐**）

字段写法，逐字：

```json
"origin": "model",
"origin_note": "<一句英文，说清哪些子句是 Apostol 的、哪些是模型自算的>"
```

- 位置：紧跟 `anchors` 之后。这是 D2/D3/H2 三个文件的既有键序
  （`... anchors, origin, origin_note, parent, ...`），照抄以保持一致。
  D4 把 `origin` 放在末尾，是少数派，不采。
- 取值：**只用 `"model"`**。本批 20 个节点无一例外——每个 statement 都含至少一条无锚的自算子句。
  不要用 `"source"`，也不要发明 `"mixed"`/`"partial"` 之类新取值：
  词表一开就收不回来，而且 `origin` 的语义是「这个节点的**承重内容**从哪来」，
  本批承重内容（失效诊断）一律是模型的，`model` 是准确的，不是妥协。
- 混合性由 `origin_note` 承载，不由 `origin` 的取值承载。这与 H2 的既有做法一致
  （H2:10/11 用 `origin: model` + 长 `origin_note` 说明判断边界）。

**同时须做的 SPEC 文档修订（两处，都是补文档不是改行为）：**

1. `SPEC.md:62` 的节点 schema 那行 JSON 后面补一段说明（不改那行 JSON 本身，
   否则会让人以为 `origin` 是必填）：

   > `origin` / `origin_note` 为选填。当节点的 `anchors` 只覆盖了 statement 的一部分
   > （典型情形：习题题面有锚，而「哪条公理失效」的诊断是模型自算），
   > **必须**标 `origin: "model"` 并在 `origin_note` 里写明哪些子句无锚。
   > 取值与边一致，限 `source` / `model`。

2. `SPEC.md:100` 的死因编号那行补 `6`（简报已说明 6 全程在用但未写进 SPEC）：

   > 死因编号：`1` 量词过度断言 / `2` 编造成员归属 / `3` 伪造教材出处 / `4` 数学错误 /
   > `5` 伪抽象·层塌缩 / `6` 引文不支撑该断言。

   并补一句区分，免得后续把形式 E 误判成死因 3：

   > **形式 E（statement 有子句完全无锚）不等于死因 3（伪造教材出处）。**
   > 死因 3 是把不存在的话说成书里有；形式 E 是如实标注了、只是缺出处。
   > 形式 E 的处置是补 `origin: model`，不是删节点。

### 3.4 形态 (b)：若 SPEC 不允许节点带 `origin`，三条退路

按可用性排序。**三条都比形态 (a) 差，列出是为了满足简报要求，不是并列推荐。**

**退路 b1：只用 `origin_note`，不加 `origin`。**
即维持 CX2 现状（15 个已有 `origin_note`），只给 15.12 那 5 个补写 `origin_note`。
- 优点：一个字段都不新增，`origin_note` 已在 39 个节点上使用，零争议。
- 缺点：**不可机器筛选。**`origin_note` 是自由散文，无法用它做「把所有模型自算节点列出来」
  这种查询；而 `origin` 是枚举值，可以。本实验已经吃过「机械信号召回不足」的亏（4.5），
  放弃一个本来可枚举的信号是倒退。
- 另一缺点：`origin_note` 有无并不自证「本节点是 model 还是 source」——
  H2 的 9 个 `origin: source` 节点也都带 `origin_note`。**note 的存在不携带 origin 的信息。**

**退路 b2：写进 `statement`。**
在 statement 末尾加一句 "The specific witnesses and the axiom diagnosis are supplied by the model,
not by Apostol."
- 优点：不动 schema。
- 缺点：**这是最差的一条。**（i）statement 的 SPEC 约束是「1–3 句英文，说清它是什么/断言什么」，
  塞元信息进去会破坏这个语义，也会把本已 3 句的节点顶到 4 句（本批 15 个 CX2 节点
  statement 全是 3 句，已顶格）。（ii）元信息与数学断言混在一个字段里，
  后续任何按 claim 拆 statement 核锚点射程的程序（形式 D 程序）都会把这句话当成一条待核 claim，
  而它无锚可核——**等于人为制造一条新的形式 E**。**不推荐。**

**退路 b3：新增专名字段，如 `unanchored_clauses`（数组）。**
```json
"unanchored_clauses": ["the witness f(x) = x", "the diagnosis that Axiom 2 fails"]
```
- 优点：结构化，可机器筛，且比 `origin` 更精确（能定位到子句）。
- 缺点：**这才是真正的 SPEC 新增**，而 `origin` 不是；引入第二套并行词汇会与既有的 33 个
  `origin` 节点分裂；且要求逐子句枚举，成本远高于本任务的收益。
- 判断：作为**将来**若要量化形式 E 覆盖率时的候选，值得记入 SPEC 待议；
  **本批不用它**。若主控采纳，应在 `origin` 之外**additive** 地加，不替换 `origin`。

### 3.5 推荐与理由（一句话版）

**推荐形态 (a)：`origin: "model"` + 保留/补写 `origin_note`。**
理由三条：(1) SPEC:55 已在节点语境授权 `origin: model`，形态 (a) 不是新增能力；
(2) 33 个节点 + 导出工具已经这么做了，形态 (a) 是向既有事实收敛，其余三条是分裂；
(3) `origin` 可枚举、可机器筛，`origin_note` 不可——两者是互补而非替代，
本批 20 个节点缺的正是可筛的那一半。

## §4 逐节点子句分解：哪些是题面（有锚）、哪些是模型自算（无锚）

标记法：**【锚】**= 该子句由本节点某条锚点逐字支撑；**【算】**= 模型自算，无锚；
**【判】**= 判断性归属（不是数值计算，是把两处内容挂上关系或做范围断言），亦无锚。
**【判】单列出来，因为它比【算】更危险**：数值错了可复算，归属判断错了只能回源读。

同时给一个**分级**，供 §5 的 `origin_note` 用词参考：

- **S 级**（Apostol 自己给出了定性结论，模型只补见证）：#13、#14。
  这两题 Apostol 分别写了 "Give an example in which L(S∩T) ≠ L(S)∩L(T)"（承认反例存在）
  与 "A basis for V need not contain a basis for S"（直接断言），**定性结论有锚**。
- **M 级**（Apostol 只给集合/运算定义 + 「指出哪条公理失效」的指令，全部诊断是模型的）：
  其余 18 个。

### 4.1 CX2 #1 `apostol:cx-inhomogeneous-endpoint-condition-breaks-closure`（M 级）

| 子句 | 判定 |
| --- | --- |
| "The set of real-valued functions with domain containing 0 and 1 that satisfy f(1) = 1 + f(0), with the usual pointwise addition and scaling" | **【锚】** A1 给 `5. All $f$ with $f(1) = 1 + f(0)$ .`；A2 给定义域约定；「usual pointwise」由前言 "defined in the usual way" 支撑（该句在 15.05:3，未被本节点锚点覆盖，但属同一前言，见 §7.3） |
| "is not a linear space" | **【算】** |
| "Axiom 1 fails because f(x) = x and g(x) = x both lie in the set while (f + g)(1) = 2 but 1 + (f + g)(0) = 1" | **【算】** 见证与四个数值全部自算 |
| "Axiom 2 fails because (2f)(1) = 2 but 1 + (2f)(0) = 1" | **【算】** |
| "Axiom 5 also fails, since the zero function gives 0 on the left and 1 on the right" | **【算】** |
| "The neighbouring Exercises 3 and 4 impose homogeneous conditions on the same two values and are linear spaces" | **【判】** Ex 3/4 的题面在源 :9/:13，但**本节点未锚它们**；且「are linear spaces」是自算结论 |
| "so the whole failure is caused by the additive constant 1" | **【判】** 归因判断 |

### 4.2 CX2 #2 `apostol:cx-increasing-functions-fail-under-negative-scalars`（M 级）

| 子句 | 判定 |
| --- | --- |
| "The set of increasing real-valued functions on the real line, with the usual operations" | **【锚】** A1（夹带第 6 题）+ A2 定义域约定 |
| "is closed under addition but not under multiplication by scalars, so Axiom 2 fails: f(x) = x is increasing while (-1)f, that is -x, is decreasing and therefore outside the set" | **【算】** |
| "Axiom 6 fails on the same element, because the element (-1)f that Axiom 6 names does not exist in the set at all" | **【算】**，且依赖 Apostol 公理 6 的具体措辞（该措辞在 `15.02.md`，本节点未锚） |
| "The set is closed under multiplication by nonnegative scalars only" | **【算】** |
| "which is exactly the defect that separates a convex cone from a linear space" | **【判】** 「凸锥」是外部概念，第 15 章未出现 |

### 4.3 CX2 #3 `apostol:cx-integral-inequality-breaks-the-scalar-axioms`（M 级）

| 子句 | 判定 |
| --- | --- |
| "The set of functions integrable on [0, 1] with the integral of f over [0, 1] at least 0" | **【锚】** A1 = 第 14 题题面 |
| "is closed under addition" | **【算】** |
| "but Axiom 2 fails: the constant function f(x) = 1 has integral 1 and lies in the set, while (-1)f has integral -1 and does not" | **【算】** 见证 + 两个积分值 |
| "Axiom 6 fails on the same element for the same reason" | **【算】** |
| "Replacing the inequality by the equality of Exercise 13 restores a genuine linear space" | **【判】** 第 13 题题面**有锚**（A2），但「restores a genuine linear space」是自算 |
| "so the culprit is the one-sided inequality and not the integral" | **【判】** |

### 4.4 CX2 #4 `apostol:cx-union-of-two-coordinate-planes-fails-additive-closure`（M 级）

| 子句 | 判定 |
| --- | --- |
| "The set of vectors (x, y, z) in V_3 with x = 0 or y = 0" | **【锚】** A1 = 第 23 题题面 |
| "is a union of two planes through the origin" | **【算】** 几何刻画 |
| "and fails Axiom 1: (0, 1, 0) and (1, 0, 0) both belong to the set, but their sum (1, 1, 0) has neither coordinate equal to 0" | **【算】** 见证 + 和 |
| "Axioms 2, 5 and 6 all hold, since the set contains the origin and is closed under every scalar multiple" | **【算】** 三条公理的存活核验 |
| "so this is the case in which closure under addition is the single failing axiom" | **【判】** 「唯一失效」是量词断言，射程覆盖全部 10 条公理，无锚 |
| "The inclusive or is what does the damage: replacing it by and gives the z-axis, which is a subspace" | **【判】** 反事实构造，Apostol 未写 |

### 4.5 CX2 #5 `apostol:cx-affine-line-missing-the-origin`（M 级）

| 子句 | 判定 |
| --- | --- |
| "The set of vectors (x, y, z) in V_3 with 3x + 4y = 1 and z = 0" | **【锚】** A1 = 第 25 题题面 |
| "is a line that does not pass through the origin, so Axiom 5 fails outright: 3(0) + 4(0) = 0, not 1" | **【算】** |
| "Axiom 1 fails at the pair (1/3, 0, 0) and (-1, 1, 0), both in the set, whose sum (-2/3, 1, 0) satisfies 3x + 4y = 2" | **【算】** 见证 + 和 + 数值 2 |
| "Axiom 2 fails at 2(1/3, 0, 0) = (2/3, 0, 0), which satisfies 3x + 4y = 2" | **【算】** |
| "The homogeneous version of the same condition, as in Exercises 22 and 24, is a subspace" | **【判】** 第 24 题有锚（A2），**第 22 题无锚**（源 :43，本节点未引）；「is a subspace」自算 |
| "so the inhomogeneous right-hand side 1 is the whole defect" | **【判】** |

### 4.6 CX2 #6 `apostol:cx-scalar-product-that-kills-the-second-coordinate`（M 级）

| 子句 | 判定 |
| --- | --- |
| "On the set of ordered pairs of real numbers with the usual addition but with a(x_1, x_2) = (a x_1, 0)" | **【锚】** A1 = 第 31(a) 的运算定义 |
| "Axiom 10 fails at x = (0, 1), because 1x = (0, 0) and not (0, 1)" | **【算】** |
| "Axiom 6 fails at the same element in the form Apostol states it, since x + (-1)x = (0, 1) + (0, 0) = (0, 1) and not the zero element (0, 0)" | **【算】**；「in the form Apostol states it」指 `15.02.md` 的公理 6 措辞，**本节点未锚该处** |
| "Axioms 1 through 5, 7, 8 and 9 all hold" | **【算】** 8 条公理的存活核验，一条锚点都没有 |
| "Because the element y = (0, -1) does satisfy x + y = (0, 0), this structure satisfies the weakened Axiom 6' of Exercise 30(b) while still failing Axiom 10" | **【锚】+【算】** 公理 6' 的措辞由 A2（第 30(b) 题面）逐字支撑；y = (0,-1) 满足是自算 |
| "and so it is a concrete model for the independence asserted there" | **【判】** ——**本批最重的一处判断性归属。**把 31(a) 认定为 30(b) 的模型是模型的判断，Apostol 从未把两题联系起来 |

### 4.7 CX2 #7 `apostol:cx-addition-that-discards-the-second-coordinate-has-no-zero`（M 级）

| 子句 | 判定 |
| --- | --- |
| "On the set of ordered pairs of real numbers with (x_1, x_2) + (y_1, y_2) = (x_1 + y_1, 0) and the usual scaling" | **【锚】** A1 = 第 31(b) 的运算定义 |
| "Axiom 5 fails: every sum has second coordinate 0, so no candidate O can satisfy x + O = x for x = (0, 1)" | **【算】** |
| "Axiom 9 fails at a = b = 1 and x = (0, 1), where (a + b)x = (0, 2) but ax + bx = (0, 1) + (0, 1) = (0, 0)" | **【算】** |
| "Axioms 1, 2, 3, 4, 7, 8 and 10 all hold" | **【算】** 7 条公理的存活核验，无锚 |
| "so the entire defect sits in the addition" | **【判】** |

（附：`反例层-15.05与15.09.md` §5.5 记录了本节点**刻意不声称**公理 6 失效的理由——
公理 5 已失效、无零元，谈公理 6 无意义。这个自我约束是对的，此处复核确认 statement 里确实没有该声称。）

### 4.8 CX2 #8 `apostol:cx-addition-that-keeps-only-the-left-first-coordinate-is-noncommutative`（M 级）

| 子句 | 判定 |
| --- | --- |
| "On the set of ordered pairs of real numbers with (x_1, x_2) + (y_1, y_2) = (x_1, x_2 + y_2) and the usual scaling" | **【锚】** A1 = 第 31(c) 的运算定义；A2 给 S 的定义 |
| "Axiom 3 fails at x = (1, 0) and y = (0, 0): x + y = (1, 0) but y + x = (0, 0)" | **【算】** |
| "Axiom 9 fails at a = b = 1 and x = (1, 0), where (a + b)x = (2, 0) but ax + bx = (1, 0)" | **【算】** |
| "Axiom 4 does hold" | **【算】** |
| "so associativity is no guarantee of commutativity" | **【判】** 方法论推论 |

### 4.9 CX2 #9 `apostol:cx-a-whole-line-of-right-zeros`（M 级）

| 子句 | 判定 |
| --- | --- |
| "In the structure of Exercise 31(c), where (x_1, x_2) + (y_1, y_2) = (x_1, x_2 + y_2)" | **【锚】** A1 = 第 31(c) 的运算定义 |
| "every element of the form (t, 0) satisfies x + (t, 0) = (x_1, x_2) for all x, so there are infinitely many zero elements" | **【算】** 右零元族 |
| "and Theorem 15.1 fails" | **【判】** |
| "The proof of Theorem 15.1 gets O_1 + O_2 = O_1 and O_2 + O_1 = O_2 from Axiom 5 and then needs the commutative law to identify the two" | **【判】** ——**证明步骤定位。**Theorem 15.1 的证明在 `15.04.md`，**本节点未锚该处**；「哪一步用了公理 3」是模型读证明后的判断 |
| "and it is exactly Axiom 3 that fails here" | **【算】** |
| "Axiom 6 fails as well against any fixed choice of zero, since x + (-1)x = (x_1, 0) depends on x: for x = (1, 5) the sum is (1, 0), not (0, 0)" | **【算】** |

### 4.10 CX2 #10 `apostol:cx-addition-reading-one-coordinate-from-each-summand`（M 级）

| 子句 | 判定 |
| --- | --- |
| "On the set of ordered pairs of real numbers with (x_1, x_2) + (y_1, y_2) = (\|x_1 + x_2\|, \|y_1 + y_2\|)" | **【锚】** A1 = 第 31(d) 的运算定义 |
| "Axiom 3 fails at x = (1, 0) and y = (0, 0), where x + y = (1, 0) but y + x = (0, 1)" | **【算】** |
| "Axiom 4 fails at x = y = z = (1, 0): (x + y) + z = (2, 1) while x + (y + z) = (1, 2)" | **【算】** |
| "Axiom 5 fails too, because the first coordinate of every sum is an absolute value and so cannot equal the first coordinate of x = (-1, 0)" | **【算】** |

（附：`反例层-15.05与15.09.md` §6.4 自行登记了「31(d) 的公理 8 也失效但未写进节点」。
这是**已知的覆盖不全**，不是错误；本提案不改 statement，故该遗漏仍在，见 §7.2。）

### 4.11 CX2 #11 `apostol:cx-absolute-value-in-the-scalar-product-destroys-the-identity`（M 级）

| 子句 | 判定 |
| --- | --- |
| "On the set of ordered pairs of real numbers with a(x_1, x_2) = (\|a x_1\|, \|a x_2\|)" | **【锚】** A1 = 第 31(d) 的运算定义 |
| "Axiom 10 fails at x = (-1, 0): 1x = (1, 0), not (-1, 0)" | **【算】** |
| "Axiom 9 fails at a = b = 1 and x = (1, 0) under the addition of Exercise 31(d), where (a + b)x = (2, 0) but ax + bx = (1, 0) + (1, 0) = (1, 1)" | **【算】** |
| "No scalar multiple ever has a negative coordinate, so no element outside the closed first quadrant is a scalar multiple of anything" | **【算】** |
| "and the failure is independent of which addition it is paired with" | **【判】** 跨 31(a)–(d) 的范围断言，无锚。**这是 D 型（射程不足）风险点**：锚点只覆盖 (d) 一式，断言却管到「任何加法」 |

### 4.12 CX2 #12 `apostol:cx-degree-exactly-k-inside-p-n-still-fails-closure`（M 级）

| 子句 | 判定 |
| --- | --- |
| "In P_n, the set of polynomials of degree exactly k, with k < n, together with the zero polynomial" | **【锚】** A1 = 第 20 题题面（夹带第 15 题） |
| "is not a subspace: Axiom 1 fails at f(t) = t^k and g(t) = 1 - t^k, both of degree k, whose sum is the constant 1, of degree 0 and not in the set unless k = 0" | **【算】** 见证 + 次数 + k=0 例外 |
| "Adjoining f = 0 does repair the two failures that the degree-exactly-n set of Section 15.3 suffers, namely closure under the scalar 0 and the absence of a zero element" | **【判】** ——**跨节引用。**15.3 节那个版本在 `15.03.md`，**本节点未锚该处**；「补零多项式修好了哪两条」是模型的判断 |
| "so Axiom 1 is the only surviving defect" | **【判】** 唯一性量词，无锚 |
| "Exercise 19 relaxes degree k to degree at most k on the same index and is a subspace of dimension k + 1" | **【锚】+【算】** 第 19 题题面由 A2 逐字支撑；「is a subspace of dimension k + 1」是自算（源文件只说 "compute dim S"，不给答案） |
| "which localizes the entire failure in the word exactly" | **【判】** |

### 4.13 CX2 #13 `apostol:cx-span-does-not-commute-with-intersection`（**S 级**）

| 子句 | 判定 |
| --- | --- |
| "The inclusion of Exercise 22(f) is genuinely one-way" | **【锚】** A2 = 22(f) 题面（Apostol 断言单向包含成立）；「genuinely one-way」由 A1 的 "Give an example in which L(S∩T) ≠ L(S)∩L(T)" 支撑——**Apostol 索要反例即等于承认反例存在** |
| "and Exercise 22(g) asks for the witness" | **【锚】** A1 |
| "in V_2 take S = {(1, 0), (0, 1)} and T = {(1, 0), (1, 1)}" | **【算】** 见证集，Apostol 只索要不给出 |
| "Then S and T each span all of V_2, so L(S) intersected with L(T) is V_2, while S intersected with T is {(1, 0)} and its span is only the x-axis, of dimension 1 rather than 2" | **【算】** 全部维数与交集 |
| "The obstruction is that intersecting the sets destroys elements whose linear combinations were reachable from either side, so the operation L is monotone but not compatible with intersections" | **【判】** 机制解释；"monotone" 部分可由 22(d) 支撑，但**本节点未锚 22(d)** |

**S 级的意义**：本节点的**定性结论有锚**（反例存在这件事是 Apostol 说的），
只有见证是模型的。这与 M 级的 18 个不同——M 级连「失效」这个定性结论都无锚。
`origin_note` 应把这个区别写出来，否则会把 Apostol 的功劳记到模型账上，反向也一样失真。

### 4.14 CX2 #14 `apostol:cx-a-basis-for-v-need-not-contain-a-basis-for-a-subspace`（**S 级**）

| 子句 | 判定 |
| --- | --- |
| "Exercise 24(c) states that every basis for a subspace S extends to a basis for V" | **【锚】** A2 = 24(c) 题面 |
| "and Exercise 24(d) denies the converse" | **【锚】** A1 = `(d) A basis for V need not contain a basis for S.` ——**Apostol 直接断言，且 24 题前言是 "Prove each of the following statements"，即他把它当真命题** |
| "in V = V_2 let S be the line spanned by (1, 1), and take the basis {(1, 0), (0, 1)} for V" | **【算】** 见证 |
| "No nonempty subset of that basis is a basis for S, because neither (1, 0) nor (0, 1) lies on the line x = y, and the subsets of size 2 span V and not S" | **【算】** |
| "The asymmetry is that extension is a choice one is free to make while a prescribed basis has already made it wrongly" | **【判】** |

### 4.15 CX2 #15 `apostol:cx-an-identity-hides-a-dependence-among-transcendental-functions`（M 级）

| 子句 | 判定 |
| --- | --- |
| "In the space of real-valued functions on the real line, two of the sets of Exercise 23 are dependent" | **【算】** 「dependent」是答案；源 :53 只说 "Determine whether … is dependent or independent" |
| "for a reason invisible in their notation" | **【判】** |
| "cosh x = (1/2)e^x + (1/2)e^{-x} makes {e^x, e^{-x}, cosh x} dependent with span of dimension 2" | **【锚】+【算】** 集合本身由 A1 逐字支撑；恒等式与维数 2 是自算 |
| "and cos 2x = 1 - 2 sin^2 x makes {1, cos 2x, sin^2 x} dependent with span of dimension 2 as well" | **【锚】+【算】** 集合由 A2 支撑；其余自算 |
| "Neither dependence can be read off from the fact that the three functions are pairwise nonproportional, which is the standing trap: pairwise independence is not independence" | **【判】** |
| "The neighbouring set {cos^2 x, sin^2 x} is independent, so having squares of trigonometric functions is not itself the cause" | **【锚】+【算】** 集合由 A3 支撑；「is independent」是自算答案 |

### 4.16 15.12 #16 `apostol:cx-absolute-value-in-second-slot-breaks-symmetry`（M 级）

| 子句 | 判定 |
| --- | --- |
| "The formula (x, y) = sum x_i \|y_i\| on V_n" | **【锚】** A1 = 公式本体（源 :8，未含 `\tag{d}`） |
| "is not an inner product" | **【算】** |
| "Putting the absolute value on only the second factor destroys symmetry, since (x, y) and (y, x) differ already for n = 1 with x = -1, y = 1" | **【算】** 见证 n=1, x=-1, y=1 |
| "It also destroys positivity: for x = (-1, 0, ..., 0) one gets (x, x) = -1 < 0, so axiom 4 fails too" | **【算】** |

### 4.17 15.12 #17 `apostol:cx-root-of-sum-of-squared-products-breaks-linearity`（M 级）

| 子句 | 判定 |
| --- | --- |
| "The formula (x, y) = (sum x_i^2 y_i^2)^{1/2} on V_n" | **【锚】** A1 = 公式本体（源 :12，未含 `\tag{b}`） |
| "is symmetric and satisfies (x, x) > 0 for x nonzero" | **【算】** |
| "yet it is not an inner product: it is not additive in either argument" | **【算】**（注：此句**未给见证**，是本批少数「只断言不举证」处，见 §7.2） |
| "and it is only absolutely homogeneous, since (cx, y) = \|c\|(x, y) instead of c(x, y)" | **【算】** |
| "It is a case where positivity and symmetry hold while additivity and homogeneity fail" | **【判】** 归纳性总结 |

### 4.18 15.12 #18 `apostol:cx-absolute-value-of-the-dot-product-breaks-homogeneity`（M 级）

| 子句 | 判定 |
| --- | --- |
| "The formula (x, y) = \|sum x_i y_i\|" | **【锚】** A1 = 公式本体（源 :16，未含 `\tag{e}`） |
| "is symmetric and strictly positive on nonzero elements, so it passes axioms 1 and 4" | **【算】** |
| "but it is not an inner product: homogeneity fails for negative scalars, because (cx, y) = \|c\| \|sum x_i y_i\|" | **【算】** |
| "and additivity fails because \|a + b\| is not \|a\| + \|b\| in general: for n = 1 with x = 1, y = 1, z = -1 one gets (x, y + z) = 0 while (x, y) + (x, z) = 2" | **【算】** 见证 + 数值 0 与 2 |
| "Wrapping a genuine inner product in an absolute value therefore destroys it" | **【判】** |

### 4.19 15.12 #19 `apostol:cx-polarization-formula-is-twice-the-dot-product`（M 级）

| 子句 | 判定 |
| --- | --- |
| "The candidate (x, y) = sum (x_i + y_i)^2 - sum x_i^2 - sum y_i^2" | **【锚】** A1 = 公式本体（源 :20，100% 覆盖该行） |
| "looks like none of the standard formulas" | **【判】** |
| "yet expanding the square collapses it to 2 sum x_i y_i, twice the dot product" | **【算】** 代数化简 |
| "and a positive multiple of an inner product is again an inner product" | **【算】** 一般性引理，第 15 章未陈述 |
| "It is the counterintuitive member of Exercise 1: the answer is yes" | **【算】** ——**这是全批唯一一处 statement 里明写 "the answer is" 的地方。**答案本身无锚（源文件零答案），措辞也直白，`origin_note` 必须点到它 |
| "and the axioms must be checked after simplification, not before" | **【判】** 方法论 |

### 4.20 15.12 #20 `apostol:cx-product-of-coordinate-sums-is-degenerate`（M 级）

| 子句 | 判定 |
| --- | --- |
| "The formula (x, y) = (sum x_i)(sum y_j) on V_n" | **【锚】** A1 = 第 (c) 式题面（源 :23，含字母 `(c)`——**本批唯一一条字母编号可靠的锚点**） |
| "is symmetric, additive and homogeneous, so it satisfies the first three axioms" | **【算】** |
| "but for n >= 2 it fails positivity: x = (1, -1, 0, ..., 0) is nonzero with (x, x) = 0" | **【算】** |
| "It is a rank-one degenerate form" | **【判】** 「rank-one」是外部术语，第 15 章此处未用 |
| "and only in the single case n = 1 does it reduce to an honest inner product" | **【算】** |

### 4.21 分解的汇总统计

机器复点上面 20 张表的数据行（脚本从本文件自身解析，非手数）：

| 量 | 值 |
| --- | --- |
| 节点数 | 20 |
| 拆出的子句总数 | 108 |
| 纯 **【锚】** | 21 |
| **【锚】+【算】** 混合（题面有锚、结论自算） | 5 |
| 含锚子句小计 | 26 |
| 纯 **【算】**（自算，无锚） | 55 |
| 纯 **【判】**（判断性归属/范围断言，无锚） | 27 |
| **完全无锚子句合计** | **82 / 108 = 75.9%** |

**每一个节点都至少有一条完全无锚子句，故 20/20 全部落入形式 E，无例外。**
最重的三处判断性归属（按错判后不可复算的程度排序）：

1. #6 「31(a) 是 30(b) 独立性的具体模型」——跨题归属，Apostol 未联系两题。
2. #9 「Theorem 15.1 的证明正是在这一步用了公理 3」——证明步骤定位，证明原文在 `15.04.md` 且未被锚。
3. #12 「补零多项式修好了 15.3 节那个版本的哪两条公理」——跨节引用，`15.03.md` 未被锚。

这三处 `反例层-15.05与15.09.md` §3 结尾已自行点出（第 6、9、12 条），此处独立复核确认属实，
并在 §5 的 `origin_note` 里给它们单独措辞。

## §5 逐字改写清单（主控执行用）

**总原则：只加字段，不动 `statement`、不动 `anchors`、不动任何边。**
理由：裁定是「登记形式 E，不杀」，而形式 E 是**出处缺陷不是正确性缺陷**
（审查员已独立复核五个节点的算术，全对）。改 statement 会把一次登记动作变成一次内容改写，
按 4.1 的教训，改写后又得重走形式 D 的 claim 拆解与锚点射程核验，风险大于收益。
**也不硬挂锚点**——本批要的正是「如实承认无锚」，硬挂就是简报点名的「形式 D 缺陷的制造方式」。

### 5.1 A 批：`data/nodes-CX2.jsonl` 15 行，每行加 1 个字段

**目标文件**：`data/nodes-CX2.jsonl`
**改动**：在每行的 `"anchors": [...]` 与 `"origin_note": "..."` **之间**插入 `"origin": "model", `。
即键序变为 `... anchors, origin, origin_note`，与 `nodes-D2.jsonl` / `nodes-D3.jsonl` /
`nodes-H2.jsonl` 的既有键序一致。
**这 15 行的 `origin_note` 已存在且内容准确，一个字都不要改。**

逐行确认（id 已回显，主控请按 id 核对而非按行号，防偏移）：

| 行 | id | 动作 |
| --- | --- | --- |
| :1 | `apostol:cx-inhomogeneous-endpoint-condition-breaks-closure` | 插入 `"origin": "model",` |
| :2 | `apostol:cx-increasing-functions-fail-under-negative-scalars` | 同上 |
| :3 | `apostol:cx-integral-inequality-breaks-the-scalar-axioms` | 同上 |
| :4 | `apostol:cx-union-of-two-coordinate-planes-fails-additive-closure` | 同上 |
| :5 | `apostol:cx-affine-line-missing-the-origin` | 同上 |
| :6 | `apostol:cx-scalar-product-that-kills-the-second-coordinate` | 同上 |
| :7 | `apostol:cx-addition-that-discards-the-second-coordinate-has-no-zero` | 同上 |
| :8 | `apostol:cx-addition-that-keeps-only-the-left-first-coordinate-is-noncommutative` | 同上 |
| :9 | `apostol:cx-a-whole-line-of-right-zeros` | 同上 |
| :10 | `apostol:cx-addition-reading-one-coordinate-from-each-summand` | 同上 |
| :11 | `apostol:cx-absolute-value-in-the-scalar-product-destroys-the-identity` | 同上 |
| :12 | `apostol:cx-degree-exactly-k-inside-p-n-still-fails-closure` | 同上 |
| :13 | `apostol:cx-span-does-not-commute-with-intersection` | 同上 |
| :14 | `apostol:cx-a-basis-for-v-need-not-contain-a-basis-for-a-subspace` | 同上 |
| :15 | `apostol:cx-an-identity-hides-a-dependence-among-transcendental-functions` | 同上 |

**可用的机械做法**（比手改 15 行安全，键序也保证正确）：

```python
# 在 ROOT 下建 tmp_apply_a5.py，跑完删掉。先备份，再 dry-run 比对行数。
import json, io, collections
p = 'data/nodes-CX2.jsonl'
rows = io.open(p, encoding='utf-8').read().splitlines()
out = []
for l in rows:
    if not l.strip():
        out.append(l); continue
    n = json.loads(l, object_pairs_hook=collections.OrderedDict)
    if 'origin' in n:
        out.append(l); continue          # 幂等：已有则不动
    new = collections.OrderedDict()
    for k, v in n.items():
        new[k] = v
        if k == 'anchors':
            new['origin'] = 'model'      # 插在 anchors 之后、origin_note 之前
    out.append(json.dumps(new, ensure_ascii=False))
io.open(p, 'w', encoding='utf-8').write('\n'.join(out) + '\n')
```

**注意**：`json.dumps` 会把原行的空格风格归一化（原文件是 `", "` 分隔，`ensure_ascii=False`
下与现状一致），但**会重排空格以外的东西吗？不会**——`object_pairs_hook=OrderedDict` 保序。
执行后请 `git diff --stat` 确认只有 15 行变化，且每行只多出 `"origin": "model", `。

### 5.2 B 批：`data/nodes-A2-x2.jsonl` 的 5 行，每行加 2 个字段

**目标文件**：`data/nodes-A2-x2.jsonl`
**改动**：在 `"anchors": [...]` 之后插入 `"origin": "model", "origin_note": "<下表逐字文本>"`。
注意 :2/:3/:5/:6 的 `anchors` 是该行最后一个键，:4 之后还有 `"audit_fix": "audit-A4b"`；
插入位置一律取 **`anchors` 之后**，故 :4 的键序变为 `... anchors, origin, origin_note, audit_fix`。

`origin_note` 逐字文本（英文，与 CX2 及 D2/D3 的同字段语言一致；每条都点出
「哪些无锚」+「源文件无答案」这一根因，并按 §1.2 的发现声明不依赖字母编号）：

**:2 `apostol:cx-absolute-value-in-second-slot-breaks-symmetry`**

```
Apostol poses Exercise 1 without answers, so the whole diagnosis is the model's: the anchor gives only the formula and the instruction to determine whether it is an inner product. The witnesses n = 1 with x = -1, y = 1 for the failure of symmetry, and x = (-1, 0, ..., 0) with (x, x) = -1 for the failure of axiom 4, are computed here. The OCR has detached the letters (a) through (e) from the displayed formulas in this exercise, so the node deliberately does not claim which lettered part this formula is.
```

**:3 `apostol:cx-root-of-sum-of-squared-products-breaks-linearity`**

```
Apostol poses Exercise 1 without answers, so the whole diagnosis is the model's: the anchor gives only the formula and the instruction to determine whether it is an inner product. That the form is symmetric and positive, that it is not additive in either argument, and the identity (cx, y) = |c|(x, y) are all supplied here; no witness for the failure of additivity is given in the statement. The OCR has detached the letters (a) through (e) from the displayed formulas in this exercise, so the node deliberately does not claim which lettered part this formula is.
```

**:4 `apostol:cx-absolute-value-of-the-dot-product-breaks-homogeneity`**

```
Apostol poses Exercise 1 without answers, so the whole diagnosis is the model's: the anchor gives only the formula and the instruction to determine whether it is an inner product. The identity (cx, y) = |c| |sum x_i y_i| and the witness n = 1 with x = 1, y = 1, z = -1 giving (x, y + z) = 0 against (x, y) + (x, z) = 2 are computed here. The OCR has detached the letters (a) through (e) from the displayed formulas in this exercise, so the node deliberately does not claim which lettered part this formula is.
```

**:5 `apostol:cx-polarization-formula-is-twice-the-dot-product`**

```
Apostol poses Exercise 1 without answers, so the affirmative verdict stated here is entirely the model's: the anchor gives only the formula and the instruction to determine whether it is an inner product. The expansion collapsing the candidate to 2 sum x_i y_i, and the appeal to the fact that a positive multiple of an inner product is again an inner product, are supplied here; Apostol states neither in Chapter 15. The OCR has detached the letters (a) through (e) from the displayed formulas in this exercise, so the node deliberately does not claim which lettered part this formula is.
```

**:6 `apostol:cx-product-of-coordinate-sums-is-degenerate`**

```
Apostol poses Exercise 1 without answers, so the whole diagnosis is the model's: the anchor gives the formula, which is the one part of this exercise whose letter (c) survived the OCR, together with the instruction to determine whether it is an inner product. That the first three axioms hold, the witness x = (1, -1, 0, ..., 0) with (x, x) = 0 for n >= 2, the description of the form as rank-one degenerate, and the n = 1 exception are all supplied here.
```

### 5.3 CX2 的 15 条 `origin_note` 为什么不改（含两条本可加强但不建议动的）

15 条现有 `origin_note` 我逐条读过，**都如实、都不过度、都不虚构**，故不建议改。
两条可加强处登记备查，**但建议不动**（改了就要重新逐条核，收益不抵风险）：

- :13 与 :14 是 §4 判出的 **S 级**（Apostol 已给定性结论），
  它们现有的 note 分别写 "Apostol asks for an example without supplying one" 与
  "Apostol states only the assertion to be proved"——**已经准确表达了 S 级语义**，
  实际上比我担心的更好。无需改。
- :6 的 note 已写 "the identification of Exercise 31(a) as a model for Exercise 30(b) are all the model's"，
  :9 已写 "the observation that Theorem 15.1 uses Axiom 3 at exactly this step"，
  :12 已写 "the k = 0 caveat, and the dimension k + 1"。
  即 §4.21 点出的最重三处判断性归属**全都已在现有 note 里登记过**。这批 note 的质量高于本批平均。

**唯一的实质缺口就是 `origin` 字段缺失**，这也正是本提案的全部改动内容。

## §6 裁决清单（20 条，格式 `<id> | KEEP|KILL | 死因编号 | 一句理由`）

按 SPEC:98 的要求逐条回显 id，不用名字匹配。**20 条全部 KEEP，死因一律 `0`**
（`0` = 无死因、仅需修，即本仓既有的实践取值）。**不是死因 3**——理由见 §6.2。

### 6.1 裁决行

```
apostol:cx-inhomogeneous-endpoint-condition-breaks-closure | KEEP | 0 | 锚点钉住 Ex 5 题面，三条公理失效诊断与见证 f(x)=x 均为模型自算，形式 E，补 origin 即可。
apostol:cx-increasing-functions-fail-under-negative-scalars | KEEP | 0 | 锚点钉住 Ex 11 题面，公理 2/6 的失效与见证自算，算术正确，形式 E。
apostol:cx-integral-inequality-breaks-the-scalar-axioms | KEEP | 0 | 锚点钉住 Ex 14 与对照 Ex 13 题面，两个积分值自算，形式 E。
apostol:cx-union-of-two-coordinate-planes-fails-additive-closure | KEEP | 0 | 锚点钉住 Ex 23 题面，见证 (0,1,0)+(1,0,0) 与「唯一失效」判断自算，形式 E。
apostol:cx-affine-line-missing-the-origin | KEEP | 0 | 锚点钉住 Ex 25 题面，四条公理的失效与三个见证自算，形式 E。
apostol:cx-scalar-product-that-kills-the-second-coordinate | KEEP | 0 | 锚点钉住 Ex 31(a) 运算定义与 Ex 30(b) 题面，「31(a) 是 30(b) 的模型」这一跨题归属为模型判断，形式 E。
apostol:cx-addition-that-discards-the-second-coordinate-has-no-zero | KEEP | 0 | 锚点钉住 Ex 31(b) 运算定义，公理 5/9 失效与七条存活核验自算，形式 E。
apostol:cx-addition-that-keeps-only-the-left-first-coordinate-is-noncommutative | KEEP | 0 | 锚点钉住 Ex 31(c) 运算定义，公理 3/9 见证自算，形式 E。
apostol:cx-a-whole-line-of-right-zeros | KEEP | 0 | 锚点钉住 Ex 31(c) 运算定义，右零元族与「Theorem 15.1 证明在哪一步用公理 3」为模型判断，形式 E。
apostol:cx-addition-reading-one-coordinate-from-each-summand | KEEP | 0 | 锚点钉住 Ex 31(d) 运算定义，公理 3/4/5 见证与六个数值自算，形式 E。
apostol:cx-absolute-value-in-the-scalar-product-destroys-the-identity | KEEP | 0 | 锚点钉住 Ex 31(d) 运算定义，公理 9/10 见证自算；「与配哪个加法无关」是 D 型射程风险，登记不判死。
apostol:cx-degree-exactly-k-inside-p-n-still-fails-closure | KEEP | 0 | 锚点钉住 Ex 20 与 Ex 19 题面，见证 t^k 与 1-t^k、维数 k+1、以及对 15.3 节版本的跨节比较均自算，形式 E。
apostol:cx-span-does-not-commute-with-intersection | KEEP | 0 | S 级：反例存在这一定性结论由 Ex 22(g) 锚点支撑，仅见证集 S、T 与维数自算，形式 E。
apostol:cx-a-basis-for-v-need-not-contain-a-basis-for-a-subspace | KEEP | 0 | S 级：Ex 24(d) 逐字断言有锚，仅见证 V_2 与基 {(1,0),(0,1)} 自算，形式 E。
apostol:cx-an-identity-hides-a-dependence-among-transcendental-functions | KEEP | 0 | 锚点钉住 Ex 23(e)(h)(g) 三个集合，「相依/无关」的答案、两个恒等式、维数 2 全部自算，形式 E。
apostol:cx-absolute-value-in-second-slot-breaks-symmetry | KEEP | 0 | 锚点钉住 15.12 Ex 1 的公式本体与题干指令，对称性与正定性的失效诊断自算，形式 E，须补 origin 与 origin_note。
apostol:cx-root-of-sum-of-squared-products-breaks-linearity | KEEP | 0 | 锚点钉住公式本体，可加性失效一句连见证都未给，形式 E 中最弱的一条，仍不判死。
apostol:cx-absolute-value-of-the-dot-product-breaks-homogeneity | KEEP | 0 | 锚点钉住公式本体，齐次性与可加性的失效见证自算，形式 E。
apostol:cx-polarization-formula-is-twice-the-dot-product | KEEP | 0 | 锚点钉住公式本体，statement 里明写的 "the answer is yes" 无锚（源零答案），形式 E，origin_note 必须点到它。
apostol:cx-product-of-coordinate-sums-is-degenerate | KEEP | 0 | 锚点钉住带字母 (c) 的公式本体，前三公理存活与 n>=2 的退化见证自算，形式 E。
```

### 6.2 为什么是死因 0 而不是死因 3（伪造教材出处）

这一区分是本提案最需要防守的一点，**主控若把形式 E 记成死因 3，20 个节点会被误杀**：

- 死因 3 的构成要件是**把教材没说的话说成教材说的**。判据是「锚点 quote 与 file 的对应关系是假的」
  或「statement 声称 Apostol 断言了某事而他没有」。
- 本批 41 条锚点 `verbatim` 全通过、`occurrences` 全为 1（§2.2 实测），**出处指向真实且唯一**。
- 且本批 statement **没有一处把自算结论托名给 Apostol**。相反，15 个 CX2 节点的现有
  `origin_note` 已经主动声明了「是模型算的」（§5.3 逐条复核过）。
- 形式 E 的构成要件只是「statement 有子句完全无锚」。**缺出处 ≠ 伪造出处。**
  处置差别是天壤：形式 E 补 `origin` 字段，死因 3 删节点。

另按 4.6 的规定，**cause 6（引文不支撑该断言）在本批同样不成立**，理由不同：
cause 6 的前提是「有锚点，但该锚点撑不起它挂的那句话」，即锚点与断言之间存在错配。
本批的锚点没有被拿去撑诊断结论——诊断结论**根本没挂锚点**，它是裸的。
**没有错配，只有空缺。**这正是形式 E 与 cause 6 的分界，也是为什么形式 E 应当独立于死因编号体系记账。
（建议 SPEC 的死因表里明确写一句「形式 E 不入死因编号」，见 §3.3 第 2 项。）

## §7 未做完的、须主控裁断的、以及范围外发现

### 7.1 须主控裁断：伞节点 `apostol:cx-inner-product-axiom-diagnosis`

`data/nodes-A2-x2.jsonl:1`，`node_type: method`，带 `audit_fix: audit-A4b`。
**它不在简报点名的 5 个之内，我没有改动它，但它属同型。**

它的三条锚点都是题干指令（"In each case, determine whether…"、
"In case (x, y) is not an inner product, tell which axioms are not satisfied."、
"In case (f,g) is not an inner product, indicate which axioms are violated."），
而它的 statement 第二句是**自算的归纳**：

> "The exercises exhibit several distinct failure patterns: a formula can satisfy symmetry and
> positivity yet fail homogeneity, and another can satisfy symmetry and bilinearity yet fail positivity."

这句话的内容来自它统摄的那些子节点的诊断结论，而那些结论本身无锚。**故它也是形式 E。**
它同时是本批 `15.12:3` 那条公用指令句的第 6 个引用者（§2.4(i)）。

**裁断请求**：是否与本批 5 个一并加 `origin: "model"`。
**我的建议：一并加。**理由是不加会产生一个反常状态——被统摄的 5 个子节点都标了「模型自算」，
统摄它们的伞节点却不标，而伞节点的 statement 恰恰是对那些自算结论的再归纳，
**抽象层继承下层的出处缺陷，这是 4.6 里 T3 塌陷方向的反面**：
内容上移时，缺陷也上移了。若主控采纳，`origin_note` 建议逐字用：

```
Apostol poses Exercises 1 and 12 without answers, so the failure patterns summarized here are the model's: the anchors give only the three instructions to determine whether a formula is an inner product and to name the violated axioms. The specific patterns, and which candidate formula exhibits which, come from the counterexample nodes this one subsumes, where they are likewise unanchored.
```

### 7.2 已知的 statement 覆盖缺口，本提案**不修**（登记备查）

两处，都是「该说而未说」，不是「说错」。按 §5 的总原则（只加字段、不动 statement）故不动：

- **CX2 #10** `apostol:cx-addition-reading-one-coordinate-from-each-summand`：
  31(d) 的**公理 8 也失效**，statement 未写。`反例层-15.05与15.09.md` §6.4 已自行登记。
- **15.12 #17** `apostol:cx-root-of-sum-of-squared-products-breaks-linearity`：
  "it is not additive in either argument" **只断言不举证**，是本批唯一一处连模型自己的见证都没给的失效声称。
  这条比其余 19 个弱一档——其余至少给了可复算的见证。

**若主控将来要补这两处，必须走完整的 claim 拆解 + 锚点射程核验流程**，不能顺手加一句。

### 7.3 一处锚点未覆盖但被 statement 依赖的前言子句

CX2 #1、#2 的 statement 都说 "with the usual pointwise addition and scaling" / "with the usual operations"。
这个「usual」的授权在 `15.05-exercises.md:3` 的第 1 句
（"…if addition and multiplication by real scalars are defined in the usual way."），
**而这两个节点锚的是同一行的第 4、5 句（定义域约定），不是第 1 句。**

这不是新缺陷、也不是过报：按 4.3 的纪律我没有按行号判「已覆盖」，
所以此处如实记为**该子句无锚**（它已计入 §4 的【锚】判定说明里）。
**不建议为它加第 3 条锚点**——本批要的是承认无锚，且 #1 已有 2 条锚点、加到 3 条会挤掉可加强的空间。
`origin` 字段一旦加上，这类缺口就被统一覆盖了，这也是形态 (a) 优于逐条补锚的一个附带好处。

### 7.4 范围外发现：另有 13 个同型节点，本提案未处理

这是本次唯一的**范围外发现**，机器统计如下（可复核）：

- 全库锚到 `*-exercises.md` 的节点共 **49** 个，**其中 0 个带节点级 `origin`**。
  分布：`nodes-CX2.jsonl` 15 + `nodes-A2-x2.jsonl` 34。
- 本提案处理 20 个（CX2 15 + A2-x2 的 :2–:6）。**剩 29 个未处理。**
- 对这 29 个按「锚点里是否含 Apostol 自己给出的结论」分类：
  - **16 个不是形式 E**：锚点含 "Prove that…" / "show that…" / "find an orthonormal basis…"，
    即 Apostol 把结论写在题面里当真命题让人证。这些节点的定性结论**有锚**，
    与 §4 判的 S 级同理（#13、#14 就是这一类）。**不需要 `origin: model`。**
    典型：`:32 cx-best-constant-is-the-mean-value` 的锚点逐字含
    "show that the constant polynomial $g$ nearest to $f$ is $g = \frac{1}{2} \log 3$"
    ——连数值答案都在题面里。
  - **13 个疑似形式 E**，锚点只有题面/公式、结论自算：
    `:1`（见 7.1）、`:8`、`:11`、`:12`、`:13`、`:16`、`:17`、`:18`、`:21`、`:30`、`:33`、`:34`，
    另 `:9`/`:10` 虽含 "Prove that" 但其 statement 另有超出该断言的自算部分（`:10` 的复数反例
    x=1,y=i 尤为明显，第 15 章无此内容），属**混合**，须单独判。

**我未对这 13 个逐条做 §4 那样的子句分解**（简报点名的是 20 个，逐条分解一个约需回源比对
5–8 条子句，13 个会超出本次可完成的量）。**如实登记为剩余工作**，建议单独起一批。
这个 16/13 的分界本身是可机械化的初筛信号（锚点含 `Prove that|show that` 即多半非形式 E），
但按 4.5 的教训，**它只能用来定向、不能结案**——上面 `:9`/`:10` 就是该信号的假阴性。

### 7.5 本次做了什么、没做什么（诚实交代）

**做了**：

1. 20 个节点全部回显 id（§1），逐个做 statement 子句分解（§4，108 条子句）。
2. 41 条锚点全部实测：`verbatim`、`occurrences`、换行、字符长度、在源行中的字符占比（§2.2）。
   **不按行号判覆盖**，逐条回源读所在行全文。
3. 「源文件零答案」强化核验：10 个标志词 × 3 份文件（§2.3）。
4. 字段方案两种形态 + 三条退路 + 推荐及理由（§3），含 SPEC 现状与工具链的机器复核。
5. 逐字改写清单（§5），20 行、25 个字段、5 段新 `origin_note` 全文。
6. 20 条裁决行（§6）+ 死因 0 与死因 3、cause 6 的分界论证。

**没做**：

1. §7.4 的 13 个疑似同型节点，未做子句分解、未给 `origin_note` 文本。
2. §7.2 的两处 statement 缺口，未修（按总原则刻意不修）。
3. **未对本批 20 个节点的数学正确性做独立复算。**§六 6.3 说审查员已复核过五个节点的算术全对，
   我**采信这一记载但未重做全部 20 个**。§4 的分解只判「有锚/无锚」，不判「算得对不对」。
   若主控需要全 20 个的算术独立复算，那是另一项任务。
4. 未动任何 `data/` 文件、未动任何边、未加任何锚点。

**一处方法论声明**（按 4.1 的要求）：本提案报告了「41/41 条锚点逐字通过」，
但这句话**只证明引文未被篡改**，不构成正确性保证。
本批的实际问题恰恰是机器校验管不到的那一半——**82/108 条子句根本没有引文可校验**。
`origin: "model"` 这个字段的全部意义，就是把这件机器看不见的事写成机器能筛的。

