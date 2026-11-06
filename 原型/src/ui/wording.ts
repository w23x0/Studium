// 界面上给学习者看的叫法，统一放这里（以后改叫法只改这一处）。
// 内部词（出发点、子句、新点、M0x、M1x 等）不出现在这里的任何一句里（没有自动检查，改时自己留意）。
// 对照：右边注释是内部叫法，只给写代码的人看。
import { WS } from './wording-sidebar.ts';
import { WU } from './wording-usage.ts';

export const W = {
  /** 左栏、全部项目页、账号菜单与设置的叫法在 wording-sidebar.ts。 */
  sidebar: WS,
  /** 上下文、额度与使用情况（W14）的叫法在 wording-usage.ts。 */
  usage: WU,
  // ── 项目 ──
  projectHome: '项目页', // 项目页（Overview）
  projectChat: '项目对话', // 主对话
  /** 讨论串：项目对话右边一栏，列这个项目开出去的任务对话。 */
  threads: {
    title: '讨论串',
    show: '打开讨论串',
    close: '收起讨论串',
    open: '开着',
    ended: '已结束',
    empty: '还没开过。每次学习都会在这里列一条。',
    more: '更多',
    end: '结束',
    delete: '删除',
    deleteTitle: '删掉这个讨论串？',
    deleteHint: (title: string) =>
      `删掉「${title}」后它不再显示，之后的对话也读不到它。删了不能撤销。`,
    deleteGo: '删掉',
    cancel: '算了',
  },

  // ── 右侧面板 ──
  panelClose: '关上',
  panelSourceTitle: '出处',
  whereAmI: '现在在哪',
  // ── 对话页 ──
  mainWelcome: '想学什么？说一句就行。',
  panelBack: '返回',

  // ── 书里的原文（资料） ──
  materialsNav: '资料', // 资料浏览
  materialsEmpty: '还没有资料。',
  materialList: '资料',
  bookSections: (n: number) => `${String(n)} 节`,
  toc: '目录',
  noText: '（这一条没有单独的正文）',
  search: '在书里搜',
  searchPlaceholder: '搜书里的字句，词之间用空格隔开…',
  searchInBook: '只搜这本书',
  searchGo: '搜',
  searchFound: (n: number) => `找到 ${String(n)} 处`,
  searchShown: (n: number) => `，先列出前 ${String(n)} 处`,
  searchNone: '没搜到。换个说法，或少写几个词试试。',
  lineSpan: (from: number, to: number) =>
    to > from ? `第 ${String(from)}–${String(to)} 行` : `第 ${String(from)} 行`,

  // ── 回复里的书里出处 ──
  citation: '书里的出处',
  citationPending: '正在核对出处…',
  citationBad: '这个出处对不上',
  citationBadHint: '回复里写的出处在书里找不到对应的原文，下面是它写的位置和对不上的原因。',
  citationWritten: '回复里写的位置',
  citationCheckFailed: '没能核对这个出处：',

  // ── 输入框 ──
  dropHere: '松开，传进这个项目',
  send: '发送',
  close: '关上',

  // ── 资料范围 ──
  inProject: '项目资料', // 资料列表里的标记
  // ── 资料检索的范围 ──
  searchScopeProject: (n: number) => `在项目资料里搜（${String(n)} 份）`,
  searchScopeAll: '在全部资料里搜',
  searchAll: '查全部资料',

  // ── 上传与分流（工单 W9、W11） ──
  filesUploading: (n: number) => `正在传 ${String(n)} 个文件…`,
  routedTo: { 资料: '资料', 学过的: '学过的' } as const,
  rerouteTo: (to: string) => `改成${to}`,
  ownerIs: (o: string) => `归${o}`,
  ownerTo: (o: string) => `改归${o}`,
  ownerHint: '归学习者 = 所有项目都能读；归项目 = 只给这个项目读',
  filesSent: (n: number) => `收下了 ${String(n)} 份`,
  // ── 通用 ──
  loading: '正在读…',
  loadFailed: '没读到：',
} as const;
