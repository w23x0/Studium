// 验收（W5）：settle_goal 的程序核对（docs/设计/记录/方向目标.md「内容」：目标能力 + 每块理由）。
// 缺 abilities、abilities 为空、某块缺 ability 或 reason、缺 title、旧形状（goal / project_name）→ 工具退回，
// 什么都不写、畅谈不结束；改对后照收。核对在工具里做（假模型不过参数校验）。
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import { records } from '../helpers/http.ts';
import {
  ABILITY_A,
  boot,
  goals,
  goodGoal,
  newW5,
  openTalk,
  REASON_A,
  talkSays,
  toolCalls,
  type Loose,
} from './共用/w5-flow.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

const BAD: [string, Loose][] = [
  ['缺 abilities', { title: '经典力学' }],
  ['abilities 为空', { title: '经典力学', abilities: [] }],
  ['某块缺 reason', { title: '经典力学', abilities: [{ ability: ABILITY_A }] }],
  ['某块 reason 是空白', { title: '经典力学', abilities: [{ ability: ABILITY_A, reason: '  ' }] }],
  ['某块缺 ability', { title: '经典力学', abilities: [{ reason: REASON_A }] }],
  ['缺 title', { abilities: [{ ability: ABILITY_A, reason: REASON_A }] }],
  ['旧形状 goal / project_name', { goal: '学经典力学', project_name: '经典力学' }],
  ['期限不是日期', goodGoal({ deadline: '年底' })],
];

describe('方向目标退回', () => {
  it('不合规的交回逐条被退回、什么都不写；改对后照收', async () => {
    const st = newW5();
    const { app, mainId } = await boot(st);
    apps.push(app);
    const talkId = await openTalk(app, mainId);

    for (const [why, args] of BAD) {
      st.settle = () => args;
      await talkSays(app, talkId, `${why}，定了`);
      const calls = await toolCalls(app, talkId, 'settle_goal');
      expect(calls.at(-1)?.isError, `${why}：settle_goal 被工具退回`).toBe(true);
      expect(await goals(app, mainId), `${why}：方向目标没写`).toEqual([]);
      expect(
        (await records(app, talkId)).some((r) => r.record.type === 'talk_ended'),
        `${why}：畅谈没结束`,
      ).toBe(false);
      expect(
        (await records(app, mainId)).some((r) => r.record.type === 'project_title'),
        `${why}：项目名没改`,
      ).toBe(false);
    }

    st.settle = () => goodGoal();
    await talkSays(app, talkId, '这回定了');
    expect((await toolCalls(app, talkId, 'settle_goal')).at(-1)?.isError, '改对后收下').toBe(false);
    expect(await goals(app, mainId), '写了一条方向目标').toHaveLength(1);
  }, 20000);
});
