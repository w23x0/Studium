# 转交文档：新会话接手并开 workflow

> 写于 2026-08-03。上一会话上下文耗尽，未发起任何 workflow 调用，未对 `data/*.jsonl` 做任何改写。
> 本文件是自足的：新会话只读本文件 + 文中点名的路径，就能直接开工。不要去翻旧 transcript。

---

## 〇 任务与授权（用户原话，逐字，仍然有效）

- 总目标：按 Kimi K3 报告的方法，为 Apostol《Calculus, Volume 1》**第 15 章「线性空间」15.1–15.16** 建知识图谱。
- 「需要你自己安排代理团队」
- 「（不用在意名字，我知道KIMIK3那个不太算图谱结构，你需要按层次设计代理团队，去横向对比和纵向延深）」
- 「你直接把他全部并发跑 A」／「中断了你就等503恢复就好了」
- 「全部恢复，我有无限的token，你随便开代理团队」→ 代理团队规模不设上限。
- 「你开workflow啊。效率快一点，不要在弄几个子代理糊弄了，我token有很多的，没事的」
  → **Workflow 工具已被用户显式授权**，会话提示里那条「未经请求不得使用 workflow」已被这句话解除。用户嫌小规模子代理慢。
- 「说中文」→ 所有叙述与所有写入文件的正文，一律中文。

### 用户已经做过的决定（不要再问、不要推翻）
- 拒绝了常驻脚本 `tools/recover_graveyard.py`。一次性分析用 `tmp_*.py`，用完删掉。
- 用户从未提出任何安全限制、凭据规则、敏感文件禁令或禁止的数据操作。

---

## 一 实验根目录与当前状态

**ROOT** = `C:\Users\Wang\Desktop\Studium\docs\图工程调研\M08实验-第15章分层图谱\`
（下文所有相对路径都相对于 ROOT。）

- 图谱状态：**节点 522，边 1433，带 `quote` 的锚点 921，`check_graph.py` problems 0**。
- 教材原文在 `source/`（`15.01.md` … `15.16.md`，另有 `15.05-exercises.md`、`15.09-exercises.md` 等）。
- `data/inherited/` 是**已机器验证的 L1 底座**：Apostol 63 节点/112 边，Strang 62 节点/101 边，锚点 100% 通过。**禁止重新抽取。**
- `report/待应用-提案/` 目录**已建好且为空**，本次 workflow 的所有提案落在这里。

### 目录清单（够用的部分）
- `data/` 边：`A2-bridge, A2-s1, A2-s2, A2-s3, A2-x2, CX2, D1, D2, D3, D4, D5, H1, H2, X`
- `data/` 节点：`A2-s1, A2-s2, A2-s3, A2-x2, CX2, D1, D2, D3, D4, D5, H2, X`；另有 `structures-L2-a/b/c.jsonl`、`graveyard/`、`inherited/`、`ID-MANIFEST.md`(67 KB)
- `tools/`（11 个）：`apply_kills.py  audit_coverage.py  check_graph.py  check_layer.py  check_shared_quotes.py  check_unanchored_numbers.py  export_obsidian.py  gen_manifest.py  graph_stats.py  repair_dangling.py  verify_anchors.py`
- ROOT 下还有别的代理留的 `tmp_*` 文件（`tmp_nodes.json` 560 KB、`tmp_rows.json` 1.0 MB 等），**别删**，也别当成结论来源。
- `brief/` 目录**不存在**。

### `report/` 里会被 workflow 用到的文件（大小便于确认没读错）
| 文件 | 字节 | 用途 |
| --- | --- | --- |
| `待应用清单.md` | 14814 | **执行 backlog，最重要，必读全文** |
| `_D分片-主控核验.md` | ~40 K | 六片边证据回查的主控结论（含四层证据池） |
| `审查-形式D-D1.md` / `-D2.md` / `-D3D4.md` | 20005 / 17749 / 9431 | 三个**空壳骨架**，待合并填充 |
| `审查-形式D-D1-片31-56.md` | 71768 | 八个分片之一 |
| `审查-形式D-D1-片57-81.md` | 53490 | |
| `审查-形式D-D2-片36-58.md` | 53308 | |
| `审查-形式D-D2-片59-80.md` | 33849 | |
| `审查-形式D-D3-片21-45.md` | 65862 | |
| `审查-形式D-D3-片46-69.md` | 65981 | |
| `审查-形式D-D4-片1-27.md` | 43929 | |
| `审查-形式D-D4-片28-54.md` | 53253 | |
| `裁定-ADJ1.md` / `-ADJ2.md` / `-ADJ3.md` | 62430 / 57887 / 41509 | 三裁定员原文 |
| `SPEC缺陷-锚点规则量化.md` | 40916 | 30 字符地板缺陷的量化证据（SPECQ） |
| `_形式B-共享引文候选.md` | 12939 | 借用引文候选 |
| `审查-形式B-共享引文.md` | 73197 | 形式 B 审查正文 |
| `共享引文清单.md` | 326584 | 机器产出的共享引文全表 |
| `横向-章内辨析.md` | 20295 | H-in |
| `横向-跨章回指.md` | 17275 | H-back |
| `横向-跨教材差异.md` | 20391 | H-cross |
| `反例层-15.05与15.09.md` | 15413 | |
| `D5-下延说明.md` | 25945 | |
| `_边证据索引.md` | 27065 | |
| `_捞回-裁定原文.md`(`_捞回-裁定员推理原文.md`) | 95746 | |
| `丢弃与未覆盖清单.md` | 7448 | 完备性评审要用 |
| `无锚点数值筛查.md` | 20130 | 负结果之一 |
| `悬空成员修复日志.md` | 5342 | |
| `代理团队架构.md` | 9935 | |
| `进度报告.md` | 26852 | |
| `audit-*-verdicts.jsonl` + 同名 `.md` | 17 组 | B2 的裁决在 `audit-B2-verdicts.jsonl` |

---

## 二 SPEC 要点（`SPEC.md`，5236 字节，110 行；新会话仍应自己读一遍全文）

### 节点 schema（逐字）
```json
{"id":"d:additive-inverse-uniqueness","name_en":"...","name_zh":"...","node_type":"theorem","sections":["15.04"],"statement":"1–3句英文,说清它是什么/断言什么","aliases":[],"anchors":[{"file":"15.04.md","quote":"..."}],"parent":"apostol:linear-space","atomic":true,"atomic_reason":"为什么判定它已足够原子"}
```
### 边 schema（逐字）
```json
{"src":"<id>","rel":"requires","dst":"<id>","origin":"source|model","evidence":{"file":"15.07.md","quote":"逐字子串"},"rel_note":"仅 rel=other 时必填"}
```
- **`evidence` 是 dict，不是 list。** 1433 条边里 931 条带 evidence。

### 封闭词表
- 节点类型 4 种：`concept` `method` `theorem` `notation`。
- 关系 9+1：`is-a` `part-of` `requires` `implies` `equivalent` `contrasts` `applies-to` `generalizes` `alias-of` `other`（`other` 必填 `rel_note`）。
- **`part-of`：`src` = 子，`dst` = 父。** 纵向边方向恒为粗→细。`is-a` 与 `generalizes` 互为逆，只写一条；对称关系只写一个方向。
- id 命名空间：`apostol:` `strang:` `d:` `x:` `L2:`…`Ln:`（实践中另有 `apostol:cx-`、`apostol:ext-`）。
- `parent` / `atomic` / `atomic_reason` 仅 `d:` 节点必填。

### 锚点规则
1–3 条；`quote` 必须是 `file` 的**逐字连续子串**；30–200 字符；不得跨行；不得改标点、不得省略号、不得修 OCR；复制粘贴而非凭记忆。
L2+ 无需锚点，但必须给**真实存在的** `members` id + `boundary` + `abstraction_gain`，**缺一即判死**；另需 `layer`、`sections`。

### 死因编号（SPEC 里只有 1–5）
`1` 量词过度断言／`2` 编造成员归属／`3` 伪造教材出处／`4` 数学错误／`5` 伪抽象·层塌缩。
**`6`（引文不支撑该断言）全程在用，但至今未写进 SPEC——这是待议 SPEC 修订项之一。** 另有实践中的 `0` = 无死因/仅需修。

### 审计与停止规则
- 裁决格式：`<id> | KEEP|KILL | 死因编号 | 一句理由`，**必须回显候选 id**（上一轮按名字匹配错杀过 9 个）。
- 停止规则：某层存活 < 2 即为天花板。

### 四条硬禁令（每份简报都要抄给代理）
1. 不得读 `M08实验-Apostol微积分卷1/`（旧实验，已污染）。
2. 不得读别的代理的输出，除非简报点名了路径。
3. 不得为凑数编节点。
4. 不得静默截断——做不完要如实说做了哪些、剩哪些。

---

## 三 方法论：必须传给每个代理的既有结论

这一节是本实验最贵的部分——都是踩过坑换来的。简报里省掉哪一条，代理就会重犯对应的错。

### 3.1 两根轴
- **纵向延深**：向下 = D 层（粗→细递归分解到原子节点）；向上 = L2…Ln 抽象阶梯。
- **横向对比**：`H-in` 章内兄弟辨析／`H-back` 跨章回指／`H-cross` 跨教材对齐（对 Strang 第 3–4 章）。

### 3.2 每层双独立审计员
- **审计员 A**：数学正确性 + 成员归属 + 「锚点是否支撑该断言」。
- **审计员 B**：抽象增益，用**删除测试**。
- 只有审计员 A 的产出暴露在「边证据过报」这个风险面上。

### 3.3 四层证据池（**本实验最新、也最容易搞错的定义**）
判定一条 cause 6 指控时，「这个节点手里到底有哪些证据」按四层算：

| 层 | 内容 | 入池 | 理由 |
| --- | --- | --- | --- |
| T1 | 节点自身 `anchors` | 是 | 定义上就是 |
| T2 | 节点**发出**的边（它是 `src`）的 `evidence` | 是 | 它确实引了，只是写在边上没写进 `anchors` |
| T3 | part-of 后代的 `anchors` + 后代发出的边 | 是 | 内容下移了，父靠子承载 |
| TD | **指向**该节点的边（它是 `dst`） | **否** | 那是别人引的；下游消费者引了某行 ≠ 上游节点引了它 |

**TD 必须排除。** 上一会话的池定义把 TD 也算进去，导致 D3 L64 的指控被假塌陷——`edges-D3.jsonl:158` 的 `src` 是 L64 的下游消费者 `d:parseval-proof-pair-expansion-with-y`，不是 L64 自己。

**T2 与 T3 要开不同的药方：**
- T2 塌陷 = 生产者**确实引了**那行，只是写进了边的 `evidence` 而不是节点的 `anchors` → 记账位置问题。
- T3 塌陷 = 内容合法地下移到了子节点，父节点可能**根本不需要改**。
- 两者都报成「锚点不支撑断言」会把修复方向带错。

**cause 1 对边证据免疫，cause 6 不免疫。** 机制：cause 1 是节点自己过度断言，后代手里有证据也撤不回这个断言；cause 6 是某句话缺引文，而引文可以待在子树别处。
暴露面（522 节点）：**0 个 part-of 后代 406 个（77.8%）；1–2 个 63 个（12.1%）；3–9 个 44 个（8.4%）；10+ 个 9 个（1.7%）。有后代 = 116 = 22.2%，≥3 个 = 53 = 10.2%。**

### 3.4 三条过报通道
- (a) 内容下移到 part-of 后代。
- (b) **源文件单行含多句**——按行号比对会过报覆盖。实例：`15.10.md:119` 长 460 字符含 4 句，D3 L29 要的是**最后**一句，池里有的是**第一**句，142/460 = 31%。
- (c) 同一源行的两半分别落在节点锚点和边上。实例：D2 L66，`15.08.md:15` 长 233 字符，锚点覆盖基底那 79 字符，`edges-D2.jsonl:85` 覆盖「dimension 2」那 89 字符。

### 3.5 冗余度的正确度量：「新引入的源行数」，不是「池变大了」
重复引用节点自己已锚的那行，救不了任何指控。每片实测（额外证据条数／新源行数／与自身锚点重复的行数／新增到任何新行的节点数）：
`D3 200/67/72/36`｜**`D2 230/20/76/15`**｜`D1 418/87/88/30`｜`D4 285/79/69/31`｜`A1 1740/458/103/55`｜`S1 244/154/55/52`。
D2 的 230 条额外证据只带来 20 个新源行、只覆盖 80 个节点里的 15 个——这准确预测了 D2 塌陷数近零。

### 3.6 机器 `grep -F` 锚点核验只能证明「引文未被篡改」，**不能**证明「引文支撑该断言」
五种形式：
- **A** 变量／宾位错（引文说的是另一个对象）
- **B** 借用引文（识别信号：同一 `(file, quote)` 对被多个节点引用；**半可机械化**）
- **C** 拿端点当中间步骤
- **D** **射程不足**（引文管不到断言的全部范围；**最危险**）
- **E** 有子句完全无锚

**「N/N 锚点已验证」永远不得当作正确性保证来汇报。** 这句话要写进每份简报。

### 3.7 两个机械信号已被证明召回不足
- `check_unanchored_numbers.py`：召回 **1/4**。
- `check_shared_quotes.py`：对 **238/522 = 46%** 的节点完全盲。
结论：**机械信号只能用来定向，不能用来结案。**

### 3.8 `verify_anchors.py` 的两个缺口
- (a) 唯一测试是 `quote and quote in text`（`:56`），所以 SPEC 的 30–200 字符界与不跨行规则**从未被机器检查过**。实测现状：921 条锚点，min 32／median 89／mean 94.8／max 198，零换行，0 违规。
- (b) **无锚点节点不会让它失败**——`:75` 是 `return 1 if failures or bad_json else 0`。同一次运行同时打印 `pass rate: 100.0%` + `nodes with NO anchor: 4` + `EXIT=0`。
  → **必须读 stdout 里的 `nodes with NO anchor` 那行，不能只看退出码。** 新增锚点的字符数必须手工实测。

### 3.9 SPEC 30 字符锚点地板缺陷
短的行间公式变成不可引用。实测长度：内积公理 (3) = 21；范数定义 = 26；定理 15.16 主不等式 = 25；**定理 15.9(a) = 29，差一个字符**；公理 6/7/8/9 = 16/18/22/22。
两个「幸存者」只靠 OCR 噪声过线：公理 5 的公式靠 `f o r a l l x i n V.` 被拆开才到 36；内积公理 (4) 靠 `\quad i f \quad` 才到 35。
SPECQ 自我更正后的口径是**占真实内容行的 8.6%**；60 个低于地板的行里有 51 个是全局唯一的，所以**正确的旋钮是唯一性，不是长度**。SPECQ §5.2 已备好可直接并入 SPEC 的文本。

### 3.10 批量击杀的互证塌缩
删除测试是逐节点做的，**批量执行会塌掉互相证成的对**。B2 的 29 条 KILL 里有 3 条的理由引用了 B2 同时也要杀的另一个节点。
→ **任何 `apply_kills.py` 调用之前，必须先跑互证检查。** 不做这一步就执行，会静默丢内容（`待应用清单.md` §三 原话）。

### 3.11 工程环境坑
- 网关 `api.skiapi.dev` 不稳：503/502/ECONNRESET/UNKNOWN_CERTIFICATE_VERIFICATION_ERROR/600 秒挂死。
  **缓解措施必须写进每份简报：先写骨架，再逐节点/逐组增量落盘。**
- **另有一种 harness 层挂死**（与网关不同）：所有工具都不返回输出，会自行恢复；**挂死期间尝试的写入会静默失败**。
- shell：`y''` 即使在 `<<'PY'` 里也会破坏 tokenization；Python 往 `/tmp/` 写在这台 Windows 上会失败。
- **`--help` 不是只读操作**：没有 argparse 的脚本会忽略未知参数照常执行。上一轮因此清空过 graveyard（已修回 28/28 节点，但边只回 68/88，**20 条永久丢失**）。
- 构造 LaTeX 查询串时：**一律用 raw string**，两侧都做空白归一化再比对。任何「池中无」的结论必须回源文件确认后才能定案——上一会话有 3 次假阴性全部来自我自己构造的查询串，不是数据本身。

### 3.12 可复用的证据池代码（已修正为四层形态）
```python
def nz(s): return re.sub(r'\s+','',s)
# part-of: src = 子, dst = 父  ->  children[父] = [子, ...]
emit[e['src']].append((basename, ln, ev['file'], ev['quote']))   # T2
into[e['dst']].append(...)                                        # TD —— 排除
def desc(r):
    seen={r}; st=[r]; out=[]
    while st:
        c=st.pop()
        for ch in children.get(c,[]):
            if ch not in seen: seen.add(ch); out.append(ch); st.append(ch)
    return out
def pool(nid):
    res=[('T1 自身锚点',f,q) for f,q in own[nid]]
    for b,ln,f,q in emit[nid]: res.append((f'T2 自发边 {b}:{ln}',f,q))
    for d in desc(nid):
        for f,q in own[d]:      res.append((f'T3 后代锚 {d[:30]}',f,q))
        for b,ln,f,q in emit[d]: res.append((f'T3 后代边 {d[:24]} {b}:{ln}',f,q))
    return res
```

---

## 四 待办 backlog（**`report/待应用清单.md` 是权威版本，必读全文**；这里给要点与关键逐字内容）

### 4.1 三裁定员不是投票团（`待应用清单.md` §〇）
ADJ1 与 ADJ2 判的是同一件事（B2 的冗余/删除测试裁决），可比：**9 个节点，3 处分歧 = 33%**。
ADJ3 判的是另一根轴（是否为真/精确/有锚），它的「KEEP/0」意思是「没发现假命题」，**不等于「冗余指控被驳回」**。把三列并成一个分歧率是范畴错误。

### 4.2 9 节点合并裁决（§一）：维持的 KILL 从 5 降到 3
- 捞回 `x:least-squares-is-a-projection`（ADJ1+ADJ2 各自独立翻案：它是 `strang:solvability-condition` 的唯一持有者，2 个 L1 成员在 X 层无别的家，5 条入边会悬空）。
- 捞回 `d:ten-axioms-listed-in-three-groups`。
- 维持的 3 条 KILL：`d:example-1-verification-is-the-field-axioms-of-r`（**必须先把它那张十行映射表并进父节点**）、`d:function-space-zero-is-the-everywhere-zero-function`、`d:degree-exactly-n-is-not-a-subspace-of-degree-at-most-n`。

### 4.3 `d:ten-axioms-listed-in-three-groups` → FIX（§2.1），采纳 ADJ2
已核实的边普查（逐字）：
```
OUT edges-D1.jsonl:5    part-of --> apostol:linear-space
IN  edges-D1.jsonl:10   part-of <-- apostol:closure-axioms
IN  edges-D1.jsonl:11   part-of <-- apostol:axioms-for-addition
IN  edges-D1.jsonl:12   part-of <-- apostol:axioms-for-multiplication-by-numbers
IN  edges-D1.jsonl:106  requires <-- d:examples-are-asserted-to-satisfy-the-axioms-and-left-to-the-reader
IN  edges-D1.jsonl:112  requires <-- d:example-1-verification-is-the-field-axioms-of-r
```
`apply_kills.py` 把边送进 graveyard **但不重指**，裸删会孤立那三个分组节点。
→ **先把 `:10/:11/:12` 重指到 `apostol:linear-space`。**

### 4.4 `d:an-example-is-a-set-plus-two-explicit-operations` → 重写+压缩（§2.2）
`d:operations-of-example-N-*` 只存在于 1/2/3/4（`nodes-D1.jsonl:45/48/51/54`），例 5–12 没有 operations 节点。
桶 3 的另一个唯一承载者是 `d:for-function-spaces-closure-is-the-only-real-content`（`nodes-D1.jsonl:62`）——**B2 也杀了它**（cause 5）。
裁定：删掉前两句可恢复的句子，保留收尾的普查表，节点存活；同一趟把 ADJ3 指出的那句假的收尾从句「the section fixes the operations before the sets」删掉。

### 4.5 执行顺序（§四，**这一段是顺序性改写，必须由主控串行做，不进 workflow**）
1. 3 处重写：`d:axioms-2-7-8-9-...` 按 ADJ3 §3 的定稿文本；`d:an-example-...` 压缩；`x:dimension-versus-rank` 补「有限维」。然后做**逐条断言分解 + 重新挂锚**，再跑 `python tools/verify_anchors.py data/nodes-D1.jsonl source`。
2. 重指 `edges-D1.jsonl:10/11/12` → `apostol:linear-space`。
3. 3 条 KILL，先 dry-run（逐字命令）：
   ```
   python tools/apply_kills.py --verdicts report/audit-B2-verdicts.jsonl --tag audit-B2 \
       --only d:example-1-verification-is-the-field-axioms-of-r \
              d:function-space-zero-is-the-everywhere-zero-function \
              d:degree-exactly-n-is-not-a-subspace-of-degree-at-most-n --dry-run
   ```
   其中 `d:example-1-...` 的十行映射表**必须先并进父节点**（ADJ1 强制）。
4. 悬空成员修复**已不再需要**。
5. 22 条无冲突 KILL——**跑完互证检查之后**，单独一批，保持 `_killed_by` 可区分。
6. B2 剩下的 1 条无冲突 FIX。
7. 重跑 `check_graph.py` / `check_layer.py` / `verify_anchors.py`，**读 `nodes with NO anchor` 那行**。

### 4.6 4 个零证据节点（§4.2）
| 节点 | 行 | 类型 | 断言/锚点 |
| `d:exponential-independence-uses-no-inner-product` | `nodes-D2.jsonl:42` | concept | 3/0 |
| `d:infinite-dimensional-operational-criterion-arbitrarily-large-independent-sets` | `:54` | method | 3/0 |
| `d:thm-15-7b-argument-adjoining-an-outside-element-breaks-the-count` | `:72` | method | 3/0 |
| `d:adjoining-an-element-outside-the-span-preserves-independence` | `:73` | theorem | 4/0 |
全部 `origin: 'model'`——是**合规缺口，不是编造归属**。`:42`/`:54` 可从 `15.07.md`/`15.08.md` 重新挂锚；`:72`/`:73` 卡在「无锚证明重构节点是否允许」这个 SPEC 待议项上。
**明文禁令：「不要为了凑锚点去硬挂一条射程不足的引文——那正是形式 D 缺陷的制造方式。」**

### 4.7 裁定员发现的缺陷（§五）
- ADJ1 §3.1：那条未落地的 A4a 修复文本**本身是假的**，**不得应用**。
- ADJ1 §3.2：`x:least-squares-is-a-projection` 的 4.1 锚点射程不足——**因为节点被捞回了，现在必须修**。
- ADJ1 §3.3：`apostol:function-space` 属形式 E。
- ADJ1 §3.4：`d:example-1-...` 的十条映射并进父节点后仍未挂锚。
- ADJ1 §3.5：有 1 条 B2 修复在现 schema 下不可执行。
- ADJ2 §4.1：B2 裁决正文有 3 处事实错误；§4.2 有 1 处计数矛盾；**≥3 条 B2 的 `reason` 字段需要重写**（其中一条引用了节点里根本不存在的句子）。
- ADJ3 §3：4 个节点需重写，定稿文本在那一节里。ADJ3 自身又犯了「末句」模式：5 个缺陷里 3 个在末句、2 个在首句，且**43 条断言里 24 条无锚**。

### 4.8 形式 B 待办（§六）
- **6.1** 3 处真漂移（cause 6）：`d:degree-exactly-n-fails-axiom-2-at-the-scalar-zero`、`d:degree-exactly-n-has-no-zero-element`、`d:for-function-spaces-closure-is-the-only-real-content`。
  最后这个**必须重新挂锚而不是丢掉**，因此**从 22 节点 KILL 批次里撤出**（第 4 个被捞回的节点）。
  前两个**不能归咎于 SPEC**：公理 2 长 170 字符、公理 5 长 85 字符，可引而未引。
- **6.2** 7 条借用锚点要剥掉（死因 0），剥完再查锚点数下限是否被击穿。
- **6.3** `nodes-CX2.jsonl` 全部 15 个节点：模型自己解了习题却只锚了题面。`15.05-exercises.md` 与 `15.09-exercises.md` 都没有答案（`grep -ci answer` 各为 0），所以那些诊断 100% 是模型计算。
  → 登记为**形式 E，不杀**，需要诚实的 `origin`。15.12 习题 1 的那 5 个节点同理。
- **6.4** 8 项的 SPEC 归因；组 3/8/9 不带死因；`apostol:theorem-15-15-orthogonal-decomposition` 已正确地从 SPEC 归因中移除。

### 4.9 其它零散待办
- `apostol:zero-element`：`sections` 补 `15.03`，死因 6 → 0（或归入 SPEC 的 `sections` 语义待议项）。
- 改分片记账错：D2 59–80 片的 L66 头条其实是过报，且它给的建议锚点写成 100 字符、真实子串是 89；D3 片把 L31 的 `:125` 列为无锚，而节点自身的锚点就是 `:125`。
- 修两个我自己核实过的数学缺陷：`d:exponential-independence-select-the-largest-exponent` 的严格性误归因；`d:pythagorean-split-of-the-approximation-error` 把误差与误差平方混同。
- 登记图谱覆盖缺口：**15.15 的例 2（Legendre）完全没有节点。**
- 调查「按批次分层」这个信号能否替代共享引文检测，并与「未披露模型内容（缺 `origin`）」规则合并。
- 读 `report/横向-章内辨析.md`、`report/横向-跨章回指.md`；整合 `data/edges-H1.jsonl`(15)、`data/nodes-H2.jsonl`(11)、`data/edges-H2.jsonl`(19)。
- L3…Ln 阶梯——**卡在 L2-B 的停止规则裁决上**。层内并行，层间严格串行。
- 完备性评审——**必须告知它已知的审计覆盖缺口与 B2 §5 的空洞**。
- Obsidian 导出——图谱定稿后 `python tools/export_obsidian.py --out obsidian`。

### 4.10 待议的 SPEC 修订项（约 20 条，本次 workflow 的主要产出之一）
cause 6 入 SPEC；短行间公式豁免 30 字符地板（SPECQ §5.2 有可直接并入的文本，并主张改用唯一性判据）；定理 15.9(a) 这个反例；3 锚点上限是否该提高；`origin: model` 声明后是否允许无锚的证明重构节点；`verify_anchors.py` 是否该对长度违规与无锚节点判失败；`parent` 是否仅指分解关系；节点是否可带 `origin`；`sections` 语义；`apostol:ext-` 命名空间是否合法；是否需要一个表示「在第二个使用点复用该节点」的关系词；是否每个 statement 句子都必须被锚点管到；B2 §6.1 的「枢纽节点豁免 FIX」规则；对没有 `parent` 的层如何操作化删除测试；删除测试的作用域是「父+兄弟」还是全图；B2 §4(c) 禁止把父节点已写出的 operations 再单独建节点；SPEC 是否允许「共享前提单独建节点 + 用边连」；**新增——边的 `evidence` 能否算作节点的锚点（本轮 T2 发现引出的问题）**。

### 4.11 已完成、不要重做
- 六片（D1–D4、A1、S1）的传递闭包边证据回查**已全部做完**，结论写在 `report/_D分片-主控核验.md`（含四层证据池那一节）。
- D3 46–69 与 D2 剩余条目已按句粒度裁定完：**7 条塌陷、3 条指控成立**。
  D3/D2 的主通道是 **T2（6/7）**，与 A1/S1 的 T3 主导正好相反——因为 D3 只有 5/69、D2 只有 6/80 个节点有 part-of 后代。
- 3 条成立的指控分量不同：**L64** 是分片自评「最该引却没引的一条」且干净地站住（`15.11.md:89` 只出现在 L67 的产出里，L64 从未引它；这是本轮唯一的「仅 TD」个案，恰好就是分片评级最重的那条）；**L47** 的池是 3 条全在重复同一条正交归一定义（T1 + 两条完全相同的 T2），`15.11.md:67` 始终未入池，而兄弟 L61、L63 都引了它；**L49 claim 3** 属「缺的是理由，不是事实」，与 `strang:pivot-columns` 同构——池里有结论句，缺的是正交关系式本身，边证据补不了。
- `report/_D分片-主控核验.md` 已被上一会话改过两处：把 §「D3、D2 两片尚未做这个回查」的占位改成「全部六片现已做完」；并在文末追加了 `## D3 与 D2 的边证据回查：先得把「证据池」重新定义` 整节。**不要重复追加。**

---

## 五 workflow 设计（上一会话已定稿的方案，直接照做）

### 5.1 分工原则：只读的进 workflow，改数据的留在主控
并发代理同时写 `data/*.jsonl` 会互相冲掉。所以：

- **进 workflow**：所有只读的分析、裁定、提案生成，以及三个**输出互不相交**的报告合并。
- **留主控串行**：`data/*.jsonl` 的一切改写（§4.5 的 3 重写 → 重指 3 条边 → 3 KILL → 22 批次 → 最后 1 FIX → 重跑三个检查器）。
  代理**只产出提案**，主控拿到提案后自己动手改。

### 5.2 目录约定
- 所有提案写到 `report/待应用-提案/`（**已建好，空的**），一个代理一个文件，文件名见下表。
- 代理**只返回一段简短摘要 + 它写的文件路径**，不要把提案正文塞进返回值——否则综合阶段的 prompt 会爆。

### 5.3 并行组（16 个，`parallel()` 一次全发；`parallel()` 本身是屏障）

| 代号 | 产出文件 | 任务 |
| --- | --- | --- |
| **A1** | `A1-互证塌缩检查.md` | **最高优先。** 从 `待应用清单.md` + `audit-B2-verdicts.jsonl` 认出那 22 条无冲突 KILL（记得 `d:for-function-spaces-closure-is-the-only-real-content` 已撤出），逐条检查：它的 KILL 理由是否引用了同批次里另一个也要被杀的节点 → 列出塌缩对，并裁定每对该保哪个；同时检查删除后是否有存活节点失去唯一承载、是否产生悬空边。输出「安全可杀清单」+「塌缩对清单」。 |
| **A2** | `A2-三处重写定稿.md` | 按 §4.3/§4.4 + ADJ3 §3 定稿文本，写出 3 处重写的**逐字最终文本**（`d:axioms-2-7-8-9-...`、`d:an-example-...` 压缩版、`x:dimension-versus-rank` 补有限维），每条断言配锚点候选：给 `file`、逐字 `quote`、**实测字符数**、以及该 quote 是 `file` 逐字子串的验证方式。 |
| **A3** | `A3-零证据节点锚点候选.md` | §4.6 四个零证据节点。`:42`/`:54` 从 `15.07.md`/`15.08.md` 找锚点候选；`:72`/`:73` 只写清它们为什么卡在 SPEC 待议项上，**不得硬挂射程不足的引文**。 |
| **A4** | `A4-形式B漂移与借用锚点.md` | §4.8 的 6.1（3 处真漂移，含 `d:for-function-spaces-...` 的重新挂锚）+ 6.2（7 条借用锚点剥除方案，剥完复查锚点数下限）。 |
| **A5** | `A5-CX2与origin.md` | §4.8 的 6.3：`nodes-CX2.jsonl` 全 15 节点 + 15.12 习题 1 的 5 个节点，登记为形式 E，给诚实 `origin` 的字段方案。**不杀。** |
| **A6** | `A6-两处数学缺陷.md` | §4.9 的两个数学缺陷（严格性误归因、误差/误差平方混同），给逐字改写文本 + 锚点。 |
| **A7** | `A7-H层整合.md` | 读 `横向-章内辨析.md`、`横向-跨章回指.md`，整合 `edges-H1.jsonl`(15)、`nodes-H2.jsonl`(11)、`edges-H2.jsonl`(19)：查方向合法性（`part-of` 子→父）、id 是否真实存在、`evidence` 是否 dict、对称关系是否只写了一个方向。 |
| **A8** | `A8-完备性评审.md` | 完备性评审。**必须被告知**：已知的审计覆盖缺口、B2 §5 的空洞、15.15 例 2（Legendre）无节点。读 `丢弃与未覆盖清单.md`。产出 15.1–15.16 逐节的覆盖缺口清单。 |
| **A9** | `A9-记账错更正.md` | §4.9 的分片记账错（D2 59–80 的 L66 过报 + 100 vs 89 字符；D3 的 L31 `:125`）+ `apostol:zero-element` 的 `sections`/死因更正。 |
| **A10** | `A10-批次分层信号.md` | 调查「按批次分层」能否替代共享引文检测，与「缺 `origin`」规则合并。要给**召回率实测**，不是猜测；记住 §3.7 两个信号已被证明召回不足。 |
| **S1** | `S1-SPEC-锚点规则.md` | SPEC 待议项**簇一：锚点规则**——30 字符地板豁免（读 `SPEC缺陷-锚点规则量化.md`，SPECQ §5.2 有可并入文本，主张改唯一性判据）、定理 15.9(a) 反例、3 锚点上限、是否每个 statement 句都要被锚管到、`verify_anchors.py` 是否该对长度与无锚判失败。产出**可直接并入 SPEC 的逐字文本** + 影响面分析。 |
| **S2** | `S2-SPEC-字段语义.md` | **簇二：字段语义**——cause 6 入 SPEC、**边 `evidence` 能否算节点锚点（T2 问题）**、节点可否带 `origin`、`sections` 语义、`parent` 是否仅指分解、`apostol:ext-` 命名空间、无锚证明重构节点是否允许。 |
| **S3** | `S3-SPEC-关系词与审计程序.md` | **簇三：关系词与审计程序**——「第二使用点复用」关系词、B2 §6.1 枢纽豁免、无 `parent` 的层怎么做删除测试、删除测试作用域（父+兄弟 vs 全图）、B2 §4(c)、共享前提单独建节点+边。 |
| **M1/M2/M3** | 直接写 `审查-形式D-D1.md` / `-D2.md` / `-D3D4.md` | 三个合并代理，**输出互不相交**。各自读自己那 2–3 个分片 + `_D分片-主控核验.md`，填满骨架的空摘要节。M1 读 `-D1-片31-56` + `-D1-片57-81`；M2 读 `-D2-片36-58` + `-D2-片59-80`；M3 读 `-D3-片21-45` + `-D3-片46-69` + `-D4-片1-27` + `-D4-片28-54`。骨架时间戳 21:29–21:32 早于分片完成的 22:24–22:38，所以骨架里的摘要是空的。**必须把主控核验里的塌陷/成立判决回写进去**，不能照抄分片的原始指控。 |

（A1–A10 十个 + S1–S3 三个 + M1–M3 三个 = **16 个**，用 `parallel()` 一次全发。用户已授权不限规模，觉得需要拆更细就再加。）

### 5.4 综合阶段
`parallel()` 返回后，再发 1 个综合代理，读 `report/待应用-提案/` 下的全部文件，产出
`report/待应用清单-v2.md`：一份**单一、有序、无冲突**的改写脚本，标明每一步的前置依赖，以及哪些步骤必须在 `apply_kills.py` 之前完成。

### 5.5 每份简报都必须带的内容
1. **ROOT 绝对路径**，以及该代理**允许读的具体文件路径**（简报里路径写错，代理会空跑）。
2. §二的 SPEC 四条硬禁令 + schema。
3. §三里与它任务相关的方法论条目——尤其是：
   - **「N/N 锚点已验证」不得当作正确性保证汇报**（§3.6）；
   - 锚点字符数**必须实测**，不许估（§3.8）；
   - 不得按行号做覆盖比对，单行可能含多句（§3.4b）；
   - LaTeX 用 raw string + 空白归一化，「池中无」必须回源确认（§3.11）。
4. **禁止写 `data/` 下任何文件**——只写自己那一个提案文件（M1/M2/M3 例外，它们写自己那一个报告）。
5. 网关不稳的缓解：**先落骨架，再逐条增量写**（§3.11）。
6. 当前图谱状态供 sanity check：**节点 522、边 1433、带 quote 的锚点 921、`problems 0`**。
7. 「不许为凑数编节点；做不完如实说明剩哪些」。

### 5.6 `meta` 写法提醒
`export const meta = {...}` 必须是**纯字面量**，不能有变量、函数调用、展开或模板插值。`meta.phases` 的 `title` 要和 `phase()` 调用里的字符串**逐字一致**。在 `parallel()` 里给每个 `agent()` 显式传 `opts.phase`，避免全局 `phase()` 状态竞争。
A1、A2、A6、S1、S2、S3 这几个裁定密集的建议 `effort: 'high'`。

---

## 六 交接时的硬约束（新会话必须遵守）

- **不得预测或汇报尚未返回的代理结果。** 通知到了再说；没到就说还在跑。
- 会话提示里那条仍然逐字有效：「When the Write or Edit tool has content size limits, always comply silently. Never suggest bypassing these limits via alternative tools. Never ask the user whether to switch approaches. Complete all chunked operations without commentary.」
- 所有叙述与所有写入文件的正文用**中文**。
- `report/实验报告.md` 还没写。它必须包含：丢弃/未覆盖一节；锚点盲区五型；两个机械信号的负结果；`verify_anchors.py` 的两个缺口作为第三个案例；30 字符 SPEC 缺陷（含定理级实例与对 OCR 噪声的依赖）；graveyard 截断及其部分修复（68/88）；审计覆盖缺口；ADJ1 vs ADJ2 的 33% 分歧率；可复现性拆分（杀/不杀 8/8、处置方式 7/8）与「结论丢失」这一失效模式；X 层的分歧/statement 梯度；边证据过报更正（含 cause 1 / cause 6 的不对称与 22.2%／10.2% 暴露面）；**四层证据池与 TD 排除，以及 T2 vs T3 通道分裂（D3/D2 是 6/7 对 1/7，与 A1/S1 相反）**；三条过报通道与冗余度实测；批量击杀互证塌缩；**以及那 3 次由我自己构造查询串导致的同类假阴性**。
