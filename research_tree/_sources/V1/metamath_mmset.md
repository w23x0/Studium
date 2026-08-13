# Snapshot: Metamath Proof Explorer — What is Metamath (mmset)

- URL: https://us.metamath.org/mpeuni/mmset.html
- 标题: Metamath Proof Explorer Home Page（What is Metamath）
- 机构: Metamath / Norman Megill（us.metamath.org 镜像）
- 日期: 访问 2026-08-13
- 证据等级: A（官方页面原文）

## 关键原文摘录
- "A **proof** is a sequence of substitution instances of axioms and inference rules, where the hypotheses of the inference rules match previous steps in the sequence."
- "For brevity, a proof may also refer to earlier theorems, but in principle it can be expanded into references to only the initial axioms and rules."
- "The complete proof of a theorem all the way back to axioms can be thought of as a tree of subtheorems, with the steps in each proof branching back to earlier subtheorems" ... "axioms are ultimately reached at the tips of the branches."
- 2+2=4 证明："2,913 subtheorems" / "26,323 steps" total back to the ZFC axioms。
- 依赖追踪命令："show trace_back 2p2e4 /essential /count_steps" — produces the longest dependency path；184-layer-deep path from 2p2e4 back to ax-2。
- set.mm 组织："over 41,000 counting 'mathboxes', which are annexes where contributors can develop additional topics"；主节 + mathboxes。
