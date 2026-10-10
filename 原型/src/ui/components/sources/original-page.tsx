// 原件的一页：PDF 页面图上叠位置框（要看的那一处 + 这一页上挂的知识点），可翻页；有位置时先给这一处的局部截图。
import { useState, type ReactNode } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import type { BBox, PageAnchor } from '../../../shared/protocol.ts';
import { Button } from '@/components/ui/button';
import { api, withToken } from '../../api.ts';
import { useLoad } from '../../hooks/use-load.ts';
import { usePanel } from '../../panel.ts';
import { boxStyle, cropBox, unionBox } from '../../source-model.ts';
import { W } from '../../wording.ts';
import { Loading, Section } from '../evidence/parts.tsx';

export function OriginalPage(props: {
  book: string;
  page: number;
  /** 要标出来的位置（只标在起始那一页上）。 */
  boxes?: BBox[];
  /** 当前页变了时告诉外面（翻页）。 */
  onPage?: (page: number) => void;
}) {
  const [page, setPage] = useState(props.page);
  const boxes = page === props.page ? (props.boxes ?? []) : [];
  const go = (p: number) => {
    setPage(p);
    props.onPage?.(p);
  };
  const r = useLoad(`page:${props.book}:${String(page)}`, () => api.page(props.book, page), false);
  const data = r.data;
  const focus = unionBox(boxes);
  return (
    <div className="flex flex-col gap-3" data-testid="original-page">
      <div className="flex items-center gap-1 text-sm">
        <Button variant="ghost" size="xs" disabled={page <= 1} onClick={() => go(page - 1)}>
          <ChevronLeftIcon />
          {W.prevPage}
        </Button>
        <span className="text-muted-foreground mx-auto text-xs">{W.pageOf(page)}</span>
        <Button variant="ghost" size="xs" onClick={() => go(page + 1)}>
          {W.nextPage}
          <ChevronRightIcon />
        </Button>
      </div>
      {!data ? (
        <Loading error={r.error} />
      ) : data.imageUrl === undefined ? (
        <div className="text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 text-sm">
          {data.note ?? W.noOriginal}
        </div>
      ) : (
        <>
          {focus !== undefined && (
            <Section title={W.thisSpot}>
              <PageImage
                src={withToken(`${data.imageUrl}&bbox=${cropBox(focus).join(',')}`)}
                alt={W.thisSpot}
              />
            </Section>
          )}
          <Section title={focus !== undefined ? W.wholePage : W.original}>
            <PageImage src={withToken(data.imageUrl)} alt={W.pageOf(page)}>
              {data.anchors.map((a, i) => (
                <AnchorBox key={`a${String(i)}`} anchor={a} />
              ))}
              {boxes.map((b, i) => (
                <div
                  key={`b${String(i)}`}
                  className="pointer-events-none absolute rounded-sm border-2 border-amber-500 bg-amber-300/25"
                  style={boxStyle(b)}
                />
              ))}
            </PageImage>
          </Section>
          {data.anchors.length > 0 && (
            <Section title={W.onThisPage}>
              <AnchorList anchors={data.anchors} />
            </Section>
          )}
        </>
      )}
    </div>
  );
}

function PageImage(props: { src: string; alt: string; children?: ReactNode }) {
  const [failed, setFailed] = useState<string | undefined>();
  if (failed === props.src) {
    return <div className="text-muted-foreground text-sm">{W.imageFailed}</div>;
  }
  return (
    <div className="relative overflow-hidden rounded-lg border bg-white shadow-xs">
      <img
        src={props.src}
        alt={props.alt}
        className="block w-full"
        onError={() => setFailed(props.src)}
      />
      {props.children}
    </div>
  );
}

/** 知识点挂在这一页上的位置：淡色框，点开看那个知识点。 */
function AnchorBox(props: { anchor: PageAnchor }) {
  const panel = usePanel();
  const { anchor } = props;
  if (anchor.bbox === undefined) return null;
  return (
    <button
      type="button"
      title={anchor.pointName}
      aria-label={anchor.pointName}
      className="border-primary/40 hover:bg-primary/10 absolute rounded-sm border"
      style={boxStyle(anchor.bbox)}
      onClick={() => panel.show({ kind: 'point', id: anchor.pointId })}
    />
  );
}

function AnchorList(props: { anchors: PageAnchor[] }) {
  const panel = usePanel();
  return (
    <ul className="flex flex-col gap-1.5">
      {props.anchors.map((a, i) => (
        <li key={i}>
          <button
            type="button"
            className="hover:bg-accent/60 -mx-1 flex w-full flex-col gap-0.5 rounded-md px-1 py-1 text-left text-sm"
            onClick={() => panel.show({ kind: 'point', id: a.pointId })}
          >
            <span className="font-medium">{a.pointName}</span>
            {a.quote !== '' && (
              <span className="text-muted-foreground line-clamp-2 font-serif">{a.quote}</span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}
