# _frag-C6：data/ 改完之后必须重跑的检查

取证范围：只做了两步（列 `tools/` 文件名；对 6 个校验类脚本各读开头 40 行）。
40 行以外的内容、`report/待应用-提案/` 下任何提案，本片都没读。凡下文标「未复核」的，
落笔前必须回查提案原文对应小节。

## 主体

### 1. `tools/verify_anchors.py`
- 输入：`python verify_anchors.py <nodes.jsonl> <source_dir> [更多 source_dir]`。位置参数，**一次只吃一个 nodes 文件**。
- 判错：每条 anchor 的 `quote` 必须在其 `file` 命名的源文件中**逐字连续**出现；不满足即计入 failures（记 id / file / quote）。另单独统计「无锚点节点」与 `bad_json`。
- 何时重跑：任何 nodes 文件的 `anchors`（quote 或 file 字段）或 `statement` 之外的锚点结构被改动后，对**该文件**重跑；换源文件（`source/` 下 .md）后对全部 14 个 nodes 文件重跑。
- 通过判据：脚本自述「这是本实验唯一的硬校验，只判断这句话是否真的在书里」。ok/total 与退出码的具体口径在 40 行之外，**脚本未声明（首 40 行内）**；`verify_anchors.py` 判失败的范围本身有提案在争（`G5-P06-verify_anchors.py 判失败范围.md`），**未复核**。

### 2. `tools/check_graph.py`
- 输入：`--nodes data/nodes-*.jsonl --edges data/edges-*.jsonl --source source/apostol-ch15 [source/strang-ch3 ...]`。
- 判错（docstring 四项）：id 唯一性、边端点可解析、边 `evidence` 逐字校验、词表封闭。词表在文件里写死：`REL_VOCAB` 10 个（is-a / part-of / requires / implies / equivalent / contrasts / applies-to / generalizes / alias-of / other），`SYMMETRIC` 3 个（equivalent / contrasts / alias-of），`NODE_TYPES` 4 个（concept / method / theorem / notation）。
- 何时重跑：**改任何 nodes 或 edges 文件之后都要重跑**（它是唯一覆盖边一侧和跨文件全局一致性的检查器）。新增关系词、新增节点 type、删节点（会让边悬空）尤其必跑。
- 通过判据：4 类问题均为 0。退出码语义在 40 行之外，**脚本未声明（首 40 行内）**。

### 3. `tools/check_layer.py`
- 输入：`--layer 2 --candidates data/structures-L2-*.jsonl --nodes <节点池，含 data/inherited/nodes-A1.jsonl 等> [--lower ...]`。
- 判错（docstring 明列 9 项）：`ID_DUP`、`ID_PREFIX`（id 前缀与 --layer 不符）、`MISSING_FIELD`（9 个必填字段 id/name_zh/name_en/layer/statement/members/boundary/abstraction_gain/sections 缺失或为空）、`LAYER_MISMATCH`、`FEW_MEMBERS`（成员 < 3）、`DANGLING_MEMBER`（成员 id 不在节点池）、`DUP_MEMBER`、`FEW_SECTIONS`（sections < 2）、`SELF_MEMBER`。
- 不算错误、仅报告：单层取材集中度（阈值 0.85）、候选间成员重叠（Jaccard ≥ 0.5）。
- 何时重跑：改 `data/structures-L2-a/b/c.jsonl` 之后；**以及删任何 L1 节点之后**——节点池缩小会把 L2 成员变成 `DANGLING_MEMBER`。
- 通过判据：9 类错误为 0；两项报告项非 0 不算失败。

### 4. `tools/check_shared_quotes.py`
- 输入：`--nodes ... --edges ...（含 inherited）[--min 2] [--strict] [--out report/shared-quotes.md]`。
- 判错：列出被 >1 个节点或边共用的 (file, quote) 组。脚本自述只覆盖 A3 分类里的**形式 B（借用引文）**，形式 A/C 不可机械化；**非 0 计数是预期的，不算失败，退出码保持 0，除非传 `--strict`**。
- 何时重跑：改动 anchors/evidence 的 quote 文本之后（含把某节点的锚点换成别人的、或新增借用锚点）。
- 通过判据：脚本明说不是 gate；只能人工读输出。A3 手查 11 组、9 合法 2 漂移这一数字来自本脚本 docstring，非提案，可引；若要重述漂移结论仍需回查提案，**未复核**。

### 5. `tools/check_unanchored_numbers.py`
- 输入：nodes（`statement` 里的数字 token 与该节点自身 anchor quote 比对）。
- 判错：statement 中出现、但在该节点任何锚点引文中都找不到的数值 token。过滤器 `REFWORDS`（axiom/theorem/exercise/example/section/chapter/... 共 20 个词）+ `LOOKBACK 44` 字符用来排除书内编号回指。
- 何时重跑：改动任何 nodes 的 `statement` 数值或其锚点之后。
- 通过判据：**没有通过判据**。脚本明写「Exit code is 0 regardless of findings; this is a report, not a gate」，且「deliberately a triage tool, not a verdict tool」，会过报，输出是给人读的。

### 6. `tools/audit_coverage.py`
- 输入：**硬编码相对路径**，无 CLI 参数：`data/nodes-*.jsonl`、`data/inherited/nodes-*.jsonl`、`data/edges-*.jsonl`、`data/inherited/edges-*.jsonl`，加 `report/audit-A1-verdicts.jsonl`、`audit-A2-verdicts.jsonl`、`audit-B-verdicts.jsonl`。→ 必须在实验根目录下跑。
- 判错：不判错，只报覆盖形状——节点/边总数、每文件计数、按源文件分的 A/noA、B/noB 覆盖表，以及 orphan（裁定里有、图里没有的 id）。docstring 自述还报 Audit B 的 KILL 爆炸半径。
- 何时重跑：删/加节点或边之后（会改 orphan 与分母）；以及新增或改写任一 verdicts.jsonl 之后。
- 通过判据：**脚本未声明**（是报表）。orphan 非空是最接近「异常」的信号，但脚本未把它定义为失败。

### 7. 本轮已知会变动的数据文件 → 需重跑的检查器
清单本身**未复核**：具体哪些文件在本轮被改，写在 `report/待应用-提案/` 各提案与 `report/待应用清单-v2.md` 里，本片按硬约束没读。下表是**按文件类别**的映射，依据是上面 6 个脚本自己声明的输入，可直接引用：

| 变动的数据文件（`data/` 下） | 必须重跑 |
|---|---|
| 任一 `nodes-*.jsonl`（12 个）或 `inherited/nodes-A1|S1.jsonl` 的 anchors | verify_anchors（对该文件单跑）、check_graph、check_shared_quotes、check_unanchored_numbers |
| 任一 nodes 的 statement / type / id | check_graph、check_unanchored_numbers、check_layer（id 变会致 DANGLING_MEMBER）、audit_coverage |
| 删节点（击杀，落 `graveyard/killed-nodes-auditB.jsonl`） | check_graph（边悬空）、check_layer（成员悬空）、audit_coverage（orphan/分母） |
| 任一 `edges-*.jsonl`（14 个）或 `inherited/edges-A1|S1.jsonl` | check_graph、check_shared_quotes、audit_coverage |
| `structures-L2-a|b|c.jsonl` | check_layer、（若 L2 带锚点则加 verify_anchors，是否带锚**未复核**） |
| `ID-MANIFEST.md` | 无检查器读它；它是 `gen_manifest.py` 的产物，需重新生成而非重新检查（**未复核**：生成脚本未在本片取证范围内） |

两处从 `ls` 直接看到、会影响重跑计划的事实：`data/` 里有 `edges-H1.jsonl` 但**没有** `nodes-H1.jsonl`（H1 的节点端点落在别的文件里，check_graph 的 `--nodes` 必须凑全否则误报端点不可解析）；`verify_anchors.py` 一次只吃一个 nodes 文件，所以「全量重跑」= 14 次调用。

本片未覆盖：`apply_kills.py`、`repair_dangling.py`、`gen_manifest.py`、`export_obsidian.py`、`graph_stats.py` 未读（非校验用途，属改数据/出报表）；6 个检查器 40 行之外的退出码与阈值细节未读；本轮实际变动文件清单未读。

## 落选项

无。
