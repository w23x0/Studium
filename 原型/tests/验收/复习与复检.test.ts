// 验收：复习 / 复检（M05:24-25）。只经 HTTP 验证，模型是假模型。
// - M05 开场给“哪些点多久没碰了、当时证据强度”（程序整理，不写死天数）；
// - M05 出卡时选项可带 revisit（复习 / 复检 + 以前的形成记录），单子指向以前合上过的点；指错的被退回；
// - 复检闭环是短闭环：开场带以前的记录，守卫照常判；结果写 M09 时标明是复检。
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import type { NumberedRecord } from '../../src/shared/records.ts';
import { getJson, post, records, waitFor } from '../helpers/http.ts';
import { openLoop } from '../helpers/detour-flow.ts';
import {
  advanceDays,
  AVG_OPTION,
  DISPLACEMENT_SRC,
  firstFormationId,
  formations,
  hasTool,
  learnAndClose,
  newLong,
  startLong,
  type LongState,
} from '../helpers/longterm-flow.ts';
import type { FakeModel } from '../../src/core/model/fake.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

/** M05 出选择卡时：第一项是对位移的复检 / 复习（formation id 取开场里的）。 */
function reviewOverride(
  st: LongState,
  kind: '复习' | '复检',
  formationId?: () => string | undefined,
) {
  st.override = (ctx) => {
    if (!hasTool(ctx, 'submit_choice_card')) return undefined;
    const id = formationId?.() ?? firstFormationId(ctx.input.text);
    return {
      calls: [
        {
          name: 'submit_choice_card',
          args: {
            options: [
              {
                ...DISPLACEMENT_SRC,
                revisit: { kind, formation_ids: id !== undefined ? [id] : [] },
              },
              AVG_OPTION,
            ],
            recommended: 0,
          },
        },
      ],
    };
  };
}

const m05Openings = (fake: FakeModel): string[] =>
  fake.inputs.filter((i) => i.text.includes('触发原因')).map((i) => i.text);

async function learnDisplacement(st: LongState) {
  const s = await startLong(st);
  apps.push(s.app);
  const { loopId } = await openLoop(s.app, s.mainId, 0);
  await learnAndClose(s.app, loopId);
  return { ...s, firstLoop: loopId };
}

describe('复习与复检', () => {
  it('M05 开场给各点多久没碰了与当时的证据强度', async () => {
    const st = newLong();
    const { app, mainId, fake } = await learnDisplacement(st);
    advanceDays(st, 20);
    await post(app, '/cards/request', { projectId: mainId });
    await app.studium.settled();
    const opening = m05Openings(fake).at(-1) ?? '';
    expect(opening).toContain('长期读数');
    expect(opening).toContain('p-displacement「位移」');
    expect(opening).toContain('距今 20 天');
    expect(opening).toContain('仅当场、独立');
    expect(opening).toContain('记录 f-');
  });

  it('复检：单子指向以前合上过的点，开场带以前的记录；结果写 M09 时标明是复检', async () => {
    const st = newLong();
    const { app, mainId, fake, firstLoop } = await learnDisplacement(st);
    const old = (await formations(app, firstLoop))[0];
    expect(old?.revisit).toBeUndefined();
    advanceDays(st, 20);
    reviewOverride(st, '复检');
    const { loopId } = await openLoop(app, mainId, 0);

    // 正本里：session_opened 的单子带 revisit，指向以前那条形成记录
    const opened = (await records(app, loopId))[0]?.record;
    expect(opened).toMatchObject({
      type: 'session_opened',
      ticket: { newPoint: 'p-displacement', revisit: { kind: '复检', formationIds: [old?.id] } },
    });
    // 闭环开场：是复检、不是第一次学，带着以前的记录
    const loopOpening = fake.inputs.find(
      (i) => i.spec.session?.id === loopId && i.text.includes('本闭环的单子'),
    )?.text;
    expect(loopOpening).toContain('这是一次复检，不是第一次学这个点');
    expect(loopOpening).toContain(old?.id ?? '无');
    // 项目页的闭环带复检标记
    const o = await getJson<{ overview: { groups: { inProgress: { revisit?: string }[] } } }>(
      app,
      `/projects/${mainId}/overview`,
    );
    expect(o.overview.groups.inProgress[0]?.revisit).toBe('复检');

    // 守卫照常判；合上后写 M09，形成记录上标明复检
    await learnAndClose(app, loopId);
    const written = (await formations(app, loopId))[0];
    expect(written?.revisit).toEqual({ kind: '复检', formationIds: [old?.id] });
    expect(written?.version).toBe(1);
    // 以前的记录没有被改
    expect((await formations(app, firstLoop))[0]?.revisit).toBeUndefined();
    expect(await formations(app)).toHaveLength(2);
  });

  it('复习闭环同样带标记', async () => {
    const st = newLong();
    const { app, mainId, firstLoop } = await learnDisplacement(st);
    const old = (await formations(app, firstLoop))[0];
    reviewOverride(st, '复习');
    const { loopId } = await openLoop(app, mainId, 0);
    await learnAndClose(app, loopId);
    expect((await formations(app, loopId))[0]?.revisit).toEqual({
      kind: '复习',
      formationIds: [old?.id],
    });
  });

  it('指向不存在的形成记录，选择卡被退回，不出卡', async () => {
    const st = newLong();
    const { app, mainId } = await learnDisplacement(st);
    reviewOverride(st, '复检', () => 'f-00000000');
    const before = (await records(app, mainId)).filter(
      (r) => r.record.type === 'choice_card',
    ).length;
    await post(app, '/cards/request', { projectId: mainId });
    await app.studium.settled();
    expect(
      (await records(app, mainId)).filter((r) => r.record.type === 'choice_card'),
    ).toHaveLength(before);
    // 退回的原因记在 M05 会话的工具调用里
    const m05 = (
      await getJson<{ sessions: { sessionId: string; kind: string }[] }>(app, '/sessions')
    ).sessions
      .filter((s) => s.kind === 'm05')
      .at(-1);
    const calls = (await records(app, m05?.sessionId ?? '')).filter(
      (
        r,
      ): r is NumberedRecord & {
        record: { type: 'tool_call'; result: string; isError: boolean };
      } => r.record.type === 'tool_call',
    );
    const last = calls.at(-1)?.record;
    expect(last?.isError).toBe(true);
    expect(last?.result).toContain('M09 里没有形成记录 f-00000000');
    await waitFor('没有悬着的后台', () => Promise.resolve(!app.studium.busy()));
  });
});
