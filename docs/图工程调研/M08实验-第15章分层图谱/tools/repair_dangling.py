"""Repair member references left dangling by Audit B's KILLs.

Policy, in priority order:
  1. If Audit B's sibling-redundancy table named a retained node, point there.
  2. Otherwise point at the killed node's parent -- Audit B killed these
     precisely because they restated the parent, so the parent is an equally
     valid instance of whatever routine the L2 candidate is collecting.
  3. If the target is already a member, drop instead of duplicating.
Every change is logged so the L2 auditors can see what was touched and why.
"""
import json, glob, collections

REDIRECT = {
    'd:zero-is-the-only-self-orthogonal-element':
        'd:zero-is-the-only-element-orthogonal-to-itself',
    'd:infinite-dimensional-example-space-of-all-polynomials':
        'd:infinite-dimensional-operational-criterion-no-finite-spanning-set',
    'd:explicit-gram-schmidt-formulas-for-an-independent-input':
        'd:gram-schmidt-inductive-step-defines-y-r-plus-one',
}

alive = set()
for p in ('data/nodes-*.jsonl', 'data/inherited/nodes-*.jsonl'):
    for f in glob.glob(p):
        for l in open(f, encoding='utf-8'):
            if l.strip():
                alive.add(json.loads(l)['id'])

parent_of = {}
for l in open('data/graveyard/killed-nodes-auditB.jsonl', encoding='utf-8'):
    n = json.loads(l)
    parent_of[n['id']] = n.get('parent')

def target(dead):
    t = REDIRECT.get(dead) or parent_of.get(dead)
    return t if t in alive else None

log = []
FILES = ['data/structures-L2-a.jsonl', 'data/structures-L2-b.jsonl',
         'data/structures-L2-c.jsonl', 'data/nodes-X.jsonl']
KEYS = ('members', 'apostol_ids', 'strang_ids')

for f in FILES:
    rows = [json.loads(l) for l in open(f, encoding='utf-8') if l.strip()]
    changed = False
    for n in rows:
        for k in KEYS:
            if k not in n:
                continue
            new, seen = [], set()
            for m in n[k]:
                if m in alive:
                    if m not in seen:
                        new.append(m); seen.add(m)
                    continue
                t = target(m)
                if t is None:
                    log.append((f, n['id'], k, m, 'DROP', 'no living replacement'))
                    changed = True
                elif t in seen or t in n[k]:
                    log.append((f, n['id'], k, m, 'DROP', 'replacement %s already a member' % t))
                    changed = True
                else:
                    how = 'sibling-table' if m in REDIRECT else 'parent'
                    log.append((f, n['id'], k, m, 'REDIRECT->%s' % t, how))
                    new.append(t); seen.add(t); changed = True
            n[k] = new
    if changed:
        with open(f, 'w', encoding='utf-8') as fh:
            for n in rows:
                fh.write(json.dumps(n, ensure_ascii=False) + '\n')
        print('rewrote %s' % f)

print('\n%d changes' % len(log))
for f, nid, k, m, act, why in log:
    print('  %-26s %-64s %-12s %-70s %s (%s)' % (
        f.split('/')[-1], nid, k, m, act, why))

with open('report/悬空成员修复日志.md', 'w', encoding='utf-8') as fh:
    fh.write('# 悬空成员修复日志\n\n')
    fh.write('Audit B 判 KILL 的 28 个节点被移出图后，L2 候选与 X 层节点的成员列表出现悬空引用。'
             '本文件逐条记录修复动作，供 L2 审计员核查。\n\n')
    fh.write('修复策略（优先级）：1) Audit B 兄弟冗余表指名的保留项；'
             '2) 被杀节点的 parent —— B 杀它们的理由正是「复述 parent」，'
             '故 parent 本身是同一套路的同等有效实例；3) 若目标已是成员，则删除而非重复。\n\n')
    fh.write('| 文件 | 节点 | 字段 | 原成员（已被杀） | 动作 | 依据 |\n|---|---|---|---|---|---|\n')
    for f, nid, k, m, act, why in log:
        fh.write('| `%s` | `%s` | %s | `%s` | %s | %s |\n' % (
            f.split('/')[-1], nid, k, m, act.replace('->', ' → '), why))
print('\nwrote report/悬空成员修复日志.md')
