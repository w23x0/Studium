// 状态回看（批 10b，M15:42）：把学习者自己的状态记录按时间排成时间轴，每条带依据（Evidence.state 已给）、
// 整理出它的那一轮判的阶段、和学习者补的“我的解释”。只读视图；解释另存 M15 的 explanations.jsonl（只追加）。
import type { StateTimelineResponse } from '../shared/protocol.ts';
import type { Evidence } from './evidence.ts';
import type { M15 } from './knowledge/m15.ts';

export class Lookback {
  constructor(private readonly d: { evidence: Evidence; m15: M15; now?: () => Date }) {}

  async timeline(): Promise<StateTimelineResponse> {
    const { records } = await this.d.evidence.state();
    const pages = this.d.m15.allPages();
    const stageOf = new Map(pages.map((p) => [p.m15SessionId, p.stage]));
    return {
      generatedAt: (this.d.now?.() ?? new Date()).toISOString(),
      entries: [...records]
        .sort((a, b) => a.at.localeCompare(b.at))
        .map((record) => {
          const stage = stageOf.get(record.m15SessionId);
          return {
            record,
            ...(stage !== undefined ? { stage } : {}),
            explanations: this.d.m15.explanationsFor(record.id),
          };
        }),
      stages: pages.map((p) => ({ at: p.at, stage: p.stage, basisSpan: p.basisSpan })),
    };
  }
}
