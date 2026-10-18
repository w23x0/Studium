// 验收（W2 新版，取代旧版）：内容送往哪个服务可知；记录里是实际执行的模型；取不到时写明兜底，不假装知道
// （docs/设计/00-定位与原则.md §7 横切 1–3；会话/守卫.md §4“记实际执行的模型与版本”）。
// 分析层取消后：会话种类里没有 m09；判定记录自带守卫这一轮实际执行的模型。只经 HTTP，假模型。
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import { createApp } from '../../src/core/app.ts';
import { FakeModel } from '../../src/core/model/fake.ts';
import type { ModelAdapter, ModelDisclosure } from '../../src/core/model/port.ts';
import { call, getJson, TOKEN } from '../helpers/http.ts';
import { tempDir } from '../helpers/tmp.ts';
import {
  learnAndClose,
  learned,
  learningOf,
  newFlow,
  openLoop,
  responder,
  type Flow,
  type Loose,
} from './共用/w2-flow.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

interface Disclosure {
  service: string;
  route: string;
  adapter: string;
  sends: string[];
  sessions: { kind: string; model: string | null; effort: string | null }[];
}

/** 模型侧从不报告实际执行的模型（模拟取不到）。 */
function withoutModelReport(m: FakeModel): ModelAdapter {
  return {
    name: m.name,
    open: (spec) => {
      const conv = m.open(spec);
      return {
        ...conv,
        send: async function* (input) {
          for await (const ev of conv.send(input)) if (ev.kind !== 'model') yield ev;
        },
      };
    },
  };
}

async function start(
  flow: Flow,
  wrap: (m: FakeModel) => ModelAdapter = (m) => m,
): Promise<{ app: App; mainId: string }> {
  const fake = new FakeModel({ responder: responder(flow) });
  const app = await createApp({
    dataRoot: await tempDir(),
    model: wrap(fake),
    token: TOKEN,
    port: 0,
  });
  apps.push(app);
  return { app, mainId: await app.studium.ensureMain() };
}

describe('外发披露与实际执行的模型', () => {
  it('说明内容送往哪个服务，列出各类会话用的模型；没有写分析层的那类会话', async () => {
    const disclosure: ModelDisclosure = {
      service: 'Anthropic 的 Claude',
      route: '经本机的 Claude 订阅（Claude Agent SDK）',
      defaultModel: 'claude-default',
      profiles: { loop: { model: 'claude-big', effort: 'max' }, main: { effort: 'low' } },
    };
    const { app } = await start(newFlow(), (m) => ({
      name: 'claude-agent-sdk',
      disclosure,
      open: (spec) => m.open(spec),
    }));
    const d = await getJson<Disclosure>(app, '/disclosure');
    expect(d, '服务与通道照声明写').toMatchObject({
      service: 'Anthropic 的 Claude',
      route: '经本机的 Claude 订阅（Claude Agent SDK）',
      adapter: 'claude-agent-sdk',
    });
    expect(d.sends.length, '列出会送出去的内容').toBeGreaterThan(0);
    const kinds = d.sessions.map((s) => s.kind);
    expect(kinds, '会话种类里不再有 m09').not.toContain('m09');
    expect(kinds, '学习对话、守卫、主对话、畅谈都在').toEqual(
      expect.arrayContaining(['loop', 'guard', 'main', 'talk']),
    );
    const by = Object.fromEntries(d.sessions.map((s) => [s.kind, s]));
    expect(by.loop, '单独配了模型与强度的照配置').toMatchObject({
      model: 'claude-big',
      effort: 'max',
    });
    expect(by.main, '没单独配模型的用默认').toMatchObject({
      model: 'claude-default',
      effort: 'low',
    });
    expect(by.guard, '没配强度的为空').toMatchObject({ model: 'claude-default', effort: null });
  });

  it('假模型不外发，如实说明；没有声明的适配器写明未声明', async () => {
    const a = await start(newFlow());
    expect((await getJson<Disclosure>(a.app, '/disclosure')).service, '假模型如实说明').toContain(
      '不送往任何服务',
    );
    const b = await start(newFlow(), (m) => ({ name: 'x', open: (spec) => m.open(spec) }));
    const d = await getJson<Disclosure>(b.app, '/disclosure');
    expect(d.service, '没声明就写未声明').toContain('未声明');
    expect(
      d.sessions.every((s) => s.model === null),
      '不编模型名',
    ).toBe(true);
  });

  it('判定记录与学过的记录里是守卫实际执行的模型；会话的模型也能直接查', async () => {
    const flow = newFlow();
    const { app, mainId } = await start(flow);
    const loopId = await openLoop(app, mainId, flow);
    const m = await getJson<{ model: Loose }>(app, `/sessions/${loopId}/model`);
    expect(m.model, '会话的实际模型').toEqual({ name: FakeModel.MODEL_NAME, known: true });
    expect((await call(app, '/sessions/nope/model')).status, '没有这个会话 404').toBe(404);
    await learnAndClose(app, loopId, flow);
    const v = learningOf(await learned(app, mainId), loopId)?.verdict as Loose | undefined;
    expect(v?.model, '中层判定带实际执行的模型名').toBe(FakeModel.MODEL_NAME);
  });

  it('取不到实际执行的模型时，如实写明是适配器名', async () => {
    const flow = newFlow();
    const { app, mainId } = await start(flow, withoutModelReport);
    const loopId = await openLoop(app, mainId, flow);
    await learnAndClose(app, loopId, flow);
    const ev = (await getJson<{ loop: Loose }>(app, `/loops/${loopId}/evidence`)).loop;
    expect(ev.model, '学习会话的模型标“不知道”').toMatchObject({ name: 'fake', known: false });
    expect(String((ev.model as Loose).note), '写明是适配器名').toContain('适配器名');
    const verdicts = ev.verdicts as { model: Loose }[];
    expect(verdicts[0]?.model.known, '判定的模型标“不知道”').toBe(false);
    const v = learningOf(await learned(app, mainId), loopId)?.verdict as Loose | undefined;
    expect(String(v?.model), '判定记录里写的是带兜底说明的适配器名').toContain('适配器名');
    expect(
      (await getJson<{ model: Loose }>(app, `/sessions/${loopId}/model`)).model.known,
      '会话模型查询同样标“不知道”',
    ).toBe(false);
  });
});
