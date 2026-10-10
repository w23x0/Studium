// 验收：M08 可以给多个目录（或一个目录下多章产出，如 <书>/<章>/），合并读取；
// 点 id 冲突时加前缀区分并记下来源；合并后的点照样能出选择卡、开闭环。只经 HTTP 验证。
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp, type App } from '../../src/core/app.ts';
import { FakeModel, type FakeContext, type FakeStep } from '../../src/core/model/fake.ts';
import type {
  Clause08Response,
  M08OverviewResponse,
  Point08Response,
  Points08Response,
} from '../../src/shared/protocol.ts';
import { getJson, post, records, TOKEN, waitFor } from '../helpers/http.ts';
import { roleOf } from '../helpers/roles.ts';
import { writeM08 } from '../helpers/scope.ts';
import { tempDir } from '../helpers/tmp.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

const BOOK = '书甲';

/** <根>/书甲/ch01、<根>/书甲/ch02 两章产出，两章里的 id 都叫 P1 P2 C1；另有一套 id 不重复的 <根>/书乙/ch07。 */
async function makeOutputs(): Promise<string> {
  const root = await tempDir();
  await writeM08(
    join(root, BOOK, 'ch01'),
    BOOK,
    'ch01',
    [
      { id: 'P1', name: '甲一', sentence: '甲一的句子' },
      { id: 'P2', name: '甲二' },
    ],
    [{ id: 'C1', from: ['P1'], to: 'P2' }],
  );
  await writeM08(
    join(root, BOOK, 'ch02'),
    BOOK,
    'ch02',
    [
      { id: 'P1', name: '乙一' },
      { id: 'P2', name: '乙二' },
    ],
    [{ id: 'C1', from: ['P1'], to: 'P2' }],
  );
  await writeM08(join(root, '书乙', 'ch07'), '书乙', 'ch07', [{ id: 'Q1', name: '丙一' }], []);
  return root;
}

describe('验收：多套 M08', () => {
  it('一个目录下多章产出合并读取：重复的 id 整套加前缀，记下来源；不重复的原样', async () => {
    const root = await makeOutputs();
    const app = await createApp({
      dataRoot: await tempDir(),
      model: new FakeModel(),
      token: TOKEN,
      port: 0,
      m08Dir: root,
    });
    apps.push(app);

    const all = await getJson<Points08Response>(app, '/m08/points');
    expect(all.points.map((p) => p.id).sort()).toEqual(
      ['Q1', 'ch01.P1', 'ch01.P2', 'ch02.P1', 'ch02.P2'].sort(),
    );
    const one = await getJson<Point08Response>(app, '/m08/points/ch02.P2');
    expect(one.point).toMatchObject({ name: '乙二', origin: 'ch02', originalId: 'P2' });
    // 子句的出发点 / 新点跟着改写
    expect(one.into[0]).toMatchObject({
      id: 'ch02.C1',
      from: [{ id: 'ch02.P1', name: '乙一' }],
      to: { id: 'ch02.P2' },
      origin: 'ch02',
      originalId: 'C1',
    });
    const clause = await getJson<Clause08Response>(app, '/m08/clauses/ch01.C1');
    expect(clause.clause.from[0]?.name).toBe('甲一');
    const q1 = await getJson<Point08Response>(app, '/m08/points/Q1');
    expect(q1.point.originalId).toBeUndefined();
    expect(q1.point.origin).toBe('ch07');

    const overview = await getJson<M08OverviewResponse>(app, '/m08/overview');
    expect(overview.sources.map((s) => [s.label, s.points, s.prefixed])).toEqual([
      ['ch01', 2, true],
      ['ch02', 2, true],
      ['ch07', 1, false],
    ]);
    expect(overview.books.find((b) => b.book === BOOK)).toMatchObject({
      points: 4,
      clauses: 2,
      chapters: [
        { chapter: 'ch01', points: 2, clauses: 1 },
        { chapter: 'ch02', points: 2, clauses: 1 },
      ],
    });

    // 按书按章浏览
    const ch2 = await getJson<Points08Response>(
      app,
      `/m08/points?book=${encodeURIComponent(BOOK)}&chapter=ch02`,
    );
    expect(ch2.points.map((p) => p.id).sort()).toEqual(['ch02.P1', 'ch02.P2']);
  });

  it('也可以给多个目录；同一个 id 在两套里重复时两套都加前缀', async () => {
    const root = await makeOutputs();
    const app = await createApp({
      dataRoot: await tempDir(),
      model: new FakeModel(),
      token: TOKEN,
      port: 0,
      m08Dir: [join(root, BOOK, 'ch01'), join(root, '书乙', 'ch07')],
    });
    apps.push(app);
    const ids = (await getJson<Points08Response>(app, '/m08/points')).points.map((p) => p.id);
    expect(ids.sort()).toEqual(['P1', 'P2', 'Q1']);

    const both = await createApp({
      dataRoot: await tempDir(),
      model: new FakeModel(),
      token: TOKEN,
      port: 0,
      m08Dir: [join(root, BOOK, 'ch01'), join(root, BOOK, 'ch02')],
    });
    apps.push(both);
    expect(
      (await getJson<Points08Response>(both, '/m08/points')).points.map((p) => p.id).sort(),
    ).toEqual(['ch01.P1', 'ch01.P2', 'ch02.P1', 'ch02.P2']);
  });

  it('加了前缀的点能出选择卡、开闭环；模型工具按章列点', async () => {
    const root = await makeOutputs();
    const responder = (ctx: FakeContext): FakeStep | undefined => {
      if (roleOf(ctx) === 'm05') {
        const option = (p: string, c: string, from: string) => ({
          new_point: p,
          clause: c,
          start_points: [{ point: from, source: '假定' }],
          route_action: '继续主线',
          title: p,
          reason: '合并后的点',
          sources: [p],
        });
        return {
          calls: [
            {
              name: 'submit_choice_card',
              args: {
                options: [
                  option('ch02.P2', 'ch02.C1', 'ch02.P1'),
                  option('ch01.P2', 'ch01.C1', 'ch01.P1'),
                ],
                recommended: 0,
              },
            },
          ],
        };
      }
      return undefined;
    };
    const app = await createApp({
      dataRoot: await tempDir(),
      model: new FakeModel({ responder }),
      token: TOKEN,
      port: 0,
      m08Dir: root,
    });
    apps.push(app);
    const mainId = await app.studium.ensureMain();
    await post(app, '/cards/request', { projectId: mainId });
    const cardId = await waitFor('出了卡', async () => {
      const r = (await records(app, mainId)).find((x) => x.record.type === 'choice_card');
      return r?.record.type === 'choice_card' ? r.record.cardId : undefined;
    });
    const res = await post(app, `/cards/${cardId}/choose`, { option: 0 });
    expect(res.status).toBe(201);

    const list = app.studium
      .kind('m05')
      .tools(mainId)
      .find((t) => t.name === 'list_chapter_points');
    const out = await list?.run({ book: BOOK, chapter: '2' });
    expect(out?.text).toContain('ch02.P1「乙一」');
    expect(out?.text).not.toContain('甲一');
    expect((await list?.run({ book: '没有这本书' }))?.isError).toBe(true);
    await app.studium.settled();
  });
});
