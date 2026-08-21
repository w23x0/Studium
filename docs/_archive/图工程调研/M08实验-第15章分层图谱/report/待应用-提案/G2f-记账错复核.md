# G2f 两条分片记账错的复核

范围声明：只复核 §4.9（`report/_转交-新会话-workflow.md:293`）列出的两条分片记账错。
全部数字为本轮自行实测（Python `len()` + `in` 子串判定 + 逐行定位），未沿用 A9 的结论，
也未沿用 `check_graph` / `verify_anchors.py` 的输出。**本代理只读，未改 data/。**

## 一 D2 L66（过报判定 / 两个候选子串各自逐字与实测字符数 / 到底 89 还是 100 / 分片该怎么改）

### 1.1 被复核的对象（两处，别搞混）

- 分片正文：`report/审查-形式D-D2-片59-80.md:50–80`，节点 `d:dim-of-a-second-order-de-solution-space-is-two`
  （`data/nodes-D2.jsonl:66`，故简称 L66），分片自评为「本节最实的一例」形式 D。
- 主控核验：`report/_D分片-主控核验.md:484`（塌陷表一行）与 `:525`（附带修正那句）。

### 1.2 源行事实（先摆出来，两个结论都从这里出）

`source/apostol-ch15/15.08.md:15` 实测 **233 字符、n_sentence_end = 4**
（`tmp_index/source-lines.tsv` 中 `apostol-ch15/15.08.md 15 233 4`，本轮另用 `len()` 复核 = 233）。
整行逐字：

```
EXAMPLE 3. The space of solutions of the differential equation $y'' - 2y' - 3y = 0$ has dimension 2. One basis consists of the two functions $u_1(x) = e^{-x}$ , $u_2(x) = e^{3x}$ . Every solution is a linear combination of these two.
```

一行含 4 句，因此**这一处禁止按行号做覆盖比对**（过报通道 b）。

### 1.3 两个候选子串，各自逐字与实测字符数

| 记号 | 逐字子串 | 实测字符数 | `in` 源文 | 命中行 | 当前在图里的身份 |
| --- | --- | --- | --- | --- | --- |
| **A** | `EXAMPLE 3. The space of solutions of the differential equation $y'' - 2y' - 3y = 0$ has dimension 2.` | **100** | True | `15.08.md:15` | `apostol:ext-uncited-dimension-of-a-second-order-de-solution-space` 的锚点 0（`anchors.tsv:587` charlen=100） |
| **B** | `The space of solutions of the differential equation $y'' - 2y' - 3y = 0$ has dimension 2.` | **89** | True | `15.08.md:15` | `data/edges-D2.jsonl:85` 的 `evidence.quote`（`edges.tsv` ev_charlen=89） |
| **C** | `EXAMPLE 7. If $a_1, \ldots, a_n$ are distinct real numbers, the $n$ exponential functions` | **89** | True | `15.07.md:39`（整行 89，即该串就是整行） | 尚未被任何持有者引用 |

**结论：分片的两个数都是对的。** A = 100、C = 89，分片 `:72` 写 100、`:74` 写 89，各指各的串，无误。
A − B = 11，正是句首 `EXAMPLE 3. `（含尾随空格）11 字符。**上一轮的更正成立。**
同一段里出现两个来源不同的 89（B 与 C），这是把 B 的 89 记到 A 头上的成因。
额外一重独立佐证：A 作为另一个节点的既有锚点，`anchors.tsv` 独立测得 charlen=100，
与本轮 `len()` 一致——100 有两个互不依赖的测量来源，89 没有任何来源指向 A。

- 依据：`tmp_index/anchors.tsv:587`、`tmp_index/edges.tsv`（`data/edges-D2.jsonl:85` 行）、
  `tmp_index/source-lines.tsv`（`apostol-ch15/15.08.md` 第 15 行）、本轮 `len()` 实测。
- 死因编号：**0**（记账错，非图谱缺陷）
- 建议动作：**改 `report/_D分片-主控核验.md:525`**，把「实际可引子串是 89 字符」改为
  「实测 100 字符，分片无误；89 是同源行另一子串（`edges-D2.jsonl:85` 的边证据）的长度」。
  同时改 `report/_转交-新会话-workflow.md:293` 里复述这句的 `100 字符、真实子串是 89` 半句。
  **分片文件 `审查-形式D-D2-片59-80.md` 的 `:72`/`:74` 不动。**
- 置信度：高。不确定点：无——两个候选串都已逐字 grep 命中并双测长度。

### 1.4 过报判定

分片 `:57–68` 的指控是「claim 1（维数为 2）与方程本身无锚」。按四层证据池：

| 层 | 条数 | 内容 |
| --- | --- | --- |
| T1 自身锚点 | 1 | 79 字符「One basis consists of the two functions …」 |
| T2 自发边 | 2 | `edges-D2.jsonl:85`（**B，89 字符，含 dimension 2 与方程本身**）、`edges-D2.jsonl:177`（79 字符，与 T1 重复） |
| T3 后代 | 0 | 该节点 `n_partof_desc = 0` |

`exposure.tsv`：`0 / 1 / 2 / 0 / 3 / 2`。**claim 1 的两半（维数 2 + 方程）逐字落在 T2 的 B 串上。**
分片只读 `anchors` 未读边，故报为无锚。指控性质是「引文不支撑断言」= 死因 6，
而死因 6 **因边证据而免除**（死因 1 才不免除）。故 **T2 塌陷，头条指控过报成立。**

**残留（不随头条一起洗掉）**：claim 4「验证独立性恰是 15.07 Example 7，指数 -1 与 3 相异」
在池里**无任何 15.07.md 证据**——池 3 条全在 `15.08.md`。这是一条真缺口，但它是
「跨节调用未锚」，比分片的头条（主命题无锚）轻得多，且分片自己已在 `:74` 给了合规候选 C。

- 依据：`tmp_index/pool.tsv`（该 id 6 行，其中自身 3 行）、`tmp_index/exposure.tsv`、
  `tmp_index/edges.tsv`（`edges-D2.jsonl:85`/`:177`）、`_D分片-主控核验.md:484` 已记为塌陷。
- 死因编号：头条 **0**（记账位置问题，内容在图里，只是挂在边上）；残留 claim 4 记 **6**。
- 建议动作：**分片 `:57–68` 的头条降级**——`审查-形式D-D2-片59-80.md:440` 的
  「形式 D（确认）：锚点只覆盖基，未覆盖 dimension 2 与方程本身」应改为
  「T2 塌陷（`edges-D2.jsonl:85` 已逐字覆盖 dimension 2 与方程），残留仅 claim 4 跨节调用无锚」。
  节点本身 **保留**（`0` KEEP）。
- 置信度：高。不确定点：`edges-D2.jsonl:85` 是 `origin=source`，在 `check_graph` 的 916 条校验范围内，
  不属那 15 条未校验的 model 带 quote 边，故其 89 字符引文可安全当证据。

### 1.5 分片的「补锚」建议要改，理由是冗余度

分片 `:76` 要求把 A（100 字符）加为第一锚点。按「新引入的源行数」度量：
`15.08.md:15` 已经通过 T1（79 字符）和 T2（B，89 字符）两次进池，**加 A 引入的新源行数 = 0**。
且 A 已是 `apostol:ext-uncited-dimension-of-a-second-order-de-solution-space` 的锚点 0，
加进 L66 会直接制造一条 n_holders 从 1 升到 2 的共享引文（锚点盲区 B 型：借用引文）。
79 字符那条本来已经是 3 持有者共享（`shared-quotes.tsv`：`edge:data/edges-D2.jsonl:177` +
上述 ext 节点 + L66 自身），再加 A 会让这两个节点在 `15.08.md:15` 上完全重叠。

- 依据：`tmp_index/shared-quotes.tsv`（79 字符那行 n_holders=3）、`tmp_index/anchors.tsv:587`。
- 死因编号：0
- 建议动作：补锚**只补 C**（`15.07.md:39`，89 字符，唯一能新引入源行的一条，救 claim 4）；
  A 是否补取决于 SPEC 待议项「边的 evidence 能否算作节点的锚点」——**不进 SPEC 前先不补 A**。
- 置信度：中高。不确定点：若 SPEC 最终判定边证据不算锚点，则 A 必须补，
  届时应同时处理它与 ext 节点的共享（本提案不预判该裁决）。

## 二 D3 L31 :125（节点自身锚点逐字 / 分片错在哪 / 该怎么改）

### 2.1 节点自身锚点逐字

节点 `d:norm-positivity-property`（`data/nodes-D3.jsonl:31`，theorem，sections `15.10`，
parent `apostol:theorem-15-9-properties-of-norms`，**锚点数 1**）。
本轮从 `data/nodes-D3.jsonl` 第 31 行 `json.loads` 后直接取 `anchors[0]`：

```
file  = 15.10.md
quote = (b) $\| x\| >0$ if $x\neq O$ (positivity).
```

实测 **42 字符**，`in 15.10.md` = True，**逐行定位唯一命中 `15.10.md:125`，该行整行长度也是 42**
（即该锚点就是整行）。与 `tmp_index/anchors.tsv` 的 charlen=42、
`tmp_index/source-lines.tsv` 的 `apostol-ch15/15.10.md 125 42 1` 三处一致。

**故 `:125` 是该节点已有的唯一锚点（T1），不是缺失锚点。** §4.9 的指控成立。

### 2.2 分片错在哪

错在 `report/审查-形式D-D3-片21-45.md:89` 那一行表格的**第 4 列「本该引而未引」**，
它把 `:22`、`:125`、`:151`、`15.11.md:52` 四项并列，其中 `:125` 属于误列。

值得注意的是：**分片自己的详述段没有错。** 同一份分片 `:259` 的逐条分解里写
「claim (1) 定理 15.9(b)：x≠O 时 ‖x‖>0 [**锚 1 逐字管住，42 字符**]」，
并且建议只是「补锚 `15.10.md:22` 与 `15.10.md:151`」——`:125` 不在补锚清单里。
所以这是**表格与正文自相矛盾**，正文对、表格错，不是审查员判断错，是填表时把
「该节点相关的行号」全塞进了「本该引而未引」列。

另两项经核为真缺口，不要连带改掉：`15.10.md:22` 实测 35 字符（`(x, x) > 0 \quad i f \quad x \neq O`，
n_sentence_end=0）、`15.10.md:151` 实测 195 字符（角的 DEFINITION 那句）。

- 依据：`data/nodes-D3.jsonl:31` 的 `anchors[0]` 实测；`report/审查-形式D-D3-片21-45.md:89` 对比 `:259`；
  `tmp_index/anchors.tsv`、`tmp_index/source-lines.tsv`（`15.10.md` 第 22/125/151 行）。
- 死因编号：**0**（记账错，非图谱缺陷）
- 建议动作：**改 `report/审查-形式D-D3-片21-45.md:89` 的第 4 列**，删掉 `:125`，
  并在该列括注「`:125` 已是该节点唯一锚点，42 字符，不在缺失之列」，其余三项保留、额度 1/3 不变。
  同时改 `report/_D分片-主控核验.md:525` 与 `report/_转交-新会话-workflow.md:293` 里复述这条的半句
  （两处措辞本身是对的，只需在改 L66 那半句时一并核对，不要误改）。
  节点本身 **保留**（`0` KEEP，形式 E 的定性与补锚 `:22`/`:151` 的建议均维持）。
- 置信度：高。不确定点：`15.11.md:52` 那条跨文件缺口本轮未复核（不在本任务范围），按未核处理。

### 2.3 与 D4 那节的对齐

`:125` 这条 42 字符锚点，与主控在 `_D分片-主控核验.md` 论证 D4 修法时实测过的是同一行。
同一行在 D3 表格里被当成「缺失」、在别处被当成「已有」，两处记账必须对齐到「已有」。
（本轮只核了 D3 侧，主控侧那处的行号未逐字复核，按未核处理。）

## 三 这两处记账错反映的系统性问题（各一行，不展开）

- 两处错的方向相反：D2 是**该有的数被换成了别处的数**（100 记成 89），D3 是**已有的东西被列进缺失**——共同点是记账时丢了「这个数/这一行属于谁」，即缺少持有者归属。
- 同一源行出现多个合法子串时（`15.08.md:15` 一行 4 句、A/B 差 11 字符），只写字符数不写逐字串，必然错配；**任何字符数都必须与逐字 quote 同时出现**。
- 只读 `anchors` 的审查员在 T2 通道上系统性过报，只读表格的复核者在自身锚点上系统性误列——两者都是「没查全持有者集合」的同一个病。
- 分片的表格列与正文段可以互相矛盾而无人发现（D3 `:89` vs `:259`），说明汇总表没有从正文机械生成，是二次手填。
- 「补锚」建议缺一道冗余度闸门：分片建议补的 A 串新引入源行数为 0，且会制造共享引文，机器与人都没在建议阶段拦住。

## 顺带发现

- `apostol:ext-uncited-dimension-of-a-second-order-de-solution-space`（`data/nodes-H2.jsonl:10`，origin=model，sections `15.03,15.08`）与 L66 覆盖同一个 Example 3，两锚点（100/79 字符）与 L66 的池完全重叠，疑似重复建节点，未核是否该合并。
- 上条 ext 节点的 sections 写了 `15.03`，但两条锚点都在 `15.08.md`，`15.03` 无锚点支撑——与 §4.9 里 `apostol:zero-element` 的 sections 问题同型，未展开。
- `data/edges-H2.jsonl:18`（L66 `requires` 上述 ext 节点）origin=model 且 evidence 为空，方向是「教材节点 requires 模型自造的未标注出处节点」，语义可疑，未核。
- `15.10.md:22` 实测 35 字符、n_sentence_end=0，属短行间公式，补锚时会撞 SPEC 30–200 地板的待议项（SPECQ §5.2），未展开。
