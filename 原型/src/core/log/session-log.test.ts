import { appendFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { tempDir } from '../../../tests/helpers/tmp.ts';
import { readRecords, SessionLog } from './session-log.ts';

const at = '2026-10-08T00:00:00.000Z';

describe('SessionLog', () => {
  it('追加返回从 1 开始的行号，重开后接着数', async () => {
    const path = join(await tempDir(), 's.jsonl');
    const a = await SessionLog.open(path);
    expect(await a.append({ type: 'user_message', at, text: '一' })).toBe(1);
    expect(await a.append({ type: 'user_message', at, text: '二' })).toBe(2);
    await a.close();
    const b = await SessionLog.open(path);
    expect(await b.append({ type: 'user_message', at, text: '三' })).toBe(3);
    await b.close();
    const rs = await readRecords(path);
    expect(rs.map((r) => r.line)).toEqual([1, 2, 3]);
  });

  it('只追加：已写的字节不变', async () => {
    const path = join(await tempDir(), 's.jsonl');
    const log = await SessionLog.open(path);
    await log.append({ type: 'user_message', at, text: '原话' });
    const before = await readFile(path, 'utf8');
    await log.append({ type: 'assistant_message', at, text: '回复' });
    await log.close();
    expect((await readFile(path, 'utf8')).startsWith(before)).toBe(true);
  });

  it('并发追加按顺序排队，不交错', async () => {
    const path = join(await tempDir(), 's.jsonl');
    const log = await SessionLog.open(path);
    const lines = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        log.append({ type: 'user_message', at, text: `第${String(i)}条` }),
      ),
    );
    await log.close();
    expect(lines).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    const rs = await readRecords(path);
    expect(rs.map((r) => (r.record.type === 'user_message' ? r.record.text : ''))).toEqual(
      Array.from({ length: 20 }, (_, i) => `第${String(i)}条`),
    );
  });

  it('末行半截（崩溃中断）读时跳过，不改文件', async () => {
    const path = join(await tempDir(), 's.jsonl');
    const log = await SessionLog.open(path);
    await log.append({ type: 'user_message', at, text: '完整' });
    await log.close();
    await appendFile(path, '{"type":"user_mes');
    const rs = await readRecords(path);
    expect(rs).toHaveLength(1);
    expect(await readFile(path, 'utf8')).toContain('{"type":"user_mes');
  });

  it('中间行坏了要报错并指出行号', async () => {
    const path = join(await tempDir(), 's.jsonl');
    await appendFile(path, '坏行\n{"type":"user_message","at":"x","text":"a"}\n');
    await expect(readRecords(path)).rejects.toThrow(/s\.jsonl:1/);
  });
});
