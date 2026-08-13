# 任务卡 B6e — 审计日志（append-only 哈希链）工程实现先例
角色：深度调研树分支调研员（B6e，B6 先例系 R3 子任务）。
分支名：append-only 审计日志的工程实现模式（哈希链/签名/日志聚合）与个人场景适配。

## 问题清单
1. 防篡改审计日志的工程先例：syslog-ng/rsyslog 哈希链、区块链式日志聚合（Crosby&Wallach 的后续工程实现）官方文档原文。
2. 逐行哈希链的具体实现要素：行结构（prev hash + data + hash）、种子、验证算法——有没有开源实现仓库可引。
3. 透明日志（RFC 6962 CT）作为"外部可验证 append-only"的规范原文与个人场景的适配性（是否过度设计）。
4. 日志轮转/压缩与"不物理删除"的冲突：审计日志保留策略的常见做法（append-only + 归档 + 压缩）。
5. 对 522 节点级个人图谱：哈希链的密钥管理（签名锚点）在无服务器个人场景的最小可行方案（推断标 C，引用现有签名方案文档）。

## 候选空间与线索
RFC 6962、Crosby & Wallach USENIX 2009、tamper-evident log 开源实现（如 secure-log、ct log）、rsyslog 文档、Ledger/Trillian 文档。

## 搜索关键词
中文：审计日志 哈希链 防篡改 实现、透明日志 RFC 6962、日志 轮转 归档 保留、个人 签名 锚点 哈希
英文：tamper-evident audit log hash chain implementation、RFC 6962 certificate transparency append-only、log rotation archival retention append-only、hash chain signature anchor personal use

## 工作量红线
可核来源>=15 且原文到手>=10；来源类型>=3 类；候选逐一查证>=5；关键词>=4 组。

## 产出格式（发现.md，写入 research_tree/findings/B6e_审计日志_发现.md）
0 一句话结论 / 1 逐条回答 / 2 关键发现（论断+URL+标题+机构+日期+原文摘录+等级 A/B/C）/ 3 冲突与张力 / 4 未决 / 5 来源清单 / 6 判死自查。

## 禁止项
不做产品选型；不越界（时间版本理论归 B4）；不捏造来源；抓不到写"未核"；推断标 C。
