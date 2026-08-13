# SPEC 待议项 P09：sections 语义

## 〇 裁定（进 SPEC / 不进 SPEC / 有条件进；一句话理由）

**有条件进 SPEC。** 取语义 A（`sections` = 该节点内容的**出处**，不是「与哪些节相关」），
但必须拆成一条硬机器规则（正向：每条锚点的 `file` 所对应的节**必须**在 `sections` 里）
加一条审计规则（反向：每个声明的节应有见证，见证放宽到 T1∪T2，且不对无锚 L2 生效）——
S2 总览表只给了「语义 A / 12(+1)」这个结论与数，正文未写到项 4；我复核后确认 **12 这个数正确**，
但它只覆盖正向，反向另有 **22 个**节点违规，S2 的表漏了这一半。

## 一 现状取证（SPEC.md 相关行逐字 + 已有提案里的既有结论 + 你的复核）

### 1.1 SPEC.md 里 `sections` 的全部出现（`grep -n sections SPEC.md`，仅 2 处）

`SPEC.md:62`（节点 schema 示例内，逐字节选）：

> `"node_type":"theorem","sections":["15.04"],"statement":"1–3句英文,说清它是什么/断言什么"`

`SPEC.md:84`（L2+ 抽象层 schema 示例的最后一行，逐字）：

> ` "sections":["15.10","15.14"]}`

**取证结论：SPEC 从头到尾没有一句话定义 `sections` 是什么。** 它只作为示例里的一个键出现过两次，
既无语义说明、无填写规则、无校验要求。P09 的根因就是这个空白——两种读法都不违反现行 SPEC，
所以两种读法在数据里同时存在（§4 实测：正向 12 例按语义 A 违规、反向 22 例按语义 A 违规）。

### 1.2 已有提案里的既有结论与我的复核

`S2-SPEC-字段语义.md:35`（第 1 节「七条裁决总览」表的第 4 行，逐字）：

> `| 4 | \`sections\` 语义 | **「被定义/陈述于」**(语义 A),不是「被用到」 | 12(+1 联动) | \`SPEC.md:59–65\` |`

用 `grep -n "^## \|^### " S2-SPEC-字段语义.md` 查该文件的小节标题：正文只写到
`## 项 3 节点是否可带 origin`（`S2:296`）及其下属小节，**没有「项 4」小节**。
即 S2 的项 4 只有总览表里这一行裁决与一个数，**没有依据、没有条文、没有算法**。
S3 与 S1 里 `sections` 的出现（`S3:66–68`、`S3:93`、`S3:120`、`S1:19`）都是把 `sections`
当已知语义来用（S3 用它论证「第二使用点已有栏位」故不新增关系词），没有一处定义它。

**我的复核（三点）：**

1. **裁决方向（语义 A）站得住，我采纳。** 决定性理由不是 S2 给的，而是：`sections` 若表示
   「与哪些节相关」，它与图里的边完全重复记账（相关性正是 `requires` / `applies-to` /
   `contrasts` 在表达的东西），且立刻不可校验——「相关」没有判据。语义 A 则与锚点机制天然对齐：
   锚点的 `file` 就是出处的机器见证。
2. **「12」这个数正确，我独立复算得到同一个数**（算法见 §4.1），但它只是正向违规数。
3. **「(+1 联动)」指 `apostol:zero-element`，S2 把它算作语义 A 的联动修正——这个归类不准确。**
   实测（`nodes.tsv` 该行）该节点 `sections=15.02,15.04`，`anchors.tsv` 两条锚点分别在
   `15.02.md`、`15.04.md`，**正反向都合规**，它不在 12 例、也不在 22 例里。它要补 `15.03`
   的真实理由是第三类问题：`statement` 第二句「In a function space the zero element is the
   function whose values are everywhere zero.」的内容出自 `15.03`，而该节点在 `15.03` 上
   既无锚点、也无 `sections`（`pool.tsv` 实测该节点 T1/T2/T3 共 7 条，**无一条来自 15.03.md**，
   与 `A9-记账错更正.md:230` 一致）。**这一类机器查不出**（正反向两个检查都过），
   所以它不能当作语义 A 规则的「实例」被自动捕获，只能靠审计读 `statement` 发现。
   规则条文里必须为这一类单列一句，否则 P09 的规则跑完 `zero-element` 仍然漏。

## 二 拟并入 SPEC 的逐字条文

以下整块作为新小节 `## sections 语义（出处，非相关性）` 插入，位置见 §3。

```
## sections 语义(出处,非相关性)

`sections` 列出**该节点自身的内容出自教材的哪些节**,即「被定义于/被陈述于」。
它**不是**「与哪些节相关」——相关性由边表达(`requires` / `applies-to` / `contrasts` 等),
不得用 `sections` 重复记账。判据:若把该节从教材里删掉,该节点的 `statement`
是否还有一句话失去出处;若是,该节入 `sections`;若只是「读到那一节时会用上它」,不入。

**正向规则(硬校验,可机器执行)**:节点每条 `anchors[].file` 所对应的节,
**必须**出现在该节点的 `sections` 里。文件名到节号的归一化:去掉 `.md`,
再去掉 `-exercises` 后缀(`15.12-exercises.md` → `15.12`)。违反即判缺陷。
**修复方向由审计定,不得默认补 `sections`**:若那条锚点确实承载了 `statement` 的某个子句,
补 `sections`;若它只是过渡句、背景句或借用引文(锚点盲区 B/D/E 型),
则该动的是**锚点**——换掉或删掉它,`sections` 不动。

**反向规则(审计项,不进机器硬校验)**:`sections` 里每个节都应有见证,
见证为该节点的 T1(自身锚点)**或** T2(它作为 src 发出的边的 `evidence`)落在该节。
T3(后代)**不算**见证——后代的出处属于后代,父节点若只靠后代见证某节,
说明该节的内容已下移,父节点的 `sections` 应删掉它。
**豁免**:按第 56 行豁免原文锚点的抽象层节点(L2+)整体不受反向规则约束,
其 `sections` 表示 `members` 覆盖的节的并集,由 `members` 而非锚点见证。
反向不判硬失败的原因是它与锚点数上限 3 冲突(见下条)。

**溢出条款**:非 L2 节点若 `sections` 长度 > 3,它不可能被 3 条锚点全部见证。
此时必须在节点上写 `sections_note`,逐节说明每个无锚见证的节凭什么入列,
否则删到 3 节以内。

**第三类(机器不可见,仅审计)**:`statement` 里若有子句的内容出自某节,
而该节既不在 `sections`、也无锚点,则正反向两条规则**都不报警**。
审计 A 必须逐句读 `statement`,对每句问「这句的出处是哪一节、它在 `sections` 里吗」。
`apostol:zero-element` 属此类。
```

## 三 替换或修改 SPEC.md 的哪几行（给出行号与新旧对照）

### 3.1 主体：在 `SPEC.md:65` 之后、`:66` 空行处**插入**新小节

`SPEC.md:59–66` 现状逐字（`59` 为小节标题、`62` 为 schema 行、`65` 为附注、`66` 为空行）：

```
59  ## 节点 schema(JSONL,一行一个)
60
61  ```json
62  {"id":"d:additive-inverse-uniqueness",...,"sections":["15.04"],...}
63  ```
64
65  `parent` / `atomic` / `atomic_reason` 仅 `d:` 节点必填。
66
```

**新增**（不删不改 59–65 任何一行，§2 整块插入为新的第 66 行起）：

```
66  ## sections 语义(出处,非相关性)
67
68  (§2 全文)
```

原 `66` 及以后各行整体下移。S2 总览表把项 4 的落点写成 `SPEC.md:59–65`
——**该范围内没有任何一行需要改动**，`sections` 在 62 行只是示例里的键，
语义规则无处可挂，只能新增小节。这是对 S2 落点的一处更正。

### 3.2 联动：`SPEC.md:84` 的 L2 schema 需加一句附注

`84` 行现状逐字：

```
84   "sections":["15.10","15.14"]}
```

`87` 行现状逐字：

```
87  `boundary` 与 `abstraction_gain` **缺一即判死**。这两栏是上一轮实验中审计质量的最大贡献项。
```

在 `87` 行后**追加**一行（不改 87 本身）：

```
88  L2+ 的 `sections` 是其 `members` 所覆盖的节的并集,由 `members` 见证,不受锚点正向规则约束。
```

### 3.3 联动：`SPEC.md:93` 审计 A 的职责需加一句

`93` 行现状逐字：

```
93  - **审计 A(正确性与归属)**:数学是否正确;`members` 是否真的属于它;锚点/引文是否真在书里。
```

在 `94` 行（`93` 的续行）后追加一句：

```
    并逐句核 `statement`:每句的出处节是否在 `sections` 里(机器查不出的第三类)。
```

三处合计：**新增一个小节 + 2 行附注，0 行删除，0 行改写。**

## 四 回溯影响（用 tmp_index 算出的实数：多少条目从合规变违规、多少反之，附算法）

**总口径先说清**：分母用 **518 个有锚节点**（546 全表 − 24 个 L2 − 4 个无锚 `d:`，
无锚节点名单见 `tmp_index/README.md:21–22`）。原先合规是因为 SPEC 无规则，
所以严格说**全部 518 个现在都「合规」**，新规则只会产生「合规 → 违规」，不会产生反向。
下面的「反之」指的是**被新规则的豁免条款保住、不算违规**的那些。

### 4.1 正向规则（硬校验）：**12 个节点从合规变违规**

算法（`awk` 连接 `nodes.tsv` 与 `anchors.tsv`）：对每个有锚节点，把 `anchors.tsv` 的 `file` 列
去掉 `.md` 与 `-exercises` 得到节号集合 A，把 `nodes.tsv` 第 4 列 `sections` 按逗号切开得集合 S，
若 `A \ S ≠ ∅` 即违规。实测 **12 个**（与 S2 表的「12」一致）：

| 节点 | loc | sections | 缺的节 |
| --- | --- | --- | --- |
| `d:linear-space-is-a-set-together-with-two-operations` | `nodes-D1.jsonl:1` | 15.01,15.02 | 15.03 |
| `d:ten-axioms-listed-in-three-groups` | `nodes-D1.jsonl:5` | 15.02 | 15.01 |
| `d:axiom-5-states-the-zero-only-as-a-right-neutral-element` | `nodes-D1.jsonl:21` | 15.02 | 15.04 |
| `d:example-3-v-n-with-componentwise-operations` | `nodes-D1.jsonl:50` | 15.03 | 15.01 |
| `d:example-4-nontrivial-check-is-closure-by-linearity-of-the-dot-product` | `nodes-D1.jsonl:55` | 15.03 | 15.02 |
| `d:15-11-denominator-nonzero-by-positivity` | `nodes-D3.jsonl:62` | 15.11 | 15.10 |
| `d:parseval-conjugate-comes-from-hermitian-symmetry` | `nodes-D3.jsonl:68` | 15.11 | 15.10 |
| `d:normalized-element-has-norm-one` | `nodes-D4.jsonl:19` | 15.10,15.13 | 15.11 |
| `d:s-perp-closure-follows-from-linearity-in-the-first-argument` | `nodes-D4.jsonl:27` | 15.14 | 15.10 |
| `d:orthogonality-to-generators-extends-to-their-span` | `nodes-D4.jsonl:9` | 15.13 | 15.14 |
| `d:thm-15-1-two-candidate-zeros-swap-roles-in-axiom-5` | `nodes-D5.jsonl:1` | 15.04 | 15.02 |
| `d:thm-15-2-left-neutrality-needs-the-commutative-law` | `nodes-D5.jsonl:3` | 15.04 | 15.02 |

**关键：这 12 个里不是都该补 `sections`。** 我抽查 4 个读了 `statement` 与锚点原文：

- `d:thm-15-2-...`（`nodes-D5.jsonl:3`）：`statement` 明写「Axiom 5 asserts neutrality only in
  the form x + O = x」，第三条锚点 `15.02.md`/36c 正是该公式。→ **补 `sections` 15.02**，正确。
- `d:example-3-...`：`statement` 有子句「one of the several familiar examples 15.1 cites」，
  `15.01.md`/128c 锚点正支撑它。→ **补 15.01**，正确。
- `d:ten-axioms-listed-in-three-groups`：多出的锚点是 `15.01.md`/54c
  「We turn now to a detailed description of these axioms.」——它对「恰好十条、分三组」
  **一个字都没说**，是过渡句（E 型盲区）。→ **该删锚点，不补 `sections`**。
- `d:orthogonality-to-generators-extends-to-their-span`：多出的锚点是 `15.14.md`/100c
  讲 `s^⊥ ∈ S^⊥`，节点讲的是「与生成元正交⇒与 span 正交」，对象不同（A/D 型）。
  查 `shared-quotes.tsv` 该 quote **不在表里**（`n_holders=1`），故非 B 型机械借用，
  但仍是射程问题。→ 倾向**该换锚点**，不补 15.14；边界，见 §5.2。

抽查 4 例中 **2 例该补 `sections`、2 例该动锚点**。这正是条文里
「修复方向由审计定，不得默认补 `sections`」那句的实测依据——若机器自动补 `sections`，
会把 2 条坏锚点洗白成合法出处。**未核**：剩下 8 例我没逐条读原文。

### 4.2 反向规则（审计项）：**22 个违规，放宽到 T1∪T2 后 20 个**

算法：对每个有锚节点，`sections` 里每个节 s，检查 `pool.tsv` 中该节点 `layer=T1` 的行
是否有 `file` 归一化后等于 s。实测 **22 个**；把见证放宽到 `T1 ∪ T2` 后降到 **20 个**；
若连 T3 也算（条文明确不算）则 **18 个**。

**T2 救回 2 个**（`apostol:projection-along-an-element` 的 15.14、
`d:projection-is-the-s-component-of-the-orthogonal-decomposition` 的 15.15）——
这 2 个是 T2 塌缩，内容在图里、只挂在边上，属记账位置问题，不该判违规。
**T3 另救 2 个**（`apostol:spanning-set` 的 15.08、`apostol:projection-on-a-subspace` 的 15.15），
条文**故意不救**：后代见证说明内容已下移，父节点的 `sections` 应删掉那一节
（这就是过报通道 (a) 在 `sections` 上的对应形态）。

即反向规则的净结果：**20 个节点从合规变违规，其中 2 个的正确修复动作是删 `sections`
而不是加锚点**。

### 4.3 溢出条款：**1 个节点触发，15 个被豁免条款救下**

`sections` 长度 > 3 的共 16 个（算法：`awk` 切第 4 列计数）。其中 **15 个是 L2**
（`structures-L2-a/b/c.jsonl`，全部 `n_anchors=0`），被豁免条款整体排除，**从违规变合规**。
唯一的非 L2 是 `apostol:ext-vn-as-a-prior-vector-space`（`nodes-H2.jsonl:6`，
`sections=15.03,15.06,15.07,15.10`，`n_anchors=2`）→ **须补 `sections_note` 或删到 3 节以内**。

另有 **7 个有锚节点 `sections` 数 > 锚点数**（含上面那个），它们不违反溢出条款
（长度 ≤ 3 时 3 条锚点上限还够用），但全部落在 §4.2 的 20/22 里，无需另计。

### 4.4 合计

**正向 12 + 反向 22，交集 2，并集 32 个节点须动**（占 518 的 6.2%）。
放宽到 T1∪T2 后并集为 **30**。其中：需补 `sections` 的约 10 个（抽查外推，未逐条核）、
需删 `sections` 的 2 个、需动锚点的约 2 个（抽查确证）、需补 `sections_note` 的 1 个。
**从违规变合规的只有 15 个 L2**（靠豁免条款）。
`apostol:zero-element` 不在这 32 个里（§1.2 第 3 点），它由 G2e 单独处理。

## 五 反例与边界情形

### 5.1 反例（针对正向硬规则）：`d:ten-axioms-listed-in-three-groups`

这是「机器按正向规则自动补 `sections` 会把坏数据洗白」的反例。
该节点 `sections=15.02`、锚点 1 在 `15.02.md`（163c）、锚点 2 在 `15.01.md`（54c，
逐字：`We turn now to a detailed description of these axioms.`）。
正向规则报警，若照字面「把锚点的节补进 `sections`」，得到 `sections=15.01,15.02`
——于是一条对断言零支撑的过渡句锚点，反而获得了「15.01 是本节点出处」的正式背书。
条文因此必须写明修复方向双向可选。

**这条锚点还踩了过报通道 (b)**：`source-lines.tsv` 实测 `apostol-ch15/15.01.md:5`
是一行 **449 字符、`n_sentence_end=4`** 的段落，该 quote 是这行的第 4 句。
按行号做任何覆盖比对都会把这一行算成「15.01 已被覆盖」，高报。

### 5.2 边界情形一：同一命题在两节各出现一次，算几个出处

`d:orthogonality-to-generators-extends-to-their-span`（`nodes-D4.jsonl:9`，`sections=15.13`）
的两条锚点分别在 `15.13.md`（60c，「Therefore, it is orthogonal to every element in the subspace」）
与 `15.14.md`（100c，讲 `s^⊥ ∈ S^⊥`）。教材在 15.13 与 15.14 **各用了一次同一个引理**，
但 15.14 那次的对象是 `s^⊥`、`S^⊥`，与节点断言的生成元/span 不是同一组对象。
按语义 A 的删除判据自问：删掉 15.14，节点 `statement` 是否有句子失去出处？**否**——
15.13 那条锚点已经管住全句。故 15.14 不入 `sections`，该动的是锚点。
**但反过来也有可辩之处**：15.14 那次确实是同一引理的第二个实例。
这类「同一命题的第二实例」该记在 `sections` 还是记成一条边，与 P?? 关系词待议项耦合（§6）。
条文用「删除判据」把它判到「不入」一侧，是一个可被复议的选择，我标为**中置信**。

### 5.3 边界情形二：`ext:` 节点的 `sections` 语义可能天然是「被用到」

`apostol:ext-vn-as-a-prior-vector-space`（`nodes-H2.jsonl:6`）的 `statement` 逐字含
「Chapter 15 never constructs V_n, never states its operations explicitly, and never verifies
its axioms」。这个节点记录的是**教材未加引用就借用的前置对象**，它按定义在第 15 章里
**没有出处**——`sections=15.03,15.06,15.07,15.10` 记的正是它**被用到**的四个节，
即语义 B。语义 A 一刀切会把这个节点判成重度违规（4 节里 2 节无任何见证）。
条文的溢出条款用 `sections_note` 兜住它（逐节说明），而不是强行删到 3 节，
就是为了不丢掉这条信息。**这是语义 A 的真实代价**：`ext:` 前缀的节点语义偏 B，
现行条文靠 `sections_note` 打补丁而非承认二义，是妥协不是解决。

### 5.4 边界情形三：习题文件的节号归一化

`anchors.tsv` 的 `file` 列含 `15.12-exercises.md`（54 条）、`15.05-exercises.md`（22 条）、
`15.16-exercises.md`（19 条）、`15.09-exercises.md`（9 条），共 104 条锚点。
若不做 `-exercises` 归一化，这 104 条锚点对应的节号会变成 `15.12-exercises` 之类，
与 `sections` 里的 `15.12` 全部对不上，正向规则会**误报约百条**。
条文里的归一化规则必须写死，否则这条硬校验一上线就是灾难。
反向的坑：`15.05` 与 `15.09` 在 `sections` 列里各只出现 11 次与 4 次，
而这两节**只有习题文件**——若某节点 `sections` 写 `15.05` 而锚点在 `15.05-exercises.md`，
归一化后恰好匹配，正确；这是归一化必须做的第二个理由。

## 六 与其它待议项的耦合（只列，不代它们裁定）

只列耦合点，不代它们裁定。

- **「是否需要表示『第二使用点』的关系词」（S3 项 2，已裁「不新增」）**：S3 的决定性论证是
  「第二使用点已有栏位——`sections` 是数组，57 个节点已在这么做」（`S3:66–68`）。
  我的语义 A 条文用「删除判据」把「第二实例」判到**不入 `sections`** 一侧（§5.2），
  这会削弱 S3 那条论证的适用面。**S3 的裁决本身我不反对**（重复记账的理由独立成立），
  但它引用的那个「57 个」在语义 A 下有一部分会被删成单值。**须由综合代理裁**。
- **锚点数上限 3（P?? 「3 锚点上限是否该提高」）**：反向规则之所以只能当审计项、不能当硬校验，
  直接原因是 3 条锚点见证不了 4+ 个节。若上限提高，反向规则可以升级为硬校验，
  溢出条款可整段删掉。
- **T2/T3 证据池（S2 项 2，已裁）**：反向规则的见证层级直接复用了 S2 的四层定义
  （见证取 T1∪T2、明确排除 T3）。若 S2 项 2 的层级定义被改，§4.2 的 22/20/18 三个数要重算。
- **cause 6「引文不支撑断言」（S2 项 1，已裁「入 SPEC」）**：§4.1 抽查出的 2 条该动锚点的案例
  （`ten-axioms` 的 15.01 锚、`orthogonality-to-generators` 的 15.14 锚）**同时是 cause 6 候选**。
  正向规则可以当 cause 6 的一个新机械信号——它捞到的 12 例里至少 2 例是真 cause 6。
- **`apostol:ext-` 命名空间（S2 项 6，已裁「合法」）**：§5.3 指出 `ext:` 节点的 `sections`
  语义天然偏语义 B。若 `ext:` 合法化，SPEC 可能需要为该前缀单列 `sections` 语义。
- **`parent` 是否仅指 part-of（S2 项 5，已裁）**：反向规则排除 T3 的理由（「后代的出处属于后代」）
  依赖 part-of 的语义。若 `parent` 允许 is-a，「后代」的口径要重新界定。

## 顺带发现

- `S2-SPEC-字段语义.md` 总览表把项 4 落点写成 `SPEC.md:59–65`，但该范围内无一行需改（只能新增小节），落点须更正。
- `S2` 正文只写到项 3，项 4/5/6/7 只有总览表的一行裁决，无依据无条文——其余三项也需有代理补正文。
- `SPEC.md:33` 的节点类型是 `concept/method/theorem/notation`，与任务书封闭词表 `concept/theorem/proof-step/example` 不一致，两者互不相容，未展开。
- `G2f-记账错复核.md:154` 已注意到 `apostol:ext-uncited-dimension-of-a-second-order-de-solution-space` 的 `sections` 写 15.03 而两锚均在 15.08.md，与本项同型；它落在我 §4.2 的 22 例里。
- `apostol-ch15/15.01.md:5` 是 449 字符 4 句的单行，`15.01.md:3` 是 481 字符 4 句——15.01 全节几乎无法按行号做覆盖比对。
- `apostol:zero-element` 的第三类问题（statement 有出处、锚点与 sections 皆无）机器两向检查都不报警，建议主控评估全表有多少同型漏网，本轮未算。
