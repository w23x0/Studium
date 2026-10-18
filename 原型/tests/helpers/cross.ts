// 批 10b（来源说明 / 跨领域闭环）的测试夹具：两个领域（大学物理、线性代数）、物理里有两本书讲同一处。
// 每个测试一个临时目录。
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
}): Promise<{ app: App; mainId: string; dataRoot: string; library: string }> {
  const library = await makeCrossLibrary();
  const dataRoot = await tempDir();
  if ((opts.known ?? []).length > 0) await seedKnown(dataRoot, opts.known ?? []);
  const app = await createApp({
    dataRoot,
    model: opts.model,
    token: TOKEN,
    port: 0,
    library,
  });
  return { app, mainId: await app.studium.ensureMain(), dataRoot, library };
}
