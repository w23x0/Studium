import { describe, expect, it } from 'vitest';
import type { PracticeTaskView } from '../shared/protocol.ts';
import type { NumberedRecord, PracticeAssigned } from '../shared/records.ts';
import {
  firstLine,
  summarizeState,
  taskOpen,
  taskTimeline,
  answerLines,
} from './practice-model.ts';
import { loopSide, toUiMessages } from './thread-model.ts';
import { W } from './wording.ts';

const at = 'x';

const assigned = (id: string, focus: string): PracticeAssigned => ({
  type: 'practice_assigned',
  at,
  id,
  focus,
  points: [],
  source: { kind: 'generated' },
  prompt: '题面',
  deliverable: '数值',
  hintsAllowed: true,
  doneWhen: '算对',
  function: '巩固',
  difficulty: '低',
  stageCheck: false,
});

function task(over: Partial<PracticeTaskView> = {}): PracticeTaskView {
  return {
    id: 'pr-1',
    loopSessionId: 'L',
    line: 3,
    at: '2026-01-01T00:00:00Z',
    focus: '位移',
    points: [],
    source: { kind: 'generated' },
    prompt: '题',
    deliverable: '数',
    hintsAllowed: true,
    doneWhen: '对',
    function: '巩固',
    difficulty: '低',
    stageCheck: false,
    status: 'assigned',
    hintsUsed: 0,
    hintsAsked: 0,
    hints: [],
    submissions: [],
    feedbacks: [],
    ...over,
  };
}

describe('对话里的练习', () => {
  const records: NumberedRecord[] = [
    { line: 1, record: { type: 'session_opened', at, sessionId: 'L', kind: 'loop', title: 't' } },
    { line: 2, record: { type: 'user_message', at, text: '来一道' } },
    { line: 3, record: assigned('pr-1', '用定义算位移') },
    { line: 4, record: { type: 'user_message', at, text: '我想是 5 米' } },
    {
      line: 5,
      record: { type: 'user_message', at, text: '位移是 2 米', practice: { taskId: 'pr-1' } },
    },
    { line: 6, record: { type: 'practice_submitted', at, taskId: 'pr-1', lines: [4] } },
    {
      line: 7,
      record: {
        type: 'practice_done',
        at,
        taskId: 'pr-1',
        outcome: 'completed',
        note: '对了',
        by: 'teacher',
      },
    },
    {
      line: 8,
      record: {
        type: 'practice_summary',
        at,
        id: 'ps-1',
        tasks: [],
        text: '先定起点终点',
        evidence: [],
        requestedBy: 'learner',
      },
    },
  ];

  it('布置的题是一张卡，带上之后说的话（可选作作答）；作答标上；做完与归纳各一行', () => {
    const ms = toUiMessages(records, '');
    const card = ms.find((m) => m.line === 3);
    expect(card).toMatchObject({
      role: 'system',
      text: W.practice.cardText('用定义算位移'),
      practice: {
        kind: 'card',
        taskId: 'pr-1',
        loopOpen: true,
        candidates: [
          { line: 4, text: '我想是 5 米' },
          { line: 5, text: '位移是 2 米' },
        ],
      },
    });
    expect(ms.find((m) => m.line === 5)?.practice).toEqual({
      kind: 'answer',
      taskId: 'pr-1',
      label: W.practice.answerTag,
    });
    expect(ms.find((m) => m.line === 4)?.practice).toEqual({
      kind: 'answer',
      taskId: 'pr-1',
      label: W.practice.markedTag,
    });
    expect(ms.find((m) => m.line === 7)?.text).toBe(
      W.practice.doneLine('completed', '用定义算位移'),
    );
    expect(ms.find((m) => m.line === 8)?.practice).toEqual({ kind: 'summary', id: 'ps-1' });
  });

  it('学习结束后卡上不能再操作', () => {
    const ended: NumberedRecord[] = [
      ...records,
      { line: 9, record: { type: 'loop_ended', at, closed: true, note: '' } },
    ];
    const card = toUiMessages(ended, '').find((m) => m.line === 3);
    expect(card?.practice).toMatchObject({ kind: 'card', loopOpen: false });
  });

  it('阶段验收的学习在中途状态里标出来', () => {
    const rs: NumberedRecord[] = [
      {
        line: 1,
        record: {
          type: 'session_opened',
          at,
          sessionId: 'L',
          kind: 'loop',
          title: 't',
          ticket: {
            newPoint: 'p',
            clause: 'c',
            startPoints: [],
            routeAction: '继续主线',
            sourceCheck: [],
            stageCheck: true,
          },
        },
      },
    ];
    expect(loopSide(rs).stageCheck).toBe(true);
    expect(loopSide(records).stageCheck).toBeUndefined();
  });
});

describe('练习卡下的经过', () => {
  it('作答、提示、反馈、做完按时间排，同一时刻按先后', () => {
    const t = task({
      submissions: [
        { at: '2026-01-01T00:02:00Z', via: 'interface', lines: [{ line: 5, text: 'a' }] },
      ],
      hints: [{ at: '2026-01-01T00:01:00Z', by: 'learner' }],
      feedbacks: [{ id: 'pf-1', at: '2026-01-01T00:03:00Z', line: 7, text: '好', errors: [] }],
      done: { at: '2026-01-01T00:03:00Z', outcome: 'completed', note: '', by: 'teacher' },
    });
    expect(taskTimeline(t).map((x) => x.kind)).toEqual(['hint', 'submission', 'feedback', 'done']);
  });

  it('做完 / 放下或学习结束后不能再交', () => {
    expect(taskOpen(task(), true)).toBe(true);
    expect(taskOpen(task(), false)).toBe(false);
    expect(taskOpen(task({ status: 'completed' }), true)).toBe(false);
    expect(taskOpen(task({ status: 'abandoned' }), true)).toBe(false);
  });

  it('作答的原话行去重、排序', () => {
    const t = task({
      submissions: [
        {
          at,
          via: 'conversation',
          lines: [
            { line: 9, text: 'b' },
            { line: 4, text: 'a' },
          ],
        },
        { at, via: 'interface', lines: [{ line: 4, text: 'a' }] },
      ],
    });
    expect(answerLines(t)).toEqual([4, 9]);
  });
});

describe('帮我归纳一下', () => {
  it('没有练习不显示；不足 2 道做完的不能点', () => {
    expect(summarizeState([])).toEqual({ show: false, completed: 0, can: false });
    expect(summarizeState([task({ status: 'completed' }), task()])).toEqual({
      show: true,
      completed: 1,
      can: false,
    });
    expect(summarizeState([task({ status: 'completed' }), task({ status: 'completed' })]).can).toBe(
      true,
    );
  });

  it('归纳先只显示头一行', () => {
    expect(firstLine('## 先定起点\n再相减')).toBe('先定起点');
    expect(firstLine('长'.repeat(100), 10)).toBe(`${'长'.repeat(10)}…`);
  });
});
