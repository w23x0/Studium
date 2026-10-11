// 候选与更正界面的纯转换（可单测）：候选按来源分组、审计结论的叫法、哪些建议能当更正的依据、更正前后的对照行。
import type {
  AuditVerdict,
  CandidateKind,
  CandidateSource,
  CandidateView,
  CorrectionFields,
  CorrectionView,
  TargetRef,
} from '../shared/m08-review.ts';
import { W } from './wording.ts';

/** 来源的显示顺序：先看学习里整理出来的，再看自己提的，最后是产出物上标的。 */
export const SOURCE_ORDER: CandidateSource[] = ['m09', 'learner', 'm14'];

export interface CandidateGroup {
  source: CandidateSource;
  label: string;
  candidates: CandidateView[];
}

/** 按来源分组（没有候选的来源不出现），组内新的在前。 */
export function groupCandidates(list: readonly CandidateView[]): CandidateGroup[] {
  return SOURCE_ORDER.flatMap((source) => {
    const candidates = list
      .filter((c) => c.source === source)
      .sort((a, b) => b.at.localeCompare(a.at));
    return candidates.length === 0
      ? []
      : [{ source, label: W.candidateSource[source], candidates }];
  });
}

/** 审计结论的叫法：对“该改”的建议说采纳，其余说转正。 */
export function verdictLabel(verdict: AuditVerdict, kind: CandidateKind): string {
  return kind === 'fix' ? W.auditVerdictFix[verdict] : W.auditVerdict[verdict];
}

/** 这条建议能不能当更正的依据：是对这个点 / 子句提的“该改”，且最近一次审计建议采纳。 */
export function canCorrectWith(c: CandidateView, target: TargetRef): boolean {
  return (
    c.source === 'learner' &&
    c.kind === 'fix' &&
    c.target?.kind === target.kind &&
    c.target.id === target.id &&
    c.verdict === '建议晋升'
  );
}

export interface DiffLine {
  field: keyof CorrectionFields;
  label: string;
  before: string;
  after: string;
}

function show(field: keyof CorrectionFields, v: unknown): string {
  if (v === undefined) return '—';
  if (field === 'threshold') return v === true ? W.correctionTrue : W.correctionFalse;
  if (Array.isArray(v)) return v.join('、');
  return typeof v === 'string' ? v : JSON.stringify(v);
}

/** 一次更正改了什么：每个字段一行，更正前 → 更正后。 */
export function correctionLines(c: Pick<CorrectionView, 'fields' | 'before'>): DiffLine[] {
  return (Object.keys(c.fields) as (keyof CorrectionFields)[]).map((field) => ({
    field,
    label: W.correctionFieldLabels[field],
    before: show(field, c.before[field]),
    after: show(field, c.fields[field]),
  }));
}

/** “原文是……”：更正标记里记的原本的值，每个被改过的字段一行。 */
export function originalLines(original: CorrectionFields): { label: string; value: string }[] {
  return (Object.keys(original) as (keyof CorrectionFields)[]).map((field) => ({
    label: W.correctionFieldLabels[field],
    value: show(field, original[field]),
  }));
}

/** 知识点 / 子句旁边的小标记。 */
export function markerTags(m: {
  correction?: { count: number } | undefined;
  candidates?: number | undefined;
}): { key: 'corrected' | 'candidates'; text: string }[] {
  return [
    ...(m.correction !== undefined ? [{ key: 'corrected' as const, text: W.correctedTag }] : []),
    ...(m.candidates !== undefined && m.candidates > 0
      ? [{ key: 'candidates' as const, text: W.candidateTagShort(m.candidates) }]
      : []),
  ];
}
