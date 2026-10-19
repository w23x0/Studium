// 批 10b 的接口类型：资料的来源说明、跨领域单子的显示、状态回看与学习者解释。
// protocol.ts 把它们 re-export，界面从 protocol.ts 取。
import type { CrossKind } from './records-cross.ts';
import type { StateRecordView } from './protocol.ts';

// ───────────── 来源可靠性与适用性说明（`docs/设计/记录/资料.md`） ─────────────

export const SOURCE_NOTE_FIELDS = ['type', 'level', 'author', 'scope', 'remark'] as const;
export type SourceNoteField = (typeof SOURCE_NOTE_FIELDS)[number];

/** 说明里的一项，带来历：程序算的 / 资料自带的 / 学习者补的 / 模型补的。 */
export interface NoteItem {
  value: string;
  from: '程序' | '资料' | '学习者' | '模型';
  at?: string;
}

export interface SourceNoteAddition {
  id: string;
  at: string;
  book: string;
  field: SourceNoteField;
  text: string;
  by: '学习者' | '模型';
  /** 模型补的：哪个会话里补的；它写这一句的依据（读了什么）。 */
  sessionId?: string;
  basis?: string;
}

export interface SourceNoteView {
  book: string;
  title: string;
  kind: 'book' | 'note';
  /** 教材 / 讲义 / 个人笔记 / 网页；程序只会认出“个人笔记”，其余要补。 */
  type?: NoteItem;
  /** 层次（入门 / 进阶 / 研究生 …），自由写，不打分。 */
  level?: NoteItem;
  author?: NoteItem;
  /** 适用范围，一句。 */
  scope?: NoteItem;
  /** 已知的限制或别的备注（最新一条）。 */
  remark?: NoteItem;
  subject?: string;
  sections: number;
  hasOriginal: boolean;
  importedAt?: string;
  /** 转写质量：读得到的数据，不合成分数。 */
  quality: {
    /** 学习者报的错条数（报了还没有“修正”这一步，全部算还开着）。 */
    reports: number;
    text: string;
  };
  /** 全部补充，按时间；前面几项取其中最新的。 */
  additions: SourceNoteAddition[];
  /** 一句话版（出处标签悬停、模型工具结果用）。 */
  summary: string;
}

export interface SourceNotesResponse {
  notes: SourceNoteView[];
}

export interface SourceNoteResponse {
  note: SourceNoteView;
}

export interface AddSourceNoteRequest {
  book: string;
  field: SourceNoteField;
  text: string;
}

// ───────────── 跨领域学习：单子的显示 ─────────────

export interface CrossDomainView {
  kind: CrossKind;
  /** 另一边的点，一句话。 */
  otherPoint: string;
  problem: string;
}

// ───────────── 状态回看与学习者解释（`docs/设计/记录/状态记录.md`） ─────────────

export interface StateExplanationView {
  id: string;
  at: string;
  recordId: string;
  text: string;
}

export interface StateTimelineEntry {
  record: StateRecordView;
  /** 整理出这条记录的那一轮判的阶段；没有对上的整理就没有。 */
  stage?: string;
  explanations: StateExplanationView[];
}

export interface StateTimelineResponse {
  generatedAt: string;
  /** 按时间，旧的在前。 */
  entries: StateTimelineEntry[];
  /** 每次整理判的阶段（按时间）：回看时用来标出阶段怎么变。 */
  stages: { at: string; stage: string; basisSpan: string }[];
}

export interface AddExplanationRequest {
  text: string;
}

export interface AddExplanationResponse {
  explanation: StateExplanationView;
}
