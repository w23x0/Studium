// 上传与分流（工单 W9 §4.1 §4.2；设计 docs/设计/记录/资料.md「入口」）：学习者拖进来 / 点“添加”的文件
// 原样存进 <数据>/projects/<主对话 id>/上传/<上传 id>/，再一份份分到资料或学过的（外部导入）。
// 程序先按扩展名粗分；.md / .txt / .json 这类拿不准的交模型判一次（只回归哪类 + 一句理由，不分析内容）。
// 每次判、改判在主对话正本追加 upload_routed，以最后一条为准。
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join, normalize } from 'node:path';
import type { AddMaterialRequest, UploadItemView } from '../shared/protocol.ts';
import type { LogRecord, UploadRouted } from '../shared/records.ts';
import { BadRequestError } from './studium.ts';

/** 一次最多传多少个文件（参照 Claude）。 */
export const MAX_UPLOAD_FILES = 100;
/** 单个文件上限。 */
export const MAX_UPLOAD_FILE_BYTES = 100 * 1024 * 1024;
/** 一次上传合计上限。 */
export const MAX_UPLOAD_BYTES = 300 * 1024 * 1024;

/** 模型判一次：归资料还是学过的（学过的再分笔记 / 对话记录）+ 一句理由。 */
export type RouteJudge = (
  name: string,
  sample: string,
) => Promise<{ to: '资料' | '学过的'; channel?: '笔记' | '对话记录'; reason: string }>;

export interface UploadsDeps {
  /** <数据>/projects。 */
  root: string;
  newId: (prefix: string) => string;
  iso: () => string;
  /** 不给 = 没接模型，拿不准的按扩展名默认。 */
  judge?: RouteJudge;
  addMaterial: (mainId: string, req: AddMaterialRequest) => Promise<string>;
  removeMaterial: (mainId: string, id: string) => Promise<void>;
  importLearned: (
    mainId: string,
    x: { path: string; channel: '笔记' | '对话记录'; title: string },
  ) => Promise<string>;
  removeImport: (id: string) => Promise<void>;
  record: (mainId: string, r: Omit<UploadRouted, 'type' | 'at'>) => Promise<void>;
  records: (mainId: string) => Promise<LogRecord[]>;
}

/** 一份上传的东西（单个文件，或整个笔记 / 代码文件夹）。 */
type UnitKind = 'pdf' | 'subtitle' | 'notes' | 'chat' | 'text' | 'unsupported';

interface Unit {
  /** 上传里的相对路径（文件夹 = 文件夹名）。 */
  file: string;
  kind: UnitKind;
}

const NOTE_EXT = new Set(['.md', '.markdown', '.txt']);
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp']);
/** 认得、但现在还转不了的（Word、PPT、表格、压缩包、音视频……）。 */
const BINARY_EXT = new Set([
  '.doc',
  '.docx',
  '.ppt',
  '.pptx',
  '.xls',
  '.xlsx',
  '.zip',
  '.rar',
  '.7z',
  '.gz',
  '.tar',
  '.epub',
  '.mp3',
  '.mp4',
  '.m4a',
  '.wav',
  '.mov',
  '.mkv',
  '.exe',
  '.dmg',
]);

export class Uploads {
  constructor(private readonly o: UploadsDeps) {}

  /** 一次上传的目录：<数据>/projects/<主对话 id>/上传/<上传 id>/。 */
  dir(mainId: string, upload: string): string {
    if ([mainId, upload].some((x) => x === '' || x.includes('/') || x.includes('..'))) {
      throw new BadRequestError('项目或上传的 id 不对');
    }
    return join(this.o.root, mainId, '上传', upload);
  }

  /** 存下一批文件（相对路径保留文件夹结构），一份份分流、落地，返回这次的结果。 */
  async save(mainId: string, files: { path: string; data: Buffer }[]): Promise<UploadItemView[]> {
    if (files.length === 0) throw new BadRequestError('没有收到文件');
    if (files.length > MAX_UPLOAD_FILES) {
      throw new BadRequestError(
        `一次最多传 ${String(MAX_UPLOAD_FILES)} 个文件，这次是 ${String(files.length)} 个；分几次传`,
      );
    }
    const big = files.find((f) => f.data.length > MAX_UPLOAD_FILE_BYTES);
    if (big !== undefined) {
      throw new BadRequestError(
        `${big.path} 超过单个文件上限 ${String(MAX_UPLOAD_FILE_BYTES / 1024 / 1024)} MB`,
      );
    }
    const upload = this.o.newId('up');
    const dir = this.dir(mainId, upload);
    const binary = new Set<string>();
    const paths: string[] = [];
    for (const f of files) {
      const rel = safeRelative(f.path);
      if (paths.includes(rel)) continue;
      paths.push(rel);
      await mkdir(dirname(join(dir, rel)), { recursive: true });
      await writeFile(join(dir, rel), f.data);
      if (f.data.subarray(0, 8000).includes(0)) binary.add(rel);
    }
    const out: UploadItemView[] = [];
    for (const unit of units(paths, binary)) {
      out.push(await this.land(mainId, upload, unit));
    }
    return out;
  }

  /** 本项目所有上传的现状（每份取最后一条 upload_routed），新的在前。 */
  async list(mainId: string): Promise<UploadItemView[]> {
    const latest = new Map<string, UploadItemView>();
    for (const r of await this.o.records(mainId)) {
      if (r.type !== 'upload_routed') continue;
      const view: UploadItemView = { ...r };
      delete (view as Partial<typeof r>).type;
      latest.set(`${r.upload}\u0001${r.file}`, view);
    }
    return [...latest.values()].reverse();
  }

  /** 学习者改判：撤掉原来那边，落到另一边（以学习者为准）。 */
  async reroute(
    mainId: string,
    upload: string,
    file: string,
    to: '资料' | '学过的',
  ): Promise<UploadItemView> {
    const now = (await this.list(mainId)).find((x) => x.upload === upload && x.file === file);
    if (now === undefined) throw new BadRequestError(`这次上传里没有：${file}`);
    if (now.routedTo === to && now.problem === undefined) return now;
    const abs = join(this.dir(mainId, upload), safeRelative(file));
    const st = await stat(abs);
    const unit: Unit = {
      file,
      kind: st.isDirectory() ? await folderKind(abs) : fileKind(file, false),
    };
    if (to === '学过的' && !canBeLearned(unit.kind)) {
      throw new BadRequestError('只有文字笔记（.md / .txt）和对话导出（.json）能当学过的');
    }
    if (now.material !== undefined) await this.o.removeMaterial(mainId, now.material);
    if (now.import !== undefined) await this.o.removeImport(now.import);
    return this.put(mainId, upload, unit, {
      to,
      by: 'learner',
      ...(to === '学过的' ? { channel: unit.kind === 'chat' ? '对话记录' : '笔记' } : {}),
    });
  }

  /** 判一份：扩展名定得了的直接定，拿不准的问模型；然后落地。 */
  private async land(mainId: string, upload: string, unit: Unit): Promise<UploadItemView> {
    if (!canBeLearned(unit.kind)) {
      return this.put(mainId, upload, unit, {
        to: '资料',
        by: 'model',
        reason:
          unit.kind === 'unsupported'
            ? '按扩展名：不是文字资料'
            : `按扩展名：${unit.kind === 'pdf' ? 'PDF' : unit.kind === 'subtitle' ? '字幕' : '文字 / 代码'}都当资料`,
      });
    }
    const judged = await this.judge(this.dir(mainId, upload), unit);
    return this.put(mainId, upload, unit, { ...judged, by: 'model' });
  }

  private async judge(
    dir: string,
    unit: Unit,
  ): Promise<{ to: '资料' | '学过的'; channel?: '笔记' | '对话记录'; reason: string }> {
    const fallback =
      unit.kind === 'chat'
        ? ({ to: '学过的', channel: '对话记录', reason: '没接模型：.json 多是对话导出' } as const)
        : ({ to: '资料', reason: '没接模型：按扩展名默认当资料，不对就点改' } as const);
    if (this.o.judge === undefined) return fallback;
    try {
      return await this.o.judge(unit.file, await sample(join(dir, unit.file)));
    } catch (err) {
      console.error('分流判断失败：', err);
      return { ...fallback, reason: '判断没成功，先按扩展名放；不对就点改' };
    }
  }

  /** 落地并记一条 upload_routed。 */
  private async put(
    mainId: string,
    upload: string,
    unit: Unit,
    how: {
      to: '资料' | '学过的';
      by: 'model' | 'learner';
      reason?: string;
      channel?: '笔记' | '对话记录';
    },
  ): Promise<UploadItemView> {
    const abs = join(this.dir(mainId, upload), unit.file);
    const title = basename(unit.file).replace(extname(unit.file), '') || unit.file;
    const base = {
      upload,
      file: unit.file,
      routedTo: how.to,
      by: how.by,
      ...(how.reason !== undefined ? { reason: how.reason } : {}),
    };
    let landed: { material?: string; import?: string; problem?: string };
    try {
      if (unit.kind === 'unsupported') {
        landed = {
          problem:
            '这种文件还转不了（能转：PDF、md、txt、网页、字幕、代码等文字）；可先导出成 PDF 再传',
        };
      } else if (how.to === '资料') {
        const kind =
          unit.kind === 'pdf' ? 'pdf' : unit.kind === 'subtitle' ? 'subtitle' : ('md' as const);
        landed = { material: await this.o.addMaterial(mainId, { kind, origin: abs, title }) };
      } else {
        landed = {
          import: await this.o.importLearned(mainId, {
            path: abs,
            channel: how.channel ?? (unit.kind === 'chat' ? '对话记录' : '笔记'),
            title,
          }),
        };
      }
    } catch (err) {
      if (!(err instanceof BadRequestError)) throw err;
      landed = { problem: err.message };
    }
    const rec = { ...base, ...landed };
    await this.o.record(mainId, rec);
    return { ...rec, at: this.o.iso() };
  }
}

/** 上传里的相对路径：去掉开头的斜杠与 `..`，不许跑出上传目录。 */
function safeRelative(p: string): string {
  const n = normalize(p.replaceAll('\\', '/'))
    .split('/')
    .filter((s) => s !== '' && s !== '.' && s !== '..')
    .join('/');
  if (n === '') throw new BadRequestError(`文件名不对：${p}`);
  return n;
}

/**
 * 一批路径分成一份份：顶层文件各一份；文件夹里的 PDF、字幕、转不了的各一份，其余文字连同图片整个文件夹一份
 * （全是 .md / .txt = 笔记文件夹，交模型判；有代码等别的文字 = 资料）。
 */
function units(paths: string[], binary: Set<string>): Unit[] {
  const out: Unit[] = [];
  const folders = new Map<string, string[]>();
  for (const p of paths) {
    const top = p.split('/')[0] ?? p;
    if (top === p) out.push({ file: p, kind: fileKind(p, binary.has(p)) });
    else folders.set(top, [...(folders.get(top) ?? []), p]);
  }
  for (const [top, inside] of folders) {
    let texts = 0;
    let notes = true;
    for (const p of inside) {
      const ext = extname(p).toLowerCase();
      if (IMAGE_EXT.has(ext)) continue;
      const kind = fileKind(p, binary.has(p));
      if (kind === 'pdf' || kind === 'subtitle' || kind === 'unsupported') {
        out.push({ file: p, kind });
        continue;
      }
      texts++;
      if (!NOTE_EXT.has(ext)) notes = false;
    }
    if (texts > 0) out.push({ file: top, kind: notes ? 'notes' : 'text' });
  }
  return out;
}

function fileKind(p: string, binary: boolean): UnitKind {
  const ext = extname(p).toLowerCase();
  if (ext === '.pdf') return 'pdf';
  if (ext === '.srt' || ext === '.vtt') return 'subtitle';
  if (NOTE_EXT.has(ext)) return 'notes';
  if (ext === '.json') return 'chat';
  if (BINARY_EXT.has(ext) || IMAGE_EXT.has(ext) || binary) return 'unsupported';
  return 'text';
}

/** 改判时从盘上重新认文件夹：全是 .md / .txt 的算笔记文件夹。 */
async function folderKind(dir: string): Promise<UnitKind> {
  const walk = async (d: string): Promise<boolean> => {
    for (const e of await readdir(d, { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (!(await walk(join(d, e.name)))) return false;
        continue;
      }
      const ext = extname(e.name).toLowerCase();
      if (!NOTE_EXT.has(ext) && !IMAGE_EXT.has(ext)) return false;
    }
    return true;
  };
  return (await walk(dir)) ? 'notes' : 'text';
}

function canBeLearned(kind: UnitKind): boolean {
  return kind === 'notes' || kind === 'chat';
}

/** 给模型看的样子：文件开头一段；文件夹 = 文件清单 + 第一份的开头。只够判归哪类。 */
async function sample(abs: string): Promise<string> {
  const st = await stat(abs);
  if (!st.isDirectory()) return (await readFile(abs, 'utf8')).slice(0, 3000);
  const names: string[] = [];
  const walk = async (d: string, rel: string): Promise<void> => {
    for (const e of await readdir(d, { withFileTypes: true })) {
      if (names.length >= 40) return;
      const r = rel === '' ? e.name : `${rel}/${e.name}`;
      if (e.isDirectory()) await walk(join(d, e.name), r);
      else names.push(r);
    }
  };
  await walk(abs, '');
  const first = names.find((n) => NOTE_EXT.has(extname(n).toLowerCase()));
  const head = first !== undefined ? (await readFile(join(abs, first), 'utf8')).slice(0, 2000) : '';
  return `文件夹里的文件：\n${names.join('\n')}\n\n${first ?? ''} 开头：\n${head}`;
}
