// 账号控制通道只做登录、目录和额度查询，不创建线程或发送模型输入。
import { execFile } from 'node:child_process';
import { z } from 'zod';
import type { AccountState, ModelChoice } from '../../shared/model-settings.ts';
import { codexArgs, codexEnv, prepareCodexHome } from './codex-config.ts';
import { CodexRpc } from './codex-rpc.ts';
import { modelList } from './codex-protocol.ts';

export class CodexAccount {
  private connection: Promise<CodexRpc> | undefined;
  private loginId: string | undefined;
  private login: AccountState['login'];
  private error: string | undefined;

  constructor(
    private readonly root: string,
    private readonly binary: string,
    private readonly changed: () => void,
  ) {}

  private rpc(): Promise<CodexRpc> {
    this.connection ??= this.connect().catch((error: unknown) => {
      this.connection = undefined;
      throw error;
    });
    return this.connection;
  }

  private async connect(): Promise<CodexRpc> {
    const runtime = prepareCodexHome(this.root);
    const rpc = new CodexRpc(
      this.binary,
      codexArgs({ systemPrompt: '', tools: [] }, this.root, runtime.loginHome),
      runtime.cwd,
      codexEnv(runtime.loginHome),
      {
        notification: (method, params) => {
          if (method === 'account/login/completed') {
            const result = z
              .object({
                success: z.boolean(),
                error: z.string().nullish(),
                loginId: z.string().nullish(),
              })
              .parse(params);
            if (result.loginId != null && result.loginId !== this.loginId) return;
            this.login = undefined;
            this.loginId = undefined;
            this.error = result.success ? undefined : (result.error ?? '登录未完成，请重试');
            this.changed();
          }
        },
        request: (id, method) => {
          rpc.reject(id, `账号控制通道不支持 ${method}`);
          return Promise.resolve();
        },
        failed: (error) => {
          this.connection = undefined;
          this.login = undefined;
          this.loginId = undefined;
          this.error = error.message;
          console.error('Codex 账号通道：', error.message);
        },
      },
    );
    try {
      await rpc.request('initialize', {
        clientInfo: { name: 'studium_settings', version: '1.0.0' },
        capabilities: { experimentalApi: true },
      });
      rpc.notify('initialized');
      return rpc;
    } catch (error) {
      await rpc.close();
      throw error;
    }
  }

  async status(): Promise<AccountState> {
    const rpc = await this.rpc();
    const result = z
      .object({
        account: z
          .object({
            type: z.string(),
            email: z.string().nullish(),
            planType: z.string().optional(),
          })
          .nullish(),
      })
      .parse(await rpc.request('account/read', {}));
    const a = result.account;
    return {
      loggedIn: a != null,
      ...(a != null ? { label: [a.email, a.planType ?? a.type].filter(Boolean).join(' · ') } : {}),
      ...(this.login !== undefined ? { login: this.login } : {}),
      ...(this.error !== undefined ? { error: this.error } : {}),
    };
  }

  async startLogin(): Promise<void> {
    if (this.loginId !== undefined) return;
    this.error = undefined;
    const result = z
      .object({ loginId: z.string(), verificationUrl: z.url(), userCode: z.string() })
      .parse(
        await (await this.rpc()).request('account/login/start', { type: 'chatgptDeviceCode' }),
      );
    this.loginId = result.loginId;
    this.login = { url: result.verificationUrl, code: result.userCode };
  }

  async cancelLogin(): Promise<void> {
    if (this.loginId !== undefined)
      await (await this.rpc()).request('account/login/cancel', { loginId: this.loginId });
    this.loginId = undefined;
    this.login = undefined;
  }

  async logout(): Promise<void> {
    await this.cancelLogin();
    await (await this.rpc()).request('account/logout', {});
    this.error = undefined;
  }

  async catalog(): Promise<ModelChoice[]> {
    const rpc = await this.rpc();
    const models: ModelChoice[] = [];
    let cursor: string | undefined;
    do {
      const page = modelList.parse(
        await rpc.request('model/list', {
          limit: 100,
          ...(cursor !== undefined ? { cursor } : {}),
        }),
      );
      models.push(
        ...page.data.map((m) => ({
          id: m.model,
          label: m.model,
          isDefault: m.isDefault,
          efforts: m.supportedReasoningEfforts.map((e) => e.reasoningEffort),
        })),
      );
      cursor = page.nextCursor ?? undefined;
    } while (cursor !== undefined);
    return models;
  }

  async close(): Promise<void> {
    if (this.connection !== undefined) await (await this.connection).close();
  }
}

export function claudeAuth(action: 'status' | 'logout'): Promise<AccountState> {
  return new Promise((resolve, reject) => {
    execFile(
      'claude',
      ['auth', action, ...(action === 'status' ? ['--json'] : [])],
      { timeout: 15_000, maxBuffer: 64 * 1024 },
      (error, stdout) => {
        if (action === 'logout') {
          if (error !== null) reject(new Error('Claude 退出登录失败', { cause: error }));
          else resolve({ loggedIn: false });
          return;
        }
        // 未登录的 CLI 可以以非零状态退出，仍以结构化的 loggedIn 字段为准。
        try {
          const a = z
            .object({
              loggedIn: z.boolean(),
              email: z.string().nullish(),
              authMethod: z.string().nullish(),
            })
            .parse(JSON.parse(stdout) as unknown);
          resolve({
            loggedIn: a.loggedIn,
            label: [a.email, a.authMethod].filter(Boolean).join(' · '),
          });
        } catch (parseError) {
          reject(new Error('无法读取 Claude 登录状态', { cause: error ?? parseError }));
        }
      },
    );
  });
}
