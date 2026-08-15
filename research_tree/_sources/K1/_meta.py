import re, glob, sys

def meta(path):
    try:
        x = open(path, encoding='utf-8').read()
    except Exception as e:
        return f'ERR {path}: {e}'
    t = re.search(r'<title>(.*?)</title>', x, re.S)
    p = re.search(r'<published>(.*?)</published>', x, re.S)
    auths = re.findall(r'<name>(.*?)</name>', x)[:6]
    summ = re.search(r'<summary>(.*?)</summary>', x, re.S)
    out = []
    out.append('TITLE: ' + (' '.join(t.group(1).split()) if t else 'NOT FOUND'))
    out.append('DATE: ' + (p.group(1)[:10] if p else 'NOT FOUND'))
    out.append('AUTHORS: ' + ', '.join(auths))
    if summ:
        out.append('ABSTRACT: ' + ' '.join(summ.group(1).split())[:700])
    return '\n'.join(out)

# verify seeded IDs
for idv in ['2606.11680', '2606.29778', '2606.20683', '2606.28379']:
    path = f'_verify_{idv}.xml'
    print(f'==== verify {idv} ====')
    print(meta(path))
    print()

# full abstract from fetched HTML pages
for html in sorted(glob.glob('arxiv_abs_*.html')):
    print(f'==== {html} ====')
    try:
        x = open(html, encoding='utf-8').read()
    except Exception as e:
        print('ERR', e); continue
    t = re.search(r'<title>(.*?)</title>', x, re.S)
    print('TITLE:', ' '.join(t.group(1).split()) if t else '?')
    # citation abstract
    ab = re.search(r'<blockquote class="abstract[^"]*">(.*?)</blockquote>', x, re.S)
    if ab:
        txt = re.sub(r'<[^>]+>', '', ab.group(1))
        print('ABSTRACT:', ' '.join(txt.split())[:750])
    else:
        cab = re.search(r'<meta name="citation_abstract" content="([^"]*)"', x)
        if cab:
            print('CITATION_ABSTRACT:', cab.group(1)[:750])
    date = re.search(r'<meta name="citation_date" content="([^"]*)"', x)
    if date:
        print('DATE:', date.group(1))
    print()
