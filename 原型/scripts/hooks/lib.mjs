// Claude Code hooks 共用：读 stdin 的 JSON，判断路径是否在原型目录里。
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const APP_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export async function readInput() {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  return raw === '' ? {} : JSON.parse(raw);
}

/** 返回相对原型目录的路径；不在原型目录里返回 undefined。 */
export function inApp(path) {
  if (typeof path !== 'string' || path === '') return undefined;
  const rel = relative(APP_DIR, resolve(path));
  if (rel.startsWith('..') || rel.startsWith('node_modules')) return undefined;
  return rel;
}
