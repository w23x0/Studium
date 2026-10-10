// 项目概览（照 Claude 项目的 Overview：按状态分组）：想学的方向；学习按 进行中 · 等你选 · 学完了 · 先放下的 分组。
import type { ReactNode } from 'react';
import {
  BookCheckIcon,
  CircleCheckIcon,
  CircleDotIcon,
  CircleParkingIcon,
  ClipboardListIcon,
  GaugeIcon,
  MessageCircleIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from 'lucide-react';
import type { LoopBrief, ProjectOverview } from '../../shared/protocol.ts';
import { Button } from '@/components/ui/button';
import { api } from '../api.ts';
import { shortTime } from '../evidence-model.ts';
import { useLoad } from '../hooks/use-load.ts';
import { useOpenSession } from '../open-session.ts';
import { usePanel } from '../panel.ts';
import { W } from '../wording.ts';
import { ChoiceCardBox } from './choice-card.tsx';
import { Loading } from './evidence/parts.tsx';

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
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 pt-6 pb-16">
          {!o ? (
            <Loading error={r.error} />
          ) : (
            <>
              <Head overview={o} onOpenChat={props.onOpenChat} />
              <Groups overview={o} onError={props.onError} />
              <AboutMe />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Head(props: { overview: ProjectOverview; onOpenChat: () => void }) {
  const o = props.overview;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-serif text-3xl tracking-tight">{o.title}</h1>
      <div className="bg-card rounded-2xl border p-4 shadow-xs">
        <div className="text-muted-foreground mb-1 text-xs">{W.goal}</div>
        <div className="font-serif text-[1.05rem] leading-relaxed">{o.goal ?? W.goalMissing}</div>
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

function Groups(props: { overview: ProjectOverview; onError: (e: unknown) => void }) {
  const g = props.overview.groups;
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
        testId="group-in-progress"
      />
      <LoopGroup
        icon={<CircleCheckIcon className="text-emerald-600" />}
        title={W.groups.closed}
        hint={W.groupHints.closed}
        loops={g.closed}
        testId="group-closed"
      />
      <LoopGroup
        icon={<CircleParkingIcon className="text-amber-600" />}
        title={W.groups.unclosed}
        hint={W.groupHints.unclosed}
        loops={g.unclosed}
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
        <LoopRow key={l.sessionId} loop={l} />
      ))}
    </Group>
  );
}

function LoopRow(props: { loop: LoopBrief }) {
  const open = useOpenSession();
  const panel = usePanel();
  const l = props.loop;
  return (
    <div className="bg-card hover:border-foreground/20 group flex items-stretch rounded-xl border shadow-xs transition-colors">
      <button
        type="button"
        className="flex flex-1 flex-col gap-0.5 px-4 py-2.5 text-left"
        onClick={() => open(l.sessionId)}
      >
        <span className="font-medium">{l.title}</span>
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

function AboutMe() {
  const panel = usePanel();
  const items: { icon: ReactNode; label: string; onClick: () => void }[] = [
    { icon: <BookCheckIcon />, label: W.learned, onClick: () => panel.show({ kind: 'learned' }) },
    { icon: <GaugeIcon />, label: W.myState, onClick: () => panel.show({ kind: 'state' }) },
    {
      icon: <ClipboardListIcon />,
      label: W.teaching,
      onClick: () => panel.show({ kind: 'teaching' }),
    },
  ];
  return (
    <div className="grid grid-cols-1 gap-2 @md:grid-cols-3">
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
