// M08 对象引用标记（M14 产出物正文里引 M08 的点 / 子句）。与教材出处标记（citation.ts）并用，核心与界面共用这一个格式定义。
// 形态：【知识点|点 id】、【子句|子句 id】，如 【知识点|p-displacement】 【子句|c-avgv-from-disp】。
// 竖线用半角 | 或全角 ｜ 都认；括号是全角。id 照 M08 工具给的写。

export type ObjectRefKind = 'point' | 'clause';

export interface ObjectRef {
  kind: ObjectRefKind;
  id: string;
}

export interface ObjectRefMatch extends ObjectRef {
  /** 正文里的原文（含括号）。 */
  raw: string;
  start: number;
  end: number;
}

const OBJECT_RE = /【(知识点|子句)[|｜]\s*([^|｜】\s]+)\s*】/g;

export function formatObjectRef(ref: ObjectRef): string {
  if (/[|｜】\s]/.test(ref.id) || ref.id === '') {
    throw new Error('id 里有竖线、右括号或空白，没法写成引用标记');
  }
  return `【${ref.kind === 'point' ? '知识点' : '子句'}|${ref.id}】`;
}

/** 找出文本里所有 M08 对象引用标记，按出现顺序。 */
export function parseObjectRefs(text: string): ObjectRefMatch[] {
  const out: ObjectRefMatch[] = [];
  for (const m of text.matchAll(OBJECT_RE)) {
    const id = m[2];
    if (id === undefined) continue;
    out.push({
      kind: m[1] === '知识点' ? 'point' : 'clause',
      id,
      raw: m[0],
      start: m.index,
      end: m.index + m[0].length,
    });
  }
  return out;
}
