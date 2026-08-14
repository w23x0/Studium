# Snapshot: v1.3 L1 semantic layer + SHACL audit (local)

Source: research_tree/synthesis/存储选型决策点_v1.3.md
Fetched: 2026-08-14 (local file)

## Verbatim excerpts

L1: "RDF 1.2 + TriG 命名图"

"词表封闭=闭合 valueSet 列表或 SHACL sh:in 二选一"

"SHACL 校验=只读审计层、非日常门禁"

P3 实测: ShEx '~' 证伪；闭合 10 列表或 sh:in 为正确 9+other 表达

## Relevance note

External OWL ontologies can **coexist as reference graphs** in L1, but M08 instance data validated by **SHACL read-only audit**, not OWL reasoner as write gate.
