// 依赖方向：违反时报错写明怎么改。
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');

async function sourceFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await sourceFiles(p)));
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

// from '…' · import '…'（只为副作用）· import('…')
const IMPORT_RE =
  /(?:import|export)[^'"]*?from\s+['"]([^'"]+)['"]|import\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;

async function imports(): Promise<{ file: string; spec: string }[]> {
  const files = await sourceFiles(join(root, 'src'));
  const out: { file: string; spec: string }[] = [];
  for (const f of files) {
    const text = await readFile(f, 'utf8');
    for (const m of text.matchAll(IMPORT_RE)) {
      const spec = m[1] ?? m[2] ?? m[3];
      if (spec !== undefined) out.push({ file: relative(root, f), spec });
    }
  }
  return out;
}

/** 模型 SDK 只能在适配层（src/core/model/ 下对应的适配器文件）被引用。 */
const MODEL_SDKS: Record<string, string> = {
  '@anthropic-ai/claude-agent-sdk': 'src/core/model/claude-agent-sdk.ts',
  '@anthropic-ai/sdk': 'src/core/model/',
  openai: 'src/core/model/',
};

describe('依赖方向', () => {
  it('模型 SDK 只在适配层引用', async () => {
    const bad = (await imports())
      .filter(({ spec }) =>
        Object.keys(MODEL_SDKS).some((p) => spec === p || spec.startsWith(`${p}/`)),
      )
      .filter(({ file, spec }) => {
        const pkg = Object.keys(MODEL_SDKS).find((p) => spec === p || spec.startsWith(`${p}/`));
        return pkg === undefined || !file.startsWith(MODEL_SDKS[pkg] ?? '\0');
      })
      .map(
        ({ file, spec }) =>
          `${file} 引用了 ${spec}。模型 SDK 只能在 src/core/model/ 的适配器里用；` +
          `核心其他地方改为依赖 src/core/model/port.ts 里的 ModelAdapter 接口。`,
      );
    expect(bad).toEqual([]);
  });

  it('界面不引用核心，核心不引用界面；两边只经 src/shared', async () => {
    const bad = (await imports())
      .filter(({ file, spec }) => {
        if (!spec.startsWith('.')) return false;
        const target = relative(root, resolve(root, file, '..', spec));
        const from = file.split('/')[1];
        const to = target.split('/')[1];
        return (
          (from === 'ui' && to === 'core') ||
          (from === 'core' && to === 'ui') ||
          (from === 'shared' && to !== 'shared')
        );
      })
      .map(
        ({ file, spec }) =>
          `${file} 引用了 ${spec}。界面与核心只能经 src/shared 的类型与协议相通；` +
          `把要共用的类型挪到 src/shared，shared 自己不引用 core / ui。`,
      );
    expect(bad).toEqual([]);
  });
});
