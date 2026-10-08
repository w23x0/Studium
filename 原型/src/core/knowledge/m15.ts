// M15：学习者状态与条件的存放处（03「M15」）。两层，都只追加：
// 底层 = 状态记录（一句话 + 来源 + 时间范围 + 指回 M01 行号）；上层 = “当前状态”页（每次整理写一版，最新一版即当前，
// 可随时从底层整个重算）。另记每次整理看到 M01 的哪一行为止，没有新记录就不整理。
import { join } from 'node:path';
import { appendJsonl, readJsonl } from './jsonl.ts';

export type StateSource = '自述' | '观察' | '推断';
/** 承载读数与知识诊断正交、直接可用；解释候选与“他不会”竞争，须经 M04 裁决（M15 审查单「输出分型」）。 */
export type StateOutput = '承载读数' | '解释候选';
/** 状态阶段子模块只出类型与依据跨度（三锁）。 */
export const STAGES = [
  '习惯低谷',
  '堆积型下滑',
  '疲劳退化',
  '阈值型动力低',
  '无明显阶段',
  '证据不足',
] as const;
export type Stage = (typeof STAGES)[number];

export interface StateRecord {
  id: string;
  at: string;
  text: string;
  source: StateSource;
  output: StateOutput;
  /** 适用时间范围：本次会话 / 近期（几号到几号）/ 较稳定的现实约束。 */
  timeRange: string;
  /** 指回 M01 正本：哪个会话的哪几行。 */
  refs: { sessionId: string; lines: number[] }[];
  m15SessionId: string;
  model: string;
}

export interface CurrentStatePage {
  at: string;
  /** 现在仍有效的几条（带记录 id），自述与观察对不上的两条都留、标冲突。 */
  text: string;
  stage: Stage;
  /** 阶段判断依据的时间跨度。 */
  basisSpan: string;
  m15SessionId: string;
  model: string;
}

/** 一次整理看到 M01 的哪一行为止（程序记，不是模型写的）。 */
export interface OrganizeRun {
  at: string;
  trigger: string;
  m15SessionId: string;
  covered: Record<string, number>;
}

export class M15 {
  private constructor(
    private readonly dir: string,
    private records: StateRecord[],
    private pages: CurrentStatePage[],
    private runs: OrganizeRun[],
  ) {}

  static async load(dir: string): Promise<M15> {
    return new M15(
      dir,
      await readJsonl<StateRecord>(join(dir, 'records.jsonl')),
      await readJsonl<CurrentStatePage>(join(dir, 'current.jsonl')),
      await readJsonl<OrganizeRun>(join(dir, 'runs.jsonl')),
    );
  }

  async addRecord(r: StateRecord): Promise<void> {
    await appendJsonl(join(this.dir, 'records.jsonl'), r);
    this.records.push(r);
  }

  async setCurrent(p: CurrentStatePage): Promise<void> {
    await appendJsonl(join(this.dir, 'current.jsonl'), p);
    this.pages.push(p);
  }

  async addRun(r: OrganizeRun): Promise<void> {
    await appendJsonl(join(this.dir, 'runs.jsonl'), r);
    this.runs.push(r);
  }

  allRecords(): StateRecord[] {
    return [...this.records];
  }

  record(id: string): StateRecord | undefined {
    return this.records.find((r) => r.id === id);
  }

  current(): CurrentStatePage | undefined {
    return this.pages.at(-1);
  }

  /** 各会话已整理到的行号（取历次整理的最大值）。 */
  covered(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const r of this.runs) {
      for (const [id, line] of Object.entries(r.covered)) out[id] = Math.max(out[id] ?? 0, line);
    }
    return out;
  }

  describeRecord(r: StateRecord): string {
    const refs = r.refs.map((x) => `${x.sessionId}:${x.lines.join('、')}`).join('；');
    return `${r.id}（${r.at.slice(0, 16).replace('T', ' ')}）[${r.output}·${r.source}·${r.timeRange}] ${r.text}（依据 ${refs || '无'}）`;
  }

  describeCurrent(): string {
    const p = this.current();
    if (!p) return '还没有“当前状态”页。';
    return `当前状态（${p.at.slice(0, 16).replace('T', ' ')} 整理）：\n${p.text}\n阶段：${p.stage}（依据跨度：${p.basisSpan}）`;
  }
}
