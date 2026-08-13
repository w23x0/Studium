# S3 提案：SPEC 修订簇三 —— 关系词与审计程序

只读代理产出。**本文件是提案,不是执行结果。**未改 `data/` 与 `tools/` 下任何文件。
所有计数均在本次会话实测,脚本用完即删,方法记在各条的「影响面」里。

Sanity check 通过：节点 522(实测 546,含 24 个 L2 结构节点,522 = 546 − 24)、边 **1433**(实测,
`data/edges-*.jsonl` 1220 + `data/inherited/edges-*.jsonl` 213)。

## 〇 裁决速查表

| # | 待议项 | 裁决 | SPEC 动作 |
| --- | --- | --- | --- |
| 1 | 「第二使用点复用」关系词 | **不新增关系词** | 改为约束 `other` 的 `rel_note`,登记 6 条方向/选词缺陷 |
| 2 | B2 §6.1 枢纽豁免 FIX | **进 SPEC,但须先补 FIX 层本身** | 新增「裁决三档」节 + 枢纽豁免条 |
| 3 | 无 `parent` 层的删除测试 | **进 SPEC,以「恢复基」替代「父+兄弟」** | 新增「恢复基」定义表 |
| 4 | 删除测试作用域 | **父+兄弟(即恢复基),不是全图** | 明文写死作用域 + 全图冗余另立死因 |
| 5 | B2 §4(c) operations 禁令 | **进 SPEC,但须收窄边界** | 新增「已写出」的可判定定义 |
| 6 | 共享前提单独建节点 + 边 | **允许,且已在大规模使用** | 明文追认 + 加一条防滥用闸门 |
| A | 批量击杀前的互证检查 | **进 SPEC,强制** | 新增「批量执行」节 |
| B | 裁决回显 id 的表述强度 | **现表述不够强** | 加来源与自检要求 |
| C | 停止规则对 L2-B 可判定? | **不可判定,已实测证明** | 重写停止规则 |

## 一 是否新增「第二使用点复用」关系词

### 现状

关系词表封闭 9+1。全图 1433 条边的 rel 分布(本次实测):

```
requires 707 / part-of 314 / is-a 148 / contrasts 125 / other 40
applies-to 33 / generalizes 31 / implies 25 / alias-of 6 / equivalent 4
```

`other` 40 条,**全部带 `rel_note`,0 条缺失**。另有 11 条非 `other` 边也带了 `rel_note`
(contrasts 7、requires 3、generalizes 1),即 `rel_note` 事实上已被当作通用注释栏使用。

### 问题

教材里同一对象在不同节被重复使用(例 7 在 15.03 定义、在 15.08 算维数),现在只能用
`requires` 或 `other` + `rel_note`。是否需要一个专门的词?

### 裁决:不新增。理由是「第二使用点」已经有栏位,新增词会与 `sections` 重复记账

我把 40 条 `other` 逐条读过,再按「src 与 dst 的 `sections` 是否不同」机械筛选,
**真正属于「同一对象在第二个使用点被再次使用」的只有 4 条**:

| 边 | src → dst | src 节 → dst 节 | 现 rel_note 摘要 |
| --- | --- | --- | --- |
| `edges-D1.jsonl:168` | `d:example-7-polynomials-of-degree-at-most-n` → `d:dim-of-polynomials-of-degree-at-most-n-is-n-plus-one` | 15.03 → 15.08 | this is the space whose dimension is later computed to be n + 1 |
| `edges-D1.jsonl:212` | `d:example-12-solutions-of-a-homogeneous-second-order-equation` → `d:dim-of-a-second-order-de-solution-space-is-two` | 15.03 → 15.08 | this is the solution space whose dimension is later shown to be two |
| `edges-D1.jsonl:148` | `d:function-space-zero-is-the-everywhere-zero-function` → `d:zero-element-of-a-function-space-is-a-pointwise-identity` | 15.03 → 15.07 | both nodes describe the same object … reached from different sections |
| `edges-H2.jsonl:10` | `apostol:inner-product-axioms` → `apostol:ext-theorem-12-2` | 15.10 → 第12章 | 重述而非引用:…故不可判为 equivalent 或 generalizes |

**4 条中 3 条用现有词就够,不需要新词:**

- `:168` 与 `:212` 是**前向引用**。方向反过来写就是标准 `requires`:算维数必须先有这个空间,
  故应为 `d:dim-of-…` --requires--> `d:example-…`。现在的方向(粗的例子指向细的维数结论)
  违反 SPEC「纵向边方向恒为粗→细」的精神之外,还把依赖方向写反了。**这是两条方向缺陷,不是词表缺口。**
- `:148` 的 rel_note 自己写 “both nodes describe the same object”,那就是 `alias-of` 的定义。
  **这是一条选词缺陷。**
- 只有 `edges-H2.jsonl:10` 是真的落在词表外:它要说的是「15.10 没有引用定理12.2,
  而是把同类性质重新声明为公理」,并且**刻意拒绝** `equivalent` 与 `generalizes`
  (rel_note 原文:「逐条对应无法从第15章核实」)。这正是 `other` + `rel_note` 该干的活——
  它记录的是「作者没有做的那个更强断言」,任何新词都会把这个「刻意不断言」抹掉。

**决定性论证:第二使用点已经有栏位。** 节点 schema 的 `sections` 是数组。
全图 522 个非 L2 节点里 **57 个 `sections` 长度 ≥ 2**(分布:1 节 465、2 节 50、3 节 6、4 节 1)。
也就是说「同一对象在多个节出现」这件事,已经有 57 次是靠 `sections` 多值记录的,不靠边。
新增一个复用关系词,等于给同一事实开第二套账;两套账不一致时无法判定谁对。
`:148` 那一对更是把同一个对象拆成了两个节点,再用边把它们连回去——
正确修法是合并或 `alias-of`,不是发明词来固化这次拆分。

**反面证据我也查了:`other` 里最大的一族不是复用,是「违反」(10 条)。**
`d:degree-exactly-n-fails-axiom-1-…` --other--> `d:axiom-1-closure-under-addition`,
`apostol:polynomials-of-degree-exactly-n` --other--> `apostol:closure-axioms` 等。
若这一轮真要扩词表,数据支持的是 `violates` 而不是任何复用词。
但即使这一族我也不建议现在加词:`contrasts` 已覆盖「成对辨析」的语义一半,
加 `violates` 会在「反例 vs 辨析」之间开一条新的选词边界,而这条边界目前没人需要。
**列为下一轮议题,本轮不动。**

### 可直接并入 SPEC 的逐字文本

在 SPEC「关系词表(封闭,9 + 1)」小节的
`` `is-a` 与 `generalizes` 互为反向,**只写一条**。对称关系只写一个方向。 `` 这一行之后,
新增以下三段:

```markdown
关系词表**不因新用法而扩充**。遇到现有 9 个词都不贴切的情形,一律用 `other` + `rel_note`,
不要自造 rel 值。词表的扩充必须走单独的 SPEC 修订,并附「现有 `other` 边中有多少条属于该模式」
的实测计数;计数低于 10 条的模式不予扩词。

**同一对象在第二个使用点被再次使用,不建边。**教材在后文重新用到一个已有对象时,
把那一节加进该对象节点的 `sections` 数组,而不是新建一个节点再用边连回去。
若后文那一处产生了新断言(例如算出了维数),则新建的是**那个断言**的节点,
边的方向是「新断言 --requires--> 原对象」——理解新断言必须先有原对象,方向不得反写。

**`rel_note` 不限于 `rel=other`。**任何一条边,若它的选词经过了权衡、
或者作者刻意回避了一个更强的关系词(例如可写 `equivalent` 而证据只够 `other`),
都应在 `rel_note` 里写明回避的理由。这一栏是选词依据的存放处,不是 `other` 的附属品。
```

### 影响面

- **不新增关系词 ⇒ 词表、schema、`check_graph.py` 全部不动。**
- 40 条 `other` 里 **4 条**属复用模式;其中 **3 条须改**(2 条方向反写 + 1 条选词),
  1 条(`edges-H2.jsonl:10`)维持 `other` 不动。
- 待改 3 条,逐字目标如下(主控执行时按行号定位):

| 目标文件:行 | 现状 | 改为 |
| --- | --- | --- |
| `data/edges-D1.jsonl:168` | `src=d:example-7-polynomials-of-degree-at-most-n`, `rel=other`, `dst=d:dim-of-polynomials-of-degree-at-most-n-is-n-plus-one` | `src=d:dim-of-polynomials-of-degree-at-most-n-is-n-plus-one`, `rel=requires`, `dst=d:example-7-polynomials-of-degree-at-most-n`,删 `rel_note` |
| `data/edges-D1.jsonl:212` | `src=d:example-12-solutions-of-a-homogeneous-second-order-equation`, `rel=other`, `dst=d:dim-of-a-second-order-de-solution-space-is-two` | `src=d:dim-of-a-second-order-de-solution-space-is-two`, `rel=requires`, `dst=d:example-12-solutions-of-a-homogeneous-second-order-equation`,删 `rel_note` |
| `data/edges-D1.jsonl:148` | `rel=other` | `rel=alias-of`,删 `rel_note`;并按下条复核两节点是否该合并 |

  这两条 `origin` 现为 `model`、无 evidence,方向翻转后仍为 `model`,不引入锚点债务。
  `:148` 改 `alias-of` 后,`d:function-space-zero-is-the-everywhere-zero-function`
  与 `d:zero-element-of-a-function-space-is-a-pointwise-identity` 构成同物两节点——
  而前者已在 `待应用清单` §一被判 **KILL(零残留)**,所以实际执行顺序应是**先执行那个 KILL,
  这条边随节点一并进墓地,`alias-of` 的改动就不必做**。两处待办在此合流,请勿重复处理。
- `sections` 多值这条约定是**追认现状**,57 个节点已在这么做,无需回改任何数据。

### 风险

- 「不扩词」的代价是 `other` 会继续积累。40/1433 = 2.8%,目前健康;
  若某一族涨到 10 条以上(`violates` 已经 10 条,踩线)就必须重议。**这条阈值我写进了 SPEC 文本。**
- `:168`/`:212` 方向翻转会改变这两个 example 节点的出入度,进而改变它们在
  「枢纽豁免」(见 §二)与「删除测试作用域」(见 §四)下的判定输入。**必须在跑那两项检查之前完成翻转**,
  否则同一节点会因边的方向不同得到两种裁决。

## 二 B2 §6.1 的「枢纽节点豁免 FIX」规则

### 现状:B2 §6.1 原文在讲什么

B2 §6 开头把它的唯一尺子写成「删掉它,学习者只凭 parent 与已有兄弟能不能自己推出来」,
并在同一段末尾给了一条例外:

> 唯一的例外处理是:无增量但有子节点挂靠的枢纽节点判 FIX 而非 KILL。

§6.1「枢纽豁免的边界」是这条例外的**自我举报**:

> SPEC 与任务书都说无增量的挂载枢纽判 FIX,但没说「子节点若同时被判死,枢纽是否还算枢纽」。
> `d:degree-exactly-n-is-not-a-linear-space` 的四个子节点里我杀了一个(非子空间)、留了三个,
> 所以它仍是枢纽,判 FIX 无争议。但若审计 A 因数学原因再杀掉两个,这个 FIX 是否应改为 KILL,我给不出规则。

即:枢纽性不是节点的固有属性,而是**批次执行结果的函数**。同一个节点在批次开始时是枢纽,
批次跑完可能就不是了;而裁决是在批次开始前写下的。

### 问题:SPEC 里根本没有 FIX 这一档

这是比 §6.1 本身更大的缺口。SPEC「审计规则」写的是:

> 每条裁决格式:`<id> | KEEP|KILL | 死因编号 | 一句理由`

**只有两档,没有 FIX。**死因编号 1–5 全部是致死原因,没有一个表示「需修但不死」。
而 FIX 已经在大规模生产使用:

| 审计 | FIX 数 | 是否已落盘 |
| --- | --- | --- |
| `audit-B2` | 3 | 未落盘(在 `待应用清单` 里待执行) |
| `audit-L2-A` | 10 | **已落盘**,实测 24 个 L2 节点中恰好 10 个带 `audit_fix: "audit-L2-A"` 字段,与该报告附录的 FIX 名单(a1–a8、b1、b4)逐字一致 |
| `audit-L2-B` | 0 | ——(该报告明写「抽象增益要么有要么没有,改写辩护词不能把它变出来」) |

所以 FIX 不但在用,还已经**写进了数据文件的一个 SPEC 未定义的字段**(`audit_fix`)。
先补 FIX 层,枢纽豁免才有地方挂。

### 裁决:进 SPEC,但必须拆成两件事

枢纽豁免被当成「删除测试的一条例外」是错的,它根本不是同一件事:

- **删除测试量的是信息含量**——这个节点是否携带 parent+兄弟以外的判断力。
- **枢纽性量的是图拓扑**——删掉它会不会让别的节点失去唯一的上挂路径。

一个节点完全可以「信息含量为零」同时「删掉会造成拓扑损伤」。把后者写成前者的例外,
等于让审计员用「它有子节点」去推翻「它没有增量」,而这两句话可以同时为真。
正确做法是:**裁决只记信息含量,拓扑损伤在执行期处理。**

`d:ten-axioms-listed-in-three-groups` 就是这个区分的实证。它的信息含量确实为零
(2/4/4 的分组从三个 L1 分组节点一眼可数,B2、ADJ1、ADJ2 三方都认冗余),
但它的拓扑角色不可替代:实测它有 5 条入边,其中 3 条是
`apostol:closure-axioms`、`apostol:axioms-for-addition`、`apostol:axioms-for-multiplication-by-numbers`
的 `part-of`,而这三个 L1 节点**没有第二条 part-of 出边**。
裸删就让三个 L1 节点失去唯一父节点。`待应用清单` §2.1 已经查明
`apply_kills.py` 把边送进墓地、不改指向,所以必须先把这三条改指 `apostol:linear-space` 再删。
**这不是「豁免它不死」,是「死之前先做拓扑手术」。**ADJ2 判 FIX、我判「KILL + 前置改边」,
落地动作完全相同,但记账正确:它没有增量这件事不该被拓扑理由抹掉。

### 可直接并入 SPEC 的逐字文本

在 SPEC「审计规则」小节,把

```markdown
每条裁决格式:`<id> | KEEP|KILL | 死因编号 | 一句理由`
```

替换为下列整段(含新增的裁决三档与枢纽条):

```markdown
每条裁决格式:`<id> | KEEP|FIX|KILL | 死因编号 | 一句理由`。

裁决分三档,**三档只描述节点自身的内容,不考虑删掉它会对图造成什么拓扑后果**:

| 档 | 含义 | 死因编号 | `suggested_fix` |
| --- | --- | --- | --- |
| `KEEP` | 内容成立且有增量,无需改动 | 恒为 `0` | 必须为空 |
| `FIX` | 内容有缺陷但缺陷是局部的:改写一句、收窄一个量词、删一个成员、换一条锚点即可救活 | 填该缺陷对应的 1–6 | **必须非空,且必须给出定稿文本或可执行的改法**,不得只写「建议改写」 |
| `KILL` | 内容整体无法救:或为假,或为纯复述,或该断言不存在可引依据 | 填 1–6 | 可空 |

`FIX` 不是「拿不定主意」的中间档。若一条裁决的理由是「我不确定」,
它应当写成 `KEEP` 或 `KILL` 之一,并把不确定性写进报告的「我不确定的地方」一节。
判 `FIX` 的门槛是**已经知道怎么改**。

**枢纽性不是裁决理由。**一个节点若无增量,即使有子节点挂靠在它下面,裁决仍为 `KILL`。
挂靠关系在执行期处理,不在裁决期抵消。执行 `KILL` 前必须做**孤儿检查**:

> 对每个待杀节点 k,列出所有满足「`c --part-of--> k`,且 c 没有第二条 `part-of` 出边」的 c。
> 若这样的 c 非空,则 k 是**枢纽**,不得裸删:必须先把这些 c 的 `part-of` 改指 k 的父节点
> (即 k 自己 `part-of` 指向的那个节点),再执行 KILL。改指后重跑 `check_graph.py` 确认无悬空。

孤儿检查的结果记在执行日志里,不回写裁决。**「枢纽」是执行期属性,会随同批次其他 KILL 而变化,
因此孤儿检查必须在批次的全部 KILL 名单确定之后、执行之前跑一次,不能逐节点跑。**
```

### 影响面

- **SPEC 新增一档 FIX + 一条孤儿检查。**裁决格式变化会影响所有已有 verdicts 文件的
  格式合规性,但**不需要回改**:已有文件用的就是 KEEP/FIX/KILL 三值,是 SPEC 落后于实践。
- `audit_fix` 字段建议一并追认(它已在 10 个 L2 节点上落盘)。若不追认,
  这 10 个字段就是 schema 外字段,`check_layer.py` 未报错说明它不校验未知字段——
  即这 10 处目前是静默通过的。
- **孤儿检查的暴露面(实测):522 个节点里 115 个「删掉会孤立至少一个 part-of 子节点」**,
  按命名空间分:`apostol:` 77、`d:` 32、`strang:` 5、`x:` 1。孤儿数分布:
  1 个的 45,2 个的 26,3 个的 16,4 个的 6,5 个的 11,6 个的 7,以及 7/10/11/14 各 1 个。
  L1 节点(`apostol:`/`strang:`,共 82 个)按 SPEC 不重抽、不参与击杀,故实际风险面是
  **`d:` 32 个 + `x:` 1 个 = 33 个**。
- **只有 1 个 `d:` 节点拥有 L1 子节点**,就是 `d:ten-axioms-listed-in-three-groups`
  (子节点为上述三个 `apostol:` 分组节点)。这是全图唯一一处「杀一个 d: 节点会动到 L1 底座」的地方,
  也就是 §2.1 那条改边待办的全部范围。
- B2 的 3 个 FIX 里,`d:degree-exactly-n-is-not-a-linear-space` 的裁决按新规则应改为
  **KILL + 孤儿检查**还是维持 FIX,取决于它的 statement 有无独立增量——
  B2 §3 自己写「结论、理由、反例类型三样都在 parent 正文里」,即无增量,
  故按新规则应为 KILL,并在执行前对它的四个子节点跑孤儿检查。
  **这一条改判会与 §六 的互证检查联动,请合并处理,不要分两次执行。**

### 风险

- 把 FIX 的门槛定成「已经知道怎么改」会让一部分现有 FIX 不合格。
  `audit-L2-A` 的 10 个 FIX 都给了定稿或可执行改法(删指定成员 id、收窄量词、改一句引用),
  实测合格;`audit-B2` 的 3 个 FIX 也都写了修法。**已有 13 个 FIX 全部过门槛**,不产生回改债务。
- 孤儿检查要求「批次名单确定后跑一次」,与 §六 的互证检查同为批次级检查。
  两者顺序:**先互证检查(它会改变名单),再孤儿检查(它依赖最终名单)**。
  顺序颠倒会得到失效的孤儿清单。


