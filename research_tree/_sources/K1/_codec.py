import re
x = open('../H3-3/arxiv_abs_2605.17304.html', encoding='utf-8').read()
ab = re.search(r'<blockquote class="abstract[^"]*">(.*?)</blockquote>', x, re.S)
cab = re.search(r'<meta name="citation_abstract" content="([^"]*)"', x)
t = re.search(r'<title>(.*?)</title>', x, re.S)
print('TITLE:', ' '.join(t.group(1).split()) if t else '?')
src = ' '.join(re.sub(r'<[^>]+>', '', ab.group(1)).split()) if ab else (cab.group(1) if cab else '')
print('ABSTRACT:', src[:1100])
