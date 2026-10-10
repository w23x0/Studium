// 验收：M14 产出物对象与版本链（M14 审查单「知识产出物对象」「版本链与修订比较」）——产出物挂在项目下；
// 每次保存 = 新版本（只追加，带时间、谁写的、改动说明）；可列、可取任一版、可比较两版；旧版本不被改；重启后还在。只经 HTTP 验证。
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp, SAMPLE_DIR, type App } from '../../src/core/app.ts';
import { FakeModel } from '../../src/core/model/fake.ts';
import type {
  CompareResponse,
  ListOutputsResponse,
  OutputResponse,
  VersionResponse,
  VersionsResponse,
} from '../../src/shared/m14.ts';
import { call, getJson, post, TOKEN } from '../helpers/http.ts';
import { createOutput, saveVersion, startOutputsApp, status } from '../helpers/outputs.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

describe('产出物版本链', () => {
  it('建产出物挂在项目下；每次保存都是新版本，旧版本不动，可列可取', async () => {
    const { app, mainId } = await startOutputsApp();
    apps.push(app);
    const out = await createOutput(app, mainId, {
      title: '位移与路程的区别',
      kind: '笔记整理',
      text: '位移看起点终点。\n路程看走过的路。',
      note: '第一稿',
    });
    expect(out).toMatchObject({ project: mainId, kind: '笔记整理', latest: 1, versions: 1 });
    expect(out.current).toMatchObject({ n: 1, by: '学习者', note: '第一稿' });

    const v2 = await saveVersion(app, out.id, {
      text: '位移看起点终点。\n路程看走过的路，永远不为负。\n两者只在单向直线运动里相等。',
      note: '补了路程不为负、两者何时相等',
    });
    expect(v2).toMatchObject({ n: 2, by: '学习者', note: '补了路程不为负、两者何时相等' });
    expect(v2.at).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    // 取任一历史版本，内容还是当时的
    const v1 = (await getJson<VersionResponse>(app, `/outputs/${out.id}/versions/1`)).version;
    expect(v1.text).toBe('位移看起点终点。\n路程看走过的路。');
    const list = (await getJson<VersionsResponse>(app, `/outputs/${out.id}/versions`)).versions;
    expect(list.map((v) => v.n)).toEqual([1, 2]);
    expect(list[1]?.note).toContain('补了路程');

    // 项目下列出；一个产出物的详情里有当前版和版本列表
    const outputs = (await getJson<ListOutputsResponse>(app, `/projects/${mainId}/outputs`))
      .outputs;
    expect(outputs.map((o) => o.id)).toEqual([out.id]);
    expect(outputs[0]).toMatchObject({ latest: 2, versions: 2 });
    const detail = (await getJson<OutputResponse>(app, `/outputs/${out.id}`)).output;
    expect(detail.current?.n).toBe(2);
    expect(detail.history.map((h) => h.n)).toEqual([1, 2]);
  });

  it('比较两版：逐行差异；回到任一版靠再存一版（历史不改写）', async () => {
    const { app, mainId } = await startOutputsApp();
    apps.push(app);
    const out = await createOutput(app, mainId, {
      title: '推导',
      kind: '推导',
      text: 'a\nb\nc',
    });
    await saveVersion(app, out.id, { text: 'a\nB\nc\nd', note: '改 b，加 d' });
    const cmp = (await getJson<CompareResponse>(app, `/outputs/${out.id}/compare?from=1&to=2`))
      .compare;
    expect(cmp).toMatchObject({ added: 2, removed: 1 });
    expect(cmp.lines.map((l) => `${l.op}:${l.text}`)).toEqual([
      'same:a',
      'del:b',
      'add:B',
      'same:c',
      'add:d',
    ]);
    expect(cmp.lines[0]).toMatchObject({ fromLine: 1, toLine: 1 });
    expect(cmp.lines[1]).toMatchObject({ fromLine: 2 });
    expect(cmp.lines[2]).toMatchObject({ toLine: 2 });
    expect(cmp.to.note).toBe('改 b，加 d');

    // 回到第 1 版 = 把第 1 版的内容作为第 3 版存下来
    const v1 = (await getJson<VersionResponse>(app, `/outputs/${out.id}/versions/1`)).version;
    const v3 = await saveVersion(app, out.id, { text: v1.text, note: '回到第 1 版' });
    expect(v3.n).toBe(3);
    expect(
      (await getJson<VersionResponse>(app, `/outputs/${out.id}/versions/2`)).version.text,
    ).toBe('a\nB\nc\nd');
    const same = (await getJson<CompareResponse>(app, `/outputs/${out.id}/compare?from=1&to=3`))
      .compare;
    expect(same).toMatchObject({ added: 0, removed: 0 });
  });

  it('基于旧版的保存被拒绝（不盖掉刚存的）；空正文、不存在的东西、类型不对都拒绝', async () => {
    const { app, mainId } = await startOutputsApp();
    apps.push(app);
    const out = await createOutput(app, mainId, { title: 't', kind: '小论文', text: 'x' });
    await saveVersion(app, out.id, { text: 'y', base: 1 });
    expect(await status(app, `/outputs/${out.id}/versions`, { text: 'z', base: 1 })).toBe(400);
    expect(await status(app, `/outputs/${out.id}/versions`, { text: 'z', base: 2 })).toBe(201);
    expect(await status(app, `/outputs/${out.id}/versions`, { text: '   ' })).toBe(400);
    expect(
      await status(app, `/outputs/${out.id}/versions`, {
        text: 'q',
        comparison: { dimensions: ['d'], methods: [] },
      }),
    ).toBe(400);
    expect(await status(app, `/outputs/nope/versions`, { text: 'z' })).toBe(404);
    expect((await call(app, `/outputs/${out.id}/versions/9`)).status).toBe(404);
    expect(await status(app, `/projects/${mainId}/outputs`, { title: '', kind: '推导' })).toBe(400);
    expect(await status(app, `/projects/${mainId}/outputs`, { title: 't', kind: '乱写' })).toBe(
      400,
    );
    // 不是项目的会话、不存在的项目
    expect(await status(app, `/projects/nope/outputs`, { title: 't', kind: '推导' })).toBe(404);
    expect((await call(app, `/outputs/${out.id}/compare?from=1&to=9`)).status).toBe(404);
    expect(
      (await post(app, `/projects/${mainId}/outputs`, { title: 'u', kind: '推导' })).status,
    ).toBe(201);
  });

  it('两个项目的产出物互不串；只追加：存放处文件只多不改；重启后还在', async () => {
    const dataRoot = (await startOutputsApp()).app;
    apps.push(dataRoot);
    // 同一个数据目录重启：先关再开
    const root = dataRoot.dataDir.root;
    const mainA = await dataRoot.studium.ensureMain();
    const mainB = await dataRoot.studium.createProject('另一个项目');
    const a = await createOutput(dataRoot, mainA, { title: 'A', kind: '推导', text: 'a1' });
    await createOutput(dataRoot, mainB, { title: 'B', kind: '推导', text: 'b1' });
    await saveVersion(dataRoot, a.id, { text: 'a2' });
    expect(
      (await getJson<ListOutputsResponse>(dataRoot, `/projects/${mainA}/outputs`)).outputs.map(
        (o) => o.title,
      ),
    ).toEqual(['A']);

    const file = join(root, 'knowledge', 'm14', 'versions.jsonl');
    const before = (await readFile(file, 'utf8')).split('\n').filter(Boolean);
    expect(before).toHaveLength(3);
    await saveVersion(dataRoot, a.id, { text: 'a3' });
    const after = (await readFile(file, 'utf8')).split('\n').filter(Boolean);
    expect(after.slice(0, 3)).toEqual(before);
    expect(after).toHaveLength(4);

    await dataRoot.close();
    apps.pop();
    const again = await createApp({
      dataRoot: root,
      model: new FakeModel(),
      token: TOKEN,
      port: 0,
      library: join(SAMPLE_DIR, '书库'),
    });
    apps.push(again);
    const back = (await getJson<OutputResponse>(again, `/outputs/${a.id}`)).output;
    expect(back.latest).toBe(3);
    expect(back.current?.text).toBe('a3');
  });
});
