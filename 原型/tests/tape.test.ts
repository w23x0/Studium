// 录带与回放：回放确实能发现不一致（改动录带里的一轮输入、删掉一轮）。
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/core/app.ts';
import { FakeModel } from '../src/core/model/fake.ts';
import { replayTape } from '../src/core/tape/replay.ts';
import { tempDir } from './helpers/tmp.ts';

async function record(): Promise<string> {
  const tape = join(await tempDir(), 't.jsonl');
  const app = await createApp({
    dataRoot: await tempDir(),
    model: new FakeModel(),
    token: 'tape-token-0123456789',
    port: 0,
    tape,
  });
  const main = await app.studium.ensureMain();
  // 经录带包过的 Studium 才记学习者动作：这里直接走 HTTP
  for (const text of ['你好', '再见']) {
    await fetch(`${app.server.url}/api/sessions/${main}/messages`, {
      method: 'POST',
      headers: { authorization: 'Bearer tape-token-0123456789' },
      body: JSON.stringify({ text }),
    });
    await app.studium.settled();
  }
  await app.close();
  return tape;
}

describe('录带回放', () => {
  it('原样回放没有问题', async () => {
    const report = await replayTape(await record(), { dataRoot: await tempDir() });
    expect(report).toMatchObject({ problems: [], turns: 2, actions: 2 });
  });

  it('录带里的输入与这次不同：报不一致', async () => {
    const tape = await record();
    const text = await readFile(tape, 'utf8');
    await writeFile(tape, text.replace('] 你好"', '] 您好"'));
    const report = await replayTape(tape, { dataRoot: await tempDir() });
    expect(report.problems.join('\n')).toContain('输入不一致');
  });

  it('录带少了一轮：报回放多出一轮', async () => {
    const tape = await record();
    const lines = (await readFile(tape, 'utf8')).trimEnd().split('\n');
    const kept = lines.filter((l) => !(l.includes('"n":1') && l.includes('⟦main#1⟧')));
    await writeFile(tape, `${kept.join('\n')}\n`);
    const report = await replayTape(tape, { dataRoot: await tempDir() });
    expect(report.problems.join('\n')).toContain('多出一轮');
  });
});
