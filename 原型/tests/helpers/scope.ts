// 资料范围（批 3a）的测试夹具：多层书库、笔记目录、从项目主对话取工具。
import { cp, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { SAMPLE_DIR } from '../../src/core/app.ts';
import type { App } from '../../src/core/app.ts';
import type { ToolSpec } from '../../src/core/model/port.ts';
import { makeLibrary, SAMPLE_BOOK, SECOND_BOOK } from './library.ts';
import { tempDir } from './tmp.ts';

export const PHYSICS = '大学物理/力学';
export const ALGEBRA = '线性代数';

/** 书库根下有学科目录再到书：大学物理/力学/力学入门样例、线性代数/线性代数小样 。 */
export async function makeNestedLibrary(): Promise<string> {
  const flat = await makeLibrary();
  const root = await tempDir();
  await mkdir(join(root, PHYSICS), { recursive: true });
  await mkdir(join(root, ALGEBRA), { recursive: true });
  await cp(join(SAMPLE_DIR, '书库', SAMPLE_BOOK), join(root, PHYSICS, SAMPLE_BOOK), {
    recursive: true,
  });
  await cp(join(flat, SECOND_BOOK), join(root, ALGEBRA, SECOND_BOOK), { recursive: true });
  return root;
}

/** 笔记目录：两个文件（一个有标题、代码块、图片引用，一个没有标题）+ 一个不收的 txt。 */
export async function makeNotesDir(): Promise<{ dir: string; file1: string; file2: string }> {
  const parent = await tempDir();
  const dir = join(parent, '线性代数笔记');
  await mkdir(join(dir, 'img'), { recursive: true });
  await writeFile(join(dir, 'img', 'a.png'), Buffer.from('not-really-a-png'));
  await writeFile(join(dir, 'b.png'), Buffer.from('also-not-a-png'));
  const file1 = join(dir, '01向量.md');
  await writeFile(
    file1,
    [
      '开头随手写的一句话',
      '',
      '# 向量',
      '',
      '向量可以相加，也可以数乘。',
      '![示意](img/a.png)',
      '',
      '## 线性组合',
      '',
      '```',
      '# 这是代码块里的井号，不是标题',
      '```',
      '线性组合就是数乘之后再相加。![[b.png]] ![[丢了.png]]',
      '',
      '#### 更深的标题不切开',
      '深一点的内容',
      '',
    ].join('\n'),
  );
  const file2 = join(dir, '02矩阵.md');
  await writeFile(file2, '矩阵乘向量，就是列的线性组合。\n没有任何标题。\n');
  await writeFile(join(dir, '附件.txt'), '不是笔记');
  return { dir, file1, file2 };
}

/** 从某个会话（项目主对话 id 也行）取一类会话的工具。 */
export function toolOf(
  app: App,
  kind: 'loop' | 'm05' | 'talk' | 'guard',
  sessionId: string,
  name: string,
): ToolSpec {
  const t = app.studium
    .kind(kind)
    .tools(sessionId)
    .find((x) => x.name === name);
  if (!t) throw new Error(`${kind} 没有工具 ${name}`);
  return t;
}
