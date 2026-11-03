// 学习对话两种页面（新的学习页、旧版开的学习对话的消息流）共用的件：顶上的单子、底栏（界面说明 §2.6、§3）。
import { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon, EllipsisIcon, LoaderIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@/components/ui/menu';
import { MathPreview } from '@/components/input/math-preview';
import type { NumberedRecord, Ticket } from '../../../shared/records.ts';
import { api } from '../../api.ts';
import { usePanel } from '../../panel.ts';
import type { CloseLine } from '../../screen-model.ts';
import { loopState, type LoopSide } from '../../thread-model.ts';
import { W } from '../../wording.ts';
import { WP } from '../../wording-page.ts';
import { UnclosedEndBar } from '../longterm/loop-extras.tsx';

/**
 * 学习页底下的收口那一行（两种学习页共用，界面说明 §2.6「收口时」）：在等收尾那一句时转圈“在收尾…”；
 * 那一句到了就照原样显示它，点开看记录；旧数据（守卫的收尾记录）照旧只说整理好了。
 */
export function CloseLineView(props: { sessionId: string; close: CloseLine }) {
  const panel = usePanel();
  const close = props.close;
  if (close === undefined) return null;
  if (close.kind === 'closing') {
    return (
      <p
        className="text-muted-foreground flex items-center gap-2 text-sm"
        data-testid="closing-line"
      >
        <LoaderIcon className="size-3.5 animate-spin" />
        {WP.closing}
      </p>
    );
  }
  return (
    <button
      type="button"
      data-testid="judgement"
      className="text-muted-foreground hover:text-foreground group flex items-start gap-2 self-start text-left text-sm"
      onClick={() => panel.show({ kind: 'loop', loopId: props.sessionId, focusLine: close.line })}
    >
      <span className="bg-border mt-2.5 h-px w-4 shrink-0" />
      {close.old === true ? (
        <span>{WP.closed}</span>
      ) : (
        <span className="text-foreground">
          {WP.closedSaid}
          {close.summary}
        </span>
      )}
      <span className="text-primary flex shrink-0 items-center text-xs opacity-80 group-hover:opacity-100">
        {close.old === true ? WP.seeClosed : WP.seeClosedSaid}
        <ChevronRightIcon className="size-3.5" />
      </span>
    </button>
  );
}

/** 这次学习现在的单子：开场那张，改过就用最后改成的。 */
export function currentTicket(records: NumberedRecord[]): Ticket | undefined {
  let t: Ticket | undefined;
  for (const { record: r } of records) {
    if (r.type === 'session_opened' && r.ticket !== undefined) t = r.ticket;
    if (r.type === 'ticket_edited') t = r.after;
  }
  return t;
}

/** 旧数据：单子条点开后的几项（学完应该能、从哪出发、先假定你会的）。 */
function TicketDetails(props: { ticket: Ticket; className?: string }) {
  const t = props.ticket;
  const known = t.startPoints.filter((p) => p.source !== '假定');
  const assumed = t.startPoints.filter((p) => p.source === '假定');
  const item = (label: string, text: string) => (
    <div className="flex flex-col">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd>
        <MathPreview text={text} />
      </dd>
    </div>
  );
  return (
    <dl className={`flex flex-col gap-1.5 text-sm ${props.className ?? ''}`}>
      {item(W.clause, t.clause)}
      {known.length > 0 && item(W.startPoints, known.map((p) => p.point).join('；'))}
      {assumed.length > 0 && item(W.startSource.假定, assumed.map((p) => p.point).join('；'))}
    </dl>
  );
}

/** 旧数据（W12 前开的学习有单子）：顶部一行这次学什么，点开见几项（界面说明 §2.6）。 */
export function TicketStrip(props: { ticket: Ticket }) {
  const [open, setOpen] = useState(false);
  const t = props.ticket;
  return (
    <div data-testid="ticket-strip" className="bg-muted/50 rounded-lg px-3 py-1.5">
      <button
        type="button"
        aria-expanded={open}
        className="flex w-full items-start gap-1.5 text-left"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? (
          <ChevronDownIcon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
        ) : (
          <ChevronRightIcon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
        )}
        <span className="text-muted-foreground shrink-0">{W.loopTopic}</span>
        <MathPreview text={t.newPoint} className={open ? '' : 'line-clamp-1'} />
      </button>
      {open && <TicketDetails ticket={t} className="mt-1.5 ps-5.5" />}
    </div>
  );
}

export function EndedBar(props: { text: string; onBack: () => void }) {
  return (
    <div
      data-testid="ended-bar"
      className="text-muted-foreground flex flex-wrap items-center justify-center gap-3 text-sm"
    >
      {props.text}
      <Button size="sm" onClick={props.onBack}>
        {W.backToMain}
      </Button>
    </div>
  );
}

/** 学习对话底栏：主按钮“我觉得懂了”；“…”里是“搁着，以后再学”（界面说明 §2.6、§3）。 */
export function LoopBar(props: {
  sessionId: string;
  records: NumberedRecord[];
  side: LoopSide;
  running: boolean;
  onError: (e: unknown) => void;
  onBack: () => void;
  projectId: string;
  projectTitle: string;
}) {
  const { side } = props;
  const state = loopState(props.records);
  const act = (fn: () => Promise<unknown>) => {
    fn().catch(props.onError);
  };
  if (state.kind === 'ended') {
    if (!state.closed) {
      return (
        <UnclosedEndBar
          loopId={props.sessionId}
          projectId={props.projectId}
          projectTitle={props.projectTitle}
          onBack={props.onBack}
          onError={props.onError}
        />
      );
    }
    return <EndedBar text={W.loopDone} onBack={props.onBack} />;
  }
  const endLater = (
    <Menu>
      <MenuTrigger
        aria-label={W.moreActions}
        data-testid="loop-more"
        disabled={props.running}
        className="text-muted-foreground hover:text-foreground hover:bg-muted flex size-7 items-center justify-center rounded-md disabled:opacity-50"
      >
        <EllipsisIcon className="size-4" />
      </MenuTrigger>
      <MenuContent side="top" align="end" className="max-w-72">
        <MenuItem
          data-testid="end-unclosed"
          onClick={() => act(() => api.endUnclosed(props.sessionId))}
        >
          <span className="flex flex-col gap-0.5">
            <span>{W.endLater}</span>
            <span className="text-muted-foreground text-xs">{W.endLaterHint}</span>
          </span>
        </MenuItem>
      </MenuContent>
    </Menu>
  );
  if (side.shelved !== undefined) {
    // 以前点过“先放一放”的（旧数据）：接着学，或搁着
    return (
      <div
        data-testid="shelved-bar"
        className="bg-card flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3 text-sm"
      >
        <span>
          {W.shelvedBar}
          {side.shelved.note !== undefined && (
            <span className="text-muted-foreground ms-2">
              {W.shelvedNote}：{side.shelved.note}
            </span>
          )}
        </span>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            disabled={props.running}
            onClick={() => act(() => api.resume(props.sessionId))}
          >
            {W.resume}
          </Button>
          {endLater}
        </div>
      </div>
    );
  }
  if (state.kind === 'awaiting_confirm') {
    return (
      <div
        data-testid="confirm-bar"
        className="bg-card flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3 text-sm"
      >
        <span>{W.confirmBar}</span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              // 再补一句：回到输入框接着说
              document.querySelector<HTMLTextAreaElement>('main textarea')?.focus();
            }}
          >
            {W.confirmMore}
          </Button>
          <Button size="sm" onClick={() => act(() => api.confirmClose(props.sessionId))}>
            {W.confirmGo}
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        size="sm"
        data-testid="request-close"
        disabled={props.running || state.closeRequested}
        onClick={() => act(() => api.requestClose(props.sessionId))}
      >
        {state.closeRequested ? W.closingShort : W.understood}
      </Button>
      {endLater}
    </div>
  );
}

/** 旧版开的学习对话（W10 前，开场的提示词与工具已定死）的底栏：只看；“…”里留“搁着，以后再学”（W10 §9 第 1 条）。 */
export function OldLoopBar(props: {
  sessionId: string;
  records: NumberedRecord[];
  onError: (e: unknown) => void;
  onBack: () => void;
  projectId: string;
  projectTitle: string;
}) {
  const state = loopState(props.records);
  if (state.kind === 'ended') {
    return state.closed ? (
      <EndedBar text={W.loopDone} onBack={props.onBack} />
    ) : (
      <UnclosedEndBar
        loopId={props.sessionId}
        projectId={props.projectId}
        projectTitle={props.projectTitle}
        onBack={props.onBack}
        onError={props.onError}
      />
    );
  }
  return (
    <div
      data-testid="old-loop-bar"
      className="bg-card flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3 text-sm"
    >
      <span>{WP.oldLoop}</span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          api.endUnclosed(props.sessionId).catch(props.onError);
        }}
      >
        {W.endLater}
      </Button>
    </div>
  );
}
