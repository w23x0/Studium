## 1. 知识点
| 编号 | 名称 | 类型 | 一句话 | 引文 | 来源 |
| --- | --- | --- | --- | --- | --- |
| P27 | 矢量点积与法向投影 | 前置 | 两矢量的点积给出其法向投影乘积，用于从动量流密度求跨截面的动量通量。 | 第1章 §1.4 “Multiplying Vectors”（书中排在本章之前） | 资料抽取 |
| P28 | 点光源辐射强度的平方反比律 | 前置 | 距各向同性点光源为 \(r\) 处的辐射能流密度与 \(1/r^2\) 成正比。 | 书外；Example 4.21 直接使用而未推导 | 资料抽取 |
| P29 | 静水压强关系 | 前置 | 密度为 \(\rho\) 的静止流体在自由液面下 \(h\) 处的表压为 \(\rho gh\)。 | 书外；Example 4.23 将其作为已知条件使用 | 资料抽取 |
| P30 | 小角度近似 | 前置 | 当以弧度表示的 \(x\) 很小时，可用 \(\sin x\approx x\) 简化三角函数。 | Note 1.1 “Approximation Methods”（书中排在本章之前） | 资料抽取 |
| K51 | 动量通量 | 概念 | 动量通量是单位时间穿过给定表面的动量矢量，量纲为动量每单位时间。 | "Thus, the average force exerted on a surface is the rate at which the stream transports momentum to the surface." ‖ "Momentum is a vector, so momentum flux is a vector." | 资料抽取 |
| K52 | 动量流密度 | 概念 | 均匀物质流的动量通量密度为 \(\mathbf J=\rho_m v^2\hat{\mathbf v}\)，方向沿物质流。 | "The vector J is called theflux density of the stream." | 资料抽取 |
| K53 | 面积矢量与内向法向约定 | 概念 | 面积矢量的大小等于面积、方向沿表面法线；计算流入系统的动量时，法向取指向系统内部。 | "It is also useful to describe the area by a vector A." ‖ "We choose the following convention: in evaluating the momentum transfer through a surface into a system, nˆ is positive if it points inward." | 资料抽取 |
| K54 | 开放系统的净动量流力平衡 | 原理 | 对系统表面的各项动量通量求和，系统所受合力等于总流入动量通量减去总流出动量通量。 | "The total force on a system due to a number of sources of momentum flow can be written" ‖ "The total force on the system can then be written" | 资料抽取 |
| K55 | 流束与表面交换动量时的状态差异 | 原理 | 流束在表面停止、被正向反射或无动量变化地穿透时，表面所受力分别为单倍、双倍或零倍入射动量通量。 | "the force exerted by the surface must cause the stream to lose momentum at the same rate the stream transports momentum to the surface." ‖ "the surface must exert the force needed not only to cancel the incoming momentum but also to generate the outgoing momentum, doubling the force on the surface." ‖ "if the surface is transparent so that the matter simply passes through, then momentum is carried to and away from the surface at the same rate" | 资料抽取 |
| K56 | 完全反射太阳光的辐射压力 | 原理 | 完全反射太阳帆使光子动量反向，辐射力为 \(2S_{\rm sun}A/c\)，除以总质量并结合太阳引力可得净加速度。 | "Suppose that the solar sail is a perfect reflector, and that all the sunlight is reflected back." ‖ "Because the solar intensity and the solar gravity both vary as the inverse square, the acceleration increases as the craft moves toward the Sun, but is always directed inward." | 资料抽取 |
| K57 | 气体分子的动量流压强 | 原理 | 气体对壁面的平均压强来自分子随机运动造成的法向净动量通量，单轴模型给出 \(\mathcal P_x=\rho\overline{v_x^2}\)。 | "The pressure of a gas arises from momentum flow to and from the enclosing surfaces due to the random motion of the particles in the gas." ‖ "The pressure of a gas is the force per unit area on the surface." | 资料抽取 |
| K58 | 各向同性气体的均方速度压强关系 | 原理 | 当气体压强各向同性且三个方向的均方速度相等时，\(\mathcal P=\frac13\rho\overline{v^2}\)。 | "Because the pressure of a gas is the same in all directions, we expect a similar result for pressure on surfaces that are normal to the y and z axes." ‖ "This result provides a crucial link connecting the concepts of heat, energy, and microscopic motion, topics we shall pursue in Chapter 5." | 资料抽取 |
| K59 | 弯道水流对河堤的动态压强 | 方法 | 对宽度 \(w\)、水深 \(h\)、曲率半径 \(R\) 和流速 \(v\) 的弯道水流，动压为 \(\rho v^2w/R\)，并可与静水压强 \(\rho gh\) 比较。 | "The dike must therefore withstand the dynamic pressure due to the deflection of the flow in addition to the static pressure." ‖ "We can understand from Newton’s laws that the outer bank and the dike must exert a sideways force on the stream to deflect it from straight-line flow." ‖ "the ratio is 0.22, so that the dynamic pressure is by no means negligible." | 资料抽取 |

## 2. 关系
| 从 | 到 | 类型 | 依据 | 来源 |
| --- | --- | --- | --- | --- |
| K45 | K51 | 推导 | "Thus, the average force exerted on a surface is the rate at which the stream transports momentum to the surface." | 资料抽取 |
| K46 | K51 | 推导 | 式（4.8）及其后对单位长度动量和每秒输运距离的解释。 | 资料抽取 |
| K51 | K52 | 推导 | "The vector J is called theflux density of the stream." 此前由单位长度动量乘以流速得到单位截面上的动量流率。 | 资料抽取 |
| P27 | K54 | 前置 | 模型综合：跨截面的标量投影由动量流密度与面积矢量的点积给出。 | 模型综合 |
| K52 | K54 | 推导 | "the rate of momentum transfer to a surface—consequently, the force on the system—is" 后用动量流密度与面积矢量给出通量。 | 资料抽取 |
| K53 | K54 | 组成 | "It is also useful to describe the area by a vector A." 面积矢量随后作为表面动量通量投影的组成量。 | 资料抽取 |
| K51 | K54 | 推导 | "The total force on a system due to a number of sources of momentum flow can be written" | 资料抽取 |
| K9 | K54 | 推导 | 模型综合：把质点系的总动量变化率改写为系统边界上的净动量流，即得到开放系统的力平衡。 | 模型综合 |
| K54 | K55 | 推导 | "the surface must exert the force needed not only to cancel the incoming momentum but also to generate the outgoing momentum, doubling the force on the surface." | 资料抽取 |
| K54 | K56 | 推导 | Example 4.21 | 资料抽取 |
| K55 | K56 | 前置 | Example 4.21 | 资料抽取 |
| P23 | K56 | 前置 | Example 4.21 | 资料抽取 |
| P28 | K56 | 前置 | "Because the solar intensity and the solar gravity both vary as the inverse square, the acceleration increases as the craft moves toward the Sun" | 资料抽取 |
| P10 | K56 | 前置 | Example 4.21 | 资料抽取 |
| K54 | K57 | 推导 | Example 4.22 | 资料抽取 |
| K57 | K58 | 推导 | "Because the pressure of a gas is the same in all directions, we expect a similar result for pressure on surfaces that are normal to the y and z axes." | 资料抽取 |
| K54 | K59 | 推导 | Example 4.23 | 资料抽取 |
| P12 | K59 | 前置 | Example 4.23 将 \(v^2/R\) 明示为 centripetal acceleration。 | 资料抽取 |
| P29 | K59 | 前置 | Example 4.23 | 资料抽取 |
| P30 | K59 | 前置 | Example 4.23 | 资料抽取 |
