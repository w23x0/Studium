// M08 读取：样例（只有基本字段）照旧能读；资料线产出（书库处理/studium/m08.py）多出的字段能读、能检索、会显示。
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { M08 } from '../src/core/knowledge/m08.ts';
import { tempDir } from './helpers/tmp.ts';

const SAMPLE = join(import.meta.dirname, '..', '样例', 'm08');

const anchor = {
  book: '某书',
  file: 'ch03/sec-3.4.md',
  quote: 'The columns of A are linearly independent when the only solution to Ax = 0 is x = 0.',
  line: 39,
  page: 174,
  bbox: [167, 88, 845, 142],
};

function must<T>(x: T | undefined): T {
  if (x === undefined) throw new Error('缺');
  return x;
}

async function realFormat(): Promise<string> {
  const dir = await tempDir();
  await mkdir(dir, { recursive: true });
  const points = [
    {
      id: 'P48',
      name: '线性无关（组合定义）',
      sentence: '只有全零系数的组合才得到零向量。',
      anchors: [],
      source: '模型补的',
      keys: ['linear independence'],
      scope: '范围内',
    },
    {
      id: 'P49',
      name: '线性无关（零空间刻画）',
      sentence: '以向量为列的矩阵 A 满足 N(A) = {0}。',
      anchors: [anchor],
      source: '书给的',
      keys: ['independent columns', 'N(A)'],
      scope: '范围内',
      split_of: 'P48',
      cautions: [{ text: '列无关说的是列，不是行。', anchors: [anchor] }],
      gen: { prompt: 'm08_generate@abc', model: 'claude-opus-5-5' },
    },
    {
      id: 'P27',
      name: '零空间',
      sentence: 'Ax = 0 的全部解。',
      anchors: [],
      source: '未审',
      scope: '前置',
    },
  ];
  const clauses = [
    {
      id: 'C59',
      from: ['P48', 'P27'],
      to: 'P49',
      text: '把组合写成 Ac，只有平凡零组合就是 Ac = 0 只有零解。',
      anchors: [anchor],
      source: '书给的',
      notes: ['ch03/sec-3.4.md：书直接拿零空间下定义'],
      audit: ['m08_audit@def · claude-opus-5-5'],
    },
  ];
  await writeFile(
    join(dir, 'points.jsonl'),
    points.map((p) => JSON.stringify(p)).join('\n') + '\n',
  );
  await writeFile(
    join(dir, 'clauses.jsonl'),
    clauses.map((c) => JSON.stringify(c)).join('\n') + '\n',
  );
  return dir;
}

describe('M08 读取', () => {
  it('样例只有基本字段，照旧能读、能描述', async () => {
    const m08 = await M08.load(SAMPLE);
    expect(m08.points.size).toBeGreaterThan(0);
    const p = m08.points.get('p-displacement');
    expect(p && m08.describePoint(p)).toContain('位移');
    expect(m08.outline()).toContain('p-displacement');
  });

  it('资料线产出的字段：检索词能搜到，原件页与行号、拆分来源、书里提醒都显示', async () => {
    const m08 = await M08.load(await realFormat());
    expect(m08.search('independent columns').map((p) => p.id)).toEqual(['P49']);
    const text = m08.describePoint(must(m08.points.get('P49')));
    expect(text).toContain('PDF 第 174 页');
    expect(text).toContain('文件第 39 行附近');
    expect(text).toContain('P48「线性无关（组合定义）」');
    expect(text).toContain('书里提醒：列无关说的是列');
    expect(m08.describePoint(must(m08.points.get('P27')))).toContain('（未审，前置）');
    expect(m08.describeClause(must(m08.clauses.get('C59')))).toContain('审核注：');
  });

  it('提纲只给非书给的打标', async () => {
    const m08 = await M08.load(await realFormat());
    const outline = m08.outline();
    expect(outline).toContain('P48「线性无关（组合定义）」（模型补的）');
    expect(outline).toContain('P49「线性无关（零空间刻画）」：');
    expect(outline).toContain('P27「零空间」（未审）');
  });
});
