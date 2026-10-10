// M07 个人笔记（M07:33,38）：把学习者写的 Markdown 笔记按标题切成小节，存进数据目录下自己的 M07 区
// （<数据>/knowledge/m07-notes/<id>/m07/…，格式同书的切分结果），之后和书一样可浏览、检索、引用。
// 不改书库、不改笔记原件；标作者 = 学习者、来源 = 个人笔记、原路径。笔记里的图片 / 嵌入引用原样留在文字里。
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join, resolve } from 'node:path';
import type { NoteSummary } from '../../shared/protocol.ts';
import { isNotFound } from '../log/session-log.ts';
import { BadRequestError } from '../studium.ts';
import type { Library, NoteMeta } from './m07.ts';

/** 笔记标题级别 ≤ 这个的标题都切成小节；更深的留在小节里。 */
const SPLIT_LEVEL = 3;
const NOTE_PREFIX = '笔记-';
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp']);
const SKIP_DIR = /^(\.|node_modules$)/;
const MAX_FILES = 500;

interface Section {
  level: number;
  title: string;
  /** 原文件里的起止行（1 起，含两端）。 */
  from: number;
  to: number;
  lines: string[];
}

export class Notes {
  constructor(
    readonly root: string,
    private readonly library: Library,
    private readonly now: () => Date,
  ) {}

  /** 已导入的笔记（新的在前）。 */
  async list(): Promise<NoteSummary[]> {
    const out: NoteSummary[] = [];
    for (const id of await this.library.books()) {
      const info = await this.library.info(id);
      if (info?.kind !== 'note' || info.meta === undefined) continue;
      out.push(summaryOf(info.meta));
    }
    return out.sort((a, b) => b.importedAt.localeCompare(a.importedAt));
  }

  async import(path: string, title?: string): Promise<NoteSummary> {
    if (path.trim() === '') throw new BadRequestError('path 不能为空');
    const abs = resolve(path.trim());
    let st;
    try {
      st = await stat(abs);
    } catch (err) {
      if (isNotFound(err)) throw new BadRequestError(`找不到这个路径：${abs}`);
      throw err;
    }
    const skipped: string[] = [];
    const files = st.isDirectory() ? await collectMarkdown(abs, skipped) : [abs];
    if (!st.isDirectory() && !isMarkdown(abs)) {
      throw new BadRequestError(
        '只收 Markdown 笔记（.md）：给一个 .md 文件，或一个放着 .md 的目录',
      );
    }
    if (files.length === 0) throw new BadRequestError('这个目录里没有 .md 笔记');
    if (files.length > MAX_FILES)
      throw new BadRequestError(`文件太多（超过 ${String(MAX_FILES)} 个）`);

    const noteTitle =
      title?.trim() ||
      (st.isDirectory()
        ? `${basename(dirname(abs))} ${basename(abs)}`.trim()
        : basename(abs, extname(abs)));
    const previous = await this.previousOf(abs);
    const id = await this.newId(noteTitle);
    const dir = join(this.root, id);

    const importRoot = st.isDirectory() ? abs : dirname(abs);
    const assetIndex = new AssetIndex(importRoot);
    const metaFiles: NoteMeta['files'] = [];
    const assets: NoteMeta['assets'] = [];
    const rows: string[] = [];
    for (const [i, file] of files.entries()) {
      const chapter = `ch${String(i + 1).padStart(2, '0')}`;
      const text = await readFile(file, 'utf8');
      const lines = splitLines(text);
      const sections = splitSections(lines);
      const fileTitle = basename(file, extname(file));
      rows.push(
        `| ${String(i + 1)} | ch | ${cell(fileTitle)} |  | — | 1 |  |  |  | 笔记文件：${cell(file)} |`,
      );
      for (const [k, sec] of sections.entries()) {
        const rel = `${chapter}/sec-${String(i + 1)}.${String(k + 1)}.md`;
        await mkdir(join(dir, 'm07', chapter), { recursive: true });
        await writeFile(join(dir, 'm07', rel), sec.lines.join('\n') + '\n', 'utf8');
        rows.push(
          `| ${String(i + 1)}.${String(k + 1)} | sec | ${cell(sec.title || fileTitle)} |  | \`${rel}\` | 2 |  |  |  | 原文件第 ${String(sec.from)}–${String(sec.to)} 行 |`,
        );
        for (const ref of imageRefs(sec.lines)) {
          const found = await assetIndex.find(ref.ref, dirname(file));
          assets.push({
            ref: ref.ref,
            path: found ?? '',
            found: found !== undefined,
            file: rel,
            line: ref.line,
          });
        }
      }
      metaFiles.push({
        chapter,
        title: fileTitle,
        originalFile: file,
        sections: sections.length,
      });
    }
    const importedAt = this.now().toISOString();
    const author = '学习者';
    const source = '个人笔记';
    await mkdir(join(dir, 'm07'), { recursive: true });
    await writeFile(
      join(dir, 'm07', 'index.md'),
      [
        `# M07 索引：${noteTitle}`,
        '',
        `> 个人笔记。作者：${author}；来源：${source}；原路径：${abs}；导入于 ${importedAt}。不是通用权威知识：引用时说明是学习者自己的笔记。`,
        '',
        '| 编号 | 类型 | 标题 | 页 | 文件 | 层级 | PDF 页 | 原文 | 定位 | 说明 |',
        '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
        ...rows,
        '',
      ].join('\n'),
      'utf8',
    );
    const meta: NoteMeta = {
      id,
      title: noteTitle,
      author,
      source,
      originalPath: abs,
      importedAt,
      files: metaFiles,
      assets,
      ...(previous !== undefined ? { previous } : {}),
      ...(skipped.length > 0 ? { skipped } : {}),
    };
    await writeFile(join(dir, 'meta.json'), JSON.stringify(meta, null, 2) + '\n', 'utf8');
    this.library.invalidate();
    return summaryOf(meta);
  }

  /** 笔记里记下的图片 / 嵌入文件（只给记在 meta 里的、且是图片）；返回原件路径。 */
  async asset(book: string, ref: string): Promise<{ path: string; ext: string } | undefined> {
    const info = await this.library.info(book);
    const hit = info?.meta?.assets.find((a) => a.ref === ref && a.found);
    if (hit === undefined) return undefined;
    const ext = extname(hit.path).toLowerCase();
    return IMAGE_EXT.has(ext) ? { path: hit.path, ext } : undefined;
  }

  /** 同一原路径以前导入过的最新一份。 */
  private async previousOf(abs: string): Promise<string | undefined> {
    const same = (await this.list()).filter((n) => n.originalPath === abs);
    return same[0]?.id;
  }

  private async newId(title: string): Promise<string> {
    const base =
      `${NOTE_PREFIX}${title.replaceAll(/[/\\|｜】\s]+/g, '-').replaceAll('..', '.')}`.slice(0, 80);
    const taken = new Set(await this.library.books());
    let id = base;
    for (let n = 2; taken.has(id); n++) id = `${base}-v${String(n)}`;
    return id;
  }
}

function summaryOf(m: NoteMeta): NoteSummary {
  return {
    id: m.id,
    title: m.title,
    author: m.author,
    source: m.source,
    originalPath: m.originalPath,
    importedAt: m.importedAt,
    files: m.files.length,
    sections: m.files.reduce((n, f) => n + f.sections, 0),
    assets: m.assets.map((a) => ({ ref: a.ref, found: a.found, file: a.file, line: a.line })),
    ...(m.previous !== undefined ? { previous: m.previous } : {}),
    ...(m.skipped !== undefined ? { skipped: m.skipped } : {}),
  };
}

function isMarkdown(path: string): boolean {
  return /\.(md|markdown)$/i.test(path);
}

async function collectMarkdown(dir: string, skipped: string[]): Promise<string[]> {
  const out: string[] = [];
  const entries = (await readdir(dir, { withFileTypes: true })).sort((a, b) =>
    a.name.localeCompare(b.name, 'zh-CN', { numeric: true }),
  );
  for (const e of entries) {
    if (SKIP_DIR.test(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await collectMarkdown(p, skipped)));
    else if (isMarkdown(e.name)) out.push(p);
    else if (!IMAGE_EXT.has(extname(e.name).toLowerCase())) skipped.push(p);
  }
  return out;
}

function splitLines(text: string): string[] {
  const lines = text.replaceAll('\r\n', '\n').split('\n');
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

/** 按标题切小节：代码块里的 # 不算；标题级别 ≤ 3 的切开（没有就取文件里最浅的那一级）；标题前的内容单成一节。 */
function splitSections(lines: string[]): Section[] {
  const heads: { at: number; level: number; title: string }[] = [];
  let fence = '';
  lines.forEach((l, i) => {
    const f = /^\s*(```|~~~)/.exec(l)?.[1];
    if (f !== undefined) {
      fence = fence === '' ? f : fence === f ? '' : fence;
      return;
    }
    if (fence !== '') return;
    const m = /^(#{1,6})\s+(.*\S)\s*$/.exec(l);
    if (m?.[1] !== undefined && m[2] !== undefined) {
      heads.push({ at: i, level: m[1].length, title: m[2].replace(/\s*#+\s*$/, '') });
    }
  });
  const shallowest = heads.reduce((n, h) => Math.min(n, h.level), 7);
  const cut = Math.max(SPLIT_LEVEL, shallowest > SPLIT_LEVEL ? shallowest : 0);
  const marks = heads.filter((h) => h.level <= cut);
  const out: Section[] = [];
  const first = marks[0]?.at ?? lines.length;
  if (lines.slice(0, first).some((l) => l.trim() !== '')) {
    out.push({ level: 0, title: '', from: 1, to: first, lines: lines.slice(0, first) });
  }
  marks.forEach((h, i) => {
    const end = marks[i + 1]?.at ?? lines.length;
    out.push({
      level: h.level,
      title: h.title,
      from: h.at + 1,
      to: end,
      lines: lines.slice(h.at, end),
    });
  });
  if (out.length === 0)
    out.push({ level: 0, title: '', from: 1, to: Math.max(lines.length, 1), lines });
  return out;
}

/** 目录表格里的一格：竖线换成全角，免得破坏表格。 */
function cell(s: string): string {
  return s.replaceAll('|', '｜').replaceAll('\n', ' ').trim();
}

/** 一节里的图片 / 嵌入引用：![alt](路径) 与 Obsidian 的 ![[文件]]；网址不算。 */
function imageRefs(lines: string[]): { ref: string; line: number }[] {
  const out: { ref: string; line: number }[] = [];
  lines.forEach((l, i) => {
    for (const m of l.matchAll(/!\[[^\]]*\]\(\s*<?([^)\s>]+)>?[^)]*\)/g)) {
      const ref = m[1];
      if (ref !== undefined && !/^[a-z][a-z0-9+.-]*:/i.test(ref)) {
        out.push({ ref: safeDecode(ref), line: i + 1 });
      }
    }
    for (const m of l.matchAll(/!\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g)) {
      const ref = m[1]?.trim();
      if (ref !== undefined && ref !== '') out.push({ ref, line: i + 1 });
    }
  });
  return out;
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    // 不是合法的 % 转义（路径里本来就有 %）：原样用
    return s;
  }
}

/** 在导入的根目录里找引用的文件：先按相对路径，找不到再按文件名在整棵树里找（Obsidian 的写法）。 */
class AssetIndex {
  private byName: Map<string, string> | undefined;

  constructor(private readonly root: string) {}

  async find(ref: string, fromDir: string): Promise<string | undefined> {
    for (const base of [fromDir, this.root]) {
      const p = resolve(base, ref);
      try {
        if ((await stat(p)).isFile()) return p;
      } catch (err) {
        if (!isNotFound(err) && (err as NodeJS.ErrnoException).code !== 'ENOTDIR') throw err;
      }
    }
    this.byName ??= await indexNames(this.root);
    return this.byName.get(basename(ref));
  }
}

async function indexNames(root: string): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const walk = async (dir: string, depth: number): Promise<void> => {
    if (depth > 6) return;
    for (const e of await readdir(dir, { withFileTypes: true })) {
      if (SKIP_DIR.test(e.name)) continue;
      const p = join(dir, e.name);
      if (e.isDirectory()) await walk(p, depth + 1);
      else if (!out.has(e.name)) out.set(e.name, p);
    }
  };
  await walk(root, 0);
  return out;
}
