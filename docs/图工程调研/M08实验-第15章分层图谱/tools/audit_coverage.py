"""Report audit coverage over all nodes, and the blast radius of Audit B's KILLs."""
import json, glob, os, collections

def load(pat):
    out = []
    for f in sorted(glob.glob(pat)):
        for l in open(f, encoding='utf-8'):
            if l.strip():
                r = json.loads(l); r['_file'] = os.path.basename(f); out.append(r)
    return out

nodes = load('data/nodes-*.jsonl') + load('data/inherited/nodes-*.jsonl')
edges = load('data/edges-*.jsonl') + load('data/inherited/edges-*.jsonl')
byid = {n['id']: n for n in nodes}
print('nodes %d  edges %d' % (len(nodes), len(edges)))
print('per file:', dict(collections.Counter(n['_file'] for n in nodes)))

verd = {}
for f in ('report/audit-A1-verdicts.jsonl', 'report/audit-A2-verdicts.jsonl',
          'report/audit-B-verdicts.jsonl'):
    tag = os.path.basename(f).split('-')[1]
    for l in open(f, encoding='utf-8'):
        if l.strip():
            r = json.loads(l)
            verd.setdefault(r['id'], {})[tag] = r

print('\n--- audit coverage by source file ---')
tbl = collections.defaultdict(lambda: collections.Counter())
for n in nodes:
    got = verd.get(n['id'], {})
    key = n['_file']
    tbl[key]['n'] += 1
    tbl[key]['A' if ('A1' in got or 'A2' in got) else 'noA'] += 1
    tbl[key]['B' if 'B' in got else 'noB'] += 1
for k in sorted(tbl):
    c = tbl[k]
    print('  %-28s n=%-4d A=%-4d noA=%-4d B=%-4d noB=%-4d' % (
        k, c['n'], c['A'], c['noA'], c['B'], c['noB']))

orphan = [i for i in verd if i not in byid]
print('\nverdict ids not present in graph:', len(orphan), orphan[:6])

kills = [i for i, v in verd.items() if v.get('B', {}).get('verdict') == 'KILL']
print('\n--- Audit B KILL blast radius (%d nodes) ---' % len(kills))
kset = set(kills)
children = collections.defaultdict(list)
for n in nodes:
    p = n.get('parent')
    if p:
        children[p].append(n['id'])
out_e = collections.defaultdict(list); in_e = collections.defaultdict(list)
for e in edges:
    out_e[e['src']].append(e); in_e[e['dst']].append(e)

hub = []
for i in sorted(kills):
    ch = children.get(i, [])
    ch_alive = [c for c in ch if c not in kset]
    a_ver = verd[i].get('A1') or verd[i].get('A2')
    a_v = a_ver['verdict'] if a_ver else '-'
    if ch_alive:
        hub.append((i, ch_alive))
    print('  %-72s A=%-5s children=%-2d(alive %d) out=%-2d in=%-2d' % (
        i, a_v, len(ch), len(ch_alive), len(out_e.get(i, [])), len(in_e.get(i, []))))

print('\nKILL nodes that are mounting hubs for surviving children: %d' % len(hub))
for i, ch in hub:
    print('  %s -> %s' % (i, ch))

conflict = [i for i in kills if (verd[i].get('A1') or verd[i].get('A2'))
            and (verd[i].get('A1') or verd[i].get('A2'))['verdict'] == 'KEEP']
print('\nKILLed by B but KEPT by A (needs my ruling): %d' % len(conflict))
edge_loss = sum(len(out_e.get(i, [])) + len(in_e.get(i, [])) for i in kills)
print('edges touching KILL nodes: %d' % edge_loss)
