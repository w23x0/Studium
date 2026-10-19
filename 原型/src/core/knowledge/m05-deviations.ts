// M05 自有的路线偏差记录（M05:23）：学习者没选推荐项、选了之后很快放下 / 没合上、在小卡上没照推荐走。
// 只记计划偏差的事实，不形成对学习者水平或能力的结论（D-08）；只追加。
import { join } from 'node:path';
import { appendJsonl, readJsonl } from './jsonl.ts';

export type DeviationKind = 'not_recommended' | 'ended_unclosed' | 'detour_choice';

export interface DeviationRecord {
  id: string;
  at: string;
  /** 属于哪个项目（主对话 id）。 */
  mainSessionId: string;
  kind: DeviationKind;
  loopSessionId?: string;
  cardId?: string;
  recommended?: { option: number; title: string; newPoint?: string };
  chosen?: { option: number; title: string; newPoint?: string; kind?: string };
  facts?: { learnerMessages: number; minutes: number; quickDrop?: boolean; note?: string };
}

export class Deviations {
  private constructor(
    private readonly path: string,
    private rows: DeviationRecord[],
  ) {}

  static async load(dir: string): Promise<Deviations> {
    const path = join(dir, 'deviations.jsonl');
    return new Deviations(path, await readJsonl<DeviationRecord>(path));
  }

  async add(r: DeviationRecord): Promise<void> {
    await appendJsonl(this.path, r);
    this.rows.push(r);
  }

  all(mainSessionId?: string): DeviationRecord[] {
    return this.rows.filter(
      (r) => mainSessionId === undefined || r.mainSessionId === mainSessionId,
    );
  }
}
