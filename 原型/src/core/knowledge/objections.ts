// 学习者异议存放处：对守卫判定（一次学习已结束）、教法记录 / 状态记录提的异议。
// 每条异议是独立的一条追加记录，指向原记录，不改原记录；异议按自述来源记录，不覆盖可观察事实（`docs/设计/00-定位与原则.md`）。只追加。
import { join } from 'node:path';
import type { LearnerObjection, ObjectionTarget } from '../../shared/records.ts';
import { appendJsonl, readJsonl } from './jsonl.ts';
import { localMinute } from '../../shared/time.ts';

export class Objections {
  private constructor(
    private readonly path: string,
    private rows: LearnerObjection[],
  ) {}

  static async load(dir: string): Promise<Objections> {
    const path = join(dir, 'records.jsonl');
    return new Objections(path, await readJsonl<LearnerObjection>(path));
  }

  async add(o: LearnerObjection): Promise<void> {
    await appendJsonl(this.path, o);
    this.rows.push(o);
  }

  all(): LearnerObjection[] {
    return [...this.rows];
  }

  /** 指向某条教法记录 / 状态记录的异议。 */
  forRecord(kind: 'pedagogy' | 'state', recordId: string): LearnerObjection[] {
    return this.rows.filter(
      (o) => o.target.kind === kind && 'recordId' in o.target && o.target.recordId === recordId,
    );
  }

  /** 指向某次学习里守卫判定的异议（那次已结束时存在这里）。 */
  forLoop(loopSessionId: string): LearnerObjection[] {
    return this.rows.filter(
      (o) => o.target.kind === 'guard_verdict' && o.target.loopSessionId === loopSessionId,
    );
  }

  /** 交给模型的一行话：说明异议对着什么、说了什么。 */
  describe(o: LearnerObjection): string {
    return `${o.id}（${localMinute(o.at)}）对${describeTarget(o.target)}的异议：${o.text}`;
  }
}

export function describeTarget(t: ObjectionTarget): string {
  switch (t.kind) {
    case 'guard_verdict':
      return `一次学习（${t.loopSessionId}）第 ${String(t.line)} 行守卫判定`;
    case 'pedagogy':
      return `教法记录 ${t.recordId}`;
    case 'state':
      return `状态记录 ${t.recordId}`;
  }
}
