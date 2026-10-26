// 活页面在界面上的叫法（会话/学习对话.md §11）。右边注释是内部叫法，只给写代码的人看。

export const WP = {
  title: '页面',
  version: (n: number) => `第 ${String(n)} 版`,
  versions: '以前的版本',
  byEditor: '改了一次',
  /** 旧数据：10-26 前退回过的版本。 */
  byRollback: (from: number) => `退回到第 ${String(from)} 版`,
  editing: '正在改页面…',
  drawing: '正在画页面…',
  viewingOld: (n: number) => `在看第 ${String(n)} 版（只看）`,
  backToNow: '回到现在',
  openPage: '看页面',
  agentReturned: (text: string) => `改页面：${text}`,
  backToChat: '回对话',
  /** 旧数据里的退回。 */
  rolledBackLine: (to: number, reason?: string) =>
    `你把页面退回到第 ${String(to)} 版${reason !== undefined ? `（${reason}）` : ''}`,
} as const;
