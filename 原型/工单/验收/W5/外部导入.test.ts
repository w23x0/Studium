// 验收（W5 新版，取代 W2 的同名测试：settle_goal 换成 W5 形状）：外部导入（docs/设计/记录/学过的记录.md「外部导入」；
// 工单 README §2.5 Import）。程序在导入时写原样指针，存 <数据>/learned/imports.jsonl，标未验证，不经模型分析：
// 畅谈：settle_goal 的 known[] = { text, lines[] }（学习者的行）→ 每条一个 channel: 畅谈 的导入；引错行整次退回；
// 笔记：POST /library/notes/import 成功后写一条 channel: 笔记 的导入；失败不写；notes/extract 已删。
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp, type App } from '../../src/core/app.ts';
import { FakeModel } from '../../src/core/model/fake.ts';
import { post, records, TOKEN } from '../helpers/http.ts';
import { tempDir } from '../helpers/tmp.ts';
import {
  goals,
  goodGoal,
  newW5,
  openTalk,
  responder,
  talkSays,
  toolCalls,
  type Loose,
  type W5State,
} from './共用/w5-flow.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

const SAID = '微积分学过，会求导，就这么定了';

async function bootAt(st: W5State): Promise<{ app: App; mainId: string; root: string }> {
  const root = await tempDir();
  const app = await createApp({
    dataRoot: root,
    model: new FakeModel({ responder: responder(st) }),
    token: TOKEN,
    port: 0,
  });
  apps.push(app);
  st.mainId = await app.studium.ensureMain();
  return { app, mainId: st.mainId, root };
}

async function learned(app: App): Promise<{ learnings: Loose[]; imports: Loose[] }> {
  const r = await fetch(`${app.server.url}/api/learned`, {
    headers: { authorization: `Bearer ${TOKEN}` },
  });
  if (r.status !== 200) throw new Error(`GET /api/learned 回 ${String(r.status)}（接口还没有？）`);
  return (await r.json()) as { learnings: Loose[]; imports: Loose[] };
}

async function talkWithKnown(mode: 'good' | 'badLine') {
  const st = newW5();
  st.settle = (line) =>
    goodGoal({
      known: [
        { text: '学过一元微积分', lines: [mode === 'badLine' ? 1 : line] },
        { text: '会求导', lines: [line] },
      ],
    });
  const { app, mainId, root } = await bootAt(st);
  const talkId = await openTalk(app, mainId);
  await talkSays(app, talkId, SAID);
  return { app, mainId, talkId, root };
}

describe('外部导入：畅谈渠道', () => {
  it('known 每条一个“畅谈”导入：原样指针（会话 id + 学习者的行），标未验证', async () => {
    const { app, mainId, talkId, root } = await talkWithKnown('good');
    expect(
      (await records(app, talkId)).some((r) => r.record.type === 'talk_ended'),
      '方向交回了',
    ).toBe(true);
    expect(await goals(app, mainId), '方向目标写了').toHaveLength(1);
    const said = (await records(app, talkId)).find(
      (r) => r.record.type === 'user_message' && r.record.text === SAID,
    );
    const { imports } = await learned(app);
    expect(imports, '两条 known → 两条导入').toHaveLength(2);
    for (const x of imports) {
      expect(x, '畅谈导入 = 指向学习者原话行的指针，标未验证').toMatchObject({
        channel: '畅谈',
        ref: { session: talkId, lines: [said?.line] },
        unverified: true,
      });
      expect(Object.keys(x).sort(), '只存指针').toEqual(
        ['at', 'channel', 'id', 'ref', 'unverified'].sort(),
      );
    }
    const file = join(root, 'learned', 'imports.jsonl');
    expect(existsSync(file), '存在 <数据>/learned/imports.jsonl').toBe(true);
    expect((await readFile(file, 'utf8')).trim().split('\n'), '一行一条').toHaveLength(2);
  }, 20000);

  it('known 引的不是学习者的行：整次交回被退回，什么都不写', async () => {
    const { app, talkId, mainId } = await talkWithKnown('badLine');
    expect((await learned(app)).imports, '没有导入').toEqual([]);
    expect(
      (await records(app, talkId)).some((r) => r.record.type === 'talk_ended'),
      '畅谈没结束',
    ).toBe(false);
    expect(await goals(app, mainId), '方向没写进项目').toEqual([]);
    expect(
      (await toolCalls(app, talkId, 'settle_goal')).at(-1)?.isError,
      'settle_goal 被工具退回',
    ).toBe(true);
  }, 20000);
});

describe('外部导入：笔记渠道', () => {
  it('导入笔记成功后程序写一条“笔记”导入；失败不写；模型提点的接口没有了', async () => {
    const { app, root } = await bootAt(newW5());
    const dir = join(await tempDir(), '线性代数笔记');
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, '01向量.md'), '# 向量\n\n向量可以相加，也可以数乘。\n');
    const res = await post(app, '/library/notes/import', { path: dir });
    expect(res.status, '笔记导入照旧可用').toBe(201);
    const note = ((await res.json()) as { note: { id: string } }).note;

    const { imports, learnings } = await learned(app);
    expect(imports, '导入后有一条笔记导入').toHaveLength(1);
    expect(imports[0], '笔记导入 = 指向那份笔记，标未验证').toMatchObject({
      channel: '笔记',
      ref: { note: note.id },
      unverified: true,
    });
    expect(learnings, '外部导入不算一次学习').toEqual([]);
    expect(existsSync(join(root, 'learned', 'imports.jsonl')), '写进导入存放处').toBe(true);

    const bad = await post(app, '/library/notes/import', { path: join(dir, '没有') });
    expect(bad.status, '路径不存在：导入失败').not.toBe(201);
    expect((await learned(app)).imports, '失败的导入不写记录').toHaveLength(1);
    expect(
      (await post(app, '/library/notes/extract', { book: note.id })).status,
      'POST /library/notes/extract 已删',
    ).toBe(404);
  });
});
