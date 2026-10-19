// 长期功能界面用的纯转换：路线偏差的说法、今天先不看的项；
// 以及对话里的复习 / 复检、接着学、阶段复盘。
import { describe, expect, it } from 'vitest';
import type { TodayItem } from '../shared/protocol.ts';
import type { NumberedRecord } from '../shared/records.ts';
import { reviewReturnedFact } from '../shared/records-longterm.ts';
import { addDays, deviationLine, todayKey, visibleToday } from './longterm-model.ts';
import { loopSide, reviewWindow, toUiMessages } from './thread-model.ts';
import { W } from './wording.ts';

describe('路线偏差的说法与今天该做的', () => {
  it('三类偏差都是日常话', () => {
    expect(
      deviationLine({
        kind: '没选推荐项',
        at: '2026-10-02',
        text: '推荐「位移」，学习者选了「平均速度」',
        refs: [],
      }),
    ).toBe('2026-10-02 没选推荐项：推荐「位移」，学习者选了「平均速度」');
    expect(
      deviationLine({
        kind: '没合上就结束',
        at: '2026-10-03',
        loopId: 'L',
        text: '「平均速度」没合上就结束：先到这',
        refs: [],
      }),
    ).toBe('2026-10-03 没合上就结束：「平均速度」没合上就结束：先到这');
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
            revisit: { kind: '复检', ofLoop: 'L1', verdictLine: 3 },
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
