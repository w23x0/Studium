// 收尾那一句（10-31 起取代守卫）：学习对话调 request_close 时写的一句——这次做了什么、停在哪。
// 记在 close_requested.summary；学习者确认“学完了”就合上。核心与界面都从正本按这里算，不另存。
// 旧数据里的守卫收尾记录（guard_verdict）照旧认：合上的那份当作那次的收尾记录。
import type { NumberedRecord } from './records.ts';

/** 一次学习的收尾那一句（学习对话写的）。 */
export interface Closing {
  /** close_requested 在那次学习正本里的行号。 */
  line: number;
  at: string;
  summary: string;
}

/** 本次学习最后一次带 summary 的 close_requested；给了 before 只看这行之前的。 */
export function closingOf(
  records: readonly NumberedRecord[],
  before = Number.POSITIVE_INFINITY,
): Closing | undefined {
  let out: Closing | undefined;
  for (const { line, record: r } of records) {
    if (line >= before) break;
    if (r.type === 'close_requested' && r.summary !== undefined && r.summary.trim() !== '') {
      out = { line, at: r.at, summary: r.summary };
    }
  }
  return out;
}

/**
 * 收尾走到哪了：
 * - waiting：学习者点了“我觉得懂了”，在等学习对话写收尾那一句（它回了话、学习者又说话、这一轮没跑成，就不再等）；
 * - ready：收尾那一句到了（old = 旧数据里守卫写的收尾记录，summary 是它的总述），等学习者确认“学完了”；
 * - undefined：没在收尾，或已经结束。
 */
export type CloseStatus =
  | { kind: 'waiting'; line: number }
  | { kind: 'ready'; line: number; at: string; summary: string; old?: true }
  | undefined;

export function closeStatus(records: readonly NumberedRecord[]): CloseStatus {
  let out: CloseStatus;
  for (const { line, record: r } of records) {
    switch (r.type) {
      case 'close_requested':
        if (r.summary !== undefined && r.summary.trim() !== '') {
          out = { kind: 'ready', line, at: r.at, summary: r.summary };
        } else if (r.by === 'learner') {
          out = { kind: 'waiting', line };
        }
        // 旧数据里模型申请、没写这一句的：等后面那份守卫判定
        break;
      case 'guard_verdict':
        // 旧数据：守卫写好了就等学习者确认；没写成（有 problem）就又开着
        out =
          r.closed && r.problem === undefined
            ? { kind: 'ready', line, at: r.at, summary: r.basis, old: true }
            : undefined;
        break;
      case 'user_message':
      case 'assistant_message':
      case 'turn_failed':
        // 学习对话回了话没写收尾那一句（觉得还差），或学习者又说话了：不再等；已到的那一句留着
        if (out?.kind === 'waiting') out = undefined;
        break;
      case 'loop_ended':
        out = undefined;
        break;
      default:
        break;
    }
  }
  return out;
}
