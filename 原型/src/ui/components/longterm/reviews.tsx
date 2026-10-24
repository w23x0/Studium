// 项目概览旁栏的“阶段复盘”（批 6）：点“复盘一下”开一段复盘对话（可选从哪天起，默认从上次复盘起）；
// 历次复盘：回看的时间段、交回项目的那一句，点开回到那段对话。
import { useMemo, useState } from 'react';
import { HistoryIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '../../api.ts';
import { useLoad } from '../../hooks/use-load.ts';
import { dayOf } from '../../longterm-model.ts';
import { useOpenSession } from '../../open-session.ts';
import { W } from '../../wording.ts';
import { Badge, Loading } from '../evidence/parts.tsx';

/** 这个项目的阶段复盘对话（左栏、主对话里标“复盘”用）。 */
export function useReviewIds(projectId: string | undefined): ReadonlySet<string> {
  const r = useLoad(`reviews:${projectId ?? ''}`, () =>
    projectId !== undefined ? api.reviews(projectId) : Promise.resolve({ reviews: [] }),
  );
  const data = r.data;
  return useMemo(() => new Set((data?.reviews ?? []).map((x) => x.sessionId)), [data]);
}

export function ReviewsSection(props: { projectId: string; onError: (e: unknown) => void }) {
  const { projectId } = props;
  const r = useLoad(`reviews:${projectId}`, () => api.reviews(projectId));
  const open = useOpenSession();
  const [picking, setPicking] = useState(false);
  const [since, setSince] = useState('');
  const [busy, setBusy] = useState(false);
  const start = () => {
    setBusy(true);
    api
      .startReview(projectId, picking ? since : undefined)
      .then((x) => {
        setPicking(false);
        setSince('');
        open(x.reviewSessionId);
      }, props.onError)
      .finally(() => setBusy(false));
  };
  const reviews = [...(r.data?.reviews ?? [])].reverse();
  return (
    <section data-testid="reviews" className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <HistoryIcon className="text-muted-foreground size-4" />
        <h2 className="text-sm font-medium">{W.review}</h2>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" disabled={busy} onClick={start}>
          {busy ? W.reviewOpening : W.reviewStart}
        </Button>
        {!picking && (
          <Button
            variant="ghost"
            size="xs"
            className="text-muted-foreground"
            onClick={() => setPicking(true)}
          >
            {W.reviewPickSince}
          </Button>
        )}
      </div>
      {picking && (
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground text-xs">{W.reviewSince}</span>
          <input
            type="date"
            className="bg-background focus:border-foreground/30 w-full rounded-lg border px-2 py-1.5 outline-none"
            value={since}
            onChange={(e) => setSince(e.target.value)}
          />
        </label>
      )}
      {!r.data ? (
        <Loading error={r.error} />
      ) : reviews.length === 0 ? (
        <p className="text-muted-foreground text-xs leading-relaxed">{W.reviewHint}</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          <div className="text-muted-foreground text-xs">{W.reviewsPast}</div>
          {reviews.map((x) => (
            <button
              key={x.sessionId}
              type="button"
              className="bg-card hover:border-foreground/20 flex flex-col gap-0.5 rounded-xl border px-3 py-2 text-left text-sm shadow-xs"
              onClick={() => open(x.sessionId)}
            >
              <span className="flex flex-wrap items-center gap-1.5">
                <Badge tone="accent">{W.reviewBadge}</Badge>
                <span className="text-muted-foreground text-xs">
                  {W.reviewRange(dayOf(x.since), dayOf(x.until))}
                </span>
              </span>
              <span className={x.summary === undefined ? 'text-muted-foreground' : ''}>
                {x.summary ?? W.reviewOngoing}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
