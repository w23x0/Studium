// 验收：M09 当前视图与索引摘要（M09:30）。只经 HTTP 验证，模型是假模型。
// - 每个点一行：当前档次、状态、最近一次证据（强度）、一句话摘要、检索词；
// - 派生层：不存盘，重启后从记录重算得出同样的结果；可按关键词查；
// - 外部导入（未验证）的点单独标“仅外部导入”，没有证据也不冒充闭环证据；
// - 模型也能查（query_m09_view 工具）。
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import type { PointViewDetailResponse, PointViewResponse } from '../../src/shared/protocol.ts';
import { openLoop } from '../helpers/detour-flow.ts';
import { getJson, post, records, waitFor } from '../helpers/http.ts';
import { settled } from '../helpers/evidence-flow.ts';
import { advanceDays, learnAndClose, newLong, startLong } from '../helpers/longterm-flow.ts';
import { learnerLine } from '../helpers/roles.ts';
import { hasTool } from '../helpers/longterm-flow.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

const STRENGTH = { time: '含变式', independence: '独立' } as const;

describe('M09 当前视图', () => {
  it('每个点一行：档次、状态、最近证据与强度、摘要、检索词；重启后从记录重算得出同样的结果', async () => {
    const st = newLong();
    st.override = (ctx) => {
      if (!hasTool(ctx, 'write_formation_record') || ctx.input.role !== 'program') return undefined;
      const line = learnerLine(ctx.input.text, '终点减起点');
      return {
        calls: [
          {
            name: 'write_formation_record',
            args: {
              new_point: 'p-displacement',
              clause: 'c-disp-from-pos',
              start_points: ['p-position'],
              understanding: '位移只看起点终点。和路程不同。',
              process: '自己说',
              unmet: '',
              new_point_evidence: STRENGTH,
              start_point_evidence: [
                { point: 'p-position', time: '仅当场', independence: '提示后' },
              ],
              evidence_lines: [line],
              level: '复现',
              keywords: ['位移', '起点终点'],
            },
          },
        ],
      };
    };
    const s = await startLong(st);
    apps.push(s.app);
    const { loopId } = await openLoop(s.app, s.mainId, 0);
    await learnAndClose(s.app, loopId);
    advanceDays(st, 5);

    const view = await getJson<PointViewResponse>(s.app, '/m09/view');
    const disp = view.entries.find((e) => e.point.id === 'p-displacement');
    expect(disp).toMatchObject({
      point: { id: 'p-displacement', name: '位移' },
      level: '复现',
      status: '闭环证据',
      daysSince: 5,
      // 没给摘要时取“学出的理解”的第一句
      summary: '位移只看起点终点。',
      versions: 1,
      sources: { loops: 1, external: 0 },
    });
    expect(disp?.keywords).toEqual(expect.arrayContaining(['位移', '起点终点']));
    expect(disp?.lastEvidence).toMatchObject({
      loopSessionId: loopId,
      role: '新点',
      strength: '含变式、独立',
    });
    // 出发点也有一行：作为出发点用过，证据强度是那次标的
    const pos = view.entries.find((e) => e.point.id === 'p-position');
    expect(pos?.lastEvidence).toMatchObject({ role: '出发点', strength: '仅当场、提示后' });
    expect(pos?.level).toBeUndefined();

    // 按关键词查、按状态筛
    const hit = await getJson<PointViewResponse>(
      s.app,
      `/m09/view?q=${encodeURIComponent('起点终点')}`,
    );
    expect(hit.entries.map((e) => e.point.id)).toEqual(['p-displacement']);
    expect(
      (await getJson<PointViewResponse>(s.app, `/m09/view?status=${encodeURIComponent('降档')}`))
        .entries,
    ).toHaveLength(0);
    const detail = await getJson<PointViewDetailResponse>(s.app, '/m09/view/p-displacement');
    expect(detail.entry.point.name).toBe('位移');

    // 派生层：重启（内存全丢）后从记录重算，结果一样
    const before = JSON.stringify(view.entries);
    await s.app.close();
    apps.pop();
    const again = await startLong(st, s.dataRoot);
    apps.push(again.app);
    const rebuilt = await getJson<PointViewResponse>(again.app, '/m09/view');
    expect(JSON.stringify(rebuilt.entries)).toBe(before);
  });

  it('只有外部导入的点标“仅外部导入”，不冒充闭环证据；模型有查询工具', async () => {
    const st = newLong();
    const s = await startLong(st);
    apps.push(s.app);
    // 经畅谈：学习者自己说“微积分学过”，交回方向时记成外部导入（自述、未验证）
    st.override = (ctx) => {
      if (hasTool(ctx, 'open_goal_talk')) {
        return ctx.input.role === 'learner' && ctx.input.text.includes('想学')
          ? { calls: [{ name: 'open_goal_talk', args: {} }], text: '我们单独谈谈。' }
          : { text: '好。' };
      }
      if (hasTool(ctx, 'settle_goal')) {
        if (ctx.input.role === 'program') return { text: '你学过什么？' };
        const line = Number(/\[第 (\d+) 行\]/.exec(ctx.input.text)?.[1] ?? 0);
        return {
          calls: [
            {
              name: 'settle_goal',
              args: {
                goal: '学经典力学',
                project_name: '经典力学',
                known: [{ claim: '学过位置与坐标', point: 'p-position', lines: [line] }],
              },
            },
          ],
        };
      }
      return undefined;
    };
    await post(s.app, `/sessions/${s.mainId}/messages`, { text: '想学经典力学' });
    const talkId = await waitFor('畅谈对话开出', async () => {
      const r = (await records(s.app, s.mainId)).find((x) => x.record.type === 'task_opened');
      return r?.record.type === 'task_opened' ? r.record.sessionId : undefined;
    });
    await settled(s.app, talkId);
    await post(s.app, `/sessions/${talkId}/messages`, { text: '微积分学过' });
    await waitFor('方向交回', async () =>
      (await records(s.app, talkId)).some((r) => r.record.type === 'talk_ended'),
    );
    await s.app.studium.settled();
    const view = await getJson<PointViewResponse>(s.app, '/m09/view');
    expect(view.entries).toHaveLength(1);
    expect(view.entries[0]).toMatchObject({
      point: { id: 'p-position' },
      status: '仅外部导入',
      sources: { loops: 0, external: 1 },
    });
    expect(view.entries[0]?.lastEvidence).toBeUndefined();
    expect(view.entries[0]?.summary).toContain('未验证');
    // 闭环里查询工具可用
    const { loopId } = await openLoop(s.app, s.mainId, 0);
    const tools = s.fake.opened.find((o) => o.session?.id === loopId)?.tools.map((t) => t.name);
    expect(tools).toContain('query_m09_view');
  });
});
