// 验收：学习者用图片 / 拍照（手写）输入（M02:19）——原图只追加地保存、不改原件；经模型接口转写成文字
// （假模型给固定转写）；学习者改过的转写随消息进对话，正本记原图 id、转写原文、发出的文字与转写用的实际模型；
// 接口不支持转写时如实说明（总览:265 降级可见）；外发披露写明图片转写与语音送往哪里（总览:266）。只经 HTTP 验证。
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type {
  AttachmentInfoResponse,
  DisclosureResponse,
  ProjectResponse,
  TranscribeResponse,
  UploadAttachmentResponse,
} from '../../src/shared/protocol.ts';
import type { NumberedRecord } from '../../src/shared/records.ts';
import { createApp, type App } from '../../src/core/app.ts';
import { FakeModel } from '../../src/core/model/fake.ts';
import type { ModelAdapter } from '../../src/core/model/port.ts';
import { getJson, post, records, TOKEN, waitFor } from '../helpers/http.ts';
import { tempDir } from '../helpers/tmp.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

/** 一张 1×1 的 PNG（当作学习者拍的手写）。 */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

async function boot(root: string, model: ModelAdapter = new FakeModel()): Promise<App> {
  const app = await createApp({ dataRoot: root, model, token: TOKEN, port: 0 });
  apps.push(app);
  return app;
}

function upload(app: App, body: Buffer, type: string, query = ''): Promise<Response> {
  return fetch(`${app.server.url}/api/attachments${query}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${TOKEN}`, 'content-type': type },
    body: new Uint8Array(body),
  });
}

async function uploaded(app: App, query = '?name=%E6%89%8B%E5%86%99.png') {
  const res = await upload(app, PNG, 'image/png', query);
  expect(res.status).toBe(201);
  return ((await res.json()) as UploadAttachmentResponse).attachment;
}

async function transcribe(app: App, id: string) {
  const res = await post(app, `/attachments/${id}/transcribe`);
  expect(res.status).toBe(200);
  return ((await res.json()) as TranscribeResponse).transcription;
}

function learnerMessages(recs: NumberedRecord[]) {
  return recs.flatMap((r) => (r.record.type === 'user_message' ? [r.record] : []));
}

describe('图片 / 拍照输入经转写进对话', () => {
  it('上传 → 原图原样保存 → 转写 → 改过的转写随消息进对话 → 正本记原图、转写原文与模型', async () => {
    const root = await tempDir();
    const fake = new FakeModel();
    const app = await boot(root, fake);
    const mainId = (await getJson<ProjectResponse>(app, '/project')).mainSessionId;

    const att = await uploaded(app);
    expect(att).toMatchObject({ mime: 'image/png', size: PNG.length, name: '手写.png' });
    expect(att.url).toBe(`/api/attachments/${att.id}`);
    // 原图原样取回
    const img = await fetch(`${app.server.url}${att.url}?token=${TOKEN}`);
    expect(img.status).toBe(200);
    expect(img.headers.get('content-type')).toBe('image/png');
    expect(Buffer.from(await img.arrayBuffer()).equals(PNG)).toBe(true);

    const tr = await transcribe(app, att.id);
    expect(tr).toMatchObject({
      attachmentId: att.id,
      text: FakeModel.TRANSCRIPT,
      model: { name: FakeModel.MODEL_NAME, known: true },
    });
    const info = await getJson<AttachmentInfoResponse>(app, `/attachments/${att.id}/info`);
    expect(info.transcriptions.map((t) => t.id)).toEqual([tr.id]);

    // 学习者发送前改了转写
    const edited = `${FakeModel.TRANSCRIPT}，其中 $a$ 是常量`;
    const res = await post(app, `/sessions/${mainId}/messages`, {
      text: '这是我手写的推导',
      images: [{ attachmentId: att.id, transcriptionId: tr.id, text: edited }],
    });
    expect(res.status).toBe(202);
    const recs = await waitFor('回复', async () => {
      const r = await records(app, mainId);
      return r.some((x) => x.record.type === 'assistant_message') ? r : undefined;
    });
    const said = learnerMessages(recs).at(-1);
    expect(said?.text).toContain('这是我手写的推导');
    expect(said?.text).toContain(edited);
    expect(said?.images).toEqual([
      {
        attachmentId: att.id,
        transcriptionId: tr.id,
        transcript: FakeModel.TRANSCRIPT,
        sent: edited,
        model: FakeModel.MODEL_NAME,
      },
    ]);
    // 模型读到的是文字（含改过的转写），不是图片
    const seen = fake.inputs.map((i) => i.text).find((t) => t.includes('这是我手写的推导'));
    expect(seen).toContain(edited);

    // 重启后原图还在、没被改
    await apps.splice(0)[0]?.close();
    const again = await boot(root);
    const back = await fetch(`${again.server.url}${att.url}?token=${TOKEN}`);
    expect(Buffer.from(await back.arrayBuffer()).equals(PNG)).toBe(true);
    const stored = await getJson<AttachmentInfoResponse>(again, `/attachments/${att.id}/info`);
    expect(stored.attachment.sha256).toBe(att.sha256);
    const onDisk = await readFile(join(root, 'inputs', 'images', `${att.id}.png`));
    expect(onDisk.equals(PNG)).toBe(true);
  });

  it('只发图片不打字、没转写的图片也能发；转写用缩小副本时记明副本', async () => {
    const app = await boot(await tempDir());
    const mainId = (await getJson<ProjectResponse>(app, '/project')).mainSessionId;
    const original = await uploaded(app);
    const copy = await uploaded(app, `?derivedFrom=${original.id}`);
    expect(copy.derivedFrom).toBe(original.id);
    const tr = await transcribe(app, copy.id);
    const bare = await uploaded(app);

    const res = await post(app, `/sessions/${mainId}/messages`, {
      text: '',
      images: [
        { attachmentId: original.id, transcriptionId: tr.id },
        { attachmentId: bare.id, text: '一张受力图，斜面上一个木块' },
      ],
    });
    expect(res.status).toBe(202);
    const said = learnerMessages(await records(app, mainId)).at(-1);
    expect(said?.images?.[0]).toMatchObject({
      attachmentId: original.id,
      transcribedFrom: copy.id,
      transcript: FakeModel.TRANSCRIPT,
      sent: FakeModel.TRANSCRIPT,
    });
    expect(said?.images?.[1]).toEqual({
      attachmentId: bare.id,
      sent: '一张受力图，斜面上一个木块',
    });
    expect(said?.text).toContain(FakeModel.TRANSCRIPT);
    expect(said?.text).toContain('一张受力图');
  });

  it('不收的内容、对不上的引用：报错，不记', async () => {
    const app = await boot(await tempDir());
    const mainId = (await getJson<ProjectResponse>(app, '/project')).mainSessionId;
    expect((await upload(app, Buffer.from('hello'), 'text/plain')).status).toBe(415);
    expect((await upload(app, Buffer.alloc(0), 'image/png')).status).toBe(400);
    expect((await upload(app, PNG, 'image/png', '?derivedFrom=nope')).status).toBe(404);
    expect((await post(app, '/attachments/nope/transcribe')).status).toBe(404);

    const a = await uploaded(app);
    const b = await uploaded(app);
    const trB = await transcribe(app, b.id);
    const before = (await records(app, mainId)).length;
    // 转写不是这张图的
    expect(
      (
        await post(app, `/sessions/${mainId}/messages`, {
          text: 'x',
          images: [{ attachmentId: a.id, transcriptionId: trB.id }],
        })
      ).status,
    ).toBe(400);
    // 没有这张图
    expect(
      (
        await post(app, `/sessions/${mainId}/messages`, {
          text: 'x',
          images: [{ attachmentId: 'nope' }],
        })
      ).status,
    ).toBe(400);
    expect((await records(app, mainId)).length).toBe(before);
  });

  it('模型接口不支持转写：如实说明，原图照存', async () => {
    const fake = new FakeModel();
    const app = await boot(await tempDir(), {
      name: 'no-vision',
      open: (spec) => fake.open(spec),
    });
    const att = await uploaded(app);
    const res = await post(app, `/attachments/${att.id}/transcribe`);
    expect(res.status).toBe(501);
    expect(((await res.json()) as { error: string }).error).toContain('转写');
    const img = await fetch(`${app.server.url}${att.url}?token=${TOKEN}`);
    expect(img.status).toBe(200);
    const d = await getJson<DisclosureResponse>(app, '/disclosure');
    expect(d.inputs.find((i) => i.what.includes('图片'))?.service).toContain('不支持');
  });

  it('外发披露写明图片转写送往哪个服务、语音送往浏览器的语音服务', async () => {
    const app = await boot(await tempDir());
    const d = await getJson<DisclosureResponse>(app, '/disclosure');
    const image = d.inputs.find((i) => i.what.includes('图片'));
    const voice = d.inputs.find((i) => i.what.includes('语音'));
    expect(image?.service).toContain('不送往任何服务');
    expect(image?.model).toBe(FakeModel.MODEL_NAME);
    expect(voice?.service).toContain('浏览器');
    expect(d.sends.some((s) => s.includes('图片'))).toBe(true);
  });
});
