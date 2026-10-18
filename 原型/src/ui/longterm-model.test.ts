// 跨段学习的长期功能（批 6）界面用的纯转换：我学会的筛选排序、知识点经过、分析版本、没按推荐走的说法、
// 今天先不看的项；以及对话里的复习 / 复检、接着学、阶段复盘。
import { describe, expect, it } from 'vitest';
import type {
  DeviationView,
  FormationView,
  PointViewEntry,
  TimelineView,
  TodayItem,
} from '../shared/protocol.ts';
import type { NumberedRecord } from '../shared/records.ts';
import { reviewReturnedFact } from '../shared/records-longterm.ts';
import {
  addDays,
  analysisGroups,
  deviationLine,
  entrySummary,
  filterView,
  levelText,
  pointHistory,
  statusCounts,
  todayKey,
  visibleToday,
} from './longterm-model.ts';
import { loopSide, reviewWindow, toUiMessages } from './thread-model.ts';
import { W } from './wording.ts';

function entry(id: string, name: string, extra: Partial<PointViewEntry> = {}): PointViewEntry {
  return {
    point: { id, name },
    status: '闭环证据',
    lastTouchedAt: '2026-10-01T00:00:00.000Z',
    daysSince: 0,
    summary: '',
    keywords: [name],
    versions: 1,
    sources: { loops: 1, external: 0 },
    timeline: [],
    ...extra,
  };
}

const entries = [
  entry('p-a', '位移', { lastTouchedAt: '2026-10-05T00:00:00Z', summary: '只看起点终点' }),
  entry('p-b', '速度', { lastTouchedAt: '2026-09-01T00:00:00Z', status: '提取失败' }),
  entry('p-c', '加速度', {
    lastTouchedAt: '2026-09-20T00:00:00Z',
    keywords: ['加速度', '变化率'],
  }),
];

describe('我学会的：筛选与排序', () => {
  it('默认最近碰过的在前；可按最久没碰排', () => {
    expect(filterView(entries, {}).map((e) => e.point.name)).toEqual(['位移', '加速度', '速度']);
    expect(filterView(entries, { sort: 'oldest' }).map((e) => e.point.name)).toEqual([
      '速度',
      '加速度',
      '位移',
    ]);
  });
  it('按名字、摘要、关键词搜；按状态筛', () => {
    expect(filterView(entries, { q: '终点' }).map((e) => e.point.id)).toEqual(['p-a']);
    expect(filterView(entries, { q: '变化率' }).map((e) => e.point.id)).toEqual(['p-c']);
    expect(filterView(entries, { status: '提取失败' }).map((e) => e.point.id)).toEqual(['p-b']);
    expect(statusCounts(entries).get('闭环证据')).toBe(2);
  });
  it('核心的占位摘要换成日常话；档次换成日常说法', () => {
    expect(entrySummary(entry('p', 'x', { summary: '（在别的闭环里作为出发点用过）' }))).toBe(
      W.summaryAsBase,
    );
    expect(levelText('结构')).toBe(W.levels['结构']);
    expect(levelText('自定的档')).toBe('自定的档');
    expect(levelText(undefined)).toBeUndefined();
  });
});

function formation(
  id: string,
  loop: string,
  at: string,
  extra: Partial<FormationView> = {},
): FormationView {
  return {
    id,
    at,
    loopSessionId: loop,
    newPoint: { id: 'p-a', name: '位移' },
    clause: 'c',
    startPoints: [],
    understanding: '',
    process: '',
    unmet: '',
    evidenceStrength: '当场、独立',
    evidenceLines: [],
    quotes: [],
    model: { name: 'm', known: true },
    objections: [],
    version: 1,
    latest: true,
    ...extra,
  };
}

const timeline: TimelineView = {
  id: 't1',
  at: '2026-10-03T00:00:00Z',
  kind: '提取失败',
  point: { id: 'p-a', name: '位移' },
  loopSessionId: 'L2',
  targets: ['f1'],
  reason: '答不出',
  evidenceLines: [4],
  model: { name: 'm' },
};

describe('一个知识点的经过与分析版本', () => {
  const fs = [
    formation('f1', 'L1', '2026-10-01T00:00:00Z', { latest: false }),
    formation('f1b', 'L1', '2026-10-06T00:00:00Z', { version: 2 }),
    formation('f3', 'L3', '2026-10-04T00:00:00Z', {
      revisit: { kind: '复检', formationIds: ['f1b'] },
    }),
    formation('f4', 'L4', '2026-10-02T00:00:00Z', {
      newPoint: { id: 'p-b', name: '速度' },
      startPoints: [{ id: 'p-a', name: '位移' }],
    }),
  ];
  it('每段取最新一版、时间用第一次写分析的时间；加上时间版本记录，旧在前', () => {
    const h = pointHistory('p-a', fs, [timeline]);
    expect(h.map((e) => [e.kind, e.loopSessionId])).toEqual([
      ['learned', 'L1'],
      ['base', 'L4'],
      ['提取失败', 'L2'],
      ['复检', 'L3'],
    ]);
    expect(h[0]?.recordId).toBe('f1b');
    expect(h[0]?.at).toBe('2026-10-01T00:00:00Z');
  });
  it('分析按段分组，版本旧在前，最新的标出', () => {
    const g = analysisGroups('p-a', fs);
    expect(g.map((x) => x.loopSessionId)).toEqual(['L3', 'L1']);
    expect(g[1]?.versions.map((v) => v.version)).toEqual([1, 2]);
    expect(g[1]?.latest.id).toBe('f1b');
  });
});

describe('没按推荐走的说法与今天该做的', () => {
  it('三种偏差都是日常话', () => {
    const base = { id: 'd', at: 'x', mainSessionId: 'M' };
    const rec = { option: 0, title: '位移' };
    const chosen = { option: 1, title: '平均速度' };
    expect(deviationLine({ ...base, kind: 'not_recommended', recommended: rec, chosen })).toBe(
      W.devNotRecommended('位移', '平均速度'),
    );
    const ended: DeviationView = {
      ...base,
      kind: 'ended_unclosed',
      loopSessionId: 'L',
      facts: { learnerMessages: 2, minutes: 5, quickDrop: true },
    };
    expect(deviationLine(ended, () => '位移')).toBe(
      `${W.devEnded('位移')}（${W.devEndedFacts(2, 5)}，${W.devQuick}）`,
    );
    expect(deviationLine({ ...base, kind: 'detour_choice', recommended: rec, chosen: rec })).toBe(
      W.devDetourSame('位移'),
    );
  });
  it('今天先不看的项藏起来；提醒按 id 区分', () => {
    const reminder: TodayItem = {
      kind: 'reminder',
      overdueDays: 0,
      reminder: {
        id: 'r1',
        due: '2026-10-01',
        kind: 'recheck',
        text: '复检',
        by: 'learner',
        addedAt: 'x',
        isDue: true,
      },
    };
    const review: TodayItem = { kind: 'review', since: 'x', endedLoops: 2 };
    expect(todayKey(reminder)).toBe('reminder:r1');
    expect(visibleToday([reminder, review], ['review'])).toEqual([reminder]);
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02');
  });
});

describe('对话里的复习 / 复检、接着学、阶段复盘', () => {
  it('学习对话认出复检与接着哪段学', () => {
    const recs: NumberedRecord[] = [
      {
        line: 1,
        record: {
          type: 'session_opened',
          at: 'x',
          sessionId: 'L2',
          kind: 'loop',
          title: '位移',
          ticket: {
            newPoint: 'p-a',
            clause: 'c',
            startPoints: [],
            routeAction: '',
            sourceCheck: [],
            revisit: { kind: '复检', formationIds: ['f1'] },
          },
          resumeOf: { fromLoop: 'L1', endedAt: 'x' },
        },
      },
    ];
    const side = loopSide(recs);
    expect(side.revisit).toBe('复检');
    expect(side.resumeOf).toBe('L1');
  });
  it('复盘对话认出时间窗口；交回与主对话里的入口用复盘的说法', () => {
    const win = { since: '2026-10-01T00:00:00Z', until: '2026-10-10T00:00:00Z' };
    const talk: NumberedRecord[] = [
      {
        line: 1,
        record: {
          type: 'session_opened',
          at: 'x',
          sessionId: 'T',
          kind: 'talk',
          title: '阶段复盘',
          review: win,
        },
      },
      {
        line: 2,
        record: { type: 'talk_ended', at: 'x', goal: '这段学得稳', title: '阶段复盘', review: win },
      },
    ];
    expect(reviewWindow(talk)).toEqual(win);
    expect(toUiMessages(talk, '').at(-1)?.text).toBe(W.reviewEndedLine('这段学得稳'));
    const main: NumberedRecord[] = [
      {
        line: 5,
        record: {
          type: 'task_opened',
          at: 'x',
          sessionId: 'T',
          kind: 'talk',
          title: '阶段复盘',
          anchorLine: 4,
        },
      },
    ];
    expect(toUiMessages(main, '', { isReview: (id) => id === 'T' })[0]?.text).toBe(W.reviewTask);
    expect(toUiMessages(main, '')[0]?.text).toBe('单独谈谈你想学什么');
  });
});

describe('复盘交回主对话的那一句', () => {
  it('主对话里显示交回的那一句并能回到复盘；别的程序事实照旧不显示', () => {
    const main: NumberedRecord[] = [
      { line: 1, record: { type: 'program_fact', at: 'x', text: '下一张选择卡正在出' } },
      {
        line: 2,
        record: {
          type: 'program_fact',
          at: 'x',
          text: reviewReturnedFact('20261011-talk-abc123', '这段学得稳，下周补位移'),
        },
      },
    ];
    const ui = toUiMessages(main, '');
    expect(ui).toHaveLength(1);
    expect(ui[0]).toMatchObject({
      role: 'system',
      text: W.reviewEndedLine('这段学得稳，下周补位移'),
      line: 2,
      link: { sessionId: '20261011-talk-abc123' },
    });
  });
});
