// 项目概览里的“项目资料”（照 Claude 项目的“项目知识”）：选用的书 / 笔记，可加（从书库按学科挑）、可去、
// 可导入本机的笔记；没选时写明“现在查全部资料”。还有项目期限（可设 / 改 / 清，显示还剩几天）。
import { useState, type ReactNode } from 'react';
import {
  BookIcon,
  CalendarClockIcon,
  FolderInputIcon,
  LibraryIcon,
  NotebookPenIcon,
  PlusIcon,
  SparklesIcon,
  XIcon,
} from 'lucide-react';
import type { NoteSummary, ProjectMaterialView } from '../../shared/protocol.ts';
import { Button } from '@/components/ui/button';
import { TooltipIconButton } from '@/components/assistant-ui/tooltip-icon-button';
import { cn } from '@/lib/utils';
import { api } from '../api.ts';
import { useLoad } from '../hooks/use-load.ts';
import { usePanel } from '../panel.ts';
import { groupBySubject } from '../scope-model.ts';
import { W } from '../wording.ts';
import { Badge, Loading } from './evidence/parts.tsx';

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

// ───────────── 期限 ─────────────

export function DeadlineLine(props: { projectId: string; onError: (e: unknown) => void }) {
  const { projectId } = props;
  const r = useLoad(`deadline:${projectId}`, () => api.deadline(projectId));
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  if (!r.data) return <Loading error={r.error} />;
  const d = r.data;
  const save = (deadline: string | null, withNote?: string) => {
    setBusy(true);
    api
      .setDeadline(projectId, deadline, withNote)
      .then(() => {
        setEditing(false);
        r.reload();
      })
      .catch(props.onError)
      .finally(() => setBusy(false));
  };
  if (editing) {
    return (
      <form
        data-testid="deadline-form"
        className="flex flex-wrap items-center gap-2 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          if (date !== '') save(date, note.trim());
        }}
      >
        <CalendarClockIcon className="text-muted-foreground size-4" />
        <input
          type="date"
          aria-label={W.deadline}
          className="bg-background rounded-md border px-2 py-1"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          autoFocus
        />
        <input
          className="bg-background min-w-48 flex-1 rounded-md border px-2 py-1"
          placeholder={W.deadlineNotePlaceholder}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <Button type="submit" size="sm" disabled={busy || date === ''}>
          {W.deadlineSave}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
          {W.deadlineCancel}
        </Button>
      </form>
    );
  }
  const edit = () => {
    setDate(d.deadline ?? '');
    setNote(d.deadlineNote ?? '');
    setEditing(true);
  };
  return (
    <div data-testid="deadline" className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      <CalendarClockIcon className="text-muted-foreground size-4" />
      <span className="text-muted-foreground">{W.deadline}</span>
      {d.deadline === undefined ? (
        <>
          <span className="text-muted-foreground">{W.deadlineNone}</span>
          <Button variant="ghost" size="xs" onClick={edit}>
            {W.deadlineSet}
          </Button>
        </>
      ) : (
        <>
          <span className="font-medium tabular-nums">{d.deadline}</span>
          {d.daysLeft !== undefined && (
            <Badge tone={d.daysLeft < 0 ? 'warn' : d.daysLeft <= 7 ? 'accent' : 'neutral'}>
              {W.daysLeft(d.daysLeft)}
            </Badge>
          )}
          {d.deadlineNote !== undefined && (
            <span className="text-muted-foreground">{d.deadlineNote}</span>
          )}
          <Button variant="ghost" size="xs" onClick={edit}>
            {W.deadlineChange}
          </Button>
          <Button variant="ghost" size="xs" disabled={busy} onClick={() => save(null)}>
            {W.deadlineClear}
          </Button>
        </>
      )}
    </div>
  );
}

// ───────────── 项目资料 ─────────────

export function ProjectMaterials(props: { projectId: string; onError: (e: unknown) => void }) {
  const { projectId, onError } = props;
  const r = useLoad(`materials:${projectId}`, () => api.materials(projectId));
  const [open, setOpen] = useState<'add' | 'import' | undefined>();
  const change = (req: { add?: string[]; remove?: string[] }) =>
    api
      .changeMaterials(projectId, req)
      .then(() => r.reload())
      .catch(onError);
  const toggle = (what: 'add' | 'import') => setOpen((o) => (o === what ? undefined : what));
  return (
    <section data-testid="project-materials" className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2 [&_svg]:size-4 [&_svg]:self-center">
        <LibraryIcon className="text-muted-foreground" />
        <h2 className="font-medium">{W.materials}</h2>
        {r.data !== undefined && (
          <span className="text-muted-foreground text-sm">{r.data.materials.length}</span>
        )}
      </div>
      <p className="text-muted-foreground text-xs leading-relaxed">{W.materialsHint}</p>
      {!r.data ? (
        <Loading error={r.error} />
      ) : r.data.materials.length === 0 ? (
        <div
          data-testid="materials-all"
          className="text-muted-foreground rounded-xl border border-dashed px-3 py-2.5 text-sm"
        >
          {W.materialsAll}
        </div>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {r.data.materials.map((m) => (
            <li key={m.book}>
              <MaterialRow
                material={m}
                projectId={projectId}
                onRemove={() => void change({ remove: [m.book] })}
                onError={onError}
              />
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={open === 'add' ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => toggle('add')}
        >
          <PlusIcon />
          {open === 'add' ? W.materialAddDone : W.materialAdd}
        </Button>
        <Button
          variant={open === 'import' ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => toggle('import')}
        >
          <FolderInputIcon />
          {W.noteImport}
        </Button>
      </div>
      {open === 'add' && (
        <Picker
          projectId={projectId}
          chosen={new Set(r.data?.materials.map((m) => m.book) ?? [])}
          onAdd={(book) => change({ add: [book] })}
        />
      )}
      {open === 'import' && (
        <NoteImport
          projectId={projectId}
          chosen={new Set(r.data?.materials.map((m) => m.book) ?? [])}
          onAdd={(book) => change({ add: [book] })}
        />
      )}
    </section>
  );
}

function MaterialRow(props: {
  material: ProjectMaterialView;
  projectId: string;
  onRemove: () => void;
  onError: (e: unknown) => void;
}) {
  const panel = usePanel();
  const m = props.material;
  const missing = m.missing === true;
  return (
    <div className="bg-card group flex flex-col gap-1 rounded-xl border px-3 py-2 text-sm shadow-xs">
      <div className="flex items-center gap-2">
        {m.kind === 'note' ? (
          <NotebookPenIcon className="text-muted-foreground size-4 shrink-0" />
        ) : (
          <BookIcon className="text-muted-foreground size-4 shrink-0" />
        )}
        <button
          type="button"
          disabled={missing}
          className={cn(
            'flex min-w-0 flex-1 flex-col text-left',
            !missing && 'hover:underline',
            missing && 'text-muted-foreground line-through',
          )}
          onClick={() => panel.show({ kind: 'library', book: m.book })}
        >
          <span className="truncate font-medium">{m.title}</span>
          {m.subject !== undefined && (
            <span className="text-muted-foreground truncate text-xs">{m.subject}</span>
          )}
        </button>
        {missing && <Badge tone="warn">{W.materialMissing}</Badge>}
        {m.kind === 'note' && !missing && <Badge>{W.noteKind}</Badge>}
        <TooltipIconButton
          tooltip={W.materialRemove}
          className="size-7 shrink-0"
          onClick={props.onRemove}
        >
          <XIcon />
        </TooltipIconButton>
      </div>
      {m.kind === 'note' && !missing && (
        <ExtractButton book={m.book} projectId={props.projectId} onError={props.onError} />
      )}
    </div>
  );
}

/** 从书库按学科挑书 / 笔记加进项目资料。 */
function Picker(props: {
  projectId: string;
  chosen: Set<string>;
  onAdd: (book: string) => Promise<unknown>;
}) {
  const r = useLoad(`library:books:${props.projectId}`, () => api.books(props.projectId), false);
  const [busy, setBusy] = useState<string | undefined>();
  if (!r.data) return <Loading error={r.error} />;
  return (
    <Panel testId="material-picker">
      <p className="text-muted-foreground text-xs">{W.materialPickHint}</p>
      {r.data.books.length === 0 && (
        <div className="text-muted-foreground text-sm">{W.libraryEmpty}</div>
      )}
      {groupBySubject(r.data.books).map((g) => (
        <div key={g.subject} className="flex flex-col gap-1">
          <div className="text-muted-foreground text-xs font-medium">
            {g.subject === '' ? W.noSubject : g.subject}
          </div>
          {g.books.map((b) => {
            const has = props.chosen.has(b.id);
            return (
              <div key={b.id} className="flex items-center gap-2 rounded-md px-1 py-1 text-sm">
                {b.kind === 'note' ? (
                  <NotebookPenIcon className="text-muted-foreground size-4 shrink-0" />
                ) : (
                  <BookIcon className="text-muted-foreground size-4 shrink-0" />
                )}
                <span className="min-w-0 flex-1 truncate">{b.title}</span>
                <span className="text-muted-foreground shrink-0 text-xs">
                  {W.bookSections(b.sections)}
                </span>
                {has ? (
                  <Badge tone="accent">{W.inProject}</Badge>
                ) : (
                  <Button
                    variant="outline"
                    size="xs"
                    disabled={busy !== undefined}
                    onClick={() => {
                      setBusy(b.id);
                      void props.onAdd(b.id).finally(() => setBusy(undefined));
                    }}
                  >
                    {W.materialAddOne}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </Panel>
  );
}

/** 导入本机的笔记（文件或目录）；导入后可加进项目资料、可让系统找出写过的知识点。 */
function NoteImport(props: {
  projectId: string;
  chosen: Set<string>;
  onAdd: (book: string) => Promise<unknown>;
}) {
  const [path, setPath] = useState('');
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [note, setNote] = useState<NoteSummary | undefined>();
  return (
    <Panel testId="note-import">
      <p className="text-muted-foreground text-xs leading-relaxed">{W.noteImportHint}</p>
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (path.trim() === '') return;
          setBusy(true);
          setError(undefined);
          api
            .importNote(path.trim(), title.trim())
            .then((r) => setNote(r.note))
            .catch((e: unknown) => setError(errText(e)))
            .finally(() => setBusy(false));
        }}
      >
        <input
          className="bg-background rounded-md border px-2.5 py-1.5 font-mono text-sm"
          aria-label={W.notePath}
          placeholder={W.notePathPlaceholder}
          value={path}
          onChange={(e) => setPath(e.target.value)}
        />
        <input
          className="bg-background rounded-md border px-2.5 py-1.5 text-sm"
          aria-label={W.noteTitle}
          placeholder={W.noteTitle}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Button
          type="submit"
          size="sm"
          className="self-start"
          disabled={busy || path.trim() === ''}
        >
          {busy ? W.noteImporting : W.noteImportGo}
        </Button>
      </form>
      {error !== undefined && <div className="text-destructive text-xs">{error}</div>}
      {note !== undefined && (
        <ImportResult
          note={note}
          projectId={props.projectId}
          inProject={props.chosen.has(note.id)}
          onAdd={props.onAdd}
        />
      )}
    </Panel>
  );
}

function ImportResult(props: {
  note: NoteSummary;
  projectId: string;
  inProject: boolean;
  onAdd: (book: string) => Promise<unknown>;
}) {
  const panel = usePanel();
  const n = props.note;
  const missing = n.assets.filter((a) => !a.found);
  const [adding, setAdding] = useState(false);
  return (
    <div
      data-testid="note-import-result"
      className="flex flex-col gap-2 rounded-lg border border-emerald-300/70 bg-emerald-50/60 p-3 text-sm dark:bg-emerald-950/20"
    >
      <button
        type="button"
        className="self-start font-medium hover:underline"
        onClick={() => panel.show({ kind: 'library', book: n.id })}
      >
        {W.noteImported(n.title)}
      </button>
      <div className="text-muted-foreground text-xs">{W.noteSize(n.files, n.sections)}</div>
      {n.assets.length > 0 && missing.length === 0 && (
        <div className="text-muted-foreground text-xs">{W.noteImagesFound(n.assets.length)}</div>
      )}
      {missing.length > 0 && (
        <div className="text-xs text-amber-800 dark:text-amber-200">
          {W.noteImagesMissing(missing.length)}
          <ul className="mt-0.5 list-disc ps-5 font-mono">
            {missing.map((a, i) => (
              <li key={i}>
                <button
                  type="button"
                  className="hover:underline"
                  onClick={() =>
                    panel.show({
                      kind: 'source',
                      book: n.id,
                      file: a.file,
                      from: a.line,
                      to: a.line,
                    })
                  }
                >
                  {a.ref}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {n.skipped !== undefined && n.skipped.length > 0 && (
        <div className="text-muted-foreground text-xs">
          {W.noteSkipped}
          {n.skipped.join('、')}
        </div>
      )}
      {n.previous !== undefined && (
        <div className="text-muted-foreground text-xs">{W.notePrevious}</div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {props.inProject ? (
          <Badge tone="accent">{W.inProject}</Badge>
        ) : (
          <Button
            variant="outline"
            size="xs"
            disabled={adding}
            onClick={() => {
              setAdding(true);
              void props.onAdd(n.id).finally(() => setAdding(false));
            }}
          >
            <PlusIcon />
            {W.addToProject}
          </Button>
        )}
      </div>
      <ExtractButton book={n.id} projectId={props.projectId} onError={undefined} />
    </div>
  );
}

/** “让系统从笔记里找出我写过的知识点”：后台跑，结果在“我学会的”里标作还没核实。 */
function ExtractButton(props: {
  book: string;
  projectId: string;
  onError: ((e: unknown) => void) | undefined;
}) {
  const panel = usePanel();
  const [state, setState] = useState<'idle' | 'busy' | 'started'>('idle');
  const [error, setError] = useState<string | undefined>();
  if (state === 'started') {
    return (
      <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
        {W.noteExtractStarted}
        <button
          type="button"
          className="text-primary hover:underline"
          onClick={() => panel.show({ kind: 'learned' })}
        >
          {W.noteExtractOpen}
        </button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="ghost"
        size="xs"
        className="text-muted-foreground self-start"
        disabled={state === 'busy'}
        onClick={() => {
          setState('busy');
          setError(undefined);
          api
            .extractNote(props.book, props.projectId)
            .then(() => setState('started'))
            .catch((e: unknown) => {
              setState('idle');
              if (props.onError !== undefined) props.onError(e);
              else setError(errText(e));
            });
        }}
      >
        <SparklesIcon />
        {W.noteExtract}
      </Button>
      {error !== undefined && <div className="text-destructive text-xs">{error}</div>}
    </div>
  );
}

function Panel(props: { testId: string; children: ReactNode }) {
  return (
    <div
      data-testid={props.testId}
      className="bg-muted/40 flex flex-col gap-3 rounded-xl border p-3"
    >
      {props.children}
    </div>
  );
}
