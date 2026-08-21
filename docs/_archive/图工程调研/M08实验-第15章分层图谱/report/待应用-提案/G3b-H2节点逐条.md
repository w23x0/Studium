# G3b data/nodes-H2.jsonl 节点逐条审查

只读代理产出。**未改动 data/ 下任何文件。**所有字符数取自 tmp_index/anchors.tsv、edges.tsv 的
charlen 列（实测，转义前）；新构造的 quote 由我自己在 source/apostol-ch15/ 下逐字实测并标注。

## 〇 结论速览（节点实际数量 / 保留 n / 修 m / 撤回 k）

**节点实际数量 = 11**。文件 12 行，第 12 行为空行（结尾换行），tmp_index/nodes.tsv 里
`grep 'nodes-H2'` 恰好 11 行，loc 从 `data/nodes-H2.jsonl:1` 到 `:11`，无缺号。

- 保留（不改）3：`ext-theorem-12-10-part-b`、`ext-theorem-12-10-part-c`、`ext-vn-c-section-12-16`
- 修 8：其余 8 个（见 §三）
- 撤回 0

三条全局机械结论（可直接引用）：
1. **锚点字符数全部合规**。16 条锚点，charlen 最小 56（`ext-theorem-12-8` 第 0 条）、
   最大 167（`ext-theorem-12-2` 唯一一条），全部落在 30–200 内，`has_nl` 全为 0，无跨行。
2. **证据池极薄**。exposure.tsv 显示 11 个节点 `n_partof_desc` 全为 0 —— H2 节点全都没有
   part-of 后代，**T3 恒为空**；T2 只有 2 条（`ext-theorem-12-3` 经 edges-H2:9、
   `ext-vn-c-section-12-16` 经 edges-H2:15）。池总量 11 个节点合计仅 18 条。
   这意味着 H2 节点的断言**只能靠自身锚点支撑**，没有下移通道可援引 —— 三条过报通道里的
   (a) 对 H2 全体失效，所以下面每处 E/D 型判定都不能用「内容在后代」解释掉。
3. **TD 极厚且极易误用**。19 条 edges-H2 里有 17 条以 H2 节点为 dst（requires/generalizes），
   按四层定义**全部排除**。审计时最大的陷阱是拿 edges-H2:14
   （`apostol:dependent-set --generalizes--> ext-chapter-12-...`，evidence 65 字
   「However, the present definition is not restricted to finite sets.」）去支撑
   `ext-chapter-12-finite-dependence-definition` 的 statement —— 它是 TD，不入池。
   本审查中有 2 处（节点 5、节点 7）正是这种「内容确实在图里，但挂在 TD 边上」的记账错位。

主要缺陷类型分布：E 型无锚句 7 处、D 型覆盖不足 4 处、B 型借用 6 处（其中 3 处判 H2 节点非原主）、
死因 1（量词过度断言）2 处、死因 4（数学/事实错误）1 处（节点 11 的「the only place」）。
**死因 5（伪抽象）0 处** —— 理由见 §一 末尾的统一判定。


## 一 逐节点审查

### 1 `apostol:ext-theorem-12-8`（nodes-H2.jsonl:1，theorem，15.07，2 锚）

statement 分 3 句。源头全部在 15.07.md:61 一行（`n_sentence_end=4`，**单行含 4 句**，
按行号比对必然高报，下表按句比对）。

| 句 | 内容 | 锚 | 判定 |
| --- | --- | --- | --- |
| S1 | 15.07 要的是 12.8 的 PROOF 而非 statement；Apostol 未为 15.5 写自己的论证 | 锚0+锚1 间接 | **死因 1，轻**：15.07:61 确实有一段论证（「If we examine the proof… based only on the fact that $V_n$ is a linear space」），只是它论证的是「旧证可迁移」而非重证 15.5。写成 "writes no argument of his own" 过强 |
| S2 | 他说 V=V_n 时 15.5 归约为 12.8，**然后确认所引证明只用到 V_n 的线性空间性质**，再宣布对任意 V 有效 | 归约=锚0、宣布=锚1；**中间「只用到线性空间性质」这一步无锚** | **E 型**。该句正是整个节点的论证枢纽（迁移的合法性理由），却恰好落在两条锚之间被跳过 |
| S3 | 第15章既未重述也未重证 12.8 | 负存在性 | **已核**：`grep -F "Theorem 12.8" source/apostol-ch15/*.md` 全章仅命中 15.07.md:61 一行，别处不出现 → S3 成立 |

字符数：锚0=56、锚1=78，均在界内。

借用判定（shared-quotes.tsv 15.07.md/56/n_holders=5）：锚0 的 (file,quote) 另被
`node:d:thm-15-5-proof-delegated-to-theorem-12-8`（nodes-D2.jsonl:45）与 edges-D2:53、
edges-D2:157、edges-H2:1 持有。两个节点持有者里，**原主是 d: 节点**：该 D2 节点的 statement
（「Apostol gives no new argument in 15.07. He observes that in V_n the statement is
Theorem 12.8…」）正是在陈述这句话所做的事（证明委派）；本 H2 节点用它只为**指认外部对象的身份**。
不判 KILL —— 同一句确实同时干两件事（点名外部定理 + 执行委派），H2 侧的用法合法，
但**它不该是 H2 节点的主锚**。锚1（15.07.md/78/n_holders=2）另一持有者是 edges-H2:2，
不是节点，不构成节点间借用。

伪抽象（死因 5）判定：**不成立**。本节点不是「A 与 B 不同」式对比，而是一个**外部出处占位符**：
它有明确的所指（第12章定理 12.8）、明确的维度（第15章向它索取「整个证明」）、
以及 2 条入边（edges-H2:1、:2）依赖它作 dst。origin_note 也明确写了「不替 Apostol 陈述 12.8 的
完整内容」，没有把无原文的东西编出来。

**结论：修**。动作：(a) S1 改为「Apostol 未在第15章内为 15.5 写出独立证明，只写了一段迁移论证」；
(b) 补一条锚点补 S2 的枢纽句 —— 15.07.md:61 内的
`If we examine the proof of Theorem 12.8, we find that it is based only on the fact that $V_{n}$ is a linear space and nc on any other special property of $V_{n}$ .`
（我实测 **163 字符**，在 30–200 内，不跨行，逐字命中；注意源文 "nc" 是教材 OCR 的原样错字，
按硬禁令 2 必须逐字照抄，不得改成 "not"）。死因：1（轻）+ 6 的 E 型子情形。
置信度：高（负存在性与新锚均已 grep 实测）。不确定点：S1 的措辞属判断题，
若主控认为「no argument of his own」已隐含「非独立证明」，则 (a) 可不改，只做 (b)。

### 2 `apostol:ext-theorem-12-10-part-b`（:2，theorem，15.08，1 锚）

| 句 | 内容 | 锚 | 判定 |
| --- | --- | --- | --- |
| S1 | 15.08 只要这一外部部分的 PROOF；15.7(a)「V 中任一独立集是某个基的子集」的证明被宣布与 12.10(b) 相同 | 锚0（67 字，15.08.md:25） | 锚支撑「证明相同」；**「任一独立集是某个基的子集」这半句是对 15.7(a) 内容的复述，本节点无锚** —— 但该内容归 `apostol:theorem-15-7` 持有，此处只是转述以标识索取对象，**D 型极轻**，不计缺陷 |
| S2 | 第15章未为 15.7(a) 提供任何论证；引用即全部证明 | 锚0 | 支撑。已核：全章 "Theorem 12.10" 只出现于 15.08.md:25 |
| S3 | 第15章未复述 12.10(b) 说了什么 | 负存在性，同上 grep | 成立 |

字符数 67，在界内。借用：shared-quotes 15.08.md/67/n_holders=3，另两个持有者是
edges-H2:3、edges-H2:5，**均为边、无节点** → 不构成节点间借用，本节点是唯一节点持有者。
伪抽象：不成立（所指、索取维度、入边 2 条均明确）。
**结论：保留**。死因 0。置信度：高。

### 3 `apostol:ext-theorem-12-10-part-c`（:3，theorem，15.08，1 锚）

与节点 2 同构，逐项对应：锚0 = 15.08.md:25 的第二句（67 字，界内）；
shared-quotes 15.08.md/67 的另一组 n_holders=3 = edges-H2:4、edges-H2:6，无节点借用；
S1/S2/S3 与节点 2 同型，S3「第15章只说 (b) 的证明与它相同，并未说 12.10 共有几部分」
是本审查里写得最克制的一条 origin_note —— 它主动拒绝了「12.10 有 c 部分故至少三部分」
这类可推但未经证实的外推。
把 12.10 拆成 part-b / part-c 两个节点使 15.08.md:25 这一行被 3 个节点各取一半
（另一个是 `d:thm-15-7-proofs-delegated-to-theorem-12-10`，持有 135 字的整行两句版本），
这是**过报通道 (b) 的实例**：该行 `n_sentence_end=3`，任何按行号统计覆盖的做法都会把它算成
一处而实际被切成三份。但拆分本身合法（15.7 的 (a)(b) 确实分别指向 12.10 的不同部分）。
**结论：保留**。死因 0。置信度：高。

### 4 `apostol:ext-theorem-12-3`（:4，theorem，15.10，2 锚）

statement 4 句，源头集中在 15.10.md:91（`n_sentence_end=3`，单行多句 + 一个截断尾）。

| 句 | 内容 | 锚 | 判定 |
| --- | --- | --- | --- |
| S1 | 15.10 需要这个外部结果的 PROOF | 锚0（112 字）+锚1（68 字） | 支撑 |
| S2 | Apostol 称之为 V_n 中的 corresponding result，并把同一个证明复用于任意实欧空间 | 锚0 给「corresponding result…(Theorem 12.3)」、锚1 给「very same proof is valid in any real Euclidean space」 | 支撑 |
| S3 | 理由是原证只消耗了 12.2 所列点积性质、不依赖分量定义 | **无自身锚**，但该原文（167 字那段）是 edges-H2:9 的 evidence，而该边 src **正是本节点** → **T2**（pool.tsv 已记 `T2 自发边 data/edges-H2.jsonl:9`），**入池** | **不算 E 型**：T2 塌陷属记账位置问题，内容在图里，按四层定义可免除 |
| S4 | 第15章在实情形下未写 15.8 的证明，只补了推进到复欧空间的那一步 | **无锚**。原文在 15.10:91 尾「When we apply this proof in a complex Euclidean space…」，既不在锚点也不在任何 T2 边上 | **E 型**，本节点唯一实质缺陷 |

字符数 112、68，界内。锚0 以 "we were careful to point out that" **截断收尾**、语法不完整，
属 C 型（把引出从句当完整锚）的边缘情形；不单独计缺陷（确实逐字连续且点名 12.3），拼接建议见 §三。

借用判定：锚1（15.10.md/68/n_holders=5）另有 **2 个节点**持有者 ——
`node:apostol:real-euclidean-space`（inherited/nodes-A1.jsonl:48）与
`node:d:cauchy-schwarz-proof-inherited-from-theorem-12-3`（nodes-D3.jsonl:25）。
**原主是 D3 节点**（其 statement 通篇就是这个复用论证：「Apostol's proof strategy for 15.8 is a
re-use argument…the identical proof runs in any real Euclidean space」）；本 H2 节点用它证明
「外部证明被搬进来了」，合法；`apostol:real-euclidean-space` 是**定义节点**却拿这句迁移结论作锚，
是三方中最弱的一环（B 型，最弱持有者在 A1 层，不在本轮范围，记入顺带发现）。
锚0（112 字，n_holders=2）另一持有者是 edges-H2:7，非节点。

伪抽象：不成立。**结论：修**。动作：补锚覆盖 S4 —— 15.10.md:91 内的
`When we apply this proof in a complex Euclidean space, we obtain the inequality $(x, y)(y, x) \leq (x, x)(y, y)$ , which is the same as the Cauchy-Schwarz inequality since`
（我实测 **171 字符**，界内，不跨行，逐字命中）。死因 6（E 型）。置信度：高。
S4 的 "only" 我核过：读 15.10.md:85–105，Proof 段后直接进 EXAMPLE（应用到 C(a,b)），
未见第二处补充步骤 → 支持 "only"。

### 5 `apostol:ext-theorem-12-2`（:5，theorem，15.10，1 锚）

| 句 | 内容 | 锚 | 判定 |
| --- | --- | --- | --- |
| S1 | 15.10 只把它当作所引进证明的**前提集**；移植 12.3 证明的理由是「原证只是所列点积性质的推论、不依赖用来推出这些性质的具体定义」 | 锚0（167 字，逐字即该理由句） | 支撑，本文件里锚与句贴合最紧的一处 |
| S2 | 第15章**不**把这些性质当既证事实引来，而是把同类性质**重新声明**为 15.10 的内积公理 | **无锚**。原文在 15.10.md:11「…we regard these properties as axioms.」，它是 **edges-H2:10 的 evidence**（116 字），但那条边 src=`apostol:inner-product-axioms`、dst=本节点 → **TD，排除** | **E 型**。典型「内容在图里但挂在 TD 边上」的记账错位：直觉上似已有证据，按四层定义不入池 |

字符数 167，界内。借用（shared-quotes 15.10.md/167/n_holders=4）：另一节点持有者是
`node:d:cauchy-schwarz-proof-inherited-from-theorem-12-3`，余为 edges-D3:96、edges-H2:9。
**原主判为本 H2 节点**：该句唯一命名的对象就是 12.2（主语是 "the properties … listed in
Theorem 12.2"），D3 节点是把它当证明策略的一环转述。**且 D3 那句转述本身可疑** ——
它写「those listed properties are precisely the inner-product axioms」，而第15章从未逐条列出
12.2 的性质，"precisely" 是它自己加的；本 H2 节点的 origin_note 与 edges-H2:10 的 rel_note
都明确拒绝了这一步（「不可判为 equivalent 或 generalizes —— 逐条对应无法从第15章核实」）。
**同一事实上 H2 侧比 D3 侧克制**，这点应入裁决。

伪抽象：不成立。**结论：修**。动作：把 15.10.md:11 的那句补为**本节点第二条锚点**，使 S2 在 T1 自足
（`That is, we state a number of properties we wish inner products to satisfy and we regard these properties as axioms.` —— edges.tsv 实测 **116 字符**，界内）；edges-H2:10 保持不动。
死因 6（E 型）。置信度：高。

### 6 `apostol:ext-vn-as-a-prior-vector-space`（:6，concept，15.03/15.06/15.07/15.10，2 锚）

断言最密、锚点最不够用的一个。statement 分 6 个可判分句。

| 句 | 内容 | 锚 | 判定 |
| --- | --- | --- | --- |
| S1 | 此处引进的是一个**对象**，不是一个证明 | 元层，由 S2–S6 支撑 | 不单独判 |
| S2 | 15.03 引进 V_n 时已冠以 "the vector space of all n-tuples"，运算只以 "the usual way in terms of components" 给出 | 锚0（141 字，15.03.md:9） | 支撑 |
| S3 | 15.06 点名第12章是研究过 V_n 的地方 | 锚1（130 字，15.06.md:29） | **A/B 型轻度错配 + C/D 型**：该句主语是 "These ideas"（指前一句列举的 dependence/independence/bases/dimension），V_n 只是它们**被研究的场所**；且 "These ideas" 的先行词落在锚外，锚起点切在指代词上 |
| S4 | 第15章从不构造 V_n、从不显式陈述其运算、从不验证其公理 | 前两项由锚0 反面支撑；**「从不验证公理」无锚** —— 原文 15.03.md:3「The reader can easily verify that each of the following examples satisfies all the axioms for a real linear space.」不在池中 | **E 型** |
| S5 | 15.03 各例的验证被交给读者 | 同 S4，共用那处缺失原文，**无锚** | **E 型** |
| S6 | V_n 随后**全章**被当作标准实例与直觉来源 | **无锚**。sections 列了 15.07/15.10 但两节无锚点落入；T2=T3=0，无处援引 | **死因 1（量词过度断言）+ E 型**："throughout"、"the source of intuition" 都是全局量词，池里 2 条锚只覆盖 15.03、15.06 |

字符数 141、130，界内。exposure.tsv：`n_partof_desc=0, T1=2, T2=0, T3=0, pool_total=2,
distinct_src_lines=2` → **没有任何下移通道可为 S6 免责**（过报通道 (a) 在此失效）。

借用判定，两条锚各有问题：
- 锚0（15.03.md/141/n_holders=2）表面只与 edges-H2:11 共享，但它是 15.03.md:9 整句
  （171 字：`EXAMPLE 3. Let $V = V_{n}$ , the vector space of all n-tuples…components.`）的
  **真子串**，而那个 171 字版本被 `node:apostol:v-n-space`（inherited/nodes-A1.jsonl:11）与
  `node:d:example-3-v-n-with-componentwise-operations`（nodes-D1.jsonl:50）持有。
  即**同源句借用、只是切法不同，shared-quotes 按精确 (file,quote) 匹配查不出来** ——
  B 型的一个机器盲区，半机械化手段在此失效。原主是 `apostol:v-n-space`（例3 的 L1 节点）。
- 锚1（15.06.md/130/n_holders=2）的另一持有者是**另一个 H2 节点**
  `node:apostol:ext-chapter-12-finite-dependence-definition` —— **H2 内部两节点共用同一条锚**。
  按 S3 的分析，该句真正在说的是 dependence/independence/bases/dimension 的出处，
  **原主是 `ext-chapter-12-finite-dependence-definition`**，本节点是借用方。

与 `apostol:v-n-space` 是否重合（origin_note 自问「若审计认为二者重合可判 KILL」）：
**判不重合，不 KILL**。两者所述是不同的事实：前者是「15.03 例3 的内容」，
本节点是「V_n 这个对象的章外来源身份 + 第15章自己没做构造与公理验证」。后者是 H-back 层的正当产物，
且有 2 条入边（edges-H2:11、:12）依赖它作 dst。

伪抽象：不成立，但**这是 11 个里最接近「记账空壳」的一个** —— 6 句里 3 句（S4/S5/S6）池内无支撑，
剩下的靠两条都判为借用的锚。**结论：修**。三项动作：
(a) 补锚覆盖 S4/S5：`The reader can easily verify that each of the following examples satisfies all the axioms for a real linear space.`（15.03.md:3，我实测 **114 字符**，界内，逐字命中）；
(b) 锚1 向前扩到含先行词，修 S3 的 C/D 型：
`we introduce the concepts of dependence, independence, bases, and dimension. These ideas were encountered in Chapter 12 in our study of the vector space $V_{n}$ .`
（我实测 **162 字符**，界内，逐字命中，仍在 15.06.md:29 同一行内不跨行）—— 该行 `n_sentence_end=6`，
是过报通道 (b) 的重灾行；
(c) S6 降量词：删去 "throughout" 与 "the source of intuition" 的全局断言，改为只说 15.03/15.06，
并把 sections 里无锚的 **15.07、15.10 删除**（保守做法；若主控要保，须另补锚，
候选两句我都实测过：15.07.md:27 的 `Many examples of dependent and independent sets of vectors in $V_{n}$ were discussed in Chapter 12.` = **99 字符**、
15.10.md:5 的 `The dot product $x \cdot y$ of two vectors $x = (x_1, \ldots, x_n)$ and $y = (y_1, \ldots, y_n)$ in $V_n$ was defined in Chapter 12 by the formula` = **146 字符**，均界内且逐字命中）。
死因 1 + 6（E/C/D 型）+ B 型借用 2 处。置信度：中高。
不确定点：(c) 是删 section 还是补锚，取决于「sections 是否必须条条有锚」的口径 ——
该条 SPEC 未定，我按「无锚不列」处理。

### 7 `apostol:ext-chapter-12-finite-dependence-definition`（:7，concept，15.06/15.07，2 锚）

| 句 | 内容 | 锚 | 判定 |
| --- | --- | --- | --- |
| S1 | 第15章**不**引进这个定义，而是**替换**它、然后断言相容 | 元层，由 S2–S4 支撑 | 不单独判 |
| S2 | 15.06 宣布 dependence/independence/bases/dimension 在第12章的 V_n 中已遇到、现在推广 | 锚1（130 字，15.06.md:29） | 支撑。**本节点是这条锚的原主**（见节点 6 借用判定） |
| S3 | 15.07 给出新定义并声称在有限集上与第12章一致 | 锚0（107 字，15.07.md:17 首句） | 支撑 |
| S4 | 新定义**不受有限性限制** | **无锚**。原文是 15.07.md:17 第二句「However, the present definition is not restricted to finite sets.」，它是 **edges-H2:14 的 evidence**（65 字），而该边 src=`apostol:dependent-set`、dst=本节点 → **TD，排除** | **E 型 + 过报通道 (c) 的标准形态**：同一源行（15.07.md:17，`n_sentence_end=2`）前半落节点锚点、后半只落在一条 TD 边上 |
| S5 | 这个「一致」在第15章任何地方都未被验证 | 负存在性 | **已核**：`grep -F "Chapter 12" source/apostol-ch15/*.md` 全章 4 处（15.06:29、15.07:17、15.07:27、15.10:5），无一处给出两定义的比对论证 → 成立 |

字符数 107、130，界内。借用：锚0（15.07.md/107/n_holders=2）另一持有者 edges-H2:13，非节点；
锚1 原主即本节点，被节点 6 借用。node_type=concept 恰当（所指是一个**定义**，非定理）；
sections 15.06+15.07 两节都有锚，恰当。

伪抽象判定：**不成立，且这是 11 个里做得最好的一个**。它没停在「第12章的定义和第15章的不同」，
而是把差异钉在一个可名可核的维度上 —— **有限性**（第12章限有限集、15.07 不限），
并把「一致性只被断言、未被验证」单列出来。这正是对比型节点应有的形态。

**结论：修**（只补一条锚）。动作：把锚0 扩为 15.07.md:17 整行两句
`If S is a finite set, the foregoing definition agrees with that given in Chapter 12 for the space $V_{n}$ . However, the present definition is not restricted to finite sets.`
（我实测 **173 字符**，界内，不跨行，逐字命中），使 S4 在 T1 自足；edges-H2:14 保持不动。
死因 6（E 型）。置信度：高。

### 8 `apostol:ext-vn-c-section-12-16`（:8，concept，15.10，1 锚）

| 句 | 内容 | 锚 | 判定 |
| --- | --- | --- | --- |
| S1 | 一个只按名字引进的例子 | 锚0 | 支撑 |
| S2 | 15.10 在定义了复欧空间之后把 V_n(C) 作为一个实例给出，并定位在 12.16 节、称那里 discussed briefly | 锚0（91 字）给后半；「having defined complex Euclidean space」的原文（15.10.md:43 同行首句）不在锚内 | **D 型极轻**：该定义句归 `apostol:complex-euclidean-space`，且本节点经 edges-H2:15（is-a，**T2**，pool.tsv 已记）指向它 → T2 使语境自足，不计缺陷 |
| S3 | 第15章既未构造 V_n(C)、未在其上给出内积、也未为它验证复内积公理；该例在第15章不承担证明负荷 | 负存在性 | **已核**：读 15.10.md:43–63，紧随其后的 EXAMPLE 1–3 全是**实**内积例（V_n 的点积、V_2 的加权形式、C(a,b) 的积分），15.10.md:47 把验证交给读者 → V_n(C) 确实没有配套内积构造 → 成立 |

字符数 91，界内。借用：shared-quotes 15.10.md/91/n_holders=2，另一持有者 edges-H2:15（边），
**无节点借用**。node_type=concept 可接受 —— 它以「例子」身份出现，但节点所指是一个**空间对象**，
且 15.10:43 该处未编号（封闭词表里 example 一般对应教材编号的 EXAMPLE 项），concept 比 example 更贴。
伪抽象：不成立。exposure：T1=1、T2=1、pool_total=2，但 `distinct_src_lines=1` ——
**两条池证据同源行同 quote**，按「新引入的源行数」度量增益为 0。不是缺陷（边与节点各有记账职责），
但报覆盖率时不能算成 2。**结论：保留**。死因 0。置信度：高。

### 9 `apostol:ext-volume-2-proof-of-the-legendre-closed-form`（:9，theorem，15.13，1 锚）

| 句 | 内容 | 锚 | 判定 |
| --- | --- | --- | --- |
| S1 | 这是一次**前向外包**而非回指 | 元层 | 见下文层归属 |
| S2 | 用 Gram-Schmidt 产出 y_0…y_5 后，15.13 断言 y_n 的闭式为常数乘 (t^2-1)^n 的 n 阶导数，并把证明推给第 II 卷 | 锚0（127 字）只到 "and we shall prove that" **就截断** —— 闭式本身在下一处 display（15.13.md:153），**不在任何锚点、不在池中** | **D 型，重**。本节点的所指就是「那个闭式」，而闭式原文完全在池外；锚停在 "prove that" 是典型 **C 型**（把引出语当成内容） |
| S3 | 第15章立刻就用了这个闭式，用同一个导数表达式定义 Legendre 多项式 P_n，故一个未证等式在本章承担着一个定义的负荷 | **无锚**。P_n 的定义式在 15.13.md:159（display），亦不在池中 | **E 型** |

字符数 127，界内。借用：shared-quotes 15.13.md/127/n_holders=2，另一持有者 edges-H2:16（边），
**无节点借用**。exposure：T1=1、T2=0、T3=0 → 无免责通道。
入边 2 条：edges-H2:16（source，有 evidence）、edges-H2:17（**origin=model，ev_charlen=0、quote 空**）。

层归属：本节点是**前向**外包（指向第 II 卷），却放在 `nodes-H2.jsonl`（H-back 跨章回指）里，
statement 首句自己也承认了。不判撤回 —— H2 事实上承担的是「第15章的全部章外依赖」，
方向只是其中一维；但建议 origin_note 显式标注方向，避免后续把 H2 整体当作「向后」。

伪抽象：不成立。**结论：修**。动作：补锚覆盖 S2 的闭式 —— 15.13.md:153 的
`y _ {n} (t) = \frac {n !}{(2 n) !} \frac {d ^ {n}}{d t ^ {n}} (t ^ {2} - 1) ^ {n}.`
（我实测 **82 字符**，界内，不跨行，逐字命中；该行即完整公式，无需跨 `$$` 定界行）。
S3 的 P_n 定义式（15.13.md:159，我实测 **134 字符**，逐字命中）**建议不补进本节点** ——
它是 `apostol:legendre-polynomials` 的内容，补了会造成新的 B 型借用；S3 陈述的是「本章在用它」
这一关系，由 edges-H2:16 承载即可。死因 6（D 型为主，兼 C/E）。置信度：高。
不确定点：edges-H2:17 是否在 unverified-model-quotes.tsv 那 15 条里 —— 它 quote 为空，
按定义应不在其列，但我未逐行核对那张表，**未核**。

### 10 `apostol:ext-uncited-dimension-of-a-second-order-de-solution-space`（:10，theorem，15.03/15.08，2 锚，**origin=model**）

| 句 | 内容 | 锚 | 判定 |
| --- | --- | --- | --- |
| S1 | 15.08 例3 断言 y''-2y'-3y=0 的解空间维数为 2、基为 e^{-x} 与 e^{3x}、**且每个解都是这两者的组合** | 锚0（100 字）给维数、锚1（79 字）给基；**第三分句「每个解都是组合」无锚** —— 原文「Every solution is a linear combination of these two.」在 15.08.md:15 同一行（`n_sentence_end=4`）却被两条锚跳过 | **E 型**，且是**过报通道 (b)** 的实例：整行 4 句、锚只取 2 句，按行号算会判为已覆盖 |
| S2 | 第15章对此毫无证明：既未验证二函数张成解集，也未验证不存在第三个独立解，且未指名任何章/节/定理 | 负存在性 | 成立。锚0/锚1 之后 15.08 例3 无任何论证；15.08 全节唯一的章外编号引用是 15.08.md:25 的 "Theorem 12.10"，属 15.7 的证明，不涉例3 |
| S3 | 两个指数函数的独立性在第15章内可得（15.07 例7），但张成那一半不可得 | **无锚**（跨节转述） | 数学上正确：15.07.md:39 例7 处理**指数互异**的 n 个指数函数的独立性，取 a_1=-1、a_2=3 即得；该内容归 15.07 例7 侧的节点。**D 型轻**，不计缺陷 |

字符数 100、79，界内。**锚点我自己逐字核过**（本节点 origin=model，check_graph 只核 origin=source
的 916 条边引文；节点侧 model 锚点是否被任何工具核过我无法确认，故自核）：两条均逐字命中 15.08.md。

借用判定：锚1（15.08.md/79/n_holders=3）另一节点持有者是
`node:d:dim-of-a-second-order-de-solution-space-is-two`（nodes-D2.jsonl:66）。
**原主是该 D2 节点**（statement 直接就是「Example 3 gives dimension 2 for the solution space of
the single equation…one basis being u_1(x)=e^{-x}, u_2(x)=e^{3x}」）；本 H2 节点借它标识
「第15章在哪里断言了这个无出处事实」，用法合法。锚0（100 字）在 shared-quotes.tsv 中**未出现**
→ 仅本节点持有，非借用。

**sections 有问题**：列了 `15.03`，但两条锚都在 15.08、statement 也只讲 15.08。
15.03 里相关的只有 15.03.md:35 例12
（`EXAMPLE 12. The set of all solutions of a homogeneous linear differential equation $y'' + ay' + by = 0$ , where a and b are given constants.` —— 我实测 **140 字符**，界内，逐字命中），
但例12 只说该解集是线性空间，**无任何维数断言**，支撑不了本节点。
**判 15.03 为无支撑 section，建议删除**（若主控要保，须补例12 那条锚并在 statement 里说清
「15.03 只给出解空间是线性空间，维数为 2 是 15.08 才断言的」）。

origin=model 的用法**恰当**：origin_note 明确写了「锚点是第15章的断言处，不是引用语」
「判其为外部是我们的推断」「刻意不指名任何第12章或第8章的定理编号：无原文可查，指名即为编造归属」
—— 正面避开了硬禁令 3 与死因 3。node_type=theorem 可接受（所指事实本身是定理型断言）。
伪抽象：不成立（差异维度 = 有无出处标注）。

**结论：修**。动作：(a) 锚1 扩为两句
`One basis consists of the two functions $u_1(x) = e^{-x}$ , $u_2(x) = e^{3x}$ . Every solution is a linear combination of these two.`
（我实测 **132 字符**，界内，不跨行，逐字命中），补 S1 第三分句；(b) sections 删掉 15.03。
死因 6（E 型）+ sections 冗余（FIX，非死因）。置信度：高。

### 11 `apostol:ext-uncited-unit-coordinate-basis-of-vn`（:11，theorem，15.08，1 锚，**origin=model**）

| 句 | 内容 | 锚 | 判定 |
| --- | --- | --- | --- |
| S1 | 一次无出处的借用 | 元层 | 由 S2/S3 支撑 |
| S2 | 15.08 例1 断言 V_n 维数为 n、一个基是 n 个单位坐标向量 | 锚0（101 字，15.08.md:11，逐字含两句） | 支撑，贴合 |
| S3 | 第15章既未验证该集的独立性也未验证其张成性，且未指名出处 | 负存在性 | 成立（15.08.md:11 之后直接是例2，无论证） |
| S4 | **这是第15章唯一一处把抽象维数概念系于一个具体数字的地方**，而这个系联建立在章外借来的信用上 | 无锚，且**与源文冲突** | **死因 4（事实错误）**。同节 15.08.md:13 例2 断言多项式（degree ≤ n）空间「has dimension $n+1$」并给出基 {1,t,…,t^n}（我实测该句 **89 字符**，逐字命中）；15.08.md:15 例3 断言解空间「has dimension 2」；15.08.md:17 例4 断言多项式全体 infinite-dimensional。**至少三处**同样把维数系于具体数字，例2 甚至自带「Every polynomial of degree ≤ n is a linear combination of these n+1 polynomials」。"the only place" 为假 |

字符数 101，界内。锚点我逐字核过原文，命中（同节点 10，origin=model 故自核）。

借用判定（shared-quotes 15.08.md/101/n_holders=5）：另有 **2 个节点**持有者 ——
`node:apostol:dimension`（inherited/nodes-A1.jsonl:36）与
`node:d:dim-of-vn-is-n-via-unit-coordinate-vectors`（nodes-D2.jsonl:64）。
**原主是 D2 节点**（「Example 1 computes a dimension the only way available: exhibit one basis
and count it. The n unit coordinate vectors serve as the witness.」）。
`apostol:dimension` 是**定义节点**（statement 是维数定义原文）却把例1 当锚，与节点 4 的
`apostol:real-euclidean-space` 同型，属 A1 层的 B 型借用，不在本轮范围，记入顺带发现。
本 H2 节点的用法（标识第15章在哪断言了这个无出处事实）合法。

node_type=theorem 可接受；sections=15.08 唯一且有锚，恰当。伪抽象：不成立。
origin=model 与 origin_note 的克制同节点 10（同样刻意不指名第12章定理编号），应保留。

**结论：修**。动作：**改写 S4**，把量词从「全章唯一一处把抽象维数系于具体数字」收窄到
「关于 V_n 的唯一一处」—— 后者可核（15.08 例1 是全章唯一给出 V_n 维数的地方），
S4 后半「系联建立在章外借来的信用上」保留。死因 4（S4 为假）+ 死因 1（同源的过度量词）。
置信度：高（三处反例的原文行号均已 grep 到）。

### 关于死因 5（伪抽象·层塌缩）的统一判定

简报提示「对比节点最容易犯伪抽象」。**本文件 11 个节点全部判不成立**，与预期相反，故理由写清：

nodes-H2 的节点**不是「A 与 B 对比」型节点**，而是**章外出处占位符**。每个节点都有一个具体、
可点名的章外所指（定理 12.8 / 12.10(b) / 12.10(c) / 12.3 / 12.2；对象 V_n / V_n(C)；
第12章的相依定义；第 II 卷的闭式证明；两处无出处事实），且每个都写明了**第15章向它索取什么**
（整个证明 / 前提集 / 只是名字 / 一个对象）。这个「索取维度」正是伪抽象所缺的那一维。

三条支持不判 5 的机械事实：
1. 11 个节点全部有入边（edges-H2 的 17 条 TD 边覆盖全部 11 个 dst），撤回任一个都会造成悬空 id；
2. 所有 origin_note 都显式声明了「第12章原文不在手上，故不陈述其内容」——
   主动拒绝了层塌缩最常见的形态（把没读过的外部内容替它写出来）；
3. 最接近空壳的是节点 6（6 句里 3 句池内无支撑），但它的病是**覆盖不足（D/E 型）**
   而非抽象层次错误，修锚即可，不必 KILL。

真正在这批节点里出现的是另外两类：D/E 型覆盖不足与量词过度断言（节点 6、11）。
建议主控把「对比节点必查死因 5」这条启发式，在 H2 这类**出处占位节点**上替换为
「必查『索取维度是否写明』+『statement 每句是否有 T1 锚』」。

## 二 撤回清单

**空。11 个节点无一建议撤回。**

不撤回的三条共同理由（详见 §一 末节）：11 个节点全部作为 dst 承载 edges-H2 的入边
（撤回即产生悬空 id，而 tmp_index 现报「悬空 id 引用 0 处」）；每个都有可点名的章外所指
与写明的「索取维度」；所有 origin_note 都主动声明了「第12章原文不在手上，故不陈述其内容」。

两个曾被考虑撤回、最终判不撤的：
- `apostol:ext-vn-as-a-prior-vector-space`（节点 6）—— origin_note 自己写了
  「若审计认为二者重合可判 KILL」。判**不与 `apostol:v-n-space` 重合**：前者说的是
  「15.03 例3 的内容」，后者说的是「V_n 的章外来源身份 + 第15章未做构造与公理验证」，
  是两个不同的事实。改锚与降量词即可（§三 节点 6）。
- `apostol:ext-volume-2-proof-of-the-legendre-closed-form`（节点 9）—— 它是**前向**外包
  却放在 H-back 文件里。判**不因层归属撤回**：H2 事实上承担的是「第15章的全部章外依赖」，
  方向只是其中一维；改法是在 origin_note 里标注方向，不是删节点。

## 三 修改清单（改后 JSON 行全文）

8 行。**主控串行应用时请整行替换 data/nodes-H2.jsonl 的对应行号。**
未列出的第 2、3、8 行保持原样。

已做的机械自检（我在 tmp 目录下跑的，未触碰 data/）：
- 8 行全部 `json.loads` 通过；
- 8 行共 18 条锚点，每条 quote 都用 `q in open(source/apostol-ch15/<file>).read()` 逐字验过 ——
  **全部命中**，无一含换行，charlen 全部落在 30–200：
  行1 [56,163,78]、行4 [112,68,171]、行5 [167,116]、行6 [141,114,162]、
  行7 [173,130]、行9 [127,82]、行10 [100,132]、行11 [101]；
- 未新造任何关系词（本文件不改边）；未改动任何 id，故不会新增悬空引用；
- 行9 的公式锚点是**从 15.13.md 第 153 行直接读出**再序列化的，不是我手打的 ——
  避免 LaTeX 反斜杠在转写中被吃掉（我第一次手打时 `\frac` 就被吃成 `rac`，
  已换成从文件取字符串的做法；JSON 里显示为 `\\frac` 是正确的转义形态，解析后即 `\frac`）。

各行改动摘要（细节见 §一 对应小节）：

| 行 | 改了什么 | 锚点数 |
| --- | --- | --- |
| 1 | statement 第 1 句降调（"writes no argument of his own" → "writes no independent proof…only a transfer argument"）；新增中间枢纽句锚点补 S2 的 E 型 | 2 → 3 |
| 4 | 新增复情形那一步的锚点，补 S4 的 E 型 | 2 → 3 |
| 5 | 新增 15.10:11 公理声明句锚点，把原先只挂在 TD 边上的 S2 提到 T1 | 1 → 2 |
| 6 | sections 删 15.07、15.10；statement 的 S3 改为「the ideas now being extended…namely in V_n」（修锚句所指错配）、S6 全局量词降为「Within the two sections anchored here」；新增 15.03:3 读者验证句锚点；锚1 向前扩含先行词 | 2 → 3 |
| 7 | 锚0 扩为 15.07:17 整行两句，把 S4 从 TD 边提到 T1 | 2（数不变，长度 107→173） |
| 9 | 新增 15.13:153 闭式锚点（本节点所指的核心，原先完全在池外）；origin_note 补一句标明这是前向外包 | 1 → 2 |
| 10 | sections 删 15.03（无锚且例12 支撑不了维数断言）；锚1 扩为两句补 S1 第三分句 | 2（数不变，长度 79→132） |
| 11 | statement 的 S4 由「the only place where Chapter 15's abstract notion of dimension is tied to a concrete number」收窄为「the only place where Chapter 15 ties the dimension of V_n to a number」（原句为假，反例见 §一 节点 11） | 1（不变） |

```jsonl
{"id": "apostol:ext-theorem-12-8", "name_en": "Theorem 12.8 (Chapter 12), imported as the V_n case of Theorem 15.5", "name_zh": "定理12.8(第12章),作为定理15.5在 V_n 中的特例被引入", "node_type": "theorem", "sections": ["15.07"], "statement": "What 15.07 needs from this external theorem is its PROOF, not merely its statement: Apostol writes no independent proof of Theorem 15.5 inside Chapter 15, only a transfer argument. He states that when V = V_n Theorem 15.5 reduces to Theorem 12.8, then certifies that the imported proof uses only the linear-space property of V_n, and declares it valid for any linear space V. Chapter 15 neither restates nor reproves Theorem 12.8.", "aliases": [], "anchors": [{"file": "15.07.md", "quote": "When $V = V_{n}$ , Theorem 15.5 reduces to Theorem 12.8."}, {"file": "15.07.md", "quote": "If we examine the proof of Theorem 12.8, we find that it is based only on the fact that $V_{n}$ is a linear space and nc on any other special property of $V_{n}$ ."}, {"file": "15.07.md", "quote": "Therefore the proof given for Theorem 12.8 is valid for any linear space $V$ ."}], "origin": "source", "origin_note": "本节点的内容边界只来自第15章15.07的引用语。我们手上没有第12章原文,故此处不替 Apostol 陈述定理12.8 的完整内容;只记录第15章在此处需要它的哪一部分(整个证明)以及第15章未重证这一事实。"}
```

（行 1 的第二条锚点里 "and nc on any other" 的 `nc` 是教材 OCR 原样错字，按硬禁令 2 逐字照抄，不得改成 `not`。）

```jsonl
{"id": "apostol:ext-theorem-12-3", "name_en": "Theorem 12.3 (Chapter 12), the V_n Cauchy-Schwarz result whose proof Theorem 15.8 reuses", "name_zh": "定理12.3(第12章),定理15.8 复用其证明的 V_n 情形结果", "node_type": "theorem", "sections": ["15.10"], "statement": "15.10 needs the PROOF of this external result. Apostol calls it the corresponding result for vectors in V_n and reuses the very same proof for any real Euclidean space, on the stated ground that the original proof consumed only the dot-product properties listed in Theorem 12.2 and not the component definition. Chapter 15 writes no proof of Theorem 15.8 in the real case; it adds only the extra step carrying the argument into a complex Euclidean space.", "aliases": [], "anchors": [{"file": "15.10.md", "quote": "When we proved the corresponding result for vectors in $V_{n}$ (Theorem 12.3), we were careful to point out that"}, {"file": "15.10.md", "quote": "Therefore, the very same proof is valid in any real Euclidean space."}, {"file": "15.10.md", "quote": "When we apply this proof in a complex Euclidean space, we obtain the inequality $(x, y)(y, x) \\leq (x, x)(y, y)$ , which is the same as the Cauchy-Schwarz inequality since"}], "origin": "source", "origin_note": "内容边界只来自第15章15.10的引用语。第12章原文不在手上,故不陈述定理12.3 的原始表述;此处只记录第15章向它索取整个实情形证明,并自行补上复情形的一步。"}
{"id": "apostol:ext-theorem-12-2", "name_en": "Theorem 12.2 (Chapter 12), the list of dot-product properties the imported proof consumes", "name_zh": "定理12.2(第12章),被引入的证明所消耗的点积性质清单", "node_type": "theorem", "sections": ["15.10"], "statement": "15.10 needs this external result only as the premise set of the proof it imports: Apostol's ground for transplanting the Theorem 12.3 proof is that the proof was a consequence of the properties of the dot product listed in Theorem 12.2 and did not depend on the particular definition used to deduce these properties. Chapter 15 does not cite these properties as established facts; it instead re-declares properties of this kind as the inner-product axioms of 15.10.", "aliases": [], "anchors": [{"file": "15.10.md", "quote": "the proof was a consequence of the properties of the dot product listed in Theorem 12.2 and did not depend on the particular definition used to deduce these properties"}, {"file": "15.10.md", "quote": "That is, we state a number of properties we wish inner products to satisfy and we regard these properties as axioms."}], "origin": "source", "origin_note": "内容边界只来自第15章15.10的引用语。第12章原文不在手上:第15章只说定理12.2 列出了点积的若干性质,并未逐条列出它们,故本节点不枚举这些性质,也不断言它们与15.10 的四条内积公理逐条对应。"}
{"id": "apostol:ext-vn-as-a-prior-vector-space", "name_en": "V_n as a vector space already constructed before Chapter 15", "name_zh": "V_n:第15章之前已建成的向量空间", "node_type": "concept", "sections": ["15.03", "15.06"], "statement": "What Chapter 15 imports here is an object, not a proof. 15.03 introduces V_n already labelled the vector space of all n-tuples, with its operations given only as the usual way in terms of components, and 15.06 names Chapter 12 as where the ideas now being extended were studied, namely in V_n. Chapter 15 never constructs V_n, never states its operations explicitly, and never verifies its axioms; verification of the 15.03 examples is handed to the reader. Within the two sections anchored here V_n serves as the already-built standard instance.", "aliases": ["the vector space of n-tuples"], "anchors": [{"file": "15.03.md", "quote": "the vector space of all n-tuples of real numbers, with addition and multiplication by scalars defined in the usual way in terms of components"}, {"file": "15.03.md", "quote": "The reader can easily verify that each of the following examples satisfies all the axioms for a real linear space."}, {"file": "15.06.md", "quote": "we introduce the concepts of dependence, independence, bases, and dimension. These ideas were encountered in Chapter 12 in our study of the vector space $V_{n}$ ."}], "origin": "source", "origin_note": "内容边界只来自第15章的引用语。第12章原文不在手上,故不陈述第12章如何构造 V_n。本节点只记录第15章把 V_n 当既有对象引入这一事实,以及第15章自己未做构造与公理验证。注意:15.03 例3 在 ch15 一侧另有 L1 节点 apostol:v-n-space;本节点记录的是该对象的外部来源身份,不重复表达例3本身,若审计认为二者重合可判 KILL。"}
{"id": "apostol:ext-chapter-12-finite-dependence-definition", "name_en": "The Chapter 12 definition of dependence and independence for finite sets in V_n", "name_zh": "第12章中 V_n 内有限集的相依与独立定义", "node_type": "concept", "sections": ["15.06", "15.07"], "statement": "Chapter 15 does not import this definition; it replaces it and then asserts compatibility. 15.06 announces that dependence, independence, bases and dimension were encountered in Chapter 12 for V_n and are now being extended, and 15.07 gives a fresh definition and claims that on finite sets it agrees with the Chapter 12 one, the new definition being unrestricted as to finiteness. The agreement is asserted, not verified anywhere in Chapter 15.", "aliases": [], "anchors": [{"file": "15.07.md", "quote": "If S is a finite set, the foregoing definition agrees with that given in Chapter 12 for the space $V_{n}$ . However, the present definition is not restricted to finite sets."}, {"file": "15.06.md", "quote": "These ideas were encountered in Chapter 12 in our study of the vector space $V_{n}$ . Now we extend them to general linear spaces."}], "origin": "source", "origin_note": "内容边界只来自第15章15.06/15.07的引用语。第12章原文不在手上,故不写出第12章的定义原文,也不核对两定义是否真的在有限集上一致 —— 第15章只是断言一致。"}
{"id": "apostol:ext-volume-2-proof-of-the-legendre-closed-form", "name_en": "The Volume II proof of the closed form for the orthogonalized powers", "name_zh": "第II卷中对正交化幂序列闭式的证明", "node_type": "theorem", "sections": ["15.13"], "statement": "A forward outsourcing rather than a back-reference. Having produced y_0 through y_5 by Gram-Schmidt, 15.13 asserts a closed form for y_n as a constant times the n-th derivative of (t^2 - 1)^n and defers the proof to Volume II. Chapter 15 nevertheless uses that closed form immediately, defining the Legendre polynomials P_n by the same derivative expression, so an unproved identity is load-bearing for a definition in this chapter.", "aliases": ["Rodrigues-type formula deferred to Volume II"], "anchors": [{"file": "15.13.md", "quote": "We shall encounter these polynomials again in Volume II in our further study of differential equations, and we shall prove that"}, {"file": "15.13.md", "quote": "y _ {n} (t) = \\frac {n !}{(2 n) !} \\frac {d ^ {n}}{d t ^ {n}} (t ^ {2} - 1) ^ {n}."}], "origin": "source", "origin_note": "内容边界只来自第15章15.13的引用语。第II卷不在手上,故不陈述那里的证明如何进行;此处只记录第15章把该等式的证明推给了第II卷,而自己已经在用它。另注:本节点记录的是前向外包(指向第II卷),不是向后回指;它放在 nodes-H2.jsonl 里是因为该文件承担第15章的全部章外依赖,方向只是其中一维。"}
{"id": "apostol:ext-uncited-dimension-of-a-second-order-de-solution-space", "name_en": "The uncited fact that a second-order homogeneous linear equation has a two-dimensional solution space", "name_zh": "未标注出处的事实:二阶齐次线性方程的解空间是二维的", "node_type": "theorem", "sections": ["15.08"], "statement": "A borrowing with no citation attached. 15.08 Example 3 asserts that the solution space of y'' - 2y' - 3y = 0 has dimension 2, with basis e^{-x} and e^{3x}, and that every solution is a combination of these two. Chapter 15 proves none of this: it verifies neither that the two functions span the solution set nor that no third independent solution exists, and it names no chapter, section or theorem as the source. The independence of the two exponentials is available inside Chapter 15 (15.07 Example 7), but the spanning half is not.", "aliases": [], "anchors": [{"file": "15.08.md", "quote": "EXAMPLE 3. The space of solutions of the differential equation $y'' - 2y' - 3y = 0$ has dimension 2."}, {"file": "15.08.md", "quote": "One basis consists of the two functions $u_1(x) = e^{-x}$ , $u_2(x) = e^{3x}$ . Every solution is a linear combination of these two."}], "origin": "model", "origin_note": "锚点是第15章的断言处,不是引用语 —— 第15章在此处没有引用语,它没有指向任何外部出处。把该事实判为外部的是我们的推断(第15章内确实没有证明它),不是第15章的说法。因此本节点标 origin: model,并且刻意不指名任何第12章或第8章的定理编号:我们无原文可查,指名即为编造归属。"}
{"id": "apostol:ext-uncited-unit-coordinate-basis-of-vn", "name_en": "The uncited fact that the n unit coordinate vectors form a basis of V_n", "name_zh": "未标注出处的事实:n 个单位坐标向量构成 V_n 的基", "node_type": "theorem", "sections": ["15.08"], "statement": "A borrowing with no citation attached. 15.08 Example 1 asserts that V_n has dimension n and that one basis is the set of n unit coordinate vectors. Chapter 15 verifies neither the independence nor the spanning of that set, and names no source. This is the only place where Chapter 15 ties the dimension of V_n to a number, and the tie rests on credit taken from outside the chapter.", "aliases": [], "anchors": [{"file": "15.08.md", "quote": "EXAMPLE 1. The space $V_{n}$ has dimension $n$ . One basis is the set of $n$ unit coordinate vectors."}], "origin": "model", "origin_note": "锚点是第15章的断言处,不是引用语 —— 第15章在此处未给任何出处。判其为外部借用是我们的推断(第15章内无证明),并且我们不指名第12章的任何定理编号:无原文可查,指名即为编造归属。"}
```

上面 jsonl 块内 8 行的顺序是 1、4、5、6、7、9、10、11（第一行单独成块以便附注 `nc` 的说明）。

两处**留给主控裁决、我未擅自改**的口径问题：
1. 行 6 与行 10 我按「sections 无锚不列」删了 15.07/15.10/15.03。若口径是「sections 表示
   该节点在哪些节被提及、不要求条条有锚」，则这两处改回原值，改用补锚方案（候选 quote 与实测
   字符数已列在 §一 节点 6、节点 10）。
2. 行 5 与行 7 把原本只挂在 TD 边上的内容提到了节点 T1 锚点，这会让同一句话同时出现在
   节点锚点与边 evidence 上（edges-H2:10、edges-H2:14）。这是过报通道 (c) 的**人为制造** ——
   我认为值得，因为四层定义下 TD 不入池，不提上来那两句断言就是无支撑的；但报冗余度时
   必须按「新引入的源行数」计（这两处新增源行数为 0，只是记账位置变了）。

## 顺带发现

范围外，每条一行，不展开。

- `apostol:real-euclidean-space`（inherited/nodes-A1.jsonl:48）是定义节点，却拿 15.10:91 的迁移结论句「Therefore, the very same proof is valid in any real Euclidean space.」当锚，且其 statement 尾句「proofs given for V_n carry over verbatim to any real Euclidean space」是全局量词断言 —— 疑似死因 1，建议 A1 层复核。
- `apostol:dimension`（inherited/nodes-A1.jsonl:36）同型：statement 是维数定义原文，却持有 15.08:11 例1 的锚（原主为 `d:dim-of-vn-is-n-via-unit-coordinate-vectors`），疑 B 型借用。
- `d:cauchy-schwarz-proof-inherited-from-theorem-12-3`（nodes-D3.jsonl:25）的 statement 写「those listed properties are **precisely** the inner-product axioms」，而第15章从未逐条列出定理12.2 的性质 —— 该 "precisely" 是模型加的，edges-H2:10 的 rel_note 明确拒绝过这一步，两处口径冲突，建议裁决。
- 全图 node_type 实际取值（`cut -f3 tmp_index/nodes.tsv | sort | uniq -c`）是 concept 258 / theorem 173 / **method 69** / 空 24（L2 节点）/ **notation 22** —— method 与 notation **都不在简报给的封闭词表（concept/theorem/proof-step/example）里，且 proof-step 一个都没用**。这不是个别违规而是词表与数据系统性不一致，须由主控裁决是哪一边过期（H2 的 11 个节点全部只用 concept/theorem，本身合规）。
- shared-quotes.tsv 只做精确 (file,quote) 匹配，查不出「同一源句被切成长短不同两条 quote」的借用（节点 6 锚0 与 `apostol:v-n-space` 的 171 字版本即此例）—— B 型的半机械化手段有这个已知盲区，建议在索引里补一张「子串包含关系」表。
- 15.13.md 的两处 display 公式行（:153 闭式、:159 P_n 定义式）都在源文件里独立成行，可直接当锚点用（我实测 82、134 字符，均在界内）—— 15.13 一带若还有别的节点断言这两个公式而无锚，可用同法补。
- edges-H2:17/:18/:19 三条 requires 边 origin=model 且 evidence 全空（ev_charlen=0），指向的正是节点 9、10、11；它们是否需要补 evidence 属边侧问题，本轮未判。
- 15.08.md:13 例2（多项式 degree ≤ n，dimension n+1）与 :17 例4（多项式全体 infinite-dimensional）是否已有节点持有，我未查 —— 若无，则 15.08 的维数例子覆盖不全。
