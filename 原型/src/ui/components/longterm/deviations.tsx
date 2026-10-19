// “没按推荐走的时候”：路线偏差从已有记录现算（W3 的 GET /api/projects/:id/deviations），只读，
// 给学习者自己回头看；每条能跳到那次学习。不代表学得好不好。
import { api } from '../../api.ts';
import { useLoad } from '../../hooks/use-load.ts';
import { deviationLine } from '../../longterm-model.ts';
import { usePanel } from '../../panel.ts';
import { W } from '../../wording.ts';
import { Card, Loading, Section, Time } from '../evidence/parts.tsx';

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
