import { appendFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { tempDir } from '../../../tests/helpers/tmp.ts';
import { DataDir } from '../log/data-dir.ts';
import { DerivedIndex } from './derived-index.ts';

const line = (o: object) => JSON.stringify(o) + '\n';
const opened = (id: string, at: string) =>
  line({ type: 'session_opened', at, sessionId: id, kind: 'main', title: '主对话' });

async function dataWithTwoSessions() {
  const dir = await DataDir.acquire(await tempDir());
  await writeFile(
    dir.sessionPath('a'),
    opened('a', '2026-10-01T00:00:00Z') +
      line({ type: 'user_message', at: '2026-10-01T00:01:00Z', text: '牛顿第二定律' }),
  );
  await writeFile(dir.sessionPath('b'), opened('b', '2026-10-02T00:00:00Z'));
  return dir;
}

describe('DerivedIndex', () => {
  it('从正本建出会话列表（新的在前）', async () => {
    const dir = await dataWithTwoSessions();
    const idx = await DerivedIndex.open(join(dir.root, 'index.sqlite'), dir);
    expect(idx.listSessions().map((s) => s.sessionId)).toEqual(['b', 'a']);
    idx.close();
  });

  it('索引落后于正本时补齐', async () => {
    const dir = await dataWithTwoSessions();
    const path = join(dir.root, 'index.sqlite');
    (await DerivedIndex.open(path, dir)).close();
    await appendFile(
      dir.sessionPath('b'),
      line({ type: 'user_message', at: '2026-10-02T00:01:00Z', text: '加速度' }),
    );
    const idx = await DerivedIndex.open(path, dir);
    expect(idx.indexedLines('b')).toBe(2);
    expect(idx.search('加速度')).toEqual([{ sessionId: 'b', line: 2, text: '加速度' }]);
    idx.close();
  });

  it('索引文件坏了就删掉重建', async () => {
    const dir = await dataWithTwoSessions();
    const path = join(dir.root, 'index.sqlite');
    await writeFile(path, '这不是 sqlite');
    const idx = await DerivedIndex.open(path, dir);
    expect(idx.listSessions()).toHaveLength(2);
    idx.close();
  });

  it('检索把 % _ 当普通字符', async () => {
    const dir = await dataWithTwoSessions();
    const idx = await DerivedIndex.open(join(dir.root, 'index.sqlite'), dir);
    expect(idx.search('%')).toEqual([]);
    expect(idx.search('第二')).toHaveLength(1);
    idx.close();
  });
});
