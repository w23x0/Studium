// 测：数据目录写 data-version（值 2）；旧数据（有会话、没有 data-version 或值不对）启动报错、提示删 var/ 重来，且不留锁。
// 依据：工单 README §2.1（旧数据目录不兼容）；工单 W1「数据版本」。
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp, type App } from '../../src/core/app.ts';
import { FakeModel } from '../../src/core/model/fake.ts';
import { TOKEN } from '../helpers/http.ts';
import { tempDir } from '../helpers/tmp.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

function boot(dataRoot: string): Promise<App> {
  return createApp({ dataRoot, model: new FakeModel(), token: TOKEN, port: 0 });
}

async function exists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

/** 造一个旧数据目录：有一个会话正本。 */
async function oldDataDir(version?: string): Promise<string> {
  const root = await tempDir();
  await mkdir(join(root, 'sessions'), { recursive: true });
  await writeFile(
    join(root, 'sessions', 'old-main.jsonl'),
    JSON.stringify({
      type: 'session_opened',
      at: '2026-10-01T00:00:00.000Z',
      sessionId: 'old-main',
      kind: 'main',
      title: '旧项目',
    }) + '\n',
  );
  if (version !== undefined) await writeFile(join(root, 'data-version'), version);
  return root;
}

describe('数据版本', () => {
  it('新目录启动后写 data-version = 2；重启照常', async () => {
    const root = await tempDir();
    const a = await boot(root);
    expect((await readFile(join(root, 'data-version'), 'utf8')).trim(), '写了版本 2').toBe('2');
    await a.close();
    const b = await boot(root);
    apps.push(b);
    expect((await readFile(join(root, 'data-version'), 'utf8')).trim()).toBe('2');
  });

  it('有会话、没有 data-version：启动报错（提示删 var/ 重来），不留锁', async () => {
    const root = await oldDataDir();
    await expect(boot(root), '旧数据应报错').rejects.toThrow(/旧版本/);
    await expect(boot(root), '报错里提示删 var/').rejects.toThrow(/var\//);
    expect(await exists(join(root, '.lock')), '报错退出不留数据目录锁').toBe(false);
  });

  it('有会话、data-version 不是 2：启动报错', async () => {
    const root = await oldDataDir('1\n');
    await expect(boot(root)).rejects.toThrow(/旧版本/);
  });
});
