# Snapshot: Machine-Learned Premise Selection for Lean（abstract）

- URL: https://arxiv.org/abs/2304.00994
- 标题: Machine-Learned Premise Selection for Lean
- 作者: Bartosz Piotrowski, Ramon Fernández Mir, Edward Ayers
- 日期: arXiv 2304.00994（2023-03 首提，2023-06 修订；访问 2026-08-13）
- 证据等级: A（abstract 页原文）

## Abstract（原文摘录）
"We introduce a machine-learning-based tool for the Lean proof assistant that suggests relevant premises for theorems being proved by a user. The design principles for the tool are (1) tight integration with the proof assistant, (2) ease of use and installation, (3) a lightweight and fast approach. For this purpose, we designed a custom version of the random forest model, trained in an online fashion. It is implemented directly in Lean, which was possible thanks to the rich and efficient metaprogramming features of Lean 4. The random forest is trained on data extracted from mathlib -- Lean's mathematics library. We experiment with various options for producing training features and labels. The advice from a trained model is accessible to the user via the suggest_premises tactic which can be called in an editor while constructing a proof interactively."

## 关键摘录
- "suggests relevant premises for theorems being proved by a user" — 前提选择是"建议"，不是自动写入。
- "The random forest is trained on data extracted from mathlib" — 从 mathlib 证明数据提取训练样本。
- "The advice from a trained model is accessible to the user via the suggest_premises tactic which can be called in an editor while constructing a proof interactively." — 编辑器内交互式建议（借候选，不借结案）。

## 对本题的意义
premise selection 的工具形态=交互式建议（suggest_premises tactic），与 M08 §8「借候选生成，不借自我进化」直接同构。
