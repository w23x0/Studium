// 旧的阶段复盘对话顶部的时间段（W12 起不再开，只读看）。
import { HistoryIcon } from 'lucide-react';
import type { ReviewWindow } from '../../../shared/records.ts';
import { dayOf } from '../../longterm-model.ts';
import { W } from '../../wording.ts';

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
