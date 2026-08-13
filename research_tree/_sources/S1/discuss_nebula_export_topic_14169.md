# 快照：社区讨论——没有简单导出工具
- URL: https://discuss.nebula-graph.com.cn/t/topic/14169
- 机构：NebulaGraph 官方社区论坛（discuss.nebula-graph.com.cn）
- 抓取日期：2026-08-13
- 工具：WebFetch 正文提取
- 证据等级：A（原文到手）

## 提取正文（关键句逐字，中文）
- 用户 vinny_f 抱怨 NebulaGraph 3.5 缺乏简单导出工具：
  - "仅限Exchange企业版才有这有个功能"
  - "我一个单机或三节点的环境，还得整一个spark才能导出数据"
  - "没有如oracle的exp、mysql的mysqldump这样的工具吗？"
- 官方成员 steam 回复："目前我们是没有数据导出工具的，可以借助 Spark，通过 spark-connector 来导出工具。"
- 结论：截至 NebulaGraph 3.5，社区版**没有**独立的数据导出工具；唯一路径是 Spark（Exchange 企业版或 spark-connector）。线程 30 天无回复自动关闭。

## 备注
这是"删除前导出文本档案"红线最直接的证据：官方确认无 mysqldump 等价物。NebulaGraph 3.8 文档未显示新增社区导出工具（Exchange 导出仍标注企业版）。
