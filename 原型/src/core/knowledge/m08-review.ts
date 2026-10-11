// M08 候选区与更正层的存放处（批 10a）：三个只追加的 JSONL，永不改写。
// candidates.jsonl = M09 去个人化候选与学习者对 M08 的建议（M14 的候选在 M14 自己的存放处）；
// audits.jsonl = 对候选的审计；corrections.jsonl = 对 M08 点 / 子句的更正。都不写 M08、不改资料线产出文件。
import { join } from 'node:path';
import type { CandidateAudit, StoredCandidate, StoredCorrection } from '../../shared/m08-review.ts';
import { appendJsonl, readJsonl } from './jsonl.ts';

export class ReviewStore {
  private constructor(
    private readonly dir: string,
    readonly candidates: StoredCandidate[],
    readonly audits: CandidateAudit[],
    readonly corrections: StoredCorrection[],
  ) {}

  static async load(dir: string): Promise<ReviewStore> {
    return new ReviewStore(
      dir,
      await readJsonl<StoredCandidate>(join(dir, 'candidates.jsonl')),
      await readJsonl<CandidateAudit>(join(dir, 'audits.jsonl')),
      await readJsonl<StoredCorrection>(join(dir, 'corrections.jsonl')),
    );
  }

  async addCandidate(c: StoredCandidate): Promise<void> {
    await appendJsonl(join(this.dir, 'candidates.jsonl'), c);
    this.candidates.push(c);
  }

  async addAudit(a: CandidateAudit): Promise<void> {
    await appendJsonl(join(this.dir, 'audits.jsonl'), a);
    this.audits.push(a);
  }

  async addCorrection(c: StoredCorrection): Promise<void> {
    await appendJsonl(join(this.dir, 'corrections.jsonl'), c);
    this.corrections.push(c);
  }
}
