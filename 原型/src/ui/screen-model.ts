// 学习页的现读（纯函数）：收口那一行走到哪了。
import { closeStatus } from '../shared/closing.ts';
import { foldLoop } from '../shared/loop-flags.ts';
import type { NumberedRecord } from '../shared/records.ts';

/**
 * 收口那一行（界面说明 §2.6「收口时」）：学习者点了“我觉得懂了”、还没等到收尾那一句 = 在收尾；
 * 那一句到了 = done（学完之后也留着；带那一句与所在行，给面板定位；old = 旧数据里守卫的收尾记录，summary 是它的总述）。
 */
export type CloseLine =
  { kind: 'closing' } | { kind: 'done'; line: number; summary: string; old?: true } | undefined;

export function closeLine(records: NumberedRecord[]): CloseLine {
  // 学完之后收尾那一句仍留在页面上；没合上就结束时不再“在收尾”（结束后重开过的看最后一次，W12 §2）
  const ended = foldLoop(records).ended !== undefined;
  const c = closeStatus(records.filter((r) => r.record.type !== 'loop_ended'));
  if (c === undefined) return undefined;
  if (c.kind === 'waiting') return ended ? undefined : { kind: 'closing' };
  return {
    kind: 'done',
    line: c.line,
    summary: c.summary,
    ...(c.old === true ? { old: true as const } : {}),
  };
}
