---
name: "高斯判别法"
name_en: "Gauss' test"
node_type: method
origin: source
layer: L1
sections: ["10.15", "10.16"]
aliases: ["Gauss's test"]
---

# 高斯判别法
*Gauss' test*

## 定义/陈述

Let $\sum a_n$ be a series of positive terms. If there is an $N \geq 1$, an $s > 1$, and an $M > 0$ such that $\frac{a_{n+1}}{a_n} = 1 - \frac{A}{n} + \frac{f(n)}{n^s}$ for $n \geq N$, where $|f(n)| \leq M$ for all $n$, then $\sum a_n$ converges if $A > 1$ and diverges if $A \leq 1$.

> 适用语境:Series of positive terms; often helpful when the ratio test fails
> 出处:`10.16.md`

## 原文锚点

- `10.16.md`:“where $|f(n)| \leq M$ for all $n$ , then $\sum a_{n}$ converges if $A > 1$ and diverges if $A \leq 1$ .”
- `10.15.md`:“Two important examples known as Raabe's test and Gauss' test are described in Exercises 16 and 17 of Section 10.16.”

## 出边(本节点 → 其他)

- 上位/下位 → [[convergence-test]]
- 对比/易混淆 → [[ratio-test]]

## 入边(其他 → 本节点)

- 推导 ← [[comparison-test]]
- 推导 ← [[raabe-test]]
