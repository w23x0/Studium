# Snapshot: Combining Textual and Structural Information for Premise Selection in Lean（abstract）

- URL: https://arxiv.org/abs/2510.23637
- 标题: Combining Textual and Structural Information for Premise Selection in Lean
- 作者: Job Petrovčič, David Eliecer Narvaez Denis, Ljupčo Todorovski
- 日期: arXiv 2510.23637（2025-10 首提，2025-11 修订；访问 2026-08-13）
- 证据等级: A（abstract 页原文）

## Abstract（原文摘录）
"Premise selection is a key bottleneck for scaling theorem proving in large formal libraries. Yet existing language-based methods often treat premises in isolation, ignoring the web of dependencies that connects them. We present a graph-augmented approach that combines dense text embeddings of Lean formalizations with graph neural networks over a heterogeneous dependency graph capturing both state-premise and premise-premise relations. On the LeanDojo Benchmark, our method outperforms the ReProver language-based baseline by over 25% across standard retrieval metrics. These results suggest that relational information is beneficial for premise selection."

## 关键摘录
- "a heterogeneous dependency graph capturing both state-premise and premise-premise relations"
- "existing language-based methods often treat premises in isolation, ignoring the web of dependencies"
- "These results suggest that relational information is beneficial for premise selection." — 依赖结构本身是可学习信号。
