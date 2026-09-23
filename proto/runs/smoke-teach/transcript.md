[学习者] 我想学线性变换的核。
[系统] 好，我们先不急着下定义，从一个具体例子开始，看看"核"要回答的是什么问题。

设线性变换 $T:\mathbb{R}^2\to\mathbb{R}^2$，$T(\mathbf{x}) = A\mathbf{x}$，其中
$$A=\begin{pmatrix}1 & 2\\ 2 & 4\end{pmatrix}.$$

请你做两件事：
1. 找出两个**不同**的向量 $\mathbf{u}\neq\mathbf{v}$，使得 $T(\mathbf{u}) = T(\mathbf{v})$。
2. 算出 $\mathbf{u}-\mathbf{v}$，再算 $T(\mathbf{u}-\mathbf{v})$，看看得到什么。

写下你找到的向量和计算过程就行。找的时候怎么想的也可以说说，猜的、试的都可以。
[练习条件] - 任务：对具体矩阵找出 $\mathbf{u}\neq\mathbf{v}$ 且 $T(\mathbf{u})=T(\mathbf{v})$，并计算 $T(\mathbf{u}-\mathbf{v})$。 ； - 完成条件：给出一组正确的 $\mathbf{u},\mathbf{v}$，并算出 $T(\mathbf{u}-\mathbf{v})=\mathbf{0}$。 ； - 独立程度：独立。 ； - 验证意图：区分以下几种情况。 ；   - 学习者能否用矩阵乘法、方程组做具体计算（前置是否牢固）。 ；   - 学习者是否会自发地从"两个输入撞到同一输出"联想到"差被映成零"（主张 1、3 的动机萌芽）。 ；   - 学习者只是凑数试出来的，还是用方程组系统地找出来的。
