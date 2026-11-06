import { ApiConnections, apiModels, API_EFFORTS } from './api-connection.ts';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import type {
  AccountState,
  ConnectionInput,
  Engine,
  EngineSettings,
  ModelChoice,
  ModelSelection,
} from '../../shared/model-settings.ts';
import type { ConversationKind } from '../../shared/records.ts';
import type { ConversationSpec, ModelAdapter } from './port.ts';
import { ClaudeAgentSdkModel } from './claude-agent-sdk.ts';
import { CodexAppServerModel } from './codex-app-server.ts';
import { CodexAccount, claudeAuth } from './accounts.ts';
import { CODEX_PROFILES, mergeProfiles } from './profiles.ts';

export const engineSchema = z.enum(['claude', 'codex']);
export const selectionSchema = z
  .object({
    model: z.string().trim().min(1).optional(),
    effort: z.string().trim().min(1).optional(),
  })
  .strict();
const stateSchema = z.object({
  apiSessions: z.record(z.string(), z.record(z.string(), selectionSchema)).default({}),
  apiDefaults: z.record(z.string(), selectionSchema).default({}),
  engine: engineSchema,
  sessions: z.record(
    z.string(),
    z.object({ claude: selectionSchema.optional(), codex: selectionSchema.optional() }),
  ),
});

/** 用户选择存配置文件；模型记录和续接仍由 Hub 写正本。 */
export class ModelSettings implements ModelAdapter {
  private state: z.infer<typeof stateSchema>;
  private readonly file: string;
  readonly connections: ApiConnections;
  private readonly loginAdapters: Record<Engine, ClaudeAgentSdkModel | CodexAppServerModel>;
  private readonly adapters: Record<Engine, ClaudeAgentSdkModel | CodexAppServerModel>;
  private readonly claude: ClaudeAgentSdkModel;
  private readonly codexAccount: CodexAccount;
  private readonly catalogs = new Map<Engine, { at: number; value: Promise<ModelChoice[]> }>();
  private readonly knownAccounts = new Map<Engine, string>();
  private readonly accountBusy = new Set<Engine>();
  private readonly revisions: Record<Engine, number> = { claude: 0, codex: 0 };

  constructor(private readonly root: string) {
    this.connections = new ApiConnections(root);
    this.file = join(root, 'model-settings.json');
    this.state = existsSync(this.file)
      ? stateSchema.parse(JSON.parse(readFileSync(this.file, 'utf8')) as unknown)
      : {
          engine: engineSchema.parse(process.env.STUDIUM_MODEL_ADAPTER ?? 'claude'),
          sessions: {},
          apiSessions: {},
          apiDefaults: {},
        };
    const raw = process.env.STUDIUM_PROFILES;
    const overrides: unknown = raw === undefined ? undefined : JSON.parse(raw);
    this.claude = new ClaudeAgentSdkModel({
      cwd: root,
      profiles: mergeProfiles(
        (process.env.STUDIUM_MODEL_ADAPTER ?? 'claude') === 'claude' ? overrides : undefined,
      ),
      ...(process.env.STUDIUM_CLAUDE_MODEL !== undefined
        ? { model: process.env.STUDIUM_CLAUDE_MODEL }
        : {}),
    });
    const binary = process.env.STUDIUM_CODEX_BIN ?? 'codex';
    this.adapters = {
      claude: this.claude,
      codex: new CodexAppServerModel({
        cwd: root,
        binary,
        profiles: mergeProfiles(
          process.env.STUDIUM_MODEL_ADAPTER === 'codex' ? overrides : undefined,
          CODEX_PROFILES,
        ),
        ...(process.env.STUDIUM_CODEX_MODEL !== undefined
          ? { model: process.env.STUDIUM_CODEX_MODEL }
          : {}),
      }),
    };
    this.loginAdapters = { ...this.adapters };
    this.updateAdapter('claude');
    this.updateAdapter('codex');
    this.codexAccount = new CodexAccount(root, binary, () => {
      this.revisions.codex++;
      this.catalogs.delete('codex');
      this.onChange?.();
    });
  }

  private updateAdapter(engine: Engine): void {
    const api = this.connections.api(engine);
    this.adapters[engine] =
      api === undefined
        ? this.loginAdapters[engine]
        : engine === 'claude'
          ? new ClaudeAgentSdkModel({ cwd: this.root, api })
          : new CodexAppServerModel({
              cwd: this.root,
              api,
              binary: process.env.STUDIUM_CODEX_BIN ?? 'codex',
            });
  }

  setConnection(engine: Engine, input: ConnectionInput): void {
    this.connections.save(engine, input);
    this.updateAdapter(engine);
    this.catalogs.delete(engine);
    this.revisions[engine]++;
    this.onChange?.();
  }

  onChange: (() => void) | undefined;

  get engine(): Engine {
    return this.state.engine;
  }
  get name(): string {
    return this.adapters[this.engine].name;
  }
  get disclosure() {
    return this.adapters[this.engine].disclosure;
  }
  engineOf(name: string): Engine {
    return name === 'codex-app-server' ? 'codex' : 'claude';
  }

  selection(sessionId: string, kind: ConversationKind) {
    const engine = this.engine;
    const adapter = this.adapters[engine];
    const connection = this.connections.scope(engine);
    const scope = `${engine}:${connection ?? 'login'}`;
    const profile =
      connection === undefined
        ? {
            ...adapter.disclosure.profiles[kind],
            ...this.state.sessions[sessionId]?.[engine],
          }
        : { ...this.state.apiDefaults[scope], ...this.state.apiSessions[scope]?.[sessionId] };
    if (profile.model === undefined && adapter.disclosure.defaultModel !== undefined)
      profile.model = adapter.disclosure.defaultModel;
    return {
      adapter,
      ...(connection !== undefined ? { connection } : {}),
      ...(profile.model !== undefined ? { model: profile.model } : {}),
      ...(profile.effort !== undefined ? { effort: profile.effort } : {}),
      key: JSON.stringify([
        engine,
        profile,
        this.revisions[engine],
        this.connections.view(engine).revision,
      ]),
    };
  }

  open(spec: ConversationSpec) {
    const selected = this.selection(
      spec.session?.id ?? '',
      spec.profile ?? spec.session?.kind ?? 'main',
    );
    return selected.adapter.open({
      ...spec,
      ...(selected.model !== undefined ? { model: selected.model } : {}),
      ...(selected.effort !== undefined ? { effort: selected.effort } : {}),
    });
  }
  quota() {
    if (this.connections.view(this.engine).mode === 'api') return Promise.resolve(undefined);
    return this.adapters[this.engine].quota();
  }

  private save(next: typeof this.state): void {
    const temp = `${this.file}.tmp`;
    writeFileSync(temp, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 });
    renameSync(temp, this.file);
    this.state = next;
  }
  setEngine(engine: Engine): void {
    this.save({ ...this.state, engine });
  }

  catalog(engine: Engine): Promise<ModelChoice[]> {
    const cached = this.catalogs.get(engine);
    if (cached !== undefined && Date.now() - cached.at < 60_000) return cached.value;
    const api = this.connections.api(engine);
    const value = (
      api !== undefined
        ? apiModels(engine, api)
        : engine === 'claude'
          ? this.claude.catalog()
          : this.codexAccount.catalog()
    ).catch((error: unknown) => {
      this.catalogs.delete(engine);
      throw error;
    });
    this.catalogs.set(engine, { at: Date.now(), value });
    return value;
  }

  async setSelection(
    sessionId: string,
    engine: Engine,
    selection: ModelSelection,
    revision?: string,
  ): Promise<void> {
    const initialRevision = this.connections.view(engine).revision;
    if (revision !== initialRevision) throw new Error('连接配置已改变，请刷新后重试');
    const connection = this.connections.scope(engine);
    if (engine !== this.engine) throw new Error('内核已改变，请刷新后重新选择模型');
    if (selection.model !== undefined && selection.effort === undefined)
      selection = { ...selection, effort: 'default' };
    if (selection.model !== undefined || selection.effort !== undefined) {
      const models =
        connection === undefined
          ? await this.catalog(engine)
          : selection.model !== undefined
            ? [
                {
                  id: selection.model,
                  resolvedModel: selection.model,
                  efforts: API_EFFORTS[engine],
                },
              ]
            : [];
      const model = models.find(
        (m) => m.id === selection.model || m.resolvedModel === selection.model,
      );
      if (model === undefined) throw new Error('请选择当前内核提供的模型');
      if (
        selection.effort !== undefined &&
        selection.effort !== 'default' &&
        !model.efforts.includes(selection.effort)
      )
        throw new Error('这个模型不支持所选思考强度');
    }
    if (engine !== this.engine) throw new Error('内核已改变，请刷新后重试');
    if (initialRevision !== this.connections.view(engine).revision)
      throw new Error('连接配置已改变，请刷新后重试');
    if (connection !== undefined) {
      const scope = `${engine}:${connection}`;
      this.save({
        ...this.state,
        apiSessions: {
          ...this.state.apiSessions,
          [scope]: { ...this.state.apiSessions[scope], [sessionId]: selection },
        },
        apiDefaults:
          this.state.apiDefaults[scope] === undefined && selection.model !== undefined
            ? { ...this.state.apiDefaults, [scope]: { model: selection.model, effort: 'default' } }
            : this.state.apiDefaults,
      });
      return;
    }
    this.save({
      ...this.state,
      sessions: {
        ...this.state.sessions,
        [sessionId]: { ...this.state.sessions[sessionId], [engine]: selection },
      },
    });
  }

  async settings(): Promise<EngineSettings> {
    const status = async (engine: Engine): Promise<AccountState> => {
      if (this.connections.view(engine).mode === 'api') return { loggedIn: false };
      try {
        const account = await (engine === 'claude'
          ? claudeAuth('status')
          : this.codexAccount.status());
        const fingerprint = JSON.stringify([account.loggedIn, account.label]);
        const before = this.knownAccounts.get(engine);
        this.knownAccounts.set(engine, fingerprint);
        if (before !== undefined && before !== fingerprint) {
          this.revisions[engine]++;
          this.catalogs.delete(engine);
          this.onChange?.();
        }
        return account;
      } catch (error) {
        return { loggedIn: false, error: error instanceof Error ? error.message : String(error) };
      }
    };
    const [claude, codex] = await Promise.all([status('claude'), status('codex')]);
    return {
      engine: this.engine,
      accounts: { claude, codex },
      connections: {
        claude: this.connections.view('claude'),
        codex: this.connections.view('codex'),
      },
    };
  }

  async accountAction(engine: Engine, action: 'login' | 'logout' | 'cancel'): Promise<void> {
    if (this.accountBusy.has(engine)) throw new Error('账号操作正在进行，请稍后重试');
    this.accountBusy.add(engine);
    try {
      if (engine === 'claude') {
        if (action !== 'logout')
          throw new Error('请在核心所在电脑执行 claude auth login，再刷新登录状态');
        await claudeAuth('logout');
      } else {
        if (action === 'login') await this.codexAccount.startLogin();
        else if (action === 'cancel') await this.codexAccount.cancelLogin();
        else await this.codexAccount.logout();
      }
      this.revisions[engine]++;
      this.catalogs.delete(engine);
    } finally {
      this.accountBusy.delete(engine);
    }
  }

  async close(): Promise<void> {
    await this.codexAccount.close();
  }
}
