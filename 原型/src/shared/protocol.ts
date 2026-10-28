// 核心与界面之间的 HTTP / SSE 协议。界面只认这里的类型，不碰核心实现。
import { START_SOURCES } from './records.ts';
import type {
  ConversationKind,
  LearnerObjection,
  NumberedRecord,
  ObjectionTarget,
  Ticket,
  SourceReport,
  SourceReportKind,
  Understanding,
} from './records.ts';
import type { TodayView } from './protocol-longterm.ts';
import type { Import } from './protocol-learned.ts';

export type * from './protocol-longterm.ts';
export type * from './protocol-learned.ts';
export * from './protocol-cross.ts';

export interface SessionSummary {
  sessionId: string;
  kind: ConversationKind;
  title: string;
  openedAt: string;
  /** 最近一条记录的时间（派生层算的；左栏“最近”按它排）。 */
  lastAt?: string;
  parent?: string;
  /** 学习对话的来历：接着哪段没学完的学的（resume）。 */
  from?: { kind: 'resume'; loop: string };
  /** 这条对话最近一条“状态记录”说到哪了；没有 = 还在进行。讨论串怎么分组由界面按它定。 */
  mark?: SessionMark;
}

/**
 * 派生层记下的对话状态（只记事实，不分组）：
 * guarded 守卫交回、等学习者点“学完了” · closed / unclosed 学习合上 / 没合上就结束 · shelved 学习停着 ·
 * candidates 找资料交回候选、等学习者勾 · ended 谈方向谈定、找资料勾完、导航定了单子。
 */
export type SessionMark = 'guarded' | 'closed' | 'unclosed' | 'shelved' | 'candidates' | 'ended';

export interface ProjectResponse {
  mainSessionId: string;
}

export interface ProjectSummary {
  mainSessionId: string;
  title: string;
  /** 主对话里最近谈定的方向目标。 */
  goal?: string;
  /** 期限（YYYY-MM-DD）；没记就没有。 */
  deadline?: string;
}

export interface ListProjectsResponse {
  projects: ProjectSummary[];
}

/** 学习者改这次学习的单子（记录/单子与路线.md「单子」规矩“可见可改”）：至少给一项。 */
export interface TicketEditRequest {
  newPoint?: string;
  clause?: string;
  startPoints?: { point: string; source: (typeof START_SOURCES)[number]; ref?: string }[];
}

export interface TicketEditResponse {
  /** 新记录 `ticket_edited` 在学习正本里的行号。 */
  line: number;
  /** 改后的整张单子。 */
  ticket: Ticket;
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

/** 单子里引用的一个点：不再查知识点库，`name` 就等于 `id`。 */
export interface PointRef {
  id: string;
  name: string;
}

/** 依据视图里的一次改动：改前、改后、时间（工单 W6 §4.2）。 */
export interface TicketEditView {
  line: number;
  at: string;
  before: Ticket;
  after: Ticket;
}

/**
 * 依据视图里的单子：平铺 —— `Ticket` 各字段照给（现在的这张；卡选项上是卡上原样），
 * `refs` = 单子里每个依据串回查的结果（去重、按出现顺序），`edits` = 本次学习的改动（按行号升序）。
 */
export type TicketView = Ticket & { refs: SourceView[]; edits: TicketEditView[] };

/** 选项出处里的一条，已尽量回查。resolved 为假 = 查不到（原样给出 raw）。 */
export interface SourceView {
  raw: string;
  kind: 'loop_line' | 'book_line' | 'unknown';
  resolved: boolean;
  label: string;
  /** 回查到的内容：学习那一行的原话、书里那几行原文。 */
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
  navSessionId: string;
  model: ModelInfo;
  chosen?: { option: number; loopSessionId: string };
  /** 这次出卡的路线决定（写在主对话里，紧挨着卡的前一行）；旧卡没有。 */
  routeDecision?: RouteDecisionView;
  options: CardOptionView[];
}

export interface CardResponse {
  card: CardView;
}

/** 学习者异议的视图：inLoop = 已作为学习者原话进了这次学习（line 是它在那份正本里的行）。 */
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

/** 一条实际理解带它引用的那几行的原话（工单 W6 §4.2）。 */
export type UnderstandingView = Understanding & { quotes: QuoteView[] };

/**
 * 这次出卡 / 这次学习中途改线时导航作出的路线决定与理由（记录/单子与路线.md「路线决定与理由」）。
 * `superseded` = 同一处之后还有别的路线决定（旧决定留着，标“已被取代”）。
 */
export interface RouteDecisionView {
  line: number;
  at: string;
  navSessionId: string;
  /** 为什么出卡 / 改线：合上 / 没合上 / 学习者要求 / 补前置合上 …… */
  trigger: string;
  decision: string;
  reason: string;
  basis: SourceView[];
  superseded: boolean;
}

export interface GuardVerdictView {
  /** 判定在那次学习正本里的行号（异议指向它）。 */
  line: number;
  at: string;
  closed: boolean;
  basis: string;
  /** 程序核对不过时的原因。 */
  problem?: string;
  guardSessionId: string;
  /** 判定记录里记的实际执行模型；没有才退回会话模型。 */
  model: ModelInfo;
  /** 学习者实际表现出的理解与证据强度，逐条带依据行的原话；没写就是空数组。 */
  understanding: UnderstandingView[];
  /** 守卫引用的学习行与那几行的原文。 */
  quotes: QuoteView[];
  /** 触发这次判定的收口申请。 */
  request?: { line: number; at: string; by: 'model' | 'learner'; reason: string };
  objections: ObjectionView[];
}

/** 一次学习里取用的一份教学工具：哪份、在那份正本的哪一行（程序从工具调用里记的）。 */
export interface TeachingToolUseView {
  name: string;
  line: number;
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
  /** 单子：现在的这张（学习者改过就是改后的）。 */
  ticket?: TicketView;
  /** 没合上就结束：导航读那次对话出下一张卡时写的路线决定与理由。 */
  routeDecision?: RouteDecisionView;
  /** 学习对话（教学侧）用的模型。 */
  model: ModelInfo;
  verdicts: GuardVerdictView[];
  /** 这次学习取用过的教学工具（按取用顺序，含重复取用）。 */
  teachingToolsUsed: TeachingToolUseView[];
  /** 这次学习里的全部异议（含已结束后记在异议存放处的）。 */
  objections: ObjectionView[];
  /** 搁置着（可恢复）；与 status 无关：搁置的那次 status 仍是 in_progress。 */
  shelved?: { at: string; note: string };
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
  /** 搁置着（status 仍是 in_progress）。 */
  shelved?: { at: string; note: string };
  /** 是接着一次没合上的学习学的（批 6）。 */
  resumeOf?: { loopSessionId: string; title?: string };
  /** 没合上的那次：有哪些续接它的新学习（批 6）。 */
  resumedBy?: { loopSessionId: string; title?: string; status: LoopStatus }[];
  /** 这次是复习 / 复检（批 6）。 */
  revisit?: '复习' | '复检';
  /** 这次是阶段验收（批 9）。 */
  stageCheck?: boolean;
}

/** 没收尾的学习数（负荷预算与任务限流；只提示、不硬拦）。 */
export interface LoopLoad {
  /** 进行中（不含搁置）。 */
  inProgress: number;
  shelved: number;
  /** 停车场里还没补上的（没合上就结束、以后没接着它合上、也没有新点相同的一次合上）。 */
  parked: number;
  /** 进行中 + 搁置。 */
  unfinished: number;
  /** 没收尾的学习不少了，该提示别再开新的。 */
  heavy: boolean;
  /** 停车场堆积了，该降载、优先收尾。 */
  parkingPile: boolean;
}

/**
 * 方向目标的完整形状（记录/方向目标.md「内容」）：`line` = 那条记录在项目对话里的行号。
 * 旧记录只有一句话时就只有 `line at text`；`provisional` 只在临时版为真。
 */
export interface GoalView {
  line: number;
  at: string;
  text: string;
  title?: string;
  abilities?: { ability: string; reason: string; confirmedReason?: string }[];
  orderHint?: string;
  deadline?: string;
  provisional?: true;
}

/** 项目页：本项目下的学习按状态分组。 */
export interface ProjectOverview {
  mainSessionId: string;
  title: string;
  goal?: string;
  /** 当前方向目标的完整形状（最后一条为准）；还没有方向目标就不带。 */
  goalView?: GoalView;
  /** 期限（YYYY-MM-DD）与备注；没记就没有。 */
  deadline?: string;
  deadlineNote?: string;
  /** 项目有几份资料（0 = 还没有，缺资料依据；资料归项目，不查别处）。 */
  materialCount?: number;
  /** 今天该做的：到期的提醒、期限临近、该做阶段复盘了（批 6）。 */
  today?: TodayView;
  groups: {
    /** 进行中。 */
    inProgress: LoopBrief[];
    /** 合上。 */
    closed: LoopBrief[];
    /** 没合上（停车场）。 */
    unclosed: LoopBrief[];
    /** 搁置着的那几次（可恢复）。没有就没有这一项。 */
    shelved?: LoopBrief[];
  };
  load: LoopLoad;
}

/** 学习之间的关系（从哪来）。 */
export interface LoopRelationView {
  loopSessionId: string;
  title: string;
  /** 从哪来：选择卡 / 接着以前那次学习。 */
  origin:
    { kind: 'card'; cardId: string } | { kind: 'resume'; fromLoop: string } | { kind: 'unknown' };
  status: LoopStatus;
  shelved?: boolean;
}

export interface LoopRelationsResponse {
  mainSessionId: string;
  relations: LoopRelationView[];
}

export interface ShelveRequest {
  note?: string;
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
  /** 每次取用：哪份、在那份正本的哪一行；旧记录没有。 */
  toolUses?: TeachingToolUseView[];
  /** 记录时有“出现在 X 之后”标注的状态时，教法记录整理对自己教法是否为成因的自查。 */
  selfCheck?: { stateIds: string[]; note: string };
  model: ModelInfo;
  objections: ObjectionView[];
}

export interface ConfirmationView {
  id: string;
  at: string;
  recordId: string;
  verdict: '确认' | '否认';
  note?: string;
}

/** 学习者对一条状态记录确认（confirm）/ 否认（deny）；只追加。 */
export interface RecordConfirmationRequest {
  recordId: string;
  verdict: 'confirm' | 'deny';
  note?: string;
}

export interface ConfirmationResponse {
  confirmation: ConfirmationView;
}

/** 状态出现在某段学习里某句教学之后的标注（会话与行号由程序核对）。 */
export interface AfterTeachingView {
  loopSessionId: string;
  line: number;
  /** 模型写下的说明：这条状态出现在什么之后。 */
  text: string;
}

export interface StateRecordView {
  id: string;
  at: string;
  text: string;
  /** 模型写下时的来源。 */
  source: '自述' | '观察' | '推断';
  /** 来源档：学习者最近一次表态是确认 = 已确认，否则同 source。 */
  sourceLevel: '自述' | '观察' | '推断' | '已确认';
  output: '承载读数' | '解释候选';
  timeRange: string;
  refs: { sessionId: string; lines: number[]; quotes: QuoteView[] }[];
  /** 出现在某次教法强度明显变化之后；没有就没有。 */
  afterTeaching?: AfterTeachingView;
  /** 学习者的确认 / 否认记录（按时间，最后一条算数）。 */
  confirmations: ConfirmationView[];
  /** 学习者最近一次表态；没表过态为空。 */
  learnerVerdict?: '确认' | '否认';
  stateSessionId: string;
  model: ModelInfo;
  objections: ObjectionView[];
}

export interface CurrentStateView {
  at: string;
  text: string;
  stage: string;
  basisSpan: string;
  stateSessionId: string;
  model: ModelInfo;
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

/** 对守卫判定提异议：line = 判定在那次学习正本里的行号。 */
export interface VerdictObjectionRequest {
  line: number;
  text: string;
}

/** 对一条教法记录 / 状态记录提异议。 */
export interface RecordObjectionRequest {
  kind: 'pedagogy' | 'state';
  recordId: string;
  text: string;
}

export interface ObjectionResponse {
  objection: ObjectionView;
}

export interface ObjectionsResponse {
  /** 异议存放处里的异议（不含还在进行的学习里作为原话追加的那种）。 */
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
  /** 会联网搜索的会话种类与说明（畅谈、导航；来自程序实际放开的名单）。 */
  webSearch?: {
    sessions: { kind: ConversationKind; label: string }[];
    note?: string;
  };
  /**
   * 各类会话（加学习对话派的子代理、学习页的框架小模型）配的模型与强度；
   * model 为空 = 没单独指定（用服务默认，实际执行的模型记在每条记录里）。
   */
  sessions: {
    kind: DisclosureRowKind;
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
  guard: '守卫（写收尾记录）',
  nav: '导航',
  retrieve: '检索子代理',
  state: '状态整理',
  pedagogy: '教法记录整理',
  output: '写产出',
  find: '找资料',
  editor: '页面编辑员（旧数据）',
};

/** 不是会话、也单独配模型的两样（`src/core/model/profiles.ts` 的 EXTRA_PROFILE_KEYS）。 */
export const EXTRA_PROFILE_KEYS = ['subagent', 'framework'] as const;
export type DisclosureRowKind = ConversationKind | (typeof EXTRA_PROFILE_KEYS)[number];
export const EXTRA_PROFILE_LABELS: Record<(typeof EXTRA_PROFILE_KEYS)[number], string> = {
  subagent: '学习对话派的子代理',
  framework: '学习页摆屏幕的小模型',
};

export * from './output.ts';

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
 * （MinerU content_list 的坐标）。界面按渲染出的图的实际宽高乘 / 1000 就是像素位置，
 * 与渲染分辨率无关。
 */
export type BBox = [number, number, number, number];

export interface NumberedLine {
  /** 行号：小节文件里的行，从 1 数；与 read_source 印的行号一致。 */
  n: number;
  text: string;
}

/** 一份项目资料（资料浏览的列表）。hasOriginal = 找得到 PDF 原件（页面能调出来）。 */
export interface BookSummary {
  id: string;
  title: string;
  /** 正文文件数。 */
  sections: number;
  hasOriginal: boolean;
  kind: MaterialKind;
  /** 来源：原路径 / URL / 仓库地址。 */
  source: string;
  /** 请求里带了 project 时：这份资料是不是该项目的。 */
  selected?: boolean;
}

export interface BooksResponse {
  books: BookSummary[];
}

/** 资料文件清单里的一条（按路径排）。 */
export interface TocEntry {
  /** 编号（1、1.2、…）；习题 / 附注等按书里的写法。 */
  num: string;
  title: string;
  /** 文件，相对于资料的正文目录。 */
  file?: string;
  /** 所在目录（相对正文目录；顶层为空）。 */
  chapter: string;
  /** 原 PDF 页范围：PDF 资料按页段转出的 p<起>-<止>.md 才有。 */
  pdfPages?: PageSpan;
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
  /** 文件起页（原 PDF 页）；只有 PDF 资料的页段文件有。 */
  pdfPage?: number;
}

export interface SourceSearchResponse {
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
  | { type: 'running'; sessionId: string; running: boolean }
  /** 组件的新一版先在学习者浏览器的隐藏小窗里试跑（会话/页面子代理.md「怎么改」）；sessionId = 学习对话。 */
  | {
      type: 'page_trial';
      sessionId: string;
      trialId: string;
      blocks: { id: string; html: string }[];
    };

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

// ───────────── 项目资料（工单 W8；设计 docs/设计/记录/资料.md） ─────────────

/** 资料的种类：pdf · 网页 · 字幕 · 代码仓库 · 联网查来的 · md / 纯文字。 */
export const MATERIAL_KINDS = ['pdf', 'web', 'subtitle', 'repo', 'search', 'md'] as const;
export type MaterialKind = (typeof MATERIAL_KINDS)[number];
export type MaterialStatus = '处理中' | '可用' | '部分可用' | '失败';

/** 每份资料的 source.json：md 正文 + 指回原件 + 固定版本 + 来源与日期；不存摘要、路线、标签。 */
export interface MaterialSource {
  id: string;
  title: string;
  kind: MaterialKind;
  /** 原路径 / URL / 仓库地址。 */
  origin: string;
  /** pdf：文件哈希；web / search：抓取时间；repo：提交号；md / subtitle：内容哈希。 */
  version: string;
  fetchedAt: string;
  converter?: string;
  status: MaterialStatus;
  /** 失败或有问题的地方，不伪装成可用。 */
  problems?: string[];
  /** 模型检索时判断的角色；界面可见。 */
  role?: { value: '主资料' | '参考资料'; by: 'model'; at: string; sessionId: string };
  /** 从别的项目拿来的（工单 W9 §4.1）：来源项目与那边的资料 id；origin 照抄原来的（重试要用）。 */
  copiedFrom?: { project: string; material: string };
}

export interface AddMaterialRequest {
  kind: MaterialKind;
  origin: string;
  title?: string;
  /** 仓库：固定到哪次提交；不给 = 当时的 HEAD。 */
  commit?: string;
}

export interface ProjectMaterialView {
  /** 资料 id（引用写 `资料id/文件:行号`）；字段名沿用 book。 */
  book: string;
  title: string;
  /** missing 时没有。 */
  kind?: MaterialKind;
  addedAt: string;
  /** 记录里有、资料目录里找不到了。 */
  missing?: boolean;
  origin?: string;
  version?: string;
  fetchedAt?: string;
  status?: MaterialStatus;
  problems?: string[];
  role?: MaterialSource['role'];
  copiedFrom?: MaterialSource['copiedFrom'];
}

export interface ProjectMaterialsResponse {
  mainSessionId: string;
  materials: ProjectMaterialView[];
  /** 恒为 true：资料归项目，学习 / 导航 / 检索只在本项目资料里查（没有资料就是缺资料依据，不查全库）。 */
  restricted: boolean;
  deadline?: string;
  deadlineNote?: string;
}

export interface ProjectMaterialsRequest {
  /** 要去掉的资料 id。 */
  remove?: string[];
}

export interface ProjectDeadlineRequest {
  /** YYYY-MM-DD；null = 清掉期限。 */
  deadline: string | null;
  note?: string;
}

export interface ProjectDeadlineResponse {
  mainSessionId: string;
  deadline?: string;
  deadlineNote?: string;
  /** 离期限还有几天（负数 = 已过）。 */
  daysLeft?: number;
}

// ───────────── 导入入口与项目页（工单 W9） ─────────────

/** 一次上传里的一份（单个文件，或整个笔记文件夹）分到了哪边、落到了哪。 */
export interface UploadItemView {
  upload: string;
  /** 上传里的相对路径（文件夹 = 文件夹名）。 */
  file: string;
  at: string;
  routedTo: '资料' | '学过的';
  by: 'model' | 'learner';
  reason?: string;
  /** 进了资料：资料 id。 */
  material?: string;
  /** 进了学过的：外部导入 id。 */
  import?: string;
  /** 没能落下的原因（这种文件还转不了等）。 */
  problem?: string;
}

export interface UploadsResponse {
  items: UploadItemView[];
}

/** 学习者改判：这份改去另一边。 */
export interface RerouteRequest {
  upload: string;
  file: string;
  to: '资料' | '学过的';
}

/** 从别的项目拿一份资料。 */
export interface CopyMaterialRequest {
  fromProject: string;
  material: string;
}

/** 项目说明：当前值 + 全部历史（只追加）。 */
export interface ProjectInstructionsResponse {
  text: string;
  history: { at: string; by: 'learner' | 'main'; text: string; line: number }[];
  /** 上限（字）。 */
  limit: number;
}

export interface ProjectInstructionsRequest {
  text: string;
}

/** 找资料对话里学习者勾了哪些候选（`forLine` = 那份候选清单所在行）。 */
export interface PickCandidatesRequest {
  forLine: number;
  picked: number[];
}

/** 一条外部导入（笔记 / 对话记录）的 md 全文。 */
export interface ImportTextResponse {
  import: Import;
  text: string;
}
