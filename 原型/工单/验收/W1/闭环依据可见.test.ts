// （W1 新版，取代旧的同名测试：单子是文字；出处不再回查知识点编号；DISPLACEMENT_OPTION 带书里出处。）
// 验收：闭环里系统依据什么（M02:11 M04:24 M05:18,21，总览「横切原则」5 产出可见）。只经 HTTP 验证。
// - 守卫每次判定：合上与否、理由、引用的行号与那几行原文，判定用的模型；
// - 诊断记录能查到（不进给学习者的回复）；开场单子：新点、子句、出发点及来源、路线动作；
// - 选择卡每个选项背后的单子与出处（旧卡没有出处不编）；出处尽量回查，查不到原样给；
// - 项目页：本项目的闭环按 进行中 · 等你选 · 合上 · 没合上 分组。
import { afterEach, describe, expect, it } from 'vitest';
import type {
  CardResponse,
  LoopEvidenceResponse,
  ProjectOverviewResponse,
} from '../../src/shared/protocol.ts';
import type { App } from '../../src/core/app.ts';
import { call, getJson, post, records } from '../helpers/http.ts';
import {
  DIAGNOSIS,
  SAY,
  cardAfter,
  confirmAndSettle,
  newState,
  requestClose,
  settled,
  startApp,
  startLoop,
} from '../helpers/evidence-flow.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

describe('闭环依据可见', () => {
  it('守卫判定带理由、引用行与原文；诊断、单子可查', async () => {
    const state = newState();
    const { app, mainId } = await startApp(state);
    apps.push(app);
    const { loopId } = await startLoop(app, mainId);

    // 还开着、还没申请收口
    const before = await getJson<LoopEvidenceResponse>(app, `/loops/${loopId}/evidence`);
    expect(before.loop.status).toBe('in_progress');
    expect(before.loop.verdicts).toEqual([]);
    expect(before.loop.diagnoses.map((d) => d.text)).toEqual([DIAGNOSIS]);
    // 开场单子（文字）：新点、子句、出发点及来源、路线动作
    expect(before.loop.ticket as unknown, '单子原样是文字').toMatchObject({
      newPoint: 'p-displacement',
      clause: 'c-disp-from-pos',
      startPoints: [{ point: 'p-position', source: '假定' }],
      routeAction: '继续主线',
    });

    // 第一次判没合上（理由里没有引用行），第二次判合上
    state.guardClosed = false;
    await requestClose(app, loopId, 1);
    state.guardClosed = true;
    await requestClose(app, loopId, 2);

    const ev = (await getJson<LoopEvidenceResponse>(app, `/loops/${loopId}/evidence`)).loop;
    expect(ev.verdicts).toHaveLength(2);
    const [no, yes] = ev.verdicts;
    expect(no).toMatchObject({ closed: false, basis: '还差一个情境', quotes: [] });
    expect(no?.request).toMatchObject({ by: 'learner' });
    expect(yes?.closed).toBe(true);
    expect(yes?.basis).toContain('说清了位移');
    // 引用的行和那一行的原话
    expect(yes?.quotes).toHaveLength(1);
    const cited = yes?.quotes[0];
    expect(cited?.text).toBe(SAY);
    const loopRecs = await records(app, loopId);
    expect(loopRecs.find((r) => r.line === cited?.line)?.record).toMatchObject({
      type: 'user_message',
      text: SAY,
    });
    // 判定所在行就是正本里那条 guard_verdict 的行；用的模型是守卫会话实际执行的模型
    expect(loopRecs.find((r) => r.line === yes?.line)?.record.type).toBe('guard_verdict');
    expect(yes?.model).toEqual({ name: 'fake-model-1', known: true });
    expect(ev.model).toEqual({ name: 'fake-model-1', known: true });
  });

  it('不是闭环对话的会话不能查；没有的会话 404', async () => {
    const { app, mainId } = await startApp(newState());
    apps.push(app);
    expect((await fetchStatus(app, `/loops/${mainId}/evidence`)).status).toBe(400);
    expect((await fetchStatus(app, '/loops/no-such/evidence')).status).toBe(404);
  });

  it('选择卡每个选项的单子与出处；查不到的出处原样给出、不编', async () => {
    const state = newState();
    const { app, mainId } = await startApp(state);
    apps.push(app);
    const { cardId, loopId } = await startLoop(app, mainId);
    const card = (await getJson<CardResponse>(app, `/cards/${cardId}`)).card;
    expect(card.mainSessionId).toBe(mainId);
    expect(card.recommended).toBe(0);
    expect(card.chosen).toEqual({ option: 0, loopSessionId: loopId });
    expect(card.model.known).toBe(true);
    const [first, second] = card.options;
    // 第一项：书里的出处（书名/文件:行号）回查到原文
    expect(first?.sources).toEqual([
      expect.objectContaining({ kind: 'book_line', resolved: true, book: '力学入门样例' }),
    ]);
    expect(first?.chosen).toBe(true);
    expect((first?.ticket as unknown as { newPoint?: unknown }).newPoint).toBe('p-displacement');
    // 第二项：不再有知识点编号可回查，原样给出；没书名的给定位；不认识的原样给
    expect(second?.recommended).toBe(false);
    expect(second?.ticket.startPoints[0]).toMatchObject({ source: '学过的记录' });
    expect(second?.sources).toEqual([
      expect.objectContaining({ kind: 'unknown', resolved: false, raw: 'p-avg-velocity' }),
      expect.objectContaining({ kind: 'unknown', resolved: false, raw: 'c-avgv-from-disp' }),
      expect.objectContaining({
        kind: 'book_line',
        resolved: false,
        file: 'ch01/sec-1.2.md',
        line: 12,
      }),
      expect.objectContaining({ kind: 'unknown', resolved: false, raw: '不知道是什么的出处' }),
    ]);
    expect((await fetchStatus(app, '/cards/card-nope')).status).toBe(404);
  });

  it('出处里的学习原文行能回查（W2 起没有 M09 记录这种出处）', async () => {
    const state = newState();
    const { app, mainId } = await startApp(state);
    apps.push(app);
    const { loopId } = await startLoop(app, mainId);
    await requestClose(app, loopId, 1);
    await confirmAndSettle(app, loopId);
    const mark = (await records(app, mainId)).at(-1)?.line ?? 0;
    const cited = (await records(app, loopId)).find((r) => r.record.type === 'user_message');
    state.extraSources = [`${loopId}:${String(cited?.line)}`];
    await post(app, '/cards/request', { projectId: mainId });
    const second = await waitCard(app, mainId, mark);
    const card = (await getJson<CardResponse>(app, `/cards/${second}`)).card;
    expect(card.options[0]?.sources).toEqual([
      expect.objectContaining({ kind: 'loop_line', resolved: true, detail: SAY }),
    ]);
  });

  it('项目页：闭环按进行中 · 等你选 · 合上 · 没合上分组', async () => {
    const state = newState();
    const { app, mainId } = await startApp(state);
    apps.push(app);
    // 一开始：什么都没有
    const empty = await getJson<ProjectOverviewResponse>(app, `/projects/${mainId}/overview`);
    expect(empty.overview.groups).toEqual({
      inProgress: [],
      awaitingChoice: [],
      closed: [],
      unclosed: [],
    });

    // 闭环 1 合上；合上后自动出了下一张卡（还没选）
    const first = await startLoop(app, mainId);
    const mark1 = (await records(app, mainId)).at(-1)?.line ?? 0;
    await requestClose(app, first.loopId, 1);
    await confirmAndSettle(app, first.loopId);
    let o = (await getJson<ProjectOverviewResponse>(app, `/projects/${mainId}/overview`)).overview;
    expect(o.groups.closed.map((l) => l.sessionId)).toEqual([first.loopId]);
    expect(o.groups.closed[0]).toMatchObject({
      status: 'closed',
      newPoint: { id: 'p-displacement' },
      lastVerdict: { closed: true },
    });
    expect(o.groups.awaitingChoice).toHaveLength(1);
    const pending = o.groups.awaitingChoice[0];
    expect(pending?.options).toHaveLength(2);
    expect(pending?.line).toBeGreaterThan(mark1);

    // 选了它开闭环 2（进行中），再没合上就结束闭环 2 → 停车场；闭环 3 开着
    const choose = await post(app, `/cards/${pending?.cardId}/choose`, { option: 0 });
    const second = ((await choose.json()) as { loopSessionId: string }).loopSessionId;
    await settled(app, second);
    o = (await getJson<ProjectOverviewResponse>(app, `/projects/${mainId}/overview`)).overview;
    expect(o.groups.inProgress.map((l) => l.sessionId)).toEqual([second]);
    expect(o.groups.awaitingChoice).toEqual([]);
    expect((await post(app, `/sessions/${second}/end`)).status).toBe(202);
    await app.studium.settled();
    o = (await getJson<ProjectOverviewResponse>(app, `/projects/${mainId}/overview`)).overview;
    expect(o.groups.unclosed.map((l) => l.sessionId)).toEqual([second]);
    expect(o.groups.unclosed[0]).toMatchObject({ status: 'unclosed' });
    expect(o.groups.inProgress).toEqual([]);
    // 结束又出了一张新的卡：等你选
    expect(o.groups.awaitingChoice).toHaveLength(1);
  });

  it('另一个项目的闭环不混进来', async () => {
    const state = newState();
    const { app, mainId } = await startApp(state);
    apps.push(app);
    const other = (await (await post(app, '/projects', { title: '另一个' })).json()) as {
      mainSessionId: string;
    };
    await startLoop(app, mainId);
    const o = (
      await getJson<ProjectOverviewResponse>(app, `/projects/${other.mainSessionId}/overview`)
    ).overview;
    expect(o.title).toBe('另一个');
    expect(o.groups.inProgress).toEqual([]);
    expect((await fetchStatus(app, '/projects/nope/overview')).status).toBe(404);
  });
});

function fetchStatus(app: App, path: string): Promise<Response> {
  return call(app, path);
}

function waitCard(app: App, mainId: string, after: number): Promise<string> {
  return cardAfter(app, mainId, after);
}
