# 原型 P2 实测发现

- 任务 ID：P2
- 主题：原型实测——pySHACL 在 522 节点/921 锚点规模的校验耗时
- 调研员：原型验证员（P2）
- 日期：2026-08-13
- 环境：venv `tmp/venv_b7a/Scripts/python.exe`（pyshacl 0.40.1、rdflib 7.6.0）；Windows 11
- 数据：`docs/图工程调研/M08实验-第15章分层图谱/data/`（主层 nodes-*/edges-* + inherited 层）
- 证据存档：`research_tree/_sources/P2/run_output.txt`（一次完整运行的真实 stdout）
- 脚本：`research_tree/_sources/P2/`（P2_common.py / P2_shapes.ttl / P2_validate.py / P2_build_rdf.py / README.md）

---

## 0. 一句话结论

pyshacl 0.40.1 在 522 节点/1433 边/921 锚点的简化 RDF 图上完整跑封闭词表+锚点引用存在性校验 **可行**，实测 8.48 s、峰值工作集约 81 MB、呈近线性扩展（约 17 ms/节点）；但它对现有 `check_graph.py` 的 JSONL+脚本全表校验（0.079 s）构成 **约 108 倍的性能门槛**——不阻断一次性审计，却让"标准层 SHACL 校验"在该量级变成秒级任务；退出码可接入但 **exit=1 语义含混**（不合规与 shapes/数据解析失败同码），且空 shapes 文件会静默全通过，接入时必须以库方式调用 `validate()` 并加防护。

---

## 1. 问题逐条回答（每问：实测结论 + 具体数字 + 证据）

### Q1. 把第15章 522 节点/1433 边转成 RDF，写一组 SHACL shapes，用 pyshacl 0.40.1 跑，实测耗时与内存量级？

**结论：可行；耗时秒级（8.48 s 单次完整校验），内存数十 MB 级（峰值工作集 81 MB）。**

- RDF 图（从简建模：节点=subject、锚点 quote=字面量、关系边=predicate）：**522 节点 / 921 锚点 quote / 1433 边 / 931 条边 evidence quote / 共 6402 三元组**，Turtle 序列化 600,457 字节；构建仅 **0.0525 s**（rdflib）。计数与任务卡"522/921"完全吻合（= 主层 397/648 + inherited 层 125/273）。
- 全量校验（无 tracemalloc 的干净计时，`run_output.txt` [A]）：
  - `conforms=False`，`validate_sec=8.4812`
  - 结果 **205 条违规，全部来自锚点引用存在性 SPARQL 约束**（`{'SPARQLConstraintComponent': 205}`）；封闭词表与边端点存在性在干净数据上 0 违规。
  - 进程工作集：校验前 57,724 KB → 校验后 83,404 KB，**增量约 25,680 KB（≈25 MB）**，进程峰值 83,404 KB（≈81 MB）。
  - 单次 tracemalloc 通道测 Python 堆峰值 **22,572,155 B（≈21.5 MB）**（该次计时 41.78 s，被 tracer 放大约 5 倍，仅作内存量级参考）。
- 205 条违规与手工核验**完全一致**：distinct 违规 src 节点 205 个、未匹配 evidence quote 362/931（38.9%）。这说明约束确实命中真实数据、语义正确（详见 §4）。

### Q2. 该量级下 pyshacl 是否构成对『JSONL+脚本全表校验』的性能门槛？

**结论：构成。约 108 倍门槛；不阻断一次性审计，但"全表一遍"从毫秒级变成秒级。**

- 现有 `docs/图工程调研/M08实验-第15章分层图谱/tools/check_graph.py`（JSONL+脚本，校验 id 唯一、端点可解析、evidence 逐字对源文本、rel/node_type 词表、自环/重复边）在**同一份数据（522 节点/1433 边）**上跑 3 次：`0.0789 / 0.0797 / 0.0756 s`，`problems=0`，`edge evidence: 916/916 verified`（`run_output.txt` 前的基线实测）。
- 比值：`8.4812 / 0.0781 ≈ 108.6×`。pyshacl 的 CLI 端到端耗时 **9.32 s**（含 Python 启动+图解析），对比脚本 0.079 s。
- 量级探针（单工具自比，非跨工具基准，`run_output.txt` [C]）呈**近线性**：100→1.70 s、200→3.45 s、300→5.26 s、400→7.17 s、522→9.15 s（约 **16–17 ms/节点**，且每次都有固定底座开销）。外推：1 万节点 ≈ 3 分钟级。
- 注意对照口径：check_graph.py 校验的是"evidence 引文存在于源 .md 文本"，pyshacl 侧校验的是"封闭词表 + 图内引用完整性"，校验集并不完全同构；上述对比是"对同一份数据做一遍完整完整性检查的墙钟量级"，不是同一算法在两种引擎上的等价实现。

### Q3. pyshacl 的退出码/违规报告是否适合接入现有 check_graph.py 校验流程？

**结论：退出码可作粗粒度开关，但不建议直接用它做流程门禁；违规报告（results graph）可机器解析，但需按正确方式取结果节点；退出码语义有 3 处坑。**

实测 CLI 退出码（pyshacl 0.40.1，`run_output.txt` [D]，并对照 `cli.py` 源码 340–418 行）：
- 不合规模：`exit=1`；合规模（空数据图）：`exit=0`。
- **坑 1（语义含混）**：shapes 文件语法错误（`rdflib...BadSyntax`）时进程**同样 exit=1** 并抛未捕获异常堆栈——即"数据不合规"与"shapes/数据解析失败"同码，无法仅凭退出码区分。
- **坑 2（静默假通过）**：合法但**空的 shapes 图**（只有 `@prefix` 声明）→ 无任何约束 → `exit=0` 全通过。若接入流程时 shapes 文件被意外清空，会静默放行全部违规。
- **坑 3（错误码范围窄）**：`exit=2` 只覆盖 pyshacl 自己的错误类（ShapeLoadError/ConstraintLoadError/ReportableRuntimeError/RuntimeError），`exit=3` 为 NotImplementedError；通用语法错误落在 exit=1。
- 违规报告可机器解析：报告图（results graph）的每个 `sh:result` 对象带 focusNode / resultPath / sourceConstraintComponent / message。**实测踩坑**：`report.subjects(sh:result, ...)` 返回的是报告根节点（聚合 205 个 sh:result 三元组）而非结果节点，必须用 `report.objects(sh:result)` 取结果节点（`P2_validate.py` 已修正并验证）。
- 报告文本的次要怪癖：NodeShape 级 `sh:message`（"节点带有封闭词表之外的谓词"）会一并出现在每条 SPARQL 约束违规的 message 里（`run_output.txt` [A] report head），下游按 message 分类会受污染。
- 接入建议：以**库方式**调用 `pyshacl.validate()` 取 `(conforms, report_graph, report_text)`，不用 CLI 子进程；加"shapes 非空且可解析"守卫；把退出码/解析失败当作显式错误处理。

---

## 2. 实测方法与脚本说明（脚本路径、怎么跑）

- 共享建模模块 `C:/Users/Wang/Desktop/Studium/research_tree/_sources/P2/P2_common.py`：
  节点 id → IRI `<urn:studium:node:<id>>` 且 `a ex:Node`；`node_type` → `ex:nodeType` 字面量；`name_en/name_zh/statement/section/origin/origin_note` → 字面量属性；锚点 quote → `ex:anchorQuote`（一个 anchor 一条）；关系边 → `src <urn:studium:rel:<rel>> dst`（10 个 rel 谓词）；边的 evidence quote → src 上的 `ex:edgeEvidence`。读主层 `nodes-*.jsonl/edges-*.jsonl` + `inherited/*.jsonl`。
- SHACL shapes `P2_shapes.ttl`（`ex:NodeShape`，targetClass ex:Node）：
  - **封闭词表**：`sh:closed true` + `sh:ignoredProperties (rdf:type)` + 枚举 10 个 rel 谓词与节点元属性（每个 `sh:maxCount 1`）；`sh:in ("concept" "theorem" "method" "notation")` 值封闭。
  - **锚点引用存在性**（SHACL-SPARQL）：`SELECT $this WHERE { $this ex:edgeEvidence ?q . FILTER NOT EXISTS { $this ex:anchorQuote ?q } }`。
  - **边端点存在性**（SHACL-SPARQL）：10 个 rel 谓词任一目标 `FILTER NOT EXISTS { ?dst a ex:Node }`。
  - 注意：rel 谓词统一用 `urn:studium:rel:<rel>`（冒号），shapes 内用 `@prefix rel: <urn:studium:rel:>`；初版曾写成 `ex:rel_is-a`（下划线）导致封闭词表误报 1638 条，已修正为 205 条。
- 实验主脚本 `P2_validate.py`（[A] 构建+全量校验 [B] 负对照 [C] 量级探针 [D] CLI 退出码）；`P2_build_rdf.py` 只构建图写 `graph.ttl`。
- 内存测量：Windows `GetProcessMemoryInfo`（ctypes，**必须显式声明 argtypes**，否则返回 0）；Python 堆峰值用 `tracemalloc` 单独通道。计时用 `time.perf_counter()`，干净通道不带 tracemalloc（tracer 会把 8.5 s 放大到 ~42 s）。
- 跑法：见 §7 复现命令；完整 stdout 存档于 `run_output.txt`。

---

## 3. 实测数据（通过率/耗时/内存/违规数，全部来自真实 stdout）

以下全部摘自 `research_tree/_sources/P2/run_output.txt`（及文首注明的基线实测）：

| 项目 | 实测值 | 出处 |
|---|---|---|
| 图规模 | 522 节点 / 921 锚点 / 1433 边 / 931 evidence / 6402 三元组 | [A] |
| RDF 构建耗时 | 0.0525 s；graph.ttl 600,457 B | [A] |
| 全量 validate 耗时（干净） | **8.4812 s**；conforms=False；**205 违规**（全 SPARQLConstraintComponent） | [A] |
| 进程工作集 | 57,724 → 83,404 KB（增量 25,680 KB）；峰值 83,404 KB（≈81 MB） | [A] |
| Python 堆峰值（tracemalloc 通道） | 22,572,155 B（≈21.5 MB）；该次计时 41.78 s（被放大） | [A] |
| 负对照（注入 1 个词表外谓词） | 205 → 206 违规；`ClosedConstraintComponent: 1`（封闭词表有牙齿） | [B] |
| 量级探针 | 100:1.70 s(43) / 200:3.45 s(85) / 300:5.26 s(112) / 400:7.17 s(158) / 522:9.15 s(205) | [C] |
| 手工核验违规数 | 205 个违规 src 节点；362/931 evidence quote 未命中 src 锚点（38.9%） | 文首预检 |
| 手工核验（B 解释：evidence 命中任一节点同文件锚点） | 734/931 = 78.8% | 文首预检 |
| CLI 不合规 | exit=1，端到端 9.3203 s | [D] |
| CLI 合规（空数据） | exit=0 | [D] |
| CLI 空 shapes（仅 prefix） | exit=0（静默全通过） | [D] |
| CLI 非法 shapes（语法错） | exit=1 + 未捕获 rdflib.BadSyntax 堆栈 | [D] |
| 基线 check_graph.py（JSONL+脚本） | 0.0789 / 0.0797 / 0.0756 s（exit=0，problems=0，916/916 evidence） | 文首基线 |

---

## 4. 与规范声明的对照（规范说 X，实测 Y）

- **B5b K2/K1（SHACL `sh:closed`/`sh:ignoredProperties` 表达谓词封闭、`sh:in` 是封闭值列表）**：实测证实。负对照注入 `ex:bogusField` → 恰好 +1 条 `ClosedConstraintComponent` 违规（`run_output.txt` [B]）；`nodeType` 用 4 值 `sh:in` 且未出现闭合外值违规。
- **B5b K3（引用完整类检查的官方扩展点是 SHACL-SPARQL）**：实测证实。锚点引用存在性与边端点存在性均以 `SPARQLConstraintComponent` 运行；锚点约束在真实数据上抓到 **205 条**，与手工逐条核验**逐字节吻合**（205 节点 / 362 条未匹配 quote）。
- **B5b K4（SHACL 递归语义未定义）**：本原型刻意回避递归（边端点存在性用 SPARQL 而非 `sh:node` 自引用），未直接暴露；留作风险（§5）。
- **pyshacl README 声称的 CLI 退出码（0=合规、1=不合规、2=错误）**：实测部分符合——0/1 成立；但"2=错误"仅覆盖 pyshacl 自身错误类，**shapes 语法错误（rdflib.BadSyntax）走未捕获异常 → exit=1**，与"不合规"同码。文档声明与实测存在偏差。
- **任务卡规模声明（522 节点/921 锚点）**：实测计数与声明完全一致（522/921，含 inherited 层；不含 graveyard 已判 KILL 的 28 节点/68 边）。

---

## 5. 未决与风险

1. **锚点引用存在性的建模语义与真实数据不匹配**：简化模型"边的 evidence quote 必须 ∈ 该 src 节点锚点"在真实数据上仅命中 61.1%（B 解释"命中任一节点同文件锚点"为 78.8%）。这不说明工具错，而说明**这套数据里 edge evidence 本就不是节点锚点的子集**——若直接把这套 SHACL 接到现有图，会带出 205 条需裁决的"违规"；要么改数据侧（让 evidence 进锚点），要么改形状语义（对齐 check_graph.py 的"evidence 对源文本逐字校验"）。
2. **计时为单次样本、无重复取中位数**：8.48 s（最终脚本干净通道）与早期冒烟测试 10.5–10.7 s 存在约 ±20% 波动（机器负载/首跑缓存），结论按"秒级量级"表述，不按精确值。
3. **tracemalloc 把校验放大约 5 倍**（41.78 s vs 8.48 s）：内存数字可信（21.5 MB），计时不可信；报告已明确标注，只作内存量级参考。
4. **退出码歧义 + 空 shapes 静默假通过**：exit=1 分不清"不合规"与"解析失败"；空 shapes 图 exit=0。这是接入流程的硬伤，必须加显式守卫。
5. **未覆盖的 SHACL 面**：未测递归形状（B5b K4）、SHACL-AF/规则、多 shape 目标、`abort_on_first=True`（可显著提速）、增量/分片校验。量级探针每档也只跑一次。
6. **内存归属**：峰值工作集 81 MB 含 RDF 构建；归因到校验阶段的可靠数字是增量 25.7 MB 与 tracemalloc 的 21.5 MB。
7. **Windows 特定**：RSS 用 ctypes 直调 `GetProcessMemoryInfo`，必须显式设 argtypes（已修，见脚本注释），跨平台不可移植。

---

## 6. 建议的下一步

1. **若目标只是"该数据规模的图完整性检查"**：JSONL+脚本（0.079 s）已经覆盖且快 108 倍，无需为它引入 SHACL。pyshacl 只在需要"机器可读的标准合规层/开放世界向封闭世界迁移"时才值得付出秒级成本。
2. **若决定接入 SHACL 层**：以库方式调用 `pyshacl.validate()` 取 `(conforms, report_graph)`；对 shapes 文件做"非空 + 可解析"守卫；把 `sh:result` 对象（不是 root 的 `sh:result` 三元组）作为违规枚举入口；不依赖 CLI 退出码做门禁。
3. **先裁决锚点引用存在性的语义**：在"evidence 必须 ∈ 节点锚点"与"evidence 必须 ∈ 源文本"之间二选一并写入 SPEC，再决定 shapes 由谁承担该检查。当前真实数据用前者会带 205 条真违规。
4. **规模外推前先测"引擎侧优化"**：522 节点已近线性 17 ms/节点，若未来到 1 万节点级（≈3 分钟），先试 `abort_on_first`、按章节分片、或仅对增量做校验；必要时再决定是否引入内存索引。
5. **把本实验固化为回归脚本**：`P2_validate.py` 已幂等可复跑（§7），建议进 CI 作量级哨兵（阈值 8.5 s ± 容忍），防未来数据规模膨胀无声突破秒级。

---

## 7. 复现命令（一行可复制）

从仓库根 `C:/Users/Wang/Desktop/Studium` 执行（解释器 = venv，含 pyshacl 0.40.1 / rdflib 7.6.0）：

```bash
# 主实验（构建 RDF + 全量校验 + 负对照 + 量级探针 + CLI 退出码），stdout 存档：
"tmp/venv_b7a/Scripts/python.exe" research_tree/_sources/P2/P2_validate.py \
  "docs/图工程调研/M08实验-第15章分层图谱/data" > research_tree/_sources/P2/run_output.txt 2>&1
```

基线对照（JSONL+脚本全表校验，同一份数据）：

```bash
"tmp/venv_b7a/Scripts/python.exe" \
  "docs/图工程调研/M08实验-第15章分层图谱/tools/check_graph.py" \
  --nodes data/nodes-*.jsonl data/inherited/nodes-*.jsonl \
  --edges data/edges-*.jsonl data/inherited/edges-*.jsonl \
  --source source/apostol-ch15 source/strang-ch3 source/strang-ch4
# （在 docs/图工程调研/M08实验-第15章分层图谱/ 目录下执行）
```

仅构建图（可选）：`"tmp/venv_b7a/Scripts/python.exe" research_tree/_sources/P2/P2_build_rdf.py <data_dir> <graph.ttl输出路径>`

---

## 8. 判死自查

| 判死项 | 状态 |
|---|---|
| 是否伪造实测数字？ | 否。所有数字来自 `run_output.txt` 真实 stdout 或文首基线实测；跑不出的项（如跨平台 RSS）已如实标注，未用估计值顶替。 |
| 环境依赖是否装失败、是否如实记录？ | 未新增任何依赖；pyshacl 0.40.1/rdflib 7.6.0 已在 venv 直接可用。 |
| 是否做了跨工具横向性能基准（红线）？ | 否。量级探针是 pyshacl 单工具自比（N 子图耗时），非跨引擎对比；与 check_graph.py 的对比是任务卡 Q2 要求的"同数据全表一遍"墙钟量级对照。 |
| 结论是否回答三个任务问题？ | 是。Q1 可行性+量级、Q2 性能门槛、Q3 退出码/报告可接入性，均有实测数字支撑。 |
| 是否从简建模、只做可行性+量级？ | 是。仅最简 RDF 映射（节点=subject、锚点=字面量、关系=谓词）+ 3 类约束；未扩展语义层。 |
| 复现命令是否写入报告？ | 是，见 §7。 |
