// 左栏“搜索”：按项目名与对话名过滤（只在界面上过滤），点结果就打开；回车打开第一条。
import { useMemo, useState, type ReactNode } from 'react';
import { FolderIcon, MessageCircleIcon, SearchIcon } from 'lucide-react';
import { Modal } from '@/components/input/modal';
import { chatTitle, searchSidebar, type ChatItem, type SidebarData } from '../../sidebar-model.ts';
import { W } from '../../wording.ts';

const S = W.sidebar;

export function SearchDialog(props: {
  data: SidebarData;
  onClose: () => void;
  onOpenProject: (id: string) => void;
  onOpenChat: (id: string) => void;
}) {
  const [q, setQ] = useState('');
  const hits = useMemo(() => searchSidebar(q, props.data, W.projectChat), [q, props.data]);
  const first: (() => void) | undefined =
    hits.projects[0] !== undefined
      ? () => props.onOpenProject(hits.projects[0]?.id ?? '')
      : hits.chats[0] !== undefined
        ? () => props.onOpenChat(hits.chats[0]?.id ?? '')
        : undefined;
  return (
    <Modal
      label={S.search}
      onClose={props.onClose}
      className="flex w-[min(36rem,92vw)] flex-col p-0"
    >
      <div className="flex items-center gap-2 border-b px-4 py-3 pe-10">
        <SearchIcon className="text-muted-foreground size-4" />
        <input
          autoFocus
          data-testid="search-input"
          aria-label={S.search}
          placeholder={S.searchPlaceholder}
          className="flex-1 bg-transparent text-sm outline-none"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') first?.();
          }}
        />
      </div>
      <div className="max-h-[60vh] overflow-y-auto p-2 text-sm">
        {hits.projects.length === 0 && hits.chats.length === 0 && (
          <div className="text-muted-foreground px-2 py-6 text-center">{S.searchNone}</div>
        )}
        {hits.projects.length > 0 && (
          <Section title={S.searchProjects}>
            {hits.projects.map((p) => (
              <Hit
                key={p.id}
                icon={<FolderIcon />}
                title={p.title}
                onClick={() => props.onOpenProject(p.id)}
              />
            ))}
          </Section>
        )}
        {hits.chats.length > 0 && (
          <Section title={S.searchChats}>
            {hits.chats.map((c: ChatItem) => (
              <Hit
                key={c.id}
                icon={<MessageCircleIcon />}
                title={chatTitle(c)}
                sub={c.projectTitle}
                onClick={() => props.onOpenChat(c.id)}
              />
            ))}
          </Section>
        )}
      </div>
    </Modal>
  );
}

function Section(props: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 pb-2">
      <div className="text-muted-foreground px-2 py-1 text-xs">{props.title}</div>
      {props.children}
    </div>
  );
}

function Hit(props: { icon: ReactNode; title: string; sub?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="hover:bg-accent/60 flex items-center gap-2 rounded-md px-2 py-1.5 text-left [&_svg]:size-4 [&_svg]:shrink-0"
      onClick={props.onClick}
    >
      <span className="text-muted-foreground">{props.icon}</span>
      <span className="min-w-0 flex-1 truncate">{props.title}</span>
      {props.sub !== undefined && (
        <span className="text-muted-foreground truncate text-xs">{props.sub}</span>
      )}
    </button>
  );
}
