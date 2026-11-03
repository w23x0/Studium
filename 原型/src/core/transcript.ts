// 对话原文 → 给模型读的带行号文本（00 原则 8）。行号 = 正本 JSONL 的行号，引用只写行号。
// 只放对话本身（学习者、教学、程序推的事、子代理交回）与学习者在组件上的操作；沙盒动作、工具调用、原始消息不放。
// 块编号、组件编号、版本号不进（会话/学习对话.md §11.2 主模型行）。
import type { PageAction } from '../shared/page.ts';
import type { LogRecord, NumberedRecord } from '../shared/records.ts';
import { quotePrefix } from '../shared/stream-page.ts';
import { localMinute } from '../shared/time.ts';

/** labelOf：别的会话发来的话写谁发的（不给就写会话 id）。中途碎话（W12 §4.6）不放。 */
export function renderTranscript(
  records: NumberedRecord[],
  labelOf: (sessionId: string) => string = (id) => id,
): string {
  const out: string[] = [];
  for (const { line, record: r } of records) {
    const one = speech(r, labelOf);
    if (one === undefined) continue;
    const body = one.text.replace(/\n/g, '\n      ');
    out.push(`L${String(line)} ${one.who}（${localMinute(r.at)}）：${body}`);
  }
  return out.join('\n');
}

/** 一条记录在对话原文里谁说了什么；学习者在组件上的操作与子代理交回也算（会话/学习对话.md §3）。 */
function speech(
  r: LogRecord,
  labelOf: (sessionId: string) => string,
): { who: string; text: string } | undefined {
  switch (r.type) {
    case 'user_message':
      return {
        who: '学习者',
        text:
          r.replyTo !== undefined
            ? `（回在「${r.replyTo.pointer}」下面）${r.text}`
            : r.quote !== undefined
              ? `${quotePrefix(r.quote)}${r.text}`
              : r.text,
      };
    case 'assistant_message':
      return r.interim === true ? undefined : { who: '教学', text: r.text };
    case 'program_fact':
      return { who: '程序', text: r.text };
    case 'thread_message':
      return {
        who: `${labelOf(r.from)}${r.reply === true ? '回话' : '发来'}`,
        text: [
          r.text,
          ...(r.cited ?? []).map(
            (c) => `（附学习者原话 ${labelOf(c.session)} L${String(c.line)}）${c.text}`,
          ),
        ].join('\n'),
      };
    case 'message_edited':
      return r.by === 'learner'
        ? { who: '学习者', text: `（把第 ${String(r.line)} 行改成）${r.text}` }
        : { who: '教学', text: `（把第 ${String(r.line)} 行改成）${r.text}` };
    case 'component_action':
      return { who: '学习者', text: `（在组件上）${r.text}` };
    case 'component_report':
      return { who: '子代理交回', text: r.text };
    case 'screen_note':
      return { who: '框架', text: r.text };
    // 旧数据（10-26 的活页面）：学习者在页面上的动作
    case 'page_actions':
      return { who: '学习者', text: `（在页面上）${describeActions(r.actions)}` };
    case 'subagent_result':
      return { who: '子代理交回', text: r.text };
    // 以下是旧数据（10-26 前）：编辑员换版、退回、教训
    case 'page_version':
      return r.by === 'editor' ? { who: '页面', text: '页面改了一版（编辑员改的）' } : undefined;
    case 'page_rollback':
      return {
        who: '学习者（退回页面）',
        text: `退回到第 ${String(r.to)} 版（退掉 ${r.removed.join('、') || '无'}${r.added.length > 0 ? `，换回 ${r.added.join('、')}` : ''}；原因：${r.reason ?? '没选'}）`,
      };
    case 'page_lesson':
      return {
        who: r.by === 'model' ? '教训（模型写的，只作参考）' : '教训（程序拼的）',
        text: r.text,
      };
    default:
      return undefined;
  }
}

/** 行号是不是学习者自己说的话或在组件 / 旧页面上做的事（引用学习者的证据只认这种行）。 */
export function learnerLines(records: NumberedRecord[]): Set<number> {
  return new Set(
    records
      .filter(
        (r) =>
          r.record.type === 'user_message' ||
          r.record.type === 'component_action' ||
          r.record.type === 'page_actions',
      )
      .map((r) => r.line),
  );
}

/** 旧数据：10-26 活页面上的动作各一句（块编号不进上下文，只说做了什么）。 */
function describeActions(actions: PageAction[]): string {
  return actions
    .map((a) => {
      if (a.kind === 'toggle') return `${a.open ? '展开' : '折起'}了一块`;
      const detail = a.detail === undefined ? '' : `：${JSON.stringify(a.detail).slice(0, 600)}`;
      return `「${a.name}」${detail}`;
    })
    .join('；');
}
