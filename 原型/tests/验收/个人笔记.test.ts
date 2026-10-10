// 验收：个人笔记进 M07——导入一份或一个目录的 Markdown 笔记，按标题切成小节，存到数据目录下自己的 M07 区；
// 标作者 = 学习者、来源 = 个人笔记、原路径；之后和书一样可浏览、检索、引用。不改书库、不改笔记原件。只经 HTTP 验证。
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import type {
  BooksResponse,
  LibrarySearchResponse,
  NoteImportResponse,
  NotesResponse,
  ResolveCitationsResponse,
  SectionResponse,
  TocResponse,
} from '../../src/shared/protocol.ts';
import { call, getJson, post } from '../helpers/http.ts';
import { startLibraryApp } from '../helpers/library.ts';
import { makeNotesDir } from '../helpers/scope.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

const q = encodeURIComponent;

async function snapshot(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true, recursive: true })) {
    if (e.isFile()) {
      const p = join(e.parentPath, e.name);
      out.push(`${p}\n${await readFile(p, 'utf8')}`);
    }
  }
  return out.sort();
}

describe('验收：个人笔记进 M07', () => {
  it('导入一个目录：按标题切小节、标作者与来源与原路径，原件与书库不动', async () => {
    const { app, library, dataRoot } = await startLibraryApp();
    apps.push(app);
    const { dir } = await makeNotesDir();
    const before = await snapshot(dir);
    const libBefore = await snapshot(library);

    const res = await post(app, '/library/notes/import', { path: dir });
    expect(res.status).toBe(201);
    const { note } = (await res.json()) as NoteImportResponse;
    expect(note).toMatchObject({
      author: '学习者',
      source: '个人笔记',
      originalPath: dir,
      files: 2,
      sections: 4,
    });
    expect(note.id.startsWith('笔记-')).toBe(true);
    expect(note.skipped).toEqual([join(dir, '附件.txt')]);

    // 存在数据目录自己的 M07 区，不在书库里
    expect(await readdir(join(dataRoot, 'knowledge', 'm07-notes'))).toContain(note.id);
    expect(await snapshot(dir)).toEqual(before);
    expect(await snapshot(library)).toEqual(libBefore);

    // 和书一样出现在书目里，带来源信息
    const { books } = await getJson<BooksResponse>(app, '/library/books');
    expect(books.find((b) => b.id === note.id)).toMatchObject({
      kind: 'note',
      author: '学习者',
      source: '个人笔记',
      originalPath: dir,
      subject: '个人笔记',
    });

    // 目录：每个文件一章，标题切小节（代码块里的井号、更深的标题不切）
    const toc = await getJson<TocResponse>(app, `/library/toc?book=${q(note.id)}`);
    const secs = toc.entries.filter((e) => e.file !== undefined);
    expect(secs.map((e) => e.title)).toEqual(['01向量', '向量', '线性组合', '02矩阵']);
    const file = secs[2]?.file ?? '';
    const sec = await getJson<SectionResponse>(
      app,
      `/library/section?book=${q(note.id)}&file=${q(file)}`,
    );
    const text = sec.lines.map((l) => l.text).join('\n');
    expect(text).toContain('## 线性组合');
    expect(text).toContain('# 这是代码块里的井号，不是标题');
    expect(text).toContain('#### 更深的标题不切开');
    expect(file).toBeTruthy();
  });

  it('导入后可检索、可引用（出处标记照用）', async () => {
    const { app } = await startLibraryApp();
    apps.push(app);
    const { dir } = await makeNotesDir();
    const { note } = (await (
      await post(app, '/library/notes/import', { path: dir, title: '线代笔记' })
    ).json()) as NoteImportResponse;
    expect(note.title).toBe('线代笔记');

    const hits = await getJson<LibrarySearchResponse>(app, `/library/search?q=${q('数乘 相加')}`);
    const hit = hits.hits.find((h) => h.book === note.id);
    expect(hit).toBeTruthy();
    const cited = (await (
      await post(app, '/library/citations', {
        text: `【教材|${note.id}|${hit?.file ?? ''}|L${String(hit?.line ?? 1)}】`,
      })
    ).json()) as ResolveCitationsResponse;
    expect(cited.citations[0]).toMatchObject({ resolved: true, book: note.id });

    // 模型的 read_source / search_textbook 同样读得到笔记
    const tools = app.studium.kind('loop').tools('x');
    const found = await tools.find((t) => t.name === 'search_textbook')?.run({ query: '线性组合' });
    expect(found?.text).toContain(note.id);
  });

  it('导入单个文件；同一路径再导入是新版本，旧的还在（引用不失效）', async () => {
    const { app } = await startLibraryApp();
    apps.push(app);
    const { file2 } = await makeNotesDir();
    const first = (await (
      await post(app, '/library/notes/import', { path: file2 })
    ).json()) as NoteImportResponse;
    expect(first.note).toMatchObject({ files: 1, sections: 1 });
    const second = (await (
      await post(app, '/library/notes/import', { path: file2 })
    ).json()) as NoteImportResponse;
    expect(second.note.id).not.toBe(first.note.id);
    expect(second.note.previous).toBe(first.note.id);
    const list = await getJson<NotesResponse>(app, '/library/notes');
    expect(list.notes.map((n) => n.id).sort()).toEqual([first.note.id, second.note.id].sort());
  });

  it('图片引用保留路径；找得到的图片可经接口取', async () => {
    const { app } = await startLibraryApp();
    apps.push(app);
    const { dir } = await makeNotesDir();
    const { note } = (await (
      await post(app, '/library/notes/import', { path: dir })
    ).json()) as NoteImportResponse;
    expect(note.assets.map((a) => [a.ref, a.found])).toEqual([
      ['img/a.png', true],
      ['b.png', true],
      ['丢了.png', false],
    ]);
    const toc = await getJson<TocResponse>(app, `/library/toc?book=${q(note.id)}`);
    const all = (
      await Promise.all(
        toc.entries
          .filter((e) => e.file !== undefined)
          .map((e) =>
            getJson<SectionResponse>(
              app,
              `/library/section?book=${q(note.id)}&file=${q(e.file ?? '')}`,
            ),
          ),
      )
    )
      .flatMap((s) => s.lines.map((l) => l.text))
      .join('\n');
    expect(all).toContain('![示意](img/a.png)');
    expect(all).toContain('![[b.png]]');

    const img = await call(app, `/library/note-asset?book=${q(note.id)}&ref=${q('img/a.png')}`);
    expect(img.headers.get('content-type')).toBe('image/png');
    expect(await img.text()).toBe('not-really-a-png');
    expect(
      (await call(app, `/library/note-asset?book=${q(note.id)}&ref=${q('丢了.png')}`)).status,
    ).toBe(404);
    expect(
      (await call(app, `/library/note-asset?book=${q(note.id)}&ref=${q('../../etc/passwd')}`))
        .status,
    ).toBe(404);
  });

  it('不收的和找不到的：400', async () => {
    const { app } = await startLibraryApp();
    apps.push(app);
    const { dir } = await makeNotesDir();
    expect((await post(app, '/library/notes/import', { path: join(dir, '附件.txt') })).status).toBe(
      400,
    );
    expect((await post(app, '/library/notes/import', { path: join(dir, '没有.md') })).status).toBe(
      400,
    );
    expect((await post(app, '/library/notes/import', { path: '' })).status).toBe(400);
    expect((await post(app, '/library/notes/import', {})).status).toBe(400);
  });
});
