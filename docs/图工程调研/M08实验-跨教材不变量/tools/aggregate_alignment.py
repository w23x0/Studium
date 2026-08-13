#!/usr/bin/env python3
"""汇总所有 blk*-result.jsonl 的对齐强度分布,并用 answer-key 还原真实 id。"""
import json, glob, os, collections, sys

base=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
align=os.path.join(base,"align")

# 收集所有 key(blk1a/blk1b 共用 blk1-key)
def keyfor(blk):
    for cand in (f"{blk}-key.json", f"{blk[:4]}-key.json"):
        p=os.path.join(align,cand)
        if os.path.exists(p): return json.load(open(p,encoding="utf-8"))
    return {}

strength=collections.Counter()
matched_pairs=[]  # (strength, [a_names],[s_names])
none_a=[]; none_s=[]
blocks=sorted(set(os.path.basename(f).split("-result")[0] for f in glob.glob(os.path.join(align,"*-result.jsonl"))))
per_block={}
for blk in blocks:
    k=keyfor(blk)
    def nm(t): return k.get(t,t).split(":")[-1]
    pb=collections.Counter()
    for l in open(os.path.join(align,f"{blk}-result.jsonl"),encoding="utf-8"):
        if not l.strip():continue
        r=json.loads(l); st=r["strength"]; strength[st]+=1; pb[st]+=1
        a=[nm(t) for t in r.get("a_toks",[])]; s=[nm(t) for t in r.get("s_toks",[])]
        if st=="none":
            (none_a if r.get("a_toks") else none_s).append((a or s)[0])
        else:
            matched_pairs.append((st,tuple(a),tuple(s)))
    per_block[blk]=pb

print("blocks completed:",", ".join(blocks))
print("\n=== per-block strength ===")
for blk in blocks:
    pb=per_block[blk]
    m=pb['strict-same']+pb['special-case']+pb['type-flip']+pb.get('same-name-different-thing',0)
    print(f"  {blk:7} match={m:2}  strict={pb['strict-same']:2}  special={pb['special-case']:2}  flip={pb['type-flip']:2}  none={pb['none']:2}")

matched=strength['strict-same']+strength['special-case']+strength['type-flip']+strength.get('same-name-different-thing',0)
print("\n=== TOTAL ===")
print(f"  matched pairs      : {matched}")
print(f"  strict-same        : {strength['strict-same']}  ({strength['strict-same']/matched:.0%} of matched)")
print(f"  special-case       : {strength['special-case']}  ({strength['special-case']/matched:.0%})")
print(f"  type-flip          : {strength['type-flip']}")
print(f"  same-name-diff     : {strength.get('same-name-different-thing',0)}")
print(f"  none (Apostol-only): {len(none_a)}")
print(f"  none (Strang-only) : {len(none_s)}")
