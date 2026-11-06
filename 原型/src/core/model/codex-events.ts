import { z } from 'zod';
import type { CodexItem } from './codex-protocol.ts';
import type { ModelEvent, SandboxActionEvent, SandboxSpec } from './port.ts';
import { resolveSandboxPath, virtualPath } from './sandbox-paths.ts';

/** 界面沿用已有的动作类别；原始工具名和参数保留在 model_raw。 */
export function codexActivity(
  item: CodexItem,
): Extract<ModelEvent, { kind: 'activity' }> | undefined {
  const tools: Record<string, string> = {
    commandExecution: 'Bash',
    fileChange: 'Edit',
    webSearch: 'WebSearch',
    imageView: 'Read',
  };
  const tool = item.type === 'dynamicToolCall' ? item.tool : tools[item.type];
  if (tool === undefined) return undefined;
  const input =
    item.type === 'dynamicToolCall'
      ? (z.record(z.string(), z.unknown()).safeParse(item.arguments).data ?? {})
      : {
          ...(item.command !== undefined ? { command: item.command } : {}),
          ...(item.path !== undefined ? { file_path: item.path } : {}),
        };
  return { kind: 'activity', tool, input };
}

export function codexActions(item: CodexItem, sb: SandboxSpec): SandboxActionEvent['action'][] {
  const shown = (path: string) => virtualPath(sb, resolveSandboxPath(sb, path));
  if (item.type === 'commandExecution') {
    return [
      {
        op: 'run',
        command: item.command ?? '',
        summary: `跑命令：${item.command ?? ''}`,
        ok: item.status === 'completed' && (item.exitCode === 0 || item.exitCode == null),
      },
    ];
  }
  if (item.type === 'fileChange') {
    return (item.changes ?? []).map((change) => ({
      op: 'write',
      path: shown(change.path),
      summary: `改文件 ${shown(change.path)}`,
      ok: item.status === 'completed',
      // Codex 返回的是 diff，不能冒充 content（全文或替换文本）；补丁保留在 model_raw。
    }));
  }
  if (item.type === 'imageView' && item.path !== undefined) {
    return [{ op: 'read', path: shown(item.path), summary: `看图 ${shown(item.path)}`, ok: true }];
  }
  if (item.type === 'webSearch') return [{ op: 'search', summary: '联网搜索 / 读网页', ok: true }];
  return [];
}
