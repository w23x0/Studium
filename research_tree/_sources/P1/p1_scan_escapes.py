# -*- coding: utf-8 -*-
"""用真正的转义还原解析器统计 921 文件里实际出现的转义种类。"""
import re
import sys

sys.path.insert(0, "C:/Users/Wang/Desktop/Studium/research_tree/_sources/P1")
from p1_roundtrip import reduce_nt_string
from collections import Counter

text = open("C:/Users/Wang/Desktop/Studium/research_tree/_sources/P1/anchors_921.nq",
            encoding="utf-8").read()

# 逐行取字面量内容 (第一个双引号到最后一个双引号之间), 交给解析器, 统计解析器实际遇到的转义
escape_kind = Counter()
n_rows = 0
for line in text.splitlines():
    line = line.strip()
    if not line:
        continue
    n_rows += 1
    start = line.find('"')
    end = line.rfind('"')
    if start < 0 or end <= start:
        continue
    content = line[start + 1:end]
    i = 0
    while i < len(content):
        c = content[i]
        if c != "\\":
            i += 1
            continue
        nxt = content[i + 1]
        if nxt == "\\":
            escape_kind["double_backslash (orig backslash)"] += 1
            i += 2
        elif nxt in "tbnrf\"'":
            escape_kind["ECHAR_" + nxt] += 1
            i += 2
        elif nxt == "u" and re.fullmatch(r"[0-9A-Fa-f]{4}", content[i + 2:i + 6]):
            escape_kind["UCHAR_u4"] += 1
            i += 6
        elif nxt == "U" and re.fullmatch(r"[0-9A-Fa-f]{8}", content[i + 2:i + 10]):
            escape_kind["UCHAR_U8"] += 1
            i += 10
        else:
            escape_kind["unexpected_" + repr(nxt)] += 1
            i += 2

print("rows:", n_rows)
print("escape kinds found in real 921 N-Quads literals:")
for k, v in escape_kind.most_common():
    print("  %-38s %d" % (k, v))
