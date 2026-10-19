// 验收（W6 审查补）：改单子时请求不合格一律回 400，不回 500——出发点里有一项是 null、整个请求体是 null。
// 依据面板里的改动记录要看得出改了哪几栏（只改出发点时也看得出来）。
// 设计：工单 W6 §4.1、§4.5。
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import { editedFields } from '../../src/ui/ticket-model.ts';
import { W } from '../../src/ui/wording.ts';
import { call } from '../helpers/http.ts';
import { boot, choose, editTicket, newFlow, requestCard } from './共用/w6-flow.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

describe('改单子：不合格的请求（W6 审查补）', () => {
  it('出发点有一项是 null、请求体是 null：回 400', async () => {
    const flow = newFlow();
    const { app, mainId } = await boot(flow);
    apps.push(app);
    const loopId = await choose(app, await requestCard(app, mainId), 0);
    expect((await editTicket(app, loopId, { startPoints: [null] })).status, '出发点是 null').toBe(
      400,
    );
    const res = await call(app, `/sessions/${loopId}/ticket-edit`, {
      method: 'POST',
      body: 'null',
    });
    expect(res.status, '请求体是 null').toBe(400);
  });

  it('改动记录看得出改了哪几栏', () => {
    const t = {
      newPoint: '位移',
      clause: '说出位移只看起终点',
      startPoints: [{ point: '坐标', source: '自述' as const }],
      routeAction: '继续主线',
    };
    const onlyStart = { ...t, startPoints: [{ point: '数轴', source: '自述' as const }] };
    expect(editedFields(t as never, onlyStart as never)).toEqual([W.startPoints]);
    expect(editedFields(t as never, { ...t, newPoint: '路程' } as never)).toEqual([W.newPoint]);
  });
});
