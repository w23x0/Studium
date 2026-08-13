# P3 原型实测 — ShEx valueSet '~' 表达 9+other 词表封闭的校验语义

## 文件
- `p3_shex_valueset.js` — shex.js 实测脚本（Q1 值封闭、Q2 谓词封闭、语法探针）
- `p3_shacl_compare.py` — pySHACL 对照脚本（Q3：sh:in/sh:or 与语法长度对比）
- `run_output.txt` — 两个脚本的真实 stdout（复现时重新生成）
- `package.json` + `node_modules/` — npm install shex 的结果（shex meta 1.0.0-alpha.29）

## 复现命令
```
# shex.js 部分（node v25.6.1）
cd C:/Users/Wang/Desktop/Studium/research_tree/_sources/P3
npm install shex
node p3_shex_valueset.js

# pySHACL 部分（venv: tmp/venv_b7a, pyshacl 0.40.1, rdflib 7.6.0）
C:/Users/Wang/Desktop/Studium/tmp/venv_b7a/Scripts/python.exe p3_shacl_compare.py
```

## 数据建模
词表取自 `docs/图工程调研/M08实验-第15章分层图谱/data/edges-*.jsonl` 的 rel 字段：
10 个值 = 9 固定关系（alias-of, applies-to, contrasts, equivalent, generalizes,
implies, is-a, part-of, requires）+ 兜底值 other（35 条边）。
"9 固定值 + other" 即：9 个显式值 + 兜底。

## 关键实测结论（详见 findings/P3_ShEx9+other_发现.md）
1. `[ v1 ... v9 ~ ]` **不表达** "9 固定 + 通配"。末尾 `~` 与 `v9` 粘合成 IriStem
   （前缀匹配），解析为 8 显式 + 1 IriStem(v9)。实测 other/任意值被拒。
2. 裸通配 `[~]`、`[ . ]` 均为 PARSE ERROR；通配只能写成 `[ . - exclusions ]`（补集），
   不能表达 "9 + 任意 other"。
3. "9 固定 + other 具体值" 的正确写法是闭合 10 列表
   `[ rel:a ... rel:i rel:other ]`（实测 9 与 other 通过、任意 11 值拒绝）。
4. CLOSED 正确拒绝未列谓词（ClosedShapeViolation）；EXTRA 按规范只放行
   『已在表达式中的谓词』的未消费三元组，不放行外来谓词（与 B5b 的隐含理解不同）。
5. 语法长度：ShEx 闭合10 = 132 字符，SHACL sh:in = 138 字符，ShEx '~' 并非最短路径。
