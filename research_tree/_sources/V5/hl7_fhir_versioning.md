# FHIR Resource Versioning — HL7 FHIR R5 Documentation

Source: https://www.hl7.org/fhir/R5/resource.html#versioning
Fetched: 2026-08-13
Grade: A (原文到手)

## 核心内容

- versionId 是每个资源上的元数据元素："The version specific identifier, as it appears in the version portion of the URL. This value changes when the resource is created, updated, or deleted."
- "Version identifiers are generally either a serially incrementing id scoped by the logical id, or a uuid, though neither of these approaches is required."
- "There is no fixed order for version ids - clients cannot assume that a versionId that comes after another one either numerically or alphabetically represents a later version." 且 "The same versionId can never be used for more than one version of the same resource."
- 更新时服务器管理 versionId："On receiving an update, patch, or other FHIR operation that impacts meta, the server SHALL update this item to the current value, or remove it." lastUpdated 同步更新。
- 概念模型为线性历史："All resources are conceptually versioned, and each resource sits at the head of a linear list of past versions."
- 历史版本可通过 URL 访问："The current version is e.g. http://acme.org/fhir/ResourceType/id123, and a past version would be http://acme.org/fhir/ResourceType/id123/_history/v2."
- history interaction：服务器无需保留历史："there's no requirement for servers to keep a history." 过去版本 "are superseded by the current version, and only available for audit/integrity purposes."
- 乐观锁：versionId "Can be used to ensure that updates are based on the latest version of the resource."
- 区分 Record Version（服务器管理，每次资源变化）+1 与 Business version（人类/业务策略管理）。
