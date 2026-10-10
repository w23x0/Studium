// M14 产出物的接口（批 8）：项目下的产出物、版本链与比较、相关文献、“可作通用知识候选”。
// 写入的都是学习者自己写的（作者记“学习者”）；模型协助写入走“写产出”对话里的工具。
// POST /api/outputs/:id/tasks：学习者从产出物页直接开一个“写产出”对话（批 8b）。
import type { IncomingMessage, ServerResponse } from 'node:http';
import type {
  CandidateResponse,
  CandidatesResponse,
  CompareResponse,
  ListOutputsResponse,
  LiteratureListResponse,
  LiteratureResponse,
  OpenOutputTaskResponse,
  OutputResponse,
  VersionResponse,
  VersionsResponse,
} from '../../shared/m14.ts';
import type { Outputs } from '../outputs.ts';
import { BadRequestError } from '../studium.ts';

const MAX_BODY = 4 << 20;

/** 认出 /api/projects/:id/outputs、/api/outputs/…、/api/m14/… 就回答并返回真。 */
export async function outputsRoute(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  parts: string[],
  method: string,
  outputs: Outputs,
): Promise<boolean> {
  const [, a, b, c, d] = parts;
  const n = parts.length;
  if (a === 'projects' && c === 'outputs' && n === 4 && b !== undefined) {
    if (method === 'GET') {
      json(res, 200, { outputs: await outputs.list(b) } satisfies ListOutputsResponse);
      return true;
    }
    if (method === 'POST') {
      const body = (await readJson(req)) as Parameters<Outputs['create']>[1];
      json(res, 201, { output: await outputs.create(b, body, '学习者') } satisfies OutputResponse);
      return true;
    }
    return false;
  }
  if (a === 'm14' && b === 'candidates' && n === 3 && method === 'GET') {
    json(res, 200, { candidates: outputs.candidates() } satisfies CandidatesResponse);
    return true;
  }
  if (a !== 'outputs' || b === undefined) return false;
  if (n === 3 && method === 'GET') {
    json(res, 200, { output: await outputs.view(b) } satisfies OutputResponse);
    return true;
  }
  if (c === 'versions' && n === 4) {
    if (method === 'GET') {
      json(res, 200, { versions: outputs.versions(b) } satisfies VersionsResponse);
      return true;
    }
    if (method === 'POST') {
      const body = (await readJson(req)) as Parameters<Outputs['save']>[1];
      json(res, 201, { version: await outputs.save(b, body, '学习者') } satisfies VersionResponse);
      return true;
    }
    return false;
  }
  if (c === 'versions' && n === 5 && method === 'GET' && d !== undefined) {
    json(res, 200, {
      version: await outputs.version(b, int(d, 'n')),
    } satisfies VersionResponse);
    return true;
  }
  if (c === 'compare' && n === 4 && method === 'GET') {
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    if (from === null || to === null) throw new BadRequestError('要给 from 和 to（版本号）');
    json(res, 200, {
      compare: outputs.compare(b, int(from, 'from'), int(to, 'to')),
    } satisfies CompareResponse);
    return true;
  }
  if (c === 'literature' && n === 4) {
    if (method === 'GET') {
      json(res, 200, {
        literature: await outputs.literature(b),
      } satisfies LiteratureListResponse);
      return true;
    }
    if (method === 'POST') {
      const body = (await readJson(req)) as Parameters<Outputs['addLiterature']>[1];
      json(res, 201, {
        entry: await outputs.addLiterature(b, body, '学习者'),
      } satisfies LiteratureResponse);
      return true;
    }
    return false;
  }
  if (c === 'tasks' && n === 4 && method === 'POST') {
    const body = (await readJson(req)) as { brief?: unknown };
    json(res, 201, {
      sessionId: await outputs.openTask(b, body.brief),
    } satisfies OpenOutputTaskResponse);
    return true;
  }
  if (c === 'candidates' && n === 4) {
    if (method === 'GET') {
      json(res, 200, {
        candidates: (await outputs.view(b)).candidates,
      } satisfies CandidatesResponse);
      return true;
    }
    if (method === 'POST') {
      const body = (await readJson(req)) as Parameters<Outputs['markCandidate']>[1];
      json(res, 201, {
        candidate: await outputs.markCandidate(b, body),
      } satisfies CandidateResponse);
      return true;
    }
  }
  return false;
}

function int(s: string, name: string): number {
  const v = Number(s);
  if (!Number.isInteger(v) || v < 1) throw new BadRequestError(`${name} 要是正整数`);
  return v;
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

function json(res: ServerResponse, status: number, body: object): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}
