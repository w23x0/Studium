import { connectionInput, API_EFFORTS } from '../model/api-connection.ts';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';
import type { ConversationModelSettings, ModelChoice } from '../../shared/model-settings.ts';
import { NotFoundError, type Hub } from '../hub.ts';
import { BadRequestError } from '../studium.ts';
import { engineSchema, selectionSchema, type ModelSettings } from '../model/settings.ts';

export async function modelRoute(
  req: IncomingMessage,
  res: ServerResponse,
  parts: string[],
  method: string,
  hub: Hub,
  models: ModelSettings | undefined,
): Promise<boolean> {
  const global = parts[1] === 'settings' && parts[2] === 'models';
  const session = parts[1] === 'sessions' && parts[3] === 'model-settings';
  if (!global && !session) return false;
  if (models === undefined) {
    send(res, 503, { error: '当前运行方式不提供模型设置' });
    return true;
  }
  try {
    if (global && parts.length === 3) {
      if (method === 'PUT') {
        const body = z
          .object({ engine: engineSchema })
          .strict()
          .parse(await readJson(req));
        models.setEngine(body.engine);
        hub.broadcast({ type: 'model_settings', sessionId: '' });
      } else if (method !== 'GET') return false;
      send(res, 200, await models.settings());
      return true;
    }
    if (global && parts.length === 5 && parts[4] === 'connection' && method === 'PUT') {
      models.setConnection(
        engineSchema.parse(parts[3]),
        connectionInput.parse(await readJson(req)),
      );
      send(res, 200, await models.settings());
      return true;
    }
    if (global && parts.length === 5 && method === 'POST') {
      const engine = engineSchema.parse(parts[3]);
      const action = z.enum(['login', 'logout', 'cancel']).parse(parts[4]);
      await models.accountAction(engine, action);
      hub.broadcast({ type: 'model_settings', sessionId: '' });
      send(res, 200, await models.settings());
      return true;
    }
    const id = parts[2];
    if (!session || id === undefined || parts.length !== 4) return false;
    const summary = hub.listSessions().find((s) => s.sessionId === id);
    if (summary === undefined) throw new NotFoundError('没有这个对话');
    if (method === 'PUT') {
      const body = z
        .object({ engine: engineSchema, selection: selectionSchema, revision: z.string() })
        .strict()
        .parse(await readJson(req));
      await models.setSelection(id, body.engine, body.selection, body.revision);
      hub.broadcast({ type: 'model_settings', sessionId: id });
    } else if (method !== 'GET') return false;
    const selected = hub.selectedModel(id, summary.kind);
    const engine = models.engineOf(selected.adapter.name);
    let choices: ModelChoice[] = [];
    let error: string | undefined;
    try {
      choices = await models.catalog(engine);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
    const active = hub.activeModel(id);
    const records = (await hub.records(id)).map((r) => r.record);
    const used = records.filter((r) => r.type === 'model_used').at(-1);

    const current =
      active !== undefined
        ? {
            engine: models.engineOf(active.name),
            ...(active.model !== undefined ? { model: active.model } : {}),
          }
        : used !== undefined
          ? { engine: models.engineOf(used.adapter), model: used.model }
          : undefined;
    const result: ConversationModelSettings = {
      engine,
      connection: models.connections.view(engine),
      efforts: models.connections.view(engine).mode === 'api' ? API_EFFORTS[engine] : [],
      selection: {
        ...(selected.model !== undefined ? { model: selected.model } : {}),
        ...(selected.effort !== undefined ? { effort: selected.effort } : {}),
      },
      models: choices,
      ...(current !== undefined ? { current } : {}),
      pending:
        active !== undefined
          ? active.key !== selected.key
          : used !== undefined &&
            (models.engineOf(used.adapter) !== engine ||
              used.connection !== selected.connection ||
              (used.selection !== undefined &&
                (used.selection.model !== selected.model ||
                  used.selection.effort !== selected.effort)) ||
              (used.selection === undefined &&
                selected.model !== undefined &&
                selected.model !== used.model &&
                !choices.some((m) => m.id === selected.model && m.resolvedModel === used.model))),
      ...(error !== undefined ? { error } : {}),
    };
    send(res, 200, result);
    return true;
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    throw new BadRequestError(error instanceof Error ? error.message : String(error));
  }
}

function send(res: ServerResponse, status: number, body: object): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}
async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req as AsyncIterable<Buffer>) {
    size += chunk.length;
    if (size > 16384) throw new BadRequestError('请求体太大');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
}
