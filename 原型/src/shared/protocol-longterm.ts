// 跨闭环的长期功能（批 6）的接口类型：M09 当前视图与时间版本、分析重做、提醒与“今天该做的”、
// 路线偏差记录、接着学、阶段复盘。protocol.ts 把它们 re-export，界面从 protocol.ts 取。
import type { ReminderKind, Suspicion, Revisit } from './records-longterm.ts';

/** 点的简写：id 与名字（M08 里查不到时 name 同 id）。 */
export interface PointName {
  id: string;
  name: string;
}

/** 当前视图里一个点现在的状态（按时间折叠形成记录与时间版本记录得出；不替代底层记录）。 */
export type ViewStatus = '闭环证据' | '提取失败' | '降档' | '重新掌握' | '仅外部导入';

export interface ViewEvidence {
  /** 最近一次证据所在的形成记录（该闭环的最新一版分析）。 */
  recordId: string;
  at: string;
  loopSessionId: string;
  /** 这个点在那个闭环里是新点还是出发点。 */
  role: '新点' | '出发点';
  /** 证据强度的文字：“仅当场、独立”等。 */
  strength: string;
  /** 那次是复习 / 复检。 */
  revisit?: Revisit['kind'];
}

/** M09 当前视图的一行：每个点一行，派生层，可从记录重算。 */
export interface PointViewEntry {
  point: PointName;
  /** 当前档次（四级理解标签，只作索引）；没标过就没有。 */
  level?: string;
  status: ViewStatus;
  /** 最近一次闭环证据；只有外部导入时没有。 */
  lastEvidence?: ViewEvidence;
  /** 最近一次碰过（闭环证据或时间版本记录）；只有外部导入时是导入时间。 */
  lastTouchedAt: string;
  /** 距今多少天没碰了（按核心的时钟）。 */
  daysSince: number;
  /** 一句话摘要。 */
  summary: string;
  /** 检索关键词。 */
  keywords: string[];
  /** 最新一版分析是第几版（同一个闭环的分析可以重做）。 */
  versions: number;
  /** 依据：几个闭环的证据、几条外部导入。 */
  sources: { loops: number; external: number };
  /** 影响当前档次的时间版本记录（旧在前）。 */
  timeline: { id: string; at: string; kind: string }[];
}

export interface PointViewResponse {
  generatedAt: string;
  entries: PointViewEntry[];
}

export interface PointViewDetailResponse {
  entry: PointViewEntry;
  /** 这个点的全部时间版本记录。 */
  timeline: TimelineView[];
}

export interface TimelineView {
  id: string;
  at: string;
  kind: '提取失败' | '降档' | '重新掌握';
  point: PointName;
  loopSessionId: string;
  /** 指向的旧记录 id。 */
  targets: string[];
  reason: string;
  evidenceLines: number[];
  stateRuledOut?: string;
  level?: string;
  model: { name: string };
}

export interface TimelineResponse {
  records: TimelineView[];
}

/** 对一个已合上的闭环重新分析（用当前模型）；新版本并存，旧版本不动。 */
export interface ReanalyzeRequest {
  loop: string;
}

export interface ReminderView {
  id: string;
  /** YYYY-MM-DD。 */
  due: string;
  kind: ReminderKind;
  text: string;
  point?: PointName;
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
  point?: string;
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

/** 路线偏差记录（M05:23）：只记计划偏差的事实，不形成对学习者水平的结论。 */
export type DeviationKind = 'not_recommended' | 'ended_unclosed' | 'detour_choice';

export interface DeviationView {
  id: string;
  at: string;
  mainSessionId: string;
  kind: DeviationKind;
  loopSessionId?: string;
  cardId?: string;
  /** 推荐项与学习者选的项（标题与新点）。 */
  recommended?: { option: number; title: string; newPoint?: PointName };
  chosen?: { option: number; title: string; newPoint?: PointName; kind?: string };
  /** 事实：学习者说了几句、开了多久（分钟）、很快放下吗。 */
  facts?: { learnerMessages: number; minutes: number; quickDrop?: boolean; note?: string };
}

export interface DeviationsResponse {
  records: DeviationView[];
}

/** 接着没合上的闭环学：开一个新闭环续接原闭环。 */
export interface ContinueLoopResponse {
  loopSessionId: string;
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

/** 闭环里教学侧记的“以前会的现在答不出”条目（结构化）。 */
export interface RegressionView {
  line: number;
  at: string;
  point: PointName;
  basisLines: number[];
  suspicion: Suspicion;
  against: string[];
  text: string;
}
