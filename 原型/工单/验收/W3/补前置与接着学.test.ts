// 验收（W3）：补前置与接着学都经导航的卡——卡项 return_to（补前置合上后回到哪次）/ resume_of（接着哪次没合上的）；
// 带 return_to 的学习合上后导航出卡，触发原因写“补前置合上”，开场给原学习的上层；resume_of 开的学习
// session_opened.resumeOf 指原学习，开场带原学习上层三样（单子、结束原话、路线决定）；原学习正本不改；
// 对话列表标“接着学”的来历，重建派生索引后还在；直开接着学的接口已删。
// 设计：docs/设计/记录/单子与路线.md「没合上那次的上层」；01-流程.md §3；工单 README §2.1。
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import { post, records } from '../helpers/http.ts';
import {
  cardArgs,
  choose,
  endUnclosed,
  learnAndClose,
  navOpenings,
  newW3,
  ofType,
  openingOf,
  opt,
  requestCard,
  routeDecisions,
  say,
  sessionList,
  sessionsWithTool,
  startW3,
} from './共用/w3-flow.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

const END_NOTE = '我想先把前提学了再回来';
const DECISION = '先补前提，补完回原课题';

/** 当前最新那张卡。 */
async function latestCard(app: App, mainId: string): Promise<string> {
  const c = (await records(app, mainId)).filter((r) => r.record.type === 'choice_card').at(-1);
  if (c?.record.type !== 'choice_card') throw new Error('主对话里没有卡');
  return c.record.cardId;
}

describe('补前置与接着学（W3）', () => {
  it('补前置合上 → 导航出卡（触发原因、原学习上层）→ 接着学原学习（resumeOf、开场上层三样）', async () => {
    const st = newW3();
    const { app, mainId, fake, dataRoot } = await startW3(st);
    apps.push(app);

    // 原学习 A：学到一半想先补前提，没合上就结束；导航出的卡里有“补前置（return_to A）”
    st.nextOptions = [opt('原课题'), opt('别的课题')];
    const a = await choose(app, (await requestCard(app, mainId)).cardId, 0);
    await say(app, a, '这里要用到的前提我不会');
    st.nextOptions = [
      opt('前提课题', { route_action: '补前置', return_to: a }),
      opt('接着原课题', { route_action: '接着学', resume_of: a }),
    ];
    st.decision = { decision: DECISION, reason: '学习者在原课题里卡在前提上' };
    await endUnclosed(app, a, END_NOTE);
    const aBefore = JSON.stringify(await records(app, a));

    // 选补前置：开 B，单子带 returnTo
    const b = await choose(app, await latestCard(app, mainId), 0);
    const bOpened = (await records(app, b))[0]?.record;
    expect(
      bOpened?.type === 'session_opened' ? bOpened.ticket : undefined,
      'B 的单子',
    ).toMatchObject({ routeAction: '补前置', returnTo: a });

    // B 合上 → 导航出卡，触发原因写“补前置合上”，开场给 A 的上层
    st.nextOptions = [opt('接着原课题', { route_action: '接着学', resume_of: a }), opt('换个课题')];
    st.decision = { decision: '回到原课题', reason: '前提补上了' };
    await learnAndClose(app, b);
    const card = (await records(app, mainId)).filter((r) => r.record.type === 'choice_card').at(-1);
    expect(
      card?.record.type === 'choice_card' && card.record.trigger.startsWith('补前置合上：'),
      '卡的触发原因以“补前置合上”开头',
    ).toBe(true);
    const rd = (await routeDecisions(app, mainId)).at(-1);
    expect(rd?.trigger.startsWith('补前置合上：'), '路线决定的触发以“补前置合上”开头').toBe(true);
    expect(rd?.trigger, '触发原因写补前置那次（补前置合上：<标题>（<学习 id>））').toContain(
      `（${b}）`,
    );
    const navOpening = navOpenings(fake).at(-1) ?? '';
    expect(navOpening, '开场触发原因').toMatch(/触发原因[^\n]*补前置合上/);
    expect(navOpening, '开场给原学习').toContain(a);
    expect(navOpening, '原学习的单子').toContain('原课题的新点');
    expect(navOpening, '原学习的结束原话').toContain(END_NOTE);
    expect(navOpening, '原学习当时的路线决定').toContain(DECISION);

    // 选“接着学原课题”：开 C，resumeOf 指 A，开场带 A 的上层三样
    const c = await choose(app, await latestCard(app, mainId), 0);
    const cOpened = (await records(app, c))[0]?.record;
    if (cOpened?.type !== 'session_opened') throw new Error('C 没有开场记录');
    expect(cOpened.resumeOf?.fromLoop, 'session_opened.resumeOf 指原学习').toBe(a);
    expect(cOpened.ticket, 'C 的单子带 resumeOf').toMatchObject({ resumeOf: a });
    const cOpening = openingOf(fake, c);
    expect(cOpening, '接着学的开场带原学习的单子').toContain('原课题的新点');
    expect(cOpening, '接着学的开场带原学习的结束原话').toContain(END_NOTE);
    expect(cOpening, '接着学的开场带原学习的路线决定').toContain(DECISION);
    expect(cOpening, '开场不提停车记录').not.toContain('停车记录');

    // 原学习的正本一字不改
    expect(JSON.stringify(await records(app, a)), 'A 的正本不改').toBe(aBefore);

    // 对话列表：C 标“接着学 A”；重建派生索引后还在
    const fromOf = async (x: App, id: string) =>
      (await sessionList(x)).find((s) => s.sessionId === id)?.from;
    expect(await fromOf(app, c), '列表里 C 的来历').toEqual({ kind: 'resume', loop: a });
    await app.close();
    apps.splice(0);
    rmSync(join(dataRoot, 'index.sqlite'), { force: true });
    const again = await startW3(st, dataRoot);
    apps.push(again.app);
    expect(await fromOf(again.app, c), '重建派生索引后 C 的来历还在').toEqual({
      kind: 'resume',
      loop: a,
    });
  });

  it('卡上的 return_to / resume_of 不对就退回；直开接着学的接口已删', async () => {
    const st = newW3();
    const { app, mainId, fake } = await startW3(st);
    apps.push(app);
    const closed = await choose(app, (await requestCard(app, mainId)).cardId, 0);
    await learnAndClose(app, closed);
    const unclosed = await choose(app, await latestCard(app, mainId), 0);
    await endUnclosed(app, unclosed, '先到这');

    st.navSubmits = [
      // 接着学不存在的学习
      {
        name: 'submit_choice_card',
        args: cardArgs(st, [opt('甲', { resume_of: 'no-such-loop' }), opt('乙')]),
      },
      // 接着学一次合上了的学习
      {
        name: 'submit_choice_card',
        args: cardArgs(st, [opt('甲', { resume_of: closed }), opt('乙')]),
      },
      // 补前置要回到一次合上了的学习
      {
        name: 'submit_choice_card',
        args: cardArgs(st, [opt('甲', { route_action: '补前置', return_to: closed }), opt('乙')]),
      },
      // 合规矩
      {
        name: 'submit_choice_card',
        args: cardArgs(st, [
          opt('甲', { route_action: '接着学', resume_of: unclosed }),
          opt('乙', { route_action: '补前置', return_to: unclosed }),
        ]),
      },
    ];
    await requestCard(app, mainId);
    const nav = sessionsWithTool(fake, 'submit_choice_card').at(-1) ?? '';
    const calls = ofType(await records(app, nav), 'tool_call').filter(
      (r) => r.record.name === 'submit_choice_card',
    );
    expect(
      calls.map((r) => r.record.isError),
      '不存在的、合上了的被退回，合规矩的收下',
    ).toEqual([true, true, true, false]);

    // 直开接着学的接口已删
    expect((await post(app, `/sessions/${unclosed}/continue`)).status, '/continue 已删').toBe(404);
  });
});
