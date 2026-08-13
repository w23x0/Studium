---
name: "欧拉常数"
name_en: "Euler's constant"
node_type: concept
origin: source
layer: L1
sections: ["10.17", "10.21"]
aliases: ["C", "$\gamma$", "formula (10.50)", "harmonic partial sums asymptotically equal to log n"]
---

# 欧拉常数
*Euler's constant*

## 定义/陈述

$\lim_{n \to \infty} \left(1 + \frac{1}{2} + \dots + \frac{1}{n} - \log n\right) = C$ (10.49). The number C defined by this limit is called Euler's constant (sometimes denoted by $\gamma$). Its value, correct to ten decimals, is 0.5772156649. Equivalently $\sum_{k=1}^{n} \frac{1}{k} = \log n + C + o(1)$ as $n \to \infty$ (10.50).

> 适用语境:调和级数部分和的渐近行为;是否为有理数至今未决
> 出处:`10.17.md`

## 定义/陈述

$\sum_{k=1}^{n} \frac{1}{k} = \log n + C + o(1)$ as $n \to \infty$ (10.50), hence $\sum_{k=1}^{n} \frac{1}{k} \sim \log n$: the partial sums of the harmonic series are asymptotically equal to $\log n$.

> 适用语境:用于计算交错调和级数之和(例 4)及 10.21 节重排级数之和
> 出处:`10.17.md`

## 原文锚点

- `10.17.md`:“The number C defined by this limit is called Euler's constant”
- `10.17.md`:“Its value, correct to ten decimals, is 0.5772156649.”
- `10.17.md`:“so the partial sums of the harmonic series are asymptotically equal to $\log n$”
- `10.20.md`:“In each of the last three sums, we use the asymptotic relation”

## 出边(本节点 → 其他)

- 推导 → [[alternating-harmonic-series]]
- 应用于 → [[harmonic-series]]
- 应用于 → [[rearrangement-of-series]]

## 入边(其他 → 本节点)

- 推导 ← [[leibniz-rule]]
- 前置 ← [[asymptotically-equal]]
