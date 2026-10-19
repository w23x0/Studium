// 长期功能的接口类型：提醒与“今天该做的”、路线偏差记录、接着学、阶段复盘。
// protocol.ts 把它们 re-export，界面从 protocol.ts 取。
import type { ReminderKind } from './records-longterm.ts';

/** 点的简写：id 与名字（name 等于 id）。 */
export interface PointName {
  id: string;
  name: string;
}

export interface ReminderView {
  id: string;
  /** YYYY-MM-DD。 */
  due: string;
  kind: ReminderKind;
  text: string;
  loopSessionId?: string;
  by: 'm05' | 'learner';
  addedAt: string;
  /** 办完 / 不要了；还开着就没有。 */
  closed?: { at: string; outcome: 'done' | 'dismissed'; by: 'learner' | 'program'; note?: string };
  /** 到期了（due 不晚于今天）且还开着。 */
  isDue: boolean;
}

export interface AddReminderRequest {
  /** YYYY-MM-DD；也可以不给 due、给 beforeDeadlineDays（在期限前几天）。 */
  due?: string;
  beforeDeadlineDays?: number;
  text: string;
  kind?: ReminderKind;
  loopSessionId?: string;
}

export interface RemindersResponse {
  today: string;
  reminders: ReminderView[];
}

export interface CloseReminderRequest {
  outcome?: 'done' | 'dismissed';
  note?: string;
}

/** “今天该做的”：项目页和项目概览带着。 */
export type TodayItem =
  | { kind: 'reminder'; reminder: ReminderView; overdueDays: number }
  | { kind: 'deadline'; date: string; daysLeft: number; note?: string }
  | { kind: 'review'; since: string; endedLoops: number };

export interface TodayView {
  date: string;
  items: TodayItem[];
}

/** 路线偏差（现算，不另存）：只记计划偏差的事实，不形成对学习者水平的结论。 */
export interface RouteDeviationView {
  kind: '没选推荐项' | '没合上就结束' | '中途改线';
  at: string;
  loopId?: string;
  text: string;
  /** 每条 `会话 id:行号`。 */
  refs: string[];
}

export interface RouteDeviationsResponse {
  mainSessionId: string;
  deviations: RouteDeviationView[];
}

export interface ReviewRequest {
  /** YYYY-MM-DD；不给 = 从上一次复盘（或项目开始）到现在。 */
  since?: string;
}

export interface ReviewResponse {
  reviewSessionId: string;
  since: string;
  until: string;
}

export interface ReviewBrief {
  sessionId: string;
  openedAt: string;
  since: string;
  until: string;
  /** 交回主对话的那一句；还没交回就没有。 */
  summary?: string;
  endedAt?: string;
}

export interface ReviewsResponse {
  reviews: ReviewBrief[];
}
