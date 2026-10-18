// 验收（W5）：畅谈与导航可外部搜索（docs/设计/会话/畅谈.md「能读什么」、会话/导航.md「能读什么」D-13）。
// 程序开模型对话时 ConversationSpec.webSearch：畅谈、导航为真；主对话、学习对话、守卫及其他会话不带（或为假）。
// 从假模型 fake.opened 看，按工具名认会话。
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import type { ConversationSpec } from '../../src/core/model/port.ts';
import { boot, learnOnce, newW5, openTalk, specsWith, talkSays } from './共用/w5-flow.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

const webSearch = (s: ConversationSpec): unknown =>
  (s as unknown as { webSearch?: unknown }).webSearch;

describe('畅谈与导航联网搜索', () => {
  it('畅谈、导航的对话放开外部搜索；主对话、学习对话、守卫不放开', async () => {
    const st = newW5();
    const { app, fake, mainId } = await boot(st);
    apps.push(app);
    const talkId = await openTalk(app, mainId);
    await talkSays(app, talkId, '就这么定了');
    await learnOnce(app, st);

    const talk = specsWith(fake, 'settle_goal');
    const nav = specsWith(fake, 'submit_choice_card');
    const main = specsWith(fake, 'open_goal_talk');
    const loop = specsWith(fake, 'request_close');
    const guard = specsWith(fake, 'submit_verdict');
    for (const [name, list] of [
      ['畅谈', talk],
      ['导航', nav],
      ['主对话', main],
      ['学习对话', loop],
      ['守卫', guard],
    ] as const) {
      expect(list.length, `开过${name}`).toBeGreaterThan(0);
    }
    expect(talk.map(webSearch), '畅谈的 spec 带 webSearch: true').toEqual(talk.map(() => true));
    expect(nav.map(webSearch), '导航的 spec 带 webSearch: true').toEqual(nav.map(() => true));
    for (const [name, list] of [
      ['主对话', main],
      ['学习对话', loop],
      ['守卫', guard],
      ['状态整理', specsWith(fake, 'write_state_record')],
      ['教法记录整理', specsWith(fake, 'write_strategy_record')],
      ['检索子代理', specsWith(fake, 'submit_findings')],
    ] as const) {
      expect(
        list.some((s) => webSearch(s) === true),
        `${name}不放开外部搜索`,
      ).toBe(false);
    }
  }, 30000);
});
