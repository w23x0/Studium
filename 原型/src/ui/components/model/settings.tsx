import { ConnectionForm } from './connection-form.tsx';
import { useEffect, useState } from 'react';
import { api } from '../../api.ts';
import type { Engine, EngineSettings } from '../../../shared/model-settings.ts';
import { Modal } from '../input/modal.tsx';
import { useModelSettings } from './use-model-settings.ts';

const ENGINES: { id: Engine; label: string }[] = [
  { id: 'claude', label: 'Claude Agent SDK' },
  { id: 'codex', label: 'Codex app-server' },
];
const buttonClass = 'rounded-md border px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50';

export function ModelSettingsDialog({ onClose }: { onClose: () => void }) {
  const { data, error, reload } = useModelSettings<EngineSettings>(api.modelSettings);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [showClaudeLogin, setShowClaudeLogin] = useState(false);
  const loggingIn = data?.accounts.codex.login !== undefined;
  useEffect(() => {
    if (!loggingIn) return;
    const timer = window.setInterval(() => void reload(), 3000);
    return () => window.clearInterval(timer);
  }, [loggingIn, reload]);
  const act = async (operation: () => Promise<unknown>) => {
    setBusy(true);
    setActionError('');
    try {
      await operation();
      await reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal label="内核与连接" onClose={onClose} className="w-full max-w-lg">
      <h2 className="mb-5 pr-6 text-lg font-medium">内核与连接</h2>
      {data === undefined ? (
        <p>{error || '正在读取设置…'}</p>
      ) : (
        <div className="flex flex-col gap-5">
          <fieldset disabled={busy} className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">选择内核</legend>
            {ENGINES.map((e) => (
              <label
                key={e.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg border p-3"
              >
                <input
                  type="radio"
                  name="engine"
                  value={e.id}
                  checked={data.engine === e.id}
                  onChange={() => void act(() => api.setEngine(e.id))}
                />
                {e.label}
              </label>
            ))}
            <p className="text-muted-foreground text-xs">
              保存后，各对话从下一轮开始使用所选内核；正在生成的回复会继续完成。
            </p>
          </fieldset>
          {ENGINES.map((e) => {
            const account = data.accounts[e.id];
            return (
              <section key={e.id} className="flex flex-col gap-2 border-t pt-4">
                <h3 className="text-sm font-medium">{e.label}</h3>
                <ConnectionForm
                  key={data.connections[e.id].revision}
                  engine={e.id}
                  value={data.connections[e.id]}
                  busy={busy}
                  onSave={(input) => act(() => api.setConnection(e.id, input))}
                />
                <div hidden={data.connections[e.id].mode === 'api'} className="flex flex-col gap-2">
                  <p className="text-muted-foreground text-sm">
                    {account.error ? '状态读取失败' : account.loggedIn ? '已登录' : '未登录'}
                    {account.label ? ` · ${account.label}` : ''}
                  </p>
                  {account.error && (
                    <p role="alert" className="text-destructive text-xs">
                      {account.error}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button
                      className={buttonClass}
                      disabled={busy || account.login !== undefined}
                      onClick={() =>
                        e.id === 'claude'
                          ? setShowClaudeLogin(true)
                          : void act(() => api.accountAction(e.id, 'login'))
                      }
                    >
                      {account.loggedIn ? '更换登录' : '登录'}
                    </button>
                    {account.loggedIn && (
                      <button
                        className={buttonClass}
                        disabled={busy}
                        onClick={() => void act(() => api.accountAction(e.id, 'logout'))}
                      >
                        退出登录
                      </button>
                    )}
                    {account.login && (
                      <button
                        className={buttonClass}
                        disabled={busy}
                        onClick={() => void act(() => api.accountAction(e.id, 'cancel'))}
                      >
                        取消登录
                      </button>
                    )}
                  </div>
                  {e.id === 'claude' && showClaudeLogin && (
                    <div className="bg-muted rounded-lg p-3 text-sm">
                      <p>在运行 Studium 的电脑终端执行：</p>
                      <code className="my-2 block select-all">claude auth login</code>
                      <p>按提示完成登录后，点击下方“刷新连接状态”。</p>
                    </div>
                  )}
                  {account.login && (
                    <div className="bg-muted flex flex-col gap-2 rounded-lg p-3 text-sm">
                      <a
                        href={account.login.url}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        打开登录页面
                      </a>
                      {account.login.code && (
                        <p>
                          设备码：<code className="select-all font-bold">{account.login.code}</code>
                        </p>
                      )}
                      <p>完成后会自动更新登录状态。</p>
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
      {(actionError || (data !== undefined && error)) && (
        <p role="alert" className="text-destructive mt-3 text-sm">
          {actionError || error}
        </p>
      )}
      <button className={`${buttonClass} mt-5`} disabled={busy} onClick={() => void reload()}>
        刷新连接状态
      </button>
    </Modal>
  );
}
