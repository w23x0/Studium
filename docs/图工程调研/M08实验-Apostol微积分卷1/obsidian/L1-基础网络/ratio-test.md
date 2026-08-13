---
name: "定理10.13(比值判别法)"
name_en: "Theorem 10.13 (Ratio test)"
node_type: theorem
origin: source
layer: L1
sections: ["10.15"]
aliases: ["THEOREM 10.13", "RATIO TEST"]
---

# 定理10.13(比值判别法)
*Theorem 10.13 (Ratio test)*

## 定义/陈述

Let $\sum a_n$ be a series of positive terms such that $a_{n+1}/a_n \to L$ as $n \to \infty$. (a) If $L < 1$, the series converges. (b) If $L > 1$, the series diverges. (c) If $L = 1$, the test is inconclusive. Warning: even if the test ratio $a_{n+1}/a_n$ is always less than 1, the limit $L$ need not be less than 1 (e.g. the divergent harmonic series has test ratio $n/(n+1) < 1$ with $L = 1$). Like the root test, it is a special case of the comparison test with a geometric series.

> 适用语境:Series of positive terms with convergent ratio sequence
> 出处:`10.15.md`

## 原文锚点

- `10.15.md`:“THEOREM 10.13. RATIO TEST. Let $\sum a_{n}$ be a series of positive terms such that”
- `10.15.md`:“Warning. If the test ratio $a_{n+1}/a_{n}$ is always less than 1, it does not necessarily follow that the limit L will be less than 1.”

## 出边(本节点 → 其他)

- 上位/下位 → [[convergence-test]]
- 应用于 → [[series-of-nonnegative-terms]]

## 入边(其他 → 本节点)

- 推导 ← [[theorem-10-5-geometric-series]]
- 推导 ← [[comparison-test]]
- 推导 ← [[nth-term-test]] *(模型推断)*
- 推广 ← [[comparison-test]]
- 对比/易混淆 ← [[root-test]]
- 对比/易混淆 ← [[raabe-test]]
- 对比/易混淆 ← [[gauss-test]]
- 其他(counterexample: 比值恒小于 1 但 L = 1 且发散) ← [[harmonic-series]]
