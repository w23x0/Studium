---
name: "级数的重排"
name_en: "Rearrangement of a series"
node_type: concept
origin: source
layer: L1
sections: ["10.21"]
---

# 级数的重排
*Rearrangement of a series*

## 定义/陈述

If $\sum a_n$ and $\sum b_n$ are two series such that for every $n \geq 1$ we have $b_n = a_{f(n)}$ for some permutation $f$ of $\mathbf{P}$, then the series $\sum b_n$ is said to be a rearrangement of $\sum a_n$.

> 适用语境:任意级数;重排可能改变条件收敛级数的和(如交错调和级数重排后和为 $\frac{3}{2}\log 2$)
> 出处:`10.20.md`

## 原文锚点

- `10.20.md`:“then the series $\sum b_{n}$ is said to be a rearrangement of $\sum a_{n}$”
- `10.20.md`:“The foregoing example shows that rearrangement of the terms of a convergent series may alter its sum.”

## 出边(本节点 → 其他)

- 前置 → [[rearrangement-absolute-convergence-theorem]]
- 应用于 → [[alternating-harmonic-series]]

## 入边(其他 → 本节点)

- 前置 ← [[permutation-of-positive-integers]]
- 应用于 ← [[euler-constant]]
