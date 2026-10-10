// 教法强度（M10「强度与条件控制」）：闭环每轮诊断带的四项 + 偏向的解析，以及程序对一个闭环里走向与明显变化的计算。
// 全是程序算的：走向和变化不由模型自报，M10 记录与 M15 开场都从这里取。
import { z } from 'zod';
import {
  LEANS,
  LEVELS,
  PACES,
  type Dimension,
  type DimensionTrend,
  type Intensity,
  type IntensityTrend,
  type IntensityTurn,
  type NumberedRecord,
} from '../shared/records.ts';

export const DIMENSIONS: readonly Dimension[] = ['info', 'hint', 'challenge', 'pace', 'lean'];

export const DIMENSION_LABEL: Record<Dimension, string> = {
  info: '信息量',
  hint: '提示强度',
  challenge: '挑战程度',
  pace: '节奏',
  lean: '偏向',
};

const SCALES: Record<Dimension, readonly string[]> = {
  info: LEVELS,
  hint: LEVELS,
  challenge: LEVELS,
  pace: PACES,
  lean: LEANS,
};

/** write_diagnosis 的强度参数（都可选：旧调用不带也能记诊断，没带时工具结果提醒补）。 */
export const intensityInput = {
  info: z.enum(LEVELS).optional().describe('信息量：低 / 中 / 高（高端 = 成段讲授）'),
  hint: z.enum(LEVELS).optional().describe('提示强度：低 / 中 / 高'),
  challenge: z.enum(LEVELS).optional().describe('挑战程度：低 / 中 / 高'),
  pace: z.enum(PACES).optional().describe('节奏：慢 / 中 / 快'),
  lean: z.enum(LEANS).optional().describe('这一轮偏输入还是偏练习：输入 / 均衡 / 练习'),
  intensity_reason: z.string().optional().describe('为什么这样定（可不填）'),
};

export type IntensityParse = { ok: true; intensity?: Intensity } | { ok: false; error: string };

/** 从工具参数里取出这一轮的强度；全不填 = 没标，填了就要五项齐全且取值合法（不合法不记）。 */
export function parseIntensity(a: Record<string, unknown>): IntensityParse {
  const given = DIMENSIONS.filter((d) => a[d] !== undefined);
  if (given.length === 0) return { ok: true };
  const missing = DIMENSIONS.filter((d) => a[d] === undefined);
  if (missing.length > 0) {
    return {
      ok: false,
      error: `强度要五项一起填，缺：${missing.map((d) => DIMENSION_LABEL[d]).join('、')}`,
    };
  }
  for (const d of DIMENSIONS) {
    const v = a[d];
    if (typeof v !== 'string' || !SCALES[d].includes(v)) {
      return {
        ok: false,
        error: `${DIMENSION_LABEL[d]}只能取：${SCALES[d].join(' / ')}（收到 ${String(v)}）`,
      };
    }
  }
  const reason = a.intensity_reason;
  return {
    ok: true,
    intensity: {
      info: a.info as Intensity['info'],
      hint: a.hint as Intensity['hint'],
      challenge: a.challenge as Intensity['challenge'],
      pace: a.pace as Intensity['pace'],
      lean: a.lean as Intensity['lean'],
      ...(typeof reason === 'string' && reason.trim() !== '' ? { reason: reason.trim() } : {}),
    },
  };
}

/** 一个闭环正本里的全部诊断（带行号与强度标注，没标的 intensity 为空）。 */
export function notesOf(recs: NumberedRecord[]): NoteWithIntensity[] {
  return recs.flatMap((r) =>
    r.record.type === 'loop_note'
      ? [{ line: r.line, ...(r.record.intensity ? { intensity: r.record.intensity } : {}) }]
      : [],
  );
}

export interface NoteWithIntensity {
  line: number;
  intensity?: Intensity;
}

function ordinal(d: Dimension, v: string): number {
  return SCALES[d].indexOf(v);
}

function collapse(values: string[]): string[] {
  return values.filter((v, i) => i === 0 || v !== values[i - 1]);
}

/** 一个闭环的走向；一轮都没标则为空。 */
export function trendOf(notes: NoteWithIntensity[]): IntensityTrend | undefined {
  const turns: IntensityTurn[] = notes.flatMap((n) =>
    n.intensity
      ? [
          {
            line: n.line,
            info: n.intensity.info,
            hint: n.intensity.hint,
            challenge: n.intensity.challenge,
            pace: n.intensity.pace,
            lean: n.intensity.lean,
          },
        ]
      : [],
  );
  if (turns.length === 0) return undefined;
  const summary = {} as Record<Dimension, DimensionTrend>;
  for (const d of DIMENSIONS) {
    const values = turns.map((t) => t[d]);
    const sequence = collapse(values);
    const first = values[0] ?? '';
    const last = values.at(-1) ?? '';
    const diff = ordinal(d, last) - ordinal(d, first);
    summary[d] = {
      first,
      last,
      sequence,
      direction: diff > 0 ? '升' : diff < 0 ? '降' : sequence.length > 1 ? '起伏' : '持平',
    };
  }
  return { turns, unannotated: notes.length - turns.length, summary };
}

export interface IntensityChange {
  /** 变化编号：<闭环 id>:<诊断所在行>:<哪一项>；M15 标注“出现在 X 之后”时引用它。 */
  id: string;
  loopSessionId: string;
  /** 变化后的那一轮诊断在闭环正本里的行号。 */
  line: number;
  dimension: Dimension;
  from: string;
  to: string;
  /** “第 N 行起，提示强度由「高」降为「低」”。 */
  text: string;
}

/**
 * 明显变化：某一项相对上一次变化后的基线差到两档（三档里就是低↔高；偏向是输入↔练习），算一次，基线重置为现在。
 * 逐轮小步走完两档也算（低→中→高）。
 */
export function changesOf(loopSessionId: string, notes: NoteWithIntensity[]): IntensityChange[] {
  const out: IntensityChange[] = [];
  const base: Partial<Record<Dimension, string>> = {};
  for (const n of notes) {
    if (!n.intensity) continue;
    for (const d of DIMENSIONS) {
      const now = n.intensity[d];
      const was = base[d];
      if (was === undefined) {
        base[d] = now;
        continue;
      }
      const diff = ordinal(d, now) - ordinal(d, was);
      if (Math.abs(diff) < 2) continue;
      out.push({
        id: `${loopSessionId}:${String(n.line)}:${d}`,
        loopSessionId,
        line: n.line,
        dimension: d,
        from: was,
        to: now,
        text: `第 ${String(n.line)} 行起，${DIMENSION_LABEL[d]}由「${was}」${diff > 0 ? '升为' : '降为'}「${now}」`,
      });
      base[d] = now;
    }
  }
  return out;
}

/** 给 M10 看的走向文字。 */
export function describeTrend(t: IntensityTrend): string {
  const rows = DIMENSIONS.map(
    (d) =>
      `  ${DIMENSION_LABEL[d]}：${t.summary[d].sequence.join('→')}（${t.summary[d].direction}）`,
  );
  const turns = t.turns.map(
    (x) =>
      `  L${String(x.line)}：信息量${x.info} 提示${x.hint} 挑战${x.challenge} 节奏${x.pace} 偏${x.lean}`,
  );
  return [
    `共 ${String(t.turns.length)} 轮标了强度${t.unannotated > 0 ? `，另有 ${String(t.unannotated)} 轮没标` : ''}：`,
    ...rows,
    '每轮：',
    ...turns,
  ].join('\n');
}
