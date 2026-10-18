// 验收（W5）：Agent SDK 适配器在 spec.webSearch 为真时只多放开内置 WebSearch、WebFetch 两个工具
// （docs/设计/会话/导航.md「能读什么」外部搜索 D-13；实现选型：harness 工具）。不调真模型：
// 只看 W4 导出的纯函数 sdkOptionsFor(spec, options) 算出的 SDK 选项。
import { describe, expect, it } from 'vitest';
import type { ToolSpec } from '../../src/core/model/port.ts';

type Loose = Record<string, unknown>;
type OptionsFor = (spec: Loose, o: Loose) => Loose;

const DEMO: ToolSpec = {
  name: 'demo_tool',
  description: '测试用',
  input: {},
  run: () => Promise.resolve({ text: '' }),
};

async function optionsFor(): Promise<OptionsFor> {
  const mod = (await import('../../src/core/model/claude-agent-sdk.ts')) as unknown as {
    sdkOptionsFor?: OptionsFor;
  };
  const fn = mod.sdkOptionsFor;
  expect(typeof fn, '适配器导出 sdkOptionsFor（W4 起）').toBe('function');
  if (fn === undefined) throw new Error('没有 sdkOptionsFor');
  return fn;
}

const list = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

describe('适配器：联网搜索工具', () => {
  it('webSearch 为真：tools 与 allowedTools 恰好多出 WebSearch、WebFetch；不为真：两处都没有', async () => {
    const sdkOptionsFor = await optionsFor();
    const base: Loose = {
      systemPrompt: '测试',
      tools: [DEMO],
      session: { id: 's-1', kind: 'talk' },
    };
    const o: Loose = { cwd: '/tmp/studium-w5-test' };
    const off = sdkOptionsFor(base, o);
    const on = sdkOptionsFor({ ...base, webSearch: true }, o);
    const falsy = sdkOptionsFor({ ...base, webSearch: false }, o);

    for (const [why, opts] of [
      ['没带 webSearch', off],
      ['webSearch: false', falsy],
    ] as const) {
      expect(list(opts.tools), `${why}：不放开 WebSearch`).not.toContain('WebSearch');
      expect(list(opts.tools), `${why}：不放开 WebFetch`).not.toContain('WebFetch');
      expect(list(opts.allowedTools), `${why}：allowedTools 里没有 WebSearch`).not.toContain(
        'WebSearch',
      );
      expect(list(opts.allowedTools), `${why}：allowedTools 里没有 WebFetch`).not.toContain(
        'WebFetch',
      );
    }

    expect(
      [...list(on.tools)].sort(),
      'webSearch 为真：内置工具只比不带时多 WebSearch、WebFetch',
    ).toEqual([...list(off.tools), 'WebFetch', 'WebSearch'].sort());
    expect(
      [...list(on.allowedTools)].sort(),
      'webSearch 为真：allowedTools 只比不带时多 WebSearch、WebFetch（我们的工具照旧在）',
    ).toEqual([...list(off.allowedTools), 'WebFetch', 'WebSearch'].sort());
    expect(list(on.allowedTools), '我们自己的工具照旧放行').toContain('mcp__studium__demo_tool');
  });
});
