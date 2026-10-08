// 验收：模型回复途中学习者再说一句（中途插话），这句马上落进记录，模型在同一轮里的下一个
// 停顿处（工具调用之间）看到并回应，而不是等这一轮全部做完才看到。只经 HTTP 验证。
import { afterEach, describe, expect, it } from 'vitest';
import { createApp, type App } from '../../src/core/app.ts';
import { FakeModel } from '../../src/core/model/fake.ts';
import { post, records, subscribe, TOKEN } from '../helpers/http.ts';
import { tempDir } from '../helpers/tmp.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

describe('中途插话', () => {
  it('回复途中再发一句：马上落盘，模型在本轮下一个停顿处回应它', async () => {
    const model = new FakeModel({
      delayMs: 150,
      responder: (ctx) =>
        ctx.input.text.includes('先列一下学过什么')
          ? {
              calls: [
                { name: 'list_learned', args: {} },
                { name: 'list_learned', args: {} },
              ],
              text: '列完了',
            }
          : ctx.input.text.includes('等一下')
            ? { text: '好，听你的' }
            : undefined,
    });
    const app = await createApp({ dataRoot: await tempDir(), model, token: TOKEN, port: 0 });
    apps.push(app);
    const mainId = await app.studium.ensureMain();
    const sse = await subscribe(app);

    expect(
      (await post(app, `/sessions/${mainId}/messages`, { text: '先列一下学过什么' })).status,
    ).toBe(202);
    // 第一个工具调用落盘后（模型还在这一轮里），学习者插话
    await sse.until(
      (e) => e.type === 'record' && e.sessionId === mainId && e.record.type === 'tool_call',
    );
    expect((await post(app, `/sessions/${mainId}/messages`, { text: '等一下' })).status).toBe(202);
    const now = await records(app, mainId);
    expect(now.some((r) => r.record.type === 'user_message' && r.record.text === '等一下')).toBe(
      true,
    );

    await sse.until((e) => e.type === 'running' && e.sessionId === mainId && !e.running);
    await sse.stop();

    const order = (await records(app, mainId)).flatMap((r) =>
      r.record.type === 'tool_call'
        ? ['工具']
        : r.record.type === 'assistant_message'
          ? [r.record.text]
          : [],
    );
    // 插话在两次工具调用之间被回应，而不是排到这一轮之后
    expect(order).toEqual(['工具', '好，听你的', '工具', '列完了']);
    // 整个过程只有一次“开始 → 结束”
    const flips = sse.events.filter((e) => e.type === 'running' && e.sessionId === mainId);
    expect(flips.map((e) => e.type === 'running' && e.running)).toEqual([true, false]);
  });
});
