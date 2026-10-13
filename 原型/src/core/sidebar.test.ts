import { describe, expect, it } from 'vitest';
import type { SessionSummary } from '../shared/protocol.ts';
import type { SidebarEvent } from '../shared/sidebar.ts';
import { foldSidebar, parseSidebarAction } from './sidebar.ts';
import { BadRequestError } from './studium.ts';

const at = '2026-10-13T00:00:00.000Z';
const ev = (e: Omit<SidebarEvent, 'at'>): SidebarEvent => ({ at, ...e });

describe('foldSidebar', () => {
  it('后置顶的在前；取消置顶去掉；重复置顶挪到最前', () => {
    const v = foldSidebar([
      ev({ kind: 'project', id: 'a', action: 'pin' }),
      ev({ kind: 'session', id: 'b', action: 'pin' }),
      ev({ kind: 'project', id: 'c', action: 'pin' }),
      ev({ kind: 'project', id: 'a', action: 'pin' }),
      ev({ kind: 'project', id: 'c', action: 'unpin' }),
    ]);
    expect(v.pinned).toEqual([
      { kind: 'project', id: 'a' },
      { kind: 'session', id: 'b' },
    ]);
  });

  it('藏起来的同时去掉它的置顶；项目与对话分开算', () => {
    const v = foldSidebar([
      ev({ kind: 'project', id: 'a', action: 'pin' }),
      ev({ kind: 'session', id: 'a', action: 'pin' }),
      ev({ kind: 'project', id: 'a', action: 'hide' }),
      ev({ kind: 'project', id: 'a', action: 'hide' }),
    ]);
    expect(v.hidden).toEqual([{ kind: 'project', id: 'a' }]);
    expect(v.pinned).toEqual([{ kind: 'session', id: 'a' }]);
  });

  it('对话改名后改的算数', () => {
    const v = foldSidebar([
      ev({ kind: 'session', id: 'x', action: 'rename', title: '一' }),
      ev({ kind: 'session', id: 'x', action: 'rename', title: '二' }),
    ]);
    expect(v.titles).toEqual({ x: '二' });
  });
});

describe('parseSidebarAction', () => {
  const sessions: SessionSummary[] = [
    { sessionId: 'm', kind: 'main', title: '项目', openedAt: at },
    { sessionId: 'l', kind: 'loop', title: '一段', openedAt: at, parent: 'm' },
    { sessionId: 'g', kind: 'guard', title: '判断', openedAt: at, parent: 'l' },
  ];

  it('合法的原样读出，名字去掉首尾空白', () => {
    expect(parseSidebarAction({ kind: 'project', id: 'm', action: 'pin' }, sessions)).toEqual({
      kind: 'project',
      id: 'm',
      action: 'pin',
    });
    expect(
      parseSidebarAction({ kind: 'session', id: 'l', action: 'rename', title: ' 新 ' }, sessions),
    ).toEqual({ kind: 'session', id: 'l', action: 'rename', title: '新' });
  });

  it('不认识的、不是项目的、后台对话、空名字都拒绝', () => {
    const bad = [
      { kind: 'project', id: 'zz', action: 'pin' },
      { kind: 'project', id: 'l', action: 'pin' },
      { kind: 'session', id: 'g', action: 'hide' },
      { kind: 'session', id: 'l', action: 'delete' },
      { kind: 'other', id: 'l', action: 'pin' },
      { kind: 'session', id: 'l', action: 'rename', title: '  ' },
      null,
    ];
    for (const b of bad) expect(() => parseSidebarAction(b, sessions)).toThrow(BadRequestError);
  });
});
