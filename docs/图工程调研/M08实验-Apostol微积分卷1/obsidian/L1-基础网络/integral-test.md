---
name: "定理10.11(积分判别法)"
name_en: "Theorem 10.11 (Integral test)"
node_type: theorem
origin: source
layer: L1
sections: ["10.13"]
aliases: ["THEOREM 10.11", "INTEGRAL TEST"]
---

# 定理10.11(积分判别法)
*Theorem 10.11 (Integral test)*

## 定义/陈述

Let $f$ be a positive decreasing function, defined for all real $x \geq 1$. For each $n \geq 1$, let $s_n = \sum_{k=1}^{n} f(k)$ and $t_n = \int_1^n f(x)\,dx$. Then both sequences $\{s_n\}$ and $\{t_n\}$ converge or both diverge. The proof rests on the inequalities $\sum_{k=2}^{n} f(k) \leq \int_1^n f(x)\,dx \leq \sum_{k=1}^{n-1} f(k)$.

> 适用语境:Positive decreasing functions on $[1,\infty)$; first proved by Cauchy in 1837
> 出处:`10.13.md`

## 原文锚点

- `10.13.md`:“THEOREM 10.11. INTEGRAL TEST. Let $f$ be a positive decreasing function, defined for all real $x \geq 1$ .”
- `10.13.md`:“Then both sequences $\{s_n\}$ and $\{t_n\}$ converge or both diverge.”

## 出边(本节点 → 其他)

- 上位/下位 → [[convergence-test]]
- 应用于 → [[series-of-nonnegative-terms]]
- 推导 → [[riemann-zeta-function]]
- 推广 → [[integral-comparison-estimate]] *(模型推断)*
- 其他(积分判别法的证明思想用于习题18:单调递减趋零的 f,∫₁^∞ f(x)dx 与 Σf(n) 同敛散) → [[infinite-integral]]

## 入边(其他 → 本节点)

- 推导 ← [[theorem-10-1-monotonic-convergence]]
