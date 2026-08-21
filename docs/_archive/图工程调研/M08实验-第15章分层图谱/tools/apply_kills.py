"""Apply audit KILL verdicts: move nodes to a graveyard file, drop incident edges.

HARDENED after an incident: the previous version imported `sys` but never read
`argv`, so `python tools/apply_kills.py --help` silently RAN the script on
hardcoded defaults, and its unconditional `open(..., 'w')` on the two graveyard
files emptied both (28 nodes / 88 edges lost; 68 later recovered, 20 permanently).
See data/graveyard/README-恢复记录.md.

Three rules now enforced:
  1. Real argparse, so --help is inert.
  2. --dry-run writes nothing at all, and is the recommended first invocation.
  3. Graveyard files are opened in APPEND mode only. Truncation is impossible;
     if a run would re-add ids already in the graveyard it refuses instead.
"""
import argparse
import collections
import glob
import json
import os
import sys

def load_kills(args):
    kills = {}
    for r in read_jsonl(args.verdicts):
        if r.get('verdict') == 'KILL':
            kills[r['id']] = r
    print('KILL verdicts in %s: %d' % (args.verdicts, len(kills)))
    if args.only:
        requested = set(args.only)
        unknown = sorted(requested - set(kills))
        if unknown:
            sys.exit('--only names ids that are not KILLed here: %s' % unknown)
        kills = {k: v for k, v in kills.items() if k in requested}
        print('--only restricts to %d' % len(kills))
    return kills


def graveyard_guard(args, kills):
    """Refuse if any id is already in the graveyard, so a rerun cannot double-write."""
    node_path = os.path.join(args.graveyard_dir,
                             'killed-nodes-%s.jsonl' % args.tag.replace('audit-', 'audit'))
    edge_path = os.path.join(args.graveyard_dir,
                             'killed-edges-%s.jsonl' % args.tag.replace('audit-', 'audit'))
    already = set()
    if os.path.exists(node_path):
        already = {n['id'] for n in read_jsonl(node_path)}
        print('graveyard already holds %d nodes' % len(already))
    clash = sorted(already & set(kills))
    if clash:
        sys.exit('REFUSING: %d id(s) already in the graveyard, e.g. %s. '
                 'This run would duplicate them.' % (len(clash), clash[:3]))
    return node_path, edge_path



def read_jsonl(path):
    rows = []
    with open(path, encoding='utf-8') as fh:
        for line in fh:
            if line.strip():
                rows.append(json.loads(line))
    return rows


def parse_args(argv=None):
    p = argparse.ArgumentParser(
        prog='apply_kills.py',
        description='Move KILLed nodes to a graveyard and drop their incident edges.',
        epilog='Run with --dry-run first. Graveyard files are append-only.')
    p.add_argument('--verdicts', default='report/audit-B-verdicts.jsonl',
                   help='verdict jsonl with id/verdict/cause/reason '
                        '(default: %(default)s)')
    p.add_argument('--tag', default='audit-B',
                   help='audit tag; stamped as _killed_by and used in the '
                        'graveyard filenames (default: %(default)s)')
    p.add_argument('--only', nargs='*', metavar='ID',
                   help='apply only these ids, even if more are KILLed. Use for '
                        'staged application when some verdicts are still disputed.')
    p.add_argument('--nodes', default='data/nodes-*.jsonl',
                   help='glob for node files (default: %(default)s)')
    p.add_argument('--edges', default='data/edges-*.jsonl',
                   help='glob for edge files (default: %(default)s)')
    p.add_argument('--graveyard-dir', default='data/graveyard')
    p.add_argument('--dry-run', action='store_true',
                   help='report the plan and exit without writing anything')
    return p.parse_args(argv)


def main(argv=None):
    args = parse_args(argv)
    kills = load_kills(args)
    if not kills:
        sys.exit('nothing to do')
    node_path, edge_path = graveyard_guard(args, kills)

    grave_nodes, grave_edges, rewrites = [], [], []

    for f in sorted(glob.glob(args.nodes)):
        rows = read_jsonl(f)
        keep = []
        for n in rows:
            if n['id'] in kills:
                v = kills[n['id']]
                n['_killed_by'] = args.tag
                n['_kill_cause'] = v.get('cause')
                n['_kill_reason'] = v.get('reason') or v.get('note') or ''
                n['_kill_src_file'] = os.path.basename(f)
                grave_nodes.append(n)
            else:
                keep.append(n)
        if len(keep) != len(rows):
            rewrites.append((f, keep, len(rows)))

    for f in sorted(glob.glob(args.edges)):
        rows = read_jsonl(f)
        keep = []
        for e in rows:
            if e['src'] in kills or e['dst'] in kills:
                e['_dropped_with'] = e['src'] if e['src'] in kills else e['dst']
                e['_killed_by'] = args.tag
                e['_kill_src_file'] = os.path.basename(f)
                grave_edges.append(e)
            else:
                keep.append(e)
        if len(keep) != len(rows):
            rewrites.append((f, keep, len(rows)))

    print('\nplan: %d nodes, %d edges to graveyard, %d file(s) rewritten'
          % (len(grave_nodes), len(grave_edges), len(rewrites)))
    for f, keep, before in rewrites:
        print('  %-28s %d -> %d' % (os.path.basename(f), before, len(keep)))
    missing = sorted(set(kills) - {n['id'] for n in grave_nodes})
    print('KILL ids not found in %s: %d %s' % (args.nodes, len(missing), missing[:5]))
    print('edges by rel dropped:',
          dict(collections.Counter(e['rel'] for e in grave_edges)))

    if args.dry_run:
        print('\n--dry-run: nothing written')
        return 0

    os.makedirs(args.graveyard_dir, exist_ok=True)
    # APPEND only. The truncating 'w' mode that caused the original data loss is
    # deliberately absent from this file.
    for path, rows in ((node_path, grave_nodes), (edge_path, grave_edges)):
        with open(path, 'a', encoding='utf-8') as fh:
            for row in rows:
                fh.write(json.dumps(row, ensure_ascii=False) + '\n')
        print('appended %d rows -> %s' % (len(rows), path))
    for f, keep, _ in rewrites:
        with open(f, 'w', encoding='utf-8') as fh:
            for row in keep:
                fh.write(json.dumps(row, ensure_ascii=False) + '\n')
    print('rewrote %d data file(s)' % len(rewrites))
    return 0


if __name__ == '__main__':
    sys.exit(main())
