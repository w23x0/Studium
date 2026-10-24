// 一次学习之间的关系（从哪来：选择卡 / 接着以前那次学习）→ 排成的缩进列表。纯函数，单测覆盖。
import type { LoopRelationView } from '../shared/protocol.ts';

export interface RelationRow {
  rel: LoopRelationView;
  /** 0 = 不是接着别的学习开的；1 = 接着开的；2 = 接着的里面又接着开的…… */
  depth: number;
}

/** 有没有接着以前那次学习的（没有就不必单列关系）。 */
export function hasResumes(relations: LoopRelationView[]): boolean {
  return relations.some((r) => r.origin.kind === 'resume');
}

/** 先列不是接着开的，每段下面紧跟接着它开的（深度优先，保持原来的先后）。 */
export function relationRows(relations: LoopRelationView[]): RelationRow[] {
  const byId = new Map(relations.map((r) => [r.loopSessionId, r]));
  const parentOf = (r: LoopRelationView): LoopRelationView | undefined =>
    r.origin.kind === 'resume' ? byId.get(r.origin.fromLoop) : undefined;
  const out: RelationRow[] = [];
  const seen = new Set<string>();
  const visit = (r: LoopRelationView, depth: number) => {
    if (seen.has(r.loopSessionId)) return;
    seen.add(r.loopSessionId);
    out.push({ rel: r, depth });
    for (const c of relations) {
      if (c.origin.kind === 'resume' && c.origin.fromLoop === r.loopSessionId) {
        visit(c, depth + 1);
      }
    }
  };
  for (const r of relations) if (parentOf(r) === undefined) visit(r, 0);
  // 成环之类的坏数据：剩下的照原样平铺，不丢
  for (const r of relations) visit(r, 0);
  return out;
}
