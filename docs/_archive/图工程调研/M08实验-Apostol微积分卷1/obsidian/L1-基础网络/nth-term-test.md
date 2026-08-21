---
name: "定理10.6(收敛级数的第n项趋于0)"
name_en: "Theorem 10.6 (nth term of a convergent series tends to 0)"
node_type: theorem
origin: source
layer: L1
sections: ["10.11"]
aliases: ["THEOREM 10.6", "nth-term test", "necessary condition for convergence"]
---

# 定理10.6(收敛级数的第n项趋于0)
*Theorem 10.6 (nth term of a convergent series tends to 0)*

## 定义/陈述

If the series $\sum a_n$ converges, then its nth term tends to 0; that is, $\lim_{n \to \infty} a_n = 0$ (10.37). This condition is necessary but not sufficient for convergence (e.g. $a_n = 1/n$ satisfies $a_n \to 0$ but $\sum 1/n$ diverges). Its contrapositive gives a sufficient condition for divergence: if the terms $a_n$ do not tend to zero, the series must diverge.

> 适用语境:Any infinite series $\sum a_n$
> 出处:`10.11.md`

## 原文锚点

- `10.11.md`:“THEOREM 10.6. If the series $\sum a_{n}$ converges, then its nth term tends to 0; that is,”
- `10.11.md`:“That is, if the terms $a_{n}$ of a series $\sum a_{n}$ do not tend to zero, then the series must diverge.”

## 出边(本节点 → 其他)

- 推导 → [[theorem-10-5-geometric-series]] *(模型推断)*
- 推导 → [[root-test]]
- 推导 → [[ratio-test]] *(模型推断)*
- 推导 → [[riemann-rearrangement-theorem]]
- 上位/下位 → [[convergence-test]]
- 对比/易混淆 → [[infinite-integral]]

## 入边(其他 → 本节点)

- 推导 ← [[partial-sum]]
- 其他(counterexample: 调和级数证明条件 (10.37) 非充分) ← [[harmonic-series]]
