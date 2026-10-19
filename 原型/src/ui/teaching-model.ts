// 教法记录与状态确认用的纯转换：用过的教法按名字计数、“出现在某段教学之后”的日常说法、状态表态。单测覆盖。
import type { StateRecordView, TeachingToolUseView } from '../shared/protocol.ts';
import { W } from './wording.ts';

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

/** 学习者对一条状态最近一次表态的说明；没表过态为空。 */
export function verdictText(s: StateRecordView): { text: string; note?: string } | undefined {
  if (s.learnerVerdict === undefined) return undefined;
  const last = s.confirmations.at(-1);
  const text = s.learnerVerdict === '确认' ? W.stateConfirmed : W.stateDenied;
  return last?.note !== undefined && last.note !== '' ? { text, note: last.note } : { text };
}
