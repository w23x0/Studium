---
name: "第二类瑕积分"
name_en: "Improper integral of the second kind"
node_type: concept
origin: source
layer: L1
sections: ["10.23"]
---

# 第二类瑕积分
*Improper integral of the second kind*

## 定义/陈述

Suppose $f$ is defined on the half-open interval $(a,b]$, and assume that $\int_{x}^{b}f(t)dt$ exists for each $x$ satisfying $a<x\leq b$. Define $I(x)=\int_{x}^{b}f(t)dt$ if $a<x\leq b$. The function $I$ so defined is called an improper integral of the second kind, denoted $\int_{a+}^{b}f(t)dt$. The integral converges if $\lim_{x\to a+}I(x)$ exists and is finite; otherwise it diverges. If the limit exists and equals $A$, the number $A$ is called the value of the integral, and we write $\int_{a+}^{b}f(t)dt=A$.

> 适用语境:Finite interval with $f$ unbounded (undefined) at an endpoint; integrals $\int_{a}^{b-}f(t)dt$ are defined in a similar fashion. The convergence tests of Theorems 10.23 through 10.25 have straightforward analogs for this kind.
> 出处:`10.23.md`

## 原文锚点

- `10.23.md`:“The function I so defined is called an improper integral of the second kind and is denoted by the symbol”

## 出边(本节点 → 其他)

- 上位/下位 → [[improper-integral]]
- 前置 → [[mixed-improper-integral-notation]]
- 前置 → [[gamma-function]]

## 入边(其他 → 本节点)

- 对比/易混淆 ← [[infinite-integral]]
- 前置 ← [[proper-integral]]
- 应用于 ← [[boundedness-criterion-for-improper-integrals]]
- 应用于 ← [[comparison-test-for-improper-integrals]]
- 应用于 ← [[limit-comparison-test-for-improper-integrals]]
