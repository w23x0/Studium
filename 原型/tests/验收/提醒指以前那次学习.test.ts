// 验收（W3）：提醒（应用内）——“复检”不再指知识点，指以前那次学习（loopSessionId）；学习者或导航可加，只追加；
// 到期进“今天该做的”；办完另起一条；导航开场看得到没办的；开出复检那次学习的单子时程序顺手办掉。
// 设计：docs/设计/会话/导航.md「二级功能」计划、日程与提醒、复检；工单 README §2.1 revisit。
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import { getJson, post, records } from '../helpers/http.ts';
import {
  advanceDays,
  choose,
  learnAndClose,
  navOpenings,
  newW3,
  ofType,
  opt,
  requestCard,
  sessionsWithTool,
  startW3,
} from './共用/w3-flow.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

type Reminder = {
  id: string;
  due: string;
  isDue: boolean;
  kind: string;
  text: string;
  by: string;
  loopSessionId?: string;
  closed?: { outcome: string; by: string };
};

async function closedLoop(app: App, mainId: string): Promise<string> {
  const a = await choose(app, (await requestCard(app, mainId)).cardId, 0);
  await learnAndClose(app, a);
  return a;
}

describe('提醒指以前那次学习（W3）', () => {
  it('学习者加复检提醒：指以前那次学习；到期进今天该做的；办完另起一条；不对的退回', async () => {
    const st = newW3();
    const { app, mainId } = await startW3(st);
    apps.push(app);
    const a = await closedLoop(app, mainId);
    const path = `/projects/${mainId}/reminders`;
    const add = await post(app, path, {
      due: '2026-10-03',
      text: '复检那次学的位移',
      kind: 'recheck',
      loopSessionId: a,
    });
    expect(add.status, '加复检提醒').toBe(201);
    const r = ((await add.json()) as { reminder: Reminder }).reminder;
    expect(r).toMatchObject({ kind: 'recheck', loopSessionId: a, isDue: false });
    const row = ofType(await records(app, mainId), 'reminder_added').at(-1)?.record;
    expect(row?.loopSessionId, '记录指那次学习').toBe(a);
    expect(row && 'point' in row, '记录里不再有知识点').toBe(false);

    for (const bad of [
      { text: 'x', due: '2026-10-09', kind: 'recheck' },
      { text: 'x', due: '2026-10-09', kind: 'recheck', point: 'p-displacement' },
      { text: 'x', due: '2026-10-09', kind: 'recheck', loopSessionId: 'no-such-loop' },
      { text: '', due: '2026-10-09' },
      { text: 'x', due: '2026-02-30' },
    ]) {
      expect((await post(app, path, bad)).status, JSON.stringify(bad)).toBe(400);
    }

    advanceDays(st, 3);
    const today = await getJson<{ items: { kind: string; reminder?: Reminder }[] }>(
      app,
      `/projects/${mainId}/today`,
    );
    expect(today.items.find((i) => i.kind === 'reminder')?.reminder?.id, '到期进今天该做的').toBe(
      r.id,
    );
    expect((await post(app, `${path}/${r.id}`, { outcome: 'done' })).status, '办完').toBe(200);
    const all = (await getJson<{ reminders: Reminder[] }>(app, path)).reminders;
    expect(all.find((x) => x.id === r.id)?.closed).toMatchObject({
      outcome: 'done',
      by: 'learner',
    });
    expect(ofType(await records(app, mainId), 'reminder_closed').length, '另起一条').toBe(1);
  });

  it('导航加复检提醒；下次开场看得到；开出复检那次学习时程序顺手办掉', async () => {
    const st = newW3();
    const { app, mainId, fake } = await startW3(st);
    apps.push(app);
    const a = await closedLoop(app, mainId);
    const verdictLine =
      ofType(await records(app, a), 'guard_verdict').find((v) => v.record.closed)?.line ?? 0;

    st.navBefore = [
      {
        name: 'add_reminder',
        args: { due: '2026-10-08', text: '回头复检那次', kind: 'recheck', loop: a },
      },
      // 只给知识点、不指学习：退回
      {
        name: 'add_reminder',
        args: { due: '2026-10-08', text: '复检某点', kind: 'recheck', point: 'p-displacement' },
      },
    ];
    await requestCard(app, mainId);
    const nav = sessionsWithTool(fake, 'add_reminder').at(-1) ?? '';
    const calls = ofType(await records(app, nav), 'tool_call').filter(
      (r) => r.record.name === 'add_reminder',
    );
    expect(
      calls.map((c) => c.record.isError),
      '指学习的收下，只给点的退回',
    ).toEqual([false, true]);
    const open = (
      await getJson<{ reminders: Reminder[] }>(app, `/projects/${mainId}/reminders?open=1`)
    ).reminders;
    expect(open).toHaveLength(1);
    expect(open[0]).toMatchObject({ kind: 'recheck', loopSessionId: a });

    // 下一次导航开场看得到；卡上出“复检那次”（revisit 指以前那次学习与判定行），选了就办掉提醒
    const revisit = { kind: '复检', of_loop: a, verdict_line: verdictLine };
    st.nextOptions = [opt('复检那次', { route_action: '复检', revisit }), opt('别的')];
    const card = await requestCard(app, mainId);
    const opening = navOpenings(fake).at(-1) ?? '';
    expect(opening, '开场列没办的提醒').toContain('回头复检那次');
    await choose(app, card.cardId, 0);
    const after = (await getJson<{ reminders: Reminder[] }>(app, `/projects/${mainId}/reminders`))
      .reminders;
    expect(after[0]?.closed, '开出复检那次学习，程序办掉提醒').toMatchObject({
      outcome: 'done',
      by: 'program',
    });
  });
});
