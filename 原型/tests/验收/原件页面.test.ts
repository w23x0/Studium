// 验收：闭环 / 学习者需要时调出原件页面和要标出的位置框（M02:32、M07:16,27、待确认项 B8）。只经 HTTP 验证。
// 原件用测试里造的三页最小 PDF；渲染用本机的 pdftoppm（没有就跳过渲染那几条，只验页面信息）。
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { LocateResponse, PageResponse } from '../../src/shared/protocol.ts';
import type { App } from '../../src/core/app.ts';
import { call, getJson } from '../helpers/http.ts';
import { tempDir } from '../helpers/tmp.ts';
import {
  LOCATED_BBOX,
  SAMPLE_BOOK,
  SECOND_BOOK,
  fetchRaw,
  hasPdftoppm,
  startLibraryApp,
} from '../helpers/library.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

const q = (s: string): string => encodeURIComponent(s);
const render = hasPdftoppm();

function pngSize(b: Buffer): { w: number; h: number } {
  expect(b.subarray(1, 4).toString('ascii')).toBe('PNG');
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

describe('原件页面', () => {
  it('页面信息：有原件的页给图的地址、内容块位置框、M08 锚点；位置框是千分比', async () => {
    // M08：一个点的锚点落在第 2 页，带位置框
    const m08Dir = await tempDir();
    await mkdir(m08Dir, { recursive: true });
    await writeFile(
      join(m08Dir, 'points.jsonl'),
      `${JSON.stringify({
        id: 'p-avg-velocity',
        name: '平均速度',
        sentence: '位移除以时间',
        anchors: [
          {
            book: SAMPLE_BOOK,
            file: 'ch01/sec-1.2.md',
            quote: '得到平均速度',
            page: 2,
            bbox: LOCATED_BBOX,
          },
          {
            book: SAMPLE_BOOK,
            file: 'ch01/sec-1.2.md',
            quote: '别页的',
            page: 3,
            bbox: [1, 2, 3, 4],
          },
        ],
        source: '书给的',
      })}\n`,
    );
    await writeFile(join(m08Dir, 'clauses.jsonl'), '');
    const { app } = await startLibraryApp({ m08Dir });
    apps.push(app);

    const p = await getJson<PageResponse>(app, `/library/page?book=${q(SAMPLE_BOOK)}&page=2`);
    expect(p).toMatchObject({ book: SAMPLE_BOOK, page: 2, available: true });
    expect(p.blocks.map((b) => [b.type, b.bbox])).toEqual([
      ['text', LOCATED_BBOX],
      ['equation', [300, 300, 700, 380]],
    ]);
    expect(p.blocks[0]?.text).toContain('位移告诉我们');
    expect(p.anchors).toEqual([
      {
        pointId: 'p-avg-velocity',
        pointName: '平均速度',
        quote: '得到平均速度',
        bbox: LOCATED_BBOX,
      },
    ]);
    expect(p.canRender).toBe(render);
    if (render) expect(p.imageUrl).toBe(`/api/library/page/image?book=${q(SAMPLE_BOOK)}&page=2`);
    else expect(p.imageUrl).toBeUndefined();
    // 第 1 页有块、没有锚点
    const p1 = await getJson<PageResponse>(app, `/library/page?book=${q(SAMPLE_BOOK)}&page=1`);
    expect(p1.blocks).toHaveLength(1);
    expect(p1.anchors).toEqual([]);
  });

  it('没有原件的书 / 超出已转换页段的页：available:false 并说明，不报错', async () => {
    const { app } = await startLibraryApp();
    apps.push(app);
    const none = await getJson<PageResponse>(app, `/library/page?book=${q(SECOND_BOOK)}&page=3`);
    expect(none).toMatchObject({ available: false, blocks: [], anchors: [] });
    expect(none.note).toContain('没有 PDF 原件');
    expect(none.imageUrl).toBeUndefined();
    const beyond = await getJson<PageResponse>(app, `/library/page?book=${q(SAMPLE_BOOK)}&page=4`);
    expect(beyond.available).toBe(false);
    // 图接口：没有原件 404
    expect((await call(app, `/library/page/image?book=${q(SECOND_BOOK)}&page=1`)).status).toBe(404);
    expect((await call(app, `/library/page/image?book=${q(SAMPLE_BOOK)}&page=4`)).status).toBe(404);
  });

  it('参数不对：缺 page / 页不是正整数 / 书不存在 / bbox 写错', async () => {
    const { app } = await startLibraryApp();
    apps.push(app);
    expect((await call(app, `/library/page?book=${q(SAMPLE_BOOK)}`)).status).toBe(400);
    expect((await call(app, `/library/page?book=${q(SAMPLE_BOOK)}&page=0`)).status).toBe(400);
    expect((await call(app, `/library/page?book=${q(SAMPLE_BOOK)}&page=1.5`)).status).toBe(400);
    expect((await call(app, '/library/page?book=没有&page=1')).status).toBe(404);
    expect(
      (await call(app, `/library/page/image?book=${q(SAMPLE_BOOK)}&page=1&bbox=1,2,3`)).status,
    ).toBe(400);
    expect(
      (await call(app, `/library/page/image?book=${q(SAMPLE_BOOK)}&page=1&bbox=500,500,100,600`))
        .status,
    ).toBe(400);
  });

  it.skipIf(!render)('页面图：PNG，带口令可直接当 <img> 地址；bbox 只取那一块', async () => {
    const { app } = await startLibraryApp();
    apps.push(app);
    const res = await fetchRaw(app, `/library/page/image?book=${q(SAMPLE_BOOK)}&page=2`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
    const full = pngSize(Buffer.from(await res.arrayBuffer()));
    // 页面 300×400 pt，按 110 dpi 渲染
    expect(full.w / full.h).toBeCloseTo(300 / 400, 1);
    // 用 ?token= 也行（<img src> 带不了请求头）
    const viaQuery = await fetch(
      `${app.server.url}/api/library/page/image?book=${q(SAMPLE_BOOK)}&page=2&token=test-token-0123456789`,
    );
    expect(viaQuery.status).toBe(200);
    // 局部：右半页的上半部分
    const part = await fetchRaw(
      app,
      `/library/page/image?book=${q(SAMPLE_BOOK)}&page=2&bbox=500,0,1000,500`,
    );
    expect(part.status).toBe(200);
    const sz = pngSize(Buffer.from(await part.arrayBuffer()));
    expect(Math.abs(sz.w - full.w / 2)).toBeLessThanOrEqual(2);
    expect(Math.abs(sz.h - full.h / 2)).toBeLessThanOrEqual(2);
    // 不是同一张图
    expect(sz.w).toBeLessThan(full.w);
    // 渲染过的第二次直接用缓存：照样 200
    expect((await fetchRaw(app, `/library/page/image?book=${q(SAMPLE_BOOK)}&page=2`)).status).toBe(
      200,
    );
  });

  it('小节里的行在原件上的位置：按文字比对 content_list 块，比不出来的行不返回', async () => {
    const { app } = await startLibraryApp();
    apps.push(app);
    const r = await getJson<LocateResponse>(
      app,
      `/library/locate?book=${q(SAMPLE_BOOK)}&file=ch01/sec-1.2.md&from=1&to=6`,
    );
    expect(r.locations).toEqual([{ line: 3, page: 2, bbox: LOCATED_BBOX }]);
    // 没有原件的书：空，不报错
    const none = await getJson<LocateResponse>(
      app,
      `/library/locate?book=${q(SECOND_BOOK)}&file=ch01/sec-1.1.md&from=1&to=5`,
    );
    expect(none.locations).toEqual([]);
    expect(
      (await call(app, `/library/locate?book=${q(SAMPLE_BOOK)}&file=ch01/sec-1.2.md`)).status,
    ).toBe(400);
    expect(
      (await call(app, `/library/locate?book=${q(SAMPLE_BOOK)}&file=ch09/x.md&from=1`)).status,
    ).toBe(404);
  });
});
