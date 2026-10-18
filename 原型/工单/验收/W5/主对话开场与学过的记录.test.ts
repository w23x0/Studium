// 验收（W5）：主对话上下文小、每轮从记录重建（docs/设计/会话/主对话.md「开场给什么」「分类后做什么」问进度）。
// 每一轮（学习者发话或程序事实）新开一个模型对话、不续接；这轮输入前由程序给一段开场（TurnInput.preface）：
// 方向目标（结构化）、最近几条消息、路线记录；同一段记进主对话正本一条 turn_context。
// list_learned 给学过的记录上层（单子）与中层（判定里的实际理解），并给方向目标的各块能力。
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import { post, records, waitFor } from '../helpers/http.ts';
import {
  ABILITY_A,
  ABILITY_B,
  boot,
  DECISION,
  has,
  learnOnce,
  newW5,
  openTalk,
  ORDER_HINT,
  REASON_A,
  settled,
  talkSays,
  UNDERSTANDING,
  type Loose,
} from './共用/w5-flow.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

const ASK = '我学过什么';

describe('主对话开场与学过的记录', () => {
  it('每轮新开、不续接；开场给方向目标、最近消息、路线记录；list_learned 给上中层与目标能力', async () => {
    const st = newW5();
    const { app, fake, mainId } = await boot(st);
    apps.push(app);
    const talkId = await openTalk(app, mainId, '我想学力学');
    await talkSays(app, talkId, '就这么定了');
    const loopId = await learnOnce(app, st);

    const mark = (await records(app, mainId)).at(-1)?.line ?? 0;
    await post(app, `/sessions/${mainId}/messages`, { text: ASK });
    const askLine = await waitFor('问进度落进正本', async () => {
      const r = (await records(app, mainId)).find(
        (x) => x.line > mark && x.record.type === 'user_message' && x.record.text === ASK,
      );
      return r?.line;
    });
    await settled(app, mainId);
    await app.studium.settled();

    // 主对话每一轮一个新的模型对话，不带续接凭据
    const mainInputs = fake.inputs.filter((i) => has(i.spec, 'open_goal_talk'));
    expect(mainInputs.length, '主对话跑过好几轮').toBeGreaterThanOrEqual(3);
    expect(
      new Set(mainInputs.map((i) => i.spec)).size,
      '主对话每一轮都新开一个模型对话（不靠长上下文）',
    ).toBe(mainInputs.length);
    expect(
      fake.opened.filter((s) => has(s, 'open_goal_talk')).every((s) => s.resumeToken === undefined),
      '主对话不续接旧的模型会话',
    ).toBe(true);

    // 这一轮模型看到的：开场 + 学习者这句
    const seen = mainInputs.find((i) => i.text.includes(ASK))?.text ?? '';
    expect(seen, '模型看到学习者这句').toContain(ASK);
    expect(seen, '开场给方向目标的各块能力').toContain(ABILITY_A);
    expect(seen, '开场给每块的理由').toContain(REASON_A);
    expect(seen, '开场给顺序参考').toContain(ORDER_HINT);
    expect(seen, '开场给最近几条消息（前面说过的话）').toContain('我想学力学');
    expect(seen, '开场给路线记录（最新的路线决定）').toContain(DECISION);
    expect(seen.indexOf(ABILITY_A), '开场在学习者这句之前').toBeLessThan(seen.indexOf(ASK));

    // 同一段开场记进正本，可回查
    const ctxRec = (await records(app, mainId))
      .map((r) => r.record as unknown as Loose)
      .find((r) => r.type === 'turn_context' && r.forLine === askLine);
    expect(ctxRec, '正本里有这一轮的 turn_context，指向学习者这句的行').toBeDefined();
    expect(String(ctxRec?.text), 'turn_context 记的是给模型的那段开场').toContain(ABILITY_A);

    // 问进度：list_learned 读学过的记录上 / 中层，并给方向目标
    const listed = (await records(app, mainId))
      .map((r) => r.record as unknown as Loose)
      .find((r) => r.type === 'tool_call' && r.name === 'list_learned');
    const result = typeof listed?.result === 'string' ? listed.result : '';
    expect(result, '列出那次学习').toContain(loopId);
    expect(result, '上层：单子的新点').toContain('位移');
    expect(result, '中层：守卫写下的实际理解').toContain(UNDERSTANDING);
    expect(result, '给方向目标的各块能力').toContain(ABILITY_B);
    expect(result, '不提旧叫法').not.toMatch(/M09|形成记录|闭环/);
  }, 30000);
});
