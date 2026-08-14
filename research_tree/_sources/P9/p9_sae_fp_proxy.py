#!/usr/bin/env python3
"""P9: Sparse autoencoder proxy on M08 node embeddings — FP vs contrasts (SAE line)."""
import json
import sys
import random
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn

ROOT = Path(__file__).resolve().parents[3]
DATA = ROOT / "docs/图工程调研/M08实验-第15章分层图谱/data"
sys.path.insert(0, str(ROOT / "research_tree/_sources/P2"))
from P2_common import find_data_files, iter_jsonl  # noqa: E402


class SAE(nn.Module):
    def __init__(self, d_in, d_hidden):
        super().__init__()
        self.enc = nn.Linear(d_in, d_hidden)
        self.dec = nn.Linear(d_hidden, d_in)

    def forward(self, x):
        h = torch.relu(self.enc(x))
        return self.dec(h), h


def node_text(n):
    parts = [n.get("name_en") or "", n.get("name_zh") or "", n.get("statement") or ""]
    parts += list(n.get("aliases") or [])
    return " ".join(p for p in parts if p)


def load_corpus():
    nodes = {}
    for f in find_data_files(str(DATA))[0]:
        for obj in iter_jsonl(f):
            nodes[obj["id"]] = obj
    edges = []
    for f in find_data_files(str(DATA))[1]:
        for e in iter_jsonl(f):
            edges.append(e)
    return nodes, edges


def train_sae(X, d_hidden=128, epochs=400, lr=1e-3, l1=1e-4):
    torch.manual_seed(42)
    model = SAE(X.shape[1], d_hidden)
    opt = torch.optim.Adam(model.parameters(), lr=lr)
    Xt = torch.tensor(X, dtype=torch.float32)
    for _ in range(epochs):
        opt.zero_grad()
        recon, h = model(Xt)
        loss = nn.functional.mse_loss(recon, Xt) + l1 * h.abs().mean()
        loss.backward()
        opt.step()
    model.eval()
    with torch.no_grad():
        _, h = model(Xt)
    return h.numpy(), model


def main():
    from sentence_transformers import SentenceTransformer

    random.seed(42)
    nodes, edges = load_corpus()
    ids = list(nodes.keys())
    texts = [node_text(nodes[i]) for i in ids]
    model = SentenceTransformer("all-MiniLM-L6-v2")
    emb = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
    codes, sae = train_sae(emb, d_hidden=128)
    # L2-normalize sparse codes for cosine
    norms = np.linalg.norm(codes, axis=1, keepdims=True)
    norms[norms == 0] = 1
    codes_n = codes / norms

    id_to_idx = {i: k for k, i in enumerate(ids)}

    def sim_codes(a, b):
        ia, ib = id_to_idx[a], id_to_idx[b]
        return float(np.dot(codes_n[ia], codes_n[ib]))

    def sim_dense(a, b):
        ia, ib = id_to_idx[a], id_to_idx[b]
        return float(np.dot(emb[ia], emb[ib]))

    pos = [(e["src"], e["dst"]) for e in edges if e.get("rel") in ("alias-of", "equivalent")]
    neg = [(e["src"], e["dst"]) for e in edges if e.get("rel") == "contrasts"]

    thresholds = [0.75, 0.8, 0.85, 0.9]
    out = {
        "method": "MiniLM-384 -> SAE(128, ReLU) proxy; NOT LM-residual SAE (Anthropic line)",
        "literature_limit": "2605.29358: features incomplete, no rigorous faithfulness eval (A)",
        "node_count": len(ids),
        "pos_n": len(pos),
        "contrasts_n": len(neg),
        "sae_recon_mse": float(np.mean((sae(torch.tensor(emb, dtype=torch.float32))[0].detach().numpy() - emb) ** 2)),
        "thresholds": {},
    }
    for thr in thresholds:
        pos_s = [sim_codes(a, b) for a, b in pos if a in nodes and b in nodes]
        neg_s = [sim_codes(a, b) for a, b in neg if a in nodes and b in nodes]
        out["thresholds"][str(thr)] = {
            "sae_pos_recall": round(sum(1 for s in pos_s if s >= thr) / max(len(pos_s), 1), 4),
            "sae_contrasts_fp": round(sum(1 for s in neg_s if s >= thr) / max(len(neg_s), 1), 4),
            "dense_contrasts_fp": round(
                sum(1 for a, b in neg if a in nodes and b in nodes and sim_dense(a, b) >= thr)
                / max(len(neg), 1),
                4,
            ),
        }
    top = sorted([(sim_codes(a, b), a, b) for a, b in neg if a in nodes and b in nodes], reverse=True)[:5]
    out["top_contrast_sae_sims"] = [{"sim": round(s, 4), "src": a, "dst": b} for s, a, b in top]
    out["verdict"] = "不解锁§9; SAE proxy FP >= dense at 0.75-0.80 (same failure mode as P6)"
    print(json.dumps(out, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
