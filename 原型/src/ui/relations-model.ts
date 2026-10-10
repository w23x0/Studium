// 学习之间的关系（来源、岔开、回来）→ 按“从哪岔出来”排成的缩进列表。纯函数，单测覆盖。
import type { ForkLinkView, LoopRelationView } from '../shared/protocol.ts';

export interface RelationRow {
  rel: LoopRelationView;
  /** 0 = 不是从别的学习里岔出来的；1 = 岔出来的；2 = 岔出来的里面又岔出来的…… */
  depth: number;
  /** 岔出来的那段：回去没有（undefined = 还在外面）。depth 0 的没有这一项。 */
  back?: { returned?: ForkLinkView['returned'] };
}

/** 有没有岔开过（没有就不必单列关系）。 */
export function hasForks(relations: LoopRelationView[]): boolean {
  return relations.some((r) => r.origin.kind === 'fork');
}

/** 先列不是岔出来的，每段下面紧跟它岔出去的（深度优先，保持原来的先后）。 */
export function relationRows(relations: LoopRelationView[]): RelationRow[] {
  const byId = new Map(relations.map((r) => [r.loopSessionId, r]));
  const parentOf = (r: LoopRelationView): LoopRelationView | undefined =>
    r.origin.kind === 'fork' ? byId.get(r.origin.fork.fromLoop) : undefined;
  const out: RelationRow[] = [];
  const seen = new Set<string>();
  const visit = (r: LoopRelationView, depth: number) => {
    if (seen.has(r.loopSessionId)) return;
    seen.add(r.loopSessionId);
    const parent = parentOf(r);
    const link = parent?.forks.find((f) => f.forkLoopSessionId === r.loopSessionId);
    out.push({
      rel: r,
      depth,
      ...(parent !== undefined
        ? { back: link?.returned !== undefined ? { returned: link.returned } : {} }
        : {}),
    });
    for (const c of relations) {
      if (c.origin.kind === 'fork' && c.origin.fork.fromLoop === r.loopSessionId) {
        visit(c, depth + 1);
      }
    }
  };
  for (const r of relations) if (parentOf(r) === undefined) visit(r, 0);
  // 成环之类的坏数据：剩下的照原样平铺，不丢
  for (const r of relations) visit(r, 0);
  return out;
}
