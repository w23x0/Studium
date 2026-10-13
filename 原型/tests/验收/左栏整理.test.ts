// 验收：左栏的整理操作——置顶 / 取消置顶、从列表删掉（只藏起来，数据不动）、对话改名、项目改名。
// 界面操作只追加到 <数据>/ui/sidebar.jsonl；项目改名在主对话里追加 project_title，开头那行不改；重启后都还在。
// 只经 HTTP 验证，模型是假模型。
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp, type App } from '../../src/core/app.ts';
import { FakeModel } from '../../src/core/model/fake.ts';
import type {
  ListProjectsResponse,
  ListSessionsResponse,
  ProjectResponse,
} from '../../src/shared/protocol.ts';
import type { SidebarResponse } from '../../src/shared/sidebar.ts';
import { getJson, post, TOKEN } from '../helpers/http.ts';
import { tempDir } from '../helpers/tmp.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

async function boot(root: string): Promise<App> {
  const a = await createApp({ dataRoot: root, model: new FakeModel(), token: TOKEN, port: 0 });
  apps.push(a);
  return a;
}

async function act(app: App, body: object): Promise<SidebarResponse['sidebar']> {
  const res = await post(app, '/sidebar', body);
  expect(res.status).toBe(200);
  return ((await res.json()) as SidebarResponse).sidebar;
}

describe('验收：左栏整理', () => {
  it('置顶、删掉（藏起来）、对话改名只追加记录；项目改名进主对话；重启后还在', async () => {
    const root = await tempDir();
    const a = await boot(root);
    const first = await a.studium.ensureMain();
    const second = ((await (await post(a, '/projects')).json()) as ProjectResponse).mainSessionId;
    const firstLine = (await readFile(join(root, 'sessions', `${first}.jsonl`), 'utf8')).split(
      '\n',
    )[0];

    expect(await getJson<SidebarResponse>(a, '/sidebar')).toEqual({
      sidebar: { pinned: [], hidden: [], titles: {} },
    });
    await act(a, { kind: 'project', id: first, action: 'pin' });
    await act(a, { kind: 'session', id: second, action: 'pin' });
    let view = await act(a, { kind: 'project', id: first, action: 'unpin' });
    expect(view.pinned).toEqual([{ kind: 'session', id: second }]);
    view = await act(a, { kind: 'session', id: second, action: 'rename', title: '  新对话名 ' });
    expect(view.titles).toEqual({ [second]: '新对话名' });
    view = await act(a, { kind: 'project', id: second, action: 'hide' });
    expect(view.hidden).toEqual([{ kind: 'project', id: second }]);

    // 项目改名：列表与对话列表里都换了名字，正本开头那行不动
    await act(a, { kind: 'project', id: first, action: 'rename', title: '力学' });
    const projects = (await getJson<ListProjectsResponse>(a, '/projects')).projects;
    expect(projects.find((p) => p.mainSessionId === first)?.title).toBe('力学');
    const sessions = (await getJson<ListSessionsResponse>(a, '/sessions')).sessions;
    expect(sessions.find((s) => s.sessionId === first)?.title).toBe('力学');
    expect(sessions.every((s) => typeof s.lastAt === 'string')).toBe(true);
    const lines = (await readFile(join(root, 'sessions', `${first}.jsonl`), 'utf8'))
      .split('\n')
      .filter((l) => l !== '');
    expect(lines[0]).toBe(firstLine);
    expect(JSON.parse(lines.at(-1) ?? '{}')).toMatchObject({
      type: 'project_title',
      title: '力学',
      source: 'learner',
    });

    // 藏起来的项目数据还在
    expect(projects.some((p) => p.mainSessionId === second)).toBe(true);

    // 界面操作只追加：每次一行
    const ui = (await readFile(join(root, 'ui', 'sidebar.jsonl'), 'utf8'))
      .split('\n')
      .filter((l) => l !== '');
    expect(ui.map((l) => (JSON.parse(l) as { action: string }).action)).toEqual([
      'pin',
      'pin',
      'unpin',
      'rename',
      'hide',
    ]);

    await a.close();
    apps.splice(0);
    const b = await boot(root);
    expect((await getJson<SidebarResponse>(b, '/sidebar')).sidebar).toEqual({
      pinned: [{ kind: 'session', id: second }],
      hidden: [{ kind: 'project', id: second }],
      titles: { [second]: '新对话名' },
    });
    expect(
      (await getJson<ListProjectsResponse>(b, '/projects')).projects.find(
        (p) => p.mainSessionId === first,
      )?.title,
    ).toBe('力学');
  });

  it('不合法的操作回 400，不记', async () => {
    const root = await tempDir();
    const a = await boot(root);
    const main = await a.studium.ensureMain();
    expect((await post(a, '/sidebar', { kind: 'project', id: 'nope', action: 'pin' })).status).toBe(
      400,
    );
    expect((await post(a, '/sidebar', { kind: 'session', id: main, action: 'drop' })).status).toBe(
      400,
    );
    expect(
      (await post(a, '/sidebar', { kind: 'session', id: main, action: 'rename', title: ' ' }))
        .status,
    ).toBe(400);
    expect((await getJson<SidebarResponse>(a, '/sidebar')).sidebar.pinned).toEqual([]);
  });
});
