// W4 验收共用：假模型按工具名认会话、出 W1 形状的选择卡、开一次学习、等停下、读沙盒动作。
// 只依赖 http.ts / tmp.ts / createApp / fake.ts；W4 才加的类型在这里写成宽松的本地类型。
import { createApp, type App } from '../../../src/core/app.ts';
import { FakeModel, type FakeContext, type FakeStep } from '../../../src/core/model/fake.ts';
import type { ConversationSpec } from '../../../src/core/model/port.ts';
import type { NumberedRecord } from '../../../src/shared/records.ts';
import { getJson, post, records, TOKEN, waitFor } from '../../helpers/http.ts';
import { tempDir } from '../../helpers/tmp.ts';

export type SandboxOp =
  | { op: 'write' | 'append'; path: string; content: string }
  | { op: 'read'; path: string }
  | { op: 'run'; command: string };

/** 带沙盒动作的一步（W4 起 FakeStep 才有 sandbox 字段）。 */
export function step(s: {
  sandbox?: SandboxOp[];
  calls?: { name: string; args: Record<string, unknown> }[];
  text?: string;
}): FakeStep {
  return s;
}

export interface SandboxSpecLoose {
  workdir: string;
  readOnly: { name: string; path: string }[];
  network: boolean;
}

export function sandboxOf(spec: ConversationSpec): SandboxSpecLoose | undefined {
  return (spec as ConversationSpec & { sandbox?: SandboxSpecLoose }).sandbox;
}

export interface SandboxActionLoose {
  line: number;
  type: 'sandbox_action';
  actor: string;
  op: string;
  path?: string;
  command?: string;
  summary: string;
  ok: boolean;
  tag?: string;
  content?: string;
}

/** 正本里的沙盒动作（W4 才有这种记录，按宽松形状读）。 */
export function sandboxActions(recs: NumberedRecord[]): SandboxActionLoose[] {
  return recs.flatMap((r) => {
    const rec = r.record as unknown as { type: string };
    if (rec.type !== 'sandbox_action') return [];
    return [{ ...(rec as Omit<SandboxActionLoose, 'line'>), line: r.line }];
  });
}

export type Role =
  'nav' | 'guard' | 'loop' | 'talk' | 'state' | 'pedagogy' | 'retrieve' | 'main' | 'unknown';

const MARKERS: [string, Role][] = [
  ['submit_verdict', 'guard'],
  ['submit_findings', 'retrieve'],
  ['submit_choice_card', 'nav'],
  ['write_state_record', 'state'],
  ['write_strategy_record', 'pedagogy'],
  ['request_close', 'loop'],
  ['settle_goal', 'talk'],
  ['open_goal_talk', 'main'],
];

export function hasTool(spec: ConversationSpec, name: string): boolean {
  return spec.tools.some((t) => t.name === name);
}

export function roleOf(spec: ConversationSpec): Role {
  for (const [tool, role] of MARKERS) if (hasTool(spec, tool)) return role;
  return 'unknown';
}

/** 带行号的原文（“L12 学习者（时间）：……”）里学习者说某句话的行号；找不到给 0。 */
export function learnerLine(text: string, says: string): number {
  const m = new RegExp(`L(\\d+) 学习者[^\\n]*${says}`).exec(text);
  return Number(m?.[1] ?? 0);
}

/** 同上，教学（模型给学习者的话）那一行。 */
export function teachingLine(text: string, says: string): number {
  const m = new RegExp(`L(\\d+) 教学[^\\n]*${says}`).exec(text);
  return Number(m?.[1] ?? 0);
}

/** 测试里会变的东西：主对话 id（路线决定的依据要能定位）、第二项是否标阶段验收。 */
export interface World {
  mainId: string;
}

/** W1 形状的选择卡（参数值是文字；现在的代码也认这些 id）。 */
export function cardStep(world: World): FakeStep {
  return {
    calls: [
      {
        name: 'submit_choice_card',
        args: {
          options: [
            {
              new_point: 'p-displacement',
              clause: 'c-disp-from-pos',
              start_points: [{ point: 'p-position', source: '假定' }],
              route_action: '继续主线',
              title: '位移',
              reason: '接着位置往下学',
              sources: ['导航现场说出'],
              source_check: [],
            },
            {
              new_point: 'p-avg-velocity',
              clause: 'c-avgv-from-disp',
              start_points: [{ point: 'p-displacement', source: '假定' }],
              route_action: '继续主线',
              title: '平均速度（阶段验收）',
              reason: '验收一下平均速度',
              sources: ['导航现场说出'],
              source_check: [],
              stage_check: true,
            },
          ],
          recommended: 0,
          route_decision: {
            decision: '继续主线',
            reason: '刚开始，从位置往下走',
            basis: [`${world.mainId}:1`],
          },
        },
      },
    ],
  };
}

/** 守卫判定（W2 形状；现在的代码忽略多出来的字段）。 */
export function verdictStep(
  closed: boolean,
  line: number,
  basis = '学习者自己说清了位移',
): FakeStep {
  return {
    calls: [
      {
        name: 'submit_verdict',
        args: {
          closed,
          basis,
          evidence_lines: closed ? [line] : [],
          understanding: closed
            ? [{ text: basis, lines: [line], independence: '独立', durability: '仅当场' }]
            : [],
        },
      },
    ],
  };
}

export interface Started {
  app: App;
  fake: FakeModel;
  dataRoot: string;
  world: World;
}

/** 起一个应用；responder 拿到 world 以便出卡时写主对话 id。 */
export async function start(
  responder: (ctx: FakeContext, world: World) => FakeStep | undefined,
  prepare?: (dataRoot: string) => Promise<void>,
): Promise<Started> {
  const dataRoot = await tempDir();
  if (prepare) await prepare(dataRoot);
  const world: World = { mainId: '' };
  const fake = new FakeModel({ responder: (ctx) => responder(ctx, world) });
  const app = await createApp({ dataRoot, model: fake, token: TOKEN, port: 0 });
  world.mainId = await app.studium.ensureMain();
  return { app, fake, dataRoot, world };
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

export async function say(app: App, id: string, text: string): Promise<NumberedRecord[]> {
  await post(app, `/sessions/${id}/messages`, { text });
  return settled(app, id);
}

function cardIds(recs: NumberedRecord[]): string[] {
  return recs.flatMap((r) => (r.record.type === 'choice_card' ? [r.record.cardId] : []));
}

/** 要一张新卡、选第 option 项，等学习对话开场跑完；返回学习对话 id。 */
export async function openLearning(app: App, mainId: string, option = 0): Promise<string> {
  await app.studium.settled();
  const before = cardIds(await records(app, mainId)).length;
  await post(app, '/cards/request', { projectId: mainId });
  const cardId = await waitFor('出了新的选择卡', async () => {
    const ids = cardIds(await records(app, mainId));
    return ids.length > before ? ids.at(-1) : undefined;
  });
  const res = await post(app, `/cards/${cardId}/choose`, { option });
  if (res.status !== 201 && res.status !== 200) {
    throw new Error(`选卡失败：${String(res.status)} ${await res.text()}`);
  }
  const { loopSessionId } = (await res.json()) as { loopSessionId: string };
  await settled(app, loopSessionId);
  return loopSessionId;
}

/** 某种会话（按工具认）收到的程序事实，按先后。 */
export function programInputs(fake: FakeModel, tool: string): string[] {
  return fake.inputs
    .filter((i) => hasTool(i.spec, tool) && i.text.includes('<程序事实>'))
    .map((i) => i.text);
}

/** 某会话收到的全部输入文字。 */
export function inputsOf(fake: FakeModel, sessionId: string): string[] {
  return fake.inputs.filter((i) => i.spec.session?.id === sessionId).map((i) => i.text);
}

/** 学习对话打开时的 spec（同一次学习可能重开，取最后一次）。 */
export function specOf(fake: FakeModel, sessionId: string): ConversationSpec | undefined {
  return [...fake.opened].reverse().find((s) => s.session?.id === sessionId);
}

/** 某条记录在正本里的行号（学习者说了某句话）。 */
export function lineOfLearner(recs: NumberedRecord[], says: string): number {
  return (
    recs.find((r) => r.record.type === 'user_message' && r.record.text.includes(says))?.line ?? 0
  );
}
