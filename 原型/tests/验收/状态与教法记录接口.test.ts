// 测：状态记录、教法记录的接口与存放处去掉模块编号——/api/state/*、/api/pedagogy/* 可用，旧 /api/m15/*、/api/m10/* 404；
// 异议的种类叫 state / pedagogy；数据目录 knowledge/state、knowledge/pedagogy、knowledge/output、knowledge/notes。
// 依据：工单 README §2.8；工单 W7 §4.2、§4.3。
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import { call, getJson, post } from '../helpers/http.ts';
import { boot, endUnclosed, learnerSays, openLearning } from './共用/w7-flow.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

interface RecordsBody {
  records: { id: string }[];
}

describe('状态记录与教法记录的接口改名', () => {
  it('学完一次（没合上）后：新接口读得到、写得进；旧接口 404', async () => {
    const b = await boot();
    apps.push(b.app);
    await openLearning(b);
    await learnerSays(b);
    await endUnclosed(b);
    const app = b.app;

    // 读
    const stateRes = await call(app, '/state/records');
    expect(stateRes.status, 'GET /api/state/records').toBe(200);
    const state = ((await stateRes.json()) as RecordsBody).records;
    expect(state.length, '状态整理写下了一条状态记录').toBeGreaterThan(0);
    const id = state[0]?.id ?? '';
    expect((await call(app, '/state/timeline')).status, 'GET /api/state/timeline').toBe(200);
    const pedRes = await call(app, '/pedagogy/records');
    expect(pedRes.status, 'GET /api/pedagogy/records').toBe(200);
    expect(((await pedRes.json()) as RecordsBody).records.length, '教法记录整理写下了一条').toBe(1);
    expect((await call(app, `/pedagogy/records?loop=${b.world.loopId}`)).status).toBe(200);

    // 写
    const ok = await post(app, '/state/confirmations', { recordId: id, verdict: 'confirm' });
    expect(ok.status, 'POST /api/state/confirmations').toBe(201);
    const bad = await post(app, '/state/confirmations', {
      recordId: 'st-不存在',
      verdict: 'confirm',
    });
    expect(bad.status, '接口在，记录不存在是 400').toBe(400);
    const ex = await post(app, `/state/records/${id}/explanations`, { text: '昨晚没睡好' });
    expect(ex.status, 'POST /api/state/records/:id/explanations').toBe(201);

    // 旧接口
    for (const path of ['/m15/state', '/m15/timeline', '/m10/records']) {
      expect((await call(app, path)).status, `旧接口 GET ${path} 应 404`).toBe(404);
    }
    expect(
      (await post(app, '/m15/confirmations', { recordId: id, verdict: 'confirm' })).status,
      '旧接口 POST /m15/confirmations 应 404',
    ).toBe(404);
    expect(
      (await post(app, `/m15/records/${id}/explanations`, { text: 'x' })).status,
      '旧接口 POST /m15/records/:id/explanations 应 404',
    ).toBe(404);
  });

  it('异议的种类是 state / pedagogy；旧种类名不收', async () => {
    const b = await boot();
    apps.push(b.app);
    await openLearning(b);
    await learnerSays(b);
    await endUnclosed(b);
    const app = b.app;
    // 接口还没改名时这里读不到记录（404 的回答没有 records），下面提异议会回 400 而判不过
    const st = (await getJson<Partial<RecordsBody>>(app, '/state/records')).records?.[0]?.id ?? '';
    const sr =
      (await getJson<Partial<RecordsBody>>(app, '/pedagogy/records')).records?.[0]?.id ?? '';

    for (const [kind, recordId] of [
      ['state', st],
      ['pedagogy', sr],
    ] as const) {
      const res = await post(app, '/objections', { kind, recordId, text: '我没这么说过' });
      expect(res.status, `对 ${kind} 记录提异议`).toBe(201);
      const listed = await call(app, `/objections?kind=${kind}`);
      expect(listed.status).toBe(200);
      const body = (await listed.json()) as { objections: { target: { kind: string } }[] };
      expect(
        body.objections.map((o) => o.target.kind),
        `按 ${kind} 查得到`,
      ).toEqual([kind]);
    }
    for (const [kind, recordId] of [
      ['m15', st],
      ['m10', sr],
    ] as const) {
      const res = await post(app, '/objections', { kind, recordId, text: '不对' });
      expect(res.status, `旧种类名 ${kind} 不收`).toBe(400);
      const { error } = (await res.json()) as { error: string };
      expect(error, '报错里不列旧种类名').not.toMatch(/m1[05]/);
    }
  });

  it('数据目录里的存放处用新名', async () => {
    const b = await boot();
    apps.push(b.app);
    await openLearning(b);
    await learnerSays(b);
    await endUnclosed(b);
    const res = await post(b.app, `/projects/${b.world.mainId}/outputs`, {
      title: '位移小结',
      kind: '笔记整理',
      text: '位移只看起点终点。',
    });
    expect(res.status, '建一份产出物').toBe(201);
    const k = join(b.dataRoot, 'knowledge');
    expect(existsSync(join(k, 'state', 'records.jsonl')), '状态记录在 knowledge/state/').toBe(true);
    expect(existsSync(join(k, 'pedagogy', 'records.jsonl')), '教法记录在 knowledge/pedagogy/').toBe(
      true,
    );
    expect(existsSync(join(k, 'output', 'outputs.jsonl')), '产出物在 knowledge/output/').toBe(true);
    for (const old of ['m05', 'm07-notes', 'm09', 'm10', 'm14', 'm15']) {
      expect(existsSync(join(k, old)), `不该再有 knowledge/${old}`).toBe(false);
    }
  });
});
