// 个人笔记（W9 之前导入的）：当时按标题切成小节存进 <数据>/knowledge/notes/<id>/，和书一样可浏览、检索、引用。
// W9 起笔记从上传进“学过的”（外部导入，learned.ts），这里只剩读旧笔记：列表与笔记里的图片。
import { extname } from 'node:path';
import type { NoteSummary } from '../../shared/protocol.ts';
import type { Library, NoteMeta } from './library.ts';

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp']);

export class Notes {
  constructor(private readonly library: Library) {}

  /** 以前导入的笔记（新的在前）。 */
  async list(): Promise<NoteSummary[]> {
    const out: NoteSummary[] = [];
    for (const id of await this.library.books()) {
      const info = await this.library.info(id);
      if (info?.kind !== 'note' || info.meta === undefined) continue;
      out.push(summaryOf(info.meta));
    }
    return out.sort((a, b) => b.importedAt.localeCompare(a.importedAt));
  }

  /** 笔记里记下的图片 / 嵌入文件（只给记在 meta 里的、且是图片）；返回原件路径。 */
  async asset(book: string, ref: string): Promise<{ path: string; ext: string } | undefined> {
    const info = await this.library.info(book);
    const hit = info?.meta?.assets.find((a) => a.ref === ref && a.found);
    if (hit === undefined) return undefined;
    const ext = extname(hit.path).toLowerCase();
    return IMAGE_EXT.has(ext) ? { path: hit.path, ext } : undefined;
  }
}

function summaryOf(m: NoteMeta): NoteSummary {
  return {
    id: m.id,
    title: m.title,
    author: m.author,
    source: m.source,
    originalPath: m.originalPath,
    importedAt: m.importedAt,
    files: m.files.length,
    sections: m.files.reduce((n, f) => n + f.sections, 0),
    assets: m.assets.map((a) => ({ ref: a.ref, found: a.found, file: a.file, line: a.line })),
    ...(m.previous !== undefined ? { previous: m.previous } : {}),
    ...(m.skipped !== undefined ? { skipped: m.skipped } : {}),
  };
}
