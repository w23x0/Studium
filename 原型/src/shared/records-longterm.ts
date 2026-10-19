// 跨多次学习的长期功能（批 6）新增的正本记录类型与记录里的小结构。只加，不改旧字段的意思。
// records.ts 把这里的类型接进 Ticket / SessionOpened / TalkEnded / LogRecord。

/** 复习 / 复检：这张单子是回头去看以前那次学习（记录/单子与路线.md、会话/导航.md「二级功能」）。 */
export const REVISIT_KINDS = ['复习', '复检'] as const;
export type RevisitKind = (typeof REVISIT_KINDS)[number];

export interface Revisit {
  kind: RevisitKind;
  /** 回看的是哪次学习（学习会话 id）。 */
  ofLoop: string;
  /** 那次学习里守卫判定所在的行号；没给 = 只看那次的单子与判定，不点具体某一行。 */
  verdictLine?: number;
}

/** 接着没合上的那次学：新的一次续接原来那次（原来那次的正本不改）。 */
export interface ResumeOrigin {
  fromLoop: string;
  /** 原来那次结束的时间。 */
  endedAt: string;
}

/** 阶段复盘的时间窗口（ISO 时间）。 */
export interface ReviewWindow {
  since: string;
  until: string;
}

/**
 * 阶段复盘交回时，核心往主对话里记的那条程序事实（交给主对话的模型）。界面认出它，在主对话里显示交回的那一句。
 * 核心写、界面认用同一处定义。
 */
export function reviewReturnedFact(reviewSessionId: string, summary: string): string {
  return `阶段复盘的对话（${reviewSessionId}）交回了：${summary}`;
}

/** 认出 reviewReturnedFact 写的那条事实；不是就返回空。 */
export function parseReviewReturned(
  text: string,
): { reviewSessionId: string; summary: string } | undefined {
  const m = /^阶段复盘的对话（([A-Za-z0-9_-]+)）交回了：([\s\S]*)$/.exec(text);
  if (m?.[1] === undefined || m[2] === undefined) return undefined;
  return { reviewSessionId: m[1], summary: m[2] };
}

export const REMINDER_KINDS = ['recheck', 'resume', 'deadline', 'review', 'other'] as const;
export type ReminderKind = (typeof REMINDER_KINDS)[number];

/** 应用内提醒（`docs/设计/会话/导航.md`「二级功能」计划、日程与提醒）：什么时候、做什么。只追加；记在项目主对话的正本里。 */
export interface ReminderAdded {
  type: 'reminder_added';
  at: string;
  id: string;
  /** YYYY-MM-DD。 */
  due: string;
  kind: ReminderKind;
  /** 做什么，用日常话。 */
  text: string;
  /** recheck：复检以前哪次学习；resume：接着哪次没合上的学习（学习会话 id）。 */
  loopSessionId?: string;
  by: 'nav' | 'learner';
  navSessionId?: string;
}

/** 提醒办完 / 不要了（另起一条记录，原提醒不改）。 */
export interface ReminderClosed {
  type: 'reminder_closed';
  at: string;
  /** 对应 reminder_added 的 id。 */
  id: string;
  outcome: 'done' | 'dismissed';
  by: 'learner' | 'program';
  note?: string;
}
