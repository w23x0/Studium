# 形式 D 分片的主控核验记录

八个形式 D 分片各自独立审查,回来后我(主控)对其**最重指控**逐条抽核。
本文件只记录我亲自验证过的部分,**不是分片报告的汇总**,也不替代分片报告。

原则:分片报告是一手发现,但**不自动采信**。凡指控"节点间互相矛盾"或"原文根本没有某内容"
这类强断言,我回原文核。已有先例证明代理会把两条相容的表述读成矛盾。

<!-- 分片按返回顺序追加 -->

## D2 片 36–58(23 个节点,声明无截断)

分片报告:`report/审查-形式D-D2-片36-58.md`

### 我核实并确认的

三条源文断言全部为真(逐行 `sed` 核过):

- `15.07.md:39` = `EXAMPLE 7. If $a_1, \ldots, a_n$ are distinct real numbers, ...` — distinctness 确实在此。
- `15.07.md:45` 含 `We can prove this by induction on $n$` — 归纳法是原文明写的。
- `15.07.md:61` 确实以 `Proof.` 开头,内容是把 Theorem 15.5 归约到 Theorem 12.8,
  并论证该证明只依赖 V_n 是线性空间。

**line 36 / line 39 的冲突指控成立。** `d:...-select-the-largest-exponent` 末句称
"the choice is what makes all the other exponents smaller by a strictly negative amount"。
取最大只能给出 `a_k − a_M ≤ 0`;**严格**性来自 `a_k ≠ a_M`,即 distinctness。
而同片的 `d:...-negativity-of-the-shifted-exponents` 正确写道
"This is where the distinctness hypothesis is consumed"。两个节点对**同一步的严格性**给了
互斥的归因,line 36 那个是错的。分片的判断正确。

**line 45 确有缺陷,但比分片说的窄。** `d:thm-15-5-proof-delegated-to-theorem-12-8` 的锚点是
`When $V = V_{n}$ , Theorem 15.5 reduces to Theorem 12.8.`,只管住第一句。
后两句("then argues that the old proof transfers"、"no proof inside Chapter 15")在射程外
——**又一个末句形式 D**。且末句为假:`:61` 有一段标着 `Proof.` 的文字,归约论证也是证明。

### 我核实后**否掉**的指控

**分片称 line 45 与 line 46 互相矛盾。不成立。**
line 46 的原文是 "This audit, **not any new computation**, is what makes Theorem 15.5 hold in arbitrary linear spaces."
它自己就说了"没有新计算",这与 line 45 的 "Apostol gives no new argument" **方向一致**。
两者不冲突。分片把"46 说 audit 使定理成立"读成了"46 说这里有新论证",误读。

这条记下来有方法论价值:**"节点间矛盾"是最容易被误报的一类指控**,因为它要求同时正确
理解两个节点,误读任一个都会产生假矛盾。后续分片凡报此类指控,一律回原文核双方。

### 尚未核验的部分

分片另报了 line 37、42、54 三处实质缺陷,以及 line 49/52/57 三处形式 E,
均**未经我抽核**,按一手发现登记,待后续裁定。
其中 line 42 `d:exponential-independence-uses-no-inner-product` 值得优先核:
分片称它零锚点、`origin:model`,且其"正面工具清单"漏了归纳法(而 `:45` 明写归纳)、
又多了一条假的(指数非零)。若为真,这是一个模型自造清单被当成原文审计结果的实例。

### line 42 的追加核验:指控成立

`d:exponential-independence-uses-no-inner-product`,三项结构事实全部核实:
`anchors: []`、`origin: model`、`origin_note` 自称
"obtained by inspecting every step of Example 7 in 15.07"。

读完整证明(`15.07.md:39–57`)后逐项核它的正面清单
"ordering of the reals, the exponential addition law, nonvanishing of the exponential and one limit":

| 清单项 | 是否真被用到 |
|---|---|
| ordering of the reals | ✅ `:51` "Let $a_M$ be the largest" |
| exponential addition law | ✅ 乘 `e^{-a_M x}` 得 `e^{(a_k−a_M)x}` |
| **nonvanishing of the exponential** | ❌ **未被用到** |
| one limit | ✅ `:57` `x \to +\infty` |
| **induction** | ❌ **被漏掉**,而 `:45` 明写 "We can prove this by induction on $n$" |

非零性那条:证明只做前向的 (15.2)→(15.3),等式两边乘任何东西都保持 `= 0`,
**不需要乘数非零**。(若要反推 (15.3)→(15.2) 才需要,但 Apostol 没做这一步。)
这与分片报的 line 37 是**同一个错误**,出现在两个节点里。

所以这个节点的问题不是"零锚点"本身——`origin: model` 已诚实声明它不是原文断言。
问题是 `origin_note` 声称做了穷举审计("every step"),而清单同时**多一条假的、少一条最重要的**。
声明的严谨性与内容的严谨性脱节。

它的**负面**清单(no inner product / norm / orthogonality / differentiation / dimension count)
经核**全部为真**——证明确实不含这些。分片建议保留负面清单、修正面清单,判断正确。

### 分片自报的负面结果(有价值,未复核)

- 本片**无有限维假设增删**。`15.11.md` 那个陷阱在此片未触发。
- **SPEC 约束在本片造成零次证据不足。** 无节点用满 3 个锚点槽;它量的 12 条候选修复引文
  落在 39–187 字符。这与 SPECQ 的结论方向一致:损害集中在公理方程,不在定理陈述。
- 它另记了两处 SPEC 盲区:line 55 是**章级否定存在断言**(任何单条引文都无法见证,
  它用跨 16 文件 `basis|bases` 穷举核过),line 38 依赖的指数加法律**在 15.07 根本不出现**
  ——那是源文缺失而非长度问题。
- Theorem 12.8 无法核验,**第 12 章不在 `source/` 里**。这限制是真的,归约论证的底座不可见。

## D4 片 28–54(27 个节点,声明无截断)

分片报告:`report/审查-形式D-D4-片28-54.md`。覆盖 15.13–15.15:正交补、Theorem 15.15
(正交分解)、投影、Theorem 15.16(逼近定理)、Fourier 系数。**D4 此前完全没人碰过。**

自报 9 个形式 D、8 个形式 E、10 个支撑充分,**零 KILL**——它称所查的缺陷断言回原文核后都为真,
失败全在锚点覆盖,故判 `0`=KEEP+修锚点。这个分布本身值得注意:与 D2 片
(5 处实质缺陷、含真值为假者)形成对比。

### 我核实并确认的

**line 48 是本次抽核里最干净的 D 型实例。** `d:approximation-inequality-with-equality-only-at-the-projection`
两条锚点分别落在 `15.15.md:3`(定理陈述首句)与 `:9`(等号条件),而 `Proof.` 从 `:11` 开始
——**两条锚点都没进证明体**。该节点的整个存在理由是证明结构(两步、Pythagorean 恒等式、
为何被许可、Theorem 15.9(a)(b) 供给严格性),这些全在射程外。
主题相关性完美(引文可见地在谈这条定理),覆盖率为零。这正是 D 型最危险之处的标准形态。

**line 51 的数学指控成立,且又是末句。** `d:pythagorean-split-of-the-approximation-error`
末句写 "the error of any competitor exceeds the error at s by exactly ||s - t||^2"。
恒等式给的是 `‖x−t‖² = ‖x−s‖² + ‖s−t‖²`,即**平方**误差相差 `‖s−t‖²`;
误差本身相差 `‖x−t‖ − ‖x−s‖`,与 `‖s−t‖²` 不等,量纲都不同。**字面为假。**

**"差 2 字符"的 SPEC 断言精确成立,且比此前记录的缺陷更严重。** 实测:

| 行 | 内容 | 字符 |
|---|---|---|
| `15.15.md:6` | `\| x - s \| \leq \| x - t \|` | **28** |
| `15.15.md:14` | `x - t = (x - s) + (s - t).` | **26** |

`:6` 是 **Theorem 15.16 的核心不等式本身**,`:14` 是其证明的枢纽代数步。
此前 SPEC 缺陷的受害者只记到公理方程(Axiom 6/7/8/9 的 16/18/22/22 字符),
**现在延伸到一条定理的中心断言与一个证明的关键步骤**。
`SPEC缺陷-锚点规则量化.md` 的结论"定理陈述句本身不受影响"仍成立
(那说的是**自然语言陈述行**),但要补一句:**定理所断言的那条不等式同样不可引**,
且这不是孤例。已通知 SPECQ 无法通知(它在跑),记在此处待并入。

### 我核实后往下修一档的指控

**分片称 line 30 "说四项义务却有 5 个 `part-of` 子节点"。计数属实,但不是自相矛盾。**
5 个子节点已用脚本核过。但 statement 自己写着第四项
"check s perp = x - s is orthogonal to S, **which itself needs** the reduction from all of S to the basis elements"
——第五个子节点 `d:orthogonality-to-the-basis-extends-to-all-of-s` 正是那个 reduction。
四项义务中第四项内含两步,散文按义务计数、边按步骤计数,**是粒度差异不是矛盾**。
降级为"计数口径未声明",不作缺陷。

line 30 其余部分的指控(四项义务分类、"only the second is a construction"、
"the basis is the only arbitrary input"、末句关于唯一性使构造与选择无关——皆为模型自造且无
`origin: model`)未逐条核,按一手发现登记。它拿 line 40 作对照(同样重构了被折叠的步骤,
但在 statement 里说明了并标了 `origin: model`)这个论证方式是对的:**同一批生产中模式可用而未用,
比模式不存在更能定性。**

### 值得单独记的一条结构发现(未复核)

分片报"未声明的模型内容是本片的系统性问题":6 个节点(30/31/36/45/48/51)带模型自造断言
但无 `origin: model`,4 个有。它指出这个集合**与形式 E 集合几乎重合**,
因此可能存在一条**可机械检查的生产规则**。若成立,这是本实验少见的"可机械化"正面线索
——与 B 型共享检测同类,而 B 型是此前唯一一条。值得后续验证。

注:我已核实 line 48、51、30 三个节点的 `origin` 字段确实为 `None`,与它的说法一致。

### 分片自报的负面结果(未复核)

- **SPEC 不是本片任何缺陷的原因。** 无节点用满 3 槽(4 个用 1 槽、23 个用 2 槽、0 个用 3 槽);
  它为每个缺陷都找了修复引文并量了长度(186/83/148/44/90 字符),全部合规。
- **4.1 有限维、4.2 实/复:干净。** 无增删假设。它给 line 49 记了功:该节点追踪了有限性
  进入 Theorem 15.16 的**两条**通道(对 15.15 的引用,以及 "projection of x on S" 这个短语本身)。
- **4.3 反常积分:风险未触发。** 本片无节点碰 `15.10.md:59/73/75–81`,
  它明确记为"无测试用例"而非"检查通过"——这个区分是对的,值得表扬。
- **4.4 计算值**:仅 line 54 有,两个符号值手工验算为真
  (`(f, φ_{2k−1}) = √π·a_k` 与 k=0 项贡献 `a_0/2`),但**均无锚点**,
  而 (15.20) 在 `15.15.md:28` 有现成可引处且该节点有空槽。**正是 grep 脚本漏掉的那类。**
- **图谱覆盖缺口**:15.15 的 Example 2(Legendre)**根本没有节点**。它独立验算了该例的算术,
  但明确声明那不是节点审查。这是覆盖缺口,不是节点缺陷,登记待补。
- B 型:9 组复用引文中 1 组是真借用(line 44 借了 line 36 的唯一性宣告)。
  这条与专职 B 型审查员的工作可交叉验证。

## D1 片 57–81(25 个节点,声明无截断)

分片报告:`report/审查-形式D-D1-片57-81.md`(483 行)。

### 最重要的产出是方法论,不是缺陷清单

**这个分片额外查了边上的证据,并因此推翻自己 3 个初判**(#61、#66 从 D/E 降级,#70 从 E 改判 B 型)。
我核实了这一点:边的 `evidence` 是 **dict**(`{"file":..., "quote":...}`)而非 list,
我自己第一次查也因猜错形状而查空。实例:

```
d:degree-exactly-n-fails-axiom-1-with-an-explicit-witness -[other]-> d:axiom-1-closure-under-addition
  rel_note: "violates this axiom: t^n and -t^n + t both have degree n but their sum t does not"
  evidence: {"file":"15.03.md","quote":"For example, the sum of two polynomials of degree n need not have degree n."}
```

**结论:一个断言的证据可能挂在边上而不在节点的 `anchors` 里。**
只读 `anchors` 字段的形式 D 审查会在这类节点上**系统性过报**。
D2、D3、D4 各片的简报都没要求查边——它们自报的形式 E 计数因此**可能偏高**,
需要在汇总时逐条回查边。这是本轮最有价值的单条发现,且它是分片**自我推翻**得来的,
可信度高于一般的一手发现。

同时注意:这不改变形式 D 的判定。射程不足是"引文覆盖不到断言",
无论那引文挂在节点还是边上都要看得见——只是候选证据池变大了。

### R-1 成立,但它建议的修法也有洞

`d:degree-exactly-n-fails-axiom-1-with-an-explicit-witness` 的见证
`p(t) = t^n`、`q(t) = -t^n + t` 声明"both of degree n"。
**n = 1 时 `q(t) = −t + t = 0`,零多项式无次数**,声明为假。n = 0 时 `q = −1 + t` 是 1 次,也不对。
statement 对 n 无任何限制,`rel_note` 里复制了同一个错误。分片的指控成立。

它建议改成 `q(t) = -t^n + 1`,但**n = 0 时 `−1 + 1 = 0`,同样塌**。
更简洁且对所有 n ≥ 0 一致成立的见证:**`p(t) = t^n`、`q(t) = −t^n`,和为零多项式,无次数,离开集合。**

已核 `15.03.md:25`:Apostol 只写 "where n is fixed",**没给 n 的下界**;
且他**根本没给见证**,原文只有 "the sum of two polynomials of degree n need not have degree n."
所以这个见证完全是模型自造,错在生产者,不在 SPEC 也不在源文。

### 分片的其它发现(未逐条复核)

- 形式 D 6 处(#58/#62/#67/#69/#75/#80)。其中 **#62 的形状值得注意**:
  它断言"Apostol 在恰好三处点名闭包公理",分片核实**计数为真**(`:25`、`:33`、`:35`),
  但单条锚点只覆盖 1 处,而缺的两条引文分别 69 和 98 字符**合法**、且有 2 个空槽。
  **断言为真 + 证据不足**,这正是 D 型的定义形态,也说明 D 型与"数学错误"是两个独立维度。
- **#72/#74/#78 的形式 E 归因给了源文范围而非生产者**:闭包论证依赖章外定理,
  `source/` 只有第 15 章,**锚点不可能存在**。这个归因是对的,与 D2 片报的
  "Theorem 12.8 不在 source 里" 是同一个结构性限制的第二次独立触发。
- SPEC 归因 3 类,其中一条**对照极干净**:#59 成功而 #57 失败,
  唯一差别是 Apostol 把标量乘法写成散文、把加法写成独立 display 公式。
  #57 是"27 字符 + 独立公式行"双重锁死。这为 SPEC 修订提供了受控对照。
- **末句模式再次成立:10 处确认缺陷有 9 处在末句。** 唯一例外 #79,
  而它例外的原因有解释力——Apostol 自己写了 "Here again 0 is essential",
  **原文替节点做了跨例指点**,所以末句落在射程内。这条比统计数字更有说明力。
- 一条共享引文扇出到 **6 个节点**(#62/#64/#67/#69/#70/#71),真正需要它的只有 2 个。
  与专职 B 型审查员的清单交叉验证(该组也在我生成的 `_形式B-共享引文候选.md` 里)。
- #70 的锚点**逻辑上不可能支撑它**(Axioms 5/6 不是闭包公理),
  但其 `atomic_reason` 诚实声明了补充。诚实声明与证据不足并存,这个组合怎么判要进 SPEC 议题。

### 悬置项(分片自己声明)

它**没读 `SPEC.md`**,故 R-5(`is a function space` 这个谓词在 8 个节点上无锚,
而承载它的句子被一个兄弟节点和 #61 的边用掉了)只登记事实、不给判决
——判决取决于 SPEC 是否允许共享前提寄存在专用节点+边上。**这个悬置是正确的做法**,
它没有为了给结论而猜规则。该问题并入 SPEC 待议清单。

## 边证据的传播核验:D4 片的头条**不成立**

上一节的方法论发现一旦成立,就必须回查其余分片。我先量化了风险面
(脚本一次性,`report/_边证据索引.md` 是它的产物):

| 节点文件 | 节点数 | 证据池因边扩大 | 占比 |
|---|---|---|---|
| `nodes-A1.jsonl` | 63 | 60 | 95% |
| `nodes-S1.jsonl` | 62 | 52 | 84% |
| `nodes-D4.jsonl` | 54 | 42 | **78%** |
| `nodes-D3.jsonl` | 69 | 39 | 57% |
| `nodes-D1.jsonl` | 81 | 45 | 56% |
| `nodes-D2.jsonl` | 80 | 37 | 46% |
| `nodes-X.jsonl` | 22 | 0 | 0% |

全图 1433 条边中 **931 条带 evidence**。**自身 anchors 为空、只靠边供证的节点是 0 个**
——所以"无锚节点"这一最坏情形不存在,过报风险全部集中在**射程(形式 D)**上,不在形式 E 的无锚子情形。
D1 校准段 57–81 有 13/25 个节点的证据池因边扩大,而该片推翻了 3 个初判。
**D4 以 78% 为最高风险,故优先回查。**

### 回查结果:D4 line 48 的"覆盖率为零"是错的

我此前把这条记成"本轮最干净的 D 型实例"(锚点在 `15.15.md:3` 和 `:9`,`Proof.` 在 `:11`,
所以锚点碰不到证明体)。**这个判断要撤掉。**该节点的 5 个 `part-of` 子节点各自把证明体的原句挂在边上:

```
<-- d:approximation-proof-starts-from-the-orthogonal-decomposition
      EV "By Theorem 15.15 we can write $x = s + s^{\perp}$ , where $s \in S$ and $s^{\perp} \in S^{\perp}$ ."
<-- d:x-minus-t-splits-orthogonally        EV "this is an orthogonal decomposition of $x - t$ ,"
<-- d:pythagorean-split-of-the-approximation-error
      EV "\| x - t \| ^ {2} = \| x - s \| ^ {2} + \| s - t \| ^ {2}."
<-- d:equality-holds-exactly-when-t-equals-s  EV "with equality holding if and only if $s = t$ ."
```

**证明体在图里被完整覆盖了**,只是覆盖它的是子节点而非父节点自己的 anchors。
而这个节点正是一次分解的父节点,子节点承载各步骤**就是预期结构**。
所以"主题相关性完美、覆盖率为零"这个说法为假,该撤回。

### 但 line 48 有一个别的、更窄的真缺陷

其 statement 末尾写:"it is **Theorem 15.9(a),(b)** (||z|| = 0 iff z = O) —— not any property of S —— that turns this into t = s."

已核 `15.15.md:11–23` 全文:**Apostol 的证明从头到尾没有引用 Theorem 15.9**,
他只写 "with equality holding if and only if $s = t$ ." 这个定理号是模型补的。
又核 `15.10.md:121–125`:Theorem 15.9 (a) `\| x\| = 0` if `x = O`、(b) `\| x\| >0` if `x\neq O`
——**数学上这个引用是对的**,(a)(b) 合起来确实给出 `\|z\|=0 ⟺ z=O`。

所以形状是:**数学正确、归因正确、但 Apostol 在此处没作此归因,且节点无锚指向 15.10。**
这是形式 E,不是形式 D;**可修**,但修法要挑对分支(见下)。
**又一次落在末句。** `origin: None`,属未披露模型内容。

#### 修法的锚点必须选 (b),不能选 (a)——已量

形式 B 审查员独立报出"Theorem 15.9(a) 只有 29 字符,差一个字符"。我实测 `15.10.md`:

| 行 | 内容 | 字符数 | 可引 |
|---|---|---|---|
| 121 | `THEOREM 15.9. In a Euclidean space, every norm has...` | 126 | ✅(但不含具体性质) |
| 123 | `(a) $\| x\| = 0$ if $x = O$ .` | **29** | ❌ 差 1 |
| 125 | `(b) $\| x\| >0$ if $x\neq O$ (positivity).` | **42** | ✅ |

节点引的是 "Theorem 15.9(a),(b)",而**不可引的那一支恰好是证明不需要的那一支**:

- (a) 给 `x = O ⟹ \|x\| = 0`;
- (b) 给 `x ≠ O ⟹ \|x\| > 0`,逆否即 **`\|x\| = 0 ⟹ x = O`**;
- 15.15 的证明需要的是 `\|s−t\| = 0 ⟹ s = t`,**正是 (b) 的逆否,与 (a) 无关。**

所以我上面写的"可修"要收窄成:**锚点挂 `15.10.md:125`(42 字符,合法),
并把 statement 的引用从 "(a),(b)" 改为 (b)。**引 (a) 既不可锚也不必要。
**这一处 SPEC 的 30 字符下限没有真的挡住修复**,只是逼着修复者选对逻辑分支
——而选错分支的后果是永远也锚不上,还会误以为是 SPEC 的错。这是本轮唯一一个
"SPEC 下限看似致命、实则可绕"的实例,值得写进 SPEC 议题作为反面对照。

### line 51 的数学缺陷**维持**,且同样在末句

statement 末句:"the error of any competitor **exceeds the error** at s **by exactly ||s − t||^2**."
恒等式给的是 `‖x−t‖² = ‖x−s‖² + ‖s−t‖²`,即**平方误差**之差为 `‖s−t‖²`。
把"误差"与"平方误差"混用后该句字面为假,量纲也不一致。原判定成立,`origin: None`。

### 这一节的教训

D4 片把两个不同的东西都叫成了"锚点覆盖不到":一个是父节点靠子节点覆盖(**不是缺陷**),
一个是补了 Apostol 未作的定理归因(**是缺陷**)。
**只读 `anchors` 的审查不仅会过报,还会把过报和真缺陷混在同一条指控里**,
使得整条指控看起来一起成立或一起不成立。汇总时必须把每条指控拆到单句再回查边。
**全部六片(D1–D4、A1、S1)现已做完这个回查。** A1、S1 见下节;D3、D2 见本文件末节。

## A1 与 S1 的边证据回查:过报只打 cause 6,一条不打 cause 1

A1 的证据池扩大率 95%、S1 84%,是全部分片里最高的两个,所以先做这两片。
用 `audit-A5-A1-verdicts.jsonl`(63 条)与 `audit-A6-S1-verdicts.jsonl`(62 条)——
这两个是审查员 A(数学正确性 + 锚点是否支撑断言)的输出,只有它们会受这种过报影响;
审查员 B 判冗余,不看锚点射程。

先按 cause 分层,把范围收窄到真正的指控:

| 文件 | 总数 | cause 0 | cause 1(过度断言) | cause 6(锚点不支撑) |
| --- | --- | --- | --- | --- |
| `audit-A5-A1-verdicts.jsonl` | 63 | 57 | 2 | 4 |
| `audit-A6-S1-verdicts.jsonl` | 62 | 60 | 1 | 1 |

(先用关键词筛"锚点类措辞"筛出 56/63,过宽——KEEP 理由里只要**提到**某条锚点就命中。
按 cause 分层才是对的筛法。这一步本身是个教训:**指控的筛选判据要用结构字段,不要用措辞。**)

### 逐条结论

| 节点 | cause | part-of 后代 | 结论 |
| --- | --- | --- | --- |
| `apostol:theorem-elementary-algebraic-properties` | 6 | **16** | **指控不成立** |
| `apostol:theorem-15-11-components-relative-to-an-orthogonal-basis` | 6 | **7** | **指控不成立** |
| `apostol:parsevals-formula` | 6 | **5** | **指控不成立** |
| `apostol:zero-element` | 6 | 1 | 指控的**理由**不成立,但**缺陷是真的**(见下) |
| `strang:pivot-columns-basis-for-column-space` | 6 | **0** | **指控成立** |
| `apostol:real-euclidean-space` | 1 | 0 | **指控成立**,边证据完全不触及 |
| `apostol:orthonormal-set` | 1 | 2 | **指控成立**,边证据完全不触及 |
| `strang:basis` | 1 | 0 | **指控成立**,边证据完全不触及 |

**cause 1 三条,零条被边证据动摇。cause 6 五条,三条整条倒掉、一条理由倒掉。**
这不是巧合:cause 1 说的是"节点断言超出原文",这是**节点自己多说了**,
后代节点再怎么有证据也不能替它把话收回去;cause 6 说的是"这句话没有引文",
而引文**可以长在别处**。两种死因对边证据的敏感度天然不同。

### 三条倒掉的怎么倒的

`apostol:theorem-elementary-algebraic-properties`:指控说"八条恒等式 (a)–(h) 一条都没锚点,
三条锚点全是脚手架(定理前言、引入句、'We shall prove (a), (b), and (c)…')"。
**三条锚点的描述完全准确**,但 16 个 part-of 后代把八条逐条写在边和自有锚点上:

```
(d) If $ax = O$ , then either $a = 0$ or $x = O$ .          (50)
(e) If $ax = ay$ and $a \neq 0$ , then $x = y$ .            (48)
(f) If $ax = bx$ and $x \neq O$ , then $a = b$ .            (48)
(g) $-(x + y) = (-x) + (-y) = -x - y.$                      (38)
(h) $x + x = 2x, x + x + x = 3x$ , 且 $\sum_{i=1}^{n} x = nx$ (76)
Proof of (a). Let $z = 0x$ . We wish to prove that $z = O$ . (60)
Proof of (b). Let $z = aO$ , add $z$ to itself, use Axiom 8.(64)
Proof of (c). Let $z = (-a)x$ , adding to $ax$ , Axiom 9…    (82)
```
公式类引文 20 条,证据池 27 条。**(a)–(h) 全覆盖。**

`apostol:parsevals-formula`:指控说 (15.11) 与 ‖x‖² 特例都无锚,还特意点出"两式都可引(104、70 字符)"。
两式都在池里——(15.11) 116 字符走 `edges-D3.jsonl:65`,(15.12) 70 字符走后代 `d:parseval-norm-form`。
附带还有 `(x, y) = \overline{{(y , x)}},\tag{1'}`(39)从后代
`d:parseval-conjugate-comes-from-hermitian-symmetry` 上来,正好支撑指控自己承认为真的那个共轭。

`apostol:theorem-15-11-…`:这条最值得记,因为**它暴露了我上一轮方法的漏洞**。
第一遍脚本只查"直接触及该节点的边",算出 (15.8) 和 (15.10) 有、(15.9) 没有,
于是我准备判"指控部分成立,(15.9) 那句残留"。
实际 (15.9) 挂在 `nodes-D3.jsonl:63` `d:orthonormal-basis-component-is-the-inner-product`,
33 字符,而这个节点的 parent 是 `d:orthogonal-basis-component-formula`——
**它是定理的孙节点,不是子节点,所以不在任何一条直接触及定理的边上。**

改成沿 part-of 求传递闭包后,7 个后代、16 条证据、8 条公式类,(15.7)(15.8)(15.9)(15.10) 全在,
还多出一条把两式连起来的证明行:
`since $(e_i, e_j) = 0$ if $i \neq j$ . This implies (15.8), and when $(e_j, e_j) = 1$ , we obtain (15.9).`

**教训:覆盖沿 part-of 链传递,深度不止一层。**只查一层的回查会漏报覆盖、从而错误维持指控——
方向和"只查 anchors"的过报一样,只是程度轻一级。我在 D4 那节做的回查只查了直接子节点,
结论恰好没受影响(那五个都是直接子节点),但**方法当时就是不完整的**,现已改正。

### `apostol:zero-element`:理由错、缺陷真,须改判死因

指控原文:句 2「In a function space the zero element is the function whose values are everywhere zero」
为真,但出自 15.03,而节点 `sections` 是 `['15.02','15.04']`,两条锚点都不覆盖它,
"读者按列出的小节去查,查不到"。

回查:那句话的原文**在证据池里**,66 字符,走
`edges-A1.jsonl:18  apostol:function-space -[requires]-> apostol:zero-element`,
引文是 `The zero element is the function whose values are everywhere zero.`
所以"无引文支撑"(死因 6)不成立。

但**审查员指出的现象是真的**,只是它归错了类:`sections=['15.02','15.04']` 里没有 15.03,
而该句的唯一出处是 15.03。这是 **`sections` 字段漏声明**,不是锚点缺陷。
处置:`sections` 补 15.03,死因由 6 改为 0(或按 SPEC 待议里的 `sections` 语义问题另立)。
**这是本次回查里唯一一条"审查员看对了现象、归错了类"的**,
和 D4 那条"把过报和真缺陷混在一条指控里"是不同的错法:那条是两件事混在一起,这条是一件事贴错标签。

### 五条成立的指控,要点

`strang:pivot-columns-basis-for-column-space`(cause 6,**成立**):
后代 0,证据池 5 条、公式类 0 条。指控说
"'independent because they start with the r by r identity matrix' 在 3.5:59–63 是对 **R** 的枢轴列说的,
节点挂到了 **A** 的枢轴列上;对 A 这条理由一般为假,而节点末句又强调'必须用 A 的而不是 R 的',自相矛盾"。
反例 `A=[[2,4],[1,3]]` 我复核过:det = 2 ≠ 0,两列都是枢轴列,而前导 2×2 块是 `[[2,4],[1,3]]`,不是 I。
"以 I 开头"是 **R** 的性质(R 是行最简形),不是 A 的。**这是形态 A(变量/对象错位),指控准确。**
它也是唯一一条后代为 0 的 cause 6——缺的是一条**理由**,而理由不像公式那样会被分解层写到子节点上,
所以边证据帮不上它。

三条 cause 1 全部成立且边证据完全不触及,其中两条我复核了数学:
- `apostol:orthonormal-set`:句 2「除以范数得到正交规范集」漏了非零前提。
  Apostol 的正交集定义只约束**相异**元素对,而 (O, x) = 0 恒成立,所以 {O, x} 是正交集,
  除以 ‖O‖ 无定义。锚点是三角函数例子,那里每个元素非零(Apostol 明说),只许可那一例。
- `strang:basis`:末句「A space has infinitely many different bases」把 Strang 限定在 R^n 的结论
  (3.4:202「Thus R^n has infinitely many diferent bases」)说成一般结论;
  同节 :334 即反例——零空间 Z 的基是空集,唯一而非无穷多。

### 这个判别式在全图的暴露面(已量)

倒掉的三条 cause 6 后代数是 16 / 7 / 5,成立的那条是 0。据此量全图:

| part-of 后代数 | 节点数 | 占比 |
| --- | --- | --- |
| 0 | 406 | 77.8% |
| 1–2 | 63 | 12.1% |
| 3–9 | 44 | 8.4% |
| 10+ | 9 | 1.7% |

**有后代的节点 116 = 22.2%;后代 ≥3 的 53 = 10.2%。**
所以"只读 anchors 会过报 cause 6"这个风险的**上界是 22.2% 的节点**,
其中最危险的一档(父节点把内容摊给多个子节点)是 **10.2%**。
这比"62% 的节点证据池会因边而扩大"这个数字小得多,也更该用作过报风险的口径——
因为过报的机制是**内容下移到后代**,不是任意的边证据。

**结论:cause 6 的指控,凡节点有 part-of 后代,必须按传递闭包回查一次才能定案;
后代为 0 的可以直接采信。cause 1 不需要这道回查。**

## D3 与 D2 的边证据回查:先得把"证据池"重新定义

做这两片时我先犯了一个错,值得记在结论前面。我第一版的池子把**任意与节点相连的边**
都算进证据,包括**别的节点指向它**的 `requires` 边。按这个池子,D3 L64
`d:orthonormal-expansion-formula` 的指控会塌陷——它缺的那句 `15.11.md:89`
确实在池里,由 `edges-D3.jsonl:158` 携带。但 `:158` 的 `src` 是
`d:parseval-proof-pair-expansion-with-y`,那是 L64 的**下游消费者**,不是它的一部分。
**下游节点引了某句,不能算上游节点引了它。** 这个池子会把几乎所有 cause 6 都洗掉。

改按四层定义,前三层入池,第四层不入:

| 层 | 内容 | 是否算该节点的证据 | 理由 |
| --- | --- | --- | --- |
| T1 | 节点自己的 `anchors` | 是 | 定义如此 |
| T2 | 节点**自己发出**的边(它是 `src`)的 evidence | 是 | 这句话是该节点引的,只是写在了边上而非 `anchors` |
| T3 | part-of 后代的 anchors 与后代自己发出的边 | 是 | 内容下移,父节点由子节点承载 |
| TD | **别的节点指入**它的边(它是 `dst`) | **否** | 是别人引的,与它无关 |

已写进上一节的 A1/S1 三条塌陷**不受影响**:重算后它们全部走 T3,TD 一条没用上
(`apostol:theorem-elementary-algebraic-properties` 后代 16、T3 池 53 条;
`apostol:theorem-15-11-...` 后代 7、T3 池 23 条;`apostol:parsevals-formula` 后代 5、
T3 池 17 条、TD 恰好 0 条)。那一轮的回查本来就是按 part-of 闭包写的,污染只发生在本轮代码里。

### 结果:7 条塌陷、3 条成立,而且塌陷的主通道换了

| 片 | 节点 | 分片的指控 | 判决 | 通道 |
| --- | --- | --- | --- | --- |
| D3 | L47 `d:orthonormal-set-adds-unit-norm` | 末句"把 (15.8) 塌缩成 (15.9)"未锚 | **成立** | — |
| D3 | L49 `d:trigonometric-orthogonal-system` claim 1 | "实空间 C(0,2π) 配积分内积"未锚 | 塌陷 | T2 `edges-D3.jsonl:123` |
| D3 | L49 claim 3 | 断言正交关系式而锚给结论 | **成立** | — |
| D3 | L50 `d:trigonometric-system-norms` claim 1(D-6) | `(u_0,u_0)=∫dx=2π` 无锚 | 塌陷 | T2 `edges-D3.jsonl:49` |
| D3 | L61 `d:15-11-proof-pair-with-basis-element`(D-5) | "since (e_i,e_j)=0" 子句未锚 | 塌陷 | T2 `edges-D3.jsonl:148` |
| D3 | L63 `d:orthonormal-basis-component-...` | "when (e_j,e_j)=1 we obtain (15.9)" 未收录 | 塌陷 | T2 `edges-D3.jsonl:156` |
| D3 | L64 `d:orthonormal-expansion-formula` | 末句(与 y 配对导出 Parseval)未锚 | **成立** | — |
| D2 | L66 `d:dim-of-...-solution-space-is-two` | "dimension 2" 与方程本身无锚 | 塌陷 | T2 `edges-D2.jsonl:85` |
| D2 | L37 `d:exponential-independence-multiply-by-...` | 锚点覆盖那一半 | 塌陷 | T3 后代 |
| D2 | L45 `d:thm-15-5-proof-delegated-to-theorem-12-8` | cause 6 那一半 | 塌陷 | T2 `edges-H2.jsonl:2` |

**7 条塌陷里 6 条走 T2,只有 1 条走 T3。** 这与 A1/S1 那一轮(3 条全走 T3)正好相反,
原因也清楚:D3 只有 5/69、D2 只有 6/80 的节点有 part-of 后代,后代通道在这两片几乎不存在,
剩下的全靠节点自己发出的边。

**T2 与 T3 的修法不同,不能混为一谈。** T2 塌陷意味着 **producer 确实引了那一行,
只是写在了边的 `evidence` 而不是节点的 `anchors`**——这是记账位置问题,修法是把引文搬进
`anchors`(或按 SPEC 决定是否允许边证据充当锚点)。T3 塌陷意味着内容合法地摊给了子节点,
父节点可能什么都不用改。把这两种都报成"锚点不支撑断言"会误导修复动作。

### 三条成立的指控,分量不同

- **L64 是本片区分片自称"最该引却没引的一条",它成立**,而且成立得干净:
  `15.11.md:89` 那句只在 L67 的输出里出现过,L64 自己从未引过它。这是本轮唯一一条
  "只有 TD 通道有、T1/T2/T3 都没有"的情形——恰好也是分片认为最严重的那一条。
- **L47** 池子只有 3 条,全是同一句正交规范定义(T1 与两条 T2 完全重复),
  末句需要的 `15.11.md:67` 一次都没进来。注意 L61、L63 都引了 `:67`,L47 没引。
- **L49 claim 3** 的缺陷不是"缺引文",是**拿结论当关系式**——池里有结论句
  "so S is an orthogonal set",缺的是 `:23`–`:26` 的正交关系式本身。
  这与 `strang:pivot-columns` 同型:**缺的是理由,不是事实**,边证据补不上。

### 两条新的方法论教训

**一、行号级比对会过报覆盖,必须降到句子级。**
`15.10.md:119` 是一行 460 字符、含四句。分片给 D3 L29 点名的缺失锚点是这一行的**末句**
("...fundamental properties of norms that do not depend on the choice of inner product"),
而池子里 `edges-H1.jsonl:12` 引的是这一行的**首句**
("Since it may be possible to define an inner product in many different ways...",
142/460 字符 = 31%)。按行号比对会判成"已覆盖",按句子比对是没覆盖。
本轮另一例 L39 只覆盖了 `:157` 的前半。**这两条指控因此维持,而按行号会被错误洗掉。**

**二、一条源行的两半可以分别落在节点锚点与边上。**
D2 L66 的 `15.08.md:15` 是 233 字符的一行:节点自己的锚点覆盖"基由 u_1=e^{-x}, u_2=e^{3x} 组成"
(79 字符),`edges-D2.jsonl:85` 覆盖"该方程解空间维数为 2"(89 字符)。
只读 `anchors` 的审查员必然报"主断言无锚"。这是第三条过报通道
(前两条是后代下移、多句行),同样只能靠拆句 + 查边发现。

**附带修正两处分片记账错误:** D3 L31 把 `:125` 列为未锚,而该节点自己的锚点就是 `:125`;
D2 59–80 片给 L66 的建议锚点标为 100 字符,实际可引子串是 89 字符。

### 冗余度:边证据的扩大率被高估了

上一节用的口径是"证据池是否因边而扩大",A1 95%、S1 84%、D2 46%。这个口径偏松:
**重复引用节点自己已经锚过的那一行,救不了任何指控。** 按"新引入的源行数"重量:

| 片 | 额外证据条目 | 新引入源行 | 与自身锚点重复的行 | 获得新行的节点数 |
| --- | --- | --- | --- | --- |
| D3 | 200 | 67 | 72 | 36 / 69 |
| D2 | 230 | **20** | 76 | **15 / 80** |
| D1 | 418 | 87 | 88 | 30 / 81 |
| D4 | 285 | 79 | 69 | 31 / 54 |
| A1 | 1740 | 458 | 103 | 55 / 63 |
| S1 | 244 | 154 | 55 | 52 / 62 |

D2 的 230 条额外证据只带来 20 个新源行、只够到 80 个节点里的 15 个。
这解释了为什么 D2 三片合起来只塌了 3 条。**"证据池会扩大"应换成"新引入源行数"作为过报风险口径。**

### 一个搜索方法上的自我修正

本轮有两次"池中无"是我的搜索串写错,不是真缺口:
一次把 `\int_ {0} ^ {2 \pi} d x`(锚点写法)拿去搜边里的 `\int_{0}^{2\pi} d`(无空格写法);
一次把 `'\neq'` 写成普通字符串,Python 把 `\n` 解析成换行,片段变成 `i` + 换行 + `eq j`,
于是 D3 L61 从"塌陷"翻成"成立"。**LaTeX 片段一律用 raw string,且比对前两侧都去空白。**
这与本轮早先 D2 L37 的错误同型(把 `e^{-a_M x}` 当成源文写法,实际源文写作
`a _ {k} - a _ {M}` 的差式)。三次都是同一件事:**机器比对的假阴性来自我构造的查询串,
不是数据。凡出现"池中无",必须先回读源行确认写法,再定案。**

