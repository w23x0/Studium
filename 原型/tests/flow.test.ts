// 一次学习的主路径（假模型）：出选择卡 → 选定开学习 → 教 → 申请收口 → 守卫（核对引用行）→ 确认 → 下一张卡。
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
      ? 'nav'
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
  sources: ['导航现场说出'],
};

/** 交卡必须带的路线决定（依据指回导航会话自己的第 1 行）。 */
const route = (ctx: FakeContext) => ({
  decision: '维持主线',
  reason: '按推荐往下学',
  basis: [`${ctx.spec.session?.id ?? ''}:1`],
});

function responder(guardLine: { line: number }) {
  return (ctx: FakeContext): FakeStep | undefined => {
    switch (kindOf(ctx)) {
      case 'nav':
        return {
          calls: [
            {
              name: 'submit_choice_card',
              args: { options: [option], recommended: 0, route_decision: route(ctx) },
            },
          ],
          text: '好了',
        };
      case 'guard':
        // 先引一行教学的话（应被程序退回），再引学习者的行
        return {
          calls: [
            {
              name: 'submit_verdict',
              args: {
                closed: true,
                basis: '见学习者的解释',
                evidence_lines: [guardLine.line + 1],
                understanding: [
                  {
                    text: '位移只看起点终点',
                    lines: [guardLine.line + 1],
                    independence: '独立',
                    durability: '仅当场',
                  },
                ],
              },
            },
            {
              name: 'submit_verdict',
              args: {
                closed: true,
                basis: '见学习者的解释',
                evidence_lines: [guardLine.line],
                understanding: [
                  {
                    text: '位移只看起点终点',
                    lines: [guardLine.line],
                    independence: '独立',
                    durability: '仅当场',
                  },
                ],
              },
            },
          ],
        };
      case 'loop':
        if (ctx.input.text.includes('位移就是终点减起点')) {
          return {
            sandbox: [{ op: 'append', path: '诊断.md', content: '学习者自己说清了\n' }],
            calls: [{ name: 'request_close', args: { reason: '说清了' } }],
          };
        }
        return { text: '我们从位置出发。你说说位移是什么？' };
      default:
        return undefined;
    }
  };
}

describe('闭环主路径（假模型）', () => {
  it('从选择卡走到合上、出下一张卡', async () => {
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
      if (steps.length >= 1) break;
      await new Promise((r) => setTimeout(r, 20));
    }
    const steps = (await hub.records(loopId)).flatMap((r) =>
      r.record.type === 'after_loop_step' ? [r.record.step] : [],
    );
    expect(steps).toEqual(['card_ready']);
    const cards = (await hub.records(mainId)).filter((r) => r.record.type === 'choice_card');
    expect(cards).toHaveLength(2);
  });
});

describe('M15 / M10 的读写范围与触发', () => {
  async function boot(): Promise<App> {
    const app = await createApp({
      dataRoot: await tempDir(),
      model: new FakeModel(),
      token: 'flow-token-0123456789',
      port: 0,
    });
    apps.push(app);
    return app;
  }

  it('M15 只拿读对话与写自己两层的工具；M10 不读资料原文', async () => {
    const app = await boot();
    const m15 = app.studium
      .kind('state')
      .tools('x')
      .map((t) => t.name);
    expect(m15.sort()).toEqual(
      ['read_session', 'read_state_records', 'write_current_state', 'write_state_record'].sort(),
    );
    const m10 = app.studium
      .kind('pedagogy')
      .tools('x')
      .map((t) => t.name);
    expect(m10).not.toContain('read_source');
    expect(m10).toContain('write_strategy_record');
  });

  it('没有新的学习者的话不整理；M04 请求重新确认时照样整理', async () => {
    const app = await boot();
    const count = () => app.hub.listSessions().filter((s) => s.kind === 'state').length;
    app.studium.organizeStateLater('测试');
    await app.studium.settled();
    expect(count()).toBe(0);
    app.studium.organizeStateLater('M04 请求重新确认', undefined, true);
    await app.studium.settled();
    expect(count()).toBe(1);
  });
});
