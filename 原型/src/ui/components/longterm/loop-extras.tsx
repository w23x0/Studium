// 对话顶部与底部的长期功能（批 6）：复习 / 复检的说明、“接着《原来那段》学”（可点回去）、
// 原来那段上的“已接着在《新的》学”、没学完就停下的那段底部“接着学”；阶段复盘对话顶部的时间段。
import { useState } from 'react';
import { CornerDownRightIcon, HistoryIcon, RotateCcwIcon } from 'lucide-react';
import type { ReviewWindow } from '../../../shared/records.ts';
import { Button } from '@/components/ui/button';
import { api } from '../../api.ts';
import { useLoad } from '../../hooks/use-load.ts';
import { dayOf } from '../../longterm-model.ts';
import { useOpenSession } from '../../open-session.ts';
import type { LoopSide } from '../../thread-model.ts';
import { W } from '../../wording.ts';
import { findLoop } from './today.tsx';

const LINK =
  'text-foreground decoration-primary/40 hover:decoration-primary underline underline-offset-4';

/** 学习对话顶部：这次是复习 / 复检；接着哪段没学完的学；这段已经有人接着学了。 */
export function LongtermBanner(props: {
  side: LoopSide;
  loopId: string;
  projectId: string;
  titleOf: (id: string) => string | undefined;
}) {
  const { side, titleOf } = props;
  const open = useOpenSession();
  return (
    <>
      {side.revisit !== undefined && (
        <div
          data-testid="revisit-banner"
          className="bg-primary/5 border-primary/30 flex items-center gap-2 rounded-lg border px-3 py-1.5"
        >
          <RotateCcwIcon className="text-primary size-3.5 shrink-0" />
          {W.revisitBanner[side.revisit]}
        </div>
      )}
      {side.resumeOf !== undefined && (
        <div
          data-testid="resume-of"
          className="text-muted-foreground bg-muted/50 flex flex-wrap items-center gap-1 rounded-lg px-3 py-1.5"
        >
          <CornerDownRightIcon className="size-3.5" />
          {W.resumeOfBefore}
          <button
            type="button"
            className={LINK}
            onClick={() => side.resumeOf !== undefined && open(side.resumeOf)}
          >
            《{titleOf(side.resumeOf) ?? W.thatPart}》
          </button>
          {W.resumeOfAfter}
        </div>
      )}
      <ResumedBy loopId={props.loopId} projectId={props.projectId} titleOf={titleOf} />
    </>
  );
}

/** 原来那段（没学完就停下的）：已接着在《新的》学，可点过去。 */
function ResumedBy(props: {
  loopId: string;
  projectId: string;
  titleOf: (id: string) => string | undefined;
}) {
  const r = useLoad(`overview:${props.projectId}`, () => api.overview(props.projectId));
  const open = useOpenSession();
  const brief = r.data !== undefined ? findLoop(r.data.overview, props.loopId) : undefined;
  const list = brief?.resumedBy ?? [];
  if (list.length === 0) return null;
  return (
    <div
      data-testid="resumed-by"
      className="text-muted-foreground bg-muted/50 flex flex-wrap items-center gap-1 rounded-lg px-3 py-1.5"
    >
      {list.map((x, i) => (
        <span key={x.loopSessionId} className="flex items-center gap-1">
          {i > 0 && '；'}
          {W.resumedByBefore}
          <button type="button" className={LINK} onClick={() => open(x.loopSessionId)}>
            《{x.title ?? props.titleOf(x.loopSessionId) ?? W.thatPart}》
          </button>
          {W.resumedByAfter}
        </span>
      ))}
    </div>
  );
}

/** 没学完就停下的那段底部：回项目，或接着学（开一段新的；已经接着学了就去那段）。 */
export function UnclosedEndBar(props: {
  loopId: string;
  projectId: string;
  projectTitle: string;
  onBack: () => void;
  onError: (e: unknown) => void;
}) {
  const r = useLoad(`overview:${props.projectId}`, () => api.overview(props.projectId));
  const open = useOpenSession();
  const [busy, setBusy] = useState(false);
  const brief = r.data !== undefined ? findLoop(r.data.overview, props.loopId) : undefined;
  const next = brief?.resumedBy?.at(-1);
  return (
    <div className="text-muted-foreground flex flex-wrap items-center justify-center gap-3 text-sm">
      先学到这里，下一步在项目里。
      <Button variant="outline" size="sm" onClick={props.onBack}>
        回到{props.projectTitle || '项目'}
      </Button>
      {brief !== undefined &&
        (next !== undefined ? (
          <Button variant="ghost" size="sm" onClick={() => open(next.loopSessionId)}>
            {W.resumedByLine(next.title ?? W.thatPart)}
          </Button>
        ) : (
          <Button
            size="sm"
            data-testid="continue-loop"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              api
                .continueLoop(props.loopId)
                .then((x) => open(x.loopSessionId), props.onError)
                .finally(() => setBusy(false));
            }}
          >
            {busy ? W.continuing : W.continueLoop}
          </Button>
        ))}
    </div>
  );
}

/** 阶段复盘对话顶部：回看哪段时间。 */
export function ReviewBanner(props: { window: ReviewWindow }) {
  return (
    <div className="flex flex-col gap-1 px-4 pb-2 text-sm">
      <div
        data-testid="review-banner"
        className="bg-primary/5 border-primary/30 flex items-center gap-2 rounded-lg border px-3 py-1.5"
      >
        <HistoryIcon className="text-primary size-3.5 shrink-0" />
        {W.reviewBanner(dayOf(props.window.since), dayOf(props.window.until))}
      </div>
    </div>
  );
}
