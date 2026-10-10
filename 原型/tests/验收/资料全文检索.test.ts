// 验收：M07 全文检索——学习者用的 HTTP 接口，和闭环 / M05 能用的模型工具；返回书、小节、行号、片段（M07:15）。
import { afterEach, describe, expect, it } from 'vitest';
import type { LibrarySearchResponse } from '../../src/shared/protocol.ts';
import { parseCitations } from '../../src/shared/citation.ts';
import type { App } from '../../src/core/app.ts';
import { call, getJson } from '../helpers/http.ts';
import { SAMPLE_BOOK, SECOND_BOOK, startLibraryApp } from '../helpers/library.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

const q = (s: string): string => encodeURIComponent(s);

describe('资料全文检索', () => {
  it('中文词：返回书、小节、行号、片段，行号能在小节里对上', async () => {
    const { app } = await startLibraryApp();
    apps.push(app);
    const r = await getJson<LibrarySearchResponse>(app, `/library/search?q=${q('瞬时速度')}`);
    expect(r.query).toBe('瞬时速度');
    expect(r.total).toBeGreaterThan(0);
    const hit = r.hits.find((h) => h.file === 'ch01/sec-1.2.md');
    expect(hit).toMatchObject({ book: SAMPLE_BOOK, num: '1.2', title: '速度' });
    expect(hit?.snippet).toContain('瞬时速度');
    // 行号指向真实的行
    const sec = await getJson<{ lines: { n: number; text: string }[] }>(
      app,
      `/library/section?book=${q(SAMPLE_BOOK)}&file=ch01/sec-1.2.md&from=${String(hit?.line)}&to=${String(hit?.line)}`,
    );
    expect(sec.lines[0]?.text).toContain('瞬时速度');
  });

  it('多个词要同时出现在同一段；大小写不分；可只搜一本；limit 截断', async () => {
    const { app } = await startLibraryApp();
    apps.push(app);
    const both = await getJson<LibrarySearchResponse>(
      app,
      `/library/search?q=${q('NULLSPACE subspace')}`,
    );
    expect(both.hits.map((h) => [h.book, h.file, h.line])).toEqual([
      [SECOND_BOOK, 'ch01/sec-1.1.md', 5],
    ]);
    expect(both.hits[0]).toMatchObject({ pdfPage: 12, num: '1.1' });
    // nullspace 和 length 不在同一段
    const apart = await getJson<LibrarySearchResponse>(
      app,
      `/library/search?q=${q('nullspace length')}`,
    );
    expect(apart.hits).toEqual([]);
    // 只搜一本
    const one = await getJson<LibrarySearchResponse>(
      app,
      `/library/search?q=${q('nullspace')}&book=${q(SECOND_BOOK)}`,
    );
    expect(one.hits.map((h) => h.file).sort()).toEqual(['ch01/sec-1.1.md', 'ch01/sec-1.2.md']);
    const none = await getJson<LibrarySearchResponse>(
      app,
      `/library/search?q=${q('nullspace')}&book=${q(SAMPLE_BOOK)}`,
    );
    expect(none.hits).toEqual([]);
    const limited = await getJson<LibrarySearchResponse>(
      app,
      `/library/search?q=${q('的')}&limit=2`,
    );
    expect(limited.hits).toHaveLength(2);
    expect(limited.total).toBeGreaterThan(2);
  });

  it('参数不对：q 为空 400，书不存在 404', async () => {
    const { app } = await startLibraryApp();
    apps.push(app);
    expect((await call(app, '/library/search?q=')).status).toBe(400);
    expect((await call(app, '/library/search')).status).toBe(400);
    expect((await call(app, `/library/search?q=x&book=${q('没有')}`)).status).toBe(404);
  });

  it('模型工具 search_textbook：闭环、M05、守卫、畅谈有；M09 / M10 没有；结果带可直接用的出处标记', async () => {
    const { app } = await startLibraryApp();
    apps.push(app);
    const toolNames = (kind: 'loop' | 'm05' | 'guard' | 'talk' | 'm09' | 'm10'): string[] =>
      app.studium
        .kind(kind)
        .tools('x')
        .map((t) => t.name);
    for (const kind of ['loop', 'm05', 'guard', 'talk'] as const) {
      expect(toolNames(kind), kind).toContain('search_textbook');
    }
    for (const kind of ['m09', 'm10'] as const) {
      expect(toolNames(kind), kind).not.toContain('search_textbook');
    }
    const tools = app.studium.kind('loop').tools('x');
    const search = tools.find((t) => t.name === 'search_textbook');
    const found = await search?.run({ query: '加速度' });
    expect(found?.isError).not.toBe(true);
    expect(found?.text).toContain('ch01/sec-1.3.md');
    const marks = parseCitations(found?.text ?? '');
    expect(marks.length).toBeGreaterThan(0);
    expect(marks[0]?.book).toBe(SAMPLE_BOOK);
    expect((await search?.run({ query: '这个词教材里肯定没有qwxz' }))?.text).toContain('没找到');

    // read_source 也在结果末尾给出处标记
    const read = tools.find((t) => t.name === 'read_source');
    const text = (
      await read?.run({ book: SAMPLE_BOOK, file: 'ch01/sec-1.2.md', from_line: 3, to_line: 5 })
    )?.text;
    expect(text).toContain('3\t');
    expect(parseCitations(text ?? '')[0]).toMatchObject({
      book: SAMPLE_BOOK,
      file: 'ch01/sec-1.2.md',
      from: 3,
      to: 5,
    });
  });
});
