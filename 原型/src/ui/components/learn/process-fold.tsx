// 学习页的过程记录（11-06 试验）：一轮一段，留在对话里。正在跑时展开、跟到最新；跑完折成一行，点开能看。内容的取舍见 process-model.ts。
import { useEffect, useRef, useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from 'lucide-react';
import { processSummary, type ProcessGroup, type ProcessItem } from '../../process-model.ts';
import { WP } from '../../wording-page.ts';

export function ProcessFold(props: {
  group: ProcessGroup;
  /** 这一段还在进行。 */
  live: boolean;
  /** 正在流出来、还没成块的思考概要。 */
  thinking: string;
}) {
  const { group, live, thinking } = props;
  const [choice, setChoice] = useState<boolean | undefined>(undefined);
  const open = choice ?? live;
  const box = useRef<HTMLDivElement>(null);
  const size = group.items.length + thinking.length;
  useEffect(() => {
    if (live && box.current !== null) box.current.scrollTop = box.current.scrollHeight;
  }, [live, size]);
  const s = processSummary(group);
  return (
    <div className="flex flex-col gap-1.5 text-sm" data-testid="process-fold">
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground flex items-center gap-1 self-start text-xs"
        onClick={() => setChoice(!open)}
      >
        {open ? (
          <ChevronDownIcon className="size-3.5" />
        ) : (
          <ChevronRightIcon className="size-3.5" />
        )}
        {WP.processHead(live, s.ms, s.thoughts, s.steps)}
      </button>
      {open && (
        <div
          ref={box}
          className="border-border text-muted-foreground flex max-h-80 flex-col gap-1.5 overflow-y-auto border-s-2 ps-3 text-xs leading-5"
          data-testid="process-items"
        >
          {group.items.map((item, i) => (
            <ItemView key={i} item={item} />
          ))}
          {thinking !== '' && <p className="whitespace-pre-wrap italic">{thinking}</p>}
        </div>
      )}
    </div>
  );
}

function ItemView({ item }: { item: ProcessItem }) {
  switch (item.kind) {
    case 'thought':
      return <p className="whitespace-pre-wrap italic">{item.text}</p>;
    case 'said':
      return <p className="text-foreground/80 whitespace-pre-wrap">{item.text}</p>;
    case 'step':
      return (
        <p className="font-mono text-[0.7rem] break-all">
          {item.text}
          {item.failed && <span className="text-destructive"> {WP.processFailed}</span>}
        </p>
      );
  }
}
