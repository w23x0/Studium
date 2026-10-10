// 验收：闭环中途通知 M05、出小卡、开分叉、合上后回来（M04:21-22 · M05:18-19,26,42 · M01:18-19）。只经 HTTP 验证，模型是假模型。
// - 教学侧发现前置缺口 / 学习者想分叉 → 通知 M05（带缺口依据：指回学习者原话行），M05 开会话出小卡挂在该闭环里；
// - 选“先补 X”：开分叉闭环，记父闭环、分叉原因、返回条件，父闭环标“等分叉回来”；
// - 分叉合上：写 M09 照常，父闭环收到“补完了 X，回到这里”继续；分叉没合上就结束：父闭环也收到事实、照常继续；
// - 闭环之间的来源 / 分叉 / 返回可查；项目页分组体现“等分叉回来”。
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import type {
  DetourChooseResponse,
  FormationsResponse,
  LoopEvidenceResponse,
  LoopRelationsResponse,
  ProjectOverviewResponse,
} from '../../src/shared/protocol.ts';
import { getJson, post, records } from '../helpers/http.ts';
import { SAY, confirmAndSettle, requestClose, settled } from '../helpers/evidence-flow.ts';
import {
  CONTINUE_OPTION,
  FORK_OPTION,
  TROUBLE,
  newDetourState,
  openLoop,
  recordsOfType,
  startDetourApp,
  troubleAndCard,
} from '../helpers/detour-flow.ts';
import { toolOf } from '../helpers/scope.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

async function formationsOf(app: App, loopId: string): Promise<number> {
  return (await getJson<FormationsResponse>(app, `/m09/records?loop=${loopId}`)).records.length;
}

async function overview(app: App, mainId: string): Promise<ProjectOverviewResponse['overview']> {
  return (await getJson<ProjectOverviewResponse>(app, `/projects/${mainId}/overview`)).overview;
}

describe('闭环中途：通知 M05 与小卡', () => {
  it('教学侧通知带依据；M05 开会话出小卡挂在该闭环里，选项含“先补”和“先不管”', async () => {
    const st = newDetourState();
    const { app, mainId, fake } = await startDetourApp(st);
    apps.push(app);
    const { loopId } = await openLoop(app, mainId, 1);
    const { cardId, records: rs } = await troubleAndCard(app, loopId);

    // 通知：指回学习者说“不太会”的那一行，说明缺的是哪个出发点
    const sig = recordsOfType(rs, 'route_signal')[0];
    const said = rs.find((r) => r.record.type === 'user_message' && r.record.text === TROUBLE);
    expect(sig?.record).toMatchObject({
      kind: 'gap',
      missingPoint: 'p-displacement',
      missingText: '位移还不牢',
      basisLines: [said?.line],
    });
    // 小卡在该闭环里：2 个选项，至少含 fork 与 continue；出处带上学习者原话行
    const card = recordsOfType(rs, 'detour_card')[0]?.record;
    expect(card?.cardId).toBe(cardId);
    expect(card?.signalLine).toBe(sig?.line);
    expect(card?.options.map((o) => o.kind)).toEqual(['fork', 'continue']);
    expect(card?.options[0]?.ticket).toMatchObject({
      newPoint: 'p-displacement',
      clause: 'c-disp-from-pos',
    });
    expect(card?.options[0]?.sources).toContain(`${loopId}:${String(said?.line)}`);
    // M05 为此单开了一个会话，挂在这个闭环下，开场里有单子、通知和对话原文
    const m05 = await records(app, card?.m05SessionId ?? '');
    const opened = m05[0]?.record;
    expect(opened).toMatchObject({ type: 'session_opened', kind: 'm05', parent: loopId });
    const opening = fake.inputs.find(
      (i) => i.spec.session?.id === card?.m05SessionId && i.text.includes('闭环中途的小卡'),
    )?.text;
    expect(opening).toContain('位移还不牢');
    expect(opening).toContain(TROUBLE);
    // 依据可见：闭环依据里能看到通知、小卡、还没选
    const ev = (await getJson<LoopEvidenceResponse>(app, `/loops/${loopId}/evidence`)).loop;
    expect(ev.signals[0]).toMatchObject({ kind: 'gap', missingText: '位移还不牢' });
    expect(ev.signals[0]?.quotes[0]?.text).toBe(TROUBLE);
    expect(ev.detours).toHaveLength(1);
    expect(ev.detours[0]?.chosen).toBeUndefined();
    expect(ev.detours[0]?.options[0]?.ticket?.newPoint.name).toBe('位移');
  });

  it('通知不合规矩的被退回：依据不是学习者的行、点不在 M08、小卡没选完又通知', async () => {
    const st = newDetourState();
    const { app, mainId } = await startDetourApp(st);
    apps.push(app);
    const { loopId } = await openLoop(app, mainId, 1);
    const raise = toolOf(app, 'loop', loopId, 'request_detour');
    // 第 1 行是程序写的开场，不是学习者的话
    const notLearner = await raise.run({
      kind: 'gap',
      missing_text: '位移不牢',
      basis_lines: [1],
    });
    expect(notLearner.isError).toBe(true);
    expect(notLearner.text).toContain('不是学习者说的话');
    const empty = await raise.run({ kind: 'gap', missing_text: '位移不牢', basis_lines: [] });
    expect(empty.isError).toBe(true);
    const noPoint = await raise.run({
      kind: 'gap',
      missing_point: 'p-不存在',
      missing_text: '位移不牢',
      basis_lines: [1],
    });
    expect(noPoint.isError).toBe(true);
    expect(noPoint.text).toContain('M08 里没有点');
    // 被退回的不留通知记录
    expect(recordsOfType(await records(app, loopId), 'route_signal')).toHaveLength(0);

    // 正常通知一次后，小卡没选就再通知：退回
    await troubleAndCard(app, loopId);
    const again = await raise.run({
      kind: 'gap',
      missing_text: '又一个',
      basis_lines: [recordsOfType(await records(app, loopId), 'user_message')[0]?.line ?? 0],
    });
    expect(again.isError).toBe(true);
    expect(again.text).toContain('还没选');
  });

  it('M05 交回的小卡不合规矩被退回：没有 continue、fork 单子查不到', async () => {
    const st = newDetourState();
    const { app, mainId } = await startDetourApp(st);
    apps.push(app);
    const { loopId } = await openLoop(app, mainId, 1);
    // 让应答出一张只有 fork 的卡：按规矩，没有 continue 就退回，小卡出不来
    st.options = [FORK_OPTION, { ...FORK_OPTION, title: '另一个' }];
    await post(app, `/sessions/${loopId}/messages`, { text: TROUBLE });
    await settled(app, loopId);
    const tools = (await records(app, loopId)).filter((r) => r.record.type === 'tool_call');
    const failed = tools.find(
      (r) => r.record.type === 'tool_call' && r.record.name === 'request_detour',
    );
    expect(failed?.record.type === 'tool_call' && failed.record.isError).toBe(true);
    expect(recordsOfType(await records(app, loopId), 'detour_card')).toHaveLength(0);
    // 查不到的 fork 单子
    st.options = [{ ...FORK_OPTION, new_point: 'p-不存在' }, CONTINUE_OPTION];
    await post(app, `/sessions/${loopId}/messages`, { text: TROUBLE });
    await settled(app, loopId);
    expect(recordsOfType(await records(app, loopId), 'detour_card')).toHaveLength(0);
  });
});

describe('闭环中途：先补 X（开分叉，合上后回来）', () => {
  it('选“先补”：开分叉闭环，记来源 / 原因 / 返回条件；父闭环等分叉回来，项目页分组体现', async () => {
    const st = newDetourState();
    const { app, mainId, fake } = await startDetourApp(st);
    apps.push(app);
    const { loopId: parent } = await openLoop(app, mainId, 1);
    const { cardId, records: prs } = await troubleAndCard(app, parent);
    const said = prs.find((r) => r.record.type === 'user_message' && r.record.text === TROUBLE);

    const res = await post(app, `/sessions/${parent}/detour`, { cardId, option: 0 });
    expect(res.status).toBe(201);
    const made = (await res.json()) as DetourChooseResponse;
    expect(made.choice).toBe('fork');
    const forkId = made.forkLoopSessionId ?? '';
    expect(forkId).not.toBe('');
    await settled(app, forkId);

    // 分叉闭环：属于同一项目，单子是小卡上那张，来历里有父闭环、原因、依据行、返回条件
    const frs = await records(app, forkId);
    const fopened = frs[0]?.record;
    expect(fopened).toMatchObject({
      type: 'session_opened',
      kind: 'loop',
      parent: mainId,
      ticket: { newPoint: 'p-displacement', clause: 'c-disp-from-pos' },
      fork: {
        fromLoop: parent,
        kind: 'gap',
        missingPoint: 'p-displacement',
        basisLines: [said?.line],
      },
    });
    const origin = fopened?.type === 'session_opened' ? fopened.fork : undefined;
    expect(origin?.reason).toContain('位移还不牢');
    expect(origin?.returnCondition).toContain('合上就回到');
    expect(origin?.scope).toBe('只补到平均速度够用');
    // 分叉的开场告诉教学侧：这是分叉、为什么、什么时候回
    const forkOpening = fake.inputs.find(
      (i) => i.spec.session?.id === forkId && i.text.includes('这是一个分叉闭环'),
    )?.text;
    expect(forkOpening).toContain(parent);
    expect(forkOpening).toContain('返回条件');
    // 小卡标已选；父闭环不能再选同一张
    expect((await post(app, `/sessions/${parent}/detour`, { cardId, option: 1 })).status).toBe(400);
    const pev = (await getJson<LoopEvidenceResponse>(app, `/loops/${parent}/evidence`)).loop;
    expect(pev.detours[0]?.chosen).toMatchObject({ choice: 'fork', forkLoopSessionId: forkId });
    expect(pev.waitingFork).toBe(forkId);
    expect(pev.forks).toMatchObject([{ forkLoopSessionId: forkId }]);
    expect(pev.forks[0]?.returned).toBeUndefined();

    // 项目页：父闭环在“等分叉回来”，不在“进行中”；分叉在“进行中”
    const o = await overview(app, mainId);
    expect(o.groups.waitingFork?.map((l) => l.sessionId)).toEqual([parent]);
    expect(o.groups.waitingFork?.[0]?.waitingFork?.forkLoopSessionId).toBe(forkId);
    expect(o.groups.inProgress.map((l) => l.sessionId)).toEqual([forkId]);
    expect(o.groups.inProgress[0]?.forkOf).toMatchObject({ loopSessionId: parent });
    expect(o.load).toMatchObject({ inProgress: 1, waitingFork: 1, shelved: 0, unfinished: 2 });

    // 闭环之间的关系可查：父闭环从选择卡来，分叉从父闭环来
    const rel = await getJson<LoopRelationsResponse>(app, `/projects/${mainId}/loop-relations`);
    const byId = new Map(rel.relations.map((r) => [r.loopSessionId, r]));
    expect(byId.get(parent)?.origin.kind).toBe('card');
    expect(byId.get(parent)?.waitingFork).toBe(forkId);
    const forkRel = byId.get(forkId)?.origin;
    expect(forkRel?.kind).toBe('fork');
    expect(forkRel?.kind === 'fork' ? forkRel.fork.fromLoop : '').toBe(parent);
    expect(byId.get(parent)?.forks[0]?.forkLoopSessionId).toBe(forkId);
  });

  it('分叉合上：写 M09 照常；父闭环收到“补完了 X，回到这里”继续；主对话不出下一张卡', async () => {
    const st = newDetourState();
    const { app, mainId, fake } = await startDetourApp(st);
    apps.push(app);
    const { loopId: parent } = await openLoop(app, mainId, 1);
    const { cardId } = await troubleAndCard(app, parent);
    const forkId =
      (
        (await (
          await post(app, `/sessions/${parent}/detour`, { cardId, option: 0 })
        ).json()) as DetourChooseResponse
      ).forkLoopSessionId ?? '';
    await settled(app, forkId);
    const mainBefore = (await records(app, mainId)).filter((r) => r.record.type === 'choice_card');

    await post(app, `/sessions/${forkId}/messages`, { text: SAY });
    await settled(app, forkId);
    await requestClose(app, forkId, 1);
    await confirmAndSettle(app, forkId);

    // 分叉自己的流程：写了 M09，没有出下一张卡
    const frs = await records(app, forkId);
    expect(recordsOfType(frs, 'loop_ended')[0]?.record.closed).toBe(true);
    const steps = recordsOfType(frs, 'after_loop_step').map((r) => r.record.step);
    expect(steps).toEqual(['m09_written', 'returned']);
    expect(await formationsOf(app, forkId)).toBe(1);
    expect(
      (await records(app, mainId)).filter((r) => r.record.type === 'choice_card'),
    ).toHaveLength(mainBefore.length);

    // 父闭环：记了“回来了”，追加了事实，教学侧收到并接着说
    const prs = await records(app, parent);
    expect(recordsOfType(prs, 'fork_returned')[0]?.record).toMatchObject({
      forkLoopSessionId: forkId,
      closed: true,
      delivered: true,
    });
    const fact = recordsOfType(prs, 'program_fact').find((r) => r.record.text.includes('回到这里'));
    expect(fact?.record.text).toContain('补完了 p-displacement「位移」，回到这里');
    expect(
      fake.inputs.some((i) => i.spec.session?.id === parent && i.text.includes('回到这里')),
    ).toBe(true);
    const after = prs.filter((r) => fact !== undefined && r.line > fact.line);
    expect(after.some((r) => r.record.type === 'assistant_message')).toBe(true);

    // 项目页：父闭环回到“进行中”，关系里分叉标了回来
    const o = await overview(app, mainId);
    expect(o.groups.waitingFork).toBeUndefined();
    expect(o.groups.inProgress.map((l) => l.sessionId)).toEqual([parent]);
    expect(o.groups.closed.map((l) => l.sessionId)).toEqual([forkId]);
    const pev = (await getJson<LoopEvidenceResponse>(app, `/loops/${parent}/evidence`)).loop;
    expect(pev.waitingFork).toBeUndefined();
    expect(pev.forks[0]?.returned).toMatchObject({ closed: true, delivered: true });
  });

  it('分叉没合上就结束：不写 M09，记停车记录，父闭环也收到事实并照常继续', async () => {
    const st = newDetourState();
    const { app, mainId } = await startDetourApp(st);
    apps.push(app);
    const { loopId: parent } = await openLoop(app, mainId, 1);
    const { cardId } = await troubleAndCard(app, parent);
    const forkId =
      (
        (await (
          await post(app, `/sessions/${parent}/detour`, { cardId, option: 0 })
        ).json()) as DetourChooseResponse
      ).forkLoopSessionId ?? '';
    await settled(app, forkId);
    await post(app, `/sessions/${forkId}/messages`, { text: SAY });
    await settled(app, forkId);
    expect((await post(app, `/sessions/${forkId}/end`, { note: '今天先不补了' })).status).toBe(202);
    await app.studium.settled();

    const frs = await records(app, forkId);
    expect(recordsOfType(frs, 'loop_ended')[0]?.record.closed).toBe(false);
    expect(recordsOfType(frs, 'after_loop_step').map((r) => r.record.step)).toEqual([
      'parked',
      'returned',
    ]);
    expect(await formationsOf(app, forkId)).toBe(0);
    expect(recordsOfType(frs, 'parking_note')[0]?.record).toMatchObject({
      reason: 'ended_unclosed',
      missing: [{ point: 'p-displacement' }],
    });

    const prs = await records(app, parent);
    expect(recordsOfType(prs, 'fork_returned')[0]?.record).toMatchObject({
      closed: false,
      delivered: true,
    });
    const fact = recordsOfType(prs, 'program_fact').find((r) =>
      r.record.text.includes('没合上就结束了'),
    );
    expect(fact?.record.text).toContain('p-displacement「位移」 没补好');
    expect(
      prs.some(
        (r) => fact !== undefined && r.line > fact.line && r.record.type === 'assistant_message',
      ),
    ).toBe(true);
    // 父闭环不再等，照常在进行中；没合上的分叉进停车场，注明缺在哪个出发点
    const o = await overview(app, mainId);
    expect(o.groups.inProgress.map((l) => l.sessionId)).toEqual([parent]);
    expect(o.groups.unclosed.map((l) => l.sessionId)).toEqual([forkId]);
    expect(o.groups.unclosed[0]?.parking?.missing[0]?.point?.id).toBe('p-displacement');
  });

  it('学习者想分叉（branch）也走同一条路；父闭环结束后分叉才回来，只记不追加', async () => {
    const st = newDetourState();
    st.kind = 'branch';
    const { app, mainId } = await startDetourApp(st);
    apps.push(app);
    const { loopId: parent } = await openLoop(app, mainId, 1);
    const { cardId, records: prs } = await troubleAndCard(app, parent);
    expect(recordsOfType(prs, 'route_signal')[0]?.record.kind).toBe('branch');
    const forkId =
      (
        (await (
          await post(app, `/sessions/${parent}/detour`, { cardId, option: 0 })
        ).json()) as DetourChooseResponse
      ).forkLoopSessionId ?? '';
    await settled(app, forkId);
    const fork = (await getJson<LoopEvidenceResponse>(app, `/loops/${forkId}/evidence`)).loop;
    expect(fork.fork?.kind).toBe('branch');

    // 父闭环在等分叉时学习者先把它结束了
    await post(app, `/sessions/${parent}/end`, { note: '不学了' });
    await app.studium.settled();
    await post(app, `/sessions/${forkId}/messages`, { text: SAY });
    await settled(app, forkId);
    await post(app, `/sessions/${forkId}/end`, { note: '也不学了' });
    await app.studium.settled();
    const after = await records(app, parent);
    expect(recordsOfType(after, 'fork_returned')[0]?.record).toMatchObject({
      delivered: false,
    });
    expect(after.at(-1)?.record.type).not.toBe('program_fact');
  });
});

describe('闭环中途：先不管接着学', () => {
  it('选“先不管”：记路线事实，告诉教学侧缺口没补、接着教；不开分叉、不等', async () => {
    const st = newDetourState();
    const { app, mainId, fake } = await startDetourApp(st);
    apps.push(app);
    const { loopId } = await openLoop(app, mainId, 1);
    const { cardId } = await troubleAndCard(app, loopId);
    const res = await post(app, `/sessions/${loopId}/detour`, { cardId, option: 1 });
    expect(res.status).toBe(201);
    expect(((await res.json()) as DetourChooseResponse).choice).toBe('continue');
    await settled(app, loopId);
    const rs = await records(app, loopId);
    expect(recordsOfType(rs, 'detour_made')[0]?.record).toMatchObject({
      cardId,
      option: 1,
      choice: 'continue',
    });
    expect(
      fake.inputs.some((i) => i.spec.session?.id === loopId && i.text.includes('先不管，接着学')),
    ).toBe(true);
    const o = await overview(app, mainId);
    expect(o.groups.inProgress.map((l) => l.sessionId)).toEqual([loopId]);
    expect(o.groups.waitingFork).toBeUndefined();
    // 选项序号越界 → 400
    st.kind = 'gap';
    expect(
      (await post(app, `/sessions/${loopId}/detour`, { cardId: 'nope', option: 0 })).status,
    ).toBe(400);
  });
});
