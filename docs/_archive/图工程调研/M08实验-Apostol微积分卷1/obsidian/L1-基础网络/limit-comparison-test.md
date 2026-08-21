---
name: "定理10.9(极限比较判别法)"
name_en: "Theorem 10.9 (Limit comparison test)"
node_type: theorem
origin: source
layer: L1
sections: ["10.12"]
aliases: ["THEOREM 10.9", "LIMIT COMPARISON TEST"]
---

# 定理10.9(极限比较判别法)
*Theorem 10.9 (Limit comparison test)*

## 定义/陈述

Assume that $a_n > 0$ and $b_n > 0$ for all $n \geq 1$, and suppose that $\lim_{n \to \infty} a_n/b_n = 1$ (10.39). Then $\sum a_n$ converges if and only if $\sum b_n$ converges. The theorem also holds if $\lim_{n \to \infty} a_n/b_n = c$ provided $c > 0$. If $\lim_{n \to \infty} a_n/b_n = 0$, one concludes only that convergence of $\sum b_n$ implies convergence of $\sum a_n$.

> 适用语境:Series of positive terms
> 出处:`10.12.md`

## 原文锚点

- `10.12.md`:“Then $\sum a_{n}$ converges if and only if $\sum b_{n}$ converges.”
- `10.12.md`:“However, if $\lim_{n\to \infty}a_n / b_n = 0$ , we conclude only that convergence of $\sum b_{n}$ implies convergence of $\sum a_{n}$ .”

## 出边(本节点 → 其他)

- 上位/下位 → [[convergence-test]]
- 应用于 → [[series-of-nonnegative-terms]]

## 入边(其他 → 本节点)

- 推导 ← [[comparison-test]]
- 等价 ← [[asymptotic-comparison-theorem]]
- 其他(类比(定理 10.25 是定理 10.9 极限比较判别法的瑕积分版本)) ← [[limit-comparison-test-for-improper-integrals]]
