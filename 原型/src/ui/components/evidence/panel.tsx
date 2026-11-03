// 右侧面板（照 Claude 的 artifact 面板）：可开可关，面板里点开的东西可返回；
// 标题写当前内容名，不统一叫“依据”；没有首页目录，栈最底下就是第一次打开的那一项（界面说明 §2.11）。
import { ChevronLeftIcon, XIcon } from 'lucide-react';
import { TooltipIconButton } from '@/components/assistant-ui/tooltip-icon-button';
import type { PanelTarget } from '../../panel.ts';
import { W } from '../../wording.ts';
import { DisclosureView } from './disclosure-view.tsx';
import { LoopView } from './loop-view.tsx';
import { LearnedView } from '../longterm/learned.tsx';
import { MaterialsView, PageView, SearchView } from '../sources/materials-view.tsx';
import { SourceView } from '../sources/source-view.tsx';

export function EvidencePanel(props: {
  target: PanelTarget;
  canBack: boolean;
  onBack: () => void;
  onClose: () => void;
}) {
  return (
    <div data-testid="evidence-panel" className="flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center gap-1 border-b px-2 text-sm">
        {props.canBack && (
          <TooltipIconButton tooltip={W.panelBack} className="size-7" onClick={props.onBack}>
            <ChevronLeftIcon />
          </TooltipIconButton>
        )}
        <span className="ms-1 truncate font-medium">{panelTitle(props.target)}</span>
        <TooltipIconButton
          tooltip={W.panelClose}
          className="ms-auto size-7"
          onClick={props.onClose}
        >
          <XIcon />
        </TooltipIconButton>
      </header>
      <div className="flex-1 overflow-y-auto p-4">
        <View target={props.target} />
      </div>
    </div>
  );
}

/** 面板标题：当前看的是什么。 */
function panelTitle(t: PanelTarget): string {
  switch (t.kind) {
    case 'loop':
      return W.panelLoopTitle;
    case 'learned':
      return W.learned;
    case 'disclosure':
      return W.disclosure;
    case 'materials':
    case 'search':
      return W.materialsNav;
    case 'source':
    case 'page':
      return W.panelSourceTitle;
  }
}

function View(props: { target: PanelTarget }) {
  const t = props.target;
  switch (t.kind) {
    case 'loop':
      return <LoopView key={t.loopId} loopId={t.loopId} focusLine={t.focusLine} />;
    case 'learned':
      return <LearnedView key={t.loopId ?? ''} loopId={t.loopId} />;
    case 'disclosure':
      return <DisclosureView />;
    case 'materials':
      return <MaterialsView key={t.material ?? ''} material={t.material} />;
    case 'search':
      return (
        <SearchView
          key={`${t.material ?? ''}:${t.q}:${String(t.all)}`}
          q={t.q}
          material={t.material}
          all={t.all}
        />
      );
    case 'source':
      return (
        <SourceView
          key={`${t.material}:${t.file}:${String(t.from)}-${String(t.to)}:${t.problem ?? ''}`}
          material={t.material}
          file={t.file}
          from={t.from}
          to={t.to}
          page={t.page}
          bbox={t.bbox}
          problem={t.problem}
        />
      );
    case 'page':
      return (
        <PageView
          key={`${t.material}:${String(t.page)}:${t.bbox?.join(',') ?? ''}`}
          material={t.material}
          page={t.page}
          bbox={t.bbox}
          quote={t.quote}
          file={t.file}
          line={t.line}
        />
      );
  }
}
