// 验收（W2）：分析层整块取消（docs/设计/01-流程.md §3“合上后不另开会话写形成记录或分析层”；
// 记录/学过的记录.md「分层」不另造当前视图、「时间与版本」降档 / 遗忘不存成结论）。
// /api/m09/* 与重新分析、笔记提点的接口没了；任何会话都不再挂写 / 查 M09、降档、时间版本的工具；
// 对“m09”种类记录的异议不收；数据目录里不再有 M09 存放处。只经 HTTP，假模型。
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import { call, getJson, post } from '../helpers/http.ts';
import { boot, learnAndClose, newFlow, openLoop } from './共用/w2-flow.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

const GONE_TOOLS = [
  'write_formation_record',
  'write_timeline_record',
  'note_regression',
  'query_m09',
  'query_m09_view',
  'write_note_points',
];

describe('分析层取消', () => {
  it('走完一次合上：没有哪个会话挂着分析层的工具，也没有 m09 种类的会话；数据目录没有 M09 存放处', async () => {
    const flow = newFlow();
    const { app, fake, mainId, root } = await boot(flow);
    apps.push(app);
    const loopId = await openLoop(app, mainId, flow);
    await learnAndClose(app, loopId, flow);

    const seen = new Set(fake.opened.flatMap((s) => s.tools.map((t) => t.name)));
    for (const name of GONE_TOOLS) {
      expect(seen.has(name), `不该再有工具 ${name}`).toBe(false);
    }
    const sessions = await getJson<{ sessions: { kind: string }[] }>(app, '/sessions');
    expect(
      sessions.sessions.map((s) => s.kind),
      '不再开 m09 种类的会话',
    ).not.toContain('m09');
    expect(existsSync(join(root, 'knowledge', 'm09')), '不再有 M09 存放处').toBe(false);
  });

  it('M09 的接口、重新分析、笔记提点都 404', async () => {
    const { app } = await boot(newFlow());
    apps.push(app);
    for (const path of [
      '/m09/records',
      '/m09/external',
      '/m09/view',
      '/m09/view/p-displacement',
      '/m09/timeline',
    ]) {
      expect((await call(app, path)).status, `GET ${path} 已删`).toBe(404);
    }
    expect((await post(app, '/m09/reanalyze', { loop: 'x' })).status, '重新分析已删').toBe(404);
    expect((await post(app, '/library/notes/extract', { book: 'x' })).status, '笔记提点已删').toBe(
      404,
    );
  });

  it('对“m09”种类记录提异议：不收（400）；m10 / m15 两种照旧认', async () => {
    const { app } = await boot(newFlow());
    apps.push(app);
    const m09 = await post(app, '/objections', { kind: 'm09', recordId: 'f-1', text: '不对' });
    expect(m09.status, 'm09 种类不再认').toBe(400);
    expect(((await m09.json()) as { error: string }).error, '报错里不再列 m09').not.toContain(
      'm09',
    );
    // m10 / m15：种类认得，只是记录不存在
    for (const kind of ['m10', 'm15']) {
      const r = await post(app, '/objections', { kind, recordId: 'nope', text: '不对' });
      expect(r.status, `${kind} 种类照旧认（记录不存在回 400）`).toBe(400);
      expect(((await r.json()) as { error: string }).error, `${kind}：报的是找不到记录`).toContain(
        'nope',
      );
    }
  });
});
