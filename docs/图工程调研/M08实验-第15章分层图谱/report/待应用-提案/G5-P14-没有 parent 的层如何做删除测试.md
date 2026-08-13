# SPEC 待议项 P14：没有 parent 的层如何做删除测试

只读代理产出。**本文件是提案，不是执行结果。**未改 `data/` 与 `tools/` 下任何文件。
所有计数均在本次会话实测（脚本写在 `/tmp/`，用完即弃，算法逐条写在第四节）。

## 〇 裁定

**有条件进 SPEC**：把删除测试的对照从「父 + 兄弟」改写成按优先级唯一确定的
**恢复基 R(n)**（六档，首档命中即止），`members` 只是其中第二档、仅覆盖 24/546 个节点；
条件是同时写入「同层同批次节点不得入基」这条禁令——实测 6/24 条 L2 判决违反它，其中 4 条构成互证塌缩。

任务书提示的「用 `members`」方向正确但**射程不足**：无 `parent` 的节点共 **259 个**，
`members` 只覆盖 24 个（9.3%），剩下 235 个仍无对照。所以本条必须给的是一张全覆盖的优先级表，
不是一条 L2 专用规则。

## 一 现状取证

### 1.1 SPEC.md 里**根本没有删除测试**

`grep -n "删除\|对照\|兄弟\|members\|恢复" SPEC.md` 的全部命中：`:7`（横向对比讲兄弟概念辨析，
与删除测试无关）、`:56`、`:81`、`:93`（三处都是 `members` 字段本身）。
**「删除测试」四个字在 SPEC.md 中出现 0 次。** 最接近的是 `:95` 逐字：

> - **审计 B(抽象增益)**:是否只是"换个名字重新包装下层";是否是空洞哲学。杀掉伪抽象。

这是一句判据意图，不是可执行程序：没说拿什么当对照，也没说"下层"指哪些节点。
后果是全部 7 份 B 系审计（覆盖 **527/546** 个节点）各自自行操作化，SPEC 无一字约束。

### 1.2 已有提案里的既有结论，以及我的复核

`S3-SPEC-关系词与审计程序.md:15` 的裁决速查表写了本项：

> | 3 | 无 `parent` 层的删除测试 | **进 SPEC,以「恢复基」替代「父+兄弟」** | 新增「恢复基」定义表 |

**复核结论：这一行是空头承诺，依据不存在。** 三点实测：

1. S3 正文 `grep -n "^#"` 只有 `§一`（关系词）与 `§二`（枢纽豁免）两节，**§三 从未写出**。
2. 全实验目录 `grep -rn "恢复基" --include="*.md"` 仅 4 处命中：S3 `:15`、`:16`（速查表两行），
   以及 `G5-P07:366,367` 转述 S3。**「恢复基」这个词在本实验里从未被定义过。**
3. 因此 S3 的"新增「恢复基」定义表"这一 SPEC 动作**没有可并入的文本**。本条文补的正是这张表。

S3 项 4（作用域=父+兄弟而非全图）我采纳并沿用，第五节给出它的定量支撑（同节共现基会涨到 198）。

### 1.3 两处审计已经自己发明了操作化，且都写明是自创

- `audit-B2.md:137` 逐字：「**SPEC 缺口:X 层节点没有 parent。**……我按任务书给的 X 专用问法执行
  ……并把"两侧成员各自的 statement"当作 parent 位。这是我自己的操作化,SPEC 未规定,
  若上层另有约定则本层 22 个判决需重跑。」→ 即本条文的 **R3**，我采纳，22 条判决无需重跑。
- `audit-B2.md:139`：A2-x2 反例节点也无 parent，「我把"该反例所服务的正文概念节点"当作事实上的 parent
  ……这一步是推断出来的,不是文件里写的。」→ 对应 **R6**，但推断结果与机械基有 5 处不一致（见 4.3）。
- `audit-L2-B.md:5` 逐字：「删掉该 L2，学习者手里仍有它的全部 members；他能否仅凭 members
  重新得出该结构声称的判断力？」→ 即本条文的 **R2**。我采纳其方向，但它漏了「不得用同层节点」，
  实测因此产生 6 条越界判决（见 4.4），这是既有结论的**实质错误**，不是表述问题。

## 二 拟并入 SPEC 的逐字条文

以下为**可直接并入 SPEC.md 的逐字文本**（含标题层级，无需改写）。

---

### 删除测试与恢复基

审计 B 的唯一判据是**删除测试**：把节点 `n` 从图中删掉，只留下 `n` 的**恢复基** `R(n)`，
问「学习者仅凭 `R(n)` 能否重新得出 `n` 的 `statement`（抽象层节点：`abstraction_gain`）
所声称的全部判断力」。能 ⇒ 无增量，判 `KILL` 死因 `5`；不能 ⇒ `KEEP`，
且 `reason` 必须点出那个 `R(n)` 里没有的新判断。

`R(n)` **不是**"全图"，也**不由审计者临场挑选**。它按下表**从上往下取，首档命中即停止**，
唯一确定。表中"兄弟"一律指同一父的其它子节点，且一律排除 `n` 自身。

| 档 | 命中条件 | `R(n)` 定义 |
| --- | --- | --- |
| R1 | `n` 有 `parent` 字段 | `parent` ∪ 与 `n` 同 `parent` 的节点 ∪ `parent` 的 `part-of` 子 |
| R2 | `n` 有 `members` 字段（L2+ 抽象层） | `members` 全体 |
| R3 | `n` 有 `apostol_ids` / `strang_ids`（`x:` 对齐层） | 两侧 id 的并集 |
| R4 | `n` 是某条 `part-of` 边的 `src`（即它有父） | 全部 `part-of` 父 ∪ 这些父的其它 `part-of` 子 |
| R5 | `n` 是某条 `part-of` 边的 `dst`（即它有子） | 它的全部 `part-of` 子 |
| R6 | 以上皆不命中 | `n` 的**距离 1 边邻居**：任意 `rel`、任意方向的相邻节点 |

三条禁令：

1. **不得用 `sections` 同节共现充当 `R(n)`。** 同节节点数最多可达 198，等于把作用域放成全图，
   删除测试会退化为"章内任何地方讲过就判死"。`sections` 只用于定位，不入基。
2. **同层同批次节点不得入基。** 判 L2 时不得用另一个 L2 当对照（即使它也在 `members` 里），
   判同一批 `d:` 节点时不得用同批待判节点当对照。理由：这是互证塌缩的入口——
   `A` 因内容在 `B` 里而判死、`B` 因内容在 `A` 里而判死，两条一起执行则内容凭空消失。
3. **基不得为空。** 若六档全不命中或 `R(n) = ∅`，该节点**不得判 `KILL`**，
   一律记 `verdict: "NOT-TESTABLE"`，并在报告里列出 id。空基是建图缺陷（该节点未接入任何结构），
   应补边而不是判死。

### 审计者扩基的处理

若审计者认为 `R(n)` 之外的某节点 `m` 才是真正的对照，**不得把 `m` 悄悄算进基**。
正确动作是：按机械基判定，同时登记一条**缺边建议** `n —(rel)→ m`。
审计 `reason` 里引用了不在 `R(n)` 内的 id，即视为一条缺边建议，执行前必须逐条裁决。

### 批量执行前的两道检查（与死因 5 的批次相关）

一批 `KILL` 名单确定后，执行前必须跑：

1. **互证检查**：任一条 `KILL` 的 `reason` 若引用了本批也要杀的 id，两条不得同批执行。
2. **空基检查**：任一条 `KILL` 的 `R(n)` 若因本批其它 `KILL` 而变空，该条降级为 `FIX`。

---

## 三 替换或修改 SPEC.md 的哪几行

**一处替换 + 一处插入，都在 `## 审计规则` 一节内（SPEC.md `:89`–`:102`）。**

### (1) 替换第 95 行

旧（`SPEC.md:95` 逐字）：

```
- **审计 B(抽象增益)**:是否只是"换个名字重新包装下层";是否是空洞哲学。杀掉伪抽象。
```

新：

```
- **审计 B(抽象增益)**:用下文的**删除测试**判定,对照集恒为该节点的**恢复基** `R(n)`,
  不得临场另选对照。杀掉伪抽象。
```

### (2) 在第 95 行与第 96 行（空行）之间插入第二节全文

即插在审计 A/B 两条之后、`**审计裁决必须回显候选 id**`（现 `:97`）之前。
插入内容为第二节 `---` 之间的全部文本（`### 删除测试与恢复基` 起、
至 `### 批量执行前的两道检查` 一节末），共 3 个 `###` 小节。

### (3) 不动的行，及理由

- `:100` 死因表**不改**。死因 `5` 的语义（伪抽象·层塌缩）不变，本条只规定怎么测出它。
- `:102` 停止规则不改。S3 速查表项 C 主张重写它，那是另一条待议项，不在本项范围。
- `:56`、`:81`、`:93` 的 `members` 三处不改。本条只是给 `members` 增加一个用途（当 R2 基），
  没有改变它的字段语义或必填性。
- **不新增字段。** 六档全部读现有字段与现有边，`R(n)` 可由脚本从 `data/` 全量重算，
  不需要在任何 JSONL 里落盘。这是本条文刻意保持的性质：换一版数据，基自动跟着变。

唯一新增的取值是 `verdict: "NOT-TESTABLE"`。若上层不愿在 verdict 词表里开第三档，
替代写法是沿用 `FIX` 并在 `reason` 里以 `[NOT-TESTABLE]` 开头，效果等价。

## 四 回溯影响

本条是**程序条文**，不直接判任何节点的数据违规，所以「多少条目从合规变违规」要分两问回答：
(a) 多少节点从"删除测试无法运行"变成"可运行"；(b) 多少条**已有判决**从合规变越界。

### 4.1 覆盖率：从 287/546 变成 546/546（(a) 项，+259）

算法：遍历 `data/nodes-*.jsonl` + `data/inherited/nodes-*.jsonl` + `data/structures-L2-*.jsonl`
（共 546 节点），逐节点按 R1–R6 取首档命中，统计各档节点数与基大小。
`part-of` 关系从 `data/edges-*.jsonl` + `data/inherited/edges-*.jsonl` 的 `rel=="part-of"` 重建
（314 条，与 `tmp_index/partof.tsv` 一致）。

| 档 | 适用节点数 | 基大小 min / median / max | 现状是否有对照 |
| --- | --- | --- | --- |
| R1 `parent` 字段 | **287** | 1 / 4 / 17 | 有（旧规则唯一覆盖的一档） |
| R2 `members` | **24** | 6 / 10 / 16 | 无（audit-L2-B 自创） |
| R3 两侧 ids | **22** | 5 / 8 / 12 | 无（audit-B2 自创，已自述） |
| R4 `part-of` 父 | **26** | 1 / 3 / 17 | 无 |
| R5 `part-of` 子 | **70** | 1 / 2 / 17 | 无 |
| R6 边邻居 | **117** | 1 / 4 / 14 | 无（audit-B2 靠推断） |
| 合计 | **546** | — | — |

**关键校正：`parent` 是 `d:` 独占字段。** 实测有 `parent` 的 287 个节点**全部**是 `d:`；
无 `parent` 的 259 个按前缀是 `apostol:` 151 / `strang:` 62 / `L2:` 24 / `x:` 22。
所以任务书说的「L2 层的 24 个节点没有 parent」只是这个缺口的 **9.3%**。
若只写一条 L2 专用规则，另外 235 个节点的删除测试仍然无 SPEC 依据。

**L2 在边图里完全孤立**：`awk` 统计 1433 条边中 `src` 或 `dst` 含 `L2:` 的 = **0 条**。
所以对 L2 而言 `members` 不只是"可能的答案"，而是**唯一可能的答案**——R4/R5/R6 对它全部空转。
实测 24 个 L2 的 `members` 引用共 255 次、去重 188 个、**悬空 0 个**，前缀分布
`d:` 102 / `apostol:` 38 / `strang:` 32 / `x:` 16，基可用。

### 4.2 未被任何 B 系审计判过的 19 个节点（(a) 项的剩余债务）

算法：取 7 份 B 系判决文件（`audit-B`、`B2`、`B3-A1`、`B4-S1`、`B5-A2s`、`B6-H`、`L2-B`）
的 `id` 并集 ∩ 546 节点 = **527**，补集 19 个：

- `data/nodes-CX2.jsonl` **15 个**（全为 R6 档，`apostol:cx-*` 反例节点）
- `data/nodes-D3.jsonl` 1 个 + `data/nodes-D5.jsonl` 3 个（R1 档，有 `parent`，属排期遗漏而非缺口）

CX2 那 15 个是本条文新增可测性的直接受益者，**但也是本条文暴露出来的新债务**：
它们此前未被删除测试判过，条文并入后应补一轮 B 系审计。这是我核出来的、口径外的欠账，
不要当成"条文一并入就完事"。

### 4.3 R6 档：5 条判决的对照落在机械基之外（(b) 项，+5 越界）

算法：取 `audit-B2-verdicts.jsonl` 中 R6 档节点，用
`re.findall(r'(?:apostol|strang|d|x|L2):[a-z0-9-]+', reason + suggested_fix)`
抽出 `reason` 引用的 id（过滤掉不存在的与自身），再看是否与该节点的边邻居集合有交。

- 引用 id **落在**边邻居内：**6** 条 → 合规，无需动。
- 引用 id **不在**边邻居内：**5** 条 → 越界，按第二节「审计者扩基的处理」登记为缺边建议。
- `reason` 未引用任何 id：**15** 条 → 无法机械判定基是否合规，**未核**，需人工回看。

5 条越界的实例（左=被判节点，中=reason 引用的对照，右=机械基里实际有什么）：

| 被判节点 | reason 用的对照 | 机械基（部分） |
| --- | --- | --- |
| `apostol:cx-root-of-sum-of-squared-products-breaks-linearity` | `apostol:cx-inner-product-axiom-diagnosis` | `d:inner-product-additivity-axiom`, `d:inner-product-homogeneity-axiom` |
| `apostol:cx-absolute-value-of-the-dot-product-breaks-homogeneity` | `apostol:cx-absolute-value-in-second-slot-breaks-symmetry` | `apostol:cx-absolute-value-and-product-of-integrals-on-polynomials` 等 |
| `apostol:cx-exponential-weight-is-what-tames-the-unbounded-interval` | `apostol:cx-log-weight-vanishing-at-an-endpoint` | `apostol:cx-convergence-must-be-proved-before-the-axioms` 等 |
| `apostol:cx-dropping-the-conjugate-destroys-positivity` | `apostol:cx-cross-terms-do-not-collapse-to-twice-the-inner-product` | `apostol:complex-euclidean-space`, `apostol:weighted-integral-inner-product` |
| （第 5 条同型，均为 `apostol:cx-*` 内部横向引用） | — | — |

这 5 条**全部是 `cx-` 反例节点之间的横向引用**，即审计者看到的关联是真实的，只是图里没连边。
所以正确处置是补 5 条边（`contrasts` 最可能，需逐条定），不是推翻判决。

### 4.4 R2 档：6/24 条 L2 判决用了非法基，其中 4 条构成互证塌缩（(b) 项，+6 越界、4 必重跑）

这是本条文最实质的回溯影响，也是既有结论（`audit-L2-B.md:5`）的实质错误。

算法：对 `audit-L2-B-verdicts.jsonl` 的 20 条 `KILL`，抽 `reason` 里的 `L2:` id，
与 (i) 该节点自己的 `members`、(ii) 本批 `KILL` 名单分别求交。

- 20 条 `KILL` 中，`reason` 引用了**另一个 L2** 的：**6 条**。
- 这 6 条引用的 L2，落在被判节点自己 `members` 里的：**0 个**。
  （实测 24 个 L2 的 188 个去重 member 前缀分布中 `L2:` 计数为 **0**——没有任何 L2 是另一个 L2 的成员。）
  ⇒ 这 6 条对照**全部**在合法基之外，违反禁令 2。
- 这 6 条里，被引用的 L2 **本身也被 KILL** 的：**4 条**，是真互证塌缩：

| 被判 L2（KILL） | reason 说内容在 | 该对照的判决 |
| --- | --- | --- |
| `L2:orthogonalizing-first-decouples-the-coefficients` | `L2:read-off-a-coefficient-by-one-pairing` | KILL |
| `L2:peel-off-the-projection-to-manufacture-a-new-direction` | `L2:construct-the-orthogonal-part-by-subtracting-projections` | KILL |
| `L2:orthogonal-splitting-makes-the-norm-additive` | `L2:expand-the-squared-norm-and-classify-the-cross-terms` | KILL |
| `L2:orthonormal-systems-make-approximation-incremental` | `L2:orthogonalizing-first-decouples-the-coefficients` | KILL |

第 4 行与第 1 行构成**长度 3 的塌缩链**：`orthonormal-systems-make-approximation-incremental`
→ `orthogonalizing-first-decouples-the-coefficients` → `read-off-a-coefficient-by-one-pairing`，
三条全在 20 条 `KILL` 名单里。一次执行完，链上三份内容同时消失，
而每一条的死刑理由都指向另一条"内容已经在那里了"。
另 2 条（`L2:read-off-a-coefficient-by-one-pairing` 引 `L2:independence-by-killing-all-but-one-coefficient`、
`L2:self-orthogonality-forces-zero-the-uniqueness-engine` 引 `L2:uniqueness-by-forcing-the-difference-to-zero`）
引的是 KEEP 存活者，塌缩风险低，但基仍越界，需按合法基重述理由。

**结论数字：24 条 L2 判决中 6 条（25%）从"现状合规"变"越界"，4 条必须按合法基重跑。**
`audit-L2-B` 的 16.7% 存活率会因此上升，具体升到多少**未核**——重跑要逐条读 `abstraction_gain`
与 members 的 statement，超出本条范围，我不预测。

### 4.5 反向（从违规变合规）：22 + 24 = 46 条判决被追认

- `audit-B2` 自述"若上层另有约定则本层 22 个判决需重跑"（`:137`）的 22 条 `x:` 判决，
  其自创操作化与本条 R3 一致 ⇒ **追认，0 条重跑**。
- `audit-L2-A`、`audit-L2-B` 的 24 条 L2 判决，其"用 members 当对照"这一步被本条 R2 明文合法化
  ⇒ **对照来源追认**（其中 6 条另因越界需修，见 4.4，两件事不冲突）。

## 五 反例与边界情形

### 5.1 具体演算：`L2:orthogonalization-as-a-dimension-counter`（R2 档，6 members）

选它是因为它 members 最少（6，全 24 个 L2 里最小），一次演算能写全，且已有判决可对照验证。

**第一步 取基。** 它有 `members` ⇒ R2 命中，`R(n)` = 那 6 个 id，无 `parent`（R1 空转）、
无任何边（R4/R5/R6 全空转）。基大小 6。按禁令 2，基里没有任何 L2，天然合规。

**第二步 把 `abstraction_gain` 拆成原子判断力。** 该节点声明三条：

- G1「把『这一族相关吗、张成多大』从存在性问题变成逐步执行、在固定位置读数的过程性问题」
- G2「不依赖任何矩阵消元，在函数空间照样可执行」
- G3「一旦某步输出为零，不仅知道相关，还知道相关出现在第几个元素上」

**第三步 逐条问基能否给出。**

| 判断力 | 基里的成员 | 该成员给了什么 | 塌缩? |
| --- | --- | --- | --- |
| G1 | `apostol:vanishing-orthogonalized-element-detects-dependence` + `d:orthogonalization-conclusion-b-spans-agree` | 前者：`y_{r+1}=O` ⇒ `x_1..x_{r+1}` 相关；后者：`L(y_1..y_k)=L(x_1..x_k)` 对每个 k 成立。两者并置一步即得「非零输出个数 = 张成维数」 | 是 |
| G2 | `d:gram-schmidt-works-in-infinite-dimensional-spaces` | 逐字：定理对有限或无限序列陈述、证明按单步归纳，故在任何欧氏空间可用 | 是 |
| G3 | `apostol:vanishing-orthogonalized-element-detects-dependence` | 该成员的 statement 自带 `for some r` 的下标定位，"第几个"就是 r | 是 |

三条全部塌缩 ⇒ `KILL`，死因 `5`。

**第四步 对照既有判决。** `audit-L2-B-verdicts.jsonl` 该 id 的 `reason` 逐字点的正是
`apostol:vanishing-orthogonalized-element-detects-dependence` 与
`d:orthogonalization-conclusion-b-spans-agree` 这两个成员，判 `KILL` 死因 `5`
（`audit-L2-B.md:43` 归入"单成员塌缩"9 条之一）。**机械基复现了既有判决**，
且该判决的对照全在基内、无 L2 越界 ⇒ 这 20 条 KILL 里的这一条是干净的，不在 4.4 的 6 条内。

### 5.2 反例：R6 必须用边邻居，不能用 `sections` 同节

`apostol:cx-orthonormal-basis-is-not-unique` 的 `sections` 是 `["15.16"]`，
但它的 3 个边邻居 `apostol:orthogonal-sequence-unique-up-to-scalars`、
`apostol:theorem-15-14-orthonormal-basis-exists`、`apostol:orthonormal-basis`
的 `sections` **全是 `["15.13"]`**。同节共现与边邻居在这个节点上**交集为空**。

若按"同节共现"取基，会拿 15.16 的一堆无关节点去测它，而真正该当对照的 15.13 三节点被排除；
实测按「同节 ∩ 边邻居」取基时，有 **16 个节点基为空**（全是 `apostol:cx-*`）。
改成「仅边邻居」后空基 **0 个**。这是禁令 1 的定量依据，也支持 S3 项 4「不是全图」的裁决：
R6 若用同节，基大小 min/median/max = 3 / 25 / **198**；用边邻居则是 1 / 4 / **14**，与 R1 的 1/4/17 同量级。

### 5.3 边界：基大小为 1

R4、R5、R6 三档的基最小值都是 1。基只有 1 个节点时删除测试仍然可运行（问"这一个成员能否给出全部判断力"），
但结论极脆弱：单成员塌缩与"父节点写不下所以拆出来"在形式上不可区分。
建议（**不进 SPEC，只作审计守则**）：基大小 = 1 且判 `KILL` 时，`reason` 必须逐字引用
那个唯一成员的 statement 片段，不得只写"内容已在成员里"。

### 5.4 边界：R1 与 R4 冲突时以 R1 优先，实测无矛盾

有 `parent` 字段的 287 个 `d:` 节点中，部分同时是 `part-of` 边的 `src`
（实测 `part-of` 边里 `d:→apostol:` 217 条、`d:→d:` 67 条）。R1 先命中，R4 不再执行。
这不会丢对照，因为 R1 的定义已经把 `parent` 的 `part-of` 子并进来了。
反向的危险情形是 `parent` 字段与 `part-of` 边指向**不同**的父。已实测排除：
287 个有 `parent` 的节点中 **284 个**同时是某条 `part-of` 边的 `src`，
这 284 个的 `parent` 值**全部**出现在它的 `part-of` 父集合里（一致 284，不一致 **0**）；
另 3 个有 `parent` 但没有对应 `part-of` 边（这 3 条是缺边，属 P07 范围，不影响 R1 取基）。
所以 R1 优先当前不丢任何对照。若将来出现不一致，R1 须改为 R1 ∪ R4。

## 六 与其它待议项的耦合

只列耦合点与需要主控裁的接口，不代它们下结论。

- **S3 项 3（本项）**：S3 速查表已给裁决但正文缺失、「恢复基」从未定义。本文件补齐该定义表；
  若主控采纳本文件，S3 速查表第 15 行的"新增「恢复基」定义表"应指向本文件。
- **S3 项 4（删除测试作用域：父+兄弟 vs 全图）**：本条文第五节 5.2 给出它的定量支撑
  （同节基 median 25 / max 198 vs 边邻居 median 4 / max 14）。两条应合并成同一节写入 SPEC，
  作用域定义只写一次。
- **S3 项 A（批量击杀前的互证检查）/ `A1-互证塌缩检查.md`**：本条文第二节末「批量执行前的两道检查」
  与它是同一件事的两个入口。**4.4 的 4 条 L2 塌缩链是否已在 A1 的清单里，我未核**（未读该文件正文）。
  请主控去重，不要在 SPEC 里写两遍。
- **S3 项 2（枢纽豁免 FIX）**：`audit-B2.md:6` 的唯一例外「无增量但有子节点挂靠的枢纽节点判 FIX」
  依赖"有子节点"，而 R5 档的 70 个节点正是靠"有 part-of 子"取基的。同一批边同时决定基与豁免资格，
  两条规则的判定输入必须同时刷新（S3 `:127` 已提出这个顺序要求）。
- **P07（`parent` 是否仅指分解关系）**：R1 的定义直接读 `parent`。若 P07 收窄 `parent` 语义
  并因此移除某些 `parent` 值，那些节点会从 R1 掉到 R4/R5，基随之变化。本条文对此免疫
  （六档是优先级表，不是硬编码），但**受影响节点的判决需重跑**。另 5.4 那 3 条缺 `part-of` 边的属 P07。
- **P01（cause 6 入 SPEC）**：死因 6（引文不支撑断言）与死因 5 的判定输入不同——
  5 看基，6 看证据池（T1/T2/T3）。L2 的 24 个节点锚点数为 0、边数为 0，
  意味着它们的证据池 T1=T2=T3=0，**死因 6 对 L2 层不可判**。这一点归 P01 裁，我只登记。
- **停止规则（SPEC `:102`，S3 项 C）**：本条文若使 4.4 的 4 条重跑后存活数变化，
  L2 层"存活 <2 则为天花板"的判定结果可能翻转。现存活 4 条，重跑只会增不会减，
  故天花板判定方向不变；但具体数字要等重跑。

## 顺带发现

每条一行，不展开，不代其它待议项裁定。

- S3 速查表 `:15,:16` 为项 3、4 写了裁决，但 S3 正文只到 §二，这两项**从未写出正文**，请勿当已完成。
- 「恢复基」一词在全实验 `.md` 里只出现 4 次且全部无定义（S3 `:15,:16` + G5-P07 `:366,:367` 转述）。
- SPEC `:33` 的类型表 `concept/method/theorem/notation` 与本轮任务书的
  `concept/theorem/proof-step/example` 只有 2 词重合；实测数据用的是 SPEC 那套
  （concept 258 / theorem 173 / method 69 / notation 22），另 24 个 L2 节点**完全无 `node_type` 字段**。
- `data/nodes-CX2.jsonl` 的 15 个节点未被任何 B 系审计判过，且带 `origin_note` 字段（SPEC 未定义该字段）。
- `data/nodes-X.jsonl` 的 22 个节点带 `divergence` 与 `audit_fix` 字段，SPEC schema（`:83`）均未列出。
- SPEC `:81` 的 members 示例含 `"L2:..."`，但实测 188 个去重 member 中 `L2:` 前缀 **0 个**，示例与现状不符。
- L2 层 24 个节点在 1433 条边里出现 **0 次**，抽象层与 L1 网络之间没有任何边——是否该建边归另项。
- `apostol:` 前缀横跨 inherited 与新增文件（151 个中 inherited 仅 63），按前缀判"是否 L1 底座"会错。
