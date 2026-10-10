// 验收：M09 记录、M10 教法记录、M15 当前状态页与底层记录、M08 点与子句都能被学习者查看（M08:33 M15:40 总览「横切原则」5）。
// 只经 HTTP 验证。每条记录带来源、依据行与那几行原话、实际执行的模型；M08 标明书给的 / 模型补的。
import { afterEach, describe, expect, it } from 'vitest';
import type {
  Clause08Response,
  FormationsResponse,
  Point08Response,
  Points08Response,
  StateResponse,
  StrategiesResponse,
} from '../../src/shared/protocol.ts';
import type { App } from '../../src/core/app.ts';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createApp } from '../../src/core/app.ts';
import { FakeModel } from '../../src/core/model/fake.ts';
import { call, getJson, TOKEN } from '../helpers/http.ts';
import { tempDir } from '../helpers/tmp.ts';
import {
  SAY,
  confirmAndSettle,
  newState,
  requestClose,
  startApp,
  startLoop,
} from '../helpers/evidence-flow.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

describe('记录与知识点可见', () => {
  it('M09 / M10 / M15 的记录带依据行原话与模型；可按闭环筛', async () => {
    const { app, mainId } = await startApp(newState());
    apps.push(app);
    // 还没有任何记录
    expect((await getJson<FormationsResponse>(app, '/m09/records')).records).toEqual([]);
    expect((await getJson<StateResponse>(app, '/m15/state')).current).toBeUndefined();

    const { loopId } = await startLoop(app, mainId);
    await requestClose(app, loopId, 1);
    await confirmAndSettle(app, loopId);

    const m09 = (await getJson<FormationsResponse>(app, '/m09/records')).records;
    expect(m09).toHaveLength(1);
    expect(m09[0]).toMatchObject({
      loopSessionId: loopId,
      newPoint: { id: 'p-displacement', name: '位移' },
      startPoints: [{ id: 'p-position', name: '位置' }],
      understanding: '位移只看起点终点',
      model: { name: 'fake-model-1', known: true },
      evidence: { newPoint: { time: '仅当场', independence: '独立' } },
      objections: [],
    });
    expect(m09[0]?.quotes.map((q) => q.text)).toEqual([SAY]);
    // 按闭环筛
    const byLoop = await getJson<FormationsResponse>(app, `/m09/records?loop=${loopId}`);
    expect(byLoop.records.map((r) => r.id)).toEqual([m09[0]?.id]);
    expect((await getJson<FormationsResponse>(app, '/m09/records?loop=other')).records).toEqual([]);

    const m10 = (await getJson<StrategiesResponse>(app, `/m10/records?loop=${loopId}`)).records;
    expect(m10).toHaveLength(1);
    expect(m10[0]).toMatchObject({
      strategies: '先让学习者用自己的话说',
      model: { known: true },
      objections: [],
    });
    expect(m10[0]?.quotes[0]?.text).toBe(SAY);
    expect((await getJson<StrategiesResponse>(app, '/m10/records?loop=other')).records).toEqual([]);

    // M15：当前状态页 + 底层记录（来源、依据行原话）
    const state = await getJson<StateResponse>(app, '/m15/state');
    expect(state.current).toMatchObject({
      stage: '证据不足',
      basisSpan: '本次会话',
      model: { known: true },
    });
    expect(state.records).toHaveLength(1);
    expect(state.records[0]).toMatchObject({
      source: '自述',
      output: '承载读数',
      timeRange: '本次会话',
      objections: [],
    });
    expect(state.records[0]?.refs[0]?.sessionId).toBe(loopId);
    expect(state.records[0]?.refs[0]?.quotes[0]?.text).toBe(SAY);
  });

  it('M08：按 id 查、关键词搜、列出进入 / 出发的子句，标来源', async () => {
    const { app } = await startApp(newState());
    apps.push(app);
    const all = await getJson<Points08Response>(app, '/m08/points');
    expect(all.empty).toBe(false);
    expect(all.points.length).toBeGreaterThanOrEqual(10);
    expect(all.points.every((p) => p.sourceNote !== '')).toBe(true);

    const hit = await getJson<Points08Response>(app, `/m08/points?q=${encodeURIComponent('位移')}`);
    expect(hit.points.map((p) => p.id)).toContain('p-displacement');
    expect(hit.points.length).toBeLessThan(all.points.length);
    expect(
      (await getJson<Points08Response>(app, '/m08/points?q=没有这个词绝对不存在')).points,
    ).toEqual([]);

    const one = await getJson<Point08Response>(app, '/m08/points/p-displacement');
    expect(one.point).toMatchObject({
      name: '位移',
      source: '书给的',
      sourceNote: '原文有支撑',
    });
    expect(one.point.anchors[0]?.file).toBe('ch01/sec-1.1.md');
    expect(one.into.map((c) => c.id)).toEqual(['c-disp-from-pos']);
    expect(one.from.map((c) => c.id)).toEqual(['c-avgv-from-disp']);
    expect(one.into[0]).toMatchObject({
      from: [{ id: 'p-position', name: '位置' }],
      to: { id: 'p-displacement', name: '位移' },
    });

    const clause = await getJson<Clause08Response>(app, '/m08/clauses/c-disp-from-pos');
    expect(clause.clause.source).toBe('书给的');
    expect(clause.clause.text).toContain('位移');

    expect((await call(app, '/m08/points/nope')).status).toBe(404);
    expect((await call(app, '/m08/clauses/nope')).status).toBe(404);
  });

  it('M08：模型补的、未审的点与子句标明来源', async () => {
    const m08Dir = join(await tempDir(), 'm08');
    await mkdir(m08Dir, { recursive: true });
    const anchor = { book: '书', file: 'a.md', quote: '原文', page: 3, bbox: [1, 2, 3, 4] };
    await writeFile(
      join(m08Dir, 'points.jsonl'),
      [
        { id: 'p1', name: '甲', sentence: '甲是甲', anchors: [anchor], source: '书给的' },
        {
          id: 'p2',
          name: '乙',
          sentence: '乙是乙',
          anchors: [],
          source: '模型补的',
          scope: '前置',
        },
        { id: 'p3', name: '丙', sentence: '丙是丙', anchors: [], source: '未审' },
      ]
        .map((x) => JSON.stringify(x))
        .join('\n') + '\n',
    );
    await writeFile(
      join(m08Dir, 'clauses.jsonl'),
      JSON.stringify({
        id: 'c1',
        from: ['p1'],
        to: 'p2',
        text: '甲到乙',
        anchors: [],
        source: '模型补的',
        notes: ['书里没有直接说'],
      }) + '\n',
    );
    const app = await createApp({
      dataRoot: await tempDir(),
      model: new FakeModel(),
      token: TOKEN,
      port: 0,
      m08Dir,
    });
    apps.push(app);
    const pts = await getJson<Points08Response>(app, '/m08/points');
    expect(pts.points.map((p) => [p.id, p.source, p.sourceNote])).toEqual([
      ['p1', '书给的', '原文有支撑'],
      ['p2', '模型补的', '书里找不到直接支撑，是模型补的候选'],
      ['p3', '未审', '不在处理过的范围里，没对原文审过'],
    ]);
    expect(pts.points[0]?.anchors[0]).toMatchObject({ page: 3, bbox: [1, 2, 3, 4] });
    expect(pts.points[1]?.scope).toBe('前置');
    const p2 = await getJson<Point08Response>(app, '/m08/points/p2');
    expect(p2.into[0]).toMatchObject({
      source: '模型补的',
      notes: ['书里没有直接说'],
      sourceNote: '书里找不到直接支撑，是模型补的候选',
    });
  });
});
