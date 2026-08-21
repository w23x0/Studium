# 缺口条目 · 综合切片 15.01–15.04（C5-01）

四份提案新建节点合计 **0 个**，缺口全为 FIX（补锚 / 改 statement / 改 sections）。各条已回查提案原文对应小节。

## 主体

1. 【15.01 §二】给 `d:objects-already-met-that-can-be-added-and-scaled` 补第 3 锚，file=`15.01.md`，实测 142 字符：`Throughout this book we have encountered many examples of mathematical objects that can be added to each other and multiplied by real numbers.` —— **采纳**：S1 是该 statement 主谓词唯一出处，节点 T3=0 无下移可能。

2. 【15.01 §四】三处 sections FIX：`d:ten-axioms-listed-in-three-groups`（现 `15.02`）、`d:example-3-v-n-with-componentwise-operations`（现 `15.03`）、`d:linear-space-is-a-set-together-with-two-operations`（现 `15.01,15.02`）→ `["15.01","15.02"]`/`["15.01","15.03"]`/`["15.01","15.03"]` —— **改后采纳**：该提案自陈 sections 语义未核到 SPEC，而 15.02 §四已引 `S2-SPEC-字段语义.md:35`（项 4）裁定为「被定义/陈述于」，按此前两条属定位性引用应改判合法不改。

3. 【15.01/15.02/15.03 §四】三份提案对 `d:linear-space-is-a-set-together-with-two-operations` 的 sections 互斥：15.01 要 `["15.01","15.03"]`、15.03 要追加得 `15.01,15.02,15.03`、15.02 要删 15.02 —— **改后采纳**：须先并案择一，否则三条 FIX 互相覆盖。

4. 【15.02 §四 S\A】删 `d:example-1-verification-is-the-field-axioms-of-r` 的 sections 中 `15.02`（两锚均在 15.03.md）—— **改后采纳**：提案自陈与 S2 项 4「12 个须改节点」是否重叠未核，须先对表。

5. 【15.02 §五抽查 1】FIX `d:only-axiom-1-states-that-the-result-is-unique` statement 第②句「in every example」—— **采纳**：池 T1 两条 + T2 三条全在 15.02.md 内，而该节全节不含 example。

6. 【15.02 §五抽查 2】给 `d:axiom-5-states-the-zero-only-as-a-right-neutral-element` 补第 3 锚（实测 76 字符：`But $O_1 + O_2 = O_2 + O_1$ because of the commutative law, so $O_1 = O_2$ .`）使「从定理 15.1 起」有据 —— **改后采纳**：与第 7 条并案。

7. 【15.04 §五抽查 3】同一节点判死因 1，主张「from Theorem 15.1 onward」改为「from Theorem 15.2 onward」—— **改后采纳**：与第 6 条方向相反，15.04 侧逐句读过两定理证明，建议取收窄方案、第 6 条降可选。

8. 【15.03 §五抽查 1】给 `d:function-space-addition-lives-on-the-intersection-of-domains`（现 2 锚）补挂例 5/8/10/11 四条既有锚（64/67/68/67 字符）+ 15.02.md Axiom 1 锚（160 字符）—— **改后采纳，本轮阻塞**：补满达 7 锚超上限 3，须待 `G5-P04-3 锚点上限是否提高.md` 裁定，否则只补 1 条并收窄五例全称成分。

9. 【15.03 §五抽查 2】FIX `d:degree-exactly-n-has-no-zero-element`（唯一锚是 16 个持有者共用的 115 字符句）：补 15.02.md Axiom 5、Axiom 6 原文各一锚，并把「零多项式是 O 的唯一候选」origin 标 model —— **改后采纳**：提案自陈两条 quote 未逐字取出、字符数未核，装配前须实测。

10. 【15.03 §四】FIX `apostol:ext-uncited-dimension-of-a-second-order-de-solution-space`（sections `15.03,15.08`，两锚全在 15.08.md）：(a) 补 15.03.md 锚，140 字符 `EXAMPLE 12. The set of all solutions of a homogeneous linear differential equation $y'' + ay' + by = 0$ , where a and b are given constants.`；或 (b) sections 收缩为 `15.08` —— **改后采纳**：提案倾向 (a) 但自陈未核 H2 层是否有「sections 只按语义归属登记」的约定。

11. 【15.04 §二 FIX-1】把 `d:thm-15-1-two-candidate-zeros-swap-roles-in-axiom-5` 的 idx=0 锚前伸为 118 字符（实测、单行连续）：`Suppose there were two, say $O_1$ and $O_2$ . Taking $x = O_1$ and $O = O_2$ in Axiom 5, we obtain $O_1 + O_2 = O_1$ .`（最小替代 45 字符）—— **采纳**：S8 全图 0 持有者，而定理 15.2 平行步骤 S18 有锚。遗留：改锚后与 `edges-D5.jsonl:1` 的 144 字符 evidence 不再同文，连带影响未核。

12. 【15.04 §四不一致 1】`d:axiom-5-states-the-zero-only-as-a-right-neutral-element` 的 sections `15.02` → `15.02,15.04` —— **采纳**：idx=1 锚 file=15.04.md（88 字符公式块），pool T1 两条分属两节。

13. 【15.04 §五抽查 1】FIX `d:thm-15-3-quantifiers-arbitrary-elements-and-arbitrary-scalars`：statement 第二句「twelve examples of Section 15.3」与「complex case」池内零支撑（去重仅 1 个源行），改写或删句 —— **采纳**：死因 1 兼 6，例数 12 已核为真。

14. 【15.04 §五抽查 2】给 `apostol:zero-element` statement 第二句（函数空间零元是处处为零的函数）补锚或移到函数空间例子节点，补不到则删句 —— **改后采纳**：池 7 条无一提函数空间，但提案未扫 15.02/15.03.md 找候选引文、未给字数。

## 落选项

- 15.02 §〇/§二：四条展示等式 S13/S16/S18/S20（16/18/22/22 字符）无合法引文；已由 `SPEC缺陷-锚点规则量化.md` §2.3.1 登记，归 G5-P02。
- 15.02 §二：四条等式转作某边 evidence 入 T2；提案不给改边方案，依赖「边 evidence 无长度下限」被 SPEC 确认。
- 15.02 §五抽查 3：`apostol:axioms-for-multiplication-by-numbers` D 型命中但判保留；3 锚已达上限，根因同上。
- 15.01 §五抽查 3：给 `apostol:linear-space` 补 nonempty 句为第 4 锚；3 锚已达上限，charlen 自标未核。
- 15.01 §五抽查 2：删/标注 `d:ten-axioms-listed-in-three-groups` 的 54 字符定位性锚；与第 2 条耦合，移出本轮。
- 15.03 §三 S12 公式行（27 字符）、§一 S35（仅边 evidence 76 字符）：前者结构性不可锚且内容已由散文锚承载，后者属 T2 记账位置差异。
- 15.04 §三：定理 15.3 的 (a)(b)(c) 行 S32/S33/S34（11/14/28 字符）；节点已存在、内容不缺，归 G5-P02。
- 15.04 §四不一致 2/3：`d:axiom-10-is-derivable-from-apostols-form-of-axiom-6` 的 sections 语义滑动须先统一语义；`L2:uniqueness-by-forcing-the-difference-to-zero` 无锚为 L2 层设计使然。
- 15.04 顺带发现：`node_type` 出现词表外的 `method`/`notation`；提案标未判，无清单可装配。

**本片未覆盖**：四份「顺带发现」里的全图外推条目均自标未核，不转为缺口条目。
