// 当前项目的资料范围：本项目有几份资料（资料目录里还在的）；不在项目里 = undefined（查全部）。
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
