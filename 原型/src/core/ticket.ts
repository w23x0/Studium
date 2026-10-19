// 这次学习“现在的单子”（工单 W6 §4.1）：最后一条 ticket_edited.after，没有就是 session_opened 里那张。
// 学习者改单子只追加（记录/单子与路线.md「单子」），开学习那行与卡上那张都不改；凡把“现在的单子”
// 拿来用的地方（守卫开场、学过的记录、依据视图、沙盒渲染）都走这里。
import type { NumberedRecord, Ticket } from '../shared/records.ts';

/** 这次学习现在的单子；正本里没有单子就 undefined。 */
export function currentTicket(records: NumberedRecord[]): Ticket | undefined {
  for (let i = records.length - 1; i >= 0; i--) {
    const r = records[i]?.record;
    if (r?.type === 'ticket_edited') return r.after;
  }
  const opened = records.find((r) => r.record.type === 'session_opened')?.record;
  if (opened?.type === 'session_opened' && opened.ticket !== undefined) return opened.ticket;
  return undefined;
}

/** 这次学习里学习者改过几次单子（行号 + 时间，按行号升序）。 */
export function ticketEdits(records: NumberedRecord[]): { line: number; at: string }[] {
  return records.flatMap((r) =>
    r.record.type === 'ticket_edited' ? [{ line: r.line, at: r.record.at }] : [],
  );
}
