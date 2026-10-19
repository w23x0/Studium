// 项目概览里的“我的产出”：列出这个项目的产出物（类型、最新一版的时间、谁写的、一起写的对话），可新建；
// 点开在右侧宽面板里看与改。写产出的对话底部一行：在写哪一份、点了打开它。
import { useState } from 'react';
import { FileTextIcon, MessageSquareIcon, PlusIcon } from 'lucide-react';
import { OUTPUT_KINDS, type OutputKind, type OutputSummary } from '../../../shared/output.ts';
import { Button } from '@/components/ui/button';
import { api } from '../../api.ts';
import { shortTime } from '../../evidence-model.ts';
import { bumpLive, useLoad } from '../../hooks/use-load.ts';
import { useSessions } from '../../hooks/use-sessions.ts';
import { useOpenSession } from '../../open-session.ts';
import { authorLabel } from '../../output-model.ts';
import { usePanel } from '../../panel.ts';
import { W } from '../../wording.ts';
import { Badge, Loading } from '../evidence/parts.tsx';

const INPUT =
  'bg-background focus:border-foreground/30 rounded-lg border px-3 py-1.5 text-sm outline-none';

export function OutputsSection(props: { projectId: string }) {
  const r = useLoad(`outputs:${props.projectId}`, () => api.outputs(props.projectId));
  const [adding, setAdding] = useState(false);
  const outputs = r.data?.outputs;
  return (
    <section data-testid="my-outputs" className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2 [&_svg]:size-4 [&_svg]:self-center">
        <FileTextIcon className="text-primary" />
        <h2 className="font-medium">{W.outputs}</h2>
        {outputs !== undefined && (
          <span className="text-muted-foreground text-sm">{outputs.length}</span>
        )}
        <span className="text-muted-foreground ms-2 hidden text-xs @lg:inline">
          {W.outputsHint}
        </span>
        {!adding && (
          <Button
            variant="ghost"
            size="xs"
            className="ms-auto self-center"
            data-testid="output-new"
            onClick={() => setAdding(true)}
          >
            <PlusIcon />
            {W.outputNew}
          </Button>
        )}
      </div>
      {adding && (
        <NewOutput
          projectId={props.projectId}
          onCancel={() => setAdding(false)}
          onCreated={() => {
            setAdding(false);
            bumpLive();
          }}
        />
      )}
      {outputs === undefined ? (
        <Loading error={r.error} />
      ) : outputs.length === 0 ? (
        !adding && <div className="text-muted-foreground ps-6 text-sm">{W.outputsEmpty}</div>
      ) : (
        <div className="grid grid-cols-1 gap-2 @2xl:grid-cols-2">
          {outputs.map((o) => (
            <OutputCard key={o.id} output={o} />
          ))}
        </div>
      )}
    </section>
  );
}

function OutputCard(props: { output: OutputSummary }) {
  const o = props.output;
  const panel = usePanel();
  const open = useOpenSession();
  const sessions = useSessions();
  return (
    <div className="bg-card hover:border-foreground/20 flex flex-col rounded-xl border shadow-xs transition-colors">
      <button
        type="button"
        data-testid="output-card"
        className="flex flex-col gap-1 px-4 py-2.5 text-left"
        onClick={() => panel.show({ kind: 'output', id: o.id })}
      >
        <span className="flex items-center gap-2">
          <span className="truncate font-medium">{o.title}</span>
          <Badge tone="accent">{o.kind}</Badge>
        </span>
        <span className="text-muted-foreground text-xs">
          {o.latest === 0
            ? W.noVersionYet
            : `${W.versionN(o.latest)} · ${shortTime(o.updatedAt)}${o.latestBy !== undefined ? ` · ${authorLabel(o.latestBy)}` : ''}`}
        </span>
      </button>
      {o.taskSessions.length > 0 && (
        <div className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 border-t px-4 py-1.5 text-xs">
          {o.taskSessions.map((id) => (
            <button
              key={id}
              type="button"
              className="hover:text-foreground flex items-center gap-1 hover:underline"
              onClick={() => open(id)}
            >
              <MessageSquareIcon className="size-3" />
              {sessions.find((s) => s.sessionId === id)?.title ?? W.writingChats}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** 新建一份：标题、类型、可写第一版（方法比较建好后在表里填）；建好就在面板里打开。 */
function NewOutput(props: { projectId: string; onCancel: () => void; onCreated: () => void }) {
  const panel = usePanel();
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<OutputKind>('笔记整理');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const isTable = kind === '方法比较';
  return (
    <div
      data-testid="output-new-form"
      className="bg-card flex flex-col gap-3 rounded-xl border p-3 text-sm shadow-xs"
    >
      <div className="flex flex-wrap gap-3">
        <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs">
          <span className="text-muted-foreground">{W.outputTitle}</span>
          <input
            className={INPUT}
            value={title}
            autoFocus
            placeholder={W.outputTitlePlaceholder}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">{W.outputKind}</span>
          <select
            className={INPUT}
            value={kind}
            onChange={(e) => setKind(e.target.value as OutputKind)}
          >
            {OUTPUT_KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
      </div>
      {isTable ? (
        <p className="text-muted-foreground text-xs">{W.outputComparisonLater}</p>
      ) : (
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">{W.outputFirst}</span>
          <textarea
            className={`${INPUT} min-h-28 leading-relaxed`}
            value={text}
            placeholder={W.outputFirstPlaceholder}
            onChange={(e) => setText(e.target.value)}
          />
        </label>
      )}
      {error !== undefined && <div className="text-xs text-red-700 dark:text-red-300">{error}</div>}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={props.onCancel}>
          {W.outputNewCancel}
        </Button>
        <Button
          size="sm"
          disabled={busy}
          onClick={() => {
            if (title.trim() === '') {
              setError(W.outputNeedTitle);
              return;
            }
            const first = !isTable && text.trim() !== '' ? text : undefined;
            setBusy(true);
            api
              .createOutput(props.projectId, {
                title: title.trim(),
                kind,
                ...(first !== undefined ? { text: first } : {}),
              })
              .then((r) => {
                props.onCreated();
                panel.show({
                  kind: 'output',
                  id: r.output.id,
                  ...(first === undefined ? { edit: true } : {}),
                });
              })
              .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
              .finally(() => setBusy(false));
          }}
        >
          {busy ? W.outputCreating : W.outputCreate}
        </Button>
      </div>
    </div>
  );
}

/** 写产出的对话底部：在写哪一份，点了在面板里打开。 */
export function OutputTaskBar(props: { sessionId: string; projectId: string }) {
  const panel = usePanel();
  const r = useLoad(`outputs:${props.projectId}`, () => api.outputs(props.projectId));
  const bound = r.data?.outputs.find((o) => o.taskSessions.includes(props.sessionId));
  if (!r.data) return null;
  if (bound === undefined) {
    return <div className="text-muted-foreground text-center text-xs">{W.outputChatUnbound}</div>;
  }
  return (
    <div
      data-testid="output-task-bar"
      className="bg-card flex items-center gap-3 rounded-2xl border px-3 py-2 text-sm"
    >
      <FileTextIcon className="text-muted-foreground size-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">
        <span className="text-muted-foreground">{W.outputChatOn}：</span>
        {bound.title}
        <span className="text-muted-foreground ms-2 text-xs">
          {bound.latest === 0 ? W.noVersionYet : W.versionN(bound.latest)}
        </span>
      </span>
      <Button
        size="sm"
        variant="outline"
        onClick={() => panel.show({ kind: 'output', id: bound.id })}
      >
        {W.outputChatOpen}
      </Button>
    </div>
  );
}
