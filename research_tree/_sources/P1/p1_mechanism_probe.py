# -*- coding: utf-8 -*-
"""
P1 机制探针（非 921 数据集，仅供"未决与风险"一节做机理说明）v2
=============================================================
说明: rdflib 7.6.0 的 N-Quads 转义实测 (合成字符串)。含 lone surrogate 时
rdflib 走 _nt_unicode_error_resolver, 输出 UCHAR 转义 (反斜杠+u+四位十六进制)。
所有数字明确标注为"非 921 数据"，不计入通过率。
"""
import os
from rdflib import Dataset, URIRef, Literal

OUT_DIR = "C:/Users/Wang/Desktop/Studium/research_tree/_sources/P1"


def main():
    print("== P1 mechanism probe v2 (NON-dataset, risk section only) ==")
    cases = [
        ("newline", "line1\nline2"),
        ("cr", "a\rb"),
        ("tab", "a\tb"),
        ("backspace", "a\x08b"),
        ("formfeed", "a\x0cb"),
        ("del", "a\x7fb"),
        ("cjk", "线性空间"),
        ("fullwidth_space", "a\u3000b"),
        ("em_dash", "a\u2014b"),
        ("endash", "a\u2013b"),
        ("lone_surrogate", "a\ud800b"),
        ("backslash_end", "trail\\"),
        ("literal_u0061", "\\u0061"),
        ("literal_backslash_n", "a\\nb"),
    ]
    with open(os.path.join(OUT_DIR, "mechanism_probe.txt"), "w", encoding="utf-8") as fh:
        for name, text in cases:
            gg = Dataset()
            gg.add((URIRef("urn:a"), URIRef("urn:p"), Literal(text)))
            out = gg.serialize(format="nquads")
            row = [l for l in out.splitlines() if l.strip()][0]
            # rdflib 输出的字面量部分(从第一个双引号到最后一个双引号)
            lit_start = row.find('"')
            lit_end = row.rfind('"')
            serialized = row[lit_start:lit_end + 1]
            # grep -F: 原始文本字节能否在该 N-Quads 输出里出现
            try:
                qb = text.encode("utf-8")
                hit = qb in out.encode("utf-8")
            except UnicodeEncodeError:
                hit = "N/A(original not utf-8-encodable)"
            print("%-18s -> row=%-46r grepF_hit=%s" % (name, serialized, hit))
            fh.write("%s => row=%r grepF_hit=%s\n" % (name, serialized, hit))
    print("saved mechanism_probe.txt")
    print("NOTE: synthetic strings; NOT part of the 921 real-anchor numbers.")


if __name__ == "__main__":
    main()
