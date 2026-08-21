---
name: "定理 10.5(几何级数的和)"
name_en: "Theorem 10.5 (sum of the geometric series)"
node_type: theorem
origin: source
layer: L1
sections: ["10.8"]
aliases: ["THEOREM 10.5"]
---

# 定理 10.5(几何级数的和)
*Theorem 10.5 (sum of the geometric series)*

## 定义/陈述

THEOREM 10.5. If $x$ is complex, with $|x| < 1$, the geometric series $\sum_{n=0}^{\infty} x^n$ converges and has sum $1 / (1 - x)$: $1 + x + x ^ {2} + \dots + x ^ {n} + \dots = \frac {1}{1 - x}$ if $|x| < 1$ (10.25). If $|x| \geq 1$, the series diverges.

> 适用语境:x complex; divergence for $|x| \geq 1$ because $x^{n}$ does not tend to 0
> 出处:`10.08.md`

## 原文锚点

- `10.08.md`:“If $|x| \geq 1$ , the series diverges.”

## 出边(本节点 → 其他)

- 前置 → [[geometric-series-manipulation]]
- 推导 → [[root-test]]
- 推导 → [[ratio-test]]

## 入边(其他 → 本节点)

- 推导 ← [[telescoping-property]]
- 推导 ← [[basic-sequence-limit-formulas]]
- 推导 ← [[nth-term-test]] *(模型推断)*
- 前置 ← [[geometric-series]]
