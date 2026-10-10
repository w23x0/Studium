// M07 的原件：书的 PDF 原件页面（渲染成图）与页面上的内容块位置（MinerU content_list）。只读书库；渲染出的图缓存在数据目录。
// 原件从哪找：<书>/source.json 列出页段（p1-200 …，每段目录里有 MinerU 留的 *_origin.pdf 与 *_content_list.json，
// 页码 = first_page + page_idx）；没有 source.json 就按 p<起>-<止> 目录名认；都没有再看整本 PDF（source.json 的 file 字段）。
// 页码一律是原 PDF 页（1 起），与 M08 锚点的 page、M07 目录的“PDF 页”同一套。
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rename, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import type { BBox, LineLocation, PageBlock } from '../../shared/protocol.ts';
import { isNotFound } from '../log/session-log.ts';
import type { Library } from './m07.ts';

const run = promisify(execFile);

/** 渲染分辨率：整页约 900 像素宽（教材页约 7.4 英寸），够看公式又不大。 */
const DPI = 110;

interface Segment {
  first: number;
  last: number;
  dir: string;
  pdf: string;
}

interface Block {
  page: number;
  type: string;
  bbox: BBox;
  /** 块里的字（原样，供界面看）。 */
  text: string;
  /** 比对用的规整字。 */
  norm: string;
}

const BLOCK_FIELDS = [
  'text',
  'list_items',
  'code_body',
  'table_body',
  'image_caption',
  'table_caption',
  'code_caption',
  'chart_caption',
  'image_footnote',
  'table_footnote',
  'chart_footnote',
];

export class Originals {
  private readonly segs = new Map<string, Promise<Segment[]>>();
  private readonly blockCache = new Map<string, Promise<Block[]>>();
  private readonly inflight = new Map<string, Promise<string>>();
  private tool: Promise<boolean> | undefined;

  constructor(
    private readonly lib: Library,
    /** 渲染图的缓存目录（派生数据，删了会重新渲染）。 */
    private readonly cacheDir: string,
  ) {}

  /** 本机能不能渲染（有没有 pdftoppm）。 */
  canRender(): Promise<boolean> {
    this.tool ??= run('pdftoppm', ['-v']).then(
      () => true,
      (err: unknown) => {
        // 找不到命令 = 不能渲染；命令在、只是 -v 以非 0 退出（个别版本如此）= 能渲染
        return (err as NodeJS.ErrnoException).code !== 'ENOENT';
      },
    );
    return this.tool;
  }

  async hasOriginal(book: string): Promise<boolean> {
    return (await this.segments(book)).length > 0;
  }

  /** 这一页在哪个文件的第几页；找不到返回空。 */
  async locatePdf(book: string, page: number): Promise<{ pdf: string; index: number } | undefined> {
    if (!Number.isInteger(page) || page < 1) return undefined;
    const seg = (await this.segments(book)).find((s) => page >= s.first && page <= s.last);
    return seg ? { pdf: seg.pdf, index: page - seg.first + 1 } : undefined;
  }

  /** 原件页面（PNG）。bbox 给了就只取这一块（千分比）。 */
  async render(book: string, page: number, bbox?: BBox): Promise<Buffer> {
    const where = await this.locatePdf(book, page);
    if (!where) throw new NoOriginalError(`${book} 第 ${String(page)} 页没有 PDF 原件`);
    if (!(await this.canRender())) {
      throw new NoRendererError('本机没有 pdftoppm（poppler-utils），渲染不了原件页面');
    }
    const key = createHash('sha1')
      .update(`${book}\0${String(page)}`)
      .digest('hex')
      .slice(0, 16);
    const full = await this.cached(`${key}-r${String(DPI)}`, (out) =>
      this.pdftoppm(where.pdf, where.index, out, []),
    );
    if (bbox === undefined) return readFile(full);
    const { w, h } = pngSize(await readFile(full));
    const [x0, y0, x1, y1] = bbox.map((v) => Math.min(Math.max(v, 0), 1000)) as BBox;
    const x = Math.floor((x0 / 1000) * w);
    const y = Math.floor((y0 / 1000) * h);
    const cw = Math.max(1, Math.ceil(((x1 - x0) / 1000) * w));
    const ch = Math.max(1, Math.ceil(((y1 - y0) / 1000) * h));
    const part = await this.cached(`${key}-r${String(DPI)}-${[x, y, cw, ch].join('_')}`, (out) =>
      this.pdftoppm(where.pdf, where.index, out, [
        '-x',
        String(x),
        '-y',
        String(y),
        '-W',
        String(cw),
        '-H',
        String(ch),
      ]),
    );
    return readFile(part);
  }

  /** 这一页上的内容块（有 content_list 才有）。 */
  async blocks(book: string, page: number): Promise<PageBlock[]> {
    const seg = (await this.segments(book)).find((s) => page >= s.first && page <= s.last);
    if (!seg) return [];
    return (await this.segmentBlocks(seg))
      .filter((b) => b.page === page)
      .map((b) => ({ type: b.type, bbox: b.bbox, text: b.text.slice(0, 200) }));
  }

  /**
   * 小节文件里的行在原件上的位置：把行的文字（规整后）对到 content_list 块的字。
   * pages 给了就只在这个范围（前后各宽一页）里找；对不上的行不返回。
   */
  async locate(
    book: string,
    lines: { n: number; text: string }[],
    pages?: { from: number; to: number },
  ): Promise<LineLocation[]> {
    const all: Block[] = [];
    for (const seg of await this.segments(book)) {
      if (pages && (seg.last < pages.from - 1 || seg.first > pages.to + 1)) continue;
      all.push(...(await this.segmentBlocks(seg)));
    }
    const cand = pages
      ? all.filter((b) => b.page >= pages.from - 1 && b.page <= pages.to + 1)
      : all;
    const out: LineLocation[] = [];
    for (const l of lines) {
      const t = norm(l.text);
      if (t.length < 12) continue; // 太短会撞上别的块
      const hit = findBlock(cand, t);
      if (hit) out.push({ line: l.n, page: hit.page, bbox: hit.bbox });
    }
    return out;
  }

  // ───────────── 内部 ─────────────

  private async cached(key: string, make: (outPrefix: string) => Promise<void>): Promise<string> {
    const file = join(this.cacheDir, `${key}.png`);
    try {
      await stat(file);
      return file;
    } catch (err) {
      if (!isNotFound(err)) throw err;
    }
    const pending = this.inflight.get(file);
    if (pending) return pending;
    const p = (async () => {
      await mkdir(this.cacheDir, { recursive: true });
      const tmp = join(this.cacheDir, `${key}.tmp-${String(process.pid)}-${String(Date.now())}`);
      await make(tmp);
      await rename(`${tmp}.png`, file);
      return file;
    })().finally(() => this.inflight.delete(file));
    this.inflight.set(file, p);
    return p;
  }

  private async pdftoppm(pdf: string, index: number, outPrefix: string, extra: string[]) {
    await run('pdftoppm', [
      '-f',
      String(index),
      '-l',
      String(index),
      '-r',
      String(DPI),
      '-png',
      '-singlefile',
      ...extra,
      pdf,
      outPrefix,
    ]);
  }

  private segments(book: string): Promise<Segment[]> {
    let p = this.segs.get(book);
    if (!p) {
      p = this.findSegments(book);
      this.segs.set(book, p);
    }
    return p;
  }

  private async findSegments(book: string): Promise<Segment[]> {
    const dir = this.lib.bookDir(book);
    const out: Segment[] = [];
    let source: {
      file?: string;
      parts?: Record<string, { page_ranges?: string; first_page?: number }>;
    } = {};
    try {
      source = JSON.parse(await readFile(join(dir, 'source.json'), 'utf8')) as typeof source;
    } catch (err) {
      if (!isNotFound(err)) throw err;
    }
    const parts: { name: string; first: number; last?: number }[] = [];
    for (const [name, info] of Object.entries(source.parts ?? {})) {
      const nums = (info.page_ranges ?? '').match(/\d+/g)?.map(Number) ?? [];
      const first = info.first_page ?? nums[0];
      if (first === undefined) continue;
      parts.push({ name, first, ...(nums.length > 0 ? { last: nums[nums.length - 1] } : {}) });
    }
    if (parts.length === 0) {
      for (const e of await readdir(dir, { withFileTypes: true })) {
        const m = /^p(\d+)-(\d+)$/.exec(e.name);
        if ((e.isDirectory() || e.isSymbolicLink()) && m?.[1] && m[2]) {
          parts.push({ name: e.name, first: Number(m[1]), last: Number(m[2]) });
        }
      }
    }
    for (const p of parts) {
      const sub = join(dir, p.name);
      let pdf: string | undefined;
      try {
        pdf = (await readdir(sub)).find((f) => f.endsWith('_origin.pdf'));
      } catch (err) {
        if (!isNotFound(err)) throw err;
      }
      if (pdf === undefined) continue;
      out.push({ first: p.first, last: p.last ?? p.first + 9999, dir: sub, pdf: join(sub, pdf) });
    }
    if (out.length > 0) return out.sort((a, b) => a.first - b.first);
    // 没有页段：整本 PDF（页码 = 文件页码）
    if (source.file !== undefined) {
      for (const cand of [join(dir, source.file), join(dir, '..', source.file)]) {
        try {
          await stat(cand);
          return [{ first: 1, last: 99999, dir, pdf: cand }];
        } catch (err) {
          if (!isNotFound(err)) throw err;
        }
      }
    }
    return [];
  }

  private segmentBlocks(seg: Segment): Promise<Block[]> {
    let p = this.blockCache.get(seg.dir);
    if (!p) {
      p = this.readBlocks(seg);
      this.blockCache.set(seg.dir, p);
    }
    return p;
  }

  private async readBlocks(seg: Segment): Promise<Block[]> {
    const file = (await readdir(seg.dir)).find(
      (f) => f.endsWith('_content_list.json') && !f.endsWith('_v2.json'),
    );
    if (file === undefined) return [];
    const raw = JSON.parse(await readFile(join(seg.dir, file), 'utf8')) as Record<
      string,
      unknown
    >[];
    const out: Block[] = [];
    for (const x of raw) {
      const box = x.bbox;
      if (!Array.isArray(box) || box.length !== 4 || !box.every((v) => typeof v === 'number'))
        continue;
      const text = BLOCK_FIELDS.flatMap((k) => {
        const v = x[k];
        return Array.isArray(v) ? v.map(String) : typeof v === 'string' && v !== '' ? [v] : [];
      })
        .filter((s) => s !== '')
        .join('\n');
      const idx = typeof x.page_idx === 'number' ? x.page_idx : 0;
      out.push({
        page: seg.first + idx,
        type: typeof x.type === 'string' ? x.type : '',
        bbox: box as BBox,
        text,
        norm: norm(text),
      });
    }
    return out;
  }
}

export class NoOriginalError extends Error {}
export class NoRendererError extends Error {}

/** 比对用：去标签、LaTeX 命令名、$ {} ^ _ \ 引号与空白，忽略大小写（与书库处理/ 的 M08 回扫同一套）。 */
export function norm(t: string): string {
  return t
    .replace(/<[^>]+>/g, '')
    .replace(/\\(begin|end)\{[^}]*\}/g, '')
    .replace(/\\[A-Za-z]+/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[\s${}^_\\“”"‘’'`*·~]/g, '')
    .toLowerCase()
    .replace(/ff/g, 'f')
    .replace(/ll/g, 'l')
    .replace(/[.,;:]+$/, '');
}

function findBlock(cand: Block[], t: string): Block | undefined {
  for (const head of t.length > 20 ? [t.slice(0, 40), t.slice(0, 20)] : [t]) {
    const hit = cand.find((b) => b.norm.includes(head));
    if (hit) return hit;
  }
  return undefined;
}

function pngSize(buf: Buffer): { w: number; h: number } {
  if (buf.length < 24 || buf.toString('ascii', 1, 4) !== 'PNG') throw new Error('渲染结果不是 PNG');
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}
