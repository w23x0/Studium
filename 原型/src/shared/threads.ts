// 讨论串（一个项目开出去的任务对话）的分组与“现在结束没有”：界面的讨论串栏、主对话里的卡片与 list_threads 共用这一处。
// 想调“什么算结束、什么算等你”，只改 GROUP_OF。
import type { SessionMark, SessionSummary } from './protocol.ts';
import type { ConversationKind, LogRecord } from './records.ts';

/** 讨论串的状态（W12 §4.1：卡片与右栏同一来源）：等你 / 进行中 / 停着 / 已结束。 */
export type ThreadGroup = 'waiting' | 'running' | 'paused' | 'ended';

/** 讨论串里列的对话种类（主对话本身、导入会话不列；写产出是旧数据，照旧列着只读看）。 */
export const THREAD_KINDS: ReadonlySet<ConversationKind> = new Set<ConversationKind>([
  'talk',
  'loop',
  'find',
  'output',
]);

/** 记号 → 分组；没有记号 = 进行中。 */
export const GROUP_OF: Record<SessionMark, ThreadGroup> = {
  // 记号名 guarded 是守卫时期留下的、值不改：现在 = 收尾那一句到了，等学习者点“学完了”或再补一句（与守卫无关）
  guarded: 'waiting',
  candidates: 'waiting', // 旧数据：找资料交回候选，等学习者勾
  shelved: 'paused', // 旧数据：搁置着的学习，没结束，点开说句话就接上
  closed: 'ended',
  unclosed: 'ended', // 没合上就结束 = 设计里的“搁着”
  ended: 'ended',
};

export function threadGroup(s: SessionSummary): ThreadGroup {
  return s.mark !== undefined ? GROUP_OF[s.mark] : 'running';
}

/** 可重开的讨论串现在算不算结束：按正本里最后一条结束 / 重开记录。 */
export function threadEnded(records: readonly { record: LogRecord }[]): boolean {
  let ended = false;
  for (const { record } of records) {
    if (
      record.type === 'talk_ended' ||
      record.type === 'candidates_picked' ||
      record.type === 'thread_closed'
    ) {
      ended = true;
    } else if (record.type === 'thread_reopened' || record.type === 'find_candidates') {
      ended = false;
    }
  }
  return ended;
}
