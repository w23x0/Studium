#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
M2 / run_tests.py
-----------------
Prototype driver: run RMLMapper 7.3.3 (Java 17) over the Chapter-15 JSONL subset
and record REAL stdout/stderr + measured timings.

Tests:
  T1 array-full : data/array-full.json        iterator "$[*]"          (baseline)
  T2 wrapped    : data/wrapped-full.json      iterator "$.nodes[*]"    (rml.io tutorial style)
  T3 raw-jsonl  : data/nodes-A2-s1.jsonl      iterator "$[*]"          (native .jsonl -> expected fail)
  T4 part1      : data/part1-array.json       (first 6 rows)  -> incremental batch 1
  T5 part2      : data/part2-array.json       (last 5 rows)   -> incremental batch 2
  T6 s2         : data/array-s2.json          (nodes-A2-s2.jsonl, 10 rows) robustness

Checks computed after runs:
  C1  T1 graph stats vs source stats (nodes/anchors/sections/aliases -> quads/subjects/preds)
  C2  T2 quads == T1 quads (same data, wrapped vs array form)
  C3  T3 exit code + first error line (documents native-JSONL behavior)
  C4  incremental equivalence: multiset(T4.nq + T5.nq) vs multiset(T1.nq)
  C5  cross-batch anchor duplicates diagnostic (why C4 may or may not match)
  C6  T6 quads/subjects (second file generality)

Usage:
  python run_tests.py [--jar PATH] [--java PATH] [--xmx 512m]

Every run prints a structured log to stdout; the mapping RDF goes to out/<name>.nq
and raw stdout/stderr to out/<name>.stdout.txt / out/<name>.stderr.txt.
"""
import argparse
import hashlib
import json
import os
import subprocess
import sys
import time
from collections import Counter

M2 = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(M2, "out")
os.makedirs(OUT, exist_ok=True)

DEFAULT_JAR = r"C:\Users\Wang\Desktop\Studium\research_tree\tmp\m2\rmlmapper-7.3.3-r374-all.jar"


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def parse_quad(line):
    """Very small n-quads line parser returning (s, p, o) for stats purposes."""
    line = line.strip()
    if not line or line.startswith("#"):
        return None
    try:
        if line.startswith("<"):
            end = line.index(">")
            s = line[1:end]
            rest = line[end + 1:].strip()
        else:  # blank node
            s = line.split()[0]
            rest = line[len(s):].strip()
        if rest.startswith("<"):
            end = rest.index(">")
            p = rest[1:end]
            rest = rest[end + 1:].strip()
        else:
            p = rest.split()[0]
            rest = rest[len(p):].strip()
        o = rest
        return (s, p, o)
    except Exception:
        return ("?PARSE?", "?PARSE?", line)


def quad_stats(path):
    lines = []
    with open(path, encoding="utf-8") as fh:
        for ln in fh:
            if ln.strip() and not ln.startswith("#"):
                lines.append(ln)
    quads = [parse_quad(l) for l in lines]
    subjects = Counter(s for s, p, o in quads)
    predicates = Counter(p for s, p, o in quads)
    return {
        "quads": len(lines),
        "unique_subjects": len(subjects),
        "unique_predicates": len(predicates),
        "subjects": subjects,
        "predicates": predicates,
    }


def run_test(name, mapping_rel, java, jar, xmx):
    mapping = os.path.join(M2, mapping_rel)
    out_nq = os.path.join(OUT, name + ".nq")
    out_stdout = os.path.join(OUT, name + ".stdout.txt")
    out_stderr = os.path.join(OUT, name + ".stderr.txt")
    cmd = [java, f"-Xmx{xmx}", "-jar", jar, "-m", mapping, "-o", out_nq, "-s", "nquads"]
    t0 = time.perf_counter()
    try:
        proc = subprocess.run(
            cmd, cwd=M2, capture_output=True, text=True, timeout=300
        )
        elapsed = time.perf_counter() - t0
    except subprocess.TimeoutExpired:
        return {"name": name, "ok": False, "elapsed_s": "TIMEOUT",
                "cmd": cmd, "exit": None, "err": "timeout after 300s"}
    with open(out_stdout, "w", encoding="utf-8") as fh:
        fh.write(proc.stdout)
    with open(out_stderr, "w", encoding="utf-8") as fh:
        fh.write(proc.stderr)
    # count warning/error lines across both streams
    violations = sum(
        1 for s in (proc.stdout, proc.stderr)
        for ln in s.splitlines()
        if any(k in ln for k in ("ERROR", "WARN", "Exception", "error:", "Failed"))
    )
    res = {
        "name": name,
        "cmd": cmd,
        "exit": proc.returncode,
        "elapsed_s": round(elapsed, 3),
        "stdout_lines": len(proc.stdout.splitlines()),
        "stderr_lines": len(proc.stderr.splitlines()),
        "violations": violations,
        "first_error": None,
    }
    for ln in proc.stdout.splitlines() + proc.stderr.splitlines():
        if any(k in ln for k in ("ERROR", "Exception", "error:")):
            res["first_error"] = ln
            break
    if proc.returncode == 0 and os.path.exists(out_nq):
        res["stats"] = quad_stats(out_nq)
    res["out_nq"] = out_nq
    res["out_stdout"] = out_stdout
    res["out_stderr"] = out_stderr
    return res


def multiset(path):
    with open(path, encoding="utf-8") as fh:
        return Counter(l for l in (x.strip() for x in fh) if l and not l.startswith("#"))


def source_stats(json_path):
    with open(json_path, encoding="utf-8") as fh:
        nodes = json.load(fh)
    return {
        "nodes": len(nodes),
        "anchors": sum(len(n.get("anchors", [])) for n in nodes),
        "sections": sum(len(n.get("sections", [])) for n in nodes),
        "aliases": sum(len(n.get("aliases", [])) for n in nodes),
    }


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--jar", default=DEFAULT_JAR)
    ap.add_argument("--java", default="java")
    ap.add_argument("--xmx", default="512m")
    args = ap.parse_args()

    jar = os.path.abspath(args.jar)
    if not os.path.exists(jar):
        print(f"[fatal] jar not found: {jar}", file=sys.stderr)
        sys.exit(2)
    print(f"RMLMAPPER_JAR={jar}")
    print(f"JAR_SHA256={sha256(jar)}")
    print(f"JAVA={args.java} XMX={args.xmx} CWD={M2}")
    print(f"TIME_START={time.strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 72)

    # pre-conditions: source files must exist
    for rel in ["data/nodes-A2-s1.jsonl", "data/nodes-A2-s2.jsonl",
                "data/array-full.json", "data/wrapped-full.json",
                "data/part1-array.json", "data/part2-array.json",
                "data/array-s2.json"]:
        if not os.path.exists(os.path.join(M2, rel)):
            print(f"[fatal] missing data file: {rel} (run prep_jsonl.py first)",
                  file=sys.stderr)
            sys.exit(2)

    tests = [
        ("T1-array-full", "mappings/mapping-full.ttl"),
        ("T2-wrapped", "mappings/mapping-wrapped.ttl"),
        ("T3-raw-jsonl", "mappings/mapping-jsonl.ttl"),
        ("T4-part1", "mappings/mapping-part1.ttl"),
        ("T5-part2", "mappings/mapping-part2.ttl"),
        ("T6-s2", "mappings/mapping-s2.ttl"),
    ]

    results = {}
    for name, mapping in tests:
        res = run_test(name, mapping, args.java, jar, args.xmx)
        results[name] = res
        print(f"[test] {name} exit={res['exit']} elapsed={res['elapsed_s']}s "
              f"stdout={res['stdout_lines']} stderr={res['stderr_lines']} "
              f"violations={res['violations']}")
        if res.get("first_error"):
            print(f"  first_error: {res['first_error']}")
        if "stats" in res:
            st = res["stats"]
            print(f"  quads={st['quads']} unique_subjects={st['unique_subjects']} "
                  f"unique_predicates={st['unique_predicates']}")
    print("=" * 72)

    # C1 source vs graph correspondence for T1
    src = source_stats(os.path.join(M2, "data", "array-full.json"))
    st = results["T1-array-full"].get("stats")
    print("[check C1] T1 source -> graph correspondence")
    print(f"  source nodes={src['nodes']} anchors={src['anchors']} "
          f"sections={src['sections']} aliases={src['aliases']}")
    if st:
        n_node = sum(1 for s in st["subjects"] if "/node/" in s)
        n_anchor = sum(1 for s in st["subjects"] if "/anchor/" in s)
        pred = {p.split("/")[-1]: c for p, c in st["predicates"].items()}
        print(f"  graph quads={st['quads']} node_subjects={n_node} anchor_subjects={n_anchor}")
        print(f"  predicates={json.dumps(pred, ensure_ascii=False, sort_keys=True)}")

    # C2 wrapped equivalence
    print("[check C2] T2 (wrapped) quads vs T1 (array) quads")
    if "stats" in results["T2-wrapped"] and "stats" in results["T1-array-full"]:
        q1 = results["T1-array-full"]["stats"]["quads"]
        q2 = results["T2-wrapped"]["stats"]["quads"]
        print(f"  T1={q1} T2={q2} equal={q1 == q2}")

    # C3 raw jsonl
    res3 = results["T3-raw-jsonl"]
    print(f"[check C3] T3 raw .jsonl exit={res3['exit']} "
          f"first_error={res3['first_error']}")

    # C4 incremental equivalence
    print("[check C4] incremental: multiset(T4.nq + T5.nq) vs multiset(T1.nq)")
    if (results["T4-part1"].get("exit") == 0 and results["T5-part2"].get("exit") == 0
            and results["T1-array-full"].get("exit") == 0):
        full = multiset(results["T1-array-full"]["out_nq"])
        part1 = multiset(results["T4-part1"]["out_nq"])
        part2 = multiset(results["T5-part2"]["out_nq"])
        combo = part1 + part2
        eq = full == combo
        only1 = combo - full
        only2 = full - combo
        print(f"  full_quads={sum(full.values())} part1_quads={sum(part1.values())} "
              f"part2_quads={sum(part2.values())} combo_quads={sum(combo.values())}")
        print(f"  multiset_equal={eq}")
        print(f"  in_combo_not_full={sum(only1.values())} "
              f"in_full_not_combo={sum(only2.values())}")
        if only1:
            for ln, c in list(only1.items())[:6]:
                print(f"    combo-only x{c}: {ln[:150]}")
        if only2:
            for ln, c in list(only2.items())[:6]:
                print(f"    full-only x{c}: {ln[:150]}")
        # C4b: after a downstream dedup pass, does the incremental concat match full?
        combo_dedup = Counter(set(combo.elements()))
        eq_dedup = full == combo_dedup
        print(f"  [C4b] after dedup: multiset_equal={eq_dedup} "
              f"(combo_unique={sum(combo_dedup.values())} full={sum(full.values())})")
    else:
        print("  (skip: T1/T4/T5 not all successful)")

    # C5 cross-batch anchor duplicates
    print("[check C5] anchor (file,quote) duplicates within vs across batches")
    full_pairs = []
    with open(os.path.join(M2, "data", "array-full.json"), encoding="utf-8") as fh:
        nodes = json.load(fh)
    for n in nodes:
        for a in n.get("anchors", []):
            full_pairs.append((a["file"], a["quote"]))
    c_full = Counter(full_pairs)
    dup_pairs = {k: v for k, v in c_full.items() if v > 1}
    # which dup pairs split across the batch boundary (lines 1-6 vs 7-11)?
    with open(os.path.join(M2, "data", "nodes-A2-s1.jsonl"), encoding="utf-8") as fh:
        rows = [json.loads(l) for l in fh if l.strip()]
    part1_pairs = Counter()
    part2_pairs = Counter()
    for i, r in enumerate(rows):
        for a in r.get("anchors", []):
            if i < 6:
                part1_pairs[(a["file"], a["quote"])] += 1
            else:
                part2_pairs[(a["file"], a["quote"])] += 1
    split_across = []
    for k, v in dup_pairs.items():
        in1 = part1_pairs.get(k, 0)
        in2 = part2_pairs.get(k, 0)
        if in1 > 0 and in2 > 0:
            split_across.append((k, v, in1, in2))
    print(f"  duplicate_anchor_pairs_in_full={len(dup_pairs)} "
          f"split_across_batches={len(split_across)}")
    for k, v, in1, in2 in split_across:
        print(f"    pair x{v} (part1 x{in1}, part2 x{in2}): {k[0]} | {k[1][:50]}")

    # C6 s2 robustness
    st6 = results["T6-s2"].get("stats")
    src6 = source_stats(os.path.join(M2, "data", "array-s2.json"))
    print("[check C6] T6 (nodes-A2-s2.jsonl, 10 rows) robustness")
    if st6:
        print(f"  source nodes={src6['nodes']} anchors={src6['anchors']} "
              f"-> graph quads={st6['quads']} subjects={st6['unique_subjects']} "
              f"predicates={st6['unique_predicates']}")

    print("=" * 72)
    print(f"TIME_END={time.strftime('%Y-%m-%d %H:%M:%S')}")
    print("[done] run_tests.py complete")


if __name__ == "__main__":
    main()
