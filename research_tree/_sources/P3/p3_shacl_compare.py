#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
P3 原型实测 Q3 — pySHACL sh:in/sh:or 与 ShEx valueSet 语法长度对照
运行: <venv_b7a>/Scripts/python.exe p3_shacl_compare.py
venv: C:/Users/Wang/Desktop/Studium/tmp/venv_b7a (pyshacl 0.40.1, rdflib 7.6.0)

对照目标: "9 固定值 + other" 词表封闭
  ShEx 侧 (shex.js 实测结论):
    - "9+other(具体值)"  : [rel:a ... rel:i rel:other]            (闭合10, 可用)
    - "9+other(任意值)"  : 无 valueSet 写法; [rel:a ... rel:i ~] 会粘成 IriStem (不可用)
  SHACL 侧 (本脚本实测):
    - "9+other(具体值)"  : sh:in (9 个 rel:other)
    - "9+other(任意值)"  : sh:or ( [sh:in (9)] [sh:nodeKind sh:IRI] )
  本脚本: 构造 5 个测试节点, 用两种 SHACL shape 校验, 输出实测接受/拒绝,
          并打印各表达式的字符长度对比。
"""

import time

FIXED_9 = [
    "alias-of", "applies-to", "contrasts", "equivalent", "generalizes",
    "implies", "is-a", "part-of", "requires",
]
REL = "http://s.example/rel/"
S = "http://s.example/"

def rel(v):
    return REL + v

# ---- 数据图: 5 个节点(均 a s:Edge), s:rel 分别为 9 中一个 / other / 任意IRI / 字面量 ----
data_ttl = f"""
@prefix s: <{S}> .
@prefix rel: <{REL}> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
s:n1 a s:Edge ; s:rel rel:part-of .
s:n2 a s:Edge ; s:rel rel:other .
s:n3 a s:Edge ; s:rel rel:custom-unknown-rel .
s:n4 a s:Edge ; s:rel "part-of" .
s:n5 a s:Edge ; s:rel rel:requires .
"""

# ---- SHACL shapes ----
# S1: sh:in 闭合10 (9 + other 具体值)
in10 = " ".join([f"rel:{v}" for v in FIXED_9] + ["rel:other"])
shacl_in10 = f"""
@prefix s: <{S}> .
@prefix rel: <{REL}> .
@prefix sh: <http://www.w3.org/ns/shacl#> .
s:EdgeShapeIn10 a sh:NodeShape ;
  sh:targetClass s:Edge ;
  sh:property [ sh:path s:rel ; sh:in ( {in10} ) ] .
"""

# S2: sh:or ( [sh:in (9)] [sh:nodeKind sh:IRI] )  → 9 或 任意IRI
in9 = " ".join([f"rel:{v}" for v in FIXED_9])
shacl_in9_or_iri = f"""
@prefix s: <{S}> .
@prefix rel: <{REL}> .
@prefix sh: <http://www.w3.org/ns/shacl#> .
s:EdgeShapeIn9OrIri a sh:NodeShape ;
  sh:targetClass s:Edge ;
  sh:property [ sh:path s:rel ;
    sh:or ( [ sh:in ( {in9} ) ] [ sh:nodeKind sh:IRI ] ) ] .
"""

# S3: 谓词封闭对照 (mirror Q2): sh:closed true + 9 property shapes
#   注: sh:closed 会把 rdf:type 也视为未列谓词, 需 sh:ignoredProperties ( rdf:type )
#       (ShEx CLOSED 同样会拒绝带 rdf:type 的节点 — 两侧对称)
shacl_closed = f"""
@prefix s: <{S}> .
@prefix rel: <{REL}> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix sh: <http://www.w3.org/ns/shacl#> .
s:EdgeClosed a sh:NodeShape ;
  sh:targetClass s:Edge ;
  sh:closed true ;
  sh:ignoredProperties ( rdf:type ) ;
  sh:property [ sh:path rel:alias-of ; sh:in ( rel:alias-of ) ] ;
  sh:property [ sh:path rel:applies-to ; sh:in ( rel:applies-to ) ] ;
  sh:property [ sh:path rel:contrasts ; sh:in ( rel:contrasts ) ] ;
  sh:property [ sh:path rel:equivalent ; sh:in ( rel:equivalent ) ] ;
  sh:property [ sh:path rel:generalizes ; sh:in ( rel:generalizes ) ] ;
  sh:property [ sh:path rel:implies ; sh:in ( rel:implies ) ] ;
  sh:property [ sh:path rel:is-a ; sh:in ( rel:is-a ) ] ;
  sh:property [ sh:path rel:part-of ; sh:in ( rel:part-of ) ] ;
  sh:property [ sh:path rel:requires ; sh:in ( rel:requires ) ] .
"""

from rdflib import Graph, Namespace
from pyshacl import validate

def validate_graph(data_ttl, shape_ttl):
    data = Graph().parse(data=data_ttl, format="turtle")
    shapes = Graph().parse(data=shape_ttl, format="turtle")
    t0 = time.perf_counter()
    conforms, _, text = validate(data, shacl_graph=shapes, inference="none",
                                 abort_on_first=False, allow_infos=False)
    dt_ms = (time.perf_counter() - t0) * 1000
    return conforms, dt_ms, text

def main():
    print("python " + __import__("sys").version.split()[0])
    import pyshacl, rdflib
    print("pyshacl", pyshacl.__version__, "| rdflib", rdflib.__version__)
    print("9 固定关系:", ", ".join(FIXED_9))
    print("数据节点: n1=part-of(固定) n2=other n3=custom-unknown(任意IRI) n4=字面量 n5=requires(固定)\n")

    for label, shape in [("S1 sh:in 闭合10(9+other具体值)", shacl_in10),
                         ("S2 sh:or(sh:in9 + nodeKind IRI)", shacl_in9_or_iri)]:
        t0 = time.perf_counter()
        c, dt, txt = validate_graph(data_ttl, shape)
        print(f"[{label}] 整体 conforms={c} 耗时={dt:.1f}ms")
        for node in ["n1", "n2", "n3", "n4", "n5"]:
            one = f"@prefix s: <{S}> .\n@prefix rel: <{REL}> .\n@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .\n"
            line = {
                "n1": f"s:n1 a s:Edge ; s:rel rel:part-of .",
                "n2": f"s:n2 a s:Edge ; s:rel rel:other .",
                "n3": f"s:n3 a s:Edge ; s:rel rel:custom-unknown-rel .",
                "n4": f"s:n4 a s:Edge ; s:rel \"part-of\" .",
                "n5": f"s:n5 a s:Edge ; s:rel rel:requires .",
            }[node]
            c1, _, _ = validate_graph(one + line, shape)
            print(f"    {node}: rel={'other' if node=='n2' else ('custom-unknown' if node=='n3' else ('literal' if node=='n4' else 'fixed') )} -> {'ACCEPT' if c1 else 'REJECT'}")

    # 谓词封闭对照: 带额外谓词的节点
    closed_node_ok = f"""
@prefix s: <{S}> .
@prefix rel: <{REL}> .
s:n1 a s:Edge ; rel:part-of rel:part-of .
"""
    c_ok, dt_ok, _ = validate_graph(closed_node_ok, shacl_closed)
    print(f"\n[S3 sh:closed 9谓词 + 仅9谓词节点] conforms={c_ok} 耗时={dt_ok:.1f}ms (预期 True=接受)")
    closed_node_extra = f"""
@prefix s: <{S}> .
@prefix rel: <{REL}> .
s:n1 a s:Edge ; rel:part-of rel:part-of ; rel:extra rel:extra-val .
"""
    c_extra, dt_extra, _ = validate_graph(closed_node_extra, shacl_closed)
    print(f"[S3 sh:closed 9谓词 + 额外谓词 rel:extra] conforms={c_extra} 耗时={dt_extra:.1f}ms (预期 False=拒绝)")

    # ---- 语法长度对照 ----
    print("\n==== 语法长度对照 (字符数) ====")
    shex_in10 = f"[ {' '.join([f'rel:{v}' for v in FIXED_9] + ['rel:other'])} ]"
    shex_tilde = f"[ {' '.join([f'rel:{v}' for v in FIXED_9])} ~ ]"
    shacl_in10_expr = f"sh:in ( {' '.join([f'rel:{v}' for v in FIXED_9] + ['rel:other'])} )"
    shacl_or_expr = f"sh:or ( [ sh:in ( {' '.join([f'rel:{v}' for v in FIXED_9])} ) ] [ sh:nodeKind sh:IRI ] )"
    rows = [
        ("ShEx valueSet 闭合10 (9+other具体值)", shex_in10),
        ("ShEx valueSet '~' (B5b 原文, 实测不可用)", shex_tilde),
        ("SHACL sh:in 闭合10 (9+other具体值)", shacl_in10_expr),
        ("SHACL sh:or (sh:in9 + nodeKind IRI) (9+任意)", shacl_or_expr),
    ]
    for label, text in rows:
        print(f"  {label.ljust(44)} : {len(text)} 字符  | {text}")
    print("\n注: ShEx 的裸通配 [ . ] 无法解析, '9+任意值' 在 ShEx 无 valueSet 写法, 最近似为 nodeKind IRI (1 个 token)。")

main()
