import { describe, expect, it } from 'vitest';
import type { LoopRelationView } from '../shared/protocol.ts';
import { hasForks, relationRows } from './relations-model.ts';

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
