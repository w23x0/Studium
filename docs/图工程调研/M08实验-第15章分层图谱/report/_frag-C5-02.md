# 缺口条目 · 片 C5-02（15.05–15.08）

源列 05/06/07/08 = `待应用-提案/G4-完备性-15.0x.md`；§〇/§二/§四/§五/顺带发现已回查。id、行号、字符数照抄原文（锚点字符数系原文实测、不跨行）；逐字串未转抄，按「源+行号+字符数」回取。

## 主体

### A 新建节点 6 条（死因均 0，均「采纳」）

| # | 源 | id / 内容 | 锚点实测 | 理由 |
|---|---|---|---|---|
|1|05|`apostol:multiplicative-model-of-a-linear-space-on-the-positive-reals`：第 29 题 R⁺ 配乘法与 xᶜ、零元为 1|142 字符 line61|原文已排除 55 字符短串：不含「1 为零元」支撑，会构成盲区 D|
|2|05|`apostol:sequence-spaces-bounded-and-convergent`：第 18、19 题数列空间|31 字符 line35 + 34 字符 line39|刚过 30 下限，地板上调即失锚|
|3|05|`apostol:series-spaces-convergent-and-absolutely-convergent`：第 20、21 题级数空间|31 字符 line37 + 42 字符 line41|与第 2 条合并否，原文倾向分开（判据不同）|
|4|05|`apostol:rational-functions-with-numerator-degree-bounded-by-denominator`：第 2 题 deg f ≤ deg g|103 字符 line7|本节唯一封闭性不平凡的正面题|
|5|05|`apostol:homogeneous-de-solution-space-variable-coefficients`：第 17 题变系数二阶齐次 ODE 解空间|93 字符 line31 + 75 字符 line33|**须两条并用**：OCR 拆两行，禁跨行拼接（硬禁令 2）|
|6|06|`d:polynomial-space-has-several-spanning-sets`，part-of→`apostol:spanning-set`|97 字符 :21 + 128 字符 :27|第 24 行公式块 36 字符原文明确不单列；与 15.08 的 `d:dim-of-polynomials-…` 邻接但非 T3 下移，跨节重复留裁决者|

### B 需裁决的锚点级 FIX 6 条

| # | 源 | 目标 → 动作 | 判定 | 理由 |
|---|---|---|---|---|
|7|06|`d:thm-15-4-identities-inherited-from-the-ambient-space` 增 66 字符锚，与 #0 并存|改后采纳|#0（175 字符）起点截断属 D 型；**不可用**前移版 207 字符，超 200 上界 7 字符|
|8|05|`d:axiom-10-is-derivable-from-apostols-form-of-axiom-6`（D1.jsonl:23）删 statement 首句 + sections 加 15.05 + 补 line63 的 65 字符锚|采纳|首句「Apostol does not remark on this…」与 15.05:63（第 30(a) 题逐字要求证此事）冲突，死因 3 近亲|
|9|05|反例层逐题表第 17 行「已有 `apostol:homogeneous-de-solution-space`」改为「仅覆盖常系数」|采纳|该节点 statement 逐字写「a and b given constants」，覆盖不到变系数，属覆盖高报|
|10|08|P1 `d:dim-of-polynomials-of-degree-at-most-n-is-n-plus-one` **增列** 164 字符锚（不换）|采纳|现锚 122 字符把集合列举本体与 S19 切在锚外（D 型）；原锚 n_holders=3，换锚牵连边|
|11|08|P3 `d:basis-expansion-of-an-element-exists-by-spanning` 增 50 字符锚（:32，公式 (15.4) 本体）|改后采纳|`tag{15.4}` 两表 0 而 S34 锚以「this equation」指代它，锚链断环；含 OCR 空格，是否算有意义引文未决|
|12|08|P2 `apostol:ext-uncited-dimension-of-a-second-order-de-solution-space` 增第 3 锚|改后采纳|52 字符版无变量、认不出方程；宜取 132 字符自足版，代价是与现 79 字符锚重叠|

### C 跨提案合并项 1 条

13. `d:finite-basis-two-clauses-are-logically-independent`：**06 §五抽查 2 与 08 §四(三) 各自独立判死因 6**。06 证据：见证 (ii)「独立而不张成」全无引文，T1=1/T2=1/T3=0/**distinct_src_lines=1**，池全落 15.06.md:21 同一源行（过报通道 c），T2 边证据不构成免除。08 修法：换成 15.08.md 第 3 行定义句（110 字符）。**改后采纳、并为一条**：取 08 换锚 + 按 06 处理 statement 第二句；均不主张 KILL。未复核：06 只 grep 了两文件四个关键词。

### D 进 SPEC 1 条

14. **08 §四**「sections 声明的每小节，节点应至少有一条该小节锚点；L2 与显式向上/向下引用者豁免」。**改后采纳**：两次 awk + comm 可复现；`check_graph` 现不比对 sections 与锚点 file，故 08 的 5 条、07 的 2 条从未被工具报出。豁免规则原文自陈无定论。

### E 记账补登 2 条

15. **05** `丢弃与未覆盖清单.md` 追加一行：15.05 的 21 道正面例题无任何节点（该节只被 CX2 覆盖一遍，只对 8 道反例建节点）。**采纳**，属新缺口非 CX2 失职。
16. **07 §四** `apostol:ext-vn-as-a-prior-vector-space`、`d:zero-space-declared-finite-dimensional-by-fiat` 在 15.07 无锚点也无 15.07 出边证据。**改后采纳**：删 sections 的 15.07 **或**补一条 15.07 证据边；原文未核提案方原意，不得单删。

## 落选项

- 06/07/08：L2 节点「声明某节却无该节锚点」（3+5+9 个）——按设计无锚、靠 members 挂载，保留。
- 08 §四(三)：`apostol:spanning-set`（15.08 过宽）、`d:finite-dimensionality-supplies-…`（向上引用）——原文判「倾向保留」，是第 14 条豁免规则的样本。
- 08 §四(二)：3 个 n_anchors=0 且 origin=model 节点——属节点自身证据缺口、非覆盖缺口，超出本轮。
- 07 §三：补建 (15.1)(15.2) 节点、S30 定义式补锚——原文均不主张（纯记号；锚点 #0 已含「the $n$ exponential functions」）。
- 05 四项：11 个 `cx-` 节点 node_type 全为 concept（未核其它节）、同 11 节点在 part-of 树上全为孤立点（无边提案）、反例层报告 §1 称 28 边而 ev_file 落 15.05 仅 1 条（原文判不矛盾，§6.5 已自认保守）、第 32 题（line77，48 字符）与第 27 题（line53，111 字符）补锚（未给目标 id）。
- 06 §四 3 条 B 型借用锚点候选（只列候选未给动作）；三节顺带发现共 10 条（含 `edges-X.jsonl:113` 疑 C 型）——原文标「未展开」或明示不属本轮。

**本片未覆盖**（受 6000 字符上限，宁缺不弱化单条证据）：

1. 另 9 条加锚 FIX 只给身份、**理由未展开**，均判采纳：06 `apostol:spanning-set` 补第 4 锚 104 字符（:29）；07 F1/F2/F3 补 100（:29）、75（:31）、56（:37）字符；07 `edges-H1:15` 换 Example 2 引文；07 OCR「and nc…」（:61）登记入清单；08 P4 增 131 字符锚（留原 84）；08 `d:dimension-theory-…` 删 15.08 或补锚；08 `d:n-plus-one-elements-…` 补 15.08 锚或标题改回 `L(S)`。
2. 四份 §一 逐句覆盖表未逐行回查，句级计数（05 47/18/29、06 37/34/27/7、07 45/37/8、08 37/34/3）按摘要转述，标**未复核**。
3. 05 §五抽查 2、3 与 08 §五三条抽查未读全，若另有可装配 FIX 则漏收；06 §四「主锚点不在 15.06」3 行表只读表体。
