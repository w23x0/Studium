# SPEC 待议项 P06：verify_anchors.py 判失败范围

> 产出性质：**提案**。本代理只读，未修改 `data/`、`tools/`、`SPEC.md` 中任何文件。
> 本文所有数字为本轮实测（脚本写在 `tmp/g5_p06_*.py`，只读 `data/` 与 `source/`），
> 并与 `tmp_index/` 的 anchors.tsv / nodes.tsv / edges.tsv / exposure.tsv 交叉核对一致。

## 〇 裁定

**有条件进 SPEC。** 长度违规**应该**判失败（今天 0 新增失败项，零成本，纯防回归）；
无锚点节点**不能一律判失败**，必须改成「无锚点 **且** 无豁免字段」才判失败——
今天的 28 个无锚点节点全部落在两条既有豁免里（24 个 L2 有 `layer`+`members`，
4 个 `d:` 有 `origin=model`+`origin_note`），一律判失败会立刻造出 28 个假失败。

一句话理由：**判失败的对象不是「没锚点」，是「没锚点也没交代为什么没锚点」**；
而长度界与「不跨行」这两条 SPEC 明文规则至今零机器覆盖，是纯粹的实现遗漏，补上不花钱。

## 一 现状取证

### 1.1 SPEC.md 相关行逐字

- `:47` 小标题：`## 锚点规则(唯一硬校验)`
- `:53` `- 至少 1 条,最多 3 条。\`quote\` 必须在 \`file\` 中**逐字连续出现**,用 \`grep -F\` 机器校验。`
- `:54` `- 长度 30–200 字符。不跨行拼接、不改标点、不加省略号、不修正 OCR 噪声。**复制粘贴,不要凭记忆重写。**`
- `:55` `- 找不到可逐字引用的依据 ⇒ **不要收录**,或标 \`origin: model\` 并如实说明。`
- `:56–57` `- 抽象层节点(L2+)不要求原文锚点,但**必须**列出它统摄的下层成员 id(\`members\`),/ 且这些 id 必须真实存在于下层数据文件中。**编造成员归属是本实验最严重的缺陷。**`

关键落差：`:47` 自称「唯一硬校验」，但 `:53` 的三项里只有「逐字连续出现」被实现，
「至少 1 条」「最多 3 条」和 `:54` 整行（长度、不跨行）**一条都没进代码**。

### 1.2 `tools/verify_anchors.py` 源码取证（读 1–79 行，未改）

- `:44–47` `anchors = node.get("anchors") or []` / `if not anchors:` → 追加进
  `nodes_without_anchor` 后 **`continue`**，不进 `failures`。
- `:49–59` 循环体内唯一的判定是 `elif quote and quote in text`（`:56`）。
  没有 `len(quote)` 检查，没有 `"\n" in quote` 检查，没有 `len(anchors) > 3` 检查。
- `:75` `return 1 if failures or bad_json else 0` —— `nodes_without_anchor` 不影响退出码。

实跑确认（只读数据，不写）：
`python tools/verify_anchors.py data/nodes-D2.jsonl source` 同时打印
`pass rate: 100.0%` + `nodes with NO anchor: 4`，**EXIT=0**。
`data/structures-L2-a.jsonl` 打印 `anchors total: 0` + `nodes with NO anchor: 8`，**EXIT=0**。
我另构造三个探针文件（`tmp/g5_len.jsonl`、`tmp/g5_four.jsonl`、`tmp/g5_one.jsonl`）实测：
14 字符的 `Closure axioms` 当锚点 → `verified 2/2`、EXIT=0；
同一 quote 复制 4 条 → `anchors total: 4`、EXIT=0；
单个纯无锚节点 → EXIT=0。**三条 SPEC 明文规则全部零覆盖，已实证。**

### 1.3 已有提案里的既有结论 + 我的复核

| 出处 | 既有结论 | 复核 |
| --- | --- | --- |
| 交接 §3.8(a) | 唯一测试是 `quote and quote in text`（`:56`），30–200 与不跨行从未被机器检查；现状 921 条 min 32／median 89／mean 94.8／max 198、零换行、0 违规 | **成立**。我独立重算：921 条，min **32**、max **198**、<30 **0** 条、>200 **0** 条、含换行 **0** 条。与 anchors.tsv 的 charlen 列逐条一致 |
| 交接 §3.8(b) | 无锚点节点不让它失败（`:75`），须读 stdout 的 `nodes with NO anchor` | **成立**，已实跑复现 |
| `A3-零证据节点锚点候选.md:379` | 「给 `verify_anchors.py` 打补丁：让它对**无该字段的**无锚节点返回失败」（该字段指新增的 `unanchorable` 之类可审计字段） | **方向正确，但字段选错**。A3 主张新增 `unanchorable`；实测那 4 个 `d:` 节点**已经**各有 `origin=model` + `origin_note`（`nodes-D2.jsonl:42/54/72/73`），P05 正在把这一对字段写成正式豁免。再新造 `unanchorable` 会与它重复记账。我的条文改用「`layer`+`members`」与「`origin∈{model,mixed}`+`origin_note`」两条既有豁免，**新增字段数 0** |
| `A3:409` | 裁决乙（禁 `d:` 层无锚）的好处是「`verify_anchors.py` 的语义干净，不产生裁量成本」 | 这句只在「删掉 :72/:73」的前提下成立。P05 若判允许，本条自动失效。**我不代 P05 裁定**，条文写成对 P05 结果单向兼容（见 §六） |
| `A4:41` | 无锚节点 `continue`、永不计 failures；`text` 是整份文件所以长度与不跨行从未被检查 | **成立**，与 §1.2 同源 |
| `S1-SPEC-锚点规则.md:98` | 「`verify_anchors.py` 的 `:56` 逐字测试需改动 **0**」 | **成立但不完整**。`:56` 本身确实不用改（`quote in text` 对含换行子串已正确工作，S1 实测 29/29）。但 S1 若被采纳（允许跨行、并新增**文件内唯一性**要求），`:56` 之外**必须新增一项唯一性检查**，否则 S1 的新硬规则同样零覆盖。S1 表格没有列这一行，是它的盲点 |
| `G2b:98` | 「`verify_anchors.py` 只做子串校验、不校验长度；30–200 的界是 SPEC 的人工规则」 | **成立** |

**没有任何一份既有提案给出过「改动后新增多少失败项」的实数。** 这是本条的主要新增内容（§四）。

## 二 拟并入 SPEC 的逐字条文

在 `SPEC.md` 的「锚点规则」一节末尾（`:57` 之后、`:59` 的「节点 schema」之前）新增一个小节。
逐字条文如下：

```markdown
### 机器校验的覆盖范围(`tools/verify_anchors.py`)

本节列出的规则中,**哪些由机器判失败、哪些只能人工判**,必须写死在这里,
不得由校验器的当前实现反向定义 SPEC。校验器与本表不一致时,**以本表为准,改校验器**。

`verify_anchors.py` 必须对以下六类判 **FAIL**(计入 `failures`,退出码 1):

| 代码 | 条件 | 对应 SPEC 行 |
| --- | --- | --- |
| `QUOTE_NOT_FOUND` | `quote` 不是 `file` 的逐字连续子串 | 上文「逐字连续出现」 |
| `FILE_NOT_FOUND` | `file` 不在 `--source` 目录树中 | 同上 |
| `LEN_TOO_SHORT` | `len(quote) < 30` | 上文「长度 30–200 字符」 |
| `LEN_TOO_LONG` | `len(quote) > 200` | 同上 |
| `TOO_MANY_ANCHORS` | `len(anchors) > 3` | 上文「至少 1 条,最多 3 条」 |
| `NO_ANCHOR_NO_EXEMPTION` | `anchors` 为空或缺失,**且**不满足下方任一豁免 | 上文「至少 1 条」 |

`len()` 按 **JSON 解码后的 Python 字符数**计,不是转义后的字节数。
`\n` 计 1 字符,`\\sum` 计 5 字符。

**无锚点的两条豁免**(满足其一即不判 FAIL,但必须计入 stdout 的 `exempt` 计数):

1. **抽象层豁免** —— 同时具备非空 `layer` 与非空 `members`。适用 `L2:`…`Ln:` 节点。
2. **模型来源豁免** —— 同时具备 `origin` ∈ {`model`,`mixed`} 与非空 `origin_note`。
   `origin_note` 必须点名该 statement 的哪一句由模型产出(见节点 `origin` 一节)。

两条豁免都**不是**「可以没有依据」,只是「依据不是原文引文」。豁免节点必须在
stdout 里逐 id 列出,报告时不得省略。

**机器不判、只能人工判的**(校验器不得声称覆盖):
锚点是否**支撑**该节点的断言(盲区五型 A/B/C/D/E)、`origin` 标注是否诚实、
`members` 归属是否真实(那是 `check_layer.py` 的 `DANGLING_MEMBER`,不是本校验器的事)。
**`pass rate: 100.0%` 与「N/N 锚点已验证」永远不得作为正确性保证来汇报。**

**stdout 契约**:必须打印 `anchors FAILED`、`nodes with NO anchor`、
`nodes exempt`、`nodes FAILED (no anchor, no exemption)` 四行,
且**任一非零项必须使退出码为 1**。禁止出现「`pass rate: 100.0%` 同时退出码 0
但 stdout 里有非零缺陷计数」的组合——这正是本条要消灭的缺陷。
```

配套的实现要点（不入 SPEC 正文，供主控改 `tools/verify_anchors.py` 时对照）：

- `:44–47` 的 `continue` 分支改为：先测两条豁免，命中则计 `exempt` 并 `continue`；
  否则 `failures.append((nid, "-", "NO_ANCHOR_NO_EXEMPTION"))`。
- `:49` 之前加 `if len(anchors) > 3: failures.append(... "TOO_MANY_ANCHORS")`。
- `:56` 之后加长度分支；`:56` 本身**不改**（`quote in text` 已足够，且对含换行子串正确）。
- `:75` 的表达式**不必改**：把新缺陷全部塞进 `failures` 即可，退出码自然正确。
  这比在 `:75` 上叠 `or nodes_without_anchor` 更稳，因为豁免节点不该影响退出码。

## 三 替换或修改 SPEC.md 的哪几行

**本条不替换任何现有行，只在 `:57` 之后插入。** 这是有意的：P06 管的是「谁来判」，
不是「判什么」，判什么由 `:53`/`:54`（S1、P02 的地盘）与 `:55`（P05 的地盘）定。
插入式改动使 P06 与那三条互不冲突。

| 动作 | SPEC.md 行 | 旧 | 新 |
| --- | --- | --- | --- |
| 插入 | 在 `:57` 之后、`:58`（空行）与 `:59`（`## 节点 schema(JSONL,一行一个)`）之前 | 无 | §二 的整个 `### 机器校验的覆盖范围` 小节 |
| 改标题（可选但建议） | `:47` | `## 锚点规则(唯一硬校验)` | `## 锚点规则(唯一硬校验;机器覆盖范围见本节末)` |

`:47` 那处改动的理由：现标题里的「唯一硬校验」被反复误读成
「凡 `verify_anchors.py` 通过即合规」。交接 §3.6 已把这个误读列为必须写进每份简报的警告。
加半句指针比在别处重复警告便宜。**若主控嫌动标题噪声大，此项可略，不影响 §二 的效力。**

不建议改 `:53`：把「最多 3 条」的数值搬进新小节会造成两处记账。
新小节的表格只**引用** `:53`，不复述数值。（3 锚点上限该不该提高是另一个待议项，
数值若变，只需改 `:53` 一处，新小节表格自动跟随。）

## 四 回溯影响

### 4.1 六类 FAIL 各自的新增失败数（全部实数）

分母：546 个节点（522 = `data/nodes-*.jsonl` + `data/inherited/nodes-*.jsonl`，
加 24 = `data/structures-L2-*.jsonl`），921 条锚点。

| 新增判据 | 新增失败项 | 算法 |
| --- | --- | --- |
| `LEN_TOO_SHORT` (<30) | **0** | anchors.tsv 第 4 列 `charlen`：`awk -F'\t' 'NR>1&&$4<30'` → 0 行；独立重算 `len(json.loads(...)["anchors"][k]["quote"])` 也是 min=32 |
| `LEN_TOO_LONG` (>200) | **0** | 同上 `$4>200` → 0 行；max=198 |
| `TOO_MANY_ANCHORS` (>3) | **0** | nodes.tsv 第 6 列 `n_anchors` 分布：0→28、1→196、2→241、3→81，合计 546，无 >3 |
| 含换行（S1 若不采纳则也应判 FAIL） | **0** | anchors.tsv 第 5 列 `has_nl` 全 921 行为 `0` |
| `FILE_NOT_FOUND` | **0** | 921 条锚点的 `file` 全部命中 34 个 `.md` 之一 |
| `QUOTE_NOT_FOUND` | **0** | 921/921 逐字命中（与 check_graph 的 `916/916` 不冲突，那是边侧） |
| `NO_ANCHOR_NO_EXEMPTION`（**按本提案的豁免版**） | **0** | 28 个无锚节点，24 个满足抽象层豁免、4 个满足模型来源豁免，见 4.2 |
| `NO_ANCHOR`（**一律判失败的粗暴版**，本提案否决） | **28** | 同上，全部变成假失败 |

**合计：按本提案实施，今天新增失败项 = 0。** 这是本条最重要的一个数字：
它意味着补齐这六项检查是**纯防回归**，不产生任何待清理的存量债务，可以立即实施。
反过来说，也意味着这六项检查在**过去**从未拦住任何东西——现有 921 条锚点全部合规
不是校验器的功劳，是生产者手工遵守 SPEC 的结果。

### 4.2 28 个无锚点节点逐类落位（豁免依据实测）

| 类别 | 数量 | 文件 | 豁免字段实测 |
| --- | --- | --- | --- |
| L2 抽象层 | 24 | `structures-L2-a/b/c.jsonl` 各 8 | 24/24 同时具备非空 `layer`(=2) 与非空 `members`(6–16 个)，且 **24/24 连 `anchors` 键都没有**（不是空数组，是缺键——`node.get("anchors") or []` 两种都吃得下） |
| `d:` 模型来源 | 4 | `nodes-D2.jsonl:42/54/72/73` | 4/4 同时具备 `origin="model"` 与非空 `origin_note`，且 4/4 有 `anchors: []`（空数组） |

四个 `d:` 节点的 id 与 `origin_note` 首句：
- `:42` `d:exponential-independence-uses-no-inner-product` —— "A negative claim about the proof…Not stated by Apostol."
- `:54` `d:infinite-dimensional-operational-criterion-arbitrarily-large-independent-sets` —— "This positive criterion is not stated in 15.08…"
- `:72` `d:thm-15-7b-argument-adjoining-an-outside-element-breaks-the-count` —— "Apostol delegates the proof of 15.7(b) to Theorem 12.10…"
- `:73` `d:adjoining-an-element-outside-the-span-preserves-independence` —— "Not stated in 15.06 through 15.08…"

这 4 个节点在 exposure.tsv 里 **T1=T2=T3=池总数=0**（四条都是 0，`:72` 后代数 1 但后代也无锚）。
即：**它们在四层证据池里是彻底的零证据节点**，豁免救的是「不判 FAIL」，
不是「有依据」。这一点必须在裁决时看清——豁免只把它们从机器失败挪到人工待决。

### 4.3 从违规变合规的条目：0

现状没有任何条目被 `verify_anchors.py` 判过失败（全语料 EXIT=0），
所以「反之」这一方向的实数是 **0**。唯一的例外是操作性的：
主控今天若手工把 28 个无锚节点当违规看待，本提案把其中 28 个正式移入豁免，
即 **28 个条目从「口头上算违规」变成「SPEC 明文合规」**——但这是记账口径的变化，不是数据变化。

### 4.4 S1 若被采纳，本条要多加一项（附带实数）

S1 主张允许跨行、并新增「`quote` 在其 `file` 内只出现一次」。后者是新硬规则，
必须一并进机器覆盖表，否则又是一条零覆盖的 SPEC 文本。实测：

| 项 | 数 |
| --- | --- |
| 现有 921 条锚点，`file` 内出现次数 >1 | **0** → 新增失败 0 |
| 现有 921 条锚点，跨全部 34 个 `.md` 出现次数 >1 | **1** → 若唯一性写成「全语料唯一」则新增失败 **1** |
| 现有 931 条边 `evidence`，`file` 内出现次数 >1 | **2**（`edges-A2-s2.jsonl:41`、`edges-D4.jsonl:108`，同一条 44 字符 quote，在 `15.14.md` 出现 2 次） |

那唯一 1 条全语料非唯一的锚点：`d:exponential-weight-makes-improper-integral-converge`
的 56 字符 quote `(f, g) = \int_ {0} ^ {\infty} e ^ {- t} f (t) g (t) d t.`，
在 `15.10.md` 与 `15.12-exercises.md` 各出现 1 次，**在自己声明的 `15.10.md` 内唯一**。
→ **唯一性判据必须写成「在其 `file` 内唯一」，不能写成「全语料唯一」**，
否则凭空造出 1 个失败项，而该锚点毫无问题。S1 的条文正是「在其 `file` 内只出现一次」，
措辞正确；我只补上这个实数作为它的边界证据。

## 五 反例与边界情形

### 5.1 反例一（决定性的，否掉「无锚一律判失败」）

`data/structures-L2-a.jsonl` 全 8 行都无锚点。粗暴版判据下
`python tools/verify_anchors.py data/structures-L2-a.jsonl source` 会打印
`anchors total: 0` + `8 FAILED` + EXIT=1，而这 8 个节点**完全合规**——
`SPEC.md:56` 明文写着「抽象层节点(L2+)不要求原文锚点」。
一律判失败等于让校验器与 SPEC 直接对撞，且会把 24/28 = **85.7%** 的
「失败」变成噪声，实践上必然导致下一个人加 `--ignore` 绕过，检查就死了。

### 5.2 反例二（决定性的，否掉「豁免靠文件名或前缀」）

一个诱人的省事写法是「id 以 `L2:` 开头就豁免」。这被 `nodes-D2.jsonl:42/54/72/73` 否掉：
它们是 `d:` 前缀、在普通 nodes 文件里，却同样应豁免。
另一个方向：假想有人给一个 `L2:` 节点删掉 `members` 只留 `layer`，
按前缀豁免它照样过关，而 `check_layer.py:87–89` 的 `MISSING_FIELD` 才是唯一拦得住的地方。
**豁免必须绑字段，不能绑命名空间。**

### 5.3 边界一：`len()` 算在哪一侧

`d:orthonormal-basis-component-is-the-inner-product`（`15.11.md`）的锚点
`c _ {j} = (x, e _ {j}).\tag{15.9}` —— JSON 解码后 **33 字符**，
但 `.jsonl` 文件里写作 `c _ {j} = (x, e _ {j}).\\tag{15.9}`，**转义后 34 字符**。
若某个实现按文件里的原始串算长度，这条离 30 界还有余量、不会翻车，
但 `d:cauchy-schwarz-in-norm-form` 的 `| (x, y) | \leq \| x \| \| y \|.`
解码后 **32**、转义后 **35**：一旦地板从 30 提到 33，两种算法给出相反结论。
→ 条文里那句「按 JSON 解码后的 Python 字符数计」不是废话，是这条边界要求的。

### 5.4 边界二：紧贴界限的锚点，任何微调都会立刻产生失败

现有 921 条的分布：`[30,34]` 区间 **8 条**、`[35,39]` **24 条**、
`[180,189]` **8 条**、`[190,200]` **7 条**（max=198）。
`[30,34]` 那 8 条逐条列出（`file` | 解码后字符数）：

| 节点 | file | len |
| --- | --- | --- |
| `apostol:cx-an-identity-hides-a-dependence-among-transcendental-functions` ×3 | `15.09-exercises.md` | 34 / 34 / 34 |
| `d:cauchy-schwarz-in-norm-form` | `15.10.md` | 32 |
| `apostol:cauchy-schwarz-inequality` | `15.10.md` | 32 |
| `d:orthonormal-basis-component-is-the-inner-product` | `15.11.md` | 33 |
| `d:x-minus-t-splits-orthogonally` | `15.15.md` | 34 |
| `strang:full-row-rank` | `3.3.md` | 33 |

→ **地板每上调 1 字符，最多立刻产生 8 个失败项；上限每下调 1 字符，最多立刻产生 7 个。**
本提案不动这两个数值（30/200 照抄 `:54`），故新增 0。但这张表说明
「长度判失败」与「长度取值」必须由同一次决策一起定：先开检查再改数值，
会在两次提交之间制造一批瞬时失败。**建议主控把 P06 与 S1/P02 同批应用。**

### 5.5 边界三：`quote` 为空串

`:56` 是 `elif quote and quote in text`。`quote=""` 落到 `else`，
**已经**被判 FAIL（`quote[:90]` 打印为空）。这是现状里唯一「意外正确」的地方。
实测现有 921 条无空 `quote`、无空 `file`，故此项新增 0。
新条文的 `LEN_TOO_SHORT` 会把空串重复捕获一次，两条判据重叠但不冲突，
建议实现时让长度检查先跑、失败即 `continue`，避免同一条锚点报两次。

### 5.6 边界四：脚本自身的失败模式（不入 SPEC，但影响验收可信度）

实跑确认三种非零退出并不来自 `failures`：
`--source` 目录名打错（`sourcx`）→ 8 条 `FILE_NOT_FOUND`、EXIT=1（**正确失败**，
但注意它长得像数据缺陷，实际是命令行打错）；
节点文件路径不存在 → `FileNotFoundError` 栈回溯、EXIT=1；
不带参数 → `IndexError`、EXIT=1（`:21` 直接取 `sys.argv[1]`，无 argparse）。
**后两种是崩溃而非校验失败，验收时不能与真失败混为一谈。**
（另：该脚本无 argparse，按已知教训**不得对它用 `--help`**。）

## 六 与其它待议项的耦合

只列耦合与我的条文对它们的兼容方式，**不代它们裁定**。

- **P02（锚点长度界／是否改用唯一性判据）** —— 本条的 `LEN_TOO_SHORT`/`LEN_TOO_LONG`
  只引用 `:54` 的数值，不复述。P02 若把 30 改成别的数、或把长度界整体换成唯一性判据，
  只需改 `:54` 与实现里的两个常量，本条文字不动。
  但 P02 必须知道：**改数值的同一批提交里必须包含 P06 的检查**，否则新界又是零覆盖；
  且按 §5.4 的分布，任何上调都会立刻产生失败项（实数在 §5.4）。
  若 P02 采纳「唯一性」，本条的机器覆盖表需**新增一行** `QUOTE_NOT_UNIQUE`，
  判据必须是「在其 `file` 内」而非「全语料」（实数与理由在 §4.4）。
- **P05（`origin: model` 声明后是否允许无锚）** —— 本条的「模型来源豁免」直接建立在
  P05 的结论上，是单向依赖：
  P05 判**允许** → 本条第 2 条豁免生效，`NO_ANCHOR_NO_EXEMPTION` 新增 **0**；
  P05 判**不允许**（走 A3 的裁决乙，删 `:72/:73` 等）→ 本条第 2 条豁免整条删除，
  `NO_ANCHOR_NO_EXEMPTION` 新增失败数 = 届时仍存活的无锚 `d:` 节点数
  （今天是 4，删两个后是 2；若 P05 只放行「负面断言」类则是另一个数，**我不预测**）。
  两种情形下第 1 条（抽象层豁免）都不受影响，24 个 L2 恒豁免。
- **S1（锚点规则簇一：允许跨行 + 文件内唯一）** —— S1 表格写「`verify_anchors.py` 需改动 0」，
  就 `:56` 而言正确，但它**漏了新唯一性规则需要新增机器检查**。见 §1.3 与 §4.4。
  另：S1 若采纳跨行，本条的「含换行判 FAIL」候选项必须**不启用**（否则与 S1 对撞）；
  若 S1 被否，则应启用，新增失败 0（现有 921 条零换行）。
- **S2 项 3（节点是否可带 `origin`）** —— 本条豁免 2 用的字段名 `origin`/`origin_note`
  与取值集 {`model`,`mixed`} 直接取自 S2 项 3 的条文。S2 若把取值改名，本条同步改。
  S2 已实测「有 `origin_note` 无 `origin`」16 个节点——这 16 个若都有锚点则与本条无关，
  实测确认：4 个无锚 `d:` 节点两栏俱全，不在那 16 个的问题集里。
- **3 锚点上限是否提高** —— 本条新增 `TOO_MANY_ANCHORS`，判据引用 `:53` 的「最多 3 条」。
  上限若提高，本条不动（实测现状 max=3，任何提高都新增 0 失败）。
- **`check_layer.py` 的职责边界** —— L2 节点的 `members` 真实性由
  `check_layer.py:105–108` 的 `DANGLING_MEMBER` 管，本条明确不接管。
  但注意：**今天没有任何一条流水线会把 `structures-L2-*.jsonl` 喂给 `verify_anchors.py`**
  （已有报告里的调用全是 `data/nodes-*.jsonl` 单文件）。本条的抽象层豁免因此在
  当前实践下是**防御性的**，为的是有人把两类文件一起喂进去时不炸。

## 顺带发现

- `check_graph.py` 有同构缺陷：`:119` 只在 `origin=="source"` 时校验 evidence，15 条 `origin=model` 带 quote 的边永不校验（我实测这 15 条 quote 全部逐字存在、全部文件内唯一、全部 ≥30，但这是运气，不是校验）。
- `check_graph.py` 也不检查边 evidence 的长度：实测 3 条 <30（`edges-D1.jsonl:10/11/23`，`Closure axioms` 14 字符 ×2、`Axioms for addition` 19 字符），SPEC 从未对边 evidence 规定长度界，**这是 SPEC 的缺口而非违规**，但它与 G2b 报告的「D 型射程不足」是同一个成因。
- `check_layer.py:110` 的 `FEW_SECTIONS`（sections < 2）在 SPEC 里找不到对应条文，属校验器单方面加严。
- SPEC `:33` 的节点类型是 `concept/method/theorem/notation`，与本轮任务书给的 `concept/theorem/proof-step/example` 不一致；`check_graph.py:23` 跟的是 SPEC 那一组，实测 522 个节点 0 违规。任务书那一组疑为笔误，我不改任何东西。
- 24 个 L2 节点全部无 `node_type` 字段，`check_graph.py:79` 会对它们报 `[BAD_TYPE] ... None`——因此 L2 文件不能喂给 `check_graph.py`，这个约束今天也没写进 SPEC。
- 纯 padding 向外扩窗（只跨空行与 `$$` 行）能让 64 条短数学行里的 13 条自然达到 30 字符，其中含 `15.02.md:40/46`、`15.03.md:16`、`15.10.md:108`、`15.15.md:6/14` —— S1 的「向上扩窗到实质行」在这 13 条上其实不必动用实质行。
