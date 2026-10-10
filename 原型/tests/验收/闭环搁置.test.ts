// 验收：闭环搁置（M01:16,19 会话可暂停、继续、搁置和结束；M05:27 带恢复计划的搁置）。只经 HTTP 验证，模型是假模型。
// - 学习者可把闭环搁置：新状态、可恢复，与“结束（没合上）”不同（不出下一张卡、不进停车场、没有 loop_ended）；
// - 搁置时后台让 M05 记停车记录（恢复计划：何时、从哪接上）；
// - 搁置着的闭环不能收口 / 确认合上；点“接着学”或在里面又说话就恢复，恢复时教学侧收到恢复计划；
// - 搁置着的闭环也可以直接结束（没合上）。
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import type { LoopEvidenceResponse, ProjectOverviewResponse } from '../../src/shared/protocol.ts';
import { getJson, post, records } from '../helpers/http.ts';
import { SAY, settled } from '../helpers/evidence-flow.ts';
import { newDetourState, openLoop, recordsOfType, startDetourApp } from '../helpers/detour-flow.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

async function overview(app: App, mainId: string): Promise<ProjectOverviewResponse['overview']> {
  return (await getJson<ProjectOverviewResponse>(app, `/projects/${mainId}/overview`)).overview;
}

describe('闭环搁置', () => {
  it('搁置：新状态、可恢复；与结束不同；后台记带恢复计划的停车记录', async () => {
    const { app, mainId } = await startDetourApp(newDetourState());
    apps.push(app);
    const { loopId } = await openLoop(app, mainId, 0);
    await post(app, `/sessions/${loopId}/messages`, { text: SAY });
    await settled(app, loopId);
    const cardsBefore = (await records(app, mainId)).filter(
      (r) => r.record.type === 'choice_card',
    ).length;

    expect((await post(app, `/sessions/${loopId}/shelve`, { note: '今晚先到这' })).status).toBe(
      202,
    );
    await app.studium.settled();

    const rs = await records(app, loopId);
    expect(recordsOfType(rs, 'loop_shelved')[0]?.record.note).toBe('今晚先到这');
    // 不是结束：没有 loop_ended，主对话也没出下一张卡
    expect(recordsOfType(rs, 'loop_ended')).toHaveLength(0);
    expect(
      (await records(app, mainId)).filter((r) => r.record.type === 'choice_card'),
    ).toHaveLength(cardsBefore);
    // 停车记录：搁置原因、缺在哪个出发点、恢复计划
    expect(recordsOfType(rs, 'parking_note')[0]?.record).toMatchObject({
      reason: 'shelved',
      missing: [{ point: 'p-displacement' }],
      when: '下次进来先补位移',
      resumeFrom: '位移那一段，再回平均速度',
    });

    // 项目页：自成一组（status 仍是进行中的那一类，不是没合上）
    const o = await overview(app, mainId);
    expect(o.groups.shelved?.map((l) => l.sessionId)).toEqual([loopId]);
    expect(o.groups.shelved?.[0]).toMatchObject({
      status: 'in_progress',
      shelved: { note: '今晚先到这' },
    });
    expect(o.groups.shelved?.[0]?.parking?.resumeFrom).toContain('位移');
    expect(o.groups.inProgress).toEqual([]);
    expect(o.groups.unclosed).toEqual([]);
    expect(o.load).toMatchObject({ shelved: 1, inProgress: 0, unfinished: 1 });
    const ev = (await getJson<LoopEvidenceResponse>(app, `/loops/${loopId}/evidence`)).loop;
    expect(ev.shelved?.note).toBe('今晚先到这');
    expect(ev.parking?.reason).toBe('shelved');
  });

  it('搁置着不能收口 / 确认合上 / 再搁置；已结束的不能搁置', async () => {
    const { app, mainId } = await startDetourApp(newDetourState());
    apps.push(app);
    const { loopId } = await openLoop(app, mainId, 0);
    await post(app, `/sessions/${loopId}/shelve`, {});
    await app.studium.settled();
    expect((await post(app, `/sessions/${loopId}/close-request`)).status).toBe(400);
    await app.studium.settled();
    expect(recordsOfType(await records(app, loopId), 'guard_verdict')).toHaveLength(0);
    expect((await post(app, `/sessions/${loopId}/confirm-close`)).status).toBe(400);
    expect((await post(app, `/sessions/${loopId}/shelve`, {})).status).toBe(400);
    expect((await post(app, `/sessions/${mainId}/resume`)).status).toBe(400);

    // 结束（没合上）之后不能再搁置、也不能恢复
    await post(app, `/sessions/${loopId}/end`, { note: '不学了' });
    await app.studium.settled();
    expect((await post(app, `/sessions/${loopId}/shelve`, {})).status).toBe(400);
    expect((await post(app, `/sessions/${loopId}/resume`)).status).toBe(400);
  });

  it('点“接着学”恢复：教学侧收到恢复计划；项目页回到进行中', async () => {
    const { app, mainId, fake } = await startDetourApp(newDetourState());
    apps.push(app);
    const { loopId } = await openLoop(app, mainId, 0);
    await post(app, `/sessions/${loopId}/shelve`, { note: '先放一放' });
    await app.studium.settled();
    expect((await post(app, `/sessions/${loopId}/resume`)).status).toBe(202);
    await app.studium.settled();
    const rs = await records(app, loopId);
    expect(recordsOfType(rs, 'loop_resumed')[0]?.record.by).toBe('button');
    const seen = fake.inputs.find(
      (i) => i.spec.session?.id === loopId && i.text.includes('回来接着学这个闭环'),
    )?.text;
    expect(seen).toContain('先放一放');
    expect(seen).toContain('下次进来先补位移');
    expect(seen).toContain('位移那一段，再回平均速度');
    const o = await overview(app, mainId);
    expect(o.groups.shelved).toBeUndefined();
    expect(o.groups.inProgress.map((l) => l.sessionId)).toEqual([loopId]);
    // 恢复后可以正常收口
    await post(app, `/sessions/${loopId}/messages`, { text: SAY });
    await settled(app, loopId);
    expect((await post(app, `/sessions/${loopId}/close-request`)).status).toBe(202);
    await app.studium.settled();
    expect(recordsOfType(await records(app, loopId), 'guard_verdict').length).toBe(1);
  });

  it('搁置着的闭环里学习者又说话 = 接着学（自动恢复）', async () => {
    const { app, mainId } = await startDetourApp(newDetourState());
    apps.push(app);
    const { loopId } = await openLoop(app, mainId, 0);
    await post(app, `/sessions/${loopId}/shelve`, {});
    await app.studium.settled();
    expect((await post(app, `/sessions/${loopId}/messages`, { text: SAY })).status).toBe(202);
    await app.studium.settled();
    const rs = await records(app, loopId);
    expect(recordsOfType(rs, 'loop_resumed')[0]?.record.by).toBe('message');
    const resumed = rs.find((r) => r.record.type === 'loop_resumed')?.line ?? 0;
    const said =
      rs.find((r) => r.record.type === 'user_message' && r.record.text === SAY)?.line ?? 0;
    expect(resumed).toBeLessThan(said);
    expect((await overview(app, mainId)).groups.shelved).toBeUndefined();
  });

  it('搁置着的闭环可以直接结束（没合上）：进停车场，不再算搁置', async () => {
    const { app, mainId } = await startDetourApp(newDetourState());
    apps.push(app);
    const { loopId } = await openLoop(app, mainId, 0);
    await post(app, `/sessions/${loopId}/shelve`, {});
    await app.studium.settled();
    expect((await post(app, `/sessions/${loopId}/end`, { note: '算了，不学了' })).status).toBe(202);
    await app.studium.settled();
    const o = await overview(app, mainId);
    expect(o.groups.shelved).toBeUndefined();
    expect(o.groups.unclosed.map((l) => l.sessionId)).toEqual([loopId]);
    expect(o.groups.unclosed[0]?.status).toBe('unclosed');
    const parking = recordsOfType(await records(app, loopId), 'parking_note');
    expect(parking.map((r) => r.record.reason)).toEqual(['shelved', 'ended_unclosed']);
  });
});
