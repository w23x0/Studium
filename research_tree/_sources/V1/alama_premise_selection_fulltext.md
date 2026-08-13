# Snapshot: Premise Selection for Mathematics（全文关键段）

- URL: https://arxiv.org/html/1108.3446v2（2026-08-13 实抓核验；经 https://arxiv.org/html/1108.3446 重定向至 v2）
- 标题: Premise Selection for Mathematics by Corpus Analysis and Kernel Methods（full text）
- 作者: Jesse Alama, Tom Heskes, Daniel Kühlwein, Evgeni Tsivtsivadze, Josef Urban
- 日期: 访问 2026-08-13（审计整改后重抓核验，替换原伪句）
- 证据等级: A（全文 HTML 抓取）
- 整改注记: 审计 V1 后重抓。原 "Table 1 shows that fine dependencies consistently exceed unique explicit references per theorem (e.g., 11.57 vs. 2.7 for xboole_0)." 一句在 v1 全文、v2 全文、abstract 页均不存在（grep 核验：v2 全文 "Table 1 shows"=0 次、"consistently exceed"=0 次、"fine dependencies"=0 次；"unique explicit references" 仅 1 次且为表 1 列注），为伪句，已删除。下表 1 列注/数据行为真实逐字文本。

## 关键原文摘录（最小依赖的精确定义）
- "refactoring of the articles of the mml into one-item micro-articles, and computing their minimal dependencies by a brute-force minimization algorithm."
- "The first step in the computation of fine-grained dependencies in Mizar is to break up each article in the mml into a sequence of Mizar texts, each consisting of a single top-level item"
- "we apply a greedy minimization process to the environment to compute a minimal set of items that are sufficient to verify each 'micro-article'."
- "the minimality means that removing any dependence will cause the verification to fail."
- 关键：显式引用 ≠ 真实依赖。"But if we are interested in giving a complete answer to the question of what a formalized proof depends upon, we must expose suppressed facts and inferences."（例：subtyping 关系被隐式使用、从不显式引用）
- "both syntactic (e.g., notational macros), and semantic (e.g., theorems, typings, etc.)" dependencies。

## 表 1（逐字：表题 + 列注 + xboole_0 数据行）
- 表题（逐字）: "Table 1: Effectiveness of fine-grained dependencies on the 33 MPTP2078 articles ordered from top to bottom by their order in the mml."
- 列注（逐字）:
  - "Article: Mizar Article relevant to the MPTP2078 benchmark."
  - "Theorems: Total number of theorems in the article."
  - "Expl. Refs.: Average number of (non-unique) explicit references (to theorems, definitional theorems, and schemes) per theorem in the article."
  - "Uniq. Expl. Refs.: Average number of unique explicit references per theorem."
  - "Fine Deps.: Average number of all (both explicitly and implicitly) used items (explicitly referred to theorems, together with implicitly used items) per theorem as computed by dependency analysis."
  - "MPTP Deps.: Average number of items per theorem as approximated by the MPTP fixpoint algorithm."
- 数据行（xboole_0，逐字）: `xboole_0  7  4  2.7  11.57  12.62`（Article=xboole_0、Theorems=7、Expl. Refs.=4、Uniq. Expl. Refs.=2.7、Fine Deps.=11.57、MPTP Deps.=12.62）
- 正文说明（逐字）: "For each theorem in the sequence of the 33 Mizar articles (ordered from first to last by their order in the mml) we show how many explicit dependencies are involved (on average) in their proofs and how many implicit dependencies (on average) it contains."
- 数据解读（转述，非论文原句，标 C）: 表 1 数据行显示每定理细粒度依赖数（Fine Deps.=11.57）远超唯一显式引用数（Uniq. Expl. Refs.=2.7）；论文正文无 "fine dependencies consistently exceed…" 这类断言句。
