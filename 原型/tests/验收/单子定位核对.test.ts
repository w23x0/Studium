// 测：交卡时程序核对——缺路线决定、必填项空、ref / basis / at 定位不了，工具报错让模型重交，什么都不记；
// 改好后重交被收下；“从哪来”（sources）定位不了的照存、依据视图标查不到。
// 依据：docs/设计/记录/单子与路线.md「路线决定与理由」（理由必标行号、须可回查）「单子」（对资料核的结果）；工单 README §2.2。
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import type { FakeContext, FakeStep } from '../../src/core/model/fake.ts';
import { getJson } from '../helpers/http.ts';
import {
  BOOK_LINE,
  requestCard,
  navSessionIds,
  requestCardAndWaitNav,
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

const LOST = '查不到的地方:12';

/** 一次交卡的参数；over 覆盖顶层，opt 覆盖第一个选项。 */
function card(
  mainId: string,
  over: Record<string, unknown> = {},
  opt: Record<string, unknown> = {},
) {
  return {
    name: 'submit_choice_card',
    args: {
      options: [textOption(mainId, opt), textOption(mainId, { title: '另一条' })],
      recommended: 0,
      route_decision: routeDecision(mainId),
      ...over,
    },
  };
}

function badCalls(mainId: string) {
  return [
    // 1 缺路线决定
    card(mainId, { route_decision: undefined }),
    // 2 路线决定的依据定位不了（书库里没有这本书）
    card(mainId, {
      route_decision: { ...routeDecision(mainId), basis: ['不存在的书/x.md:1'] },
    }),
    // 3 路线决定的依据指向会话里不存在的行
    card(mainId, {
      route_decision: { ...routeDecision(mainId), basis: [`${mainId}:9999`] },
    }),
    // 4 出发点的 ref 定位不了
    card(
      mainId,
      {},
      { start_points: [{ point: '位置', source: '学过的记录', ref: `${mainId}:9999` }] },
    ),
    // 5 对资料核的出处 at 超出文件末尾
    card(
      mainId,
      {},
      { source_check: [{ claim: '书里讲了位移', at: '力学入门样例/ch01/sec-1.1.md:500' }] },
    ),
    // 6 新点是空的
    card(mainId, {}, { new_point: '  ' }),
    // 7 出发点来源不在三种里
    card(mainId, {}, { start_points: [{ point: '位置', source: 'M09' }] }),
    // 8 路线决定的理由是空的
    card(mainId, { route_decision: { ...routeDecision(mainId), reason: '' } }),
    // 9 “从哪来”一条都没有
    card(mainId, {}, { sources: [] }),
  ];
}

function cardCalls(rs: Row[]): Row[] {
  return rs.filter((r) => r.record.type === 'tool_call' && r.record.name === 'submit_choice_card');
}

describe('交卡时的核对', () => {
  it('每一种不合格都报错、什么都不记；同一轮里改好重交就收下，只记一条路线决定和一张卡', async () => {
    const { app, model, mainId } = await startApp(
      (ctx: FakeContext, id: string): FakeStep | undefined =>
        roleOf(ctx) === 'nav' && ctx.input.role === 'program'
          ? { calls: [...badCalls(id), card(id, {}, { sources: ['导航现场说出', LOST] })] }
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
    expect(String(calls[1]?.record.result), '报错说清是哪条依据定位不了').toContain(
      '不存在的书/x.md:1',
    );
    expect(String(calls[3]?.record.result), '报错说清是哪条 ref 定位不了').toContain(
      `${mainId}:9999`,
    );
    const main = await rows(app, mainId);
    expect(
      main.filter((r) => r.record.type === 'route_decision'),
      '只记合格那次的路线决定',
    ).toHaveLength(1);
    expect(
      main.filter((r) => r.record.type === 'choice_card'),
      '只记合格那次的卡',
    ).toHaveLength(1);
  });

  it('“从哪来”定位不了的照存，依据视图里标查不到；能定位的书里出处查得到原文', async () => {
    const { app, mainId } = await startApp((ctx: FakeContext, id: string): FakeStep | undefined =>
      roleOf(ctx) === 'nav' ? { calls: [card(id, {}, { sources: [LOST, BOOK_LINE] })] } : undefined,
    );
    apps.push(app);
    const c = await requestCard(app, mainId);
    const first = (c.record.options as { sources?: string[] }[])[0];
    expect(first?.sources, '照存').toEqual([LOST, BOOK_LINE]);
    const view = await getJson<{
      card: { options: { sources?: { raw: string; resolved: boolean }[] }[] };
    }>(app, `/cards/${c.record.cardId as string}`);
    const srcs = view.card.options[0]?.sources ?? [];
    expect(srcs.find((s) => s.raw === LOST)?.resolved, '查不到的标出来').toBe(false);
    expect(srcs.find((s) => s.raw === BOOK_LINE)?.resolved, '书里那一行查得到').toBe(true);
  });

  it('只交了不合格的卡：主对话里不出现路线决定和卡', async () => {
    const { app, model, mainId } = await startApp(
      (ctx: FakeContext, id: string): FakeStep | undefined =>
        roleOf(ctx) === 'nav' && ctx.input.role === 'program'
          ? { calls: [card(id, { route_decision: undefined })] }
          : undefined,
    );
    apps.push(app);
    const nav = await requestCardAndWaitNav(app, model, mainId);
    expect(cardCalls(nav)[0]?.record.isError, '缺路线决定应报错').toBe(true);
    const main = await rows(app, mainId);
    expect(main.some((r) => r.record.type === 'route_decision')).toBe(false);
    expect(main.some((r) => r.record.type === 'choice_card')).toBe(false);
  });
});
