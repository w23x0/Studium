// 地址里的“我在哪”（界面说明 §1.1）：刷新、浏览器后退都回到原处。口令在查询串里，页面位置放在 # 后面。
// #/projects 全部项目 · #/new 新建项目 · #/p/<项目> 项目页 · #/p/<项目>/c/<对话> 某个对话（主对话的 id 就是项目 id）。

export type Route =
  | { page: 'projects' }
  | { page: 'new' }
  | { page: 'overview'; projectId: string }
  | { page: 'chat'; projectId: string; current: string };

export function parseRoute(hash: string): Route | undefined {
  const parts = hash
    .replace(/^#\/?/, '')
    .split('/')
    .filter((p) => p !== '')
    .map((p) => decodeURIComponent(p));
  if (parts[0] === 'projects') return { page: 'projects' };
  if (parts[0] === 'new') return { page: 'new' };
  if (parts[0] === 'p' && parts[1] !== undefined) {
    if (parts[2] === 'c' && parts[3] !== undefined) {
      return { page: 'chat', projectId: parts[1], current: parts[3] };
    }
    return { page: 'overview', projectId: parts[1] };
  }
  return undefined;
}

export function formatRoute(r: Route): string {
  const e = encodeURIComponent;
  switch (r.page) {
    case 'projects':
      return '#/projects';
    case 'new':
      return '#/new';
    case 'overview':
      return `#/p/${e(r.projectId)}`;
    case 'chat':
      return `#/p/${e(r.projectId)}/c/${e(r.current)}`;
  }
}

export function sameRoute(a: Route, b: Route): boolean {
  return formatRoute(a) === formatRoute(b);
}
