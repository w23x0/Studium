import { afterEach, describe, expect, it } from 'vitest';
import { tempDir } from '../../tests/helpers/tmp.ts';
import { BusyError, Hub, NotFoundError } from './hub.ts';
import { join } from 'node:path';
import { DerivedIndex } from './index/derived-index.ts';
import { DataDir } from './log/data-dir.ts';
import { FakeModel, type FakeOptions } from './model/fake.ts';

const open: Hub[] = [];
afterEach(async () => {
  for (const h of open.splice(0)) await h.close();
});

async function setup(fake: FakeOptions = {}, root?: string) {
  const dataDir = await DataDir.acquire(root ?? (await tempDir()));
  const model = new FakeModel(fake);
  const index = await DerivedIndex.open(join(dataDir.root, 'index.sqlite'), dataDir);
  const hub = new Hub({ dataDir, index, model, systemPrompts: { main: '测试提示' } });
  open.push(hub);
  return { dataDir, model, hub };
}

describe('Hub 主对话', () => {
  it('收发一轮：学习者的话、续接凭据、原始消息、回复依次落盘', async () => {
    const { hub } = await setup({ script: ['你好，学习者'] });
    const s = await hub.createSession('main');
    const { done } = await hub.send(s.sessionId, '你好');
    await done;
    const types = (await hub.records(s.sessionId)).map((r) => r.record.type);
    expect(types).toEqual([
      'session_opened',
      'user_message',
      'model_session',
      'model_raw',
      'model_raw',
      'assistant_message',
    ]);
    const last = (await hub.records(s.sessionId)).at(-1)?.record;
    expect(last).toMatchObject({ type: 'assistant_message', text: '你好，学习者' });
  });

  it('上一轮没结束时再发，报忙', async () => {
    const { hub } = await setup({ delayMs: 5 });
    const s = await hub.createSession('main');
    const first = await hub.send(s.sessionId, '一');
    await expect(hub.send(s.sessionId, '二')).rejects.toBeInstanceOf(BusyError);
    await first.done;
  });

  it('模型失败记 turn_failed，下一轮照常', async () => {
    const { hub } = await setup({ failOnTurn: 0 });
    const s = await hub.createSession('main');
    await (
      await hub.send(s.sessionId, '一')
    ).done;
    await (
      await hub.send(s.sessionId, '二')
    ).done;
    const types = (await hub.records(s.sessionId)).map((r) => r.record.type);
    expect(types).toContain('turn_failed');
    expect(types.at(-1)).toBe('assistant_message');
  });

  it('流式增量与进行中状态推给订阅者', async () => {
    const { hub } = await setup({ script: ['一二三四五六七八'] });
    const events: string[] = [];
    hub.subscribe((e) =>
      events.push(e.type === 'running' ? `running:${String(e.running)}` : e.type),
    );
    const s = await hub.createSession('main');
    await (
      await hub.send(s.sessionId, '开始')
    ).done;
    expect(events[1]).toBe('running:true');
    expect(events.filter((e) => e === 'delta')).toHaveLength(2);
    expect(events.at(-1)).toBe('running:false');
  });

  it('重启后接着同一份模型上下文：用正本里的续接凭据', async () => {
    const root = await tempDir();
    const a = await setup({}, root);
    const s = await a.hub.createSession('main');
    await (
      await a.hub.send(s.sessionId, '一')
    ).done;
    await a.hub.close();
    await a.dataDir.release();

    const b = await setup({}, root);
    await (
      await b.hub.send(s.sessionId, '二')
    ).done;
    expect(b.model.opened[0]?.resumeToken).toBe('fake-1');
    expect(b.model.opened[0]?.systemPrompt).toBe('测试提示');
  });

  it('不存在的会话报 NotFound', async () => {
    const { hub } = await setup();
    await expect(hub.send('nope', 'x')).rejects.toBeInstanceOf(NotFoundError);
  });
});
