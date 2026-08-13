# C2-03 装配片 · G2d/G2e/G2f

## 主体

**1｜G2f｜改 `report/_D分片-主控核验.md:525`**：把「实际可引子串是 89 字符」改为「实测 100 字符，分片无误；89 是同源行另一子串（`edges-D2.jsonl:85` 的边证据）的长度」。**采纳**。A=100 有 `anchors.tsv:587` 与本轮 `len()` 两个互不依赖的测量源，89 无任何来源指向 A。

**2｜G2f｜改 `report/_转交-新会话-workflow.md:293`** 中复述的 `100 字符、真实子串是 89` 半句。**采纳**。与第 1 条同一事实，两处必须同改否则记账再次分叉。

**3｜G2f｜`report/审查-形式D-D2-片59-80.md` 的 `:72`/`:74` 不动**（分别写 100 与 89，各指各的串）。**采纳**。A−B=11 恰为句首 `EXAMPLE 3. `（含尾随空格）11 字符，分片两数皆对。

**4｜G2f｜改 `审查-形式D-D2-片59-80.md:440`**：「形式 D（确认）：锚点只覆盖基，未覆盖 dimension 2 与方程本身」改为「T2 塌陷（`edges-D2.jsonl:85` 已逐字覆盖 dimension 2 与方程），残留仅 claim 4 跨节调用无锚」。节点 `d:dim-of-a-second-order-de-solution-space-is-two`（`data/nodes-D2.jsonl:66`）**保留 KEEP**。**采纳**。头条死因 6 因 T2 边证据免除，exposure `0/1/2/0/3/2`。

**5｜G2f｜L66 补锚只补 C**（`15.07.md:39`，89 字符，`EXAMPLE 7. If $a_1, \ldots, a_n$ are distinct real numbers, the $n$ exponential functions`），救残留 claim 4（死因 6）。A（100 字符）**不补**。**改后采纳**：A 的新引入源行数=0 且会把 `15.08.md:15` 上的 n_holders 推高，制造 B 型借用引文；A 是否补取决于 SPEC 待议项「边 evidence 能否算节点锚点」，未裁前挂起。

**6｜G2f｜改 `report/审查-形式D-D3-片21-45.md:89` 第 4 列**，删掉 `:125`，括注「`:125` 已是该节点唯一锚点，42 字符，不在缺失之列」，其余三项保留、额度 1/3 不变。**采纳**。`nodes-D3.jsonl:31` 的 `anchors[0]` 实测 42 字符、唯一命中 `15.10.md:125`（整行即该锚），与 anchors.tsv/source-lines.tsv 三处一致；同分片 `:259` 正文本就写「锚 1 逐字管住，42 字符」，是表格与正文自相矛盾。节点 `d:norm-positivity-property` **保留 KEEP**，补锚 `15.10.md:22`（35 字符）/`:151`（195 字符）建议维持。

**7｜G2e｜`apostol:zero-element`（`data/inherited/nodes-A1.jsonl:8`）取 A 案**：`sections` 加 `"15.03"`；`anchors` 末尾加第 3 条 `{"file":"15.03.md","quote":"The zero element is the function whose values are everywhere zero."}`（66 字符，取自 `15.03.md:19`，落 SPEC 30–200 内）；statement 不动。**采纳**。两项须同时落盘：单加 sections 不消死因 6（池内仍 0 条 15.03）。句 2 现为 E 型整句无锚，其字面出处只在 TD（`inherited/edges-A1.jsonl:18`，该节点为 dst，不入池）。新引入源行数=1。

**8｜G2e｜`d:exponential-independence-select-the-largest-exponent`（`data/nodes-D2.jsonl:36`）改 `statement`+`atomic_reason`**，采提案 §2.3 整行 JSON；`anchors`/`sections`/`parent`/`node_type` 不动。**采纳**。死因 4：原文把「严格负」归因给「取最大」，实际来自 distinct（`15.07.md:39` distinct、`:57` negative 已逐字核）；反例 n=2, a₁=a₂=0 时该项 e⁰=1 不趋零，Example 7 论证崩塌。

**9｜G2e｜`d:pythagorean-split-of-the-approximation-error`（`data/nodes-D4.jsonl:51`）只改 `statement`**，采提案 §3.3 整行 JSON（落盘时 `SQUARED` 写小写 `squared`）；`sections` 保持 `["15.15"]` 不改。**采纳**。死因 4：末句把误差与误差平方混同；数值反例 x=(0,1)、s=(0,0)、t=(1,0) 给 0.41421 ≠ 1。「出自 15.11」为误记——`source-lines.tsv` 中 `15.11.md` 无任何行含 “Pythagor”。

**10｜G2d F1（D1）｜撤回 `report/audit-A4a-verdicts.jsonl:24` `suggested_fix` 首项**（「mention real numbers → contain the phrase real number」），不落盘、清单里划掉，无替代文本。**采纳**。A8 写 `all real $a$`、A9 写 `all real $a$ and $b$`，均不含 "real number" 词组，改后 4 条里 2 条变假。

**11｜G2d F2（D2）｜`data/nodes-X.jsonl:20`**：第 1 锚（15.14.md，100 字符）不动；第 2 锚 `4.1.md` 由现 140 字符（始于 `It contains the error`）替换为提案 §F2 那条 192 字符串（逐字取 `strang-ch4/4.1.md:31`，串内 `$\cos \mathrm{\Omega}_{\mathrm{{t}}}$` 是 "can't" 的 OCR 噪声，按 SPEC 原样保留）；新增第 3 锚 `{"file":"15.15.md","quote":"Then the projection of x on S is nearer to x than any other element of S."}`（73 字符，`15.15.md:3`）；`sections` `["15.14","4.1"]` → `["15.14","15.15","4.1"]`。**采纳**。本片唯一真证据缺口：exposure `0 2 0 0 2 2`，T2=T3=0，边与后代都救不了。最小子集=只替换第 2 锚。

**12｜G2d F4｜`nodes-D1.jsonl:24`、`:42` 的 `statement` 换成 `裁定-ADJ3.md` §3 定稿文本**。**采纳**（两条谓词已全核：量化任意标量恰 4 条、含 `real` 一词恰同 4 条；加法/数乘各 6 条为真；三组编排与 `15.03.md:5–35` 一致）。附执行提示：`:24` 次句已是 A4a 第二项落盘结果，首句仍旧，A4a 只落了一半。

**13｜G2d F4 余下两目标｜`nodes-D1.jsonl:46`、`nodes-X.jsonl:8` 的 statement 替换**。**改后采纳，标「未复核」**：提案自述这两条未逐句核（置信度中）。且 `:46` 在 F4 之后 D4 的证据缺口仍存在。

**14｜G2d R1（D4）｜`nodes-D1.jsonl:46` 十条映射句保留并标 `origin: model`**（方案 i）。**采纳**。不可用补锚解决：`15.03.md` 全文 38 行 `grep 'commutativ\|associativ\|distributiv'` 命中 0，教材原话即 "reader can easily verify"。先例已在用：`nodes-D2.jsonl:42 :54 :72 :73` 为 0 锚 + origin=model，`SPEC.md:55` 是节点侧条款，无需扩 SPEC。

**15｜G2d F5（D6 D7 D8 D10）｜重写 `report/audit-B2-verdicts.jsonl:24`、`:5`、`:60` 的 `reason`**，采提案 §F5 三段定稿文本；`verdict` 与 `cause` 不动。**采纳**。三型分别为转述反向且为假（A6 `:23` 含 `$(-1)x$`、A10 `:49` 含 `1x = x`）、虚构从句（`nodes-D1.jsonl:5` statement 全文单句）、挂错公理（节点写 Axiom 2 非 Axiom 5）。D10「至少 3」经核恰好 3，无独立动作；上界未普查，标「未复核」。

**16｜G2d F6（D9）｜`report/audit-B2.md:107` 「15.02 有 21」→「22」且同行删去 15.06；`:109` 「12 个未被 D1 触及」→「11」**。**采纳**，带顺序约束：若 `nodes-D1.jsonl:71` 的 KILL 也执行，则 15.06 重回未触及、原文会变真，须**先删节点后订正数字，且只做一次**。

**17｜G2d F7（D5）｜`report/audit-B2-verdicts.jsonl:89` `suggested_fix` 末项（node_type 改标）挂起并记录，前三项照常执行**。**采纳**。`SPEC.md:33` 四值封闭（concept/method/theorem/notation），实测无第五值在用；不得为迁就它改 `node_type`。

## 落选项

- G2e §1.4 B 案（把 `apostol:zero-element` statement 截为句 1、sections 不动）：**移出本轮**——提案自荐 A 案，两案不可混用；B 案会丢掉「概念在具体空间的实例化」层且与「sections 补 15.03」指示相反。
- G2d F3（D3）给 `data/inherited/nodes-A1.jsonl:12` 加第 3 锚（`15.03.md` 66 字符）：**不采纳，标 WONTFIX**——覆盖引文已在该节点自己的 T2 池（`inherited/edges-A1.jsonl:18`，该节点为 src），死因 6 已免除；新引入源行数=0，且该句已 5 持有者（`shared-quotes.tsv:44`），再加推到 6，只换形式收益。
- G2f §1.5 给 L66 补锚 A（100 字符）：**移出本轮**——见主体第 5 条，等 SPEC「边证据能否算锚点」裁决。
- G2f「同时改 `_D分片-主控核验.md:525` 与 `_转交-新会话-workflow.md:293` 里复述 D3 那条的半句」：**移出本轮**——提案自述那两处措辞本身是对的，只需在改 L66 半句时一并核对，不要误改。
- G2d D14（ADJ3 末句规律与 43/24/2/3 组统计）：**无落盘动作，保留可直接引用**；限定：只核表内求和自洽，43 条 claim 的分解本身未重做，标「未复核」。

**本片未覆盖**：G2e 顺带发现「`report/待应用清单.md` 内不存在 §4.9、本轮三节点在该文件检索不到」——编号来源须主控核对，未装配为条目。另 `15.10.md:22`（35 字符、n_sentence_end=0）补锚会撞 SPECQ §5.2 短行间公式待议项，本片未裁。G2d D1–D14 中未单列为条目者（D3 降级理由、D10 上界、R2/R3 附论）其动作均已并入上述 F 编号条目，无遗漏动作。
