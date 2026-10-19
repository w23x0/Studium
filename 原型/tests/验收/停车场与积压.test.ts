// 验收（W3）：停车场 = 没合上那些学习的上层（单子 + 结束原话 + 导航当时的路线决定），不另存停车记录：
// /api/learned 给得出、导航开场的停车场列得出；被“接着学”（resume_of）合上的那次不再算积压；
// 项目概览给积压提示（停车场条数、没收尾的学习数，多了标出来）。
// 设计：docs/设计/记录/单子与路线.md「没合上那次的上层」；会话/导航.md「二级功能」停车场与未完成负债。
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import { getJson, post, records } from '../helpers/http.ts';
import {
  choose,
  endUnclosed,
  learnAndClose,
  navOpenings,
  newW3,
  opt,
  requestCard,
  say,
  startW3,
} from './共用/w3-flow.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

interface Learning {
  loopId: string;
  status: string;
  endNote?: string;
  routeDecision?: { line: number; decision: string; reason: string };
}
interface Load {
  inProgress: number;
  shelved: number;
  parked: number;
  unfinished: number;
  heavy: boolean;
  parkingPile: boolean;
}
type Overview = { overview: { load: Load; groups: { unclosed: { sessionId: string }[] } } };

function parkSection(opening: string): string {
  const a = opening.indexOf('── 停车场');
  if (a < 0) return '';
  const b = opening.indexOf('\n── ', a + 1);
  return opening.slice(a, b < 0 ? undefined : b);
}

describe('停车场与积压（W3）', () => {
  it('停车场是没合上那些学习的上层；接着学合上后那次不再算积压；概览给积压提示', async () => {
    const st = newW3();
    const { app, mainId, fake } = await startW3(st);
    apps.push(app);
    const parked: string[] = [];
    for (const name of ['停车甲', '停车乙', '停车丙']) {
      st.nextOptions = [opt(name), opt(`${name}备选`)];
      const loop = await choose(app, (await requestCard(app, mainId)).cardId, 0);
      await say(app, loop, `${name}这里我学不动了`);
      st.decision = { decision: `${name}先放一放`, reason: `${name}缺前提` };
      if (name === '停车丙') {
        st.nextOptions = [
          opt('接着停车甲', { route_action: '接着学', resume_of: parked[0] }),
          opt('别的'),
        ];
      }
      await endUnclosed(app, loop, `${name}的结束原话`);
      parked.push(loop);
    }
    const [a, b, c] = parked;

    // /api/learned：没合上那次的上层 = 单子 + 结束原话 + 路线决定
    const learned = (await getJson<{ learnings: Learning[] }>(app, `/learned?project=${mainId}`))
      .learnings;
    for (const [i, id] of parked.entries()) {
      const name = ['停车甲', '停车乙', '停车丙'][i] ?? '';
      expect(
        learned.find((l) => l.loopId === id),
        `${name}的上层`,
      ).toMatchObject({
        status: '没合上',
        endNote: `${name}的结束原话`,
        routeDecision: { decision: `${name}先放一放` },
      });
    }

    // 概览：三条积压，堆积提示
    let o = (await getJson<Overview>(app, `/projects/${mainId}/overview`)).overview;
    expect(o.load.parked, '积压三条').toBe(3);
    expect(o.load.parkingPile, '三条算堆积').toBe(true);
    expect(o.groups.unclosed.map((x) => x.sessionId).sort()).toEqual([...parked].sort());

    // 导航开场的停车场列出三条
    await requestCard(app, mainId);
    let park = parkSection(navOpenings(fake).at(-1) ?? '');
    for (const id of parked) expect(park, `停车场里有 ${id}`).toContain(id);
    expect(park, '停车场给结束原话').toContain('停车乙的结束原话');
    expect(park, '停车场给路线决定').toContain('停车乙先放一放');

    // 经卡接着学停车甲并合上：停车甲不再算积压
    const resumed = await choose(app, await latestCardWith(app, mainId, '接着停车甲'), 0);
    await learnAndClose(app, resumed);
    o = (await getJson<Overview>(app, `/projects/${mainId}/overview`)).overview;
    expect(o.load.parked, '接着学合上后积压两条').toBe(2);
    expect(o.load.parkingPile, '两条不算堆积').toBe(false);
    park = parkSection(navOpenings(fake).at(-1) ?? '');
    expect(park, '接着学合上的那次不在停车场').not.toContain(a);
    expect(park).toContain(b);
    expect(park).toContain(c);
    const again = (await getJson<{ learnings: Learning[] }>(app, `/learned?project=${mainId}`))
      .learnings;
    expect(again.find((l) => l.loopId === a)?.status, '原那次的状态不改写').toBe('没合上');
  });

  it('没收尾的学习多了：概览标出来；搁置的单列', async () => {
    const st = newW3();
    const { app, mainId } = await startW3(st);
    apps.push(app);
    const open: string[] = [];
    for (let i = 0; i < 3; i++) {
      open.push(await choose(app, (await requestCard(app, mainId)).cardId, 0));
    }
    let o = (await getJson<Overview>(app, `/projects/${mainId}/overview`)).overview;
    expect(o.load).toMatchObject({ inProgress: 3, shelved: 0, unfinished: 3, heavy: true });
    expect((await post(app, `/sessions/${open[0] ?? ''}/shelve`, { note: '先放' })).status).toBe(
      202,
    );
    await app.studium.settled();
    o = (await getJson<Overview>(app, `/projects/${mainId}/overview`)).overview;
    expect(o.load).toMatchObject({ inProgress: 2, shelved: 1, unfinished: 3, heavy: true });
    expect(o.load, '不再有“等分叉回来”').not.toHaveProperty('waitingFork');
  });
});

/** 最新一张标题里有 title 的选项所在的卡。 */
async function latestCardWith(app: App, mainId: string, title: string): Promise<string> {
  const c = (await records(app, mainId))
    .filter(
      (r) => r.record.type === 'choice_card' && r.record.options.some((x) => x.title === title),
    )
    .at(-1);
  if (c?.record.type !== 'choice_card') throw new Error(`没有带“${title}”的卡`);
  return c.record.cardId;
}
