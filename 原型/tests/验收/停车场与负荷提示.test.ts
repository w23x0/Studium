// 验收：停车场与同时进行的闭环数（M04:22 · M05:26-28）。只经 HTTP 验证，模型是假模型。
// - 没合上就结束：后台让 M05 记停车记录（缺在哪个出发点、恢复计划：何时、从哪接上），先于下一张卡；
// - M05 出卡时读得到这些停车记录；堆积多了（≥3）开场提示降载、优先收尾；
// - M05 开场给“进行中 / 搁置 / 等分叉回来”的数量，已经很多时提示别再开新的（只提示，不硬拦）；
// - 项目页给同样的数量与停车场条数。
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import type { ProjectOverviewResponse } from '../../src/shared/protocol.ts';
import { getJson, post, records, waitFor } from '../helpers/http.ts';
import { SAY, settled } from '../helpers/evidence-flow.ts';
import { newDetourState, openLoop, recordsOfType, startDetourApp } from '../helpers/detour-flow.ts';
import type { FakeModel } from '../../src/core/model/fake.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

const openings = (fake: FakeModel): string[] =>
  fake.inputs.filter((i) => i.text.includes('触发原因')).map((i) => i.text);

async function overview(app: App, mainId: string): Promise<ProjectOverviewResponse['overview']> {
  return (await getJson<ProjectOverviewResponse>(app, `/projects/${mainId}/overview`)).overview;
}

/** 开一个闭环、学一句、没合上就结束，等后台（停车记录、下一张卡……）跑完。 */
async function endUnclosedLoop(app: App, mainId: string): Promise<string> {
  const { loopId } = await openLoop(app, mainId, 0);
  await post(app, `/sessions/${loopId}/messages`, { text: SAY });
  await settled(app, loopId);
  expect((await post(app, `/sessions/${loopId}/end`, { note: '今天到这' })).status).toBe(202);
  await app.studium.settled();
  return loopId;
}

describe('停车场', () => {
  it('没合上就结束：M05 记停车记录（缺在哪个出发点 + 恢复计划），先于下一张卡', async () => {
    const { app, mainId } = await startDetourApp(newDetourState());
    apps.push(app);
    const loopId = await endUnclosedLoop(app, mainId);
    const rs = await records(app, loopId);
    const note = recordsOfType(rs, 'parking_note')[0];
    expect(note?.record).toMatchObject({
      reason: 'ended_unclosed',
      missing: [{ point: 'p-displacement', text: '位移只看起点终点还没弄清' }],
      when: '下次进来先补位移',
      resumeFrom: '位移那一段，再回平均速度',
    });
    // 依据行是闭环里学习者的话
    const said = rs.find((r) => r.record.type === 'user_message' && r.record.text === SAY);
    expect(note?.record.basisLines).toEqual([said?.line]);
    // 记停车记录的是 M05 的一个会话，挂在这个闭环下
    const m05 = await records(app, note?.record.m05SessionId ?? '');
    expect(m05[0]?.record).toMatchObject({ type: 'session_opened', kind: 'm05', parent: loopId });
    // 顺序：停车记录 → 下一张卡
    const steps = recordsOfType(rs, 'after_loop_step');
    expect(steps.map((r) => r.record.step)).toEqual(['parked', 'card_ready']);
    // 项目页的“没合上”里带着这条记录
    const o = await overview(app, mainId);
    expect(o.groups.unclosed[0]?.parking).toMatchObject({
      reason: 'ended_unclosed',
      when: '下次进来先补位移',
    });
    expect(o.groups.unclosed[0]?.parking?.missing[0]?.point).toMatchObject({
      id: 'p-displacement',
      name: '位移',
    });
    expect(o.load).toMatchObject({ parked: 1, parkingPile: false });
  });

  it('停车记录没记成不挡后面：记一条失败步骤，下一张卡照出', async () => {
    const st = newDetourState();
    // 缺口说不到 M08 的点上：交回的点不在 M08，工具退回，M05 没交出停车记录
    st.parking = { missing: [{ point: 'p-不存在', text: 'x' }], when: 'a', resume_from: 'b' };
    const { app, mainId } = await startDetourApp(st);
    apps.push(app);
    const { loopId } = await openLoop(app, mainId, 0);
    await post(app, `/sessions/${loopId}/end`, { note: '到这' });
    await app.studium.settled();
    const steps = recordsOfType(await records(app, loopId), 'after_loop_step').map((r) => r.record);
    expect(steps.map((s) => s.step)).toEqual(['failed', 'card_ready']);
    expect(steps[0]?.detail).toContain('停车记录');
    expect(recordsOfType(await records(app, loopId), 'parking_note')).toHaveLength(0);
  });

  it('M05 出卡时读得到停车记录；堆积 ≥3 条开场提示降载、优先收尾', async () => {
    const { app, mainId, fake } = await startDetourApp(newDetourState());
    apps.push(app);
    await endUnclosedLoop(app, mainId);
    // 第 1 条：开场里已经有这条停车记录，没到堆积
    const first = openings(fake).at(-1) ?? '';
    expect(first).toContain('停车场（没合上就结束、缺口还没补上）：1 条');
    expect(first).toContain('缺：p-displacement「位移」');
    expect(first).toContain('恢复计划：下次进来先补位移，从位移那一段，再回平均速度接上');
    expect(first).not.toContain('停车场堆积了');

    await endUnclosedLoop(app, mainId);
    expect(openings(fake).at(-1)).not.toContain('停车场堆积了');
    await endUnclosedLoop(app, mainId);
    const third = openings(fake).at(-1) ?? '';
    expect(third).toContain('停车场（没合上就结束、缺口还没补上）：3 条');
    expect(third).toContain('停车场堆积了：降载');
    expect(third).toContain('优先“接着学没合上的');
    const o = await overview(app, mainId);
    expect(o.load).toMatchObject({ parked: 3, parkingPile: true });
  });

  it('停车场里的点后来合上了就不再算积压', async () => {
    const { app, mainId, fake } = await startDetourApp(newDetourState());
    apps.push(app);
    await endUnclosedLoop(app, mainId);
    // 同一个新点（位移）这次合上了
    const { loopId } = await openLoop(app, mainId, 0);
    await post(app, `/sessions/${loopId}/messages`, { text: SAY });
    await settled(app, loopId);
    await post(app, `/sessions/${loopId}/close-request`);
    await waitFor('判定', async () =>
      (await records(app, loopId)).some((r) => r.record.type === 'guard_verdict'),
    );
    await settled(app, loopId);
    await post(app, `/sessions/${loopId}/confirm-close`);
    await app.studium.settled();
    expect(openings(fake).at(-1)).toContain('停车场（没合上就结束、缺口还没补上）：空');
    expect((await overview(app, mainId)).load.parked).toBe(0);
  });
});

describe('同时进行的闭环数', () => {
  it('M05 开场给进行中 / 搁置 / 等分叉回来的数量；没收尾的 ≥3 个提示别再开新的', async () => {
    const { app, mainId, fake } = await startDetourApp(newDetourState());
    apps.push(app);
    const a = await openLoop(app, mainId, 0);
    await post(app, '/cards/request', { projectId: mainId });
    await app.studium.settled();
    let text = openings(fake).at(-1) ?? '';
    expect(text).toContain('进行中 1 个、搁置 0 个、等分叉回来 0 个（共 1 个）');
    expect(text).not.toContain('已经不少了');

    const b = await openLoop(app, mainId, 1);
    await post(app, `/sessions/${b.loopId}/shelve`, {});
    await app.studium.settled();
    await openLoop(app, mainId, 1);
    await post(app, '/cards/request', { projectId: mainId });
    await app.studium.settled();
    text = openings(fake).at(-1) ?? '';
    expect(text).toContain('进行中 2 个、搁置 1 个、等分叉回来 0 个（共 3 个）');
    expect(text).toContain('已经不少了：这次别再开新的点');
    expect(text).toContain('只是提示，最终由学习者选');
    // 只提示、不硬拦：这时仍然出得了卡、选得了
    const cards = (await records(app, mainId)).filter((r) => r.record.type === 'choice_card');
    expect(cards.length).toBeGreaterThan(0);
    const o = await overview(app, mainId);
    expect(o.load).toMatchObject({
      inProgress: 2,
      shelved: 1,
      waitingFork: 0,
      unfinished: 3,
      heavy: true,
    });
    expect(a.loopId).not.toBe(b.loopId);
  });
});
