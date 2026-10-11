// M08 候选区与更正的接口（批 10a）：候选（三种来源）、学习者提建议、审计、更正与历史。
// 路径都在 /api/m08/ 下；GET /api/m08/points… 仍在 server.ts 里（只读）。
import type { IncomingMessage, ServerResponse } from 'node:http';
import type {
  AuditResponse,
  CorrectionResponse,
  CorrectionsResponse,
  ReviewCandidateResponse,
  ReviewCandidatesResponse,
  TargetRef,
  TargetReviewResponse,
} from '../../shared/m08-review.ts';
import type { M08Review } from '../m08-review.ts';
import { BadRequestError } from '../studium.ts';

const MAX_BODY = 1 << 20;

/** 认出 /api/m08/{candidates,suggestions,corrections,review} 就回答并返回真。 */
export async function m08ReviewRoute(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  parts: string[],
  method: string,
  review: M08Review,
): Promise<boolean> {
  const [, a, b, c, d] = parts;
  const n = parts.length;
  if (a !== 'm08') return false;
  if (b === 'candidates' && n === 3 && method === 'GET') {
    const source = url.searchParams.get('source') ?? undefined;
    const target = targetOf(url.searchParams.get('target'));
    send(res, 200, {
      candidates: await review.candidates({
        ...(source !== undefined ? { source } : {}),
        ...(target !== undefined ? { target } : {}),
      }),
    } satisfies ReviewCandidatesResponse);
    return true;
  }
  if (b === 'candidates' && n === 4 && c !== undefined && method === 'GET') {
    send(res, 200, { candidate: await review.candidate(c) } satisfies ReviewCandidateResponse);
    return true;
  }
  if (b === 'candidates' && n === 5 && c !== undefined && d === 'audits' && method === 'POST') {
    const body = (await readJson(req)) as Parameters<M08Review['audit']>[1];
    send(res, 201, { audit: await review.audit(c, body) } satisfies AuditResponse);
    return true;
  }
  if (b === 'suggestions' && n === 3 && method === 'POST') {
    const body = (await readJson(req)) as Parameters<M08Review['suggest']>[0];
    send(res, 201, { candidate: await review.suggest(body) } satisfies ReviewCandidateResponse);
    return true;
  }
  if (b === 'corrections' && n === 3) {
    if (method === 'GET') {
      const target = targetOf(url.searchParams.get('target'));
      send(res, 200, {
        corrections: review.corrections(target !== undefined ? { target } : {}),
      } satisfies CorrectionsResponse);
      return true;
    }
    if (method === 'POST') {
      const body = (await readJson(req)) as Parameters<M08Review['correct']>[0];
      send(res, 201, { correction: await review.correct(body) } satisfies CorrectionResponse);
      return true;
    }
  }
  if (b === 'review' && n === 3 && method === 'GET') {
    const target = targetOf(url.searchParams.get('target'));
    if (target === undefined) throw new BadRequestError('target 写成 point:<id> 或 clause:<id>');
    send(res, 200, (await review.targetReview(target)) satisfies TargetReviewResponse);
    return true;
  }
  return false;
}

/** “point:p-displacement” / “clause:c-…” → 对象；没给 = 不筛；写错了报错。 */
function targetOf(raw: string | null): TargetRef | undefined {
  if (raw === null || raw === '') return undefined;
  const i = raw.indexOf(':');
  const kind = raw.slice(0, i);
  if (i < 0 || (kind !== 'point' && kind !== 'clause') || raw.length === i + 1) {
    throw new BadRequestError('target 写成 point:<id> 或 clause:<id>');
  }
  return { kind, id: raw.slice(i + 1) };
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req as AsyncIterable<Buffer>) {
    size += chunk.length;
    if (size > MAX_BODY) throw new BadRequestError('请求体太大');
    chunks.push(chunk);
  }
  let body: unknown;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch (err) {
    throw new BadRequestError(`请求体不是 JSON（${err instanceof Error ? err.message : ''}）`);
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new BadRequestError('请求体要是 JSON 对象');
  }
  return body;
}

function send(res: ServerResponse, status: number, body: object): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}
