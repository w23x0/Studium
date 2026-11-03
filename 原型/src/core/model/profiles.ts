// 模型与思考强度按会话类分开配：配置项，不全局一个（`docs/设计/实现选型.md`）。
import { CONVERSATION_KINDS, type ConversationKind } from '../../shared/records.ts';

export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export interface Profile {
  /** 不填用 SDK 默认模型（具体模型实现期按基准定）。 */
  model?: string;
  /** 不填用 SDK 默认强度。 */
  effort?: Effort;
}

export type ProfileKey = ConversationKind;
/**
 * 旧配置里的两项（W10 的学习对话子代理、框架小模型，W12 随区域图学习页撤掉）：STUDIUM_PROFILES 里配了不报错、不起作用。
 */
const RETIRED_PROFILE_KEYS: readonly string[] = ['subagent', 'framework'];
const PROFILE_KEYS: readonly string[] = [...CONVERSATION_KINDS, ...RETIRED_PROFILE_KEYS];

export type Profiles = Partial<Record<ProfileKey, Profile>>;

/**
 * 默认：主对话低强度；找资料中等；谈方向、学习对话高强度；导入会话用 Sonnet、中等强度（W11 §4）。
 * 不再开的种类（守卫、导航、检索子代理、状态整理、教法记录整理、写产出、页面编辑员）不设；STUDIUM_PROFILES 里
 * 配了也不报错、不起作用。
 */
export const DEFAULT_PROFILES: Profiles = {
  main: { effort: 'low' },
  talk: { effort: 'high' },
  loop: { effort: 'high' },
  find: { effort: 'medium' },
  // 导入会话（W11 §4，试验）：把原件里不是纯文字的东西处理成别的会话能读的文字
  import: { model: 'sonnet', effort: 'medium' },
};

const EFFORTS: readonly string[] = ['low', 'medium', 'high', 'xhigh', 'max'];

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
    if (RETIRED_PROFILE_KEYS.includes(kind)) continue;
    const p = raw as Profile;
    if (p.effort !== undefined && !EFFORTS.includes(p.effort)) {
      throw new Error(`强度只能是 ${EFFORTS.join(' / ')}，收到 ${p.effort}`);
    }
    out[kind as ProfileKey] = { ...out[kind as ProfileKey], ...p };
  }
  return out;
}
