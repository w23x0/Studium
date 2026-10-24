// 原文与出处的纯转换：回复里的出处标记、原文分段、公式切分、位置框、检索词标亮。单测覆盖。
import { parseCitations } from '../shared/citation.ts';
import type {
  BBox,
  CitationView,
  NumberedLine,
  SourceReport,
  SourceView,
} from '../shared/protocol.ts';
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

/** 纯文字里的一段：照原样的文字，或第 index 个出处标记（index 按 parseCitations 的顺序，从 0 数）。 */
export type CitationPiece = { text: string } | { cite: number };

/**
 * 把一段纯文字（依据面板里引用的对话原话）切成文字与出处标记；代码块（``` 围起来的）和行内代码（`…`）里的标记
 * 照原样留作文字，不换成小标签。出处的序号仍按整段文字里的顺序数，与核对结果对得上。
 */
export function citationPieces(text: string): CitationPiece[] {
  const marks = parseCitations(text);
  if (marks.length === 0) return [{ text }];
  const code: { start: number; end: number }[] = [];
  for (const m of text.matchAll(/```[\s\S]*?(?:```|$)|`[^`\n]+`/g)) {
    code.push({ start: m.index, end: m.index + m[0].length });
  }
  const inCode = (i: number) => code.some((c) => i >= c.start && i < c.end);
  const out: CitationPiece[] = [];
  let last = 0;
  marks.forEach((c, i) => {
    if (inCode(c.start)) return;
    if (c.start > last) out.push({ text: text.slice(last, c.start) });
    out.push({ cite: i });
    last = c.end;
  });
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}

/** 链接地址 → 第几个出处；不是出处链接返回空。 */
export function citationIndex(href: string | undefined): number | undefined {
  if (href?.startsWith(CITE_HREF) !== true) return undefined;
  const n = Number(href.slice(CITE_HREF.length));
  return Number.isInteger(n) && n >= 0 ? n : undefined;
}

/** 出处显示在哪一页：原件上比出来的页 → 文件的起页（原 PDF 页）；都没有为空。 */
export function citationPage(c: CitationView): number | undefined {
  return c.location?.page ?? c.pdfPages?.from;
}

/** 出处小标签上的字：资料名 · 第几页（没有原件页时退到文件）。 */
export function citationLabel(c: CitationView): string {
  const book = c.bookTitle ?? c.book;
  const page = citationPage(c);
  if (page !== undefined) return W.page(book, page);
  const where = c.section?.split(' ')[0];
  return where !== undefined && where !== '' ? `${book} · ${where}` : book;
}

/** 点开出处时在面板里看的东西（对不上的也给，带上原因）。 */
export function citationTarget(c: CitationView): {
  kind: 'source';
  book: string;
  file: string;
  from: number;
  to: number;
  page?: number;
  bbox?: BBox;
  problem?: string;
} {
  return {
    kind: 'source',
    book: c.book,
    file: c.file,
    from: c.from,
    to: c.to,
    ...(c.location ? { page: c.location.page, bbox: c.location.bbox } : {}),
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

/** 与这一段交叠的报错。 */
export function reportsFor(reports: SourceReport[], p: { from: number; to: number }) {
  return reports.filter((r) => overlaps(r, p));
}

// ───────────── 原件位置框 ─────────────

/** 位置框（千分比）→ 叠在图上的百分比样式。 */
export function boxStyle(b: BBox): {
  left: string;
  top: string;
  width: string;
  height: string;
} {
  const [x0, y0, x1, y1] = b;
  const pct = (v: number) => `${String(Math.max(0, Math.min(100, v / 10)))}%`;
  return {
    left: pct(x0),
    top: pct(y0),
    width: pct(Math.max(0, x1 - x0)),
    height: pct(Math.max(0, y1 - y0)),
  };
}

/** 局部截图取的范围：把位置框四周放宽一些（左右放到整行宽），夹在页面里。 */
export function cropBox(b: BBox, pad = 30): BBox {
  const c = (v: number) => Math.max(0, Math.min(1000, Math.round(v)));
  return [c(Math.min(b[0], 60)), c(b[1] - pad), c(Math.max(b[2], 940)), c(b[3] + pad)];
}

/** 几个位置框合成一个外框。 */
export function unionBox(boxes: BBox[]): BBox | undefined {
  if (boxes.length === 0) return undefined;
  return [
    Math.min(...boxes.map((b) => b[0])),
    Math.min(...boxes.map((b) => b[1])),
    Math.max(...boxes.map((b) => b[2])),
    Math.max(...boxes.map((b) => b[3])),
  ];
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

// ───────────── 选项出处里“书里的一处” ─────────────

/** 回查到原文的“书里的一处”：点开看原文用的值；查不到为空。 */
export function bookLineTarget(
  s: SourceView,
): { kind: 'source'; book: string; file: string; from: number; to: number } | undefined {
  if (s.kind !== 'book_line' || !s.resolved) return undefined;
  if (s.book === undefined || s.file === undefined || s.from === undefined) return undefined;
  return { kind: 'source', book: s.book, file: s.file, from: s.from, to: s.to ?? s.from };
}
