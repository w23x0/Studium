// 插入公式：可视化公式编辑（MathLive，用时才加载）+ 同步的 LaTeX 写法；插入为 $…$ 或 $$…$$。
// MathLive 用 KaTeX 的字体（KaTeX 的样式已随消息渲染加载），所以不让它另取字体、不放按键声。
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { W } from '@/wording';
import { Modal } from './modal';
import { TeX } from './math-preview';

interface MathField extends HTMLElement {
  value: string;
}

export function FormulaDialog(props: {
  onInsert: (latex: string, display: boolean) => void;
  onClose: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const field = useRef<MathField | undefined>(undefined);
  const [latex, setLatex] = useState('');
  const [display, setDisplay] = useState(false);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');

  useEffect(() => {
    let alive = true;
    import('mathlive')
      .then(({ MathfieldElement }) => {
        const where = host.current;
        if (!alive || where === null) return;
        MathfieldElement.fontsDirectory = null;
        MathfieldElement.soundsDirectory = null;
        const el = new MathfieldElement();
        el.style.width = '100%';
        el.style.fontSize = '1.4rem';
        el.addEventListener('input', () => setLatex(el.value));
        where.appendChild(el);
        field.current = el;
        setState('ready');
        el.focus();
      })
      .catch((err: unknown) => {
        console.error('公式编辑器加载失败：', err);
        if (alive) setState('failed');
      });
    return () => {
      alive = false;
      field.current?.remove();
      field.current = undefined;
    };
  }, []);

  const editSource = (v: string) => {
    setLatex(v);
    const el = field.current;
    if (el !== undefined && el.value !== v) el.value = v;
  };

  const insert = () => {
    props.onInsert(latex, display);
  };

  return (
    <Modal
      onClose={props.onClose}
      label={W.formula}
      className="flex w-[min(40rem,95vw)] flex-col gap-3"
    >
      <h2 className="font-serif text-lg">{W.formula}</h2>
      {state === 'loading' && <p className="text-muted-foreground text-sm">{W.formulaLoading}</p>}
      <div
        ref={host}
        data-testid="formula-field"
        className={state === 'ready' ? 'rounded-lg border p-2' : 'hidden'}
      />
      {state === 'ready' && <p className="text-muted-foreground text-xs">{W.formulaHint}</p>}
      {state === 'failed' && <p className="text-muted-foreground text-sm">{W.formulaFallback}</p>}
      <label className="flex flex-col gap-1 text-xs">
        <span className="text-muted-foreground">{W.formulaSource}</span>
        <textarea
          value={latex}
          onChange={(e) => editSource(e.target.value)}
          rows={2}
          spellCheck={false}
          className="bg-muted/40 rounded-md border px-2 py-1 font-mono text-sm outline-none"
        />
      </label>
      {state === 'failed' && latex.trim() !== '' && (
        <div className="rounded-lg border p-2">
          <TeX tex={latex} display />
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1 text-sm">
          <Button
            size="sm"
            variant={display ? 'ghost' : 'secondary'}
            onClick={() => setDisplay(false)}
          >
            {W.formulaInline}
          </Button>
          <Button
            size="sm"
            variant={display ? 'secondary' : 'ghost'}
            onClick={() => setDisplay(true)}
          >
            {W.formulaDisplay}
          </Button>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={props.onClose}>
            {W.formulaCancel}
          </Button>
          <Button size="sm" disabled={latex.trim() === ''} onClick={insert}>
            {W.formulaInsert}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
