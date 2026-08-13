---
name: "格雷戈里级数(反正切级数)"
name_en: "Gregory's series (arctangent series)"
node_type: concept
origin: source
layer: L1
sections: ["10.8"]
aliases: ["power series for arctan x", "inverse tangent series"]
---

# 格雷戈里级数(反正切级数)
*Gregory's series (arctangent series)*

## 定义/陈述

$x - \frac {x ^ {3}}{3} + \frac {x ^ {5}}{5} - \frac {x ^ {7}}{7} + \dots + \frac {(- 1) ^ {n} x ^ {2 n + 1}}{2 n + 1} + \dots = \arctan x$ (10.33), obtained by integration of (10.29). It converges for each complex $x$ with $|x| < 1$ and also for $x = \pm 1$, and can be used to extend the arctangent to complex $x$ with $|x| < 1$.

> 适用语境:Discovered in 1671 by James Gregory; agrees with the real inverse tangent of Chapter 6
> 出处:`10.08.md`

## 原文锚点

- `10.08.md`:“Gregory's series converges for each complex $x$ with $|x| < 1$ and also for $x = \pm 1$”

## 出边(本节点 → 其他)

- 上位/下位 → [[power-series]]
- 其他(密切相关的交错级数公式(10.47 与 10.46)) → [[alternating-harmonic-series]]

## 入边(其他 → 本节点)

- 推导 ← [[geometric-series-manipulation]]
