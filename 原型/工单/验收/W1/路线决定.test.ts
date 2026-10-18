// 测：每次出卡先在项目主对话里写一条 route_decision，紧接着写 choice_card；第二次出卡的 route_decision.supersedes
// 指第一条所在行，旧行不改。依据：docs/设计/记录/单子与路线.md「路线决定与理由」「怎么改 / 不能改」；工单 README §2.3。
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import type { FakeContext, FakeStep } from '../../src/core/model/fake.ts';
import {
  BOOK_LINE,
  choose,
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

const DECISIONS = ['维持主线：先学位移', '改线：先补平均速度的前置'];

function responder() {
  let n = 0;
  return (ctx: FakeContext, mainId: string): FakeStep | undefined => {
    if (roleOf(ctx) !== 'nav' || ctx.input.role !== 'program') return undefined;
    const decision = DECISIONS[Math.min(n, DECISIONS.length - 1)] ?? '';
    n++;
    return {
      calls: [
        {
          name: 'submit_choice_card',
          args: {
            options: [textOption(mainId), textOption(mainId, { title: '换个顺序' })],
            recommended: 0,
            route_decision: routeDecision(mainId, decision),
          },
        },
      ],
    };
  };
}

function decisions(rs: Row[]): Row[] {
  return rs.filter((r) => r.record.type === 'route_decision');
}

describe('路线决定', () => {
  it('出卡前写一条 route_decision（导航会话、触发原因、决定、理由、依据），紧接着就是 choice_card', async () => {
    const { app, model, mainId } = await startApp(responder());
    apps.push(app);
    const card = await requestCard(app, mainId);
    const main = await rows(app, mainId);
    const ds = decisions(main);
    expect(ds, '主对话里应有且只有一条路线决定').toHaveLength(1);
    const d = ds[0];
    expect(d?.line, 'choice_card 紧跟在 route_decision 后一行').toBe(card.line - 1);
    expect(d?.record, '路线决定的内容').toMatchObject({
      type: 'route_decision',
      navSessionId: navSessionIds(model)[0],
      trigger: card.record.trigger,
      decision: DECISIONS[0],
      reason: '项目刚开始，从最近的一步走起',
      basis: [`${mainId}:1`, BOOK_LINE],
    });
    expect(typeof d?.record.at, '有时间').toBe('string');
    expect(d?.record.supersedes, '第一条不取代谁').toBeUndefined();
  });

  it('第二次出卡：新的 route_decision 的 supersedes 指第一条所在行，第一条原样不动', async () => {
    const { app, mainId } = await startApp(responder());
    apps.push(app);
    const first = await requestCard(app, mainId);
    const before = decisions(await rows(app, mainId))[0];
    expect((await choose(app, first.record.cardId as string, 0)).status).toBe(201);
    const second = await requestCard(app, mainId);
    const ds = decisions(await rows(app, mainId));
    expect(ds, '两次出卡两条路线决定').toHaveLength(2);
    expect(ds[0], '旧的那条不改').toEqual(before);
    expect(ds[1]?.line, '第二条紧挨第二张卡').toBe(second.line - 1);
    expect(ds[1]?.record.decision).toBe(DECISIONS[1]);
    expect(ds[1]?.record.supersedes, '第二条取代第一条（指它的行号）').toBe(before?.line);
  });
});
