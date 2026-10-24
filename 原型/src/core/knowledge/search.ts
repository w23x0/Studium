// 项目资料的全文检索（纯函数）：所有词（空白隔开）都出现在同一段里才算命中；按整句匹配 / 标题含词 / 词频排序。
import type { SearchHit, TocEntry } from '../../shared/protocol.ts';

export interface SearchOptions {
  /** 只搜这一份。 */
  book?: string;
  /** 只在这几份里搜；给了 book 时以 book 为准。 */
  books?: string[];
  /** 最多返回几条（默认 20，上限 100）。 */
  limit?: number;
  /** 同一个文件最多返回几条（默认 3）。 */
  perSection?: number;
}

export interface SearchResult {
  hits: SearchHit[];
  /** 命中的段落总数（返回之前，含被 limit / perSection 截掉的）。 */
  total: number;
}

/** 读进内存的一个正文文件。 */
export interface IndexedFile {
  entry: TocEntry;
  lines: string[];
  lower: string[];
}

/** 检索的一份：资料 id、标题、读进内存的正文文件。 */
export interface SearchSet {
  book: string;
  title: string;
  files: IndexedFile[];
}

export function searchSets(
  sets: SearchSet[],
  query: string,
  opt: SearchOptions = {},
): SearchResult {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t !== '');
  if (terms.length === 0) return { hits: [], total: 0 };
  const limit = Math.min(Math.max(opt.limit ?? 20, 1), 100);
  const perSection = Math.max(opt.perSection ?? 3, 1);
  const phrase = terms.join(' ');
  const scored: { hit: SearchHit; score: number; order: number }[] = [];
  let order = 0;
  for (const set of sets) {
    for (const f of set.files) {
      const titleLower = f.entry.title.toLowerCase();
      for (const para of paragraphs(f.lower)) {
        const text = f.lower.slice(para.from, para.to + 1).join('\n');
        if (!terms.every((t) => text.includes(t))) continue;
        const first = terms[0] ?? '';
        // 报哪一行：有整句就取含整句的那行，否则取含词最多的那行（并列取靠前的）
        let at = para.from;
        let best = -1;
        for (let i = para.from; i <= para.to; i++) {
          const l = f.lower[i] ?? '';
          const n = (l.includes(phrase) ? 100 : 0) + terms.filter((t) => l.includes(t)).length;
          if (n > best) {
            best = n;
            at = i;
          }
        }
        const score =
          (text.includes(phrase) ? 3 : 0) +
          (terms.some((t) => titleLower.includes(t)) ? 2 : 0) +
          Math.min(
            terms.reduce((s, t) => s + text.split(t).length - 1, 0),
            5,
          ) *
            0.2;
        scored.push({
          score,
          order: order++,
          hit: {
            book: set.book,
            bookTitle: set.title,
            file: f.entry.file ?? '',
            num: f.entry.num,
            title: f.entry.title,
            line: at + 1,
            snippet: snippet(
              f.lines[at] ?? '',
              f.lower[at] ?? '',
              terms.find((t) => (f.lower[at] ?? '').includes(t)) ?? first,
            ),
            ...(f.entry.pdfPages !== undefined ? { pdfPage: f.entry.pdfPages.from } : {}),
          },
        });
      }
    }
  }
  scored.sort((a, c) => c.score - a.score || a.order - c.order);
  const perFile = new Map<string, number>();
  const hits: SearchHit[] = [];
  for (const s of scored) {
    const key = `${s.hit.book}\0${s.hit.file}`;
    const used = perFile.get(key) ?? 0;
    if (used >= perSection) continue;
    perFile.set(key, used + 1);
    hits.push(s.hit);
    if (hits.length >= limit) break;
  }
  return { hits, total: scored.length };
}

export function splitLines(text: string): string[] {
  const lines = text.split('\n');
  // 文件以换行结尾时 split 多出一个空串：它不是一行
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

/** 以空行分段，返回每段在行数组里的起止下标（含两端）。 */
function paragraphs(lines: string[]): { from: number; to: number }[] {
  const out: { from: number; to: number }[] = [];
  let start = -1;
  for (let i = 0; i <= lines.length; i++) {
    const blank = i === lines.length || (lines[i] ?? '').trim() === '';
    if (!blank && start < 0) start = i;
    if (blank && start >= 0) {
      out.push({ from: start, to: i - 1 });
      start = -1;
    }
  }
  return out;
}

function snippet(line: string, lower: string, term: string): string {
  const i = Math.max(lower.indexOf(term), 0);
  const from = Math.max(0, i - 60);
  const body = line.slice(from, i + term.length + 100).trim();
  return `${from > 0 ? '…' : ''}${body}${i + term.length + 100 < line.length ? '…' : ''}`;
}
