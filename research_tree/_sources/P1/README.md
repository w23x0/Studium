# P1 原型实测 — N-Quads 转义还原 grep 等价性（B1b 待实测）

本目录是原型 P1 的完整可复现实验。

## 环境
- Python: `C:/Users/Wang/Desktop/Studium/tmp/venv_b7a/Scripts/python.exe`（rdflib 7.6.0，已验证）
- 数据: `C:/Users/Wang/Desktop/Studium/docs/图工程调研/M08实验-第15章分层图谱/data/`
  `nodes-*.jsonl` + `inherited/nodes-*.jsonl`（合计 921 个 anchor quote，全真实）

## 脚本（按依赖顺序）
| 脚本 | 作用 |
|---|---|
| `p1_roundtrip.py` | 把 921 个 quote 构造为 RDF 字面量 → N-Quads 序列化（含 canonicalize=True 对照）→ 手写 ECHAR/UCHAR 还原解析器逐字判等 |
| `p1_grep_compare.py` | 逐锚点 byte 级 grep -F 等价性：原始 JSONL 基线 vs N-Quads 路径 |
| `p1_verify.py` | 用 rdflib 自身 NQuadsParser 作 oracle 交叉校验；验证 canonicalize=True 是否为 no-op |
| `p1_scan_escapes.py` | 统计真实 921 N-Quads 文件里实际出现的转义种类 |
| `p1_mechanism_probe.py` | 合成字符机理探针（明确标注非 921 数据，仅供风险节） |

## 数据产物
- `anchors_921.json` — 921 个真实锚点（含 src_file/node_id/md_file/quote）
- `anchors_921.nq` — N-Quads 序列化（Windows 文本模式写出，CRLF，121348 字节）
- `anchors_921_c14n.nq` — canonicalize=True 输出（与普通输出逐字节相同，见发现报告第 4 节）
- `mechanism_probe.txt` — 机理探针输出

## 复现（依次运行）
```bat
C:/Users/Wang/Desktop/Studium/tmp/venv_b7a/Scripts/python.exe p1_roundtrip.py
C:/Users/Wang/Desktop/Studium/tmp/venv_b7a/Scripts/python.exe p1_grep_compare.py
C:/Users/Wang/Desktop/Studium/tmp/venv_b7a/Scripts/python.exe p1_verify.py
C:/Users/Wang/Desktop/Studium/tmp/venv_b7a/Scripts/python.exe p1_scan_escapes.py
C:/Users/Wang/Desktop/Studium/tmp/venv_b7a/Scripts/python.exe p1_mechanism_probe.py
```
全部真实 stdout 汇总于 `run_output.txt`（含 tracemalloc 峰值内存）。

## 关键结论（详见 findings/P1_NQuads转义还原grep_发现.md）
1. 921/921（100.0000%）逐字还原；非法转义 0。
2. N-Quads 路径相对原始 JSONL grep -F：0 丢 / 0 变（两条路径在 571 个锚点上同时命中、350 个同时不命中，分毫不差）。
3. canonicalize=True 在 rdflib 7.6.0 里是 no-op（源码 `**kwargs` 吞掉参数），无 RDFC-1.0 实现。
