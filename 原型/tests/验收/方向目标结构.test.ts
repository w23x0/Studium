// 验收（W5）：方向目标结构（docs/设计/记录/方向目标.md「内容」「怎么改」；会话/畅谈.md「交回什么」）。
// settle_goal 交 { title, abilities[{ability, reason, confirmed_reason?}], order_hint?, deadline?, provisional?, known? }
// → project_goal 带这些字段，text = 各块能力用“；”连起来；再谈一次出新的一条、带 supersedes 指上一条，旧行不改。
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import type { ListProjectsResponse } from '../../src/shared/protocol.ts';
import { getJson, records } from '../helpers/http.ts';
import {
  ABILITY_A,
  ABILITY_B,
  boot,
  CONFIRMED_A,
  goals,
  goodGoal,
  inputsWith,
  newW5,
  openTalk,
  ORDER_HINT,
  REASON_A,
  REASON_B,
  talkSays,
  type Loose,
} from './共用/w5-flow.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

const NEW_ABILITY = '能读懂分析力学的入门推导';
const NEW_REASON = '想往理论物理走';

describe('方向目标结构', () => {
  it('settle_goal 新形状存成 project_goal；再谈一次出新的一条，supersedes 指上一条，旧行不改', async () => {
    const st = newW5();
    st.settle = () => goodGoal({ deadline: '2026-12-31' });
    const { app, fake, mainId } = await boot(st);
    apps.push(app);

    const talkId = await openTalk(app, mainId);
    await talkSays(app, talkId, '就这么定了');

    const first = await goals(app, mainId);
    expect(first, '谈定后主对话里有一条方向目标').toHaveLength(1);
    const g1 = first[0];
    if (g1 === undefined) throw new Error('没有方向目标');
    expect(g1.rec, '方向目标带标题、各块能力与理由、顺序参考、期限').toMatchObject({
      title: '经典力学',
      abilities: [
        { ability: ABILITY_A, reason: REASON_A, confirmedReason: CONFIRMED_A },
        { ability: ABILITY_B, reason: REASON_B },
      ],
      orderHint: ORDER_HINT,
      deadline: '2026-12-31',
      talkSessionId: talkId,
    });
    expect(g1.rec.supersedes, '第一条不取代任何一条').toBeUndefined();
    expect(g1.rec.text, '旧的一句话字段 = 各块能力用“；”连起来').toBe(`${ABILITY_A}；${ABILITY_B}`);
    const ability0 = (g1.rec.abilities as Loose[] | undefined)?.[0];
    expect(Object.keys(ability0 ?? {}).sort(), '每块只存能力、理由、确认理由').toEqual(
      ['ability', 'confirmedReason', 'reason'].sort(),
    );

    const talkRecs = (await records(app, talkId)).map((r) => r.record as unknown as Loose);
    expect(
      talkRecs.find((r) => r.type === 'talk_ended'),
      '畅谈结束，交回的一句话同 text',
    ).toMatchObject({ goal: `${ABILITY_A}；${ABILITY_B}`, title: '经典力学' });

    const projects = (await getJson<ListProjectsResponse>(app, '/projects')).projects;
    expect(
      projects.find((p) => p.mainSessionId === mainId),
      '项目列表照旧给一句话方向与项目名（现有界面不报错）',
    ).toMatchObject({
      title: '经典力学',
      goal: `${ABILITY_A}；${ABILITY_B}`,
      deadline: '2026-12-31',
    });

    // 再谈一次：开场给已有的方向目标（结构化），交回出新的一条
    st.settle = () => ({
      title: '理论力学',
      abilities: [{ ability: NEW_ABILITY, reason: NEW_REASON }],
    });
    const talk2 = await openTalk(app, mainId, '我想学点更深的');
    const opening2 = inputsWith(fake, 'settle_goal').find(
      (t) => t.includes('<程序事实>') && t.includes('我想学点更深的'),
    );
    expect(opening2, '再谈时开场写明已有方向目标').toContain('已有方向目标');
    expect(opening2, '已有方向目标给出各块能力').toContain(ABILITY_B);
    expect(opening2, '已有方向目标给出每块理由').toContain(REASON_A);
    expect(opening2, '已有方向目标给出学习者确认的理由').toContain(CONFIRMED_A);
    expect(opening2, '已有方向目标给出顺序参考').toContain(ORDER_HINT);
    await talkSays(app, talk2, '定了');

    const second = await goals(app, mainId);
    expect(second, '新版不覆盖旧版：两条').toHaveLength(2);
    expect(second[0]?.rec, '旧行原样不改').toEqual(g1.rec);
    expect(second[1]?.rec, '新的一条带 supersedes 指上一条的行号').toMatchObject({
      title: '理论力学',
      abilities: [{ ability: NEW_ABILITY, reason: NEW_REASON }],
      text: NEW_ABILITY,
      supersedes: g1.line,
      talkSessionId: talk2,
    });
    expect(second[1]?.rec.orderHint, '没给顺序参考就不带').toBeUndefined();
    const after = (await getJson<ListProjectsResponse>(app, '/projects')).projects;
    expect(
      after.find((p) => p.mainSessionId === mainId),
      '项目取最新一条',
    ).toMatchObject({
      title: '理论力学',
      goal: NEW_ABILITY,
    });
  }, 20000);

  it('冷启动的临时方向目标标 provisional', async () => {
    const st = newW5();
    st.settle = () => goodGoal({ provisional: true });
    const { app, mainId } = await boot(st);
    apps.push(app);
    const talkId = await openTalk(app, mainId);
    await talkSays(app, talkId, '先这么定了');
    const g = await goals(app, mainId);
    expect(g[0]?.rec.provisional, '临时版标 provisional: true').toBe(true);
  }, 20000);
});
