// 来自 assistant-ui 模板 0.0.121（MIT），按需改动。
import { useEffect, useRef, useState } from 'react';

export const useCopyToClipboard = ({ copiedDuration = 3000 }: { copiedDuration?: number } = {}) => {
  const [isCopied, setIsCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(
    () => () => {
      if (timer.current !== undefined) clearTimeout(timer.current);
    },
    [],
  );

  const copyToClipboard = (value: string) => {
    if (!value) return;
    navigator.clipboard.writeText(value).then(
      () => {
        if (timer.current !== undefined) clearTimeout(timer.current);
        setIsCopied(true);
        timer.current = setTimeout(() => {
          timer.current = undefined;
          setIsCopied(false);
        }, copiedDuration);
      },
      (err: unknown) => {
        console.warn('复制失败', err);
      },
    );
  };

  return { isCopied, copyToClipboard };
};
