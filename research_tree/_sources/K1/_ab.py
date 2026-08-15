import re
for f in ['arxiv_abs_2606.11680.html', 'arxiv_abs_2606.29778.html', 'arxiv_abs_2606.10921.html']:
    x = open(f, encoding='utf-8').read()
    ab = re.search(r'<blockquote class="abstract[^"]*">(.*?)</blockquote>', x, re.S)
    t = re.search(r'<title>(.*?)</title>', x, re.S)
    cab = re.search(r'<meta name="citation_abstract" content="([^"]*)"', x)
    print('====', f, '====')
    print('TITLE:', ' '.join(t.group(1).split()) if t else '?')
    if ab:
        print('ABSTRACT:', ' '.join(re.sub(r'<[^>]+>', '', ab.group(1)).split())[:900])
    elif cab:
        print('CIT_ABS:', ' '.join(cab.group(1).split())[:900])
    print()
