// 功能清单：核对每条（四个字段、id 不重复、没有旧叫法、验证指向存在的文件或存在的 npm 命令），再按结果刷新“状态”。
// `--check` 只核对、不跑测试：每个问题一行打到 stdout，有问题退出 1。不带参数时先核对（不过就退出 1），
// 再跑被引用的 vitest 测试文件（tests/… 与 src/…），按结果刷新 状态；e2e 与 npm run 条目的状态不动。
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';

const argv = process.argv.slice(2);
const CHECK_ONLY = argv.includes('--check');
const listAt = argv.indexOf('--list');
const listPath = listAt >= 0 ? (argv[listAt + 1] ?? '功能清单.json') : '功能清单.json';

const OLD = /M0[5-9]|M1[0-5]|闭环/;
/** 每条只能有这四个字段（按 UTF-16 排，和 Object.keys().sort() 一致）。 */
const FIELDS = ['id', '功能', '状态', '验证'];

/** “验证”里写到的测试文件路径。 */
function pathsIn(v) {
  return [...v.matchAll(/(?:tests|e2e|src)\/[^\s（）()，,；;]+?\.(?:test|spec)\.ts/g)].map(
    (m) => m[0],
  );
}

function scripts() {
  return Object.keys(JSON.parse(readFileSync('package.json', 'utf8')).scripts ?? {});
}

/** 核对清单，返回一行一个问题。 */
function check(list) {
  const problems = [];
  const ids = list.map((i) => i.id);
  for (const [n, x] of ids.entries()) {
    if (ids.indexOf(x) !== n) problems.push(`${x}：id 重复`);
  }
  const known = scripts();
  for (const item of list) {
    const keys = Object.keys(item).sort();
    if (keys.join(',') !== FIELDS.join(',')) {
      problems.push(`${item.id}：字段是 ${keys.join('、')}（应只有 ${FIELDS.join(' ')}）`);
    }
    if (OLD.test(JSON.stringify(item))) problems.push(`${item.id}：带旧叫法`);
    for (const p of pathsIn(item.验证)) {
      if (!existsSync(p)) problems.push(`${item.id}：${p} 不存在`);
    }
    const npm = /^npm run ([\w:-]+)/.exec(item.验证)?.[1];
    if (npm !== undefined && !known.includes(npm)) problems.push(`${item.id}：没有 npm run ${npm}`);
    if (pathsIn(item.验证).length === 0 && npm === undefined) {
      problems.push(`${item.id}：验证里没有测试文件也没有命令`);
    }
  }
  // 覆盖：tests/验收/ 里每个测试至少被一条引用
  const cited = new Set(list.flatMap((i) => pathsIn(i.验证)));
  for (const f of readdirSync('tests/验收').filter((x) => x.endsWith('.test.ts'))) {
    if (!cited.has(`tests/验收/${f}`)) problems.push(`tests/验收/${f}：没有条目`);
  }
  return problems;
}

const list = JSON.parse(readFileSync(listPath, 'utf8'));
const problems = check(list);
if (problems.length > 0) {
  for (const p of problems) console.log(p);
  process.exit(1);
}
if (CHECK_ONLY) {
  console.log(`${listPath}：${String(list.length)} 条都核过`);
  process.exit(0);
}

// 跑被引用的 vitest 测试文件（tests/… 与 src/…），按结果刷新“状态”
const files = [...new Set(list.flatMap((i) => pathsIn(i.验证)))].filter((p) =>
  /^(tests|src)\//.test(p),
);
const dir = mkdtempSync(join(tmpdir(), 'studium-features-'));
const out = join(dir, 'report.json');
spawnSync('npx', ['vitest', 'run', ...files, '--reporter', 'json', '--outputFile', out], {
  encoding: 'utf8',
});
const report = JSON.parse(readFileSync(out, 'utf8'));
rmSync(dir, { recursive: true, force: true });
// 报告里的文件路径是绝对路径，换成相对本目录的
const passed = new Set(
  report.testResults
    .filter((t) => t.status === 'passed')
    .map((t) => relative(process.cwd(), t.name)),
);
for (const item of list) {
  // e2e 与 npm run 条目不动：验证以 npm run 开头、或只指向 e2e 的跳过
  if (/^npm run /.test(item.验证)) continue;
  const ps = pathsIn(item.验证).filter((x) => /^(tests|src)\//.test(x));
  if (ps.length === 0) continue;
  item.状态 = ps.every((p) => passed.has(p)) ? '通过' : '未通过';
}
writeFileSync(listPath, `${JSON.stringify(list, null, 2)}\n`);
for (const item of list)
  console.log(`${item.状态 === '通过' ? '✓' : '✗'} ${item.id}：${item.状态}`);
