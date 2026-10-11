import { describe, expect, it } from 'vitest';
import type { LoopRelationView, SessionSummary } from '../shared/protocol.ts';
import { hasForks, relationRows, taskRows } from './relations-model.ts';

const fork = (fromLoop: string) => ({
  kind: 'fork' as const,
  fork: {
    fromLoop,
    kind: 'gap' as const,
    reason: '',
    basisLines: [],
    signalLine: 1,
    returnCondition: '',
  },
});

const rels: LoopRelationView[] = [
  {
    loopSessionId: 'A',
    title: '平均速度',
    origin: { kind: 'card', cardId: 'c' },
    status: 'in_progress',
    waitingFork: 'B',
    forks: [
      { forkLoopSessionId: 'B', title: '补位移', openedAt: '1' },
      {
        forkLoopSessionId: 'D',
        title: '补坐标',
        openedAt: '0',
        returned: { at: '2', closed: true, delivered: true },
      },
    ],
  },
  { loopSessionId: 'B', title: '补位移', origin: fork('A'), status: 'in_progress', forks: [] },
  {
    loopSessionId: 'C',
    title: '能量',
    origin: { kind: 'card', cardId: 'c2' },
    status: 'closed',
    forks: [],
  },
  { loopSessionId: 'D', title: '补坐标', origin: fork('A'), status: 'closed', forks: [] },
];

describe('学习之间的关系', () => {
  it('岔出来的排在原来那段下面、缩进一层，带回来没有', () => {
    const rows = relationRows(rels);
    expect(rows.map((r) => [r.rel.loopSessionId, r.depth])).toEqual([
      ['A', 0],
      ['B', 1],
      ['D', 1],
      ['C', 0],
    ]);
    expect(rows[1]?.back).toEqual({});
    expect(rows[2]?.back?.returned?.closed).toBe(true);
    expect(rows[0]?.back).toBeUndefined();
  });

  it('没岔开过就不单列；坏数据（互相岔出）也不丢', () => {
    expect(hasForks(rels.filter((r) => r.origin.kind !== 'fork'))).toBe(false);
    expect(hasForks(rels)).toBe(true);
    const loop: LoopRelationView[] = [
      { loopSessionId: 'X', title: 'x', origin: fork('Y'), status: 'in_progress', forks: [] },
      { loopSessionId: 'Y', title: 'y', origin: fork('X'), status: 'in_progress', forks: [] },
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

  it('岔出去补的、接着学的紧跟在来自的那段下面，缩进一层并标来历', () => {
    const rows = taskRows([
      s('C', '3', { kind: 'resume', loop: 'A' }),
      s('A', '1'),
      s('T', '2', undefined, 'talk'),
      s('B', '4', { kind: 'fork', loop: 'A' }),
      s('D', '5', { kind: 'fork', loop: 'B' }),
    ]);
    expect(rows.map((r) => [r.session.sessionId, r.depth, r.from])).toEqual([
      ['A', 0, undefined],
      ['C', 1, 'resume'],
      ['B', 1, 'fork'],
      ['D', 2, 'fork'],
      ['T', 0, undefined],
    ]);
  });

  it('来自的那段不在列表里：不缩进，照样标来历；嵌太深的按 3 层画', () => {
    const deep = taskRows([
      s('A', '1'),
      s('B', '2', { kind: 'fork', loop: 'A' }),
      s('C', '3', { kind: 'fork', loop: 'B' }),
      s('D', '4', { kind: 'fork', loop: 'C' }),
      s('E', '5', { kind: 'fork', loop: 'D' }),
      s('X', '6', { kind: 'resume', loop: '别处' }),
    ]);
    expect(deep.map((r) => r.depth)).toEqual([0, 1, 2, 3, 3, 0]);
    expect(deep.at(-1)?.from).toBe('resume');
  });
});
