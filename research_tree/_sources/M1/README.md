# M1 原型——yaml-ld 全链路迁移原型（B7a U1）

原型验证任务卡 M1：用 docs 下真实带 frontmatter 的 Obsidian md 文件，实测
python-yaml-ld 的语义无损往返、双真相消解、以及 L0 锚点 grep 红线。

## 数据
- 根目录：`docs/图工程调研/M08实验-Apostol微积分卷1/obsidian/`
- 110 个 md（L1-基础网络 81 + L2..L7 + 索引.md），frontmatter 字段：
  `name / name_en / node_type / origin / layer / sections / aliases`（L1），
  `name / kind / layer / origin / status`（L2+）。正文含 `## 原文锚点` 与 `出边/入边`。
- 109 个有 frontmatter，其中 **6 个无法被严格 YAML 解析**（双引号串含 `\s` 等
  非法转义，如 `$a_n \sim b_n$`）：asymptotic-equality-notation、
  decreasing-sequence、euler-constant、gamma-function、
  mixed-improper-integral-notation、riemann-zeta-function（均 L1）。

## 环境
- 解释器：`tmp/venv_b7a/Scripts/python.exe`（python 3.14，yaml-ld 1.1.22 / pyld 2.0.4 /
  rdflib 7.6.0 / PyYAML 6.0.3 / ruamel 0.19.1）
- 运行位置：在 Studium 仓库根目录运行（脚本用相对路径参数）。

## 脚本
1. **M1_roundtrip.py** — 语义无损往返（Q1）。对每个真实文件提取 frontmatter →
   附 `@context` + `@id`（文件路径派生）→ `to_rdf`（N-Quads）→ `from_rdf` →
   `compact`，三重判等：字节级、rdflib 图同构、字段级逐键。
   ```
   tmp/venv_b7a/Scripts/python.exe research_tree/_sources/M1/M1_roundtrip.py \
       --root "docs/图工程调研/M08实验-Apostol微积分卷1/obsidian" --limit 81
   # 加 --with-anchors 把正文「原文锚点」逐字引文并入文档，测 LaTeX 引文过 RDF
   ```
   输出：`out/roundtrip_nquads_pass1.nq`、`pass2.nq`、`roundtrip_compacted.yaml`、
   `violations.json`、`summary.json`。
   已存运行输出：`run_output_roundtrip_frontmatter_only.txt`、`run_output_roundtrip.txt`。

2. **M1_drift.py** — 双真相消解与漂移验证（Q2）。权威载体=frontmatter YAML；
   RDF=派生构件。实测确定性（两次转换字节相等）、再生比对、注入漂移（改 RDF /
   改 YAML 各一处）检测命中、RDF→YAML 逐字段恢复。
   ```
   tmp/venv_b7a/Scripts/python.exe research_tree/_sources/M1/M1_drift.py \
       --root "docs/图工程调研/M08实验-Apostol微积分卷1/obsidian" \
       --outdir research_tree/_sources/M1/out
   ```
   输出：`out/migrated/graph.nq`、`out/drift_summary.json`、
   `out/drift_recovery_mismatches.json`。已存输出：`run_output_drift.txt`。

3. **M1_grep.py** — L0 锚点 grep 红线（Q3）。四条路：A 原 .md 内 grep
   （等价 grep -F，另跑 3 个真实 `grep -F` 佐证）；B N-Quads 文本内 grep；
   C RDF→YAML 恢复文本内 grep。
   ```
   tmp/venv_b7a/Scripts/python.exe research_tree/_sources/M1/M1_grep.py \
       --root "docs/图工程调研/M08实验-Apostol微积分卷1/obsidian" --limit 81 \
       --outdir research_tree/_sources/M1/out
   ```
   输出：`out/grep_summary.json`、`out/recovered_yaml.txt`、`out/grep_nquads.nq`。
   已存输出：`run_output_grep.txt`。

## 关键实测数字（详见 `run_output_*.txt` 与 `out/*.json`）
- frontmatter 往返：81/81 文件通过；N-Quads 字节相等 True；图同构 True；
  字段级 541/541 通过。
- 含正文锚点（LaTeX）：76/81 通过；5 个违规全部是 **pyld `from_rdf` 把
  `\n`/`\t`/`\r` 双转义为「反斜杠+控制符」**（如 `\nearrow`、`\theta`、`\tag`、
  `\to`）——N-Quads 本身正确，rdflib 解析正确，问题仅在 pyld 反序列化。
- 双真相：确定性 True、再生==stored True、注入 RDF 漂移检测 True、注入 YAML 漂移
  检测 True、RDF→YAML 恢复 651/651 字段一致。
- grep：A 94/94（原文 100% 可 grep）；B 48/94（N-Quads 把 `\` 转义为 `\\`，
  含反斜杠的锚点原文子串不命中）；C 88/94（6 个不命中=5 个 pyld 数据损坏 + 1 个
  YAML 单引号转义 `'`→`''`）。
