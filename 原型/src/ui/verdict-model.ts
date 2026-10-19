// 守卫判定在界面上怎么显示（会话/守卫.md §4–§5；记录/学过的记录.md「守卫判定」）：
// 学习者实际表现出的理解逐条列出，每条带证据强度（独立程度 × 持久程度）与依据行的原话。纯函数，单测覆盖。
import type { QuoteView } from '../shared/protocol.ts';
import type { Understanding } from '../shared/records.ts';
import { W } from './wording.ts';

export interface UnderstandingRow {
  text: string;
  /** 证据强度的一句话（“自己做出来 · 只在当场”）。 */
  strength: string;
  /** 依据行，按行号升序。 */
  lines: number[];
  /** 只留这条理解引的那几行的原话，按行号升序。 */
  quotes: QuoteView[];
}

/** 证据强度：独立程度 + 持久程度，各用日常话。 */
export function strengthLabel(u: Pick<Understanding, 'independence' | 'durability'>): string {
  return `${W.independence[u.independence]} · ${W.durability[u.durability]}`;
}

/** 判定的实际理解逐条排好；没写理解（没合上 / 旧判定）就是空列表。 */
export function understandingRows(v: {
  understanding?: readonly (Understanding & { quotes?: readonly QuoteView[] })[];
}): UnderstandingRow[] {
  return (v.understanding ?? []).map((u) => {
    const lines = [...u.lines].sort((a, b) => a - b);
    const wanted = new Set(lines);
    const quotes = [...(u.quotes ?? [])]
      .filter((q) => wanted.has(q.line))
      .sort((a, b) => a.line - b.line);
    return { text: u.text, strength: strengthLabel(u), lines, quotes };
  });
}
