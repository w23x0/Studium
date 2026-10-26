// 对话原文 → 给模型读的带行号文本（00 原则 8）。行号 = 正本 JSONL 的行号，引用只写行号。
// 只放对话本身（学习者、教学、程序推的事、子代理交回）与学习者在页面上的操作；沙盒动作、工具调用、原始消息不放
// （守卫不读教学侧推理）。块编号、版本号不进（会话/学习对话.md §11「版本」）。
import type { LogRecord, NumberedRecord } from '../shared/records.ts';
import { localMinute } from '../shared/time.ts';
import { describeActions } from './page/live-page.ts';

export function renderTranscript(records: NumberedRecord[]): string {
  const out: string[] = [];
  for (const { line, record: r } of records) {
    const one = speech(r);
    if (one === undefined) continue;
    const body = one.text.replace(/\n/g, '\n      ');
    out.push(`L${String(line)} ${one.who}（${localMinute(r.at)}）：${body}`);
  }
  return out.join('\n');
}

/** 一条记录在对话原文里谁说了什么；学习者在页面上的操作与子代理交回也算（会话/学习对话.md §3）。 */
function speech(r: LogRecord): { who: string; text: string } | undefined {
  switch (r.type) {
    case 'user_message':
      return { who: '学习者', text: r.text };
    case 'assistant_message':
      return { who: '教学', text: r.text };
    case 'program_fact':
      return { who: '程序', text: r.text };
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

/**
 * 守卫读的那份：按“谁做的”过滤（会话/守卫.md §2「开场给」、记录/对话与事件记录.md §3）——
 * 只留双方对话（学习者的话 + 给学习者的话）；单子另给。
 * 不进守卫的：程序事实（开场交付与中途推来的事实是给学习对话的，学习者没看到，开场里还有沙盒路径）、
 * 沙盒动作、原始消息、工具调用。
 */
export function guardView(records: NumberedRecord[]): string {
  return renderTranscript(
    records.filter(
      (r) =>
        r.record.type === 'user_message' ||
        r.record.type === 'assistant_message' ||
        r.record.type === 'page_actions' ||
        r.record.type === 'page_rollback' ||
        (r.record.type === 'page_version' && r.record.by === 'editor'),
    ),
  );
}

/** 行号是不是学习者自己说的话或在页面上做的事（守卫引用的证据只认这种行）。 */
export function learnerLines(records: NumberedRecord[]): Set<number> {
  return new Set(
    records
      .filter((r) => r.record.type === 'user_message' || r.record.type === 'page_actions')
      .map((r) => r.line),
  );
}
