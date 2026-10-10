// 教法（教学工具库）：老师可以取用的做法，列名字、什么时候用、自带的还是自己加的、依据、状态；点开看全文。
// 装不上的文件列出原因；自己加的教法放在哪只作说明，界面上不做添加。
import { ChevronRightIcon, FolderOpenIcon, TriangleAlertIcon } from 'lucide-react';
import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import type { TeachingToolView } from '../../../shared/protocol.ts';
import { api } from '../../api.ts';
import { useLoad } from '../../hooks/use-load.ts';
import { usePanel } from '../../panel.ts';
import { W } from '../../wording.ts';
import { Badge, Card, Field, Loading, Section } from './parts.tsx';

export function ToolsView(props: { name?: string | undefined }) {
  return props.name !== undefined ? <ToolDetail name={props.name} /> : <ToolList />;
}

function ToolList() {
  const r = useLoad('teaching-tools', () => api.teachingTools(), false);
  const panel = usePanel();
  if (!r.data) return <Loading error={r.error} />;
  const { tools, problems } = r.data;
  return (
    <div className="flex flex-col gap-5" data-testid="tools-view">
      <div className="flex flex-col gap-1">
        <h2 className="font-serif text-lg">{W.tools}</h2>
        <p className="text-muted-foreground text-xs leading-relaxed">{W.toolsHint}</p>
      </div>
      <div className="flex flex-col gap-2">
        {tools.length === 0 && <div className="text-muted-foreground text-sm">{W.toolsEmpty}</div>}
        {tools.map((t) => (
          <button
            key={t.name}
            type="button"
            className="bg-card hover:bg-accent/40 flex flex-col gap-1.5 rounded-xl border p-3 text-left text-sm shadow-xs"
            onClick={() => panel.show({ kind: 'tools', name: t.name })}
          >
            <span className="flex items-center gap-2">
              <span className="font-medium">{t.name}</span>
              <ToolBadges tool={t} />
              <ChevronRightIcon className="text-muted-foreground ms-auto size-4 shrink-0" />
            </span>
            <span className="text-muted-foreground text-xs leading-relaxed">{t.applies}</span>
          </button>
        ))}
      </div>
      {problems.length > 0 && (
        <Section title={W.toolProblems} hint={W.toolProblemsHint}>
          <ul className="flex flex-col gap-1.5">
            {problems.map((p) => (
              <li
                key={p}
                className="flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-900/30 dark:text-amber-200"
              >
                <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" />
                <span className="whitespace-pre-wrap">{p}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
      <Section title={W.toolsMine}>
        <div className="text-muted-foreground flex gap-2 text-xs leading-relaxed">
          <FolderOpenIcon className="mt-0.5 size-3.5 shrink-0" />
          <span>{W.toolsMineHint}</span>
        </div>
      </Section>
    </div>
  );
}

function ToolBadges(props: { tool: TeachingToolView }) {
  const t = props.tool;
  return (
    <span className="flex flex-wrap gap-1">
      <Badge tone={t.origin === '官方' ? 'neutral' : 'accent'}>{W.toolOrigin[t.origin]}</Badge>
      {t.status !== '' && (
        <Badge tone="warn" title={t.status}>
          {shortStatus(t.status)}
        </Badge>
      )}
    </span>
  );
}

/** 状态写得长（“agent 起草，未经产品负责人审；效果未…”）：标签只取第一个分句，全文放在详情里。 */
function shortStatus(s: string): string {
  return /起草/.test(s) && /未经?.*审/.test(s) ? W.toolDraft : (s.split(/[；;，,]/)[0] ?? s);
}

/** 一份教法的名字小标签，点开看全文；count > 1 时带次数。 */
export function ToolChip(props: { name: string; count?: number }) {
  const panel = usePanel();
  return (
    <button
      type="button"
      className="bg-primary/5 text-primary hover:bg-primary/10 inline-flex items-center gap-1 rounded-full border border-primary/20 px-2 py-0.5 text-xs"
      onClick={() => panel.show({ kind: 'tools', name: props.name })}
    >
      {props.name}
      {props.count !== undefined && props.count > 1 && (
        <span className="text-muted-foreground">· {W.toolTimes(props.count)}</span>
      )}
    </button>
  );
}

function ToolDetail(props: { name: string }) {
  const r = useLoad(`teaching-tool:${props.name}`, () => api.teachingTool(props.name), false);
  if (r.error !== undefined) {
    return (
      <div className="flex flex-col gap-2">
        <h2 className="font-serif text-lg">{props.name}</h2>
        <div className="text-muted-foreground text-sm">{W.toolMissing}</div>
        <Loading error={r.error} />
      </div>
    );
  }
  if (!r.data) return <Loading />;
  const t = r.data.tool;
  return (
    <div className="flex flex-col gap-4" data-testid="tool-detail">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-serif text-lg">{t.name}</h2>
          <ToolBadges tool={t} />
        </div>
        <Card className="flex flex-col gap-2">
          <Field label={W.toolApplies}>{t.applies}</Field>
          {t.source !== '' && <Field label={W.toolSource}>{t.source}</Field>}
          {t.status !== '' && <Field label={W.toolStatus}>{t.status}</Field>}
        </Card>
      </div>
      <ToolText text={t.text} />
    </div>
  );
}

const MD: Components = {
  h1: (p) => <h3 className="mt-4 mb-1 text-base font-semibold first:mt-0">{p.children}</h3>,
  h2: (p) => <h4 className="mt-4 mb-1 text-[0.95rem] font-semibold first:mt-0">{p.children}</h4>,
  h3: (p) => <h5 className="mt-3 mb-1 text-sm font-semibold">{p.children}</h5>,
  p: (p) => <p className="my-1.5">{p.children}</p>,
  ul: (p) => <ul className="my-1.5 ms-5 list-disc space-y-1">{p.children}</ul>,
  ol: (p) => <ol className="my-1.5 ms-5 list-decimal space-y-1">{p.children}</ol>,
  blockquote: (p) => (
    <blockquote className="border-primary/40 my-2 border-s-2 ps-3">{p.children}</blockquote>
  ),
  code: (p) => <code className="bg-muted rounded px-1 py-0.5 text-[0.85em]">{p.children}</code>,
  table: (p) => <table className="my-2 w-full border-collapse text-xs">{p.children}</table>,
  th: (p) => <th className="border px-2 py-1 text-left font-medium">{p.children}</th>,
  td: (p) => <td className="border px-2 py-1 align-top">{p.children}</td>,
  a: (p) => (
    <a className="text-primary underline" href={p.href} target="_blank" rel="noreferrer">
      {p.children}
    </a>
  ),
};

/** 一份教法的全文（Markdown）。 */
export function ToolText(props: { text: string }) {
  return (
    <div className="text-sm leading-relaxed" data-testid="tool-text">
      <Markdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={MD}
      >
        {props.text}
      </Markdown>
    </div>
  );
}
