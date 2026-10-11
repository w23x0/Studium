// 验收：来源可靠性与适用性说明（M07:19）。每本书 / 笔记一份说明：类型、层次、作者、适用范围、转写质量。
// 程序能算的算（个人笔记、作者、报错数、M08 审核的疑似转录错误数），其余由学习者或模型补一句（只追加，旧的留着）；
// 不给综合分数；模型查资料的工具结果带上这条说明。只经 HTTP / 工具验证（假模型）。
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type {
  NoteImportResponse,
  SourceNoteResponse,
  SourceNotesResponse,
} from '../../src/shared/protocol.ts';
import type { App } from '../../src/core/app.ts';
import { FakeModel } from '../../src/core/model/fake.ts';
import { call, getJson, post } from '../helpers/http.ts';
import { ALG, bootCross, PHYS_A, PHYS_B } from '../helpers/cross.ts';
import { makeNotesDir, toolOf, writeM08 } from '../helpers/scope.ts';
import { tempDir } from '../helpers/tmp.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

const enc = encodeURIComponent;

async function note(app: App, book: string): Promise<SourceNoteResponse['note']> {
  return (await getJson<SourceNoteResponse>(app, `/library/source-notes?book=${enc(book)}`)).note;
}

describe('验收：资料来源说明', () => {
  it('每本书一份；程序没法算的类型 / 层次 / 适用范围不编；转写质量只列读得到的数据，不打分', async () => {
    const r = await bootCross({ model: new FakeModel() });
    apps.push(r.app);
    const { notes } = await getJson<SourceNotesResponse>(r.app, '/library/source-notes');
    expect(notes.map((n) => n.book).sort()).toEqual([ALG, PHYS_A, PHYS_B].sort());
    const n = await note(r.app, PHYS_A);
    expect(n.type).toBeUndefined();
    expect(n.level).toBeUndefined();
    expect(n.scope).toBeUndefined();
    expect(n.kind).toBe('book');
    expect(n.subject).toBe('大学物理/力学');
    expect(n.quality.reports).toBe(0);
    // 这套 M08 涉及好几本书：审核报告对不上哪一本，不乱算
    expect(n.quality.suspected).toBeUndefined();
    expect(n.quality.text).toContain('没有审核数据');
    expect(n.quality.text).toContain('不等于没有别的错');
    expect(n.summary).toContain('类型没说明');
    // 没有综合分数这类字段
    expect(JSON.stringify(n)).not.toMatch(/score|rating|可靠度|评分/);

    // 学习者报过的转录错会算进转写质量
    const rep = await post(r.app, '/library/reports', {
      book: PHYS_A,
      file: 'ch01/sec-1.1.md',
      from: 3,
      text: '这里的公式抄错了',
    });
    expect(rep.status).toBe(201);
    const after = await note(r.app, PHYS_A);
    expect(after.quality.reports).toBe(1);
    expect(after.summary).toContain('报错 1 处');
  });

  it('学习者补一句：只追加，同一项补了多次取最新、旧的留着；坏请求被拒', async () => {
    const r = await bootCross({ model: new FakeModel() });
    apps.push(r.app);
    const file = join(r.dataRoot, 'knowledge', 'source-notes', 'records.jsonl');
    const first = await post(r.app, '/library/source-notes', {
      book: PHYS_A,
      field: 'type',
      text: '教材',
    });
    expect(first.status).toBe(201);
    const n1 = ((await first.json()) as SourceNoteResponse).note;
    expect(n1.type).toMatchObject({ value: '教材', from: '学习者' });
    const before = await readFile(file, 'utf8');
    await post(r.app, '/library/source-notes', { book: PHYS_A, field: 'type', text: '讲义' });
    await post(r.app, '/library/source-notes', {
      book: PHYS_A,
      field: 'scope',
      text: '只讲一维运动，不含转动',
    });
    const n = await note(r.app, PHYS_A);
    expect(n.type?.value).toBe('讲义');
    expect(n.scope?.value).toBe('只讲一维运动，不含转动');
    expect(n.additions.map((a) => a.text)).toEqual(['教材', '讲义', '只讲一维运动，不含转动']);
    expect(n.summary).toContain('适用：只讲一维运动');
    // 旧的行原样还在
    expect((await readFile(file, 'utf8')).startsWith(before)).toBe(true);
    // 补的是 PHYS_A，别的书不受影响
    expect((await note(r.app, PHYS_B)).type).toBeUndefined();

    expect(
      (await post(r.app, '/library/source-notes', { book: PHYS_A, field: '随便', text: 'x' }))
        .status,
    ).toBe(400);
    expect(
      (await post(r.app, '/library/source-notes', { book: PHYS_A, field: 'type', text: '  ' }))
        .status,
    ).toBe(400);
    expect(
      (
        await post(r.app, '/library/source-notes', {
          book: PHYS_A,
          field: 'type',
          text: '长'.repeat(400),
        })
      ).status,
    ).toBe(400);
    expect(
      (await post(r.app, '/library/source-notes', { book: '没有的书', field: 'type', text: 'x' }))
        .status,
    ).toBe(404);
    expect((await call(r.app, `/library/source-notes?book=${enc('没有的书')}`)).status).toBe(404);
  });

  it('个人笔记：类型和作者程序就能认出来', async () => {
    const r = await bootCross({ model: new FakeModel() });
    apps.push(r.app);
    const { dir } = await makeNotesDir();
    const imp = (await (
      await post(r.app, '/library/notes/import', { path: dir, title: '线代笔记' })
    ).json()) as NoteImportResponse;
    const n = await note(r.app, imp.note.id);
    expect(n.kind).toBe('note');
    expect(n.type).toMatchObject({ value: '个人笔记', from: '程序' });
    expect(n.author?.from).toBe('资料');
    expect(n.importedAt).toBeDefined();
  });

  it('M08 审核报告里的“疑似转录错误”数：报告对得上这一本书才算，读不到就不写', async () => {
    const m08 = await tempDir();
    await writeM08(join(m08, 'alg-set'), ALG.trim(), 'ch01', [{ id: 'a1', name: '甲' }], []);
    await writeM08(join(m08, 'phys-set'), PHYS_A, 'ch01', [{ id: 'b1', name: '乙' }], []);
    await writeFile(
      join(m08, 'alg-set', 'report.md'),
      '# M08 产出检查（程序）\n\n- 并入时的问题 0；丢弃的摘录 1；疑似转录错误 3\n\n## 疑似转录错误（审核报的，未核实）\n',
    );
    const r = await bootCross({ model: new FakeModel(), m08Dir: m08 });
    apps.push(r.app);
    const alg = await note(r.app, ALG);
    expect(alg.quality.suspected).toBe(3);
    expect(alg.quality.suspectedFrom).toContain('alg-set');
    expect(alg.quality.text).toContain('疑似转录错误 3');
    expect(alg.quality.text).toContain('没核实');
    // 另一套没有报告：没有数据
    const phys = await note(r.app, PHYS_A);
    expect(phys.quality.suspected).toBeUndefined();
    expect(phys.quality.text).toContain('没有审核数据');
  });

  it('模型也能补一句（须写依据，标“模型”、记在哪个会话）；闭环 / M05 查资料的结果带这条说明', async () => {
    const r = await bootCross({ model: new FakeModel() });
    apps.push(r.app);
    const add = toolOf(r.app, 'm05', r.mainId, 'add_source_note');
    const done = await add.run({
      book: PHYS_B,
      field: 'level',
      text: '入门',
      basis: '读了目录：只有三章',
    });
    expect(done.isError).not.toBe(true);
    const n = await note(r.app, PHYS_B);
    expect(n.level).toMatchObject({ value: '入门', from: '模型' });
    expect(n.additions[0]).toMatchObject({
      by: '模型',
      sessionId: r.mainId,
      basis: '读了目录：只有三章',
    });
    expect(
      (await add.run({ book: '没有的书', field: 'level', text: 'x', basis: 'y' })).isError,
    ).toBe(true);
    // 守卫等不该写资料说明的会话没有这个工具
    expect(() => toolOf(r.app, 'guard', r.mainId, 'add_source_note')).toThrow();

    // 查资料的工具结果末尾带来源说明
    const search = await toolOf(r.app, 'm05', r.mainId, 'search_textbook').run({
      query: '位移',
      all: true,
    });
    expect(search.text).toContain('来源说明');
    expect(search.text).toContain('层次：入门');
    const read = await toolOf(r.app, 'm05', r.mainId, 'read_source').run({
      book: PHYS_B,
      file: 'ch01/sec-1.md',
    });
    expect(read.text).toContain('来源说明');
    const idx = await toolOf(r.app, 'm05', r.mainId, 'textbook_index').run({ book: PHYS_B });
    expect(idx.text).toContain('来源说明');
  });
});
