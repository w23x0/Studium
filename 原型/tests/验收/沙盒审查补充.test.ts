// 验收（W4 审查补）：沙盒的路径核对跟着符号链接走，工作区里的“只读/…”不冒充只读区；
// 写失败的诊断不算诊断；同一次没合上的学习不能在两张卡上各开一次接着学。
// 设计：记录/读写权限.md「红线」；工单 W4 §5.1 §5.3 §5.10；工单 W3 §4.8。
import { mkdir, mkdtemp, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import { sandboxPermission } from '../../src/core/model/claude-agent-sdk.ts';
import { FakeModel } from '../../src/core/model/fake.ts';
import type { SandboxSpec } from '../../src/core/model/port.ts';
import { canRead, canWrite } from '../../src/core/model/sandbox-paths.ts';
import { post } from '../helpers/http.ts';
import { choose, endUnclosed, newW3, opt, requestCard, startW3 } from './共用/w3-flow.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

async function box(): Promise<{ sb: SandboxSpec; outside: string; tools: string }> {
  const root = await mkdtemp(join(tmpdir(), 'sb-review-'));
  const work = join(root, '工作区');
  const tools = join(root, '只读', '教学工具');
  const outside = join(root, '书库');
  await mkdir(work, { recursive: true });
  await mkdir(tools, { recursive: true });
  await mkdir(outside, { recursive: true });
  await writeFile(join(outside, '原文.md'), '书里的字');
  return {
    sb: { workdir: work, network: false, readOnly: [{ name: '教学工具', path: tools }] },
    outside,
    tools,
  };
}

async function actions(sb: SandboxSpec, sandbox: unknown[]): Promise<Record<string, unknown>[]> {
  const fake = new FakeModel({ script: [{ sandbox, text: '好' } as never] });
  const c = fake.open({ systemPrompt: '', tools: [], sandbox: sb });
  const out: Record<string, unknown>[] = [];
  for await (const ev of c.send({ role: 'learner', text: '开始' })) {
    if (ev.kind === 'sandbox_action') out.push({ ...ev.action });
  }
  return out;
}

describe('沙盒审查补充（W4）', () => {
  it('工作区里指向外面的符号链接：读写都不放行', async () => {
    const { sb, outside } = await box();
    await symlink(outside, join(sb.workdir, '链'));
    expect(canWrite(sb, join(sb.workdir, '链', '新.md')), '经链接写到外面').toBe(false);
    expect(canRead(sb, join(sb.workdir, '链', '原文.md')), '经链接读外面').toBe(false);
    const allow = sandboxPermission(sb);
    const opts = { signal: new AbortController().signal, suggestions: [] } as never;
    const w = await allow('Write', { file_path: '链/新.md', content: 'x' }, opts);
    expect(w?.behavior, 'SDK 的 Write 也拦').toBe('deny');
    const [a] = await actions(sb, [{ op: 'write', path: '链/新.md', content: 'x' }]);
    expect(a?.ok, '假模型也拦').toBe(false);
  });

  it('工作区里的“只读/…”不冒充只读区；写不了也读不了', async () => {
    const { sb } = await box();
    const fake = join(sb.workdir, '只读', '教学工具', '假的.md');
    const acts = await actions(sb, [
      { op: 'write', path: fake, content: 'x' },
      { op: 'read', path: fake },
      { op: 'write', path: '只读/不存在/x.md', content: 'y' },
      { op: 'write', path: '.', content: 'z' },
    ]);
    expect(acts.map((a) => a.ok)).toEqual([false, false, false, false]);
  });

  it('同一次没合上的学习在两张卡上：选了一张，另一张不能再开接着学', async () => {
    const st = newW3();
    const { app, mainId } = await startW3(st);
    apps.push(app);
    const a = await choose(app, (await requestCard(app, mainId)).cardId, 0);
    await endUnclosed(app, a, '先到这');
    st.nextOptions = [opt('接着甲', { route_action: '接着学', resume_of: a }), opt('换课甲')];
    const c1 = await requestCard(app, mainId);
    st.nextOptions = [opt('接着乙', { route_action: '接着学', resume_of: a }), opt('换课乙')];
    const c2 = await requestCard(app, mainId);
    await choose(app, c1.cardId, 0);
    expect((await post(app, `/cards/${c2.cardId}/choose`, { option: 0 })).status).toBe(400);
  });
});
