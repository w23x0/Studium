# 快照：官方文档 全文索引（Elasticsearch）
- URL: https://docs.nebula-graph.com.cn/3.8.0/4.deployment-and-installation/6.deploy-text-based-index/2.deploy-es/
- 机构：NebulaGraph 官方中文文档
- 抓取日期：2026-08-13
- 工具：WebFetch 正文提取
- 证据等级：A（原文到手）

## 提取正文（关键句逐字，中文）
- "NebulaGraph 的全文索引是基于 Elasticsearch 实现，这意味着用户可以使用 Elasticsearch 全文查询语言来检索想要的内容。"
- "目前仅支持 7.x 版本的 Elasticsearch。"
- "内置的进程只能为数据类型为定长字符串或变长字符串的属性创建全文索引。"
- "使用全文索引前，请确认已经了解全文索引的使用限制。"
- 需部署 listener 与 Elasticsearch 集群；Elasticsearch 客户端全局生效。

## 备注
原生索引不支持任意子串/全文检索；全文检索需外部 ES 7.x。这直接回应"锚点逐字 grep"红线：数据在 RocksDB 二进制中，图内文本检索要么建属性索引（前缀型），要么引外部 ES。
