---
name: "对数级数(墨卡托级数)"
name_en: "logarithmic series (Mercator's series)"
node_type: concept
origin: source
layer: L1
sections: ["10.8"]
aliases: ["Mercator's series", "power series for log(1+x)"]
---

# 对数级数(墨卡托级数)
*logarithmic series (Mercator's series)*

## 定义/陈述

$x - \frac {x ^ {2}}{2} + \frac {x ^ {3}}{3} - \frac {x ^ {4}}{4} + \dots + \frac {(- 1) ^ {n} x ^ {n + 1}}{n + 1} + \dots = \log (1 + x)$ (10.32), obtained by integration of (10.28); valid for $-1 < x < +1$ and also at the endpoint $x = +1$.

> 适用语境:Discovery of Mercator and Brouncker (1668); formal justification deferred to Section 11.8
> 出处:`10.08.md`

## 原文锚点

- `10.08.md`:“it turns out that the logarithmic series in (10.32) is valid at the endpoint $x = +1$ as well”

## 出边(本节点 → 其他)

- 上位/下位 → [[power-series]]
- 推广 → [[alternating-harmonic-series]]

## 入边(其他 → 本节点)

- 推导 ← [[geometric-series-manipulation]]
