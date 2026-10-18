// 验收（W2）：复习 / 复检的单子指回以前那次学习（docs/设计/会话/导航.md「二级功能」复习、复检；
// 记录/学过的记录.md「时间与版本」复检；工单 README §2.1 revisit）。卡工具参数 revisit: { kind, of_loop, verdict_line? }，
// 单子存 { kind, ofLoop, verdictLine? }；程序核对 of_loop 是一次已结束的学习、verdict_line 是那次里的一份判定，不对就退回。
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import { post, records, TOKEN } from '../helpers/http.ts';
import {
  ROUTE_DECISION,
  boot,
  cardAfter,
  chooseCard,
  lastLine,
  learnAndClose,
  navOf,
  newFlow,
  openLoop,
  option,
  type Loose,
} from './共用/w2-flow.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

function card(revisit: Loose): { name: string; args: Loose } {
  return {
    name: 'submit_choice_card',
    args: {
      options: [
        option('位移', { route_action: '复检', title: '回头看看位移', revisit }),
        option('平均速度'),
      ],
      recommended: 0,
      route_decision: ROUTE_DECISION,
    },
  };
}

describe('复检指回以前那次学习', () => {
  it('of_loop 不是已结束的学习 / verdict_line 不是判定：退回；指对了才出卡，单子带 revisit', async () => {
    const flow = newFlow();
    const target = { a: '', b: '', verdictLine: 0, on: false };
    flow.navCalls = () =>
      target.on
        ? [
            card({ kind: '复检', of_loop: 'nope' }),
            card({ kind: '复检', of_loop: target.b }),
            card({ kind: '复检', of_loop: target.a, verdict_line: 1 }),
            card({ kind: '复检', of_loop: target.a, verdict_line: target.verdictLine }),
          ]
        : [
            {
              name: 'submit_choice_card',
              args: {
                options: [option('位移'), option('平均速度')],
                recommended: 0,
                route_decision: ROUTE_DECISION,
              },
            },
          ];
    const { app, mainId } = await boot(flow);
    apps.push(app);

    // A：合上；B：开着没结束
    target.a = await openLoop(app, mainId, flow, 0);
    await learnAndClose(app, target.a, flow);
    target.verdictLine =
      (await records(app, target.a)).filter((r) => r.record.type === 'guard_verdict').at(-1)
        ?.line ?? 0;
    target.b = await openLoop(app, mainId, flow, 1);

    // 这次出卡：前三次提交都该被退回，第四次收下
    target.on = true;
    const mark = await lastLine(app, mainId);
    await post(app, '/cards/request', { projectId: mainId });
    const cardId = await cardAfter(app, mainId, mark);
    const cardRec = (await records(app, mainId))
      .map((r) => r.record as unknown as Loose)
      .find((r) => r.type === 'choice_card' && r.cardId === cardId);
    const navId = navOf(cardRec);
    const rejected = (await records(app, navId))
      .map((r) => r.record as unknown as Loose)
      .filter(
        (r) => r.type === 'tool_call' && r.name === 'submit_choice_card' && r.isError === true,
      );
    expect(
      rejected.length,
      'of_loop 不存在、of_loop 还没结束、verdict_line 不是判定行：三次都退回',
    ).toBe(3);
    const options = cardRec?.options as { ticket: Loose }[];
    expect(options[0]?.ticket.revisit, '单子上的 revisit 指回 A 与它的判定行').toEqual({
      kind: '复检',
      ofLoop: target.a,
      verdictLine: target.verdictLine,
    });
    expect(options[1]?.ticket.revisit, '学新点的那项不带 revisit').toBeUndefined();

    // 选它：新学习的单子带同一个 revisit；学过的记录里也看得到
    flow.navCalls = undefined;
    target.on = false;
    const c = await chooseCard(app, cardId, flow, 0);
    const opened = (await records(app, c))[0]?.record as unknown as Loose;
    expect((opened.ticket as Loose).revisit, '复检那次学习的单子指回以前那次学习').toEqual({
      kind: '复检',
      ofLoop: target.a,
      verdictLine: target.verdictLine,
    });
    const res = await fetch(`${app.server.url}/api/learned/${c}`, {
      headers: { authorization: `Bearer ${TOKEN}` },
    });
    expect(res.status, '学过的记录能查到这次复检').toBe(200);
    const learning = ((await res.json()) as { learning: Loose }).learning;
    expect((learning.ticket as Loose).revisit, '上层单子带 revisit').toMatchObject({
      kind: '复检',
      ofLoop: target.a,
    });
  });

  it('复习可以不给 verdict_line；指向没合上就结束的那次也收（已结束即可）', async () => {
    const flow = newFlow();
    const target = { a: '', on: false };
    flow.navCalls = () =>
      target.on
        ? [card({ kind: '复习', of_loop: target.a })]
        : [
            {
              name: 'submit_choice_card',
              args: {
                options: [option('位移'), option('平均速度')],
                recommended: 0,
                route_decision: ROUTE_DECISION,
              },
            },
          ];
    const { app, mainId } = await boot(flow);
    apps.push(app);
    target.a = await openLoop(app, mainId, flow, 0);
    expect((await post(app, `/sessions/${target.a}/end`, { note: '先到这' })).status).toBe(202);
    await app.studium.settled();

    target.on = true;
    const mark = await lastLine(app, mainId);
    await post(app, '/cards/request', { projectId: mainId });
    const cardId = await cardAfter(app, mainId, mark);
    const cardRec = (await records(app, mainId))
      .map((r) => r.record as unknown as Loose)
      .find((r) => r.type === 'choice_card' && r.cardId === cardId);
    const options = cardRec?.options as { ticket: Loose }[];
    expect(options[0]?.ticket.revisit, '复习只指回那次学习').toEqual({
      kind: '复习',
      ofLoop: target.a,
    });
  });
});
