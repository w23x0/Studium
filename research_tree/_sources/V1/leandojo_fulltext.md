# Snapshot: LeanDojo 全文关键段（arXiv HTML）

- URL: https://arxiv.org/html/2306.15626v2
- 标题: LeanDojo: Theorem Proving with Retrieval-Augmented Language Models (full text)
- 作者: Kaiyu Yang, Aidan M. Swope, Alex Gu, Rahul Chalamala, Peiyang Song, Shixing Yu, Saad Godil, Ryan Prenger, Anima Anandkumar
- 日期: 访问 2026-08-13
- 证据等级: A（全文 HTML 抓取）

## 关键原文摘录
- "LeanDojo is the first tool to locate premises in Lean proofs, enabling training machine learning models for premise selection."
- "we modify Lean's internal implementation, intercepting the elaborator to record its input/output"（premise 的 pre-expression 与 expression 全名与定义位置）
- "LeanDojo processes the repo to produce a directed acyclic graph whose nodes are files and edges are import relations between files."
- "'Premises' in this paper belong to a category of Lean expressions called 'constants.'"
- "Premises are existing lemmas or definitions useful for proving a theorem. They are used as arguments in tactics."
- "premises have unique fully qualified names (e.g., nat.mod_self) but are often used by ambiguous short names (mod_self), relying on Lean to perform name resolution."
- "not all premises are accessible when proving a theorem" — "They include premises defined in the same file before the theorem, as well as those imported from other files."
- "LeanDojo can perform program analysis on Lean code to determine accessible premises. On our data, that reduces the average number of premises from 128K to 33K."
- "we create a challenging data split named novel_premises. It requires testing proofs to use at least one premise that has never been used in training."
