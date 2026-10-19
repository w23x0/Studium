// 验收（W6，界面纯函数）：“我学会的”按学习列（docs/设计/记录/学过的记录.md「分层」「外部导入」；工单 README §2.5）：
// 每次学习一行（标题、状态、时间），最新的在前；展开看上层（单子、没合上的结束原话与导航当时的路线决定）与
// 中层（通过的判定：理解逐条 + 证据强度 + 模型），可跳到对话原文；外部导入单列、标“未验证”。
// 模块 src/ui/learned-model.ts（W6 新建）。
import { describe, expect, it } from 'vitest';
import { shortTime } from '../../src/ui/evidence-model.ts';
import { importRows, learnedDetail, learnedRows } from '../../src/ui/learned-model.ts';

type LearningArg = Parameters<typeof learnedDetail>[0];
type ImportsArg = Parameters<typeof importRows>[0];

const ticket = (newPoint: string) => ({
  newPoint,
  clause: `从已有的出发学${newPoint}`,
  startPoints: [{ point: '位置', source: '假定' }],
  routeAction: '继续主线',
  sourceCheck: [],
});

const closed = {
  loopId: 'L1',
  title: '位移',
  openedAt: '2026-10-10T08:00:00.000Z',
  endedAt: '2026-10-10T09:00:00.000Z',
  status: '合上',
  ticket: ticket('位移'),
  verdict: {
    line: 14,
    closed: true,
    basis: '学习者自己说清了位移（L9）',
    understanding: [
      { text: '位移只看起点终点', lines: [9], independence: '独立', durability: '仅当场' },
    ],
    model: 'fake-model-1',
  },
} as unknown as LearningArg;

const unclosed = {
  loopId: 'L2',
  title: '平均速度',
  openedAt: '2026-10-11T08:00:00.000Z',
  endedAt: '2026-10-11T08:30:00.000Z',
  status: '没合上',
  ticket: ticket('平均速度'),
  endNote: '今天先到这，想换本书看',
  routeDecision: { line: 40, decision: '先补位移的正负', reason: '缺在出发点“位移有正负”' },
} as unknown as LearningArg;

const ongoing = {
  loopId: 'L3',
  title: '瞬时速度',
  openedAt: '2026-10-12T08:00:00.000Z',
  status: '进行中',
  ticket: ticket('瞬时速度'),
} as unknown as LearningArg;

const INTERNAL = ['闭环', '守卫', '出发点', '子句', '新点', '单子', 'M0', 'M1', 'M09', '形成记录'];

describe('我学会的：按学习列', () => {
  it('每次学习一行，最新的在前；带标题、状态、时间、要学的', () => {
    const rows = learnedRows([closed, unclosed, ongoing]);
    expect(
      rows.map((r) => r.loopId),
      '按（结束时间，没结束按开始时间）从新到旧',
    ).toEqual(['L3', 'L2', 'L1']);
    expect(rows.map((r) => r.status)).toEqual(['进行中', '没合上', '合上']);
    expect(rows[2]).toMatchObject({
      title: '位移',
      at: '2026-10-10T09:00:00.000Z',
      time: shortTime('2026-10-10T09:00:00.000Z'),
      newPoint: '位移',
      shelved: false,
    });
    expect(rows[0]?.at, '进行中的用开始时间').toBe('2026-10-12T08:00:00.000Z');
    const labels = rows.map((r) => r.statusLabel);
    expect(new Set(labels).size, '三种状态说法各不相同').toBe(3);
    expect(labels.filter((t) => t.trim() === '' || INTERNAL.some((w) => t.includes(w)))).toEqual(
      [],
    );
    expect(
      learnedRows([closed, ongoing], ['L3']).find((r) => r.loopId === 'L3')?.shelved,
      '搁置着的标出来',
    ).toBe(true);
  });

  it('展开合上的一次：上层单子 + 中层判定（理解逐条带证据强度、模型），可跳到判定与对话原文', () => {
    const d = learnedDetail(closed, 'MAIN');
    expect(d.upper.ticket[0], '上层先是要学的').toMatchObject({ kind: 'newPoint', text: '位移' });
    expect(d.upper.endNote, '合上的没有结束原话').toBeUndefined();
    expect(d.upper.routeDecision).toBeUndefined();
    expect(d.middle, '中层是通过的那份判定').toMatchObject({
      line: 14,
      closed: true,
      basis: '学习者自己说清了位移（L9）',
      model: 'fake-model-1',
      jump: { sessionId: 'L1', lines: [14] },
    });
    expect(d.middle?.rows, '理解逐条带证据强度').toMatchObject([
      { text: '位移只看起点终点', strength: '自己做出来 · 只在当场', lines: [9] },
    ]);
    expect(d.transcript, '可跳到这次的对话原文').toEqual({ sessionId: 'L1' });
  });

  it('展开没合上的一次：上层 = 单子 + 结束原话 + 路线决定（可跳到项目对话那一行）；没有中层', () => {
    const d = learnedDetail(unclosed, 'MAIN');
    expect(d.middle, '没合上没有判定').toBeUndefined();
    expect(d.upper.endNote).toBe('今天先到这，想换本书看');
    expect(d.upper.routeDecision).toEqual({
      line: 40,
      decision: '先补位移的正负',
      reason: '缺在出发点“位移有正负”',
      jump: { sessionId: 'MAIN', lines: [40] },
    });
    expect(
      learnedDetail(unclosed).upper.routeDecision?.jump,
      '不知道是哪个项目时不给跳转',
    ).toBeUndefined();
    expect(learnedDetail(ongoing).middle, '进行中的没有中层').toBeUndefined();
  });

  it('外部导入单列：标“未验证”、按渠道说明来源，畅谈的能跳回学习者那几句', () => {
    const imports = [
      {
        id: 'imp-1',
        at: '2026-10-09T08:00:00.000Z',
        channel: '畅谈',
        ref: { session: 'TALK', lines: [3, 5] },
        unverified: true,
      },
      {
        id: 'imp-2',
        at: '2026-10-09T09:00:00.000Z',
        channel: '笔记',
        ref: { note: 'note-线代' },
        unverified: true,
      },
    ] as unknown as ImportsArg;
    const rows = importRows(imports);
    expect(
      rows.map((r) => r.id),
      '最新的在前',
    ).toEqual(['imp-2', 'imp-1']);
    expect(
      rows.every((r) => r.unverified === '未验证'),
      '都标“未验证”',
    ).toBe(true);
    expect(rows[1]).toMatchObject({
      channel: '谈方向时你说的',
      jump: { sessionId: 'TALK', lines: [3, 5] },
      time: shortTime('2026-10-09T08:00:00.000Z'),
    });
    expect(rows[0]).toMatchObject({ channel: '你的笔记', note: 'note-线代' });
    expect(rows[0]?.jump, '笔记导入没有对话可跳').toBeUndefined();
  });
});
