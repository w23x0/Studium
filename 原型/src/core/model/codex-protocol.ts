// 只校验适配器消费的字段；未知字段仍保留在原始通知里。依据 0.166.0 的 generate-json-schema。
import { z } from 'zod';
import type { QuotaSnapshot } from './port.ts';
import type { QuotaWindow } from '../../shared/usage.ts';

export const usageBreakdown = z.object({
  inputTokens: z.number(),
  cachedInputTokens: z.number(),
  cacheWriteInputTokens: z.number().default(0),
  outputTokens: z.number(),
});
export type CodexUsage = z.infer<typeof usageBreakdown>;
export const emptyUsage = (): CodexUsage => ({
  inputTokens: 0,
  cachedInputTokens: 0,
  cacheWriteInputTokens: 0,
  outputTokens: 0,
});
export const usageNotification = z.object({
  threadId: z.string(),
  turnId: z.string(),
  tokenUsage: z.object({
    total: usageBreakdown,
    last: usageBreakdown,
    modelContextWindow: z.number().nullish(),
  }),
});

export const sessionToken = z.object({
  version: z.literal(1),
  threadId: z.string(),
  total: usageBreakdown,
});

export const threadResponse = z.object({
  model: z.string(),
  thread: z.object({ id: z.string() }),
  instructionSources: z.array(z.string()).default([]),
});

export const modelList = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      model: z.string(),
      isDefault: z.boolean(),
      supportedReasoningEfforts: z.array(z.object({ reasoningEffort: z.string() })),
    }),
  ),
  nextCursor: z.string().nullish(),
});

export const item = z.looseObject({
  id: z.string(),
  type: z.string(),
  text: z.string().optional(),
  phase: z.string().nullish(),
  command: z.string().optional(),
  cwd: z.string().optional(),
  status: z.string().optional(),
  path: z.string().optional(),
  tool: z.string().optional(),
  arguments: z.unknown().optional(),
  changes: z.array(z.object({ path: z.string(), diff: z.string() })).optional(),
});
export type CodexItem = z.infer<typeof item>;
export const itemNotification = z.object({ threadId: z.string(), turnId: z.string(), item });
export const deltaNotification = z.object({
  threadId: z.string(),
  turnId: z.string(),
  itemId: z.string(),
  delta: z.string(),
});
export const turnNotification = z.object({
  threadId: z.string(),
  turn: z.object({
    id: z.string(),
    status: z.string(),
    error: z.object({ message: z.string() }).nullish(),
  }),
});
export const toolCall = z.object({
  threadId: z.string(),
  turnId: z.string(),
  callId: z.string(),
  tool: z.string(),
  namespace: z.string().nullish(),
  arguments: z.unknown(),
});

const quotaWindow = z.object({
  usedPercent: z.number(),
  windowDurationMins: z.number().nullish(),
  resetsAt: z.number().nullish(),
});
const quotaBucket = z.object({
  limitId: z.string().nullish(),
  limitName: z.string().nullish(),
  primary: quotaWindow.nullish(),
  secondary: quotaWindow.nullish(),
});
const quotaResponse = z.object({
  rateLimits: quotaBucket,
  rateLimitsByLimitId: z.record(z.string(), quotaBucket).nullish(),
});

export function codexQuota(value: unknown): QuotaSnapshot {
  const r = quotaResponse.parse(value);
  const buckets = r.rateLimitsByLimitId ?? { [r.rateLimits.limitId ?? 'codex']: r.rateLimits };
  const windows: QuotaWindow[] = [];
  for (const [key, bucket] of Object.entries(buckets)) {
    for (const name of ['primary', 'secondary'] as const) {
      const w = bucket[name];
      if (w === null || w === undefined) continue;
      const minutes = w.windowDurationMins;
      const duration =
        minutes === null || minutes === undefined
          ? name === 'primary'
            ? '短期'
            : '长期'
          : minutes % 1440 === 0
            ? `${minutes / 1440} 天`
            : minutes % 60 === 0
              ? `${minutes / 60} 小时`
              : `${minutes} 分钟`;
      windows.push({
        key: `${key}:${name}`,
        label: `${bucket.limitName ?? 'Codex'} ${duration}`,
        percent: Math.max(0, Math.min(100, w.usedPercent)),
        ...(w.resetsAt != null ? { resetsAt: new Date(w.resetsAt * 1000).toISOString() } : {}),
      });
    }
  }
  return { windows, at: new Date().toISOString() };
}
