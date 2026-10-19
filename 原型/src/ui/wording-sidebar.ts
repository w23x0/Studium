// 左栏、全部项目页、账号菜单与设置在界面上的叫法。wording.ts 的 W.sidebar 指向这里（wording.test.ts 一起查内部词）。
// 右边注释是内部叫法，只给写代码的人看。

export const WS = {
  collapse: '收起侧栏',
  expand: '展开侧栏',
  search: '搜索',
  searchPlaceholder: '搜项目名或对话名…',
  searchNone: '没有找到',
  searchProjects: '项目',
  searchChats: '对话',
  newProject: '新建', // 现在 = 新建项目
  newProjectLong: '新建项目',
  projects: '项目', // 打开全部项目页
  allProjects: '全部项目',
  noProjects: '还没有项目。',
  pinned: '置顶',
  recents: '最近',
  noRecents: '还没有对话。',
  /** 最近里的时间分组。 */
  buckets: { today: '今天', yesterday: '昨天', week: '7 天内', earlier: '更早' } as const,
  /** 最近里各种对话的叫法（主对话的那条用项目对话）。 */
  chatKind: { talk: '谈话', loop: '学习', output: '写产出' } as const,
  lastActive: '最近活动',
  // ── ⋯ 菜单 ──
  more: '更多',
  rename: '重命名',
  pin: '置顶',
  unpin: '取消置顶',
  remove: '删除',
  renameTitle: '改个名字',
  renameSave: '保存',
  cancel: '取消',
  removeTitle: '从列表里删掉？',
  removeProjectHint: '这个项目和里面的对话会从左栏与项目列表里消失；学过的记录都还在，不会删。',
  removeChatHint: '这条对话会从左栏里消失；对话记录还在，在项目页里照样能打开。',
  removeGo: '删除',
  // ── 账号 ──
  account: '我',
  accountMenu: '账号',
  settings: '设置',
  language: '语言',
  chinese: '中文',
  logout: '退出登录',
  notYet: '还没做',
  devMode: '开发者模式',
  devModeHint: '打开后，右上角可以打开旁边的面板，看资料、记录、教法和外发内容。',
  // ── 项目页里的全部对话 ──
  projectChats: '这个项目里的对话',
} as const;
