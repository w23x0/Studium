// 输入的接口（批 4）：/api/attachments/…——传图片（原样保存）、取原图、看转写、请模型转写。
// 发消息时带图走原来的 POST /api/sessions/:id/messages（body 里加 images），见 server.ts。
import type { IncomingMessage, ServerResponse } from 'node:http';
import type {
  AttachmentInfoResponse,
  TranscribeResponse,
  UploadAttachmentResponse,
} from '../../shared/protocol.ts';
import { InputError, MAX_IMAGE_BYTES, type Inputs } from '../inputs.ts';

/** 认出 /api/attachments/… 就回答并返回真；InputError 由调用方按 status 回。 */
export async function inputsRoute(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  parts: string[],
  method: string,
  inputs: Inputs,
): Promise<boolean> {
  if (parts[1] !== 'attachments') return false;
  const [, , id, action] = parts;
  if (method === 'POST' && id === undefined) {
    const data = await readBody(req, MAX_IMAGE_BYTES);
    const name = url.searchParams.get('name') ?? undefined;
    const derivedFrom = url.searchParams.get('derivedFrom') ?? undefined;
    const attachment = await inputs.save(data, req.headers['content-type'], {
      ...(name !== undefined ? { name } : {}),
      ...(derivedFrom !== undefined && derivedFrom !== '' ? { derivedFrom } : {}),
    });
    json(res, 201, { attachment } satisfies UploadAttachmentResponse);
    return true;
  }
  if (id === undefined) return false;
  if (method === 'GET' && action === undefined) {
    const img = await inputs.image(id);
    res.writeHead(200, { 'content-type': img.mime, 'cache-control': 'private, max-age=86400' });
    res.end(img.data);
    return true;
  }
  if (method === 'GET' && action === 'info' && parts.length === 4) {
    json(res, 200, inputs.info(id) satisfies AttachmentInfoResponse);
    return true;
  }
  if (method === 'POST' && action === 'transcribe' && parts.length === 4) {
    json(res, 200, { transcription: await inputs.transcribe(id) } satisfies TranscribeResponse);
    return true;
  }
  return false;
}

async function readBody(req: IncomingMessage, max: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req as AsyncIterable<Buffer>) {
    size += chunk.length;
    if (size > max) throw new InputError(413, `图片太大（最多 ${String(max / 1024 / 1024)} MB）`);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function json(res: ServerResponse, status: number, body: object): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}
