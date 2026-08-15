import urllib.request, urllib.parse, re, time, json
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
    "Context-Faithfulness of Language Models in Long-Form Open-Domain Question Answering",
    "SUMO: A Benchmark for Citation Quality of Large Language Models",
    "In Search of Truth",
    "SCENE: Evaluating the Explainability",
    "On the Attribution of Quotes to Context in Generative AI",
    "Unmasking Citation Hallucinations",
    "Citation quality of large language models",
    "Verifiable Question Answering",
]
for t in TITLES:
    r = api(t)
    if r:
        for x in r:
            print(f"{x['pub']}  {x['id']}  {x['title'][:90]}")
    else:
        print("FAIL:", t[:60])
    time.sleep(3)
