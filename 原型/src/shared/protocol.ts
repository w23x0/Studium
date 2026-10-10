// 核心与界面之间的 HTTP / SSE 协议。界面只认这里的类型，不碰核心实现。
import type {
  ConversationKind,
  LearnerObjection,
  NumberedRecord,
  ObjectionTarget,
  SourceReport,
  SourceReportKind,
} from './records.ts';

export interface SessionSummary {
  sessionId: string;
  kind: ConversationKind;
  title: string;
  openedAt: string;
  parent?: string;
}

export interface CreateSessionResponse {
  session: SessionSummary;
}

export interface ProjectResponse {
  mainSessionId: string;
}

export interface ProjectSummary {
  mainSessionId: string;
  title: string;
  /** 主对话里最近谈定的方向目标。 */
  goal?: string;
}

export interface ListProjectsResponse {
  projects: ProjectSummary[];
}

export interface ChooseRequest {
  option: number;
}

export interface ChooseResponse {
  loopSessionId: string;
}

export interface ListSessionsResponse {
  sessions: SessionSummary[];
}

export interface RecordsResponse {
  records: NumberedRecord[];
  running: boolean;
}

export interface SendMessageRequest {
  text: string;
  /** 随消息附的图片（批 4），见下方「输入」。 */
  images?: MessageImageInput[];
}

export interface SearchResponse {
  hits: { sessionId: string; line: number; text: string }[];
}

// ───────────── 依据可见（批 1a）：界面读的数据，都是只读视图 ─────────────

/** 记录里实际执行的模型。取不到实际模型时 known 为假、name 是适配器名，note 写明这只是兜底。 */
export interface ModelInfo {
  name: string;
  known: boolean;
  note?: string;
}

/** 取不到实际执行模型时，存在记录 model 字段里的兜底说明里的固定字样。 */
export const MODEL_FALLBACK_MARK = '未取到实际执行模型';

/** 把记录里存的模型字符串还原成 ModelInfo。 */
export function modelInfoOf(stored: string): ModelInfo {
  if (!stored.includes(MODEL_FALLBACK_MARK)) return { name: stored, known: true };
  const name = stored.split('（')[0] ?? stored;
  return {
    name,
    known: false,
    note: '没取到实际执行的模型；这里显示的是适配器名，不代表真正跑的是哪个模型。',
  };
}

/** 书给的 = 原文有支撑；模型补的 = 书里找不到直接支撑（候选）；未审 = 不在处理过的范围里，没对原文审过。 */
export type M08Source = '书给的' | '模型补的' | '未审';

export const M08_SOURCE_NOTES: Record<M08Source, string> = {
  书给的: '原文有支撑',
  模型补的: '书里找不到直接支撑，是模型补的候选',
  未审: '不在处理过的范围里，没对原文审过',
};

export interface AnchorView {
  book: string;
  file: string;
  quote: string;
  page?: number;
  bbox?: number[];
  line?: number;
}

export interface PointView {
  id: string;
  name: string;
  sentence: string;
  anchors: AnchorView[];
  source: M08Source;
  sourceNote: string;
  threshold?: boolean;
  scope?: '范围内' | '前置';
  splitOf?: { id: string; name: string };
  cautions: { text: string; anchors: AnchorView[] }[];
}

export interface ClauseView {
  id: string;
  from: { id: string; name: string }[];
  to: { id: string; name: string };
  text: string;
  anchors: AnchorView[];
  source: M08Source;
  sourceNote: string;
  notes: string[];
}

export interface Points08Response {
  points: PointView[];
  /** M08 是否整个是空的（缺通用知识依据）。 */
  empty: boolean;
}

export interface Point08Response {
  point: PointView;
  /** 进入这个点的子句 / 从这个点出发的子句。 */
  into: ClauseView[];
  from: ClauseView[];
}

export interface Clause08Response {
  clause: ClauseView;
}

/** 单子里引用的 M08 点；found 为假 = M08 里查不到（name 退回 id）。 */
export interface PointRef {
  id: string;
  name: string;
  found: boolean;
  sentence?: string;
  source?: M08Source;
}

export interface TicketView {
  newPoint: PointRef;
  /** M08 里查不到这条子句时为空。 */
  clause?: ClauseView;
  clauseId: string;
  startPoints: { point: PointRef; source: 'M09' | '自述' | '假定' }[];
  routeAction: string;
}

/** 选项出处里的一条，已尽量回查。resolved 为假 = 查不到（原样给出 raw）。 */
export interface SourceView {
  raw: string;
  kind: 'm08_point' | 'm08_clause' | 'm09_record' | 'loop_line' | 'book_line' | 'unknown';
  resolved: boolean;
  label: string;
  /** 回查到的内容：点的一句话、形成记录的理解、闭环那一行的原话。 */
  detail?: string;
  sessionId?: string;
  line?: number;
  file?: string;
  /** book_line 查到原文时：书、行段、那几行（带行号）、小节标题；在资料浏览里打开用同一组值。 */
  book?: string;
  from?: number;
  to?: number;
  lines?: NumberedLine[];
}

export interface CardOptionView {
  index: number;
  title: string;
  reason: string;
  recommended: boolean;
  chosen: boolean;
  ticket: TicketView;
  /** 旧卡没有出处：为空（不编）。 */
  sources?: SourceView[];
}

export interface CardView {
  cardId: string;
  /** 卡贴在哪个项目的主对话、第几行。 */
  mainSessionId: string;
  line: number;
  at: string;
  trigger: string;
  recommended: number;
  m05SessionId: string;
  model: ModelInfo;
  chosen?: { option: number; loopSessionId: string };
  options: CardOptionView[];
}

export interface CardResponse {
  card: CardView;
}

/** 学习者异议的视图：inLoop = 已作为学习者原话进了闭环（line 是它在闭环正本里的行）。 */
export interface ObjectionView extends LearnerObjection {
  inLoop: boolean;
  line?: number;
}

export interface QuoteView {
  line: number;
  at: string;
  /** 这一行的原话；该行不是对话行时为空。 */
  text?: string;
}

export interface GuardVerdictView {
  /** 判定在闭环正本里的行号（异议指向它）。 */
  line: number;
  at: string;
  closed: boolean;
  basis: string;
  /** 程序核对不过时的原因。 */
  problem?: string;
  guardSessionId: string;
  model: ModelInfo;
  /** 守卫引用的闭环行与那几行的原文。 */
  quotes: QuoteView[];
  /** 触发这次判定的收口申请。 */
  request?: { line: number; at: string; by: 'model' | 'learner'; reason: string };
  objections: ObjectionView[];
}

export interface DiagnosisView {
  line: number;
  at: string;
  text: string;
}

export type LoopStatus = 'in_progress' | 'closed' | 'unclosed';

export interface LoopEvidence {
  sessionId: string;
  title: string;
  mainSessionId?: string;
  openedAt: string;
  status: LoopStatus;
  endedAt?: string;
  endNote?: string;
  /** 开场单子（M05 给的）。 */
  ticket?: TicketView;
  /** 闭环对话（教学侧）用的模型；诊断记录由它写。 */
  model: ModelInfo;
  verdicts: GuardVerdictView[];
  diagnoses: DiagnosisView[];
  /** 这个闭环里的全部异议（含已结束闭环上记在异议存放处的）。 */
  objections: ObjectionView[];
}

export interface LoopBrief {
  sessionId: string;
  title: string;
  openedAt: string;
  endedAt?: string;
  status: LoopStatus;
  newPoint?: PointRef;
  /** 最近一次守卫判定。 */
  lastVerdict?: { closed: boolean; line: number };
}

/** 项目页：本项目下的闭环按状态分组。 */
export interface ProjectOverview {
  mainSessionId: string;
  title: string;
  goal?: string;
  groups: {
    /** 进行中。 */
    inProgress: LoopBrief[];
    /** 等你选：有还没选的选择卡。 */
    awaitingChoice: CardView[];
    /** 合上。 */
    closed: LoopBrief[];
    /** 没合上（停车场）。 */
    unclosed: LoopBrief[];
  };
}

export interface FormationView {
  id: string;
  at: string;
  loopSessionId: string;
  newPoint: PointRef;
  clause: string;
  startPoints: PointRef[];
  understanding: string;
  process: string;
  unmet: string;
  evidenceStrength: string;
  evidence?: {
    newPoint: { time: string; independence: string };
    startPoints: { point: string; time: string; independence: string }[];
  };
  evidenceLines: number[];
  /** 证据行在闭环正本里的原话。 */
  quotes: QuoteView[];
  model: ModelInfo;
  objections: ObjectionView[];
}

export interface StrategyView {
  id: string;
  at: string;
  loopSessionId: string;
  conditions: string;
  strategies: string;
  followedBy: string;
  evidenceLines: number[];
  quotes: QuoteView[];
  toolsUsed: string[];
  model: ModelInfo;
  objections: ObjectionView[];
}

export interface StateRecordView {
  id: string;
  at: string;
  text: string;
  source: '自述' | '观察' | '推断';
  output: '承载读数' | '解释候选';
  timeRange: string;
  refs: { sessionId: string; lines: number[]; quotes: QuoteView[] }[];
  m15SessionId: string;
  model: ModelInfo;
  objections: ObjectionView[];
}

export interface CurrentStateView {
  at: string;
  text: string;
  stage: string;
  basisSpan: string;
  m15SessionId: string;
  model: ModelInfo;
}

export interface FormationsResponse {
  records: FormationView[];
}

export interface StrategiesResponse {
  records: StrategyView[];
}

export interface StateResponse {
  /** 没整理过时为空。 */
  current?: CurrentStateView;
  records: StateRecordView[];
}

export interface LoopEvidenceResponse {
  loop: LoopEvidence;
}

export interface ProjectOverviewResponse {
  overview: ProjectOverview;
}

/** 对守卫判定提异议：line = 判定在闭环正本里的行号。 */
export interface VerdictObjectionRequest {
  line: number;
  text: string;
}

/** 对 M09 / M10 / M15 的一条记录提异议。 */
export interface RecordObjectionRequest {
  kind: 'm09' | 'm10' | 'm15';
  recordId: string;
  text: string;
}

export interface ObjectionResponse {
  objection: ObjectionView;
}

export interface ObjectionsResponse {
  /** 异议存放处里的异议（不含还开着的闭环里作为原话追加的那种）。 */
  objections: ObjectionView[];
}

export interface SessionModelResponse {
  model: ModelInfo;
}

/** 外发披露：内容送往哪个服务、各类会话用的模型。 */
export interface DisclosureResponse {
  /** 内容送往的服务。 */
  service: string;
  /** 经什么通道。 */
  route: string;
  /** 适配器名。 */
  adapter: string;
  /** 会送出去的内容。 */
  sends: string[];
  /** 各类会话配的模型与强度；model 为空 = 没单独指定（用服务默认，实际执行的模型记在每条记录里）。 */
  sessions: {
    kind: ConversationKind;
    label: string;
    model: string | null;
    effort: string | null;
  }[];
  note: string;
  /** 输入（图片转写、语音）各送往哪里（批 4）。 */
  inputs: InputDisclosure[];
}

/** 各类会话的日常叫法（外发披露、记录出处里给学习者看）。 */
export const CONVERSATION_KIND_LABELS: Record<ConversationKind, string> = {
  main: '项目主对话',
  talk: '谈方向',
  loop: '学习对话',
  guard: '判断学没学会',
  m09: '写“我会什么”的记录',
  m05: '出下一步选项',
  m15: '整理“我的状态”',
  m10: '记教法效果',
};

export type { ObjectionTarget };

// ───────────── 原文与出处（批 2a）：资料浏览、全文检索、原件页面、教材出处、资料报错 ─────────────

export type { SourceReport, SourceReportKind };

/** PDF 页范围，1 起、含两端。 */
export interface PageSpan {
  from: number;
  to: number;
}

/**
 * 页面上的位置框：[x0, y0, x1, y1]，各取 0–1000，是占整页宽（x）、高（y）的千分比，原点在页面左上角
 * （MinerU content_list 的坐标，M08 锚点的 bbox 同此）。界面按渲染出的图的实际宽高乘 / 1000 就是像素位置，
 * 与渲染分辨率无关。
 */
export type BBox = [number, number, number, number];

export interface NumberedLine {
  /** 行号：小节文件里的行，从 1 数；与 read_source 印的行号一致。 */
  n: number;
  text: string;
}

/** 书库里的一本书。hasOriginal = 找得到 PDF 原件（页面能调出来）。 */
export interface BookSummary {
  id: string;
  title: string;
  /** 有正文文件的条目数。 */
  sections: number;
  hasOriginal: boolean;
}

export interface BooksResponse {
  books: BookSummary[];
}

/** 目录里的一条。file 为空 = 这一条没有独立正文（如只有标题的章，见下级条目）。 */
export interface TocEntry {
  /** 编号（1、1.2、…）；习题 / 附注等按书里的写法。 */
  num: string;
  /** part 篇 · ch 章 · sec 节 · prob 习题 · app 附录 · front 正文前 · back 正文后 · note 附注 · ans 书末答案 · x 其他。 */
  kind: string;
  title: string;
  /** 书上印的页码（“p.2–10”）。 */
  pages?: string;
  /** 小节文件，相对于这本书的 m07/ 目录。 */
  file?: string;
  /** 所在章（章目录名，如 ch03；没有文件的条目按编号推）。 */
  chapter: string;
  level?: number;
  /** 原 PDF 页范围；旧格式的目录没有。 */
  pdfPages?: PageSpan;
  note?: string;
  examples?: string[];
}

export interface TocResponse {
  book: string;
  title: string;
  entries: TocEntry[];
}

export interface SectionResponse {
  book: string;
  bookTitle: string;
  file: string;
  /** 目录里的这一条；文件不在目录里时为空。 */
  entry?: TocEntry;
  /** 文件总行数。 */
  totalLines: number;
  /** 实际返回的行段（含两端）。 */
  from: number;
  to: number;
  lines: NumberedLine[];
  /** 目录顺序里前一个 / 后一个有正文的小节。 */
  prev?: TocEntry;
  next?: TocEntry;
}

export interface SearchHit {
  book: string;
  bookTitle: string;
  file: string;
  num: string;
  title: string;
  /** 命中段里第一个出现检索词的行。 */
  line: number;
  snippet: string;
  /** 小节起页（原 PDF 页）；旧格式目录没有。 */
  pdfPage?: number;
}

export interface LibrarySearchResponse {
  query: string;
  hits: SearchHit[];
  /** 命中的段落总数（hits 是排序后截断的前若干条）。 */
  total: number;
}

/** 内容块在页面上的位置（MinerU content_list）；text 是块里的字（截短）。 */
export interface PageBlock {
  type: string;
  bbox: BBox;
  text?: string;
}

/** M08 的点挂在这一页上的原文锚点。 */
export interface PageAnchor {
  pointId: string;
  pointName: string;
  quote: string;
  bbox?: BBox;
}

export interface PageResponse {
  book: string;
  page: number;
  /** 找得到这一页的 PDF 原件。 */
  available: boolean;
  /** 本机能把这一页渲染成图（需要 pdftoppm）。 */
  canRender: boolean;
  /** 原件页面的图（PNG）；加 ?bbox=x0,y0,x1,y1（同上千分比）可只取这一块。带口令访问。 */
  imageUrl?: string;
  blocks: PageBlock[];
  anchors: PageAnchor[];
  /** 没有原件时说明原因。 */
  note?: string;
}

/** 一行原文在原件上的位置（按文字比对 content_list 块，比不出来的行不返回）。 */
export interface LineLocation {
  line: number;
  page: number;
  bbox: BBox;
}

export interface LocateResponse {
  book: string;
  file: string;
  locations: LineLocation[];
}

/** 回复里的一个教材出处，核对过：resolved 为假 = 书 / 文件 / 行号对不上（原样给出，不编）。 */
export interface CitationView {
  raw: string;
  /** 在被解析文本里的起止位置。 */
  start: number;
  end: number;
  book: string;
  file: string;
  from: number;
  to: number;
  resolved: boolean;
  /** 对不上的原因。 */
  problem?: string;
  bookTitle?: string;
  /** 小节编号与标题，如 “3.1 Spaces of Vectors”。 */
  section?: string;
  pages?: string;
  pdfPages?: PageSpan;
  /** 引到的那几行原文（超出文件末尾的截到末尾）。 */
  lines?: NumberedLine[];
  /** 引文第一行在原件上的位置（比得出才有）。 */
  location?: LineLocation;
}

export interface ResolveCitationsRequest {
  text: string;
}

export interface ResolveCitationsResponse {
  citations: CitationView[];
}

export interface SourceReportRequest {
  book: string;
  file: string;
  from: number;
  to?: number;
  kind: SourceReportKind;
  text: string;
  page?: number;
}

export interface SourceReportResponse {
  report: SourceReport;
}

export interface SourceReportsResponse {
  reports: SourceReport[];
}

export interface ErrorResponse {
  error: string;
}

/** SSE 推给界面的事件。 */
export type ServerEvent =
  | { type: 'record'; sessionId: string; line: number; record: NumberedRecord['record'] }
  | { type: 'delta'; sessionId: string; text: string }
  | { type: 'running'; sessionId: string; running: boolean };

export const API_PREFIX = '/api';

// ───────────── 输入（批 4）：图片 / 拍照手写、语音、公式 ─────────────

/** 收的图片类型（与模型接口能看的一致）。 */
export const IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'] as const;
export type ImageMime = (typeof IMAGE_MIME_TYPES)[number];

/** 送去转写的图最大多少字节（模型接口单张图片有上限；超过的界面先缩小一份副本再转写，原图照存）。 */
export const TRANSCRIBE_MAX_BYTES = 3.5 * 1024 * 1024;

/** 输入存放处里的一张图片（只追加；原图原样保存，不改）。 */
export interface AttachmentView {
  id: string;
  at: string;
  mime: ImageMime;
  size: number;
  sha256: string;
  /** 学习者那边的文件名（有就记）。 */
  name?: string;
  /** 这是界面为转写缩小的副本：出自哪张原图。 */
  derivedFrom?: string;
  /** 取图地址（带 ?token= 可直接做 <img src>）。 */
  url: string;
}

export interface UploadAttachmentResponse {
  attachment: AttachmentView;
}

/** 一次转写：图片经模型接口转成的文字（公式用 LaTeX）。 */
export interface TranscriptionView {
  id: string;
  at: string;
  /** 转写的是哪张图（可能是缩小副本）。 */
  attachmentId: string;
  text: string;
  /** 转写用的实际执行模型；取不到时 known 为假并写明兜底。 */
  model: ModelInfo;
}

export interface TranscribeResponse {
  transcription: TranscriptionView;
}

export interface AttachmentInfoResponse {
  attachment: AttachmentView;
  /** 这张图（及它的缩小副本）的全部转写，早的在前。 */
  transcriptions: TranscriptionView[];
}

/** 发消息时带的一张图：原图 id + 用的哪次转写 + 学习者改过的文字（不给就照转写原文）。 */
export interface MessageImageInput {
  attachmentId: string;
  transcriptionId?: string;
  text?: string;
}

/** 一种输入送往哪里（外发披露）。 */
export interface InputDisclosure {
  what: string;
  service: string;
  /** 用的模型；null = 服务默认或不适用。 */
  model: string | null;
  note: string;
}
