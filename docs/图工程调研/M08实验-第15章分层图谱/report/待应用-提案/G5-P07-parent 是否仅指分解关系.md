# SPEC 待议项 P07：parent 是否仅指分解关系

只读分析代理产出。**这是提案，不是执行结果**——`data/` 与 `tools/` 一个字节都没动。
所有实数均出自 `tmp_index/` 的预算表（nodes.tsv / partof.tsv / edges.tsv / pool.tsv / exposure.tsv），
交叉方式写在第四节的算法里，可复算。

## 〇 裁定

**有条件进 SPEC：`parent` 单义化为 part-of，且降格为「派生冗余字段」——语义以边为准，
`parent` 只是挂载点的缓存；两者都保留，但必须加一条机器可查的一致性约束。**

一句话理由：实测 287 个带 `parent` 的节点里 **284 个（98.96%）的 `parent` 恰等于它唯一的 part-of 父**，
剩下 3 个的真实关系是 is-a/实例而非成分——即生产者事实上已经把 `parent` 当 part-of 用了，
SPEC 只需把这个既成惯例写成规则并处理那 3 个例外，不必引入多义。

## 一 现状取证

### 1.1 SPEC.md 现有条文（逐字）

关于 `parent`，SPEC 全文只有两处，且都不定义语义：

`SPEC.md:62`（节点 schema 示例，节选）：

```
"anchors":[{"file":"15.04.md","quote":"..."}],"parent":"apostol:linear-space","atomic":true,...
```

`SPEC.md:65`：

```
`parent` / `atomic` / `atomic_reason` 仅 `d:` 节点必填。
```

即：**SPEC 规定了 `parent` 的必填范围，从未规定它表示哪种关系。** 唯一的旁证是
`SPEC.md:75`「纵向边方向恒为 **粗 → 细**（`part-of` / `requires`）」——它把 part-of 归入纵向，
但那是在说边，没说 `parent`。`SPEC.md:20` 的 part-of 定义是「src 是 dst 的组成成分」。

### 1.2 已有提案里的既有结论及我的复核

`S2-SPEC-字段语义.md:36` 的总览表给了本项一行裁决：

```
| 5 | `parent` 是否仅指 part-of 父 | **允许 part-of 或 is-a 两种，但证据池只沿 part-of** | 0 | `SPEC.md:59–65` |
```

同文件 `:260` 复述了后半句：「**T3 只沿 `part-of` 传递，不沿 `is-a` / `generalizes` 传递。**
见「`parent` 字段」一节。」

**复核结论：后半句站得住，前半句站不住，且它指向的正文根本不存在。**

- **正文缺失（可直接核）**：S2 的章节结构只写到「项 3」，文件末尾是
  `<!-- ITEM-4 -->` / `<!-- ITEM-5 -->` / `<!-- ITEM-6 -->` / `<!-- ITEM-7 -->` 四个空占位
  （`S2-SPEC-字段语义.md:513–516`）。`:260` 让读者「见『`parent` 字段』一节」，
  而该节从未写出。所以那行裁决是**没有取证支撑的预告**，不是结论，
  本提案不算「重做分析」，而是补做它欠的那一份。
- **「允许 is-a」不成立**：按 1.3 的实测，287 个 `parent` 里与 part-of 父一致的 284 个，
  不一致的 **0 个**。真正的例外只有 3 个「有 `parent` 无 part-of 边」，
  而这 3 个逐个看下来（1.4）真实关系确实是 is-a——但**它们在图里也没有 is-a 边**。
  即数据从未出现过「`parent` 被当 is-a 用」的**显式**实例，
  只出现过「`parent` 悄悄替代了一条本该显式写出的 is-a 边」。
  允许多义会把这 3 处漏记边固化为合法写法。
- **「须改数据 0 条」不成立**：S2 表里第 4 列写 `0`。那是「允许多义」自然的推论
  （允许即无须改）。若按本提案单义化，须改 3 个节点（第四节给算法与逐条处置）。
- **「证据池只沿 part-of」成立且必须保留**：这与四层池定义（T3 沿 part-of 后代）一致，
  也与 `exposure.tsv` 的 `n_partof_desc` 列的算法一致。本提案把它并入条文。

### 1.3 交叉实测（nodes.tsv 的 parent 列 × partof.tsv）

| 桶 | 定义 | 实数 |
| --- | --- | --- |
| 有 `parent` 的节点 | nodes.tsv 第 5 列非空 | **287** |
| 其中 id 前缀为 `d:` | | **287（100%）** |
| `d:` 节点总数 | | **287** |
| A 一致 | `parent` 等于该节点某个 part-of 父 | **284** |
| B 冲突 | 有 part-of 出边但父都不等于 `parent` | **0** |
| C 缺边 | 有 `parent` 但无任何 part-of 出边 | **3** |
| 悬空 `parent` | `parent` 指向不存在的 id | **0** |

即 `SPEC.md:65` 的「仅 `d:` 节点必填」被 100% 遵守，两个方向都严丝合缝：
287 个有 `parent` 的全是 `d:`，287 个 `d:` 全都有 `parent`。

part-of 边侧（edges.tsv，`rel` 分布中 part-of **314** 条）：

| 量 | 实数 |
| --- | --- |
| part-of 边总数 | 314 |
| 其中 src 为 `d:` | **284** |
| 每个 `d:` 节点的 part-of 出边数 | **全部恰为 1**（284 个节点 × 1） |
| 其中 src 非 `d:`（apostol 19 / strang 10 / x 1） | **30** |
| 这 30 条的 src 里带 `parent` 字段的 | **0** |

两个方向的覆盖差是不对称的：**part-of 边多覆盖 30 对（src 无 `parent` 字段），
`parent` 多覆盖 3 对（无对应边）。** 谁都不是谁的超集。

### 1.4 三个例外逐个看（C 桶）

| 节点（loc） | `parent` | 真实关系 | 依据 |
| --- | --- | --- | --- |
| `d:cauchy-schwarz-for-integrals`（nodes-D3.jsonl:27） | `apostol:cauchy-schwarz-inequality` | **is-a / 实例** | statement 首句「Instantiating Theorem 15.8 in C(a, b) with the integral inner product yields…」；锚点 `15.10.md` 166 字符起首即 `EXAMPLE. Applying Theorem 15.8 to the space $C(a, b)$…` |
| `d:exponential-weight-makes-improper-integral-converge`（nodes-D3.jsonl:22） | `apostol:weighted-integral-inner-product` | **is-a / 实例**（Example 5 取 w(t)=e^{-t}） | statement「Example 5 puts (f, g) = integral from 0 to infinity of e^(-t) f(t) g(t) dt…」；锚点 56 字符即该公式 |
| `d:trigonometric-orthogonal-system`（nodes-D3.jsonl:49） | `apostol:orthogonal-set` | **is-a / 实例** | statement「…so S is an orthogonal set」；**父节点自己的 statement 就点名它是例子**：`apostol:orthogonal-set`（nodes-A1.jsonl:59）写「Example: the trigonometric system in C(0, 2pi) with the integral inner product is an orthogonal set.」 |

三个例外的共同形态：**`d:` 节点是父概念的一个具体实例（Apostol 的 EXAMPLE 段），
不是父概念的组成成分。** 生产者要给它找挂载点，唯一可填的 `parent` 就成了 is-a 的替身。

这三个节点各自都有 2 条出边，**没有一条指向 `parent`**（实测：
`d:cauchy-schwarz-for-integrals` → `requires d:integral-inner-product-formula` /
`requires d:cauchy-schwarz-inequality-statement`；
`d:exponential-weight-…` → `requires d:weight-function-must-be-positive` /
`applies-to apostol:polynomials-of-degree-at-most-n`；
`d:trigonometric-orthogonal-system` → `requires d:integral-inner-product-formula` /
`requires d:15-10-nonzero-hypothesis-is-essential`）。
所以「它是父的实例」这个信息**只存在于 `parent` 字段，图的边集里查不到**。

### 1.5 谁在消费 `parent`：三个工具，且都不校验它

`tools/check_graph.py` 全文没有 `parent` 字样（唯一出现 `part-of` 的是 `:19` 的关系词白名单）。
**即 522 个节点里 287 个 `parent` 值从未被任何硬校验碰过**，
「悬空 0、冲突 0」是生产者自律的结果，不是工具保证的结果。

实际消费方三处：

- `tools/gen_manifest.py:43,47–54` —— 按 `parent` 分组产出清单，并把找不到的标 `[悬空 parent]`。
- `tools/repair_dangling.py:29–35,64` —— 悬空 id 的**重定向目标**取 `parent_of.get(dead)`。
- `tools/audit_coverage.py:46–49` —— Audit B KILL 的爆炸半径按 `parent` 反查 `children`。

**这是「不得去掉 `parent`」的实质理由**：后两处把 `parent` 当作节点级的挂载事实。
`repair_dangling.py` 在边被删/改指后仍要知道死节点该往哪挂——此刻边可能已经不在了，
只有节点字段还在。S2 `:203–209` 已经论证过同一个失败模式的另一半
（`edges-D1.jsonl:10/11/12` 三条 part-of 改指会静默改变依赖边的节点），
我复核那三条边确实存在且 src 分别是 `apostol:closure-axioms` /
`apostol:axioms-for-addition` / `apostol:axioms-for-multiplication-by-numbers`，
**这三个 src 全是非 `d:` 节点、都没有 `parent` 字段**，
所以那次改指不会造成 `parent` 漂移——但换成 `d:` src 的 part-of 边就会。
漂移检测目前**无工具可查**，这是本条文要补的洞。

## 二 拟并入 SPEC 的逐字条文

替换 `SPEC.md:65` 那一行，改为下列小节（逐字，含代码块）：

```
### `parent` 字段（单义：仅 part-of；且是派生冗余字段）

`parent` / `atomic` / `atomic_reason` 仅 `d:` 节点必填。

- **`parent` 只表示 part-of 的分解关系**：`parent` 的值必须是该节点作为「组成成分」所属的整体，
  与 `rel: part-of` 的 `dst` 同义。**不得用 `parent` 表示 `is-a` / `generalizes` /
  `requires` / `applies-to` 或任何其它关系。** 那些关系一律只写成边。
- **`parent` 是派生字段，语义以边为准。** 每个带 `parent` 的节点**必须**同时存在一条
  `{"src":"<该节点>","rel":"part-of","dst":"<parent 的值>"}` 的边。
  两者若冲突，**以边为准，`parent` 判为陈旧值**（cause `0`，FIX 而非 KILL）。
- **一个 `d:` 节点只能有一个 part-of 父**，故 `parent` 是单值，不写成数组。
  非 `d:` 节点可以有多个 part-of 父（现有数据里有 3 个），这类节点**不写 `parent`**。
- **`parent` 不得悬空**：其值必须是数据文件里真实存在的节点 id。
- **证据池的 T3 只沿 `part-of` 边传递**，不沿 `parent` 字段、也不沿 `is-a` / `generalizes`。
  `parent` 不产生任何证据继承——它只是挂载点缓存，供清单分组、KILL 爆炸半径统计、
  悬空重定向使用（`tools/gen_manifest.py`、`tools/audit_coverage.py`、`tools/repair_dangling.py`）。
- **一个节点是父概念的「实例」而非「成分」时，不要靠 `parent` 蒙混。** 正确写法是
  显式补一条 `is-a` 边；`parent` 另指真正的整体，或（若确实无整体可挂）留空并在
  `atomic_reason` 里写明「无 part-of 父，与 <id> 的关系是 is-a，见边」。
  **只在 `parent` 里记 is-a，等于把这条关系藏在边集之外，图查询查不到，判 cause `0` 并 FIX。**
- **机器校验（须加进 `tools/check_graph.py`，它目前完全不检查 `parent`）**：
  1. `parent` 非空 ⇔ id 以 `d:` 开头；
  2. `parent` 的值存在于节点集合中（不悬空）；
  3. 存在 `src=该节点 ∧ rel=part-of ∧ dst=parent` 的边；
  4. 该节点的 part-of 出边恰好 1 条，且其 `dst` 等于 `parent`。
  第 3、4 条是本轮新增，用于捕获 part-of 边被改指/删除后 `parent` 的**静默漂移**——
  该漂移当前无任何工具可查。
```

配套在 `SPEC.md:75` 那条（「纵向边方向恒为 **粗 → 细**」）后追加一句：

```
`part-of` 边是分解关系的**唯一权威记录**；节点的 `parent` 字段是它的冗余投影，
删边必须同步清 `parent`，改指必须同步改 `parent`。
```

## 三 替换或修改 SPEC.md 的哪几行

两处，均在「节点 schema」与「边 schema」小节内，不动关系词表、不动锚点规则。

### 修改点 1：`SPEC.md:65`（**整行替换**）

旧（1 行，逐字）：

```
`parent` / `atomic` / `atomic_reason` 仅 `d:` 节点必填。
```

新：第二节那个 `### parent 字段（单义：仅 part-of；且是派生冗余字段）` 小节全文
（旧那一行原样保留为新小节的第一句，故无信息丢失）。

位置说明：该行紧跟在 `:59–63` 的节点 schema 代码块之后、`:67` 的「## 边 schema」之前，
`:66` 是空行。新小节插在 `:65` 原位，**`:66` 空行保留**。

### 修改点 2：`SPEC.md:75`（**行尾追加一句，不改原句**）

旧（逐字）：

```
- 纵向边方向恒为 **粗 → 细**(`part-of` / `requires`),不论谁先被发现。
```

新（追加为同一条目下的续行）：

```
- 纵向边方向恒为 **粗 → 细**(`part-of` / `requires`),不论谁先被发现。
  `part-of` 边是分解关系的**唯一权威记录**；节点的 `parent` 字段是它的冗余投影，
  删边必须同步清 `parent`，改指必须同步改 `parent`。
```

### 不改的地方（明确声明）

- `SPEC.md:20`（`part-of` 的关系词定义「src 是 dst 的组成成分」）——**不动**，本条文与它一致。
- `SPEC.md:18`（`is-a` 定义）与 `:29`（`is-a` 与 `generalizes` 互为反向）——**不动**。
- `SPEC.md:62` 的 schema 示例里 `"parent":"apostol:linear-space"` ——**不动**。
  该示例节点是 `d:additive-inverse-uniqueness`，它在数据里不存在（是 SPEC 自造的示例），
  故不受第四节的回溯影响统计约束；但示例本身合规（part-of 语义讲得通）。
- 死因编号表（`SPEC.md:100`）——**不动**。本条文的两类违规都归 cause `0`（仅需 FIX），
  cause `0` 的引入由 S2 项 1 负责，本提案只是使用它。

## 四 回溯影响

### 4.1 总账

基数说明：**节点 546 = check_graph 口径的 522 + `structures-L2-*.jsonl` 的 24 个 L2 节点**。
下表所有分母用 **546**（`parent` 只出现在 `d:` 节点上，L2 节点无 `parent`，
故两个口径下的违规实数完全相同，只有分母不同）。

| 类别 | 实数 | 说明 |
| --- | --- | --- |
| 从合规变违规 | **3** | C 桶：有 `parent` 无 part-of 边（新校验第 3、4 条不通过） |
| 从违规变合规 | **0** | 旧 SPEC 对 `parent` 没有任何可违反的约束，故不存在原本违规的条目 |
| 保持合规 | **284** | A 桶，逐条通过四条新校验 |
| 不受影响（无 `parent`） | **259** | 546 − 287 |
| 须改的边 | **0** | 见 4.3：三个例外的修复只动节点字段与**新增**边，不改任何现有边 |

**变违规率 3/287 = 1.05%（按有 `parent` 的节点算）；3/546 = 0.55%（按全节点算）。**
代价极低是因为本条文写的是既成惯例，不是新规矩。

### 4.2 算法（可复算）

用 `tmp_index/` 三张表，四步：

```
# 1) 节点侧：(id, parent)，287 行
awk -F'\t' 'NR>1 && $5!="" {print $1"\t"$5}' nodes.tsv | sort > node_parent.tsv

# 2) 边侧：把 partof.tsv 的「按父聚合」展开成「子<TAB>父」，314 行
#    注意 partof.tsv 的方向：第1列是父(dst)，第3列是逗号分隔的子(src)
awk -F'\t' 'NR>1 {n=split($3,c,","); for(i=1;i<=n;i++) print c[i]"\t"$1}' partof.tsv \
  | sort > child_parent.tsv

# 3) A/B/C 三桶
join -t$'\t' -j1 node_parent.tsv child_parent.tsv > joined.tsv     # 284 行
awk -F'\t' '$2==$3{print $1}' joined.tsv | sort -u > A_match       # 284  一致
cut -f1 joined.tsv | sort -u > has_partof
comm -23 has_partof A_match                                        #   0  B 冲突
cut -f1 node_parent.tsv | sort -u > has_parent
comm -23 has_parent has_partof                                     #   3  C 缺边

# 4) 悬空校验
awk -F'\t' 'NR>1{print $1}' nodes.tsv | sort -u > allids
awk -F'\t' 'NR==FNR{ids[$0]=1;next} !($2 in ids){print}' allids node_parent.tsv   # 0 行
```

第 3 步的 `join` 结果恰好 284 行而非 287，且 `$2==$3` 也恰好 284——
**这两个数相等就证明了 B 桶为 0**（凡有 part-of 边的都对得上），
差额 3 即 C 桶。这是本项最关键的一次核对，我逐步跑过，不是估计。

交叉验证：`awk` 直接从 edges.tsv 统计「src 为 `d:` 的 part-of 边」得 **284 条，
且每个 src 恰好 1 条**（284 个不同 src × 1）。与上面的 284 独立吻合。

### 4.3 三个例外的逐条处置建议（须主控确认，我只给依据）

| 节点 | 处置 | 新增/改动 | 池影响（新增不同 (file,quote) 数） |
| --- | --- | --- | --- |
| `d:cauchy-schwarz-for-integrals` | **补 `is-a` 边**至 `apostol:cauchy-schwarz-inequality`（origin=source，evidence 可用它现有那条 166 字符锚点 `EXAMPLE. Applying Theorem 15.8 to the space $C(a, b)$…`）；`parent` 处置见下 | +1 边 | 若同时补 part-of 则父池 14→15（**+1**） |
| `d:exponential-weight-makes-improper-integral-converge` | 同上，`is-a` 至 `apostol:weighted-integral-inner-product`（可用 56 字符公式锚点或 108 字符那条） | +1 边 | 若同时补 part-of 则父池 5→6（**+1**） |
| `d:trigonometric-orthogonal-system` | 同上，`is-a` 至 `apostol:orthogonal-set`；**父节点 statement 自己点名了它是例子**，evidence 可取 `15.11.md` 的 86 字符锚点 | +1 边 | 若同时补 part-of 则父池 2→9（**+7**） |

`parent` 有两条互斥的处置路线，我给判断依据但**不代主控决定**：

- **路线甲（保守，改动最小）**：三个节点的 `parent` **留空**，并在 `atomic_reason` 追写
  「无 part-of 父，与 <id> 的关系是 is-a，见边」。
  代价：违反新条文第 1 条「`parent` 非空 ⇔ `d:` 前缀」——**故采路线甲必须把第 1 条的
  ⇔ 放宽为 ⇒**（`parent` 非空 ⇒ `d:`；`d:` 不强制有 `parent`）。
  相应地 `SPEC.md:65` 原句「仅 `d:` 节点必填」要改成「仅 `d:` 节点可填，且有 part-of 父时必填」。
  这是我推荐的路线：**它不新造任何一条教材里没有的 part-of 关系。**
- **路线乙（保完整性）**：补 3 条 part-of 边让 `parent` 站得住。
  代价：**这三条 part-of 是假的**。「C(a,b) 上的积分型 Cauchy–Schwarz」不是
  「Cauchy–Schwarz 不等式」的一个组成成分，是它的一个实例；
  硬写 part-of 就是为了让字段自洽而伪造关系词，触第一条硬禁令的精神。
  额外副作用：`apostol:orthogonal-set` 的证据池会**新增 7 条**不同 (file,quote)
  （T3 从 2 涨到 9），凭空放宽该节点未来 cause 6 指控的判定门槛——
  这正是「三条过报通道」里的 (a) 型（内容下移）在**反方向**上被滥用。

## 五 反例与边界情形

### 5.1 反例：一致不等于唯一——`d:example-2-the-complex-numbers-with-real-scalars`

这个节点（nodes-D1.jsonl:47，`parent = apostol:real-linear-space`）**同时有两条出边指向同一个 dst**：

```
data/edges-D1.jsonl:113   is-a      apostol:real-linear-space   origin=source
data/edges-D1.jsonl:114   part-of   apostol:real-linear-space   origin=source
```

它落在 A 桶（一致），四条新校验全部通过，**但它是全图唯一一处
「某节点 → 其 `parent` 的边 rel 不是 part-of」的实例**：我实测「节点 → 其 parent 的所有边」
按 rel 分布为 `part-of 284 / is-a 1`，那个 1 就是它。

这说明本条文的机器校验有一个已知盲区：**它只能证明 part-of 边存在，
不能证明不存在一条语义上更准确、且与 part-of 相矛盾的兄弟边。**
「复数域视为实线性空间」是实线性空间的一个**实例**，不是它的一个**成分**——
`:114` 那条 part-of 很可能是为了让 `parent` 自洽而补的，与 5.2 的路线乙同一种病。
本条文**不判它违规**（形式合规），但建议主控把它列入 FIX 候选，
并在审计程序里加一句：**同一 (src,dst) 上同时出现 `part-of` 与 `is-a` 时须人工裁一条。**
（这条我不写进 SPEC 条文，因为它属于关系词共存规则，是 S3 的地界。）

### 5.2 边界：多 part-of 父的节点必须排除在 `parent` 之外

实测有 **3 个节点各有 2 个 part-of 父**：

```
apostol:closure-axioms                     -> apostol:linear-space, d:ten-axioms-listed-in-three-groups
apostol:axioms-for-addition                -> apostol:linear-space, d:ten-axioms-listed-in-three-groups
apostol:axioms-for-multiplication-by-numbers -> apostol:linear-space, d:ten-axioms-listed-in-three-groups
```

三者全是 `apostol:` 前缀、**都没有 `parent` 字段**，所以现行数据里
「`parent` 单值」与「part-of 可多父」不冲突。但这是巧合而非结构保证：
若将来某个 `d:` 节点也挂两个 part-of 父（例如一条公理同时属于两个公理组），
`parent` 的单值就无法表达，**新校验第 4 条（part-of 出边恰好 1 条）会把它判违规**。
条文里已经写明该限制只加在 `d:` 节点上，非 `d:` 节点不受约束。
若这种情形出现，正确做法是**放宽第 4 条为「其中至少一条 dst 等于 `parent`」并显式声明
`parent` 是「主挂载父」**，而不是删掉一条真实的 part-of 边。

### 5.3 边界：part-of 边不带 evidence 时 `parent` 也不获得豁免

284 条一致的 part-of 边里 **267 条有 `evidence.quote`、17 条没有**。
没有 evidence 的 17 条（`origin` 均须为 `model`，SPEC `:73` 允许省）依旧满足新校验第 3、4 条。
**这是有意的**：`parent` 的合规性只问「边在不在」，不问「边有没有引文」。
把引文要求叠加到 `parent` 上会造成两个后果——一是 17 个节点凭一条独立规则（边的 origin 规则）
的合法结果被判违规；二是会诱使生产者给 part-of 边硬凑引文。
引文充分性归 cause 6 与四层证据池管，本条文不越界。

### 5.4 边界：`parent` 指向 L2 节点应被禁止（当前 0 例）

新校验第 2 条只查「不悬空」，没查「父的层级」。实测 287 个 `parent` 值中
**指向 `L2:` 的 0 个**，全部指向 `apostol:` 或 `d:`。
但纵向方向规则（`SPEC.md:75`「粗 → 细」）在 `d:` → `L2:` 上会反向：
L2 是抽象层，`d:` 节点 part-of 一个 L2 结构在方向上讲不通（L2 用 `members` 而非边收编下层）。
我**不把这条加进条文**（当前 0 例，且属层级方向议题），只在此记明它是未覆盖的边界。

## 六 与其它待议项的耦合（只列，不代它们裁定）

- **S2 项 3（节点 `origin`）插入位置冲突**：S2 `:389` 写「在 `SPEC.md:65`
  （`parent`/`atomic`/`atomic_reason` 那行）**之后**新增」。本提案**整行替换** `:65`。
  两者可共存，但主控必须先应用本提案（替换 `:65` 为小节），再把 S2 的 `origin` 小节接在其后，
  否则行号锚点失效。**这是一处硬排序依赖。**
- **S2 项 2（T2/T3 证据池）**：本条文引用了它的结论「T3 只沿 part-of」并写进条文。
  若 S2 项 2 的裁决在综合裁决中被改动，本条文第二节倒数第三条须同步改。
- **S2 项 5 自身**：本提案是它欠的正文。若综合代理保留 S2 表格里那行「允许 part-of 或 is-a」，
  与本提案的单义化裁决**直接冲突**，须择一。
- **S3 项 3（无 `parent` 层的删除测试 / 「恢复基」）**：S3 `:15,134,170` 把删除测试的尺子
  从「parent + 兄弟」改为「恢复基」。本条文让 `parent` 更严格但**不改变它的存在性**，
  故与 S3 的替代方案兼容；但若 5.2 的路线甲被采纳（三个节点 `parent` 留空），
  S3 的「无 `parent` 层」人口会从 0 增加到 3。
- **关系词共存规则（S3 地界）**：5.1 那个 `is-a` + `part-of` 同 (src,dst) 的实例
  需要一条共存裁决规则，本提案未裁。
- **cause 0 的引入（S2 项 1）**：本条文的两类违规都判 cause `0`，依赖 cause `0` 进 SPEC。
  若 cause `0` 不进，须改用「仅 FIX，无死因」的表述。

## 顺带发现

- `tools/check_graph.py` 全文无 `parent` 字样，287 个 `parent` 值从未被任何硬校验碰过；「悬空 0」是生产者自律，不是工具保证。
- `S2-SPEC-字段语义.md` 的项 4/5/6/7 只有总览表一行裁决，正文是四个空占位（`:513–516`），其中项 5 的 `:260` 还指向一个从未写出的「`parent` 字段」一节。
- `d:example-2-the-complex-numbers-with-real-scalars` 同时有 `is-a` 与 `part-of` 指向 `apostol:real-linear-space`（edges-D1.jsonl:113/114），需要一条关系词共存裁决规则。
- `d:trigonometric-orthogonal-system` 的父 `apostol:orthogonal-set` 自己的 statement 就把它写成 Example，父子内容重叠，是删除测试的候选（不属本项）。
- `d:zero-element-of-a-function-space-is-a-pointwise-identity` 的 `parent` 是 `apostol:independent-set`，字面上像挂错，但它落在 A 桶、形式合规，未逐条核其正当性。
- `edges.tsv` 的 rel 分布实测：requires 707 / part-of 314 / is-a 148 / contrasts 125 / other 40 / applies-to 33 / generalizes 31 / implies 25 / alias-of 6 / equivalent 4，合计 1433，无越表关系词。
