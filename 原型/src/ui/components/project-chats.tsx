// 项目页“学习”页签底部的“其他对话”：谈方向、复盘、写产出、找资料、导航（学习对话已在上面的分组里，不再重复）。
// 默认收成一行，点开再列（界面说明 §2.8）；左栏删掉（藏起来）的对话这里照样列。
import { useState, type ReactNode } from 'react';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CompassIcon,
  HistoryIcon,
  LibraryIcon,
  MessagesSquareIcon,
  PenLineIcon,
} from 'lucide-react';
import type { SessionSummary } from '../../shared/protocol.ts';
import { useOpenSession } from '../open-session.ts';
import { W } from '../wording.ts';
import { useReviewIds } from './longterm/reviews.tsx';

export function ProjectChats(props: { projectId: string; tasks: SessionSummary[] }) {
  const open = useOpenSession();
  const reviewIds = useReviewIds(props.projectId);
  const [shown, setShown] = useState(false);
  const others = props.tasks
    .filter((s) => s.kind !== 'loop')
    .sort((a, b) => b.openedAt.localeCompare(a.openedAt));
  if (others.length === 0) return null;
  const icon = (s: SessionSummary): ReactNode =>
    s.kind === 'output' ? (
      <PenLineIcon />
    ) : s.kind === 'find' ? (
      <LibraryIcon />
    ) : s.kind === 'nav' ? (
      <CompassIcon />
    ) : reviewIds.has(s.sessionId) ? (
      <HistoryIcon aria-label={W.reviewBadge} />
    ) : (
      <MessagesSquareIcon />
    );
  return (
    <section data-testid="project-chats" className="flex flex-col gap-2">
      <button
        type="button"
        aria-expanded={shown}
        className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 self-start text-sm"
        onClick={() => setShown((x) => !x)}
      >
        {shown ? <ChevronDownIcon className="size-4" /> : <ChevronRightIcon className="size-4" />}
        {W.otherChats}
        <span>{others.length}</span>
      </button>
      {shown && (
        <ul data-testid="session-list" className="flex flex-col rounded-xl border py-1">
          {others.map((s) => (
            <li key={s.sessionId}>
              <button
                type="button"
                className="hover:bg-accent/40 flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm [&_svg]:size-3.5 [&_svg]:shrink-0"
                onClick={() => open(s.sessionId)}
              >
                <span className="text-muted-foreground flex">{icon(s)}</span>
                <span className="truncate">{s.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
