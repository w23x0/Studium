import { useState } from 'react';
import type { ConnectionInput, ConnectionView, Engine } from '../../../shared/model-settings.ts';

export function ConnectionForm({
  engine,
  value,
  busy,
  onSave,
}: {
  engine: Engine;
  value: ConnectionView;
  busy: boolean;
  onSave: (input: ConnectionInput) => Promise<void>;
}) {
  const [mode, setMode] = useState(value.mode);
  const [url, setUrl] = useState(value.baseUrl);
  const [key, setKey] = useState('');
  const inputClass = 'bg-background w-full rounded-md border px-3 py-2 text-sm';
  return (
    <fieldset disabled={busy} className="flex flex-col gap-2">
      <label className="text-sm">
        连接方式
        <select
          aria-label={`${engine} 连接方式`}
          className={`${inputClass} mt-1`}
          value={mode}
          onChange={(e) => setMode(e.target.value as 'login' | 'api')}
        >
          <option value="login">账号登录</option>
          <option value="api">API URL + Key</option>
        </select>
      </label>
      {mode === 'api' && (
        <>
          <label className="text-sm">
            API URL
            <input
              aria-label={`${engine} API URL`}
              type="url"
              autoComplete="off"
              className={`${inputClass} mt-1`}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={
                engine === 'claude' ? 'https://api.anthropic.com' : 'https://api.openai.com/v1'
              }
            />
          </label>
          <label className="text-sm">
            API Key
            <input
              aria-label={`${engine} API Key`}
              type="password"
              autoComplete="new-password"
              className={`${inputClass} mt-1`}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder={value.keySet ? '已保存，留空保留原 Key' : '填写 API Key'}
            />
          </label>
          <p className="text-muted-foreground text-xs">
            {engine === 'claude'
              ? '需要兼容 Anthropic Messages API。'
              : '需要兼容 OpenAI Responses API；仅支持 Chat Completions 的接口不能用于此内核。'}
            模型在对话输入区选择或填写。
          </p>
          <p className="text-muted-foreground text-xs">
            Key 保存在运行核心的电脑，界面不会回显。API 余额请在服务商处查看。
          </p>
        </>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
          onClick={() =>
            void onSave({
              mode,
              revision: value.revision,
              ...(mode === 'api' ? { baseUrl: url, ...(key.trim() ? { apiKey: key } : {}) } : {}),
            })
          }
        >
          保存连接方式
        </button>
        {value.keySet && (
          <button
            type="button"
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
            onClick={() => void onSave({ mode: 'login', clear: true, revision: value.revision })}
          >
            清除 API 配置
          </button>
        )}
      </div>
      <p className="text-muted-foreground text-xs">
        当前使用：{value.mode === 'api' ? 'API' : '账号登录'}。修改后从下一轮生效。
      </p>
    </fieldset>
  );
}
