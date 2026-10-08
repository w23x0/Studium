import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { tempDir } from '../../tests/helpers/tmp.ts';
import { Hub, NotFoundError } from './hub.ts';
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
  const hub = new Hub({
    dataDir,
    index,
    model,
    kinds: () => ({ systemPrompt: '测试提示', tools: () => [] }),
  });
  open.push(hub);
  return { dataDir, model, hub };
}

const learner = (text: string) => ({ role: 'learner' as const, text });

describe('Hub', () => {
  it('收发一轮：学习者的话、续接凭据、原始消息、回复依次落盘；交给模型的话带行号', async () => {
    const { hub, model } = await setup({ script: ['你好'] });
    const s = await hub.createSession('main', { title: '主对话' });
    await (
      await hub.send(s.sessionId, learner('嗨'))
    ).done;
    const types = (await hub.records(s.sessionId)).map((r) => r.record.type);
    expect(types).toEqual([
      'session_opened',
      'user_message',
      'model_session',
      'model_raw',
      'model_raw',
      'assistant_message',
    ]);
    expect(model.inputs[0]?.text).toBe('[第 2 行] 嗨');
  });

  it('上一轮没结束时再发，排队按顺序跑', async () => {
    const { hub } = await setup({ delayMs: 2 });
    const s = await hub.createSession('main', { title: '主对话' });
    const a = await hub.send(s.sessionId, learner('一'));
    const b = await hub.send(s.sessionId, learner('二'));
    await Promise.all([a.done, b.done]);
    const texts = (await hub.records(s.sessionId)).flatMap((r) =>
      r.record.type === 'user_message' || r.record.type === 'assistant_message'
        ? [r.record.text]
        : [],
    );
    // 学习者的话一到就落盘，回复按顺序跟上
    expect(texts).toEqual([
      '一',
      '二',
      '（假模型）收到：[第 2 行] 一',
      '（假模型）收到：[第 3 行] 二',
    ]);
  });

  it('模型失败记 turn_failed，下一轮照常', async () => {
    const { hub } = await setup({ failOnTurn: 0 });
    const s = await hub.createSession('main', { title: '主对话' });
    await (
      await hub.send(s.sessionId, learner('一'))
    ).done;
    await (
      await hub.send(s.sessionId, learner('二'))
    ).done;
    const types = (await hub.records(s.sessionId)).map((r) => r.record.type);
    expect(types).toContain('turn_failed');
    expect(types.at(-1)).toBe('assistant_message');
  });

  it('重启后接着同一份模型上下文：用正本里的续接凭据', async () => {
    const root = await tempDir();
    const a = await setup({}, root);
    const s = await a.hub.createSession('main', { title: '主对话' });
    await (
      await a.hub.send(s.sessionId, learner('一'))
    ).done;
    await a.hub.close();
    await a.dataDir.release();
    const b = await setup({}, root);
    await (
      await b.hub.send(s.sessionId, learner('二'))
    ).done;
    expect(b.model.opened[0]?.resumeToken).toBe('fake-1');
  });

  it('不存在的会话报 NotFound', async () => {
    const { hub } = await setup();
    await expect(hub.send('nope', learner('x'))).rejects.toBeInstanceOf(NotFoundError);
  });
});
