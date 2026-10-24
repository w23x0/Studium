// 模型写给程序的记录原文（守卫判断理由、方向理由、状态记录）在界面上显示前的一道整理（界面说明 §1.4）：
// 对学习者说“你”，不露内部编号。记录本身不改，只改显示。纯函数。

/** “学习者 / 他”→“你”；去掉 st-xxxxxxxx 这类内部编号。 */
export function forLearner(text: string): string {
  return (
    text
      .replace(/学习者/g, '你')
      // “他”单用时指学习者；“其他、他们、他人”等不动
      .replace(/(?<![其吉利])他(?![们人])/g, '你')
      // 内部编号：（st-1a2b3c4d，自述，…）→（自述，…）；单独出现的编号直接去掉
      .replace(/(（|\()\s*[a-z]{2,4}-[0-9a-f]{6,}\s*[，,、]\s*/g, '$1')
      .replace(/\s*[a-z]{2,4}-[0-9a-f]{6,}\s*/g, '')
  );
}

/** 出处小标：第 n 处用 ①②③…，超过 20 用 [n]。 */
export function refMark(n: number): string {
  return n >= 1 && n <= 20 ? String.fromCodePoint(0x2460 + n - 1) : `[${String(n)}]`;
}
