# 快照：官方文档 从 NebulaGraph 导出数据（Exchange）
- URL: https://docs.nebula-graph.io/3.4.3/nebula-exchange/use-exchange/ex-ug-export-from-nebula/
- 机构：NebulaGraph 官方文档
- 抓取日期：2026-08-13
- 工具：WebFetch 正文提取
- 证据等级：A（原文到手）

## 提取正文（关键句逐字）
- "The Exchange allows you to export data from NebulaGraph to a CSV file or another NebulaGraph space."
- 依赖 Spark："The process uses `spark-submit`... Spark 2.4.7, along with Hadoop 2.10.1, Scala 2.12.11, and JDK 1.8.0."
- 授权限制："Only Exchange Enterprise Edition supports exporting data from NebulaGraph."
- "The JAR file must be obtained from the 'NebulaGraph Enterprise Edition Package.'"
- 导出目标：CSV 文件（HDFS 或本地）或另一个 NebulaGraph space（sink: client）。

## 备注
官方唯一导出路径=Exchange（Spark），且 CSV 导出仅企业版；社区版无文本导出工具。
