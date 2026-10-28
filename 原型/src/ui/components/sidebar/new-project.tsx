// 新建项目（照 Claude 项目）：项目名由学习者自己起；想学什么可以先写一句，作为项目对话的第一句发出，然后进项目对话接着谈。
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '../../api.ts';
import { W } from '../../wording.ts';

const S = W.sidebar;

export function NewProject(props: {
  header: ReactNode;
  onCreated: (mainSessionId: string) => void;
  onError: (e: unknown) => void;
}) {
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const go = () => {
    const n = name.trim();
    const t = text.trim();
    if (n === '' || busy) return;
    setBusy(true);
    api
      .createProject(n)
      .then(async (r) => {
        // 项目已经建好：第一句没发出去也进项目对话（报错），不留在这页让人再点一次又建一个
        if (t !== '') {
          try {
            await api.send(r.mainSessionId, t);
          } catch (e) {
            props.onError(e);
          }
        }
        props.onCreated(r.mainSessionId);
      })
      .catch((e: unknown) => {
        setBusy(false);
        props.onError(e);
      });
  };
  return (
    <div data-testid="new-project" className="flex h-full flex-col">
      {props.header}
      <div className="flex flex-1 flex-col items-center justify-center px-4 pb-24">
        <form
          className="flex w-full max-w-xl flex-col gap-4 text-sm"
          onSubmit={(e) => {
            e.preventDefault();
            go();
          }}
        >
          <h1 className="font-serif text-2xl">{S.newProjectLong}</h1>
          <label className="flex flex-col gap-1.5">
            <span className="text-muted-foreground">{S.newName}</span>
            <input
              autoFocus
              data-testid="new-project-name"
              placeholder={S.newNamePlaceholder}
              className="bg-card focus:border-foreground/30 rounded-xl border px-3 py-2 text-[0.95rem] outline-none"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-muted-foreground">{S.newAsk}</span>
            <textarea
              data-testid="new-project-input"
              rows={3}
              placeholder={S.newPlaceholder}
              className="bg-card focus:border-foreground/30 max-h-60 min-h-16 resize-none rounded-xl border px-3 py-2 text-[0.95rem] outline-none"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  go();
                }
              }}
            />
          </label>
          <Button type="submit" className="self-end" disabled={busy || name.trim() === ''}>
            {S.newGo}
          </Button>
        </form>
      </div>
    </div>
  );
}
