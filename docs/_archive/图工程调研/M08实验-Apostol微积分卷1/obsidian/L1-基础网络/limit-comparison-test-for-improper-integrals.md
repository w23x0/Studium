---
name: "定理10.25(瑕积分极限比较判别法)"
name_en: "Theorem 10.25. Limit comparison test"
node_type: theorem
origin: source
layer: L1
sections: ["10.23"]
aliases: ["limit comparison test for improper integrals"]
---

# 定理10.25(瑕积分极限比较判别法)
*Theorem 10.25. Limit comparison test*

## 定义/陈述

THEOREM 10.25 (LIMIT COMPARISON TEST). Assume both proper integrals $\int_{a}^{b}f(x)dx$ and $\int_{a}^{b}g(x)dx$ exist for each $b\geq a$, where $f(x)\geq 0$ and $g(x)>0$ for all $x\geq a$. If $\lim_{x\to+\infty}f(x)/g(x)=c$ with $c\neq 0$ (10.63), then both integrals $\int_{a}^{\infty}f(x)dx$ and $\int_{a}^{\infty}g(x)dx$ converge or both diverge. Note: If the limit in (10.63) is 0, we can conclude only that convergence of $\int_{a}^{\infty}g(x)dx$ implies convergence of $\int_{a}^{\infty}f(x)dx$.

> 适用语境:Improper integrals of the first kind with $f\geq 0$, $g>0$; analog of the limit comparison test for series.
> 出处:`10.23.md`

## 原文锚点

- `10.23.md`:“THEOREM 10.25. LIMIT COMPARISON TEST. Assume both proper integrals”
- `10.23.md`:“then both integrals $\int_{a}^{\infty}f(x)dx$ and $\int_{a}^{\infty}g(x)dx$ converge or both diverge.”

## 出边(本节点 → 其他)

- 其他(类比(定理 10.25 是定理 10.9 极限比较判别法的瑕积分版本)) → [[limit-comparison-test]]
- 推导 → [[gamma-function]]
- 应用于 → [[infinite-integral]]
- 应用于 → [[improper-integral-second-kind]]

## 入边(其他 → 本节点)

- 推导 ← [[boundedness-criterion-for-improper-integrals]]
