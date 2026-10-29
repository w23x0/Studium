// 新开的学习用哪种学习页（10-29 #74 试验）：竖流（主模型一个人管）或区域图（主模型 + 子代理 + 框架小模型）。
// 存在 `<数据>/ui/learn-page.json`，界面设置里切；只管之后新开的学习，开过的学习按它 session_opened 里记的跑。
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { LEARN_PAGE_MODES, type LearnPageMode } from '../shared/protocol.ts';
import { isNotFound } from './log/session-log.ts';

/** 没设过时用竖流。 */
const DEFAULT: LearnPageMode = 'stream';

export class LearnPageSetting {
  constructor(private readonly path: string) {}

  async get(): Promise<LearnPageMode> {
    let text: string;
    try {
      text = await readFile(this.path, 'utf8');
    } catch (err) {
      if (isNotFound(err)) return DEFAULT;
      throw err;
    }
    const v = (JSON.parse(text) as { mode?: unknown }).mode;
    return (LEARN_PAGE_MODES as readonly unknown[]).includes(v) ? (v as LearnPageMode) : DEFAULT;
  }

  async set(mode: LearnPageMode): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    const tmp = `${this.path}.${String(process.pid)}.tmp`;
    await writeFile(tmp, JSON.stringify({ mode }), 'utf8');
    await rename(tmp, this.path);
  }
}
