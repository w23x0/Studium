// 依据面板用的纯转换：把核心给的视图变成给学习者看的文字。单测覆盖。
import { W } from './wording.ts';

export type Segment = { text: string } | { line: number; to?: number; text: string };

/** 判断理由里引用行的写法（L12、L12-14、第 12 行）拆出来，好做成可点的跳转。 */
export function splitLineRefs(text: string): Segment[] {
  const out: Segment[] = [];
  const re = /L(\d+)(?:\s*[-–~]\s*L?(\d+))?|第\s*(\d+)\s*行/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    const start = m.index;
    if (start > last) out.push({ text: text.slice(last, start) });
    const line = Number(m[1] ?? m[3]);
    const to = m[2] !== undefined ? Number(m[2]) : undefined;
    out.push(
      to !== undefined && to > line
        ? { line, to, text: W.lineRangeRef }
        : { line, text: W.lineRef },
    );
    last = start + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}

/** 记录里的时间 → 本地的“月-日 时:分”；不是时间就原样给。 */
export function shortTime(at: string): string {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return at;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 片段引用的全部行（L3-5 → 3、4、5）。 */
export function segmentLines(s: { line: number; to?: number }): number[] {
  const to = Math.min(s.to ?? s.line, s.line + 50);
  return Array.from({ length: to - s.line + 1 }, (_, i) => s.line + i);
}

/** 一条消息覆盖的行里有没有要高亮的。 */
export function coversAny(lines: readonly number[], wanted: readonly number[]): boolean {
  return lines.some((l) => wanted.includes(l));
}
