# C2-01 装配条目 · G1 悬空边与击杀

口径：以候选 id 集合为主键，条数只作校验。每条已回查原文对应小节。

## 主体

**1. G1d-安全击杀清单.md 步骤 0** — 把 `report/audit-B2-verdicts.jsonl` 第 46、49、52 行的 `reason` 换成 G1c §1.1/1.2/1.3 的新杀因全文。**采纳。** 目标在 `report/` 非 `data/`；第 46 行 `d:example-1-verification-is-the-field-axioms-of-r` 属「维持 3」不在本批，但 reason 点名本批 #12，必须在步骤 4 前落盘（G1d §一 步骤 0、§四 对 A）。

**2. G1d 步骤 1** — 5 条锚点重挂（强制前置，`apply_kills.py` 不重挂）：1a/1b 新增到 `apostol:linear-space`（135 / 107 字符，`15.01.md:5` 第②③句）；1c **延长**`d:example-2-the-complex-numbers-with-real-scalars` 既有锚点 #0；1d/1e 新增到 `d:one-proof-from-the-axioms-serves-every-example`（182 字符，`15.03.md:37` 第④句；76 字符 `By unifying diverse examples in this way we gain a deeper insight into each.`，原只挂 `edges-D1.jsonl:219`，无锚点对应）。**改后采纳：1c 字符数落盘时必须实测重取。** G1b §三 第 2 档同一行给了「已持前 57 字符」与「111 延长到整句 190」，G1d §一 1c 与 §五 1 实测 193（源 `15.03.md:7` charlen=302）；三个数不得照抄任一。

**3. G1d 步骤 2** — 改接 5 条悬空边，rel / origin / ev_quote 保持原值：`data/edges-D1.jsonl:166`、`:191`、`:210` 旧 dst `d:function-space-addition-is-pointwise` → `apostol:function-space`；`data/edges-CX2.jsonl:22`、`data/edges-D5.jsonl:9` 旧 dst `d:axiom-5-states-the-zero-only-as-a-right-neutral-element` → `apostol:zero-element`。**采纳。** 必需性：例 7/8/12 的 part-of 父与 `apostol:function-space` 只有 is-a 相连（`inherited/edges-A1.jsonl:19/20/21`），is-a 不入 T3 池，裸删后「逐点运算」不可达（G1a §1.1、§二）。两个新 dst 无同源同向重复边（G1d 步骤 2 已核）。

**4. G1d 步骤 3** — 删 18 条悬空边：`data/edges-D1.jsonl:` 104、141、150、151、159、160、163、164、196、197、200、201、204、205（14 条）＋ `data/edges-A2-x2.jsonl:47`＋ `edges-D1.jsonl:` 167、192、211（与步骤 2 合并后弃用）。**改后采纳：须补一条 FIX。** G1a §1.1 对 #21 写明「建议把这一对比并入 src 的 statement 后删边」，即删 `edges-A2-x2.jsonl:47` 前须把该 contrasts 语义并入其 src `apostol:cx-derivative-pairing-is-blind-to-constants`；G1d 步骤 3 只列删除，未承接。

**5. G1d 步骤 4** — 删 19 个节点（A1 §1 表 #1–#15、#17、#18、#19、#21），其作 src 的 38 条边随节点进墓地。**改后采纳：「含 19 条自身 part-of」应为 18 条。** #21 `apostol:cx-single-point-evaluation-is-degenerate` 无 parent（A1 §1 表第 21 行 parent 列「无」；G1a §1.1「该节点无 parent（`nodes.tsv` parent 列空，非 d: 层），无父可改接」）。38 这个总数本身对（48 − #16 的 4 − #20 的 4 − #22 的 2）。前置：步骤 0–3 全部完成。

**6. G1d §二 两条降级 FIX** — `apostol:cx-law-of-cosines-needs-nonzero-elements`（`nodes-A2-x2.jsonl:12`，唯一持有 `15.12-exercises.md:39` 85 字符 + `:42` 83 字符）、`apostol:cx-absolute-value-and-product-of-integrals-on-polynomials`（`nodes-A2-x2.jsonl:18`，唯一持有 `:91` 47 字符 + `:94` 99 字符）。**改后采纳：保留节点与锚点、收缩 statement，但本轮不落盘 statement 文本** —— G1d §五 2 自述只给要点不给全文，2.2 对练习 12(b)(d) 的解读未经数学核验、落盘须标 `origin=model`。

**7. 记账更正（G1d §〇 对 G1a 的唯一数值修正）** — 悬空边 24 → 23：`edges-A2-x2.jsonl:50` 的 dst 是降级为 FIX 的 #22，**保持原样、不改接、不删除**。**采纳。**

**8. 记账更正（G1a 两处口径矛盾，本片新提）** — (i) §〇 表「改接到父节点 6 | 例 7 / 例 8 / 例 12 各 2 条」说明列漏项：§3.1 标题「改接（8 条 → 合并后 5 条）」与其表内 9 行、文内「6 条边落地」三者互不相符。以 G1d 步骤 2 的 5 条为准。(ii) §〇「（含 22 条 part-of 自身）」括号错：#20/#21/#22 三个 `apostol:cx-*` 无 parent，应为 19 条。**均采纳更正。**

**9. G1d §三 撤回 1 条** — `d:for-function-spaces-closure-is-the-only-real-content`（`nodes-D1.jsonl:62`）。**采纳。** 作 dst 边数 0，与其余 21 条无边耦合；唯一锚点 n_holders=16。重挂由 `A4-形式B漂移与借用锚点.md` 处理。

**10. G1d §四 不拆批** — 4 对互证无一需「只能杀一个」，19 条可单批。**采纳**，跨批次约束即条目 1。

## 落选项

- G1b §三 / G1d §2.3：「先重挂到 `apostol:angle-between-two-elements` / `apostol:cx-inner-product-axiom-diagnosis` 再杀」以保 KILL 21。不采纳 — 接手方 statement 讲概念不讲这道题，跨源重挂造锚点盲区 A/D 型，两份提案自己也不推荐。
- G1a §3.1 末行：`edges-A2-x2.jsonl:50` 改接到 `apostol:cx-derivative-pairing-is-blind-to-constants`。不采纳 — 已被 #22 降级作废（条目 7）。
- G1d §五 3：能否分步调用 `apply_kills.py`。移出本轮 — 只读态无法核，禁止对该脚本用 `--help`。
- G1c §1.3 的死因 6 观察（v:52「十条公理逐分量归约、O 是零元组」池内无支撑）。移出本轮 — 不改处置。
- G1d §五 4：19 条 KILL 的死因判定、8 条引文是否真支撑宿主断言。移出本轮 — 三份输入均未核。
- G1d §五 6：A1 §2.2「9 条 LOST」与 G1b「9 条」逐条对齐未做完。移出本轮 — 两个 9 不得相加。
- G1d §五 8 / 7 / 9：「维持 3」另两条与本批的悬空边耦合、`15.12-exercises.md:87`（练习 12(a)，24 字符）删除前即无持有者、步骤 4 后 `check_graph` 是否通过。均移出本轮 — 前两项未核，第三项只读态无法跑。
