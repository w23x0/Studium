# _frag-C2-04 装配条目（G3a / G3b / G3c，H 层）

已回查原文：G3a 全文、G3b §二+§三+jsonl、G3c §二+§三。标「未复核」者依据只在摘要或未读小节。

## 主体

### A. G3a-H1边逐条.md — data/edges-H1.jsonl（15 条）

改写 7 条（全文见 §三，主控整行替换）：

| 目标 | 改什么（照抄原文） | 判定 |
| --- | --- | --- |
| `data/edges-H1.jsonl:1` | origin `source`→`model`，删 evidence（Ex3 在 15.07.md:23、Ex4 在 :25，分行无源文并置） | 采纳 |
| `:4` | 换 evidence 为 15.06.md:29「If a space can be spanned by a finite set of elements, what is the smallest number of elements required?」（104 字符，双侧） | 采纳 |
| `:7` | `contrasts`→`requires` 并反向：src=`apostol:theorem-15-15-orthogonal-decomposition`、dst=`apostol:theorem-15-14-orthonormal-basis-exists`；换 ev 至 15.14.md:30（96 字符） | 采纳，本批唯一净增真实信息的边 |
| `:8` | 换 evidence 至 15.11.md:5（170 字符，含 dst 侧与辨析轴） | 采纳，并消解与 `d:15-10-nonzero-hypothesis-is-essential` 抢 15.11.md:7 的冲突 |
| `:9` | 换 evidence 至 15.14.md:36（151 字符，双侧） | 改后采纳，见 D1 冲突 |
| `:12` | 换 evidence 至 15.10.md:119「The next theorem gives fundamental properties of norms that do not depend on the choice of inner product.」（105 字符） | 采纳 |
| `:13` | origin `source`→`model`，删 evidence（Fourier 系数与有序基分量的跨节类比是模型所做） | 采纳 |

击杀 4 条（提案 §二，死因均含 6）：

| 目标 | 一句话依据 | 判定 |
| --- | --- | --- |
| `data/edges-H1.jsonl:6` | 15.13.md:83 明写 "as a corollary of Theorem 15.13"，且已有 `edges-A2-s1.jsonl:8` 的 `implies`，contrasts 冗余 | 采纳 |
| `:11` | 「归一化」（方法）与「y=O 检测相依」（判据）不同轴；引文是 dst 自身 statement 后半句，对 src 零支撑 | 采纳 |
| `:14` | 引文两句都在 src 自己的 statement 内，构成自指；dst 讲量词形式，引文一字未及（A 型对象错） | 采纳 |
| `:15` | 引文是 EXAMPLE 5（15.07.md:29，cos²+sin²−1=O 三项关系），src 却是 EXAMPLE 2 标量倍判据；两两互不成标量倍 | 采纳 |

记账 2 条（均采纳）：`:1`、`:13` 改后 origin=model 无 evidence → check_graph 的「已校验引文数」916→914，是记账下降而非质量下降；换引文 4 条的新引入源行仅 15.11.md:5、15.14.md:36、15.06.md:29 三行（`:12` 新旧同属 15.10.md:119），冗余度增益按新引入源行数记 **+3 行**，不是 +4 条证据。

### B. G3b-H2节点逐条.md — data/nodes-H2.jsonl（节点实际 11 个，撤回 0）

改写 8 行，整行替换第 1、4、5、6、7、9、10、11 行；第 2、3、8 行原样保留（`ext-theorem-12-10-part-b`、`-part-c`、`ext-vn-c-section-12-16`）。8 行 18 锚全部 json.loads 通过、逐字命中、charlen 落 30–200（逐行数组见提案 §三，装配时照抄）。逐行：

- 行 1 `apostol:ext-theorem-12-8`：statement 降调为 "writes no independent proof…only a transfer argument"，加中间枢纽锚，2→3。采纳。**装配硬约束**：第 2 条锚含教材 OCR 原样错字 "and nc on any other"，不得改成 `not`。
- 行 4 `ext-theorem-12-3`：补复情形那一步的锚，2→3。采纳。
- 行 5 `ext-theorem-12-2`：新增 15.10:11 公理声明句锚，把原挂 TD 边上的 S2 提到 T1，1→2。采纳，见 D2。
- 行 6 `ext-vn-as-a-prior-vector-space`：sections 删 15.07/15.10；S3 改「the ideas now being extended…namely in V_n」，S6 量词降为「Within the two sections anchored here」；加 15.03:3 读者验证锚；锚1 前扩含先行词。改后采纳，sections 见 D3。
- 行 7 `ext-chapter-12-finite-dependence-definition`：锚0 扩为 15.07.md:17 整行两句（107→173 字符），把 S4 从 TD 边提到 T1。采纳，见 D2。
- 行 9 `ext-volume-2-proof-of-the-legendre-closed-form`：新增 15.13:153 闭式锚，origin_note 补标「前向外包」。采纳。**装配硬约束**：该公式锚须从 15.13.md 直接读串再序列化，不得手打（手打时 `\frac` 会被吃成 `rac`；JSON 内 `\\frac` 为正确转义形态）。
- 行 10 `ext-uncited-dimension-of-a-second-order-de-solution-space`：sections 删 15.03，锚1 扩为两句（79→132）。改后采纳，sections 见 D3。
- 行 11 `ext-uncited-unit-coordinate-basis-of-vn`：statement 由「the only place where Chapter 15's abstract notion of dimension is tied to a concrete number」收窄为「the only place where Chapter 15 ties the dimension of V_n to a number」（死因 4，原句为假）。采纳；反例在 §一 节点 11，**未复核**。

### C. G3c-H2边逐条.md — data/edges-H2.jsonl（19 条）

改写 5 条（全文见 §三 jsonl 块，origin 全保 source）：

| 目标 | 改什么 | 判定 |
| --- | --- | --- |
| `data/edges-H2.jsonl:1` | rel `requires`→`generalizes`，ev 不变（charlen 56，命中 15.07.md:61） | 采纳；方向论据在 §一，**未复核** |
| `:7` | rel `requires`→`generalizes` + 换 ev「When we proved the corresponding result for vectors in $V_{n}$ (Theorem 12.3)」（112→77，命中 15.10.md:91） | 同上 |
| `:10` | rel 仍 `other`，只换 ev（116→87，命中 15.10.md:91），`rel_note` 原样保留 | 改后采纳；提案自评仅中等置信，主控须复核 |
| `:13` | ev 换为 15.07.md:17 整行两句（107→173），rel 仍 `generalizes` | 采纳 |
| `:14` | ev 换为同一整行（65→173） | 采纳 |

装配前置：`:1`、`:7` 改 generalizes 须核 SPEC.md:29「is-a 与 generalizes 互为反向，只写一条」；提案称 edges.tsv 全表无反向边，采纳。

击杀 4 条（均为边，不含节点）：

| 目标 | 依据 | 判定 |
| --- | --- | --- |
| `:3` | 与第 5 行同引文同 dst，第 5 行 src 是其 part-of 子节点且保住 (a)↔(b) 配对；证据经 T3 上浮不丢 | 采纳（死因 0，图质量判断） |
| `:4` | 同上，与第 6 行重复 | 采纳 |
| `:18` | 两端共用同一条 79 字符锚点，边自指（死因 5） | 采纳 |
| `:19` | 两端锚点逐字全同（101 字符），边内容为空 | 采纳 |

记账 2 条（均采纳）：撤后 edges-H2 剩 15 条、全图 1433→1429（5 条 FIX 原地改不影响计数）；这 4 条对证据池贡献净值为零（`ext-uncited-*` 两节点 T1/T2/T3 撤边后不变）。

### D. 跨提案冲突（装配前须主控裁决）

1. G3a `:9` 的新引文 15.14.md:36 同时适合 `data/edges-A2-s2.jsonl:46` 的 `part-of`；两条都用会再造过报通道 (c)。提案倾向留给 part-of、本边改 origin=model。**移出本轮自动装配，主控二选一**。
2. G3b 行 5 / 行 7 的新锚分别与 G3c `:10` / `:13`+`:14` 的新引文同源（15.10.md:91、15.07.md:17），同句将同时出现在节点锚点与边 evidence 上（人为制造的过报通道 c）。采纳，但冗余度按新引入源行数计（此二处为 0）。
3. G3b 行 6 / 行 10 删 sections 依赖「sections 须条条有锚」的口径；若口径是「被提及即可」，则改回原值并改用补锚方案。**本轮不自动应用这两处 sections 删除。**

## 落选项

| 来源 | 内容 | 落选理由 |
| --- | --- | --- |
| G3a | `:6` 的最小修法（保边、origin→model 删 evidence） | 提案自评不推荐：与已有 `implies` 并存使 rel 语义更含混，取撤回 |
| G3a | `:1` 备选「相邻编号例子也算源文并置，保留原行」 | 与 origin 尺子 SPEC.md:73 冲突，取 origin→model |
| G3a | `:13` 退用 15.15.md:39「The numbers $(f, \varphi_k)$ are called Fourier coefficients of $f$ .」（69 字符）作 model 边定位引文 | 仍是单侧且会塞进 `tmp_index/unverified-model-quotes.tsv` 那类从不被 check_graph 校验的边 |
| G3a | 新增 `apostol:dependence-inherited-by-supersets requires d:independence-universal-quantifier-over-choices`（model） | 新增边，超出「保留/修/撤回」范围，移出本轮 |
| G3a | E14 的 `equivalent` 形态 | 另一端「独立集的每个子集独立」在 nodes.tsv 里无节点，建不出 |
| G3a | E15 改为 `is-a`/`implies` 指向 `apostol:dependent-set` | 本轮不新增边 |
| G3a | 抽查 H1 之外 48 条 origin=source 的 `contrasts` | 超出本片范围 |
| G3a | E2、E10 因「contrasts 需双侧证据」而改 | 受 SPEC「不跨行」限制取不到双侧引文，属 SPEC 议题，不逐条改 |
| G3a | SPEC.md:29 节点类型词表（concept/method/theorem/notation）与任务书不一致 | 非 data/ 改动条目，转 SPEC 议题 |
| G3b | KILL `ext-vn-as-a-prior-vector-space`（origin_note 自陈可判 KILL） | 判与 `apostol:v-n-space` 不重合：后者记 15.03 例3 内容，前者记章外来源身份 + 第15章未做构造与公理验证 |
| G3b | 因层归属（前向外包置于 H-back 文件）撤 `ext-volume-2-proof-of-the-legendre-closed-form` | H2 承担第15章全部章外依赖，方向只是其中一维；改 origin_note 标方向即可 |

本片未覆盖：G3b §一 的 11 节点逐条论证（E 型 7 / D 型 4 / B 型 6 处的候选锚句）与 G3c §一 的 19 条边逐条论证，仅采其 §二/§三 的落地结论；G3c §四 依赖表、三份「顺带发现」除已列项外未转条目。
