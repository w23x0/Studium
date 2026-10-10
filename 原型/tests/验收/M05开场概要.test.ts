// 验收：M05 开场不再塞整份 M08 提纲，改给概要（各书各章点数、学习者最近在哪一章、项目方向、资料范围、期限），
// 由 M05 按章 / 按关键词用工具查。只经 HTTP 验证（模型是假模型，看它收到的开场）。
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp, type App } from '../../src/core/app.ts';
import { FakeModel, type FakeContext, type FakeStep } from '../../src/core/model/fake.ts';
import { getJson, post, records, TOKEN, waitFor } from '../helpers/http.ts';
import { roleOf } from '../helpers/roles.ts';
import { toolOf, writeM08 } from '../helpers/scope.ts';
import { tempDir } from '../helpers/tmp.ts';
import type { ProjectOverviewResponse } from '../../src/shared/protocol.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

const BOOK = '书甲';
const NOW = new Date('2026-10-10T08:00:00Z');

async function boot(): Promise<{ app: App; fake: FakeModel; mainId: string }> {
  const root = await tempDir();
  await writeM08(
    join(root, 'ch01'),
    BOOK,
    'ch01',
    [
      { id: 'a1', name: '甲一', sentence: '只在章节列表里才该出现的独特句子' },
      { id: 'a2', name: '甲二' },
      { id: 'a3', name: '甲三' },
    ],
    [{ id: 'c1', from: ['a1'], to: 'a2' }],
  );
  await writeM08(
    join(root, 'ch02'),
    BOOK,
    'ch02',
    [
      { id: 'b1', name: '乙一' },
      { id: 'b2', name: '乙二' },
    ],
    [{ id: 'd1', from: ['b1'], to: 'b2' }],
  );
  const responder = (ctx: FakeContext): FakeStep | undefined => {
    if (roleOf(ctx) !== 'm05') return undefined;
    return {
      calls: [
        {
          name: 'submit_choice_card',
          args: {
            options: [
              {
                new_point: 'b2',
                clause: 'd1',
                start_points: [{ point: 'b1', source: '假定' }],
                route_action: '继续主线',
                title: '乙二',
                reason: '接着学',
                sources: ['b2'],
              },
              {
                new_point: 'a2',
                clause: 'c1',
                start_points: [{ point: 'a1', source: '假定' }],
                route_action: '继续主线',
                title: '甲二',
                reason: '另一条',
                sources: ['a2'],
              },
            ],
            recommended: 0,
          },
        },
      ],
    };
  };
  const fake = new FakeModel({ responder });
  const app = await createApp({
    dataRoot: await tempDir(),
    model: fake,
    token: TOKEN,
    port: 0,
    m08Dir: root,
    now: () => NOW,
  });
  apps.push(app);
  return { app, fake, mainId: await app.studium.ensureMain() };
}

async function newCard(app: App, mainId: string, after: number): Promise<string> {
  await post(app, '/cards/request', { projectId: mainId });
  return waitFor('出了卡', async () => {
    const r = (await records(app, mainId)).find(
      (x) => x.record.type === 'choice_card' && x.line > after,
    );
    return r?.record.type === 'choice_card' ? r.record.cardId : undefined;
  });
}

const openings = (fake: FakeModel): string[] =>
  fake.inputs.filter((i) => i.text.includes('触发原因')).map((i) => i.text);

describe('验收：M05 开场给概要，按需查', () => {
  it('开场有各书各章点数、没开过闭环时说明；不列点、不列一句话', async () => {
    const { app, fake, mainId } = await boot();
    await newCard(app, mainId, 0);
    const text = openings(fake)[0] ?? '';
    expect(text).toContain('M08 概要');
    expect(text).toContain(`《${BOOK}》5 点 / 2 子句`);
    expect(text).toContain('ch01 3/1');
    expect(text).toContain('ch02 2/1');
    expect(text).toContain('学习者最近在：还没有开过闭环');
    expect(text).toContain('list_chapter_points');
    expect(text).not.toContain('M08 提纲');
    expect(text).not.toContain('只在章节列表里才该出现的独特句子');
    expect(text).not.toContain('a1「甲一」');
    expect(text).toContain('项目没选资料：查全库');
  });

  it('开了闭环之后，开场说学习者最近在哪一章（含项目方向的位置在开场里）', async () => {
    const { app, fake, mainId } = await boot();
    const cardId = await newCard(app, mainId, 0);
    await post(app, `/cards/${cardId}/choose`, { option: 0 });
    await app.studium.settled();
    const after = (await records(app, mainId)).at(-1)?.line ?? 0;
    await newCard(app, mainId, after);
    const text = openings(fake).at(-1) ?? '';
    expect(text).toMatch(
      /学习者最近在：《书甲》 ch02（闭环 \S+「乙二」，新点 b2「乙二」，进行中）/,
    );
    expect(text).toContain('方向目标：');
  });

  it('按章列点的工具：给书、章（ch02 / 02 / 2 都认）；点的一句话在这里才给', async () => {
    const { app, mainId } = await boot();
    const list = toolOf(app, 'm05', mainId, 'list_chapter_points');
    const ch1 = (await list.run({ book: BOOK, chapter: 'ch01' })).text;
    expect(ch1).toContain('a1「甲一」');
    expect(ch1).toContain('只在章节列表里才该出现的独特句子');
    expect(ch1).not.toContain('乙一');
    expect((await list.run({ book: BOOK, chapter: '02' })).text).toContain('b1「乙一」');
    expect((await list.run({ book: BOOK })).text).toContain('5 个点');
    expect((await list.run({ book: BOOK, chapter: 'ch99' })).isError).toBe(true);
    const overview = (await toolOf(app, 'm05', mainId, 'm08_overview').run({})).text;
    expect(overview).toContain('ch02：2 点 / 1 子句');
    // 项目页同样给了资料数
    const o = await getJson<ProjectOverviewResponse>(app, `/projects/${mainId}/overview`);
    expect(o.overview.materialCount).toBe(0);
  });
});
