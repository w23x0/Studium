// 资料的来源说明（批 10b）：每份资料的类型、层次、作者、适用范围、转写质量（学习者报错数与有没有原件）。
// 程序能算的算，其余学习者或模型补一句（只追加）。对应 `docs/设计/记录/资料.md`。
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import {
  SOURCE_NOTE_FIELDS,
  type NoteItem,
  type SourceNoteAddition,
  type SourceNoteField,
  type SourceNoteView,
} from '../shared/protocol.ts';
import { NotFoundError } from './hub.ts';
import type { SourceReader } from './knowledge/materials.ts';
import type { Originals } from './knowledge/originals.ts';
import type { SourceReports } from './knowledge/source-reports.ts';
import type { SourceNotes } from './knowledge/source-notes.ts';
import type { ToolResult, ToolSpec } from './model/port.ts';
import { BadRequestError } from './studium.ts';

/** 补一句来源说明最多多少字。 */
const NOTE_MAX = 300;

export interface CrosslinksDeps {
  materials: SourceReader;
  reports: SourceReports;
  originals: Originals;
  notes: SourceNotes;
  now?: () => Date;
}

export class Crosslinks {
  private readonly now: () => Date;

  constructor(private readonly d: CrosslinksDeps) {
    this.now = d.now ?? (() => new Date());
  }

  // ───────────── 来源可靠性与适用性说明 ─────────────

  private async bookId(name: string): Promise<string> {
    const books = await this.d.materials.books();
    const id = books.includes(name) ? name : books.find((b) => b.trim() === name.trim());
    if (id === undefined) throw new NotFoundError(`没有这份资料：${name}`);
    return id;
  }

  async sourceNotes(): Promise<SourceNoteView[]> {
    const out: SourceNoteView[] = [];
    for (const id of await this.d.materials.books()) out.push(await this.sourceNote(id));
    return out;
  }

  async sourceNote(book: string): Promise<SourceNoteView> {
    const id = await this.bookId(book);
    const src = await this.d.materials.source(id);
    if (src === undefined) throw new NotFoundError(`没有这份资料：${book}`);
    const adds = this.d.notes.forBook(id);
    const latest = (f: SourceNoteField): NoteItem | undefined => {
      const a = adds.filter((x) => x.field === f).at(-1);
      return a === undefined ? undefined : { value: a.text, from: a.by, at: a.at };
    };
    const type = latest('type');
    const author = latest('author');
    const level = latest('level');
    const scope = latest('scope');
    const remark = latest('remark');
    const reports = this.d.reports.list({ book: id }).length;
    const hasOriginal = await this.d.originals.hasOriginal(id);
    const toc = await this.d.materials.toc(id);
    const qParts = [
      reports > 0 ? `学习者报过 ${String(reports)} 处转录错` : '学习者还没报过转录错',
      hasOriginal ? '有 PDF 原件可对照' : '没有 PDF 原件',
    ];
    const text = `${qParts.join('；')}。这些只是已知的数据，不等于没有别的错。`;
    const short = [
      type?.value ?? '类型没说明',
      author !== undefined ? `作者：${author.value}` : undefined,
      level !== undefined ? `层次：${level.value}` : undefined,
      scope !== undefined ? `适用：${scope.value}` : undefined,
      remark !== undefined ? `备注：${remark.value}` : undefined,
      `转写：${reports > 0 ? `报错 ${String(reports)} 处` : '无报错'}${hasOriginal ? '' : '，无原件'}`,
    ].filter((x): x is string => x !== undefined);
    return {
      book: id,
      title: src.title,
      kind: src.kind,
      ...(type !== undefined ? { type } : {}),
      ...(level !== undefined ? { level } : {}),
      ...(author !== undefined ? { author } : {}),
      ...(scope !== undefined ? { scope } : {}),
      ...(remark !== undefined ? { remark } : {}),
      sections: toc.filter((e) => e.file !== undefined).length,
      hasOriginal,
      quality: { reports, text },
      additions: adds,
      summary: `《${src.title}》${short.join('；')}`,
    };
  }

  /** 补一句来源说明（只追加）：学习者在资料页补，模型经工具补（须说明依据）。 */
  async addNote(req: {
    book: string;
    field: string;
    text: string;
    by: '学习者' | '模型';
    sessionId?: string;
    basis?: string;
  }): Promise<SourceNoteAddition> {
    const id = await this.bookId(req.book);
    if (!(SOURCE_NOTE_FIELDS as readonly string[]).includes(req.field)) {
      throw new BadRequestError(`field 要是 ${SOURCE_NOTE_FIELDS.join(' / ')} 之一`);
    }
    const text = req.text.trim();
    if (text === '') throw new BadRequestError('text 不能为空');
    if (text.length > NOTE_MAX)
      throw new BadRequestError(`一句话说完，不超过 ${String(NOTE_MAX)} 字`);
    const row: SourceNoteAddition = {
      id: `sn-${randomBytes(4).toString('hex')}`,
      at: this.now().toISOString(),
      book: id,
      field: req.field as SourceNoteField,
      text,
      by: req.by,
      ...(req.sessionId !== undefined ? { sessionId: req.sessionId } : {}),
      ...(req.basis !== undefined && req.basis.trim() !== '' ? { basis: req.basis.trim() } : {}),
    };
    await this.d.notes.add(row);
    return row;
  }

  /** 给模型工具结果末尾附的来源说明（每份资料一行）；认不出的 id 跳过。 */
  async noteLines(books: string[]): Promise<string> {
    const lines: string[] = [];
    for (const b of [...new Set(books)]) {
      try {
        lines.push(`- ${(await this.sourceNote(b)).summary}`);
      } catch (err) {
        if (!(err instanceof NotFoundError)) throw err;
      }
    }
    return lines.length > 0
      ? `\n\n来源说明（只是已知情况，不是打分；转写质量有疑问时以原文页面为准）：\n${lines.join('\n')}`
      : '';
  }

  addNoteTool(sessionId: string): ToolSpec {
    return {
      name: 'add_source_note',
      description:
        '给一份资料补一句来源说明：type 类型（教材 / 讲义 / 论文 / 网页 / 代码仓库）· level 层次 · author 作者 · scope 适用范围 · remark 已知限制。只在你读到依据时写（basis 写你读了什么），拿不准不写；只追加，学习者看得到，也能自己改。',
      input: {
        book: z.string(),
        field: z.enum(SOURCE_NOTE_FIELDS),
        text: z.string().describe('一句话'),
        basis: z.string().min(1).describe('依据：读了哪个目录 / 哪段原文'),
      },
      run: async (a) => {
        try {
          await this.addNote({
            book: a.book as string,
            field: a.field as string,
            text: a.text as string,
            by: '模型',
            sessionId,
            basis: a.basis as string,
          });
        } catch (e) {
          if (e instanceof NotFoundError || e instanceof BadRequestError) return err(e.message);
          throw e;
        }
        return ok('已记下（只追加；学习者在资料页能看到来历）');
      },
    };
  }
}

function ok(text: string): Promise<ToolResult> {
  return Promise.resolve({ text });
}

function err(text: string): Promise<ToolResult> {
  return Promise.resolve({ text, isError: true });
}
