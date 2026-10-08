// 闭环主路径（假模型）：出选择卡 → 选定开闭环 → 教 → 申请收口 → 守卫（核对引用行）→ 确认 → 写 M09 → 下一张卡。
import { afterEach, describe, expect, it } from 'vitest';
import { createApp, type App } from '../src/core/app.ts';
import { FakeModel, type FakeContext, type FakeStep } from '../src/core/model/fake.ts';
import { tempDir } from './helpers/tmp.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

const kindOf = (ctx: FakeContext) =>
  ctx.spec.tools.some((t) => t.name === 'submit_verdict')
    ? 'guard'
    : ctx.spec.tools.some((t) => t.name === 'submit_choice_card')
      ? 'm05'
      : ctx.spec.tools.some((t) => t.name === 'write_formation_record')
        ? 'm09'
        : ctx.spec.tools.some((t) => t.name === 'request_close')
          ? 'loop'
          : 'main';

const option = {
  new_point: 'p-displacement',
  clause: 'c-disp-from-pos',
  start_points: [{ point: 'p-position', source: '假定' }],
  route_action: '继续主线',
  title: '位移',
  reason: '离出发点近',
};

function responder(guardLine: { line: number }) {
  return (ctx: FakeContext): FakeStep | undefined => {
    switch (kindOf(ctx)) {
      case 'm05':
        return {
          calls: [{ name: 'submit_choice_card', args: { options: [option], recommended: 0 } }],
          text: '好了',
        };
      case 'guard':
        // 先引一行教学的话（应被程序退回），再引学习者的行
        return {
          calls: [
            {
              name: 'submit_verdict',
              args: { closed: true, basis: '见学习者的解释', evidence_lines: [guardLine.line + 1] },
            },
            {
              name: 'submit_verdict',
              args: { closed: true, basis: '见学习者的解释', evidence_lines: [guardLine.line] },
            },
          ],
        };
      case 'm09':
        return {
          calls: [
            {
              name: 'write_formation_record',
              args: {
                new_point: 'p-displacement',
                clause: 'c-disp-from-pos',
                start_points: ['p-position'],
                understanding: '位移只看起点终点',
                process: '从走路的例子',
                unmet: '',
                evidence_strength: '当场、独立',
                evidence_lines: [guardLine.line],
              },
            },
          ],
        };
      case 'loop':
        if (ctx.input.text.includes('位移就是终点减起点')) {
          return {
            calls: [
              { name: 'write_diagnosis', args: { text: '学习者自己说清了' } },
              { name: 'request_close', args: { reason: '说清了' } },
            ],
          };
        }
        return { text: '我们从位置出发。你说说位移是什么？' };
      default:
        return undefined;
    }
  };
}

describe('闭环主路径（假模型）', () => {
  it('从选择卡走到合上、写 M09、出下一张卡', async () => {
    const guardLine = { line: 0 };
    const app = await createApp({
      dataRoot: await tempDir(),
      model: new FakeModel({ responder: responder(guardLine) }),
      token: 'flow-token-0123456789',
      port: 0,
    });
    apps.push(app);
    const { studium, hub } = app;
    const mainId = await studium.ensureMain();

    const card = await studium.requestCard('测试');
    expect(card.options[0]?.ticket.newPoint).toBe('p-displacement');

    const loopId = await studium.choose(card.cardId, 0);
    await hub.idle(loopId);
    const opening = (await hub.records(loopId)).find((r) => r.record.type === 'program_fact');
    expect(opening?.record.type === 'program_fact' && opening.record.text).toContain(
      'c-disp-from-pos',
    );

    const { line } = await hub.send(loopId, {
      role: 'learner',
      text: '位移就是终点减起点，和路程不同',
    });
    guardLine.line = line;
    await hub.idle(loopId);
    const verdict = (await hub.records(loopId)).find((r) => r.record.type === 'guard_verdict');
    expect(verdict?.record).toMatchObject({ closed: true, lines: [line] });

    await studium.confirmClose(loopId, '确认');
    for (let i = 0; i < 50; i++) {
      const steps = (await hub.records(loopId)).filter((r) => r.record.type === 'after_loop_step');
      if (steps.length >= 2) break;
      await new Promise((r) => setTimeout(r, 20));
    }
    const steps = (await hub.records(loopId)).flatMap((r) =>
      r.record.type === 'after_loop_step' ? [r.record.step] : [],
    );
    expect(steps).toEqual(['m09_written', 'card_ready']);
    const cards = (await hub.records(mainId)).filter((r) => r.record.type === 'choice_card');
    expect(cards).toHaveLength(2);
  });

  it('单子在 M08 里查不到，不开闭环对话', async () => {
    const app = await createApp({
      dataRoot: await tempDir(),
      model: new FakeModel({
        responder: (ctx) =>
          kindOf(ctx) === 'm05'
            ? {
                calls: [
                  {
                    name: 'submit_choice_card',
                    args: { options: [{ ...option, new_point: '不存在' }], recommended: 0 },
                  },
                ],
              }
            : undefined,
      }),
      token: 'flow-token-0123456789',
      port: 0,
    });
    apps.push(app);
    await expect(app.studium.requestCard('测试')).rejects.toThrow('没有提交选择卡');
  });
});
