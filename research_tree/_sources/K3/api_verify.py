import urllib.request, urllib.parse, re, time, json, sys
def api(title):
    q = 'ti:' + '"' + title + '"'
    url = 'https://export.arxiv.org/api/query?search_query=' + urllib.parse.quote(q) + '&start=0&max_results=3'
    req = urllib.request.Request(url, headers={'User-Agent':'research-harness/1.0'})
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            xml = r.read().decode('utf-8','replace')
    except Exception as e:
        return None
    entries = re.findall(r'<entry>(.*?)</entry>', xml, re.S)
    out=[]
    for e in entries:
        mt = re.search(r'<title>(.*?)</title>', e, re.S)
        title_ = re.sub(r'\s+',' ',mt.group(1)).strip() if mt else ''
        mp = re.search(r'<published>(.*?)</published>', e)
        pub = mp.group(1)[:10] if mp else ''
        mid = re.search(r'<id>http://arxiv.org/abs/([0-9.]+)</id>', e)
        pid = mid.group(1) if mid else ''
        ms = re.search(r'<summary>(.*?)</summary>', e, re.S)
        summ = re.sub(r'\s+',' ',re.sub(r'<[^>]+>','',ms.group(1))).strip() if ms else ''
        ma = re.findall(r'<name>(.*?)</name>', e)
        out.append({'id':pid,'pub':pub,'title':title_,'authors':', '.join(ma),'abstract':summ})
    return out

TITLES = [
    "A Benchmark for Attribution in Retrieval-Augmented Generation",
    "CiteME: Can Language Models Accurately Cite Scientific Claims",
    "RAGChecker: A Fine-grained Framework for Diagnosing Retrieval-Augmented Generation",
    "Context-Faithfulness of Language Models in Long-Form Open-Domain Question Answering",
    "SUMO: A Benchmark for Citation Quality of Large Language Models",
    "In Search of Truth: An Interrogation Approach to Hallucination Detection",
    "Self-Contradictory Hallucinations of Large Language Models",
    "LongFormFactuality: Evaluating the Factuality of Long-form Outputs of Models",
    "CRAG - Comprehensive RAG Benchmark",
    "SCENE: Evaluating the explainability of Large Language Model-based Veracity Assessment",
    "Verify-and-Edit: A Knowledge-Intensive LLM-driven Engine for Factually Accurate Knowledge-based Question Answering",
    "Mirage: Benchmarking Large Language Models and Retrieval-Augmented Generation on the Long Tail of Legal Knowledge",
    "On the Attribution of Quotes to Context in Generative AI",
    "Verifiable Generation with Subsequence Identification",
    "Attributed Question Answering",
]
results={}
for t in TITLES:
    r = api(t)
    results[t]=r
    if r:
        for x in r:
            print(f"{x['pub']}  {x['id']}  {x['title'][:75]}")
    else:
        print("FAIL:", t[:60])
    time.sleep(3)
json.dump(results, open('api_title_hits.json','w',encoding='utf-8'), ensure_ascii=False, indent=1)
