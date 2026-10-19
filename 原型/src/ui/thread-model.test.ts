import { describe, expect, it } from 'vitest';
import type { NumberedRecord } from '../shared/records.ts';
import { loopState, pendingCard, toUiMessages } from './thread-model.ts';

const at = 'x';

describe('toUiMessages', () => {
  const records: NumberedRecord[] = [
    { line: 1, record: { type: 'session_opened', at, sessionId: 's', kind: 'main', title: 't' } },
    { line: 2, record: { type: 'user_message', at, text: '问' } },
    { line: 3, record: { type: 'model_raw', at, adapter: 'fake', payload: {} } },
    { line: 4, record: { type: 'assistant_message', at, text: '答一' } },
    { line: 5, record: { type: 'assistant_message', at, text: '答二' } },
  ];

  it('只显示对话，不显示原始消息；同一轮的多段回复合并', () => {
    expect(toUiMessages(records, '')).toEqual([
      { id: 'l2', role: 'user', text: '问', line: 2 },
      { id: 'l4', role: 'assistant', text: '答一\n\n答二', line: 4, lines: [4, 5] },
    ]);
  });

  it('流式草稿作为最后一条助手消息', () => {
    expect(toUiMessages(records.slice(0, 2), '正在')).toMatchObject([
      { role: 'user' },
      { id: 'draft', role: 'assistant', text: '正在' },
    ]);
  });

  it('失败的一轮标成失败，用日常话提示', () => {
    const rs: NumberedRecord[] = [
      { line: 1, record: { type: 'user_message', at, text: '问' } },
      { line: 2, record: { type: 'turn_failed', at, reason: '断网' } },
    ];
    expect(toUiMessages(rs, '')[1]).toMatchObject({
      failed: true,
      text: '（这次回复没完成，可以再发一次）',
    });
  });

  it('还在跑、没有流式文字时放一条空的占位', () => {
    expect(toUiMessages(records.slice(0, 2), '', { running: true }).at(-1)).toMatchObject({
      id: 'draft',
      text: '',
    });
  });

  it('程序事实不显示；选定后显示去那个任务的入口', () => {
    const rs: NumberedRecord[] = [
      { line: 1, record: { type: 'program_fact', at, text: '这次学习的单子' } },
      {
        line: 2,
        record: {
          type: 'choice_card',
          at,
          cardId: 'c1',
          navSessionId: 'm',
          options: [
            {
              title: '位移',
              reason: '',
              ticket: {
                newPoint: 'p',
                clause: 'c',
                startPoints: [],
                routeAction: '',
                sourceCheck: [],
              },
            },
          ],
          recommended: 0,
          trigger: '',
        },
      },
      {
        line: 3,
        record: { type: 'choice_made', at, cardId: 'c1', option: 0, loopSessionId: 'L' },
      },
    ];
    expect(toUiMessages(rs, '')).toEqual([
      {
        id: 'l3',
        role: 'system',
        text: '开始学：位移',
        line: 3,
        link: { sessionId: 'L', label: '开始学：位移' },
      },
    ]);
  });
});

describe('改单子', () => {
  it('学习者改单子在对话里显示成一句提示', () => {
    const ticket = {
      newPoint: '位移',
      clause: '从坐标相减出发',
      startPoints: [],
      routeAction: '继续主线',
      sourceCheck: [],
    };
    const rs: NumberedRecord[] = [
      {
        line: 5,
        record: { type: 'ticket_edited', at, by: 'learner', before: ticket, after: ticket },
      },
    ];
    expect(toUiMessages(rs, '')).toEqual([
      { id: 'l5', role: 'system', text: '你改了这次要学的内容。', line: 5 },
    ]);
  });
});

describe('判断与不同看法', () => {
  it('判断那句提示带结果，可点开；学习者的不同看法带标记', () => {
    const rs: NumberedRecord[] = [
      {
        line: 3,
        record: {
          type: 'guard_verdict',
          at,
          guardSessionId: 'g',
          closed: false,
          basis: '还没说清',
          lines: [2],
        },
      },
      { line: 4, record: { type: 'user_message', at, text: '我说清了', objection: { toLine: 3 } } },
    ];
    const [v, o] = toUiMessages(rs, '');
    expect(v).toMatchObject({ role: 'system', line: 3, verdict: { closed: false } });
    expect(o).toMatchObject({ role: 'user', objection: { toLine: 3 } });
  });
});

describe('loopState / pendingCard', () => {
  it('守卫判合上后等确认，确认后结束', () => {
    const rs: NumberedRecord[] = [
      { line: 1, record: { type: 'close_requested', at, by: 'model', reason: '' } },
      {
        line: 2,
        record: {
          type: 'guard_verdict',
          at,
          guardSessionId: 'g',
          closed: true,
          basis: '好',
          lines: [1],
        },
      },
    ];
    expect(loopState(rs)).toEqual({ kind: 'awaiting_confirm', basis: '好' });
    rs.push({ line: 3, record: { type: 'loop_ended', at, closed: true, note: '' } });
    expect(loopState(rs)).toEqual({ kind: 'ended', closed: true });
  });

  it('选过的卡不再待选', () => {
    const card = {
      type: 'choice_card' as const,
      at,
      cardId: 'c1',
      navSessionId: 'm',
      options: [],
      recommended: 0,
      trigger: '',
    };
    const rs: NumberedRecord[] = [{ line: 1, record: card }];
    expect(pendingCard(rs)?.cardId).toBe('c1');
    rs.push({
      line: 2,
      record: { type: 'choice_made', at, cardId: 'c1', option: 0, loopSessionId: 'l' },
    });
    expect(pendingCard(rs)).toBeUndefined();
  });
});

describe('附图的消息', () => {
  it('学习者消息带上原图 id，文字照记录（含转写）', () => {
    const rs: NumberedRecord[] = [
      {
        line: 2,
        record: {
          type: 'user_message',
          at,
          text: '看图\n\n［图片 1 · 自动转写，可能有误］\n$x$',
          images: [
            { attachmentId: 'img-1', transcriptionId: 'tr-1', transcript: '$x$', sent: '$x$' },
          ],
        },
      },
    ];
    expect(toUiMessages(rs, '')).toEqual([
      {
        id: 'l2',
        role: 'user',
        text: '看图\n\n［图片 1 · 自动转写，可能有误］\n$x$',
        line: 2,
        images: ['img-1'],
      },
    ]);
  });
});
