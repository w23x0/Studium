// 输入框（批 4，照 Claude 的输入框）：打字 · 加图片（选文件、拖进来、粘贴；手机上可直接拍照）· 语音 · 公式。
// 图片原样传给核心保存，随消息原样送给模型（W12 §5.6；太大的先缩小一份副本送去）。正在写的公式在上方预览。
import {
  ArrowUpIcon,
  CameraIcon,
  ImagePlusIcon,
  LoaderCircleIcon,
  MicIcon,
  SigmaIcon,
  SquareIcon,
  XIcon,
} from 'lucide-react';
import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { api } from '@/api';
import { TooltipIconButton } from '@/components/assistant-ui/tooltip-icon-button';
import { useSpeech } from '@/hooks/use-speech';
import { hasMath, insertFormula, needsSmallerCopy, scaledSize } from '@/input-model';
import { cn } from '@/lib/utils';
import type { PickedFile } from '@/files';
import { W } from '@/wording';
import { WT } from '@/wording-tools';
import {
  IMAGE_MIME_TYPES,
  MODEL_IMAGE_MAX_BYTES,
  type MessageImageInput,
} from '../../../shared/protocol.ts';
import { MathPreview } from './math-preview';
import { ImageViewer } from './modal';

const FormulaDialog = lazy(() =>
  import('./formula-dialog').then((m) => ({ default: m.FormulaDialog })),
);

export type SendInput = (text: string, images: MessageImageInput[]) => Promise<void>;

interface PendingImage {
  key: string;
  preview: string;
  status: 'uploading' | 'done' | 'failed';
  attachmentId?: string;
  /** 原图太大时缩小的副本（送给模型的是它）。 */
  sentAs?: string;
  error?: string;
}

const coarse = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

export function InputComposer(props: {
  placeholder: string;
  onSend: SendInput;
  /** 模型在生成：没打字时发送键换成停止键（W12 §4.4）；打了字照常能发（排到这一轮之后）。 */
  running?: boolean;
  onStop?: () => Promise<void>;
  /** 拖进 / 选了非图片文件时（只有主对话给）：不进输入，交给项目的上传；回一句给学习者看的话。 */
  /** 回给学习者看的：一句话，或上传结果那一条（可点改，W11 §2）。 */
  onOtherFiles?: (files: PickedFile[]) => Promise<ReactNode>;
  /** 放进输入框里、跟这句话一起发的小块（学习页选中的几处，每块能删，11-05 #92）。 */
  attached?: ReactNode;
  /** 这个对话现在的上下文大小（最新一条 context_used，W14 §2）；还没回过话不给。 */
  contextTokens?: number;
}) {
  const [text, setText] = useState('');
  const [images, setImages] = useState<PendingImage[]>([]);
  const [notice, setNotice] = useState<ReactNode>(undefined);
  const [dragging, setDragging] = useState(false);
  const [formula, setFormula] = useState(false);
  const [viewing, setViewing] = useState<PendingImage | undefined>(undefined);
  const [sending, setSending] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const files = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const selection = useRef<[number, number]>([0, 0]);
  const caret = useRef<number | undefined>(undefined);
  const imagesRef = useRef(images);
  imagesRef.current = images;

  const speech = useSpeech(
    useCallback((heard: string) => {
      setText((t) => t + heard);
    }, []),
  );

  // 换行后自动长高；插入公式后把光标放到公式后面
  useEffect(() => {
    const el = area.current;
    if (el === null) return;
    el.style.height = 'auto';
    el.style.height = `${String(Math.min(el.scrollHeight, 192))}px`;
    if (caret.current !== undefined) {
      el.focus();
      el.setSelectionRange(caret.current, caret.current);
      caret.current = undefined;
    }
  }, [text]);

  // 关掉时放掉缩略图占的内存
  useEffect(
    () => () => {
      for (const i of imagesRef.current) URL.revokeObjectURL(i.preview);
    },
    [],
  );

  const patch = (key: string, p: Partial<PendingImage>) => {
    setImages((xs) => xs.map((x) => (x.key === key ? { ...x, ...p } : x)));
  };

  const process = async (key: string, file: File) => {
    try {
      const att = await api.uploadImage(file, file.name);
      let sentAs: string | undefined;
      if (needsSmallerCopy(file.size)) {
        // 原图照存；模型接口一次收不下，就缩小一份副本送去（副本记着出自哪张原图）
        const copy = await smallerCopy(file);
        sentAs = (await api.uploadImage(copy, undefined, att.id)).id;
      }
      patch(key, {
        status: 'done',
        attachmentId: att.id,
        ...(sentAs !== undefined ? { sentAs } : {}),
      });
    } catch (err) {
      patch(key, { status: 'failed', error: err instanceof Error ? err.message : String(err) });
    }
  };

  const addFiles = (list: FileList | File[]) => {
    const all = [...list];
    const ok = all.filter((f) => (IMAGE_MIME_TYPES as readonly string[]).includes(f.type));
    const others = all.filter((f) => !ok.includes(f));
    const upload = props.onOtherFiles;
    if (others.length > 0 && upload !== undefined) {
      setNotice(W.filesUploading(others.length));
      upload(others.map((file) => ({ file, path: file.name })))
        .then(setNotice)
        .catch((e: unknown) => setNotice(e instanceof Error ? e.message : String(e)));
    } else {
      setNotice(others.length > 0 ? W.notImage : undefined);
    }
    for (const file of ok) {
      const key = `${String(Date.now())}-${Math.random().toString(36).slice(2)}`;
      setImages((xs) => [...xs, { key, preview: URL.createObjectURL(file), status: 'uploading' }]);
      void process(key, file);
    }
  };

  const remove = (img: PendingImage) => {
    URL.revokeObjectURL(img.preview);
    setImages((xs) => xs.filter((x) => x.key !== img.key));
  };

  const busy = images.some((i) => i.status === 'uploading');
  const ready = images.filter((i) => i.status === 'done' && i.attachmentId !== undefined);
  const canSend = !sending && !busy && (text.trim() !== '' || ready.length > 0);

  const send = async () => {
    if (!canSend) {
      if (busy) setNotice(W.waitImages);
      return;
    }
    if (speech.listening) speech.stop();
    setSending(true);
    try {
      await props.onSend(
        text,
        ready.map((i) => ({
          attachmentId: i.attachmentId ?? '',
          ...(i.sentAs !== undefined ? { sentAs: i.sentAs } : {}),
        })),
      );
      for (const i of images) URL.revokeObjectURL(i.preview);
      setImages([]);
      setText('');
      setNotice(undefined);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  };

  const openFormula = () => {
    const el = area.current;
    selection.current = el ? [el.selectionStart, el.selectionEnd] : [text.length, text.length];
    setFormula(true);
  };

  const insert = (latex: string, display: boolean) => {
    const [a, b] = selection.current;
    const r = insertFormula(text, a, b, latex, display);
    caret.current = r.cursor;
    setText(r.text);
    setFormula(false);
  };

  return (
    <div
      className="relative flex w-full flex-col"
      onDragOver={(e) => {
        if (![...e.dataTransfer.types].includes('Files')) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={(e) => {
        if (e.dataTransfer.files.length === 0) return;
        e.preventDefault();
        setDragging(false);
        addFiles(e.dataTransfer.files);
      }}
    >
      <div
        className={cn(
          'border-foreground/15 focus-within:border-foreground/30 bg-card flex w-full cursor-text flex-col gap-2 rounded-(--composer-radius) border p-3 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.08)] transition-[border-color]',
          dragging && 'border-primary border-dashed',
        )}
      >
        {dragging && <p className="text-primary px-1.5 text-sm">{W.dropHere}</p>}
        {props.attached}
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2" data-testid="composer-images">
            {images.map((img, n) => (
              <ImageRow
                key={img.key}
                img={img}
                n={n + 1}
                onView={() => setViewing(img)}
                onRemove={() => remove(img)}
              />
            ))}
          </div>
        )}
        {hasMath(text) && (
          <div className="bg-muted/40 rounded-lg px-2.5 py-1.5" data-testid="formula-preview">
            <span className="text-muted-foreground mb-0.5 block text-xs">{W.preview}</span>
            <MathPreview text={text} />
          </div>
        )}
        <textarea
          ref={area}
          value={text}
          placeholder={props.placeholder}
          aria-label="输入"
          rows={1}
          autoFocus
          className="placeholder:text-muted-foreground/70 max-h-48 min-h-10 w-full resize-none bg-transparent px-1.5 py-1 text-base leading-6 outline-none"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing || coarse()) return;
            e.preventDefault();
            void send();
          }}
          onPaste={(e) => {
            const pasted = [...e.clipboardData.files].filter((f) => f.type.startsWith('image/'));
            if (pasted.length === 0) return;
            e.preventDefault();
            addFiles(pasted);
          }}
        />
        {(speech.listening || speech.interim !== '') && (
          <p className="text-muted-foreground px-1.5 text-xs" data-testid="voice-status">
            {speech.interim !== '' ? <span className="italic">{speech.interim}</span> : null}
            {speech.interim !== '' ? ' · ' : ''}
            {W.voiceListening}
            <span className="mt-0.5 block">{W.voiceNotice}</span>
          </p>
        )}
        {notice !== undefined && typeof notice !== 'string' ? (
          <div className="px-1.5 text-xs">{notice}</div>
        ) : (
          (notice ?? speech.error) !== undefined && (
            <p className="text-destructive px-1.5 text-xs">{notice ?? speech.error}</p>
          )
        )}
        <div className="flex items-center gap-1">
          <TooltipIconButton
            tooltip={W.addImage}
            side="top"
            className="size-8 rounded-lg p-1.5"
            onClick={() => files.current?.click()}
          >
            <ImagePlusIcon />
          </TooltipIconButton>
          {coarse() && (
            <TooltipIconButton
              tooltip={W.takePhoto}
              side="top"
              className="size-8 rounded-lg p-1.5"
              onClick={() => camera.current?.click()}
            >
              <CameraIcon />
            </TooltipIconButton>
          )}
          <TooltipIconButton
            tooltip={
              !speech.supported ? W.voiceUnsupported : speech.listening ? W.voiceStop : W.voice
            }
            side="top"
            aria-disabled={!speech.supported}
            className={cn(
              'size-8 rounded-lg p-1.5',
              !speech.supported && 'opacity-40',
              speech.listening && 'text-destructive',
            )}
            onClick={() => (speech.listening ? speech.stop() : speech.start())}
          >
            {speech.listening ? <SquareIcon /> : <MicIcon />}
          </TooltipIconButton>
          <TooltipIconButton
            tooltip={W.formula}
            side="top"
            className="size-8 rounded-lg p-1.5"
            onClick={openFormula}
          >
            <SigmaIcon />
          </TooltipIconButton>
          <div className="flex-1" />
          {props.running === true &&
          props.onStop !== undefined &&
          text.trim() === '' &&
          ready.length === 0 ? (
            <TooltipIconButton
              tooltip={WT.stop}
              side="bottom"
              type="button"
              variant="default"
              size="icon"
              className="size-8 rounded-lg"
              aria-label={WT.stop}
              data-testid="stop"
              onClick={() => {
                props.onStop?.().catch((e: unknown) => {
                  setNotice(e instanceof Error ? e.message : String(e));
                });
              }}
            >
              <SquareIcon className="size-3.5 fill-current" />
            </TooltipIconButton>
          ) : (
            <TooltipIconButton
              tooltip={busy ? W.waitImages : W.send}
              side="bottom"
              type="button"
              variant="default"
              size="icon"
              className="size-8 rounded-lg"
              aria-label={W.send}
              disabled={!canSend}
              onClick={() => void send()}
            >
              {sending ? (
                <LoaderCircleIcon className="size-4 animate-spin" />
              ) : (
                <ArrowUpIcon className="size-4" />
              )}
            </TooltipIconButton>
          )}
        </div>
      </div>
      {props.contextTokens !== undefined && (
        <p data-testid="context-size" className="text-muted-foreground self-end px-2 pt-1 text-xs">
          {W.usage.context(props.contextTokens)}
        </p>
      )}
      <input
        ref={files}
        type="file"
        // 主对话里非图片也收（交给项目的上传）；别处只收图片
        accept={props.onOtherFiles !== undefined ? undefined : IMAGE_MIME_TYPES.join(',')}
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={camera}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files);
          e.target.value = '';
        }}
      />
      {formula && (
        <Suspense fallback={null}>
          <FormulaDialog onInsert={insert} onClose={() => setFormula(false)} />
        </Suspense>
      )}
      {viewing !== undefined && (
        <ImageViewer
          src={
            viewing.attachmentId !== undefined
              ? api.imageUrl(viewing.attachmentId)
              : viewing.preview
          }
          alt={W.viewImage}
          onClose={() => setViewing(undefined)}
        />
      )}
    </div>
  );
}

function ImageRow(props: {
  img: PendingImage;
  n: number;
  onView: () => void;
  onRemove: () => void;
}) {
  const { img } = props;
  return (
    <div className="flex flex-col gap-1" data-testid="composer-image">
      <div className="relative shrink-0">
        <button
          type="button"
          className="block overflow-hidden rounded-lg border"
          aria-label={W.viewImage}
          onClick={props.onView}
        >
          <img src={img.preview} alt={W.imageAlt(props.n)} className="size-16 object-cover" />
        </button>
        {img.status === 'uploading' && (
          <span className="bg-background/60 absolute inset-0 flex items-center justify-center rounded-lg">
            <LoaderCircleIcon className="size-4 animate-spin" />
          </span>
        )}
        <button
          type="button"
          aria-label={W.removeImage}
          className="bg-background text-muted-foreground hover:text-foreground absolute -top-1.5 -right-1.5 rounded-full border p-0.5 shadow-xs"
          onClick={props.onRemove}
        >
          <XIcon className="size-3" />
        </button>
      </div>
      {img.status === 'failed' && img.error !== undefined && (
        <span className="text-destructive max-w-40 text-xs">{img.error}</span>
      )}
    </div>
  );
}

/** 缩小一份 JPEG 副本送给模型（长边 2000 像素以内，再大就降画质）。 */
async function smallerCopy(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = scaledSize(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('浏览器画不了缩小的副本');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  for (const quality of [0.9, 0.75, 0.6]) {
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', quality));
    if (blob !== null && blob.size <= MODEL_IMAGE_MAX_BYTES) return blob;
  }
  throw new Error('图片缩小后还是太大，裁一下再试');
}
