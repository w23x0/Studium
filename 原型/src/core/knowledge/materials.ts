// 资料与外部导入的存放处（工单 W8、W11；设计 docs/设计/记录/资料.md「存在一处、按归属读」「原件层与工作层」）：
// 所有导入存一处，每份带归属（学习者 / 项目），程序按归属算每个会话能读什么。存在 <数据>/资料/<资料 id>/：
//   source.json · 原件/（导入时原样拷入，文件夹保留目录结构，之后不写）·
//   正文/（工作层：模型能读的文字；纯文字由程序从原件拷或转，其余由导入会话写；仓库 = 固定提交的工作树）·
//   mineru/（PDF 的 MinerU 转换产物：每段页码一个 p<起>-<止>/）。
// 原文、出处、沙盒都经它读。不存摘要、路线、标签。
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
  MaterialSummary,
  MaterialKind,
  MaterialOwner,
  MaterialSource,
  MaterialStatus,
  NumberedLine,
  TocEntry,
} from '../../shared/protocol.ts';
import { MATERIAL_KINDS } from '../../shared/protocol.ts';
import { isNotFound } from '../log/session-log.ts';
import { CHAT_RECORD_HEAD, chatExportToMarkdown } from './chat-export.ts';
import {
  searchSets,
  splitLines,
  type IndexedFile,
  type SearchOptions,
  type SearchResult,
  type SearchSet,
} from './search.ts';

const run = promisify(execFile);

/** 读原文的接口（原文、出处用）。 */
export type SourceReader = Pick<
  Materials,
  'ids' | 'summaries' | 'lines' | 'title' | 'toc' | 'search'
>;

/** 资料目录里的子目录名。 */
const SOURCE_FILE = 'source.json';
const ORIGINAL_DIR = '原件';
const BODY_DIR = '正文';
/** MinerU 的输出目录（和 source.json 分开，转换途中不会盖掉它）。 */
const MINERU_DIR = 'mineru';
/** 导入会话觉得又大又乱时写的说明（不强求）：列文件时排第一。 */
export const GUIDE_FILE = '说明.md';
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

/**
 * 收不了的文件（W11 §4：音频、视频、可执行文件、压缩包）：上传时标“转不了”；夹在文件夹里的原样留在原件里，
 * 不交导入会话，在 problems 里写一句。文档类与图片交导入会话。
 */
export const UNSUPPORTED_EXT = new Set([
  '.zip',
  '.rar',
  '.7z',
  '.gz',
  '.tar',
  '.mp3',
  '.mp4',
  '.m4a',
  '.wav',
  '.mov',
  '.mkv',
  '.exe',
  '.dmg',
]);

/** 本机拷进来的种类（原件层 + 工作层那套）；网页、仓库、联网查来的各走自己的流程。 */
const LOCAL_KINDS: readonly MaterialKind[] = ['pdf', 'subtitle', 'md', 'file'];

interface Entry {
  id: string;
  dir: string;
  src: MaterialSource;
}

interface Loaded {
  title: string;
  entries: TocEntry[];
  files?: IndexedFile[];
}

/** 原件里有不是纯文字的文件时，交给导入会话（W11 §4）；Studium 接上。 */
export type Importer = (id: string, files: string[]) => Promise<void>;

export interface MaterialsOptions {
  /** <数据>/资料。 */
  root: string;
  /** `书库处理/` 目录（PDF 走它的 MinerU 转换）；不给 = PDF 转不了，标失败。 */
  pdfTool?: string;
}

export class Materials {
  private scanned: { at: number; map: Map<string, Entry> } | undefined;
  private readonly loaded = new Map<string, Loaded>();
  private readonly pending = new Map<string, Promise<void>>();
  private importer: Importer | undefined;
  /** 已报过的坏资料目录。 */
  private readonly reported = new Set<string>();

  constructor(private readonly o: MaterialsOptions) {}

  /** 接上导入会话（Studium 建好之后）。 */
  setImporter(fn: Importer): void {
    this.importer = fn;
  }

  // ───────────── 存放与归属 ─────────────

  /** 这份资料的 source.json；没有这份返回空。 */
  async source(id: string): Promise<MaterialSource | undefined> {
    return (await this.entry(id))?.src;
  }

  /** 这个项目能不能读这份（没删、归学习者，或归属里有这个项目）。 */
  static readableBy(src: MaterialSource, mainId: string): boolean {
    if (src.removed !== undefined) return false;
    return src.owner.kind === 'learner' || src.owner.projects.includes(mainId);
  }

  /**
   * 本项目能读的资料（含处理中、失败的），按 id：归学习者的全部 + 归属里有这个项目的；删掉的不算。
   * 沙盒只读区、读资料的工具、出处核对、定位都从这里算（记录/资料.md「存在一处、按归属读」）。
   */
  async ofProject(mainId: string): Promise<MaterialSource[]> {
    return [...(await this.scan()).values()]
      .map((e) => e.src)
      .filter((s) => Materials.readableBy(s, mainId))
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  /**
   * 启动时调用（W11 §4）：状态还是“处理中”、这个进程里又没有在处理它的（上次处理被服务重启打断，导入会话也
   * 不在跑了），改成“失败”写明原因，学习者可以重试。
   */
  async recoverInterrupted(): Promise<string[]> {
    const out: string[] = [];
    for (const e of (await this.scan(true)).values()) {
      if (e.src.status !== '处理中' || this.pending.has(e.id)) continue;
      const summaryOnly = e.src.converter === 'summary';
      await this.write(e.dir, {
        ...e.src,
        status: summaryOnly ? '可用' : '失败',
        problems: [
          ...(e.src.problems ?? []),
          summaryOnly ? '总结没写成（服务重启打断），可重试' : '上次处理被服务重启打断，可重试',
        ],
      });
      out.push(e.id);
    }
    return out;
  }

  /**
   * 建一份资料：先写 source.json（处理中），处理在后台跑，跑完改状态。不给归属 = 只归发起导入的项目。
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
    const dir = this.dirOf(id);
    await mkdir(dir, { recursive: true });
    const src: MaterialSource = {
      id,
      title,
      kind: req.kind,
      origin,
      version: '',
      fetchedAt: new Date().toISOString(),
      status: '处理中',
      owner: req.owner ?? { kind: 'project', projects: [mainId] },
      importedFrom: mainId,
      ...(req.learned !== undefined ? { learned: req.learned } : {}),
      ...(req.classify !== undefined ? { classify: req.classify } : {}),
    };
    await this.write(dir, src);
    this.run(dir, src, req);
    return src;
  }

  /**
   * 导入会话判完一份上传归哪边、归谁（W12 §1.6）：改“学过的”标记与归属、去掉待判，按新标记重放纯文字（对话记录
   * 要转逐条 md、加开头那句）。导入会话照旧开着，接着处理。
   */
  async reclassify(
    id: string,
    learned: MaterialSource['learned'] | undefined,
    owner: MaterialOwner,
  ): Promise<MaterialSource> {
    const e = await this.require(id);
    const src: MaterialSource = { ...e.src, owner };
    if (learned === undefined) delete src.learned;
    else src.learned = learned;
    delete src.classify;
    await this.write(e.dir, src);
    await this.copyText(e.dir, src);
    return src;
  }

  /** 改归属（学习者 / 某几个项目）；写 source.json，文件不挪。 */
  async setOwner(id: string, owner: MaterialOwner): Promise<MaterialSource> {
    const e = await this.require(id);
    const src = { ...e.src, owner };
    await this.write(e.dir, src);
    return src;
  }

  /** 改“学过的”标记（改判资料 / 学过的时用）。 */
  async setLearned(
    id: string,
    learned: MaterialSource['learned'] | undefined,
  ): Promise<MaterialSource> {
    const e = await this.require(id);
    const src: MaterialSource = { ...e.src };
    if (learned === undefined) delete src.learned;
    else src.learned = learned;
    await this.write(e.dir, src);
    return src;
  }

  /** 学习者删了：只在 source.json 标上，文件留着（已有引用照旧能定位）。 */
  async remove(id: string): Promise<void> {
    const e = await this.require(id);
    if (e.src.removed !== undefined) return;
    await this.write(e.dir, { ...e.src, removed: { at: new Date().toISOString() } });
  }

  /** 在后台处理；失败写进 source.json（状态“失败”带原因），不伪装可用。 */
  private run(dir: string, src: MaterialSource, req: AddMaterialRequest): void {
    const job = this.process(dir, src, req)
      .catch(async (err: unknown) => {
        await this.write(dir, {
          ...((await this.entry(src.id))?.src ?? src),
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
   * 重试一份失败 / 有问题的资料（工单 W9 §4.4、W11 §4）：清掉工作层（正文、按页段的转换结果），原件层留着，
   * 按原来的来源再处理一遍；原件里有不是纯文字的，重开一个导入会话。处理中的不重试。
   */
  async retry(id: string): Promise<MaterialSource> {
    const e = await this.require(id);
    if (e.src.status === '处理中') throw new MaterialError('这份还在处理，等它跑完再说');
    const keepOriginal = LOCAL_KINDS.includes(e.src.kind);
    for (const name of await readdir(e.dir)) {
      if (name === SOURCE_FILE || (keepOriginal && name === ORIGINAL_DIR)) continue;
      await rm(join(e.dir, name), { recursive: true, force: true });
    }
    const src: MaterialSource = { ...e.src, status: '处理中', fetchedAt: new Date().toISOString() };
    delete src.problems;
    delete src.converter;
    await this.write(e.dir, src);
    this.run(e.dir, src, { kind: src.kind, origin: src.origin, title: src.title });
    return src;
  }

  // ───────────── 导入会话（W11 §4，试验）用 ─────────────

  /** 记下处理过它的导入会话。 */
  async addProcessedBy(id: string, sessionId: string): Promise<void> {
    const e = await this.require(id);
    const by = [...(e.src.processedBy ?? [])];
    if (!by.includes(sessionId)) by.push(sessionId);
    await this.write(e.dir, { ...e.src, processedBy: by });
  }

  /** 哪份资料是这个导入会话处理的。 */
  async ofImportSession(sessionId: string): Promise<MaterialSource | undefined> {
    for (const fresh of [false, true]) {
      for (const e of (await this.scan(fresh)).values()) {
        if (e.src.processedBy?.includes(sessionId) === true) return e.src;
      }
    }
    return undefined;
  }

  /** 导入会话交回（或没交回）：写状态与问题；正文目录重新扫。 */
  async finishImport(id: string, status: MaterialStatus, problems: string[]): Promise<void> {
    const e = await this.require(id);
    const src: MaterialSource = { ...e.src, status };
    const all = [...(e.src.problems ?? []), ...problems].filter((x) => x.trim() !== '');
    if (all.length > 0) src.problems = all;
    else delete src.problems;
    await this.write(e.dir, src);
    this.loaded.delete(id);
  }

  /**
   * 导入会话调用 MinerU（W11 §4 的 `mineru` 工具）：`原件/<file>` 走现有的 PDF 转换（分页段、`书库处理/`），
   * 产物进 `mineru/`、md 进 `正文/`。只有一个 PDF 的 pdf 资料照原来的位置放；
   * 其余按原件里的相对路径分开放。返回写进正文的文件（相对正文目录），或转不了的原因。
   */
  async mineru(id: string, file: string): Promise<{ files: string[] } | { problem: string }> {
    const e = await this.require(id);
    const rel = normalize(file).replace(/^\/+/, '');
    if (rel.startsWith('..')) return { problem: `路径越界：${file}` };
    const pdf = join(e.dir, ORIGINAL_DIR, rel);
    try {
      if (!(await stat(pdf)).isFile()) return { problem: `原件里没有这个文件：${file}` };
    } catch (err) {
      if (isNotFound(err)) return { problem: `原件里没有这个文件：${file}` };
      throw err;
    }
    if (extname(rel).toLowerCase() !== '.pdf') return { problem: 'mineru 只转 PDF' };
    const single = e.src.kind === 'pdf' && !rel.includes('/');
    const stem = rel.slice(0, -extname(rel).length);
    const out = single ? join(e.dir, MINERU_DIR) : join(e.dir, MINERU_DIR, stem);
    const bodyAt = single ? join(e.dir, BODY_DIR) : join(e.dir, BODY_DIR, stem);
    const r = await this.convertPdf(pdf, out, bodyAt);
    if (typeof r === 'string') return { problem: r };
    this.loaded.delete(id);
    const files = r.map((f) => relative(join(e.dir, BODY_DIR), f).split('\\').join('/'));
    if (single) await this.write(e.dir, { ...e.src, converter: 'mineru' });
    return { files };
  }

  /** 工作层被导入会话改过：下次读时重新扫正文目录（交回之后它还可能写，会话停下时再刷一次）。 */
  refresh(id: string): void {
    this.loaded.delete(id);
  }

  /** 原件目录（导入会话的沙盒只读区挂这个）。 */
  async originalDir(id: string): Promise<string> {
    return join((await this.require(id)).dir, ORIGINAL_DIR);
  }

  // ───────────── 读 ─────────────

  /** 全部资料的 id（含删掉的：已有引用照旧能定位）。 */
  async ids(): Promise<string[]> {
    return [...(await this.scan()).keys()].sort();
  }

  /** 资料浏览的列表：全部资料都列（删掉的除外）。 */
  async summaries(): Promise<MaterialSummary[]> {
    const out: MaterialSummary[] = [];
    for (const e of (await this.scan()).values()) {
      if (e.src.removed !== undefined) continue;
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
    const owner = e.src.owner.kind === 'learner' ? '学习者的' : '项目的';
    const head = [
      `# 资料：${e.src.title}`,
      '',
      `种类 ${e.src.kind} · 归属 ${owner}${e.src.learned !== undefined ? ` · 学过的（${e.src.learned.channel}）` : ''} · 版本 ${e.src.version || '—'} · 日期 ${e.src.fetchedAt.slice(0, 10)} · 状态 ${e.src.status}`,
      `来源：${e.src.origin}`,
      ...(e.src.problems !== undefined ? [`有问题：${e.src.problems.join('；')}`] : []),
      '',
      `文件（共 ${String(l.entries.length)} 个；引用写 ${id}/<文件>:<行号>）：`,
    ];
    return [...head, ...l.entries.map((x) => `- ${x.file ?? ''}`)].join('\n');
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

  /** 正文全部文件接成一份（外部导入的 md 用）：每个文件前标 `<!-- 文件：相对路径 -->`；处理中的也给已有的。 */
  async joined(id: string): Promise<string> {
    const e = await this.require(id);
    const body = join(e.dir, BODY_DIR);
    const parts: string[] = [];
    for (const f of await textFiles(body)) {
      parts.push(`<!-- 文件：${f} -->`, '', await readFile(join(body, f), 'utf8'), '');
    }
    return parts.join('\n');
  }

  async title(id: string): Promise<string> {
    return (await this.require(id)).src.title;
  }

  async toc(id: string): Promise<TocEntry[]> {
    return (await this.load(id)).entries;
  }

  /** 全文检索；不给 material / materials = 搜全部资料。认不出的 id 跳过。 */
  async search(query: string, opt: SearchOptions = {}): Promise<SearchResult> {
    const ids =
      opt.material !== undefined
        ? [opt.material]
        : (opt.materials ?? [...(await this.scan()).keys()]);
    const sets: SearchSet[] = [];
    for (const id of ids) {
      if ((await this.entry(id)) === undefined) continue;
      const l = await this.load(id);
      sets.push({ material: id, title: l.title, files: await this.files(id) });
    }
    return searchSets(sets, query, opt);
  }

  /** 正文目录（沙盒只读区挂这个；导入会话的工作区）。 */
  async bodyDir(id: string): Promise<string> {
    return join((await this.require(id)).dir, BODY_DIR);
  }

  /** 正文有多大（字节，含子目录；仓库不算 .git）：清单里给模型看大小，好决定整份读还是搜。 */
  async bodyBytes(id: string): Promise<number> {
    const walk = async (dir: string): Promise<number> => {
      let entries;
      try {
        entries = await readdir(dir, { withFileTypes: true });
      } catch (err) {
        if (isNotFound(err)) return 0;
        throw err;
      }
      let n = 0;
      for (const e of entries) {
        if (e.name === '.git') continue;
        const p = join(dir, e.name);
        if (e.isDirectory()) n += await walk(p);
        else if (e.isFile()) n += (await stat(p)).size;
      }
      return n;
    };
    return walk(await this.bodyDir(id));
  }

  /** 说明.md（导入会话写的学过的那段总结；没有 = undefined），清单里带它的开头。 */
  async guide(id: string): Promise<string | undefined> {
    try {
      return await readFile(join(await this.bodyDir(id), GUIDE_FILE), 'utf8');
    } catch (err) {
      if (isNotFound(err)) return undefined;
      throw err;
    }
  }

  // ───────────── 内部：扫描与读 ─────────────

  /** 一份资料的目录：<数据>/资料/<资料 id>/。 */
  private dirOf(id: string): string {
    if (id === '' || id.includes('/') || id.includes('..')) throw new Error(`资料 id 不对：${id}`);
    return join(this.o.root, id);
  }

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
    for (const id of await dirs(this.o.root)) {
      const dir = join(this.o.root, id);
      let src: MaterialSource;
      try {
        src = JSON.parse(await readFile(join(dir, SOURCE_FILE), 'utf8')) as MaterialSource;
      } catch (err) {
        if (isNotFound(err)) continue;
        if (!(err instanceof SyntaxError)) throw err;
        this.broken(dir, `source.json 不是合法的 JSON（${err.message}）`);
        continue;
      }
      // 没有归属只会是数据迁移出错：报清楚是哪一份、跳过它，别让全站读资料都失败
      const owner: unknown = (src as { owner?: unknown }).owner;
      if (typeof owner !== 'object' || owner === null) {
        this.broken(dir, 'source.json 没有 owner（归属），多半是数据迁移出错');
        continue;
      }
      if (!map.has(src.id)) map.set(src.id, { id: src.id, dir, src });
    }
    this.scanned = { at: now, map };
    return map;
  }

  /** 坏掉的一份：每份只报一次（扫描两秒一次，不刷屏），跳过不读。 */
  private broken(dir: string, why: string): void {
    if (this.reported.has(dir)) return;
    this.reported.add(dir);
    console.error(`资料 ${dir} 读不了，跳过：${why}`);
  }

  private async load(id: string): Promise<Loaded> {
    const hit = this.loaded.get(id);
    if (hit) return hit;
    const e = await this.require(id);
    const all = await textFiles(join(e.dir, BODY_DIR));
    // 导入会话写的说明排第一（W11 §3）
    const files = [...all.filter((f) => f === GUIDE_FILE), ...all.filter((f) => f !== GUIDE_FILE)];
    const l: Loaded = {
      title: e.src.title,
      entries: files.map((f, i) => ({
        num: String(i + 1),
        title: f,
        file: f,
        chapter: dirname(f) === '.' ? '' : dirname(f),
      })),
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
    return freshMaterialId(base, new Set((await this.scan(true)).keys()));
  }

  // ───────────── 内部：按种类处理 ─────────────

  private async process(dir: string, src: MaterialSource, req: AddMaterialRequest): Promise<void> {
    const body = join(dir, BODY_DIR);
    const original = join(dir, ORIGINAL_DIR);
    const done = (rest: Partial<MaterialSource>): Promise<void> =>
      this.write(dir, { ...src, status: '可用', ...rest });
    switch (src.kind) {
      case 'pdf':
      case 'subtitle':
      case 'md':
      case 'file':
        return this.importLocal(dir, src);
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
          // 网址指向的是 PDF：存原件，照新 PDF 转（工单 W9 进度页有记）
          await mkdir(original, { recursive: true });
          const name = basename(new URL(src.origin).pathname) || '原件';
          const pdf = join(original, name.toLowerCase().endsWith('.pdf') ? name : `${name}.pdf`);
          await writeFile(pdf, Buffer.from(await res.arrayBuffer()));
          const version = await hashFile(pdf);
          const r = await this.convertPdf(pdf, join(dir, MINERU_DIR), body);
          if (typeof r === 'string') {
            return this.write(dir, { ...src, version, status: '失败', problems: [r] });
          }
          return done({ version, fetchedAt: new Date().toISOString(), converter: 'mineru' });
        }
        const html = await res.text();
        await mkdir(original, { recursive: true });
        await writeFile(join(original, '快照.html'), html, 'utf8');
        const at = new Date().toISOString();
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
    }
  }

  /**
   * 本机拷进来的一份（W11 §3）：原件层原样拷入（文件夹的内容直接放进 `原件/`，单个文件放 `原件/<文件名>`；
   * 已有原件 = 重试，不再拷）；纯文字由程序拷进 `正文/`（同一相对路径；字幕转 md，判为对话记录的对话导出
   * 转逐条 md 并加开头那句）。原件里还有不是纯文字的（PDF、图片、Word……）：状态保持“处理中”，交导入会话。
   */
  private async importLocal(dir: string, src: MaterialSource): Promise<void> {
    const original = join(dir, ORIGINAL_DIR);
    if (!(await exists(original))) {
      const st = await stat(src.origin);
      await mkdir(original, { recursive: true });
      await cp(src.origin, st.isDirectory() ? original : join(original, basename(src.origin)), {
        recursive: true,
        filter: (p) => !p.split(/[/\\]/).some((seg) => seg === '.git'),
      });
    }
    const { all, version, skipped, others, converter } = await this.copyText(dir, src);
    const problems = skipped.length > 0 ? [`转不了，原件里留着：${skipped.join('、')}`] : [];
    if (all.length === skipped.length) {
      return this.write(dir, {
        ...src,
        version,
        status: '失败',
        problems: ['没有能读的内容', ...problems],
      });
    }
    // 学过的（笔记、别处的对话记录）都交导入会话写一段总结（说明.md），清单里带着，别的会话据此决定读不读原文（11-02）；
    // 上传时归哪边拿不准的也交导入会话判（W12 §1.6）
    if (others.length === 0 && src.learned === undefined && src.classify === undefined) {
      return this.write(dir, {
        ...src,
        version,
        converter,
        status: '可用',
        ...(problems.length > 0 ? { problems } : {}),
      });
    }
    // 交导入会话：状态保持“处理中”，会话交回后改（W11 §4）
    await this.write(dir, {
      ...src,
      version,
      // 只为写总结 / 判归哪边的记 summary：被打断时文字照样能读，不算失败
      converter: others.length === 0 ? 'summary' : 'import-session',
      ...(problems.length > 0 ? { problems } : {}),
    });
    if (this.importer === undefined) {
      const cur = (await this.entry(src.id))?.src ?? src;
      return this.write(dir, {
        ...cur,
        status: '失败',
        problems: [
          ...problems,
          '要交导入会话处理（不是纯文字的文件 / 学过的要写总结），但没接上模型',
        ],
      });
    }
    await this.importer(src.id, others);
  }

  /**
   * 原件里的纯文字按同一相对路径放进 `正文/`（字幕转 md，对话记录的对话导出转逐条 md 并加开头那句）；
   * 返回原件清单、整份指纹、转不了的、不是纯文字的（交导入会话）与用的转换。
   */
  private async copyText(
    dir: string,
    src: MaterialSource,
  ): Promise<{
    all: string[];
    version: string;
    skipped: string[];
    others: string[];
    converter: string;
  }> {
    const original = join(dir, ORIGINAL_DIR);
    const body = join(dir, BODY_DIR);
    const all = await allFiles(original);
    const version = await hashTree(original, all);
    const chat = src.learned?.channel === '对话记录';
    const skipped: string[] = [];
    const others: string[] = [];
    let converter = 'none';
    await mkdir(body, { recursive: true });
    for (const f of all) {
      const ext = extname(f).toLowerCase();
      const from = join(original, f);
      if (UNSUPPORTED_EXT.has(ext)) {
        skipped.push(f);
        continue;
      }
      if (!(await isPlainText(from))) {
        others.push(f);
        continue;
      }
      const raw = await readFile(from, 'utf8');
      let name = f;
      let text = raw;
      if (ext === '.srt' || ext === '.vtt') {
        name = `${f.slice(0, -ext.length)}.md`;
        text = subtitleToMarkdown(raw);
        converter = 'srt';
      } else if ((ext === '.json' || ext === '.jsonl') && chat) {
        name = `${f.slice(0, -ext.length)}.md`;
        text = chatExportToMarkdown(raw, src.title);
        converter = 'chat-export';
      }
      if (chat && /\.(md|markdown|txt)$/i.test(name)) text = `${CHAT_RECORD_HEAD}\n\n${text}`;
      await mkdir(dirname(join(body, name)), { recursive: true });
      await writeFile(join(body, name), text, 'utf8');
    }
    return { all, version, skipped, others, converter };
  }

  /**
   * PDF：走 `书库处理/` 的 MinerU 转换，产物进 out、每段页码一份 md 进 body；转不了返回原因（不伪装成可用）。
   * 返回写进 body 的文件（绝对路径）。
   */
  private async convertPdf(pdf: string, out: string, body: string): Promise<string[] | string> {
    const tool = this.o.pdfTool;
    if (tool === undefined) return 'PDF 的转换没接上（找不到 书库处理/）';
    if (!(await hasMineruToken(tool))) {
      return 'PDF 要用 MinerU 转换，缺 MINERU_TOKEN（环境变量或 书库处理/.env）';
    }
    let pages: number;
    try {
      const info = (await run('pdfinfo', [pdf])).stdout;
      pages = Number(/^Pages:\s+(\d+)/m.exec(info)?.[1] ?? NaN);
    } catch {
      return '本机没有 pdfinfo，数不出页数，转不了；装 poppler-utils 后重试';
    }
    if (!Number.isInteger(pages) || pages < 1) return '读不出 PDF 页数';
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
    const written: string[] = [];
    for (const r of ranges) {
      try {
        await cp(join(out, `p${r}`, 'full.md'), join(body, `p${r}.md`));
        written.push(join(body, `p${r}.md`));
      } catch (err) {
        if (isNotFound(err)) return `第 ${r} 页没转出来`;
        throw err;
      }
    }
    return written;
  }

  /** 设置里的 MinerU 密钥入口（临时）：配了没有。 */
  async mineruTokenSet(): Promise<boolean> {
    return this.o.pdfTool !== undefined && (await hasMineruToken(this.o.pdfTool));
  }

  /**
   * 设置里填的 MinerU 密钥写进 `书库处理/.env`（不进 git；沙盒挡着这个文件，见 sandbox.ts denyRead），替换原来那一行；
   * 空串删掉那一行。环境变量里有 MINERU_TOKEN 时环境变量优先（mineru.py 先认环境变量）。
   */
  async setMineruToken(token: string): Promise<void> {
    const tool = this.o.pdfTool;
    if (tool === undefined) throw new MaterialError('找不到 书库处理/');
    const clean = token.trim();
    if (/\s/.test(clean)) throw new MaterialError('密钥里不能有空白或换行');
    const file = join(tool, '.env');
    let lines: string[] = [];
    try {
      lines = (await readFile(file, 'utf8')).split('\n');
    } catch (err) {
      if (!isNotFound(err)) throw err;
    }
    lines = lines.filter((l) => !/^\s*MINERU_TOKEN\s*=/.test(l) && l.trim() !== '');
    if (clean !== '') lines.push(`MINERU_TOKEN=${clean}`);
    await writeFile(file, lines.length > 0 ? `${lines.join('\n')}\n` : '', { mode: 0o600 });
  }
}

/** 新资料的 id：可读的名字，和 taken 里的都不重名（迁移也用）。 */
export function freshMaterialId(base: string, taken: Set<string>): string {
  const clean =
    base
      .replace(/[/\\|｜】:]/g, '·')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 60) || '资料';
  if (!taken.has(clean)) return clean;
  for (let n = 2; ; n++) {
    const x = `${clean}（${String(n)}）`;
    if (!taken.has(x)) return x;
  }
}

async function exists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch (err) {
    if (isNotFound(err)) return false;
    throw err;
  }
}

/** 目录里全部文件（相对路径，排好序；不进 .git）。 */
async function allFiles(root: string): Promise<string[]> {
  const out: string[] = [];
  const walk = async (d: string): Promise<void> => {
    const entries = await readdir(d, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const e of entries) {
      const p = join(d, e.name);
      if (e.isDirectory()) {
        if (e.name !== '.git') await walk(p);
      } else if (e.isFile()) out.push(relative(root, p).split('\\').join('/'));
    }
  };
  await walk(root);
  return out;
}

/** 一个原件目录整份的指纹（数据迁移也用）。 */
export async function originalFingerprint(root: string): Promise<string> {
  return hashTree(root, await allFiles(root));
}

/** 原件整份的指纹（路径 + 内容）。 */
async function hashTree(root: string, files: string[]): Promise<string> {
  const h = createHash('sha256');
  for (const f of files) h.update(f).update(await readFile(join(root, f)));
  return h.digest('hex').slice(0, 12);
}

/** 纯文字：开头没有 NUL 字节，也不是 PDF（大文件照样算，读的时候另有上限）。 */
async function isPlainText(p: string): Promise<boolean> {
  if (extname(p).toLowerCase() === '.pdf') return false;
  const fh = await readFile(p);
  return !fh.subarray(0, 8000).includes(0);
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

/** MinerU 密钥：环境变量，或 `书库处理/.env` 里的同名一行（mineru.py 两处都认）。 */
async function hasMineruToken(tool: string): Promise<boolean> {
  if (process.env.MINERU_TOKEN !== undefined) return true;
  try {
    return /^\s*MINERU_TOKEN\s*=\s*\S/m.test(await readFile(join(tool, '.env'), 'utf8'));
  } catch (err) {
    if (isNotFound(err)) return false;
    throw err;
  }
}
