## 1. 知识点
| 编号 | 名称 | 类型 | 一句话 | 引文 | 来源 |
| --- | --- | --- | --- | --- | --- |
| K38 | 火箭反冲推进原理 | 原理 | 发动机向后排出燃料时，火箭凭借相互作用获得向前的动量；无外力时，这也等价于火箭与排出物组成的系统质心保持匀速运动。 | "By Newton’s third law, there is an equal and opposite force on the rocket, propelling the rocket in the opposite direction." ‖ "Another way to look at this is that the center of mass of the expelled mass and the rocket moves at constant velocity." | 资料抽取 |
| K39 | 变质量火箭运动方程 | 原理 | 以相对于火箭的排气速度 \(\mathbf u\) 为约定，变质量火箭满足 \(\mathbf F=M\,d\mathbf v/dt-\mathbf u\,dM/dt\)，其中 \(dM/dt<0\) 表示火箭质量减少。 | "Suppose that a rocket coasts in deep space with its engines turned of and that external forces are negligible." ‖ "The equation of rocket motion in free space is therefore" ‖ "The situation is quite diferent if a gravitational field is present, as shown by the next example." | 资料抽取 |
| K40 | 有限微元极限的一阶项保留法 | 方法 | 对有限小时间间隔的动量变化取极限时，只保留不消失的一阶项，而两增量乘积等二阶项在极限中消失。 | "Our approach to rocket motion illustrates a powerful method for an alyzing physical problems." ‖ "But these details vanish when taking the limit; their efect is actually included in the final equation of motion." ‖ "The correct equa tion of motion results from taking the limit and including only the non vanishing “first-order” terms." | 资料抽取 |
| P21 | 自然对数的求导与积分性质 | 前置 | 用于把质量变化率的积分转化为初始质量与最终质量之比的对数。 | 书外：微积分中的自然对数 | 模型综合 |
| K41 | 自由空间火箭方程（齐奥尔科夫斯基方程） | 原理 | 在原文符号约定下，外力可忽略且排气速度恒定时，\(\Delta\mathbf v=\mathbf u\ln(M_f/M_0)\)；末速度只取决于排气速度与初始、最终质量比，与燃料释放快慢无关。 | "The final velocity is independent of how the mass is released—the fuel can be expended rapidly or slowly" ‖ "The only important quantities are the exhaust velocity and the ratio of initial to final mass." ‖ "in which case it is easy to integrate the equation of motion:" | 资料抽取 |
| K42 | 恒定重力下的火箭方程与快速燃烧效应 | 原理 | 恒定重力与恒定排气速度下，\(\Delta\mathbf v=\mathbf u\ln(M_f/M_0)+\mathbf g(t_f-t_0)\)；延长燃烧时间会增加重力速度损失，因此快速燃烧可提高末速度。 | "If a rocket takes of in a constant gravitational field" ‖ "Now there is a premium attached to burning the fuel rapidly." ‖ "The shorter the burn time, the greater the final velocity." | 资料抽取 |
| K43 | 火箭推力 | 概念 | 推力是排出气体所携带动量的时间流率，方向与喷出方向相反，对应火箭方程中的排气质量变化项。 | "The first term on the right-hand side of Eq. (1) is called the “thrust.”" ‖ "the thrust is the rate at which momentum is carried of by the burning fuel." | 资料抽取 |
| K44 | 比冲 | 概念 | 比冲是排气速度除以 \(g\) 所得的火箭性能指标，单位为秒；只要单位换算一致，其数值不依赖于采用 SI、CGS 或英制单位。 | "Rocket data tables often do not list the exhaust velocity but instead a quantity called the “specific impulse,”" ‖ "Specific impulse has units of seconds, and is therefore independent of whether we use SI, CGS, or English units." | 资料抽取 |

## 2. 关系
| 从 | 到 | 类型 | 依据 | 来源 |
| --- | --- | --- | --- | --- |
| P3 | K38 | 推导 | "By Newton’s third law, there is an equal and opposite force on the rocket, propelling the rocket in the opposite direction." | 资料抽取 |
| K18 | K38 | 推导 | "Another way to look at this is that the center of mass of the expelled mass and the rocket moves at constant velocity." | 资料抽取 |
| K38 | K39 | 推导 | 例4.14由首段的喷气反冲机制转入有限时段的系统动量计算。 | 资料抽取 |
| K34 | K39 | 前置 | 初始集合中的待喷燃料与末态集合中的喷出物是同一批物质；比较这两个端点避免直接对质量集合变化的“火箭体”套用固定粒子集合条件（模型综合）。 | 模型综合 |
| K35 | K39 | 前置 | K35给出质量流携带动量的通用动量平衡；本节将其写成火箭主体可加速且质量流出的形式（模型综合）。 | 模型综合 |
| K37 | K39 | 推导 | 例4.14及例4.15均比较有限时段两端的系统动量，再除以时段并取极限。 | 资料抽取 |
| K40 | K39 | 前置 | "The correct equa tion of motion results from taking the limit and including only the non vanishing “first-order” terms." | 资料抽取 |
| K10 | K39 | 推导 | 例4.15由两质量质心速度的质量加权表达式出发，令质心匀速并取极限，重新得到火箭方程。 | 资料抽取 |
| P20 | K40 | 前置 | 一阶项是否保留以及高阶乘积是否趋于零，须依据导数的极限定义判断（模型综合）。 | 模型综合 |
| P18 | K41 | 前置 | 从质量变化率积分恢复初始质量与最终质量之比，依赖微积分基本定理（模型综合）。 | 模型综合 |
| P21 | K41 | 前置 | 将 \(dM/dt\) 对时间积分并整理为 \(dM/M\) 后，需要使用自然对数的积分性质（模型综合）。 | 模型综合 |
| K39 | K41 | 推导 | 例4.16令外力为零并假设排气速度恒定，再积分自由空间火箭方程。 | 资料抽取 |
| P5 | K42 | 前置 | "If a rocket takes of in a constant gravitational field" | 资料抽取 |
| K39 | K42 | 推导 | 例4.17把恒定重力外力代入通用火箭方程并对时间积分。 | 资料抽取 |
| K39 | K43 | 组成 | "The first term on the right-hand side of Eq. (1) is called the “thrust.”" | 资料抽取 |
| K41 | K44 | 前置 | 比冲以自由空间火箭方程中的排气速度为核心量；例4.18说明数据表通常用比冲代替排气速度（模型综合）。 | 模型综合 |
