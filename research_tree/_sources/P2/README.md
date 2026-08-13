# P2 — pySHACL 在 522 节点/921 锚点规模下的校验耗时（原型实测）

任务卡 P2。用 pyshacl 0.40.1 在真实数据（M08 第15章分层图谱，522 节点/1433 边/921 锚点 quote）
上跑封闭词表 + 锚点引用存在性 + 边端点存在性的 SHACL shapes，实测耗时/内存量级，
回答"是否构成对 JSONL+脚本全表校验的性能门槛""能否接入 check_graph.py 校验流程"。

## 文件
- `P2_common.py`      共享模块：JSONL → 简化 RDF 映射（节点=subject、锚点quote=字面量、关系边=predicate）+ 数据统计
- `P2_shapes.ttl`     SHACL shapes：sh:closed 封闭词表 + sh:in 值封闭 + 2 条 SHACL-SPARQL（锚点引用存在性、边端点存在性）
- `P2_validate.py`    实验主脚本：全量校验（耗时/内存/违规分组）+ 负对照 + 量级探针 + CLI 退出码
- `P2_build_rdf.py`   仅构建图写 graph.ttl（可选）
- `run_output.txt`    一次完整运行的真实 stdout 存档
- `graph.ttl`         522 节点图的 Turtle 序列化产物（脚本生成，勿手改）

## 用法
解释器必须是 venv（pyshacl 0.40.1 / rdflib 7.6.0）：
```
"tmp/venv_b7a/Scripts/python.exe" research_tree/_sources/P2/P2_validate.py \
  "docs/图工程调研/M08实验-第15章分层图谱/data"
```
数据目录布局：`data/nodes-*.jsonl` + `data/edges-*.jsonl`（主层）+ `data/inherited/nodes-*.jsonl`
+ `data/inherited/edges-*.jsonl`（继承层），合计即任务卡规模 522/1433/921。

## 红线遵守
- 只测 pyshacl 单工具的可行性与量级，不做跨工具横向性能基准（项目红线）。
- 一切数字来自真实 stdout（run_output.txt），跑不出来即写"未跑通"。
- 复现命令见 findings/P2_pySHACL耗时_发现.md 第 7 节。
