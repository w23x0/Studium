// 原文与出处的测试用书库：在样例书库上加一份带 PDF 原件的书（三页的最小 PDF + MinerU 式 content_list），
// 和一本新格式目录（10 列、带 PDF 页、标题里有 “ | ”）的小书。每个测试一个临时目录。
import { execFileSync } from 'node:child_process';
import { cp, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { SAMPLE_DIR, createApp, type App } from '../../src/core/app.ts';
import { FakeModel, type FakeOptions } from '../../src/core/model/fake.ts';
import { TOKEN } from './http.ts';
import { tempDir } from './tmp.ts';

export const SAMPLE_BOOK = '力学入门样例';
export const SECOND_BOOK = '线性代数小样 ';
/** 带尾空格的书名（真书库里有）：模型写出处时常把空格丢掉。 */
export const SECOND_BOOK_TRIMMED = SECOND_BOOK.trim();

/** 有 pdftoppm 才能测渲染。 */
export function hasPdftoppm(): boolean {
  try {
    execFileSync('pdftoppm', ['-v'], { stdio: 'ignore' });
    return true;
  } catch (err) {
    // 命令在、-v 以非 0 退出也算有；找不到命令才算没有
    return (err as NodeJS.ErrnoException).code !== 'ENOENT';
  }
}

/** 最小的 n 页 PDF（每页一行 ASCII 字，页面 300×400 pt）；交叉引用表按真实偏移写，工具都认。 */
export function minimalPdf(pageTexts: string[]): Buffer {
  const objs: string[] = [];
  const n = pageTexts.length;
  objs.push('<< /Type /Catalog /Pages 2 0 R >>');
  const kids = pageTexts.map((_, i) => `${String(4 + i * 2)} 0 R`).join(' ');
  objs.push(`<< /Type /Pages /Kids [${kids}] /Count ${String(n)} >>`);
  objs.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  pageTexts.forEach((t, i) => {
    const content = `BT /F1 24 Tf 30 200 Td (${t}) Tj ET`;
    objs.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 400] /Resources << /Font << /F1 3 0 R >> >> /Contents ${String(5 + i * 2)} 0 R >>`,
    );
    objs.push(`<< /Length ${String(content.length)} >>\nstream\n${content}\nendstream`);
  });
  let out = '%PDF-1.4\n';
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(out.length);
    out += `${String(i + 1)} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${String(objs.length + 1)}\n0000000000 65535 f \n`;
  for (const off of offsets) out += `${String(off).padStart(10, '0')} 00000 n \n`;
  out += `trailer\n<< /Size ${String(objs.length + 1)} /Root 1 0 R >>\nstartxref\n${String(xref)}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}

/** 样例书的第 3 行（见 ch01/sec-1.2.md）在“原件”上的块：第 2 页（page_idx 1）。 */
export const LOCATED_LINE = 3;
export const LOCATED_BBOX = [100, 200, 900, 260];

/** 建测试书库，返回书库根目录。样例书挂上三页 PDF 页段 p1-3；第二本是新格式目录的小书，没有原件。 */
export async function makeLibrary(): Promise<string> {
  const root = await tempDir();
  await cp(join(SAMPLE_DIR, '书库'), root, { recursive: true });
  const seg = join(root, SAMPLE_BOOK, 'p1-3');
  await mkdir(seg, { recursive: true });
  await writeFile(
    join(root, SAMPLE_BOOK, 'source.json'),
    JSON.stringify({
      file: '样例.pdf',
      parts: { 'p1-3': { page_ranges: '1-3', first_page: 1 } },
    }),
  );
  await writeFile(
    join(seg, 'abc_origin.pdf'),
    minimalPdf(['Sample page one', 'Sample page two', 'Sample page three']),
  );
  await writeFile(
    join(seg, 'abc_content_list.json'),
    JSON.stringify([
      { type: 'text', text: '位移告诉我们物体挪了多少', bbox: [50, 50, 500, 90], page_idx: 0 },
      {
        type: 'text',
        text: '位移告诉我们物体挪了多少，没告诉我们挪得多快。用位移除以所用的时间，得到平均速度：',
        bbox: LOCATED_BBOX,
        page_idx: 1,
      },
      {
        type: 'equation',
        text: '$$\\bar v = \\frac{\\Delta x}{\\Delta t}$$',
        bbox: [300, 300, 700, 380],
        page_idx: 1,
      },
    ]),
  );
  const second = join(root, SECOND_BOOK, 'm07');
  await mkdir(join(second, 'ch01'), { recursive: true });
  await writeFile(
    join(second, 'index.md'),
    [
      '# M07 索引：线性代数小样',
      '',
      '> 新格式目录。',
      '',
      '| 编号 | 类型 | 标题 | 页 | 文件 | 层级 | PDF 页 | 原文 | 定位 | 说明 |',
      '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
      '| 1 | ch | Vectors | p.1 | — | 1 |  | p1-5:L1–2 | 编号+标题 | 无独立正文（见下级条目） |',
      '| 1.1 | sec | 　Combinations | p.2–10 | `ch01/sec-1.1.md` | 2 | 12–20 | p1-5:L3–9 | 编号+标题 |  |',
      '| 1.2 | sec | 　Norms $\\| x \\|$ and | K | = 1 | p.11–21 | `ch01/sec-1.2.md` | 2 | 21–31 | p1-5:L10–19 | 编号+标题 |  |',
      '',
    ].join('\n'),
  );
  await writeFile(
    join(second, 'ch01', 'sec-1.1.md'),
    '# 1.1 Combinations（p.2–10 · PDF 12–20）\n\nA linear combination of vectors uses scalars.\n\nThe nullspace is a subspace.\n',
  );
  await writeFile(
    join(second, 'ch01', 'sec-1.2.md'),
    '# 1.2 Norms\n\nThe norm of a vector measures its length.\n\nA unit vector has norm one; the nullspace has no norm of its own.\n',
  );
  return root;
}

export async function startLibraryApp(
  opts: {
    library?: string;
    dataRoot?: string;
    fake?: FakeOptions;
  } = {},
): Promise<{ app: App; library: string; fake: FakeModel; dataRoot: string }> {
  const library = opts.library ?? (await makeLibrary());
  const dataRoot = opts.dataRoot ?? (await tempDir());
  const fake = new FakeModel(opts.fake ?? {});
  const app = await createApp({
    dataRoot,
    model: fake,
    token: TOKEN,
    port: 0,
    library,
  });
  return { app, library, fake, dataRoot };
}

export async function fetchRaw(app: App, path: string): Promise<Response> {
  return fetch(`${app.server.url}/api${path}`, { headers: { authorization: `Bearer ${TOKEN}` } });
}
