// 验收（W5 审查补）：主对话两轮排队时（上一轮还在跑，后一条排成新一轮），后一轮的开场要带上
// 上一轮模型自己的回复，否则模型看不到自己刚说过的话、会把上一轮的问题再答一遍。
// 设计：docs/设计/会话/主对话.md「开场给什么」；工单 W5 §4.4。
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import { records } from '../helpers/http.ts';
import { boot, newW5, type Loose } from './共用/w5-flow.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

describe('主对话排队轮的开场（W5 审查补）', () => {
  it('后一轮开场带上一轮模型的回复', async () => {
    const { app, mainId } = await boot(newW5());
    apps.push(app);
    const a = await app.hub.send(mainId, { role: 'learner', text: '先问一句甲' });
    const b = await app.hub.send(mainId, { role: 'program', text: '程序事实乙' });
    await Promise.all([a.done, b.done]);
    const recs = await records(app, mainId);
    const bLine = recs.find(
      (r) => r.record.type === 'program_fact' && r.record.text === '程序事实乙',
    )?.line;
    const ctx = recs
      .map((r) => r.record as unknown as Loose)
      .find((r) => r.type === 'turn_context' && r.forLine === bLine);
    // 甲那一轮的回复：排在乙后面落进正本（乙排队时甲还在跑）
    const reply = recs.find((r) => r.record.type === 'assistant_message' && r.line > (bLine ?? 0));
    expect(ctx, '后一轮记了开场').toBeDefined();
    expect(reply?.record.type, '上一轮有回复').toBe('assistant_message');
    const text = reply?.record.type === 'assistant_message' ? reply.record.text : '';
    expect(String(ctx?.text), '开场里有上一轮的回复').toContain(`你：${text.slice(0, 50)}`);
  });
});
