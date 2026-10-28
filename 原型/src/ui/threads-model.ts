// 讨论串（项目对话右边那一栏）的纯转换：一个项目开出去的任务对话 → 等你 / 进行中 / 已结束。
// 想调“什么算结束、什么算等你、每行带什么小标签”，只改下面 GROUP_OF 与 TAG_OF 两张表。
import type { SessionMark, SessionSummary } from '../shared/protocol.ts';
import { W } from './wording.ts';

export type ThreadGroup = 'waiting' | 'running' | 'ended';

/** 讨论串里列的对话种类（主对话本身、后台整理不列）。 */
const THREAD_KINDS = new Set<SessionSummary['kind']>(['talk', 'loop', 'nav', 'find', 'output']);

/** 记号 → 分组；没有记号 = 进行中。 */
const GROUP_OF: Record<SessionMark, ThreadGroup> = {
  guarded: 'waiting', // 守卫整理好了，等学习者点“学完了”或再补一句
  candidates: 'waiting', // 找资料交回候选，等学习者勾
  shelved: 'running', // 学习停着：没结束，点开说句话就接上
  closed: 'ended',
  unclosed: 'ended', // 没合上就结束 = 设计里的“搁着”
  ended: 'ended',
};

/** 行尾的小标签（没有的不显示）。 */
const TAG_OF: Partial<Record<SessionMark, string>> = {
  guarded: W.threads.tagGuarded,
  candidates: W.threads.tagCandidates,
  shelved: W.shelvedBadge,
  closed: W.threads.tagClosed,
  unclosed: W.learnedStatus.没合上,
};

export interface ThreadRow {
  id: string;
  kind: SessionSummary['kind'];
  title: string;
  tag?: string;
  /** 排序与显示用：最近活动。 */
  at: string;
}

export function threadGroups(
  sessions: readonly SessionSummary[],
  projectId: string,
): Record<ThreadGroup, ThreadRow[]> {
  const out: Record<ThreadGroup, ThreadRow[]> = { waiting: [], running: [], ended: [] };
  for (const s of sessions) {
    if (s.parent !== projectId || !THREAD_KINDS.has(s.kind)) continue;
    const tag = s.mark !== undefined ? TAG_OF[s.mark] : undefined;
    out[s.mark !== undefined ? GROUP_OF[s.mark] : 'running'].push({
      id: s.sessionId,
      kind: s.kind,
      title: s.title,
      at: s.lastAt ?? s.openedAt,
      ...(tag !== undefined ? { tag } : {}),
    });
  }
  for (const g of Object.values(out)) g.sort((a, b) => b.at.localeCompare(a.at));
  return out;
}
