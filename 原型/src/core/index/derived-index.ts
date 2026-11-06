// SQLite 派生层：会话列表与记录索引。它不是正本，坏了、丢了、版本不对，都从正本 JSONL 重建。
// 启动时按每个正本已索引到的行号补齐；运行中由 Hub 每追加一行就同步写一行。
import { DatabaseSync } from 'node:sqlite';
import { rmSync } from 'node:fs';
import type { SessionSummary } from '../../shared/protocol.ts';
import { CONVERSATION_KINDS, type LogRecord, type NumberedRecord } from '../../shared/records.ts';
import type { DataDir } from '../log/data-dir.ts';
import { readRecords } from '../log/session-log.ts';

// 14：只收 main、loop、import（旧种类的正本留在磁盘上，不进索引）；不存正文，对话全文搜索没人调
const SCHEMA_VERSION = 14;

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
      const records = await readRecords(dataDir.sessionPath(id));
      const first = records[0]?.record;
      if (first?.type !== 'session_opened' || !CONVERSATION_KINDS.includes(first.kind)) continue;
      const done = this.indexedLines(id);
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
          'INSERT OR REPLACE INTO sessions (session_id, kind, title, parent, opened_at, last_at) VALUES (?, ?, ?, ?, ?, ?)',
        )
        .run(sessionId, record.kind, record.title, record.parent ?? null, record.at, record.at);
    } else if (record.type === 'thread_deleted') {
      // 学习者删了一个讨论串（W12 §4.3）：记在主对话里；另记一张表，重建时不怕被删的那条还没建
      this.db.prepare('INSERT OR REPLACE INTO deleted (session_id) VALUES (?)').run(record.session);
      this.touch(sessionId, record.at);
    } else if (record.type === 'project_title' || record.type === 'thread_title') {
      // 项目改名、讨论串自己起的标题：正本开头那行不改，派生层取最新一条
      this.db
        .prepare('UPDATE sessions SET title = ?, last_at = ? WHERE session_id = ?')
        .run(record.title, record.at, sessionId);
    } else {
      const mark = markOf(record);
      if (mark !== undefined) {
        this.db
          .prepare('UPDATE sessions SET mark = ?, last_at = ? WHERE session_id = ?')
          .run(mark, record.at, sessionId);
      } else {
        this.touch(sessionId, record.at);
      }
    }
    this.db
      .prepare('INSERT OR REPLACE INTO records (session_id, line, type, at) VALUES (?, ?, ?, ?)')
      .run(sessionId, line, record.type, record.at);
  }

  private touch(sessionId: string, at: string): void {
    this.db.prepare('UPDATE sessions SET last_at = ? WHERE session_id = ?').run(at, sessionId);
  }

  listSessions(): SessionSummary[] {
    const rows = this.db
      .prepare(
        `SELECT s.session_id, s.kind, s.title, s.parent, s.opened_at, s.last_at, s.mark
         FROM sessions s
         WHERE s.session_id NOT IN (SELECT session_id FROM deleted)
         ORDER BY s.opened_at DESC`,
      )
      .all() as {
      session_id: string;
      kind: SessionSummary['kind'];
      title: string;
      parent: string | null;
      opened_at: string;
      last_at: string | null;
      mark: 'ended' | null;
    }[];
    return rows.map((r) => ({
      sessionId: r.session_id,
      kind: r.kind,
      title: r.title,
      openedAt: r.opened_at,
      ...(r.last_at !== null ? { lastAt: r.last_at } : {}),
      ...(r.parent !== null ? { parent: r.parent } : {}),
      ...(r.mark !== null ? { mark: r.mark } : {}),
    }));
  }

  /** 学习者删掉的讨论串（W12 §4.3）。 */
  isDeleted(sessionId: string): boolean {
    return (
      this.db.prepare('SELECT 1 AS x FROM deleted WHERE session_id = ?').get(sessionId) !==
      undefined
    );
  }

  /** 这几个会话里，before 之前学习者最后一次说话的时间（W12 §3.1 来历标注里的“距学习者上次说话多久”）。 */
  lastLearnerAt(sessionIds: string[], before: string): string | undefined {
    if (sessionIds.length === 0) return undefined;
    const row = this.db
      .prepare(
        `SELECT MAX(at) AS at FROM records WHERE type = 'user_message' AND at < ? AND session_id IN (${sessionIds.map(() => '?').join(',')})`,
      )
      .get(before, ...sessionIds) as { at: string | null } | undefined;
    return row?.at ?? undefined;
  }

  /** 有某种记录的会话（跨次记录现算时只读这些会话的正本，W13）；学习者删掉的不算。 */
  sessionsWith(type: LogRecord['type']): string[] {
    const rows = this.db
      .prepare(
        `SELECT DISTINCT r.session_id FROM records r JOIN sessions s ON s.session_id = r.session_id
         WHERE r.type = ? AND r.session_id NOT IN (SELECT session_id FROM deleted)`,
      )
      .all(type) as { session_id: string }[];
    return rows.map((r) => r.session_id);
  }

  /** 第一版检索：子串匹配（04「中文检索」先 grep）；删掉的讨论串不搜。 */

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
      parent TEXT,
      opened_at TEXT NOT NULL,
      last_at TEXT NOT NULL,
      mark TEXT
    );
    CREATE TABLE deleted (
      session_id TEXT PRIMARY KEY
    );
    CREATE TABLE records (
      session_id TEXT NOT NULL,
      line INTEGER NOT NULL,
      type TEXT NOT NULL,
      at TEXT NOT NULL,
      PRIMARY KEY (session_id, line)
    );
    PRAGMA user_version = ${String(SCHEMA_VERSION)};
  `);
}

/** 会改对话状态的记录 → 记号；null = 回到开着（结束的讨论串又重开）。别的记录不动记号。同 threadEnd（shared/threads.ts）。 */
function markOf(r: LogRecord): 'ended' | null | undefined {
  switch (r.type) {
    case 'thread_closed':
    case 'loop_ended':
      return 'ended';
    case 'thread_reopened':
      return null;
    default:
      return undefined;
  }
}
