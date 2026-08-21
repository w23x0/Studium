# 装配片 C3-03 · P07 / P08 / P09

## 主体

**A 落点冲突（装配级，须先裁）** 三份提案共争 `SPEC.md:65`（旧文逐字「`parent` / `atomic` / `atomic_reason` 仅 `d:` 节点必填。」）：P07 §3 修改点 1 **整行替换**，P08 改动 2 与 P09 §3.1 均在其**之后**插入。**采纳 P07 §6 的硬排序**：先 P07（`:65` 换成 `### parent 字段（单义：仅 part-of；且是派生冗余字段）`，`:66` 空行保留）→ P08 origin 小节 → P09 `## sections 语义(出处,非相关性)`。另：P07 路线甲要把该旧句改成「仅 `d:` 节点可填，且有 part-of 父时必填」，装配时须同步更新 P08/P09 的旧文对照栏。

**B1**（P07）`parent` 单义化为 part-of、降格派生冗余字段，语义以边为准。**采纳**。实测 287 个带 `parent` 节点：一致 284、冲突 **0**、有 `parent` 无 part-of 边 **3**、悬空 **0**。
**B2**（P07）`SPEC.md:75` 行尾追加续行「`part-of` 边是分解关系的**唯一权威记录**；节点的 `parent` 字段是它的冗余投影，删边必须同步清 `parent`，改指必须同步改 `parent`。」**采纳**，不改原句、无落点冲突。
**B3**（P07）四条机器校验（非空 ⇔ `d:`；不悬空；存在 `src=该节点∧rel=part-of∧dst=parent` 的边；part-of 出边恰 1 条）。**改后采纳**：条文入 SPEC，第 1 条 ⇔ 在路线甲下放宽为 ⇒；`check_graph.py` 实装另立任务（全文无 `parent` 字样）。
**B4**（P07）三个例外**采纳路线甲**（`parent` 留空 + `atomic_reason` 写「无 part-of 父，与 <id> 的关系是 is-a，见边」+ 各补 1 条 `is-a` 边）：`d:cauchy-schwarz-for-integrals`（nodes-D3.jsonl:27）、`d:exponential-weight-makes-improper-integral-converge`（:22）、`d:trigonometric-orthogonal-system`（:49）。
**B5**（P07）影响面：合规变违规 **3**、反向 **0**、保持合规 **284**、无 `parent` **259**、须改边 **0**（分母 546 = 522 + 24 L2）。**采纳**。

**C1**（P08）节点可带 `origin`，取值封闭 `source`/`model`/`mixed`，与边的 `origin` 同名不同义。**采纳**。R1 违规 **0**（现存 model 24 / source 9），`mixed` 纯新增。
**C2**（P08）`origin` 与 `origin_note` **双向**绑定（S2 只写单向）。**采纳**。R2（`model`/`mixed` 无 note）= **10**：`data/nodes-D1.jsonl:23` 加 `data/nodes-D4.jsonl` 的 `:15/:19/:20/:23/:27/:28/:40/:43/:44`；R3（有 note 无 `origin`）= **16**。
**C3**（P08）须改总数 **60** 而非 S2 的 49（`10+16+49−15=60`；差额 11 = R2 的 10 + `nodes-D2.jsonl:9`）。**采纳该更正**。
**C4**（P08）改动 1：`SPEC.md:55` 原地改写为两行，补指针并当场消歧。**采纳**——唯一不争 `:65` 的改动，可独立落笔。
**C5**（P08）改动 3：`SPEC.md:100` 死因表补「`6` 引文不支撑断言(含漏标节点级 `origin`)」。**改后采纳**：硬依赖 cause 6 入 SPEC，否则条文中「漏标 `origin` 判死因 `6`」须改判 FIX。
**C6**（P08）导出侧可见性款（`model`/`mixed` 时 `## 陈述` 带可见标记，`## 来源说明` 紧随 `## 陈述`、排在 `## 原文锚点` 前）。**改后采纳**：条文收，`export_obsidian.py:161–162/:183–184/:229–230` 实装另立任务。
**C7**（P08）§5.1 边界款「`origin: source` 只声明 statement 每句有原文承载，不声明那段原文就是该对象本身的原始表述」。**采纳**，接双向绑定款后。
**C8**（P08）S2 习题问法数值更正（`15.12-exercises.md` 的 `show that` 实测 **0**、S2 记 13；`15.16-exercises.md` 实测 **2**、S2 记 4）。**采纳为记账更正**，不入条文。



**D1**（P09）取语义 A，新增独立小节。**采纳**：SPEC 只在 `:62`、`:84` 两处把 `sections` 当示例键用，从无定义。
**D2**（P09）正向硬校验 + 归一化（去 `.md`、去 `-exercises`）+「修复方向由审计定，不得默认补 `sections`」，三句不可分拆。**采纳**。违规 **12**；抽查 4 例中 2 例该补 `sections`、2 例该动锚点（`d:ten-axioms-listed-in-three-groups` 多出的 `15.01.md` 54 字符锚逐字 `We turn now to a detailed description of these axioms.`，该删锚点）。**未核**：余 8 例提案自标未逐条读原文。
**D3**（P09）反向规则只作审计项，见证取 T1∪T2、排除 T3。**采纳**。22 → 放宽后 **20**；T3 故意不救的 2 个是 `apostol:spanning-set` 的 15.08、`apostol:projection-on-a-subspace` 的 15.15。
**D4**（P09）溢出条款（非 L2 且 `sections`>3 须写 `sections_note`）。**采纳**。`sections`>3 共 16 个，15 个 L2 豁免；唯一非 L2 触发者 `apostol:ext-vn-as-a-prior-vector-space`（`nodes-H2.jsonl:6`，`sections=15.03,15.06,15.07,15.10`，`n_anchors=2`）。
**D5**（P09）`SPEC.md:87` 后追加 L2 附注一行、`:93` 审计 A 续行后追加「并逐句核 `statement`…（机器查不出的第三类）」。**采纳**，纯新增、0 删 0 改写。
**D6**（P09）S2 总览表项 4 落点 `SPEC.md:59–65` 有误（范围内无一行需改，只能新增小节）。**采纳该更正**。
**D7**（P09）合计正向 12 + 反向 22、交集 2、并集 32（放宽后 30），占 518 的 6.2%；`apostol:zero-element` 不在其中，归 G2e。**采纳**；「需补 `sections` 约 10 个」系抽查外推，**未复核**。

## 落选项

- P07 §5.1：`d:example-2-the-complex-numbers-with-real-scalars` 上 `is-a`（edges-D1.jsonl:113）与 `part-of`（:114）同 (src,dst) 共存 —— **移出本轮**，提案自述属 S3 地界、本身未裁。
- P07 §5.4：禁 `parent` 指向 `L2:` —— **不采纳**，当前 0 例，提案明确不写进条文。
- P07 §4.3 路线乙：补 3 条 part-of 让 `parent` 自洽 —— **不采纳**，这三条 part-of 是伪造关系词，且 `apostol:orthogonal-set` 的 T3 池 2→9（+7），凭空放宽 cause 6 门槛。
- P08 §5.2：`mixed` 粒度判据「按是否引入新数学内容判」—— **移出本轮**，提案自己不写进正式条文。
- P08 §5.3：24 个 L2 的 statement 是否含具体数学断言 —— **移出本轮**，提案标注未逐个核，无数可装。
- P09 §5.2：「同一命题第二实例」记 `sections` 还是记边 —— **移出本轮**，提案自标中置信，与 S3 项 2 的「57 个」耦合未裁。
- P09 §5.3：`ext:` 节点 `sections` 语义天然偏语义 B —— **移出本轮**，提案自认靠 `sections_note` 打补丁「是妥协不是解决」。

**本片未覆盖**：三份提案第六节的其余耦合项（cause 0、T2/T3 池定义、锚点上限 3、`verify_anchors.py` 口径、边 `evidence` 能否当节点锚点、`apostol:ext-` 命名空间）只登记不裁。
