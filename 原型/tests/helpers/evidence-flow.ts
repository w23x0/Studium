import { expect } from 'vitest';
// 依据可见的验收测试共用：一条完整链路用的假模型应答，和“开卡 → 选 → 学 → 收口 → 确认”的几个步骤。
import { createApp, type App } from '../../src/core/app.ts';
import { FakeModel, type FakeContext, type FakeStep } from '../../src/core/model/fake.ts';
import type { ModelAdapter } from '../../src/core/model/port.ts';
import type { NumberedRecord } from '../../src/shared/records.ts';
import { getJson, post, records, TOKEN, waitFor } from './http.ts';
import { DISPLACEMENT_OPTION, learnerLine, navRoute, roleOf } from './roles.ts';
import { tempDir } from './tmp.ts';

export const DIAGNOSIS = '诊断：学习者用自己的话说清了位移';
export const SAY = '位移就是终点减起点，我今天有点累';

/** 测试在运行中改的开关。 */
export interface FlowState {
  /** 守卫下一次判合上还是没合上。 */
  guardClosed: boolean;
  /** 出下一张卡时第一个选项要带的出处。 */
  extraSources: string[];
}

export function newState(): FlowState {
  return { guardClosed: true, extraSources: [] };
}

export function responder(state: FlowState) {
  return (ctx: FakeContext): FakeStep | undefined => {
    const line = learnerLine(ctx.input.text, '终点减起点');
    switch (roleOf(ctx)) {
      case 'm05':
        return {
          calls: [
            {
              name: 'submit_choice_card',
              args: {
                options: [
                  state.extraSources.length > 0
                    ? { ...DISPLACEMENT_OPTION, sources: state.extraSources }
                    : DISPLACEMENT_OPTION,
                  {
                    new_point: 'p-avg-velocity',
                    clause: 'c-avgv-from-disp',
                    start_points: [{ point: 'p-displacement', source: '学过的记录' }],
                    route_action: '继续主线',
                    title: '平均速度',
                    reason: '位移会了，接着学平均速度',
                    sources: [
                      'p-avg-velocity',
                      'c-avgv-from-disp',
                      'ch01/sec-1.2.md:12',
                      '不知道是什么的出处',
                    ],
                  },
                ],
                recommended: 0,
                route_decision: navRoute(ctx),
              },
            },
          ],
        };
      case 'loop':
        if (ctx.input.role === 'program' && ctx.turn === 0)
          return { text: '我们开始，你说说位移是什么？' };
        if (ctx.input.text.includes('终点减起点')) {
          return {
            sandbox: [{ op: 'append', path: '诊断.md', content: DIAGNOSIS }],
            text: '换个情境说说？',
          };
        }
        return { text: '好。' };
      case 'guard':
        return {
          calls: [
            {
              name: 'submit_verdict',
              args: {
                closed: state.guardClosed,
                basis: state.guardClosed ? '学习者自己说清了位移（见证据行）' : '还差一个情境',
                evidence_lines: state.guardClosed ? [line] : [],
                ...(state.guardClosed
                  ? {
                      understanding: [
                        {
                          text: '位移只看起点终点',
                          lines: [line],
                          independence: '独立',
                          durability: '仅当场',
                        },
                      ],
                    }
                  : {}),
              },
            },
          ],
        };
      case 'm10': {
        if (ctx.input.role !== 'program') return { text: '好' };
        return {
          calls: [
            {
              name: 'write_strategy_record',
              args: {
                conditions: '学习者状态未知',
                strategies: '先让学习者用自己的话说',
                followed_by: `学习者独立说清（L${String(line)}）`,
                evidence_lines: [line],
              },
            },
          ],
        };
      }
      case 'm15': {
        if (ctx.input.role !== 'program') return { text: '好' };
        const sessionId = /一段学习 (\S+)「/.exec(ctx.input.text)?.[1] ?? '';
        const tired = learnerLine(ctx.input.text, '有点累');
        if (tired === 0) return { text: '没有新的可记' };
        return {
          calls: [
            {
              name: 'write_state_record',
              args: {
                text: '学习者说今天有点累',
                source: '自述',
                output_type: '承载读数',
                time_range: '本次会话',
                refs: [{ session: sessionId, lines: [tired] }],
              },
            },
            {
              name: 'write_current_state',
              args: { text: '今天有点累（自述）', stage: '证据不足', basis_span: '本次会话' },
            },
          ],
        };
      }
      default:
        return undefined;
    }
  };
}

export async function startApp(
  state: FlowState,
  wrap: (m: FakeModel) => ModelAdapter = (m) => m,
): Promise<{ app: App; mainId: string; fake: FakeModel }> {
  const fake = new FakeModel({ responder: responder(state) });
  const app = await createApp({
    dataRoot: await tempDir(),
    model: wrap(fake),
    token: TOKEN,
    port: 0,
  });
  return { app, mainId: await app.studium.ensureMain(), fake };
}

export async function settled(app: App, id: string): Promise<NumberedRecord[]> {
  return waitFor(`${id} 停下`, async () => {
    const r = await getJson<{ records: NumberedRecord[]; running: boolean }>(
      app,
      `/sessions/${id}/records`,
    );
    return r.running ? undefined : r.records;
  });
}

export async function cardAfter(app: App, mainId: string, after: number): Promise<string> {
  return waitFor('出了新的选项', async () => {
    const r = (await records(app, mainId)).find(
      (x) => x.record.type === 'choice_card' && x.line > after,
    );
    return r?.record.type === 'choice_card' ? r.record.cardId : undefined;
  });
}

/** 开卡 → 选第一项 → 学习者说一句 → 等停下。 */
export async function startLoop(
  app: App,
  mainId: string,
  after = 0,
): Promise<{ cardId: string; loopId: string }> {
  await post(app, '/cards/request', { projectId: mainId });
  const cardId = await cardAfter(app, mainId, after);
  const res = await post(app, `/cards/${cardId}/choose`, { option: 0 });
  const loopId = ((await res.json()) as { loopSessionId: string }).loopSessionId;
  await settled(app, loopId);
  await post(app, `/sessions/${loopId}/messages`, { text: SAY });
  await settled(app, loopId);
  return { cardId, loopId };
}

/** 学习者申请收口，等第 n 次判定落进记录。 */
export async function requestClose(app: App, loopId: string, nth: number): Promise<void> {
  await post(app, `/sessions/${loopId}/close-request`);
  await waitFor(`第 ${String(nth)} 次判定`, async () => {
    const n = (await records(app, loopId)).filter((r) => r.record.type === 'guard_verdict').length;
    return n >= nth;
  });
  await settled(app, loopId);
}

/** 确认合上，并等后台（下一张卡、M15、M10）都跑完。 */
export async function confirmAndSettle(app: App, loopId: string): Promise<void> {
  expect((await post(app, `/sessions/${loopId}/confirm-close`)).status).toBe(202);
  await app.studium.settled();
}
