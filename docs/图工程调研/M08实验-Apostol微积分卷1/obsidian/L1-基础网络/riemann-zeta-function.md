---
name: "黎曼zeta函数"
name_en: "Riemann zeta-function"
node_type: concept
origin: source
layer: L1
sections: ["10.12", "10.13"]
aliases: ["zeta-function", "$\zeta(s)$"]
---

# 黎曼zeta函数
*Riemann zeta-function*

## 定义/陈述

$\zeta(s) = \sum_{n=1}^{\infty} \frac{1}{n^s}$ if $s > 1$. By the integral test, the series $\sum_{n=1}^{\infty} 1/n^s$ converges if and only if $s > 1$; for $s \leq 1$ it diverges (the case $s = 1$ is the harmonic series). Euler found that $\zeta(2) = \pi^2/6$.

> 适用语境:Real $s > 1$
> 出处:`10.12.md`

## 原文锚点

- `10.12.md`:“defines an important function in analysis known as the Riemann zeta-function:”
- `10.13.md`:“The geometric series and the zeta-function are useful for this purpose.”

## 出边(本节点 → 其他)

- 应用于 → [[comparison-test]]
- 推广 → [[harmonic-series]]
- 其他(敛散行为类比(∫₁^∞ x^{-s}dx 与 ζ(s) 级数均在 s>1 收敛、s≤1 发散)) → [[infinite-integral]]

## 入边(其他 → 本节点)

- 推导 ← [[theorem-10-4-telescoping]]
- 推导 ← [[asymptotic-comparison-theorem]]
- 推导 ← [[comparison-test]]
- 推导 ← [[integral-test]]
