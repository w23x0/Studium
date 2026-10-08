import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach } from 'vitest';

const dirs: string[] = [];

/** 每个测试一个临时数据目录，测完删掉。 */
export async function tempDir(): Promise<string> {
  const d = await mkdtemp(join(tmpdir(), 'studium-test-'));
  dirs.push(d);
  return d;
}

afterEach(async () => {
  for (const d of dirs.splice(0)) await rm(d, { recursive: true, force: true });
});
