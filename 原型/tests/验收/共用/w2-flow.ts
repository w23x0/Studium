// W2 验收共用：一条“出卡 → 选 → 学 → 收口 / 没合上就结束”的假模型应答与步骤。
// 只依赖 tests/helpers/http.ts、tmp.ts、createApp 与假模型；按工具名认会话种类，不认种类字符串。
// 学习对话只用文字（W4 起学习对话只有 request_close / end_loop_unclosed 两个命令）。
import { createApp, type App } from '../../../src/core/app.ts';
import { FakeModel, type FakeContext, type FakeStep } from '../../../src/core/model/fake.ts';
import type { NumberedRecord } from '../../../src/shared/records.ts';
import { getJson, post, records, TOKEN, waitFor } from '../../helpers/http.ts';
import { tempDir } from '../../helpers/tmp.ts';

/** 书里能定位的一行（样例书 §1.2 第 3 行），路线决定的依据用它。 */
export const BOOK_LINE = '力学入门样例/ch01/sec-1.2.md:3';
/** 学习者在学习对话里说的那句（守卫拿它当证据）。 */
export const SAY = '位移就是终点减起点，我今天有点累';
export const UNDERSTANDING = '能用自己的话说出位移只看起点和终点，与路径无关';
export const STRATEGY = '先让学习者用自己的话说';

/** 宽松的记录形状：W2 才加的字段（understanding、model、revisit 新形状……）在现有类型里还没有。 */
export type Loose = Record<string, unknown>;

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

/** 卡上的一项（W1 起的文字单子；值用的是旧样例里的编号字样，当文字用）。 */
export function option(title: string, extra: Loose = {}): Loose {
  return {
    new_point: title === '位移' ? 'p-displacement' : 'p-avg-velocity',
    clause: title === '位移' ? 'c-disp-from-pos' : 'c-avgv-from-disp',
    start_points: [{ point: title === '位移' ? 'p-position' : 'p-displacement', source: '假定' }],
    route_action: '继续主线',
    title,
    reason: `接着学${title}`,
    sources: [BOOK_LINE],
    source_check: [],
    ...extra,
  };
}

export const ROUTE_DECISION = {
  decision: '继续主线：先学位移',
  reason: '位移是后面速度的出发点',
  basis: [BOOK_LINE],
};

export interface Flow {
  /** 守卫这一次怎么交：合上（带理解）/ 没合上 / 自定（给出整份参数）。 */
  guard: 'closed' | 'open' | ((line: number) => Loose[]);
  /** 守卫要引的学习者行（测试在学习者说完后填）。 */
  evidenceLine: number;
  /** 当前那次学习（状态整理引它的行）。 */
  loopId: string;
  /** 导航交卡时的工具调用；不设用默认两项（位移 / 平均速度）。 */
  navCalls?: ((ctx: FakeContext) => { name: string; args: Loose }[]) | undefined;
  /** 主对话里学习者说这句时调 list_learned。 */
  askLearned: string;
  /** 额外的会话应答（先于默认）。 */
  extra?: ((ctx: FakeContext) => FakeStep | undefined) | undefined;
}

export function newFlow(): Flow {
  return { guard: 'closed', evidenceLine: 0, loopId: '', askLearned: '我学过什么' };
}

export function defaultCard(): { name: string; args: Loose } {
  return {
    name: 'submit_choice_card',
    args: {
      options: [option('位移'), option('平均速度')],
      recommended: 0,
      route_decision: ROUTE_DECISION,
    },
  };
}

export function guardArgs(flow: Flow): Loose[] {
  const line = flow.evidenceLine;
  if (typeof flow.guard === 'function') return flow.guard(line);
  if (flow.guard === 'open') {
    return [
      { closed: false, basis: '还差换个情境再说一次', evidence_lines: [], understanding: [] },
    ];
  }
  return [
    {
      closed: true,
      basis: `学习者自己说清了位移（L${String(line)}）`,
      evidence_lines: [line],
      understanding: [
        { text: UNDERSTANDING, lines: [line], independence: '独立', durability: '仅当场' },
      ],
    },
  ];
}

export function responder(flow: Flow) {
  return (ctx: FakeContext): FakeStep | undefined => {
    const own = flow.extra?.(ctx);
    if (own !== undefined) return own;
    switch (roleOf(ctx)) {
      case 'nav':
        return { calls: flow.navCalls?.(ctx) ?? [defaultCard()] };
      case 'guard':
        return { calls: guardArgs(flow).map((args) => ({ name: 'submit_verdict', args })) };
      case 'loop':
        if (ctx.input.role === 'program' && ctx.turn === 0) return { text: '你说说位移是什么？' };
        return { text: '好，换个情境再说说？' };
      case 'pedagogy':
        if (ctx.input.role !== 'program') return { text: '好' };
        return {
          calls: [
            {
              name: 'write_strategy_record',
              args: {
                conditions: '学习者状态未知',
                strategies: STRATEGY,
                followed_by: `学习者独立说清（L${String(flow.evidenceLine)}）`,
                evidence_lines: [flow.evidenceLine],
              },
            },
          ],
        };
      case 'state':
        if (ctx.input.role !== 'program' || flow.loopId === '') return { text: '没有新的可记' };
        return {
          calls: [
            {
              name: 'write_state_record',
              args: {
                text: '学习者说今天有点累',
                source: '自述',
                output_type: '承载读数',
                time_range: '本次会话',
                refs: [{ session: flow.loopId, lines: [flow.evidenceLine] }],
              },
            },
            {
              name: 'write_current_state',
              args: { text: '今天有点累（自述）', stage: '证据不足', basis_span: '本次会话' },
            },
          ],
        };
      case 'main':
        if (ctx.input.role === 'learner' && ctx.input.text.includes(flow.askLearned)) {
          return { calls: [{ name: 'list_learned', args: {} }], text: '列好了。' };
        }
        return { text: '好。' };
      case 'unknown':
        // 现在的代码里合上后还会开写 M09 的会话：给一个应答让流程走下去（W2 删掉后无害，不断言它）
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
  dataRoot?: string,
): Promise<{ app: App; fake: FakeModel; mainId: string; root: string }> {
  const fake = new FakeModel({ responder: responder(flow) });
  const root = dataRoot ?? (await tempDir());
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

/** 主对话里第 after 行之后贴出的第一张卡。 */
export async function cardAfter(app: App, mainId: string, after: number): Promise<string> {
  return waitFor(
    '出了新的选项',
    async () => {
      const r = (await records(app, mainId)).find(
        (x) => x.record.type === 'choice_card' && x.line > after,
      );
      return r?.record.type === 'choice_card' ? r.record.cardId : undefined;
    },
    3000,
  );
}

/** 出这张卡的导航会话 id（选择卡记录里的字段名 W7 前是 m05SessionId，也认 navSessionId）。 */
export function navOf(card: Loose | undefined): string {
  const id = card?.navSessionId ?? card?.m05SessionId;
  return typeof id === 'string' ? id : '';
}

export async function lastLine(app: App, id: string): Promise<number> {
  return (await records(app, id)).at(-1)?.line ?? 0;
}

/** 请一张卡 → 选第 option 项 → 等学习对话开口；返回学习 id。 */
export async function openLoop(app: App, mainId: string, flow: Flow, opt = 0): Promise<string> {
  const after = await lastLine(app, mainId);
  await post(app, '/cards/request', { projectId: mainId });
  const cardId = await cardAfter(app, mainId, after);
  return chooseCard(app, cardId, flow, opt);
}

export async function chooseCard(app: App, cardId: string, flow: Flow, opt = 0): Promise<string> {
  const res = await post(app, `/cards/${cardId}/choose`, { option: opt });
  if (res.status !== 201) throw new Error(`选卡失败：${String(res.status)} ${await res.text()}`);
  const loopId = ((await res.json()) as { loopSessionId: string }).loopSessionId;
  flow.loopId = loopId;
  await settled(app, loopId);
  return loopId;
}

/** 学习者在学习对话里说 SAY，记下这一行给守卫当证据。 */
export async function say(app: App, loopId: string, flow: Flow, text = SAY): Promise<number> {
  await post(app, `/sessions/${loopId}/messages`, { text });
  const recs = await settled(app, loopId);
  const line =
    recs.find((r) => r.record.type === 'user_message' && r.record.text === text)?.line ?? 0;
  flow.evidenceLine = line;
  return line;
}

export async function verdicts(app: App, loopId: string): Promise<NumberedRecord[]> {
  return (await records(app, loopId)).filter((r) => r.record.type === 'guard_verdict');
}

/** 学习者申请收口，等第 nth 份判定落进记录。 */
export async function requestClose(app: App, loopId: string, nth = 1): Promise<NumberedRecord> {
  await post(app, `/sessions/${loopId}/close-request`);
  const v = await waitFor(`第 ${String(nth)} 份判定`, async () => {
    const all = await verdicts(app, loopId);
    return all.length >= nth ? all[nth - 1] : undefined;
  });
  await settled(app, loopId);
  return v;
}

/** 说一句 → 申请收口 → 确认合上 → 等后台都跑完。 */
export async function learnAndClose(app: App, loopId: string, flow: Flow): Promise<void> {
  await say(app, loopId, flow);
  await requestClose(app, loopId);
  const res = await post(app, `/sessions/${loopId}/confirm-close`, { note: '懂了' });
  if (res.status !== 202) throw new Error(`确认合上失败：${await res.text()}`);
  await app.studium.settled();
}

/** 学习者要结束、没合上（界面上点，带一句原话），等后台都跑完。 */
export async function endUnclosed(app: App, loopId: string, note: string): Promise<void> {
  const res = await post(app, `/sessions/${loopId}/end`, { note });
  if (res.status !== 202) throw new Error(`结束失败：${await res.text()}`);
  await app.studium.settled();
}

/** 学过的记录接口（W2 才有）：宽松形状。 */
export interface LearnedBody {
  learnings: Loose[];
  imports: Loose[];
}

export async function learned(app: App, project?: string): Promise<LearnedBody> {
  const r = await fetch(
    `${app.server.url}/api/learned${project !== undefined ? `?project=${encodeURIComponent(project)}` : ''}`,
    { headers: { authorization: `Bearer ${TOKEN}` } },
  );
  if (r.status !== 200) throw new Error(`GET /api/learned 回 ${String(r.status)}（接口还没有？）`);
  return (await r.json()) as LearnedBody;
}

export function learningOf(body: LearnedBody, loopId: string): Loose | undefined {
  return body.learnings.find((l) => l.loopId === loopId);
}

/** 本次 opened 列表里，下标 from 之后第一个按工具名认出的会话的下标；没有给 -1。 */
export function openedIndex(fake: FakeModel, tool: string, from = 0): number {
  return fake.opened.findIndex((s, i) => i >= from && s.tools.some((t) => t.name === tool));
}
