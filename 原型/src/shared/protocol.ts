// 核心与界面之间的 HTTP / SSE 协议。界面只认这里的类型，不碰核心实现。
import type {
  ConversationKind,
  Intensity,
  IntensityTrend,
  LearnerObjection,
  NumberedRecord,
  ObjectionTarget,
  SourceReport,
  SourceReportKind,
} from './records.ts';
import type { RegressionView, TodayView } from './protocol-longterm.ts';
import type { CrossDomainView } from './protocol-cross.ts';

import type { CorrectionMark } from './m08-review.ts';

export type * from './protocol-longterm.ts';
export * from './protocol-cross.ts';
export type * from './m08-review.ts';
export type * from './protocol-practice.ts';

export interface SessionSummary {
  sessionId: string;
  kind: ConversationKind;
  title: string;
  openedAt: string;
  /** 最近一条记录的时间（派生层算的；左栏“最近”按它排）。 */
  lastAt?: string;
  parent?: string;
  /** 学习对话的来历：从哪段学习中途岔出去补的（fork），或接着哪段没学完的学的（resume）。 */
  from?: { kind: 'fork' | 'resume'; loop: string };
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
  /** 期限（YYYY-MM-DD）；没记就没有。 */
  deadline?: string;
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
  /** 多套 M08 合并时：来自哪一套（目录标签）；id 加了前缀时 originalId 是原来的 id。 */
  origin?: string;
  originalId?: string;
  /** 更正过：几次、更正前资料里原本是什么（批 10a）。显示的 name / sentence 已是更正后的。 */
  correction?: CorrectionMark;
  /** 有几条候选涉及它（批 10a）。 */
  candidates?: number;
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
  origin?: string;
  originalId?: string;
  correction?: CorrectionMark;
  candidates?: number;
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
  /** 复习 / 复检的单子（批 6）：回头看以前合上过的点；学新点时没有。 */
  revisit?: { kind: '复习' | '复检'; formationIds: string[] };
  /** 跨领域的单子（批 10b）：补习型 / 对比链接型，标两边的领域；同领域内的没有。 */
  crossDomain?: CrossDomainView;
  /** 阶段验收的单子（批 9）：闭环里的练习都标阶段验收、默认不给提示。 */
  stageCheck?: boolean;
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
  /** 这条诊断是“以前会的现在答不出”的结构化条目（批 6）。 */
  regression?: RegressionView;
  /** 这一轮标的教法强度（信息量 / 提示强度 / 挑战程度 / 节奏 + 偏输入还是偏练习）；没标就没有。 */
  intensity?: Intensity;
}

/** 闭环里取用的一份教学工具：哪份、在闭环正本的哪一行（程序从工具调用里记的）。 */
export interface TeachingToolUseView {
  name: string;
  line: number;
}

export type LoopStatus = 'in_progress' | 'closed' | 'unclosed';

/** 分叉闭环的来历（M01:18 来源、分叉、返回）。 */
export interface ForkOriginView {
  fromLoop: string;
  fromTitle?: string;
  kind: 'gap' | 'branch';
  /** 分叉原因：缺哪个出发点 / 学习者想去学什么。 */
  reason: string;
  missingPoint?: PointRef;
  /** 父闭环里指回的学习者原话行。 */
  basisLines: number[];
  /** 父闭环里通知 M05 的那条 route_signal 所在行。 */
  signalLine: number;
  /** 返回条件：分叉的新点合上就回父闭环。 */
  returnCondition: string;
  scope?: string;
}

/** 停车记录：缺在哪个出发点 + 恢复计划（何时、从哪接上）。 */
export interface ParkingView {
  line: number;
  at: string;
  reason: 'ended_unclosed' | 'shelved';
  missing: { point?: PointRef; text: string }[];
  when: string;
  resumeFrom: string;
  basisLines: number[];
  m05SessionId: string;
}

export interface RouteSignalView {
  line: number;
  at: string;
  kind: 'gap' | 'branch';
  missingPoint?: PointRef;
  missingText: string;
  basisLines: number[];
  /** 指回的学习者原话。 */
  quotes: QuoteView[];
  note?: string;
}

export interface DetourOptionView {
  kind: 'fork' | 'continue' | 'shelve';
  title: string;
  reason: string;
  /** 只有 fork 有。 */
  ticket?: TicketView;
  scope?: string;
}

/** 闭环中途的小卡（贴在该闭环里）。 */
export interface DetourCardView {
  cardId: string;
  /** 小卡在闭环正本里的行。 */
  line: number;
  at: string;
  signalLine: number;
  options: DetourOptionView[];
  recommended: number;
  m05SessionId: string;
  model: ModelInfo;
  /** 学习者选了没有；没选 = 还在等。 */
  chosen?: {
    option: number;
    choice: 'fork' | 'continue' | 'shelve';
    at: string;
    forkLoopSessionId?: string;
  };
}

/** 一个闭环开出去的分叉及其回来的情况。 */
export interface ForkLinkView {
  forkLoopSessionId: string;
  title: string;
  openedAt: string;
  /** 分叉回来了（结束后记进父闭环）；没有 = 还在外面。 */
  returned?: { at: string; closed: boolean; delivered: boolean };
}

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
  /** 这个闭环取用过的教学工具（按取用顺序，含重复取用）。 */
  teachingToolsUsed: TeachingToolUseView[];
  /** 这个闭环里的全部异议（含已结束闭环上记在异议存放处的）。 */
  objections: ObjectionView[];
  /** 搁置着（可恢复）；与 status 无关：搁置的闭环 status 仍是 in_progress。 */
  shelved?: { at: string; note: string };
  /** 在等哪个分叉闭环回来。 */
  waitingFork?: string;
  /** 是分叉出来的：来源、原因、返回条件。 */
  fork?: ForkOriginView;
  /** 开出去的分叉及回来的情况。 */
  forks: ForkLinkView[];
  /** 教学侧中途通知 M05 的记录（前置缺口 / 想分叉）。 */
  signals: RouteSignalView[];
  /** 闭环中途的小卡（含已选的）。 */
  detours: DetourCardView[];
  /** 最近一条停车记录（没合上就结束 / 搁置时 M05 记的）。 */
  parking?: ParkingView;
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
  /** 在等哪个分叉闭环回来（status 仍是 in_progress）。 */
  waitingFork?: { forkLoopSessionId: string; title?: string };
  /** 是分叉出来的。 */
  forkOf?: { loopSessionId: string; reason: string };
  /** 最近一条停车记录。 */
  parking?: ParkingView;
  /** 是接着一个没合上的闭环学的（批 6）。 */
  resumeOf?: { loopSessionId: string; title?: string };
  /** 没合上的闭环：有哪些续接它的新闭环（批 6）。 */
  resumedBy?: { loopSessionId: string; title?: string; status: LoopStatus }[];
  /** 这是复习 / 复检闭环（批 6）。 */
  revisit?: '复习' | '复检';
  /** 这是阶段验收闭环（批 9）。 */
  stageCheck?: boolean;
}

/** 同时没收尾的闭环数（M05:28 负荷预算与任务限流；只提示、不硬拦）。 */
export interface LoopLoad {
  /** 进行中（不含搁置、不含等分叉回来）。 */
  inProgress: number;
  shelved: number;
  waitingFork: number;
  /** 停车场里还没补上的（没合上就结束、新点还没合上过）。 */
  parked: number;
  /** 进行中 + 搁置 + 等分叉回来。 */
  unfinished: number;
  /** 没收尾的闭环不少了，该提示别再开新的。 */
  heavy: boolean;
  /** 停车场堆积了，该降载、优先收尾。 */
  parkingPile: boolean;
}

/** 项目页：本项目下的闭环按状态分组。 */
export interface ProjectOverview {
  mainSessionId: string;
  title: string;
  goal?: string;
  /** 期限（YYYY-MM-DD）与备注；没记就没有。 */
  deadline?: string;
  deadlineNote?: string;
  /** 项目选了几份资料（0 = 没限定，资料工具查全库）。 */
  materialCount?: number;
  /** 今天该做的：到期的提醒、期限临近、该做阶段复盘了（批 6）。 */
  today?: TodayView;
  groups: {
    /** 进行中。 */
    inProgress: LoopBrief[];
    /** 等你选：有还没选的选择卡。 */
    awaitingChoice: CardView[];
    /** 合上。 */
    closed: LoopBrief[];
    /** 没合上（停车场）；每个带最近一条停车记录。 */
    unclosed: LoopBrief[];
    /** 搁置着的闭环（可恢复）。没有就没有这一项。 */
    shelved?: LoopBrief[];
    /** 等分叉回来的闭环。没有就没有这一项。 */
    waitingFork?: LoopBrief[];
  };
  load: LoopLoad;
}

/** 闭环之间的关系（M01:18 来源、分叉、返回）。 */
export interface LoopRelationView {
  loopSessionId: string;
  title: string;
  /** 从哪来：选择卡 / 另一个闭环的分叉。 */
  origin:
    | { kind: 'card'; cardId: string }
    | { kind: 'fork'; fork: ForkOriginView }
    | { kind: 'resume'; fromLoop: string }
    | { kind: 'unknown' };
  status: LoopStatus;
  shelved?: boolean;
  waitingFork?: string;
  /** 它开出去的分叉。 */
  forks: ForkLinkView[];
}

export interface LoopRelationsResponse {
  mainSessionId: string;
  relations: LoopRelationView[];
}

export interface DetourChooseRequest {
  cardId: string;
  option: number;
}

export interface DetourChooseResponse {
  choice: 'fork' | 'continue' | 'shelve';
  /** choice = fork 时开出的分叉闭环。 */
  forkLoopSessionId?: string;
}

export interface ShelveRequest {
  note?: string;
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
  /** 这个闭环的第几版分析（分析可重做、多版本并存；旧记录当第 1 版）。 */
  version: number;
  /** 是这个闭环的最新一版（当前视图取它；旧版本仍可查）。 */
  latest: boolean;
  level?: string;
  summary?: string;
  keywords?: string[];
  /** 复习 / 复检闭环写的记录。 */
  revisit?: { kind: '复习' | '复检'; formationIds: string[] };
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
  /** 每次取用：哪份、在闭环正本的哪一行；旧记录没有。 */
  toolUses?: TeachingToolUseView[];
  /** 程序汇总的这个闭环里四项强度 + 偏向的走向；没标强度的闭环没有。 */
  intensityTrend?: IntensityTrend;
  /** 记录时有“出现在 X 之后”标注的状态时，M10 对自己教法是否为成因的自查。 */
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

/** 学习者对一条 M15 状态记录确认（confirm）/ 否认（deny）；只追加。 */
export interface RecordConfirmationRequest {
  recordId: string;
  verdict: 'confirm' | 'deny';
  note?: string;
}

export interface ConfirmationResponse {
  confirmation: ConfirmationView;
}

/** 状态出现在某次教法强度明显变化之后的标注（变化由程序算出）。 */
export interface AfterTeachingView {
  changeId: string;
  loopSessionId: string;
  line: number;
  /** “第 12 行起，提示强度由「高」降为「低」”。 */
  text: string;
}

export interface TeachingToolView {
  name: string;
  /** 适用条件，一句话。 */
  applies: string;
  origin: '官方' | '学习者自己';
  source: string;
  /** 如“agent 起草，未经产品负责人审”。 */
  status: string;
}

export interface TeachingToolsResponse {
  tools: TeachingToolView[];
  /** 装不上的文件与原因。 */
  problems: string[];
}

export interface TeachingToolResponse {
  tool: TeachingToolView & { text: string };
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
  /** 批 8 起新增的会话类（写产出），格式同 sessions。 */
  laterSessions: {
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
  output: '写产出',
};

export * from './m14.ts';

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
  /** 在书库里的学科目录（相对书库根，如 大学物理/力学）；个人笔记是“个人笔记”；平铺的书没有。 */
  subject?: string;
  /** book = 书库里的书 · note = 学习者的个人笔记（导入到 M07 自己的区）。 */
  kind?: 'book' | 'note';
  /** 个人笔记：作者（学习者）、来源（个人笔记）、导入时的原路径。 */
  author?: string;
  source?: string;
  originalPath?: string;
  /** 请求里带了 project 时：这份资料是不是该项目选用的。 */
  selected?: boolean;
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

// ───────────── 批 3a：资料范围（书库多层、项目资料、个人笔记、多套 M08、外部导入、期限）─────────────

/** 项目选用的一份资料。missing = 书库里现在找不到它了（被移走 / 改名）。 */
export interface ProjectMaterialView {
  book: string;
  title: string;
  kind: 'book' | 'note';
  subject?: string;
  addedAt: string;
  missing?: boolean;
}

export interface ProjectMaterialsResponse {
  mainSessionId: string;
  materials: ProjectMaterialView[];
  /** true = 项目选了资料，闭环 / M05 / 学习者检索默认只在这些里查；false = 没选任何资料，查全库。 */
  restricted: boolean;
  deadline?: string;
  deadlineNote?: string;
}

export interface ProjectMaterialsRequest {
  /** 要加进来的书 / 笔记 id（书库里 books 的 id）。 */
  add?: string[];
  /** 要去掉的。 */
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

export interface NoteImportRequest {
  /** 一份 Markdown 笔记文件，或一个目录（里面所有 .md，按文件名顺序）。 */
  path: string;
  /** 不给：文件名 / 目录名（目录带上一层名）。 */
  title?: string;
}

export interface NoteSummary {
  /** 在书库里的 id（“笔记-…”），当书用：浏览 / 检索 / 引用都照书的接口。 */
  id: string;
  title: string;
  author: string;
  source: string;
  originalPath: string;
  importedAt: string;
  /** 原文件数 / 切出的小节数。 */
  files: number;
  sections: number;
  /** 笔记里引用的图片 / 嵌入（路径原样留在文字里）；found = 在原位置找到了文件。 */
  assets: { ref: string; found: boolean; file: string; line: number }[];
  /** 导入前同一原路径已有的笔记 id（新导入是新版本，旧的不动）。 */
  previous?: string;
  /** 没读的文件（非 .md 的不算）。 */
  skipped?: string[];
}

export interface NoteImportResponse {
  note: NoteSummary;
}

export interface NotesResponse {
  notes: NoteSummary[];
}

export interface NoteExtractRequest {
  /** 笔记 id。 */
  book: string;
  /** 挂在哪个项目下（可不填）。 */
  projectId?: string;
}

/** 外部导入进 M09 的一条（学习者在系统之外学到的）：未验证，和闭环形成记录分开。 */
export interface ExternalRecordView {
  id: string;
  at: string;
  /** 自述 = 畅谈里学习者自己说会 · 笔记 = 从学习者笔记里提的。 */
  source: '自述' | '笔记';
  /** 一律“未验证”：闭环证据永远优先。 */
  status: '未验证';
  claim: string;
  point?: { id: string; name: string; found: boolean };
  /** 判读依据（如“笔记里有完整推导与自己的解释”“只说了会，没展开”）。 */
  basis: string;
  grade?: string;
  /** 自述：畅谈会话与学习者的行；笔记：书 + 小节文件 + 行段。 */
  talk?: { sessionId: string; lines: number[]; quotes: string[] };
  note?: { book: string; file: string; from: number; to: number };
  model: string;
}

export interface ExternalRecordsResponse {
  records: ExternalRecordView[];
}

/** 多套 M08 合并后的每一套。 */
export interface M08OriginView {
  label: string;
  dir: string;
  points: number;
  clauses: number;
  /** 这一套的 id 因与别的套重复而加了“标签.”前缀。 */
  prefixed: boolean;
}

export interface M08OverviewResponse {
  sources: M08OriginView[];
  /** 按书、按章数点（章 = 点的第一个锚点所在的章目录，如 ch03；没有锚点的归“（无锚点）”）。 */
  books: {
    book: string;
    bookTitle?: string;
    points: number;
    clauses: number;
    chapters: { chapter: string; points: number; clauses: number }[];
  }[];
  /** 带了 project 且项目选了资料：只算选用的书；all=1 查全部。 */
  restricted: boolean;
}
