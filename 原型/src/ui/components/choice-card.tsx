// “接下来学哪个”的选项（照 Claude 的 Suggested threads：先提议，点了才开）。
// 主对话底部与项目概览里的“等你选”共用；每项旁边可点“为什么推荐 · 出处”在依据面板里看。
import { useState } from 'react';
import { InfoIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '../api.ts';
import { useOpenSession } from '../open-session.ts';
import { usePanel } from '../panel.ts';
import { W } from '../wording.ts';

/** 选项上的复习 / 复检标记（单子里带的）。 */
export function revisitOf(o: {
  ticket: { revisit?: { kind: '复习' | '复检' } | undefined };
}): '复习' | '复检' | undefined {
  return o.ticket.revisit?.kind;
}

export function ChoiceCardBox(props: {
  cardId: string;
  recommended: number;
  /** revisit：这一项是复习 / 复检以前学会的（批 6）。 */
  options: {
    title: string;
    reason: string;
    revisit?: '复习' | '复检' | undefined;
    /** 跨领域的选项（批 10b）：类型与两边的领域。 */
    cross?: { kind: '补习型' | '对比链接型'; domain: string; otherDomain: string } | undefined;
  }[];
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
                {o.revisit !== undefined && (
                  <span
                    data-testid="revisit-badge"
                    title={W.revisitHint[o.revisit]}
                    className="bg-primary/10 text-primary ms-2 rounded-full px-1.5 py-0.5 text-[0.7rem] font-medium"
                  >
                    {W.revisitKind[o.revisit]}
                  </span>
                )}
                {o.cross !== undefined && (
                  <span
                    data-testid="cross-badge"
                    title={`${W.crossHint[o.cross.kind]}（${W.crossSides(o.cross.domain, o.cross.otherDomain)}）`}
                    className="bg-primary/10 text-primary ms-2 rounded-full px-1.5 py-0.5 text-[0.7rem] font-medium"
                  >
                    {W.crossKind[o.cross.kind]}
                  </span>
                )}
                {i === props.recommended && (
                  <span className="text-primary ms-2 text-xs">{W.recommended}</span>
                )}
                {busy === i && (
                  <span className="text-muted-foreground ms-2 text-xs">{W.opening}</span>
                )}
              </div>
              <div className="text-muted-foreground text-sm">
                {o.revisit !== undefined && `${W.revisitHint[o.revisit]}。`}
                {o.reason}
              </div>
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
