// 工单 W4 §5.10 的单测：由 spec 算 SDK 的 options、沙盒的权限判定与沙盒动作映射。
// 只测纯函数，不开 SDK 会话、不调真模型。
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { sandboxActionOf, sandboxPermission, sdkOptionsFor } from './claude-agent-sdk.ts';
import type { ConversationSpec, SandboxSpec, ToolSpec } from './port.ts';

const ROOT = join('/tmp', 'w4-沙盒');
const WORK = join(ROOT, '工作区');
const TOOLS_DIR = join(ROOT, '只读', '教学工具');
const RECORDS = join(ROOT, '只读', '学过的记录');
const READ_ONLY_DIR = join(ROOT, '只读');

const sb: SandboxSpec = {
  workdir: WORK,
  readOnly: [
    { name: '教学工具', path: TOOLS_DIR },
    { name: '学过的记录', path: RECORDS },
    { name: '本次对话.md', path: join(READ_ONLY_DIR, '本次对话.md') },
    { name: '索引.md', path: join(READ_ONLY_DIR, '索引.md') },
  ],
  network: false,
};

const closeTool: ToolSpec = {
  name: 'request_close',
  description: '申请收口',
  input: {},
  run: () => Promise.resolve({ text: '好' }),
};

function spec(sandbox?: SandboxSpec): ConversationSpec {
  return {
    systemPrompt: '提示',
    tools: [closeTool],
    ...(sandbox !== undefined ? { sandbox } : {}),
    session: { id: 's1', kind: 'loop' },
  };
}

const DATA_CWD = join('/tmp', '数据目录');

describe('由 spec 算 SDK options', () => {
  it('没有沙盒：内置工具全关、cwd 照给、只挂我们的工具', () => {
    const o = sdkOptionsFor(spec(), { cwd: DATA_CWD });
    expect(o.tools).toEqual([]);
    expect(o.cwd).toBe(DATA_CWD);
    expect(o.sandbox).toBeUndefined();
    expect(o.canUseTool).toBeUndefined();
    expect(o.additionalDirectories).toBeUndefined();
    expect(o.permissionMode).toBeUndefined();
    expect(o.allowedTools).toEqual(['mcp__studium__request_close']);
    expect(o.settingSources).toEqual([]);
  });

  it('webSearch 为真：tools 与 allowedTools 只多出 WebSearch、WebFetch；为假或没带：两处都没有', () => {
    const list = (v: unknown): string[] =>
      Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
    const off = sdkOptionsFor(spec(), { cwd: DATA_CWD });
    const on = sdkOptionsFor({ ...spec(), webSearch: true }, { cwd: DATA_CWD });
    expect(list(on.tools)).toEqual([...list(off.tools), 'WebSearch', 'WebFetch']);
    expect(list(on.allowedTools)).toEqual([...list(off.allowedTools), 'WebSearch', 'WebFetch']);
    for (const s of [spec(), { ...spec(), webSearch: false }]) {
      const o = sdkOptionsFor(s, { cwd: DATA_CWD });
      expect(list(o.tools)).toEqual([]);
      expect(list(o.allowedTools)).not.toContain('WebSearch');
      expect(list(o.allowedTools)).not.toContain('WebFetch');
    }
  });

  it('有沙盒：开六个通用工具、cwd 落到工作区、只读目录进 additionalDirectories（去重）、不联网收紧', () => {
    const o = sdkOptionsFor(spec(sb), { cwd: DATA_CWD });
    expect(o.tools).toEqual(['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash']);
    expect(o.cwd).toBe(WORK);
    const dirs = o.additionalDirectories ?? [];
    expect(dirs).toContain(TOOLS_DIR);
    expect(dirs).toContain(RECORDS);
    expect(dirs).toContain(READ_ONLY_DIR);
    expect(new Set(dirs).size, '不重复').toBe(dirs.length);
    expect(o.permissionMode).toBe('default');
    expect(o.sandbox?.enabled).toBe(true);
    expect(o.sandbox?.autoAllowBashIfSandboxed).toBe(true);
    expect(o.sandbox?.allowUnsandboxedCommands).toBe(false);
    expect(o.sandbox?.network?.strictAllowlist).toBe(true);
    expect(o.sandbox?.network?.allowedDomains).toEqual([]);
    expect(o.sandbox?.filesystem?.allowWrite).toEqual([WORK]);
    expect(o.sandbox?.filesystem?.allowRead).toEqual([WORK, ...sb.readOnly.map((e) => e.path)]);
    expect(o.sandbox?.filesystem?.denyRead).toEqual([DATA_CWD]);
    expect(o.allowedTools).toEqual(['mcp__studium__request_close']);
  });
});

describe('沙盒的权限判定', () => {
  const check = sandboxPermission(sb);
  const opts = { signal: new AbortController().signal, toolUseID: 't1', requestId: 'r1' };
  const perm = async (name: string, input: Record<string, unknown>): Promise<string> => {
    const r = await check(name, input, opts);
    if (r === null) throw new Error('不该返回 null');
    return r.behavior;
  };

  it('写工作区放行；越界写与只读区都拒', async () => {
    expect(await perm('Write', { file_path: join(WORK, '诊断.md') })).toBe('allow');
    expect(await perm('Write', { file_path: join(WORK, '..', 'x.md') })).toBe('deny');
    expect(await perm('Write', { file_path: join(TOOLS_DIR, '提取练习.md') })).toBe('deny');
    expect(await perm('Edit', { file_path: join(RECORDS, 'l1.md'), old_string: 'a' })).toBe('deny');
    const denied = await check('Edit', { file_path: join(RECORDS, 'l1.md') }, opts);
    expect(denied?.behavior === 'deny' ? denied.message : '').toContain('不能写');
  });

  it('读：只读区与工作区放行，别处拒；Glob 不给路径时按工作区算', async () => {
    expect(await perm('Read', { file_path: join(TOOLS_DIR, '提取练习.md') })).toBe('allow');
    expect(await perm('Read', { file_path: '/etc/passwd' })).toBe('deny');
    expect(await perm('Grep', { pattern: '位移' })).toBe('allow');
    expect(await perm('Glob', { pattern: '*', path: '/etc' })).toBe('deny');
  });

  it('Bash 与我们的工具放行；别的工具不给用', async () => {
    expect(await perm('Bash', { command: 'ls' })).toBe('allow');
    expect(await perm('mcp__studium__request_close', { reason: 'x' })).toBe('allow');
    expect(await perm('WebFetch', { url: 'https://example.com' })).toBe('deny');
  });

  it('放行时原样回传参数', async () => {
    const input = { file_path: join(WORK, '诊断.md'), content: '甲' };
    const r = await check('Write', input, opts);
    expect(r?.behavior).toBe('allow');
    if (r?.behavior === 'allow') expect(r.updatedInput).toEqual(input);
  });
});

describe('工具调用记成沙盒动作', () => {
  it('写工作区的文件：op、虚拟路径、内容、ok', () => {
    const a = sandboxActionOf(
      sb,
      { name: 'Write', input: { file_path: join(WORK, '诊断.md'), content: '诊断甲' } },
      {},
    );
    expect(a).toEqual({
      op: 'write',
      path: '诊断.md',
      summary: '写 诊断.md',
      ok: true,
      content: '诊断甲',
    });
  });

  it('读只读区：路径换成虚拟路径', () => {
    const a = sandboxActionOf(
      sb,
      { name: 'Read', input: { file_path: join(TOOLS_DIR, '提取练习.md') } },
      {},
    );
    expect(a).toMatchObject({ op: 'read', path: '只读/教学工具/提取练习.md', ok: true });
  });

  it('Edit 记 new_string；跑命令带 command；失败时 ok:false', () => {
    expect(
      sandboxActionOf(
        sb,
        { name: 'Edit', input: { file_path: join(WORK, '诊断.md'), new_string: '乙' } },
        {},
      ),
    ).toMatchObject({ op: 'write', content: '乙' });
    expect(sandboxActionOf(sb, { name: 'Bash', input: { command: 'echo 1' } }, {})).toMatchObject({
      op: 'run',
      command: 'echo 1',
    });
    expect(
      sandboxActionOf(
        sb,
        { name: 'Read', input: { file_path: join(RECORDS, '没有.md') } },
        { is_error: true },
      ),
    ).toMatchObject({ op: 'read', ok: false });
  });

  it('我们的工具与认不出的工具不记', () => {
    expect(
      sandboxActionOf(sb, { name: 'mcp__studium__request_close', input: {} }, {}),
    ).toBeUndefined();
    expect(sandboxActionOf(sb, { name: 'WebFetch', input: {} }, {})).toBeUndefined();
  });
});
