# 分歧与争议

## META
- 用途：只收来源之间**真正互相矛盾**的地方，不收措辞差异
- 价值：凡有分歧处，就不存在可照搬的「最佳实践」，必须自己判断

## § 1 严格性该在什么时候进入

### 分歧双方

#### Kevin Zhou 立场
- 证据等级：LEVEL_2
- 主张：明确反对物理学习者从严格数学开始

对 Spivak 的评价：
```
- 目标读者：训练数学家，不是物理学家
- 内容特征：只一章讲实际算积分，却从证明 0<1 和 1+1≠0 开始
- 结论：you won't need any experience with rigorous proofs to get started in physics
- 理由：Newton didn't care about rigor when he invented calculus
        微积分数学基础被确立时，物理学家已用它解决真实问题好几个世纪
```

#### Terence Tao 立场
- 证据等级：LEVEL_2
- 主张：三阶段模型把 rigorous 阶段当作**不可跳过**的中间层

逻辑：
```
post-rigorous 的直觉之所以可信
  ↓
正因为它经过了严格性的校准
```

### 分歧性质分析

```
部分表面：
  Zhou：物理入门
  Tao：数学家成长全程
  对象不同

实质冲突：
  目标=理论物理（'t Hooft 路线终点）
    Zhou：可长期停留在 pre-rigorous 数学状态
    Tao：这是发育不全
```

### Zhou 的缓冲
- 如果对严格性感兴趣：「can start reading Spivak without any prior calculus background」
- 定位：并行的可选支线，不是前置

### 可操作判断
```
依据：目标，不是对错

以解决物理问题为目标：
  → Zhou 顺序成本更低

以理解数学结构为目标：
  → 绕过 rigorous 阶段会在后面付账
```

## § 2 要不要读「硬核」书，什么时候读

### Zhou 对硬核书的双重态度

#### 态度A：不适合自学
```
书目：Landau-Lifshitz, Shankar
评价：也很好，但**不适合自学**
原因：
  - 省略初学者需要的语境
  - 缺少丰富的练习题
  - 把数学背景当作理所当然
建议：先掌握最小集，之后这些难书会变得容易接近
```

#### 态度B：用于校准「难」的认知
```
推荐书目：
  - Whittaker《Analytical Dynamics》
  - Smythe《Static and Dynamic Electricity》

特征：
  - 收录大量剑桥 Tripos 考题
  - 「an order of magnitude harder than any graduate exam today」
  - 假设如今不再教的背景（椭圆函数、抛物坐标）

黑色幽默：
  If you find Smythe too hard, Jackson's book is relatively easy in comparison
```

### 不是矛盾，是两个用途

```
用途1：系统学习
  → 用清晰且题目丰富的书

用途2：校准对「难」的认知
  → 用另一类材料
```

### Zhou 给出的理由
```
清晰的书 → 产生错觉：
  更高级的物理 = 例行套用越来越长的公式表

19世纪巨人 → 热爱难题：
  他们发明这些理论工具正是为了解决难题

实例：
  多数本科力学书花100页讲哈密顿力学形式
  然后除了简谐振子什么都不用它解
```

## § 3 教科书够不够

### 肯定方：Fowler/Zhou/'t Hooft
- 共同前提：好书 + 做题 + 认真想 = 足够
- Zhou 最直接：「You can do everything by just reading good books and thinking hard」

### 否定方：Matuschak
- 文档：Why books don't work
- 主张：直接否认上述前提

承认但认为不充分：
```
教科书至少有显式认知模型：
  讲解与练习交替
  
但这不充分，证据：
  人们仍然去上以教科书为核心的课程
  而不是自己读
```

课程提供而教科书不提供的：
```
- 排定的节奏
- 习题反馈
- 通过讨论的社会性学习
- 教师的专业判断
- 问责感
- 情绪投入
```

核心诊断：
```
教科书「still foist most of the metacognition onto the reader」
```

### 分歧性质

```
性质：实质性分歧，指向同一件事的两侧
```

### Zhou 路线的隐含解决方案

```
Zhou 没有点名，但实际提供了替代物：

教师的专业判断
  → 逐本书注明所需数学背景

排定的节奏
  → 每周一章

习题反馈
  → AP 模拟考 + 往年竞赛题作为进度检验
```

逻辑：
- 不是否认这些需求存在
- 而是提供了自学版本的替代物

### Matuschak 未被覆盖的一项

```
社会性学习

证据：
  - Baez：建议找学习伙伴、去问答社区
  - Vakil：主要靠和人交谈来学习
  - Rusczyk：Calculus Trap 把同伴质量列为核心理由之一

结论：
  这一项在纯粹的独自自学里确实没有替代物
```

## § 4 记忆训练在数理学习中的位置

### Nielsen 主张
- 证据等级：LEVEL_2
- 主张：基础事实和术语的流畅调用是理解高阶材料的最大障碍之一
- 方法：间隔重复系统化地用于技术论文阅读

### Zhou 判据
- 与 Nielsen 局部一致
- 要求：代数三角要「down cold」

具体标准：
```
if you take more than one second to recall sin 30°
  → 还不够
  
理由：
  一道两步的题会感觉像二十步
  因为你在手忙脚乱地回忆半忘的数学
  
比喻：
  like trying to learn the guitar while hopping on one leg
```

### 手段不同

```
Zhou：
  从未提到间隔重复或卡片
  处理方式隐含在大量做题中

Nielsen：
  主张显式的卡片系统
```

### 未解决的问题

```
数理学习中真正需要「记住」的东西：
  
  可卡片化的原子事实：占多少？
  只能通过解题内化的：占多少？
```

### Nielsen/Woźniak 的限制

```
Nielsen：
  卡片对**服务于具体项目**时最有效
  抽象的「我应该学这个」不行

Woźniak：
  第一条规则=不理解不要记

两条限制加起来 → 适用范围压缩到：
  已理解 + 需固化 + 且形式上可原子化

数理中大量内容不在此范围：
  - 如何选择方法
  - 何时某个近似失效
```

### Thurston 的导数七解作为反例
- 七种理解方式很难卡片化
- 价值恰恰在于彼此之间的调和过程

## § 5 大语言模型能不能用来学

### Zhou 判断（2025年）
- 证据等级：LEVEL_2
- 评价：「about as good as Wikipedia for getting the gist of a subject」
- 可以：聊得很有趣
- 不适合：「not suitable for learning a subject deeply from scratch」
- 归类：与维基百科、YouTube 同一类的二手资料

### Zhou 的相反操作
- 在 Minimum 文档里
- 把「中立询问 AI 时给出的答案」
- 与自己和 Susan Rigetti 的推荐并列
- 作为存在广泛共识的**证据**

### 两处不矛盾，但区分很重要

```
信任 LLM 作为：
  已有共识的汇总器 ✓

不信任 LLM 作为：
  深入学习的媒介 ✗
```

### 对 Studium 的含义
- 这个区分对 Studium 这类系统的定位有直接含义
- 详见 05-implications.md § 7

### 证据限制

```
状态：一位从业者在特定时点的判断，不是研究结论
未找到：任何关于 LLM 辅助数理自学效果的对照研究
```

## § 6 竞赛训练与学科学习的关系

### Zhou 在两个方向上的明确判断

#### 判断A：数学竞赛不是物理竞赛的前提
```
主张：To do well at physics, you study physics, not triangle centers

证据：
  - 美国物理队多数成员从未参加 USAMO
  - 绝大多数没为它花过时间

理由：
  - 组合和数论的想法在物理里几乎从不有用
  - 几何方面：USAPhO 和 IPhO 从未出过需要超出圆锥曲线最基本性质的题
```

#### 判断B：但物理竞赛与物理学科不脱节
```
主张：物理竞赛为激发对物理兴趣、教学生像物理学家一样思考而发明

与 Rusczyk 对比：
  Rusczyk 对数学竞赛描述：
    聚焦欧氏几何这类在高等数学中很少出现、但可无限加难的小众题目
  
  Zhou 对物理竞赛描述：
    从 F=ma 爬到 IPhO 会带你游历这门学科最伟大的思想

判据：
  A good theoretical physics graduate student should be able to solve IPhO problems
  and that's a good thing
  
含义：
  你学到的是真东西，不是为竞赛造的技巧
```

### 对 Rusczyk 的明确反驳
- Zhou 明确点名：Calculus Trap 的论证对数学成立，但物理不同

### 实用推论
```
if 已经自学过相对论、量子力学等高级内容:
  → 不要犹豫，直接进竞赛
  → you'll be rewarded for your experience
```

## § 7 需要多少资源

### Zhou 记录的下限案例
```
近年美国 IPhO 队成员：
  - 有人只用70年前的、10美元的 Dover 书
  - 有人在家自学、没有物理老师或家教
  - 有人只用了他评价颇差的 OpenStax 教材
  - 有人**只用维基百科**
```

### Zhou 的限定（重要）
```
提这些不是鼓励别人照做
  
这些人如果一开始就用更好的书都会更轻松

要反驳的错觉：
  新学生常以为不用二十本书或最贵的辅导班就没戏
```

### 唯一共同因素
```
thinking deeply about physics, and enjoying it
```

### 与 Matuschak 的张力

```
这些案例说明：
  媒介质量下限 < 想象
  学习者投入 = 主导变量

但它们是**生存者样本**：
  看不到用同样差的资料而失败的人有多少

两方各自成立的部分：
  Zhou：媒介不是充分条件
  Matuschak：媒介设计仍可降低失败率
```
