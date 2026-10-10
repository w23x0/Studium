// 验收：新点是阈值概念时（M10「阈值概念停滞：调强度不改道」）——
// - 闭环系统提示里有定义：卡住时会话内调强度、不换点、不改路线；合上标准不变；
// - 开场对阈值概念的新点另给一句提醒，不是阈值概念的不给；
// - 守卫看不到强度调节，单子不因调强度而变。只经 HTTP 验证。
import { afterEach, describe, expect, it } from 'vitest';
import type { LoopEvidenceResponse } from '../../src/shared/protocol.ts';
import { createApp, type App } from '../../src/core/app.ts';
import { FakeModel, type FakeContext, type FakeStep } from '../../src/core/model/fake.ts';
import { getJson, post, records, TOKEN, waitFor } from '../helpers/http.ts';
import { cardAfter, settled } from '../helpers/evidence-flow.ts';
import { DISPLACEMENT_OPTION, roleOf } from '../helpers/roles.ts';
import { tempDir } from '../helpers/tmp.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

const NEWTON2 = {
  new_point: 'p-newton2',
  clause: 'c-n2-from-fma',
  start_points: [
    { point: 'p-force', source: '假定' },
    { point: 'p-mass', source: '假定' },
    { point: 'p-acceleration', source: '假定' },
  ],
  route_action: '继续主线',
  title: '牛顿第二定律',
  reason: '三个量都见过了',
};

function responder(ctx: FakeContext): FakeStep | undefined {
  switch (roleOf(ctx)) {
    case 'm05':
      return {
        calls: [
          {
            name: 'submit_choice_card',
            args: { options: [NEWTON2, DISPLACEMENT_OPTION], recommended: 0 },
          },
        ],
      };
    case 'loop':
      if (ctx.input.text.includes('还是没明白')) {
        return {
          calls: [
            {
              name: 'write_diagnosis',
              args: {
                text: '卡在力与速度的关系上',
                info: '低',
                hint: '中',
                challenge: '低',
                pace: '慢',
                lean: '输入',
                intensity_reason: '阈值概念卡住，降一档、放慢',
              },
            },
          ],
          text: '我们把步子放小一点。',
        };
      }
      return { text: '我们开始。' };
    case 'guard':
      return {
        calls: [
          {
            name: 'submit_verdict',
            args: { closed: false, basis: '还没说清力与速度的关系', evidence_lines: [] },
          },
        ],
      };
    default:
      return undefined;
  }
}

describe('阈值概念', () => {
  it('阈值概念的新点：提示词有定义、开场有提醒；调强度不改单子，守卫看不到强度', async () => {
    const fake = new FakeModel({ responder });
    const app = await createApp({
      dataRoot: await tempDir(),
      model: fake,
      token: TOKEN,
      port: 0,
    });
    apps.push(app);
    const mainId = await app.studium.ensureMain();
    await post(app, '/cards/request', { projectId: mainId });
    const card = await cardAfter(app, mainId, 0);

    // 选阈值概念那一项
    const loopId = (
      (await (await post(app, `/cards/${card}/choose`, { option: 0 })).json()) as {
        loopSessionId: string;
      }
    ).loopSessionId;
    await settled(app, loopId);

    const loopSpec = fake.opened.find((s) => s.session?.id === loopId);
    expect(loopSpec?.systemPrompt).toContain('阈值概念');
    expect(loopSpec?.systemPrompt).toContain('不改道');
    expect(loopSpec?.systemPrompt).toContain('合上标准');
    const opening = fake.inputs.find((i) => i.spec.session?.id === loopId)?.text ?? '';
    expect(opening).toContain('新点是阈值概念');
    expect(opening).toContain('不换点');

    // 学习者卡住 → 会话内调强度；申请收口，守卫判未合上
    await post(app, `/sessions/${loopId}/messages`, { text: '这个我还是没明白' });
    await settled(app, loopId);
    await post(app, `/sessions/${loopId}/close-request`);
    await waitFor('判完了', () =>
      Promise.resolve(fake.opened.some((s) => s.tools.some((t) => t.name === 'submit_verdict'))),
    );
    await settled(app, loopId);

    const ev = await getJson<LoopEvidenceResponse>(app, `/loops/${loopId}/evidence`);
    expect(ev.loop.ticket?.newPoint.id).toBe('p-newton2');
    expect(ev.loop.diagnoses.at(-1)?.intensity?.pace).toBe('慢');
    expect(ev.loop.verdicts.at(-1)?.closed).toBe(false);
    const guardInputs = fake.inputs.filter((i) =>
      i.spec.tools.some((t) => t.name === 'submit_verdict'),
    );
    expect(guardInputs.length).toBeGreaterThan(0);
    for (const g of guardInputs) {
      // 守卫读不到教学侧的诊断与强度标注（开场单子里的阈值提醒是对话的一部分，不算）
      expect(g.text).not.toContain('卡在力与速度的关系上');
      expect(g.text).not.toContain('降一档、放慢');
    }

    // 不是阈值概念的新点：没有这句提醒
    await post(app, `/sessions/${loopId}/end`);
    await app.studium.settled();
    const card2 = await waitFor('学完后出了新选项', async () => {
      const cards = (await records(app, mainId)).flatMap((r) =>
        r.record.type === 'choice_card' ? [r.record.cardId] : [],
      );
      return cards.length >= 2 ? cards.at(-1) : undefined;
    });
    const loop2 = (
      (await (await post(app, `/cards/${card2}/choose`, { option: 1 })).json()) as {
        loopSessionId: string;
      }
    ).loopSessionId;
    await settled(app, loop2);
    const opening2 = fake.inputs.find((i) => i.spec.session?.id === loop2)?.text ?? '';
    expect(opening2).toContain('本闭环的单子');
    expect(opening2).not.toContain('新点是阈值概念');
  });
});
