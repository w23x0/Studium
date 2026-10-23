// 项目页「资料」页签（照 Claude 项目的 Library 与 NotebookLM 的“添加来源”；工单 W9 §4.1 §4.4）：
// 整页可拖放；“添加”菜单（文件 · 文件夹 · 链接 · 代码仓库 · 从书库选 · 从别的项目拿）；
// 刚加进来的每份先分流（资料 / 学过的，可点改）；本项目资料每份显示种类、角色、处理状态，可重试、删掉；
// “我导入的学过的”可看、可删；我的产出也在这页。还有项目期限（设置里用）。
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  BookIcon,
  CalendarClockIcon,
  CopyIcon,
  FileIcon,
  FolderIcon,
  FolderInputIcon,
  GitBranchIcon,
  GlobeIcon,
  LibraryIcon,
  LinkIcon,
  Loader2Icon,
  NotebookPenIcon,
  PlusIcon,
  RotateCcwIcon,
  Trash2Icon,
} from 'lucide-react';
import type { ProjectMaterialView, UploadItemView } from '../../shared/protocol.ts';
import { Button } from '@/components/ui/button';
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@/components/ui/menu';
import { TooltipIconButton } from '@/components/assistant-ui/tooltip-icon-button';
import { cn } from '@/lib/utils';
import { api } from '../api.ts';
import { shortTime } from '../evidence-model.ts';
import { useLoad } from '../hooks/use-load.ts';
import { usePanel } from '../panel.ts';
import { groupBySubject } from '../scope-model.ts';
import { W } from '../wording.ts';
import { Badge, Loading } from './evidence/parts.tsx';
import { OutputsSection } from './outputs/outputs-section.tsx';

/** 一次最多传多少个文件（和核心一致，超了在这里先说）。 */
export const MAX_UPLOAD_FILES = 100;

const INPUT =
  'bg-background focus:border-foreground/30 rounded-lg border px-3 py-1.5 text-sm outline-none';

export interface PickedFile {
  file: File;
  /** 相对路径（文件夹里的带文件夹名）。 */
  path: string;
}

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

// ───────────── 资料页签 ─────────────

type Adding = 'link' | 'repo' | 'library' | 'project' | undefined;

export function MaterialsTab(props: { projectId: string; onError: (e: unknown) => void }) {
  const { projectId, onError } = props;
  const r = useLoad(`materials:${projectId}`, () => api.materials(projectId));
  const ups = useLoad(`uploads:${projectId}`, () => api.uploads(projectId));
  const [adding, setAdding] = useState<Adding>();
  const [dragging, setDragging] = useState(false);
  const [sending, setSending] = useState(0);
  const [notice, setNotice] = useState<string | undefined>();
  const fileInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const reloadMaterials = r.reload;

  // 有在处理的：每隔几秒重读一次状态（处理进度不进正本，没有事件）
  const processing = r.data?.materials.some((m) => m.status === '处理中') === true;
  useEffect(() => {
    if (!processing) return;
    const t = setTimeout(reloadMaterials, 3000);
    return () => clearTimeout(t);
  }, [processing, r.data, reloadMaterials]);

  const send = (files: PickedFile[]) => {
    if (files.length === 0) return;
    if (files.length > MAX_UPLOAD_FILES) {
      setNotice(W.tooManyFiles(files.length, MAX_UPLOAD_FILES));
      return;
    }
    setNotice(undefined);
    setSending(files.length);
    api
      .upload(projectId, files)
      .then(() => {
        ups.reload();
        r.reload();
      })
      .catch((e: unknown) => setNotice(e instanceof Error ? e.message : String(e)))
      .finally(() => setSending(0));
  };
  const change = (p: Promise<unknown>) =>
    void p.then(() => {
      r.reload();
      ups.reload();
    }, onError);

  return (
    <div
      data-testid="materials-tab"
      className={cn(
        'relative flex flex-col gap-8 rounded-2xl',
        dragging && 'ring-primary ring-2 ring-offset-4 ring-dashed',
      )}
      onDragOver={(e) => {
        if (![...e.dataTransfer.types].includes('Files')) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={(e) => {
        if (e.dataTransfer.files.length === 0) return;
        e.preventDefault();
        setDragging(false);
        void filesFromDrop(e.dataTransfer).then(send, onError);
      }}
    >
      <section data-testid="project-materials" className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2 [&_svg]:size-4">
          <LibraryIcon className="text-muted-foreground" />
          <h2 className="font-medium">{W.materials}</h2>
          {r.data !== undefined && (
            <span className="text-muted-foreground text-sm">{r.data.materials.length}</span>
          )}
          <div className="ms-auto">
            <AddMenu
              onFile={() => fileInput.current?.click()}
              onFolder={() => folderInput.current?.click()}
              onPick={(what) => setAdding((a) => (a === what ? undefined : what))}
            />
          </div>
        </div>
        <p className="text-muted-foreground text-xs leading-relaxed">
          {dragging ? W.dropFiles : `${W.materialsHint}；${W.dropHint}`}
        </p>
        {sending > 0 && (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2Icon className="size-4 animate-spin" />
            {W.filesUploading(sending)}
          </div>
        )}
        {notice !== undefined && <div className="text-destructive text-sm">{notice}</div>}
        {adding === 'link' && (
          <LinkForm
            kind="web"
            onAdd={(origin) =>
              change(
                api
                  .addMaterial(projectId, { kind: 'web', origin })
                  .then(() => setAdding(undefined)),
              )
            }
          />
        )}
        {adding === 'repo' && (
          <LinkForm
            kind="repo"
            onAdd={(origin, commit) =>
              change(
                api
                  .addMaterial(projectId, {
                    kind: 'repo',
                    origin,
                    ...(commit !== undefined && commit !== '' ? { commit } : {}),
                  })
                  .then(() => setAdding(undefined)),
              )
            }
          />
        )}
        {adding === 'library' && (
          <Picker
            projectId={projectId}
            chosen={new Set(r.data?.materials.map((m) => m.origin ?? m.book) ?? [])}
            onAdd={(book) =>
              api.changeMaterials(projectId, { add: [book] }).then(r.reload, onError)
            }
          />
        )}
        {adding === 'project' && (
          <FromProject
            projectId={projectId}
            onTake={(from, material) =>
              api.copyMaterial(projectId, from, material).then(r.reload, onError)
            }
          />
        )}
        {!r.data ? (
          <Loading error={r.error} />
        ) : r.data.materials.length === 0 ? (
          <div
            data-testid="materials-all"
            className="text-muted-foreground rounded-xl border border-dashed px-3 py-6 text-center text-sm"
          >
            {W.materialsAll}
          </div>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {r.data.materials.map((m) => (
              <li key={m.book}>
                <MaterialRow
                  material={m}
                  onRetry={() => change(api.retryMaterial(projectId, m.book))}
                  onRemove={() => change(api.changeMaterials(projectId, { remove: [m.book] }))}
                />
              </li>
            ))}
          </ul>
        )}
        <input
          ref={fileInput}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            const list = [...(e.target.files ?? [])];
            e.target.value = '';
            send(list.map((file) => ({ file, path: file.name })));
          }}
        />
        <input
          ref={folderInput}
          type="file"
          multiple
          hidden
          {...{ webkitdirectory: '' }}
          onChange={(e) => {
            const list = [...(e.target.files ?? [])];
            e.target.value = '';
            send(list.map((file) => ({ file, path: file.webkitRelativePath || file.name })));
          }}
        />
      </section>
      {ups.data !== undefined && ups.data.items.length > 0 && (
        <Uploads
          items={ups.data.items}
          onReroute={(x, to) => change(api.reroute(projectId, x.upload, x.file, to))}
        />
      )}
      <MyImports projectId={projectId} onError={onError} />
      <OutputsSection projectId={projectId} />
    </div>
  );
}

function AddMenu(props: {
  onFile: () => void;
  onFolder: () => void;
  onPick: (what: Exclude<Adding, undefined>) => void;
}) {
  return (
    <Menu>
      <MenuTrigger
        data-testid="add-material"
        className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-medium [&_svg]:size-4"
      >
        <PlusIcon />
        {W.add}
      </MenuTrigger>
      <MenuContent align="end">
        <MenuItem onClick={props.onFile}>
          <FileIcon />
          {W.addFile}
        </MenuItem>
        <MenuItem onClick={props.onFolder}>
          <FolderIcon />
          {W.addFolder}
        </MenuItem>
        <MenuItem onClick={() => props.onPick('link')}>
          <LinkIcon />
          {W.addLink}
        </MenuItem>
        <MenuItem onClick={() => props.onPick('repo')}>
          <GitBranchIcon />
          {W.addRepo}
        </MenuItem>
        <MenuSeparator />
        <MenuItem onClick={() => props.onPick('library')}>
          <BookIcon />
          {W.addFromLibrary}
        </MenuItem>
        <MenuItem onClick={() => props.onPick('project')}>
          <CopyIcon />
          {W.addFromProject}
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}

function LinkForm(props: {
  kind: 'web' | 'repo';
  onAdd: (origin: string, commit?: string) => void;
}) {
  const [url, setUrl] = useState('');
  const [commit, setCommit] = useState('');
  return (
    <Panel testId={`add-${props.kind}`}>
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (url.trim() !== '') props.onAdd(url.trim(), commit.trim());
        }}
      >
        <input
          className={cn(INPUT, 'font-mono')}
          aria-label={props.kind === 'web' ? W.addLink : W.addRepo}
          placeholder={props.kind === 'web' ? W.linkPlaceholder : W.repoPlaceholder}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          autoFocus
        />
        {props.kind === 'repo' && (
          <input
            className={cn(INPUT, 'font-mono')}
            placeholder={W.repoCommit}
            value={commit}
            onChange={(e) => setCommit(e.target.value)}
          />
        )}
        <Button type="submit" size="sm" className="self-start" disabled={url.trim() === ''}>
          {W.addGo}
        </Button>
      </form>
    </Panel>
  );
}

const KIND_ICON: Record<string, ReactNode> = {
  web: <GlobeIcon />,
  search: <GlobeIcon />,
  repo: <GitBranchIcon />,
  md: <FileIcon />,
  subtitle: <FileIcon />,
  note: <NotebookPenIcon />,
};

function MaterialRow(props: {
  material: ProjectMaterialView;
  onRetry: () => void;
  onRemove: () => void;
}) {
  const panel = usePanel();
  const m = props.material;
  const missing = m.missing === true;
  const usable = !missing && (m.status === '可用' || m.status === '部分可用');
  return (
    <div className="bg-card group flex flex-col gap-1 rounded-xl border px-3 py-2 text-sm shadow-xs">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground shrink-0 [&_svg]:size-4">
          {KIND_ICON[m.kind] ?? <BookIcon />}
        </span>
        <button
          type="button"
          disabled={!usable}
          className={cn(
            'flex min-w-0 flex-1 flex-col text-left',
            usable && 'hover:underline',
            missing && 'text-muted-foreground line-through',
          )}
          onClick={() => panel.show({ kind: 'library', book: m.book })}
        >
          <span className="truncate font-medium">{m.title}</span>
          <span className="text-muted-foreground truncate text-xs">
            {[
              W.materialKind[m.kind],
              m.subject,
              m.origin !== undefined && /^https?:/.test(m.origin) ? m.origin : undefined,
              m.fetchedAt !== undefined ? shortTime(m.fetchedAt) : undefined,
            ]
              .filter((x) => x !== undefined && x !== '')
              .join(' · ')}
          </span>
        </button>
        <StatusBadge material={m} />
        {m.role !== undefined && (
          <Badge tone="accent" title={W.materialRole}>
            {m.role.value}
          </Badge>
        )}
        {(m.status === '失败' || m.status === '部分可用') && (
          <TooltipIconButton
            tooltip={W.materialRetry}
            className="size-7 shrink-0"
            onClick={props.onRetry}
          >
            <RotateCcwIcon />
          </TooltipIconButton>
        )}
        <TooltipIconButton
          tooltip={W.materialDelete}
          className="size-7 shrink-0"
          onClick={props.onRemove}
        >
          <Trash2Icon />
        </TooltipIconButton>
      </div>
      {m.problems !== undefined && m.problems.length > 0 && (
        <div className="text-xs text-amber-800 dark:text-amber-200">{m.problems.join('；')}</div>
      )}
    </div>
  );
}

function StatusBadge(props: { material: ProjectMaterialView }) {
  const m = props.material;
  if (m.missing === true) return <Badge tone="warn">{W.materialMissing}</Badge>;
  if (m.status === undefined || m.status === '可用') return null;
  if (m.status === '处理中') {
    return (
      <Badge tone="accent">
        <Loader2Icon className="me-1 inline size-3 animate-spin" />
        {W.materialStatus.处理中}
      </Badge>
    );
  }
  return (
    <Badge tone="warn" title={m.problems?.join('；') ?? m.status}>
      {m.status === '部分可用' && m.problems !== undefined
        ? `${W.materialStatus.部分可用} · ${W.materialProblems(m.problems.length)}`
        : W.materialStatus[m.status]}
    </Badge>
  );
}

/** 刚加进来的：每份分到了哪、为什么，可点改。 */
function Uploads(props: {
  items: UploadItemView[];
  onReroute: (x: UploadItemView, to: '资料' | '学过的') => void;
}) {
  return (
    <section data-testid="uploads" className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2 [&_svg]:size-4 [&_svg]:self-center">
        <FolderInputIcon className="text-muted-foreground" />
        <h2 className="font-medium">{W.uploadsTitle}</h2>
      </div>
      <p className="text-muted-foreground text-xs leading-relaxed">{W.uploadsHint}</p>
      <ul className="flex flex-col gap-1">
        {props.items.slice(0, 20).map((x) => {
          const other = x.routedTo === '资料' ? '学过的' : '资料';
          return (
            <li
              key={`${x.upload}/${x.file}`}
              className="flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-lg px-1 py-1 text-sm"
            >
              <span className="min-w-0 truncate font-mono text-xs">{x.file}</span>
              <Badge tone={x.routedTo === '资料' ? 'neutral' : 'accent'}>
                {W.routedTo[x.routedTo]}
              </Badge>
              <span className="text-muted-foreground text-xs">
                {W.routedBy[x.by]}
                {x.reason !== undefined && `：${x.reason}`}
              </span>
              {x.problem !== undefined && (
                <span className="text-xs text-amber-800 dark:text-amber-200">{x.problem}</span>
              )}
              {(other === '资料' || canBeLearned(x.file)) && (
                <Button
                  variant="ghost"
                  size="xs"
                  className="ms-auto"
                  onClick={() => props.onReroute(x, other)}
                >
                  {W.rerouteTo(W.routedTo[other])}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** 能当学过的：文字笔记、对话导出，或整个文件夹（没有扩展名的那一项）；PDF、字幕等只能当资料。 */
function canBeLearned(file: string): boolean {
  const name = file.split('/').at(-1) ?? file;
  return /\.(md|markdown|txt|json)$/i.test(name) || !name.includes('.');
}

/** 我导入的学过的（本项目导入的笔记、对话记录、谈方向时说的）：可看、可删。 */
function MyImports(props: { projectId: string; onError: (e: unknown) => void }) {
  const r = useLoad(`learned:${props.projectId}`, () => api.learned(props.projectId));
  const [open, setOpen] = useState<{ id: string; text?: string } | undefined>();
  const mine = (r.data?.imports ?? []).filter((x) => x.project === props.projectId).reverse();
  return (
    <section data-testid="my-imports" className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2 [&_svg]:size-4 [&_svg]:self-center">
        <NotebookPenIcon className="text-muted-foreground" />
        <h2 className="font-medium">{W.myImports}</h2>
        <span className="text-muted-foreground text-sm">{mine.length}</span>
      </div>
      <p className="text-muted-foreground text-xs leading-relaxed">{W.myImportsHint}</p>
      {!r.data ? (
        <Loading error={r.error} />
      ) : mine.length === 0 ? (
        <div className="text-muted-foreground text-sm">{W.myImportsNone}</div>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {mine.map((x) => (
            <li
              key={x.id}
              className="bg-card flex flex-col gap-1 rounded-xl border px-3 py-2 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="warn">{W.unverified}</Badge>
                <span className="text-muted-foreground text-xs">{W.importChannel[x.channel]}</span>
                <span className="min-w-0 truncate font-medium">{x.title ?? x.id}</span>
                <span className="text-muted-foreground ms-auto text-xs">{shortTime(x.at)}</span>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => {
                    if (open?.id === x.id) {
                      setOpen(undefined);
                      return;
                    }
                    setOpen({ id: x.id });
                    api
                      .importText(x.id)
                      .then((t) => setOpen({ id: x.id, text: t.text }), props.onError);
                  }}
                >
                  {open?.id === x.id ? W.importHide : W.importView}
                </Button>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() =>
                    void api.removeImport(props.projectId, x.id).then(r.reload, props.onError)
                  }
                >
                  {W.importDelete}
                </Button>
              </div>
              {open?.id === x.id && (
                <pre className="bg-muted/40 max-h-80 overflow-auto rounded-lg p-2 text-xs whitespace-pre-wrap">
                  {open.text ?? W.loading}
                </pre>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** 从本机书库按学科挑书加进项目资料。 */
function Picker(props: {
  projectId: string;
  chosen: Set<string>;
  onAdd: (book: string) => Promise<unknown>;
}) {
  const r = useLoad(`library:books:${props.projectId}`, () => api.books(props.projectId), false);
  const [busy, setBusy] = useState<string | undefined>();
  if (!r.data) return <Loading error={r.error} />;
  const books = r.data.books.filter((b) => b.kind !== 'note');
  return (
    <Panel testId="material-picker">
      <p className="text-muted-foreground text-xs">{W.materialPickHint}</p>
      {books.length === 0 && <div className="text-muted-foreground text-sm">{W.libraryEmpty}</div>}
      {groupBySubject(books).map((g) => (
        <div key={g.subject} className="flex flex-col gap-1">
          <div className="text-muted-foreground text-xs font-medium">
            {g.subject === '' ? W.noSubject : g.subject}
          </div>
          {g.books.map((b) => {
            const has = props.chosen.has(b.id) || b.selected === true;
            return (
              <div key={b.id} className="flex items-center gap-2 rounded-md px-1 py-1 text-sm">
                <BookIcon className="text-muted-foreground size-4 shrink-0" />
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

/** 从别的项目拿：列出其他项目和它们的资料，点“拿过来”复制一份进本项目。 */
function FromProject(props: {
  projectId: string;
  onTake: (fromProject: string, material: string) => Promise<unknown>;
}) {
  const r = useLoad('projects', () => api.projects(), false);
  const others = (r.data?.projects ?? []).filter((p) => p.mainSessionId !== props.projectId);
  if (!r.data) return <Loading error={r.error} />;
  return (
    <Panel testId="from-project">
      {others.length === 0 && (
        <div className="text-muted-foreground text-sm">{W.otherProjectsNone}</div>
      )}
      {others.map((p) => (
        <OtherProject
          key={p.mainSessionId}
          id={p.mainSessionId}
          title={p.title}
          onTake={props.onTake}
        />
      ))}
    </Panel>
  );
}

function OtherProject(props: {
  id: string;
  title: string;
  onTake: (fromProject: string, material: string) => Promise<unknown>;
}) {
  const r = useLoad(`materials:${props.id}`, () => api.materials(props.id), false);
  const [taken, setTaken] = useState<Set<string>>(new Set());
  const list = (r.data?.materials ?? []).filter((m) => m.missing !== true);
  if (r.data !== undefined && list.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <div className="text-muted-foreground text-xs font-medium">{props.title}</div>
      {!r.data ? (
        <Loading error={r.error} />
      ) : (
        list.map((m) => (
          <div key={m.book} className="flex items-center gap-2 rounded-md px-1 py-1 text-sm">
            <span className="text-muted-foreground [&_svg]:size-4">
              {KIND_ICON[m.kind] ?? <BookIcon />}
            </span>
            <span className="min-w-0 flex-1 truncate">{m.title}</span>
            {taken.has(m.book) ? (
              <Badge tone="accent">{W.taken}</Badge>
            ) : (
              <Button
                variant="outline"
                size="xs"
                onClick={() =>
                  void props
                    .onTake(props.id, m.book)
                    .then(() => setTaken((t) => new Set([...t, m.book])))
                }
              >
                {W.takeThis}
              </Button>
            )}
          </div>
        ))
      )}
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

/** 拖进来的东西 → 文件 + 相对路径；文件夹逐层读开（浏览器的 webkitGetAsEntry）。 */
export async function filesFromDrop(dt: DataTransfer): Promise<PickedFile[]> {
  const entries = [...dt.items]
    .map((i) => i.webkitGetAsEntry())
    .filter((e): e is FileSystemEntry => e !== null);
  if (entries.length === 0) return [...dt.files].map((file) => ({ file, path: file.name }));
  const out: PickedFile[] = [];
  const walk = async (entry: FileSystemEntry, prefix: string): Promise<void> => {
    if (entry.isFile) {
      const file = await new Promise<File>((ok, fail) => {
        (entry as FileSystemFileEntry).file(ok, fail);
      });
      out.push({ file, path: `${prefix}${entry.name}` });
      return;
    }
    if (entry.isDirectory) {
      if (entry.name.startsWith('.')) return;
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      for (;;) {
        const batch = await new Promise<FileSystemEntry[]>((ok, fail) => {
          reader.readEntries(ok, fail);
        });
        if (batch.length === 0) break;
        for (const e of batch) await walk(e, `${prefix}${entry.name}/`);
      }
    }
  };
  for (const e of entries) await walk(e, '');
  return out;
}
