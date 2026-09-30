## 1. 知识点
| 编号 | 名称 | 类型 | 一句话 | 引文 | 来源 |
| --- | --- | --- | --- | --- | --- |
| P4 | 位置矢量与线性加权组合 | 前置 | 位置矢量从选定原点表示空间位置，多个位置矢量可按标量权重作线性组合。 | 第1章 §1.3、§1.5、§1.7 | 资料抽取 |
| K10 | 质心的质量加权定义 | 概念 | 质心位置矢量是系统各质点位置按质量加权得到的平均位置，即 $\mathbf R=\frac{1}{M}\sum_jm_j\mathbf r_j$。 | "R is a vector from the origin to a point called the center of mass." ‖ "The motion of a system’s center of mass behaves as if all the mass were concentrated there and all the external forces act at that point." | 资料抽取 |
| K11 | 质心运动方程 | 原理 | 质点系的质心运动方程为 $\mathbf F_{\rm ext}=M\ddot{\mathbf R}$，其形式与单质点的固定质量运动方程相同。 | "where we have dropped the subscript “ext” with the understanding that F stands for the external force." ‖ "This result is identical to the equation of motion of a single particle, although it may in fact refer to a system of several particles." | 资料抽取 |
| K12 | 质心方程的适用边界与质点等效 | 原理 | 刚体在质心平移上可像单质点一样处理；该方程对任意满足牛顿第三定律的质点系成立，但不描述物体的空间朝向和转动。 | "Equation (4.4) shows that with respect to external forces, the body behaves as if it were a single particle." ‖ "it does not describe the body’s orientation in space. It turns ou that, as we expect, the rotational motion of a body depends on its shape" ‖ "for any system of particles, not just for those fixed in rigid objects, as long as the forces between the particles obey Newton’s third law." | 资料抽取 |
| P5 | 均匀重力场 | 前置 | 均匀重力场中各质点的重力加速度同向且大小相同，重力与质量成正比。 | 第3章 §3.3 Gravity | 资料抽取 |
| P6 | 定积分与连续求和 | 前置 | 定积分把离散和的连续极限用于累积，并具有积分对和的线性性质。 | 书外（数学工具） | 资料抽取 |
| K13 | 连续体的质量微元 | 概念 | 质量微元是扩展体细分后带有确定位置的小质量单元，连续极限中它取代单个质点成为加权项。 | "We proceed by dividing the body of mass M into N mass elements." ‖ "To visualize this integral, think of dm as the mass in an element of vol ume dV located at position r." | 资料抽取 |
| K14 | 扩展体质心的积分法 | 方法 | 用 $\mathbf R=M^{-1}\int_V\mathbf r\,dm$ 计算扩展体质心；给定体密度 $\rho$ 时改写为 $\mathbf R=M^{-1}\iiint_V\mathbf r\rho\,dV$。 | "it is a simple matter of algebra to find the center of mass of a system of particles, finding the center of mass of an extended body normally requires integration." ‖ "This integral is called a volume integral. It is sometimes written with three integral signs (a triple integral) to emphasize that the integration proceeds over all three space coordinates:" | 资料抽取 |
| K15 | 多个扩展体的质心合成 | 方法 | 把每个扩展体等效为位于其质心、质量等于该体总质量的质点，再对这些质点求质量加权平均。 | "Calculating the center of mass is straightforward if the object can be subdivided into parts with known centers of mass." ‖ "In other words, to find the center of mass of a system of several extended bodies, treat each body as if its mass were concentrated at its center of mass." | 资料抽取 |
| P7 | 相似三角形比例 | 前置 | 相似三角形的对应边成比例，可由一个线性尺寸求出另一个线性尺寸。 | 书外（数学工具） | 资料抽取 |
| P8 | 转矩平衡条件 | 前置 | 固定轴悬挂平衡时合外力矩为零，因此重力作用线通过支点并与铅垂线重合。 | 第7章 §7.4–7.5（书中排在本章之后） | 资料抽取 |
| K16 | 双支点铅垂线法 | 方法 | 将薄板从两个不同支点悬挂并分别作铅垂线，两条铅垂线的交点即质心。 | "Let it hang from a pivot and draw a plumb line from the pivot. The center of mass will hang directly below the pivot" ‖ "Repeat the procedure with a diferent pivot point. The two lines intersect at the center of mass." | 资料抽取 |

## 2. 关系
| 从 | 到 | 类型 | 依据 | 来源 |
| --- | --- | --- | --- | --- |
| P4 | K10 | 前置 | 式 (4.4) 以各质点的位置矢量作质量加权平均。 | 资料抽取 |
| P1 | K11 | 前置 | "This result is identical to the equation of motion of a single particle, although it may in fact refer to a system of several particles." | 资料抽取 |
| P2 | K11 | 前置 | 式 (4.3) 中 $\ddot{\mathbf R}$ 是质心位置矢量的二阶时间导数。 | 资料抽取 |
| K9 | K11 | 推导 | 式 (4.2) 把总外力写成总动量的时间导数。 | 资料抽取 |
| K10 | K11 | 推导 | 将式 (4.4) 代入式 (4.2) 的总动量表达式，得到式 (4.3)。 | 资料抽取 |
| K11 | K12 | 推导 | "Equation (4.4) shows that with respect to external forces, the body behaves as if it were a single particle." | 资料抽取 |
| P3 | K12 | 前置 | "for any system of particles, not just for those fixed in rigid objects, as long as the forces between the particles obey Newton’s third law." | 资料抽取 |
| K1 | K12 | 前置 | "we casually treated every body as if it were a particle; we see now that this is justified provided that we focus attention on the center of mass." | 资料抽取 |
| P5 | K11 | 前置 | 例 4.2 在均匀重力场条件下把两个质量所受的重力作为系统总外力。 | 资料抽取 |
| P6 | K14 | 前置 | "it is a simple matter of algebra to find the center of mass of a system of particles, finding the center of mass of an extended body normally requires integration." | 资料抽取 |
| K13 | K14 | 组成 | 式 (4.5) 及其后的极限把带有位置的微小质量单元作为加权求和与积分的基本项。 | 资料抽取 |
| K10 | K14 | 推导 | 式 (4.4) 的离散质量加权定义在质元数趋于无穷时成为连续质心定义。 | 资料抽取 |
| K14 | K15 | 推导 | "The integral of a sum of terms equals the sum of the integrals over each term." | 资料抽取 |
| K10 | K15 | 推导 | "In other words, to find the center of mass of a system of several extended bodies, treat each body as if its mass were concentrated at its center of mass." | 资料抽取 |
| P7 | K14 | 前置 | 例 4.4 用相似三角形确定各条带的高度，再据此建立质心积分。 | 资料抽取 |
| P8 | K16 | 前置 | "this may be intuitively obvious, and can easily be proved with the methods of Chapter 7" | 资料抽取 |
