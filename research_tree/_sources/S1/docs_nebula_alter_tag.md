# 快照：ALTER TAG（Schema 演化）
- URL: https://docs.nebula-graph.io/3.8.0/3.ngql-guide/10.tag-statements/3.alter-tag/
- 机构：NebulaGraph 官方文档
- 抓取日期：2026-08-13
- 工具：WebFetch 正文提取
- 证据等级：A（原文到手）

## 提取正文（关键句逐字）
- 语法：`ALTER TAG <tag_name> <alter_definition> [...] [ttl_definition ...] [COMMENT '<comment>'];`
- alter_definition 可为 ADD / DROP / CHANGE 属性；支持 TTL。
- "Trying to use a newly altered tag may fail because the alteration of the tag is implemented asynchronously." → "Wait for two heartbeat cycles, i.e., 20 seconds."
- 索引限制："Before you alter properties for a tag, make sure that the properties are not indexed." 否则报 `[ERROR (-1005)]: Conflict!`
- "The property name must be unique in a tag."
- 类型变更限制：
  - "Only the length of a `FIXED_STRING` or an `INT` can be increased."
  - "The length of a `STRING` or an `INT` cannot be decreased."
  - "Only the data type conversions from FIXED_STRING to STRING and from FLOAT to DOUBLE are allowed."

## 备注
Schema 演化存在但受强限制：索引属性不能直接改；异步生效（20s）；类型变更面很窄。ALTER EDGE 同构。
