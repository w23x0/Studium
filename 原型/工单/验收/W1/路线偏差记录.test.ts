// （W1 新版，取代旧的同名测试：交卡经 helpers 补 route_decision；新点不再有知识点名字，只核 id。）
// 验收：路线偏差记录（M05:22-23）。只经 HTTP 验证，模型是假模型。
// - M05 出卡时，学习者没选推荐项、或选了之后很快放下 / 没合上，记一条（M05 自有记录，只追加，不写 M09）；
// - 只记计划偏差的事实，不形成对学习者水平或能力的结论；
// - 照推荐选、合上了的不记；闭环中途小卡上的选择也记（照推荐与否）；
// - M05 开场带最近的偏差，供难度个人化参考。
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import type { DeviationsResponse } from '../../src/shared/protocol.ts';
import { SAY, settled } from '../helpers/evidence-flow.ts';
import { newDetourState, openLoop, troubleAndCard } from '../helpers/detour-flow.ts';
import { getJson, post } from '../helpers/http.ts';
import { learnAndClose, newLong, startLong } from '../helpers/longterm-flow.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

const devs = async (app: App, mainId: string) =>
  (await getJson<DeviationsResponse>(app, `/m05/deviations?project=${mainId}`)).records;

describe('路线偏差记录', () => {
  it('没选推荐项记一条；照推荐选、合上了的不记', async () => {
    const st = newLong();
    const { app, mainId } = await startLong(st);
    apps.push(app);
    // 推荐的是第 0 项（位移）：照推荐选 → 不记
    const a = await openLoop(app, mainId, 0);
    expect(await devs(app, mainId)).toHaveLength(0);
    await learnAndClose(app, a.loopId);
    expect(await devs(app, mainId)).toHaveLength(0);
    // 选了第 1 项（平均速度）→ 记没选推荐项
    const b = await openLoop(app, mainId, 1);
    const rows = await devs(app, mainId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      kind: 'not_recommended',
      loopSessionId: b.loopId,
      cardId: b.cardId,
      recommended: { option: 0, title: '位移', newPoint: { id: 'p-displacement' } },
      chosen: {
        option: 1,
        title: '平均速度',
        newPoint: { id: 'p-avg-velocity' },
      },
    });
  });

  it('选了之后很快放下 / 没合上：记事实（说了几句、开了多久、是否很快放下），不下结论', async () => {
    const st = newLong();
    const { app, mainId } = await startLong(st);
    apps.push(app);
    const a = await openLoop(app, mainId, 0);
    await post(app, `/sessions/${a.loopId}/messages`, { text: SAY });
    await settled(app, a.loopId);
    await post(app, `/sessions/${a.loopId}/end`, { note: '今天到这' });
    await app.studium.settled();
    const rows = await devs(app, mainId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      kind: 'ended_unclosed',
      loopSessionId: a.loopId,
      facts: { learnerMessages: 1, minutes: 0, quickDrop: true, note: '今天到这' },
    });
    // 只有事实字段，没有水平 / 能力一类的结论
    expect(Object.keys(rows[0] ?? {}).sort()).toEqual(
      ['at', 'facts', 'id', 'kind', 'loopSessionId', 'mainSessionId'].sort(),
    );

    // 说了很多句再放下：不算很快放下
    const b = await openLoop(app, mainId, 0);
    for (let i = 0; i < 4; i++) {
      await post(app, `/sessions/${b.loopId}/messages`, { text: `${SAY}（第 ${String(i)} 次）` });
      await settled(app, b.loopId);
    }
    await post(app, `/sessions/${b.loopId}/end`, { note: '' });
    await app.studium.settled();
    expect((await devs(app, mainId)).at(-1)?.facts).toMatchObject({
      learnerMessages: 4,
      quickDrop: false,
    });
  });

  it('M05 开场带最近的偏差，并说明它只是计划偏差的事实', async () => {
    const st = newLong();
    const { app, mainId, fake } = await startLong(st);
    apps.push(app);
    await openLoop(app, mainId, 1);
    await post(app, '/cards/request', { projectId: mainId });
    await app.studium.settled();
    const opening = fake.inputs.filter((i) => i.text.includes('触发原因')).at(-1)?.text ?? '';
    expect(opening).toContain('最近的路线偏差记录');
    expect(opening).toContain('不是对学习者水平的结论');
    expect(opening).toContain('没选推荐项：推荐 「位移」');
    expect(opening).toContain('学习者选了 「平均速度」');
  });

  it('闭环中途小卡上的选择也记，标明是否照推荐', async () => {
    const st = newLong();
    st.detour = newDetourState();
    const { app, mainId } = await startLong(st);
    apps.push(app);
    const a = await openLoop(app, mainId, 1);
    const card = await troubleAndCard(app, a.loopId);
    // 默认小卡推荐第 0 项（fork）；选第 1 项（continue）= 没照推荐
    expect(
      (await post(app, `/sessions/${a.loopId}/detour`, { cardId: card.cardId, option: 1 })).status,
    ).toBe(201);
    await app.studium.settled();
    const rows = (await devs(app, mainId)).filter((r) => r.kind === 'detour_choice');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      loopSessionId: a.loopId,
      recommended: { option: 0 },
      chosen: { option: 1, kind: 'continue' },
    });
  });
});
