// 改产出物：正文用文本框（可预览），方法比较用表；存为新的一版时带上“基于哪一版”。
// 别人（或老师）刚存了更新的版本时不覆盖：提示先看最新版，稿子留着（翻到别处再回来也在）。
// 重新打开编辑时回到上次的光标与滚动位置（存在浏览器本地，按产出物）。
import { useEffect, useRef, useState } from 'react';
import { TriangleAlertIcon } from 'lucide-react';
import type { OutputView, SaveVersionRequest } from '../../../shared/m14.ts';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { api } from '../../api.ts';
import {
  draftProblems,
  editPositionKey,
  fromDraft,
  isStaleError,
  parseEditPosition,
  toDraft,
  type ComparisonDraft,
} from '../../output-model.ts';
import { W } from '../../wording.ts';
import { ComparisonEditor } from './comparison.tsx';
import { OutputText } from './output-body.tsx';

interface Draft {
  text: string;
  note: string;
  comparison: ComparisonDraft;
  /** 在第几版上改的（还没有版本是 0）。 */
  base: number;
}

/** 没存的稿子：面板翻到知识点、原文再回来时还在；存好或丢掉时清掉。 */
const drafts = new Map<string, Draft>();

function freshDraft(o: OutputView): Draft {
  return {
    text: o.current?.text ?? '',
    note: '',
    comparison: toDraft(o.current?.comparison),
    base: o.latest,
  };
}

export function OutputEditor(props: {
  output: OutputView;
  onDone: () => void;
  onSeeLatest: () => void;
}) {
  const o = props.output;
  const [restored] = useState(() => drafts.has(o.id));
  const [draft, setDraftState] = useState<Draft>(() => drafts.get(o.id) ?? freshDraft(o));
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const [stale, setStale] = useState(false);
  const setDraft = (d: Draft) => {
    drafts.set(o.id, d);
    setDraftState(d);
  };
  const isTable = o.kind === '方法比较';
  const behind = draft.base < o.latest;
  const textRef = useRef<HTMLTextAreaElement>(null);
  const posKey = editPositionKey(o.id);
  const rememberPosition = () => {
    const t = textRef.current;
    if (t === null) return;
    localStorage.setItem(
      posKey,
      JSON.stringify({ start: t.selectionStart, end: t.selectionEnd, scrollTop: t.scrollTop }),
    );
  };
  // 文本框出现时（打开编辑、从预览切回来）回到上次停的地方
  useEffect(() => {
    const t = textRef.current;
    if (t === null) return;
    const pos = parseEditPosition(localStorage.getItem(posKey), t.value.length);
    if (pos === undefined) return;
    t.setSelectionRange(pos.start, pos.end);
    t.scrollTop = pos.scrollTop;
  }, [posKey, preview]);

  const save = () => {
    const found = isTable
      ? draftProblems(draft.comparison)
      : draft.text.trim() === ''
        ? [W.outputEmptyText]
        : [];
    setProblems(found);
    if (found.length > 0) return;
    const req: SaveVersionRequest = {
      ...(isTable ? { comparison: fromDraft(draft.comparison) } : { text: draft.text }),
      note: draft.note.trim(),
      base: draft.base,
    };
    setBusy(true);
    api
      .saveVersion(o.id, req)
      .then(() => {
        drafts.delete(o.id);
        props.onDone();
      })
      .catch((e: unknown) => {
        if (isStaleError(e)) setStale(true);
        else setProblems([e instanceof Error ? e.message : String(e)]);
      })
      .finally(() => setBusy(false));
  };

  return (
    <div className="flex flex-col gap-3" data-testid="output-editor">
      {restored && !behind && !stale && (
        <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
          {W.outputDraftKept}
          <Button
            variant="ghost"
            size="xs"
            onClick={() => {
              drafts.delete(o.id);
              setDraftState(freshDraft(o));
            }}
          >
            {W.outputDiscardDraft}
          </Button>
        </div>
      )}
      {(stale || behind) && (
        <div
          data-testid="output-stale"
          className="flex flex-col gap-2 rounded-xl border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-900/20 dark:text-amber-200"
        >
          <span className="flex items-center gap-1.5">
            <TriangleAlertIcon className="size-3.5 shrink-0" />
            {stale && !behind ? W.outputStale : W.outputStaleBase(draft.base, o.latest)}
          </span>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="xs" onClick={props.onSeeLatest}>
              {W.outputSeeLatest}
            </Button>
            {behind && (
              <Button
                size="xs"
                onClick={() => {
                  setStale(false);
                  setDraft({ ...draft, base: o.latest });
                }}
              >
                {W.outputStaleSeen}
              </Button>
            )}
          </div>
        </div>
      )}
      {isTable ? (
        <ComparisonEditor
          draft={draft.comparison}
          onChange={(comparison) => setDraft({ ...draft, comparison })}
        />
      ) : (
        <div className="flex flex-col gap-1.5">
          <div className="bg-muted flex gap-0.5 self-start rounded-lg p-0.5 text-xs">
            {[false, true].map((p) => (
              <button
                key={String(p)}
                type="button"
                className={cn(
                  'rounded-md px-2.5 py-0.5',
                  preview === p ? 'bg-background shadow-xs' : 'text-muted-foreground',
                )}
                onClick={() => setPreview(p)}
              >
                {p ? W.outputPreview : W.outputWriteMode}
              </button>
            ))}
          </div>
          {preview ? (
            <div className="bg-background min-h-[40vh] rounded-2xl border px-6 py-5">
              <OutputText text={draft.text} />
            </div>
          ) : (
            <textarea
              ref={textRef}
              data-testid="output-text"
              className="bg-background focus:border-foreground/30 min-h-[50vh] resize-y rounded-2xl border px-5 py-4 text-[0.95rem] leading-7 outline-none"
              value={draft.text}
              autoFocus
              aria-label={W.outputTabs.text}
              onChange={(e) => setDraft({ ...draft, text: e.target.value })}
              onSelect={rememberPosition}
              onScroll={rememberPosition}
              onBlur={rememberPosition}
            />
          )}
          <p className="text-muted-foreground text-xs">{W.outputEditorHint}</p>
        </div>
      )}
      <label className="flex flex-col gap-1 text-xs">
        <span className="text-muted-foreground">{W.outputChangeNote}</span>
        <input
          className="bg-background focus:border-foreground/30 rounded-lg border px-3 py-1.5 text-sm outline-none"
          placeholder={W.outputNotePlaceholder}
          value={draft.note}
          onChange={(e) => setDraft({ ...draft, note: e.target.value })}
        />
      </label>
      {problems.length > 0 && (
        <ul className="flex flex-col gap-0.5 text-xs text-red-700 dark:text-red-300">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            drafts.delete(o.id);
            props.onSeeLatest();
          }}
        >
          {W.outputCancelEdit}
        </Button>
        <Button size="sm" disabled={busy || behind} onClick={save} data-testid="output-save">
          {busy ? W.outputSaving : W.outputSave}
        </Button>
      </div>
    </div>
  );
}
