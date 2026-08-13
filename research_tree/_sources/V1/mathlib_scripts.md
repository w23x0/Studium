# Snapshot: mathlib4 scripts 目录（依赖 DAG 工具清单）

- URL: https://github.com/leanprover-community/mathlib4/tree/master/scripts
- 标题: mathlib4 /scripts 目录（GitHub 目录列表）
- 机构: leanprover-community（mathlib4）
- 日期: 访问 2026-08-13（master 指针；审计整改后 2026-08-13 经 raw 文件逐字核验 docstring 拼写：parallelizes / Print）
- 证据等级: A（仓库目录原文；工具注释为仓库自述）

## 与依赖图/依赖查询直接相关的工具
- **dag_traversal.py**："Parses the import DAG from `.lean` source files and parallelizes an action over a forward or backward traversal." 支持 `--forward`（roots first）与 `--backward`（leaves first），即按 import DAG 的正/反向顺序处理模块。
- **topological_sort.py**："Print Mathlib modules in topological (import-DAG) order"，`--reverse` 为 leaves first。
- **fix_nonlocal_set_option.py**："bisects the import DAG to find the upstream file whose missing `set_option`" 导致下游失败 —— 沿依赖图上溯定位问题文件。
- 目录中未见专门命名的 used_by 脚本；反向依赖（"谁引用 X"）需基于 dag_traversal / lake 或 import-graph（B6a 已核）自行构造。

## 说明
模块级依赖查询在 mathlib 是现成工程实践（DAG 遍历、拓扑序、上溯二分定位）。声明级（定理级）依赖查询靠 `#print axioms`（见 lean_ref_axioms.md）与 import-graph 的 `#find_home`（B6a 已核）。
