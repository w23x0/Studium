// 一份资料的来源说明（资料目录页上）：类型、层次、作者、适用范围、已知限制，和转写质量的已知数据；
// 每一项带来历（自动得到 / 资料自带 / 你补的 / 老师补的）；没写的就写“还没说明”，不编。可补一句（只追加）。
import { useState } from 'react';
import { SOURCE_NOTE_FIELDS, type SourceNoteField } from '../../../shared/protocol.ts';
import { Button } from '@/components/ui/button';
import { api } from '../../api.ts';
import { noteRows } from '../../cross-model.ts';
import { invalidateSourceNotes } from '../../hooks/use-source-notes.ts';
import { useLoad } from '../../hooks/use-load.ts';
import { shortTime } from '../../evidence-model.ts';
import { W } from '../../wording.ts';
import { Badge, Card, Loading, Section } from '../evidence/parts.tsx';

export function SourceNoteCard(props: { book: string }) {
  const r = useLoad(`source-note:${props.book}`, () => api.sourceNote(props.book), false);
  if (!r.data) return <Loading error={r.error} />;
  const n = r.data.note;
  return (
    <Section title={W.sourceNote} hint={W.sourceNoteHint}>
      <Card className="flex flex-col gap-2" id="source-note">
        {noteRows(n).map((row) => (
          <div key={row.field} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-muted-foreground w-16 shrink-0 text-xs">
              {W.noteField[row.field]}
            </span>
            {row.item === undefined ? (
              <span className="text-muted-foreground text-xs">{W.noteUnset}</span>
            ) : (
              <>
                <span>{row.item.value}</span>
                <Badge>{W.noteFrom[row.item.from]}</Badge>
              </>
            )}
          </div>
        ))}
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-muted-foreground w-16 shrink-0 text-xs">{W.noteQuality}</span>
          <span data-testid="source-note-quality">{n.quality.text}</span>
        </div>
        {n.additions.length > 1 && (
          <details className="text-xs">
            <summary className="text-muted-foreground cursor-pointer">{W.noteEarlier}</summary>
            <ul className="mt-1 flex flex-col gap-0.5">
              {n.additions.map((a) => (
                <li key={a.id}>
                  {W.noteField[a.field]}：{a.text}
                  <span className="text-muted-foreground">
                    {' '}
                    · {W.noteFrom[a.by]} · {shortTime(a.at)}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
        <AddNote
          book={props.book}
          onDone={() => {
            invalidateSourceNotes();
            r.reload();
          }}
        />
      </Card>
    </Section>
  );
}

function AddNote(props: { book: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [field, setField] = useState<SourceNoteField>('type');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  if (!open) {
    return (
      <Button variant="ghost" size="xs" className="self-start" onClick={() => setOpen(true)}>
        {W.noteAdd}
      </Button>
    );
  }
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        setBusy(true);
        setError(undefined);
        api
          .addSourceNote(props.book, field, text.trim())
          .then(() => {
            setText('');
            setOpen(false);
            props.onDone();
          })
          .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
          .finally(() => setBusy(false));
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="bg-background rounded-md border px-2 py-1 text-sm"
          aria-label={W.noteAdd}
          value={field}
          onChange={(e) => setField(e.target.value as SourceNoteField)}
        >
          {SOURCE_NOTE_FIELDS.map((f) => (
            <option key={f} value={f}>
              {W.noteField[f]}
            </option>
          ))}
        </select>
        <input
          className="bg-background focus:border-foreground/30 min-w-0 flex-1 rounded-md border px-2 py-1 text-sm outline-none"
          placeholder={W.noteFieldHint[field]}
          aria-label={W.notePlaceholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>
      <div className="text-muted-foreground text-xs">{W.noteAdded}</div>
      {error !== undefined && <div className="text-destructive text-xs">{error}</div>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          {W.objectCancel}
        </Button>
        <Button type="submit" size="sm" disabled={busy || text.trim() === ''}>
          {W.noteSave}
        </Button>
      </div>
    </form>
  );
}
