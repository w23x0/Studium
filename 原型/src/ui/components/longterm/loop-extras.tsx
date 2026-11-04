// 对话底部与顶部的几样：没学完就停下的那段底部（回项目；旧数据里有接着学的给入口）；旧的阶段复盘对话顶部的时间段。
// （复习 / 复检、接着学的说明随导航 W12 撤掉。）
import { HistoryIcon } from 'lucide-react';
import type { ReviewWindow } from '../../../shared/records.ts';
import { Button } from '@/components/ui/button';
import { api } from '../../api.ts';
import { useLoad } from '../../hooks/use-load.ts';
import { dayOf } from '../../longterm-model.ts';
import { useOpenSession } from '../../open-session.ts';
import { W } from '../../wording.ts';

/** 搁着的那段底部：回项目对话；已经接着学了就给去那段的入口。 */
export function UnclosedEndBar(props: {
  loopId: string;
  projectId: string;
  projectTitle: string;
  onBack: () => void;
  onError: (e: unknown) => void;
}) {
  // 旧数据（W12 前）：导航开过“接着学”的，给去最后那段的入口
  const r = useLoad(`loop:${props.loopId}`, () => api.loopEvidence(props.loopId));
  const open = useOpenSession();
  const next = r.data?.loop.resumedBy?.at(-1);
  return (
    <div className="text-muted-foreground flex flex-wrap items-center justify-center gap-3 text-sm">
      {W.unclosedDone}
      <Button size="sm" onClick={props.onBack}>
        {W.backToMain}
      </Button>
      {next !== undefined && (
        <Button variant="ghost" size="sm" onClick={() => open(next.loopSessionId)}>
          {W.resumedByLine(next.title)}
        </Button>
      )}
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
