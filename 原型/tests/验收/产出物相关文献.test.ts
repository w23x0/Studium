// 验收：M14「研究问题相关的文献关系」——产出物登记相关文献（书库里的书 / 小节，或外部条目），带一句关系说明，只追加；
// 书库条目回到 M07 来源并核对，对不上的拒绝；不写回 M08。只经 HTTP 验证。
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { LiteratureListResponse, LiteratureResponse } from '../../src/shared/m14.ts';
import type { App } from '../../src/core/app.ts';
import { getJson, post } from '../helpers/http.ts';
import { BOOK, createOutput, startOutputsApp } from '../helpers/outputs.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

describe('产出物相关文献', () => {
  it('登记书库里的书 / 小节和外部条目，关系说明必填；列出时书库条目带出处核对', async () => {
    const { app, mainId } = await startOutputsApp();
    apps.push(app);
    const out = await createOutput(app, mainId, {
      title: '研究：速度的定义',
      kind: '小论文',
      text: '草稿',
    });

    const lib = await post(app, `/outputs/${out.id}/literature`, {
      book: BOOK,
      file: 'ch01/sec-1.2.md',
      from: 3,
      to: 4,
      relation: '给出平均速度的定义，本文的出发点',
      relationKind: '支持',
    });
    expect(lib.status).toBe(201);
    const e1 = ((await lib.json()) as LiteratureResponse).entry;
    expect(e1).toMatchObject({
      source: 'library',
      book: BOOK,
      by: '学习者',
      relationKind: '支持',
      relation: '给出平均速度的定义，本文的出发点',
    });
    expect(e1.title).toContain('力学入门');
    expect(e1.citation).toMatchObject({ resolved: true, section: '1.2 速度' });

    // 只给书（整本）也行
    expect(
      (await post(app, `/outputs/${out.id}/literature`, { book: BOOK, relation: '总参考' })).status,
    ).toBe(201);

    const ext = await post(app, `/outputs/${out.id}/literature`, {
      title: 'On the Concept of Velocity',
      authors: ['A. Author', 'B. Author'],
      url: 'https://example.org/velocity',
      relation: '与本文的定义相矛盾，用的是瞬时量作基本概念',
      relationKind: '矛盾',
    });
    expect(ext.status).toBe(201);
    expect(((await ext.json()) as LiteratureResponse).entry).toMatchObject({
      source: 'external',
      title: 'On the Concept of Velocity',
      authors: ['A. Author', 'B. Author'],
      url: 'https://example.org/velocity',
    });

    const list = (await getJson<LiteratureListResponse>(app, `/outputs/${out.id}/literature`))
      .literature;
    expect(list.map((l) => l.source)).toEqual(['library', 'library', 'external']);
    // 产出物详情里也带着
    const detail = (await getJson<{ output: { literature: unknown[] } }>(app, `/outputs/${out.id}`))
      .output;
    expect(detail.literature).toHaveLength(3);
  });

  it('对不上的拒绝，不编：没有这本书、没有这个小节、行号超界、缺关系说明、坏链接', async () => {
    const { app, mainId } = await startOutputsApp();
    apps.push(app);
    const out = await createOutput(app, mainId, { title: 't', kind: '小论文', text: 'x' });
    const bad = async (body: object): Promise<number> =>
      (await post(app, `/outputs/${out.id}/literature`, body)).status;
    expect(await bad({ book: '不存在的书', relation: 'r' })).toBe(400);
    expect(await bad({ book: BOOK, file: 'ch99/none.md', relation: 'r' })).toBe(400);
    expect(await bad({ book: BOOK, file: 'ch01/sec-1.2.md', from: 9999, relation: 'r' })).toBe(400);
    expect(await bad({ book: BOOK, from: 2, relation: 'r' })).toBe(400);
    expect(await bad({ book: BOOK })).toBe(400);
    expect(await bad({ title: 'x', relation: '  ' })).toBe(400);
    expect(await bad({ relation: 'r' })).toBe(400);
    expect(await bad({ title: 'x', url: 'javascript:alert(1)', relation: 'r' })).toBe(400);
    expect(await bad({ title: 'x', relation: 'r', relationKind: '乱来' })).toBe(400);
    expect(
      (await post(app, `/outputs/nope/literature`, { title: 'x', relation: 'r' })).status,
    ).toBe(404);
    expect(
      (await getJson<LiteratureListResponse>(app, `/outputs/${out.id}/literature`)).literature,
    ).toEqual([]);
  });

  it('只追加；文献关系只记在 M14 自己的存放处，不写 M08', async () => {
    const { app, mainId } = await startOutputsApp();
    apps.push(app);
    const out = await createOutput(app, mainId, { title: 't', kind: '小论文', text: 'x' });
    const m08Before = await readFile(
      join(app.dataDir.root, 'knowledge', 'm08', 'clauses.jsonl'),
      'utf8',
    );
    await post(app, `/outputs/${out.id}/literature`, { title: 'a', relation: '1' });
    const file = join(app.dataDir.root, 'knowledge', 'm14', 'literature.jsonl');
    const one = (await readFile(file, 'utf8')).split('\n').filter(Boolean);
    await post(app, `/outputs/${out.id}/literature`, { title: 'b', relation: '2' });
    const two = (await readFile(file, 'utf8')).split('\n').filter(Boolean);
    expect(two.slice(0, 1)).toEqual(one);
    expect(two).toHaveLength(2);
    expect(
      await readFile(join(app.dataDir.root, 'knowledge', 'm08', 'clauses.jsonl'), 'utf8'),
    ).toBe(m08Before);
  });
});
