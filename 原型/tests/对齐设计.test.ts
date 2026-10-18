// 对齐已定设计的几处（假模型）：记录里存实际执行模型 · M09 会话不给 M07 · 选择卡出处 ·
// 畅谈结束后整理状态 · M09 证据强度结构化。
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createApp, type App } from '../src/core/app.ts';
import type { FormationRecord } from '../src/core/knowledge/m09.ts';
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

const STRONG = { time: '含变式', independence: '独立' } as const;
const WEAK = { time: '仅当场', independence: '提示后' } as const;

function responder(opts: { m09Args?: (line: number) => Record<string, unknown> }) {
  return (ctx: FakeContext): FakeStep | undefined => {
    switch (roleOf(ctx)) {
      case 'm05':
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
              args: { closed: true, basis: `见 L${String(line)}`, evidence_lines: [line] },
            },
          ],
        };
      }
      case 'm09': {
        const line = learnerLine(ctx.input.text, '终点减起点');
        return {
          calls: [
            {
              name: 'write_formation_record',
              args: {
                new_point: 'p-displacement',
                clause: 'c-disp-from-pos',
                start_points: ['p-position'],
                understanding: '位移只看起点终点',
                process: '自己说',
                unmet: '',
                evidence_lines: [line],
                ...(opts.m09Args?.(line) ?? {}),
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
  const m09 = (await readFile(join(app.dataDir.root, 'knowledge', 'm09', 'records.jsonl'), 'utf8'))
    .split('\n')
    .filter((l) => l !== '')
    .map((l) => JSON.parse(l) as FormationRecord);
  return { app, mainId, card, loopId, m09 };
}

const structured = () => {
  return {
    new_point_evidence: STRONG,
    start_point_evidence: [{ point: 'p-position', ...WEAK }],
  };
};

describe('记录里存实际执行的模型', () => {
  it('M09 / M10 记录存模型自报的名字，不存适配器名', async () => {
    const { app, m09 } = await runLoop(
      new FakeModel({ responder: responder({ m09Args: structured }) }),
    );
    expect(m09).toHaveLength(1);
    expect(m09[0]?.model).toBe(FakeModel.MODEL_NAME);
    expect(m09[0]?.model).not.toBe('fake');
    const m10 = await readFile(
      join(app.dataDir.root, 'knowledge', 'm10', 'records.jsonl'),
      'utf8',
    ).catch(() => '');
    expect(m10).not.toContain('"model":"fake"');
  });

  it('模型没报实际名字时，记适配器名并写明是兜底', async () => {
    const inner = new FakeModel({ responder: responder({ m09Args: structured }) });
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
    const { m09 } = await runLoop(silent);
    expect(m09[0]?.model).toContain('fake');
    expect(m09[0]?.model).toContain('适配器名');
  });
});

describe('M09 会话的读权限', () => {
  it('写 M09 的会话没有 M07 原文工具，闭环对话还有', async () => {
    const model = new FakeModel({ responder: responder({ m09Args: structured }) });
    await runLoop(model);
    const names = (role: string) =>
      model.opened
        .filter((s) => s.session?.kind === role)
        .flatMap((s) => s.tools.map((t) => t.name));
    expect(names('m09')).not.toContain('get_point');
    expect(names('m09')).not.toContain('search_points');
    expect(names('m09')).not.toContain('textbook_index');
    expect(names('m09')).not.toContain('query_m09');
    expect(names('loop')).toContain('textbook_index');
  });
});

describe('选择卡出处', () => {
  async function cardTool() {
    const model = new FakeModel({ responder: responder({}) });
    const app = await createApp({ dataRoot: await tempDir(), model, token: TOKEN, port: 0 });
    apps.push(app);
    await app.studium.requestCard('测试');
    const spec = model.opened.find((s) => s.session?.kind === 'm05');
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
    expect(schema.safeParse({ ...ok, options: [SOURCED, DISPLACEMENT_OPTION] }).success).toBe(
      false,
    );
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
        roleOf(ctx) === 'm05'
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
  it('畅谈交回方向后，后台开 M15 整理（挂在畅谈对话下）', async () => {
    const model = new FakeModel({ responder: responder({}) });
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
    const m15 = app.hub.listSessions().filter((s) => s.kind === 'm15');
    expect(m15.map((s) => s.parent)).toContain(talk.sessionId);
  });
});

describe('M09 证据强度结构化', () => {
  function toolOf(model: FakeModel) {
    const spec = model.opened.find((s) => s.session?.kind === 'm09');
    const tool = spec?.tools.find((t) => t.name === 'write_formation_record');
    if (!tool) throw new Error('没有写形成记录的工具');
    return z.object(tool.input);
  }

  it('新点与每个出发点各一项，两个维度用枚举，存进记录', async () => {
    const model = new FakeModel({ responder: responder({ m09Args: structured }) });
    const { m09 } = await runLoop(model);
    expect(m09[0]?.evidence).toEqual({
      newPoint: STRONG,
      startPoints: [{ point: 'p-position', ...WEAK }],
    });
    expect(m09[0]?.evidenceStrength).toBe('新点：含变式、独立；出发点 p-position：仅当场、提示后');

    const schema = toolOf(model);
    const base = {
      new_point: 'p',
      clause: 'c',
      start_points: [],
      understanding: '',
      process: '',
      unmet: '',
      evidence_lines: [],
    };
    const good = { ...base, ...structured() };
    expect(schema.safeParse(good).success).toBe(true);
    expect(
      schema.safeParse({ ...good, new_point_evidence: { time: '含延迟', independence: '独立' } })
        .success,
    ).toBe(true);
    expect(
      schema.safeParse({ ...good, new_point_evidence: { time: '很久以后', independence: '独立' } })
        .success,
    ).toBe(false);
    expect(
      schema.safeParse({ ...good, new_point_evidence: { time: '含变式', independence: '凭感觉' } })
        .success,
    ).toBe(false);
  });

  it('出发点的证据强度与 start_points 对不上，退回', async () => {
    const model = new FakeModel({
      responder: responder({
        m09Args: () => ({
          new_point_evidence: STRONG,
          start_point_evidence: [{ point: 'p-other', ...WEAK }],
        }),
      }),
    });
    const app = await createApp({ dataRoot: await tempDir(), model, token: TOKEN, port: 0 });
    apps.push(app);
    const card = await app.studium.requestCard('测试');
    const loopId = await app.studium.choose(card.cardId, 0);
    await app.hub.idle(loopId);
    await app.hub.send(loopId, { role: 'learner', text: '位移就是终点减起点' });
    await app.hub.idle(loopId);
    await app.studium.confirmClose(loopId, '确认').catch(() => undefined);
    await app.studium.settled();
    const calls = app.hub
      .listSessions()
      .filter((s) => s.kind === 'm09')
      .map((s) => s.sessionId);
    const recs = (await app.hub.records(calls[0] ?? '')).map((r) => r.record);
    expect(
      recs.some((r) => r.type === 'tool_call' && r.isError && r.result.includes('一一对应')),
    ).toBe(true);
  });

  it('缺证据强度，退回', async () => {
    const model = new FakeModel({ responder: responder({}) });
    const app = await createApp({ dataRoot: await tempDir(), model, token: TOKEN, port: 0 });
    apps.push(app);
    const card = await app.studium.requestCard('测试');
    const loopId = await app.studium.choose(card.cardId, 0);
    await app.hub.idle(loopId);
    await app.hub.send(loopId, { role: 'learner', text: '位移就是终点减起点' });
    await app.hub.idle(loopId);
    await app.studium.confirmClose(loopId, '确认').catch(() => undefined);
    await app.studium.settled();
    const s = app.hub.listSessions().find((x) => x.kind === 'm09');
    const recs = (await app.hub.records(s?.sessionId ?? '')).map((r) => r.record);
    expect(
      recs.some((r) => r.type === 'tool_call' && r.isError && r.result.includes('缺证据强度')),
    ).toBe(true);
  });
});
