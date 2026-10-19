// 第 3 单（导航）验收测试共用：假模型按工具名认会话、按测试给的状态应答；开卡、选、说、结束、合上几步。
// 只依赖 createApp、假模型、tests/helpers/http.ts 与 tmp.ts。单子一律写文字（W1 起的形状）。
import { expect } from 'vitest';
import { createApp, type App } from '../../../src/core/app.ts';
import { FakeModel, type FakeContext, type FakeStep } from '../../../src/core/model/fake.ts';
import type { NumberedRecord } from '../../../src/shared/records.ts';
import { getJson, post, records, TOKEN, waitFor } from '../../helpers/http.ts';
import { tempDir } from '../../helpers/tmp.ts';

/** 学习者在学习里说的那句（守卫拿它当证据行）。 */
export const LEARN_SAY = '位移就是终点减起点，和路程不一样';
/** 守卫判合上时写的依据与实际理解（中层），开场里要能看到。 */
export const BASIS = '学习者自己说清了位移只看起点终点';
export const UNDERSTAND = '能区分位移与路程（学习者自己说出）';

export type Call = { name: string; args: Record<string, unknown> };

export interface W3State {
  mainId: string;
  /** 核心时钟：每取一次走一秒，保证先后可分；测试可往前拨天。 */
  clock: { t: number };
  /** 下一张卡的选项；用一次就清掉，没给就出默认两项。 */
  nextOptions?: Record<string, unknown>[] | undefined;
  recommended: number;
  /** 下一张卡写的路线决定。 */
  decision: { decision: string; reason: string };
  /** 导航在交卡之前先调的工具（retrieve、read_session、add_reminder……）；用一次就清掉。 */
  navBefore?: Call[] | undefined;
  /** 导航交卡时的调用；给了就代替默认的那一次 submit_choice_card（用来测退回）。 */
  navSubmits?: Call[] | undefined;
  /** 检索子代理开场后调的工具；没给就交回空结果。 */
  retrieve?: ((ctx: FakeContext) => Call[]) | undefined;
  /** 先于默认应答的改写。 */
  override?: ((ctx: FakeContext) => FakeStep | undefined) | undefined;
  /** 默认选项的编号。 */
  counter: number;
}

export function newW3(): W3State {
  return {
    mainId: '',
    clock: { t: Date.parse('2026-10-01T09:00:00.000Z') },
    recommended: 0,
    decision: { decision: '继续主线', reason: '按方向目标往下走' },
    counter: 0,
  };
}

export function advanceDays(st: W3State, days: number): void {
  st.clock.t += days * 86_400_000;
}

/** 一个文字单子的选项（W1 起卡上全是文字）。名字要互不包含，便于在开场里找。 */
export function opt(name: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    new_point: `${name}的新点`,
    clause: `从${name}的出发点接到${name}的新点`,
    start_points: [{ point: `${name}的出发点`, source: '假定' }],
    route_action: '继续主线',
    title: name,
    reason: `先学${name}`,
    sources: ['导航现场说出'],
    source_check: [],
    ...extra,
  };
}

export function hasTool(ctx: FakeContext, name: string): boolean {
  return ctx.spec.tools.some((t) => t.name === name);
}

/** 带行号的原文里学习者说了某句话的行号；找不到给 0。 */
export function learnerLine(text: string, says: string): number {
  const m = new RegExp(`L(\\d+) 学习者[^\\n]*${says}`).exec(text);
  return Number(m?.[1] ?? 0);
}

export function cardArgs(st: W3State, options: Record<string, unknown>[]): Record<string, unknown> {
  return {
    options,
    recommended: st.recommended,
    route_decision: { ...st.decision, basis: [`${st.mainId}:1`] },
  };
}

export function responder(st: W3State) {
  return (ctx: FakeContext): FakeStep | undefined => {
    const o = st.override?.(ctx);
    if (o !== undefined) return o;
    if (hasTool(ctx, 'submit_findings')) {
      if (ctx.turn !== 0) return { text: '好' };
      return {
        calls: st.retrieve?.(ctx) ?? [{ name: 'submit_findings', args: { findings: [] } }],
      };
    }
    if (hasTool(ctx, 'submit_choice_card')) {
      if (ctx.input.role !== 'program' || ctx.turn !== 0) return { text: '好' };
      st.counter++;
      const n = String(st.counter).padStart(2, '0');
      const options = st.nextOptions ?? [opt(`默认课题${n}`), opt(`备选课题${n}`)];
      st.nextOptions = undefined;
      const before = st.navBefore ?? [];
      st.navBefore = undefined;
      const submits = st.navSubmits ?? [
        { name: 'submit_choice_card', args: cardArgs(st, options) },
      ];
      st.navSubmits = undefined;
      return { calls: [...before, ...submits] };
    }
    if (hasTool(ctx, 'submit_verdict')) {
      const line = learnerLine(ctx.input.text, '终点减起点');
      return {
        calls: [
          {
            name: 'submit_verdict',
            args: {
              closed: true,
              basis: BASIS,
              evidence_lines: [line],
              understanding: [
                { text: UNDERSTAND, lines: [line], independence: '独立', durability: '仅当场' },
              ],
            },
          },
        ],
      };
    }
    if (hasTool(ctx, 'request_close')) {
      return { text: ctx.input.role === 'program' && ctx.turn === 0 ? '我们开始。' : '好。' };
    }
    if (hasTool(ctx, 'write_state_record') || hasTool(ctx, 'write_strategy_record')) {
      return { text: '没有新的可记' };
    }
    return undefined;
  };
}

export async function startW3(
  st: W3State = newW3(),
  dataRoot?: string,
): Promise<{ app: App; mainId: string; fake: FakeModel; st: W3State; dataRoot: string }> {
  const fake = new FakeModel({ responder: responder(st) });
  const root = dataRoot ?? (await tempDir());
  const app = await createApp({
    dataRoot: root,
    model: fake,
    token: TOKEN,
    port: 0,
    now: () => new Date((st.clock.t += 1000)),
  });
  const mainId = await app.studium.ensureMain();
  st.mainId = mainId;
  return { app, mainId, fake, st, dataRoot: root };
}

export async function lastLine(app: App, id: string): Promise<number> {
  return (await records(app, id)).at(-1)?.line ?? 0;
}

/** 主对话里 after 行之后最新的一张卡。 */
export async function cardAfter(
  app: App,
  mainId: string,
  after: number,
): Promise<{ cardId: string; line: number }> {
  return waitFor(
    '出了新的卡',
    async () => {
      const r = (await records(app, mainId))
        .filter((x) => x.record.type === 'choice_card' && x.line > after)
        .at(-1);
      return r?.record.type === 'choice_card'
        ? { cardId: r.record.cardId, line: r.line }
        : undefined;
    },
    2000,
  );
}

/** 学习者点“下一步”：出一张卡，等它落进主对话。 */
export async function requestCard(
  app: App,
  mainId: string,
): Promise<{ cardId: string; line: number }> {
  const before = await lastLine(app, mainId);
  expect((await post(app, '/cards/request', { projectId: mainId })).status, '要下一步').toBe(202);
  await app.studium.settled();
  return cardAfter(app, mainId, before);
}

/** 在卡上选第 option 项，开出一次学习，等开场跑完。 */
export async function choose(app: App, cardId: string, option: number): Promise<string> {
  const res = await post(app, `/cards/${cardId}/choose`, { option });
  expect(res.status, `选卡上第 ${String(option)} 项应当开出一次学习`).toBe(201);
  const loopId = ((await res.json()) as { loopSessionId: string }).loopSessionId;
  await app.studium.settled();
  return loopId;
}

export async function say(app: App, id: string, text: string): Promise<void> {
  expect((await post(app, `/sessions/${id}/messages`, { text })).status, '学习者说话').toBe(202);
  await app.studium.settled();
}

/** 结束这次学习（没合上），等后台（导航出卡等）跑完。 */
export async function endUnclosed(app: App, loopId: string, note: string): Promise<void> {
  expect((await post(app, `/sessions/${loopId}/end`, { note })).status, '没合上就结束').toBe(202);
  await app.studium.settled();
}

/** 说一句 → 学习者申请收口 → 守卫判合上 → 确认，等后台（导航出卡等）跑完。 */
export async function learnAndClose(app: App, loopId: string): Promise<void> {
  await say(app, loopId, LEARN_SAY);
  await post(app, `/sessions/${loopId}/close-request`, { note: '我觉得懂了' });
  await waitFor('守卫判定', async () =>
    (await records(app, loopId)).some((r) => r.record.type === 'guard_verdict' && r.record.closed),
  );
  await app.studium.settled();
  expect((await post(app, `/sessions/${loopId}/confirm-close`)).status, '确认合上').toBe(202);
  await app.studium.settled();
}

/** 有某个工具的那些会话（按开的先后），各自的会话 id。 */
export function sessionsWithTool(fake: FakeModel, tool: string): string[] {
  const ids: string[] = [];
  for (const s of fake.opened) {
    const id = s.session?.id;
    if (id !== undefined && s.tools.some((t) => t.name === tool) && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

/** 某会话收到的第一条输入（开场）。 */
export function openingOf(fake: FakeModel, sessionId: string): string {
  return fake.inputs.find((i) => i.spec.session?.id === sessionId)?.text ?? '';
}

/** 导航（有 submit_choice_card 的会话）的开场，按先后。 */
export function navOpenings(fake: FakeModel): string[] {
  return sessionsWithTool(fake, 'submit_choice_card').map((id) => openingOf(fake, id));
}

/** 某会话的工具名。 */
export function toolNames(fake: FakeModel, sessionId: string): string[] {
  return fake.opened.find((s) => s.session?.id === sessionId)?.tools.map((t) => t.name) ?? [];
}

export function ofType<T extends NumberedRecord['record']['type']>(
  rs: NumberedRecord[],
  type: T,
): (NumberedRecord & { record: Extract<NumberedRecord['record'], { type: T }> })[] {
  return rs.filter((r) => r.record.type === type) as never;
}

/** 主对话里的路线决定（W1 起的新记录；类型还没有时按宽松形状读）。 */
export interface RouteDecisionRow {
  line: number;
  trigger: string;
  decision: string;
  reason: string;
  basis: string[];
  supersedes?: number;
}

export async function routeDecisions(app: App, mainId: string): Promise<RouteDecisionRow[]> {
  return (await records(app, mainId)).flatMap((r) => {
    const x = r.record as unknown as { type: string } & Omit<RouteDecisionRow, 'line'>;
    return x.type === 'route_decision' ? [{ ...x, line: r.line }] : [];
  });
}

/** 会话列表（带 parent、from）。 */
export async function sessionList(
  app: App,
): Promise<{ sessionId: string; kind: string; parent?: string; from?: unknown }[]> {
  return (
    await getJson<{
      sessions: { sessionId: string; kind: string; parent?: string; from?: unknown }[];
    }>(app, '/sessions')
  ).sessions;
}
