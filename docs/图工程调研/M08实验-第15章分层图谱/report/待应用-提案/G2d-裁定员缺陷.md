# G2d 裁定员发现的缺陷处置

范围：仅处理《待应用清单》§五「裁定员另外查出、须单独处理的正确性缺陷」。
判定手段：tmp_index 各表、源文件 grep、三份裁定员原文。本轮只读，未改 data/。

## 〇 结论速览（共 14 条：成立 14 / 不成立 0 / 待证 0）

14 条全部成立，但**严重性分布与 §五 的排序不同**。用四层证据池逐条复核后，
只有 3 条是真的「证据缺口」，其余是记账位置、审计文本错误或统计口径问题。

按必修优先级重排（与 §五 的行序无关）：

| 级别 | 条目 | 理由 |
| --- | --- | --- |
| **必修·真缺口** | D2（least-squares 射程不足） | 池 T1=2 / **T2=0 / T3=0**，后代数 0。断言在池里**没有任何**证据。唯一的真死因 6 |
| **必修·会引入新错** | D1（A4a 修复文本为假） | 一旦落盘就把真话改成假话；ADJ3 的改写文本已顺手解掉它（见 D11） |
| **必修·文本假** | D12 D13（两条假 claim） | 定稿文本已在 ADJ3 §3，可直接替换 |
| 必修·可执行 | D6 D7 D8 D10（B2 reason 须重写 3 处） | 结论不变，只改 reason 文本 |
| **降级** | D3（function-space 无锚从句） | 覆盖它的引文**已在该节点自己的 T2 池里**（`inherited/edges-A1.jsonl:18`）。记账位置问题，死因 **0** 而非 6。ADJ1 只看到 T3 路径，漏了 T2 |
| 记账·须改文不补证 | D4（十条映射无锚） | 池里只有 2 个不同源行，均无 15.02。**且教材从不陈述该映射**——属「缺理由不缺事实」，见第三节 |
| 阻塞·须先扩 schema | D5 | `node_type` 封闭四值，B2 想要的标签无合法取值 |
| 计数订正 | D9 D14 | D9 成立且**另有一处 ADJ2 未发现的同类计数错**；D14 的全部统计我独立复算一致 |
| 元数据 | D11 | 4 条定稿文本，我核了承重的两条，全真 |

一句话：**§五 里唯一「机器和人都补不了」的是 D2，唯一「不修就会造新错」的是 D1，
而被 ADJ1 与 D2 并列的 D3 其实不该修节点、只该挪个位置。**

## 一 逐条判定表

编号 D1–D14 是我为本节自设的行号，对应 §五 的自然段顺序。

### D1 ADJ1 §3.1：A4a 未落盘的修复文本本身为假

- **缺陷**：`report/audit-A4a-verdicts.jsonl` 建议把「提到实数」改成「含有 real number 这一措辞」。
- **涉及**：`data/nodes-D1.jsonl:24`；`source/apostol-ch15/15.02.md`
- **判定：成立**（第二次独立确认）。我 `grep -ni real 15.02.md`，命中仅 :9 :31 :37 :43 :51。
  逐条对读公理行（A1=:7, A2=:9, A3=:13, A4=:15, A5=:17, A6=:23, A7=:31, A8=:37, A9=:43, A10=:49）：
  A8 写 `all real $a$`、A9 写 `all real $a$ and $b$`，**均不含 "real number"**。
  该改写会把 4 条中的 2 条变成假。
- **死因**：若落盘则为 1（量词过度断言）。当前未落盘，故现状无死因。
- **动作：撤回**（不得应用）。**且已被 D11 顺带解决**——ADJ3 的改写文本用的是
  "contains the word real"，我核了：A2/A7/A8/A9 全含 `real`，另六条无一含，:51 非公理行。**为真。**
- **置信度**：高。判据是可穷举的 10 行文本。

### D2 ADJ1 §3.2：`x:least-squares-is-a-projection` 的 4.1 锚点 D 型射程不足

- **缺陷**：140 字符锚点起点落在动机句之后，支撑不住存活原子「b ∉ 列空间 ⇒ Ax=b 无解」。
- **涉及**：`data/nodes-X.jsonl:20`；锚点 `4.1.md` 140 字符（anchors.tsv）；`source/strang-ch4/4.1.md:31`
- **判定：成立，且是本节唯一的真证据缺口。** 三重独立确认：
  1. anchors.tsv：该节点仅 2 条锚点，`4.1.md` 那条逐字始于 `It contains the error`。
  2. 源行 `4.1.md:31` charlen=413、**n_sentence_end=4**，动机句在同一行前半段。
     这正是**过报通道 (b) 的活实例**：按行号比对会判该断言「已覆盖」，实际未覆盖。
  3. **exposure.tsv 决定性**：`x:least-squares-is-a-projection  0  2  0  0  2  2`
     —— 后代数 0、**T2=0、T3=0**。池里除这 2 条锚点外一无所有，边证据与后代都救不了它。
- **死因**：6（引文不支撑断言）。
- **动作：FIX**（补第三条锚点，现 2 条不触 3 锚上限）。方案见第二节 F2。
- **置信度**：高。这是全节唯一 T2=T3=0 的缺陷节点。

### D3 ADJ1 §3.3：`apostol:function-space` 有形式 E 无锚从句

- **缺陷**：statement 三个从句（逐点加法 / 逐点数乘 / 零元），锚点只覆盖前两个，
  "with the everywhere-zero function as zero element" 无锚。
- **涉及**：`data/inherited/nodes-A1.jsonl:12`
- **判定：成立，但严重性须降级——ADJ1 漏查了 T2。**
  无锚事实确认：该节点 2 条锚点（160 / 146 字符）分别对应前两个从句，第三从句无锚。
  但 pool.tsv 显示覆盖它的 66 字符引文**已在该节点自己的池内，且走的是 T2**：
  `apostol:function-space  T2  自发边 data/inherited/edges-A1.jsonl:18  15.03.md  66`
  该边 `src=apostol:function-space --requires--> apostol:zero-element`，
  evidence 正是 `The zero element is the function whose values are everywhere zero.`
  另有 4 条 T3 路径（经 `nodes-D1.jsonl:60` 与 `:61`）。exposure：T1=2 **T2=2** T3=36。
  **ADJ1 §3.3 只写了「挂在两个 d: 子节点上」（T3），没发现该节点自己发出的边就带着这句话。**
  按本实验的池定义，T2 塌陷 = 记账位置问题，**死因 6 免除**。
- **死因**：0（仅需 FIX，且此 FIX 是可选的整洁化，不是正确性修复）。
- **动作：保留 + 可选 FIX**（方案 F3）。不应与 D2 同级排期。
- **置信度**：高。T2 那条边我已逐字打开核对。

### D4 ADJ1 §3.4：节点 6 的十条映射并入 parent 后仍无锚点

- **缺陷**：A4a 给 `d:example-1-verification-is-the-field-axioms-of-r` 补了 `sections: 15.02`，
  但没加任何 15.02 锚点，十条公理映射仍无锚。
- **涉及**：`data/nodes-D1.jsonl:46`
- **判定：成立，且池也救不了。** anchors.tsv：2 条锚点均在 `15.03.md`（114 / 144 字符），
  无 15.02。exposure：T1=2 T2=1 T3=0，**distinct_src_lines=2**。
  唯一的 T2（`edges-D1.jsonl:111`）引的是**与锚点 0 同一句**
  "The reader can easily verify..."，未引入新源行。按「新引入源行数」这一正确度量，
  边证据的冗余贡献为 **0**。池中无任何 15.02 行 ⇒ 映射表零证据。
- **死因**：6，但属「缺理由不缺事实」子类（见第三节 R1），**不可用补锚解决**。
- **动作：FIX**（改文，非补证）。ADJ3 §3 的定稿文本已把因果句修掉，但映射句仍留在 statement，
  须由主控决定是保留为「模型自验的推论」并标 origin，还是删。
- **置信度**：高（无锚为机械事实）；对处置方式**中**（取决于 SPEC 是否允许标注自验内容）。

### D5 ADJ1 §3.5：B2 的一条修复建议在现行 schema 下不可执行

- **缺陷**：B2 对 `x:dimension-versus-rank` 的 `suggested_fix` 末项要求
  「节点类型宜从共享不变量改标为单边缺口」。
- **涉及**：`report/audit-B2-verdicts.jsonl:89`（我按 id 定位，ADJ1 未给行号）；`SPEC.md:33`
- **判定：成立。** `SPEC.md:33` 明列 `concept` / `method` / `theorem` / `notation`，封闭四值。
  nodes.tsv 实测分布 concept 258 / theorem 173 / method 69 / notation 22（+24 个 L2 空值），
  **无第五种取值在用**。「共享不变量 vs 单边缺口」无合法承载字段。
- **死因**：0（SPEC 表达力缺口，非内容错误）。
- **动作：不进 SPEC 之前该项挂起**；执行者应跳过此项并记录，或按 ADJ1 §2.1 建议
  先扩字段（如 `alignment_kind`）。**不得为迁就它去改 node_type。**
- **置信度**：高。

### D6 ADJ2 §4.1(1)：B2 判决文本转述与原文相反且可被源否证

- **缺陷**：B2 写「其余六条**只谈 V 中元素**，故不受标量域改变影响」。
- **涉及**：`report/audit-B2-verdicts.jsonl:24`；`data/nodes-D1.jsonl:24`；`15.02.md:23` `:49`
- **判定：成立（两重错）。** 我打开 B2:24，reason 逐字含该句。而节点原文写的是
  "name no scalar other than the fixed numbers -1 and 1 (in Axioms 6 and 10)"
  ——**B2 既误述了节点，其误述内容本身又为假**：A6(:23) 含 `$(-1)x$`、A10(:49) 含 `1x = x`，都是标量。
- **死因**：1（B2 的量词断言过度）。导致 ADJ2 §2.2 的翻案（误杀）。
- **动作：FIX**（重写 B2:24 的 reason；判决结论另由 §一/§二 裁定，不在本节）。
- **置信度**：高。

### D7 ADJ2 §4.1(2)：B2 引用了一句节点里不存在的从句（虚构从句）

- **缺陷**：B2 写「剩下的『分组只是叙述性的』是无后果的元评论」。
- **涉及**：`report/audit-B2-verdicts.jsonl:5`；`data/nodes-D1.jsonl:5`
- **判定：成立。** 节点 statement 全文单句：
  "The definition consists of exactly ten axioms, presented in three groups: two closure axioms,
  four axioms for addition, and four axioms for multiplication by numbers."
  **无任何关于「分组只是叙述性的」的从句。** B2 虚构了一个被杀对象再贬低它。
- **死因**：2（虚构成员——虚构对象在审计文本侧，不在图数据侧）。
- **动作：FIX**（重写 reason）。**此条最应记入方法论账**：它说明 B2 的 KILL 理由未经自检回读。
- **置信度**：高。

### D8 ADJ2 §4.1(3)：B2 挂错公理

- **缺陷**：B2 称附加判据是「公理5 节点 `d:axiom-5-existence-of-zero-element` 的直接代入」。
- **涉及**：`report/audit-B2-verdicts.jsonl:60`；`data/nodes-D1.jsonl:60`
- **判定：成立。** 节点写的是 "since **Axiom 2** forces 0f = O into the set"。
  公理 5 只断言零元存在，公理 2 才是强迫机制，强弱不同。
  我另核了 B2:60 提到的两个 id 均**真实存在**（`d:axiom-5-existence-of-zero-element`=`nodes-D1.jsonl:14`、
  `d:degree-exactly-n-has-no-zero-element`=`:70`），故此条**不是**虚构出处，只是挂错。
- **死因**：0（理由错，结论不变）。
- **动作：FIX**（重写 reason，并按 ADJ2 指出的真冗余对象
  `d:zero-polynomial-is-included-by-convention`=`nodes-D1.jsonl:66` 重做比对）。
- **置信度**：高。

### D9 ADJ2 §4.2：B2 报告正文的计数矛盾

- **缺陷**：`report/audit-B2.md` §5.1 称「15.06、15.07、…无任何 D1 节点」，据此得「16 个源文件中 12 个未被 D1 触及」。
- **涉及**：`report/audit-B2.md:107` 附近；`data/nodes-D1.jsonl:71`
- **判定：成立，且我另发现一处 ADJ2 未报的同类错。** 我按 nodes.tsv 独立复算 D1 层：
  81 个节点，section 分布 **15.01=4 / 15.02=22 / 15.03=42 / 15.04=18 / 15.06=1**（6 个节点跨两节）。
  - ADJ2 报的：`nodes-D1.jsonl:71` sections=`["15.03","15.06"]` ⇒ 15.06 有 1 个 D1 节点，
    触及文件 = {15.01,15.02,15.03,15.04,15.06} = 5，未触及 = 16−5 = **11，非 12**。**确认。**
  - **ADJ2 未发现的第二处**：B2 写「15.02 有 21」，实测 **22**（我逐行列出了 22 个 id）。
- **死因**：0（审计报告计数错，不涉图数据）。
- **动作：FIX**（订正两个数字）。ADJ2 提示的先后关系成立：若执行 `:71` 的 KILL，
  B2 §5.1 那句会**在删除后变成真的**，主控须在清单里注明顺序。
- **置信度**：高，两个数字均为我独立复算。

### D10 §五：B2 的 reason 字段须重写的至少有 3 个节点

- **判定：成立，且「至少 3」就是**恰好 3**。** 即 D6/D7/D8 对应的 `audit-B2-verdicts.jsonl:24 / :5 / :60`，
  分别命中「转述反向且为假」「虚构从句」「挂错公理」三型，无重叠、无第四处。
- **死因**：见各条。**动作：FIX**（三处 reason 重写）。**置信度**：中高——
  我只核了 §五 点名的这 3 条，**未**普查 B2 全部 29 条 verdict，故「至少」的上界未核。

### D11 ADJ3 §3：4 个节点须改写，定稿文本在该节

- **涉及**：`nodes-D1.jsonl:24` `:42` `:46`、`nodes-X.jsonl:8`
- **判定：成立。定稿文本存在且我核过的部分全真。** 逐项：
  - `d:axioms-2-7-8-9-…`：新文本 "Exactly four … quantify over an arbitrary scalar, and they are
    the only four whose text contains the word real"。**两个谓词我都核了**：量化任意标量的恰 4 条
    （A2 every real number a / A7 all real numbers a and b / A8 all real $a$ / A9 all real $a$ and $b$）；
    含 `real` 一词的恰这 4 条公理。**为真，且正好绕开 D1 的陷阱。**
  - `d:an-example-…`：新文本含 "six of the ten mention addition and six mention multiplication by numbers"。
    我逐条数：加法 A1,3,4,5,6,8=6；数乘 A2,6,7,8,9,10=6。**为真。**
  - `d:example-1-…`、`x:dimension-versus-rank`：文本读过，未逐字复核其全部子句（见置信度）。
- **死因**：0（改写动作本身）。**动作：进 SPEC 之外的直接 FIX**，采 ADJ3 §3 全文。
- **置信度**：对前两条**高**；对后两条**中——我未逐句复核，标记为「未核」**。

### D12 ADJ3：`d:axioms-2-7-8-9-…` 首句为假

- **缺陷**：首句 "Exactly four of the ten axioms mention real numbers"。
- **涉及**：`data/nodes-D1.jsonl:24`
- **判定：成立，但我要说清它成立的**理由不是**「A6/A10 含实数」这一条。**
  ADJ1 §3.1 顺带称当前的「提到实数」**语义为真**，ADJ3 §2.2 判**假**——两位裁定员在此**直接冲突**。
  单看 "mention real numbers" 是有歧义的：A6 写 `$(-1)x$` 算不算「提到实数」可两读，
  故 ADJ3 的字面读法本身不足以定案。**决胜的是 ADJ3 的第二条理由：节点自身次句
  说另六条 "name no scalar other than the fixed numbers -1 and 1"，即节点自己承认 A6/A10 点了数。
  在节点自己的用词体系内，首句与次句相互矛盾。** 这一条不依赖外部读法选择，故成立。
- **死因**：1。**动作：FIX**（采 D11 的定稿文本，它把谓词换成不可两读的
  "quantify over an arbitrary scalar"，歧义与矛盾一并消除）。
- **置信度**：中高。**不确定点**：若只按字面歧义争，此条可被降为「不精确」；
  内部矛盾这一路径才使它稳定成立。改写动作在两种判法下都该做。

### D13 ADJ3：`d:an-example-…` 末句为假（例 1–4 反驳）

- **缺陷**：末句 "which is why the section fixes the operations before the sets"。
- **涉及**：`data/nodes-D1.jsonl:42`；`source/apostol-ch15/15.03.md:5,:7,:9,:11,:13–19,:21–35`
- **判定：成立。** 我逐行读了 15.03：
  例 1(:5) "Let $V=\mathbf{R}$ … and let $x+y$ and $ax$ be ordinary addition and multiplication"
  ——集合与运算**同句**；例 2(:7) 同句；例 3(:9) 同句（"with addition and multiplication … defined in the usual way"）；
  **例 4(:11) 只给集合**（"Let V be the set of all vectors in $V_n$ orthogonal to a given nonzero vector N"），
  全句未提运算。「运算先于集合」只在函数空间段成立（前言 :13–19 先定运算，:21–35 才列集合），
  即 **12 例中仅覆盖 8 例**（例 5–12）。作为对 "the section" 的整体断言被例 1–4 反驳。
  另 "which is why" 是对作者编排意图的因果断言，源文无据。
- **死因**：1。**动作：FIX**（采 D11 定稿文本，它改为中性的
  "supplies the three data in varying order" 并分述三组，我核了三组描述与 :5–:35 一致）。
- **置信度**：高。判据是可穷举的 12 个例子。

### D14 ADJ3：末句规律与无锚统计

- **缺陷/断言**：5 条缺陷中 3 条在末句、2 条在首句；43 条 claim 里 24 条无锚。
- **涉及**：`report/裁定-ADJ3.md` §1 结论表
- **判定：成立，全部数字我独立复算一致。** 按 ADJ3 §1 表逐列求和：
  claim 总数 5+6+6+6+5+5+4+4+2=**43**；无锚 3+3+5+4+4+3+1+0+1=**24**；
  假 1+1=**2**；不精确 1+1+1=**3**。缺陷 = 2 假 + 3 不精确 = 5，
  其中末句 C4.6 / C5.3 / C6.6 = **3**，首句 C4.1 / C1.1 = **2**。全部吻合。
- **死因**：0（统计断言，非内容缺陷）。
- **动作：保留**（可直接引用这组数字）。
- **置信度**：高（算术复核）。**限定**：我复核的是**表内求和自洽**，
  **未**重做 43 条 claim 的分解本身——若 ADJ3 的分解粒度有偏，总数会跟着偏。这一层**未核**。

## 二 成立缺陷的修正方案（可执行形式）

14 条按可执行性分四类。**只有 F2 触碰 data/**（补/换锚点），F3 可选；其余落在
`report/` 下的审计文本、或须先扩 SPEC。所有引文长度均已实测，标在括号里。

| 编号 | 对应缺陷 | 落盘对象 | 是否触 data/ |
| --- | --- | --- | --- |
| F1 | D1 | 无（撤回一条 suggested_fix） | 否 |
| F2 | D2 | `data/nodes-X.jsonl:20` anchors + sections | **是** |
| F3 | D3 | `data/inherited/nodes-A1.jsonl:12`（可选） | 是（可选） |
| F4 | D11 D12 D13 + D4 部分 | `nodes-D1.jsonl:24 :42 :46`、`nodes-X.jsonl:8` statement | **是** |
| F5 | D6 D7 D8 D10 | `report/audit-B2-verdicts.jsonl:24 :5 :60` 的 reason | 否 |
| F6 | D9 | `report/audit-B2.md:107 :109` 两个数字 | 否 |
| F7 | D5 | SPEC 扩字段，或跳过并记录 | 否（阻塞） |

### F1（D1）撤回，不落盘

`report/audit-A4a-verdicts.jsonl:24` 的 `suggested_fix` 首项「`mention real numbers`
改为 `contain the phrase real number`」**不得应用**：A8 写 `all real $a$`、A9 写
`all real $a$ and $b$`，不含 "real number" 词组，改后 4 条里 2 条变假。
该项被 F4 的 ADJ3 定稿文本覆盖（后者用 "contains the word real"，已核为真），
故 F1 的动作是**在清单里划掉这一项**，不需要任何替代文本。

### F2（D2）`x:least-squares-is-a-projection`：换 1 条锚 + 增 1 条锚 + 补 sections

现状 2 条锚，3 锚上限下有 1 个空位；但 ADJ1 指出的缺口在**已有的那条 4.1 锚**上，
所以只加不换补不上。推荐方案（换 1 加 1，终态 3 锚，正好触上限）：

anchors 第 1 条（15.14.md，100 字符）**不动**。

第 2 条 `4.1.md` 由现文本（140 字符，始于 `It contains the error`）**替换为**：

```json
{"file": "4.1.md", "quote": "When b is outside the column space-when we want to solve $A x = b$ and $\\cos \\mathrm { \\Omega } _ { \\mathrm { { t } } }$ do it-then this nullspace o $A ^ { \\mathrm { T } }$ comes into its own."}
```

实测 192 字符（≤200 合规），逐字取自 `strang-ch4/4.1.md:31`，不跨行。
它把起点前移到动机句之前，直接覆盖存活原子「b ∉ 列空间 ⇒ Ax=b 无解」。
**注意**：串内 `$\cos \mathrm{\Omega}_{\mathrm{{t}}}$` 是源文件里 "can't" 的 OCR 噪声，
按 SPEC「不修正 OCR 噪声」必须原样保留，不得美化。

新增第 3 条锚（73 字符，取自 `apostol-ch15/15.15.md:3`）：

```json
{"file": "15.15.md", "quote": "Then the projection of x on S is nearer to x than any other element of S."}
```

同时 `sections` 由 `["15.14","4.1"]` 改为 `["15.14","15.15","4.1"]`。
理由：该节点 `apostol_ids` 已列 `apostol:theorem-15-16-approximation-theorem`，
而定理 15.16 在 `15.15.md:3`，原 sections 与锚点里都没有 15.15，
即**核心依据所在小节缺席于自己的出处声明**。

**若主控不愿碰 3 锚上限**：退而只做「替换第 2 条」这一半，D2 的存活原子即被覆盖；
15.15 缺席问题降级为 sections 一处字段补写。这是最小可执行子集。

### F3（D3）`apostol:function-space`：可选整洁化，非正确性修复

第三从句 "with the everywhere-zero function as zero element" 的覆盖引文
**已在该节点自己的 T2 池里**（`data/inherited/edges-A1.jsonl:18` 的 evidence，
`15.03.md` 66 字符）。因此本项**不是**必修。若主控仍要让锚点自足，可加第 3 条锚：

```json
{"file": "15.03.md", "quote": "The zero element is the function whose values are everywhere zero."}
```

实测 66 字符（≥30 合规），逐字取自 `15.03.md:19` 后段，不跨行。
**但要先看代价**：shared-quotes.tsv:44 显示这句已被 **5 个持有者**引用
（2 个节点 + 3 条边，含上述 `edges-A1.jsonl:18`），是本图共享度第二高的引文。
再加一条会把它推到 6 个持有者，且**新引入源行数 = 0**（`15.03.md:19` 已在池中）。
按「冗余度 = 新引入源行数」这一正确度量，此 FIX 的证据增益为零，
只换来「锚点自足」这一形式收益。**我的建议：不做，在清单里标为 WONTFIX 并注明理由。**

### F4（D11 D12 D13 + D4 部分）四条 statement 替换

直接采 `report/裁定-ADJ3.md` §3 的四段成品文本，逐字替换对应 `statement` 字段：

| 目标 | 修的缺陷 | 我的复核 |
| --- | --- | --- |
| `nodes-D1.jsonl:24` `d:axioms-2-7-8-9-…` | D12（首句假）+ D1（顺带解掉） | **全核**：两个谓词都真（详见 §一 D11） |
| `nodes-D1.jsonl:42` `d:an-example-…` | D13（末句假因果） | **全核**：加法/数乘各 6 条为真；三组编排描述与 `15.03.md:5–35` 一致 |
| `nodes-D1.jsonl:46` `d:example-1-…` | D4 的因果句部分 | **未逐句核**（见下） |
| `nodes-X.jsonl:8` `x:dimension-versus-rank` | ADJ3 C1.1 缺「有限维」限定 | **未逐句核** |

关于 `nodes-D1.jsonl:24`：**须提醒主控此条已被部分执行过**。当前 statement 的次句
已是 A4a 建议的新文本（"name no scalar other than the fixed numbers -1 and 1…"，
与 `audit-A4a-verdicts.jsonl:24` 的 `suggested_fix` 第二项逐字一致），
而首句仍是旧的 "mention real numbers"。也就是说 A4a 的两项修复**只落了第二项**。
这解释了 D1 与 D12 为何看似矛盾：D1 说的是**未落盘的那一项**，D12 说的是**未被替换的首句**。
两条都成立，且 ADJ3 定稿文本一次覆盖二者。

关于 `nodes-D1.jsonl:46`：ADJ3 定稿只改了末句因果，**十条公理映射句原样留在 statement**，
所以 D4 的证据缺口在 F4 之后**依然存在**。这一半属「缺理由不缺事实」，见第三节 R1，
须由主控单独决定标 origin 还是删——F4 不解决它。

### F5（D6 D7 D8 D10）B2 三条 reason 重写

只改 `reason`，**`verdict` 与 `cause` 不动**（判决本身是否成立由清单 §一/§二 裁，不在本节）。

`report/audit-B2-verdicts.jsonl:24`（`d:axioms-2-7-8-9-…`）——删去末句反向转述，替换为：

```
复述 parent apostol:complex-linear-space 的首句「If real number is replaced by complex number in Axioms 2, 7, 8 and 9, the resulting structure is a complex linear space」——parent 已逐条点名这四条。节点次句「其余六条不指名 -1 和 1 以外的标量,故不受标量域改变影响」是 10 减 4 的补集加一句限定,读 parent 加公理 6、10 原文可得。
```

（原文写「其余六条只谈 V 中元素」，与节点实际用词相反，且该转述本身为假：
`15.02.md:23` A6 含 `$(-1)x$`、`:49` A10 含 `1x = x`，都是标量。）

`report/audit-B2-verdicts.jsonl:5`（`d:ten-axioms-listed-in-three-groups`）——删去虚构从句，替换为：

```
复述 parent apostol:linear-space 的「subject to ten axioms listed in three groups」。三个分组本身已是 L1 兄弟节点 apostol:closure-axioms / apostol:axioms-for-addition / apostol:axioms-for-multiplication-by-numbers,它自己的 atomic_reason 也承认「分组三节点已在 L1 层存在」。statement 的增量仅为 2/4/4 这一分组计数。
```

（原文末句「剩下的『分组只是叙述性的』是无后果的元评论」引用了节点里不存在的从句——
statement 全文为单句，无任何该内容。）

`report/audit-B2-verdicts.jsonl:60`（`d:function-space-zero-is-…`）——改公理号，替换为：

```
复述 parent apostol:function-space 的「with the everywhere-zero function as zero element」。附加的判据「不含该函数的函数集不可能是线性空间」按节点自身用词出自公理 2(closure under multiplication by real numbers 强迫 0f = O 落入集合),不是公理 5(只断言零元存在);所举实例(次数恰为 n)已由 d:degree-exactly-n-has-no-zero-element 承担。
```

（原文挂到 `d:axiom-5-existence-of-zero-element`；节点自己写的是 "since Axiom 2 forces
0f = O into the set"。两个被引 id 均真实存在，故非虚构出处，只是挂错。）

D10 无独立动作：「至少 3 处」经核**恰好 3 处**，即上述三条。
**限定**：我只核了 §五 点名的 3 条，未普查 B2 全部 verdict，上界未核。

### F6（D9）B2 报告正文两个数字

`report/audit-B2.md:107`：`15.02 有 21` → `15.02 有 22`。
同行的「15.06、15.07、…无任何 D1 节点」中**须删去 15.06**（`nodes-D1.jsonl:71` 的
sections 为 `["15.03","15.06"]`）。
`report/audit-B2.md:109`：`16 个 source 文件中有 12 个未被 D1 触及` → `11 个`。
（触及 = {15.01,15.02,15.03,15.04,15.06} = 5，16−5=11。）

**执行顺序约束**：若清单里 `nodes-D1.jsonl:71` 的 KILL 也要执行，则 15.06 重新变为
未触及，:107 的原文与 :109 的「12」会在删除后变真。主控须在清单里标明：
**先删节点、后订正数字，两者只能做一次**，否则会把订正过头。

### F7（D5）阻塞，须先扩 SPEC

`report/audit-B2-verdicts.jsonl:89` 的 `suggested_fix` 末项「节点类型宜从共享不变量
改标为单边缺口」在现行 schema 下无合法取值：`SPEC.md:33` 明列 `concept` / `method` /
`theorem` / `notation` 四值封闭，nodes.tsv 实测分布 concept 258 / theorem 173 /
method 69 / notation 22（+24 个 L2 空值），无第五种在用。
**动作**：执行者跳过此项并记录；同一 `suggested_fix` 的**前三项**（改主张为负向对齐、
把 divergence 证据提升进 statement、删重复的维数定义句）不受阻，可照常执行。
**不得**为迁就它把 `node_type` 改成表外值——那会破坏唯一硬校验之外的封闭词表约束。

## 三 「缺理由不缺事实」类（单列，说明为何边证据补不了）

这一类的共同形态：**结论句在教材里，推理依据不在教材里**。池里能找到「结果」，
找不到「为什么」。补锚点、补边证据、下移到后代都无效——因为要补的那句话源文里不存在。
必须靠**改文**（弱化断言、或标 origin=model 承认是模型自验）解决。

先把三个真证据缺口与本类的关系说清，因为二者容易混：

| 缺陷 | 是证据缺口吗 | 补得上吗 | 归属 |
| --- | --- | --- | --- |
| D2 | 是 | **补得上**（源文有那句话，只是没引） | 第二节 F2 |
| D4 | 是 | **补不上**（源文从不陈述该映射） | 本节 R1 |
| D13 因果半 | 是 | **补不上**（源文无作者意图陈述） | 本节 R2 |

即：**14 条里 3 条是真证据缺口，其中只有 1 条（D2）能用补锚解决。**

### R1 `d:example-1-verification-is-the-field-axioms-of-r` 的十条公理映射

- **事实在池里**：「例 1 满足全部十条公理」有锚——`15.03.md` 114 字符
  "The reader can easily verify that each of the following examples satisfies all the axioms
  for a real linear space."，加 144 字符的 EXAMPLE 1 定义句。**结论句齐备。**
- **缺的是理由**：statement 断言的是**逐条对应关系**（A1,2 = 闭性；A3,4,7,8,9 =
  交换/结合/分配律；A5,6,10 取 O=0、1x=x）。这张映射表在源文里**不存在**：
  `15.03.md` 全文 38 行，`grep -n 'commutativ\|associativ\|distributiv'` **命中 0 次**。
  教材原话就是"reader can easily verify"——**它明确把推导留给读者**，
  所以「源文没有这段推理」不是 OCR 缺失或抽取遗漏，而是教材的写法本身。
- **为什么边证据补不了**：exposure 为 T1=2 / T2=1 / T3=0。唯一的 T2
  （`data/edges-D1.jsonl:111`，part-of 指向 parent）evidence 引的是**与锚点 0 完全同一句**，
  `distinct_src_lines=2`，**新引入源行数 = 0**。且该节点无 part-of 后代，T3 恒为 0。
  更根本的是：**任何**边证据都只能引源文里有的句子，而映射表不在源文里，
  所以这不是「记账位置问题」，扩池到多少层都无解。
- **A4a 补 `sections: 15.02` 反而加重了问题**：它宣称本节点涉及 15.02（公理表所在），
  却没有也不可能加 15.02 锚点——因为 15.02 只陈述公理本身，不陈述「例 1 的哪条对应哪条」。
- **动作**：主控二选一。(i) 保留映射句并标 `origin: model`（承认是模型自验的推论，
  数学上为真，ADJ3 §2.4 已判「数学全真」）；(ii) 删映射句，只留"reader can easily verify"
  这一层。**我倾向 (i)，且 (i) 无阻塞**——原先我以为它须先确认 SPEC 是否支持节点级
  origin，复核后**该顾虑不成立**：`SPEC.md:55` 就在锚点规则里写「找不到可逐字引用的依据
  ⇒ 不要收录，或标 `origin: model` 并如实说明」，这是**节点侧**条款；
  且节点级 origin **已在用**——nodes.tsv 实测 33 个节点带该字段（origin=model 24 / source 9），
  其中 4 个 `d:` 节点是 **0 锚 + origin=model** 的现成先例
  （`nodes-D2.jsonl:42 :54 :72 :73`，即 `d:exponential-independence-uses-no-inner-product` 等）。
  R1 与它们同型，照此先例落盘即可，**不需要扩 SPEC**。
- **死因 6，但不可用补锚消除。置信度**：高（grep 0 命中是机械事实）；
  对处置选择**由中升为高**（先例与 SPEC 条款均已核实，见上）。

### R2 `d:an-example-…` 末句的作者意图因果（"which is why"）

- **事实在池里**：三组编排的**事实**有锚且为真（例 1–3 集合与运算同句，例 4 只给集合，
  例 5–12 共用函数空间前言的运算），我逐行核过 `15.03.md:5–35`。
- **缺的是理由**：原文的 "**which is why** the section fixes the operations before the sets"
  是对**作者为何这样编排**的因果断言。源文里没有任何句子解释编排理由，
  Apostol 从不自述章节安排动机。这类断言在原理上无锚可补。
- **与 D13 的关系**：D13 的另一半（"运算先于集合"这个**事实**为假，例 1–4 反驳）
  是普通的死因 1，靠改文即可；本节只处理它的**因果半**。
- **动作**：F4 的 ADJ3 定稿文本已把 "which is why" 换成中性的
  "The section supplies the three data in varying order"，**因果断言整句消失**。
  这是本类唯一已经有现成解的一条。**死因 1（假因果）。置信度**：高。

### R3 附论：D6 / D8 / D12 是同一形态在审计侧与内容侧的三次出现

三者都不是「引文缺失」，而是「推理链错误」：D6 是 B2 的补集推理漏了 A6/A10 的标量；
D8 是把强迫机制挂到只断言存在的公理 5；D12 是节点首句与自身次句互相矛盾。
**共同点：给它们补任何引文都不会让理由变对。** 之所以单列在此，
是为了让主控不要把它们塞进「补锚点」批次——它们属于**改文**批次。
特别是 D12：ADJ1 判首句语义为真、ADJ3 判假，两位裁定员直接冲突，
而**决胜的不是字面读法**（"mention real numbers" 对 A6 的 `$(-1)x$` 可两读），
**是节点自身次句已承认 A6/A10 点了数这一内部矛盾**——这条理由不依赖读法选择。
按「看谁的理由建立在证据上」，ADJ3 胜，但胜在第二条理由而非第一条。

## 顺带发现

范围外，每条一行，不展开。

- **我改了本文件已完成部分的一处**：§三 R1 的「动作」与「置信度」两行。原文称处置方式 (i) 须先确认 SPEC 是否支持节点级 origin、并称「目前 origin 只见于边」——**该表述为假**，故按指令只改这一条：`SPEC.md:55` 是节点侧条款，且 nodes.tsv 实测 33 个节点已带 origin 字段。§〇 与 §一 未动。
- 节点级 `origin` 的实际用法：nodes.tsv 有 24 个 model + 9 个 source，集中在 `nodes-D2/D3/D4/H2`；`nodes-D1.jsonl` 仅 1 个（:23），`nodes-X.jsonl` / `inherited/*` / `structures-L2-*` **一个都没有**。同一实验内标注习惯不统一，值得单独立项。
- 4 个 `d:` 节点是 **0 锚点 + origin=model**（`nodes-D2.jsonl:42 :54 :72 :73`）。这与 `SPEC.md:52`「至少 1 条锚点」字面冲突，但被 `:55` 的例外条款覆盖；SPEC 未明写二者的优先关系，建议补一句消歧。
- `unverified-model-quotes.tsv` 那 15 条我全部逐字复核了（脚本按 file+quote 反查源文件，反转义 `\\`→`\`）：**15/15 命中，MISS 0**，且各条 charlen 61–162 全在 30–200 内。check_graph 不校验它们是真的，但**这批不含篡改引文**。这是好消息，不是缺陷。
- §二 F2/F3 提议的 3 条锚点我在写完后又独立验了一遍：`4.1.md:31`（192 字符）、`15.15.md:3`（73 字符）、`15.03.md:19`（66 字符），均单行内逐字命中、长度合规。落盘前无需再验。
- `node_type` 空值 24 个全部来自 `structures-L2-*.jsonl`（L2 层 schema 本就不含该字段），不是缺失。凡报 node_type 分布必须说明是 522 还是 546 口径，否则会被误读为 24 个节点缺类型。
- D10 的「至少 3 处」上界仍未核：我未普查 `audit-B2-verdicts.jsonl` 全部 verdict 的 reason 字段。若要闭合这个上界，需要一轮独立的 B2 reason 全量回读，**不在本节范围**。
