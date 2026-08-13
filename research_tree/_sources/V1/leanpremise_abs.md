# Snapshot: Premise Selection for a Lean Hammer (LeanPremise/LeanHammer)（abstract）

- URL: https://arxiv.org/abs/2506.07477
- 标题: Premise Selection for a Lean Hammer
- 作者: Thomas Zhu, Joshua Clune, Jeremy Avigad, Albert Qiaochu Jiang, Sean Welleck
- 日期: arXiv 2506.07477（2025-06 首提，2026-02 修订；访问 2026-08-13）
- 证据等级: A（abstract 页原文）

## Abstract（原文摘录）
"Neural methods are transforming automated reasoning for proof assistants, yet integrating these advances into practical verification workflows remains challenging. A hammer is a tool that integrates premise selection, translation to external automatic theorem provers, and proof reconstruction into one overarching tool to automate tedious reasoning steps. We present LeanPremise, a novel neural premise selection system, and we combine it with existing translation and proof reconstruction components to create LeanHammer, the first end-to-end domain general hammer for the Lean proof assistant. Unlike existing Lean premise selectors, LeanPremise is specifically trained for use with a hammer in dependent type theory. It also dynamically adapts to user-specific contexts, enabling it to effectively recommend premises from libraries outside LeanPremise's training data as well as lemmas defined by the user locally. With comprehensive evaluations, we show that LeanPremise enables LeanHammer to solve 21% more goals than existing premise selectors and generalizes well to diverse domains."

## 关键摘录
- "A hammer is a tool that integrates premise selection, translation to external automatic theorem provers, and proof reconstruction into one overarching tool to automate tedious reasoning steps."
- LeanPremise "dynamically adapts to user-specific contexts, enabling it to effectively recommend premises from libraries outside LeanPremise's training data as well as lemmas defined by the user locally."（前提推荐可涵盖训练库之外的本地引理）
