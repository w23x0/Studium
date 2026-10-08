import { describe, expect, it } from 'vitest';
import { prepareMath } from './math.ts';

describe('prepareMath', () => {
  it('\\( \\) 与 \\[ \\] 归一成 $ 与 $$', () => {
    expect(prepareMath('力 \\(F=ma\\) 与 \\[E=mc^2\\]', false)).toBe('力 $F=ma$ 与 $$E=mc^2$$');
  });

  it('代码里的内容不动', () => {
    expect(prepareMath('`\\(x\\)` 与 ```\n\\[y\\]\n```', false)).toBe(
      '`\\(x\\)` 与 ```\n\\[y\\]\n```',
    );
  });

  it('流式中没闭合的 $ 显示原文', () => {
    expect(prepareMath('已知 $F=m', true)).toBe('已知 \\$F=m');
    expect(prepareMath('已知 $$\\int_0^1', true)).toBe('已知 \\$\\$\\int_0^1');
  });

  it('流式中已闭合的公式照常渲染', () => {
    expect(prepareMath('已知 $F=ma$，所以', true)).toBe('已知 $F=ma$，所以');
  });

  it('流式中没闭合的 \\( 保留原文', () => {
    expect(prepareMath('已知 \\(F=m', true)).toBe('已知 \\\\(F=m');
  });

  it('写完后不做转义', () => {
    expect(prepareMath('价格 $5', false)).toBe('价格 $5');
  });

  it('转义的 \\$ 不算公式边界', () => {
    expect(prepareMath('\\$5 与 $x$', true)).toBe('\\$5 与 $x$');
  });
});
