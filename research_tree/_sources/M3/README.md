# M3 原型实测 — 双写/影子读迁移原型（B8c：JSONL→目标载体回放一致性）

本目录是原型 M3 的完整可复现实验：从第 15 章全量 JSONL（522 节点 / 1433 边）重建
目标载体 RDF，并实测影子读、双写、从源重建三条路线的成本结构。

## 环境
- Python: `C:/Users/Wang/Desktop/Studium/tmp/venv_b7a/Scripts/python.exe`（rdflib 7.6.0，已验证）
- 数据: `C:/Users/Wang/Desktop/Studium/docs/图工程调研/M08实验-第15章分层图谱/data/`
  `nodes-*.jsonl` + `inherited/nodes-*.jsonl`（合计 522 节点）
  `edges-*.jsonl` + `inherited/edges-*.jsonl`（合计 1433 边）

## 脚本（按依赖顺序）
| 脚本 | 作用 |
|---|---|
| `common.py` | 共享加载器与 RDF 映射（node/rel/property/anchor/edge 命名空间，可逆双射） |
| `m3_replay.py` | 问题 1：全量回放 522/1433 → RDF，计时 + 一致性自检 + RDF→dict 逐字段回读 + 重建确定性 + 序列化产物 |
| `m3_shadow_read.py` | 问题 2：Scientist 式影子读（JSONL+脚本 vs 重建 RDF，6 查询逐条比对）；clean 基线 + M1 丢边 / M2 反向 / M3 改文 / M4 丢节点 四种差异暴露 |
| `m3_cost_structure.py` | 问题 3：双写 vs 影子读 vs 从源重建 实测成本结构（含 100 条新边批量对比） |

## 数据产物
- `m3_replay_graph.nt` — 全量重建的 N-Triples 序列化（约 2.44 MB，2425759 字节）
- `m3_replay_graph.ttl` — 全量重建的 Turtle 序列化（约 1.29 MB）

## 复现（依次运行，全部真实 stdout 汇总于 run_output.txt）
```bat
C:/Users/Wang/Desktop/Studium/tmp/venv_b7a/Scripts/python.exe m3_replay.py
C:/Users/Wang/Desktop/Studium/tmp/venv_b7a/Scripts/python.exe m3_shadow_read.py
C:/Users/Wang/Desktop/Studium/tmp/venv_b7a/Scripts/python.exe m3_cost_structure.py
```

## 关键结论（详见 findings/M3_发现.md）
1. 全量回放 522 节点 / 1433 边 → 16121 三元组，build 约 0.09–0.35 s，序列化 NT 约 0.04–0.15 s；
   一致性自检全过：节点 subject 522、直连边 1433、重化边 1433、悬空 0；RDF→dict 逐字段回读 100%
   （节点 15 字段全过、边 1433/1433），两次独立重建序列化字节一致（幂等）。
2. 影子读落地：6 查询在 clean 数据上零差异；M1 丢边在计数+行级暴露，M2 反向边在计数级
   BLIND、仅行级暴露（关键：计数检查对对称变更失明），M3 改文仅字段级暴露，M4 丢节点在
   计数+清单+新侧悬空三处暴露。
3. 成本结构（单进程可行性数字）：双写每边约 0.06 ms、每节点约 0.10 ms（写时边际）；
   影子读每轮约 1.0 s（旧侧 0.002 s + 新侧 SPARQL ~0.99 s）；从源全量重建约 0.13 s。
   在 1433 规模下，一次全量重建（确定性、幂等）比一轮影子读更便宜，重建本身不需要影子读。
