// 项目资料（工单 W8；设计 docs/设计/记录/资料.md）：资料归项目，每份处理成
// md 正文 + 指回原件的位置 + 固定版本 + 来源与日期。存在 <数据>/projects/<主对话 id>/资料/<资料 id>/：
//   source.json · 原件/（原样保留）· 正文/（md；仓库 = 固定提交的工作树，代码原样）·
//   mineru/（PDF 的 MinerU 转换产物：每段页码一个 p<起>-<止>/，原件页面从这里找）。
// 原文、出处、沙盒、原件页面都经它读。不存摘要、路线、标签。
import { execFile } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { constants } from 'node:fs';
import {
  access,
  cp,
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { basename, dirname, extname, join, normalize, relative } from 'node:path';
import { promisify } from 'node:util';
import type {
  AddMaterialRequest,
  BookSummary,
  MaterialKind,
  MaterialSource,
  NumberedLine,
  TocEntry,
} from '../../shared/protocol.ts';
import { MATERIAL_KINDS } from '../../shared/protocol.ts';
import { isNotFound } from '../log/session-log.ts';
import {
  searchSets,
  splitLines,
  type IndexedFile,
  type SearchOptions,
  type SearchResult,
  type SearchSet,
} from './search.ts';

const run = promisify(execFile);

/** 读原文的接口（原文、出处、原件页面、来源说明、产出共用）。 */
export type SourceReader = Pick<
  Materials,
  | 'books'
  | 'source'
  | 'summaries'
  | 'index'
  | 'read'
  | 'lines'
  | 'title'
  | 'toc'
  | 'entryOf'
  | 'neighbors'
  | 'search'
  | 'pagesDir'
>;

/** 资料目录里的子目录名。 */
const SOURCE_FILE = 'source.json';
const ORIGINAL_DIR = '原件';
const BODY_DIR = '正文';
/** MinerU 的输出目录（和 source.json 分开，转换途中不会盖掉它）。 */
const MINERU_DIR = 'mineru';
/** 扫描缓存多久（毫秒）。 */
const SCAN_TTL_MS = 2000;
/** 没有目录表（index.md）的资料：按文件树列，最多列这么多个文件。 */
const MAX_FILES = 3000;
/** 单个文件超过这么大不当正文读（检索、目录都跳过）。 */
const MAX_FILE_BYTES = 2_000_000;
/** 文件树里不往下走的目录。 */
const SKIP_TREE = /^(\.git|node_modules|__pycache__|\.venv|venv|dist|build|target)$/;
/** 外部命令（git、MinerU）最多跑多久。 */
const COMMAND_TIMEOUT_MS = 30 * 60_000;
/** 抓网页最多等多久。 */
const FETCH_TIMEOUT_MS = 60_000;

interface Entry {
  id: string;
  main: string;
  dir: string;
  src: MaterialSource;
}

interface Loaded {
  title: string;
  entries: TocEntry[];
  files?: IndexedFile[];
}

export interface MaterialsOptions {
  /** <数据>/projects。 */
  root: string;
  now?: () => Date;
  /** `书库处理/` 目录（PDF 走它的 MinerU 转换）；不给 = PDF 转不了，标失败。 */
  pdfTool?: string;
}

export class Materials {
  private scanned: { at: number; map: Map<string, Entry> } | undefined;
  private readonly loaded = new Map<string, Loaded>();
  private readonly pending = new Map<string, Promise<void>>();
  private readonly now: () => Date;

  constructor(private readonly o: MaterialsOptions) {
    this.now = o.now ?? (() => new Date());
  }

  // ───────────── 项目资料区 ─────────────

  /** 一个项目的资料目录：<数据>/projects/<主对话 id>/资料/。 */
  projectDir(mainId: string): string {
    if (mainId === '' || mainId.includes('/') || mainId.includes('..')) {
      throw new Error(`项目 id 不对：${mainId}`);
    }
    return join(this.o.root, mainId, '资料');
  }

  /** 这份资料的 source.json；不是项目资料返回空。 */
  async source(id: string): Promise<(MaterialSource & { main: string }) | undefined> {
    const e = await this.entry(id);
    return e !== undefined ? { ...e.src, main: e.main } : undefined;
  }

  /** 一个项目里建好的资料（含处理中、失败的），按 id。 */
  async ofProject(mainId: string): Promise<MaterialSource[]> {
    return [...(await this.scan()).values()]
      .filter((e) => e.main === mainId)
      .map((e) => e.src)
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  /** 处理完了没有（等后台转换；测试与入口界面用）。 */
  async settled(id: string): Promise<void> {
    await this.pending.get(id);
  }

  /**
   * 在项目里建一份资料：先写 source.json（处理中），转换在后台跑，跑完改状态。
   * 返回建好时的 source.json；调用方随后在主对话里记 project_material。
   */
  async add(mainId: string, req: AddMaterialRequest): Promise<MaterialSource> {
    if (!(MATERIAL_KINDS as readonly string[]).includes(req.kind)) {
      throw new MaterialError(`kind 要是 ${MATERIAL_KINDS.join(' / ')} 之一`);
    }
    const origin = req.origin.trim();
    if (origin === '') throw new MaterialError('origin 不能为空：给路径、网址或仓库地址');
    const title = req.title?.trim() || guessTitle(req.kind, origin);
    const id = await this.freshId(title);
    const dir = join(this.projectDir(mainId), id);
    await mkdir(dir, { recursive: true });
    const src: MaterialSource = {
      id,
      title,
      kind: req.kind,
      origin,
      version: '',
      fetchedAt: this.now().toISOString(),
      status: '处理中',
    };
    await this.write(dir, src);
    this.run(dir, src, req);
    return src;
  }

  /** 在后台处理；失败写进 source.json（状态“失败”带原因），不伪装可用。 */
  private run(dir: string, src: MaterialSource, req: AddMaterialRequest): void {
    const job = this.process(dir, src, req)
      .catch(async (err: unknown) => {
        await this.write(dir, {
          ...src,
          status: '失败',
          problems: [err instanceof Error ? err.message : String(err)],
        });
      })
      .finally(() => {
        this.pending.delete(src.id);
        this.invalidate(src.id);
      });
    this.pending.set(src.id, job);
  }

  /**
   * 重试一份失败 / 有问题的资料（工单 W9 §4.4）：清掉上次的产物（原件、正文、按页段的转换结果），
   * 按原来的来源再处理一遍。处理中的不重试。
   */
  async retry(id: string): Promise<MaterialSource> {
    const e = await this.entry(id);
    if (e === undefined) throw new MaterialError(`没有这份资料：${id}`);
    if (e.src.status === '处理中') throw new MaterialError('这份还在处理，等它跑完再说');
    for (const name of await readdir(e.dir)) {
      if (name !== SOURCE_FILE) await rm(join(e.dir, name), { recursive: true, force: true });
    }
    const src: MaterialSource = { ...e.src, status: '处理中', fetchedAt: this.now().toISOString() };
    delete src.problems;
    delete src.converter;
    await this.write(e.dir, src);
    this.run(e.dir, src, { kind: src.kind, origin: src.origin, title: src.title });
    return src;
  }

  /**
   * 从别的项目拿一份（工单 W9 §4.1）：整份目录复制进本项目、换新 id，记 copiedFrom。处理中的不拿。
   */
  async copy(id: string, toMain: string): Promise<MaterialSource> {
    const e = await this.entry(id);
    if (e === undefined) throw new MaterialError(`没有这份资料：${id}`);
    if (e.src.status === '处理中') throw new MaterialError('这份还在处理，等它跑完再拿');
    const newId = await this.freshId(e.src.title);
    const dir = join(this.projectDir(toMain), newId);
    await mkdir(dirname(dir), { recursive: true });
    await cp(e.dir, dir, { recursive: true });
    const src: MaterialSource = {
      ...e.src,
      id: newId,
      copiedFrom: { project: e.main, material: e.id },
    };
    delete src.role; // 角色是在原项目里判的，这里重新判
    await this.write(dir, src);
    return src;
  }

  /** 模型判断的角色（主资料 / 参考资料）写进 source.json；同值不重写。 */
  async setRole(id: string, value: '主资料' | '参考资料', sessionId: string): Promise<boolean> {
    const e = await this.entry(id);
    if (e === undefined) return false;
    if (e.src.role?.value === value) return true;
    await this.write(e.dir, {
      ...e.src,
      role: { value, by: 'model', at: this.now().toISOString(), sessionId },
    });
    return true;
  }

  // ───────────── 读 ─────────────

  /** 能读的 id：各项目的资料。 */
  async books(): Promise<string[]> {
    return [...(await this.scan()).keys()].sort();
  }

  /** 资料浏览的列表：各项目的资料都列。 */
  async summaries(): Promise<Omit<BookSummary, 'hasOriginal'>[]> {
    const out: Omit<BookSummary, 'hasOriginal'>[] = [];
    for (const e of (await this.scan()).values()) {
      const sections =
        e.src.status === '可用' || e.src.status === '部分可用'
          ? (await this.load(e.id)).entries.filter((x) => x.file !== undefined).length
          : 0;
      out.push({ id: e.id, title: e.src.title, sections, kind: e.src.kind, source: e.src.origin });
    }
    return out.sort((a, b) => a.id.localeCompare(b.id));
  }

  async index(id: string): Promise<string> {
    const e = await this.require(id);
    const l = await this.load(id);
    const head = [
      `# 资料：${e.src.title}`,
      '',
      `种类 ${e.src.kind} · 版本 ${e.src.version || '—'} · 日期 ${e.src.fetchedAt.slice(0, 10)} · 状态 ${e.src.status}${e.src.role !== undefined ? ` · ${e.src.role.value}` : ''}`,
      `来源：${e.src.origin}`,
      ...(e.src.problems !== undefined ? [`有问题：${e.src.problems.join('；')}`] : []),
      '',
      `文件（共 ${String(l.entries.length)} 个；引用写 ${id}/<文件>:<行号>）：`,
    ];
    return [...head, ...l.entries.map((x) => `- ${x.file ?? ''}`)].join('\n');
  }

  async read(id: string, file: string, from = 1, to = Number.MAX_SAFE_INTEGER): Promise<string> {
    return (await this.lines(id, file, from, to)).lines
      .map((l) => `${String(l.n)}\t${l.text}`)
      .join('\n');
  }

  async lines(
    id: string,
    file: string,
    from = 1,
    to = Number.MAX_SAFE_INTEGER,
  ): Promise<{ total: number; from: number; to: number; lines: NumberedLine[] }> {
    const all = splitLines(await readFile(await this.path(id, file), 'utf8'));
    const lo = Math.max(1, from);
    const hi = Math.min(to, all.length);
    const lines: NumberedLine[] = [];
    for (let i = lo; i <= hi; i++) lines.push({ n: i, text: all[i - 1] ?? '' });
    return { total: all.length, from: lo, to: hi, lines };
  }

  async title(id: string): Promise<string> {
    return (await this.require(id)).src.title;
  }

  async toc(id: string): Promise<TocEntry[]> {
    return (await this.load(id)).entries;
  }

  async entryOf(id: string, file: string): Promise<TocEntry | undefined> {
    const f = normalize(file);
    return (await this.load(id)).entries.find(
      (e) => e.file !== undefined && normalize(e.file) === f,
    );
  }

  async neighbors(id: string, file: string): Promise<{ prev?: TocEntry; next?: TocEntry }> {
    const withFile = (await this.load(id)).entries.filter((e) => e.file !== undefined);
    const f = normalize(file);
    const i = withFile.findIndex((e) => e.file !== undefined && normalize(e.file) === f);
    if (i < 0) return {};
    const prev = withFile[i - 1];
    const next = withFile[i + 1];
    return { ...(prev ? { prev } : {}), ...(next ? { next } : {}) };
  }

  /** 全文检索；不给 book / books = 搜各项目的资料。认不出的 id 跳过。 */
  async search(query: string, opt: SearchOptions = {}): Promise<SearchResult> {
    const ids =
      opt.book !== undefined ? [opt.book] : (opt.books ?? [...(await this.scan()).keys()]);
    const sets: SearchSet[] = [];
    for (const id of ids) {
      if ((await this.entry(id)) === undefined) continue;
      const l = await this.load(id);
      sets.push({ book: id, title: l.title, files: await this.files(id) });
    }
    return searchSets(sets, query, opt);
  }

  /** PDF 页段所在的目录（MinerU 输出；原件页面从这里找）；不是 PDF 的资料没有这个目录。 */
  async pagesDir(id: string): Promise<string> {
    return join((await this.require(id)).dir, MINERU_DIR);
  }

  /** 正文目录（沙盒只读区挂这个）。 */
  async bodyDir(id: string): Promise<string> {
    return join((await this.require(id)).dir, BODY_DIR);
  }

  // ───────────── 内部：扫描与读 ─────────────

  private invalidate(id?: string): void {
    this.scanned = undefined;
    if (id !== undefined) this.loaded.delete(id);
  }

  private async entry(id: string): Promise<Entry | undefined> {
    const hit = (await this.scan()).get(id);
    if (hit !== undefined) return hit;
    return (await this.scan(true)).get(id);
  }

  /** 认不出的 id 报“没有”（读的人按找不到处理）。 */
  private async require(id: string): Promise<Entry> {
    const e = await this.entry(id);
    if (e === undefined) throw notFound(`没有这份资料：${id}`);
    return e;
  }

  private async scan(fresh = false): Promise<Map<string, Entry>> {
    const now = Date.now();
    if (!fresh && this.scanned && now - this.scanned.at < SCAN_TTL_MS) return this.scanned.map;
    const map = new Map<string, Entry>();
    for (const main of await dirs(this.o.root)) {
      const pdir = join(this.o.root, main, '资料');
      for (const id of await dirs(pdir)) {
        const dir = join(pdir, id);
        let src: MaterialSource;
        try {
          src = JSON.parse(await readFile(join(dir, SOURCE_FILE), 'utf8')) as MaterialSource;
        } catch (err) {
          if (isNotFound(err)) continue;
          throw err;
        }
        if (!map.has(src.id)) map.set(src.id, { id: src.id, main, dir, src });
      }
    }
    this.scanned = { at: now, map };
    return map;
  }

  private async load(id: string): Promise<Loaded> {
    const hit = this.loaded.get(id);
    if (hit) return hit;
    const e = await this.require(id);
    const files = e.src.status === '处理中' ? [] : await textFiles(join(e.dir, BODY_DIR));
    const l: Loaded = {
      title: e.src.title,
      entries: files.map((f, i) => {
        // PDF 按页段转出的 p<起>-<止>.md：记下原 PDF 页段（原件页面从这里起）
        const span = e.src.kind === 'pdf' ? /^p(\d+)-(\d+)\.md$/.exec(f) : null;
        return {
          num: String(i + 1),
          title: f,
          file: f,
          chapter: dirname(f) === '.' ? '' : dirname(f),
          ...(span !== null ? { pdfPages: { from: Number(span[1]), to: Number(span[2]) } } : {}),
        };
      }),
    };
    if (e.src.status !== '处理中') this.loaded.set(id, l);
    return l;
  }

  private async files(id: string): Promise<IndexedFile[]> {
    const l = await this.load(id);
    if (l.files !== undefined) return l.files;
    const files: IndexedFile[] = [];
    for (const entry of l.entries) {
      if (entry.file === undefined) continue;
      let text: string;
      try {
        text = await readFile(await this.path(id, entry.file), 'utf8');
      } catch (err) {
        if (isNotFound(err)) continue;
        throw err;
      }
      const lines = splitLines(text);
      files.push({ entry, lines, lower: lines.map((x) => x.toLowerCase()) });
    }
    l.files = files;
    return files;
  }

  private async path(id: string, file: string): Promise<string> {
    const rel = normalize(file);
    if (rel.startsWith('..') || rel.startsWith('/') || id.includes('/') || id.includes('..')) {
      throw new Error(`路径越界：${id} / ${file}`);
    }
    return join(await this.bodyDir(id), rel);
  }

  private async write(dir: string, src: MaterialSource): Promise<void> {
    const tmp = join(dir, `.${SOURCE_FILE}.${randomBytes(3).toString('hex')}`);
    await writeFile(tmp, `${JSON.stringify(src, null, 2)}\n`, 'utf8');
    await rename(tmp, join(dir, SOURCE_FILE));
    this.invalidate(src.id);
  }

  /** 新资料的 id：可读的名字，和已有的资料都不重名。 */
  private async freshId(base: string): Promise<string> {
    const clean =
      base
        .replace(/[/\\|｜】:]/g, '·')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 60) || '资料';
    const taken = new Set((await this.scan(true)).keys());
    const free = (x: string): boolean => !taken.has(x);
    if (free(clean)) return clean;
    for (let n = 2; ; n++) {
      const x = `${clean}（${String(n)}）`;
      if (free(x)) return x;
    }
  }

  // ───────────── 内部：按种类处理 ─────────────

  private async process(dir: string, src: MaterialSource, req: AddMaterialRequest): Promise<void> {
    const body = join(dir, BODY_DIR);
    const original = join(dir, ORIGINAL_DIR);
    const done = (rest: Partial<MaterialSource>): Promise<void> =>
      this.write(dir, { ...src, status: '可用', ...rest });
    switch (src.kind) {
      case 'pdf': {
        await mkdir(original, { recursive: true });
        const pdf = join(original, basename(src.origin));
        await cp(src.origin, pdf);
        const version = await hashFile(pdf);
        const problem = await this.convertPdf(pdf, dir, body);
        if (problem !== undefined) {
          return this.write(dir, { ...src, version, status: '失败', problems: [problem] });
        }
        return done({ version, converter: 'mineru' });
      }
      case 'repo': {
        await run('git', ['clone', '--quiet', src.origin, body], { timeout: COMMAND_TIMEOUT_MS });
        if (req.commit !== undefined && req.commit.trim() !== '') {
          await run('git', ['-C', body, 'checkout', '--quiet', req.commit.trim()], {
            timeout: COMMAND_TIMEOUT_MS,
          });
        }
        const head = (await run('git', ['-C', body, 'rev-parse', 'HEAD'])).stdout.trim();
        // 固定在这次提交：引用写 文件:行号，提交固定后不变
        return done({ version: head, converter: 'none' });
      }
      case 'web':
      case 'search': {
        const res = await fetch(src.origin, {
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        }).catch((e: unknown) => {
          throw new Error(
            `抓不到这个网址（网络不通、网站拒绝或超时）：${e instanceof Error ? e.message : String(e)}`,
          );
        });
        if (!res.ok) throw new Error(`抓取失败：HTTP ${String(res.status)}`);
        if ((res.headers.get('content-type') ?? '').includes('application/pdf')) {
          // 网址指向的是 PDF（找资料交回的讲义多是这样）：存原件，照新 PDF 转（工单 W9 进度页有记）
          await mkdir(original, { recursive: true });
          const name = basename(new URL(src.origin).pathname) || '原件';
          const pdf = join(original, name.toLowerCase().endsWith('.pdf') ? name : `${name}.pdf`);
          await writeFile(pdf, Buffer.from(await res.arrayBuffer()));
          const version = await hashFile(pdf);
          const problem = await this.convertPdf(pdf, dir, body);
          if (problem !== undefined) {
            return this.write(dir, { ...src, version, status: '失败', problems: [problem] });
          }
          return done({ version, fetchedAt: this.now().toISOString(), converter: 'mineru' });
        }
        const html = await res.text();
        await mkdir(original, { recursive: true });
        await writeFile(join(original, '快照.html'), html, 'utf8');
        const at = this.now().toISOString();
        const md = htmlToMarkdown(html);
        await mkdir(body, { recursive: true });
        await writeFile(
          join(body, '网页.md'),
          `> 来源：${src.origin}\n> 抓取：${at}${src.kind === 'search' ? '\n> 联网查来' : ''}\n\n${md}\n`,
          'utf8',
        );
        const pageTitle = /<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1]?.trim();
        return done({
          version: at,
          fetchedAt: at,
          converter: 'html-to-md',
          ...(req.title === undefined && pageTitle ? { title: decodeEntities(pageTitle) } : {}),
          ...(md.trim() === '' ? { status: '部分可用', problems: ['网页转出来没有正文'] } : {}),
        });
      }
      case 'subtitle': {
        await mkdir(original, { recursive: true });
        const file = join(original, basename(src.origin));
        await cp(src.origin, file);
        const text = await readFile(file, 'utf8');
        await mkdir(body, { recursive: true });
        await writeFile(join(body, '字幕.md'), subtitleToMarkdown(text), 'utf8');
        return done({ version: hash(text), converter: 'srt' });
      }
      case 'md': {
        const st = await stat(src.origin);
        await mkdir(body, { recursive: true });
        if (st.isDirectory()) {
          await cp(src.origin, body, {
            recursive: true,
            filter: (p) => !p.split(/[/\\]/).some((seg) => seg === '.git'),
          });
        } else {
          await cp(src.origin, join(body, basename(src.origin)));
        }
        const files = await textFiles(body);
        const h = createHash('sha256');
        for (const f of files) h.update(f).update(await readFile(join(body, f)));
        return done({ version: h.digest('hex').slice(0, 12), converter: 'none' });
      }
    }
  }

  /** PDF：走 `书库处理/` 的 MinerU 转换；转不了返回原因（不伪装成可用）。 */
  private async convertPdf(pdf: string, dir: string, body: string): Promise<string | undefined> {
    const tool = this.o.pdfTool;
    if (tool === undefined) return 'PDF 的转换没接上（找不到 书库处理/）';
    if (process.env.MINERU_TOKEN === undefined) {
      return 'PDF 要用 MinerU 转换，缺环境变量 MINERU_TOKEN';
    }
    let pages: number;
    try {
      const info = (await run('pdfinfo', [pdf])).stdout;
      pages = Number(/^Pages:\s+(\d+)/m.exec(info)?.[1] ?? NaN);
    } catch {
      return '本机没有 pdfinfo，数不出页数，转不了；装 poppler-utils 后重试';
    }
    if (!Number.isInteger(pages) || pages < 1) return '读不出 PDF 页数';
    const out = join(dir, MINERU_DIR);
    const ranges: string[] = [];
    for (let a = 1; a <= pages; a += 200)
      ranges.push(`${String(a)}-${String(Math.min(a + 199, pages))}`);
    // 不加 -I：-I 不把工作目录放进模块路径，找不到 studium 包（cwd 是仓库里自己的 书库处理/）
    await run(
      'python3',
      ['-m', 'studium.mineru', pdf, '--ranges', ranges.join(','), '--out', out],
      {
        cwd: tool,
        timeout: COMMAND_TIMEOUT_MS,
      },
    );
    await mkdir(body, { recursive: true });
    for (const r of ranges) {
      try {
        await cp(join(out, `p${r}`, 'full.md'), join(body, `p${r}.md`));
      } catch (err) {
        if (isNotFound(err)) return `第 ${r} 页没转出来`;
        throw err;
      }
    }
    return undefined;
  }
}

export class MaterialError extends Error {}

/** 和读文件找不到时同一种错（code ENOENT），读的人统一按“找不到”处理。 */
function notFound(message: string): Error {
  return Object.assign(new Error(message), { code: 'ENOENT' });
}

/** 不给标题时从来源猜一个。 */
function guessTitle(kind: MaterialKind, origin: string): string {
  if (kind === 'web' || kind === 'search') {
    try {
      const u = new URL(origin);
      return `${u.hostname}${u.pathname === '/' ? '' : u.pathname}`;
    } catch {
      return origin;
    }
  }
  const tail = basename(origin.replace(/\/+$/, '')).replace(/\.git$/, '');
  return tail.replace(extname(tail), '') || tail || origin;
}

async function dirs(path: string): Promise<string[]> {
  try {
    return (await readdir(path, { withFileTypes: true }))
      .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
      .map((e) => e.name)
      .sort();
  } catch (err) {
    if (isNotFound(err)) return [];
    throw err;
  }
}

/** 正文目录里能当文字读的文件（相对路径，排好序）：跳过隐藏目录、依赖目录、大文件与二进制。 */
async function textFiles(root: string): Promise<string[]> {
  const out: string[] = [];
  const walk = async (dir: string): Promise<void> => {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (err) {
      if (isNotFound(err)) return;
      throw err;
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const e of entries) {
      if (out.length >= MAX_FILES) return;
      const p = join(dir, e.name);
      if (e.isDirectory()) {
        if (!e.name.startsWith('.') && !SKIP_TREE.test(e.name)) await walk(p);
      } else if (e.isFile() && !e.name.startsWith('.') && (await isText(p))) {
        out.push(relative(root, p).split('\\').join('/'));
      }
    }
  };
  await walk(root);
  return out;
}

async function isText(p: string): Promise<boolean> {
  const st = await stat(p);
  if (st.size > MAX_FILE_BYTES) return false;
  await access(p, constants.R_OK);
  const head = (await readFile(p)).subarray(0, 8000);
  return !head.includes(0);
}

function hash(text: string | Buffer): string {
  return createHash('sha256').update(text).digest('hex').slice(0, 12);
}

async function hashFile(p: string): Promise<string> {
  return hash(await readFile(p));
}

/** 字幕（.srt / .vtt）→ md：每段前保留时间点。 */
export function subtitleToMarkdown(text: string): string {
  const out: string[] = [];
  const blocks = text.replace(/\r/g, '').split(/\n{2,}/);
  for (const b of blocks) {
    const lines = b.split('\n').filter((l) => l.trim() !== '' && l.trim() !== 'WEBVTT');
    const ti = lines.findIndex((l) => l.includes('-->'));
    if (ti < 0) continue;
    const start =
      (lines[ti] ?? '')
        .split('-->')[0]
        ?.trim()
        .replace(/[,.]\d+$/, '') ?? '';
    const words = lines
      .slice(ti + 1)
      .join(' ')
      .replace(/<[^>]+>/g, '')
      .trim();
    if (words !== '') out.push(`[${start}] ${words}`);
  }
  return `${out.join('\n\n')}\n`;
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e: string) => {
    if (e.startsWith('#')) {
      const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/** 网页 → md：只求能读（标题、段落、列表、链接、代码块），不追求排版。 */
export function htmlToMarkdown(html: string): string {
  let s = html;
  const main = /<(main|article)[\s>][\s\S]*?<\/\1>/i.exec(s)?.[0];
  if (main !== undefined) s = main;
  else s = /<body[\s>][\s\S]*<\/body>/i.exec(s)?.[0] ?? s;
  s = s.replace(/<(script|style|noscript|svg|template|iframe)[\s\S]*?<\/\1>/gi, '');
  s = s.replace(/<!--[\s\S]*?-->/g, '');
  const blocks: string[] = [];
  s = s.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_m, code: string) => {
    blocks.push(decodeEntities(code.replace(/<[^>]+>/g, '')));
    return `\n\n\uE000${String(blocks.length - 1)}\uE000\n\n`;
  });
  s = s.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_m, n: string, t: string) => {
    return `\n\n${'#'.repeat(Number(n))} ${t.replace(/<[^>]+>/g, '').trim()}\n\n`;
  });
  s = s.replace(
    /<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    (_m, href: string, t: string) => {
      const text = t.replace(/<[^>]+>/g, '').trim();
      return text === '' ? '' : `[${text}](${href})`;
    },
  );
  s = s.replace(
    /<code[^>]*>([\s\S]*?)<\/code>/gi,
    (_m, t: string) => `\`${t.replace(/<[^>]+>/g, '')}\``,
  );
  s = s.replace(/<li[^>]*>/gi, '\n- ');
  s = s.replace(/<(br|hr)\s*\/?>/gi, '\n');
  s = s.replace(/<\/(p|div|section|tr|table|ul|ol|blockquote|li|dd|dt|figure)>/gi, '\n\n');
  s = s.replace(/<[^>]+>/g, '');
  s = decodeEntities(s);
  s = s
    .split('\n')
    .map((l) => l.replace(/[ \t]+/g, ' ').trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return s.replace(
    /\uE000(\d+)\uE000/g,
    (_m, i: string) => `\`\`\`\n${blocks[Number(i)] ?? ''}\n\`\`\``,
  );
}
