// 学习对话两种页面（新的学习页、旧版开的学习对话的消息流）共用的件：顶上的单子、底栏（界面说明 §2.6、§3）。
import { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon, EllipsisIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@/components/ui/menu';
import { MathPreview } from '@/components/input/math-preview';
import type { NumberedRecord, Ticket } from '../../../shared/records.ts';
import { api } from '../../api.ts';
import { loopState, type LoopSide } from '../../thread-model.ts';
import { W } from '../../wording.ts';
import { WP } from '../../wording-page.ts';
import { UnclosedEndBar } from '../longterm/loop-extras.tsx';

/** 这次学习现在的单子：开场那张，改过就用最后改成的。 */
export function currentTicket(records: NumberedRecord[]): Ticket | undefined {
  let t: Ticket | undefined;
  for (const { record: r } of records) {
    if (r.type === 'session_opened' && r.ticket !== undefined) t = r.ticket;
    if (r.type === 'ticket_edited') t = r.after;
  }
  return t;
}

/** 学习对话顶部：这次学什么（一行），点开见学完应该能、从哪出发、先假定你会的（界面说明 §2.6）。 */
export function TicketStrip(props: { ticket: Ticket }) {
  const [open, setOpen] = useState(false);
  const t = props.ticket;
  const known = t.startPoints.filter((p) => p.source !== '假定');
  const assumed = t.startPoints.filter((p) => p.source === '假定');
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
      {open && (
        <dl className="mt-1.5 flex flex-col gap-1.5 ps-5.5 text-sm">
          <TicketItem label={W.clause} text={t.clause} />
          {known.length > 0 && (
            <TicketItem label={W.startPoints} text={known.map((p) => p.point).join('；')} />
          )}
          {assumed.length > 0 && (
            <TicketItem label={W.startSource.假定} text={assumed.map((p) => p.point).join('；')} />
          )}
        </dl>
      )}
    </div>
  );
}

function TicketItem(props: { label: string; text: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-muted-foreground text-xs">{props.label}</dt>
      <dd>
        <MathPreview text={props.text} />
      </dd>
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
