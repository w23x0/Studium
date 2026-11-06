// 原文与出处的纯转换：回复里的出处标记、原文分段、公式切分、检索词标亮。
import { parseCitations } from '../shared/citation.ts';
import type { CitationView, NumberedLine } from '../shared/protocol.ts';
import { W } from './wording.ts';

// ───────────── 回复里的出处标记 ─────────────

/** 出处标记换成的链接地址前缀；Markdown 的链接组件认到它就画成出处小标签。 */
export const CITE_HREF = '#studium-cite-';

/**
 * 把回复里的教材出处标记换成 Markdown 链接 `[n](#studium-cite-i)`（i 是第几个标记，从 0 数，
 * 与 parseCitations / 核心解析的顺序一致）。流式中末尾没写完的标记先藏起来，写完再显示。
 */
export function linkCitations(text: string, streaming: boolean): string {
  let out = '';
  let last = 0;
  parseCitations(text).forEach((c, i) => {
    out += `${text.slice(last, c.start)}[${String(i + 1)}](${CITE_HREF}${String(i)})`;
    last = c.end;
  });
  let rest = text.slice(last);
  if (streaming) rest = rest.replace(/【(?:教(?:材[^】\n]*)?)?$/, '');
  return out + rest;
}

/** 链接地址 → 第几个出处；不是出处链接返回空。 */
export function citationIndex(href: string | undefined): number | undefined {
  if (href?.startsWith(CITE_HREF) !== true) return undefined;
  const n = Number(href.slice(CITE_HREF.length));
  return Number.isInteger(n) && n >= 0 ? n : undefined;
}

/** 出处小标签上的字：资料名 · 文件。 */
export function citationLabel(c: CitationView): string {
  return `${c.materialTitle ?? c.material} · ${c.file}`;
}

/** 点开出处时在面板里看的东西（对不上的也给，带上原因）。 */
export function citationTarget(c: CitationView): {
  kind: 'source';
  material: string;
  file: string;
  from: number;
  to: number;
  problem?: string;
} {
  return {
    kind: 'source',
    material: c.material,
    file: c.file,
    from: c.from,
    to: c.to,
    ...(!c.resolved ? { problem: c.problem ?? W.citationBad } : {}),
  };
}

// ───────────── 原文 ─────────────

export interface Paragraph {
  from: number;
  to: number;
  text: string;
}

/** 小节原文按空行分段（`$$` 公式块中间的空行不切）；每段记起止行号。 */
export function paragraphs(lines: NumberedLine[]): Paragraph[] {
  const out: Paragraph[] = [];
  let cur: NumberedLine[] = [];
  let inMath = false;
  const flush = () => {
    const first = cur[0];
    const last = cur.at(-1);
    if (first !== undefined && last !== undefined) {
      out.push({ from: first.n, to: last.n, text: cur.map((l) => l.text).join('\n') });
    }
    cur = [];
  };
  for (const l of lines) {
    if (!inMath && l.text.trim() === '') {
      flush();
      continue;
    }
    cur.push(l);
    if (((l.text.match(/\$\$/g) ?? []).length & 1) === 1) inMath = !inMath;
  }
  flush();
  return out;
}

/** 两个行段有没有交叠。 */
export function overlaps(a: { from: number; to: number }, b: { from: number; to: number }) {
  return a.from <= b.to && b.from <= a.to;
}

export type TextPiece = { text: string } | { math: string; display: boolean };

/** 一段原文切成文字与公式（`$$…$$` 是独立公式、`$…$` 是行内公式；`\$` 不算）。 */
export function mathPieces(text: string): TextPiece[] {
  const out: TextPiece[] = [];
  const re = /\$\$([\s\S]+?)\$\$|(?<!\\)\$((?:\\.|[^$\\\n])+?)\$/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) out.push({ text: text.slice(last, m.index) });
    const display = m[1] !== undefined;
    out.push({ math: (m[1] ?? m[2] ?? '').trim(), display });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}

/** 原文一行开头的 Markdown 标记（标题 #、引用 >）拆出来：界面按标题 / 正文显示，不露井号。 */
export function lineStyle(text: string): { heading: boolean; text: string } {
  const h = /^#{1,6}\s+(.*)$/.exec(text);
  return h?.[1] !== undefined ? { heading: true, text: h[1] } : { heading: false, text };
}

/** 去掉 **粗体** 的星号，返回切开的片段（strong 为真的是粗体）。 */
export function boldPieces(text: string): { text: string; strong: boolean }[] {
  const out: { text: string; strong: boolean }[] = [];
  let last = 0;
  for (const m of text.matchAll(/\*\*([^*]+)\*\*/g)) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), strong: false });
    out.push({ text: m[1] ?? '', strong: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), strong: false });
  return out;
}

// ───────────── 检索 ─────────────

/** 检索结果摘录里把检索词标出来（不分大小写）。 */
export function markTerms(snippet: string, query: string): { text: string; hit: boolean }[] {
  const terms = query
    .split(/\s+/)
    .filter((t) => t !== '')
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (terms.length === 0) return [{ text: snippet, hit: false }];
  const out: { text: string; hit: boolean }[] = [];
  let last = 0;
  for (const m of snippet.matchAll(new RegExp(terms.join('|'), 'gi'))) {
    if (m.index > last) out.push({ text: snippet.slice(last, m.index), hit: false });
    out.push({ text: m[0], hit: true });
    last = m.index + m[0].length;
  }
  if (last < snippet.length) out.push({ text: snippet.slice(last), hit: false });
  return out;
}
