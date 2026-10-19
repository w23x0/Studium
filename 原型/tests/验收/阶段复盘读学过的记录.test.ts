// 验收（W3）：阶段复盘读学过的记录上 / 中层（单子、通过的判定与实际理解、没合上那次的结束原话）、路线偏差，
// 不再读 M09；复盘说完交回主对话一句，窗口接着上一次；该复盘时“今天该做的”提示。
// 设计：docs/设计/会话/导航.md「二级功能」阶段进展与复盘；记录/学过的记录.md「分层」。
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import { getJson, post, records } from '../helpers/http.ts';
import {
  advanceDays,
  BASIS,
  choose,
  endUnclosed,
  hasTool,
  learnAndClose,
  newW3,
  openingOf,
  opt,
  requestCard,
  say,
  startW3,
  UNDERSTAND,
} from './共用/w3-flow.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

const END_NOTE = '课题乙先放一放';
const SUMMARY = '课题甲学会了，课题乙还差前提，下一阶段先补前提。';

describe('阶段复盘读学过的记录（W3）', () => {
  it('开场给这段时间学过的记录上中层、停车场、路线偏差，不提 M09；说完交回一句，窗口接续', async () => {
    const st = newW3();
    st.override = (ctx) =>
      hasTool(ctx, 'finish_review') &&
      ctx.input.role === 'learner' &&
      ctx.input.text.includes('好了')
        ? { calls: [{ name: 'finish_review', args: { summary: SUMMARY } }], text: '好。' }
        : undefined;
    const { app, mainId, fake } = await startW3(st);
    apps.push(app);
    st.nextOptions = [opt('课题甲'), opt('课题丙')];
    const a = await choose(app, (await requestCard(app, mainId)).cardId, 0);
    st.nextOptions = [opt('课题乙'), opt('课题丁')];
    await learnAndClose(app, a);
    const card = (await records(app, mainId)).filter((r) => r.record.type === 'choice_card').at(-1);
    if (card?.record.type !== 'choice_card') throw new Error('合上后应当出卡');
    const b = await choose(app, card.record.cardId, 1); // 没选推荐项
    await say(app, b, '这里我不会');
    await endUnclosed(app, b, END_NOTE);

    const res = await post(app, `/projects/${mainId}/review`, {});
    expect(res.status, '开复盘').toBe(201);
    const r = (await res.json()) as { reviewSessionId: string; since: string; until: string };
    await app.studium.settled();
    const opening = openingOf(fake, r.reviewSessionId);
    expect(opening, '合上那次').toContain(a);
    expect(opening, '上层：单子').toContain('课题甲的新点');
    expect(opening, '中层：判定依据').toContain(BASIS);
    expect(opening, '中层：实际理解').toContain(UNDERSTAND);
    expect(opening, '没合上那次（停车场）').toContain(b);
    expect(opening, '没合上那次的结束原话').toContain(END_NOTE);
    expect(opening, '路线偏差（现算）').toContain('没选推荐项');
    expect(opening, '不再读 M09 / 知识点 / 当前视图 / 时间版本').not.toMatch(
      /M09|M08|知识点|当前视图|时间版本/,
    );

    await say(app, r.reviewSessionId, '好了');
    const recs = await records(app, r.reviewSessionId);
    expect(
      recs.some((x) => x.record.type === 'talk_ended'),
      '复盘交回、对话结束',
    ).toBe(true);
    const main = await records(app, mainId);
    expect(
      main.some((x) => x.record.type === 'program_fact' && x.record.text.includes(SUMMARY)),
      '主对话收到交回的一句',
    ).toBe(true);
    const list = (
      await getJson<{ reviews: { summary?: string }[] }>(app, `/projects/${mainId}/reviews`)
    ).reviews;
    expect(list.map((x) => x.summary)).toEqual([SUMMARY]);
    const second = (await (await post(app, `/projects/${mainId}/review`, {})).json()) as {
      since: string;
    };
    expect(second.since, '下一次复盘接着上一次的窗口').toBe(r.until);
    expect(
      (await post(app, `/projects/${mainId}/review`, { since: '2026-02-30' })).status,
      '非法日期',
    ).toBe(400);
  });

  it('结束了两次学习、过了 14 天：今天该做的提示复盘', async () => {
    const st = newW3();
    const { app, mainId } = await startW3(st);
    apps.push(app);
    const a = await choose(app, (await requestCard(app, mainId)).cardId, 0);
    await learnAndClose(app, a);
    const card = (await records(app, mainId)).filter((r) => r.record.type === 'choice_card').at(-1);
    if (card?.record.type !== 'choice_card') throw new Error('合上后应当出卡');
    const b = await choose(app, card.record.cardId, 0);
    await endUnclosed(app, b, '先到这');
    type Today = { items: { kind: string; endedLoops?: number }[] };
    const before = await getJson<Today>(app, `/projects/${mainId}/today`);
    expect(
      before.items.some((i) => i.kind === 'review'),
      '还不到时候',
    ).toBe(false);
    advanceDays(st, 15);
    const after = await getJson<Today>(app, `/projects/${mainId}/today`);
    expect(
      after.items.find((i) => i.kind === 'review'),
      '提示复盘',
    ).toMatchObject({
      endedLoops: 2,
    });
  });
});
