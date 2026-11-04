// 学习页在界面上的叫法（会话/学习对话.md §11）。右边注释是内部叫法，只给写代码的人看。

export const WP = {
  /** 页面上还没有东西（开场还在写）。 */
  starting: '马上开始…',
  cancel: '取消',
  /** 最后一屏之后有一轮没跑成（如额度用完）；notice = 服务交回的那句报错（不是模型的话）。 */
  failed: (notice?: string) =>
    notice !== undefined
      ? `这一轮没跑成（${notice}），可以再说一次。`
      : '这一轮没跑成，可以再说一次。',
  /** 收尾那一句（旧的区域图学习只读看时显示）。 */
  closingBlock: '收尾那一句',
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
  /** 改动标记（常驻，W12 §4.7）：文字改过、组件第 N 版；点开看以前的样子。 */
  editedMark: '改过',
  versionMark: (n: number) => `第 ${String(n)} 版`,
  versionN: (n: number) => `第 ${String(n)} 版`,
  versionNow: '现在',
  /** 文字里点名嵌的组件还没交上来。 */
  componentMissing: (name: string) => `（组件「${name}」还没做好）`,
  /** 学习结束后：再说话就重开（W12 §2）。 */
  reopenPlaceholder: '这次学习结束了；再说话就接着学…',
  /** 旧的区域图学习（W12 撤掉）只读看。 */
  oldGrid:
    '这次学习用的是旧的区域图页面，现在只读：文字按时间排，组件显示最后一版。要接着学，回项目里说。',
  /** 旧版开的学习对话（W10 §9 第 1 条）。 */
  oldLoop: '这次学习是旧版开的，只能看；要接着学，请回项目另开一次。',
  /** 旧数据里的退回（10-26 前）。 */
  rolledBackLine: (to: number, reason?: string) =>
    `你把页面退回到第 ${String(to)} 版${reason !== undefined ? `（${reason}）` : ''}`,
} as const;
