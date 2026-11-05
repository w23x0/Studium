// SQLite 派生层：会话列表与记录索引。它不是正本，坏了、丢了、版本不对，都从正本 JSONL 重建。
// 启动时按每个正本已索引到的行号补齐；运行中由 Hub 每追加一行就同步写一行。
import { DatabaseSync } from 'node:sqlite';
import { rmSync } from 'node:fs';
import type { SessionMark, SessionSummary } from '../../shared/protocol.ts';
import type { LogRecord, NumberedRecord, SessionOpened } from '../../shared/records.ts';
import type { DataDir } from '../log/data-dir.ts';
import { readRecords } from '../log/session-log.ts';

// 11：谈方向（W20 起不再开）在讨论串里一律算已结束
const SCHEMA_VERSION = 11;

/** 不再开、只读看的讨论串种类：写产出（W12 起，含阶段复盘那种谈方向）、谈方向（W20 起）；在讨论串里一律算已结束。 */
const RETIRED_THREAD_KINDS: ReadonlySet<string> = new Set(['output', 'talk']);

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
      // 旧数据：写产出、阶段复盘 W12 起撤掉，谈方向 W20 起不再开，只读看，在讨论串里算已结束
      if (RETIRED_THREAD_KINDS.has(record.kind)) {
        this.db.prepare("UPDATE sessions SET mark = 'ended' WHERE session_id = ?").run(sessionId);
      }
    } else if (record.type === 'session_withdrawn') {
      // 收掉的会话：正本留着，列表里不再出现
      this.db
        .prepare('UPDATE sessions SET withdrawn = 1, last_at = ? WHERE session_id = ?')
        .run(record.at, sessionId);
    } else if (record.type === 'thread_deleted') {
      // 学习者删了一个讨论串（W12 §4.3）：记在主对话里；另记一张表，重建时不怕被删的那条还没建
      this.db.prepare('INSERT OR REPLACE INTO deleted (session_id) VALUES (?)').run(record.session);
      this.touch(sessionId, record.at);
    } else if (record.type === 'project_title' || record.type === 'thread_title') {
      // 项目名随方向变、讨论串自己起的标题：正本开头那行不改，派生层取最新一条
      this.db
        .prepare('UPDATE sessions SET title = ?, last_at = ? WHERE session_id = ?')
        .run(record.title, record.at, sessionId);
    } else {
      const mark = markOf(record);
      // 只读的旧种类不跟着结束 / 重开记录变（旧的谈方向重开过也算已结束）
      if (mark !== undefined && !this.retired(sessionId)) {
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

  /** 这个会话是不是只读的旧种类（RETIRED_THREAD_KINDS）。 */
  private retired(sessionId: string): boolean {
    const row = this.db.prepare('SELECT kind FROM sessions WHERE session_id = ?').get(sessionId) as
      { kind: string } | undefined;
    return row !== undefined && RETIRED_THREAD_KINDS.has(row.kind);
  }

  private touch(sessionId: string, at: string): void {
    this.db.prepare('UPDATE sessions SET last_at = ? WHERE session_id = ?').run(at, sessionId);
  }

  listSessions(): SessionSummary[] {
    const rows = this.db
      .prepare(
        `SELECT s.session_id, s.kind, s.title, s.parent, s.opened_at, s.last_at, s.mark
         FROM sessions s
         WHERE s.withdrawn = 0 AND s.session_id NOT IN (SELECT session_id FROM deleted)
         ORDER BY s.opened_at DESC`,
      )
      .all() as {
      session_id: string;
      kind: SessionSummary['kind'];
      title: string;
      parent: string | null;
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

  /** 有某种记录的会话（跨次记录现算时只读这些会话的正本，W13）；收掉的、学习者删掉的不算。 */
  sessionsWith(type: LogRecord['type']): string[] {
    const rows = this.db
      .prepare(
        `SELECT DISTINCT r.session_id FROM records r JOIN sessions s ON s.session_id = r.session_id
         WHERE r.type = ? AND s.withdrawn = 0 AND r.session_id NOT IN (SELECT session_id FROM deleted)`,
      )
      .all(type) as { session_id: string }[];
    return rows.map((r) => r.session_id);
  }

  /** 第一版检索：子串匹配（04「中文检索」先 grep）；删掉的讨论串不搜。 */
  search(text: string, limit = 50): { sessionId: string; line: number; text: string }[] {
    const rows = this.db
      .prepare(
        "SELECT session_id, line, text FROM records WHERE text LIKE ? ESCAPE '\\' AND session_id NOT IN (SELECT session_id FROM deleted) ORDER BY at DESC LIMIT ?",
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
    CREATE TABLE deleted (
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
 * 会改对话状态的记录 → 记号；null = 回到进行中（停着的学习又接上、学习者点了“我觉得懂了”、结束的讨论串又重开）。
 * 别的记录不动记号。
 */
function markOf(r: LogRecord): SessionMark | null | undefined {
  switch (r.type) {
    case 'guard_verdict':
      // 旧数据：守卫写好收尾记录，等学习者确认
      return 'guarded';
    case 'close_requested':
      // 收尾那一句到了（10-31 起，学习对话写的）= 等学习者确认；学习者点“我觉得懂了”那条 = 还在学。
      // 记号名 guarded 是守卫时期的旧名，存进索引的值不改，意思已与守卫无关
      return r.summary !== undefined && r.summary.trim() !== '' ? 'guarded' : null;
    case 'loop_ended':
      return r.closed ? 'closed' : 'unclosed';
    case 'loop_shelved':
      return 'shelved';
    case 'loop_resumed':
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

/**
 * 旧数据：学习对话接着哪段没学完的学的（W12 前导航开的“接着学”）。界面已不读这两列；照旧写，
 * 是为了不改表结构、不为此升索引版本（`from_kind` `from_loop`）。
 */
function fromOf(o: SessionOpened): [string | null, string | null] {
  return o.resumeOf !== undefined ? ['resume', o.resumeOf.fromLoop] : [null, null];
}

function searchableText(r: LogRecord): string {
  switch (r.type) {
    case 'user_message':
    case 'program_fact':
    case 'project_goal':
    case 'message_edited':
      return r.text;
    // 工具调用之间说的话（W12 §4.6）不搜；别的会话发来的话学习者看不到、发话的讨论串可能被删（§4.3），也不搜
    case 'assistant_message':
      return r.interim === true ? '' : r.text;
    // 沙盒动作只在写文件时有内容（读 / 跑命令没有）
    case 'sandbox_action':
      return r.content ?? '';
    case 'session_opened':
      return r.title;
    default:
      return '';
  }
}
