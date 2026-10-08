// 数据目录：sessions/<id>.jsonl 是正本；.lock 保证同一时刻只有一个核心进程在写。
import { mkdir, open, readdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { isNotFound } from './session-log.ts';

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
