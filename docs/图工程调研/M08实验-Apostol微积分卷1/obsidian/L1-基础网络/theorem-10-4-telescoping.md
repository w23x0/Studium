---
name: "定理 10.4(裂项级数的收敛性)"
name_en: "Theorem 10.4 (convergence of telescoping series)"
node_type: theorem
origin: source
layer: L1
sections: ["10.7"]
aliases: ["THEOREM 10.4"]
---

# 定理 10.4(裂项级数的收敛性)
*Theorem 10.4 (convergence of telescoping series)*

## 定义/陈述

THEOREM 10.4. Let $\{a_{n}\}$ and $\{b_{n}\}$ be two sequences of complex numbers such that $a _ {n} = b _ {n} - b _ {n + 1}$ for $n = 1, 2, 3, \dots$ (10.23). Then the series $\sum a_{n}$ converges if and only if the sequence $\{b_n\}$ converges, in which case $\sum_ {n = 1} ^ {\infty} a _ {n} = b _ {1} - L$, where $L = \lim _ {n \to \infty} b _ {n}$ (10.24).

> 适用语境:Telescoping series of complex terms
> 出处:`10.07.md`

## 原文锚点

- `10.07.md`:“Then the series $\sum a_{n}$ converges if and only if the sequence $\{b_n\}$ converges, in which case we have”

## 出边(本节点 → 其他)

- 推导 → [[riemann-zeta-function]]
- 推导 → [[dirichlet-test]]

## 入边(其他 → 本节点)

- 前置 ← [[telescoping-series]]
- 推导 ← [[telescoping-property]]
