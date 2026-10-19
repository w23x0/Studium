// “我学会的”：W2 起分析层与当前视图取消，这里先留一个空壳；W6 改成按学习列（上层单子 / 中层判定 + 外部导入）。
// 另有“没按推荐走的时候”，只读，给学习者自己看。
import { api } from '../../api.ts';
import { useLoad } from '../../hooks/use-load.ts';
import { deviationLine } from '../../longterm-model.ts';
import { usePanel } from '../../panel.ts';
import { W } from '../../wording.ts';
import { Card, Loading, Section, Time } from '../evidence/parts.tsx';

/** 空壳：W6 做新的“我学会的”（按学习列）。 */
export function LearnedPlaceholder() {
  return (
    <div className="text-muted-foreground text-sm" data-testid="learned-placeholder">
      {W.learnedPlaceholder}
    </div>
  );
}

export function DeviationsSection(props: { projectId?: string | undefined }) {
  const projectId = props.projectId;
  const r = useLoad(`deviations:${projectId ?? ''}`, () =>
    projectId !== undefined
      ? api.deviations(projectId)
      : Promise.resolve({ mainSessionId: '', deviations: [] }),
  );
  const panel = usePanel();
  const records = [...(r.data?.deviations ?? [])].reverse();
  return (
    <Section title={W.deviations} hint={W.deviationsHint}>
      <div data-testid="deviations" className="flex flex-col gap-1.5">
        {!r.data ? (
          <Loading error={r.error} />
        ) : records.length === 0 ? (
          <div className="text-muted-foreground text-sm">{W.deviationsNone}</div>
        ) : (
          records.map((d) => (
            <Card key={`${d.at}|${d.kind}|${d.loopId ?? ''}`} className="flex flex-col gap-1">
              <span>{deviationLine(d)}</span>
              <span className="flex flex-wrap items-center gap-3">
                <Time at={d.at} />
                {d.loopId !== undefined && (
                  <button
                    type="button"
                    className="text-primary text-xs hover:underline"
                    onClick={() =>
                      d.loopId !== undefined && panel.show({ kind: 'loop', loopId: d.loopId })
                    }
                  >
                    {W.seeThatLearning}
                  </button>
                )}
              </span>
            </Card>
          ))
        )}
      </div>
    </Section>
  );
}
