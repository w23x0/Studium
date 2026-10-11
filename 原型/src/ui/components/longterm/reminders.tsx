// 项目概览旁栏的“提醒”（批 6）：还开着的提醒（哪天、做什么），可标做完了 / 不要了；办过的可展开看（已办 / 已跳过）；
// 加一条：做什么（复检一个学过的知识点 / 接着一段没学完的 / 为期限做准备 / 别的事）、什么时候（某一天 / 期限前几天）。
import { useState } from 'react';
import { BellIcon, CheckIcon, ChevronDownIcon, ChevronRightIcon, XIcon } from 'lucide-react';
import type {
  AddReminderRequest,
  ProjectOverview,
  ReminderView,
} from '../../../shared/protocol.ts';
import { Button } from '@/components/ui/button';
import { api } from '../../api.ts';
import { useLoad } from '../../hooks/use-load.ts';
import { addDays, dayOf } from '../../longterm-model.ts';
import { W } from '../../wording.ts';
import { Badge, Loading } from '../evidence/parts.tsx';

type What = 'recheck' | 'resume' | 'deadline' | 'other';

export function RemindersSection(props: {
  projectId: string;
  overview: ProjectOverview;
  onError: (e: unknown) => void;
}) {
  const { projectId } = props;
  const r = useLoad(`reminders:${projectId}`, () => api.reminders(projectId));
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | undefined>();
  const close = (id: string, outcome: 'done' | 'dismissed') => {
    setBusy(id);
    api
      .closeReminder(projectId, id, outcome)
      .then(r.reload, props.onError)
      .finally(() => setBusy(undefined));
  };
  const all = r.data?.reminders ?? [];
  const reminders = all
    .filter((x) => x.closed === undefined)
    .sort((a, b) => a.due.localeCompare(b.due));
  const closed = all
    .filter((x) => x.closed !== undefined)
    .sort((a, b) => (b.closed?.at ?? '').localeCompare(a.closed?.at ?? ''));
  return (
    <section data-testid="reminders" className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <BellIcon className="text-muted-foreground size-4" />
        <h2 className="font-medium">{W.reminders}</h2>
        {!adding && (
          <Button variant="ghost" size="xs" className="ms-auto" onClick={() => setAdding(true)}>
            {W.reminderAdd}
          </Button>
        )}
      </div>
      <p className="text-muted-foreground text-xs leading-relaxed">{W.remindersHint}</p>
      {adding && (
        <ReminderForm
          projectId={projectId}
          overview={props.overview}
          today={r.data?.today ?? dayOf(new Date().toISOString())}
          onDone={() => {
            setAdding(false);
            r.reload();
          }}
          onCancel={() => setAdding(false)}
        />
      )}
      {!r.data ? (
        <Loading error={r.error} />
      ) : reminders.length === 0 ? (
        <div className="text-muted-foreground text-sm">{W.remindersEmpty}</div>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {reminders.map((x) => (
            <li
              key={x.id}
              className="bg-card flex items-start gap-2 rounded-xl border px-3 py-2 text-sm shadow-xs"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={x.isDue ? 'text-primary font-medium' : ''}>{x.due}</span>
                  <Badge tone={x.kind === 'recheck' ? 'accent' : 'neutral'}>
                    {W.reminderKind[x.kind]}
                  </Badge>
                </div>
                <span>{x.text}</span>
                <span className="text-muted-foreground text-xs">{W.reminderBy[x.by]}</span>
              </div>
              <div className="flex shrink-0 gap-0.5">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  title={W.todayDone}
                  aria-label={`${x.text}：${W.todayDone}`}
                  disabled={busy !== undefined}
                  onClick={() => close(x.id, 'done')}
                >
                  <CheckIcon />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  title={W.reminderDismiss}
                  aria-label={`${x.text}：${W.reminderDismiss}`}
                  disabled={busy !== undefined}
                  onClick={() => close(x.id, 'dismissed')}
                >
                  <XIcon />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {closed.length > 0 && <ClosedReminders reminders={closed} />}
    </section>
  );
}

/** 办过的提醒（已办 / 已跳过）：默认收起，点开看。 */
function ClosedReminders(props: { reminders: ReminderView[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-1.5" data-testid="reminders-closed">
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground flex items-center gap-1 self-start text-xs"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? (
          <ChevronDownIcon className="size-3.5" />
        ) : (
          <ChevronRightIcon className="size-3.5" />
        )}
        {W.remindersClosed(props.reminders.length)}
      </button>
      {open && (
        <ul className="flex flex-col gap-1">
          {props.reminders.map((x) => (
            <li
              key={x.id}
              className="text-muted-foreground flex flex-col gap-0.5 rounded-lg border border-dashed px-3 py-1.5 text-sm"
            >
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span>{x.due}</span>
                <Badge tone="neutral">{W.reminderKind[x.kind]}</Badge>
                {x.closed !== undefined && (
                  <span>
                    {W.reminderOutcome[x.closed.outcome]} · {x.closed.at.slice(0, 10)} ·{' '}
                    {W.reminderClosedBy[x.closed.by]}
                  </span>
                )}
              </div>
              <span className="line-through decoration-1 opacity-80">{x.text}</span>
              {/* 程序代办时的备注是给核对用的（带内部编号），只显示学习者自己写的 */}
              {x.closed?.by === 'learner' &&
                x.closed.note !== undefined &&
                x.closed.note !== '' && <span className="text-xs">{x.closed.note}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const SELECT =
  'bg-background focus:border-foreground/30 w-full rounded-lg border px-2 py-1.5 text-sm outline-none';

function ReminderForm(props: {
  projectId: string;
  overview: ProjectOverview;
  today: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { overview: o } = props;
  const hasDeadline = o.deadline !== undefined;
  const view = useLoad('m09:view', () => api.pointView());
  const points = (view.data?.entries ?? []).filter((e) => e.status !== '仅外部导入');
  const loops = [...o.groups.unclosed, ...(o.groups.shelved ?? [])].filter(
    (l) => (l.resumedBy ?? []).length === 0,
  );
  const [what, setWhat] = useState<What>('recheck');
  const [pick, setPick] = useState('');
  const [when, setWhen] = useState<'date' | 'before'>('date');
  const [due, setDue] = useState(addDays(props.today, 7));
  const [before, setBefore] = useState(3);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const suggested = (w: What, id: string): string => {
    if (w === 'recheck') {
      const name = points.find((p) => p.point.id === id)?.point.name;
      return name !== undefined ? W.reminderTextRecheck(name) : '';
    }
    if (w === 'resume') {
      const title = loops.find((l) => l.sessionId === id)?.title;
      return title !== undefined ? W.reminderTextResume(title) : '';
    }
    return w === 'deadline' ? W.reminderTextDeadline : '';
  };
  const choose = (w: What, id: string) => {
    // 话还是自动拟的（或空着）就跟着换；自己改过的不动
    if (text === '' || text === suggested(what, pick)) setText(suggested(w, id));
    setWhat(w);
    setPick(id);
    if (w === 'deadline' && hasDeadline) setWhen('before');
  };

  const submit = () => {
    setError(undefined);
    if ((what === 'recheck' || what === 'resume') && pick === '') {
      setError(W.reminderNeedPick);
      return;
    }
    if (text.trim() === '') {
      setError(W.reminderNeedText);
      return;
    }
    if (when === 'date' && due === '') {
      setError(W.reminderNeedDate);
      return;
    }
    const req: AddReminderRequest = {
      text: text.trim(),
      kind: what,
      ...(when === 'before' && hasDeadline ? { beforeDeadlineDays: before } : { due }),
      ...(what === 'recheck' ? { point: pick } : {}),
      ...(what === 'resume' ? { loopSessionId: pick } : {}),
    };
    setBusy(true);
    api
      .addReminder(props.projectId, req)
      .then(props.onDone)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setBusy(false));
  };

  return (
    <div className="bg-card flex flex-col gap-3 rounded-xl border p-3 text-sm shadow-xs">
      <label className="flex flex-col gap-1">
        <span className="text-muted-foreground text-xs">{W.reminderWhat}</span>
        <select
          className={SELECT}
          value={what}
          onChange={(e) => choose(e.target.value as What, '')}
        >
          {(Object.keys(W.reminderWhatKind) as What[]).map((k) => (
            <option key={k} value={k}>
              {W.reminderWhatKind[k]}
            </option>
          ))}
        </select>
      </label>
      {what === 'recheck' &&
        (points.length === 0 ? (
          <div className="text-muted-foreground text-xs">
            {view.data ? W.reminderNoPoints : W.loading}
          </div>
        ) : (
          <label className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs">{W.reminderPickPoint}</span>
            <select
              className={SELECT}
              value={pick}
              onChange={(e) => choose('recheck', e.target.value)}
            >
              <option value="">{W.reminderPick}</option>
              {points.map((p) => (
                <option key={p.point.id} value={p.point.id}>
                  {p.point.name}（{W.daysSince(p.daysSince)}）
                </option>
              ))}
            </select>
          </label>
        ))}
      {what === 'resume' &&
        (loops.length === 0 ? (
          <div className="text-muted-foreground text-xs">{W.reminderNoLoops}</div>
        ) : (
          <label className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs">{W.reminderPickLoop}</span>
            <select
              className={SELECT}
              value={pick}
              onChange={(e) => choose('resume', e.target.value)}
            >
              <option value="">{W.reminderPick}</option>
              {loops.map((l) => (
                <option key={l.sessionId} value={l.sessionId}>
                  {l.title}
                </option>
              ))}
            </select>
          </label>
        ))}
      <div className="flex flex-col gap-1">
        <span className="text-muted-foreground text-xs">{W.reminderWhen}</span>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="reminder-when"
              checked={when === 'date'}
              onChange={() => setWhen('date')}
            />
            {W.reminderOnDate}
          </label>
          <label className={hasDeadline ? 'flex items-center gap-1.5' : 'hidden'}>
            <input
              type="radio"
              name="reminder-when"
              checked={when === 'before'}
              onChange={() => setWhen('before')}
            />
            {W.reminderBeforeDeadline}
          </label>
        </div>
        {when === 'date' || !hasDeadline ? (
          <input
            type="date"
            className={SELECT}
            aria-label={W.reminderOnDate}
            value={due}
            onChange={(e) => setDue(e.target.value)}
          />
        ) : (
          <span className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              className={`${SELECT} w-20`}
              aria-label={W.reminderBeforeDeadline}
              value={before}
              onChange={(e) => setBefore(Math.max(0, Number(e.target.value) || 0))}
            />
            {W.reminderDaysBefore}
            <span className="text-muted-foreground text-xs">（{o.deadline}）</span>
          </span>
        )}
        {!hasDeadline && (
          <span className="text-muted-foreground text-xs">{W.reminderNoDeadline}</span>
        )}
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-muted-foreground text-xs">{W.reminderText}</span>
        <input className={SELECT} value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      {error !== undefined && <div className="text-destructive text-xs">{error}</div>}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={props.onCancel}>
          {W.reminderCancel}
        </Button>
        <Button size="sm" disabled={busy} onClick={submit}>
          {W.reminderSave}
        </Button>
      </div>
    </div>
  );
}
