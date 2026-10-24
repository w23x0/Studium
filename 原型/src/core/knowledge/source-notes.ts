// 资料的来源说明补充存放处（`docs/设计/记录/资料.md`）：学习者或模型给某份资料补的一句（类型、层次、作者、适用范围、备注）。
// 只追加，不改资料；同一项补了多次，取最新一条，旧的留着。
import { join } from 'node:path';
import type { SourceNoteAddition } from '../../shared/protocol.ts';
import { appendJsonl, readJsonl } from './jsonl.ts';

export class SourceNotes {
  private constructor(
    private readonly path: string,
    private readonly rows: SourceNoteAddition[],
  ) {}

  static async load(dir: string): Promise<SourceNotes> {
    const path = join(dir, 'records.jsonl');
    return new SourceNotes(path, await readJsonl<SourceNoteAddition>(path));
  }

  async add(r: SourceNoteAddition): Promise<void> {
    await appendJsonl(this.path, r);
    this.rows.push(r);
  }

  /** 某本书的全部补充，旧的在前。 */
  forBook(book: string): SourceNoteAddition[] {
    return this.rows.filter((r) => r.book === book);
  }

  all(): SourceNoteAddition[] {
    return [...this.rows];
  }
}
