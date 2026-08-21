"""Regenerate data/ID-MANIFEST.md from the current on-disk graph."""
import json, glob, os, collections

def load(pats):
    out = []
    for p in pats:
        for f in sorted(glob.glob(p)):
            for l in open(f, encoding='utf-8'):
                if l.strip():
                    r = json.loads(l); r['_file'] = os.path.basename(f); out.append(r)
    return out

nodes = load(['data/nodes-*.jsonl', 'data/inherited/nodes-*.jsonl'])
byid = {n['id']: n for n in nodes}
apostol = sorted([n for n in nodes if n['id'].startswith('apostol:')], key=lambda n: n['id'])
dnodes = [n for n in nodes if n['id'].startswith('d:')]
xnodes = sorted([n for n in nodes if n['id'].startswith('x:')], key=lambda n: n['id'])
strang = sorted([n for n in nodes if n['id'].startswith('strang:')], key=lambda n: n['id'])

L = []
L.append('# ID 清单（自动生成，勿手改）')
L.append('')
L.append('由 `tools/gen_manifest.py` 从 `data/` 下的现存节点重新生成。')
L.append('节点总数 **%d**：apostol L1 %d、d: 下延 %d、x: 跨教材 %d、strang L1 %d。' % (
    len(nodes), len(apostol), len(dnodes), len(xnodes), len(strang)))
L.append('')
L.append('> 已被 Audit B 判 KILL 的节点已从本清单移除，存于 `data/graveyard/killed-nodes-auditB.jsonl`。'
         '**引用清单外的 id 一律视为悬空。**')
L.append('')

L.append('## 一、Apostol 第 15 章 L1 节点（%d）' % len(apostol))
L.append('')
bysec = collections.defaultdict(list)
for n in apostol:
    secs = n.get('sections') or ['(无节号)']
    bysec[secs[0]].append(n)
for sec in sorted(bysec):
    L.append('### %s' % sec)
    for n in bysec[sec]:
        L.append('- `%s` — %s（%s）' % (n['id'], n.get('name_zh', ''), n.get('node_type', '')))
    L.append('')

L.append('## 二、d: 下延节点（%d），按 parent 分组' % len(dnodes))
L.append('')
L.append('`*(未到底)*` = `atomic: false`，即该节点自陈仍可继续拆分。')
L.append('')
byparent = collections.defaultdict(list)
for n in dnodes:
    byparent[n.get('parent') or '(无 parent)'].append(n)
for p in sorted(byparent, key=lambda k: (k not in byid, k)):
    pn = byid.get(p)
    label = ('%s — %s' % (p, pn.get('name_zh', ''))) if pn else ('%s **[悬空 parent]**' % p)
    L.append('### `%s`（%d）' % (label, len(byparent[p])))
    for n in sorted(byparent[p], key=lambda n: n['id']):
        mark = ' *(未到底)*' if n.get('atomic') is False else ''
        L.append('- `%s` — %s%s' % (n['id'], n.get('name_zh', ''), mark))
    L.append('')

L.append('## 三、x: 跨教材不变量（%d）' % len(xnodes))
L.append('')
for n in xnodes:
    L.append('### `%s` — %s' % (n['id'], n.get('name_zh', '')))
    for k, lab in (('apostol_ids', 'Apostol 侧成员'), ('strang_ids', 'Strang 侧成员')):
        ms = n.get(k, [])
        bad = [m for m in ms if m not in byid]
        L.append('- %s（%d）：%s' % (lab, len(ms), '、'.join('`%s`' % m for m in ms) or '（无）'))
        if bad:
            L.append('  - **悬空**：%s' % '、'.join('`%s`' % m for m in bad))
    L.append('')

L.append('## 四、Strang L1 节点（%d）' % len(strang))
L.append('')
sbysec = collections.defaultdict(list)
for n in strang:
    secs = n.get('sections') or ['(无节号)']
    sbysec[secs[0]].append(n)
for sec in sorted(sbysec):
    L.append('### %s' % sec)
    for n in sbysec[sec]:
        L.append('- `%s` — %s' % (n['id'], n.get('name_zh', '')))
    L.append('')

open('data/ID-MANIFEST.md', 'w', encoding='utf-8').write('\n'.join(L) + '\n')
print('wrote data/ID-MANIFEST.md: %d lines, %d nodes' % (len(L) + 1, len(nodes)))

dangling = collections.Counter()
for n in xnodes:
    for k in ('apostol_ids', 'strang_ids'):
        for m in n.get(k, []):
            if m not in byid:
                dangling[m] += 1
print('dangling x-layer members: %d %s' % (len(dangling), dict(list(dangling.items())[:8])))
