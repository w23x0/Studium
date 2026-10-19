// 长期功能的接口：提醒与“今天该做的”、路线偏差、接着学、阶段复盘。
// 认出路径就回答并返回真；BadRequestError 由 server.ts 按 400 回。
import type { IncomingMessage, ServerResponse } from 'node:http';
import type {
  AddReminderRequest,
  CloseReminderRequest,
  RemindersResponse,
  ReviewRequest,
  ReviewResponse,
  ReviewsResponse,
  RouteDeviationsResponse,
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

  if (a !== 'projects' || b === undefined) return false;
  if (c === 'deviations' && n === 4 && method === 'GET') {
    send(res, 200, {
      mainSessionId: b,
      deviations: await studium.routeDeviations(b),
    } satisfies RouteDeviationsResponse);
    return true;
  }
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
      const body = (await readJson(req)) as Partial<AddReminderRequest> & { point?: unknown };
      if (typeof body.text !== 'string') throw new BadRequestError('text 要是字符串');
      if ('point' in body) {
        throw new BadRequestError('提醒不再存知识点；复检请指以前那次学习（loopSessionId）');
      }
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
