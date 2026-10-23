// 项目页（照 Claude 项目；工单 W9 §4.7）：顶上项目名、方向与齿轮（设置：名字、期限），下面三个页签——
// 学习（默认：今天该做的 · 学习分组 · 提醒 · 阶段复盘）· 资料（本项目资料、添加入口、我导入的学过的、我的产出）
// · 记着什么（项目说明、方向、学过的、状态）。记住上次停在哪个页签。
import { useState, type ReactNode } from 'react';
import {
  BookCheckIcon,
  CircleCheckIcon,
  CircleDotIcon,
  CircleParkingIcon,
  ClipboardListIcon,
  CornerDownRightIcon,
  GaugeIcon,
  InfoIcon,
  LibraryIcon,
  MessageCircleIcon,
  SettingsIcon,
  ShieldCheckIcon,
} from 'lucide-react';
import type {
  LoopLoad,
  LoopStatus,
  ProjectOverview,
  SessionSummary,
} from '../../shared/protocol.ts';
import type { Learning } from '../../shared/protocol-learned.ts';
import { Button } from '@/components/ui/button';
import { TooltipIconButton } from '@/components/assistant-ui/tooltip-icon-button';
import { cn } from '@/lib/utils';
import { api } from '../api.ts';
import { goalRows } from '../goal-model.ts';
import { useLoad } from '../hooks/use-load.ts';
import { projectGroups, type LearnedRow, type UnclosedRow } from '../learned-model.ts';
import { useOpenSession } from '../open-session.ts';
import { usePanel } from '../panel.ts';
import { hasResumes, relationRows } from '../relations-model.ts';
import { W } from '../wording.ts';
import { DeadlineLine, MaterialsTab } from './project-materials.tsx';
import { MemoryTab } from './project-memory.tsx';
import { Badge, Loading } from './evidence/parts.tsx';
import { RemindersSection } from './longterm/reminders.tsx';
import { ReviewsSection } from './longterm/reviews.tsx';
import { TodaySection } from './longterm/today.tsx';
import { ProjectChats } from './project-chats.tsx';
import { useSetting } from '../settings.ts';

type Tab = 'learn' | 'library' | 'memory';
const TABS: readonly Tab[] = ['learn', 'library', 'memory'];
const TAB_KEY = 'studium-project-tab';

/** 上次停在哪个页签（只是本机的方便，读不到就回默认）。 */
function savedTab(): Tab {
  try {
    const v = localStorage.getItem(TAB_KEY);
    return TABS.includes(v as Tab) ? (v as Tab) : 'learn';
  } catch {
    return 'learn';
  }
}

function saveTab(t: Tab): void {
  try {
    localStorage.setItem(TAB_KEY, t);
  } catch {
    // 存不了就算了：下次回默认页签
  }
}

export function ProjectHome(props: {
  projectId: string;
  /** 这个项目里的学习、谈话、写产出、找资料对话（列在“这个项目里的对话”）。 */
  tasks: SessionSummary[];
  header: ReactNode;
  onOpenChat: () => void;
  onRename: (title: string) => void;
  onError: (e: unknown) => void;
}) {
  const r = useLoad(`overview:${props.projectId}`, () => api.overview(props.projectId));
  const o = r.data?.overview;
  const [devMode] = useSetting('devMode');
  const [tab, setTab] = useState<Tab>(savedTab);
  const [settings, setSettings] = useState(false);
  const pick = (t: Tab) => {
    setTab(t);
    saveTab(t);
  };
  return (
    <div data-testid="project-home" className="@container flex h-full flex-col">
      {props.header}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 pt-6 pb-16">
          {!o ? (
            <Loading error={r.error} />
          ) : (
            <>
              <Head
                overview={o}
                onOpenChat={props.onOpenChat}
                onSettings={() => setSettings((x) => !x)}
              />
              {settings && (
                <Settings
                  projectId={props.projectId}
                  title={o.title}
                  onRename={props.onRename}
                  onClose={() => setSettings(false)}
                  onError={props.onError}
                />
              )}
              <nav role="tablist" className="flex gap-1 border-b">
                {TABS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    aria-selected={tab === t}
                    data-testid={`tab-${t}`}
                    className={cn(
                      '-mb-px border-b-2 px-3 py-2 text-sm transition-colors',
                      tab === t
                        ? 'border-foreground text-foreground font-medium'
                        : 'text-muted-foreground hover:text-foreground border-transparent',
                    )}
                    onClick={() => pick(t)}
                  >
                    {W.tabs[t]}
                  </button>
                ))}
              </nav>
              {tab === 'learn' && (
                <>
                  <TodaySection
                    key={o.today?.date ?? ''}
                    overview={o}
                    projectId={props.projectId}
                    onOpenChat={props.onOpenChat}
                    onError={props.onError}
                  />
                  {/* 宽时两栏：左边学习分组，右边提醒与复盘；窄时排在分组下面 */}
                  <div className="grid grid-cols-1 gap-8 @4xl:grid-cols-[minmax(0,1fr)_18rem]">
                    <div className="flex min-w-0 flex-col gap-8">
                      <LoadNotice load={o.load} />
                      <ProjectChats projectId={props.projectId} tasks={props.tasks} />
                      <Groups projectId={props.projectId} overview={o} onError={props.onError} />
                      <Relations projectId={props.projectId} />
                      {/* 资料、记录、教法这些入口：开发者模式关掉时不显示 */}
                      {devMode && <AboutMe />}
                    </div>
                    <aside className="flex min-w-0 flex-col gap-6">
                      <RemindersSection
                        projectId={props.projectId}
                        overview={o}
                        onError={props.onError}
                      />
                      <ReviewsSection projectId={props.projectId} onError={props.onError} />
                    </aside>
                  </div>
                </>
              )}
              {tab === 'library' && (
                <MaterialsTab projectId={props.projectId} onError={props.onError} />
              )}
              {tab === 'memory' && (
                <MemoryTab
                  projectId={props.projectId}
                  overview={o}
                  onOpenChat={props.onOpenChat}
                  onError={props.onError}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** 设置（齿轮）：项目名、期限。模型配置不在这里（开发者面板）。 */
function Settings(props: {
  projectId: string;
  title: string;
  onRename: (title: string) => void;
  onClose: () => void;
  onError: (e: unknown) => void;
}) {
  const [name, setName] = useState(props.title);
  return (
    <div
      data-testid="project-settings"
      className="bg-muted/40 flex flex-col gap-3 rounded-2xl border p-4"
    >
      <div className="flex items-center gap-2">
        <h2 className="font-medium">{W.settings}</h2>
        <Button variant="ghost" size="xs" className="ms-auto" onClick={props.onClose}>
          {W.settingsClose}
        </Button>
      </div>
      <form
        className="flex flex-wrap items-center gap-2 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim() !== '' && name.trim() !== props.title) props.onRename(name.trim());
        }}
      >
        <span className="text-muted-foreground">{W.settingsName}</span>
        <input
          aria-label={W.settingsName}
          className="bg-background min-w-48 flex-1 rounded-md border px-2 py-1"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button
          type="submit"
          size="sm"
          disabled={name.trim() === '' || name.trim() === props.title}
        >
          {W.settingsSave}
        </Button>
      </form>
      <DeadlineLine projectId={props.projectId} onError={props.onError} />
    </div>
  );
}

/** 项目名、方向目标（结构化时逐块显示：能力、为什么学、你确认时的理由、顺序参考、临时版）、回项目对话、齿轮。 */
function Head(props: {
  overview: ProjectOverview;
  onOpenChat: () => void;
  onSettings: () => void;
}) {
  const o = props.overview;
  const rows = goalRows(o.goalView);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <h1 className="font-serif text-3xl tracking-tight">{o.title}</h1>
        {o.deadline !== undefined && <Badge tone="neutral">{`${W.deadline} ${o.deadline}`}</Badge>}
        <TooltipIconButton
          tooltip={W.settings}
          data-testid="project-settings-button"
          className="ms-auto size-8"
          onClick={props.onSettings}
        >
          <SettingsIcon />
        </TooltipIconButton>
      </div>
      <div className="bg-card flex flex-col gap-3 rounded-2xl border p-4 shadow-xs">
        <div>
          <div className="text-muted-foreground mb-1 text-xs">{W.goal}</div>
          {rows.length === 0 ? (
            <div className="font-serif text-[1.05rem] leading-relaxed">{W.goalMissing}</div>
          ) : (
            <div className="flex flex-col gap-2">
              {rows.map((row, i) => (
                <div key={i} className="flex flex-col gap-0.5">
                  <span className="text-muted-foreground text-xs">{row.label}</span>
                  <span className="font-serif text-[1.05rem] leading-relaxed">
                    {row.text}
                    {row.kind === 'ability' && row.reason !== undefined && (
                      <span className="text-muted-foreground text-sm"> · {row.reason}</span>
                    )}
                  </span>
                  {row.confirmedReason !== undefined && (
                    <span className="text-muted-foreground text-xs">
                      {W.goalConfirmedReason(row.confirmedReason)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div>
        <Button variant="outline" size="sm" onClick={props.onOpenChat}>
          <MessageCircleIcon />
          {W.backToChat}
        </Button>
      </div>
    </div>
  );
}

/** 同时开着的太多 / 没学完的攒多了：用日常话提醒一句（只提醒，不拦）。 */
function LoadNotice(props: { load: LoopLoad }) {
  const { load } = props;
  if (!load.heavy && !load.parkingPile) return null;
  return (
    <div
      data-testid="load-notice"
      className="flex flex-col gap-1 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 dark:bg-amber-900/20 dark:text-amber-200"
    >
      {load.heavy && <div>{W.loadHeavy(load.unfinished)}</div>}
      {load.parkingPile && <div>{W.loadPile(load.parked)}</div>}
    </div>
  );
}

/**
 * 学习按 等你选 · 进行中 · 学完了 · 先放下的（没合上）分组：前两处照概览，后面按 /api/learned
 * 的每次学习列（没合上的 = 停车场，带上层：结束原话 + 当时的路线决定）。
 */
function Groups(props: {
  projectId: string;
  overview: ProjectOverview;
  onError: (e: unknown) => void;
}) {
  const r = useLoad(`learned:${props.projectId}`, () => api.learned(props.projectId));
  const learnings = r.data?.learnings ?? [];
  const shelvedIds = (props.overview.groups.shelved ?? []).map((l) => l.sessionId);
  const g = projectGroups(learnings, shelvedIds);
  const byId = new Map(learnings.map((l) => [l.loopId, l]));
  return (
    <div className="flex flex-col gap-6">
      {!r.data ? (
        <Loading error={r.error} />
      ) : (
        <>
          <LearnedGroup
            icon={<CircleDotIcon className="text-primary" />}
            title={W.groups.inProgress}
            hint={W.groupHints.inProgress}
            rows={g.inProgress}
            learnings={byId}
            testId="group-in-progress"
          />
          <LearnedGroup
            icon={<CircleCheckIcon className="text-emerald-600" />}
            title={W.groups.closed}
            hint={W.groupHints.closed}
            rows={g.closed}
            learnings={byId}
            testId="group-closed"
          />
          <LearnedGroup
            icon={<CircleParkingIcon className="text-amber-600" />}
            title={W.groups.unclosed}
            hint={W.groupHints.unclosed}
            rows={g.unclosed}
            learnings={byId}
            testId="group-unclosed"
          />
        </>
      )}
    </div>
  );
}

function Group(props: {
  icon: ReactNode;
  title: string;
  hint: string;
  count: number;
  testId: string;
  children: ReactNode;
}) {
  return (
    <section data-testid={props.testId} className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2 [&_svg]:size-4 [&_svg]:self-center">
        {props.icon}
        <h2 className="font-medium">{props.title}</h2>
        <span className="text-muted-foreground text-sm">{props.count}</span>
        <span className="text-muted-foreground ms-2 hidden text-xs @lg:inline">{props.hint}</span>
      </div>
      {props.count === 0 ? (
        <div className="text-muted-foreground ps-6 text-sm">{W.noneYet}</div>
      ) : (
        <div className="flex flex-col gap-2">{props.children}</div>
      )}
    </section>
  );
}

function LearnedGroup(props: {
  icon: ReactNode;
  title: string;
  hint: string;
  rows: (LearnedRow | UnclosedRow)[];
  learnings: Map<string, Learning>;
  testId: string;
}) {
  return (
    <Group
      icon={props.icon}
      title={props.title}
      hint={props.hint}
      count={props.rows.length}
      testId={props.testId}
    >
      {props.rows.map((row) => (
        <LearnedRowItem key={row.loopId} row={row} learning={props.learnings.get(row.loopId)} />
      ))}
    </Group>
  );
}

function LearnedRowItem(props: { row: LearnedRow | UnclosedRow; learning: Learning | undefined }) {
  const open = useOpenSession();
  const panel = usePanel();
  const { row } = props;
  const ticket = props.learning?.ticket;
  const rd = 'routeDecision' in row ? row.routeDecision : undefined;
  const endNote = 'endNote' in row ? row.endNote : undefined;
  return (
    <div className="bg-card hover:border-foreground/20 group flex items-stretch rounded-xl border shadow-xs transition-colors">
      <button
        type="button"
        className="flex flex-1 flex-col gap-0.5 px-4 py-2.5 text-left"
        onClick={() => open(row.loopId)}
      >
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="font-medium">{row.title}</span>
          <Badge
            tone={row.status === '合上' ? 'good' : row.status === '没合上' ? 'warn' : 'accent'}
          >
            {row.statusLabel}
          </Badge>
          {row.shelved && <Badge tone="warn">{W.shelvedBadge}</Badge>}
          {ticket?.revisit !== undefined && (
            <Badge tone="accent" title={W.revisitHint[ticket.revisit.kind]}>
              {W.revisitKind[ticket.revisit.kind]}
            </Badge>
          )}
          {ticket?.stageCheck === true && (
            <Badge tone="warn" title={W.stageCheckHint}>
              {W.stageCheck}
            </Badge>
          )}
        </span>
        {ticket?.resumeOf !== undefined && (
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <CornerDownRightIcon className="size-3" />
            {W.ticketResumeOfText}
          </span>
        )}
        {endNote !== undefined && (
          <span className="text-muted-foreground text-xs">
            {W.unclosedLine}：{endNote}
          </span>
        )}
        {rd !== undefined && (
          <span className="text-muted-foreground text-xs">
            {W.routeDecision}：{rd.decision}（{rd.reason}）
          </span>
        )}
        <span className="text-muted-foreground flex flex-wrap gap-x-3 text-xs">
          {row.newPoint !== '' && row.newPoint !== row.title && (
            <span>
              {W.newPoint}：{row.newPoint}
            </span>
          )}
          <span>{row.time}</span>
        </span>
      </button>
      <button
        type="button"
        title={W.loopBasis}
        aria-label={`${row.title}：${W.loopBasis}`}
        className="text-muted-foreground hover:text-foreground hover:bg-accent/60 flex items-center rounded-e-xl border-s px-3"
        onClick={() => panel.show({ kind: 'loop', loopId: row.loopId })}
      >
        <ShieldCheckIcon className="size-4" />
      </button>
    </div>
  );
}

const STATUS_TONE: Record<LoopStatus, 'good' | 'warn' | 'accent'> = {
  closed: 'good',
  unclosed: 'warn',
  in_progress: 'accent',
};

/** 学习之间的来龙去脉：每段从哪来（选择卡 / 接着以前那次学习）。只在有接着学时显示。 */
function Relations(props: { projectId: string }) {
  const r = useLoad(`relations:${props.projectId}`, () => api.loopRelations(props.projectId));
  const open = useOpenSession();
  const panel = usePanel();
  const relations = r.data?.relations ?? [];
  if (!hasResumes(relations)) return null;
  return (
    <section data-testid="loop-relations" className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2 [&_svg]:size-4 [&_svg]:self-center">
        <CornerDownRightIcon className="text-muted-foreground" />
        <h2 className="font-medium">{W.relations}</h2>
        <span className="text-muted-foreground ms-2 hidden text-xs @lg:inline">
          {W.relationsHint}
        </span>
      </div>
      <ul className="bg-card flex flex-col rounded-xl border py-1 shadow-xs">
        {relationRows(relations).map(({ rel, depth }) => (
          <li
            key={rel.loopSessionId}
            className="hover:bg-accent/40 flex items-center gap-2 py-1.5 pe-2 text-sm"
            style={{ paddingInlineStart: `${String(0.75 + depth * 1.25)}rem` }}
          >
            {depth > 0 && <CornerDownRightIcon className="text-muted-foreground size-3.5" />}
            <button
              type="button"
              className="truncate text-left hover:underline"
              onClick={() => open(rel.loopSessionId)}
            >
              {rel.title}
            </button>
            <Badge tone={STATUS_TONE[rel.status]}>
              {rel.shelved === true ? W.shelvedBadge : W.status[rel.status]}
            </Badge>
            {rel.origin.kind === 'resume' && (
              <span className="text-muted-foreground hidden text-xs @lg:inline">
                {W.resumeOfLine(
                  relations.find(
                    (x) => rel.origin.kind === 'resume' && x.loopSessionId === rel.origin.fromLoop,
                  )?.title ?? W.thatPart,
                )}
              </span>
            )}
            {rel.origin.kind === 'card' && depth === 0 && (
              <span className="text-muted-foreground hidden text-xs @lg:inline">
                {W.originCard}
              </span>
            )}
            <button
              type="button"
              title={W.loopBasis}
              aria-label={`${rel.title}：${W.loopBasis}`}
              className="text-muted-foreground hover:text-foreground ms-auto"
              onClick={() => panel.show({ kind: 'loop', loopId: rel.loopSessionId })}
            >
              <InfoIcon className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AboutMe() {
  const panel = usePanel();
  const items: { icon: ReactNode; label: string; onClick: () => void }[] = [
    { icon: <LibraryIcon />, label: W.library, onClick: () => panel.show({ kind: 'library' }) },
    { icon: <BookCheckIcon />, label: W.learned, onClick: () => panel.show({ kind: 'learned' }) },
    { icon: <GaugeIcon />, label: W.myState, onClick: () => panel.show({ kind: 'state' }) },
    {
      icon: <ClipboardListIcon />,
      label: W.teaching,
      onClick: () => panel.show({ kind: 'teaching' }),
    },
  ];
  return (
    <div className="grid grid-cols-1 gap-2 @md:grid-cols-2 @2xl:grid-cols-3">
      {items.map((it) => (
        <button
          key={it.label}
          type="button"
          className="bg-card hover:bg-accent/40 flex items-center gap-2 rounded-xl border px-3 py-3 text-left text-sm shadow-xs [&_svg]:size-4"
          onClick={it.onClick}
        >
          <span className="text-muted-foreground">{it.icon}</span>
          {it.label}
        </button>
      ))}
    </div>
  );
}
