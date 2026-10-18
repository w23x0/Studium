// W5 验收共用：假模型按工具名认会话；谈方向（settle_goal 新形状）、出卡、学、判几步。
// 只依赖 createApp、假模型、tests/helpers/http.ts 与 tmp.ts；不认会话种类字符串（W7 改名）。
// 学习对话只用文字（W4 起只有 request_close / end_loop_unclosed 两个命令）。
import { createApp, type App } from '../../../src/core/app.ts';
import { FakeModel, type FakeContext, type FakeStep } from '../../../src/core/model/fake.ts';
import type { ConversationSpec } from '../../../src/core/model/port.ts';
import type { NumberedRecord } from '../../../src/shared/records.ts';
import { getJson, post, records, TOKEN, waitFor } from '../../helpers/http.ts';
import { tempDir } from '../../helpers/tmp.ts';

/** 宽松形状：W5 才加的字段（abilities、supersedes、webSearch、preface……）现有类型里还没有。 */
export type Loose = Record<string, unknown>;

/** 书里能定位的一行（样例书），卡的出处与路线决定的依据用它。 */
export const BOOK_LINE = '力学入门样例/ch01/sec-1.2.md:3';
export const SAY = '位移就是终点减起点';
export const UNDERSTANDING = '能说出位移只看起点和终点，与路径无关';
export const DECISION = '继续主线：先学位移';

export const ABILITY_A = '能自己推导常见的运动学问题';
export const REASON_A = '想看懂大学物理课上的推导';
export const CONFIRMED_A = '自己推一遍才放心';
export const ABILITY_B = '能用牛顿定律分析受力';
export const REASON_B = '后面学工程力学要用';
export const ORDER_HINT = '先运动学，后动力学';

/** 一份合规的 settle_goal 参数（W5 形状）。 */
export function goodGoal(extra: Loose = {}): Loose {
  return {
    title: '经典力学',
    abilities: [
      { ability: ABILITY_A, reason: REASON_A, confirmed_reason: CONFIRMED_A },
      { ability: ABILITY_B, reason: REASON_B },
    ],
    order_hint: ORDER_HINT,
    ...extra,
  };
}

export interface W5State {
  mainId: string;
  /** 畅谈里学习者说“定了”时交的参数；参数是学习者这句话的行号。 */
  settle: (learnerLine: number) => Loose;
  /** 守卫要引的学习者行（测试在学习者说完后填）。 */
  evidenceLine: number;
}

export function newW5(): W5State {
  return { mainId: '', settle: () => goodGoal(), evidenceLine: 0 };
}

export function has(spec: ConversationSpec, tool: string): boolean {
  return spec.tools.some((t) => t.name === tool);
}

/** 程序交给模型的每条消息前印着“[第 N 行]”。 */
export function ownLine(text: string): number {
  return Number(/\[第 (\d+) 行\]/.exec(text)?.[1] ?? 0);
}

function option(title: string): Loose {
  return {
    new_point: title,
    clause: `从位置接到${title}`,
    start_points: [{ point: '位置', source: '假定' }],
    route_action: '继续主线',
    title,
    reason: `接着学${title}`,
    sources: [BOOK_LINE],
    source_check: [],
  };
}

export function responder(st: W5State) {
  return (ctx: FakeContext): FakeStep | undefined => {
    const learner = ctx.input.role === 'learner';
    const text = ctx.input.text;
    if (has(ctx.spec, 'open_goal_talk')) {
      if (learner && text.includes('想学')) {
        return { calls: [{ name: 'open_goal_talk', args: {} }], text: '我们单独谈谈。' };
      }
      if (learner && text.includes('学过什么')) {
        return { calls: [{ name: 'list_learned', args: {} }], text: '列好了。' };
      }
      return { text: '好。' };
    }
    if (has(ctx.spec, 'settle_goal')) {
      if (!learner) return { text: '你想学到什么程度？' };
      if (text.includes('定了')) {
        return {
          calls: [{ name: 'settle_goal', args: st.settle(ownLine(text)) }],
          text: '那就这么定。',
        };
      }
      return { text: '再说说？' };
    }
    if (has(ctx.spec, 'submit_choice_card')) {
      return {
        calls: [
          {
            name: 'submit_choice_card',
            args: {
              options: [option('位移'), option('平均速度')],
              recommended: 0,
              route_decision: {
                decision: DECISION,
                reason: '位移是速度的出发点',
                basis: [BOOK_LINE],
              },
            },
          },
        ],
      };
    }
    if (has(ctx.spec, 'submit_verdict')) {
      const line = st.evidenceLine;
      return {
        calls: [
          {
            name: 'submit_verdict',
            args: {
              closed: true,
              basis: `学习者自己说清了位移（L${String(line)}）`,
              evidence_lines: [line],
              understanding: [
                { text: UNDERSTANDING, lines: [line], independence: '独立', durability: '仅当场' },
              ],
            },
          },
        ],
      };
    }
    if (has(ctx.spec, 'request_close')) {
      return { text: learner ? '好，换个情境再说说？' : '你说说位移是什么？' };
    }
    return undefined;
  };
}

export async function boot(st: W5State): Promise<{ app: App; fake: FakeModel; mainId: string }> {
  const fake = new FakeModel({ responder: responder(st) });
  const app = await createApp({ dataRoot: await tempDir(), model: fake, token: TOKEN, port: 0 });
  st.mainId = await app.studium.ensureMain();
  return { app, fake, mainId: st.mainId };
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

export async function lastLine(app: App, id: string): Promise<number> {
  return (await records(app, id)).at(-1)?.line ?? 0;
}

/** 主对话里说一句带“想学”的话 → 开出畅谈 → 等畅谈先开口；返回畅谈 id。 */
export async function openTalk(app: App, mainId: string, text = '我想学力学'): Promise<string> {
  const after = await lastLine(app, mainId);
  await post(app, `/sessions/${mainId}/messages`, { text });
  const talkId = await waitFor(
    '开出畅谈',
    async () => {
      const r = (await records(app, mainId)).find(
        (x) => x.record.type === 'task_opened' && x.line > after,
      );
      return r?.record.type === 'task_opened' ? r.record.sessionId : undefined;
    },
    3000,
  );
  await settled(app, talkId);
  return talkId;
}

/** 畅谈里学习者说一句（带“定了”就交回），等畅谈和后台都停下。 */
export async function talkSays(app: App, talkId: string, text: string): Promise<void> {
  await post(app, `/sessions/${talkId}/messages`, { text });
  await settled(app, talkId);
  await app.studium.settled();
}

/** 某会话里某工具的调用记录（按先后）。 */
export async function toolCalls(app: App, id: string, name: string): Promise<Loose[]> {
  return (await records(app, id))
    .map((r) => r.record as unknown as Loose)
    .filter((r) => r.type === 'tool_call' && r.name === name);
}

/** 主对话里的方向目标记录（带行号），按先后。 */
export async function goals(app: App, mainId: string): Promise<{ line: number; rec: Loose }[]> {
  return (await records(app, mainId))
    .filter((r) => r.record.type === 'project_goal')
    .map((r) => ({ line: r.line, rec: r.record as unknown as Loose }));
}

/** 请卡 → 选第一项 → 学习者说 SAY → 申请收口 → 确认合上 → 等后台跑完；返回学习 id。 */
export async function learnOnce(app: App, st: W5State): Promise<string> {
  const after = await lastLine(app, st.mainId);
  await post(app, '/cards/request', { projectId: st.mainId });
  const cardId = await waitFor(
    '出了选择卡',
    async () => {
      const r = (await records(app, st.mainId)).find(
        (x) => x.record.type === 'choice_card' && x.line > after,
      );
      return r?.record.type === 'choice_card' ? r.record.cardId : undefined;
    },
    3000,
  );
  const res = await post(app, `/cards/${cardId}/choose`, { option: 0 });
  if (res.status !== 201) throw new Error(`选卡失败：${String(res.status)} ${await res.text()}`);
  const loopId = ((await res.json()) as { loopSessionId: string }).loopSessionId;
  await settled(app, loopId);
  await post(app, `/sessions/${loopId}/messages`, { text: SAY });
  const recs = await settled(app, loopId);
  st.evidenceLine =
    recs.find((r) => r.record.type === 'user_message' && r.record.text === SAY)?.line ?? 0;
  await post(app, `/sessions/${loopId}/close-request`);
  await waitFor(
    '守卫判定',
    async () => (await records(app, loopId)).some((r) => r.record.type === 'guard_verdict'),
    3000,
  );
  await settled(app, loopId);
  const ok = await post(app, `/sessions/${loopId}/confirm-close`, { note: '懂了' });
  if (ok.status !== 202) throw new Error(`确认合上失败：${await ok.text()}`);
  await app.studium.settled();
  return loopId;
}

/** 假模型开过的会话里，带某工具的那些 spec。 */
export function specsWith(fake: FakeModel, tool: string): ConversationSpec[] {
  return fake.opened.filter((s) => has(s, tool));
}

/** 某种会话（按工具认）收到的输入文字，按先后。 */
export function inputsWith(fake: FakeModel, tool: string): string[] {
  return fake.inputs.filter((i) => has(i.spec, tool)).map((i) => i.text);
}
