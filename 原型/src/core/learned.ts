// 学过的记录（docs/设计/记录/学过的记录.md）：读每次学习（进行中 / 已结束），加外部导入的存放处。
// 只读、不缓存、不另存摘要：每次从正本现算。
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { Import, LearnedResponse, Learning } from '../shared/protocol-learned.ts';
import { NotFoundError, type Hub } from './hub.ts';
import { threadEnd } from '../shared/threads.ts';
import { Materials } from './knowledge/materials.ts';
import { isNotFound } from './log/session-log.ts';

export interface LearnedDeps {
  hub: () => Hub;
  /** 数据目录；导入的指针在 <数据>/learned/imports.jsonl；笔记与对话记录本身是资料（W11：存在一处）。 */
  dir: string;
  materials: Materials;
  newId: (prefix: string) => string;
  iso: () => string;
}

/** imports.jsonl 里的一行：一条导入，或一条“删掉了”（只追加，删也是追加）。 */
type ImportLine = Import | { removed: string; at: string };

/** imports.jsonl 里 W11 之前的一种指针（转好的 md 文件）：数据第 4 版的迁移已把它们建成资料并标删掉。 */
interface OldFileRef {
  file: string;
}

export class Learned {
  constructor(private readonly o: LearnedDeps) {}

  private get file(): string {
    return join(this.o.dir, 'learned', 'imports.jsonl');
  }

  /** 写一条原样指针；只追加。 */
  async addImport(x: {
    channel: Import['channel'];
    ref: Import['ref'];
    title?: string;
    project?: string;
    id?: string;
  }): Promise<Import> {
    const one: Import = {
      id: x.id ?? this.o.newId('imp'),
      at: this.o.iso(),
      channel: x.channel,
      ref: x.ref,
      unverified: true,
      ...(x.title !== undefined ? { title: x.title } : {}),
      ...(x.project !== undefined ? { project: x.project } : {}),
    };
    await this.append(one);
    return one;
  }

  /**
   * 笔记 / 别处 AI 对话记录导入（W11 §1）：资料已建好（归学习者、标渠道），这里只追加一条指向它的指针。
   * 不经模型分析。
   */
  async importMaterial(x: {
    material: string;
    channel: '笔记' | '对话记录';
    project: string;
    title: string;
  }): Promise<Import> {
    return this.addImport({
      channel: x.channel,
      ref: { material: x.material },
      title: x.title,
      project: x.project,
    });
  }

  /** 删一条导入：追加一行“删掉了”，文件留着（只追加）。 */
  async removeImport(id: string): Promise<void> {
    if (!(await this.allImports()).some((x) => x.id === id)) {
      throw new NotFoundError(`没有这条导入：${id}`);
    }
    await this.append({ removed: id, at: this.o.iso() });
  }

  /**
   * 一条导入的 md 全文（笔记 / 对话记录）：那份资料正文的拼接，每个文件前标 `<!-- 文件：相对路径 -->`；
   * 畅谈的（旧数据）、资料找不到的没有。
   */
  async importText(x: Import): Promise<string | undefined> {
    if (!('material' in x.ref)) return undefined;
    try {
      return await this.o.materials.joined(x.ref.material);
    } catch (err) {
      if (isNotFound(err)) return undefined;
      throw err;
    }
  }

  private async append(line: ImportLine): Promise<void> {
    await mkdir(dirname(this.file), { recursive: true });
    await appendFile(this.file, `${JSON.stringify(line)}\n`, 'utf8');
  }

  /**
   * 全部外部导入（删掉的不算），按时间升序。W9 之前笔记那种 `{ note }` 指针不再列；W11 之前的 `{ file }` 指针
   * 迁移时已标删掉，遇到也按删掉处理。给了项目：笔记 / 对话记录只给这个项目读得到的（按指向的那份资料的
   * 归属；资料删了或改成只归别的项目就不给，W11）；畅谈的照给（学过的按人）。
   */
  async imports(project?: string): Promise<Import[]> {
    // 谈方向时说的、而那条谈方向被学习者删了的，不再给（W12 §4.3）
    const hub = this.o.hub();
    const all = (await this.allImports()).filter(
      (x) => !('session' in x.ref) || !hub.isDeleted(x.ref.session),
    );
    if (project === undefined) return all;
    const out: Import[] = [];
    for (const x of all) {
      if ('session' in x.ref) {
        out.push(x);
        continue;
      }
      const src = await this.o.materials.source(x.ref.material);
      if (src !== undefined && Materials.readableBy(src, project)) out.push(x);
    }
    return out;
  }

  private async allImports(): Promise<Import[]> {
    let raw: string;
    try {
      raw = await readFile(this.file, 'utf8');
    } catch (err) {
      if ((err as { code?: string }).code === 'ENOENT') return [];
      throw err;
    }
    const lines = raw
      .split('\n')
      .filter((l) => l.trim() !== '')
      .map((l) => JSON.parse(l) as ImportLine | (Omit<Import, 'ref'> & { ref: OldFileRef }));
    const removed = new Set(lines.flatMap((l) => ('removed' in l ? [l.removed] : [])));
    return lines.filter(
      (l): l is Import =>
        !('removed' in l) && !removed.has(l.id) && ('session' in l.ref || 'material' in l.ref),
    );
  }

  /**
   * 学过的记录：给了项目就只列这个项目里开的学习（项目不存在 → 404），不给列全部（按人，不按项目划界）。
   * 学习按开始时间升序；导入总是全部、按时间升序。
   */
  async list(project?: string): Promise<LearnedResponse> {
    const learnings =
      project === undefined
        ? await this.all()
        : await this.ofProject(await this.requireProject(project));
    return { learnings, imports: await this.imports(project) };
  }

  /** 全部学习，按开始时间升序。 */
  async all(): Promise<Learning[]> {
    return this.ofProject(undefined);
  }

  private async ofProject(project: string | undefined): Promise<Learning[]> {
    const hub = this.o.hub();
    const loops = hub
      .listSessions()
      .filter((s) => s.kind === 'loop' && (project === undefined || s.parent === project));
    const out: Learning[] = [];
    for (const s of loops) {
      const ended = threadEnd(await hub.records(s.sessionId));
      out.push({
        loopId: s.sessionId,
        title: s.title,
        openedAt: s.openedAt,
        status: ended === undefined ? '进行中' : '已结束',
        ...(ended !== undefined ? { endedAt: ended.record.at } : {}),
      });
    }
    // 开始时间相同时保持开出来的先后（listSessions 的顺序）
    return out
      .map((l, i) => ({ l, i }))
      .sort((a, b) =>
        a.l.openedAt === b.l.openedAt ? a.i - b.i : a.l.openedAt < b.l.openedAt ? -1 : 1,
      )
      .map((x) => x.l);
  }

  private async requireProject(mainId: string): Promise<string> {
    if (!/^[A-Za-z0-9_-]+$/.test(mainId)) throw new NotFoundError(`没有这个项目：${mainId}`);
    const opened = await this.o
      .hub()
      .opened(mainId)
      .catch((err: unknown) => {
        if (err instanceof NotFoundError) throw new NotFoundError(`没有这个项目：${mainId}`);
        throw err;
      });
    if (opened.kind !== 'main') throw new NotFoundError(`不是项目主对话：${mainId}`);
    return mainId;
  }

  /**
   * 一条外部导入一行：畅谈（旧数据）= 会话与行号；笔记 / 对话记录 = 标题 + 沙盒里的位置（只读/学过的记录/外部导入/<id>.md
   * 是拼成一份的；按原目录读在 只读/资料/<资料 id>/）。
   */
  importLine(x: Import): string {
    return 'session' in x.ref
      ? `${x.id} ${x.channel}：${x.ref.session} 第 ${x.ref.lines.join('、')} 行`
      : `${x.id} ${x.channel}《${x.title ?? x.id}》：外部导入/${x.id}.md（原目录：资料 ${x.ref.material}）`;
  }

  /** 一次学习一行（主对话的 list_learned 用）：状态与时间。 */
  line(l: Learning): string {
    const start = l.openedAt.slice(0, 10);
    const span = l.endedAt !== undefined ? `${start}–${l.endedAt.slice(0, 10)}` : start;
    return `${l.loopId}「${l.title}」${l.status}，${span}`;
  }
}
