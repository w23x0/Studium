# Superposed Episodic and Semantic Memory via Sparse Distributed Representation — Rinkus & Leveillé (2017)

Source: https://arxiv.org/abs/1710.07829
Fetched: 2026-08-13
Grade: A (原文到手，arXiv 摘要全文)

## 核心内容（摘要摘录）

"The abilities to perceive, learn, and use generalities, similarities, classes, i.e., semantic memory (SM), is central to cognition."
- ML/DL 大多聚焦语义能力；"single-trial formation of permanent memories of experiences, i.e., episodic memory (EM), has had relatively little focus."
- DL 加 EM（Neural Turing Machine, Memory Networks）的两个缺陷：a) EM 作为独立模块，需要大量数据搬运；b) "individual items are stored localistically within the EM, precluding realizing the exponential representational efficiency of distributed over localist coding."
- Sparsey：无监督、层级、空间/时空联想记忆模型，核心是用稀疏分布表征（SDRs, cell assemblies），允许极高效的"single-trial learning algorithm"——"maps input similarity into code space similarity (measured as intersection)."
- "SDRs of individual inputs are stored in superposition and because similarity is preserved, the patterns of intersections over the assigned codes reflect the similarity, i.e., statistical, structure, of all orders, not simply pairwise, over the inputs."
- "Thus, SM, i.e., a generative model, is built as a computationally free side effect of the act of storing episodic memory traces of individual inputs either spatial patterns or sequences."
- 结果：MNIST 与 Weizmann 视频事件识别基准，尚未达 SOTA，但单 CPU 上学习仅需几分钟。
