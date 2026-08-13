# M2 原型实测：RMLMapper 对 JSONL 源实际运行（B8b U6）

任务卡：M2 — 原型验证员。在真实数据上写脚本、运行、记录实测结果。

## 目录结构

```
_sources/M2/
  README.md                    本文件
  prep_jsonl.py                JSONL -> 单个 JSON 文档（数组/包裹两种形式）的预处理脚本
  run_tests.py                 主驱动：跑全部 6 个测试 + 6 项校验，输出 run_output.txt
  run_output.txt               最近一次主驱动的真实 stdout
  probes_log.txt               定向诊断探针（P1-P4、T7）的真实输出与机制归纳
  mappings/                    RML 规则（Turtle）
    mapping-full.ttl           数组形式 $[*]，NodeMap+AnchorMap（基线，含 name_zh 与 hasAnchor）
    mapping-wrapped.ttl        包裹形式 $.nodes[*]，规则集与 full 完全一致
    mapping-jsonl.ttl          原生 .jsonl 直接映射（预期失败，用于验证 Q1）
    mapping-part1.ttl / mapping-part2.ttl   增量实验批次映射（仅源文件不同）
    mapping-s2.ttl             第二个第15章文件（nodes-A2-s2.jsonl）映射
    probe-*.ttl                诊断探针映射
  data/                        JSONL 原文件与预处理产物
    nodes-A2-s1.jsonl          第15章真实子集（11 行，主实验源）
    nodes-A2-s2.jsonl          第二个第15章文件（10 行，稳健性）
    array-full.json            预处理：数组形式，11 条
    wrapped-full.json          预处理：包裹形式，11 条
    part1-array.json           行 1-6（增量批次 1）
    part2-array.json           行 7-11（增量批次 2）
    array-s2.json              预处理：nodes-A2-s2 数组形式
    one-line.jsonl / one-line.json / obj-noarray.json / arr-one.json   探针数据
  out/                         RMLMapper 输出（*.nq 为 RDF，*.stdout/stderr.txt 为原始流）
```

## 环境

- Java 17：OpenJDK Temurin-17.0.20（`java -version` 实测）
- Python 3.14.3（预处理与驱动）
- RMLMapper 7.3.3 standalone jar：`research_tree/tmp/m2/rmlmapper-7.3.3-r374-all.jar`
  （Maven Central 下载，SHA256 `0c0334b3b0d0cb9de7e724b756eccec15943d33e51ffce9855164e32c98a917d`；
  v8.1.0 需 Java 21，故按任务环境选择 7.3.3）

## 用法

```bash
cd research_tree/_sources/M2

# 1. 预处理（幂等，可重跑）
python prep_jsonl.py data/nodes-A2-s1.jsonl data/array-full.json   --form array
python prep_jsonl.py data/nodes-A2-s1.jsonl data/wrapped-full.json --form wrapped
python prep_jsonl.py data/nodes-A2-s1.jsonl data/part1-array.json  --form array --start 1 --end 6
python prep_jsonl.py data/nodes-A2-s1.jsonl data/part2-array.json  --form array --start 7 --end 11
python prep_jsonl.py data/nodes-A2-s2.jsonl data/array-s2.json     --form array

# 2. 跑全部测试并记录真实 stdout
python run_tests.py --jar C:/Users/Wang/Desktop/Studium/research_tree/tmp/m2/rmlmapper-7.3.3-r374-all.jar 2>&1 | tee run_output.txt

# 3. 单条复现（以 T1 为例）
java -Xmx512m -jar C:/Users/Wang/Desktop/Studium/research_tree/tmp/m2/rmlmapper-7.3.3-r374-all.jar \
  -m mappings/mapping-full.ttl -o out/T1-array-full.nq -s nquads
```

## 测试矩阵与结论摘要

| 测试 | 输入 | iterator | exit | quads | 说明 |
|---|---|---|---|---|---|
| T1 array-full | array-full.json | `$[*]` | 0 | 145 | 基线：可行 |
| T2 wrapped | wrapped-full.json | `$.nodes[*]` | 0 | 145 | 同数据同规则，图与 T1 完全一致 |
| T3 raw-jsonl | nodes-A2-s1.jsonl | `$[*]` | 1 | - | 原生 .jsonl 直接映射失败 |
| T4 part1 | part1-array.json | `$[*]` | 0 | 83 | 增量批次 1（6 行） |
| T5 part2 | part2-array.json | `$[*]` | 0 | 68 | 增量批次 2（5 行） |
| T6 s2 | array-s2.json | `$[*]` | 0 | 109 | 第二个第15章文件，稳健 |

关键校验：C4 增量拼接需去重（combo=151 → 去重后 145 = full，3 对跨批次重复 anchor 三元组）；
详见 findings/M2_发现.md。
