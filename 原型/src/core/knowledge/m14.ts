// M14 知识产出物存放处（M14 审查单）：学习者自己的产出物对象、版本链、相关文献、“写产出”对话的绑定。
// 每类一个只追加的 JSONL，永不改写；每次保存 = 新版本。
import { join } from 'node:path';
import type { LiteratureEntry, OutputObject, OutputTask, OutputVersion } from '../../shared/m14.ts';
import { appendJsonl, readJsonl } from './jsonl.ts';

export class M14 {
  /** 写入排队：同一产出物的版本号靠它保证连续、不重。 */
  private chain: Promise<unknown> = Promise.resolve();

  private constructor(
    private readonly dir: string,
    private readonly outputs: OutputObject[],
    private readonly versions: OutputVersion[],
    private readonly literature: LiteratureEntry[],
    private readonly tasks: OutputTask[],
  ) {}

  static async load(dir: string): Promise<M14> {
    return new M14(
      dir,
      await readJsonl<OutputObject>(join(dir, 'outputs.jsonl')),
      await readJsonl<OutputVersion>(join(dir, 'versions.jsonl')),
      await readJsonl<LiteratureEntry>(join(dir, 'literature.jsonl')),
      await readJsonl<OutputTask>(join(dir, 'tasks.jsonl')),
    );
  }

  /** 排在前面的写完再写（失败不挡后面的）。 */
  private exclusive<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.chain.then(fn);
    // 失败已经经 run 交给了调用方；这里只是让队列别断，所以把失败转成 undefined
    this.chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  // ───────────── 产出物 ─────────────

  addOutput(o: OutputObject): Promise<void> {
    return this.exclusive(async () => {
      await appendJsonl(join(this.dir, 'outputs.jsonl'), o);
      this.outputs.push(o);
    });
  }

  output(id: string): OutputObject | undefined {
    return this.outputs.find((o) => o.id === id);
  }

  outputsOf(project: string): OutputObject[] {
    return this.outputs.filter((o) => o.project === project);
  }

  // ───────────── 版本 ─────────────

  /** 追加新版本：版本号由这里按当前最新 +1 给出；base 给了而不是当前最新版就拒绝。 */
  addVersion(
    v: Omit<OutputVersion, 'n'>,
    base?: number,
  ): Promise<{ ok: true; version: OutputVersion } | { ok: false; latest: number }> {
    return this.exclusive(async () => {
      const latest = this.latest(v.output)?.n ?? 0;
      if (base !== undefined && base !== latest) return { ok: false as const, latest };
      const row: OutputVersion = { ...v, n: latest + 1 };
      await appendJsonl(join(this.dir, 'versions.jsonl'), row);
      this.versions.push(row);
      return { ok: true as const, version: row };
    });
  }

  versionsOf(output: string): OutputVersion[] {
    return this.versions.filter((v) => v.output === output).sort((a, b) => a.n - b.n);
  }

  version(output: string, n: number): OutputVersion | undefined {
    return this.versions.find((v) => v.output === output && v.n === n);
  }

  latest(output: string): OutputVersion | undefined {
    return this.versionsOf(output).at(-1);
  }

  // ───────────── 文献、候选、对话绑定 ─────────────

  addLiterature(e: LiteratureEntry): Promise<void> {
    return this.exclusive(async () => {
      await appendJsonl(join(this.dir, 'literature.jsonl'), e);
      this.literature.push(e);
    });
  }

  literatureOf(output: string): LiteratureEntry[] {
    return this.literature.filter((e) => e.output === output);
  }

  bindTask(t: OutputTask): Promise<void> {
    return this.exclusive(async () => {
      await appendJsonl(join(this.dir, 'tasks.jsonl'), t);
      this.tasks.push(t);
    });
  }

  tasksOf(output: string): OutputTask[] {
    return this.tasks.filter((t) => t.output === output);
  }

  taskOf(sessionId: string): OutputTask | undefined {
    return this.tasks.find((t) => t.sessionId === sessionId);
  }
}
