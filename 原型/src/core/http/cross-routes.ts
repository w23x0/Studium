// 批 10b 的接口：资料的来源说明、状态回看与学习者解释。
// 认出路径就回答并返回真；BadRequestError / NotFoundError 由 server.ts 按 400 / 404 回。
import type { IncomingMessage, ServerResponse } from 'node:http';
import type {
  AddExplanationRequest,
  AddExplanationResponse,
  AddSourceNoteRequest,
  SourceNoteResponse,
  SourceNotesResponse,
  StateTimelineResponse,
} from '../../shared/protocol.ts';
import type { Crosslinks } from '../crosslinks.ts';
import type { Lookback } from '../lookback.ts';
import { BadRequestError, type Studium } from '../studium.ts';

export interface CrossServices {
  links: Crosslinks;
  lookback: Lookback;
}

export async function crossRoute(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  parts: string[],
  method: string,
  studium: Studium,
  svc: CrossServices,
): Promise<boolean> {
  const q = url.searchParams;
  const [, a, b, c, d] = parts;
  const n = parts.length;

  if (a === 'library' && method === 'GET') {
    if (b === 'source-notes' && n === 3) {
      const book = q.get('book');
      if (book !== null && book !== '') {
        send(res, 200, { note: await svc.links.sourceNote(book) } satisfies SourceNoteResponse);
      } else {
        send(res, 200, { notes: await svc.links.sourceNotes() } satisfies SourceNotesResponse);
      }
      return true;
    }
  }
  if (a === 'library' && b === 'source-notes' && n === 3 && method === 'POST') {
    const body = (await readJson(req)) as Partial<AddSourceNoteRequest>;
    if (
      typeof body.book !== 'string' ||
      typeof body.field !== 'string' ||
      typeof body.text !== 'string'
    ) {
      throw new BadRequestError('book、field、text 要是字符串');
    }
    const note = await studium.addSourceNote(body.book, body.field, body.text);
    send(res, 201, { note } satisfies SourceNoteResponse);
    return true;
  }
  if (a === 'state' && b === 'timeline' && n === 3 && method === 'GET') {
    send(res, 200, (await svc.lookback.timeline()) satisfies StateTimelineResponse);
    return true;
  }
  if (a === 'state' && b === 'records' && d === 'explanations' && n === 5 && method === 'POST') {
    const body = (await readJson(req)) as Partial<AddExplanationRequest>;
    if (typeof body.text !== 'string') throw new BadRequestError('text 要是字符串');
    const explanation = await studium.addStateExplanation(c ?? '', body.text);
    send(res, 201, { explanation } satisfies AddExplanationResponse);
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
