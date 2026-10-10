// 当前项目的资料范围：选了资料时是选了几份（书库里还在的）；没选 / 不在项目里 = undefined（查全部）。
import { api } from '../api.ts';
import { useProject } from '../panel.ts';
import { useLoad } from './use-load.ts';

export function useProjectScope(): number | undefined {
  const project = useProject();
  const r = useLoad(`materials:${project ?? ''}`, () =>
    project !== undefined ? api.materials(project) : Promise.resolve(undefined),
  );
  if (r.data?.restricted !== true) return undefined;
  return r.data.materials.filter((m) => m.missing !== true).length;
}
