// M14 高阶学习与知识产出：存放处的记录类型与接口类型（批 8）。核心与界面共用；protocol.ts 一并再导出。
// 存放处都只追加：产出物只加不改，每次保存 = 新版本。
import type { CitationView } from './protocol.ts';
import type { ObjectRefKind } from './object-ref.ts';

/** 产出物的类型：笔记整理 · 推导 · 小论文 · 方法比较（结构化）· 其他。 */
export const OUTPUT_KINDS = ['笔记整理', '推导', '小论文', '方法比较', '其他'] as const;
export type OutputKind = (typeof OUTPUT_KINDS)[number];

/** 谁写的这一版：学习者自己写的 / 在“写产出”对话里模型协助写的（程序按调用的工具记，不靠模型自报）。 */
export type OutputAuthor = '学习者' | '模型协助';

/** 方法比较里的一个方法。 */
export interface ComparedMethod {
  name: string;
  /** 适用边界：什么条件下能用、什么条件下不能用。 */
  boundary: string;
  /** 各维度上的情况；键必须是 comparison.dimensions 里的维度。 */
  values: Record<string, string>;
  /** 证据与出处：可写出处标记（【教材|…】【知识点|…】）和一句话说明。 */
  evidence: string[];
}

/** 方法比较（方法 × 维度表 + 各方法的适用边界与出处）。 */
export interface MethodComparison {
  dimensions: string[];
  methods: ComparedMethod[];
  /** 研究中尚未定论的暂时论证（可没有）。 */
  tentative?: string;
}

/** 产出物对象（挂在项目下）。 */
export interface OutputObject {
  id: string;
  /** 项目 = 主对话会话 id。 */
  project: string;
  title: string;
  kind: OutputKind;
  at: string;
  createdBy: OutputAuthor;
}

/** 产出物的一个版本（只追加；n 从 1 数，同一产出物里连续）。 */
export interface OutputVersion {
  id: string;
  output: string;
  n: number;
  at: string;
  by: OutputAuthor;
  /** 模型协助时：写这一版的“写产出”对话。 */
  session?: string;
  /** 这一版改了什么（改动说明，可空）。 */
  note: string;
  text: string;
  /** 方法比较类的结构化内容；text 是它渲染出的文字。 */
  comparison?: MethodComparison;
}

export const RELATION_KINDS = ['支持', '矛盾', '方法沿革', '来源可靠性', '其他'] as const;
export type RelationKind = (typeof RELATION_KINDS)[number];

/** 相关文献：书库里的书 / 小节，或外部条目。 */
export interface LiteratureEntry {
  id: string;
  output: string;
  at: string;
  by: OutputAuthor;
  session?: string;
  /** library = 书库里的书（可带小节与行段）；external = 外部条目。 */
  source: 'library' | 'external';
  title: string;
  authors?: string[];
  url?: string;
  /** 书库条目：书（目录名）、小节文件、行段。 */
  book?: string;
  file?: string;
  from?: number;
  to?: number;
  /** 与这个产出物（研究问题）的关系，一句话。 */
  relation: string;
  relationKind?: RelationKind;
}

/** “可作通用知识候选”的说明：只记在 M14 自己的存放处，不写 M08。 */
export interface GeneralCandidate {
  id: string;
  output: string;
  /** 标在哪一版上。 */
  version: number;
  at: string;
  text: string;
  status: '候选、未审';
}

/** “写产出”对话与产出物的绑定。 */
export interface OutputTask {
  sessionId: string;
  output: string;
  at: string;
}

// ───────────── 接口类型 ─────────────

export interface ObjectRefView {
  kind: ObjectRefKind;
  id: string;
  raw: string;
  start: number;
  end: number;
  resolved: boolean;
  problem?: string;
  name?: string;
  /** 点的一句话 / 子句的说明。 */
  sentence?: string;
  /** 来自哪套 M08 的标注（书给的 / 模型补的 / 未审）。 */
  source?: string;
}

/** 一段文字引用的原文与 M08 对象（核对过；对不上的 resolved:false）。 */
export interface ReferencesView {
  sources: CitationView[];
  objects: ObjectRefView[];
  /** 对不上的个数。 */
  unresolved: number;
}

export interface OutputSummary {
  id: string;
  project: string;
  title: string;
  kind: OutputKind;
  createdAt: string;
  /** 最新版本号；还没有版本是 0。 */
  latest: number;
  updatedAt: string;
  versions: number;
}

export interface VersionSummary {
  n: number;
  at: string;
  by: OutputAuthor;
  session?: string;
  note: string;
  /** 字数（字符数）。 */
  length: number;
}

export interface VersionView extends VersionSummary {
  id: string;
  output: string;
  text: string;
  comparison?: MethodComparison;
  references: ReferencesView;
}

export interface LiteratureView extends LiteratureEntry {
  /** 书库条目带出处核对；外部条目没有。 */
  citation?: CitationView;
  /** 书库里找不到这本书 / 这个小节时的说明。 */
  problem?: string;
}

export interface OutputView extends OutputSummary {
  /** 最新版本（还没有版本时没有）。 */
  current?: VersionView;
  /** 版本列表（旧到新）。 */
  history: VersionSummary[];
  literature: LiteratureView[];
  candidates: GeneralCandidate[];
  /** 在这个产出物上开过的“写产出”对话。 */
  tasks: OutputTask[];
}

export interface DiffLine {
  op: 'same' | 'add' | 'del';
  text: string;
  /** 在 from 版里的行号（add 没有）。 */
  fromLine?: number;
  /** 在 to 版里的行号（del 没有）。 */
  toLine?: number;
}

export interface CompareView {
  output: string;
  from: VersionSummary;
  to: VersionSummary;
  lines: DiffLine[];
  added: number;
  removed: number;
  /** 引用的变化：to 比 from 新增 / 去掉的引用（标记原文）。 */
  refsAdded: string[];
  refsRemoved: string[];
}

export interface ListOutputsResponse {
  outputs: OutputSummary[];
}

export interface OutputResponse {
  output: OutputView;
}

export interface CreateOutputRequest {
  title: string;
  kind: OutputKind;
  /** 给了就同时存第一版（学习者写的）。 */
  text?: string;
  note?: string;
  comparison?: MethodComparison;
}

export interface SaveVersionRequest {
  text?: string;
  note?: string;
  comparison?: MethodComparison;
  /** 这次改动基于哪一版；给了而不是最新版就拒绝（避免盖掉别人刚存的）。 */
  base?: number;
}

export interface VersionResponse {
  version: VersionView;
}

export interface VersionsResponse {
  versions: VersionSummary[];
}

export interface CompareResponse {
  compare: CompareView;
}

export interface AddLiteratureRequest {
  /** 书库里的书（目录名）；与 title 二选一：给 book 是书库条目，否则是外部条目。 */
  book?: string;
  file?: string;
  from?: number;
  to?: number;
  title?: string;
  authors?: string[];
  url?: string;
  relation: string;
  relationKind?: RelationKind;
}

export interface LiteratureResponse {
  entry: LiteratureView;
}

export interface LiteratureListResponse {
  literature: LiteratureView[];
}

export interface MarkCandidateRequest {
  text: string;
  /** 标在哪一版；不给就是最新版。 */
  version?: number;
}

export interface CandidateResponse {
  candidate: GeneralCandidate;
}

export interface CandidatesResponse {
  candidates: GeneralCandidate[];
}
