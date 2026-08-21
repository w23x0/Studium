# 审计 A4b：`data/nodes-A2-x2.jsonl`（34 个反例节点）

审计角色：审计 A（数学正确性与归属真实性）。审计对象 34 个 `apostol:cx-` 节点。
判决逐条写在 `report/audit-A4b-verdicts.jsonl`（34 行，一节点一行）。

本次审计未运行 `tools/verify_anchors.py`，未做任何锚点机器校验；未整读任何非审计对象的
`nodes-*.jsonl`；未读同级 M08实验-Apostol微积分卷1/；未读任何 `report/audit-*.md`；
`report/丢弃与未覆盖清单.md` 只读了第三节。所有数值均由我手算复核，锚点均由我把 quote 与
statement 并排读过。

## 1. 计数与 cause 分布

| verdict | 数量 |
| --- | --- |
| KEEP | 29 |
| FIX | 5 |
| KILL | 0 |

| cause | 含义 | 数量 | 节点 |
| --- | --- | --- | --- |
| 0 | KEEP | 29 | — |
| 1 | 量词过度断言 | 3 | `cx-inner-product-axiom-diagnosis`、`cx-metric-criteria-for-orthogonality`、`cx-l2-sequence-space-is-an-infinite-dimensional-euclidean-space` |
| 2 | 编造归属（含习题编号错） | 1 | `cx-convergence-must-be-proved-before-the-axioms` |
| 3 | 错误教材归属 | 0 | — |
| 4 | 数学错误 | 1 | `cx-absolute-value-of-the-dot-product-breaks-homogeneity` |

零 KILL 是实测结果，不是宽容：这批节点里没有一个是凭空编造的反例，也没有一个的核心结论是
假的。5 个 FIX 全部是局部可改的（三处删掉或限定一个全称词，一处改一句理由，一处删掉一个错
挂的习题号），没有一个需要整节点作废。信息量偏薄的节点见第 3 节，但薄不等于错，是否砍属审
计 B 的判断范围。

## 2. 算错的反例专章

**结论：这批节点里没有算错的数值。** 唯一的 cause 4 不是数值错，是一句理由写错了对象。

### 2.1 唯一的数学错误：`apostol:cx-absolute-value-of-the-dot-product-breaks-homogeneity`

原文末句：

> and additivity fails since |a + b| is not a + b in general

要证 $(x,y)=|\sum x_iy_i|$ 的加性失效，需要比较的是 $|a+b|$ 与 $|a|+|b|$，不是 $|a+b|$
与 $a+b$。更糟的是：若按字面把 $a$、$b$ 读成两个已经取过绝对值的量（这是「$|a+b|$ vs
$a+b$」这个写法最自然的读法），则 $|a+b|=a+b$ 恒成立，该句反而在说加性**成立**，自我否定。

正确的反例（我的验算）：取 $n=1$，$x=1$、$y=1$、$z=-1$。则
$(x,y+z)=|1\cdot 0|=0$，而 $(x,y)+(x,z)=|1|+|-1|=2$。故加性失效。

suggested_fix 已给出替换句。该节点的其余部分（对称性成立；$(x,x)=|\sum x_i^2|=\sum x_i^2>0$
故公理 1、4 成立；$(cx,y)=|c|\,|\sum x_iy_i|$ 故 $c<0$ 时齐性失效）我逐条验过，全部正确。

### 2.2 「丢弃与未覆盖清单」第三节的三个自算数值：三个全对

**（1）`apostol:cx-metric-criteria-need-the-real-case`**（$C^1$ 中取 $x=1$、$y=i$）
按 15.10 第 29–41 行的约定（共轭挂在第二格，$(x,y)=x\overline{y}$）：
$\|x\|^2=1\cdot\overline{1}=1$；$\|y\|^2=i\cdot\overline{i}=-i^2=1$；
$\|x+y\|^2=(1+i)(1-i)=1-i^2=2=1+1$。勾股等式成立。而
$(x,y)=1\cdot\overline{i}=-i\neq 0$。**正确**，且符号是 $-i$ 而非 $+i$（共轭位置对），
$\mathrm{Re}(-i)=0$ 与「只迫使实部为零」自洽，与 15.10 第 136 行的展开式一致。

**（2）`apostol:cx-pairing-can-converge-off-the-space`**（习题 13(d) 收敛到 $e^2-1$）
该习题的配对从 $n=1$ 起算（第 100 行），$x_n=2^n$、$y_n=1/n!$：
$\sum_{n\ge 1}2^n/n!=\left(\sum_{n\ge 0}2^n/n!\right)-1=e^2-1\approx 6.389$。**正确**——
减 1 这一步正是容易漏掉的地方，节点没漏。$x\notin V$ 也对：$\sum (2^n)^2=\sum 4^n$ 发散；
而 $\sum (1/n!)^2$ 收敛，故 $y\in V$，节点只说 $x$ 不在 $V$ 中，分寸准确。

**（3）`apostol:cx-l2-optimal-approximation-can-be-poor-pointwise`**（$\pi-2\sin x$，$0$ 点
误差 $\pi$）在 $C(0,2\pi)$ 中，$\{1,\cos x,\sin x\}$ 正交，
$(u_0,u_0)=2\pi$、$(u_1,u_1)=(u_2,u_2)=\pi$。
$(f,u_0)=\int_0^{2\pi}x\,dx=2\pi^2\Rightarrow c_0=2\pi^2/(2\pi)=\pi$；
$(f,u_1)=[x\sin x+\cos x]_0^{2\pi}=1-1=0\Rightarrow c_1=0$；
$(f,u_2)=[-x\cos x+\sin x]_0^{2\pi}=-2\pi\Rightarrow c_2=-2\pi/\pi=-2$。
最近元 $=\pi-2\sin x$。**正确**。$g(0)=\pi$，$f(0)=0$，该点误差恰为 $\pi$，**正确**。
$x=0$ 确在定义域内：15.10 第 59 行明确 $C(a,b)$ 指闭区间 $[a,b]$ 上的连续函数。

### 2.3 第三节未收录、但同样是模型自算的数值

`apostol:cx-symmetric-interval-decouples-the-coefficients` 给出了两个书上没有的数
（习题 8 只说 find，未给答案），而这两个数**不在**第三节的清单里。我重算：
$(1,x)=\int_{-1}^{1}x\,dx=0$（故 $1$ 与 $t$ 在对称区间上正交）；
$(e^x,1)=e-1/e$、$(1,1)=2\Rightarrow$ 常数项 $(e-1/e)/2\approx 1.1752$；
$(e^x,x)=[(x-1)e^x]_{-1}^{1}=0-(-2/e)=2/e$、$(x,x)=2/3\Rightarrow$
斜率 $(2/e)\cdot(3/2)=3/e\approx 1.1036$。两个数**都对**。末句 $\int_1^3 x\,dx=4\neq 0$
也对。

结论：**第三节的自算数值清单不完整。** 我只读了第三节，无法判断其他节点是否也有未收录的
自算值；建议出清单的一方复查。我在本次审计中另行重算了大量未列入清单的数值，例如
$\int_0^1 t\,dt=1/2$ 与 $\int_1^e (\log x)x\,dx=(e^2+1)/4$（节点 `cx-orthogonality-depends-on-the-interval`）、
$(x_n,x_m)=\Gamma(n+m+1)=(n+m)!$（`cx-exponential-weight-is-what-tames-the-unbounded-interval`）、
$\int_0^\pi\cos^2(nt)\,dt=\pi/2$（`cx-normalizing-constant-breaks-at-the-index-zero`）、
四组 Gram-Schmidt 相依关系与秩 3（`cx-orthonormalizing-a-dependent-list-yields-a-shorter-basis`、
`cx-cyclic-dependence-hides-behind-distinct-supports`）、$(\log 3)/2$ 与 $(e^2-1)/2$
（`cx-best-constant-is-the-mean-value`）、$(0,1)$ 上移位 Legendre 三项的全部正交规范性
（`cx-legendre-family-changes-with-the-interval`），**均无误**。

## 3. 无效反例专章

### 3.1 前提缺失，使反例落在命题之外：`apostol:cx-metric-criteria-for-orthogonality`

15.12-exercises.md 第 29 行的题干把习题 3 到 7 限定在 **real** Euclidean space。该节点的
statement 通篇没有「实」这个前提，却把三条判别式写成三个无条件的「exactly when」。这个限定
是实质性的，不是装饰：我验了习题 6 在复空间的失效——
$(x+y,x-y)=\|x\|^2-\|y\|^2-\overline{(x,y)}+... $ 展开后为
$\|x\|^2-\|y\|^2-2i\,\mathrm{Im}(x,y)$，故 $\|x\|=\|y\|$ 时若 $\mathrm{Im}(x,y)\neq 0$，
该内积仍不为零，「if」方向不成立。判 FIX/1。

有意思的是，同一批节点里 `cx-metric-criteria-need-the-real-case` 恰好就是讲这个限定不可去
的，两个节点并列时前者的漏写更显眼。

### 3.2 命题被转述错：无

各节点对习题命题的转述我逐条对过原文，除 3.1 的前提漏写和第 4 节的一处习题号错挂外，没有
发现把命题本身说错的。特别核过几处易错的：`cx-anisotropy-forces-a-definite-form` 把原文的
「linearity」说成「additivity」是准确的（15.10 的公理 (2) 正是
$(x,y+z)=(x,y)+(x,z)$，原文自标为 distributivity, or linearity）；
`cx-cross-terms-do-not-collapse-to-twice-the-inner-product` 依赖「不加限定的 Euclidean
space 可实可复」，这一点由 15.10 第 45 行明文证实。

### 3.3 名为反例、实非反例：占比不小

`cx-` 前缀承诺的是反例，但这 34 个里有相当一部分是**定理适用范围说明**或**正面事实**，不是
反例：

- `cx-polarization-formula-is-twice-the-dot-product`——习题 1 里唯一答「是」的那一式。节点自己
  也写明「the answer is yes」。有价值（提醒先化简再验公理），但不是反例。
- `cx-parallelogram-law-is-forced-by-an-inner-product`——是一条恒等式，节点没给出任何违反平行
  四边形法则的具体范数（例如 $V_2$ 上的 $\max(|x_1|,|x_2|)$ 或 $|x_1|+|x_2|$）。作为反例节点
  它缺的正是那个反例。
- `cx-orthogonality-as-a-minimum-condition`、`cx-law-of-cosines-needs-nonzero-elements`、
  `cx-metric-criteria-for-orthogonality`——都是判别式或前提说明。
- `cx-legendre-family-changes-with-the-interval`、`cx-best-constant-is-the-mean-value`、
  `cx-symmetric-interval-decouples-the-coefficients`、
  `cx-l2-optimal-approximation-can-be-poor-pointwise`——15.16 习题的正面结论。其中只有最后一个
  有明确的反例式对照（$L^2$ 最优 vs 逐点误差 $\pi$）。

这不构成正确性缺陷，我因此没有据此判 FIX；但 id 前缀与 aliases 里的「反例」措辞对这批节点是
过度承诺，检索时会误导。建议出数据的一方要么改前缀，要么在 type 上区分。

### 3.4 推翻的东西没人会相信（信息量薄）

- `cx-orthonormal-basis-is-not-unique`——「把某个基向量取负号得到另一个正交规范基」这件事几乎
  不需要指出。真正有内容的是末句（唯一性只在输入次序固定后才成立，对应定理 15.13(c)），但那
  是正面事实。
- `cx-single-point-evaluation-is-degenerate`——单点求值退化，属一眼可见。它的价值在于配上了
  「维数 >1 时单个求值点永远分不开」这个一般化陈述。

两条都判 KEEP（无错），薄厚由审计 B 定。

## 4. 锚点错挂专章

我把 34 个节点的每条 quote 与其 statement 并排读过。**没有发现两个节点的锚点互换、也没有发
现引到另一条定理结论的情形**（那两个已知实例不在本文件）。发现的是另一类：quote 为真，但支
撑不到它所挂的断言。

### 4.1 错的那一句恰好没有锚点覆盖：`apostol:cx-convergence-must-be-proved-before-the-axioms`（FIX/2）

statement 说习题 11、13、14「part (a) of each asks for absolute convergence before part (b)
asks for the axioms」。对 13、14 成立；对 11 **不成立**：11(b) 是第 79 行的
「prove that $(x_n, x_m) = (m+n)!$」，与公理无关，且习题 11 通篇没有验证公理的小题。

该节点三条锚点**全部**来自习题 13 与 14，没有一条来自习题 11。也就是说：三条 quote 各自为
真、逐字无误、机器校验必然通过，而 statement 里唯一编错的那个习题号，正是唯一无锚点覆盖的
那一个。这就是「机器校验通过 ≠ 锚点正确」的机制——机器只能确认 quote 在书里，不能确认
statement 的每个子句都有 quote 管着。

**可推广的检查方法：把 statement 拆成断言，看每条断言由哪条锚点管；无锚点管的断言就是重点
复核对象。** 这条规则在本文件里命中了唯一的归属错误。

### 4.2 锚点只覆盖断言的一半

- `cx-normalizing-constant-breaks-at-the-index-zero`：statement 同时断言 $y_0=1/\sqrt{\pi}$
  与 $y_n=\sqrt{2/\pi}\cos nt$，锚点只引到 $y_0$；而 $y_n$ 就在同一行（15.16-exercises.md
  第 26 行），本可一并引入。
- `cx-orthogonality-depends-on-the-interval`：第二条锚点只说「two of them are orthogonal」，
  没说是哪两个；statement 指名 $1$ 与 $t$。结论我独立验算无误（$\int_{-1}^{1}t\,dt=0$，
  且另两对 $(1,1+t)=2$、$(t,1+t)=2/3$ 均非零，故正交的那一对唯一），但这一步是我算出来的，
  不是锚点给的。
- `cx-isotropic-element-in-a-mixed-sign-plane`：单条锚点只覆盖提示的结论半句，没覆盖
  $(x,x)>0$、$(y,y)<0$ 这两个前提。
- `cx-inner-product-axiom-diagnosis`：三条锚点支撑的是「有若干失效模式」，支撑不了 statement
  里「the four axioms are logically independent」这个更强的断言（这也是它判 FIX/1 的原因）。

### 4.3 SPEC 的字符下限造成的锚点缺口：`cx-single-point-evaluation-is-degenerate`

该节点讲的是习题 12(a) 的 $(f,g)=f(1)g(1)$，但锚点只引了习题 12 的总题干，没引到 (a) 式本
身。原因可查：第 87 行整行是

```
(a) $(f,g) = f(1)g(1)$ .
```

我数了，**24 个字符**，低于 SPEC 的 30 字符下限，而 SPEC 又禁止跨行拼接。于是这一式在
SPEC 下无法被单独锚定。归属经核实无误（该式确在第 87 行，原文标号 (a)，与 aliases 的
「Exercise 12(a)」一致），故判 KEEP，但这是 SPEC 规则自身的一个盲区，见第 5 节。

### 4.4 已排除的一类风险：跨习题混引

15.16-exercises.md 第 29 行（习题 3）与第 36 行（习题 4）是几乎相同的一句话，唯一区别是习题
4 用带花括号的 `$\{x_0, x_1, x_2\}$` 而习题 3 用 `$x_0, x_1, x_2, \ldots$`。两个节点各自引
到了正确的那一行：`cx-cosine-family-is-orthogonal-only-because-of-the-half-period` 引第 29
行，`cx-legendre-family-changes-with-the-interval` 引第 36 行。这是本文件里最容易错挂的一
处，没有错。

另外 `cx-cyclic-dependence-hides-behind-distinct-supports` 的锚点如实保留了原文的 OCR 缺陷
`(1 1, 0, 0)`，未擅自补逗号，符合 SPEC 的不修 OCR 规定。

## 5. 我不确定的地方

1. **24 字符的锚点无解。** 第 4.3 节那一式在 SPEC 下无法锚定：单独不足 30 字符，拼接则跨行。
   SPEC 没有给短行的例外条款。我判 KEEP 并在 reason 里记下，但换一个审计者完全可能判 FIX
   并要求换锚点。这需要 SPEC 的裁定，不是我能定的。
2. **修辞性的全称词，改与不改的界线。**
   `cx-exponential-weight-is-what-tames-the-unbounded-interval` 末句「the only thing that
   makes any pairing at all」字面过强（换别的权函数、或取样型配对同样可行），但正文对比的是
   「有权 vs 无权的纯积分」，在该读法下成立。我判 KEEP。
   `cx-absolute-value-and-product-of-integrals-on-polynomials` 末句「loses the sign」也偏
   松——习题 12(d) 的 $(f,f)=(\int f)^2\ge 0$ 从不为负，失去的是严格性而非符号。
   `cx-cross-terms-do-not-collapse-to-twice-the-inner-product` 末句「only Hermitian
   symmetry, not homogeneity」选错了对手，真正的对手是共轭齐性。这三处我都判了 KEEP（紧邻
   的句子已把机制说准），但它们与我判 FIX/1 的三个全称词之间只隔着一层判断，界线不硬。
3. **书外定理能不能进 statement。** `cx-parallelogram-law-is-forced-by-an-inner-product` 的
   「exactly what a length function must satisfy」的充分性方向是 Jordan–von Neumann 定理，
   **不在 Apostol 书内**。节点没把它归给该书（不算 cause 3），但也没标 `origin: model`。
   SPEC 只规定了锚点的 `origin`，没规定 statement 里的书外内容如何标注。我按「未误归属」判
   KEEP。
4. **习题 14 的编号无法从文件确证。** 15.12-exercises.md 第 113–123 行被 OCR 毁掉，
   「14.」这个标号没有存活。我在 `cx-convergence-must-be-proved-before-the-axioms` 的
   suggested_fix 里沿用了「Exercise 14」，那是按位置推断的（夹在 13 与 15 之间），不是从文
   件里读到的。若需要确证该编号，得查纸书。
5. **第三节自算数值清单的完整性。** 我按指示只读了 `report/丢弃与未覆盖清单.md` 第三节，
   却已发现一个未收录的自算值对（第 2.3 节）。我无法判断该清单还漏了多少，也无法判断这是
   清单的口径问题还是遗漏。
6. **edges 未审。** 我只审了节点文件。第三节的前言提到相关边被标为 `origin: model`，这些边
   我一条都没看，它们的正确性不在本报告的覆盖范围内。
7. **type 字段。** `cx-symmetric-interval-decouples-the-coefficients` 的 type 是 method，读
   起来更像 concept/fact。这类分类问题不在我的 cause 码里，我一概未判。
8. **薄与错的分界。** 第 3.3、3.4 节列出的节点都不错，只是名不副实或信息量低。我一律 KEEP，
   把取舍留给审计 B。若项目要求 `cx-` 只收真反例，那批节点的处置会与我的判决不同。

## 6. 交付前自检

**（1）判决行数 == 34。** `grep -c . data/nodes-A2-x2.jsonl` = **34**；
`grep -c . report/audit-A4b-verdicts.jsonl` = **34**。一致，无需动用我自己的计数。

**（2）无越界 id、无重复 id。** 把判决文件的 id 抽出排序，与节点文件的 id 集合做双向 comm：
- 判决中不在节点文件里的 id：**无**（无越界，无名字匹配误伤）。
- 节点文件中无判决的 id：**无**（34/34 全覆盖）。
- `uniq -d` 查重：**无重复**。
- 所有 id 均从节点文件逐字照抄，未按名字匹配。

**（3）第三节每个「模型自行计算」数值都已重算——逐个点名：**

| # | 节点 id（逐字） | 清单所述数值 | 我的重算 | 结论 |
| --- | --- | --- | --- | --- |
| 1 | `apostol:cx-metric-criteria-need-the-real-case` | $C^1$ 中取 $x=1$、$y=i$ | $\|x+y\|^2=(1+i)(1-i)=2=1+1$；$(x,y)=1\cdot\overline{i}=-i\neq 0$ | **正确** |
| 2 | `apostol:cx-l2-optimal-approximation-can-be-poor-pointwise` | $\pi-2\sin x$ 在 $0$ 点误差为 $\pi$ | $c_0=\pi$、$c_1=0$、$c_2=-2$；$g(0)=\pi$、$f(0)=0$，误差 $\pi$ | **正确** |
| 3 | `apostol:cx-pairing-can-converge-off-the-space` | 习题 13(d) 中 $x\notin V$ 而级数收敛到 $e^2-1$ | $\sum_{n\ge1}2^n/n!=e^2-1\approx 6.389$；$\sum 4^n$ 发散故 $x\notin V$ | **正确** |

三个全部重算，三个全部正确。另外重算了第 2.3 节列出的一批未收录数值，同样全部正确。
