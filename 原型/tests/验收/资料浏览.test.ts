// 验收：M07 原资料结构浏览——列书、某书目录（章 / 节 / 习题）、读某小节（带行号、可取一段）、上下邻近小节（M07:14）。只经 HTTP 验证。
import { afterEach, describe, expect, it } from 'vitest';
import type { BooksResponse, SectionResponse, TocResponse } from '../../src/shared/protocol.ts';
import type { App } from '../../src/core/app.ts';
import { call, getJson } from '../helpers/http.ts';
import { SAMPLE_BOOK, SECOND_BOOK, startLibraryApp } from '../helpers/library.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

const q = (s: string): string => encodeURIComponent(s);

describe('资料浏览', () => {
  it('列书：书名、标题、有正文的条目数、有没有 PDF 原件', async () => {
    const { app } = await startLibraryApp();
    apps.push(app);
    const { books } = await getJson<BooksResponse>(app, '/library/books');
    expect(books.map((b) => b.id)).toEqual([SAMPLE_BOOK, SECOND_BOOK]);
    expect(books[0]).toMatchObject({ sections: 7, hasOriginal: true });
    expect(books[0]?.title).toContain('力学入门');
    expect(books[1]).toMatchObject({ title: '线性代数小样', sections: 2, hasOriginal: false });
  });

  it('目录：章 / 节 / 习题按书里顺序；两种目录格式都认；没有正文的章标出来', async () => {
    const { app } = await startLibraryApp();
    apps.push(app);
    const old = await getJson<TocResponse>(app, `/library/toc?book=${q(SAMPLE_BOOK)}`);
    expect(old.entries.map((e) => [e.num, e.kind, e.file])).toEqual([
      ['1.1', 'sec', 'ch01/sec-1.1.md'],
      ['1.2', 'sec', 'ch01/sec-1.2.md'],
      ['1.3', 'sec', 'ch01/sec-1.3.md'],
      ['1.4', 'sec', 'ch01/sec-1.4.md'],
      ['2.1', 'sec', 'ch02/sec-2.1.md'],
      ['2.2', 'sec', 'ch02/sec-2.2.md'],
      ['2', 'prob', 'ch02/prob-2.md'],
    ]);
    expect(old.entries[1]).toMatchObject({
      title: '速度',
      pages: 'p.3',
      chapter: 'ch01',
      examples: ['例 1.1'],
    });
    expect(old.entries[1]?.pdfPages).toBeUndefined();

    const neu = await getJson<TocResponse>(app, `/library/toc?book=${q(SECOND_BOOK)}`);
    expect(neu.title).toBe('线性代数小样');
    expect(neu.entries[0]).toMatchObject({ num: '1', kind: 'ch', level: 1, chapter: 'ch1' });
    expect(neu.entries[0]?.file).toBeUndefined();
    expect(neu.entries[0]?.note).toContain('无独立正文');
    expect(neu.entries[1]).toMatchObject({
      num: '1.1',
      title: 'Combinations',
      pdfPages: { from: 12, to: 20 },
      chapter: 'ch01',
    });
    // 标题里带 “ | ” 的行不错位
    expect(neu.entries[2]).toMatchObject({
      num: '1.2',
      file: 'ch01/sec-1.2.md',
      pdfPages: { from: 21, to: 31 },
    });
    expect(neu.entries[2]?.title).toContain('K | = 1');
  });

  it('读小节：带行号，可取一段；给前后邻近小节', async () => {
    const { app } = await startLibraryApp();
    apps.push(app);
    const all = await getJson<SectionResponse>(
      app,
      `/library/section?book=${q(SAMPLE_BOOK)}&file=ch01/sec-1.2.md`,
    );
    expect(all.bookTitle).toContain('力学入门');
    expect(all.entry).toMatchObject({ num: '1.2', title: '速度' });
    expect(all.lines[0]).toEqual({ n: 1, text: '# §1.2 速度（p.3）' });
    expect(all.lines.at(-1)?.n).toBe(all.totalLines);
    expect(all.prev?.num).toBe('1.1');
    expect(all.next?.num).toBe('1.3');

    const part = await getJson<SectionResponse>(
      app,
      `/library/section?book=${q(SAMPLE_BOOK)}&file=ch01/sec-1.2.md&from=3&to=4`,
    );
    expect(part.from).toBe(3);
    expect(part.to).toBe(4);
    expect(part.lines.map((l) => l.n)).toEqual([3, 4]);
    expect(part.lines[0]?.text).toContain('位移告诉我们物体挪了多少');
    // 与 read_source 印的行号一致
    expect(all.lines[2]).toEqual(part.lines[0]);

    // 第一个小节没有前一个
    const first = await getJson<SectionResponse>(
      app,
      `/library/section?book=${q(SAMPLE_BOOK)}&file=ch01/sec-1.1.md`,
    );
    expect(first.prev).toBeUndefined();
    expect(first.next?.num).toBe('1.2');
    // 超出末尾的截到末尾
    const tail = await getJson<SectionResponse>(
      app,
      `/library/section?book=${q(SAMPLE_BOOK)}&file=ch01/sec-1.2.md&from=${String(all.totalLines)}&to=999`,
    );
    expect(tail.lines.map((l) => l.n)).toEqual([all.totalLines]);
  });

  it('不存在的书 / 文件 404；缺参数、越界路径、坏行号 400；没带口令 401', async () => {
    const { app } = await startLibraryApp();
    apps.push(app);
    const status = async (path: string): Promise<number> => (await call(app, path)).status;
    expect(await status('/library/toc?book=没有这本书')).toBe(404);
    expect(await status(`/library/section?book=${q(SAMPLE_BOOK)}&file=ch09/nope.md`)).toBe(404);
    expect(await status('/library/toc')).toBe(400);
    expect(await status(`/library/section?book=${q(SAMPLE_BOOK)}`)).toBe(400);
    expect(await status(`/library/section?book=${q(SAMPLE_BOOK)}&file=../../index.md`)).toBe(400);
    expect(
      await status(`/library/section?book=${q(SAMPLE_BOOK)}&file=ch01/sec-1.2.md&from=0`),
    ).toBe(400);
    expect(
      await status(`/library/section?book=${q(SAMPLE_BOOK)}&file=ch01/sec-1.2.md&from=x`),
    ).toBe(400);
    const bare = await fetch(`${app.server.url}/api/library/books`);
    expect(bare.status).toBe(401);
  });
});
