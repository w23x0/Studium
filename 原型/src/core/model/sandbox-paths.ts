// 沙盒的路径规则（工单 W4 §5.1）。模型侧与记录里的 path 一律是虚拟路径：
// 工作区里的文件 = 相对工作区（`笔记.md`）；只读的 = `只读/<name>/<相对>`（按 name 最长前缀匹配）；
// 都不是 = 绝对路径原样。假模型与 SDK 适配器都用这里，不各写一套。
import { lstatSync, realpathSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import type { SandboxSpec } from './port.ts';

/** 只读区在虚拟路径里的前缀。 */
const READ_ONLY = '只读';

/** 这个只读条目是不是单个文件（以 `.md` 结尾的是文件，其余是目录）。 */
export function isReadOnlyFile(name: string): boolean {
  return name.endsWith('.md');
}

/** abs 在 dir 之内（含 dir 本身）。 */
function within(dir: string, abs: string): boolean {
  const rel = relative(dir, abs);
  return rel === '' || (rel !== '..' && !rel.startsWith('../') && !isAbsolute(rel));
}

/** 解开符号链接后的真实路径；还不存在的部分接在最近一层存在的上级后面。解不开的链接（悬空）当作哪儿都不在。 */
function real(p: string): string {
  let head = resolve(p);
  const tail: string[] = [];
  for (;;) {
    try {
      return join(realpathSync(head), ...tail.reverse());
    } catch {
      if (isLink(head)) return '/\0悬空的链接';
      const up = dirname(head);
      if (up === head) return resolve(p);
      tail.push(basename(head));
      head = up;
    }
  }
}

function isLink(p: string): boolean {
  try {
    return lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
}

/** 工作区之内、又不在工作区里自建的 `只读/` 之下（那里的虚拟路径会和只读区重名）。 */
function inWorkdir(sb: SandboxSpec, abs: string): boolean {
  const work = real(sb.workdir);
  return within(work, abs) && !within(join(work, READ_ONLY), abs);
}

function toPosix(p: string): string {
  return p.split('\\').join('/');
}

/** 虚拟 / 相对 / 绝对路径 → 绝对路径（`..` 规范化）。 */
export function resolveSandboxPath(sb: SandboxSpec, p: string): string {
  if (isAbsolute(p)) return resolve(p);
  const norm = toPosix(p).replace(/^\.\//, '');
  if (norm === READ_ONLY || norm.startsWith(`${READ_ONLY}/`)) {
    const rest = norm.slice(READ_ONLY.length).replace(/^\//, '');
    const hit = matchReadOnly(sb, rest);
    if (hit !== undefined) {
      const tail = rest.slice(hit.name.length).replace(/^\//, '');
      return tail === '' ? resolve(hit.path) : resolve(join(hit.path, tail));
    }
  }
  return resolve(join(sb.workdir, norm));
}

/** 绝对路径 → 虚拟路径（在工作区或某个只读区里）；都不是就原样返回绝对路径。 */
export function virtualPath(sb: SandboxSpec, abs: string): string {
  const p = resolve(abs);
  if (within(sb.workdir, p)) {
    const rel = toPosix(relative(sb.workdir, p));
    return rel === '' ? '.' : rel;
  }
  let best: { name: string; rel: string } | undefined;
  for (const e of sb.readOnly) {
    const rel = relative(e.path, p);
    if (rel !== '' && !within(e.path, p)) continue;
    if (best === undefined || e.name.length > best.name.length) {
      best = { name: e.name, rel: toPosix(rel) };
    }
  }
  if (best === undefined) return p;
  return best.rel === '' ? `${READ_ONLY}/${best.name}` : `${READ_ONLY}/${best.name}/${best.rel}`;
}

/** 能不能写：只在工作区之内（按解开链接后的真实路径）。 */
export function canWrite(sb: SandboxSpec, abs: string): boolean {
  return inWorkdir(sb, real(abs));
}

/** 能不能读：工作区之内，或某个只读目录 / 那个只读文件之内。 */
export function canRead(sb: SandboxSpec, abs: string): boolean {
  const p = real(abs);
  return inWorkdir(sb, p) || sb.readOnly.some((e) => within(real(e.path), p));
}

/** rest（虚拟路径里 `只读/` 之后的部分）落在哪个只读条目上；按 name 最长前缀匹配。 */
function matchReadOnly(sb: SandboxSpec, rest: string): { name: string; path: string } | undefined {
  let best: { name: string; path: string } | undefined;
  for (const e of sb.readOnly) {
    if (rest !== e.name && !rest.startsWith(`${e.name}/`)) continue;
    if (best === undefined || e.name.length > best.name.length) best = e;
  }
  return best;
}
