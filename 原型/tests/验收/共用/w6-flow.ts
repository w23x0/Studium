// W6 验收共用：假模型按工具名认会话；出卡（带对资料核的结果与路线决定）→ 选 → 学 → 收口 / 没合上就结束；
// 改单子的接口与读几个视图。只依赖 http.ts、tmp.ts、createApp 与假模型；W1–W6 才加的形状在这里写成宽松类型。
// 学习对话只用文字（W4 起学习对话只有 request_close / end_loop_unclosed 两个命令）。
import { createApp, type App } from '../../../src/core/app.ts';
import { FakeModel, type FakeContext, type FakeStep } from '../../../src/core/model/fake.ts';
import type { NumberedRecord } from '../../../src/shared/records.ts';
import { call, getJson, post, records, TOKEN, waitFor } from '../../helpers/http.ts';
import { tempDir } from '../../helpers/tmp.ts';

/** 宽松形状：W1–W6 才加的字段在现有类型里还没有。 */
export type Loose = Record<string, unknown>;

/** 书里能定位的两行（样例书库）：路线决定的依据、对资料核的出处。 */
export const BOOK_LINE = '力学入门样例/ch01/sec-1.2.md:3';
export const AT_LINE = '力学入门样例/ch01/sec-1.1.md:5';
export const SAY = '位移就是终点减起点';
export const UNDERSTANDING = '能用自己的话说出位移只看起点和终点';
export const ROUTE_DECISION = {
  decision: '继续主线：先学位移',
  reason: '位移是后面速度的出发点',
  basis: [BOOK_LINE],
};
export const MODEL_ADDED_CLAIM = '位移和路程的区别最好用来回走的例子讲';

export type Role = 'nav' | 'guard' | 'loop' | 'talk' | 'state' | 'pedagogy' | 'main' | 'unknown';

const MARKERS: [string, Role][] = [
  ['submit_verdict', 'guard'],
  ['submit_choice_card', 'nav'],
  ['write_state_record', 'state'],
  ['write_strategy_record', 'pedagogy'],
  ['request_close', 'loop'],
  ['settle_goal', 'talk'],
  ['open_goal_talk', 'main'],
];

export function roleOf(ctx: FakeContext): Role {
  for (const [tool, role] of MARKERS) {
    if (ctx.spec.tools.some((t) => t.name === tool)) return role;
  }
  return 'unknown';
}

/** 卡上的一项（文字单子；值沿用样例里的编号字样当文字，现在的代码也认）。 */
export function option(title: '位移' | '平均速度'): Loose {
  const first = title === '位移';
  return {
    new_point: first ? 'p-displacement' : 'p-avg-velocity',
    clause: first ? 'c-disp-from-pos' : 'c-avgv-from-disp',
    start_points: [{ point: first ? 'p-position' : 'p-displacement', source: '假定' }],
    route_action: '继续主线',
    title,
    reason: `接着学${title}`,
    sources: [BOOK_LINE],
    source_check: first
      ? [
          { claim: '书里把位置的变化量叫位移', at: AT_LINE },
          { claim: MODEL_ADDED_CLAIM, model_added: true },
        ]
      : [],
  };
}

export interface Flow {
  /** 守卫要引的学习者行（学习者说完后填）。 */
  evidenceLine: number;
  /** 给了就在学习者说话那轮往工作区的 诊断.md 追加这句（W4 起的沙盒动作）。 */
  diagnosis?: string;
}

export function newFlow(): Flow {
  return { evidenceLine: 0 };
}

/** 带沙盒动作的一步（W4 起 FakeStep 才有 sandbox 字段）。 */
function withSandbox(
  sandbox: { op: 'append'; path: string; content: string }[],
  text: string,
): FakeStep {
  return { sandbox, text } as FakeStep;
}

export function responder(flow: Flow) {
  return (ctx: FakeContext): FakeStep | undefined => {
    switch (roleOf(ctx)) {
      case 'nav':
        return {
          calls: [
            {
              name: 'submit_choice_card',
              args: {
                options: [option('位移'), option('平均速度')],
                recommended: 0,
                route_decision: ROUTE_DECISION,
              },
            },
          ],
        };
      case 'guard': {
        const line = flow.evidenceLine;
        return {
          calls: [
            {
              name: 'submit_verdict',
              args: {
                closed: true,
                basis: `学习者自己说清了位移（L${String(line)}）`,
                evidence_lines: [line],
                understanding: [
                  {
                    text: UNDERSTANDING,
                    lines: [line],
                    independence: '独立',
                    durability: '仅当场',
                  },
                ],
              },
            },
          ],
        };
      }
      case 'loop':
        if (ctx.input.role === 'program' && ctx.turn === 0) return { text: '你说说位移是什么？' };
        if (ctx.input.role === 'program') return { text: '好，按你改过的来。' };
        if (flow.diagnosis !== undefined) {
          return withSandbox(
            [{ op: 'append', path: '诊断.md', content: flow.diagnosis }],
            '好，换个情境再说说？',
          );
        }
        return { text: '好，换个情境再说说？' };
      case 'pedagogy':
        return { text: '好' };
      case 'state':
        return { text: '没有新的可记' };
      case 'main':
        return { text: '好。' };
      case 'unknown':
        // 现在的代码里合上后还会开写分析层的会话：给一个应答让流程走下去（W2 删掉后无害，不断言它）
        if (ctx.spec.tools.some((t) => t.name === 'write_formation_record')) {
          return {
            calls: [
              {
                name: 'write_formation_record',
                args: {
                  new_point: 'p-displacement',
                  clause: 'c-disp-from-pos',
                  start_points: ['p-position'],
                  understanding: UNDERSTANDING,
                  process: '自己说',
                  unmet: '',
                  new_point_evidence: { time: '仅当场', independence: '独立' },
                  start_point_evidence: [
                    { point: 'p-position', time: '仅当场', independence: '独立' },
                  ],
                  evidence_lines: [flow.evidenceLine],
                },
              },
            ],
          };
        }
        return undefined;
      default:
        return undefined;
    }
  };
}

export async function boot(
  flow: Flow,
): Promise<{ app: App; fake: FakeModel; mainId: string; root: string }> {
  const fake = new FakeModel({ responder: responder(flow) });
  const root = await tempDir();
  const app = await createApp({ dataRoot: root, model: fake, token: TOKEN, port: 0 });
  return { app, fake, mainId: await app.studium.ensureMain(), root };
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

/** 正本里的行，按宽松形状读（W1–W6 才加的记录类型现在的类型里没有）。 */
export async function rows(app: App, id: string): Promise<{ line: number; record: Loose }[]> {
  return (await records(app, id)).map((r) => ({
    line: r.line,
    record: r.record as unknown as Loose,
  }));
}

export async function lastLine(app: App, id: string): Promise<number> {
  return (await records(app, id)).at(-1)?.line ?? 0;
}

/** 主对话里第 after 行之后贴出的第一张卡。 */
export async function cardAfter(app: App, mainId: string, after: number): Promise<string> {
  return waitFor('出了新的选项', async () => {
    const r = (await records(app, mainId)).find(
      (x) => x.record.type === 'choice_card' && x.line > after,
    );
    return r?.record.type === 'choice_card' ? r.record.cardId : undefined;
  });
}

/** 请一张卡；返回卡号。 */
export async function requestCard(app: App, mainId: string): Promise<string> {
  await app.studium.settled();
  const after = await lastLine(app, mainId);
  await post(app, '/cards/request', { projectId: mainId });
  return cardAfter(app, mainId, after);
}

/** 选卡上第 opt 项，等学习对话开场跑完；返回学习 id。 */
export async function choose(app: App, cardId: string, opt = 0): Promise<string> {
  const res = await post(app, `/cards/${cardId}/choose`, { option: opt });
  if (res.status !== 201 && res.status !== 200) {
    throw new Error(`选卡失败：${String(res.status)} ${await res.text()}`);
  }
  const loopId = ((await res.json()) as { loopSessionId: string }).loopSessionId;
  await settled(app, loopId);
  return loopId;
}

/** 学习者在学习对话里说一句，记下这一行给守卫当证据。 */
export async function say(app: App, loopId: string, flow: Flow, text = SAY): Promise<number> {
  await post(app, `/sessions/${loopId}/messages`, { text });
  const recs = await settled(app, loopId);
  const line =
    recs.find((r) => r.record.type === 'user_message' && r.record.text === text)?.line ?? 0;
  flow.evidenceLine = line;
  return line;
}

/** 申请收口 → 等判定 → 确认合上 → 等后台跑完。 */
export async function closeAndConfirm(app: App, loopId: string): Promise<void> {
  await post(app, `/sessions/${loopId}/close-request`);
  await waitFor('判定落进记录', async () =>
    (await records(app, loopId)).some((r) => r.record.type === 'guard_verdict'),
  );
  await settled(app, loopId);
  const res = await post(app, `/sessions/${loopId}/confirm-close`, { note: '懂了' });
  if (res.status !== 202) throw new Error(`确认合上失败：${await res.text()}`);
  await app.studium.settled();
}

/** 学习者要结束、没合上（带一句原话），等后台跑完。 */
export async function endUnclosed(app: App, loopId: string, note: string): Promise<void> {
  const res = await post(app, `/sessions/${loopId}/end`, { note });
  if (res.status !== 202) throw new Error(`结束失败：${await res.text()}`);
  await app.studium.settled();
}

/** 学习正本里 card_ready 那一步记的卡号（学习结束后导航出的卡）。 */
export async function cardAfterLoop(app: App, loopId: string): Promise<string> {
  return waitFor('学习结束后出了卡', async () => {
    const r = (await rows(app, loopId)).find(
      (x) => x.record.type === 'after_loop_step' && x.record.step === 'card_ready',
    );
    return typeof r?.record.detail === 'string' ? r.record.detail : undefined;
  });
}

/** 改单子（W6 新接口）。 */
export function editTicket(app: App, loopId: string, body: Loose): Promise<Response> {
  return post(app, `/sessions/${loopId}/ticket-edit`, body);
}

/** GET 一个接口，状态不是 200 就报错（说明接口还没有或出错）。 */
export async function getOk<T>(app: App, path: string): Promise<T> {
  const res = await call(app, path);
  if (res.status !== 200) throw new Error(`GET /api${path} 回 ${String(res.status)}`);
  return (await res.json()) as T;
}

/** 某会话收到的全部输入文字（模型实际看到的）。 */
export function inputsOf(fake: FakeModel, sessionId: string): string[] {
  return fake.inputs.filter((i) => i.spec.session?.id === sessionId).map((i) => i.text);
}

/** 按工具认出的某种会话收到的全部输入文字。 */
export function inputsByTool(fake: FakeModel, tool: string): string[] {
  return fake.inputs.filter((i) => i.spec.tools.some((t) => t.name === tool)).map((i) => i.text);
}
