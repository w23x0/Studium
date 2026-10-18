// 数据目录：sessions/<id>.jsonl 是正本；.lock 保证同一时刻只有一个核心进程在写。
import { mkdir, open, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { isNotFound } from './session-log.ts';

/** 当前数据目录的版本（工单 W1「数据版本」）；单子与记录的形状变了就加一，旧目录不能直接开。 */
export const DATA_VERSION = '2';

async function sessionFileNames(root: string): Promise<string[]> {
  try {
    return (await readdir(join(root, 'sessions'))).filter((n) => n.endsWith('.jsonl'));
  } catch (err) {
    if (isNotFound(err)) return [];
    throw err;
  }
}

/**
 * 启动核对（取锁之前）：有会话正本、而 data-version 不是当前版本 → 报错。
 * 空目录 / 新目录照常开。
 */
export async function checkDataVersion(root: string): Promise<void> {
  if ((await sessionFileNames(root)).length === 0) return;
  let version: string | undefined;
  try {
    version = (await readFile(join(root, 'data-version'), 'utf8')).trim();
  } catch (err) {
    if (!isNotFound(err)) throw err;
  }
  if (version !== DATA_VERSION) {
    throw new Error(
      `数据目录 ${root} 是旧版本的（单子与记录的形状变了，旧记录读不了）：删掉 var/ 重来，或换一个 STUDIUM_DATA`,
    );
  }
}

/** 取锁之后写版本文件；已经有就不动。 */
export async function writeDataVersion(root: string): Promise<void> {
  try {
    await writeFile(join(root, 'data-version'), `${DATA_VERSION}\n`, { flag: 'wx' });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
  }
}

export class DataDir {
  private constructor(
    readonly root: string,
    private readonly lockPath: string,
  ) {}

  static async acquire(root: string): Promise<DataDir> {
    await mkdir(join(root, 'sessions'), { recursive: true });
    const lockPath = join(root, '.lock');
    try {
      const h = await open(lockPath, 'wx');
      await h.writeFile(String(process.pid));
      await h.close();
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
      const pid = Number(await readFile(lockPath, 'utf8'));
      if (Number.isInteger(pid) && pid > 0 && isAlive(pid)) {
        throw new Error(`数据目录 ${root} 已被进程 ${pid} 占用；先关掉它，或换 STUDIUM_DATA`, {
          cause: err,
        });
      }
      // 上次的进程已不在：接管锁
      await rm(lockPath);
      return DataDir.acquire(root);
    }
    return new DataDir(root, lockPath);
  }

  sessionPath(sessionId: string): string {
    if (!/^[A-Za-z0-9_-]+$/.test(sessionId)) throw new Error(`会话 id 不合法：${sessionId}`);
    return join(this.root, 'sessions', `${sessionId}.jsonl`);
  }

  async listSessionIds(): Promise<string[]> {
    try {
      const names = await readdir(join(this.root, 'sessions'));
      return names.filter((n) => n.endsWith('.jsonl')).map((n) => n.slice(0, -'.jsonl'.length));
    } catch (err) {
      if (isNotFound(err)) return [];
      throw err;
    }
  }

  async release(): Promise<void> {
    await rm(this.lockPath, { force: true });
  }
}

function isAlive(pid: number): boolean {
  if (pid === process.pid) return true;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    // EPERM：进程在但不归我们管，也算活着
    return (err as NodeJS.ErrnoException).code === 'EPERM';
  }
}
