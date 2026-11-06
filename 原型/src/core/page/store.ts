// 按块按指纹的存放处（`docs/设计/实现选型.md`「屏幕存储」）：每块按内容指纹存一份（同样内容只存一份），
// 清单也按指纹存。正本里只记第几版与清单指纹；这里只存内容，不记“第几”。
// 存在 `<数据>/screens/<学习 id>/`，不在任何沙盒、监视或自动快照的范围里；第一版不回收。
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { isSessionId } from '../log/data-dir.ts';
import { isNotFound } from '../log/session-log.ts';

/** 一块最大多少字节（模型写的整块代码；超过多半是塞了不该塞的东西，如大段数据）。 */
export const MAX_BLOCK_BYTES = 256 * 1024;

export class PageStore {
  constructor(private readonly root: string) {}

  private dir(loopId: string, kind: '块' | '清单'): string {
    if (!isSessionId(loopId)) throw new Error(`不是会话编号：${loopId}`);
    return join(this.root, loopId, kind);
  }

  /** 存一块（组件的 HTML），返回它的内容指纹；同样内容已存过就不再写。 */
  async putBlock(loopId: string, text: string): Promise<string> {
    const hash = fingerprint(text);
    await writeOnce(join(this.dir(loopId, '块'), `${hash}.html`), text);
    return hash;
  }

  async block(loopId: string, hash: string): Promise<string> {
    return readFile(join(this.dir(loopId, '块'), `${checkHash(hash)}.html`), 'utf8');
  }

  async putManifest(loopId: string, m: object): Promise<string> {
    const text = JSON.stringify(m);
    const hash = fingerprint(text);
    await writeOnce(join(this.dir(loopId, '清单'), `${hash}.json`), text);
    return hash;
  }

  /** 读一张清单；形状由调用方说。 */
  async manifest<T>(loopId: string, hash: string): Promise<T> {
    const text = await readFile(join(this.dir(loopId, '清单'), `${checkHash(hash)}.json`), 'utf8');
    return JSON.parse(text) as T;
  }
}

export function fingerprint(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function checkHash(hash: string): string {
  if (!/^[0-9a-f]{64}$/.test(hash)) throw new Error(`不是内容指纹：${hash}`);
  return hash;
}

/** 按指纹存的文件内容永远不变：已有就不写；没有就先写临时文件再改名（不留半个文件）。 */
async function writeOnce(path: string, text: string): Promise<void> {
  try {
    await readFile(path);
    return;
  } catch (err) {
    if (!isNotFound(err)) throw err;
  }
  await mkdir(join(path, '..'), { recursive: true });
  const tmp = `${path}.${String(process.pid)}.tmp`;
  await writeFile(tmp, text, 'utf8');
  await rename(tmp, path);
}
