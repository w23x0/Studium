# C2-02 装配片 · G2a–G2c 节点改写

范围：`G2a-9节点合并复核.md` / `G2b-十条公理FIX.md` / `G2c-例子节点重写.md`。
三份原文均已回查（16566 / 21208 / 23400 字符）。本片含一处提案间硬冲突，已裁。

## 主体

### 1（G2a）恢复 `d:ten-axioms-listed-in-three-groups` 的 KILL —— 采纳
目标：`data/nodes-D1.jsonl:5`。主张 5→3 不成立、应为 5→4，死因 5 维持。
理由：放行前提「三个 L1 分组节点会失去唯一汇聚父节点」被两张索引表独立证伪 —— `tmp_index/edges.tsv` 显示三节点各有第二条 `part-of`：`data/inherited/edges-A1.jsonl:1/2/3 --> apostol:linear-space`（B2=KEEP，不随本节点删除），`partof.tsv` 另记 `apostol:linear-space` 的 17 个子节点已含这三个。裸删不产生孤儿。

### 2（G2a）执行方式：三条边送墓地、**不改指** —— 采纳
目标：`data/edges-D1.jsonl:10/11/12`。随节点一并进墓地。
理由：改指 `apostol:linear-space` 会造出与 `inherited/edges-A1.jsonl:1/2/3` 重复的三条边；ADJ2/待应用清单 §2.1 的「先改指再删」前置随前提证伪而失效。

### 3（G2a）引文损失登记 —— 采纳（记账，非阻塞）
`15.01.md` 的 54 字符锚点 `We turn now to a detailed description of these axioms.` 本节点是唯一持有者（`shared-quotes.tsv` 无此行、`anchors.tsv` 全表 1 次），删则该句离开全图。
可接受：G2b §四 独立核出同源行 `15.01.md:5` 的另一句（`Briefly, a linear space is a set of elements of any kind …`，150 字符）仍被 `apostol:linear-space` 持有，源行不脱图；且 G2b 自认这条锚点「一句都不管」。163 字符那条有 3 个持有者，不损失。

### 4（G2a）`x:least-squares-is-a-projection` 维持放掉（FIX 不删）—— 采纳
目标：`data/nodes-X.jsonl:20`。死因 5 撤回、另立死因 6 成立，按 `G2d-裁定员缺陷.md` §F2 换 1 锚 + 增 1 锚 + 补 `sections` 为 `["15.14","15.15","4.1"]`。
理由：放行只靠 ADJ1 的孤本论证（全库正则 `no solution|unsolvable|not solvable|salvage|outside the column space|overdetermined`，另一命中 `data/nodes-D3.jsonl:43` 语境无关）。ADJ2 的悬空边论证无效：`edges-X.jsonl:93–97` 五条 `is-a` 均以本节点为 dst，属 TD 不入池。装配时必须按此理由登记，不得写成 ADJ2 论证。

### 5（G2a）A1 提案 §1 表末「三条维持的 KILL」改**四条** —— 采纳（记账）
增列 `d:ten-axioms-listed-in-three-groups`（`data/nodes-D1.jsonl:5`），与既有三条 `nodes-D1.jsonl:46 / :60 / :71` 并列，并纳入 A1 §2.1 互证扫描：其 reason 点名的 `apostol:closure-axioms` / `axioms-for-addition` / `axioms-for-multiplication-by-numbers` / `apostol:linear-space` 四者全 KEEP，不塌缩。

### 6（G2a）A1 的 22 id 表本身不改 —— 采纳（确认不动）
该表定义为「29 条 KILL 减 9 个争议节点」，两个争议节点从不在 22 条内，恢复 KILL 不把它挪进表。

### 7（G2a）`d:example-1-verification-is-the-field-axioms-of-r` 的强制前置 —— 采纳
目标：`data/nodes-D1.jsonl:46`。保留 KILL，但十条「公理 ↔ R 的算术律」映射表须先并入 parent `d:example-1-the-real-numbers-form-a-linear-space`（KEEP），不可裸删。其余 2 条维持的 KILL 零残留，可直接执行。

### 8（G2b）175 字符实测更正 —— 采纳（记账，独立于已作废的 FIX）
`15.02.md:9` 的 `AXIOM 2. CLOSURE UNDER MULTIPLICATION BY REAL NUMBERS. …` 实测 **175 字符**（`awk` 行长与 Python `len()` 两法一致，`anchors.tsv` 与 `shared-quotes.tsv:39` 的 charlen 列亦为 175）；任务书的 175 对，**170 是错的**。此更正与本节点是否存活无关，保留。

### 9（G2c）FIX `d:an-example-is-a-set-plus-two-explicit-operations` —— 采纳
目标：`data/nodes-D1.jsonl:42` 整行替换（改写行单行 1376 字符，已 `json.loads` 往返验证、不含换行）。四字段动、其余逐字不变：
- `statement` 437 → **405** 字符，6 子句（C5.1–C5.6）→ 4 子句（N1–N4）。
- `anchors` 1 → **3** 条，全部 `15.03.md`，实测 **138 / 160 / 146** 字符，均 30–200 内；新增两条命中 `15.03.md:13`（函数空间前言加法定义）与 `:19`（数乘定义），`in text` 均 True。
- `atomic_reason`：`单一方法条款:三项数据缺一不可,无可再分。` → `单一方法条款:供给集合与两条运算规则,不可再分。`
- `audit_fix`：`audit-A4a` → `audit-A4a; G2c-rewrite`
- 边全不动：`edges-D1.jsonl:101/102/103/104` 及 TD 边 `:110/:123`。
理由：死因 1 与 ADJ3 查出的 C5.3 为假两者同时消除（删 `must` 必要性与 `which is why` 因果断言）；新引入源行 2 行（`15.03.md:13`、`:19`），是真冗余增益而非过报通道 (c)。改写后无 E 型。置信度 0.85。

### 10（G2c）207 字符候选锚点及三个截短版全部弃用 —— 采纳
`15.06.md:9` 那条实测 207 字符（超 SPEC 200 上界 7 字符）；T-192/T-166/T-133 三版虽合规也不用。
理由：射程错配 —— 15.06 主语是环境空间 V 的子集 S，本节点 `sections=["15.03"]`，用它须扩定义域，超出重挂锚点范围。全图无 207 字符既有锚点或边证据，该条只是候选，非在册数据。

### 11（G2c）两处偏离/待裁，随第 9 条一并登记 —— 采纳（附待裁）
（a）与待应用清单 §2.2「保留末句普查表」有偏离：G2c 删了三桶枚举（C5.4/C5.5 可在 `nodes-D1.jsonl:45/48/51/54` 复得），只留第三桶并上两条锚点。实质保住了唯一不可复得内容 C5.6，但字面与主控要求不符，**须主控确认**（我未读 §2.2 原文，标未复核）。
（b）是否显式写 `Examples 5 to 12`：现三条 quote 均不含 `EXAMPLE 5`/`EXAMPLE 12`，补第 4 条锚点又超 3 条上限。G2c 选择写 `the examples that follow it` 使辖域与 quote 重合，判不命中 D 型。**待主控裁**。

## 落选项

- **G2b 全篇 FIX 方案** —— 主张 `d:ten-axioms-listed-in-three-groups` 由 KILL 改 FIX、就地替换 `nodes-D1.jsonl:5`（statement 补 `(Axioms 1 and 2)`/`(Axioms 3 to 6)`/`(Axioms 7 to 10)` 共 225 字符、锚点 2→3 条 163/175/36、重写 `atomic_reason`）。落选：整篇载重前提是 §五 依据三「它是三个 L1 分组节点唯一的汇聚父节点」，该前提被第 1 条的双表证据证伪（G2b 只查了 `partof.tsv:102` 本节点的子边，未查三个分组节点的全部出边）；其 §五 依据二「2/4/4 有增量」G2b 自认「可从三个 L1 兄弟重新导出，这点翻不动」，按四层池属 T3，T3 塌陷说明内容合法下移，不救命。
- **G2b 的行长/行数实测更正（1495 字节、D1 层 18 行同带两字段）** —— 均是已作废改写行的内部数值，随 FIX 落选一并失效，不入执行条目。
- **G2b 标记「`S3-SPEC-关系词与审计程序.md:177` 的『信息含量确实为零』已过期」** —— 该标记以 FIX 成立为前提；KILL 恢复后该表述与裁决一致，不需回改。
- **G2b「FIX 之后不执行三条改指」的记账结论** —— 结论方向与第 2 条同（都不改指），但理由与动作不同（G2b 是边留在原位，第 2 条是随节点进墓地），按第 2 条执行，G2b 版本不入册。
- **G2c 为 C5.2 另建 `sections=["15.02","15.03"]` 新节点** —— 「缺任一运算则公理无所指」为真但删除后全图无承担者；G2c 自陈未核 15.02 是否有可引整句。移出本轮，缺证据。
- **G2c 的 #0+#1 退路（否掉 146 字符 #2）** —— 会使 N4 降为无锚、N2 的 `both rules` 降为部分，立刻新造一个 E 型 + 一个 D 型。提案自己不推荐，落选。
- **G2c 顺带发现三条** —— `15.03.md:19` 的 148 字符未用整句（备用锚位）、`d:function-space-addition-lives-on-the-intersection-of-domains` 的 68 字符 EXAMPLE 9 锚点疑似挂错、`edges-D1.jsonl:102/:103` 无证据 model 边。均属线索未展开，移出本轮。
- **2/4/4 是否先并入 `apostol:linear-space` 再删** —— G2a 列为不确定点（B2 未要求并入，但第 7 条给了「先并入 parent 再删」的先例）。需读待应用清单，本片**未复核**，移出本轮待裁。

**本片未覆盖**：G2a §二 三条维持 KILL 的逐条 reason 原文我只核到判决列（KEEP/KILL）与 `nodes-D1.jsonl:46/60/71` 行号，未独立复跑 `grep '"id": "<id>," report/*-verdicts.jsonl`；G2d §F2 的具体换锚内容不在本片输入内，第 4 条按引用登记、未验其锚点字符数。
