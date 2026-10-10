// “接下来学哪个”的选项（照 Claude 的 Suggested threads：先提议，点了才开）。
// 主对话底部与项目概览里的“等你选”共用；每项旁边可点“为什么推荐 · 出处”在依据面板里看。
import { useState } from 'react';
import { InfoIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '../api.ts';
import { useOpenSession } from '../open-session.ts';
import { usePanel } from '../panel.ts';
import { W } from '../wording.ts';

export function ChoiceCardBox(props: {
  cardId: string;
  recommended: number;
  options: { title: string; reason: string }[];
  onError: (e: unknown) => void;
  className?: string;
}) {
  const [busy, setBusy] = useState<number | undefined>();
  const open = useOpenSession();
  const panel = usePanel();
  return (
    <div
      data-testid="choice-card"
      className={cn('bg-card rounded-2xl border p-3 shadow-sm', props.className)}
    >
      <div className="text-muted-foreground mb-2 text-xs">{W.pickOne}</div>
      <div className="flex flex-col gap-2">
        {props.options.map((o, i) => (
          <div
            key={i}
            className={cn(
              'flex items-stretch rounded-xl border',
              i === props.recommended && 'border-primary',
            )}
          >
            <button
              type="button"
              disabled={busy !== undefined}
              className="hover:bg-accent/60 flex-1 rounded-s-xl px-3 py-2 text-left disabled:opacity-60"
              onClick={() => {
                setBusy(i);
                api
                  .choose(props.cardId, i)
                  .then((r) => open(r.loopSessionId))
                  .catch(props.onError)
                  .finally(() => setBusy(undefined));
              }}
            >
              <div className="font-medium">
                {o.title}
                {i === props.recommended && (
                  <span className="text-primary ms-2 text-xs">{W.recommended}</span>
                )}
                {busy === i && (
                  <span className="text-muted-foreground ms-2 text-xs">{W.opening}</span>
                )}
              </div>
              <div className="text-muted-foreground text-sm">{o.reason}</div>
            </button>
            <button
              type="button"
              title={W.whyThis}
              aria-label={`${o.title}：${W.whyThis}`}
              className="text-muted-foreground hover:text-foreground hover:bg-accent/60 flex items-center gap-1 rounded-e-xl border-s px-2.5 text-xs"
              onClick={() => panel.show({ kind: 'card', cardId: props.cardId, option: i })}
            >
              <InfoIcon className="size-3.5" />
              <span className="hidden @md:inline">{W.whyThis}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
