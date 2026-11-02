// 数据目录：sessions/<id>.jsonl 是正本；.lock 保证同一时刻只有一个核心进程在写。
import { randomBytes } from 'node:crypto';
import {
  appendFile,
  cp,
  mkdir,
  open,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import type { MaterialSource } from '../../shared/protocol.ts';
import type { Import } from '../../shared/protocol-learned.ts';
import { freshMaterialId, originalFingerprint } from '../knowledge/materials.ts';
import { isNotFound } from './session-log.ts';

/** 当前数据目录的版本（`原型/CLAUDE.md`「存放处」）；单子与记录的形状变了就加一，同时在 MIGRATIONS 里写迁移。 */
export const DATA_VERSION = '4';

/**
 * 数据迁移：键 = 旧版本，值 = 把目录从这一版改到下一版（版本号加一）。
 * 10-23 起正式使用：改了记录形状就在这里加一步，不再让学习者删数据重来。
 */
const MIGRATIONS: Record<string, (root: string) => Promise<void>> = {
  '3': mergeMaterialsAndImports,
};

/**
 * 3 → 4（W11，记录/资料.md「存在一处、按归属读」）：资料与外部导入并成一处 `<数据>/资料/<资料 id>/`。
 * - `projects/<主对话 id>/资料/<id>/`：先在原地把 source.json 补上归属（只归那个项目）与从哪个项目导入，
 *   再整份改名过去；读不到 source.json 的那份不动（报一句），只删已经搬空的目录。
 * - `learned/imports/<id>/` 的文件型导入（笔记、对话记录）：在 `资料/.迁移-<旧 id>/` 里建好一份资料（原件照搬进
 *   `原件/`，转好的 md 进 `正文/`，归学习者、标渠道），一次改名过去；`imports.jsonl` 只追加：一条删掉旧的、
 *   一条指向新资料的新导入；最后删旧目录。
 * 中途断了重跑：已搬走的不在原处；`imports.jsonl` 里已有 `{removed: 旧 id}` 的不再建；已改名过去、还没追加指针的
 * 按 source.json 的 origin（`learned/imports/<旧 id>`）认出来，只补指针。正本（sessions）不动。
 */
async function mergeMaterialsAndImports(root: string): Promise<void> {
  const target = join(root, '资料');
  await mkdir(target, { recursive: true });
  // 上次没改名过去的半成品（隐藏目录，扫描不认）：清掉重建
  for (const n of await entryNames(target)) {
    if (n.startsWith('.迁移-')) await rm(join(target, n), { recursive: true, force: true });
  }
  const taken = new Set(await dirNames(target));
  for (const main of await dirNames(join(root, 'projects'))) {
    const pdir = join(root, 'projects', main, '资料');
    for (const old of await dirNames(pdir)) {
      const from = join(pdir, old);
      let src: MaterialSource & { copiedFrom?: unknown };
      try {
        src = JSON.parse(await readFile(join(from, 'source.json'), 'utf8')) as typeof src;
      } catch (err) {
        if (!isNotFound(err) && !(err instanceof SyntaxError)) throw err;
        console.error(`迁移：${from} 读不到 source.json，原样留着没搬`);
        continue;
      }
      const id = taken.has(src.id) ? freshMaterialId(src.id, taken) : src.id;
      taken.add(id);
      const next: MaterialSource = {
        ...src,
        id,
        owner: { kind: 'project', projects: [main] },
        importedFrom: main,
      };
      delete (next as { copiedFrom?: unknown }).copiedFrom;
      // 先在原地写好，再改名：断在中间，原处那份已带归属，重跑照样搬
      await writeFile(join(from, 'source.json'), `${JSON.stringify(next, null, 2)}\n`);
      await rename(from, join(target, id));
    }
    if ((await entryNames(pdir)).length === 0) await rm(pdir, { recursive: true, force: true });
  }
  const list = join(root, 'learned', 'imports.jsonl');
  let raw = '';
  try {
    raw = await readFile(list, 'utf8');
  } catch (err) {
    if (!isNotFound(err)) throw err;
  }
  type Line =
    (Omit<Import, 'ref'> & { ref: Import['ref'] | { file: string } }) | { removed: string };
  const lines = raw
    .split('\n')
    .filter((l) => l.trim() !== '')
    .map((l) => JSON.parse(l) as Line);
  const removed = new Set(lines.flatMap((l) => ('removed' in l ? [l.removed] : [])));
  // 已改名过去的（上次断在追加指针之前）：旧导入 id → 资料 id
  const done = new Map<string, string>();
  for (const id of taken) {
    try {
      const src = JSON.parse(
        await readFile(join(target, id, 'source.json'), 'utf8'),
      ) as MaterialSource;
      const m = /^learned\/imports\/(.+)$/.exec(src.origin);
      if (m?.[1] !== undefined) done.set(m[1], id);
    } catch (err) {
      if (!isNotFound(err) && !(err instanceof SyntaxError)) throw err;
    }
  }
  const now = new Date().toISOString();
  for (const l of lines) {
    if ('removed' in l || removed.has(l.id) || !('file' in l.ref)) continue;
    if (l.channel === '畅谈') continue;
    const dir = join(root, 'learned', 'imports', l.id);
    const title = l.title ?? l.id;
    let id = done.get(l.id);
    if (id === undefined) {
      id = freshMaterialId(title, taken);
      taken.add(id);
      const temp = join(target, `.迁移-${l.id}`);
      await mkdir(join(temp, '正文'), { recursive: true });
      const originals = join(dir, '原件');
      const names = await entryNames(originals);
      await cp(originals, join(temp, '原件'), { recursive: true });
      // 只有一个原件文件：正文用它的名字（.md），原件与正文对得上；文件夹（以前接成一份的）叫 正文.md
      const only = names.length === 1 && (await stat(join(originals, names[0] ?? ''))).isFile();
      const name = only ? `${(names[0] ?? '').replace(extname(names[0] ?? ''), '')}.md` : '正文.md';
      await cp(join(dir, '正文.md'), join(temp, '正文', name));
      const src: MaterialSource = {
        id,
        title,
        kind: 'md',
        origin: `learned/imports/${l.id}`,
        version: await originalFingerprint(join(temp, '原件')),
        fetchedAt: l.at,
        converter: 'none',
        status: '可用',
        owner: { kind: 'learner' },
        learned: { channel: l.channel },
        ...(l.project !== undefined ? { importedFrom: l.project } : {}),
      };
      await writeFile(join(temp, 'source.json'), `${JSON.stringify(src, null, 2)}\n`);
      await rename(temp, join(target, id));
    }
    const fresh: Import = {
      id: `imp-${randomBytes(4).toString('hex')}`,
      at: l.at,
      channel: l.channel,
      ref: { material: id },
      unverified: true,
      title,
      ...(l.project !== undefined ? { project: l.project } : {}),
    };
    // 两行一次写进去：重跑看到 {removed: 旧 id} 就不再建
    await appendFile(
      list,
      `${JSON.stringify({ removed: l.id, at: now })}\n${JSON.stringify(fresh)}\n`,
      'utf8',
    );
    await rm(dir, { recursive: true, force: true });
  }
  if ((await entryNames(join(root, 'learned', 'imports'))).length === 0) {
    await rm(join(root, 'learned', 'imports'), { recursive: true, force: true });
  }
}

/** 目录下的子目录名（不含隐藏的）；目录不在 = 空。 */
async function dirNames(path: string): Promise<string[]> {
  try {
    return (await readdir(path, { withFileTypes: true }))
      .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
      .map((e) => e.name)
      .sort();
  } catch (err) {
    if (isNotFound(err)) return [];
    throw err;
  }
}

/** 目录下的条目名；目录不在 = 空。 */
async function entryNames(path: string): Promise<string[]> {
  try {
    return await readdir(path);
  } catch (err) {
    if (isNotFound(err)) return [];
    throw err;
  }
}

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
