// 批 10b 的接口类型：跨资料的检索标签与“别的书也讲这里”、资料的来源说明、跨领域单子的显示、状态回看与学习者解释。
// protocol.ts 把它们 re-export，界面从 protocol.ts 取。
import type { CrossKind } from './records-cross.ts';
import type { PointRef, SearchHit, StateRecordView } from './protocol.ts';

// ───────────── 跨资料：重复线索、检索标签 ─────────────

/** 一处“别的书也讲这里”：另一本书里讲同一个点的小节，和怎么连上的。 */
export interface SectionLink {
  book: string;
  bookTitle: string;
  file: string;
  num: string;
  title: string;
  pdfPage?: number;
  /** 连上它的点（本节与那一节各有一份锚点的点，或名字 / 检索词相同的点）。 */
  points: { id: string; name: string }[];
  /** anchor = 同一个点在两本书里都挂了锚点；same_name = 另一套 M08 里名字相同的点；same_key = 检索词相同。 */
  via: 'anchor' | 'same_name' | 'same_key';
}

export interface SectionLinksResponse {
  book: string;
  file: string;
  /** 本节讲到的点（M08 锚点落在本节的）。 */
  points: { id: string; name: string }[];
  /** 别的书里讲同一处的小节，按书排。没有就是空数组（不编）。 */
  others: SectionLink[];
}

/** 一条重复线索：同一知识点在几本书里各讲在哪里。 */
export interface ClueView {
  id: string;
  /** 线索的名字：点名（几个点同名取最常见的）。 */
  label: string;
  points: { id: string; name: string }[];
  sections: { book: string; bookTitle: string; file: string; num: string; title: string }[];
}

export interface CluesResponse {
  clues: ClueView[];
}

export const CONTENT_TYPES = ['定义', '例题', '习题'] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

/** 一条检索结果所在小节的标签：点名、内容类型（有依据才有，没有不编）。 */
export interface HitTags {
  points: { id: string; name: string }[];
  types: ContentType[];
}

export interface TaggedHit extends SearchHit {
  tags: HitTags;
}

export interface TaggedSearchResponse {
  query: string;
  hits: TaggedHit[];
  /** 筛之前命中的段落总数。 */
  total: number;
  /** 可用来筛的标签与各自的条数（按筛之前的命中算，换一个条件时不跟着缩）。 */
  facets: {
    books: { book: string; bookTitle: string; count: number }[];
    types: { type: ContentType; count: number }[];
    points: { id: string; name: string; count: number }[];
  };
}

// ───────────── 来源可靠性与适用性说明（M07:19） ─────────────

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
    /** 知识点抽取审核时报的疑似转录错误数；读不到审核报告为空。 */
    suspected?: number;
    /** 疑似转录错误数的出处（哪一套的审核报告）。 */
    suspectedFrom?: string;
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

// ───────────── 跨领域闭环：单子的显示 ─────────────

export interface CrossDomainView {
  kind: CrossKind;
  /** 新点所在的领域。 */
  domain: string;
  /** 另一边的点所在的领域。 */
  otherDomain: string;
  otherPoint: PointRef;
  problem: string;
}

// ───────────── 状态回看与学习者解释（M15:42） ─────────────

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
