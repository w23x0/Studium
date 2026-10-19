// 验收（W2）：学过的记录按层查（docs/设计/记录/学过的记录.md「分层」「谁从哪层读」；工单 README §2.5）。
// GET /api/learned?project= 与 GET /api/learned/:loopId：上层 = 单子（没合上的另带结束原话与导航当时的路线决定），
// 中层 = 通过的那份守卫判定（含实际理解、证据强度、模型）。主对话的 list_learned 改读这里。只经 HTTP，假模型。
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import { FakeModel } from '../../src/core/model/fake.ts';
import { call, post, records, TOKEN, waitFor } from '../helpers/http.ts';
import {
  ROUTE_DECISION,
  UNDERSTANDING,
  boot,
  endUnclosed,
  learnAndClose,
  learned,
  learningOf,
  navOf,
  newFlow,
  openLoop,
  say,
  settled,
  type Loose,
} from './共用/w2-flow.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

const END_NOTE = '今天先到这，平均速度我想换本书再看';

async function getLearning(app: App, loopId: string): Promise<Response> {
  return fetch(`${app.server.url}/api/learned/${encodeURIComponent(loopId)}`, {
    headers: { authorization: `Bearer ${TOKEN}` },
  });
}

describe('学过的记录按层查', () => {
  it('合上的一次带中层判定；没合上的一次带结束原话与路线决定；进行中的只有单子', async () => {
    const flow = newFlow();
    const { app, mainId } = await boot(flow);
    apps.push(app);

    // 第一次：合上
    const closedId = await openLoop(app, mainId, flow, 0);
    await learnAndClose(app, closedId, flow);
    const closedLine = flow.evidenceLine;
    const closedRecs = await records(app, closedId);
    const verdictLine =
      closedRecs.filter((r) => r.record.type === 'guard_verdict').at(-1)?.line ?? 0;

    // 第二次：没合上就结束（选上一张卡的第二项）
    const unclosedId = await openLoop(app, mainId, flow, 1);
    await say(app, unclosedId, flow);
    await endUnclosed(app, unclosedId, END_NOTE);
    // 没合上之后导航出的那张卡与路线决定
    const card = (await records(app, unclosedId))
      .map((r) => r.record as unknown as Loose)
      .find((r) => r.type === 'after_loop_step' && r.step === 'card_ready');
    const main = await records(app, mainId);
    const cardRec = main
      .map((r) => r.record as unknown as Loose)
      .find((r) => r.type === 'choice_card' && r.cardId === card?.detail);
    const rd = main.find(
      (r) =>
        (r.record as unknown as Loose).type === 'route_decision' &&
        (r.record as unknown as Loose).navSessionId === navOf(cardRec),
    );
    expect(rd, '没合上之后导航写了路线决定').toBeTruthy();

    // 第三次：进行中
    const openId = await openLoop(app, mainId, flow, 0);

    const body = await learned(app, mainId);
    expect(
      body.learnings.map((l) => l.loopId),
      '按开始时间列出这个项目的三次学习',
    ).toEqual([closedId, unclosedId, openId]);

    const c = learningOf(body, closedId);
    expect(c, '合上的那次：状态、单子、中层判定').toMatchObject({
      loopId: closedId,
      title: '位移',
      status: '合上',
      ticket: { newPoint: 'p-displacement', routeAction: '继续主线' },
      verdict: {
        line: verdictLine,
        closed: true,
        understanding: [
          {
            text: UNDERSTANDING,
            lines: [closedLine],
            independence: '独立',
            durability: '仅当场',
          },
        ],
        model: FakeModel.MODEL_NAME,
      },
    });
    expect(typeof c?.openedAt, '有开始时间').toBe('string');
    expect(typeof c?.endedAt, '有结束时间').toBe('string');
    expect(c?.endNote, '合上的那次没有结束原话这一栏').toBeUndefined();
    expect(c?.routeDecision, '合上的那次不带路线决定（上层只有单子）').toBeUndefined();

    const u = learningOf(body, unclosedId);
    expect(u, '没合上的那次：上层 = 单子 + 结束原话 + 导航当时的路线决定').toMatchObject({
      status: '没合上',
      title: '平均速度',
      ticket: { newPoint: 'p-avg-velocity' },
      endNote: END_NOTE,
      routeDecision: {
        line: rd?.line,
        decision: ROUTE_DECISION.decision,
        reason: ROUTE_DECISION.reason,
      },
    });
    expect(u?.verdict, '没合上的那次没有判定').toBeUndefined();

    const o = learningOf(body, openId);
    expect(o, '进行中的那次只有单子').toMatchObject({ status: '进行中' });
    expect(o?.endedAt, '进行中没有结束时间').toBeUndefined();
    expect(o?.verdict, '进行中没有中层').toBeUndefined();

    // 单次查询与列表里的那条一样
    const one = await getLearning(app, unclosedId);
    expect(one.status, 'GET /api/learned/:loopId 可用').toBe(200);
    expect(((await one.json()) as { learning: Loose }).learning, '单次查询与列表一致').toEqual(u);
    expect((await getLearning(app, mainId)).status, '不是一次学习：404').toBe(404);
    expect((await getLearning(app, 'nope')).status, '没有这个会话：404').toBe(404);

    // 不给项目也能查（按人，不按项目划界）；项目不存在 404
    const all = await learned(app);
    expect(
      all.learnings.map((l) => l.loopId),
      '不给项目时列出全部学习',
    ).toEqual(expect.arrayContaining([closedId, unclosedId, openId]));
    expect((await call(app, '/learned?project=nope')).status, '项目不存在：404').toBe(404);
    await settled(app, openId);
  });

  it('主对话的 list_learned 读学过的记录上 / 中层：列出每次学习、合上的理解与没合上的结束原话', async () => {
    const flow = newFlow();
    const { app, mainId } = await boot(flow);
    apps.push(app);
    const a = await openLoop(app, mainId, flow, 0);
    await learnAndClose(app, a, flow);
    const b = await openLoop(app, mainId, flow, 1);
    await endUnclosed(app, b, END_NOTE);

    const mark = (await records(app, mainId)).at(-1)?.line ?? 0;
    await post(app, `/sessions/${mainId}/messages`, { text: flow.askLearned });
    const result = await waitFor('list_learned 调过', async () => {
      const r = (await records(app, mainId))
        .filter((x) => x.line > mark)
        .map((x) => x.record as unknown as Loose)
        .find((x) => x.type === 'tool_call' && x.name === 'list_learned');
      return r === undefined ? undefined : String(r.result);
    });
    expect(result, '列出合上的那次').toContain(a);
    expect(result, '合上的那次带守卫写下的实际理解').toContain(UNDERSTANDING);
    expect(result, '列出没合上的那次').toContain(b);
    expect(result, '没合上的那次带结束原话').toContain(END_NOTE);
    expect(result, '不再提形成记录 / M09').not.toMatch(/M09|形成记录/);
  });
});
