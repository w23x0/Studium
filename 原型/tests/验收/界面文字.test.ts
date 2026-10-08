// 验收：学习者在界面上看到的程序文字（对话里的提示、入口、操作报错）一律日常话，
// 不露“闭环 / 选择卡 / 守卫 / 出发点 / 子句”等内部词。走一遍完整主路径（假模型，模型的话也写成日常话），
// 把三个对话的记录按界面的转换规则（thread-model）转成可见文字再查。
import { afterEach, describe, expect, it } from 'vitest';
import type { ListProjectsResponse } from '../../src/shared/protocol.ts';
import type { NumberedRecord } from '../../src/shared/records.ts';
import { createApp, type App } from '../../src/core/app.ts';
import { FakeModel, type FakeContext, type FakeStep } from '../../src/core/model/fake.ts';
import { toUiMessages } from '../../src/ui/thread-model.ts';
import { goalTalkResponder } from '../helpers/goal-talk.ts';
import { getJson, post, records, TOKEN, waitFor } from '../helpers/http.ts';
import { tempDir } from '../helpers/tmp.ts';

const INTERNAL = [
  '闭环',
  '选择卡',
  '守卫',
  '出发点',
  '子句',
  '新点',
  '单子',
  '方向目标',
  '程序事实',
  'M0',
  'M1',
  'p-',
  'c-',
  'loop',
  'guard',
];

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

/** 从带行号的原文里找学习者说了某句话的那一行。 */
function learnerLine(text: string, says: string): number {
  const m = new RegExp(`L(\\d+) 学习者[^\\n]*${says}`).exec(text);
  return Number(m?.[1] ?? 0);
}

function responder(ctx: FakeContext): FakeStep | undefined {
  const has = (n: string) => ctx.spec.tools.some((t) => t.name === n);
  if (has('submit_choice_card')) {
    return {
      calls: [
        {
          name: 'submit_choice_card',
          args: {
            options: [
              {
                new_point: 'p-displacement',
                clause: 'c-disp-from-pos',
                start_points: [{ point: 'p-position', source: '假定' }],
                route_action: '继续主线',
                title: '位移',
                reason: '接着你已经会的位置往下学',
              },
            ],
            recommended: 0,
          },
        },
      ],
    };
  }
  if (has('submit_verdict')) {
    const line = learnerLine(ctx.input.text, '终点减起点');
    return {
      calls: [
        {
          name: 'submit_verdict',
          args: { closed: true, basis: `见 L${String(line)}`, evidence_lines: [line] },
        },
      ],
    };
  }
  if (has('write_formation_record')) {
    const line = learnerLine(ctx.input.text, '终点减起点');
    return {
      calls: [
        {
          name: 'write_formation_record',
          args: {
            new_point: 'p-displacement',
            clause: 'c-disp-from-pos',
            start_points: ['p-position'],
            understanding: '位移只看起点终点',
            process: '从走路的例子',
            unmet: '',
            evidence_strength: '当场、独立',
            evidence_lines: [line],
          },
        },
      ],
    };
  }
  if (has('request_close')) return { text: '我们从位置说起。你说说位移是什么？' };
  return goalTalkResponder(ctx);
}

async function settled(app: App, id: string): Promise<NumberedRecord[]> {
  return waitFor(`${id} 停下`, async () => {
    const r = await getJson<{ records: NumberedRecord[]; running: boolean }>(
      app,
      `/sessions/${id}/records`,
    );
    return r.running ? undefined : r.records;
  });
}

function visible(recs: NumberedRecord[]): string[] {
  return toUiMessages(recs, '').flatMap((m) => [m.text, m.link?.label ?? '']);
}

describe('界面文字不露内部词', () => {
  it('走完一遍主路径，界面上程序给的文字与操作报错都是日常话', async () => {
    const app = await createApp({
      dataRoot: await tempDir(),
      model: new FakeModel({ responder }),
      token: TOKEN,
      port: 0,
    });
    apps.push(app);
    const [project] = (await getJson<ListProjectsResponse>(app, '/projects')).projects;
    if (!project) throw new Error('没有项目');
    const mainId = project.mainSessionId;
    const errors: string[] = [];
    const errorOf = async (res: Response) => {
      expect(res.status).toBe(400);
      errors.push(((await res.json()) as { error: string }).error);
    };

    await post(app, `/sessions/${mainId}/messages`, { text: '我想学力学' });
    const talkId = await waitFor('开出谈方向的对话', async () => {
      const r = (await records(app, mainId)).find((x) => x.record.type === 'task_opened');
      return r?.record.type === 'task_opened' ? r.record.sessionId : undefined;
    });
    await settled(app, talkId);
    await post(app, `/sessions/${talkId}/messages`, { text: '能自己推导就行' });
    await settled(app, talkId);
    await settled(app, mainId);

    await post(app, '/cards/request', { projectId: mainId });
    const cardId = await waitFor('出了选择', async () => {
      const r = (await records(app, mainId)).find((x) => x.record.type === 'choice_card');
      return r?.record.type === 'choice_card' ? r.record.cardId : undefined;
    });
    const chosen = await post(app, `/cards/${cardId}/choose`, { option: 0 });
    const { loopSessionId: loopId } = (await chosen.json()) as { loopSessionId: string };
    await settled(app, loopId);

    await errorOf(await post(app, `/sessions/${loopId}/confirm-close`));
    await post(app, `/sessions/${loopId}/messages`, { text: '位移就是终点减起点' });
    await settled(app, loopId);
    await post(app, `/sessions/${loopId}/close-request`);
    await waitFor('判完了', async () =>
      (await records(app, loopId)).some((r) => r.record.type === 'guard_verdict'),
    );
    await settled(app, loopId);
    expect((await post(app, `/sessions/${loopId}/confirm-close`)).status).toBe(202);
    await waitFor('下一次的选项出来了', async () =>
      (await records(app, loopId)).some(
        (r) => r.record.type === 'after_loop_step' && r.record.step === 'card_ready',
      ),
    );
    await errorOf(await post(app, `/sessions/${loopId}/end`));
    await errorOf(await post(app, `/sessions/${loopId}/messages`, { text: '还在吗' }));
    await errorOf(await post(app, `/sessions/${talkId}/messages`, { text: '还在吗' }));

    const texts = [
      ...visible(await settled(app, mainId)),
      ...visible(await settled(app, talkId)),
      ...visible(await settled(app, loopId)),
      ...errors,
    ];
    expect(texts.length).toBeGreaterThan(10);
    const leaks = texts.filter((t) => INTERNAL.some((w) => t.includes(w)));
    expect(leaks).toEqual([]);
  });
});
