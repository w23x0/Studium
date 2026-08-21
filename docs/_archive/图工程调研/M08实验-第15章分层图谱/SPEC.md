# 第15章「线性空间」分层图谱 —— 抽取契约

本实验在 Apostol《Calculus, Vol 1》第15章(15.1–15.16)上构建一个**分层有向图**,
两个正交方向同时展开:

- **纵向延深**:向下把粗粒度概念递归拆到原子(D 层),向上把 L1 网络抽象到天花板(L2…Ln)。
- **横向对比**:章内兄弟概念辨析(H-in)、跨章回指(H-back)、跨教材对齐(H-cross,对 Strang ch3–4)。

`data/inherited/` 是已机器校验的 L1 底座(Apostol 63节点/112边,Strang 62节点/101边,锚点通过率 100%)。
**不要重抽 L1。** 你的工作建立在它之上。

## 关系词表(封闭,9 + 1)

方向严格按下表理解,方向错误判为缺陷。

| rel | 含义(严格) | 对称? |
| --- | --- | --- |
| `is-a` | src 是 dst 的特例/子类/实例 | 否 |
| `part-of` | src 是 dst 的组成成分 | 否 |
| `requires` | 要陈述或理解 src 必须先有 dst | 否 |
| `implies` | 从 src 可推出 dst | 否 |
| `equivalent` | src 与 dst 在给定条件下互相等价 | 是 |
| `contrasts` | src 与 dst 需成对辨析,或易被混淆 | 是 |
| `applies-to` | src 是方法/判别法,dst 是它作用的对象类 | 否 |
| `generalizes` | src 是 dst 的推广 | 否 |
| `alias-of` | 同一对象的两个名字 | 是 |
| `other` | 以上都不适用。**必须**填 `rel_note` | — |

`is-a` 与 `generalizes` 互为反向,**只写一条**。对称关系只写一个方向。

## 节点类型(封闭,4)

`concept` / `method` / `theorem` / `notation`

## id 命名空间

| 前缀 | 用途 | 谁产出 |
| --- | --- | --- |
| `apostol:` | Apostol 第15章节点 | 已有(继承) |
| `strang:` | Strang ch3–4 节点 | 已有(继承) |
| `d:` | 纵向下延的细粒度/原子节点 | D 层代理 |
| `x:` | 跨教材对齐节点(不变量) | H-cross 代理 |
| `L2:`…`Ln:` | 抽象结构节点 | 阶梯代理 |

后接英文 kebab-case,全局唯一。**引用已有节点必须用它的原 id**,不要造新 id 重复表达同一对象。

## 锚点规则(唯一硬校验)

```json
"anchors":[{"file":"15.02.md","quote":"逐字连续子串"}]
```

- 至少 1 条,最多 3 条。`quote` 必须在 `file` 中**逐字连续出现**,用 `grep -F` 机器校验。
- 长度 30–200 字符。不跨行拼接、不改标点、不加省略号、不修正 OCR 噪声。**复制粘贴,不要凭记忆重写。**
- 找不到可逐字引用的依据 ⇒ **不要收录**,或标 `origin: model` 并如实说明。
- 抽象层节点(L2+)不要求原文锚点,但**必须**列出它统摄的下层成员 id(`members`),
  且这些 id 必须真实存在于下层数据文件中。**编造成员归属是本实验最严重的缺陷。**

## 节点 schema(JSONL,一行一个)

```json
{"id":"d:additive-inverse-uniqueness","name_en":"...","name_zh":"...","node_type":"theorem","sections":["15.04"],"statement":"1–3句英文,说清它是什么/断言什么","aliases":[],"anchors":[{"file":"15.04.md","quote":"..."}],"parent":"apostol:linear-space","atomic":true,"atomic_reason":"为什么判定它已足够原子"}
```

`parent` / `atomic` / `atomic_reason` 仅 `d:` 节点必填。

## 边 schema(JSONL,一行一个)

```json
{"src":"<id>","rel":"requires","dst":"<id>","origin":"source|model","evidence":{"file":"15.07.md","quote":"逐字子串"},"rel_note":"仅 rel=other 时必填"}
```

- `origin: source` 必须给逐字 `evidence`(机器校验)。`origin: model` 可省 `evidence`,
  但**必须如实标注,不要把推断伪装成原文**。
- 纵向边方向恒为 **粗 → 细**(`part-of` / `requires`),不论谁先被发现。

## 抽象层候选 schema(L2 及以上)

```json
{"id":"L3:...","name_zh":"...","name_en":"...","layer":3,"statement":"这个结构是什么",
 "members":["apostol:...","d:...","L2:..."],
 "boundary":"边界与反例:至少一个具体反例,说明什么东西看起来属于它但不属于",
 "abstraction_gain":"抽象增益声明:它比下层多提供了什么可迁移的判断力",
 "sections":["15.10","15.14"]}
```

`boundary` 与 `abstraction_gain` **缺一即判死**。这两栏是上一轮实验中审计质量的最大贡献项。

## 审计规则

每层两名独立审计:

- **审计 A(正确性与归属)**:数学是否正确;`members` 是否真的属于它;锚点/引文是否真在书里。
  逐条核对,不放过量词("所有/仅/恰好")。
- **审计 B(抽象增益)**:是否只是"换个名字重新包装下层";是否是空洞哲学。杀掉伪抽象。

**审计裁决必须回显候选 id**,不要用名字匹配(上一轮因名字匹配造成过 9 例误杀)。
每条裁决格式:`<id> | KEEP|KILL | 死因编号 | 一句理由`。

死因编号:`1` 量词过度断言 / `2` 编造成员归属 / `3` 伪造教材出处 / `4` 数学错误 / `5` 伪抽象·层塌缩。

**停止规则**:某层存活 <2 ⇒ 该层为天花板,不再往上。

## 硬性禁止

- 不要读 `M08实验-Apostol微积分卷1/`(上一轮 ch10 实验,会污染)。
- 不要读其他代理的输出文件,除非任务书明确给了路径。
- 不要为凑数造节点;也不要因怕错而漏掉教材明确讲了的核心对象。
- 不要静默截断:如果你因为篇幅只处理了一部分,必须在报告里写明丢了什么。
