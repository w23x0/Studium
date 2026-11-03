// 上传与分流（工单 W9 §4.1 §4.2；设计 docs/设计/记录/资料.md「入口」）：学习者拖进来 / 点“添加”的文件
// 原样存进 <数据>/projects/<主对话 id>/上传/<上传 id>/，再一份份分到资料或学过的（外部导入）。
// 程序先按扩展名粗分；.md / .txt / .json 这类拿不准的交模型判一次（只回归哪类、归谁 + 一句理由，不分析内容）。
// 每次判、改判在主对话正本追加 upload_routed，以最后一条为准。两边都建成一份资料（W11：存在一处），
// 学过的另在外部导入里追加一条指向它的指针；主对话给的本机路径（import_local）也从这里进。
import {
  copyFile,
  lstat,
  mkdir,
  readdir,
  readFile,
  realpath,
  stat,
  writeFile,
} from 'node:fs/promises';
import { basename, dirname, extname, join, normalize } from 'node:path';
import type {
  AddMaterialRequest,
  MaterialKind,
  MaterialOwner,
  UploadItemView,
} from '../shared/protocol.ts';
import type { LogRecord, UploadRouted } from '../shared/records.ts';
import { UNSUPPORTED_EXT } from './knowledge/materials.ts';
import { BadRequestError } from './studium.ts';

/** 一次最多传多少个文件（参照 Claude）。 */
export const MAX_UPLOAD_FILES = 100;
/** 单个文件上限。 */
export const MAX_UPLOAD_FILE_BYTES = 100 * 1024 * 1024;
/** 一次上传合计上限。 */
export const MAX_UPLOAD_BYTES = 300 * 1024 * 1024;
/** 本机路径导入（import_local）一次最多多少个文件（笔记文件夹常过百）。 */
export const MAX_LOCAL_FILES = 3000;

type Owner = '学习者' | '项目';
/** 没判出归属时的默认（W11 §2）：学过的 → 学习者；资料 → 项目。 */
export function defaultOwner(to: '资料' | '学过的'): Owner {
  return to === '学过的' ? '学习者' : '项目';
}

/** 界面与记录里的归属两个字 → source.json 里的归属。 */
export function ownerOf(o: Owner, mainId: string): MaterialOwner {
  return o === '学习者' ? { kind: 'learner' } : { kind: 'project', projects: [mainId] };
}

export interface UploadsDeps {
  /** <数据>/projects。 */
  root: string;
  newId: (prefix: string) => string;
  iso: () => string;
  addMaterial: (mainId: string, req: AddMaterialRequest) => Promise<string>;
  /** 改判时改那份资料的“学过的”标记与归属，并重做工作层。 */
  relabel: (
    mainId: string,
    id: string,
    learned: { channel: '笔记' | '对话记录' } | undefined,
    owner: MaterialOwner,
  ) => Promise<void>;
  /** 资料现在的归属（改过就是改后的）；找不到给空。 */
  ownerNow: (id: string) => Promise<Owner | undefined>;
  importLearned: (
    mainId: string,
    x: { material: string; channel: '笔记' | '对话记录'; title: string },
  ) => Promise<string>;
  removeImport: (id: string) => Promise<void>;
  record: (mainId: string, r: Omit<UploadRouted, 'type' | 'at'>) => Promise<void>;
  records: (mainId: string) => Promise<LogRecord[]>;
}

/** 一份上传的东西（单个文件，或整个文件夹）。image / doc = 不是纯文字、交导入会话处理的（W11 §4）。 */
type UnitKind = 'pdf' | 'subtitle' | 'notes' | 'chat' | 'text' | 'image' | 'doc' | 'unsupported';

interface Unit {
  /** 上传里的相对路径（文件夹 = 文件夹名）。 */
  file: string;
  kind: UnitKind;
  /** 给了就用它作标题（import_local 只导入一份时）；不给 = 文件名。 */
  title?: string;
}

const NOTE_EXT = new Set(['.md', '.markdown', '.txt']);
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp']);
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
    return this.landAll(mainId, upload, paths, binary);
  }

  /**
   * 本机路径导入（W11 §5，主对话的 import_local）：先数清文件数与总大小（超了直接拒，不先拷），再把这个文件或
   * 文件夹原样拷进 `上传/<上传 id>/`，之后和拖进来的走完全一样的分流与落地。路径本身能不能导入由调用方先查；
   * 里面的符号链接：指向 `allowed` 不认的位置（被挡的、家目录外的）不跟；指向文件夹的也不跟（免得绕圈）。
   * 回落地结果与没跟的链接。
   */
  async saveFromPath(
    mainId: string,
    abs: string,
    allowed: (real: string) => boolean,
    title?: string,
  ): Promise<{ items: UploadItemView[]; skipped: string[] }> {
    const name = basename(abs);
    const files: { rel: string; from: string; size: number }[] = [];
    const skipped: string[] = [];
    const visit = async (from: string, rel: string): Promise<void> => {
      if (files.length > MAX_LOCAL_FILES) return;
      const st = await lstat(from);
      if (st.isSymbolicLink()) {
        let target: string;
        try {
          target = await realpath(from);
        } catch (err) {
          if ((err as { code?: string }).code !== 'ENOENT') throw err;
          skipped.push(`${rel}（链接指向的东西不在了）`);
          return;
        }
        const ts = await stat(target);
        if (!allowed(target) || !ts.isFile()) {
          skipped.push(`${rel}（链接指向${ts.isFile() ? '不让读的位置' : '文件夹'}，没跟）`);
          return;
        }
        files.push({ rel, from: target, size: ts.size });
        return;
      }
      if (st.isDirectory()) {
        if (rel !== name && (basename(from) === '.git' || basename(from) === 'node_modules'))
          return;
        for (const e of (await readdir(from)).sort()) await visit(join(from, e), `${rel}/${e}`);
        return;
      }
      if (st.isFile()) files.push({ rel, from, size: st.size });
    };
    await visit(abs, name);
    if (files.length === 0) throw new BadRequestError('这里没有能导入的文件');
    if (files.length > MAX_LOCAL_FILES) {
      throw new BadRequestError(
        `一次最多导入 ${String(MAX_LOCAL_FILES)} 个文件，这里更多；挑子文件夹导入`,
      );
    }
    const bytes = files.reduce((n, f) => n + f.size, 0);
    if (bytes > MAX_UPLOAD_BYTES) {
      throw new BadRequestError(
        `合计 ${String(Math.round(bytes / 1024 / 1024))} MB，超过 ${String(MAX_UPLOAD_BYTES / 1024 / 1024)} MB；挑子文件夹导入`,
      );
    }
    const upload = this.o.newId('up');
    const dir = this.dir(mainId, upload);
    const paths: string[] = [];
    const binary = new Set<string>();
    for (const f of files) {
      const to = join(dir, f.rel);
      await mkdir(dirname(to), { recursive: true });
      await copyFile(f.from, to);
      paths.push(f.rel);
      const data = await readFile(to);
      if (data.subarray(0, 8000).includes(0)) binary.add(f.rel);
    }
    return { items: await this.landAll(mainId, upload, paths, binary, title), skipped };
  }

  private async landAll(
    mainId: string,
    upload: string,
    paths: string[],
    binary: Set<string>,
    title?: string,
  ): Promise<UploadItemView[]> {
    const out: UploadItemView[] = [];
    const all = units(paths, binary);
    for (const unit of all) {
      out.push(
        await this.land(
          mainId,
          upload,
          title !== undefined && all.length === 1 ? { ...unit, title } : unit,
        ),
      );
    }
    return out;
  }

  /** 本项目所有上传的现状（每份取最后一条 upload_routed；归属取那份资料现在的），新的在前。 */
  async list(mainId: string): Promise<UploadItemView[]> {
    const latest = new Map<string, UploadItemView>();
    for (const r of await this.o.records(mainId)) {
      if (r.type !== 'upload_routed') continue;
      const view: UploadItemView = { ...r };
      delete (view as Partial<typeof r>).type;
      latest.set(`${r.upload}\u0001${r.file}`, view);
    }
    const out = [...latest.values()].reverse();
    for (const v of out) {
      const now = v.material !== undefined ? await this.o.ownerNow(v.material) : undefined;
      if (now !== undefined) v.owner = now;
    }
    return out;
  }

  /**
   * 学习者改判（以学习者为准）：资料存在一处，改的是同一份资料的“学过的”标记与归属（归属换成那边的默认，
   * 不对再点改归属），学过的那边另加 / 删外部导入的指针；工作层重做一遍。没落下的（转不了）照旧报错。
   */
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
      kind: st.isDirectory()
        ? await folderKind(abs)
        : fileKind(file, (await readFile(abs)).subarray(0, 8000).includes(0)),
    };
    if (unit.kind === 'unsupported') throw new BadRequestError('这种文件还转不了，改判也落不下');
    const owner = defaultOwner(to);
    const channel = to === '学过的' ? (unit.kind === 'chat' ? '对话记录' : '笔记') : undefined;
    if (now.material === undefined) {
      return this.put(mainId, upload, unit, {
        to,
        by: 'learner',
        owner,
        ...(channel !== undefined ? { channel } : {}),
      });
    }
    await this.o.relabel(
      mainId,
      now.material,
      channel !== undefined ? { channel } : undefined,
      ownerOf(owner, mainId),
    );
    if (now.import !== undefined) await this.o.removeImport(now.import);
    const imp =
      channel !== undefined
        ? await this.o.importLearned(mainId, {
            material: now.material,
            channel,
            title: titleOf(file),
          })
        : undefined;
    const rec = {
      upload,
      file,
      routedTo: to,
      by: 'learner' as const,
      owner,
      material: now.material,
      ...(imp !== undefined ? { import: imp } : {}),
    };
    await this.o.record(mainId, rec);
    return { ...rec, at: this.o.iso() };
  }

  /**
   * 判一份：扩展名定得了的直接定；拿不准的（笔记、对话导出）先按扩展名放，交导入会话看内容再判归哪边、归谁
   * （W12 §1.6，取代单独的一次判断）；然后落地。
   */
  private async land(mainId: string, upload: string, unit: Unit): Promise<UploadItemView> {
    if (unit.kind !== 'notes' && unit.kind !== 'chat') {
      return this.put(mainId, upload, unit, {
        to: '资料',
        by: 'model',
        owner: defaultOwner('资料'),
        reason:
          unit.kind === 'unsupported'
            ? '按扩展名：音频、视频、压缩包这类收不了'
            : `按扩展名：${KIND_WORD[unit.kind]}先当资料，不对就点改`,
      });
    }
    return this.put(
      mainId,
      upload,
      unit,
      unit.kind === 'chat'
        ? {
            to: '学过的',
            channel: '对话记录',
            by: 'model',
            owner: '学习者',
            reason: '按扩展名：.json 多是对话导出，导入时再看内容判',
          }
        : {
            to: '资料',
            by: 'model',
            owner: '项目',
            reason: '按扩展名先当资料，导入时再看内容判',
          },
      true,
    );
  }

  /** 落地并记一条 upload_routed：两边都建一份资料；学过的另追加一条外部导入。 */
  private async put(
    mainId: string,
    upload: string,
    unit: Unit,
    how: {
      to: '资料' | '学过的';
      by: 'model' | 'learner';
      owner: Owner;
      reason?: string;
      channel?: '笔记' | '对话记录';
    },
    /** 交导入会话看内容再判归哪边、归谁（W12 §1.6）。 */
    classify = false,
  ): Promise<UploadItemView> {
    const abs = join(this.dir(mainId, upload), unit.file);
    const title = unit.title ?? titleOf(unit.file);
    const base = {
      upload,
      file: unit.file,
      routedTo: how.to,
      by: how.by,
      owner: how.owner,
      ...(how.reason !== undefined ? { reason: how.reason } : {}),
    };
    let landed: { material?: string; import?: string; problem?: string };
    try {
      if (unit.kind === 'unsupported') {
        landed = {
          problem: '音频、视频、可执行文件、压缩包这类收不了；解压或导出成文档、图片再传',
        };
      } else {
        const kind: MaterialKind =
          unit.kind === 'pdf'
            ? 'pdf'
            : unit.kind === 'subtitle'
              ? 'subtitle'
              : unit.kind === 'image' || unit.kind === 'doc'
                ? 'file'
                : 'md';
        const channel =
          how.to === '学过的'
            ? (how.channel ?? (unit.kind === 'chat' ? '对话记录' : '笔记'))
            : undefined;
        const material = await this.o.addMaterial(mainId, {
          kind,
          origin: abs,
          title,
          owner: ownerOf(how.owner, mainId),
          ...(channel !== undefined ? { learned: { channel } } : {}),
          ...(classify ? { classify: { upload, file: unit.file } } : {}),
        });
        landed = {
          material,
          ...(channel !== undefined
            ? { import: await this.o.importLearned(mainId, { material, channel, title }) }
            : {}),
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

/** 按扩展名先当资料时，理由里那几个字。 */
const KIND_WORD: Record<UnitKind, string> = {
  pdf: 'PDF',
  subtitle: '字幕',
  notes: '笔记',
  chat: '对话导出',
  text: '文字 / 代码',
  image: '图片',
  doc: '文档',
  unsupported: '收不了的文件',
};

function titleOf(file: string): string {
  return basename(file).replace(extname(file), '') || file;
}

/**
 * 一批路径分成一份份（W11：笔记保留原目录结构）：顶层文件各一份；一个文件夹整个一份（里面的 PDF、图片也在，
 * 交导入会话；音视频等收不了的原样留在原件里）。文件夹里有 .md / .txt = 可能是笔记，交模型判；
 * 只有代码等别的文字 = 资料；没有文字（只有 PDF、图片等）= 文档。
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
    out.push({ file: top, kind: kindOfFolder(inside.map((p) => fileKind(p, binary.has(p)))) });
  }
  return out;
}

function kindOfFolder(kinds: UnitKind[]): UnitKind {
  // 有 .md / .txt 的交模型判（看文件清单与开头一段；笔记文件夹里常夹着代码、画布、图片）
  if (kinds.some((k) => k === 'notes')) return 'notes';
  if (kinds.some((k) => k === 'text' || k === 'chat')) return 'text';
  if (kinds.some((k) => k === 'subtitle')) return 'notes';
  if (kinds.every((k) => k === 'unsupported')) return 'unsupported';
  return 'doc';
}

function fileKind(p: string, binary: boolean): UnitKind {
  const ext = extname(p).toLowerCase();
  if (ext === '.pdf') return 'pdf';
  if (ext === '.srt' || ext === '.vtt') return 'subtitle';
  if (NOTE_EXT.has(ext)) return 'notes';
  if (ext === '.json' || ext === '.jsonl') return 'chat';
  if (UNSUPPORTED_EXT.has(ext)) return 'unsupported';
  if (IMAGE_EXT.has(ext)) return 'image';
  if (binary) return 'doc';
  return 'text';
}

/** 改判时从盘上重新认文件夹。 */
async function folderKind(dir: string): Promise<UnitKind> {
  const kinds: UnitKind[] = [];
  const walk = async (d: string): Promise<void> => {
    for (const e of await readdir(d, { withFileTypes: true })) {
      if (e.isDirectory()) await walk(join(d, e.name));
      else
        kinds.push(
          fileKind(e.name, (await readFile(join(d, e.name))).subarray(0, 8000).includes(0)),
        );
    }
  };
  await walk(dir);
  return kindOfFolder(kinds);
}
