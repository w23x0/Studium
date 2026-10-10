// 闭环中途（批 5）的验收测试共用：在 evidence-flow 的应答上加三件事——
// 教学侧在学习者说“不太会”时通知 M05（request_detour）、M05 出小卡、M05 记停车记录。
import { createApp, type App } from '../../src/core/app.ts';
import { FakeModel, type FakeContext, type FakeStep } from '../../src/core/model/fake.ts';
import type { NumberedRecord } from '../../src/shared/records.ts';
import { post, records, TOKEN, waitFor } from './http.ts';
import { newState, responder, settled, type FlowState } from './evidence-flow.ts';
import { tempDir } from './tmp.ts';

/** 学习者说这句，教学侧就会通知 M05。 */
export const TROUBLE = '这个位移我不太会';

export interface DetourState {
  flow: FlowState;
  /** 教学侧通知的类型。 */
  kind: 'gap' | 'branch';
  /** 通知里的依据行：默认指回学习者说 TROUBLE 的那一行；设了就用这个。 */
  basisOverride?: number[];
  /** 小卡的选项；不设用默认的（fork 位移 + continue）。 */
  options?: Record<string, unknown>[];
  /** 停车记录交回什么；不设用默认的。 */
  parking?: Record<string, unknown>;
}

export function newDetourState(): DetourState {
  return { flow: newState(), kind: 'gap' };
}

export const FORK_OPTION = {
  kind: 'fork',
  title: '先把位移补一补',
  reason: '平均速度要用位移，你说位移还不太会',
  new_point: 'p-displacement',
  clause: 'c-disp-from-pos',
  start_points: [{ point: 'p-position', source: '假定' }],
  route_action: '补前置（分叉）',
  scope: '只补到平均速度够用',
};
export const CONTINUE_OPTION = {
  kind: 'continue',
  title: '先不管，接着学',
  reason: '位移的问题先放着',
};
export const SHELVE_OPTION = { kind: 'shelve', title: '先把这个放一放', reason: '以后再接' };

/** 带行号的输入里这条消息自己的行号（“[第 N 行] …”）。 */
function ownLine(text: string): number {
  return Number(/^\[第 (\d+) 行\]/.exec(text)?.[1] ?? 0);
}

/** 带行号原文里第一条学习者的话的行号。 */
function firstLearnerLine(text: string): number {
  return Number(/L(\d+) 学习者/.exec(text)?.[1] ?? 0);
}

export function detourResponder(st: DetourState) {
  const base = responder(st.flow);
  return (ctx: FakeContext): FakeStep | undefined => {
    const names = ctx.spec.tools.map((t) => t.name);
    if (names.includes('submit_detour_card')) {
      return {
        calls: [
          {
            name: 'submit_detour_card',
            args: { options: st.options ?? [FORK_OPTION, CONTINUE_OPTION], recommended: 0 },
          },
        ],
      };
    }
    if (names.includes('submit_parking_note')) {
      const line = firstLearnerLine(ctx.input.text);
      return {
        calls: [
          {
            name: 'submit_parking_note',
            args: st.parking ?? {
              missing: [{ point: 'p-displacement', text: '位移只看起点终点还没弄清' }],
              when: '下次进来先补位移',
              resume_from: '位移那一段，再回平均速度',
              basis_lines: line > 0 ? [line] : [],
            },
          },
        ],
      };
    }
    if (names.includes('request_detour') && ctx.input.text.includes(TROUBLE)) {
      return {
        calls: [
          {
            name: 'request_detour',
            args: {
              kind: st.kind,
              missing_point: 'p-displacement',
              missing_text: '位移还不牢',
              basis_lines: st.basisOverride ?? [ownLine(ctx.input.text)],
            },
          },
        ],
        text: '我发现位移这里还不牢，小卡贴在下面，你来选。',
      };
    }
    return base(ctx);
  };
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

/** 学习者说 TROUBLE，等教学侧通知 M05、小卡落进闭环。 */
export async function troubleAndCard(
  app: App,
  loopId: string,
): Promise<{ cardId: string; line: number; records: NumberedRecord[] }> {
  await post(app, `/sessions/${loopId}/messages`, { text: TROUBLE });
  const found = await waitFor('小卡出了', async () => {
    const rs = await records(app, loopId);
    const c = rs.find((r) => r.record.type === 'detour_card');
    return c?.record.type === 'detour_card' ? { cardId: c.record.cardId, line: c.line } : undefined;
  });
  await settled(app, loopId);
  return { ...found, records: await records(app, loopId) };
}

export function recordsOfType<T extends NumberedRecord['record']['type']>(
  rs: NumberedRecord[],
  type: T,
): (NumberedRecord & { record: Extract<NumberedRecord['record'], { type: T }> })[] {
  return rs.filter((r) => r.record.type === type) as never;
}
