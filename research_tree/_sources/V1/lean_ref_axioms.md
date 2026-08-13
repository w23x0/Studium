# Snapshot: Lean Language Reference — Chapter 8 Axioms（#print axioms 依赖坍缩）

- URL: https://lean-lang.org/doc/reference/latest/Axioms/
- 标题: The Lean Language Reference — 8. Axioms
- 机构: Lean 项目（leanprover，lean-lang.org）
- 日期: 访问 2026-08-13（latest 指针）
- 证据等级: A（官方文档原文）

## 关键原文摘录

**`#print axioms`（把声明直接/传递依赖坍缩到公理集）：**
- "Prints the axioms used by a declaration, directly or indirectly."
- "`#print axioms`, followed by a defined identifier, displays all the axioms that a definition transitively relies on."
- "if a proof uses another proof, which itself uses an axiom, then the axiom is reported by `#print axioms` for both."
- 可用于 "to audit the assumptions made by a proof, for instance detecting that a proof transitively depends on the `sorry` tactic."
- 输出示例："'addThree' does not depend on any axioms"

**公理作为被假定的常量（机器可证 vs 真值的边界）：**
- "Axioms are postulated constants. While the axiom's type must itself be a type (that is, it must have type `Sort u`), there are no further requirements."
- "Axioms do not reduce to other terms."
- "Because they introduce a new constant of any type, and an inhabitant of a type that is a proposition counts as a proof of the proposition, axioms can be used to prove even false propositions."
- "Any proof that relies on an axiom can be trusted only to the extent that the axiom is both true and consistent with the other axioms used."
- "By their very nature, Lean cannot check whether new axioms are consistent; please exercise care when adding axioms."

## 对本题的意义
"证明依赖公理可信的程度仅取决于公理本身为真且与所用其它公理一致" —— 形式验证只保证"从所选公理+推理规则可推导"，不保证公理与任何外部原文的对应。这直接支撑 Q3 的区分：形式化证推导 vs 锚点证对应是正交的。
