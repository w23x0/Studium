import { useCallback, useState } from 'react';
import { api } from '../../api.ts';
import type { ConversationModelSettings, ModelSelection } from '../../../shared/model-settings.ts';
import { useModelSettings } from './use-model-settings.ts';

const EFFORT: Record<string, string> = {
  default: '自动',
  none: '不思考',
  minimal: '最低',
  low: '低',
  medium: '中',
  high: '高',
  xhigh: '很高',
  max: '最高',
};
const selectClass = 'bg-background max-w-48 rounded border px-1.5 py-1 text-xs disabled:opacity-50';

export function ConversationControls({ sessionId }: { sessionId: string }) {
  const read = useCallback(() => api.conversationModel(sessionId), [sessionId]);
  const { data, error, reload } = useModelSettings<ConversationModelSettings>(read, sessionId);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [editingModel, setEditingModel] = useState(false);
  const save = async (selection: ModelSelection) => {
    if (data === undefined) return;
    setSaving(true);
    setSaveError('');
    try {
      await api.setConversationModel(sessionId, data.engine, selection, data.connection.revision);
      setEditingModel(false);
      await reload();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };
  if (data === undefined)
    return (
      <div className="text-muted-foreground px-2 pt-2 text-xs">
        {error || '正在读取模型设置…'}
        {error && (
          <button className="ml-2 underline" onClick={() => void reload()}>
            重试
          </button>
        )}
      </div>
    );
  const selected =
    data.selection.model === undefined
      ? data.models.find((m) => m.isDefault === true)
      : data.models.find(
          (m) => m.id === data.selection.model || m.resolvedModel === data.selection.model,
        );
  const model = selected?.id ?? data.selection.model ?? '';
  const effort = data.selection.effort ?? 'default';
  const apiMode = data.connection.mode === 'api';
  const efforts = apiMode ? data.efforts : (selected?.efforts ?? []);
  return (
    <div
      className="flex flex-col gap-2 px-2 pt-2 text-xs"
      data-testid="conversation-model-controls"
    >
      <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-2">
        <span title="服务最后报告的实际模型">当前：{data.current?.model ?? '尚未运行'}</span>
        <label className="flex items-center gap-1">
          模型
          <select
            aria-label="切换模型"
            className={selectClass}
            value={model}
            disabled={saving || data.models.length === 0}
            onChange={(e) => {
              const next = data.models.find((m) => m.id === e.target.value);
              if (next !== undefined)
                void save({
                  model: next.id,
                  effort: next.efforts.includes(effort) ? effort : 'default',
                });
            }}
          >
            {selected === undefined && (
              <option value={model}>{model || (apiMode ? '请选择模型' : '内核默认')}</option>
            )}
            {data.models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        {apiMode && (
          <button
            type="button"
            className="underline"
            disabled={saving}
            onClick={() => {
              setCustomModel(model);
              setEditingModel(!editingModel);
            }}
          >
            手填模型 ID
          </button>
        )}
        <label className="flex items-center gap-1">
          思考
          <select
            aria-label="思考强度"
            className={selectClass}
            value={effort}
            disabled={saving || !model || efforts.length === 0}
            onChange={(e) => {
              if (model) void save({ model, effort: e.target.value });
            }}
          >
            <option value="default">自动</option>
            {effort !== 'default' && !efforts.includes(effort) && (
              <option value={effort}>{EFFORT[effort] ?? effort}</option>
            )}
            {efforts.map((e) => (
              <option key={e} value={e}>
                {EFFORT[e] ?? e}
              </option>
            ))}
          </select>
        </label>
        <button
          className="hover:text-foreground underline underline-offset-2"
          disabled={saving}
          onClick={() => void save({})}
        >
          恢复默认
        </button>
      </div>
      {apiMode && editingModel && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="bg-background min-w-0 flex-1 rounded border px-2 py-1"
            aria-label="API 模型 ID"
            value={customModel}
            onChange={(e) => setCustomModel(e.target.value)}
            placeholder="服务商提供的准确模型 ID"
          />
          <button
            type="button"
            disabled={saving || !customModel.trim()}
            className="rounded border px-2 py-1"
            onClick={() => void save({ model: customModel.trim(), effort: 'default' })}
          >
            应用
          </button>
        </div>
      )}
      {apiMode && !model && (
        <p className="text-muted-foreground">
          请先选择模型；第一次选择的模型也作为此 API 下新对话的默认模型。
        </p>
      )}
      {apiMode && (
        <p className="text-muted-foreground">思考强度默认自动；可用强度由 API 服务决定。</p>
      )}
      {data.pending && (
        <p className="text-muted-foreground">
          已选择 {data.engine === 'claude' ? 'Claude' : 'Codex'}，模型与强度在下一轮生效。
        </p>
      )}
      {(error || saveError || data.error) && (
        <p role="alert" className="text-destructive">
          {saveError || error || data.error}
          <button className="ml-2 underline" onClick={() => void reload()}>
            重试
          </button>
        </p>
      )}
    </div>
  );
}
