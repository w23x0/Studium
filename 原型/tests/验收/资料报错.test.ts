// 验收：学习者对某段教材原文报错（转录错、公式错、定位错……）→ 只追加记进报错存放处，能列出；不改书库（M07:20）。只经 HTTP 验证。
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { SourceReportResponse, SourceReportsResponse } from '../../src/shared/protocol.ts';
import type { App } from '../../src/core/app.ts';
import { getJson, post } from '../helpers/http.ts';
import { SAMPLE_BOOK, SECOND_BOOK, startLibraryApp } from '../helpers/library.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

const q = (s: string): string => encodeURIComponent(s);

describe('资料报错', () => {
  it('报错：带书、文件、行段、类型、说明；记下当时那几行原文；列得出，可按书 / 文件筛', async () => {
    const { app } = await startLibraryApp();
    apps.push(app);
    expect((await getJson<SourceReportsResponse>(app, '/library/reports')).reports).toEqual([]);

    const res = await post(app, '/library/reports', {
      book: SAMPLE_BOOK,
      file: 'ch01/sec-1.2.md',
      from: 5,
      to: 6,
      kind: '公式错',
      text: '这个公式的分母好像转错了',
      page: 2,
    });
    expect(res.status).toBe(201);
    const { report } = (await res.json()) as SourceReportResponse;
    expect(report).toMatchObject({
      book: SAMPLE_BOOK,
      file: 'ch01/sec-1.2.md',
      from: 5,
      to: 6,
      kind: '公式错',
      text: '这个公式的分母好像转错了',
      page: 2,
      status: 'open',
    });
    expect(report.id).toMatch(/^sr-/);
    expect(report.quote).toContain('\\bar v');

    // 再报一条别的小节、省略 kind 和 to
    const other = await post(app, '/library/reports', {
      book: SECOND_BOOK,
      file: 'ch01/sec-1.1.md',
      from: 3,
      text: '这行字被截断了',
    });
    expect(other.status).toBe(201);
    expect(((await other.json()) as SourceReportResponse).report).toMatchObject({
      kind: '其他',
      from: 3,
      to: 3,
    });

    const all = (await getJson<SourceReportsResponse>(app, '/library/reports')).reports;
    expect(all.map((r) => r.text)).toEqual(['这个公式的分母好像转错了', '这行字被截断了']);
    const byBook = await getJson<SourceReportsResponse>(
      app,
      `/library/reports?book=${q(SECOND_BOOK)}`,
    );
    expect(byBook.reports.map((r) => r.book)).toEqual([SECOND_BOOK]);
    const byFile = await getJson<SourceReportsResponse>(
      app,
      `/library/reports?book=${q(SAMPLE_BOOK)}&file=ch01/sec-1.2.md`,
    );
    expect(byFile.reports).toHaveLength(1);
  });

  it('只追加：存放处是追加的 JSONL，重启后还在；书库文件不变', async () => {
    const first = await startLibraryApp();
    const { library, dataRoot } = first;
    const sectionPath = join(library, SAMPLE_BOOK, 'm07', 'ch01', 'sec-1.2.md');
    const before = await readFile(sectionPath, 'utf8');
    await post(first.app, '/library/reports', {
      book: SAMPLE_BOOK,
      file: 'ch01/sec-1.2.md',
      from: 3,
      kind: '转录错',
      text: '第一条',
    });
    const file = join(dataRoot, 'knowledge', 'source-reports', 'records.jsonl');
    const one = await readFile(file, 'utf8');
    expect(one.trimEnd().split('\n')).toHaveLength(1);
    await post(first.app, '/library/reports', {
      book: SAMPLE_BOOK,
      file: 'ch01/sec-1.2.md',
      from: 4,
      kind: '转录错',
      text: '第二条',
    });
    const two = await readFile(file, 'utf8');
    expect(two.startsWith(one)).toBe(true); // 旧行原样在前
    expect(two.trimEnd().split('\n')).toHaveLength(2);
    expect(await readFile(sectionPath, 'utf8')).toBe(before);
    await first.app.close();

    const again = await startLibraryApp({ library, dataRoot });
    apps.push(again.app);
    const reports = (await getJson<SourceReportsResponse>(again.app, '/library/reports')).reports;
    expect(reports.map((r) => r.text)).toEqual(['第一条', '第二条']);
    // 书库目录里没有多出任何文件
    expect((await readdir(join(library, SAMPLE_BOOK))).sort()).toEqual([
      'm07',
      'p1-3',
      'source.json',
    ]);
  });

  it('不合格的报错被拒：没说明 / 行号不对 / 超出文件 / 类型不认识 / 书或文件不存在', async () => {
    const { app } = await startLibraryApp();
    apps.push(app);
    const ok = { book: SAMPLE_BOOK, file: 'ch01/sec-1.2.md', from: 3, text: '不对' };
    const status = async (body: object): Promise<number> =>
      (await post(app, '/library/reports', body)).status;
    expect(await status({ ...ok, text: '  ' })).toBe(400);
    expect(await status({ ...ok, from: 0 })).toBe(400);
    expect(await status({ ...ok, to: 2 })).toBe(400);
    expect(await status({ ...ok, from: 9999 })).toBe(400);
    expect(await status({ ...ok, kind: '随便' })).toBe(400);
    expect(await status({ ...ok, book: '没有这本书' })).toBe(404);
    expect(await status({ ...ok, file: 'ch09/x.md' })).toBe(404);
    expect(await status({ ...ok, file: '../../etc/passwd' })).toBe(400);
    expect((await getJson<SourceReportsResponse>(app, '/library/reports')).reports).toEqual([]);
  });
});
