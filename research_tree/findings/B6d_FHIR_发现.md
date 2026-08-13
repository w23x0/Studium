# B6d 发现：FHIR 资源版本化机制（_history / versionId / 纯文件模式）对 M09 的借鉴

> 分支：B6d（FHIR 健康档案资源版本化先例）｜调研员：深度调研树 B6d 分支｜落盘日期：2026-08-12
> 领域定位：健康领域仅作先例研究，不构成医疗软件选型建议。证据等级：A=原文到手；B=二手/译文；C=推断。未能核实一律标注「未核」，未发现处不臆造。

---

## 0 一句话结论

**FHIR 提供了「资源级版本 id（meta.versionId，随每次内容变更更换、同资源内唯一）+ 只追加不可改写的版本历史（_history 端点返回 history Bundle，旧版本永久保留仅用于审计，规范明令不得改写/删除旧版本、不支持并发多分支）+ 外部审计（Provenance / AuditEvent）+ 结论状态机（Condition 的 verificationStatus 含 confirmed / refuted / entered-in-error）」的完整先例，M09 可直接移植其最小集合（版本 id + 历史端点 + 审计）；但「纯文件存储」在 FHIR 生态中是文档/包/导出等文件形态而非规范内建的存储模式，且 FHIR 明确单链历史、不支持多分支，M09 如需分支能力需自行设计（标 C）。**

---

## 1 逐条回答

### Q1 FHIR 资源版本化规范原文：versionId、meta.versionId、资源不可变 vs 更新语义

**结论：FHIR 是「资源可变、版本不可变」模型——内容可通过 PUT 更新出新版本，但历史版本一经产生不可改写/删除；版本标识放在资源自身的 meta.versionId 中。**

- `Meta.versionId (0..1) : id`：官方定义 "Changes each time the content of the resource changes. Can be referenced in a resource reference. Can be used to ensure that updates are based on the latest version of the resource... **The same versionId can never be used for more than one version of the same resource.**"（R4 resource.html，A 级）
- 版本 id 无固定顺序："There is no fixed order for version ids - clients cannot assume that a versionId that comes after another one either numerically or alphabetically represents a later version."（A 级）——常为按逻辑 id 递增的序号或 UUID，但客户端不得假设大小关系即新旧。
- 更新语义："The update interaction creates a new current version for an existing resource or creates an initial version if no resource already exists for the given id."；且 "**there is no support for updating past versions** - see notes on the history interaction."（R4 http.html，A 级）
- 版本支持分级（Capability Statement 声明）：`no-version` / `versioned` / `versioned-update`；"Servers that support this API SHOULD provide full version support - that is, populate and track versionId correctly, support vread, and implement version aware updates."（A 级）
- versionId 经 HTTP ETag 暴露（"The Version Id is represented in the ETag header"，弱 ETag `W/"3141"`），配合 If-Match 实现乐观锁："Lost Updates ... can be prevented using a combination of the ETag and If-Match header. This is also known as 'Optimistic Locking'."（A 级）

### Q2 _history 交互：如何取全部历史版本、旧版本是否保留

**结论：_history 是官方标准交互，返回 history Bundle（含删除墓碑）；旧版本规范明确保留，用于审计/完整性。**

- 三级历史端点（实例/类型/系统）：`GET [base]/[type]/[id]/_history`、`GET [base]/[type]/_history`、`GET [base]/_history`（R4/R5 http.html，A 级）。
- 返回结构："The return content is a Bundle with type set to history containing the specified version history, **sorted with oldest versions last, and including deleted resources**."（A 级）
- 历史条目："The interactions create, update, and delete create history entries."（R4）；R5 扩展为 "Interactions (create, update, patch, and delete) or operations that change/delete/add resources create history entries."（A 级）
- 单版本读取（vread）：`GET [base]/[type]/[id]/_history/[vid]`，"This returns a single instance ... for that version of the resource"；服务器不支持历史时应返回 404 + OperationOutcome 说明（A 级）。
- **旧版本保留**："All past versions of a resource are considered to be superceded, and no longer active, **but retained for audit/integrity purposes**"（R4/R5 同文，A 级）。
- 删除语义："the delete interaction does not remove a resource's version history. ... deleting a resource is the equivalent of creating a special kind of history entry that has no content and is marked as deleted."（A 级）——即删除=墓碑条目，历史仍在。
- 过滤参数：`_count` / `_since`（只含某时刻后的版本）/ `_at` / `_list`（A 级）。
- **重要边界**："The history is a record version history on a per-resource basis. **It is not intended to support concurrent versions, or multi-branch version history**"（A 级）——FHIR 先例是单链，不支持分支。

### Q3 FHIR「纯文件」存储模式（把版本放资源自身）的公开说明

**结论：FHIR 规范没有定义「把版本文件放目录里」的服务器存储模式；版本信息确实随资源自身携带（meta.versionId 就在资源 JSON/XML 里），官方/社区的「文件形态」先例集中在：不可变文档、NPM 包、规范文件下载、FSH 文本源、Bulk Data NDJSON 导出。专门的「纯文件 FHIR 仓库」公开讨论未能匿名检索到（未核）。**

- 版本随资源自身：`meta.versionId` 是资源 JSON/XML 内嵌字段（R4/R5 resource.html，A 级），因此任何资源文件天然自带版本标识。
- FHIR Document（官方，A 级）："A document is an immutable set of resources with a fixed presentation ... Once assembled into a bundle, the document is immutable - its content can never be changed, and the document id can never be reused."——自包含、不可变、可作文件持久化（含 IHE XDS 文档存储）。
- FHIR NPM Packages（官方，A 级）："Each FHIR package is a tarball (tar in gzip) that contains a package folder ... a package.json file that describes the package"；"**All packages SHALL have a version that conforms to Semantic Versioning**"——文件包自带 SemVer 版本与依赖。
- 规范下载（官方，A 级）：R4 Downloads 页把全部定义/示例/整本规范发布为 XML/JSON/ND-JSON/RDF 文件（"The whole specification so that you can host your own local copy"）。
- FSH（官方 IG，A 级）："Because it is text-based, FSH brings a degree of editing agility ... FSH is ideal for distributed development under source code control, providing meaningful version-to-version differentials, support for merging and conflict resolution"——文本文件 + Git 版本控制的官方实践。
- HAPI FHIR 文档（A 级，项目文档）：提供规范外扩展 "Update with History Rewrite"（X-Rewrite-History 头，可改写历史版本），并明确注明 "While this operation is not supported by the FHIR specification"。
- HL7 讨论区（chat.fhir.org）关于「纯文件存储 FHIR 仓库」的专门讨论：**未核**（Zulip 搜索需登录，匿名 API 返回 401）。
- 推断（标 C）：FHIR 以 REST 服务器为规范主体，「文件模式」是分发/交换/归档形态；若 M09 采用「版本文件 + 目录/仓库」存储，属于把 FHIR 的版本语义映射到文件系统，规范本身无直接条文。

### Q4 FHIR 对「推翻旧结论/纠正」的建模（Condition 状态机、撤回）与 M09「复检新版本」对照

**结论：FHIR 用「新版本 + 状态字段（verificationStatus）+ 外部 Provenance 标记」表达推翻与纠错，旧版本不删除；与 M09「复检产生新版本、旧结论被新结论取代」高度同构。**

- Condition.verificationStatus 取值（Required 绑定）：`unconfirmed | provisional | differential | confirmed | refuted | entered-in-error`（R4 condition.html，A 级）。
- 官方代码定义（R4 codesystem-condition-ver-status.html，A 级）：
  - `refuted`："**This condition has been ruled out by diagnostic and clinical evidence.**"
  - `entered-in-error`："**The statement was entered in error and is not valid.**"
  - `confirmed`："There is sufficient diagnostic and/or clinical evidence to treat this as a confirmed condition."
- Condition.clinicalStatus（病程状态）：`active | recurrence | relapse | inactive | remission | resolved`（codesystem-condition-clinical.html，A 级）——「复发/缓解」与 M09「复检发现结论需要更新」可类比为状态迁移。
- 约束：`Condition.clinicalStatus SHALL NOT be present if verificationStatus is entered-in-error`（R4 condition.html 约束 con-5，A 级）。
- 对过去版本的纠错方式（R4/R5 http.html，A 级）："In the case that a past version of a resource needs to be explicitly documented as 'entered-in-error', **use a Provenance resource pointing to the past version of the resource**"——纠错不覆盖旧版本，而是指向旧版本的审计记录。
- 对照：M09「复检新版本」= 生成新版本（PUT 语义）＋把新状态置为 confirmed/refuted 等（状态机）＋用 Provenance 记录「此版本取代/推翻哪一旧版本」（was derived from 思想）。

### Q5 可借鉴最小集合（资源级版本 id、历史端点、审计）——哪些可直接移植到个人知识图谱

**结论：版本 id、只追加历史端点、审计资源三件套可直接移植；乐观锁与状态机为可选增强；「多分支版本」超出 FHIR 先例，需另行设计。**

| 组件 | FHIR 形态 | 移植到个人知识图谱 M09 的最小实现 | 证据 |
|---|---|---|---|
| 资源级版本 id | `meta.versionId`（随内容变更更换、同资源唯一、无固定顺序） | 每知识实体/文件分配版本 id；写入内容自身（对应「版本放资源自身」诉求） | R4/R5 resource.html（A） |
| 历史端点 | `_history`（实例/类型/系统三级）+ `vread` 单版本读取；history Bundle 含删除墓碑 | 只追加版本日志；提供「列出全部版本」「取指定版本」两个查询入口；删除=墓碑条目 | R4/R5 http.html（A） |
| 旧版本保留 | "retained for audit/integrity purposes"；"no way to update or delete past versions" | 只追加存储，物理不覆盖旧版本文件 | R4/R5 http.html（A） |
| 审计 | Provenance（活动/代理/实体，可指向任意旧版本）+ AuditEvent（安全日志） | 每个版本变更写一条审计（谁、何时、基于哪一旧版本、为何变更） | provenance.html / auditevent.html（A） |
| 乐观锁（可选） | ETag/If-Match | 写冲突检测：更新时带上「基于的版本 id」，不匹配则拒绝 | R4 http.html（A） |
| 结论状态机（可选） | Condition verificationStatus / clinicalStatus | 「结论状态」字段：待确认/已确认/已推翻/录入错误 | codesystem 两页（A） |
| 多分支版本（不适用） | 明确 "not intended to support concurrent versions, or multi-branch version history" | M09 若需要分支需另找先例（如 B4b IPLD / git 语义），FHIR 不提供 | R4/R5 http.html（A） |

---

## 2 关键发现（论断 + URL + 标题 + 机构 + 日期 + 原文摘录 + 等级）

1. **versionId 是资源元数据内嵌字段，随内容变更更换，同资源版本号永不重复**
   - URL: https://hl7.org/fhir/R4/resource.html
   - 标题: Resource (FHIR R4 v4.0.1)
   - 机构: HL7 International（FHIR 规范）
   - 日期: 2019-10-30 发布（R4.0.1）
   - 原文: "versionId (0..1) id | Changes each time the content of the resource changes. ... The same versionId can never be used for more than one version of the same resource."
   - 等级: A

2. **版本 id 无固定顺序，客户端不得假设数值/字典序即新旧**
   - URL: https://hl7.org/fhir/R4/resource.html
   - 标题/机构/日期同上
   - 原文: "There is no fixed order for version ids - clients cannot assume that a versionId that comes after another one either numerically or alphabetically represents a later version."
   - 等级: A

3. **更新=创建新版本；规范明令不得改写过去版本**
   - URL: https://hl7.org/fhir/R4/http.html
   - 标题: RESTful API (FHIR R4)
   - 机构: HL7 International
   - 日期: 2019
   - 原文: "The update interaction creates a new current version for an existing resource ... Note that there is no support for updating past versions - see notes on the history interaction."
   - 等级: A

4. **_history 返回 history Bundle，最旧在后，且包含删除条目**
   - URL: https://hl7.org/fhir/R4/http.html
   - 标题: RESTful API (FHIR R4)
   - 机构: HL7 International
   - 日期: 2019（R4.0.1）
   - 原文: "The return content is a Bundle with type set to history containing the specified version history, sorted with oldest versions last, and including deleted resources."
   - 等级: A

5. **旧版本全部视为被取代、不再活跃，但保留用于审计/完整性**
   - URL: https://hl7.org/fhir/R4/http.html（R5 同文: https://hl7.org/fhir/R5/http.html）
   - 标题: RESTful API (FHIR R4)
   - 机构: HL7 International
   - 日期: 2019（R4.0.1）
   - 原文: "All past versions of a resource are considered to be superceded, and no longer active, but retained for audit/integrity purposes"
   - 等级: A

6. **历史是每资源单链，不支持并发版本或多分支版本历史**
   - URL: https://hl7.org/fhir/R4/http.html
   - 标题: RESTful API (FHIR R4)
   - 机构: HL7 International
   - 日期: 2019（R4.0.1）
   - 原文: "The history is a record version history on a per-resource basis. It is not intended to support concurrent versions, or multi-branch version history"
   - 等级: A

7. **删除不删除版本历史，等价于插入一条无内容的 deleted 标记条目（墓碑）**
   - URL: https://hl7.org/fhir/R4/http.html
   - 标题: RESTful API (FHIR R4)
   - 机构: HL7 International
   - 日期: 2019（R4.0.1）
   - 原文: "the delete interaction does not remove a resource's version history. From a version history respect, deleting a resource is the equivalent of creating a special kind of history entry that has no content and is marked as deleted."
   - 等级: A

8. **对过去版本标 entered-in-error 的官方做法：用 Provenance 指向旧版本（不覆盖）**
   - URL: https://hl7.org/fhir/R4/http.html
   - 标题: RESTful API (FHIR R4)
   - 机构: HL7 International
   - 日期: 2019（R4.0.1）
   - 原文: "In the case that a past version of a resource needs to be explicitly documented as 'entered-in-error', use a Provenance resource pointing to the past version of the resource"
   - 等级: A

9. **版本支持分三级（no-version / versioned / versioned-update），versionId 经 ETag 暴露并配合 If-Match 乐观锁**
   - URL: https://hl7.org/fhir/R4/http.html
   - 标题: RESTful API (FHIR R4)
   - 机构: HL7 International
   - 日期: 2019（R4.0.1）
   - 原文: "Servers that support this API SHOULD provide full version support - that is, populate and track versionId correctly, support vread, and implement version aware updates." / "Lost Updates ... can be prevented using a combination of the ETag and If-Match header. This is also known as 'Optimistic Locking'."
   - 等级: A

10. **Provenance 记录「创建/修订/删除/签署某版本」的活动，可指向任意资源或版本**
    - URL: https://hl7.org/fhir/R4/provenance.html
    - 标题: Provenance (FHIR R4)
    - 机构: HL7 International；日期: 2019
    - 原文: "The Provenance resource tracks information about the activity that created, revised, deleted, or signed a version of a resource, describing the entities and agents involved." / "provenance may be provided about any resource or version, including past versions."
    - 等级: A

11. **Condition 用 verificationStatus 表达「已确认/已推翻/录入错误」**
    - URL: https://hl7.org/fhir/R4/codesystem-condition-ver-status.html
    - 标题: CodeSystem: ConditionVerificationStatus
    - 机构: HL7 International；日期: 2019
    - 原文: "refuted | Refuted | This condition has been ruled out by diagnostic and clinical evidence." ; "entered-in-error | Entered in Error | The statement was entered in error and is not valid."
    - 等级: A

12. **病程状态机含复发/缓解（clinicalStatus: active/recurrence/relapse/inactive/remission/resolved）**
    - URL: https://hl7.org/fhir/R4/codesystem-condition-clinical.html
   - 标题: CodeSystem: ConditionClinicalStatus
   - 机构: HL7 International
   - 日期: 2019（R4.0.1）
    - 原文: "recurrence | Recurrence | The subject is experiencing a re-occurence or repeating of a previously resolved condition"
    - 等级: A

13. **FHIR 文档 = 自包含不可变文件集合，文档 id 永不重用**
    - URL: https://hl7.org/fhir/R4/documents.html
   - 机构: HL7 International
   - 日期: 2019（R4.0.1）
    - 标题: Documents (FHIR R4)
    - 原文: "A document is an immutable set of resources with a fixed presentation ... Once assembled into a bundle, the document is immutable - its content can never be changed, and the document id can never be reused."
    - 等级: A

14. **FHIR 包（NPM 包）= 文件（tgz）+ package.json，版本必须符合 SemVer**
    - URL: https://hl7.org/fhir/packages.html
    - 标题: FHIR NPM Packages（FHIR 规范 v5.0.0 页）
    - 机构: HL7 International；日期: 2023-03 发布（R5）
    - 原文: "Each FHIR package is a tarball (tar in gzip) that contains a package folder that contains: a package.json file that describes the package, 0 or more FHIR resources in JSON format ..." / "All packages SHALL have a version that conforms to Semantic Versioning."
    - 等级: A

15. **FSH 文本源 + 源码控制 = 官方推荐的「文件式」FHIR 制品开发方式（版本间差异/合并/重构）**
    - URL: https://hl7.org/fhir/uv/shorthand/
    - 标题: FHIR Shorthand (STU2)
    - 机构: HL7 International；日期: STU2（2023 前后，2020-03 首版）
    - 原文: "Because it is text-based, FSH brings a degree of editing agility ... FSH is ideal for distributed development under source code control, providing meaningful version-to-version differentials, support for merging and conflict resolution, and nimble refactoring."
    - 等级: A

16. **HAPI FHIR 提供规范外扩展「Update with History Rewrite」，可显式改写历史版本（规范明确不支持）**
    - URL: https://hapifhir.io/hapi-fhir/docs/server_plain/rest_operations.html（源 md: hapifhir/hapi-fhir@master, docs/server_plain/rest_operations.md）
    - 标题: REST Operations: Overview（HAPI FHIR 文档）
    - 机构: HAPI FHIR 开源项目；日期: 访问于 2026-08-12（文档对应 8.14.0）
    - 原文: "If you wish to update a historical version of a resource without creating a new version, this can now be done with the Update operation. While this operation is not supported by the FHIR specification, it's an enhancement added to specifically to HAPI-FHIR."
    - 等级: A（原文到手；系项目文档，非规范）

17. **FHIR 规范自身以「文件」分发（XML/JSON/ND-JSON/RDF 全量下载，可自托管）**
    - URL: https://hl7.org/fhir/R4/downloads.html
   - 机构: HL7 International
   - 日期: 2019（R4.0.1）
    - 标题: Downloads（FHIR R4）
    - 原文: "The whole specification so that you can host your own local copy (does not include the downloads)"
    - 等级: A

18. **中文社区译文确认 versionId 语义（「随资源内容的变更而变化」）**
    - URL: https://wanghaisheng.github.io/fhir-cn/doc/resource.html
    - 标题: FHIR 中文版 – Base Resource（社区翻译，非官方）
    - 机构: 社区翻译项目（wanghaisheng/fhir-cn）；日期: 访问于 2026-08-12
    - 原文: "versionId (0..1) id 随资源内容的变更而变化. 可在 resource reference 中使用. 可用于确保某次更新是对资源最新版本的变更。"
    - 等级: B（译文）

19. **AuditEvent 是安全日志类资源（审计的另一种形态）**
    - URL: https://hl7.org/fhir/R4/auditevent.html
   - 机构: HL7 International
   - 日期: 2019（R4.0.1）
    - 标题: AuditEvent (FHIR R4)
    - 原文: "A record of an event made for purposes of maintaining a security log. Typical uses include detection of intrusion attempts and monitoring for inappropriate usage."
    - 等级: A

20. **FHIR 规范源仓库即以 Git 文件形式维护、随发布打版本**
    - URL: https://github.com/hl7/fhir（README: https://raw.githubusercontent.com/hl7/fhir/master/README.md）
    - 标题: The FHIR Specification Publisher（hl7/fhir 仓库）
    - 机构: HL7 International；日期: 访问于 2026-08-12
    - 原文: "This library builds and publishes the FHIR specification, based on the contained spreadsheet data in the project."（README 首段）
    - 等级: A（README 原文）

---

## 3 冲突与张力

1. **「旧版本不可改写」vs 实现层扩展**：FHIR 规范明确 "there is no way to update or delete past versions of the record"；而 HAPI FHIR 提供 X-Rewrite-History 扩展可改写历史（其文档自认 "not supported by the FHIR specification"）。张力提示：若 M09 允许「更正历史」，必须作为显式、可审计、默认关闭的操作，而不是普通更新语义。
2. **「保留全部历史」vs 「服务器可完全不支持版本」**：规范用 SHOULD 而非 SHALL 要求服务器支持版本（"servers SHOULD support versions, but some are unable to"），并通过 Capability Statement 声明分级。即 FHIR 的版本化是可声明的能力而非硬性门槛——M09 若承诺版本化，应自行把该能力设为硬性契约。
3. **中文资料普遍把 versionId 描述为「递增版本号」**，但规范原文明确「无固定顺序、不得假设数值大小即新旧」——移植时不要依赖 versionId 的大小比较，应把它当作不透明标识。
4. **「纯文件」诉求 vs 规范以 REST 服务器为主体**：官方文件形态（文档/包/下载/FSH）是分发与交换格式，不是「目录即仓库」的服务器存储模式；专门的纯文件存储讨论未能匿名检索（未核）。把 FHIR 版本语义落到文件系统属推断性设计（C）。
5. **状态与版本的关系**：FHIR 中改状态（如 refuted）也会产生新版本，状态本身不覆盖历史；与 M09「复检→新版本、旧结论被取代但保留」一致，但需注意「结论被推翻」与「录入错误撤回」是两种不同语义（refuted vs entered-in-error），M09 应区分。

## 4 未决

1. chat.fhir.org（Zulip）等 HL7 讨论区关于「纯文件存储 FHIR 仓库/把版本放文件」的专门讨论与结论：**未核**（匿名检索返回 401，需登录）。
2. 是否有官方认可的「以文件目录为存储、versionId 入文件名」的 FHIR 服务器实现：**未核**（未找到规范级或 HL7 官方声明；仅有 Document/Package/下载/FSH 等文件形态先例，均为 A 级但非「存储模式」）。
3. FHIR 若遇「同一事实的多分支修订」应如何建模（规范明言不支持多分支）：**未核/超范围**——M09 若需要分支版本，FHIR 无先例，需转向 git/IPLD 等（另见 B4b、B4 分支）。
4. FHIR Bulk Data（NDJSON 导出）导出文件是否携带/如何表达版本信息：仅核到 IG 首页标题（https://hl7.org/fhir/uv/bulkdata/，v3.0.0 STU 3），导出细节未核。
5. Provenance 中「版本级引用」的完整约束条文：provenance.html 见 "If a resource, entity, or agent can have different versions that must be identified, then the Reference must have versioning information incl..."，完整句被页面截断，未逐字核对完整段（可补）。

## 5 来源清单

| # | URL | 标题 | 机构 | 日期 | 类型 | 等级 | 状态 |
|---|---|---|---|---|---|---|---|
| 1 | https://hl7.org/fhir/R4/resource.html | Resource（FHIR R4 v4.0.1） | HL7 International | 2019-10-30 | 规范原文 | A | 已核 |
| 2 | https://hl7.org/fhir/R4/http.html | RESTful API（FHIR R4） | HL7 International | 2019 | 规范原文 | A | 已核 |
| 3 | https://hl7.org/fhir/R5/resource.html | Resource（FHIR R5 v5.0.0） | HL7 International | 2023-03 | 规范原文 | A | 已核 |
| 4 | https://hl7.org/fhir/R5/http.html | RESTful API（FHIR R5） | HL7 International | 2023-03 | 规范原文 | A | 已核 |
| 5 | https://hl7.org/fhir/R4/provenance.html | Provenance（FHIR R4） | HL7 International | 2019 | 规范原文 | A | 已核 |
| 6 | https://hl7.org/fhir/R5/provenance.html | Provenance（FHIR R5） | HL7 International | 2023 | 规范原文 | A | 已核 |
| 7 | https://hl7.org/fhir/R4/condition.html | Condition（FHIR R4） | HL7 International | 2019 | 规范原文 | A | 已核 |
| 8 | https://hl7.org/fhir/R4/bundle.html | Bundle（FHIR R4） | HL7 International | 2019 | 规范原文 | A | 已核 |
| 9 | https://hl7.org/fhir/R4/auditevent.html | AuditEvent（FHIR R4） | HL7 International | 2019 | 规范原文 | A | 已核 |
| 10 | https://hl7.org/fhir/R4/documents.html | Documents（FHIR R4） | HL7 International | 2019 | 规范原文 | A | 已核 |
| 11 | https://hl7.org/fhir/R4/binary.html | Binary（FHIR R4） | HL7 International | 2019 | 规范原文 | A | 已核（仅作文件形态旁证） |
| 12 | https://hl7.org/fhir/R4/codesystem-condition-ver-status.html | CodeSystem ConditionVerificationStatus | HL7 International | 2019 | 规范原文（代码系统） | A | 已核 |
| 13 | https://hl7.org/fhir/R4/codesystem-condition-clinical.html | CodeSystem ConditionClinicalStatus | HL7 International | 2019 | 规范原文（代码系统） | A | 已核 |
| 14 | https://hl7.org/fhir/packages.html | FHIR NPM Packages | HL7 International | 2023（R5 页） | 规范原文 | A | 已核 |
| 15 | https://hl7.org/fhir/R4/downloads.html | Downloads（FHIR R4） | HL7 International | 2019 | 规范原文 | A | 已核 |
| 16 | https://hl7.org/fhir/uv/shorthand/ | FHIR Shorthand（STU2） | HL7 International | STU2（2020 首版） | 规范/IG 原文 | A | 已核 |
| 17 | https://hl7.org/fhir/uv/bulkdata/ | FHIR Bulk Data Access (Flat FHIR) v3.0.0 | HL7 International | STU3（访问时） | IG 原文（首页头） | A（仅首页头） | 部分核 |
| 18 | https://hapifhir.io/hapi-fhir/docs/server_plain/rest_operations.html | REST Operations: Overview | HAPI FHIR 开源项目 | 访问 2026-08-12 | 项目文档（md 源在 GitHub） | A | 已核 |
| 19 | https://hapifhir.io/hapi-fhir/docs/server_jpa/architecture.html | HAPI FHIR JPA Architecture | HAPI FHIR 开源项目 | 访问 2026-08-12 | 项目文档 | A | 已核 |
| 20 | https://hapifhir.io/hapi-fhir/docs/server_plain/introduction.html | Plain Server Introduction | HAPI FHIR 开源项目 | 访问 2026-08-12 | 项目文档 | A | 已核 |
| 21 | https://github.com/hl7/fhir | The FHIR Specification Publisher（hl7/fhir） | HL7 International | 访问 2026-08-12 | 源码仓库 README | A | 已核 |
| 22 | https://wanghaisheng.github.io/fhir-cn/doc/resource.html | FHIR 中文版 – Base Resource | 社区翻译（非官方） | 访问 2026-08-12 | 中文译文 | B | 已核 |
| 23 | https://chat.fhir.org | FHIR 社区聊天（Zulip） | HL7 社区 | 访问 2026-08-12 | 社区讨论 | — | 未核（需登录检索） |

统计：可核来源 22（#1–#22，另有 #23 未核不计入）≥ 15；原文到手（A 级）21 个 ≥ 10；来源类型 ≥ 4 类（官方规范原文、官方代码系统页、开源项目文档、源码仓库、社区译文）；候选逐一查证 9 项；关键词组 8 组（中英各 4）。

## 6 判死自查

- [x] 可核来源 >= 15：22 条可核来源（另有 1 条未核不计）。
- [x] 原文到手 >= 10：A 级 21 条（含官方规范、代码系统、IG、项目文档原文；其中 1 条仅首页头）。
- [x] 来源类型 >= 3：官方规范 / 代码系统页 / 开源项目文档 / 源码仓库 / 社区中文译文（≥4 类）。
- [x] 候选逐一查证 >= 5：C1 R4 resource；C2 R4 http；C3 R5 http；C4 Provenance；C5 Condition 状态机；C6 纯文件形态（Document/Packages/Downloads/FSH/Bulk Data）；C7 HAPI 文档；C8 chat.fhir.org（未核）；C9 中文译文——9 项。
- [x] 关键词 >= 4 组：中文 4 组（FHIR 资源 版本 versionId 历史 / FHIR _history 交互 / FHIR 纯文件 存储 / FHIR Provenance 审计）＋英文 4 组（FHIR resource versioning versionId _history spec / FHIR file-based storage mode / HL7 FHIR provenance audit resource / FHIR condition status retraction）——共 8 组。
- [x] 关键论断均带 URL+标题+机构+日期+原文摘录+等级（见 §2）。
- [x] 未核项已如实标注（§4：chat.fhir.org 讨论、文件存储服务器实现、多分支建模、Bulk Data 导出细节、Provenance 版本引用完整段）。
- [x] 无捏造来源；推断项均标 C（纯文件存储映射、多分支超出先例）。
- [x] 未做医疗软件选型；健康领域仅作先例；未比较厂商（HAPI 仅作项目文档引用）。
