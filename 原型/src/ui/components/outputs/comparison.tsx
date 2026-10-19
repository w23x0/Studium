// 方法比较：用表看、用表改（不改由表生成的正文）。每列一个方法；行是适用边界、各个比较的方面、证据与出处。
import type { ReactNode } from 'react';
import { PlusIcon, XIcon } from 'lucide-react';
import type { MethodComparison } from '../../../shared/m14.ts';
import { TooltipIconButton } from '@/components/assistant-ui/tooltip-icon-button';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  addDim,
  addMethod,
  removeDim,
  removeMethod,
  type ComparisonDraft,
} from '../../output-model.ts';
import { W } from '../../wording.ts';
import { OutputText } from './output-body.tsx';

const TH =
  'bg-muted/60 text-muted-foreground border px-2.5 py-1.5 text-left text-xs font-medium align-top';
const TD = 'border px-2.5 py-1.5 align-top';

export function ComparisonTable(props: { comparison: MethodComparison }) {
  const c = props.comparison;
  const cell = (text: string | undefined) =>
    text === undefined || text === '' ? (
      <span className="text-muted-foreground">—</span>
    ) : (
      <OutputText text={text} compact />
    );
  return (
    <div className="flex flex-col gap-4" data-testid="comparison-table">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className={cn(TH, 'w-28')} />
              {c.methods.map((m) => (
                <th key={m.name} className={cn(TH, 'text-foreground text-sm')}>
                  {m.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th className={TH}>{W.cmpBoundary}</th>
              {c.methods.map((m) => (
                <td key={m.name} className={cn(TD, 'bg-primary/5')}>
                  {cell(m.boundary)}
                </td>
              ))}
            </tr>
            {c.dimensions.map((d) => (
              <tr key={d}>
                <th className={TH}>{d}</th>
                {c.methods.map((m) => (
                  <td key={m.name} className={TD}>
                    {cell(m.values[d])}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <th className={TH}>{W.cmpEvidence}</th>
              {c.methods.map((m) => (
                <td key={m.name} className={TD}>
                  {m.evidence.length === 0 ? (
                    cell(undefined)
                  ) : (
                    <ul className="flex flex-col gap-1">
                      {m.evidence.map((e, i) => (
                        <li key={i}>
                          <OutputText text={e} compact />
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      {c.tentative !== undefined && (
        <div className="flex flex-col gap-1 rounded-xl border border-dashed px-3 py-2">
          <div className="text-muted-foreground text-xs">{W.cmpTentative}</div>
          <OutputText text={c.tentative} compact />
        </div>
      )}
    </div>
  );
}

export function ComparisonEditor(props: {
  draft: ComparisonDraft;
  onChange: (d: ComparisonDraft) => void;
}) {
  const { draft: d, onChange } = props;
  const setMethod = (i: number, patch: Partial<ComparisonDraft['methods'][number]>) =>
    onChange({ ...d, methods: d.methods.map((m, k) => (k === i ? { ...m, ...patch } : m)) });
  const setValue = (i: number, dim: number, v: string) =>
    setMethod(i, {
      values: (d.methods[i]?.values ?? []).map((x, k) => (k === dim ? v : x)),
    });
  return (
    <div className="flex flex-col gap-3" data-testid="comparison-editor">
      <p className="text-muted-foreground text-xs">{W.cmpHint}</p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className={cn(TH, 'w-36')}>{W.cmpMethod}</th>
              {d.methods.map((m, i) => (
                <th key={i} className={cn(TH, 'min-w-44')}>
                  <div className="flex items-center gap-1">
                    <Cell
                      value={m.name}
                      placeholder={W.cmpMethodPlaceholder}
                      onChange={(v) => setMethod(i, { name: v })}
                      single
                    />
                    <TooltipIconButton
                      tooltip={W.cmpRemoveMethod}
                      className="size-6 shrink-0"
                      onClick={() => onChange(removeMethod(d, i))}
                    >
                      <XIcon />
                    </TooltipIconButton>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <Row label={W.cmpBoundary}>
              {d.methods.map((m, i) => (
                <td key={i} className={TD}>
                  <Cell
                    value={m.boundary}
                    placeholder={W.cmpBoundaryPlaceholder}
                    onChange={(v) => setMethod(i, { boundary: v })}
                  />
                </td>
              ))}
            </Row>
            {d.dims.map((dim, k) => (
              <Row
                key={k}
                label={
                  <div className="flex items-center gap-1">
                    <Cell
                      value={dim}
                      placeholder={W.cmpDimPlaceholder}
                      onChange={(v) =>
                        onChange({ ...d, dims: d.dims.map((x, j) => (j === k ? v : x)) })
                      }
                      single
                    />
                    <TooltipIconButton
                      tooltip={W.cmpRemoveDim}
                      className="size-6 shrink-0"
                      onClick={() => onChange(removeDim(d, k))}
                    >
                      <XIcon />
                    </TooltipIconButton>
                  </div>
                }
              >
                {d.methods.map((m, i) => (
                  <td key={i} className={TD}>
                    <Cell value={m.values[k] ?? ''} onChange={(v) => setValue(i, k, v)} />
                  </td>
                ))}
              </Row>
            ))}
            <Row label={W.cmpEvidence}>
              {d.methods.map((m, i) => (
                <td key={i} className={TD}>
                  <Cell
                    value={m.evidence}
                    placeholder={W.cmpEvidencePlaceholder}
                    onChange={(v) => setMethod(i, { evidence: v })}
                    rows={3}
                  />
                </td>
              ))}
            </Row>
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="xs" onClick={() => onChange(addMethod(d))}>
          <PlusIcon />
          {W.cmpAddMethod}
        </Button>
        <Button variant="outline" size="xs" onClick={() => onChange(addDim(d))}>
          <PlusIcon />
          {W.cmpAddDim}
        </Button>
      </div>
      <label className="flex flex-col gap-1 text-xs">
        <span className="text-muted-foreground">{W.cmpTentative}</span>
        <textarea
          className="bg-background focus:border-foreground/30 min-h-16 rounded-lg border px-2.5 py-1.5 text-sm outline-none"
          placeholder={W.cmpTentativePlaceholder}
          value={d.tentative}
          onChange={(e) => onChange({ ...d, tentative: e.target.value })}
        />
      </label>
    </div>
  );
}

function Row(props: { label: ReactNode; children: ReactNode }) {
  return (
    <tr>
      <th className={TH}>{props.label}</th>
      {props.children}
    </tr>
  );
}

function Cell(props: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  single?: boolean;
  rows?: number;
}) {
  const cls =
    'bg-background focus:border-foreground/30 w-full rounded-md border px-2 py-1 text-sm font-normal text-foreground outline-none';
  return props.single === true ? (
    <input
      className={cls}
      value={props.value}
      placeholder={props.placeholder}
      aria-label={props.placeholder}
      onChange={(e) => props.onChange(e.target.value)}
    />
  ) : (
    <textarea
      className={cn(cls, 'resize-y')}
      rows={props.rows ?? 2}
      value={props.value}
      placeholder={props.placeholder}
      onChange={(e) => props.onChange(e.target.value)}
    />
  );
}
