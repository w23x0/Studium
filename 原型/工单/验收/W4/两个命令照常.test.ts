// 验收（W4）：学习对话只剩的两个命令照常走通——模型申请收口（守卫独立判，未合上就接着教），
// 学习者要结束时模型代为执行“结束这次学习（没合上）”，之后导航出卡。设计：会话/学习对话.md §2、§10；会话/守卫.md §2、§5。
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import { records, waitFor } from '../helpers/http.ts';
import {
  cardStep,
  learnerLine,
  openLearning,
  roleOf,
  say,
  settled,
  start,
  verdictStep,
} from './共用/w4-flow.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

describe('两个命令', () => {
  it('request_close 由守卫判、未合上接着教；end_loop_unclosed 结束没合上，导航随后出卡', async () => {
    const { app, world } = await start((ctx, w) => {
      switch (roleOf(ctx.spec)) {
        case 'nav':
          return cardStep(w);
        case 'loop':
          if (ctx.input.text.includes('我觉得懂了')) {
            return {
              calls: [{ name: 'request_close', args: { reason: '学习者说懂了，请守卫看' } }],
              text: '守卫说还差一点，我们换个情境。',
            };
          }
          if (ctx.input.text.includes('今天先到这里')) {
            return {
              calls: [
                {
                  name: 'end_loop_unclosed',
                  args: { note: '学习者说今天先到这里（上一行）' },
                },
              ],
              text: '好，下次接着来。',
            };
          }
          return { text: '我们开始。' };
        case 'guard':
          return verdictStep(false, learnerLine(ctx.input.text, '我觉得懂了'), '只有自述');
        default:
          return { text: '好。' };
      }
    });
    apps.push(app);

    const loopId = await openLearning(app, world.mainId);
    await say(app, loopId, '我觉得懂了');
    let recs = await settled(app, loopId);
    const asked = recs.find((r) => r.record.type === 'close_requested');
    expect(asked?.record.type === 'close_requested' && asked.record.by, '模型申请收口').toBe(
      'model',
    );
    const verdict = recs.find((r) => r.record.type === 'guard_verdict');
    expect(verdict?.record.type === 'guard_verdict' && verdict.record.closed, '守卫判未合上').toBe(
      false,
    );
    expect(
      recs.some((r) => r.record.type === 'loop_ended'),
      '未合上不结束，接着教',
    ).toBe(false);

    const cardsBefore = (await records(app, world.mainId)).filter(
      (r) => r.record.type === 'choice_card',
    ).length;
    await say(app, loopId, '今天先到这里吧');
    await app.studium.settled();
    recs = await settled(app, loopId);
    const ended = recs.find((r) => r.record.type === 'loop_ended');
    expect(ended?.record.type === 'loop_ended' && ended.record.closed, '没合上就结束').toBe(false);
    const calls = recs.flatMap((r) =>
      r.record.type === 'tool_call' ? [[r.record.name, r.record.isError] as const] : [],
    );
    expect(calls, '两个命令都调成功了').toEqual([
      ['request_close', false],
      ['end_loop_unclosed', false],
    ]);

    // 没合上之后导航读完整对话、出下一张卡
    await waitFor('导航出了新卡', async () => {
      const n = (await records(app, world.mainId)).filter(
        (r) => r.record.type === 'choice_card',
      ).length;
      return n > cardsBefore;
    });
  });
});
