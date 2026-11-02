// 学过的记录（docs/设计/记录/学过的记录.md）：按层读每次学习，加外部导入的存放处。
// 只读、不缓存、不另存摘要：每次从正本现算；下层（事件记录）走 GET /api/sessions/<id>/records。
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { Import, LearnedResponse, Learning } from '../shared/protocol-learned.ts';
import type { NumberedRecord, Ticket } from '../shared/records.ts';
import { NotFoundError, type Hub } from './hub.ts';
import { Materials } from './knowledge/materials.ts';
import { isNotFound } from './log/session-log.ts';
import { currentTicket, ticketEdits } from './ticket.ts';
import { closingOf } from '../shared/closing.ts';

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

  /** 程序在导入时写一条原样指针（畅谈渠道）；只追加。 */
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
   * 畅谈的、资料找不到的没有。
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
    const all = await this.allImports();
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

  /** 一次学习的两层；不是学习或没有这个会话 → 404。 */
  async one(loopId: string): Promise<Learning> {
    if (!/^[A-Za-z0-9_-]+$/.test(loopId)) throw new NotFoundError(`没有这个会话：${loopId}`);
    const hub = this.o.hub();
    const opened = await hub.opened(loopId).catch((err: unknown) => {
      if (err instanceof NotFoundError) throw new NotFoundError(`没有这个会话：${loopId}`);
      throw err;
    });
    if (opened.kind !== 'loop') throw new NotFoundError(`不是一次学习：${loopId}`);
    return this.of(opened.sessionId, opened.title, opened.at, await hub.records(opened.sessionId));
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
      out.push(await this.of(s.sessionId, s.title, s.openedAt, await hub.records(s.sessionId)));
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

  /** 从一次学习的正本算出它的两层；路线决定去项目主对话里回查。 */
  private async of(
    loopId: string,
    title: string,
    openedAt: string,
    records: NumberedRecord[],
  ): Promise<Learning> {
    const ended = records.find((r) => r.record.type === 'loop_ended');
    const ticket = await this.ticketOf(loopId, records);
    const status: Learning['status'] =
      ended?.record.type !== 'loop_ended' ? '进行中' : ended.record.closed ? '合上' : '没合上';
    const edits = ticketEdits(records);
    const out: Learning = {
      loopId,
      title,
      openedAt,
      status,
      ticket,
      ...(edits.length > 0 ? { ticketEdits: edits } : {}),
      ...(ended?.record.type === 'loop_ended' ? { endedAt: ended.record.at } : {}),
    };
    if (ended?.record.type === 'loop_ended') {
      if (ended.record.closed) {
        // 中层：loop_ended 之前最后一句收尾那一句（10-31 起）
        const closing = closingOf(records, ended.line);
        if (closing !== undefined) out.closing = closing;
        // 旧数据：loop_ended 之前最后一条 closed: true 的守卫判定
        const passed = records
          .filter((r) => r.line < ended.line && r.record.type === 'guard_verdict')
          .map((r) => ({ line: r.line, v: r.record }))
          .filter((x) => x.v.type === 'guard_verdict' && x.v.closed)
          .at(-1);
        if (passed?.v.type === 'guard_verdict') {
          out.verdict = {
            line: passed.line,
            closed: passed.v.closed,
            basis: passed.v.basis,
            understanding: passed.v.understanding ?? [],
            ...(passed.v.model !== undefined ? { model: passed.v.model } : {}),
          };
        }
      } else {
        out.endNote = ended.record.note;
        const rd = await this.routeDecisionOf(loopId, records);
        if (rd !== undefined) out.routeDecision = rd;
      }
    }
    return out;
  }

  /** 单子：现在的这张（改过就是改后的）；正本里没有就退回会话元信息，再没有给空单子。 */
  private async ticketOf(loopId: string, records: NumberedRecord[]): Promise<Ticket> {
    const now = currentTicket(records);
    if (now !== undefined) return now;
    const opened = await this.o.hub().opened(loopId);
    if (opened.ticket !== undefined) return opened.ticket;
    return { newPoint: '', clause: '', startPoints: [], routeAction: '', sourceCheck: [] };
  }

  /**
   * 没合上那次的路线决定：那次结束之后、项目主对话里导航作出的第一条路线决定（导航下次定下一步时读它写的）。
   * 找不到就不给这一栏。
   */
  private async routeDecisionOf(
    loopId: string,
    records: NumberedRecord[],
  ): Promise<Learning['routeDecision']> {
    const ended = records.find((r) => r.record.type === 'loop_ended')?.record;
    if (ended?.type !== 'loop_ended') return undefined;
    const opened = await this.o.hub().opened(loopId);
    if (opened.parent === undefined) return undefined;
    const main = await this.o.hub().records(opened.parent);
    const rd = main.find((r) => r.record.type === 'route_decision' && r.record.at >= ended.at);
    if (rd?.record.type !== 'route_decision') return undefined;
    return { line: rd.line, decision: rd.record.decision, reason: rd.record.reason };
  }

  /**
   * 停车场：没合上、还没补上的那些学习（导航开场、项目概览、复盘用），带结束原话所在行号。
   * 一条不算积压 = 有一次以它为 `resumeOf` 的学习已合上，或之后有过一次新点文字相同的合上。
   */
  async parked(project: string): Promise<ParkedLearning[]> {
    const learnings = (await this.list(project)).learnings;
    const everything = await this.all();
    const hub = this.o.hub();
    const resumedClosed = new Set<string>();
    for (const s of hub.listSessions().filter((x) => x.kind === 'loop')) {
      const opened = await hub.opened(s.sessionId);
      if (opened.resumeOf === undefined) continue;
      const ended = (await hub.records(s.sessionId)).find((r) => r.record.type === 'loop_ended');
      if (ended?.record.type === 'loop_ended' && ended.record.closed) {
        resumedClosed.add(opened.resumeOf.fromLoop);
      }
    }
    const out: ParkedLearning[] = [];
    for (const l of learnings) {
      if (l.status !== '没合上') continue;
      if (resumedClosed.has(l.loopId)) continue;
      const madeUp = everything.some(
        (x) =>
          x.status === '合上' && x.ticket.newPoint === l.ticket.newPoint && x.openedAt > l.openedAt,
      );
      if (madeUp) continue;
      const ended = (await hub.records(l.loopId)).find((r) => r.record.type === 'loop_ended');
      out.push({ learning: l, ...(ended !== undefined ? { endLine: ended.line } : {}) });
    }
    return out;
  }

  /** 停车场里的一条：没合上那次的「上层」（单子 + 结束原话带行号 + 当时的路线决定）。 */
  parkedLine(p: ParkedLearning): string {
    const l = p.learning;
    const parts = [`${l.loopId}「${l.title}」：${ticketText(l.ticket)}`];
    parts.push(
      `结束原话${p.endLine !== undefined ? `（L${String(p.endLine)}）` : ''}：${l.endNote ?? ''}`,
    );
    if (l.routeDecision !== undefined) {
      parts.push(
        `当时的路线决定（L${String(l.routeDecision.line)}）：${l.routeDecision.decision}（${l.routeDecision.reason}）`,
      );
    }
    return parts.join('；');
  }

  /**
   * 一条外部导入一行：畅谈 = 会话与行号；笔记 / 对话记录 = 标题 + 沙盒里的位置（只读/学过的记录/外部导入/<id>.md
   * 是拼成一份的；按原目录读在 只读/资料/<资料 id>/）。
   */
  importLine(x: Import): string {
    return 'session' in x.ref
      ? `${x.id} ${x.channel}：${x.ref.session} 第 ${x.ref.lines.join('、')} 行`
      : `${x.id} ${x.channel}《${x.title ?? x.id}》：外部导入/${x.id}.md（原目录：资料 ${x.ref.material}）`;
  }

  /** 一次学习一行（导航开场、复盘、主对话的 list_learned 用）：上层 + 中层（记录/学过的记录.md「分层」）。 */
  line(l: Learning): string {
    const start = l.openedAt.slice(0, 10);
    const span = l.endedAt !== undefined ? `${start}–${l.endedAt.slice(0, 10)}` : start;
    const parts = [`${l.loopId}「${l.title}」${l.status}，${span}：${ticketText(l.ticket)}`];
    if (l.closing !== undefined) {
      parts.push(`收尾那一句 L${String(l.closing.line)}：${l.closing.summary}`);
    }
    if (l.verdict !== undefined) {
      parts.push(`旧数据·守卫判定 L${String(l.verdict.line)}：${l.verdict.basis}`);
      const u = l.verdict.understanding
        .map(
          (x) =>
            `${x.text}（${x.independence}，${x.durability}${x.lines.length > 0 ? `，L${x.lines.join('、')}` : ''}）`,
        )
        .join('；');
      if (u !== '') parts.push(`实际理解：${u}`);
    }
    if (l.endNote !== undefined) parts.push(`结束原话：${l.endNote}`);
    if (l.routeDecision !== undefined) {
      parts.push(
        `当时的路线决定（L${String(l.routeDecision.line)}）：${l.routeDecision.decision}（${l.routeDecision.reason}）`,
      );
    }
    return parts.join('；');
  }
}

/** 停车场里的一条：没合上那次的「上层」（记录/单子与路线.md「没合上那次的上层」）。 */
export interface ParkedLearning {
  learning: Learning;
  /** 结束原话（loop_ended）在那次学习正本里的行号。 */
  endLine?: number;
}

/** 单子的一句话：新点 + 预期理解 + 出发点各注来源。 */
export function ticketText(t: Ticket): string {
  const starts = t.startPoints
    .map((s) => `${s.point}（来源：${s.source}${s.ref !== undefined ? `，依据 ${s.ref}` : ''}）`)
    .join('；');
  return `新点 ${t.newPoint}；预期理解 ${t.clause}；出发点 ${starts || '（无）'}`;
}
