// W14 §4 使用情况面板（照 Claude 项目设置的“使用情况”）：最上面额度，再此项目的总数、四类彩条、按模型的明细表、
// 讨论串列表（占比 / 最近排序，默认 8 个）。打开时现算（核心从正本算），窄屏排成一列。
import { useMemo, useState } from 'react';
import { Modal } from '@/components/input/modal';
import { cn } from '@/lib/utils';
import { useLoad } from '../../hooks/use-load.ts';
import { api } from '../../api.ts';
import {
  cacheHit,
  formatTokens,
  modelLabel,
  tokenTotal,
  type TokenParts,
  type UsageResponse,
  type UsageThread,
} from '../../../shared/usage.ts';
import { W } from '../../wording.ts';
import { QuotaBlock } from './quota.tsx';

const U = W.usage;
const PAGE = 8;

const PARTS: { key: keyof TokenParts; label: string; color: string }[] = [
  { key: 'input', label: U.input, color: 'bg-sky-500' },
  { key: 'output', label: U.output, color: 'bg-amber-500' },
  { key: 'cacheWrite', label: U.cacheWrite, color: 'bg-violet-500' },
  { key: 'cacheRead', label: U.cacheRead, color: 'bg-emerald-500' },
];

const pct = (x: number | undefined): string =>
  x === undefined ? '—' : `${String(Math.round(x * 100))}%`;

export function UsagePanel(props: {
  projectId: string;
  onOpen: (id: string) => void;
  onClose: () => void;
}) {
  const r = useLoad(`usage:${props.projectId}`, () => api.usage(props.projectId), false);
  return (
    <Modal label={U.title} onClose={props.onClose} className="w-[46rem] max-w-full p-5">
      <div data-testid="usage-panel" className="flex flex-col gap-5 text-sm">
        <h2 className="font-medium">{U.title}</h2>
        <QuotaBlock />
        {r.error !== undefined ? (
          <p className="text-destructive text-xs">{r.error}</p>
        ) : r.data === undefined ? (
          <p className="text-muted-foreground text-xs">{U.loading}</p>
        ) : tokenTotal(r.data.total) === 0 ? (
          <p className="text-muted-foreground text-xs">{U.empty}</p>
        ) : (
          <Body
            data={r.data}
            onOpen={(id) => {
              props.onClose();
              props.onOpen(id);
            }}
          />
        )}
      </div>
    </Modal>
  );
}

function Body(props: { data: UsageResponse; onOpen: (id: string) => void }) {
  const { data } = props;
  const all = tokenTotal(data.total);
  const main = data.threads.find((t) => t.kind === 'main');
  const threadCount = data.threads.filter((t) => t.kind !== 'main').length;
  return (
    <>
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-medium">{U.thisProject}</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label={U.threads} value={String(threadCount)} />
          <Stat label={U.tokens} value={formatTokens(all)} />
          <Stat label={U.cacheHit} value={pct(cacheHit(data.total))} />
          <Stat
            label={U.mainShare}
            value={pct(main === undefined ? 0 : tokenTotal(main.parts) / all)}
          />
        </div>
        <PartsBar parts={data.total} />
        <ModelTable data={data} />
      </section>
      <ThreadList threads={data.threads} all={all} onOpen={props.onOpen} />
    </>
  );
}

function Stat(props: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-muted-foreground text-xs">{props.label}</span>
      <span className="text-lg font-medium tabular-nums">{props.value}</span>
    </div>
  );
}

/** 四类占比的彩条 + 图例。 */
function PartsBar(props: { parts: TokenParts }) {
  const all = tokenTotal(props.parts);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="bg-muted flex h-2 overflow-hidden rounded-full">
        {PARTS.map((p) => (
          <div
            key={p.key}
            className={p.color}
            style={{ width: `${String(all === 0 ? 0 : (props.parts[p.key] / all) * 100)}%` }}
          />
        ))}
      </div>
      <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {PARTS.map((p) => (
          <span key={p.key} className="flex items-center gap-1.5">
            <span className={cn('size-2 rounded-full', p.color)} />
            {p.label} {formatTokens(props.parts[p.key])}
          </span>
        ))}
      </div>
    </div>
  );
}

/** 明细表：四类 + 讨论串数，按模型分列，最后一列总计。 */
function ModelTable(props: { data: UsageResponse }) {
  const { models, total, threads } = props.data;
  const rows: { label: string; cells: string[]; sum: string }[] = [
    ...PARTS.map((p) => ({
      label: p.label,
      cells: models.map((m) => formatTokens(m.parts[p.key])),
      sum: formatTokens(total[p.key]),
    })),
    {
      label: U.threadCount,
      cells: models.map((m) => String(m.threads)),
      sum: String(threads.length),
    },
  ];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs tabular-nums">
        <thead className="text-muted-foreground">
          <tr>
            <th className="py-1 pe-3 text-left font-normal" />
            {models.map((m) => (
              <th key={m.model} className="py-1 ps-3 text-right font-normal" title={m.model}>
                {modelLabel(m.model)}
              </th>
            ))}
            <th className="py-1 ps-3 text-right font-normal">{U.total}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-t">
              <td className="py-1 pe-3">{r.label}</td>
              {r.cells.map((c, i) => (
                <td key={models[i]?.model ?? i} className="py-1 ps-3 text-right">
                  {c}
                </td>
              ))}
              <td className="py-1 ps-3 text-right font-medium">{r.sum}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** 讨论串列表：标题（点了跳过去）、模型、日期、Token 条、Token、缓存命中、占比。 */
function ThreadList(props: { threads: UsageThread[]; all: number; onOpen: (id: string) => void }) {
  const [sort, setSort] = useState<'share' | 'recent'>('share');
  const [shown, setShown] = useState(PAGE);
  const sorted = useMemo(
    () =>
      [...props.threads].sort((a, b) =>
        sort === 'share' ? tokenTotal(b.parts) - tokenTotal(a.parts) : b.at.localeCompare(a.at),
      ),
    [props.threads, sort],
  );
  const max = Math.max(1, ...props.threads.map((t) => tokenTotal(t.parts)));
  const rest = sorted.length - shown;
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-medium">{U.threads}</h3>
        <div className="ms-auto flex gap-1 text-xs">
          {(['share', 'recent'] as const).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={sort === k}
              className={cn(
                'rounded-md px-2 py-0.5',
                sort === k ? 'bg-accent' : 'text-muted-foreground hover:text-foreground',
              )}
              onClick={() => setSort(k)}
            >
              {k === 'share' ? U.sortShare : U.sortRecent}
            </button>
          ))}
        </div>
      </div>
      <ul className="flex flex-col">
        {sorted.slice(0, shown).map((t) => {
          const n = tokenTotal(t.parts);
          return (
            <li
              key={t.sessionId}
              data-testid="usage-thread"
              className="flex flex-col gap-1 border-t py-2 text-xs sm:flex-row sm:items-center sm:gap-3"
            >
              <div className="flex min-w-0 flex-1 flex-col">
                <button
                  type="button"
                  className="truncate text-left text-sm hover:underline"
                  onClick={() => props.onOpen(t.sessionId)}
                >
                  {t.title}
                </button>
                <span className="text-muted-foreground">
                  {t.models.map(modelLabel).join('、')} · {t.at.slice(0, 10)}
                </span>
              </div>
              <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full sm:w-24">
                <div
                  className="bg-primary h-full rounded-full"
                  style={{ width: `${String((n / max) * 100)}%` }}
                />
              </div>
              <div className="text-muted-foreground flex gap-3 tabular-nums sm:contents">
                <span className="sm:w-14 sm:text-right">
                  {U.tokens} {formatTokens(n)}
                </span>
                <span className="sm:w-20 sm:text-right">
                  {U.cacheHit} {pct(cacheHit(t.parts))}
                </span>
                <span className="sm:w-16 sm:text-right">
                  {U.share} {pct(props.all === 0 ? undefined : n / props.all)}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      {rest > 0 && (
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground self-start text-xs"
          onClick={() => setShown((s) => s + PAGE)}
        >
          {U.showMore(Math.min(PAGE, rest))}
        </button>
      )}
    </section>
  );
}
