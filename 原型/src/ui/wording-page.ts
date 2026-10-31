// 学习页在界面上的叫法（会话/学习对话.md §11）。右边注释是内部叫法，只给写代码的人看。

export const WP = {
  /** 页面上还没做好的组件（占位）。 */
  making: '正在做…',
  /** 页面上还没有东西（开场还在写）。 */
  starting: '马上开始…',
  /** 主模型在写这一轮（等待时的一行）。 */
  writing: '正在写…',
  /** 学习者刚发的话（显示到主模型下一轮输出为止）。 */
  youSaid: '你刚说',
  /** 某一块下面回话。 */
  replyHere: '在这里回',
  replyingTo: (pointer: string) => `回在「${pointer}」下面`,
  cancel: '取消',
  /** 最后一屏之后有一轮没跑成（如额度用完）；notice = 服务交回的那句报错（不是模型的话）。 */
  failed: (notice?: string) =>
    notice !== undefined
      ? `这一轮没跑成（${notice}），可以再说一次。`
      : '这一轮没跑成，可以再说一次。',
  /** 主模型点名拿回的开场（程序推来的块，只显示单子）。 */
  openingBlock: '开场时的单子',
  /** 主模型点名拿回的收尾那一句（旧数据：守卫的收尾记录，显示整理的内容）。 */
  closingBlock: '收尾那一句',
  oldClosingBlock: '这次学到了什么（整理的内容，旧记录）',
  /** 收口：学习者点了“我觉得懂了”、学习对话还没写收尾那一句（界面说明 §2.6「收口时」）。 */
  closing: '在收尾…',
  /** 收口：收尾那一句到了，前面这几个字后接那一句。 */
  closedSaid: '收尾：',
  /** 旧数据：守卫写好了收尾记录（10-23 起守卫不把关，只说整理好了）。 */
  closed: '这次学到了什么已整理好',
  seeClosed: '看整理的内容',
  seeClosedSaid: '在记录里看',
  // ── 竖流学习页（10-29 #74 试验）──
  /** 学习者选中页面上一段再说话时，输入框上方那条。 */
  quoting: (text: string) => `回在：『${text}』`,
  quotingComponent: (name: string) => `回在：组件「${name}」`,
  /** 学习者的话前面：他是选中哪处说的。 */
  quotedLine: (text: string) => `『${text}』`,
  /** 组件上方的名字（点一下 = 就这个组件说话）。 */
  componentName: (name: string) => `组件「${name}」`,
  pickComponent: '就这个组件说',
  /** 学习者在组件上的操作（等回应的，如提交答案）。 */
  onComponent: (name: string) => `在「${name}」上`,
  /** 学习者最后一次说话之后主模型动过的块。 */
  marks: { new: '新', edited: '改过', moved: '挪过', back: '拿回' } as const,
  /** 设置里：新开的学习用哪种学习页。 */
  modeTitle: '学习页',
  modes: { stream: '竖流（主模型一个人管）', grid: '区域图（三方）' } as const,
  modeHint: '只管之后新开的学习',
  /** 旧版开的学习对话（W10 §9 第 1 条）。 */
  oldLoop: '这次学习是旧版开的，只能看；要接着学，请回项目另开一次。',
  /** 旧数据里的退回（10-26 前）。 */
  rolledBackLine: (to: number, reason?: string) =>
    `你把页面退回到第 ${String(to)} 版${reason !== undefined ? `（${reason}）` : ''}`,
} as const;
