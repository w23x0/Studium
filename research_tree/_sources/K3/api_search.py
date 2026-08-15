import urllib.request, urllib.parse, re, time, json, sys
def api_search(query, maxr=20):
    url = ('https://export.arxiv.org/api/query?search_query=' + urllib.parse.quote(query) +
           f'&start=0&max_results={maxr}&sortBy=submittedDate&sortOrder=descending')
    req = urllib.request.Request(url, headers={'User-Agent':'research-harness/1.0'})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=45) as r:
                xml = r.read().decode('utf-8','replace')
            entries = re.findall(r'<entry>(.*?)</entry>', xml, re.S)
            out=[]
            for e in entries:
                mt = re.search(r'<title>(.*?)</title>', e, re.S)
                title = re.sub(r'\s+',' ',mt.group(1)).strip() if mt else ''
                mp = re.search(r'<published>(.*?)</published>', e)
                pub = mp.group(1)[:10] if mp else ''
                mid = re.search(r'<id>http://arxiv.org/abs/([0-9]{4}\.[0-9]{4,5})', e)
                pid = mid.group(1) if mid else ''
                ms = re.search(r'<summary>(.*?)</summary>', e, re.S)
                summ = re.sub(r'\s+',' ',re.sub(r'<[^>]+>','',ms.group(1))).strip() if ms else ''
                ma = re.findall(r'<name>(.*?)</name>', e)
                cat = re.search(r'<arxiv:primary_category term="([^"]*)"', e)
                if pid:
                    out.append({'id':pid,'pub':pub,'title':title,'authors':', '.join(ma),
                                'abstract':summ,'cat':cat.group(1) if cat else ''})
            return out
        except Exception as ex:
            print(f'  attempt {attempt+1} err: {ex}', file=sys.stderr)
            time.sleep(8)
    return None

GROUPS = {
 'attributable_gen': 'all:"attributable generation"',
 'citation_quality': '(all:"citation" AND all:"grounding") OR (all:"citation" AND all:"faithfulness")',
 'hallucination_verif': '(all:"hallucination" AND all:"verification") OR (all:"hallucination" AND all:"provenance")',
 'fact_check_verif': 'all:"fact checking" AND all:"verification"',
 'context_faithfulness': 'all:"context faithfulness"',
 'retrieve_verify': 'all:"retrieval" AND all:"verification" AND all:"evidence"',
 'attribution': '(all:"attribution" AND all:"retrieval-augmented") OR (all:"attribution" AND all:"faithfulness")',
 'verifiability': 'all:"verifiability" OR (all:"verifiable" AND all:"answer")',
 'sufficiency': '(all:"sufficiency" AND all:"evidence") OR (all:"sufficient" AND all:"verification")',
 'citation_needed': 'all:"citation needed"',
 'quotes_provenance': '(all:"provenance" AND all:"grounding") OR (all:"attributable" AND all:"quote")',
}
allr={}
for name,q in GROUPS.items():
    r = api_search(q)
    if r is None:
        print(name,'FAIL'); continue
    r=[x for x in r if x['pub'] >= '2024-01-01']
    allr[name]=r
    print(f'### {name}: {len(r)} (2024+)')
    for x in r[:8]:
        print(f"   {x['pub']} {x['id']} {x['title'][:80]}")
    time.sleep(4)
json.dump(allr, open('api_compiled.json','w',encoding='utf-8'), ensure_ascii=False, indent=1)
print('TOTAL', sum(len(v) for v in allr.values()))
