// 我的产出里的一份（照 Claude 的 artifact：在右侧宽面板里看与改）：正文（Markdown + 公式 + 可点的引用）、
// 编辑后另存新版本（带基于哪一版，被拒时先看最新版）、版本列表与对比、相关文献、可能对别人也有用的说明；
// 能跳到一起写的对话，也能从这里开一个“和老师一起写”的对话。
import { useState, type ReactNode } from 'react';
import { MessageSquareIcon, PenLineIcon, TriangleAlertIcon, UsersRoundIcon } from 'lucide-react';
import type { OutputView, VersionView } from '../../../shared/output.ts';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { api } from '../../api.ts';
import { shortTime } from '../../evidence-model.ts';
import { bumpLive, useLoad } from '../../hooks/use-load.ts';
import { useSessions } from '../../hooks/use-sessions.ts';
import { useOpenSession } from '../../open-session.ts';
import { authorLabel, restoreRequest } from '../../output-model.ts';
import { usePanel, type OutputTab, type PanelTarget } from '../../panel.ts';
import { W } from '../../wording.ts';
import { Badge, Loading } from '../evidence/parts.tsx';
import { ComparisonTable } from './comparison.tsx';
import { OutputEditor } from './output-editor.tsx';
import { OutputText } from './output-body.tsx';
import { LiteratureTab } from './literature.tsx';
import { VersionsTab } from './versions.tsx';

export type OutputTarget = Extract<PanelTarget, { kind: 'output' }>;

export function OutputPage(props: { target: OutputTarget }) {
  const t = props.target;
  const r = useLoad(`output:${t.id}`, () => api.output(t.id));
  const panel = usePanel();
  const go = (patch: Omit<OutputTarget, 'kind' | 'id'>) =>
    panel.replace({ kind: 'output', id: t.id, ...patch });
  if (!r.data) {
    return r.error !== undefined ? (
      <div className="flex flex-col gap-1 text-sm">
        <div>{W.outputGone}</div>
        <Loading error={r.error} />
      </div>
    ) : (
      <Loading />
    );
  }
  const o = r.data.output;
  const tab = t.tab ?? 'text';
  return (
    <div className="flex flex-col gap-4" data-testid="output-page">
      <Head output={o} editing={t.edit === true} onEdit={() => go({ edit: true })} />
      <Tabs
        tab={tab}
        counts={{ versions: o.history.length, literature: o.literature.length }}
        onTab={(x) => go(x === 'text' ? {} : { tab: x })}
      />
      {tab === 'text' &&
        (t.edit === true ? (
          <OutputEditor
            output={o}
            onDone={() => {
              bumpLive();
              go({});
            }}
            onSeeLatest={() => {
              bumpLive();
              go({});
            }}
          />
        ) : (
          <TextTab
            output={o}
            version={t.version}
            onLatest={() => go({})}
            onEdit={() => go({ edit: true })}
            onSaved={() => {
              bumpLive();
              go({});
            }}
          />
        ))}
      {tab === 'versions' && (
        <VersionsTab
          output={o}
          compare={t.compare}
          onView={(n) => go(n === o.latest ? {} : { version: n })}
          onCompare={(pair) =>
            go(pair !== undefined ? { tab: 'versions', compare: pair } : { tab: 'versions' })
          }
          onSaved={() => {
            bumpLive();
            go({});
          }}
        />
      )}
      {tab === 'literature' && <LiteratureTab output={o} onAdded={bumpLive} />}
    </div>
  );
}

function Head(props: { output: OutputView; editing: boolean; onEdit: () => void }) {
  const o = props.output;
  const cur = o.current;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="accent">{o.kind}</Badge>
        <span className="text-muted-foreground text-xs">
          {cur !== undefined
            ? `${W.versionN(cur.n)} · ${authorLabel(cur.by)} · ${shortTime(cur.at)}`
            : W.noVersionYet}
        </span>
      </div>
      <h2 className="font-serif text-2xl tracking-tight">{o.title}</h2>
      <div className="flex flex-wrap items-center gap-2">
        {!props.editing && (
          <Button size="sm" variant="outline" onClick={props.onEdit} data-testid="output-edit">
            <PenLineIcon />
            {o.kind === '方法比较' ? W.outputEditTable : W.outputEdit}
          </Button>
        )}
        <WriteWithTeacher outputId={o.id} />
      </div>
      <Chats output={o} />
    </div>
  );
}

/** “和老师一起写”：可写一句想写什么，开对话后切过去。 */
function WriteWithTeacher(props: { outputId: string }) {
  const open = useOpenSession();
  const [asking, setAsking] = useState(false);
  const [brief, setBrief] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  if (!asking) {
    return (
      <Button size="sm" variant="outline" onClick={() => setAsking(true)}>
        <UsersRoundIcon />
        {W.outputWriteWithTeacher}
      </Button>
    );
  }
  return (
    <div className="bg-card flex w-full flex-col gap-2 rounded-xl border p-3 text-sm">
      <p className="text-muted-foreground text-xs">{W.outputWriteHint}</p>
      <input
        className="bg-background focus:border-foreground/30 rounded-lg border px-3 py-1.5 outline-none"
        placeholder={W.outputWriteBrief}
        aria-label={W.outputWriteBrief}
        value={brief}
        autoFocus
        onChange={(e) => setBrief(e.target.value)}
      />
      {error !== undefined && <div className="text-xs text-red-700">{error}</div>}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => setAsking(false)}>
          {W.outputNewCancel}
        </Button>
        <Button
          size="sm"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            api
              .openOutputTask(props.outputId, brief)
              .then((res) => {
                setAsking(false);
                setBrief('');
                open(res.sessionId);
              })
              .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
              .finally(() => setBusy(false));
          }}
        >
          {busy ? W.outputWriteOpening : W.outputWriteGo}
        </Button>
      </div>
    </div>
  );
}

/** 一起写这份的对话：点了切过去。 */
function Chats(props: { output: OutputView }) {
  const open = useOpenSession();
  const sessions = useSessions();
  const tasks = props.output.tasks;
  if (tasks.length === 0) return null;
  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      <span>{W.writingChats}：</span>
      {tasks.map((t) => (
        <button
          key={t.sessionId}
          type="button"
          className="hover:text-foreground flex items-center gap-1 underline-offset-4 hover:underline"
          onClick={() => open(t.sessionId)}
        >
          <MessageSquareIcon className="size-3" />
          {sessions.find((s) => s.sessionId === t.sessionId)?.title ?? shortTime(t.at)}
        </button>
      ))}
    </div>
  );
}

function Tabs(props: {
  tab: OutputTab;
  counts: { versions: number; literature: number };
  onTab: (t: OutputTab) => void;
}) {
  const tabs: OutputTab[] = ['text', 'versions', 'literature'];
  return (
    <div className="bg-muted flex flex-wrap gap-0.5 self-start rounded-lg p-0.5 text-sm">
      {tabs.map((x) => (
        <button
          key={x}
          type="button"
          data-testid={`output-tab-${x}`}
          className={cn(
            'rounded-md px-3 py-1',
            props.tab === x
              ? 'bg-background shadow-xs'
              : 'text-muted-foreground hover:text-foreground',
          )}
          onClick={() => props.onTab(x)}
        >
          {W.outputTabs[x]}
          {x !== 'text' && props.counts[x] > 0 && (
            <span className="text-muted-foreground ms-1 text-xs">{props.counts[x]}</span>
          )}
        </button>
      ))}
    </div>
  );
}

/** 正文：默认最新版；看旧版时顶上说明，可回到最新、可“回到这一版”。 */
function TextTab(props: {
  output: OutputView;
  version: number | undefined;
  onLatest: () => void;
  onEdit: () => void;
  onSaved: () => void;
}) {
  const o = props.output;
  const old = props.version !== undefined && props.version !== o.latest ? props.version : undefined;
  const r = useLoad(
    `output-version:${o.id}:${String(old)}`,
    () => (old !== undefined ? api.version(o.id, old) : Promise.resolve(undefined)),
    false,
  );
  if (o.current === undefined) {
    return (
      <div className="text-muted-foreground flex flex-col items-start gap-2 rounded-xl border border-dashed p-4 text-sm">
        {W.noVersionYet}
        <Button size="sm" variant="outline" onClick={props.onEdit}>
          <PenLineIcon />
          {o.kind === '方法比较' ? W.outputEditTable : W.outputEdit}
        </Button>
      </div>
    );
  }
  const v = old !== undefined ? r.data?.version : o.current;
  if (v === undefined) return <Loading error={r.error} />;
  return (
    <div className="flex flex-col gap-4">
      {old !== undefined && (
        <OldVersionBar output={o} version={v} onLatest={props.onLatest} onSaved={props.onSaved} />
      )}
      <VersionBody kind={o.kind} version={v} />
    </div>
  );
}

function OldVersionBar(props: {
  output: OutputView;
  version: VersionView;
  onLatest: () => void;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const v = props.version;
  return (
    <div
      data-testid="old-version"
      className="flex flex-col gap-2 rounded-xl border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-900/20 dark:text-amber-200"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span>{W.outputViewing(v.n)}</span>
        <Button variant="outline" size="xs" onClick={props.onLatest}>
          {W.outputSeeLatest}
        </Button>
        <Button
          size="xs"
          disabled={busy}
          title={W.outputRestoreHint}
          onClick={() => {
            setBusy(true);
            api
              .saveVersion(props.output.id, restoreRequest(v, props.output.latest))
              .then(props.onSaved)
              .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
              .finally(() => setBusy(false));
          }}
        >
          {W.outputRestore}
        </Button>
      </div>
      <span className="text-xs opacity-80">{W.outputRestoreHint}</span>
      {error !== undefined && <span className="text-xs text-red-700">{error}</span>}
    </div>
  );
}

/** 一版的内容：改动说明、引用核对的小结、正文（方法比较是表）。 */
export function VersionBody(props: { kind: OutputView['kind']; version: VersionView }) {
  const v = props.version;
  const refs = v.references;
  const total = refs.sources.length;
  return (
    <div className="flex flex-col gap-3">
      <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span>
          {W.outputChangeNote}：{v.note !== '' ? v.note : W.outputNoNote}
        </span>
        {total > 0 && <span>{W.refsCount(total)}</span>}
        {refs.unresolved > 0 && (
          <span
            className="flex items-center gap-1 text-amber-700 dark:text-amber-300"
            title={W.refsBadHint}
          >
            <TriangleAlertIcon className="size-3" />
            {W.refsBad(refs.unresolved)}
          </span>
        )}
      </div>
      <Paper>
        {props.kind === '方法比较' && v.comparison !== undefined ? (
          <ComparisonTable comparison={v.comparison} />
        ) : (
          <OutputText text={v.text} />
        )}
      </Paper>
    </div>
  );
}

export function Paper(props: { children: ReactNode }) {
  return (
    <div className="bg-background rounded-2xl border px-6 py-5 shadow-xs">{props.children}</div>
  );
}
