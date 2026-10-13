// 左栏的界面操作（置顶 / 取消置顶 / 从列表删掉 / 改名）：存进只追加的 <数据>/ui/sidebar.jsonl，读时折叠出现状。
// “删掉”只是从列表里藏起来，对话与项目的数据都不动。项目改名不走这里：记成主对话里的 project_title（source = learner）。

/** 操作的对象：项目（= 主对话 id）或一条对话。 */
export type SidebarKind = 'project' | 'session';

export interface SidebarRef {
  kind: SidebarKind;
  id: string;
}

export type SidebarAction = 'pin' | 'unpin' | 'hide' | 'rename';

/** sidebar.jsonl 的一行。rename 只用于对话（项目改名记在主对话里）。 */
export interface SidebarEvent extends SidebarRef {
  at: string;
  action: SidebarAction;
  /** rename 时的新名字。 */
  title?: string;
}

/** 折叠后的现状。 */
export interface SidebarView {
  /** 置顶的，后置顶的在前。 */
  pinned: SidebarRef[];
  /** 从列表删掉（藏起来）的。 */
  hidden: SidebarRef[];
  /** 改过名的对话：对话 id → 新名字。 */
  titles: Record<string, string>;
}

/** POST /api/sidebar */
export interface SidebarActionRequest extends SidebarRef {
  action: SidebarAction;
  title?: string;
}

/** GET / POST /api/sidebar */
export interface SidebarResponse {
  sidebar: SidebarView;
}
