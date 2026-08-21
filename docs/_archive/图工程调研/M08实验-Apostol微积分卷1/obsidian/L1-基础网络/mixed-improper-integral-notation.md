---
name: "双侧及混合型瑕积分记号"
name_en: "Notation for two-sided and mixed improper integrals"
node_type: notation
origin: source
layer: L1
sections: ["10.23"]
aliases: ["$\int_{a+}^{b-}$ notation"]
---

# 双侧及混合型瑕积分记号
*Notation for two-sided and mixed improper integrals*

## 定义/陈述

If $\int_{a+}^{c}f(t)dt$ and $\int_{c}^{b-}f(t)dt$ both converge, we write $\int_{a+}^{b-}f(t)dt=\int_{a+}^{c}f(t)dt+\int_{c}^{b-}f(t)dt$. Some authors write $\int_{a}^{b}$ where we have written $\int_{a+}^{b-}$. The definition extends to any finite number of summands (e.g. $f$ undefined at interior points), and to "mixed" combinations such as $\int_{a+}^{b}f(t)dt+\int_{b}^{\infty}f(t)dt$, written $\int_{a+}^{\infty}f(t)dt$.

> 适用语境:Combining improper integrals of the second kind at several points, and mixing first and second kinds over one symbol.
> 出处:`10.23.md`

## 原文锚点

- `10.23.md`:“Note: Some authors write $\int_{a}^{b}$ where we have written $\int_{a+}^{b-}$ .”
- `10.23.md`:“Furthermore, we can consider “mixed” combinations such as $\int_{a+}^{b} f(t) dt + \int_{b}^{\infty} f(t) dt$ which we write as $\int_{a+}^{\infty} f(t) dt$”

## 出边(本节点 → 其他)

- 前置 → [[gamma-function]]

## 入边(其他 → 本节点)

- 前置 ← [[improper-integral-second-kind]]
- 前置 ← [[infinite-integral]]
