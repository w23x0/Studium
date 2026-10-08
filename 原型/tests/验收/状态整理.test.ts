// 验收：M15 是存放处，在后台整理（03「M15」「闭环外：事件与清单」）。
// - 一段学习结束后，后台开整理会话：开场给学习者的话与会话事实，不给诊断记录（不读知识结论）；
// - 整理会话写下的状态记录，别的会话（出下一步选项）能用查询工具查到；
// - 学习者隔很久回来时也整理一次，主对话先收到“离开了多久”。只经 HTTP 验证。
import { afterEach, describe, expect, it } from 'vitest';
import type { ListSessionsResponse } from '../../src/shared/protocol.ts';
import type { NumberedRecord } from '../../src/shared/records.ts';
import { createApp, type App } from '../../src/core/app.ts';
import { FakeModel, type FakeContext, type FakeStep } from '../../src/core/model/fake.ts';
import { getJson, post, records, TOKEN, waitFor } from '../helpers/http.ts';
import { DISPLACEMENT_OPTION, learnerLine, roleOf } from '../helpers/roles.ts';
import { tempDir } from '../helpers/tmp.ts';

const DIAGNOSIS = '诊断：位移概念还没说清';
const STATE = '学习者说今天有点累';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

function responder(ids: { loop: string }) {
  return (ctx: FakeContext): FakeStep | undefined => {
    switch (roleOf(ctx)) {
      case 'm05':
        return {
          calls: [
            { name: 'query_state', args: {} },
            {
              name: 'submit_choice_card',
              args: { options: [DISPLACEMENT_OPTION], recommended: 0 },
            },
          ],
        };
      case 'loop':
        if (ctx.input.text.includes('有点累')) {
          return {
            calls: [{ name: 'write_diagnosis', args: { text: DIAGNOSIS } }],
            text: '那我们慢一点。你说说位移是什么？',
          };
        }
        return { text: '我们从位置说起。' };
      case 'm15': {
        if (ctx.input.role !== 'program') return { text: '好' };
        const line = learnerLine(ctx.input.text, '有点累');
        return {
          calls: [
            {
              name: 'write_state_record',
              args: {
                text: STATE,
                source: '自述',
                output_type: '承载读数',
                time_range: '本次会话',
                refs: [{ session: ids.loop, lines: [line] }],
              },
            },
            {
              name: 'write_current_state',
              args: {
                text: `${STATE}（自述，本次会话）`,
                stage: '证据不足',
                basis_span: '本次会话',
              },
            },
          ],
        };
      }
      default:
        return undefined;
    }
  };
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

async function stateSessions(app: App) {
  return (await getJson<ListSessionsResponse>(app, '/sessions')).sessions
    .filter((s) => s.kind === 'm15')
    .sort((a, b) => a.sessionId.localeCompare(b.sessionId));
}

async function newCard(app: App, mainId: string, after: number): Promise<NumberedRecord> {
  return waitFor('出了新的选项', async () =>
    (await records(app, mainId)).find((r) => r.record.type === 'choice_card' && r.line > after),
  );
}

describe('学习者状态在后台整理', () => {
  it('学完一段后整理、别处能查到；隔很久回来再整理一次', async () => {
    let clock = new Date('2026-10-08T09:00:00Z');
    const ids = { loop: '' };
    const app = await createApp({
      dataRoot: await tempDir(),
      model: new FakeModel({ responder: responder(ids) }),
      token: TOKEN,
      port: 0,
      now: () => clock,
    });
    apps.push(app);
    const mainId = await app.studium.ensureMain();

    await post(app, '/cards/request', { projectId: mainId });
    const card = await newCard(app, mainId, 0);
    if (card.record.type !== 'choice_card') throw new Error('不是选项');
    const chosen = await post(app, `/cards/${card.record.cardId}/choose`, { option: 0 });
    ids.loop = ((await chosen.json()) as { loopSessionId: string }).loopSessionId;
    await settled(app, ids.loop);
    await post(app, `/sessions/${ids.loop}/messages`, { text: '我今天有点累' });
    await settled(app, ids.loop);
    expect((await post(app, `/sessions/${ids.loop}/end`)).status).toBe(202);

    // 后台整理：开场有学习者的话，没有诊断记录
    const first = await waitFor('开了整理会话', async () => (await stateSessions(app))[0]);
    const firstRecs = await waitFor('整理写下了记录', async () => {
      const rs = await settled(app, first.sessionId);
      return rs.some(
        (r) =>
          r.record.type === 'tool_call' &&
          r.record.name === 'write_state_record' &&
          !r.record.isError,
      )
        ? rs
        : undefined;
    });
    const opening = firstRecs.find((r) => r.record.type === 'program_fact');
    const openingText = opening?.record.type === 'program_fact' ? opening.record.text : '';
    expect(openingText).toContain('有点累');
    expect(openingText).not.toContain(DIAGNOSIS);

    // 别处查得到：再要一次下一步，出选项的会话用查询工具查到这条状态
    await waitFor('学完后的选项出好了', async () =>
      (await records(app, ids.loop)).some(
        (r) => r.record.type === 'after_loop_step' && r.record.step === 'card_ready',
      ),
    );
    const before = (await records(app, mainId)).at(-1)?.line ?? 0;
    await post(app, '/cards/request', { projectId: mainId });
    const again = await newCard(app, mainId, before);
    if (again.record.type !== 'choice_card') throw new Error('不是选项');
    const m05 = await settled(app, again.record.m05SessionId);
    const query = m05.find((r) => r.record.type === 'tool_call' && r.record.name === 'query_state');
    expect(query?.record.type === 'tool_call' && query.record.result).toContain(STATE);

    // 隔两天回来：主对话先收到离开多久，后台再整理一次
    await settled(app, mainId);
    clock = new Date(clock.getTime() + 2 * 24 * 3600 * 1000);
    await post(app, `/sessions/${mainId}/messages`, { text: '我回来了' });
    const main = await settled(app, mainId);
    expect(
      main.some((r) => r.record.type === 'program_fact' && r.record.text.includes('2 天')),
    ).toBe(true);
    const second = await waitFor('又整理了一次', async () => (await stateSessions(app))[1]);
    const secondRecs = await settled(app, second.sessionId);
    const opening2 = secondRecs.find((r) => r.record.type === 'program_fact');
    expect(opening2?.record.type === 'program_fact' && opening2.record.text).toContain('我回来了');
  });
});
