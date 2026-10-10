// 右侧依据面板（照 Claude 的 artifact 面板）：可开可关，面板里点开的东西可返回。
import type { ReactNode } from 'react';
import {
  BookCheckIcon,
  ChevronLeftIcon,
  ClipboardListIcon,
  GaugeIcon,
  SendIcon,
  ShieldCheckIcon,
  XIcon,
} from 'lucide-react';
import { TooltipIconButton } from '@/components/assistant-ui/tooltip-icon-button';
import type { PanelTarget } from '../../panel.ts';
import { usePanel } from '../../panel.ts';
import { W } from '../../wording.ts';
import { CardEvidence } from './card-view.tsx';
import { DisclosureView } from './disclosure-view.tsx';
import { LoopView } from './loop-view.tsx';
import { ClausePanel, PointPanel } from './m08-view.tsx';
import { LearnedView, StateView, TeachingView } from './records-view.tsx';

export function EvidencePanel(props: {
  target: PanelTarget;
  canBack: boolean;
  onBack: () => void;
  onClose: () => void;
  /** 当前对话是一段学习时，首页多一项“这次学习的依据”。 */
  loopId?: string | undefined;
}) {
  return (
    <div data-testid="evidence-panel" className="flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center gap-1 border-b px-2 text-sm">
        {props.canBack && (
          <TooltipIconButton tooltip={W.panelBack} className="size-7" onClick={props.onBack}>
            <ChevronLeftIcon />
          </TooltipIconButton>
        )}
        <span className="ms-1 font-medium">{W.panel}</span>
        <TooltipIconButton
          tooltip={W.panelClose}
          className="ms-auto size-7"
          onClick={props.onClose}
        >
          <XIcon />
        </TooltipIconButton>
      </header>
      <div className="flex-1 overflow-y-auto p-4">
        <View target={props.target} loopId={props.loopId} />
      </div>
    </div>
  );
}

function View(props: { target: PanelTarget; loopId?: string | undefined }) {
  const t = props.target;
  switch (t.kind) {
    case 'home':
      return <Home loopId={props.loopId} />;
    case 'loop':
      return <LoopView key={t.loopId} loopId={t.loopId} verdictLine={t.verdictLine} />;
    case 'card':
      return <CardEvidence key={t.cardId} cardId={t.cardId} option={t.option} />;
    case 'point':
      return <PointPanel key={t.id} id={t.id} />;
    case 'clause':
      return <ClausePanel key={t.id} id={t.id} />;
    case 'learned':
      return <LearnedView recordId={t.recordId} />;
    case 'state':
      return <StateView />;
    case 'teaching':
      return <TeachingView />;
    case 'disclosure':
      return <DisclosureView />;
  }
}

function Home(props: { loopId?: string | undefined }) {
  const panel = usePanel();
  const { loopId } = props;
  return (
    <div className="flex flex-col gap-2">
      <div className="text-muted-foreground px-1 pb-1 text-xs">{W.panelHome}</div>
      {loopId !== undefined && (
        <HomeItem
          icon={<ShieldCheckIcon />}
          label={W.loopBasis}
          onClick={() => panel.show({ kind: 'loop', loopId })}
        />
      )}
      <HomeItem
        icon={<BookCheckIcon />}
        label={W.learned}
        onClick={() => panel.show({ kind: 'learned' })}
      />
      <HomeItem
        icon={<GaugeIcon />}
        label={W.myState}
        onClick={() => panel.show({ kind: 'state' })}
      />
      <HomeItem
        icon={<ClipboardListIcon />}
        label={W.teaching}
        onClick={() => panel.show({ kind: 'teaching' })}
      />
      <HomeItem
        icon={<SendIcon />}
        label={W.disclosure}
        onClick={() => panel.show({ kind: 'disclosure' })}
      />
    </div>
  );
}

function HomeItem(props: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="bg-card hover:bg-accent/40 flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm shadow-xs [&_svg]:size-4"
      onClick={props.onClick}
    >
      <span className="text-muted-foreground">{props.icon}</span>
      {props.label}
    </button>
  );
}
