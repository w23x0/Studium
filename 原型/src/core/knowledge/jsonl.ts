// 知识层各区共用：只追加的 JSONL 读写（同一 id 后写的取代先写的，旧行保留）。
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { isNotFound } from '../log/session-log.ts';

export async function readJsonl<T>(path: string): Promise<T[]> {
  let text: string;
  try {
    text = await readFile(path, 'utf8');
  } catch (err) {
    if (isNotFound(err)) return [];
    throw err;
  }
  return text
    .split('\n')
    .filter((l) => l.trim() !== '')
    .map((l, i) => {
      try {
        return JSON.parse(l) as T;
      } catch (err) {
        throw new Error(`${path}:${String(i + 1)} 不是合法 JSON`, { cause: err });
      }
    });
}

export async function appendJsonl(path: string, row: object): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await appendFile(path, JSON.stringify(row) + '\n', 'utf8');
}

/** 按 id 取最新一版。 */
export function latestById<T extends { id: string }>(rows: T[]): Map<string, T> {
  const m = new Map<string, T>();
  for (const r of rows) m.set(r.id, r);
  return m;
}
