// 会话正本：每个会话一个 JSONL 文件，一个写者，只追加、永不改写。
// 写入串行化（同一进程内排队）；跨进程靠数据目录锁（data-dir.ts）保证只有一个写者。
import { open, readFile, type FileHandle } from 'node:fs/promises';
import type { LogRecord, NumberedRecord } from '../../shared/records.ts';

export class SessionLog {
  private queue: Promise<unknown> = Promise.resolve();
  private lineCount: number;

  private constructor(
    readonly path: string,
    private readonly handle: FileHandle,
    existingLines: number,
  ) {
    this.lineCount = existingLines;
  }

  /** 打开（或新建）一个正本文件，只以追加方式写。 */
  static async open(path: string): Promise<SessionLog> {
    const existing = await readRecords(path).catch((err: unknown) => {
      if (isNotFound(err)) return [];
      throw err;
    });
    const handle = await open(path, 'a');
    return new SessionLog(path, handle, existing.length);
  }

  get lines(): number {
    return this.lineCount;
  }

  /** 追加一行，返回它的行号。写盘并 fsync 后才算数。 */
  append(record: LogRecord): Promise<number> {
    const result = this.queue.then(async () => {
      const text = JSON.stringify(record);
      if (text.includes('\n')) throw new Error('记录序列化后含换行，会破坏行号');
      await this.handle.appendFile(text + '\n', 'utf8');
      await this.handle.sync();
      this.lineCount += 1;
      return this.lineCount;
    });
    this.queue = result.catch(() => undefined);
    return result;
  }

  async close(): Promise<void> {
    await this.queue;
    await this.handle.close();
  }
}

/** 读整个正本，带行号。最后一行若没写完（崩溃中断），忽略它，不改文件。 */
export async function readRecords(path: string): Promise<NumberedRecord[]> {
  const text = await readFile(path, 'utf8');
  const rows = text.split('\n');
  const out: NumberedRecord[] = [];
  rows.forEach((row, i) => {
    if (row === '') return;
    const isLast = i === rows.length - 1;
    try {
      out.push({ line: i + 1, record: JSON.parse(row) as LogRecord });
    } catch (err) {
      if (!isLast) throw new Error(`${path}:${i + 1} 不是合法 JSON`, { cause: err });
      // 末行半截：上次写到一半崩了。保留原样，读时跳过。
    }
  });
  return out;
}

export function isNotFound(err: unknown): boolean {
  return err instanceof Error && (err as NodeJS.ErrnoException).code === 'ENOENT';
}
