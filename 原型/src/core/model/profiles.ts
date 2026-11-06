// 模型与思考强度按会话类分开配：配置项，不全局一个（`docs/设计/实现选型.md`）。
import { CONVERSATION_KINDS, type ConversationKind } from '../../shared/records.ts';

export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export interface Profile {
  /** 不填用 SDK 默认模型（具体模型实现期按基准定）。 */
  model?: string;
  /** 不填用 SDK 默认强度。 */
  effort?: string;
}

export type ProfileKey = ConversationKind;
const PROFILE_KEYS: readonly string[] = CONVERSATION_KINDS;

export type Profiles = Partial<Record<ProfileKey, Profile>>;

/**
 * 默认：主对话 Opus、低强度；学习对话 Opus、中等强度；导入会话用 Sonnet、中等强度（W11 §4）。
 */
export const DEFAULT_PROFILES: Profiles = {
  main: { model: 'opus', effort: 'low' },
  // 学习对话固定 Opus（W15）：第一步“这一次学什么”全靠它判断；不写时随账号默认，历次 Opus、Sonnet 混着来
  loop: { model: 'opus', effort: 'medium' },
  // 导入会话（W11 §4，试验）：把原件里不是纯文字的东西处理成别的会话能读的文字
  import: { model: 'sonnet', effort: 'medium' },
};

/** Codex 的模型由账号返回的默认值或启动配置决定，不继承 Claude 的别名。 */
export const CODEX_PROFILES: Profiles = {
  main: { effort: 'low' },
  loop: { effort: 'medium' },
  import: { effort: 'medium' },
};

/** 在默认之上叠加覆盖（如环境变量 STUDIUM_PROFILES 的 JSON）；写错的直接报错。 */
export function mergeProfiles(overrides: unknown, base: Profiles = DEFAULT_PROFILES): Profiles {
  if (overrides === undefined) return base;
  if (typeof overrides !== 'object' || overrides === null || Array.isArray(overrides)) {
    throw new Error('STUDIUM_PROFILES 要是 JSON 对象，如 {"loop":{"effort":"max"}}');
  }
  const out: Profiles = { ...base };
  for (const [kind, raw] of Object.entries(overrides)) {
    if (!PROFILE_KEYS.includes(kind)) {
      throw new Error(
        `STUDIUM_PROFILES 里没有这一项：${kind}（可用：${PROFILE_KEYS.join(' / ')}）`,
      );
    }
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      throw new Error(`STUDIUM_PROFILES.${kind} 要是包含 model / effort 的对象`);
    }
    const p = raw as Profile;
    for (const field of ['model', 'effort'] as const) {
      if (p[field] !== undefined && (typeof p[field] !== 'string' || p[field].trim() === '')) {
        throw new Error(`STUDIUM_PROFILES.${kind}.${field} 要是非空字符串`);
      }
    }
    out[kind as ProfileKey] = { ...out[kind as ProfileKey], ...p };
  }
  return out;
}
