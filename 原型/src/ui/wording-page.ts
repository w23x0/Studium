// 学习页在界面上的叫法（会话/学习对话.md §11）。右边注释是内部叫法，只给写代码的人看。

export const WP = {
  /** 屏幕上还没做好的组件（占位）。 */
  making: '正在做…',
  /** 看以前的屏幕。 */
  history: '以前的屏幕',
  screenAt: (n: number, at: string) => `第 ${String(n)} 屏 · ${at}`,
  viewingOld: (n: number) => `在看第 ${String(n)} 屏（只看）`,
  backToNow: '回到现在',
  /** 还没有第一屏（开场还在写）。 */
  starting: '马上开始…',
  /** 主模型在写这一轮（等待时的一行）。 */
  writing: '正在写…',
  /** 学习者刚发的话（显示到主模型下一轮输出为止）。 */
  youSaid: '你刚说',
  /** 某一块下面回话。 */
  replyHere: '在这里回',
  replyingTo: (pointer: string) => `回在「${pointer}」下面`,
  cancel: '取消',
  /** 最后一屏之后有一轮没跑成（如额度用完）。 */
  failed: '这一轮没跑成，可以再说一次。',
  /** 收口：申请之后、守卫写好之前（界面说明 §2.6「收口时」）。 */
  closing: '正在整理这次学到了什么…',
  /** 收口：守卫写好了（10-23 起守卫不把关，只说整理好了）。 */
  closed: '这次学到了什么已整理好',
  seeClosed: '看整理的内容',
  /** 旧版开的学习对话（W10 §9 第 1 条）。 */
  oldLoop: '这次学习是旧版开的，只能看；要接着学，请回项目另开一次。',
  /** 旧数据里的退回（10-26 前）。 */
  rolledBackLine: (to: number, reason?: string) =>
    `你把页面退回到第 ${String(to)} 版${reason !== undefined ? `（${reason}）` : ''}`,
} as const;
