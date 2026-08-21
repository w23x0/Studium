---
name: "无穷积分(第一类瑕积分)"
name_en: "Infinite integral (improper integral of the first kind)"
node_type: concept
origin: source
layer: L1
sections: ["10.23"]
aliases: ["improper integral of the first kind"]
---

# 无穷积分(第一类瑕积分)
*Infinite integral (improper integral of the first kind)*

## 定义/陈述

If the proper integral $\int_{a}^{b}f(x)dx$ exists for every $b\geq a$, define $I(b)=\int_{a}^{b}f(x)dx$ for each $b\geq a$. The function $I$ is called an infinite integral, or an improper integral of the first kind, denoted $\int_{a}^{\infty}f(x)dx$. The integral converges if $\lim_{b\to+\infty}I(b)$ exists and is finite; otherwise it diverges. If the limit exists and equals $A$, the number $A$ is called the value of the integral, and we write $\int_{a}^{\infty}f(x)dx=A$.

> 适用语境:For $f$ whose proper integral over $[a,b]$ exists for every $b\geq a$; integrals $\int_{-\infty}^{b}f(x)dx$ are defined similarly.
> 出处:`10.23.md`

## 原文锚点

- `10.23.md`:“The function I defined in this way is called an infinite integral, or an improper integral of the first kind”
- `10.23.md`:“exists and is finite. Otherwise, the integral $\int_{a}^{\infty}f(x)dx$ is said to diverge.”

## 出边(本节点 → 其他)

- 上位/下位 → [[improper-integral]]
- 对比/易混淆 → [[improper-integral-second-kind]]
- 其他(记号约定类比(同一符号兼指积分与其值,如同 Σ 兼指级数与其和)) → [[series-sum-notation]]
- 前置 → [[doubly-infinite-integral]]
- 前置 → [[mixed-improper-integral-notation]]
- 前置 → [[gamma-function]]

## 入边(其他 → 本节点)

- 前置 ← [[proper-integral]]
- 组成 ← [[partial-integral]]
- 应用于 ← [[boundedness-criterion-for-improper-integrals]]
- 应用于 ← [[comparison-test-for-improper-integrals]]
- 应用于 ← [[limit-comparison-test-for-improper-integrals]]
- 其他(敛散行为类比(∫₁^∞ x^{-s}dx 与 ζ(s) 级数均在 s>1 收敛、s≤1 发散)) ← [[riemann-zeta-function]]
- 其他(积分判别法的证明思想用于习题18:单调递减趋零的 f,∫₁^∞ f(x)dx 与 Σf(n) 同敛散) ← [[integral-test]]
- 对比/易混淆 ← [[nth-term-test]]
