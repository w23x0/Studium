#!/usr/bin/env python3
"""P6 v2: sentence-transformers cosine FP probe on M08 522-node corpus."""
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
    return " ".join(p for p in parts if p)


def main():
    random.seed(42)
    from sentence_transformers import SentenceTransformer
    import numpy as np

    model = SentenceTransformer("all-MiniLM-L6-v2")
    nodes = load_nodes()
    edges = load_edges()
    ids = list(nodes.keys())
    texts = [node_text(nodes[i]) for i in ids]
    emb = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
    id_to_idx = {i: k for k, i in enumerate(ids)}

    def sim(a_id, b_id):
        ia, ib = id_to_idx[a_id], id_to_idx[b_id]
        return float(np.dot(emb[ia], emb[ib]))

    # Gold: should-be-same (alias-of + equivalent)
    pos_pairs = [(e["src"], e["dst"]) for e in edges if e.get("rel") in ("alias-of", "equivalent")]
    # Gold: should-NOT-merge (contrasts — related but distinct per M08 audit)
    neg_contrasts = [(e["src"], e["dst"]) for e in edges if e.get("rel") == "contrasts"]
    neg_random = [tuple(random.sample(ids, 2)) for _ in range(min(200, len(ids)))]

    # Hard manual: Cauchy-Schwarz norm form vs inequality theorem (related, not same object)
    hard_neg = []
    if "apostol:cauchy-schwarz-inequality" in nodes and "d:cauchy-schwarz-in-norm-form" in nodes:
        hard_neg.append(("apostol:cauchy-schwarz-inequality", "d:cauchy-schwarz-in-norm-form"))

    thresholds = [0.75, 0.8, 0.85, 0.9, 0.95]
    results = {
        "node_count": len(ids),
        "edge_count": len(edges),
        "method": "sentence-transformers all-MiniLM-L6-v2 cosine",
        "pos_pairs_n": len(pos_pairs),
        "contrasts_n": len(neg_contrasts),
        "thresholds": {},
    }

    for thr in thresholds:
        pos_sims = [sim(a, b) for a, b in pos_pairs if a in nodes and b in nodes]
        neg_c_sims = [sim(a, b) for a, b in neg_contrasts if a in nodes and b in nodes]
        neg_r_sims = [sim(a, b) for a, b in neg_random]
        results["thresholds"][str(thr)] = {
            "pos_recall": round(sum(1 for s in pos_sims if s >= thr) / max(len(pos_sims), 1), 4),
            "contrasts_fp_rate": round(sum(1 for s in neg_c_sims if s >= thr) / max(len(neg_c_sims), 1), 4),
            "random_fp_rate": round(sum(1 for s in neg_r_sims if s >= thr) / max(len(neg_r_sims), 1), 4),
        }

    # rel frequency (G5)
    from collections import Counter
    rel_c = Counter(e.get("rel", "?") for e in edges)
    results["rel_frequency"] = dict(rel_c.most_common())
    results["other_pct"] = round(100 * rel_c.get("other", 0) / len(edges), 2)

    # Distribution stats at 0.85
    thr85 = 0.85
    neg_c_sims = [sim(a, b) for a, b in neg_contrasts if a in nodes and b in nodes]
    results["contrasts_sim_median"] = round(float(np.median(neg_c_sims)), 4) if neg_c_sims else None
    results["contrasts_sim_p90"] = round(float(np.percentile(neg_c_sims, 90)), 4) if neg_c_sims else None
    results["contrasts_fp_at_0.85"] = results["thresholds"]["0.85"]["contrasts_fp_rate"]

    fps = sorted([(sim(a, b), a, b) for a, b in neg_contrasts], reverse=True)[:8]
    results["top_contrast_sims"] = [
        {"sim": round(s, 4), "src": a, "dst": b} for s, a, b in fps
    ]
    if hard_neg:
        results["hard_neg_cauchy_pair"] = {
            "pair": hard_neg[0],
            "sim": round(sim(*hard_neg[0]), 4),
            "would_fp_at_0.85": sim(*hard_neg[0]) >= 0.85,
        }

    print(json.dumps(results, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
