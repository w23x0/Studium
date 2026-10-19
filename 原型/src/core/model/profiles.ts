// 模型与思考强度按会话类分开配：配置项，不全局一个（`docs/设计/实现选型.md`）。
import { CONVERSATION_KINDS, type ConversationKind } from '../../shared/records.ts';

export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export interface Profile {
  /** 不填用 SDK 默认模型（具体模型实现期按基准定）。 */
  model?: string;
  /** 不填用 SDK 默认强度。 */
  effort?: Effort;
}

export type Profiles = Partial<Record<ConversationKind, Profile>>;

/** 默认：主对话低强度；畅谈、学习对话、守卫、导航、检索子代理、状态整理高强度；教法记录整理没规定，不设。 */
export const DEFAULT_PROFILES: Profiles = {
  main: { effort: 'low' },
  talk: { effort: 'high' },
  loop: { effort: 'high' },
  output: { effort: 'high' },
  guard: { effort: 'high' },
  nav: { effort: 'high' },
  retrieve: { effort: 'high' },
  state: { effort: 'high' },
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
    if (!(CONVERSATION_KINDS as readonly string[]).includes(kind)) {
      throw new Error(
        `STUDIUM_PROFILES 里没有这种会话类：${kind}（可用：${CONVERSATION_KINDS.join(' / ')}）`,
      );
    }
    const p = raw as Profile;
    if (p.effort !== undefined && !EFFORTS.includes(p.effort)) {
      throw new Error(`强度只能是 ${EFFORTS.join(' / ')}，收到 ${p.effort}`);
    }
    out[kind as ConversationKind] = { ...out[kind as ConversationKind], ...p };
  }
  return out;
}
