# 任务卡 B4b — IPLD / 内容寻址数据结构的版本链机制
角色：深度调研树分支调研员（B4b，B4 时间版本系 R3 子任务）。
分支名：IPLD（InterPlanetary Linked Data）与内容寻址 DAG 作为不可变版本日志的机制细节。

## 问题清单
1. IPLD 规范（data model / codecs / dag-cbor / dag-json）与"内容标识符 CID"的官方定义原文；CID 是否稳定指向不可变内容。
2. IPLD 如何表达"对象旧版本不覆盖"：链接数据结构（链表/DAG）承载版本历史是否有规范或教程先例。
3. 内容寻址对"防篡改"的保证：CID 由内容哈希构成（多哈希 multihash），与 B4 一轮的哈希链/梅克尔树的关系（RFC 6962 对照）。
4. IPFS/IPLD 生态里"个人笔记/知识图谱"存储先例（如 OrbitDB、IPLD 知识图谱项目），工程成熟度。
5. 对"锚点逐字 grep -F + 人审"工作流：IPLD 载体的可读层（dag-json 文本可读？CID 不可读？）与迁移成本。

## 候选空间与线索
IPLD 官方规范（ipld.io）、CID 规范、multiformats（multihash/multibase）、OrbitDB 文档、IPFS 知识图谱先例。

## 搜索关键词
中文：IPLD 内容寻址 CID 版本、内容寻址 不可变 日志、IPFS 知识图谱 个人笔记、multihash CID 哈希
英文：IPLD data model CID content addressing specification、content addressed immutable version chain、OrbitDB IPLD database versioning、multiformats multihash CID

## 工作量红线
可核来源>=15 且原文到手>=10；来源类型>=3 类；候选逐一查证>=5；关键词>=4 组。

## 产出格式（发现.md，写入 research_tree/findings/B4b_IPLD_发现.md）
0 一句话结论 / 1 逐条回答 / 2 关键发现（论断+URL+标题+机构+日期+原文摘录+等级 A/B/C）/ 3 冲突与张力 / 4 未决 / 5 来源清单 / 6 判死自查。

## 禁止项
不做产品评测；不越界（nanopub 归 B4a、RDF 归 B1）；不捏造来源；抓不到写"未核"；推断标 C。
