// 阶段验收在界面上的说明：学习对话顶部的一条（练习整块删了以后搬到这里）。
import { ClipboardCheckIcon } from 'lucide-react';
import { W } from '../wording.ts';

export function StageCheckBanner() {
  return (
    <div
      data-testid="stage-check-banner"
      className="flex items-center gap-2 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-1.5 text-amber-900 dark:bg-amber-900/20 dark:text-amber-200"
    >
      <ClipboardCheckIcon className="size-3.5 shrink-0" />
      {W.stageCheckBanner}
    </div>
  );
}
