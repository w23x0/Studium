# G3e H 层总装与缺口

只读装配代理产出。**未改动 data/ 下任何文件。**
输入：同目录 G3a（H1 边 15 条）、G3b（H2 节点 11 个）、G3c（H2 边 19 条）、G3d（跨教材 model 带 quote 边 15 条）。
四份全部齐备，无缺件。设计文档：report/横向-章内辨析.md、横向-跨章回指.md、横向-跨教材差异.md。

## 〇 结论速览（H 层最终：保留 n 条边 m 个节点 / 撤回 / 缺口 k 条）

**H 层边的口径先说清**（三个「H」在数据里分居三处，报数时必须指明范围）：

| 范围 | 现有条数 | 依据 |
| --- | --- | --- |
| H-in（章内辨析） | 15 | `data/edges-H1.jsonl` 全部 |
| H-back（跨章回指） | 19 | `data/edges-H2.jsonl` 全部 |
| H-cross（跨教材，apostol↔strang 直连） | **25** | edges.tsv 全表：edges-X.jsonl:106–128 共 23 条 + edges-X.jsonl:119 已含其中 + `edges-A2-x2.jsonl:21` 1 条 + edges-X.jsonl:105 以下的 `x:` 骨架不计 |
| H 层合计 | **59** | 15 + 19 + 25 |

H-cross 的 25 条 = generalizes 16、contrasts 6、alias-of 3。**注意 24 与 25 的差**：
G3d 与横向-跨教材差异.md 都按「跨教材边 24 条」计，那是只数 `edges-X.jsonl` 的结果；
`edges-A2-x2.jsonl:21`（`apostol:cx-metric-criteria-for-orthogonality --contrasts--> strang:pythagorean-law-orthogonality`）
是一条住在 X 文件之外的跨教材边，两处都漏计了。见 §五。

**最终建议（四份提案合并后）**：

- 边：撤回 **9** 条（H1 4 条 + H2 4 条 + H-cross 1 条），改 **21** 条（H1 7 + H2 5 + H-cross 9），
  原样保留 **29** 条。59 → **50** 条。
- 节点：H2 的 11 个**全部保留**（G3b 撤回清单为空），其中 8 个需 FIX。
- 缺口：设计文档有而图谱无 **4** 条（H-in 0、H-back 1、H-cross 3），
  另有 1 处**无法归因的计数差**（设计文档称 edges-X 162 条，实际 161 条）。
- 可疑新增：图谱有而三份设计文档均未提 **4** 条（3 条 alias-of + 1 条住在 X 文件外的跨教材 contrasts）。
- 交叉悬空：**0 条真悬空**（G3b 不撤任何节点，G3c §四 的依赖表在撤回轴上整体失效），
  但有 **1 处孤点后果**必须处置：G3c 撤 edges-H2:18/19 后，两个 `ext-uncited-*` 节点度归零，而 G3b 保留它们。

置信度：条数与端点核算高（全部来自 tmp_index 逐行 awk）；缺口判定中高（依据设计文档正文与实际边比对，
Strang 侧原文我未通读，只读了设计文档里的逐字引用）；162/161 那处差额**未核出归因**。

## 一 交叉悬空检查与处置

做法：拿 G3c §四 的依赖表（19 条边 → 各自依赖的 H2 节点）去乘 G3b 的撤回清单。

**结论 1：真悬空 0 条。** 依据：G3b §二 撤回清单为**空**（「11 个节点无一建议撤回」）。
G3c §四 表格最后一列「G3b 撤该 H2 节点时的后果」预设了 11 个节点各有被撤的可能，
其中标「必撤」8 处、「FIX 作废，改为撤边」4 处、「撤任一端即必撤」1 处（第 9 行，两端都是 H2）——
**这 13 处后果全部不触发**。死因：0（无死因，只是依赖表的一列失效）。建议动作：保留 G3c 的全部
保留/FIX 判定，不做任何连带撤边。置信度高（两份提案的清单是可直接比对的枚举）。

**结论 2：有 1 处必须处置的孤点后果**（不是悬空，是度归零）。

结论：G3c 撤 `edges-H2.jsonl:18`、`:19` 后，`apostol:ext-uncited-dimension-of-a-second-order-de-solution-space`
与 `apostol:ext-uncited-unit-coordinate-basis-of-vn` 在**全图里各自只剩 0 条边**；而 G3b 不但保留这两个节点，
还给它们排了 FIX（G3b §三 行 10、行 11）。两份提案不矛盾（一撤边、一留节点），但合并后图里会多两个孤立节点。

依据：tmp_index/edges.tsv 全表按 id 反查——这两个 id 各只出现在 1 条边上，正是 edges-H2:18 与 :19
（G3c §四 末段也独立报出同一事实）。G3c 已核过撤边不减它们的池：exposure.tsv 两节点 T1=2/T1=1、T2=T3=0，
被撤的边里它们是 dst，属 TD，本不入池。

死因编号：0（两个节点本身按 G3b 的判定不成立任何死因；孤点是记账形态问题，不是内容错）。

建议动作：**保留节点 + 撤边，接受孤点**，理由三条：
1. 这两个节点承载的是「Apostol 在 15.08 例1/例3 静默借用、无出处」这一**可核实的观察**（横向-跨章回指.md §1.2
   把它列为 15 处借用里最该警惕的 2 处），撤节点会丢掉这个观察，而它在图里没有别的载体；
2. G3c 撤边的理由是**边两端引同一句 15.08 原文**（死因 5，层塌缩），补一条新边只会重犯同一个错——
   除非能找到一条不与节点锚点同源的引文，而 15.08 例1/例3 处**没有第二句**可用（我未在 15.08 找到
   第三句独立表述，标未核尽）；
3. 孤点在本图不违反任何已知硬约束：tmp_index 报「悬空 id 引用 0 处」是指边引用了不存在的 id，
   与「节点无边」是两件事。

不确定点：若 SPEC 后续加入「节点必须至少有一条边」的约束，本处置需回改为「撤节点」。
置信度中高。

**结论 3：G3d 的撤回不产生悬空。** `edges-X.jsonl:107` 删除后，`apostol:euclidean-space` 仍有 21 条边
（edges.tsv 反查：A2-s1/s2/s3、A2-x2、D3、X:50、A1 共 21 条），`strang:orthogonal-vectors` 仍有
`edges-X.jsonl:54`、`:121` 与 `inherited/edges-S1.jsonl:60/61/62`。死因 0，建议动作：照 G3d 执行。置信度高。

## 二 冲突裁决（同一 file:line 被多份提案改动的情形）

**先报机械结论：同一 `file:line` 被两份提案改动的情形，0 处。** 四份提案的作用文件互不相交：
G3a 只动 `data/edges-H1.jsonl`、G3b 只动 `data/nodes-H2.jsonl`、G3c 只动 `data/edges-H2.jsonl`、
G3d 只动 `data/edges-X.jsonl`。依据：四份 §三/§五 修改清单的行号前缀逐条比对。

但有 **4 处内容级冲突**需要裁决，它们不撞行号，撞的是同一条引文、同一处设计意图。

### C1 同一源行同时落到 1 个节点锚点 + 2 条边 evidence（过报通道 c，三重）

结论：G3b 行 7 把 `ext-chapter-12-finite-dependence-definition` 的锚 0 扩成 `15.07.md:17` 整行两句（173 字符），
而 G3c 第 13、14 行把 evidence 也换成**同一条 173 字符整行**。合并后 15.07.md:17 这一行同时是
1 个节点锚点与 2 条边的 evidence。

依据：G3b §三 行 7 行、G3c §三 line 13 / line 14；source-lines.tsv 显示 15.07.md:17 的 `n_sentence_end`=2（一行两句）。

死因：0（两侧各自都合规，无引文错）。

裁决：**两份都执行，但记账口径统一为「新引入源行数」。** 15.07.md:17 这一行在改动前已被
edges-H2:13/14 使用，改后仍是同一行 → **新引入源行数 = 0**。禁止在任何覆盖率/冗余度报告里把
这三处算成 3 条独立证据。另：G3d 的 `:113` evidence 也取自 15.07.md:17（65 字符的后半句），
即这一行实际有 **4 个持有者**，是全图最拥挤的源行之一。置信度高。

### C2 G3d 改 `edges-X.jsonl:108` 的 src，会抹掉设计文档的同名异物陷阱 3.3

结论：G3d §5.3 建议把 `:108` 的 src 由 `apostol:orthogonal-to-a-set` 改为 `apostol:orthogonal-complement`，
理由是后者 id 确实存在且已被 `:122` 引用。但 `:108` 的 evidence 正是横向-跨教材差异.md §3.3 的
Apostol 侧逐字引文（"It is a simple exercise to verify that $S^{\perp}$ is a subspace of V, whether or not S itself is one. In case S is a subspace..."），
而 §3.3 的全部内容就是「Apostol 对**任意子集**取 ⊥、Strang 只对**子空间**定义」——
把 src 换成 `orthogonal-complement`（Apostol 侧专用于子空间的那个名字）恰好消掉这条差异。

依据：横向-跨教材差异.md:206–220（§3.3 全文）；edges.tsv `:108` 现状 src=`apostol:orthogonal-to-a-set`；
nodes.tsv 三个节点并存（`orthogonal-to-a-set` nodes-A2-s2:3、`s-perp-notation` :4、`orthogonal-complement` :5）。

死因：6（若照改，引文将不支撑新断言——引文明说「whether or not S itself is one」，而新 src 只覆盖 is one 的情形）。

裁决：**不采纳 G3d §5.3 的改指，保留 src=`apostol:orthogonal-to-a-set`。** G3d 判「配对本身错」是
按「两边名字要对上」的尺子，但跨教材对齐的价值恰在名字对不上处。建议改为加
`rel_note`「Apostol 侧的 ⊥ 对任意子集有定义，Strang 侧只对子空间定义」。
不确定点：`rel_note` 在非 `other` 关系上是否合法，G3d §5.2 已标「未在 SPEC 找到明文」，此处同标未核。
置信度中高（引文与设计文档的对应是逐字的；我未通读 Strang 4.1 全文）。

### C3 G3d §5.6 建议撤 `edges-X.jsonl:124`，那是设计文档陷阱 3.4 的唯一载体

结论：G3d §5.6 建议在 `(projection-along-an-element, projection-onto-a-line)` 这一对上「保留 generalizes（:111）、
撤回 contrasts（:124）」。但 `:124` 正是横向-跨教材差异.md §3.4 设计的同名异物陷阱——
§3.4 的论点是「同一个公式在两本书里**地位相反**」（Apostol 是被减掉的辅助量，Strang 是整章地基），
这不是一般/特例关系，`generalizes` 表达不了它。

依据：横向-跨教材差异.md:222–236（§3.4 全文，两侧逐字引用俱在）；edges.tsv `:111` generalizes 与 `:124` contrasts 并存。

死因：0（`:124` 无引文，谈不上死因 6；争点是关系词是否择一）。

裁决：**两条并存，不撤 `:124`。** G3d 自己也写「二者不必然互斥」，且把置信度标为中、明确标为「待裁」。
封闭词表没有「一般化 + 地位相反」的单一词；强行择一必然丢掉一半信息。
建议给 `:124` 补 `rel_note` 记录「地位相反」这一辨析点（同 C2 的 rel_note 合法性保留意见）。置信度中高。

### C4 G3a E7 把 edges-H1:7 由 contrasts 改成 requires，会抹掉设计文档 H-in 陷阱 7

结论：G3a E7 建议把 `edges-H1.jsonl:7`（`theorem-15-14-orthonormal-basis-exists || theorem-15-15-orthogonal-decomposition`）
由 `contrasts` 改为 `requires` 并反向。但横向-章内辨析.md 第 7 条设计的辨析点是
「**有限维这个条件加在谁身上**」——15.14 要求整个 V 有限维，15.15 只要求子空间 S 有限维；
误用后果是「判定 15.15 在 C(0,2π) 上不适用」。改成 `requires` 后这条界无处记录。

依据：横向-章内辨析.md:27–28（第 7 条全文）；G3a §三 E7 与 §一 判定表（G3a 判其为「误用（应为 requires）」）。

死因：G3a 判死因 6（引文只讲单侧）；我不反对它对**原引文**的判定，反对的是处置方式。

裁决：**部分采纳。** 采纳 G3a 的换引文（15.14.md:30，96 字符），**但关系词维持 `contrasts`**，
并把 evidence 换成设计文档第 7 条引的那句
`"THEOREM 15.15. ORTHOGONAL DECOMPOSITION THEOREM. Let V be a Euclidean space and let S be a finite-dimensional subspace of V."`
——它一句话里同时给出「V 只要求是欧氏空间」与「finite-dimensional 只挂在 S 上」，是**双侧**引文，正对辨析轴。
**注意：这条 quote 我未实测字符数、未 grep 核过是否单行连续**（设计文档里它是逐字块引用，但可能跨行），
主控采用前必须自核；若跨行则退回 G3a 的原方案（改 requires），并把陷阱 7 记入 §四 缺口。
置信度中（裁决方向有据，具体引文未核）。

## 三 可执行序列（编号步骤，每步动作 / 目标 / 前置条件）

原则：**先改接、再删**。改动一律原地整行替换（不增删行数），删除一律**最后做且按行号倒序**，
避免行号漂移。所有 JSON 行全文见各源提案，本节只给顺序、目标与前置条件，不重抄 JSON。

| 步 | 动作 | 目标（file:line） | 来源提案 | 前置条件 |
| --- | --- | --- | --- | --- |
| 1 | 裁决 `rel_note` 能否出现在非 `other` 关系上，结论写进 SPEC | S2/S3 提案 | 本文 C2/C3、G3d §5.2 | 无。**步 5、10、12 依赖本步** |
| 2 | 自核 C4 提议的新引文是否单行连续、实测字符数 | `source/apostol-ch15/15.14.md` | 本文 C4 | 无。**步 6 依赖本步** |
| 3 | 整行替换 8 个 H2 节点 | `data/nodes-H2.jsonl:1,4,5,6,7,9,10,11` | G3b §三 | 先裁决 G3b 末尾两处口径问题（sections 是否要求条条有锚） |
| 4 | 整行替换 4 条 H1 边（纯换引文） | `data/edges-H1.jsonl:4,8,9,12` | G3a §三 E4/E8/E9/E12 | 无 |
| 5 | 整行替换 2 条 H1 边（origin→model、删 evidence） | `data/edges-H1.jsonl:1,13` | G3a §三 E1/E13 | 步 1（本步不涉 rel_note，但会改 check_graph 分母，须与步 1 一并记账） |
| 6 | 整行替换 `edges-H1.jsonl:7` | `data/edges-H1.jsonl:7` | 本文 C4（部分采纳 G3a E7） | **步 2**。若步 2 判引文跨行 → 改用 G3a E7 原方案并登记缺口 |
| 7 | 整行替换 2 条 H2 边（rel→generalizes） | `data/edges-H2.jsonl:1,7` | G3c §三 line 1 / line 7 | 步 3（节点 statement 已降调，避免边与节点口径冲突）；G3c 已核无反向 is-a 重复边 |
| 8 | 整行替换 3 条 H2 边（纯换引文） | `data/edges-H2.jsonl:10,13,14` | G3c §三 line 10/13/14 | 步 3。line 10 的 `rel_note` 原样保留 |
| 9 | 整行替换 6 条跨教材边（换引文，origin 仍 model） | `data/edges-X.jsonl:109,110,111,112,117,120` | G3d §5.2 | 步 1（`:112`、`:117` 带 `rel_note`）。`:112` 同时改 dst |
| 10 | 整行替换 2 条跨教材边（改关系词） | `data/edges-X.jsonl:115`（→contrasts）、`:116`（→equivalent） | G3d §5.4 | 无。`:116` 改后须重跑对称边去重检查（G3d 已核当前无反向边） |
| 11 | **不执行** G3d §5.3 的 `:108` 改指；改为给 `:108` 加 `rel_note` | `data/edges-X.jsonl:108` | 本文 C2 | 步 1。若步 1 判 `rel_note` 不合法 → 原样不动，说明记入提案 |
| 12 | **不执行** G3d §5.6 的 `:124` 撤回；改为给 `:124` 加 `rel_note` | `data/edges-X.jsonl:124` | 本文 C3 | 步 1。同上退路 |
| 13 | 删除 1 条跨教材边 | `data/edges-X.jsonl:107` | G3d §5.1 | 步 9–12 全部完成（同文件，避免行号漂移） |
| 14 | 删除 4 条 H2 边，**按 19→18→4→3 倒序** | `data/edges-H2.jsonl:19,18,4,3` | G3c §二 | 步 7、8 完成。撤 3/4 前确认 5/6 仍在（T3 上浮的落点） |
| 15 | 删除 4 条 H1 边，**按 15→14→11→6 倒序** | `data/edges-H1.jsonl:15,14,11,6` | G3a §二 | 步 4–6 完成 |
| 16 | 接受两个 `ext-uncited-*` 节点成为孤点，或按 §一 结论 2 的不确定点回改 | `data/nodes-H2.jsonl:10,11` | 本文 §一 结论 2 | 步 14 完成 |
| 17 | 重跑 `check_graph`，核对计数 | — | — | 步 1–16 全部完成 |

**步 17 的预期计数**（合并四份提案后，我按各提案自报值相加，未实跑）：

- 全图边 1433 → **1424**（删 H1 4 + H2 4 + X 1 = 9 条；C3 不撤 `:124` 故不再 −1）
- H1 15 → 11；H2 19 → 15；H-cross 25 → 24
- 带 evidence 的边 931 → **928**（−1 删 `:107`；−2 因 E1/E13 转 model 删 evidence）
- `check_graph` 的「已校验引文」916 → **914**（E1、E13 转 model；这是**记账下降，不是质量下降**）
- H-cross 关系词分布：generalizes 16 → 14（删 `:107`、`:116` 转 equivalent）、
  contrasts 6 → 7（`:115` 转入）、equivalent 0 → 1、alias-of 3 不变
- 冗余度按「新引入源行数」计：G3a +3 行（15.11.md:5、15.14.md:36、15.06.md:29），
  G3b/G3c 在 15.07.md:17 上 **+0 行**，G3d 换引文的 6 条我未逐条算新增源行数，**标未核**。

不确定点：以上计数是四份提案自报值的算术合并，我未实跑 `check_graph`。
若步 6 走退路（C4 改回 requires），H1 的 contrasts 计数会再 −1。

## 四 设计文档有、图谱无（缺口清单，按 H-in / H-back / H-cross 分组）

方法：把三份设计文档正文里**逐条设计出来的对齐/辨析项**与 tmp_index/edges.tsv 里实际存在的边
按端点对比。设计文档自己声明「刻意不建」的条目**不算缺口**（那是已披露的截断，不是遗漏），
但我把它们的位置写出来，供主控核对声明是否与数据一致。

### H-in（章内辨析）：缺口 0

结论：横向-章内辨析.md 设计 15 条 `contrasts`，图谱 `data/edges-H1.jsonl` 有 15 条，
**15 对端点逐条一一对应，无一缺失、无一错配**（顺序也一致）。

依据：edges.tsv 过滤 edges-H1 的 15 行 src/dst，与设计文档第 1–15 条的粗体 id 对逐条比对。
文档 §被否决的候选对 列出 13 对**主动否决**的候选（每对都写了否决理由），按上述口径不算缺口。

死因 0 / 建议动作：保留现状（内容改动见 §三）/ 置信度高。

### H-back（跨章回指）：缺口 1

结论：横向-跨章回指.md §1.1 借用点 **#1** 里的**第12–13章几何词汇**在图谱里没有任何载体。
该条原文写「$V_n$ 这个对象本身，及例4中的正交/法向量/过 O 的直线与平面等第12–13章几何词汇」——
前半（$V_n$ 对象）由 `apostol:ext-vn-as-a-prior-vector-space` 承载，后半（几何词汇）
既不在该节点的 statement/anchors 里（其 statement 只讲「V_n 是既有对象、第15章不构造不验证公理」），
也不在 §1.3 声明的「三处刻意不建节点」名单内（那三处是 15.07 例子、15.10 点积公式定义、15.10 长度角度纲领）。

依据：横向-跨章回指.md:27（借用点 #1）与 :52–57（§1.3 名单）；G3b §三 行 6 的节点全文（statement 无几何词汇）；
edges.tsv 全表无任何 src/dst 涉及正交/法向量/直线平面的 ext 节点（awk 过滤 `:ext-` 共 11 个 id，逐个看过 name_en）。
另注：G3b 行 6 还建议把该节点 sections 里的 15.07、15.10 删掉，改后覆盖面更窄，缺口更明确。

死因：0（不是错，是漏；也可能是设计文档漏写「刻意不建」的第四处）。

建议动作：**不进 SPEC，作为缺口登记**；具体处置二选一由主控定——
(i) 补一条 origin_note 说明「例4 的几何词汇归第13章，本实验不建节点」，把它并入 §1.3 名单（成本最低）；
(ii) 新建一个 ext 节点。我倾向 (i)：15.03 例4 的几何词汇是**阅读脚手架**，
按文档 §2.2 的判据属「记号/对象沿用」而非证明外包，逻辑上第15章不缺理由。

置信度中高。不确定点：我未逐字回读 15.03.md 例4，无法断定那些词汇是否真的「未定义即用」——
这一点只依赖设计文档的说法。

**另核过、判不是缺口的两处**（写出来免得后续代理重报）：
- §2.1 那条最锋利的链条（维数良定义 ← 15.6 ← 15.5 ← 第12章）在图里**有**记录，
  但挂在 `apostol:theorem-15-6` 的 part-of 子节点上（`d:thm-15-6-apply-theorem-15-5-to-the-first-basis`
  与 `d:thm-15-6-symmetry-step-requires-t-to-span` 各有一条 `requires apostol:theorem-15-5`，
  见 edges-D2:67、:74；partof.tsv:68 确认二者是 15-6 的子节点）。这是过报通道 (a) 的**正当**形态：
  内容合法下移，父节点无需自己发边。同理 15.11 对 15.7(b) 的继承挂在
  `d:15-10-n-orthogonal-nonzero-elements-form-a-basis`（edges-D3:142）。
- §1.4 六处「向读者委派」与 §3.5 的不对称/推断，文档均明确声明不入图，一致。

### H-cross（跨教材）：缺口 3 + 1 处无法归因的计数差

**缺口 X-1：同名异物陷阱 §3.3（$S^{\perp}$ 任意子集 vs 只对子空间）没有 contrasts 边。**
结论：横向-跨教材差异.md §3.3 是六个陷阱之一，两侧逐字引用俱在，但图里
`apostol:orthogonal-to-a-set`↔`strang:orthogonal-complement` 之间只有 `edges-X.jsonl:108` 一条 `generalizes`，
没有任何 contrasts 边表达「适用范围不同」这条界。对比其余五个陷阱都有专属 contrasts 边
（3.1→`:123`、3.2→`:122`、3.4→`:124`、3.5→`:125`；3.6 见下），本条是六缺二里的一条。
依据：edges.tsv 过滤 apostol↔strang 的 contrasts 共 6 条（`:119`、`:122`、`:123`、`:124`、`:125`、`edges-A2-x2:21`），
无一条端点涉及 `orthogonal-to-a-set` 或 `s-perp-notation`。
死因：0。建议动作：**新增 1 条 `apostol:orthogonal-to-a-set --contrasts--> strang:orthogonal-complement`**，
或按 §二 C2 的裁决给 `:108` 补 `rel_note`（二者择一，我倾向后者——`:108` 的 evidence 已是该陷阱的原文，
新增边会与它抢同一条引文，构成 B 型借用）。置信度中高。

**缺口 X-2：同名异物陷阱 §3.6（basis 集合 vs 序列）没有对应边。**
结论：§3.6 的辨析轴是「Apostol 要集合、Strang 要序列」，图里
`apostol:finite-basis`↔`strang:basis` 之间只有 `edges-X.jsonl:118` 一条 `generalizes`，
而 G3d §5.5 自己就注明 `:118`「一般化的是环境空间而非基的势」——即 `:118` 与 §3.6 的轴无关。
`:123`（`apostol:orthogonal-set contrasts strang:basis`）承载的是陷阱 3.1，不是 3.6。
依据：edges.tsv 过滤 dst=`strang:basis` 或 src=`apostol:finite-basis` 的跨教材边，只有 `:118`、`:123` 两条。
死因：0。建议动作：**新增 1 条 `apostol:finite-basis --contrasts--> strang:basis`**，
引文可用 §3.6 两侧已有的逐字块（Apostol 侧 15.08 定义句、Strang 侧 3.4 定义句）——
但 `evidence` 全图是单个 dict，装不下双侧（G3d 顺带发现已指出），只能单侧，
落地时会重犯 G3d 批评的「单侧引文支撑不了跨教材断言」。**因此建议先裁决 evidence 是否扩成数组**，
再决定这条边补不补。置信度中高。

**缺口 X-3：Gram-Schmidt 在两书中「必需品 vs 加速器」这一结论（§4.3）无边承载。**
结论：横向-跨教材差异.md §4.3 把它称为「本次跨教材对齐里最干净的一处『抽象的代价』」，
但 §5.1 同时声明因 manifest 无 `strang:gram-schmidt` 类 id 而**放弃建节点**。
按本节口径这属「已声明的截断」，本不该算缺口——**我仍列出，因为文档自己给了它最高的评价，
而 §5.1 的理由（造 id 是最严重缺陷）只挡住了「新建 Strang 节点」，没挡住
「用已有的 `strang:normal-equation` / `strang:projection-onto-a-subspace` 作对齐端点」这条路。**
依据：横向-跨教材差异.md:302–313（§4.3）与 :317–319（§5.1）；edges.tsv 无任何 src/dst 含 `gram-schmidt` 的跨教材边
（Apostol 侧 `apostol:theorem-15-13-orthogonalization-theorem` 的边全部在章内）。
死因：0。建议动作：**登记为缺口，不建议本轮补边**——补边需要 Strang 4.3/4.4 的 anchor，
而那超出 manifest 覆盖的 3.3–3.5/4.1–4.2，属越界取证。置信度中。

**计数差（未核出归因）：设计文档称 `data/edges-X.jsonl` 有 162 条对齐边，实际 161 条。**
结论：横向-跨教材差异.md:7 写「`data/edges-X.jsonl`(162 条对齐边)」，
而 tmp_index/edges.tsv 里 edges-X 的行号是连续的 1–161，共 161 行，**缺的是第 162 行**。
依据：awk 提取 edges-X 全部行号后 `seq 1 162` 求差集，唯一缺号为 162（即末行之后）。
死因：**未判**——两种解释我都无法排除：(i) 文档把文件末尾空行数进去了（差 1 且恰好在末尾，最像这个）；
(ii) 确有一条设计好的边未写入。
建议动作：**登记为待核**，主控可直接看 `data/edges-X.jsonl` 是否以空行结尾即可定案（我不读 data/ 原文件，按只读纪律走索引）。
置信度：差额本身高（可复算），归因**未核**。

## 五 图谱有、设计文档无（可疑新增清单）

<!--BLOCK-5-->

## 顺带发现

<!--BLOCK-6-->
