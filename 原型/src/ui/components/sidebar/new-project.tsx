// 新建项目：先问一句想学什么（界面说明 §3），这句作为项目对话的第一句发出，然后进项目对话接着谈。
import { useState, type ReactNode } from 'react';
import { ArrowUpIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '../../api.ts';
import { W } from '../../wording.ts';

const S = W.sidebar;

/** 项目名先用这句话的开头（谈定方向后会改成方向的名字）。 */
function draftTitle(text: string): string {
  const first = text.trim().split(/[。！？!?\n]/)[0] ?? '';
  return first.length > 18 ? `${first.slice(0, 18)}…` : first;
}

export function NewProject(props: {
  header: ReactNode;
  onCreated: (mainSessionId: string) => void;
  onError: (e: unknown) => void;
}) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const go = () => {
    const t = text.trim();
    if (t === '' || busy) return;
    setBusy(true);
    api
      .createProject(draftTitle(t))
      .then(async (r) => {
        // 项目已经建好：第一句没发出去也进项目对话（报错），不留在这页让人再点一次又建一个
        try {
          await api.send(r.mainSessionId, t);
        } catch (e) {
          props.onError(e);
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
        <div className="flex w-full max-w-xl flex-col gap-4">
          <h1 className="font-serif text-center text-2xl">{S.newAsk}</h1>
          <p className="text-muted-foreground text-center text-sm">{S.newHint}</p>
          <form
            className="bg-card focus-within:border-foreground/30 flex items-end gap-2 rounded-2xl border p-3 shadow-xs"
            onSubmit={(e) => {
              e.preventDefault();
              go();
            }}
          >
            <textarea
              autoFocus
              data-testid="new-project-input"
              aria-label={S.newAsk}
              rows={3}
              placeholder={S.newPlaceholder}
              className="max-h-60 min-h-16 flex-1 resize-none bg-transparent text-[0.95rem] outline-none"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  go();
                }
              }}
            />
            <Button
              type="submit"
              size="icon"
              aria-label={S.newGo}
              disabled={busy || text.trim() === ''}
            >
              <ArrowUpIcon />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
