// M07：书库里每本书的切分结果（书库处理/ 产出：<书>/m07/index.md + 各小节文件）。只读。
import { readdir, readFile } from 'node:fs/promises';
import { join, normalize } from 'node:path';
import { isNotFound } from '../log/session-log.ts';

export class Library {
  constructor(readonly root: string) {}

  async books(): Promise<string[]> {
    try {
      const out: string[] = [];
      for (const e of await readdir(this.root, { withFileTypes: true })) {
        if (!e.isDirectory()) continue;
        try {
          await readFile(join(this.root, e.name, 'm07', 'index.md'));
          out.push(e.name);
        } catch (err) {
          if (!isNotFound(err)) throw err;
        }
      }
      return out.sort();
    } catch (err) {
      if (isNotFound(err)) return [];
      throw err;
    }
  }

  async index(book: string): Promise<string> {
    return readFile(this.path(book, 'index.md'), 'utf8');
  }

  /** 读一个小节文件，每行前印行号；from / to 从 1 数、含两端。 */
  async read(book: string, file: string, from = 1, to = Number.MAX_SAFE_INTEGER): Promise<string> {
    const lines = (await readFile(this.path(book, file), 'utf8')).split('\n');
    const end = Math.min(to, lines.length);
    const out: string[] = [];
    for (let i = Math.max(1, from); i <= end; i++) out.push(`${String(i)}\t${lines[i - 1] ?? ''}`);
    return out.join('\n');
  }

  private path(book: string, file: string): string {
    const rel = normalize(file);
    if (rel.startsWith('..') || book.includes('/') || book.includes('..')) {
      throw new Error(`路径越界：${book} / ${file}`);
    }
    return join(this.root, book, 'm07', rel);
  }
}
