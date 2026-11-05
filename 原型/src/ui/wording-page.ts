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
  // ── 竖流学习页（10-29 #74 试验）──
  /** 学习者选中页面上一段再说话时，输入框上方那条。 */
  quoting: (text: string) => `回在：『${text}』`,
  quotingComponent: (name: string) => `回在：组件「${name}」`,
  /** 大段删除折起来时那一行（11-05 #92）；n = 删掉的字数（不算空白）。 */
  removedFolded: (n: number) => `删掉了一段（${String(n)} 字），点开看`,
  removedFold: '收起删掉的这段',
  /** 学习者那句话下面：学习对话整理过的样子（W17），默认收着。 */
  tidiedShow: '看整理后的',
  tidiedHide: '收起整理后的',
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
  /** 不是竖流开的旧学习（区域图、W10 前）只读（W19 起在竖流里显示）。 */
  oldLoop: '这次学习是旧版开的，只能看：文字按时间排，组件显示最后一版。要接着学，回项目里说。',
  /** 旧数据里的退回（10-26 前）。 */
  rolledBackLine: (to: number, reason?: string) =>
    `你把页面退回到第 ${String(to)} 版${reason !== undefined ? `（${reason}）` : ''}`,
} as const;
