// 测（审查补的）：交卡核对里测试原先没盖住的三处——缺选项与推荐序号范围（选项数 2–4 由参数形状管，假模型不经它）；对资料核的出处 at 只认书里那一行；
// 依据视图对会话行的“查得到”与交卡用同一条定位规则（正本里有这一行就算，不管是不是消息）。
// 依据：工单 W1 §4.2（定位规则、核对表）、§4.3（basis 按 4.2 解析）；docs/设计/记录/单子与路线.md「路线决定与理由」。
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import type { FakeContext, FakeStep } from '../../src/core/model/fake.ts';
import { getJson } from '../helpers/http.ts';
import {
  navSessionIds,
  requestCard,
  roleOf,
  routeDecision,
  rows,
  startApp,
  textOption,
  type Row,
} from './共用/w1-flow.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

function card(mainId: string, over: Record<string, unknown> = {}) {
  return {
    name: 'submit_choice_card',
    args: {
      options: [textOption(mainId), textOption(mainId, { title: '另一条' })],
      recommended: 0,
      route_decision: routeDecision(mainId),
      ...over,
    },
  };
}

function badCalls(mainId: string) {
  return [
    // 1 缺 options
    card(mainId, { options: undefined }),
    // 2 推荐序号超出选项范围
    card(mainId, { recommended: 2 }),
    // 3 推荐序号是负数
    card(mainId, { recommended: -1 }),
    // 4 对资料核的出处指向会话行（能定位，但不是书里那一行）
    card(mainId, {
      options: [
        textOption(mainId, { source_check: [{ claim: '书里讲了位移', at: `${mainId}:1` }] }),
        textOption(mainId, { title: '另一条' }),
      ],
    }),
    // 5 书里第 0 行
    card(mainId, {
      route_decision: { ...routeDecision(mainId), basis: ['力学入门样例/ch01/sec-1.1.md:0'] },
    }),
  ];
}

function cardCalls(rs: Row[]): Row[] {
  return rs.filter((r) => r.record.type === 'tool_call' && r.record.name === 'submit_choice_card');
}

describe('交卡核对（审查补）', () => {
  it('缺选项、推荐序号、出处只认书里的行、行号从 1 数：不合格都报错，改好后收下', async () => {
    const { app, model, mainId } = await startApp(
      (ctx: FakeContext, id: string): FakeStep | undefined =>
        roleOf(ctx) === 'nav' && ctx.input.role === 'program'
          ? { calls: [...badCalls(id), card(id)] }
          : undefined,
    );
    apps.push(app);
    await requestCard(app, mainId);
    const navId = navSessionIds(model)[0] ?? '';
    const calls = cardCalls(await rows(app, navId));
    const bad = badCalls(mainId).length;
    expect(calls, '每次交卡都记一条工具调用').toHaveLength(bad + 1);
    for (const [i, r] of calls.slice(0, bad).entries()) {
      expect(r.record.isError, `第 ${String(i + 1)} 次不合格的交卡应报错`).toBe(true);
    }
    expect(calls[bad]?.record.isError, '改好后重交应被收下').toBe(false);
  });

  it('路线决定的依据指向会话里一条非消息的行：交卡收下，依据视图也标查得到', async () => {
    const { app, mainId } = await startApp((ctx: FakeContext, id: string): FakeStep | undefined =>
      roleOf(ctx) === 'nav' ? { calls: [card(id)] } : undefined,
    );
    apps.push(app);
    const c = await requestCard(app, mainId);
    const view = await getJson<{
      card: { routeDecision?: { basis: { raw: string; resolved: boolean }[] } };
    }>(app, `/cards/${c.record.cardId as string}`);
    const basis = view.card.routeDecision?.basis ?? [];
    expect(basis.find((b) => b.raw === `${mainId}:1`)?.resolved, '主对话第 1 行查得到').toBe(true);
  });
});
