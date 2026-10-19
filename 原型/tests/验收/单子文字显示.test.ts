// 验收（W6，界面纯函数）：依据面板与“我学会的”里的单子按文字显示（docs/设计/记录/单子与路线.md「单子」；
// 00-定位与原则.md §7 横切 5）：新点、预期理解、出发点（各注来源）、对资料核的结果（出处可点开原文，资料里没有的标“模型补的”）、
// 路线动作与回看 / 补前置 / 接着学；给学习者看的栏名不露内部词。模块 src/ui/ticket-model.ts（W6 新建）。
import { describe, expect, it } from 'vitest';
import { refLink, ticketRows } from '../../src/ui/ticket-model.ts';

type TicketArg = Parameters<typeof ticketRows>[0];
type RefsArg = NonNullable<Parameters<typeof ticketRows>[1]>;
type SourceArg = Parameters<typeof refLink>[0];

const BOOK = '力学入门样例/ch01/sec-1.1.md:5';
const LOOP_REF = '20261018-0900-main-abc123:4';

const ticket = {
  newPoint: '位移：一段时间里位置的变化量，只看起点和终点',
  clause: '从坐标相减出发，看出位移带正负',
  startPoints: [
    { point: '直线上用坐标表示位置', source: '学过的记录', ref: LOOP_REF },
    { point: '减法结果的正负', source: '自述' },
    { point: '正方向可以自己选', source: '假定' },
  ],
  routeAction: '继续主线',
  sourceCheck: [
    { claim: '书里把位置的变化量叫位移', at: BOOK },
    { claim: '位移和路程的区别用来回走的例子讲', modelAdded: true },
    { claim: '书里有一道来回走的例题', at: '力学入门样例/ch01/sec-9.9.md:1' },
  ],
} as unknown as TicketArg;

const refs = [
  {
    raw: BOOK,
    kind: 'book_line',
    resolved: true,
    label: '书里《力学入门样例》 §1.1 第 5 行',
    book: '力学入门样例',
    file: 'ch01/sec-1.1.md',
    from: 5,
    to: 5,
  },
  {
    raw: LOOP_REF,
    kind: 'loop_line',
    resolved: true,
    label: '对话第 4 行',
    sessionId: '20261018-0900-main-abc123',
    line: 4,
  },
  {
    raw: '力学入门样例/ch01/sec-9.9.md:1',
    kind: 'book_line',
    resolved: false,
    label: '书里 力学入门样例/ch01/sec-9.9.md 第 1 行（这本书里没有这个文件）',
  },
] as unknown as RefsArg;

const INTERNAL = [
  '闭环',
  '选择卡',
  '守卫',
  '出发点',
  '子句',
  '新点',
  '单子',
  'M0',
  'M1',
  'p-',
  'c-',
];

describe('单子按文字显示', () => {
  it('按 新点 · 预期理解 · 出发点 · 对资料核 · 路线动作 的顺序列出，文字原样', () => {
    const rows = ticketRows(ticket);
    expect(
      rows.map((r) => r.kind),
      '行的顺序',
    ).toEqual([
      'newPoint',
      'clause',
      'startPoint',
      'startPoint',
      'startPoint',
      'sourceCheck',
      'sourceCheck',
      'sourceCheck',
      'routeAction',
    ]);
    expect(rows[0]?.text, '新点原样').toBe('位移：一段时间里位置的变化量，只看起点和终点');
    expect(rows[1]?.text, '预期理解原样').toBe('从坐标相减出发，看出位移带正负');
    expect(rows[8]?.text, '路线动作原样').toBe('继续主线');
  });

  it('出发点各注来源；资料里没有的标“模型补的”', () => {
    const rows = ticketRows(ticket);
    const starts = rows.filter((r) => r.kind === 'startPoint');
    expect(
      starts.map((r) => [r.text, r.note]),
      '出发点的来源用日常话',
    ).toEqual([
      ['直线上用坐标表示位置', '你之前学过的'],
      ['减法结果的正负', '你自己说会的'],
      ['正方向可以自己选', '先假定你会的'],
    ]);
    expect(starts[0]?.ref, '出发点的依据原样带着').toBe(LOOP_REF);
    const added = rows.find((r) => r.kind === 'sourceCheck' && r.modelAdded === true);
    expect(added?.text).toBe('位移和路程的区别用来回走的例子讲');
    expect(added?.note ?? '', '资料里没有的标“模型补的”').toContain('模型补的');
    expect(added?.link, '模型补的没有出处可点').toBeUndefined();
  });

  it('给了回查结果：书里的出处点开原文，对话行跳回那一句，查不到的写明', () => {
    const rows = ticketRows(ticket, refs);
    const book = rows.find((r) => r.kind === 'sourceCheck' && r.ref === BOOK);
    expect(book?.link, '书里那一行在面板里打开原文').toEqual({
      kind: 'panel',
      target: { kind: 'source', book: '力学入门样例', file: 'ch01/sec-1.1.md', from: 5, to: 5 },
    });
    const start = rows.find((r) => r.kind === 'startPoint' && r.ref === LOOP_REF);
    expect(start?.link, '对话里那一行跳过去').toEqual({
      kind: 'jump',
      sessionId: '20261018-0900-main-abc123',
      lines: [4],
    });
    const lost = rows.find((r) => r.ref === '力学入门样例/ch01/sec-9.9.md:1');
    expect(lost?.link, '查不到的不给链接').toBeUndefined();
    expect(lost?.note, '查不到的写明').toBe('查不到原文');
    expect(ticketRows(ticket).find((r) => r.ref === BOOK)?.link, '没给回查结果就不给链接').toBe(
      undefined,
    );
  });

  it('复检 / 补前置 / 接着学 / 阶段验收各一行，指回的那次学习可点开', () => {
    const more = {
      ...(ticket as unknown as Record<string, unknown>),
      revisit: { kind: '复检', ofLoop: 'L-old', verdictLine: 12 },
      returnTo: 'L-main',
      resumeOf: 'L-park',
      stageCheck: true,
    } as unknown as TicketArg;
    const rows = ticketRows(more);
    expect(rows.find((r) => r.kind === 'revisit')?.link, '复检指回以前那次学习的判定').toEqual({
      kind: 'panel',
      target: { kind: 'loop', loopId: 'L-old', verdictLine: 12 },
    });
    expect(rows.find((r) => r.kind === 'returnTo')?.link, '补前置学完回到哪次').toEqual({
      kind: 'panel',
      target: { kind: 'loop', loopId: 'L-main' },
    });
    expect(rows.find((r) => r.kind === 'resumeOf')?.link, '接着学哪次').toEqual({
      kind: 'panel',
      target: { kind: 'loop', loopId: 'L-park' },
    });
    expect(
      rows.some((r) => r.kind === 'stageCheck'),
      '阶段验收一行',
    ).toBe(true);
    expect(rows.find((r) => r.kind === 'revisit')?.text, '写明是复检').toContain('复检');
  });

  it('栏名与说明不露内部词', () => {
    const more = {
      ...(ticket as unknown as Record<string, unknown>),
      revisit: { kind: '复习', ofLoop: 'L-old' },
      returnTo: 'L-main',
      resumeOf: 'L-park',
      stageCheck: true,
    } as unknown as TicketArg;
    const shown = ticketRows(more, refs).flatMap((r) => [r.label, r.note ?? '']);
    expect(shown.every((s) => typeof s === 'string')).toBe(true);
    expect(
      ticketRows(more).every((r) => r.label.trim() !== ''),
      '每行都有栏名',
    ).toBe(true);
    expect(shown.filter((s) => INTERNAL.some((w) => s.includes(w)))).toEqual([]);
  });

  it('refLink：书里查到的 → 面板原文；对话行 → 跳转；其余没有链接', () => {
    expect(refLink(refs[0] as SourceArg)?.kind).toBe('panel');
    expect(refLink(refs[1] as SourceArg)?.kind).toBe('jump');
    expect(refLink(refs[2] as SourceArg)).toBeUndefined();
    expect(
      refLink({ raw: 'x', kind: 'unknown', resolved: false, label: 'x' } as unknown as SourceArg),
    ).toBeUndefined();
  });
});
