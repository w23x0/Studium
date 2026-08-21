---
name: "拉贝判别法"
name_en: "Raabe's test"
node_type: method
origin: source
layer: L1
sections: ["10.15", "10.16"]
---

# 拉贝判别法
*Raabe's test*

## 定义/陈述

Let $\sum a_n$ be a series of positive terms. If there is an $r > 0$ and an $N \geq 1$ such that $\frac{a_{n+1}}{a_n} \leq 1 - \frac{1}{n} - \frac{r}{n}$ for all $n \geq N$, then $\sum a_n$ converges. The series $\sum a_n$ diverges if $\frac{a_{n+1}}{a_n} \geq 1 - \frac{1}{n}$ for all $n \geq N$.

> 适用语境:Series of positive terms; often helpful when the ratio test fails
> 出处:`10.16.md`

## 原文锚点

- `10.16.md`:“Let $\sum a_{n}$ be a series of positive terms. Prove Raabe's test: If there is an $r > 0$ and an $N \geq 1$ such that”
- `10.15.md`:“Two important examples known as Raabe's test and Gauss' test are described in Exercises 16 and 17 of Section 10.16.”

## 出边(本节点 → 其他)

- 上位/下位 → [[convergence-test]]
- 对比/易混淆 → [[ratio-test]]
- 推导 → [[gauss-test]]

## 入边(其他 → 本节点)

- 推导 ← [[comparison-test]]
