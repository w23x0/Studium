// API 凭据只在模型层读取，对外只交配置状态。
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { z } from 'zod';
import type {
  ConnectionInput,
  ConnectionView,
  Engine,
  ModelChoice,
} from '../../shared/model-settings.ts';

export interface ApiConnection {
  baseUrl: string;
  apiKey: string;
}
const connection = z.object({
  mode: z.enum(['login', 'api']),
  baseUrl: z.string().optional(),
  apiKey: z.string().optional(),
  revision: z.string(),
});
const fileSchema = z.object({ claude: connection, codex: connection });
export const connectionInput = z
  .object({
    mode: z.enum(['login', 'api']),
    baseUrl: z.string().max(2048).optional(),
    apiKey: z.string().max(8192).optional(),
    clear: z.boolean().optional(),
    revision: z.string(),
  })
  .strict();
export const API_EFFORTS: Record<Engine, string[]> = {
  claude: ['low', 'medium', 'high', 'xhigh', 'max'],
  codex: ['none', 'minimal', 'low', 'medium', 'high', 'xhigh'],
};

export class ApiConnections {
  private readonly file: string;
  private state: z.infer<typeof fileSchema>;
  constructor(root: string) {
    this.file = join(root, 'model-connections.json');
    this.state = existsSync(this.file)
      ? fileSchema.parse(JSON.parse(readFileSync(this.file, 'utf8')) as unknown)
      : {
          claude: { mode: 'login', revision: 'login' },
          codex: { mode: 'login', revision: 'login' },
        };
  }
  view(engine: Engine): ConnectionView {
    const c = this.state[engine];
    return { mode: c.mode, baseUrl: c.baseUrl ?? '', keySet: !!c.apiKey, revision: c.revision };
  }
  scope(engine: Engine): string | undefined {
    const c = this.state[engine];
    return c.mode === 'api'
      ? `api:${createHash('sha256')
          .update(c.baseUrl ?? '')
          .digest('hex')
          .slice(0, 24)}`
      : undefined;
  }
  api(engine: Engine): ApiConnection | undefined {
    const c = this.state[engine];
    if (c.mode !== 'api') return undefined;
    if (!c.baseUrl || !c.apiKey) throw new Error('请先在设置里填写 API URL 和 Key');
    return { baseUrl: c.baseUrl, apiKey: c.apiKey };
  }
  save(engine: Engine, input: ConnectionInput): void {
    const old = this.state[engine];
    if (input.revision !== old.revision) throw new Error('连接配置已改变，请刷新设置后重试');
    const next: z.infer<typeof connection> =
      input.clear === true
        ? { mode: 'login', revision: randomUUID() }
        : { ...old, mode: input.mode, revision: randomUUID() };
    if (input.clear !== true) {
      if (input.baseUrl !== undefined) next.baseUrl = normalizeUrl(input.baseUrl, engine);
      if (input.apiKey?.trim()) next.apiKey = input.apiKey.trim();
      if (next.mode === 'api' && (!next.baseUrl || !next.apiKey))
        throw new Error('API 方式需要填写 API URL 和 Key');
      if (old.baseUrl && old.baseUrl !== next.baseUrl && !input.apiKey?.trim())
        throw new Error('API URL 已改变，请填写这个地址对应的 Key');
    }
    const state = { ...this.state, [engine]: next };
    const temporary = `${this.file}.tmp`;
    writeFileSync(temporary, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
    renameSync(temporary, this.file);
    this.state = state;
  }
}

function normalizeUrl(raw: string, engine: Engine): string {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error('API URL 不是完整的网址');
  }
  if (
    !['https:', 'http:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error('API URL 需为 HTTP(S) 地址，不包含账号、查询参数或片段');
  let path = url.pathname.replace(/\/+$/, '');
  if (/\/(responses|messages|chat\/completions)$/.test(path))
    throw new Error('请填写 API 基础地址，不要包含 /responses、/messages 或 /chat/completions');
  if (engine === 'claude') path = path.replace(/\/v1$/, '');
  return `${url.origin}${path}`;
}

export async function apiModels(engine: Engine, api: ApiConnection): Promise<ModelChoice[]> {
  const suffix = engine === 'claude' ? '/v1/models' : '/models';
  const headers: Record<string, string> =
    engine === 'claude'
      ? { 'x-api-key': api.apiKey, 'anthropic-version': '2023-06-01' }
      : { authorization: `Bearer ${api.apiKey}` };
  const models: ModelChoice[] = [];
  let after: string | undefined;
  for (let page = 0; page < 20; page++) {
    const url = new URL(api.baseUrl + suffix);
    if (engine === 'claude') {
      url.searchParams.set('limit', '100');
      if (after !== undefined) url.searchParams.set('after_id', after);
    }
    let response: Response;
    try {
      response = await fetch(url, {
        headers,
        redirect: 'error',
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new Error('无法读取 API 模型列表，可在对话内手填模型 ID；请检查地址和网络');
    }
    if (!response.ok)
      throw new Error(`API 模型列表返回 HTTP ${response.status}，可手填模型 ID；请检查 Key 和权限`);
    let result: {
      data: { id: string; display_name?: string | undefined }[];
      has_more?: boolean | undefined;
      last_id?: string | null | undefined;
    };
    try {
      result = z
        .object({
          data: z.array(z.object({ id: z.string(), display_name: z.string().optional() })),
          has_more: z.boolean().optional(),
          last_id: z.string().nullish(),
        })
        .parse((await response.json()) as unknown);
    } catch {
      throw new Error('API 未提供兼容的模型列表，可在对话内手填模型 ID');
    }
    models.push(
      ...result.data.map((m) => ({
        id: m.id,
        label: m.display_name ?? m.id,
        efforts: API_EFFORTS[engine],
      })),
    );
    if (
      engine !== 'claude' ||
      result.has_more !== true ||
      !result.last_id ||
      result.last_id === after
    )
      break;
    after = result.last_id;
  }
  return [...new Map(models.map((m) => [m.id, m])).values()];
}
