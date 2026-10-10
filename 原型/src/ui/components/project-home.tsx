// 项目概览（照 Claude 项目的 Overview：按状态分组）：想学的方向与期限；学习按 等你选 · 进行中 · 等补完回来的 ·
// 先放一放的 · 学完了 · 先放下的（没学完）分组，没学完的带“缺在哪、打算何时从哪接上”；同时开着太多时顶部提醒；
// 岔开过的话列出学习之间的来龙去脉；“我的产出”列出自己写的东西（批 8b）。旁边一栏是项目资料（照 Claude 项目的“项目知识”）。
import type { ReactNode } from 'react';
import {
  BookCheckIcon,
  CircleCheckIcon,
  CircleDotIcon,
  CircleParkingIcon,
  CirclePauseIcon,
  ClipboardListIcon,
  CornerDownRightIcon,
  GitForkIcon,
  InfoIcon,
  GaugeIcon,
  LibraryIcon,
  ListTreeIcon,
  MessageCircleIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from 'lucide-react';
import type {
  LoopBrief,
  LoopLoad,
  LoopStatus,
  ParkingView,
  ProjectOverview,
} from '../../shared/protocol.ts';
import { Button } from '@/components/ui/button';
import { api } from '../api.ts';
import { shortTime } from '../evidence-model.ts';
import { useLoad } from '../hooks/use-load.ts';
import { useOpenSession } from '../open-session.ts';
import { usePanel } from '../panel.ts';
import { hasForks, relationRows } from '../relations-model.ts';
import { learnerShelveNote } from '../thread-model.ts';
import { W } from '../wording.ts';
import { ChoiceCardBox } from './choice-card.tsx';
import { DeadlineLine, ProjectMaterials } from './project-materials.tsx';
import { OutputsSection } from './outputs/outputs-section.tsx';
import { Badge, Loading } from './evidence/parts.tsx';

export function ProjectHome(props: {
  projectId: string;
  header: ReactNode;
  onOpenChat: () => void;
  onError: (e: unknown) => void;
}) {
  const r = useLoad(`overview:${props.projectId}`, () => api.overview(props.projectId));
  const o = r.data?.overview;
  return (
    <div data-testid="project-home" className="@container flex h-full flex-col">
      {props.header}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 pt-6 pb-16">
          {!o ? (
            <Loading error={r.error} />
          ) : (
            <>
              <Head
                overview={o}
                projectId={props.projectId}
                onOpenChat={props.onOpenChat}
                onError={props.onError}
              />
              {/* 宽时两栏：左边学习分组，右边项目资料；窄时资料排在分组下面 */}
              <div className="grid grid-cols-1 gap-8 @4xl:grid-cols-[minmax(0,1fr)_18rem]">
                <div className="flex min-w-0 flex-col gap-8">
                  <LoadNotice load={o.load} />
                  <Groups overview={o} onError={props.onError} />
                  <OutputsSection projectId={props.projectId} />
                  <Relations projectId={props.projectId} />
                  <AboutMe />
                </div>
                <aside className="flex min-w-0 flex-col gap-6">
                  <ProjectMaterials projectId={props.projectId} onError={props.onError} />
                </aside>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Head(props: {
  overview: ProjectOverview;
  projectId: string;
  onOpenChat: () => void;
  onError: (e: unknown) => void;
}) {
  const o = props.overview;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-serif text-3xl tracking-tight">{o.title}</h1>
      <div className="bg-card flex flex-col gap-3 rounded-2xl border p-4 shadow-xs">
        <div>
          <div className="text-muted-foreground mb-1 text-xs">{W.goal}</div>
          <div className="font-serif text-[1.05rem] leading-relaxed">{o.goal ?? W.goalMissing}</div>
        </div>
        <div className="border-t pt-3">
          <DeadlineLine projectId={props.projectId} onError={props.onError} />
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

function Groups(props: { overview: ProjectOverview; onError: (e: unknown) => void }) {
  const g = props.overview.groups;
  // 各组里出现的学习的名字（“从哪岔出来”“在那边”用）
  const titles = new Map(
    [
      ...g.inProgress,
      ...g.closed,
      ...g.unclosed,
      ...(g.shelved ?? []),
      ...(g.waitingFork ?? []),
    ].map((l) => [l.sessionId, l.title]),
  );
  return (
    <div className="flex flex-col gap-6">
      <Group
        icon={<SparklesIcon className="text-primary" />}
        title={W.groups.awaitingChoice}
        hint={W.groupHints.awaitingChoice}
        count={g.awaitingChoice.length}
        testId="group-awaiting"
      >
        {g.awaitingChoice.map((c) => (
          <ChoiceCardBox
            key={c.cardId}
            cardId={c.cardId}
            recommended={c.recommended}
            options={c.options}
            onError={props.onError}
          />
        ))}
      </Group>
      <LoopGroup
        icon={<CircleDotIcon className="text-primary" />}
        title={W.groups.inProgress}
        hint={W.groupHints.inProgress}
        loops={g.inProgress}
        titles={titles}
        testId="group-in-progress"
      />
      {g.waitingFork !== undefined && g.waitingFork.length > 0 && (
        <LoopGroup
          icon={<GitForkIcon className="text-primary" />}
          title={W.groups.waitingFork}
          hint={W.groupHints.waitingFork}
          loops={g.waitingFork}
          titles={titles}
          testId="group-waiting-fork"
        />
      )}
      {g.shelved !== undefined && g.shelved.length > 0 && (
        <LoopGroup
          icon={<CirclePauseIcon className="text-amber-600" />}
          title={W.groups.shelved}
          hint={W.groupHints.shelved}
          loops={g.shelved}
          titles={titles}
          testId="group-shelved"
        />
      )}
      <LoopGroup
        icon={<CircleCheckIcon className="text-emerald-600" />}
        title={W.groups.closed}
        hint={W.groupHints.closed}
        loops={g.closed}
        titles={titles}
        testId="group-closed"
      />
      <LoopGroup
        icon={<CircleParkingIcon className="text-amber-600" />}
        title={W.groups.unclosed}
        hint={W.groupHints.unclosed}
        loops={g.unclosed}
        titles={titles}
        testId="group-unclosed"
      />
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

function LoopGroup(props: {
  icon: ReactNode;
  title: string;
  hint: string;
  loops: LoopBrief[];
  titles: Map<string, string>;
  testId: string;
}) {
  const loops = [...props.loops].sort((a, b) => b.openedAt.localeCompare(a.openedAt));
  return (
    <Group
      icon={props.icon}
      title={props.title}
      hint={props.hint}
      count={loops.length}
      testId={props.testId}
    >
      {loops.map((l) => (
        <LoopRow key={l.sessionId} loop={l} titles={props.titles} />
      ))}
    </Group>
  );
}

function LoopRow(props: { loop: LoopBrief; titles: Map<string, string> }) {
  const open = useOpenSession();
  const panel = usePanel();
  const l = props.loop;
  const shelvedNote = l.shelved !== undefined ? learnerShelveNote(l.shelved.note) : undefined;
  // 停车记录：没学完就停下的都显示；先放一放的显示它放下时记的
  const parking =
    l.parking !== undefined && (l.status === 'unclosed' || l.shelved !== undefined)
      ? l.parking
      : undefined;
  return (
    <div className="bg-card hover:border-foreground/20 group flex items-stretch rounded-xl border shadow-xs transition-colors">
      <button
        type="button"
        className="flex flex-1 flex-col gap-0.5 px-4 py-2.5 text-left"
        onClick={() => open(l.sessionId)}
      >
        <span className="font-medium">{l.title}</span>
        {l.forkOf !== undefined && (
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <CornerDownRightIcon className="size-3" />
            {W.forkOfLine(props.titles.get(l.forkOf.loopSessionId) ?? W.thatPart)}
          </span>
        )}
        {l.waitingFork !== undefined && (
          <span className="text-primary text-xs">
            {W.waitingLine(l.waitingFork.title ?? W.thatPart)}
          </span>
        )}
        {shelvedNote !== undefined && (
          <span className="text-muted-foreground text-xs">
            {W.shelvedNote}：{shelvedNote}
          </span>
        )}
        {parking !== undefined && <ParkingLines parking={parking} />}
        <span className="text-muted-foreground flex flex-wrap gap-x-3 text-xs">
          {l.newPoint !== undefined && l.newPoint.name !== l.title && (
            <span>
              {W.newPoint}：{l.newPoint.name}
            </span>
          )}
          <span>
            {shortTime(l.openedAt)}
            {l.endedAt !== undefined && ` → ${shortTime(l.endedAt)}`}
          </span>
          {l.lastVerdict !== undefined && <span>{W.lastJudgement(l.lastVerdict.closed)}</span>}
        </span>
      </button>
      <button
        type="button"
        title={W.loopBasis}
        aria-label={`${l.title}：${W.loopBasis}`}
        className="text-muted-foreground hover:text-foreground hover:bg-accent/60 flex items-center rounded-e-xl border-s px-3"
        onClick={() => panel.show({ kind: 'loop', loopId: l.sessionId })}
      >
        <ShieldCheckIcon className="size-4" />
      </button>
    </div>
  );
}

/** 停车记录：缺在哪、打算何时、从哪接上。 */
function ParkingLines(props: { parking: ParkingView }) {
  const p = props.parking;
  return (
    <span
      data-testid="parking-note"
      className="bg-muted/60 mt-1 flex flex-col gap-0.5 rounded-lg px-2.5 py-1.5 text-xs"
    >
      {p.missing.length > 0 && (
        <span>
          <span className="text-muted-foreground">{W.parkingMissing}：</span>
          {p.missing.map((m) => m.text).join('；')}
        </span>
      )}
      <span>
        <span className="text-muted-foreground">{W.parkingWhen}：</span>
        {p.when}
      </span>
      <span>
        <span className="text-muted-foreground">{W.parkingFrom}：</span>
        {p.resumeFrom}
      </span>
    </span>
  );
}

const STATUS_TONE: Record<LoopStatus, 'good' | 'warn' | 'accent'> = {
  closed: 'good',
  unclosed: 'warn',
  in_progress: 'accent',
};

/** 学习之间的来龙去脉：每段从哪来、岔出去的、回来没有。只在岔开过时显示。 */
function Relations(props: { projectId: string }) {
  const r = useLoad(`relations:${props.projectId}`, () => api.loopRelations(props.projectId));
  const open = useOpenSession();
  const panel = usePanel();
  const relations = r.data?.relations ?? [];
  if (!hasForks(relations)) return null;
  return (
    <section data-testid="loop-relations" className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2 [&_svg]:size-4 [&_svg]:self-center">
        <GitForkIcon className="text-muted-foreground" />
        <h2 className="font-medium">{W.relations}</h2>
        <span className="text-muted-foreground ms-2 hidden text-xs @lg:inline">
          {W.relationsHint}
        </span>
      </div>
      <ul className="bg-card flex flex-col rounded-xl border py-1 shadow-xs">
        {relationRows(relations).map(({ rel, depth, back }) => (
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
              {rel.shelved === true
                ? W.shelvedBadge
                : rel.waitingFork !== undefined
                  ? W.waitingBadge
                  : W.status[rel.status]}
            </Badge>
            {back !== undefined && (
              <span className="text-muted-foreground text-xs">
                {back.returned === undefined
                  ? W.forkOut
                  : back.returned.closed
                    ? W.forkBackDone
                    : W.forkBackNot}
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
    {
      icon: <ListTreeIcon />,
      label: W.pointsBrowse,
      onClick: () => panel.show({ kind: 'points' }),
    },
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
