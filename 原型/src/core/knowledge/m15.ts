// M15：学习者状态与条件的存放处（03「M15」）。两层，都只追加：
// 底层 = 状态记录（一句话 + 来源 + 时间范围 + 指回 M01 行号）；上层 = “当前状态”页（每次整理写一版，最新一版即当前，
// 可随时从底层整个重算）。另记每次整理看到 M01 的哪一行为止，没有新记录就不整理。
import { join } from 'node:path';
import { appendJsonl, readJsonl } from './jsonl.ts';

export type StateSource = '自述' | '观察' | '推断';
/** 来源档：模型只能写前三档；“已确认”是学习者在界面上确认过的（只由确认记录得出，不写进状态记录本身）。 */
export type StateSourceLevel = StateSource | '已确认';
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
  /**
   * 这条状态出现在某段学习里某句教学之后（M15 审查单「策略造成的状态须标注来源」）：
   * 会话与行号由程序核对（确是一句教学），M15 只引用位置；旧记录没有。
   */
  afterTeaching?: { loopSessionId: string; line: number; text: string };
  m15SessionId: string;
  model: string;
}

/** 学习者对一条状态记录的确认 / 否认（界面上点的）；单独追加，不改状态记录。 */
export interface StateConfirmation {
  id: string;
  at: string;
  recordId: string;
  verdict: '确认' | '否认';
  note?: string;
}

/** 学习者给一条状态记录补的“我的解释”（批 10b，M15:42）：单独追加，不改状态记录；整理时当自述读。 */
export interface StateExplanation {
  id: string;
  at: string;
  recordId: string;
  text: string;
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
    private confirmations: StateConfirmation[],
    private explanations: StateExplanation[],
  ) {}

  static async load(dir: string): Promise<M15> {
    return new M15(
      dir,
      await readJsonl<StateRecord>(join(dir, 'records.jsonl')),
      await readJsonl<CurrentStatePage>(join(dir, 'current.jsonl')),
      await readJsonl<OrganizeRun>(join(dir, 'runs.jsonl')),
      await readJsonl<StateConfirmation>(join(dir, 'confirmations.jsonl')),
      await readJsonl<StateExplanation>(join(dir, 'explanations.jsonl')),
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

  async addConfirmation(c: StateConfirmation): Promise<void> {
    await appendJsonl(join(this.dir, 'confirmations.jsonl'), c);
    this.confirmations.push(c);
  }

  async addExplanation(e: StateExplanation): Promise<void> {
    await appendJsonl(join(this.dir, 'explanations.jsonl'), e);
    this.explanations.push(e);
  }

  allExplanations(): StateExplanation[] {
    return [...this.explanations];
  }

  explanationsFor(recordId: string): StateExplanation[] {
    return this.explanations.filter((e) => e.recordId === recordId);
  }

  allConfirmations(): StateConfirmation[] {
    return [...this.confirmations];
  }

  confirmationsFor(recordId: string): StateConfirmation[] {
    return this.confirmations.filter((c) => c.recordId === recordId);
  }

  /** 学习者对这条记录最近一次表态；没表过态为空。 */
  verdictOf(recordId: string): StateConfirmation | undefined {
    return this.confirmationsFor(recordId).at(-1);
  }

  /** 来源档：最近一次表态是确认 = “已确认”，否则是原来源。 */
  sourceLevel(r: StateRecord): StateSourceLevel {
    return this.verdictOf(r.id)?.verdict === '确认' ? '已确认' : r.source;
  }

  allRecords(): StateRecord[] {
    return [...this.records];
  }

  record(id: string): StateRecord | undefined {
    return this.records.find((r) => r.id === id);
  }

  /** 历次整理写下的“当前状态”页，旧的在前。 */
  allPages(): CurrentStatePage[] {
    return [...this.pages];
  }

  current(): CurrentStatePage | undefined {
    return this.pages.at(-1);
  }

  /** 最近一次整理的时间（没整理过为空）。 */
  lastRunAt(): string | undefined {
    return this.runs.at(-1)?.at;
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
    const verdict = this.verdictOf(r.id);
    const level = this.sourceLevel(r);
    return [
      `${r.id}（${r.at.slice(0, 16).replace('T', ' ')}）[${r.output}·${level}${level !== r.source ? `（原为${r.source}）` : ''}·${r.timeRange}] ${r.text}（依据 ${refs || '无'}）`,
      ...(verdict?.verdict === '否认'
        ? [`  学习者否认了这条${verdict.note ? `：${verdict.note}` : ''}（对不上的两边都留着）`]
        : []),
      ...this.explanationsFor(r.id).map(
        (e) => `  学习者补充的解释（自述，原记录没改，不是对话原话）：${e.text}`,
      ),
      ...(r.afterTeaching
        ? [`  出现在「${r.afterTeaching.text}」之后——先查自己的教法是不是成因，再当作他自己的状态`]
        : []),
    ].join('\n');
  }

  describeCurrent(): string {
    const p = this.current();
    if (!p) return '还没有“当前状态”页。';
    return `当前状态（${p.at.slice(0, 16).replace('T', ' ')} 整理）：\n${p.text}\n阶段：${p.stage}（依据跨度：${p.basisSpan}）`;
  }
}
