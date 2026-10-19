// 测：功能清单与文档跟上——功能清单.json 每条“验证”指向存在的测试（或存在的 npm 命令），每个验收测试都有条目，不带旧叫法与“里程碑”；
// scripts/features.mjs --check 只核对不跑测试、缺文件时报错；旧施工记录（工作单.md、里程碑.md）删了；
// 原型/CLAUDE.md、样例/README.md、教学工具不带旧叫法。依据：工单 W7 §4.6–§4.8。
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { tempDir } from '../helpers/tmp.ts';

const ROOT = join(import.meta.dirname, '../..');
const OLD = /M0[5-9]|M1[0-5]|闭环/;
const W7_TESTS = [
  '会话种类改名',
  '状态与教法记录接口',
  '数据版本',
  '正本没有旧叫法',
  '功能清单与文档',
  '链路评测跟上新流程',
];

interface Item {
  id: string;
  功能: string;
  验证: string;
  状态: string;
}

function readList(): Item[] {
  return JSON.parse(readFileSync(join(ROOT, '功能清单.json'), 'utf8')) as Item[];
}

/** “验证”里写到的测试文件路径。 */
function pathsIn(v: string): string[] {
  return [...v.matchAll(/(?:tests|e2e|src)\/[^\s（）()，,；;]+?\.(?:test|spec)\.ts/g)].map(
    (m) => m[0],
  );
}

describe('功能清单', () => {
  it('每条四个字段、id 不重复、验证指向存在的文件或存在的 npm 命令、没有旧叫法', () => {
    const list = readList();
    const scripts = Object.keys(
      (JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as { scripts: object }).scripts,
    );
    const ids = list.map((i) => i.id);
    expect(
      ids.filter((x, i) => ids.indexOf(x) !== i),
      'id 重复',
    ).toEqual([]);
    const problems: string[] = [];
    for (const item of list) {
      const keys = Object.keys(item).sort();
      if (keys.join(',') !== ['id', '功能', '状态', '验证'].sort().join(',')) {
        problems.push(`${item.id}：字段是 ${keys.join('、')}（应只有 id 功能 验证 状态）`);
      }
      if (OLD.test(JSON.stringify(item))) problems.push(`${item.id}：带旧叫法`);
      const paths = pathsIn(item.验证);
      for (const p of paths)
        if (!existsSync(join(ROOT, p))) problems.push(`${item.id}：${p} 不存在`);
      const npm = /^npm run ([\w:-]+)/.exec(item.验证)?.[1];
      if (npm !== undefined && !scripts.includes(npm))
        problems.push(`${item.id}：没有 npm run ${npm}`);
      if (paths.length === 0 && npm === undefined)
        problems.push(`${item.id}：验证里没有测试文件也没有命令`);
    }
    expect(problems, '功能清单的问题').toEqual([]);
  });

  it('tests/验收/ 里每个测试都有条目，本单的测试也在', () => {
    const referenced = new Set(readList().flatMap((i) => pathsIn(i.验证)));
    const files = readdirSync(join(ROOT, 'tests/验收'))
      .filter((f) => f.endsWith('.test.ts'))
      .map((f) => `tests/验收/${f}`);
    expect(
      files.filter((f) => !referenced.has(f)),
      '没有条目的验收测试',
    ).toEqual([]);
    for (const n of W7_TESTS) {
      expect(referenced.has(`tests/验收/${n}.test.ts`), `功能清单里应有 ${n}`).toBe(true);
    }
  });

  it('features.mjs --check 只核对：清单对时退出 0，有条目指向不存在的文件时退出 1 并列出来', async () => {
    const src = readFileSync(join(ROOT, 'scripts/features.mjs'), 'utf8');
    // 没有 --check 时直接判不过：否则 spawn 它会去跑整个验收目录（含本测试）
    expect(src.includes('--check'), 'features.mjs 应有 --check').toBe(true);
    if (!src.includes('--check')) return;
    const good = spawnSync('node', ['scripts/features.mjs', '--check'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    expect(good.status, `当前清单应通过核对：${good.stdout}${good.stderr}`).toBe(0);
    const bad = join(await tempDir(), 'list.json');
    await writeFile(
      bad,
      JSON.stringify([
        { id: '假条目', 功能: '不存在的', 验证: 'tests/验收/不存在的.test.ts', 状态: '未通过' },
      ]),
    );
    const r = spawnSync('node', ['scripts/features.mjs', '--check', '--list', bad], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    expect(r.status, '缺文件应退出 1').toBe(1);
    expect(`${r.stdout}${r.stderr}`, '列出缺的文件').toContain('tests/验收/不存在的.test.ts');
  });
});

describe('文档与旧施工记录', () => {
  it('工作单.md、里程碑.md 删了', () => {
    for (const f of ['工作单.md', '里程碑.md']) {
      expect(existsSync(join(ROOT, f)), `${f} 应已删`).toBe(false);
    }
  });

  it('原型/CLAUDE.md：没有旧叫法与 STUDIUM_M08，写了新种类名、沙盒目录与数据版本', () => {
    const md = readFileSync(join(ROOT, 'CLAUDE.md'), 'utf8');
    expect(md, '不带 M0x / M1x / 闭环').not.toMatch(OLD);
    for (const gone of ['STUDIUM_M08', '里程碑.md', '工作单.md', 'm09', 'm08']) {
      expect(md, `不再提 ${gone}`).not.toContain(gone);
    }
    for (const want of [
      'nav',
      'state',
      'pedagogy',
      'retrieve',
      '沙盒',
      'sandbox/',
      'data-version',
    ]) {
      expect(md, `应写到 ${want}`).toContain(want);
    }
  });

  it('样例/README.md 与教学工具正文不带旧叫法', () => {
    const sample = readFileSync(join(ROOT, '样例/README.md'), 'utf8');
    expect(sample, '样例说明不带旧叫法').not.toMatch(OLD);
    expect(sample, '样例说明不再提知识点样例').not.toContain('m08');
    const dir = join(ROOT, '教学工具');
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.md'))) {
      const body = readFileSync(join(dir, f), 'utf8')
        .split('\n')
        .filter((l) => !l.startsWith('- 来源'))
        .join('\n');
      expect(body, `教学工具/${f} 正文不带旧叫法（来源行除外）`).not.toMatch(OLD);
    }
  });
});
