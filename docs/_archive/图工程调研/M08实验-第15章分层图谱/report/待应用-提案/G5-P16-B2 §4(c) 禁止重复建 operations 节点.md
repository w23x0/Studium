# SPEC 待议项 P16：B2 §4(c) 禁止重复建 operations 节点

只读代理产出。**本文件是提案,不是执行结果。**未改 `data/` 下任何文件。
计数口径：节点 546（含 `structures-L2-*.jsonl` 的 24 个 L2）；`check_graph` 口径 522 = 546 − 24。
本条只用 522 口径内的节点（L2 无 `parent`、无 `atomic_reason`，与本条无关）。

## 〇 裁定

**有条件进 SPEC。** B2 §4(c) 的原话（「禁止把 parent 已写出的运算再单立一个节点」）作为规则
是对的，但它按**主题**（运算）划界，因此同时打中了合法原子化；正确的界不在主题而在
**「parent 是否逐字写出了该运算规则」加「子节点是否给出 parent 与兄弟推不出的一条判据」**
这两个条件的合取。按主题写会误杀 17 个公理分解节点；按这两个条件写，
它们一个不损。

**本轮对 §五 的复核修正了本节初稿的一处过头话**：B2 那四支并非「全部落网」，而是
**落网 2 支（例 1、例 2）、改判 2 支（例 3、例 4）**；例 4 的真死因是 6 不是 5（§5.2）。
同时本条文抓到一个 B2 从未审过的违规（`d:subspace-inherits-the-operations-of-the-ambient-space`，§5.3）。
置信度：例 1/2/4 与 5.3 那一个为高（依据均为逐字对读）；例 3 为中
（「componentwise」算写出还是只提到，处在 §二 分界的临界处，建议主控明示）。



## 一 现状取证

### 1.1 B2 §4(c) 原文（`report/audit-B2.md:97`，逐字）

> **(c)「运算定义原子」模式。** 每个例子下挂一个 `d:operations-of-example-N-…`,而例子 parent 的名称或正文往往已经写出运算。五个中杀掉四个(例1、例2、例3、例4),只有函数空间那一支因为 `d:function-space-addition-lives-on-the-intersection-of-domains` 带出了"定义域收缩会破坏公理1,故例5/8/10/12 都预先固定区间"这条真判据而保留。**这是全层最系统性的伪切分模式,建议今后禁止"把 parent 已写出的运算再单立一个节点"这种切法。**

注意 B2 自己的口径是**按支（branch）**数的：「五个中杀掉四个」指例1/例2/例3/例4 四支被杀、
函数空间一支保留。但函数空间支内部它仍杀了三个节点
（`d:function-space-addition-is-pointwise`、`d:function-space-scalar-multiple-is-pointwise`、
`d:function-space-zero-is-the-everywhere-zero-function`，见 `audit-B2.md:40–42` 的 §2.1 表）。
所以「杀四个」不是节点数。**节点级实数是 7 个**（见 §四）。

### 1.2 SPEC.md 现状：这条规则一个字也没有

`SPEC.md` 与「运算重复建节点」相关的全部内容只有三处，均不构成禁令：

- `SPEC.md:45`「**引用已有节点必须用它的原 id**,不要造新 id 重复表达同一对象。」
  ——管的是 **id 重复**，不是内容重复。两个 id 不同、内容复述的节点不违此条。
- `SPEC.md:65`「`parent` / `atomic` / `atomic_reason` 仅 `d:` 节点必填。」
  ——只要求填 `atomic_reason`，不对它的内容设任何约束。
- `SPEC.md:95`「**审计 B(抽象增益)**:是否只是"换个名字重新包装下层";是否是空洞哲学。杀掉伪抽象。」
  ——这是审计 B 的职责描述，方向是**向上**（抽象层），一个字没提**向下**原子化的边界；
  死因 5 的名字「伪抽象·层塌缩」也偏向上层。B2 用它去判 D1 层向下切分，是**外推**，SPEC 没授权。

即：现行 SPEC 下，把 parent 已写出的运算再单立一节点是**完全合规**的。这就是 D1 层
出现 6 个 `atomic_reason` 以「运算定义原子」开头的节点的制度原因（见 §四）。

### 1.3 已有提案里的既有结论与我的复核

`S3-SPEC-关系词与审计程序.md:17` 的速查表把本条列为第 5 项，裁决写作
「**进 SPEC,但须收窄边界**」，SPEC 动作写作「新增「已写出」的可判定定义」。
但 S3 正文只有 `## 一`（关系词）与 `## 二`（枢纽豁免 FIX）两节
（`grep -n "^## "` 实测：第 9/23/130 行三个二级标题，无第三节）。
**S3 的第 5 项只有表格里那一行结论，没有任何正文、依据、条文或影响面。**

复核结论：S3 的方向判断（收窄边界；焦点是「已写出」的可判定性）**站得住，与我独立得到的一致**；
但「已写出」单独一个条件**不够**——它是必要条件，不是充分条件。理由见 §五 的边界情形 2：
`apostol:function-space` 的 statement 逐字写出了两个公式与零元（三样全在），
按「已写出」单条件，它的三个子节点全违规；但其中
`d:function-space-addition-lives-on-the-intersection-of-domains` 是 B2 自己判 KEEP、
并称为「全 D1 层最实用的一条判据」的节点（`audit-B2-verdicts.jsonl` 该 id 的 reason 逐字）。
所以必须再加第二个条件（判据增量豁免），否则会杀掉 B2 自己要保的那一个。
S3 表格没有写这一点，**这是它的缺口，不是错误**（它没展开，也没下相反结论）。



## 二 拟并入 SPEC 的逐字条文

拟作为 `SPEC.md` 的一个新小节插入，标题与正文逐字如下（含代码块）：

```markdown
## 原子化下延的边界(死因 5 的向下形态)

向下拆分只在**拆出来的东西 parent 没有说**时才是原子化;parent 已经说过的,
拆出来就是复述。判据不是「主题是不是运算」,而是下面三条的合取。

**违规条件(三条全中才违规):**

1. 该节点有 `parent`(即它是向下拆分的产物,不是新引入的对象);
2. 它的 statement 去掉第一句(那句只复述一条规则/公式/定义)之后,**没有任何一句
   给出 parent 与其现有兄弟节点推不出来的判据**——「判据」指能对某个具体对象
   判定是/不是的一句话,不含只换措辞的口头译文;
3. parent 或某个祖先的 statement 里**逐字写出了**这条规则/公式/定义本身,
   而不只是**提到它存在**或**用一个名字指代它**。

三条全中 ⇒ 死因 5,KILL。第 2 条不中(有判据增量)⇒ **合法原子化**,但必须
删掉复述的那一句、并把节点名改成它真正断言的那条判据。第 3 条不中
(parent 只提到、未写出)⇒ **本条管不着**;此时若子节点写出的规则在本章
找不到逐字依据,按死因 6 处理,不要按死因 5 处理。

**「逐字写出」与「只提到」的分界(可判定):** 把 parent statement 里那一段抄出来,
它单独是否已经足以让读者复现该规则?能 ⇒ 写出;还需要去别处查 ⇒ 只提到。
例:「with (f + g)(x) = f(x) + g(x)」是写出;「with the usual componentwise
operations」「defined in the usual way in terms of components」是只提到。

**`atomic_reason` 约束:** `atomic_reason` 不得只声明该节点在讲哪一类东西
(如「运算定义原子:一条按点公式」)。它必须写出**该节点相对 parent 的增量**,
否则该字段无法参与审计。凡 `atomic_reason` 只有主题、没有增量的节点,
一律进人工复核队列。
```



## 三 替换或修改 SPEC.md 的哪几行

三处：一处新增（主体条文）、两处小改（挂接）。

### 3.1 新增：`SPEC.md:65` 之后、`:67`（「## 边 schema」）之前插入 §二 的整节

现状 `SPEC.md:64–67`：

```
64: (空行)
65: `parent` / `atomic` / `atomic_reason` 仅 `d:` 节点必填。
66: (空行)
67: ## 边 schema(JSONL,一行一个)
```

插入位置选在这里而不是死因表附近，理由：本条的触发场景就是
`parent`/`atomic`/`atomic_reason` 三个字段所描述的向下拆分，紧接第 65 行读起来是连贯的；
放到 `:100` 的死因表旁边会让「审计规则」一节膨胀成两套内容混排。

### 3.2 改 `SPEC.md:100`（死因表，给死因 5 加一个指针）

旧（逐字）：

```
死因编号:`1` 量词过度断言 / `2` 编造成员归属 / `3` 伪造教材出处 / `4` 数学错误 / `5` 伪抽象·层塌缩。
```

新（逐字）：

```
死因编号:`1` 量词过度断言 / `2` 编造成员归属 / `3` 伪造教材出处 / `4` 数学错误 / `5` 伪抽象·层塌缩(向上:换名重新包装下层;向下:复述 parent 已写出的内容,判据见「原子化下延的边界」一节)。
```

### 3.3 改 `SPEC.md:95`（审计 B 的职责，补上向下方向）

旧（逐字）：

```
- **审计 B(抽象增益)**:是否只是"换个名字重新包装下层";是否是空洞哲学。杀掉伪抽象。
```

新（逐字）：

```
- **审计 B(抽象增益)**:是否只是"换个名字重新包装下层";是否是空洞哲学。杀掉伪抽象。
  向下拆分的节点同样归审计 B,按「原子化下延的边界」一节的三条合取判,不得只凭主题判。
```

**未改动**：`SPEC.md:45`（id 唯一性）不动——它管 id 不管内容，与本条正交，
两条并存不冲突。`SPEC.md:53–57`（锚点规则）不动。



## 四 回溯影响

### 4.1 三个候选集的实测规模（算法与数字）

条文只对**有 `parent` 的节点**生效。`nodes.tsv` 第 5 列非空且该 parent 也在表内的
child-parent 对：**287 对**（算法：读 `nodes.tsv`，取 `parent` 非空且 `parent in nodes` 的行）。
从 287 对里筛候选，我试了三种筛法，规模差一个数量级，**结论：只有第三种可用**：

| 筛法 | 命中 | 为什么不能用作条文判据 |
|---|---|---|
| 子锚点被 parent 锚点含住（含相等） | **107** | 82 相等 + 26 严格子串（并集 107，有 1 个同时命中两类）。含住的绝大多数是合法原子化：`d:axiom-1-…`/`d:axiom-2-…`/`d:only-axiom-1-…` 三个都用 `15.02.md` 那条 175 字符锚点。**锚点含住与内容复述无关**——多个原子共用一条源句是正常的。 |
| statement 首句提到任一运算词 | **70** | 关键词 `sum/addition/scalar multipl/product/zero element/operations` 命中 70 个，含 `d:cauchy-schwarz-for-integrals`、`d:parseval-norm-form` 等一批与运算定义毫无关系的节点。主题筛完全失控。 |
| **`atomic_reason` 以「运算定义原子」开头** | **6** | 这是**产出者自己声明**的切分模式，与 B2 §4(c) 所指的东西一一对应，无假阳性。 |

第三种筛法的实测名单（`data/nodes-*.jsonl` 逐行 JSON，取 `atomic_reason` 含「运算」者，
再取以「运算定义原子」开头的 6 个）：

| # | id | loc | parent |
|---|---|---|---|
| 1 | `d:operations-of-example-1-are-ordinary-arithmetic` | `data/nodes-D1.jsonl:45` | `d:example-1-the-real-numbers-form-a-linear-space` |
| 2 | `d:operations-of-example-2-complex-addition-and-real-scaling` | `data/nodes-D1.jsonl:48` | `d:example-2-the-complex-numbers-with-real-scalars` |
| 3 | `d:operations-of-example-3-are-componentwise` | `data/nodes-D1.jsonl:51` | `d:example-3-v-n-with-componentwise-operations` |
| 4 | `d:operations-of-example-4-are-inherited-from-v-n` | `data/nodes-D1.jsonl:54` | `d:example-4-vectors-orthogonal-to-a-fixed-nonzero-vector` |
| 5 | `d:function-space-addition-is-pointwise` | `data/nodes-D1.jsonl:57` | `apostol:function-space` |
| 6 | `d:function-space-scalar-multiple-is-pointwise` | `data/nodes-D1.jsonl:59` | `apostol:function-space` |

另有 6 个节点的 `atomic_reason` 含「运算」但不是这一模式（`nodes-D1.jsonl:1/44/47/50/53/63`），
其中 44/47/50/53 是**父方**自述「下挂运算定义原子」——它们不是候选，但证明这个切法是
**成套设计**的，不是偶发。B2 §4(c) 说它是「全层最系统性的伪切分模式」，此处得到独立确证。



## 五 反例与边界情形

### 5.1 必须活下来的那一个（条件 2 不中 ⇒ 合法原子化）

`d:function-space-addition-lives-on-the-intersection-of-domains`（`nodes-D1.jsonl`，parent
`apostol:function-space`）。statement 逐字：

> The pointwise sum is declared for every real x lying in the intersection of the domains of f and g, so f + g may have a smaller domain than either summand. Unless the set of functions under consideration shares one fixed domain, this shrinking can push f + g out of the set and break Axiom 1, which is why Examples 5, 8, 9, 10 and 11 each fix an interval or a point in advance.

首句是复述（按点和的定义域），**第二句是判据**：给定一个函数集合，能判定它是否会因定义域收缩
而破坏公理 1。条件 2 不中 ⇒ 合法原子化，KEEP。两条锚点（`anchors.tsv` 该 id 两行，
`15.03.md` charlen 63 与 68）里 charlen 63 那条是
「for every real x in the intersection of the domains of f and g.」——**parent 锚点之外的新源行**。
这与 B2 自己的判决一致（`audit-B2.md:97` 逐字称它带出「这条真判据」）。
**这是本条文的锚定用例：任何写法只要杀掉它，就是写错了。**

### 5.2 反例：规则**改判**而不是确认 B2 的四支击杀（重要，需回改 §〇）

按 §二 三条合取逐个对，B2 的四支只有两支落网：

| 支 | 条件 3（parent/祖先**逐字写出**运算）| 落网? | 依据 |
|---|---|---|---|
| 例 1 | **中**。parent statement 逐字含「with ordinary addition and ordinary multiplication」 | ✓ 死因 5 | `statements.tsv` 两行对读 |
| 例 2 | **中**。parent statement 逐字含「with ordinary complex addition, but allowing only real numbers as multipliers」 | ✓ 死因 5 | 同上 |
| 例 3 | **不中**。B2 自己的理由是「祖父 `apostol:v-n-space` 已写"in terms of components"」，而 §二 的可判定分界**恰把「defined in the usual way in terms of components」列为「只提到」** | ✗ | `audit-B2.md:58` 逐字 + §二 |
| 例 4 | **不中**。B2 自己的理由是「"被筛选的子集"已**蕴含**运算继承」——「蕴含」不是「逐字写出」 | ✗ | `audit-B2.md:60` 逐字 |

所以 **§〇 末句「B2 已判死的 4 个 operations 节点全部落网」不成立，应改为「落网 2 支，
改判 2 支」**。这不削弱裁定，反而是本条文的主要价值：它把「看起来同一模式」的四支分成了
两种不同缺陷。例 4 的真缺陷是**死因 6**——它的唯一锚点是
「Let V be the set of all vectors in $V_{n}$ orthogonal to a given nonzero vector N.」
（`anchors.tsv`，`15.03.md`，charlen 82），**整句不含任何运算词**，而它的 statement 断言
「Example 4 defines no new operations: addition and scalar multiplication are the componentwise
ones of V_n」。这是锚点盲区 E 型（整句无锚）叠 A 型（引文讲的是集合、断言讲的是运算）。
**KILL 结论可能仍对，但死因编号必须从 5 改成 6。**

### 5.3 边界情形：规则抓到一个 B2 从未看过的违规（+1 从合规变违规）

`d:subspace-inherits-the-operations-of-the-ambient-space`（`data/nodes-D2.jsonl:2`，
parent `apostol:subspace`，`sections` 15.06）。三条逐个对：

- 条件 1 中：有 parent。
- 条件 3 中：`apostol:subspace` statement 逐字含「if S is itself a linear space under the same
  operations of addition and multiplication by scalars」——写出，不是提到。
- 条件 2 中：子 statement 第二句「This clause is what makes a subspace a structural part of V
  rather than an unrelated space that happens to sit inside it as a set.」是**口头译文/评价**，
  没有给出任何可对具体对象施行的判定。

⇒ 三条全中，死因 5。**B2 §4(c) 完全没碰它**（§4(c) 只覆盖 D1 层的例子支）。
附带的机械信号：该子节点的锚点与 parent 的锚点**逐字同一条**——
`shared-quotes.tsv:91`，`15.06.md`，charlen 130，`n_holders` 4，holders 含
`node:apostol:subspace` 与 `node:d:subspace-inherits-the-operations-of-the-ambient-space`
（另两个是 `edge:data/edges-D2.jsonl:4` 与 `:115`）。这是 B 型借用引文，**可半机械化定向**。

### 5.4 为什么不能用锚点含住做判据（`§四` 的 107 已给出反例）

`d:axiom-1-…`、`d:axiom-2-…`、`d:only-axiom-1-…` 三个节点共用 `15.02.md` 同一条 175 字符锚点。
多个原子共引一条源句是**正常的**：一条源句可以含多句断言
（过报通道 b，查 `source-lines.tsv` 的 `n_sentence_end`）。若把「锚点被 parent 含住」写成
违规条件，这 107 对里的公理分解节点会集体从合规变违规——**这就是必须按「statement 增量」
而不是按「锚点重合」立条的原因**。锚点重合只配当定向信号，不能当判据。

## 六 与其它待议项的耦合

只列耦合点与耦合方向，**不代它们裁定**。

1. **死因 6 入 SPEC（在用但尚未进 SPEC）** —— 强耦合。§5.2 把例 4 从死因 5 改判死因 6；
   若死因 6 最终不进 SPEC，例 4 将无编号可挂，本条文会出现一个「知道它错、但没法记账」的洞。
2. **P13 / S3 项 2「B2 §6.1 枢纽节点豁免 FIX」** —— 强耦合。§5.3 判死的
   `d:subspace-inherits-the-operations-of-the-ambient-space` 若自身带子节点（子节点数**未核**，
   本轮工具故障），按枢纽豁免应从 KILL 降为 FIX。裁决权在 P13。
3. **P14「没有 parent 的层如何做删除测试」** —— 本条文以 `parent` 为触发前提，
   故 24 个 L2 节点（`nodes.tsv` 中 `parent` 空）天然在射程外。P14 的「恢复基」若落地，
   需说明它与本条文条件 2 的「parent + 现有兄弟」是同一个作用域还是两个。
4. **S3 项 4「删除测试作用域＝父+兄弟，不是全图」** —— 本条文条件 2 直接引用了这个作用域。
   若 S3 项 4 改判为全图，本条文的判定结果会变（§5.1 那个 KEEP 可能被全图其它节点顶掉）。
5. **S2 的插入点冲突** —— `S2-SPEC-字段语义.md:389` 也主张在 `SPEC.md:65` 之后新增内容，
   与本条文 §3.1 同一插入点。两者不矛盾，但**行号会互相偏移**，需主控定并入顺序。
6. **S1 锚点规则 / B 型借用引文的机械前筛** —— §5.3 用 `shared-quotes.tsv` 的
   `n_holders` 做了定向。若 S1 把「父子共享同一 (file,quote)」立为独立信号，
   本条文可引用它作为条件 3 的**廉价预筛**（预筛不是判据，见 §5.4）。
7. **P17「共享前提能否单独建节点 + 用边连」** —— 条件 3 只沿 `part-of` 祖先链查「已写出」。
   若共享前提改用边挂接，则该内容不在祖先链上，本条文查不到，可能放过一批复述节点。

## 顺带发现

- 本轮进行到 §五 之前 Bash / PowerShell / Grep / Read 全部停止返回输出；§〇–§四 系本任务前一次中断run 的产物，我按下条逐项复核后保留。
- 复核可对上的：`SPEC.md:45/65/67/95/100` 与 64–67 版式、`audit-B2.md:97` 全段、`S3:17` 表格行、S3 只有 9/23/130 三个二级标题、§四表格前 4 行的 id/loc/parent 全部逐字一致；287 由 `S2:389` 上文的「parent 287」独立佐证。
- 复核**对不上/未核**的：§四 的 **107** 与 **70** 两个数我本轮无法复算，主控并入前应重跑；§四名单第 5、6 行（`nodes-D1.jsonl:57/59`）未核。
- `SPEC.md:33` 的节点类型是 `concept / method / theorem / notation`，与本轮任务书给的 `concept / theorem / proof-step / example` **两份口径不一致**，需主控裁。
- `audit-B2.md:97`「五个中杀掉四个」是按**支**数不是节点数（函数空间支内部另杀 3 个），引用时极易误读为 4 个节点。
- `d:example-3-v-n-with-componentwise-operations` 的 parent 是 `apostol:v-n-space`、而非例子链上的兄弟，D1 层例子支的挂载父不统一。
- `d:linear-space-is-a-set-together-with-two-operations` 与 `d:an-example-is-a-set-plus-two-explicit-operations` 同属 `apostol:linear-space`、同讲「集合+两运算」，属 B2 §4(a) 而非 §4(c)，本条文射程外。
