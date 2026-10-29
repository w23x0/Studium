// 阶段复盘的对话认得出来：界面上不再给复盘入口（10-29），讨论串与对话里认出它们好藏起来。
import { useMemo } from 'react';
import { api } from '../../api.ts';
import { useLoad } from '../../hooks/use-load.ts';

/** 这个项目的阶段复盘对话。 */
export function useReviewIds(projectId: string | undefined): ReadonlySet<string> {
  const r = useLoad(`reviews:${projectId ?? ''}`, () =>
    projectId !== undefined ? api.reviews(projectId) : Promise.resolve({ reviews: [] }),
  );
  const data = r.data;
  return useMemo(() => new Set((data?.reviews ?? []).map((x) => x.sessionId)), [data]);
}
