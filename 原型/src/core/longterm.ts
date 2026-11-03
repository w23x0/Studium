// 长期功能：应用内提醒与“今天该做的”（到期的提醒、期限临近）。
// W12 撤掉导航（它是提醒的唯一出处，剩学习者在界面上加的）与阶段复盘；旧的复盘会话照旧只读看。
import type { ReminderView, TodayItem, TodayView } from '../shared/protocol-longterm.ts';
import type { LogRecord, ReminderAdded, ReminderClosed } from '../shared/records.ts';
import { REMINDER_KINDS, type ReminderKind } from '../shared/records-longterm.ts';
import { NotFoundError, type Hub } from './hub.ts';
import { BadRequestError, foldDeadline } from './studium.ts';

/** 期限还有几天内算“临近”，进“今天该做的”（实现细节，可调）。 */
export const DEADLINE_NEAR_DAYS = 7;

export interface LongTermDeps {
  hub(): Hub;
  now(): Date;
  iso(): string;
  newId(prefix: string): string;
}

export class LongTerm {
  constructor(private readonly d: LongTermDeps) {}

  private get hub(): Hub {
    return this.d.hub();
  }

  // ───────────── 提醒与“今天该做的” ─────────────

  today(): string {
    return this.d.now().toISOString().slice(0, 10);
  }

  async addReminder(
    mainId: string,
    input: {
      due?: string;
      beforeDeadlineDays?: number;
      text: string;
      kind?: ReminderKind;
      loopSessionId?: string;
    },
    by: 'nav' | 'learner',
    navSessionId?: string,
  ): Promise<ReminderView> {
    const main = await this.hub.records(mainId);
    const opened = main[0]?.record;
    if (opened?.type !== 'session_opened' || opened.kind !== 'main') {
      throw new BadRequestError('这不是一个项目。');
    }
    const text = input.text.trim();
    if (text === '') throw new BadRequestError('提醒要写清做什么。');
    const kind = input.kind ?? 'other';
    if (!(REMINDER_KINDS as readonly string[]).includes(kind)) {
      throw new BadRequestError(`提醒类型只能是 ${REMINDER_KINDS.join(' / ')}。`);
    }
    let due = input.due?.trim();
    if (due === undefined || due === '') {
      if (input.beforeDeadlineDays === undefined) {
        throw new BadRequestError(
          '要写提醒的日期（due），或写在期限前几天（beforeDeadlineDays）。',
        );
      }
      const dl = foldDeadline(main.map((r) => r.record)).deadline;
      if (dl === undefined) throw new BadRequestError('项目没有记期限，没法写“期限前几天”。');
      due = new Date(Date.parse(`${dl}T00:00:00Z`) - input.beforeDeadlineDays * 86_400_000)
        .toISOString()
        .slice(0, 10);
    } else if (!isDate(due)) {
      throw new BadRequestError('日期要写成 YYYY-MM-DD 的真实日期。');
    }
    if (kind === 'recheck' && input.loopSessionId === undefined) {
      throw new BadRequestError('复检提醒要写复检哪次学习（loopSessionId）。');
    }
    if (input.loopSessionId !== undefined) {
      const loop = await this.hub.opened(input.loopSessionId).catch((e: unknown) => {
        if (e instanceof NotFoundError) return undefined;
        throw e;
      });
      if (loop?.kind !== 'loop' || loop.parent !== mainId) {
        throw new BadRequestError(`本项目里没有这次学习：${input.loopSessionId}。`);
      }
      // 复检指已结束的学习，接着学指没合上的学习（工单 W3 §4.11）
      const ended = (await this.hub.records(input.loopSessionId)).find(
        (r) => r.record.type === 'loop_ended',
      )?.record;
      if (kind === 'recheck' && ended === undefined) {
        throw new BadRequestError('复检要指已经结束的学习；这次学习还没结束。');
      }
      if (kind === 'resume' && !(ended?.type === 'loop_ended' && !ended.closed)) {
        throw new BadRequestError('接着学要指没合上就结束的学习。');
      }
    }
    if (kind === 'resume' && input.loopSessionId === undefined) {
      throw new BadRequestError('接着学的提醒要写是哪次学习（loop）。');
    }
    const rec: ReminderAdded = {
      type: 'reminder_added',
      at: this.d.iso(),
      id: this.d.newId('rm'),
      due,
      kind,
      text,
      ...(input.loopSessionId !== undefined ? { loopSessionId: input.loopSessionId } : {}),
      by,
      ...(navSessionId !== undefined ? { navSessionId } : {}),
    };
    await this.hub.record(mainId, rec);
    return this.reminderView(rec, undefined);
  }

  async closeReminder(
    mainId: string,
    id: string,
    outcome: 'done' | 'dismissed',
    by: 'learner' | 'program',
    note?: string,
  ): Promise<ReminderView> {
    const views = await this.reminderViews(mainId);
    const v = views.find((r) => r.id === id);
    if (v === undefined) throw new BadRequestError(`本项目里没有这条提醒：${id}。`);
    if (v.closed !== undefined) throw new BadRequestError('这条提醒已经办完 / 不要了。');
    const rec: ReminderClosed = {
      type: 'reminder_closed',
      at: this.d.iso(),
      id,
      outcome,
      by,
      ...(note !== undefined && note.trim() !== '' ? { note: note.trim() } : {}),
    };
    await this.hub.record(mainId, rec);
    return {
      ...v,
      closed: { at: rec.at, outcome, by, ...(rec.note !== undefined ? { note: rec.note } : {}) },
      isDue: false,
    };
  }

  private reminderView(r: ReminderAdded, closed: ReminderClosed | undefined): ReminderView {
    return {
      id: r.id,
      due: r.due,
      kind: r.kind,
      text: r.text,
      ...(r.loopSessionId !== undefined ? { loopSessionId: r.loopSessionId } : {}),
      by: r.by,
      addedAt: r.at,
      ...(closed !== undefined
        ? {
            closed: {
              at: closed.at,
              outcome: closed.outcome,
              by: closed.by,
              ...(closed.note !== undefined ? { note: closed.note } : {}),
            },
          }
        : {}),
      isDue: closed === undefined && r.due <= this.today(),
    };
  }

  /** 项目里全部提醒（按到期日、添加先后），含办完的。 */
  async reminderViews(mainId: string): Promise<ReminderView[]> {
    const recs = (await this.hub.records(mainId)).map((r) => r.record);
    const closed = new Map<string, ReminderClosed>();
    for (const r of recs) if (r.type === 'reminder_closed') closed.set(r.id, r);
    return recs
      .flatMap((r) => (r.type === 'reminder_added' ? [this.reminderView(r, closed.get(r.id))] : []))
      .sort((a, b) => a.due.localeCompare(b.due) || a.addedAt.localeCompare(b.addedAt));
  }

  /** 今天该做的：到期的提醒、期限临近。 */
  async todayView(mainId: string): Promise<TodayView> {
    const date = this.today();
    const items: TodayItem[] = [];
    for (const r of await this.reminderViews(mainId)) {
      if (r.isDue)
        items.push({ kind: 'reminder', reminder: r, overdueDays: daysBetween(r.due, date) });
    }
    const recs = (await this.hub.records(mainId)).map((r) => r.record);
    const dl = foldDeadline(recs);
    if (dl.deadline !== undefined) {
      const daysLeft = daysBetween(date, dl.deadline);
      if (daysLeft <= DEADLINE_NEAR_DAYS) {
        items.push({
          kind: 'deadline',
          date: dl.deadline,
          daysLeft,
          ...(dl.note !== undefined ? { note: dl.note } : {}),
        });
      }
    }
    return { date, items };
  }

  /** 某个没合上的学习被哪些新学习接着学（项目页用）。 */
  async resumedBy(
    mainId: string,
    loopId: string,
  ): Promise<{ loopSessionId: string; title: string; closed?: boolean; ended: boolean }[]> {
    const out = [];
    for (const s of this.hub
      .listSessions()
      .filter((x) => x.kind === 'loop' && x.parent === mainId)) {
      const o = await this.hub.opened(s.sessionId);
      if (o.resumeOf?.fromLoop !== loopId) continue;
      const done = (await this.hub.records(s.sessionId)).find(
        (r) => r.record.type === 'loop_ended',
      )?.record;
      out.push({
        loopSessionId: s.sessionId,
        title: s.title,
        ended: done?.type === 'loop_ended',
        ...(done?.type === 'loop_ended' ? { closed: done.closed } : {}),
      });
    }
    return out;
  }
}

function isDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const t = Date.parse(`${s}T00:00:00Z`);
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === s;
}

/** b 比 a 晚几天（YYYY-MM-DD；b 在 a 之前为负）。 */
function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

export type { LogRecord };
