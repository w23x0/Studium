// M10 个人策略过程与效果层（M10 审查单）：这位学习者在什么闭环、诊断与状态条件下用过什么做法，之后 M04 的
// 诊断怎么变。M10 自己的记录；单次记录不证明因果。只追加。
import { join } from 'node:path';
import { appendJsonl, readJsonl } from './jsonl.ts';

export interface StrategyRecord {
  id: string;
  at: string;
  /** 闭环对话的会话 id；行号指它的正本。 */
  loopSessionId: string;
  /** 当时的诊断与状态条件。 */
  conditions: string;
  /** 用了哪些做法。 */
  strategies: string;
  /** 之后的诊断变化与证据。 */
  followedBy: string;
  evidenceLines: number[];
  /** 程序记下的教学工具使用（工具调用记录里读了哪几份，按首次取用顺序、去重）；没用教学工具时为空。 */
  toolsUsed: string[];
  /** 每次取用：哪份、在一次学习正本的哪一行（旧记录没有）。 */
  toolUses?: { name: string; line: number }[];
  /** 记录当时有“出现在 X 之后”标注的状态时，M10 对自己的教法是否为成因的自查（程序列出状态 id，说明由 M10 写）。 */
  selfCheck?: { stateIds: string[]; note: string };
  m10SessionId: string;
  model: string;
}

export class M10 {
  private constructor(
    private readonly path: string,
    private rows: StrategyRecord[],
  ) {}

  static async load(dir: string): Promise<M10> {
    const path = join(dir, 'records.jsonl');
    return new M10(path, await readJsonl<StrategyRecord>(path));
  }

  async add(r: StrategyRecord): Promise<void> {
    await appendJsonl(this.path, r);
    this.rows.push(r);
  }

  all(): StrategyRecord[] {
    return [...this.rows];
  }

  record(id: string): StrategyRecord | undefined {
    return this.rows.find((r) => r.id === id);
  }

  describe(r: StrategyRecord): string {
    return [
      `${r.id}（${r.at.slice(0, 10)}，闭环 ${r.loopSessionId}，模型 ${r.model}）`,
      `  条件：${r.conditions}`,
      `  做法：${r.strategies}`,
      `  之后：${r.followedBy}`,
      `  教学工具：${r.toolsUsed.join('、') || '（没取用）'}；证据行 ${r.evidenceLines.join('、')}`,
      ...(r.selfCheck ? [`  自查（教法是否为状态成因）：${r.selfCheck.note}`] : []),
    ].join('\n');
  }
}
