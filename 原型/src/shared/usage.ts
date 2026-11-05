// W14 上下文、额度与使用情况（11-05，#97）：核心↔界面的类型与 token 数的写法。
// 上下文 = 该会话最新一条 context_used；额度只放核心内存、不写正本；使用情况打开面板时从正本现算。
import type { ConversationKind, NumberedRecord } from './records.ts';

/** token 数一律写成 k / M / B（照 Claude 项目设置的写法；学习者说过 M 比“万”好懂）。 */
export function formatTokens(n: number): string {
  if (n < 1000) return String(Math.round(n));
  const [unit, div] = n >= 1e9 ? ['B', 1e9] : n >= 1e6 ? ['M', 1e6] : ['k', 1e3];
  const v = n / div;
  const s = v >= 100 ? String(Math.round(v)) : v.toFixed(1).replace(/\.0$/, '');
  return `${s}${unit}`;
}

/** 这个会话现在的上下文大小：最新一条 context_used；还没回过话 = undefined。 */
export function latestContext(records: readonly NumberedRecord[]): number | undefined {
  for (let i = records.length - 1; i >= 0; i--) {
    const r = records[i]?.record;
    if (r?.type === 'context_used') return r.tokens;
  }
  return undefined;
}

// ───────────── 额度（订阅各窗口的已用百分比） ─────────────

/** 一个额度窗口：5 小时、7 天、按模型的 7 天。 */
export interface QuotaWindow {
  /** 稳定的键（five_hour / seven_day / seven_day_opus / model:<名字> …）。 */
  key: string;
  /** 给人看的名字，如“5 小时”“7 天 Opus”。 */
  label: string;
  /** 已用百分比 0–100。 */
  percent: number;
  /** 什么时候重置（ISO）。 */
  resetsAt?: string;
}

export interface QuotaResponse {
  /** 模型接口有没有额度（别家没有时界面不显示这一行）。 */
  available: boolean;
  windows: QuotaWindow[];
  /** 最后一次拿到的时间；一次都没拿到 = 没有（界面写“暂时拿不到”）。 */
  at?: string;
}

// ───────────── 使用情况面板（本项目的 token） ─────────────

/** 四类 token。 */
export interface TokenParts {
  input: number;
  output: number;
  cacheWrite: number;
  cacheRead: number;
}

/** 一个会话（讨论串或主对话）的用量。 */
export interface UsageThread {
  sessionId: string;
  kind: ConversationKind;
  title: string;
  /** 出现过的模型（按用量多少排）。 */
  models: string[];
  /** 最后活动（没有就是开始时间）。 */
  at: string;
  parts: TokenParts;
}

/** 一个模型一列：四类 + 讨论串数。 */
export interface UsageModelColumn {
  model: string;
  parts: TokenParts;
  threads: number;
}

export interface UsageResponse {
  threads: UsageThread[];
  models: UsageModelColumn[];
  total: TokenParts;
}

export function tokenTotal(p: TokenParts): number {
  return p.input + p.output + p.cacheWrite + p.cacheRead;
}

/** 缓存命中 = 缓存读取 ÷（缓存读取 + 缓存写入 + 输入），不算输出；分母为 0 = undefined。 */
export function cacheHit(p: TokenParts): number | undefined {
  const d = p.cacheRead + p.cacheWrite + p.input;
  return d === 0 ? undefined : p.cacheRead / d;
}

/** 模型 id → 短名：claude-opus-5-5 → Opus 5.5（日期后缀去掉）；认不出原样。 */
export function modelLabel(id: string): string {
  const m = /^claude-([a-z]+)-([\d-]+?)(?:-\d{8})?$/.exec(id);
  if (m?.[1] === undefined || m[2] === undefined) return id;
  return `${m[1].charAt(0).toUpperCase()}${m[1].slice(1)} ${m[2].split('-').join('.')}`;
}
