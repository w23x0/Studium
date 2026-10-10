// 教法强度与状态确认用的纯转换：每轮强度的小标签、整段学习的走势、“出现在教法变化之后”的日常说法。单测覆盖。
import type {
  AfterTeachingView,
  DiagnosisView,
  StateRecordView,
  TeachingToolUseView,
} from '../shared/protocol.ts';
import {
  LEANS,
  LEVELS,
  PACES,
  type Dimension,
  type DimensionTrend,
  type Intensity,
} from '../shared/records.ts';
import { W } from './wording.ts';

export const DIMS: readonly Dimension[] = ['info', 'hint', 'challenge', 'pace', 'lean'];

const SCALES: Record<Dimension, readonly string[]> = {
  info: LEVELS,
  hint: LEVELS,
  challenge: LEVELS,
  pace: PACES,
  lean: LEANS,
};

/** 某一项的取值在三档里排第几（0–2）；认不出是 -1。 */
export function levelOf(d: Dimension, v: string): number {
  return SCALES[d].indexOf(v);
}

/** 一项取值给学习者看的写法（讲还是练换成日常话，其余照档位）。 */
export function valueText(d: Dimension, v: string): string {
  return d === 'lean' ? (W.leanValue[v] ?? v) : v;
}

/** 一轮强度的五个小标签。 */
export function intensityChips(x: Intensity): { dim: Dimension; label: string; text: string }[] {
  return DIMS.map((d) => ({
    dim: d,
    label: W.intensityDims[d],
    text: valueText(d, x[d]),
  }));
}

export interface TrendRow {
  dim: Dimension;
  label: string;
  /** 每轮的档位（0–2）与原值，按轮次。 */
  cells: { level: number; value: string; line: number }[];
  sequence: string[];
  direction: DimensionTrend['direction'];
}

export interface LoopTrend {
  rows: TrendRow[];
  turns: number;
  unmarked: number;
}

function collapse(values: string[]): string[] {
  return values.filter((v, i) => i === 0 || v !== values[i - 1]);
}

/** 走向的判法与核心一致：末轮比首轮高 = 升、低 = 降；首末相同但中间变过 = 起伏，否则持平。 */
export function directionOf(d: Dimension, values: string[]): DimensionTrend['direction'] {
  const first = values[0] ?? '';
  const last = values.at(-1) ?? '';
  const diff = levelOf(d, last) - levelOf(d, first);
  if (diff > 0) return '升';
  if (diff < 0) return '降';
  return collapse(values).length > 1 ? '起伏' : '持平';
}

/** 一段学习的强度走势（只用标了强度的观察）；一轮都没标为空。 */
export function loopTrend(diagnoses: DiagnosisView[]): LoopTrend | undefined {
  const marked = diagnoses.flatMap((d) => (d.intensity ? [{ line: d.line, x: d.intensity }] : []));
  if (marked.length === 0) return undefined;
  const rows = DIMS.map((d) => {
    const values = marked.map((m) => m.x[d]);
    return {
      dim: d,
      label: W.intensityDimsLong[d],
      cells: marked.map((m) => ({ level: levelOf(d, m.x[d]), value: m.x[d], line: m.line })),
      sequence: collapse(values).map((v) => valueText(d, v)),
      direction: directionOf(d, values),
    };
  });
  return { rows, turns: marked.length, unmarked: diagnoses.length - marked.length };
}

/** 教法记录里的走向摘要：每项一行“提示强度：高 → 低（往下走）”。 */
export function trendLines(summary: Record<Dimension, DimensionTrend>): string[] {
  return DIMS.map((d) => {
    const t = summary[d];
    const seq = t.sequence.map((v) => valueText(d, v)).join(' → ');
    return `${W.intensityDimsLong[d]}：${seq}（${W.direction[t.direction]}）`;
  });
}

/** 取用过的教学工具按名字合并（保留第一次取用的顺序），带次数。 */
export function toolCounts(uses: TeachingToolUseView[]): { name: string; count: number }[] {
  const out: { name: string; count: number }[] = [];
  for (const u of uses) {
    const hit = out.find((x) => x.name === u.name);
    if (hit) hit.count += 1;
    else out.push({ name: u.name, count: 1 });
  }
  return out;
}

/**
 * “出现在教法某处变化之后”的日常说法。变化编号末段是哪一项（info / hint / …），
 * 升降从核心写的“由「高」降为「低」”里取；认不出就用笼统的说法。
 */
export function afterTeachingText(a: AfterTeachingView): string {
  const dim = a.changeId.split(':').at(-1);
  const up = a.text.includes('升为');
  const down = a.text.includes('降为');
  if (dim === undefined || !(dim in W.teachingChange) || up === down) {
    return W.afterTeachingUnknown;
  }
  const words = W.teachingChange[dim as Dimension];
  return W.afterTeaching(up ? words.up : words.down);
}

/** 学习者对一条状态最近一次表态的说明；没表过态为空。 */
export function verdictText(s: StateRecordView): { text: string; note?: string } | undefined {
  if (s.learnerVerdict === undefined) return undefined;
  const last = s.confirmations.at(-1);
  const text = s.learnerVerdict === '确认' ? W.stateConfirmed : W.stateDenied;
  return last?.note !== undefined && last.note !== '' ? { text, note: last.note } : { text };
}
