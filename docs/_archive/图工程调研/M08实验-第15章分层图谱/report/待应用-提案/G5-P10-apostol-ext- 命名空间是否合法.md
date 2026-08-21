# SPEC 待议项 P10：apostol:ext- 命名空间是否合法

## 〇 裁定（进 SPEC / 不进 SPEC / 有条件进；一句话理由）

**有条件进 SPEC。** `apostol:ext-` 合法，但它表示的**不是**任务书猜测的「教材没有、为组织
图谱而加的扩展节点」，而是「**所指对象在第15章之外（第12章 / 第II卷），但第15章在正文里
点名征用了它**」——11 个节点的锚点全部落在第15章正文的引用句上，没有一条来自章外，
所以它们不是模型虚构，而是**章外依赖的记账位**；因此它与 `origin` **正交**，
「所有 ext- 必须标 origin:model」**是错的**（现有 9 个正确地标着 `source`），必须写成
反向规则：**ext- 节点的 origin 由「第15章有没有点名出处」决定，而不是由 ext- 前缀决定**。

一句话的判据差别：`ext-` 说的是**所指在哪里**，`origin` 说的是**statement 的内容从哪来**。

## 一 现状取证（SPEC.md 相关行逐字 + 已有提案里的既有结论 + 你的复核）

### 1.1 SPEC.md 现行文本（`:35–45`，逐字）

```
## id 命名空间

| 前缀 | 用途 | 谁产出 |
| --- | --- | --- |
| `apostol:` | Apostol 第15章节点 | 已有(继承) |
| `strang:` | Strang ch3–4 节点 | 已有(继承) |
| `d:` | 纵向下延的细粒度/原子节点 | D 层代理 |
| `x:` | 跨教材对齐节点(不变量) | H-cross 代理 |
| `L2:`…`Ln:` | 抽象结构节点 | 阶梯代理 |

后接英文 kebab-case,全局唯一。**引用已有节点必须用它的原 id**,不要造新 id 重复表达同一对象。
```

两处硬约束由此得出：(i) 表里**没有** `ext-` 与 `cx-` 这两个二级前缀，表格第一列在严格读法下
是**闭表**；(ii) `:45` 那句「不要造新 id 重复表达同一对象」是判 `ext-` 是否越界的关键尺子。

### 1.2 已有提案里的既有结论（只 grep，未读全文）

`S2-SPEC-字段语义.md:37` 的裁决总览表有一行：

```
| 6 | `apostol:cx-` / `apostol:ext-` 是否合法 | **合法**,补进命名空间表并加最长前缀匹配警告 | 0 | `SPEC.md:35–45` |
```

**复核结论：方向对，但这一条是一张空头承诺，且把两个前缀捆在一起是错的。**

- **它没有正文。** `grep -n '^## \|^### ' S2` 的输出止于「项 3 影响面实测 / 风险」，
  文件末尾只剩 `<!-- ITEM-4 -->`…`<!-- ITEM-7 -->` 四个占位注释。S2 自己在 `:24` 声明
  「已完成它自己编号的 1/2/3 项」。所以项 6 **只有裁决词与「须改数据 0」这个数字，
  没有依据、没有条文、没有回溯算法**。本提案是它的第一次落地，不是重做。
- **「须改数据 0」这个数字成立**，我按 §四 的算法独立复算，确认为 0 —— 但成立的前提是
  把 `ext-` 写成**可选声明**而非强制标记（S2 没写这个前提，见 §四 C5）。
- **把 `cx-` 与 `ext-` 合并裁决是错的。** 两者的锚点分布完全不重叠，实测（anchors.tsv）：
  `ext-` 的 16 条锚点全在正文（15.03/15.06/15.07/15.08/15.10/15.13.md，各 1/2/3/5/4/1 条），
  **0 条在 exercises**；`cx-` 的 104 条锚点**全部**在 `15.05/15.09/15.12/15.16-exercises.md`
  （22/9/54/19）。`cx-` = 习题（exercise）导出的节点，`ext-` = 章外依赖，
  两者的准入条件与 `origin` 规则都不同（`cx-` 的 49 个节点 `origin` **全空**，
  正是 S2 项 3 要补的那 49 个）。本提案只裁 `ext-`，`cx-` 留给 P08/S2 项 3 那一路。

### 1.3 我的取证：11 个 ext- 节点是什么

`grep 'apostol:ext-' tmp_index/nodes.tsv` → **11 个，全部在 `data/nodes-H2.jsonl:1–11`**，
无第 12 个，别处无 `ext-` 前缀（`awk` 全表扫 546 行确认）。按所指对象分三类：

| 类 | id（略去 `apostol:ext-`） | 所指 | origin |
| --- | --- | --- | --- |
| A 章外定理（借证明） | `theorem-12-8` / `theorem-12-10-part-b` / `theorem-12-10-part-c` / `theorem-12-3` / `theorem-12-2` | 第12章定理 | source |
| B 章外对象/定义 | `vn-as-a-prior-vector-space` / `chapter-12-finite-dependence-definition` / `vn-c-section-12-16` | 第12章的 V_n、相依定义、12.16 节的 V_n(C) | source |
| C 前向外包与无出处借用 | `volume-2-proof-of-the-legendre-closed-form` / `uncited-dimension-of-a-second-order-de-solution-space` / `uncited-unit-coordinate-basis-of-vn` | 第II卷的证明；两条第15章未给出处的事实 | source / model / model |

关键实测（可直接引用）：

1. **锚点全部合规且全部在第15章正文**：16 条锚点，charlen 56–167（全在 30–200 内），
   `has_nl` 全 0，无 0 锚点节点。→ **ext- 节点不是「教材没有的虚构节点」**，
   任务书里那个猜测被数据否掉：每一个都有第15章正文里逐字可查的征用句。
2. **`origin` 分布 source 9 / model 2**（nodes.tsv 第 7 列）。两个 `model` 的
   `origin_note` 都写明了理由：**「锚点是第15章的断言处，不是引用语——第15章在此处没有引用语，
   它没有指向任何外部出处。把该事实判为外部的是我们的推断」**。
   这正是 `ext-` 与 `origin` 正交的直接证据。
3. **拓扑角色是 dst，不是 src**：19 条 edges-H2 中，ext- 作 dst 的 18 条、作 src 的 2 条
   （`edges-H2.jsonl:9` `ext-theorem-12-3 --requires--> ext-theorem-12-2`、
   `:15` `ext-vn-c-section-12-16 --is-a--> apostol:complex-euclidean-space`），去重后 19 条边。
4. **证据池极薄且无下移通道**：exposure.tsv 显示 11 个节点 `n_partof_desc` 全为 0，
   **T3 恒空**，T2 仅 2 条，池总量 18 条。撤回任一个都会立刻产生悬空 id
   （现报「悬空 id 引用 0 处」）。
5. **`node_type` 全部落在封闭表内**：theorem 8 / concept 3。
6. **工具侧无任何前缀校验**：`grep -n 'prefix\|namespace\|kebab\|ID_' tools/check_graph.py`
   **0 命中**；只有 `check_layer.py:84` 校验 `L{n}:`。所以命名空间规则**至今是纯纸面规则**，
   这决定了 §四 的回溯改动数必然是 0 —— 不是巧合，是因为没有机器在查。

## 二 拟并入 SPEC 的逐字条文

五条，编号 C1–C5。C1 改表、C2 定义、C3 界定不得做什么、C4 定 origin 关系、C5 定强制性。

**C1（命名空间表增两行）**

```
| `apostol:ext-` | 第15章**之外**（其它章 / 其它卷）的对象,但第15章在正文里点名征用了它 | H-back 代理 |
| `apostol:cx-` | 由第15章习题(`*-exercises.md`)导出的节点 | H-in / CX 代理 |
```

**C2（新增小节，紧接命名空间表之后）**

```
### 二级前缀 `apostol:ext-`：章外依赖的记账位

`apostol:ext-` 标记一个**所指对象不在第15章之内**的节点。它记录的不是那个对象本身,
而是**第15章向它索取了什么**。收录一个 `ext-` 节点须同时满足三条:

1. **所指在章外。** 所指对象定义或证明于第15章之外(其它章、其它卷),
   不论方向是回指(第12章)还是前向外包(第II卷)。
2. **征用点在章内且可逐字锚。** 至少 1 条锚点落在 `source/apostol-ch15/` 的正文文件里,
   指向第15章**引用它**或**使用它**的那一句。锚点仍受 30–200 与逐字连续约束。
   **不得用章外原文当锚点**——章外原文不在本实验的可校验语料内。
3. **statement 只写「第15章索取了什么」,不写章外内容本身。** 若手上没有章外原文,
   **不得替原作者陈述该定理/定义的内容**,并须在 `origin_note` 里写明这一边界。
   陈述未持有的章外原文,判死因 `3`(伪造教材出处)。

`ext-` 节点的 `node_type` 仍取自封闭四值表;它按**第15章的引用句所在节** 填 `sections`,
不按章外对象的原节填。
```

**C3（同小节续，防越界）**

```
`ext-` **不是**给已有章内节点造第二个 id 的通道。若第15章自己也定义或陈述了该对象,
该对象的章内节点已经存在,则 `ext-` 节点**只能**记录「章外来源身份 + 第15章在此处没做什么」
这一独立事实,不得重复表达章内节点已表达的内容(`SPEC.md` 命名空间末句)。
两者内容重合即判**死因 5**(层塌缩),按重复处理。
```

**C4（origin 关系，本条是本待议项的实质裁决）**

```
`ext-` 与 `origin` **正交,互不推导**:前缀说的是**所指在哪里**,`origin` 说的是
**这段 statement 的内容从哪来**。故:

- **`ext-` 节点不必标 `origin: model`。** 若第15章正文里有点名出处的引用句
  (「Theorem 12.8」「Section 12.16」「in Volume II」),则「该对象在章外」这一判断
  是第15章自己说的,`origin` 取 `source`,锚点即那句引用语。
- **`origin: model` 只用于第15章未给任何出处的借用**:第15章直接使用了一个它没有证明、
  也没有指向任何出处的事实,而「它来自章外」是我们的推断。此时 `origin: model` 必填,
  且 `origin_note` 须写明:锚点是**断言处/使用处**而非引用语,判其为章外是推断。
- **`origin: model` 的 `ext-` 节点不得指名章外的具体定理编号。** 无原文可查而指名,
  判死因 `3`。
```

**C5（强制性：声明式，不是分类式）**

```
`ext-` 是**可选声明**:用它就必须满足上三条;不用它不构成违规。
既有节点不因新增本规则而须改名——`SPEC.md` 命名空间末句「引用已有节点必须用它的原 id」
优先于前缀整齐性。
```

## 三 替换或修改 SPEC.md 的哪几行（给出行号与新旧对照）

改动集中在 `SPEC.md:35–45` 一段，**不动其它任何行**。

### 3.1 表格：`:43` 之后插入两行（C1）

旧（`:38–43`）：

```
| 前缀 | 用途 | 谁产出 |
| --- | --- | --- |
| `apostol:` | Apostol 第15章节点 | 已有(继承) |
| `strang:` | Strang ch3–4 节点 | 已有(继承) |
| `d:` | 纵向下延的细粒度/原子节点 | D 层代理 |
| `x:` | 跨教材对齐节点(不变量) | H-cross 代理 |
| `L2:`…`Ln:` | 抽象结构节点 | 阶梯代理 |
```

新（在 `:39`「`apostol:`」行之后紧接两行，其余不动）：

```
| `apostol:` | Apostol 第15章节点 | 已有(继承) |
| `apostol:ext-` | 第15章**之外**(其它章 / 其它卷)的对象,但第15章在正文里点名征用了它 | H-back 代理 |
| `apostol:cx-` | 由第15章习题(`*-exercises.md`)导出的节点 | H-in / CX 代理 |
| `strang:` | Strang ch3–4 节点 | 已有(继承) |
```

放在 `apostol:` 行之后而非表末，是为了让二级前缀紧跟其父前缀，读者一眼看出
`apostol:ext-` 是 `apostol:` 的**细分**而不是并列的第六个命名空间。

### 3.2 `:45` 那句后追加一句（最长前缀匹配警告，S2 提到但未落文）

旧（`:45`，单行）：

```
后接英文 kebab-case,全局唯一。**引用已有节点必须用它的原 id**,不要造新 id 重复表达同一对象。
```

新（同行末追加一句）：

```
后接英文 kebab-case,全局唯一。**引用已有节点必须用它的原 id**,不要造新 id 重复表达同一对象。
前缀按**最长匹配**解析:`apostol:ext-x` 属 `apostol:ext-` 而不属 `apostol:`,
按 `apostol:` 分桶的工具会把二级前缀一并收进来(这是现状,`tools/gen_manifest.py:15` 即如此)。
匹配前缀时**必须带冒号或连字符边界**:裸串 `ext` 会误命中 4 个 `d:` 节点
(如 `d:thm-15-7a-independent-sets-extend-to-bases`)。
```

### 3.3 `:45` 之后插入新小节（C2 + C3 + C4 + C5 全文）

即 §二 的四段，作为 `## id 命名空间` 的子小节 `### 二级前缀 apostol:ext-`，
插在 `:45` 与 `:47`（`## 锚点规则`）之间。**新增 30 行左右，不替换任何现有行。**

净计：**替换 1 行（`:45`）、插入 2 行（表内）、插入 1 个小节（`:46` 位置）。
被删除的现有行 0 行。**

## 四 回溯影响（用 tmp_index 算出的实数：多少条目从合规变违规、多少反之，附算法）

### 4.0 总账

| 方向 | 条数 | 说明 |
| --- | --- | --- |
| 从违规 → 合规 | **60**（严格读法）/ **0**（宽松读法） | 11 个 `ext-` + 49 个 `cx-`，取决于旧表是否读作闭表 |
| 从合规 → 违规 | **0** | C1–C5 全部；C2 三条准入 11/11 通过，C4 与现状 9 source / 2 model 完全一致 |
| 须改 `data/`（节点） | **0** | |
| 须改 `data/`（边） | **0** | |
| 须改工具 | **1 处（可选）** | `tools/gen_manifest.py` 分桶，见 4.4 |

### 4.1 「从违规变合规 60」的算法

```
awk -F'\t' 'NR>1{id=$1}
  id ~ /^apostol:ext-/ {e++}
  id ~ /^apostol:cx-/  {c++}
  END{print e, c}' tmp_index/nodes.tsv      →  11  49
```

严格读法下，旧表第一列是闭表，`apostol:ext-…` 与 `apostol:cx-…` 都不等于表里任何一项，
故 60 个 id 处于「不属于任何已登记命名空间」的状态；C1 把它们登记进表，60 个转为合规。
宽松读法下 `apostol:` 是它们的真前缀、旧表已隐含覆盖，则该项为 0。
**两个数都给出，不替主控选读法**——这也解释了为什么 S2 那行填「0」而我算出 60：
S2 取的是宽松读法。两者不矛盾。

（`apostol:` 全 151 个的分解，供核对：inherited L1 **63** + 新增 **88**，
新增 = `ext-` 11 + `cx-` 49 + 无二级前缀 28（A2-s1 11 / A2-s2 10 / A2-s3 7）。）

### 4.2 「从合规变违规 0」的逐条验算

- **C2 条 1（所指在章外）**：11/11 通过。逐个所指已在 §1.3 表中点名：第12章定理 5 个、
  第12章对象/定义 3 个、第II卷 1 个、无出处借用 2 个（后两个所指仍在章外，只是出处未被点名）。
- **C2 条 2（≥1 条正文锚点）**：11/11 通过。
  `awk -F'\t' '$1 ~ /^apostol:ext-/ && $3 !~ /exercise/' anchors.tsv` → 16 条，
  覆盖 11 个不同节点；无 0 锚点节点（nodes.tsv 第 6 列最小值 1）。
  长度全在 30–200（最小 56 = `ext-theorem-12-8` 第 0 条，最大 167 = `ext-theorem-12-2` 唯一条），
  `has_nl` 全 0。→ 若条 2 被写成硬校验，**0 个节点新违规**。
- **C2 条 3（不替原作者陈述章外内容）**：11/11 通过，且是主动通过 ——
  11 个 `origin_note` 全部含「第12章原文不在手上/第II卷不在手上，故不陈述…」这类边界声明。
  `ext-theorem-12-2` 的 note 甚至明确拒绝断言「12.2 的性质与 15.10 的四条内积公理逐条对应」。
- **C4**：与现状**完全一致，0 变更**。9 个 `source` 的锚点都是点名引用句
  （含 "Theorem 12.8" / "Theorem 12.10" / "Theorem 12.3" / "Theorem 12.2" /
  "Chapter 12" / "Section 12.16" / "Volume II" 字样）；2 个 `model` 的锚点是
  `15.08.md` 的 EXAMPLE 1 / EXAMPLE 3 断言句，那两句里**没有任何出处字样**，
  且两个 note 都已声明「不指名任何第12章定理编号」。
  → **反过来说：若采纳「所有 ext- 必须 origin:model」，会有 9 个节点从合规变违规。
  这就是我判该说法为错的量化理由。**
- **C3**：0 违规，但有 1 个临界个案（`ext-vn-as-a-prior-vector-space` 与
  `apostol:v-n-space` 并存），见 §五。
- **C5**：0 违规（声明式，不追溯）。

### 4.3 「若 C5 写成强制（凡所指在章外者必须改名带 ext-）」的代价

这是我实测过、但**不建议**的替代方案，数值供权衡：

```
# 非 ext- 节点中 statement 提到章外出处的
grep -v '^apostol:ext-' statements.tsv | grep -E 'Chapter 12|Chapter 8|Volume II|Section 12|Theorem 12\.'
  → 8 个：d:thm-15-5-proof-delegated-to-theorem-12-8 / d:thm-15-5-generality-transfer-uses-only-
    the-linear-space-axioms / d:thm-15-7-proofs-delegated-to-theorem-12-10 /
    d:cauchy-schwarz-proof-inherited-from-theorem-12-3 / apostol:independent-set /
    apostol:theorem-15-5 / apostol:theorem-15-7 / apostol:dot-product-in-vn
# 这 8 个 id 出现在多少条边的端点上
awk -F'\t' 'NR>1 && ($2 in S || $4 in S)' → 71 条边
```

**但这 8 个一个都不该改名**：它们的**所指全在章内**（定理 15.5 / 15.7 本体、
第15章自己给的 independent 定义、15.10 自己写出公式的点积），
提到第12章只是 statement 在**描述第15章的委派行为**。C2 条 1 判的是「所指在哪里」，
不是「statement 里出现了章外字样」。所以强制读法下**真正须改名的仍是 0 个**——
但一个机械执行 C5 的后续代理很容易按字样召回这 8 个、连带改写 71 条边的端点，
其中 4 个还在**已机器校验的 `inherited/nodes-A1.jsonl`** 里。
**这 71 是「C5 被误读成机械规则」的风险量级，不是待做的改动量。** C5 因此写成声明式。

### 4.4 工具与派生文件

- `tools/check_graph.py`：**无须改**。它不校验 id 前缀（`grep 'prefix\|namespace\|kebab\|ID_'`
  → 0 命中），C1–C5 全部落在它的视野之外。→ 这也是「回溯改动 0」的机制性原因：
  命名空间规则至今没有任何机器在执行，进 SPEC 后仍需人工遵守，除非另加校验。
- `tools/gen_manifest.py:15`：`startswith('apostol:')` 一桶收全部 151 个，
  所以 `data/ID-MANIFEST.md` 把 11 个 `ext-` 与 34 个 `cx-` 混编进
  「一、Apostol 第 15 章 L1 节点（136）」按节分组的列表里（实测该段 136 行 = 91 无前缀
  + 11 ext + 34 cx；另 15 个 cx 在别处小节）。**称它们为「第 15 章 L1 节点」在 C1 之后不再准确。**
  建议 manifest 分出两个子小节。这是唯一一处工具改动，且 manifest 自动生成、不属 `data/` 手改。

## 五 反例与边界情形

### 5.1 反例（决定 C2 条 1 必须写「之外」而不能写「之前」）

`apostol:ext-volume-2-proof-of-the-legendre-closed-form`（`nodes-H2.jsonl:9`），
锚点 `15.13.md` 127 字：

```
We shall encounter these polynomials again in Volume II in our further study of differential equations, and we shall prove that
```

这是**前向**外包：所指在第II卷，时间上在第15章**之后**。若条 1 写成「第15章之前已建立的对象」
（H-back / 回指的自然读法，该节点也确实被放进了 H-back 的 `nodes-H2.jsonl`），
这个节点会被规则排除，而它恰是 11 个里最有审计价值的一个 ——
15.13 把闭式的证明推给第II卷，**却当场用该闭式定义 Legendre 多项式 P_n**，
一个未证等式承载了本章的一个定义。条文因此用「之外（其它章 / 其它卷）」并显式写「不论方向」。

### 5.2 边界一（决定 C2 条 2 必须同时写「引用它」与「使用它」）

两个 `origin: model` 节点的锚点不是引用语，而是**使用处**：

- `ext-uncited-unit-coordinate-basis-of-vn` 唯一锚点，`15.08.md` 101 字：
  `EXAMPLE 1. The space $V_{n}$ has dimension $n$ . One basis is the set of $n$ unit coordinate vectors.`
- `ext-uncited-dimension-of-a-second-order-de-solution-space` 锚点 0，`15.08.md` 100 字：
  `EXAMPLE 3. The space of solutions of the differential equation $y'' - 2y' - 3y = 0$ has dimension 2.`

两句里**没有任何出处字样**。若条 2 只允许「引用句」当锚点，这两个节点无锚可用而须撤回；
撤回会使 `edges-H2.jsonl:18`、`:19` 两条边悬空（现报「悬空 id 0 处」）。
所以条 2 写「引用它**或**使用它的那一句」，并由 C4 用 `origin: model` 承担
「判其为章外是推断」这一诚实性负担。

### 5.3 边界二（C3 的临界个案，看起来违规但判不违规）

`apostol:ext-vn-as-a-prior-vector-space` 与章内 L1 节点 `apostol:v-n-space`
（`inherited/nodes-A1.jsonl:11`，锚 `15.03.md` 171 字的 EXAMPLE 3 全句）并存，
两者 `sections` 都含 15.03，且都锚在 15.03 —— 表面看正是 `SPEC.md:45` 禁止的
「造新 id 重复表达同一对象」。该节点的 `origin_note` 自己写了「若审计认为二者重合可判 KILL」。

**判不违规**，与 `G3b-H2节点逐条.md:175–178` 的结论一致，且我复核其依据站得住：
两者锚点**不同句**（`v-n-space` 锚 EXAMPLE 3 整句；`ext-` 锚句内片段
「the vector space of all n-tuples of real numbers, with addition and multiplication by scalars
defined in the usual way in terms of components」141 字，以及 `15.06.md` 的
「These ideas were encountered in Chapter 12 …」130 字，后者 `v-n-space` 没有），
statement 断言的也是不同事实：前者=例3的内容，后者=**第15章从未构造 V_n、
从未显式给出其运算、从未验证其公理**。这是「章内节点 + 章外来源身份节点」的合法分工。

**但这是 `ext-` 最大的误用风险面**：只要 `ext-` 节点的 statement 开始复述章内节点已表达的内容，
它就退化成同一对象的第二个 id。C3 因此把判据定在**内容重合**（判死因 5），
而不是定在「同一 `sections`」或「同一 `file`」——后两者在本个案上会误杀。

### 5.4 边界三（前缀匹配的两个具体坑）

- **裸串匹配**：`grep 'ext' nodes.tsv` 会额外命中 4 个 `d:` 节点
  （`d:thm-15-3-only-a-b-c-are-proved-in-the-text`、`d:thm-15-7a-independent-sets-extend-to-bases`、
  `d:orthogonality-to-generators-extends-to-their-span`、
  `d:orthogonality-to-the-basis-extends-to-all-of-s`），假阳率 4/15。必须匹配 `apostol:ext-`。
- **父前缀分桶**：任何 `startswith('apostol:')` 的工具都会连带收进 11 + 49 = 60 个二级前缀节点，
  `gen_manifest.py` 已经这样了（§4.4）。二者都写进 §3.2 的警告句。

## 六 与其它待议项的耦合（只列，不代它们裁定）

只列耦合点与它对我的条文的约束，不代它们裁定。

- **P08 / S2 项 3（节点是否可带 `origin`）**：C4 的前提是节点侧 `origin` 合法。若 P08 判
  「节点不得带 `origin`」，C4 须整条重写（改为把该信息移入 `origin_note` 或新字段）。
  另：S2 项 3 要补 `origin` 的 49 个节点里，**`cx-` 那 49 个与 C1 第二行同一批**，
  数字应对齐（我实测 `cx-` 的 `origin` 列 49/49 为空）。
- **S2 项 3 的 `mixed` 取值**：若引入 `mixed`，两个 `ext-uncited-*` 可能更该记 `mixed`
  （锚住的题面是原文、「来自章外」是推断）。C4 现按二值写，未预判 `mixed`。
- **P05（`origin: model` 后是否允许无锚）**：11 个 `ext-` 全部有锚，不受影响；
  但 C2 条 2 要求「≥1 条正文锚点」，若 P05 给 `origin: model` 开无锚豁免，
  须明确该豁免**不覆盖** `ext-`（否则 `ext-` 退化成可凭空新建的命名空间）。
- **P07（`parent` 是否仅指分解关系）**：11 个 `ext-` 均无 `parent`、`n_partof_desc` 全 0，
  T3 恒空。若 P07 改动 `parent` 语义或要求 H2 节点补 `parent`，会改变它们的证据池结构。
- **P06（`verify_anchors.py` 判失败范围）**：C2 条 2 若要机械执行，落点在 verify_anchors 而非
  check_graph（后者无前缀视野）。是否新增前缀校验由 P06 那一路决定。
- **G3b（H2 节点逐条）§三 的 8 条修改**：其中 `ext-vn-as-a-prior-vector-space` 要改锚点与
  `sections`（从 4 节降到 2 节）。C2 末句「按引用句所在节填 `sections`」与该修改同向，
  但两处的最终节列表须由主控统一，我不代定。
- **待议项「是否需要表示『在第二个使用点复用该节点』的关系词」**：`ext-` 节点是复用的
  典型承载者（18 条入边全是 requires / generalizes），若新增关系词会改动这 18 条边的 `rel`。

## 顺带发现

- `S2-SPEC-字段语义.md` 的项 4/5/6/7 只有总览表一行，正文是 `<!-- ITEM-4 -->`…`<!-- ITEM-7 -->` 四个空占位；该表的裁决词不应被当作已论证结论转引。
- `data/ID-MANIFEST.md:4` 写「节点总数 504」，tmp_index 实测 522（不含 24 个 L2）；manifest 已过期，且它自称「勿手改」，须重跑 `gen_manifest.py`。
- `tools/check_graph.py` 完全不校验 id 前缀（`grep 'prefix\|namespace\|kebab'` 0 命中），命名空间规则至今是纯纸面规则；只有 `check_layer.py:84` 校验 `L{n}:`。
- 49 个 `apostol:cx-` 节点的 `origin` 全空，锚点 104 条全在 `*-exercises.md`——它们是「习题导出」而非「教材正文」，与 `ext-` 是两类，宜各自立规。
- 第15章正文另有 3 处点名章外/跨节的句子无任何节点或边引用：`15.07.md:27`（Many examples … discussed in Chapter 12）、`15.10.md:5`（the dot product … was defined in Chapter 12 by the formula）、`15.06.md:29`；前两处按 C2 是合格的 `ext-` 征用点，属覆盖缺口。
- `15.11.md:41` 的章内前向引用（In Section 15.13 we shall prove …）由 `d:existence-of-an-orthogonal-basis-deferred` 承载而非 `ext-`，这是对的（所指在章内），可作 C2 条 1 的正例。

