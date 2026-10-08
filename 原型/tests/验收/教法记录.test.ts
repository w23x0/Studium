// 验收：一段学习结束后（学完或没学完），M10 在后台记“这次教法管不管用”（03「闭环外：事件与清单」④）。
// - 开场给对话原文、诊断记录、判定（M10 读 M04 诊断）；记录引用的行须在这段对话里；
// - 下一段学习的对话能用查询工具查到这条记录。只经 HTTP 验证。
import { afterEach, describe, expect, it } from 'vitest';
import type { ListSessionsResponse } from '../../src/shared/protocol.ts';
import type { NumberedRecord } from '../../src/shared/records.ts';
import { createApp, type App } from '../../src/core/app.ts';
import { FakeModel, type FakeContext, type FakeStep } from '../../src/core/model/fake.ts';
import { getJson, post, records, TOKEN, waitFor } from '../helpers/http.ts';
import { DISPLACEMENT_OPTION, learnerLine, roleOf } from '../helpers/roles.ts';
import { tempDir } from '../helpers/tmp.ts';

const DIAGNOSIS = '诊断：学习者用自己的话说清了';
const BASIS = '学习者自己说清了位移';
const STRATEGY = '先让学习者用自己的话说，再换情境';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

function responder(ctx: FakeContext): FakeStep | undefined {
  const line = learnerLine(ctx.input.text, '终点减起点');
  switch (roleOf(ctx)) {
    case 'm05':
      return {
        calls: [
          { name: 'submit_choice_card', args: { options: [DISPLACEMENT_OPTION], recommended: 0 } },
        ],
      };
    case 'loop':
      if (ctx.input.role === 'program' && ctx.turn === 0) {
        return { calls: [{ name: 'query_strategy_records', args: {} }], text: '我们开始。' };
      }
      if (ctx.input.text.includes('终点减起点')) {
        return {
          calls: [{ name: 'write_diagnosis', args: { text: DIAGNOSIS } }],
          text: '换个情境说说？',
        };
      }
      return { text: '好。' };
    case 'guard':
      return {
        calls: [
          { name: 'submit_verdict', args: { closed: true, basis: BASIS, evidence_lines: [line] } },
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
    case 'm10': {
      if (ctx.input.role !== 'program') return { text: '好' };
      const record = {
        conditions: `学习者状态未知；诊断见记录`,
        strategies: STRATEGY,
        followed_by: `学习者独立说清（L${String(line)}）`,
      };
      return {
        calls: [
          { name: 'write_strategy_record', args: { ...record, evidence_lines: [9999] } },
          { name: 'write_strategy_record', args: { ...record, evidence_lines: [line] } },
        ],
      };
    }
    default:
      return undefined;
  }
}

async function settled(app: App, id: string): Promise<NumberedRecord[]> {
  return waitFor(`${id} 停下`, async () => {
    const r = await getJson<{ records: NumberedRecord[]; running: boolean }>(
      app,
      `/sessions/${id}/records`,
    );
    return r.running ? undefined : r.records;
  });
}

async function strategySession(app: App, loopId: string) {
  return waitFor('开了记教法的会话', async () =>
    (await getJson<ListSessionsResponse>(app, '/sessions')).sessions.find(
      (s) => s.kind === 'm10' && s.parent === loopId,
    ),
  );
}

async function cardAfter(app: App, mainId: string, after: number): Promise<string> {
  return waitFor('出了新的选项', async () => {
    const r = (await records(app, mainId)).find(
      (x) => x.record.type === 'choice_card' && x.line > after,
    );
    return r?.record.type === 'choice_card' ? r.record.cardId : undefined;
  });
}

describe('教法效果记录', () => {
  it('学完后后台记一条，下一段学习查得到；没学完也记', async () => {
    const app = await createApp({
      dataRoot: await tempDir(),
      model: new FakeModel({ responder }),
      token: TOKEN,
      port: 0,
    });
    apps.push(app);
    const mainId = await app.studium.ensureMain();

    await post(app, '/cards/request', { projectId: mainId });
    const card1 = await cardAfter(app, mainId, 0);
    const loop1 = (
      (await (await post(app, `/cards/${card1}/choose`, { option: 0 })).json()) as {
        loopSessionId: string;
      }
    ).loopSessionId;
    await settled(app, loop1);
    await post(app, `/sessions/${loop1}/messages`, { text: '位移就是终点减起点' });
    await settled(app, loop1);
    await post(app, `/sessions/${loop1}/close-request`);
    await waitFor('判完了', async () =>
      (await records(app, loop1)).some((r) => r.record.type === 'guard_verdict'),
    );
    await settled(app, loop1);
    const mark = (await records(app, mainId)).at(-1)?.line ?? 0;
    expect((await post(app, `/sessions/${loop1}/confirm-close`)).status).toBe(202);

    const m10 = await strategySession(app, loop1);
    const recs = await waitFor('记下了', async () => {
      const rs = await settled(app, m10.sessionId);
      return rs.some(
        (r) =>
          r.record.type === 'tool_call' &&
          r.record.name === 'write_strategy_record' &&
          !r.record.isError,
      )
        ? rs
        : undefined;
    });
    const opening = recs.find((r) => r.record.type === 'program_fact');
    const text = opening?.record.type === 'program_fact' ? opening.record.text : '';
    expect(text).toContain(DIAGNOSIS);
    expect(text).toContain(BASIS);
    expect(text).toContain('位移就是终点减起点');
    const writes = recs.flatMap((r) =>
      r.record.type === 'tool_call' && r.record.name === 'write_strategy_record'
        ? [r.record.isError]
        : [],
    );
    expect(writes).toEqual([true, false]);

    // 下一段学习查得到
    const card2 = await cardAfter(app, mainId, mark);
    const loop2 = (
      (await (await post(app, `/cards/${card2}/choose`, { option: 0 })).json()) as {
        loopSessionId: string;
      }
    ).loopSessionId;
    const loop2Recs = await settled(app, loop2);
    const q = loop2Recs.find(
      (r) => r.record.type === 'tool_call' && r.record.name === 'query_strategy_records',
    );
    expect(q?.record.type === 'tool_call' && q.record.result).toContain(STRATEGY);

    // 没学完就停下也记
    expect((await post(app, `/sessions/${loop2}/end`)).status).toBe(202);
    await strategySession(app, loop2);
  });
});
