// 原文与出处（批 2a）：把资料的文件清单、正文、全文检索、出处标记整理成界面和模型能直接用的视图。只读资料。
import { parseCitations, type CitationRef } from '../shared/citation.ts';
import type {
  MaterialListResponse,
  CitationView,
  SourceSearchResponse,
  SectionResponse,
  TocResponse,
} from '../shared/protocol.ts';
import { NotFoundError } from './hub.ts';
import type { SourceReader } from './knowledge/materials.ts';
import { isNotFound } from './log/session-log.ts';
import { BadRequestError } from './studium.ts';

/** 一次引用最多带回多少行（再多的行段只给前面这些，界面可再按行段读文件）。 */
const MAX_CITED_LINES = 60;
/** 一次最多读多少行（界面整个文件显示用）。 */
const MAX_SECTION_LINES = 5000;

export class Sources {
  constructor(private readonly materialsReader: SourceReader) {}

  // ───────────── 浏览 ─────────────

  async materials(): Promise<MaterialListResponse> {
    return { materials: await this.materialsReader.summaries() };
  }

  async toc(material: string): Promise<TocResponse> {
    const id = await this.require(material);
    return {
      material: id,
      title: await this.materialsReader.title(id),
      entries: await this.materialsReader.toc(id),
    };
  }

  async section(
    material: string,
    file: string,
    from?: number,
    to?: number,
  ): Promise<SectionResponse> {
    const id = await this.require(material);
    const lo = from ?? 1;
    const hi = to ?? lo + MAX_SECTION_LINES - 1;
    if (!Number.isInteger(lo) || !Number.isInteger(hi) || lo < 1 || hi < lo) {
      throw new BadRequestError('from / to 要是正整数，且 to 不小于 from');
    }
    const r = await this.readLines(id, file, lo, Math.min(hi, lo + MAX_SECTION_LINES - 1));
    return {
      material: id,
      materialTitle: await this.materialsReader.title(id),
      file,
      totalLines: r.total,
      from: r.from,
      to: r.to,
      lines: r.lines,
    };
  }

  /** materials = 只在这几份里搜（本项目能读的）；给了 material 时以 material 为准。 */
  async search(
    q: string,
    material?: string,
    limit?: number,
    materials?: string[],
  ): Promise<SourceSearchResponse> {
    if (q.trim() === '') throw new BadRequestError('q 不能为空');
    const id = material !== undefined && material !== '' ? await this.require(material) : undefined;
    const r = await this.materialsReader.search(q, {
      ...(id !== undefined ? { material: id } : materials !== undefined ? { materials } : {}),
      ...(limit !== undefined ? { limit } : {}),
    });
    return { query: q, hits: r.hits, total: r.total };
  }

  // ───────────── 出处 ─────────────

  /** 解析文本里的资料出处标记并核对；对不上的标 resolved:false（不编）。 */
  async citations(text: string): Promise<CitationView[]> {
    const out: CitationView[] = [];
    for (const c of parseCitations(text)) {
      out.push({ ...(await this.cite(c)), raw: c.raw, start: c.start, end: c.end });
    }
    return out;
  }

  private async cite(ref: CitationRef): Promise<CitationView> {
    const base = { material: ref.material, file: ref.file, from: ref.from, to: ref.to };
    const id = await this.find(ref.material);
    if (id === undefined) {
      return view(base, { problem: `没有这份资料：${ref.material}` });
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
        return view({ ...base, material: id }, { problem: `这份资料里没有这个文件：${ref.file}` });
      throw err;
    }
    const b = { ...base, material: id };
    if (ref.from < 1) return view(b, { problem: '行号从 1 数' });
    if (ref.from > total) return view(b, { problem: `行号超出文件末尾（共 ${String(total)} 行）` });
    return view(b, {
      resolved: true,
      materialTitle: await this.materialsReader.title(id),
      lines,
    });
  }

  // ───────────── 内部 ─────────────

  /** 资料 id；先精确匹配，再忽略首尾空白。 */
  private async find(name: string): Promise<string | undefined> {
    const ids = await this.materialsReader.ids();
    return ids.includes(name) ? name : ids.find((b) => b.trim() === name.trim());
  }

  private async require(name: string): Promise<string> {
    const id = await this.find(name);
    if (id === undefined) throw new NotFoundError(`没有这份资料：${name}`);
    return id;
  }

  private async readLines(material: string, file: string, from: number, to: number) {
    try {
      return await this.materialsReader.lines(material, file, from, to);
    } catch (err) {
      if (isNotFound(err)) throw new NotFoundError(`这份资料里没有这个文件：${file}`);
      if (err instanceof Error && err.message.startsWith('路径越界')) {
        throw new BadRequestError(err.message);
      }
      throw err;
    }
  }
}

function view(
  base: { material: string; file: string; from: number; to: number },
  rest: Partial<CitationView> & { problem?: string },
): CitationView {
  return { raw: '', start: 0, end: 0, ...base, resolved: false, ...rest };
}
