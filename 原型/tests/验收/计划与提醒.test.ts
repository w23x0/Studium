// 验收：计划、日程与提醒（M05:30，应用内，不做系统通知）。只经 HTTP 验证，模型是假模型。
// - 学习者或 M05 可加提醒（什么时候、做什么：复检某点、接着某个闭环、期限前、其他），只追加；
// - 接口列出到期的提醒；项目概览带“今天该做的”（到期提醒、期限临近）；
// - 办完 / 不要了是另起一条记录，原提醒不改；对上的闭环开出来时程序顺手办掉；
// - M05 开场看得到没办的提醒。
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import type {
  ProjectOverviewResponse,
  RemindersResponse,
  TodayView,
} from '../../src/shared/protocol.ts';
import { openLoop } from '../helpers/detour-flow.ts';
import { SAY, settled } from '../helpers/evidence-flow.ts';
import { getJson, post, records } from '../helpers/http.ts';
import {
  advanceDays,
  AVG_OPTION,
  DISPLACEMENT_SRC,
  hasTool,
  learnAndClose,
  newLong,
  startLong,
} from '../helpers/longterm-flow.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

type Added = { reminder: { id: string; due: string; isDue: boolean } };

describe('计划与提醒', () => {
  it('学习者加提醒：只追加；到期的列出来，进“今天该做的”；办完另起一条记录', async () => {
    const st = newLong();
    const { app, mainId } = await startLong(st);
    apps.push(app);
    const add = await post(app, `/projects/${mainId}/reminders`, {
      due: '2026-10-03',
      text: '复检位移',
      kind: 'recheck',
      point: 'p-displacement',
    });
    expect(add.status).toBe(201);
    const r = ((await add.json()) as Added).reminder;
    expect(r.isDue).toBe(false);
    await post(app, `/projects/${mainId}/reminders`, { due: '2026-10-20', text: '随便看看' });

    // 还没到期：今天该做的里没有
    expect((await getJson<TodayView>(app, `/projects/${mainId}/today`)).items).toHaveLength(0);
    advanceDays(st, 3);
    const today = await getJson<TodayView>(app, `/projects/${mainId}/today`);
    expect(today.date).toBe('2026-10-04');
    expect(today.items).toHaveLength(1);
    const item = today.items[0];
    expect(item?.kind).toBe('reminder');
    if (item?.kind !== 'reminder') throw new Error('应当是提醒');
    expect(item.overdueDays).toBe(1);
    expect(item.reminder).toMatchObject({ id: r.id, text: '复检位移', isDue: true });
    // 项目概览带着
    const o = (await getJson<ProjectOverviewResponse>(app, `/projects/${mainId}/overview`))
      .overview;
    expect(o.today?.items).toHaveLength(1);

    // 办完：另起一条记录，原来那条提醒记录没有被改
    const rawBefore = (await records(app, mainId)).filter(
      (x) => x.record.type === 'reminder_added',
    );
    expect(
      (await post(app, `/projects/${mainId}/reminders/${r.id}`, { outcome: 'done' })).status,
    ).toBe(200);
    const rawAfter = (await records(app, mainId)).filter((x) => x.record.type === 'reminder_added');
    expect(JSON.stringify(rawAfter)).toBe(JSON.stringify(rawBefore));
    expect(
      (await records(app, mainId)).filter((x) => x.record.type === 'reminder_closed'),
    ).toHaveLength(1);
    expect((await getJson<TodayView>(app, `/projects/${mainId}/today`)).items).toHaveLength(0);
    const open = await getJson<RemindersResponse>(app, `/projects/${mainId}/reminders?open=1`);
    expect(open.reminders.map((x) => x.text)).toEqual(['随便看看']);
    const all = await getJson<RemindersResponse>(app, `/projects/${mainId}/reminders`);
    expect(all.reminders.find((x) => x.id === r.id)?.closed).toMatchObject({
      outcome: 'done',
      by: 'learner',
    });
    // 办两次、办不存在的
    expect((await post(app, `/projects/${mainId}/reminders/${r.id}`)).status).toBe(400);
    expect((await post(app, `/projects/${mainId}/reminders/no-such`)).status).toBe(400);
  });

  it('期限前几天；期限临近进今天该做的；输入不对被拒', async () => {
    const st = newLong();
    const { app, mainId } = await startLong(st);
    apps.push(app);
    // 没记期限时写不了“期限前”
    expect(
      (await post(app, `/projects/${mainId}/reminders`, { beforeDeadlineDays: 3, text: '收尾' }))
        .status,
    ).toBe(400);
    await post(app, `/projects/${mainId}/deadline`, { deadline: '2026-10-12' });
    const res = await post(app, `/projects/${mainId}/reminders`, {
      beforeDeadlineDays: 3,
      text: '期限前收尾',
      kind: 'deadline',
    });
    expect(res.status).toBe(201);
    expect(((await res.json()) as Added).reminder.due).toBe('2026-10-09');
    // 期限 11 天后：还不算临近
    expect((await getJson<TodayView>(app, `/projects/${mainId}/today`)).items).toHaveLength(0);
    advanceDays(st, 6);
    const items = (await getJson<TodayView>(app, `/projects/${mainId}/today`)).items;
    expect(items.find((i) => i.kind === 'deadline')).toMatchObject({
      date: '2026-10-12',
      daysLeft: 5,
    });

    for (const bad of [
      { text: '', due: '2026-10-09' },
      { text: 'x' },
      { text: 'x', due: '2026-02-30' },
      { text: 'x', due: '2026-10-09', kind: '不是类型' },
      { text: 'x', due: '2026-10-09', kind: 'recheck' },
      { text: 'x', due: '2026-10-09', point: '不存在的点' },
      { text: 'x', due: '2026-10-09', kind: 'resume' },
      { text: 'x', due: '2026-10-09', loopSessionId: 'no-such-loop' },
    ]) {
      expect((await post(app, `/projects/${mainId}/reminders`, bad)).status).toBe(400);
    }
  });

  it('M05 出卡时加提醒；开场看得到没办的提醒；对上的闭环开出来时程序顺手办掉', async () => {
    const st = newLong();
    const { app, mainId, fake } = await startLong(st);
    apps.push(app);
    // M05 出卡时顺手加一条“复检位移”和一条“接着某闭环”（后者指向不存在的闭环，被退回）
    st.override = (ctx) =>
      hasTool(ctx, 'add_reminder') && hasTool(ctx, 'submit_choice_card')
        ? {
            calls: [
              {
                name: 'add_reminder',
                args: {
                  due: '2026-10-08',
                  text: '回头复检位移',
                  kind: 'recheck',
                  point: 'p-displacement',
                },
              },
              {
                name: 'add_reminder',
                args: { due: '2026-10-08', text: '接着学', kind: 'resume', loop: 'no-such-loop' },
              },
              {
                name: 'submit_choice_card',
                args: { options: [DISPLACEMENT_SRC, AVG_OPTION], recommended: 0 },
              },
            ],
          }
        : undefined;
    const first = await openLoop(app, mainId, 1); // 选平均速度，不是位移
    st.override = undefined;
    const m05 = (
      await getJson<{ sessions: { sessionId: string; kind: string }[] }>(app, '/sessions')
    ).sessions.find((s) => s.kind === 'm05')?.sessionId;
    const calls = (await records(app, m05 ?? '')).flatMap((r) =>
      r.record.type === 'tool_call' && r.record.name === 'add_reminder' ? [r.record] : [],
    );
    expect(calls.map((c) => c.isError)).toEqual([false, true]);
    const listed = await getJson<RemindersResponse>(app, `/projects/${mainId}/reminders?open=1`);
    expect(listed.reminders).toHaveLength(1);
    expect(listed.reminders[0]).toMatchObject({ by: 'm05', kind: 'recheck', text: '回头复检位移' });

    // 下一次 M05 开场里看得到这条没办的提醒
    await post(app, `/sessions/${first.loopId}/messages`, { text: SAY });
    await settled(app, first.loopId);
    await post(app, '/cards/request', { projectId: mainId });
    await app.studium.settled();
    const opening = fake.inputs.filter((i) => i.text.includes('触发原因')).at(-1)?.text ?? '';
    expect(opening).toContain('提醒（还没办的）');
    expect(opening).toContain('回头复检位移');

    // 学位移（开出位移的闭环）= 对上了 recheck 位移的提醒，程序顺手办掉
    const second = await openLoop(app, mainId, 0);
    const after = await getJson<RemindersResponse>(app, `/projects/${mainId}/reminders`);
    expect(after.reminders[0]?.closed).toMatchObject({ outcome: 'done', by: 'program' });
    expect(second.loopId).not.toBe(first.loopId);
    await learnAndClose(app, second.loopId);
  });
});
