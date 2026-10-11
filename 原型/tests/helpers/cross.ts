// 批 10b（跨资料线索 / 来源说明 / 跨领域闭环）的测试夹具：两个领域（大学物理、线性代数）、物理里有两本书讲同一处，
// 加一套 M08（点的锚点跨书、名字相同、检索词相同）。每个测试一个临时目录。
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createApp, type App } from '../../src/core/app.ts';
import type { FakeModel } from '../../src/core/model/fake.ts';
import { TOKEN } from './http.ts';
import { SAMPLE_BOOK, SECOND_BOOK } from './library.ts';
import { makeNestedLibrary, PHYSICS } from './scope.ts';
import { tempDir } from './tmp.ts';

/** 物理里的第二本书。 */
export const PHYS_B = '力学讲义小样';
export { SAMPLE_BOOK as PHYS_A, SECOND_BOOK as ALG };

/** 嵌套书库（大学物理/力学/{力学入门样例, 力学讲义小样}、线性代数/线性代数小样 ）。 */
export async function makeCrossLibrary(): Promise<string> {
  const root = await makeNestedLibrary();
  const m07 = join(root, PHYSICS, PHYS_B, 'm07');
  await mkdir(join(m07, 'ch01'), { recursive: true });
  await mkdir(join(m07, 'ch02'), { recursive: true });
  await mkdir(join(m07, 'ch03'), { recursive: true });
  await writeFile(
    join(m07, 'index.md'),
    [
      '# M07 索引：力学讲义小样',
      '',
      '| 编号 | 类型 | 标题 | 页 | 文件 | 节内例题 |',
      '| --- | --- | --- | --- | --- | --- |',
      '| 1.1 | sec | 位移 | p.1 | `ch01/sec-1.md` | 例 1 |',
      '| 2.1 | sec | 速度 | p.4 | `ch02/sec-2.md` |  |',
      '| 3 | prob | 第 3 章习题 | p.9 | `ch03/prob-3.md` |  |',
      '',
    ].join('\n'),
  );
  await writeFile(
    join(m07, 'ch01', 'sec-1.md'),
    '# 1.1 位移\n\n位移是位置的变化量，有方向。\n\n例 1 物体从 2 米走到 5 米，位移是多少。\n',
  );
  await writeFile(join(m07, 'ch02', 'sec-2.md'), '# 2.1 速度\n\n速度是位移对时间的变化率。\n');
  await writeFile(join(m07, 'ch03', 'prob-3.md'), '# 第 3 章习题\n\n1. 位移和路程有什么不同？\n');
  return root;
}

interface P {
  id: string;
  name: string;
  keys?: string[];
  anchors?: { book: string; file: string; quote: string }[];
  source?: string;
}

export const CROSS_POINTS: P[] = [
  {
    id: 'p-disp',
    name: '位移',
    anchors: [
      { book: SAMPLE_BOOK, file: 'ch01/sec-1.1.md', quote: '位置的变化量叫**位移**' },
      { book: PHYS_B, file: 'ch01/sec-1.md', quote: '位移是位置的变化量' },
    ],
  },
  {
    id: 'p-vel-a',
    name: '速度',
    anchors: [{ book: SAMPLE_BOOK, file: 'ch01/sec-1.2.md', quote: '平均速度' }],
  },
  {
    id: 'p-vel-b',
    name: '速度',
    anchors: [{ book: PHYS_B, file: 'ch02/sec-2.md', quote: '速度是位移对时间的变化率' }],
  },
  {
    id: 'p-force',
    name: '力',
    anchors: [{ book: SAMPLE_BOOK, file: 'ch02/sec-2.1.md', quote: '力' }],
  },
  {
    id: 'p-sup',
    name: '力的叠加',
    keys: ['叠加', 'superposition'],
    anchors: [{ book: SAMPLE_BOOK, file: 'ch02/sec-2.2.md', quote: '合力' }],
  },
  {
    id: 'p-vec',
    name: '向量',
    anchors: [{ book: SECOND_BOOK.trim(), file: 'ch01/sec-1.1.md', quote: 'vectors' }],
  },
  {
    id: 'p-comb',
    name: '线性组合',
    keys: ['linear combination', '叠加'],
    anchors: [
      {
        book: SECOND_BOOK.trim(),
        file: 'ch01/sec-1.1.md',
        quote: 'A linear combination of vectors uses scalars.',
      },
    ],
  },
  // 没有原文锚点的点（模型补的）：认不出领域
  { id: 'p-orphan', name: '孤点', source: '模型补的', anchors: [] },
];

export const CROSS_CLAUSES = [
  { id: 'c-comb', from: ['p-vec'], to: 'p-comb' },
  { id: 'c-sup', from: ['p-force'], to: 'p-sup' },
  { id: 'c-vel-b', from: ['p-disp'], to: 'p-vel-b' },
  { id: 'c-orphan', from: ['p-force'], to: 'p-orphan' },
];

/** 写 CROSS_POINTS / CROSS_CLAUSES 到一个 M08 目录。 */
export async function writeCrossM08(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, 'points.jsonl'),
    CROSS_POINTS.map((p) =>
      JSON.stringify({
        id: p.id,
        name: p.name,
        sentence: `${p.name}是什么`,
        anchors: p.anchors ?? [],
        source: p.source ?? '书给的',
        ...(p.keys !== undefined ? { keys: p.keys } : {}),
      }),
    ).join('\n') + '\n',
  );
  await writeFile(
    join(dir, 'clauses.jsonl'),
    CROSS_CLAUSES.map((c) =>
      JSON.stringify({
        ...c,
        text: `从 ${c.from.join('、')} 到 ${c.to}`,
        anchors: [],
        source: '书给的',
      }),
    ).join('\n') + '\n',
  );
}

/** 往数据目录里预先放一条 M09 形成记录（让某个点“合上过”）；要在 createApp 之前调。 */
export async function seedKnown(dataRoot: string, points: string[]): Promise<void> {
  const dir = join(dataRoot, 'knowledge', 'm09');
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, 'records.jsonl'),
    points
      .map((point) =>
        JSON.stringify({
          id: `f-${point}`,
          at: '2026-09-01T00:00:00.000Z',
          loopSessionId: 'loop-seed',
          newPoint: point,
          clause: 'c-seed',
          startPoints: [],
          understanding: '会了',
          process: '略',
          unmet: '无',
          evidenceStrength: '仅当场、独立',
          evidenceLines: [],
          model: 'seed',
        }),
      )
      .join('\n') + '\n',
  );
}

export async function bootCross(opts: {
  model: FakeModel;
  known?: string[];
  m08Dir?: string;
}): Promise<{ app: App; mainId: string; dataRoot: string; library: string }> {
  const library = await makeCrossLibrary();
  const dataRoot = await tempDir();
  const m08Dir = opts.m08Dir ?? join(await tempDir(), 'm08');
  if (opts.m08Dir === undefined) await writeCrossM08(m08Dir);
  if ((opts.known ?? []).length > 0) await seedKnown(dataRoot, opts.known ?? []);
  const app = await createApp({
    dataRoot,
    model: opts.model,
    token: TOKEN,
    port: 0,
    library,
    m08Dir,
  });
  return { app, mainId: await app.studium.ensureMain(), dataRoot, library };
}
