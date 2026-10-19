// 验收（W2）：学习结束后的清单（docs/设计/01-流程.md §3「合上之后」「没合上就结束」）。
// 合上 = 收口快照 → 导航出卡（触发“合上”）→ 后台状态整理与教法记录整理；不另开会话写分析层。
// 没合上 = 存结束原话 → 导航出卡（触发“没合上”）并写路线决定 → 后台；不开守卫、不记停车记录。
// after_loop_step 只剩 card_ready / failed。只经 HTTP 与正本记录验证，假模型。
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import { records } from '../helpers/http.ts';
import {
  ROUTE_DECISION,
  boot,
  endUnclosed,
  lastLine,
  learnAndClose,
  navOf,
  newFlow,
  openLoop,
  openedIndex,
  say,
  type Loose,
} from './共用/w2-flow.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

const DELETED = ['write_formation_record', 'write_timeline_record', 'submit_parking_note'];

async function stepsOf(app: App, loopId: string): Promise<Loose[]> {
  return (await records(app, loopId))
    .map((r) => r.record as unknown as Loose)
    .filter((r) => r.type === 'after_loop_step');
}

describe('学习结束后的清单', () => {
  it('合上：不开写分析层的会话，直接由导航出卡（触发“合上”）；后台整理在出卡之后才开', async () => {
    const flow = newFlow();
    const { app, fake, mainId } = await boot(flow);
    apps.push(app);
    const loopId = await openLoop(app, mainId, flow);
    const mark = await lastLine(app, mainId);
    const before = fake.opened.length;
    await learnAndClose(app, loopId, flow);

    const after = fake.opened.slice(before);
    expect(
      after.some((s) => s.tools.some((t) => DELETED.includes(t.name))),
      '合上之后不该再开写形成记录 / 时间版本 / 停车记录的会话',
    ).toBe(false);

    const steps = await stepsOf(app, loopId);
    expect(
      steps.map((s) => s.step),
      '合上之后的步骤只有“卡出好了”（没有 m09_written）',
    ).toEqual(['card_ready']);

    // 卡与路线决定：都在主对话里，触发原因以“合上”开头
    const main = (await records(app, mainId)).filter((r) => r.line > mark);
    const card = main.find((r) => r.record.type === 'choice_card');
    expect(card, '合上后主对话里贴出了下一张卡').toBeTruthy();
    const cardRec = card?.record as unknown as Loose;
    expect(steps[0]?.detail, 'card_ready 的 detail 是那张卡的编号').toBe(cardRec.cardId);
    expect(String(cardRec.trigger), '卡的触发原因以“合上”开头').toMatch(/^合上/);
    const rd = main.find((r) => (r.record as unknown as Loose).type === 'route_decision');
    expect(rd, '出卡时写了路线决定').toBeTruthy();
    expect(rd?.line ?? 0, '路线决定写在卡之前').toBeLessThan(card?.line ?? 0);
    expect(
      String((rd?.record as unknown as Loose).trigger),
      '路线决定的触发原因以“合上”开头',
    ).toMatch(/^合上/);

    // 顺序：导航先开，状态整理与教法记录整理之后才开
    const nav = openedIndex(fake, 'submit_choice_card', before);
    const state = openedIndex(fake, 'write_state_record', before);
    const pedagogy = openedIndex(fake, 'write_strategy_record', before);
    expect(nav, '合上后开了导航').toBeGreaterThanOrEqual(0);
    expect(pedagogy, '合上后开了教法记录整理').toBeGreaterThan(nav);
    expect(state, '合上后开了状态整理（学习者说过话）').toBeGreaterThan(nav);
  });

  it('没合上：存结束原话，不开守卫；导航出卡（触发“没合上”）并写路线决定；不记停车记录', async () => {
    const flow = newFlow();
    const { app, fake, mainId } = await boot(flow);
    apps.push(app);
    const loopId = await openLoop(app, mainId, flow);
    await say(app, loopId, flow);
    const mark = await lastLine(app, mainId);
    const before = fake.opened.length;
    const NOTE = '今天先到这，我想先去学别的';
    await endUnclosed(app, loopId, NOTE);

    const recs = (await records(app, loopId)).map((r) => r.record as unknown as Loose);
    const ended = recs.find((r) => r.type === 'loop_ended');
    expect(ended, '学习的正本里记了结束').toMatchObject({ closed: false, note: NOTE });
    expect(
      recs.some((r) => r.type === 'guard_verdict' || r.type === 'parking_note'),
      '没合上不开守卫、不记停车记录',
    ).toBe(false);
    const after = fake.opened.slice(before);
    expect(
      after.some((s) => s.tools.some((t) => t.name === 'submit_verdict')),
      '没合上不开守卫',
    ).toBe(false);
    expect(
      after.some((s) => s.tools.some((t) => DELETED.includes(t.name))),
      '没合上不开记停车记录 / 写分析层的会话',
    ).toBe(false);

    const steps = await stepsOf(app, loopId);
    expect(
      steps.map((s) => s.step),
      '没合上之后的步骤只有“卡出好了”（没有 parked）',
    ).toEqual(['card_ready']);

    const main = (await records(app, mainId)).filter((r) => r.line > mark);
    const card = main.find((r) => r.record.type === 'choice_card');
    const cardRec = card?.record as unknown as Loose;
    expect(String(cardRec.trigger), '卡的触发原因以“没合上”开头').toMatch(/^没合上/);
    const rd = main.find((r) => (r.record as unknown as Loose).type === 'route_decision');
    expect(rd?.record, '没合上后导航写了路线决定（与卡同一个导航会话）').toMatchObject({
      decision: ROUTE_DECISION.decision,
      reason: ROUTE_DECISION.reason,
      navSessionId: navOf(cardRec),
    });
    expect(
      String((rd?.record as unknown as Loose).trigger),
      '路线决定的触发原因以“没合上”开头',
    ).toMatch(/^没合上/);

    const nav = openedIndex(fake, 'submit_choice_card', before);
    const pedagogy = openedIndex(fake, 'write_strategy_record', before);
    expect(nav, '没合上后开了导航').toBeGreaterThanOrEqual(0);
    expect(pedagogy, '教法记录整理在导航之后才开').toBeGreaterThan(nav);
  });

  it('导航没交卡：记一条 failed，后台整理照样跑', async () => {
    const flow = newFlow();
    const nav = { off: false };
    flow.extra = (ctx) =>
      nav.off && ctx.spec.tools.some((t) => t.name === 'submit_choice_card')
        ? { text: '这次不出卡' }
        : undefined;
    const { app, fake, mainId } = await boot(flow);
    apps.push(app);
    const loopId = await openLoop(app, mainId, flow);
    nav.off = true;
    await say(app, loopId, flow);
    const before = fake.opened.length;
    await endUnclosed(app, loopId, '到这');
    const steps = await stepsOf(app, loopId);
    expect(
      steps.map((s) => s.step),
      '导航没交卡时只记一条失败',
    ).toEqual(['failed']);
    expect(
      openedIndex(fake, 'write_strategy_record', before),
      '出卡失败不挡后台整理',
    ).toBeGreaterThanOrEqual(0);
  });
});
