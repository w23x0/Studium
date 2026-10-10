// 验收：M09 分析可重做、多版本并存（M09:18）。只经 HTTP 验证，模型是假模型。
// - 对一个已合上的闭环，程序触发重新分析：新版本并存，不覆盖旧的，记模型；
// - 当前视图默认取最新版本，旧版本仍可查；
// - 不在闭环结束时自动重做；没合上的闭环、不存在的闭环不能重做。
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import type { PointViewDetailResponse } from '../../src/shared/protocol.ts';
import { openLoop } from '../helpers/detour-flow.ts';
import { learnerLine } from '../helpers/roles.ts';
import { post, getJson, records } from '../helpers/http.ts';
import { SAY, settled } from '../helpers/evidence-flow.ts';
import {
  formations,
  hasTool,
  learnAndClose,
  newLong,
  startLong,
} from '../helpers/longterm-flow.ts';
import { FakeModel } from '../../src/core/model/fake.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

const STRENGTH = { time: '仅当场', independence: '独立' } as const;

describe('M09 分析重做', () => {
  it('重新分析写出新版本，旧版本不动；当前视图取最新版，旧版本可查；合上时不自动重做', async () => {
    const st = newLong();
    let redoModelSeen = '';
    st.override = (ctx) => {
      if (!hasTool(ctx, 'write_formation_record') || ctx.input.role !== 'program') return undefined;
      const redo = ctx.input.text.includes('重新分析');
      redoModelSeen = redo ? ctx.input.text : redoModelSeen;
      const line = learnerLine(ctx.input.text, '终点减起点');
      return {
        calls: [
          {
            name: 'write_formation_record',
            args: {
              new_point: 'p-displacement',
              clause: 'c-disp-from-pos',
              start_points: ['p-position'],
              understanding: redo ? '位移是矢量，只看起点和终点' : '位移只看起点终点',
              process: '自己说',
              unmet: '',
              new_point_evidence: STRENGTH,
              start_point_evidence: [{ point: 'p-position', ...STRENGTH }],
              evidence_lines: [line],
              summary: redo ? '第二版摘要' : '第一版摘要',
              level: redo ? '结构' : '复现',
            },
          },
        ],
      };
    };
    const { app, mainId } = await startLong(st);
    apps.push(app);
    const { loopId } = await openLoop(app, mainId, 0);
    await learnAndClose(app, loopId);

    // 合上时只写了一版，没有自动重做
    let rows = await formations(app, loopId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ version: 1, latest: true });
    const v1 = rows[0];
    expect(
      (await getJson<PointViewDetailResponse>(app, '/m09/view/p-displacement')).entry,
    ).toMatchObject({ summary: '第一版摘要', level: '复现', versions: 1 });

    // 程序触发重新分析
    expect((await post(app, '/m09/reanalyze', { loop: loopId })).status).toBe(202);
    await app.studium.settled();
    rows = await formations(app, loopId);
    expect(rows.map((r) => [r.version, r.latest])).toEqual([
      [1, false],
      [2, true],
    ]);
    // 旧版本原样还在
    expect(JSON.stringify(rows[0])).toBe(JSON.stringify({ ...v1, latest: false }));
    // 新版本记着实际执行的模型
    expect(rows[1]?.model.name).toBe(FakeModel.MODEL_NAME);
    expect(rows[1]?.understanding).toContain('矢量');
    expect(redoModelSeen).toContain('已经有 1 版分析');

    // 当前视图取最新一版；同一个闭环不重复算
    const view = (await getJson<PointViewDetailResponse>(app, '/m09/view/p-displacement')).entry;
    expect(view).toMatchObject({ summary: '第二版摘要', level: '结构', versions: 2 });
    expect(view.sources.loops).toBe(1);
    // 不带 loop 的查询（旧版本可查）两版都在
    expect(await formations(app)).toHaveLength(2);

    // 重新分析的会话没有“追加时间版本记录”的工具，也不改闭环正本
    const m09s = (
      await getJson<{ sessions: { sessionId: string; kind: string; parent?: string }[] }>(
        app,
        '/sessions',
      )
    ).sessions.filter((s) => s.kind === 'm09' && s.parent === loopId);
    expect(m09s).toHaveLength(2);
    expect((await records(app, loopId)).filter((r) => r.record.type === 'loop_ended')).toHaveLength(
      1,
    );
  });

  it('没合上的闭环、不存在的闭环、没有分析记录的不能重做', async () => {
    const st = newLong();
    const { app, mainId } = await startLong(st);
    apps.push(app);
    const { loopId } = await openLoop(app, mainId, 0);
    await post(app, `/sessions/${loopId}/messages`, { text: SAY });
    await settled(app, loopId);
    expect((await post(app, '/m09/reanalyze', { loop: loopId })).status).toBe(400);
    await post(app, `/sessions/${loopId}/end`, { note: '到这' });
    await app.studium.settled();
    expect((await post(app, '/m09/reanalyze', { loop: loopId })).status).toBe(400);
    expect((await post(app, '/m09/reanalyze', { loop: 'no-such-loop' })).status).toBe(400);
    expect((await post(app, '/m09/reanalyze', {})).status).toBe(400);
    expect(await formations(app)).toHaveLength(0);
  });
});
