import { describe, expect, it } from 'vitest';
import type { ProjectSummary, SessionSummary } from '../shared/protocol.ts';
import {
  buildSidebar,
  EMPTY_VIEW,
  groupByTime,
  searchSidebar,
  timeBucket,
  withTitles,
} from './sidebar-model.ts';

const projects: ProjectSummary[] = [
  { mainSessionId: 'm1', title: '力学' },
  { mainSessionId: 'm2', title: '线性代数', goal: '学会特征值' },
];

const sessions: SessionSummary[] = [
  {
    sessionId: 'm1',
    kind: 'main',
    title: '项目 1',
    openedAt: '2026-10-01T00:00:00Z',
    lastAt: '2026-10-05T00:00:00Z',
  },
  {
    sessionId: 'm2',
    kind: 'main',
    title: '项目 2',
    openedAt: '2026-10-02T00:00:00Z',
    lastAt: '2026-10-02T00:00:00Z',
  },
  {
    sessionId: 'l1',
    kind: 'loop',
    title: '加速度',
    openedAt: '2026-10-03T00:00:00Z',
    lastAt: '2026-10-12T00:00:00Z',
    parent: 'm1',
  },
  {
    sessionId: 'f1',
    kind: 'loop',
    title: '位移',
    openedAt: '2026-10-04T00:00:00Z',
    lastAt: '2026-10-04T00:00:00Z',
    parent: 'm1',
    from: { kind: 'fork', loop: 'l1' },
  },
  {
    sessionId: 't2',
    kind: 'talk',
    title: '谈谈',
    openedAt: '2026-10-06T00:00:00Z',
    lastAt: '2026-10-08T00:00:00Z',
    parent: 'm2',
  },
  {
    sessionId: 'g1',
    kind: 'guard',
    title: '判断',
    openedAt: '2026-10-12T00:00:00Z',
    lastAt: '2026-10-13T00:00:00Z',
    parent: 'l1',
  },
];

describe('buildSidebar', () => {
  it('最近：只列看得见的对话种类，按活动时间倒序，标所属项目；项目按最近活动排', () => {
    const d = buildSidebar({ projects, sessions, view: EMPTY_VIEW });
    expect(d.recents.map((c) => c.id)).toEqual(['l1', 't2', 'm1', 'f1', 'm2']);
    expect(d.recents.find((c) => c.id === 't2')?.projectTitle).toBe('线性代数');
    expect(d.recents.find((c) => c.id === 'm1')?.title).toBe('');
    expect(d.projects.map((p) => p.id)).toEqual(['m1', 'm2']);
    expect(d.projects[0]?.lastAt).toBe('2026-10-12T00:00:00Z');
  });

  it('界面上收到的新活动时间会把对话顶上去', () => {
    const d = buildSidebar({
      projects,
      sessions,
      view: EMPTY_VIEW,
      activity: { m2: '2026-10-13T00:00:00Z', l1: '2000-01-01T00:00:00Z' },
    });
    expect(d.recents[0]?.id).toBe('m2');
    expect(d.recents[1]?.id).toBe('l1');
    expect(d.projects[0]?.id).toBe('m2');
  });

  it('置顶的不在最近里；藏起来的项目连它的对话都不列；改名叠上去', () => {
    const d = buildSidebar({
      projects,
      sessions,
      view: {
        pinned: [
          { kind: 'session', id: 'f1' },
          { kind: 'project', id: 'm1' },
          { kind: 'project', id: 'm2' },
        ],
        hidden: [
          { kind: 'project', id: 'm2' },
          { kind: 'session', id: 'm1' },
        ],
        titles: { f1: '位移（补）' },
      },
    });
    expect(d.pinned.map((p) => `${p.kind}:${p.id}`)).toEqual(['session:f1', 'project:m1']);
    expect(d.recents.map((c) => c.id)).toEqual(['l1']);
    expect(d.projects.map((p) => p.id)).toEqual(['m1']);
    expect(d.pinned[0]?.title).toBe('位移（补）');
  });
});

describe('timeBucket / groupByTime', () => {
  const now = new Date(2026, 9, 13, 10, 0);
  const local = (day: number, h = 12) => new Date(2026, 9, day, h).toISOString();

  it('按本地日历日分：今天、昨天、7 天内、更早', () => {
    expect(timeBucket(local(13, 0), now)).toBe('today');
    expect(timeBucket(local(12, 23), now)).toBe('yesterday');
    expect(timeBucket(local(7), now)).toBe('week');
    expect(timeBucket(local(6), now)).toBe('earlier');
    expect(timeBucket('不是时间', now)).toBe('earlier');
  });

  it('只列有东西的组，组内保持先后', () => {
    const g = groupByTime(
      [
        { id: 'a', lastAt: local(13) },
        { id: 'b', lastAt: local(10) },
        { id: 'c', lastAt: local(13, 1) },
        { id: 'd', lastAt: local(1) },
      ],
      now,
    );
    expect(g.map((x) => [x.bucket, x.items.map((i) => i.id)])).toEqual([
      ['today', ['a', 'c']],
      ['week', ['b']],
      ['earlier', ['d']],
    ]);
  });
});

describe('searchSidebar / withTitles', () => {
  const d = buildSidebar({ projects, sessions, view: EMPTY_VIEW });

  it('项目按名字、对话按名字找；主对话按“项目对话”与项目名找；空查询全列', () => {
    const r = searchSidebar('线性', d, '项目对话');
    expect(r.projects.map((p) => p.id)).toEqual(['m2']);
    expect(r.chats.map((c) => c.id)).toEqual(['m2']);
    expect(searchSidebar('加速', d, '项目对话').chats.map((c) => c.id)).toEqual(['l1']);
    expect(searchSidebar('项目对话', d, '项目对话').chats.map((c) => c.id)).toEqual(['m1', 'm2']);
    expect(searchSidebar('  ', d, '项目对话').chats).toHaveLength(5);
  });

  it('改过的对话名叠到列表上，主对话不叠', () => {
    const out = withTitles(sessions, { l1: '新名', m1: '不该叠' });
    expect(out.find((s) => s.sessionId === 'l1')?.title).toBe('新名');
    expect(out.find((s) => s.sessionId === 'm1')?.title).toBe('项目 1');
  });
});
