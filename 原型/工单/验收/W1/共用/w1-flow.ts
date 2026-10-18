// W1 验收共用：起核心（假模型）、按工具名认会话、出卡 / 选卡、读主对话记录。
// 只依赖会一直留着的东西（http.ts、tmp.ts、createApp、假模型）；W1 才加的类型在这里写成宽松的本地形状。
import { createApp, type App } from '../../../src/core/app.ts';
import { FakeModel, type FakeContext, type FakeStep } from '../../../src/core/model/fake.ts';
import { getJson, post, TOKEN, waitFor } from '../../helpers/http.ts';
import { tempDir } from '../../helpers/tmp.ts';

/** 正本里的一行（宽松：W1 才加的记录类型现在的类型里没有）。 */
export interface Row {
  line: number;
  record: { type: string } & Record<string, unknown>;
}

export interface RecordsBody {
  records: Row[];
  running: boolean;
}

export type Role = 'nav' | 'guard' | 'loop' | 'talk' | 'state' | 'pedagogy' | 'retrieve' | 'other';

/** 按工具名认会话种类（不认 m05 这类种类字符串，W7 会改名）。 */
export function roleOf(ctx: FakeContext): Role {
  const has = (n: string): boolean => ctx.spec.tools.some((t) => t.name === n);
  if (has('submit_choice_card')) return 'nav';
  if (has('submit_verdict')) return 'guard';
  if (has('request_close')) return 'loop';
  if (has('settle_goal')) return 'talk';
  if (has('write_state_record')) return 'state';
  if (has('write_strategy_record')) return 'pedagogy';
  if (has('submit_findings')) return 'retrieve';
  return 'other';
}

/** 书里确实有的一行（样例书库）：位移的定义。 */
export const BOOK_LINE = '力学入门样例/ch01/sec-1.1.md:5';

/** 一条能定位的路线决定（依据指回主对话第 1 行）。 */
export function routeDecision(mainId: string, decision = '维持主线：先学位移') {
  return { decision, reason: '项目刚开始，从最近的一步走起', basis: [`${mainId}:1`, BOOK_LINE] };
}

/** 一个合格的文字选项。 */
export function textOption(mainId: string, over: Record<string, unknown> = {}) {
  return {
    new_point: '位移：一段时间内位置的变化量，只看起点和终点',
    clause: '从“用坐标 x 表示位置”出发，两个时刻的坐标相减，得到带正负的位移',
    start_points: [
      { point: '直线上用坐标 x 表示位置', source: '学过的记录', ref: `${mainId}:1` },
      { point: '减法结果的正负', source: '假定' },
    ],
    route_action: '继续主线',
    title: '先学位移',
    reason: '接着你已经会的“位置”往下走',
    sources: ['导航现场说出', BOOK_LINE],
    source_check: [
      { claim: '书里把位置的变化量叫位移', at: BOOK_LINE },
      { claim: '位移和路程的区别最好用来回走的例子讲', model_added: true },
    ],
    ...over,
  };
}

/** 学习对话、守卫等的默认应答：只说话，不调专用工具（W4 起学习对话只剩两个命令）。 */
export function quiet(ctx: FakeContext): FakeStep | undefined {
  return roleOf(ctx) === 'nav' ? undefined : { text: '好。' };
}

export async function startApp(
  responder: (ctx: FakeContext, mainId: string) => FakeStep | undefined,
): Promise<{ app: App; model: FakeModel; mainId: string }> {
  const box = { mainId: '' };
  const model = new FakeModel({
    responder: (ctx) => responder(ctx, box.mainId) ?? quiet(ctx),
  });
  const app = await createApp({ dataRoot: await tempDir(), model, token: TOKEN, port: 0 });
  box.mainId = await app.studium.ensureMain();
  return { app, model, mainId: box.mainId };
}

export async function rows(app: App, sessionId: string): Promise<Row[]> {
  return (await getJson<RecordsBody>(app, `/sessions/${sessionId}/records`)).records;
}

/** 等会话停下（不在跑），返回它的记录。 */
export async function settled(app: App, sessionId: string): Promise<Row[]> {
  return waitFor(`${sessionId} 停下`, async () => {
    const r = await getJson<RecordsBody>(app, `/sessions/${sessionId}/records`);
    return r.running ? undefined : r.records;
  });
}

/** 出过选择卡的导航会话 id（按假模型打开的对话里挂着 submit_choice_card 认）。 */
export function navSessionIds(model: FakeModel): string[] {
  return model.opened
    .filter((s) => s.tools.some((t) => t.name === 'submit_choice_card'))
    .map((s) => s.session?.id ?? '')
    .filter((id) => id !== '');
}

/** 请一张卡，等主对话里出现新的 choice_card，返回它所在的行。 */
export async function requestCard(app: App, mainId: string): Promise<Row> {
  const before = (await rows(app, mainId)).at(-1)?.line ?? 0;
  const res = await post(app, '/cards/request', { projectId: mainId });
  if (res.status !== 202) throw new Error(`请卡失败：${String(res.status)}`);
  // 等待比测试超时短，交不出卡时报“等不到”而不是测试超时
  return waitFor(
    '出了新的选择卡（导航交的卡被收下）',
    async () =>
      (await rows(app, mainId)).find((r) => r.record.type === 'choice_card' && r.line > before),
    3000,
  );
}

/** 请一张卡但模型交不出合格的卡：等导航会话停下，返回它的记录。 */
export async function requestCardAndWaitNav(
  app: App,
  model: FakeModel,
  mainId: string,
): Promise<Row[]> {
  const n = navSessionIds(model).length;
  const res = await post(app, '/cards/request', { projectId: mainId });
  if (res.status !== 202) throw new Error(`请卡失败：${String(res.status)}`);
  const navId = await waitFor('开了导航会话', () => Promise.resolve(navSessionIds(model)[n]));
  await waitFor('导航调过交卡工具', async () =>
    (await rows(app, navId)).some(
      (r) => r.record.type === 'tool_call' && r.record.name === 'submit_choice_card',
    ),
  );
  await app.studium.settled();
  return settled(app, navId);
}

export async function choose(
  app: App,
  cardId: string,
  option: number,
): Promise<{ status: number; loopSessionId?: string }> {
  const res = await post(app, `/cards/${cardId}/choose`, { option });
  const body = (await res.json()) as { loopSessionId?: string };
  return {
    status: res.status,
    ...(body.loopSessionId !== undefined ? { loopSessionId: body.loopSessionId } : {}),
  };
}

/** 假模型在某个会话里看到的第一条输入（开场）。 */
export function openingOf(model: FakeModel, sessionId: string): string {
  return model.inputs.find((i) => i.spec.session?.id === sessionId)?.text ?? '';
}
