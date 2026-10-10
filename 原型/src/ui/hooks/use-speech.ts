// 语音输入（批 4，补位 #3）：浏览器自带的语音识别（Web Speech API）。声音由浏览器送到它自己的语音服务，
// 不经过核心；识别出的文字交给输入框，学习者改过再发。浏览器不支持时 supported 为假，界面灰掉按钮并说明。
import { useCallback, useEffect, useRef, useState } from 'react';
import { W } from '../wording.ts';

/** 标准库类型里只有事件，没有识别器本身；这里只声明用到的部分。 */
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export interface Speech {
  supported: boolean;
  listening: boolean;
  /** 正在识别、还没定下来的一段（显示用）。 */
  interim: string;
  error: string | undefined;
  start(): void;
  stop(): void;
}

/** onFinal：每识别定一段就交出来（追加进输入框）。 */
export function useSpeech(onFinal: (text: string) => void): Speech {
  const ctor = recognitionCtor();
  const rec = useRef<Recognition | undefined>(undefined);
  const final = useRef(onFinal);
  final.current = onFinal;
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);

  const start = useCallback(() => {
    if (ctor === undefined) {
      setError(W.voiceUnsupported);
      return;
    }
    rec.current?.abort();
    const r = new ctor();
    r.lang = navigator.language || 'zh-CN';
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let pending = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const text = res?.[0]?.transcript ?? '';
        if (res?.isFinal === true) final.current(text);
        else pending += text;
      }
      setInterim(pending);
    };
    r.onerror = (e) => {
      // 没听到声音、被自己停掉：不是错，照常结束
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      setError(
        e.error === 'not-allowed' || e.error === 'service-not-allowed'
          ? W.voiceDenied
          : W.voiceFailed(e.message || e.error),
      );
    };
    r.onend = () => {
      setListening(false);
      setInterim('');
      if (rec.current === r) rec.current = undefined;
    };
    rec.current = r;
    setError(undefined);
    setListening(true);
    r.start();
  }, [ctor]);

  const stop = useCallback(() => {
    rec.current?.stop();
  }, []);

  useEffect(
    () => () => {
      rec.current?.abort();
    },
    [],
  );

  return { supported: ctor !== undefined, listening, interim, error, start, stop };
}
