// 对话原文 → 给模型读的带行号文本（00 原则 8）。行号 = 正本 JSONL 的行号，引用只写行号。
// 只放对话本身（学习者、教学、程序推的事）与学习者在组件上的操作；沙盒动作、工具调用、原始消息不放。
// 块编号、组件编号、版本号不进（会话/学习对话.md §11.2 主模型行）。
import type { LogRecord, NumberedRecord } from '../shared/records.ts';
import { quotesPrefix } from '../shared/stream-page.ts';
import { localMinute } from '../shared/time.ts';

/**
 * labelOf：别的会话发来的话写谁发的（不给就写会话 id）；self：这个会话自己的模型写作什么（学习对话 = 教学）。
 * 学习对话对学习者话的整理（W17）同一行只放最后一次。
 */
export function renderTranscript(
  records: NumberedRecord[],
  labelOf: (sessionId: string) => string = (id) => id,
  self = '教学',
): string {
  const lastTidy = new Map<number, number>();
  for (const { line, record: r } of records) {
    if (r.type === 'message_tidied') lastTidy.set(r.line, line);
  }
  const out: string[] = [];
  for (const { line, record: r } of records) {
    if (r.type === 'message_tidied' && lastTidy.get(r.line) !== line) continue;
    const one = speech(r, labelOf, self);
    if (one === undefined) continue;
    const body = one.text.replace(/\n/g, '\n      ');
    out.push(`L${String(line)} ${one.who}（${localMinute(r.at)}）：${body}`);
  }
  return out.join('\n');
}

/** W14 前开场时程序附的内容接在交代后面的写法。 */
const OLD_ATTACHED = '\n\n（程序附）';

/** 一条记录在对话原文里谁说了什么；学习者在组件上的操作也算（会话/学习对话.md §3）。 */
function speech(
  r: LogRecord,
  labelOf: (sessionId: string) => string,
  self: string,
): { who: string; text: string } | undefined {
  switch (r.type) {
    case 'user_message':
      return {
        who: '学习者',
        text:
          r.replyTo !== undefined
            ? `（回在「${r.replyTo.pointer}」下面）${r.text}`
            : `${quotesPrefix(r.quotes ?? [])}${r.text}`,
      };
    case 'assistant_message':
      return { who: self, text: r.text };
    case 'program_fact':
      return { who: '程序', text: r.text };
    case 'thread_message':
      return {
        who: `${labelOf(r.from)}${r.reply === true ? '回话' : '发来'}`,
        text: [
          // W14 前程序附的内容拼在 text 末尾（“（程序附）……”）；W14 起另存 attached。旧行渲染时去掉，正本不动
          r.attached === undefined ? r.text.split(OLD_ATTACHED)[0] : r.text,
          ...(r.cited ?? []).map(
            (c) => `（附学习者原话 ${labelOf(c.session)} L${String(c.line)}）${c.text}`,
          ),
        ].join('\n'),
      };
    case 'message_edited':
      return r.by === 'learner'
        ? { who: '学习者', text: `（把第 ${String(r.line)} 行改成）${r.text}` }
        : { who: self, text: `（把第 ${String(r.line)} 行改成）${r.text}` };
    case 'message_tidied':
      return {
        who: '整理',
        text: `（L${String(r.line)} 学习者的话，学习对话整理的，不是原话）\n${r.text}`,
      };
    case 'component_action':
      return { who: '学习者', text: `（在组件上）${r.text}` };
    // 旧数据：区域图学习页的子代理交回的话
    case 'subagent_result':
      return { who: '子代理交回', text: r.text };
    default:
      return undefined;
  }
}
