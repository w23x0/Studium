// 验收（W5）：导航开场读结构化方向目标（docs/设计/会话/导航.md「开场给什么」；记录/方向目标.md「谁读」）。
// 出卡时导航的开场给最新一版方向目标的各块能力、每块理由、学习者确认的理由、顺序参考（只作参考）、临时标记；
// 被取代的旧版不给。
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import { post, waitFor } from '../helpers/http.ts';
import {
  ABILITY_A,
  ABILITY_B,
  boot,
  CONFIRMED_A,
  goodGoal,
  inputsWith,
  newW5,
  openTalk,
  ORDER_HINT,
  REASON_A,
  REASON_B,
  talkSays,
} from './共用/w5-flow.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

const OLD_ABILITY = '只想背下运动学的几个公式';

describe('导航开场：方向目标', () => {
  it('给最新一版的各块能力、理由、确认理由、顺序参考与临时标记；不给被取代的旧版', async () => {
    const st = newW5();
    st.settle = () => ({
      title: '运动学',
      abilities: [{ ability: OLD_ABILITY, reason: '应付考试' }],
    });
    const { app, fake, mainId } = await boot(st);
    apps.push(app);
    const t1 = await openTalk(app, mainId);
    await talkSays(app, t1, '先定了');
    st.settle = () => goodGoal({ provisional: true });
    const t2 = await openTalk(app, mainId, '我想学得更深一点');
    await talkSays(app, t2, '这回定了');

    const before = fake.inputs.length;
    await post(app, '/cards/request', { projectId: mainId });
    await waitFor(
      '导航开场',
      () =>
        Promise.resolve(
          fake.inputs.length > before && inputsWith(fake, 'submit_choice_card').length > 0,
        ),
      3000,
    );
    await app.studium.settled();

    const opening = inputsWith(fake, 'submit_choice_card')[0] ?? '';
    expect(opening, '给各块目标能力').toContain(ABILITY_A);
    expect(opening, '给各块目标能力（第二块）').toContain(ABILITY_B);
    expect(opening, '给每块的理由').toContain(REASON_A);
    expect(opening, '给每块的理由（第二块）').toContain(REASON_B);
    expect(opening, '给学习者确认时的理由').toContain(CONFIRMED_A);
    expect(opening, '给顺序参考').toContain(ORDER_HINT);
    expect(opening, '临时版写明“临时”').toContain('临时');
    expect(opening, '被取代的旧版不给').not.toContain(OLD_ABILITY);
  }, 20000);
});
