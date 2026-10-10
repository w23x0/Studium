// 教法强度：每轮的小标签（可展开理由）、整段学习的走势（每项一行，按轮次）。
import { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from 'lucide-react';
import type { Intensity } from '../../../shared/records.ts';
import { cn } from '@/lib/utils';
import { intensityChips, type LoopTrend } from '../../teaching-model.ts';
import { W } from '../../wording.ts';
import { Badge, ReasonText } from './parts.tsx';

/** 一轮的五项小标签；有理由时可展开。 */
export function IntensityLine(props: { intensity: Intensity; sessionId: string }) {
  const [open, setOpen] = useState(false);
  const { intensity: x } = props;
  const reason = x.reason;
  return (
    <div className="flex flex-col gap-1.5" data-testid="intensity">
      <div className="text-muted-foreground text-xs">{W.intensity}</div>
      <div className="flex flex-wrap items-center gap-1">
        {intensityChips(x).map((c) => (
          <span
            key={c.dim}
            className="bg-muted inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.7rem]"
          >
            <span className="text-muted-foreground">{c.label}</span>
            <span className="font-medium">{c.text}</span>
          </span>
        ))}
        {reason !== undefined && (
          <button
            type="button"
            className="text-primary ms-1 inline-flex items-center gap-0.5 text-xs hover:underline"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? (
              <ChevronDownIcon className="size-3.5" />
            ) : (
              <ChevronRightIcon className="size-3.5" />
            )}
            {W.intensityWhy}
          </button>
        )}
      </div>
      {open && reason !== undefined && (
        <div className="text-muted-foreground border-s-2 ps-2 text-xs">
          <ReasonText text={reason} sessionId={props.sessionId} />
        </div>
      )}
    </div>
  );
}

const CELL_H = ['h-1.5', 'h-3', 'h-[1.125rem]'];

/**
 * 走势：每项一行，每轮一格，格子高低 = 档位（三档）。悬停看第几轮、取值；点一格滚到那一轮的观察。
 * 右边写走法与升降。
 */
export function TrendChart(props: { trend: LoopTrend; onTurn?: (line: number) => void }) {
  const { trend } = props;
  return (
    <div className="flex flex-col gap-2" data-testid="intensity-trend">
      <div className="flex flex-col gap-1.5">
        {trend.rows.map((r) => (
          <div key={r.dim} className="grid grid-cols-[5.5rem_1fr] items-end gap-2 text-xs">
            <span className="text-muted-foreground truncate">{r.label}</span>
            <div className="flex min-w-0 items-end gap-2">
              <div className="flex h-[1.125rem] shrink-0 items-end gap-0.5">
                {r.cells.map((c, i) => (
                  <button
                    key={c.line}
                    type="button"
                    title={`${W.intensityTurn(i + 1)}：${c.value}`}
                    aria-label={`${r.label} ${W.intensityTurn(i + 1)}：${c.value}`}
                    className={cn(
                      'bg-primary/60 hover:bg-primary w-2.5 rounded-sm',
                      CELL_H[c.level] ?? 'bg-muted h-1',
                    )}
                    onClick={() => props.onTurn?.(c.line)}
                  />
                ))}
              </div>
              <span className="text-muted-foreground min-w-0 truncate">
                {r.sequence.join(' → ')}
              </span>
              <span className="ms-auto shrink-0">
                <Badge tone={r.direction === '持平' ? 'neutral' : 'accent'}>
                  {W.direction[r.direction]}
                </Badge>
              </span>
            </div>
          </div>
        ))}
      </div>
      {trend.unmarked > 0 && (
        <div className="text-muted-foreground text-xs">{W.intensityUnmarked(trend.unmarked)}</div>
      )}
    </div>
  );
}
