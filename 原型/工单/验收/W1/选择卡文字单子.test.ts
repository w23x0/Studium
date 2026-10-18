// 测：选择卡收文字单子并原样存进 choice_card；选中后开学习，单子在 session_opened.ticket 里是文字，开场写的是单子文字；
// 资料里没有的新点照样能开（不再对知识点编号核）；跨领域只存 kind / other_point / problem（程序不算领域、不核学没学过）。
// 依据：docs/设计/记录/单子与路线.md「单子」「选择卡」；会话/导航.md「选择卡」「跨领域」；工单 README §2.1 §2.2。
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import type { FakeContext, FakeStep } from '../../src/core/model/fake.ts';
import {
  BOOK_LINE,
  choose,
  openingOf,
  requestCard,
  roleOf,
  routeDecision,
  rows,
  settled,
  startApp,
  textOption,
} from './共用/w1-flow.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

const CROSS = {
  new_point: '向量的点积：对应分量相乘再相加，等于两向量长度乘夹角余弦',
  clause: '从“力有方向”和“位移有方向”出发，把力沿位移方向的分量乘位移，写成点积',
  start_points: [{ point: '力是有方向的量', source: '自述' }],
  route_action: '补前置',
  title: '先补一点向量点积',
  reason: '你想算斜面上的功，要用到它',
  sources: ['学习者在畅谈里问的'],
  cross_domain: {
    kind: '补习型',
    other_point: '功：力沿位移方向的分量乘位移',
    problem: '学习者想算斜面上拉力做的功',
  },
};

function responder(ctx: FakeContext, mainId: string): FakeStep | undefined {
  if (roleOf(ctx) !== 'nav') return undefined;
  return {
    calls: [
      {
        name: 'submit_choice_card',
        args: {
          options: [textOption(mainId), CROSS],
          recommended: 0,
          route_decision: routeDecision(mainId),
        },
      },
    ],
  };
}

describe('选择卡与单子是文字', () => {
  it('choice_card 原样存文字单子：出发点带来源与依据，对资料核的结果带出处或“模型补的”；跨领域只存三项', async () => {
    const { app, mainId } = await startApp(responder);
    apps.push(app);
    const card = await requestCard(app, mainId);
    const options = card.record.options as {
      ticket: Record<string, unknown>;
      sources?: string[];
    }[];
    expect(options[0]?.ticket, '第一项的单子应原样存成文字').toEqual({
      newPoint: '位移：一段时间内位置的变化量，只看起点和终点',
      clause: '从“用坐标 x 表示位置”出发，两个时刻的坐标相减，得到带正负的位移',
      startPoints: [
        { point: '直线上用坐标 x 表示位置', source: '学过的记录', ref: `${mainId}:1` },
        { point: '减法结果的正负', source: '假定' },
      ],
      routeAction: '继续主线',
      sourceCheck: [
        { claim: '书里把位置的变化量叫位移', at: BOOK_LINE },
        { claim: '位移和路程的区别最好用来回走的例子讲', modelAdded: true },
      ],
    });
    expect(options[0]?.sources, '“从哪来”原样存').toEqual(['导航现场说出', BOOK_LINE]);
    expect(
      options[1]?.ticket.crossDomain,
      '跨领域只存 kind / otherPoint / problem，不算领域',
    ).toEqual({
      kind: '补习型',
      otherPoint: '功：力沿位移方向的分量乘位移',
      problem: '学习者想算斜面上拉力做的功',
    });
    expect(options[1]?.ticket.sourceCheck, '没给 source_check 时存空数组').toEqual([]);
  });

  it('资料里没有的新点照样能选：开出学习，session_opened.ticket 就是卡上那张文字单子', async () => {
    const { app, mainId } = await startApp(responder);
    apps.push(app);
    const card = await requestCard(app, mainId);
    const r = await choose(app, card.record.cardId as string, 1);
    expect(r.status, '选“向量点积”这一项应能开学习（不再按知识点编号核单子）').toBe(201);
    const loopId = r.loopSessionId ?? '';
    const opened = (await rows(app, loopId))[0]?.record;
    const stored = (card.record.options as { ticket: unknown }[])[1]?.ticket;
    expect(opened?.type).toBe('session_opened');
    expect(opened?.ticket, '学习的 session_opened.ticket 应与卡上那张单子相同').toEqual(stored);
    expect((opened?.ticket as { newPoint?: unknown }).newPoint, '新点是文字').toBe(CROSS.new_point);
  });

  it('学习对话开场写的是单子文字：新点、预期理解、出发点与来源、对资料核的结果；不再出现知识点编号库', async () => {
    const { app, model, mainId } = await startApp(responder);
    apps.push(app);
    const card = await requestCard(app, mainId);
    const r = await choose(app, card.record.cardId as string, 0);
    expect(r.status, '选第一项应能开学习').toBe(201);
    const loopId = r.loopSessionId ?? '';
    await settled(app, loopId);
    const opening = openingOf(model, loopId);
    expect(opening, '开场有新点原文').toContain('位移：一段时间内位置的变化量，只看起点和终点');
    expect(opening, '开场有预期理解').toContain('两个时刻的坐标相减');
    expect(opening, '开场有出发点').toContain('直线上用坐标 x 表示位置');
    expect(opening, '出发点注来源').toContain('学过的记录');
    expect(opening, '开场有对资料核的结果及出处').toContain(BOOK_LINE);
    expect(opening, '资料里没有的标“模型补的”').toContain('模型补的');
    expect(opening, '开场不再提知识点编号库').not.toContain('M08');
    expect(opening, '开场不再给阈值提醒').not.toContain('阈值概念');
  });
});
