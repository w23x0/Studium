# Snapshot: arXiv API 检索记录（发现日志 + 补充摘要）

- URL: http://export.arxiv.org/api/query （多次查询，2026-08-13）
- 证据等级: A（arXiv API 原始条目；摘要为条目自带）

## 查询与命中（发现路径记录）

### 查询 1: all:"Premise Selection for Mathematics"
- Premise Selection for Mathematics by Corpus Analysis and Kernel Methods — Alama, Heskes, Kühlwein, Tsivtsivadze, Urban — arXiv:1108.3446（v2）。摘要含："a newly available minimal dependency analysis of existing high-level formal mathematical proofs"、"50% improvement on the benchmark over the Vampire/SInE state-of-the-art system"。
- Premise Selection for Theorem Proving by Deep Graph Embedding — Wang, Tang, Wang, Deng — arXiv:1709.09994。"represents a higher-order logic formula as a graph"、"HolStep ... 83% to 90.3%"。

### 查询 2: all:"premise selection" AND all:"Lean"
- Premise Selection for a Lean Hammer — Zhu, Clune, Avigad, Jiang, Welleck — arXiv:2506.07477。
- Combining Textual and Structural Information for Premise Selection in Lean — Petrovčič, Narvaez Denis, Todorovski — arXiv:2510.23637。
- Machine-Learned Premise Selection for Lean — Piotrowski, Fernández Mir, Ayers — arXiv:2304.00994。
- LeanSearch v2: Global Premise Retrieval for Lean 4 Theorem Proving — Gao et al. — arXiv:2605.13137。
- Saturation-Driven Dataset Generation ... TPTP Ecosystem — Quesnel, Sileo — arXiv:2509.06809。
- LeanDojo — Yang et al. — arXiv:2306.15626。

### 查询 3: all:Metamath
- Models for Metamath — Carneiro — arXiv:1601.07699。
- Conversion of HOL Light proofs into Metamath — Carneiro — arXiv:1412.8091。
- Metamath Zero — Carneiro — arXiv:1910.10703。
- Arithmetic in Metamath, Case Study: Bertrand's Postulate — Carneiro — arXiv:1503.02349。
- Mathematical Knowledge Bases as Grammar-Compressed Proof Terms — Wernhard, Zombori — arXiv:2505.12305。
- Holophrasm — Whalen — arXiv:1608.02644。
- Generative Language Modeling for Automated Theorem Proving — Polu, Sutskever — arXiv:2009.03393。
- Generating Theorems by Generating Proof Structures — Wernhard — arXiv:2602.15511。

### 查询 4: all:Mizar AND all:dependency
- Dependencies in Formal Mathematics — Alama, Mamane, Urban — arXiv:1109.3687。
- mizar-items — Alama — arXiv:1107.4721。
- An Integrated Web Platform for the MML — Furushima et al. — arXiv:2210.02336。
- Premise Selection and External Provers for HOL4 — Gauthier, Kaliszyk — arXiv:1509.03534。
- ENIGMA Anonymous — Jakubův et al. — arXiv:2002.05406。
- Large Formal Wikis — Alama, Brink, Mamane, Urban — arXiv:1107.3209。
- Voting Theory in the Lean Theorem Prover — Holliday, Norman, Pacuit — arXiv:2110.08453。

### 查询 5: ti:"theorem proving" AND ti:"survey"
- A Survey on Deep Learning for Theorem Proving — Li et al. — arXiv:2404.09939。

## 说明
WebSearch 工具对全部 9 次关键词查询（中文 5 次、英文 4 次）返回空结果（工具侧异常，非无匹配）。源发现改由 arXiv API + 直接 WebFetch 完成。关键词组仍按任务卡与红线记录在案（见发现文件 §7）。
