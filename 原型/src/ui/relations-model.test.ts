import { describe, expect, it } from 'vitest';
import type { LoopRelationView, SessionSummary } from '../shared/protocol.ts';
import { hasResumes, relationRows, taskRows } from './relations-model.ts';

const resume = (fromLoop: string) => ({ kind: 'resume' as const, fromLoop });

const rels: LoopRelationView[] = [
  {
    loopSessionId: 'A',
    title: '平均速度',
    origin: { kind: 'card', cardId: 'c' },
    status: 'in_progress',
  },
  { loopSessionId: 'B', title: '补位移', origin: resume('A'), status: 'in_progress' },
  {
    loopSessionId: 'C',
    title: '能量',
    origin: { kind: 'card', cardId: 'c2' },
    status: 'closed',
  },
  { loopSessionId: 'D', title: '补坐标', origin: resume('A'), status: 'closed' },
];

describe('一次学习之间的关系', () => {
  it('接着学的排在原来那段下面、缩进一层', () => {
    const rows = relationRows(rels);
    expect(rows.map((r) => [r.rel.loopSessionId, r.depth])).toEqual([
      ['A', 0],
      ['B', 1],
      ['D', 1],
      ['C', 0],
    ]);
  });

  it('没有接着学就不单列；坏数据（互相接着）也不丢', () => {
    expect(hasResumes(rels.filter((r) => r.origin.kind !== 'resume'))).toBe(false);
    expect(hasResumes(rels)).toBe(true);
    const loop: LoopRelationView[] = [
      { loopSessionId: 'X', title: 'x', origin: resume('Y'), status: 'in_progress' },
      { loopSessionId: 'Y', title: 'y', origin: resume('X'), status: 'in_progress' },
    ];
    expect(relationRows(loop)).toHaveLength(2);
  });
});

describe('左栏对话列表的缩进与来历', () => {
  const s = (
    id: string,
    at: string,
    from?: SessionSummary['from'],
    kind: SessionSummary['kind'] = 'loop',
  ): SessionSummary => ({
    sessionId: id,
    kind,
    title: id,
    openedAt: at,
    parent: 'main',
    ...(from !== undefined ? { from } : {}),
  });

  it('接着学的紧跟在来自的那段下面，缩进一层并标来历', () => {
    const rows = taskRows([
      s('C', '3', { kind: 'resume', loop: 'A' }),
      s('A', '1'),
      s('T', '2', undefined, 'talk'),
      s('B', '4', { kind: 'resume', loop: 'A' }),
      s('D', '5', { kind: 'resume', loop: 'B' }),
    ]);
    expect(rows.map((r) => [r.session.sessionId, r.depth, r.from])).toEqual([
      ['A', 0, undefined],
      ['C', 1, 'resume'],
      ['B', 1, 'resume'],
      ['D', 2, 'resume'],
      ['T', 0, undefined],
    ]);
  });

  it('来自的那段不在列表里：不缩进，照样标来历；嵌太深的按 3 层画', () => {
    const deep = taskRows([
      s('A', '1'),
      s('B', '2', { kind: 'resume', loop: 'A' }),
      s('C', '3', { kind: 'resume', loop: 'B' }),
      s('D', '4', { kind: 'resume', loop: 'C' }),
      s('E', '5', { kind: 'resume', loop: 'D' }),
      s('X', '6', { kind: 'resume', loop: '别处' }),
    ]);
    expect(deep.map((r) => r.depth)).toEqual([0, 1, 2, 3, 3, 0]);
    expect(deep.at(-1)?.from).toBe('resume');
  });
});
