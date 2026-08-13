"""
M4 原型实测 — rdflib oracle 交叉验证
rdf-canonize@5.0.0 的 canonical 输出是否无损失还原同一 RDF 数据集。

用法:
  C:/Users/Wang/Desktop/Studium/tmp/venv_b7a/Scripts/python.exe m4_rdflib_oracle.py \
    ../P1/anchors_921.nq anchors_921_c14n_rdfcanonize.nq

比较方式: 用 rdflib 的 NQuadsParser 分别解析 输入 与 canonical 输出,
把两边的 quad 集合（含字面量 unescape 后的值）逐项判等。
若 rdf-canonize 的 parse+serialize 在任何转义上损失信息,
rdflib 解析出的字面量值会不一致, 集合判等将失败。
"""
import sys
import time
from rdflib import Graph, URIRef, Literal

def load_quads(path):
    g = Graph()
    t0 = time.perf_counter()
    g.parse(path, format="nquads")
    dt = (time.perf_counter() - t0) * 1000
    return set(g), dt

def main():
    in_path = sys.argv[1] if len(sys.argv) > 1 else "../P1/anchors_921.nq"
    out_path = sys.argv[2] if len(sys.argv) > 2 else "anchors_921_c14n_rdfcanonize.nq"

    q_in, dt_in = load_quads(in_path)
    q_out, dt_out = load_quads(out_path)

    print("=== M4 rdflib oracle 交叉验证 ===")
    print("input quads :", len(q_in))
    print("c14n quads  :", len(q_out))
    print("rdflib parse input ms :", f"{dt_in:.3f}")
    print("rdflib parse c14n  ms :", f"{dt_out:.3f}")

    only_in = q_in - q_out
    only_out = q_out - q_in
    print("quads only in input :", len(only_in))
    print("quads only in c14n  :", len(only_out))
    same = q_in == q_out
    print("dataset equality (set-of-quads):", same)

    # 对字面量做额外统计: 输入里含 \\ 与 \" 的 literal 是否在 c14n 里逐字一致
    lit_in = {}
    lit_out = {}
    for s, p, o in q_in:
        if isinstance(o, Literal):
            lit_in[str(o)] = lit_in.get(str(o), 0) + 1
    for s, p, o in q_out:
        if isinstance(o, Literal):
            lit_out[str(o)] = lit_out.get(str(o), 0) + 1
    esc_lit_in = [v for v in lit_in if "\\" in v]
    esc_lit_out = [v for v in lit_out if "\\" in v]
    print("literal values containing backslash (input) :", len(esc_lit_in))
    print("literal values containing backslash (c14n)  :", len(esc_lit_out))
    print("literal value multiset equal:", lit_in == lit_out)
    print("=== oracle 结束 ===")
    return 0 if same else 1

if __name__ == "__main__":
    sys.exit(main())
