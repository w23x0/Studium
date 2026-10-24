// 资料报错存放处：学习者对某段资料原文报的错（转录错、公式错、定位错……）。只追加，不改资料里的任何文件。
// 回资料修订是后续的事；现在先记下来、能列出（`docs/设计/记录/资料.md`）。
import { join } from 'node:path';
import type { SourceReport } from '../../shared/records.ts';
import { appendJsonl, readJsonl } from './jsonl.ts';

export class SourceReports {
  private constructor(
    private readonly path: string,
    private readonly rows: SourceReport[],
  ) {}

  static async load(dir: string): Promise<SourceReports> {
    const path = join(dir, 'records.jsonl');
    return new SourceReports(path, await readJsonl<SourceReport>(path));
  }

  async add(r: SourceReport): Promise<void> {
    await appendJsonl(this.path, r);
    this.rows.push(r);
  }

  /** 全部报错，新的在后；可按书 / 小节文件筛。 */
  list(filter: { book?: string; file?: string } = {}): SourceReport[] {
    return this.rows.filter(
      (r) =>
        (filter.book === undefined || r.book === filter.book) &&
        (filter.file === undefined || r.file === filter.file),
    );
  }
}
