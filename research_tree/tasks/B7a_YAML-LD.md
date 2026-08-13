# 任务卡 B7a — YAML-LD 工程化与文档-图迁移（含工具链）
角色：深度调研树分支调研员（B7a，B7 文档-图混合系 R3 子任务）。
分支名：YAML-LD 1.0（WD 2026-07-28）的解析器/转换器/校验工具现状，以及"Markdown frontmatter 升级为 YAML-LD"的可行路径。

## 问题清单
1. YAML-LD 规范要求的实现：解析器/序列化器有哪些公开实现（GitHub 仓库、npm/Python 包）？各自支持状态（官方文档为据）。
2. YAML-LD 与 JSON-LD 的互操作：任何 YAML-LD 文档可表示为 JSON-LD 的转换工具是否已存在、是否可逆。
3. YAML-LD 能否直接承接 Obsidian 式 frontmatter：frontmatter 键值对→YAML-LD 上下文映射有无先例/教程。
4. YAML-LD 校验：能否配合 SHACL/ShEx 校验（B5 一轮结论：封闭词表用 SHACL）——有没有 YAML-LD+SHACL 组合先例。
5. 对"锚点逐字 grep + 人审"工作流：YAML-LD 载体下正文仍是 Markdown（可 grep），图数据在 frontmatter/YAML 块——是否同时保住两边的增益（推断标 C）。

## 候选空间与线索
W3C YAML-LD 1.0 WD（w3.org/TR/yaml-ld/）、w3c/yaml-ld GitHub（test suite/实现）、jsonld.js 生态、Obsidian frontmatter 帮助页（对照）。

## 搜索关键词
中文：YAML-LD 解析器 工具、YAML-LD JSON-LD 转换、frontmatter YAML-LD 迁移、YAML-LD SHACL 校验
英文：YAML-LD parser implementation github、YAML-LD to JSON-LD conversion tool、markdown frontmatter YAML-LD migration、YAML-LD validation SHACL

## 工作量红线
可核来源>=15 且原文到手>=10；来源类型>=3 类；候选逐一查证>=5；关键词>=4 组。

## 产出格式（发现.md，写入 research_tree/findings/B7a_YAML-LD_发现.md）
0 一句话结论 / 1 逐条回答 / 2 关键发现（论断+URL+标题+机构+日期+原文摘录+等级 A/B/C）/ 3 冲突与张力 / 4 未决 / 5 来源清单 / 6 判死自查。

## 禁止项
不做笔记软件评测；不越界（RDF 语法归 B1）；不捏造来源；抓不到写"未核"；推断标 C。
