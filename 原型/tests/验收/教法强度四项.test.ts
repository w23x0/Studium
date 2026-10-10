// 验收：闭环每轮诊断带结构化的四项强度（信息量 / 提示强度 / 挑战程度 / 节奏）和“偏输入还是偏练习”，
// M10 后台记录把一个闭环里四项的走向汇总进记录（程序算，不是模型写的），使教法记录之间可比较。
// 只经 HTTP 验证。
import { afterEach, describe, expect, it } from 'vitest';
import type { LoopEvidenceResponse, StrategiesResponse } from '../../src/shared/protocol.ts';
import type { NumberedRecord } from '../../src/shared/records.ts';
import { createApp, type App } from '../../src/core/app.ts';
import { FakeModel, type FakeContext, type FakeStep } from '../../src/core/model/fake.ts';
import { getJson, post, TOKEN, waitFor } from '../helpers/http.ts';
import { cardAfter, settled } from '../helpers/evidence-flow.ts';
import { DISPLACEMENT_OPTION, learnerLine, roleOf } from '../helpers/roles.ts';
import { tempDir } from '../helpers/tmp.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

const STEP1 = { info: '中', hint: '高', challenge: '低', pace: '慢', lean: '输入' };
const STEP2 = { info: '中', hint: '中', challenge: '中', pace: '慢', lean: '均衡' };
const STEP3 = {
  info: '低',
  hint: '低',
  challenge: '高',
  pace: '中',
  lean: '练习',
  intensity_reason: '学习者已经能自己说清，放手让他练',
};

function responder(ctx: FakeContext): FakeStep | undefined {
  const line = learnerLine(ctx.input.text, '终点减起点');
  switch (roleOf(ctx)) {
    case 'm05':
      return {
        calls: [
          { name: 'submit_choice_card', args: { options: [DISPLACEMENT_OPTION], recommended: 0 } },
        ],
      };
    case 'loop': {
      const t = ctx.input.text;
      const diag = (extra: Record<string, unknown>) => ({
        calls: [{ name: 'write_diagnosis', args: { text: '诊断：观察到的', ...extra } }],
        text: '好。',
      });
      if (t.includes('第一句')) return diag(STEP1);
      if (t.includes('第二句')) return diag(STEP2);
      if (t.includes('第三句')) return diag(STEP3);
      if (t.includes('第四句')) return diag({ ...STEP1, hint: '极高' });
      if (t.includes('第五句')) return diag({});
      return { text: '我们开始。' };
    }
    case 'guard':
      return {
        calls: [
          {
            name: 'submit_verdict',
            args: { closed: true, basis: '说清了', evidence_lines: [line] },
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
              process: '自己说',
              unmet: '',
              evidence_strength: '当场、独立',
              evidence_lines: [line],
            },
          },
        ],
      };
    case 'm10':
      if (ctx.input.role !== 'program') return { text: '好' };
      return {
        calls: [
          {
            name: 'write_strategy_record',
            args: {
              conditions: '状态未知',
              strategies: '先提示后放手',
              followed_by: '说清了',
              evidence_lines: [line],
            },
          },
        ],
      };
    default:
      return undefined;
  }
}

describe('教法强度四项', () => {
  it('每轮诊断记四项与偏向；填错不记；M10 记录里有程序算出的走向', async () => {
    const app = await createApp({
      dataRoot: await tempDir(),
      model: new FakeModel({ responder }),
      token: TOKEN,
      port: 0,
    });
    apps.push(app);
    const mainId = await app.studium.ensureMain();
    await post(app, '/cards/request', { projectId: mainId });
    const card = await cardAfter(app, mainId, 0);
    const loopId = (
      (await (await post(app, `/cards/${card}/choose`, { option: 0 })).json()) as {
        loopSessionId: string;
      }
    ).loopSessionId;
    await settled(app, loopId);
    for (const s of ['第一句', '第二句', '第三句', '第四句', '第五句', '位移就是终点减起点']) {
      await post(app, `/sessions/${loopId}/messages`, { text: s });
      await settled(app, loopId);
    }

    // 工具结果：填对记下；填错报错且不记；没填提醒但仍记诊断
    const loopRecs = await settled(app, loopId);
    const diag = loopRecs.flatMap((r: NumberedRecord) =>
      r.record.type === 'tool_call' && r.record.name === 'write_diagnosis' ? [r.record] : [],
    );
    expect(diag.map((d) => d.isError)).toEqual([false, false, false, true, false]);
    expect(diag[3]?.result).toContain('提示强度');
    expect(diag[4]?.result).toContain('强度');

    // 界面读得到每轮的四项
    const ev = await getJson<LoopEvidenceResponse>(app, `/loops/${loopId}/evidence`);
    expect(ev.loop.diagnoses).toHaveLength(4);
    expect(ev.loop.diagnoses[0]?.intensity).toEqual({
      info: '中',
      hint: '高',
      challenge: '低',
      pace: '慢',
      lean: '输入',
    });
    expect(ev.loop.diagnoses[2]?.intensity?.reason).toBe('学习者已经能自己说清，放手让他练');
    expect(ev.loop.diagnoses[3]?.intensity).toBeUndefined();

    // 学完：M10 开场有程序汇总的走向，记录里存走向
    await post(app, `/sessions/${loopId}/close-request`);
    await waitFor('判完了', async () =>
      (
        await getJson<{ records: NumberedRecord[] }>(app, `/sessions/${loopId}/records`)
      ).records.some((r) => r.record.type === 'guard_verdict'),
    );
    await settled(app, loopId);
    expect((await post(app, `/sessions/${loopId}/confirm-close`)).status).toBe(202);
    await app.studium.settled();

    const sessions = await getJson<{ sessions: { sessionId: string; kind: string }[] }>(
      app,
      '/sessions',
    );
    const m10Id = sessions.sessions.find((s) => s.kind === 'm10')?.sessionId ?? '';
    const opening = (await settled(app, m10Id)).find((r) => r.record.type === 'program_fact');
    const text = opening?.record.type === 'program_fact' ? opening.record.text : '';
    expect(text).toContain('教法强度走向');
    expect(text).toContain('提示强度');
    expect(text).toContain('高→中→低');

    const m10 = await getJson<StrategiesResponse>(app, `/m10/records?loop=${loopId}`);
    const trend = m10.records[0]?.intensityTrend;
    expect(trend?.turns).toHaveLength(3);
    expect(trend?.turns.map((t) => t.hint)).toEqual(['高', '中', '低']);
    expect(trend?.summary.hint).toEqual({
      first: '高',
      last: '低',
      sequence: ['高', '中', '低'],
      direction: '降',
    });
    expect(trend?.summary.challenge.direction).toBe('升');
    expect(trend?.summary.info.direction).toBe('降');
    expect(trend?.summary.pace.direction).toBe('升');
    expect(trend?.summary.lean.sequence).toEqual(['输入', '均衡', '练习']);
    expect(trend?.unannotated).toBe(1);
  });
});
