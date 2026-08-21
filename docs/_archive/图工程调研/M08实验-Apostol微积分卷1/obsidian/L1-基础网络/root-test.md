---
name: "定理10.12(根值判别法)"
name_en: "Theorem 10.12 (Root test)"
node_type: theorem
origin: source
layer: L1
sections: ["10.15"]
aliases: ["THEOREM 10.12", "ROOT TEST"]
---

# 定理10.12(根值判别法)
*Theorem 10.12 (Root test)*

## 定义/陈述

Let $\sum a_n$ be a series of nonnegative terms such that $a_n^{1/n} \to R$ as $n \to \infty$. (a) If $R < 1$, the series converges. (b) If $R > 1$, the series diverges. (c) If $R = 1$, the test is inconclusive (both $\sum 1/n$, divergent, and $\sum 1/n^2$, convergent, give $R = 1$). The test is a special case of the comparison test with a geometric series $\sum x^n$ as comparison series.

> 适用语境:Series of nonnegative terms with convergent sequence $\{a_n^{1/n}\}$
> 出处:`10.15.md`

## 原文锚点

- `10.15.md`:“THEOREM 10.12. ROOT TEST. Let $\sum a_{n}$ be a series of nonnegative terms such that”
- `10.15.md`:“To prove (b), we observe that R > 1 implies $a_{n} > 1$ for infinitely many values of n and hence $a_{n}$ cannot tend to 0.”

## 出边(本节点 → 其他)

- 上位/下位 → [[convergence-test]]
- 应用于 → [[series-of-nonnegative-terms]]
- 对比/易混淆 → [[ratio-test]]

## 入边(其他 → 本节点)

- 推导 ← [[theorem-10-5-geometric-series]]
- 推导 ← [[comparison-test]]
- 推导 ← [[nth-term-test]]
- 推导 ← [[basic-sequence-limit-formulas]]
- 推广 ← [[comparison-test]]
- 其他(counterexample: R = 1 时判别法失效的反例之一) ← [[harmonic-series]]
