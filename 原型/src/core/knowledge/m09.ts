// M09：已结束闭环的个人形成记录。只在守卫通过、学习者确认后写入（写 M09 会话的工具）。
// 底层是闭环对话原文（M01 正本），这里存的是指回原文行号的分析层。只追加。
import { join } from 'node:path';
import type { Revisit } from '../../shared/records-longterm.ts';
import { appendJsonl, readJsonl } from './jsonl.ts';

/** 一处证据的强度：时间维度 × 独立性维度。 */
export const EVIDENCE_TIMES = ['仅当场', '含变式', '含延迟'] as const;
export const EVIDENCE_INDEPENDENCE = ['独立', '提示后'] as const;
export interface EvidenceStrength {
  time: (typeof EVIDENCE_TIMES)[number];
  independence: (typeof EVIDENCE_INDEPENDENCE)[number];
}

/** 按新点和所用出发点分别标的证据强度。 */
export interface FormationEvidence {
  newPoint: EvidenceStrength;
  startPoints: (EvidenceStrength & { point: string })[];
}

export function describeStrength(s: EvidenceStrength): string {
  return `${s.time}、${s.independence}`;
}

export function describeEvidence(e: FormationEvidence): string {
  return [
    `新点：${describeStrength(e.newPoint)}`,
    ...e.startPoints.map((s) => `出发点 ${s.point}：${describeStrength(s)}`),
  ].join('；');
}

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
  /** 证据强度的文字形态：旧记录是模型写的一句话，新记录由 evidence 生成。 */
  evidenceStrength: string;
  /** 结构化的证据强度（新点与每个出发点各一项）；旧记录没有。 */
  evidence?: FormationEvidence;
  evidenceLines: number[];
  /** 写这条分析的实际模型。 */
  model: string;
  /** 这个闭环的第几版分析（批 6：分析可重做、多版本并存）；旧记录没有 = 第 1 版。 */
  version?: number;
  /** 新点在学习者身上表现到的理解层级（认出 / 复现 / 结构 / 迁移）：只作索引，不是掌握真值。 */
  level?: Level;
  /** 一句话摘要与检索关键词（索引，可重建；没有时当前视图从“学出的理解”里取）。 */
  summary?: string;
  keywords?: string[];
  /** 这个闭环是复习 / 复检（单子上的 revisit），结果写 M09 时标明。 */
  revisit?: Revisit;
}

/** 理解层级（理解理论的四级）：只作诊断与索引维度。 */
export const LEVELS = ['认出', '复现', '结构', '迁移'] as const;
export type Level = (typeof LEVELS)[number];

/** 时间版本记录（M09:32）：提取失败 · 降档 · 重新掌握；另起一条指向旧记录，旧记录不改。 */
export const TIMELINE_KINDS = ['提取失败', '降档', '重新掌握'] as const;
export type TimelineKind = (typeof TIMELINE_KINDS)[number];

export interface TimelineRecord {
  id: string;
  at: string;
  kind: TimelineKind;
  /** 哪个点（M08 点 id）。 */
  point: string;
  /** 来自哪个闭环的提交（提取失败 / 降档来自后续闭环、重新掌握来自复检闭环）。 */
  loopSessionId: string;
  /** 指向的旧记录（形成记录 / 外部导入 / 更早的时间版本记录 id）。 */
  targets: string[];
  reason: string;
  /** 学习者在这个闭环里的原话行。 */
  evidenceLines: number[];
  /** 提取失败 / 降档：怎样排除了疲劳等状态侧解释（M04:49）。 */
  stateRuledOut?: string;
  /** 降档 / 重新掌握之后的理解层级。 */
  level?: Level;
  model: string;
}

/**
 * 外部导入记录：学习者在系统之外学到的东西，经外部导入通道点亮 M09（M09:26,47,53）。
 * 和闭环形成记录严格分开（另一个文件），一律“未验证”，可信度低于闭环记录，闭环证据永远优先；
 * 来源分两档：自述（畅谈里学习者自己说会，须引畅谈里学习者的原话行）· 笔记（模型从学习者的笔记里提，须引笔记原文行段）。
 */
export interface ExternalRecord {
  id: string;
  at: string;
  source: '自述' | '笔记';
  status: '未验证';
  /** 学习者会 / 写过的是什么（一句话）。 */
  claim: string;
  /** 对得上 M08 的点时填点 id；对不上就空，claim 照记。 */
  point?: string;
  /** 判读依据：为什么这样分档（如“笔记里有完整推导与自己的解释”“只说了会，没展开”）。 */
  basis: string;
  /** 笔记档的深浅：有推导与自己的解释 · 有解释 · 只抄定义或公式。 */
  grade?: string;
  /** 自述：畅谈会话与学习者的行。 */
  talk?: { sessionId: string; lines: number[]; quotes: string[] };
  /** 笔记：书（笔记 id）+ 小节文件 + 行段。 */
  note?: { book: string; file: string; from: number; to: number };
  model: string;
}

export const NOTE_GRADES = ['有推导与自己的解释', '有解释', '只抄定义或公式'] as const;

export class M09 {
  private constructor(
    private readonly path: string,
    private rows: FormationRecord[],
    private readonly externalPath: string,
    private external: ExternalRecord[],
    private readonly timelinePath: string,
    private timeline: TimelineRecord[],
  ) {}

  static async load(dir: string): Promise<M09> {
    const path = join(dir, 'records.jsonl');
    const externalPath = join(dir, 'external.jsonl');
    const timelinePath = join(dir, 'timeline.jsonl');
    return new M09(
      path,
      await readJsonl<FormationRecord>(path),
      externalPath,
      await readJsonl<ExternalRecord>(externalPath),
      timelinePath,
      await readJsonl<TimelineRecord>(timelinePath),
    );
  }

  /** 追加一条时间版本记录（提取失败 / 降档 / 重新掌握）；旧记录不动。 */
  async addTimeline(r: TimelineRecord): Promise<void> {
    await appendJsonl(this.timelinePath, r);
    this.timeline.push(r);
  }

  timelines(): TimelineRecord[] {
    return [...this.timeline];
  }

  timelineRecord(id: string): TimelineRecord | undefined {
    return this.timeline.find((r) => r.id === id);
  }

  /** 某个闭环写过的全部分析版本（旧在前）。 */
  forLoop(loopId: string): FormationRecord[] {
    return this.rows.filter((r) => r.loopSessionId === loopId);
  }

  /** 每个闭环只取最新一版分析（当前视图默认用它；旧版本用 all() / forLoop() 查）。 */
  current(): FormationRecord[] {
    const latest = new Map<string, FormationRecord>();
    for (const r of this.rows) {
      const had = latest.get(r.loopSessionId);
      if (had === undefined || (r.version ?? 1) >= (had.version ?? 1)) {
        latest.set(r.loopSessionId, r);
      }
    }
    return this.rows.filter((r) => latest.get(r.loopSessionId) === r);
  }

  async addExternal(r: ExternalRecord): Promise<void> {
    await appendJsonl(this.externalPath, r);
    this.external.push(r);
  }

  externals(): ExternalRecord[] {
    return [...this.external];
  }

  externalRecord(id: string): ExternalRecord | undefined {
    return this.external.find((r) => r.id === id);
  }

  externalsForPoint(pointId: string): ExternalRecord[] {
    return this.external.filter((r) => r.point === pointId);
  }

  describeExternal(r: ExternalRecord, pointName?: (id: string) => string): string {
    const where =
      r.talk !== undefined
        ? `畅谈 ${r.talk.sessionId} 学习者第 ${r.talk.lines.join('、')} 行`
        : r.note !== undefined
          ? `笔记《${r.note.book}》${r.note.file} 第 ${String(r.note.from)}–${String(r.note.to)} 行`
          : '';
    return [
      `${r.id}（${r.at.slice(0, 10)}，${r.source}，${r.status}，模型 ${r.model}）`,
      `  ${r.claim}${r.point !== undefined ? `（对应点 ${r.point}「${pointName?.(r.point) ?? r.point}」）` : ''}`,
      `  判读依据：${r.basis}${r.grade !== undefined ? `；${r.grade}` : ''}；出处：${where}`,
    ].join('\n');
  }

  async add(r: FormationRecord): Promise<void> {
    await appendJsonl(this.path, r);
    this.rows.push(r);
  }

  all(): FormationRecord[] {
    return [...this.rows];
  }

  record(id: string): FormationRecord | undefined {
    return this.rows.find((r) => r.id === id);
  }

  /** 已经合上过的新点（知识边缘由模型据此判断，程序不下判断）。 */
  knownPoints(): string[] {
    return [...new Set(this.rows.map((r) => r.newPoint))];
  }

  /** 与某个点有关的形成记录（每个闭环只取最新一版分析）。 */
  forPoint(pointId: string): FormationRecord[] {
    return this.current().filter((r) => r.newPoint === pointId || r.startPoints.includes(pointId));
  }

  describe(r: FormationRecord): string {
    const tags = [
      ...(r.revisit !== undefined ? [`${r.revisit.kind}闭环`] : []),
      ...((r.version ?? 1) > 1 ? [`第 ${String(r.version)} 版分析`] : []),
    ];
    return [
      `${r.id}（${r.at.slice(0, 10)}，闭环 ${r.loopSessionId}，模型 ${r.model}${tags.length > 0 ? `，${tags.join('，')}` : ''}）`,
      `  新点 ${r.newPoint}，子句 ${r.clause}，出发点 ${r.startPoints.join('、')}`,
      `  学出的理解：${r.understanding}`,
      `  过程：${r.process}`,
      `  未满足：${r.unmet || '无'}`,
      `  证据强度：${r.evidence ? describeEvidence(r.evidence) : r.evidenceStrength}；证据行 ${r.evidenceLines.join('、')}`,
      ...(r.level !== undefined ? [`  理解层级（索引）：${r.level}`] : []),
    ].join('\n');
  }

  describeTimeline(r: TimelineRecord, pointName?: (id: string) => string): string {
    return [
      `${r.id}（${r.at.slice(0, 10)}，${r.kind}，点 ${r.point}「${pointName?.(r.point) ?? r.point}」，来自闭环 ${r.loopSessionId}，模型 ${r.model}）`,
      `  指向旧记录：${r.targets.join('、') || '（无）'}；原因：${r.reason}${r.level !== undefined ? `；之后层级：${r.level}` : ''}`,
      ...(r.stateRuledOut !== undefined ? [`  怎样排除状态侧解释：${r.stateRuledOut}`] : []),
    ].join('\n');
  }
}
