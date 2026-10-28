// 讨论串（一个项目开出去的任务对话）的分组与“现在结束没有”：界面的讨论串栏与主对话每轮附上的讨论串清单共用这一处。
// 想调“什么算结束、什么算等你”，只改 GROUP_OF。
import type { SessionMark, SessionSummary } from './protocol.ts';
import type { ConversationKind, LogRecord } from './records.ts';

export type ThreadGroup = 'waiting' | 'running' | 'ended';

/** 讨论串里列的对话种类（主对话本身、后台整理不列）。 */
export const THREAD_KINDS: ReadonlySet<ConversationKind> = new Set<ConversationKind>([
  'talk',
  'loop',
  'nav',
  'find',
  'output',
]);

/** 能结束后再重开的种类：一次学习合上 / 没合上就定了（接着学另开一次），导航定了单子就交回。 */
export const REOPENABLE_KINDS: ReadonlySet<ConversationKind> = new Set<ConversationKind>([
  'talk',
  'find',
  'output',
]);

/** 记号 → 分组；没有记号 = 进行中。 */
export const GROUP_OF: Record<SessionMark, ThreadGroup> = {
  guarded: 'waiting', // 守卫整理好了，等学习者点“学完了”或再补一句
  candidates: 'waiting', // 找资料交回候选，等学习者勾
  shelved: 'running', // 学习停着：没结束，点开说句话就接上
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
