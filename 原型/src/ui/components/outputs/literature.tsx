// 产出物的相关文献（项目资料里的一份 / 一个文件，或外面的文章：标题、作者、链接；每条一句关系，可选关系类型）。只追加。
import { useState, type ReactNode } from 'react';
import { BookOpenIcon, ExternalLinkIcon, PlusIcon, TriangleAlertIcon } from 'lucide-react';
import {
  RELATION_KINDS,
  type AddLiteratureRequest,
  type LiteratureView,
  type OutputView,
  type RelationKind,
} from '../../../shared/output.ts';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { api } from '../../api.ts';
import { shortTime } from '../../evidence-model.ts';
import { useLoad } from '../../hooks/use-load.ts';
import { authorLabel, splitAuthors } from '../../output-model.ts';
import { usePanel, useProject } from '../../panel.ts';
import { citationTarget } from '../../source-model.ts';
import { W } from '../../wording.ts';
import { Badge, Loading } from '../evidence/parts.tsx';

const INPUT =
  'bg-background focus:border-foreground/30 rounded-lg border px-3 py-1.5 text-sm outline-none';

export function LiteratureTab(props: { output: OutputView; onAdded: () => void }) {
  const [adding, setAdding] = useState(false);
  const list = props.output.literature;
  return (
    <div className="flex flex-col gap-3" data-testid="output-literature">
      <p className="text-muted-foreground text-xs">{W.litHint}</p>
      {list.length === 0 && <div className="text-muted-foreground text-sm">{W.litEmpty}</div>}
      <ul className="flex flex-col gap-2">
        {[...list].reverse().map((e) => (
          <LiteratureRow key={e.id} entry={e} />
        ))}
      </ul>
      {adding ? (
        <LiteratureForm
          outputId={props.output.id}
          onCancel={() => setAdding(false)}
          onAdded={() => {
            setAdding(false);
            props.onAdded();
          }}
        />
      ) : (
        <Button size="sm" variant="outline" className="self-start" onClick={() => setAdding(true)}>
          <PlusIcon />
          {W.litAdd}
        </Button>
      )}
    </div>
  );
}

function LiteratureRow(props: { entry: LiteratureView }) {
  const e = props.entry;
  const panel = usePanel();
  const where =
    e.citation?.section ??
    (e.file !== undefined ? e.file : e.source === 'library' ? W.litWholeBookLine : undefined);
  const openSource = () => {
    if (e.citation !== undefined) panel.show(citationTarget(e.citation));
    else if (e.book !== undefined) panel.show({ kind: 'materials', book: e.book });
  };
  return (
    <li className="bg-card flex flex-col gap-1.5 rounded-xl border px-3 py-2.5 text-sm shadow-xs">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={e.source === 'library' ? 'accent' : 'neutral'}>
          {e.source === 'library' ? W.litFromMaterials : W.litExternal}
        </Badge>
        {e.source === 'library' ? (
          <button
            type="button"
            className="flex items-center gap-1 font-medium hover:underline"
            onClick={openSource}
          >
            <BookOpenIcon className="text-muted-foreground size-3.5" />
            {e.title}
          </button>
        ) : (
          <span className="font-medium">{e.title}</span>
        )}
        {e.relationKind !== undefined && <Badge tone="good">{e.relationKind}</Badge>}
      </div>
      {(where !== undefined || e.authors !== undefined || e.url !== undefined) && (
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 text-xs">
          {where !== undefined && (
            <span>
              {where}
              {e.from !== undefined && ` · ${W.lineSpan(e.from, e.to ?? e.from)}`}
            </span>
          )}
          {e.authors !== undefined && <span>{e.authors.join('、')}</span>}
          {e.url !== undefined && (
            <a
              className="text-primary flex items-center gap-1 underline-offset-4 hover:underline"
              href={e.url}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLinkIcon className="size-3" />
              {e.url}
            </a>
          )}
        </div>
      )}
      <div>{e.relation}</div>
      {e.problem !== undefined && (
        <div className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300">
          <TriangleAlertIcon className="size-3" />
          {W.litProblem}
          {e.problem}
        </div>
      )}
      <div className="text-muted-foreground text-xs">
        {authorLabel(e.by)} · {shortTime(e.at)}
      </div>
    </li>
  );
}

function LiteratureForm(props: { outputId: string; onCancel: () => void; onAdded: () => void }) {
  const project = useProject();
  const [mode, setMode] = useState<'library' | 'external'>('library');
  const [book, setBook] = useState('');
  const [file, setFile] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [title, setTitle] = useState('');
  const [authors, setAuthors] = useState('');
  const [url, setUrl] = useState('');
  const [relation, setRelation] = useState('');
  const [kind, setKind] = useState<RelationKind | ''>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const books = useLoad(`sources:books:${project ?? ''}`, () => api.books(project), false);
  const toc = useLoad(
    `sources:toc:${book}`,
    () => (book !== '' ? api.toc(book) : Promise.resolve(undefined)),
    false,
  );

  const submit = () => {
    const problem =
      relation.trim() === ''
        ? W.litNeedRelation
        : mode === 'library' && book === ''
          ? W.litNeedBook
          : mode === 'external' && title.trim() === ''
            ? W.litNeedTitle
            : undefined;
    setError(problem);
    if (problem !== undefined) return;
    const line = (s: string) => (/^\d+$/.test(s.trim()) ? Number(s.trim()) : undefined);
    const f = line(from);
    const t = line(to);
    const list = splitAuthors(authors);
    const req: AddLiteratureRequest = {
      relation: relation.trim(),
      ...(kind !== '' ? { relationKind: kind } : {}),
      ...(mode === 'library'
        ? {
            book,
            ...(file !== '' ? { file } : {}),
            ...(file !== '' && f !== undefined ? { from: f } : {}),
            ...(file !== '' && t !== undefined ? { to: t } : {}),
          }
        : {
            title: title.trim(),
            ...(list.length > 0 ? { authors: list } : {}),
            ...(url.trim() !== '' ? { url: url.trim() } : {}),
          }),
    };
    setBusy(true);
    api
      .addLiterature(props.outputId, req)
      .then(props.onAdded)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setBusy(false));
  };

  return (
    <div
      className="bg-card flex flex-col gap-3 rounded-xl border p-3 text-sm"
      data-testid="literature-form"
    >
      <div className="bg-muted flex gap-0.5 self-start rounded-lg p-0.5 text-xs">
        {(['library', 'external'] as const).map((m) => (
          <button
            key={m}
            type="button"
            className={cn(
              'rounded-md px-2.5 py-0.5',
              mode === m ? 'bg-background shadow-xs' : 'text-muted-foreground',
            )}
            onClick={() => setMode(m)}
          >
            {m === 'library' ? W.litFromMaterials : W.litExternal}
          </button>
        ))}
      </div>
      {mode === 'library' ? (
        <>
          <Labeled label={W.litBook}>
            {!books.data ? (
              <Loading error={books.error} />
            ) : (
              <select
                className={INPUT}
                value={book}
                onChange={(e) => {
                  setBook(e.target.value);
                  setFile('');
                }}
              >
                <option value="">{W.litPickBook}</option>
                {books.data.books.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title}
                    {b.selected === true ? `（${W.inProject}）` : ''}
                  </option>
                ))}
              </select>
            )}
          </Labeled>
          {book !== '' && (
            <Labeled label={W.litSection}>
              <select className={INPUT} value={file} onChange={(e) => setFile(e.target.value)}>
                <option value="">{W.litWholeBook}</option>
                {(toc.data?.entries ?? []).flatMap((x) =>
                  x.file !== undefined && x.file !== ''
                    ? [
                        <option key={x.file} value={x.file}>
                          {`${x.num} ${x.title}`.trim()}
                        </option>,
                      ]
                    : [],
                )}
              </select>
            </Labeled>
          )}
          {file !== '' && (
            <Labeled label={W.litLines}>
              <div className="flex items-center gap-2">
                <input
                  className={cn(INPUT, 'w-24')}
                  inputMode="numeric"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  aria-label={W.litLines}
                />
                –
                <input
                  className={cn(INPUT, 'w-24')}
                  inputMode="numeric"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  aria-label={W.litLines}
                />
              </div>
            </Labeled>
          )}
        </>
      ) : (
        <>
          <Labeled label={W.litTitle}>
            <input className={INPUT} value={title} onChange={(e) => setTitle(e.target.value)} />
          </Labeled>
          <Labeled label={W.litAuthors}>
            <input className={INPUT} value={authors} onChange={(e) => setAuthors(e.target.value)} />
          </Labeled>
          <Labeled label={W.litUrl}>
            <input
              className={INPUT}
              value={url}
              placeholder="https://"
              onChange={(e) => setUrl(e.target.value)}
            />
          </Labeled>
        </>
      )}
      <Labeled label={W.litRelation}>
        <input
          className={INPUT}
          value={relation}
          placeholder={W.litRelationPlaceholder}
          onChange={(e) => setRelation(e.target.value)}
        />
      </Labeled>
      <Labeled label={W.litRelationKind}>
        <select
          className={INPUT}
          value={kind}
          onChange={(e) => setKind(e.target.value as RelationKind | '')}
        >
          <option value="">{W.litRelationNone}</option>
          {RELATION_KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </Labeled>
      {error !== undefined && <div className="text-xs text-red-700 dark:text-red-300">{error}</div>}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={props.onCancel}>
          {W.outputNewCancel}
        </Button>
        <Button size="sm" disabled={busy} onClick={submit}>
          {W.litSave}
        </Button>
      </div>
    </div>
  );
}

function Labeled(props: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="text-muted-foreground">{props.label}</span>
      {props.children}
    </label>
  );
}
