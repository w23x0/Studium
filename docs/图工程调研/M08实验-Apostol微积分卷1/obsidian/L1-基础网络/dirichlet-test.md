---
name: "狄利克雷判别法"
name_en: "Dirichlet's test"
node_type: theorem
origin: source
layer: L1
sections: ["10.19"]
aliases: ["THEOREM 10.17"]
---

# 狄利克雷判别法
*Dirichlet's test*

## 定义/陈述

Let $\sum a_n$ be a series of complex terms whose partial sums form a bounded sequence. Let $\{b_n\}$ be a decreasing sequence which converges to 0. Then the series $\sum a_n b_n$ converges.

> 适用语境:复项级数;不要求 $\sum a_n$ 收敛,只要求部分和有界
> 出处:`10.19.md`

## 原文锚点

- `10.19.md`:“Let $\sum a_{n}$ be a series of complex terms whose partial sums form a bounded sequence.”

## 出边(本节点 → 其他)

- 对比/易混淆 → [[abel-test]] *(模型推断)*
- 推广 → [[leibniz-rule]]
- 上位/下位 → [[convergence-test]]

## 入边(其他 → 本节点)

- 推导 ← [[abel-partial-summation-formula]]
- 推导 ← [[theorem-10-4-telescoping]]
- 推导 ← [[comparison-test]]
- 推导 ← [[absolute-convergence-implies-convergence]]
- 应用于 ← [[geometric-exponential-partial-sum-bound]]
- 前置 ← [[bounded-sequence]]
- 其他(证明方法相似(Abel 判别法的证明沿用 Dirichlet 判别法的论证)) ← [[abel-test]]
