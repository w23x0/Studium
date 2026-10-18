// 验收（W6）：单子对学习者可见、可改（docs/设计/记录/单子与路线.md「单子」规矩“可见可改”）：
// POST /api/sessions/:loopId/ticket-edit → 学习正本追加 ticket_edited（改前、改后、时间），单子原行不改；
// 学习对话下一轮的程序事实告知改动；守卫、学过的记录、依据视图都用改后的单子；对话里显示一句日常话。
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import type { NumberedRecord } from '../../src/shared/records.ts';
import { toUiMessages } from '../../src/ui/thread-model.ts';
import { call } from '../helpers/http.ts';
import {
  boot,
  choose,
  closeAndConfirm,
  editTicket,
  endUnclosed,
  getOk,
  inputsByTool,
  inputsOf,
  newFlow,
  requestCard,
  rows,
  say,
  settled,
  type Loose,
} from './共用/w6-flow.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

const NEW_POINT = '位移：一段时间里位置的变化量，只看起点和终点';
const CLAUSE = '从坐标相减出发，看出位移带正负、正负就是方向';
const START = [{ point: '直线上用坐标表示位置', source: '自述' }];
const NEW_POINT_2 = '位移与路程的区别';
const INTERNAL = ['闭环', 'M0', 'M1', '单子', '新点', '出发点', '子句', '程序事实'];

describe('学习者改单子', () => {
  it('追加 ticket_edited、原行不改；下一轮告知学习对话；守卫、学过的记录、依据视图都按改后的', async () => {
    const flow = newFlow();
    const { app, fake, mainId } = await boot(flow);
    apps.push(app);
    const cardId = await requestCard(app, mainId);
    const loopId = await choose(app, cardId, 0);
    const opened = (await rows(app, loopId)).find((r) => r.record.type === 'session_opened');
    const original = structuredClone(opened?.record.ticket) as Loose;
    expect(original.newPoint, '开学习时的单子').toBe('p-displacement');
    await say(app, loopId, flow);

    // 第一次改：新点、预期理解、出发点
    const res = await editTicket(app, loopId, {
      newPoint: NEW_POINT,
      clause: CLAUSE,
      startPoints: START,
    });
    expect(res.status, '改单子成功回 200').toBe(200);
    const body = (await res.json()) as { line: number; ticket: Loose };
    const expected = { ...original, newPoint: NEW_POINT, clause: CLAUSE, startPoints: START };
    expect(body.ticket, '回给界面的是改后的整张单子').toEqual(expected);
    const recs = await settled(app, loopId);
    let all = await rows(app, loopId);
    const edit = all.find((r) => r.line === body.line)?.record;
    expect(edit, '学习正本里追加一条 ticket_edited').toMatchObject({
      type: 'ticket_edited',
      by: 'learner',
      before: original,
      after: expected,
    });
    expect(typeof edit?.at, '记了时间').toBe('string');
    expect(
      all.find((r) => r.record.type === 'session_opened')?.record.ticket,
      '开学习那一行的单子不改',
    ).toEqual(original);
    const card = (await rows(app, mainId)).find(
      (r) => r.record.type === 'choice_card' && r.record.cardId === cardId,
    );
    expect((card?.record.options as { ticket: Loose }[])[0]?.ticket, '卡上的单子不改').toEqual(
      original,
    );

    // 学习对话下一轮：程序事实告知改动（改前、改后都在），模型看得到
    const fact = all.find((r) => r.line > body.line && r.record.type === 'program_fact');
    expect(String(fact?.record.text), '改单子后的程序事实写了改后的新点').toContain(NEW_POINT);
    expect(String(fact?.record.text), '也写了改前的新点').toContain('p-displacement');
    expect(
      inputsOf(fake, loopId).some((t) => t.includes(NEW_POINT)),
      '学习对话收到了改动',
    ).toBe(true);

    // 对话里一句日常话（不露内部词）
    const ui = toUiMessages(recs, '').find((m) => m.line === body.line);
    expect(ui?.role, '改单子在对话里显示成一句提示').toBe('system');
    expect(ui?.text ?? '', '提示里说“改了”').toContain('改');
    expect(
      INTERNAL.filter((w) => (ui?.text ?? '').includes(w)),
      '提示不露内部词',
    ).toEqual([]);

    // 第二次改：改前 = 第一次改后
    const res2 = await editTicket(app, loopId, { newPoint: NEW_POINT_2 });
    expect(res2.status, '第二次改也成功').toBe(200);
    const line2 = ((await res2.json()) as { line: number }).line;
    await settled(app, loopId);
    all = await rows(app, loopId);
    const edit2 = all.find((r) => r.line === line2)?.record;
    expect((edit2?.before as Loose).newPoint, '第二次的改前是第一次的改后').toBe(NEW_POINT);
    expect(edit2?.after, '只改了新点，其余照第一次改后').toEqual({
      ...expected,
      newPoint: NEW_POINT_2,
    });

    // 依据视图：单子是改后的，带两次改动
    const ev = await getOk<{ loop: { ticket: Loose } }>(app, `/loops/${loopId}/evidence`);
    expect(ev.loop.ticket.newPoint, '依据视图的单子是改后的（平铺，带 refs / edits）').toBe(
      NEW_POINT_2,
    );
    const edits = ev.loop.ticket.edits as { line: number; before: Loose; after: Loose }[];
    expect(
      edits.map((e) => e.line),
      '依据视图列出两次改动的行',
    ).toEqual([body.line, line2]);

    // 守卫按改后的单子判
    const guardBefore = inputsByTool(fake, 'submit_verdict').length;
    await closeAndConfirm(app, loopId);
    const guardInput = inputsByTool(fake, 'submit_verdict').slice(guardBefore).join('\n');
    expect(guardInput, '守卫开场里是改后的新点').toContain(NEW_POINT_2);

    // 学过的记录：上层单子是改后的，带改动行
    const learned = await getOk<{ learning: Loose }>(app, `/learned/${loopId}`);
    expect((learned.learning.ticket as Loose).newPoint, '上层单子是改后的').toBe(NEW_POINT_2);
    expect(
      (learned.learning.ticketEdits as { line: number }[]).map((e) => e.line),
      '学过的记录指回两次改动',
    ).toEqual([body.line, line2]);
  });

  it('不合格的改动退回 400、什么都不写；不是学习 400、没有这个会话 404；结束后不能改', async () => {
    const flow = newFlow();
    const { app, mainId } = await boot(flow);
    apps.push(app);
    const loopId = await choose(app, await requestCard(app, mainId), 0);
    const errors: string[] = [];
    const bad = async (b: Loose, why: string): Promise<void> => {
      const res = await editTicket(app, loopId, b);
      expect(res.status, why).toBe(400);
      errors.push(((await res.json()) as { error: string }).error);
    };
    await bad({}, '什么都没给');
    await bad({ newPoint: '   ' }, '新点是空白');
    await bad({ clause: 3 }, '预期理解不是文字');
    await bad({ startPoints: [] }, '出发点给了空数组');
    await bad({ startPoints: [{ point: '位置', source: '瞎说' }] }, '出发点来源不在三档里');
    await bad({ startPoints: [{ point: '', source: '自述' }] }, '出发点是空的');
    await bad(
      { startPoints: [{ point: '位置', source: '学过的记录', ref: 'no-such-session:3' }] },
      '出发点的依据定位不了',
    );
    await bad({ newPoint: 'p-displacement' }, '和现在的单子一样，没有改动');
    let recs: NumberedRecord[] = await settled(app, loopId);
    expect(
      recs.filter((r) => (r.record as unknown as Loose).type === 'ticket_edited'),
      '退回的都不写记录',
    ).toEqual([]);

    const onMain = await editTicket(app, mainId, { newPoint: 'x' });
    expect(onMain.status, '主对话不是学习').toBe(400);
    expect((await editTicket(app, 'no-such-loop', { newPoint: 'x' })).status, '没有这个会话').toBe(
      404,
    );

    await endUnclosed(app, loopId, '今天先到这');
    await bad({ newPoint: '结束后再改' }, '学习结束后不能改');
    recs = await settled(app, loopId);
    expect(
      recs.filter((r) => (r.record as unknown as Loose).type === 'ticket_edited'),
      '结束后也不写',
    ).toEqual([]);
    expect(
      errors.filter((e) => typeof e !== 'string' || e.trim() === ''),
      '每条退回都说明原因',
    ).toEqual([]);
    expect(
      errors.filter((e) => /闭环|M0|M1/.test(e)),
      '退回说明不露旧叫法',
    ).toEqual([]);
    expect((await call(app, `/learned/${loopId}`)).status, '学过的记录查得到这次').toBe(200);
  });
});
