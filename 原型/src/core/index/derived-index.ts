// SQLite 派生层：会话列表与记录索引。它不是正本，坏了、丢了、版本不对，都从正本 JSONL 重建。
// 启动时按每个正本已索引到的行号补齐；运行中由 Hub 每追加一行就同步写一行。
import { DatabaseSync } from 'node:sqlite';
import { rmSync } from 'node:fs';
import type { SessionSummary } from '../../shared/protocol.ts';
import type { LogRecord, NumberedRecord } from '../../shared/records.ts';
import type { DataDir } from '../log/data-dir.ts';
import { readRecords } from '../log/session-log.ts';

const SCHEMA_VERSION = 1;

export class DerivedIndex {
  private constructor(private readonly db: DatabaseSync) {}

  /** 打开索引并与正本对齐；打不开或版本不对就删掉重建。 */
  static async open(path: string, dataDir: DataDir): Promise<DerivedIndex> {
    let db: DatabaseSync;
    try {
      db = new DatabaseSync(path);
      const v = db.prepare('PRAGMA user_version').get() as { user_version: number } | undefined;
      if (v?.user_version !== SCHEMA_VERSION) {
        db.close();
        throw new Error(`索引版本 ${String(v?.user_version)} ≠ ${String(SCHEMA_VERSION)}`);
      }
    } catch (err) {
      console.warn(`派生索引重建：${err instanceof Error ? err.message : String(err)}`);
      rmSync(path, { force: true });
      db = new DatabaseSync(path);
      createSchema(db);
    }
    const index = new DerivedIndex(db);
    await index.catchUp(dataDir);
    return index;
  }

  /** 按正本补齐：每个会话从已索引的最后一行之后读起。 */
  async catchUp(dataDir: DataDir): Promise<void> {
    for (const id of await dataDir.listSessionIds()) {
      const done = this.indexedLines(id);
      const records = await readRecords(dataDir.sessionPath(id));
      if (records.length < done) {
        // 正本比索引短：索引不可信（正本只追加，这不该发生），整会话重建
        this.db.prepare('DELETE FROM records WHERE session_id = ?').run(id);
        this.db.prepare('DELETE FROM sessions WHERE session_id = ?').run(id);
        this.addAll(id, records);
      } else {
        this.addAll(id, records.slice(done));
      }
    }
  }

  add(sessionId: string, line: number, record: LogRecord): void {
    if (record.type === 'session_opened') {
      this.db
        .prepare(
          'INSERT OR REPLACE INTO sessions (session_id, kind, title, opened_at, last_at) VALUES (?, ?, ?, ?, ?)',
        )
        .run(sessionId, record.kind, record.title, record.at, record.at);
    } else {
      this.db
        .prepare('UPDATE sessions SET last_at = ? WHERE session_id = ?')
        .run(record.at, sessionId);
    }
    this.db
      .prepare(
        'INSERT OR REPLACE INTO records (session_id, line, type, at, text) VALUES (?, ?, ?, ?, ?)',
      )
      .run(sessionId, line, record.type, record.at, searchableText(record));
  }

  listSessions(): SessionSummary[] {
    const rows = this.db
      .prepare('SELECT session_id, kind, title, opened_at FROM sessions ORDER BY opened_at DESC')
      .all() as {
      session_id: string;
      kind: SessionSummary['kind'];
      title: string;
      opened_at: string;
    }[];
    return rows.map((r) => ({
      sessionId: r.session_id,
      kind: r.kind,
      title: r.title,
      openedAt: r.opened_at,
    }));
  }

  /** 第一版检索：子串匹配（04「中文检索」先 grep）。 */
  search(text: string, limit = 50): { sessionId: string; line: number; text: string }[] {
    const rows = this.db
      .prepare(
        "SELECT session_id, line, text FROM records WHERE text LIKE ? ESCAPE '\\' ORDER BY at DESC LIMIT ?",
      )
      .all(`%${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%`, limit) as {
      session_id: string;
      line: number;
      text: string;
    }[];
    return rows.map((r) => ({ sessionId: r.session_id, line: r.line, text: r.text }));
  }

  indexedLines(sessionId: string): number {
    const row = this.db
      .prepare('SELECT MAX(line) AS n FROM records WHERE session_id = ?')
      .get(sessionId) as { n: number | null } | undefined;
    return row?.n ?? 0;
  }

  close(): void {
    this.db.close();
  }

  private addAll(sessionId: string, records: NumberedRecord[]): void {
    this.db.exec('BEGIN');
    try {
      for (const r of records) this.add(sessionId, r.line, r.record);
      this.db.exec('COMMIT');
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }
}

function createSchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE sessions (
      session_id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      opened_at TEXT NOT NULL,
      last_at TEXT NOT NULL
    );
    CREATE TABLE records (
      session_id TEXT NOT NULL,
      line INTEGER NOT NULL,
      type TEXT NOT NULL,
      at TEXT NOT NULL,
      text TEXT NOT NULL,
      PRIMARY KEY (session_id, line)
    );
    PRAGMA user_version = ${String(SCHEMA_VERSION)};
  `);
}

function searchableText(r: LogRecord): string {
  switch (r.type) {
    case 'user_message':
    case 'assistant_message':
      return r.text;
    case 'session_opened':
      return r.title;
    default:
      return '';
  }
}
