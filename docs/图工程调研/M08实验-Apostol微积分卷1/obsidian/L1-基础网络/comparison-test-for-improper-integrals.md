---
name: "定理10.24(瑕积分比较判别法)"
name_en: "Theorem 10.24"
node_type: theorem
origin: source
layer: L1
sections: ["10.23"]
aliases: ["comparison test for improper integrals"]
---

# 定理10.24(瑕积分比较判别法)
*Theorem 10.24*

## 定义/陈述

THEOREM 10.24. Assume the proper integral $\int_{a}^{b}f(x)dx$ exists for each $b\geq a$ and suppose that $0\leq f(x)\leq g(x)$ for all $x\geq a$, where $\int_{a}^{\infty}g(x)dx$ converges. Then $\int_{a}^{\infty}f(x)dx$ also converges and $\int_{a}^{\infty}f(x)dx\leq\int_{a}^{\infty}g(x)dx$.

> 适用语境:Improper integrals of the first kind with $0\leq f\leq g$; analog of the comparison test for series.
> 出处:`10.23.md`

## 原文锚点

- `10.23.md`:“where $\int_{a}^{\infty} g(x) dx$ converges. Then $\int_{a}^{\infty} f(x) dx$ also converges and”

## 出边(本节点 → 其他)

- 前置 → [[dominated-integral]]
- 其他(类比(定理 10.24 是定理 10.8 比较判别法的瑕积分版本)) → [[comparison-test]]
- 推导 → [[gamma-function]]
- 应用于 → [[infinite-integral]]
- 应用于 → [[improper-integral-second-kind]]

## 入边(其他 → 本节点)

- 推导 ← [[boundedness-criterion-for-improper-integrals]]
