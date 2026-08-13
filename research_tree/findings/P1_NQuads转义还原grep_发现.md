# 原型 P1 实测发现

**主题**: N-Quads 转义还原 grep 等价性（B1b 待实测）
**任务 ID**: P1
**日期**: 2026-08-13
**数据**: 第 15 章 nodes-*.jsonl 的 quote，共 921 个（顶层 648 + inherited 273，全真实）
**解释器**: `C:/Users/Wang/Desktop/Studium/tmp/venv_b7a/Scripts/python.exe`（rdflib 7.6.0）
**脚本目录**: `C:/Users/Wang/Desktop/Studium/research_tree/_sources/P1/`
**真实 stdout**: `C:/Users/Wang/Desktop/Studium/research_tree/_sources/P1/run_output.txt`

---

## 0. 一句话结论

**N-Quads 路径在真实 921 锚点上：逐字还原 100.0000%（921/921）通过、非法转义 0；相对"对原始 JSONL 跑 grep -F"基线 0 丢 0 变、等价精确成立——但这是因为数据里只有反斜杠与双引号两种低风险转义，任务卡声称的"中文/全角空格/换行"在真实数据里根本不存在；且 rdflib 7.6.0 的 canonicalize=True 是静默 no-op，并没有实现 RDFC-1.0。**

---

## 1. 问题逐条回答

### 问 1：rdflib 7.6.0 构造 RDF 字面量 → N-Quads 序列化 → ECHAR/UCHAR 还原解析器，『还原后逐字 == 原始 quote』通过率？

**实测：100.0000%（921/921）通过，非法转义 0。** 证据（run_roundtrip.txt）：

```
roundtrip_ok: 921 / 921
roundtrip_pass_rate: 100.0000%
reduce_illegal_escape_count: 0
lines_not_mapped_to_anchor: 0
```

- 交叉校验（run_verify.txt）：用 rdflib 自己的 `NQuadsParser` 当独立 oracle，同样 921/921 逐字还原：
  ```
  oracle_parsed_literals: 921
  oracle_roundtrip_ok: 921 / 921
  oracle_roundtrip_pass_rate: 100.0000%
  oracle_missing_or_mismatch: 0
  ```
  手写解析器与参考实现完全一致，无漏解析、无错配。

- **但通过率含金量有限**：真实 921 文件里实际出现的转义只有两种（run_scan_escapes.txt）：
  ```
  double_backslash (orig backslash)  971
  ECHAR_"                            38
  ```
  即数据只锻炼了 `\\` 与 `\"` 两类低风险转义（都是平凡可逆的）。`\t\b\f\n\r` 与 `\uXXXX\UXXXXXXXX` 全部零出现。**100% 通过不能外推到含换行/中文/全角空格的场景**（见第 5 节机理探针：换行场景 grep -F 就会丢）。

### 问 2：与直接对原始 JSONL 跑 grep -F 相比，N-Quads 路径在哪些锚点上会丢/变？

**实测：0 丢 / 0 变。** 证据（run_grepcompare.txt，byte 级子串匹配 = grep -F 语义）：

```
both_hit: 571
lost_on_nquads_path (A hit, B miss): 0
gained_on_nquads_path (A miss, B hit): 0
neither: 350
```

- 两条路径**分毫不差**：571 个锚点两边都能被 grep -F 命中，350 个两边都命中不了，没有任何一个锚点在两条路径间"丢"或"多"。
- 为什么等价？因为 rdflib 的 N-Quads 转义与 JSON 转义对"数据里实际出现的字符"行为一致：
  - 反斜杠 → 两者都翻倍成 `\\`（JSON 与 `_quote_encode` 都是 `.replace("\\","\\\\")`）；
  - 双引号 → 两者都写成 `\"`；
  - 非 ASCII（唯一是 U+2013 破折号，3 处）→ **两者都原样写 UTF-8**（本数据 JSONL 为 ensure_ascii=False，实测 3 个非 ASCII 锚点都在 both 组，说明原始 JSONL 里就是裸破折号字节）；
  - 无任何控制字符 → 无 `\n`/`\r` 这类两边行为差异的字符。
- **350 个"两边都丢"的锚点**，是 grep -F 本身（用解码后 quote 作固定串）在两种序列化上的共同盲区，不是 N-Quads 的额外损失：
  - 341 个含反斜杠 + 12 个含双引号（其中 3 个同时含两者 → 350）。原因：JSON 与 N-Quads 都把反斜杠翻倍、双引号转义，于是"含反斜杠的完整 quote"不再是文件字节子串。
  - 两个特例（idx 295、434，quote 为 `\sum_ {...}= O.` / `O,`）反斜杠在**位置 0**且只有一个，故从翻倍对的第 2 个反斜杠起匹配成功 → 两边都命中（都在 both 组）。含双引号的锚点则**永远**无法命中（结尾 `"` 前必有 `\`，裸 `"` 永远对不上）。这一细节两边行为完全对称，故 0 丢 0 变成立。
- **结论**：『还原后 grep -F 等价』在真实 921 锚点上**成立且精确**（0 差异）。但等价≠找得见——350 个锚点（38.0%）在**两条路径上**都用"解码 quote 直接 grep -F"找不到。要恢复这些锚点必须用转义感知的解析器逐字比较（问 1 已证 100% 可还原）。

### 问 3：canonical N-Quads（RDFC-1.0 排序）序列化是否可逆还原、逐字判等？

**实测：可逆还原成立（100%），但 rdflib 7.6.0 根本没有实现 RDFC-1.0。** 三重证据：

1. **源码**（`rdflib/plugins/serializers/nquads.py`）：`NQuadsSerializer.serialize` 签名只吃 `base/encoding/**kwargs`，`canonicalize=True` 被 `**kwargs` 静默吞掉，序列化逻辑里没有任何排序/规范化步骤。
2. **字节相等**（run_roundtrip.txt）：`canonical_identical_to_regular: True`（普通与 canonicalize 输出逐字节相同，都是 120426 字节）。
3. **插入顺序相关**（run_verify.txt）：`canonical_ordered == canonical_shuffled: False` —— 若真做了 RDFC-1.0 排序，无论插入顺序输出都应一致；实测"canonical"输出仍随插入顺序漂移（与普通输出相同漂移），证明它只是普通序列化的别名。
   ```
   plain_ordered == plain_shuffled: False
   canonical_ordered == canonical_shuffled: False
   canonical_ordered == plain_ordered: True
   canonical_shuffled == plain_shuffled: True
   ```

- 逐字判等层面：因为 RDFC-1.0 只影响三元组排序与空白节点重命名，从不改变字面量转义，所以无论 canonical 与否，字面量都可 100% 还原（canonical 输出 921/921 还原通过）。**结论：『canonical N-Quads 可逆还原』为真，但『rdflib 7.6.0 提供 canonical N-Quads』为假；需要真 RDFC-1.0 时必须换实现。**

---

## 2. 实测方法与脚本说明

**数据准备（非脚本，一次性核对）**：任务卡说 921 个锚点。实测顶层 `nodes-*.jsonl` 只有 648 个、397 节点；加 `inherited/nodes-*.jsonl` 后为 **921 个、522 节点**（648+273=921），与任务卡一致。graveyard（killed）不计入。

脚本（均在 `research_tree/_sources/P1/`，用 venv python 运行）：

| 脚本 | 做什么 |
|---|---|
| `p1_roundtrip.py` | 读 921 锚点 → 每锚点一条 `(urn:anchor:<i>, urn:quote, Literal(quote))` 进 `Dataset` → `serialize(format="nquads")` 与 `serialize(format="nquads", canonicalize=True)` → 写 `anchors_921.nq` / `anchors_921_c14n.nq` → 手写 `reduce_nt_string`（ECHAR `\t\b\n\r\f\"'\\` + UCHAR `\u4`/`\U8`，`\\` 优先于其它转义，避免 `\\n` 误判为换行）逐锚点还原判等 |
| `p1_grep_compare.py` | 逐锚点 byte 级子串匹配（grep -F 语义）：基线=原始 JSONL 文本字节，路径=N-Quads 文件字节；统计 both/lost/gained/neither 与丢失原因分类 |
| `p1_verify.py` | ①用 rdflib `NQuadsParser` 解析 `anchors_921.nq` 作 oracle 对照；②顺序 vs 乱序插入两个 Dataset，比对普通/canonical 输出的字节一致性 |
| `p1_scan_escapes.py` | 用真正的转义解析器逐字面量统计真实文件中实际出现的转义种类 |
| `p1_mechanism_probe.py` | 合成字符串（LF/CR/tab/FF/DEL/中文/全角空格/破折号/lone surrogate/反斜杠结尾/字面 `\u0061`/字面 `\n`）看 rdflib 确切输出 + grep -F 可命中性；**明确标注非 921 数据，仅供风险节** |

**注意事项**：
- 单个字面量不能单独序列化成 N-Quads（需 context-aware store），故用 `Dataset`（`ConjunctiveGraph` 已 deprecated，警告信息见 run_verify.txt）。
- N-Quads 文件用 Python 文本模式写出 → Windows 上 LF 被转成 CRLF（见第 3 节字节数）。
- grep -F 等价性用**字节级**匹配，与 grep 的真实行为一致（grep 不做 Unicode 归一化）。

---

## 3. 实测数据（全部来自真实 stdout）

**数据概览**（run_roundtrip.txt 末尾 + 数据清单）：
```
total_anchors: 921       （顶层 648 + inherited 273；522 节点）
anchors_with_backslash: 343
anchors_with_doublequote: 12
anchors_with_singlequote: 20
anchors_with_nonascii: 3     （U+2013 破折号，共 3 处）
anchors_with_control_chars: 0
quote 长度: min 32 / median 89 / max 198（字符）
90 个不同字符；无中文、无全角空格、无换行（见第 4 节对照）
```

**问 1 往返**（run_roundtrip.txt，首次干净运行）：
```
dataset quads: 921
nquads_bytes(in-memory, LF): 120426     lines: 921
serialize_time_s: 0.0042                （≈219k 字面量/秒）
roundtrip_ok: 921/921 = 100.0000%       roundtrip_time_s: 0.0097（≈95k 字面量/秒）
reduce_illegal_escape_count: 0
```

**内存**（run_mem.txt，tracemalloc 包装同一脚本）：`tracemalloc_peak_MiB: 16.118`（Python 堆峰值；同包装下 serialize_time_s 0.0092 / roundtrip_time_s 0.0166，略高于无探针运行）。

**问 2 grep -F 等价性**（run_grepcompare.txt）：
```
raw_jsonl_bytes: 508384    nquads_bytes(on-disk CRLF): 121348
both_hit: 571    lost_on_nquads_path: 0    gained_on_nquads_path: 0    neither: 350
lost reasons: (空)      gained detail: (空)
anchors_appearing_more_than_once_in_nquads: 314
anchors_appearing_more_than_once_in_jsonl: 319
```
（314/319 指同一 quote 文本被多个锚点复用/互为子串，属数据本身，与 N-Quads 无关。）

**问 3 canonical**（run_roundtrip.txt + run_verify.txt）：
```
canonical_bytes: 120426    canonical_serialize_time_s: 0.0026
canonical_identical_to_regular: True
canonical_roundtrip_ok: 921/921 = 100.0000%
plain_ordered == plain_shuffled: False
canonical_ordered == canonical_shuffled: False
canonical_ordered == plain_ordered: True
canonical_shuffled == plain_shuffled: True
```

**字节计数说明**（消歧）：
- 内存中序列化：**120426 字节**（LF）。
- verify 打印的 `120420` 是**字符数**不是字节数：3 个破折号 U+2013 各占 1 字符 / 3 字节 → 120420 + 3×2 = 120426。两个数都对，单位不同。
- 磁盘文件 `anchors_921.nq`：**121348 字节**（Windows 文本模式把 921 个行尾 LF 与末尾空行 LF 转 CRLF：120426 + 922 = 121348）。

---

## 4. 与规范声明的对照

| 规范/前提说 | 实测 |
|---|---|
| B1b（A 级）：N-Triples/N-Quads 字符串字面量必须转义 `"`、`\`、LF、CR；ECHAR `\t\b\n\r\f\"\'`；UCHAR `\uXXXX`/`\UXXXXXXXX` | rdflib 7.6.0 的 `_quote_encode` 只做 4 种替换：`\\`、`\n`、`\"`、`\r`。tab/FF/DEL/非 ASCII 全部**原样 UTF-8 输出**（规范允许：`STRING_LITERAL_QUOTE` 只禁 `"` `\` LF CR）。UCHAR 仅在 .encode 失败时走注册的 `_rdflib_nt_escape`，但 NQuads 序列化器实际用 `encode(...,"replace")`，该 handler 未被调用 |
| 任务卡前提：quote 含"中文/LaTeX/全角空格/换行" | **与实测不符**。真实 921 锚点：0 中文、0 全角空格（U+3000）、0 换行/控制字符；只有 LaTeX 反斜杠（971 个，343 锚点）、双引号（38 个，12 锚点）、U+2013 破折号（3 个）。任务卡把风险集写大了，数据实际落在最安全的一档 |
| 任务卡：921 个锚点 | **成立**（顶层 648 + inherited 273 = 921；仅顶层则 648） |
| rdflib `serialize(format="nquads", canonicalize=True)` 产出 RDFC-1.0 canonical N-Quads | **不成立**。`**kwargs` 静默吞参，输出与普通序列化逐字节相同、且随插入顺序漂移（见第 1 节问 3 三重证据） |

---

## 5. 未决与风险

1. **数据风险面远小于任务卡假设**。100% 通过率是在只有 `\\`（971）与 `\"`（38）两类平凡转义的数据上取得的；没有换行/中文/全角空格。**通过率不能外推**。
2. **机理探针（合成，非 921，run_mechanism.txt）揭示的失败模式**：
   - 真实 LF/CR：rdflib 输出 `\n`/`\r`（`\n` 场景 grepF_hit=False）→ 用"解码 quote 直接 grep -F"会找不见该锚点。注意 JSONL 基线同样转义 LF/CR，等价仍成立；但若管线在 JSONL 端、N-Quads 端用了不同搜法，就会产生差异。
   - **lone surrogate：rdflib 静默写成 `?`**（`encode(...,"replace")`），往返会**失真**（`a?b` ≠ `a\ud800b`）——这是比"找不到"更严重的数据破坏。JSONL 可通过 `\ud800` 转义引入 surrogate。当前 921 数据无，但这是真实可达的破坏路径。
   - Python `str.splitlines()` 把 0x0C（FF）当行分隔符：rdflib 原样输出 FF（规范允许），按行解析的管线会被拆行。
   - 字面 `\n`（反斜杠+n 两字符文本）：rdflib 序列化成 `\\n`，grepF_hit=False（原文对不上）；且对"真换行的 `\n` 转义"可能产生假匹配。往返解析器因 `\\` 优先处理而正确，但 grep 检索不可靠。
3. **`canonicalize=True` 是静默 no-op，不报错**——会给使用者"已规范化"的错觉；依赖 RDFC-1.0 排序/确定性输出的管线会静默出错。
4. **350/921（38.0%）锚点无法用"解码 quote grep -F"在任何一条路径上找到**（含基线）。若验证管线以 grep 命中为存在性判据，这 350 个锚点会被误判为"找不到"，除非改用转义感知的 N-Quads 解析 + 逐字比较。
5. **字节 vs 字符 vs CRLF 三套计数**易混（120426 字节 / 120420 字符 / 121348 磁盘字节）。按字节哈希、行数比对、或换行符敏感的管线需统一。

---

## 6. 建议的下一步

1. **若需要真 RDFC-1.0**：放弃 rdflib 的 canonicalize 旗标；改用以 `rdf-canonize`（npm，w3c-ccg 实现）为代表的规范实现，或自管排序（按 N-Quads 行字典序即可确定性排序，不依赖库）。
2. **若管线用 grep 验证锚点**：对含反斜杠/双引号的锚点（355 个，38.5%）禁用"解码 quote 直接 grep -F"；改走转义感知解析 + 逐字比较（已证 100% 可还原）。对含双引号的 12 个锚点尤其如此（其裸 `"` 在两种序列化里都永不出现）。
3. **扩展数据风险面**（超出本任务 921 范围）：引入含真实换行/中文/全角空格的章节文本锚点后重测，量化 LF/CR 场景下 grep -F 的丢失率与 surrogate 破坏是否出现。
4. **记录为已知缺陷**：rdflib 7.6.0 `canonicalize=True` 静默失效、lone surrogate 静默写成 `?` —— 在 B1b 的规范判定里把这两条标为"库行为与规范 intent 的偏差"。

---

## 7. 复现命令

```bat
cd C:/Users/Wang/Desktop/Studium/research_tree/_sources/P1
C:/Users/Wang/Desktop/Studium/tmp/venv_b7a/Scripts/python.exe p1_roundtrip.py
C:/Users/Wang/Desktop/Studium/tmp/venv_b7a/Scripts/python.exe p1_grep_compare.py
C:/Users/Wang/Desktop/Studium/tmp/venv_b7a/Scripts/python.exe p1_verify.py
C:/Users/Wang/Desktop/Studium/tmp/venv_b7a/Scripts/python.exe p1_scan_escapes.py
C:/Users/Wang/Desktop/Studium/tmp/venv_b7a/Scripts/python.exe p1_mechanism_probe.py
```

单行复现（问 1 主测量）：
```
C:/Users/Wang/Desktop/Studium/tmp/venv_b7a/Scripts/python.exe C:/Users/Wang/Desktop/Studium/research_tree/_sources/P1/p1_roundtrip.py
```

依赖：仅需 venv `tmp/venv_b7a` 内 rdflib 7.6.0（已装好，`import rdflib; rdflib.__version__` 实测为 7.6.0）。全部真实 stdout 汇总于 `run_output.txt`。

---

## 8. 判死自查

| 红线 | 自查 |
|---|---|
| 不伪造实测数字 | 全部数字来自真实 stdout（run_output.txt，含 6 段运行记录）；跑不出的（如 surrogate 的 grepF_hit）如实写 N/A / 未跑通 |
| 环境装依赖失败 | 无：rdflib 7.6.0 在 venv 已就绪（首个命令即验证版本） |
| 只用真实数据（921 锚点） | 问 1/2/3 的通过率与等价性全部基于真实 `nodes-*.jsonl`+`inherited` 的 921 锚点；`p1_mechanism_probe.py` 明确标注"非 921 合成数据"，只用于第 5 节风险说明，不进入任何主结论数字 |
| 复现命令含 venv python 路径 | 第 7 节给出，含 `tmp/venv_b7a/Scripts/python.exe` |
| 结论回答任务问题、不越界 | 三条问题逐条以实测数字回答；未对红线规则做任何改动 |
