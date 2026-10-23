// 数据目录：sessions/<id>.jsonl 是正本；.lock 保证同一时刻只有一个核心进程在写。
import { cp, mkdir, open, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { isNotFound } from './session-log.ts';

/** 当前数据目录的版本（`原型/CLAUDE.md`「存放处」）；单子与记录的形状变了就加一，同时在 MIGRATIONS 里写迁移。 */
export const DATA_VERSION = '3';

/**
 * 数据迁移：键 = 旧版本，值 = 把目录从这一版改到下一版（版本号加一）。
 * 10-23 起正式使用：改了记录形状就在这里加一步，不再让学习者删数据重来。
 */
const MIGRATIONS: Record<string, (root: string) => Promise<void>> = {};

async function sessionFileNames(root: string): Promise<string[]> {
  try {
    return (await readdir(join(root, 'sessions'))).filter((n) => n.endsWith('.jsonl'));
  } catch (err) {
    if (isNotFound(err)) return [];
    throw err;
  }
}

async function versionOf(root: string): Promise<string | undefined> {
  try {
    return (await readFile(join(root, 'data-version'), 'utf8')).trim();
  } catch (err) {
    if (isNotFound(err)) return undefined;
    throw err;
  }
}

/**
 * 启动时（取锁之后）把数据目录升到当前版本：空目录直接写版本；旧版本先整份备份到
 * `<数据>-备份/<时间>-v<旧版本>/`，再按 MIGRATIONS 一步步升；缺哪一步就报错、不动数据。
 */
export async function upgradeDataDir(root: string): Promise<void> {
  const version = await versionOf(root);
  if (version !== DATA_VERSION && (await sessionFileNames(root)).length > 0) {
    if (Number(version) > Number(DATA_VERSION)) {
      throw new Error(
        `数据目录 ${root} 是第 ${String(version)} 版，比这份程序新：先更新程序（git pull）`,
      );
    }
    const steps: ((root: string) => Promise<void>)[] = [];
    for (let v = version ?? '0'; v !== DATA_VERSION; v = String(Number(v) + 1)) {
      const step = MIGRATIONS[v];
      if (step === undefined) {
        throw new Error(
          `数据目录 ${root} 是第 ${version ?? '0'} 版，程序没有从第 ${v} 版往上升的迁移；数据没动。换回旧版程序，或换一个 STUDIUM_DATA`,
        );
      }
      steps.push(step);
    }
    const backup = join(
      `${root.replace(/[/\\]+$/, '')}-备份`,
      `${new Date().toISOString().replace(/[:.]/g, '-')}-v${version ?? '0'}`,
    );
    await cp(root, backup, { recursive: true, filter: (p) => basename(p) !== '.lock' });
    for (const step of steps) await step(root);
    console.log(
      `数据目录已从第 ${version ?? '0'} 版升到第 ${DATA_VERSION} 版，升级前的备份在 ${backup}`,
    );
  }
  await writeFile(join(root, 'data-version'), `${DATA_VERSION}\n`);
}

/** 会话 id 只由字母、数字、`_`、`-` 组成（也是文件名）。 */
export function isSessionId(id: string): boolean {
  return /^[A-Za-z0-9_-]+$/.test(id);
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
    if (!isSessionId(sessionId)) throw new Error(`会话 id 不合法：${sessionId}`);
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
