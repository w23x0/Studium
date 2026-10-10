// 学到一半（批 5）在对话里的样子：小卡、选过的、岔出去的回来、先放一放 / 接着学、没学完的记录；以及顶部 / 底部用的中途状态。
import { describe, expect, it } from 'vitest';
import type { NumberedRecord } from '../shared/records.ts';
import {
  forkWhat,
  learnerShelveNote,
  loopSide,
  SHELVE_NO_NOTE,
  toUiMessages,
} from './thread-model.ts';
import { W } from './wording.ts';

const at = 'x';

const base: NumberedRecord[] = [
  {
    line: 1,
    record: { type: 'session_opened', at, sessionId: 'L', kind: 'loop', title: '平均速度' },
  },
  { line: 2, record: { type: 'user_message', at, text: '这个位移我不太会' } },
  {
    line: 3,
    record: {
      type: 'route_signal',
      at,
      kind: 'gap',
      missingPoint: 'p-displacement',
      missingText: '位移',
      basisLines: [2],
    },
  },
  {
    line: 4,
    record: {
      type: 'detour_card',
      at,
      cardId: 'd1',
      m05SessionId: 'm',
      signalLine: 3,
      recommended: 0,
      options: [
        {
          kind: 'fork',
          title: '先把位移补一补',
          reason: '平均速度要用位移',
          sources: [],
          scope: '够用为止',
        },
        { kind: 'continue', title: '先不管，接着学', reason: '先放着', sources: [] },
      ],
    },
  },
];

const forked: NumberedRecord[] = [
  ...base,
  {
    line: 5,
    record: {
      type: 'detour_made',
      at,
      cardId: 'd1',
      option: 0,
      choice: 'fork',
      forkLoopSessionId: 'F',
    },
  },
];

describe('对话里的小卡', () => {
  it('没选时显示小卡（通知本身不显示）', () => {
    const ms = toUiMessages(base, '');
    expect(ms.map((m) => m.line)).toEqual([2, 4]);
    expect(ms[1]).toMatchObject({
      role: 'system',
      detour: {
        cardId: 'd1',
        recommended: 0,
        options: [{ kind: 'fork', scope: '够用为止' }, { kind: 'continue' }],
      },
    });
    expect(ms[1]?.detour?.chosen).toBeUndefined();
  });

  it('选过的小卡带选了哪项与开出的那段', () => {
    const card = toUiMessages(forked, '').find((m) => m.detour);
    expect(card?.detour?.chosen).toEqual({ option: 0, forkLoopSessionId: 'F' });
  });

  it('岔出去的回来：补完了 / 没补好，说的是当初缺的那一处', () => {
    const back = (closed: boolean) =>
      toUiMessages(
        [
          ...forked,
          {
            line: 6,
            record: { type: 'fork_returned', at, forkLoopSessionId: 'F', closed, delivered: true },
          },
        ],
        '',
      ).at(-1)?.text;
    expect(back(true)).toBe(W.forkReturned.gap('位移'));
    expect(back(false)).toBe(W.forkNotDone('位移'));
  });

  it('先放一放：学习者写的原因照显示，程序代写的不显示；接着学；没学完的记录', () => {
    const rs = (note: string): NumberedRecord[] => [
      { line: 1, record: { type: 'loop_shelved', at, note } },
      { line: 2, record: { type: 'loop_resumed', at, by: 'button' } },
      {
        line: 3,
        record: {
          type: 'parking_note',
          at,
          reason: 'shelved',
          missing: [{ point: 'p-displacement', text: '位移' }],
          when: '下次',
          resumeFrom: '位移那段',
          basisLines: [],
          m05SessionId: 'm',
        },
      },
    ];
    expect(toUiMessages(rs('今天太累'), '').map((m) => m.text)).toEqual([
      W.shelvedLineNote('今天太累'),
      W.resumedLine,
      W.parkedLine({ missing: '位移', when: '下次', from: '位移那段' }),
    ]);
    expect(toUiMessages(rs(SHELVE_NO_NOTE), '')[0]?.text).toBe(W.shelvedLine);
  });
});

describe('中途状态', () => {
  it('等岔出去的回来；回来后不再等', () => {
    expect(loopSide(forked)).toEqual({
      waiting: { forkLoopSessionId: 'F', kind: 'gap', what: '位移' },
      openDetour: false,
    });
    expect(loopSide(base).openDetour).toBe(true);
    const back: NumberedRecord = {
      line: 6,
      record: { type: 'fork_returned', at, forkLoopSessionId: 'F', closed: true, delivered: true },
    };
    expect(loopSide([...forked, back]).waiting).toBeUndefined();
  });

  it('先放一放着；接着学之后不算；结束了也不算', () => {
    const shelved: NumberedRecord = { line: 9, record: { type: 'loop_shelved', at, note: '累了' } };
    expect(loopSide([...base, shelved]).shelved).toEqual({ at, note: '累了' });
    expect(
      loopSide([
        ...base,
        shelved,
        { line: 10, record: { type: 'loop_resumed', at, by: 'message' } },
      ]).shelved,
    ).toBeUndefined();
    expect(
      loopSide([
        ...base,
        shelved,
        { line: 10, record: { type: 'loop_ended', at, closed: false, note: '' } },
      ]).shelved,
    ).toBeUndefined();
  });

  it('岔出来的那段：从哪来、补什么（取知识点名字，不露编号）', () => {
    const side = loopSide([
      {
        line: 1,
        record: {
          type: 'session_opened',
          at,
          sessionId: 'F',
          kind: 'loop',
          title: '先把位移补一补',
          fork: {
            fromLoop: 'L',
            kind: 'gap',
            reason: 'p-displacement「位移」，你说位移还不太会',
            basisLines: [2],
            signalLine: 3,
            returnCondition: '',
          },
        },
      },
    ]);
    expect(side.fork).toEqual({ fromLoop: 'L', kind: 'gap', what: '位移' });
    expect(forkWhat('想先看看能量')).toBe('想先看看能量');
  });

  it('程序代写的搁置备注不当成学习者的话', () => {
    expect(learnerShelveNote(SHELVE_NO_NOTE)).toBeUndefined();
    expect(learnerShelveNote('学习者在界面上点了按钮')).toBeUndefined();
    expect(learnerShelveNote('在小卡上选了先搁置（位移）')).toBeUndefined();
    expect(learnerShelveNote(' 明天再来 ')).toBe('明天再来');
  });
});
