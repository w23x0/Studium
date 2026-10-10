// 验收：停车场恢复原闭环（M05:27 · M01 会话关系）。只经 HTTP 验证，模型是假模型。
// - 没合上就结束的闭环，学习者可“接着学”：开一个新闭环续接原闭环（session_opened.resumeOf），
//   开场带原闭环的原文摘要与停车记录；原闭环的正本一字不改；
// - 已合上 / 进行中 / 点后来已合上 / 已经有人接着学的，不能再接；
// - 项目页的“没合上”里标出谁在接着学；新闭环合上后原闭环的点不再算积压。
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import type {
  ContinueLoopResponse,
  LoopRelationsResponse,
  ProjectOverviewResponse,
} from '../../src/shared/protocol.ts';
import { SAY, settled } from '../helpers/evidence-flow.ts';
import { openLoop } from '../helpers/detour-flow.ts';
import { call, getJson, post, records } from '../helpers/http.ts';
import { learnAndClose, newLong, startLong } from '../helpers/longterm-flow.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

async function unclosedLoop(app: App, mainId: string): Promise<string> {
  const { loopId } = await openLoop(app, mainId, 0);
  await post(app, `/sessions/${loopId}/messages`, { text: SAY });
  await settled(app, loopId);
  await post(app, `/sessions/${loopId}/end`, { note: '今天到这' });
  await app.studium.settled();
  return loopId;
}

describe('停车场恢复原闭环', () => {
  it('接着学：新闭环记 resumeOf，开场带原闭环摘要与停车记录；原闭环正本不改', async () => {
    const st = newLong();
    const { app, mainId, fake } = await startLong(st);
    apps.push(app);
    const orig = await unclosedLoop(app, mainId);
    const before = JSON.stringify(await records(app, orig));

    const res = await post(app, `/sessions/${orig}/continue`);
    expect(res.status).toBe(201);
    const { loopSessionId } = (await res.json()) as ContinueLoopResponse;
    await settled(app, loopSessionId);

    const opened = (await records(app, loopSessionId))[0]?.record;
    expect(opened).toMatchObject({
      type: 'session_opened',
      kind: 'loop',
      parent: mainId,
      resumeOf: { fromLoop: orig },
      ticket: { newPoint: 'p-displacement' },
    });
    const opening =
      fake.inputs.find((i) => i.spec.session?.id === loopSessionId && i.text.includes('接着'))
        ?.text ?? '';
    expect(opening).toContain('这是接着以前没合上的闭环学');
    expect(opening).toContain(SAY); // 原闭环里学习者说过的话
    expect(opening).toContain('今天到这'); // 结束时说的
    expect(opening).toContain('下次进来先补位移'); // 停车记录的恢复计划
    expect(opening).toContain('本闭环的单子'); // 照常带单子
    // 教学侧有读原闭环全文的工具
    expect(
      fake.opened.find((o) => o.session?.id === loopSessionId)?.tools.map((t) => t.name),
    ).toContain('read_loop');

    // 原闭环正本一字不改
    expect(JSON.stringify(await records(app, orig))).toBe(before);

    // 项目页：原闭环还在“没合上”里，标出谁在接着学；闭环关系标明是续接
    const o = (await getJson<ProjectOverviewResponse>(app, `/projects/${mainId}/overview`))
      .overview;
    const brief = o.groups.unclosed.find((b) => b.sessionId === orig);
    expect(brief?.resumedBy).toEqual([
      expect.objectContaining({ loopSessionId, status: 'in_progress' }),
    ]);
    expect(o.groups.inProgress.find((b) => b.sessionId === loopSessionId)?.resumeOf).toMatchObject({
      loopSessionId: orig,
    });
    const rel = (await getJson<LoopRelationsResponse>(app, `/projects/${mainId}/loop-relations`))
      .relations;
    expect(rel.find((r) => r.loopSessionId === loopSessionId)?.origin).toEqual({
      kind: 'resume',
      fromLoop: orig,
    });

    // 已经有人在接着学了，不能再开一个
    expect((await post(app, `/sessions/${orig}/continue`)).status).toBe(400);

    // 接着学合上后，原闭环的点不再算积压，也不能再接
    await learnAndClose(app, loopSessionId);
    const o2 = (await getJson<ProjectOverviewResponse>(app, `/projects/${mainId}/overview`))
      .overview;
    expect(o2.load.parked).toBe(0);
    const again = await call(app, `/sessions/${orig}/continue`, { method: 'POST', body: '{}' });
    expect(again.status).toBe(400);
  });

  it('合上的、进行中的、不存在的，不能接着学', async () => {
    const st = newLong();
    const { app, mainId } = await startLong(st);
    apps.push(app);
    const active = await openLoop(app, mainId, 0);
    expect((await post(app, `/sessions/${active.loopId}/continue`)).status).toBe(400);
    await learnAndClose(app, active.loopId);
    expect((await post(app, `/sessions/${active.loopId}/continue`)).status).toBe(400);
    expect((await post(app, '/sessions/no-such-loop/continue')).status).toBe(404);
  });
});
