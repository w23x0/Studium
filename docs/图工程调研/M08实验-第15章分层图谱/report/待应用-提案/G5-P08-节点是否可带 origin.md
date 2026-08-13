# SPEC 待议项 P08：节点是否可带 origin

## 〇 裁定

**有条件进 SPEC**：节点可带 `origin`，取值 `source` / `model` / `mixed`，且必须与边的 `origin`
分开定义（同名不同义）；条件是同时补上 S2 漏掉的两条——`origin_note` 与 `origin` 的双向绑定
（S2 只写了单向）与导出侧的可见性要求（S2 完全没碰）。

## 一 现状取证

### 1.1 SPEC.md 里与节点 origin 相关的全部文字（逐字）

`SPEC.md:55`（在「锚点规则」小节内，而锚点是**节点**字段）：

```
- 找不到可逐字引用的依据 ⇒ **不要收录**,或标 `origin: model` 并如实说明。
```

`SPEC.md:70`（边 schema，`origin` 唯一被正式定义的位置）：

```
{"src":"<id>","rel":"requires","dst":"<id>","origin":"source|model","evidence":{...},"rel_note":"..."}
```

`SPEC.md:73–74`：

```
- `origin: source` 必须给逐字 `evidence`(机器校验)。`origin: model` 可省 `evidence`,
  但**必须如实标注,不要把推断伪装成原文**。
```

`SPEC.md:59–65` 的节点 schema **不含** `origin`，也不含 `origin_note`。
即：SPEC 在 `:55` 已经默许节点带 `origin`，却只在边上定义了它。这是本待议项的全部由来。

### 1.2 已有提案的结论

`S2-SPEC-字段语义.md` 的**项 3 就是 P08**（该文件 `:34` 摘要行、`:296–460` 正文），
已给出裁决「可以，且必须与边的 origin 分开定义」、三值取值、`origin != source` 时 `origin_note`
必填，并附了可并入文本与影响面表。**我不重做分析，只复核依据。**

### 1.3 我的复核：S2 站得住的部分

逐条实测（脚本只读 `data/`，未改任何文件）：

| S2 的断言 | 我的实测 | 判 |
| --- | --- | --- |
| 522 节点中 `origin` 33 个（model 24 / source 9） | 33（model 24 / source 9） | ✅ |
| `origin_note` 39 个 | 39 | ✅ |
| 有 `origin_note` 无 `origin` 的 16 个（CX2 15 + `nodes-D2.jsonl:9`） | 16，名单完全一致 | ✅ |
| 锚点全在 `*-exercises.md` 且无 `origin` 的 49 个（A2-x2 34 + CX2 15） | 49，分布一致 | ✅ |
| 须改的**边** 0 条 | 边侧规则不动，0 | ✅ |
| 若 `source` 也必填则须改 489 个 | 489（522 − 33）；含 24 个 L2 则 513 | ✅ |
| `nodes-A2-x2.jsonl:32` 是确定的 `mixed` | 逐字核过 `15.16-exercises.md:70` 与 `:72`，题面确实写出了答案 `g = \frac{1}{2} \log 3` 与 `g = \frac{1}{2}(e^2 - 1)`，而「Both are the average value of f over the interval」不在题面 | ✅ |

`mixed` 这个取值的必要性我也认了：`nodes-A2-x2.jsonl:32` 一个 statement 里同时含题面给出的两个值
与模型加的解释，二值下标 `source` 或 `model` 都是假标注。

### 1.4 我的复核：S2 错了或漏了的三处

**(1) 影响面漏算 10 个节点，49 应为 60。** S2 影响面表写「已有 `origin` 33 个 → **不动**」。
但按 S2 自己提出的规则「`origin` 为 `model` 或 `mixed` 时 `origin_note` 必填」，
实测 **`origin=model` 而无 `origin_note` 的节点有 10 个**，它们恰在那 33 个里，
按新规立刻违规，必须改：

```
data/nodes-D1.jsonl:23  d:axiom-10-is-derivable-from-apostols-form-of-axiom-6
data/nodes-D4.jsonl:15  d:positivity-axiom-forbids-nonzero-self-orthogonal-elements
data/nodes-D4.jsonl:19  d:normalized-element-has-norm-one
data/nodes-D4.jsonl:20  d:rescaling-preserves-orthogonality
data/nodes-D4.jsonl:23  d:vanishing-projection-terms-in-the-legendre-computation
data/nodes-D4.jsonl:27  d:s-perp-closure-follows-from-linearity-in-the-first-argument
data/nodes-D4.jsonl:28  d:orthogonality-to-a-set-equals-orthogonality-to-its-span
data/nodes-D4.jsonl:40  d:pythagorean-expansion-of-the-squared-norm
data/nodes-D4.jsonl:43  d:projection-is-the-s-component-of-the-orthogonal-decomposition
data/nodes-D4.jsonl:44  d:projection-does-not-depend-on-the-chosen-orthonormal-basis
```

S2 只写了单向绑定（「不得只写 `origin_note` 而不写 `origin`」），漏了反向
（「不得只写 `origin` 而不写 `origin_note`」）。这 10 个正是反向缺口的实例。
去重后**须改节点数 49 → 60**（算法见第四节）。

**(2) 习题问法统计的表有数值错误。** S2 `:352` 起那张表把列头写成
`show that`/`prove that`，但给出的是合并计数，且与实测不符。我的实测（`grep -ci`，
文件在 `source/apostol-ch15/`，不在 `data/`）：

| 文件 | `show that` | `prove that` | `determine whether` | `compute `/`find the` |
| --- | --- | --- | --- | --- |
| `15.05-exercises.md` | **0** | 3 | 2 | **0** |
| `15.09-exercises.md` | **0** | 0 | 3 | 3 |
| `15.12-exercises.md` | **0** | 13 | 2 | 6 |
| `15.16-exercises.md` | **2** | 2 | 0 | 4 |

S2 表里 `15.16` 的 `show that` 记 4、`15.12` 记 13，实测分别是 2 与 0。
**这不影响 `mixed` 的裁决**（`15.16` 那 2 处足以证明「答案写在题面里」这一机制存在，
且 `nodes-A2-x2.jsonl:32` 已逐字核实），但**影响分桶建议的比例**：
S2 据此说「A2-x2 的 `mixed` 比例会明显高于 CX2」，这个推断的数值依据不成立——
`15.12` 全是 `prove that`（要求证明一个已给出的判断，答案确实在题面），而
`15.16` 只有 2 处 `show that`。**结论方向仍对**（`prove that` 与 `show that` 同属「答案在题面」型，
`15.12` 的 13 处 `prove that` 反而加强了它），但主控不要照抄 S2 的具体数字。

**(3) 导出侧完全没写。** 这是任务书明确要求的一项，S2 未涉及。实测
`tools/export_obsidian.py`：

- `:161–162` 边的 `origin == "model"` → 在正文出边/入边列表里追加可见标记 `*(模型推断)*`；
- `:183–184` 节点的 `origin` → **只写进 YAML frontmatter**，正文里不出现；
- `:229–230` 节点的 `origin_note` → 渲染成 `## 来源说明`，但位置在
  `## 陈述`（`:205`）与 `## 原文锚点`（`:225`）**之后**。

即：**边的模型标记是正文可见的，节点的不是。** Obsidian 阅读视图默认把 frontmatter
折叠进属性面板，读者先读到 `## 陈述` 里模型产出的内容，再往下才可能看到来源说明。
这正是 SPEC `:74`「不要把推断伪装成原文」要防的事，导出侧对节点漏了防。



## 二 拟并入 SPEC 的逐字条文

下面整块插入在 `SPEC.md:65` 之后（即节点 schema 小节末尾、边 schema 小节之前）。
以 S2 的文本为底，补上 1.4 的三处修正。

```markdown
### 节点的 `origin`(与边的 `origin` 不是同一条规则)

```json
{"…":"…","origin":"source|model|mixed","origin_note":"哪一句、哪个量是模型产出的"}
```

- 边的 `origin` 说的是**这条关系**从哪来;节点的 `origin` 说的是**这段 `statement` 的内容**
  从哪来。**同名不同义,不要把边的规则套到节点上**——尤其:边的 `origin: source`
  要求给 `evidence`,节点的 `origin: source` 不额外要求任何字段(锚点规则已经管了)。
- 取值封闭为三个,不得新造:
  - `source` —— `statement` 的每一句都由原文承载。**此值可省略不写**(默认值)。
  - `model` —— `statement` 含模型推导/计算/重构的内容,原文没有这句话。
  - `mixed` —— 一部分出自原文、一部分是模型产出。**习题类节点的常态**:
    `prove that X` / `show that X` 型习题把答案 X 写在题面里(那部分是 `source`),
    `determine whether` 型不给答案、诊断全由模型算出(那部分是 `model`),
    而两者常并存于同一 `statement`。二值下这类节点无论标哪个都是假标注,
    **假标注比不标注更坏**:不标注只是缺信息,假标注会让下一个审查员据此免检。
- **`origin` 与 `origin_note` 必须双向绑定,缺一即违规:**
  - `origin` 为 `model` 或 `mixed` ⇒ `origin_note` 必填,且必须点名**是哪一句、哪个量、
    哪个见证**由模型产出,不得只写「部分内容为模型推断」这类无指向的话。
    范本(`nodes-CX2.jsonl:1`):`The witnesses f(x) = x and 2f are chosen by the model;
    Apostol states only the exercise.`
  - 写了 `origin_note` ⇒ `origin` 必填。`origin_note` 是散文,`origin` 是可筛选字段;
    只有 note 的节点在 `grep '"origin"'` 里是隐身的。
- **只锚住题面、结论由模型算出的节点,必须标 `origin`。** 锚点钉住的是**问题**,不是答案;
  `grep -F` 会通过,而答案无出处。这类节点**不判死**(缺的是出处而非正确性),
  但漏标 `origin` 判死因 `6`。
- **无锚点的非 L2 节点必须标 `origin: model` 或 `mixed`。** 依 `:55`,找不到逐字依据
  就要么不收录、要么标 `origin`;无锚而无 `origin` 是这两条路都没走。
- **L2 及以上的抽象层节点豁免本条。** `layer >= 2` 本身已声明它是模型构造的抽象,
  `boundary` 与 `abstraction_gain` 承担诚实性;给 24 个 L2 节点逐个标 `origin: model`
  是零信息量的噪声。若某个 L2 节点的 `statement` 含**具体数学断言**而非结构描述,
  仍按上一条处理。
- **导出必须让节点的 `origin` 在正文可见,不能只写 frontmatter。**
  `origin` 为 `model` 或 `mixed` 时,导出的 `## 陈述` 小节标题旁须带可见标记
  (与边侧 `*(模型推断)*` 同形),且 `## 来源说明` 须紧随 `## 陈述` 之后、
  排在 `## 原文锚点` **之前**。理由:frontmatter 在阅读视图里默认折叠,
  读者会先读到模型产出的 `statement` 再看到声明,这正是 `:74`
  「不要把推断伪装成原文」要防的事。
```


## 三 替换或修改 SPEC.md 的哪几行

三处改动，两处是新增、一处是原地改写。

### 改动 1：`SPEC.md:55` 原地改写（1 行 → 2 行）

旧（`:55`）：

```
- 找不到可逐字引用的依据 ⇒ **不要收录**,或标 `origin: model` 并如实说明。
```

新：

```
- 找不到可逐字引用的依据 ⇒ **不要收录**,或标节点级 `origin`(见下文「节点的 `origin`」)
  并如实说明。此处的 `origin` 是**节点**字段,与边的 `origin` 同名不同义。
```

理由：`:55` 是节点 origin 唯一的现存依据，但它写在锚点小节里、指向一个从未定义的字段。
把指针补上，并当场消歧，避免读者把边的规则套过来。

### 改动 2：`SPEC.md:65` 之后新增第二节整块（约 40 行）

`:65` 现文：

```
`parent` / `atomic` / `atomic_reason` 仅 `d:` 节点必填。
```

在这一行**之后**、`:67`（`## 边 schema`）之前，插入第二节的整块条文。
不删改 `:59–65` 的任何字（`:62` 那行 schema 示例不动，因为示例演示的是 `d:` 节点必填字段，
`origin` 是条件必填，塞进示例会误导成必填）。

### 改动 3：`SPEC.md:100` 死因表补一条

旧（`:100`）：

```
死因编号:`1` 量词过度断言 / `2` 编造成员归属 / `3` 伪造教材出处 / `4` 数学错误 / `5` 伪抽象·层塌缩。
```

新：

```
死因编号:`1` 量词过度断言 / `2` 编造成员归属 / `3` 伪造教材出处 / `4` 数学错误 /
`5` 伪抽象·层塌缩 / `6` 引文不支撑断言(含漏标节点级 `origin`)。
```

**注意**：死因 `6` 本身是另一个待议项（`_转交-新会话-workflow.md:303` 列的「cause 6 入 SPEC」），
不由我裁定。我只登记：第二节最后引用了 `6`，若死因 6 的负责代理决定不入 SPEC，
第二节那句「漏标 `origin` 判死因 `6`」必须改成 `FIX` 而不是留一个悬空编号。
这是硬耦合，主控合并时要串。


## 四 回溯影响

### 4.1 基线

SPEC 现在对节点 `origin` **无任何强制**（`:55` 只说「或标 origin: model」，是选项不是要求）。
所以**现状违规 = 0**，新规带来的全部是「从合规变违规」，**反向 0 条**。

### 4.2 逐条规则的违规实数

口径：`data/nodes-*.jsonl` + `data/inherited/nodes-*.jsonl` = **522 节点**（check_graph 域）；
`data/structures-L2-*.jsonl` 的 **24 个 L2** 单列。合计 546（tmp_index/README.md:20）。

| 规则 | 违规数（522 域） | L2 域 |
| --- | --- | --- |
| R1 取值须在 `source`/`model`/`mixed` 内 | **0** | 0 |
| R2 `origin ∈ {model,mixed}` ⇒ `origin_note` 必填 | **10** | 0（L2 全无 origin） |
| R3 有 `origin_note` ⇒ `origin` 必填 | **16** | 0（L2 全无 note） |
| R4 无锚点的非 L2 节点须标 `model`/`mixed` | **0** | 豁免 |
| R5 锚点全在 `*-exercises.md` 而无 `origin` | **49** | 不适用 |

R1 = 0 说明三值取值是对既有数据的**忠实描述**而非扩张：现存值只有 `model`(24) 与 `source`(9)，
`mixed` 是纯新增取值，不使任何现有条目违规。

R4 = 0 值得记一句：522 域里无锚点的节点恰好 4 个（`tmp_index/README.md:22` 列的 4 个 `d:`），
它们**全部**已标 `origin: model`，且全部有 `origin_note`（如 `nodes-D2.jsonl:42`
的 note：`A negative claim about the proof, obtained by inspecting every step of Example 7
in 15.07. Not stated by Apostol.`）。所以这条规则是把既成的好习惯固定下来，代价为零。

### 4.3 去重后的须改总数：60

算法（在 `data/` 上只读遍历，逐行 `json.loads`）：

```
R2 = { id | origin ∈ {model,mixed} 且 origin_note 缺失 }            → 10
R3 = { id | origin_note 存在 且 origin 缺失 }                        → 16
R5 = { id | anchors 非空 且 每条 anchor 的 file 都含 "exercises" 且 origin 缺失 } → 49
交集实测：R3∩R5 = 15（CX2 全部 15 个）、R2∩R5 = 0、R2∩R3 = 0（定义上互斥）
|R2 ∪ R3 ∪ R5| = 10 + 16 + 49 − 15 = 60
R3 − R5 = { d:thm-15-4-closure-under-scalar-multiplication-is-the-active-axiom }（nodes-D2.jsonl:9）
```

**60，不是 S2 写的 49。** 差额 11 = R2 的 10 个（S2 表里被划进「不动」的那 33 个中的 10 个）
加 `nodes-D2.jsonl:9`（S2 在正文提了它，但影响面表把它并进「16」那行后，
最终「须改总数 49」这一格没把它加进去——49 = A2-x2 34 + CX2 15，正好不含它）。

分桶处置：

| 桶 | 数 | 处置 | 工作量 |
| --- | --- | --- | --- |
| A2-x2，无 origin 无 note | 34 | 补 `origin` + **新写** note | 最重，逐节点判断 |
| CX2，无 origin 有 note | 15 | 只补 `origin`，note 现成 | 轻，可按 note 内容分桶半自动 |
| D4/D1，有 `origin: model` 无 note | 10 | 只补 note | 中，须回读 statement 定位模型产出的那一句 |
| `nodes-D2.jsonl:9`，有 note 无 origin | 1 | 只补 `origin`，note 已写明「第二句是模型推断，锚点只支撑第一句」⇒ 即 `mixed` | 极轻，取值已确定 |

### 4.4 若把 `source` 也改成必填

须新增 `origin` 的节点从 60 涨到 **489**（522 − 33 已有）；含 L2 则 **513**。
我不建议：489 次改动换来的信息量是「区分已检查与未检查」，而这件事该由
`audit_fix` 字段（现有 67 个节点在用）或审计台账承担，不该压在 `origin` 上。

### 4.5 边侧确认无须改动

`origin=source` 而无 `evidence` 的边 **0** 条（`SPEC.md:73` 被 100% 遵守）；
`origin=model` 而带 `evidence` 的边 **15** 条（`tmp_index/unverified-model-quotes.tsv`）——
SPEC `:73` 只说 model **可省** evidence，没禁它带，故不算违规，**本提案不动边规则，须改边 0 条**。
那 15 条的校验盲区是另一个待议项，不在此裁定。


## 五 反例与边界情形

### 5.1 反例：`origin: source` 也可能是假的——H2 那 9 个节点

这是本条文**管不住**的情形，必须写明。`origin=source` 的 9 个节点全在 `nodes-H2.jsonl:1–9`，
是第 12 章/第 II 卷的外部节点。它们的锚点**全部落在第 15 章的文件里**：

```
apostol:ext-theorem-12-8      -> 15.07.md, 15.07.md
apostol:ext-theorem-12-10-part-b -> 15.08.md
apostol:ext-theorem-12-3      -> 15.10.md, 15.10.md
apostol:ext-volume-2-proof-of-the-legendre-closed-form -> 15.13.md
```

即：节点讲的是定理 12.8，锚点引的是第 15 章**提到**定理 12.8 的那句话。
按第二节的定义，`statement` 的每一句确实由原文承载（承载它的是第 15 章的引用语），
所以 `source` 合规。但它承载的是「第 15 章说第 12 章有这个定理」，
**不是**「定理 12.8 的内容如此」。

这 9 个节点的 `origin_note` 已经诚实地写了这件事，例如 `nodes-H2.jsonl:1`：
「本节点的内容边界只来自第15章15.07的引用语。我们手上没有第12章原文，故此处不替 Apostol 陈述定理12.8」。

**边界结论**：这暴露出 `origin_note` 现在被当成两种东西用——
(a) CX2/D 层的「这一句是模型产出的」，(b) H2 的「内容边界受限，未见原书」。
第二节的规则只约束 (a)。我**不**主张为 (b) 新造字段（会把 schema 撑大），
但主张在第二节加一句边界声明。拟补文（接在「双向绑定」那条之后）：

```
- `origin: source` 只声明「statement 的每一句都有原文承载」,**不声明那段原文就是
  该对象本身的原始表述**。引用外部章节的节点(`apostol:ext-` 命名空间)常常锚在
  「本章提到该定理」的引用语上,此时 `source` 合规,但 `origin_note` 应写明内容边界。
```

### 5.2 边界：`mixed` 的粒度到哪一级

`nodes-A2-x2.jsonl:32` 是干净的 `mixed`（两个值出自 `15.16-exercises.md:70`/`:72` 题面，
「Both are the average value」是模型加的）。但**如果模型产出的那一句是纯粹的措辞改写**
（同义复述原文），算 `source` 还是 `mixed`？第二节没给判据。
我的取舍：**按「是否引入新的数学内容」判，不按「是否逐字」判**——
措辞改写不引入新断言，仍算 `source`；只要多出一个原文没有的量、见证、量词或因果，就是 `mixed`。
这句判据我**没有**写进第二节的正式条文，因为它需要逐节点判断力、写进去会变成争议来源；
登记在此供主控决定是否收。

### 5.3 边界：L2 豁免的边界在哪

24 个 L2 节点全部无锚、全部无 `origin`、全部无 `origin_note`（实测）。
第二节豁免了它们，但留了个口子：「若某个 L2 节点的 `statement` 含具体数学断言而非结构描述，
仍按上一条处理」。**这个口子我没有逐个核过 24 个 L2 的 statement**，
所以不知道有几个会掉进来——未核。主控若要数，用 `tmp_index/statements.tsv` 筛 `L2:` 前缀那 24 行。

### 5.4 反例：机器能查的只有 R1–R5，查不出假标注

R1–R5 全是字段存在性/取值域检查，`check_graph.py` 现在**一行都没查节点 origin**
（`grep -n origin tools/check_graph.py` 的命中全是 `id_origin` 这个变量名与边侧逻辑，
节点侧零校验）。加上 R1–R5 后能查的仍只是「字段齐不齐」。
**一个节点把模型算出的答案标成 `origin: source`，R1–R5 全过。**
这与锚点盲区五型同源：机器证明「字段合规」，不能证明「标注为真」。
所以第二节的价值上限是「让漏标可被机器发现」，不是「让假标注可被机器发现」——
后者只能靠审计 A。这一点必须在 SPEC 里说清，否则会重演「N/N 锚点已验证」那种虚假保证。


## 六 与其它待议项的耦合（只列，不代它们裁定）

- **死因 6 入 SPEC**（`_转交-新会话-workflow.md:303`）：硬耦合。第二节写了「漏标 `origin` 判死因 `6`」，
  若死因 6 不入 SPEC，那句须改成判 `FIX`。见第三节改动 3。
- **`origin: model` 声明后是否允许无锚的证明重构节点**（同 `:303`）：直接相邻。
  第二节的 R4 只说「无锚 ⇒ 必须标 model/mixed」，**没说反过来「标了 model 就允许无锚」**。
  这个许可由那一项裁定。现存 4 个无锚 `d:` 节点全已标 model，两种裁定下它们都不违反 R4。
- **`verify_anchors.py` 是否该对无锚节点判失败**（同 `:303`）：若判失败，须与 R4 对齐口径，
  否则同一个无锚节点在两个工具里一个过一个不过。
- **是否每个 statement 句子都必须被锚点管到**（同 `:303`）：语义重叠最深的一项。
  `mixed` 的存在本身就是「statement 有句子没被锚点管到，但如实声明了」的合法出口；
  若那一项裁定「必须全管到」，`mixed` 就成了矛盾取值。**这两项须一起裁**。
- **边的 `evidence` 能否算作节点的锚点**（同 `:303`，本轮 T2 引出）：若可以，
  R5 的 49 个节点里有一部分可能靠出边 evidence 获得原文支撑，须重算。我未算这个交叉数。
- **`apostol:ext-` 命名空间是否合法**（同 `:303`）：5.1 那 9 个节点全在这个命名空间里。
  若该命名空间被判不合法，5.1 的边界情形连带消失。

## 顺带发现
- `tools/export_obsidian.py:161` 边侧模型标记用的是正文内联 `*(模型推断)*`，节点侧只写 frontmatter，两侧诚实性呈现强度不对等——已并入本条第二节最后一款。
- `origin_note` 事实上承担了两种语义（模型产出声明 / 内容边界声明），H2 的 9 条全是后者，非本条职责，登记待另裁。
- `check_graph.py` 对节点字段几乎不校验（只查 DUP_ID 与悬空 id），节点侧 schema 合规目前完全无机器兜底。
- S2 那张习题问法统计表的 `show that` 列与实测不符（`15.12` 实测 0、S2 记 13；`15.16` 实测 2、S2 记 4），主控引用时请用本文第 1.4(2) 的表。
- `data/graveyard/` 存在但我未看，不知其中节点是否也带 origin，未核。
