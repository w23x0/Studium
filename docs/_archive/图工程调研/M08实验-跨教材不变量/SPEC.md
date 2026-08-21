# 抽取契约(所有代理必须严格遵守)

本实验测量:两本呈现方式完全不同的教材讲同一批数学时,独立抽取出的知识结构在多大程度上收敛。
因此**格式一致性比覆盖率更重要**。宁可少抽一个节点,也不要偏离本契约。

## 关系词表(封闭,9 + 1)

方向必须严格按下表理解。方向错误会被判为不一致,不要凭直觉。

| rel | 含义(严格) | 对称? |
| --- | --- | --- |
| `is-a` | src 是 dst 的一个特例 / 子类 / 实例。例:`euclidean-space is-a linear-space` | 否 |
| `part-of` | src 是 dst 的组成成分(dst 由若干成分构成,src 是其中之一) | 否 |
| `requires` | 要陈述或理解 src,必须先有 dst。dst 是 src 的前置 | 否 |
| `implies` | 从 src 可以推出 dst(src 是依据,dst 是结论) | 否 |
| `equivalent` | src 与 dst 在给定条件下互相等价 | 是 |
| `contrasts` | src 与 dst 需要成对辨析,或易被混淆 | 是 |
| `applies-to` | src 是一个方法/判别法/过程,dst 是它作用的对象类 | 否 |
| `generalizes` | src 是 dst 的推广(dst 是 src 的特例) | 否 |
| `alias-of` | 同一个数学对象的两个名字 | 是 |
| `other` | 以上都不适用。**必须**在 `rel_note` 里写清关系语义 | — |

注意 `is-a` 与 `generalizes` 是彼此的反向:若 `X is-a Y` 则 `Y generalizes X`。
**只写其中一条,不要同时写两条。** 规则:当侧重"X 属于 Y 这一类"用 `is-a`;当侧重"Y 是把 X 放宽后得到的更广定理/概念"用 `generalizes`。

`other` 的使用频率会被统计,它衡量词表是否够用。需要时就用,不要硬塞进不合适的关系里。

## 节点类型(封闭,4)

- `concept` —— 数学对象或性质(线性空间、子空间、维数、正交性)
- `method` —— 可执行的过程或判别法(Gram-Schmidt 过程、消元法、最小二乘求解)
- `theorem` —— 有明确条件与结论的命题(含引理、推论)
- `notation` —— 记号或约定(`\|x\|`、$A^{\mathrm{T}}$、$C(A)$)

## 节点 schema(JSONL,一行一个)

```json
{"id":"<book>:<kebab-slug>","name_en":"...","name_zh":"...","node_type":"concept|method|theorem|notation","book":"apostol|strang","sections":["15.02"],"statement":"...","aliases":["..."],"anchors":[{"file":"15.02.md","quote":"逐字原文子串"}]}
```

- `id`:必须以 `apostol:` 或 `strang:` 开头,后接英文 kebab-case。同一 book 内唯一。
- `statement`:一句到三句英文,写清这个对象**是什么 / 断言什么**。用教材自己的表述方式,不要替它抽象。
- `anchors`:**至少 1 条,最多 3 条**。`quote` 必须是 `file` 里**逐字连续出现**的子串(会用 `grep -F` 机器校验)。
  - 长度 30–200 字符。不要跨行拼接,不要改标点,不要省略号,不要修正原文错别字或 OCR 噪声。
  - 从源文件复制粘贴,不要凭记忆重写。
  - 如果一个候选节点找不到可逐字引用的依据,**不要收录它**。
- `sections`:来源文件名去掉 `.md`。

## 边 schema(JSONL,一行一个)

```json
{"src":"<id>","rel":"requires","dst":"<id>","origin":"source|model","evidence":{"file":"15.07.md","quote":"逐字原文子串"},"rel_note":"仅 rel=other 时必填"}
```

- `origin: source` —— 教材文字直接支持这条关系,必须给 `evidence`(同样逐字、会被机器校验)。
- `origin: model` —— 教材没有明说,是你依据数学事实补的。`evidence` 可省略。**如实标注,不要把推断伪装成原文。**
- `src` / `dst` 必须是你自己节点文件里存在的 id。不要指向另一本书。
- 对称关系(`equivalent` / `contrasts` / `alias-of`)只写一个方向。

## 硬性禁止

- 不要读另一本书的源文件。
- 不要读 `docs/图工程调研/M08实验-Apostol微积分卷1/`(上一轮实验,会污染)。
- 不要读其他代理的输出文件。
- 不要为了凑数造节点。也不要因为怕错而漏掉教材明确讲了的核心对象。
- 引文必须能过 `grep -F`。这是本实验唯一的硬校验,失败会被记为缺陷。
