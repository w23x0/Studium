// 学过的记录（docs/设计/记录/学过的记录.md）：按层读每次学习，加外部导入的存放处。
// 只读、不缓存、不另存摘要：每次从正本现算；下层（事件记录）走 GET /api/sessions/<id>/records。
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { Import, LearnedResponse, Learning } from '../shared/protocol-learned.ts';
import type { NumberedRecord, Ticket } from '../shared/records.ts';
import { NotFoundError, type Hub } from './hub.ts';

export interface LearnedDeps {
  hub: () => Hub;
  /** 数据目录；导入存放处在 <数据>/learned/imports.jsonl。 */
  dir: string;
  newId: (prefix: string) => string;
  iso: () => string;
}

export class Learned {
  constructor(private readonly o: LearnedDeps) {}

  private get file(): string {
    return join(this.o.dir, 'learned', 'imports.jsonl');
  }

  /** 程序在导入时写一条原样指针（畅谈 / 笔记两个渠道）；只追加。 */
  async addImport(x: { channel: Import['channel']; ref: Import['ref'] }): Promise<Import> {
    const one: Import = {
      id: this.o.newId('imp'),
      at: this.o.iso(),
      channel: x.channel,
      ref: x.ref,
      unverified: true,
    };
    await mkdir(dirname(this.file), { recursive: true });
    await appendFile(this.file, `${JSON.stringify(one)}\n`, 'utf8');
    return one;
  }

  /** 全部外部导入，按时间升序。 */
  async imports(): Promise<Import[]> {
    let raw: string;
    try {
      raw = await readFile(this.file, 'utf8');
    } catch (err) {
      if ((err as { code?: string }).code === 'ENOENT') return [];
      throw err;
    }
    return raw
      .split('\n')
      .filter((l) => l.trim() !== '')
      .map((l) => JSON.parse(l) as Import);
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
    return { learnings, imports: await this.imports() };
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
    const out: Learning = {
      loopId,
      title,
      openedAt,
      status,
      ticket,
      ...(ended?.record.type === 'loop_ended' ? { endedAt: ended.record.at } : {}),
    };
    if (ended?.record.type === 'loop_ended') {
      if (ended.record.closed) {
        // 中层：loop_ended 之前最后一条 closed: true 的判定
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

  /** 单子：session_opened 里那张。 */
  private async ticketOf(loopId: string, records: NumberedRecord[]): Promise<Ticket> {
    const opened = await this.o.hub().opened(loopId);
    if (opened.ticket !== undefined) return opened.ticket;
    // 旧数据可能只有记录里的那一份
    const fromLog = records.find((r) => r.record.type === 'session_opened')?.record;
    if (fromLog?.type === 'session_opened' && fromLog.ticket !== undefined) return fromLog.ticket;
    return { newPoint: '', clause: '', startPoints: [], routeAction: '', sourceCheck: [] };
  }

  /**
   * 没合上那次的路线决定：那次学习里 card_ready 的卡号 → 项目主对话里那张卡 → 同一导航会话的路线决定。
   * 找不到就不给这一栏。
   */
  private async routeDecisionOf(
    loopId: string,
    records: NumberedRecord[],
  ): Promise<Learning['routeDecision']> {
    const cardId = records
      .filter((r) => r.record.type === 'after_loop_step' && r.record.step === 'card_ready')
      .map((r) => (r.record.type === 'after_loop_step' ? r.record.detail : ''))
      .at(-1);
    if (cardId === undefined || cardId === '') return undefined;
    const opened = await this.o.hub().opened(loopId);
    if (opened.parent === undefined) return undefined;
    const main = await this.o.hub().records(opened.parent);
    const card = main.find(
      (r) => r.record.type === 'choice_card' && r.record.cardId === cardId,
    )?.record;
    if (card?.type !== 'choice_card') return undefined;
    const nav = card.m05SessionId;
    const rd = main.find(
      (r) => r.record.type === 'route_decision' && r.record.navSessionId === nav,
    );
    if (rd?.record.type !== 'route_decision') return undefined;
    return { line: rd.line, decision: rd.record.decision, reason: rd.record.reason };
  }

  /** 一行一句话（导航开场、主对话的 list_learned 用）：上层 + 中层。 */
  describe(l: Learning): string {
    const parts = [`${l.loopId}「${l.title}」${l.status}`];
    parts.push(`新点：${l.ticket.newPoint}；预期理解：${l.ticket.clause}`);
    if (l.verdict !== undefined) {
      const u = l.verdict.understanding
        .map((x) => `${x.text}（${x.independence}、${x.durability}）`)
        .join('；');
      if (u !== '') parts.push(`实际表现出的理解：${u}`);
    }
    if (l.endNote !== undefined) parts.push(`结束原话：${l.endNote}`);
    if (l.routeDecision !== undefined) {
      parts.push(`当时的路线决定：${l.routeDecision.decision}（${l.routeDecision.reason}）`);
    }
    return parts.join('；');
  }
}
