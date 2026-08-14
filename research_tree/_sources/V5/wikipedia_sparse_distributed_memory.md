# Sparse Distributed Memory (SDM) — Wikipedia

Source: https://en.wikipedia.org/wiki/Sparse_distributed_memory
Fetched: 2026-08-13
Grade: A (原文到手)

## 核心内容

- Pentti Kanerva 1988 年于 NASA Ames 提出：SDM 是 "mathematical model of human long-term memory"，长二进制词同时作为 "both addresses to and data for the memory."
- 机制：巨大二进制地址空间（如 2^1000）映射到较少物理硬位置；数据分布式存储在多个位置，检索用平均。"sensitivity to similarity" —— 词可通过邻近地址（Hamming 距离内）读出。
- 稀疏二元地址：n 维向量；"the distances between points of a high-dimensional space resemble the proximity relations between concepts in human memory." 随机两点在高维空间近似正交；"most of the space is nearly orthogonal to any given point, and the larger n is, the more pronounced is this effect."
- 联想记忆：内容寻址的 RAM 扩展 / 三层前馈网络；相似输入检索相似存储项（模式补全）。
- 稀疏性提升容量："Sparse coding increases the capacity of associative memory by reducing overlap between representations." 定义："only a few neurons out of a population respond to any given stimulus and each neuron responds to only a few stimuli."
- Gero Miesenböck 实验室（牛津，果蝇嗅觉）：破坏稀疏性 "increases inter-odor correlations, and prevents flies from learning to discriminate similar, but not dissimilar, odors."
- 关联：SDM "can be considered a realization of locality-sensitive hashing"；概率解释为 "an importance sampler, a Monte Carlo method of approximating Bayesian inference."
- Dasgupta, Stevens, Navlakha (2017, Science): 果蝇嗅觉回路实现改进版二元 locality sensitive hashing via sparse, random projections.
