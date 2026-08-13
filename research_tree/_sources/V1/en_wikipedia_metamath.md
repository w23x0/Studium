# Snapshot: English Wikipedia — Metamath（二手综合，跨公理系统的证据）

- URL: https://en.wikipedia.org/wiki/Metamath
- 标题: Metamath（Wikipedia）
- 机构: Wikipedia（二手综合；其中数据库/公理系统事实与 metamath.org 官方一致）
- 日期: 访问 2026-08-13
- 证据等级: B（二手转引；关键事实可独立核对）

## 关键原文摘录

**证明的存储（引用列表）：**
- "the proofs are introduced with `$=` and are given as a list of names of axioms, rules and theorems to be applied."
- 例子：th1 的证明是一串标记序列："tt tze tpl tt weq tt tt weq tt a2 tt tze tpl tt weq tt tze tpl tt weq tt tt weq wim tt a2 tt tze tpl tt tt a1 mp mp"（压缩形式；可展开为逐行引用前步与规则名）。

**同一形式语言承载不同公理系统：**
- "The Metamath language is a metalanguage for formal systems. The Metamath language has no specific logic embedded in it."
- "A single construct, `$a` statements, is used to capture syntactic rules, axiom schemas, and rules of inference."
- set.mm（Metamath Proof Explorer）："based on classical first-order logic and ZFC set theory (with the addition of Tarski-Grothendieck set theory when needed)."
- iset.mm（Intuitionistic Logic Explorer）："develops mathematics from a constructive point of view, starting with the axioms of intuitionistic logic and continuing with axiom systems of constructive set theory."
- nf.mm（New Foundations Explorer）："develops mathematics from Quine's New Foundations set theory."

## 对本题的意义
同一个元语言 + 同一个证明检查器，可承载 ZFC / 直觉主义 / New Foundations 三种互不相容的公理基础——形式"可证"是相对所选公理集的，检查器自身不承诺公理与任何外部原文的对应。这是 Q3 的关键证据（B 级，可独立核对）。
