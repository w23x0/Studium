# M4 原型实测 — rdf-canonize@5.0.0 RDFC-1.0 在 921 锚点上的指纹实测

本目录是原型 M4 的完整可复现实验：验证 rdf-canonize（npm, w3c-ccg）5.0.0 是否真正实现
RDFC-1.0，以及 canonical 指纹是否稳定、可复现、可作迁移校验。

## 环境
- node v25.6.1，npm 11.9.0，rdf-canonize@5.0.0（本目录 node_modules）
- oracle: `C:/Users/Wang/Desktop/Studium/tmp/venv_b7a/Scripts/python.exe`（rdflib 7.6.0）
- 数据: `../P1/anchors_921.nq`（P1 生成的 921 锚点 N-Quads，CRLF，121348 字节）
- 边界: 只验指纹稳定性与可复现性，不做性能。

## 数据模型（从简建模）
- 每条 quad: `<urn:anchor:N> <urn:quote> "literal" .`，默认图（无 graph 名）
- 921 条 quad，0 个空白节点，纯字符串字面量（无语言标签/数据类型）
- 字面量含 971 处 `\\`、38 处 `\"` 转义（P1 实测）

## 脚本
| 脚本 | 作用 |
|---|---|
| `m4_fingerprint_test.js` | 主实测：RDFC-1.0 实现判定 + 921 数据指纹（顺序不敏感/可复现/差异敏感/序列化健壮性）+ 耗时 + 内存 |
| `m4_rdflib_oracle.py` | rdflib oracle 交叉验证 canonical 输出是否无损失还原同一数据集 |
| `smoke_test.js` | 空白节点同构重标号 smoke（RDFC-1.0 真实现证据，含 await 正确用法） |

## 数据产物
- `anchors_921_c14n_rdfcanonize.nq` — 921 数据的 RDFC-1.0 canonical 输出（119504 字节，排序）
- `run_output.txt` — 全部真实 stdout（node 主实测 + rdflib oracle）

## 复现命令
```bat
cd /d C:\Users\Wang\Desktop\Studium\research_tree\_sources\M4
node m4_fingerprint_test.js
C:/Users/Wang/Desktop/Studium/tmp/venv_b7a/Scripts/python.exe m4_rdflib_oracle.py ../P1/anchors_921.nq anchors_921_c14n_rdfcanonize.nq
```

## 关键结论（详见 findings/M4_发现.md）
1. rdf-canonize 5.0.0 真正实现 RDFC-1.0：带不同空白节点标签的同构图 canonical 输出逐字节相同
   （`_:c14nN` 重标号），且幂等。对照 P1：rdflib 7.6.0 `canonicalize=True` 是静默 no-op。
2. 921 数据 canonical 指纹（SHA-256, 64 hex）= `47cf0717...a7553ec2`，10 个种子化排列全部一致，
   3 次重跑全部一致，跨空白/换行序列化一致 → 不随插入顺序漂移、可复现。
3. 差异敏感：删 1 / 增 1 / 改 1 字面量 / 交换 2 字面量（值多重集相同、映射不同）→ 指纹全部不同。
4. rdflib oracle：canonical 输出与输入解析为同一 quad 集合（921/921，0 丢 0 变），转义无损失。
