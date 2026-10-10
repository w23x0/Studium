// 验收：教学工具（M10 通用策略知识层，批 7）。
// - 一份教学工具 = 一个 Markdown 文件；官方的在 教学工具/，学习者自己的在数据目录 teaching-tools/；
// - 闭环对话有两个工具：列出可用教学工具、按名取一份全文；
// - 闭环取用了哪几份由程序从工具调用里记下（M10 记录的 toolsUsed），不由模型自报。只经 HTTP 验证。
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type {
  StrategiesResponse,
  TeachingToolResponse,
  TeachingToolsResponse,
} from '../../src/shared/protocol.ts';
import type { NumberedRecord } from '../../src/shared/records.ts';
import { createApp, type App } from '../../src/core/app.ts';
import { FakeModel, type FakeContext, type FakeStep } from '../../src/core/model/fake.ts';
import { call, getJson, post, TOKEN, waitFor } from '../helpers/http.ts';
import { cardAfter, settled } from '../helpers/evidence-flow.ts';
import { DISPLACEMENT_OPTION, learnerLine, roleOf } from '../helpers/roles.ts';
import { tempDir } from '../helpers/tmp.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

const OWN = `# 我的老办法

- 适用条件：学习者想用生活里的例子讲给别人听时
- 来源：学习者自己
- 状态：学习者自己写的

## 做法
让学习者讲给一个外行听。

## 怎么引出证据
外行听不懂的地方就是还没想清的地方。

## 注意边界
不替学习者讲。
`;

function responder(ctx: FakeContext): FakeStep | undefined {
  const line = learnerLine(ctx.input.text, '终点减起点');
  switch (roleOf(ctx)) {
    case 'm05':
      return {
        calls: [
          { name: 'submit_choice_card', args: { options: [DISPLACEMENT_OPTION], recommended: 0 } },
        ],
      };
    case 'loop':
      if (ctx.input.role === 'program' && ctx.turn === 0) {
        return {
          calls: [
            { name: 'list_teaching_tools', args: {} },
            { name: 'read_teaching_tool', args: { name: '提取练习' } },
            { name: 'read_teaching_tool', args: { name: '我的老办法' } },
            { name: 'read_teaching_tool', args: { name: '提取练习' } },
            { name: 'read_teaching_tool', args: { name: '不存在的工具' } },
          ],
          text: '我们开始。',
        };
      }
      return { text: '好。' };
    case 'guard':
      return {
        calls: [
          {
            name: 'submit_verdict',
            args: { closed: true, basis: '说清了', evidence_lines: [line] },
          },
        ],
      };
    case 'm09':
      return {
        calls: [
          {
            name: 'write_formation_record',
            args: {
              new_point: 'p-displacement',
              clause: 'c-disp-from-pos',
              start_points: ['p-position'],
              understanding: '位移只看起点终点',
              process: '自己说',
              unmet: '',
              evidence_strength: '当场、独立',
              evidence_lines: [line],
            },
          },
        ],
      };
    case 'm10':
      if (ctx.input.role !== 'program') return { text: '好' };
      return {
        calls: [
          {
            name: 'write_strategy_record',
            args: {
              conditions: '状态未知',
              strategies: '先让学习者提取',
              followed_by: '说清了',
              evidence_lines: [line],
            },
          },
        ],
      };
    default:
      return undefined;
  }
}

describe('教学工具', () => {
  it('官方与学习者自己的都能列出、按名取全文；闭环取用了哪几份由程序记下', async () => {
    const dataRoot = await tempDir();
    await mkdir(join(dataRoot, 'teaching-tools'), { recursive: true });
    await writeFile(join(dataRoot, 'teaching-tools', '我的老办法.md'), OWN);
    await writeFile(join(dataRoot, 'teaching-tools', '坏文件.md'), '随手写的，没有格式');
    const fake = new FakeModel({ responder });
    const app = await createApp({ dataRoot, model: fake, token: TOKEN, port: 0 });
    apps.push(app);
    const mainId = await app.studium.ensureMain();

    // 界面能读的列表与全文
    const list = await getJson<TeachingToolsResponse>(app, '/teaching-tools');
    const official = list.tools.filter((t) => t.origin === '官方');
    expect(official.length).toBeGreaterThanOrEqual(6);
    expect(official.length).toBeLessThanOrEqual(10);
    for (const t of official) {
      expect(t.applies.length).toBeGreaterThan(0);
      expect(t.source.length).toBeGreaterThan(0);
      expect(t.status).toContain('agent 起草');
    }
    const names = list.tools.map((t) => t.name);
    expect(names).toContain('脚手架追问顺序');
    expect(names).toContain('提取练习');
    expect(names).toContain('阈值概念卡住时调强度');
    const own = list.tools.find((t) => t.name === '我的老办法');
    expect(own?.origin).toBe('学习者自己');
    expect(list.problems.join('\n')).toContain('坏文件');
    const one = await getJson<TeachingToolResponse>(
      app,
      `/teaching-tools/${encodeURIComponent('提取练习')}`,
    );
    expect(one.tool.text).toContain('做法');
    expect(one.tool.text).toContain('怎么引出证据');
    expect(one.tool.text).toContain('注意边界');
    expect((await call(app, `/teaching-tools/${encodeURIComponent('没有这份')}`)).status).toBe(404);

    // 闭环里：列出、按名取
    await post(app, '/cards/request', { projectId: mainId });
    const card = await cardAfter(app, mainId, 0);
    const loopId = (
      (await (await post(app, `/cards/${card}/choose`, { option: 0 })).json()) as {
        loopSessionId: string;
      }
    ).loopSessionId;
    const loopRecs = await settled(app, loopId);
    const tools = loopRecs.flatMap((r: NumberedRecord) =>
      r.record.type === 'tool_call' ? [{ line: r.line, ...r.record }] : [],
    );
    const listed = tools.find((t) => t.name === 'list_teaching_tools');
    expect(listed?.result).toContain('脚手架追问顺序');
    expect(listed?.result).toContain('我的老办法');
    expect(listed?.result).toContain('坏文件');
    const reads = tools.filter((t) => t.name === 'read_teaching_tool');
    expect(reads.map((t) => t.isError)).toEqual([false, false, false, true]);
    expect(reads[0]?.result).toContain('怎么引出证据');
    expect(reads[1]?.result).toContain('让学习者讲给一个外行听');

    // 学完后 M10 的记录里有程序记下的取用，不是模型报的
    await post(app, `/sessions/${loopId}/messages`, { text: '位移就是终点减起点' });
    await settled(app, loopId);
    await post(app, `/sessions/${loopId}/close-request`);
    await waitFor('判完了', async () =>
      (
        await getJson<{ records: NumberedRecord[] }>(app, `/sessions/${loopId}/records`)
      ).records.some((r) => r.record.type === 'guard_verdict'),
    );
    await settled(app, loopId);
    expect((await post(app, `/sessions/${loopId}/confirm-close`)).status).toBe(202);
    await app.studium.settled();

    const m10 = await getJson<StrategiesResponse>(app, `/m10/records?loop=${loopId}`);
    expect(m10.records).toHaveLength(1);
    const rec = m10.records[0];
    expect(rec?.toolsUsed).toEqual(['提取练习', '我的老办法']);
    expect(rec?.toolUses?.map((u) => u.name)).toEqual(['提取练习', '我的老办法', '提取练习']);
    expect(rec?.toolUses?.map((u) => u.line)).toEqual(
      reads.filter((t) => !t.isError).map((t) => t.line),
    );
    const sessions = await getJson<{ sessions: { sessionId: string; kind: string }[] }>(
      app,
      '/sessions',
    );
    const m10Id = sessions.sessions.find((s) => s.kind === 'm10')?.sessionId ?? '';
    const opening = (await settled(app, m10Id)).find((r) => r.record.type === 'program_fact');
    const text = opening?.record.type === 'program_fact' ? opening.record.text : '';
    expect(text).toContain('教学工具使用记录');
    expect(text).toContain('提取练习');
    expect(text).not.toContain('不存在的工具');
  });
});
