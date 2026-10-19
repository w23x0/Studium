// 测（审查补的）：积压数只认“之后”的同新点合上；学过的记录接口对空 / 不合法的 id 回 404 而不是 500。
// 依据：工单 W2 §4.7（load.parked：没合上、且之后没有新点文字相同的一次合上）；工单 README §2.5（/api/learned）。
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import { call, getJson } from '../helpers/http.ts';
import { boot, endUnclosed, learnAndClose, newFlow, openLoop } from './共用/w2-flow.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

async function parked(app: App, mainId: string): Promise<number> {
  const r = await getJson<{ overview: { load: { parked: number } } }>(
    app,
    `/projects/${mainId}/overview`,
  );
  return r.overview.load.parked;
}

describe('审查补：积压与学过的记录接口', () => {
  it('先合上、后来同新点又没合上：这次没合上算积压', async () => {
    const flow = newFlow();
    const { app, mainId } = await boot(flow);
    apps.push(app);
    const first = await openLoop(app, mainId, flow, 0);
    await learnAndClose(app, first, flow);
    const second = await openLoop(app, mainId, flow, 0);
    await endUnclosed(app, second, '今天先到这');
    expect(await parked(app, mainId), '之前的合上补不了之后的缺口').toBe(1);
  });

  it('先没合上、后来同新点合上：缺口补上，不算积压', async () => {
    const flow = newFlow();
    const { app, mainId } = await boot(flow);
    apps.push(app);
    const first = await openLoop(app, mainId, flow, 0);
    await endUnclosed(app, first, '今天先到这');
    const second = await openLoop(app, mainId, flow, 0);
    await learnAndClose(app, second, flow);
    expect(await parked(app, mainId), '之后合上了就补上了').toBe(0);
  });

  it('空的或不合法的项目 / 学习 id：404', async () => {
    const flow = newFlow();
    const { app } = await boot(flow);
    apps.push(app);
    expect((await call(app, '/learned?project=')).status, '空项目参数').toBe(404);
    expect((await call(app, '/learned?project=a%20b')).status, '不合法的项目 id').toBe(404);
    expect((await call(app, '/learned/a%20b')).status, '不合法的学习 id').toBe(404);
  });
});
