# G1c B2 三条互证 KILL 的杀因改写

只读分析代理产出。**这是提案，不是执行结果**，未写任何 `data/` 文件。
范围严格限定在 A1 §2.1 已认定的 3 对内容轴塌缩，不重审其他节点、不重算已有表。

## 〇 结论速览（3 条里成功改写几条、撤回几条）

**3 条全部改写成功，0 条撤回。** 三条 KILL 的死因 5（伪抽象·层塌缩）判定本身不依赖被杀节点，
被杀节点只出现在「承载者指认」与「冗余度陈述」两处措辞里，都能改指到存活节点。

| 对 | 被杀节点 | 原 reason 依赖的被杀节点 | 依赖性质 | 改写后的承载者（全部存活） | 结论 |
|---|---|---|---|---|---|
| A | `d:example-1-verification-is-the-field-axioms-of-r`（v:46，属「维持 3」） | `d:example-3-verification-reduces-to-arithmetic-in-each-component` | 先例（同 species 类比） | parent `d:example-1-the-real-numbers-form-a-linear-space`（KEEP） | 改写成功，死因仍 5 |
| B | `d:example-2-shows-the-scalars-decide-real-or-complex`（v:49） | `d:real-in-real-linear-space-refers-to-the-scalars`（v:25） | 冗余度陈述（三份拷贝计数） | parent `d:example-2-the-complex-numbers-with-real-scalars`（KEEP） | 改写成功，死因仍 5 |
| C | `d:example-3-verification-reduces-to-arithmetic-in-each-component`（v:52） | `d:operations-of-example-3-are-componentwise`（v:51） | **承载**（机制句的内容在 v:51 里） | parent `d:example-3-v-n-with-componentwise-operations`（KEEP）+ 祖父 `apostol:v-n-space`（不在击杀名单） | 改写成功，死因仍 5；另附死因 6 观察 |

只有 C 是真正的承载依赖，也只有 C 需要把承载者上移一层；A、B 两条的依赖是措辞层面的，
删掉引用即可，判定不受影响。三条改写用到的证据全部来自各自节点池的 T1/T2 与存活节点的 T1/T2/T3，
未动用 `pool-TD-excluded.tsv` 的任何一行。

**改写不改变 A1 §2.1 的裁定结果**（B 假阳性、C 可杀但承载者上移、A 须先并入 parent），
本文件只提供三条可直接落盘的 reason 全文。

## 一 逐条处理

### 1.1 对 A：`d:example-1-verification-is-the-field-axioms-of-r`（verdicts:46）

**原杀因逐字**（`report/audit-B2-verdicts.jsonl:46` 的 `reason` 字段）：

> 逐条把十条公理映射到 R 的算术律,是公理在最熟悉情形下的纯代入,无判别力;结论「本例无非平凡验证」已被 parent d:example-1-the-real-numbers-form-a-linear-space 的「smallest interesting example ... the degenerate case against which the other examples should be read」覆盖。与被杀的 d:example-3-verification-reduces-to-arithmetic-in-each-component 属同一species。

**依赖的被杀节点**：末句点名 `d:example-3-verification-reduces-to-arithmetic-in-each-component`
（`nodes-D1.jsonl:52`，B2 = KILL，本批）。依赖性质是**先例关系**——「属同一 species」是类比，
不把承载责任交出去；前两句的判定（纯代入、无判别力、结论已被 parent 覆盖）不引用任何被杀节点。
故这一句可以整句删除而不损伤判定。

**改写尝试**：需要一个不在击杀名单里的承载者顶替末句的功能。可用的是 parent
`d:example-1-the-real-numbers-form-a-linear-space`（`nodes-D1.jsonl:44`，B2 = KEEP，`audit-B2-verdicts.jsonl:44`），
其 statement 末句逐字为「it is the degenerate case against which the other examples should be read」
（`tmp_index/statements.tsv`，`nodes-D1.jsonl:44` 行）。这一句本身就把「例 1 是退化对照」这一
species 判断留在了存活侧，无须再点名任何兄弟节点。

引文侧无损失（查 `tmp_index/shared-quotes.tsv`）：v:46 的两条锚点都被存活节点持有——
144 字符的 `'EXAMPLE 1. Let $V = \\mathbf{R}$ , the set of all real numbers, and let $x + y$ and $ax$ be ordinary addition and multiplication of real numbers.'`
n_holders=3，含 `node:d:example-1-the-real-numbers-form-a-linear-space`；
114 字符的 `'The reader can easily verify that each of the following examples satisfies all the axioms for a real linear space.'`
n_holders=8，含存活的 `node:d:examples-are-asserted-to-satisfy-the-axioms-and-left-to-the-reader`（`audit-B2-verdicts.jsonl:43` = KEEP）。

**新杀因全文**（可直接替换 `reason` 字段）：

> 逐条把十条公理映射到 R 的算术律，是公理在最熟悉情形下的纯代入，无判别力；结论「本例无非平凡验证」已被 parent d:example-1-the-real-numbers-form-a-linear-space 的「smallest interesting example … the degenerate case against which the other examples should be read」覆盖，该 statement 末句同时承担了「例 1 是退化对照」这一定性，本节点不留下自己的增量。两条锚点均由存活侧持有：144 字符的 EXAMPLE 1 定义句由 parent 持有，114 字符的「reader can easily verify」句由存活的 d:examples-are-asserted-to-satisfy-the-axioms-and-left-to-the-reader 持有，删除不产生引文损失。

- 结论：改写成功，KILL 维持。
- 依据：`audit-B2-verdicts.jsonl:44` 与 `:46`；`tmp_index/statements.tsv`（`nodes-D1.jsonl:44`）；`tmp_index/shared-quotes.tsv`（144 与 114 字符两行）；`tmp_index/exposure.tsv`（v:46 池 T1=2/T2=1/T3=0，共 3，distinct_src_lines=2）。
- 死因编号：5。
- 建议动作：**FIX reason 后按 A1 §2.1 对 A 的裁定执行**——即仍须先把十条公理映射表并入 parent statement，再删节点（本文件不重复裁断并入项）。
- 置信度：高。不确定点：并入 parent 后 parent 仍无锚点这一项由 ADJ1 §3.4 处置，未在此核。

### 1.2 对 B：`d:example-2-shows-the-scalars-decide-real-or-complex`（verdicts:49）

**原杀因逐字**（`audit-B2-verdicts.jsonl:49`）：

> 复述 parent d:example-2-the-complex-numbers-with-real-scalars 的第二句「It separates two things the notation tends to fuse, the field the elements come from and the field the scalars come from」——parent 首句已断言「元素是复数而空间是实线性空间」。整个「标量而非元素决定实/复」的洞见在 parent 里已完整,本节点与被杀的 d:real-in-real-linear-space-refers-to-the-scalars 一起构成同一句话的三份拷贝,保留 parent 一份。

**依赖的被杀节点**：末句点名 `d:real-in-real-linear-space-refers-to-the-scalars`
（`nodes-D1.jsonl:25`，B2 = KILL，本批）。依赖性质是**冗余度陈述**——「三份拷贝」是在数同一句话被复制了几次，
承载者始终是 parent，不是 v:25。A1 §2.1 对 B 已判此对为假阳性，本节据此只做措辞剥离。

**改写尝试**：把「三份拷贝」的计数改成「两份拷贝」并只点存活的 parent 即可，无须新证据。
承载者 `d:example-2-the-complex-numbers-with-real-scalars`（`nodes-D1.jsonl:47`，B2 = KEEP，`audit-B2-verdicts.jsonl:47`）
的 statement 逐字含「It separates two things the notation tends to fuse, the field the elements come from and the field the scalars come from.」
（`tmp_index/statements.tsv`，`nodes-D1.jsonl:47` 行），原杀因引的就是这一句，与被杀节点无关。

证据池核对（`tmp_index/pool.tsv`，`tmp_index/exposure.tsv`）：v:49 的池只有 T1=1、T2=2、T3=0，
共 3 条，`distinct_src_lines=1`——三条指向的是**同一条** 108 字符引文
`'Even though the elements of V are complex numbers, this is a real linear space because the scalars are real.'`
（T1 自身锚点 1 条 + T2 自发边 `edges-D1.jsonl:117`、`:118` 各 1 条）。
即该节点在池里没有引入任何独立于该句的源行，池不因边证据而变大（过报通道 c 已避开）。
`shared-quotes.tsv` 里这条 108 字符引文 n_holders=6，持有者含存活的
`node:d:example-2-the-complex-numbers-with-real-scalars`，删除后引文仍在图中，零损失。

**新杀因全文**：

> 复述 parent d:example-2-the-complex-numbers-with-real-scalars 的第二句「It separates two things the notation tends to fuse, the field the elements come from and the field the scalars come from」——parent 首句已断言「元素是复数而空间是实线性空间」。整个「标量而非元素决定实/复」的洞见在 parent 里已完整，保留 parent 一份即可。本节点的证据池（T1=1、T2=2、T3=0）全部指向同一条 108 字符源句「Even though the elements of V are complex numbers, this is a real linear space because the scalars are real.」，未引入任何新源行；该句由 parent 的第二条锚点持有，删除不产生引文损失。

- 结论：改写成功，KILL 维持。原杀因末句的「三份拷贝」计数被替换为池度量，不再点名任何被杀节点。
- 依据：`audit-B2-verdicts.jsonl:47`、`:49`；`tmp_index/statements.tsv`（`nodes-D1.jsonl:47`、`:49`）；`tmp_index/pool.tsv`（v:49 三行）；`tmp_index/exposure.tsv`（v:49 行，distinct_src_lines=1）；`tmp_index/shared-quotes.tsv`（108 字符行，n_holders=6）。
- 死因编号：5。
- 建议动作：**FIX reason 后 KILL**，与 A1 §2.1 对 B 的裁定一致（该对为假阳性，两节点都可杀）。
- 置信度：高。不确定点：无。

### 1.3 对 C：`d:example-3-verification-reduces-to-arithmetic-in-each-component`（verdicts:52）

**原杀因逐字**（`audit-B2-verdicts.jsonl:52`）：

> 结论句「V_n 分不出哪条公理是需要的、哪条是冗余的」与 parent d:example-3-v-n-with-componentwise-operations 的「which makes it a poor test of whether a given axiom is really needed」是同一句;机制句(逐分量归约)是被杀的 d:operations-of-example-3-are-componentwise 的内容。两句都不留下自己的增量。

**依赖的被杀节点**：`d:operations-of-example-3-are-componentwise`（`nodes-D1.jsonl:51`，B2 = KILL，本批）。
依赖性质是**承载关系**——机制句的内容被明确交给 v:51 保管，v:51 同死则该句在原杀因里无人承担。
这是 3 条里唯一的真承载依赖。

**改写尝试**：承载者需上移一层，改指两个存活节点。
（i）parent `d:example-3-v-n-with-componentwise-operations`（`nodes-D1.jsonl:50`，B2 = KEEP，`audit-B2-verdicts.jsonl:50`），
statement 逐字含「The space V_n of n-tuples of real numbers, with the usual componentwise operations」
与「which makes it a poor test of whether a given axiom is really needed」——**结论句与机制句都在里面**；
（ii）祖父 `apostol:v-n-space`（`data/inherited/nodes-A1.jsonl:11`，**不在 B2 的 29 条 KILL 名单内**，
且 `audit-B2-verdicts.jsonl` 无以它为 id 的裁决行），statement 逐字为
「with addition and multiplication by scalars defined in the usual way in terms of components」，
即 Apostol 承载机制句的原文。两者都存活，链条终止在存活节点上。

引文侧（`tmp_index/pool.tsv` + `shared-quotes.tsv`）：v:52 的池只有 T1=1、T2=1、T3=0，
`distinct_src_lines=1`，两条都是同一条 92 字符引文
`'with addition and multiplication by scalars defined in the usual way in terms of components.'`
（T1 自身锚点 + T2 自发边 `edges-D1.jsonl:124` 的 part-of 证据）。
该 92 字符 quote 的 n_holders=4，四个持有者全在击杀侧（node v:51、node v:52、edge `:122`、edge `:124`），
但它是存活的 171 字符锚点
`'EXAMPLE 3. Let $V = V_{n}$ , the vector space of all n-tuples of real numbers, with addition and multiplication by scalars defined in the usual way in terms of components.'`
（持有者含 `node:apostol:v-n-space` 与 `node:d:example-3-v-n-with-componentwise-operations`）
的连续子串，也是存活边 `edges-H2.jsonl:11` 那条 141 字符证据的子串——即 A1 §2.2 口径下的 FULL，不产生引文损失。
以「新引入的源行数」度量：v:52 的唯一源行是 `apostol-ch15/15.03.md:9`（`source-lines.tsv`，charlen 171、n_sentence_end=2），
该行已由存活侧的 171 字符锚点完整覆盖，新增源行数为 0。
注意该行 n_sentence_end=2，故此处用的是包含式比对而非行号比对（避开过报通道 b）。

**新杀因全文**：

> 结论句「V_n 分不出哪条公理是需要的、哪条是冗余的」与 parent d:example-3-v-n-with-componentwise-operations 的「which makes it a poor test of whether a given axiom is really needed」是同一句；机制句（逐分量归约）复述的是祖父 apostol:v-n-space 的「with addition and multiplication by scalars defined in the usual way in terms of components」，以及同一 parent statement 里的「with the usual componentwise operations」——两个承载者都存活。本节点的证据池（T1=1、T2=1、T3=0）只指向同一条 92 字符源句，且该句是存活侧 171 字符锚点（apostol:v-n-space 与 parent 共持）的连续子串，新引入源行数为 0。两句都不留下自己的增量。

- 结论：改写成功，KILL 维持；承载者由被杀的 v:51 上移为存活的 `apostol:v-n-space` 与 parent。
- 依据：`audit-B2-verdicts.jsonl:50`、`:52`；`tmp_index/statements.tsv`（`nodes-D1.jsonl:50`、`:52`、`inherited/nodes-A1.jsonl:11`）；`tmp_index/pool.tsv`（v:52 两行）；`tmp_index/exposure.tsv`（v:52 行，distinct_src_lines=1）；`tmp_index/shared-quotes.tsv`（92 与 171 字符两行）；`tmp_index/edges.tsv`（`edges-D1.jsonl:121`、`:124`、`edges-H2.jsonl:11`）；`tmp_index/source-lines.tsv`（`15.03.md:9`）。
- 死因编号：5（主）。**附一条死因 6 观察**：v:52 statement 里「each of the ten axioms for V_n follows from the corresponding law of real arithmetic applied n times, with O the n-tuple of zeros」这一增量部分，在它的池（唯一那条 92 字符引文）里找不到支撑——引文只说运算按分量定义，没说十条公理如何逐条归约、更没提 O 是零元组。属锚点盲区 D 型（覆盖范围不足）。但该节点已判 KILL，此项不改变处置，仅供综合代理在统计死因 6 样本时收录。
- 建议动作：**FIX reason 后 KILL**，与 A1 §2.1 对 C 的裁定一致。
- 置信度：改写部分高。死因 6 观察也已加核一层：`apostol:v-n-space` 的 21 条池证据去重后为 10 条不同 quote（`pool.tsv` 逐条看过），无一含「十条公理逐分量归约」或「O 是零元组」的表述，故该增量在祖父侧同样无引文支撑。仍留一个不确定点：未核该表述是否落在 15.02 的公理表节点上（v:52 的 sections 只写 15.03）。

## 二 改写后仍成立的 KILL 清单

三条全部成立，新杀因均只引用存活节点。**注意 A 那条属「维持 3」不在本批 21 条内**，
其执行仍受 A1 §2.1 对 A 的前置条件约束（映射表须先并入 parent）。

| id | 死因 | 新杀因一句话 | 建议动作 |
|---|---|---|---|
| `d:example-1-verification-is-the-field-axioms-of-r` | 5 | 十条公理映射到 R 的算术律是纯代入无判别力，「无非平凡验证」与「例 1 是退化对照」两项均由存活 parent `d:example-1-the-real-numbers-form-a-linear-space` 的 statement 末句承担，两条锚点也都由存活侧持有。 | FIX reason + 并入映射表后 KILL（按原清单第 3 步） |
| `d:example-2-shows-the-scalars-decide-real-or-complex` | 5 | 「标量而非元素决定实/复」的洞见完整存于存活 parent `d:example-2-the-complex-numbers-with-real-scalars`，本节点池（3 条）全部指向同一条 108 字符源句且该句由 parent 锚点持有，新增源行 0。 | FIX reason 后 KILL |
| `d:example-3-verification-reduces-to-arithmetic-in-each-component` | 5 | 结论句与 parent `d:example-3-v-n-with-componentwise-operations` 同句，机制句复述存活祖父 `apostol:v-n-space` 的原文，本节点池（2 条）只指向同一条 92 字符引文且它是存活 171 字符锚点的连续子串，新增源行 0。 | FIX reason 后 KILL |

三条新杀因里出现的节点 id 共 4 个（`d:example-1-the-real-numbers-form-a-linear-space`、
`d:examples-are-asserted-to-satisfy-the-axioms-and-left-to-the-reader`、
`d:example-2-the-complex-numbers-with-real-scalars`、`d:example-3-v-n-with-componentwise-operations`）
加祖父 `apostol:v-n-space`，已逐个对 `audit-B2-verdicts.jsonl` 的 KILL id 列表比对：**均不在 29 条 KILL 内**
（前 4 个为显式 KEEP，第 5 个在 verdicts 文件里无裁决行），故不存在二次塌缩。

## 顺带发现

- `d:example-1-verification-is-the-field-axioms-of-r` 的 `sections` 写 `15.02,15.03`，但它两条锚点与池里 3 条证据全在 `15.03.md`，无一条来自 15.02。疑 sections 虚标，不属本轮范围。
- `apostol:v-n-space`（`inherited/nodes-A1.jsonl:11`）在 `audit-B2-verdicts.jsonl` 里没有裁决行；B2 似未覆盖 inherited 层节点。若后续要以它当承载者，其自身未经审。
- 92 字符 quote `'with addition and multiplication by scalars defined in the usual way in terms of components.'` 的 4 个持有者（v:51、v:52 及边 `edges-D1.jsonl:122`、`:124`）全在击杀侧，删除后该精确串在图中归零——虽被更长存活串包含，但 `shared-quotes.tsv` 口径下会从共享表消失，主控统计引文损失时口径需一致。
- v:52 与 v:51 共用同一条 92 字符 part-of 证据（`edges-D1.jsonl:122` 与 `:124`），属锚点盲区 B 型（借用引文）的机械可查实例，可作 SPEC 举例。
