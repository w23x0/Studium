// 资料范围（批 3b）的纯转换：书按学科分组、章名、笔记里的图片引用。
import type { BookSummary, TocEntry } from '../shared/protocol.ts';

/** 个人笔记在书库里的学科名（核心给笔记的 subject）。 */
export const NOTE_SUBJECT = '个人笔记';

export interface SubjectGroup {
  /** 学科目录（如 大学物理/力学）；平铺的书是空串。 */
  subject: string;
  books: BookSummary[];
}

/** 书按学科分组：学科按名排，没分学科的放在书后面，个人笔记放最后；组内按书名排。 */
export function groupBySubject(books: BookSummary[]): SubjectGroup[] {
  const by = new Map<string, BookSummary[]>();
  for (const b of books) {
    const s = b.kind === 'note' ? NOTE_SUBJECT : (b.subject ?? '');
    by.set(s, [...(by.get(s) ?? []), b]);
  }
  const rank = (s: string) => (s === NOTE_SUBJECT ? 2 : s === '' ? 1 : 0);
  return [...by.entries()]
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b, 'zh-CN'))
    .map(([subject, list]) => ({
      subject,
      books: [...list].sort((x, y) => x.title.localeCompare(y.title, 'zh-CN', { numeric: true })),
    }));
}

/** 目录里每章（章目录名，如 ch03）的标题：取该章第一条“章”条目，没有就取第一条。 */
export function chapterTitles(entries: TocEntry[]): Map<string, string> {
  const out = new Map<string, string>();
  const first = new Map<string, string>();
  for (const e of entries) {
    const title = `${e.num} ${e.title}`.trim();
    if (!first.has(e.chapter)) first.set(e.chapter, title);
    if (e.kind === 'ch' && !out.has(e.chapter)) out.set(e.chapter, title);
  }
  for (const [ch, t] of first) if (!out.has(ch)) out.set(ch, t);
  return out;
}

/** 章目录名里的章号：ch03 → 3；认不出返回空。 */
export function chapterNumber(chapter: string): number | undefined {
  const m = /^ch0*(\d+)$/i.exec(chapter);
  return m?.[1] !== undefined ? Number(m[1]) : undefined;
}

export type NotePiece = { text: string } | { image: string; alt: string };

/**
 * 笔记一段文字里的图片引用拆出来（与核心导入时认的写法相同）：![说明](路径) 与 Obsidian 的 ![[文件]]；
 * 网址开头的不算（照原样留在文字里）。路径里的 %xx 转义按导入时的规则解开。
 */
export function noteImagePieces(text: string): NotePiece[] {
  const re = /!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?[^)]*\)|!\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g;
  const out: NotePiece[] = [];
  let at = 0;
  for (const m of text.matchAll(re)) {
    const start = m.index;
    const md = m[2];
    const wiki = m[3]?.trim();
    let ref: string | undefined;
    let alt = '';
    if (md !== undefined) {
      if (/^[a-z][a-z0-9+.-]*:/i.test(md)) continue;
      ref = safeDecode(md);
      alt = m[1] ?? '';
    } else if (wiki !== undefined && wiki !== '') {
      ref = wiki;
      alt = wiki;
    }
    if (ref === undefined) continue;
    if (start > at) out.push({ text: text.slice(at, start) });
    out.push({ image: ref, alt });
    at = start + m[0].length;
  }
  if (at < text.length) out.push({ text: text.slice(at) });
  return out.length > 0 ? out : [{ text }];
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    // 不是合法的 % 转义（路径里本来就有 %）：原样用，与核心导入时一致
    return s;
  }
}
