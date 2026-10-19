// 一次学习结束时后台清单的验收测试共用：在 evidence-flow 的应答上只加开卡、选、结束几步。
// W3 起不再有小卡 / 停车记录 / 分叉；导出名留着，别的老测试与 longterm-flow / practice-flow 还在用。
import { createApp, type App } from '../../src/core/app.ts';
import { FakeModel, type FakeContext, type FakeStep } from '../../src/core/model/fake.ts';
import type { NumberedRecord } from '../../src/shared/records.ts';
import { post, records, TOKEN, waitFor } from './http.ts';
import { newState, responder, settled, type FlowState } from './evidence-flow.ts';
import { tempDir } from './tmp.ts';

export interface DetourState {
  flow: FlowState;
}

export function newDetourState(): DetourState {
  return { flow: newState() };
}

export function detourResponder(st: DetourState) {
  const base = responder(st.flow);
  return (ctx: FakeContext): FakeStep | undefined => base(ctx);
}

export async function startDetourApp(
  st: DetourState,
): Promise<{ app: App; mainId: string; fake: FakeModel }> {
  const fake = new FakeModel({ responder: detourResponder(st) });
  const app = await createApp({
    dataRoot: await tempDir(),
    model: fake,
    token: TOKEN,
    port: 0,
  });
  return { app, mainId: await app.studium.ensureMain(), fake };
}

/** 开卡、选第 option 项（0 = 位移，1 = 平均速度）、等开场跑完。 */
export async function openLoop(
  app: App,
  mainId: string,
  option: number,
): Promise<{ loopId: string; cardId: string }> {
  const before = (await records(app, mainId)).at(-1)?.line ?? 0;
  await post(app, '/cards/request', { projectId: mainId });
  const cardId = await waitFor('出了卡', async () => {
    const r = (await records(app, mainId)).find(
      (x) => x.record.type === 'choice_card' && x.line > before,
    );
    return r?.record.type === 'choice_card' ? r.record.cardId : undefined;
  });
  const res = await post(app, `/cards/${cardId}/choose`, { option });
  const loopId = ((await res.json()) as { loopSessionId: string }).loopSessionId;
  await settled(app, loopId);
  return { loopId, cardId };
}

export function recordsOfType<T extends NumberedRecord['record']['type']>(
  rs: NumberedRecord[],
  type: T,
): (NumberedRecord & { record: Extract<NumberedRecord['record'], { type: T }> })[] {
  return rs.filter((r) => r.record.type === type) as never;
}
