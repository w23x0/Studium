# B2 与 A 冲突节点的裁定（orchestrator）

九个节点带冲突裁定：A 类审计员（正确性）改过它们（`audit_fix` 字段），B2（抽象增益/冗余）随后判 KILL 7 个、FIX 2 个。
本文件是我的独立裁定，写在 ADJ1/ADJ2/ADJ3 三位裁定员出结果之前，以免我的判断被他们影响或反过来影响他们。
三位裁定员的分工是：ADJ1 常规复核，ADJ2 被指定**专门尝试推翻 B2 的每一个 KILL**，ADJ3 只查残余内容的真假。

## 结论表

| id | B2 | 我的裁定 |
|---|---|---|
| `x:dimension-versus-rank` | FIX | **接受 FIX** |
| `x:independence-criterion-and-its-consequences` | FIX | **接受 FIX** |
| `d:ten-axioms-listed-in-three-groups` | KILL | **维持 KILL** |
| `d:axioms-2-7-8-9-are-the-scalar-dependent-axioms` | KILL | **推翻 → FIX**（另发现正确性缺陷） |
| `d:an-example-is-a-set-plus-two-explicit-operations` | KILL | **推翻 → FIX** |
| `d:example-1-verification-is-the-field-axioms-of-r` | KILL | **维持 KILL** |
| `d:function-space-zero-is-the-everywhere-zero-function` | KILL | **维持 KILL** |
| `d:degree-exactly-n-is-not-a-subspace-of-degree-at-most-n` | KILL | **维持 KILL** |
| `x:least-squares-is-a-projection` | KILL | **维持 KILL** |

即：5 维持、2 推翻为 FIX、2 接受 FIX。B2 在这批上的准确率 7/9。

## 逐节点

### 1. `d:axioms-2-7-8-9-are-the-scalar-dependent-axioms` —— 推翻 KILL，改判 FIX

B2 的理由：parent `apostol:complex-linear-space` 首句已逐条点名这四条公理，剩下的「其余六条不受标量域改变影响」是 10 减 4 的补集。

**推翻的依据。** parent 陈述的是**事实**（这四条要替换），节点陈述的是**理由**（为什么只有这四条）。
只读 parent 的学习者会遇到一个真实的疑问：Axiom 6 里有 $(-1)$、Axiom 10 里有 $1$，这两条也提到了数，凭什么不用改？
本节点回答了这个问题——因为 $-1$ 和 $1$ 同时属于两个域，而那四条量化的是**任意**实数。这不是补集运算，是判别力。

**但节点自身有一处正确性缺陷，两轮审计都漏了。** 现首句：

> Exactly four of the ten axioms mention real numbers, namely Axioms 2, 7, 8 and 9.

对照 `source/apostol-ch15/15.02.md`：Axiom 6（:23–27）含 $(-1)$，Axiom 10（:49）含 $1$，都是实数。
所以「只有四条 mention real numbers」为假，而且与本节点**自己的第二句**（承认其余六条 name $-1$ 和 $1$）自相矛盾。
准确的说法是**量化于任意实数**，这也正好是该节点判别力的真正所在。

落盘用 `statement`：

> Exactly four of the ten axioms quantify over an arbitrary real number — Axioms 2, 7, 8 and 9 — and replacing "real number" by "complex number" in those four converts the definition into that of a complex linear space. The other six mention no scalar except the fixed numbers $-1$ (Axiom 6) and $1$ (Axiom 10), which belong to both fields, so they need no change and are untouched by the switch of scalar field.

核对过的 source 行：15.02.md :9（Axiom 2「every real number a」）、:31–35（Axiom 7「all real numbers a and b」）、
:37–41（Axiom 8「all real a」）、:43–47（Axiom 9「all real a and b」）、:23–27（Axiom 6）、:49（Axiom 10）、:51（替换句）。
兄弟节点：0 个（parent `apostol:complex-linear-space` 下只有它），所以冗余只可能来自 parent，不来自兄弟。

### 2. `d:an-example-is-a-set-plus-two-explicit-operations` —— 推翻 KILL，改判 FIX

B2 的理由：与兄弟 `d:linear-space-is-a-set-together-with-two-operations` 同题，后者已把 15.03 的原句收作自己的锚点。

**前两句确实冗余，B2 这一半是对的。** 但 B2 没有处理第三句，那是一份十二个例子的运算来源地图：
Examples 1–3 自带运算、Example 4 继承 $V_n$、Examples 5–12 共用函数空间前言里的定义。
这份地图回答的是「Example 8 的运算在哪里定义」，兄弟节点没有，我逐条读过 parent `apostol:linear-space` 下全部 13 个兄弟，
最接近的 `d:examples-are-asserted-to-satisfy-the-axioms-and-left-to-the-reader` 只说运算是继承来的，没说从哪继承。

处理：保留 id（改 id 会打断已有边），statement 砍掉与兄弟重复的前两句，只留地图。落盘用文本：

> The operations, not the sets, are what Section 15.03 fixes first, and each of the twelve examples takes them from one of three places: Examples 1 to 3 name their own, Example 4 inherits those of $V_n$, and Examples 5 to 12 share the ones given in the function-space preamble. Locating an example's operations therefore means knowing which of the three cases it falls in.

**注意**：这段文本尚未核对锚点射程。改写后必须重跑 `tools/verify_anchors.py`，并且按形式 D 的程序把新 statement 分解成 claim 逐条对锚点——
现有锚点是为旧文本选的，不能假定它们支撑新文本。这一步在应用前必须做。

### 3. `x:dimension-versus-rank` —— 接受 FIX

B2 的理由：首句与 `x:all-bases-are-equinumerous` 重复，第三句是 Strang 自带的告示（"We never speak of the rank of a space or the dimension of a basis"），
真正的增量是一条**负向对齐**——rank 在 Apostol 第 15 章一次都不出现。

我核实了这条负向断言：`grep -rniw rank source/apostol-ch15/` 命中数 **0**。B2 的理由成立，且它自己跑过检索，没有想当然。
FIX 的方向就是让 statement 以这条负向对齐开头，而不是以两句复述开头。具体改写文本交给裁定员，我不在此处定稿——
理由是这个节点属于 X 层（跨教材），改写需要同时核对 Strang 侧行号，ADJ3 被专门指派做这件事。

### 4. `x:independence-criterion-and-its-consequences` —— 接受 FIX

同一形状：B2 指出真增量埋在 `divergence` 末句，而 statement 的前两句分别复述 `x:unique-coordinates-in-a-basis` 和一条只关于表示矩阵的等价链。
接受。同样把定稿留给 ADJ3。

值得单独记下的方法学观察：这两个 FIX 是同一个缺陷模式的两个实例——**真正的增量被写进了 `divergence` 字段，而 `statement` 留给了复述**。
如果这在 X 层普遍存在，那是 X 层的结构性问题，不是两个孤立节点的问题。已在给 ADJ3 的指令里要求它回答这一点。

### 5. `d:ten-axioms-listed-in-three-groups` —— 维持 KILL

parent 已写「subject to ten axioms listed in three groups」，三个分组各自是 L1 兄弟节点，
而 2/4/4 这个数字分解可以直接从那三个兄弟自己的 statement 读出（「Axioms 1 and 2」「Axioms 3 to 6」「Axioms 7 to 10」）。
节点自己的 `atomic_reason` 也承认分组三节点已在 L1 存在。剩下的「分组只是叙述性的」是无后果的元评论。删除测试通过，维持。

### 6. `d:example-1-verification-is-the-field-axioms-of-r` —— 维持 KILL

把十条公理逐条映射到 $\mathbb{R}$ 的算术律是纯代入，无判别力；结论「本例无非平凡验证」已被 parent 覆盖。
另有一致性理由：同 species 的 `d:example-3-verification-reduces-to-arithmetic-in-each-component` 已在前一轮被杀，两者应同判。维持。

### 7. `d:function-space-zero-is-the-everywhere-zero-function` —— 维持 KILL

parent `apostol:function-space` 已写「with the everywhere-zero function as zero element」。
节点附加的机制「Axiom 2 迫使 $0f = O$ 进入集合」由兄弟 `d:degree-exactly-n-fails-axiom-2-at-the-scalar-zero` 逐字承担，
所举实例由 `d:degree-exactly-n-has-no-zero-element` 承担。我读了 parent 下全部 10 个兄弟确认。维持。

### 8. `d:degree-exactly-n-is-not-a-subspace-of-degree-at-most-n` —— 维持 KILL

这是本批里最干净的一个 kill。15.04 的子空间定义就是「本身也构成线性空间的子集」，
parent 已断言次数恰为 $n$ 的多项式不是线性空间，非子空间性一步即得；所谓寓意「被包含并沿用运算并不足够」就是子空间定义本身的改写。维持。

### 9. `x:least-squares-is-a-projection` —— 维持 KILL

B2 复述兄弟 `x:best-approximation-by-the-projection` 的 divergence 末段，并明确说明为什么保留兄弟而杀本节点
（兄弟另有「定理 vs 定义」的位置互换与唯一性条款存否两项）。理由完整。

一处保留意见：B2 自己在 §6.4/§6.5 承认，X 层节点没有 `parent`，它的删除测试在这里用的是未定义的操作化。
本例它实际用的是兄弟比较，对无 parent 的层来说这是合理替代，所以结论我维持——但 SPEC 应当把「无 parent 层如何做删除测试」写明，
不能靠审计员每次临时发明。已列入 SPEC 修订待办。

## 应用前的必做事项

1. 两个改写节点（#1、#2）的新 statement 必须重跑锚点校验，并按形式 D 的程序逐条 claim 对锚点核射程。现有锚点是为旧文本选的。
2. 5 个维持的 KILL 用 `tools/apply_kills.py --only <5 ids> --dry-run` 先看计划，确认后再落盘。
   该脚本已加固：真 argparse、`--dry-run`、墓地改为追加或拒绝（起因见 `data/graveyard/README-恢复记录.md`）。
3. KILL 后要清理指向被杀节点的 `members` 引用（L2 层可能引用了它们），否则会产生悬空成员。
4. 三位裁定员回来后，凡与本文件不一致处，以证据强度定论而非以人数定论；不一致本身要写进实验报告，
   因为「同一批节点上三个独立裁定员的分歧率」是关于本方法可靠性的一手数据。
