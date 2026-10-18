// 验收（W3）：导航派检索子代理——retrieve 开一个子会话（父 = 导航会话），子会话只交回 submit_findings：
// ≤ 5 条、每条 ref 能定位（会话 id:行号 / 书/文件:行号），不合规矩的退回；导航拿到的是核过的几条。
// 导航还能用 read_session 读一次会话原文（带行号）。设计：docs/设计/会话/导航.md「检索子代理」；工单 README §2.7。
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import { records } from '../helpers/http.ts';
import {
  choose,
  endUnclosed,
  newW3,
  ofType,
  openingOf,
  requestCard,
  say,
  sessionsWithTool,
  startW3,
  toolNames,
} from './共用/w3-flow.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

const QUESTION = '那次学习里学习者卡在哪个前提上';
const FIND_LOOP = '学习者在这一行说没懂起点';
const FIND_BOOK = '教材这里讲了位移的定义';
const BAD_TEXT = '这条的出处定位不了';
const BOOK_REF = '力学入门样例/ch01/sec-1.2.md:3';

type ToolCallRow = { name: string; args: unknown; result: string; isError: boolean };

async function toolCalls(app: App, id: string, name: string): Promise<ToolCallRow[]> {
  return ofType(await records(app, id), 'tool_call')
    .map((r) => r.record)
    .filter((r) => r.name === name);
}

describe('检索子代理（W3）', () => {
  it('retrieve 开子会话；超过 5 条、ref 定位不了的被退回；导航拿到核过的结果', async () => {
    const st = newW3();
    const { app, mainId, fake } = await startW3(st);
    apps.push(app);
    const c1 = await requestCard(app, mainId);
    const loop = await choose(app, c1.cardId, 0);
    await say(app, loop, '我好像没懂起点');
    const line = ofType(await records(app, loop), 'user_message')[0]?.line ?? 0;
    await endUnclosed(app, loop, '先到这');

    const good = { text: FIND_LOOP, ref: `${loop}:${String(line)}` };
    st.navBefore = [
      { name: 'read_session', args: { session: loop } },
      { name: 'retrieve', args: { question: QUESTION, loops: [loop] } },
    ];
    st.retrieve = () => [
      // 6 条：超过 5 条，退回
      {
        name: 'submit_findings',
        args: { findings: Array.from({ length: 6 }, () => good) },
      },
      // 会话里没有这一行，退回
      {
        name: 'submit_findings',
        args: { findings: [{ text: BAD_TEXT, ref: `${loop}:9999` }] },
      },
      // 书里没有这一行，退回
      {
        name: 'submit_findings',
        args: { findings: [{ text: BAD_TEXT, ref: '力学入门样例/ch01/sec-1.2.md:999' }] },
      },
      // 合规矩的两条
      {
        name: 'submit_findings',
        args: { findings: [good, { text: FIND_BOOK, ref: BOOK_REF }] },
      },
    ];
    await requestCard(app, mainId);

    const nav = sessionsWithTool(fake, 'retrieve').at(-1) ?? '';
    expect(nav, '导航有 retrieve 工具').not.toBe('');
    const sub = sessionsWithTool(fake, 'submit_findings').at(-1);
    expect(sub, '开了检索子会话').toBeDefined();
    if (sub === undefined) return;
    const opened = (await records(app, sub))[0]?.record;
    expect(opened?.type === 'session_opened' && opened.parent, '子会话的父是导航会话').toBe(nav);
    const subTools = toolNames(fake, sub);
    expect(subTools, '子会话只交回 submit_findings').toContain('submit_findings');
    for (const t of ['submit_choice_card', 'retrieve', 'add_reminder']) {
      expect(subTools, `子会话没有 ${t}`).not.toContain(t);
    }
    const subOpening = openingOf(fake, sub);
    expect(subOpening, '子会话开场带问题').toContain(QUESTION);
    expect(subOpening, '子会话开场点名相关学习').toContain(loop);

    const submits = await toolCalls(app, sub, 'submit_findings');
    expect(
      submits.map((c) => c.isError),
      '超过 5 条、会话行不存在、书里行不存在的都退回，合规矩的收下',
    ).toEqual([true, true, true, false]);

    const ret = (await toolCalls(app, nav, 'retrieve'))[0];
    expect(ret?.isError, 'retrieve 成功').toBe(false);
    expect(ret?.result, '导航拿到核过的结果').toContain(FIND_LOOP);
    expect(ret?.result).toContain(`${loop}:${String(line)}`);
    expect(ret?.result).toContain(FIND_BOOK);
    expect(ret?.result).toContain(BOOK_REF);
    expect(ret?.result, '退回的不交给导航').not.toContain(BAD_TEXT);

    const read = (await toolCalls(app, nav, 'read_session'))[0];
    expect(read?.isError, 'read_session 成功').toBe(false);
    expect(read?.result, 'read_session 带行号给原文').toMatch(
      new RegExp(`L${String(line)} 学习者[^\\n]*没懂起点`),
    );

    // 导航照样交了卡
    expect((await records(app, mainId)).filter((r) => r.record.type === 'choice_card').length).toBe(
      3,
    );
  });

  it('retrieve 点名的学习不存在：退回，不开子会话；子代理不交回就报错给导航', async () => {
    const st = newW3();
    const { app, mainId, fake } = await startW3(st);
    apps.push(app);
    st.navBefore = [{ name: 'retrieve', args: { question: QUESTION, loops: ['no-such-loop'] } }];
    await requestCard(app, mainId);
    const nav = sessionsWithTool(fake, 'retrieve').at(-1) ?? '';
    expect(nav, '导航有 retrieve 工具').not.toBe('');
    expect((await toolCalls(app, nav, 'retrieve'))[0]?.isError, '点名的学习不存在').toBe(true);
    expect(sessionsWithTool(fake, 'submit_findings'), '没开子会话').toEqual([]);

    // 子代理一次也没交回：导航收到报错
    st.navBefore = [{ name: 'retrieve', args: { question: QUESTION } }];
    st.retrieve = () => [];
    await requestCard(app, mainId);
    const nav2 = sessionsWithTool(fake, 'retrieve').at(-1) ?? '';
    expect(sessionsWithTool(fake, 'submit_findings').length, '开了子会话').toBe(1);
    expect((await toolCalls(app, nav2, 'retrieve'))[0]?.isError, '没交回 = 报错').toBe(true);
  });
});
