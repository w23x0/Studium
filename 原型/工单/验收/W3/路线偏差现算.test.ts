// 验收（W3）：路线偏差不另存，GET /api/projects/:id/deviations 从已有记录现算三类——没选推荐项、没合上就结束、
// 中途改线（没合上触发的新路线决定取代旧的）；每条指回行（会话 id:行号）。旧存放处与 /api/m05/deviations 删除。
// 设计：docs/设计/记录/单子与路线.md「路线偏差记录」（不另抄，指回）。
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import { call, getJson, records } from '../helpers/http.ts';
import {
  choose,
  endUnclosed,
  learnAndClose,
  newW3,
  requestCard,
  say,
  startW3,
} from './共用/w3-flow.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

interface Deviation {
  kind: '没选推荐项' | '没合上就结束' | '中途改线';
  at: string;
  loopId?: string;
  text: string;
  refs: string[];
}

/** 一条指回（会话 id:行号）那一行的记录类型。 */
async function typeAt(app: App, ref: string): Promise<string | undefined> {
  const m = /^(.+):(\d+)$/.exec(ref);
  if (m?.[1] === undefined || m[2] === undefined) return undefined;
  const line = Number(m[2]);
  return (await records(app, m[1])).find((r) => r.line === line)?.record.type;
}

describe('路线偏差现算（W3）', () => {
  it('三类各一例，每条指回行；旧接口与旧存放处没有了', async () => {
    const st = newW3();
    const { app, mainId, dataRoot } = await startW3(st);
    apps.push(app);
    st.recommended = 0;
    const loop = await choose(app, (await requestCard(app, mainId)).cardId, 1); // 没选推荐项
    await say(app, loop, '我想先学别的');
    st.decision = { decision: '改走前提', reason: '学习者没合上就结束了' };
    await endUnclosed(app, loop, '先到这'); // 没合上就结束；随后的路线决定取代上一条 = 中途改线

    const res = await call(app, `/projects/${mainId}/deviations`);
    expect(res.status, '偏差接口').toBe(200);
    const list = ((await res.json()) as { deviations: Deviation[] }).deviations;

    const expected: Record<Deviation['kind'], string[]> = {
      没选推荐项: ['choice_card', 'choice_made'],
      没合上就结束: ['loop_ended'],
      中途改线: ['route_decision', 'route_decision', 'loop_ended'],
    };
    for (const kind of Object.keys(expected) as Deviation['kind'][]) {
      const d = list.filter((x) => x.kind === kind);
      expect(d.length, `${kind}一条`).toBe(1);
      const one = d[0];
      if (one === undefined) continue;
      expect(one.loopId, `${kind}指那次学习`).toBe(loop);
      expect(one.text.trim(), `${kind}有一句说明`).not.toBe('');
      const types = [];
      for (const ref of one.refs) types.push(await typeAt(app, ref));
      expect(types.sort(), `${kind}的指回行是这些记录`).toEqual([...expected[kind]].sort());
    }
    const change = list.find((x) => x.kind === '中途改线');
    expect(
      change?.refs.some((r) => r.startsWith(`${mainId}:`)),
      '改线指回主对话的路线决定',
    ).toBe(true);
    expect(change?.text, '改线说明带新决定').toContain('改走前提');

    expect((await call(app, '/m05/deviations')).status, '旧接口删了').toBe(404);
    expect(existsSync(join(dataRoot, 'knowledge', 'm05')), '不再另存偏差').toBe(false);
  });

  it('照推荐选、合上了：没有偏差', async () => {
    const st = newW3();
    const { app, mainId } = await startW3(st);
    apps.push(app);
    const loop = await choose(app, (await requestCard(app, mainId)).cardId, 0);
    await learnAndClose(app, loop);
    const list = (await getJson<{ deviations: Deviation[] }>(app, `/projects/${mainId}/deviations`))
      .deviations;
    expect(list, '照推荐、合上：无偏差').toEqual([]);
    expect((await call(app, '/projects/no-such-project/deviations')).status).toBe(404);
  });
});
