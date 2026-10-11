// 候选与更正（书里的知识点上的补充、改动想法）：“候选与更正”页、知识点面板里的“提建议 / 更正”。
// 候选不进“书里的知识点”、老师讲课也不拿它当依据；转正的规则还没定，这里只记意见，不转正。
import { useState } from 'react';
import type {
  AuditVerdict,
  CandidateView,
  CorrectionBasis,
  CorrectionFields,
  CorrectionMark,
  CorrectionView,
  TargetRef,
} from '../../../shared/m08-review.ts';
import { AUDIT_VERDICTS } from '../../../shared/m08-review.ts';
import { Button } from '@/components/ui/button';
import { api } from '../../api.ts';
import { useLoad } from '../../hooks/use-load.ts';
import { usePanel } from '../../panel.ts';
import {
  canCorrectWith,
  correctionLines,
  groupCandidates,
  markerTags,
  originalLines,
  verdictLabel,
} from '../../review-model.ts';
import { W } from '../../wording.ts';
import { Badge, Card, Loading, Quote, Section, Time } from './parts.tsx';

// ───────────── “候选与更正”页 ─────────────

export function ReviewPage() {
  const cands = useLoad('review:candidates', () => api.reviewCandidates(), false);
  const corrs = useLoad('review:corrections', () => api.reviewCorrections(), false);
  if (!cands.data || !corrs.data) return <Loading error={cands.error ?? corrs.error} />;
  const groups = groupCandidates(cands.data.candidates);
  const corrections = [...corrs.data.corrections].reverse();
  return (
    <div className="flex flex-col gap-5" data-testid="review-page">
      <div className="flex flex-col gap-1">
        <h2 className="font-serif text-lg">{W.candPage}</h2>
        <p className="text-muted-foreground text-xs leading-relaxed">{W.candPageHint}</p>
      </div>
      <Section title={W.reviewCandidates}>
        {groups.length === 0 && (
          <div className="text-muted-foreground text-sm">{W.candidateEmpty}</div>
        )}
        {groups.map((g) => (
          <div
            key={g.source}
            className="flex flex-col gap-2"
            data-testid={`candidates-${g.source}`}
          >
            <div className="text-xs font-medium">{g.label}</div>
            {g.candidates.map((c) => (
              <CandidateCard key={c.id} c={c} onChanged={cands.reload} />
            ))}
          </div>
        ))}
      </Section>
      <Section title={W.reviewCorrections}>
        {corrections.length === 0 && (
          <div className="text-muted-foreground text-sm">{W.correctionHistoryNone}</div>
        )}
        {corrections.map((c) => (
          <CorrectionCard key={c.id} c={c} showTarget />
        ))}
      </Section>
    </div>
  );
}

// ───────────── 一条候选 ─────────────

function CandidateCard(props: {
  c: CandidateView;
  onChanged: () => void;
  /** 在知识点面板里：这条建议能当依据时，给“据此更正”。 */
  action?: React.ReactNode;
}) {
  const { c } = props;
  const panel = usePanel();
  return (
    <Card className="flex flex-col gap-2" id={`candidate-${c.id}`}>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone="warn">{W.candidateTag}</Badge>
        <Badge>{W.candidateKind[c.kind]}</Badge>
        <span className="text-muted-foreground text-xs">
          <Time at={c.at} />
          {c.model !== undefined ? ` · ${c.model}` : ''}
        </span>
      </div>
      {c.target !== undefined && (
        <button
          type="button"
          className="text-primary self-start text-xs underline underline-offset-4"
          onClick={() => c.target && panel.show({ kind: c.target.kind, id: c.target.id })}
        >
          {c.target.name}
        </button>
      )}
      {c.m14 !== undefined && (
        <button
          type="button"
          className="text-primary self-start text-xs underline underline-offset-4"
          onClick={() =>
            c.m14 && panel.show({ kind: 'output', id: c.m14.output, version: c.m14.version })
          }
        >
          {W.candidateFromOutput(c.m14.title ?? c.m14.output, c.m14.version)}
        </button>
      )}
      <div className="whitespace-pre-wrap">{c.text}</div>
      {c.draft?.point !== undefined && (
        <div className="bg-muted/60 rounded-lg px-3 py-2 text-[0.92rem]">
          <div className="text-muted-foreground text-xs">{W.candidateDraftPoint}</div>
          <div className="font-medium">{c.draft.point.name}</div>
          <div>{c.draft.point.sentence}</div>
        </div>
      )}
      {c.draft?.clause !== undefined && <DraftClause draft={c.draft.clause} />}
      {c.origin !== undefined && c.origin.quotes.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="text-muted-foreground text-xs">{W.candidateYourWords}</div>
          {c.origin.quotes.map((q) => (
            <Quote key={q.line} quote={q} sessionId={c.origin?.loopSessionId ?? ''} />
          ))}
        </div>
      )}
      <Audits c={c} onChanged={props.onChanged} />
      {props.action}
    </Card>
  );
}

function DraftClause(props: { draft: { from: string[]; to: string; text: string } }) {
  const panel = usePanel();
  const link = (id: string) => (
    <button
      key={id}
      type="button"
      className="text-primary underline underline-offset-4"
      onClick={() => panel.show({ kind: 'point', id })}
    >
      <PointName id={id} />
    </button>
  );
  return (
    <div className="bg-muted/60 rounded-lg px-3 py-2 text-[0.92rem]">
      <div className="text-muted-foreground text-xs">{W.candidateDraftClause}</div>
      <div className="flex flex-wrap items-center gap-1">
        {props.draft.from.map((f, i) => (
          <span key={f}>
            {i > 0 && ' + '}
            {link(f)}
          </span>
        ))}
        <span>→</span>
        {link(props.draft.to)}
      </div>
      <div>{props.draft.text}</div>
    </div>
  );
}

function PointName(props: { id: string }) {
  const r = useLoad(`point:${props.id}`, () => api.point(props.id), false);
  return <>{r.data?.point.name ?? props.id}</>;
}

// ───────────── 审计 ─────────────

function Audits(props: { c: CandidateView; onChanged: () => void }) {
  const { c } = props;
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-1.5 border-t pt-2">
      <div className="text-muted-foreground text-xs">{W.auditHeading}</div>
      {c.audits.length === 0 && <div className="text-muted-foreground text-xs">{W.auditNone}</div>}
      {c.audits.map((a) => (
        <div key={a.id} className="bg-muted/40 rounded-lg px-3 py-1.5 text-[0.9rem]">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone="accent">{verdictLabel(a.verdict, c.kind)}</Badge>
            <span className="text-muted-foreground text-xs">
              {W.auditBy[a.by]}
              {a.model !== undefined ? `（${a.model}）` : ''} · <Time at={a.at} />
            </span>
          </div>
          {a.opinion !== '' && <div className="whitespace-pre-wrap">{a.opinion}</div>}
        </div>
      ))}
      {open ? (
        <AuditForm
          c={c}
          onDone={() => {
            setOpen(false);
            props.onChanged();
          }}
          onCancel={() => setOpen(false)}
        />
      ) : (
        <Button variant="ghost" size="xs" className="self-start" onClick={() => setOpen(true)}>
          {W.auditAdd}
        </Button>
      )}
      <div className="text-muted-foreground text-xs">{W.auditNoPromote}</div>
    </div>
  );
}

function AuditForm(props: { c: CandidateView; onDone: () => void; onCancel: () => void }) {
  const [verdict, setVerdict] = useState<AuditVerdict>('待定');
  const [opinion, setOpinion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {AUDIT_VERDICTS.map((v) => (
          <Button
            key={v}
            size="xs"
            variant={verdict === v ? 'default' : 'outline'}
            onClick={() => setVerdict(v)}
          >
            {verdictLabel(v, props.c.kind)}
          </Button>
        ))}
      </div>
      <textarea
        className="bg-background focus:border-foreground/30 min-h-16 w-full resize-y rounded-lg border px-3 py-2 text-sm outline-none"
        placeholder={W.auditPlaceholder}
        aria-label={W.auditPlaceholder}
        value={opinion}
        onChange={(e) => setOpinion(e.target.value)}
      />
      {error !== undefined && <div className="text-destructive text-xs">{error}</div>}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={props.onCancel}>
          {W.objectCancel}
        </Button>
        <Button
          size="sm"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            setError(undefined);
            api
              .auditCandidate(props.c.id, { verdict, opinion })
              .then(props.onDone)
              .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
              .finally(() => setBusy(false));
          }}
        >
          {W.auditSubmit}
        </Button>
      </div>
    </div>
  );
}

// ───────────── 更正 ─────────────

function CorrectionCard(props: { c: CorrectionView; showTarget?: boolean }) {
  const { c } = props;
  const panel = usePanel();
  return (
    <Card className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone="good">{W.correctedTag}</Badge>
        {props.showTarget === true && (
          <button
            type="button"
            className="text-primary text-xs underline underline-offset-4"
            onClick={() => panel.show({ kind: c.target.kind, id: c.target.id })}
          >
            {c.targetName}
          </button>
        )}
        <Time at={c.at} />
      </div>
      {correctionLines(c).map((l) => (
        <div key={l.field} className="text-[0.92rem]">
          <span className="text-muted-foreground text-xs">{l.label}：</span>
          <span className="text-muted-foreground line-through">{l.before}</span>
          <span> → </span>
          <span>{l.after}</span>
        </div>
      ))}
      <div className="text-[0.92rem]">
        <span className="text-muted-foreground text-xs">{W.correctionBecause}：</span>
        {c.reason}
      </div>
      <div className="text-muted-foreground text-xs">
        {c.basis.kind === 'candidate' ? W.correctionBasisCandidate : W.correctionBasisReport}
      </div>
      {c.stale && (
        <div className="text-xs text-amber-700 dark:text-amber-300">{W.correctionStale}</div>
      )}
    </Card>
  );
}

/** 知识点 / 一步连接上的“已更正，原文是……”。 */
export function CorrectionNote(props: { mark: CorrectionMark | undefined }) {
  const { mark } = props;
  if (mark === undefined) return null;
  return (
    <div className="border-primary/30 bg-primary/5 flex flex-col gap-0.5 rounded-lg border px-3 py-2 text-sm">
      <div className="font-medium">{W.correctedNote(mark.count)}</div>
      {originalLines(mark.original).map((l) => (
        <div key={l.label} className="text-muted-foreground text-xs">
          {W.correctedWas}（{l.label}）：{l.value}
        </div>
      ))}
    </div>
  );
}

/** 知识点 / 一步连接旁边的小标记（有更正、有几条候选）。 */
export function ReviewMarks(props: {
  correction?: { count: number } | undefined;
  candidates?: number | undefined;
}) {
  return (
    <>
      {markerTags(props).map((t) => (
        <Badge key={t.key} tone={t.key === 'corrected' ? 'good' : 'warn'}>
          {t.text}
        </Badge>
      ))}
    </>
  );
}

/** 当前的值，作更正表单的起点。 */
export type CurrentValue =
  | { kind: 'point'; name: string; sentence: string; threshold: boolean }
  | { kind: 'clause'; text: string };

function CorrectionForm(props: {
  target: TargetRef;
  current: CurrentValue;
  basis: CorrectionBasis;
  onDone: () => void;
  onCancel: () => void;
}) {
  const cur = props.current;
  const [name, setName] = useState(cur.kind === 'point' ? cur.name : '');
  const [sentence, setSentence] = useState(cur.kind === 'point' ? cur.sentence : '');
  const [threshold, setThreshold] = useState(cur.kind === 'point' ? cur.threshold : false);
  const [text, setText] = useState(cur.kind === 'clause' ? cur.text : '');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const fields: CorrectionFields =
    cur.kind === 'point'
      ? {
          ...(name.trim() !== cur.name ? { name: name.trim() } : {}),
          ...(sentence.trim() !== cur.sentence ? { sentence: sentence.trim() } : {}),
          ...(threshold !== cur.threshold ? { threshold } : {}),
        }
      : { ...(text.trim() !== cur.text ? { text: text.trim() } : {}) };
  const area =
    'bg-background focus:border-foreground/30 w-full resize-y rounded-lg border px-3 py-2 text-sm outline-none';
  return (
    <div className="flex flex-col gap-2" data-testid="correction-form">
      {cur.kind === 'point' ? (
        <>
          <label className="flex flex-col gap-0.5 text-xs">
            {W.correctionFieldLabels.name}
            <input className={area} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="flex flex-col gap-0.5 text-xs">
            {W.correctionFieldLabels.sentence}
            <textarea
              className={`${area} min-h-16`}
              value={sentence}
              onChange={(e) => setSentence(e.target.value)}
            />
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={threshold}
              onChange={(e) => setThreshold(e.target.checked)}
            />
            {W.correctionFieldLabels.threshold}
          </label>
        </>
      ) : (
        <label className="flex flex-col gap-0.5 text-xs">
          {W.correctionFieldLabels.text}
          <textarea
            className={`${area} min-h-16`}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </label>
      )}
      <label className="flex flex-col gap-0.5 text-xs">
        {W.correctionReason}
        <textarea
          className={`${area} min-h-12`}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      {error !== undefined && <div className="text-destructive text-xs">{error}</div>}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={props.onCancel}>
          {W.objectCancel}
        </Button>
        <Button
          size="sm"
          disabled={busy || Object.keys(fields).length === 0 || reason.trim() === ''}
          onClick={() => {
            setBusy(true);
            setError(undefined);
            api
              .correct({
                target: props.target,
                fields,
                reason: reason.trim(),
                basis: props.basis,
              })
              .then(props.onDone)
              .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
              .finally(() => setBusy(false));
          }}
        >
          {W.correctionApply}
        </Button>
      </div>
    </div>
  );
}

/** “据此更正”：展开更正表单，依据已定。 */
function CorrectWith(props: {
  target: TargetRef;
  current: CurrentValue;
  basis: CorrectionBasis;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <Button variant="outline" size="xs" className="self-start" onClick={() => setOpen(true)}>
        {W.correctionHeading}
      </Button>
    );
  }
  return (
    <CorrectionForm
      target={props.target}
      current={props.current}
      basis={props.basis}
      onCancel={() => setOpen(false)}
      onDone={() => {
        setOpen(false);
        props.onDone();
      }}
    />
  );
}

// ───────────── 知识点面板里的这一块 ─────────────

export function TargetReview(props: {
  target: TargetRef;
  current: CurrentValue;
  /** 改了东西（提了建议、记了意见、更正了）后，外面的知识点也要重读。 */
  onChanged: () => void;
}) {
  const { target } = props;
  const r = useLoad(
    `review:target:${target.kind}:${target.id}`,
    () => api.targetReview(target),
    false,
  );
  if (!r.data) return <Loading error={r.error} />;
  const changed = () => {
    r.reload();
    props.onChanged();
  };
  const { candidates, corrections, reports } = r.data;
  return (
    <div className="flex flex-col gap-4" data-testid="target-review">
      {corrections.length > 0 && (
        <Section title={W.correctionHistory}>
          {[...corrections].reverse().map((c) => (
            <CorrectionCard key={c.id} c={c} />
          ))}
        </Section>
      )}
      {candidates.length > 0 && (
        <Section title={W.reviewCandidates} hint={W.candPageHint}>
          {candidates.map((c) => (
            <CandidateCard
              key={c.id}
              c={c}
              onChanged={changed}
              action={
                canCorrectWith(c, target) ? (
                  <CorrectWith
                    target={target}
                    current={props.current}
                    basis={{ kind: 'candidate', id: c.id }}
                    onDone={changed}
                  />
                ) : c.kind === 'fix' && c.source === 'learner' ? (
                  <div className="text-muted-foreground text-xs">{W.correctionNeedAudit}</div>
                ) : undefined
              }
            />
          ))}
        </Section>
      )}
      {reports.length > 0 && (
        <Section title={W.correctionReports}>
          {reports.map((rep) => (
            <Card key={rep.id} className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge>{rep.kind}</Badge>
                <Time at={rep.at} />
              </div>
              <div>{rep.text}</div>
              <CorrectWith
                target={target}
                current={props.current}
                basis={{ kind: 'source_report', id: rep.id }}
                onDone={changed}
              />
            </Card>
          ))}
        </Section>
      )}
      <SuggestForm target={target} onDone={changed} />
    </div>
  );
}

function SuggestForm(props: { target: TargetRef; onDone: () => void }) {
  const [kind, setKind] = useState<'supplement' | 'fix' | undefined>();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | undefined>();
  return (
    <Section title={W.suggestHeading} hint={W.suggestReportHint}>
      {sent && <div className="text-muted-foreground text-xs">{W.suggestSent}</div>}
      <div className="flex gap-1.5">
        <Button
          size="xs"
          variant={kind === 'supplement' ? 'default' : 'outline'}
          onClick={() => setKind('supplement')}
        >
          {W.suggestSupplement}
        </Button>
        <Button
          size="xs"
          variant={kind === 'fix' ? 'default' : 'outline'}
          onClick={() => setKind('fix')}
        >
          {W.suggestFix}
        </Button>
      </div>
      {kind !== undefined && (
        <div className="flex flex-col gap-2">
          <textarea
            className="bg-background focus:border-foreground/30 min-h-20 w-full resize-y rounded-lg border px-3 py-2 text-sm outline-none"
            placeholder={W.suggestPlaceholder}
            aria-label={W.suggestPlaceholder}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          {error !== undefined && <div className="text-destructive text-xs">{error}</div>}
          <div className="flex justify-end">
            <Button
              size="sm"
              disabled={busy || text.trim() === ''}
              onClick={() => {
                setBusy(true);
                setError(undefined);
                api
                  .suggest({ target: props.target, kind, text: text.trim() })
                  .then(() => {
                    setText('');
                    setKind(undefined);
                    setSent(true);
                    props.onDone();
                  })
                  .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
                  .finally(() => setBusy(false));
              }}
            >
              {W.suggestSubmit}
            </Button>
          </div>
        </div>
      )}
    </Section>
  );
}
