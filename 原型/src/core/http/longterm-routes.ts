// 跨闭环长期功能的接口（批 6）：M09 当前视图 / 时间版本 / 重新分析、提醒与“今天该做的”、路线偏差、
// 接着学、阶段复盘。认出路径就回答并返回真；BadRequestError 由 server.ts 按 400 回。
import type { IncomingMessage, ServerResponse } from 'node:http';
import type {
  AddReminderRequest,
  CloseReminderRequest,
  ContinueLoopResponse,
  DeviationsResponse,
  PointViewDetailResponse,
  PointViewResponse,
  ReanalyzeRequest,
  RemindersResponse,
  ReviewRequest,
  ReviewResponse,
  ReviewsResponse,
  TimelineResponse,
  TodayView,
} from '../../shared/protocol.ts';
import { REMINDER_KINDS } from '../../shared/records-longterm.ts';
import { BadRequestError, type Studium } from '../studium.ts';

export async function longtermRoute(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  parts: string[],
  method: string,
  studium: Studium,
): Promise<boolean> {
  const lt = studium.longterm;
  const q = url.searchParams;
  const [, a, b, c, d] = parts;
  const n = parts.length;

  if (a === 'm09' && b === 'view' && method === 'GET') {
    if (n === 3) {
      const entries = lt.pointView({
        ...(q.get('q') !== null ? { q: q.get('q') ?? '' } : {}),
        ...(q.get('status') !== null ? { status: q.get('status') ?? '' } : {}),
      });
      if (q.get('sort') === 'oldest') entries.reverse();
      send(res, 200, {
        generatedAt: lt.nowIso(),
        entries,
      } satisfies PointViewResponse);
      return true;
    }
    if (n === 4 && c !== undefined) {
      send(res, 200, lt.pointDetail(decodeURIComponent(c)) satisfies PointViewDetailResponse);
      return true;
    }
  }
  if (a === 'm09' && b === 'timeline' && n === 3 && method === 'GET') {
    send(res, 200, {
      records: lt.timelineViews(q.get('point') ?? undefined),
    } satisfies TimelineResponse);
    return true;
  }
  if (a === 'm09' && b === 'reanalyze' && n === 3 && method === 'POST') {
    const body = (await readJson(req)) as Partial<ReanalyzeRequest>;
    if (typeof body.loop !== 'string')
      throw new BadRequestError('loop 要是字符串（闭环对话的会话 id）');
    const loop = body.loop;
    await studium.assertReanalyzable(loop);
    studium.background('M09 重新分析', () => studium.reanalyzeLoop(loop));
    send(res, 202, {});
    return true;
  }
  if (a === 'm05' && b === 'deviations' && n === 3 && method === 'GET') {
    send(res, 200, {
      records: lt.deviationViews(q.get('project') ?? undefined),
    } satisfies DeviationsResponse);
    return true;
  }
  if (a === 'sessions' && d === undefined && n === 4 && c === 'continue' && method === 'POST') {
    const loopSessionId = await lt.continueLoop(b ?? '');
    send(res, 201, { loopSessionId } satisfies ContinueLoopResponse);
    return true;
  }
  if (a !== 'projects' || b === undefined) return false;
  if (c === 'today' && n === 4 && method === 'GET') {
    send(res, 200, (await lt.todayView(b)) satisfies TodayView);
    return true;
  }
  if (c === 'reminders') {
    if (n === 4 && method === 'GET') {
      const all = await lt.reminderViews(b);
      const open = q.get('open') === '1';
      send(res, 200, {
        today: lt.today(),
        reminders: open ? all.filter((r) => r.closed === undefined) : all,
      } satisfies RemindersResponse);
      return true;
    }
    if (n === 4 && method === 'POST') {
      const body = (await readJson(req)) as Partial<AddReminderRequest>;
      if (typeof body.text !== 'string') throw new BadRequestError('text 要是字符串');
      if (body.kind !== undefined && !(REMINDER_KINDS as readonly unknown[]).includes(body.kind)) {
        throw new BadRequestError(`kind 只能是 ${REMINDER_KINDS.join(' / ')}`);
      }
      const reminder = await lt.addReminder(
        b,
        {
          text: body.text,
          ...(typeof body.due === 'string' ? { due: body.due } : {}),
          ...(typeof body.beforeDeadlineDays === 'number'
            ? { beforeDeadlineDays: body.beforeDeadlineDays }
            : {}),
          ...(body.kind !== undefined ? { kind: body.kind } : {}),
          ...(typeof body.point === 'string' ? { point: body.point } : {}),
          ...(typeof body.loopSessionId === 'string' ? { loopSessionId: body.loopSessionId } : {}),
        },
        'learner',
      );
      send(res, 201, { reminder });
      return true;
    }
    if (n === 5 && d !== undefined && method === 'POST') {
      // POST /api/projects/:id/reminders/:rid  = 办完 / 不要了
      const body = (await readJson(req)) as Partial<CloseReminderRequest>;
      const given: unknown = body.outcome ?? 'done';
      if (given !== 'done' && given !== 'dismissed') {
        throw new BadRequestError('outcome 要是 done 或 dismissed');
      }
      const outcome = given;
      const reminder = await lt.closeReminder(
        b,
        d,
        outcome,
        'learner',
        typeof body.note === 'string' ? body.note : undefined,
      );
      send(res, 200, { reminder });
      return true;
    }
  }
  if (c === 'review' && n === 4 && method === 'POST') {
    const body = (await readJson(req)) as Partial<ReviewRequest>;
    if (body.since !== undefined && typeof body.since !== 'string') {
      throw new BadRequestError('since 要是 YYYY-MM-DD 字符串');
    }
    const r = await lt.startReview(b, body.since !== undefined ? { since: body.since } : {});
    send(res, 201, {
      reviewSessionId: r.sessionId,
      since: r.since,
      until: r.until,
    } satisfies ReviewResponse);
    return true;
  }
  if (c === 'reviews' && n === 4 && method === 'GET') {
    send(res, 200, { reviews: await lt.reviews(b) } satisfies ReviewsResponse);
    return true;
  }
  return false;
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req as AsyncIterable<Buffer>) {
    size += chunk.length;
    if (size > 1 << 20) throw new BadRequestError('请求体太大');
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch {
    throw new BadRequestError('请求体不是 JSON');
  }
}

function send(res: ServerResponse, status: number, body: object): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}
