// 原文与出处（批 2a）：把 M07 的书、目录、小节、全文检索、原件页面、教材出处标记、资料报错整理成界面和模型能直接用的视图。
// 只读书库；唯一会写的是资料报错存放处（只追加）。
import { randomBytes } from 'node:crypto';
import { parseBookLineRef, parseCitations, type CitationRef } from '../shared/citation.ts';
import {
  SOURCE_REPORT_KINDS,
  type SourceReport,
  type SourceReportKind,
} from '../shared/records.ts';
import type {
  BBox,
  BooksResponse,
  CitationView,
  LibrarySearchResponse,
  LocateResponse,
  PageAnchor,
  PageResponse,
  SectionResponse,
  SourceReportRequest,
  TocResponse,
} from '../shared/protocol.ts';
import { NotFoundError } from './hub.ts';
import type { M08 } from './knowledge/m08.ts';
import type { Library } from './knowledge/m07.ts';
import type { Originals } from './knowledge/m07-originals.ts';
import type { SourceReports } from './knowledge/m07-reports.ts';
import { isNotFound } from './log/session-log.ts';
import { BadRequestError } from './studium.ts';

export interface SourcesDeps {
  library: Library;
  originals: Originals;
  m08: M08;
  reports: SourceReports;
  now?: () => Date;
}

/** 一次引用最多带回多少行（再多的行段只给前面这些，界面可再按行段读小节）。 */
const MAX_CITED_LINES = 60;
/** 一次最多读多少行（界面整节显示用）。 */
const MAX_SECTION_LINES = 5000;

export class Sources {
  private readonly now: () => Date;

  constructor(private readonly d: SourcesDeps) {
    this.now = d.now ?? (() => new Date());
  }

  // ───────────── 浏览 ─────────────

  async books(): Promise<BooksResponse> {
    const books = [];
    for (const b of await this.d.library.summaries()) {
      books.push({ ...b, hasOriginal: await this.d.originals.hasOriginal(b.id) });
    }
    return { books };
  }

  async toc(book: string): Promise<TocResponse> {
    const id = await this.book(book);
    return {
      book: id,
      title: await this.d.library.title(id),
      entries: await this.d.library.toc(id),
    };
  }

  async section(book: string, file: string, from?: number, to?: number): Promise<SectionResponse> {
    const id = await this.book(book);
    const lo = from ?? 1;
    const hi = to ?? lo + MAX_SECTION_LINES - 1;
    if (!Number.isInteger(lo) || !Number.isInteger(hi) || lo < 1 || hi < lo) {
      throw new BadRequestError('from / to 要是正整数，且 to 不小于 from');
    }
    const r = await this.readLines(id, file, lo, Math.min(hi, lo + MAX_SECTION_LINES - 1));
    const entry = await this.d.library.entryOf(id, file);
    const near = await this.d.library.neighbors(id, file);
    return {
      book: id,
      bookTitle: await this.d.library.title(id),
      file,
      ...(entry ? { entry } : {}),
      totalLines: r.total,
      from: r.from,
      to: r.to,
      lines: r.lines,
      ...near,
    };
  }

  async search(q: string, book?: string, limit?: number): Promise<LibrarySearchResponse> {
    if (q.trim() === '') throw new BadRequestError('q 不能为空');
    const id = book !== undefined && book !== '' ? await this.book(book) : undefined;
    const r = await this.d.library.search(q, {
      ...(id !== undefined ? { book: id } : {}),
      ...(limit !== undefined ? { limit } : {}),
    });
    return { query: q, hits: r.hits, total: r.total };
  }

  // ───────────── 原件 ─────────────

  async page(book: string, page: number): Promise<PageResponse> {
    const id = await this.book(book);
    this.checkPage(page);
    const canRender = await this.d.originals.canRender();
    const where = await this.d.originals.locatePdf(id, page);
    const anchors: PageAnchor[] = [];
    for (const p of this.d.m08.points.values()) {
      for (const a of p.anchors) {
        if (a.book === id && a.page === page) {
          anchors.push({
            pointId: p.id,
            pointName: p.name,
            quote: a.quote,
            ...(isBBox(a.bbox) ? { bbox: a.bbox } : {}),
          });
        }
      }
    }
    return {
      book: id,
      page,
      available: where !== undefined,
      canRender,
      ...(where !== undefined && canRender
        ? {
            imageUrl: `/api/library/page/image?book=${encodeURIComponent(id)}&page=${String(page)}`,
          }
        : {}),
      blocks: where !== undefined ? await this.d.originals.blocks(id, page) : [],
      anchors,
      ...(where === undefined
        ? { note: '这本书没有 PDF 原件（或这一页不在已转换的页段里），只能看转录的文字。' }
        : !canRender
          ? { note: '本机没有 pdftoppm，渲染不了原件页面。' }
          : {}),
    };
  }

  /** 原件页面的 PNG；bbox 给了只取那一块。 */
  async image(book: string, page: number, bbox?: BBox): Promise<Buffer> {
    const id = await this.book(book);
    this.checkPage(page);
    return this.d.originals.render(id, page, bbox);
  }

  async locate(book: string, file: string, from: number, to: number): Promise<LocateResponse> {
    const id = await this.book(book);
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < from) {
      throw new BadRequestError('from / to 要是正整数，且 to 不小于 from');
    }
    const r = await this.readLines(id, file, from, Math.min(to, from + MAX_CITED_LINES - 1));
    const entry = await this.d.library.entryOf(id, file);
    return {
      book: id,
      file,
      locations: await this.d.originals.locate(id, r.lines, entry?.pdfPages),
    };
  }

  // ───────────── 出处 ─────────────

  /** 解析文本里的教材出处标记并核对；对不上的标 resolved:false（不编）。 */
  async citations(text: string): Promise<CitationView[]> {
    const out: CitationView[] = [];
    for (const c of parseCitations(text)) {
      out.push({ ...(await this.cite(c)), raw: c.raw, start: c.start, end: c.end });
    }
    return out;
  }

  /** 选择卡出处里的“书名/文件:行号”回查成原文；认不出（没有书名、没有这本书）返回空。 */
  async bookLine(raw: string): Promise<CitationView | undefined> {
    const ref = parseBookLineRef(raw, await this.d.library.books());
    return ref ? { ...(await this.cite(ref)), raw, start: 0, end: raw.length } : undefined;
  }

  private async cite(ref: CitationRef): Promise<CitationView> {
    const base = { book: ref.book, file: ref.file, from: ref.from, to: ref.to };
    const id = await this.findBook(ref.book);
    if (id === undefined) {
      return view(base, { problem: `书库里没有这本书：${ref.book}` });
    }
    let total: number;
    let lines;
    try {
      const r = await this.readLines(
        id,
        ref.file,
        ref.from,
        Math.min(ref.to, ref.from + MAX_CITED_LINES - 1),
      );
      total = r.total;
      lines = r.lines;
    } catch (err) {
      if (err instanceof NotFoundError)
        return view({ ...base, book: id }, { problem: `这本书里没有这个文件：${ref.file}` });
      throw err;
    }
    const b = { ...base, book: id };
    if (ref.from > total) return view(b, { problem: `行号超出文件末尾（共 ${String(total)} 行）` });
    const entry = await this.d.library.entryOf(id, ref.file);
    const loc = (await this.d.originals.hasOriginal(id))
      ? (await this.d.originals.locate(id, lines.slice(0, 8), entry?.pdfPages))[0]
      : undefined;
    return view(b, {
      resolved: true,
      bookTitle: await this.d.library.title(id),
      ...(entry ? { section: `${entry.num} ${entry.title}`.trim() } : {}),
      ...(entry?.pages !== undefined ? { pages: entry.pages } : {}),
      ...(entry?.pdfPages !== undefined ? { pdfPages: entry.pdfPages } : {}),
      lines,
      ...(loc ? { location: loc } : {}),
    });
  }

  // ───────────── 资料报错 ─────────────

  async report(req: Partial<SourceReportRequest>): Promise<SourceReport> {
    if (typeof req.book !== 'string' || typeof req.file !== 'string') {
      throw new BadRequestError('book 与 file 要是字符串');
    }
    if (typeof req.from !== 'number' || !Number.isInteger(req.from) || req.from < 1) {
      throw new BadRequestError('from 要是正整数');
    }
    const to = req.to ?? req.from;
    if (typeof to !== 'number' || !Number.isInteger(to) || to < req.from) {
      throw new BadRequestError('to 要是不小于 from 的整数');
    }
    if (typeof req.text !== 'string' || req.text.trim() === '') {
      throw new BadRequestError('text 不能为空：说一下哪里不对');
    }
    const kind: SourceReportKind = req.kind ?? '其他';
    if (!SOURCE_REPORT_KINDS.includes(kind)) {
      throw new BadRequestError(`kind 要是 ${SOURCE_REPORT_KINDS.join(' / ')} 之一`);
    }
    const id = await this.book(req.book);
    const r = await this.readLines(
      id,
      req.file,
      req.from,
      Math.min(to, req.from + MAX_CITED_LINES - 1),
    );
    if (r.lines.length === 0)
      throw new BadRequestError(`行号超出文件末尾（共 ${String(r.total)} 行）`);
    const report: SourceReport = {
      id: `sr-${randomBytes(4).toString('hex')}`,
      at: this.now().toISOString(),
      book: id,
      file: req.file,
      from: req.from,
      to,
      kind,
      text: req.text.trim(),
      quote: r.lines
        .map((l) => l.text)
        .join('\n')
        .slice(0, 2000),
      ...(typeof req.page === 'number' && Number.isInteger(req.page) ? { page: req.page } : {}),
      status: 'open',
    };
    await this.d.reports.add(report);
    return report;
  }

  reports(filter: { book?: string; file?: string } = {}): SourceReport[] {
    return this.d.reports.list(filter);
  }

  // ───────────── 内部 ─────────────

  /** 书名 → 书库里的书目录名；先精确匹配，再忽略首尾空白（真书库里有名字带尾空格的）。 */
  private async findBook(name: string): Promise<string | undefined> {
    const books = await this.d.library.books();
    return books.includes(name) ? name : books.find((b) => b.trim() === name.trim());
  }

  private async book(name: string): Promise<string> {
    const id = await this.findBook(name);
    if (id === undefined) throw new NotFoundError(`书库里没有这本书：${name}`);
    return id;
  }

  private async readLines(book: string, file: string, from: number, to: number) {
    try {
      return await this.d.library.lines(book, file, from, to);
    } catch (err) {
      if (isNotFound(err)) throw new NotFoundError(`这本书里没有这个文件：${file}`);
      if (err instanceof Error && err.message.startsWith('路径越界')) {
        throw new BadRequestError(err.message);
      }
      throw err;
    }
  }

  private checkPage(page: number): void {
    if (!Number.isInteger(page) || page < 1)
      throw new BadRequestError('page 要是正整数（PDF 页，1 起）');
  }
}

function view(
  base: { book: string; file: string; from: number; to: number },
  rest: Partial<CitationView> & { problem?: string },
): CitationView {
  return { raw: '', start: 0, end: 0, ...base, resolved: false, ...rest };
}

function isBBox(b: unknown): b is BBox {
  return Array.isArray(b) && b.length === 4 && b.every((v) => typeof v === 'number');
}
