// （W1 新版，取代旧的同名测试：去掉知识点工具；资料工具从导航 / 守卫取（学习对话 W4 起没有资料工具）。）
// 验收：项目资料（像 Claude 项目的 project knowledge）——每个项目记选用了哪些书 / 笔记（只追加，可增可减）；
// 闭环与 M05 的资料工具默认只在项目选的资料里查，明确要时可查全库；没选任何资料时同以前（全库）。只经 HTTP 验证。
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp, type App } from '../../src/core/app.ts';
import { FakeModel } from '../../src/core/model/fake.ts';
import type {
  BooksResponse,
  LibrarySearchResponse,
  ProjectMaterialsResponse,
} from '../../src/shared/protocol.ts';
import { makeLibrary, SAMPLE_BOOK, SECOND_BOOK, startLibraryApp } from '../helpers/library.ts';
import { call, getJson, post, TOKEN } from '../helpers/http.ts';
import { newState, responder, startLoop } from '../helpers/evidence-flow.ts';
import { toolOf } from '../helpers/scope.ts';
import { tempDir } from '../helpers/tmp.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

const q = encodeURIComponent;

async function boot(): Promise<{ app: App; mainId: string; dataRoot: string }> {
  const { app, dataRoot } = await startLibraryApp();
  apps.push(app);
  return { app, mainId: await app.studium.ensureMain(), dataRoot };
}

describe('验收：项目资料', () => {
  it('列 / 加 / 去；记录只追加；重复加、没选的去不产生记录；书库里没有的整批拒绝', async () => {
    const { app, mainId, dataRoot } = await boot();
    const path = `/projects/${mainId}/materials`;
    const empty = await getJson<ProjectMaterialsResponse>(app, path);
    expect(empty).toMatchObject({ materials: [], restricted: false });

    const added = (await (
      await post(app, path, { add: [SAMPLE_BOOK] })
    ).json()) as ProjectMaterialsResponse;
    expect(added.restricted).toBe(true);
    expect(added.materials.map((m) => m.book)).toEqual([SAMPLE_BOOK]);
    expect(added.materials[0]).toMatchObject({ kind: 'book' });

    await post(app, path, { add: [SAMPLE_BOOK] });
    await post(app, path, { remove: [SECOND_BOOK] });
    const logPath = join(dataRoot, 'sessions', `${mainId}.jsonl`);
    const material = async () =>
      (await readFile(logPath, 'utf8'))
        .split('\n')
        .filter((l) => l.includes('"project_material"'))
        .map((l) => JSON.parse(l) as { op: string; book: string });
    expect(await material()).toHaveLength(1);

    const bad = await post(app, path, { add: [SECOND_BOOK, '书库里没有这本'] });
    expect(bad.status).toBe(400);
    expect((await getJson<ProjectMaterialsResponse>(app, path)).materials).toHaveLength(1);

    await post(app, path, { add: [SECOND_BOOK] });
    const both = await getJson<ProjectMaterialsResponse>(app, path);
    expect(both.materials.map((m) => m.book)).toEqual([SAMPLE_BOOK, SECOND_BOOK]);
    const removed = (await (
      await post(app, path, { remove: [SAMPLE_BOOK] })
    ).json()) as ProjectMaterialsResponse;
    expect(removed.materials.map((m) => m.book)).toEqual([SECOND_BOOK]);
    // 旧行没动：加、加、去三条都在，按先后
    expect((await material()).map((m) => `${m.op}:${m.book.trim()}`)).toEqual([
      `add:${SAMPLE_BOOK}`,
      `add:${SECOND_BOOK.trim()}`,
      `remove:${SAMPLE_BOOK}`,
    ]);
    expect((await post(app, path, { add: 'x' })).status).toBe(400);
    expect((await call(app, '/projects/no-such-project/materials')).status).toBe(404);
  });

  it('选了资料：学习者检索与书目默认只在选的里；all=1 或明确指定书时不限；没选时查全库', async () => {
    const { app, mainId } = await boot();
    const search = (extra: string) =>
      getJson<LibrarySearchResponse>(app, `/library/search?q=${q('加速度')}${extra}`);
    expect((await search(`&project=${mainId}`)).hits.length).toBeGreaterThan(0);

    await post(app, `/projects/${mainId}/materials`, { add: [SECOND_BOOK] });
    expect((await search(`&project=${mainId}`)).hits).toEqual([]);
    expect((await search(`&project=${mainId}&all=1`)).hits.length).toBeGreaterThan(0);
    expect((await search(`&project=${mainId}&book=${q(SAMPLE_BOOK)}`)).hits.length).toBeGreaterThan(
      0,
    );
    expect((await search('')).hits.length).toBeGreaterThan(0);

    const books = await getJson<BooksResponse>(app, `/library/books?project=${mainId}`);
    expect(Object.fromEntries(books.books.map((b) => [b.id, b.selected]))).toEqual({
      [SAMPLE_BOOK]: false,
      [SECOND_BOOK]: true,
    });
  });

  it('模型的资料工具：项目会话里默认限定，all=true 查全库；没选资料行为同以前', async () => {
    const { app, mainId } = await boot();
    const run = async (kind: 'm05', name: string, args: Record<string, unknown>) =>
      (await toolOf(app, kind, mainId, name).run(args)).text;

    // 没选：全库
    expect(await run('m05', 'search_textbook', { query: '加速度' })).toContain('ch01/sec-1.3.md');
    expect(await run('m05', 'textbook_index', {})).toContain(SAMPLE_BOOK);

    await post(app, `/projects/${mainId}/materials`, { add: [SECOND_BOOK] });
    const limited = await run('m05', 'search_textbook', { query: '加速度' });
    expect(limited).toContain('没找到');
    expect(limited).toContain('all=true');
    expect(await run('m05', 'search_textbook', { query: '加速度', all: true })).toContain(
      'ch01/sec-1.3.md',
    );
    // 明确指定书：不受限
    expect(await run('m05', 'search_textbook', { query: '加速度', book: SAMPLE_BOOK })).toContain(
      'ch01/sec-1.3.md',
    );
    const index = await run('m05', 'textbook_index', {});
    expect(index).toContain(SECOND_BOOK.trim());
    expect(index).not.toContain(SAMPLE_BOOK);
    expect(await run('m05', 'textbook_index', { all: true })).toContain(SAMPLE_BOOK);
  });

  it('闭环 / 守卫会话沿父子关系找到项目，用的是同一个资料范围', async () => {
    const state = newState();
    const library = await makeLibrary();
    const app = await createApp({
      dataRoot: await tempDir(),
      model: new FakeModel({ responder: responder(state) }),
      token: TOKEN,
      port: 0,
      library,
    });
    apps.push(app);
    const mainId = await app.studium.ensureMain();
    await post(app, `/projects/${mainId}/materials`, { add: [SECOND_BOOK] });
    const { loopId } = await startLoop(app, mainId);
    expect(await app.studium.projectOf(loopId)).toBe(mainId);
    expect(
      (await toolOf(app, 'guard', loopId, 'search_textbook').run({ query: '加速度' })).text,
    ).toContain('没找到');
    expect(
      (await toolOf(app, 'guard', loopId, 'search_textbook').run({ query: '加速度', all: true }))
        .text,
    ).toContain('ch01/sec-1.3.md');
  });
});
