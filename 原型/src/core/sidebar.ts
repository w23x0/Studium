// 左栏的界面操作存放处（置顶 / 取消置顶 / 从列表删掉 / 对话改名）：<数据>/ui/sidebar.jsonl，只追加，读时折叠。
// 不碰任何正本；“删掉”只是藏起来。项目改名走 Studium.renameProject（主对话里记 project_title）。类型在 src/shared/sidebar.ts。
import type { SessionSummary } from '../shared/protocol.ts';
import type {
  SidebarActionRequest,
  SidebarEvent,
  SidebarRef,
  SidebarView,
} from '../shared/sidebar.ts';
import { appendJsonl, readJsonl } from './knowledge/jsonl.ts';
import { BadRequestError } from './studium.ts';

/** 左栏里出现的对话种类（后台的判断、整理会话不列）。 */
const LISTED: readonly SessionSummary['kind'][] = ['main', 'talk', 'loop', 'output'];
const MAX_TITLE = 100;

const same = (a: SidebarRef, b: SidebarRef) => a.kind === b.kind && a.id === b.id;

/** 按先后折叠：置顶 / 取消置顶、藏起来、改名（同一条后改的算数）。 */
export function foldSidebar(events: readonly SidebarEvent[]): SidebarView {
  let pinned: SidebarRef[] = [];
  const hidden: SidebarRef[] = [];
  const titles: Record<string, string> = {};
  for (const e of events) {
    const ref: SidebarRef = { kind: e.kind, id: e.id };
    if (e.action === 'pin') pinned = [ref, ...pinned.filter((p) => !same(p, ref))];
    else if (e.action === 'unpin') pinned = pinned.filter((p) => !same(p, ref));
    else if (e.action === 'hide') {
      if (!hidden.some((h) => same(h, ref))) hidden.push(ref);
      pinned = pinned.filter((p) => !same(p, ref));
    } else if (e.kind === 'session' && e.title !== undefined) titles[e.id] = e.title;
  }
  return { pinned, hidden, titles };
}

/** 读出一条操作并查合不合法（请求体来自界面，不信任）；不合法抛 BadRequestError（接口回 400）。 */
export function parseSidebarAction(
  body: unknown,
  sessions: readonly SessionSummary[],
): SidebarActionRequest {
  const b = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>;
  const { kind, id, action, title } = b;
  if (kind !== 'project' && kind !== 'session') {
    throw new BadRequestError('kind 只能是 project 或 session');
  }
  if (action !== 'pin' && action !== 'unpin' && action !== 'hide' && action !== 'rename') {
    throw new BadRequestError('action 只能是 pin、unpin、hide、rename');
  }
  if (typeof id !== 'string') throw new BadRequestError('id 要是字符串');
  const s = sessions.find((x) => x.sessionId === id);
  if (s === undefined) throw new BadRequestError(`没有这个对话：${id}`);
  if (kind === 'project' && s.kind !== 'main') {
    throw new BadRequestError(`${id} 不是项目（主对话）`);
  }
  if (kind === 'session' && !LISTED.includes(s.kind)) {
    throw new BadRequestError(`${id} 不在左栏里列出`);
  }
  if (action !== 'rename') return { kind, id, action };
  const t = typeof title === 'string' ? title.trim() : '';
  if (t === '') throw new BadRequestError('新名字不能为空');
  if (t.length > MAX_TITLE) throw new BadRequestError(`名字最多 ${String(MAX_TITLE)} 个字`);
  return { kind, id, action, title: t };
}

export class SidebarStore {
  private constructor(
    private readonly path: string,
    private readonly rows: SidebarEvent[],
    private readonly now: () => Date,
  ) {}

  static async load(path: string, now: () => Date = () => new Date()): Promise<SidebarStore> {
    return new SidebarStore(path, await readJsonl<SidebarEvent>(path), now);
  }

  view(): SidebarView {
    return foldSidebar(this.rows);
  }

  /** 记一条（已查过合法）。 */
  async add(req: SidebarActionRequest): Promise<SidebarView> {
    const e: SidebarEvent = {
      at: this.now().toISOString(),
      kind: req.kind,
      id: req.id,
      action: req.action,
      ...(req.action === 'rename' && req.title !== undefined ? { title: req.title } : {}),
    };
    await appendJsonl(this.path, e);
    this.rows.push(e);
    return this.view();
  }
}
