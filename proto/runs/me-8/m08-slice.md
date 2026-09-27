# M08 · 力学 · 动量（K&K 第 4 章） · 本闭环片
> 资料：Kleppner & Kolenkow, *An Introduction to Mechanics*, 2nd ed., Cambridge UP, 2014 第 4 章（正文与例题，不含习题）。原文：`~/w23x/学习资料/大学物理/力学/Kleppner-Kolenkow-2014/`。
> 来源：由 M08 抽取调用生成（`runs/m08-extract-ch4-v2/`，opus，一次调用）；〔p.N〕= 引文逐字匹配原文后得到的书上页码。**资料抽取** = 有原文锚点；**模型综合** = 书里没有明写，视为候选；**人工更正** = agent 读原文后的更正，写明原因。
> 锚定：K3、K2；前置：P1、P2、P3、K1、P9（由 M05 设计闭环时索引）

## 知识点

| 编号 | 名称 | 类型 | 一句话 | 引文 | 来源 |
| --- | --- | --- | --- | --- | --- |
| P1 | 牛顿第二定律 F=Ma | 前置 | — | 2.5 | 资料抽取 |
| P2 | 牛顿第三定律 | 前置 | — | 2.6 | 资料抽取 |
| P3 | 矢量代数与矢量对时间求导 | 前置 | — | 1.3、1.8、1.10 | 资料抽取 |
| P9 | 惯性系 | 前置 | — | 2.4 | 资料抽取 |
| K1 | 动量与 F=dP/dt 形式的第二定律 | 概念 | 动量 P=Mv 是矢量，第二定律写成力等于动量变化率，这种形式便于推广到复杂系统。 | "The quantity Mv plays a prominent role in mechanics and is called momentum, or sometimes lin ear momentum, to distinguish it from angular momentum."〔p.116〕 ‖ "it is readily generalized to complex systems, as we shall soon see, and because momentum turns out to be more fundamental than mass or velocity separately"〔p.116〕 | 资料抽取 |
| K2 | 系统的选取与内力/外力划分 | 概念 | 系统边界可以任意选取，但选定后必须始终保持一致；作用在粒子上的力分为系统内其他粒子的内力和系统外来源的外力。 | "We are free to choose the boundaries of a system as we please, but once the choice is made, we must be consistent"〔p.117〕 ‖ "We suppose that the particles in the system interact with particles outside the system as well as with each other."〔p.117〕 | 资料抽取 |
| K3 | 质点系动量定理：总外力等于总动量变化率 | 原理 | 把各粒子的运动方程相加，内力按第三定律成对抵消，得到系统所受总外力等于系统总动量的变化率。 | "According to Newton’s third law, the forces between any two particles are equal and opposite so that their sum is zero."〔p.118〕 ‖ "In words, the total force applied to a system equals the rate of change of the system’s momentum."〔p.118〕 | 资料抽取 |

## 关系

| 从 | 到 | 类型 | 依据 | 来源 |
| --- | --- | --- | --- | --- |
| P1 | K1 | 推导 | "We begin by restating Newton’s second law in a slightly modified form."〔p.116〕 | 资料抽取 |
| P3 | K1 | 前置 | 动量是矢量，F=dP/dt 需要对矢量求时间导数。 | 模型综合 |
| K1 | K3 | 推导 | "add the equations of motion of all the particles in the system"〔p.117〕 | 资料抽取 |
| K2 | K3 | 前置 | "We suppose that the particles in the system interact with particles outside the system as well as with each other."〔p.117〕 | 资料抽取 |
| P2 | K3 | 推导 | "It follows that the internal forces all cancel in pairs so that the sum of al the forces between all the particles is also zero."〔p.118〕 | 资料抽取 |
