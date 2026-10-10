// 验收：闭环回复里引用教材的出处（M02:17、M07:16）——出处标记能被核心解析、核对原文、给界面结构化数据；
// 选择卡出处里“书名/文件:行号”能回查到原文；闭环提示词要求附出处。只经 HTTP 验证。
import { afterEach, describe, expect, it } from 'vitest';
import type { CardResponse, ResolveCitationsResponse } from '../../src/shared/protocol.ts';
import { formatCitation } from '../../src/shared/citation.ts';
import { loadPrompts, type App } from '../../src/core/app.ts';
import { getJson, post } from '../helpers/http.ts';
import { newState, startApp, startLoop } from '../helpers/evidence-flow.ts';
import {
  SAMPLE_BOOK,
  SECOND_BOOK,
  SECOND_BOOK_TRIMMED,
  startLibraryApp,
} from '../helpers/library.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

async function resolve(app: App, text: string): Promise<ResolveCitationsResponse['citations']> {
  const res = await post(app, '/library/citations', { text });
  expect(res.status).toBe(200);
  return ((await res.json()) as ResolveCitationsResponse).citations;
}

describe('教材出处', () => {
  it('回复里的出处标记：解析出书 / 文件 / 行段，核对后带回那几行原文与小节信息', async () => {
    const { app } = await startLibraryApp();
    apps.push(app);
    const mark = formatCitation({ book: SAMPLE_BOOK, file: 'ch01/sec-1.2.md', from: 3, to: 4 });
    expect(mark).toBe(`【教材|${SAMPLE_BOOK}|ch01/sec-1.2.md|L3-4】`);
    const text = `平均速度就是位移除以时间${mark}，瞬时速度是它的极限。`;
    const [c, ...rest] = await resolve(app, text);
    expect(rest).toEqual([]);
    expect(c).toMatchObject({
      raw: mark,
      book: SAMPLE_BOOK,
      file: 'ch01/sec-1.2.md',
      from: 3,
      to: 4,
      resolved: true,
      section: '1.2 速度',
      pages: 'p.3',
    });
    expect(text.slice(c?.start, c?.end)).toBe(mark);
    expect(c?.lines?.map((l) => l.n)).toEqual([3, 4]);
    expect(c?.lines?.[0]?.text).toContain('位移告诉我们物体挪了多少');
    expect(c?.bookTitle).toContain('力学入门');
  });

  it('单行写法、全角竖线、书名首尾空白、一段话里多个出处都认；原件位置比得出就给', async () => {
    const { app } = await startLibraryApp();
    apps.push(app);
    const text = [
      `【教材|${SAMPLE_BOOK}|ch01/sec-1.2.md|L3】`,
      `【教材｜${SAMPLE_BOOK}｜ch01/sec-1.1.md｜L1-2】`,
      // 模型把书名尾部空格丢了，仍认得出是哪一本
      `【教材|${SECOND_BOOK_TRIMMED}|ch01/sec-1.1.md|L3】`,
    ].join('\n');
    const cs = await resolve(app, text);
    expect(cs.map((c) => [c.book, c.file, c.from, c.to, c.resolved])).toEqual([
      [SAMPLE_BOOK, 'ch01/sec-1.2.md', 3, 3, true],
      [SAMPLE_BOOK, 'ch01/sec-1.1.md', 1, 2, true],
      [SECOND_BOOK, 'ch01/sec-1.1.md', 3, 3, true],
    ]);
    // 样例书有 PDF 原件和块位置：第 3 行比得出
    expect(cs[0]?.location).toMatchObject({ line: 3, page: 2, bbox: [100, 200, 900, 260] });
    // 第二本没有原件：不给位置，也不报错；目录里有 PDF 页就带上
    expect(cs[2]?.location).toBeUndefined();
    expect(cs[2]?.pdfPages).toEqual({ from: 12, to: 20 });
  });

  it('对不上的出处照实标 resolved:false 和原因，不编；没有出处标记的文字返回空', async () => {
    const { app } = await startLibraryApp();
    apps.push(app);
    const bad = await resolve(
      app,
      [
        '【教材|没有这本书|ch01/sec-1.2.md|L1】',
        `【教材|${SAMPLE_BOOK}|ch09/nope.md|L1】`,
        `【教材|${SAMPLE_BOOK}|ch01/sec-1.2.md|L9999】`,
      ].join(' '),
    );
    expect(bad.map((c) => c.resolved)).toEqual([false, false, false]);
    expect(bad[0]?.problem).toContain('没有这本书');
    expect(bad[1]?.problem).toContain('没有这个文件');
    expect(bad[2]?.problem).toContain('超出');
    expect(bad.every((c) => c.lines === undefined)).toBe(true);
    expect(await resolve(app, '这段话没有出处，只有【教材】两个字')).toEqual([]);
    expect((await post(app, '/library/citations', { text: 1 })).status).toBe(400);
  });

  it('选择卡出处里“书名/文件:行号”回查成原文；没有书名的“文件:行号”认不出是哪一本', async () => {
    const state = newState();
    state.extraSources = [
      `${SAMPLE_BOOK}/ch01/sec-1.2.md:3-4`,
      'ch01/sec-1.2.md:3',
      `${SAMPLE_BOOK}/ch01/sec-1.2.md:9999`,
    ];
    const { app, mainId } = await startApp(state);
    apps.push(app);
    const { cardId } = await startLoop(app, mainId);
    const card = (await getJson<CardResponse>(app, `/cards/${cardId}`)).card;
    const [ok, bare, far] = card.options[0]?.sources ?? [];
    expect(ok).toMatchObject({
      kind: 'book_line',
      resolved: true,
      book: SAMPLE_BOOK,
      file: 'ch01/sec-1.2.md',
      from: 3,
      to: 4,
    });
    expect(ok?.lines?.map((l) => l.n)).toEqual([3, 4]);
    expect(ok?.detail).toContain('位移告诉我们物体挪了多少');
    expect(ok?.label).toContain('1.2 速度');
    expect(bare).toMatchObject({
      kind: 'book_line',
      resolved: false,
      file: 'ch01/sec-1.2.md',
      line: 3,
    });
    expect(far).toMatchObject({ kind: 'book_line', resolved: false });
    expect(far?.label).toContain('超出');
  });

  it('闭环提示词要求教材出处；格式与核心解析的一致', async () => {
    const prompts = await loadPrompts();
    expect(prompts.loop).toContain('【教材|书名|小节文件|L起行-止行】');
    expect(prompts.loop).toContain('不一致');
    expect(prompts.m05).toContain('书名/文件:行号');
  });
});
