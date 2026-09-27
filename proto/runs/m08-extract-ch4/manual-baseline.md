# M08 · 力学 · 动量与质量流动（最小版）

> 状态：v0 草稿（2026-09-27）。通用知识结构，**不属于任何学习者**，不含“谁会什么”。
> 资料：Kleppner & Kolenkow, *An Introduction to Mechanics*, 2nd ed., Cambridge UP, 2014（下称 K&K）第 4 章。
> 原文：`~/w23x/学习资料/大学物理/力学/Kleppner-Kolenkow-2014/`（MinerU 转换，`source.json`）。页码 = 书上印的页码（= PDF 页 − 22）。
> 范围：第 4 章全部 + 它用到的前置（前置只写名字与出处，不展开）。
> 来源：**资料抽取** = 有原文锚点；**模型综合** = 书里没有逐字写出，由模型补，视为候选。

## 1. 知识点

类型：概念 / 原理 / 方法 / 前置（前置 = 本章之外，只列名）。锚点引文取自转换后的文本，原样照抄。

| 编号 | 名称 | 类型 | 一句话 | 锚点（页 · 原文） | 来源 |
| --- | --- | --- | --- | --- | --- |
| P1 | 牛顿第二定律（单质点） | 前置 | 单质点 F = Ma | §2.5 | 资料抽取 |
| P2 | 牛顿第三定律 | 前置 | 作用力与反作用力等大反向 | §2.6 | 资料抽取 |
| P3 | 相对速度 / 伽利略速度变换 | 前置 | 同一运动在两个平移参考系里的速度相差参考系的相对速度 | p.43 习题 1.19 “By relative velocity we mean velocity with respect to a specified coordinate system”；正式推导在 §9.2（p.342，**书中排在第 4 章之后**） | 资料抽取 |
| P4 | 微分与一阶小量 | 前置 | Δt → 0 时，两个小量的乘积比一阶项更快趋于零 | — | 模型综合 |
| P5 | 分离变量积分 | 前置 | 把 dv 与 dM/M 分到两边分别积分 | — | 模型综合 |
| K1 | 动量 | 概念 | P = Mv；把第二定律写成 F = dP/dt，因为这种写法能推广到复杂系统 | p.116 “because it is readily generalized to complex systems” | 资料抽取 |
| K2 | 系统（边界的选取） | 概念 | 系统边界可以任意选，一旦选定，哪些粒子属于系统就必须前后一致 | p.117 “We are free to choose the boundaries of a system as we please” | 资料抽取 |
| K3 | 内力成对抵消 | 原理 | 由第三定律，系统内部的力两两抵消，求和为零 | p.118 “internal forces all cancel in pairs” | 资料抽取 |
| K4 | 质点系动量定理 | 原理 | F_ext = dP/dt：系统所受外力等于系统总动量的变化率，与内部相互作用细节无关 | p.118 “the total force applied to a system equals the rate of change of the system’s momentum” | 资料抽取 |
| K5 | 质心 | 概念 | R = Σ m_j r_j / M | p.120 式 (4.4) | 资料抽取 |
| K6 | 质心运动定理 | 原理 | F = M R̈：质心的运动如同全部质量集中于此、全部外力作用于此；对任何质点系成立，不限刚体 | p.120 “behaves as if all the mass were concentrated there”；“not just for those fixed in rigid objects” | 资料抽取 |
| K7 | 质心坐标系 | 方法 | 以质心为原点；孤立两体问题的自然坐标 | p.125 “natural coordinates for an isolated two-body system” | 资料抽取 |
| K8 | 动量守恒 | 原理 | 孤立系统总动量不变，无论内部相互作用多强；外力只沿某方向时，垂直方向分量守恒 | p.130 “The total momentum of an isolated system is constant”；p.130–131 例 4.8 | 资料抽取 |
| K9 | 分离时刻的相对速度 | 方法 | 给出的“相对速度”是相对于反冲物体的；要用两者**分离那一刻**反冲物体的速度来换算对地速度 | p.131 例 4.8 “at the instant the marble and the gun part company” | 资料抽取 |
| K10 | 冲量（积分形式） | 原理 | ∫F dt = P(t) − P(0)：动量变化等于力对时间的积分 | p.131 “the change in momentum is the time integral of the force”；p.132 “is called the impulse” | 资料抽取 |
| K11 | 动量定理的适用对象：同一组粒子 | 原理 | F = dP/dt 是对一组确定的粒子建立的；积分形式只对在所考虑时段内质量不变的系统成立 | p.136 “applies correctly only to systems defined so that the system’s mass does not change” | 资料抽取 |
| K12 | 质量流动问题的解法 | 方法 | 把主体与 Δt 内进出的质量 Δm 一起划为系统，比较 t 与 t+Δt 的动量，再取极限；例：F = (v − u) dm/dt | p.137 “isolating the system, focusing on”（原文 differentials 被转换丢了 ff）；例 4.12–4.14 | 资料抽取 |
| K13 | 火箭方程（微分形式） | 原理 | F = M dv/dt − u dM/dt，u 为喷出物相对火箭的速度 | p.139 “The equation of rocket motion in free space is therefore” | 资料抽取 |
| K14 | 火箭方程的质心推导 | 方法 | 无外力时火箭与喷出物的质心匀速，由此得到同一方程 | p.138 “center of mass of the expelled mass and the rocket moves at constant velocity”；p.139–140 例 4.15 | 资料抽取 |
| K15 | 只留一阶项取极限 | 方法 | 分离过程的细节在取极限时消失，ΔmΔv 这类高阶项不贡献 | p.140 “Terms beyond first order” | 资料抽取 |
| K16 | 自由空间火箭的速度增量 | 原理 | u 恒定时 v_f − v_0 = −u ln(M_0/M_f)，只取决于喷气速度与质量比，与燃烧快慢无关 | p.141 “The final velocity is independent of how the mass is released” | 资料抽取 |
| K17 | 重力场中的火箭 | 原理 | 有重力时多一项 −g t_f，燃烧越快末速度越大 | p.141 “premium attached to burning the fuel rapidly” | 资料抽取 |
| K18 | 动量流与力 | 原理 | 物质流打到表面上的平均力 = 物质流向表面输运动量的速率 | p.146 “the average force exerted on a surface is the rate at which the stream transports momentum” | 资料抽取 |
| K19 | 动量通量 | 概念 | J = ρv² v̂；F_tot = Ṗ_in − Ṗ_out | p.147 “is called the flux (or flow) of momentum” | 资料抽取 |

## 2. 关系

类型：**前置**（学 B 先要 A）· **推导**（B 由 A 推出）· **组成**（A 是 B 的组成部分）· **混淆**（常被混为一谈）。方向一律“从 → 到”。

| 从 | 到 | 类型 | 依据 | 来源 |
| --- | --- | --- | --- | --- |
| P1 | K1 | 推导 | p.116：F = Ma 改写为 F = d(Mv)/dt | 资料抽取 |
| P2 | K3 | 推导 | p.118：“the forces between any two particles are equal and opposite” | 资料抽取 |
| K1 | K4 | 前置 | p.118：对每个粒子写 f_j = dp_j/dt 再求和 | 资料抽取 |
| K2 | K4 | 前置 | p.117：先说清“系统”指什么，再推定理 | 资料抽取 |
| K3 | K4 | 推导 | p.118：内力项为零，剩外力项 | 资料抽取 |
| K4 | K6 | 推导 | p.120：由 F = dP/dt 与 P = Σ m_j ṙ_j 定义 R | 资料抽取 |
| K5 | K6 | 组成 | p.120 | 资料抽取 |
| K6 | K7 | 前置 | p.125：孤立系统质心匀速，才可取作惯性系原点 | 资料抽取 |
| K4 | K8 | 推导 | p.130：F = 0 ⇒ dP/dt = 0 | 资料抽取 |
| P3 | K9 | 前置 | p.131：对地速度 = 相对速度 + 反冲体速度 | 资料抽取 |
| K8 | K9 | 前置 | p.131：例 4.8 在动量守恒中用到 | 资料抽取 |
| K4 | K10 | 推导 | p.131：微分形式 → 积分形式 | 资料抽取 |
| K2 | K11 | 前置 | p.136：“keep clearly in mind exactly what is included in the system” | 资料抽取 |
| K10 | K11 | 前置 | p.136：限制条件就是针对积分形式说的 | 资料抽取 |
| K11 | K12 | 推导 | p.136–137：因为只对固定粒子成立，所以要把 Δm 划进系统 | 资料抽取 |
| P4 | K12 | 前置 | 取极限的做法 | 模型综合 |
| K1 | K12 | 混淆 | p.137：“a common mistake is to argue that”（把 F = d(mv)/dt 展开成 m dv/dt + v dm/dt）；单质点的 p = mv “cannot be applied blindly to a system of many particles” | 资料抽取 |
| K12 | K13 | 推导 | p.138–139：同一方法用于喷出质量 | 资料抽取 |
| K6 | K14 | 前置 | p.139：用质心匀速推出 | 资料抽取 |
| K14 | K13 | 推导 | p.140：“as before” | 资料抽取 |
| K15 | K13 | 组成 | p.140：推导中略去 ΔmΔv | 资料抽取 |
| P4 | K15 | 前置 | — | 模型综合 |
| K13 | K16 | 推导 | p.141：F = 0，积分 | 资料抽取 |
| P5 | K16 | 前置 | p.141：∫dv = u∫dM/M | 资料抽取 |
| K13 | K17 | 推导 | p.141：F = Mg | 资料抽取 |
| K16 | K17 | 混淆 | p.141：“The situation is quite diferent if a gravitational field is present”（原文 different，转换丢了 ff）——无重力时与燃烧快慢无关，有重力时燃烧越快越好 | 资料抽取 |
| K10 | K18 | 前置 | p.143–146：每滴冲量 mv，平均力 = 冲量 / 间隔时间 | 资料抽取 |
| K18 | K19 | 推导 | p.146–147 | 资料抽取 |
| P3 | K12 | 前置 | (v − u) 是进入质量相对主体的速度，所以结果与参考系无关；只用对地速度写 d(mv)/dt 会依赖参考系 | **模型综合**（书未逐字写出） |
| K12 | K19 | 前置 | 动量通量是“进出系统的动量流”的连续版本 | **模型综合** |
