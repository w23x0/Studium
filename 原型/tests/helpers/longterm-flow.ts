// 跨闭环长期功能（批 6）的验收测试共用：可拨的时钟、在闭环中途那套应答上叠一层“按测试改写”的应答、
// 学完一个闭环（说一句 → 收口 → 确认）的步骤。
import { createApp, type App } from '../../src/core/app.ts';
import { FakeModel, type FakeContext, type FakeStep } from '../../src/core/model/fake.ts';
import type { FormationsResponse } from '../../src/shared/protocol.ts';
import { getJson, post, TOKEN } from './http.ts';
import { detourResponder, newDetourState, type DetourState } from './detour-flow.ts';
import { confirmAndSettle, requestClose, SAY, settled } from './evidence-flow.ts';
import { tempDir } from './tmp.ts';

export interface LongState {
  detour: DetourState;
  /** 核心的时钟；测试拨它来模拟“过了几天”。 */
  clock: { now: Date };
  /** 先于默认应答的改写：返回 undefined 就走默认。 */
  override?: ((ctx: FakeContext) => FakeStep | undefined) | undefined;
}

export function newLong(): LongState {
  return { detour: newDetourState(), clock: { now: new Date('2026-10-01T09:00:00.000Z') } };
}

export function advanceDays(st: LongState, days: number): void {
  st.clock.now = new Date(st.clock.now.getTime() + days * 86_400_000);
}

export async function startLong(
  st: LongState,
  dataRoot?: string,
): Promise<{ app: App; mainId: string; fake: FakeModel; dataRoot: string }> {
  const base = detourResponder(st.detour);
  const fake = new FakeModel({ responder: (ctx) => st.override?.(ctx) ?? base(ctx) });
  const root = dataRoot ?? (await tempDir());
  const app = await createApp({
    dataRoot: root,
    model: fake,
    token: TOKEN,
    port: 0,
    now: () => st.clock.now,
  });
  return { app, mainId: await app.studium.ensureMain(), fake, dataRoot: root };
}

/** 在闭环里说一句 → 申请收口 → 确认合上，等后台（写 M09、下一张卡……）跑完。 */
export async function learnAndClose(app: App, loopId: string): Promise<void> {
  await post(app, `/sessions/${loopId}/messages`, { text: SAY });
  await settled(app, loopId);
  await requestClose(app, loopId, 1);
  await confirmAndSettle(app, loopId);
}

export async function formations(
  app: App,
  loopId?: string,
): Promise<FormationsResponse['records']> {
  const q = loopId !== undefined ? `?loop=${loopId}` : '';
  return (await getJson<FormationsResponse>(app, `/m09/records${q}`)).records;
}

/** 工具名在这个会话的工具表里吗。 */
export function hasTool(ctx: FakeContext, name: string): boolean {
  return ctx.spec.tools.some((t) => t.name === name);
}

/** 开场文字里第一个 M09 形成记录 id（f-xxxxxxxx）。 */
export function firstFormationId(text: string): string | undefined {
  return /\bf-[0-9a-f]{8}\b/.exec(text)?.[0];
}

export const AVG_OPTION = {
  new_point: 'p-avg-velocity',
  clause: 'c-avgv-from-disp',
  start_points: [{ point: 'p-displacement', source: 'M09' }],
  route_action: '继续主线',
  title: '平均速度',
  reason: '位移会了，接着学平均速度',
  sources: ['p-avg-velocity'],
};

export const DISPLACEMENT_SRC = {
  new_point: 'p-displacement',
  clause: 'c-disp-from-pos',
  start_points: [{ point: 'p-position', source: '假定' }],
  route_action: '继续主线',
  title: '位移',
  reason: '接着你已经会的位置往下学',
  sources: ['p-displacement'],
};
