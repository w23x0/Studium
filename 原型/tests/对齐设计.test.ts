// 对齐已定设计的几处（假模型）：记录里存实际执行模型 · 选择卡出处 · 畅谈结束后整理状态。
import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp, type App } from '../src/core/app.ts';
import { FakeModel, type FakeContext, type FakeStep } from '../src/core/model/fake.ts';
import type { ModelAdapter } from '../src/core/model/port.ts';
import { GOAL, goalTalkResponder } from './helpers/goal-talk.ts';
import { DISPLACEMENT_OPTION, learnerLine, navRoute, roleOf } from './helpers/roles.ts';
import { tempDir } from './helpers/tmp.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

const TOKEN = 'align-token-0123456789';
const OPTION_B = {
  ...DISPLACEMENT_OPTION,
  new_point: 'p-avg-velocity',
  clause: 'c-avgv-from-disp',
  start_points: [{ point: 'p-displacement', source: '假定' }],
  title: '平均速度',
};
const SOURCED = { ...DISPLACEMENT_OPTION, sources: ['p-displacement', 'c-disp-from-pos'] };
const SOURCED_B = { ...OPTION_B, sources: ['p-avg-velocity'] };

/** 交卡必带的路线决定（这里只过 schema，不查定位）。 */
const ROUTE = { decision: '维持主线', reason: '按推荐往下学', basis: ['main-1:1'] };

function responder() {
  return (ctx: FakeContext): FakeStep | undefined => {
    switch (roleOf(ctx)) {
      case 'nav':
        return {
          calls: [
            {
              name: 'submit_choice_card',
              args: {
                options: [SOURCED, SOURCED_B],
                recommended: 0,
                route_decision: navRoute(ctx),
              },
            },
          ],
        };
      case 'guard': {
        const line = learnerLine(ctx.input.text, '终点减起点');
        return {
          calls: [
            {
              name: 'submit_verdict',
              args: {
                closed: true,
                basis: `见 L${String(line)}`,
                evidence_lines: [line],
                understanding: [
                  {
                    text: '位移只看起点终点',
                    lines: [line],
                    independence: '独立',
                    durability: '仅当场',
                  },
                ],
              },
            },
          ],
        };
      }
      case 'loop':
        return ctx.input.text.includes('终点减起点')
          ? { calls: [{ name: 'request_close', args: { reason: '说清了' } }] }
          : { text: '你说说位移是什么？' };
      default:
        return goalTalkResponder(ctx);
    }
  };
}

async function runLoop(model: ModelAdapter) {
  const app = await createApp({ dataRoot: await tempDir(), model, token: TOKEN, port: 0 });
  apps.push(app);
  const { studium, hub } = app;
  const mainId = await studium.ensureMain();
  const card = await studium.requestCard('测试');
  const loopId = await studium.choose(card.cardId, 0);
  await hub.idle(loopId);
  await hub.send(loopId, { role: 'learner', text: '位移就是终点减起点' });
  await hub.idle(loopId);
  await studium.confirmClose(loopId, '确认');
  await studium.settled();
  return { app, mainId, card, loopId };
}

describe('记录里存实际执行的模型', () => {
  it('教法记录与守卫判定存模型自报的名字，不存适配器名', async () => {
    const { app, loopId } = await runLoop(new FakeModel({ responder: responder() }));
    const pedagogy = await readFile(
      join(app.dataDir.root, 'knowledge', 'pedagogy', 'records.jsonl'),
      'utf8',
    ).catch(() => '');
    expect(pedagogy).not.toContain('"model":"fake"');
    const verdict = (await app.hub.records(loopId)).find((r) => r.record.type === 'guard_verdict');
    expect(verdict?.record.type === 'guard_verdict' && verdict.record.model).toBe(
      FakeModel.MODEL_NAME,
    );
  });

  it('模型没报实际名字时，记适配器名并写明是兜底', async () => {
    const inner = new FakeModel({ responder: responder() });
    const silent: ModelAdapter = {
      name: inner.name,
      open: (spec) => {
        const c = inner.open(spec);
        return {
          ...c,
          send: async function* (input) {
            for await (const e of c.send(input)) {
              if (e.kind !== 'model') yield e;
            }
          },
        };
      },
    };
    const { app, loopId } = await runLoop(silent);
    const verdict = (await app.hub.records(loopId)).find((r) => r.record.type === 'guard_verdict');
    const model = verdict?.record.type === 'guard_verdict' ? verdict.record.model : '';
    expect(model).toContain('fake');
    expect(model).toContain('适配器名');
  });
});

describe('选择卡出处', () => {
  async function cardTool() {
    const model = new FakeModel({ responder: responder() });
    const app = await createApp({ dataRoot: await tempDir(), model, token: TOKEN, port: 0 });
    apps.push(app);
    await app.studium.requestCard('测试');
    const spec = model.opened.find((s) => s.session?.kind === 'nav');
    const tool = spec?.tools.find((t) => t.name === 'submit_choice_card');
    if (!tool) throw new Error('没有出卡工具');
    return { app, schema: z.object(tool.input) };
  }

  it('参数校验：2–4 项，每项必带非空出处', async () => {
    const { schema } = await cardTool();
    const ok = { options: [SOURCED, SOURCED_B], recommended: 0, route_decision: ROUTE };
    expect(schema.safeParse(ok).success).toBe(true);
    expect(schema.safeParse({ ...ok, options: [SOURCED] }).success).toBe(false);
    const five = Array.from({ length: 5 }, () => SOURCED);
    expect(schema.safeParse({ ...ok, options: five }).success).toBe(false);
    // 一项没有 sources 时整张卡不合格
    expect(
      schema.safeParse({ ...ok, options: [SOURCED, { ...SOURCED_B, sources: undefined }] }).success,
    ).toBe(false);
    expect(
      schema.safeParse({ ...ok, options: [SOURCED, { ...SOURCED_B, sources: [] }] }).success,
    ).toBe(false);
  });

  it('出处进正本里的选择卡；空白出处条目被退回', async () => {
    const { app } = await cardTool();
    const main = await app.hub.records(await app.studium.ensureMain());
    const card = main.map((r) => r.record).find((r) => r.type === 'choice_card');
    expect(card?.type === 'choice_card' && card.options.map((o) => o.sources)).toEqual([
      ['p-displacement', 'c-disp-from-pos'],
      ['p-avg-velocity'],
    ]);

    const model = new FakeModel({
      responder: (ctx) =>
        roleOf(ctx) === 'nav'
          ? {
              calls: [
                {
                  name: 'submit_choice_card',
                  args: {
                    options: [SOURCED, { ...SOURCED_B, sources: ['  '] }],
                    recommended: 0,
                    route_decision: ROUTE,
                  },
                },
              ],
            }
          : undefined,
    });
    const bad = await createApp({ dataRoot: await tempDir(), model, token: TOKEN, port: 0 });
    apps.push(bad);
    await expect(bad.studium.requestCard('测试')).rejects.toThrow();
  });
});

describe('畅谈结束后整理状态', () => {
  it('畅谈交回方向后，后台开状态整理（挂在畅谈对话下）', async () => {
    const model = new FakeModel({ responder: responder() });
    const app = await createApp({ dataRoot: await tempDir(), model, token: TOKEN, port: 0 });
    apps.push(app);
    const mainId = await app.studium.ensureMain();
    await app.hub.send(mainId, { role: 'learner', text: '我想学力学' });
    await app.hub.idle(mainId);
    const talk = app.hub.listSessions().find((s) => s.kind === 'talk');
    if (!talk) throw new Error('没开畅谈对话');
    await app.hub.idle(talk.sessionId);
    await app.hub.send(talk.sessionId, { role: 'learner', text: '能自己推导就行' });
    await app.hub.idle(talk.sessionId);
    await app.studium.settled();
    const recs = (await app.hub.records(talk.sessionId)).map((r) => r.record);
    expect(recs.some((r) => r.type === 'talk_ended' && r.goal === GOAL)).toBe(true);
    const state = app.hub.listSessions().filter((s) => s.kind === 'state');
    expect(state.map((s) => s.parent)).toContain(talk.sessionId);
  });
});
