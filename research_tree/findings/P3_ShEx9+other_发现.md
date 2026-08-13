# 原型 P3 实测发现

> 任务卡：P3 原型实测——ShEx valueSet '~' 表达 9+other 词表封闭的校验语义
> 实测日期：2026-08-13
> 环境：node v25.6.1 + shex meta 1.0.0-alpha.29（@shexjs/parser 1.0.0-alpha.28、@shexjs/validator 1.0.0-alpha.29、n3 1.26.0）；venv tmp/venv_b7a（pyshacl 0.40.1、rdflib 7.6.0）
> 数据词表：`docs/图工程调研/M08实验-第15章分层图谱/data/edges-*.jsonl` 的 rel 字段 = 9 固定关系（alias-of, applies-to, contrasts, equivalent, generalizes, implies, is-a, part-of, requires）+ 兜底值 other（35 条边）

## 0. 一句话结论

**B5b 中"A 级：`[ ex:t1 ... ex:t9 ~ ]` 可语法直接表达『9 固定值 + other』"的写法被实测证伪**：shex.js（与规范语法一致）把末尾 `~` 与前一个值粘成 IriStem（前缀匹配），`[ v1 ... v9 ~ ]` 实际是"8 个显式值 + 一个 IriStem(v9)"，other/任意值会被拒绝，根本表达不了"9 + other"；"9 固定 + other(具体兜底值)"的正确写法是闭合 10 列表 `[ v1 ... v9 rel:other ]`（实测通过），其字符长度（132）与 SHACL `sh:in`（138）几乎持平，ShEx '~' 并非"9+other 的最短语法路径"。

## 1. 问题逐条回答

### Q1：valueSet 含 '~' 的 shape，对『9 固定值 + other』的接受/拒绝语义是否符合规范？

**实测结论：不符合"9 固定 + 通配"的预期；但该语法本就不该那样写。** 具体数字（shex.js，4 个 valueSet × 12 个值 = 48 次校验）：

| 写法 | 解析结果 | 9 固定值 | other | 任意IRI | 字面量 |
|---|---|---|---|---|---|
| T1 `[9 ~]`（B5b 原文） | 8 个显式 IRI + **1 个 IriStem(requires~)** | 9/9 ACCEPT* | REJECT | REJECT | REJECT |
| T2 `[9]`（闭合 9） | 9 个显式 IRI | 9/9 ACCEPT | REJECT | REJECT | REJECT |
| T3 `[9 rel:other]`（闭合 10） | 10 个显式 IRI | 9/9 ACCEPT | **ACCEPT** | REJECT | REJECT |
| T4 `[ . - 9 ]`（通配排除 9） | 1 个 IriStemRange(Wildcard) | 0/9 ACCEPT | ACCEPT | ACCEPT | REJECT |

\* T1 的 9 个固定值全过是"假象"：前 8 个是显式包含，第 9 个 requires 是因为 IriStem(requires~) 的前缀匹配命中自己（`http://s.example/rel/requires` 以自身为前缀）。一旦换一个不在前缀下的值，立即 REJECT。

证据（真实 stdout，`_sources/P3/run_output.txt`）：
- T1 解析为：`[ "…/alias-of" … "…/part-of", {"type":"IriStem","stem":"http://s.example/rel/requires"} ]`——末尾 `~` 粘在 requires 上。
- 语法探针：`[~]` → PARSE ERROR；`[ . ]` → PARSE ERROR；`[~ - rel:part-of]` → PARSE ERROR；`[ . - rel:part-of]` → PARSE OK。

**判定**：规范语法 `valueSetValue = objectValue | IriStem | IriStemRange | …`，`IriStem = (IRIREF|PrefixedName) '~'`，"n 是 IRI 且 starts-with(n, st)"——shex.js 的粘合行为**符合规范语法**，B5b 的示例是把规范语义写错了。"9 固定值 + other（具体兜底值）"的正确表达是 T3 的闭合 10 列表；"9 + 任意 other"在 valueSet 里不可表达（裸通配不能解析），见第 4 节。

### Q2：CLOSED/EXTRA 与 valueSet '~' 并置时，谓词封闭语义是否正确？

**实测结论：CLOSED 正确；EXTRA 的正确语义与 B5b 隐含理解不同——EXTRA 不放行外来谓词。** 16 次校验全部符合规范预期（16/16，0 不符）。

| 场景 | CLOSED | CLOSED+EXTRA rel:extra(外来) | CLOSED+'~'valueSet 并置 |
|---|---|---|---|
| 仅 9 固定谓词 | ACCEPT | ACCEPT | ACCEPT |
| 9 固定谓词 + 外来谓词 rel:extra | REJECT（ClosedShapeViolation） | **REJECT**（EXTRA 不放行外来谓词） | REJECT |
| 9 固定谓词 + rel:unlisted | REJECT | REJECT | REJECT |
| EXTRA 正例：rel:extra 在表达式内且超出基数（2 条） | REJECT | REJECT | REJECT；含 `rel:extra [rel:extra]` 的 shape → **ACCEPT** |

**规范依据**（shex.io/shex-semantics §5.5.2 matchesShape）："matchables = triples whose predicate appears in a TripleConstraint in expression"、"unmatchables = triples in outs which are not in matchables"；约束条件为"no triple in matchables whose predicate does not appear in extra"和"closed is false or unmatchables is empty"。因此 EXTRA 只豁免**已在表达式里的谓词**的未消费三元组（超基数副本），**不放行不在表达式里的外来谓词**。B5b 第 39 行把"other 放 EXTRA 即可允许额外谓词"当作组合用法（C 级）——实测该理解不成立：外来谓词即 unmatchables，CLOSED 下必拒。

另：`CLOSED` 与 `[9 ~]` 并置可正常解析、CLOSED 的谓词封闭照常生效（valueSet 只管值、CLOSED 只管谓词，正交）。rdf:type 特例两侧对称：ShEx CLOSED 与 SHACL sh:closed 都会把 rdf:type 当未列谓词拒绝（实测均 nonconformant），SHACL 需 `sh:ignoredProperties ( rdf:type )`，ShEx 需在 shape 里声明 `rdf:type` 或 a。

### Q3：与 pySHACL sh:in/sh:or 对照，ShEx '~' 是否是 9+other 的最短语法路径？

**实测结论：不是。** 语义对照（pyshacl 0.40.1，逐节点实测）：

| 约束 | fixed | other | 任意IRI | 字面量 |
|---|---|---|---|---|
| ShEx T3 `[9 rel:other]`（闭合10） | ACCEPT | ACCEPT | REJECT | REJECT |
| SHACL S1 `sh:in (9 rel:other)`（闭合10） | ACCEPT | ACCEPT | REJECT | REJECT |
| SHACL S2 `sh:or ([sh:in 9] [sh:nodeKind sh:IRI])` | ACCEPT | ACCEPT | ACCEPT | REJECT |

语法长度（实测字符数）：
- ShEx 闭合 10 列表：**132** 字符
- SHACL `sh:in` 闭合 10：**138** 字符
- ShEx `[9 ~]`（B5b 原文，实测不可用）：124 字符（不可用，不构成"路径"）
- SHACL `sh:or(sh:in9 + nodeKind IRI)`（9+任意）：**165** 字符

即：对"9 + other(具体值)"，ShEx 132 vs SHACL 138，几乎持平，ShEx 无实质最短优势；对"9 + 任意 other"，ShEx 根本没有 valueSet 写法（裸通配无法解析，`[ . - excl]` 是补集），而"任意 other"本身已蕴含 9 个固定值，两语言的最短表达都是"任意 IRI"（ShEx 一个 token `IRI`；SHACL `sh:nodeKind sh:IRI`），枚举 9 个固定值没有意义。

## 2. 实测方法与脚本说明

- 数据：从 `docs/图工程调研/M08实验-第15章分层图谱/data/edges-*.jsonl` 全量提取 rel 词表（脚本提取，实测 10 个值：9 固定 + other，其中 other 35 条边），据此构造"9 固定 + other"测试。
- `_sources/P3/p3_shex_valueset.js`（shex.js 部分）：`@shexjs/parser` 解析 shape（打印 valueSet 解析 AST）、`@shexjs/validator` + `@shexjs/neighborhood-rdfjs` + n3 建内存图，对每个 (valueSet 写法 × 测试值) 构造节点校验，输出 ACCEPT/REJECT 与违规类型；Q2 用 CLOSED/EXTRA/闭合10/'~' 四类 shape × 4 类节点。
- `_sources/P3/p3_shacl_compare.py`（pySHACL 部分）：rdflib 建 Turtle 数据图（5 个 `a s:Edge` 节点），pyshacl `validate()` 逐节点输出 conforms，并打印语法长度对照。
- 运行方式与复现命令见第 7 节；真实 stdout 见 `_sources/P3/run_output.txt`。

## 3. 实测数据（全部来自真实 stdout）

- shex.js：Q1 共 48 次校验，30 ACCEPT / 18 REJECT（按 4 种 valueSet × 12 值；T1/T2 各 9 过 3 拒、T3 10 过 2 拒、T4 2 过 10 拒）；Q2 共 16 次校验，16/16 与规范预期一致。单次运行总耗时 **127.4 ms**（console.time，node 内联内存图，非性能基准）。
- pySHACL：S1 整体 1.8ms、S2 整体 2.2ms（均含逐节点 5 次校验：fixed/other ACCEPT、字面量 REJECT 等）；S3 谓词封闭 0.7ms（仅 9 谓词，conforms=True）与 0.8ms（+额外谓词，conforms=False）。注：均毫秒级计时，复跑存在 ±0.1–0.5ms 抖动。
- 违规类型（shex.js 输出）：值不符 → `TypeMismatch` + `MissingProperty`；CLOSED 拒绝外来谓词 → `ClosedShapeViolation`；缺强制约束 → `MissingProperty`。
- 语法长度：132 / 138 / 124 / 165 字符（见 Q3 表）。

## 4. 与规范声明的对照

| 规范说 | 实测 |
|---|---|
| valueSet "by explicit inclusion or by range (indicated by '~')"，`IriStem = IRI~`，匹配 `starts-with(n, st)` | shex.js 一致：`[ v1 ... v9 ~ ]` 解析为 8 显式 + IriStem(v9~)，非"9+通配"。B5b 示例写法不成立 |
| 通配 stem（IriStemRange 的 Wildcard）匹配**所有 RDF 词项**（规范 §5.4.6 末条 + Example 3：整数 123 通过 `[ . - … ]`） | **shex.js 偏离**：`testValueSetValue` 的 IriStemRange 分支先 `if (value.termType !== "NamedNode") return false`，字面量被拒（实测 T4 字面量 REJECT）。代码证据：`node_modules/@shexjs/validator/src/shex-validator.ts` |
| 裸通配可作为 valueSetValue 的 stem | 语法上通配只作为 stem 出现；shex.js 实测 `[~]`、`[ . ]`、`[~ - rel:x]` 全 PARSE ERROR（`.` 后必须有 ≥1 exclusion），`[ . - rel:x]` OK |
| EXTRA 只豁免 matchables（在表达式中的谓词）的未消费三元组，不放行 unmatchables | shex.js 一致：`CLOSED EXTRA rel:extra` 对**外来** rel:extra 仍 REJECT（ClosedShapeViolation）；对表达式内的 rel:extra 超基数副本 ACCEPT |
| CLOSED 要求 unmatchables 为空 | 一致：9 固定谓词 ACCEPT，任何未列谓词 REJECT |
| sh:in 是封闭列表 | 一致：pyshacl S1 实测 9+other 通过、任意/字面量拒绝，与 ShEx T3 行为一致 |

## 5. 未决与风险

- **shex.js 版本为 1.0.0-alpha.29（2020 年代码），非发布版**：通配不匹配字面量、`[~]`/`[ . ]` 解析失败可能与版本有关；更早/更晚版本需另行验证。核心结论（`[9 ~]` 粘合、EXTRA 不放行外来谓词）在规范层面成立，不受此影响。
- B5b 的"9+other 官方示例未见规范，标 C"判断正确；但 B5b 同时把"`[ ex:t1 ... ex:t9 ~ ]` 语法直接表达 9+other"标为 **A 级语法事实**——本次实测证明该 A 级判定错误，应降级（见第 6 节）。
- 字面量边界仅在补集 valueSet 上测到；对"9+other(IRI 词表)"无影响，但若未来词表含字面量，shex.js 通配需另行评估。
- 内存/大图未测（任务范围外）；耗时数字仅为本原型量级参考。

## 6. 建议的下一步

- **回改 B5b**：`[ ex:t1 ... ex:t9 ~ ]` 表达"9 固定 + other"由 A 级降为**证伪（D 级）**，附本实测出处；"9 固定 + other(具体兜底值)"的正确写法改为闭合列表 `[ v1 ... v9 rel:other ]`，与 SHACL `sh:in` 长度对等（132 vs 138）。
- **若 B5b/图工程决策要用"9 固定谓词 + 允许外来谓词"**：ShEx 侧必须**去掉 CLOSED**（开放 shape），或用 `EXTRA` 只豁免表达式内谓词——不能把 EXTRA 当谓词白名单；SHACL 侧用 `sh:closed + sh:ignoredProperties` 白名单。两侧都要显式处理 rdf:type。
- 将本实测结论回填到研究树 audit 与 master_db 合并登记（R2 之后的增量）。
- 可选：对 `~` 通配的字面量行为开一个 shex.js issue 或加回归测试。

## 7. 复现命令

```
cd C:/Users/Wang/Desktop/Studium/research_tree/_sources/P3 && npm install shex && node p3_shex_valueset.js > run_output.txt 2>&1 && C:/Users/Wang/Desktop/Studium/tmp/venv_b7a/Scripts/python.exe p3_shacl_compare.py >> run_output.txt 2>&1
```

（解释器：node v25.6.1 + venv tmp/venv_b7a python 3.14.3；脚本：p3_shex_valueset.js、p3_shacl_compare.py；依赖：npm install shex、pyshacl 0.40.1/rdflib 7.6.0 已在 venv。）

## 8. 判死自查

- **不伪造实测数字**：通过。所有数字（48/30/18、16/16、127.4ms、132/138/165 字符、各违规类型）均来自 `_sources/P3/run_output.txt` 的真实 stdout；测不出的语法（`[~]`/`[ . ]`）如实记为 PARSE ERROR，未用估计值。
- **环境依赖**：通过。shex 经 `npm install shex` 装成（记录版本）；pyshacl 用现成 venv（0.40.1）；两套工具都可用，未出现"装不上"。
- **范围边界**：通过。只验语义，未做性能基准；对比的是语法长度而非运行性能。
- **复现命令**：写入第 7 节（含解释器路径与依赖）。
- 自评：Q1 的"9 固定值全过"在 T1 中曾被误读为通过，已用解析 AST 证明是"8 显式 + 1 前缀 stem"的假象，非伪造；Q2 首轮 1 处预期错误已对照规范 §5.5.2 修正为 shex.js 正确，非工具 bug 隐瞒。
