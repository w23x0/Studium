// W14 上下文、额度与使用情况在界面上的叫法。wording.ts 的 W.usage 指向这里（内部词的规矩同 wording.ts）。
import { formatTokens } from '../shared/usage.ts';

export const WU = {
  context: (tokens: number) => `上下文约 ${formatTokens(tokens)}`,
  // ── 额度 ──
  quota: '额度',
  quotaNone: '暂时拿不到',
  quotaLoading: '正在问…',
  quotaUsed: (percent: number) => `已用 ${String(Math.round(percent))}%`,
  quotaResets: (when: string) => `${when} 重置`,
  quotaAsOf: (when: string) => `${when} 拿到的`,
  // ── 使用情况面板 ──
  open: '使用情况',
  title: '使用情况',
  thisProject: '此项目',
  threads: '讨论串',
  tokens: 'Token',
  cacheHit: '缓存命中',
  mainShare: '主对话占比',
  input: '输入',
  output: '输出',
  cacheWrite: '缓存写入',
  cacheRead: '缓存读取',
  threadCount: '讨论串数',
  total: '总计',
  share: '占比',
  sortShare: '占比',
  sortRecent: '最近',
  showMore: (n: number) => `再显示 ${String(n)} 个`,
  empty: '这个项目还没有用量。',
  loading: '正在算…',
};
