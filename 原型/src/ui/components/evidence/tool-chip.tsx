// 一份教法（教学工具）的名字小标签；count > 1 时带次数。
import { W } from '../../wording.ts';

export function ToolChip(props: { name: string; count?: number }) {
  return (
    <span className="bg-primary/5 text-primary border-primary/20 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs">
      {props.name}
      {props.count !== undefined && props.count > 1 && (
        <span className="text-muted-foreground">· {W.toolTimes(props.count)}</span>
      )}
    </span>
  );
}
