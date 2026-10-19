// 验收（W1 新版，取代旧的同名测试）：跨领域选项（补习型 / 对比链接型）照留——导航在卡上填 cross_domain（kind + other_point 文字 +
// problem），程序只核三项非空、kind 是两种之一；不再按书的学科目录算领域、不再按以前的记录核学没学过（交导航现场判断）。
// 单子存这三项；选中后学习对话开场写明类型、另一边、原问题。依据：docs/设计/会话/导航.md「跨领域：补习型 / 对比链接型」；工单 README §2.1。
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import type { FakeContext, FakeStep } from '../../src/core/model/fake.ts';
import {
  choose,
  navSessionIds,
  openingOf,
  requestCard,
  roleOf,
  routeDecision,
  rows,
  settled,
  startApp,
  textOption,
  type Row,
} from './共用/w1-flow.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

/** 补习型：原问题在物理（力的叠加），缺线性代数里的线性组合。 */
const TUTOR = {
  new_point: '线性组合：几个向量各乘一个数再相加',
  clause: '从“向量能相加、能数乘”出发，把两种运算合起来，得到线性组合',
  start_points: [{ point: '向量的加法与数乘', source: '假定' }],
  route_action: '补前置',
  title: '先补一点线性组合',
  reason: '想弄懂合力为什么能叠加，要先会线性组合',
  sources: ['学习者在学习对话里问的'],
  cross_domain: {
    kind: '补习型',
    other_point: '力的叠加：几个力的合力等于各力矢量相加',
    problem: '想弄懂合力为什么能叠加',
  },
};

/** 对比链接型：另一边是同一学科里的点也照收（程序不再算领域）。 */
const COMPARE = {
  ...TUTOR,
  route_action: '继续主线',
  title: '把线性组合和力的叠加对着看',
  reason: '对照着看叠加',
  cross_domain: {
    kind: '对比链接型',
    other_point: '位移的合成',
    problem: '想弄明白叠加的共同结构',
  },
};

function cardCall(mainId: string, ...options: object[]) {
  return {
    name: 'submit_choice_card',
    args: {
      options: [...options, textOption(mainId)],
      recommended: 0,
      route_decision: routeDecision(mainId),
    },
  };
}

function cardCalls(rs: Row[]): Row[] {
  return rs.filter((r) => r.record.type === 'tool_call' && r.record.name === 'submit_choice_card');
}

describe('验收：跨领域选项', () => {
  it('补习型、对比链接型都照收：单子只存 kind / otherPoint / problem，不算领域、不核学没学过', async () => {
    const { app, model, mainId } = await startApp((ctx: FakeContext, id: string) =>
      roleOf(ctx) === 'nav' ? { calls: [cardCall(id, TUTOR, COMPARE)] } : undefined,
    );
    apps.push(app);
    const card = await requestCard(app, mainId);
    const options = card.record.options as { ticket: Record<string, unknown> }[];
    expect(options[0]?.ticket.crossDomain, '补习型只存三项').toEqual({
      kind: '补习型',
      otherPoint: '力的叠加：几个力的合力等于各力矢量相加',
      problem: '想弄懂合力为什么能叠加',
    });
    expect(
      options[1]?.ticket.crossDomain,
      '对比链接型照收（学习者从没学过另一边也不退回）',
    ).toEqual({ kind: '对比链接型', otherPoint: '位移的合成', problem: '想弄明白叠加的共同结构' });
    expect(options[2]?.ticket.crossDomain, '普通选项没有跨领域').toBeUndefined();
    const navId = navSessionIds(model)[0] ?? '';
    const tools = model.opened.find((s) => s.session?.id === navId)?.tools.map((t) => t.name);
    expect(tools, '导航不再有找跨领域候选的工具').not.toContain('cross_candidates');
    expect(openingOf(model, navId), '导航开场不再由程序列“资料涉及的领域”').not.toContain(
      '资料涉及的领域',
    );
  });

  it('cross_domain 不合规矩的退回：kind 不是两种之一、另一边或原问题是空的；改好重交收下', async () => {
    const bad = [
      { ...TUTOR, cross_domain: { ...TUTOR.cross_domain, kind: '随便型' } },
      { ...TUTOR, cross_domain: { ...TUTOR.cross_domain, other_point: ' ' } },
      { ...TUTOR, cross_domain: { ...TUTOR.cross_domain, problem: '' } },
    ];
    const { app, model, mainId } = await startApp(
      (ctx: FakeContext, id: string): FakeStep | undefined =>
        roleOf(ctx) === 'nav' && ctx.input.role === 'program'
          ? { calls: [...bad.map((o) => cardCall(id, o)), cardCall(id, TUTOR)] }
          : undefined,
    );
    apps.push(app);
    await requestCard(app, mainId);
    const calls = cardCalls(await rows(app, navSessionIds(model)[0] ?? ''));
    expect(
      calls.map((c) => c.record.isError),
      '三次不合规矩的退回，最后一次收下',
    ).toEqual([true, true, true, false]);
  });

  it('选了补习型：单子带跨领域三项，学习对话开场写明类型、另一边、原问题', async () => {
    const { app, model, mainId } = await startApp((ctx: FakeContext, id: string) =>
      roleOf(ctx) === 'nav' ? { calls: [cardCall(id, TUTOR)] } : undefined,
    );
    apps.push(app);
    const card = await requestCard(app, mainId);
    const r = await choose(app, card.record.cardId as string, 0);
    expect(r.status, '补习型能开学习').toBe(201);
    const loopId = r.loopSessionId ?? '';
    await settled(app, loopId);
    const opened = (await rows(app, loopId))[0]?.record;
    expect((opened?.ticket as { crossDomain?: unknown } | undefined)?.crossDomain).toEqual({
      kind: '补习型',
      otherPoint: '力的叠加：几个力的合力等于各力矢量相加',
      problem: '想弄懂合力为什么能叠加',
    });
    const opening = openingOf(model, loopId);
    expect(opening, '开场写明类型').toContain('补习型');
    expect(opening, '开场写明另一边').toContain('力的叠加：几个力的合力等于各力矢量相加');
    expect(opening, '开场写明原问题').toContain('想弄懂合力为什么能叠加');
  });
});
