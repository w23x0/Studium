// 版本列表（新的在上）：时间、谁写的、改了什么、在哪段对话里写的；可看任一版、回到旧的一版、勾两版对比
// （逐行差异 + 引用的增减，引用画成和正文里一样的小标签）。
import { useState } from 'react';
import { GitCompareArrowsIcon, MessageSquareIcon } from 'lucide-react';
import type { DiffLine, OutputView, VersionSummary } from '../../../shared/m14.ts';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { api } from '../../api.ts';
import { shortTime } from '../../evidence-model.ts';
import { useLoad } from '../../hooks/use-load.ts';
import { useOpenSession } from '../../open-session.ts';
import { authorLabel, diffRows, orderPair, restoreRequest } from '../../output-model.ts';
import { W } from '../../wording.ts';
import { Badge, Loading } from '../evidence/parts.tsx';
import { OutputText } from './output-body.tsx';

export function VersionsTab(props: {
  output: OutputView;
  compare: [number, number] | undefined;
  onView: (n: number) => void;
  onCompare: (pair: [number, number] | undefined) => void;
  onSaved: () => void;
}) {
  const o = props.output;
  const [picked, setPicked] = useState<number[]>(() => props.compare ?? []);
  const [error, setError] = useState<string | undefined>();
  const toggle = (n: number) =>
    setPicked((p) => (p.includes(n) ? p.filter((x) => x !== n) : [...p.slice(-1), n]));
  const restore = (n: number) => {
    api
      .version(o.id, n)
      .then((r) => api.saveVersion(o.id, restoreRequest(r.version, o.latest)))
      .then(props.onSaved)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  };
  const [a, b] = picked;
  return (
    <div className="flex flex-col gap-4" data-testid="output-versions">
      {props.compare !== undefined && (
        <Compare
          output={o}
          pair={props.compare}
          onClose={() => {
            setPicked([]);
            props.onCompare(undefined);
          }}
        />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-muted-foreground flex-1 text-xs">{W.versionsHint}</p>
        <Button
          size="xs"
          variant="outline"
          disabled={a === undefined || b === undefined}
          onClick={() => {
            if (a !== undefined && b !== undefined) props.onCompare(orderPair(a, b));
          }}
        >
          <GitCompareArrowsIcon />
          {a !== undefined && b !== undefined ? W.compare : W.comparePick}
        </Button>
      </div>
      {error !== undefined && <div className="text-xs text-red-700">{error}</div>}
      {o.history.length === 0 ? (
        <div className="text-muted-foreground text-sm">{W.noVersionYet}</div>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {[...o.history].reverse().map((v) => (
            <VersionRow
              key={v.n}
              version={v}
              latest={v.n === o.latest}
              picked={picked.includes(v.n)}
              onPick={() => toggle(v.n)}
              onView={() => props.onView(v.n)}
              onRestore={() => restore(v.n)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function VersionRow(props: {
  version: VersionSummary;
  latest: boolean;
  picked: boolean;
  onPick: () => void;
  onView: () => void;
  onRestore: () => void;
}) {
  const v = props.version;
  const open = useOpenSession();
  return (
    <li
      className={cn(
        'bg-card flex items-start gap-3 rounded-xl border px-3 py-2 text-sm shadow-xs',
        props.picked && 'ring-primary/50 ring-2',
      )}
    >
      <input
        type="checkbox"
        className="mt-1"
        checked={props.picked}
        aria-label={`${W.compare}：${W.versionN(v.n)}`}
        onChange={props.onPick}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{W.versionN(v.n)}</span>
          {props.latest && <Badge tone="accent">{W.latestBadge}</Badge>}
          <Badge tone={v.by === '学习者' ? 'neutral' : 'good'}>{authorLabel(v.by)}</Badge>
          <span className="text-muted-foreground text-xs">
            {shortTime(v.at)} · {W.textLength(v.length)}
          </span>
        </div>
        <div className={cn('text-xs', v.note === '' && 'text-muted-foreground')}>
          {v.note !== '' ? v.note : W.outputNoNote}
        </div>
        {v.session !== undefined && (
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 self-start text-xs"
            onClick={() => v.session !== undefined && open(v.session)}
          >
            <MessageSquareIcon className="size-3" />
            {W.writtenInChat}
          </button>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <Button size="xs" variant="ghost" onClick={props.onView}>
          {W.viewVersion}
        </Button>
        {!props.latest && (
          <Button size="xs" variant="ghost" title={W.outputRestoreHint} onClick={props.onRestore}>
            {W.outputRestore}
          </Button>
        )}
      </div>
    </li>
  );
}

/** 两版对比：逐行差异（没变的长段折起来）+ 引用的增减。 */
function Compare(props: { output: OutputView; pair: [number, number]; onClose: () => void }) {
  const [from, to] = props.pair;
  const id = props.output.id;
  const r = useLoad(
    `output-compare:${id}:${String(from)}:${String(to)}`,
    async () => {
      const [cmp, a, b] = await Promise.all([
        api.compareVersions(id, from, to),
        api.version(id, from),
        api.version(id, to),
      ]);
      // 两版各自核对过的知识点引用合在一起，增减里的小标签照样能显示名字
      return {
        compare: cmp.compare,
        refs: [...a.version.references.objects, ...b.version.references.objects],
      };
    },
    false,
  );
  if (!r.data) return <Loading error={r.error} />;
  const { compare: c, refs } = r.data;
  const rows = diffRows(c.lines);
  return (
    <div data-testid="output-compare" className="flex flex-col gap-3 rounded-2xl border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{W.compareOf(c.from.n, c.to.n)}</span>
        <span className="text-muted-foreground text-xs">{W.diffStat(c.added, c.removed)}</span>
        <Button size="xs" variant="ghost" className="ms-auto" onClick={props.onClose}>
          {W.closeCompare}
        </Button>
      </div>
      {c.added === 0 && c.removed === 0 ? (
        <div className="text-muted-foreground text-sm">{W.noDiff}</div>
      ) : (
        <div className="bg-background overflow-x-auto rounded-lg border font-mono text-xs leading-relaxed">
          {rows.map((row, i) =>
            row.kind === 'skip' ? (
              <div key={i} className="text-muted-foreground bg-muted/40 px-3 py-0.5 font-sans">
                {W.diffSkip(row.count)}
              </div>
            ) : (
              <DiffRowView key={i} line={row.line} />
            ),
          )}
        </div>
      )}
      <div className="flex flex-col gap-1.5 text-sm">
        {c.refsAdded.length === 0 && c.refsRemoved.length === 0 ? (
          <div className="text-muted-foreground text-xs">{W.refsNoChange}</div>
        ) : (
          <>
            <RefList label={W.refsAdded} refs={c.refsAdded} objects={refs} tone="add" />
            <RefList label={W.refsRemoved} refs={c.refsRemoved} objects={refs} tone="del" />
          </>
        )}
      </div>
    </div>
  );
}

function DiffRowView(props: { line: DiffLine }) {
  const l = props.line;
  return (
    <div
      className={cn(
        'flex gap-2 px-3 whitespace-pre-wrap',
        l.op === 'add' &&
          'bg-emerald-50 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100',
        l.op === 'del' &&
          'bg-red-50 text-red-900 line-through decoration-red-400/60 dark:bg-red-900/30 dark:text-red-100',
      )}
    >
      <span className="text-muted-foreground w-3 shrink-0 select-none">
        {l.op === 'add' ? '+' : l.op === 'del' ? '−' : ' '}
      </span>
      <span className="min-w-0 flex-1">{l.text === '' ? ' ' : l.text}</span>
    </div>
  );
}

function RefList(props: {
  label: string;
  refs: string[];
  objects: Parameters<typeof OutputText>[0]['refs'];
  tone: 'add' | 'del';
}) {
  if (props.refs.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span
        className={cn(
          'text-xs',
          props.tone === 'add'
            ? 'text-emerald-700 dark:text-emerald-300'
            : 'text-red-700 dark:text-red-300',
        )}
      >
        {props.label}：
      </span>
      {props.refs.map((raw) => (
        <OutputText key={raw} text={raw} refs={props.objects} compact className="inline-block" />
      ))}
    </div>
  );
}
