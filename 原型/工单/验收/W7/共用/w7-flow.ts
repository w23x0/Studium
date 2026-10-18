// W7 验收共用：起核心（假模型）、按工具名认会话、走一遍主路径（出卡 → 选 → 学 → 合上 / 没合上），读全部会话的正本。
// 只依赖 http.ts / tmp.ts / createApp / fake.ts；不认 m05 / nav 这类种类字符串（按工具名认），W1–W6 才加的形状写成宽松的本地类型。
import { createApp, type App } from '../../../src/core/app.ts';
import { FakeModel, type FakeContext, type FakeStep } from '../../../src/core/model/fake.ts';
import { getJson, post, TOKEN, waitFor } from '../../helpers/http.ts';
import { tempDir } from '../../helpers/tmp.ts';

export type Loose = Record<string, unknown>;

export interface Row {
  line: number;
  record: { type: string } & Loose;
}

export const SAY = '位移就是终点减起点，我今天有点累';

export type Role = 'nav' | 'guard' | 'loop' | 'state' | 'pedagogy' | 'retrieve' | 'other';

export function roleOf(ctx: FakeContext): Role {
  const has = (n: string): boolean => ctx.spec.tools.some((t) => t.name === n);
  if (has('submit_choice_card')) return 'nav';
  if (has('submit_verdict')) return 'guard';
  if (has('request_close')) return 'loop';
  if (has('write_state_record')) return 'state';
  if (has('write_strategy_record')) return 'pedagogy';
  if (has('submit_findings')) return 'retrieve';
  return 'other';
}

/** 测试过程中会变的事实：主对话、当前这次学习、学习者那句话的行号。 */
export interface World {
  mainId: string;
  loopId: string;
  learnerLine: number;
}

function option(title: string, newPoint: string, clause: string, mainId: string): Loose {
  return {
    new_point: newPoint,
    clause,
    start_points: [{ point: '直线上用坐标表示位置', source: '假定' }],
    route_action: '继续主线',
    title,
    reason: `接着学${title}`,
    sources: [`${mainId}:1`],
    source_check: [],
  };
}

/** 各会话的假模型应答：学习对话只说话（W4 起只剩两个命令），其余按工具名交该交的。 */
export function responder(w: World): (ctx: FakeContext) => FakeStep | undefined {
  return (ctx) => {
    const program = ctx.input.role === 'program';
    switch (roleOf(ctx)) {
      case 'nav':
        return {
          calls: [
            {
              name: 'submit_choice_card',
              args: {
                // 值借用旧样例里的字样当文字用：W1 之后是文字，现在的代码也认
                options: [
                  option('位移', 'p-displacement', 'c-disp-from-pos', w.mainId),
                  option('平均速度', 'p-avg-velocity', 'c-avgv-from-disp', w.mainId),
                ],
                recommended: 0,
                route_decision: {
                  decision: '维持主线：先学位移',
                  reason: '项目刚开始，从最近的一步走起',
                  basis: [`${w.mainId}:1`],
                },
              },
            },
          ],
        };
      case 'guard':
        return {
          calls: [
            {
              name: 'submit_verdict',
              args: {
                closed: true,
                basis: `学习者自己说清了位移（L${String(w.learnerLine)}）`,
                evidence_lines: [w.learnerLine],
                understanding: [
                  {
                    text: '能用自己的话说出位移只看起点和终点',
                    lines: [w.learnerLine],
                    independence: '独立',
                    durability: '仅当场',
                  },
                ],
              },
            },
          ],
        };
      case 'loop':
        return { text: program ? '我们从位置说起。你说说位移是什么？' : '好，换个情境再说说？' };
      case 'state':
        if (!program || w.loopId === '' || w.learnerLine === 0) return { text: '没有新的可记' };
        return {
          calls: [
            {
              name: 'write_state_record',
              args: {
                text: '学习者说今天有点累',
                source: '自述',
                output_type: '承载读数',
                time_range: '本次会话',
                refs: [{ session: w.loopId, lines: [w.learnerLine] }],
              },
            },
          ],
        };
      case 'pedagogy':
        if (!program) return { text: '好' };
        return {
          calls: [
            {
              name: 'write_strategy_record',
              args: {
                conditions: '学习者状态未知',
                strategies: '先让学习者用自己的话说',
                followed_by: `学习者独立说清（L${String(w.learnerLine)}）`,
                evidence_lines: [w.learnerLine],
              },
            },
          ],
        };
      case 'retrieve':
        return { text: '好。' };
      default:
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
                  understanding: '位移只看起点终点',
                  process: '自己说',
                  unmet: '',
                  evidence_strength: '仅当场、独立',
                  evidence_lines: [w.learnerLine],
                },
              },
            ],
          };
        }
        return { text: '好。' };
    }
  };
}

export interface Booted {
  app: App;
  model: FakeModel;
  world: World;
  dataRoot: string;
}

export async function boot(opts: { dataRoot?: string; tape?: string } = {}): Promise<Booted> {
  const world: World = { mainId: '', loopId: '', learnerLine: 0 };
  const model = new FakeModel({ responder: responder(world) });
  const dataRoot = opts.dataRoot ?? (await tempDir());
  const app = await createApp({
    dataRoot,
    model,
    token: TOKEN,
    port: 0,
    ...(opts.tape !== undefined ? { tape: opts.tape } : {}),
  });
  world.mainId = (await getJson<{ mainSessionId: string }>(app, '/project')).mainSessionId;
  return { app, model, world, dataRoot };
}

export async function rows(app: App, sessionId: string): Promise<Row[]> {
  return (await getJson<{ records: Row[] }>(app, `/sessions/${sessionId}/records`)).records;
}

/** 等核心（含后台清单）都停下。 */
export async function settle(app: App): Promise<void> {
  await app.studium.settled();
}

/** 主对话里第 after 行之后贴出的第一张卡的 id。 */
export async function cardAfter(app: App, mainId: string, after: number): Promise<string> {
  return waitFor('出了新的选项', async () => {
    const r = (await rows(app, mainId)).find(
      (x) => x.record.type === 'choice_card' && x.line > after,
    );
    const id = r?.record.cardId;
    return typeof id === 'string' ? id : undefined;
  });
}

/** 选卡上第 option 项，开一次学习；返回学习 id。 */
export async function choose(b: Booted, cardId: string, opt = 0): Promise<string> {
  const res = await post(b.app, `/cards/${cardId}/choose`, { option: opt });
  if (res.status !== 201) throw new Error(`选卡失败：${String(res.status)} ${await res.text()}`);
  const loopId = ((await res.json()) as { loopSessionId: string }).loopSessionId;
  b.world.loopId = loopId;
  b.world.learnerLine = 0;
  await settle(b.app);
  return loopId;
}

/** 请一张卡并选第一项。 */
export async function openLearning(b: Booted): Promise<string> {
  const after = (await rows(b.app, b.world.mainId)).at(-1)?.line ?? 0;
  const res = await post(b.app, '/cards/request', { projectId: b.world.mainId });
  if (res.status !== 202) throw new Error(`请卡失败：${String(res.status)}`);
  return choose(b, await cardAfter(b.app, b.world.mainId, after));
}

/** 学习者在当前这次学习里说一句；记下这一行（守卫、状态整理、教法记录整理引它）。 */
export async function learnerSays(b: Booted, text = SAY): Promise<number> {
  const res = await post(b.app, `/sessions/${b.world.loopId}/messages`, { text });
  if (res.status !== 202) throw new Error(`发话失败：${String(res.status)}`);
  await settle(b.app);
  const line =
    (await rows(b.app, b.world.loopId)).find(
      (r) => r.record.type === 'user_message' && r.record.text === text,
    )?.line ?? 0;
  b.world.learnerLine = line;
  return line;
}

/** 申请收口 → 守卫判合上 → 学习者确认；等后台跑完。 */
export async function closeLearning(b: Booted): Promise<void> {
  const loopId = b.world.loopId;
  await post(b.app, `/sessions/${loopId}/close-request`);
  await waitFor('判完了', async () =>
    (await rows(b.app, loopId)).some((r) => r.record.type === 'guard_verdict'),
  );
  await settle(b.app);
  const res = await post(b.app, `/sessions/${loopId}/confirm-close`, { note: '懂了' });
  if (res.status !== 202) throw new Error(`确认合上失败：${await res.text()}`);
  await settle(b.app);
}

/** 学习者点“先到这里”（没合上）；等后台跑完。 */
export async function endUnclosed(b: Booted, note = '先到这里，想先去学别的'): Promise<void> {
  const res = await post(b.app, `/sessions/${b.world.loopId}/end`, { note });
  if (res.status !== 202) throw new Error(`结束失败：${await res.text()}`);
  await settle(b.app);
}

/**
 * 主路径：请卡 → 学 → 合上（之后自动出下一张卡）→ 选下一张卡的第一项 → 说一句 → 没合上就结束。
 * 走完时两次学习都结束了，导航、守卫、状态整理、教法记录整理都开过。
 */
export async function mainPath(b: Booted): Promise<{ closedLoop: string; unclosedLoop: string }> {
  const closedLoop = await openLearning(b);
  await learnerSays(b);
  await closeLearning(b);
  const madeLine =
    (await rows(b.app, b.world.mainId)).filter((r) => r.record.type === 'choice_made').at(-1)
      ?.line ?? 0;
  const unclosedLoop = await choose(b, await cardAfter(b.app, b.world.mainId, madeLine));
  await learnerSays(b, '我还是不太明白，今天有点累');
  await endUnclosed(b);
  return { closedLoop, unclosedLoop };
}

/** 全部会话（经 HTTP）。 */
export async function sessions(app: App): Promise<{ sessionId: string; kind: string }[]> {
  return (await getJson<{ sessions: { sessionId: string; kind: string }[] }>(app, '/sessions'))
    .sessions;
}
