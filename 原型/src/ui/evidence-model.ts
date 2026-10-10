// 依据面板用的纯转换：把核心给的视图变成给学习者看的文字。单测覆盖。
import type { SourceView } from '../shared/protocol.ts';
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

export interface SourceText {
  kind: string;
  title: string;
  detail?: string;
}

/** 选项的一条出处 → 给学习者看的样子（核心给的 label 带编号与内部词，不直接显示）。 */
export function sourceText(s: SourceView): SourceText {
  const kind = W.sourceKind[s.kind];
  const detail = s.detail !== undefined ? { detail: s.detail } : {};
  switch (s.kind) {
    case 'm08_point': {
      const name = /「(.+)」/.exec(s.label)?.[1];
      return { kind, title: name ?? kind, ...detail };
    }
    case 'm08_clause': {
      const arrow = s.label.split('：').slice(1).join('：');
      return { kind, title: arrow !== '' ? arrow : kind, ...detail };
    }
    case 'm09_record':
      return { kind, title: s.detail ?? kind };
    case 'loop_line':
      return {
        kind,
        title: W.loopLineSource,
        ...(s.resolved ? detail : { detail: W.sourceNotResolved }),
      };
    case 'book_line':
      // 核心给的说法是“书里《书名》 小节 页 第几行”，对不上时括号里写原因；去掉开头的“书里”就是标题
      return {
        kind,
        title: s.label.replace(/^书里\s*/, ''),
        detail: s.resolved && s.detail !== undefined ? s.detail : W.sourceNotResolved,
      };
    case 'unknown':
      return { kind, title: s.raw };
  }
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
