// 项目页（照 Claude 项目；界面说明 §2.7–§2.10）：顶上项目名（学习者自己起）、期限、齿轮（设置弹窗：名字、期限）与进项目对话，
// 下面三个页签——学习（今天该做的 · 在学 / 搁着 / 学完 · 右栏提醒与复盘）· 资料（本项目资料、添加入口、在别处学过的、
// 我的产出）· 记着什么（项目说明、方向、学过的、状态）。讨论串在项目对话右边，这里不再列。记住上次停在哪个页签。
import { useState, type ReactNode } from 'react';
import {
  CircleCheckIcon,
  CircleDotIcon,
  CircleParkingIcon,
  CornerDownRightIcon,
  InfoIcon,
  MessageCircleIcon,
  SettingsIcon,
} from 'lucide-react';
import type { LoopLoad, LoopStatus, ProjectOverview } from '../../shared/protocol.ts';
import type { Learning } from '../../shared/protocol-learned.ts';
import { Button } from '@/components/ui/button';
import { TooltipIconButton } from '@/components/assistant-ui/tooltip-icon-button';
import { cn } from '@/lib/utils';
import { api } from '../api.ts';
import { useLoad } from '../hooks/use-load.ts';
import { projectGroups, type LearnedRow, type UnclosedRow } from '../learned-model.ts';
import { useOpenSession } from '../open-session.ts';
import { usePanel } from '../panel.ts';
import { hasResumes, relationRows } from '../relations-model.ts';
import { W } from '../wording.ts';
import { forLearner } from '../learner-text.ts';
import { DeadlineLine, MaterialsTab } from './project-materials.tsx';
import { MemoryTab } from './project-memory.tsx';
import { Badge, Loading } from './evidence/parts.tsx';
import { RemindersSection } from './longterm/reminders.tsx';
import { ReviewsSection } from './longterm/reviews.tsx';
import { TodaySection } from './longterm/today.tsx';
import { Modal } from './input/modal.tsx';

type Tab = 'learn' | 'materials' | 'memory';
const TABS: readonly Tab[] = ['learn', 'materials', 'memory'];
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
  header: ReactNode;
  /** 右侧面板开着：主区窄了，右栏（提醒、复盘）先收起（界面说明 §2.11）。 */
  panelOpen: boolean;
  onOpenChat: () => void;
  onRename: (title: string) => void;
  onError: (e: unknown) => void;
}) {
  const r = useLoad(`overview:${props.projectId}`, () => api.overview(props.projectId));
  const o = r.data?.overview;
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
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 pt-4 pb-16 md:px-6">
          {!o ? (
            <Loading error={r.error} />
          ) : (
            <>
              <Head
                overview={o}
                onOpenChat={props.onOpenChat}
                onSettings={() => setSettings(true)}
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
              <div className="flex flex-col gap-6">
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
                    {/* 宽时两栏：左边各次学习，右边提醒与复盘；窄时排在下面；面板开着时先收起右栏 */}
                    <div
                      className={cn(
                        'grid grid-cols-1 gap-8',
                        !props.panelOpen && '@4xl:grid-cols-[minmax(0,1fr)_16rem]',
                      )}
                    >
                      <div className="flex min-w-0 flex-col gap-8">
                        <LoadNotice load={o.load} />
                        <Groups projectId={props.projectId} overview={o} onError={props.onError} />
                        <Relations projectId={props.projectId} />
                      </div>
                      {!props.panelOpen && (
                        <aside className="flex min-w-0 flex-col gap-6">
                          <RemindersSection
                            projectId={props.projectId}
                            overview={o}
                            onError={props.onError}
                          />
                          <ReviewsSection projectId={props.projectId} onError={props.onError} />
                        </aside>
                      )}
                    </div>
                  </>
                )}
                {tab === 'materials' && (
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
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** 设置（齿轮，小弹窗）：项目名、期限。模型配置不在这里。 */
function Settings(props: {
  projectId: string;
  title: string;
  onRename: (title: string) => void;
  onClose: () => void;
  onError: (e: unknown) => void;
}) {
  const [name, setName] = useState(props.title);
  return (
    <Modal label={W.settings} onClose={props.onClose} className="w-[min(30rem,92vw)] p-5">
      <div data-testid="project-settings" className="flex flex-col gap-4 text-sm">
        <h2 className="font-medium">{W.settings}</h2>
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim() !== '' && name.trim() !== props.title) props.onRename(name.trim());
          }}
        >
          <span className="text-muted-foreground">{W.settingsName}</span>
          <input
            aria-label={W.settingsName}
            className="bg-background min-w-40 flex-1 rounded-md border px-2 py-1"
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
    </Modal>
  );
}

/** 页头（界面说明 §2.7）：项目名 · 期限 · 齿轮 · 进项目对话。 */
function Head(props: {
  overview: ProjectOverview;
  onOpenChat: () => void;
  onSettings: () => void;
}) {
  const o = props.overview;
  return (
    <div className="flex items-center gap-2">
      <h1 className="font-serif text-2xl tracking-tight">{o.title}</h1>
      {o.deadline !== undefined && <Badge tone="neutral">{`${W.deadline} ${o.deadline}`}</Badge>}
      <TooltipIconButton
        tooltip={W.settings}
        data-testid="project-settings-button"
        className="text-muted-foreground ms-auto size-8"
        onClick={props.onSettings}
      >
        <SettingsIcon />
      </TooltipIconButton>
      <Button variant="outline" size="sm" data-testid="home-open-chat" onClick={props.onOpenChat}>
        <MessageCircleIcon />
        {W.backToChat}
      </Button>
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
 * 各次学习按 在学 · 搁着 · 学完 分组（设计 01-流程 §1）；空的组整块不显示，全空时一句空状态（界面说明 §2.8）。
 * 学完的默认只列最近 3 次。
 */
function Groups(props: {
  projectId: string;
  overview: ProjectOverview;
  onError: (e: unknown) => void;
}) {
  const r = useLoad(`learned:${props.projectId}`, () => api.learned(props.projectId));
  const [allClosed, setAllClosed] = useState(false);
  if (!r.data) return <Loading error={r.error} />;
  const learnings = r.data.learnings;
  const shelvedIds = (props.overview.groups.shelved ?? []).map((l) => l.sessionId);
  const g = projectGroups(learnings, shelvedIds);
  const byId = new Map(learnings.map((l) => [l.loopId, l]));
  if (g.inProgress.length + g.unclosed.length + g.closed.length === 0) {
    return (
      <div
        data-testid="learn-empty"
        className="text-muted-foreground rounded-xl border border-dashed px-4 py-6 text-center text-sm"
      >
        {W.learnEmpty}
      </div>
    );
  }
  const closed = allClosed ? g.closed : g.closed.slice(0, 3);
  return (
    <div className="flex flex-col gap-6">
      <LearnedGroup
        icon={<CircleDotIcon className="text-primary" />}
        title={W.groups.inProgress}
        rows={g.inProgress}
        learnings={byId}
        testId="group-in-progress"
      />
      <LearnedGroup
        icon={<CircleParkingIcon className="text-amber-600" />}
        title={W.groups.unclosed}
        hint={W.groupHints.unclosed}
        rows={g.unclosed}
        learnings={byId}
        testId="group-unclosed"
      />
      <LearnedGroup
        icon={<CircleCheckIcon className="text-emerald-600" />}
        title={W.groups.closed}
        rows={closed}
        total={g.closed.length}
        learnings={byId}
        testId="group-closed"
        more={
          !allClosed && g.closed.length > 3 ? (
            <Button variant="ghost" size="xs" onClick={() => setAllClosed(true)}>
              {W.closedMore(g.closed.length)}
            </Button>
          ) : undefined
        }
      />
    </div>
  );
}

function LearnedGroup(props: {
  icon: ReactNode;
  title: string;
  hint?: string;
  rows: (LearnedRow | UnclosedRow)[];
  /** 组里一共几次（只列了一部分时）。 */
  total?: number;
  learnings: Map<string, Learning>;
  testId: string;
  more?: ReactNode;
}) {
  if (props.rows.length === 0) return null;
  return (
    <section data-testid={props.testId} className="flex flex-col gap-3">
      <div className="flex items-baseline gap-2 [&_svg]:size-4 [&_svg]:self-center">
        {props.icon}
        <h2 className="text-base font-medium">{props.title}</h2>
        <span className="text-muted-foreground text-sm">{props.total ?? props.rows.length}</span>
        {props.hint !== undefined && (
          <span className="text-muted-foreground ms-1 hidden text-xs @lg:inline">{props.hint}</span>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {props.rows.map((row) => (
          <LearnedRowItem key={row.loopId} row={row} learning={props.learnings.get(row.loopId)} />
        ))}
      </div>
      {props.more}
    </section>
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
    <div className="bg-card hover:border-foreground/20 group flex items-stretch rounded-xl border transition-colors">
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
            {W.routeDecision}：{rd.decision}（{forLearner(rd.reason)}）
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
        className="text-muted-foreground hover:text-foreground hover:bg-accent/60 flex shrink-0 items-center rounded-e-xl border-s px-3 text-xs"
        onClick={() => panel.show({ kind: 'loop', loopId: row.loopId })}
      >
        {W.loopBasisShort}
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
