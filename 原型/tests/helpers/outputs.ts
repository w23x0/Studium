// 产出物验收测试共用：起一个用样例书库的核心（假模型），经 HTTP 建产出物、存版本。
import { expect } from 'vitest';
import { createApp, SAMPLE_DIR, type App } from '../../src/core/app.ts';
import { FakeModel, type FakeOptions } from '../../src/core/model/fake.ts';
import type {
  CreateOutputRequest,
  OutputResponse,
  SaveVersionRequest,
  VersionResponse,
} from '../../src/shared/output.ts';
import { join } from 'node:path';
import { call, post, TOKEN } from './http.ts';
import { tempDir } from './tmp.ts';

export const BOOK = '力学入门样例';

export async function startOutputsApp(
  options: FakeOptions = {},
): Promise<{ app: App; mainId: string; model: FakeModel }> {
  const model = new FakeModel(options);
  const app = await createApp({
    dataRoot: await tempDir(),
    model,
    token: TOKEN,
    port: 0,
    library: join(SAMPLE_DIR, '书库'),
  });
  return { app, mainId: await app.studium.ensureMain(), model };
}

export async function createOutput(
  app: App,
  mainId: string,
  req: CreateOutputRequest,
): Promise<OutputResponse['output']> {
  const res = await post(app, `/projects/${mainId}/outputs`, req);
  expect(res.status).toBe(201);
  return ((await res.json()) as OutputResponse).output;
}

export async function saveVersion(
  app: App,
  outputId: string,
  req: SaveVersionRequest,
): Promise<VersionResponse['version']> {
  const res = await post(app, `/outputs/${outputId}/versions`, req);
  expect(res.status).toBe(201);
  return ((await res.json()) as VersionResponse).version;
}

export async function status(app: App, path: string, body?: object): Promise<number> {
  return (await (body === undefined ? call(app, path) : post(app, path, body))).status;
}
