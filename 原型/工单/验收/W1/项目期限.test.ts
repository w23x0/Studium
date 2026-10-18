// （W1 新版，取代旧的同名测试：交卡补 route_decision。）
// 验收：项目可记期限（可不填、可清掉、可改）；记录只追加；M05 开场带上期限。只经 HTTP 验证（假模型）。
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp, type App } from '../../src/core/app.ts';
import { FakeModel, type FakeContext, type FakeStep } from '../../src/core/model/fake.ts';
import type {
  ListProjectsResponse,
  ProjectDeadlineResponse,
  ProjectOverviewResponse,
} from '../../src/shared/protocol.ts';
import { call, getJson, post, records, TOKEN, waitFor } from '../helpers/http.ts';
import { DISPLACEMENT_OPTION, roleOf } from '../helpers/roles.ts';
import { tempDir } from '../helpers/tmp.ts';
import { navRoute } from './共用/w1-card.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

const responder = (ctx: FakeContext): FakeStep | undefined =>
  roleOf(ctx) === 'm05'
    ? {
        calls: [
          {
            name: 'submit_choice_card',
            args: {
              options: [
                { ...DISPLACEMENT_OPTION, sources: ['p-displacement'] },
                {
                  new_point: 'p-avg-velocity',
                  clause: 'c-avgv-from-disp',
                  start_points: [{ point: 'p-displacement', source: '假定' }],
                  route_action: '继续主线',
                  title: '平均速度',
                  reason: '另一条',
                  sources: ['p-avg-velocity'],
                },
              ],
              recommended: 0,
              route_decision: navRoute(ctx),
            },
          },
        ],
      }
    : undefined;

describe('验收：项目期限', () => {
  it('记 / 改 / 清；非法日期 400；项目列表与项目页带上；M05 开场带上', async () => {
    const dataRoot = await tempDir();
    const fake = new FakeModel({ responder });
    const app = await createApp({
      dataRoot,
      model: fake,
      token: TOKEN,
      port: 0,
      now: () => new Date('2026-10-10T08:00:00Z'),
    });
    apps.push(app);
    const mainId = await app.studium.ensureMain();
    const path = `/projects/${mainId}/deadline`;
    expect(await getJson<ProjectDeadlineResponse>(app, path)).toEqual({ mainSessionId: mainId });

    const set = (await (
      await post(app, path, { deadline: '2026-12-20', note: '期末考试' })
    ).json()) as ProjectDeadlineResponse;
    expect(set).toMatchObject({ deadline: '2026-12-20', deadlineNote: '期末考试', daysLeft: 71 });
    for (const bad of ['明天', '2026-13-01', '2026-02-30', 5]) {
      expect((await post(app, path, { deadline: bad })).status, String(bad)).toBe(400);
    }
    expect((await post(app, path, {})).status).toBe(400);
    expect((await call(app, '/projects/no-such-project/deadline')).status).toBe(404);

    const projects = await getJson<ListProjectsResponse>(app, '/projects');
    expect(projects.projects[0]?.deadline).toBe('2026-12-20');
    const overview = await getJson<ProjectOverviewResponse>(app, `/projects/${mainId}/overview`);
    expect(overview.overview).toMatchObject({ deadline: '2026-12-20', deadlineNote: '期末考试' });

    await post(app, '/cards/request', { projectId: mainId });
    await waitFor('出了卡', async () =>
      (await records(app, mainId)).some((r) => r.record.type === 'choice_card'),
    );
    const first = fake.inputs.filter((i) => i.text.includes('触发原因')).at(-1)?.text ?? '';
    expect(first).toContain('期限：2026-12-20（还有 71 天）；期末考试');

    // 清掉：不再显示；两次记录都在正本里（只追加）
    const cleared = (await (
      await post(app, path, { deadline: null })
    ).json()) as ProjectDeadlineResponse;
    expect(cleared.deadline).toBeUndefined();
    expect(
      (await getJson<ListProjectsResponse>(app, '/projects')).projects[0]?.deadline,
    ).toBeUndefined();
    const log = (await readFile(join(dataRoot, 'sessions', `${mainId}.jsonl`), 'utf8'))
      .split('\n')
      .filter((l) => l.includes('"project_deadline"'));
    expect(log).toHaveLength(2);
    await app.studium.settled();
    const after = (await records(app, mainId)).at(-1)?.line ?? 0;
    await post(app, '/cards/request', { projectId: mainId });
    await waitFor('又出了卡', async () =>
      (await records(app, mainId)).some((r) => r.line > after && r.record.type === 'choice_card'),
    );
    const second = fake.inputs.filter((i) => i.text.includes('触发原因')).at(-1)?.text ?? '';
    expect(second).toContain('期限：没有记');
  });

  it('过了期限：开场说已过几天', async () => {
    const fake = new FakeModel({ responder });
    const app = await createApp({
      dataRoot: await tempDir(),
      model: fake,
      token: TOKEN,
      port: 0,
      now: () => new Date('2026-10-10T08:00:00Z'),
    });
    apps.push(app);
    const mainId = await app.studium.ensureMain();
    const r = (await (
      await post(app, `/projects/${mainId}/deadline`, { deadline: '2026-10-08' })
    ).json()) as ProjectDeadlineResponse;
    expect(r.daysLeft).toBe(-2);
    await post(app, '/cards/request', { projectId: mainId });
    await waitFor('出了卡', async () =>
      (await records(app, mainId)).some((x) => x.record.type === 'choice_card'),
    );
    expect(fake.inputs.find((i) => i.text.includes('触发原因'))?.text).toContain('已过 2 天');
  });
});
