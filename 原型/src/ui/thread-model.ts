// 正本记录 → 界面上的消息列表与闭环状态。纯函数，单测覆盖。
import type { ChoiceCard, NumberedRecord } from '../shared/records.ts';

export interface UiMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  /** 这条消息起始的正本行号，以后做引用跳转用。 */
  line: number;
  failed?: boolean;
}

export function toUiMessages(records: NumberedRecord[], draft: string): UiMessage[] {
  const out: UiMessage[] = [];
  const push = (m: UiMessage) => out.push(m);
  for (const { line, record: r } of records) {
    const id = `l${String(line)}`;
    switch (r.type) {
      case 'user_message':
        push({ id, role: 'user', text: r.text, line });
        break;
      case 'assistant_message':
      case 'turn_failed': {
        const text = r.type === 'assistant_message' ? r.text : `（本轮没有完成：${r.reason}）`;
        const prev = out.at(-1);
        // 同一轮里的多段助手文字合成一条显示
        if (prev?.role === 'assistant' && prev.failed !== true) prev.text += `\n\n${text}`;
        else push({ id, role: 'assistant', text, line });
        if (r.type === 'turn_failed') {
          const last = out.at(-1);
          if (last) last.failed = true;
        }
        break;
      }
      case 'program_fact':
        push({ id, role: 'system', text: r.text, line });
        break;
      case 'guard_verdict':
        push({
          id,
          role: 'system',
          text: `守卫判定：${r.closed ? '合上' : '未合上'}。${r.problem ?? r.basis}`,
          line,
        });
        break;
      case 'loop_ended':
        push({
          id,
          role: 'system',
          text: r.closed ? '闭环已合上并结束。' : '闭环没合上就结束了。',
          line,
        });
        break;
      case 'project_goal':
        push({ id, role: 'system', text: `方向目标已记下：${r.text}`, line });
        break;
      default:
        break;
    }
  }
  if (draft !== '') {
    out.push({ id: 'draft', role: 'assistant', text: draft, line: 0 });
  }
  return out;
}

export type LoopState =
  | { kind: 'open'; closeRequested: boolean }
  | { kind: 'awaiting_confirm'; basis: string }
  | { kind: 'ended'; closed: boolean };

/** 闭环对话现在在哪一步：进行中 / 守卫判合上等学习者确认 / 已结束。 */
export function loopState(records: NumberedRecord[]): LoopState {
  let state: LoopState = { kind: 'open', closeRequested: false };
  for (const { record: r } of records) {
    if (r.type === 'close_requested' && state.kind === 'open') {
      state = { kind: 'open', closeRequested: true };
    }
    if (r.type === 'guard_verdict') {
      state = r.closed
        ? { kind: 'awaiting_confirm', basis: r.basis }
        : { kind: 'open', closeRequested: false };
    }
    if (r.type === 'loop_ended') state = { kind: 'ended', closed: r.closed };
  }
  return state;
}

/** 主对话里还没选的最新一张选择卡。 */
export function pendingCard(records: NumberedRecord[]): ChoiceCard | undefined {
  const chosen = new Set(
    records.flatMap((r) => (r.record.type === 'choice_made' ? [r.record.cardId] : [])),
  );
  const cards = records.flatMap((r) => (r.record.type === 'choice_card' ? [r.record] : []));
  const last = cards.at(-1);
  return last && !chosen.has(last.cardId) ? last : undefined;
}
