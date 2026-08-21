---
name: "用积分比较估计部分和"
name_en: "estimating partial sums by comparison with an integral"
node_type: method
origin: model
layer: L1
sections: ["10.1"]
aliases: ["integral estimate for partial sums"]
---

# 用积分比较估计部分和
*estimating partial sums by comparison with an integral*

## 定义/陈述

To estimate the size of a partial sum, compare it with an appropriate integral: interpreting the terms as areas of rectangles above the graph of $f(x) = 1/x$ yields $1 + \frac {1}{2} + \frac {1}{3} + \dots + \frac {1}{n} \geq \log (n + 1)$ (10.8), since the area under the curve cannot exceed the sum of the rectangle areas.

> 适用语境:Demonstrated for the harmonic partial sums in Section 10.1; the book uses the technique without naming it as a general method
> 出处:`10.01.md`

## 原文锚点

- `10.01.md`:“The area of the shaded region is $\int_{1}^{n + 1}x^{-1}dx = \log (n + 1)$”

## 出边(本节点 → 其他)

- 推导 → [[harmonic-series]]

## 入边(其他 → 本节点)

- 推广 ← [[integral-test]] *(模型推断)*
