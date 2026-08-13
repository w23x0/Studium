# Snapshot: Large Formal Wikis: Issues and Solutions（abstract）

- URL: https://arxiv.org/abs/1107.3209
- 标题: Large Formal Wikis: Issues and Solutions
- 作者: Jesse Alama, Kasper Brink, Lionel Mamane, Josef Urban
- 日期: arXiv 1107.3209（2011-07-16 提交；访问 2026-08-13）
- 证据等级: A（abstract 页原文）

## Abstract（原文摘录）
"We present several steps towards large formal mathematical wikis. The Coq proof assistant together with the CoRN repository are added to the pool of systems handled by the general wiki system described in cite{DBLP:conf/aisc/UrbanARG10}. A smart re-verification scheme for the large formal libraries in the wiki is suggested for Mizar/MML and Coq/CoRN, based on recently developed precise tracking of mathematical dependencies. We propose to use features of state-of-the-art filesystems to allow real-time cloning and sandboxing of the entire libraries, allowing also to extend the wiki to a true multi-user collaborative area."

## 关键摘录
- "A smart re-verification scheme for the large formal libraries in the wiki is suggested for Mizar/MML and Coq/CoRN, based on recently developed precise tracking of mathematical dependencies." — 依赖追踪驱动"智能重验证"：定义/定理改动后，只重验受影响文章。
- "real-time cloning and sandboxing of the entire libraries" — 依赖边界决定重验范围。

## 对本题的意义
"依赖图决定改动影响范围（谁必须重验）"是依赖图最实用的查询应用之一，对 M08"候选晋升后旧结论是否受影响"的审计范围有直接映射。
