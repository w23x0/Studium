// 面板里反复用到的小块：小节、卡片、标签、读取中、时间（资料与出处那几页用；W19 起一次学习的依据面板撤掉）。
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { shortTime } from '../../evidence-model.ts';
import { W } from '../../wording.ts';

export function Section(props: {
  title: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('flex flex-col gap-2', props.className)}>
      <h3 className="text-muted-foreground text-xs font-medium tracking-wide">{props.title}</h3>
      {props.hint !== undefined && (
        <p className="text-muted-foreground -mt-1 text-xs leading-relaxed">{props.hint}</p>
      )}
      {props.children}
    </section>
  );
}

export function Card(props: {
  children: ReactNode;
  className?: string;
  id?: string;
  active?: boolean;
}) {
  return (
    <div
      id={props.id}
      className={cn(
        'bg-card rounded-xl border p-3 text-sm leading-relaxed shadow-xs',
        props.active === true && 'ring-primary/50 ring-2',
        props.className,
      )}
    >
      {props.children}
    </div>
  );
}

type Tone = 'neutral' | 'good' | 'warn' | 'accent';
const TONES: Record<Tone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  good: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  warn: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200',
  accent: 'bg-primary/10 text-primary',
};

export function Badge(props: { tone?: Tone; children: ReactNode; title?: string }) {
  return (
    <span
      title={props.title}
      className={cn(
        'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[0.7rem] font-medium',
        TONES[props.tone ?? 'neutral'],
      )}
    >
      {props.children}
    </span>
  );
}

export function Loading(props: { error?: string | undefined }) {
  return (
    <div className="text-muted-foreground p-1 text-sm">
      {props.error !== undefined ? `${W.loadFailed}${props.error}` : W.loading}
    </div>
  );
}

export function Time(props: { at: string }) {
  return <span className="text-muted-foreground text-xs">{shortTime(props.at)}</span>;
}
