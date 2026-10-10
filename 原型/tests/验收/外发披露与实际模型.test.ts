// 验收：横切原则 1–3——内容送往哪个服务可知；记录里是实际执行的模型；取不到时写明兜底，不假装知道。只经 HTTP 验证。
import { afterEach, describe, expect, it } from 'vitest';
import type {
  DisclosureResponse,
  FormationsResponse,
  LoopEvidenceResponse,
  SessionModelResponse,
} from '../../src/shared/protocol.ts';
import type { App } from '../../src/core/app.ts';
import { FakeModel } from '../../src/core/model/fake.ts';
import type { ModelAdapter, ModelDisclosure } from '../../src/core/model/port.ts';
import { call, getJson } from '../helpers/http.ts';
import {
  confirmAndSettle,
  newState,
  requestClose,
  startApp,
  startLoop,
} from '../helpers/evidence-flow.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

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

describe('外发披露与实际执行的模型', () => {
  it('说明内容送往哪个服务，列出各类会话用的模型', async () => {
    const disclosure: ModelDisclosure = {
      service: 'Anthropic 的 Claude',
      route: '经本机的 Claude 订阅（Claude Agent SDK）',
      defaultModel: 'claude-default',
      profiles: { loop: { model: 'claude-big', effort: 'max' }, main: { effort: 'low' } },
    };
    const { app } = await startApp(newState(), (m) => ({
      name: 'claude-agent-sdk',
      disclosure,
      open: (spec) => m.open(spec),
    }));
    apps.push(app);
    const d = await getJson<DisclosureResponse>(app, '/disclosure');
    expect(d).toMatchObject({
      service: 'Anthropic 的 Claude',
      route: '经本机的 Claude 订阅（Claude Agent SDK）',
      adapter: 'claude-agent-sdk',
    });
    expect(d.sends.length).toBeGreaterThan(0);
    const by = Object.fromEntries(d.sessions.map((s) => [s.kind, s]));
    expect(Object.keys(by).sort()).toEqual(
      ['guard', 'loop', 'm05', 'm09', 'm10', 'm15', 'main', 'talk'].sort(),
    );
    expect(by.loop).toMatchObject({ model: 'claude-big', effort: 'max' });
    // 没单独配模型的用默认；没配强度的为空
    expect(by.main).toMatchObject({ model: 'claude-default', effort: 'low' });
    expect(by.guard).toMatchObject({ model: 'claude-default', effort: null });
  });

  it('假模型不外发，如实说明', async () => {
    const { app } = await startApp(newState());
    apps.push(app);
    const d = await getJson<DisclosureResponse>(app, '/disclosure');
    expect(d.service).toContain('不送往任何服务');
  });

  it('没有声明的适配器：写明未声明，不编', async () => {
    const { app } = await startApp(newState(), (m) => ({
      name: 'x',
      open: (spec) => m.open(spec),
    }));
    apps.push(app);
    const d = await getJson<DisclosureResponse>(app, '/disclosure');
    expect(d.service).toContain('未声明');
    expect(d.sessions.every((s) => s.model === null)).toBe(true);
  });

  it('记录里是实际执行的模型；会话的模型也能直接查', async () => {
    const { app, mainId } = await startApp(newState());
    apps.push(app);
    const { loopId } = await startLoop(app, mainId);
    const m = await getJson<SessionModelResponse>(app, `/sessions/${loopId}/model`);
    expect(m.model).toEqual({ name: FakeModel.MODEL_NAME, known: true });
    expect((await call(app, '/sessions/nope/model')).status).toBe(404);
  });

  it('取不到实际执行的模型时，如实写明是适配器名，界面能看到', async () => {
    const { app, mainId } = await startApp(newState(), withoutModelReport);
    apps.push(app);
    const { loopId } = await startLoop(app, mainId);
    await requestClose(app, loopId, 1);
    await confirmAndSettle(app, loopId);
    const ev = (await getJson<LoopEvidenceResponse>(app, `/loops/${loopId}/evidence`)).loop;
    expect(ev.model).toMatchObject({ name: 'fake', known: false });
    expect(ev.model.note).toContain('适配器名');
    expect(ev.verdicts[0]?.model.known).toBe(false);
    const m09 = (await getJson<FormationsResponse>(app, '/m09/records')).records[0];
    expect(m09?.model).toMatchObject({ name: 'fake', known: false });
    expect(m09?.model.note).toContain('不代表真正跑的是哪个模型');
    expect(
      (await getJson<SessionModelResponse>(app, `/sessions/${loopId}/model`)).model.known,
    ).toBe(false);
  });
});
