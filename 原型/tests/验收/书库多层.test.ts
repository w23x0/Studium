// 验收：书库根下可以有学科目录再到书；自动认出“书”这一层；同名书用学科区分。只经 HTTP 验证。
import { cp } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { SAMPLE_DIR, type App } from '../../src/core/app.ts';
import type {
  BooksResponse,
  LibrarySearchResponse,
  ResolveCitationsResponse,
  SectionResponse,
} from '../../src/shared/protocol.ts';
import { call, getJson, post } from '../helpers/http.ts';
import { SAMPLE_BOOK, SECOND_BOOK, startLibraryApp } from '../helpers/library.ts';
import { ALGEBRA, makeNestedLibrary, PHYSICS } from '../helpers/scope.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

const q = encodeURIComponent;

describe('验收：书库多层', () => {
  it('学科目录下的书被认出来，带学科；浏览、检索、出处核对照常', async () => {
    const library = await makeNestedLibrary();
    const { app } = await startLibraryApp({ library });
    apps.push(app);

    const { books } = await getJson<BooksResponse>(app, '/library/books');
    expect(books.map((b) => b.id).sort()).toEqual([SAMPLE_BOOK, SECOND_BOOK].sort());
    expect(books.find((b) => b.id === SAMPLE_BOOK)).toMatchObject({
      subject: PHYSICS,
      kind: 'book',
    });
    expect(books.find((b) => b.id === SECOND_BOOK)?.subject).toBe(ALGEBRA);

    const sec = await getJson<SectionResponse>(
      app,
      `/library/section?book=${q(SAMPLE_BOOK)}&file=${q('ch01/sec-1.2.md')}`,
    );
    expect(sec.lines.length).toBeGreaterThan(3);

    const found = await getJson<LibrarySearchResponse>(app, `/library/search?q=${q('加速度')}`);
    expect(found.hits.some((h) => h.book === SAMPLE_BOOK)).toBe(true);
    const nullspace = await getJson<LibrarySearchResponse>(app, `/library/search?q=nullspace`);
    expect(nullspace.hits.some((h) => h.book === SECOND_BOOK)).toBe(true);

    const cited = (await (
      await post(app, '/library/citations', {
        text: `【教材|${SAMPLE_BOOK}|ch01/sec-1.2.md|L3-4】`,
      })
    ).json()) as ResolveCitationsResponse;
    expect(cited.citations[0]?.resolved).toBe(true);
  });

  it('不同学科下同名的书：用“名（学科）”区分，两个 id 都能读', async () => {
    const library = await makeNestedLibrary();
    await cp(join(SAMPLE_DIR, '书库', SAMPLE_BOOK), join(library, '其他', SAMPLE_BOOK), {
      recursive: true,
    });
    const { app } = await startLibraryApp({ library });
    apps.push(app);
    const { books } = await getJson<BooksResponse>(app, '/library/books');
    const ids = books.map((b) => b.id).filter((id) => id.startsWith(SAMPLE_BOOK));
    expect(ids.sort()).toEqual(
      [`${SAMPLE_BOOK}（其他）`, `${SAMPLE_BOOK}（大学物理·力学）`].sort(),
    );
    for (const id of ids) {
      const res = await call(app, `/library/section?book=${q(id)}&file=${q('ch01/sec-1.2.md')}`);
      expect(res.status, id).toBe(200);
    }
  });

  it('平铺的书库（书直接在根下）照旧，没有学科', async () => {
    const { app } = await startLibraryApp();
    apps.push(app);
    const { books } = await getJson<BooksResponse>(app, '/library/books');
    expect(books.length).toBeGreaterThanOrEqual(2);
    expect(books.every((b) => b.subject === undefined)).toBe(true);
  });
});
