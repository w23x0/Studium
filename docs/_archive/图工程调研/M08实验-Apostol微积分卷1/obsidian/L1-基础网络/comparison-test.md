---
name: "定理10.8(比较判别法)"
name_en: "Theorem 10.8 (Comparison test)"
node_type: theorem
origin: source
layer: L1
sections: ["10.12"]
aliases: ["THEOREM 10.8", "COMPARISON TEST"]
---

# 定理10.8(比较判别法)
*Theorem 10.8 (Comparison test)*

## 定义/陈述

Assume $a_n \geq 0$ and $b_n \geq 0$ for all $n \geq 1$. If there exists a positive constant $c$ such that $a_n \leq c b_n$ (10.38) for all $n$, then convergence of $\sum b_n$ implies convergence of $\sum a_n$. Equivalent formulation: divergence of $\sum a_n$ implies divergence of $\sum b_n$. The theorem still holds if (10.38) is valid only for all $n \geq N$ for some $N$, since omitting a finite number of terms does not affect convergence or divergence.

> 适用语境:Series of nonnegative terms
> 出处:`10.12.md`

## 原文锚点

- `10.12.md`:“for all $n$ , then convergence of $\sum b_n$ implies convergence of $\sum a_n$ .”
- `10.12.md`:“Therefore Theorem 10.8 still holds true if the inequality (10.38) is valid only for all $n \geq N$ for some N.”

## 出边(本节点 → 其他)

- 上位/下位 → [[convergence-test]]
- 应用于 → [[series-of-nonnegative-terms]]
- 推导 → [[limit-comparison-test]]
- 推导 → [[riemann-zeta-function]]
- 推导 → [[root-test]]
- 推导 → [[ratio-test]]
- 推导 → [[raabe-test]]
- 推导 → [[gauss-test]]
- 推导 → [[absolute-convergence-implies-convergence]]
- 推导 → [[dirichlet-test]]
- 推广 → [[root-test]]
- 推广 → [[ratio-test]]

## 入边(其他 → 本节点)

- 推导 ← [[bounded-partial-sums-criterion]]
- 推导 ← [[series-tail-invariance]]
- 组成 ← [[dominates]]
- 应用于 ← [[geometric-series]]
- 应用于 ← [[riemann-zeta-function]]
- 其他(类比(定理 10.24 是定理 10.8 比较判别法的瑕积分版本)) ← [[comparison-test-for-improper-integrals]]
