---
name: "复指数几何级数部分和的恒等式与估计(定理 10.19)"
name_en: "Partial-sum identity and bound for the series of complex exponentials (Theorem 10.19)"
node_type: theorem
origin: source
layer: L1
sections: ["10.19"]
aliases: ["THEOREM 10.19"]
---

# 复指数几何级数部分和的恒等式与估计(定理 10.19)
*Partial-sum identity and bound for the series of complex exponentials (Theorem 10.19)*

## 定义/陈述

For every real $\theta$ not an integer multiple of $\pi$, we have the identity $\sum_{k=1}^{n} e^{2ik\theta} = \frac{\sin n\theta}{\sin \theta} e^{i(n+1)\theta}$ (10.53), from which we obtain the estimate $\left|\sum_{k=1}^{n} e^{2ik\theta}\right| \leq \frac{1}{|\sin \theta|}$ (10.54).

> 适用语境:$|x|=1$, $x \neq 1$ 的几何级数 $\sum x^n$ 部分和有界,供 Dirichlet 判别法使用
> 出处:`10.19.md`

## 原文锚点

- `10.19.md`:“For every real $\theta$ not an integer multiple of $\pi$ , we have the identity”
- `10.19.md`:“An important example of a divergent series with bounded partial sums is the geometric series”

## 出边(本节点 → 其他)

- 应用于 → [[dirichlet-test]]

## 入边(其他 → 本节点)

- 推导 ← [[geometric-series]]
