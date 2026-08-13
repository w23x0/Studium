# 审查报告：形式 D / 形式 E（D3 + D4）

审查者：FD34（Form-D Hunter，files D3 & D4）
目标文件：`data/nodes-D3.jsonl`（15.10–15.11）、`data/nodes-D4.jsonl`（15.13–15.15 及少量 15.08/15.10/15.11）

## 1. 覆盖声明

本报告合并 D3（69 节点）与 D4（54 节点）共 **123 个节点**，全部计数均为**逐行计数**
（`tmp_index/nodes.tsv` 按 `loc` 列筛 `data/nodes-D3.jsonl` / `data/nodes-D4.jsonl`，实测 69 / 54）。

### 1.1 各区间的来源与完整性

| 区间 | 节点数 | 来源 | 状态 |
| --- | --- | --- | --- |
| D3 行 1–20 | 20 | **本报告附录「D3 批次 1」（行 1–10）与「D3 批次 2」（行 11–20）** | 已审，无独立分片文件 |
| D3 行 21–45 | 25 | `待应用-提案/G6d-D3-片21-45-摘要.md` | 已审 |
| D3 行 46–69 | 24 | `待应用-提案/G6d-D3-片46-69-摘要.md` | 已审 |
| D4 行 1–27 | 27 | `待应用-提案/G6d-D4-片1-27-摘要.md` | 已审 |
| D4 行 28–54 | 27 | `待应用-提案/G6d-D4-片28-54-摘要.md` | 已审 |
| 合计 | **123** | | 无缺口 |

**D3 行 1–20 的去向已查清，不是审计缺口。** 这 20 个节点审在本报告自己的附录里
（附录「逐批次审查原始记录（append-only，防中断）」下的 D3 批次 1、批次 2），
故没有对应的 `审查-形式D-D3-片*.md` 分片文件、也没有 `G6d-D3-片1-20-摘要.md`。
核验方法：把附录两批共 20 条记录的节点 id 与 `nodes.tsv` 中 `data/nodes-D3.jsonl:1` 至 `:20`
的 id 逐行比对，**20/20 一一对应、顺序一致**（`d:inner-product-real-valued-and-quantifiers` …
`d:integral-inner-product-analogy-with-component-sum`）。因此 D3 三个区间 20+25+24 = 69，与
`nodes.tsv` 实测的 69 相符。D4 两个分片 27+27 = 54，亦与实测 54 相符，**D4 完整**。

四份 `G6d-*-摘要.md` 均已 `ls` 确认存在（26760 / 18125 / 20852 / 19776 字节），无缺失，
故不存在「缺某分片摘要、该区间未计入」的情形。

### 1.2 裁决计数（n = 逐行计数，逐行可从各裁决表数出）

| 来源 | 节点数 | KILL | FIX | 保留 |
| --- | --- | --- | --- | --- |
| D3 1–20（本报告附录） | 20 | 0 | 4 | 16 |
| D3 21–45 | 25 | 0 | 23 | 2 |
| D3 46–69 | 24 | 0 | 17 | 7 |
| D4 1–27 | 27 | 0 | 12 | 15 |
| D4 28–54 | 27 | 0 | 15 | 12 |
| **合计** | **123** | **0** | **71** | **52** |

「FIX」= 分片给出了强制或建议的改写/补锚动作；「保留」= 无强制动作（含「可补锚」的可选建议）。
**KILL 0 条、撤回 0 条**：五个区间无一节点被判 KILL。D3 46–69 与 D4 28–54 两行的数字与其摘要
〇速览自报的（15/9、17/10）**不一致**，成因与裁决无关、见「分片间冲突」一节；两处偏差方向相反
（+2 / −2）恰好抵销，故 **71 / 52 这两个合计数在两种口径下都成立**。

### 1.3 分片间冲突

本组共 3 处口径冲突 + 2 处需交叉核的悬置项，逐条给裁决。

**冲突 1（口径，非事实）：D3 46–69 的 FIX/保留 计数。**
结论：按裁决表逐行计数取 **17 FIX / 7 保留**。
依据：`G6d-D3-片46-69-摘要.md` 〇速览自报 15/9，其一裁决表 24 行的「动作」列逐行数出 17/7。
差额成因：本报告 §1.2 的 FIX 定义把「保留+补锚」计入 FIX，摘要 〇速览 把它计入保留。
另该摘要**自身不自洽**：〇速览把 L63、L64 列入「保留、无需动作」，而其裁决表这两行的动作列
写的是「保留+补锚」。死因 0（记账错，不是裁决分歧）／建议动作：采本报告口径／置信度高。

**冲突 2（同型口径差）：D4 28–54 的 FIX/保留 计数。**
结论：按裁决表动作列逐行取 **15 FIX / 12 保留**。
依据：`G6d-D4-片28-54-摘要.md` 〇速览自报 17/10（按「缺陷分型」9 D + 8 E 计），
其裁决表动作列实为 15/12。差额全在 **L28 与 L46**：两条在分型里算 E/D，但动作列写「保留」
（L28 已标 `origin: model`、披露到位；L46 判为笔误级、只给建议）。死因 0／采本报告口径／置信度高。
两处偏差方向相反（D3 +2、D4 −2），故 §1.2 的 **71 / 52 在两种口径下都成立**。

**冲突 3（实质裁决冲突，本组唯一）：D4 L48 的 T3 究竟补不补得上。**
结论：**L48 属 T3 塌陷**，分片的 `6→0` 结论正确，但它给的理由是错的。
依据：`G6d-D4-片28-54-摘要.md` §五 断言「L48 的 claim 2–7 是父节点自造/自称的内容，T3 补不上」。
实测不成立 —— `partof.tsv` 显示 L48 有 4 个 part-of 子节点
（`d:approximation-proof-starts-from-the-orthogonal-decomposition`、`d:x-minus-t-splits-orthogonally`、
`d:pythagorean-split-of-the-approximation-error`、`d:equality-holds-exactly-when-t-equals-s`），
`pool.tsv` 中 L48 的 T3 共 23 条，逐字持有分片指认「一条都没进」的证明体各行：
`15.15.md:14`（x−t=(x−s)+(s−t)）、`:17`（正交分解＋勾股）、`:20`（‖x−t‖²=‖x−s‖²+‖s−t‖²）、
`:23`（‖s−t‖²≥0 与等号 iff）；claim 7 的定理 15.9(b) 归因由再下一层后代
`d:strict-minimality-rests-on-positivity-of-the-norm` 以 `15.10.md:22`／`:125` 持有。
死因 6（按规则会因边证据免除，此处经 T3 免除）／建议动作：**保留父节点，补锚为可选工程建议**／
置信度高（逐条比对 `pool.tsv` 与 `source-lines.tsv` 的 `15.15.md:11–23`）。
**连带更正：§2.1 把 L48 排在第 3 重，应下调。** 分片对 T1 层的事实描述（两锚都是定理陈述、
一条未进证明体 `15.15.md:11–23`）成立，但由此得出的「存在理由整个落在射程外」不成立。
不确定点：这不改「父节点自身无证明体锚点」这一记账事实。

<!-- CHUNK1B -->

## 2. 确认的形式 D 实例（SCOPE-SHORTFALL）

合计 **28 条**确认实例（n = 逐行计数），另 2 条边界个案单列。

| 来源 | 条数 | 节点（行号） |
| --- | --- | --- |
| D3 1–20 | 2 | L2 `d:inner-product-axiomatic-not-formula`、L9 `d:hermitian-symmetry-axiom` |
| D3 21–45 | 3 | L25、L33、L43 |
| D3 46–69 | 6 | L51、L69、L66、L57、L61、L50（分片编号 D-1…D-6） |
| D4 1–27 | 8 | 行 4、10、14、16、20、22、23、27 |
| D4 28–54 | 9 | L29、36、42、43、44、45、46、48、49 |
| **合计** | **28** | |

边界个案 2 条，不计入 28：**D3 L30** `d:norm-vanishes-at-the-zero-element` 兼 D/E 两型
（其摘要 §四 E-2 已披露同一份分片内三处标签不一致，本报告按其 §1/§3 归 E）；
**D3 L49** `d:trigonometric-orthogonal-system` claim 3 属 D/C 边缘（锚给结论句、断言要的是正交关系式），
其分片未给它独立的 D-n 编号，按 D-1…D-6 统计会漏掉。

### 2.1 最重的实例（按各分片自评取，跨片对齐后排序）

1. **D4 行 14** `d:zero-is-the-only-element-orthogonal-to-itself` —— 全组唯一被明判**死因 1** 的实例。
   `exactly two load-bearing places` 是全章穷尽性断言，被 `15.11.md:15`（定理 15.10 证明里
   "But $(x_1,x_1)\neq O$ since $x_1\neq O$ so $c_1=0$"）推翻。推翻路径是**换语言再查**：
   按 "orthogonal to itself" 字面 grep 只命中断言自称的三处，换成内积语言才出现第三个使用点。
   附带图内后果：`d:15-10-proof-divide-by-nonzero-self-inner-product` 与本节点之间缺一条 `requires` 边
   （其摘要已用 `edges.tsv` 核实该节点只有 4 条边、确无指向本节点者）。
2. **D3 L51 + L69** 并列（分片明言「D-1（最重）」「D-2（最重，与 D-1 同型配对）」）——
   同一种越界犯两次：把 (15.11)/(15.12) 的有限维正交规范基结论「特化」到无限维 `C(0,2π)`
   上的无限三角系。分片建议合并裁定、同判死因 1；主控 §4.11 的 D3 46–69 句粒度裁定已覆盖本区间。
3. **D4 L48** `d:approximation-inequality-with-equality-only-at-the-projection` ——
   两条锚点全是定理陈述（`15.15.md:3`、`:9`），**一条都没进证明体 `15.15.md:11–23`**，
   而节点 `name_en` 自称的就是证明结构，故其存在理由整个落在射程外。分片称这是
   「D 型最危险的形态」：锚点主题高度相关、扫一眼觉得对，只覆盖「断言是什么」、不覆盖「为什么成立」。
   这正是盲区五型里的 **D 型（覆盖范围不足）**，机器查不出来。
4. **D3 L66** `d:parseval-formula-statement` —— 全组唯一一例「**锚点里有的限定词在断言里被抹掉**」
   （锚点 2 = `15.11.md:75` 逐字含 finite-dimensional，claim 3 复述成 **every**）。
   这一形态可半机械化检出，值得单列。
5. **D3 L33** `d:norm-properties-abc-follow-at-once-from-the-axioms` —— 与同胞 L31/L32 自相矛盾，
   且冲突的一方正是超出射程的一方（claim 3「每条都是单条公理的一步翻译」为假，(c) 需齐性+对称两条）。
6. **D4 行 27** `d:s-perp-closure-follows-from-linearity-in-the-first-argument` —— 实/复分裂专项
   在 D4 1–27 的唯一命中：用**实**线性空间定义段的对称公理 (1) 去证含复空间的一般结论；
   结论在复空间仍真，但写出的论证路径在复空间断裂。分片给了「严办为死因 6」的备选。

### 2.2 死因分布（逐行计数）

- **死因 1（量词过度断言）**：明判 4 条 —— D4 行 14；D3 L51、L66、L69（后三条为分片建议值，
  分片把 1 vs 0+强制改写的取舍权交裁定员）。边界档 5 条 —— D4 行 4、10、22（分片写「0（改写）；严办为 1」）、
  D3 L43 末句、D3 L41 claim 2（低度候选）。按本实验规则，**死因 1 不因边证据而免除**。
- **死因 6（引文不支撑断言，在用未进 SPEC）**：备选 5 条 —— D3 L2、L9（本报告附录）、L33 claim 3、
  D4 行 27、D4 L48（分片记为 `6→0`，因断言为真而裁 0）。按规则死因 6 **会**因边证据免除，
  但第 5 节的实测显示这 5 条的 T2 均无相关增量，故免除路径在本组数据下不成立。
- **死因 4（数学错误）**：备选 2 条 —— D4 L51 末句（严格读量纲不对，成立的是误差**平方**之差）、
  D3 L67 claim 2（「两节之内」的定位性假陈述，非数学错误，分片自陈从严可 4）。
- **死因 3（虚构出处）**：候选 1 条 —— D3 L26 `d:cauchy-schwarz-in-norm-form` 的方程编号错引
  （statement 称 "(15.7)" 是 CS 的编号，而 `\tag{15.7}` 全书唯一出现在 `15.11.md:46`、内容是 x=Σcᵢeᵢ，
  定理 15.8 的显示行 `15.10.md:86` 根本没有编号）。分片判 0，其摘要建议复核死因归属，本报告同意应复核。
- **死因 2（虚构成员）、死因 5（伪抽象·层塌缩）**：**0 条实质实例**，五个区间均无。

## 3. 确认的形式 E 实例（unanchored clause）

合计 **53 条**（n = 逐行计数，逐行可从下表所列节点数出）。形式 E 是本组的**主形态**：
123 个节点里 53 条含确认的无锚从句，而形式 D 仅 28 条。

| 来源 | 条数 | 节点（行号/编号） | 口径说明 |
| --- | --- | --- | --- |
| D3 1–20 | 2 | L1 末句 "exactly"、L20 末句尾部 | 附录两条明写「形式 E」 |
| D3 21–45 | 20 | L21–24、26–36、38–41、44、45（扣除 L25/33/43 归 D、L37/42 支撑充分） | 分片自报 20，见下「记账更正」 |
| D3 46–69 | 17 | 24 节点 − 6 条形式 D（L51/69/66/57/61/50） − 1 条边界（L49） | **派生值，非分片自报** |
| D4 1–27 | 6 | 行 3、7、9、15、21、25 | 分片自报 |
| D4 28–54 | 8 | L28、30、31、34、35、38、51、54 | 分片自报 |
| **合计** | **53** | | |

**两个计数轴不可混用，务必分清。** 28（形式 D）+ 53（形式 E）= **81 条指控**，按**缺陷形态**逐节点计
（各片可数出：D3 1–20 = 2+2、D3 21–45 = 3+20、D3 46–69 = 6+17、D4 1–27 = 8+6、D4 28–54 = 9+8）；
§1.2 的 71 FIX / 52 保留按**处置动作**计。二者不相等是口径差、不是矛盾：有指控但判「保留」的
情形有两类 —— 内容已披露（标了 `origin: model`）或原则上不可锚（§3.2），本组共 11 条（§5.2）。
**我不给这两个轴之间的精确恒等式**：81 里 D3 46–69 的 17 是派生上界（§3 口径说明），
且形态是按节点计、动作也是按节点计，但同一节点可同时含 D 与 E 从句（D4 L36 即如此，只计入 D）。
故 **81 应读作上界**，能逐行数出的硬数是 §1.2 的 71 / 52 与 §2 的 28。

**D3 21–45 的 E 清单须按更正后的名单取，不能照抄分片 §3 组表。** 该组表把判「支撑充分」的
L37、L42 误列进 E-3 组，同时漏掉 L26、L40；多算 2、漏算 2 恰好抵销，总数仍是 20，掩盖了归组错。
依据：`G6d-D3-片21-45-摘要.md` §四 E-1 第 1 项（该摘要已用 `nodes.tsv` 复核）。死因 0（记账错）。

**D3 46–69 的 17 是我按定义算出的，分片没给 D/E 三分法。** 该分片只报「24/24 个节点均含至少
一条无锚 claim」（其自报的 23 低报 1，已由摘要 §四 第 2 项更正），未做 D/E 分型。
不确定点：这 17 条里未逐条区分「原则上不可锚」与「可引未引」，故 17 是上界。

### 3.1 最重的 E 实例

1. **D4 L30** `d:orthogonal-decomposition-existence` —— 全组最重的 E，且**未披露**。
   「四义务 / 构造 vs 验证 / 基是唯一任意输入 / 唯一性使之良定」整套是模型自造的证明分类学，
   原文无一字对应，而 `nodes.tsv` 实测该节点 `origin` 列为空。同片区 L40 做同类重构却标了
   `origin: model` 并在 statement 内自陈，是现成的对照样板。
2. **D3 L30** `d:norm-vanishes-at-the-zero-element` —— 全组唯一「中心断言零逐字覆盖」，
   且成因完全是 SPEC 30 字符下限（`15.10.md:123` 实测 29 字符，差 1 字符）。**不判生产者。**
3. **D3 21–45 的「最该引却没引」五连**：L29（缺口就在被引 `:121` 正上方一行）、L39、L24
   （6 条 claim 只 1 条有锚）、L44（本片区唯一跨文件论证却零外部锚点）、L45。五条共性是
   缺口锚点存在、合规、且锚点槽位空着，属记账位置问题而非缺证。
4. **D3 L20** `d:integral-inner-product-analogy-with-component-sum` —— 无锚之外还有因果归属偏差：
   与 (15.5) 的类比不能交付正定性，真正依赖的是 `15.10.md:59` 把空间限制为 continuous。
   括号内表述自身正确（已写明 continuous），故不判死因。

### 3.2 原则上不可锚的 E（不构成缺陷，登记以免下游误判）

反事实分析类：D3 L3、L4、L6、L7（去掉某条公理后的后果链，逐条核真成立）、D3 L55、D4 L53。
负向穷举类：D4 L31 的「唯一性一半与勾股从不使用有限维」，分片独立核为真。
教材未写的验算类：D4 行 15（V=R、(x,y):=−xy 反例）、行 19、行 25（常数正性）。
本章外依据类：D3 L42 的「余弦在 [0,π] 严格递减」属第 2/6 章，两源文件内确无可引依据。
这些的正确处置是补 `origin: model`，不是补锚。

## 4. 四个专项检查

### 4.1 有限维假设的增删

**本组命中 5 条实质缺陷 + 2 条正向核过（n = 逐行计数）。** 这是四个专项里命中最集中的一项，
因为 D3 46–69 落在 15.11（定理 15.11/15.12 都带 finite-dimensional 前提）、D4 落在 15.13–15.15
（Gram-Schmidt 与投影都要消耗有限维假设）。

| 区间 | 命中 | 具体 |
| --- | --- | --- |
| D3 1–20 | 1 | L2 末句把 15.8–15.12 全体外推到「every model, including function spaces」，而 Thm 15.11（`15.11.md:43`）、15.12（`:77`）都以 finite-dimensional 为前提，在 C(0,2π) 上 Parseval 不成立 |
| D3 21–45 | **0，专项落空** | 行 21–45 全落在 15.10 与 15.11 开头，那里无有限维定理。只核了两处跨引（L45→Thm 15.10 首句、L31→(15.8)），均正确 |
| D3 46–69 | 3 | L51、L69 把 (15.11)/(15.12) 的有限维结论「特化」到无限维 C(0,2π)（同型犯两次）；L66 把锚点里逐字含的 finite-dimensional 复述成 **every** |
| D4 1–27 | 2 | 行 22「the only role」「the single point at which the hypothesis is consumed」为排他性断言，锚点只到「有限维 ⇒ 存在有限基」，且 V={O} 的退化情形不提供可喂入的有限基；行 16 的锚只证**序列**无限、不证**空间**无限维（补口在 `15.08.md:17`，187 字符） |
| D4 28–54 | 0 缺陷 + 1 正向 | 行 31 的「exactly once」与「唯一性一半与勾股从不使用有限维」是负向穷举，分片独立核为真 |

正向登记 2 条：**D3 L59** 的锚点（`:43` + `:46`）完整覆盖有限维前提，是本组处理该假设最规范的一处；
**D3 L45** 只取 `15.11.md:7` 首句的非零假设、**未擅自加有限维**，通过。

机器扫描不可靠，须人工：D3 21–45 的机器扫描 4 条命中**全部假阳性**，成因是 "de**finite**ness"
内含 "finite" 子串。该分片未列出 4 条具体行号，此项无法复核（信息缺失，非算错）。

### 4.2 实 / 复 Euclidean space 分裂

**本组命中 5 条缺陷 + 1 条登记未判 + 大量正向（n = 逐行计数）。** 这是内容上最富的专项。

缺陷 5 条：
- **D4 行 27**（本组该专项最重，分片给「严办为死因 6」备选）—— 用**实**线性空间定义段的对称公理 (1)
  去证含复空间的一般结论。结论在复空间仍真（共轭有加性），但**写出的论证路径在复空间断裂**。
  反证在 `15.10.md:29`、`:45`。分片倾向「只在 statement 加限定」而不花锚点预算。
- **D3 L9** claim 2「Every other axiom is kept verbatim」为假：`15.10.md:35` 明写 homogeneity 的 c
  可为任意复数。且与同文件 `d:complex-homogeneity-allows-complex-scalars` 自称「第二处修改」互相矛盾。
- **D3 L24** claim 4 的「c>0/c<0 与夹角」只在实空间有意义，而定理 15.8 实复皆成立，节点未限定。
- **D3 L39** claim 3 隐含商为实数，只在实空间成立，节点无实限定。
- **D3 L65** 术语错：该 Parseval 形式对第二变元是**共轭**线性，statement 写 "bilinear"。
  实质数学（1/(e_i,e_i) 因子）验算正确，缺陷限于术语。

登记未判 1 条：**D4 L53** 的细缝 —— 锚 2（`15.10.md:22` 的 (x,x)>0）出自 15.10:13–25 的**实**内积
公理块，而断言服务于 15.15 不带限定词的 Euclidean space；授权移植句 `15.10.md:29` 未被引用。
分片因锚 1（Thm 15.9(b)）本身通用而判不构成独立缺陷。本报告同意「不独立成缺陷」，但登记为
D 型的边缘形态，供裁定方按 §4.11 口径复核。

正向登记（供严重度基线）：D3 L10–L14 五条复情形节点全部支撑充分；D3 L32、L35 的实/复处理
被分片明确登记为正面案例（显式且经人工验算正确）；D3 L44 正确指出正交性在复空间同样可用；
**D3 L68** 的共轭归因经双路验算成立，与 L62 并列为 D3 46–69「构造最扎实的两个节点」；
D4 行 20、行 9 处理正确。另 D3 L36 的因果指派「要绕一道」（直接原因是 z+conj(z)=2Re(z)，
(1') 只是先让 (y,x) 写成 conj((x,y))），已由分片自陈为不严，不计入缺陷。

未覆盖：D4 1–27 分片自陈该专项多数检查点在本片无对象（`15.10.md:13`、`:105`、`:129`/`:136`、
`:151`、`15.11.md:80`），只核到 3 个真正涉及分裂的节点。

### 4.3 反常积分收敛条件

**本组只有 3 个节点属该专项的射程，全在 D3 前 45 行；其余三片零对象。**

- **D3 L22** `d:exponential-weight-makes-improper-integral-converge` —— 末句「权做双重工作」整句无锚；
  载体空间「全体实多项式」在 `15.10.md:75` 可引未引。判 FIX（补锚 `:75`）。
- **D3 L21** `d:weight-function-must-be-positive` —— 反事实整句（w 变号或子区间为零则公理 (4) 失效）
  无锚，原文 `15.10.md:47` 只说「读者自行验证」、从未论证正性必要性；claim 1 的 "only because"
  必要性模态亦超射程。判 FIX。
- **D3 L20**（邻接命中）—— 正定性真正依赖被积函数**连续**（`15.10.md:59` 把空间限制为
  continuous on [a,b]）；在仅 Riemann 可积的函数类上 ∫f²=0 并不迫使 f=0。已在 §3.1 计为 E。

零对象的三片，性质须区分：
- D3 46–69：机器 grep 命中 0（`15.10.md:73`、`:75`–`:81` 无节点引用）。
- D4 1–27：零命中，分片明确须由覆盖 15.10、15.12 习题的片区完成。
- D4 28–54：分片判为「**风险未材化**」而非「已检查通过」—— 这个区分是对的，本报告沿用。

**结论：本专项在 D3D4 范围内不构成有实质结论的覆盖。** 说「本组该专项零缺陷」是过报；
正确表述是「3 个对象中 2 个判 FIX、其余片区无对象」。置信度高（三份摘要均自陈零命中）。

### 4.4 计算值

**任务书点名的五类符号值在四片中全部零命中**：`(e−1/e)/2`、`3/e`、`e²−1`、`pi − 2 sin x`、
`x = 1 and y = i`。D3 21–45 与 D3 46–69 两片均明确 grep 命中 0，并指出它们属 15.12 习题类；
D4 两片亦零命中。**本组对这批数值无结论，须由覆盖 15.12 的片区负责。** 不要把本节的
「零错误」读成对那批值的背书。

各片实际验算过的量（合计 14 项以上，逐行可数）：

| 区间 | 验算项 | 结果 |
| --- | --- | --- |
| D3 21–45 | L41 claim 2 的量词（商恰为 −1 时 [0,2π] 内唯一解 θ=π） | **1 处瑕疵**：节点自备的「θ 与 2π−θ」机制在此退化，断言为假 |
| D3 46–69 | 7 项模型自算值 + 3 项附带核验（L55 反例、L57 对 Thm 15.7(b) 的刻画、L69 的 z·conj(z)） | 0 错。注：分片 §4.4 标题写「7 项」未含那 3 项 |
| D4 1–27 | 本片实际出现的 4 处量 | 0 错。分片明写「零缺陷不能据此推广到其它片区」 |
| D4 28–54 | L24 的 Legendre 常数恒等式 (2n)!/(2ⁿ(n!)²)×n!/(2n)! = 1/(2ⁿn!)；L54 的 √π·a_k 与 a_0/2 | 手算均为真 |
| D4 28–54 | **L51 末句** | **1 处实质错**：「任何竞争者的误差比在 s 处的误差正好多出 ‖s−t‖²」严格读**量纲不对**，成立的是误差**平方**之差 |

**全组唯一的实质计算缺陷是 D4 L51 的量纲错**（死因 4 候选，分片倾向 0 + 改措辞：把两处
「the error」改为「the squared error」）。D3 L41 是量词瑕疵而非算错（死因 1 低度候选）。
置信度高；不确定点：五类符号值未被本组任何一片验算过，这是覆盖缺口不是通过。

## 5. 检查过且判定支撑充分的节点 id 清单

§1.2 的「保留 52」拆成两档，两档相加 = 52（n = 逐行计数）：
**明确判「支撑充分」41 条** + **判「保留」但含已披露或原则上不可锚的无锚从句 11 条**。
这个拆分很重要：D3 46–69 那 7 条**不能**当成「支撑充分」，因为该片区 24/24 个节点都含至少一条
无锚 claim（见 §3 口径说明）。

### 5.1 明确判「支撑充分」的 41 条

D3 1–20（16 条，本报告附录逐条核过）：`d:inner-product-symmetry-axiom`、
`d:inner-product-additivity-axiom`、`d:inner-product-homogeneity-axiom`、
`d:inner-product-positivity-axiom`、`d:zero-element-has-zero-inner-product`、
`d:additivity-in-first-argument-derived`、`d:complex-homogeneity-allows-complex-scalars`、
`d:conjugate-homogeneity-in-second-argument`、`d:self-inner-product-is-real-in-complex-case`、
`d:complex-cauchy-schwarz-reduces-to-modulus-squared`、
`d:euclidean-space-unqualified-covers-real-and-complex`、
`d:metric-properties-motivate-the-inner-product`、`d:inner-product-not-unique-on-a-given-space`、
`d:dot-product-component-sum-formula`、`d:dot-product-satisfies-the-inner-product-axioms`、
`d:integral-inner-product-formula`

D3 21–45（2 条）：`d:triangle-inequality-proof-bound-cross-terms-by-cauchy-schwarz`（L37）、
`d:angle-well-defined-because-quotient-lies-in-minus-one-to-one`（L42，双锚覆盖被分片称为
「本片区锚点策略最完整的一例」）

D4 1–27（13 条，行 1、2、5、6、8、11、12、13、17、18、19、24、26）：
`d:orthogonalization-conclusion-a-orthogonal-to-earlier-span`、
`d:orthogonalization-conclusion-b-spans-agree`、
`d:inner-product-of-the-new-element-with-an-earlier-one`、
`d:coefficient-that-cancels-the-projection-component`、
`d:new-element-is-well-defined-and-orthogonal-to-all-earlier-ones`、
`d:span-inclusion-x-inside-y`、`d:uniqueness-splits-the-competitor-into-span-plus-multiple`、
`d:z-r-is-orthogonal-to-itself`、`d:projection-along-an-element-needs-a-nonzero-direction`、
`d:normalizing-converts-an-orthogonal-basis-into-an-orthonormal-one`、
`d:normalized-element-has-norm-one`、`d:legendre-normalizing-constant-from-y-n-to-p-n`、
`d:s-perp-is-defined-for-an-arbitrary-subset`

D4 28–54（10 条，L32、33、37、39、40、41、47、50、52、53）：
`d:s-defined-as-the-sum-of-projections-along-the-basis-elements`、
`d:s-lies-in-s-because-it-is-a-linear-combination-of-the-basis`、
`d:uniqueness-reduces-to-a-single-vanishing-difference`、
`d:uniqueness-concludes-by-self-orthogonality`、`d:pythagorean-expansion-of-the-squared-norm`
（**正面样板**：重构了原文压缩掉的中间步骤但如实披露 + 标 `origin: model`）、
`d:pythagorean-cross-terms-vanish-by-orthogonality`、`d:nearest-point-by-dropping-a-perpendicular`
（射程与断言严丝合缝，与 L46 同段落同性质而处理正确）、`d:x-minus-t-splits-orthogonally`、
`d:equality-holds-exactly-when-t-equals-s`、`d:strict-minimality-rests-on-positivity-of-the-norm`
（§4.2 的细缝已登记）

### 5.2 判「保留」但不称支撑充分的 11 条

D3 46–69（7 条）：`d:15-10-proof-pair-with-a-single-element`（L54）、
`d:15-10-proof-divide-by-nonzero-self-inner-product`（L55）、
`d:15-10-proof-repeat-for-each-index`（L56）、
`d:15-11-hypotheses-finite-dimension-and-orthogonal-basis`（L59）、
`d:orthogonal-basis-component-formula`（L60）、`d:15-11-denominator-nonzero-by-positivity`（L62）、
`d:parseval-conjugate-comes-from-hermitian-symmetry`（L68）。**L62 与 L68 是该片区自评
「构造最扎实的两个节点」**，也正是唯二带 `origin=model`、唯二设了跨文件锚的节点。

D4 1–27（2 条）：行 15 `d:positivity-axiom-forbids-nonzero-self-orthogonal-elements`、
行 25 `d:normalized-legendre-polynomials-are-y-n-over-its-norm`（均已标 model 或已写对限定）。

D4 28–54（2 条）：L28 `d:orthogonality-to-a-set-equals-orthogonality-to-its-span`
（**披露到位样本**：已标 `origin: model` 且 `atomic_reason` 交代教材未明写）、
L46 `d:trivial-case-when-x-already-lies-in-s`（射程止于 `15.14.md:5–7` 的 V_3 特例段，
断言无限定、`node_type` 还是 `theorem`，判为笔误级、只给建议）。

### 5.3 主通道统计（合并四片，并回答「D3D4 属哪一种形态」）

**先说结论：本组与 D3/D2 同型 —— 主通道是 T2，T3 结构性稀薄。** 但 D4 内部是个例外，
它的 T3 是实体通道而非空壳，这是本组与 D2 的实质差别。

**发起层：全部指控（§3 口径下 81 条，上界）100% 由 T1 发起。** 四片全部在四层证据池定义之前写成，都只看节点自身锚点
判射程（D3 21–45 明确「未读 `data/edges-D3.jsonl`」；D3 46–69、D4 两片同）。
没有任何一条指控是以 T2 或 T3 空池为前提提出的。T2/T3 在本组只起两个作用：**塌陷抗辩**与**缓解**。

**part-of 后代的实测形态（`exposure.tsv` × `nodes.tsv`，我自己算的）：**

| | 节点数 | 有 part-of 后代 | 占比 | T1 池 | T2 池 | T3 池 | 池总 | 去重源行 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| D3 | 69 | **5** | 7.2% | 112 | 113 | 21 | 246 | 140 |
| D4 | 54 | **9** | 16.7% | 102 | 113 | 104 | 319 | 229 |
| 合计 | 123 | **14** | 11.4% | 214 | 226 | 125 | 565 | 369 |

D3 那 5 个：`data/nodes-D3.jsonl` 的 :5、:9、:49、:60、:63（后代数 1/1/2/1/2，T3 = 2/2/7/3/7）。
D4 那 9 个：:1、:2、:4、:14、:18、:30、:36、:48、:52（后代数 2/2/3/1/2/5/3/5/1）。

**形态判定：**
- **D3 属「D2 型」** —— 5/69 有后代，T3 池仅 21 条，且这 5 个里 3 个（:5、:9、:63）后代只 1 个。
  D3 21–45 那 25 个节点**全部** `n_partof_desc = 0`，T3 通道在该片区**结构性不存在、不可能塌陷**。
  T2（113）与 T1（112）几乎相等，主通道就是 T2。
- **D4 属中间型，偏 T3 实体** —— 9/54 有后代，T3 池 104 条已与 T1（102）、T2（113）同量级。
  但这 104 条**高度集中**：L30（25）+ L48（23）+ L4（15）+ L36（12）= 75 条，占 72%。
  剩下 45 个节点的 T3 = 0。所以 D4 不是 A1/S1 那种「T3 主导、内容普遍下移」，而是
  **少数厚节点撑起 T3、多数节点仍只有 T1/T2**。
- **合并后仍以 T2 为主通道**（226 > 214 > 125），与 D3/D2 的 T2（6/7）主导一致，
  与 A1/S1 的 T3 主导相反。**成因就是任务书给的那条：本组只有 14/123 个节点有 part-of 后代。**

**塌陷/缓解计数（逐行可数，合并四片）：**

| 层 | 计数 | 明细 |
| --- | --- | --- |
| T2 塌陷（指控被边证据消解） | **3** | D3 L61（`edges-D3.jsonl:148` 逐字含 `:67` 的未锚理由子句）、D3 L50（`edges-D3.jsonl:49` 逐字含 (u_0,u_0)=2π）—— 恰是 D3 46–69 自列最轻两条；D3 L40 的实空间限定那一半（`edges-D3.jsonl:40` 引 `:151` 完整 183 字符） |
| T2 部分缓解（不消解指控） | **6** | D4 行 6、行 22 claim 3、行 27 claim 4（三条 `requires` 边接住无锚 claim）；D4 L29、L35、L38（所缺锚点句与边 evidence 是同一条源句，纯记账位置问题） |
| T2 存在但零增量（纯 T1 逐字重复） | **≥25** | D3 21–45 有 20/25 节点的 T2 全是 T1 逐字重复；D3 46–69 的 D-1/D-2/D-3/D-4 四条 T2 均无相关增量；D3 L47 的 2 条 T2 与 T1 完全相同 |
| T3 承载、判父节点可接受 | **3 处 claim（1 个节点）** | D4 L30 的 claim 3/4/5 由子节点 32/33/34/35 锚定 |
| T3 反向使用（后代**证伪**父节点） | **2** | D4 行 4 的缺陷由其后代行 12、13 的存在证成（「图自证其伪」）；行 14 的「exactly two」由其唯一后代行 15 的口径证成 |
| T3 塌陷（消解指控） | **1** | D4 L48，见 §1.3 冲突 3 —— 这是我的裁决，与分片相反 |
| 仅 TD 个案 | **1，但不在本报告处置范围** | D3 L64，主控 §4.11 已单独裁定（本轮唯一「仅 TD」个案）。D4 两片明确报本片无此形态 |

**「池大 ≠ 覆盖」的三个反例**（冗余度的正确度量是新引入的源行数，不是池变大）：
D4 行 4 池总 20、去重 14，缺陷照样成立；D4 L30 池 28、L48 池 26，**全靠 T3**（25 / 23）。
反向的最薄样本：D4 行 10 去重后只 1 条不同源行；D4 L23 池里只有 T1、无任何边证据。

**死因分流**：本组建议的死因 1 共 4 条明判 + 5 条边界（§2.2），按规则**不因边证据免除**，
且经上表核实这些条目本来也无相关边证据可补。死因 6 的 5 条备选（§2.2）按规则**会**因边证据免除，
实测其中 4 条的 T2 无相关增量、免除路径不成立，唯一例外是 **D4 L48 经 T3 免除**（§1.3 冲突 3）。
**TD 一律不入池**：D3 21–45 的 L35（3 条）、L39/L36/L43/L31（各 2 条）等确有 TD，不得用于抗辩。

## 6. SPEC 缺陷导致证据不足的实例计数

**合计 6 条源行触发 SPEC 阻挡，影响 11 处 claim、9 个节点（n = 逐行计数）。全部不判生产者。**
所有字符数取 `tmp_index/source-lines.tsv` 的实测 charlen，四份摘要已各自复核一致。

### 6.1 30 字符下限（**6 条源行，全部实例都在这一条**）

| 源行 | 实测字符 | 内容 | 受影响 |
| --- | --- | --- | --- |
| `15.10.md:19` | **21** | 齐性公理本体 | D3 L5（节点自陈以 `:27`/`:35` 代替）、D3 L48 claim 3、D3 L54 claim 3 齐性部分 |
| `15.10.md:108` | **26** | 范数定义式 | D3 L28（定义式本体不可引）、D3 L69 claim 3 |
| `15.10.md:123` | **29**（差 1 字符） | `‖x‖ = 0 if x = O` | D3 L30 —— **中心 claim 零逐字覆盖，成因完全在此** |
| `15.15.md:6` | **28**（差 2 字符） | `‖x−s‖ ≤ ‖x−t‖`，**逼近定理的核心不等式本身** | D4 L48、L52（只能引旁边的散文） |
| `15.15.md:14` | **26** | 正交分解式 x−t=(x−s)+(s−t) | D4 L50（该处散文信息量足够，不构成缺陷） |
| D4 1–27 区间 | — | 分片记的 30 字符下限影响 | D4 行 19、20、27 |

这一条是本组 SPEC 缺陷的**全部实质内容**：三处「差 1–2 字符」（`:123` 差 1、`15.15.md:6` 差 2）
把恰恰是**中心断言本身**的公式行挡在门外。`15.15.md:6` 尤其典型 —— 它就是 15.15 逼近定理要证的
那条不等式。这两处支持提案 G5-P02（30 字符地板豁免短行间公式）。

### 6.2 3 锚点上限（**本组 0 条真实例**）

**四片一致：123 个节点无一用满 3 条锚点。** 逐片实测（均已对过 `nodes.tsv` 的 `n_anchors`）：
D3 21–45 的 25 节点共 37 条锚点，13 个只用 1 条；D3 46–69 为 9 个 1 锚点 + 15 个 2 锚点；
D4 28–54 为 4 个 1 锚点 + 23 个 2 锚点。**故本组 81 条指控一处也不能归因于 3 锚点上限。**
唯一的反向声称是 D4 1–27 分片把行 16 写成「槽位已满」，实测 `n_anchors=2`、第三槽是空的
（记账错，见 §1.3 相关口径与该摘要 §四 第 1 项）。这条实测直接影响提案 G5-P04
（3 锚点上限是否提高）：**在本组数据下，提高上限不会消掉任何一条缺陷。**

### 6.3 跨行禁止（1 条）

D4 行 10，唯一实例。

### 6.4 不是 SPEC 30/200 但同类的 schema 缺陷 —— **本报告更正一处分片事实错误**

D3 21–45 分片 §7 第 6 项称「`origin: model` 字段只在 edge schema、不在 node schema，故 23 个含
无锚 claim 的节点无一能标 origin:model」。**这一事实陈述为假。**
依据：`tmp_index/nodes.tsv` 的 origin 列实测 —— D3 有 **4 个** origin=model 节点
（`:8` `d:additivity-in-first-argument-derived`、`:12` `d:self-inner-product-is-real-in-complex-case`、
`:62`、`:68`），D4 有 **9 个**（`:15`、`:19`、`:20`、`:23`、`:27`、`:28`、`:40`、`:43`、`:44`）。
node schema 确实带 origin，且本组已有 13 个节点在用。
死因 0（分片事实错，非裁决错）／建议动作：**该分片「schema 不支持、不记生产者」的免责推论作废，
改按 D4 两片的口径处理** —— 即「缺 `origin: model` 是生产者可修的记账缺失」。
置信度高（一条 awk 可复核）。连带后果：D4 28–54 §7.4 那 6 个缺 origin 的节点
（L30、31、36、45、48、51）与 D4 1–27 的行 3、7、9、21，共 **10 个节点**的 origin 缺失
应计为可修缺陷；这也让「末句洞见必须标 `origin: model` 或删」这条规则**可机械检查、可立**。

## 7. 其它维度顺带发现（不裁定）

1. **node_type 越出封闭词表 —— 本组最大的一处系统性偏离。** 封闭词表是
   concept / theorem / proof-step / example，`nodes.tsv` 实测：D3 = concept 26 / theorem 26 /
   **method 12** / **notation 5**；D4 = concept 6 / theorem 22 / **method 23** / **notation 3**。
   合计 **method 35 + notation 8 = 43/123 个节点（35%）用了词表外的类型**，而且没有一个节点用
   `proof-step`——D4 那 23 个 method 里大量就是证明步骤。两份摘要都指出分片本身未察觉此事
   （只报了 method/theorem 之间的**不一致**，没指出两个词**越出词表**）。这一条应单独立项。
2. **B 型（借用引文）排查须重做，分片范围明显偏窄。** `shared-quotes.tsv` 显示 D3 L45 的
   `15.11.md:98` 引文有 **8 个持有者**、L30/L33 的 `:133` 有 **7 个**、L28/L43 的 `:105` 有 **6 个**，
   远多于 D3 21–45 分片「3 对片区内 + 2 对跨片区」的统计。四片均自陈只做了片区内/同文件比对。
   已确认的真借用 1 例：**D4 L44** 的锚 1 与 L36 共用，**L36 才是真正归属者**。
3. **Pythagorean 同名不同指，本组已可确认成立。** D3 46–69 提出需交叉核：Apostol 本章把
   "Pythagorean formula" 用于正交分解式 (15.17)（`15.14.md:24`），未用于 (15.12)；而
   `15.07.md:29` 的 "Pythagorean identity" 指 cos²+sin²=1。实测 D4 确有为 (15.17) 建的
   `d:pythagorean-expansion-of-the-squared-norm`（L40）、`d:pythagorean-cross-terms-vanish-by-orthogonality`
   （L41）、`d:pythagorean-split-of-the-approximation-error`（L51），而 D3 L69 是 (15.12) 侧的
   `d:parseval-norm-form`。**图内同名不同指三处成立**，建议裁定方统一命名。
4. **过报通道 b 的重度多句行清单（下游统计禁止按行号比对）：** `15.11.md:15` 实测 **463 字符、
   6 个句末标点**（D4 行 14 的反例点）；`15.14.md:50` **533 字符、6 句**（D4 §2.6 建议的补锚行）；
   `15.14.md:30` 235 字符、3 句（D4 L30 两条锚点同在此行）；`15.13.md:135` **正好 200 字符**
   （卡 SPEC 上限，D4 L23 补锚必须截子句）；`15.08.md:17` 187 字符、3 句；`15.14.md:11` 186 字符、2 句。
   D3 侧：`:5`（2 句）、`:7`（3 句）、`:29`（3 句）、`:35`、`:67`（各 2 句）、`:89`（3 句）、
   `15.11.md:3`（4 句）、`15.10.md:119`（**4 句**，L29 那处语义相反的两半就在此行）。
5. **`audit_fix` 痕迹 4 处，可作「历次审计遗漏模式」的样本**：D3 L24（`audit-A1`，前次审计
   「没碰锚点覆盖」）、D3 L40（`audit-B`，拆分干净）、D3 L52（`audit-A1`）。
6. **A 型与 C 型在本组处于未查状态。** 四片一致声明未做 A/C 型专项排查，且都明确
   「未发现明显实例**不构成**本片区无 A/C 型的结论」。本报告沿用该声明，不作任何 A/C 型结论。
7. **图谱覆盖缺口（供裁定方判断是否补节点）：** 15.15 的 **Example 2（Legendre 逼近，
   `15.15.md:53–77`）在 D4 28–54 完全无节点**（`(f,φ_0)=0`、`(f,φ_1)=√(3/2)(2/π)`、
   `f_1(t)=(3/π)t`、`(f,φ_2)=0`）；Example 1 的 (15.21)→(15.22) 改写、`15.15.md:31` 的
   `dim S = 2n+1`、`:51` 的「优于任何其它三角多项式」同样无节点。
8. **措辞类 FIX 现成清单**（D4 1–27 §7 的 5 条 + D3 若干）：D4 行 1「half」对三条结论、
   行 8「subtraction of projections」在 y_j=O 分支不存在投影且与行 17 互冲、行 22 `name_en`
   的「15.14」定理/节次歧义、行 24「normalization convention」与行 25 词根撞车、行 9「conjugate of 0」
   表述绕；D3 L42 的 "vacuous" 用词不确（准确说是「无解/无定义」）、D3 L30 claim 3 的「逆否」稍松。
9. **纯录入噪声 1 处**：D4 28–54 分片附录批 3 关于 L46 的一句里混入俄文拼写 `провenance`。
10. **`parent` 指向的 `apostol:` 上级存在性已消解**（D3 21–45 分片 §9 第 6 项的存疑）：
   `apostol:theorem-15-9-properties-of-norms`（`inherited/nodes-A1.jsonl:55`）、
   `apostol:orthogonal-elements`（`:58`）、`apostol:norm`（`:53`）、`apostol:norm-notation`（`:54`）
   均真实存在；`tmp_index/README` 亦报「悬空 id 引用 0 处」。

## 8. 方法反思：形式 D 可机器化吗

**结论：不能，但能机械化到「候选清单」这一步，且本组给出了三条各自的边界。**

### 8.1 可全自动的（本组已实证）

- **字符数、锚点槽位、`origin` 字段缺失**：三者都是 `nodes.tsv` / `anchors.tsv` / `source-lines.tsv`
  的一次 awk。本组靠这一步定掉了两件事：SPEC 3 锚点上限 **0 条真实例**（§6.2），以及
  「schema 不支持 origin」这个免责推论**为假**（§6.4）。两条都是分片凭印象写错、被表一句话推翻的。
- **B 型（借用引文）半机械化**：`shared-quotes.tsv` 的同 (file,quote) 直接给出候选，本组据此
  发现分片的 B 型排查范围偏窄一个量级（8 持有者 vs 分片报的「3 对」）。**但只到候选** ——
  D4 L44 那条真借用还要人判「谁才是归属者」。
- **量词词表扫描给候选**：本组确认的死因 1 全部含 `exactly` / `the only` / `Everything else` /
  `every` / `whenever`。扫这批词能捞出候选，而且可以进一步机械化成
  「**锚点 quote 内是否含与断言相同的限定词**」这个对比 —— D3 L66 正是这一形态
  （锚点逐字含 finite-dimensional、claim 3 写成 every），**可半机械化检出**。

### 8.2 机器查不出来的（本组的三个反例）

1. **D 型「覆盖范围不足」，机器必败。** D4 L48 是最纯的样本：两条锚点都在 `15.15.md:3`/`:9`，
   与断言主题**高度相关**、任何字符串或主题相似度检查都会通过，但它们只覆盖「断言是什么」、
   完全不覆盖「为什么成立」（证明体 `15.15.md:11–23` 一条没引）。分片称之为「D 型最危险的形态」，
   与盲区五型的 D 型判断一致。
2. **穷尽性断言的反例往往要「换语言再查」。** D4 行 14 是本组最有方法论价值的一条：
   按 "orthogonal to itself" 字面 grep 只命中断言自称的三处（`15.11.md:5` / `15.13.md:75` /
   `15.14.md:50`）—— **grep 结果与断言完全相符**，机器到此就会判通过。换成内积语言才出现
   第三个使用点 `15.11.md:15`（"But $(x_1,x_1)\neq O$ since $x_1\neq O$ so $c_1=0$"）。
   **字面 grep 在这里不只是不够，它给出的是假阴性。**
3. **假阳性同样成规模。** D3 21–45 的有限维机器扫描 4 条命中**全部假阳性**，成因是
   "de**finite**ness" 内含 "finite" 子串。子串匹配没有词边界概念。

### 8.3 图结构本身能当判据 —— 本组的两个正例

**T3 反向使用**：D4 行 4 的「Everything else in the proof」被它自己的后代行 12、13 的**存在**证伪
（那两个节点正是给定理 15.13 的 (c) 唯一性建的），即「图自证其伪」；D4 行 14 的「exactly two」
被其唯一后代行 15 的口径证成。这两处**是可机械化的**：查 `partof.tsv` 的后代集合与父节点的
穷尽性断言是否相容。这是本组发现的、最有推广价值的一条自动化路子。
反向的缺边检查同样可机械化：D4 行 14 派生出的图内缺边（`d:15-10-proof-divide-by-nonzero-self-inner-product`
→ 本节点无 `requires` 边）就是用 `edges.tsv` 数出来的（该源节点只有 4 条边、确无指向者）。

### 8.4 必须先过池，且只能按句粒度

本组全部指控只在 T1 层发起（§5.3），四片都没查 T2/T3。合并后实测：T2 消解 3 条、
部分缓解 6 条、T3 消解 1 条 —— **10 条指控在过池后需要下调或改写理由**（占 81 上界的约 12%）。
所以「可引未引 / 第三槽空置」这类指认**一律须先过 T2**，否则系统性过报。
而过池必须按**句粒度**：D3 L64 的 `:89` 三句已分别被 L67（第 1 句）与 L69（第 3 句）占用，
说「整行未被任何节点引用」就是错的；D3 L29 更极端 —— T2 引的是 `15.10.md:119` 的第一句
（"will depend on"），缺口是同一行末句（"do not depend on"），**两半语义恰好相反**，
按行号比对会判成已覆盖。该行实测 4 个句末标点。这是过报通道 (b)/(c) 的教科书形态。

### 8.5 一句话

形式 D 的可机械化部分，是**记账**（字符数、槽位、origin、共享引文、后代集合与穷尽性断言的相容性）；
不可机械化的部分，是**射程**（锚点是否支撑它所挂的那条断言）。本组 28 条形式 D 里，
靠记账能捞出候选的约一半，而判定成立与否**每一条都要人读原文**。
「N/N 锚点已验证」在本组 123 个节点上全部通过，而本组仍数出 71 条须 FIX 的节点 —— 这个对比本身
就是「逐字校验不等于正确性保证」的量化证据。

---

# 附录：逐批次审查原始记录（append-only，防中断）

## D3 批次 1（节点 1–10）

- `d:inner-product-real-valued-and-quantifiers` — 4 claim。前 3 claim 由 15.10.md:13 两条锚点覆盖。末句 "The reality of the value is exactly what must be relaxed in the complex case" 无锚点覆盖 → 复核 15.10.md:29「complex number satisfying the same axioms ... except that the symmetry axiom is replaced」+ :35「the scalar multiplier c can be any complex number」。事实成立但 "exactly" 带排他暗示，而复情形实际改动三处（值域、对称性、标量域）。**形式 E（轻）**，建议补 :29 锚点或去掉 "exactly"，不判死因。
- `d:inner-product-axiomatic-not-formula` — 3 claim。claim1（公理化而非公式）由 :11、:47 覆盖。**末句为确认的形式 D**：「every later theorem (15.8, 15.9, 15.10-15.12) is then a consequence of the axioms alone and therefore holds in every model, including function spaces where no component sum exists」。锚点射程只到"定义方式是公理化的"；源文能支撑的只有 :91（15.8 的证明不依赖点积的具体定义）与 :119（15.9 不依赖内积选择）。Theorem 15.11（15.11.md:43）与 15.12（:77）都以 finite-dimensional + 正交基为前提，在无限维函数空间 C(0,2π) 中 Parseval 公式并不成立，因此 "holds in every model, including function spaces" 越界且数学上不成立。建议缩 statement 至 15.8/15.9，或判**死因 6**。
- `d:inner-product-symmetry-axiom` — 5 claim。claim1 由 :15 覆盖，quantifier "for all x, y" 由 :13 覆盖。claim3–5（去掉对称性的后果：第一变元不能展开、:136 的三角不等式展开塌缩、15.10/15.11 证明中"与 x_1 配对"失效）均无锚点，属反事实分析；逐条复核 15.11.md:15、:61 后判定数学正确。支撑充分。
- `d:inner-product-additivity-axiom` — 4 claim。claim1 由 :17 覆盖。claim2「Apostol 只在第二变元给出可加性，第一变元可加性不是公理」经 :15–:19 公理表核对成立。claim3（去掉后 15.10/15.11/Parseval 证明失效）无锚点，核对 15.11.md:15/:61/:89 成立。支撑充分。
- `d:inner-product-homogeneity-axiom` — 5 claim。公理本体 :19 只有 21 字符，低于 30 字符下限，节点自陈以 :27、:35 代替 → 计入 SPEC 缺陷实例。claim「(O,y)=0」由 :27 覆盖；claim「破坏 ‖cx‖=|c|‖x‖ (15.9c)」核对 :127 成立；claim「15.10/15.11 中系数提取失效」核对 15.11.md:15/:61 成立。支撑充分。
- `d:inner-product-positivity-axiom` — 6 claim。claim1 由 :22 覆盖。半定化后果四条（15.9(b) 失效 :125、‖x‖=0 不再刻画 x=O :123–125、角度分母可为零 :151、15.10 中 (x_1,x_1)≠0 失效 15.11.md:15、15.11 中分母 (e_j,e_j) 可消失 15.11.md:52）均无锚点，逐条核对成立。支撑充分。
- `d:zero-element-has-zero-inner-product` — 4 claim。claim1/2 由 :27 覆盖。claim3「使零元与 V 中每个元素正交」无锚点，核对 15.11.md:5 成立。claim4（配对消失线性组合时隐式使用）核对 15.11.md:15 成立。支撑充分。
- `d:additivity-in-first-argument-derived` — 4 claim。claim1 由 :17 公理表反证，claim3 由 :136 锚点覆盖。claim4「15.10 中'与 x_1 配对'也是在第一变元拆和」曾疑为数学错误：Apostol :15 写 "Taking the dot product of each member with $x_{1}$" 是第一变元配对，随后写 (x_1,x_i) 才隐式用了对称性，故按原文措辞可支撑。**不判缺陷**，但记为源文歧义处。
- `d:hermitian-symmetry-axiom` — 3 claim。claim1（(1') 替换对称公理）由 :29/:32/:35 锚点覆盖。**claim2「Every other axiom is kept verbatim」为确认的形式 D**：锚点只覆盖 "except that the symmetry axiom is replaced"，射程不含"其余公理逐字不变"；:35 明确写 homogeneity 公理中 c 可为任意复数，即该公理并非逐字不变，且同文件 `d:complex-homogeneity-allows-complex-scalars` 自称"第二处修改"，两节点互相矛盾。建议改为"公理表其余各条不变，但齐次公理的标量域扩到复数（:35）"，否则判**死因 6**。claim3（平凡对称 + 复齐次会迫使 (cx,cx)=c²(x,x)，取 c=i 破坏正定）无锚点，自行验算成立。
- `d:complex-homogeneity-allows-complex-scalars` — 3 claim。claim1 由 :35 覆盖；claim2「第二处修改」与 :29/:35 的叙述次序一致；claim3（复齐次 + 交换取共轭 ⇒ 第二变元共轭齐次）无锚点，核对 :35–:40 companion relation 成立。支撑充分。

## D3 批次 2（节点 11–20）

- `d:conjugate-homogeneity-in-second-argument` — 3 claim，全部由 15.10.md:35 + :40 覆盖，含末句「Nothing about slot two was postulated; it is forced」（:35 "From the homogeneity axiom and (1'), we get / the companion relation" 正是"被迫得出"）。支撑充分。
- `d:self-inner-product-is-real-in-complex-case` — 3 claim。claim1（y=x 代入 (1') 得 (x,x) 实）无锚点，为模型推演，一步验算成立。claim2（这使未改动的正定公理在复空间仍有意义）无锚点，核对 :22 与 :29 成立。末句「why (1') and not plain symmetry is the correct replacement」自行验算：平凡对称对 (x,x) 不给任何信息，故确实需要 (1')，成立。支撑充分。
- `d:complex-cauchy-schwarz-reduces-to-modulus-squared` — 4 claim。claim1/2 由 :91、:94 覆盖；claim3「uses (1') alone」验算成立；末句「makes one statement of Theorem 15.8 cover both cases」无锚点，核对 :83（"In a Euclidean space V"）+ :45 成立。支撑充分。
- `d:euclidean-space-unqualified-covers-real-and-complex` — 4 claim。claim1/2 由 :45 两条锚点覆盖。末句「why conjugates appear in the proof of the triangle inequality and in Parseval's formula」无锚点，核对 15.10.md:136（(\overline{x,y})）与 15.11.md:80（(\overline{y,e_i})）成立。支撑充分。属实/复分裂专项，判定正确。
- `d:metric-properties-motivate-the-inner-product` — 4 claim，前 3 由 :3 三条锚点覆盖；末句「fixes the dependency order inner product -> norm -> angle」核对 :105（范数由内积定义）、:151（角度由内积与范数定义）成立。支撑充分。
- `d:inner-product-not-unique-on-a-given-space` — 5 claim。claim1 由 :54 覆盖，claim4 由 :57 覆盖。claim2「satisfies all the axioms」无锚点，由 :47 支撑（该句是别的节点的锚点）；claim3「differs from the dot product」自行验算成立。末句「Euclidean space 是线性空间加上一个选定的内积，而非线性空间自身的性质」无锚点，由 :25 + :57 + :119（"the norm of an element will depend on the choice of inner product"）支撑。支撑充分。
- `d:dot-product-component-sum-formula` — 4 claim。claim1 由 :8 覆盖；claim2「for x and y in V_n」无锚点，由 :5 支撑；末句（C(a,b) 上积分内积按同一模式构造）由 :65 支撑。支撑充分。
- `d:dot-product-satisfies-the-inner-product-axioms` — 4 claim。claim1/2 由 :49、:47 覆盖（"all four axioms" 与 :15–:22 的三条编号公理 + 一条正定显示式相符）。claim3「so V_n with the dot product is a real Euclidean space」无锚点，由 :25 支撑。末句为方法论评注。支撑充分。
- `d:integral-inner-product-formula` — 3 claim。claim1 由 :59 + :62 覆盖；claim2「first model in which the elements are not tuples」核对 Example 1/2 均为 tuple，成立；末句（Apostol 用这个模型把 15.8 变成积分不等式）由 :97 支撑。支撑充分。
- `d:integral-inner-product-analogy-with-component-sum` — 4 claim。claim1/2 由 :65 两条锚点覆盖。**末句尾部为确认的形式 E**：「and it is the reason positive definiteness holds (the integral of f^2 is positive for a continuous f that is not identically zero)」。两条锚点的射程只到"积分公式与 (15.5) 结构类似、函数值充当分量、积分充当求和"，完全不触及正定性；而因果归属本身也偏了：与 (15.5) 的类比不能交付正定性（分量和的正定性是平凡的，积分情形真正依赖的是被积函数连续，见 :59 把空间限制为 continuous on [a,b]；在仅 Riemann 可积的函数类上 ∫f²=0 并不迫使 f=0，类比恰在此处断裂）。括号内的表述自身正确且已写明 "continuous"，故不判死因；建议缩 statement，或补 :59 作为第三锚点并把因果改为"连续性保证了正定性"。


---

## 顺带发现（本任务范围外，各一行，不展开）

- `nodes.tsv` 实测 method 35 个 + notation 8 个（占本组 35%）越出封闭词表，且全组无一个 `proof-step`，疑为生成阶段的类型词表未约束，范围外未查其它 D 文件。
- D3 21–45 分片「node schema 无 origin 字段」的事实错误（§6.4）可能已被其它分片沿用，建议全局搜一次同类免责推论。
- D3 L64 的「仅 TD」个案与 D4 两片自报「本片无仅 TD 形态」一致，未反查 D1/D2/A1/S1 是否另有该形态。
