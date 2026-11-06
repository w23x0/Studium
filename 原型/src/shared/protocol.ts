// 核心与界面之间的 HTTP / SSE 协议。界面只认这里的类型，不碰核心实现。
import type {
  ConversationKind,
  NumberedRecord,
  ObjectionTarget,
  SourceReport,
  SourceReportKind,
} from './records.ts';

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
  /** 派生层记下的这条对话现在的状态记号；没有 = 还在进行。讨论串怎么分组由界面按它定。 */
  mark?: SessionMark;
}

/**
 * 派生层记下的对话状态（只记事实；有记号 = 已结束，W19）：ended 讨论串结束（学习对话 W19 起也是它；旧数据还有谈方向谈定或
 * W20 起不再开、找资料勾完、写产出与阶段复盘）· closed / unclosed 旧数据：学习合上 / 没合上就结束（照旧显示当时的状态）。
 */
export type SessionMark = 'closed' | 'unclosed' | 'ended';

export interface ProjectResponse {
  mainSessionId: string;
}

export interface ProjectSummary {
  mainSessionId: string;
  title: string;
}

export interface ListProjectsResponse {
  projects: ProjectSummary[];
}

export interface ListSessionsResponse {
  sessions: SessionSummary[];
}

export interface RecordsResponse {
  records: NumberedRecord[];
  running: boolean;
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

export interface SessionModelResponse {
  model: ModelInfo;
}

/** 各类会话的日常叫法（外发披露、记录出处里给学习者看）。 */
export const CONVERSATION_KIND_LABELS: Record<ConversationKind, string> = {
  main: '项目主对话',
  talk: '谈方向',
  loop: '学习对话',
  guard: '守卫（旧数据）',
  nav: '导航',
  retrieve: '检索子代理',
  state: '状态整理',
  pedagogy: '教法记录整理',
  output: '写产出',
  find: '找资料',
  editor: '页面编辑员（旧数据）',
  import: '导入处理',
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
 * （MinerU content_list 的坐标）。界面按渲染出的图的实际宽高乘 / 1000 就是像素位置，
 * 与渲染分辨率无关。
 */
export type BBox = [number, number, number, number];

export interface NumberedLine {
  /** 行号：小节文件里的行，从 1 数；与 read_material 印的行号一致。 */
  n: number;
  text: string;
}

/** 一份项目资料（资料浏览的列表）。hasOriginal = 找得到 PDF 原件（页面能调出来）。 */
export interface MaterialSummary {
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

export interface MaterialListResponse {
  materials: MaterialSummary[];
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
  material: string;
  title: string;
  entries: TocEntry[];
}

export interface SectionResponse {
  material: string;
  materialTitle: string;
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
  material: string;
  materialTitle: string;
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
  material: string;
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
  material: string;
  file: string;
  locations: LineLocation[];
}

/** 回复里的一个教材出处，核对过：resolved 为假 = 书 / 文件 / 行号对不上（原样给出，不编）。 */
export interface CitationView {
  raw: string;
  /** 在被解析文本里的起止位置。 */
  start: number;
  end: number;
  material: string;
  file: string;
  from: number;
  to: number;
  resolved: boolean;
  /** 对不上的原因。 */
  problem?: string;
  materialTitle?: string;
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
  material: string;
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
  | { type: 'model_settings'; sessionId: string }
  | { type: 'record'; sessionId: string; line: number; record: NumberedRecord['record'] }
  | { type: 'delta'; sessionId: string; text: string }
  /** 正在流出来的思考概要（学习页过程记录，11-06）。 */
  | { type: 'thinking'; sessionId: string; text: string }
  | { type: 'running'; sessionId: string; running: boolean }
  /** 正在做什么（W12 §4.5）：程序从当前的工具调用得出的一行，不显示内容。 */
  | { type: 'activity'; sessionId: string; text: string }
  /** 学习对话交上的组件新一版先在学习者浏览器的隐藏小窗里试跑；sessionId = 学习对话。 */
  | {
      type: 'page_trial';
      sessionId: string;
      trialId: string;
      blocks: { id: string; html: string }[];
    };

export const API_PREFIX = '/api';

// ───────────── 项目资料（工单 W8；设计 docs/设计/记录/资料.md） ─────────────

/**
 * 资料的种类：pdf · 网页 · 字幕 · 代码仓库 · 联网查来的 · md / 纯文字 · 其他文件（图片、Word、PPT 等，W11：
 * 交导入会话处理）。
 */
export const MATERIAL_KINDS = ['pdf', 'web', 'subtitle', 'repo', 'search', 'md', 'file'] as const;
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
  /** 归属（W11）：学习者 = 所有项目都能读；项目 = 只给这几个项目读。程序按它算每个会话能读什么。 */
  owner: MaterialOwner;
  /** 分流判为“学过的”（学习者的笔记 / 别处的学习记录）：标渠道；外部导入的指针指向这份资料。 */
  learned?: { channel: '笔记' | '对话记录' };
  /** 从哪个项目导入的（只记，不等于归属）。 */
  importedFrom?: string;
  /** 处理过它的导入会话 id（W11 §4，工作层的改动在这些会话的正本里）。 */
  processedBy?: string[];
  /** 学习者删了（只标，不删文件：已有引用照旧能定位，标“资料已删”）。 */
  removed?: { at: string };
  /**
   * 上传时归哪边（资料 / 学过的）、归谁拿不准，先按扩展名放了，交导入会话判（W12 §1.6）；判完去掉。
   * upload / file = 那份上传（判完在主对话里记 upload_routed）。
   */
  classify?: { upload: string; file: string };
}

/** 资料的归属（记录/资料.md「存在一处、按归属读」）。 */
export type MaterialOwner = { kind: 'learner' } | { kind: 'project'; projects: string[] };

/** 改一份资料的归属：learner = 学习者级；project = 只给 projects 里的项目（不给 = 只给当前项目）。 */
export interface SetMaterialOwnerRequest {
  owner: 'learner' | 'project';
  projects?: string[];
}

export interface AddMaterialRequest {
  kind: MaterialKind;
  origin: string;
  title?: string;
  /** 仓库：固定到哪次提交；不给 = 当时的 HEAD。 */
  commit?: string;
  /** 不给 = 只归发起导入的项目。 */
  owner?: MaterialOwner;
  /** 判为学过的：渠道。 */
  learned?: { channel: '笔记' | '对话记录' };
  /** 先按扩展名放、交导入会话判（W12 §1.6）。 */
  classify?: { upload: string; file: string };
}

export interface ProjectMaterialView {
  /** 资料 id（引用写 `资料id/文件:行号`）。 */
  material: string;
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
  owner?: MaterialOwner;
  learned?: MaterialSource['learned'];
}

export interface ProjectMaterialsResponse {
  mainSessionId: string;
  materials: ProjectMaterialView[];
  /** 恒为 true：各对话只在本项目能读的资料里查（按归属；别的项目的读不到）。 */
  restricted: boolean;
}

export interface ProjectMaterialsRequest {
  /** 要去掉的资料 id。 */
  remove?: string[];
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
  /** 归属（W11）：分流时判的，或之后改的（取那份资料现在的归属）。 */
  owner?: '学习者' | '项目';
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

/** GET /settings/mineru-token 回 { set }；PUT 发 { token }（空串 = 删掉），回 { set }。临时入口。 */
export interface MineruTokenBody {
  set: boolean;
}
