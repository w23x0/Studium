// M09：已结束闭环的个人形成记录。只在守卫通过、学习者确认后写入（写 M09 会话的工具）。
// 底层是闭环对话原文（M01 正本），这里存的是指回原文行号的分析层。只追加。
import { join } from 'node:path';
import { appendJsonl, readJsonl } from './jsonl.ts';

export interface FormationRecord {
  id: string;
  at: string;
  /** 闭环对话的会话 id；证据行号指它的正本。 */
  loopSessionId: string;
  newPoint: string;
  clause: string;
  startPoints: string[];
  /** 实际学出的理解（可与子句预期不同）。 */
  understanding: string;
  /** 关键形成过程。 */
  process: string;
  /** 未满足项。 */
  unmet: string;
  /** 证据强度：仅当场 / 含变式；独立 / 提示后。 */
  evidenceStrength: string;
  evidenceLines: number[];
  /** 写这条分析的实际模型。 */
  model: string;
}

export class M09 {
  private constructor(
    private readonly path: string,
    private rows: FormationRecord[],
  ) {}

  static async load(dir: string): Promise<M09> {
    const path = join(dir, 'records.jsonl');
    return new M09(path, await readJsonl<FormationRecord>(path));
  }

  async add(r: FormationRecord): Promise<void> {
    await appendJsonl(this.path, r);
    this.rows.push(r);
  }

  all(): FormationRecord[] {
    return [...this.rows];
  }

  /** 已经合上过的新点（知识边缘由模型据此判断，程序不下判断）。 */
  knownPoints(): string[] {
    return [...new Set(this.rows.map((r) => r.newPoint))];
  }

  forPoint(pointId: string): FormationRecord[] {
    return this.rows.filter((r) => r.newPoint === pointId || r.startPoints.includes(pointId));
  }

  describe(r: FormationRecord): string {
    return [
      `${r.id}（${r.at.slice(0, 10)}，闭环 ${r.loopSessionId}，模型 ${r.model}）`,
      `  新点 ${r.newPoint}，子句 ${r.clause}，出发点 ${r.startPoints.join('、')}`,
      `  学出的理解：${r.understanding}`,
      `  过程：${r.process}`,
      `  未满足：${r.unmet || '无'}`,
      `  证据强度：${r.evidenceStrength}；证据行 ${r.evidenceLines.join('、')}`,
    ].join('\n');
  }
}
