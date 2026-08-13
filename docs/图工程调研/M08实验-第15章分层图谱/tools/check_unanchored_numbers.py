# -*- coding: utf-8 -*-
"""Find numeric values that a node asserts but no anchor of that node backs.

Motivation. Audit A4b (report/audit-A4b.md section 2.3) proved that
report/丢弃与未覆盖清单.md section 3 -- the register of values the model
computed itself rather than read off the page -- was incomplete: it found an
unregistered pair in apostol:cx-symmetric-interval-decouples-the-coefficients.
The register was built by asking the proposing agents to self-report, which is
exactly the kind of source that cannot be trusted to be exhaustive.

This tool replaces self-reporting with a scan. For every node it pulls the
numeric tokens out of the statement and keeps those that appear in none of the
node's own anchor quotes. Whatever survives is either (a) a value the model
produced, which belongs in the register, or (b) a cross-reference the filters
below failed to recognise.

It is deliberately a triage tool, not a verdict tool. It cannot tell a computed
value from a citation, so it over-reports and the output is meant to be read.
It is also the mechanizable half of A4b's section 4.1 finding (the wrong clause
was the one clause no anchor covered) -- numbers are the sub-case of that
finding where "is this clause covered?" can be decided by string matching.

Exit code is 0 regardless of findings; this is a report, not a gate.
"""
import argparse
import io
import json
import re
import sys

NUM = re.compile(r'(?<![\w.])\d+(?:\.\d+)?(?![\w])')

# A number preceded by one of these within LOOKBACK chars is a cross-reference
# to the book's own numbering, not a value the node computed.
REFWORDS = (
    'axiom', 'theorem', 'exercise', 'example', 'section', 'chapter',
    'part', 'property', 'properties', 'volume', 'case', 'step',
    'dim', 'dimension', 'v_', 'c(', 'l2', 'through', 'and', 'to',
)
LOOKBACK = 44


def numbers_in(text):
    """Yield (token, preceding-context) for each numeric token."""
    for m in NUM.finditer(text):
        yield m.group(0), text[max(0, m.start() - LOOKBACK):m.start()].lower()


def is_reference(ctx):
    return any(w in ctx for w in REFWORDS)


def load(paths):
    for path in paths:
        with io.open(path, encoding='utf-8') as fh:
            for lineno, line in enumerate(fh, 1):
                if not line.strip():
                    continue
                try:
                    yield path, lineno, json.loads(line)
                except ValueError as exc:
                    sys.stderr.write('%s:%d bad json: %s\n' % (path, lineno, exc))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--nodes', nargs='+', required=True)
    ap.add_argument('--keep-refs', action='store_true',
                    help='do not filter out book cross-references')
    ap.add_argument('--out')
    args = ap.parse_args()

    findings = []
    scanned = 0
    for path, _, n in load(args.nodes):
        scanned += 1
        statement = n.get('statement', '')
        haystack = ' '.join(a.get('quote', '') for a in n.get('anchors', []))
        sections = set(str(s) for s in n.get('sections', []))
        bare = set()
        for tok, ctx in numbers_in(statement):
            if tok in haystack:
                continue
            if any(tok in s for s in sections):
                continue
            if not args.keep_refs and is_reference(ctx):
                continue
            bare.add(tok)
        if bare:
            findings.append((path, n['id'], sorted(bare, key=float), statement))

    lines = []
    lines.append('# 无锚点支撑的数值（机器筛查）')
    lines.append('')
    lines.append('扫描节点 %d 个，命中 %d 个。' % (scanned, len(findings)))
    lines.append('')
    lines.append('命中不等于缺陷：本工具分不清"模型自己算的值"和"没被过滤器认出的交叉引用"，')
    lines.append('故意宁滥勿缺。需要人读。')
    lines.append('')
    for path, nid, bare, statement in findings:
        lines.append('## `%s`' % nid)
        lines.append('')
        lines.append('- 文件：`%s`' % path.replace('\\', '/'))
        lines.append('- 无锚点数值：%s' % ', '.join('`%s`' % b for b in bare))
        lines.append('- statement：%s' % statement)
        lines.append('')
    text = '\n'.join(lines) + '\n'

    if args.out:
        with io.open(args.out, 'w', encoding='utf-8', newline='\n') as fh:
            fh.write(text)
        print('scanned %d nodes, %d hit -> %s' % (scanned, len(findings), args.out))
    else:
        sys.stdout.write(text)
    return 0


if __name__ == '__main__':
    sys.exit(main())
