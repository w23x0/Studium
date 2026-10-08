// 验收：真实运行录带 + 离线回放（04「质量」P1）。开着录带跑一遍主路径（含中途插话；这里用假模型代替真模型），
// 再在一个空数据目录里只凭录带回放：不调模型，每轮交给模型的输入、工具结果都与录带一致（问题清单为空），
// 回放出的各会话记录与原来一致（会话 id、时间、随机编号除外）。
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { ListSessionsResponse } from '../../src/shared/protocol.ts';
import { createApp, type App } from '../../src/core/app.ts';
import { FakeModel, type FakeContext, type FakeStep } from '../../src/core/model/fake.ts';
import { normalizeForCompare } from '../../src/core/tape/ids.ts';
import { replayTape } from '../../src/core/tape/replay.ts';
import { goalTalkResponder } from '../helpers/goal-talk.ts';
import { post, records, subscribe, TOKEN, waitFor, getJson } from '../helpers/http.ts';
import { DISPLACEMENT_OPTION, learnerLine, roleOf } from '../helpers/roles.ts';
import { tempDir } from '../helpers/tmp.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

function responder(ctx: FakeContext): FakeStep | undefined {
  const line = learnerLine(ctx.input.text, '终点减起点');
  switch (roleOf(ctx)) {
    case 'main':
      if (ctx.input.text.includes('先列一下')) {
        return {
          calls: [
            { name: 'list_learned', args: {} },
            { name: 'list_learned', args: {} },
          ],
          text: '列完了',
        };
      }
      return goalTalkResponder(ctx);
    case 'm05':
      return {
        calls: [
          { name: 'query_state', args: {} },
          { name: 'submit_choice_card', args: { options: [DISPLACEMENT_OPTION], recommended: 0 } },
        ],
      };
    case 'loop':
      return ctx.input.text.includes('终点减起点')
        ? { calls: [{ name: 'write_diagnosis', args: { text: '说清了' } }], text: '换个情境？' }
        : { text: '从位置说起。' };
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
    case 'm15':
      return ctx.input.role === 'program'
        ? {
            calls: [
              {
                name: 'write_current_state',
                args: { text: '无明显状态', stage: '证据不足', basis_span: '本次' },
              },
            ],
          }
        : undefined;
    case 'm10':
      return ctx.input.role === 'program'
        ? {
            calls: [
              {
                name: 'write_strategy_record',
                args: {
                  conditions: '无',
                  strategies: '让学习者自己说',
                  followed_by: '说清了',
                  evidence_lines: [line],
                },
              },
            ],
          }
        : undefined;
    default:
      return goalTalkResponder(ctx);
  }
}

/** 各种会话的内容指纹：按种类分组、组内排序；会话 id、时间、随机编号都抹掉。 */
async function fingerprint(app: App): Promise<Record<string, string[]>> {
  const sessions = (await getJson<ListSessionsResponse>(app, '/sessions')).sessions;
  const out: Record<string, string[]> = {};
  for (const s of sessions) {
    const rs = await records(app, s.sessionId);
    const body = rs
      .map(({ record: r }) => {
        if ('text' in r) return `${r.type}|${normalizeForCompare(r.text)}`;
        if (r.type === 'tool_call') {
          return `tool|${r.name}|${String(r.isError)}|${normalizeForCompare(r.result)}`;
        }
        return r.type;
      })
      .join('\n');
    (out[s.kind] ??= []).push(body);
  }
  for (const k of Object.keys(out)) out[k]?.sort();
  return out;
}

describe('录带与离线回放', () => {
  it('录一遍主路径，空目录里只凭录带回放出同样的记录', async () => {
    const root = await tempDir();
    const tape = join(await tempDir(), 'run.tape.jsonl');
    const a = await createApp({
      dataRoot: root,
      model: new FakeModel({ responder, delayMs: 20 }),
      token: TOKEN,
      port: 0,
      tape,
    });
    apps.push(a);
    const mainId = await a.studium.ensureMain();

    // 中途插话
    const sse = await subscribe(a);
    await post(a, `/sessions/${mainId}/messages`, { text: '先列一下学过什么' });
    await sse.until(
      (e) => e.type === 'record' && e.sessionId === mainId && e.record.type === 'tool_call',
    );
    await post(a, `/sessions/${mainId}/messages`, { text: '等一下' });
    await sse.until((e) => e.type === 'running' && e.sessionId === mainId && !e.running);
    await sse.stop();
    await a.studium.settled();

    // 谈方向
    await post(a, `/sessions/${mainId}/messages`, { text: '我想学力学' });
    await a.studium.settled();
    const talk = (await records(a, mainId)).find((r) => r.record.type === 'task_opened');
    if (talk?.record.type !== 'task_opened') throw new Error('没开谈方向的对话');
    await post(a, `/sessions/${talk.record.sessionId}/messages`, { text: '能自己推导就行' });
    await a.studium.settled();

    // 选一项学，学完
    await post(a, '/cards/request', { projectId: mainId });
    await a.studium.settled();
    const card = (await records(a, mainId)).find((r) => r.record.type === 'choice_card');
    if (card?.record.type !== 'choice_card') throw new Error('没出选项');
    const chosen = await post(a, `/cards/${card.record.cardId}/choose`, { option: 0 });
    const { loopSessionId } = (await chosen.json()) as { loopSessionId: string };
    await a.studium.settled();
    await post(a, `/sessions/${loopSessionId}/messages`, { text: '位移就是终点减起点' });
    await a.studium.settled();
    await post(a, `/sessions/${loopSessionId}/close-request`);
    await waitFor('判完了', async () =>
      (await records(a, loopSessionId)).some((r) => r.record.type === 'guard_verdict'),
    );
    await a.studium.settled();
    await post(a, `/sessions/${loopSessionId}/confirm-close`);
    await a.studium.settled();

    const before = await fingerprint(a);
    await a.close();
    apps.splice(0);

    const replayRoot = await tempDir();
    const report = await replayTape(tape, { dataRoot: replayRoot });
    expect(report.problems).toEqual([]);
    expect(report.turns).toBeGreaterThan(10);

    const b = await createApp({
      dataRoot: replayRoot,
      model: new FakeModel(),
      token: TOKEN,
      port: 0,
    });
    apps.push(b);
    expect(await fingerprint(b)).toEqual(before);
  });
});
