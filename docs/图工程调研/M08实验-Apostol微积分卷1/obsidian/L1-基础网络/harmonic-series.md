---
name: "调和级数"
name_en: "harmonic series"
node_type: concept
origin: source
layer: L1
sections: ["10.1", "10.5"]
---

# 调和级数
*harmonic series*

## 定义/陈述

The series $\sum_{k=1}^{\infty} 1/k$. Its partial sums satisfy $s _ {n} = \sum_ {k = 1} ^ {n} \frac {1}{k} \geq \log (n + 1)$, and since $\log(n+1)\to\infty$ the series diverges.

> 适用语境:Standard example of a divergent series (Example 1, Section 10.5; inequality derived in 10.1)
> 出处:`10.05.md`

## 原文锚点

- `10.01.md`:“1 + \frac {1}{2} + \frac {1}{3} + \dots + \frac {1}{n} \geq \log (n + 1).\tag{10.8}”

## 出边(本节点 → 其他)

- 上位/下位 → [[divergent-series]]
- 其他(counterexample: 调和级数证明条件 (10.37) 非充分) → [[nth-term-test]]
- 其他(counterexample: R = 1 时判别法失效的反例之一) → [[root-test]]
- 其他(counterexample: 比值恒小于 1 但 L = 1 且发散) → [[ratio-test]]

## 入边(其他 → 本节点)

- 其他(历史动机:变速情形的级数 (10.5) 引出调和级数及其发散性) ← [[racecourse-paradox]]
- 推导 ← [[integral-comparison-estimate]]
- 对比/易混淆 ← [[geometric-series]]
- 对比/易混淆 ← [[alternating-harmonic-series]]
- 推广 ← [[riemann-zeta-function]]
- 应用于 ← [[euler-constant]]
