## 1. 知识点
| 编号 | 名称 | 类型 | 一句话 | 引文 | 来源 |
| --- | --- | --- | --- | --- | --- |
| P1 | 固定粒子系统的总动量与动量定理 | 前置 | 对固定粒子集合，系统总动量由各粒子的动量相加，合外力等于总动量的时间变化率。 | 4.2 Dynamics of a System of Particles | 资料抽取 |
| P2 | 向量差与正交分量 | 前置 | 对向量作加减，并沿选定坐标轴取其正交分量。 | 1.3 The Algebra of Vectors；1.5 Components of a Vector | 资料抽取 |
| P3 | 微分近似与极限 | 前置 | 用有限短时段的变化率近似瞬时变化率，并通过取极限得到精确关系。 | 1.9–1.10；Note 1.1、Note 1.4；书外（微积分中的极限） | 模型综合 |
| K1 | 动量定理的固定粒子系统条件 | 原理 | 冲量—动量积分式要求积分区间内始终是同一批粒子，因此系统质量不能随时间变化。 | "it is essential to deal with the same set of particles throughout the time interval" ‖ "Consequently, the integral form applies correctly only to systems defined so that the system’s mass does not change during the time of interest." | 资料抽取 |
| K2 | 变质量系统的短时段系统边界法 | 方法 | 对每一短时段，把该时段将流入或流出的质量预先纳入系统，计算两端动量差，除以 Δt 后取极限。 | "The procedure of isolating the system, focusing on diferentials, and taking the limit may appear a trifle formal" ‖ "The limiting procedure used in Example 4.12 expresses the physical situation correctly." | 资料抽取 |
| K3 | 变质量系统的动量通量力 | 原理 | 匀速载体捕获入射质量时，所需外力为 F=(v-u)dm/dt，方向由 v-u 决定；若流出质量离开前后与载体同速，则动量不变且无需外力。 | "A spacecraft moves through space with constant velocity v. The spacecraft encounters a stream of dust particles that embed themselves in the hull" ‖ "The problem is to find the external force F necessary to keep the spacecraft moving uniformly." ‖ "Here the mass is decreasing. However, the velocity of the sand just after leaving the freight car is identical to its initial velocity, and its momentum does not change" | 资料抽取 |
| K4 | 单粒子动量式的适用边界 | 原理 | 将单粒子关系 p=mv 直接求导并当作多粒子变质量系统的总动量变化率，会漏掉入射质量原有的动量并得到错误外力。 | "cannot be applied blindly to a system of many particles. The limiting procedure used in Example 4.12 expresses the physical situation correctly." | 资料抽取 |

## 2. 关系
| 从 | 到 | 类型 | 依据 | 来源 |
| --- | --- | --- | --- | --- |
| P1 | K1 | 前置 | "was established for a system composed of a certain set of particles" | 资料抽取 |
| P1 | K2 | 前置 | Example 4.12 先由两时刻的动量差求变化率，再取极限并以合外力等于总动量变化率求外力。 | 资料抽取 |
| P2 | K2 | 前置 | Example 4.12、4.14 均以两时刻的动量向量之差计算动量变化率。 | 资料抽取 |
| P3 | K2 | 前置 | "The procedure of isolating the system, focusing on diferentials, and taking the limit may appear a trifle formal" | 资料抽取 |
| K1 | K2 | 前置 | Example 4.12 在所选短时段系统的两端都计入载体质量与同一份待并入质量，使动量积分满足固定粒子集合条件。 | 模型综合 |
| P1 | K3 | 推导 | Example 4.12 在短时段动量变化的极限中应用合外力等于总动量变化率，得到捕获入射质量所需的外力。 | 资料抽取 |
| P2 | K3 | 推导 | Example 4.12 以载体速度与入射速度的向量之差表示相对速度，并由其确定外力方向。 | 资料抽取 |
| K2 | K3 | 推导 | Example 4.12 用短时段系统法导出入射质量关系；Example 4.14 用同一方法得到等速流出时动量不变。 | 资料抽取 |
| P1 | K4 | 前置 | "The origin of the error is that the expression for the momentum of a single particle" | 资料抽取 |
| K4 | K3 | 混淆 | Example 4.12 后的常见错误段明确对比仅用载体速度所得的质量流作用与使用相对速度所得的正确结果。 | 资料抽取 |
