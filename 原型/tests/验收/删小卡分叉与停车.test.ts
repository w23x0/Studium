// 验收（W3）：学习中途不再出小卡、不开分叉、不记停车记录——小卡接口与“接着学”直开接口 404，
// 学习对话与导航都没有小卡 / 停车工具，没合上就结束只出一张卡、不另开会话；搁置留作学习的状态（shelve / resume），
// 不再记停车记录。设计：工单 README「已定的做法」学习中途改线、搁置；docs/设计/记录/单子与路线.md「没合上那次的上层」。
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import { getJson, post, records } from '../helpers/http.ts';
import {
  choose,
  endUnclosed,
  newW3,
  ofType,
  requestCard,
  say,
  sessionList,
  sessionsWithTool,
  startW3,
  toolNames,
} from './共用/w3-flow.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

const GONE = ['route_signal', 'detour_card', 'detour_made', 'fork_returned', 'parking_note'];

describe('删小卡、分叉、停车记录（W3）', () => {
  it('小卡与直开接着学的接口 404；工具里没有小卡 / 停车；没合上就结束只出一张卡、不另开会话', async () => {
    const { app, mainId, fake } = await startW3(newW3());
    apps.push(app);
    const loop = await choose(app, (await requestCard(app, mainId)).cardId, 0);
    await say(app, loop, '我想先去学别的');

    expect(
      (await post(app, `/sessions/${loop}/detour`, { cardId: 'card-x', option: 0 })).status,
      '/sessions/:id/detour 已删',
    ).toBe(404);
    expect(toolNames(fake, loop), '学习对话没有 request_detour').not.toContain('request_detour');

    await endUnclosed(app, loop, '先到这，想先学别的');
    expect((await post(app, `/sessions/${loop}/continue`)).status, '/continue 已删').toBe(404);

    const recs = await records(app, loop);
    for (const t of GONE) {
      expect(
        recs.some((r) => r.record.type === t),
        `学习里不再写 ${t}`,
      ).toBe(false);
    }
    const steps = ofType(recs, 'after_loop_step').map((r) => r.record.step);
    expect(steps, '没合上之后的清单只有出卡一步').toEqual(['card_ready']);
    expect(
      (await sessionList(app)).filter((s) => s.parent === loop),
      '不另开挂在这次学习下的会话（停车记录、小卡）',
    ).toEqual([]);
    expect(
      sessionsWithTool(fake, 'submit_choice_card').length,
      '一共两次导航：开学习、结束后',
    ).toBe(2);
    for (const t of ['submit_detour_card', 'submit_parking_note', 'request_detour']) {
      expect(sessionsWithTool(fake, t), `没有会话挂着 ${t}`).toEqual([]);
    }
  });

  it('搁置：新状态、可恢复（按钮 / 又说话），搁置着不能收口；可以直接结束；不记停车记录', async () => {
    const { app, mainId } = await startW3(newW3());
    apps.push(app);
    const loop = await choose(app, (await requestCard(app, mainId)).cardId, 0);
    await say(app, loop, '先学一点');

    expect((await post(app, `/sessions/${loop}/shelve`, { note: '今天累了' })).status, '搁置').toBe(
      202,
    );
    await app.studium.settled();
    let recs = await records(app, loop);
    expect(ofType(recs, 'loop_shelved').at(-1)?.record.note, '记搁置').toBe('今天累了');
    expect(
      recs.some((r) => r.record.type === 'loop_ended'),
      '搁置不是结束',
    ).toBe(false);
    const overview = await getJson<{ overview: { groups: { shelved?: { sessionId: string }[] } } }>(
      app,
      `/projects/${mainId}/overview`,
    );
    expect(
      overview.overview.groups.shelved?.map((b) => b.sessionId),
      '项目页搁置一组',
    ).toEqual([loop]);
    expect((await post(app, `/sessions/${loop}/close-request`)).status, '搁置着不能申请收口').toBe(
      400,
    );

    expect((await post(app, `/sessions/${loop}/resume`)).status, '点接着学恢复').toBe(202);
    await app.studium.settled();
    recs = await records(app, loop);
    expect(ofType(recs, 'loop_resumed').at(-1)?.record.by).toBe('button');
    const fact = ofType(recs, 'program_fact').at(-1)?.record.text ?? '';
    expect(fact, '恢复时告诉学习对话').toContain('今天累了');
    expect(fact, '不再提停车记录 / 恢复计划').not.toMatch(/停车|恢复计划/);

    // 搁置着又说话 = 自动恢复
    await post(app, `/sessions/${loop}/shelve`, { note: '再歇会' });
    await app.studium.settled();
    await say(app, loop, '我回来了');
    expect(ofType(await records(app, loop), 'loop_resumed').at(-1)?.record.by).toBe('message');

    // 搁置着可以直接结束（没合上）
    await post(app, `/sessions/${loop}/shelve`, { note: '不学了' });
    await app.studium.settled();
    await endUnclosed(app, loop, '不学了');
    recs = await records(app, loop);
    expect(ofType(recs, 'loop_ended').at(-1)?.record.closed).toBe(false);
    for (const t of GONE) {
      expect(
        recs.some((r) => r.record.type === t),
        `不写 ${t}`,
      ).toBe(false);
    }
    expect(
      (await sessionList(app)).filter((s) => s.parent === loop),
      '不另开会话',
    ).toEqual([]);
  });
});
