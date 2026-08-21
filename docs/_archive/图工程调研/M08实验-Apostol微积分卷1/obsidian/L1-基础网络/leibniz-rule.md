---
name: "莱布尼茨判别法(莱布尼茨法则)"
name_en: "Leibniz's rule"
node_type: theorem
origin: source
layer: L1
sections: ["10.17", "10.19"]
aliases: ["THEOREM 10.14", "Leibniz's rule for alternating series"]
---

# 莱布尼茨判别法(莱布尼茨法则)
*Leibniz's rule*

## 定义/陈述

If $\{a_n\}$ is a monotonic decreasing sequence with limit 0, then the alternating series $\sum_{n=1}^{\infty} (-1)^{n-1} a_n$ converges. If $S$ denotes its sum and $s_n$ its nth partial sum, we also have the inequalities $0 < (-1)^n (S - s_n) < a_{n+1}$ for each $n \geq 1$ (10.48): 误差与第一个被舍弃项同号,且绝对值小于该项。

> 适用语境:交错级数 $\sum (-1)^{n-1} a_n$,$a_n$ 单调递减趋于 0
> 出处:`10.17.md`

## 原文锚点

- `10.17.md`:“If $\{a_n\}$ is a monotonic decreasing sequence with limit 0, then the alternating series $\sum_{n=1}^{\infty} (-1)^{n-1} a_n$ converges”
- `10.19.md`:“Note that Leibniz's rule for alternating series is merely the special case in which $x = -1$”

## 出边(本节点 → 其他)

- 应用于 → [[alternating-series]]
- 推导 → [[alternating-harmonic-series]]
- 推导 → [[euler-constant]]

## 入边(其他 → 本节点)

- 前置 ← [[alternating-series]]
- 前置 ← [[decreasing-sequence]]
- 推导 ← [[theorem-10-1-monotonic-convergence]]
- 推广 ← [[dirichlet-test]]
