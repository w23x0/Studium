// 练习任务（批 9，M03）的接口：某闭环的练习任务、提交作答、要提示、放弃、书里的习题清单、错误模式、题型归纳。
// 认出路径就回答并返回真；BadRequestError 由 server.ts 按 400 回。
import type { IncomingMessage, ServerResponse } from 'node:http';
import type {
  AbandonPracticeRequest,
  ErrorPatternsResponse,
  ExercisesResponse,
  PracticeSummariesResponse,
  PracticeTaskResponse,
  PracticeTasksResponse,
  SubmitPracticeRequest,
  SummarizePracticeRequest,
} from '../../shared/protocol.ts';
import { BadRequestError, type Studium } from '../studium.ts';

export async function practiceRoute(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  parts: string[],
  method: string,
  studium: Studium,
): Promise<boolean> {
  const p = studium.practice;
  const q = url.searchParams;
  const [, a, b, c, d, e] = parts;
  const n = parts.length;

  if (a === 'loops' && b !== undefined && c === 'practice') {
    if (n === 4 && method === 'GET') {
      send(res, 200, { loopSessionId: b, tasks: await p.tasks(b) } satisfies PracticeTasksResponse);
      return true;
    }
    if (n === 5 && d === 'summarize' && method === 'POST') {
      const body = (await readJson(req)) as Partial<SummarizePracticeRequest>;
      if (body.tasks !== undefined && !isStrings(body.tasks)) {
        throw new BadRequestError('tasks 要是练习编号的数组');
      }
      const r = await p.requestSummary(b, body.tasks);
      send(res, 202, r);
      return true;
    }
    if (n === 5 && d !== undefined && method === 'GET') {
      send(res, 200, { task: await p.task(b, d) } satisfies PracticeTaskResponse);
      return true;
    }
    if (n === 6 && d !== undefined && e === 'submit' && method === 'POST') {
      const body = (await readJson(req)) as Partial<SubmitPracticeRequest>;
      if (body.text !== undefined && typeof body.text !== 'string') {
        throw new BadRequestError('text 要是字符串');
      }
      if (
        body.lines !== undefined &&
        !(Array.isArray(body.lines) && body.lines.every((l) => Number.isInteger(l)))
      ) {
        throw new BadRequestError('lines 要是行号数组');
      }
      const task = await p.submit(b, d, {
        ...(body.text !== undefined ? { text: body.text } : {}),
        ...(body.lines !== undefined ? { lines: body.lines } : {}),
      });
      send(res, 201, { task } satisfies PracticeTaskResponse);
      return true;
    }
    if (n === 6 && d !== undefined && e === 'hint' && method === 'POST') {
      send(res, 201, { task: await p.askHint(b, d) } satisfies PracticeTaskResponse);
      return true;
    }
    if (n === 6 && d !== undefined && e === 'abandon' && method === 'POST') {
      const body = (await readJson(req)) as Partial<AbandonPracticeRequest>;
      if (body.note !== undefined && typeof body.note !== 'string') {
        throw new BadRequestError('note 要是字符串');
      }
      send(res, 200, {
        task: await p.abandon(b, d, body.note ?? ''),
      } satisfies PracticeTaskResponse);
      return true;
    }
    return false;
  }
  if (a === 'practice' && method === 'GET') {
    if (b === 'exercises' && n === 3) {
      const project = q.get('project');
      const scope =
        project !== null ? await studium.scopeOf(project, q.get('all') === '1') : undefined;
      send(
        res,
        200,
        (await p.exercises({
          ...(scope !== undefined ? { scope } : {}),
          ...(q.get('book') !== null ? { book: q.get('book') ?? '' } : {}),
          ...(q.get('chapter') !== null ? { chapter: q.get('chapter') ?? '' } : {}),
        })) satisfies ExercisesResponse,
      );
      return true;
    }
    if (b === 'error-patterns' && n === 3) {
      send(
        res,
        200,
        (await p.errorPatterns(q.get('point') ?? undefined)) satisfies ErrorPatternsResponse,
      );
      return true;
    }
    if (b === 'summaries' && n === 3) {
      send(
        res,
        200,
        (await p.summaries(q.get('loop') ?? undefined)) satisfies PracticeSummariesResponse,
      );
      return true;
    }
  }
  return false;
}

function isStrings(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string');
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
