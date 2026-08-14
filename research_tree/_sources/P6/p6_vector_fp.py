#!/usr/bin/env python3
"""P6: TF-IDF cosine false-positive probe on M08 522-node corpus (embedding proxy)."""
import json
import os
import sys
import glob
import random

DATA_DIR = os.path.abspath(
    r"C:/Users/Wang/Desktop/Studium/docs/图工程调研/M08实验-第15章分层图谱/data"
)


def load_nodes():
    nodes = {}
    for pat in [os.path.join(DATA_DIR, "nodes-*.jsonl"),
                os.path.join(DATA_DIR, "inherited", "nodes-*.jsonl")]:
        for f in sorted(glob.glob(pat)):
            with open(f, encoding="utf-8") as fh:
                for line in fh:
                    if line.strip():
                        n = json.loads(line)
                        nodes[n["id"]] = n
    return nodes


def load_edges():
    edges = []
    for pat in [os.path.join(DATA_DIR, "edges-*.jsonl"),
                os.path.join(DATA_DIR, "inherited", "edges-*.jsonl")]:
        for f in sorted(glob.glob(pat)):
            with open(f, encoding="utf-8") as fh:
                for line in fh:
                    if line.strip():
                        edges.append(json.loads(line))
    return edges


def node_text(n):
    parts = [n.get("name_en") or "", n.get("name_zh") or "", n.get("statement") or ""]
    parts += list(n.get("aliases") or [])
    return " ".join(p for p in parts if p).lower()


def tfidf_vectors(texts):
    """Minimal TF-IDF without sklearn."""
    import math
    from collections import Counter
    tokenized = [t.split() for t in texts]
    df = Counter()
    for toks in tokenized:
        for w in set(toks):
            df[w] += 1
    N = len(texts)
    vecs = []
    for toks in tokenized:
        tf = Counter(toks)
        vec = {}
        for w, c in tf.items():
            vec[w] = (c / len(toks)) * math.log((N + 1) / (df[w] + 1))
        vecs.append(vec)
    return vecs


def cosine(a, b):
    import math
    keys = set(a) | set(b)
    if not keys:
        return 0.0
    dot = sum(a.get(k, 0) * b.get(k, 0) for k in keys)
    na = math.sqrt(sum(v * v for v in a.values()))
    nb = math.sqrt(sum(v * v for v in b.values()))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


def main():
    random.seed(42)
    nodes = load_nodes()
    edges = load_edges()
    ids = list(nodes.keys())
    id_to_idx = {i: k for k, i in enumerate(ids)}
    texts = [node_text(nodes[i]) for i in ids]
    vecs = tfidf_vectors(texts)

    def sim(a_id, b_id):
        return cosine(vecs[id_to_idx[a_id]], vecs[id_to_idx[b_id]])

    # Positive-ish: requires/part-of pairs (related, may share vocabulary)
    pos_pairs = [(e["src"], e["dst"]) for e in edges if e.get("rel") in ("requires", "part-of", "implies")][:80]
    # Hard negative: contrasts (semantically related but NOT merge candidates per M08)
    neg_contrasts = [(e["src"], e["dst"]) for e in edges if e.get("rel") == "contrasts"][:80]
    # Random negatives
    neg_random = []
    for _ in range(80):
        a, b = random.sample(ids, 2)
        neg_random.append((a, b))

    thresholds = [0.5, 0.6, 0.7, 0.8]
    results = {"node_count": len(ids), "edge_count": len(edges), "method": "TF-IDF cosine (proxy, not word2vec)", "thresholds": {}}

    for thr in thresholds:
        pos_sims = [sim(a, b) for a, b in pos_pairs if a in nodes and b in nodes]
        neg_c_sims = [sim(a, b) for a, b in neg_contrasts if a in nodes and b in nodes]
        neg_r_sims = [sim(a, b) for a, b in neg_random]
        pos_hit = sum(1 for s in pos_sims if s >= thr)
        fp_contrast = sum(1 for s in neg_c_sims if s >= thr)
        fp_random = sum(1 for s in neg_r_sims if s >= thr)
        results["thresholds"][str(thr)] = {
            "pos_pairs_n": len(pos_sims),
            "pos_recall_at_thr": round(pos_hit / max(len(pos_sims), 1), 4),
            "contrasts_n": len(neg_c_sims),
            "contrasts_fp_rate_at_thr": round(fp_contrast / max(len(neg_c_sims), 1), 4),
            "random_n": len(neg_r_sims),
            "random_fp_rate_at_thr": round(fp_random / max(len(neg_r_sims), 1), 4),
        }

    # rel frequency (G5 embedded)
    from collections import Counter
    rel_c = Counter(e.get("rel", "?") for e in edges)
    results["rel_frequency"] = dict(rel_c.most_common())
    results["other_count"] = rel_c.get("other", 0)
    results["other_pct"] = round(100 * rel_c.get("other", 0) / max(len(edges), 1), 2)

    # top false positives at 0.7 among contrasts
    thr = 0.7
    fps = [(sim(a, b), a, b) for a, b in neg_contrasts if a in nodes and b in nodes]
    fps = sorted([(s, a, b) for s, a, b in fps if s >= thr], reverse=True)[:5]
    results["sample_contrast_fps_at_0.7"] = [
        {"sim": round(s, 4), "src": a, "dst": b} for s, a, b in fps
    ]

    print(json.dumps(results, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
