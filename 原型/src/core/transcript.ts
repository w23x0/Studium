// 对话原文 → 给模型读的带行号文本（00 原则 8）。行号 = 正本 JSONL 的行号，引用只写行号。
// 只放对话本身（学习者、教学、程序事实）；诊断记录、工具调用、原始消息不放（守卫不读教学侧推理）。
import type { NumberedRecord } from '../shared/records.ts';

export function renderTranscript(records: NumberedRecord[]): string {
  const out: string[] = [];
  for (const { line, record: r } of records) {
    const who =
      r.type === 'user_message'
        ? '学习者'
        : r.type === 'assistant_message'
          ? '教学'
          : r.type === 'program_fact'
            ? '程序'
            : undefined;
    if (who === undefined || !('text' in r)) continue;
    const body = r.text.replace(/\n/g, '\n      ');
    out.push(`L${String(line)} ${who}（${r.at.slice(0, 16).replace('T', ' ')}）：${body}`);
  }
  return out.join('\n');
}

/** 行号是不是学习者自己说的话（守卫引用的证据只认这种行）。 */
export function learnerLines(records: NumberedRecord[]): Set<number> {
  return new Set(records.filter((r) => r.record.type === 'user_message').map((r) => r.line));
}
