---
name: "由几何级数推导新级数的方法"
name_en: "deriving new series from the geometric series"
node_type: method
origin: model
layer: L1
sections: ["10.8"]
aliases: ["substitution, multiplication, differentiation and integration of power series"]
---

# 由几何级数推导新级数的方法
*deriving new series from the geometric series*

## 定义/陈述

Starting from $1/(1-x) = \sum x^{n}$ for $|x| < 1$, new series sums are obtained by substituting for x (e.g. $x^2$, $-x$, $2x$), multiplying both sides by x, and by differentiating or integrating both sides term by term, yielding formulas (10.26) through (10.33) such as the logarithmic series and Gregory's series.

> 适用语境:Presented by example in Section 10.8; theoretical justification for differentiation and integration deferred to the general theory of real power series (Section 11.8)
> 出处:`10.08.md`

## 原文锚点

- `10.08.md`:“it is permissible to differentiate and to integrate both sides of each of the Equations (10.25) through (10.30)”

## 出边(本节点 → 其他)

- 推导 → [[logarithmic-series]]
- 推导 → [[gregory-series]]

## 入边(其他 → 本节点)

- 前置 ← [[theorem-10-5-geometric-series]]
- 应用于 ← [[theorem-10-2-linearity]]
