import urllib.request, urllib.parse, re, time, json, sys, os

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) research-harness/1.0"

def fetch(url, retries=3):
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=40) as r:
                return r.read().decode("utf-8", "replace")
        except Exception as e:
            print(f"  retry {i+1}: {e}", file=sys.stderr)
            time.sleep(7)
    return None

def parse_results(html):
    blocks = re.findall(r'<li class="arxiv-result">(.*?)</li>', html, re.S)
    out = []
    for b in blocks:
        m = re.search(r'arxiv\.org/abs/([0-9]{4}\.[0-9]{4,5})', b)
        if not m: continue
        pid = m.group(1)
        mt = re.search(r'<p class="title is-5 mathjax">\s*(.*?)\s*</p>', b, re.S)
        title = re.sub(r'<[^>]+>','',mt.group(1)).strip() if mt else ''
        ma = re.search(r'<p class="authors">(.*?)</p>', b, re.S)
        authors = ''
        if ma:
            auths = re.findall(r'query=[^"]*">([^<]+)</a>', ma.group(1))
            authors = ', '.join(auths)
        mab = re.search(r'<p class="abstract mathjax">(.*?)</p>', b, re.S)
        abstract = ''
        if mab:
            inner = re.sub(r'<[^>]+>','',mab.group(1))
            abstract = re.sub(r'\s+',' ', inner).strip()
        year = 2000 + int(pid[:2]) if int(pid[:2]) <= 40 else 1900 + int(pid[:2])
        out.append({"id": pid, "year": year, "month": pid[2:4], "title": title, "authors": authors, "abstract": abstract})
    return out

GROUPS = {
    "attributable_generation": "attributable generation citation LLM",
    "hallucination_provenance": "hallucination detection provenance LLM",
    "retrieve_then_verify": "retrieve then verify fact checking",
    "citation_equivalence": "citation faithfulness verifiable generation",
    "attributable_qa": "attributable question answering",
    "fact_checking_verification": "fact checking LLM verification",
    "anchor_groundedness": "grounded generation evidence verification retrieval",
    "citation_grounding": "citation grounding retrieval augmented",
    "verifiability_sufficiency": "verifiability check evidence sufficiency",
}

all_results = {}
for name, q in GROUPS.items():
    url = ("https://arxiv.org/search/?searchtype=all&query=" + urllib.parse.quote(q) +
           "&start=0&size=50&order=-announced_date_first")
    print(f"### {name}: {q}")
    html = fetch(url)
    if not html:
        print("  FAILED"); continue
    with open(f"search_results/{name}.html", "w", encoding="utf-8") as f:
        f.write(html)
    res = [r for r in parse_results(html) if r["year"] >= 2024]
    all_results[name] = res
    print(f"  -> {len(res)} results (2024+)")
    for r in res[:8]:
        print(f"    {r['id']} ({r['year']}-{r['month']}) {r['title'][:85]}")
    time.sleep(5)

with open("search_results/compiled.json", "w", encoding="utf-8") as f:
    json.dump(all_results, f, ensure_ascii=False, indent=1)
print("TOTAL", sum(len(v) for v in all_results.values()))
