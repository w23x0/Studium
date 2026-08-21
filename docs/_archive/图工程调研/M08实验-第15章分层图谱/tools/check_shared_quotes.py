# -*- coding: utf-8 -*-
"""Flag anchors/evidence quotes that are shared by more than one node or edge.

WHY THIS EXISTS
---------------
tools/verify_anchors.py proves only that a quote is an unaltered contiguous
substring of the named source file.  It cannot detect that a verbatim quote
fails to *support* the statement it is attached to.  Audits A1, A2 and A3 each
found such cases hidden inside a 100%-machine-passing set of anchors.

A3 classified the mismatches into three forms:

  form A  variable-position error: the quote is about an adjacent but different
          object than the statement claims.            -- not mechanizable
  form B  borrowed quote: the quote genuinely belongs to a different node, and
          the tell is that the same (file, quote) pair is cited by several
          nodes at once.                               -- SEMI-mechanizable
  form C  endpoint-for-intermediate: the quote is the final displayed result
          while the statement describes an intermediate step the author never
          wrote.                                       -- not mechanizable

This tool covers form B only, and only as a *warning list for human review*.
Sharing a quote is often perfectly legitimate -- a definition sentence is the
natural anchor for the concept, its notation, and its immediate consequence.
A3 inspected 11 shared groups by hand and found 9 legitimate, 2 drifted.  So a
nonzero count is expected and is not a failure; the exit code stays 0 unless
--strict is passed.

Nothing here licenses the sentence "N/N evidence verified" as a correctness
claim.  See report/实验报告.md.

USAGE
    python tools/check_shared_quotes.py \
        --nodes data/nodes-*.jsonl data/inherited/nodes-*.jsonl \
        --edges data/edges-*.jsonl data/inherited/edges-*.jsonl \
        [--min 2] [--strict] [--out report/shared-quotes.md]
"""
import argparse
import io
import json
import os
from collections import defaultdict


def read_jsonl(path):
    with io.open(path, encoding='utf-8') as fh:
        for lineno, line in enumerate(fh, 1):
            line = line.strip()
            if line:
                yield lineno, json.loads(line)


def collect(node_files, edge_files):
    """(file, quote) -> list of citation dicts."""
    cites = defaultdict(list)
    for path in node_files:
        base = os.path.basename(path)
        for lineno, n in read_jsonl(path):
            for i, a in enumerate(n.get('anchors') or []):
                key = (a.get('file'), a.get('quote'))
                cites[key].append({
                    'kind': 'node',
                    'ref': n['id'],
                    'slot': 'anchors[%d]' % i,
                    'where': '%s:%d' % (base, lineno),
                    'text': n.get('statement') or '',
                })
    for path in edge_files:
        base = os.path.basename(path)
        for lineno, e in read_jsonl(path):
            ev = e.get('evidence')
            if not ev:
                continue
            key = (ev.get('file'), ev.get('quote'))
            cites[key].append({
                'kind': 'edge',
                'ref': '%s --%s--> %s' % (e.get('src'), e.get('rel'), e.get('dst')),
                'slot': 'evidence',
                'where': '%s:%d' % (base, lineno),
                'text': e.get('rel_note') or '',
            })
    return cites


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--nodes', nargs='+', required=True)
    ap.add_argument('--edges', nargs='*', default=[])
    ap.add_argument('--min', type=int, default=2,
                    help='report groups cited at least this many times')
    ap.add_argument('--strict', action='store_true',
                    help='exit 1 when any group is reported (off by default: '
                         'shared quotes are usually legitimate)')
    ap.add_argument('--out', default=None, help='also write a Markdown review list')
    args = ap.parse_args()

    cites = collect(args.nodes, args.edges)
    groups = [(k, v) for k, v in cites.items() if len(v) >= args.min]
    # node-only groups first (edges reusing a node's anchor is the most benign
    # case), then by citation count descending, then stably by file and quote.
    groups.sort(key=lambda kv: (-sum(1 for c in kv[1] if c['kind'] == 'node'),
                                -len(kv[1]), kv[0][0] or '', kv[0][1] or ''))

    total = len(cites)
    n_node_only = sum(1 for _, v in groups
                      if len({c['ref'] for c in v if c['kind'] == 'node'}) >= 2)
    print('distinct (file, quote) pairs : %d' % total)
    print('shared by >= %d citations     : %d' % (args.min, len(groups)))
    print('  of which >= 2 distinct nodes: %d   <- the form-B review set' % n_node_only)
    print('')
    print('Shared quotes are frequently legitimate. This is a review list, not a')
    print('defect list; only a human reading each statement can tell drift from reuse.')

    lines = ['# 共享引文审查清单（form B 半机械检测）', '',
             '`tools/check_shared_quotes.py` 的输出。共享引文**多数是合法的**：',
             '一句定义天然同时支撑概念节点、记号节点和它的直接推论。',
             '此清单只是把"同一 `(file, quote)` 被多个节点引用"这一唯一可机械发现的',
             '漂移线索列出来，供人工逐条读 statement 判断，机器无法代替这一步。', '',
             '- 不同 `(file, quote)` 对：%d' % total,
             '- 被 >= %d 处引用：%d' % (args.min, len(groups)),
             '- 其中涉及 >= 2 个不同节点（form B 审查集）：%d' % n_node_only, '']
    for (f, q), v in groups:
        lines.append('## `%s`' % f)
        lines.append('')
        lines.append('> %s' % (q or '').replace('\n', ' '))
        lines.append('')
        for c in v:
            lines.append('- **%s** `%s` (%s, %s)' % (c['kind'], c['ref'],
                                                     c['slot'], c['where']))
            if c['text']:
                snippet = c['text'][:160]
                lines.append('  - %s%s' % (snippet, '…' if len(c['text']) > 160 else ''))
        lines.append('')

    if args.out:
        io.open(args.out, 'w', encoding='utf-8', newline='\n').write('\n'.join(lines) + '\n')
        print('\nwrote %s' % args.out)

    raise SystemExit(1 if (args.strict and groups) else 0)


if __name__ == '__main__':
    main()
