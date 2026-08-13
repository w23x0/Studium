# B8a 格式内嵌 schema 演化机制细节（Avro / Protobuf Editions / JSON Schema）— 发现

## 0 一句话结论
在三种"格式内嵌 schema 演化"机制中，Avro 与 Protobuf 在规范层面显式定义了跨 schema 版本读取的兼容规则（Avro：reader/writer schema resolution、promotion 表、enum default；Protobuf Editions：wire-safe 变更清单、feature 生命周期、open enum 未知值保留），而 JSON Schema 2020-12 在规范层面只定义了"实例对单个 schema 校验"的语义（enum 是闭集相等断言，无 reader/writer、无跨版本兼容判定）；因此"枚举增补不破坏旧数据校验"的保证，在 Avro/Protobuf 来自规范内建机制（enum default / 加枚举值 wire-safe + open enum），在 JSON Schema 只能来自词表设计（封闭枚举含常驻 other 兜底 + schema 版本化双轨校验）或注册中心实现规则（Confluent：enum 增补向后兼容、向前不兼容）——推断等级 C，且本分支不做格式选型结论。

## 1 逐条回答
### Q1 Avro schema resolution 的兼容性规则原文（reader/writer schema 匹配、promotion、default 值）——哪些字段变更安全
- 匹配条件（Avro 1.12.0 §Schema Resolution 原文）：两 schema 匹配需满足其一——数组 items 匹配 / 映射 values 匹配 / 枚举 (unqualified) name 匹配 / fixed 的 size 与 (unqualified) name 匹配 / record 同 (unqualified) name / 任一为 union / 同为某 primitive / writer 可 promotion 到 reader。
- promotion 表（原文）：int→long, float, double；long→float, double；float→double；string↔bytes。
- records（原文）："the ordering of fields may be different: fields are matched by name"；同名字段递归解析；"if the writer's record contains a field with a name not present in the reader's record, the writer's value for that field is ignored"；reader 新增字段有 default → 用 default；"if the reader's record schema has a field with no default value, and writer's schema does not have a field with the same name, an error is signalled"。
- enums（原文）："if the writer's symbol is not present in the reader's enum and the reader has a default value, then that value is used, otherwise an error is signalled"。
- aliases（原文）："Named types and fields may have aliases. An implementation may optionally use aliases to map a writer's schema to the reader's. This facilitates both schema evolution as well as processing disparate datasets."（实现可选用；PCF 规范化把 doc/aliases STRIP 掉，见 K6）。
- 由此"安全变更"清单：加字段（reader 需 default）、删字段（writer 侧忽略）、枚举增补（reader 需 default 才 forward 安全）、数值类型放宽（promotion 表）、字段顺序重排（按名匹配）、字段/类型改名（靠 aliases，可选）。

### Q2 Protobuf Editions（edition 2023）的字段演化规则原文（reserved、features、最小破坏原则、每年一版）
- 最小破坏 + 每年一版（Editions Overview 原文）："Editions won't break existing binaries and don't change a message's binary, text, or JSON serialization format. Edition 2023 was as minimally disruptive as possible. It established the baseline and combined proto2 and proto3 definitions into a new single definition format."；"Editions are planned to be released roughly once a year."。
- feature 生命周期（原文）："Features have an expected lifecycle: introducing it, changing its default behavior, deprecating it, and then removing it."；"Removing a feature will always initiate a major version bump."；默认值变化时 Prototiller 为旧文件显式回填旧行为。
- wire-unsafe（原文）：改字段号；移入既有 oneof。
- wire-safe（原文）：加字段、删字段（"You may want to rename the field instead, perhaps adding the prefix 'OBSOLETE_', or make the field number reserved"）、"Adding additional values to an enum is safe."、单字段 oneof↔显式存在字段互转、字段↔同号同类型 extension。
- 警告（原文）："any wire-safe changes may be a breaking change to application code... adding a value to a preexisting enum would be a compilation break for any code with an exhaustive switch on that enum"。
- wire-compatible（条件安全，原文）：int32/uint32/int64/uint64/bool 互转（高位截断）、sint32↔sint64、string↔bytes（须 UTF-8）、enum↔int32/uint32/int64/uint64、singular↔repeated（string/bytes/message）、fixed32↔sfixed32 等。
- reserved（原文）：字段号/字段名 `reserved 2, 15, 9 to 11; reserved foo, bar;`；枚举 `reserved 2, 15, 9 to 11, 40 to max; reserved FOO, BAR;`；"Field numbers should never be reused"。
- deprecated（原文）："deprecated (field option): If set to true, indicates that the field is deprecated and should not be used by new code. In most languages this has no actual effect. In Java, this becomes a @Deprecated annotation. For C++, clang-tidy will generate warnings whenever deprecated fields are used."（指南进一步建议最终改为 reserved 语句）。

### Q3 JSON Schema 2020-12 的 $dynamicRef/$recursiveRef、unevaluatedProperties 等用于"开放字段+封闭词表"并存的能力
- $dynamicRef（Core §8.2.3.2 原文）："allows for deferring the full resolution until runtime"；"Together with $dynamicAnchor, $dynamicRef implements a cooperative extension mechanism that is primarily useful with recursive schemas"；命中 $dynamicAnchor 片段时替换为 dynamic scope 最外层同名锚点，否则"its behavior is identical to $ref"。
- $dynamicAnchor（Core §8.2.2 原文）："indicates that the fragment is an extension point when used with the $dynamicRef keyword... without imposing any particular semantics on that extension"；并 RECOMMENDED 优先用 $anchor。
- 官方 tree/strict-tree 示例（Core §8.2.3.2 附近 + 附录 C）：tree 用 `"$dynamicAnchor": "node"` + children items `"$dynamicRef": "#node"`；strict-tree 用 `"$ref": "tree"` + `"unevaluatedProperties": false`，使递归在 strict-tree 根部自指、并捕获拼写错误（daat）。这是"开放递归骨架 + 封闭属性拼写"并存的官方示例。
- unevaluatedProperties（Core §11.3 原文）：只作用于 properties/patternProperties/additionalProperties 及所有 in-place applicator 注释结果未覆盖的属性；"properties, patternProperties, additionalProperties, and all in-place applicators MUST be evaluated before this keyword"。
- 前身：2019-09 用 $recursiveRef/$recursiveAnchor 与 unevaluated*；2020-12 改名 $dynamic*、items/prefixItems 重设计（2020-12 Release Notes 原文）；2020-12 meta-schema 仍保留 $recursive* 但 `"deprecated": true`（$comment："has been replaced by $dynamicAnchor/$dynamicRef"）。
- 局限：这些关键字都不提供"枚举/词表增补"的演化语义；词表封闭性仍靠 enum（闭集相等）或 additionalProperties:false / unevaluatedProperties:false 表达（见 Q5）。

### Q4 四机制共同点：字段重命名/类型放宽/枚举增补/弃用标记的推荐做法（各规范原文）
- 字段重命名：Avro=aliases（可选，重写 writer schema）+ 按名匹配；Protobuf=字段号不可变、删字段须 reserved 或加 OBSOLETE_ 前缀、reserved 名防 TextProto/JSON 重名；JSON Schema=无内建别名，字段按名匹配（Confluent 规则），改名 = 新属性 + deprecated 旧属性。
- 类型放宽：Avro=promotion 表（int→long/float/double…）；Protobuf=wire-compatible 条件安全组（整数族互转、string/bytes、enum↔整数…）；JSON Schema=实现层规则（Confluent：integer→number 放宽、minLength/maxLength/pattern/minimum/maximum 沿"writer 更严格、reader 更宽松"方向兼容）。
- 枚举增补：Avro=reader enum default 兜底；Protobuf="Adding additional values to an enum is safe"+open enum 保留未知值（但 exhaustive switch 编译破坏警告）；JSON Schema=enum 闭集，规范无增补语义，需版本化/词表设计（见 Q5）。
- 弃用标记：Avro=规范未定义标准 deprecated 属性（在 1.11.1/1.12.0 规范文本中未找到，未核）；Protobuf=deprecated=true（Java @Deprecated、C++ clang-tidy 警告，最终建议 reserved）；JSON Schema=Validation §9.3 deprecated 注解（"SHOULD refrain from usage... MAY mean the property is going to be removed in the future"）。
- 最小破坏共性：三者都以"增量、可逆、默认值/兜底值"为核心——Avro 靠 reader default + promotion；Protobuf 靠 wire-safe 分类 + feature 生命周期 + 每年一版；JSON Schema 无演化概念，以"实例对单 schema 校验"为原子语义，演化问题整体交给外部（注册中心/版本管理）。

### Q5 对 M08"边词表封闭 9+other、开放字段可稳定查询审查"：哪种演化机制能保证"枚举增补不破坏旧数据校验"（推断标 C）
- Avro：reader enum 带 default 时，writer 新增 symbol 可解析（原文见 K4）——旧 reader 读新数据（forward）靠 default；新 reader 读旧数据（backward）天然成立（旧 symbol ⊆ 新 enum）。规范层有显式保证。
- Protobuf："Adding additional values to an enum is safe"（wire-safe）+ open enum（proto3/editions 默认）把未知数值保留在字段内（原文见 K8/K10）——旧 reader 读新值不丢数据、可重序列化；closed enum 会把未知值移入 unknown field set 并重排（规范原文警告），故"不破坏"仅对 open enum 成立。
- JSON Schema：§6.1.2 enum 是闭集相等断言，规范未定义"增补"语义，也无 reader/writer 概念；实现层规则（Confluent：writer 的 symbol 不在 reader 的 enum → error）意味着 enum 增补只向后兼容、不向前兼容。若封闭枚举常驻一个 other 成员（M08 的 9+other），则任何新词表项可映射/落入 other，旧 schema 对新数据仍校验通过——"9+other"正是让 JSON Schema 枚举增补不破坏旧数据校验的前提设计（推断 C，以 §6.1.2 与 Confluent 规则为据）。
- 结论（不选型）：三种机制对"枚举增补"的保证条件可统一表述为"旧数据的值必须仍在新 schema 的枚举集合内，或落在 reader 的兜底路径（enum default / open enum 未知值 / other 成员）上"；Avro 与 Protobuf 在规范层给出该兜底，JSON Schema 需在词表/实现层补足。M08 的"封闭 9+other"与三者都不冲突。（推断 C）

## 2 关键发现
K1. **Avro schema resolution 匹配与 promotion 规则（1.12.0）**
- URL: https://avro.apache.org/docs/1.12.0/specification/ | 标题: Apache Avro 1.12.0 Specification | 机构: Apache Software Foundation | 日期: 版本 1.12.0（访问 2026-08-12）
- 摘录: "To match, one of the following must hold: ... both schemas are enums whose (unqualified) names match ... both schemas are records with the same (unqualified) name ... int is promotable to long, float, or double / long is promotable to float or double / float is promotable to double / string is promotable to bytes / bytes is promotable to string"
- 等级: A
K2. **Avro record 字段解析：按名匹配、多余字段忽略、reader 新增字段须 default**
- URL: https://avro.apache.org/docs/1.12.0/specification/ | 标题: Apache Avro 1.12.0 Specification（Schema Resolution）| 机构: Apache Software Foundation | 日期: 版本 1.12.0（访问 2026-08-12）
- 摘录: "the ordering of fields may be different: fields are matched by name." / "if the writer's record contains a field with a name not present in the reader's record, the writer's value for that field is ignored." / "if the reader's record schema has a field that contains a default value, and writer's schema does not have a field with the same name, then the reader should use the default value from its field." / "if the reader's record schema has a field with no default value, and writer's schema does not have a field with the same name, an error is signalled."
- 等级: A
K3. **Avro enum 默认值：枚举增补/删除的兜底机制**
- URL: https://avro.apache.org/docs/1.12.0/specification/ | 标题: Apache Avro 1.12.0 Specification（Enums 属性 + Schema Resolution）| 机构: Apache Software Foundation | 日期: 版本 1.12.0（访问 2026-08-12）
- 摘录: "default: A default value for this enumeration, used during resolution when the reader encounters a symbol from the writer that isn't defined in the reader's schema (optional)." / "if the writer's symbol is not present in the reader's enum and the reader has a default value, then that value is used, otherwise an error is signalled."
- 等级: A
K4. **Avro aliases：命名/字段别名可重写 writer schema，实现可选**
- URL: https://avro.apache.org/docs/1.12.0/specification/ | 标题: Apache Avro 1.12.0 Specification（Aliases）| 机构: Apache Software Foundation | 日期: 版本 1.12.0（访问 2026-08-12）
- 摘录: "Named types and fields may have aliases. An implementation may optionally use aliases to map a writer's schema to the reader's. This facilitates both schema evolution as well as processing disparate datasets."
- 等级: A
K5. **Avro Parsing Canonical Form：doc/aliases 被 STRIP；指纹识别 schema**
- URL: https://avro.apache.org/docs/1.12.0/specification/ | 标题: Apache Avro 1.12.0 Specification（Parsing Canonical Form for Schemas）| 机构: Apache Software Foundation | 日期: 版本 1.12.0（访问 2026-08-12）
- 摘录: "[STRIP] Keep only attributes that are relevant to parsing data, which are: type, name, fields, symbols, items, values, size. Strip all others (e.g., doc and aliases)."（PCF 的等价证明在 companion document，未抓取——见 U3）
- 等级: A
K6. **Protobuf Editions：最小破坏、不改序列化格式、每年一版、feature 生命周期**
- URL: https://protobuf.dev/editions/overview/ | 标题: Protobuf Editions Overview | 机构: Google LLC（protobuf.dev）| 日期: © 2026 Google（访问 2026-08-12）
- 摘录: "Editions won't break existing binaries and don't change a message's binary, text, or JSON serialization format. Edition 2023 was as minimally disruptive as possible." / "Editions are planned to be released roughly once a year." / "Features have an expected lifecycle: introducing it, changing its default behavior, deprecating it, and then removing it." / "Removing a feature will always initiate a major version bump."
- 等级: A
K7. **Protobuf 字段演化分类：wire-safe / wire-unsafe / wire-compatible（条件安全）**
- URL: https://protobuf.dev/programming-guides/editions/ | 标题: Language Guide (editions) — Updating A Message Type | 机构: Google LLC（protobuf.dev）| 日期: © 2026 Google（访问 2026-08-12）
- 摘录: "Adding new fields is safe." / "Removing fields is safe. The same field number must not used again... rename the field instead, perhaps adding the prefix 'OBSOLETE_', or make the field number reserved" / "Adding additional values to an enum is safe." / "Changing field numbers for any existing field is not safe." / "Moving fields into an existing oneof is not safe." / "int32, uint32, int64, uint64, and bool are all compatible."
- 等级: A
K8. **wire-safe 的枚举增补警告：可能破坏应用代码（exhaustive switch 编译失败）**
- URL: https://protobuf.dev/programming-guides/editions/ | 标题: Language Guide (editions) — Updating A Message Type | 机构: Google LLC（protobuf.dev）| 日期: © 2026 Google（访问 2026-08-12）
- 摘录: "any wire-safe changes may be a breaking change to application code in a given language. For example, adding a value to a preexisting enum would be a compilation break for any code with an exhaustive switch on that enum."
- 等级: A
K9. **Protobuf reserved：字段号/字段名/枚举值防复用**
- URL: https://protobuf.dev/programming-guides/editions/ | 标题: Language Guide (editions) — Reserved Field Numbers / Names / Values | 机构: Google LLC（protobuf.dev）| 日期: © 2026 Google（访问 2026-08-12）
- 摘录: "If you update a message type by entirely deleting a field... add your deleted field number to the reserved list."（字段名同理；枚举："reserved 2, 15, 9 to 11, 40 to max; reserved FOO, BAR;"）
- 等级: A
K10. **Protobuf open/closed enum：open 保留未知值、closed 移入 unknown field set 并重排**
- URL: https://protobuf.dev/programming-guides/enum/ | 标题: Enum Behavior | 机构: Google LLC（protobuf.dev）| 日期: © 2026 Google（访问 2026-08-12）
- 摘录: "Open enums will parse the value 2 and store it directly in the field." / "Closed enums will parse the value 2 and store it in the message's unknown field set." / "Proto3 and editions use open enums specifically because of the unexpected behavior that closed enums cause." / "During deserialization, unrecognized enum values will be preserved in the message"（proto3 指南同文）
- 等级: A
K11. **JSON Schema 2020-12 $dynamicRef/$dynamicAnchor：递归 schema 的合作扩展机制**
- URL: https://json-schema.org/draft/2020-12/json-schema-core.html | 标题: JSON Schema Core 2020-12（§8.2.3.2 / §8.2.2）| 机构: JSON Schema 社区（IETF Internet-Draft）| 日期: draft-bhutton-json-schema-01, 2022-06（datatracker 显示 Expired & archived）
- 摘录: "Together with $dynamicAnchor, $dynamicRef implements a cooperative extension mechanism that is primarily useful with recursive schemas." / "$dynamicAnchor indicates that the fragment is an extension point when used with the $dynamicRef keyword... without imposing any particular semantics on that extension." / "Otherwise, its behavior is identical to $ref."
- 等级: A
K12. **tree/strict-tree 官方示例："开放递归骨架 + 封闭属性拼写"并存能力**
- URL: https://json-schema.org/draft/2020-12/json-schema-core.html | 标题: JSON Schema Core 2020-12（§8.2.3.2 示例 / 附录 C）| 机构: JSON Schema 社区（IETF Internet-Draft）| 日期: draft-bhutton-json-schema-01, 2022-06
- 摘录: "This way, the recursion in the 'tree' schema recurses to the root of 'strict-tree', instead of only applying 'strict-tree' to the instance root, but applying 'tree' to instance children."（strict-tree 以 `"$ref": "tree"` + `"unevaluatedProperties": false` 捕获拼写错误 "daat"）
- 等级: A
K13. **unevaluatedProperties：只约束未被 properties/patternProperties/additionalProperties 及 in-place applicator 覆盖的属性**
- URL: https://json-schema.org/draft/2020-12/json-schema-core.html | 标题: JSON Schema Core 2020-12（§11.3）| 机构: JSON Schema 社区（IETF Internet-Draft）| 日期: draft-bhutton-json-schema-01, 2022-06
- 摘录: "Validation with 'unevaluatedProperties' applies only to the child values of instance names that do not appear in the 'properties', 'patternProperties', 'additionalProperties', or 'unevaluatedProperties' annotation results that apply to the instance location being validated." / "all in-place applicators MUST be evaluated before this keyword can be evaluated."
- 等级: A
K14. **JSON Schema enum 是闭集相等断言；default/deprecated 是注解**
- URL: https://json-schema.org/draft/2020-12/json-schema-validation.html | 标题: JSON Schema Validation 2020-12（§6.1.2 / §9.2 / §9.3）| 机构: JSON Schema 社区（IETF Internet-Draft）| 日期: draft-bhutton-json-schema-validation-01, 2022-06
- 摘录: "An instance validates successfully against this keyword if its value is equal to one of the elements in this keyword's array value."（enum）/ "This keyword can be used to supply a default JSON value associated with a particular schema. It is RECOMMENDED that a default value be valid against the associated schema."（default）/ "If 'deprecated' has a value of boolean true, it indicates that applications SHOULD refrain from usage of the declared property. It MAY mean the property is going to be removed in the future."（deprecated）
- 等级: A
K15. **2020-12 中 $recursiveRef/$recursiveAnchor 被废弃（meta-schema 原文）且 2019-09→2020-12 改名**
- URL: https://json-schema.org/draft/2020-12/schema（meta-schema）+ https://json-schema.org/draft/2020-12/release-notes.html | 标题: 2020-12 meta-schema；2020-12 Release Notes | 机构: JSON Schema 社区 | 日期: 2020-12 系列（访问 2026-08-12）
- 摘录: "$recursiveAnchor: { '$comment': '\"$recursiveAnchor\" has been replaced by \"$dynamicAnchor\".', 'deprecated': true }" / "The previous draft (2019-09) introduced a lot of new concepts including $recursiveRef/$recursiveAnchor, unevaluatedProperties/unevaluatedItems, vocabularies, and more."（release notes 将 items/prefixItems 重设计列入 2020-12）
- 等级: A
K16. **Confluent 实现层规则：JSON Schema 兼容规则"loosely based on Avro"；enum 增补只向后兼容**
- URL: https://docs.confluent.io/platform/current/schema-registry/fundamentals/serdes-develop/serdes-json.html | 标题: JSON Schema SerDes (deep dive) — JSON Schema compatibility rules | 机构: Confluent, Inc. | 日期: 访问 2026-08-12
- 摘录: "The JSON Schema compatibility rules are loosely based on similar rules for Avro" / "Enum compatibility: The Avro rule for enums is directly applicable to JSON Schema. If the writer's symbol is not present in the reader's enum, then an error is signaled." / "you need to manually set the additionalProperties: false attribute in the initial schema. This ensures that any new properties added later will be compatible."（开放内容模型下加属性会触发 PROPERTY_ADDED_TO_OPEN_CONTENT_MODEL 错误）
- 等级: A（工程文档，非规范）
K17. **Avro 规范化在 Confluent 中的落地：PCF 去掉 STRIP（保留 docs/default/aliases）**
- URL: https://docs.confluent.io/platform/current/schema-registry/fundamentals/serdes-develop/index.html | 标题: Schema Registry SerDes — Schema normalization | 机构: Confluent, Inc. | 日期: 访问 2026-08-12
- 摘录: "This set of transformations is similar to the Apache Avro® Canonical Form outlined in the specification... with the exception of the 'STRIP' transformation. This transformation is excluded from Schema Registry Serdes because it results in data being lost (docs, default, alias fields)."
- 等级: A（工程文档）
K18. **JSON Schema 的 IETF 状态：2020-12 系列 I-D 已 Expired，IETF WG 重新启动计划中（2026-07 博客）**
- URL: https://datatracker.ietf.org/doc/html/draft-bhutton-json-schema-01 | 标题: draft-bhutton-json-schema-01（JSON Schema: A Media Type for Describing JSON Documents）| 机构: IETF datatracker | 日期: Expired & archived（访问 2026-08-12）
- 摘录: "Expired Internet-Draft (individual) ... Expired & archived"；博客《JSON Schema and IETF》（Greg Dennis, 2026-07-06, https://json-schema.org/blog）："a JSON Schema Working Group Charter has been produced, and Lisa has created an initial draft for a proposal. The draft is little more than an edit of 2020-12 at this point."
- 等级: A（状态事实）
K19. **（推断 C）"枚举增补不破坏旧数据校验"的保证条件：旧值须落在新枚举内或有 reader 兜底路径**
- 依据：K3（Avro enum default）、K8（Protobuf 加枚举值 wire-safe）+ K10（open enum 保留未知值）、K14（JSON Schema enum 闭集）+ K16（Confluent：writer symbol 不在 reader enum → error）。
- 论断：Avro 与 Protobuf 在规范层为"枚举增补"提供 reader 兜底（enum default / open enum 未知值保留）；JSON Schema 规范无此语义，需"封闭枚举含常驻 other"的词表设计或注册中心规则；M08 的"9+other"正属于后者可成立的形态（推断 C，不作格式选型结论）。

## 3 冲突与张力
- T1 **protobuf.dev 内部版本矛盾**：Editions Overview 明写 "NOTE: The latest released edition is 2024."，而同一站点的 Features 页含 Edition 2026 默认行（如 `2026 STRICT`、`STYLE2026`、"Edition 2024 to 2026"小节），editions 落地页导航也列出 2026 Language Specification。可能 Overview 未随 2026 发布更新，或 Features 页预发布文档（当前 2026-08，2026 版或已发布）。→ 未决 U2。
- T2 **Protobuf "wire-safe" 与"应用破坏"的张力**：加枚举值被列为 wire-safe，但规范同时警告对 exhaustive switch 是编译破坏（K8）——"数据格式安全 ≠ API 兼容"。
- T3 **JSON Schema 规范 vs 实现层兼容规则**：规范本身无 reader/writer、无跨 schema 兼容判定（K14），Confluent 以"loosely based on Avro"实现兼容判定（K16）——实现规则不是规范语义，跨注册中心未必一致。
- T4 **Avro aliases 可选性 vs PCF**：aliases 是"implementation may optionally use"（K4），而 PCF 的 STRIP 变换会剥掉 aliases/doc（K5）；Confluent 为保留 docs/default/aliases 排除 STRIP（K17）——规范化与演化元数据之间互相拉扯。
- T5 **closed enum 的"意外行为"**：Protobuf 官方因 closed enum 的未知值重排/丢失而默认 open（K10），但多语言实现不合规清单（C++/C#/Java/Go/Ruby/Dart 等）表明"open 保留未知值"并非所有实现都做到——规范与实现存在差距。

## 4 未决
1. U1 JSON Schema 无"开放枚举/词表增补"的形式化演化语义：2020-12 规范未定义跨 schema 兼容判定，需词表设计（9+other + 版本化双轨校验）或注册中心规则补足；本分支未做格式选型结论（禁项）。
2. U2 protobuf.dev 版本矛盾未核：Overview "latest released edition is 2024" vs Features/落地页出现 Edition 2026；以哪个为准未定。
3. U3 Avro PCF 等价性证明的 companion document 未抓取（规范正文只引用"we sketch a proof in a companion document"）。
4. U4 Confluent JSON Schema 兼容规则的每条规则与 M08 的映射（open content model 加属性错误、enum 增补方向）仅部分核对，未逐条展开。
5. U5 Prototiller 工具的发布/维护状态未核（Editions Overview 提到，未抓取 GitHub/发布页）。
6. U6 Avro 规范中是否存在标准"deprecated"字段属性：1.11.1/1.12.0 规范文本中未找到（未核），Protobuf 与 JSON Schema 有显式 deprecated 机制。

## 5 来源清单
规范原文（A 级原文到手）：
1. https://avro.apache.org/docs/1.12.0/specification/ — Apache Avro 1.12.0 Specification（Apache Software Foundation；Schema Resolution/PCF/Aliases/Enums 原文）
2. https://avro.apache.org/docs/1.11.1/specification/ — Apache Avro 1.11.1 Specification（同主题交叉核）
3. https://avro.apache.org/ — Apache Avro 官网首页
4. https://protobuf.dev/editions/overview/ — Protobuf Editions Overview（Google；最小破坏/每年一版/feature 生命周期）
5. https://protobuf.dev/programming-guides/editions/ — Language Guide (editions)（wire-safe 分类/reserved/deprecated/enum）
6. https://protobuf.dev/editions/features/ — Feature Settings for Editions（含 2026 默认行，矛盾源）
7. https://protobuf.dev/programming-guides/proto3/ — Proto3 Language Guide（open enum 未知值/reserved）
8. https://protobuf.dev/programming-guides/enum/ — Enum Behavior（open/closed 定义与不合规清单）
9. https://protobuf.dev/programming-guides/serialization_not_canonical/ — Proto Serialization Is Not Canonical
10. https://protobuf.dev/best-practices/ — Proto Best Practices（概览页）
11. https://protobuf.dev/design-decisions/ — Design Decisions（概览页）
12. https://protobuf.dev/editions/ — Editions 落地页（导航含 2026 Language Specification，矛盾源）
13. https://json-schema.org/draft/2020-12/json-schema-core.html — JSON Schema Core 2020-12（$dynamicRef/$dynamicAnchor/unevaluatedProperties/tree-strict-tree）
14. https://json-schema.org/draft/2020-12/json-schema-validation.html — JSON Schema Validation 2020-12（enum/default/deprecated）
15. https://json-schema.org/draft/2020-12/schema — 2020-12 meta-schema（$recursive* deprecated:true）
16. https://json-schema.org/draft/2020-12/release-notes.html — 2020-12 Release Notes（2019-09 引入→2020-12 改名）
17. https://json-schema.org/draft/2019-09/json-schema-core.html — JSON Schema Core 2019-09（$recursiveRef 前身）
18. https://www.ietf.org/archive/id/draft-bhutton-json-schema-01.txt — IETF 存档正文（Core I-D）
IETF 状态页：
19. https://datatracker.ietf.org/doc/html/draft-bhutton-json-schema-01 — I-D 状态（Expired & archived）
20. https://datatracker.ietf.org/doc/html/draft-bhutton-json-schema-validation-01 — Validation I-D 状态（Expired & archived）
工程文档：
21. https://docs.confluent.io/platform/current/schema-registry/fundamentals/serdes-develop/index.html — Schema Registry SerDes（Avro 规范化=PCF 去 STRIP）
22. https://docs.confluent.io/platform/current/schema-registry/fundamentals/serdes-develop/serdes-json.html — JSON Schema SerDes deep dive（JSON Schema 兼容规则原文）
官方学习/博客：
23. https://json-schema.org/understanding-json-schema/structuring.html — Understanding JSON Schema: Structuring（递归/扩展指南）
24. https://json-schema.org/understanding-json-schema/reference/type.html — Understanding JSON Schema: Type（参考）
25. https://json-schema.org/blog/ — 《JSON Schema and IETF》（Greg Dennis，2026-07-06）

来源类型统计：规范原文（1,2,13-18）=8；官方文档（4-12,23,24）=11；IETF 状态（19,20）=2；工程文档（21,22）=2；博客（25）=1；官网（3）=1。类型 ≥3 类；可核来源 25 ≥ 15；原文到手 ≥ 10。
关键词执行记录：任务卡 4 组关键词（中/英 8 串）已执行——中文组走 DDG HTML（被拦，0 命中）；英文 4 组走 Bing（每组返回 10 条，命中多为聚合/SEO 页）与 DDG Lite（被拦）。检索命中未作为论断依据，全部论断以直接导航抓取的权威页面原文为准。

## 6 判死自查
- 无无来源论断：是（每条关键发现含 URL+标题+机构+日期+摘录+等级；推断显式标 C）。
- 无二手当原文：是（Avro/protobuf.dev/json-schema.org/IETF/Confluent 均为一手页面原文或状态页；博客仅用于 IETF 状态事实）。
- 无越界漏答：是（Q1-Q5 全答；不做格式选型结论（禁项）；校验语言语义归 B5 未展开）。
- 无捏造来源：是（25 个来源均有本地存档，logs/B8a 与 tmp/b8a 可复核）。
- 抓不到写"未核"：是（U1-U6；Avro deprecated 属性、Prototiller 状态、PCF companion document 均标未核）。
- 推断标 C：是（Q5 结论与 K19 为推断 C；实现层规则明确标注"工程文档，非规范"）。
