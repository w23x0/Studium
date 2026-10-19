// 项目概览顶部“今天该做的”（批 6）：到期的提醒（复检以前学过的一块、接着某段学、期限前准备……）、
// 快到的期限、该复盘了。每条可点去做；提醒可标“做完了 / 跳过”，期限与复盘可“今天先不”（只记在本机，第二天再出现）。
import { useState } from 'react';
import { BellIcon, CalendarClockIcon, HistoryIcon } from 'lucide-react';
import type { LoopBrief, ProjectOverview, TodayItem } from '../../../shared/protocol.ts';
import { Button } from '@/components/ui/button';
import { api } from '../../api.ts';
import { todayKey, todaySkipStorageKey, visibleToday } from '../../longterm-model.ts';
import { useOpenSession } from '../../open-session.ts';
import { W } from '../../wording.ts';
import { Badge } from '../evidence/parts.tsx';

function readLater(key: string): string[] {
  const raw = localStorage.getItem(key);
  if (raw === null) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch (e) {
    // 存坏了就当没存过（只影响“今天先不”的显示）
    console.warn('今天先不的记录读不出：', e);
    return [];
  }
}

/** 项目里一段学习的概要（各分组里找）。 */
export function findLoop(o: ProjectOverview, id: string): LoopBrief | undefined {
  const g = o.groups;
  return [...g.inProgress, ...g.closed, ...g.unclosed, ...(g.shelved ?? [])].find(
    (l) => l.sessionId === id,
  );
}

/**
 * “接着学某段”：已经有人接着学的去最新那段；还开着的 / 没合上的直接打开（接着学经导航的卡，W6 做界面）。
 */
export function useGoOnWith() {
  // 现在的“接着学”只打开那段（接着学经导航的卡，W6 做界面）
  const open = useOpenSession();
  return (o: ProjectOverview | undefined, loopId: string): Promise<void> => {
    const brief = o !== undefined ? findLoop(o, loopId) : undefined;
    if (brief?.status === 'unclosed') {
      const next = brief.resumedBy?.at(-1);
      if (next !== undefined) {
        open(next.loopSessionId);
        return Promise.resolve();
      }
    }
    open(loopId);
    return Promise.resolve();
  };
}

export function TodaySection(props: {
  overview: ProjectOverview;
  projectId: string;
  onOpenChat: () => void;
  onError: (e: unknown) => void;
}) {
  const { overview: o, projectId, onError } = props;
  const today = o.today;
  const storageKey = todaySkipStorageKey(projectId, today?.date ?? '');
  const [later, setLater] = useState<string[]>(() => readLater(storageKey));
  const [busy, setBusy] = useState<string | undefined>();
  const open = useOpenSession();
  const goOn = useGoOnWith();
  if (today === undefined) return null;
  const items = visibleToday(today.items, later);
  if (items.length === 0) return null;

  const run = (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    fn()
      .catch(onError)
      .finally(() => setBusy(undefined));
  };
  const putOff = (key: string) => {
    const next = [...later, key];
    localStorage.setItem(storageKey, JSON.stringify(next));
    setLater(next);
  };
  const nextStep = () =>
    api.requestCard(projectId).then(() => {
      props.onOpenChat();
    });

  return (
    <section
      data-testid="today"
      className="border-primary/30 bg-primary/5 flex flex-col gap-2 rounded-2xl border p-4"
    >
      <div className="flex items-baseline gap-2">
        <h2 className="font-medium">{W.today}</h2>
        <span className="text-muted-foreground text-sm">{items.length}</span>
        <span className="text-muted-foreground ms-2 hidden text-xs @lg:inline">{W.todayHint}</span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {items.map((item) => {
          const key = todayKey(item);
          const doing = busy === key;
          return (
            <li
              key={key}
              className="bg-card flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border px-3 py-2 text-sm shadow-xs"
            >
              <ItemText item={item} />
              <div className="ms-auto flex items-center gap-1">
                {doing && <span className="text-muted-foreground text-xs">{W.todayDoing}</span>}
                <DoButton
                  item={item}
                  disabled={busy !== undefined}
                  onDo={() =>
                    run(key, () => {
                      if (item.kind === 'review') {
                        return api.startReview(projectId).then((r) => open(r.reviewSessionId));
                      }
                      if (item.kind === 'deadline') return nextStep();
                      const r = item.reminder;
                      if (r.kind === 'resume' && r.loopSessionId !== undefined) {
                        return goOn(o, r.loopSessionId);
                      }
                      if (r.kind === 'review') {
                        return api.startReview(projectId).then((x) => open(x.reviewSessionId));
                      }
                      // 复检：请安排下一步的那一方出选项（它看得到到期的提醒），选了就开
                      return nextStep();
                    })
                  }
                />
                {item.kind === 'reminder' ? (
                  <>
                    <Button
                      variant="ghost"
                      size="xs"
                      disabled={busy !== undefined}
                      onClick={() =>
                        run(key, () => api.closeReminder(projectId, item.reminder.id, 'done'))
                      }
                    >
                      {W.todayDone}
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      className="text-muted-foreground"
                      disabled={busy !== undefined}
                      onClick={() =>
                        run(key, () => api.closeReminder(projectId, item.reminder.id, 'dismissed'))
                      }
                    >
                      {W.todaySkip}
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="ghost"
                    size="xs"
                    className="text-muted-foreground"
                    onClick={() => putOff(key)}
                  >
                    {W.todayLater}
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ItemText(props: { item: TodayItem }) {
  const { item } = props;
  if (item.kind === 'reminder') {
    const r = item.reminder;
    return (
      <span className="flex min-w-0 items-center gap-2">
        <BellIcon className="text-primary size-4 shrink-0" />
        <Badge tone={r.kind === 'recheck' ? 'accent' : 'neutral'}>{W.reminderKind[r.kind]}</Badge>
        <span className="min-w-0">{r.text}</span>
        <span className="text-muted-foreground shrink-0 text-xs">
          {W.overdue(item.overdueDays)}
        </span>
      </span>
    );
  }
  if (item.kind === 'deadline') {
    return (
      <span className="flex min-w-0 items-center gap-2">
        <CalendarClockIcon className="size-4 shrink-0 text-amber-600" />
        <span>
          {W.deadlineNear(item.daysLeft)}（{item.date}）
        </span>
        {item.note !== undefined && item.note !== '' && (
          <span className="text-muted-foreground text-xs">{item.note}</span>
        )}
      </span>
    );
  }
  return (
    <span className="flex min-w-0 items-center gap-2">
      <HistoryIcon className="text-primary size-4 shrink-0" />
      <span>{W.reviewDue(item.endedLoops)}</span>
    </span>
  );
}

function doLabel(item: TodayItem): string | undefined {
  if (item.kind === 'review') return W.reviewStart;
  if (item.kind === 'deadline') return W.nextStep;
  switch (item.reminder.kind) {
    case 'review':
      return W.reviewStart;
    case 'resume':
      return item.reminder.loopSessionId !== undefined ? W.resume : undefined;
    case 'recheck':
      return W.todayDo;
    // 写着“别的事 / 期限”的提醒没有固定的去处：只能标做完了或跳过
    case 'other':
    case 'deadline':
      return undefined;
  }
}

function DoButton(props: { item: TodayItem; disabled: boolean; onDo: () => void }) {
  const label = doLabel(props.item);
  if (label === undefined) return null;
  return (
    <Button variant="outline" size="xs" disabled={props.disabled} onClick={props.onDo}>
      {label}
    </Button>
  );
}
