// SQLite 派生层：会话列表与记录索引。它不是正本，坏了、丢了、版本不对，都从正本 JSONL 重建。
// 启动时按每个正本已索引到的行号补齐；运行中由 Hub 每追加一行就同步写一行。
import { DatabaseSync } from 'node:sqlite';
import { rmSync } from 'node:fs';
import type { SessionMark, SessionSummary } from '../../shared/protocol.ts';
import type { LogRecord, NumberedRecord, SessionOpened } from '../../shared/records.ts';
import { sessionFrom } from '../hub.ts';
import type { DataDir } from '../log/data-dir.ts';
import { readRecords } from '../log/session-log.ts';

const SCHEMA_VERSION = 7;

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
          'INSERT OR REPLACE INTO sessions (session_id, kind, title, parent, from_kind, from_loop, opened_at, last_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        )
        .run(
          sessionId,
          record.kind,
          record.title,
          record.parent ?? null,
          ...fromOf(record),
          record.at,
          record.at,
        );
    } else if (record.type === 'session_withdrawn') {
      // 收掉的会话：正本留着，列表里不再出现
      this.db
        .prepare('UPDATE sessions SET withdrawn = 1, last_at = ? WHERE session_id = ?')
        .run(record.at, sessionId);
    } else if (record.type === 'choice_card') {
      // 导航定了单子：单子记在主对话里，导航那条对话算结束（另记一张表，重建时不怕导航那行还没建）
      this.db
        .prepare('INSERT OR REPLACE INTO nav_done (session_id) VALUES (?)')
        .run(record.navSessionId);
      this.touch(sessionId, record.at);
    } else if (record.type === 'project_title' || record.type === 'thread_title') {
      // 项目名随方向变、讨论串自己起的标题：正本开头那行不改，派生层取最新一条
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
      .prepare(
        'INSERT OR REPLACE INTO records (session_id, line, type, at, text) VALUES (?, ?, ?, ?, ?)',
      )
      .run(sessionId, line, record.type, record.at, searchableText(record));
  }

  private touch(sessionId: string, at: string): void {
    this.db.prepare('UPDATE sessions SET last_at = ? WHERE session_id = ?').run(at, sessionId);
  }

  listSessions(): SessionSummary[] {
    const rows = this.db
      .prepare(
        `SELECT s.session_id, s.kind, s.title, s.parent, s.from_kind, s.from_loop, s.opened_at, s.last_at,
           CASE WHEN n.session_id IS NOT NULL THEN 'ended' ELSE s.mark END AS mark
         FROM sessions s LEFT JOIN nav_done n ON n.session_id = s.session_id
         WHERE s.withdrawn = 0 ORDER BY s.opened_at DESC`,
      )
      .all() as {
      session_id: string;
      kind: SessionSummary['kind'];
      title: string;
      parent: string | null;
      from_kind: 'resume' | null;
      from_loop: string | null;
      opened_at: string;
      last_at: string | null;
      mark: SessionMark | null;
    }[];
    return rows.map((r) => ({
      sessionId: r.session_id,
      kind: r.kind,
      title: r.title,
      openedAt: r.opened_at,
      ...(r.last_at !== null ? { lastAt: r.last_at } : {}),
      ...(r.parent !== null ? { parent: r.parent } : {}),
      ...(r.from_kind !== null && r.from_loop !== null
        ? { from: { kind: r.from_kind, loop: r.from_loop } }
        : {}),
      ...(r.mark !== null ? { mark: r.mark } : {}),
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
      parent TEXT,
      from_kind TEXT,
      from_loop TEXT,
      opened_at TEXT NOT NULL,
      last_at TEXT NOT NULL,
      withdrawn INTEGER NOT NULL DEFAULT 0,
      mark TEXT
    );
    CREATE TABLE nav_done (
      session_id TEXT PRIMARY KEY
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

/**
 * 会改对话状态的记录 → 记号；null = 回到进行中（停着的学习又接上、又申请收口在整理、结束的讨论串又重开）。
 * 别的记录不动记号。
 */
function markOf(r: LogRecord): SessionMark | null | undefined {
  switch (r.type) {
    case 'guard_verdict':
      return 'guarded';
    case 'loop_ended':
      return r.closed ? 'closed' : 'unclosed';
    case 'loop_shelved':
      return 'shelved';
    case 'loop_resumed':
    case 'close_requested':
      return null;
    case 'talk_ended':
    case 'candidates_picked':
    case 'thread_closed':
      return 'ended';
    case 'thread_reopened':
      return null;
    case 'find_candidates':
      return 'candidates';
    default:
      return undefined;
  }
}

/** 学习对话的来历（分叉 / 接着学），给会话列表用。 */
function fromOf(o: SessionOpened): [string | null, string | null] {
  const f = sessionFrom(o);
  return f !== undefined ? [f.kind, f.loop] : [null, null];
}

function searchableText(r: LogRecord): string {
  switch (r.type) {
    case 'user_message':
    case 'assistant_message':
    case 'program_fact':
    case 'project_goal':
      return r.text;
    // 沙盒动作只在写文件时有内容（读 / 跑命令没有）
    case 'sandbox_action':
      return r.content ?? '';
    case 'session_opened':
      return r.title;
    default:
      return '';
  }
}
