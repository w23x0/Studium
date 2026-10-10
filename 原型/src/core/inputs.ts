// 输入（批 4，M02:19）：学习者附的图片（拍照 / 手写）。
// 原图只追加地存进输入存放处（<数据>/inputs/），写入后不改、不删；经模型接口转写成文字（公式用 LaTeX），
// 转写结果单独记一行；发消息时转写文字（学习者可改）带来源标注并进消息文字——教学只读文字，图片不给对话模型。
import { createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  IMAGE_MIME_TYPES,
  MODEL_FALLBACK_MARK,
  TRANSCRIBE_MAX_BYTES,
  modelInfoOf,
  type AttachmentInfoResponse,
  type AttachmentView,
  type ImageMime,
  type InputDisclosure,
  type TranscriptionView,
} from '../shared/protocol.ts';
import type { ImageInput } from '../shared/records.ts';
import { appendJsonl, readJsonl } from './knowledge/jsonl.ts';
import type { ModelAdapter, ModelDisclosure } from './model/port.ts';

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

interface StoredTranscription {
  id: string;
  at: string;
  attachmentId: string;
  text: string;
  /** 实际执行的模型；取不到时是适配器名 + 兜底标记（同 model_used 的约定）。 */
  model: string;
}

export interface InputsOptions {
  /** 存放处目录（<数据>/inputs）。 */
  dir: string;
  model: ModelAdapter;
  /** 转写的系统提示（prompts/transcribe.md）。 */
  instructions: string;
  now?: () => Date;
}

export class Inputs {
  private constructor(
    private readonly o: InputsOptions,
    private readonly images: Map<string, StoredImage>,
    private readonly transcriptions: StoredTranscription[],
  ) {}

  static async load(o: InputsOptions): Promise<Inputs> {
    const images = await readJsonl<StoredImage>(join(o.dir, 'images.jsonl'));
    const trs = await readJsonl<StoredTranscription>(join(o.dir, 'transcriptions.jsonl'));
    return new Inputs(o, new Map(images.map((i) => [i.id, i])), trs);
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

  info(id: string): AttachmentInfoResponse {
    const row = this.stored(id);
    const family = new Set([
      id,
      ...[...this.images.values()].filter((i) => i.derivedFrom === id).map((i) => i.id),
    ]);
    return {
      attachment: view(row),
      transcriptions: this.transcriptions
        .filter((t) => family.has(t.attachmentId))
        .map(transcriptionView),
    };
  }

  // ───────────── 转写 ─────────────

  async transcribe(id: string): Promise<TranscriptionView> {
    const row = this.stored(id);
    const t = this.o.model.transcriber;
    if (t === undefined) {
      throw new InputError(
        501,
        `现在用的模型接口（${this.o.model.name}）不支持图片转写。图片已经存好，可以把图里的内容自己打出来再发。`,
      );
    }
    if (row.size > TRANSCRIBE_MAX_BYTES) {
      throw new InputError(
        413,
        `图片太大，转写一次最多 ${(TRANSCRIBE_MAX_BYTES / 1024 / 1024).toFixed(1)} MB。原图已经存好；缩小或裁一下再试。`,
      );
    }
    let r: Awaited<ReturnType<typeof t.transcribe>>;
    try {
      r = await t.transcribe(
        { mime: row.mime, data: await readFile(this.file(row)) },
        this.o.instructions,
      );
    } catch (err) {
      console.error(`图片 ${id} 转写失败：`, err);
      const why = err instanceof Error ? err.message : String(err);
      throw new InputError(502, `转写没成功（${why}）。图片已经存好，可以再试一次或自己打出来。`);
    }
    const tr: StoredTranscription = {
      id: `tr-${randomBytes(6).toString('hex')}`,
      at: this.iso(),
      attachmentId: id,
      text: r.text,
      model:
        r.model !== undefined && r.model !== ''
          ? r.model
          : `${this.o.model.name}（适配器名；${MODEL_FALLBACK_MARK}）`,
    };
    await appendJsonl(join(this.o.dir, 'transcriptions.jsonl'), tr);
    this.transcriptions.push(tr);
    return transcriptionView(tr);
  }

  // ───────────── 并进消息 ─────────────

  /**
   * 把学习者打的字和附的图合成一条消息：每张图的文字（改过的转写 / 照转写 / 学习者自己写的说明）
   * 带一行来源标注接在后面（转写文本标来源，M02:19）。引用对不上就报错，什么都不记。
   */
  compose(text: unknown, images: unknown): { text: string; images: ImageInput[] } {
    const typed = typeof text === 'string' ? text.trim() : '';
    if (images === undefined || (Array.isArray(images) && images.length === 0)) {
      if (typed === '' || typeof text !== 'string') throw new InputError(400, 'text 不能为空');
      return { text, images: [] };
    }
    if (!Array.isArray(images)) throw new InputError(400, 'images 要是数组');
    const refs = images.map((x: unknown, i) => this.ref(x, i + 1));
    const parts = typed === '' ? [] : [typed];
    refs.forEach((r, i) => {
      parts.push(`${imageLabel(i + 1, r)}\n${r.sent}`.trimEnd());
    });
    return { text: parts.join('\n\n'), images: refs };
  }

  private ref(x: unknown, n: number): ImageInput {
    const o = (typeof x === 'object' && x !== null ? x : {}) as Record<string, unknown>;
    const id = o.attachmentId;
    if (typeof id !== 'string' || !this.images.has(id)) {
      throw new InputError(400, `第 ${String(n)} 张图找不到（可能还没传完），重新加一下`);
    }
    const own = typeof o.text === 'string' ? o.text.trim() : undefined;
    if (o.transcriptionId === undefined) {
      return { attachmentId: id, sent: own ?? '' };
    }
    const tr = this.transcriptions.find((t) => t.id === o.transcriptionId);
    const of = tr ? this.images.get(tr.attachmentId) : undefined;
    if (tr === undefined || (tr.attachmentId !== id && of?.derivedFrom !== id)) {
      throw new InputError(400, `第 ${String(n)} 张图的转写对不上这张图`);
    }
    return {
      attachmentId: id,
      transcriptionId: tr.id,
      ...(tr.attachmentId !== id ? { transcribedFrom: tr.attachmentId } : {}),
      transcript: tr.text,
      sent: own ?? tr.text,
      model: tr.model,
    };
  }

  // ───────────── 外发披露 ─────────────

  disclosure(d: ModelDisclosure | undefined): InputDisclosure[] {
    const t = this.o.model.transcriber;
    return [
      t
        ? {
            what: '图片（拍照 / 手写）的转写',
            service: d?.service ?? '未声明（这个模型接口没有说明内容送往哪里）',
            model: t.model ?? null,
            note: `你加的图片会原样送去转写${d ? `（${d.route}）` : ''}，转写出的文字经你核对后才进对话；对话里只送文字，不送图片。原图只存在本机数据目录。`,
          }
        : {
            what: '图片（拍照 / 手写）的转写',
            service: `不支持（现在用的模型接口 ${this.o.model.name} 做不了图片转写）`,
            model: null,
            note: '图片只存在本机数据目录，不送往任何服务；图里的内容需要你自己打出来。',
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

function transcriptionView(t: StoredTranscription): TranscriptionView {
  return {
    id: t.id,
    at: t.at,
    attachmentId: t.attachmentId,
    text: t.text,
    model: modelInfoOf(t.model),
  };
}

/** 图片文字前的来源标注（学习者和模型都看得到）。 */
function imageLabel(n: number, r: ImageInput): string {
  const k = `图片 ${String(n)}`;
  if (r.transcript === undefined) {
    return r.sent === '' ? `［${k} · 没有转写］` : `［${k} · 学习者写的说明］`;
  }
  return r.sent === r.transcript
    ? `［${k} · 自动转写，可能有误］`
    : `［${k} · 自动转写，发送前改过］`;
}
