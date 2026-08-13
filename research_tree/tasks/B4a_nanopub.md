# 任务卡 B4a — nanopub / trusty URI / 出处机制深挖（M09 版本与出处载体）
角色：深度调研树分支调研员（B4a，属 B4 时间版本系的第二轮子任务）。
分支名：nanopub 与 trusty URI 的机制细节：能否作为 M09"个人学习记录+时间版本+不覆盖旧结论"的载体。

## 问题清单
1. nanopub 格式（三段式：assertion/provenance/publicationInfo）、发布-检索基础设施（nanopub server/客户端）、标准状态（W3C 或社区？）官方原文。
2. trusty URI（可信 URI）方案：内容寻址、不可变标识、签名，与 M09"旧版本不覆盖、防篡改"的契合点与限制。
3. nanopub 的检索与查询：如何按断言、按时间、按"某学习者对某知识点的掌握状态"查询？SPARQL 端点？
4. nanopub 对"个人规模"（几百节点、几十次更新/年）是否过度设计？官方或社区有没有小规模/个人使用先例？
5. 版本化：同一知识点的"复检→新结论"在 nanopub 里是发布新 nanopub + 撤销旧的吗？retraction 机制的规范原文。

## 候选空间与线索
nanopub.org、W3C 相关报告（Prov 系）、trusty URI（Kuhn 等论文）、nanopub server（GitHub）、grasshopper/知识图谱发布先例、IPLD 对比（归 B4b）。

## 搜索关键词
中文：nanopub 三段式 出处 检索、trusty URI 内容寻址 签名、nanopub 撤销 版本、个人知识图谱 发布 nanopub
英文：nanopub assertion provenance publicationInfo spec、trusty URIs Kuhn content addressing、nanopub retraction update workflow、nanopub small-scale personal knowledge publishing

## 工作量红线
可核来源>=15 且原文到手>=10；来源类型>=3 类（学术论文、社区/项目文档、标准或规范）；候选逐一查证>=5；关键词>=4 组。

## 产出格式（发现.md，写入 research_tree/findings/B4a_nanopub_发现.md）
0 一句话结论 / 1 逐条回答 / 2 关键发现（论断+URL+标题+机构+日期+原文摘录+等级 A/B/C）/ 3 冲突与张力 / 4 未决 / 5 来源清单 / 6 判死自查。

## 禁止项
不比较数据库/引擎；不越界（IPLD/哈希链数据结构归 B4b，RDF 语法归 B1）；不捏造来源；抓不到写"未核"；推断标 C；不预设"必须用 nanopub"。
