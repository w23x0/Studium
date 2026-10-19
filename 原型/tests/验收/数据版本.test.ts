// 测（W7 新版，取代 W1 的同名测试）：改名后数据目录不兼容，data-version 升到 3；W1–W6 时期（值 2）的目录、更早没有版本文件的目录
// 启动都报错（提示删 var/ 重来），不留锁、不改原目录。依据：工单 README §2.8“数据不兼容”；工单 W7 §4.4。
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp, type App } from '../../src/core/app.ts';
import { FakeModel } from '../../src/core/model/fake.ts';
import { getJson, TOKEN } from '../helpers/http.ts';
import { tempDir } from '../helpers/tmp.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

function start(dataRoot: string): Promise<App> {
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

/** 造一个旧数据目录：一个会话正本（用的是旧种类名），可选写版本文件。 */
async function oldDataDir(version?: string): Promise<string> {
  const root = await tempDir();
  await mkdir(join(root, 'sessions'), { recursive: true });
  await writeFile(
    join(root, 'sessions', 'old-nav.jsonl'),
    `${JSON.stringify({
      type: 'session_opened',
      at: '2026-10-10T00:00:00.000Z',
      sessionId: 'old-nav',
      kind: 'm05',
      title: '出选择卡',
    })}\n`,
  );
  if (version !== undefined) await writeFile(join(root, 'data-version'), version);
  return root;
}

describe('数据版本 3', () => {
  it('新目录启动后写 data-version = 3；重启照常', async () => {
    const root = await tempDir();
    const a = await start(root);
    const first = (await getJson<{ mainSessionId: string }>(a, '/project')).mainSessionId;
    expect((await readFile(join(root, 'data-version'), 'utf8')).trim(), '写了版本 3').toBe('3');
    await a.close();
    const b = await start(root);
    apps.push(b);
    expect((await getJson<{ mainSessionId: string }>(b, '/project')).mainSessionId).toBe(first);
    expect((await readFile(join(root, 'data-version'), 'utf8')).trim()).toBe('3');
  });

  it('data-version 是 2（W1–W6 时期的数据）：启动报错，提示删 var/ 重来，不留锁、不改版本文件', async () => {
    const root = await oldDataDir('2\n');
    await expect(start(root), '值 2 的旧数据应报错').rejects.toThrow(/旧版本/);
    await expect(start(root), '报错里提示删 var/').rejects.toThrow(/var\//);
    expect(await exists(join(root, '.lock')), '报错退出不留数据目录锁').toBe(false);
    expect(await readFile(join(root, 'data-version'), 'utf8'), '不替旧目录改版本号').toBe('2\n');
  });

  it('有会话、没有 data-version：启动报错', async () => {
    const root = await oldDataDir();
    await expect(start(root)).rejects.toThrow(/旧版本/);
  });
});
