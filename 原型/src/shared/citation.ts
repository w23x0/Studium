// 资料出处标记：学习对话里引用资料时附在那句话后面。核心与界面共用这一个格式定义。
// 形态：【资料|资料id|文件|L起行-止行】，如 【资料|力学入门样例|ch01/sec-1.2.md|L5-9】；单行写 L5。
// W8 之前写的是【教材|…】，照样认。资料 id、文件照 textbook_index / read_source 给的写；行号 = read_source 印出的行号（从 1 数、含两端）。
// 竖线用半角 | 或全角 ｜ 都认；括号是全角。

export interface CitationRef {
  book: string;
  file: string;
  from: number;
  to: number;
}

export interface CitationMatch extends CitationRef {
  /** 回复里的原文（含括号）。 */
  raw: string;
  /** 在文本里的起止位置（slice 用）。 */
  start: number;
  end: number;
}

const SEP = '[|｜]';
const CITATION_RE = new RegExp(
  `【(?:教材|资料)${SEP}([^|｜】]+)${SEP}([^|｜】]+)${SEP}\\s*L?\\s*(\\d+)(?:\\s*[-–—~～]\\s*L?(\\d+))?\\s*】`,
  'g',
);

export function formatCitation(c: {
  book: string;
  file: string;
  from: number;
  to?: number;
}): string {
  if (/[|｜】]/.test(c.book) || /[|｜】]/.test(c.file)) {
    throw new Error('书名或文件名里有竖线或右括号，没法写成出处标记');
  }
  const to = c.to ?? c.from;
  return `【资料|${c.book}|${c.file}|L${String(c.from)}${to !== c.from ? `-${String(to)}` : ''}】`;
}

/** 找出文本里所有教材出处标记，按出现顺序。行段写反（止行 < 起行）的按起止对调。 */
export function parseCitations(text: string): CitationMatch[] {
  const out: CitationMatch[] = [];
  for (const m of text.matchAll(CITATION_RE)) {
    const book = m[1]?.trim();
    const file = m[2]?.trim();
    const a = Number(m[3]);
    const b = m[4] !== undefined ? Number(m[4]) : a;
    if (book === undefined || file === undefined || book === '' || file === '') continue;
    out.push({
      book,
      file,
      from: Math.min(a, b),
      to: Math.max(a, b),
      raw: m[0],
      start: m.index,
      end: m.index + m[0].length,
    });
  }
  return out;
}

/**
 * 选择卡出处里“书里”的一条：`书名/文件:行号` 或 `书名/文件:起行-止行`（也认整条就是一个出处标记）。
 * 没有书名的“文件:行号”不认：不同书里常有同名文件，认不出是哪一本。knownBooks 用来切开书名与文件。
 */
export function parseBookLineRef(raw: string, knownBooks: string[]): CitationRef | undefined {
  const t = raw.trim();
  const c = parseCitations(t)[0];
  if (c !== undefined && c.start === 0 && c.end === t.length) return c;
  const m = /^(.+):L?(\d+)(?:-L?(\d+))?$/.exec(t);
  if (m?.[1] === undefined || m[2] === undefined) return undefined;
  const body = m[1];
  const book = [...knownBooks]
    .sort((x, y) => y.length - x.length)
    .find((b) => body.startsWith(`${b}/`));
  if (book === undefined) return undefined;
  const file = body.slice(book.length + 1);
  if (file === '') return undefined;
  const a = Number(m[2]);
  const b = m[3] !== undefined ? Number(m[3]) : a;
  return { book, file, from: Math.min(a, b), to: Math.max(a, b) };
}
