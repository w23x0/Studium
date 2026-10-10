// 跨闭环的长期功能（批 6）新增的正本记录类型与记录里的小结构。只加，不改旧字段的意思。
// records.ts 把这里的类型接进 Ticket / SessionOpened / LoopNote / TalkEnded / LogRecord。

/** 复习 / 复检：这张单子是回头去看以前合上过的点（M05:24-25）。 */
export const REVISIT_KINDS = ['复习', '复检'] as const;
export type RevisitKind = (typeof REVISIT_KINDS)[number];

export interface Revisit {
  kind: RevisitKind;
  /** 回头看的是哪几条以前的形成记录（M09 记录 id）；它们的新点就是单子的新点。 */
  formationIds: string[];
}

/** 接着没合上的原闭环学：新闭环续接原闭环（原闭环的正本不改）。 */
export interface ResumeOrigin {
  fromLoop: string;
  /** 原闭环结束的时间。 */
  endedAt: string;
}

/** 阶段复盘的时间窗口（ISO 时间）。 */
export interface ReviewWindow {
  since: string;
  until: string;
}

/** 教学侧怀疑“以前会的现在答不出”是什么原因：遗忘 · 提取失败 · 状态原因（疲劳等，不构成遗忘记录）。 */
export const SUSPICIONS = ['遗忘', '提取失败', '状态原因'] as const;
export type Suspicion = (typeof SUSPICIONS)[number];

/**
 * 诊断里的结构化条目（M04:18,49）：闭环里发现“以前会的（含外部导入）现在答不出 / 表现不符”。
 * 进行中只是候选；写 M09 的会话只读这类条目，不读诊断全文；提交时才可能成为 M09 的“提取失败 / 降档”记录。
 */
export interface RegressionNote {
  /** 哪个点（M08 点 id）。 */
  point: string;
  /** 指回本闭环里学习者原话的行。 */
  basisLines: number[];
  suspicion: Suspicion;
  /** 针对的旧记录（M09 形成记录 / 外部导入记录 id）；可空。 */
  against: string[];
}

export const REMINDER_KINDS = ['recheck', 'resume', 'deadline', 'review', 'other'] as const;
export type ReminderKind = (typeof REMINDER_KINDS)[number];

/** 应用内提醒（M05:30）：什么时候、做什么。只追加；记在项目主对话的正本里。 */
export interface ReminderAdded {
  type: 'reminder_added';
  at: string;
  id: string;
  /** YYYY-MM-DD。 */
  due: string;
  kind: ReminderKind;
  /** 做什么，用日常话。 */
  text: string;
  /** recheck：复检哪个点（M08 点 id）。 */
  point?: string;
  /** resume：接着哪个闭环。 */
  loopSessionId?: string;
  by: 'm05' | 'learner';
  m05SessionId?: string;
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
