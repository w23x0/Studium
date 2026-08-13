# G3c data/edges-H2.jsonl 19 条逐条审查

只读分析代理产出。**未改动 data/ 下任何文件。** 范围严格限于 `data/edges-H2.jsonl` 的 19 条边。

## 〇 结论速览（保留 10 / 修 5 / 撤回 4 = 19）

先说机械层：16 条 `origin=source` 的 evidence 我全部自己 `grep -F` 复核过，**19/19 无问题**——
16 条全部在声明的 file 里逐字连续命中、无跨行、charlen 30–200（实测 56/78/67/67/67/67/112/68/167/116/141/84/107/65/91/127）；
另 3 条（第 17/18/19 行）`origin=model` 且**根本没有 evidence 字段**，是 SPEC 允许的写法，
也不在 `tmp_index/unverified-model-quotes.tsv` 的 15 条盲区里（我核过：H2 命中数 0）。
所以 H2 的 19 条边不存在死因 3（虚构出处）。

争点全在**关系词方向**与**记账位置**：

| 判定 | 条数 | 边行号 |
| --- | --- | --- |
| 保留 | 10 | 2, 5, 6, 8, 9, 11, 12, 15, 16, 17 |
| 修 | 5 | 1, 7, 10, 13, 14 |
| 撤回 | 4 | 3, 4, 18, 19 |

三类问题的分布：
- **方向反了（第 1、7 行）**：`requires` 写成了「后来的定理需要旧定理」，但引文说的是
  「$V=V_n$ 时新定理**退化成**旧定理」——这正好是 `generalizes` 的定义（src 是 dst 的推广），
  方向相反。死因 6（引文不支撑断言）+ 方向错。
- **记账位置重复（第 3、4 行撤回）**：定理级节点与它的 part-of 子节点用**同一条引文**
  各发一条边到同一 dst，第 5、6 行是更细的配对（(a)→12.10(b)、(b)→12.10(c)），
  严格优于第 3、4 行。撤回第 3、4 行不丢信息（T3 上浮）。
- **边两端锚点同源（第 18、19 行撤回）**：src 的 `d:` 节点与 dst 的 `ext-uncited-*` 节点
  引的是**同一句 15.08 原文**（逐字相同，我比对过 anchors.tsv），这条 `requires` 边的两端
  说的是同一句话，不承载任何依赖信息。死因 5（层塌缩）。注意：**我撤的是边，不是节点**——
  「Apostol 没标出处」这个观察本身是真的，应留在 ext 节点的 statement 里，由 G3b 裁决节点存废。

置信度：机械层高（自己 grep 过）。方向判定（1、7）高。撤回 3、4 中（是图质量判断，不是错误）。
撤回 18、19 中高。第 10 行的修法只有中等置信，见该节。

## 一 逐条审查（19 小节）

格式：**结论 / 依据 / 死因 / 建议动作 / 置信度与不确定点**。
引文若已核，写「自核 grep -F 命中 file:line」。

### 1. `apostol:theorem-15-5` --requires--> `apostol:ext-theorem-12-8`

引文（15.07.md, 56 字符）：`When $V = V_{n}$ , Theorem 15.5 reduces to Theorem 12.8.`

- **结论**：关系词方向错。引文说「$V=V_n$ 时 15.5 **退化为** 12.8」，即 15.5 是 12.8 的推广，
  按 SPEC「`generalizes`：src 是 dst 的推广」应为 `generalizes`。现在写成 `requires`
  （「要陈述或理解 src 必须先有 dst」），而**陈述** 15.5 完全不需要 12.8——15.07:59 的定理陈述
  只用线性空间、独立集、$L(S)$，一字未提第 12 章。需要 12.8 的是**证明**，而证明依赖已由
  第 2 行边（src 是 `d:thm-15-5-proof-delegated-to-theorem-12-8`）单独记账，且那条边的引文
  （`Therefore the proof given for Theorem 12.8 is valid...`）才是真正说依赖的句子。
- **依据**：edges.tsv `data/edges-H2.jsonl:1`；引文自核 grep -F 命中 15.07.md:61；
  定理陈述见 15.07.md:59；statements.tsv `apostol:theorem-15-5`。
- **死因**：6（引文不支撑断言，E 型的变体：引文支撑的是相反方向的关系）+ 方向错。
- **建议动作**：FIX，`rel` 改 `generalizes`，引文不动（该引文恰好精确支撑 generalizes）。
- **置信度**：高。不确定点：若综合代理认为「reduces to」也可读作 15.5 的证明预设 12.8，
  那也只能把这条边并入第 2 行，不能保留在 `theorem-15-5` 上。

### 2. `d:thm-15-5-proof-delegated-to-theorem-12-8` --requires--> `apostol:ext-theorem-12-8`

引文（15.07.md, 78 字符）：`Therefore the proof given for Theorem 12.8 is valid for any linear space $V$ .`

- **结论**：正确，无需改。src 节点的 statement 就是「Apostol 在 15.07 没给新论证，
  他论证旧证明可迁移」，要理解这个「委派」必须先有被委派的对象 12.8，`requires` 方向对。
  引文直接说 12.8 的证明被拿来用。
- **依据**：edges.tsv `data/edges-H2.jsonl:2`；自核 grep -F 命中 15.07.md:61；
  statements.tsv `d:thm-15-5-proof-delegated-to-theorem-12-8`。
- **死因**：0。
- **建议动作**：保留。
- **置信度**：高。

### 3. `apostol:theorem-15-7` --requires--> `apostol:ext-theorem-12-10-part-b`

引文（15.08.md, 67 字符）：`The proof of (a) is identical to that of part (b) of Theorem 12.10.`

- **结论**：与第 5 行**同引文、同 dst、记账位置更粗**，建议撤回。第 5 行的 src 是
  `d:thm-15-7a-independent-sets-extend-to-bases`，即引文里的「(a)」所指的那半个定理；
  partof.tsv 显示它是 `apostol:theorem-15-7` 的 part-of 子节点。按四层证据池，
  子节点发出的边的 evidence 是父节点的 T3，父节点并不因撤这条边而失去该证据
  （过报通道 (a)：内容合法下移）。同时第 3 行还有一个方向问题与第 1 行同类：
  引文说的是「(a) 的**证明**等同于 12.10(b)」，定理 15.7 本身的**陈述**（15.08:22–23）
  不需要 12.10；证明委派已由 `d:thm-15-7-proofs-delegated-to-theorem-12-10` 节点承担。
- **依据**：edges.tsv `data/edges-H2.jsonl:3` 与 `:5`（引文 charlen 均 67，逐字相同）；
  自核 grep -F 命中 15.08.md:25；partof.tsv `apostol:theorem-15-7` 行含
  `d:thm-15-7a-independent-sets-extend-to-bases`；shared-quotes.tsv 该 quote n_holders=3。
- **死因**：0（仅记账冗余，不是错误）。
- **建议动作**：撤回。
- **置信度**：中。不确定点：这是图质量判断而非正确性判断；若主控倾向「定理级节点也该显式挂
  外部依赖」，则保留第 3、4 行、撤回第 5、6 行也自洽——但**不要两套都留**。
  我选留细的（5、6），因为它们保住了 (a)↔12.10(b)、(b)↔12.10(c) 的**配对信息**，而 3、4 丢掉这层配对。

### 4. `apostol:theorem-15-7` --requires--> `apostol:ext-theorem-12-10-part-c`

引文（15.08.md, 67 字符）：`The proof of (b) is identical to that of part (c) of Theorem 12.10.`

- **结论**：与第 3 行完全同构，与第 6 行重复。撤回。
- **依据**：edges.tsv `data/edges-H2.jsonl:4` 与 `:6`；自核 grep -F 命中 15.08.md:25；
  partof.tsv `apostol:theorem-15-7` 行含 `d:thm-15-7b-n-independent-elements-form-a-basis`。
- **死因**：0。
- **建议动作**：撤回。
- **置信度**：中，同第 3 行。

### 5. `d:thm-15-7a-independent-sets-extend-to-bases` --requires--> `apostol:ext-theorem-12-10-part-b`

引文（15.08.md, 67 字符）：`The proof of (a) is identical to that of part (b) of Theorem 12.10.`

- **结论**：正确，保留。引文里的「(a)」就是这个 src 节点所对应的那半个定理
  （statements.tsv：「Part (a) asserts an extension property: an independent set ... sits inside some basis」），
  15.08:22–23 的原文确认 (a) 是「any set of independent elements is a subset of some basis」。
  引文说该半定理的证明就是 12.10(b)，`requires` 方向对：这半个断言在第 15 章里**没有证明**，
  要接受它必须先有 12.10(b)。
- **依据**：edges.tsv `data/edges-H2.jsonl:5`；自核 grep -F 命中 15.08.md:25；
  15.08.md:23 原文；statements.tsv `d:thm-15-7a-independent-sets-extend-to-bases`。
- **死因**：0。
- **建议动作**：保留。
- **置信度**：高。不确定点：15.08.md:25 的 n_sentence_end=3（source-lines.tsv），
  一行含 3 句，所以**任何按行号统计的覆盖率都会在此高报**（过报通道 b）；
  该行被第 3/4/5/6 行边和 `d:thm-15-7-proofs-delegated-to-theorem-12-10` 节点共 5 处引用，
  但**新引入的源行数只有 1**。

### 6. `d:thm-15-7b-n-independent-elements-form-a-basis` --requires--> `apostol:ext-theorem-12-10-part-c`

引文（15.08.md, 67 字符）：`The proof of (b) is identical to that of part (c) of Theorem 12.10.`

- **结论**：正确，保留。与第 5 行同构：src 是「n 个独立元素即基」这半定理（15.08:23 原文一致），
  引文说其证明即 12.10(c)。
- **依据**：edges.tsv `data/edges-H2.jsonl:6`；自核 grep -F 命中 15.08.md:25；
  statements.tsv `d:thm-15-7b-n-independent-elements-form-a-basis`。
- **死因**：0。
- **建议动作**：保留。
- **置信度**：高。

### 7. `apostol:cauchy-schwarz-inequality` --requires--> `apostol:ext-theorem-12-3`

引文（15.10.md, 112 字符）：
`When we proved the corresponding result for vectors in $V_{n}$ (Theorem 12.3), we were careful to point out that`

- **结论**：两个问题。(i) 方向与第 1 行同病：引文说 12.3 是「the corresponding result for vectors
  in $V_n$」，即定理 15.8（Cauchy-Schwarz 在一般 Euclidean 空间）是 12.3 的推广，
  应为 `generalizes` 而非 `requires`；15.10:88–89 的定理陈述本身不需要第 12 章。
  (ii) 引文**在从句中间被截断**（以 `point out that` 结尾，后半句在同一行继续），
  截出来的这半句只交代「12.3 是 $V_n$ 里的对应结果」，**不含任何依赖或推广的完整断言**，
  是锚点盲区 C 型（把端点当中间步骤）叠 D 型（覆盖不足）。真正说证明可迁移的句子在
  第 8 行边上（`Therefore, the very same proof is valid in any real Euclidean space.`）。
- **依据**：edges.tsv `data/edges-H2.jsonl:7`；自核 grep -F 命中 15.10.md:91；
  定理陈述见 15.10.md:88–89；statements.tsv `apostol:cauchy-schwarz-inequality`。
- **死因**：6 + 方向错。
- **建议动作**：FIX。`rel` 改 `generalizes`，并把引文截到一个自足的片段：
  `When we proved the corresponding result for vectors in $V_{n}$ (Theorem 12.3)`
  （我实测 77 字符，在 15.10.md:91 内逐字连续，落在 30–200 界内）。
- **置信度**：高（方向）；中高（新引文的取法——它仍是从句，但去掉了悬空的 `that`，
  且单独已能支撑「15.8 是 12.3 在一般空间的对应结果」这一 generalizes 断言）。

### 8. `d:cauchy-schwarz-proof-inherited-from-theorem-12-3` --requires--> `apostol:ext-theorem-12-3`

引文（15.10.md, 68 字符）：`Therefore, the very same proof is valid in any real Euclidean space.`

- **结论**：正确，保留。src 节点讲的就是「15.8 的证明是复用论证，不是新计算」，
  引文的 `the very same proof` 回指的正是上一句的 12.3 的证明（同一行 15.10.md:91 内），
  要理解这个复用必须先有 12.3，`requires` 方向对。
- **依据**：edges.tsv `data/edges-H2.jsonl:8`；自核 grep -F 命中 15.10.md:91；
  statements.tsv `d:cauchy-schwarz-proof-inherited-from-theorem-12-3`。
- **死因**：0。
- **建议动作**：保留。
- **置信度**：高。不确定点：这条引文是**借用引文**（B 型），shared-quotes.tsv 显示
  n_holders=5（另有 `edges-D3.jsonl:24`、节点 `apostol:ext-theorem-12-3`、
  `apostol:real-euclidean-space`、`d:cauchy-schwarz-proof-inherited-from-theorem-12-3` 自身）。
  借用本身不构成缺陷，但**这条边不为节点的证据池贡献新源行**。

### 9. `apostol:ext-theorem-12-3` --requires--> `apostol:ext-theorem-12-2`

引文（15.10.md, 167 字符）：
`the proof was a consequence of the properties of the dot product listed in Theorem 12.2 and did not depend on the particular definition used to deduce these properties`

- **结论**：正确，保留。这是 19 条里唯一一条**两端都是 H2 节点**的边（外部→外部），
  引文直接说 12.3 的证明是 12.2 所列点积性质的推论，`requires`（理解/陈述 12.3 的证明须先有 12.2）
  方向对。这条边也是 `apostol:ext-theorem-12-3` 的 T2（exposure.tsv 里它 T2=1，正是这条）。
- **依据**：edges.tsv `data/edges-H2.jsonl:9`；自核 grep -F 命中 15.10.md:91；
  exposure.tsv `apostol:ext-theorem-12-3` 行 T1=2 T2=1。
- **死因**：0。
- **建议动作**：保留。
- **置信度**：高。不确定点：这条边**同时依赖两个 H2 节点**，是悬空风险最高的一条——
  G3b 若撤任一端，此边必撤。见第四节。

### 10. `apostol:inner-product-axioms` --other--> `apostol:ext-theorem-12-2`

引文（15.10.md, 116 字符）：
`That is, we state a number of properties we wish inner products to satisfy and we regard these properties as axioms.`
`rel_note`（已填，SPEC 要求 `other` 必填）：「重述而非引用：15.10 没有把定理12.2 的点积性质当作既证事实引来……」

- **结论**：关系词与 rel_note 的判断我认可（既非 `equivalent` 也非 `generalizes`，因为第 15 章
  不逐条列出 12.2 的性质，逐条对应无法核实——这个自我限制是对的，也避免了死因 1），
  但**引文不支撑这条边**：这句话（15.10.md:11）通篇没有出现 "Theorem 12.2" 或第 12 章的任何指称，
  它只说「我们把性质当公理」，无法从它读出「与 12.2 的关系」。dst 是 12.2，
  而支撑「axioms 与 12.2 有关」的句子在另一行（15.10.md:91，即第 9 行边所用的那句）。
  这是 E 型（整句无锚，指向 dst 的那半个断言完全没有锚）。
- **依据**：edges.tsv `data/edges-H2.jsonl:10`；自核 grep -F 命中 15.10.md:11
  （该行全文我读过，无 12.2 字样）；15.10.md:91 才是提到 12.2 的行。
- **死因**：6。
- **建议动作**：FIX——`rel`（`other`）与 `rel_note` 保留，把 evidence 换成同章确实指名 12.2 的片段：
  `the proof was a consequence of the properties of the dot product listed in Theorem 12.2`
  （我实测 87 字符，在 15.10.md:91 内逐字连续，30–200 界内）。
- **置信度**：中。不确定点：换引文后这条边仍是**模型推断**性质的连接（「12.2 列的性质 ≈ 内积公理」
  这个等同关系第 15 章从未明说），换的引文只把「15.10 的论证提到了 12.2 的性质清单」钉住，
  并不钉住「axioms 就是那些性质」。若综合代理判定这种连接必须标 `origin: model`，
  那更干净的动作是**撤回**：因为「15.10 重述而非引用」这一观察已完整写在
  `apostol:ext-theorem-12-2` 节点的 statement 里，撤边不丢内容。**两种动作我都能接受，
  倾向 FIX**（`other` + rel_note 已把不确定性写在图里了，这正是 `other` 该干的事）。

### 11. `d:example-3-v-n-with-componentwise-operations` --requires--> `apostol:ext-vn-as-a-prior-vector-space`

引文（15.03.md, 141 字符）：
`the vector space of all n-tuples of real numbers, with addition and multiplication by scalars defined in the usual way in terms of components`

- **结论**：关系词与方向对，保留。引文里的定冠词 `the vector space` 与 `in the usual way`
  正是「先前已建成、此处只按名取用」的语言标志，15.03 Example 3 要成立必须先有那个已建成的 $V_n$，
  `requires` 方向对。
- **依据**：edges.tsv `data/edges-H2.jsonl:11`；自核 grep -F 命中 15.03.md:9；
  statements.tsv `apostol:ext-vn-as-a-prior-vector-space`（「Chapter 15 never constructs V_n」）。
- **死因**：0。
- **建议动作**：保留。
- **置信度**：中高。不确定点：**节点层重复**——`apostol:v-n-space`（nodes-A1.jsonl:11）的 statement
  是「Example 3: V = V_n, the vector space of all n-tuples...」，与 `ext-vn-as-a-prior-vector-space`
  指同一对象；而 `edges-D1.jsonl:121` 已有 `d:example-3-...` --part-of--> `apostol:v-n-space`。
  于是本边在语义上与 D1:121 高度重叠（一个说「是它的组成部分」，一个说「需要先有它」）。
  这是 G3b 该判的节点问题，我只标出依赖关系，不越界裁决。

### 12. `apostol:dot-product-in-vn` --requires--> `apostol:ext-vn-as-a-prior-vector-space`

引文（15.10.md, 84 字符）：`In our study of $V_{n}$ , we defined lengths and angles in terms of the dot product.`

- **结论**：正确，保留。点积是定义在 $V_n$ 上的，要陈述它必须先有 $V_n$，`requires` 方向对；
  引文明确把这件事定位在「our study of $V_n$」（即第 12 章）。
- **依据**：edges.tsv `data/edges-H2.jsonl:12`；自核 grep -F 命中 15.10.md:3；
  statements.tsv `apostol:dot-product-in-vn`。
- **死因**：0。
- **建议动作**：保留。
- **置信度**：高。不确定点：shared-quotes.tsv 显示同一句去掉句末点号的 83 字符版本被
  `edges-D3.jsonl:174` 与 `d:metric-properties-motivate-the-inner-product` 使用——
  两个几乎相同的 quote（83 与 84 字符）并存，机器按 (file,quote) 去重时会当成两条不同证据，
  这会让**去重后的源行数被高报**。本边不新增源行（15.10.md:3 已被占用）。

### 13. `apostol:independent-set` --generalizes--> `apostol:ext-chapter-12-finite-dependence-definition`

引文（15.07.md, 107 字符）：
`If S is a finite set, the foregoing definition agrees with that given in Chapter 12 for the space $V_{n}$ .`

- **结论**：关系词与方向对（15.07 的定义不限于有限集，故它是第 12 章有限集定义的推广，
  src 是推广方，`generalizes` 方向对），但**引文覆盖不足**：所引这句只说「在有限集上两者一致」，
  这是**等价**而非推广；真正把它撑成 `generalizes` 的是紧接的下一句
  `However, the present definition is not restricted to finite sets.`（现在挂在第 14 行边上）。
  单靠现引文，读者只能得出 `equivalent`。这是 D 型（覆盖范围不足）。
- **依据**：edges.tsv `data/edges-H2.jsonl:13`；自核 grep -F 命中 15.07.md:17；
  source-lines.tsv `apostol-ch15/15.07.md` 第 17 行 charlen=173、**n_sentence_end=2**
  （一行两句，正是过报通道 b 的典型）。
- **死因**：6。
- **建议动作**：FIX——引文扩到整行两句：
  `If S is a finite set, the foregoing definition agrees with that given in Chapter 12 for the space $V_{n}$ . However, the present definition is not restricted to finite sets.`
  （我实测 173 字符，为 15.07.md:17 整行，逐字连续、不跨行，落在 30–200 界内）。
- **置信度**：高。

### 14. `apostol:dependent-set` --generalizes--> `apostol:ext-chapter-12-finite-dependence-definition`

引文（15.07.md, 65 字符）：`However, the present definition is not restricted to finite sets.`

- **结论**：关系词与方向对，但引文覆盖不足，方向与第 13 行**互补而相反**：这句只说「不限于有限集」，
  没说「与第 12 章的定义一致」，因此撑不起「是**那个**定义的推广」——推广要求两件事：
  在旧范围内一致 + 新范围更大。第 13 行有前一半、第 14 行有后一半，各自都不完整。
  同一源行（15.07.md:17）含两句，两条边各取一句，正是过报通道 (c) 的形态。
- **依据**：edges.tsv `data/edges-H2.jsonl:14`；自核 grep -F 命中 15.07.md:17；
  source-lines.tsv 该行 n_sentence_end=2；shared-quotes.tsv 该 65 字符 quote n_holders=6
  （`edges-D2.jsonl:29`、`:142`、`edges-X.jsonl:113`、`node:apostol:independent-set`、
  `node:d:dependence-definition-not-restricted-to-finite-sets`）——重度借用。
- **死因**：6。
- **建议动作**：FIX——引文同第 13 行改为 15.07.md:17 整行（173 字符，实测）。
- **置信度**：高。不确定点：改完后第 13、14 行会共用同一条 173 字符引文。这是**可接受的**——
  这一行确实同时支撑两个概念（independent 与 dependent）的同一件事；但要提醒报覆盖率的人：
  第 13、14 两条边合计**新引入的源行数是 1，不是 2**。

### 15. `apostol:ext-vn-c-section-12-16` --is-a--> `apostol:complex-euclidean-space`

引文（15.10.md, 91 字符）：`One example is complex vector space $V_{n}(\mathbf{C})$ discussed briefly in Section 12.16.`

- **结论**：正确，保留。这是 19 条里唯一一条 **src 是 H2 节点、dst 是章内节点**的边
  （其余外部节点都作 dst）。方向对：$V_n(\mathbf{C})$ 是复 Euclidean 空间的一个实例，
  按 SPEC「`is-a`：src 是 dst 的特例/实例」，src=实例、dst=类，正确。
  引文的 `One example is` 直接落在 15.10.md:43，其前一句正是复 Euclidean 空间的定义。
  SPEC 说 `is-a` 与 `generalizes` 互为反向、只写一条——我核过 edges.tsv，
  没有反向的 `complex-euclidean-space --generalizes--> ext-vn-c-section-12-16`，无重复。
- **依据**：edges.tsv `data/edges-H2.jsonl:15`；自核 grep -F 命中 15.10.md:43；
  15.10.md:43 前半句 `A complex linear space with an inner product is called a complex Euclidean space.`；
  SPEC.md:29。
- **死因**：0。
- **建议动作**：保留。
- **置信度**：高。

### 16. `apostol:legendre-polynomials` --requires--> `apostol:ext-volume-2-proof-of-the-legendre-closed-form`

引文（15.13.md, 127 字符）：
`We shall encounter these polynomials again in Volume II in our further study of differential equations, and we shall prove that`

- **结论**：保留，但关系词是**勉强可接受**而非精确。这是唯一一条**前向**外部引用（欠证而非回指）：
  15.13:150 承诺在第 II 卷证明 $y_n(t)=\frac{n!}{(2n)!}\frac{d^n}{dt^n}(t^2-1)^n$（15.13:153），
  紧接着 15.13:156–159 就用这个闭式定义 $P_n$，即**一个未证恒等式承载了本章的一个定义**。
  节点 statement 里的 $P_n$ 双表达式（含 Rodrigues 形式）确实依赖该闭式，`requires`
  （要陈述 src 必须先有 dst）成立。引文以 `and we shall prove that` 结尾、被公式块截断，
  单看是残句（C 型），但**它就是原文行的完整结尾**（15.13.md:150 整行 127 字符、
  n_sentence_end=0，下一行即 `$$`），SPEC 禁止跨行拼接，因此这已是能取到的最好片段。
- **依据**：edges.tsv `data/edges-H2.jsonl:16`；自核 grep -F 命中 15.13.md:150；
  source-lines.tsv 该行 charlen=127、n_sentence_end=0；15.13.md:153、156–159 原文；
  statements.tsv `apostol:legendre-polynomials`。
- **死因**：0。
- **建议动作**：保留。
- **置信度**：中高。不确定点：`requires` 在这里读作「本章的陈述欠这个证明」，
  与它在回指边上的读法（「旧结果已在手」）方向一致但时序相反；封闭词表里没有更合适的词，
  且 SPEC 禁止新造，故不改。若综合代理要区分「已证的外部依赖」与「欠证的外部依赖」，
  那是 SPEC 层的提案，不在本轮范围。

### 17. `d:legendre-normalizing-constant-from-y-n-to-p-n` --requires--> `apostol:ext-volume-2-proof-of-the-legendre-closed-form`（origin=model，无 evidence）

- **结论**：保留。`origin=model` 且**完全省略 evidence**，符合 SPEC（「`origin: model` 可省 evidence」），
  没有把推断伪装成原文，不是死因 3。数学上我核过：src 节点断言
  $P_n=\frac{(2n)!}{2^n(n!)^2}y_n$ 且它「也等于 Rodrigues 表达式」；15.13.md:159 原文的第二个等号
  $=\frac{1}{2^n n!}\frac{d^n}{dt^n}(t^2-1)^n$ 只有把 15.13:153 的闭式代入才成立，
  而那个闭式的证明恰恰被推到第 II 卷。所以「归一化常数这条断言依赖那个未证闭式」是对的，
  `requires` 方向对。这条边是**model 边中做得最规矩的一条**：该说的推断说了，没有伪造引文。
- **依据**：edges.tsv `data/edges-H2.jsonl:17`（ev_charlen=0，ev_quote 空）；
  15.13.md:153 与 15.13.md:159 原文我逐行读过；statements.tsv
  `d:legendre-normalizing-constant-from-y-n-to-p-n`；anchors.tsv 该节点 2 条锚点（134、38 字符）；
  unverified-model-quotes.tsv 中 H2 命中 0（即本边不属那 15 条盲区）。
- **死因**：0。
- **建议动作**：保留。
- **置信度**：中高。不确定点：常数 $\frac{(2n)!}{2^n(n!)^2}$ 与 $\frac{n!}{(2n)!}$ 相乘得
  $\frac{n!}{2^n (n!)^2}=\frac{1}{2^n n!}$，与 15.13:159 一致——这一步我算过；
  更细的第 II 卷内容我**未核**（源文件不在本实验范围内）。

### 18. `d:dim-of-a-second-order-de-solution-space-is-two` --requires--> `apostol:ext-uncited-dimension-of-a-second-order-de-solution-space`（origin=model，无 evidence）

- **结论**：撤回。**这条边的两端引的是同一句 15.08 原文**：anchors.tsv 显示 src 的唯一锚点是
  `One basis consists of the two functions $u_1(x) = e^{-x}$ , $u_2(x) = e^{3x}$ .`（79 字符），
  dst 的两条锚点是
  `EXAMPLE 3. The space of solutions of the differential equation $y'' - 2y' - 3y = 0$ has dimension 2.`（100 字符）
  与**同一条** 79 字符锚点。也就是说 src 与 dst 指的是**第 15 章同一个 Example 3**，
  只是一个记「章内断言」、一个记「未标出处的外部事实」。这条 `requires` 边于是自指：
  「Example 3 的结论需要 Example 3 的结论」，不承载任何依赖信息。
- **依据**：edges.tsv `data/edges-H2.jsonl:18`；anchors.tsv
  `d:dim-of-a-second-order-de-solution-space-is-two` 与
  `apostol:ext-uncited-dimension-of-a-second-order-de-solution-space` 两行的 quote 逐字比对；
  nodes.tsv 两节点分别在 `data/nodes-D2.jsonl:66` 与 `data/nodes-H2.jsonl:10`。
- **死因**：5（伪抽象·层塌缩：src 与 dst 塌成同一句原文）。
- **建议动作**：撤回（**只撤边**）。
- **置信度**：中高。不确定点：dst 节点承载的观察本身是**真的且有价值**
  （15.08 Example 3 只验了独立性、没验张成性，也没标出处），这个观察应留在节点 statement 里，
  节点存废由 G3b 判。我要强调：**撤这条边不等于同意撤那个节点**。

### 19. `d:dim-of-vn-is-n-via-unit-coordinate-vectors` --requires--> `apostol:ext-uncited-unit-coordinate-basis-of-vn`（origin=model，无 evidence）

- **结论**：撤回，与第 18 行完全同构且更彻底：两端的锚点**逐字完全相同**，都是
  `EXAMPLE 1. The space $V_{n}$ has dimension $n$ . One basis is the set of $n$ unit coordinate vectors.`
  （101 字符，anchors.tsv 两行 quote 与 charlen 均一致）。src 与 dst 是同一句原文的两个记账副本，
  `requires` 边内容为空。
- **依据**：edges.tsv `data/edges-H2.jsonl:19`；anchors.tsv
  `d:dim-of-vn-is-n-via-unit-coordinate-vectors` 与 `apostol:ext-uncited-unit-coordinate-basis-of-vn`
  两行逐字比对（charlen 均 101）；nodes.tsv 分别在 `data/nodes-D2.jsonl:64` 与 `data/nodes-H2.jsonl:11`。
- **死因**：5。
- **建议动作**：撤回（**只撤边**）。
- **置信度**：中高。不确定点：同第 18 行——「第 15 章唯一把抽象维数接到具体数字的地方，
  靠的是章外赊来的信用」这个观察值得留，节点存废归 G3b。

## 二 撤回清单

4 条。行号指 `data/edges-H2.jsonl` 内的行号（1-based）。**撤回的都是边，不含任何节点。**

| 行 | src | rel | dst | 死因 | 撤回理由（一句） | 撤后是否丢内容 |
| --- | --- | --- | --- | --- | --- | --- |
| 3 | `apostol:theorem-15-7` | requires | `apostol:ext-theorem-12-10-part-b` | 0 | 与第 5 行同引文同 dst，第 5 行的 src 是它的 part-of 子节点且保住了 (a)↔(b) 配对 | 否，证据经 T3 上浮 |
| 4 | `apostol:theorem-15-7` | requires | `apostol:ext-theorem-12-10-part-c` | 0 | 同上，与第 6 行重复 | 否，T3 上浮 |
| 18 | `d:dim-of-a-second-order-de-solution-space-is-two` | requires | `apostol:ext-uncited-dimension-of-a-second-order-de-solution-space` | 5 | 两端共用同一条 79 字符锚点，边自指 | 否，观察在 dst 节点 statement 内 |
| 19 | `d:dim-of-vn-is-n-via-unit-coordinate-vectors` | requires | `apostol:ext-uncited-unit-coordinate-basis-of-vn` | 5 | 两端锚点逐字全同（101 字符），边内容为空 | 否，同上 |

撤回后 `data/edges-H2.jsonl` 剩 15 条；全图边数 1433 → 1429（若 5 条 FIX 均为原地改，不影响计数）。

对证据池的影响，我逐个核过：
- 撤第 3、4 行后 `apostol:theorem-15-7` 少 2 条 T2，但第 5、6 行仍是它的 T3（partof.tsv 已确认
  两个 src 都是它的子节点），引文完全相同，**池里的 (file,quote) 集合不变**。
- 撤第 18、19 行后，两个 `ext-uncited-*` 节点的池只受 TD 影响——而 TD 本来就不入池
  （这两条边里 ext 节点是 dst），所以**它们的 T1/T2/T3 一条不减**（exposure.tsv:
  `ext-uncited-dimension-...` T1=2 T2=0 T3=0、`ext-uncited-unit-coordinate-basis-of-vn` T1=1 T2=0 T3=0，
  撤边后不变）。src 侧的两个 `d:` 节点也不减，因为它们发出的这条边 evidence 为空（ev_charlen=0），
  本来就没给池贡献任何东西。**这四条边的证据贡献净值为零**，这也是它们该撤的旁证。

## 三 修改清单（改后 JSON 行全文）

5 条。以下 JSON 行**我已实际构造并机器复核**：每条 evidence 都用 `in` 做了逐行子串检查，
命中行号与实测 charlen 都写在注释里；无跨行、无省略号、未改标点、未修 OCR 噪声。
`origin` 全部保持 `source`（引文仍是逐字原文），第 10 行的 `rel_note` 原样保留。

改动一览：第 1、7 行改 `rel`（`requires`→`generalizes`），第 7 行同时换引文；
第 10 行只换引文；第 13、14 行只换引文（扩到整行）。

```jsonl
# line 1  rel: requires -> generalizes  ev 不变 charlen=56  命中 15.07.md:61
{"src": "apostol:theorem-15-5", "rel": "generalizes", "dst": "apostol:ext-theorem-12-8", "origin": "source", "evidence": {"file": "15.07.md", "quote": "When $V = V_{n}$ , Theorem 15.5 reduces to Theorem 12.8."}}
# line 7  rel: requires -> generalizes  ev 换: charlen 112 -> 77  命中 15.10.md:91
{"src": "apostol:cauchy-schwarz-inequality", "rel": "generalizes", "dst": "apostol:ext-theorem-12-3", "origin": "source", "evidence": {"file": "15.10.md", "quote": "When we proved the corresponding result for vectors in $V_{n}$ (Theorem 12.3)"}}
# line 10  rel 不变(other)  ev 换: charlen 116 -> 87  命中 15.10.md:91  rel_note 原样
{"src": "apostol:inner-product-axioms", "rel": "other", "dst": "apostol:ext-theorem-12-2", "origin": "source", "evidence": {"file": "15.10.md", "quote": "the proof was a consequence of the properties of the dot product listed in Theorem 12.2"}, "rel_note": "重述而非引用:15.10 没有把定理12.2 的点积性质当作既证事实引来,而是把同类性质重新声明为内积公理。第15章说明了为什么可以这样做(那个证明只用到所列性质,不依赖具体定义),但不逐条列出定理12.2 的性质,故不可判为 equivalent 或 generalizes —— 逐条对应无法从第15章核实。"}
# line 13  rel 不变(generalizes)  ev 换: charlen 107 -> 173(整行两句)  命中 15.07.md:17
{"src": "apostol:independent-set", "rel": "generalizes", "dst": "apostol:ext-chapter-12-finite-dependence-definition", "origin": "source", "evidence": {"file": "15.07.md", "quote": "If S is a finite set, the foregoing definition agrees with that given in Chapter 12 for the space $V_{n}$ . However, the present definition is not restricted to finite sets."}}
# line 14  rel 不变(generalizes)  ev 换: charlen 65 -> 173(同上整行)  命中 15.07.md:17
{"src": "apostol:dependent-set", "rel": "generalizes", "dst": "apostol:ext-chapter-12-finite-dependence-definition", "origin": "source", "evidence": {"file": "15.07.md", "quote": "If S is a finite set, the foregoing definition agrees with that given in Chapter 12 for the space $V_{n}$ . However, the present definition is not restricted to finite sets."}}
```

应用前主控需注意两件事：
1. 第 1、7 行改成 `generalizes` 后，SPEC.md:29 规定「`is-a` 与 `generalizes` 互为反向，只写一条」。
   我核过 edges.tsv 全表：**不存在** `ext-theorem-12-8 --is-a--> theorem-15-5` 或
   `ext-theorem-12-3 --is-a--> cauchy-schwarz-inequality`，所以不会撞出反向重复边。
2. 第 13、14 行改后共用同一条 173 字符引文。若之后要统计「引文冗余度」，
   请按**新引入的源行数**算（这两条合计 1 行），别按池条数算。

## 四 对 H2 节点的依赖表（每条边 → 它两端属于 nodes-H2 的 id，供交叉悬空检查）

**关键事实（供综合代理直接用）**：19 条边**每一条都至少有一端是 nodes-H2 节点**；
且我核过 edges.tsv 全表——`data/edges-H2.jsonl` **之外没有任何一条边**引用带 `:ext-` 的 id
（`awk` 过滤 src 或 dst 含 `:ext-` 且文件非 edges-H2 的行，结果为 0 条）。
所以**任一 H2 节点被 G3b 判撤，则挂在它上面的 H2 边必须同时撤，无别处可挂**。

「另一端」列标注该端点所在文件，便于判断它是否也可能被别的代理撤。

| 边行 | 依赖的 H2 节点（可能悬空的一端） | 另一端 id（所在文件） | 我的判定 | G3b 撤该 H2 节点时的后果 |
| --- | --- | --- | --- | --- |
| 1 | `apostol:ext-theorem-12-8`（dst） | `apostol:theorem-15-5`（inherited/nodes-A1:31） | FIX→generalizes | FIX 作废，改为撤边 |
| 2 | `apostol:ext-theorem-12-8`（dst） | `d:thm-15-5-proof-delegated-to-theorem-12-8`（nodes-D2:45） | 保留 | 必撤 |
| 3 | `apostol:ext-theorem-12-10-part-b`（dst） | `apostol:theorem-15-7`（inherited/nodes-A1:38） | 撤回 | 已撤，无额外后果 |
| 4 | `apostol:ext-theorem-12-10-part-c`（dst） | `apostol:theorem-15-7`（inherited/nodes-A1:38） | 撤回 | 已撤，无额外后果 |
| 5 | `apostol:ext-theorem-12-10-part-b`（dst） | `d:thm-15-7a-independent-sets-extend-to-bases`（nodes-D2:68） | 保留 | 必撤；且因我已撤第 3 行，`theorem-15-7` 将完全失去到 12.10(b) 的记录 |
| 6 | `apostol:ext-theorem-12-10-part-c`（dst） | `d:thm-15-7b-n-independent-elements-form-a-basis`（nodes-D2:69） | 保留 | 必撤；同上，对应 12.10(c) |
| 7 | `apostol:ext-theorem-12-3`（dst） | `apostol:cauchy-schwarz-inequality`（inherited/nodes-A1:52） | FIX→generalizes | FIX 作废，改为撤边 |
| 8 | `apostol:ext-theorem-12-3`（dst） | `d:cauchy-schwarz-proof-inherited-from-theorem-12-3`（nodes-D3:25） | 保留 | 必撤 |
| **9** | **`apostol:ext-theorem-12-3`（src）+ `apostol:ext-theorem-12-2`（dst）—— 两端都是 H2** | 无非 H2 端 | 保留 | **撤任一端即必撤；风险最高的一条** |
| 10 | `apostol:ext-theorem-12-2`（dst） | `apostol:inner-product-axioms`（inherited/nodes-A1:43） | FIX（换引文） | FIX 作废，改为撤边 |
| 11 | `apostol:ext-vn-as-a-prior-vector-space`（dst） | `d:example-3-v-n-with-componentwise-operations`（nodes-D1:50） | 保留 | 必撤（注：`edges-D1.jsonl:121` 到 `apostol:v-n-space` 的 part-of 边不受影响，内容不全丢） |
| 12 | `apostol:ext-vn-as-a-prior-vector-space`（dst） | `apostol:dot-product-in-vn`（inherited/nodes-A1:45） | 保留 | 必撤 |
| 13 | `apostol:ext-chapter-12-finite-dependence-definition`（dst） | `apostol:independent-set`（inherited/nodes-A1:27） | FIX（换引文） | FIX 作废，改为撤边 |
| 14 | `apostol:ext-chapter-12-finite-dependence-definition`（dst） | `apostol:dependent-set`（inherited/nodes-A1:26） | FIX（换引文） | FIX 作废，改为撤边 |
| 15 | `apostol:ext-vn-c-section-12-16`（**src**，唯一一条 H2 作 src 且另一端是章内节点） | `apostol:complex-euclidean-space`（inherited/nodes-A1:49） | 保留 | 必撤 |
| 16 | `apostol:ext-volume-2-proof-of-the-legendre-closed-form`（dst） | `apostol:legendre-polynomials`（nodes-A2-s1:10） | 保留 | 必撤；本章「未证闭式承载定义」这一欠证事实将无边记录 |
| 17 | `apostol:ext-volume-2-proof-of-the-legendre-closed-form`（dst） | `d:legendre-normalizing-constant-from-y-n-to-p-n`（nodes-D4:24） | 保留 | 必撤 |
| 18 | `apostol:ext-uncited-dimension-of-a-second-order-de-solution-space`（dst） | `d:dim-of-a-second-order-de-solution-space-is-two`（nodes-D2:66） | 撤回 | 已撤，无额外后果 |
| 19 | `apostol:ext-uncited-unit-coordinate-basis-of-vn`（dst） | `d:dim-of-vn-is-n-via-unit-coordinate-vectors`（nodes-D2:64） | 撤回 | 已撤，无额外后果 |

按 H2 节点反查（G3b 撤某节点时，一次要连带处理的边）：

| H2 节点 | 挂在它上面的 H2 边（行号） | 其中我判保留/FIX 的 |
| --- | --- | --- |
| `apostol:ext-theorem-12-8` | 1, 2 | 1(FIX), 2(保留) |
| `apostol:ext-theorem-12-10-part-b` | 3, 5 | 5(保留) |
| `apostol:ext-theorem-12-10-part-c` | 4, 6 | 6(保留) |
| `apostol:ext-theorem-12-3` | 7, 8, 9 | 7(FIX), 8(保留), 9(保留) |
| `apostol:ext-theorem-12-2` | 9, 10 | 9(保留), 10(FIX) |
| `apostol:ext-vn-as-a-prior-vector-space` | 11, 12 | 11(保留), 12(保留) |
| `apostol:ext-chapter-12-finite-dependence-definition` | 13, 14 | 13(FIX), 14(FIX) |
| `apostol:ext-vn-c-section-12-16` | 15 | 15(保留) |
| `apostol:ext-volume-2-proof-of-the-legendre-closed-form` | 16, 17 | 16(保留), 17(保留) |
| `apostol:ext-uncited-dimension-of-a-second-order-de-solution-space` | 18 | 无 |
| `apostol:ext-uncited-unit-coordinate-basis-of-vn` | 19 | 无 |

最后两行值得注意：两个 `ext-uncited-*` 节点在**整张图里各只有一条边**，而那条边正是我判撤的。
撤边后它们变成孤立节点（度 0）。这不是我在替 G3b 判它们该死——只是把这个后果摆出来：
**若 G3b 保留它们，主控需要给它们另找一条有内容的边，否则图里会留两个孤点。**

## 顺带发现

范围外，每条一行，不展开。

- `apostol:v-n-space`（inherited/nodes-A1:11）与 `apostol:ext-vn-as-a-prior-vector-space`（nodes-H2:6）statement 指同一对象，疑似节点级重复，归 G3b。
- 15.10.md:3 有两条近乎相同的 quote 并存（83 与 84 字符，差句末点号），机器按 (file,quote) 去重会当成两条不同证据，会高报去重后源行数。
- A7-H层整合.md §0 称「H1/H2 引文逐字命中、字符数全落 30–200」——就 H2 边而言我复核为真，但它同时说「19 条边引文」，实际只有 16 条带引文（3 条 origin=model 无 evidence），该表述需回改。
- `d:thm-15-7-proofs-delegated-to-theorem-12-10`（有 135 字符两句锚点）自身没有任何边指向 12.10 的两个 ext 节点，委派记录挂在别处，记账位置偏。
- 15.08.md:25 一行 3 句、15.07.md:17 一行 2 句、15.10.md:91 一行 3 句，都是 H2 密集取证的行，按行号统计覆盖率必然高报（通道 b）。
- 本轮我未核第 II 卷任何内容（源文件不在实验范围），第 16、17 行边关于「Volume II 会证」的部分只核到第 15 章一侧。
