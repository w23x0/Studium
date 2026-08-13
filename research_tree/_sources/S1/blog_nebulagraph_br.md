# 快照：官方博客 NebulaGraph BR（备份恢复）
- URL: https://www.nebula-graph.com.cn/posts/how-to-use-nebulagraph-backup-restore
- 机构：NebulaGraph 官方博客（中文）
- 抓取日期：2026-08-13
- 工具：WebFetch 正文提取
- 证据等级：A（原文到手）

## 提取正文（关键句逐字，中文）
- "BR 即 Backup & Restore 的简称，是一款对 NebulaGraph 集群数据（包括元信息和数据信息）备份到远端，并利用备份数据对集群进行恢复的工具。"
- 仓库：https://github.com/vesoft-inc/nebula-br
- "NebulaGraph BR（以下简称 BR）分为社区版和企业版两个版本，企业版在社区版功能的基础上，**额外提供了增量备份的能力**。"
- Agent："一个只关心本机的无状态的 RPC 服务，与 metad 通信，提供备份文件上传和下载、服务起停等接口供 BR 调用。"
- "BR 目前支持备份 NebulaGraph 集群的数据到本地或者 S3 上。"
- 备份捕获某时刻全集群状态，可用 show/cleanup 管理，restore 还原。

## 备注
社区版 BR 提供全量备份（可作删除前的恢复兜底），但备份格式为引擎快照，非人类可读文本；不是导出为 JSONL/RDF 的替代品。
