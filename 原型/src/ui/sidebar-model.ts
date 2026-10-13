// 左栏的纯转换：项目与对话 + 左栏操作的现状（置顶 / 藏起来 / 改名）→ 置顶、最近（按时间分组）、全部项目、搜索结果。单测覆盖。
import type { ProjectSummary, SessionSummary } from '../shared/protocol.ts';
import type { SidebarRef, SidebarView } from '../shared/sidebar.ts';
import { W } from './wording.ts';

/** 左栏里列的对话种类（后台的判断、整理会话不列）。 */
const LISTED = new Set<SessionSummary['kind']>(['main', 'talk', 'loop', 'output']);

export interface ProjectItem {
  kind: 'project';
  id: string;
  title: string;
  goal?: string;
  /** 项目里任何一条对话最近的活动时间。 */
  lastAt: string;
}

export interface ChatItem {
  kind: 'session';
  id: string;
  /** 改过名用改的名；主对话没改过名时为空（界面上叫“项目对话”）。 */
  title: string;
  chatKind: 'main' | 'talk' | 'loop' | 'output';
  projectId: string;
  projectTitle: string;
  lastAt: string;
}

export type SidebarItem = ProjectItem | ChatItem;

export interface SidebarData {
  /** 没藏起来的项目，最近活动的在前。 */
  projects: ProjectItem[];
  /** 没藏起来的对话（所在项目也没藏），最近活动的在前。 */
  chats: ChatItem[];
  /** 置顶的（后置顶的在前），藏起来的不算。 */
  pinned: SidebarItem[];
  /** 没置顶的对话，最近活动的在前。 */
  recents: ChatItem[];
}

export const EMPTY_VIEW: SidebarView = { pinned: [], hidden: [], titles: {} };

const sameRef = (a: SidebarRef, b: SidebarRef) => a.kind === b.kind && a.id === b.id;

function has(list: readonly SidebarRef[], kind: SidebarRef['kind'], id: string): boolean {
  return list.some((r) => sameRef(r, { kind, id }));
}

/** 对话所属的项目（主对话 id）：沿 parent 往上找到主对话；找不到返回空。 */
export function projectOfSession(
  s: SessionSummary,
  byId: ReadonlyMap<string, SessionSummary>,
): string | undefined {
  let cur: SessionSummary | undefined = s;
  for (let i = 0; i < 8 && cur !== undefined; i++) {
    if (cur.kind === 'main') return cur.sessionId;
    cur = cur.parent !== undefined ? byId.get(cur.parent) : undefined;
  }
  return undefined;
}

/** 对话改过的名字叠到列表上（主对话的名字是项目名，不叠）。 */
export function withTitles(
  sessions: readonly SessionSummary[],
  titles: Readonly<Record<string, string>>,
): SessionSummary[] {
  return sessions.map((s) => {
    const t = titles[s.sessionId];
    return t !== undefined && s.kind !== 'main' ? { ...s, title: t } : s;
  });
}

export function buildSidebar(input: {
  projects: readonly ProjectSummary[];
  sessions: readonly SessionSummary[];
  view: SidebarView;
  /** 界面上收到的更新的活动时间（对话 id → 时间），比列表里的新就用它。 */
  activity?: Readonly<Record<string, string>>;
}): SidebarData {
  const { view } = input;
  const activity = input.activity ?? {};
  const byId = new Map(input.sessions.map((s) => [s.sessionId, s]));
  const lastOf = (s: SessionSummary) => {
    const a = activity[s.sessionId];
    const b = s.lastAt ?? s.openedAt;
    return a !== undefined && a > b ? a : b;
  };
  const projectTitle = new Map(input.projects.map((p) => [p.mainSessionId, p.title]));

  const chats: ChatItem[] = [];
  const projectLast = new Map<string, string>();
  for (const s of input.sessions) {
    if (!LISTED.has(s.kind)) continue;
    const pid = projectOfSession(s, byId);
    if (pid === undefined || !projectTitle.has(pid)) continue;
    const last = lastOf(s);
    if ((projectLast.get(pid) ?? '') < last) projectLast.set(pid, last);
    if (has(view.hidden, 'project', pid) || has(view.hidden, 'session', s.sessionId)) continue;
    chats.push({
      kind: 'session',
      id: s.sessionId,
      title: view.titles[s.sessionId] ?? (s.kind === 'main' ? '' : s.title),
      chatKind: s.kind as ChatItem['chatKind'],
      projectId: pid,
      projectTitle: projectTitle.get(pid) ?? '',
      lastAt: last,
    });
  }
  chats.sort((a, b) => b.lastAt.localeCompare(a.lastAt));

  const projects: ProjectItem[] = input.projects
    .filter((p) => !has(view.hidden, 'project', p.mainSessionId))
    .map((p) => ({
      kind: 'project' as const,
      id: p.mainSessionId,
      title: p.title,
      ...(p.goal !== undefined ? { goal: p.goal } : {}),
      lastAt: projectLast.get(p.mainSessionId) ?? '',
    }))
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt));

  const pinned: SidebarItem[] = [];
  for (const r of view.pinned) {
    const item =
      r.kind === 'project' ? projects.find((p) => p.id === r.id) : chats.find((c) => c.id === r.id);
    if (item !== undefined) pinned.push(item);
  }
  const recents = chats.filter((c) => !has(view.pinned, 'session', c.id));
  return { projects, chats, pinned, recents };
}

export type Bucket = 'today' | 'yesterday' | 'week' | 'earlier';

const DAY = 24 * 60 * 60 * 1000;

/** 按本地日历日算：今天、昨天、7 天内（2–6 天前）、更早。 */
export function timeBucket(at: string, now: Date): Bucket {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return 'earlier';
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(d)) / DAY);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return 'week';
  return 'earlier';
}

const ORDER: readonly Bucket[] = ['today', 'yesterday', 'week', 'earlier'];

/** 最近的对话分组（只列有东西的组，组内保持原来的先后）。 */
export function groupByTime<T extends { lastAt: string }>(
  items: readonly T[],
  now: Date,
): { bucket: Bucket; items: T[] }[] {
  const groups = new Map<Bucket, T[]>();
  for (const it of items) {
    const b = timeBucket(it.lastAt, now);
    groups.set(b, [...(groups.get(b) ?? []), it]);
  }
  return ORDER.flatMap((b) => {
    const list = groups.get(b);
    return list !== undefined ? [{ bucket: b, items: list }] : [];
  });
}

/** 搜索：项目按名字、对话按名字（主对话按“项目对话”这个叫法与项目名），不分大小写。 */
export function searchSidebar(
  q: string,
  data: Pick<SidebarData, 'projects' | 'chats'>,
  mainChatName: string,
): { projects: ProjectItem[]; chats: ChatItem[] } {
  const needle = q.trim().toLowerCase();
  if (needle === '') return { projects: data.projects, chats: data.chats };
  const hit = (s: string) => s.toLowerCase().includes(needle);
  return {
    projects: data.projects.filter((p) => hit(p.title)),
    chats: data.chats.filter((c) =>
      c.title !== '' ? hit(c.title) : hit(mainChatName) || hit(c.projectTitle),
    ),
  };
}

/** 置顶状态：这一项置顶了没有。 */
export function isPinned(view: SidebarView, ref: SidebarRef): boolean {
  return view.pinned.some((r) => sameRef(r, ref));
}

/** 对话在列表里显示的名字：主对话没改过名叫“项目对话”。 */
export function chatTitle(c: ChatItem): string {
  return c.title !== '' ? c.title : W.projectChat;
}
