// 各份资料的来源说明（一句话版）：出处标签悬停、书列表里用。读一次缓存着；学习者补了说明就作废重读。
import { useEffect, useState } from 'react';
import { api } from '../api.ts';

let cache: Promise<Map<string, string>> | undefined;
const listeners = new Set<() => void>();

function load(): Promise<Map<string, string>> {
  cache ??= api
    .sourceNotes()
    .then((r) => new Map(r.notes.map((n) => [n.book, n.summary])))
    .catch((e: unknown) => {
      // 读不到时不留缓存，下次再试；悬停里就不显示说明（说明本身不是必需的）
      cache = undefined;
      console.error('读来源说明失败：', e);
      return new Map<string, string>();
    });
  return cache;
}

/** 补了说明之后调：让悬停里的说明重读。 */
export function invalidateSourceNotes(): void {
  cache = undefined;
  for (const f of [...listeners]) f();
}

/** 书目录名 → 一句话说明。 */
export function useSourceNoteSummaries(): ReadonlyMap<string, string> {
  const [map, setMap] = useState<ReadonlyMap<string, string>>(new Map());
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const f = () => setTick((t) => t + 1);
    listeners.add(f);
    return () => {
      listeners.delete(f);
    };
  }, []);
  useEffect(() => {
    let alive = true;
    void load().then((m) => {
      if (alive) setMap(m);
    });
    return () => {
      alive = false;
    };
  }, [tick]);
  return map;
}
