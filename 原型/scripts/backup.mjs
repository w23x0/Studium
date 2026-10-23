// 备份数据目录：整份拷到 `<数据>-备份/<时间>/`。正本只追加，开着服务也能拷；派生索引与缓存不拷（能重建）。
import { cp } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const root = resolve(process.env.STUDIUM_DATA ?? 'var').replace(/[/\\]+$/, '');
const to = join(`${root}-备份`, new Date().toISOString().replace(/[:.]/g, '-'));
const skip = new Set(
  ['.lock', 'index.sqlite', 'index.sqlite-wal', 'index.sqlite-shm', 'cache'].map((n) =>
    join(root, n),
  ),
);
await cp(root, to, { recursive: true, filter: (p) => !skip.has(p) });
console.log(`已备份到 ${to}`);
