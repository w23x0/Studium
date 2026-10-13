// 项目页里“这个项目里的对话”：项目对话 + 全部学习、谈话、写产出对话（原来在左栏展开的那棵树，搬到这里）——
// 岔出去补的、接着学的缩进在它来自的那段下面并标来历；复盘、写产出带图标。左栏删掉（藏起来）的对话这里照样列。
import type { ReactNode } from 'react';
import { HistoryIcon, MessageCircleIcon, PenLineIcon } from 'lucide-react';
import type { SessionSummary } from '../../shared/protocol.ts';
import { useOpenSession } from '../open-session.ts';
import { taskRows } from '../relations-model.ts';
import { W } from '../wording.ts';
import { useReviewIds } from './longterm/reviews.tsx';

export function ProjectChats(props: { projectId: string; tasks: SessionSummary[] }) {
  const open = useOpenSession();
  const reviewIds = useReviewIds(props.projectId);
  return (
    <section data-testid="project-chats" className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2 [&_svg]:size-4 [&_svg]:self-center">
        <MessageCircleIcon className="text-muted-foreground" />
        <h2 className="font-medium">{W.sidebar.projectChats}</h2>
        <span className="text-muted-foreground text-sm">{props.tasks.length + 1}</span>
      </div>
      <ul
        data-testid="session-list"
        className="bg-card flex flex-col rounded-xl border py-1 shadow-xs"
      >
        <li>
          <Item onClick={() => open(props.projectId)}>
            <MessageCircleIcon className="text-muted-foreground size-3.5 shrink-0" />
            {W.projectChat}
          </Item>
        </li>
        {taskRows(props.tasks).map(({ session: s, depth, from }) => (
          <li
            key={s.sessionId}
            data-from={from}
            style={depth > 0 ? { paddingInlineStart: `${String(depth * 1.25)}rem` } : {}}
          >
            <Item onClick={() => open(s.sessionId)}>
              {s.kind === 'output' ? (
                <PenLineIcon className="text-muted-foreground size-3.5 shrink-0" />
              ) : reviewIds.has(s.sessionId) ? (
                <HistoryIcon
                  className="text-muted-foreground size-3.5 shrink-0"
                  aria-label={W.reviewBadge}
                />
              ) : (
                <span className="text-muted-foreground w-3.5 shrink-0 text-center text-xs">
                  {from !== undefined ? '↳' : '·'}
                </span>
              )}
              {from !== undefined ? (
                <span className="flex min-w-0 flex-col">
                  <span className="truncate">{s.title}</span>
                  <span className="text-muted-foreground text-[0.7rem] leading-tight">
                    {W.taskFrom[from]}
                  </span>
                </span>
              ) : (
                <span className="truncate">{s.title}</span>
              )}
            </Item>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Item(props: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      className="hover:bg-accent/40 flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm"
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}
