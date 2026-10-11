// 练习任务（批 9，M03）的接口类型：某闭环的练习任务（状态、提交、反馈、提示次数）、错误模式、
// 题型 / 方法归纳、书里的习题清单。protocol.ts 把它们 re-export，界面从 protocol.ts 取。
import type { PointName } from './protocol-longterm.ts';
import type { PracticeDifficulty, PracticeFunction, PracticeSource } from './records-practice.ts';

/**
 * 任务现在的状态（由记录折叠得出）：
 * assigned 布置了还没作答 · submitted 作答了还没反馈 · feedback 反馈了（可再作答）· completed 完成 · abandoned 放弃。
 */
export type PracticeStatus = 'assigned' | 'submitted' | 'feedback' | 'completed' | 'abandoned';

/** 指回学习者的一行原话（行号 = 该闭环正本里的行号）。 */
export interface LearnerLineView {
  line: number;
  text: string;
}

export interface PracticeSubmissionView {
  at: string;
  /** interface = 经练习任务的接口提交；conversation = 学习者在对话里答的，由教学侧认作这道题的作答。 */
  via: 'interface' | 'conversation';
  lines: LearnerLineView[];
}

export interface PracticeErrorView {
  label: string;
  detail: string;
  lines: LearnerLineView[];
}

export interface PracticeFeedbackView {
  id: string;
  at: string;
  /** 反馈记录在闭环正本里的行。 */
  line: number;
  text: string;
  errors: PracticeErrorView[];
}

export interface PracticeHintView {
  at: string;
  by: 'learner' | 'teacher';
  note?: string;
}

export interface PracticeTaskView {
  id: string;
  loopSessionId: string;
  /** 布置记录在闭环正本里的行。 */
  line: number;
  at: string;
  focus: string;
  points: PointName[];
  clauseId?: string;
  /** 书里的习题带出处（citation 是教材出处标记）；生成题 kind = generated（界面标“生成”）。 */
  source: PracticeSource;
  prompt: string;
  deliverable: string;
  hintsAllowed: boolean;
  doneWhen: string;
  function: PracticeFunction;
  difficulty: PracticeDifficulty;
  stageCheck: boolean;
  follows?: string;
  status: PracticeStatus;
  /** 教学侧给了几次提示（递进：从有提示到无提示，看这个数）。 */
  hintsUsed: number;
  /** 学习者要了几次提示。 */
  hintsAsked: number;
  hints: PracticeHintView[];
  submissions: PracticeSubmissionView[];
  feedbacks: PracticeFeedbackView[];
  done?: {
    at: string;
    outcome: 'completed' | 'abandoned';
    note: string;
    by: 'teacher' | 'learner';
  };
}

export interface PracticeTasksResponse {
  loopSessionId: string;
  tasks: PracticeTaskView[];
}

export interface PracticeTaskResponse {
  task: PracticeTaskView;
}

/** 提交作答：text = 新的一句学习者原话（进闭环对话，教学侧给反馈）；lines = 认已有的学习者原话行。二选一。 */
export interface SubmitPracticeRequest {
  text?: string;
  lines?: number[];
}

export interface AbandonPracticeRequest {
  note?: string;
}

export interface PracticeErrorOccurrence {
  loopSessionId: string;
  loopTitle?: string;
  taskId: string;
  feedbackId: string;
  at: string;
  detail: string;
  lines: LearnerLineView[];
  /** 这道题对应的点（含子句两端），用来判断哪个闭环“相关”。 */
  points: PointName[];
}

/** 同一类错误（按类型名合并）。loops >= 2 才算模式（跨闭环重复）。 */
export interface ErrorPatternView {
  label: string;
  /** 出现在几个不同的闭环里。 */
  loops: number;
  occurrences: PracticeErrorOccurrence[];
}

export interface ErrorPatternsResponse {
  /** 跨闭环出现 >= 2 次的错误类型。 */
  patterns: ErrorPatternView[];
  /** 还没成模式的（只在一个闭环里出现过）。 */
  others: ErrorPatternView[];
}

export interface PracticeSummaryView {
  id: string;
  /** 归纳记在哪个闭环的正本里。 */
  loopSessionId: string;
  at: string;
  text: string;
  requestedBy: 'learner' | 'teacher';
  tasks: { loopSessionId: string; taskId: string; focus: string }[];
  evidence: { loopSessionId: string; line: number; text: string }[];
}

export interface PracticeSummariesResponse {
  summaries: PracticeSummaryView[];
}

/** 请教学侧据已完成的练习写一次归纳；不给 tasks = 这个闭环里已完成的全部。 */
export interface SummarizePracticeRequest {
  tasks?: string[];
}

export interface ExerciseItemView {
  line: number;
  text: string;
}

export interface ExerciseSectionView {
  num: string;
  title: string;
  chapter: string;
  file: string;
  pages?: string;
  /** 整份习题文件的教材出处标记。 */
  citation: string;
  totalLines: number;
  /** 习题文件里的非空行（最多前若干行，按行号）。 */
  items: ExerciseItemView[];
  truncated: boolean;
}

export interface ExerciseBookView {
  book: string;
  bookTitle: string;
  sections: ExerciseSectionView[];
}

/** 书里的习题清单（M07 习题文件）。按功能 / 难度筛由模型判断，程序只给清单。 */
export interface ExercisesResponse {
  books: ExerciseBookView[];
}
