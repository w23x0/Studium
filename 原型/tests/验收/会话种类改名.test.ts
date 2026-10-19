// 测：会话种类去掉模块编号（m05→nav、m15→state、m10→pedagogy；m09 已无）——会话列表、模型看到的会话种类、会话 id、
// 按会话类配模型的键（STUDIUM_PROFILES）、提示词文件名、录带里的会话记号都用新名；旧版录带不回放。依据：工单 README §2.8；工单 W7 §4.1、§4.5。
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadPrompts, type App } from '../../src/core/app.ts';
import { DEFAULT_PROFILES, mergeProfiles } from '../../src/core/model/profiles.ts';
import { replayTape } from '../../src/core/tape/replay.ts';
import { tempDir } from '../helpers/tmp.ts';
import { boot, mainPath, sessions } from './共用/w7-flow.ts';

const OLD_KINDS = ['m05', 'm09', 'm10', 'm15'];
const NEW_KINDS = [
  'main',
  'talk',
  'loop',
  'guard',
  'nav',
  'state',
  'pedagogy',
  'retrieve',
  'output',
];
const PROMPTS_DIR = join(import.meta.dirname, '../../src/core/prompts');

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

describe('会话种类改名', () => {
  it('走完主路径：会话列表、模型看到的种类、会话 id 都是新名，没有 m05 / m15 / m10 / m09', async () => {
    const b = await boot();
    apps.push(b.app);
    await mainPath(b);

    const list = await sessions(b.app);
    const kinds = new Set(list.map((s) => s.kind));
    for (const k of ['main', 'loop', 'guard', 'nav', 'state', 'pedagogy']) {
      expect(kinds.has(k), `GET /api/sessions 里应有 ${k} 种类的会话`).toBe(true);
    }
    for (const k of OLD_KINDS) expect(kinds.has(k), `不该再有 ${k} 种类`).toBe(false);
    for (const k of kinds) expect(NEW_KINDS, `种类 ${k} 不在新名单里`).toContain(k);

    const opened = b.model.opened.map((s) => s.session?.kind ?? '');
    for (const k of OLD_KINDS) expect(opened, `模型看到的会话种类不该有 ${k}`).not.toContain(k);
    expect(opened, '出卡的会话对模型报 nav').toContain('nav');

    const ids = list.map((s) => s.sessionId).join(' ');
    expect(ids, '会话 id 里带的种类也换了').not.toMatch(/-m(05|09|10|15)-/);
    expect(ids).toMatch(/-nav-/);
  });

  it('按会话类配模型：默认配置与 STUDIUM_PROFILES 只认新名', () => {
    const keys = Object.keys(DEFAULT_PROFILES);
    expect(keys, '默认配置里有导航').toContain('nav');
    expect(keys, '默认配置里有状态整理').toContain('state');
    for (const k of OLD_KINDS) expect(keys, `默认配置不该有 ${k}`).not.toContain(k);

    const merged = mergeProfiles({ nav: { effort: 'max' }, pedagogy: { effort: 'low' } }) as Record<
      string,
      { effort?: string } | undefined
    >;
    expect(merged.nav?.effort, '新名的覆盖生效').toBe('max');
    expect(merged.pedagogy?.effort).toBe('low');
    for (const k of OLD_KINDS) {
      expect(() => mergeProfiles({ [k]: { effort: 'max' } }), `旧名 ${k} 应报错`).toThrow(
        /没有这种会话类/,
      );
    }
  });

  it('提示词文件按新名：nav.md / state.md / pedagogy.md，旧文件没了，内容不带旧叫法', async () => {
    for (const k of ['nav', 'state', 'pedagogy']) {
      expect(existsSync(join(PROMPTS_DIR, `${k}.md`)), `应有 prompts/${k}.md`).toBe(true);
    }
    for (const k of OLD_KINDS) {
      expect(existsSync(join(PROMPTS_DIR, `${k}.md`)), `prompts/${k}.md 应已改名或删掉`).toBe(
        false,
      );
    }
    const prompts = (await loadPrompts()) as Record<string, string>;
    for (const k of OLD_KINDS)
      expect(Object.keys(prompts), `装载的提示词不该有 ${k}`).not.toContain(k);
    for (const [k, text] of Object.entries(prompts)) {
      expect(text, `提示词 ${k} 里不该有 M0x / M1x / 闭环`).not.toMatch(/M0[5-9]|M1[0-5]|闭环/);
    }
  });

  it('录带里的会话记号用新名，回放与录的那次一致', async () => {
    const tape = join(await tempDir(), 'run.tape.jsonl');
    const b = await boot({ tape });
    await mainPath(b);
    await b.app.close();

    const text = await readFile(tape, 'utf8');
    expect(text, '录带里有导航的记号').toContain('⟦nav#1⟧');
    expect(text, '录带里有状态整理的记号').toContain('⟦state#1⟧');
    expect(text, '录带里不该有旧种类的记号').not.toMatch(/⟦m\d\d#/);
    const header = JSON.parse(text.split('\n')[0] ?? '{}') as { t?: string; v?: number };
    expect(header, '录带头的版本升到 2').toMatchObject({ t: 'header', v: 2 });

    const report = await replayTape(tape, { dataRoot: await tempDir() });
    expect(report.problems, '回放与录带一致').toEqual([]);
    expect(report.turns).toBeGreaterThan(5);
  });

  it('旧版录带（v1）不回放，报错说明是旧版', async () => {
    const tape = join(await tempDir(), 'old.tape.jsonl');
    await writeFile(
      tape,
      `${JSON.stringify({ t: 'header', v: 1, at: '2026-10-01T00:00:00.000Z', adapter: 'fake', preexisting: 0 })}\n`,
    );
    await expect(replayTape(tape, { dataRoot: await tempDir() }), '旧版录带应报错').rejects.toThrow(
      /旧版/,
    );
  });
});
