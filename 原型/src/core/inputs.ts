// 输入（批 4，`docs/设计/记录/对话与事件记录.md`）：学习者附的图片（拍照 / 手写）。
// 原图只追加地存进输入存放处（<数据>/inputs/），写入后不改、不删。W12 §5.6 起图片原样随消息送给模型（不再转写）；
// 太大的由界面缩小一份副本送去（原图照存）。旧数据的转写记录（transcriptions.jsonl）留在磁盘，不再读。
import { createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  IMAGE_MIME_TYPES,
  type AttachmentView,
  type ImageMime,
  type InputDisclosure,
} from '../shared/protocol.ts';
import type { ImageInput } from '../shared/records.ts';
import { appendJsonl, readJsonl } from './knowledge/jsonl.ts';
import type { ImageData, ModelDisclosure } from './model/port.ts';

/** 带 HTTP 状态的输入错误：说给学习者听的话。 */
export class InputError extends Error {
  constructor(
    readonly status: 400 | 404 | 413 | 415 | 501 | 502,
    message: string,
  ) {
    super(message);
  }
}

/** 一次上传最多收多大（原图原样保存，手机照片一般几 MB）。 */
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

const EXT: Record<ImageMime, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

interface StoredImage {
  id: string;
  at: string;
  mime: ImageMime;
  size: number;
  sha256: string;
  name?: string;
  derivedFrom?: string;
}

export interface InputsOptions {
  /** 存放处目录（<数据>/inputs）。 */
  dir: string;
  now?: () => Date;
}

export class Inputs {
  private constructor(
    private readonly o: InputsOptions,
    private readonly images: Map<string, StoredImage>,
  ) {}

  static async load(o: InputsOptions): Promise<Inputs> {
    const images = await readJsonl<StoredImage>(join(o.dir, 'images.jsonl'));
    return new Inputs(o, new Map(images.map((i) => [i.id, i])));
  }

  /** 原图所在的目录（学习对话的沙盒把它挂成只读的 `附图/`）。 */
  get imagesDir(): string {
    return this.dir('images');
  }

  /** 送给模型的那张（有副本就用副本）：字节、类型、文件名。 */
  async forModel(r: ImageInput): Promise<ImageData & { file: string }> {
    const row = this.stored(r.sentAs ?? r.attachmentId);
    return {
      mime: row.mime,
      data: await readFile(this.file(row)),
      file: `${row.id}.${EXT[row.mime]}`,
    };
  }

  // ───────────── 原图 ─────────────

  /** 存一张图：原样写进存放处（文件已存在就报错，不覆盖），再记一行。 */
  async save(
    data: Buffer,
    mime: string | undefined,
    meta: { name?: string; derivedFrom?: string } = {},
  ): Promise<AttachmentView> {
    const type = (mime ?? '').split(';')[0]?.trim().toLowerCase() ?? '';
    if (!isImageMime(type)) {
      throw new InputError(
        415,
        `只收图片（${IMAGE_MIME_TYPES.join('、')}），收到的是 ${type || '未知类型'}`,
      );
    }
    if (data.length === 0) throw new InputError(400, '图片是空的');
    if (data.length > MAX_IMAGE_BYTES) {
      throw new InputError(413, `图片太大（最多 ${String(MAX_IMAGE_BYTES / 1024 / 1024)} MB）`);
    }
    if (meta.derivedFrom !== undefined) this.stored(meta.derivedFrom);
    const row: StoredImage = {
      id: `img-${randomBytes(6).toString('hex')}`,
      at: this.iso(),
      mime: type,
      size: data.length,
      sha256: createHash('sha256').update(data).digest('hex'),
      ...(meta.name !== undefined && meta.name !== '' ? { name: meta.name } : {}),
      ...(meta.derivedFrom !== undefined ? { derivedFrom: meta.derivedFrom } : {}),
    };
    await mkdir(this.dir('images'), { recursive: true });
    // wx：同名文件已在就失败——原图一旦写下不再改
    await writeFile(this.file(row), data, { flag: 'wx' });
    await appendJsonl(join(this.o.dir, 'images.jsonl'), row);
    this.images.set(row.id, row);
    return view(row);
  }

  /** 取原图字节。 */
  async image(id: string): Promise<{ mime: ImageMime; data: Buffer }> {
    const row = this.stored(id);
    return { mime: row.mime, data: await readFile(this.file(row)) };
  }

  // ───────────── 并进消息 ─────────────

  /**
   * 学习者打的字和附的图（W12 §5.6）：文字原样，图片记原图 id 与送去的副本 id。引用对不上就报错，什么都不记。
   * 只附图、不打字也行。
   */
  compose(text: unknown, images: unknown): { text: string; images: ImageInput[] } {
    const typed = typeof text === 'string' ? text : '';
    if (images === undefined || (Array.isArray(images) && images.length === 0)) {
      if (typed.trim() === '') throw new InputError(400, 'text 不能为空');
      return { text: typed, images: [] };
    }
    if (!Array.isArray(images)) throw new InputError(400, 'images 要是数组');
    const refs = images.map((x: unknown, i) => this.ref(x, i + 1));
    return { text: typed.trim(), images: refs };
  }

  private ref(x: unknown, n: number): ImageInput {
    const o = (typeof x === 'object' && x !== null ? x : {}) as Record<string, unknown>;
    const id = o.attachmentId;
    if (typeof id !== 'string' || !this.images.has(id)) {
      throw new InputError(400, `第 ${String(n)} 张图找不到（可能还没传完），重新加一下`);
    }
    const copy = o.sentAs;
    if (
      copy !== undefined &&
      (typeof copy !== 'string' || this.images.get(copy)?.derivedFrom !== id)
    ) {
      throw new InputError(400, `第 ${String(n)} 张图的缩小副本对不上这张图`);
    }
    return { attachmentId: id, sent: '', ...(typeof copy === 'string' ? { sentAs: copy } : {}) };
  }

  // ───────────── 外发披露 ─────────────

  disclosure(d: ModelDisclosure | undefined): InputDisclosure[] {
    return [
      {
        what: '图片（拍照 / 手写）',
        service: d?.service ?? '未声明（这个模型接口没有说明内容送往哪里）',
        model: null,
        note: `你附的图片随消息原样送给对话的模型${d ? `（${d.route}）` : ''}；太大的先在浏览器里缩小一份再送。原图只存在本机数据目录。`,
      },
      {
        what: '语音输入',
        service: '浏览器自带的语音识别服务（由浏览器决定，如 Chrome 送往 Google 的服务器）',
        model: null,
        note: '声音由浏览器直接送去识别，不经过 Studium，也不保存录音；识别出的文字先进输入框，你改过、发送后才进对话。',
      },
    ];
  }

  // ───────────── 共用 ─────────────

  private stored(id: string): StoredImage {
    const row = this.images.get(id);
    if (row === undefined) throw new InputError(404, `没有这张图：${id}`);
    return row;
  }

  private dir(sub: string): string {
    return join(this.o.dir, sub);
  }

  private file(row: StoredImage): string {
    return join(this.dir('images'), `${row.id}.${EXT[row.mime]}`);
  }

  private iso(): string {
    return (this.o.now ?? (() => new Date()))().toISOString();
  }
}

function isImageMime(t: string): t is ImageMime {
  return (IMAGE_MIME_TYPES as readonly string[]).includes(t);
}

function view(r: StoredImage): AttachmentView {
  return { ...r, url: `/api/attachments/${r.id}` };
}
