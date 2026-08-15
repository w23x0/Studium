import re, sys
files = [
    'arxiv_kb_org_agent_mem.xml',
    'arxiv_notes_kg_llm.xml',
    'arxiv_versioned_mem.xml',
    'arxiv_agent_mem_survey.xml',
    'arxiv_second_brain.xml',
]
for fn in files:
    try:
        x = open(fn, encoding='utf-8').read()
    except Exception as e:
        print('ERR', fn, e); continue
    print('##############', fn, '##############')
    entries = re.findall(r'<entry>(.*?)</entry>', x, re.S)
    for e in entries:
        t = re.search(r'<title>(.*?)</title>', e, re.S)
        p = re.search(r'<published>(.*?)</published>', e, re.S)
        id_ = re.search(r'<id>(.*?)</id>', e, re.S)
        auths = re.findall(r'<name>(.*?)</name>', e)
        summ = re.search(r'<summary>(.*?)</summary>', e, re.S)
        print('ID:', id_.group(1).strip() if id_ else '?')
        print('TITLE:', ' '.join(t.group(1).split()) if t else '?')
        print('DATE:', p.group(1)[:10] if p else '?')
        print('AUTHORS:', ', '.join(auths[:6]))
        if summ:
            s = ' '.join(summ.group(1).split())
            print('ABSTRACT:', s[:380])
        print('---')
