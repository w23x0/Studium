# Snapshot: LeanDojo — Theorem Proving with Retrieval-Augmented Language Models

- URL: https://arxiv.org/abs/2306.15626
- 标题: LeanDojo: Theorem Proving with Retrieval-Augmented Language Models
- 作者: Kaiyu Yang, Aidan M. Swope, Alex Gu, Rahul Chalamala, Peiyang Song, Shixing Yu, Saad Godil, Ryan Prenger, Anima Anandkumar
- 机构: Caltech + NVIDIA (arXiv)
- 日期: 访问 2026-08-13
- 证据等级: A（原文到手，WebFetch 抓取 abstract 页）

## Abstract（原文摘录）
"LeanDojo is an open-source Lean playground with toolkits, data, models, and benchmarks for formal theorem proving. It enables programmatic interaction with Lean's proof environment and provides fine-grained annotations of premises in proofs. Using this data, the authors develop ReProver, an LLM-based prover augmented with retrieval for selecting premises from Lean's math library. The system requires only one GPU week of training. They also construct a benchmark of 98,734 theorems and proofs from Lean's math library with a challenging data split requiring generalization to theorems using novel premises unseen during training."

## 关键摘录
- "It contains fine-grained annotations of premises in proofs, providing valuable data for premise selection"
- "an LLM-based prover augmented with retrieval for selecting premises from a vast math library"
- "Our retriever leverages LeanDojo's program analysis capability to identify accessible premises and hard negative examples"
- "a new benchmark consisting of 98,734 theorems and proofs extracted from Lean's math library"
- "challenging data split requiring the prover to generalize to theorems relying on novel premises that are never used in training"
