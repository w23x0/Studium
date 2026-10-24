// 项目页「记着什么」页签（工单 W9 §4.7；设计 docs/设计/记录/项目说明.md）：只把已有的记录摊开给学习者看，
// 不另做模型自由记忆。项目说明可改、可看历史；方向、学过的记录概要、状态记录概要只读，
// 旁边“这里不对”走已有的入口（方向回项目对话说；学过的、状态在依据面板里提异议）。
import { useState, type ReactNode } from 'react';
import {
  CompassIcon,
  GaugeIcon,
  GraduationCapIcon,
  HistoryIcon,
  ScrollTextIcon,
} from 'lucide-react';
import type { ProjectOverview } from '../../shared/protocol.ts';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { api } from '../api.ts';
import { shortTime } from '../evidence-model.ts';
import { goalRows } from '../goal-model.ts';
import { useLoad } from '../hooks/use-load.ts';
import { usePanel } from '../panel.ts';
import { forLearner } from '../learner-text.ts';
import { W } from '../wording.ts';
import { Loading } from './evidence/parts.tsx';

export function MemoryTab(props: {
  projectId: string;
  overview: ProjectOverview;
  onOpenChat: () => void;
  onError: (e: unknown) => void;
}) {
  const panel = usePanel();
  const o = props.overview;
  // 方向名就是项目名时不再重复一行（界面说明 §2.7）
  const rows = goalRows(o.goalView).filter((x) => !(x.kind === 'title' && x.text === o.title));
  return (
    <div data-testid="memory-tab" className="flex flex-col gap-6">
      <p className="text-muted-foreground text-sm">{W.memoryHint}</p>
      <Instructions projectId={props.projectId} onError={props.onError} />
      <Block icon={<CompassIcon />} title={W.memoryGoal} notRight={props.onOpenChat}>
        {rows.length === 0 ? (
          <span className="text-muted-foreground">{W.goalMissing}</span>
        ) : (
          <div className="flex flex-col gap-1.5">
            {rows.map((row, i) => (
              <div key={i} className="flex flex-col">
                <span className="text-muted-foreground text-xs">{row.label}</span>
                <span>{row.text}</span>
                {row.reason !== undefined && (
                  <span className="text-muted-foreground text-xs">{forLearner(row.reason)}</span>
                )}
                {row.confirmedReason !== undefined && (
                  <span className="text-muted-foreground text-xs">
                    {W.goalConfirmedReason(row.confirmedReason)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </Block>
      <Block
        icon={<GraduationCapIcon />}
        title={W.memoryLearned}
        detail={() => panel.show({ kind: 'learned' })}
        notRight={() => panel.show({ kind: 'learned' })}
      >
        {W.memoryLearnedLine(
          o.groups.closed.length,
          o.groups.inProgress.length,
          o.groups.unclosed.length,
        )}
      </Block>
      <StateBlock />
      {/* 不靠开发者模式也能看到：用过的教法、教法库、内容送往哪里（设计 00 §7：外发可知、依据可见） */}
      <div
        data-testid="memory-more"
        className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm"
      >
        <span className="text-muted-foreground">{W.memoryMore}</span>
        <Button
          variant="link"
          size="xs"
          className="px-0"
          onClick={() => panel.show({ kind: 'teaching' })}
        >
          {W.teaching}
        </Button>
        <Button
          variant="link"
          size="xs"
          className="px-0"
          onClick={() => panel.show({ kind: 'tools' })}
        >
          {W.tools}
        </Button>
        <Button
          variant="link"
          size="xs"
          className="px-0"
          onClick={() => panel.show({ kind: 'disclosure' })}
        >
          {W.disclosure}
        </Button>
      </div>
    </div>
  );
}

/** 项目说明：当前一版可改（字数上限），改过的版本可展开看。 */
function Instructions(props: { projectId: string; onError: (e: unknown) => void }) {
  const r = useLoad(`instructions:${props.projectId}`, () => api.instructions(props.projectId));
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState(false);
  const d = r.data;
  const over = d !== undefined && text.trim().length > d.limit;
  return (
    <section data-testid="project-instructions" className="flex flex-col gap-2">
      <div className="flex items-center gap-2 [&_svg]:size-4">
        <ScrollTextIcon className="text-primary" />
        <h2 className="text-base font-medium">{W.instructions}</h2>
        {d !== undefined && !editing && (
          <Button
            variant="ghost"
            size="xs"
            className="ms-auto"
            onClick={() => {
              setText(d.text);
              setEditing(true);
            }}
          >
            {W.instructionsEdit}
          </Button>
        )}
      </div>
      {!d ? (
        <Loading error={r.error} />
      ) : editing ? (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (over) return;
            setBusy(true);
            api
              .setInstructions(props.projectId, text)
              .then(() => {
                setEditing(false);
                r.reload();
              })
              .catch(props.onError)
              .finally(() => setBusy(false));
          }}
        >
          <textarea
            aria-label={W.instructions}
            className="bg-background focus:border-foreground/30 min-h-40 rounded-xl border px-3 py-2 text-sm leading-relaxed outline-none"
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus
          />
          <div className="flex items-center gap-2">
            <span className={cn('text-xs', over ? 'text-destructive' : 'text-muted-foreground')}>
              {over
                ? W.instructionsTooLong(d.limit)
                : W.instructionsCount(text.trim().length, d.limit)}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="ms-auto"
              onClick={() => setEditing(false)}
            >
              {W.instructionsCancel}
            </Button>
            <Button type="submit" size="sm" disabled={busy || over}>
              {W.instructionsSave}
            </Button>
          </div>
        </form>
      ) : (
        <div className="bg-card rounded-xl border px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
          {d.text !== '' ? (
            d.text
          ) : (
            <span className="text-muted-foreground">{W.instructionsEmpty}</span>
          )}
        </div>
      )}
      {d !== undefined && d.history.length > 0 && (
        <div className="flex flex-col gap-1">
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 self-start text-xs"
            onClick={() => setHistory((h) => !h)}
          >
            <HistoryIcon className="size-3.5" />
            {W.instructionsHistory}（{d.history.length}）
          </button>
          {history && (
            <ol className="flex flex-col gap-1.5">
              {[...d.history].reverse().map((h) => (
                <li key={h.line} className="bg-muted/40 rounded-lg px-3 py-2 text-xs">
                  <div className="text-muted-foreground mb-0.5">
                    {shortTime(h.at)} · {W.instructionsBy[h.by]}
                  </div>
                  <div className="whitespace-pre-wrap">{h.text || '（空）'}</div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </section>
  );
}

/** 状态记录概要：当前状态那一段；没整理过就说没有。 */
function StateBlock() {
  const panel = usePanel();
  const r = useLoad('state', () => api.state());
  return (
    <Block
      icon={<GaugeIcon />}
      title={W.memoryState}
      detail={() => panel.show({ kind: 'state' })}
      notRight={() => panel.show({ kind: 'state' })}
    >
      {!r.data ? (
        <Loading error={r.error} />
      ) : r.data.current !== undefined ? (
        <StatePoints text={r.data.current.text} />
      ) : (
        <span className="text-muted-foreground">{W.memoryStateEmpty}</span>
      )}
    </Block>
  );
}

function Block(props: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  detail?: () => void;
  notRight: () => void;
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-2 [&_svg]:size-4">
        <span className="text-muted-foreground">{props.icon}</span>
        <h2 className="text-base font-medium">{props.title}</h2>
        <span className="ms-auto flex gap-1">
          {props.detail !== undefined && (
            <Button variant="ghost" size="xs" onClick={props.detail}>
              {W.openDetail}
            </Button>
          )}
          <Button variant="ghost" size="xs" onClick={props.notRight}>
            {W.notRight}
          </Button>
        </span>
      </div>
      <div className="bg-card rounded-xl border px-4 py-3 text-sm leading-relaxed">
        {props.children}
      </div>
    </section>
  );
}

/**
 * 当前状态那段（模型写的）摊成要点：每条一句人话，不露编号（界面说明 §2.10）；
 * “已拿掉…”这类整理过程留给“看详细”。
 */
function StatePoints(props: { text: string }) {
  const points = props.text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('- ') || l.startsWith('• '))
    .map((l) => forLearner(l.slice(2)));
  if (points.length === 0) {
    return <span className="whitespace-pre-wrap">{forLearner(props.text)}</span>;
  }
  return (
    <ul data-testid="state-points" className="flex list-disc flex-col gap-1 ps-5">
      {points.map((p, i) => (
        <li key={i}>{p}</li>
      ))}
    </ul>
  );
}
