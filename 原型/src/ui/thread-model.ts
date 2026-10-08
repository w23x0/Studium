// 正本记录 → 界面上的消息列表。纯函数，单测覆盖。
import type { NumberedRecord } from '../shared/records.ts';

export interface UiMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  /** 这条消息起始的正本行号，以后做引用跳转用。 */
  line: number;
  failed?: boolean;
}

export function toUiMessages(records: NumberedRecord[], draft: string): UiMessage[] {
  const out: UiMessage[] = [];
  for (const { line, record } of records) {
    if (record.type === 'user_message') {
      out.push({ id: `l${String(line)}`, role: 'user', text: record.text, line });
    } else if (record.type === 'assistant_message' || record.type === 'turn_failed') {
      const text =
        record.type === 'assistant_message' ? record.text : `（本轮没有完成：${record.reason}）`;
      const prev = out.at(-1);
      // 同一轮里的多段助手文字合成一条显示
      if (prev?.role === 'assistant' && prev.failed !== true) prev.text += `\n\n${text}`;
      else out.push({ id: `l${String(line)}`, role: 'assistant', text, line });
      if (record.type === 'turn_failed') {
        const last = out.at(-1);
        if (last) last.failed = true;
      }
    }
  }
  if (draft !== '') {
    out.push({ id: 'draft', role: 'assistant', text: draft, line: 0 });
  }
  return out;
}
