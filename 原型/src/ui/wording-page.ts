// 活页面在界面上的叫法（会话/学习对话.md §11）。右边注释是内部叫法，只给写代码的人看。

export const WP = {
  title: '页面',
  version: (n: number) => `第 ${String(n)} 版`,
  versions: '以前的版本',
  byEditor: '改了一次',
  byRollback: (from: number) => `退回到第 ${String(from)} 版`,
  editing: '正在改页面…',
  drawing: '正在画页面…',
  viewingOld: (n: number) => `在看第 ${String(n)} 版（只看，不算退回）`,
  backToNow: '回到现在',
  rollback: '退回到这一版',
  rollbackAsk: '为什么退回？（可以不选）',
  rollbackSkip: '不选，直接退回',
  rollbackCancel: '算了',
  rollingBack: '正在退回…',
  openPage: '看页面',
  backToChat: '回对话',
  rolledBackLine: (to: number, reason?: string) =>
    `你把页面退回到第 ${String(to)} 版${reason !== undefined ? `（${reason}）` : ''}`,
} as const;
