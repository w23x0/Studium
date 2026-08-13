---
name: "伽马函数"
name_en: "Gamma function"
node_type: concept
origin: source
layer: L1
sections: ["10.23", "10.24"]
aliases: ["$\Gamma(s)$"]
---

# 伽马函数
*Gamma function*

## 定义/陈述

If $s>0$ the integral $\int_{0+}^{\infty}e^{-t}t^{s-1}dt$ converges (interpreted as the sum $\int_{0+}^{1}e^{-t}t^{s-1}dt+\int_{1}^{\infty}e^{-t}t^{s-1}dt$). When $s>0$, this sum is denoted by $\Gamma(s)$. The function $\Gamma$ so defined is called the gamma function, first introduced by Euler in 1729. It has the property that $\Gamma(n+1)=n!$ when $n$ is any integer $\geq 0$; more generally $\Gamma(s+1)=s\Gamma(s)$ (Exercise 19 of Section 10.24).

> 适用语境:Defined for $s>0$ as a mixed improper integral.
> 出处:`10.23.md`

## 原文锚点

- `10.23.md`:“The function $\Gamma$ so defined is called the gamma function, first introduced by Euler in 1729.”
- `10.24.md`:“Use integration by parts to show $\Gamma(s + 1) = s \Gamma(s)$ . Then use induction to prove that”

## 入边(其他 → 本节点)

- 推导 ← [[limit-comparison-test-for-improper-integrals]]
- 推导 ← [[comparison-test-for-improper-integrals]]
- 前置 ← [[mixed-improper-integral-notation]]
- 前置 ← [[infinite-integral]]
- 前置 ← [[improper-integral-second-kind]]
