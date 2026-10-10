// 验收：M14 的“写产出”任务对话——主对话在学习者消息下开它（新会话类），里面读得到 M07 / M08 的只读工具和
// 写产出新版本、登记文献的工具；模型写入时程序记“模型协助”和对话 id；引用对不上时工具结果里点出；
// 学习者也能直接经接口存自己写的版本；外发披露里列出这类会话。只经 HTTP 验证。
import { afterEach, describe, expect, it } from 'vitest';
import { formatCitation } from '../../src/shared/citation.ts';
import type { DisclosureResponse } from '../../src/shared/protocol.ts';
import type {
  LiteratureListResponse,
  OutputResponse,
  VersionsResponse,
} from '../../src/shared/m14.ts';
import type { NumberedRecord } from '../../src/shared/records.ts';
import type { App } from '../../src/core/app.ts';
import type { FakeContext, FakeStep } from '../../src/core/model/fake.ts';
import { getJson, post, records, waitFor } from '../helpers/http.ts';
import { BOOK, saveVersion, startOutputsApp } from '../helpers/outputs.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

const cite = formatCitation({ book: BOOK, file: 'ch01/sec-1.2.md', from: 3, to: 4 });

function responder(ctx: FakeContext): FakeStep | undefined {
  const has = (name: string) => ctx.spec.tools.some((t) => t.name === name);
  if (has('open_output_task')) {
    if (ctx.input.role === 'learner' && ctx.input.text.includes('想写')) {
      return {
        calls: [
          {
            name: 'open_output_task',
            args: { title: '速度笔记', kind: '笔记整理', brief: '整理平均速度' },
          },
        ],
        text: '我们单独开一个对话来写。',
      };
    }
    return { text: '好。' };
  }
  if (has('save_output_version')) {
    if (ctx.input.role === 'program') return { text: '想从哪里写起？' };
    if (ctx.input.text.includes('存第一版')) {
      return {
        calls: [
          { name: 'read_output', args: {} },
          {
            name: 'save_output_version',
            args: {
              text: `平均速度是位移除以时间${cite}；另一处引用没核对【知识点|p-nope】。`,
              note: '第一版',
            },
          },
          {
            name: 'add_literature',
            args: { book: BOOK, relation: '整份笔记依据的教材', relation_kind: '支持' },
          },
        ],
        text: '存好了。',
      };
    }
    if (ctx.input.text.includes('存第二版')) {
      return {
        calls: [
          {
            name: 'save_output_version',
            args: { text: `平均速度是位移除以时间${cite}。`, note: '去掉对不上的引用', base: 1 },
          },
        ],
        text: '改好了。',
      };
    }
    if (ctx.input.text.includes('查点')) {
      return { calls: [{ name: 'get_point', args: { point: 'p-displacement' } }] };
    }
  }
  return undefined;
}

async function idle(app: App, id: string): Promise<NumberedRecord[]> {
  return waitFor(`${id} 停下`, async () => {
    const r = await getJson<{ records: NumberedRecord[]; running: boolean }>(
      app,
      `/sessions/${id}/records`,
    );
    return r.running ? undefined : r.records;
  });
}

async function openTask(app: App, mainId: string): Promise<{ taskId: string; askedLine: number }> {
  await post(app, `/sessions/${mainId}/messages`, { text: '我想写一份平均速度的笔记' });
  const opened = await waitFor('开出写产出对话', async () => {
    const rs = await idle(app, mainId);
    const t = rs.find((r) => r.record.type === 'task_opened');
    return t?.record.type === 'task_opened' ? t.record : undefined;
  });
  await idle(app, opened.sessionId);
  return { taskId: opened.sessionId, askedLine: opened.anchorLine };
}

describe('写产出对话', () => {
  it('主对话在学习者消息下开写产出对话；对话开场交产出物；会话类是“写产出”', async () => {
    const { app, mainId } = await startOutputsApp({ responder });
    apps.push(app);
    const { taskId, askedLine } = await openTask(app, mainId);
    const main = await records(app, mainId);
    const asked = main.find((r) => r.line === askedLine);
    expect(asked?.record.type === 'user_message' && asked.record.text).toContain('想写');
    const sessions = (
      await getJson<{ sessions: { sessionId: string; kind: string; parent?: string }[] }>(
        app,
        '/sessions',
      )
    ).sessions;
    expect(sessions.find((s) => s.sessionId === taskId)).toMatchObject({
      kind: 'output',
      parent: mainId,
    });
    const rs = await idle(app, taskId);
    const opening = rs.find((r) => r.record.type === 'program_fact');
    const text = opening?.record.type === 'program_fact' ? opening.record.text : '';
    expect(text).toContain('速度笔记');
    expect(text).toContain('还没有版本');
    expect(text).toContain('整理平均速度');
    // 产出物已建在项目下，对话与它绑定
    const outputs = (
      await getJson<{ outputs: { id: string; title: string }[] }>(
        app,
        `/projects/${mainId}/outputs`,
      )
    ).outputs;
    expect(outputs.map((o) => o.title)).toEqual(['速度笔记']);
    const detail = (await getJson<OutputResponse>(app, `/outputs/${outputs[0]?.id}`)).output;
    expect(detail.tasks.map((t) => t.sessionId)).toEqual([taskId]);
  });

  it('模型存的版本由程序记“模型协助”和对话 id；对不上的引用在工具结果里点出；也能登记文献', async () => {
    const { app, mainId } = await startOutputsApp({ responder });
    apps.push(app);
    const { taskId } = await openTask(app, mainId);
    await post(app, `/sessions/${taskId}/messages`, { text: '存第一版' });
    const rs = await waitFor('第一版存好', async () => {
      const x = await idle(app, taskId);
      return x.some((r) => r.record.type === 'tool_call' && r.record.name === 'add_literature')
        ? x
        : undefined;
    });
    const calls = rs.flatMap((r) => (r.record.type === 'tool_call' ? [r.record] : []));
    const save = calls.find((c) => c.name === 'save_output_version');
    expect(save?.isError).toBe(false);
    expect(save?.result).toContain('已存为第 1 版');
    expect(save?.result).toContain('1 处对不上');
    expect(save?.result).toContain('p-nope');
    expect(calls.find((c) => c.name === 'read_output')?.result).toContain('还没有任何版本');

    const outputs = (
      await getJson<{ outputs: { id: string }[] }>(app, `/projects/${mainId}/outputs`)
    ).outputs;
    const id = outputs[0]?.id ?? '';
    const v1 = (await getJson<VersionsResponse>(app, `/outputs/${id}/versions`)).versions[0];
    expect(v1).toMatchObject({ n: 1, by: '模型协助', session: taskId, note: '第一版' });
    const lit = (await getJson<LiteratureListResponse>(app, `/outputs/${id}/literature`))
      .literature;
    expect(lit[0]).toMatchObject({
      by: '模型协助',
      session: taskId,
      source: 'library',
      relationKind: '支持',
    });

    // 学习者自己直接存一版：记“学习者”；模型再基于过期的第 1 版存会被拒绝
    await saveVersion(app, id, { text: '学习者自己改的', note: '手改' });
    await post(app, `/sessions/${taskId}/messages`, { text: '存第二版' });
    const after = await waitFor('第二版被拒', async () => {
      const x = await idle(app, taskId);
      return x.filter(
        (r) => r.record.type === 'tool_call' && r.record.name === 'save_output_version',
      ).length >= 2
        ? x
        : undefined;
    });
    const second = after
      .flatMap((r) => (r.record.type === 'tool_call' ? [r.record] : []))
      .filter((c) => c.name === 'save_output_version')[1];
    expect(second?.isError).toBe(true);
    expect(second?.result).toContain('更新的版本');
    const list = (await getJson<VersionsResponse>(app, `/outputs/${id}/versions`)).versions;
    expect(list.map((v) => [v.n, v.by])).toEqual([
      [1, '模型协助'],
      [2, '学习者'],
    ]);
  });

  it('写产出对话读得到 M08（只读工具），读不到 M09 和别的写工具', async () => {
    const { app, mainId, model } = await startOutputsApp({ responder });
    apps.push(app);
    const { taskId } = await openTask(app, mainId);
    const spec = model.opened.find((s) => s.session?.id === taskId);
    const names = spec?.tools.map((t) => t.name) ?? [];
    expect(names).toEqual(
      expect.arrayContaining([
        'get_point',
        'search_points',
        'read_source',
        'search_textbook',
        'read_output',
        'save_output_version',
        'add_literature',
      ]),
    );
    expect(names).not.toContain('query_m09');
    expect(names).not.toContain('request_close');
    expect(names).not.toContain('settle_goal');
    await post(app, `/sessions/${taskId}/messages`, { text: '查点' });
    const rs = await waitFor('查点', async () => {
      const x = await idle(app, taskId);
      return x.some((r) => r.record.type === 'tool_call' && r.record.name === 'get_point')
        ? x
        : undefined;
    });
    const call = rs.find((r) => r.record.type === 'tool_call' && r.record.name === 'get_point');
    expect(call?.record.type === 'tool_call' && call.record.result).toContain('位移');
  });

  it('外发披露里列出写产出这类会话的模型与强度；原来八类不变', async () => {
    const { app } = await startOutputsApp();
    apps.push(app);
    const d = await getJson<DisclosureResponse>(app, '/disclosure');
    expect(d.sessions.map((s) => s.kind)).not.toContain('output');
    expect(d.laterSessions).toEqual([
      { kind: 'output', label: '写产出', model: null, effort: null },
    ]);
    expect(d.sends.join('\n')).toContain('产出物');
  });
});
