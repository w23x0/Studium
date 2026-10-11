// M08 候选区与通用结构更正（批 10a）的类型：候选记录、审计记录、更正记录与接口。
// 候选不进 M08、不给教学用；更正叠在 M08 读侧上，不改资料线产出文件；晋升规则没定，这里不做晋升。
import type { QuoteView } from './protocol.ts';
import type { SourceReport } from './records.ts';

/** 候选的三种来源：M14 产出物上标的、M09 去个人化、学习者对 M08 提的建议。 */
export const CANDIDATE_SOURCES = ['m14', 'm09', 'learner'] as const;
export type CandidateSource = (typeof CANDIDATE_SOURCES)[number];

/** 候选的类型：新点 / 新子句（M09 去个人化候选）· 这里该补 / 该改（学习者建议）· M14 说明。 */
export type CandidateKind = 'new_point' | 'new_clause' | 'supplement' | 'fix' | 'general_note';

/** 每条候选都带这个状态；审计不改它（晋升规则没定）。 */
export const CANDIDATE_STATUS = '候选、未审' as const;

export type TargetKind = 'point' | 'clause';

export interface TargetRef {
  kind: TargetKind;
  id: string;
}

/** 候选里的点 / 子句草稿。程序只收这些字段，不带学习者个人信息。 */
export interface CandidateDraft {
  point?: { name: string; sentence: string };
  clause?: { from: string[]; to: string; text: string };
}

/** 存放处里的候选（M14 的在 M14 自己的存放处，不重复存）。 */
export interface StoredCandidate {
  id: string;
  at: string;
  source: 'm09' | 'learner';
  kind: Exclude<CandidateKind, 'general_note'>;
  status: typeof CANDIDATE_STATUS;
  /** 为什么这条可作通用知识 / 学习者想说什么。 */
  text: string;
  draft?: CandidateDraft;
  /** 学习者建议对着的 M08 点 / 子句。 */
  target?: TargetRef;
  /** M09 候选指回的闭环与学习者原话行（只存指针，原话读时从闭环正本取）。 */
  origin?: { loopSessionId: string; lines: number[] };
  /** M09 候选：写它的会话实际执行的模型。 */
  model?: string;
}

export const AUDIT_VERDICTS = ['建议晋升', '不晋升', '待定'] as const;
export type AuditVerdict = (typeof AUDIT_VERDICTS)[number];
export const AUDITORS = ['学习者', '模型审计'] as const;
export type Auditor = (typeof AUDITORS)[number];

/** 一次审计：看过了，意见，建议。只追加；不实现晋升本身。 */
export interface CandidateAudit {
  id: string;
  at: string;
  candidate: string;
  by: Auditor;
  /** 模型审计时：实际执行的模型。 */
  model?: string;
  opinion: string;
  verdict: AuditVerdict;
}

/** 更正能改的字段（来源、锚点不由更正改）。 */
export interface CorrectionFields {
  name?: string;
  sentence?: string;
  threshold?: boolean;
  text?: string;
  from?: string[];
  to?: string;
}

/** 更正的依据：一条经复核的建议，或一条涉及这个点 / 子句原文锚点的资料报错。 */
export interface CorrectionBasis {
  kind: 'candidate' | 'source_report';
  id: string;
}

export interface StoredCorrection {
  id: string;
  at: string;
  target: TargetRef;
  /** 改成什么（只列改了的字段）。 */
  fields: CorrectionFields;
  /** 这些字段更正前的值（上一版）。 */
  before: CorrectionFields;
  reason: string;
  basis: CorrectionBasis;
}

// ───────────── 接口类型 ─────────────

export interface TargetNameRef extends TargetRef {
  name: string;
  found: boolean;
}

export interface CandidateView {
  id: string;
  source: CandidateSource;
  kind: CandidateKind;
  status: typeof CANDIDATE_STATUS;
  at: string;
  text: string;
  /** 实际执行的模型；学习者提的建议和 M14 的标注没有模型。 */
  model?: string;
  draft?: CandidateDraft;
  target?: TargetNameRef;
  /** M09 候选：指回的闭环与学习者原话。 */
  origin?: { loopSessionId: string; quotes: QuoteView[] };
  /** M14 候选：标在哪个产出物的哪一版。 */
  m14?: { output: string; title?: string; version: number };
  audits: CandidateAudit[];
  /** 最近一次审计的建议；没审过为空。 */
  verdict?: AuditVerdict;
  /** 被哪些更正当作依据。 */
  correctedBy: string[];
}

export interface CorrectionView extends StoredCorrection {
  targetName: string;
  /** 资料线重新生成后，这条更正的“更正前”和资料里现在的值对不上了：更正是按旧版写的，请再看一眼。 */
  stale: boolean;
}

/** 点 / 子句上的更正标记：更正过几次、更正前（资料原本）是什么。 */
export interface CorrectionMark {
  count: number;
  at: string;
  original: CorrectionFields;
}

export interface SuggestRequest {
  target: TargetRef;
  kind: 'supplement' | 'fix';
  text: string;
}

export interface AuditRequest {
  by?: Auditor;
  model?: string;
  opinion?: string;
  verdict: AuditVerdict;
}

export interface CorrectRequest {
  target: TargetRef;
  fields: CorrectionFields;
  reason: string;
  basis: CorrectionBasis;
}

export interface ReviewCandidatesResponse {
  candidates: CandidateView[];
}

export interface ReviewCandidateResponse {
  candidate: CandidateView;
}

export interface AuditResponse {
  audit: CandidateAudit;
}

export interface CorrectionResponse {
  correction: CorrectionView;
}

export interface CorrectionsResponse {
  corrections: CorrectionView[];
}

/** 一个点 / 子句上的候选、更正历史、涉及它原文锚点的资料报错。 */
export interface TargetReviewResponse {
  candidates: CandidateView[];
  corrections: CorrectionView[];
  reports: SourceReport[];
}
