// 右侧依据面板（照 Claude 的 artifact 面板）：可开可关，面板里点开的东西可返回；我的产出也在这里看与改。
import type { ReactNode } from 'react';
import {
  BookCheckIcon,
  ChevronLeftIcon,
  ClipboardListIcon,
  GaugeIcon,
  LayersIcon,
  LibraryIcon,
  SendIcon,
  ShieldCheckIcon,
  SparklesIcon,
  XIcon,
} from 'lucide-react';
import { TooltipIconButton } from '@/components/assistant-ui/tooltip-icon-button';
import type { PanelTarget } from '../../panel.ts';
import { usePanel } from '../../panel.ts';
import { useSetting } from '../../settings.ts';
import { W } from '../../wording.ts';
import { CardEvidence } from './card-view.tsx';
import { DisclosureView } from './disclosure-view.tsx';
import { LoopView } from './loop-view.tsx';
import { LearnedView, StateView, TeachingView } from './records-view.tsx';
import { ToolsView } from './tools-view.tsx';
import { LibraryView, PageView, SearchView } from '../sources/library-view.tsx';
import { SourceView } from '../sources/source-view.tsx';
import { OutputPage } from '../outputs/output-page.tsx';
import { ExercisesView } from '../practice/exercises-view.tsx';
import { PracticeReviewView } from '../practice/practice-review.tsx';

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
        <span className="ms-1 font-medium">
          {props.target.kind === 'output' ? W.outputs : W.panel}
        </span>
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
      return (
        <LoopView
          key={t.loopId}
          loopId={t.loopId}
          verdictLine={t.verdictLine}
          noteLine={t.noteLine}
        />
      );
    case 'card':
      return <CardEvidence key={t.cardId} cardId={t.cardId} option={t.option} />;
    case 'learned':
      return <LearnedView key={`${t.point ?? ''}:${t.recordId ?? ''}`} />;
    case 'state':
      return <StateView />;
    case 'teaching':
      return <TeachingView />;
    case 'tools':
      return <ToolsView key={t.name ?? ''} name={t.name} />;
    case 'disclosure':
      return <DisclosureView />;
    case 'practice':
      return <PracticeReviewView key={t.summary ?? ''} summary={t.summary} />;
    case 'exercises':
      return (
        <ExercisesView key={`${t.book}:${t.chapter ?? ''}`} book={t.book} chapter={t.chapter} />
      );
    case 'library':
      return <LibraryView key={t.book ?? ''} book={t.book} />;
    case 'search':
      return (
        <SearchView
          key={`${t.book ?? ''}:${t.q}:${String(t.all)}`}
          q={t.q}
          book={t.book}
          all={t.all}
        />
      );
    case 'source':
      return (
        <SourceView
          key={`${t.book}:${t.file}:${String(t.from)}-${String(t.to)}:${t.problem ?? ''}`}
          book={t.book}
          file={t.file}
          from={t.from}
          to={t.to}
          page={t.page}
          bbox={t.bbox}
          problem={t.problem}
        />
      );
    case 'output':
      return <OutputPage key={t.id} target={t} />;
    case 'page':
      return (
        <PageView
          key={`${t.book}:${String(t.page)}:${t.bbox?.join(',') ?? ''}`}
          book={t.book}
          page={t.page}
          bbox={t.bbox}
          quote={t.quote}
          file={t.file}
          line={t.line}
        />
      );
  }
}

/** 面板首页：这次学习的依据，和开发者模式下的各个入口（资料、记录、教法、教学工具、外发内容）。 */
function Home(props: { loopId?: string | undefined }) {
  const panel = usePanel();
  const [devMode] = useSetting('devMode');
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
      {devMode && <DevItems />}
    </div>
  );
}

function DevItems() {
  const panel = usePanel();
  return (
    <div data-testid="dev-items" className="flex flex-col gap-2">
      <HomeItem
        icon={<LibraryIcon />}
        label={W.library}
        testId="nav-library"
        onClick={() => panel.show({ kind: 'library' })}
      />
      <HomeItem
        icon={<BookCheckIcon />}
        label={W.learned}
        onClick={() => panel.show({ kind: 'learned' })}
      />
      <HomeItem
        icon={<LayersIcon />}
        label={W.practice.reviewTitle}
        onClick={() => panel.show({ kind: 'practice' })}
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
        icon={<SparklesIcon />}
        label={W.tools}
        testId="nav-tools"
        onClick={() => panel.show({ kind: 'tools' })}
      />
      <HomeItem
        icon={<SendIcon />}
        label={W.disclosure}
        testId="disclosure-link"
        onClick={() => panel.show({ kind: 'disclosure' })}
      />
    </div>
  );
}

function HomeItem(props: { icon: ReactNode; label: string; onClick: () => void; testId?: string }) {
  return (
    <button
      type="button"
      data-testid={props.testId}
      className="bg-card hover:bg-accent/40 flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm shadow-xs [&_svg]:size-4"
      onClick={props.onClick}
    >
      <span className="text-muted-foreground">{props.icon}</span>
      {props.label}
    </button>
  );
}
