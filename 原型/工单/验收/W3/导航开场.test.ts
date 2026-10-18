// 验收（W3）：导航开场按设计给事实——方向目标（最新）、触发原因、期限、路线事实、停车场（没合上那些次的上层）、
// 学过的记录上 / 中层（太多时最近 20 次 + 总数）；不再出现知识点、M08 / M09；没合上触发时附那次的完整对话（带行号）；
// 导航工具：资料查询、read_session、retrieve，没有小卡 / 停车 / 知识点工具。设计：docs/设计/会话/导航.md「开场给什么」「能读什么 · 工具」。
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import { post, records } from '../helpers/http.ts';
import {
  BASIS,
  choose,
  endUnclosed,
  learnAndClose,
  navOpenings,
  newW3,
  ofType,
  opt,
  requestCard,
  routeDecisions,
  say,
  sessionsWithTool,
  startW3,
  toolNames,
  UNDERSTAND,
} from './共用/w3-flow.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

const OLD_GOAL = '旧方向：只学运动学的几个公式';
const NEW_GOAL = '新方向：学完力学入门第一章，能自己推出平均速度';
const END_NOTE = '先到这，我想先去学别的';

/** 开场里一个小节：从“── 名字 ──”那行起，到下一个“── ”小节标题前（小节写法见工单「导航开场」）。 */
function section(text: string, name: string): string {
  const a = text.indexOf(`── ${name}`);
  if (a < 0) return '';
  const b = text.indexOf('\n── ', a + 1);
  return text.slice(a, b < 0 ? undefined : b);
}

describe('导航开场（W3）', () => {
  it('给方向目标（最新）、触发原因、期限、路线事实、停车场上层、学过的记录上中层；不含知识点 / M09', async () => {
    const { app, mainId, fake, st } = await startW3(newW3());
    apps.push(app);
    // 方向目标：两条，开场只给最新那条
    await app.hub.record(mainId, {
      type: 'project_goal',
      at: new Date().toISOString(),
      text: OLD_GOAL,
    });
    await app.hub.record(mainId, {
      type: 'project_goal',
      at: new Date().toISOString(),
      text: NEW_GOAL,
    });
    expect(
      (await post(app, `/projects/${mainId}/deadline`, { deadline: '2026-12-20' })).status,
      '记期限',
    ).toBe(200);

    // 第一次：学课题甲，合上
    st.nextOptions = [opt('课题甲'), opt('课题乙')];
    st.decision = { decision: '先学课题甲', reason: '离已会的最近' };
    const c1 = await requestCard(app, mainId);
    const a = await choose(app, c1.cardId, 0);
    st.nextOptions = [opt('课题丙'), opt('课题丁')];
    st.decision = { decision: '合上后接着学课题丙', reason: '课题甲合上了' };
    await learnAndClose(app, a);

    // 第二次：学课题丙，没合上就结束
    const c2 = (await records(app, mainId)).filter((r) => r.record.type === 'choice_card').at(-1);
    if (c2?.record.type !== 'choice_card') throw new Error('合上后应当出了卡');
    const c = await choose(app, c2.record.cardId, 0);
    await say(app, c, '我觉得得先弄清课题丙的前提');
    st.decision = { decision: '先补课题丙的前提再回来', reason: '学习者在丙里卡在前提上' };
    await endUnclosed(app, c, END_NOTE);

    // 学习者要下一步：看这一次的导航开场
    await requestCard(app, mainId);
    const opening = navOpenings(fake).at(-1) ?? '';

    expect(opening, '开场写触发原因').toContain('触发原因');
    expect(opening, '开场给最新的方向目标').toContain(NEW_GOAL);
    expect(opening, '旧的方向目标不再给').not.toContain(OLD_GOAL);
    expect(opening, '开场给期限').toContain('2026-12-20');

    const route = section(opening, '路线事实');
    expect(route, '路线事实给以往的卡与学习者的选择').toContain('课题丙');
    expect(route, '路线事实给路线决定').toContain('先补课题丙的前提再回来');

    const park = section(opening, '停车场');
    expect(park, '停车场里有那次没合上的学习').toContain(c);
    expect(park, '停车场给单子（上层）').toContain('课题丙的新点');
    expect(park, '停车场给结束原话（上层）').toContain(END_NOTE);
    expect(park, '停车场给导航当时的路线决定（上层）').toContain('先补课题丙的前提再回来');
    expect(park, '合上的不进停车场').not.toContain(a);

    const learned = section(opening, '学过的记录');
    expect(learned, '学过的记录列出合上的那次').toContain(a);
    expect(learned, '上层：单子').toContain('课题甲的新点');
    expect(learned, '中层：通过的判定依据').toContain(BASIS);
    expect(learned, '中层：实际理解').toContain(UNDERSTAND);
    expect(learned, '没合上的也是学过的记录（上层）').toContain(c);

    expect(opening, '程序事实里不再出现知识点 / M08 / M09').not.toMatch(/知识点|M08|M09/);

    // 工具：资料查询、读一次会话原文、派检索子代理；没有小卡 / 停车 / 知识点工具
    const nav = sessionsWithTool(fake, 'submit_choice_card').at(-1) ?? '';
    const tools = toolNames(fake, nav);
    for (const t of [
      'retrieve',
      'read_session',
      'textbook_index',
      'read_source',
      'search_textbook',
    ]) {
      expect(tools, `导航有 ${t}`).toContain(t);
    }
    for (const t of [
      'read_loop',
      'request_detour',
      'submit_detour_card',
      'submit_parking_note',
      'search_points',
      'get_point',
      'query_m09',
    ]) {
      expect(tools, `导航没有 ${t}`).not.toContain(t);
    }
  });

  it('没合上触发：开场附那次学习的完整对话（带行号）；路线决定的触发写那次学习、取代上一条', async () => {
    const { app, mainId, fake } = await startW3(newW3());
    apps.push(app);
    const c1 = await requestCard(app, mainId);
    const loop = await choose(app, c1.cardId, 0);
    const lines = ['第一句：位移是什么', '第二句：我好像没懂起点', '第三句：我想先学坐标'];
    for (const l of lines) await say(app, loop, l);
    await endUnclosed(app, loop, '先到这');

    const opening = navOpenings(fake).at(-1) ?? '';
    expect(opening, '触发原因写没合上').toMatch(/触发原因[^\n]*没合上/);
    const learnerRows = ofType(await records(app, loop), 'user_message');
    expect(learnerRows.length).toBe(3);
    for (const r of learnerRows) {
      expect(opening, `开场带那次学习第 ${String(r.line)} 行学习者原话与行号`).toMatch(
        new RegExp(`L${String(r.line)} 学习者[^\\n]*${r.record.text}`),
      );
    }

    const decisions = await routeDecisions(app, mainId);
    expect(decisions.length, '每次出卡写一条路线决定').toBe(2);
    const last = decisions.at(-1);
    expect(last?.trigger.startsWith('没合上：'), '路线决定的触发以“没合上”开头').toBe(true);
    expect(last?.trigger, '触发原因写那次学习（W2 格式：没合上：<标题>（<学习 id>））').toContain(
      `（${loop}）`,
    );
    expect(last?.supersedes, '新决定取代主对话里上一条').toBe(decisions[0]?.line);
  });

  it('学过的记录太多：给最近 20 次 + 总数，其余经检索子代理', async () => {
    const st = newW3();
    const { app, mainId, fake } = await startW3(st);
    apps.push(app);
    for (let i = 1; i <= 21; i++) {
      const n = String(i).padStart(2, '0');
      st.nextOptions = [opt(`第${n}次课题`), opt(`第${n}次备选`)];
      const card = await requestCard(app, mainId);
      await choose(app, card.cardId, 0);
    }
    await requestCard(app, mainId);
    const opening = navOpenings(fake).at(-1) ?? '';
    const learned = section(opening, '学过的记录');
    expect(learned, '写明总数').toContain('共 21 次');
    expect(learned, '最近一次在列').toContain('第21次课题的新点');
    expect(learned, '第 2 次在列（最近 20 次）').toContain('第02次课题的新点');
    expect(opening, '最早那次不在开场里（经检索子代理查）').not.toContain('第01次课题');
    expect(learned, '提示其余用检索子代理').toContain('retrieve');
  }, 30_000);
});
