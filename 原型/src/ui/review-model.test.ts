import { describe, expect, it } from 'vitest';
import type { CandidateView } from '../shared/m08-review.ts';
import {
  canCorrectWith,
  correctionLines,
  groupCandidates,
  markerTags,
  originalLines,
  verdictLabel,
} from './review-model.ts';

function cand(over: Partial<CandidateView> & Pick<CandidateView, 'id' | 'source'>): CandidateView {
  return {
    kind: 'supplement',
    status: '候选、未审',
    at: '2026-10-11T10:00:00.000Z',
    text: 't',
    audits: [],
    correctedBy: [],
    ...over,
  };
}

describe('候选与更正的界面转换', () => {
  it('按来源分组：固定顺序，没有候选的来源不出现，组内新的在前', () => {
    const groups = groupCandidates([
      cand({ id: 'a', source: 'm14', at: '2026-10-11T09:00:00.000Z' }),
      cand({ id: 'b', source: 'learner', at: '2026-10-11T09:00:00.000Z' }),
      cand({ id: 'c', source: 'learner', at: '2026-10-11T11:00:00.000Z' }),
    ]);
    expect(groups.map((g) => g.source)).toEqual(['learner', 'm14']);
    expect(groups[0]?.candidates.map((c) => c.id)).toEqual(['c', 'b']);
    expect(groups[0]?.label).toBe('我提的建议');
    expect(groupCandidates([])).toEqual([]);
  });

  it('审计结论：对“该改”的建议说采纳，其余说转正', () => {
    expect(verdictLabel('建议晋升', 'fix')).toBe('建议采纳');
    expect(verdictLabel('建议晋升', 'new_point')).toBe('建议转正');
    expect(verdictLabel('待定', 'fix')).toBe('先放着');
  });

  it('只有对这个对象提的“该改”、最近一次审计建议采纳的建议能当更正的依据', () => {
    const t = { kind: 'point', id: 'p-1' } as const;
    const ok = cand({
      id: 'x',
      source: 'learner',
      kind: 'fix',
      target: { kind: 'point', id: 'p-1', name: 'n', found: true },
      verdict: '建议晋升',
    });
    expect(canCorrectWith(ok, t)).toBe(true);
    expect(canCorrectWith({ ...ok, verdict: '待定' }, t)).toBe(false);
    expect(canCorrectWith({ ...ok, kind: 'supplement' }, t)).toBe(false);
    expect(canCorrectWith({ ...ok, source: 'm09' }, t)).toBe(false);
    expect(canCorrectWith(ok, { kind: 'point', id: 'p-2' })).toBe(false);
    expect(canCorrectWith(ok, { kind: 'clause', id: 'p-1' })).toBe(false);
  });

  it('更正的对照行与“原文是……”', () => {
    expect(
      correctionLines({
        fields: { sentence: '新', threshold: true, from: ['a', 'b'] },
        before: { sentence: '旧', from: ['a'] },
      }),
    ).toEqual([
      { field: 'sentence', label: '一句话说明', before: '旧', after: '新' },
      { field: 'threshold', label: '是不是关键的一步', before: '—', after: '是' },
      { field: 'from', label: '从哪些知识点连来', before: 'a', after: 'a、b' },
    ]);
    expect(originalLines({ name: '位移', threshold: false })).toEqual([
      { label: '名字', value: '位移' },
      { label: '是不是关键的一步', value: '不是' },
    ]);
  });

  it('知识点上的标记：有更正、有几条候选', () => {
    expect(markerTags({})).toEqual([]);
    expect(markerTags({ correction: { count: 2 }, candidates: 3 }).map((t) => t.text)).toEqual([
      '有更正',
      '有 3 条候选',
    ]);
    expect(markerTags({ candidates: 0 })).toEqual([]);
  });
});
