// 验收：跨资料的重复线索与检索标签（M07:18）。同一知识点在不同书里的讲法，由程序按 M08 点的锚点 / 名字 / 检索词连起来
// （不调模型）；资料浏览的小节能看到“别的书也讲这里”；检索结果带标签（点名、书、内容类型：定义 / 例题 / 习题，
// 有依据才标），可按标签筛。只经 HTTP 验证（假模型）。
import { afterEach, describe, expect, it } from 'vitest';
import type {
  CluesResponse,
  SectionLinksResponse,
  TaggedSearchResponse,
} from '../../src/shared/protocol.ts';
import type { App } from '../../src/core/app.ts';
import { FakeModel } from '../../src/core/model/fake.ts';
import { call, getJson } from '../helpers/http.ts';
import { ALG, bootCross, PHYS_A, PHYS_B } from '../helpers/cross.ts';
import { toolOf } from '../helpers/scope.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

async function boot() {
  const r = await bootCross({ model: new FakeModel() });
  apps.push(r.app);
  return r;
}

const enc = encodeURIComponent;

describe('验收：跨资料线索与检索标签', () => {
  it('小节页：同一个点在两本书里都有锚点 → 别的书也讲这里；只列别的书，不列自己', async () => {
    const { app } = await boot();
    const r = await getJson<SectionLinksResponse>(
      app,
      `/library/links?book=${enc(PHYS_A)}&file=${enc('ch01/sec-1.1.md')}`,
    );
    expect(r.points.map((p) => p.id)).toEqual(['p-disp']);
    expect(r.others).toHaveLength(1);
    expect(r.others[0]).toMatchObject({
      book: PHYS_B,
      file: 'ch01/sec-1.md',
      num: '1.1',
      via: 'anchor',
    });
    expect(r.others[0]?.points.map((p) => p.id)).toEqual(['p-disp']);
    // 反过来也连得上
    const back = await getJson<SectionLinksResponse>(
      app,
      `/library/links?book=${enc(PHYS_B)}&file=${enc('ch01/sec-1.md')}`,
    );
    expect(back.others.map((o) => o.book)).toEqual([PHYS_A]);
  });

  it('名字相同 / 检索词相同的点也连（各写明怎么连的）；连不上的老实说没有，不编', async () => {
    const { app } = await boot();
    const vel = await getJson<SectionLinksResponse>(
      app,
      `/library/links?book=${enc(PHYS_A)}&file=${enc('ch01/sec-1.2.md')}`,
    );
    expect(vel.others).toHaveLength(1);
    expect(vel.others[0]).toMatchObject({ book: PHYS_B, file: 'ch02/sec-2.md', via: 'same_name' });
    // 线性组合（线代）与力的叠加（物理）共用检索词“叠加”：跨领域也能连
    const comb = await getJson<SectionLinksResponse>(
      app,
      `/library/links?book=${enc(ALG)}&file=${enc('ch01/sec-1.1.md')}`,
    );
    const sup = comb.others.find((o) => o.file === 'ch02/sec-2.2.md');
    expect(sup).toMatchObject({ book: PHYS_A, via: 'same_key' });
    // 线代那本的第二节没有任何点的锚点：没有线索
    const none = await getJson<SectionLinksResponse>(
      app,
      `/library/links?book=${enc(ALG)}&file=${enc('ch01/sec-1.2.md')}`,
    );
    expect(none.points).toEqual([]);
    expect(none.others).toEqual([]);
    // 缺参数 400、没有这本书 404
    expect((await call(app, '/library/links?book=x')).status).toBe(400);
    expect((await call(app, `/library/links?book=${enc('没有的书')}&file=a.md`)).status).toBe(404);
  });

  it('全部重复线索：讲在两本以上的书里才算；只在一本里的不列', async () => {
    const { app } = await boot();
    const { clues } = await getJson<CluesResponse>(app, '/library/clues');
    const disp = clues.find((c) => c.label === '位移');
    expect(disp?.sections.map((s) => `${s.book}/${s.file}`).sort()).toEqual(
      [`${PHYS_A}/ch01/sec-1.1.md`, `${PHYS_B}/ch01/sec-1.md`].sort(),
    );
    const vel = clues.find((c) => c.label === '速度');
    expect(vel?.points.map((p) => p.id).sort()).toEqual(['p-vel-a', 'p-vel-b']);
    // “力”只在一本书里讲：不是线索
    expect(clues.some((c) => c.points.some((p) => p.id === 'p-force'))).toBe(false);
    for (const c of clues) {
      expect(new Set(c.sections.map((s) => s.book)).size).toBeGreaterThanOrEqual(2);
    }
  });

  it('检索结果带标签：点名、内容类型有依据才标；可按书 / 内容类型 / 点名筛', async () => {
    const { app } = await boot();
    const all = await getJson<TaggedSearchResponse>(app, `/library/tagged-search?q=${enc('位移')}`);
    expect(all.hits.length).toBeGreaterThan(3);
    // 书给定义的那一节（位移）：标“定义”，点名带上
    const def = all.hits.find((h) => h.book === PHYS_A && h.file === 'ch01/sec-1.1.md');
    expect(def?.tags.types).toContain('定义');
    expect(def?.tags.points.map((p) => p.id)).toContain('p-disp');
    // 习题没有书给的点：不标“定义”（不编）
    const prob = all.hits.find((h) => h.file === 'ch03/prob-3.md');
    expect(prob?.tags.types).toEqual(['习题']);
    expect(prob?.tags.points).toEqual([]);
    // 目录里列了节内例题的才标“例题”
    const ex = all.hits.find((h) => h.book === PHYS_B && h.file === 'ch01/sec-1.md');
    expect(ex?.tags.types).toContain('例题');
    // 可筛的标签与条数
    expect(all.facets.books.map((b) => b.book).sort()).toEqual([PHYS_A, PHYS_B].sort());
    expect(all.facets.types.map((t) => t.type)).toEqual(
      expect.arrayContaining(['定义', '例题', '习题']),
    );
    expect(all.facets.points.map((p) => p.id)).toContain('p-disp');

    const byType = await getJson<TaggedSearchResponse>(
      app,
      `/library/tagged-search?q=${enc('位移')}&type=${enc('习题')}`,
    );
    expect(byType.hits.length).toBeGreaterThan(0);
    expect(byType.hits.every((h) => h.tags.types.includes('习题'))).toBe(true);
    // 筛了之后可筛的标签不跟着缩（按筛之前的命中算）
    expect(byType.facets.books.length).toBe(all.facets.books.length);

    const byBook = await getJson<TaggedSearchResponse>(
      app,
      `/library/tagged-search?q=${enc('位移')}&inBook=${enc(PHYS_B)}`,
    );
    expect(byBook.hits.length).toBeGreaterThan(0);
    expect(byBook.hits.every((h) => h.book === PHYS_B)).toBe(true);

    const byPoint = await getJson<TaggedSearchResponse>(
      app,
      `/library/tagged-search?q=${enc('位移')}&point=p-disp`,
    );
    expect(byPoint.hits.length).toBeGreaterThan(0);
    expect(byPoint.hits.every((h) => h.tags.points.some((p) => p.id === 'p-disp'))).toBe(true);

    expect(
      (await call(app, `/library/tagged-search?q=${enc('位移')}&type=${enc('随便')}`)).status,
    ).toBe(400);
    expect((await call(app, '/library/tagged-search')).status).toBe(400);
  });

  it('模型查资料时也能看到别的书怎么讲（related_sections，按点或按小节）', async () => {
    const { app, mainId } = await boot();
    const tool = toolOf(app, 'm05', mainId, 'related_sections');
    const byPoint = await tool.run({ point: 'p-disp' });
    expect(byPoint.isError).not.toBe(true);
    expect(byPoint.text).toContain(PHYS_B);
    expect(byPoint.text).toContain('【教材|');
    const bySection = await tool.run({ book: PHYS_A, file: 'ch01/sec-1.2.md' });
    expect(bySection.text).toContain('名字相同');
    const none = await tool.run({ book: ALG, file: 'ch01/sec-1.2.md' });
    expect(none.text).toContain('没有查到');
    expect((await tool.run({})).isError).toBe(true);
  });
});
