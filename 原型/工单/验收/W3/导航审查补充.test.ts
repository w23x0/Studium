// 验收（W3 审查补）：提醒指的那次学习要对得上状态（复检 = 已结束、接着学 = 没合上）；
// 不合法的会话 id 回 404 / 400 而不是 500；几次出卡同时进行时，路线决定与卡相邻、取代链不断。
// 设计：工单 W3 §4.8 §4.10 §4.11；docs/设计/记录/单子与路线.md「路线决定与理由」。
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import { call, post, records } from '../helpers/http.ts';
import {
  choose,
  endUnclosed,
  learnAndClose,
  newW3,
  requestCard,
  routeDecisions,
  startW3,
} from './共用/w3-flow.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

describe('导航审查补充（W3）', () => {
  it('复检只指已结束的学习，接着学只指没合上的学习', async () => {
    const { app, mainId } = await startW3(newW3());
    apps.push(app);
    const path = `/projects/${mainId}/reminders`;
    const add = (kind: string, loopSessionId: string) =>
      post(app, path, { due: '2026-10-05', text: '看一眼', kind, loopSessionId });

    const going = await choose(app, (await requestCard(app, mainId)).cardId, 0);
    expect((await add('recheck', going)).status, '复检进行中的学习').toBe(400);
    expect((await add('resume', going)).status, '接着学进行中的学习').toBe(400);

    await learnAndClose(app, going);
    expect((await add('recheck', going)).status, '复检已合上的学习').toBe(201);
    expect((await add('resume', going)).status, '接着学已合上的学习').toBe(400);

    const left = await choose(app, (await requestCard(app, mainId)).cardId, 0);
    await endUnclosed(app, left, '先到这');
    expect((await add('resume', left)).status, '接着学没合上的学习').toBe(201);
    expect((await add('recheck', left)).status, '复检没合上的学习（已结束）').toBe(201);

    expect((await add('recheck', 'x.y')).status, '不合法的 id').toBe(400);
  });

  it('偏差接口：不合法的项目 id 回 404', async () => {
    const { app } = await startW3(newW3());
    apps.push(app);
    expect((await call(app, '/projects/bad.id/deviations')).status).toBe(404);
  });

  it('同时要三次下一步：每条路线决定紧跟它的卡，取代上一条', async () => {
    const { app, mainId } = await startW3(newW3());
    apps.push(app);
    const res = await Promise.all(
      [0, 1, 2].map(() => post(app, '/cards/request', { projectId: mainId })),
    );
    for (const r of res) expect(r.status).toBe(202);
    await app.studium.settled();
    const recs = await records(app, mainId);
    const ds = await routeDecisions(app, mainId);
    expect(ds.length).toBe(3);
    ds.forEach((d, i) => {
      expect(recs.find((r) => r.line === d.line + 1)?.record.type, '决定后紧跟卡').toBe(
        'choice_card',
      );
      if (i > 0) expect(d.supersedes, '取代上一条').toBe(ds[i - 1]?.line);
    });
  });
});
